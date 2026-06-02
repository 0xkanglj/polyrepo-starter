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
│   ├── root/
│   ├── spec-center/
│   ├── server/
│   ├── web/
│   ├── mobile/
│   └── admin/
└── README.md
```

### 旧的 init.sh 删除

现有 `init.sh`（Bash 版本）将被删除，由 Node.js CLI 完全替代。

## 2. kickstart.sh — 远程引导脚本

用户执行：`curl -fsSL https://raw.githubusercontent.com/<user>/spec-center-template/main/kickstart.sh | bash`

### 执行流程

```
1. 检测 Node.js (>=18)
   ├── 未安装 → 打印安装提示，退出
   └── 已安装 → 继续

2. 创建临时目录，git clone --depth 1 仓库

3. npm install --production

4. 自动检测当前目录状态
   ├── 含 *-spec-center/ → 执行 add 子命令
   └── 空目录或其他 → 执行 init 子命令

5. 执行 CLI，透传所有参数
   node src/cli.js init "$@"
   # 或
   node src/cli.js add "$@"

6. 清理临时目录（trap EXIT）
```

### 关键实现

```bash
REPO_URL="https://github.com/<user>/spec-center-template.git"
TEMP_DIR=$(mktemp -d)

cleanup() { rm -rf "$TEMP_DIR"; }
trap cleanup EXIT

git clone --depth 1 "$REPO_URL" "$TEMP_DIR"
cd "$TEMP_DIR"
npm install --production

# 自动检测模式
if find "$ORIGINAL_DIR" -maxdepth 1 -type d -name '*-spec-center' 2>/dev/null | grep -q .; then
  node src/cli.js add --templates-dir "$TEMP_DIR/templates" "$@"
else
  node src/cli.js init --templates-dir "$TEMP_DIR/templates" "$@"
fi
```

`--templates-dir` 参数让 CLI 知道模板所在位置，不依赖脚本自身目录。

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

  // spec-center 强制包含
  if (!modules.find(m => m.name === 'spec-center')) {
    modules.unshift({ name: 'spec-center', templateRef: 'spec-center', isCustom: false });
  }

  if (options.dryRun) {
    printDryRun(workspaceDir, name, modules);
    return;
  }

  mkdirIfNeeded(workspaceDir);
  copyAndReplace('root', workspaceDir, { PROJECT: name });

  for (const mod of modules) {
    const modDir = path.join(workspaceDir, `${name}-${mod.name}`);
    copyAndReplace(mod.templateRef, modDir, {
      PROJECT: name,
      MODULE_NAME: mod.isCustom ? mod.name : null,
      TEMPLATE_REF: mod.isCustom ? mod.templateRef : null,
    });
    gitInit(modDir, mod.name);
  }

  syncAgentsMd(workspaceDir, name, modules);
  printSummary(workspaceDir, name, modules);
}
```

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
  // 1. 检测 workspace
  const specCenterDir = findSpecCenter(cwd);
  if (!specCenterDir) {
    error('Not in a workspace directory. No *-spec-center/ found.');
    process.exit(1);
  }

  const projectName = extractProjectName(specCenterDir);
  const existingModules = scanExistingModules(cwd, projectName);
  const allModuleNames = ['spec-center', 'server', 'web', 'mobile', 'admin'];
  const available = allModuleNames.filter(m => !existingModules.includes(m));

  // 2. 收集要添加的模块
  const toAdd = options.modules
    ? parseModuleList(options.modules)
    : await promptAddModules(available);

  // 处理 -c 参数的自定义模块
  if (options.custom) {
    for (const c of options.custom) {
      const [name, ref] = c.split(':');
      toAdd.push({ name, templateRef: ref, isCustom: true });
    }
  }

  // 3. 跳过已存在的模块
  const filtered = toAdd.filter(m => !existingModules.includes(m.name));

  // 4. 执行
  for (const mod of filtered) {
    const modDir = path.join(cwd, `${projectName}-${mod.name}`);
    copyAndReplace(mod.templateRef, modDir, { ... });
    gitInit(modDir, mod.name);
  }

  // 5. 重新生成 AGENTS.md（全量）
  const allActive = [...existingModules.map(m => ({
    name: m, templateRef: m, isCustom: false
  })), ...filtered];
  syncAgentsMd(cwd, projectName, allActive);

  printSummary(cwd, projectName, filtered, 'added');
}
```

### 4.4 触发方式

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

**单行标记**（用于 Module Map 表）：

```markdown
### Module Map

|| Module | Role |
||---|---|
<!-- MODULE:admin -->|| `admin` | Admin manager application|
<!-- MODULE:mobile -->|| `mobile` | Mobile application |
<!-- MODULE:server -->|| `server` | Backend service implementation |
<!-- MODULE:spec-center -->|| `spec-center` | **Single Source of Truth (SSOT)** ... |
<!-- MODULE:web -->|| `web` | Web application|
```

**多行块标记**（用于 Repository Structure 树）：

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

### 5.2 过滤规则

| 标记 | 用途 | 过滤方式 |
|------|------|----------|
| `<!-- MODULE:xxx -->` | Module Map 表中单行 | 移除含此标记的行，选中时去掉标记保留内容 |
| `<!-- BEGIN MODULE:xxx -->` ... `<!-- END MODULE:xxx -->` | 多行块 | 移除整个块（含标记行本身） |

`spec-center` 是必选，其标记行始终保留。

### 5.3 自定义模块的处理

自定义模块在过滤时作为额外的模块名参与。例如添加了 `crawler` 模块：

- Module Map 表中追加 `|| \`crawler\` | Backend service implementation |`
- Repository Structure 树中追加对应的目录子树

自定义模块的 Role 取自参考模板的 AGENTS.md 第一行标题（如 `server` 的 Role 是 "Backend service implementation"）。

### 5.4 agents-sync.js 核心逻辑

```javascript
function filterAgentsMd(templateContent, selectedModules) {
  const lines = templateContent.split('\n');
  const result = [];
  let skipMode = null;

  for (const line of lines) {
    const beginMatch = line.match(/<!-- BEGIN MODULE:([\w-]+) -->/);
    const endMatch = line.match(/<!-- END MODULE:([\w-]+) -->/);

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

    const singleMatch = line.match(/<!-- MODULE:([\w-]+) -->/);
    if (singleMatch) {
      if (!selectedModules.includes(singleMatch[1])) {
        continue;
      }
      result.push(line.replace(/<!-- MODULE:[\w-]+ -->\s?/, ''));
      continue;
    }

    result.push(line);
  }

  return result.join('\n');
}
```

add 命令执行后，使用全量模块列表（existing + new）重新调用此函数生成完整 AGENTS.md。

## 6. Node.js CLI 技术细节

### 6.1 依赖

```json
{
  "dependencies": {
    "@inquirer/prompts": "^7.x",
    "commander": "^12.x",
    "chalk": "^5.x",
    "ora": "^8.x"
  }
}
```

| 包 | 用途 |
|---|---|
| `@inquirer/prompts` | checkbox（模块选择）、input（项目名/路径）、confirm（确认） |
| `commander` | 子命令路由（init/add）、参数解析 |
| `chalk` | 彩色输出 |
| `ora` | git init、文件复制等操作的 spinner 反馈 |

### 6.2 路径处理

```javascript
import { homedir } from 'os';
import { resolve } from 'path';

export function expandHome(inputPath) {
  if (inputPath.startsWith('~')) {
    return resolve(inputPath.replace(/^~/, homedir()));
  }
  return resolve(inputPath);
}
```

### 6.3 项目名称校验

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

### 6.4 copyAndReplace 核心实现

```javascript
export function copyAndReplace(templateName, targetDir, vars) {
  cpSync(
    path.join(templatesDir, templateName),
    targetDir,
    { recursive: true }
  );

  const files = globSync('**/*', { cwd: targetDir, nodir: true });
  for (const file of files) {
    const filePath = path.join(targetDir, file);
    let content = readFileSync(filePath, 'utf-8');

    // 替换 {{PROJECT}}
    content = content.replace(/\{\{PROJECT\}\}/g, vars.PROJECT);

    // 自定义模块：替换模块名引用（精确匹配 {{PROJECT}}-templateRef 形式）
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

### 6.5 package.json bin

```json
{
  "name": "spec-center-template",
  "bin": {
    "scaffold": "./src/cli.js"
  }
}
```

## 7. 错误处理与边界情况

### 7.1 错误场景

| 场景 | 行为 |
|------|------|
| Node.js 未安装（kickstart.sh） | 打印安装提示，退出 |
| Node.js < 18 | 提示升级，退出 |
| 项目名不合法 | Inquirer 内联校验，循环提示 |
| workspace 目录已存在且非空 | 询问覆盖/合并 |
| 模块目录已存在（add 时） | 跳过该模块，警告 |
| 参考模板不存在 | 报错，列出可用模板 |
| 自定义模块名与已有模块重名 | 报错 |
| spec-center 被取消选择 | 强制保留 |

### 7.2 幂等性

- `init`：workspace 目录非空时 prompt 确认
- `add`：已存在的模块自动跳过
- AGENTS.md 每次全量重新生成，不做增量追加

### 7.3 kickstart.sh 容错

```bash
TEMP_DIR=$(mktemp -d)
cleanup() { rm -rf "$TEMP_DIR"; }
trap cleanup EXIT

if ! git clone --depth 1 "$REPO_URL" "$TEMP_DIR"; then
  echo "Failed to download templates."
  exit 1
fi
```

## 8. 迁移计划

1. 删除 `init.sh`
2. 创建 `package.json` 和 `src/` 目录结构
3. 在 `templates/spec-center/AGENTS.md` 中添加 MODULE 标记
4. 创建 `kickstart.sh`
5. 更新 `README.md` 中的使用说明
