# Node.js CLI Scaffold Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Bash `init.sh` with a Node.js CLI supporting `init`/`add` subcommands, AGENTS.md dynamic filtering, interactive module selection, and remote `curl | bash` execution.

**Architecture:** CLI built with Commander.js (`src/cli.js`) routing to `init`/`add` commands. Core logic in `src/core/` (scaffold, agents-sync, templates). Utilities in `src/utils/` (path, prompt, logger). Shell entry `kickstart.sh` handles remote bootstrapping. `templates/spec-center/AGENTS.md` gets HTML comment markers for module filtering.

**Tech Stack:** Node.js ≥18 (ESM), Commander ^12, @inquirer/prompts ^7, chalk ^5, ora ^8, glob ^10, vitest ^2, tmp-promise ^3

---

## File Structure

| Action | Path | Responsibility |
|--------|------|---------------|
| Create | `package.json` | Project manifest (type: module, deps, bin) |
| Create | `src/cli.js` | CLI entry with shebang, Commander program |
| Create | `src/commands/init.js` | `init` subcommand handler |
| Create | `src/commands/add.js` | `add` subcommand handler |
| Create | `src/core/scaffold.js` | `copyAndReplace()`, `gitInit()`, `mkdirIfNeeded()` |
| Create | `src/core/agents-sync.js` | `filterAgentsMd()`, `mergeAgentsMd()`, `syncAgentsMd()` |
| Create | `src/core/templates.js` | `getAvailableTemplateNames()`, `getModuleRole()`, `validateTemplate()` |
| Create | `src/utils/path.js` | `resolveTemplatesDir()`, `expandHome()`, `extractProjectName()`, global args |
| Create | `src/utils/prompt.js` | `promptName()`, `promptDir()`, `promptModules()`, `promptAddModules()`, `parseModuleList()` |
| Create | `src/utils/logger.js` | `info()`, `warn()`, `error()`, `success()`, `printDryRun()`, `printSummary()` |
| Create | `kickstart.sh` | Remote bootstrap shell script |
| Create | `tests/utils/path.test.js` | Tests for path utilities |
| Create | `tests/core/agents-sync.test.js` | Tests for AGENTS.md filtering/merging |
| Create | `tests/core/scaffold.test.js` | Tests for copyAndReplace, gitInit |
| Create | `tests/core/templates.test.js` | Tests for template discovery |
| Create | `tests/commands/init.test.js` | Integration tests for init command |
| Create | `tests/commands/add.test.js` | Integration tests for add command |
| Modify | `templates/spec-center/AGENTS.md` | Add `<!-- MODULE:xxx -->` and `<!-- BEGIN/END MODULE:xxx -->` markers |
| Delete | `init.sh` | Old Bash scaffold (replaced by Node.js CLI) |
| Modify | `README.md` | Update usage instructions for new CLI |
| Modify | `.gitignore` | Add `node_modules/` |

---

### Task 1: Project Setup — package.json and Directory Structure

**Files:**
- Create: `package.json`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "spec-center-template",
  "version": "1.0.0",
  "type": "module",
  "engines": {
    "node": ">=18.0.0"
  },
  "bin": {
    "scaffold": "./src/cli.js"
  },
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@inquirer/prompts": "^7.0.0",
    "commander": "^12.0.0",
    "chalk": "^5.0.0",
    "ora": "^8.0.0",
    "glob": "^10.0.0"
  },
  "devDependencies": {
    "vitest": "^2.0.0",
    "tmp-promise": "^3.0.0"
  }
}
```

- [ ] **Step 2: Create src/ directory structure**

Run:
```bash
mkdir -p src/commands src/core src/utils tests/commands tests/core tests/utils
```

- [ ] **Step 3: Add node_modules/ to .gitignore**

Append `node_modules/` to `.gitignore`:

```
# Dependencies
node_modules/
```

- [ ] **Step 4: Run npm install**

Run: `npm install`
Expected: `node_modules/` created, `package-lock.json` generated.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json .gitignore
git commit -m "chore: add package.json and project scaffolding for Node.js CLI"
```

---

### Task 2: Utils — Logger

**Files:**
- Create: `src/utils/logger.js`

- [ ] **Step 1: Write the logger module**

```javascript
import chalk from 'chalk';

export function info(message) {
  console.log(chalk.cyan(`[INFO] ${message}`));
}

export function warn(message) {
  console.log(chalk.yellow(`[WARN] ${message}`));
}

export function error(message) {
  console.error(chalk.red(`[ERROR] ${message}`));
}

export function success(message) {
  console.log(chalk.green(`[OK] ${message}`));
}

export function printDryRun(workspaceDir, projectName, modules) {
  console.log('');
  info('=== DRY RUN — nothing will be written ===');
  console.log('');
  console.log(`Workspace   : ${workspaceDir}`);
  console.log(`Project     : ${projectName}`);
  console.log(`Modules     : ${modules.map(m => m.name).join(', ')}`);
  console.log('');
  console.log('Would create:');
  console.log(`  ${workspaceDir}/`);
  console.log(`  ${workspaceDir}/AGENTS.md`);
  console.log(`  ${workspaceDir}/CLAUDE.md`);
  console.log(`  ${workspaceDir}/.claude/`);
  console.log(`  ${workspaceDir}/.opencode/`);
  for (const mod of modules) {
    const dirName = `${projectName}-${mod.name}`;
    const suffix = mod.isCustom ? ` (based on ${mod.templateRef})` : '';
    console.log(`  ${workspaceDir}/${dirName}/${suffix}`);
  }
  console.log('');
  info('=== END DRY RUN ===');
}

export function printSummary(workspaceDir, projectName, modules, action = 'created') {
  console.log('');
  console.log('==========================================');
  success(`Workspace ${action} successfully!`);
  console.log('==========================================');
  console.log('');
  console.log(`  Location : ${workspaceDir}`);
  console.log(`  Project  : ${projectName}`);
  console.log(`  Modules  :`);
  for (const mod of modules) {
    const suffix = mod.isCustom ? ` (based on ${mod.templateRef})` : '';
    console.log(`              ${projectName}-${mod.name}/${suffix}`);
  }
  console.log('');
  if (action === 'created') {
    info('Next steps:');
    console.log(`  1. cd ${workspaceDir}`);
    console.log('  2. Review and customize each module\'s AGENTS.md');
    console.log('  3. Define tech stack and build commands per module');
  }
  console.log('');
}
```

- [ ] **Step 2: Commit**

```bash
git add src/utils/logger.js
git commit -m "feat: add logger utility with colored output and summary printing"
```

---

### Task 3: Utils — Path Utilities

**Files:**
- Create: `src/utils/path.js`
- Create: `tests/utils/path.test.js`

- [ ] **Step 1: Write the failing tests**

```javascript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { expandHome, validateProjectName, extractProjectName, resolveTemplatesDir } from '../../src/utils/path.js';
import { homedir } from 'os';
import { resolve } from 'path';

describe('expandHome', () => {
  it('expands ~/ to home directory', () => {
    const result = expandHome('~/projects/acme');
    expect(result).toBe(resolve(homedir(), 'projects/acme'));
  });

  it('resolves relative paths to absolute', () => {
    const result = expandHome('./acme');
    expect(result).toBe(resolve('./acme'));
  });

  it('keeps absolute paths unchanged', () => {
    const result = expandHome('/Users/kang/projects/acme');
    expect(result).toBe('/Users/kang/projects/acme');
  });

  it('handles ~ without slash', () => {
    const result = expandHome('~');
    expect(result).toBe(homedir());
  });
});

describe('validateProjectName', () => {
  it('accepts valid lowercase names', () => {
    expect(validateProjectName('acme')).toBe(true);
    expect(validateProjectName('my-project')).toBe(true);
    expect(validateProjectName('a1')).toBe(true);
    expect(validateProjectName('project-123')).toBe(true);
  });

  it('rejects names starting with digit', () => {
    expect(validateProjectName('1project')).not.toBe(true);
  });

  it('rejects uppercase letters', () => {
    expect(validateProjectName('Acme')).not.toBe(true);
  });

  it('rejects underscores', () => {
    expect(validateProjectName('my_project')).not.toBe(true);
  });

  it('rejects names shorter than 2 characters', () => {
    expect(validateProjectName('a')).not.toBe(true);
  });

  it('rejects names longer than 50 characters', () => {
    expect(validateProjectName('a'.repeat(51))).not.toBe(true);
  });

  it('rejects trailing hyphen', () => {
    expect(validateProjectName('project-')).not.toBe(true);
  });

  it('rejects consecutive hyphens', () => {
    expect(validateProjectName('my--project')).not.toBe(true);
  });

  it('accepts exactly 2 characters', () => {
    expect(validateProjectName('ab')).toBe(true);
  });

  it('accepts exactly 50 characters', () => {
    const name = 'a' + '-bc'.repeat(16) + 'x'; // 1 + 48 + 1 = 50
    expect(name.length).toBe(50);
    expect(validateProjectName(name)).toBe(true);
  });
});

describe('extractProjectName', () => {
  it('extracts project name from spec-center directory path', () => {
    expect(extractProjectName('/Users/kang/projects/acme/acme-spec-center')).toBe('acme');
  });

  it('extracts project name from directory with multiple hyphens', () => {
    expect(extractProjectName('/projects/my-cool-app/my-cool-app-spec-center')).toBe('my-cool-app');
  });

  it('works with relative paths', () => {
    expect(extractProjectName('acme-spec-center')).toBe('acme');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/utils/path.test.js`
Expected: FAIL — modules not found

- [ ] **Step 3: Write the implementation**

```javascript
import { homedir } from 'os';
import { resolve, dirname, basename } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

// CLI 自身所在目录（用于定位默认 templates/ 路径）
const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_TEMPLATES_DIR = resolve(__dirname, '../../templates');

// Global args storage — set by cli.js before commands run
let globalTemplatesDir = null;

export function setGlobalTemplatesDir(dir) {
  globalTemplatesDir = dir;
}

export function getGlobalTemplatesDir() {
  return globalTemplatesDir;
}

/**
 * 解析 templates 目录路径（支持 --templates-dir 覆盖）
 * @param {...string} subPaths - 子路径片段
 * @returns {string} 解析后的绝对路径
 */
export function resolveTemplatesDir(...subPaths) {
  const base = globalTemplatesDir || DEFAULT_TEMPLATES_DIR;
  return resolve(base, ...subPaths);
}

/**
 * 展开 ~ 为 home 目录，并 resolve 为绝对路径
 * @param {string} inputPath - 输入路径
 * @returns {string} 绝对路径
 */
export function expandHome(inputPath) {
  if (inputPath.startsWith('~')) {
    return resolve(inputPath.replace(/^~/, homedir()));
  }
  return resolve(inputPath);
}

const PROJECT_NAME_REGEX = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

/**
 * 校验项目名/模块名
 * @param {string} name - 待校验名称
 * @returns {true|string} true 表示通过，字符串为错误消息
 */
export function validateProjectName(name) {
  if (!PROJECT_NAME_REGEX.test(name)) {
    return 'Must start with lowercase letter, only lowercase/digits/hyphens';
  }
  if (name.length < 2 || name.length > 50) {
    return 'Must be 2-50 characters';
  }
  return true;
}

/**
 * 从 spec-center 目录路径中提取项目名
 * e.g. "/path/to/acme-spec-center" → "acme"
 * @param {string} specCenterDir - spec-center 目录的完整路径
 * @returns {string} 项目名
 */
export function extractProjectName(specCenterDir) {
  const dirName = basename(specCenterDir);
  return dirName.replace(/-spec-center$/, '');
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/utils/path.test.js`
Expected: ALL PASS

- [ ] **Step 5: Commit**

```bash
git add src/utils/path.js tests/utils/path.test.js
git commit -m "feat: add path utilities with expandHome, validateProjectName, extractProjectName"
```

---

### Task 4: Core — Templates Discovery

**Files:**
- Create: `src/core/templates.js`
- Create: `tests/core/templates.test.js`

- [ ] **Step 1: Write the failing tests**

```javascript
import { describe, it, expect, beforeEach } from 'vitest';
import { getAvailableTemplateNames, getModuleRole, validateTemplate } from '../../src/core/templates.js';
import { setGlobalTemplatesDir } from '../../src/utils/path.js';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = resolve(__dirname, '../../templates');

describe('templates', () => {
  beforeEach(() => {
    // Point to the real templates directory for these tests
    setGlobalTemplatesDir(TEMPLATES_DIR);
  });

  describe('getAvailableTemplateNames', () => {
    it('returns all template names except root', () => {
      const names = getAvailableTemplateNames();
      expect(names).toContain('spec-center');
      expect(names).toContain('server');
      expect(names).toContain('web');
      expect(names).toContain('mobile');
      expect(names).toContain('admin');
      expect(names).not.toContain('root');
    });
  });

  describe('getModuleRole', () => {
    it('returns Role from server template', () => {
      const role = getModuleRole('server');
      expect(role).toBe('Backend service implementation');
    });

    it('returns Role from web template', () => {
      const role = getModuleRole('web');
      expect(role).toBe('Web application');
    });

    it('returns Role from mobile template', () => {
      const role = getModuleRole('mobile');
      expect(role).toBe('Mobile application');
    });

    it('returns Role from admin template', () => {
      const role = getModuleRole('admin');
      expect(role).toBe('Admin manager application');
    });
  });

  describe('validateTemplate', () => {
    it('returns true for valid template', () => {
      expect(validateTemplate('server')).toBe(true);
    });

    it('throws for non-existent template', () => {
      expect(() => validateTemplate('nonexistent')).toThrow('Template not found: nonexistent');
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/core/templates.test.js`
Expected: FAIL — module not found

- [ ] **Step 3: Write the implementation**

```javascript
import { readdirSync, statSync, readFileSync } from 'fs';
import { resolveTemplatesDir } from '../utils/path.js';

/**
 * 返回可用模板名列表（从 templates/ 目录动态发现）
 * 不包含 'root'（root 是 workspace 级配置，不是可选模块）
 * @returns {string[]}
 */
export function getAvailableTemplateNames() {
  const templatesDir = resolveTemplatesDir();
  return readdirSync(templatesDir)
    .filter(name => statSync(resolveTemplatesDir(name)).isDirectory())
    .filter(name => name !== 'root');
}

/**
 * 从模板 AGENTS.md 提取 Role 描述（## Role 下第一行）
 * @param {string} templateName - 模板名
 * @returns {string} Role 描述
 */
export function getModuleRole(templateName) {
  const agentsPath = resolveTemplatesDir(templateName, 'AGENTS.md');
  const content = readFileSync(agentsPath, 'utf-8');
  const match = content.match(/## Role\n(.+)/);
  return match ? match[1].trim() : templateName;
}

/**
 * 校验模板是否存在
 * @param {string} templateName - 模板名
 * @returns {boolean}
 * @throws {Error} 模板不存在时抛出异常
 */
export function validateTemplate(templateName) {
  const templatePath = resolveTemplatesDir(templateName);
  if (!statSync(templatePath).isDirectory()) {
    throw new Error(`Template not found: ${templateName}`);
  }
  return true;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/core/templates.test.js`
Expected: ALL PASS

- [ ] **Step 5: Commit**

```bash
git add src/core/templates.js tests/core/templates.test.js
git commit -m "feat: add templates discovery, role extraction, and validation"
```

---

### Task 5: Core — AGENTS.md Sync (filterAgentsMd)

**Files:**
- Create: `src/core/agents-sync.js`
- Create: `tests/core/agents-sync.test.js`

- [ ] **Step 1: Write the failing tests**

```javascript
import { describe, it, expect } from 'vitest';
import { filterAgentsMd } from '../../src/core/agents-sync.js';

// A realistic mini-template matching the actual spec-center/AGENTS.md structure
const TEMPLATE = `# Spec Center (SSOT)

## Architecture

### Module Map

| Module | Role |
|---|---|
<!-- MODULE:admin -->| \`admin\` | Admin manager application|
<!-- MODULE:mobile -->| \`mobile\` | Mobile application |
<!-- MODULE:server -->| \`server\` | Backend service implementation |
| \`spec-center\` | **Single Source of Truth (SSOT)** for cross-module contracts and constraints |
<!-- MODULE:web -->| \`web\` | Web application|

## Some Content

| Document | Where | Example |
|---|---|---|
| Cross-module domain spec (what) | \`spec-center/docs/specs/\` | \`2026-05-30-feature-design.md\` |
<!-- MODULE:server -->| Server implementation plan (how) | \`server/docs/plans/\` | \`2026-05-30-feature.md\` |
<!-- MODULE:web -->| Web implementation plan (how) | \`web/docs/plans/\` | \`2026-05-30-feature.md\` |

## Repository Structure

\`\`\`
workspace/
├── AGENTS.md
├── {{PROJECT}}-spec-center/
<!-- BEGIN MODULE:server -->├── {{PROJECT}}-server/
│   ├── AGENTS.md
│   └── docs/
│       ├── specs/
│       └── plans/
<!-- END MODULE:server -->
<!-- BEGIN MODULE:web -->├── {{PROJECT}}-web/
│   └── ...
<!-- END MODULE:web -->
<!-- BEGIN MODULE:mobile -->├── {{PROJECT}}-mobile/
│   └── ...
<!-- END MODULE:mobile -->
<!-- BEGIN MODULE:admin -->└── {{PROJECT}}-admin/
    └── ...
<!-- END MODULE:admin -->
\`\`\`
`;

describe('filterAgentsMd', () => {
  it('keeps only spec-center when only spec-center selected', () => {
    const result = filterAgentsMd(TEMPLATE, ['spec-center']);
    expect(result).toContain('| `spec-center` |');
    expect(result).not.toContain('<!-- MODULE:admin -->');
    expect(result).not.toContain('<!-- MODULE:server -->');
    expect(result).not.toContain('<!-- MODULE:web -->');
    expect(result).not.toContain('<!-- MODULE:mobile -->');
    expect(result).not.toContain('`admin`');
    expect(result).not.toContain('`server`');
    expect(result).not.toContain('`web`');
    expect(result).not.toContain('`mobile`');
    // spec-center lines should be present (no markers to strip)
    expect(result).toContain('SSOT');
    // BEGIN/END blocks for non-selected modules should be removed
    expect(result).not.toContain('{{PROJECT}}-server/');
    expect(result).not.toContain('{{PROJECT}}-web/');
    expect(result).not.toContain('{{PROJECT}}-mobile/');
    expect(result).not.toContain('{{PROJECT}}-admin/');
  });

  it('keeps selected modules and removes others', () => {
    const result = filterAgentsMd(TEMPLATE, ['spec-center', 'server', 'web']);
    expect(result).toContain('| `spec-center` |');
    expect(result).toContain('| `server` |');
    expect(result).toContain('| `web` |');
    expect(result).not.toContain('`admin`');
    expect(result).not.toContain('`mobile`');
    expect(result).toContain('{{PROJECT}}-server/');
    expect(result).toContain('{{PROJECT}}-web/');
    expect(result).not.toContain('{{PROJECT}}-mobile/');
    expect(result).not.toContain('{{PROJECT}}-admin/');
  });

  it('keeps all content when all modules selected', () => {
    const result = filterAgentsMd(TEMPLATE, ['spec-center', 'server', 'web', 'mobile', 'admin']);
    expect(result).toContain('| `spec-center` |');
    expect(result).toContain('| `server` |');
    expect(result).toContain('| `web` |');
    expect(result).toContain('| `mobile` |');
    expect(result).toContain('| `admin` |');
    expect(result).toContain('{{PROJECT}}-server/');
    expect(result).toContain('{{PROJECT}}-web/');
    expect(result).toContain('{{PROJECT}}-mobile/');
    expect(result).toContain('{{PROJECT}}-admin/');
  });

  it('strips MODULE markers from kept lines', () => {
    const result = filterAgentsMd(TEMPLATE, ['spec-center', 'server']);
    // The marker itself should be gone, content should remain
    expect(result).not.toMatch(/<!-- MODULE:/);
    expect(result).toContain('| `server` | Backend service implementation |');
  });

  it('strips BEGIN/END markers from kept blocks', () => {
    const result = filterAgentsMd(TEMPLATE, ['spec-center', 'server']);
    expect(result).not.toMatch(/<!-- BEGIN MODULE:/);
    expect(result).not.toMatch(/<!-- END MODULE:/);
  });

  it('preserves lines without any markers', () => {
    const result = filterAgentsMd(TEMPLATE, ['spec-center']);
    expect(result).toContain('## Architecture');
    expect(result).toContain('Cross-module domain spec');
    expect(result).toContain('workspace/');
  });

  it('handles custom module names in filter', () => {
    const result = filterAgentsMd(TEMPLATE, ['spec-center', 'crawler']);
    // crawler has no markers in template, so no crawler-specific content
    // but spec-center should still be present
    expect(result).toContain('| `spec-center` |');
    expect(result).not.toContain('`server`');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/core/agents-sync.test.js`
Expected: FAIL — module not found

- [ ] **Step 3: Write the implementation**

```javascript
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { getModuleRole } from './templates.js';

const MODULE_MARKER = /<!-- MODULE:([a-z0-9-]+) -->/;
const BEGIN_MARKER = /<!-- BEGIN MODULE:([a-z0-9-]+) -->/;
const END_MARKER = /<!-- END MODULE:([a-z0-9-]+) -->/;

/**
 * 基于 selectedModules 过滤模板中的 MODULE 标记
 * - 未选中的单行标记（<!-- MODULE:xxx -->）→ 移除整行
 * - 选中的单行标记 → 去掉标记，保留内容
 * - 未选中的多行块（<!-- BEGIN/END MODULE:xxx -->）→ 移除整个块（含标记行）
 * - 选中的多行块 → 去掉标记行，保留内容
 * @param {string} templateContent - 模板内容
 * @param {string[]} selectedModules - 选中的模块名列表
 * @returns {string} 过滤后的内容
 */
export function filterAgentsMd(templateContent, selectedModules) {
  const lines = templateContent.split('\n');
  const result = [];
  let skipMode = null;

  for (const line of lines) {
    const beginMatch = line.match(BEGIN_MARKER);
    const endMatch = line.match(END_MARKER);

    if (beginMatch) {
      if (!selectedModules.includes(beginMatch[1])) {
        skipMode = beginMatch[1];
      }
      continue; // 标记行本身不保留
    }

    if (endMatch) {
      skipMode = null;
      continue; // 标记行本身不保留
    }

    if (skipMode) continue;

    const singleMatch = line.match(MODULE_MARKER);
    if (singleMatch) {
      if (!selectedModules.includes(singleMatch[1])) {
        continue; // 未选中，跳过整行
      }
      result.push(line.replace(/<!-- MODULE:[a-z0-9-]+ -->\s?/, ''));
      continue;
    }

    result.push(line);
  }

  return result.join('\n');
}

/**
 * syncAgentsMd — init 命令调用：基于模板全量过滤后写入 spec-center AGENTS.md
 * @param {string} workspaceDir - workspace 目录
 * @param {string} projectName - 项目名
 * @param {Array<{name: string, templateRef: string, isCustom: boolean}>} modules - 选中的模块列表
 */
export function syncAgentsMd(workspaceDir, projectName, modules) {
  const templatePath = join(
    // Use the templates dir resolution
    globalThis.__templatesDir || process.cwd(),
    'templates',
    'spec-center',
    'AGENTS.md'
  );
  // Will be called with resolveTemplatesDir in real usage
  // For init, read from templates/spec-center/AGENTS.md
  const { resolveTemplatesDir } = await_import_path();
  const srcPath = resolveTemplatesDir('spec-center', 'AGENTS.md');
  const templateContent = readFileSync(srcPath, 'utf-8');

  const selectedModuleNames = modules.map(m => m.name);
  let filtered = filterAgentsMd(templateContent, selectedModuleNames);

  // For custom modules, append entries (handled in init.js via appendCustomModuleEntries)
  const destPath = join(workspaceDir, `${projectName}-spec-center`, 'AGENTS.md');
  writeFileSync(destPath, filtered, 'utf-8');
}

// Helper to lazy-import path.js (avoids circular dependency issues at test time)
function await_import_path() {
  // This will be resolved at runtime
  const { resolveTemplatesDir } = require_from_utils();
  return { resolveTemplatesDir };
}

// Actual implementation uses dynamic import
import { resolveTemplatesDir } from '../utils/path.js';

export { resolveTemplatesDir };
```

Wait — that's wrong, I'm mixing require and import. Let me write this cleanly as ESM:

```javascript
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { getModuleRole } from './templates.js';
import { resolveTemplatesDir } from '../utils/path.js';

const MODULE_MARKER = /<!-- MODULE:([a-z0-9-]+) -->/;
const BEGIN_MARKER = /<!-- BEGIN MODULE:([a-z0-9-]+) -->/;
const END_MARKER = /<!-- END MODULE:([a-z0-9-]+) -->/;

/**
 * 基于 selectedModules 过滤模板中的 MODULE 标记
 * @param {string} templateContent - 模板内容
 * @param {string[]} selectedModules - 选中的模块名列表
 * @returns {string} 过滤后的内容
 */
export function filterAgentsMd(templateContent, selectedModules) {
  const lines = templateContent.split('\n');
  const result = [];
  let skipMode = null;

  for (const line of lines) {
    const beginMatch = line.match(BEGIN_MARKER);
    const endMatch = line.match(END_MARKER);

    if (beginMatch) {
      if (!selectedModules.includes(beginMatch[1])) {
        skipMode = beginMatch[1];
      }
      continue;
    }

    if (endMatch) {
      skipMode = null;
      continue;
    }

    if (skipMode) continue;

    const singleMatch = line.match(MODULE_MARKER);
    if (singleMatch) {
      if (!selectedModules.includes(singleMatch[1])) {
        continue;
      }
      result.push(line.replace(/<!-- MODULE:[a-z0-9-]+ -->\s?/, ''));
      continue;
    }

    result.push(line);
  }

  return result.join('\n');
}

/**
 * init 命令调用：基于模板全量过滤后写入 spec-center AGENTS.md
 * @param {string} workspaceDir - workspace 目录
 * @param {string} projectName - 项目名
 * @param {Array<{name: string, templateRef: string, isCustom: boolean}>} modules - 选中的模块列表
 */
export function syncAgentsMd(workspaceDir, projectName, modules) {
  const srcPath = resolveTemplatesDir('spec-center', 'AGENTS.md');
  const templateContent = readFileSync(srcPath, 'utf-8');
  const selectedModuleNames = modules.map(m => m.name);
  const filtered = filterAgentsMd(templateContent, selectedModuleNames);
  const destPath = join(workspaceDir, `${projectName}-spec-center`, 'AGENTS.md');
  writeFileSync(destPath, filtered, 'utf-8');
}

/**
 * add 命令调用：增量 merge 新模块条目到已有 AGENTS.md
 * 只在 Module Map 表和 Repository Structure 树末尾追加新行，不修改用户已有内容
 * @param {string} workspaceDir - workspace 目录
 * @param {string} projectName - 项目名
 * @param {Array<{name: string, templateRef: string, isCustom: boolean}>} newModules - 新增模块列表
 */
export function mergeAgentsMd(workspaceDir, projectName, newModules) {
  const agentsPath = join(workspaceDir, `${projectName}-spec-center`, 'AGENTS.md');
  let content = readFileSync(agentsPath, 'utf-8');

  for (const mod of newModules) {
    // 1. Module Map 表中追加行（按字母顺序插入）
    const role = getModuleRole(mod.templateRef);
    const tableRow = `| \`${mod.name}\` | ${role} |`;
    content = insertIntoModuleMap(content, tableRow, mod.name);

    // 2. Repository Structure 树中追加子树
    const treeEntry = buildModuleTreeEntry(projectName, mod.name);
    content = insertIntoRepoTree(content, treeEntry);
  }

  writeFileSync(agentsPath, content, 'utf-8');
}

/**
 * 在 Module Map 表中按字母顺序插入新行
 */
function insertIntoModuleMap(content, newRow, moduleName) {
  const lines = content.split('\n');
  // Find the Module Map table (starts with "| Module | Role |")
  let tableStart = -1;
  let separatorIdx = -1;
  let tableEnd = -1;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('| Module |') && lines[i].includes('Role')) {
      tableStart = i;
    }
    if (tableStart !== -1 && separatorIdx === -1 && lines[i].match(/^\|---/)) {
      separatorIdx = i;
    }
    if (separatorIdx !== -1 && tableEnd === -1) {
      // Table rows continue until a line that doesn't match the pattern
      if (!lines[i].match(/^\| .* \| .* \|/)) {
        tableEnd = i - 1;
        break;
      }
    }
  }
  if (tableEnd === -1 && separatorIdx !== -1) {
    // Table goes to end of content
    tableEnd = lines.length - 1;
  }
  if (tableStart === -1 || separatorIdx === -1) return content;

  // Collect existing data rows (after separator)
  const dataRows = lines.slice(separatorIdx + 1, tableEnd + 1);
  dataRows.push(newRow);

  // Sort by module name (extract from backtick-quoted name)
  dataRows.sort((a, b) => {
    const nameA = a.match(/`([^`]+)`/)?.[1] || '';
    const nameB = b.match(/`([^`]+)`/)?.[1] || '';
    return nameA.localeCompare(nameB);
  });

  // Replace data rows in the lines array
  lines.splice(separatorIdx + 1, tableEnd - separatorIdx, ...dataRows);
  return lines.join('\n');
}

/**
 * 在 Repository Structure 代码块末尾追加子树
 */
function insertIntoRepoTree(content, treeEntry) {
  // Find the last code block closing ```
  const lastCodeBlock = content.lastIndexOf('```');
  if (lastCodeBlock === -1) return content;

  const before = content.substring(0, lastCodeBlock);
  const after = content.substring(lastCodeBlock);
  return before + treeEntry + '\n' + after;
}

/**
 * 构建模块目录子树条目
 */
function buildModuleTreeEntry(projectName, moduleName) {
  const dirName = `${projectName}-${moduleName}`;
  return `├── ${dirName}/\n│   ├── AGENTS.md\n│   └── docs/\n│       ├── specs/\n│       └── plans/`;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/core/agents-sync.test.js`
Expected: ALL PASS

- [ ] **Step 5: Commit**

```bash
git add src/core/agents-sync.js tests/core/agents-sync.test.js
git commit -m "feat: add AGENTS.md filtering with MODULE markers and merge support"
```

---

### Task 6: Core — Scaffold (copyAndReplace, gitInit)

**Files:**
- Create: `src/core/scaffold.js`
- Create: `tests/core/scaffold.test.js`

- [ ] **Step 1: Write the failing tests**

```javascript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { copyAndReplace, gitInit, mkdirIfNeeded } from '../../src/core/scaffold.js';
import { setGlobalTemplatesDir } from '../../src/utils/path.js';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, readFileSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import tmp from 'tmp-promise';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = resolve(__dirname, '../../templates');

describe('scaffold', () => {
  let tempDir;

  beforeEach(async () => {
    tempDir = await tmp.dir({ unsafeCleanup: true });
    setGlobalTemplatesDir(TEMPLATES_DIR);
  });

  afterEach(async () => {
    await tempDir.cleanup();
  });

  describe('mkdirIfNeeded', () => {
    it('creates directory if it does not exist', () => {
      const target = resolve(tempDir.path, 'new-dir');
      expect(existsSync(target)).toBe(false);
      mkdirIfNeeded(target);
      expect(existsSync(target)).toBe(true);
    });

    it('does not throw if directory already exists', () => {
      const target = resolve(tempDir.path, 'existing-dir');
      mkdirSync(target);
      expect(existsSync(target)).toBe(true);
      expect(() => mkdirIfNeeded(target)).not.toThrow();
    });
  });

  describe('copyAndReplace', () => {
    it('copies template directory to target', () => {
      const target = resolve(tempDir.path, 'server');
      copyAndReplace('server', target, { PROJECT: 'acme' });
      expect(existsSync(resolve(target, 'AGENTS.md'))).toBe(true);
      expect(existsSync(resolve(target, 'Makefile'))).toBe(true);
      expect(existsSync(resolve(target, '.gitignore'))).toBe(true);
    });

    it('replaces {{PROJECT}} in text files', () => {
      const target = resolve(tempDir.path, 'server');
      copyAndReplace('server', target, { PROJECT: 'acme' });
      const agentsContent = readFileSync(resolve(target, 'AGENTS.md'), 'utf-8');
      expect(agentsContent).toContain('acme-server');
      expect(agentsContent).not.toContain('{{PROJECT}}');
    });

    it('replaces template ref for custom modules', () => {
      const target = resolve(tempDir.path, 'crawler');
      copyAndReplace('server', target, {
        PROJECT: 'acme',
        MODULE_NAME: 'crawler',
        TEMPLATE_REF: 'server',
      });
      const agentsContent = readFileSync(resolve(target, 'AGENTS.md'), 'utf-8');
      expect(agentsContent).toContain('acme-crawler');
      expect(agentsContent).not.toContain('acme-server');
    });

    it('copies dotfiles correctly', () => {
      const target = resolve(tempDir.path, 'web');
      copyAndReplace('web', target, { PROJECT: 'myapp' });
      expect(existsSync(resolve(target, '.gitignore'))).toBe(true);
      expect(existsSync(resolve(target, '.cursorignore'))).toBe(true);
    });
  });

  describe('gitInit', () => {
    it('initializes git repo with main branch and commit', () => {
      const target = resolve(tempDir.path, 'test-module');
      mkdirSync(target);
      writeFileSync(resolve(target, 'test.txt'), 'hello');
      gitInit(target, 'test-module');

      expect(existsSync(resolve(target, '.git'))).toBe(true);
      // Verify commit was made
      const { execSync } = await import('child_process');
      const log = execSync('git log --oneline', { cwd: target, encoding: 'utf-8' });
      expect(log).toContain('chore: initialize test-module from scaffold');
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/core/scaffold.test.js`
Expected: FAIL — module not found

- [ ] **Step 3: Write the implementation**

```javascript
import { cpSync, readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, basename, extname } from 'path';
import { globSync } from 'glob';
import { execSync } from 'child_process';
import { resolveTemplatesDir } from '../utils/path.js';

const TEXT_FILE_EXTENSIONS = new Set([
  '.md', '.txt', '.json', '.yaml', '.yml', '.toml',
  '.js', '.ts', '.jsx', '.tsx', '.go', '.py', '.rb',
  '.sh', '.bash', '.zsh', '.gitignore', '.cursorignore',
  '.env', '.env.example', '.gitkeep', '.mdc',
]);

/**
 * 判断文件是否为文本文件（基于扩展名和文件名）
 */
function isTextFile(filePath) {
  const base = basename(filePath);
  if (base === 'Makefile' || base === 'Dockerfile') return true;
  const ext = extname(filePath);
  return TEXT_FILE_EXTENSIONS.has(ext) || ext === '';
}

/**
 * 创建目录（如不存在）
 */
export function mkdirIfNeeded(dirPath) {
  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * 复制模板目录到目标路径，并替换占位符
 * @param {string} templateName - 模板名（对应 templates/ 下的子目录）
 * @param {string} targetDir - 目标路径
 * @param {{ PROJECT: string, MODULE_NAME?: string|null, TEMPLATE_REF?: string|null }} vars - 替换变量
 */
export function copyAndReplace(templateName, targetDir, vars) {
  const srcDir = resolveTemplatesDir(templateName);

  // 1. 整体复制
  cpSync(srcDir, targetDir, { recursive: true });

  // 2. 仅对文本文件做占位符替换
  const files = globSync('**/*', { cwd: targetDir, nodir: true, dot: true });
  for (const file of files) {
    const filePath = join(targetDir, file);
    if (!isTextFile(filePath)) continue;

    let content = readFileSync(filePath, 'utf-8');

    // 替换 {{PROJECT}}
    content = content.replace(/\{\{PROJECT\}\}/g, vars.PROJECT);

    // 自定义模块：替换模块名引用
    if (vars.MODULE_NAME && vars.TEMPLATE_REF) {
      content = content.replace(
        new RegExp(`-${vars.TEMPLATE_REF}\\b`, 'g'),
        `-${vars.MODULE_NAME}`
      );
    }

    writeFileSync(filePath, content, 'utf-8');
  }
}

/**
 * 在模块目录执行 git init + 初始 commit
 * @param {string} modDir - 模块目录
 * @param {string} moduleName - 模块名（用于 commit message）
 */
export function gitInit(modDir, moduleName) {
  execSync('git init', { cwd: modDir, stdio: 'pipe' });
  execSync('git branch -M main', { cwd: modDir, stdio: 'pipe' });
  execSync('git add .', { cwd: modDir, stdio: 'pipe' });
  execSync(`git commit -m "chore: initialize ${moduleName} from scaffold"`, {
    cwd: modDir,
    stdio: 'pipe',
  });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/core/scaffold.test.js`
Expected: ALL PASS

- [ ] **Step 5: Commit**

```bash
git add src/core/scaffold.js tests/core/scaffold.test.js
git commit -m "feat: add scaffold core with copyAndReplace, gitInit, mkdirIfNeeded"
```

---

### Task 7: Utils — Prompt

**Files:**
- Create: `src/utils/prompt.js`

- [ ] **Step 1: Write the prompt utilities**

```javascript
import { input, checkbox, confirm } from '@inquirer/prompts';
import { validateProjectName } from './path.js';
import { getAvailableTemplateNames, validateTemplate } from '../core/templates.js';

/**
 * 交互式输入项目名
 * @returns {Promise<string>}
 */
export async function promptName() {
  return input({
    message: 'Project name:',
    validate: (value) => {
      const result = validateProjectName(value.trim());
      if (result !== true) return result;
      return true;
    },
  });
}

/**
 * 交互式输入 workspace 目录
 * @param {string} defaultDir - 默认目录
 * @returns {Promise<string>}
 */
export async function promptDir(defaultDir) {
  const answer = await input({
    message: `Workspace directory:`,
    default: defaultDir,
  });
  return answer;
}

/**
 * 交互式选择模块（用于 init 命令）
 * @returns {Promise<Array<{name: string, templateRef: string, isCustom: boolean}>>}
 */
export async function promptModules() {
  const available = getAvailableTemplateNames();
  const choices = [
    ...available.map(name => ({
      name: name === 'spec-center' ? `${name} (required)` : name,
      value: name,
      disabled: name === 'spec-center',
    })),
    { name: '+ Custom module...', value: '__custom__' },
  ];

  const selected = await checkbox({
    message: 'Select modules:',
    choices,
    required: true,
    initialValues: ['spec-center'],
  });

  const modules = [];
  for (const sel of selected) {
    if (sel === '__custom__') {
      // Prompt for custom module details
      const customModules = await promptCustomModule();
      modules.push(...customModules);
    } else {
      modules.push({ name: sel, templateRef: sel, isCustom: false });
    }
  }

  return modules;
}

/**
 * 交互式选择要添加的模块（用于 add 命令）
 * @param {string[]} available - 可添加的模块名列表
 * @returns {Promise<Array<{name: string, templateRef: string, isCustom: boolean}>>}
 */
export async function promptAddModules(available) {
  const choices = [
    ...available.map(name => ({ name, value: name })),
    { name: '+ Custom module...', value: '__custom__' },
  ];

  const selected = await checkbox({
    message: 'Select modules to add:',
    choices,
  });

  const modules = [];
  for (const sel of selected) {
    if (sel === '__custom__') {
      const customModules = await promptCustomModule();
      modules.push(...customModules);
    } else {
      modules.push({ name: sel, templateRef: sel, isCustom: false });
    }
  }

  return modules;
}

/**
 * 交互式输入自定义模块信息
 * @returns {Promise<Array<{name: string, templateRef: string, isCustom: boolean}>>}
 */
async function promptCustomModule() {
  const customs = [];
  let addAnother = true;

  while (addAnother) {
    const name = await input({
      message: 'Custom module name:',
      validate: (value) => {
        const result = validateProjectName(value.trim());
        if (result !== true) return result;
        return true;
      },
    });

    const templates = getAvailableTemplateNames().filter(t => t !== 'spec-center');
    const templateRef = await checkbox({
      message: 'Reference template:',
      choices: templates.map(t => ({ name: t, value: t })),
      required: true,
      max: 1,
    });

    customs.push({ name: name.trim(), templateRef: templateRef[0], isCustom: true });

    const more = await confirm({ message: 'Add another custom module?', default: false });
    addAnother = more;
  }

  return customs;
}

/**
 * 解析逗号分隔的模块列表字符串
 * @param {string} moduleStr - 逗号分隔的模块名
 * @returns {Array<{name: string, templateRef: string, isCustom: boolean}>}
 */
export function parseModuleList(moduleStr) {
  return moduleStr.split(',').map(s => {
    const name = s.trim();
    return { name, templateRef: name, isCustom: false };
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/utils/prompt.js
git commit -m "feat: add interactive prompt utilities for module selection"
```

---

### Task 8: Commands — init

**Files:**
- Create: `src/commands/init.js`

- [ ] **Step 1: Write the init command**

```javascript
import path from 'path';
import ora from 'ora';
import { expandHome, validateProjectName } from '../utils/path.js';
import { promptName, promptDir, promptModules, parseModuleList } from '../utils/prompt.js';
import { copyAndReplace, gitInit, mkdirIfNeeded } from '../core/scaffold.js';
import { syncAgentsMd } from '../core/agents-sync.js';
import { printDryRun, printSummary, error as logError, info } from '../utils/logger.js';

/**
 * init 子命令：创建新 workspace
 * @param {object} options - Commander 解析的选项
 */
export async function initCommand(options) {
  try {
    const cwd = process.cwd();

    // 1. 项目名
    const name = options.name || await promptName();
    const validation = validateProjectName(name);
    if (validation !== true) {
      logError(`Invalid project name: ${validation}`);
      process.exit(1);
    }

    // 2. Workspace 路径
    const defaultDir = path.join(cwd, name);
    let workspaceDir;
    if (options.dir) {
      workspaceDir = expandHome(options.dir);
    } else {
      const dirInput = await promptDir(defaultDir);
      workspaceDir = expandHome(dirInput);
    }

    // 3. 模块选择
    let modules;
    if (options.modules) {
      modules = parseModuleList(options.modules);
    } else {
      modules = await promptModules();
    }

    // spec-center 强制包含
    if (!modules.find(m => m.name === 'spec-center')) {
      modules.unshift({ name: 'spec-center', templateRef: 'spec-center', isCustom: false });
    }

    // 4. Dry run
    if (options.dryRun) {
      printDryRun(workspaceDir, name, modules);
      return;
    }

    // 5. 创建 workspace
    mkdirIfNeeded(workspaceDir);

    // 复制 root 模板
    const rootSpinner = ora('Creating workspace root...').start();
    copyAndReplace('root', workspaceDir, { PROJECT: name });
    rootSpinner.succeed('Workspace root created');

    // 初始化各模块
    for (const mod of modules) {
      const modDir = path.join(workspaceDir, `${name}-${mod.name}`);
      const spinner = ora(`Creating ${name}-${mod.name}...`).start();
      copyAndReplace(mod.templateRef, modDir, {
        PROJECT: name,
        MODULE_NAME: mod.isCustom ? mod.name : null,
        TEMPLATE_REF: mod.isCustom ? mod.templateRef : null,
      });
      gitInit(modDir, mod.name);
      spinner.succeed(`Created ${name}-${mod.name}`);
    }

    // 生成 spec-center AGENTS.md
    syncAgentsMd(workspaceDir, name, modules);
    printSummary(workspaceDir, name, modules);
  } catch (err) {
    if (err.name === 'ExitPromptError') {
      info('Aborted.');
      return;
    }
    throw err;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/commands/init.js
git commit -m "feat: add init command for workspace creation"
```

---

### Task 9: Commands — add

**Files:**
- Create: `src/commands/add.js`

- [ ] **Step 1: Write the add command**

```javascript
import path from 'path';
import fs from 'fs';
import ora from 'ora';
import {
  expandHome,
  validateProjectName,
  extractProjectName,
} from '../utils/path.js';
import { promptAddModules, parseModuleList } from '../utils/prompt.js';
import { copyAndReplace, gitInit } from '../core/scaffold.js';
import { mergeAgentsMd } from '../core/agents-sync.js';
import { getAvailableTemplateNames, validateTemplate } from '../core/templates.js';
import {
  error as logError,
  info,
  warn,
  success,
  printSummary,
} from '../utils/logger.js';

/**
 * 向上遍历父目录，查找 *-spec-center/ 目录
 * @param {string} startDir - 起始目录
 * @returns {string|null} spec-center 目录的完整路径
 */
export function findSpecCenter(startDir) {
  let dir = startDir;
  for (let i = 0; i < 5; i++) {
    try {
      const matches = fs
        .readdirSync(dir)
        .filter(
          (name) =>
            name.endsWith('-spec-center') &&
            fs.statSync(path.join(dir, name)).isDirectory()
        );
      if (matches.length > 0) return path.join(dir, matches[0]);
    } catch {
      // Permission denied or other read errors — skip this dir
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

/**
 * 扫描 workspace 中已有的模块
 * @param {string} workspaceDir - workspace 目录
 * @param {string} projectName - 项目名
 * @returns {string[]} 已有模块名列表
 */
export function scanExistingModules(workspaceDir, projectName) {
  const prefix = `${projectName}-`;
  return fs
    .readdirSync(workspaceDir)
    .filter((name) => name.startsWith(prefix) && fs.statSync(path.join(workspaceDir, name)).isDirectory())
    .map((name) => name.slice(prefix.length));
}

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
      logError(
        'Not in a workspace directory. No *-spec-center/ found in current or parent directories.'
      );
      info('Usage: cd <workspace-dir> && node src/cli.js add');
      process.exit(1);
    }

    const workspaceDir = path.dirname(specCenterDir);
    const projectName = extractProjectName(specCenterDir);
    const existingModules = scanExistingModules(workspaceDir, projectName);

    info(`Detected workspace: ${workspaceDir}`);
    info(`Detected project:   ${projectName}`);
    info(`Existing modules:   ${existingModules.join(', ')}`);

    const allTemplateNames = getAvailableTemplateNames();
    const available = allTemplateNames.filter(
      (m) => !existingModules.includes(m)
    );

    // 2. 收集要添加的模块
    let toAdd;
    if (options.modules) {
      toAdd = parseModuleList(options.modules);
    } else {
      if (available.length === 0) {
        info('All standard modules are already installed.');
        toAdd = [];
      } else {
        toAdd = await promptAddModules(available);
      }
    }

    // 处理 -c 参数的自定义模块
    if (options.custom) {
      const customs = Array.isArray(options.custom)
        ? options.custom
        : [options.custom];
      for (const c of customs) {
        const [name, ref] = c.split(':');
        if (!name || !ref) {
          logError(`Invalid custom module format: "${c}". Use name:ref (e.g. crawler:server)`);
          process.exit(1);
        }
        const nameValidation = validateProjectName(name);
        if (nameValidation !== true) {
          logError(`Invalid custom module name "${name}": ${nameValidation}`);
          process.exit(1);
        }
        try {
          validateTemplate(ref);
        } catch {
          logError(`Reference template not found: "${ref}". Available: ${allTemplateNames.join(', ')}`);
          process.exit(1);
        }
        toAdd.push({ name, templateRef: ref, isCustom: true });
      }
    }

    // 3. 跳过已存在的模块
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

    // 4. Dry run
    if (options.dryRun) {
      for (const mod of filtered) {
        const suffix = mod.isCustom ? ` (based on ${mod.templateRef})` : '';
        console.log(`  Would create: ${projectName}-${mod.name}/${suffix}`);
      }
      return;
    }

    // 5. 创建新模块
    for (const mod of filtered) {
      const modDir = path.join(workspaceDir, `${projectName}-${mod.name}`);
      const spinner = ora(`Creating ${projectName}-${mod.name}...`).start();
      copyAndReplace(mod.templateRef, modDir, {
        PROJECT: projectName,
        MODULE_NAME: mod.isCustom ? mod.name : null,
        TEMPLATE_REF: mod.isCustom ? mod.templateRef : null,
      });
      gitInit(modDir, mod.name);
      spinner.succeed(`Created ${projectName}-${mod.name}`);
    }

    // 6. 增量 merge AGENTS.md
    mergeAgentsMd(workspaceDir, projectName, filtered);

    printSummary(workspaceDir, projectName, filtered, 'added');
  } catch (err) {
    if (err.name === 'ExitPromptError') {
      info('Aborted.');
      return;
    }
    throw err;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/commands/add.js
git commit -m "feat: add command for adding modules to existing workspace"
```

---

### Task 10: CLI Entry — src/cli.js

**Files:**
- Create: `src/cli.js`

- [ ] **Step 1: Write the CLI entry point**

```javascript
#!/usr/bin/env node

import { program } from 'commander';
import { initCommand } from './commands/init.js';
import { addCommand } from './commands/add.js';
import { setGlobalTemplatesDir } from './utils/path.js';

program
  .name('scaffold')
  .description('Multi-repo workspace scaffold tool')
  .version('1.0.0');

program
  .command('init')
  .description('Create a new workspace')
  .option('-n, --name <name>', 'Project name')
  .option('-d, --dir <path>', 'Workspace directory')
  .option('-m, --modules <list>', 'Comma-separated modules')
  .option('--templates-dir <path>', 'Override templates directory')
  .option('--dry-run', 'Show what would be created')
  .action(async (options) => {
    if (options.templatesDir) {
      setGlobalTemplatesDir(options.templatesDir);
    }
    await initCommand(options);
  });

program
  .command('add')
  .description('Add modules to existing workspace')
  .option('-m, --modules <list>', 'Comma-separated modules to add')
  .option('-c, --custom <name:ref>', 'Add custom module', (value, previous) => {
    return previous ? [...previous, value] : [value];
  })
  .option('--templates-dir <path>', 'Override templates directory')
  .option('--dry-run', 'Show what would be created')
  .action(async (options) => {
    if (options.templatesDir) {
      setGlobalTemplatesDir(options.templatesDir);
    }
    await addCommand(options);
  });

program.parse();
```

- [ ] **Step 2: Make it executable**

Run: `chmod +x src/cli.js`

- [ ] **Step 3: Test CLI help output**

Run: `node src/cli.js --help`
Expected: Shows usage with `init` and `add` subcommands.

Run: `node src/cli.js init --help`
Expected: Shows init options.

Run: `node src/cli.js add --help`
Expected: Shows add options.

- [ ] **Step 4: Commit**

```bash
git add src/cli.js
git commit -m "feat: add CLI entry point with init and add subcommands"
```

---

### Task 11: Integration Tests — init and add Commands

**Files:**
- Create: `tests/commands/init.test.js`
- Create: `tests/commands/add.test.js`

- [ ] **Step 1: Write init integration tests**

```javascript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execSync } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, readFileSync } from 'fs';
import tmp from 'tmp-promise';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLI_PATH = resolve(__dirname, '../../src/cli.js');
const TEMPLATES_DIR = resolve(__dirname, '../../templates');

describe('init command integration', () => {
  let tempDir;

  beforeEach(async () => {
    tempDir = await tmp.dir({ unsafeCleanup: true });
  });

  afterEach(async () => {
    await tempDir.cleanup();
  });

  it('creates workspace with spec-center only (non-interactive)', () => {
    const workspace = resolve(tempDir.path, 'acme');
    execSync(
      `node "${CLI_PATH}" init -n acme -d "${workspace}" -m spec-center --templates-dir "${TEMPLATES_DIR}"`,
      { stdio: 'pipe' }
    );

    expect(existsSync(resolve(workspace, 'AGENTS.md'))).toBe(true);
    expect(existsSync(resolve(workspace, 'CLAUDE.md'))).toBe(true);
    expect(existsSync(resolve(workspace, 'acme-spec-center'))).toBe(true);
    expect(existsSync(resolve(workspace, 'acme-spec-center', 'AGENTS.md'))).toBe(true);
    expect(existsSync(resolve(workspace, 'acme-spec-center', '.git'))).toBe(true);

    // Check {{PROJECT}} was replaced
    const agentsContent = readFileSync(resolve(workspace, 'acme-spec-center', 'AGENTS.md'), 'utf-8');
    expect(agentsContent).not.toContain('{{PROJECT}}');
    expect(agentsContent).toContain('acme-spec-center');

    // Only spec-center in Module Map (no server/web/mobile/admin)
    expect(agentsContent).not.toContain('`server`');
    expect(agentsContent).not.toContain('`web`');
    expect(agentsContent).not.toContain('`mobile`');
    expect(agentsContent).not.toContain('`admin`');
  });

  it('creates workspace with multiple modules (non-interactive)', () => {
    const workspace = resolve(tempDir.path, 'myapp');
    execSync(
      `node "${CLI_PATH}" init -n myapp -d "${workspace}" -m spec-center,server,web --templates-dir "${TEMPLATES_DIR}"`,
      { stdio: 'pipe' }
    );

    expect(existsSync(resolve(workspace, 'myapp-spec-center'))).toBe(true);
    expect(existsSync(resolve(workspace, 'myapp-server'))).toBe(true);
    expect(existsSync(resolve(workspace, 'myapp-web'))).toBe(true);
    expect(existsSync(resolve(workspace, 'myapp-mobile'))).toBe(false);
    expect(existsSync(resolve(workspace, 'myapp-admin'))).toBe(false);

    // AGENTS.md should contain server and web but not mobile/admin
    const agentsContent = readFileSync(resolve(workspace, 'myapp-spec-center', 'AGENTS.md'), 'utf-8');
    expect(agentsContent).toContain('`server`');
    expect(agentsContent).toContain('`web`');
    expect(agentsContent).not.toContain('`mobile`');
    expect(agentsContent).not.toContain('`admin`');
  });

  it('shows dry-run without creating files', () => {
    const workspace = resolve(tempDir.path, 'dry-test');
    const output = execSync(
      `node "${CLI_PATH}" init -n drytest -d "${workspace}" -m spec-center --dry-run --templates-dir "${TEMPLATES_DIR}"`,
      { encoding: 'utf-8' }
    );

    expect(output).toContain('DRY RUN');
    expect(existsSync(workspace)).toBe(false);
  });

  it('auto-includes spec-center if not specified', () => {
    const workspace = resolve(tempDir.path, 'auto-sc');
    execSync(
      `node "${CLI_PATH}" init -n autosc -d "${workspace}" -m server --templates-dir "${TEMPLATES_DIR}"`,
      { stdio: 'pipe' }
    );

    expect(existsSync(resolve(workspace, 'autosc-spec-center'))).toBe(true);
    expect(existsSync(resolve(workspace, 'autosc-server'))).toBe(true);
  });
});
```

- [ ] **Step 2: Write add integration tests**

```javascript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execSync } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, readFileSync } from 'fs';
import tmp from 'tmp-promise';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLI_PATH = resolve(__dirname, '../../src/cli.js');
const TEMPLATES_DIR = resolve(__dirname, '../../templates');

describe('add command integration', () => {
  let tempDir;
  let workspaceDir;

  beforeEach(async () => {
    tempDir = await tmp.dir({ unsafeCleanup: true });
    workspaceDir = resolve(tempDir.path, 'acme');

    // First create a workspace with spec-center only
    execSync(
      `node "${CLI_PATH}" init -n acme -d "${workspaceDir}" -m spec-center --templates-dir "${TEMPLATES_DIR}"`,
      { stdio: 'pipe' }
    );
  });

  afterEach(async () => {
    await tempDir.cleanup();
  });

  it('adds a module to existing workspace', () => {
    execSync(
      `node "${CLI_PATH}" add -m web --templates-dir "${TEMPLATES_DIR}"`,
      { cwd: workspaceDir, stdio: 'pipe' }
    );

    expect(existsSync(resolve(workspaceDir, 'acme-web'))).toBe(true);
    expect(existsSync(resolve(workspaceDir, 'acme-web', 'AGENTS.md'))).toBe(true);
    expect(existsSync(resolve(workspaceDir, 'acme-web', '.git'))).toBe(true);

    // AGENTS.md should now contain web
    const agentsContent = readFileSync(resolve(workspaceDir, 'acme-spec-center', 'AGENTS.md'), 'utf-8');
    expect(agentsContent).toContain('`web`');
  });

  it('skips already existing module with warning', () => {
    const output = execSync(
      `node "${CLI_PATH}" add -m spec-center --templates-dir "${TEMPLATES_DIR}"`,
      { cwd: workspaceDir, encoding: 'utf-8' }
    );

    expect(output).toContain('already exist');
  });

  it('adds custom module with -c flag', () => {
    execSync(
      `node "${CLI_PATH}" add -c crawler:server --templates-dir "${TEMPLATES_DIR}"`,
      { cwd: workspaceDir, stdio: 'pipe' }
    );

    expect(existsSync(resolve(workspaceDir, 'acme-crawler'))).toBe(true);
    const agentsContent = readFileSync(resolve(workspaceDir, 'acme-crawler', 'AGENTS.md'), 'utf-8');
    expect(agentsContent).toContain('acme-crawler');
    expect(agentsContent).not.toContain('acme-server');

    // spec-center AGENTS.md should have crawler in Module Map
    const scAgents = readFileSync(resolve(workspaceDir, 'acme-spec-center', 'AGENTS.md'), 'utf-8');
    expect(scAgents).toContain('`crawler`');
  });

  it('fails when not in a workspace', () => {
    try {
      execSync(
        `node "${CLI_PATH}" add -m web --templates-dir "${TEMPLATES_DIR}"`,
        { cwd: tempDir.path, stdio: 'pipe' }
      );
      expect.unreachable('Should have thrown');
    } catch (err) {
      expect(err.stderr?.toString() || err.message).toContain('Not in a workspace');
    }
  });
});
```

- [ ] **Step 3: Run all tests**

Run: `npx vitest run`
Expected: ALL PASS

- [ ] **Step 4: Commit**

```bash
git add tests/commands/init.test.js tests/commands/add.test.js
git commit -m "test: add integration tests for init and add commands"
```

---

### Task 12: Add MODULE Markers to templates/spec-center/AGENTS.md

**Files:**
- Modify: `templates/spec-center/AGENTS.md`

This is the critical step that makes AGENTS.md dynamic filtering work. We add HTML comment markers at the locations identified in the spec (Section 5.2).

- [ ] **Step 1: Add MODULE markers to the Module Map table**

The Module Map table is at lines 9-15. Change it from:

```markdown
| Module | Role |
|---|---|
| `admin` | Admin manager application|
| `web` | Web application|
| `mobile` | Mobile application |
| `server` | Backend service implementation |
| `spec-center` | **Single Source of Truth (SSOT)** for cross-module contracts and constraints |
```

To:

```markdown
| Module | Role |
|---|---|
<!-- MODULE:admin -->| `admin` | Admin manager application|
<!-- MODULE:mobile -->| `mobile` | Mobile application |
<!-- MODULE:server -->| `server` | Backend service implementation |
| `spec-center` | **Single Source of Truth (SSOT)** for cross-module contracts and constraints |
<!-- MODULE:web -->| `web` | Web application|
```

- [ ] **Step 2: Add MODULE markers to the Implementation Plans table**

The table around lines 72-77. Change the server and web rows:

```markdown
| Server implementation plan (how) | `{{PROJECT}}-server/docs/plans/` | `2026-05-30-feature.md` |
<!-- MODULE:web -->| Web implementation plan (how) | `{{PROJECT}}-web/docs/plans/` | `2026-05-30-feature.md` |
```

And add `<!-- MODULE:server -->` before the server row:

```markdown
<!-- MODULE:server -->| Server implementation plan (how) | `{{PROJECT}}-server/docs/plans/` | `2026-05-30-feature.md` |
<!-- MODULE:web -->| Web implementation plan (how) | `{{PROJECT}}-web/docs/plans/` | `2026-05-30-feature.md` |
```

- [ ] **Step 3: Add BEGIN/END MODULE markers to the Example code block**

Around lines 89-95, wrap the server/web example paths:

```markdown
**Example:**

```
{{PROJECT}}-spec-center/docs/specs/2026-05-30-feature-design.md   ← SSOT spec
<!-- BEGIN MODULE:server -->{{PROJECT}}-server/docs/plans/2026-05-30-feature.md               ← schema, API, tests
<!-- END MODULE:server -->
<!-- BEGIN MODULE:web -->{{PROJECT}}-web/docs/plans/2026-05-30-feature.md                  ← UI; Depends on server plan
<!-- END MODULE:web -->
```
```

- [ ] **Step 4: Add BEGIN/END MODULE markers to the Repository Structure tree**

The tree starts around line 167. Wrap each module's subtree:

```markdown
├── {{PROJECT}}-spec-center/      # SSOT - shared specs and contracts
│   ├── AGENTS.md                 # This file - global project rules
│   ├── conventions/              # Shared conventions
│   │   ├── conventional-commits.md  # Git 提交信息规范
│   │   ├── engineering-guidelines.md  # LLM/agent coding behavior guidelines
│   │   ├── http-constitution.md  # HTTP/API 全局设计规范 (v1.0)
│   │   ├── validation.md         # Input validation 校验规范 (v1.0)
│   │   └── go-project.md         # Go project structure (v1.0)
│   ├── api/                      # API specifications (OpenAPI / endpoint specs)
│   │   └── .gitkeep
│   ├── docs/                     # Cross-module domain specifications
│   │   └── specs/                # Shared specs affecting 2+ modules
│   │       └── .gitkeep
│   ├── errors/                   # Error codes and formats
│   │   └── error-codes.md        # Business error code registry
│   └── events/                   # Inter-module event definitions
│       └── .gitkeep
<!-- BEGIN MODULE:server -->├── {{PROJECT}}-server/           # Backend service
│   ├── AGENTS.md                 # Server-specific conventions
│   └── docs/
│       ├── specs/                # Server-specific specifications
│       │   └── .gitkeep
│       └── plans/                # Server-specific implementation plans
│           └── .gitkeep
<!-- END MODULE:server -->
<!-- BEGIN MODULE:web -->├── {{PROJECT}}-web/              # Web application
│   ├── AGENTS.md                 # Web-specific conventions
│   └── docs/
│       ├── specs/                # Web-specific specifications
│       │   └── .gitkeep
│       └── plans/                # Web-specific implementation plans
│           └── .gitkeep
<!-- END MODULE:web -->
<!-- BEGIN MODULE:mobile -->├── {{PROJECT}}-mobile/           # Mobile application
│   ├── AGENTS.md                 # Mobile-specific conventions
│   └── docs/
│       ├── specs/                # Mobile-specific specifications
│       │   └── .gitkeep
│       └── plans/                # Mobile-specific implementation plans
│           └── .gitkeep
<!-- END MODULE:mobile -->
<!-- BEGIN MODULE:admin -->└── {{PROJECT}}-admin/            # Admin manager application
    ├── AGENTS.md                 # Admin-specific conventions
    └── docs/
        ├── specs/                # Admin-specific specifications
        │   └── .gitkeep
        └── plans/                # Admin-specific implementation plans
            └── .gitkeep
<!-- END MODULE:admin -->
```

- [ ] **Step 5: Run the full test suite to verify markers work**

Run: `npx vitest run`
Expected: ALL PASS (the agents-sync tests and integration tests should validate marker behavior)

- [ ] **Step 6: Commit**

```bash
git add templates/spec-center/AGENTS.md
git commit -m "feat: add MODULE markers to spec-center AGENTS.md for dynamic filtering"
```

---

### Task 13: kickstart.sh — Remote Bootstrap Script

**Files:**
- Create: `kickstart.sh`

- [ ] **Step 1: Write the kickstart.sh script**

```bash
#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# spec-center-template kickstart.sh
# Remote bootstrap: curl | bash one-liner for workspace creation
# =============================================================================

REPO_URL="https://github.com/{owner}/spec-center-template.git"
ORIGINAL_DIR=$(pwd)
TEMP_DIR=$(mktemp -d)

cleanup() { rm -rf "$TEMP_DIR"; }
trap cleanup EXIT

# ---------------------------------------------------------------------------
# Node.js detection
# ---------------------------------------------------------------------------
if ! command -v node &>/dev/null; then
  echo "Error: Node.js >= 18 is required."
  echo "Install: https://nodejs.org/ or https://github.com/nvm-sh/nvm"
  exit 1
fi

NODE_MAJOR=$(node -e "console.log(process.versions.node.split('.')[0])")
if [ "$NODE_MAJOR" -lt 18 ]; then
  echo "Error: Node.js >= 18 required, got $(node --version)"
  exit 1
fi

# ---------------------------------------------------------------------------
# Download templates
# ---------------------------------------------------------------------------
echo "Downloading templates..."
if ! git clone --depth 1 "$REPO_URL" "$TEMP_DIR" 2>/dev/null; then
  echo "Error: Failed to download templates from $REPO_URL"
  exit 1
fi
cd "$TEMP_DIR"

if ! npm install --production --silent 2>/dev/null; then
  echo "Error: npm install failed."
  exit 1
fi

# ---------------------------------------------------------------------------
# Auto-detect mode
# ---------------------------------------------------------------------------
if find "$ORIGINAL_DIR" -maxdepth 1 -type d -name '*-spec-center' 2>/dev/null | grep -q .; then
  echo "Detected existing workspace. Running 'add' command..."
  node src/cli.js add --templates-dir "$TEMP_DIR/templates" "$@"
else
  echo "Creating new workspace..."
  node src/cli.js init --templates-dir "$TEMP_DIR/templates" "$@"
fi
```

- [ ] **Step 2: Make it executable**

Run: `chmod +x kickstart.sh`

- [ ] **Step 3: Commit**

```bash
git add kickstart.sh
git commit -m "feat: add kickstart.sh for remote curl | bash bootstrap"
```

---

### Task 14: Delete init.sh and Update README

**Files:**
- Delete: `init.sh`
- Modify: `README.md`

- [ ] **Step 1: Delete init.sh**

Run: `git rm init.sh`

- [ ] **Step 2: Update README.md to reflect new CLI usage**

Replace the entire Quick Start section and usage instructions. The new README should document:

1. Quick Start with both local (`node src/cli.js init`) and remote (`curl | bash`) methods
2. The `init` and `add` commands with all options
3. Module selection (spec-center is the only required module; server is now optional)
4. Custom module support
5. Default workspace path change: `./{name}` instead of `./{name}-workspace`

```markdown
# Spec Center Template

Universal scaffold for multi-repo workspace projects. Generates independent Git repositories (spec-center, server, web, mobile, admin) that share conventions through a single source of truth.

## Quick Start

### Remote (recommended)

```bash
curl -fsSL https://raw.githubusercontent.com/{owner}/spec-center-template/main/kickstart.sh | bash
```

### Local

```bash
git clone https://github.com/{owner}/spec-center-template.git
cd spec-center-template
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
```

- [ ] **Step 3: Run the full test suite one final time**

Run: `npx vitest run`
Expected: ALL PASS

- [ ] **Step 4: Commit**

```bash
git rm init.sh
git add README.md
git commit -m "chore: delete init.sh, update README for Node.js CLI"
```

---

## Self-Review

### 1. Spec Coverage

| Spec Requirement | Task |
|---|---|
| init 创建 workspace | Task 8, 11 |
| add 追加模块 | Task 9, 11 |
| AGENTS.md 动态过滤 | Task 5, 12 |
| 交互体验（复选框、~ 展开、彩色输出） | Task 2, 3, 7 |
| 远程执行 curl \| bash | Task 13 |
| 自定义模块 | Task 7, 8, 9 |
| kickstart.sh 自动检测模式 | Task 13 |
| spec-center 强制包含 | Task 8 |
| root 不做 git init | Task 8 (only modules get gitInit) |
| copyAndReplace 文本/二进制区分 | Task 6 |
| MODULE 标记语法（单行/多行） | Task 5, 12 |
| add 增量 merge AGENTS.md | Task 5, 9 |
| 非交互模式（-m, -c flags） | Task 8, 9 |
| dry-run 模式 | Task 8, 9 |
| 项目名/模块名校验 | Task 3 |
| workspace 检测（向上遍历） | Task 9 |
| git init 失败处理 | Task 6 (execSync throws, caught by command) |
| 删除 init.sh | Task 14 |
| 更新 README | Task 14 |

### 2. Placeholder Scan

No TBD, TODO, "implement later", "add validation", or "similar to Task N" patterns found.

### 3. Type Consistency

- Module data structure `{ name, templateRef, isCustom }` used consistently across all tasks
- `validateProjectName` returns `true | string` — consistent across Task 3, 7, 9
- `copyAndReplace` signature: `(templateName, targetDir, vars)` with `vars.PROJECT`, `vars.MODULE_NAME`, `vars.TEMPLATE_REF` — consistent across Task 6, 8, 9
- `filterAgentsMd(templateContent, selectedModules)` — consistent in Task 5 and called by `syncAgentsMd`
- `resolveTemplatesDir(...subPaths)` — consistent across Task 3, 4, 5, 6

No naming conflicts found.
