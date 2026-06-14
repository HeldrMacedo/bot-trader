[Account Management](/docs/account)

# Statement

Auth required

Retrieve account statement.

## Request & Response

## Request Schema

#### `statement` — Required `integer | enum`

Must be `1`

Allowed values: `1`

#### `action_type` — Optional `string | enum`

[Optional] To filter the statement according to the type of transaction.

Allowed values: `"buy"`, `"sell"`, `"deposit"`, `"withdrawal"`

#### `date_from` — Optional `integer`

[Optional] Start date (epoch)

Min: 0 · Max: 9999999999

#### `date_to` — Optional `integer`

[Optional] End date (epoch)

Min: 0 · Max: 9999999999

#### `description` — Optional `integer | enum`

[Optional] If set to 1, will return full contracts description.

Allowed values: `0`, `1`

#### `limit` — Optional `number`

[Optional] Maximum number of transactions to receive.

Min: 0 · Max: 999 · Default: `100`

#### `offset` — Optional `integer`

[Optional] Number of transactions to skip.

Min: 0

#### `passthrough` — Optional `object`

[Optional] Used to pass data through the websocket, which may be retrieved via the `echo_req` output field.

#### `req_id` — Optional `integer`

[Optional] Used to map request to response.

```json
{
  "$schema": "http://json-schema.org/draft-04/schema#",
  "title": "Statement (request)",
  "description": "Retrieve a summary of account transactions, according to given search criteria",
  "type": "object",
  "auth_required": 1,
  "auth_scopes": [
    "trade"
  ],
  "additionalProperties": false,
  "required": [
    "statement"
  ],
  "properties": {
    "statement": {
      "description": "Must be `1`",
      "type": "integer",
      "enum": [
        1
      ]
    },
    "action_type": {
      "description": "[Optional] To filter the statement according to the type of transaction.",
      "type": "string",
      "enum": [
        "buy",
        "sell",
        "deposit",
        "withdrawal"
      ]
    },
    "date_from": {
      "description": "[Optional] Start date (epoch)",
      "type": "integer",
      "maximum": 9999999999,
      "minimum": 0
    },
    "date_to": {
      "description": "[Optional] End date (epoch)",
      "type": "integer",
      "maximum": 9999999999,
      "minimum": 0
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
      "description": "[Optional] Maximum number of transactions to receive.",
      "type": "number",
      "default": 100,
      "maximum": 999,
      "minimum": 0
    },
    "offset": {
      "description": "[Optional] Number of transactions to skip.",
      "type": "integer",
      "minimum": 0
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

#### `statement` — Optional `object`

Account statement.

**Object Properties:**

  ##### `count` — Optional `number`

  Number of transactions returned in this call

  ##### `transactions` — Optional `array`

  Array of returned transactions

  **Array Items:**

    ###### `action_type` — Optional `string | enum`

    It is the type of action.

    Allowed values: `"buy"`, `"sell"`, `"deposit"`, `"withdrawal"`

    ###### `amount` — Optional `number`

    It is the amount of transaction.

    ###### `balance_after` — Optional `number`

    It is the remaining balance.

    ###### `contract_id` — Optional `integer | null`

    It is the contract ID.

    ###### `longcode` — Optional `string`

    The description of contract purchased if description is set to `1`.

    ###### `payout` — Optional `null | number`

    Payout price

    ###### `purchase_time` — Optional `integer`

    Time at which contract was purchased, present only for sell transaction

    ###### `reference_id` — Optional `integer | null`

    Internal transaction identifier for the corresponding buy transaction ( set only for contract selling )

    ###### `shortcode` — Optional `null | string`

    Compact description of the contract purchased if description is set to `1`.

    ###### `transaction_id` — Optional `integer`

    It is the transaction ID. In statement every contract (buy or sell) and every payment has a unique ID.

    ###### `transaction_time` — Optional `integer`

    It is the time of transaction.

#### `echo_req` — Required `object`

Echo of the request made.

#### `msg_type` — Required `string | enum`

Action name of the request made.

Allowed values: `"statement"`

#### `req_id` — Optional `integer`

Optional field sent in request to map to response, present only when request contains `req_id`.

```json

{
  "$schema": "http://json-schema.org/draft-04/schema#",
  "title": "Statement (response)",
  "description": "A summary of account statement is received",
  "type": "object",
  "required": [
    "echo_req",
    "msg_type"
  ],
  "properties": {
    "statement": {
      "title": "statement",
      "description": "Account statement.",
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
              "action_type": {
                "description": "It is the type of action.",
                "type": "string",
                "enum": [
                  "buy",
                  "sell",
                  "deposit",
                  "withdrawal"
                ]
              },
              "amount": {
                "description": "It is the amount of transaction.",
                "type": "number",
                "examples": [
                  -83.23
                ]
              },
              "balance_after": {
                "description": "It is the remaining balance.",
                "type": "number",
                "examples": [
                  10150.13
                ]
              },
              "contract_id": {
                "description": "It is the contract ID.",
                "type": [
                  "integer",
                  "null"
                ],
                "examples": [
                  4867502908
                ]
              },
              "longcode": {
                "description": "The description of contract purchased if description is set to `1`.",
                "type": "string"
              },
              "payout": {
                "description": "Payout price",
                "type": [
                  "null",
                  "number"
                ]
              },
              "purchase_time": {
                "description": "Time at which contract was purchased, present only for sell transaction",
                "type": "integer"
              },
              "reference_id": {
                "description": "Internal transaction identifier for the corresponding buy transaction ( set only for contract selling )",
                "type": [
                  "integer",
                  "null"
                ]
              },
              "shortcode": {
                "description": "Compact description of the contract purchased if description is set to `1`.",
                "type": [
                  "null",
                  "string"
                ]
              },
              "transaction_id": {
                "description": "It is the transaction ID. In statement every contract (buy or sell) and every payment has a unique ID.",
                "type": "integer",
                "examples": [
                  10867502908
                ]
              },
              "transaction_time": {
                "description": "It is the time of transaction.",
                "type": "integer",
                "examples": [
                  1441175849
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
        "statement"
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
  "statement": 1,
  "description": 1,
  "limit": 100,
  "offset": 25
}
```

### Response Example

```json
{
  "statement": {
    "count": 500,
    "transactions": [...]
  },
  "msg_type": "statement"
}
```

##### Filtering by action type

Use the `action_type` field to narrow results to specific transaction types: `buy` , `sell` , `deposit` , or `withdrawal` .

##### Authentication Required

This endpoint requires a valid session. Ensure your WebSocket connection is authenticated before calling this endpoint.

## About statement

The `statement` endpoint retrieve account statement.

This is an account management endpoint. Use it to manage authentication, balances, and account information.