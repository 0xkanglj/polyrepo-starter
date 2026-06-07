#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SKILL_DIR="$(dirname "$SCRIPT_DIR")"
CLI_DIR="$SCRIPT_DIR/src"

# Verify Node.js >= 18
NODE_MAJOR=$(node -e "console.log(process.versions.node.split('.')[0])")
if [ "$NODE_MAJOR" -lt 18 ]; then
  echo "Error: Node.js >= 18 required, got $(node --version)" >&2
  exit 1
fi

# Install dependencies if needed
if [ ! -d "$CLI_DIR/node_modules" ]; then
  cd "$CLI_DIR"
  npm install --omit=dev --silent
  cd "$SKILL_DIR"
fi

exec node "$CLI_DIR/cli.js" \
  --templates-dir "$SKILL_DIR/assets/templates" \
  "$@"
