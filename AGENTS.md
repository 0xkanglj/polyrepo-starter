# Polyrepo Starter

## Role

CLI scaffold tool that generates multi-repo workspace projects. Produces independent Git repositories (spec-center, server, web, mobile, admin) sharing conventions through a single source of truth.

## Architecture

This is a **Node.js CLI tool** built with ES modules (`"type": "module"`). It uses Commander.js for argument parsing, Inquirer for interactive prompts, and Ora for progress spinners.

### Source Layout

```
src/
├── cli.js                  # Entry point — Commander program definition
├── commands/
│   ├── init.js             # `init` subcommand — creates new workspace
│   └── add.js              # `add` subcommand — adds modules to existing workspace
├── core/
│   ├── scaffold.js         # Template copy + variable replacement + git init
│   ├── templates.js        # Template discovery (reads templates/ directory)
│   └── agents-sync.js      # AGENTS.md generation and merging (module markers)
└── utils/
    ├── path.js             # Path helpers, project name validation, template resolution
    ├── prompt.js           # Interactive prompts (name, dir, modules, module rename)
    ├── errors.js           # CommandError class
    └── logger.js           # Logging + summary output
```

### Template System

Templates live in `templates/` and are discovered dynamically:

| Template | Purpose |
|----------|---------|
| `root/` | Workspace root config (AGENTS.md, CLAUDE.md, .cursor rules, .claude settings, .opencode settings) |
| `spec-center/` | SSOT repo (conventions, error codes, API specs, domain docs) |
| `server/` | Backend service scaffold |
| `web/` | Web application scaffold |
| `mobile/` | Mobile application scaffold |
| `admin/` | Admin panel scaffold |

Template files use `{{PROJECT}}` as a placeholder. During scaffolding, `copyAndReplace()` replaces all `{{PROJECT}}` occurrences with the actual project name. For custom modules (renamed from a template), it also replaces the template reference name with the custom name.

### AGENTS.md Marker System

The `spec-center/AGENTS.md` template uses HTML comment markers for conditional content:

- `<!-- MODULE:name -->` — single-line marker: line is included only if module `name` is selected
- `<!-- BEGIN MODULE:name -->` ... `<!-- END MODULE:name -->` — block marker: entire section is conditional

When a custom module is added via `add`, `mergeAgentsMd()` appends new entries to the Module Map table and Repository Structure tree in the generated AGENTS.md.

### CLI Commands

#### `init` — Create a new workspace

```
node src/cli.js init [options]
  -n, --name <name>          Project name (validated: ^[a-z][a-z0-9]*(-[a-z0-9]+)*$)
  -d, --dir <path>           Workspace directory (default: ./{name})
  -m, --modules <list>       Comma-separated modules
      --templates-dir <path> Override templates directory
      --dry-run              Preview without writing
      --verbose              Debug output
```

Flow: validate name → resolve workspace dir → select modules (spec-center is always forced) → copy root template → create each module repo → git init each repo → sync AGENTS.md.

#### `add` — Add modules to existing workspace

```
node src/cli.js add [options]
  -m, --modules <list>       Comma-separated modules to add
      --templates-dir <path> Override templates directory
      --dry-run              Preview without writing
      --verbose              Debug output
```

Auto-detects workspace by searching upward for a `*-spec-center/` directory. Interactive mode: select template → name the module (can rename to create custom modules from templates) → confirm add another.

## Tech Stack

- **Runtime**: Node.js >= 18 (ES modules)
- **CLI framework**: Commander.js v12
- **Interactive prompts**: @inquirer/prompts v7 (input, checkbox, select, confirm)
- **Terminal UI**: chalk v5 (colors), ora v8 (spinners)
- **File matching**: glob v10
- **Testing**: Vitest v2 with tmp-promise for temp directories
- **No build step** — runs directly with `node src/cli.js`

## Build & Test

```bash
# Install dependencies
npm install

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage (thresholds: 70% branches/functions/lines/statements)
npx vitest run --coverage

# Run a specific test file
npx vitest run tests/commands/init.test.js
```

### Test Structure

Tests are in `tests/` mirroring the `src/` layout:

- `tests/commands/` — Integration tests that run the actual CLI via `execSync`
- `tests/core/` — Unit tests for scaffold, templates, agents-sync
- `tests/utils/` — Unit tests for path validation, prompt helpers, logger

Integration tests use `tmp-promise` for isolated temp directories and pass `--templates-dir` to avoid relative path issues.

## Key Design Decisions

1. **No installation required** — The CLI runs directly from source. `kickstart.sh` clones the repo, installs deps in a temp dir, and runs the CLI.
2. **Templates are plain directories** — No templating engine. Variable replacement is regex-based (`{{PROJECT}}`).
3. **Each module is an independent Git repo** — After scaffolding, each module gets `git init` + initial commit.
4. **Module name reuse** — The `add` command allows using the same template with different names (e.g., two `server` templates named `api-gateway` and `user-service`).
5. **spec-center is always included** — It serves as the SSOT and cannot be omitted.
6. **`--verbose` is a global flag** — Applied at the program level, not per subcommand.

## Conventions

- All source files use ES module syntax (`import`/`export`).
- Comments in English.
- Commit messages follow Conventional Commits (see `templates/spec-center/conventions/conventional-commits.md`).
- Engineering guidelines in `templates/spec-center/conventions/engineering-guidelines.md` apply to this project too.

## Environment Requirements

- Node.js >= 18.0.0
- Git (required for `git init` in each module)
- No external services or databases
