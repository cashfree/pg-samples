# Cashfree PG Java SDK Demo

This is a merchant walkthrough app for testing Cashfree Payment Gateway integration with:

- Cashfree Java Backend SDK: `com.cashfree.pg.java:cashfree_pg`
- Cashfree JS checkout on the frontend
- Return URL flow with backend status polling
- Transaction detail fetch using `PGOrderFetchPayments`

The browser never receives the Cashfree client secret. The frontend only receives the `payment_session_id` returned by the backend after order creation.

## Prerequisites

- Java 17 or later
- Gradle installed
- Cashfree sandbox or production credentials
- A reachable `app.base-url` for return URL testing

For local testing, `http://localhost:8080` is enough. For hosted or production testing, use an HTTPS public URL.

## Configure The App

All merchant-controlled values are in:

```text
config/cashfree-demo.properties
```

Update this file before running the app:

```properties
server.port=8080
app.base-url=http://localhost:8080

cashfree.environment=SANDBOX
cashfree.client-id=your_cashfree_client_id
cashfree.client-secret=your_cashfree_client_secret
cashfree.sdk-version=5.0.1
cashfree.sdk-type=Java Backend SDK
```

Important:

- `cashfree.client-id` and `cashfree.client-secret` must match the selected environment.
- `app.base-url` is used to build the Cashfree `return_url`.
- `cashfree.sdk-version` controls the backend SDK dependency version. Rebuild after changing it.
- Do not commit real credentials. `config/cashfree-demo.properties` is ignored by git.

## Run In Sandbox

Use sandbox credentials:

```properties
cashfree.environment=SANDBOX
cashfree.client-id=your_sandbox_client_id
cashfree.client-secret=your_sandbox_client_secret
app.base-url=http://localhost:8080
```

Start the app:

```bash
gradle bootRun
```

Open:

```text
http://localhost:8080
```

If port `8080` is already in use, change:

```properties
server.port=8081
app.base-url=http://localhost:8081
```

Then restart the app.

## Merchant Test Flow

1. Open the demo app.
2. Enter a custom order ID or click **Generate**.
3. Enter the amount.
4. Click **Create Order and Pay**.
5. Backend creates an order using `PGCreateOrder`.
6. Frontend opens Cashfree JS checkout using `payment_session_id`.
7. Cashfree redirects the customer to:

```text
{app.base-url}/return.html?order_id={order_id}
```

8. Return page polls:

```text
GET /api/orders/{orderId}/status
```

9. Backend calls:

```text
PGFetchOrder
PGOrderFetchPayments
```

10. Return page displays order status and transaction details.

## Return Page Fields

The return URL page shows:

- Order ID
- Current status
- Cashfree Transaction ID from `cf_payment_id`
- Bank UTR from `bank_reference`
- Payment Mode from `payment_group`
- Payment Time from `payment_time`
- Failed Reason from `payment_message`, only when `payment_status` is `FAILED`

Payment outcome logic follows the Cashfree payments response:

```javascript
if (payments.some(transaction => transaction.payment_status === "SUCCESS")) {
  orderStatus = "Success";
} else if (payments.some(transaction => transaction.payment_status === "PENDING")) {
  orderStatus = "Pending";
} else {
  orderStatus = "Failure";
}
```

## Switch To Production

When moving from sandbox to production, update `config/cashfree-demo.properties`:

```properties
cashfree.environment=PRODUCTION
cashfree.client-id=your_production_client_id
cashfree.client-secret=your_production_client_secret
app.base-url=https://your-production-domain.example
```

Production checklist:

- Use production Cashfree credentials, not sandbox credentials.
- Use `cashfree.environment=PRODUCTION`.
- Use an HTTPS `app.base-url`.
- Make sure the production domain can serve `/return.html`.
- Make sure the server can reach `https://api.cashfree.com`.
- Restart the app after changing config.
- Test with a small amount first.

Environment mapping:

| Config value | Cashfree API host |
| --- | --- |
| `SANDBOX` | `https://sandbox.cashfree.com/pg` |
| `PRODUCTION` | `https://api.cashfree.com/pg` |

## Change SDK Version

The backend SDK version is controlled by:

```properties
cashfree.sdk-version=5.0.1
```

Use only a version published to Maven Central. After changing it, rebuild:

```bash
gradle clean bootJar
```

Then run:

```bash
java -jar build/libs/cashfree-pg-java-demo-0.0.1-SNAPSHOT.jar
```

## Deployment Overrides

For deployed environments, you can also override configuration with environment variables:

```bash
export CASHFREE_CLIENT_ID="your_client_id"
export CASHFREE_CLIENT_SECRET="your_client_secret"
export CASHFREE_ENVIRONMENT="SANDBOX"
export APP_BASE_URL="https://your-demo-domain.example"
export PORT="8080"
```

Then run:

```bash
gradle bootRun
```

or:

```bash
gradle clean bootJar
java -jar build/libs/cashfree-pg-java-demo-0.0.1-SNAPSHOT.jar
```

## Useful Endpoints

```text
GET  /api/config
GET  /api/orders/generate-id
POST /api/orders
GET  /api/orders/{orderId}/status
```

`/api/config` is useful to confirm the app is reading the intended SDK version and environment. It does not expose client secrets.

## Security Notes

- Never put `client_secret` in frontend JavaScript.
- Never commit real credentials.
- Rotate any credential accidentally shared in chat, screenshots, logs, or commits.
- Use HTTPS for production return URLs.
- Keep server error stack traces disabled in production.
- Treat this demo as a walkthrough app, not a complete production checkout system.

## Troubleshooting

If transaction fields are blank on the return page:

- Restart the app after code or config changes.
- Hard refresh the browser with `Cmd + Shift + R`.
- Confirm `/api/orders/{orderId}/status` returns a `payment` object.
- Wait a few seconds; the return page polls while Cashfree transaction details are becoming available.
- Confirm the order ID in the return URL matches the created order.
- Confirm credentials match the configured environment.

If the app does not start:

- Check whether the configured port is already in use.
- Change `server.port` and `app.base-url` together.
- Rebuild if you changed `cashfree.sdk-version`.
