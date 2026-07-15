#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
PORT="4174"

if [[ ! -x "$CHROME" ]]; then
  echo "Google Chrome was not found at $CHROME" >&2
  exit 1
fi

mkdir -p "$ROOT/assets/screenshots"
npm run preview:local -- --port "$PORT" >"/tmp/blast-radius-vite.log" 2>&1 &
server_pid=$!

cleanup() {
  kill "$server_pid" 2>/dev/null || true
}
trap cleanup EXIT

for _ in {1..40}; do
  if curl --fail --silent "http://127.0.0.1:$PORT/src/client/game.html?demo=1" >/dev/null; then
    break
  fi
  sleep 0.25
done

capture() {
  local output="$1"
  local size="$2"
  local url="$3"
  local profile
  local temporary_output
  profile="$(mktemp -d "/tmp/blast-radius-capture.XXXXXX")"
  temporary_output="$profile/screenshot.png"
  "$CHROME" \
    --headless=new \
    --disable-gpu \
    --disable-background-networking \
    --hide-scrollbars \
    --no-first-run \
    --user-data-dir="$profile" \
    --window-size="$size" \
    --force-device-scale-factor=1 \
    --virtual-time-budget=5000 \
    --screenshot="$temporary_output" \
    "$url" >/dev/null 2>&1 &
  local chrome_pid=$!

  for _ in {1..60}; do
    if [[ -s "$temporary_output" ]]; then
      break
    fi
    sleep 0.25
  done
  kill "$chrome_pid" 2>/dev/null || true

  if [[ ! -s "$temporary_output" ]]; then
    echo "Screenshot failed: $output" >&2
    exit 1
  fi
  mv -f "$temporary_output" "$output"
}

capture \
  "$ROOT/assets/screenshots/00-launch-screen.png" \
  "1100,620" \
  "http://127.0.0.1:$PORT/src/client/splash.html?demo=1&day=2026-07-14"

capture \
  "$ROOT/assets/screenshots/01-lineage-board.png" \
  "1100,720" \
  "http://127.0.0.1:$PORT/src/client/game.html?demo=1&day=2026-07-14&stage=selected"

capture \
  "$ROOT/assets/screenshots/02-incident-result.png" \
  "1100,720" \
  "http://127.0.0.1:$PORT/src/client/game.html?demo=1&day=2026-07-14&stage=result-direct"

echo "Screenshots written to $ROOT/assets/screenshots"
