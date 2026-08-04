# Cashfree PG Flutter Element SDK Demo

This Flutter project demonstrates a Cashfree Payment Gateway Element SDK integration for merchants. It includes order creation, payment session creation, Element SDK launch, return URL handling, payment verification callback handling, and order status refresh.

The sample supports these Element payment modes:

- UPI Intent with UI
- UPI Collect
- Netbanking
- Card Element

Subscription and Web Checkout flows are not included in this project.

## SDK Details

- SDK: `flutter_cashfree_pg_sdk`
- SDK version used in this app: `2.4.0+52`
- SDK source in this repo: `third_party/flutter_cashfree_pg_sdk`
- App config file: `lib/app_config.dart`
- Gateway wrapper file: `lib/cashfree_gateway.dart`
- Demo UI and callback handling: `lib/main.dart`

## Security Notes

Do not commit Cashfree client secrets, production keys, signing keys, `.env` files, `key.properties`, keystores, or generated local build files.

This repository does not contain a real Cashfree client secret. The app reads credentials from Dart compile-time defines:

- `CASHFREE_CLIENT_ID`
- `CASHFREE_CLIENT_SECRET`
- `CASHFREE_ENV`
- `CASHFREE_API_VERSION`
- `CASHFREE_RETURN_SCHEME`

For production merchant apps, create Cashfree orders from your backend and keep `client_secret` only on the backend. This Flutter app creates orders directly only to keep the demo self-contained for sandbox testing.

## Prerequisites

Install the following before running the app:

- Flutter SDK compatible with Dart `^3.8.1`
- Android Studio or Xcode for device builds
- A Cashfree merchant account
- Cashfree sandbox or production API credentials

Check your Flutter setup:

```sh
flutter doctor
```

Install dependencies:

```sh
flutter pub get
```

## Configure Cashfree Credentials

Run the app with credentials using `--dart-define`. Use sandbox credentials while testing.

```sh
flutter run \
  --dart-define=CASHFREE_CLIENT_ID=YOUR_CLIENT_ID \
  --dart-define=CASHFREE_CLIENT_SECRET=YOUR_CLIENT_SECRET \
  --dart-define=CASHFREE_ENV=SANDBOX \
  --dart-define=CASHFREE_API_VERSION=2025-01-01
```

For production testing, pass:

```sh
--dart-define=CASHFREE_ENV=PRODUCTION
```

The app chooses the Cashfree order API endpoint from `CASHFREE_ENV`:

- Sandbox: `https://sandbox.cashfree.com/pg/orders`
- Production: `https://api.cashfree.com/pg/orders`

## Return URL Setup

The default return URL is:

```text
cashfreepgdemo://payment-return?order_id=<ORDER_ID>
```

The scheme can be overridden at run time:

```sh
--dart-define=CASHFREE_RETURN_SCHEME=yourappscheme
```

If you change the scheme, update the native deep-link entries too.

Android entry:

```xml
<data
    android:scheme="cashfreepgdemo"
    android:host="payment-return" />
```

File: `android/app/src/main/AndroidManifest.xml`

iOS entry:

```xml
<key>CFBundleURLTypes</key>
```

File: `ios/Runner/Info.plist`

## Integration Flow

1. Merchant opens the app and enters amount, optional order ID, and payment mode.
2. If order ID is empty, the app generates a demo order ID.
3. `CashfreeGateway.preparePayment()` calls Cashfree Create Order API.
4. Cashfree returns `payment_session_id`.
5. The app builds a `CFSession` with order ID, payment session ID, and environment.
6. The selected Element payment builder is launched.
7. Cashfree returns control through SDK callbacks and the configured return URL.
8. The status screen calls Cashfree Get Order API to show the latest order status.

## Important Files

- `lib/app_config.dart`: reads environment, API version, client ID, client secret, return scheme, and currency.
- `lib/cashfree_gateway.dart`: creates orders, fetches order status, builds SDK sessions, and launches payment modes.
- `lib/main.dart`: contains the demo UI, form validation, SDK callbacks, return URL listener, and status screen.
- `android/app/src/main/AndroidManifest.xml`: Android return URL intent filter.
- `ios/Runner/Info.plist`: iOS return URL scheme.
- `pubspec.yaml`: Flutter dependencies and local SDK path.

## Creating an Order

The demo creates an order with this request body:

```json
{
  "order_amount": 1.00,
  "order_currency": "INR",
  "order_id": "order_123",
  "customer_details": {
    "customer_id": "demo_customer",
    "customer_phone": "9876543210",
    "customer_email": "demo@cashfree.com"
  },
  "order_meta": {
    "return_url": "cashfreepgdemo://payment-return?order_id=order_123"
  }
}
```

Required headers are added in `CashfreeGateway._headers`:

```text
x-api-version
x-client-id
x-client-secret
```

## Launching Payment Modes

UPI Intent with UI:

- Uses `CFUPIBuilder`
- Sets channel to `CFUPIChannel.INTENT_WITH_UI`
- Launches through `CFUPIPaymentBuilder`

UPI Collect:

- Uses `CFUPIBuilder`
- Sets channel to `CFUPIChannel.COLLECT`
- Requires a valid UPI ID

Netbanking:

- Uses `CFNetbankingBuilder`
- Requires a Cashfree bank code

Card Element:

- Uses `CFCardWidget` for card input
- Builds card details with `CFCardBuilder`
- Launches through `CFCardPaymentBuilder`

## Verifying Payment Status

The app handles both SDK callbacks:

- `onVerify(orderId)`: opens the status screen and fetches order status.
- `onError(errorResponse, orderId)`: opens the status screen with the error details and still allows status refresh.

The status screen calls:

```text
GET /pg/orders/{order_id}
```

Use your backend webhook verification as the final source of truth in production.

## Android Run

```sh
flutter run -d android \
  --dart-define=CASHFREE_CLIENT_ID=YOUR_CLIENT_ID \
  --dart-define=CASHFREE_CLIENT_SECRET=YOUR_CLIENT_SECRET \
  --dart-define=CASHFREE_ENV=SANDBOX \
  --dart-define=CASHFREE_API_VERSION=2025-01-01
```

## iOS Run

```sh
cd ios
pod install
cd ..
flutter run -d ios \
  --dart-define=CASHFREE_CLIENT_ID=YOUR_CLIENT_ID \
  --dart-define=CASHFREE_CLIENT_SECRET=YOUR_CLIENT_SECRET \
  --dart-define=CASHFREE_ENV=SANDBOX \
  --dart-define=CASHFREE_API_VERSION=2025-01-01
```

## Testing Checklist

Before sharing with a merchant, verify:

- `flutter pub get` completes.
- `flutter analyze` has no blocking issues.
- App starts without credentials and shows the placeholder credentials warning.
- App starts with sandbox credentials.
- Order creation returns `payment_session_id`.
- Each enabled Element payment mode launches correctly.
- Return URL opens the status screen.
- Status refresh returns the expected Cashfree order state.

## Merchant Production Checklist

For a production merchant implementation:

- Move order creation to merchant backend.
- Keep `client_secret` on backend only.
- Send only `order_id` and `payment_session_id` to the Flutter app.
- Configure production return URL scheme and native deep links.
- Verify payment status with Cashfree webhooks on backend.
- Re-check Android package name, iOS bundle ID, signing, and app links before release.
