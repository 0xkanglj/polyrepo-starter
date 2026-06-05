# Unified Scaffold: Merge init/add into Single Command

**Date**: 2026-06-05  
**Status**: Draft

## Problem

The CLI has two subcommands (`init` and `add`) with overlapping module-creation logic. Users must decide which subcommand to use. The `init` command lacks module renaming, while `add` supports it. The mental model is heavier than necessary.

## Goal

Merge into a single `scaffold` command with:
- Auto-detection of mode (new workspace vs. add to existing)
- Unified module selection loop with rename support in both modes
- A review table before creation so users can edit/remove modules
- `name=template` syntax for non-interactive `-m` flag
- No backwards compatibility concerns — clean break

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Entry point | Single command `scaffold` (no subcommands) | Simplest mental model |
| Mode detection | Auto-detect via `*-spec-center/` search | User doesn't think about init vs add |
| Module selection | Single-select loop (not checkbox) | Enables per-module rename inline |
| Rename support | Available in both init and add modes | Same capability regardless of mode |
| `-m` syntax | `name` or `name=template` | Supports rename in non-interactive mode |
| spec-center | Auto-included (init) or auto-detected (add), not in template list | Never user-selectable, shown as [required] in review |
| `--templates-dir` | Removed | Simplify CLI; templates always from source |
| Review table | Interactive menu loop (Edit/Remove/Add more/Confirm) | Full control before creation |

## Architecture

### Pipeline

```
detectMode(cwd, options)
    │
    ├─ mode === 'init'
    │   resolveName(options)            --name → skip interactive / else prompt
    │   resolveDir(cwd, name, options)  --dir → skip interactive / else prompt
    │   mkdirIfNeeded(workspaceDir)
    │   copyAndReplace('root', ...)
    │   spec-center auto-added to modules
    │
    └─ mode === 'add'
        workspaceDir, projectName from findSpecCenter()
        existingModules from scanExistingModules()
        --name / --dir ignored (info log)
        spec-center already exists

    │ (shared flow)
    moduleLoop(ctx, options)
      → selectTemplate()           template list excludes spec-center
      → promptModuleName()         rename optional, check conflicts
      → "Add another?"             loop

    reviewTable(ctx, modules)
      → display table (spec-center shown as [required])
      → menu: Edit name / Remove / Add more / Confirm and proceed
      → loop until Confirm

    createModule(...) × N          batch creation
    syncAgents(workspaceDir, projectName, allModules)
    printSummary(...)
```

### Directory Structure

```
src/
├── cli.js                      # Single scaffold command, no subcommands
├── commands/
│   └── scaffold.js             # runScaffold(): detectMode → pipeline
├── steps/
│   ├── detect-mode.js          # detectMode(cwd, options) → ctx
│   ├── resolve-name.js         # resolveName(options) → name
│   ├── resolve-dir.js          # resolveDir(cwd, name, options) → workspaceDir
│   ├── module-loop.js          # moduleLoop(ctx, options) → modules[]
│   └── review-table.js         # reviewTable(ctx, modules) → finalModules[]
├── core/                       # unchanged
│   ├── scaffold.js             # copyAndReplace, createModule, gitInit
│   ├── templates.js            # getAvailableTemplateNames, getModuleRole
│   └── agents-sync.js          # syncAgentsMd, mergeAgentsMd, filterAgentsMd
└── utils/                      # mostly unchanged
    ├── path.js                 # remove setGlobalTemplatesDir, resolveTemplatesDir hardcodes
    ├── prompt.js               # parseModuleList enhanced with name=template
    ├── errors.js               # unchanged
    └── logger.js               # unchanged
```

### Files Removed

- `src/commands/init.js` — logic moves to steps/
- `src/commands/add.js` — logic moves to steps/

### Files Unchanged

- `src/core/scaffold.js` — copyAndReplace, createModule, gitInit
- `src/core/templates.js` — getAvailableTemplateNames, getModuleRole, validateTemplate
- `src/core/agents-sync.js` — syncAgentsMd, mergeAgentsMd, filterAgentsMd
- `src/utils/errors.js`
- `src/utils/logger.js`

### Files Modified

- `src/cli.js` — single command, remove subcommand registration, remove `--templates-dir`
- `src/utils/path.js` — remove `setGlobalTemplatesDir`, `resetGlobalTemplatesDir`, `getGlobalTemplatesDir`; simplify `resolveTemplatesDir` to always use default
- `src/utils/prompt.js` — remove `promptModules`, `promptAddOneModule`; enhance `parseModuleList` with `name=template` syntax; keep `promptName`, `promptDir`, `promptModuleName`

## Data Structures

### Context (ctx)

```typescript
interface Ctx {
  mode: 'init' | 'add';
  cwd: string;
  projectName?: string;       // set by resolveName (init) or detectMode (add)
  workspaceDir?: string;      // set by resolveDir (init) or detectMode (add)
  existingModules: string[];  // empty [] for init, scanned for add
  specCenterExists: boolean;  // false for init, true for add
}
```

### Module

```typescript
interface Module {
  name: string;         // final module name
  templateRef: string;  // template name
  isCustom: boolean;    // name !== templateRef
  removable: boolean;   // false for spec-center, true for others
}
```

## Step Details

### detectMode(cwd, options)

```
if options.name → mode = 'init' (user explicitly wants new workspace)
else if findSpecCenter(cwd) succeeds → mode = 'add', populate ctx from detection
else → mode = 'init' (no workspace found, create new)
```

### resolveName(options)

```
if options.name → validate, return
else → interactive promptName()
```

### resolveDir(cwd, name, options)

```
if options.dir → expandHome, return
else → interactive promptDir(default: cwd/name)
```

### moduleLoop(ctx, options)

```
if options.modules → parseModuleList(options.modules, takenNames) → return

while true:
  templateName = selectTemplate(exclude: spec-center)
  mod = promptModuleName(templateName, existingModules, sessionAddedNames)
  modules.push(mod)
  if !confirm("Add another?") → break

return modules
```

For init mode: spec-center is pre-added before moduleLoop, so it's in `modules` but never shown in selector.

### reviewTable(ctx, modules)

Display:
```
Modules to create:
  #  Module                 Template       Status
  1  myproject-spec-center  spec-center    [required]
  2  myproject-server       server
  3  myproject-api          server         (renamed)

What would you like to do?
```

Menu options via inquirer select:
- **Edit module name** → select a removable row → input new name (validate uniqueness) → update table
- **Remove module** → select a removable row → remove from list
- **Add another module** → go back to moduleLoop, append results
- **Confirm and proceed** → exit review, start creation

Loop until user selects Confirm.

### parseModuleList enhancement

```
input: "server,web,api=server"
parsed:
  { name: 'server', templateRef: 'server', isCustom: false }
  { name: 'web',    templateRef: 'web',    isCustom: false }
  { name: 'api',    templateRef: 'server', isCustom: true  }
```

Validation per entry:
- Name matches `^[a-z][a-z0-9]*(-[a-z0-9]+)*$`
- Name not in `takenNames` (workspace existing + session added)
- Template exists in templates directory
- Invalid entries are skipped with warning

## CLI Interface

```
scaffold [options]

Options:
  -n, --name <name>       Project name (init mode: skip interactive name prompt)
  -d, --dir <path>        Workspace directory (init mode: skip interactive dir prompt)
  -m, --modules <list>    Modules: "name" or "name=template", comma-separated (skip interactive)
  --dry-run               Preview what would be created without writing
  --verbose               Enable debug output
  -V, --version           Show version
  -h, --help              Show help
```

No subcommands. Running `scaffold` with no flags starts interactive flow.

## Conflict Checking

During moduleLoop and reviewTable edit:
1. **Workspace existing modules** — scanned from filesystem via `scanExistingModules()`
2. **Session-added modules** — tracked in `takenNames` array throughout
3. Both checked in `promptModuleName()` validation and `parseModuleList()` filtering

## Non-interactive Mode

When `-m` is provided:
- Skip moduleLoop entirely
- Skip reviewTable
- Print a summary of what will be created
- Proceed directly to creation (unless `--dry-run`)

Init mode still needs `--name` (or interactive prompt) and `--dir` (or default).

spec-center is always auto-included in init mode regardless of `-m` content. If `-m` contains `spec-center` explicitly, it is deduplicated (no error, just skipped).

In add mode, if `-m` contains `spec-center`, it is skipped with a warning since it already exists.

## Error Handling

- No workspace found and no `--name` → interactive prompts for name/dir (init flow)
- `--name` provided but workspace detected → warn and proceed with init (explicit intent wins)
- Module name conflict → warn and skip (non-interactive) or re-prompt (interactive)
- Template not found → error with message
- ExitPromptError (Ctrl+C) → print "Aborted." and exit cleanly

## Test Impact

Tests to update:
- `tests/commands/init.test.js` → rewrite for `scaffold` command with `--name`
- `tests/commands/add.test.js` → rewrite for `scaffold` command without `--name` in workspace
- `tests/commands/add-unit.test.js` → update for new step functions
- `tests/utils/prompt.test.js` → update for `parseModuleList` enhancement
- `tests/core/*` → unchanged (core logic untouched)

New tests to add:
- `tests/steps/detect-mode.test.js`
- `tests/steps/module-loop.test.js`
- `tests/steps/review-table.test.js`
- `tests/commands/scaffold.test.js` (integration)

Tests can remove `--templates-dir` flag usage since it's no longer supported.
