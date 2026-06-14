[Subscription Management](/docs/subscription)

# Forget Subscription

No auth

Unsubscribe from a specific subscription.

## Request & Response

## Request Schema

#### `forget` — Required `string`

ID of the real-time stream of messages to cancel.

Pattern: `^[\w-]{32,128}$`

#### `passthrough` — Optional `object`

[Optional] Used to pass data through the websocket, which may be retrieved via the `echo_req` output field.

#### `req_id` — Optional `integer`

[Optional] Used to map request to response.

```json
{
  "$schema": "http://json-schema.org/draft-04/schema#",
  "title": "Forget (request)",
  "description": "Immediately cancel the real-time stream of messages with a specific ID.",
  "type": "object",
  "auth_required": 0,
  "additionalProperties": false,
  "required": [
    "forget"
  ],
  "properties": {
    "forget": {
      "description": "ID of the real-time stream of messages to cancel.",
      "type": "string",
      "pattern": "^[\\w-]{32,128}$"
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

#### `forget` — Optional `integer | enum`

If set to 1, stream exited and stopped. If set to 0, stream did not exist.

Allowed values: `0`, `1`

#### `echo_req` — Required `object`

Echo of the request made.

#### `msg_type` — Required `string | enum`

Action name of the request made.

Allowed values: `"forget"`

#### `req_id` — Optional `integer`

Optional field sent in request to map to response, present only when request contains `req_id`.

```json
{
  "$schema": "http://json-schema.org/draft-04/schema#",
  "title": "Forget (response)",
  "description": "The result of forget request made.",
  "type": "object",
  "required": [
    "echo_req",
    "msg_type"
  ],
  "properties": {
    "forget": {
      "title": "forget",
      "description": "If set to 1, stream exited and stopped. If set to 0, stream did not exist.",
      "type": "integer",
      "enum": [
        0,
        1
      ]
    },
    "echo_req": {
      "description": "Echo of the request made.",
      "type": "object"
    },
    "msg_type": {
      "description": "Action name of the request made.",
      "type": "string",
      "enum": [
        "forget"
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
  "forget": "d1ee7d0d-3ca9-fbb4-720b-5312d487185b"
}
```

### Response Example

```json
{
  "forget": 1,
  "msg_type": "forget"
}
```

##### Where to get the subscription ID

The subscription ID is returned in the `subscription.id` field of any streaming response (e.g. `ticks` , `balance` , `proposal` ). A response of `1` means the stream was successfully cancelled; `0` means no stream with that ID was found.

## About forget

The `forget` endpoint unsubscribe from a specific subscription.

This endpoint helps manage WebSocket subscriptions. Use it to unsubscribe from real-time data streams when no longer needed.