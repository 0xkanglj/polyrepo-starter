---
name: polyrepo-scaffold
description: >
  Scaffold multi-repo workspace projects with spec-center, server, web, and client modules.
  Use when the user asks to create a new project, scaffold a workspace, initialize a polyrepo
  structure, or add modules to an existing workspace.
---

# Polyrepo Scaffold

## Overview

Scaffold multi-repo workspace projects using the polyrepo-starter CLI. Creates independent Git repositories (spec-center, server, web, client) that share conventions through a single source of truth.

## Usage

Run `scripts/run.sh` with the appropriate flags to create or extend a workspace:

### Create a new workspace (init mode)

```bash
scripts/run.sh --name <project-name> [--dir <path>] [--modules <list>] [--dry-run]
```

- `--name`: Project name (required, lowercase/digits/hyphens, 2-50 chars)
- `--dir`: Workspace directory (default: `./{name}`)
- `--modules`: Comma-separated module list, e.g. `spec-center,server,web` or `api=server,ui=web`
- `--dry-run`: Preview without creating files

### Add modules to an existing workspace (add mode)

```bash
scripts/run.sh [--modules <list>] [--dry-run]
```

The CLI auto-detects an existing workspace by finding a `*-spec-center/` directory in the current or parent directories.

## Parameter Mapping

Map user intent to CLI flags:

| User Intent | CLI Flags |
|---|---|
| Create new workspace | `--name <name>` |
| Create in specific directory | `--dir <path>` (init mode only) |
| Specify modules | `--modules <list>` (comma-separated) |
| Preview only | `--dry-run` |

- Do not pass `--dry-run` by default
- When the user does not specify modules, omit `--modules` so the CLI runs interactive prompts
