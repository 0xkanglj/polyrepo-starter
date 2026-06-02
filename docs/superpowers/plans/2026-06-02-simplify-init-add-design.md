# Simplify init/add Command Interaction Logic — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the `+ Custom module...` flow from both `init` and `add` commands, simplify `init` to a fixed-module multi-select, and refactor `add` into a single-select + optional rename loop that absorbs custom module capability.

**Architecture:** Three prompt functions drive the change: `promptModules()` (simplified, no custom), `promptAddOneModule()` (new, single select), and `promptModuleName()` (new, name input with validation loop). The `add` command is rewritten around a while-loop that calls these two new functions. CLI loses the `-c, --custom` flag. `buildModuleRole()` in agents-sync learns to use the template reference for role description when a module is custom.

**Tech Stack:** Node.js (ESM), `@inquirer/prompts` (input, checkbox, confirm, select), Vitest, `tmp-promise`

---

## File Structure

| File | Responsibility |
|---|---|
| `src/utils/prompt.js` | All interactive prompt functions. Remove `promptCustomModule()` and `promptAddModules()`. Simplify `promptModules()`. Add `promptAddOneModule()` and `promptModuleName()`. |
| `src/commands/add.js` | Add command logic. Remove `parseCustomModules()`. Rewrite `addCommand()` into single-select loop. |
| `src/cli.js` | CLI flag definitions. Remove `-c, --custom` from add command. |
| `src/core/agents-sync.js` | AGENTS.md generation. Update `buildModuleRole()` for custom modules with template references. |
| `src/commands/init.js` | Init command logic. **No changes needed** — `promptModules()` signature unchanged. |
| `tests/commands/add.test.js` | Integration tests for add command. Remove `-c` tests. Add dry-run loop test. |
| `tests/commands/add-unit.test.js` | Unit tests for `findSpecCenter` / `scanExistingModules`. **No changes needed.** |
| `tests/utils/prompt.test.js` | New file. Unit tests for `promptModuleName()` validation and `parseModuleList()`. |

---

### Task 1: Simplify `promptModules()` — Remove Custom Option

**Files:**
- Modify: `src/utils/prompt.js:38-67`

- [ ] **Step 1: Write the test for simplified promptModules output shape**

Since `promptModules()` uses `checkbox()` from `@inquirer/prompts` (interactive), we verify the function's contract by testing that it no longer references `__custom__` in its code path. The integration tests in `init.test.js` already cover the happy path. We will test the function's module-output shape directly by mocking `checkbox`.

Create `tests/utils/prompt.test.js`:

```js
import { describe, it, expect, vi } from 'vitest';
import { parseModuleList } from '../../src/utils/prompt.js';

describe('parseModuleList', () => {
  it('parses comma-separated module names', () => {
    const result = parseModuleList('server,web,mobile');
    expect(result).toEqual([
      { name: 'server', templateRef: 'server', isCustom: false },
      { name: 'web', templateRef: 'web', isCustom: false },
      { name: 'mobile', templateRef: 'mobile', isCustom: false },
    ]);
  });

  it('filters empty items from the list', () => {
    const result = parseModuleList('server,,web,');
    expect(result).toEqual([
      { name: 'server', templateRef: 'server', isCustom: false },
      { name: 'web', templateRef: 'web', isCustom: false },
    ]);
  });

  it('trims whitespace around names', () => {
    const result = parseModuleList(' server , web ');
    expect(result).toEqual([
      { name: 'server', templateRef: 'server', isCustom: false },
      { name: 'web', templateRef: 'web', isCustom: false },
    ]);
  });

  it('returns empty array for empty string', () => {
    const result = parseModuleList('');
    expect(result).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the test to verify it passes**

Run: `npx vitest run tests/utils/prompt.test.js`
Expected: PASS (parseModuleList is unchanged)

- [ ] **Step 3: Simplify `promptModules()` — remove custom option and `promptCustomModule()` call**

In `src/utils/prompt.js`, replace the entire `promptModules()` function (lines 38–67) with:

```js
/**
 * 交互式选择模块（用于 init 命令）
 * 展示 templates/ 下除 spec-center 外的所有模块，不含 custom 选项
 * @returns {Promise<Array<{name: string, templateRef: string, isCustom: false}>>}
 */
export async function promptModules() {
  const available = getAvailableTemplateNames().filter(
    (name) => name !== SPEC_CENTER_NAME
  );

  const selected = await checkbox({
    message: 'Select modules:',
    choices: available.map((name) => ({ name, value: name })),
    required: false,
  });

  return selected.map((name) => ({ name, templateRef: name, isCustom: false }));
}
```

- [ ] **Step 4: Remove `promptCustomModule()` function**

Delete lines 102–129 (the entire `promptCustomModule` function) from `src/utils/prompt.js`.

- [ ] **Step 5: Remove unused import `warn`**

In `src/utils/prompt.js` line 4, remove `warn` from the import since it's only used inside `parseModuleList`. Wait — `warn` is still used in `parseModuleList()` (line 139). Keep the import.

- [ ] **Step 6: Run all existing tests to verify nothing is broken**

Run: `npx vitest run tests/commands/init.test.js`
Expected: PASS (init uses `promptModules` only via `-m` flag in tests, not interactive)

- [ ] **Step 7: Commit**

```bash
git add src/utils/prompt.js tests/utils/prompt.test.js
git commit -m "refactor: simplify promptModules() — remove custom module option from init"
```

---

### Task 2: Remove `-c, --custom` CLI Flag

**Files:**
- Modify: `src/cli.js:52-54`

- [ ] **Step 1: Remove the `-c, --custom` option from add command in cli.js**

In `src/cli.js`, remove lines 52–54 (the `.option('-c, --custom', ...)` call and its variadic handler). The add command block becomes:

```js
program
  .command('add')
  .description('Add modules to existing workspace')
  .option('-m, --modules <list>', 'Comma-separated modules to add')
  .option('--templates-dir <path>', 'Override templates directory')
  .option('--dry-run', 'Show what would be created')
  .action(async (options) => {
    if (program.opts().verbose) setVerbose(true);
    if (options.templatesDir) {
      warnIfTraversalPath(options.templatesDir, '--templates-dir');
      setGlobalTemplatesDir(options.templatesDir);
    }
    await addCommand(options);
  });
```

- [ ] **Step 2: Run integration tests to verify**

Run: `npx vitest run tests/commands/add.test.js`
Expected: Tests that use `-c` will FAIL — that's expected, we'll fix them in Task 4.

- [ ] **Step 3: Commit**

```bash
git add src/cli.js
git commit -m "refactor: remove -c/--custom flag from add command"
```

---

### Task 3: Add New Prompt Functions for add Command

**Files:**
- Modify: `src/utils/prompt.js` (append new functions)

- [ ] **Step 1: Add `promptAddOneModule()` function**

Append to the end of `src/utils/prompt.js` (after `parseModuleList()`):

```js
/**
 * 交互式单选一个模块（用于 add 命令）
 * 展示所有模板（排除 spec-center），不区分已存在与否
 * @param {string[]} existingModules - 已有模块名列表（预留，暂不使用）
 * @returns {Promise<{templateName: string}>}
 */
export async function promptAddOneModule(existingModules) {
  const templates = getAvailableTemplateNames().filter(
    (t) => t !== SPEC_CENTER_NAME
  );

  if (templates.length === 0) {
    throw new CommandError('No modules available to add.');
  }

  const templateName = await select({
    message: '选择要添加的模块:',
    choices: templates.map((t) => ({ name: t, value: t })),
  });

  return { templateName };
}
```

Also add `CommandError` to the imports at the top of `prompt.js`:

```js
import { CommandError } from './errors.js';
```

- [ ] **Step 2: Add `promptModuleName()` function**

Append after `promptAddOneModule()`:

```js
/**
 * 交互式确认/输入模块名，含合法性+唯一性校验循环
 * @param {string} templateName - 选中的模板名
 * @param {string[]} existingModules - workspace 中已有模块名
 * @param {string[]} sessionAdded - 本次会话已添加的模块名
 * @returns {Promise<{name: string, templateRef: string, isCustom: boolean}>}
 */
export async function promptModuleName(templateName, existingModules, sessionAdded) {
  const allTaken = [...existingModules, ...sessionAdded];
  const templateNameTaken = existingModules.includes(templateName);

  // Determine default value and warning hint
  const hasDefault = !templateNameTaken;
  let hintMessage = '';
  if (templateNameTaken) {
    hintMessage = `⚠ 模块 "${templateName}" 已存在，请输入不同的名称`;
  }

  // Validation function
  function validateModuleName(value) {
    const name = value.trim();

    // Non-empty
    if (!name) {
      return '模块名不能为空';
    }

    // Regex check: same rules as project name
    const regexResult = validateProjectName(name);
    if (regexResult !== true) {
      return regexResult;
    }

    // Uniqueness against workspace + session
    if (allTaken.includes(name)) {
      return `模块名 "${name}" 已被使用`;
    }

    return true;
  }

  // Prompt loop: if validation fails, re-prompt
  const name = await input({
    message: hintMessage
      ? `${hintMessage}\n  模块名:`
      : '模块名:',
    default: hasDefault ? templateName : undefined,
    validate: validateModuleName,
  });

  const trimmedName = name.trim();
  return {
    name: trimmedName,
    templateRef: templateName,
    isCustom: trimmedName !== templateName,
  };
}
```

- [ ] **Step 3: Update imports — add `CommandError`**

At the top of `src/utils/prompt.js`, add `CommandError` to the import from `./errors.js`:

Change:
```js
import { validateProjectName, SPEC_CENTER_NAME } from './path.js';
```

To:
```js
import { validateProjectName, SPEC_CENTER_NAME } from './path.js';
import { CommandError } from './errors.js';
```

- [ ] **Step 4: Remove `promptAddModules()` function**

Delete lines 74–96 (the entire `promptAddModules` function) from `src/utils/prompt.js`.

- [ ] **Step 5: Write unit tests for `promptModuleName()` validation**

Add to `tests/utils/prompt.test.js`:

```js
import { promptModuleName } from '../../src/utils/prompt.js';
import { input } from '@inquirer/prompts';

vi.mock('@inquirer/prompts', () => ({
  input: vi.fn(),
  checkbox: vi.fn(),
  confirm: vi.fn(),
  select: vi.fn(),
}));
```

Then add test cases:

```js
describe('promptModuleName', () => {
  it('returns isCustom=false when name equals templateName', async () => {
    input.mockResolvedValueOnce('server');
    const result = await promptModuleName('server', [], []);
    expect(result).toEqual({
      name: 'server',
      templateRef: 'server',
      isCustom: false,
    });
  });

  it('returns isCustom=true when name differs from templateName', async () => {
    input.mockResolvedValueOnce('crawler');
    const result = await promptModuleName('server', [], []);
    expect(result).toEqual({
      name: 'crawler',
      templateRef: 'server',
      isCustom: true,
    });
  });

  it('rejects empty name', async () => {
    input.mockResolvedValueOnce('');
    // validation should catch it — input() re-prompts on validation failure
    // We test the validate function directly via the mock call
    const validateFn = input.mock.calls[0][0].validate;
    expect(validateFn('')).toBe('模块名不能为空');
  });

  it('rejects name that conflicts with existing module', async () => {
    input.mockResolvedValueOnce('server');
    const validateFn = input.mock.calls[0][0].validate;
    expect(validateFn('server')).toBe('模块名 "server" 已被使用');
  });

  it('rejects name that conflicts with session-added module', async () => {
    input.mockResolvedValueOnce('crawler');
    const validateFn = input.mock.calls[0][0].validate;
    expect(validateFn('crawler')).toBe('模块名 "crawler" 已被使用');
  });

  it('rejects invalid name format', async () => {
    input.mockResolvedValueOnce('INVALID');
    const validateFn = input.mock.calls[0][0].validate;
    expect(typeof validateFn('INVALID')).toBe('string');
  });

  it('provides no default when template name is taken', async () => {
    input.mockResolvedValueOnce('myserver');
    await promptModuleName('server', ['server'], []);
    expect(input.mock.calls[0][0].default).toBeUndefined();
  });

  it('provides template name as default when not taken', async () => {
    input.mockResolvedValueOnce('server');
    await promptModuleName('server', [], []);
    expect(input.mock.calls[0][0].default).toBe('server');
  });
});
```

- [ ] **Step 6: Run the prompt tests**

Run: `npx vitest run tests/utils/prompt.test.js`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/utils/prompt.js tests/utils/prompt.test.js
git commit -m "feat: add promptAddOneModule() and promptModuleName() for add command"
```

---

### Task 4: Rewrite `addCommand()` — Single-Select Loop

**Files:**
- Modify: `src/commands/add.js`

- [ ] **Step 1: Update imports in add.js**

Replace the import line:

```js
import { promptAddModules, parseModuleList, promptCustomModule } from '../utils/prompt.js';
```

With:

```js
import { parseModuleList, promptAddOneModule, promptModuleName } from '../utils/prompt.js';
```

Also remove the unused `validateTemplate` import (it's no longer used directly in add.js after removing `parseCustomModules`). Change:

```js
import { getAvailableTemplateNames, validateTemplate } from '../core/templates.js';
```

To:

```js
import { getAvailableTemplateNames } from '../core/templates.js';
```

Also remove the `confirm` import from `@inquirer/prompts` on line 14 — we will import it inline:

Actually, keep it. We'll use `confirm` from `@inquirer/prompts` for the "继续添加？" prompt.

- [ ] **Step 2: Remove `parseCustomModules()` function**

Delete lines 67–87 (the entire `parseCustomModules` function) from `src/commands/add.js`.

- [ ] **Step 3: Rewrite `addCommand()` function**

Replace the entire `addCommand` export (lines 93–183) with:

```js
/**
 * add 子命令：追加模块到已有 workspace
 * @param {object} options - Commander 解析的选项
 */
export async function addCommand(options) {
  try {
    const cwd = process.cwd();

    // 1. 检测 workspace
    const specCenterDir = findSpecCenter(cwd);
    if (!specCenterDir) {
      throw new CommandError(
        'Not in a workspace directory. No *-spec-center/ found in current or parent directories.'
      );
    }

    const workspaceDir = path.dirname(specCenterDir);
    const projectName = extractProjectName(specCenterDir);
    const existingModules = scanExistingModules(workspaceDir, projectName);

    info(`Detected workspace: ${workspaceDir}`);
    info(`Detected project:   ${projectName}`);
    info(`Existing modules:   ${existingModules.join(', ')}`);

    // Check if templates are available
    const templates = getAvailableTemplateNames().filter(
      (t) => t !== SPEC_CENTER_NAME
    );
    if (templates.length === 0) {
      info('No modules available to add.');
      return;
    }

    // 2. --modules: 批量模式，跳过交互循环
    if (options.modules) {
      const toAdd = parseModuleList(options.modules);
      const filtered = toAdd.filter((m) => {
        if (existingModules.includes(m.name)) {
          warn(`Module "${m.name}" already exists. Skipping.`);
          return false;
        }
        return true;
      });

      if (filtered.length === 0) {
        info('All specified modules already exist. Nothing to add.');
        return;
      }

      if (options.dryRun) {
        for (const mod of filtered) {
          console.log(`  Would create: ${moduleLabel(projectName, mod)}/`);
        }
        return;
      }

      for (const mod of filtered) {
        const modDir = path.join(workspaceDir, `${projectName}-${mod.name}`);
        createModule(mod.templateRef, modDir, projectName, mod);
      }

      if (filtered.length > 0) mergeAgentsMd(workspaceDir, projectName, filtered);
      printSummary(workspaceDir, projectName, filtered, 'added');
      return;
    }

    // 3. Interactive single-select loop
    const addedModules = [];

    while (true) {
      const { templateName } = await promptAddOneModule(existingModules);

      const mod = await promptModuleName(
        templateName,
        existingModules,
        addedModules.map((m) => m.name),
      );

      if (options.dryRun) {
        console.log(`  Would create: ${moduleLabel(projectName, mod)}/`);
      } else {
        const modDir = path.join(workspaceDir, `${projectName}-${mod.name}`);
        createModule(mod.templateRef, modDir, projectName, mod);
      }

      addedModules.push(mod);
      existingModules.push(mod.name);

      const more = await confirm({
        message: '继续添加下一个模块？',
        default: false,
      });
      if (!more) break;
    }

    if (!options.dryRun && addedModules.length > 0) {
      mergeAgentsMd(workspaceDir, projectName, addedModules);
    }

    printSummary(workspaceDir, projectName, addedModules, 'added');
  } catch (err) {
    if (err.name === 'ExitPromptError') {
      info('Aborted.');
      // TODO: list already-created modules — not rolling back
      return;
    }
    if (err instanceof CommandError) throw err;
    throw new CommandError(`add failed: ${err.message}`);
  }
}
```

- [ ] **Step 4: Add `SPEC_CENTER_NAME` import to add.js**

Add `SPEC_CENTER_NAME` to the import from `../utils/path.js`:

```js
import {
  expandHome,
  validateProjectName,
  extractProjectName,
  SPEC_CENTER_SUFFIX,
  SPEC_CENTER_NAME,
} from '../utils/path.js';
```

Note: `expandHome` and `validateProjectName` may no longer be used after removing `parseCustomModules`. Check and clean:

- `expandHome` — not used in add.js. Remove.
- `validateProjectName` — not used in add.js (validation moved to `promptModuleName`). Remove.

Updated import:

```js
import {
  extractProjectName,
  SPEC_CENTER_SUFFIX,
  SPEC_CENTER_NAME,
} from '../utils/path.js';
```

- [ ] **Step 5: Run unit tests**

Run: `npx vitest run tests/commands/add-unit.test.js`
Expected: PASS (findSpecCenter and scanExistingModules unchanged)

- [ ] **Step 6: Commit**

```bash
git add src/commands/add.js
git commit -m "refactor: rewrite addCommand() as single-select loop with rename support"
```

---

### Task 5: Update Integration Tests for add Command

**Files:**
- Modify: `tests/commands/add.test.js`

- [ ] **Step 1: Remove tests that use `-c` flag**

Remove the following test cases from `tests/commands/add.test.js`:

- `'adds custom module with -c flag'` (lines 53–66)
- `'fails with invalid custom module format'` (lines 80–90)
- `'fails with non-existent template ref'` (lines 92–102)
- `'fails with invalid custom module name'` (lines 104–114)

- [ ] **Step 2: Add dry-run integration test**

Add a new test case in `tests/commands/add.test.js`:

```js
it('shows dry-run without creating files for --modules', () => {
  const output = execSync(
    `node "${CLI_PATH}" add -m web --dry-run --templates-dir "${TEMPLATES_DIR}"`,
    { cwd: workspaceDir, encoding: 'utf-8' }
  );

  expect(output).toContain('Would create: acme-web/');
  expect(existsSync(resolve(workspaceDir, 'acme-web'))).toBe(false);
});
```

- [ ] **Step 3: Verify the "adds a module" and "skips already existing" tests still pass**

Run: `npx vitest run tests/commands/add.test.js`
Expected: PASS (2 existing tests + 1 new dry-run test)

- [ ] **Step 4: Commit**

```bash
git add tests/commands/add.test.js
git commit -m "test: update add integration tests — remove -c tests, add dry-run test"
```

---

### Task 6: Update `buildModuleRole()` in agents-sync.js

**Files:**
- Modify: `src/core/agents-sync.js:193-197`

- [ ] **Step 1: Update `buildModuleRole()` to use templateRef for custom modules**

Replace lines 193–197 with:

```js
function buildModuleRole(mod) {
  if (!mod.isCustom) return getModuleRole(mod.templateRef);
  // Custom module: prefer the template's role description when available
  try {
    return getModuleRole(mod.templateRef);
  } catch {
    // Fallback: template may not have AGENTS.md
    const capitalizedName = mod.name.charAt(0).toUpperCase() + mod.name.slice(1);
    return `${capitalizedName} application`;
  }
}
```

This means: when a user creates a module named "crawler" based on "server" template, the AGENTS.md will show "Backend service implementation" (the server template's role) instead of "Crawler application". The fallback to `${capitalizedName} application` only kicks in if the template doesn't have an AGENTS.md.

- [ ] **Step 2: Update agents-sync tests to reflect new behavior**

In `tests/core/agents-sync.test.js`, update the test at line 242 ("adds custom module with capitalized role name"):

Change the expected behavior — custom module now gets the *template's* role, not a capitalized fallback.

Replace the assertion block (lines 272–278):

```js
// Role should now come from the template, not capitalized name
expect(content).toContain('`crawler`');
expect(content).toContain('Backend service implementation');
```

Also update the Module Map test assertion (line 163 in the syncAgentsMd test). Change:

```js
// Custom module should have its own role name (not "Server application")
expect(content).toContain('Crawler application');
```

To:

```js
// Custom module uses template's role description
expect(content).toContain('Backend service implementation');
```

- [ ] **Step 3: Run agents-sync tests**

Run: `npx vitest run tests/core/agents-sync.test.js`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/core/agents-sync.js tests/core/agents-sync.test.js
git commit -m "feat: buildModuleRole() uses template role for custom modules"
```

---

### Task 7: Full Test Suite Verification

**Files:**
- None (verification only)

- [ ] **Step 1: Run the complete test suite**

Run: `npx vitest run`
Expected: All tests PASS

- [ ] **Step 2: Run lint / type check if available**

Run: `npm ls` (check no missing deps)
Expected: No errors

- [ ] **Step 3: Manual smoke test — dry-run init**

Run: `node src/cli.js init --dry-run -n testproject -m spec-center,web`
Expected: Shows DRY RUN output with spec-center and web modules

- [ ] **Step 4: Manual smoke test — dry-run add (requires a workspace)**

First init a workspace:
```bash
node src/cli.js init -n smoketest -m spec-center,web
```

Then add with dry-run:
```bash
cd smoketest && node ../src/cli.js add -m server --dry-run
```
Expected: Shows "Would create: smoketest-server/"

---

### Task 8: Update README Documentation

**Files:**
- Modify: `README.md`
- Modify: `README.zh-CN.md`

- [ ] **Step 1: Remove `-c, --custom` from CLI docs in README.md**

In `README.md`, find the `add` command section and remove the line:
```
  -c, --custom <name:ref>    Add custom module (e.g. crawler:server)
```

Remove the entire "### Custom Modules" section and its example.

- [ ] **Step 2: Update README.md add command section to reflect new interaction**

Update the add command to show the new interaction:

```markdown
### `add` — Add modules to existing workspace

```bash
node src/cli.js add [options]
  -m, --modules <list>       Comma-separated modules to add
      --templates-dir <path> Override templates directory
      --dry-run              Show what would be created
```

Interactive mode prompts you to select a template, then optionally rename the module. You can reuse the same template with different names.
```

- [ ] **Step 3: Update README.zh-CN.md similarly**

Mirror the same changes in the Chinese README.

- [ ] **Step 4: Commit**

```bash
git add README.md README.zh-CN.md
git commit -m "docs: update README to reflect simplified add command"
```
