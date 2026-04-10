#!/bin/sh
set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
ADB="$HOME/Library/Android/sdk/platform-tools/adb"

kill_port() {
  port="$1"
  pids="$(lsof -ti tcp:"$port" 2>/dev/null || true)"
  if [ -n "${pids:-}" ]; then
    echo "$pids" | xargs kill 2>/dev/null || true
    sleep 1
    echo "$pids" | xargs kill -9 2>/dev/null || true
  fi
}

kill_pid_file() {
  pid_file="$1"
  if [ -f "$pid_file" ]; then
    pid="$(cat "$pid_file" 2>/dev/null || true)"
    if [ -n "${pid:-}" ] && kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null || true
      sleep 1
      kill -9 "$pid" 2>/dev/null || true
    fi
    rm -f "$pid_file"
  fi
}

kill_pid_file "$ROOT_DIR/.demo-backend.pid"
kill_port 3000

pkill -f "flutter run -d" 2>/dev/null || true
pkill -f "xcodebuild.*Runner" 2>/dev/null || true

if [ -x "$ADB" ]; then
  "$ADB" reverse --remove-all >/dev/null 2>&1 || true
  "$ADB" shell am force-stop com.example.cashfreefl.cashfree_fl_integration >/dev/null 2>&1 || true
fi

xcrun simctl terminate booted com.example.cashfreefl.cashfreeFlIntegration >/dev/null 2>&1 || true

echo "Cleaned Flutter demo processes on port 3000."
