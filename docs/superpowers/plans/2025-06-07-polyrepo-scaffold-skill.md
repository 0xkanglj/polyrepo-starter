# Polyrepo Scaffold Skill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Package the polyrepo-starter CLI as a self-contained Codex skill so agents can invoke `$polyrepo-scaffold` to create or extend multi-repo workspaces.

**Architecture:** Three independent workstreams: (A) a `--templates-dir` hidden CLI option to decouple template path resolution from `__dirname`, (B) an npm `build-skill` script that copies `src/`, `templates/`, and `package.json` into a self-contained `skills/polyrepo-scaffold/` directory, and (C) the skill's `SKILL.md`, `run.sh`, and optional `agents/openai.yaml` metadata files that wire the CLI into the Codex skill system.

**Tech Stack:** Node.js >= 18 (ES modules), Commander.js, Vitest, bash

---

### Task 1: Make TEMPLATES_DIR overridable via setTemplatesDir()

**Files:**
- Modify: `src/utils/path.js:1-8`

- [ ] **Step 1: Replace the const TEMPLATES_DIR with a mutable let and export setTemplatesDir()**

Replace lines 1-8 of `src/utils/path.js`:

```js
import { homedir } from 'os';
import { resolve, dirname, basename } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
let TEMPLATES_DIR = resolve(__dirname, '../../templates');

export const SPEC_CENTER_NAME = 'spec-center';
export const SPEC_CENTER_SUFFIX = '-spec-center';

export function setTemplatesDir(dir) {
  TEMPLATES_DIR = dir;
}

export function resolveTemplatesDir(...subPaths) {
  return resolve(TEMPLATES_DIR, ...subPaths);
}
```

- [ ] **Step 2: Run existing tests to verify no regression**

Run: `npx vitest run tests/utils/path.test.js tests/core/scaffold.test.js tests/core/templates.test.js 2>&1`
Expected: all tests PASS

- [ ] **Step 3: Commit**

```bash
git add src/utils/path.js
git commit -m "feat: make TEMPLATES_DIR overridable via setTemplatesDir()"
```

---

### Task 2: Add --templates-dir hidden CLI option

**Files:**
- Modify: `src/cli.js:1-6` (add import)
- Modify: `src/cli.js:34-35` (add option)
- Modify: `src/cli.js:37-40` (add setTemplatesDir call in action handler)

- [ ] **Step 1: Import setTemplatesDir in cli.js**

Add the import after the existing `import { setVerbose } from './utils/logger.js';` line:

```js
import { setTemplatesDir } from './utils/path.js';
```

The full import block becomes:

```js
import { program } from 'commander';
import { scaffoldCommand } from './commands/scaffold.js';
import { setVerbose } from './utils/logger.js';
import { setTemplatesDir } from './utils/path.js';
import { CommandError } from './utils/errors.js';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
```

- [ ] **Step 2: Add --templates-dir hidden option**

Add after the existing `.option('--dry-run', 'Show what would be created')` line:

```js
  .option('--templates-dir <path>', '', undefined, true)
```

The fourth argument `undefined` suppresses the help text, and `true` hides it from `--help`.

- [ ] **Step 3: Wire setTemplatesDir in the action handler**

Inside `.action(async (options) => { ... })`, after `if (program.opts().verbose) setVerbose(true);`, add:

```js
    if (options.templatesDir) setTemplatesDir(resolve(options.templatesDir));
```

The action handler should read:

```js
  .action(async (options) => {
    if (program.opts().verbose) setVerbose(true);
    if (options.templatesDir) setTemplatesDir(resolve(options.templatesDir));
    if (options.dir) warnIfTraversalPath(options.dir, '--dir');
    await scaffoldCommand(options);
  });
```

- [ ] **Step 4: Run the full test suite to verify no regression**

Run: `npm test 2>&1`
Expected: all tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/cli.js
git commit -m "feat: add --templates-dir hidden CLI option"
```

---

### Task 3: Write integration test for --templates-dir option

**Files:**
- Create: `tests/commands/templates-dir.test.js`

- [ ] **Step 1: Write the integration test**

Create `tests/commands/templates-dir.test.js`:

```js
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execSync } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';
import tmp from 'tmp-promise';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLI_PATH = resolve(__dirname, '../../src/cli.js');
const REAL_TEMPLATES_DIR = resolve(__dirname, '../../templates');

describe('--templates-dir option', () => {
  let tempDir;

  beforeEach(async () => {
    tempDir = await tmp.dir({ unsafeCleanup: true });
  });

  afterEach(async () => {
    await tempDir.cleanup();
  });

  it('resolves templates from a custom --templates-dir', () => {
    const workspace = resolve(tempDir.path, 'acme');
    execSync(
      `node "${CLI_PATH}" -n acme -d "${workspace}" -m spec-center,server --templates-dir "${REAL_TEMPLATES_DIR}"`,
      { stdio: 'pipe' }
    );

    expect(existsSync(resolve(workspace, 'AGENTS.md'))).toBe(true);
    expect(existsSync(resolve(workspace, 'acme-spec-center'))).toBe(true);
    expect(existsSync(resolve(workspace, 'acme-server'))).toBe(true);
  });

  it('fails gracefully with non-existent --templates-dir', () => {
    const workspace = resolve(tempDir.path, 'acme');
    expect(() => {
      execSync(
        `node "${CLI_PATH}" -n acme -d "${workspace}" -m spec-center --templates-dir "/nonexistent/path"`,
        { stdio: 'pipe' }
      );
    }).toThrow();
  });
});
```

- [ ] **Step 2: Run the new test to verify it passes**

Run: `npx vitest run tests/commands/templates-dir.test.js 2>&1`
Expected: 2 tests PASS

- [ ] **Step 3: Commit**

```bash
git add tests/commands/templates-dir.test.js
git commit -m "test: add integration tests for --templates-dir option"
```

---

### Task 4: Add build-skill script to package.json

**Files:**
- Modify: `package.json:14-17`

- [ ] **Step 1: Add build-skill script**

Change the `scripts` block from:

```json
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  },
```

To:

```json
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "build-skill": "mkdir -p skills/polyrepo-scaffold/scripts skills/polyrepo-scaffold/assets && rm -rf skills/polyrepo-scaffold/scripts/src skills/polyrepo-scaffold/assets/templates && cp -r src skills/polyrepo-scaffold/scripts/src && cp -r templates skills/polyrepo-scaffold/assets/templates && cp package.json package-lock.json skills/polyrepo-scaffold/scripts/src/"
  },
```

- [ ] **Step 2: Run the build-skill script to verify**

Run: `npm run build-skill 2>&1`
Expected: no errors

- [ ] **Step 3: Verify the output structure**

Run: `ls skills/polyrepo-scaffold/scripts/src/cli.js skills/polyrepo-scaffold/scripts/src/utils/path.js skills/polyrepo-scaffold/assets/templates/spec-center/`
Expected: all three paths exist

- [ ] **Step 4: Commit**

```bash
git add package.json
git commit -m "feat: add build-skill npm script"
```

---

### Task 5: Create skills/polyrepo-scaffold/SKILL.md

**Files:**
- Create: `skills/polyrepo-scaffold/SKILL.md`

- [ ] **Step 1: Create SKILL.md**

Create `skills/polyrepo-scaffold/SKILL.md` with:

```markdown
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
```

- [ ] **Step 2: Verify the file exists**

Run: `ls -la skills/polyrepo-scaffold/SKILL.md`
Expected: file exists

- [ ] **Step 3: Commit**

```bash
git add skills/polyrepo-scaffold/SKILL.md
git commit -m "feat: add polyrepo-scaffold SKILL.md"
```

---

### Task 6: Create skills/polyrepo-scaffold/scripts/run.sh

**Files:**
- Create: `skills/polyrepo-scaffold/scripts/run.sh`

- [ ] **Step 1: Create run.sh**

Create `skills/polyrepo-scaffold/scripts/run.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SKILL_DIR="$(dirname "$SCRIPT_DIR")"
CLI_DIR="$SCRIPT_DIR/src"

# Verify Node.js >= 18
NODE_MAJOR=$(node -e "console.log(process.versions.node.split('.')[0])")
if [ "$NODE_MAJOR" -lt 18 ]; then
  echo "Error: Node.js >= 18 required, got $(node --version)" >&2
  exit 1
fi

# Install dependencies if needed
if [ ! -d "$CLI_DIR/node_modules" ]; then
  cd "$CLI_DIR"
  npm install --omit=dev --silent
  cd "$SKILL_DIR"
fi

exec node "$CLI_DIR/cli.js" \
  --templates-dir "$SKILL_DIR/assets/templates" \
  "$@"
```

- [ ] **Step 2: Make run.sh executable**

Run: `chmod +x skills/polyrepo-scaffold/scripts/run.sh`

- [ ] **Step 3: Commit**

```bash
git add skills/polyrepo-scaffold/scripts/run.sh
git commit -m "feat: add polyrepo-scaffold run.sh bootstrap script"
```

---

### Task 7: Create skills/polyrepo-scaffold/agents/openai.yaml

**Files:**
- Create: `skills/polyrepo-scaffold/agents/openai.yaml`

- [ ] **Step 1: Create openai.yaml**

Create `skills/polyrepo-scaffold/agents/openai.yaml`:

```yaml
name: polyrepo-scaffold
description: Scaffold multi-repo workspace projects using polyrepo-starter
triggers:
  - create a new project
  - scaffold a workspace
  - initialize a polyrepo structure
  - add modules to an existing workspace
  - set up a multi-repo project
```

- [ ] **Step 2: Verify the file exists**

Run: `ls -la skills/polyrepo-scaffold/agents/openai.yaml`
Expected: file exists

- [ ] **Step 3: Commit**

```bash
git add skills/polyrepo-scaffold/agents/openai.yaml
git commit -m "feat: add polyrepo-scaffold agent metadata"
```

---

### Task 8: Test the build-skill output structure

**Files:**
- Create: `tests/skills/build-skill.test.js`

- [ ] **Step 1: Write the test**

Create `tests/skills/build-skill.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, lstatSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '../..');

describe('build-skill script', () => {
  it('produces the expected skill directory structure', () => {
    execSync('npm run build-skill', { cwd: REPO_ROOT, stdio: 'pipe' });

    const skillDir = resolve(REPO_ROOT, 'skills/polyrepo-scaffold');

    expect(existsSync(skillDir)).toBe(true);
    expect(existsSync(resolve(skillDir, 'SKILL.md'))).toBe(true);
    expect(existsSync(resolve(skillDir, 'scripts/run.sh'))).toBe(true);
    expect(existsSync(resolve(skillDir, 'scripts/src/cli.js'))).toBe(true);
    expect(existsSync(resolve(skillDir, 'scripts/src/package.json'))).toBe(true);
    expect(existsSync(resolve(skillDir, 'assets/templates/spec-center'))).toBe(true);

    const runShStat = lstatSync(resolve(skillDir, 'scripts/run.sh'));
    expect(runShStat.mode & 0o111).not.toBe(0);
  });
});
```

- [ ] **Step 2: Run the test**

Run: `npx vitest run tests/skills/build-skill.test.js 2>&1`
Expected: 1 test PASS

- [ ] **Step 3: Commit**

```bash
git add tests/skills/build-skill.test.js
git commit -m "test: add build-skill output structure test"
```

---

### Task 9: Test run.sh end-to-end

**Files:**
- Create: `tests/skills/run-sh.test.js`

- [ ] **Step 1: Write the integration test**

Create `tests/skills/run-sh.test.js`:

```js
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execSync } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, readFileSync } from 'fs';
import tmp from 'tmp-promise';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '../..');
const RUN_SH_PATH = resolve(REPO_ROOT, 'skills/polyrepo-scaffold/scripts/run.sh');

describe('run.sh end-to-end', () => {
  let tempDir;

  beforeEach(async () => {
    tempDir = await tmp.dir({ unsafeCleanup: true });
  });

  afterEach(async () => {
    await tempDir.cleanup();
  });

  it('creates a workspace using run.sh (init mode)', () => {
    execSync('npm run build-skill', { cwd: REPO_ROOT, stdio: 'pipe' });

    const workspace = resolve(tempDir.path, 'acme');
    execSync(
      `bash "${RUN_SH_PATH}" --name acme --dir "${workspace}" --modules spec-center,server`,
      { cwd: tempDir.path, stdio: 'pipe' }
    );

    expect(existsSync(resolve(workspace, 'AGENTS.md'))).toBe(true);
    expect(existsSync(resolve(workspace, 'acme-spec-center'))).toBe(true);
    expect(existsSync(resolve(workspace, 'acme-server'))).toBe(true);

    const agentsContent = readFileSync(resolve(workspace, 'acme-spec-center', 'AGENTS.md'), 'utf-8');
    expect(agentsContent).not.toContain('{{PROJECT}}');
  });

  it('adds a module using run.sh (add mode)', () => {
    execSync('npm run build-skill', { cwd: REPO_ROOT, stdio: 'pipe' });

    const workspace = resolve(tempDir.path, 'acme');
    execSync(
      `bash "${RUN_SH_PATH}" --name acme --dir "${workspace}" --modules spec-center`,
      { cwd: tempDir.path, stdio: 'pipe' }
    );

    execSync(
      `bash "${RUN_SH_PATH}" --modules web`,
      { cwd: workspace, stdio: 'pipe' }
    );

    expect(existsSync(resolve(workspace, 'acme-web'))).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test**

Run: `npx vitest run tests/skills/run-sh.test.js 2>&1`
Expected: 2 tests PASS

- [ ] **Step 3: Commit**

```bash
git add tests/skills/run-sh.test.js
git commit -m "test: add run.sh end-to-end integration tests"
```

---

### Task 10: Final verification

- [ ] **Step 1: Run the complete test suite**

Run: `npm test 2>&1`
Expected: all tests PASS

- [ ] **Step 2: Verify build-skill is idempotent**

Run: `npm run build-skill && npm run build-skill`
Expected: no errors on either run

- [ ] **Step 3: Verify --templates-dir is hidden from help**

Run: `node src/cli.js --help 2>&1`
Expected: output does NOT mention `--templates-dir`

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: final verification of skill packaging"
```
