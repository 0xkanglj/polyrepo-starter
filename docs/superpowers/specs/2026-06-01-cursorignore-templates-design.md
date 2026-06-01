# Design: Add `.cursorignore` to Template Modules

**Date:** 2026-06-01
**Status:** Approved

## Background

Each template module (spec-center, server, web, mobile, admin) has a `.gitignore` but no `.cursorignore`. The root project `.cursorignore` is empty (comment only). Since `init.sh` uses `cp -r` to copy template directories, adding `.cursorignore` files to templates will automatically deploy them to generated projects.

## Decision

- `.cursorignore` extends beyond `.gitignore` — excludes files that git tracks but Cursor should not index (lock files, vendor deps, docs media, generated code).
- Shared base content across all modules, with commented module-specific suggestions.
- Root workspace gets a minimal version.
- No changes to `init.sh` or `.gitignore`.

## File Structure

```
templates/
├── root/.cursorignore                  # Minimal: workspace metadata only
├── spec-center/.cursorignore           # Base only
├── server/.cursorignore                # Base + server-specific comments
├── web/.cursorignore                   # Base + frontend-specific comments
├── mobile/.cursorignore                # Base + mobile-specific comments
└── admin/.cursorignore                 # Base + frontend-specific comments (same as web)
```

## Content Design

### Root (`templates/root/.cursorignore`)

The workspace root is not a git repo and users rarely open Cursor here. Keep minimal:

```
# Workspace metadata
.worktrees/
.superpowers/
```

### Shared Base (all modules)

Every module `.cursorignore` includes this common section:

```
# Project tooling
.worktrees/
.superpowers/

# Dependencies
node_modules/
vendor/

# Lock files
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

# Generated code
*.generated.*
generated/

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

### Module-Specific Comment Sections

Each module appends commented-out suggestions relevant to its type. Users uncomment what applies.

#### `spec-center`

No additional section — pure documentation repo, base is sufficient.

#### `server`

```
# Server-specific (uncomment as needed)
# *.pb.go
# mocks/
# sqlc/
# api/swagger-ui/
```

#### `web`

```
# Frontend-specific (uncomment as needed)
# .next/
# .nuxt/
# .cache/
# .svelte-kit/
```

#### `mobile`

```
# Mobile-specific (uncomment as needed)
# .dart_tool/
# ios/Pods/
# android/.gradle/
# android/app/build/
```

#### `admin`

Same comment section as `web`:

```
# Frontend-specific (uncomment as needed)
# .next/
# .nuxt/
# .cache/
# .svelte-kit/
```

## Impact

- **Files added:** 6 new `.cursorignore` files (root + 5 modules)
- **Files modified:** None (`init.sh` already copies all template files)
- **Breaking changes:** None — purely additive

## Out of Scope

- Updating the scaffold root `.cursorignore` (this repo's own file)
- Changing `.gitignore` content
- Adding framework-specific entries as active (non-commented) rules
