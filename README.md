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
- Engineering guidelines for LLM/agent coding (`conventions/engineering-guidelines.md`)
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