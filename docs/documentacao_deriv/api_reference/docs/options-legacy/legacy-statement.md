[Options Trading (Legacy)](/docs/options-legacy)

# Legacy Statement

Get Auth required Legacy

Get the historical transaction statement from the legacy options platform for the default account of the supplied loginid.

##### Temporary endpoint

This endpoint exposes data sourced from the legacy options platform.

## Endpoint

Get `/trading/v1/options/legacy/statement`

Base URL: `https://api.derivws.com`


## Request Schema

#### `Deriv-App-ID` — Required `string`

Application identifier. Passed as a request header.

#### `loginid` — Required `string`

Legacy loginid whose default-account statement to return. Must match `^[A-Z]+[0-9]+$`.

Pattern: `^[A-Z]+[0-9]+$`

#### `date_from` — Optional `integer`

Inclusive lower bound as epoch seconds. A row is included iff its true `transaction_time` is `>= date_from`. Defaults to 0 (all history). Values above 2147483647 (the year-2038 epoch limit) are rejected with HTTP 422.

Min: 0 · Max: 2147483647

#### `date_to` — Optional `integer`

Exclusive upper bound as epoch seconds. A row is included iff its true `transaction_time` is `< date_to`. Defaults to current time. Values above 2147483647 (the year-2038 epoch limit) are rejected with HTTP 422.

Min: 0 · Max: 2147483647

#### `action_type` — Optional `string | enum`

Filter by transaction type. Defaults to all types.

Allowed values: `"buy"`, `"sell"`, `"deposit"`, `"withdrawal"`, `"transfer"`, `"hold"`, `"release"`, `"adjustment"`, `"escrow"`

#### `limit` — Optional `integer`

Maximum number of transactions to return. Defaults to 100, maximum 999.

Min: 1 · Max: 999 · Default: `100`

#### `offset` — Optional `integer`

Number of transactions to skip before returning results. Use with `limit` for pagination.

Min: 0 · Default: `0`

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Legacy Statement (request)",
  "description": "Query parameters for GET /trading/v1/options/legacy/statement. Returns the historical transaction statement from the legacy options platform for the default account of the supplied loginid.",
  "type": "object",
  "required": [
    "Deriv-App-ID",
    "loginid"
  ],
  "properties": {
    "Deriv-App-ID": {
      "type": "string",
      "description": "Application identifier. Passed as a request header.",
      "example": "YOUR_APP_ID"
    },
    "loginid": {
      "type": "string",
      "pattern": "^[A-Z]+[0-9]+$",
      "description": "Legacy loginid whose default-account statement to return. Must match `^[A-Z]+[0-9]+$`.",
      "example": "CR12345"
    },
    "date_from": {
      "type": "integer",
      "format": "int64",
      "minimum": 0,
      "maximum": 2147483647,
      "description": "Inclusive lower bound as epoch seconds. A row is included iff its true `transaction_time` is `>= date_from`. Defaults to 0 (all history). Values above 2147483647 (the year-2038 epoch limit) are rejected with HTTP 422."
    },
    "date_to": {
      "type": "integer",
      "format": "int64",
      "minimum": 0,
      "maximum": 2147483647,
      "description": "Exclusive upper bound as epoch seconds. A row is included iff its true `transaction_time` is `< date_to`. Defaults to current time. Values above 2147483647 (the year-2038 epoch limit) are rejected with HTTP 422."
    },
    "action_type": {
      "type": "string",
      "enum": [
        "buy",
        "sell",
        "deposit",
        "withdrawal",
        "transfer",
        "hold",
        "release",
        "adjustment",
        "escrow"
      ],
      "description": "Filter by transaction type. Defaults to all types."
    },
    "limit": {
      "type": "integer",
      "minimum": 1,
      "maximum": 999,
      "default": 100,
      "description": "Maximum number of transactions to return. Defaults to 100, maximum 999."
    },
    "offset": {
      "type": "integer",
      "minimum": 0,
      "default": 0,
      "description": "Number of transactions to skip before returning results. Use with `limit` for pagination."
    }
  },
  "additionalProperties": false
}
```

## Response Schema

#### `transactions` — Required `array`

Historical transactions for the requested loginid's default account.

**Array Items:**

  ##### `transaction_id` — Required `integer`

  Unique transaction identifier.

  ##### `account_id` — Required `integer`

  Legacy account identifier (the default account of the requested loginid).

  ##### `loginid` — Required `string`

  Legacy client loginid as requested.

  ##### `action_type` — Required `string | enum`

  Transaction type.

  Allowed values: `"buy"`, `"sell"`, `"deposit"`, `"withdrawal"`, `"transfer"`, `"hold"`, `"release"`, `"adjustment"`, `"escrow"`

  ##### `amount` — Optional `string | null`

  Signed transaction amount as a decimal string.

  ##### `balance_after` — Optional `string | null`

  Account balance after the transaction as a decimal string.

  ##### `transaction_time` — Optional `integer | null`

  Transaction timestamp as epoch seconds, computed as the floor of the underlying high-precision database timestamp. Supplying this value as `date_from` on a subsequent request always re-includes the originating row.

  ##### `contract_id` — Optional `integer | null`

  Financial market bet ID; null for non-trading transactions.

  ##### `currency` — Optional `string | null`

  Account currency code (the default account's currency).

  ##### `shortcode` — Optional `string | null`

  Legacy contract shortcode; null for non-trading transactions.

  ##### `bet_class` — Optional `string | null`

  Bet class (e.g. higher_lower_bet, digit_bet, multiplier); null for non-trading transactions.

  ##### `bet_type` — Optional `string | null`

  Bet type (e.g. CALL, PUT, DIGITOVER); null for non-trading transactions.

  ##### `symbol` — Optional `string | null`

  Underlying market symbol (e.g. R_100, frxEURUSD); null for non-trading transactions.

  ##### `app_id` — Optional `integer | null`

  Identifier of the third-party application that originated the transaction; null if not recorded.

#### `count` — Required `integer`

Number of items in `transactions` (equals `transactions.length`). Not a total across pages.

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Legacy Statement (response)",
  "description": "Statement of historical transactions from the legacy platform for the requested loginid's default account, ordered by `transaction_time` descending (ties broken by `transaction_id` descending).",
  "type": "object",
  "required": [
    "transactions",
    "count"
  ],
  "properties": {
    "transactions": {
      "type": "array",
      "description": "Historical transactions for the requested loginid's default account.",
      "items": {
        "type": "object",
        "required": [
          "transaction_id",
          "account_id",
          "loginid",
          "action_type"
        ],
        "properties": {
          "transaction_id": {
            "type": "integer",
            "format": "int64",
            "description": "Unique transaction identifier."
          },
          "account_id": {
            "type": "integer",
            "format": "int64",
            "description": "Legacy account identifier (the default account of the requested loginid)."
          },
          "loginid": {
            "type": "string",
            "description": "Legacy client loginid as requested.",
            "example": "CR12345"
          },
          "action_type": {
            "type": "string",
            "enum": [
              "buy",
              "sell",
              "deposit",
              "withdrawal",
              "transfer",
              "hold",
              "release",
              "adjustment",
              "escrow"
            ],
            "description": "Transaction type."
          },
          "amount": {
            "type": [
              "string",
              "null"
            ],
            "description": "Signed transaction amount as a decimal string."
          },
          "balance_after": {
            "type": [
              "string",
              "null"
            ],
            "description": "Account balance after the transaction as a decimal string."
          },
          "transaction_time": {
            "type": [
              "integer",
              "null"
            ],
            "format": "int64",
            "description": "Transaction timestamp as epoch seconds, computed as the floor of the underlying high-precision database timestamp. Supplying this value as `date_from` on a subsequent request always re-includes the originating row."
          },
          "contract_id": {
            "type": [
              "integer",
              "null"
            ],
            "format": "int64",
            "description": "Financial market bet ID; null for non-trading transactions."
          },
          "currency": {
            "type": [
              "string",
              "null"
            ],
            "description": "Account currency code (the default account's currency)."
          },
          "shortcode": {
            "type": [
              "string",
              "null"
            ],
            "description": "Legacy contract shortcode; null for non-trading transactions."
          },
          "bet_class": {
            "type": [
              "string",
              "null"
            ],
            "description": "Bet class (e.g. higher_lower_bet, digit_bet, multiplier); null for non-trading transactions."
          },
          "bet_type": {
            "type": [
              "string",
              "null"
            ],
            "description": "Bet type (e.g. CALL, PUT, DIGITOVER); null for non-trading transactions."
          },
          "symbol": {
            "type": [
              "string",
              "null"
            ],
            "description": "Underlying market symbol (e.g. R_100, frxEURUSD); null for non-trading transactions."
          },
          "app_id": {
            "type": [
              "integer",
              "null"
            ],
            "format": "int64",
            "description": "Identifier of the third-party application that originated the transaction; null if not recorded."
          }
        }
      }
    },
    "count": {
      "type": "integer",
      "description": "Number of items in `transactions` (equals `transactions.length`). Not a total across pages."
    }
  }
}

```

## Examples

### Request Example

```json
GET /trading/v1/options/legacy/statement?loginid=CR12345&limit=100
Headers:
  Deriv-App-ID: YOUR_APP_ID
  Authorization: Bearer YOUR_AUTH_TOKEN
```

### Response Example

```json
{
  "transactions": [
    {
      "transaction_id": 22859,
      "account_id": 202201,
      "loginid": "CR12345",
      "action_type": "sell",
      "amount": "0.00",
      "balance_after": "9558.62",
      "transaction_time": 1779169387,
      "contract_id": 13039,
      "currency": "USD",
      "shortcode": "PUT_1HZ100V_19.12_1779162186_1779169386_S0P_0",
      "bet_class": "higher_lower_bet",
      "bet_type": "PUT",
      "symbol": "1HZ100V",
      "app_id": 2
    }
  ],
  "count": 1
}
```

## Status Codes

200 OK - Statement returned successfully

400 Bad request - Bad input (e.g. malformed loginid)

401 Unauthorized - Invalid or missing authentication

404 Not found - User or default account not found

409 Conflict - User migration is pending or has failed

422 Unprocessable entity - Request validation error

500 Internal server error

503 Service temporarily unavailable

## Error Responses

400 Bad request

```
{
  "errors": [
    {
      "status": 400,
      "code": "ValidationError",
      "message": "loginid must match ^[A-Z]+[0-9]+$"
    }
  ],
  "meta": {
    "endpoint": "/trading/v1/options/legacy/statement",
    "method": "GET",
    "timing": 18
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
    "endpoint": "/trading/v1/options/legacy/statement",
    "method": "GET",
    "timing": 24
  }
}
```

422 Validation error

```
{
  "errors": [
    {
      "status": 422,
      "code": "ValidationError",
      "message": "date_to must be <= 2147483647"
    }
  ],
  "meta": {
    "endpoint": "/trading/v1/options/legacy/statement",
    "method": "GET",
    "timing": 14
  }
}
```

##### Authentication Required

This endpoint requires the `Deriv-App-ID` header to identify your application. OAuth2 Scope: `trade`

## About legacy_statement

The `legacy_statement` endpoint get the historical transaction statement from the legacy options platform for the default account of the supplied loginid.

### Date Range

`date_from` and `date_to` are epoch seconds and form a half-open interval `[date_from, date_to)` : a row is included iff its true `transaction_time` is `>= date_from` and `< date_to` . Both bounds are optional — `date_from` defaults to `0` (all history) and `date_to` defaults to the current time. Values above `2147483647` (the year-2038 epoch limit) are rejected with HTTP 422.

### Ordering

Transactions are returned newest first — sorted by `transaction_time` descending, with ties broken by `transaction_id` descending.

### Pagination

Use `limit` (default 100, maximum 999) and `offset` (default 0) to page through results. The `count` field in the response is the size of the current page, not a total across pages.

### Action Types

Filter by `action_type` to narrow the result. Valid values: `buy` , `sell` , `deposit` , `withdrawal` , `transfer` , `hold` , `release` , `adjustment` , `escrow` . Omit the parameter to return all types.

### Loginid

The `loginid` query parameter is required and must match the pattern `^[A-Z]+[0-9]+$` (e.g. `CR12345` ). The statement returned is scoped to the default account of that loginid. If the user's migration is pending or failed, the request returns **HTTP 409** ; check the `migration-status` endpoint first.