[System](/docs/system)

# Ping

No auth

Ping the server to check connectivity.

## Request & Response

## Request Schema

#### `ping` — Required `integer | enum`

Must be `1`

Allowed values: `1`

#### `passthrough` — Optional `object`

[Optional] Used to pass data through the websocket, which may be retrieved via the `echo_req` output field.

#### `req_id` — Optional `integer`

[Optional] Used to map request to response.

```json
{
  "$schema": "http://json-schema.org/draft-04/schema#",
  "title": "Ping (request)",
  "description": "To send the ping request to the server. Mostly used to test the connection or to keep it alive.",
  "type": "object",
  "auth_required": 0,
  "additionalProperties": false,
  "required": [
    "ping"
  ],
  "properties": {
    "ping": {
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

#### `ping` — Optional `string | enum`

Will return 'pong'

Allowed values: `"pong"`

#### `echo_req` — Required `object`

Echo of the request made.

#### `msg_type` — Required `string | enum`

Action name of the request made.

Allowed values: `"ping"`

#### `req_id` — Optional `integer`

Optional field sent in request to map to response, present only when request contains `req_id`.

```json
{
  "$schema": "http://json-schema.org/draft-04/schema#",
  "title": "Ping (response)",
  "description": "The response of ping request.",
  "type": "object",
  "required": [
    "echo_req",
    "msg_type"
  ],
  "properties": {
    "ping": {
      "title": "ping",
      "description": "Will return 'pong'",
      "type": "string",
      "enum": [
        "pong"
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
        "ping"
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
  "ping": 1
}
```

### Response Example

```json
{
  "ping": "pong",
  "msg_type": "ping"
}
```

##### Keeping connections alive

WebSocket connections may be closed by proxies or firewalls after a period of inactivity. Send a ping every 30–60 seconds to keep the connection open. You can use `req_id` to match each ping to its pong response.

## About ping

The `ping` endpoint ping the server to check connectivity.

This is a system endpoint. Use it for connectivity checks, clock synchronisation, and market schedule queries.