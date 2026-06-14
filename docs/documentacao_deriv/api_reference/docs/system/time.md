[System](/docs/system)

# Server Time

No auth

Get the current server time.

## Request & Response

## Request Schema

#### `time` — Required `integer | enum`

Must be `1`

Allowed values: `1`

#### `passthrough` — Optional `object`

[Optional] Used to pass data through the websocket, which may be retrieved via the `echo_req` output field.

#### `req_id` — Optional `integer`

[Optional] Used to map request to response.

```json
{
  "$schema": "http://json-schema.org/draft-04/schema#",
  "title": "Server Time (request)",
  "description": "Request back-end server epoch time.",
  "type": "object",
  "auth_required": 0,
  "additionalProperties": false,
  "required": [
    "time"
  ],
  "properties": {
    "time": {
      "description": "Must be `1`",
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

#### `time` — Optional `integer`

Epoch of server time.

#### `echo_req` — Required `object`

Echo of the request made.

#### `msg_type` — Required `string | enum`

Action name of the request made.

Allowed values: `"time"`

#### `req_id` — Optional `integer`

Optional field sent in request to map to response, present only when request contains `req_id`.

```json
{
  "$schema": "http://json-schema.org/draft-04/schema#",
  "title": "Server Time (response)",
  "description": "The result of server time request.",
  "type": "object",
  "required": [
    "echo_req",
    "msg_type"
  ],
  "properties": {
    "time": {
      "title": "time",
      "description": "Epoch of server time.",
      "type": "integer"
    },
    "echo_req": {
      "description": "Echo of the request made.",
      "type": "object"
    },
    "msg_type": {
      "description": "Action name of the request made.",
      "type": "string",
      "enum": [
        "time"
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
  "time": 1
}
```

### Response Example

```json
{
  "time": 1234567890,
  "msg_type": "time"
}
```

##### Clock synchronisation

The server returns Unix epoch time in seconds. Use this to calculate the offset between your local clock and the server clock — important for expiry time calculations and time-sensitive contract operations.

## About time

The `time` endpoint get the current server time.

This is a system endpoint. Use it for connectivity checks, clock synchronisation, and market schedule queries.