# Polyrepo Starter

多仓库工作区项目通用脚手架。生成独立的 Git 仓库（spec-center、server、web、mobile、admin），通过单一事实来源（SSOT）共享规范与约定。

**[English](README.md)**

## 快速开始

### 远程安装（推荐）

```bash
curl -fsSL https://raw.githubusercontent.com/0xkanglj/polyrepo-starter/main/kickstart.sh | bash
```

### 本地安装

```bash
git clone https://github.com/0xkanglj/polyrepo-starter.git
cd polyrepo-starter
npm install
node src/cli.js init
```

## 命令说明

### `init` — 创建新工作区

```bash
node src/cli.js init [选项]
  -n, --name <名称>          项目名称
  -d, --dir <路径>           工作区目录（默认：./{name}）
  -m, --modules <列表>       逗号分隔的模块列表
      --templates-dir <路径> 覆盖模板目录
      --dry-run              预览将创建的内容
```

### `add` — 向已有工作区添加模块

```bash
node src/cli.js add [选项]
  -m, --modules <列表>       逗号分隔的模块列表
      --templates-dir <路径> 覆盖模板目录
      --dry-run              预览将创建的内容
```

交互模式下，依次选择模板、输入模块名（可重命名）。同一模板可多次使用、不同命名。

## 模块说明

| 模块 | 是否必选 | 说明 |
|------|----------|------|
| spec-center | ✅ 必选 | 共享规范与约定（SSOT） |
| server | 可选 | 后端服务 |
| web | 可选 | Web 应用 |
| mobile | 可选 | 移动端应用 |
| admin | 可选 | 管理后台应用 |

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
