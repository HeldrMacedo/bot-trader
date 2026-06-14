[Market Data](/docs/data)

# Ticks Stream

No auth

Subscribe to tick stream for a specific symbol.

## Request & Response

## Request Schema

#### `ticks` — Required

The short symbol name or array of symbols (obtained from `active_symbols` call).

#### `subscribe` — Optional `integer | enum`

[Optional] If set to 1, will send updates whenever a new tick is received.

Allowed values: `1`

#### `passthrough` — Optional `object`

[Optional] Used to pass data through the websocket, which may be retrieved via the `echo_req` output field.

#### `req_id` — Optional `integer`

[Optional] Used to map request to response.

```json
{
  "$schema": "http://json-schema.org/draft-04/schema#",
  "title": "Ticks Stream (request)",
  "description": "Initiate a continuous stream of spot price updates for a given symbol.",
  "type": "object",
  "auth_required": 0,
  "additionalProperties": false,
  "required": [
    "ticks"
  ],
  "properties": {
    "ticks": {
      "description": "The short symbol name or array of symbols (obtained from `active_symbols` call).",
      "oneOf": [
        {
          "type": "string",
          "pattern": "^\\w{2,30}$"
        },
        {
          "type": "array",
          "items": {
            "type": "string",
            "pattern": "^\\w{2,30}$"
          }
        }
      ]
    },
    "subscribe": {
      "description": "[Optional] If set to 1, will send updates whenever a new tick is received.",
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

#### `tick` — Optional `object`

Tick by tick list of streamed data

**Object Properties:**

  ##### `ask` — Optional `number`

  Market ask at the epoch

  ##### `bid` — Optional `number`

  Market bid at the epoch

  ##### `epoch` — Optional `integer`

  Epoch time of the tick

  ##### `id` — Optional `string`

  A per-connection unique identifier. Can be passed to the `forget` API call to unsubscribe.

  ##### `pip_size` — Required `number`

  Indicates the number of decimal points that the returned amounts must be displayed with

  ##### `quote` — Optional `number`

  Market value at the epoch

  ##### `symbol` — Optional `string`

  Symbol

#### `subscription` — Optional `object`

For subscription requests only.

**Object Properties:**

  ##### `id` — Required `string`

  A per-connection unique identifier. Can be passed to the `forget` API call to unsubscribe.

#### `echo_req` — Required `object`

Echo of the request made.

#### `msg_type` — Required `string | enum`

Type of the response.

Allowed values: `"tick"`

#### `req_id` — Optional `integer`

Optional field sent in request to map to response, present only when request contains `req_id`.

```json
{
  "$schema": "http://json-schema.org/draft-04/schema#",
  "title": "Ticks Stream (response)",
  "description": "Latest spot price for a given symbol. Continuous responses with a frequency of up to one second.",
  "type": "object",
  "required": [
    "echo_req",
    "msg_type"
  ],
  "properties": {
    "tick": {
      "title": "TickSpotData",
      "description": "Tick by tick list of streamed data",
      "type": "object",
      "additionalProperties": false,
      "required": [
        "pip_size"
      ],
      "properties": {
        "ask": {
          "description": "Market ask at the epoch",
          "type": "number"
        },
        "bid": {
          "description": "Market bid at the epoch",
          "type": "number"
        },
        "epoch": {
          "description": "Epoch time of the tick",
          "type": "integer"
        },
        "id": {
          "description": "A per-connection unique identifier. Can be passed to the `forget` API call to unsubscribe.",
          "type": "string",
          "examples": [
            "c84a793b-8a87-7999-ce10-9b22f7ceead3"
          ]
        },
        "pip_size": {
          "description": "Indicates the number of decimal points that the returned amounts must be displayed with",
          "type": "number"
        },
        "quote": {
          "description": "Market value at the epoch",
          "type": "number"
        },
        "symbol": {
          "description": "Symbol",
          "type": "string"
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
      "description": "Type of the response.",
      "type": "string",
      "enum": [
        "tick"
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
  "ticks": "R_50",
  "subscribe": 1
}
```

### Response Example

```json
{
  "tick": {
    "ask": 123.45,
    "bid": 123.44,
    "epoch": 1234567890,
    "id": "xyz123",
    "quote": 123.445,
    "symbol": "R_50"
  },
  "msg_type": "tick",
  "subscription": {
    "id": "xyz123"
  }
}
```

## About ticks

The `ticks` endpoint subscribe to tick stream for a specific symbol.

This is a market data endpoint. Use it to retrieve symbols, contracts, ticks, and historical data. Most data endpoints support subscriptions for real-time updates.