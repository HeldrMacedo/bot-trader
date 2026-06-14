[Options Setup](/docs/options)

# Get All Accounts

Get Auth required

Get all Options trading accounts

## Endpoint

Get `/trading/v1/options/accounts`

Base URL: `https://api.derivws.com`

## Request Schema
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Get Accounts Request",
  "description": "Request to get all Options trading accounts",
  "type": "object",
  "properties": {
    "headers": {
      "type": "object",
      "properties": {
        "Deriv-App-ID": {
          "type": "string",
          "description": "Application identifier"
        },
        "Authorization": {
          "type": "string",
          "description": "Bearer token for authentication",
          "example": "Bearer YOUR_AUTH_TOKEN"
        }
      },
      "required": [
        "Deriv-App-ID",
        "Authorization"
      ]
    }
  },
  "required": [
    "headers"
  ]
}

#### `headers` — Required `object`

**Object Properties:**

  ##### `Deriv-App-ID` — Required `string`

  Application identifier

  ##### `Authorization` — Required `string`

  Bearer token for authentication

## Response Schema
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Get Accounts Response",
  "description": "Response containing all Options trading accounts",
  "type": "object",
  "properties": {
    "data": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "account_id": {
            "type": "string",
            "description": "Account ID",
            "example": "DOT90004580"
          },
          "balance": {
            "type": "number",
            "description": "Account balance",
            "example": 10000
          },
          "currency": {
            "type": "string",
            "description": "Account currency",
            "example": "USD"
          },
          "group": {
            "type": "string",
            "description": "Account group",
            "example": "row"
          },
          "status": {
            "type": "string",
            "enum": [
              "active",
              "inactive"
            ],
            "description": "Account status",
            "example": "active"
          },
          "account_type": {
            "type": "string",
            "enum": [
              "demo",
              "real"
            ],
            "description": "Account type",
            "example": "demo"
          },
          "created_at": {
            "type": "string",
            "description": "Creation date"
          },
          "email": {
            "type": "string",
            "description": "User email address"
          },
          "last_access_at": {
            "type": "string",
            "description": "Last access date"
          },
          "name": {
            "type": "string",
            "description": "Client name"
          },
          "server_id": {
            "type": "string",
            "description": "Server ID"
          },
          "rights": {
            "type": "object",
            "properties": {},
            "description": "User's rights"
          }
        },
        "required": [
          "account_id",
          "balance",
          "currency",
          "group",
          "status",
          "account_type"
        ]
      }
    },
    "meta": {
      "type": "object",
      "properties": {
        "endpoint": {
          "type": "string",
          "description": "The current endpoint",
          "example": "/accounts"
        },
        "method": {
          "type": "string",
          "enum": [
            "GET",
            "POST",
            "PUT",
            "DELETE"
          ],
          "description": "The current HTTP request method",
          "example": "GET"
        },
        "timing": {
          "type": "integer",
          "description": "Time for the API to serve the request",
          "example": 222
        }
      },
      "required": [
        "endpoint",
        "method",
        "timing"
      ]
    }
  }
}

#### `data` — Optional `array`

**Array Items:**

  ##### `account_id` — Required `string`

  Account ID

  ##### `balance` — Required `number`

  Account balance

  ##### `currency` — Required `string`

  Account currency

  ##### `group` — Required `string`

  Account group

  ##### `status` — Required `string | enum`

  Account status

  Allowed values: `"active"`, `"inactive"`

  ##### `account_type` — Required `string | enum`

  Account type

  Allowed values: `"demo"`, `"real"`

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
GET /trading/v1/options/accounts
Headers:
  Deriv-App-ID: YOUR_APP_ID
  Authorization: Bearer YOUR_AUTH_TOKEN
```

### Response Example

```json
{
  "data": [
    {
      "account_id": "DOT90004580",
      "balance": 10000,
      "currency": "USD",
      "group": "row",
      "status": "active",
      "account_type": "demo"
    }
  ],
  "meta": {
    "endpoint": "/accounts",
    "method": "GET",
    "timing": 222
  }
}
```

## Status Codes

200 OK - Successfully retrieved all accounts

400 Bad request - Invalid request parameters

401 Unauthorized - Invalid or missing authentication

403 Forbidden - Access denied

404 Not found - Resource not found

504 Gateway timeout - Upstream service timeout

## Error Responses

400 Bad request

```
{
  "errors": [
    {
      "status": 400,
      "code": "ValidationError",
      "message": "Invalid request parameters"
    }
  ],
  "meta": {
    "endpoint": "/accounts",
    "method": "GET",
    "timing": 45
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
    "endpoint": "/accounts",
    "method": "GET",
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
    "endpoint": "/accounts",
    "method": "GET",
    "timing": 15
  }
}
```

404 Not found

```
{
  "errors": [
    {
      "status": 404,
      "code": "AccountNotFound",
      "message": "Resource not found"
    }
  ],
  "meta": {
    "endpoint": "/accounts",
    "method": "GET",
    "timing": 32
  }
}
```

##### Authentication Required

This endpoint requires the `Deriv-App-ID` header to identify your application. OAuth2 Scope: `trade`

## About get_accounts

The `get_accounts` endpoint get all Options trading accounts

### Account Information

This endpoint returns all Options trading accounts associated with your authentication credentials, including both demo and real accounts.