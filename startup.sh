#!/usr/bin/env bash
# startup.sh — once-per-worker prerequisites
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_DIR"

# Ensure required directories exist (worker-local metadata only)
mkdir -p /home/runner/work/_temp/omgithub-web
mkdir -p /home/runner/work/_temp/validation-42133780558-1793923687560 2>/dev/null || true

echo "startup.sh prerequisites complete."
