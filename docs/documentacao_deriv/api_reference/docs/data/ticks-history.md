[Market Data](/docs/data)

# Ticks History

No auth

Get historical tick data for a symbol.

## Request & Response

## Request Schema

#### `ticks_history` — Required `string`

Short symbol name (obtained from the `active_symbols` call).

Pattern: `^\w{2,30}$`

#### `adjust_start_time` — Optional `integer | enum`

[Optional] 1 - if the market is closed at the end time, or license limit is before end time, adjust interval backwards to compensate.

Allowed values: `1`

#### `count` — Optional `integer`

[Optional] An upper limit on ticks to receive.

Default: `1000`

#### `end` — Required `string`

Epoch value representing the latest boundary of the returned ticks. If `latest` is specified, this will be the latest available timestamp.

Pattern: `^(latest|[0-9]{1,10})$`

#### `granularity` — Optional `integer | enum`

[Optional] Only applicable for style: `candles`. Candle time-dimension width setting. (default: `60`).

Allowed values: `60`, `120`, `180`, `300`, `600`, `900`, `1800`, `3600`, `7200`, `14400`, `28800`, `86400`

#### `start` — Optional `integer`

[Optional] Epoch value representing the earliest boundary of the returned ticks. 
- For `"style": "ticks"`: this will default to 1 day ago.
- For `"style": "candles"`: it will default to 1 day ago if count or granularity is undefined.

Min: 0 · Max: 9999999999

#### `style` — Optional `string | enum`

[Optional] The tick-output style.

Default: `"ticks"`

Allowed values: `"candles"`, `"ticks"`

#### `subscribe` — Optional `integer | enum`

[Optional] 1 - to send updates whenever a new tick is received.

Allowed values: `1`

#### `passthrough` — Optional `object`

[Optional] Used to pass data through the websocket, which may be retrieved via the `echo_req` output field.

#### `req_id` — Optional `integer`

[Optional] Used to map request to response.

```json

{
  "$schema": "http://json-schema.org/draft-04/schema#",
  "title": "Ticks History (request)",
  "description": "Get historic tick data for a given symbol.",
  "type": "object",
  "auth_required": 0,
  "additionalProperties": false,
  "required": [
    "ticks_history",
    "end"
  ],
  "properties": {
    "ticks_history": {
      "description": "Short symbol name (obtained from the `active_symbols` call).",
      "type": "string",
      "pattern": "^\\w{2,30}$"
    },
    "adjust_start_time": {
      "description": "[Optional] 1 - if the market is closed at the end time, or license limit is before end time, adjust interval backwards to compensate.",
      "type": "integer",
      "enum": [
        1
      ]
    },
    "count": {
      "description": "[Optional] An upper limit on ticks to receive.",
      "type": "integer",
      "default": 1000
    },
    "end": {
      "description": "Epoch value representing the latest boundary of the returned ticks. If `latest` is specified, this will be the latest available timestamp.",
      "type": "string",
      "pattern": "^(latest|[0-9]{1,10})$"
    },
    "granularity": {
      "description": "[Optional] Only applicable for style: `candles`. Candle time-dimension width setting. (default: `60`).",
      "type": "integer",
      "enum": [
        60,
        120,
        180,
        300,
        600,
        900,
        1800,
        3600,
        7200,
        14400,
        28800,
        86400
      ]
    },
    "start": {
      "description": "[Optional] Epoch value representing the earliest boundary of the returned ticks. \n- For `\"style\": \"ticks\"`: this will default to 1 day ago.\n- For `\"style\": \"candles\"`: it will default to 1 day ago if count or granularity is undefined.",
      "type": "integer",
      "maximum": 9999999999,
      "minimum": 0
    },
    "style": {
      "description": "[Optional] The tick-output style.",
      "type": "string",
      "default": "ticks",
      "enum": [
        "candles",
        "ticks"
      ]
    },
    "subscribe": {
      "description": "[Optional] 1 - to send updates whenever a new tick is received.",
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

#### `candles` — Optional `array`

Array of OHLC (open/high/low/close) price values for the given time (only for style=`candles`)

**Array Items:**

  ##### `close` — Optional `number`

  It is the close price value for the given time

  ##### `epoch` — Optional `integer`

  It is an epoch value

  ##### `high` — Optional `number`

  It is the high price value for the given time

  ##### `low` — Optional `number`

  It is the low price value for the given time

  ##### `open` — Optional `number`

  It is the open price value for the given time

#### `history` — Optional `object`

Historic tick data for a given symbol. Note: this will always return the latest possible set of ticks with accordance to the parameters specified.

**Object Properties:**

  ##### `prices` — Optional `array`

  An array containing list of tick values for the corresponding epoch values in `times` array.

  ##### `times` — Optional `array`

  An array containing list of epoch values for the corresponding tick values in `prices` array.

#### `pip_size` — Optional `number`

Indicates the number of decimal points that the returned amounts must be displayed with

#### `subscription` — Optional `object`

For subscription requests only.

**Object Properties:**

  ##### `id` — Required `string`

  A per-connection unique identifier. Can be passed to the `forget` API call to unsubscribe.

#### `echo_req` — Required `object`

Echo of the request made.

#### `msg_type` — Required `string | enum`

Type of the response according to the `style` sent in request. Would be `history` or `candles` for the first response, and `tick` or `ohlc` for the rest when subscribed.

Allowed values: `"history"`, `"tick"`, `"candles"`, `"ohlc"`

#### `req_id` — Optional `integer`

Optional field sent in request to map to response, present only when request contains `req_id`.

```json
{
  "$schema": "http://json-schema.org/draft-04/schema#",
  "title": "Ticks History (response)",
  "description": "Historic tick data for a single symbol",
  "type": "object",
  "required": [
    "echo_req",
    "msg_type"
  ],
  "properties": {
    "candles": {
      "title": "candles",
      "description": "Array of OHLC (open/high/low/close) price values for the given time (only for style=`candles`)",
      "type": "array",
      "items": {
        "type": "object",
        "additionalProperties": false,
        "properties": {
          "close": {
            "description": "It is the close price value for the given time",
            "type": "number"
          },
          "epoch": {
            "description": "It is an epoch value",
            "type": "integer"
          },
          "high": {
            "description": "It is the high price value for the given time",
            "type": "number"
          },
          "low": {
            "description": "It is the low price value for the given time",
            "type": "number"
          },
          "open": {
            "description": "It is the open price value for the given time",
            "type": "number"
          }
        }
      }
    },
    "history": {
      "title": "history",
      "description": "Historic tick data for a given symbol. Note: this will always return the latest possible set of ticks with accordance to the parameters specified.",
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "prices": {
          "description": "An array containing list of tick values for the corresponding epoch values in `times` array.",
          "type": "array",
          "items": {
            "description": "Tick value.",
            "type": "number"
          }
        },
        "times": {
          "description": "An array containing list of epoch values for the corresponding tick values in `prices` array.",
          "type": "array",
          "items": {
            "description": "Epoch of the tick.",
            "type": "integer"
          }
        }
      }
    },
    "pip_size": {
      "description": "Indicates the number of decimal points that the returned amounts must be displayed with",
      "type": "number"
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
      "description": "Type of the response according to the `style` sent in request. Would be `history` or `candles` for the first response, and `tick` or `ohlc` for the rest when subscribed.",
      "type": "string",
      "enum": [
        "history",
        "tick",
        "candles",
        "ohlc"
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
  "ticks_history": "R_50",
  "adjust_start_time": 1,
  "count": 10,
  "end": "latest",
  "start": 1,
  "style": "ticks"
}
```

### Response Example

```json
{
  "history": {
    "prices": [123.45, 123.46, ...],
    "times": [1234567890, 1234567891, ...]
  },
  "msg_type": "history"
}
```

## About ticks_history

The `ticks_history` endpoint get historical tick data for a symbol.

This is a market data endpoint. Use it to retrieve symbols, contracts, ticks, and historical data. Most data endpoints support subscriptions for real-time updates.