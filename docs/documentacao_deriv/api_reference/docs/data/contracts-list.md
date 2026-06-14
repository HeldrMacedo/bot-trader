[Market Data](/docs/data)

# Contracts List

No auth

Get the list of all contract categories available for the trading platform.

## Request & Response

## Request Schema

#### `contracts_list` — Required `integer | enum`

Must be 1

Allowed values: `1`

#### `passthrough` — Optional `object`

[Optional] Used to pass data through the websocket, which may be retrieved via the `echo_req` output field.

#### `req_id` — Optional `integer`

[Optional] Used to map request to response.

```json
{
  "$schema": "http://json-schema.org/draft-04/schema#",
  "title": "Contracts List (request)",
  "description": "Get the list of all contract categories available for the trading platform.",
  "type": "object",
  "auth_required": 0,
  "additionalProperties": false,
  "required": [
    "contracts_list"
  ],
  "properties": {
    "contracts_list": {
      "description": "Must be 1",
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

#### `contracts_list` — Optional `array`

List of all available contract categories for the trading platform.

**Array Items:**

  ##### `contract_category` — Required `string`

  Internal code for the contract category.

  ##### `contract_types` — Required `array`

  List of contract type codes belonging to this category.

  ##### `display_name` — Required `string`

  Human-readable name of the contract category.

#### `echo_req` — Required `object`

Echo of the request made.

#### `msg_type` — Required `string | enum`

Action name of the request made.

Allowed values: `"contracts_list"`

#### `req_id` — Optional `integer`

Optional field sent in request to map to response, present only when request contains `req_id`.

```json
{
  "$schema": "http://json-schema.org/draft-04/schema#",
  "title": "Contracts List (response)",
  "description": "Get the list of all contract categories available for the trading platform.",
  "type": "object",
  "required": [
    "echo_req",
    "msg_type"
  ],
  "properties": {
    "contracts_list": {
      "title": "contracts_list",
      "description": "List of all available contract categories for the trading platform.",
      "type": "array",
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "contract_category",
          "contract_types",
          "display_name"
        ],
        "properties": {
          "contract_category": {
            "description": "Internal code for the contract category.",
            "type": "string",
            "examples": [
              "callput",
              "multiplier",
              "digits",
              "turbos",
              "vanilla",
              "accumulator"
            ]
          },
          "contract_types": {
            "description": "List of contract type codes belonging to this category.",
            "type": "array",
            "items": {
              "type": "string",
              "examples": [
                "CALL",
                "PUT",
                "MULTUP",
                "MULTDOWN",
                "DIGITMATCH",
                "DIGITDIFF"
              ]
            },
            "minItems": 1
          },
          "display_name": {
            "description": "Human-readable name of the contract category.",
            "type": "string",
            "examples": [
              "Up/Down",
              "Multiply Up/Multiply Down",
              "Digits",
              "Turbos Options",
              "Vanilla Options",
              "Accumulator"
            ]
          }
        }
      },
      "minItems": 1
    },
    "echo_req": {
      "description": "Echo of the request made.",
      "type": "object"
    },
    "msg_type": {
      "description": "Action name of the request made.",
      "type": "string",
      "enum": [
        "contracts_list"
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
  "contracts_list": 1
}
```

### Response Example

```json
{
  "contracts_list": [
    {
      "contract_category": "callput",
      "contract_types": ["CALL", "PUT"],
      "display_name": "Up/Down"
    }
  ],
  "msg_type": "contracts_list"
}
```

## About contracts_list

The `contracts_list` endpoint get the list of all contract categories available for the trading platform.

This is a market data endpoint. Use it to retrieve symbols, contracts, ticks, and historical data. Most data endpoints support subscriptions for real-time updates.