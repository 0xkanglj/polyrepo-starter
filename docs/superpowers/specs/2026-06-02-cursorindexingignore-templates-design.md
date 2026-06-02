# Design: Add `.cursorindexingignore` — Two-Tier Ignore Split

**Date:** 2026-06-02
**Status:** Draft — pending review
**Supersedes:** Partial revision of [2026-06-01-cursorignore-templates-design.md](./2026-06-01-cursorignore-templates-design.md) two-tier strategy (which chose `.cursorignore` only)

## Background

The 2026-06-01 design shipped `.cursorignore` files to all 6 template directories with **all patterns in the hard-block tier**. That blocks indexing, Agent, Tab, and `@mention` for every listed path — including lock files and generated code that Agent may legitimately need when debugging dependencies or API contracts.

Cursor supports a second file, `.cursorindexingignore`, which excludes paths from **indexing only** while leaving them accessible to Agent/Tab/`@mention`. See [Cursor Docs — Ignore Files](https://cursor.com/docs/reference/ignore-file).

### Three-layer recap

| File | Blocks Indexing | Blocks Agent/Tab/Edit | Blocks `@` Mention |
|------|:-:|:-:|:-:|
| `.gitignore` | Yes | No | No |
| `.cursorindexingignore` | Yes | No | No |
| `.cursorignore` | Yes | Yes | Yes |

## Decision (A1 — Full Split)

Adopt a **two-file default** across all templates:

| Tier | File | Intent |
|------|------|--------|
| **Hard** | `.cursorignore` | Security + paths Agent should never touch (secrets, huge dependency trees) |
| **Soft** | `.cursorindexingignore` | Index noise reduction; Agent can read on demand |

### What moves where

**Stays in `.cursorignore` (hard):**

```
# Project tooling
.worktrees/
.superpowers/

# Dependencies — too large / supply-chain noise for Agent
node_modules/
vendor/

# Environment — must block agent access to secrets
.env
.env.*
!.env.example
```

**Moves to `.cursorindexingignore` (soft):**

```
# Lock files (git-tracked; Agent may need for dependency debugging)
package-lock.json
yarn.lock
pnpm-lock.yaml
go.sum

# Build output
dist/
build/
output/
bin/
coverage/

# Generated code (git-tracked; Agent may need for API alignment)
*.generated.*
generated/

# Logs
*.log

# Documentation media
docs/assets/
*.mp4
*.mov

# IDE/OS
.idea/
.vscode/
.DS_Store
Thumbs.db
```

Module-specific active/commented patterns (`.next/`, `.dart_tool/`, etc.) move to `.cursorindexingignore` module sections — not `.cursorignore`.

### Rationale for hard-tier choices

- **`.env` / `.env.*`**: Security — Agent must not read secrets even if gitignored.
- **`node_modules/` / `vendor/`**: Volume and noise — Agent reading dependency trees is almost never useful and wastes context; supply-chain risk.
- **`.worktrees/` / `.superpowers/`**: Local tooling directories; may contain transient or sensitive state.

### Rationale for soft-tier choices

- **Lock files**: Git-tracked; Agent debugging version conflicts benefits from reading them.
- **Build output / caches**: Gitignored paths already skip indexing via `.gitignore`, but explicit declaration covers nested/monorepo layouts and documents intent. Agent may inspect build artifacts when troubleshooting.
- **`*.generated.*` / `generated/`**: Git-tracked generated API code — Agent often needs these to understand contracts without polluting semantic search.
- **Logs / media / IDE**: Low AI value for indexing; occasional Agent access is acceptable.

### `.gitignore` overlap

Soft-tier patterns may overlap with `.gitignore` (which also blocks indexing). This overlap is **intentional and defensive** — it ensures indexing behavior is determined by explicit `.cursorindexingignore` declarations regardless of how `.gitignore` evolves. The overlap carries no functional cost since all three files are maintained within this scaffold.

## File Structure

```
templates/
├── root/.cursorignore                  # Hard tier — base only
├── root/.cursorindexingignore          # Soft tier — base only
├── spec-center/.cursorignore           # Hard tier — base only
├── spec-center/.cursorindexingignore   # Soft tier — base only
├── server/.cursorignore                # Hard tier — base only
├── server/.cursorindexingignore        # Soft tier — base + server section
├── web/.cursorignore                   # Hard tier — base only
├── web/.cursorindexingignore           # Soft tier — base + frontend section
├── mobile/.cursorignore                # Hard tier — base only
├── mobile/.cursorindexingignore        # Soft tier — base + mobile section
├── admin/.cursorignore                 # Hard tier — base only
└── admin/.cursorindexingignore         # Soft tier — base + frontend section (same as web)
```

## Content Design

### Path Format Convention

Unchanged from 2026-06-01: all patterns use **non-prefixed** form (e.g., `dist/` not `/dist/`) so matches apply anywhere in the directory tree.

### Shared Hard Base (all `.cursorignore` files)

Every module `.cursorignore` shrinks to this identical content — **no** module-specific sections or legacy comments (those move entirely to `.cursorindexingignore`). Root uses the same hard base because it is not tied to a specific tech stack and therefore has no module-specific patterns.

```
# Project tooling
.worktrees/
.superpowers/

# Dependencies — too large / supply-chain noise for Agent
node_modules/
vendor/

# Environment — must block agent access to secrets
.env
.env.*
!.env.example
```

### Shared Soft Base (all `.cursorindexingignore` files)

Every module `.cursorindexingignore` includes:

```
# Lock files (git-tracked; Agent may need for dependency debugging)
package-lock.json
yarn.lock
pnpm-lock.yaml
go.sum

# Build output
dist/
build/
output/
bin/
coverage/

# Generated code (git-tracked; Agent may need for API alignment)
*.generated.*
generated/

# Logs
*.log

# Documentation media
docs/assets/
*.mp4
*.mov

# IDE/OS
.idea/
.vscode/
.DS_Store
Thumbs.db
```

### Module-Specific Soft Sections

High-frequency patterns **active by default**; niche patterns **commented**.

#### `spec-center`

No additional section — documentation repo; soft base is sufficient. Note: `spec-center`'s `.cursorignore` and `.cursorindexingignore` are identical to `root`'s (both are base-only with no module-specific additions).

#### `server`

```
# Server-specific (uncomment as needed)
# *.pb.go
# mocks/
# sqlc/
# api/swagger-ui/
```

> All server-specific patterns remain commented — stacks vary (Go, Node, Python, Java). Users opt in locally.

#### `web` and `admin` (identical)

```
# Frontend-specific — active
.next/
.cache/

# Frontend-specific (uncomment as needed)
# .nuxt/
# .svelte-kit/
```

#### `mobile`

```
# Mobile-specific — active
.dart_tool/

# Mobile-specific (uncomment as needed)
# ios/Pods/
# android/.gradle/
# android/app/build/
```

## Behavioral Change vs 2026-06-01

| Path category | Before (`.cursorignore` only) | After (A1 split) |
|---------------|-------------------------------|------------------|
| `.env` | Agent blocked | Agent blocked (unchanged) |
| `node_modules/` | Agent blocked | Agent blocked (unchanged) |
| Lock files | Agent blocked | **Agent can read** |
| `dist/`, build caches | Agent blocked | **Agent can read** |
| `*.generated.*` | Agent blocked | **Agent can read** |
| Logs, media, IDE | Agent blocked | **Agent can read** |

All listed paths remain **excluded from indexing** in both before and after states.

## Impact

- **Files added:** 6 new `.cursorindexingignore` files (root + 5 modules)
- **Files modified:** 6 existing `.cursorignore` files (trimmed to hard tier)
- **Files unchanged:** `init.sh` (already uses `cp -r` which copies `.cursorindexingignore` automatically), all `.gitignore` files
- **Breaking changes:** None for `init.sh` or repo structure
- **Behavioral change:** Generated projects allow Agent access to lock files, build output, generated code, logs, and IDE paths — while keeping secrets and dependency trees hard-blocked
- **Existing workspaces:** Projects already generated with the 2026-06-01 `.cursorignore` retain old behavior until users manually adopt the split or re-run scaffold (no auto-migration)

## Out of Scope

- Auto-migration script for existing workspaces
- Updating this scaffold repo's own root `.cursorignore` / `.cursorindexingignore`
- Changing `.gitignore` content
- Hierarchical Cursor Ignore settings (user-level Cursor preference)

## Verification

After implementation:

1. `find templates -name .cursorindexingignore | sort` — 6 files
2. `for f in templates/*/.cursorignore; do diff templates/root/.cursorignore "$f"; done` — all identical to hard base, no legacy module-specific comments
3. `grep -rn '^/' templates/*/.cursorindexingignore templates/*/.cursorignore` — no anchored paths
4. `diff templates/web/.cursorindexingignore templates/admin/.cursorindexingignore` — identical
5. `init.sh --dry-run` then real run — both files present per module in output workspace
6. Hard tier contains `.env` and `node_modules/`; soft tier contains `package-lock.json` and `dist/`
