[Trading Operations](/docs/trading)

# Sell Contract

Auth required

Sell an open contract before expiry.

## Request & Response

## Request Schema

#### `sell` — Required `integer`

Pass contract_id received from the `portfolio` call.

#### `price` — Required `number`

Minimum price at which to sell the contract, or `0` for 'sell at market'.

#### `passthrough` — Optional `object`

[Optional] Used to pass data through the websocket, which may be retrieved via the `echo_req` output field.

#### `req_id` — Optional `integer`

[Optional] Used to map request to response.

```json
{
  "$schema": "http://json-schema.org/draft-04/schema#",
  "title": "Sell Contract (request)",
  "description": "Sell a Contract as identified by the `contract_id`.",
  "type": "object",
  "auth_required": 1,
  "auth_scopes": [
    "trade"
  ],
  "additionalProperties": false,
  "required": [
    "sell",
    "price"
  ],
  "properties": {
    "sell": {
      "description": "Pass contract_id received from the `portfolio` call.",
      "type": "integer"
    },
    "price": {
      "description": "Minimum price at which to sell the contract, or `0` for 'sell at market'.",
      "type": "number"
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

#### `sell` — Optional `object`

Receipt for the transaction

**Object Properties:**

  ##### `balance_after` — Optional `number`

  New account balance after completion of the sale

  ##### `contract_id` — Optional `integer`

  Internal contract identifier for the sold contract

  ##### `reference_id` — Optional `integer`

  Internal transaction identifier for the corresponding buy transaction

  ##### `sold_for` — Optional `number`

  Actual effected sale price

  ##### `transaction_id` — Optional `integer`

  Internal transaction identifier for the sale transaction

#### `echo_req` — Required `object`

Echo of the request made.

#### `msg_type` — Required `string | enum`

Action name of the request made.

Allowed values: `"sell"`

#### `req_id` — Optional `integer`

Optional field sent in request to map to response, present only when request contains `req_id`.

```json
{
  "$schema": "http://json-schema.org/draft-04/schema#",
  "title": "Sell Contract (response)",
  "description": "A message with transaction results is received",
  "type": "object",
  "required": [
    "echo_req",
    "msg_type"
  ],
  "properties": {
    "sell": {
      "title": "sell",
      "description": "Receipt for the transaction",
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "balance_after": {
          "description": "New account balance after completion of the sale",
          "type": "number"
        },
        "contract_id": {
          "description": "Internal contract identifier for the sold contract",
          "type": "integer"
        },
        "reference_id": {
          "description": "Internal transaction identifier for the corresponding buy transaction",
          "type": "integer"
        },
        "sold_for": {
          "description": "Actual effected sale price",
          "type": "number"
        },
        "transaction_id": {
          "description": "Internal transaction identifier for the sale transaction",
          "type": "integer"
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
        "sell"
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
  "sell": 11542203588,
  "price": 500
}
```

### Response Example

```json
{
  "sell": {
    "balance_after": 10500.00,
    "contract_id": 11542203588,
    "reference_id": 12345679,
    "sold_for": 50.00,
    "transaction_id": 12345679
  },
  "msg_type": "sell"
}
```

##### Authentication Required

This endpoint requires a valid session. Ensure your WebSocket connection is authenticated before calling this endpoint.

## About sell

The `sell` endpoint sell an open contract before expiry.

This is a trading endpoint. Use it to get proposals, buy/sell contracts, and manage active positions. Most trading endpoints require authentication.