# Design: Add `.cursorignore` to Template Modules

**Date:** 2026-06-01
**Status:** Approved

## Background

Each template module (spec-center, server, web, mobile, admin) has a `.gitignore` but no `.cursorignore`. The root project `.cursorignore` is empty (comment only). Since `init.sh` uses `cp -r` to copy template directories, adding `.cursorignore` files to templates will automatically deploy them to generated projects.

### Why `.cursorignore` is needed beyond `.gitignore`

Cursor has a **dual-layer ignore mechanism**:

| File | Blocks Indexing | Blocks Agent/Tab/Edit | Blocks `@` Mention |
|------|:-:|:-:|:-:|
| `.gitignore` | Yes | **No** | **No** |
| `.cursorignore` | Yes | **Yes** | **Yes** |
| `.cursorindexingignore` | Yes | No | No |

`.gitignore` only prevents files from being **indexed** by Cursor's codebase search. It does **not** prevent Cursor's Agent from reading those files via tools, nor does it block Tab completion or `@file` mentions. `.cursorignore` is the stricter mechanism — it blocks all access channels.

This means patterns already in `.gitignore` (e.g., `.env`, `dist/`) still need to appear in `.cursorignore` if we want to fully prevent Agent access. See [Cursor Docs — Ignore Files](https://cursor.com/docs/reference/ignore-file).

### Two-tier strategy for this project

This design uses **`.cursorignore` only** (not `.cursorindexingignore`), because:

1. Template modules are small — no need for "index-only" soft blocking.
2. A single file per module is simpler to maintain across templates.
3. Users can switch individual entries to `.cursorindexingignore` later if they need agent access to specific indexed files.

## Decision

- `.cursorignore` blocks all Cursor access (indexing + agent + tab + `@mention`), extending beyond `.gitignore` which only blocks indexing.
- Patterns that overlap with `.gitignore` are intentional — they enforce Agent-level blocking that `.gitignore` alone does not provide.
- Patterns that overlap with Cursor's built-in defaults (e.g., `node_modules/`, lock files) are kept as **defensive declarations** — explicit is better than relying on undocumented defaults that may change.
- Shared base content across all modules, with module-specific sections where common patterns are **active by default** and niche patterns are commented.
- Root workspace gets the same base content as modules, since users typically open Cursor at the workspace root to access all modules.
- No changes to `init.sh` or `.gitignore`.

## File Structure

```
templates/
├── root/.cursorignore                  # Full base (primary Cursor entry point)
├── spec-center/.cursorignore           # Base only
├── server/.cursorignore                # Base + server-specific (active + commented)
├── web/.cursorignore                   # Base + frontend-specific (active + commented)
├── mobile/.cursorignore                # Base + mobile-specific (active + commented)
└── admin/.cursorignore                 # Base + frontend-specific (active + commented)
```

## Content Design

### Path Format Convention

All patterns use **non-prefixed** form (e.g., `dist/` not `/dist/`). Rationale: `.gitignore` uses `/`-prefixed paths to anchor to repo root, but `.cursorignore` should match anywhere in the directory tree — a `dist/` inside a submodule or nested directory should also be excluded.

### Root (`templates/root/.cursorignore`)

Users typically open Cursor at the workspace root to access all module repos. Root `.cursorignore` uses the same base content as modules, ensuring consistent behavior regardless of entry point:

```
# Project tooling
.worktrees/
.superpowers/

# Dependencies (defensive — also in Cursor defaults)
node_modules/
vendor/

# Lock files (defensive — also in Cursor defaults)
package-lock.json
yarn.lock
pnpm-lock.yaml
go.sum

# Environment — must block agent access to secrets
.env
.env.*
!.env.example

# Build output
dist/
build/
output/
bin/
coverage/

# Generated code
*.generated.*
generated/

# Logs
*.log

# Documentation media (preventive — template may grow media assets)
docs/assets/
*.mp4
*.mov

# IDE/OS
.idea/
.vscode/
.DS_Store
Thumbs.db
```

### Shared Base (all modules)

Every module `.cursorignore` includes this common section. Comments explain why each pattern exists:

```
# Project tooling
.worktrees/
.superpowers/

# Dependencies (defensive — also in Cursor defaults; listed for explicitness)
node_modules/
vendor/

# Lock files (defensive — also in Cursor defaults; git-tracked but no AI value)
package-lock.json
yarn.lock
pnpm-lock.yaml
go.sum

# Environment — must block agent access to secrets (gitignored but agent can still read)
.env
.env.*
!.env.example

# Build output (gitignored but agent can still read)
dist/
build/
output/
bin/
coverage/

# Generated code (git-tracked but should not influence AI suggestions)
*.generated.*
generated/

# Logs (gitignored but agent can still read)
*.log

# Documentation media (preventive — not yet present but likely as project grows)
docs/assets/
*.mp4
*.mov

# IDE/OS (gitignored but agent can still read)
.idea/
.vscode/
.DS_Store
Thumbs.db
```

### Module-Specific Sections

Each module appends rules relevant to its type. **High-frequency patterns are active by default**; niche patterns are commented for users to opt in.

#### `spec-center`

No additional section — pure documentation repo, base is sufficient.

#### `server`

```
# Server-specific — active
# (Protobuf generated code, mock directories — common in Go/Java backends)

# Server-specific (uncomment as needed)
# *.pb.go
# mocks/
# sqlc/
# api/swagger-ui/
```

> Note: All server-specific patterns are commented because server tech stacks vary widely (Go, Node, Python, Java). Unlike frontend frameworks (Next.js, Flutter) where cache directories are universal, there is no single "always present" pattern for servers.

#### `web`

```
# Frontend-specific — active
.next/
.cache/

# Frontend-specific (uncomment as needed)
# .nuxt/
# .svelte-kit/
```

> `.next/` (Next.js) and `.cache/` are active by default because Next.js is the most common React framework and `.cache/` appears across bundlers. Less common frameworks are commented.

#### `mobile`

```
# Mobile-specific — active
.dart_tool/

# Mobile-specific (uncomment as needed)
# ios/Pods/
# android/.gradle/
# android/app/build/
```

> `.dart_tool/` is active by default because Flutter/Dart is the most common cross-platform choice in this template context. Native iOS/Android patterns are commented since they may not apply.

#### `admin`

Same section as `web`:

```
# Frontend-specific — active
.next/
.cache/

# Frontend-specific (uncomment as needed)
# .nuxt/
# .svelte-kit/
```

## Impact

- **Files added:** 6 new `.cursorignore` files (root + 5 modules)
- **Files modified:** None (`init.sh` already copies all template files via `cp -r`)
- **Breaking changes:** None — purely additive
- **Behavioral change:** Cursor Agent, Tab completion, and `@file` mentions will no longer access environment files, build output, lock files, and dependency directories — even though these were previously accessible via `.gitignore` (which only blocks indexing)

## Out of Scope

- Adding `.cursorindexingignore` files (users can create these locally if needed)
- Updating the scaffold root `.cursorignore` (this repo's own file)
- Changing `.gitignore` content
- Adding niche framework-specific entries as active rules (only high-frequency patterns are active)
