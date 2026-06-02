# Spec Center (SSOT)

## Architecture

This project follows a **multi-repo workspace** architecture. Each module is an independent repository; all repositories coexist in a workspace directory for local development, sharing specs, contracts, and conventions through `spec-center`.

### Module Map

| Module | Role |
|---|---|
<!-- MODULE:admin -->| `admin` | Admin application|
<!-- MODULE:mobile -->| `mobile` | Mobile application |
<!-- MODULE:server -->| `server` | Server application |
| `spec-center` | **Single Source of Truth (SSOT)** for cross-module contracts and constraints |
<!-- MODULE:web -->| `web` | Web application|

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
- Convention documents → `conventions/` — see [Convention Documents](#convention-documents)

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
<!-- MODULE:server -->| Server implementation plan (how) | `{{PROJECT}}-server/docs/plans/` | `2026-05-30-feature.md` |
<!-- MODULE:web -->| Web implementation plan (how) | `{{PROJECT}}-web/docs/plans/` | `2026-05-30-feature.md` |
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
| Convention documents (HTTP, validation, Go, engineering) | `{{PROJECT}}-spec-center/conventions/` — see [Convention Documents](#convention-documents) |
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

### Convention Documents

All convention documents live in `conventions/` and define cross-cutting rules that every module MUST follow:

| Document | Scope | Description |
|---|---|---|
| [http-constitution.md](conventions/http-constitution.md) | All HTTP services / APIs | HTTP 全局设计规范：方法选择、状态码、响应结构、分页、排序、时间格式、版本管理等 |
| [go-validation.md](conventions/go-validation.md) | All Go microservices | Go 项目输入校验规范：校验库选型、字段规则、错误格式、自定义校验器 |
| [go-project.md](conventions/go-project.md) | All Go backend services | Go 项目结构约定：目录布局、分层模式、命名规范 |
| [engineering-guidelines.md](conventions/engineering-guidelines.md) | All modules & dev tools | LLM/agent 编码行为规范：编码前思考、代码风格、重构原则、安全约束 |
| [conventional-commits.md](conventions/conventional-commits.md) | All modules | Git 提交信息规范：类型、范围、格式 |

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
│   │   ├── conventional-commits.md  # Git 提交信息规范
│   │   ├── engineering-guidelines.md  # LLM/agent coding behavior guidelines
│   │   ├── http-constitution.md  # HTTP/API 全局设计规范 (v1.0)
│   │   ├── go-validation.md      # Go project Input validation 校验规范 (v1.0)
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
<!-- BEGIN MODULE:server -->├── {{PROJECT}}-server/           # Server application
│   ├── AGENTS.md                 # Server-specific conventions
│   └── docs/
│       ├── specs/                # Server-specific specifications
│       │   └── .gitkeep
│       └── plans/                # Server-specific implementation plans
│           └── .gitkeep
<!-- END MODULE:server -->
<!-- BEGIN MODULE:web -->├── {{PROJECT}}-web/              # Web application
│   ├── AGENTS.md                 # Web-specific conventions
│   └── docs/
│       ├── specs/                # Web-specific specifications
│       │   └── .gitkeep
│       └── plans/                # Web-specific implementation plans
│           └── .gitkeep
<!-- END MODULE:web -->
<!-- BEGIN MODULE:mobile -->├── {{PROJECT}}-mobile/           # Mobile application
│   ├── AGENTS.md                 # Mobile-specific conventions
│   └── docs/
│       ├── specs/                # Mobile-specific specifications
│       │   └── .gitkeep
│       └── plans/                # Mobile-specific implementation plans
│           └── .gitkeep
<!-- END MODULE:mobile -->
<!-- BEGIN MODULE:admin -->└── {{PROJECT}}-admin/            # Admin application
    ├── AGENTS.md                 # Admin-specific conventions
    └── docs/
        ├── specs/                # Admin-specific specifications
        │   └── .gitkeep
        └── plans/                # Admin-specific implementation plans
            └── .gitkeep
<!-- END MODULE:admin -->
```
