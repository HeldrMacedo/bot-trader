[Options Setup](/docs)

# Options Setup REST

Manage Options trading accounts and establish WebSocket connections for real-time trading.

## Overview

The Options Setup APIs allow you to create and manage Options trading accounts using REST endpoints. These endpoints handle account creation, balance management, and WebSocket authentication setup.

##### REST API

These are standard REST APIs using HTTP methods (GET, POST). All requests require the `Deriv-App-ID: YOUR_APP_ID` header and an `Authorization: Bearer YOUR_OAUTH_TOKEN` token for authenticated endpoints.

##### OpenAPI Specification

View the complete OpenAPI 3.1.0 specification for detailed schema definitions and examples:

[OpenAPI Spec →](/data/production-openapi.json)

## Typical Workflow

1. Create an Options trading account using `POST /trading/v1/options/accounts` .
2. Request a WebSocket URL via `POST /trading/v1/options/accounts/{accountId}/otp` .
3. Connect directly to the WebSocket URL returned.
4. Start trading operations through the WebSocket connection.

## Available Endpoints

[Get All Accounts Get

Get all Options trading accounts `/trading/v1/options/accounts`](/docs/options/get-accounts/)

[Create Account Post

Create a new Options trading account `/trading/v1/options/accounts`](/docs/options/create-account/)

[Reset Demo Account Balance Post

Reset balance for Options trading demo account `/trading/v1/options/accounts/{account_id}/reset-demo-balance`](/docs/options/reset-demo-balance/)

[WebSockets Post

Get a WebSocket URL via OTP and connect for real-time Options trading `/trading/v1/options/accounts/{accountId}/otp`](/docs/options/websocket/)

[WebSocket Public Endpoint Get

WebSocket endpoint for Options Trading public data that does not require authentication `/trading/v1/options/ws/public`](/docs/options/ws-public/)

## Authentication

All authenticated endpoints require the `Deriv-App-ID` header and an `Authorization: Bearer YOUR_AUTH_TOKEN` header.

### OAuth2 Scopes

| Endpoint | Scope |
| --- | --- |
| `GET /trading/v1/options/accounts` | `trade` |
| `POST /trading/v1/options/accounts` | `account_manage` |
| `POST /.../reset-demo-balance` | `trade` |
| `POST .../{accountId}/otp` | `trade` |

```bash
curl -X POST https://api.derivws.com/trading/v1/options/accounts \
  -H "Deriv-App-ID: YOUR_APP_ID" \
  -H "Authorization: Bearer YOUR_OAUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"currency": "USD", "group": "row", "account_type": "demo"}'
```

## Response Status Codes

The API uses standard HTTP status codes to indicate success or failure:

2xx Success

**200 OK** — Request successful (existing account or OTP generated)

**201 Created** — New resource created successfully

4xx/5xx Errors

**400 Bad Request** — Invalid parameters or request body

**401 Unauthorized** — Invalid or missing authentication

**403 Forbidden** — Access denied

**404 Not Found** — Resource not found

**500 Internal Server Error** — Server-side error

**504 Gateway Timeout** — Upstream service timeout

## Error Response Format

All error responses follow a consistent structure with an errors array and metadata:

```json
{
  "errors": [
    {
      "status": 400,
      "code": "ValidationError",
      "message": "currency field is required"
    }
  ],
  "meta": {
    "endpoint": "/accounts",
    "method": "POST",
    "timing": 23
  }
}
```

Error codes include: `ValidationError` , `FieldIsRequired` , `Unauthorized` , `UnauthorizedAccess` , `AccessDenied` , `AccountNotFound` , `BadInputRequest` , `RateLimit` , `InternalServerError`