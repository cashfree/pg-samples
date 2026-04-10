#!/bin/sh
set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
ADB="$HOME/Library/Android/sdk/platform-tools/adb"
EMULATOR_BIN="$HOME/Library/Android/sdk/emulator/emulator"
AVD_NAME="Pixel_9_API_35"
DEMO_URL="cashfreehybridapp://demo/auto-pay"

start_bg() {
  command="$1"
  log_file="$2"
  pid_file="$3"

  sh -c "cd \"$ROOT_DIR\" && nohup sh -c '$command' > \"$log_file\" 2>&1 & echo \$! > \"$pid_file\""
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

sh "$ROOT_DIR/scripts/demo-clean.sh"

mkdir -p "$ROOT_DIR/.logs"

start_bg "cd backend && npm run start" "$ROOT_DIR/.logs/backend.log" "$ROOT_DIR/.demo-backend.pid"
start_bg "npm start" "$ROOT_DIR/.logs/metro.log" "$ROOT_DIR/.demo-metro.pid"

if ! "$ADB" devices 2>/dev/null | grep -q 'emulator-'; then
  nohup "$EMULATOR_BIN" @"$AVD_NAME" > "$ROOT_DIR/.logs/android-emulator.log" 2>&1 &
fi

"$ADB" wait-for-device
until "$ADB" shell getprop sys.boot_completed 2>/dev/null | grep -q 1; do
  sleep 2
done

"$ADB" reverse tcp:8081 tcp:8081 >/dev/null
"$ADB" shell input keyevent 82 >/dev/null 2>&1 || true

if ! wait_for_http "http://localhost:3000/health" 30; then
  echo "Backend did not start on http://localhost:3000"
  exit 1
fi

if ! wait_for_http "http://localhost:8081/status" 30; then
  echo "Metro did not start on http://localhost:8081"
  exit 1
fi

(
  cd "$ROOT_DIR/android"
  ./gradlew app:installDebug || {
    sleep 5
    "$ADB" wait-for-device
    ./gradlew app:installDebug
  }
)

"$ADB" shell am start \
  -a android.intent.action.VIEW \
  -d "$DEMO_URL" >/dev/null

echo "Android demo is ready on $AVD_NAME."
