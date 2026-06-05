# Polyrepo Starter

多仓库工作区项目通用脚手架。生成独立的 Git 仓库（spec-center、server、web、mobile、admin），通过单一事实来源（SSOT）共享规范与约定。

**[English](README.md)**

## 快速开始

### 远程安装（推荐）

交互模式（引导式提示）：

```bash
curl -fsSL https://raw.githubusercontent.com/0xkanglj/polyrepo-starter/main/kickstart.sh | bash
```

非交互模式（CLI 参数）：

```bash
curl -fsSL https://raw.githubusercontent.com/0xkanglj/polyrepo-starter/main/kickstart.sh | bash -s -- \
  --name my-project \
  --modules server,web
```

> 添加 `--dir <path>` 可指定自定义工作区目录（默认：`./{name}`）。

非交互模式（环境变量）：

```bash
curl -fsSL https://raw.githubusercontent.com/0xkanglj/polyrepo-starter/main/kickstart.sh | env \
  PROJECT_NAME=my-project \
  MODULES="server,web,admin" \
  bash
```

### 本地安装

```bash
git clone https://github.com/0xkanglj/polyrepo-starter.git
cd polyrepo-starter
npm install
node src/cli.js
```

## 使用说明

CLI 使用统一的 `scaffold` 命令，自动检测是创建新工作区（**init 模式**）还是向已有工作区添加模块（**add 模式**）。

### Init 模式（新建工作区）

当提供 `--name` 参数，或附近未找到 `*-spec-center/` 目录时触发。

```bash
node src/cli.js [选项]
  -n, --name <名称>          项目名称
  -d, --dir <路径>           工作区目录（默认：./{name}）
  -m, --modules <列表>       模块列表："名称" 或 "名称=模板"，逗号分隔
      --dry-run              预览将创建的内容
      --verbose              启用调试输出
```

### Add 模式（扩展已有工作区）

当 CLI 在当前目录或父目录中检测到 `*-spec-center/` 目录时自动触发。

```bash
cd my-project
node /path/to/polyrepo-starter/src/cli.js [选项]
  -m, --modules <列表>       要添加的模块（如 "web"、"api=server"）
      --dry-run              预览将创建的内容
      --verbose              启用调试输出
```

### 模块列表语法

```bash
# 按名称指定内置模块
-m server,web,admin

# 自定义名称基于模板（名称=模板）
-m api-gateway=server,user-service=server,web

# 混合使用
-m server,my-admin=admin
```

### 交互模式

不指定 `-m` 时，CLI 进入交互模式：

1. 输入项目名称和目录（init 模式）
2. 从可用模板中选择模块
3. 可选重命名模块（基于模板创建自定义模块）
4. **确认表格** — 确认、编辑名称、移除或继续添加模块
5. 确认后执行创建

## 模块说明

| 模块 | 是否必选 | 说明 |
|------|----------|------|
| spec-center | 必选（自动包含） | 共享规范与约定（SSOT） |
| server | 可选 | 后端服务 |
| web | 可选 | Web 应用 |
| mobile | 可选 | 移动端应用 |
| admin | 可选 | 管理后台 |

## 生成目录结构

```
my-project/                           # 工作区根目录（非 Git 仓库）
├── AGENTS.md                         → 指向 spec-center AGENTS.md
├── CLAUDE.md                         → 指向 AGENTS.md
├── .claude/settings.json             → Claude Code 拒绝规则
├── .opencode/opencode.json           → OpenCode 拒绝规则
├── .cursorignore / .cursorindexingignore
├── .cursor/rules/engineering-guidelines.mdc
├── my-project-spec-center/           → SSOT 仓库（规范、约定、错误码）
├── my-project-server/                → 后端服务仓库
├── my-project-web/                   → Web 应用仓库
├── my-project-mobile/                → 移动端应用仓库
└── my-project-admin/                 → 管理后台仓库
```

## 项目名称规则

- 以小写字母开头
- 仅允许小写字母、数字和连字符
- 不允许连续或末尾连字符
- 长度 2-50 个字符
- 正则：`^[a-z][a-z0-9]*(-[a-z0-9]+)*$`

## 许可证

MIT
