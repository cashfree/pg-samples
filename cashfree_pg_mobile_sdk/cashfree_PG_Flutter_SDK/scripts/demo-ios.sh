#!/bin/sh
set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
SIMULATOR_NAME="iPhone 17 Pro"

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

SIMULATOR_ID="$(xcrun simctl list devices available | sed -n 's/.*iPhone 17 Pro (\([A-F0-9-]*\)).*/\1/p' | head -n 1)"
if [ -z "${SIMULATOR_ID:-}" ]; then
  echo "$SIMULATOR_NAME simulator was not found."
  exit 1
fi

sh "$ROOT_DIR/scripts/demo-clean.sh"
start_backend

if ! wait_for_http "http://localhost:3000/health" 30; then
  echo "Backend did not start on http://localhost:3000"
  exit 1
fi

xcrun simctl boot "$SIMULATOR_ID" >/dev/null 2>&1 || true
open -a Simulator

cd "$ROOT_DIR"
flutter run -d "$SIMULATOR_ID"
