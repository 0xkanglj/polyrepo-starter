# Node.js CLI Scaffold Design

> Date: 2026-06-02
> Status: Draft

## Overview

将脚手架从 Bash 脚本重写为 Node.js CLI，解决以下问题：

1. **后续添加模块** — init 创建 workspace 后，可随时添加新模块（含自定义模块）
2. **AGENTS.md 动态过滤** — spec-center/AGENTS.md 只包含实际选中的模块
3. **交互体验** — 复选框 UI、路径 ~ 展开、彩色输出
4. **远程执行** — 支持 `curl | bash` 一键创建项目，无需先 clone 仓库
5. **自定义模块** — 用户可基于参考模板创建任意名称的模块

## 1. 整体架构

```
spec-center-template/
├── kickstart.sh              # Shell 入口：curl | bash 引导脚本
├── package.json              # Node.js 项目声明
├── src/
│   ├── cli.js                # CLI 入口：子命令路由 (init / add)
│   ├── commands/
│   │   ├── init.js           # init 子命令：创建新 workspace
│   │   └── add.js            # add 子命令：追加模块到已有 workspace
│   ├── core/
│   │   ├── scaffold.js       # 核心脚手架逻辑（复制模板、替换占位符、git init）
│   │   ├── agents-sync.js    # AGENTS.md 动态生成/过滤
│   │   └── templates.js      # 模板发现与校验
│   └── utils/
│       ├── path.js           # 路径工具（~ 展开、相对路径计算）
│       ├── prompt.js         # Inquirer 交互封装
│       └── logger.js         # 彩色日志输出
├── templates/                # 模板目录（保持现有结构不变）
│   ├── root/                 # workspace 根文件（非 Git 仓库）
│   │   ├── AGENTS.md         # 指向 spec-center 的引用
│   │   ├── CLAUDE.md         # @AGENTS.md + @spec-center 规范
│   │   ├── .claude/settings.json
│   │   ├── .opencode/opencode.json
│   │   ├── .cursorignore
│   │   ├── .cursorindexingignore
│   │   └── .cursor/rules/engineering-guidelines.mdc
│   ├── spec-center/          # SSOT 仓库（文档专用，无 .claude/.opencode/.cursorignore/Makefile/.env.example）
│   ├── server/               # 后端服务（完整代码模块）
│   ├── web/                  # Web 应用（完整代码模块）
│   ├── mobile/               # 移动应用（完整代码模块）
│   └── admin/                # 管理面板（完整代码模块）
└── README.md
```

### 模板差异说明

**代码模块**（server / web / mobile / admin）均包含：
`AGENTS.md`、`CLAUDE.md`、`.claude/settings.json`、`.opencode/opencode.json`、`.cursorignore`、`.cursorindexingignore`、`.gitignore`、`Makefile`、`.env.example`、`docs/specs/`、`docs/plans/`

**spec-center 模块**仅包含：
`AGENTS.md`、`CLAUDE.md`、`.gitignore`、`conventions/`、`api/`、`docs/`、`errors/`、`events/`

**root 模板**包含：workspace 级别配置文件（见上方树形图），作为整体 workspace 的入口配置。

> 所有模块中的 `{{PROJECT}}` 占位符在生成时替换为实际项目名。

### 旧的 init.sh 删除

现有 `init.sh`（Bash 版本）将被删除，由 Node.js CLI 完全替代。与旧版的关键差异：
- **server 从必选变为可选**：旧版强制包含 spec-center + server，新版仅强制 spec-center
- **默认 workspace 路径**：旧版默认 `./{name}-workspace`，新版默认 `./{name}`

## 2. kickstart.sh — 远程引导脚本

用户执行：`curl -fsSL https://raw.githubusercontent.com/{owner}/spec-center-template/main/kickstart.sh | bash`

> `REPO_URL` 在 kickstart.sh 中硬编码，部署时需替换为实际仓库地址。不使用环境变量或参数注入，保持一键执行的简洁性。

### 执行流程

```
1. 检测 Node.js (>=18)
   ├── 未安装 → 打印安装提示（含 nvm/node 官方链接），退出
   └── 已安装 → 继续

2. 记录调用者当前目录（ORIGINAL_DIR=$(pwd)）

3. 创建临时目录，git clone --depth 1 仓库

4. npm install --production

5. 自动检测 ORIGINAL_DIR 状态
   ├── 含 *-spec-center/ → 执行 add 子命令
   └── 空目录或其他 → 执行 init 子命令

6. 执行 CLI，透传所有参数
   node src/cli.js init --templates-dir "$TEMP_DIR/templates" "$@"
   # 或
   node src/cli.js add --templates-dir "$TEMP_DIR/templates" "$@"

7. 清理临时目录（trap EXIT）
```

### 关键实现

```bash
#!/usr/bin/env bash
set -euo pipefail

REPO_URL="https://github.com/{owner}/spec-center-template.git"
ORIGINAL_DIR=$(pwd)
TEMP_DIR=$(mktemp -d)

cleanup() { rm -rf "$TEMP_DIR"; }
trap cleanup EXIT

# Node.js 检测
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

# 下载模板
if ! git clone --depth 1 "$REPO_URL" "$TEMP_DIR" 2>/dev/null; then
  echo "Error: Failed to download templates from $REPO_URL"
  exit 1
fi
cd "$TEMP_DIR"
npm install --production --silent

# 自动检测模式
if find "$ORIGINAL_DIR" -maxdepth 1 -type d -name '*-spec-center' 2>/dev/null | grep -q .; then
  node src/cli.js add --templates-dir "$TEMP_DIR/templates" "$@"
else
  node src/cli.js init --templates-dir "$TEMP_DIR/templates" "$@"
fi
```

`--templates-dir` 参数让 CLI 知道模板所在位置，不依赖脚本自身目录。本地开发时（直接 `node src/cli.js`），`templatesDir` 默认解析为 CLI 自身所在目录的 `../templates`。

## 3. `init` 子命令 — 创建新 workspace

### 3.1 CLI 参数

```bash
node src/cli.js init [options]
  -n, --name <name>          Project name
  -d, --dir <path>           Workspace directory (supports ~ expansion)
  -m, --modules <list>       Comma-separated modules
      --templates-dir <path> Override templates directory
      --dry-run              Show what would be created
  -h, --help
```

### 3.2 交互流程

```
Step 1: 项目名称
  ? Project name: acme
  → 校验: ^[a-z][a-z0-9]*(-[a-z0-9]+)*$, 2-50 字符

Step 2: Workspace 路径（支持 ~ 展开）
  ? Workspace directory [./acme]: ~/projects/acme
  → 展开为 /Users/kang/projects/acme

Step 3: 模块选择（复选框）
  ? Select modules:
    ◉ spec-center (required, cannot deselect)
    ◯ server
    ◯ web
    ◯ mobile
    ◯ admin
    ◯ + Custom module...

  // 选中 Custom module 后追问：
  ? Custom module name: crawler
  ? Reference template:
    ◯ server
    ◯ web
    ◯ mobile
    ◯ admin

Step 4: 确认
  ┌────────────────────────────────────────┐
  │ Workspace: /Users/kang/projects/acme   │
  │ Project:   acme                        │
  │ Modules:   spec-center, web, crawler   │
  │                                        │
  │ Will create:                           │
  │   acme/                                │
  │   acme/AGENTS.md                       │
  │   acme/acme-spec-center/               │
  │   acme/acme-web/                       │
  │   acme/acme-crawler/ (based on server) │
  └────────────────────────────────────────┘
  ? Create workspace? (Y/n)
```

### 3.3 执行逻辑

```javascript
async function init(cwd, options) {
  const name = options.name || await promptName();
  validateProjectName(name);

  const defaultDir = path.join(cwd, name);
  const workspaceDir = options.dir
    ? expandHome(options.dir)
    : await promptDir(defaultDir);

  const modules = options.modules
    ? parseModuleList(options.modules)
    : await promptModules();

  // spec-center 强制包含（server 及其他模块均为可选）
  if (!modules.find(m => m.name === 'spec-center')) {
    modules.unshift({ name: 'spec-center', templateRef: 'spec-center', isCustom: false });
  }

  if (options.dryRun) {
    printDryRun(workspaceDir, name, modules);
    return;
  }

  // 创建 workspace
  mkdirIfNeeded(workspaceDir);

  // 复制 root 模板（AGENTS.md, CLAUDE.md, .claude/, .opencode/, .cursor/ 等）
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

  // 生成 spec-center AGENTS.md（基于模板过滤）
  syncAgentsMd(workspaceDir, name, modules);
  printSummary(workspaceDir, name, modules);
}
```

### 3.4 gitInit 实现

```javascript
import { execSync } from 'child_process';

function gitInit(modDir, moduleName) {
  execSync('git init', { cwd: modDir, stdio: 'pipe' });
  execSync('git branch -M main', { cwd: modDir, stdio: 'pipe' });
  execSync('git add .', { cwd: modDir, stdio: 'pipe' });
  execSync(`git commit -m "chore: initialize ${moduleName} from scaffold"`, {
    cwd: modDir,
    stdio: 'pipe',
  });
}
```

> **注意**：root 目录**不做** git init。它是一个 workspace 容器，不是独立的 Git 仓库。

### 3.4 模块数据结构

```javascript
// 预定义模块
{ name: 'spec-center', templateRef: 'spec-center', isCustom: false }
{ name: 'server',      templateRef: 'server',      isCustom: false }
{ name: 'web',         templateRef: 'web',         isCustom: false }

// 自定义模块
{ name: 'crawler',     templateRef: 'server',      isCustom: true }
```

## 4. `add` 子命令 — 添加模块到已有 workspace

### 4.1 CLI 参数

```bash
node src/cli.js add [options]
  -m, --modules <list>       Comma-separated modules to add
  -c, --custom <name:ref>    Add custom module (e.g. crawler:server)
      --templates-dir <path> Override templates directory
      --dry-run
  -h, --help
```

### 4.2 交互流程

```
Step 1: 自动检测项目信息
  ✓ Detected workspace: /Users/kang/projects/acme
  ✓ Detected project:   acme
  ✓ Existing modules:   spec-center, web

Step 2: 选择要添加的模块（只列出未安装的）
  ? Select modules to add:
    ◯ server
    ◯ mobile
    ◯ admin
    ◯ + Custom module...

Step 3: 确认
  ┌────────────────────────────────────────┐
  │ Will add to: /Users/kang/projects/acme │
  │ New modules:  mobile, crawler          │
  │                                        │
  │ Will create:                           │
  │   acme-mobile/                         │
  │   acme-crawler/ (based on server)      │
  └────────────────────────────────────────┘
  ? Add modules? (Y/n)
```

### 4.3 执行逻辑

```javascript
async function addModule(cwd, options) {
  // 1. 检测 workspace（支持向上遍历父目录）
  const specCenterDir = findSpecCenter(cwd);
  if (!specCenterDir) {
    error('Not in a workspace directory. No *-spec-center/ found in current or parent directories.');
    info('Usage: cd <workspace-dir> && node src/cli.js add');
    process.exit(1);
  }

  const workspaceDir = path.dirname(specCenterDir);
  const projectName = extractProjectName(specCenterDir);
  const existingModules = scanExistingModules(workspaceDir, projectName);
  const allModuleNames = getAvailableTemplateNames(); // 从 templates/ 目录动态发现
  const available = allModuleNames.filter(m => !existingModules.includes(m));

  // 2. 收集要添加的模块
  const toAdd = options.modules
    ? parseModuleList(options.modules)
    : await promptAddModules(available);

  // 处理 -c 参数的自定义模块
  if (options.custom) {
    for (const c of options.custom) {
      const [name, ref] = c.split(':');
      validateProjectName(name); // 复用项目名校验规则
      toAdd.push({ name, templateRef: ref, isCustom: true });
    }
  }

  // 3. 跳过已存在的模块
  const filtered = toAdd.filter(m => !existingModules.includes(m.name));

  if (filtered.length === 0) {
    info('All specified modules already exist. Nothing to add.');
    return;
  }

  // 4. 执行：创建新模块目录 + git init
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

  // 5. 增量 merge spec-center AGENTS.md（仅追加新模块条目到标记区域）
  const allActive = [...existingModules.map(m => ({
    name: m, templateRef: m, isCustom: false
  })), ...filtered];
  mergeAgentsMd(workspaceDir, projectName, filtered);

  // 6. 注意：root 文件（AGENTS.md, CLAUDE.md, .claude/, .opencode/, .cursor/ 等）
  //    均为静态引用（只指向 spec-center），add 时不需要修改。
  //    详见 "Section 8. add 命令对 root 文件的影响"。

  printSummary(workspaceDir, projectName, filtered, 'added');
}
```

### 4.4 workspace 检测逻辑

```javascript
function findSpecCenter(startDir) {
  let dir = startDir;
  // 向上遍历最多 5 层父目录
  for (let i = 0; i < 5; i++) {
    const matches = fs.readdirSync(dir)
      .filter(name => name.endsWith('-spec-center') && fs.statSync(path.join(dir, name)).isDirectory());
    if (matches.length > 0) return path.join(dir, matches[0]);
    const parent = path.dirname(dir);
    if (parent === dir) break; // 到达根目录
    dir = parent;
  }
  return null;
}
```

### 4.5 触发方式

```bash
# 显式子命令（需在 workspace 目录内）
cd ~/projects/acme
node src/cli.js add

# 通过 kickstart.sh（自动检测）
cd ~/projects/acme
curl -fsSL ... | bash
# → 检测到 *-spec-center/，自动执行 add

# 非交互
node src/cli.js add -m mobile,admin
node src/cli.js add -c crawler:server
```

## 5. AGENTS.md 模板标记与动态过滤

### 5.1 模板标记语法

在 `templates/spec-center/AGENTS.md` 中使用 HTML 注释标记可过滤区域。

**单行标记**（用于表格行、列表项等单行内容）：

```markdown
### Module Map

| Module | Role |
|---|---|
<!-- MODULE:admin -->| `admin` | Admin manager application|
<!-- MODULE:mobile -->| `mobile` | Mobile application |
<!-- MODULE:server -->| `server` | Backend service implementation |
| `spec-center` | **Single Source of Truth (SSOT)** ... |
<!-- MODULE:web -->| `web` | Web application|
```

**多行块标记**（用于代码块、目录树等多行内容）：

```markdown
<!-- BEGIN MODULE:server -->
├── {{PROJECT}}-server/
│   ├── AGENTS.md
│   └── docs/
│       ├── specs/
│       └── plans/
<!-- END MODULE:server -->
<!-- BEGIN MODULE:web -->
├── {{PROJECT}}-web/
│   └── ...
<!-- END MODULE:web -->
```

### 5.2 需要标记的完整位置

基于 `templates/spec-center/AGENTS.md`（215 行）实际内容，以下区域需要添加标记：

| 位置 | 标记类型 | 说明 |
|------|---------|------|
| Module Map 表中每行（第 11-15 行） | `<!-- MODULE:xxx -->` | 未选中模块的行被移除 |
| Implementation Plans 表（第 75-76 行） | `<!-- MODULE:xxx -->` | Server/Web 行按模块过滤 |
| Repository Structure 树（第 187-214 行） | `<!-- BEGIN/END MODULE:xxx -->` | 每个模块的目录子树 |
| 执行依赖顺序行（第 84 行） | 无需标记 | 保留原文，内容为通用指导 |
| Convention Documents 表（第 139-143 行） | 无需标记 | 保留所有约定，不论模块选择 |
| 示例代码块（第 89-95 行） | `<!-- BEGIN/END MODULE:xxx -->` | Server/Web 示例路径 |

### 5.3 过滤规则

| 标记 | 用途 | 过滤方式 |
|------|------|----------|
| `<!-- MODULE:xxx -->` | 表格行、列表项等单行 | 未选中 → 移除整行；选中 → 去掉标记保留内容 |
| `<!-- BEGIN MODULE:xxx -->` ... `<!-- END MODULE:xxx -->` | 代码块、目录树等多行块 | 未选中 → 移除整个块（含标记行）；选中 → 去掉标记保留内容 |

`spec-center` 是必选，其标记行始终保留。

### 5.4 自定义模块的处理

自定义模块在过滤时作为额外的模块名参与。例如添加了 `crawler` 模块：

- Module Map 表中追加 `| \`crawler\` | Backend service implementation |`
- Repository Structure 树中追加对应的目录子树

自定义模块的 Role 取自参考模板的 AGENTS.md 第一行标题（如 `server` 的 Role 是 "Backend service implementation"）。

### 5.5 agents-sync.js 核心逻辑

#### init 命令：基于模板的全量过滤

```javascript
const MODULE_MARKER = /<!-- MODULE:([a-z0-9-]+) -->/;
const BEGIN_MARKER = /<!-- BEGIN MODULE:([a-z0-9-]+) -->/;
const END_MARKER = /<!-- END MODULE:([a-z0-9-]+) -->/;

function filterAgentsMd(templateContent, selectedModules) {
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
        continue; // 未选中，跳过
      }
      result.push(line.replace(/<!-- MODULE:[a-z0-9-]+ -->\s?/, ''));
      continue;
    }

    result.push(line);
  }

  return result.join('\n');
}
```

#### add 命令：增量 merge（保留用户修改）

`add` 命令不重新生成 AGENTS.md，而是对已有文件做增量插入：

```javascript
function mergeAgentsMd(workspaceDir, projectName, newModules) {
  const agentsPath = path.join(workspaceDir, `${projectName}-spec-center`, 'AGENTS.md');
  let content = readFileSync(agentsPath, 'utf-8');

  for (const mod of newModules) {
    // 1. Module Map 表中追加行（找到表格末尾）
    const role = getModuleRole(mod.templateRef); // 从模板 AGENTS.md 读取
    const tableRow = `| \`${mod.name}\` | ${role} |`;
    content = insertAfterLastModuleMapRow(content, tableRow, mod.name);

    // 2. Repository Structure 树中追加子树（找到树末尾）
    const treeEntry = buildModuleTreeEntry(projectName, mod.name, mod.templateRef);
    content = insertBeforeTreeEnd(content, treeEntry);
  }

  writeFileSync(agentsPath, content, 'utf-8');
}
```

> **关键原则**：`mergeAgentsMd` 只在标记区域（Module Map 表、Repository Structure 树）的末尾追加新行，不修改用户已有的内容。

#### 自定义模块追加到 Module Map

对于自定义模块（`isCustom: true`），需要在 Module Map 表中追加一行，按字母顺序插入到正确位置：

```javascript
function insertAfterLastModuleMapRow(content, newRow, moduleName) {
  // 找到 Module Map 表格的最后一行（含 | `xxx` | 的行）
  // 按字母顺序插入新行
  const lines = content.split('\n');
  let tableStart = -1;
  let tableEnd = -1;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].match(/^\| .* \| .* \|$/)) {
      if (tableStart === -1) tableStart = i;
      tableEnd = i;
    } else if (tableStart !== -1 && tableEnd !== -1) {
      break; // 表格结束
    }
  }

  // 收集现有模块行 + 新行，按模块名字母排序
  const moduleLines = lines.slice(tableStart, tableEnd + 1);
  moduleLines.push(newRow);
  moduleLines.sort((a, b) => {
    const nameA = a.match(/`([^`]+)`/)?.[1] || '';
    const nameB = b.match(/`([^`]+)`/)?.[1] || '';
    return nameA.localeCompare(nameB);
  });

  // 替换原表格区域
  lines.splice(tableStart, tableEnd - tableStart + 1, ...moduleLines);
  return lines.join('\n');
}
```

## 6. Node.js CLI 技术细节

### 6.1 依赖与配置

```json
{
  "name": "spec-center-template",
  "type": "module",
  "engines": { "node": ">=18.0.0" },
  "bin": {
    "scaffold": "./src/cli.js"
  },
  "dependencies": {
    "@inquirer/prompts": "^7.x",
    "commander": "^12.x",
    "chalk": "^5.x",
    "ora": "^8.x",
    "glob": "^10.x"
  }
}
```

| 包 | 用途 |
|---|---|
| `@inquirer/prompts` | checkbox（模块选择）、input（项目名/路径）、confirm（确认） |
| `commander` | 子命令路由（init/add）、参数解析 |
| `chalk` | 彩色输出（ESM-only，需 `"type": "module"`） |
| `ora` | git init、文件复制等操作的 spinner 反馈 |
| `glob` | `globSync` 文件匹配（Node <22 不内置，需此包） |

### 6.2 CLI 入口

`src/cli.js` 首行必须包含 shebang：

```javascript
#!/usr/bin/env node

import { program } from 'commander';
import { init } from './commands/init.js';
import { add } from './commands/add.js';

program
  .command('init')
  .description('Create a new workspace')
  .option('-n, --name <name>', 'Project name')
  .option('-d, --dir <path>', 'Workspace directory')
  .option('-m, --modules <list>', 'Comma-separated modules')
  .option('--templates-dir <path>', 'Override templates directory')
  .option('--dry-run', 'Show what would be created')
  .action(init);

program
  .command('add')
  .description('Add modules to existing workspace')
  .option('-m, --modules <list>', 'Comma-separated modules to add')
  .option('-c, --custom <name:ref>', 'Add custom module')
  .option('--templates-dir <path>', 'Override templates directory')
  .option('--dry-run', 'Show what would be created')
  .action(add);

program.parse();
```

### 6.3 templates.js — 模板发现与校验

```javascript
import { readdirSync, statSync, readFileSync } from 'fs';
import { resolveTemplatesDir } from './path.js';

// 返回可用模板名列表（从 templates/ 目录动态发现）
export function getAvailableTemplateNames() {
  const templatesDir = resolveTemplatesDir();
  return readdirSync(templatesDir)
    .filter(name => statSync(resolveTemplatesDir(name)).isDirectory())
    .filter(name => name !== 'root'); // root 不是可选模块
}

// 从模板 AGENTS.md 提取 Role 描述
export function getModuleRole(templateName) {
  const templatesDir = resolveTemplatesDir();
  const agentsPath = resolveTemplatesDir(templateName, 'AGENTS.md');
  const content = readFileSync(agentsPath, 'utf-8');
  // 匹配 "## Role" 下一行
  const match = content.match(/## Role\n(.+)/);
  return match ? match[1].trim() : templateName;
}

// 校验模板完整性
export function validateTemplate(templateName) {
  const templatesDir = resolveTemplatesDir();
  const templatePath = resolveTemplatesDir(templateName);
  if (!statSync(templatePath).isDirectory()) {
    throw new Error(`Template not found: ${templateName}`);
  }
  return true;
}
```

### 6.4 路径处理

```javascript
import { homedir } from 'os';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// CLI 自身所在目录（用于定位默认 templates/ 路径）
const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_TEMPLATES_DIR = resolve(__dirname, '../../templates');

// 解析 templates 目录（支持 --templates-dir 覆盖）
export function resolveTemplatesDir(...subPaths) {
  const base = globalArgs.templatesDir || DEFAULT_TEMPLATES_DIR;
  return resolve(base, ...subPaths);
}

// ~ 展开
export function expandHome(inputPath) {
  if (inputPath.startsWith('~')) {
    return resolve(inputPath.replace(/^~/, homedir()));
  }
  return resolve(inputPath);
}
```

### 6.5 项目名称校验

```javascript
const PROJECT_NAME_REGEX = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

function validateProjectName(name) {
  if (!PROJECT_NAME_REGEX.test(name)) {
    return 'Must start with lowercase letter, only lowercase/digits/hyphens';
  }
  if (name.length < 2 || name.length > 50) {
    return 'Must be 2-50 characters';
  }
  return true;
}
```

自定义模块名同样使用此校验。

### 6.6 copyAndReplace 核心实现

**策略**：整体复制目录，然后仅对文本文件做占位符替换。二进制文件原样保留。

```javascript
import { cpSync, readFileSync, writeFileSync, statSync } from 'fs';
import { globSync } from 'glob';
import { resolveTemplatesDir } from './templates.js';

const TEXT_FILE_EXTENSIONS = new Set([
  '.md', '.txt', '.json', '.yaml', '.yml', '.toml',
  '.js', '.ts', '.jsx', '.tsx', '.go', '.py', '.rb',
  '.sh', '.bash', '.zsh', '.gitignore', '.cursorignore',
  '.env', '.env.example', '.gitkeep', '.mdc',
  '.makefile', 'Makefile',
]);

function isTextFile(filePath) {
  const base = path.basename(filePath);
  if (base === 'Makefile' || base === 'Dockerfile') return true;
  const ext = path.extname(filePath);
  return TEXT_FILE_EXTENSIONS.has(ext) || ext === '';
}

export function copyAndReplace(templateName, targetDir, vars) {
  const srcDir = resolveTemplatesDir(templateName);

  // 1. 整体复制（包含所有文件：文本 + 二进制）
  cpSync(srcDir, targetDir, { recursive: true });

  // 2. 仅对文本文件做占位符替换
  const files = globSync('**/*', { cwd: targetDir, nodir: true });
  for (const file of files) {
    const filePath = path.join(targetDir, file);

    if (!isTextFile(filePath)) continue; // 跳过二进制文件

    let content = readFileSync(filePath, 'utf-8');

    // 替换 {{PROJECT}}
    content = content.replace(/\{\{PROJECT\}\}/g, vars.PROJECT);

    // 自定义模块：替换模块名引用（精确匹配 -templateRef 形式）
    if (vars.MODULE_NAME && vars.TEMPLATE_REF) {
      content = content.replace(
        new RegExp(`-${vars.TEMPLATE_REF}\\b`, 'g'),
        `-${vars.MODULE_NAME}`
      );
    }

    writeFileSync(filePath, content, 'utf-8');
  }
}
```

## 7. 错误处理与边界情况

### 7.1 错误场景

| 场景 | 行为 |
|------|------|
| Node.js 未安装（kickstart.sh） | 打印安装提示（含 nvm/官方链接），退出 |
| Node.js < 18 | 提示升级（显示当前版本），退出 |
| 项目名不合法 | Inquirer 内联校验，循环提示 |
| workspace 目录已存在且非空 | 询问覆盖/合并 |
| 模块目录已存在（add 时） | 跳过该模块，警告 |
| 参考模板不存在 | 报错，列出可用模板（`getAvailableTemplateNames()`） |
| 自定义模块名与已有模块重名 | 报错 |
| spec-center 被取消选择 | 强制保留（Inquirer checkbox disabled） |
| add 时不在 workspace 目录内 | 向上遍历最多 5 层父目录，仍未找到则报错并提示 usage |
| 自定义模块名不合法 | 复用项目名校验规则，报错 |
| git init 失败 | 报错并跳过该模块（git 可能未安装） |
| 二进制文件遇到占位符 | 跳过，不做文本替换 |

### 7.2 幂等性

- `init`：workspace 目录非空时 prompt 确认
- `add`：已存在的模块自动跳过（不覆盖已有内容）
- `add`：AGENTS.md 使用增量 merge，仅追加新模块条目到标记区域，不修改用户已有内容
- `add`：root 文件（AGENTS.md, CLAUDE.md, .claude/, .opencode/, .cursor/ 等）永远不被修改

### 7.3 kickstart.sh 容错

```bash
TEMP_DIR=$(mktemp -d)
cleanup() { rm -rf "$TEMP_DIR"; }
trap cleanup EXIT

if ! git clone --depth 1 "$REPO_URL" "$TEMP_DIR" 2>/dev/null; then
  echo "Error: Failed to download templates from $REPO_URL"
  exit 1
fi

if ! npm install --production --silent 2>/dev/null; then
  echo "Error: npm install failed."
  exit 1
fi
```

### 7.4 add 命令对 root 文件的影响

**结论：add 命令不会修改任何 root 文件。**

Root 模板中的 7 个文件全部是静态引用，只指向 spec-center（必选模块）：

| 文件 | 内容 | 是否含模块引用 |
|------|------|--------------|
| `AGENTS.md` | `→ See [{{PROJECT}}-spec-center/AGENTS.md]` | ❌ 只指向 spec-center |
| `CLAUDE.md` | `@AGENTS.md` + `@{{PROJECT}}-spec-center/conventions/...` | ❌ 只指向 spec-center |
| `.claude/settings.json` | 通用 deny 规则 | ❌ |
| `.opencode/opencode.json` | 通用 permission 规则 | ❌ |
| `.cursorignore` | 通用 ignore 规则 | ❌ |
| `.cursorindexingignore` | 通用 ignore 规则（含注释掉的模块特定段） | ❌ |
| `.cursor/rules/engineering-guidelines.mdc` | `@../../{{PROJECT}}-spec-center/...` | ❌ 只指向 spec-center |

因此 `add` 命令只操作：
1. 新模块目录（创建 + git init）
2. `spec-center/AGENTS.md`（增量 merge）

## 8. 测试策略

### 8.1 单元测试

| 模块 | 测试要点 |
|------|---------|
| `filterAgentsMd` | 各种模块组合过滤（仅 spec-center、全模块、部分模块）；自定义模块追加 |
| `validateProjectName` | 边界值（1 字符、51 字符、大写、下划线、连字符开头/结尾） |
| `expandHome` | `~/xxx`、`./xxx`、绝对路径、空字符串 |
| `mergeAgentsMd` | Module Map 表排序插入、Repository Structure 树追加 |
| `findSpecCenter` | workspace 内、子目录内、workspace 外、嵌套目录 |
| `copyAndReplace` | 文本文件替换、二进制文件跳过、自定义模块名替换 |
| `getModuleRole` | 从模板 AGENTS.md 提取 Role |

### 8.2 集成测试

| 场景 | 验证点 |
|------|-------|
| `init` 全模块 | 所有模块目录创建、git init + commit、AGENTS.md 过滤正确 |
| `init` 仅 spec-center | 只创建 spec-center 目录，AGENTS.md 不含其他模块 |
| `init --dry-run` | 不创建任何文件，输出完整的文件列表 |
| `add` 添加单个模块 | 新目录创建、AGENTS.md 增量追加正确 |
| `add` 添加自定义模块 | 基于参考模板创建、AGENTS.md Role 正确 |
| `add` 已有模块跳过 | 不覆盖、警告信息正确 |
| kickstart.sh | 远程 clone → npm install → 自动检测模式 |

### 8.3 测试工具

```json
{
  "devDependencies": {
    "vitest": "^2.x",
    "tmp-promise": "^3.x"
  }
}
```

使用 `tmp-promise` 创建临时目录进行集成测试，避免污染文件系统。

## 9. 迁移计划

1. 删除 `init.sh`
2. 创建 `package.json`（含 `"type": "module"`）和 `src/` 目录结构
3. 在 `templates/spec-center/AGENTS.md` 中添加 MODULE 标记（按 Section 5.2 的位置清单）
4. 创建 `kickstart.sh`（硬编码实际 REPO_URL）
5. 更新 `README.md` 中的使用说明（新增 add 命令、自定义模块、远程执行）
