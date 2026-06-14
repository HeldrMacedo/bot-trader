[Trading Operations](/docs/trading)

# Buy Contract

Auth required

Buy a contract using a proposal ID.

## Request & Response

## Request Schema

#### `buy` — Required `string`

Either the ID received from a Price Proposal (`proposal` call), or `1` if contract buy parameters are passed in the `parameters` field.

Pattern: `^(?:[\w-]{32,128}|1)$`

#### `parameters` — Optional `object`

[Optional] Used to pass the parameters for contract buy.

**Object Properties:**

  ##### `amount` — Optional `number`

  [Optional] Proposed payout or stake value

  Min: 0

  ##### `app_markup_percentage` — Optional `number`

  [Optional] Markup added to contract prices (as a percentage of contract payout)

  ##### `barrier` — Optional `string`

  [Optional] Barrier for the contract (or last digit prediction for digit contracts). Contracts less than 24 hours in duration would need a relative barrier (barriers which need +/-), where entry spot would be adjusted accordingly with that amount to define a barrier, except for Synthetic Indices as they support both relative and absolute barriers.

  Pattern: `^(?=.{1,20}$)[+-]?[0-9]+\.?[0-9]*$`

  ##### `barrier2` — Optional `string`

  [Optional] Low barrier for the contract (for contracts with two barriers). Contracts less than 24 hours in duration would need a relative barrier (barriers which need +/-), where entry spot would be adjusted accordingly with that amount to define a barrier, except for Synthetic Indices as they support both relative and absolute barriers.

  Pattern: `^(?=.{1,20}$)[+-]?[0-9]+\.?[0-9]*$`

  ##### `basis` — Optional `string | enum`

  [Optional] Indicates whether amount is 'payout' or 'stake' for binary options.

  Allowed values: `"payout"`, `"stake"`

  ##### `cancellation` — Optional `string`

  Cancellation duration option (only for `MULTUP` and `MULTDOWN` contracts).

  Pattern: `^\w+$`

  ##### `contract_type` — Required `string | enum`

  A valid contract-type

  Allowed values: `"HIGHER"`, `"LOWER"`, `"ACCU"`, `"ASIAND"`, `"ASIANU"`, `"CALL"`, `"CALLE"`, `"DIGITDIFF"`, `"DIGITEVEN"`, `"DIGITMATCH"`, `"DIGITODD"`, `"DIGITOVER"`, `"DIGITUNDER"`, `"EXPIRYMISS"`, `"EXPIRYMISSE"`, `"EXPIRYRANGE"`, `"EXPIRYRANGEE"`, `"MULTDOWN"`, `"MULTUP"`, `"NOTOUCH"`, `"ONETOUCH"`, `"PUT"`, `"PUTE"`, `"RANGE"`, `"RESETCALL"`, `"RESETPUT"`, `"RUNHIGH"`, `"RUNLOW"`, `"TICKHIGH"`, `"TICKLOW"`, `"TURBOSLONG"`, `"TURBOSSHORT"`, `"UPORDOWN"`, `"VANILLALONGCALL"`, `"VANILLALONGPUT"`

  ##### `currency` — Required `string`

  This can only be the account-holder's currency

  Pattern: `^[a-zA-Z0-9]{2,20}$`

  ##### `date_expiry` — Optional `integer`

  [Optional] Epoch value of the expiry time of the contract. You must either specify date_expiry or duration.

  Min: 1 · Max: 9999999999

  ##### `duration` — Optional `integer`

  [Optional] Duration quantity

  Min: 0 · Max: 99999999

  ##### `duration_unit` — Optional `string | enum`

  [Optional] Duration unit is `s`: seconds, `m`: minutes, `h`: hours, `d`: days, `t`: ticks

  Allowed values: `"d"`, `"m"`, `"s"`, `"h"`, `"t"`

  ##### `growth_rate` — Optional `number`

  [Optional] Growth rate of an accumulator contract.

  ##### `limit_order` — Optional `object`

  Add an order to close the contract once the order condition is met (only for `MULTUP` and `MULTDOWN` and `ACCU` contracts).

  **Object Properties:**

    ###### `stop_loss` — Optional `number`

    Contract will be automatically closed when the value of the contract reaches a specific loss.

    ###### `take_profit` — Optional `number`

    Contract will be automatically closed when the value of the contract reaches a specific profit.

  ##### `multiplier` — Optional `number`

  [Optional] The multiplier for non-binary options. E.g. lookbacks.

  Min: 0

  ##### `payout_per_point` — Optional `number`

  [Optional] Clients can provide payout_per_point directly, and the barrier will be calculated based on this payout_per_point value.

  ##### `selected_tick` — Optional `integer`

  [Optional] The tick that is predicted to have the highest/lowest value - for tickhigh and ticklow contracts.

  ##### `underlying_symbol` — Required `string`

  Symbol code

  Pattern: `^\w{2,30}$`

#### `price` — Required `number`

Maximum price at which to purchase the contract.

Min: 0

#### `subscribe` — Optional `integer | enum`

[Optional] `1` to stream.

Allowed values: `1`

#### `passthrough` — Optional `object`

[Optional] Used to pass data through the websocket, which may be retrieved via the `echo_req` output field.

#### `req_id` — Optional `integer`

[Optional] Used to map request to response.

```json
{
  "$schema": "http://json-schema.org/draft-04/schema#",
  "title": "Buy Contract (request)",
  "description": "Buy a Contract",
  "type": "object",
  "auth_required": 1,
  "auth_scopes": [
    "trade"
  ],
  "additionalProperties": false,
  "required": [
    "buy",
    "price"
  ],
  "properties": {
    "buy": {
      "description": "Either the ID received from a Price Proposal (`proposal` call), or `1` if contract buy parameters are passed in the `parameters` field.",
      "type": "string",
      "pattern": "^(?:[\\w-]{32,128}|1)$"
    },
    "parameters": {
      "description": "[Optional] Used to pass the parameters for contract buy.",
      "type": "object",
      "additionalProperties": false,
      "required": [
        "contract_type",
        "currency",
        "underlying_symbol"
      ],
      "properties": {
        "amount": {
          "description": "[Optional] Proposed payout or stake value",
          "type": "number",
          "minimum": 0
        },
        "app_markup_percentage": {
          "description": "[Optional] Markup added to contract prices (as a percentage of contract payout)",
          "type": "number"
        },
        "barrier": {
          "description": "[Optional] Barrier for the contract (or last digit prediction for digit contracts). Contracts less than 24 hours in duration would need a relative barrier (barriers which need +/-), where entry spot would be adjusted accordingly with that amount to define a barrier, except for Synthetic Indices as they support both relative and absolute barriers.",
          "type": "string",
          "pattern": "^(?=.{1,20}$)[+-]?[0-9]+\\.?[0-9]*$"
        },
        "barrier2": {
          "description": "[Optional] Low barrier for the contract (for contracts with two barriers). Contracts less than 24 hours in duration would need a relative barrier (barriers which need +/-), where entry spot would be adjusted accordingly with that amount to define a barrier, except for Synthetic Indices as they support both relative and absolute barriers.",
          "type": "string",
          "pattern": "^(?=.{1,20}$)[+-]?[0-9]+\\.?[0-9]*$"
        },
        "basis": {
          "description": "[Optional] Indicates whether amount is 'payout' or 'stake' for binary options.",
          "type": "string",
          "enum": [
            "payout",
            "stake"
          ]
        },
        "cancellation": {
          "description": "Cancellation duration option (only for `MULTUP` and `MULTDOWN` contracts).",
          "type": "string",
          "pattern": "^\\w+$"
        },
        "contract_type": {
          "description": "A valid contract-type",
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
            "EXPIRYMISS",
            "EXPIRYMISSE",
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
            "TURBOSLONG",
            "TURBOSSHORT",
            "UPORDOWN",
            "VANILLALONGCALL",
            "VANILLALONGPUT"
          ]
        },
        "currency": {
          "description": "This can only be the account-holder's currency",
          "type": "string",
          "pattern": "^[a-zA-Z0-9]{2,20}$"
        },
        "date_expiry": {
          "description": "[Optional] Epoch value of the expiry time of the contract. You must either specify date_expiry or duration.",
          "type": "integer",
          "maximum": 9999999999,
          "minimum": 1
        },
        "duration": {
          "description": "[Optional] Duration quantity",
          "type": "integer",
          "maximum": 99999999,
          "minimum": 0
        },
        "duration_unit": {
          "description": "[Optional] Duration unit is `s`: seconds, `m`: minutes, `h`: hours, `d`: days, `t`: ticks",
          "type": "string",
          "enum": [
            "d",
            "m",
            "s",
            "h",
            "t"
          ]
        },
        "growth_rate": {
          "description": "[Optional] Growth rate of an accumulator contract.",
          "type": "number"
        },
        "limit_order": {
          "description": "Add an order to close the contract once the order condition is met (only for `MULTUP` and `MULTDOWN` and `ACCU` contracts).",
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "stop_loss": {
              "description": "Contract will be automatically closed when the value of the contract reaches a specific loss.",
              "type": "number"
            },
            "take_profit": {
              "description": "Contract will be automatically closed when the value of the contract reaches a specific profit.",
              "type": "number"
            }
          }
        },
        "multiplier": {
          "description": "[Optional] The multiplier for non-binary options. E.g. lookbacks.",
          "type": "number",
          "minimum": 0
        },
        "payout_per_point": {
          "description": "[Optional] Clients can provide payout_per_point directly, and the barrier will be calculated based on this payout_per_point value.",
          "type": "number"
        },
        "selected_tick": {
          "description": "[Optional] The tick that is predicted to have the highest/lowest value - for tickhigh and ticklow contracts.",
          "type": "integer"
        },
        "underlying_symbol": {
          "description": "Symbol code",
          "type": "string",
          "pattern": "^\\w{2,30}$"
        }
      }
    },
    "price": {
      "description": "Maximum price at which to purchase the contract.",
      "type": "number",
      "minimum": 0
    },
    "subscribe": {
      "description": "[Optional] `1` to stream.",
      "type": "integer",
      "enum": [
        1
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

#### `buy` — Optional `object`

Receipt confirmation for the purchase

**Object Properties:**

  ##### `balance_after` — Required `number`

  The new account balance after completion of the purchase

  ##### `buy_price` — Required `number`

  Actual effected purchase price

  ##### `contract_id` — Required `integer`

  Internal contract identifier

  ##### `longcode` — Required `string`

  The description of contract purchased

  ##### `payout` — Required `number`

  Proposed payout value

  ##### `purchase_time` — Required `integer`

  Epoch value of the transaction purchase time

  ##### `shortcode` — Required `string`

  Compact description of the contract purchased

  ##### `start_time` — Required `integer`

  Epoch value showing the expected start time of the contract

  ##### `transaction_id` — Required `integer`

  Internal transaction identifier

#### `subscription` — Optional `object`

For subscription requests only.

**Object Properties:**

  ##### `id` — Required `string`

  A per-connection unique identifier. Can be passed to the `forget` API call to unsubscribe.

#### `echo_req` — Required `object`

Echo of the request made.

#### `msg_type` — Required `string | enum`

Action name of the request made.

Allowed values: `"buy"`

#### `req_id` — Optional `integer`

Optional field sent in request to map to response, present only when request contains `req_id`.

```json
{
  "$schema": "http://json-schema.org/draft-04/schema#",
  "title": "Buy Contract (response)",
  "description": "A message with transaction results is received",
  "type": "object",
  "required": [
    "echo_req",
    "msg_type"
  ],
  "properties": {
    "buy": {
      "title": "buy",
      "description": "Receipt confirmation for the purchase",
      "type": "object",
      "additionalProperties": false,
      "required": [
        "balance_after",
        "buy_price",
        "contract_id",
        "longcode",
        "payout",
        "purchase_time",
        "shortcode",
        "start_time",
        "transaction_id"
      ],
      "properties": {
        "balance_after": {
          "description": "The new account balance after completion of the purchase",
          "type": "number"
        },
        "buy_price": {
          "description": "Actual effected purchase price",
          "type": "number"
        },
        "contract_id": {
          "description": "Internal contract identifier",
          "type": "integer"
        },
        "longcode": {
          "description": "The description of contract purchased",
          "type": "string"
        },
        "payout": {
          "description": "Proposed payout value",
          "type": "number"
        },
        "purchase_time": {
          "description": "Epoch value of the transaction purchase time",
          "type": "integer"
        },
        "shortcode": {
          "description": "Compact description of the contract purchased",
          "type": "string"
        },
        "start_time": {
          "description": "Epoch value showing the expected start time of the contract",
          "type": "integer"
        },
        "transaction_id": {
          "description": "Internal transaction identifier",
          "type": "integer"
        }
      }
    },
    "subscription": {
      "title": "Subscription information",
      "description": "For subscription requests only.",
      "type": "object",
      "additionalProperties": false,
      "required": [
        "id"
      ],
      "properties": {
        "id": {
          "description": "A per-connection unique identifier. Can be passed to the `forget` API call to unsubscribe.",
          "type": "string",
          "examples": [
            "c84a793b-8a87-7999-ce10-9b22f7ceead3"
          ]
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
        "buy"
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
  "buy": "uw2mk7no3oktoRVVsB4Dz7TQnFfABuFDgO95dlxfMxRuPUsz",
  "price": 100
}
```

### Response Example

```json
{
  "buy": {
    "balance_after": 9900.00,
    "buy_price": 51.02,
    "contract_id": 11542203588,
    "longcode": "Win payout if Volatility 100 Index...",
    "payout": 100,
    "purchase_time": 1234567890,
    "shortcode": "CALL_R_100_100_1234567890_1234567950_S0P_0",
    "start_time": 1234567890,
    "transaction_id": 12345678
  },
  "msg_type": "buy"
}
```

##### Authentication Required

This endpoint requires a valid session. Ensure your WebSocket connection is authenticated before calling this endpoint.

## About buy

The `buy` endpoint buy a contract using a proposal ID.

This is a trading endpoint. Use it to get proposals, buy/sell contracts, and manage active positions. Most trading endpoints require authentication.