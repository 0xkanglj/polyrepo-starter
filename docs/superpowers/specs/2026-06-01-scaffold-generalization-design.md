# Scaffold Generalization Design

> Date: 2026-06-01
> Status: Draft

## Overview

将 spec-center-template 从一个绑定了 `deluxe-` 前缀和特定业务内容的模板，改造为通用脚手架。包含三项核心工作：

1. **文档通用化** — 去掉业务绑定，改为 `{{PROJECT}}` 占位符；时间格式改为 UTC `Z`；新增 Go 项目结构规范
2. **初始化脚本** — Bash 脚本，交互式创建 multi-repo workspace（多个独立 Git 仓库共存于同一目录，方便联合开发）
3. **Go 项目规范文档** — 在 conventions/ 中新增 Go 项目结构约定

### 架构定位：Multi-repo Workspace

脚手架生成的是 **multi-repo workspace**，不是 monorepo：

- 每个模块是独立的 Git 仓库，拥有独立的 `.git`
- 所有仓库平铺在同一目录下（如 `~/projects/acme/`），方便本地联合开发
- 目录之间无 Git 级别的依赖关系，模块间仅通过 API / spec-center 协作
- spec-center 作为 SSOT 仓库，其他模块仓库通过相对路径或约定引用其内容

**所有模块均不预设技术栈**。Makefile、.gitignore、.env.example 仅提供通用骨架，具体技术选型（语言、框架、数据库等）由各项目在模块 AGENTS.md 中自行定义。

## 1. 脚手架仓库目录结构

```
spec-center-template/
├── init.sh
├── README.md
├── LICENSE
├── docs/
│   └── superpowers/
│       └── specs/
└── templates/
    ├── root/
    │   ├── AGENTS.md
    │   └── CLAUDE.md
    ├── spec-center/
    │   ├── AGENTS.md
    │   ├── CLAUDE.md
    │   ├── .gitignore
    │   ├── conventions/
    │   │   ├── http-constitution.md
    │   │   ├── validation.md
    │   │   └── go-project.md
    │   ├── api/
    │   │   └── .gitkeep
    │   ├── docs/
    │   │   └── specs/
    │   │       └── .gitkeep
    │   ├── errors/
    │   │   └── error-codes.md
    │   └── events/
    │       └── .gitkeep
    ├── server/
    │   ├── AGENTS.md
    │   ├── CLAUDE.md
    │   ├── .gitignore
    │   ├── .env.example
    │   ├── Makefile
    │   └── docs/
    │       ├── specs/
    │       │   └── .gitkeep
    │       └── plans/
    │           └── .gitkeep
    ├── web/
    │   ├── AGENTS.md
    │   ├── CLAUDE.md
    │   ├── .gitignore
    │   ├── .env.example
    │   ├── Makefile
    │   └── docs/
    │       ├── specs/
    │       │   └── .gitkeep
    │       └── plans/
    │           └── .gitkeep
    ├── mobile/
    │   ├── AGENTS.md
    │   ├── CLAUDE.md
    │   ├── .gitignore
    │   ├── .env.example
    │   ├── Makefile
    │   └── docs/
    │       ├── specs/
    │       │   └── .gitkeep
    │       └── plans/
    │           └── .gitkeep
    └── admin/
        ├── AGENTS.md
        ├── CLAUDE.md
        ├── .gitignore
        ├── .env.example
        ├── Makefile
        └── docs/
            ├── specs/
            │   └── .gitkeep
            └── plans/
                └── .gitkeep
```

**各模块 CLAUDE.md** 统一为 `@AGENTS.md`，指向同目录的 AGENTS.md。

**spec-center 无 `.env.example` 和 Makefile**，其他模块各有一个。

### 1.1 根目录模板内容

`templates/root/` 生成 workspace 根目录文件（workspace 根**不是** Git 仓库）：

**AGENTS.md：**

```markdown
# {{PROJECT}} Workspace

→ See [{{PROJECT}}-spec-center/AGENTS.md]({{PROJECT}}-spec-center/AGENTS.md) for full project rules and conventions.
```

**CLAUDE.md：**

```markdown
@AGENTS.md
```

### 1.2 各模块 AGENTS.md 模板

每个模块的 AGENTS.md 提供骨架，不预设技术栈。以 `server` 为例，其他模块结构相同：

**`templates/server/AGENTS.md`：**

```markdown
# {{PROJECT}}-server

## Role
Backend service implementation

## Mandatory Specs
- [HTTP Constitution](../{{PROJECT}}-spec-center/conventions/http-constitution.md)
- [Input Validation](../{{PROJECT}}-spec-center/conventions/validation.md)
- [Error Codes](../{{PROJECT}}-spec-center/errors/error-codes.md)
- [Go Project Structure](../{{PROJECT}}-spec-center/conventions/go-project.md)

## Key Responsibilities
<!-- Define module-specific responsibilities here -->

## Tech Stack
<!-- Define technology choices here: language, framework, database, etc. -->

## Build & Test
<!-- Define build, test, lint commands here -->
```

**`templates/web/AGENTS.md`** / **`templates/mobile/AGENTS.md`** / **`templates/admin/AGENTS.md`**：结构相同，Role 分别为 "Web application"、"Mobile application"、"Admin manager application"，Mandatory Specs 链接相同，Key Responsibilities / Tech Stack / Build & Test 均为占位注释。

**`templates/spec-center/AGENTS.md`**：即 spec-center 模板的完整 AGENTS.md（见 2.1 节），无需额外模板。

## 2. 文档通用化改动

### 2.1 AGENTS.md（spec-center 模板）

**占位符替换：**

| 原文 | 替换为 |
|------|--------|
| `deluxe-spec-center` | `{{PROJECT}}-spec-center` |
| `deluxe-server` | `{{PROJECT}}-server` |
| `deluxe-web` | `{{PROJECT}}-web` |
| `deluxe-mobile` | `{{PROJECT}}-mobile` |
| `deluxe-admin` | `{{PROJECT}}-admin` |

**业务特定内容移除：**

- Core Domain Concepts（Sales Order、Product/SKU、Customer、Inventory、Order Audit）— 整段移除，替换为说明："在此定义项目核心领域概念（聚合根、值对象等）"
- `sales_ordering_system_prd.md` — 从 Repository Structure 中移除
- `OMS 后台管理系统` → 通用描述如 "Web application"
- `前端 Client` → 通用描述如 "Mobile application"

**架构术语更新：**

- `monorepo architecture` → `multi-repo workspace`
- "All services live under a single repository" → "Each module is an independent repository; all repositories coexist in a workspace directory for local development"
- Repository Structure 树的根目录标注从 `Monorepo/` 改为 `workspace/`
- Module Isolation 中的 `deluxe-spec-center` 引用同步替换为 `{{PROJECT}}-spec-center`
- AGENTS.md Hierarchy 中的 `deluxe-spec-center/AGENTS.md (this file)` → `{{PROJECT}}-spec-center/AGENTS.md (this file)`

**AGENTS.md 引用更新（Mandatory Maintenance）：**

新增 `conventions/go-project.md` 后，模板 AGENTS.md 的 "Spec Center as SSOT" bullet list 必须增加条目：

```
- Go Project Structure — Go 服务项目结构约定（[conventions/go-project.md](conventions/go-project.md)）
```

### 2.2 http-constitution.md 时间规范

从 Asia/Kuala_Lumpur (+08:00) 改为 UTC (Z)：

| 原文 | 替换为 |
|------|--------|
| `Asia/Kuala_Lumpur (UTC+8)` | `UTC` |
| `+08:00` 结尾 | `Z` 结尾 |
| `YYYY-MM-DDTHH:mm:ss[.SSS]+08:00` | `YYYY-MM-DDTHH:mm:ss[.SSS]Z` |
| `"2026-03-30T20:00:00.123+08:00"` | `"2026-03-30T20:00:00.123Z"` |
| `pkg/timeutil.Now()`（UTC+8） | `time.Now().UTC()` |
| `SET TIMEZONE 'Asia/Kuala_Lumpur'` | `SET TIMEZONE 'UTC'` |
| 时间流转链路中的 UTC+8 | 全部改为 UTC |

**核心原则更新为：**

> 统一使用 UTC | API 使用 ISO 8601 以 `Z` 结尾，推荐含毫秒 | 数据库存 TIMESTAMPTZ

**同步修改 http-constitution.md §十五 禁止清单：**

原文 `❌ API 返回不含时区偏移的时间（如裸 Z 或无偏移）` 需改为：

```
❌ API 返回不含时区偏移的时间（如无偏移的 `2026-03-30T12:00:00`）
```

因为 UTC 的 `Z` 本身是合法的 ISO 8601 时区偏移标识（等价于 `+00:00`），不应再被禁止。

**同步修改 http-constitution.md §十五 时间流转链路：**

```
数据库(UTC session) → 后端(time.Now().UTC()) → API(ISO 8601 Z) → 前端(直接使用)
```

**同步修改 http-constitution.md §十五 一句话规范：**

```
**API：ISO 8601 Z（UTC）** | **PostgreSQL：timestamptz + SET TIMEZONE 'UTC'** | **MySQL：DATETIME(3) + 应用保证 UTC**
```

### 2.3 error-codes.md

当前内容包含业务特定的错误码（认证、admin 角色管理等），需要通用化：

**保留：**
- Code Ranges 定义（1000-1999 / 2000-2999 / ...）
- 成功码 `code: 0`
- 通用参数错误 `1001`
- 通用系统错误 `5001`
- 幂等性错误码 `4090` / `4091`

**移除或改为示例：**
- Auth Errors 2002-2011（特定认证业务逻辑） → 保留 `2001 Not authenticated` 作为示例，其余移除
- Permission Errors 3002-3003（特定 admin 角色约束） → 保留 `3001 Forbidden` 作为示例，其余移除
- Business Errors 4001（通用，保留）

**最终模板仅包含：** Range 定义 + code 0/1001/2001/3001/4001/4090/4091/5001，其余由项目按 Range 自行扩展。各示例条目加注释标记：

```markdown
<!-- Example entry — remove or replace with project-specific codes -->
```

### 2.4 validation.md

当前内容已通用，保留不变。

## 3. Go 项目结构规范（新增 go-project.md）

### 目录结构

```
{{PROJECT}}-server/
├── cmd/
│   └── server/
│       └── main.go
├── internal/
│   ├── config/
│   │   └── config.go
│   ├── server/
│   │   ├── server.go
│   │   └── routes.go
│   ├── handler/
│   │   └── *.go
│   ├── middleware/
│   │   ├── auth.go
│   │   ├── logger.go
│   │   └── recovery.go
│   ├── repository/
│   │   └── *.go
│   ├── service/
│   │   └── *.go
│   └── model/
│       └── *.go
├── pkg/
│   ├── apperror/
│   │   └── error.go
│   ├── response/
│   │   └── response.go
│   ├── database/
│   │   └── postgres.go
│   └── validator/
│       └── validator.go
├── migrations/
├── docs/
│   ├── specs/
│   └── plans/
├── Makefile
├── .env.example
├── .gitignore
├── AGENTS.md
└── CLAUDE.md
```

### internal/ vs pkg/ 区分原则

| 位置 | 规则 | 示例 |
|------|------|------|
| `pkg/` | 可被其他 Go 项目引用，API 必须稳定 | apperror、response、database、validator |
| `internal/` | 当前项目专属，不可外部引用 | config、server、handler、middleware、repository、service、model |

判断标准：如果这个包在另一个 Go 服务中可以直接 `import` 使用，放 `pkg/`；如果包含项目特定类型或常量，放 `internal/`。

### Server 生命周期

`internal/server/server.go` 定义 Server 结构体：

- `New(cfg, db)` — 构造函数，接收依赖，内部调用 `registerRoutes()`
- `Start(addr)` — 启动 HTTP 服务，支持 graceful shutdown
- `Shutdown(ctx)` — 信号中断时优雅关闭连接

`cmd/server/main.go` 职责：加载配置 → 初始化数据库 → 构建 Server → 监听信号 → Start。

### Router 注册

`internal/server/routes.go` 集中管理所有路由：

- 按领域分组，带注释
- Middleware 按层级应用：全局 > 路由组 > 单路由
- API 版本前缀 `/v1`
- Health check 路由在版本前缀外

### 分层架构

| 层 | 职责 | 可调用 |
|---|---|---|
| Handler | HTTP 请求解析、参数校验、响应序列化 | Service |
| Service | 业务逻辑编排、事务管理 | Repository |
| Repository | SQL 查询、数据映射 | Database |

禁止跨层调用：Handler 不直接访问 Repository。

## 4. 初始化脚本（init.sh）

### 接口

```bash
./init.sh [OPTIONS]

Options:
  -n, --name      Project name (skip interactive prompt)
  -d, --dir       Target directory (default: ./{name}-workspace)
  -m, --modules   Comma-separated modules (skip interactive selection)
  --dry-run       Show what would be created without writing anything
  -h, --help      Show help
```

### 项目名称校验

项目名称是所有仓库名的前缀，必须满足：

```
^[a-z][a-z0-9]*(-[a-z0-9]+)*$
```

- 小写字母开头
- 只含小写字母、数字、连字符
- 不以连字符结尾
- 长度 2-50

不合法时立即报错退出，不进入交互流程。

### 交互流程

1. 项目名称（必填，用作前缀）
2. 目标目录（默认 `./{name}-workspace`）
3. 模块选择：spec-center + server 默认必选，web / mobile / admin 可选

### 执行步骤

1. 收集输入（交互式或参数）
2. 校验项目名称格式
3. 如 `--dry-run`：打印将要创建的目录结构和文件列表，然后退出
4. 创建目标目录 `mkdir -p {dir}`（workspace 根，**不** `git init`）
5. 复制 `templates/root/` 内容到 workspace 根目录，替换 `{{PROJECT}}`
6. 对每个选中模块：
   - 创建模块目录 `{dir}/{name}-{module}/`
   - 复制 `templates/{module}/` 内容
   - 替换占位符（跨平台兼容写法）：
     ```bash
     find . -type f -exec sed -i.bak 's/{{PROJECT}}/{name}/g' {} +
     find . -name '*.bak' -delete
     ```
   - 在模块目录内：
     ```bash
     git init
     git branch -M main
     git add .
     git commit -m "chore: initialize {module} from scaffold"
     ```
7. 输出结果摘要（创建的目录列表、模块列表）

### 约束

- 纯 bash，无外部依赖
- `sed -i.bak ... && delete .bak` 保证 macOS / Linux 兼容
- 幂等性：目标目录已存在时提示确认覆盖/跳过
- 模板与脚本分离：`templates/` 目录维护模板内容，`init.sh` 只做复制+替换
- workspace 根目录**不**是 Git 仓库，仅作为多个仓库的容器目录

## 5. 各模块 .gitignore

所有模块统一使用同一份通用 `.gitignore`，不按技术栈拆分：

```gitignore
# IDE
.idea/
.vscode/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Project
/tmp/
.worktrees/
.superpowers/

# Environment
.env
.env.local
.env.*.local

# Build output
/dist/
/build/
/output/
/bin/

# Dependencies (add framework-specific entries as needed)
# /node_modules/
# /vendor/

# Coverage
/coverage/

# Logs
*.log
```

**设计意图**：脚手架不预设技术栈，因此 .gitignore 只包含 IDE/OS/环境/构建的通用条目。框架特定的条目（如 `node_modules/`、`vendor/`、`.expo/`）以注释形式保留，项目按需取消注释。

### spec-center

同上，使用相同的通用 .gitignore。

## 6. 各模块 Makefile

每个含 Makefile 的模块提供统一骨架，不预设具体构建命令：

```makefile
ifneq (,$(wildcard .env))
    include .env
    export
endif

.PHONY: help install dev build test lint clean

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

install: ## Install dependencies
	@echo "TODO: define install command"

dev: ## Start dev server
	@echo "TODO: define dev command"

build: ## Build for production
	@echo "TODO: define build command"

test: ## Run tests
	@echo "TODO: define test command"

lint: ## Run linter
	@echo "TODO: define lint command"

clean: ## Clean build artifacts
	@echo "TODO: define clean command"
```

**设计意图**：所有模块（server / web / mobile / admin）共享同一个 Makefile 骨架。具体命令由项目根据技术栈自行填充。使用 `help` 目标 + `## ` 注释实现自文档化。

## 7. 各模块 .env.example

所有模块统一使用相同的 `.env.example` 骨架：

```
# Application
APP_ENV=development
PORT=8080

# Add module-specific environment variables below
# DATABASE_URL=
# API_BASE_URL=
# REDIS_URL=
```

**设计意图**：不预设数据库、API 地址等。通用字段只有 `APP_ENV` 和 `PORT`，其余以注释示例形式提供。

### spec-center

无 `.env.example`。
