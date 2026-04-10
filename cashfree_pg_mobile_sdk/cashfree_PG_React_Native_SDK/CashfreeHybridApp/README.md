# Cashfree React Native PG Sample

This sample demonstrates Cashfree PG integration in a React Native app with a backend-first order flow.

## What This Sample Includes

- React Native app for Web checkout and UPI checkout
- Node.js backend for secure order creation and order verification
- Android and iOS project folders
- Optional helper scripts under `scripts/`

## Project Structure

- `App.tsx` app UI and checkout flow
- `backend/server.js` backend order and verification APIs
- `backend/.env.example` backend configuration template
- `scripts/demo-android.sh` Android demo helper
- `scripts/demo-ios.sh` iOS demo helper

## Backend Setup

Before building from the terminal, make sure Node.js, Xcode, Android Studio, and the Android SDK are installed. If Android builds fail with an SDK location error, either open the `android/` project once in Android Studio to generate `local.properties` or export:

```bash
export ANDROID_HOME="$HOME/Library/Android/sdk"
```

1. Create a local env file:

```bash
cd cashfree_pg_mobile_sdk/cashfree_PG_React_Native_SDK/CashfreeHybridApp/backend
cp .env.example .env
```

2. Add your Cashfree credentials:

```env
PORT=3000
CASHFREE_APP_ID_SANDBOX=YOUR_SANDBOX_APP_ID
CASHFREE_SECRET_KEY_SANDBOX=YOUR_SANDBOX_SECRET_KEY
CASHFREE_APP_ID_PRODUCTION=YOUR_PRODUCTION_APP_ID
CASHFREE_SECRET_KEY_PRODUCTION=YOUR_PRODUCTION_SECRET_KEY
```

3. Install backend dependencies and start the server:

```bash
npm install
npm run dev
```

The backend runs on `http://localhost:3000`.

If port `3000` is already in use on your machine, stop the other process before starting this backend.

## App Setup

From the app root:

```bash
cd ..
npm install
```

This sample keeps the default React Native 0.84 setup. On iOS, prebuilt React Native artifacts can make the first build much faster when the repo is in a path without spaces.

For iOS, install pods:

```bash
cd ios
pod install
cd ..
```

If CocoaPods is not installed yet, install it first with your preferred Ruby setup before running `pod install`.

If iOS pod install or Xcode build behaves unexpectedly, move the repo to a filesystem path without spaces and run `pod install` again.

## Run The App

Start Metro:

```bash
npm start
```

Run on Android:

```bash
npm run android
```

Run on iOS:

```bash
npm run ios
```

## Backend URL Defaults

- Android emulator default: `http://10.0.2.2:3000`
- iOS simulator default: `http://localhost:3000`

Use your machine IP instead when testing on a physical device.

## Optional Demo Scripts

From the app root:

```bash
npm run demo:clean
npm run demo:android
npm run demo:ios
```

Update the device names in those scripts if your local simulator or emulator names are different.
