[Account Management](/docs/account)

# Balance

Auth required

Get the account's balance

## Request & Response

## Request Schema

#### `balance` — Required `integer | enum`

Must be `1`

Allowed values: `1`

#### `subscribe` — Optional `integer | enum`

[Optional] If set to 1, will send updates whenever the balance changes.

Allowed values: `0`, `1`

#### `passthrough` — Optional `object`

[Optional] Used to pass data through the websocket, which may be retrieved via the `echo_req` output field.

#### `req_id` — Optional `integer`

[Optional] Used to map request to response.

```json
{
  "$schema": "http://json-schema.org/draft-04/schema#",
  "title": "Balance (request)",
  "description": "Get the account's balance",
  "type": "object",
  "auth_required": 1,
  "auth_scopes": [
    "trade"
  ],
  "additionalProperties": false,
  "required": [
    "balance"
  ],
  "properties": {
    "balance": {
      "description": "Must be `1`",
      "type": "integer",
      "enum": [
        1
      ]
    },
    "subscribe": {
      "description": "[Optional] If set to 1, will send updates whenever the balance changes.",
      "type": "integer",
      "enum": [
        0,
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

#### `balance` — Optional `object`

Current balance of one or more accounts.

**Object Properties:**

  ##### `balance` — Required `number`

  Balance of current account.

  Min: 0

  ##### `currency` — Required `string`

  Currency of current account.

  Pattern: `^(|[a-zA-Z0-9]{2,20})$`

  ##### `id` — Optional `string`

  A per-connection unique identifier. Can be passed to the `forget` API call to unsubscribe.

  ##### `loginid` — Required `string`

  Client loginid.

  Pattern: `^[A-Z]{2,4}[0-9]{1,10}$`

#### `subscription` — Optional `object`

For subscription requests only.

**Object Properties:**

  ##### `id` — Required `string`

  A per-connection unique identifier. Can be passed to the `forget` API call to unsubscribe.

#### `echo_req` — Required `object`

Echo of the request made.

#### `msg_type` — Required `string | enum`

Action name of the request made.

Allowed values: `"balance"`

#### `req_id` — Optional `integer`

Optional field sent in request to map to response, present only when request contains `req_id`.

```json
{
  "$schema": "http://json-schema.org/draft-04/schema#",
  "title": "Balance (response)",
  "description": "Return details of user account balance",
  "type": "object",
  "required": [
    "echo_req",
    "msg_type"
  ],
  "properties": {
    "balance": {
      "title": "balance",
      "description": "Current balance of one or more accounts.",
      "type": "object",
      "additionalProperties": false,
      "required": [
        "balance",
        "currency",
        "loginid"
      ],
      "properties": {
        "balance": {
          "description": "Balance of current account.",
          "type": "number",
          "minimum": 0
        },
        "currency": {
          "description": "Currency of current account.",
          "type": "string",
          "pattern": "^(|[a-zA-Z0-9]{2,20})$",
          "examples": [
            "USD"
          ]
        },
        "id": {
          "description": "A per-connection unique identifier. Can be passed to the `forget` API call to unsubscribe.",
          "type": "string",
          "examples": [
            "c84a793b-8a87-7999-ce10-9b22f7ceead3"
          ]
        },
        "loginid": {
          "description": "Client loginid.",
          "type": "string",
          "pattern": "^[A-Z]{2,4}[0-9]{1,10}$",
          "examples": [
            "CR000000"
          ]
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
      "description": "Action name of the request made.",
      "type": "string",
      "enum": [
        "balance"
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
  "balance": 1,
  "subscribe": 1,
  "req_id": 3
}
```

### Response Example

```json
{
  "balance": {
    "balance": 10092.59,
    "currency": "USD",
    "id": "5b1f28c2-003d-0044-cc08-8b4d0a7df538",
    "loginid": "VRTC965733"
  },
  "msg_type": "balance",
  "req_id": 3
}
```

##### Subscription

When `subscribe: 1` is sent, the server will push a new balance message whenever the account balance changes. Use the `forget` API with the subscription `id` to stop receiving updates.

##### Authentication Required

This endpoint requires a valid session. Ensure your WebSocket connection is authenticated before calling this endpoint.

## About balance

The `balance` endpoint get the account's balance

This is an account management endpoint. Use it to manage authentication, balances, and account information.