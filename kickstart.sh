#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# polyrepo-starter kickstart.sh
# Remote bootstrap: curl | bash one-liner for workspace creation
#
# ⚠️  SECURITY NOTICE: This script downloads and executes code from the internet.
#     Review before running: curl -fsSL https://raw.githubusercontent.com/0xkanglj/polyrepo-starter/main/kickstart.sh | less
#     For supply chain integrity, pin to a specific commit SHA.
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
CLONE_ERR=$(mktemp)
if ! git clone --depth 1 "$REPO_URL" "$TEMP_DIR" 2>"$CLONE_ERR"; then
  echo "Error: Failed to download templates from $REPO_URL"
  cat "$CLONE_ERR" >&2
  rm -f "$CLONE_ERR"
  exit 1
fi
rm -f "$CLONE_ERR"
cd "$TEMP_DIR"

NPM_ERR=$(mktemp)
if ! npm install --omit=dev --silent 2>"$NPM_ERR"; then
  echo "Error: npm install failed."
  cat "$NPM_ERR" >&2
  rm -f "$NPM_ERR"
  exit 1
fi
rm -f "$NPM_ERR"

# Return to original directory so the CLI resolves relative paths correctly
cd "$ORIGINAL_DIR"

# ---------------------------------------------------------------------------
# Build CLI flags from environment variables
# ---------------------------------------------------------------------------
build_cli_flags() {
  CLI_FLAGS=()
  if [ -n "${PROJECT_NAME:-}" ]; then
    CLI_FLAGS+=(--name "$PROJECT_NAME")
  fi
  if [ -n "${WORKSPACE_DIR:-}" ]; then
    CLI_FLAGS+=(--dir "$WORKSPACE_DIR")
  fi
  if [ -n "${MODULES:-}" ]; then
    CLI_FLAGS+=(--modules "$MODULES")
  fi
}

# ---------------------------------------------------------------------------
# Run node CLI with stdin from /dev/tty when piped (curl | bash)
# ---------------------------------------------------------------------------
run_cli() {
  if [ -t 0 ]; then
    node "$@"
  else
    node "$@" < /dev/tty
  fi
}

# ---------------------------------------------------------------------------
# Run the unified scaffold command
# The CLI auto-detects init vs add mode from the current directory context.
# ---------------------------------------------------------------------------
build_cli_flags
run_cli "$TEMP_DIR/src/cli.js" "${CLI_FLAGS[@]+"${CLI_FLAGS[@]}"}" "$@"
