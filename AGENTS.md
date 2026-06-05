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
│   └── scaffold.js         # Unified scaffold command (auto-detects init/add mode)
├── steps/
│   ├── detect-mode.js      # Auto-detect init vs add mode from context
│   ├── resolve-name.js     # Resolve project name (CLI flag or interactive prompt)
│   ├── resolve-dir.js      # Resolve workspace directory with emptiness check
│   ├── module-loop.js      # Interactive module selection loop
│   └── review-table.js     # Review/edit/remove modules before creation
├── core/
│   ├── scaffold.js         # Template copy + variable replacement + git init
│   ├── templates.js        # Template discovery and validation
│   └── agents-sync.js      # AGENTS.md generation and merging (module markers)
└── utils/
    ├── path.js             # Path helpers, project name validation, template resolution
    ├── prompt.js           # Interactive prompts (name, dir, module name, module list parsing)
    ├── errors.js           # CommandError class
    └── logger.js           # Logging + summary output
```

### Auto-Detection (init vs add)

The tool uses a unified `scaffold` command that auto-detects the operating mode:

- **Init mode**: Triggered when `--name` is given, or no `*-spec-center/` directory is found in the current or parent directories.
- **Add mode**: Triggered when a `*-spec-center/` directory is found by walking up parent directories (up to 5 levels).

Detection logic lives in `src/steps/detect-mode.js`. In add mode, it scans the workspace for existing modules to prevent duplicates.

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

Template files use `{{PROJECT}}` as a placeholder. During scaffolding, `copyAndReplace()` replaces all `{{PROJECT}}` occurrences with the actual project name. For custom modules (renamed from a template), it also replaces the template reference name with the custom name and updates the role description.

### AGENTS.md Marker System

The `spec-center/AGENTS.md` template uses HTML comment markers for conditional content:

- `<!-- MODULE:name -->` — single-line marker: line is included only if module `name` is selected
- `<!-- BEGIN MODULE:name -->` ... `<!-- END MODULE:name -->` — block marker: entire section is conditional

When a custom module is added via `add`, `mergeAgentsMd()` appends new entries to the Module Map table and Repository Structure tree in the generated AGENTS.md.

### CLI Usage

```bash
node src/cli.js [options]
  -n, --name <name>          Project name (triggers init mode)
  -d, --dir <path>           Workspace directory (default: ./{name}, init mode only)
  -m, --modules <list>       Modules: "name" or "name=template", comma-separated
      --dry-run              Preview without writing
      --verbose              Debug output
  -V, --version              Show version
  -h, --help                 Show help
```

**Module list syntax**: `server`, `web`, `custom-name=server,admin` — use `name=template` to create a custom-named module from a template.

**Flow (init mode)**: detect mode → resolve name → resolve dir → module loop → review table → dry run check → create workspace root → create each module repo → git init each repo → sync AGENTS.md → print summary.

**Flow (add mode)**: detect mode → resolve existing context → module loop → filter duplicates → review table → dry run check → create each module repo → merge AGENTS.md → print summary.

### Review Table

In interactive mode (no `-m` flag), after module selection, a review table is displayed with actions:

- **Confirm and proceed** — proceed with creation
- **Edit module name** — rename a module (cannot rename spec-center)
- **Remove a module** — remove a module (cannot remove spec-center)
- **Add another module** — add more modules from templates
- **Cancel and exit** — abort the operation

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

# Run with coverage
npx vitest run --coverage

# Run a specific test file
npx vitest run tests/commands/scaffold.test.js
```

### Test Structure

Tests are in `tests/` mirroring the `src/` layout:

- `tests/commands/` — Integration tests that run the actual CLI via `execSync`
- `tests/core/` — Unit tests for scaffold, templates, agents-sync
- `tests/steps/` — Unit tests for detect-mode, resolve-dir, module-loop, review-table
- `tests/utils/` — Unit tests for path validation, prompt helpers, logger

Integration tests use `tmp-promise` for isolated temp directories and pass `--templates-dir` to avoid relative path issues.

## Key Design Decisions

1. **Unified command** — A single `scaffold` command replaces separate `init`/`add` subcommands. Mode is auto-detected from context.
2. **No installation required** — The CLI runs directly from source. `kickstart.sh` clones the repo, installs deps in a temp dir, and runs the CLI.
3. **Templates are plain directories** — No templating engine. Variable replacement is regex-based (`{{PROJECT}}`).
4. **Each module is an independent Git repo** — After scaffolding, each module gets `git init` + initial commit with `main` branch.
5. **Module name reuse** — The `name=template` syntax and interactive rename allow using the same template with different names (e.g., two `server` templates named `api-gateway` and `user-service`).
6. **spec-center is always included** — It serves as the SSOT and cannot be omitted or removed.
7. **Review table before creation** — Interactive mode shows a review step where users can edit, remove, or add modules before confirming.
8. **Traversal path warning** — If `--dir` contains `..`, a warning is displayed with the resolved absolute path.

## Conventions

- All source files use ES module syntax (`import`/`export`).
- Comments in English.
- Commit messages follow Conventional Commits (see `templates/spec-center/conventions/conventional-commits.md`).
- Engineering guidelines in `templates/spec-center/conventions/engineering-guidelines.md` apply to this project too.

## Environment Requirements

- Node.js >= 18.0.0
- Git (required for `git init` in each module)
- No external services or databases
