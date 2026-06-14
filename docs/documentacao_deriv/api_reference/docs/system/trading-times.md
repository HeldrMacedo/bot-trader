[System](/docs/system)

# Trading Times

No auth

Get trading times for all symbols.

## Request & Response

## Request Schema

#### `trading_times` — Required `string`

Date to receive market opening times for. (`yyyy-mm-dd` format. `today` can also be specified).

Pattern: `^([0-9]{4}-[0-9]{1,2}-[0-9]{1,2}|today)$`

#### `passthrough` — Optional `object`

[Optional] Used to pass data through the websocket, which may be retrieved via the `echo_req` output field.

#### `req_id` — Optional `integer`

[Optional] Used to map request to response.

```json
{
  "$schema": "http://json-schema.org/draft-04/schema#",
  "title": "Trading Times (request)",
  "description": "Receive a list of market opening times for a given date.",
  "type": "object",
  "auth_required": 0,
  "additionalProperties": false,
  "required": [
    "trading_times"
  ],
  "properties": {
    "trading_times": {
      "description": "Date to receive market opening times for. (`yyyy-mm-dd` format. `today` can also be specified).",
      "type": "string",
      "pattern": "^([0-9]{4}-[0-9]{1,2}-[0-9]{1,2}|today)$"
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

#### `trading_times` — Optional `object`

The trading times structure is a hierarchy as follows: Market -> SubMarket -> Underlyings

**Object Properties:**

  ##### `markets` — Required `array`

  An array of markets

  **Array Items:**

    ###### `name` — Required `string`

    Market name

    ###### `submarkets` — Optional `array`

    An array of submarkets

    **Array Items:**

      ###### `name` — Required `string`

      Submarket name

      ###### `symbols` — Required `array`

      Symbols array

      **Array Items:**

        ###### `events` — Optional `array`

        Events

        ###### `name` — Required `string`

        Symbol name

        ###### `times` — Optional `object`

        Open, close and settlement times

        ###### `trading_days` — Optional `array`

        Trading days

        ###### `underlying_symbol` — Required `string`

        Symbol code

#### `echo_req` — Required `object`

Echo of the request made.

#### `msg_type` — Required `string | enum`

Action name of the request made.

Allowed values: `"trading_times"`

#### `req_id` — Optional `integer`

Optional field sent in request to map to response, present only when request contains `req_id`.

```json
{
  "$schema": "http://json-schema.org/draft-04/schema#",
  "title": "Trading Times (response)",
  "description": "A message with Trading Times",
  "type": "object",
  "required": [
    "echo_req",
    "msg_type"
  ],
  "properties": {
    "trading_times": {
      "title": "trading_times",
      "description": "The trading times structure is a hierarchy as follows: Market -> SubMarket -> Underlyings",
      "type": "object",
      "additionalProperties": false,
      "required": [
        "markets"
      ],
      "properties": {
        "markets": {
          "description": "An array of markets",
          "type": "array",
          "items": {
            "type": "object",
            "additionalProperties": false,
            "required": [
              "name"
            ],
            "properties": {
              "name": {
                "description": "Market name",
                "type": "string"
              },
              "submarkets": {
                "description": "An array of submarkets",
                "type": "array",
                "items": {
                  "type": "object",
                  "additionalProperties": false,
                  "required": [
                    "name",
                    "symbols"
                  ],
                  "properties": {
                    "name": {
                      "description": "Submarket name",
                      "type": "string"
                    },
                    "symbols": {
                      "description": "Symbols array",
                      "type": "array",
                      "items": {
                        "type": "object",
                        "additionalProperties": false,
                        "required": [
                          "name",
                          "underlying_symbol"
                        ],
                        "properties": {
                          "events": {
                            "description": "Events",
                            "type": "array"
                          },
                          "name": {
                            "description": "Symbol name",
                            "type": "string"
                          },
                          "times": {
                            "description": "Open, close and settlement times",
                            "type": "object"
                          },
                          "trading_days": {
                            "description": "Trading days",
                            "type": "array",
                            "items": {
                              "type": "string",
                              "enum": [
                                "Sun",
                                "Mon",
                                "Tue",
                                "Wed",
                                "Thu",
                                "Fri",
                                "Sat"
                              ]
                            }
                          },
                          "underlying_symbol": {
                            "description": "Symbol code",
                            "type": "string"
                          }
                        }
                      }
                    }
                  }
                }
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
        "trading_times"
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
  "trading_times": "2015-09-14"
}
```

### Response Example

```json
{
  "trading_times": {
    "markets": [...]
  },
  "msg_type": "trading_times"
}
```

##### Response structure

The response is hierarchical: each market contains submarkets, and each submarket contains symbol entries with their open/close `times` , active `trading_days` , and any special `events` . Use this to show users when specific markets or instruments are available for trading.

## About trading_times

The `trading_times` endpoint get trading times for all symbols.

This is a system endpoint. Use it for connectivity checks, clock synchronisation, and market schedule queries.