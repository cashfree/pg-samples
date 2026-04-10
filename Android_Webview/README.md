# Android WebView Cashfree PG Sample

This sample shows how to run Cashfree checkout inside an Android WebView while keeping order creation and order status verification on a Node.js backend.

## What This Sample Includes

- Android app that hosts the checkout flow in a WebView
- Node.js backend for secure order creation and status verification
- Local frontend pages served from the backend
- UPI intent handling for common payment apps

## Project Structure

- `app/` Android WebView host app
- `server/` Node.js backend and frontend assets
- `app-config.properties` WebView base URL
- `server/.env.example` backend config template

## Setup

Before building from the terminal, make sure Android Studio and the Android SDK are installed. If `./gradlew` says the SDK location is missing, either open the project once in Android Studio to generate `local.properties` or export:

```bash
export ANDROID_HOME="$HOME/Library/Android/sdk"
```

1. Create a backend env file:

```bash
cd Android_Webview/server
cp .env.example .env
```

2. Add your Cashfree credentials in `server/.env`:

```env
PORT=8090
PUBLIC_BASE_URL=http://127.0.0.1:8090
CASHFREE_ENV=sandbox
CASHFREE_API_VERSION=2025-01-01
CASHFREE_CLIENT_ID=YOUR_CASHFREE_CLIENT_ID
CASHFREE_CLIENT_SECRET=YOUR_CASHFREE_CLIENT_SECRET
DEFAULT_ORDER_AMOUNT=1.00
DEFAULT_ORDER_CURRENCY=INR
```

3. Install dependencies and start the backend:

```bash
npm install
npm start
```

4. In a new terminal, install and launch the Android app:

```bash
cd ..
adb reverse tcp:8090 tcp:8090
./gradlew installDebug
adb shell am start -n com.example.android_webview/.MainActivity
```

## Notes

- The sample uses `adb reverse` so the emulator can reach the backend at `127.0.0.1:8090`.
- If `adb` is not found, install Android platform-tools and add them to your `PATH`.
- Keep `CASHFREE_CLIENT_SECRET` only in the backend.
- Do not commit `server/.env`.
