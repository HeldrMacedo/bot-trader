[Options Trading (Legacy)](/docs/options-legacy)

# Legacy Accounts

Get Auth required Legacy

List the authenticated user's legacy accounts, grouped by loginid.

##### Temporary endpoint

This endpoint exposes data sourced from the legacy options platform.

## Endpoint

Get `/trading/v1/options/legacy/accounts`

Base URL: `https://api.derivws.com`

## Request Schema

#### `Deriv-App-ID` — Required `string`

Application identifier. Passed as a request header.
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Legacy Accounts (request)",
  "description": "Request headers for GET /trading/v1/options/legacy/accounts. Returns the authenticated user's legacy accounts grouped by loginid.",
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

#### `loginids` — Required `object`

Map of loginid (e.g. `CR0001`) to its legacy accounts.
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Legacy Accounts (response)",
  "description": "Legacy accounts grouped by loginid. Loginids with no resolvable accounts are omitted.",
  "type": "object",
  "required": [
    "loginids"
  ],
  "properties": {
    "loginids": {
      "type": "object",
      "description": "Map of loginid (e.g. `CR0001`) to its legacy accounts.",
      "additionalProperties": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "account_id": {
              "type": "integer",
              "description": "Legacy account identifier."
            },
            "currency": {
              "type": "string",
              "description": "ISO currency code of the account."
            }
          }
        }
      }
    }
  }
}
```
## Examples

### Request Example

```json
GET /trading/v1/options/legacy/accounts
Headers:
  Deriv-App-ID: YOUR_APP_ID
  Authorization: Bearer YOUR_AUTH_TOKEN
```

### Response Example

```json
{
  "loginids": {
    "CR90000123": [
      {
        "account_id": 123,
        "currency": "USD"
      }
    ]
  }
}
```

## Status Codes

200 OK - Accounts grouped by loginid

401 Unauthorized - Invalid or missing authentication

404 Not found - User has no legacy account mapping

409 Conflict - User migration is pending or has failed

500 Internal server error

503 Service temporarily unavailable

## Error Responses

404 No legacy mapping

```
{
  "errors": [
    {
      "status": 404,
      "code": "NotFound",
      "message": "User has no legacy account mapping"
    }
  ],
  "meta": {
    "endpoint": "/trading/v1/options/legacy/accounts",
    "method": "GET",
    "timing": 16
  }
}
```

409 Migration pending or failed

```
{
  "errors": [
    {
      "status": 409,
      "code": "MigrationPending",
      "message": "User migration is pending or has failed"
    }
  ],
  "meta": {
    "endpoint": "/trading/v1/options/legacy/accounts",
    "method": "GET",
    "timing": 19
  }
}
```

##### Authentication Required

This endpoint requires the `Deriv-App-ID` header to identify your application. OAuth2 Scope: `trade`

## About legacy_accounts

The `legacy_accounts` endpoint list the authenticated user's legacy accounts, grouped by loginid.

### Response Shape

The response is a single `loginids` object keyed by the user's legacy loginids. Each value is an array of accounts owned by that loginid, each with an `account_id` and `currency` . Loginids with no resolvable accounts are omitted from the response entirely.

### When to Call

Use this endpoint to discover the legacy loginids you can pass to `GET /trading/v1/options/legacy/statement` . If the user's migration is pending or has failed, the request returns **HTTP 409** ; if the user has no legacy mapping at all, it returns **HTTP 404** .