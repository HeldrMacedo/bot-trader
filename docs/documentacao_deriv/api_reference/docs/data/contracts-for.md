[Market Data](/docs/data)

# Contracts For Symbol

No auth

Get available contracts for a specific underlying symbol.

## Request & Response

## Request Schema

#### `contracts_for` — Required `string`

The short symbol name (obtained from `active_symbols` call).

Pattern: `^\w{2,30}$`

#### `passthrough` — Optional `object`

[Optional] Used to pass data through the websocket, which may be retrieved via the `echo_req` output field.

#### `req_id` — Optional `integer`

[Optional] Used to map request to response.

```json
{
  "$schema": "http://json-schema.org/draft-04/schema#",
  "title": "Contracts For Symbol (request)",
  "description": "For a given symbol, get the list of currently available contracts, and the latest barrier and duration limits for each contract.",
  "type": "object",
  "auth_required": 0,
  "additionalProperties": false,
  "required": [
    "contracts_for"
  ],
  "properties": {
    "contracts_for": {
      "description": "The short symbol name (obtained from `active_symbols` call).",
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

#### `contracts_for` — Optional `object`

List of available contracts. Note: if the user is authenticated, then only contracts allowed under his account will be returned.

**Object Properties:**

  ##### `available` — Required `array`

  Array of available contracts details

  **Array Items:**

    ###### `available_barriers` — Optional `array`

    Array of available barriers for a predefined trading period

    ###### `barrier` — Optional `null | string`

    Barrier Details.

    ###### `barrier_choices` — Optional `array`

    [Only for Vanilla] Barrier Choices

    ###### `barriers` — Required `number`

    Number of barriers.

    ###### `cancellation_range` — Optional `array`

    Cancellation range

    ###### `contract_category` — Required `string`

    Category of contract.

    ###### `contract_type` — Required `string`

    Type of contract.

    ###### `default_stake` — Optional `number`

    Default stake for the contract

    ###### `display_number_of_contracts` — Optional `null | number`

    [Only for Turbos] Its selected payout per point

    ###### `expired_barriers` — Optional `array`

    Array of barriers already expired

    ###### `expiry_type` — Required `string`

    Expiry Type.

    ###### `growth_rate_range` — Optional `array`

    Growth rate range.

    ###### `high_barrier` — Optional `null | string`

    High barrier Details.

    ###### `last_digit_range` — Optional `array`

    Last digit range

    ###### `low_barrier` — Optional `null | string`

    Low barrier Details.

    ###### `market` — Required `string`

    Type of market.

    ###### `max_contract_duration` — Required `string`

    Maximum contract duration

    ###### `max_stake` — Optional `null | number`

    [Only for turbos options] Maximum contract stake

    ###### `min_contract_duration` — Required `string`

    Minimum contract duration.

    ###### `min_stake` — Optional `null | number`

    [Only for turbos options] Minimum contract stake

    ###### `multiplier_range` — Optional `array`

    Multiplier range.

    ###### `payout_choices` — Optional `array`

    [Only for Turbos] Payout Choices

    ###### `payout_limit` — Optional `number`

    Maximum payout.

    ###### `sentiment` — Required `string`

    Type of sentiment.

    ###### `submarket` — Required `string`

    Type of submarket.

    ###### `underlying_symbol` — Required `string`

    Symbol code

  ##### `hit_count` — Optional `number`

  Count of contracts available

#### `echo_req` — Required `object`

Echo of the request made.

#### `msg_type` — Required `string | enum`

Action name of the request made.

Allowed values: `"contracts_for"`

#### `req_id` — Optional `integer`

Optional field sent in request to map to response, present only when request contains `req_id`.

```json
{
  "$schema": "http://json-schema.org/draft-04/schema#",
  "title": "Contracts For Symbol (response)",
  "description": "Get the list of currently available contracts",
  "type": "object",
  "required": [
    "echo_req",
    "msg_type"
  ],
  "properties": {
    "contracts_for": {
      "title": "contracts_for",
      "description": "List of available contracts. Note: if the user is authenticated, then only contracts allowed under his account will be returned.",
      "type": "object",
      "additionalProperties": false,
      "required": [
        "available"
      ],
      "properties": {
        "available": {
          "description": "Array of available contracts details",
          "type": "array",
          "items": {
            "type": "object",
            "additionalProperties": false,
            "required": [
              "barriers",
              "contract_category",
              "contract_type",
              "expiry_type",
              "market",
              "max_contract_duration",
              "min_contract_duration",
              "sentiment",
              "submarket",
              "underlying_symbol"
            ],
            "properties": {
              "available_barriers": {
                "description": "Array of available barriers for a predefined trading period",
                "type": "array",
                "minItems": 1
              },
              "barrier": {
                "description": "Barrier Details.",
                "type": [
                  "null",
                  "string"
                ]
              },
              "barrier_choices": {
                "description": "[Only for Vanilla] Barrier Choices",
                "type": "array"
              },
              "barriers": {
                "description": "Number of barriers.",
                "type": "number",
                "examples": [
                  0,
                  1,
                  2
                ]
              },
              "cancellation_range": {
                "description": "Cancellation range",
                "type": "array"
              },
              "contract_category": {
                "description": "Category of contract.",
                "type": "string",
                "examples": [
                  "asian",
                  "callput"
                ]
              },
              "contract_type": {
                "description": "Type of contract.",
                "type": "string",
                "examples": [
                  "ASIANU",
                  "CALL"
                ]
              },
              "default_stake": {
                "description": "Default stake for the contract",
                "type": "number"
              },
              "display_number_of_contracts": {
                "description": "[Only for Turbos] Its selected payout per point",
                "type": [
                  "null",
                  "number"
                ],
                "examples": [
                  0,
                  1,
                  2
                ]
              },
              "expired_barriers": {
                "description": "Array of barriers already expired",
                "type": "array"
              },
              "expiry_type": {
                "description": "Expiry Type.",
                "type": "string",
                "examples": [
                  "daily",
                  "intraday",
                  "tick"
                ]
              },
              "growth_rate_range": {
                "description": "Growth rate range.",
                "type": "array"
              },
              "high_barrier": {
                "description": "High barrier Details.",
                "type": [
                  "null",
                  "string"
                ]
              },
              "last_digit_range": {
                "description": "Last digit range",
                "type": "array"
              },
              "low_barrier": {
                "description": "Low barrier Details.",
                "type": [
                  "null",
                  "string"
                ]
              },
              "market": {
                "description": "Type of market.",
                "type": "string",
                "examples": [
                  "forex",
                  "indices",
                  "synthetic_index"
                ]
              },
              "max_contract_duration": {
                "description": "Maximum contract duration",
                "type": "string",
                "examples": [
                  "10"
                ]
              },
              "max_stake": {
                "description": "[Only for turbos options] Maximum contract stake",
                "type": [
                  "null",
                  "number"
                ]
              },
              "min_contract_duration": {
                "description": "Minimum contract duration.",
                "type": "string",
                "examples": [
                  "5"
                ]
              },
              "min_stake": {
                "description": "[Only for turbos options] Minimum contract stake",
                "type": [
                  "null",
                  "number"
                ]
              },
              "multiplier_range": {
                "description": "Multiplier range.",
                "type": "array"
              },
              "payout_choices": {
                "description": "[Only for Turbos] Payout Choices",
                "type": "array"
              },
              "payout_limit": {
                "description": "Maximum payout.",
                "type": "number",
                "examples": [
                  10000
                ]
              },
              "sentiment": {
                "description": "Type of sentiment.",
                "type": "string",
                "examples": [
                  "differ",
                  "down",
                  "match",
                  "up"
                ]
              },
              "submarket": {
                "description": "Type of submarket.",
                "type": "string",
                "examples": [
                  "major_pairs",
                  "random_index"
                ]
              },
              "underlying_symbol": {
                "description": "Symbol code",
                "type": "string",
                "examples": [
                  "R_50",
                  "frxEURUSD"
                ]
              }
            }
          },
          "minItems": 1
        },
        "hit_count": {
          "description": "Count of contracts available",
          "type": "number"
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
        "contracts_for"
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
  "contracts_for": "R_50"
}
```

### Response Example

```json
{
  "contracts_for": {
    "available": [...],
    "close": 1234567890,
    "hit_count": 30,
    "open": 1234567890,
    "spot": 123.45
  },
  "msg_type": "contracts_for"
}
```

## About contracts_for

The `contracts_for` endpoint get available contracts for a specific underlying symbol.

This is a market data endpoint. Use it to retrieve symbols, contracts, ticks, and historical data. Most data endpoints support subscriptions for real-time updates.