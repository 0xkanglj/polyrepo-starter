# Error Codes

All API errors use the `{code, message, details}` envelope. The `code` field is a business error code, distinct from the HTTP status code.

## Code Ranges

| Range       | Category    | HTTP Status Range |
| ----------- | ----------- | ----------------- |
| 1000-1999   | Parameter   | 400               |
| 2000-2999   | Auth        | 401, 403, 409, 429|
| 3000-3999   | Permission  | 403               |
| 4000-4999   | Business    | 400, 403, 404, 409|
| 5000+       | System      | 500               |

## Parameter Errors (1000-1999)

| Code | HTTP | Message | Trigger |
| ---- | ---- | ------- | ------- |
| 1001 | 400  | Parameter error | Request body, query params, or path params fail validation. The `details` field contains field-level error info. |

## Auth Errors (2000-2999)

| Code | HTTP | Message | Trigger |
| ---- | ---- | ------- | ------- |
| 2001 | 401 | Not authenticated | Missing or invalid `Authorization` header on a protected route. |
| 2002 | 401 | Account disabled | User account has been deactivated by an admin. |
| 2003 | 401 | Invalid credentials | Username or password is incorrect during login. |
| 2004 | 401 | Token invalid or expired | JWT access token is malformed, expired, or has an invalid signature. |
| 2005 | 401 | Token platform mismatch | The JWT token's platform claim does not match the `X-Client-Platform` header. |
| 2006 | 401 | Refresh token invalid | The refresh token does not exist or has been revoked. |
| 2007 | 409 | Username already exists | Attempting to create a user with a taken username. |
| 2008 | 401 | Refresh token reused | The refresh token was already used. All sessions for this user on that platform are revoked; user must re-login. |
| 2009 | 404 | User not found | The specified user ID does not exist. |
| 2010 | 429 | Account locked | Too many failed login attempts. Account is temporarily locked (15 minutes). |
| 2011 | 429 | Rate limited | Too many requests from the same IP. Applies to login endpoint. |

## Permission Errors (3000-3999)

| Code | HTTP | Message | Trigger |
| ---- | ---- | ------- | ------- |
| 3001 | 403 | Forbidden | User's role does not have access to the requested resource or action. |
| 3002 | 403 | Cannot operate on seed admin | Attempting to change the role, disable, or update the profile of the seed admin account (`username=admin`). Does not apply to password reset. |
| 3003 | 403 | Role change not allowed | Attempting to change the role of a protected account (e.g. sales admin). |

## Business Errors (4000-4999)

### General

| Code | HTTP | Message | Trigger |
| ---- | ---- | ------- | ------- |
| 4001 | 400  | Business error | Generic business logic violation. Context-specific message provided. |

### Idempotency

| Code | HTTP | Message | Trigger |
| ---- | ---- | ------- | ------- |
| 4090 | 409  | Idempotency key conflict — request in progress | A request with the same idempotency key is already being processed, or the key was reused with a different request body. |
| 4091 | 400  | Invalid idempotency key format | The `Idempotency-Key` header value is not a valid UUID. |

## System Errors (5000+)

| Code | HTTP | Message | Trigger |
| ---- | ---- | ------- | ------- |
| 5001 | 500  | System error | Unexpected server error. Check server logs for details. |

## Success Code

Successful responses use `code: 0` with `message: "ok"`.

```json
{
  "code": 0,
  "message": "ok",
  "data": { ... }
}
```
