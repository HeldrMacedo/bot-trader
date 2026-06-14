[Account Management](/docs/account)

# Transaction

Auth required

Subscribe to transaction notifications.

## Request & Response

## Request Schema

#### `transaction` — Required `integer | enum`

Must be `1`

Allowed values: `1`

#### `subscribe` — Required `integer | enum`

If set to 1, will send updates whenever there is an update to transactions. If not to 1 then it will not return any records.

Allowed values: `1`

#### `passthrough` — Optional `object`

[Optional] Used to pass data through the websocket, which may be retrieved via the `echo_req` output field.

#### `req_id` — Optional `integer`

[Optional] Used to map request to response.

```json
{
  "$schema": "http://json-schema.org/draft-04/schema#",
  "title": "Transactions Stream (request)",
  "description": "Subscribe to transaction notifications",
  "type": "object",
  "auth_required": 1,
  "auth_scopes": [
    "trade"
  ],
  "additionalProperties": false,
  "required": [
    "transaction",
    "subscribe"
  ],
  "properties": {
    "transaction": {
      "description": "Must be `1`",
      "type": "integer",
      "enum": [
        1
      ]
    },
    "subscribe": {
      "description": "If set to 1, will send updates whenever there is an update to transactions. If not to 1 then it will not return any records.",
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

#### `transaction` — Optional `object`

Realtime stream of user transaction updates.

**Object Properties:**

  ##### `action` — Optional `string | enum`

  The transaction type.

  Allowed values: `"buy"`, `"sell"`, `"deposit"`, `"withdrawal"`

  ##### `amount` — Optional `number`

  It is the amount of transaction performed.

  ##### `balance` — Optional `number`

  Balance amount

  Min: 0 · Max: 10000000000000000000

  ##### `contract_id` — Optional `integer | null`

  It is the contract ID.

  ##### `currency` — Optional `string`

  Transaction currency

  ##### `date_expiry` — Optional `integer`

  Epoch value of the expiry time of the contract. Please note that in case of buy transaction this is approximate value not exact one.

  ##### `id` — Optional `string`

  A per-connection unique identifier. Can be passed to the `forget` API call to unsubscribe.

  ##### `longcode` — Optional `string`

  Description of contract purchased

  ##### `purchase_time` — Optional `integer`

  Time at which contract was purchased, present only for sell transaction

  ##### `transaction_id` — Optional `integer`

  It is the transaction ID. Every contract (buy or sell) or payment has a unique ID.

  ##### `transaction_time` — Optional `integer`

  Time at which transaction was performed: for buy it is purchase time, for sell it is sell time.

  ##### `underlying_symbol` — Optional `string`

  Symbol code

#### `subscription` — Optional `object`

For subscription requests only.

**Object Properties:**

  ##### `id` — Required `string`

  A per-connection unique identifier. Can be passed to the `forget` API call to unsubscribe.

#### `echo_req` — Required `object`

Echo of the request made.

#### `msg_type` — Required `string | enum`

Action name of the request made.

Allowed values: `"transaction"`

#### `req_id` — Optional `integer`

Optional field sent in request to map to response, present only when request contains `req_id`.

```json
{
  "$schema": "http://json-schema.org/draft-04/schema#",
  "title": "Transactions Stream (response)",
  "description": "Return transaction updates",
  "type": "object",
  "required": [
    "echo_req",
    "msg_type"
  ],
  "properties": {
    "transaction": {
      "title": "transaction",
      "description": "Realtime stream of user transaction updates.",
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "action": {
          "description": "The transaction type.",
          "type": "string",
          "enum": [
            "buy",
            "sell",
            "deposit",
            "withdrawal"
          ]
        },
        "amount": {
          "description": "It is the amount of transaction performed.",
          "type": "number",
          "examples": [
            -83.23
          ]
        },
        "balance": {
          "description": "Balance amount",
          "type": "number",
          "maximum": 10000000000000000000,
          "minimum": 0
        },
        "contract_id": {
          "description": "It is the contract ID.",
          "type": [
            "integer",
            "null"
          ],
          "examples": [
            4867502908
          ]
        },
        "currency": {
          "description": "Transaction currency",
          "type": "string"
        },
        "date_expiry": {
          "description": "Epoch value of the expiry time of the contract. Please note that in case of buy transaction this is approximate value not exact one.",
          "type": "integer"
        },
        "id": {
          "description": "A per-connection unique identifier. Can be passed to the `forget` API call to unsubscribe.",
          "type": "string",
          "examples": [
            "c84a793b-8a87-7999-ce10-9b22f7ceead3"
          ]
        },
        "longcode": {
          "description": "Description of contract purchased",
          "type": "string"
        },
        "purchase_time": {
          "description": "Time at which contract was purchased, present only for sell transaction",
          "type": "integer"
        },
        "transaction_id": {
          "description": "It is the transaction ID. Every contract (buy or sell) or payment has a unique ID.",
          "type": "integer",
          "examples": [
            10867502908
          ]
        },
        "transaction_time": {
          "description": "Time at which transaction was performed: for buy it is purchase time, for sell it is sell time.",
          "type": "integer"
        },
        "underlying_symbol": {
          "description": "Symbol code",
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
      "description": "Action name of the request made.",
      "type": "string",
      "enum": [
        "transaction"
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
  "transaction": 1,
  "subscribe": 1
}
```

### Response Example

```json
{
  "transaction": {
    "action": "buy",
    "amount": 51.02,
    "balance": 9948.98,
    "contract_id": 11542203588,
    "currency": "USD",
    "date_expiry": 1234567950,
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "longcode": "Win payout if Volatility 100 Index is strictly higher than entry spot at 1 minute after contract start time.",
    "purchase_time": 1234567890,
    "transaction_id": 12345678,
    "transaction_time": 1234567890,
    "underlying_symbol": "R_100"
  },
  "msg_type": "transaction",
  "subscription": {
    "id": "xyz123"
  }
}
```

##### Real-time updates

This endpoint requires `subscribe: 1` — it is a streaming endpoint and won't return any data without it. Each transaction on your account triggers a new message. Use `forget` with the subscription `id` to stop receiving updates.

##### Authentication Required

This endpoint requires a valid session. Ensure your WebSocket connection is authenticated before calling this endpoint.

## About transaction

The `transaction` endpoint subscribe to transaction notifications.

This is an account management endpoint. Use it to manage authentication, balances, and account information.