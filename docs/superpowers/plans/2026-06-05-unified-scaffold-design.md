# Unified Scaffold: Merge init/add into Single Command — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Merge `init` and `add` subcommands into a single `scaffold` command with auto mode detection, unified module-rename support, and an interactive review table.

**Architecture:** A single Commander.js command (`scaffold`) flows through a pipeline: `detectMode` → `resolveName`/`resolveDir` → `moduleLoop` → `reviewTable` → `createModule` × N → `syncAgents`. Each pipeline stage is a pure function in `src/steps/`, orchestrated by `src/commands/scaffold.js`.

**Tech Stack:** Node.js >= 18 (ES modules), Commander.js v12, @inquirer/prompts v7, chalk v5, ora v8, Vitest v2

---

### Task 1: Simplify `resolveTemplatesDir` — remove global state

**Files:**
- Modify: `src/utils/path.js`

- [ ] **Step 1: Remove the global templates dir state**

Remove `setGlobalTemplatesDir`, `resetGlobalTemplatesDir`, `getGlobalTemplatesDir`, and the `globalTemplatesDir` variable. Replace the entire top section with the file content from the spec.

In `src/utils/path.js`, replace lines 1-27 with:

```javascript
import { homedir } from 'os';
import { resolve, dirname, basename } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = resolve(__dirname, '../../templates');

export const SPEC_CENTER_NAME = 'spec-center';
export const SPEC_CENTER_SUFFIX = '-spec-center';

export function resolveTemplatesDir(...subPaths) {
  return resolve(TEMPLATES_DIR, ...subPaths);
}

export function expandHome(inputPath) {
  if (inputPath.startsWith('~')) {
    return resolve(inputPath.replace(/^~/, homedir()));
  }
  return resolve(inputPath);
}

const PROJECT_NAME_REGEX = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

export function validateProjectName(name) {
  if (!PROJECT_NAME_REGEX.test(name)) {
    return 'Must start with lowercase letter, only lowercase/digits/hyphens';
  }
  if (name.length < 2 || name.length > 50) {
    return 'Must be 2-50 characters';
  }
  return true;
}

export function extractProjectName(specCenterDir) {
  const dirName = basename(specCenterDir);
  return dirName.slice(0, -SPEC_CENTER_SUFFIX.length);
}
```

- [ ] **Step 2: Verify path.js exports still work**

```bash
node -e "import { resolveTemplatesDir, SPEC_CENTER_NAME, validateProjectName } from './src/utils/path.js'; console.log(resolveTemplatesDir()); console.log(SPEC_CENTER_NAME); console.log(validateProjectName('acme'));"
```

Expected: prints templates directory path, `spec-center`, and `true`.

- [ ] **Step 3: Commit**

```bash
git add src/utils/path.js
git commit -m "refactor: remove global templates dir state from path.js"
```

---

### Task 2: Enhance `parseModuleList` and remove old prompt functions

**Files:**
- Modify: `src/utils/prompt.js`

- [ ] **Step 1: Change the import line**

Change from:
```javascript
import { input, checkbox, confirm, select } from '@inquirer/prompts';
```
to:
```javascript
import { input, select } from '@inquirer/prompts';
```

- [ ] **Step 2: Remove `promptModules` and `promptAddOneModule` functions**

Delete the `promptModules` function (currently around lines 30-44) and `promptAddOneModule` function (currently around lines 63-80).

- [ ] **Step 3: Replace `parseModuleList` with name=template support**

Replace the existing `parseModuleList` function with the version that supports `name=template` syntax and `takenNames` validation. See the spec for the full implementation signature:

```javascript
export function parseModuleList(moduleStr, takenNames = []) {
  const templates = getAvailableTemplateNames();
  const results = [];
  const entries = moduleStr.split(',').map(s => s.trim()).filter(Boolean);

  for (const entry of entries) {
    const eqIdx = entry.indexOf('=');
    let name, templateName;
    if (eqIdx >= 0) {
      name = entry.slice(0, eqIdx);
      templateName = entry.slice(eqIdx + 1);
    } else {
      name = entry;
      templateName = entry;
    }

    if (!name) { warn(`Empty name in "${entry}" — skipping`); continue; }
    const nameValidation = validateProjectName(name);
    if (nameValidation !== true) { warn(`Invalid name "${name}": ${nameValidation} — skipping`); continue; }
    if (!templates.includes(templateName) || templateName === 'root') { warn(`Template "${templateName}" not available — skipping "${entry}"`); continue; }
    if (takenNames.includes(name)) { warn(`Module "${name}" already exists — skipping "${entry}"`); continue; }

    results.push({ name, templateRef: templateName, isCustom: name !== templateName });
    takenNames.push(name);
  }
  return results;
}
```

- [ ] **Step 4: Verify parseModuleList**

```bash
node --input-type=module -e "
import { parseModuleList } from './src/utils/prompt.js';
console.log(JSON.stringify(parseModuleList('server,web,api=server'), null, 2));
"
```

Expected: prints 3 parsed modules, `api` has `isCustom: true`.

- [ ] **Step 5: Commit**

```bash
git add src/utils/prompt.js
git commit -m "feat: enhance parseModuleList with name=template syntax, remove old prompt functions"
```

---

### Task 3: Create `src/steps/detect-mode.js`

**Files:**
- Create: `src/steps/detect-mode.js`

- [ ] **Step 1: Write the implementation**

The file exports: `findSpecCenter(startDir)`, `scanExistingModules(workspaceDir, projectName)`, `detectMode(cwd, options)`.

`findSpecCenter` and `scanExistingModules` are moved from `src/commands/add.js` with the same logic. `detectMode` is new:

- If `options.name` → mode = `'init'` (explicit intent wins)
- Else if `findSpecCenter(cwd)` succeeds → mode = `'add'`, populate ctx from detection
- Else → mode = `'init'`

Both `findSpecCenter` and `scanExistingModules` share logic with the current `add.js` versions — copy them exactly as-is, adjusting only imports.

- [ ] **Step 2: Commit**

```bash
mkdir -p src/steps
git add src/steps/detect-mode.js
git commit -m "feat: add detect-mode step with findSpecCenter and scanExistingModules"
```

---

### Task 4: Create `src/steps/resolve-name.js`

**Files:**
- Create: `src/steps/resolve-name.js`

- [ ] **Step 1: Write the implementation**

```javascript
import { promptName } from '../utils/prompt.js';
import { validateProjectName } from '../utils/path.js';
import { CommandError } from '../utils/errors.js';

export async function resolveName(options) {
  if (options.name) {
    const validation = validateProjectName(options.name);
    if (validation !== true) throw new CommandError(`Invalid project name: ${validation}`);
    return options.name;
  }
  return promptName();
}
```

- [ ] **Step 2: Commit**

```bash
git add src/steps/resolve-name.js
git commit -m "feat: add resolve-name step"
```

---

### Task 5: Create `src/steps/resolve-dir.js`

**Files:**
- Create: `src/steps/resolve-dir.js`

- [ ] **Step 1: Write the implementation**

```javascript
import path from 'path';
import { expandHome } from '../utils/path.js';
import { promptDir } from '../utils/prompt.js';

export async function resolveDir(cwd, projectName, options) {
  if (options.dir) return expandHome(options.dir);
  const defaultDir = path.join(cwd, projectName);
  const dirInput = await promptDir(defaultDir);
  return expandHome(dirInput);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/steps/resolve-dir.js
git commit -m "feat: add resolve-dir step"
```

---

### Task 6: Create `src/steps/module-loop.js`

**Files:**
- Create: `src/steps/module-loop.js`

- [ ] **Step 1: Write the implementation**

```javascript
import { select, confirm } from '@inquirer/prompts';
import { getAvailableTemplateNames } from '../core/templates.js';
import { parseModuleList, promptModuleName } from '../utils/prompt.js';
import { SPEC_CENTER_NAME } from '../utils/path.js';

export async function moduleLoop(ctx, options, initialModules = []) {
  const takenNames = [...ctx.existingModules, ...initialModules.map(m => m.name)];

  if (options.modules) {
    const parsed = parseModuleList(options.modules, takenNames);
    return [...initialModules, ...parsed];
  }

  const modules = [...initialModules];
  const templates = getAvailableTemplateNames().filter(t => t !== SPEC_CENTER_NAME && t !== 'root');
  const sessionAddedNames = initialModules.map(m => m.name);

  while (true) {
    if (templates.length === 0) break;
    const templateName = await select({
      message: 'Select a module to add:',
      choices: templates.map(t => ({ name: t, value: t })),
    });
    const mod = await promptModuleName(templateName, [...takenNames], sessionAddedNames);
    modules.push(mod);
    takenNames.push(mod.name);
    sessionAddedNames.push(mod.name);
    const more = await confirm({ message: 'Add another module?', default: false });
    if (!more) break;
  }
  return modules;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/steps/module-loop.js
git commit -m "feat: add module-loop step with interactive single-select and name=template support"
```

---

### Task 7: Create `src/steps/review-table.js`

**Files:**
- Create: `src/steps/review-table.js`

- [ ] **Step 1: Write the implementation**

The file exports `reviewTable(ctx, options, modules)`. When `options.modules` is set (non-interactive), return modules immediately with `removable` property added. Otherwise, display the table and show a menu with: Confirm and proceed, Edit module name, Remove a module, Add another module. The `_displayTable` helper renders the formatted table with columns for #, Module, Template, Status.

- [ ] **Step 2: Commit**

```bash
git add src/steps/review-table.js
git commit -m "feat: add review-table step with edit/remove/add/confirm loop"
```

---

### Task 8: Create `src/commands/scaffold.js`

**Files:**
- Create: `src/commands/scaffold.js`

- [ ] **Step 1: Write the orchestrator**

This is the main `scaffoldCommand(options)` function that ties all steps together:

1. Call `detectMode(cwd, options)` → get `{ mode, ctx }`
2. If `init`: resolve name and dir, add spec-center to modules
3. If `add`: use values from ctx, warn about `--dir` if provided
4. Call `moduleLoop(ctx, options, modules)` → get module list
5. Filter spec-center and duplicates in add mode
6. Call `reviewTable(ctx, options, modules)` → get final module list
7. If `--dry-run`, print and return
8. For init: mkdir workspace, copy root template
9. Create each module via `createModule`
10. Sync AGENTS.md (full for init, merge for add)
11. Print summary

- [ ] **Step 2: Commit**

```bash
git add src/commands/scaffold.js
git commit -m "feat: add unified scaffold command orchestrator"
```

---

### Task 9: Rewrite `src/cli.js`

**Files:**
- Modify: `src/cli.js`

- [ ] **Step 1: Replace cli.js with single scaffold command**

Remove `import { initCommand }`, `import { addCommand }`, `import { setGlobalTemplatesDir }`. Add `import { scaffoldCommand }`. Replace the two `.command(...)` blocks with a single default action:

```javascript
program
  .name('scaffold')
  .description('Multi-repo workspace scaffold tool')
  .version(pkg.version)
  .option('--verbose', 'Enable debug output')
  .option('-n, --name <name>', 'Project name (init mode)')
  .option('-d, --dir <path>', 'Workspace directory (init mode)')
  .option('-m, --modules <list>', 'Modules: "name" or "name=template", comma-separated')
  .option('--dry-run', 'Show what would be created')
  .action(async (options) => {
    if (program.opts().verbose) setVerbose(true);
    if (options.dir) warnIfTraversalPath(options.dir, '--dir');
    await scaffoldCommand(options);
  });
```

Remove `--templates-dir` option and the `warnIfTraversalPath` call for templates-dir. Keep the error handler unchanged.

- [ ] **Step 2: Verify CLI help**

```bash
node src/cli.js --help
```

Expected: shows `scaffold` command name with options `-n`, `-d`, `-m`, `--dry-run`, `--verbose`, `-V`, `-h`. No subcommands.

- [ ] **Step 3: Commit**

```bash
git add src/cli.js
git commit -m "refactor: replace subcommands with single scaffold command"
```

---

### Task 10: Remove old command files

**Files:**
- Delete: `src/commands/init.js`
- Delete: `src/commands/add.js`

- [ ] **Step 1: Delete old files**

```bash
git rm src/commands/init.js src/commands/add.js
```

- [ ] **Step 2: Commit**

```bash
git commit -m "refactor: remove old init.js and add.js command files"
```

---

### Task 11: Write tests for new step files

**Files:**
- Create: `tests/steps/detect-mode.test.js`
- Create: `tests/steps/module-loop.test.js`
- Create: `tests/steps/review-table.test.js`

- [ ] **Step 1: Write `tests/steps/detect-mode.test.js`**

Copy `findSpecCenter` and `scanExistingModules` tests from `tests/commands/add-unit.test.js`. Add `detectMode` tests: init mode with `--name`, add mode with spec-center found, init mode with nothing found.

```bash
mkdir -p tests/steps
```

- [ ] **Step 2: Run detect-mode tests**

```bash
npx vitest run tests/steps/detect-mode.test.js
```

- [ ] **Step 3: Write `tests/steps/module-loop.test.js`**

Tests for: non-interactive with `-m`, name=template syntax, initial modules appended, duplicates skipped.

- [ ] **Step 4: Run module-loop tests**

```bash
npx vitest run tests/steps/module-loop.test.js
```

- [ ] **Step 5: Write `tests/steps/review-table.test.js`**

Tests for: non-interactive skips review, confirm exits, remove then confirm.

- [ ] **Step 6: Run review-table tests**

```bash
npx vitest run tests/steps/review-table.test.js
```

- [ ] **Step 7: Commit step tests**

```bash
git add tests/steps/
git commit -m "test: add unit tests for new step files"
```

---

### Task 12: Write integration tests for the scaffold command

**Files:**
- Create: `tests/commands/scaffold.test.js`

- [ ] **Step 1: Write the integration test file**

Merge test cases from `tests/commands/init.test.js` and `tests/commands/add.test.js`:
- Init mode: create workspace with spec-center only, multiple modules, name=template, dry-run, auto-include spec-center
- Add mode: add module to existing workspace, add renamed module, skip existing, dry-run
- Remove all `--templates-dir` flags from CLI invocations

- [ ] **Step 2: Run integration tests**

```bash
npx vitest run tests/commands/scaffold.test.js
```

- [ ] **Step 3: Commit**

```bash
git add tests/commands/scaffold.test.js
git commit -m "test: add unified scaffold integration tests"
```

---

### Task 13: Update existing tests

**Files:**
- Modify: `tests/utils/prompt.test.js` — update `parseModuleList` tests for new signature
- Modify: `tests/core/scaffold.test.js` — remove `setGlobalTemplatesDir`/`resetGlobalTemplatesDir`
- Modify: `tests/core/templates.test.js` — remove `setGlobalTemplatesDir`/`resetGlobalTemplatesDir`
- Modify: `tests/utils/path.test.js` — remove `resetGlobalTemplatesDir` import
- Delete: `tests/commands/init.test.js`
- Delete: `tests/commands/add.test.js`
- Delete: `tests/commands/add-unit.test.js`

- [ ] **Step 1: Update `tests/utils/prompt.test.js`**

Replace the `parseModuleList` describe block with tests for: comma-separated names, name=template syntax, mixed plain and name=template, empty items filtered, whitespace trimmed, whitespace in name=template, duplicate names skipped, takenNames conflicts skipped, invalid template skipped, invalid name format skipped, empty name in name=template skipped, empty string returns [].

- [ ] **Step 2: Run prompt tests**

```bash
npx vitest run tests/utils/prompt.test.js
```

- [ ] **Step 3: Update `tests/core/scaffold.test.js`**

Remove `import { setGlobalTemplatesDir, resetGlobalTemplatesDir } from '../../src/utils/path.js';`. Remove `const TEMPLATES_DIR = ...`. Remove `setGlobalTemplatesDir(TEMPLATES_DIR)` from `beforeEach`. Remove `resetGlobalTemplatesDir()` from `afterEach`.

- [ ] **Step 4: Run scaffold core tests**

```bash
npx vitest run tests/core/scaffold.test.js
```

- [ ] **Step 5: Update `tests/core/templates.test.js`**

Remove `import { setGlobalTemplatesDir, resetGlobalTemplatesDir }` and `const TEMPLATES_DIR`. Remove `beforeEach` and `afterEach` blocks.

- [ ] **Step 6: Run templates tests**

```bash
npx vitest run tests/core/templates.test.js
```

- [ ] **Step 7: Update `tests/utils/path.test.js`**

Remove `resetGlobalTemplatesDir` from the import on line 2.

- [ ] **Step 8: Run path tests**

```bash
npx vitest run tests/utils/path.test.js
```

- [ ] **Step 9: Delete old test files and commit**

```bash
git rm tests/commands/init.test.js tests/commands/add.test.js tests/commands/add-unit.test.js
git add tests/utils/prompt.test.js tests/core/scaffold.test.js tests/core/templates.test.js tests/utils/path.test.js
git commit -m "test: update existing tests for unified scaffold and removed global templates dir"
```

---

### Task 14: Run full test suite and fix issues

- [ ] **Step 1: Run the full test suite**

```bash
npx vitest run
```

Expected: all tests PASS.

- [ ] **Step 2: Verify CLI works end-to-end**

```bash
mkdir -p /tmp/scaffold-test
node src/cli.js -n endtoend -d /tmp/scaffold-test/endtoend -m server,web --verbose
ls -la /tmp/scaffold-test/endtoend/
```

Expected: workspace with `endtoend-spec-center/`, `endtoend-server/`, `endtoend-web/`.

- [ ] **Step 3: Test add mode**

```bash
cd /tmp/scaffold-test/endtoend && node /Users/kang/Workspace/codes/polyrepo-starter/src/cli.js -m mobile --verbose
ls -la /tmp/scaffold-test/endtoend/
```

Expected: `endtoend-mobile/` added.

- [ ] **Step 4: Clean up**

```bash
rm -rf /tmp/scaffold-test
```

- [ ] **Step 5: Final commit if fixes needed**

```bash
git add -A && git commit -m "chore: final test fixes for unified scaffold"
```

---

### Task 15: Final repo state verification

- [ ] **Step 1: Verify no references to removed symbols remain**

```bash
rg 'setGlobalTemplatesDir|resetGlobalTemplatesDir|getGlobalTemplatesDir' src/ tests/ || echo "No references found — clean"
```

- [ ] **Step 2: Verify no references to old command files**

```bash
rg "from.*commands/(init|add)\.js" src/ tests/ || echo "No references found — clean"
```

- [ ] **Step 3: Verify source file structure**

```bash
find src/ -type f | sort
```

Expected output:
```
src/cli.js
src/commands/scaffold.js
src/core/agents-sync.js
src/core/scaffold.js
src/core/templates.js
src/steps/detect-mode.js
src/steps/module-loop.js
src/steps/resolve-dir.js
src/steps/resolve-name.js
src/steps/review-table.js
src/utils/errors.js
src/utils/logger.js
src/utils/path.js
src/utils/prompt.js
```

- [ ] **Step 5: Run full tests one final time**

```bash
npx vitest run
```

Expected: all tests PASS.

- [ ] **Step 6: Final commit**

```bash
git add -A && git commit -m "feat: complete unified scaffold merge — final state"
```
