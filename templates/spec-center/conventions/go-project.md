# Go Project Structure Convention v1.0

> Applies to: All Go backend services | Goal: Standardize project structure to reduce cross-project cognitive overhead

## Directory Structure

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
├── db/
|   └── migrations/
├── docs/
│   ├── specs/
│   └── plans/
├── Makefile
├── .env.example
├── .gitignore
├── AGENTS.md
└── CLAUDE.md
```

## `internal/` vs `pkg/` Guidelines

| Location | Rule | Examples |
|----------|------|----------|
| `pkg/` | Safe for import by other Go projects; API must remain stable | apperror, response, database, validator |
| `internal/` | Project-private; not importable externally | config, server, handler, middleware, repository, service, model |

**Decision rule:** If a package can be directly `import`-ed and used in another Go service, place it in `pkg/`. If it contains project-specific types or constants, place it in `internal/`.

## Server Lifecycle

`internal/server/server.go` defines the Server struct:

- `New(cfg, db)` — Constructor; accepts dependencies, internally calls `registerRoutes()`
- `Start(addr)` — Starts the HTTP server with graceful shutdown support
- `Shutdown(ctx)` — Gracefully closes connections on signal interruption

`cmd/server/main.go` responsibilities: load config → initialize database → construct Server → listen for signals → Start.

## Router Registration

`internal/server/routes.go` centrally manages all routes:

- Grouped by domain with section comments
- Middleware applied by layer: global → route group → individual route
- API version prefix `/v1`
- Health check routes placed outside the version prefix

## Layered Architecture

| Layer | Responsibility | May Call |
|-------|---------------|----------|
| Handler | HTTP request parsing, input validation, response serialization | Service |
| Service | Business logic orchestration, transaction management | Repository |
| Repository | SQL queries, data mapping | Database |

Cross-layer calls are prohibited: Handlers must not access Repositories directly.
