# Cashfree Flutter PG Sample

This sample demonstrates Cashfree PG integration in a Flutter app using a lightweight Node.js backend for secure order creation and payment verification.

## What This Sample Includes

- Flutter app for checkout and payment status handling
- Node.js backend for order creation and order verification
- Android and iOS project folders
- Optional helper scripts under `scripts/`

## Project Structure

- `lib/main.dart` Flutter app entry point
- `backend/server.js` backend API server
- `backend/config.json` backend Cashfree configuration
- `scripts/demo-android.sh` Android demo helper
- `scripts/demo-ios.sh` iOS demo helper

## Setup

Before building from the terminal, make sure Flutter, Xcode, Android Studio, and the Android SDK are installed. If Android builds fail with an SDK location error, either open the project once in Android Studio to generate `android/local.properties` or export:

```bash
export ANDROID_HOME="$HOME/Library/Android/sdk"
```

1. Install Flutter dependencies:

```bash
cd cashfree_pg_mobile_sdk/cashfree_PG_Flutter_SDK
flutter pub get
```

2. Install backend dependencies:

```bash
cd backend
npm install
cd ..
```

3. Update `backend/config.json` with your credentials:

```json
{
  "cashfree": {
    "clientId": "YOUR_CASHFREE_CLIENT_ID",
    "clientSecret": "YOUR_CASHFREE_CLIENT_SECRET",
    "apiVersion": "2025-01-01",
    "environment": "sandbox"
  }
}
```

## Run The Backend

```bash
cd backend
npm start
```

The backend runs on `http://localhost:3000`.

If port `3000` is already in use on your machine, stop the other process before starting this backend.

## Run The Flutter App

- Android emulator base URL: `http://10.0.2.2:3000`
- iOS simulator base URL: `http://127.0.0.1:3000`

Run on Android:

```bash
flutter run -d <android-device-id>
```

Run on iOS:

```bash
flutter run -d <ios-simulator-name>
```

For a fresh iOS setup, run `pod install` automatically through `flutter run` or `flutter build ios`. If CocoaPods is missing, install it first with your preferred Ruby setup.

## Optional Demo Scripts

From the project root:

```bash
sh scripts/demo-clean.sh
sh scripts/demo-android.sh
sh scripts/demo-ios.sh
```

Update the simulator or emulator names in those scripts if your local setup uses different device names.
