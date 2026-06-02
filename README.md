# Polyrepo Starter

Universal scaffold for multi-repo workspace projects. Generates independent Git repositories (spec-center, server, web, mobile, admin) that share conventions through a single source of truth.

**[简体中文](README.zh-CN.md)**

## Quick Start

### Remote (recommended)

```bash
curl -fsSL https://raw.githubusercontent.com/0xkanglj/polyrepo-starter/main/kickstart.sh | bash
```

### Local

```bash
git clone https://github.com/0xkanglj/polyrepo-starter.git
cd polyrepo-starter
npm install
node src/cli.js init
```

## Commands

### `init` — Create a new workspace

```bash
node src/cli.js init [options]
  -n, --name <name>          Project name
  -d, --dir <path>           Workspace directory (default: ./{name})
  -m, --modules <list>       Comma-separated modules
      --templates-dir <path> Override templates directory
      --dry-run              Show what would be created
```

### `add` — Add modules to existing workspace

```bash
node src/cli.js add [options]
  -m, --modules <list>       Comma-separated modules to add
  -c, --custom <name:ref>    Add custom module (e.g. crawler:server)
      --templates-dir <path> Override templates directory
      --dry-run              Show what would be created
```

## Module Selection

| Module | Required | Description |
|--------|----------|-------------|
| spec-center | ✅ | Shared specs and conventions (SSOT) |
| server | Optional | Backend service |
| web | Optional | Web application |
| mobile | Optional | Mobile application |
| admin | Optional | Admin manager application |

### Custom Modules

You can create custom modules based on existing templates:

```bash
node src/cli.js add -c crawler:server
```

This creates a `{name}-crawler` directory based on the `server` template.

## What Gets Generated

```
my-project/                           # workspace root (NOT a git Repo)
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
