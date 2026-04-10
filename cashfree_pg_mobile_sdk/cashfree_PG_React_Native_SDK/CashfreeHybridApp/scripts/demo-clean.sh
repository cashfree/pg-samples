#!/bin/sh
set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"

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

kill_port() {
  port="$1"
  pids="$(lsof -ti tcp:"$port" 2>/dev/null || true)"
  if [ -n "${pids:-}" ]; then
    echo "$pids" | xargs kill 2>/dev/null || true
    sleep 1
    echo "$pids" | xargs kill -9 2>/dev/null || true
  fi
}

kill_pid_file "$ROOT_DIR/.demo-backend.pid"
kill_pid_file "$ROOT_DIR/.demo-metro.pid"

kill_port 3000
kill_port 8081

if [ -x "$HOME/Library/Android/sdk/platform-tools/adb" ]; then
  "$HOME/Library/Android/sdk/platform-tools/adb" reverse --remove-all >/dev/null 2>&1 || true
  "$HOME/Library/Android/sdk/platform-tools/adb" shell am force-stop com.cashfreehybridapp >/dev/null 2>&1 || true
fi

xcrun simctl terminate booted org.reactjs.native.example.CashfreeHybridApp >/dev/null 2>&1 || true

echo "Cleaned demo processes on ports 3000 and 8081."
