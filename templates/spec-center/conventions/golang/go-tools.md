# Go Dev Tools Convention v1.0

> Applies to: All Go backend services | Goal: Standardize dev tooling, lint configuration, and Makefile targets

This document defines the mandatory development tools, their configuration files, and Makefile targets for every Go service. See [go-project.md](go-project.md) for directory layout.

## 1. Required Tools

| Tool | Purpose | Install |
|------|---------|---------|
| [air](https://github.com/air-verse/air) | Hot reload during local development | `go install github.com/air-verse/air@latest` |
| [golangci-lint](https://golangci-lint.run/) | Aggregated static analysis and lint | `go install github.com/golangci/golangci-lint/v2/cmd/golangci-lint@latest` |
| [goimports](https://pkg.go.dev/golang.org/x/tools/cmd/goimports) | Format Go code and manage imports | `go install golang.org/x/tools/cmd/goimports@latest` |
| [govulncheck](https://pkg.go.dev/golang.org/x/vuln/cmd/govulncheck) | Scan dependencies for known CVEs | `go install golang.org/x/vuln/cmd/govulncheck@latest` |

**Rule**: All four tools MUST be installable via `make tools` and verifiable via `make tools-check`. Pin versions in the Makefile or a `tools/tools.go` file when reproducibility matters.

## 2. Configuration Files

Every Go service MUST keep these files at the repository root:

```
{{PROJECT}}-server/
├── .air.toml          # air hot-reload config (see §2.1)
├── .golangci.yml      # golangci-lint config (see §2.2)
└── Makefile
```

The SSOT templates live in `{{PROJECT}}-spec-center/conventions/golang/`. Copy or sync them into each Go service at init time; update the service copy when the SSOT changes.

### 2.1 `.air.toml`

Template: [`.air.toml`](.air.toml)

| Section | Key settings | Purpose |
|---------|--------------|---------|
| `[build]` | `cmd`, `bin` | Build command and output binary path under `tmp/` |
| `[build]` | `include_ext` | File extensions that trigger rebuild (`go`, `tpl`, …) |
| `[build]` | `exclude_dir` | Directories to ignore (`tmp`, `vendor`, `bin`, `tests`) |
| `[build]` | `send_interrupt`, `kill_delay` | Graceful shutdown on reload (pairs with server `Shutdown`) |
| `[misc]` | `clean_on_exit` | Remove `tmp/` artifacts when air exits |

Default build command:

```toml
cmd = "go build -o ./tmp/main ./cmd/server"
bin = "tmp/main"
```

Adjust `cmd` / `bin` if the entry point is not `cmd/server/main.go`.

### 2.2 `.golangci.yml`

Template: [`.golangci.yml`](.golangci.yml)

Uses **golangci-lint v2** config format (`version: "2"`).

#### `run`

| Key | Value | Purpose |
|-----|-------|---------|
| `timeout` | `5m` | Per-linter run timeout; increase only for very large codebases |

#### `linters`

| Setting | Value | Purpose |
|---------|-------|---------|
| `default` | `none` | Explicit opt-in; no implicit linter set |
| `enable` | see config file | Enabled linters (see table below) |

**Enabled linters:**

| Linter | Category | Purpose |
|--------|----------|---------|
| `errcheck` | correctness | Unchecked errors |
| `govet` | correctness | Suspicious constructs (vet) |
| `staticcheck` | correctness | Advanced static analysis |
| `unused` | correctness | Unused code |
| `ineffassign` | correctness | Ineffectual assignments |
| `bodyclose` | HTTP | Unclosed response bodies |
| `nilnil` | correctness | `return nil, nil` anti-pattern |
| `gocritic` | style | Opinionated diagnostics and style |
| `gosec` | security | Security issues |
| `misspell` | style | Typos in comments/strings (US locale) |
| `goconst` | style | Repeated strings → constants |
| `gocyclo` | complexity | Cyclomatic complexity (threshold: 15) |
| `unconvert` | style | Redundant type conversions |
| `errorlint` | correctness | Error wrapping / `%w` usage |
| `revive` | style | Golint replacement (exported docs, unused params) |

**Linter settings highlights:**

- `gocyclo.min-complexity: 15` — functions above this complexity fail lint.
- `gocritic` — `diagnostic` and `style` tags enabled; `ifElseChain` disabled.
- `revive` — enforces exported symbol documentation, flags unused parameters/receivers, and `indent-error-flow`.
- `misspell.locale: US` — US English spelling.

#### `linters.exclusions`

| Rule | Purpose |
|------|---------|
| `(.+)_test\.go` → disable `errcheck`, `gosec`, `goconst`, `gocritic` | Relax strict checks in tests |
| `paths: internal/dbsqlc/` | Skip sqlc-generated code |

Add paths for other generated packages (e.g. `internal/db/` if sqlc output lives there).

#### `issues`

| Key | Value | Purpose |
|-----|-------|---------|
| `max-issues-per-linter` | `50` | Cap report size per linter |
| `max-same-issues` | `5` | Cap duplicate issue noise |

#### `formatters`

| Formatter | Purpose |
|-----------|---------|
| `goimports` | Import grouping and formatting (used by `golangci-lint fmt` and as a standalone tool via `make fmt`) |

**Rule**: Do not disable linters project-wide without a documented reason in the service's `docs/specs/`. Prefer `exclusions.paths` for generated code.

## 3. Makefile Targets

Every Go service Makefile MUST implement the targets below. Variable names may differ; behavior MUST match.

### 3.1 Development

```makefile
.PHONY: dev
dev: ## Start dev server with hot reload (air)
	air
```

Requires `.air.toml` at the repository root. Pass environment variables via `.env` (air inherits the shell environment).

### 3.2 Formatting

```makefile
.PHONY: fmt
fmt: ## Format code (goimports)
	goimports -w .
```

`goimports` applies `gofmt` and adds/removes/reorders imports. Run before commit; `make check` invokes `fmt` first.

To format via golangci-lint instead (uses the `formatters` section of `.golangci.yml`):

```bash
golangci-lint fmt ./...
```

Prefer `make fmt` (`goimports -w .`) for speed in local workflows.

### 3.3 Lint

```makefile
.PHONY: lint
lint: ## Run linter (golangci-lint)
	golangci-lint run ./...
```

Reads `.golangci.yml` from the repository root. CI MUST run `make lint` (or equivalent) on every PR.

Fix auto-fixable issues:

```bash
golangci-lint run --fix ./...
```

### 3.4 Vulnerability Scan

```makefile
.PHONY: govulncheck
govulncheck: ## Scan for known vulnerabilities in dependencies
	govulncheck ./...
```

Scans module dependencies and the standard library for known CVEs. Run in CI and before release (`make release-check`).

### 3.5 Aggregate Checks

```makefile
.PHONY: check release-check
check: fmt lint govulncheck test ## Run all quality checks (fmt + lint + govulncheck + test)
release-check: lint govulncheck test ## Pre-release checks (lint + govulncheck + test)
```

| Target | When to use |
|--------|-------------|
| `check` | Local pre-commit; full quality gate including format and unit tests |
| `release-check` | Before `docker` / `deploy`; skips `fmt` (CI should already enforce formatting) |

See [go-testing.md](go-testing.md) §10 for `test`, `test-integration`, and `test-e2e` targets.

### 3.6 Toolchain

```makefile
.PHONY: tools tools-check
tools: ## Install / update all dev tools
	go install github.com/air-verse/air@latest
	go install github.com/golangci/golangci-lint/v2/cmd/golangci-lint@latest
	go install golang.org/x/tools/cmd/goimports@latest
	go install golang.org/x/vuln/cmd/govulncheck@latest

tools-check: ## Verify all required tools are installed
	@which air            > /dev/null 2>&1 && echo "  ✓ air"            || echo "  ✗ air            (make tools)"
	@which golangci-lint  > /dev/null 2>&1 && echo "  ✓ golangci-lint"  || echo "  ✗ golangci-lint  (make tools)"
	@which goimports      > /dev/null 2>&1 && echo "  ✓ goimports"      || echo "  ✗ goimports      (make tools)"
	@which govulncheck    > /dev/null 2>&1 && echo "  ✓ govulncheck"    || echo "  ✗ govulncheck    (make tools)"
```

## 4. CI Integration

PR pipeline (extends [testing.md](../testing.md) §11.2):

```
lint → govulncheck → test → test-integration → coverage report
```

Main branch adds `test-e2e` after integration tests. `make lint` and `make govulncheck` MUST NOT be skipped or silenced (`|| true`).

## 5. Related Conventions

| Topic | Document |
|-------|----------|
| Project layout | [go-project.md](go-project.md) |
| Test Makefile targets | [go-testing.md](go-testing.md) |
| Universal Makefile targets | [testing.md](../testing.md) §11.1 |
