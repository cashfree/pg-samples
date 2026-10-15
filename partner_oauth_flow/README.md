# Cashfree Partner OAuth Flow

A dependency-free Node.js sample for linking a merchant's Cashfree account through consent, creating a sandbox payment order on their behalf, opening hosted checkout, checking payments, refreshing tokens, and revoking access.

This is a **single-operator sandbox demo**, not a production deployment or a compliance certification. It uses fixed sandbox endpoints and rejects `CASHFREE_ENV=production`. Use only test accounts and synthetic customer information.

## Prerequisites

- Node.js 22 or newer. There are no npm packages to install.
- An Embedded Partner account enabled by Cashfree, with access to the Partner Dashboard's test environment and an OAuth application.
- Your sandbox Partner API Key, OAuth Client ID, and OAuth Client Secret. Merchant PG App ID/Secret Key credentials are a different authentication method.
- A browser with cookies enabled. Use the same browser and origin throughout consent and callback.

## Local setup

```sh
cd partner_oauth_flow
cp .env.example .env
chmod 600 .env
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Copy the generated random password into `APP_PASSWORD` in your local `.env`. Fill the three blank `CASHFREE_*` credential fields with your own sandbox values. Never commit or share this file. Environment variables supplied by the process take precedence over `.env`.

| Variable | Purpose |
| --- | --- |
| `CASHFREE_ENV` | Must be `sandbox`. |
| `CASHFREE_PARTNER_API_KEY` | Private partner credential, sent only by the backend. |
| `CASHFREE_OAUTH_CLIENT_ID` | OAuth application identifier. |
| `CASHFREE_OAUTH_CLIENT_SECRET` | Private OAuth application credential, sent only on backend OAuth calls. |
| `APP_PASSWORD` | Random operator password, at least 24 characters, without colons. |
| `PORT` | Local listening port; defaults to `3000`. |
| `APP_BASE_URL` | Browser-facing origin, such as `http://localhost:3000`; no path or credentials. |

In **Partner Dashboard → Developers → OAuth App**, register the exact redirect URL:

```text
http://localhost:3000/oauth/callback
```

Then run:

```sh
npm start
```

Open `http://localhost:3000`. Sign in at the browser's HTTP authentication prompt with username **`operator`** and the `APP_PASSWORD` you generated. Opening the home page creates an HttpOnly, SameSite=Lax browser session; it lasts eight hours. All browser API requests require this session and operator authentication.

### Testing through an HTTPS tunnel

If Cashfree requires a public callback or you want to receive webhooks, forward an HTTPS tunnel to `127.0.0.1:3000`. Set `APP_BASE_URL=https://your-tunnel.example`, register `https://your-tunnel.example/oauth/callback`, restart the app, and open the **HTTPS tunnel URL** in your browser before linking. The origin must stay the same throughout the flow; do not switch between localhost and the tunnel.

The server always binds to loopback. Configure the tunnel to preserve the public `Host` header. A proxy that rewrites Host to localhost will receive `403 Unexpected request host`. Disable tunnel/proxy request recording and redact callback query strings and Authorization headers from access logs. The app does not trust forwarded headers. Public origins must use HTTPS; only local `http://localhost:PORT` is allowed over HTTP. HTTPS sessions also receive the Secure cookie flag.

## End-to-end flow

```mermaid
sequenceDiagram
    actor Operator
    participant Browser
    participant App as Node backend
    participant Cashfree
    Operator->>Browser: Open app and authenticate
    Browser->>App: Generate link with merchant reference
    App->>App: Generate random state
    App->>Cashfree: POST /partners/oauth/auth_link
    Cashfree-->>Browser: Consent URL via backend
    Browser->>Cashfree: Merchant login and consent
    Cashfree-->>App: Callback with code, state and merchant reference
    App->>App: Validate session, state, expiry and merchant
    App->>Cashfree: Exchange code for tokens
    App->>App: Keep tokens in server memory
    Browser->>App: Create sandbox order
    App->>Cashfree: Create order with merchant bearer token
    App-->>Browser: payment_session_id
    Browser->>Cashfree: Hosted sandbox checkout
    Browser->>App: Check payment status
    App->>Cashfree: Fetch payments for order
    App-->>Browser: Payment status fields
```

1. **Link Merchant:** enter a unique internal reference of 1–40 letters, digits, underscores or hyphens, or click **Generate ID**. The backend generates a 32-byte random state; client-supplied state is ignored. It requests the `code` response type and `read_write` scope. Only an HTTPS consent link on `auth.cashfree.com` is accepted.
2. **Consent:** open the returned link and complete the merchant's Cashfree login and consent. The browser returns to `/oauth/callback`. The backend checks that state belongs to this browser, has not expired, and has not been used. This demo expires pending state after **10 minutes**. Callback and token merchant references must match the original reference.
3. **Token exchange:** the backend exchanges the code immediately and redirects to the app without displaying the code or tokens. Access and refresh tokens remain in process memory. Restarting loses all local links and pending consent requests, but **does not revoke Cashfree's grant**. Revoke through Cashfree's dashboard if the app has already been stopped.
4. **Create Test Order:** enter the linked reference and an amount between 1 and 10,000 INR. Use a synthetic sandbox customer phone. The server creates the order with the linked merchant's bearer token. Only order ID/status and the short-lived `payment_session_id` are returned to the browser. Do not share the session ID or response panel.
5. **Open Checkout:** the Cashfree JS SDK opens sandbox hosted checkout. Allowlist your test domain in Cashfree's payment configuration if required. A redirect to the return URL is **not proof of payment**.
6. **Check Payment Status:** enter the same merchant reference and order ID to fetch payment outcomes from Cashfree. Use the returned payment status to inspect the result. This demo does not fulfil orders.
7. **Refresh token:** click **Refresh token** on a merchant. The new refresh token replaces the old one when returned. The server also refreshes automatically before an order/payment request when the access token has less than five minutes remaining. Concurrent refreshes for one merchant share a single provider request.
8. **Status/Revoke:** **Status** requests linking status; **Revoke** revokes the provider grant and deletes local tokens after a successful response. Relink through consent to use the merchant again.

Cashfree's [OAuth integration guide](https://www.cashfree.com/docs/partners/embedded/oauth-flow) describes provider-side consent/code/token lifetimes and refresh rotation. This sample uses `expires_in` from the token response, falling back to 24 hours, and imposes its own shorter state lifetime.

## Routes and upstream APIs

All operator routes require HTTP Basic authentication. `/api/*` and `/oauth/callback` also require the browser session. POST API requests must have the exact `APP_BASE_URL` Origin and `Content-Type: application/json`; an empty POST can send `{}`. There is no public manual code-exchange endpoint.

| App route | Behavior / Cashfree request |
| --- | --- |
| `GET /api/config` | Non-secret configuration and credential-presence flags. |
| `POST /api/oauth/auth-link` | Body: `{"merchant_id":"demo_business"}`. Calls `POST https://api-sandbox.cashfree.com/partners/oauth/auth_link`. |
| `GET /oauth/callback` | Validates callback, calls `POST /partners/oauth/token` with `grant_type=authorization_code`. |
| `GET /api/merchants` | Lists local link metadata, without tokens. |
| `GET /api/merchants/:id/status` | Calls `GET /partners/merchants/:id`, API version `2023-01-01`. |
| `POST /api/merchants/:id/refresh` | Calls `POST /partners/oauth/token` with `grant_type=refresh_token`. |
| `POST /api/merchants/:id/revoke` | Calls `POST /partners/oauth/:id/revoke`. |
| `POST /api/orders` | Body: `{"merchant_id":"demo_business","order_amount":10}`. Calls `POST https://sandbox.cashfree.com/pg/orders`. |
| `GET /api/orders/:orderId/payments?merchant_id=:id` | Calls `GET /pg/orders/:orderId/payments`. |
| `POST /webhooks/cashfree` | Signature-authenticated acknowledgement; does not require operator login. |

Partner calls use `x-partner-apikey` and `oauth-client-id`; OAuth calls also send `oauth-client-secret`. Payment calls use `Authorization: Bearer <merchant access token>` and API version `2023-08-01`. Credentials are never included in frontend code or request URLs. Confirm enabled OAuth capabilities and supported API versions with Cashfree for your partner account.

## Optional webhooks

In the sandbox Partner Dashboard's webhook settings, register:

```text
https://your-tunnel.example/webhooks/cashfree
```

The receiver checks `x-webhook-timestamp` (Unix milliseconds, within five minutes) and `x-webhook-signature` using Base64 HMAC-SHA256 of `timestamp + raw request body`, with the Partner API Key. Comparison is constant-time. The body is capped at 16 KiB. Valid JSON events receive `200 {"ok":true}`; the app never logs payloads or changes business state from them. Duplicate deliveries therefore have no side effects. Older retry deliveries outside the five-minute window are rejected; inspect payment status through the API in this demo.

For a production receiver, persist verified events, deduplicate event IDs, handle unlink events, and process fulfilment asynchronously. See Cashfree's [partner webhook signature guidance](https://www.cashfree.com/docs/partners/embedded/integration/gateway-integration#webhook-signature).

## Security and publication

- `.env`, saved tokens, merchant records, OAuth state files, local tunnel addresses, generated guides/screenshots and private key files from the original local sample are not included.
- `.gitignore` excludes local environment files, runtime data, private key files, logs and installed dependencies. Only `.env.example`, with blank credential/password fields, is intended for version control.
- Tokens are kept only in backend memory. Token responses are reduced to non-secret metadata. Upstream error bodies and customer details are not forwarded to the UI; no credential previews are exposed.
- Static serving allows only the three known public assets. Runtime files and source code cannot be downloaded through the app.
- Browser responses disable caching, disallow framing, prevent MIME sniffing, suppress referrers, and set a Content Security Policy. Upstream requests have a 15-second timeout and reject redirects to avoid forwarding credentials elsewhere.
- Treat the browser response panel, callback query strings, payment sessions and the machine's memory as sensitive. Stop the tunnel and server after testing, revoke sandbox grants, and rotate any credentials that were previously exposed. HTTP Basic credentials can remain cached until the browser session is closed.

Before production use, replace the shared operator login with your identity system, tenant-level authorization, rate limiting and audit controls; use a managed secret store and encrypted persistent token storage; implement durable webhook deduplication and fulfilment; and obtain a security review against your actual deployment and regulatory requirements. Sandbox hardening alone does not establish PCI DSS or other regulatory compliance.

## Validation

```sh
npm test
node --check server.js
node --check public/app.js
```

Tests use generated fake credentials and mock all Cashfree requests. They cover authentication, host/origin checks, static-file restrictions, session-bound/single-use/expired state, merchant mismatch, token redaction, refresh rotation, orders, status checks, webhook signatures and revocation. They do not contact Cashfree or prove live account compatibility. Complete consent, checkout, payment verification, refresh, webhook and revocation checks manually with your own sandbox account before adopting the sample.

## Troubleshooting

| Symptom | Action |
| --- | --- |
| Startup rejects password or environment | Generate a random `APP_PASSWORD` of at least 24 characters; use sandbox only. |
| Unexpected request host / same-origin error | Open the exact `APP_BASE_URL`; preserve its Host through the proxy. |
| Open the app in this browser first | Load `/` to establish the session; allow cookies and keep the same origin/browser. |
| Missing/expired state or merchant mismatch | Start a new consent request; do not reuse callbacks or change the reference. |
| Generic upstream request failure | Check sandbox credentials, partner OAuth enablement, redirect URL and network access. Error bodies are intentionally not displayed. |
| No local merchants after restart | Tokens are memory-only; reauthorize or revoke the old grant via the dashboard. |
| Checkout does not open | Create a new order and check domain allowlisting, SDK loading and browser console policy errors. |
| Webhook rejected | Check sandbox partner key, untouched raw body, timestamp format and local clock accuracy. |
