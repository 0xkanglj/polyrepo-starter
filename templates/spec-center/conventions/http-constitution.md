# HTTP Constitution v1.0

> Applies to: All HTTP services / microservices / external APIs | Goal: Standardize API design for consistency, maintainability, performance, and observability

## 1. Design Principles

- **Consistency**: Follow unified structure and naming conventions
- **Semantic clarity**: Use HTTP methods and status codes correctly
- **Observability**: Every request must be traceable (traceId)
- **Security**: Never expose internal implementation details
- **Backward compatibility**: Breaking changes are not allowed

## 2. HTTP Fundamentals

**Method Semantics (mandatory):**

| Method | Semantics | Idempotent |
|--------|-----------|------------|
| GET | Retrieve | ✅ |
| POST | Create / Action | ❌ |
| PUT | Full / Partial update | ⚠️ |
| DELETE | Delete | ✅ |

**Prohibited:** `POST /getUser`, `POST /updateUser`, `POST /deleteUser`

**Status Codes:** Success 200/201/204; Client errors 400/401/403/404/409; Server errors 500/503

**Content-Type:** `application/json; charset=utf-8`

## 3. Unified Response Structure

**Success:**

```json
{ "code": 0, "message": "ok", "data": {} }
```

**Error:**

```json
{ "code": 1001, "message": "parameter error", "details": "email invalid" }
```

**Fields:** code (business code), message (description), data (payload)

**Error Code Ranges:** Parameter errors 1000–1999 | Authentication errors 2000–2999 | Authorization errors 3000–3999 | Business errors 4000–4999 | System errors 5000+

## 4. Request Body Convention

- Request bodies must contain only business data — no extra wrappers (e.g., `{"data": {}}`)
- PUT = full replacement / partial update
- Omitting a field = no change; `null` = clear the value

## 5. Field Naming

- camelCase is mandatory at the API layer (`userName` ✅ `user_name` ❌)
- Mixed naming styles are prohibited

## 6. Pagination

**Offset (default):** `GET /resources?page=1&pageSize=20`

```json
{ "code": 0, "data": { "list": [], "pagination": { "page": 1, "pageSize": 20, "total": 100, "hasMore": true } } }
```

Rules: `page` starts at 1, `pageSize` ≤ 100, `hasMore` is required, sorting must be supported

**Sorting:** `GET /resources?sortBy=createdAt&order=desc`

**Cursor (high-performance):** `GET /resources?cursor=xxx&limit=20`

```json
{ "code": 0, "data": { "list": [], "nextCursor": "xxx", "hasMore": true } }
```

**Stable sort required:** `ORDER BY created_at DESC, id DESC`

**Prohibited:** No pagination structure, paginated results without sorting, unbounded pageSize

## 7. Database Convention

- Naming: snake_case (e.g., `users`, `created_at`, `order_items`)
- Primary key: `id` (auto-increment or snowflake ID); Timestamps: `created_at`, `updated_at`
- Offset pagination: `LIMIT :pageSize OFFSET (:page-1)*:pageSize`; Cursor (recommended): `WHERE id < :last_id ORDER BY id DESC LIMIT :limit`
- Pagination and sort columns must be indexed
- Prohibited: Deep pagination (large offset), sorting without indexes

## 8. Headers

```text
Authorization: Bearer <token>
X-Trace-Id: xxx
X-Request-Id: xxx
```

### Client Request Headers (required for all /v1/ endpoints)

| Header | Required | Description | Valid Values | Example |
|--------|----------|-------------|--------------|---------|
| X-Client-Platform | Yes | Client platform | ios, android, web | ios |
| X-Client-Version | Yes | App version, semantic versioning X.Y.Z | `^\d+\.\d+\.\d+$` | 1.2.0 |
| X-Client-Language | Yes | Client language, BCP 47 tag | `^[a-z]{2}(-[a-z]{2})?$` | zh-cn |

Missing or invalid headers return HTTP 400 with error code 1001. Non-`/v1/` paths (e.g., `/health`, `/metrics`, `/webhooks`) are exempt from validation.

## 9. Security

Enforce HTTPS | Input validation | Never return sensitive data | Prevent SQL injection / XSS

## 10. Observability

Structured logging | Metrics (QPS / latency) | Distributed tracing (traceId)

**Metrics endpoint (`GET /metrics`):** Controlled by `METRICS_PORT`. When `0`, register `/metrics` on the main HTTP server (`PORT`). When non-zero (e.g. `9090`), serve `/metrics` on a dedicated listener at that port. In both modes, `/metrics` is outside the `/v1` prefix and exempt from client header validation.

## 11. API Versioning

`/v1/users`

## 12. Idempotency

> Prevent duplicate write operations caused by network retries (duplicate orders, duplicate customer creation, etc.).

### Header

```
Idempotency-Key: <uuid>
```

- Opt-in: Activated only when the client sends an `Idempotency-Key` header. Requests without it follow the normal flow.
- Key format: **Any valid UUID** (v7 recommended, lowercase, with hyphens). Invalid format returns `400` + code `4091`.

### Behavior

| Scenario | Behavior |
|----------|----------|
| First request (key not found) | Execute handler; on success (2xx) store the response; on failure delete the key |
| Duplicate request (key already completed) | Return the stored original response (status + headers + body) with an additional `X-Idempotent-Replayed: true` header |
| Concurrent request (key pending) | Return `409 Conflict` + code `4090` |
| Same key + different request body | Return `409 Conflict` + code `4090` (prevents key misuse) |
| Retry after a failed request | Original key has been deleted; the same key can be reused for a new attempt |

### Scope

- The middleware is mounted on the `/v1` route group and applies to all write endpoints.
- It only activates for requests carrying the `Idempotency-Key` header. GET/HEAD requests are unaffected but not blocked.

## 13. Compatibility Principles

Add fields ✅ | Remove fields ❌ | Change types ❌

## 14. Prohibited Patterns

Mixed naming styles | Misuse of POST | Non-standard response structures | Missing traceId | Unpaginated list endpoints

## 15. Time Convention

> Goal: Standardize time representation, storage, and transmission to avoid timezone and serialization issues

**Core Principles (mandatory):** Always use UTC | API uses ISO 8601 ending with `Z`, milliseconds recommended | Store as TIMESTAMPTZ in the database | No timezone ambiguity

### API Time Format (mandatory)

Format: `YYYY-MM-DDTHH:mm:ss[.SSS]Z`, always UTC (ending with `Z`), milliseconds recommended

✅ `"createdAt": "2026-03-30T20:00:00.123Z"`
❌ `"2026-03-30 12:00:00"` | `"03/30/2026"` | `1711800000` (timestamps prohibited by default)

**Field Naming:** createdAt (creation) | updatedAt (update) | deletedAt (soft delete)

### Database Storage

Core principle: Database storage must always represent a UTC point in time

**PostgreSQL (mandatory):**

```sql
created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
```

`TIMESTAMP WITHOUT TIME ZONE` is prohibited

**MySQL (mandatory):**

```sql
created_at DATETIME(3) NOT NULL
updated_at DATETIME(3) NOT NULL
```

- Application layer uses `time.Now().UTC()`, database connection sets `SET TIMEZONE 'UTC'`
- `TIMESTAMP` type is not recommended (inconsistent automatic timezone conversion, range limited to 1970–2038, many implicit behaviors)

**Comparison:**

| Feature | PostgreSQL | MySQL |
|---------|-----------|-------|
| Recommended type | timestamptz | DATETIME(3) |
| Stores UTC | ✅ | ✅ (application-enforced) |
| Automatic timezone conversion | ✅ | ⚠️ (only for TIMESTAMP) |

### End-to-End Time Flow

Database (UTC session) → Backend (`time.Now().UTC()`) → API (ISO 8601 Z) → Frontend (use as-is)

### Request Body Time

Required: `"startAt": "2026-03-30T20:00:00Z"` ❌ `"2026-03-30 12:00:00"`

### Sorting and Pagination

All paginated queries must use: `ORDER BY created_at DESC, id DESC`

### Special Cases (exceptions allowed)

- Pure local-time business logic (business hours / calendars): `TIME` type is acceptable
- High-performance internal APIs: Millisecond timestamps `1711800000000` are acceptable with documented justification

### Prohibited

- ❌ Storing local time (e.g., `2026-03-30 12:00:00`)
- ❌ Returning times without timezone offset in API responses (e.g., `2026-03-30T12:00:00` without offset)
- ❌ Mixing time formats

### One-Liner

**API: ISO 8601 Z (UTC)** | **PostgreSQL: timestamptz + SET TIMEZONE 'UTC'** | **MySQL: DATETIME(3) + application-enforced UTC**

> Always use UTC. PostgreSQL uses `TIMESTAMP WITH TIME ZONE` with the session timezone set to UTC; the API layer uniformly uses ISO 8601 `Z` format.

## 16. Pre-Launch Checklist

- [ ] Standard HTTP methods
- [ ] Unified response structure
- [ ] camelCase field names
- [ ] Pagination convention
- [ ] snake_case database naming
- [ ] Time format compliance (ISO 8601 + UTC)
- [ ] traceId
- [ ] Logging and monitoring
- [ ] Complete input validation

## 17. Summary

**Unified structure + correct semantics + stable pagination + observability = production-grade API**
This convention is an organization-wide mandatory standard. All new services must comply; existing systems migrate incrementally.
