[Account Management](/docs/account)

# Portfolio

Auth required

Get a list of all open positions for the authorized account.

## Request & Response

## Request Schema

#### `portfolio` — Required `integer | enum`

Must be `1`

Allowed values: `1`

#### `contract_type` — Optional `array`

Return only contracts of the specified types

#### `passthrough` — Optional `object`

[Optional] Used to pass data through the websocket, which may be retrieved via the `echo_req` output field.

#### `req_id` — Optional `integer`

[Optional] Used to map request to response.

```json
{
  "$schema": "http://json-schema.org/draft-04/schema#",
  "title": "Portfolio (request)",
  "description": "Receive information about my current portfolio of outstanding options",
  "type": "object",
  "auth_required": 1,
  "auth_scopes": [
    "trade"
  ],
  "additionalProperties": false,
  "required": [
    "portfolio"
  ],
  "properties": {
    "portfolio": {
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

#### `portfolio` — Optional `object`

Current account's open positions.

**Object Properties:**

  ##### `contracts` — Required `array`

  List of open positions.

  **Array Items:**

    ###### `buy_price` — Optional `number`

    Buy price

    ###### `contract_id` — Optional `integer`

    Internal contract identifier number (to be used in a `proposal_open_contract` API call).

    ###### `contract_type` — Optional `string`

    Contract type

    ###### `currency` — Optional `string`

    Contract currency

    ###### `date_start` — Optional `integer`

    Epoch of start date

    ###### `expiry_time` — Optional `integer`

    Epoch of expiry time

    ###### `longcode` — Optional `string`

    Contract description

    ###### `payout` — Optional `number`

    Payout price

    ###### `purchase_time` — Optional `integer`

    Epoch of purchase time

    ###### `shortcode` — Optional `string`

    Contract short code description

    ###### `transaction_id` — Optional `integer`

    It is the transaction ID. Every contract (buy or sell) and every payment has a unique ID.

    ###### `underlying_symbol` — Optional `string`

    Symbol code

#### `echo_req` — Required `object`

Echo of the request made.

#### `msg_type` — Required `string | enum`

Action name of the request made.

Allowed values: `"portfolio"`

#### `req_id` — Optional `integer`

Optional field sent in request to map to response, present only when request contains `req_id`.

```json
{
  "$schema": "http://json-schema.org/draft-04/schema#",
  "title": "Portfolio (response)",
  "description": "Receive a list of outstanding options in the user's portfolio",
  "type": "object",
  "required": [
    "echo_req",
    "msg_type"
  ],
  "properties": {
    "portfolio": {
      "title": "portfolio",
      "description": "Current account's open positions.",
      "type": "object",
      "additionalProperties": false,
      "required": [
        "contracts"
      ],
      "properties": {
        "contracts": {
          "title": "Contracts",
          "description": "List of open positions.",
          "type": "array",
          "items": {
            "title": "Portfolio",
            "description": "The details of each open position.",
            "type": "object",
            "additionalProperties": false,
            "properties": {
              "buy_price": {
                "description": "Buy price",
                "type": "number"
              },
              "contract_id": {
                "description": "Internal contract identifier number (to be used in a `proposal_open_contract` API call).",
                "type": "integer"
              },
              "contract_type": {
                "description": "Contract type",
                "type": "string"
              },
              "currency": {
                "description": "Contract currency",
                "type": "string"
              },
              "date_start": {
                "description": "Epoch of start date",
                "type": "integer"
              },
              "expiry_time": {
                "description": "Epoch of expiry time",
                "type": "integer"
              },
              "longcode": {
                "description": "Contract description",
                "type": "string"
              },
              "payout": {
                "description": "Payout price",
                "type": "number"
              },
              "purchase_time": {
                "description": "Epoch of purchase time",
                "type": "integer"
              },
              "shortcode": {
                "description": "Contract short code description",
                "type": "string"
              },
              "transaction_id": {
                "description": "It is the transaction ID. Every contract (buy or sell) and every payment has a unique ID.",
                "type": "integer",
                "examples": [
                  "10867502908"
                ]
              },
              "underlying_symbol": {
                "description": "Symbol code",
                "type": "string"
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
        "portfolio"
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
  "portfolio": 1,
  "req_id": 4
}
```

### Response Example

```json
{
  "portfolio": {
    "contracts": [...]
  },
  "msg_type": "portfolio",
  "req_id": 4
}
```

##### Open positions only

This endpoint returns only open (active) contracts. For historical closed contracts, use the `profit_table` or `statement` endpoints.

##### Authentication Required

This endpoint requires a valid session. Ensure your WebSocket connection is authenticated before calling this endpoint.

## About portfolio

The `portfolio` endpoint get a list of all open positions for the authorized account.

This is an account management endpoint. Use it to manage authentication, balances, and account information.