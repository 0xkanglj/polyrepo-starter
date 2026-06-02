# Input Validation Convention v1.0

> 适用：所有 Go 微服务 | 目标：统一请求参数校验规则、错误格式和实现方式

## 一、校验库

**强制：** 所有 Go 服务使用 `github.com/go-playground/validator/v10`

## 二、使用方式

### 2.1 Request Struct Tag

请求 struct 通过 `validate` tag 声明校验规则：

```go
type loginRequest struct {
    Email    string `json:"email" validate:"required,email"`
    Password string `json:"password" validate:"required,min=8"`
}
```

### 2.2 Handler 调用

JSON 解码后，调用 `ValidateStruct()` 进行校验：

```go
var req loginRequest
if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
    Error(w, errs.ErrValidation.WithMessage("invalid request body"))
    return
}

if err := ValidateStruct(&req); err != nil {
    Error(w, err)
    return
}
```

### 2.3 ValidateStruct 实现

每个服务提供 `ValidateStruct(v any) *AppError` 工具函数，职责：

- 调用 `validator.New(validator.WithRequiredStructEnabled())`
- 注册 JSON tag 名映射（错误信息使用 camelCase 字段名）
- 将 `validator.ValidationErrors` 转换为统一的 `*AppError`
- 单例模式，懒初始化

## 三、标准 Validate Tags

### 3.1 常用 Tags

| Tag | 说明 | 示例 |
|-----|------|------|
| `required` | 必填，零值不通过 | `validate:"required"` |
| `email` | 合法邮箱格式 | `validate:"email"` |
| `url` | 合法 URL | `validate:"url"` |
| `min=N` | 字符串最小长度 / 数字最小值 | `validate:"min=1"` |
| `max=N` | 字符串最大长度 / 数字最大值 | `validate:"max=100"` |
| `len=N` | 精确长度 | `validate:"len=11"` |
| `oneof=A B C` | 枚举值 | `validate:"oneof=ios android web"` |
| `uuid` | UUID 格式 | `validate:"uuid"` |
| `omitempty` | 仅在字段非零值时校验后续规则 | `validate:"omitempty,min=1"` |

> **Note:** Database IDs use BIGSERIAL/BIGINT (int64), not UUID. For ID path parameters, parse with `strconv.ParseInt(..., 10, 64)` and validate as integer. The `uuid` tag is only applicable to non-ID fields that use UUID format (e.g., external identifiers).

### 3.2 组合规则

多个规则用逗号分隔：

```go
Nickname string `validate:"required,min=1,max=100"`
```

`omitempty` 与 `required` 互斥，不可同时使用。可选字段用 `omitempty` 前缀。

## 四、错误响应格式

校验失败统一返回：

- **HTTP Status**: `400 Bad Request`
- **业务码**: `1001`（参数错误，参见 [HTTP Constitution](http-constitution.md) §三 错误码范围）
- **message**: 人类可读的字段级错误描述，多条错误用 `; ` 分隔

**示例：**

```json
{
  "code": 1001,
  "message": "email is required; password must be at least 8 characters"
}
```

**错误信息格式规则：**

| 校验规则 | 错误信息模板 |
|----------|-------------|
| `required` | `{field} is required` |
| `min` | `{field} must be at least {param} characters` |
| `max` | `{field} must be at most {param} characters` |
| `email` | `{field} must be a valid email` |
| `url` | `{field} must be a valid URL` |
| 其他 | `{field} {tag} validation failed` |

其中 `{field}` 使用 JSON tag 名（camelCase），不使用 Go struct 字段名。

## 五、特殊类型处理

### 5.1 Optional / Patch 语义字段

PATCH 请求中"不传 = 不修改，null = 清空"的三态字段（如 `OptionalString`），不适合直接使用 `validate` tag。处理方式：

- `OptionalString` 等自定义类型不加 `validate` tag
- 解析后通过手写逻辑校验内部值（如长度、格式）
- 仍然调用 `ValidateStruct()` 处理 struct 中其他带 tag 的字段

### 5.2 URL Param / Query Param

路径参数和查询参数不在 request body struct 中，校验方式：

- 路径参数：在 handler 中手动解析和校验
- 查询参数：可定义 query struct 并加 `validate` tag，手动 `r.URL.Query().Get()` 后赋值再校验

### 5.3 Header 校验

请求头校验（如 `X-Client-Platform`）在中间件中处理，不使用 `validate` tag。

## 六、禁止清单

- ❌ 在 handler 中手写 `if field == ""` 替代 `validate:"required"` 的场景
- ❌ 使用 Go struct 字段名作为错误信息（应用 JSON tag camelCase 名）
- ❌ 校验错误返回非 1001 业务码
- ❌ 在 `OptionalString` 等自定义类型上直接加 `validate` tag
