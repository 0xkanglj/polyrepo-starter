# `.cursorindexingignore` Two-Tier Split Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split existing `.cursorignore` files into a two-tier ignore system — hard-block (`.cursorignore`) for secrets/dependencies and soft-block (`.cursorindexingignore`) for index noise that Agent can still access on demand.

**Architecture:** Six existing `.cursorignore` files get trimmed to only hard-tier patterns (secrets, dependency trees, tooling dirs). Six new `.cursorindexingignore` files get the soft-tier patterns (lock files, build output, generated code, logs, media, IDE/OS) plus module-specific sections. `init.sh` needs no changes because it already uses `cp -r` which copies all dotfiles.

**Tech Stack:** Bash, Git, plain text ignore files (`.cursorignore` / `.cursorindexingignore`)

---

## File Structure

| Action | File | Responsibility |
|--------|------|----------------|
| Modify | `templates/root/.cursorignore` | Hard tier — base only (identical across all modules) |
| Create | `templates/root/.cursorindexingignore` | Soft tier — base only |
| Modify | `templates/spec-center/.cursorignore` | Hard tier — base only (identical to root) |
| Create | `templates/spec-center/.cursorindexingignore` | Soft tier — base only (identical to root) |
| Modify | `templates/server/.cursorignore` | Hard tier — base only |
| Create | `templates/server/.cursorindexingignore` | Soft tier — base + server-specific commented section |
| Modify | `templates/web/.cursorignore` | Hard tier — base only |
| Create | `templates/web/.cursorindexingignore` | Soft tier — base + frontend active + frontend commented |
| Modify | `templates/mobile/.cursorignore` | Hard tier — base only |
| Create | `templates/mobile/.cursorindexingignore` | Soft tier — base + mobile active + mobile commented |
| Modify | `templates/admin/.cursorignore` | Hard tier — base only |
| Create | `templates/admin/.cursorindexingignore` | Soft tier — base + frontend (identical to web) |

**Key constraint:** All 6 `.cursorignore` files must be byte-for-byte identical after trimming. All `.cursorindexingignore` files share the same base section; `web` and `admin` are identical to each other.

---

### Task 1: Trim `templates/root/.cursorignore` to hard tier

**Files:**
- Modify: `templates/root/.cursorignore`

- [ ] **Step 1: Replace root `.cursorignore` with hard-tier-only content**

Write the following content to `templates/root/.cursorignore`:

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

- [ ] **Step 2: Verify file content**

Run: `cat templates/root/.cursorignore`

Expected: exactly the 10 lines above (3 comment lines, 7 pattern lines, trailing newline).

- [ ] **Step 3: Commit**

```bash
git add templates/root/.cursorignore
git commit -m "refactor: trim root .cursorignore to hard-tier patterns only"
```

---

### Task 2: Create `templates/root/.cursorindexingignore`

**Files:**
- Create: `templates/root/.cursorindexingignore`

- [ ] **Step 1: Create soft-tier file for root**

Write the following content to `templates/root/.cursorindexingignore`:

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

- [ ] **Step 2: Verify file content**

Run: `cat templates/root/.cursorindexingignore`

Expected: exactly the 18 lines above (6 comment lines, 12 pattern lines, trailing newline). No module-specific section.

- [ ] **Step 3: Commit**

```bash
git add templates/root/.cursorindexingignore
git commit -m "feat: add root .cursorindexingignore with soft-tier patterns"
```

---

### Task 3: Trim `templates/spec-center/.cursorignore` and create `.cursorindexingignore`

**Files:**
- Modify: `templates/spec-center/.cursorignore`
- Create: `templates/spec-center/.cursorindexingignore`

- [ ] **Step 1: Replace spec-center `.cursorignore` with hard-tier content**

Write the following content to `templates/spec-center/.cursorignore` (identical to root):

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

- [ ] **Step 2: Create spec-center `.cursorindexingignore` (identical to root)**

Write the following content to `templates/spec-center/.cursorindexingignore`:

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

- [ ] **Step 3: Verify both files match root**

Run: `diff templates/root/.cursorignore templates/spec-center/.cursorignore && diff templates/root/.cursorindexingignore templates/spec-center/.cursorindexingignore`

Expected: no output (files are identical).

- [ ] **Step 4: Commit**

```bash
git add templates/spec-center/.cursorignore templates/spec-center/.cursorindexingignore
git commit -m "refactor: split spec-center into hard/soft ignore tiers"
```

---

### Task 4: Trim `templates/server/.cursorignore` and create `.cursorindexingignore`

**Files:**
- Modify: `templates/server/.cursorignore`
- Create: `templates/server/.cursorindexingignore`

- [ ] **Step 1: Replace server `.cursorignore` with hard-tier content**

Write the following content to `templates/server/.cursorignore` (identical to root):

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

- [ ] **Step 2: Create server `.cursorindexingignore` with server-specific section**

Write the following content to `templates/server/.cursorindexingignore`:

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

# Server-specific (uncomment as needed)
# *.pb.go
# mocks/
# sqlc/
# api/swagger-ui/
```

- [ ] **Step 3: Verify `.cursorignore` matches root**

Run: `diff templates/root/.cursorignore templates/server/.cursorignore`

Expected: no output (identical).

- [ ] **Step 4: Verify `.cursorindexingignore` has server section**

Run: `tail -5 templates/server/.cursorindexingignore`

Expected: the 4 commented server-specific patterns (`# *.pb.go`, `# mocks/`, `# sqlc/`, `# api/swagger-ui/`).

- [ ] **Step 5: Commit**

```bash
git add templates/server/.cursorignore templates/server/.cursorindexingignore
git commit -m "refactor: split server into hard/soft ignore tiers"
```

---

### Task 5: Trim `templates/web/.cursorignore` and create `.cursorindexingignore`

**Files:**
- Modify: `templates/web/.cursorignore`
- Create: `templates/web/.cursorindexingignore`

- [ ] **Step 1: Replace web `.cursorignore` with hard-tier content**

Write the following content to `templates/web/.cursorignore` (identical to root):

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

- [ ] **Step 2: Create web `.cursorindexingignore` with frontend section**

Write the following content to `templates/web/.cursorindexingignore`:

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

# Frontend-specific — active
.next/
.cache/

# Frontend-specific (uncomment as needed)
# .nuxt/
# .svelte-kit/
```

- [ ] **Step 3: Verify `.cursorignore` matches root**

Run: `diff templates/root/.cursorignore templates/web/.cursorignore`

Expected: no output (identical).

- [ ] **Step 4: Verify `.cursorindexingignore` has frontend section**

Run: `tail -7 templates/web/.cursorindexingignore`

Expected: the 2 active patterns (`.next/`, `.cache/`) plus the 2 commented patterns (`# .nuxt/`, `# .svelte-kit/`).

- [ ] **Step 5: Commit**

```bash
git add templates/web/.cursorignore templates/web/.cursorindexingignore
git commit -m "refactor: split web into hard/soft ignore tiers"
```

---

### Task 6: Trim `templates/mobile/.cursorignore` and create `.cursorindexingignore`

**Files:**
- Modify: `templates/mobile/.cursorignore`
- Create: `templates/mobile/.cursorindexingignore`

- [ ] **Step 1: Replace mobile `.cursorignore` with hard-tier content**

Write the following content to `templates/mobile/.cursorignore` (identical to root):

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

- [ ] **Step 2: Create mobile `.cursorindexingignore` with mobile section**

Write the following content to `templates/mobile/.cursorindexingignore`:

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

# Mobile-specific — active
.dart_tool/

# Mobile-specific (uncomment as needed)
# ios/Pods/
# android/.gradle/
# android/app/build/
```

- [ ] **Step 3: Verify `.cursorignore` matches root**

Run: `diff templates/root/.cursorignore templates/mobile/.cursorignore`

Expected: no output (identical).

- [ ] **Step 4: Verify `.cursorindexingignore` has mobile section**

Run: `tail -7 templates/mobile/.cursorindexingignore`

Expected: the 1 active pattern (`.dart_tool/`) plus the 3 commented patterns (`# ios/Pods/`, `# android/.gradle/`, `# android/app/build/`).

- [ ] **Step 5: Commit**

```bash
git add templates/mobile/.cursorignore templates/mobile/.cursorindexingignore
git commit -m "refactor: split mobile into hard/soft ignore tiers"
```

---

### Task 7: Trim `templates/admin/.cursorignore` and create `.cursorindexingignore`

**Files:**
- Modify: `templates/admin/.cursorignore`
- Create: `templates/admin/.cursorindexingignore`

- [ ] **Step 1: Replace admin `.cursorignore` with hard-tier content**

Write the following content to `templates/admin/.cursorignore` (identical to root):

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

- [ ] **Step 2: Create admin `.cursorindexingignore` (identical to web)**

Write the following content to `templates/admin/.cursorindexingignore`:

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

# Frontend-specific — active
.next/
.cache/

# Frontend-specific (uncomment as needed)
# .nuxt/
# .svelte-kit/
```

- [ ] **Step 3: Verify admin matches web exactly**

Run: `diff templates/web/.cursorignore templates/admin/.cursorignore && diff templates/web/.cursorindexingignore templates/admin/.cursorindexingignore`

Expected: no output (both files identical to web).

- [ ] **Step 4: Commit**

```bash
git add templates/admin/.cursorignore templates/admin/.cursorindexingignore
git commit -m "refactor: split admin into hard/soft ignore tiers"
```

---

### Task 8: Run full verification suite from spec

**Files:** None (verification only)

- [ ] **Step 1: Verify 6 `.cursorindexingignore` files exist**

Run: `find templates -name .cursorindexingignore | sort`

Expected:
```
templates/admin/.cursorindexingignore
templates/mobile/.cursorindexingignore
templates/root/.cursorindexingignore
templates/server/.cursorindexingignore
templates/spec-center/.cursorindexingignore
templates/web/.cursorindexingignore
```

- [ ] **Step 2: Verify all `.cursorignore` files are identical to root**

Run: `for f in templates/spec-center/.cursorignore templates/server/.cursorignore templates/web/.cursorignore templates/mobile/.cursorignore templates/admin/.cursorignore; do echo "--- $f ---"; diff templates/root/.cursorignore "$f"; done`

Expected: 5 diff commands produce no output (all identical).

- [ ] **Step 3: Verify no anchored paths (no lines starting with `/`)**

Run: `grep -rn '^/' templates/*/.cursorindexingignore templates/*/.cursorignore || echo "OK: no anchored paths"`

Expected: `OK: no anchored paths`

- [ ] **Step 4: Verify web and admin `.cursorindexingignore` are identical**

Run: `diff templates/web/.cursorindexingignore templates/admin/.cursorindexingignore`

Expected: no output.

- [ ] **Step 5: Verify hard tier has secrets, soft tier has lock files and build output**

Run:
```bash
echo "=== Hard tier (.cursorignore) ==="
grep -c '.env' templates/root/.cursorignore
grep -c 'node_modules' templates/root/.cursorignore
echo "=== Soft tier (.cursorindexingignore) ==="
grep -c 'package-lock.json' templates/root/.cursorindexingignore
grep -c 'dist/' templates/root/.cursorindexingignore
```

Expected:
```
=== Hard tier (.cursorignore) ===
1
1
=== Soft tier (.cursorindexingignore) ===
1
1
```

Each grep count should be `1`.

- [ ] **Step 6: Commit verification results (optional)**

No code changes in this task — purely verification. If all checks pass, the implementation is complete.

---

## Summary

| Task | Module | Action | New file count |
|------|--------|--------|:-:|
| 1 | root | Trim `.cursorignore` | 0 |
| 2 | root | Create `.cursorindexingignore` | 1 |
| 3 | spec-center | Trim + Create | 1 |
| 4 | server | Trim + Create (with server section) | 1 |
| 5 | web | Trim + Create (with frontend section) | 1 |
| 6 | mobile | Trim + Create (with mobile section) | 1 |
| 7 | admin | Trim + Create (identical to web) | 1 |
| 8 | — | Full verification | 0 |

**Total:** 6 files modified, 6 files created, 0 files deleted.
