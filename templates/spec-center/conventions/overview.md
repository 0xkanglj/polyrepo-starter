# Conventions Overview v1.0

> **Conventions Version**: 1.0 — tracks the conventions bundle as a whole. Bump when documents are added, removed, or reorganized; individual documents carry their own version in the title.

All convention documents live in `conventions/` and define cross-cutting rules that every module MUST follow.

## Universal Conventions

These apply to all modules regardless of technology stack.

| Document | Scope | Description |
|---|---|---|
| [http-constitution.md](http-constitution.md) | All HTTP services / APIs | HTTP design standard: method selection, status codes, response structure, pagination, sorting, time format, versioning |
| [observability.md](observability.md) | All modules | Structured logging (JSON/text), log levels, logic-position guidance, traceId correlation, naming conventions |
| [testing.md](testing.md) | All modules | Testing convention: test categories, AAA structure, naming, mocking philosophy, coverage targets, integration testing |
| [engineering-guidelines.md](engineering-guidelines.md) | All modules & dev tools | LLM/agent coding behavior guidelines: think-before-code, code style, refactoring principles, safety constraints |
| [conventional-commits.md](conventional-commits.md) | All modules | Git commit message convention: types, scopes, format |

## Language-Specific Conventions

Language-specific conventions extend the universal conventions for a particular technology stack.
They are organized in subdirectories under `conventions/` and MUST be listed in the relevant module's `AGENTS.md` Mandatory Specs.

### Go (`golang/`)

| Document | Scope | Description |
|---|---|---|
| [go-project.md](golang/go-project.md) | All Go backend services | Go project structure convention: directory layout, layered architecture, naming conventions |
| [go-tools.md](golang/go-tools.md) | All Go backend services | Go dev tools convention: air, golangci-lint, goimports, govulncheck, config files, Makefile targets |
| [go-testing.md](golang/go-testing.md) | All Go backend services | Go testing convention: table-driven tests, httptest, build tags, interface-based mocks, coverage commands |
| [go-validation.md](golang/go-validation.md) | All Go microservices | Go input validation convention: library selection, field rules, error format, custom validators |
