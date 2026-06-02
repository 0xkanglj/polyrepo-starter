# Conventional Commits

> Git 提交信息规范。适用于所有模块。

## 格式

严格遵循 [Conventional Commits](https://www.conventionalcommits.org/)：

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

## 类型（Types）

| Type | 用途 |
|---|---|
| `feat` | 新功能 |
| `fix` | Bug 修复 |
| `docs` | 文档变更 |
| `spec` | 规格说明变更（spec-only changes） |
| `style` | 格式调整（不影响代码逻辑） |
| `refactor` | 重构（既非新功能也非修复） |
| `perf` | 性能优化 |
| `test` | 测试相关 |
| `build` | 构建系统或外部依赖变更 |
| `ci` | CI 配置变更 |
| `chore` | 杂项（不修改 src 或 test） |
| `revert` | 回滚提交 |

## 示例

```
spec(api): add endpoint specification
```

```
feat(server): add user registration endpoint

Implement POST /users with request validation and
error handling per http-constitution spec.
```

```
fix(web): resolve pagination offset calculation

Fixes #123
```
