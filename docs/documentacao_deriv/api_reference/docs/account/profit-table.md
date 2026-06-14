[Account Management](/docs/account)

# Profit Table

Auth required

Retrieve a summary of account profit/loss.

## Request & Response

## Request Schema

#### `profit_table` — Required `integer | enum`

Must be `1`

Allowed values: `1`

#### `contract_type` — Optional `array`

Return only contracts of the specified types

#### `date_from` — Optional `string`

[Optional] Start date (epoch or YYYY-MM-DD)

Pattern: `^([0-9]{4}-(0?[1-9]|1[012])-(0?[1-9]|[12][0-9]|3[01])|[0-9]{1,10})$`

#### `date_to` — Optional `string`

[Optional] End date (epoch or YYYY-MM-DD)

Pattern: `^([0-9]{4}-(0?[1-9]|1[012])-(0?[1-9]|[12][0-9]|3[01])|[0-9]{1,10})$`

#### `description` — Optional `integer | enum`

[Optional] If set to 1, will return full contracts description.

Allowed values: `0`, `1`

#### `limit` — Optional `number`

[Optional] Apply upper limit to count of transactions received.

Min: 0 · Max: 500 · Default: `50`

#### `offset` — Optional `integer`

[Optional] Number of transactions to skip.

Min: 0

#### `sort` — Optional `string | enum`

[Optional] Sort direction.

Default: `"DESC"`

Allowed values: `"ASC"`, `"DESC"`

#### `passthrough` — Optional `object`

[Optional] Used to pass data through the websocket, which may be retrieved via the `echo_req` output field.

#### `req_id` — Optional `integer`

[Optional] Used to map request to response.

```json

{
  "$schema": "http://json-schema.org/draft-04/schema#",
  "title": "Profit Table (request)",
  "description": "Retrieve a summary of account Profit Table, according to given search criteria",
  "type": "object",
  "auth_required": 1,
  "auth_scopes": [
    "trade"
  ],
  "additionalProperties": false,
  "required": [
    "profit_table"
  ],
  "properties": {
    "profit_table": {
      "description": "Must be `1`",
      "type": "integer",
      "enum": [
        1
      ]
    },
    "contract_type": {
      "description": "Return only contracts of the specified types",
      "type": "array",
      "items": {
        "type": "string",
        "enum": [
          "HIGHER",
          "LOWER",
          "ACCU",
          "ASIAND",
          "ASIANU",
          "CALL",
          "CALLE",
          "DIGITDIFF",
          "DIGITEVEN",
          "DIGITMATCH",
          "DIGITODD",
          "DIGITOVER",
          "DIGITUNDER",
          "EXPIRYMISSE",
          "EXPIRYMISS",
          "EXPIRYRANGE",
          "EXPIRYRANGEE",
          "MULTDOWN",
          "MULTUP",
          "NOTOUCH",
          "ONETOUCH",
          "PUT",
          "PUTE",
          "RANGE",
          "RESETCALL",
          "RESETPUT",
          "RUNHIGH",
          "RUNLOW",
          "TICKHIGH",
          "TICKLOW",
          "UPORDOWN",
          "VANILLALONGCALL",
          "VANILLALONGPUT",
          "TURBOSLONG",
          "TURBOSSHORT"
        ],
        "uniqueItems": true
      }
    },
    "date_from": {
      "description": "[Optional] Start date (epoch or YYYY-MM-DD)",
      "type": "string",
      "pattern": "^([0-9]{4}-(0?[1-9]|1[012])-(0?[1-9]|[12][0-9]|3[01])|[0-9]{1,10})$"
    },
    "date_to": {
      "description": "[Optional] End date (epoch or YYYY-MM-DD)",
      "type": "string",
      "pattern": "^([0-9]{4}-(0?[1-9]|1[012])-(0?[1-9]|[12][0-9]|3[01])|[0-9]{1,10})$"
    },
    "description": {
      "description": "[Optional] If set to 1, will return full contracts description.",
      "type": "integer",
      "enum": [
        0,
        1
      ]
    },
    "limit": {
      "description": "[Optional] Apply upper limit to count of transactions received.",
      "type": "number",
      "default": 50,
      "maximum": 500,
      "minimum": 0
    },
    "offset": {
      "description": "[Optional] Number of transactions to skip.",
      "type": "integer",
      "minimum": 0
    },
    "sort": {
      "description": "[Optional] Sort direction.",
      "type": "string",
      "default": "DESC",
      "enum": [
        "ASC",
        "DESC"
      ]
    },
    "passthrough": {
      "description": "[Optional] Used to pass data through the websocket, which may be retrieved via the `echo_req` output field.",
      "type": "object"
    },
    "req_id": {
      "description": "[Optional] Used to map request to response.",
      "type": "integer"
    }
  }
}
```

## Response Schema

#### `profit_table` — Optional `object`

Account Profit Table.

**Object Properties:**

  ##### `count` — Optional `number`

  Number of transactions returned in this call

  ##### `transactions` — Optional `array`

  Array of returned transactions

  **Array Items:**

    ###### `buy_price` — Optional `number`

    The buy price

    ###### `contract_id` — Optional `integer | null`

    The unique contract identifier.

    ###### `contract_type` — Optional `string`

    [Optional] The contract type for the transaction if description is set to 1.

    ###### `deal_cancellation_duration` — Optional `string`

    [Optional] Duration set for deal cancellation for Multiplier contracts in synthetic indices if description is set to 1.

    ###### `duration_type` — Optional `null | string`

    [Optional] The duration type of the contract if description is set to 1.

    ###### `growth_rate` — Optional `string`

    [Optional] The growth rate for Accumulators contract if description is set to 1.

    ###### `longcode` — Optional `string`

    [Optional] The description of contract purchased if description is set to 1

    ###### `multiplier` — Optional `string`

    [Optional] The multiplier for Multiplier contracts if description is set to 1.

    ###### `payout` — Optional `number`

    Payout price

    ###### `purchase_time` — Optional `integer`

    Epoch purchase time of the transaction

    ###### `sell_price` — Optional `number`

    The price the contract sold for.

    ###### `sell_time` — Optional `integer | null`

    Epoch sell time of the transaction

    ###### `shortcode` — Optional `string`

    [Optional] Compact description of the contract purchased if description is set to 1

    ###### `transaction_id` — Optional `integer`

    The transaction Identifier. Every contract (buy or sell) and every payment has a unique transaction identifier.

    ###### `underlying_symbol` — Optional `string`

    [Optional] Symbol code if description is set to 1

#### `echo_req` — Required `object`

Echo of the request made.

#### `msg_type` — Required `string | enum`

Action name of the request made.

Allowed values: `"profit_table"`

#### `req_id` — Optional `integer`

Optional field sent in request to map to response, present only when request contains `req_id`.

```json
{
  "$schema": "http://json-schema.org/draft-04/schema#",
  "title": "Profit Table (response)",
  "description": "A summary of account profit table is received",
  "type": "object",
  "required": [
    "echo_req",
    "msg_type"
  ],
  "properties": {
    "profit_table": {
      "title": "profit_table",
      "description": "Account Profit Table.",
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "count": {
          "description": "Number of transactions returned in this call",
          "type": "number"
        },
        "transactions": {
          "description": "Array of returned transactions",
          "type": "array",
          "items": {
            "type": "object",
            "additionalProperties": false,
            "properties": {
              "buy_price": {
                "description": "The buy price",
                "type": "number"
              },
              "contract_id": {
                "description": "The unique contract identifier.",
                "type": [
                  "integer",
                  "null"
                ],
                "examples": [
                  4867502908
                ]
              },
              "contract_type": {
                "description": "[Optional] The contract type for the transaction if description is set to 1.",
                "type": "string",
                "examples": [
                  "ASIANU",
                  "CALL"
                ]
              },
              "deal_cancellation_duration": {
                "description": "[Optional] Duration set for deal cancellation for Multiplier contracts in synthetic indices if description is set to 1.",
                "type": "string"
              },
              "duration_type": {
                "description": "[Optional] The duration type of the contract if description is set to 1.",
                "type": [
                  "null",
                  "string"
                ]
              },
              "growth_rate": {
                "description": "[Optional] The growth rate for Accumulators contract if description is set to 1.",
                "type": "string"
              },
              "longcode": {
                "description": "[Optional] The description of contract purchased if description is set to 1",
                "type": "string"
              },
              "multiplier": {
                "description": "[Optional] The multiplier for Multiplier contracts if description is set to 1.",
                "type": "string"
              },
              "payout": {
                "description": "Payout price",
                "type": "number"
              },
              "purchase_time": {
                "description": "Epoch purchase time of the transaction",
                "type": "integer"
              },
              "sell_price": {
                "description": "The price the contract sold for.",
                "type": "number"
              },
              "sell_time": {
                "description": "Epoch sell time of the transaction",
                "type": [
                  "integer",
                  "null"
                ]
              },
              "shortcode": {
                "description": "[Optional] Compact description of the contract purchased if description is set to 1",
                "type": "string"
              },
              "transaction_id": {
                "description": "The transaction Identifier. Every contract (buy or sell) and every payment has a unique transaction identifier.",
                "type": "integer",
                "examples": [
                  10867502908
                ]
              },
              "underlying_symbol": {
                "description": "[Optional] Symbol code if description is set to 1",
                "type": "string",
                "examples": [
                  "R_50",
                  "frxEURUSD"
                ]
              }
            }
          }
        }
      }
    },
    "echo_req": {
      "description": "Echo of the request made.",
      "type": "object"
    },
    "msg_type": {
      "description": "Action name of the request made.",
      "type": "string",
      "enum": [
        "profit_table"
      ]
    },
    "req_id": {
      "description": "Optional field sent in request to map to response, present only when request contains `req_id`.",
      "type": "integer"
    }
  }
}
```

## Examples

### Request Example

```json
{
  "profit_table": 1,
  "description": 1,
  "limit": 25,
  "offset": 25,
  "sort": "ASC"
}
```

### Response Example

```json
{
  "profit_table": {
    "count": 100,
    "transactions": [...]
  },
  "msg_type": "profit_table"
}
```

##### Pagination

Use `limit` and `offset` together to paginate through results. The default limit is 50 with a maximum of 500 records per call.

##### Authentication Required

This endpoint requires a valid session. Ensure your WebSocket connection is authenticated before calling this endpoint.

## About profit_table

The `profit_table` endpoint retrieve a summary of account profit/loss.

This is an account management endpoint. Use it to manage authentication, balances, and account information.