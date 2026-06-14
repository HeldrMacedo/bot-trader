[Market Data](/docs/data)

# Active Symbols

No auth

Retrieve a list of all currently active symbols (underlying markets upon which contracts are available for trading).

## Request & Response

## Request Schema

#### `active_symbols` — Required `string | enum`

If you use `brief`, only a subset of fields will be returned.

Allowed values: `"full"`, `"brief"`

#### `contract_type` — Optional `array`

[Optional] The proposed contract type

#### `passthrough` — Optional `object`

[Optional] Used to pass data through the websocket, which may be retrieved via the `echo_req` output field.

#### `req_id` — Optional `integer`

[Optional] Used to map request to response.

```json
{
  "$schema": "http://json-schema.org/draft-04/schema#",
  "title": "Active Symbols (request)",
  "description": "Retrieve a list of all currently active symbols (underlying markets upon which contracts are available for trading).",
  "type": "object",
  "auth_required": 0,
  "additionalProperties": false,
  "required": [
    "active_symbols"
  ],
  "properties": {
    "active_symbols": {
      "description": "If you use `brief`, only a subset of fields will be returned.",
      "type": "string",
      "enum": [
        "full",
        "brief"
      ]
    },
    "contract_type": {
      "description": "[Optional] The proposed contract type",
      "type": "array",
      "items": {
        "description": "",
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

#### `active_symbols` — Optional `array`

List of active symbols.

**Array Items:**

  ##### `exchange_is_open` — Required `integer | enum`

  `1` if market is currently open, `0` if closed.

  Allowed values: `0`, `1`

  ##### `is_trading_suspended` — Required `integer | enum`

  `1` indicates that trading is currently suspended, `0` if not.

  Allowed values: `0`, `1`

  ##### `market` — Required `string`

  Market category (forex, indices, etc).

  ##### `pip_size` — Required `number`

  Pip size (i.e. minimum fluctuation amount).

  ##### `subgroup` — Required `string`

  Subgroup name.

  ##### `submarket` — Required `string`

  Submarket name.

  ##### `trade_count` — Required `integer`

  Trade count.

  ##### `underlying_symbol` — Required `string`

  The symbol code for this underlying.

  ##### `underlying_symbol_name` — Required `string`

  Symbol display name.

  ##### `underlying_symbol_type` — Required `string`

  Symbol type (forex, commodities, etc).

#### `echo_req` — Required `object`

Echo of the request made.

#### `msg_type` — Required `string | enum`

Action name of the request made.

Allowed values: `"active_symbols"`

#### `req_id` — Optional `integer`

Optional field sent in request to map to response, present only when request contains `req_id`.

```json
{
  "$schema": "http://json-schema.org/draft-04/schema#",
  "title": "Active Symbols (response)",
  "description": "A message containing the list of active symbols.",
  "type": "object",
  "required": [
    "echo_req",
    "msg_type"
  ],
  "properties": {
    "active_symbols": {
      "title": "active_symbols",
      "description": "List of active symbols.",
      "type": "array",
      "items": {
        "description": "The information about each symbol.",
        "type": "object",
        "additionalProperties": false,
        "required": [
          "exchange_is_open",
          "is_trading_suspended",
          "market",
          "pip_size",
          "subgroup",
          "submarket",
          "trade_count",
          "underlying_symbol",
          "underlying_symbol_name",
          "underlying_symbol_type"
        ],
        "properties": {
          "exchange_is_open": {
            "description": "`1` if market is currently open, `0` if closed.",
            "type": "integer",
            "enum": [
              0,
              1
            ]
          },
          "is_trading_suspended": {
            "description": "`1` indicates that trading is currently suspended, `0` if not.",
            "type": "integer",
            "enum": [
              0,
              1
            ]
          },
          "market": {
            "description": "Market category (forex, indices, etc).",
            "type": "string"
          },
          "pip_size": {
            "description": "Pip size (i.e. minimum fluctuation amount).",
            "type": "number"
          },
          "subgroup": {
            "description": "Subgroup name.",
            "type": "string"
          },
          "submarket": {
            "description": "Submarket name.",
            "type": "string"
          },
          "trade_count": {
            "description": "Trade count.",
            "type": "integer"
          },
          "underlying_symbol": {
            "description": "The symbol code for this underlying.",
            "type": "string"
          },
          "underlying_symbol_name": {
            "description": "Symbol display name.",
            "type": "string"
          },
          "underlying_symbol_type": {
            "description": "Symbol type (forex, commodities, etc).",
            "type": "string"
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
        "active_symbols"
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
  "active_symbols": "brief"
}
```

### Response Example

```json
{
  "active_symbols": [
    {
      "exchange_is_open": 1,
      "is_trading_suspended": 0,
      "market": "synthetic_index",
      "pip_size": 0.01,
      "subgroup": "synthetics",
      "submarket": "random_index",
      "trade_count": 0,
      "underlying_symbol": "1HZ100V",
      "underlying_symbol_name": "Volatility 100 Index",
      "underlying_symbol_type": "stockindex"
    }
  ],
  "msg_type": "active_symbols"
}
```

## About active_symbols

The `active_symbols` endpoint retrieve a list of all currently active symbols (underlying markets upon which contracts are available for trading).

This is a market data endpoint. Use it to retrieve symbols, contracts, ticks, and historical data. Most data endpoints support subscriptions for real-time updates.