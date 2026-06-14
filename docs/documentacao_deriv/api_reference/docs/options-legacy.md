[Options Trading (Legacy)](/docs)

# Options Trading (Legacy) REST

Read-only access to a migrated user's pre-upgrade options trading data — historical statement, legacy accounts, and platform upgrade status.

##### Temporary endpoints

These endpoints expose data sourced from the legacy options platform. Use them to access historical data belonging to accounts that have already been migrated to the new platform.

## Overview

After a user's account has been upgraded from the legacy options platform, these endpoints surface their pre-upgrade transaction statement and account mapping so that the historical record remains available. All three are read-only, require an OAuth2 token with the `trade` scope, and are scoped to the calling user. While a user's migration is still `pending` or has `failed` , the statement and accounts endpoints return HTTP 409.

##### REST API

These are standard REST APIs using HTTP `GET` . All requests require the `Deriv-App-ID: YOUR_APP_ID` header and an `Authorization: Bearer YOUR_OAUTH_TOKEN` token.

##### OpenAPI Specification

View the complete OpenAPI 3.1.0 specification for detailed schema definitions and examples:

[OpenAPI Spec →](/data/production-openapi.json)

## Typical Workflow

1. Call `GET /trading/v1/options/legacy/migration-status` to confirm the user's migration has reached `complete` . While the status is `pending` or `failed` , the other two endpoints return HTTP 409.
2. List the user's pre-upgrade loginids and accounts via `GET /trading/v1/options/legacy/accounts` .
3. Pull the pre-upgrade transaction history per loginid via `GET /trading/v1/options/legacy/statement?loginid=...` , paginating with `limit` and `offset` .
4. For all live trading and account operations, continue to use the standard Options Trading endpoints — these legacy routes serve historical data only.

## Available Endpoints

[Migration Status Get

Get the current state of the authenticated user's platform upgrade. `/trading/v1/options/legacy/migration-status`](/docs/options-legacy/legacy-migration-status/)

[Legacy Accounts Get

List the authenticated user's legacy accounts, grouped by loginid. `/trading/v1/options/legacy/accounts`](/docs/options-legacy/legacy-accounts/)

[Legacy Statement Get

Get the historical transaction statement from the legacy options platform for the default account of the supplied loginid. `/trading/v1/options/legacy/statement`](/docs/options-legacy/legacy-statement/)

## Authentication

All endpoints in this section require the `Deriv-App-ID` header and an `Authorization: Bearer YOUR_AUTH_TOKEN` header with the `trade` OAuth2 scope.

### OAuth2 Scopes

| Endpoint | Scope |
| --- | --- |
| `GET /trading/v1/options/legacy/migration-status` | `trade` |
| `GET /trading/v1/options/legacy/accounts` | `trade` |
| `GET /trading/v1/options/legacy/statement` | `trade` |

```bash
curl -X GET "https://api.derivws.com/trading/v1/options/legacy/migration-status" \
  -H "Deriv-App-ID: YOUR_APP_ID" \
  -H "Authorization: Bearer YOUR_OAUTH_TOKEN"
```

## Response Status Codes

Standard HTTP status codes are returned. A 409 indicates the caller's migration is pending or has failed — this is specific to the legacy endpoints.

2xx Success

**200 OK** — Request successful. For `migration-status` , all known states (including `pending` , `failed` , `not_applicable` ) are returned with 200.

4xx/5xx Errors

**400 Bad Request** — Bad input (e.g. malformed loginid)

**401 Unauthorized** — Invalid or missing authentication

**404 Not Found** — User or default account not found

**409 Conflict** — User migration is pending or has failed

**422 Unprocessable Entity** — Request validation error

**500 Internal Server Error** — Server-side error

**503 Service Unavailable** — Service temporarily unavailable

## Error Response Format

All error responses follow a consistent structure with an errors array and metadata:

```json
{
  "errors": [
    {
      "status": 409,
      "code": "MigrationPending",
      "message": "User migration is pending or has failed"
    }
  ],
  "meta": {
    "endpoint": "/trading/v1/options/legacy/statement",
    "method": "GET",
    "timing": 21
  }
}
```