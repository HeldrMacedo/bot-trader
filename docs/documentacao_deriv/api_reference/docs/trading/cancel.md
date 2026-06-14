[Trading Operations](/docs/trading)

# Cancel Contract

Auth required

Cancel a contract.

## Request & Response

## Request Schema

#### `cancel` — Required `integer`

Value should be the `contract_id` which received from the `portfolio` call.

#### `passthrough` — Optional `object`

[Optional] Used to pass data through the websocket, which may be retrieved via the `echo_req` output field.

#### `req_id` — Optional `integer`

[Optional] Used to map request to response.

```json

{
  "$schema": "http://json-schema.org/draft-04/schema#",
  "title": "Cancel a Contract (request)",
  "description": "Cancel contract with contract id",
  "type": "object",
  "auth_required": 1,
  "auth_scopes": [
    "trade"
  ],
  "additionalProperties": false,
  "required": [
    "cancel"
  ],
  "properties": {
    "cancel": {
      "description": "Value should be the `contract_id` which received from the `portfolio` call.",
      "type": "integer"
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

#### `cancel` — Optional `object`

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

Allowed values: `"cancel"`

#### `req_id` — Optional `integer`

Optional field sent in request to map to response, present only when request contains `req_id`.

```json
{
  "$schema": "http://json-schema.org/draft-04/schema#",
  "title": "Cancel a Contract (response)",
  "description": "A message with transaction results is received",
  "type": "object",
  "required": [
    "echo_req",
    "msg_type"
  ],
  "properties": {
    "cancel": {
      "title": "cancel",
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
        "cancel"
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
  "cancel": 11542203588
}
```

### Response Example

```json
{
  "cancel": {
    "balance_after": 10000.00,
    "contract_id": 11542203588,
    "reference_id": 12345680,
    "transaction_id": 12345680
  },
  "msg_type": "cancel"
}
```

##### Authentication Required

This endpoint requires a valid session. Ensure your WebSocket connection is authenticated before calling this endpoint.

## About cancel

The `cancel` endpoint cancel a contract.

This is a trading endpoint. Use it to get proposals, buy/sell contracts, and manage active positions. Most trading endpoints require authentication.