# Go Project Structure Convention v1.0

> 适用：所有 Go 后端服务 | 目标：统一项目结构，降低跨项目理解成本

## 目录结构

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
├── db/
|   └── migrations/
├── docs/
│   ├── specs/
│   └── plans/
├── Makefile
├── .env.example
├── .gitignore
├── AGENTS.md
└── CLAUDE.md
```

## `internal/` vs `pkg/` 区分原则

| 位置 | 规则 | 示例 |
|------|------|------|
| `pkg/` | 可被其他 Go 项目引用，API 必须稳定 | apperror、response、database、validator |
| `internal/` | 当前项目专属，不可外部引用 | config、server、handler、middleware、repository、service、model |

判断标准：如果这个包在另一个 Go 服务中可以直接 `import` 使用，放 `pkg/`；如果包含项目特定类型或常量，放 `internal/`。

## Server 生命周期

`internal/server/server.go` 定义 Server 结构体：

- `New(cfg, db)` — 构造函数，接收依赖，内部调用 `registerRoutes()`
- `Start(addr)` — 启动 HTTP 服务，支持 graceful shutdown
- `Shutdown(ctx)` — 信号中断时优雅关闭连接

`cmd/server/main.go` 职责：加载配置 → 初始化数据库 → 构建 Server → 监听信号 → Start。

## Router 注册

`internal/server/routes.go` 集中管理所有路由：

- 按领域分组，带注释
- Middleware 按层级应用：全局 > 路由组 > 单路由
- API 版本前缀 `/v1`
- Health check 路由在版本前缀外

## 分层架构

| 层 | 职责 | 可调用 |
|---|---|---|
| Handler | HTTP 请求解析、参数校验、响应序列化 | Service |
| Service | 业务逻辑编排、事务管理 | Repository |
| Repository | SQL 查询、数据映射 | Database |

禁止跨层调用：Handler 不直接访问 Repository。