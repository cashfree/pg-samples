# Cashfree Android Native SDK Merchant Demo

This repository now includes:
- Android demo app that supports `doWebPayment` and `doUPIPayment`.
- A local backend to create Cashfree orders securely.
- Post-payment verify screen with:
  - `payment_status`
  - `order_id`
  - `payment_time`
  - `payment_mode`
  - `Check Status` button when status is pending.

## Why backend is required

Cashfree `client_id` and `client_secret` must never be shipped inside Android code.
This demo uses `backend/server.js` to:
- Create order (`/api/create-order`) and return `order_id` + `payment_session_id`.
- Verify payment status (`/api/orders/:orderId/status`) for polling/refresh.

## Merchant integration steps

Before building from the terminal, make sure Android Studio and the Android SDK are installed. If Gradle reports that the SDK location is missing, either open the project once in Android Studio to generate `local.properties` or export:

```bash
export ANDROID_HOME="$HOME/Library/Android/sdk"
```

1. Copy env template:
```bash
cp backend/.env.example backend/.env
```

2. Add your credentials in `backend/.env`:
- `CASHFREE_SANDBOX_CLIENT_ID`
- `CASHFREE_SANDBOX_CLIENT_SECRET`
- `CASHFREE_PROD_CLIENT_ID`
- `CASHFREE_PROD_CLIENT_SECRET`

3. Install backend dependencies:
```bash
cd backend && npm install
```

4. Start backend:
```bash
npm start
```

5. From project root, install app on emulator:
```bash
./gradlew installDebug
```

6. Launch app:
```bash
adb shell am start -n com.example.rahul_app/.MainActivity
```

## One-line command (fast merchant demo run)

Run this from repository root:

```bash
(cd backend && ([ -d node_modules ] || npm install) && npm start) & ./gradlew installDebug && adb shell am start -n com.example.rahul_app/.MainActivity
```

If your backend process is already running, use:
```bash
./gradlew installDebug && adb shell am start -n com.example.rahul_app/.MainActivity
```

## App flow for merchant demo

1. Choose environment:
- `Sandbox`
- `Production`

2. Choose payment method:
- `doWebPayment`
- `doUPIPayment`

3. Tap `Create Order & Proceed`.

4. Complete payment in Cashfree checkout.

5. On verify screen:
- See status, order ID, payment time, and mode.
- If status is `PENDING`, tap `Check Status` to fetch latest state from backend.

## Backend endpoints

- `POST /api/create-order`
  - Request body:
    - `order_amount`
    - `order_currency` (default `INR`)
    - `customer_id`, `customer_email`, `customer_phone` (optional demo defaults included)
    - `environment` (`sandbox` or `production`)
  - Response:
    - `order_id`
    - `payment_session_id`

- `GET /api/orders/:orderId/status?environment=sandbox|production`
  - Response:
    - `payment_status`
    - `payment_time`
    - `payment_mode`

## Security checklist

- Do not commit `backend/.env`.
- Do not put Cashfree secrets in Android source.
- Do not log credentials in backend or app logs.
- Use `Production` keys only for live flows.

## Notes

- Android app backend URL defaults to `http://10.0.2.2:8080` in `BuildConfig` for emulator usage.
- Ensure emulator has internet access.
- If `adb` is not found, install Android platform-tools and add them to your `PATH`.
- This implementation follows the Cashfree Android mobile integration approach:
  - Android SDK doc: https://www.cashfree.com/docs/payments/online/mobile/android
