[Account Management](/docs/account)

# Markup Statistics

GET Auth required

Retrieve aggregated markup and trading statistics for your registered applications over a date range.

## Endpoint

GET `/applications/v1/markup-statistics`

Base URL: `https://api.derivws.com`

##### Authentication Required

This endpoint requires an OAuth2 Bearer token with the `application_read` scope and a `Deriv-App-ID` header.

## Query Parameters

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `date_from` | string (date) | Yes | Interval start date (YYYY-MM-DD), inclusive, UTC. Example: `2026-05-01` |
| `date_to` | string (date) | Yes | Interval end date (YYYY-MM-DD), inclusive, UTC. Example: `2026-05-06` |

## Request Schema

#### `Deriv-App-ID` — Required `string`

Application identifier used for Personal Access Token (PAT) authentication. Passed as a request header.


#### `date_from` — Required `string`

Interval start date (YYYY-MM-DD), inclusive, UTC.

Pattern: `^\d{4}-\d{2}-\d{2}$`

#### `date_to` — Required `string`

Interval end date (YYYY-MM-DD), inclusive, UTC.

Pattern: `^\d{4}-\d{2}-\d{2}$`
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Markup Statistics (request)",
  "description": "Query parameters for the GET /applications/v1/markup-statistics endpoint.",
  "type": "object",
  "required": [
    "Deriv-App-ID",
    "date_from",
    "date_to"
  ],
  "properties": {
    "Deriv-App-ID": {
      "type": "string",
      "description": "Application identifier used for Personal Access Token (PAT) authentication. Passed as a request header.",
      "example": "YOUR_APP_ID"
    },
    "date_from": {
      "type": "string",
      "format": "date",
      "pattern": "^\\d{4}-\\d{2}-\\d{2}$",
      "description": "Interval start date (YYYY-MM-DD), inclusive, UTC.",
      "example": "2026-05-01"
    },
    "date_to": {
      "type": "string",
      "format": "date",
      "pattern": "^\\d{4}-\\d{2}-\\d{2}$",
      "description": "Interval end date (YYYY-MM-DD), inclusive, UTC.",
      "example": "2026-05-06"
    }
  },
  "additionalProperties": false
}
```

## Response Schema

#### `data` — Required `object`

Markup and trading aggregates for the caller's applications over the requested date range. Root fields sum across all included apps; `breakdown` lists the same metrics per application.

**Object Properties:**

  ##### `total_app_markup_usd` — Required `number`

  Sum of application markup attributed to all included apps in the interval.

  ##### `total_volume_usd` — Required `number`

  Sum of contract volume (buy price in USD terms) across all included apps in the interval.

  ##### `total_payout_usd` — Required `number`

  Sum of all potential payouts (in USD terms) across all included apps in the interval.

  ##### `total_contract_count` — Required `integer`

  Total number of contracts counted toward the aggregates across all included apps.

  ##### `total_client_count` — Required `integer`

  Number of distinct client accounts that traded under any included app in the interval.

  ##### `breakdown` — Required `array`

  Per-application rows; each entry corresponds to one app_id with metrics for that app only.

  **Array Items:**

    ###### `app_id` — Required `string`

    Third-party application identifier.

    ###### `app_markup_usd` — Required `number`

    Sum of application markup attributed to this app in USD over the requested interval.

    ###### `volume_usd` — Required `number`

    Sum of contract volume (buy price in USD terms) for this app over the requested interval.

    ###### `payout_usd` — Required `number`

    Sum of all potential payouts in USD terms for this app over the requested interval.

    ###### `contract_count` — Required `integer`

    Number of contracts included in the aggregates for this app.

    ###### `client_count` — Required `integer`

    Number of distinct client accounts that traded under this app in the interval.

#### `meta` — Required `object`

Response metadata.

**Object Properties:**

  ##### `endpoint` — Optional `string`

  The API endpoint path that was called.

  ##### `method` — Optional `string`

  The HTTP method used.

  ##### `timing` — Optional `integer`

  Request processing time in milliseconds.

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Markup Statistics (response)",
  "description": "Response from GET /applications/v1/markup-statistics.",
  "type": "object",
  "required": [
    "data",
    "meta"
  ],
  "properties": {
    "data": {
      "type": "object",
      "description": "Markup and trading aggregates for the caller's applications over the requested date range. Root fields sum across all included apps; `breakdown` lists the same metrics per application.",
      "required": [
        "total_app_markup_usd",
        "total_volume_usd",
        "total_payout_usd",
        "total_contract_count",
        "total_client_count",
        "breakdown"
      ],
      "properties": {
        "total_app_markup_usd": {
          "type": "number",
          "description": "Sum of application markup attributed to all included apps in the interval."
        },
        "total_volume_usd": {
          "type": "number",
          "description": "Sum of contract volume (buy price in USD terms) across all included apps in the interval."
        },
        "total_payout_usd": {
          "type": "number",
          "description": "Sum of all potential payouts (in USD terms) across all included apps in the interval."
        },
        "total_contract_count": {
          "type": "integer",
          "description": "Total number of contracts counted toward the aggregates across all included apps."
        },
        "total_client_count": {
          "type": "integer",
          "description": "Number of distinct client accounts that traded under any included app in the interval."
        },
        "breakdown": {
          "type": "array",
          "description": "Per-application rows; each entry corresponds to one app_id with metrics for that app only.",
          "items": {
            "type": "object",
            "required": [
              "app_id",
              "app_markup_usd",
              "volume_usd",
              "payout_usd",
              "contract_count",
              "client_count"
            ],
            "properties": {
              "app_id": {
                "type": "string",
                "description": "Third-party application identifier."
              },
              "app_markup_usd": {
                "type": "number",
                "description": "Sum of application markup attributed to this app in USD over the requested interval."
              },
              "volume_usd": {
                "type": "number",
                "description": "Sum of contract volume (buy price in USD terms) for this app over the requested interval."
              },
              "payout_usd": {
                "type": "number",
                "description": "Sum of all potential payouts in USD terms for this app over the requested interval."
              },
              "contract_count": {
                "type": "integer",
                "description": "Number of contracts included in the aggregates for this app."
              },
              "client_count": {
                "type": "integer",
                "description": "Number of distinct client accounts that traded under this app in the interval."
              }
            }
          }
        }
      }
    },
    "meta": {
      "type": "object",
      "description": "Response metadata.",
      "properties": {
        "endpoint": {
          "type": "string",
          "description": "The API endpoint path that was called."
        },
        "method": {
          "type": "string",
          "description": "The HTTP method used."
        },
        "timing": {
          "type": "integer",
          "description": "Request processing time in milliseconds."
        }
      }
    }
  }
}
```

## Examples

### Request Example

```json
GET /applications/v1/markup-statistics?date_from=2026-05-01&date_to=2026-05-06
Headers:
  Deriv-App-ID: YOUR_APP_ID
  Authorization: Bearer YOUR_ACCESS_TOKEN
```

### Response Example

```json
{
  "data": {
    "total_app_markup_usd": 123.45,
    "total_volume_usd": 10000.00,
    "total_payout_usd": 9876.55,
    "total_contract_count": 500,
    "total_client_count": 120,
    "breakdown": [
      {
        "app_id": "12345",
        "app_markup_usd": 123.45,
        "volume_usd": 10000.00,
        "payout_usd": 9876.55,
        "contract_count": 500,
        "client_count": 120
      }
    ]
  },
  "meta": {
    "endpoint": "/applications/v1/markup-statistics",
    "method": "GET",
    "timing": 89
  }
}
```

## Status Codes

200 OK - Markup statistics returned successfully

400 Bad request - Invalid or missing query parameters

401 Unauthorized - Invalid or missing authentication

403 Forbidden - Access denied

404 Not found - Resource not found

422 Unprocessable entity - Validation error

504 Gateway timeout - Upstream service timeout

## Error Responses

400 Bad request

```
{
  "errors": [
    {
      "status": 400,
      "code": "ValidationError",
      "message": "date_from is required"
    }
  ],
  "meta": {
    "endpoint": "/applications/v1/markup-statistics",
    "method": "GET",
    "timing": 12
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
    "endpoint": "/applications/v1/markup-statistics",
    "method": "GET",
    "timing": 10
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
    "endpoint": "/applications/v1/markup-statistics",
    "method": "GET",
    "timing": 11
  }
}
```