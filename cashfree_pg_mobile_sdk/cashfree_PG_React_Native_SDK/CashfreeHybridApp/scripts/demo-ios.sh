#!/bin/sh
set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
SIMULATOR_NAME="iPhone 17 Pro"
BUNDLE_ID="org.reactjs.native.example.CashfreeHybridApp"
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

if ! wait_for_http "http://localhost:3000/health" 30; then
  echo "Backend did not start on http://localhost:3000"
  exit 1
fi

if ! wait_for_http "http://localhost:8081/status" 30; then
  echo "Metro did not start on http://localhost:8081"
  exit 1
fi

xcrun simctl boot "$SIMULATOR_NAME" >/dev/null 2>&1 || true
open -a Simulator

(
  cd "$ROOT_DIR"
  xcodebuild \
    -workspace ios/CashfreeHybridApp.xcworkspace \
    -scheme CashfreeHybridApp \
    -configuration Debug \
    -destination "platform=iOS Simulator,name=$SIMULATOR_NAME,OS=26.4" \
    -derivedDataPath ios/build \
    build
)

xcrun simctl install booted "$ROOT_DIR/ios/build/Build/Products/Debug-iphonesimulator/CashfreeHybridApp.app"
xcrun simctl launch booted "$BUNDLE_ID" >/dev/null
xcrun simctl openurl booted "$DEMO_URL"

echo "iOS demo is ready on $SIMULATOR_NAME."
