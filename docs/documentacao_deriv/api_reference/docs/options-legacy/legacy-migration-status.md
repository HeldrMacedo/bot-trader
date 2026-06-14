[Options Trading (Legacy)](/docs/options-legacy)

# Migration Status

Get Auth required Legacy

Get the current state of the authenticated user's platform upgrade.

##### Temporary endpoint

This endpoint exposes data sourced from the legacy options platform.

## Endpoint

Get `/trading/v1/options/legacy/migration-status`

Base URL: `https://api.derivws.com`

## Request Schema

#### `Deriv-App-ID` — Required `string`

Application identifier. Passed as a request header.

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Legacy Migration Status (request)",
  "description": "Request headers for GET /trading/v1/options/legacy/migration-status. Returns the current state of the user's platform upgrade.",
  "type": "object",
  "required": [
    "Deriv-App-ID"
  ],
  "properties": {
    "Deriv-App-ID": {
      "type": "string",
      "description": "Application identifier. Passed as a request header.",
      "example": "YOUR_APP_ID"
    }
  },
  "additionalProperties": false
}
```
## Response Schema

#### `status` — Required `string | enum`

Migration lifecycle state.

Allowed values: `"complete"`, `"pending"`, `"failed"`, `"not_applicable"`
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Legacy Migration Status (response)",
  "description": "Current state of the user's platform upgrade. All known states (including `pending`, `failed`, and `not_applicable`) are returned with HTTP 200.",
  "type": "object",
  "required": [
    "status"
  ],
  "properties": {
    "status": {
      "type": "string",
      "enum": [
        "complete",
        "pending",
        "failed",
        "not_applicable"
      ],
      "description": "Migration lifecycle state."
    }
  }
}
```
## Examples

### Request Example

```json
GET /trading/v1/options/legacy/migration-status
Headers:
  Deriv-App-ID: YOUR_APP_ID
  Authorization: Bearer YOUR_AUTH_TOKEN
```

### Response Example

```json
{
  "status": "complete"
}
```

## Status Codes

200 OK - Current migration status (also returned for `pending`, `failed`, and `not_applicable`)

401 Unauthorized - Invalid or missing authentication

500 Internal server error

503 Service temporarily unavailable

## Error Responses

500 Internal server error

```
{
  "errors": [
    {
      "status": 500,
      "code": "InternalServerError",
      "message": "An internal error occurred"
    }
  ],
  "meta": {
    "endpoint": "/trading/v1/options/legacy/migration-status",
    "method": "GET",
    "timing": 9
  }
}
```

##### Authentication Required

This endpoint requires the `Deriv-App-ID` header to identify your application. OAuth2 Scope: `trade`

## About legacy_migration_status

The `legacy_migration_status` endpoint get the current state of the authenticated user's platform upgrade.

### Status Values

All known states are returned with HTTP 200:

- `complete` — the user has been fully migrated to the new platform. Their pre-upgrade history is available via the other legacy endpoints.
- `pending` — migration is in progress. The statement and accounts endpoints return HTTP 409 while in this state.
- `failed` — migration was attempted but did not complete. The statement and accounts endpoints return HTTP 409 while in this state.
- `not_applicable` — the user has no legacy data to migrate.

### Polling

The response is served with `Cache-Control: no-store` so polling clients always see the current state. Use this endpoint as a gate before calling the other legacy endpoints.