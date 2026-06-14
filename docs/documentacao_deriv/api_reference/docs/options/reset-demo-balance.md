[Options Setup](/docs/options)

# Reset Demo Account Balance

Post Auth required

Reset balance for Options trading demo account

## Endpoint

Post `/trading/v1/options/accounts/{account_id}/reset-demo-balance`

Base URL: `https://api.derivws.com`

## Request Schema

#### `headers` — Required `object`

**Object Properties:**

  ##### `Deriv-App-ID` — Required `string`

  Application identifier

  ##### `Authorization` — Required `string`

  Bearer token for authentication

#### `path` — Required `object`

**Object Properties:**

  ##### `account_id` — Required `string`

  Options trading account ID

## Response Schema

#### `data` — Optional `object`

**Object Properties:**

  ##### `account_id` — Required `string`

  Account ID

  ##### `balance` — Required `number`

  New account balance (reset to default)

  ##### `currency` — Required `string`

  Account currency

  ##### `status` — Optional `string | enum`

  Account status

  Allowed values: `"active"`, `"inactive"`

  ##### `account_type` — Optional `string | enum`

  Account type (only demo accounts can be reset)

  Allowed values: `"demo"`

  ##### `created_at` — Optional `string`

  Creation date

  ##### `email` — Optional `string`

  User email address

  ##### `last_access_at` — Optional `string`

  Last access date

  ##### `name` — Optional `string`

  Client name

  ##### `server_id` — Optional `string`

  Server ID

  ##### `rights` — Optional `object`

  User's rights

#### `meta` — Optional `object`

**Object Properties:**

  ##### `endpoint` — Required `string`

  The current endpoint

  ##### `method` — Required `string | enum`

  The current HTTP request method

  Allowed values: `"GET"`, `"POST"`, `"PUT"`, `"DELETE"`

  ##### `timing` — Required `integer`

  Time for the API to serve the request

## Examples

### Request Example

```json
POST /trading/v1/options/accounts/DOT90004580/reset-demo-balance
Headers:
  Deriv-App-ID: YOUR_APP_ID
  Authorization: Bearer YOUR_AUTH_TOKEN

Path Parameters:
  - account_id: string (Options trading demo account ID)
```

### Response Example

```json
{
  "data": {
    "account_id": "DOT90004580",
    "balance": 10000,
    "currency": "USD",
    "status": "active",
    "account_type": "demo"
  },
  "meta": {
    "endpoint": "/accounts/DOT90004580/reset-demo-balance",
    "method": "POST",
    "timing": 156
  }
}
```

## Status Codes

200 OK - Demo balance successfully reset to default amount

400 Bad request - Invalid account ID or not a demo account

401 Unauthorized - Invalid or missing authentication

403 Forbidden - Access denied

404 Not found - Account not found

500 Internal server error

504 Gateway timeout - Upstream service timeout

## Error Responses

400 Bad request

```
{
  "errors": [
    {
      "status": 400,
      "code": "ValidationError",
      "message": "Only demo accounts can have their balance reset"
    }
  ],
  "meta": {
    "endpoint": "/accounts/DOT90004580/reset-demo-balance",
    "method": "POST",
    "timing": 34
  }
}
```

401 Unauthorized

```
{
  "errors": [
    {
      "status": 401,
      "code": "Unauthorized",
      "message": "Invalid or missing authentication credentials"
    }
  ],
  "meta": {
    "endpoint": "/accounts/DOT90004580/reset-demo-balance",
    "method": "POST",
    "timing": 12
  }
}
```

403 Forbidden

```
{
  "errors": [
    {
      "status": 403,
      "code": "AccessDenied",
      "message": "You do not have permission to access this resource"
    }
  ],
  "meta": {
    "endpoint": "/accounts/DOT90004580/reset-demo-balance",
    "method": "POST",
    "timing": 15
  }
}
```

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
    "endpoint": "/accounts/DOT90004580/reset-demo-balance",
    "method": "POST",
    "timing": 67
  }
}
```

##### Authentication Required

This endpoint requires the `Deriv-App-ID` header to identify your application. OAuth2 Scope: `trade`

## About reset_demo_balance

The `reset_demo_balance` endpoint reset balance for Options trading demo account

### Demo Accounts Only

This endpoint only works for demo accounts. Real accounts cannot have their balance reset via API.

### Default Balance

The balance is reset to the default amount of $10,000 USD for demo accounts.