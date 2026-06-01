# Scaffold Generalization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform spec-center-template from a business-bound (deluxe-) module into a universal scaffold that generates multi-repo workspaces via `init.sh`.

**Architecture:** Current repo IS the spec-center module content. Restructure by moving all content into `templates/spec-center/`, then generalizing with `{{PROJECT}}` placeholders. Create module templates (root, server, web, mobile, admin) and an `init.sh` script that copies templates, replaces placeholders, and initializes git repos per module.

**Tech Stack:** Bash (init.sh), Markdown (templates/docs)

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `templates/spec-center/AGENTS.md` | Create (copy from root, then generalize) | SSOT project rules with `{{PROJECT}}` placeholders |
| `templates/spec-center/CLAUDE.md` | Create (copy from root) | `@AGENTS.md` pointer |
| `templates/spec-center/.gitignore` | Create | Universal module gitignore |
| `templates/spec-center/conventions/http-constitution.md` | Create (copy, then generalize) | HTTP API spec with UTC timezone |
| `templates/spec-center/conventions/validation.md` | Create (copy as-is) | Input validation convention |
| `templates/spec-center/conventions/go-project.md` | Create (new) | Go project structure convention |
| `templates/spec-center/errors/error-codes.md` | Create (copy, then generalize) | Error code registry (generic) |
| `templates/spec-center/api/.gitkeep` | Create | Placeholder for API specs |
| `templates/spec-center/docs/specs/.gitkeep` | Create | Placeholder for domain specs |
| `templates/spec-center/events/.gitkeep` | Create | Placeholder for event defs |
| `templates/root/AGENTS.md` | Create | Workspace root AGENTS.md template |
| `templates/root/CLAUDE.md` | Create | Workspace root CLAUDE.md template |
| `templates/server/AGENTS.md` | Create | Server module AGENTS.md template |
| `templates/server/CLAUDE.md` | Create | Server module CLAUDE.md template |
| `templates/server/.gitignore` | Create | Universal module gitignore |
| `templates/server/.env.example` | Create | Environment variable skeleton |
| `templates/server/Makefile` | Create | Build task skeleton |
| `templates/server/docs/specs/.gitkeep` | Create | Placeholder |
| `templates/server/docs/plans/.gitkeep` | Create | Placeholder |
| `templates/web/AGENTS.md` | Create | Web module AGENTS.md template |
| `templates/web/CLAUDE.md` | Create | Web module CLAUDE.md template |
| `templates/web/.gitignore` | Create | Universal module gitignore |
| `templates/web/.env.example` | Create | Environment variable skeleton |
| `templates/web/Makefile` | Create | Build task skeleton |
| `templates/web/docs/specs/.gitkeep` | Create | Placeholder |
| `templates/web/docs/plans/.gitkeep` | Create | Placeholder |
| `templates/mobile/AGENTS.md` | Create | Mobile module AGENTS.md template |
| `templates/mobile/CLAUDE.md` | Create | Mobile module CLAUDE.md template |
| `templates/mobile/.gitignore` | Create | Universal module gitignore |
| `templates/mobile/.env.example` | Create | Environment variable skeleton |
| `templates/mobile/Makefile` | Create | Build task skeleton |
| `templates/mobile/docs/specs/.gitkeep` | Create | Placeholder |
| `templates/mobile/docs/plans/.gitkeep` | Create | Placeholder |
| `templates/admin/AGENTS.md` | Create | Admin module AGENTS.md template |
| `templates/admin/CLAUDE.md` | Create | Admin module CLAUDE.md template |
| `templates/admin/.gitignore` | Create | Universal module gitignore |
| `templates/admin/.env.example` | Create | Environment variable skeleton |
| `templates/admin/Makefile` | Create | Build task skeleton |
| `templates/admin/docs/specs/.gitkeep` | Create | Placeholder |
| `templates/admin/docs/plans/.gitkeep` | Create | Placeholder |
| `init.sh` | Create (new) | Interactive scaffold initialization script |
| `README.md` | Create (new) | Scaffold repo documentation |
| `LICENSE` | Create (new) | MIT License |
| `.gitignore` | Modify | Update for scaffold repo |
| Root `AGENTS.md` | Delete | Moved to templates/spec-center/ |
| Root `CLAUDE.md` | Delete | Moved to templates/spec-center/ |
| Root `conventions/` | Delete | Moved to templates/spec-center/ |
| Root `api/` | Delete | Moved to templates/spec-center/ |
| Root `errors/` | Delete | Moved to templates/spec-center/ |
| Root `events/` | Delete | Moved to templates/spec-center/ |
| Root `docs/specs/` | Delete | Moved to templates/spec-center/ |

---

### Task 1: Create Directory Structure and Copy Spec-Center Content

**Files:**
- Create: `templates/` directory tree
- Create: `.gitkeep` files in all empty directories
- Copy: Root content → `templates/spec-center/`

- [ ] **Step 1: Create all template directories**

```bash
mkdir -p templates/root
mkdir -p templates/spec-center/{conventions,api,docs/specs,errors,events}
mkdir -p templates/server/docs/{specs,plans}
mkdir -p templates/web/docs/{specs,plans}
mkdir -p templates/mobile/docs/{specs,plans}
mkdir -p templates/admin/docs/{specs,plans}
```

- [ ] **Step 2: Create .gitkeep files for empty directories**

```bash
touch templates/spec-center/api/.gitkeep
touch templates/spec-center/docs/specs/.gitkeep
touch templates/spec-center/events/.gitkeep
touch templates/server/docs/specs/.gitkeep
touch templates/server/docs/plans/.gitkeep
touch templates/web/docs/specs/.gitkeep
touch templates/web/docs/plans/.gitkeep
touch templates/mobile/docs/specs/.gitkeep
touch templates/mobile/docs/plans/.gitkeep
touch templates/admin/docs/specs/.gitkeep
touch templates/admin/docs/plans/.gitkeep
```

- [ ] **Step 3: Copy current spec-center content to templates/spec-center/**

```bash
cp AGENTS.md templates/spec-center/AGENTS.md
cp CLAUDE.md templates/spec-center/CLAUDE.md
cp -r conventions/ templates/spec-center/conventions/
cp errors/error-codes.md templates/spec-center/errors/error-codes.md
```

Note: `api/`, `events/`, `docs/specs/` at root are empty — already covered by `.gitkeep` files in Step 2.

- [ ] **Step 4: Verify directory structure**

```bash
find templates/ -type f | sort
```

Expected output (should include):
```
templates/admin/docs/plans/.gitkeep
templates/admin/docs/specs/.gitkeep
templates/mobile/docs/plans/.gitkeep
templates/mobile/docs/specs/.gitkeep
templates/server/docs/plans/.gitkeep
templates/server/docs/specs/.gitkeep
templates/spec-center/AGENTS.md
templates/spec-center/CLAUDE.md
templates/spec-center/api/.gitkeep
templates/spec-center/conventions/http-constitution.md
templates/spec-center/conventions/validation.md
templates/spec-center/docs/specs/.gitkeep
templates/spec-center/errors/error-codes.md
templates/spec-center/events/.gitkeep
templates/web/docs/plans/.gitkeep
templates/web/docs/specs/.gitkeep
```

- [ ] **Step 5: Commit**

```bash
git add templates/
git commit -m "refactor: create templates/ directory and copy spec-center content"
```

---

### Task 2: Generalize templates/spec-center/AGENTS.md

**Files:**
- Modify: `templates/spec-center/AGENTS.md`

This is the largest change. The entire file gets rewritten with `{{PROJECT}}` placeholders, updated architecture terminology, and removed business-specific content.

- [ ] **Step 1: Write the generalized AGENTS.md**

Replace the entire content of `templates/spec-center/AGENTS.md` with:

````markdown
# Spec Center (SSOT)

## Architecture

This project follows a **multi-repo workspace** architecture. Each module is an independent repository; all repositories coexist in a workspace directory for local development, sharing specs, contracts, and conventions through `spec-center`.

### Module Map

| Module | Role |
|---|---|
| `admin` | Admin manager application|
| `web` | Web application|
| `mobile` | Mobile application |
| `server` | Backend service implementation |
| `spec-center` | **Single Source of Truth (SSOT)** for cross-module contracts and constraints |

> **Adding a New Module**: When a new module directory is created, the following steps MUST be performed:
> 1. Add the new module entry to the **Module Map** table above (sorted alphabetically).
> 2. Add the module directory to the **Repository Structure** tree below, following the existing pattern (`AGENTS.md` + `docs/`).
> 3. Ensure the new module has its own `AGENTS.md` with Role, Mandatory Specs (relative links to {{PROJECT}}-spec-center), Key Responsibilities, Tech Stack, and Build & Test sections.

## Spec Center as SSOT

`{{PROJECT}}-spec-center` holds all **shared** specifications that govern inter-module collaboration:

- API interface specifications (endpoints, request/response schemas) → `api/openapi.yaml`
- Error format and error code registry → `errors/error-codes.md`
- Response envelope format
- Retry and backoff strategies
- Authentication and authorization contracts
- Shared domain vocabulary and event schemas
- Cross-module domain specs → `docs/specs/`
- Data format conventions (date, pagination, sorting, etc.)
- HTTP Constitution — 全局 HTTP/API 设计规范（[conventions/http-constitution.md](conventions/http-constitution.md)）
- Input Validation — 请求参数校验规范（[conventions/validation.md](conventions/validation.md)）
- Go Project Structure — Go 服务项目结构约定（[conventions/go-project.md](conventions/go-project.md)）

**Rule**: Any spec that affects two or more modules MUST live in `{{PROJECT}}-spec-center`. Any spec that only affects a single module MUST live in that module's own `docs/` directory.

## Development Paradigm: SDD + TDD

### Specification-Driven Development (SDD)

1. Write or update the relevant spec **first** (in `{{PROJECT}}-spec-center` for shared specs, or in the module's `docs/` for local specs).
2. Get spec reviewed and approved.
3. Implement against the spec.

### Test-Driven Development (TDD)

1. From the spec, write failing tests.
2. Write the minimum implementation to pass.
3. Refactor while keeping tests green.

**All code changes must trace back to a spec document.**

## Shared vs Module-Specific Specs

When working on a feature:

1. **Identify scope** - Does this touch shared contracts or only internal logic?
2. **Shared spec** -> Write/update in `{{PROJECT}}-spec-center/`.
3. **Module-specific spec** -> Write/update in the module's `docs/` directory.
4. **Cross-reference** - Module-specific specs must reference the shared specs they depend on. Use relative links like `[API Spec](../{{PROJECT}}-spec-center/conventions/xxx.md)`.
5. **docs/ sub-directories** - Each module's `docs/` MUST contain two sub-directories:
   - `docs/specs/` — 规格说明文档（数据模型、业务规则、接口定义、约束条件等，偏"是什么"）
   - `docs/plans/` — 实施方案文档（技术方案、架构设计、迁移计划、开发计划等，偏"怎么做"）

### Implementation Plans (Cross-Module Features)

Cross-module **specs** live in `{{PROJECT}}-spec-center/docs/specs/`; cross-module **plans** do **not**. Each implementing module gets its own plan under `<module>/docs/plans/`.

**Rule**: One plan per implementing module. Do **not** combine server + web (or other modules) into a single monolithic implementation plan.

| Document | Where | Example |
|---|---|---|
| Cross-module domain spec (what) | `{{PROJECT}}-spec-center/docs/specs/` | `2026-05-30-feature-design.md` |
| Server implementation plan (how) | `{{PROJECT}}-server/docs/plans/` | `2026-05-30-feature.md` |
| Web implementation plan (how) | `{{PROJECT}}-web/docs/plans/` | `2026-05-30-feature.md` |
| API / error-code contract updates | `{{PROJECT}}-spec-center/` (OpenAPI, error-codes) | Updated in spec or alongside server plan — **no** separate spec-center plan unless spec-center-only work |

**Plan structure:**

1. **Shared spec first** — Write and approve the cross-module spec in `{{PROJECT}}-spec-center` (API schemas, acceptance criteria, error codes).
2. **Split plans by module** — Create one plan per module that implements the feature. Use the same date + feature slug (e.g. `2026-05-30-feature.md`) for discoverability.
3. **Declare dependencies** — Each plan MUST link to the SSOT spec and, when applicable, state `Depends on: <other-module-plan>` (e.g. web plan depends on server plan).
4. **Execute in dependency order** — Typically `{{PROJECT}}-server` → `{{PROJECT}}-web` → `{{PROJECT}}-mobile`. A downstream plan MUST NOT assume upstream API changes exist until the upstream plan is merged or verified.
5. **No canonical plans in agent temp paths** — Module plans belong in `<module>/docs/plans/`, not in `docs/superpowers/plans/` or other agent-only directories. Agent-generated drafts may start elsewhere but MUST be moved to the module path before execution.

**When a single cross-module plan is acceptable (rare):** Only for small, atomic changes that must land in one PR and touch ≤2 modules with no meaningful dependency boundary (e.g. a one-field DTO addition + one UI column). Prefer split plans when in doubt.

**Example:**

```
{{PROJECT}}-spec-center/docs/specs/2026-05-30-feature-design.md   ← SSOT spec
{{PROJECT}}-server/docs/plans/2026-05-30-feature.md               ← schema, API, tests
{{PROJECT}}-web/docs/plans/2026-05-30-feature.md                  ← UI; Depends on server plan
```

### Spec Ownership Quick Reference

| What | Where |
|---|---|
| API endpoint definition | `{{PROJECT}}-spec-center/` |
| Cross-module domain spec | `{{PROJECT}}-spec-center/docs/specs/` |
| Cross-module implementation plan | **Split** — one plan per module in `<module>/docs/plans/` (see [Implementation Plans](#implementation-plans-cross-module-features)) |
| Error code and format | `{{PROJECT}}-spec-center/` |
| Response envelope | `{{PROJECT}}-spec-center/` |
| HTTP / API 设计规范（方法、状态码、响应结构、分页、时间等） | `{{PROJECT}}-spec-center/conventions/` |
| Go Project Structure — Go 服务项目结构约定 | `{{PROJECT}}-spec-center/conventions/go-project.md` |
| Retry / circuit-breaker policy | `{{PROJECT}}-spec-center/` |
| Internal data model (not exposed via API) | Module's `docs/` |
| Internal algorithm or business logic | Module's `docs/` |
| Module implementation plan | Module's `docs/plans/` |
| Module deployment / ops config | Module's `docs/` |

## Domain-Driven Design (DDD)

All modules follow DDD principles:

- **Aggregate Roots** must be clearly identified in both specs and code. Each bounded context has explicit aggregate roots.
- **Bounded Contexts** map to modules. Cross-context communication happens only through well-defined interfaces (as specified in `{{PROJECT}}-spec-center`).
- **Ubiquitous Language** is defined in `{{PROJECT}}-spec-center` and must be used consistently across all modules.

### Core Domain Concepts

<!-- Define project core domain concepts here (aggregate roots, value objects, etc.) -->

## Module Isolation

- Each module **MUST NOT** directly access another module's database, cache, or internal storage.
- Modules communicate **only** through documented APIs or message events defined in `{{PROJECT}}-spec-center`.
- No shared database. No cross-module queries. No direct RPC to internal modules.

## Conventions

### Conventional Commits

Strictly follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

Types: `feat`, `fix`, `docs`, `spec`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`

Use `spec` type for spec-only changes:

```
spec(api): add endpoint specification
```

### AGENTS.md Hierarchy

- `{{PROJECT}}-spec-center/AGENTS.md` (this file) - Global project rules and conventions.
- `<module>/AGENTS.md` - Module-specific conventions, tech stack, build/test commands, and local development notes.

When working in a module, **load both** this file and the module's own `AGENTS.md`.

### Spec Document Index (Mandatory Maintenance)

When a spec document is **added or updated**, the corresponding AGENTS.md **MUST** be updated with a reference entry. This ensures LLMs and developers can discover and understand all active specs without scanning the filesystem.

**Rule**: No spec document should exist without being referenced in an AGENTS.md.

**How**:

1. **`{{PROJECT}}-spec-center/AGENTS.md`** — Maintain the "Spec Center as SSOT" bullet list and Repository Structure tree with actual filenames and relative links. Every file under `{{PROJECT}}-spec-center/` must appear in at least one of these two places.
2. **`<module>/AGENTS.md`** — Maintain a "Mandatory Specs" section listing all spec-center documents the module depends on, with relative links.

**Why**: AGENTS.md is the entry point for context-loading. If a spec is not referenced here, it is effectively invisible to agents and risks being ignored or contradicted.

## Repository Structure

```
workspace/
├── AGENTS.md                     # Root reference → {{PROJECT}}-spec-center/AGENTS.md
├── {{PROJECT}}-spec-center/      # SSOT - shared specs and contracts
│   ├── AGENTS.md                 # This file - global project rules
│   ├── conventions/              # Shared conventions
│   │   ├── http-constitution.md  # HTTP/API 全局设计规范 (v1.0)
│   │   ├── validation.md         # Input validation 校验规范 (v1.0)
│   │   └── go-project.md         # Go project structure (v1.0)
│   ├── api/                      # API specifications (OpenAPI / endpoint specs)
│   │   └── .gitkeep
│   ├── docs/                     # Cross-module domain specifications
│   │   └── specs/                # Shared specs affecting 2+ modules
│   │       └── .gitkeep
│   ├── errors/                   # Error codes and formats
│   │   └── error-codes.md        # Business error code registry
│   └── events/                   # Inter-module event definitions
│       └── .gitkeep
├── {{PROJECT}}-server/           # Backend service
│   ├── AGENTS.md                 # Server-specific conventions
│   └── docs/
│       ├── specs/                # Server-specific specifications
│       │   └── .gitkeep
│       └── plans/                # Server-specific implementation plans
│           └── .gitkeep
├── {{PROJECT}}-web/              # Web application
│   ├── AGENTS.md                 # Web-specific conventions
│   └── docs/
│       ├── specs/                # Web-specific specifications
│       │   └── .gitkeep
│       └── plans/                # Web-specific implementation plans
│           └── .gitkeep
├── {{PROJECT}}-mobile/           # Mobile application
│   ├── AGENTS.md                 # Mobile-specific conventions
│   └── docs/
│       ├── specs/                # Mobile-specific specifications
│       │   └── .gitkeep
│       └── plans/                # Mobile-specific implementation plans
│           └── .gitkeep
└── {{PROJECT}}-admin/            # Admin manager application
    ├── AGENTS.md                 # Admin-specific conventions
    └── docs/
        ├── specs/                # Admin-specific specifications
        │   └── .gitkeep
        └── plans/                # Admin-specific implementation plans
            └── .gitkeep
```
````

- [ ] **Step 2: Verify no `deluxe-` references remain in the file**

```bash
grep -n "deluxe" templates/spec-center/AGENTS.md
```

Expected: No output (0 matches)

- [ ] **Step 3: Verify `{{PROJECT}}` placeholders are present**

```bash
grep -c "{{PROJECT}}" templates/spec-center/AGENTS.md
```

Expected: 30+ matches

- [ ] **Step 4: Verify business-specific content is removed**

```bash
grep -n -E "(Sales Order|Product / SKU|Customer|Inventory|Order Audit|OMS|前端 Client|后台管理系统|sales_ordering_system_prd)" templates/spec-center/AGENTS.md
```

Expected: No output (0 matches)

- [ ] **Step 5: Verify `monorepo` and `Monorepo` are gone**

```bash
grep -n -i "monorepo" templates/spec-center/AGENTS.md
```

Expected: No output (0 matches)

- [ ] **Step 6: Verify go-project.md reference is present**

```bash
grep -n "go-project.md" templates/spec-center/AGENTS.md
```

Expected: At least 2 matches (SSOT bullet list + Spec Ownership table)

- [ ] **Step 7: Commit**

```bash
git add templates/spec-center/AGENTS.md
git commit -m "refactor: generalize spec-center AGENTS.md with {{PROJECT}} placeholders"
```

---

### Task 3: Generalize templates/spec-center/conventions/http-constitution.md

**Files:**
- Modify: `templates/spec-center/conventions/http-constitution.md`

- [ ] **Step 1: Update core principle (line 160)**

Replace:
```
**核心原则（强制）：** 统一使用 Asia/Kuala_Lumpur (UTC+8) | API 使用 ISO 8601 | 数据库存 TIMESTAMPTZ | 严禁时区歧义
```
With:
```
**核心原则（强制）：** 统一使用 UTC | API 使用 ISO 8601 以 `Z` 结尾，推荐含毫秒 | 数据库存 TIMESTAMPTZ | 严禁时区歧义
```

- [ ] **Step 2: Update API time format (line 164)**

Replace:
```
格式：`YYYY-MM-DDTHH:mm:ss[.SSS]+08:00`，统一 UTC+8（`+08:00` 结尾），推荐含毫秒
```
With:
```
格式：`YYYY-MM-DDTHH:mm:ss[.SSS]Z`，统一 UTC（`Z` 结尾），推荐含毫秒
```

- [ ] **Step 3: Update example timestamp (line 166)**

Replace:
```
✅ `"createdAt": "2026-03-30T20:00:00.123+08:00"`
```
With:
```
✅ `"createdAt": "2026-03-30T20:00:00.123Z"`
```

- [ ] **Step 4: Update MySQL application layer note (line 191)**

Replace:
```
- 应用层使用 `pkg/timeutil.Now()`（UTC+8）、数据库连接 `SET TIMEZONE 'Asia/Kuala_Lumpur'`
```
With:
```
- 应用层使用 `time.Now().UTC()`、数据库连接 `SET TIMEZONE 'UTC'`
```

- [ ] **Step 5: Update time flow chain (line 204)**

Replace:
```
数据库(UTC+8 session) → 后端(UTC+8 via timeutil) → API(ISO 8601 +08:00) → 前端(直接使用)
```
With:
```
数据库(UTC session) → 后端(time.Now().UTC()) → API(ISO 8601 Z) → 前端(直接使用)
```

- [ ] **Step 6: Update request body time example (line 208)**

Replace:
```
必须：`"startAt": "2026-03-30T20:00:00+08:00"` ❌ `"2026-03-30 12:00:00"`
```
With:
```
必须：`"startAt": "2026-03-30T20:00:00Z"` ❌ `"2026-03-30 12:00:00"`
```

- [ ] **Step 7: Update prohibition list (line 222)**

Replace:
```
- ❌ API 返回不含时区偏移的时间（如裸 `Z` 或无偏移）
```
With:
```
- ❌ API 返回不含时区偏移的时间（如无偏移的 `2026-03-30T12:00:00`）
```

- [ ] **Step 8: Update one-liner spec (line 227)**

Replace:
```
**API：ISO 8601 +08:00（Asia/Kuala_Lumpur）** | **PostgreSQL：timestamptz + SET TIMEZONE 'Asia/Kuala_Lumpur'** | **MySQL：DATETIME(3) + 应用保证 UTC**
```
With:
```
**API：ISO 8601 Z（UTC）** | **PostgreSQL：timestamptz + SET TIMEZONE 'UTC'** | **MySQL：DATETIME(3) + 应用保证 UTC**
```

- [ ] **Step 9: Update closing paragraph (line 229)**

Replace:
```
> 所有时间字段统一使用 Asia/Kuala_Lumpur (UTC+8) 时区。PostgreSQL 使用 `TIMESTAMP WITH TIME ZONE` 并设置会话时区；API 层统一使用 ISO 8601 `+08:00` 格式。后端通过 `pkg/timeutil` 包统一管理时区。
```
With:
```
> 统一使用 UTC。PostgreSQL 使用 `TIMESTAMP WITH TIME ZONE` 并设置会话时区为 UTC；API 层统一使用 ISO 8601 `Z` 格式。
```

- [ ] **Step 10: Verify no Asia/Kuala_Lumpur or +08:00 references remain**

```bash
grep -n -E "(Asia/Kuala_Lumpur|\+08:00|UTC\+8|timeutil)" templates/spec-center/conventions/http-constitution.md
```

Expected: No output (0 matches)

- [ ] **Step 11: Verify UTC and Z references are present**

```bash
grep -n -E "(UTC|\.SSS\]Z)" templates/spec-center/conventions/http-constitution.md | head -20
```

Expected: Multiple matches showing UTC and Z format

- [ ] **Step 12: Commit**

```bash
git add templates/spec-center/conventions/http-constitution.md
git commit -m "refactor: update http-constitution.md to use UTC timezone"
```

---

### Task 4: Generalize templates/spec-center/errors/error-codes.md

**Files:**
- Modify: `templates/spec-center/errors/error-codes.md`

- [ ] **Step 1: Write the generalized error-codes.md**

Replace the entire content of `templates/spec-center/errors/error-codes.md` with:

```markdown
# Error Codes

All API errors use the `{code, message, details}` envelope. The `code` field is a business error code, distinct from the HTTP status code.

## Code Ranges

| Range       | Category    | HTTP Status Range |
| ----------- | ----------- | ----------------- |
| 1000-1999   | Parameter   | 400               |
| 2000-2999   | Auth        | 401, 403, 409, 429|
| 3000-3999   | Permission  | 403               |
| 4000-4999   | Business    | 400, 403, 404, 409|
| 5000+       | System      | 500               |

## Parameter Errors (1000-1999)

| Code | HTTP | Message | Trigger |
| ---- | ---- | ------- | ------- |
| 1001 | 400  | Parameter error | Request body, query params, or path params fail validation. The `details` field contains field-level error info. |

## Auth Errors (2000-2999)

<!-- Example entry — remove or replace with project-specific codes -->
| Code | HTTP | Message | Trigger |
| ---- | ---- | ------- | ------- |
| 2001 | 401 | Not authenticated | Missing or invalid `Authorization` header on a protected route. |

## Permission Errors (3000-3999)

<!-- Example entry — remove or replace with project-specific codes -->
| Code | HTTP | Message | Trigger |
| ---- | ---- | ------- | ------- |
| 3001 | 403 | Forbidden | User's role does not have access to the requested resource or action. |

## Business Errors (4000-4999)

### General

| Code | HTTP | Message | Trigger |
| ---- | ---- | ------- | ------- |
| 4001 | 400  | Business error | Generic business logic violation. Context-specific message provided. |

### Idempotency

| Code | HTTP | Message | Trigger |
| ---- | ---- | ------- | ------- |
| 4090 | 409  | Idempotency key conflict — request in progress | A request with the same idempotency key is already being processed, or the key was reused with a different request body. |
| 4091 | 400  | Invalid idempotency key format | The `Idempotency-Key` header value is not a valid UUID. |

## System Errors (5000+)

| Code | HTTP | Message | Trigger |
| ---- | ---- | ------- | ------- |
| 5001 | 500  | System error | Unexpected server error. Check server logs for details. |

## Success Code

Successful responses use `code: 0` with `message: "ok"`.

```json
{
  "code": 0,
  "message": "ok",
  "data": { ... }
}
```
```

- [ ] **Step 2: Verify removed business-specific codes are gone**

```bash
grep -n -E "^\\| (2002|2003|2004|2005|2006|2007|2008|2009|2010|2011|3002|3003)" templates/spec-center/errors/error-codes.md
```

Expected: No output (0 matches)

- [ ] **Step 3: Verify retained codes are present**

```bash
grep -n -E "^\\| (0|1001|2001|3001|4001|4090|4091|5001)" templates/spec-center/errors/error-codes.md
```

Expected: One match per code (7 matches for codes, plus the success code entry)

- [ ] **Step 4: Verify example markers are present**

```bash
grep -n "Example entry" templates/spec-center/errors/error-codes.md
```

Expected: 2 matches (Auth Errors and Permission Errors sections)

- [ ] **Step 5: Commit**

```bash
git add templates/spec-center/errors/error-codes.md
git commit -m "refactor: generalize error-codes.md, remove business-specific codes"
```

---

### Task 5: Create templates/spec-center/conventions/go-project.md

**Files:**
- Create: `templates/spec-center/conventions/go-project.md`

- [ ] **Step 1: Write go-project.md**

````markdown
# Go Project Structure Convention v1.0

> 适用：所有 Go 后端服务 | 目标：统一项目结构，降低跨项目理解成本

## 目录结构

```
{{PROJECT}}-server/
├── cmd/
│   └── server/
│       └── main.go
├── internal/
│   ├── config/
│   │   └── config.go
│   ├── server/
│   │   ├── server.go
│   │   └── routes.go
│   ├── handler/
│   │   └── *.go
│   ├── middleware/
│   │   ├── auth.go
│   │   ├── logger.go
│   │   └── recovery.go
│   ├── repository/
│   │   └── *.go
│   ├── service/
│   │   └── *.go
│   └── model/
│       └── *.go
├── pkg/
│   ├── apperror/
│   │   └── error.go
│   ├── response/
│   │   └── response.go
│   ├── database/
│   │   └── postgres.go
│   └── validator/
│       └── validator.go
├── migrations/
├── docs/
│   ├── specs/
│   └── plans/
├── Makefile
├── .env.example
├── .gitignore
├── AGENTS.md
└── CLAUDE.md
```

## `internal/` vs `pkg/` 区分原则

| 位置 | 规则 | 示例 |
|------|------|------|
| `pkg/` | 可被其他 Go 项目引用，API 必须稳定 | apperror、response、database、validator |
| `internal/` | 当前项目专属，不可外部引用 | config、server、handler、middleware、repository、service、model |

判断标准：如果这个包在另一个 Go 服务中可以直接 `import` 使用，放 `pkg/`；如果包含项目特定类型或常量，放 `internal/`。

## Server 生命周期

`internal/server/server.go` 定义 Server 结构体：

- `New(cfg, db)` — 构造函数，接收依赖，内部调用 `registerRoutes()`
- `Start(addr)` — 启动 HTTP 服务，支持 graceful shutdown
- `Shutdown(ctx)` — 信号中断时优雅关闭连接

`cmd/server/main.go` 职责：加载配置 → 初始化数据库 → 构建 Server → 监听信号 → Start。

## Router 注册

`internal/server/routes.go` 集中管理所有路由：

- 按领域分组，带注释
- Middleware 按层级应用：全局 > 路由组 > 单路由
- API 版本前缀 `/v1`
- Health check 路由在版本前缀外

## 分层架构

| 层 | 职责 | 可调用 |
|---|---|---|
| Handler | HTTP 请求解析、参数校验、响应序列化 | Service |
| Service | 业务逻辑编排、事务管理 | Repository |
| Repository | SQL 查询、数据映射 | Database |

禁止跨层调用：Handler 不直接访问 Repository。
````

- [ ] **Step 2: Verify file exists and has content**

```bash
wc -l templates/spec-center/conventions/go-project.md
```

Expected: 60+ lines

- [ ] **Step 3: Commit**

```bash
git add templates/spec-center/conventions/go-project.md
git commit -m "feat: add Go project structure convention (go-project.md)"
```

---

### Task 6: Create Module Shared Files (.gitignore, .env.example, Makefile)

**Files:**
- Create: `templates/spec-center/.gitignore`
- Create: `templates/server/.gitignore`
- Create: `templates/server/.env.example`
- Create: `templates/server/Makefile`
- Create: `templates/web/.gitignore`
- Create: `templates/web/.env.example`
- Create: `templates/web/Makefile`
- Create: `templates/mobile/.gitignore`
- Create: `templates/mobile/.env.example`
- Create: `templates/mobile/Makefile`
- Create: `templates/admin/.gitignore`
- Create: `templates/admin/.env.example`
- Create: `templates/admin/Makefile`

The `.gitignore`, `.env.example`, and `Makefile` content is identical across all modules (spec-center also uses the same .gitignore).

- [ ] **Step 1: Write the universal .gitignore for spec-center**

Content of `templates/spec-center/.gitignore`:

```gitignore
# IDE
.idea/
.vscode/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Project
/tmp/
.worktrees/
.superpowers/

# Environment
.env
.env.local
.env.*.local

# Build output
/dist/
/build/
/output/
/bin/

# Dependencies (add framework-specific entries as needed)
# /node_modules/
# /vendor/

# Coverage
/coverage/

# Logs
*.log
```

- [ ] **Step 2: Write .gitignore, .env.example, Makefile for server**

Content of `templates/server/.gitignore` — identical to Step 1 (same universal .gitignore).

Content of `templates/server/.env.example`:

```
# Application
APP_ENV=development
PORT=8080

# Add module-specific environment variables below
# DATABASE_URL=
# API_BASE_URL=
# REDIS_URL=
```

Content of `templates/server/Makefile`:

```makefile
ifneq (,$(wildcard .env))
    include .env
    export
endif

.PHONY: help install dev build test lint clean

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

install: ## Install dependencies
	@echo "TODO: define install command"

dev: ## Start dev server
	@echo "TODO: define dev command"

build: ## Build for production
	@echo "TODO: define build command"

test: ## Run tests
	@echo "TODO: define test command"

lint: ## Run linter
	@echo "TODO: define lint command"

clean: ## Clean build artifacts
	@echo "TODO: define clean command"
```

**IMPORTANT**: The Makefile uses TAB characters for recipe lines. Ensure the file uses real tabs, not spaces.

- [ ] **Step 3: Write .gitignore, .env.example, Makefile for web**

Content of `templates/web/.gitignore` — identical to Step 1.
Content of `templates/web/.env.example` — identical to server's .env.example.
Content of `templates/web/Makefile` — identical to server's Makefile.

```bash
cp templates/server/.gitignore templates/web/.gitignore
cp templates/server/.env.example templates/web/.env.example
cp templates/server/Makefile templates/web/Makefile
```

- [ ] **Step 4: Write .gitignore, .env.example, Makefile for mobile**

```bash
cp templates/server/.gitignore templates/mobile/.gitignore
cp templates/server/.env.example templates/mobile/.env.example
cp templates/server/Makefile templates/mobile/Makefile
```

- [ ] **Step 5: Write .gitignore, .env.example, Makefile for admin**

```bash
cp templates/server/.gitignore templates/admin/.gitignore
cp templates/server/.env.example templates/admin/.env.example
cp templates/server/Makefile templates/admin/Makefile
```

- [ ] **Step 6: Verify all files exist**

```bash
for module in spec-center server web mobile admin; do
  echo "=== $module ==="
  ls -la templates/$module/.gitignore 2>/dev/null || echo "MISSING: .gitignore"
  if [ "$module" != "spec-center" ]; then
    ls -la templates/$module/.env.example 2>/dev/null || echo "MISSING: .env.example"
    ls -la templates/$module/Makefile 2>/dev/null || echo "MISSING: Makefile"
  fi
done
```

Expected: All files present. spec-center should NOT have .env.example or Makefile.

- [ ] **Step 7: Commit**

```bash
git add templates/spec-center/.gitignore templates/server/.gitignore templates/server/.env.example templates/server/Makefile templates/web/.gitignore templates/web/.env.example templates/web/Makefile templates/mobile/.gitignore templates/mobile/.env.example templates/mobile/Makefile templates/admin/.gitignore templates/admin/.env.example templates/admin/Makefile
git commit -m "feat: add universal .gitignore, .env.example, and Makefile templates"
```

---

### Task 7: Create templates/root/ Files

**Files:**
- Create: `templates/root/AGENTS.md`
- Create: `templates/root/CLAUDE.md`

- [ ] **Step 1: Write templates/root/AGENTS.md**

Content of `templates/root/AGENTS.md`:

```markdown
# {{PROJECT}} Workspace

→ See [{{PROJECT}}-spec-center/AGENTS.md]({{PROJECT}}-spec-center/AGENTS.md) for full project rules and conventions.
```

- [ ] **Step 2: Write templates/root/CLAUDE.md**

Content of `templates/root/CLAUDE.md`:

```
@AGENTS.md
```

- [ ] **Step 3: Verify files**

```bash
cat templates/root/AGENTS.md
cat templates/root/CLAUDE.md
```

Expected: Content matches Step 1 and Step 2.

- [ ] **Step 4: Commit**

```bash
git add templates/root/
git commit -m "feat: add root workspace template"
```

---

### Task 8: Create Module AGENTS.md and CLAUDE.md Templates

**Files:**
- Create: `templates/server/AGENTS.md`
- Create: `templates/server/CLAUDE.md`
- Create: `templates/web/AGENTS.md`
- Create: `templates/web/CLAUDE.md`
- Create: `templates/mobile/AGENTS.md`
- Create: `templates/mobile/CLAUDE.md`
- Create: `templates/admin/AGENTS.md`
- Create: `templates/admin/CLAUDE.md`

Each module's AGENTS.md has the same structure but different Role. All CLAUDE.md files are identical (`@AGENTS.md`).

- [ ] **Step 1: Write templates/server/AGENTS.md**

```markdown
# {{PROJECT}}-server

## Role
Backend service implementation

## Mandatory Specs
- [HTTP Constitution](../{{PROJECT}}-spec-center/conventions/http-constitution.md)
- [Input Validation](../{{PROJECT}}-spec-center/conventions/validation.md)
- [Error Codes](../{{PROJECT}}-spec-center/errors/error-codes.md)
- [Go Project Structure](../{{PROJECT}}-spec-center/conventions/go-project.md)

## Key Responsibilities
<!-- Define module-specific responsibilities here -->

## Tech Stack
<!-- Define technology choices here: language, framework, database, etc. -->

## Build & Test
<!-- Define build, test, lint commands here -->
```

- [ ] **Step 2: Write templates/server/CLAUDE.md**

```
@AGENTS.md
```

- [ ] **Step 3: Write templates/web/AGENTS.md**

```markdown
# {{PROJECT}}-web

## Role
Web application

## Mandatory Specs
- [HTTP Constitution](../{{PROJECT}}-spec-center/conventions/http-constitution.md)
- [Input Validation](../{{PROJECT}}-spec-center/conventions/validation.md)
- [Error Codes](../{{PROJECT}}-spec-center/errors/error-codes.md)
- [Go Project Structure](../{{PROJECT}}-spec-center/conventions/go-project.md)

## Key Responsibilities
<!-- Define module-specific responsibilities here -->

## Tech Stack
<!-- Define technology choices here: language, framework, database, etc. -->

## Build & Test
<!-- Define build, test, lint commands here -->
```

- [ ] **Step 4: Write templates/web/CLAUDE.md**

```
@AGENTS.md
```

- [ ] **Step 5: Write templates/mobile/AGENTS.md**

```markdown
# {{PROJECT}}-mobile

## Role
Mobile application

## Mandatory Specs
- [HTTP Constitution](../{{PROJECT}}-spec-center/conventions/http-constitution.md)
- [Input Validation](../{{PROJECT}}-spec-center/conventions/validation.md)
- [Error Codes](../{{PROJECT}}-spec-center/errors/error-codes.md)
- [Go Project Structure](../{{PROJECT}}-spec-center/conventions/go-project.md)

## Key Responsibilities
<!-- Define module-specific responsibilities here -->

## Tech Stack
<!-- Define technology choices here: language, framework, database, etc. -->

## Build & Test
<!-- Define build, test, lint commands here -->
```

- [ ] **Step 6: Write templates/mobile/CLAUDE.md**

```
@AGENTS.md
```

- [ ] **Step 7: Write templates/admin/AGENTS.md**

```markdown
# {{PROJECT}}-admin

## Role
Admin manager application

## Mandatory Specs
- [HTTP Constitution](../{{PROJECT}}-spec-center/conventions/http-constitution.md)
- [Input Validation](../{{PROJECT}}-spec-center/conventions/validation.md)
- [Error Codes](../{{PROJECT}}-spec-center/errors/error-codes.md)
- [Go Project Structure](../{{PROJECT}}-spec-center/conventions/go-project.md)

## Key Responsibilities
<!-- Define module-specific responsibilities here -->

## Tech Stack
<!-- Define technology choices here: language, framework, database, etc. -->

## Build & Test
<!-- Define build, test, lint commands here -->
```

- [ ] **Step 8: Write templates/admin/CLAUDE.md**

```
@AGENTS.md
```

- [ ] **Step 9: Verify all CLAUDE.md files are identical**

```bash
diff templates/server/CLAUDE.md templates/web/CLAUDE.md && \
diff templates/server/CLAUDE.md templates/mobile/CLAUDE.md && \
diff templates/server/CLAUDE.md templates/admin/CLAUDE.md && \
echo "All CLAUDE.md files are identical"
```

Expected: "All CLAUDE.md files are identical"

- [ ] **Step 10: Verify each AGENTS.md has correct Role**

```bash
for module in server web mobile admin; do
  role=$(grep "^## Role" templates/$module/AGENTS.md -A1 | tail -1)
  echo "$module: $role"
done
```

Expected:
```
server: Backend service implementation
web: Web application
mobile: Mobile application
admin: Admin manager application
```

- [ ] **Step 11: Commit**

```bash
git add templates/server/AGENTS.md templates/server/CLAUDE.md templates/web/AGENTS.md templates/web/CLAUDE.md templates/mobile/AGENTS.md templates/mobile/CLAUDE.md templates/admin/AGENTS.md templates/admin/CLAUDE.md
git commit -m "feat: add module AGENTS.md and CLAUDE.md templates"
```

---

### Task 9: Create init.sh

**Files:**
- Create: `init.sh`

- [ ] **Step 1: Write init.sh**

```bash
#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# spec-center-template init.sh
# Interactive scaffold for creating multi-repo workspaces
# =============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEMPLATES_DIR="$SCRIPT_DIR/templates"

# ---------------------------------------------------------------------------
# Colors
# ---------------------------------------------------------------------------
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

info()  { echo -e "${CYAN}[INFO]${NC} $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*" >&2; }
success() { echo -e "${GREEN}[OK]${NC} $*"; }

# ---------------------------------------------------------------------------
# Defaults
# ---------------------------------------------------------------------------
PROJECT_NAME=""
TARGET_DIR=""
MODULES=""
DRY_RUN=false

ALL_MODULES=("spec-center" "server" "web" "mobile" "admin")
DEFAULT_MODULES=("spec-center" "server")

# ---------------------------------------------------------------------------
# Usage
# ---------------------------------------------------------------------------
usage() {
    cat <<EOF
Usage: $(basename "$0") [OPTIONS]

Initialize a multi-repo workspace from scaffold templates.

Options:
  -n, --name      Project name (skip interactive prompt)
  -d, --dir       Target directory (default: ./{name}-workspace)
  -m, --modules   Comma-separated modules (skip interactive selection)
  --dry-run       Show what would be created without writing anything
  -h, --help      Show this help

Examples:
  ./init.sh
  ./init.sh -n acme -d ~/projects/acme -m spec-center,server,web
  ./init.sh --dry-run -n myapp
EOF
    exit 0
}

# ---------------------------------------------------------------------------
# Argument parsing
# ---------------------------------------------------------------------------
parse_args() {
    while [[ $# -gt 0 ]]; do
        case "$1" in
            -n|--name)
                PROJECT_NAME="$2"
                shift 2
                ;;
            -d|--dir)
                TARGET_DIR="$2"
                shift 2
                ;;
            -m|--modules)
                MODULES="$2"
                shift 2
                ;;
            --dry-run)
                DRY_RUN=true
                shift
                ;;
            -h|--help)
                usage
                ;;
            *)
                error "Unknown option: $1"
                usage
                ;;
        esac
    done
}

# ---------------------------------------------------------------------------
# Validation
# ---------------------------------------------------------------------------
validate_project_name() {
    local name="$1"
    if [[ ! "$name" =~ ^[a-z][a-z0-9]*(-[a-z0-9]+)*$ ]]; then
        error "Invalid project name: '$name'"
        echo "  Must match: ^[a-z][a-z0-9]*(-[a-z0-9]+)*\$"
        echo "  - Start with lowercase letter"
        echo "  - Only lowercase letters, digits, and hyphens"
        echo "  - No trailing hyphen"
        echo "  - Length 2-50 characters"
        exit 1
    fi
    if [[ ${#name} -lt 2 || ${#name} -gt 50 ]]; then
        error "Project name must be 2-50 characters, got: ${#name}"
        exit 1
    fi
}

validate_module() {
    local mod="$1"
    local found=false
    for m in "${ALL_MODULES[@]}"; do
        if [[ "$m" == "$mod" ]]; then
            found=true
            break
        fi
    done
    if [[ "$found" == false ]]; then
        error "Unknown module: '$mod'. Available: ${ALL_MODULES[*]}"
        exit 1
    fi
}

# ---------------------------------------------------------------------------
# Interactive prompts
# ---------------------------------------------------------------------------
prompt_project_name() {
    echo ""
    info "Project name is used as prefix for all repositories."
    echo "  Example: 'acme' creates acme-spec-center/, acme-server/, etc."
    echo ""
    while true; do
        read -rp "Project name: " PROJECT_NAME
        if [[ -z "$PROJECT_NAME" ]]; then
            warn "Project name is required."
            continue
        fi
        if validate_project_name "$PROJECT_NAME"; then
            break
        fi
    done
}

prompt_target_dir() {
    local default="./${PROJECT_NAME}-workspace"
    echo ""
    read -rp "Target directory [${default}]: " input
    TARGET_DIR="${input:-$default}"
}

prompt_modules() {
    echo ""
    info "Select modules to include:"
    echo "  spec-center and server are always included."
    echo ""
    echo "  Available optional modules:"
    echo "    1) web"
    echo "    2) mobile"
    echo "    3) admin"
    echo ""
    read -rp "Enter numbers, comma-separated (e.g. 1,3) or 'all' [none]: " selection

    local selected=("${DEFAULT_MODULES[@]}")

    if [[ -z "$selection" ]]; then
        MODULES="$(IFS=,; echo "${selected[*]}")"
        return
    fi

    if [[ "$selection" == "all" ]]; then
        MODULES="$(IFS=,; echo "${ALL_MODULES[*]}")"
        return
    fi

    IFS=',' read -ra choices <<< "$selection"
    for choice in "${choices[@]}"; do
        choice="$(echo "$choice" | tr -d '[:space:]')"
        case "$choice" in
            1) selected+=("web") ;;
            2) selected+=("mobile") ;;
            3) selected+=("admin") ;;
            *) warn "Skipping unknown selection: $choice" ;;
        esac
    done

    # Remove duplicates while preserving order
    local seen=()
    local unique=()
    for item in "${selected[@]}"; do
        if [[ ! " ${seen[*]} " =~ " ${item} " ]]; then
            seen+=("$item")
            unique+=("$item")
        fi
    done

    MODULES="$(IFS=,; echo "${unique[*]}")"
}

# ---------------------------------------------------------------------------
# Dry run
# ---------------------------------------------------------------------------
dry_run() {
    echo ""
    info "=== DRY RUN — nothing will be written ==="
    echo ""
    echo "Project name : $PROJECT_NAME"
    echo "Target dir   : $TARGET_DIR"
    echo "Modules      : $MODULES"
    echo ""
    echo "Would create:"
    echo "  $TARGET_DIR/                          (workspace root, NOT a git repo)"
    echo "  $TARGET_DIR/AGENTS.md"
    echo "  $TARGET_DIR/CLAUDE.md"

    IFS=',' read -ra mods <<< "$MODULES"
    for mod in "${mods[@]}"; do
        mod="$(echo "$mod" | tr -d '[:space:]')"
        local dir_name="${PROJECT_NAME}-${mod}"
        echo ""
        echo "  $TARGET_DIR/$dir_name/               (git repo: $dir_name)"
        find "$TEMPLATES_DIR/$mod" -type f 2>/dev/null | while read -r f; do
            local rel="${f#$TEMPLATES_DIR/$mod/}"
            echo "    $dir_name/$rel"
        done
    done
    echo ""
    info "=== END DRY RUN ==="
}

# ---------------------------------------------------------------------------
# Scaffold execution
# ---------------------------------------------------------------------------
replace_placeholders() {
    local dir="$1"
    # Cross-platform sed: use -i.bak then delete .bak files
    find "$dir" -type f -exec sed -i.bak "s/{{PROJECT}}/$PROJECT_NAME/g" {} +
    find "$dir" -name '*.bak' -delete
}

init_module() {
    local mod="$1"
    local mod_dir="$TARGET_DIR/${PROJECT_NAME}-${mod}"
    local template_dir="$TEMPLATES_DIR/$mod"

    if [[ ! -d "$template_dir" ]]; then
        error "Template directory not found: $template_dir"
        return 1
    fi

    info "Creating ${PROJECT_NAME}-${mod}/ ..."
    mkdir -p "$mod_dir"
    cp -r "$template_dir/." "$mod_dir/"
    replace_placeholders "$mod_dir"

    # Initialize git repo
    (
        cd "$mod_dir"
        git init
        git branch -M main
        git add .
        git commit -m "chore: initialize $mod from scaffold"
    )

    success "Created ${PROJECT_NAME}-${mod}/"
}

init_root() {
    local template_dir="$TEMPLATES_DIR/root"

    info "Creating workspace root files ..."
    cp -r "$template_dir/." "$TARGET_DIR/"
    replace_placeholders "$TARGET_DIR"
    success "Created workspace root files"
}

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
main() {
    parse_args "$@"

    # Ensure templates directory exists
    if [[ ! -d "$TEMPLATES_DIR" ]]; then
        error "Templates directory not found: $TEMPLATES_DIR"
        error "Ensure you are running init.sh from the scaffold repo root."
        exit 1
    fi

    # Interactive prompts for missing values
    if [[ -z "$PROJECT_NAME" ]]; then
        prompt_project_name
    else
        validate_project_name "$PROJECT_NAME"
    fi

    if [[ -z "$TARGET_DIR" ]]; then
        prompt_target_dir
    fi

    if [[ -z "$MODULES" ]]; then
        prompt_modules
    else
        # Validate provided modules
        IFS=',' read -ra mods <<< "$MODULES"
        for mod in "${mods[@]}"; do
            mod="$(echo "$mod" | tr -d '[:space:]')"
            validate_module "$mod"
        done
        # Ensure spec-center and server are always included
        local has_spec=false has_server=false
        for mod in "${mods[@]}"; do
            mod="$(echo "$mod" | tr -d '[:space:]')"
            [[ "$mod" == "spec-center" ]] && has_spec=true
            [[ "$mod" == "server" ]] && has_server=true
        done
        if [[ "$has_spec" == false ]]; then
            MODULES="spec-center,$MODULES"
        fi
        if [[ "$has_server" == false ]]; then
            MODULES="server,$MODULES"
        fi
    fi

    # Dry run
    if [[ "$DRY_RUN" == true ]]; then
        dry_run
        exit 0
    fi

    # Check target directory
    if [[ -d "$TARGET_DIR" ]]; then
        warn "Target directory already exists: $TARGET_DIR"
        read -rp "Continue? Files may be overwritten. [y/N]: " confirm
        if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
            info "Aborted."
            exit 0
        fi
    fi

    # Create workspace
    mkdir -p "$TARGET_DIR"
    info "Creating workspace at $TARGET_DIR"
    echo ""

    # Init root files (AGENTS.md, CLAUDE.md at workspace root)
    init_root
    echo ""

    # Init each module
    IFS=',' read -ra mods <<< "$MODULES"
    for mod in "${mods[@]}"; do
        mod="$(echo "$mod" | tr -d '[:space:]')"
        init_module "$mod"
    done

    # Summary
    echo ""
    echo "=========================================="
    success "Workspace created successfully!"
    echo "=========================================="
    echo ""
    echo "  Location : $TARGET_DIR"
    echo "  Project  : $PROJECT_NAME"
    echo "  Modules  :"
    for mod in "${mods[@]}"; do
        mod="$(echo "$mod" | tr -d '[:space:]')"
        echo "              ${PROJECT_NAME}-${mod}/"
    done
    echo ""
    info "Next steps:"
    echo "  1. cd $TARGET_DIR"
    echo "  2. Review and customize each module's AGENTS.md"
    echo "  3. Define tech stack and build commands per module"
    echo ""
}

main "$@"
```

- [ ] **Step 2: Make init.sh executable**

```bash
chmod +x init.sh
```

- [ ] **Step 3: Verify bash syntax**

```bash
bash -n init.sh
```

Expected: No output (syntax OK)

- [ ] **Step 4: Verify help output**

```bash
./init.sh --help
```

Expected: Usage text with Options and Examples

- [ ] **Step 5: Test dry-run mode**

```bash
./init.sh --dry-run -n acme -d /tmp/test-acme-workspace -m spec-center,server,web
```

Expected: Shows directory tree that would be created, ending with "END DRY RUN". Does NOT create any files.

- [ ] **Step 6: Test invalid project name**

```bash
./init.sh --dry-run -n "Invalid_Name" 2>&1
```

Expected: Error message "Invalid project name: 'Invalid_Name'" and exit code non-zero.

- [ ] **Step 7: Test that spec-center and server are always included**

```bash
./init.sh --dry-run -n testproj -m web
```

Expected: Module list should include spec-center, server, AND web (spec-center and server auto-added).

- [ ] **Step 8: Commit**

```bash
git add init.sh
git commit -m "feat: add init.sh scaffold initialization script"
```

---

### Task 10: Create Scaffold Repo Root Files

**Files:**
- Create: `README.md`
- Create: `LICENSE`

- [ ] **Step 1: Write README.md**

````markdown
# Spec Center Template

Universal scaffold for multi-repo workspace projects. Generates independent Git repositories (spec-center, server, web, mobile, admin) that share conventions through a single source of truth.

## Quick Start

```bash
./init.sh
```

Follow the interactive prompts to name your project and select modules.

## Non-interactive Usage

```bash
# Create workspace with specific modules
./init.sh -n acme -d ~/projects/acme -m spec-center,server,web

# Preview without writing files
./init.sh --dry-run -n myapp
```

## What Gets Generated

`init.sh` creates a workspace directory containing independent Git repos:

```
my-project-workspace/
├── AGENTS.md                  → Points to spec-center AGENTS.md
├── CLAUDE.md                  → Points to AGENTS.md
├── my-project-spec-center/    → SSOT repo (specs, conventions, error codes)
├── my-project-server/         → Backend service repo
├── my-project-web/            → Web application repo
├── my-project-mobile/         → Mobile application repo
└── my-project-admin/          → Admin panel repo
```

Each repo is initialized with:
- `AGENTS.md` — Module role, mandatory specs, tech stack placeholders
- `CLAUDE.md` — Points to AGENTS.md
- `.gitignore` — Universal IDE/OS/env/build entries
- `Makefile` — Build task skeleton (help/install/dev/build/test/lint/clean)
- `.env.example` — Environment variable skeleton
- `docs/specs/` and `docs/plans/` — Documentation directories

The spec-center repo also includes:
- HTTP API convention (`conventions/http-constitution.md`)
- Input validation convention (`conventions/validation.md`)
- Go project structure convention (`conventions/go-project.md`)
- Error code registry (`errors/error-codes.md`)

## Design Principles

- **Multi-repo, not monorepo** — Each module is an independent Git repository
- **SSOT via spec-center** — All cross-module contracts live in one place
- **No tech stack presets** — Makefile and .env.example provide skeletons only
- **SDD + TDD** — Specification-Driven and Test-Driven Development

## Module Selection

| Module | Always Included | Description |
|--------|----------------|-------------|
| spec-center | ✅ | Shared specs and conventions (SSOT) |
| server | ✅ | Backend service |
| web | Optional | Web application |
| mobile | Optional | Mobile application |
| admin | Optional | Admin manager application |

## Options

```
./init.sh [OPTIONS]

Options:
  -n, --name      Project name (skip interactive prompt)
  -d, --dir       Target directory (default: ./{name}-workspace)
  -m, --modules   Comma-separated modules (skip interactive selection)
  --dry-run       Show what would be created without writing anything
  -h, --help      Show help
```

## Project Name Rules

- Start with lowercase letter
- Only lowercase letters, digits, and hyphens
- No trailing hyphen
- 2-50 characters
- Pattern: `^[a-z][a-z0-9]*(-[a-z0-9]+)*$`
````

- [ ] **Step 2: Write LICENSE (MIT)**

```
MIT License

Copyright (c) 2026

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

- [ ] **Step 3: Commit**

```bash
git add README.md LICENSE
git commit -m "docs: add scaffold README and MIT LICENSE"
```

---

### Task 11: Update Scaffold Repo .gitignore and Clean Up Old Root Files

**Files:**
- Modify: `.gitignore`
- Delete: Root `AGENTS.md`
- Delete: Root `CLAUDE.md`
- Delete: Root `conventions/` directory
- Delete: Root `api/` directory
- Delete: Root `errors/` directory
- Delete: Root `events/` directory
- Delete: Root `docs/specs/` directory (empty, spec-center content moved to templates/)

- [ ] **Step 1: Update .gitignore for scaffold repo**

Replace the entire content of `.gitignore` with:

```gitignore
# IDE
.idea/
.vscode/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Project
.worktrees/
.superpowers/
```

- [ ] **Step 2: Remove old root-level spec-center files**

These files have been copied into `templates/spec-center/` and are no longer needed at root:

```bash
git rm AGENTS.md CLAUDE.md
git rm -r conventions/ api/ errors/ events/
```

- [ ] **Step 3: Remove empty docs/specs/ at root**

The `docs/specs/` directory was part of the spec-center module content. The scaffold repo only needs `docs/superpowers/`:

```bash
rmdir docs/specs 2>/dev/null || true
```

Note: If `docs/specs/` is not empty, investigate before removing. It should be empty based on current state.

- [ ] **Step 4: Verify final root directory structure**

```bash
ls -la
```

Expected root files:
```
.gitignore
LICENSE
README.md
docs/
init.sh
templates/
```

NO `AGENTS.md`, `CLAUDE.md`, `conventions/`, `api/`, `errors/`, `events/` at root.

- [ ] **Step 5: Verify templates/ is complete**

```bash
find templates/ -type f | sort
```

Expected: 36+ files matching the spec's directory structure.

- [ ] **Step 6: Commit**

```bash
git add .gitignore
git add -u  # Stage deletions
git commit -m "chore: update scaffold .gitignore, remove moved spec-center root files"
```

---

### Task 12: Final End-to-End Verification

- [ ] **Step 1: Verify no `deluxe-` references remain in templates/**

```bash
grep -r "deluxe" templates/
```

Expected: No output (0 matches)

- [ ] **Step 2: Verify no business-specific content remains**

```bash
grep -r -E "(Sales Order|Product / SKU|Customer|Inventory|Order Audit|OMS|前端 Client|后台管理系统|sales_ordering_system_prd)" templates/
```

Expected: No output (0 matches)

- [ ] **Step 3: Verify no `monorepo` or `Asia/Kuala_Lumpur` in templates/**

```bash
grep -r -i "monorepo" templates/
grep -r "Asia/Kuala_Lumpur" templates/
grep -r "+08:00" templates/
```

Expected: No output for all three commands.

- [ ] **Step 4: Verify all {{PROJECT}} placeholders exist**

```bash
grep -r "{{PROJECT}}" templates/ | wc -l
```

Expected: 40+ matches across all template files.

- [ ] **Step 5: Run init.sh full integration test**

```bash
rm -rf /tmp/scaffold-test && ./init.sh -n testproj -d /tmp/scaffold-test -m spec-center,server,web
```

Expected: Creates workspace with 3 modules, each with git repo.

- [ ] **Step 6: Verify integration test output**

```bash
ls /tmp/scaffold-test/
```

Expected:
```
AGENTS.md
CLAUDE.md
testproj-spec-center/
testproj-server/
testproj-web/
```

- [ ] **Step 7: Verify placeholder replacement worked**

```bash
grep -r "{{PROJECT}}" /tmp/scaffold-test/ 2>/dev/null
```

Expected: No output (all `{{PROJECT}}` replaced with `testproj`).

- [ ] **Step 8: Verify project name in generated files**

```bash
head -5 /tmp/scaffold-test/testproj-spec-center/AGENTS.md
head -3 /tmp/scaffold-test/testproj-server/AGENTS.md
head -3 /tmp/scaffold-test/AGENTS.md
```

Expected: All show `testproj-` prefix, no `{{PROJECT}}` or `deluxe-`.

- [ ] **Step 9: Verify git repos were initialized**

```bash
for dir in /tmp/scaffold-test/testproj-*/; do
  echo "$(basename $dir): $(cd $dir && git log --oneline -1)"
done
```

Expected: Each module has one commit: "chore: initialize <module> from scaffold"

- [ ] **Step 10: Verify workspace root is NOT a git repo**

```bash
ls /tmp/scaffold-test/.git 2>&1
```

Expected: "No such file or directory" (workspace root is just a directory, not a git repo).

- [ ] **Step 11: Clean up test workspace**

```bash
rm -rf /tmp/scaffold-test
```

- [ ] **Step 12: Final commit (if any unstaged changes)**

```bash
git status
```

Expected: "nothing to commit, working tree clean"

---

## Self-Review

### 1. Spec Coverage

| Spec Section | Covered by Task |
|---|---|
| §1 脚手架仓库目录结构 | Tasks 1, 6, 7, 8 |
| §1.1 根目录模板内容 | Task 7 |
| §1.2 各模块 AGENTS.md 模板 | Task 8 |
| §2.1 AGENTS.md 通用化 | Task 2 |
| §2.2 http-constitution.md 时间规范 | Task 3 |
| §2.3 error-codes.md 通用化 | Task 4 |
| §2.4 validation.md 保留不变 | Task 1 (copy as-is) |
| §3 Go 项目结构规范 | Task 5 |
| §4 初始化脚本 | Task 9 |
| §5 .gitignore | Task 6 |
| §6 Makefile | Task 6 |
| §7 .env.example | Task 6 |

### 2. Placeholder Scan

- No "TBD", "TODO", "implement later" in plan steps ✅
- No "Add appropriate error handling" / "add validation" ✅
- No "Similar to Task N" — each task shows complete code ✅
- No steps without code blocks for file content ✅
- All types/functions referenced are defined in their respective tasks ✅

### 3. Type Consistency

- `{{PROJECT}}` placeholder used consistently across all template files ✅
- Module names: spec-center, server, web, mobile, admin — consistent everywhere ✅
- Relative paths in AGENTS.md `../{{PROJECT}}-spec-center/...` — consistent across module templates ✅
- Makefile target names (help, install, dev, build, test, lint, clean) — consistent ✅
- Error codes: 0, 1001, 2001, 3001, 4001, 4090, 4091, 5001 — consistent with spec ✅
