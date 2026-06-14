[Trading Operations](/docs/trading)

# Price Proposal

No auth

Get a price proposal for a specific contract.

## Request & Response

## Request Schema

#### `proposal` — Required `integer | enum`

Must be `1`

Allowed values: `1`

#### `amount` — Optional `number`

[Optional] Proposed contract payout or stake.

Min: 0

#### `barrier` — Optional `string`

[Optional] Barrier for the contract (or last digit prediction for digit contracts). Contracts less than 24 hours in duration would need a relative barrier (barriers which need +/-), where entry spot would be adjusted accordingly with that amount to define a barrier, except for Synthetic Indices as they support both relative and absolute barriers. Not needed for lookbacks.

Pattern: `^(?=.{1,20}$)[+-]?[0-9]+\.?[0-9]*$`

#### `barrier2` — Optional `string`

[Optional] Low barrier for the contract (for contracts with two barriers). Contracts less than 24 hours in duration would need a relative barrier (barriers which need +/-), where entry spot would be adjusted accordingly with that amount to define a barrier, except for Synthetic Indices as they support both relative and absolute barriers. Not needed for lookbacks.

Pattern: `^(?=.{1,20}$)[+-]?[0-9]+\.?[0-9]*$`

#### `basis` — Optional `string | enum`

[Optional] Indicates type of the `amount`.

Allowed values: `"payout"`, `"stake"`

#### `cancellation` — Optional `string`

Cancellation duration option (only for `MULTUP` and `MULTDOWN` contracts).

Pattern: `^\w+$`

#### `contract_type` — Required `string | enum`

The proposed contract type

Allowed values: `"HIGHER"`, `"LOWER"`, `"MULTUP"`, `"MULTDOWN"`, `"UPORDOWN"`, `"EXPIRYRANGE"`, `"ONETOUCH"`, `"CALLE"`, `"ASIAND"`, `"EXPIRYRANGEE"`, `"DIGITDIFF"`, `"DIGITMATCH"`, `"DIGITOVER"`, `"PUTE"`, `"DIGITUNDER"`, `"NOTOUCH"`, `"CALL"`, `"RANGE"`, `"DIGITODD"`, `"PUT"`, `"ASIANU"`, `"EXPIRYMISSE"`, `"EXPIRYMISS"`, `"DIGITEVEN"`, `"TICKHIGH"`, `"TICKLOW"`, `"RESETCALL"`, `"RESETPUT"`, `"RUNHIGH"`, `"RUNLOW"`, `"ACCU"`, `"VANILLALONGCALL"`, `"VANILLALONGPUT"`, `"TURBOSLONG"`, `"TURBOSSHORT"`

#### `currency` — Required `string`

This can only be the account-holder's currency (obtained from `payout_currencies` call).

Pattern: `^[a-zA-Z0-9]{2,20}$`

#### `date_expiry` — Optional `integer`

[Optional] Epoch value of the expiry time of the contract. Either date_expiry or duration is required.

Min: 0 · Max: 9999999999

#### `duration` — Optional `integer`

[Optional] Duration quantity. Either date_expiry or duration is required.

Min: 0 · Max: 99999999

#### `duration_unit` — Optional `string | enum`

[Optional] Duration unit - `s`: seconds, `m`: minutes, `h`: hours, `d`: days, `t`: ticks.

Default: `"s"`

Allowed values: `"d"`, `"m"`, `"s"`, `"h"`, `"t"`

#### `growth_rate` — Optional `number`

[Optional] Growth rate of an accumulator contract.

#### `limit_order` — Optional `object`

Add an order to close the contract once the order condition is met (only for `MULTUP` and `MULTDOWN` and 'ACCU' contracts). Supported orders: `take_profit`, `stop_loss`.

**Object Properties:**

  ##### `stop_loss` — Optional `number`

  Contract will be automatically closed when the value of the contract reaches a specific loss.

  ##### `take_profit` — Optional `number`

  Contract will be automatically closed when the value of the contract reaches a specific profit.

#### `multiplier` — Optional `number`

[Optional] The multiplier for non-binary options. E.g. lookbacks.

Min: 0

#### `payout_per_point` — Optional `number`

[Optional] Clients can provide payout_per_point directly, and the barrier will be calculated based on this payout_per_point value.

#### `selected_tick` — Optional `integer`

[Optional] The tick that is predicted to have the highest/lowest value - for `TICKHIGH` and `TICKLOW` contracts.

#### `subscribe` — Optional `integer | enum`

[Optional] 1 - to initiate a realtime stream of prices. Note that tick trades (without a user-defined barrier), digit trades and less than 24 hours at-the-money contracts for the following underlying symbols are not streamed: `R_10`, `R_25`, `R_50`, `R_75`, `R_100`, `RDBULL`, `RDBEAR` (this is because their price is constant).

Allowed values: `1`

#### `underlying_symbol` — Required `string`

The symbol code (obtained from `active_symbols` call).

Pattern: `^\w{2,30}$`

#### `passthrough` — Optional `object`

[Optional] Used to pass data through the websocket, which may be retrieved via the `echo_req` output field.

#### `req_id` — Optional `integer`

[Optional] Used to map request to response.

```json
{
  "$schema": "http://json-schema.org/draft-04/schema#",
  "title": "Price Proposal (request)",
  "description": "Gets latest price for a specific contract.",
  "type": "object",
  "auth_required": 0,
  "additionalProperties": false,
  "required": [
    "proposal",
    "contract_type",
    "currency",
    "underlying_symbol"
  ],
  "properties": {
    "proposal": {
      "description": "Must be `1`",
      "type": "integer",
      "enum": [
        1
      ]
    },
    "amount": {
      "description": "[Optional] Proposed contract payout or stake.",
      "type": "number",
      "minimum": 0
    },
    "barrier": {
      "description": "[Optional] Barrier for the contract (or last digit prediction for digit contracts). Contracts less than 24 hours in duration would need a relative barrier (barriers which need +/-), where entry spot would be adjusted accordingly with that amount to define a barrier, except for Synthetic Indices as they support both relative and absolute barriers. Not needed for lookbacks.",
      "type": "string",
      "pattern": "^(?=.{1,20}$)[+-]?[0-9]+\\.?[0-9]*$"
    },
    "barrier2": {
      "description": "[Optional] Low barrier for the contract (for contracts with two barriers). Contracts less than 24 hours in duration would need a relative barrier (barriers which need +/-), where entry spot would be adjusted accordingly with that amount to define a barrier, except for Synthetic Indices as they support both relative and absolute barriers. Not needed for lookbacks.",
      "type": "string",
      "pattern": "^(?=.{1,20}$)[+-]?[0-9]+\\.?[0-9]*$"
    },
    "basis": {
      "description": "[Optional] Indicates type of the `amount`.",
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
      "description": "The proposed contract type",
      "type": "string",
      "enum": [
        "HIGHER",
        "LOWER",
        "MULTUP",
        "MULTDOWN",
        "UPORDOWN",
        "EXPIRYRANGE",
        "ONETOUCH",
        "CALLE",
        "ASIAND",
        "EXPIRYRANGEE",
        "DIGITDIFF",
        "DIGITMATCH",
        "DIGITOVER",
        "PUTE",
        "DIGITUNDER",
        "NOTOUCH",
        "CALL",
        "RANGE",
        "DIGITODD",
        "PUT",
        "ASIANU",
        "EXPIRYMISSE",
        "EXPIRYMISS",
        "DIGITEVEN",
        "TICKHIGH",
        "TICKLOW",
        "RESETCALL",
        "RESETPUT",
        "RUNHIGH",
        "RUNLOW",
        "ACCU",
        "VANILLALONGCALL",
        "VANILLALONGPUT",
        "TURBOSLONG",
        "TURBOSSHORT"
      ]
    },
    "currency": {
      "description": "This can only be the account-holder's currency (obtained from `payout_currencies` call).",
      "type": "string",
      "pattern": "^[a-zA-Z0-9]{2,20}$"
    },
    "date_expiry": {
      "description": "[Optional] Epoch value of the expiry time of the contract. Either date_expiry or duration is required.",
      "type": "integer",
      "maximum": 9999999999,
      "minimum": 0
    },
    "duration": {
      "description": "[Optional] Duration quantity. Either date_expiry or duration is required.",
      "type": "integer",
      "maximum": 99999999,
      "minimum": 0
    },
    "duration_unit": {
      "description": "[Optional] Duration unit - `s`: seconds, `m`: minutes, `h`: hours, `d`: days, `t`: ticks.",
      "type": "string",
      "default": "s",
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
      "description": "Add an order to close the contract once the order condition is met (only for `MULTUP` and `MULTDOWN` and 'ACCU' contracts). Supported orders: `take_profit`, `stop_loss`.",
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
      "description": "[Optional] The tick that is predicted to have the highest/lowest value - for `TICKHIGH` and `TICKLOW` contracts.",
      "type": "integer"
    },
    "subscribe": {
      "description": "[Optional] 1 - to initiate a realtime stream of prices. Note that tick trades (without a user-defined barrier), digit trades and less than 24 hours at-the-money contracts for the following underlying symbols are not streamed: `R_10`, `R_25`, `R_50`, `R_75`, `R_100`, `RDBULL`, `RDBEAR` (this is because their price is constant).",
      "type": "integer",
      "enum": [
        1
      ]
    },
    "underlying_symbol": {
      "description": "The symbol code (obtained from `active_symbols` call).",
      "type": "string",
      "pattern": "^\\w{2,30}$"
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

#### `proposal` — Optional `object`

Latest price and other details for a given contract

**Object Properties:**

  ##### `ask_price` — Required `number`

  The ask price.

  ##### `barrier_choices` — Optional `array`

  [Only for vanilla options] The choices of predefined strike price for client to choose

  ##### `barrier_spot_distance` — Optional `string`

  [Only for Turbos] The relative distance between current spot and the barrier.

  ##### `cancellation` — Optional `object`

  Contains information about contract cancellation option.

  **Object Properties:**

    ###### `ask_price` — Optional `number`

    Ask price of contract cancellation option.

    ###### `date_expiry` — Optional `integer`

    Expiry time in epoch for contract cancellation option.

  ##### `commission` — Optional `null | number`

  Commission changed in percentage (%).

  ##### `contract_details` — Optional `object`

  Contains contract information.

  **Object Properties:**

    ###### `app_markup_amount` — Optional `string`

    The markup amount charged on a client's stake amount

    ###### `barrier` — Optional `string`

    Barrier of the contract.

    Pattern: `^[+-]?[0-9]+\.?[0-9]*$`

    ###### `barrier_spot_distance` — Optional `string`

    Absolute difference between high/low barrier and spot

    Pattern: `^[+-]?[0-9]+\.?[0-9]*$`

    ###### `high_barrier` — Optional `string`

    High barrier calculated based on current spot

    Pattern: `^[+-]?[0-9]+\.?[0-9]*$`

    ###### `last_tick_epoch` — Optional `integer`

    Epoch of last tick considered for stat chart

    ###### `low_barrier` — Optional `string`

    Low barrier calculated based on current spot

    Pattern: `^[+-]?[0-9]+\.?[0-9]*$`

    ###### `maximum_payout` — Optional `number`

    Maximum payout that user can get out of a contract, contract will close automatically if payout reaches this number

    ###### `maximum_stake` — Optional `string`

    Maximum stake that user can set to buy a contract

    ###### `maximum_ticks` — Optional `integer`

    Maximum duration that a contract can last, contract will close automatically after this number of ticks

    ###### `minimum_stake` — Optional `string`

    Minimum stake that user can set to buy a contract

    ###### `tick_size_barrier` — Optional `number`

    Tick size barrier for Accumulator contracts

    ###### `tick_size_barrier_percentage` — Optional `string`

    [Accumulator] Tick size barrier in percentage, rounded off to 5 decimal places

    ###### `ticks_stayed_in` — Optional `array`

    An array of numbers  to build a stat chart - each number represents the duration that spot stayed between barries

  ##### `date_expiry` — Optional `integer`

  The end date of the contract.

  ##### `date_start` — Required `integer`

  The start date of the contract.

  ##### `display_number_of_contracts` — Optional `string`

  [Only for vanilla or turbos options] The implied number of contracts

  ##### `id` — Required `string`

  A per-connection unique identifier. Can be passed to the `forget` API call to unsubscribe.

  ##### `limit_order` — Optional `object`

  Contains limit order information. (Only applicable for contract with limit order).

  **Object Properties:**

    ###### `stop_loss` — Optional `object`

    Contains information where the contract will be closed automatically at the loss specified by the user.

    **Object Properties:**

      ###### `display_name` — Optional `string`

      Localized display name

      ###### `display_order_amount` — Optional `null | string`

      Stop loss amount for display purpose.

      ###### `order_amount` — Optional `null | number`

      Stop loss amount. Will be deprecated soon. Please use [display_order_amount].

      ###### `order_date` — Optional `integer`

      Stop loss order epoch

      ###### `value` — Optional `null | string`

      Pip-sized barrier value

    ###### `stop_out` — Optional `object`

    Contains information where the contract will be closed automatically when the value of the contract is close to zero. This is set by the us.

    **Object Properties:**

      ###### `display_name` — Optional `string`

      Localized display name

      ###### `display_order_amount` — Optional `null | string`

      Stop out amount for display purpose.

      ###### `order_amount` — Optional `null | number`

      Stop out amount. Will be deprecated soon. Please use [display_order_amount].

      ###### `order_date` — Optional `integer`

      Stop out order epoch

      ###### `value` — Optional `string`

      Pip-sized barrier value

    ###### `take_profit` — Optional `object`

    Contains information where the contract will be closed automatically at the profit specified by the user.

    **Object Properties:**

      ###### `display_name` — Optional `string`

      Localized display name

      ###### `display_order_amount` — Optional `null | string`

      Take profit amount for display purpose.

      ###### `order_amount` — Optional `null | number`

      Take profit amount. Will be deprecated soon. Please use [display_order_amount].

      ###### `order_date` — Optional `integer`

      Take profit order epoch

      ###### `value` — Optional `null | string`

      Pip-sized barrier value

  ##### `longcode` — Required `string`

  Example: Win payout if Random 100 Index is strictly higher than entry spot at 15 minutes after contract start time.

  ##### `max_stake` — Optional `number`

  [Only for vanilla or turbos options] Maximum stakes allowed

  ##### `min_stake` — Optional `number`

  [Only for vanilla or turbos options] Minimum stakes allowed

  ##### `multiplier` — Optional `number`

  [Only for lookback trades] Multiplier applies when calculating the final payoff for each type of lookback. e.g. (Exit spot - Lowest historical price) * multiplier = Payout

  ##### `payout` — Required `number`

  The payout amount of the contract.

  ##### `payout_choices` — Optional `array`

  [Only for Turbos] The choices of predefined payout per point for client to choose

  ##### `spot` — Required `number`

  Spot value (if there are no Exchange data-feed licensing restrictions for the underlying symbol).

  ##### `spot_time` — Required `integer`

  The corresponding time of the spot value.

  ##### `validation_params` — Optional `object`

  Contains contract validation information.

  **Object Properties:**

    ###### `max_payout` — Optional `string`

    [Only for Accumulators] Maximum payout for the contract.

    ###### `max_ticks` — Optional `integer`

    [Only for Accumulators] Maximum ticks for the contract.

    ###### `payout` — Optional `object`

    Contains information for minimum and maximum payout amount for the contract.

    **Object Properties:**

      ###### `max` — Optional `string`

      Maximum payout allowed

    ###### `stake` — Optional `object`

    Contains information for minimum and maximum stake amount for the contract.

    **Object Properties:**

      ###### `max` — Optional `string`

      Maximum stake allowed

      ###### `min` — Optional `string`

      Minimum stake allowed

    ###### `stop_loss` — Optional `object`

    [Only for Multipliers] Contains information for minimum and maximum stop loss amount for the contract.

    **Object Properties:**

      ###### `max` — Optional `string`

      Maximum stop loss amount

      ###### `min` — Optional `string`

      Minimum stop loss amount

    ###### `take_profit` — Optional `object`

    Contains information for minimum and maximum take profit amount for the contract.

    **Object Properties:**

      ###### `max` — Optional `string`

      Maximum take profit amount

      ###### `min` — Optional `string`

      Minimum take profit amount

#### `subscription` — Optional `object`

For subscription requests only.

**Object Properties:**

  ##### `id` — Required `string`

  A per-connection unique identifier. Can be passed to the `forget` API call to unsubscribe.

#### `echo_req` — Required `object`

Echo of the request made.

#### `msg_type` — Required `string | enum`

Action name of the request made.

Allowed values: `"proposal"`

#### `req_id` — Optional `integer`

Optional field sent in request to map to response, present only when request contains `req_id`.

```json
{
  "$schema": "http://json-schema.org/draft-04/schema#",
  "title": "Price Proposal (response)",
  "description": "Latest price and other details for a given contract",
  "type": "object",
  "required": [
    "echo_req",
    "msg_type"
  ],
  "properties": {
    "proposal": {
      "title": "proposal",
      "description": "Latest price and other details for a given contract",
      "type": "object",
      "additionalProperties": false,
      "required": [
        "ask_price",
        "date_start",
        "id",
        "longcode",
        "payout",
        "spot",
        "spot_time"
      ],
      "properties": {
        "ask_price": {
          "description": "The ask price.",
          "type": "number",
          "examples": [
            5.14
          ]
        },
        "barrier_choices": {
          "description": "[Only for vanilla options] The choices of predefined strike price for client to choose",
          "type": "array"
        },
        "barrier_spot_distance": {
          "description": "[Only for Turbos] The relative distance between current spot and the barrier.",
          "type": "string"
        },
        "cancellation": {
          "description": "Contains information about contract cancellation option.",
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "ask_price": {
              "description": "Ask price of contract cancellation option.",
              "type": "number"
            },
            "date_expiry": {
              "description": "Expiry time in epoch for contract cancellation option.",
              "type": "integer"
            }
          }
        },
        "commission": {
          "description": "Commission changed in percentage (%).",
          "type": [
            "null",
            "number"
          ]
        },
        "contract_details": {
          "description": "Contains contract information.",
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "app_markup_amount": {
              "description": "The markup amount charged on a client's stake amount",
              "type": "string"
            },
            "barrier": {
              "description": "Barrier of the contract.",
              "type": "string",
              "pattern": "^[+-]?[0-9]+\\.?[0-9]*$",
              "examples": [
                "42.123"
              ]
            },
            "barrier_spot_distance": {
              "description": "Absolute difference between high/low barrier and spot",
              "type": "string",
              "pattern": "^[+-]?[0-9]+\\.?[0-9]*$",
              "examples": [
                "2.123"
              ]
            },
            "high_barrier": {
              "description": "High barrier calculated based on current spot",
              "type": "string",
              "pattern": "^[+-]?[0-9]+\\.?[0-9]*$",
              "examples": [
                "42.123"
              ]
            },
            "last_tick_epoch": {
              "description": "Epoch of last tick considered for stat chart",
              "type": "integer"
            },
            "low_barrier": {
              "description": "Low barrier calculated based on current spot",
              "type": "string",
              "pattern": "^[+-]?[0-9]+\\.?[0-9]*$",
              "examples": [
                "42.123"
              ]
            },
            "maximum_payout": {
              "description": "Maximum payout that user can get out of a contract, contract will close automatically if payout reaches this number",
              "type": "number",
              "examples": [
                1000.59
              ]
            },
            "maximum_stake": {
              "description": "Maximum stake that user can set to buy a contract",
              "type": "string",
              "examples": [
                "1000.00"
              ]
            },
            "maximum_ticks": {
              "description": "Maximum duration that a contract can last, contract will close automatically after this number of ticks",
              "type": "integer",
              "examples": [
                500
              ]
            },
            "minimum_stake": {
              "description": "Minimum stake that user can set to buy a contract",
              "type": "string",
              "examples": [
                "1.00"
              ]
            },
            "tick_size_barrier": {
              "description": "Tick size barrier for Accumulator contracts",
              "type": "number",
              "examples": [
                0.000049358253
              ]
            },
            "tick_size_barrier_percentage": {
              "description": "[Accumulator] Tick size barrier in percentage, rounded off to 5 decimal places",
              "type": "string",
              "examples": [
                "0.00546%"
              ]
            },
            "ticks_stayed_in": {
              "description": "An array of numbers  to build a stat chart - each number represents the duration that spot stayed between barries",
              "type": "array",
              "items": {
                "type": "integer",
                "examples": [
                  50
                ]
              }
            }
          }
        },
        "date_expiry": {
          "description": "The end date of the contract.",
          "type": "integer",
          "examples": [
            1439999053
          ]
        },
        "date_start": {
          "description": "The start date of the contract.",
          "type": "integer",
          "examples": [
            1439999053
          ]
        },
        "display_number_of_contracts": {
          "description": "[Only for vanilla or turbos options] The implied number of contracts",
          "type": "string"
        },
        "id": {
          "description": "A per-connection unique identifier. Can be passed to the `forget` API call to unsubscribe.",
          "type": "string",
          "examples": [
            "c84a793b-8a87-7999-ce10-9b22f7ceead3"
          ]
        },
        "limit_order": {
          "description": "Contains limit order information. (Only applicable for contract with limit order).",
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "stop_loss": {
              "description": "Contains information where the contract will be closed automatically at the loss specified by the user.",
              "type": "object",
              "additionalProperties": false,
              "properties": {
                "display_name": {
                  "description": "Localized display name",
                  "type": "string"
                },
                "display_order_amount": {
                  "description": "Stop loss amount for display purpose.",
                  "type": [
                    "null",
                    "string"
                  ]
                },
                "order_amount": {
                  "description": "Stop loss amount. Will be deprecated soon. Please use [display_order_amount].",
                  "type": [
                    "null",
                    "number"
                  ]
                },
                "order_date": {
                  "description": "Stop loss order epoch",
                  "type": "integer"
                },
                "value": {
                  "description": "Pip-sized barrier value",
                  "type": [
                    "null",
                    "string"
                  ]
                }
              }
            },
            "stop_out": {
              "description": "Contains information where the contract will be closed automatically when the value of the contract is close to zero. This is set by the us.",
              "type": "object",
              "additionalProperties": false,
              "properties": {
                "display_name": {
                  "description": "Localized display name",
                  "type": "string"
                },
                "display_order_amount": {
                  "description": "Stop out amount for display purpose.",
                  "type": [
                    "null",
                    "string"
                  ]
                },
                "order_amount": {
                  "description": "Stop out amount. Will be deprecated soon. Please use [display_order_amount].",
                  "type": [
                    "null",
                    "number"
                  ]
                },
                "order_date": {
                  "description": "Stop out order epoch",
                  "type": "integer"
                },
                "value": {
                  "description": "Pip-sized barrier value",
                  "type": "string"
                }
              }
            },
            "take_profit": {
              "description": "Contains information where the contract will be closed automatically at the profit specified by the user.",
              "type": "object",
              "additionalProperties": false,
              "properties": {
                "display_name": {
                  "description": "Localized display name",
                  "type": "string"
                },
                "display_order_amount": {
                  "description": "Take profit amount for display purpose.",
                  "type": [
                    "null",
                    "string"
                  ]
                },
                "order_amount": {
                  "description": "Take profit amount. Will be deprecated soon. Please use [display_order_amount].",
                  "type": [
                    "null",
                    "number"
                  ]
                },
                "order_date": {
                  "description": "Take profit order epoch",
                  "type": "integer"
                },
                "value": {
                  "description": "Pip-sized barrier value",
                  "type": [
                    "null",
                    "string"
                  ]
                }
              }
            }
          }
        },
        "longcode": {
          "description": "Example: Win payout if Random 100 Index is strictly higher than entry spot at 15 minutes after contract start time.",
          "type": "string"
        },
        "max_stake": {
          "description": "[Only for vanilla or turbos options] Maximum stakes allowed",
          "type": "number"
        },
        "min_stake": {
          "description": "[Only for vanilla or turbos options] Minimum stakes allowed",
          "type": "number"
        },
        "multiplier": {
          "description": "[Only for lookback trades] Multiplier applies when calculating the final payoff for each type of lookback. e.g. (Exit spot - Lowest historical price) * multiplier = Payout",
          "type": "number"
        },
        "payout": {
          "description": "The payout amount of the contract.",
          "type": "number",
          "examples": [
            10
          ]
        },
        "payout_choices": {
          "description": "[Only for Turbos] The choices of predefined payout per point for client to choose",
          "type": "array",
          "items": {
            "type": "string"
          }
        },
        "spot": {
          "description": "Spot value (if there are no Exchange data-feed licensing restrictions for the underlying symbol).",
          "type": "number",
          "examples": [
            9874.52
          ]
        },
        "spot_time": {
          "description": "The corresponding time of the spot value.",
          "type": "integer",
          "examples": [
            1439999052
          ]
        },
        "validation_params": {
          "description": "Contains contract validation information.",
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "max_payout": {
              "description": "[Only for Accumulators] Maximum payout for the contract.",
              "type": "string",
              "examples": [
                "4000.00"
              ]
            },
            "max_ticks": {
              "description": "[Only for Accumulators] Maximum ticks for the contract.",
              "type": "integer",
              "examples": [
                75
              ]
            },
            "payout": {
              "description": "Contains information for minimum and maximum payout amount for the contract.",
              "type": "object",
              "additionalProperties": false,
              "properties": {
                "max": {
                  "description": "Maximum payout allowed",
                  "type": "string",
                  "examples": [
                    "1000.00"
                  ]
                }
              }
            },
            "stake": {
              "description": "Contains information for minimum and maximum stake amount for the contract.",
              "type": "object",
              "additionalProperties": false,
              "properties": {
                "max": {
                  "description": "Maximum stake allowed",
                  "type": "string",
                  "examples": [
                    "1000.00"
                  ]
                },
                "min": {
                  "description": "Minimum stake allowed",
                  "type": "string",
                  "examples": [
                    "0.01"
                  ]
                }
              }
            },
            "stop_loss": {
              "description": "[Only for Multipliers] Contains information for minimum and maximum stop loss amount for the contract.",
              "type": "object",
              "additionalProperties": false,
              "properties": {
                "max": {
                  "description": "Maximum stop loss amount",
                  "type": "string",
                  "examples": [
                    "1000.00"
                  ]
                },
                "min": {
                  "description": "Minimum stop loss amount",
                  "type": "string",
                  "examples": [
                    "0.51"
                  ]
                }
              }
            },
            "take_profit": {
              "description": "Contains information for minimum and maximum take profit amount for the contract.",
              "type": "object",
              "additionalProperties": false,
              "properties": {
                "max": {
                  "description": "Maximum take profit amount",
                  "type": "string",
                  "examples": [
                    "1000.00"
                  ]
                },
                "min": {
                  "description": "Minimum take profit amount",
                  "type": "string",
                  "examples": [
                    "0.10"
                  ]
                }
              }
            }
          }
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
        "proposal"
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
  "proposal": 1,
  "amount": 100,
  "barrier": "+0.1",
  "basis": "payout",
  "contract_type": "HIGHER",
  "currency": "USD",
  "duration": 60,
  "duration_unit": "s",
  "underlying_symbol": "R_100"
}
```

### Response Example

```json
{
  "proposal": {
    "ask_price": 51.02,
    "date_start": 1234567890,
    "display_value": "51.02 USD",
    "id": "uw2mk7no3oktoRVVsB4Dz7TQnFfABuFDgO95dlxfMxRuPUsz",
    "longcode": "Win payout if Volatility 100 Index...",
    "payout": 100,
    "spot": 123.45,
    "spot_time": 1234567890
  },
  "msg_type": "proposal"
}
```

## About proposal

The `proposal` endpoint get a price proposal for a specific contract.

This is a trading endpoint. Use it to get proposals, buy/sell contracts, and manage active positions. Most trading endpoints require authentication.