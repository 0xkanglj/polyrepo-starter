# HTTP Constitution v1.0

> 适用：所有 HTTP 服务 / 微服务 / 对外 API | 目标：统一接口设计，提高一致性、可维护性、性能与可观测性

## 一、设计原则

- **一致性**：遵循统一结构与命名
- **语义清晰**：正确使用 HTTP 方法与状态码
- **可观测**：每个请求可追踪（traceId）
- **安全**：不暴露内部实现
- **向后兼容**：不允许破坏性变更

## 二、HTTP 基础规范

**方法语义（强制）：**

| 方法 | 语义 | 幂等 |
|------|------|------|
| GET | 查询 | ✅ |
| POST | 创建/动作 | ❌ |
| PUT | 全量更新 | ✅ |
| PATCH | 部分更新 | ⚠️ |
| DELETE | 删除 | ✅ |

**禁止：** `POST /getUser`、`POST /updateUser`、`POST /deleteUser`

**状态码：** 成功 200/201/204；客户端错误 400/401/403/404/409；服务端错误 500/503

**Content-Type：** `application/json; charset=utf-8`

## 三、统一响应结构

**成功：**

```json
{ "code": 0, "message": "ok", "data": {} }
```

**错误：**

```json
{ "code": 1001, "message": "参数错误", "details": "email invalid" }
```

**字段：** code(业务码)、message(描述)、data(数据)

**错误码范围：** 参数错误 1000-1999 | 认证错误 2000-2999 | 权限错误 3000-3999 | 业务错误 4000-4999 | 系统错误 5000+

## 四、请求体规范

- 请求体只含业务数据，不允许额外包装（如 `{"data": {}}`）
- PUT = 全量覆盖，PATCH = 局部更新
- 不传 = 不修改，null = 清空

## 五、字段命名

- API 层强制 camelCase（`userName` ✅ `user_name` ❌）
- 禁止混用命名风格

## 六、分页规范

**Offset（默认）：** `GET /resources?page=1&pageSize=20`

```json
{ "code": 0, "data": { "list": [], "pagination": { "page": 1, "pageSize": 20, "total": 100, "hasMore": true } } }
```

规则：page 从 1 开始、pageSize ≤ 100、必须返回 hasMore、必须支持排序

**排序：** `GET /resources?sortBy=createdAt&order=desc`

**Cursor（高性能）：** `GET /resources?cursor=xxx&limit=20`

```json
{ "code": 0, "data": { "list": [], "nextCursor": "xxx", "hasMore": true } }
```

**必须稳定排序：** `ORDER BY created_at DESC, id DESC`

**禁止：** 无分页结构、无排序分页、无限 pageSize

## 七、数据库规范

- 命名：snake_case（如 `users`、`created_at`、`order_items`）
- 主键：`id`（自增或雪花ID）；时间字段：`created_at`、`updated_at`
- 分页实现 Offset：`LIMIT :pageSize OFFSET (:page-1)*:pageSize`；Cursor（推荐）：`WHERE id < :last_id ORDER BY id DESC LIMIT :limit`
- 分页字段、排序字段必须有索引
- 禁止：深分页（大 offset）、无索引排序

## 八、Header 规范

```text
Authorization: Bearer <token>
X-Trace-Id: xxx
X-Request-Id: xxx
```

### 客户端请求头（所有 /v1/ 接口必须携带）

| Header | 必填 | 说明 | 合法值 | 示例 |
|--------|------|------|--------|------|
| X-Client-Platform | 是 | 客户端平台 | ios, android, web | ios |
| X-Client-Version | 是 | 应用版本号,语义化版本 X.Y.Z | `^\d+\.\d+\.\d+$` | 1.2.0 |
| X-Client-Language | 是 | 客户端语言,BCP 47 标签 | `^[a-z]{2}(-[a-z]{2})?$` | zh-cn |

缺失或非法时返回 HTTP 400,错误码 1001。非 /v1/ 路径(如 /health、/webhooks)不做校验。

## 九、安全规范

强制 HTTPS | 输入校验 | 不返回敏感信息 | 防 SQL 注入/XSS

## 十、可观测性

日志（结构化）| 指标（QPS/RT）| Trace（traceId）

## 十一、API 版本控制

`/v1/users`

## 十二、幂等性

> 防止网络重试导致的重复写操作（重复下单、重复创建客户等）。

### Header

```
Idempotency-Key: <uuid>
```

- Opt-in：仅在客户端发送 `Idempotency-Key` header 时激活，不发送则走正常流程。
- Key 格式：**任意合法 UUID**（推荐 v7，小写，带连字符）。格式无效返回 `400` + code `4091`。

### 行为

| 场景 | 行为 |
|------|------|
| 首次请求（key 不存在） | 执行 handler，成功（2xx）存储响应，失败删除 key |
| 重复请求（key 已完成） | 返回存储的原始响应（status + headers + body），附加 `X-Idempotent-Replayed: true` |
| 并发请求（key pending） | 返回 `409 Conflict` + code `4090` |
| 相同 key + 不同 request body | 返回 `409 Conflict` + code `4090`（防误用） |
| 请求失败后重试 | 原 key 已删除，可用相同 key 重新发起 |

### 适用范围

- 中间件挂在 `/v1` 路由组，对所有写端点生效。
- 仅对携带 `Idempotency-Key` header 的请求生效，对 GET/HEAD 请求无意义但仍不阻止。

## 十三、兼容性原则

新增字段 ✅ | 删除字段 ❌ | 修改类型 ❌

## 十四、禁止清单

混用命名风格 | 滥用 POST | 返回非标准结构 | 无 traceId | 不分页的大列表接口

## 十五、时间规范

> 目标：统一时间表达、存储与传输，避免跨时区与序列化问题

**核心原则（强制）：** 统一使用 Asia/Kuala_Lumpur (UTC+8) | API 使用 ISO 8601 | 数据库存 TIMESTAMPTZ | 严禁时区歧义

### API 时间格式（强制）

格式：`YYYY-MM-DDTHH:mm:ss[.SSS]+08:00`，统一 UTC+8（`+08:00` 结尾），推荐含毫秒

✅ `"createdAt": "2026-03-30T20:00:00.123+08:00"`
❌ `"2026-03-30 12:00:00"` | `"03/30/2026"` | `1711800000`（默认禁止时间戳）

**字段命名：** createdAt(创建) | updatedAt(更新) | deletedAt(删除)

### 数据库存储

统一原则：数据库存储必须表示 UTC 时间点

**PostgreSQL（强制）：**

```sql
created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
```

禁止 `TIMESTAMP WITHOUT TIME ZONE`

**MySQL（强制）：**

```sql
created_at DATETIME(3) NOT NULL
updated_at DATETIME(3) NOT NULL
```

- 应用层使用 `pkg/timeutil.Now()`（UTC+8）、数据库连接 `SET TIMEZONE 'Asia/Kuala_Lumpur'`
- 不推荐 `TIMESTAMP`（自动时区转换行为不一致、范围限制 1970~2038、隐式行为多）

**对比：**

| 特性 | PostgreSQL | MySQL |
|------|-----------|-------|
| 推荐类型 | timestamptz | DATETIME(3) |
| 存 UTC | ✅ | ✅（靠应用） |
| 自动时区转换 | ✅ | ⚠️（仅 TIMESTAMP） |

### 时间流转（端到端）

数据库(UTC+8 session) → 后端(UTC+8 via timeutil) → API(ISO 8601 +08:00) → 前端(直接使用)

### 请求体时间

必须：`"startAt": "2026-03-30T20:00:00+08:00"` ❌ `"2026-03-30 12:00:00"`

### 排序与分页

所有分页必须：`ORDER BY created_at DESC, id DESC`

### 特殊场景（允许例外）

- 纯本地时间业务（营业时间/日历）：可用 `TIME` 类型
- 高性能内部接口：可用毫秒时间戳 `1711800000000`，须文档说明

### 禁止

- ❌ 存储本地时间（如 `2026-03-30 12:00:00`）
- ❌ API 返回不含时区偏移的时间（如裸 `Z` 或无偏移）
- ❌ 混用时间格式

### 一句话规范

**API：ISO 8601 +08:00（Asia/Kuala_Lumpur）** | **PostgreSQL：timestamptz + SET TIMEZONE 'Asia/Kuala_Lumpur'** | **MySQL：DATETIME(3) + 应用保证 UTC**

> 所有时间字段统一使用 Asia/Kuala_Lumpur (UTC+8) 时区。PostgreSQL 使用 `TIMESTAMP WITH TIME ZONE` 并设置会话时区；API 层统一使用 ISO 8601 `+08:00` 格式。后端通过 `pkg/timeutil` 包统一管理时区。

## 十六、上线 Checklist

- [ ] 标准HTTP方法
- [ ] 响应结构统一
- [ ] 字段 camelCase
- [ ] 分页规范
- [ ] 数据库 snake_case
- [ ] 时间格式符合规范（ISO 8601 + UTC）
- [ ] traceId
- [ ] 日志与监控
- [ ] 参数校验完整

## 十七、总结

**统一结构 + 正确语义 + 稳定分页 + 可观测性 = 生产级 API**
本规范为组织级强制标准。所有新服务必须遵循，存量系统逐步迁移。
