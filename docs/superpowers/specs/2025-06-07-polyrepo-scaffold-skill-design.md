# Polyrepo Scaffold Skill — Design

## Goal

Package the polyrepo-starter scaffold tool as a Codex skill so agents can invoke `$polyrepo-scaffold` to create or extend multi-repo workspaces without dropping to a terminal.

## Structure

The skill lives in the polyrepo-starter repository as a self-contained subdirectory. The repo retains its existing layout for local CLI development.

```
polyrepo-starter/
├── skills/
│   └── polyrepo-scaffold/         # Self-contained skill directory
│       ├── SKILL.md               # Trigger rules + usage instructions
│       ├── agents/
│       │   └── openai.yaml        # UI metadata (optional)
│       ├── scripts/
│       │   ├── run.sh             # npm install + invoke CLI
│       │   └── src/               # CLI engine (copy of repo src/)
│       └── assets/
│           └── templates/         # Templates (copy of repo templates/)
├── src/                            # Original CLI source (kept for local dev)
├── templates/                      # Original templates (kept for local dev)
├── package.json
├── kickstart.sh
└── ...
```

## Skill Installation

```bash
python3 scripts/install-skill-from-github.py \
  --repo 0xkanglj/polyrepo-starter \
  --path skills/polyrepo-scaffold
```

This sparse-checks out only `skills/polyrepo-scaffold/` from GitHub and copies it to `~/.codex/skills/polyrepo-scaffold/`. Because the skill is self-contained (includes its own CLI engine and templates), no further network access is needed at runtime.

## Skill Update

To update the skill itself (SKILL.md, run.sh, or the bundled src/templates copies), re-run the install command. The installer will overwrite the existing skill directory.

## Keeping the Skill Copy in Sync

The skill directory contains copies of `src/` and `templates/`. A build script (`npm run build-skill`) copies them:

```bash
# In package.json scripts:
"build-skill": "mkdir -p skills/polyrepo-scaffold/scripts skills/polyrepo-scaffold/assets && rm -rf skills/polyrepo-scaffold/scripts/src skills/polyrepo-scaffold/assets/templates && cp -r src skills/polyrepo-scaffold/scripts/src && cp -r templates skills/polyrepo-scaffold/assets/templates && cp package.json package-lock.json skills/polyrepo-scaffold/scripts/src/"
```

Run `npm run build-skill` before committing changes to `src/` or `templates/` that should be reflected in the skill.

## Template Path Resolution

Currently `src/utils/path.js` hardcodes the templates path relative to `__dirname`:

```js
const TEMPLATES_DIR = resolve(__dirname, '../../templates');
```

In the skill bundle, `path.js` lives at `scripts/src/utils/path.js`, so `../../templates` resolves to `scripts/templates/` — but the actual templates are at `assets/templates/`. 

**Fix**: Add a `--templates-dir` hidden CLI option. When provided, it overrides the hardcoded default. The CLI already uses this pattern for `--verbose`. `run.sh` passes `--templates-dir "$SKILL_DIR/assets/templates"` to point the CLI to the bundled templates.

This is the only source-level change needed to support the skill layout.

## SKILL.md Content

### Frontmatter

```yaml
---
name: polyrepo-scaffold
description: >
  Scaffold multi-repo workspace projects with spec-center, server, web, and client modules.
  Use when the user asks to create a new project, scaffold a workspace, initialize a polyrepo
  structure, or add modules to an existing workspace.
---
```

### Body

The body instructs the agent to:

1. Run `scripts/run.sh` with the appropriate flags (`--name`, `--dir`, `--modules`)
2. Pass through user-provided parameters by mapping user intent to CLI flags:
   - User wants to create a new workspace → `--name <name>` (triggers init mode)
   - User wants a specific directory → `--dir <path>` (init mode only)
   - User specifies modules → `--modules <list>` (comma-separated)
   - User wants preview → `--dry-run`
3. When the user does not specify modules, omit `--modules` so the CLI runs interactive prompts
4. Do not pass `--dry-run` by default — only when the user explicitly requests a preview
5. Report the results to the user

The skill does NOT hardcode any module list or naming conventions — it delegates entirely to the CLI's interactive and flag-driven modes.

## run.sh Script

```bash
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
```

The CLI's `package.json` is bundled at `scripts/src/package.json` (copy of the repo's `package.json`), so `npm install` resolves dependencies correctly.

## Dependencies

- Node.js >= 18 (required; verified by `run.sh` on invocation)
- Git (required by polyrepo-starter for `git init` in each module)
- npm (for installing CLI dependencies on first run)

No network access at runtime beyond the initial `npm install` (one-time). No MCP tool dependencies.

## What Changes in the Repo

| Change | Purpose |
|--------|---------|
| New `skills/polyrepo-scaffold/` directory | Self-contained skill bundle |
| New `package.json` script `build-skill` | Sync `src/` and `templates/` into skill dir |
| Add `--templates-dir` hidden option to CLI (`src/cli.js`, `src/utils/path.js`) | Let skill context override template location; use `.hideHelp()` in Commander so terminal users don't see it |
| Add `package.json` to skill's `scripts/src/` directory | Enable `npm install` in skill context |

## What Does NOT Change

- `kickstart.sh` — unchanged; the existing curl | bash flow remains supported
- `node src/cli.js` — unchanged; local development flow untouched
- `package.json` `bin` entry — unchanged; `scaffold` command still works for npm-linked use
- Test structure — unchanged; tests still run against `src/` and `templates/` directly
