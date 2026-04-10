#!/bin/sh
set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
ADB="$HOME/Library/Android/sdk/platform-tools/adb"
EMULATOR_BIN="$HOME/Library/Android/sdk/emulator/emulator"
AVD_NAME="Pixel_9_API_35"

start_backend() {
  mkdir -p "$ROOT_DIR/.logs"
  sh -c "cd \"$ROOT_DIR/backend\" && nohup npm start > \"$ROOT_DIR/.logs/backend.log\" 2>&1 & echo \$! > \"$ROOT_DIR/.demo-backend.pid\""
}

wait_for_http() {
  url="$1"
  retries="$2"
  count=0
  while [ "$count" -lt "$retries" ]; do
    if curl -fsS "$url" >/dev/null 2>&1; then
      return 0
    fi
    count=$((count + 1))
    sleep 2
  done
  return 1
}

wait_for_android_device() {
  "$ADB" wait-for-device
  until "$ADB" shell getprop sys.boot_completed 2>/dev/null | grep -q 1; do
    sleep 2
  done
}

sh "$ROOT_DIR/scripts/demo-clean.sh"
start_backend

if ! "$ADB" devices 2>/dev/null | grep -q 'emulator-'; then
  nohup "$EMULATOR_BIN" @"$AVD_NAME" > "$ROOT_DIR/.logs/android-emulator.log" 2>&1 &
fi

wait_for_android_device
"$ADB" reverse tcp:3000 tcp:3000 >/dev/null 2>&1 || true

if ! wait_for_http "http://localhost:3000/health" 30; then
  echo "Backend did not start on http://localhost:3000"
  exit 1
fi

ANDROID_DEVICE_ID="$("$ADB" devices | awk '/emulator-/{print $1; exit}')"
if [ -z "${ANDROID_DEVICE_ID:-}" ]; then
  echo "Android emulator device ID not found."
  exit 1
fi

cd "$ROOT_DIR"
flutter run -d "$ANDROID_DEVICE_ID"
