# Subscription_Seamless_Demo_app

A responsive merchant reference app for **Cashfree seamless subscriptions**. Node.js backend, plain JavaScript frontend, no frontend build step. Designed to run locally and be published as a GitHub source repository later.

## Run locally

Requires Node.js 22 or newer.

```sh
npm ci
cp .env.example .env
npm start
```

Open **http://localhost:3000**. The default **offline demo** makes no Cashfree requests and needs no credentials. Pick an on-demand product, create the subscription, approve the demo mandate, schedule a charge and simulate success/failure.

For actual Cashfree testing, open **Configuration**, choose **Cashfree API → Sandbox**, and provide your own App ID and Secret. Alternatively configure `.env`:

```dotenv
APP_MODE=cashfree
CASHFREE_ENV=sandbox
CASHFREE_API_VERSION=2025-01-01
CASHFREE_SANDBOX_CLIENT_ID=your_app_id
CASHFREE_SANDBOX_CLIENT_SECRET=your_secret
PUBLIC_BASE_URL=https://your-public-node-server.example
MERCHANT_PASSWORD=choose_a_unique_password_at_least_12_characters
```

Restart after changing `.env`. [config.js](config.js) centralises API origins, environment, credentials, version, app mode, public origin and port. The API version defaults to `2025-01-01`; you can change it for your account, including testing `2026-01-01`. Credentials entered through the UI are held on the server for that session, never in localStorage or frontend source. Use `.env` for reliable callbacks across restarts. Environment and App ID partition subscription records; switching environments does not reuse a sandbox session in production.

## What is included

- Three example subscription products, each supporting monthly **PERIODIC** and usage-based **ON_DEMAND** plans.
- Editable customer, amount, mandate maximum, authorisation amount and authorisation refund preference.
- **UPI:** QR image handling (base64 images display directly; plain or base64 mandate text is rendered locally), mobile-only Intent app selection, and subscription UPI Collect on desktop, Android and iOS. Collect requires a UPI ID. In sandbox, QR and Collect redirect directly to the subscription-specific Cashfree simulator URL returned by Create AUTH (including links under `upiIntentData`), where you choose the authorisation outcome. This uses GET navigation even when the response includes `method: post` and app-link payloads. The generic `/pgbillpayuiapi/simulator` endpoint is not a navigable subscription simulator. When no subscription-specific link is available, the UI offers the pending AUTH simulation controls instead. Production QR displays the returned QR image instead. In production, the request is sent directly to the linked PSP app for the customer to approve.
- **eNACH:** netbanking, debit-card and Aadhaar authorisation. Select a bank from the Cashfree directory; its Bank ID fills automatically, while you enter the branch IFSC manually. Bank IDs are never inferred from IFSC prefixes (some banks use sponsor-bank IFSCs). Bank/NPCI pages collect banking credentials and Aadhaar verification; this app does not collect Aadhaar numbers.
- **Card SI:** seamless card mandate authorisation. Account enablement is required. For seamless subscriptions, Cashfree currently does not ask merchants for PCI DSS certification; card tokenisation is handled at Cashfree’s end.
- Both **frontend form POST** and **direct redirect** authorisation responses, including legacy JSON-bearing cURL. cURL is parsed as data, never executed. Contact **care@cashfree.com** to request Cashfree's direct eNACH redirect URL feature flag.
- POST/GET return handling, server-side status fetching, signed webhooks, status polling and refresh after mobile app resume.
- Manual charge scheduling for ACTIVE on-demand mandates. Periodic collections are managed by Cashfree. An offline-only periodic cycle control illustrates those charges in demo mode.
- Sandbox success/failure simulation for pending AUTH and CHARGE payments with `entity: "SUBS_PAYMENTS"` and the merchant `payment_id`. Production simulation and offline-only endpoints are blocked server-side.
- Service access guarded by an ACTIVE mandate and a server-verified successful **CHARGE**. AUTH success alone never unlocks a product.
- Redacted in-memory API inspector with Cashfree request IDs.
- Desktop and mobile layouts, keyboard-accessible forms and dialogs, native WebView integration hooks.

## eNACH bank directory

The bank selector uses the checked-in directory in `lib/enach-banks.json`, sourced from [Cashfree's eNACH bank table](https://www.cashfree.com/docs/payments/subscription/payment-modes#bank-account-e-mandate). It contains 1,403 bank names and Bank IDs from the published table. Choose your bank from the dropdown and enter your branch IFSC. The form never auto-fills an example IFSC from the reference table. Account holder, account number, account type and auth mode remain customer inputs.

The server resolves `account_bank_code` from the selected Bank ID. This supports banks whose ID does not match their IFSC prefix and prevents overriding the ID through the read-only field. Directory inclusion does not guarantee that every authorisation mode is enabled for a bank. Refresh the snapshot when the official list changes:

```sh
node scripts/update-enach-banks.js
```

Restart the server after refreshing the directory.

## Cashfree sandbox walkthrough

1. Enable seamless/S2S subscriptions on your merchant account; confirm payment instrument eligibility. For seamless subscriptions, Cashfree currently does not ask merchants for PCI DSS certification; card tokenisation is handled at Cashfree’s end.
2. Configure sandbox credentials and a public HTTPS `PUBLIC_BASE_URL`. Restart after changing the public origin. New subscriptions use the updated return URL; existing ones retain their original return URL.
3. Select **On-demand** and create a subscription. The app stores its `subscription_session_id` on the backend for authorisation.
4. Choose UPI, eNACH or Card SI. Complete authorisation on the Cashfree sandbox/bank page, or open the subscription details and use **Success** / **Fail** on the PENDING AUTH row to simulate it through the sandbox API. The app accepts the return POST and re-fetches authoritative status. eNACH can remain `BANK_APPROVAL_PENDING` until approved by the bank.
5. Once `ACTIVE`, schedule a charge within the mandate maximum. The default is two days ahead. Cashfree validates instrument-specific notice periods; only the date portion is considered by its charge API. No local cron job is needed: Cashfree schedules the charge.
6. In the payment row choose **Success** or **Fail**. This sends `POST /pg/simulate` using `SUBS_PAYMENTS`. Simulation buttons are enabled only for PENDING payments; all other statuses are disabled. The server also fetches the latest Cashfree status before simulation, rejecting stale or non-PENDING payments. The simulation response confirms acceptance; payment status can update asynchronously. Refresh to verify it.
7. Open the service after a CHARGE succeeds. The fulfilment endpoint is an integration reference: replace its response with your product's entitlement/usage logic.

The attached PDF was used as reference material for the create → authorise → ACTIVE → charge → simulate sequence. Its embedded credentials, customer data and old dates are not bundled or reused.

## Return URL and webhook setup

The server generates a unique URL for each subscription:

```text
https://your-node-server.example/return/cashfree?state=<random-state-token>
```

Cashfree may POST URL-encoded fields such as `cf_subscriptionId`, `cf_status` and `cf_checkoutStatus`, or return with a GET. The app correlates the return with the stored state token, checks the supplied subscription ID when present, fetches the subscription and payments from Cashfree, and returns the browser with HTTP 303. It **does not trust return fields or signatures as proof of payment**. Production returns may omit status fields. If verification fails, the UI reports the error and keeps stored state; use Refresh after restoring the connection.

Configure these endpoints in the corresponding Cashfree Dashboards:

```text
https://your-node-server.example/webhooks/cashfree/sandbox
https://your-node-server.example/webhooks/cashfree/production
```

Enable relevant subscription auth, status and payment events. The handler verifies HMAC-SHA256 over `x-webhook-timestamp + rawBody` using the environment's secret, rejects stale timestamps beyond five minutes, and re-fetches subscription/payments. Repeated deliveries reconcile current API state instead of applying event order. Persistent `.env` credentials let webhooks continue after browser/server restart. Session-entered keys cannot be recovered after restart.

## Mobile and WebView

Use HTTPS and an actual Android/iOS device for external app testing. Intent is available only on mobile. The frontend uses Cashfree's returned per-platform UPI app links and dispatches them through one of:

```js
window.SubscriptionWebView.openUpiIntent(url); // Optional Android host bridge
window.webkit.messageHandlers.upiIntent.postMessage({ url }); // Optional iOS bridge
window.location.assign(url); // Browser or native URL-interception fallback
```

**A webpage alone cannot enable UPI Intent inside an arbitrary WebView.** The host must intercept approved UPI schemes, launch the external app and support resuming the merchant page. See [docs/WEBVIEW.md](docs/WEBVIEW.md) for host examples and fallback behaviour. QR remains available on desktop.

## API and source map

| File | Purpose |
| --- | --- |
| `config.js`, `.env.example` | Server configuration and placeholder credentials |
| `server.js` | Static frontend, merchant API, Cashfree client, callbacks and webhooks |
| `lib/payments.js` | Authorisation response normalisation, validation, redaction and signature checks |
| `lib/store.js` | Serialised, atomic JSON persistence in ignored `data/` |
| `public/` | HTML, responsive CSS and frontend JavaScript |
| `test/` | Unit, HTTP integration and mocked Cashfree contract tests |
| `e2e/` | Desktop/mobile browser tests |

| Merchant endpoint | Behaviour |
| --- | --- |
| `GET/POST /api/config` | Read safe config / change session settings |
| `POST /api/subscriptions` | Create a subscription with inline plan details |
| `GET /api/subscriptions` | List this merchant environment's local subscriptions |
| `POST /api/subscriptions/:id/authorize` | Create seamless AUTH; return normalised browser action |
| `POST /api/subscriptions/:id/refresh` | Fetch subscription and payments from Cashfree |
| `POST /api/subscriptions/:id/charge` | Schedule on-demand CHARGE after ACTIVE check |
| `POST /api/subscriptions/:id/simulate` | Sandbox-only payment simulation |
| `POST /api/subscriptions/:id/consume` | Reference service access check |
| `GET /api/traces` | Redacted session API history |

The merchant UI sends `x-demo-client: subscription-lab` for mutations; the server also checks Origin. Request bodies are limited to 128 KiB. Bank return routes and signed webhook routes have separate validation and don't require merchant cookies.

## Validation

```sh
npm run check
npm test
npm run test:browser
```

Browser tests use installed Google Chrome on macOS. On Linux, first run `npx playwright install --with-deps chromium`. Tests cover the on-demand lifecycle, access gating, periodic manual-charge rejection, unsafe destinations, legacy eNACH POST, redirects, raw-body webhook signatures, return POSTs, mobile Intent restrictions, environment separation and outbound Cashfree contracts. The repository-level subscription workflow runs these checks and desktop/mobile browser tests.

## Hosting and extension

Host the **Node server** on a Node-compatible service with HTTPS and persistent storage. GitHub can host the source; **GitHub Pages alone cannot run this backend**. Bind `HOST=0.0.0.0` on a hosting platform and set `PORT`, `PUBLIC_BASE_URL` and `MERCHANT_PASSWORD`. Configure server-side Cashfree secrets through the host's secret manager. No hosting or GitHub publication is performed by this project setup.

This is a single-process merchant reference, not a multi-tenant billing service. `data/` contains customer and subscription records with restrictive file permissions and is ignored by Git. The local JSON store and in-memory sessions suit a demo; use authenticated merchant accounts, a database, durable idempotency/operation records, managed secrets and explicit per-cycle entitlements before building a production service. The sample service endpoint checks for any successful charge; replace it with your actual billing-period or usage-credit rules. Timed-out provider writes are not automatically retried: fetch status before retrying to avoid duplicate actions.

API logs redact request credentials, customer/card/account data, authorisation payloads and payment URL paths. Card number/CVV and bank authorisation payloads are not written to the JSON store. The server never serves `.env`, runtime records or source config files.

## References

- [Create Subscription](https://www.cashfree.com/docs/api-reference/payments/latest/subscription/create-subscription)
- [Raise a Charge or Create an Auth](https://www.cashfree.com/docs/api-reference/payments/latest/subscription/raise-a-charge-or-create-an-auth)
- [Simulate Payment](https://www.cashfree.com/docs/api-reference/payments/latest/simulation/simulate-payment)
- [Return payload after authorisation](https://www.cashfree.com/docs/api-reference/payments/latest/subscription/redirection-payload-after-authorization)
- [Cashfree seamless subscription playground and account enablement](https://www.cashfree.com/devstudio/preview/subs/seamless)

## Publication and access controls

This source ships with no configured credentials, password, customer records or live tunnel address. App IDs and secrets are fully redacted from API inspector cURL output; non-JSON upstream bodies and non-allowlisted response headers are omitted. Public views omit subscription session tokens, and persisted subscription details omit card/bank instruments.

For public access, use an HTTPS `PUBLIC_BASE_URL`, a unique `MERCHANT_PASSWORD` of at least 12 characters and a private persistent data volume. Startup rejects public deployments without these settings. Login attempts are bounded per network peer, successful login rotates the session cookie, and inactive session credentials expire. The configured origin is checked to mitigate DNS rebinding. Outbound API requests do not follow redirects with credentials. Do not host this single-merchant sample as an unrestricted multi-merchant service or enter production keys into a shared public demo.

Review [the subscription security guide](../SECURITY.md) before deployment. These checks are implementation safeguards, not a regulatory/security compliance certification.
