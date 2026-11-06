#!/usr/bin/env bash
# capture.sh — capture desktop and mobile screenshots of the running app
set -euo pipefail

CAPTURE_URL="${CAPTURE_URL:?CAPTURE_URL environment variable is required}"
CAPTURE_DIR="${CAPTURE_DIR:?CAPTURE_DIR environment variable is required}"

# Per-command timing helper
time_run() {
  echo "=== TIMING START: $* ==="
  /usr/bin/time -p "$@"
  echo "=== TIMING END: $* ==="
}

time_run mkdir -p "$CAPTURE_DIR"

CHROME_PID=""

cleanup() {
  if [[ -n "${CHROME_PID:-}" ]]; then
    kill "$CHROME_PID" 2>/dev/null || true
    wait "$CHROME_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT

# ── Helper: capture one screenshot with Chromium ──
# Uses --headless --screenshot which writes screenshot.png to cwd and exits.
capture_one() {
  local size="$1" out="$2" ua="$3"
  local capdir
  capdir="$(mktemp -d)"
  local args=(
    --headless --disable-gpu --no-sandbox
    --screenshot --window-size="$size"
    --virtual-time-budget=15000
    --user-data-dir="$(mktemp -d)"
    "$CAPTURE_URL"
  )
  if [[ -n "$ua" ]]; then
    args=(--user-agent="$ua" "${args[@]}")
  fi

  (cd "$capdir" && time_run chromium "${args[@]}" >/dev/null 2>&1 || true)

  if [[ -f "$capdir/screenshot.png" && -s "$capdir/screenshot.png" ]]; then
    cp "$capdir/screenshot.png" "$out"
    rm -rf "$capdir"
  else
    rm -rf "$capdir"
    echo "ERROR: Chromium did not produce a screenshot for $size" >&2
    exit 1
  fi
}

MOBILE_UA="Mozilla/5.0 (Linux; Android 10; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36"

# ── Desktop capture ──
capture_one "1280,720" "$CAPTURE_DIR/final-desktop.png" ""
echo "Desktop screenshot saved: $CAPTURE_DIR/final-desktop.png"

# ── Mobile capture ──
capture_one "375,667" "$CAPTURE_DIR/final-mobile.png" "$MOBILE_UA"
echo "Mobile screenshot saved: $CAPTURE_DIR/final-mobile.png"

# ── Verify both files exist and are non-empty ──
for f in "$CAPTURE_DIR/final-desktop.png" "$CAPTURE_DIR/final-mobile.png"; do
  if [[ ! -s "$f" ]]; then
    echo "ERROR: Screenshot missing or empty: $f" >&2
    exit 1
  fi
done

echo "Capture complete. App left running."
