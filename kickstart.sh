#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# polyrepo-starter kickstart.sh
# Remote bootstrap: curl | bash one-liner for workspace creation
# =============================================================================

REPO_URL="https://github.com/0xkanglj/polyrepo-starter.git"
ORIGINAL_DIR=$(pwd)
TEMP_DIR=$(mktemp -d)

cleanup() { rm -rf "$TEMP_DIR"; }
trap cleanup EXIT

# ---------------------------------------------------------------------------
# Node.js detection
# ---------------------------------------------------------------------------
if ! command -v node &>/dev/null; then
  echo "Error: Node.js >= 18 is required."
  echo "Install: https://nodejs.org/ or https://github.com/nvm-sh/nvm"
  exit 1
fi

NODE_MAJOR=$(node -e "console.log(process.versions.node.split('.')[0])")
if [ "$NODE_MAJOR" -lt 18 ]; then
  echo "Error: Node.js >= 18 required, got $(node --version)"
  exit 1
fi

# ---------------------------------------------------------------------------
# Download templates
# ---------------------------------------------------------------------------
echo "Downloading templates..."
if ! git clone --depth 1 "$REPO_URL" "$TEMP_DIR" 2>/dev/null; then
  echo "Error: Failed to download templates from $REPO_URL"
  exit 1
fi
cd "$TEMP_DIR"

if ! npm install --production --silent 2>/dev/null; then
  echo "Error: npm install failed."
  exit 1
fi

# ---------------------------------------------------------------------------
# Auto-detect mode
# ---------------------------------------------------------------------------
if find "$ORIGINAL_DIR" -maxdepth 1 -type d -name '*-spec-center' 2>/dev/null | grep -q .; then
  echo "Detected existing workspace. Running 'add' command..."
  node src/cli.js add --templates-dir "$TEMP_DIR/templates" "$@"
else
  echo "Creating new workspace..."
  node src/cli.js init --templates-dir "$TEMP_DIR/templates" "$@"
fi