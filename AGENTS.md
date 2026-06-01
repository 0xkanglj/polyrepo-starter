# Spec Center (SSOT)

## Architecture

This project follows a **monorepo architecture**. All services live under a single repository, sharing specs, contracts, and conventions through `spec-center`.

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
> 3. Ensure the new module has its own `AGENTS.md` with Role, Mandatory Specs (relative links to deluxe-spec-center), Key Responsibilities, Tech Stack, and Build & Test sections.

## Spec Center as SSOT

`deluxe-spec-center` holds all **shared** specifications that govern inter-module collaboration:

- API interface specifications (endpoints, request/response schemas) → `api/openapi.yaml`
- Error format and error code registry → `errors/error-codes.md`
- Response envelope format
- Retry and backoff strategies
- Authentication and authorization contracts
- Shared domain vocabulary and event schemas
- Cross-module domain specs (e.g. product SKU) → `docs/specs/`
- Data format conventions (date, pagination, sorting, etc.)
- HTTP Constitution — 全局 HTTP/API 设计规范（[conventions/http-constitution.md](conventions/http-constitution.md)）
- Input Validation — 请求参数校验规范（[conventions/validation.md](conventions/validation.md)）

**Rule**: Any spec that affects two or more modules MUST live in `deluxe-spec-center`. Any spec that only affects a single module MUST live in that module's own `docs/` directory.

## Development Paradigm: SDD + TDD

### Specification-Driven Development (SDD)

1. Write or update the relevant spec **first** (in `deluxe-spec-center` for shared specs, or in the module's `docs/` for local specs).
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
2. **Shared spec** -> Write/update in `deluxe-spec-center/`.
3. **Module-specific spec** -> Write/update in the module's `docs/` directory.
4. **Cross-reference** - Module-specific specs must reference the shared specs they depend on. Use relative links like `[API Spec](../deluxe-spec-center/conventions/xxx.md)`.
5. **docs/ sub-directories** - Each module's `docs/` MUST contain two sub-directories:
   - `docs/specs/` — 规格说明文档（数据模型、业务规则、接口定义、约束条件等，偏"是什么"）
   - `docs/plans/` — 实施方案文档（技术方案、架构设计、迁移计划、开发计划等，偏"怎么做"）

### Implementation Plans (Cross-Module Features)

Cross-module **specs** live in `deluxe-spec-center/docs/specs/`; cross-module **plans** do **not**. Each implementing module gets its own plan under `<module>/docs/plans/`.

**Rule**: One plan per implementing module. Do **not** combine server + web (or other modules) into a single monolithic implementation plan.

| Document | Where | Example |
|---|---|---|
| Cross-module domain spec (what) | `deluxe-spec-center/docs/specs/` | `2026-05-30-product-sku-design.md` |
| Server implementation plan (how) | `deluxe-server/docs/plans/` | `2026-05-30-product-sku.md` |
| Web implementation plan (how) | `deluxe-web/docs/plans/` | `2026-05-30-product-sku.md` |
| API / error-code contract updates | `deluxe-spec-center/` (OpenAPI, error-codes) | Updated in spec or alongside server plan — **no** separate spec-center plan unless spec-center-only work |

**Plan structure:**

1. **Shared spec first** — Write and approve the cross-module spec in `deluxe-spec-center` (API schemas, acceptance criteria, error codes).
2. **Split plans by module** — Create one plan per module that implements the feature. Use the same date + feature slug (e.g. `2026-05-30-product-sku.md`) for discoverability.
3. **Declare dependencies** — Each plan MUST link to the SSOT spec and, when applicable, state `Depends on: <other-module-plan>` (e.g. web plan depends on server plan).
4. **Execute in dependency order** — Typically `deluxe-server` → `deluxe-web` → `deluxe-mobile`. A downstream plan MUST NOT assume upstream API changes exist until the upstream plan is merged or verified.
5. **No canonical plans in agent temp paths** — Module plans belong in `<module>/docs/plans/`, not in `docs/superpowers/plans/` or other agent-only directories. Agent-generated drafts may start elsewhere but MUST be moved to the module path before execution.

**When a single cross-module plan is acceptable (rare):** Only for small, atomic changes that must land in one PR and touch ≤2 modules with no meaningful dependency boundary (e.g. a one-field DTO addition + one UI column). Prefer split plans when in doubt.

**Example (Product SKU):**

```
deluxe-spec-center/docs/specs/2026-05-30-product-sku-design.md   ← SSOT spec
deluxe-server/docs/plans/2026-05-30-product-sku.md               ← schema, API, tests
deluxe-web/docs/plans/2026-05-30-product-sku.md                  ← UI; Depends on server plan
```

### Spec Ownership Quick Reference

| What | Where |
|---|---|
| API endpoint definition | `deluxe-spec-center/` |
| Cross-module domain spec (e.g. product SKU) | `deluxe-spec-center/docs/specs/` |
| Cross-module implementation plan | **Split** — one plan per module in `<module>/docs/plans/` (see [Implementation Plans](#implementation-plans-cross-module-features)) |
| Error code and format | `deluxe-spec-center/` |
| Response envelope | `deluxe-spec-center/` |
| HTTP / API 设计规范（方法、状态码、响应结构、分页、时间等） | `deluxe-spec-center/conventions/` |
| Retry / circuit-breaker policy | `deluxe-spec-center/` |
| Internal data model (not exposed via API) | Module's `docs/` |
| Internal algorithm or business logic | Module's `docs/` |
| Module implementation plan | Module's `docs/plans/` |
| Module deployment / ops config | Module's `docs/` |

## Domain-Driven Design (DDD)

All modules follow DDD principles:

- **Aggregate Roots** must be clearly identified in both specs and code. Each bounded context has explicit aggregate roots.
- **Bounded Contexts** map to modules. Cross-context communication happens only through well-defined interfaces (as specified in `deluxe-spec-center`).
- **Ubiquitous Language** is defined in `deluxe-spec-center` and must be used consistently across all modules.

### Core Domain Concepts

- **Sales Order (SO)** — 销售订单，核心聚合根
- **Product / SKU** — 产品 / SKU，库存单元
- **Customer** — 客户信息
- **Inventory** — 库存（与 Auto Count 同步）
- **Order Audit / Approval** — 订单审核流程

## Module Isolation

- Each module **MUST NOT** directly access another module's database, cache, or internal storage.
- Modules communicate **only** through documented APIs or message events defined in `deluxe-spec-center`.
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
spec(api): add sales order listing endpoint specification
```

### AGENTS.md Hierarchy

- `deluxe-spec-center/AGENTS.md` (this file) - Global project rules and conventions.
- `<module>/AGENTS.md` - Module-specific conventions, tech stack, build/test commands, and local development notes.

When working in a module, **load both** this file and the module's own `AGENTS.md`.

### Spec Document Index (Mandatory Maintenance)

When a spec document is **added or updated**, the corresponding AGENTS.md **MUST** be updated with a reference entry. This ensures LLMs and developers can discover and understand all active specs without scanning the filesystem.

**Rule**: No spec document should exist without being referenced in an AGENTS.md.

**How**:

1. **`deluxe-spec-center/AGENTS.md`** — Maintain the "Spec Center as SSOT" bullet list and Repository Structure tree with actual filenames and relative links. Every file under `deluxe-spec-center/` must appear in at least one of these two places.
2. **`<module>/AGENTS.md`** — Maintain a "Mandatory Specs" section listing all spec-center documents the module depends on, with relative links.

**Why**: AGENTS.md is the entry point for context-loading. If a spec is not referenced here, it is effectively invisibmo'me'repoagents and risks being ignored or contradicted.

## Repository Structure

```
Monorepo/
├── AGENTS.md                     # Root reference -> deluxe-spec-center/AGENTS.md
├── sales_ordering_system_prd.md  # Product Requirements Document (PRD)
├── deluxe-spec-center/           # SSOT - shared specs and contracts
│   ├── AGENTS.md                 # This file - global project rules
│   ├── conventions/              # Shared conventions
│   │   ├── http-constitution.md  # HTTP/API 全局设计规范 (v1.0)
│   │   └── validation.md         # Input validation 校验规范 (v1.0)
│   ├── api/                      # API specifications (OpenAPI / endpoint specs)
│   │   └── openapi.yaml          # OpenAPI 3.0.3 — all REST endpoints and schemas
│   ├── docs/                     # Cross-module domain specifications
│   │   └── specs/                # Shared specs affecting 2+ modules
│   ├── errors/                   # Error codes and formats
│   │   └── error-codes.md        # Business error code registry
│   └── events/                   # Inter-module event definitions
├── deluxe-server/                # Backend service (Go)
│   ├── AGENTS.md                 # Server-specific conventions
│   └── docs/
│       ├── specs/                # Server-specific specifications
│       └── plans/                # Server-specific implementation plans
├── deluxe-web/                   # Web dashboard (OMS 后台管理系统)
│   ├── AGENTS.md                 # Web-specific conventions
│   └── docs/
│       ├── specs/                # Web-specific specifications
│       └── plans/                # Web-specific implementation plans
├── deluxe-mobile/                # Mobile client (前端 Client)
    ├── AGENTS.md                 # mobile-specific conventions
    └── docs/
        ├── specs/                # Mobile-specific specifications
        └── plans/                # Mobile-specific implementation plans

```
