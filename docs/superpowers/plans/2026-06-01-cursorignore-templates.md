# Add `.cursorignore` to Template Modules — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `.cursorignore` files to all 6 template directories (root + 5 modules) so that generated workspaces block Cursor Agent/Tab/`@mention` access to secrets, build output, dependencies, and other non-source files.

**Architecture:** Pure file creation — no code changes. Each template directory gets a `.cursorignore` with a shared base section (project tooling, dependencies, lock files, env, build output, generated code, logs, docs media, IDE/OS) plus optional module-specific rules (server, web, mobile, admin). `init.sh` already copies all template files via `cp -r`, so new files are automatically deployed.

**Tech Stack:** Bash (scaffold only — no runtime code, no test framework)

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `templates/root/.cursorignore` | Create | Full base content for workspace root (primary Cursor entry point) |
| `templates/spec-center/.cursorignore` | Create | Base only — pure documentation repo |
| `templates/server/.cursorignore` | Create | Base + server-specific (all commented — stacks vary) |
| `templates/web/.cursorignore` | Create | Base + frontend-specific (.next/, .cache/ active) |
| `templates/mobile/.cursorignore` | Create | Base + mobile-specific (.dart_tool/ active) |
| `templates/admin/.cursorignore` | Create | Base + frontend-specific (same as web) |

No existing files are modified.

---

### Task 1: Create `templates/root/.cursorignore`

**Files:**
- Create: `templates/root/.cursorignore`

- [ ] **Step 1: Create the file**

Create `templates/root/.cursorignore` with the following content:

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

- [ ] **Step 2: Verify file exists and has correct content**

Run: `cat templates/root/.cursorignore`
Expected: Output matches the content above exactly. Count lines — should be 42 lines (including blank lines).

- [ ] **Step 3: Commit**

```bash
git add templates/root/.cursorignore
git commit -m "feat(templates): add .cursorignore for workspace root"
```

---

### Task 2: Create `templates/spec-center/.cursorignore`

**Files:**
- Create: `templates/spec-center/.cursorignore`

- [ ] **Step 1: Create the file**

Create `templates/spec-center/.cursorignore` with the following content:

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

- [ ] **Step 2: Verify file exists and has correct content**

Run: `cat templates/spec-center/.cursorignore`
Expected: Output matches the content above exactly. Count lines — should be 46 lines.

- [ ] **Step 3: Commit**

```bash
git add templates/spec-center/.cursorignore
git commit -m "feat(templates): add .cursorignore for spec-center module"
```

---

### Task 3: Create `templates/server/.cursorignore`

**Files:**
- Create: `templates/server/.cursorignore`

- [ ] **Step 1: Create the file**

Create `templates/server/.cursorignore` with the following content:

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

# Server-specific — active
# (Protobuf generated code, mock directories — common in Go/Java backends)

# Server-specific (uncomment as needed)
# *.pb.go
# mocks/
# sqlc/
# api/swagger-ui/
```

- [ ] **Step 2: Verify file exists and has correct content**

Run: `cat templates/server/.cursorignore`
Expected: Output matches the content above exactly. The file ends with the server-specific section containing 4 commented-out patterns. Count lines — should be 56 lines.

- [ ] **Step 3: Commit**

```bash
git add templates/server/.cursorignore
git commit -m "feat(templates): add .cursorignore for server module"
```

---

### Task 4: Create `templates/web/.cursorignore`

**Files:**
- Create: `templates/web/.cursorignore`

- [ ] **Step 1: Create the file**

Create `templates/web/.cursorignore` with the following content:

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

# Frontend-specific — active
.next/
.cache/

# Frontend-specific (uncomment as needed)
# .nuxt/
# .svelte-kit/
```

- [ ] **Step 2: Verify file exists and has correct content**

Run: `cat templates/web/.cursorignore`
Expected: Output matches the content above exactly. The file ends with the frontend-specific section with `.next/` and `.cache/` active, `.nuxt/` and `.svelte-kit/` commented. Count lines — should be 56 lines.

- [ ] **Step 3: Commit**

```bash
git add templates/web/.cursorignore
git commit -m "feat(templates): add .cursorignore for web module"
```

---

### Task 5: Create `templates/mobile/.cursorignore`

**Files:**
- Create: `templates/mobile/.cursorignore`

- [ ] **Step 1: Create the file**

Create `templates/mobile/.cursorignore` with the following content:

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

# Mobile-specific — active
.dart_tool/

# Mobile-specific (uncomment as needed)
# ios/Pods/
# android/.gradle/
# android/app/build/
```

- [ ] **Step 2: Verify file exists and has correct content**

Run: `cat templates/mobile/.cursorignore`
Expected: Output matches the content above exactly. The file ends with the mobile-specific section with `.dart_tool/` active, 3 native patterns commented. Count lines — should be 56 lines.

- [ ] **Step 3: Commit**

```bash
git add templates/mobile/.cursorignore
git commit -m "feat(templates): add .cursorignore for mobile module"
```

---

### Task 6: Create `templates/admin/.cursorignore`

**Files:**
- Create: `templates/admin/.cursorignore`

- [ ] **Step 1: Create the file**

Create `templates/admin/.cursorignore` with the following content (identical to web's `.cursorignore`):

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

# Frontend-specific — active
.next/
.cache/

# Frontend-specific (uncomment as needed)
# .nuxt/
# .svelte-kit/
```

- [ ] **Step 2: Verify file exists and has correct content**

Run: `cat templates/admin/.cursorignore`
Expected: Output matches the content above exactly. Content is identical to `templates/web/.cursorignore`. Count lines — should be 56 lines.

- [ ] **Step 3: Verify admin matches web**

Run: `diff templates/web/.cursorignore templates/admin/.cursorignore`
Expected: No output (files are identical).

- [ ] **Step 4: Commit**

```bash
git add templates/admin/.cursorignore
git commit -m "feat(templates): add .cursorignore for admin module"
```

---

### Task 7: End-to-end verification with `init.sh`

**Files:** None (verification only)

This task verifies that all `.cursorignore` files are correctly deployed when `init.sh` generates a workspace.

- [ ] **Step 1: Verify all 6 template `.cursorignore` files exist**

Run: `find templates -name .cursorignore | sort`
Expected:
```
templates/admin/.cursorignore
templates/mobile/.cursorignore
templates/root/.cursorignore
templates/server/.cursorignore
templates/spec-center/.cursorignore
templates/web/.cursorignore
```

- [ ] **Step 2: Verify patterns use non-prefixed paths (no leading `/`)**

Run: `grep -rn '^/' templates/*/.cursorignore || echo "PASS: No anchored paths found"`
Expected: `PASS: No anchored paths found`

This confirms patterns like `dist/` (not `/dist/`) as required by the spec — `.cursorignore` should match anywhere in the directory tree, unlike `.gitignore` which uses `/`-prefixed paths to anchor to repo root.

- [ ] **Step 3: Verify `.env.example` negation is present in all files**

Run: `grep -c '!.env.example' templates/*/.cursorignore`
Expected: Each file shows count of 1.

- [ ] **Step 4: Dry-run `init.sh` to confirm files would be deployed**

Run: `./init.sh --dry-run -n testproj -m spec-center,server,web,mobile,admin`
Expected: Output lists `.cursorignore` under each module directory (e.g., `testproj-server/.cursorignore`).

- [ ] **Step 5: Actually generate a test workspace and verify**

Run: `./init.sh -n testverify -d /tmp/testverify -m spec-center,server,web,mobile,admin`
Expected: "Workspace created successfully!"

Then verify files exist:
Run: `find /tmp/testverify -name .cursorignore | sort`
Expected:
```
/tmp/testverify/.cursorignore
/tmp/testverify/testverify-admin/.cursorignore
/tmp/testverify/testverify-mobile/.cursorignore
/tmp/testverify/testverify-server/.cursorignore
/tmp/testverify/testverify-spec-center/.cursorignore
/tmp/testverify/testverify-web/.cursorignore
```

Then verify content preserved (no placeholder substitution broke anything):
Run: `grep -c '.env' /tmp/testverify/testverify-server/.cursorignore`
Expected: At least 3 (`.env`, `.env.*`, `!.env.example` lines).

- [ ] **Step 6: Clean up test workspace**

Run: `rm -rf /tmp/testverify`

- [ ] **Step 7: Verify git status is clean**

Run: `git status`
Expected: All `.cursorignore` files already committed in Tasks 1–6. No unstaged changes.
