# Cashfree Subscription Sample (Node.js + Express)

A sample web application demonstrating how to integrate Cashfree's Subscription APIs using Node.js (Express) and HTML/JavaScript. Users choose between plans (Daily, Monthly, Yearly) and start a subscription checkout with the Cashfree JS SDK.

## 🚀 Features

- Dynamic plan selection: Basic, Standard, Premium
- First charge scheduled at T+3 at 10:00 AM UTC (3:30 PM IST)
- Uses Cashfree's `2025-01-01` Subscriptions API version
- Displays curl command for debugging
- Frontend built with HTML/CSS + vanilla JavaScript

## 📦 Plan Configuration

| Plan Name | Plan ID               | Frequency | Payment modes      | Notes |
|-----------|-----------------------|-----------|--------------------|-------|
| Basic     | Basic_Day_Plan        | Daily     | UPI, card, eNACH   | ₹100 is under the ₹15k limit, so no AFA is needed |
| Standard  | Standard_Monthly_Plan | Monthly   | UPI, card, eNACH   | ₹2,500 is under the ₹15k limit, so no AFA is needed |
| Premium   | Premium_Yearly_Plan   | Yearly    | UPI, card, eNACH   | UPI now supports yearly. ₹25,000 is over ₹15k, so UPI/card debits need AFA; eNACH (up to ₹1 Cr) doesn't |

Rules for all plans:

- **Frequencies:** all payment methods support Day, Week, Month, Year and ad-hoc, per [Cashfree payment modes](https://www.cashfree.com/docs/payments/subscription/payment-modes).

- **Per-debit limits:** UPI and card allow ₹15,000 per debit without AFA. UPI allows up to ₹1 lakh with AFA, which Cashfree must enable. eNACH allows up to ₹1 crore.
- **Authorization:** eNACH authorization is always ₹0, and activation takes 24–48 hours.
- **First charge date:** for UPI and Indian cards, the earliest is T+1, or T+2 if the subscription is created after 9:00 PM. It can be at most 14 days ahead.
- **Pre-debit notice:** sent at least 24 hours before each debit. After that, the amount is locked.
- **Changing the amount:** create a new plan, then call `POST /subscriptions/{id}/manage` with `CHANGE_PLAN`. The new amount can't exceed the original `plan_max_amount`.

## 🛠️ Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/cashfree/pg-samples.git
cd pg-samples/sub-sample/node/express
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Copy `.env.example` to `.env` and add your Cashfree test credentials:

```bash
cp .env.example .env
```

### 4. Start the server

```bash
npm start
```

Then, open your browser and navigate to: [http://localhost:4000](http://localhost:4000)

## 📁 Project Structure

```
.
├── server.js                    # Express backend (subscription creation + /return handling)
├── return-server.js             # Return-only listener exposed through the HTTPS tunnel
├── production-test-product.js   # ₹1 one-cycle production test product
├── return_url.js                # Standalone return URL example with signature verification
├── public/
│   ├── index.html               # Frontend interface
│   └── main.js                  # Plan selection and Cashfree SDK checkout
├── test/
│   └── return.test.js           # HTTP integration tests (mocked Cashfree responses)
├── .env.example                 # Environment variable template
├── package.json
└── README.md
```

## 🔐 API Integration Info

* **Base URL**: `https://sandbox.cashfree.com/pg/subscriptions`
* **API Version**: `2025-01-01`
* **Auth**: Uses `x-client-id` and `x-client-secret` in headers
* **SDK**: Cashfree JS SDK (`cashfree.subscriptionsCheckout()`)

## 🧾 Sample curl (generated in response)

```bash
curl --request POST \
  --url https://sandbox.cashfree.com/pg/subscriptions \
  --header 'Content-Type: application/json' \
  --header 'x-api-version: 2025-01-01' \
  --header 'x-client-id: <APP_ID>' \
  --header 'x-client-secret: <CLIENT_SECRET>' \
  --data '<payload>'
```

## 📬 Support

For Cashfree API support, contact: [care@cashfree.com](mailto:care@cashfree.com)

## Local return URL

Run `npm start` and open http://localhost:4000. The return endpoint at
http://localhost:4000/return accepts both browser GET requests and Cashfree form
POSTs. Subscription creation adds the subscription ID to the return URL as a
fallback. On return, the server fetches the subscription status from Cashfree
rather than trusting the redirect payload. Opening `/return` without an ID shows
a readiness message.

The server loads credentials from `.env`. Set `PORT` and `APP_BASE_URL` there to
change the port or the browser-facing base URL (default: http://localhost:4000).
Localhost returns work when checkout runs in a browser on this machine.

Run `npm test` for local HTTP integration tests using mocked Cashfree responses;
these tests do not create sandbox subscriptions or authorizations.

The return page displays every received POST body field and URL query parameter,
including unknown fields and repeated values, even when the subscription lookup
fails. Values are escaped for safe display. POSTs are also saved locally as described below.

## HTTPS return URL for production testing

Start the app with `npm start`. In separate terminals, run:

```bash
npm run start:returns
npm run tunnel
```

ngrok prints an HTTPS address. Set `APP_BASE_URL` in `.env` to that address
(without `/return`) and restart both Node servers. Create a new subscription so
its return URL uses the new address; existing subscriptions keep their original
return URL. Only `/return` on the return listener is exposed through the tunnel.
Keep both the return listener and ngrok running during checkout.

To switch both the API and SDK to production, configure `.env` locally:

```env
CASHFREE_ENV=production
CASHFREE_APP_ID=<live app ID>
CASHFREE_SECRET=<live secret>
APP_BASE_URL=https://<your-ngrok-address>
```

Restart both Node servers. The existing plan IDs must also exist in your live
Cashfree account. Production checkout uses real money; this demo currently sets
a ₹1 authorization and schedules recurring charges for the selected plan.

Every parsed return POST is appended before status verification to
`logs/return-events.jsonl` (gitignored), including the receipt time, content type,
query parameters, all parsed body fields and the raw UTF-8 body. The log remains
available after a restart. Read it locally with:

```bash
tail -f logs/return-events.jsonl
```

ngrok's local inspector at http://127.0.0.1:4040 also shows tunnel requests and
responses. The return URL is a browser checkout redirect; it does not replace
Cashfree webhooks for subsequent subscription events. The tunnel URL must stay
available during the test; use a stable hosted HTTPS endpoint for ongoing use.

## Production one-cycle test product

Production mode displays an additional **Production One Cycle Test** card and
accepts `plan: "production_test"`. The product uses inline plan details, so no
pre-existing production plan is needed. It sets ₹1 authorization (not automatically
refunded), ₹1 recurring amount, ₹1 maximum amount, and `plan_max_cycles: 1`.
The first charge is requested 24 hours after creation (tomorrow at the same IST
time) and expiry is 48 hours after creation. Dates are recalculated on every
creation and shown in IST on the card. Total configured payments: ₹2.

Cashfree may reject the requested short schedule for the chosen payment method;
the UI displays the API error message and does not automatically extend dates.
The product is rejected by the server in sandbox mode. Clicking its button creates a live subscription; authorizing it in checkout
enables the scheduled debit.
