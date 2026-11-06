#!/usr/bin/env bash
# start.sh — build and serve the ZOMBIE PINS HTML5 game
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_DIR"

# Per-command timing helper
time_run() {
  echo "=== TIMING START: $* ==="
  /usr/bin/time -p "$@"
  echo "=== TIMING END: $* ==="
}

# ── Build: prepare static output directory inside PROJECT_DIR ──
time_run mkdir -p dist

# Copy the single-file HTML5 game as dist/index.html (runtime entry point)
time_run cp zombie-pins-dackel.html dist/index.html

# ── Write deployment-output.json for the controller ──
DEPLOY_DIR="${OPENCODE_WEB_DIR:-/home/runner/work/_temp/omgithub-web}"
time_run mkdir -p "$DEPLOY_DIR"
cat > "$DEPLOY_DIR/deployment-output.json" <<JSONEOF
{"project":"$PROJECT_DIR","directory":"$PROJECT_DIR/dist"}
JSONEOF

# Also write to the exact path requested
time_run mkdir -p /home/runner/work/_temp/omgithub-web
cat > /home/runner/work/_temp/omgithub-web/deployment-output.json <<JSONEOF
{"project":"$PROJECT_DIR","directory":"$PROJECT_DIR/dist"}
JSONEOF

# ── Serve in the foreground on PORT (default 3000) ──
PORT="${PORT:-3000}"
echo "Serving static output from $PROJECT_DIR/dist on port $PORT"
exec python3 -m http.server "$PORT" --directory dist
