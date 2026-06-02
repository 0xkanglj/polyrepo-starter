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
if ! npm install --production --silent 2>"$NPM_ERR"; then
  echo "Error: npm install failed."
  cat "$NPM_ERR" >&2
  rm -f "$NPM_ERR"
  exit 1
fi
rm -f "$NPM_ERR"

# Return to original directory so the CLI resolves relative paths correctly
cd "$ORIGINAL_DIR"

# ---------------------------------------------------------------------------
# Prompt helper: read from /dev/tty when stdin is a pipe
# ---------------------------------------------------------------------------
prompt_value() {
  local prompt="$1"
  local var_name="$2"
  if [ -t 0 ]; then
    # stdin is a terminal — let inquirer handle it
    return
  fi
  # stdin is a pipe — read from /dev/tty
  if [ ! -e /dev/tty ]; then
    echo "Error: Cannot read input (no /dev/tty). Use: PROJECT=name curl ... | bash"
    exit 1
  fi
  printf "%s" "$prompt"
  read -r "$var_name" < /dev/tty || true
}

# ---------------------------------------------------------------------------
# Build CLI flags for non-interactive stdin
# ---------------------------------------------------------------------------
build_init_flags() {
  INIT_FLAGS=()
  if [ -n "${PROJECT_NAME:-}" ]; then
    INIT_FLAGS+=(--name "$PROJECT_NAME")
  elif ! [ -t 0 ]; then
    prompt_value "? Project name: " PROJECT_NAME
    if [ -n "${PROJECT_NAME:-}" ]; then
      INIT_FLAGS+=(--name "$PROJECT_NAME")
    fi
  fi
  if [ -n "${WORKSPACE_DIR:-}" ]; then
    INIT_FLAGS+=(--dir "$WORKSPACE_DIR")
  fi
  if [ -n "${MODULES:-}" ]; then
    INIT_FLAGS+=(--modules "$MODULES")
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
# Auto-detect mode
# ---------------------------------------------------------------------------
if find "$ORIGINAL_DIR" -maxdepth 1 -type d -name '*-spec-center' 2>/dev/null | grep -q .; then
  echo "Detected existing workspace. Running 'add' command..."
  run_cli "$TEMP_DIR/src/cli.js" add --templates-dir "$TEMP_DIR/templates" "$@"
else
  echo "Creating new workspace..."
  build_init_flags
  run_cli "$TEMP_DIR/src/cli.js" init --templates-dir "$TEMP_DIR/templates" "${INIT_FLAGS[@]+"${INIT_FLAGS[@]}"}" "$@"
fi