[Subscription Management](/docs/subscription)

# Forget All Subscriptions

No auth

Unsubscribe from all subscriptions of a specific type.

## Request & Response

## Request Schema

#### `forget_all` — Required

Cancel all streams by type. The value can be either a single type e.g. `"ticks"`, or an array of multiple types e.g. `["candles", "ticks"]`.

#### `passthrough` — Optional `object`

[Optional] Used to pass data through the websocket, which may be retrieved via the `echo_req` output field.

#### `req_id` — Optional `integer`

[Optional] Used to map request to response.

```json
{
  "$schema": "http://json-schema.org/draft-04/schema#",
  "title": "Forget All (request)",
  "description": "Immediately cancel the real-time streams of messages of given type.",
  "type": "object",
  "auth_required": 0,
  "additionalProperties": false,
  "required": [
    "forget_all"
  ],
  "properties": {
    "forget_all": {
      "description": "Cancel all streams by type. The value can be either a single type e.g. `\"ticks\"`, or an array of multiple types e.g. `[\"candles\", \"ticks\"]`.",
      "oneOf": [
        {
          "$ref": "#/definitions/stream_types"
        },
        {
          "type": "array",
          "items": {
            "$ref": "#/definitions/stream_types"
          }
        }
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
  },
  "definitions": {
    "stream_types": {
      "description": "Valid stream types that can be used to unsubscribe from.",
      "type": "string",
      "enum": [
        "balance",
        "candles",
        "cashier_payments",
        "proposal",
        "proposal_open_contract",
        "ticks",
        "transaction"
      ]
    }
  }
}
```

## Response Schema

#### `forget_all` — Optional `array`

IDs of the cancelled streams

#### `echo_req` — Required `object`

Echo of the request made.

#### `msg_type` — Required `string | enum`

Action name of the request made.

Allowed values: `"forget_all"`

#### `req_id` — Optional `integer`

Optional field sent in request to map to response, present only when request contains `req_id`.

```json
{
  "$schema": "http://json-schema.org/draft-04/schema#",
  "title": "Forget All (response)",
  "description": "The result of forget all request made.",
  "type": "object",
  "required": [
    "echo_req",
    "msg_type"
  ],
  "properties": {
    "forget_all": {
      "title": "forget_all",
      "description": "IDs of the cancelled streams",
      "type": "array"
    },
    "echo_req": {
      "description": "Echo of the request made.",
      "type": "object"
    },
    "msg_type": {
      "description": "Action name of the request made.",
      "type": "string",
      "enum": [
        "forget_all"
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
  "forget_all": "ticks"
}
```

### Response Example

```json
{
  "forget_all": ["xyz123", "abc456"],
  "msg_type": "forget_all"
}
```

##### When to use forget_all vs forget

Use `forget_all` to bulk-cancel all streams of a given type — useful when navigating away from a screen. Use `forget` with a specific ID when you only want to cancel one particular subscription and keep others of the same type running.

## About forget_all

The `forget_all` endpoint unsubscribe from all subscriptions of a specific type.

This endpoint helps manage WebSocket subscriptions. Use it to unsubscribe from real-time data streams when no longer needed.