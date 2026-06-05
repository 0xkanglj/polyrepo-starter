# Polyrepo Starter

Universal scaffold for multi-repo workspace projects. Generates independent Git repositories (spec-center, server, web, mobile, admin) that share conventions through a single source of truth.

**[简体中文](README.zh-CN.md)**

## Quick Start

### Remote (recommended)

Interactive mode (guided prompts):

```bash
curl -fsSL https://raw.githubusercontent.com/0xkanglj/polyrepo-starter/main/kickstart.sh | bash
```

Non-interactive (CLI flags):

```bash
curl -fsSL https://raw.githubusercontent.com/0xkanglj/polyrepo-starter/main/kickstart.sh | bash -s -- \
  --name my-project \
  --modules server,web
```

> Add `--dir <path>` to specify a custom workspace directory (default: `./{name}`).

Non-interactive (environment variables):

```bash
curl -fsSL https://raw.githubusercontent.com/0xkanglj/polyrepo-starter/main/kickstart.sh | env \
  PROJECT_NAME=my-project \
  MODULES="server,web,admin" \
  bash
```

### Local

```bash
git clone https://github.com/0xkanglj/polyrepo-starter.git
cd polyrepo-starter
npm install
node src/cli.js
```

## Usage

The CLI uses a single `scaffold` command that auto-detects whether to create a new workspace (**init mode**) or add modules to an existing one (**add mode**).

### Init mode (new workspace)

Triggered when `--name` is provided, or when no `*-spec-center/` directory is found nearby.

```bash
node src/cli.js [options]
  -n, --name <name>          Project name
  -d, --dir <path>           Workspace directory (default: ./{name})
  -m, --modules <list>       Modules: "name" or "name=template", comma-separated
      --dry-run              Show what would be created
      --verbose              Enable debug output
```

### Add mode (extend existing workspace)

Triggered automatically when the CLI detects a `*-spec-center/` directory in the current or parent directories.

```bash
cd my-project
node /path/to/polyrepo-starter/src/cli.js [options]
  -m, --modules <list>       Modules to add (e.g. "web", "api=server")
      --dry-run              Show what would be created
      --verbose              Enable debug output
```

### Module list syntax

```bash
# Built-in modules by name
-m server,web,admin

# Custom name from a template (name=template)
-m api-gateway=server,user-service=server,web

# Mixed
-m server,my-admin=admin
```

### Interactive mode

Without `-m`, the CLI enters interactive mode:

1. Enter project name and directory (init mode)
2. Select modules from available templates
3. Optionally rename modules (create custom modules from templates)
4. **Review table** — confirm, edit names, remove, or add more modules
5. Proceed with creation

## Module Selection

| Module | Required | Description |
|--------|----------|-------------|
| spec-center | Yes (auto-included) | Shared specs and conventions (SSOT) |
| server | Optional | Backend service |
| web | Optional | Web application |
| mobile | Optional | Mobile application |
| admin | Optional | Admin application |

## What Gets Generated

```
my-project/                           # workspace root (NOT a git repo)
├── AGENTS.md                         → Points to spec-center AGENTS.md
├── CLAUDE.md                         → Points to AGENTS.md
├── .claude/settings.json             → Claude Code deny rules
├── .opencode/opencode.json           → OpenCode deny rules
├── .cursorignore / .cursorindexingignore
├── .cursor/rules/engineering-guidelines.mdc
├── my-project-spec-center/           → SSOT repo (specs, conventions, error codes)
├── my-project-server/                → Backend service repo
├── my-project-web/                   → Web application repo
├── my-project-mobile/                → Mobile application repo
└── my-project-admin/                 → Admin panel repo
```

## Project Name Rules

- Start with lowercase letter
- Only lowercase letters, digits, and hyphens
- No consecutive or trailing hyphens
- 2-50 characters
- Pattern: `^[a-z][a-z0-9]*(-[a-z0-9]+)*$`

## License

MIT
