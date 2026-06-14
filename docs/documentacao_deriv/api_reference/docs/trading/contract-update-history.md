[Trading Operations](/docs/trading)

# Contract Update History

Auth required

Get history of updates for a contract.

## Request & Response

## Request Schema

#### `contract_update_history` — Required `integer | enum`

Must be `1`

Allowed values: `1`

#### `contract_id` — Required `integer`

Internal unique contract identifier.

#### `limit` — Optional `number`

[Optional] Maximum number of historical updates to receive.

Min: 1 · Max: 999 · Default: `500`

#### `passthrough` — Optional `object`

[Optional] Used to pass data through the websocket, which may be retrieved via the `echo_req` output field.

#### `req_id` — Optional `integer`

[Optional] Used to map request to response.

```json
{
  "$schema": "http://json-schema.org/draft-04/schema#",
  "title": "Update Contract History (request)",
  "description": "Request for contract update history.",
  "type": "object",
  "auth_required": 1,
  "auth_scopes": [
    "trade"
  ],
  "additionalProperties": false,
  "required": [
    "contract_update_history",
    "contract_id"
  ],
  "properties": {
    "contract_update_history": {
      "description": "Must be `1`",
      "type": "integer",
      "enum": [
        1
      ]
    },
    "contract_id": {
      "description": "Internal unique contract identifier.",
      "type": "integer"
    },
    "limit": {
      "description": "[Optional] Maximum number of historical updates to receive.",
      "type": "number",
      "default": 500,
      "maximum": 999,
      "minimum": 1
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

#### `contract_update_history` — Optional `array`

Contains the historical and the most recent update status of the contract

**Array Items:**

  ##### `display_name` — Optional `string`

  Display name of the changed parameter.

  ##### `order_amount` — Optional `string`

  The amount.

  ##### `order_date` — Optional `integer`

  The epoch when the changed was done.

  ##### `order_type` — Optional `string`

  The contract parameter updated.

  ##### `value` — Optional `null | string`

  The pip-sized barrier value.

#### `echo_req` — Required `object`

Echo of the request made.

#### `msg_type` — Required `string | enum`

Action name of the request made.

Allowed values: `"contract_update_history"`

#### `req_id` — Optional `integer`

Optional field sent in request to map to response, present only when request contains `req_id`.

```json
{
  "$schema": "http://json-schema.org/draft-04/schema#",
  "title": "Update Contract History (response)",
  "description": "Contract update history status",
  "type": "object",
  "required": [
    "echo_req",
    "msg_type"
  ],
  "properties": {
    "contract_update_history": {
      "title": "contract_update_history",
      "description": "Contains the historical and the most recent update status of the contract",
      "type": "array",
      "items": {
        "description": "Contains the changed parameter.",
        "type": "object",
        "additionalProperties": false,
        "properties": {
          "display_name": {
            "description": "Display name of the changed parameter.",
            "type": "string"
          },
          "order_amount": {
            "description": "The amount.",
            "type": "string"
          },
          "order_date": {
            "description": "The epoch when the changed was done.",
            "type": "integer"
          },
          "order_type": {
            "description": "The contract parameter updated.",
            "type": "string"
          },
          "value": {
            "description": "The pip-sized barrier value.",
            "type": [
              "null",
              "string"
            ]
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
        "contract_update_history"
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
  "contract_update_history": 1,
  "contract_id": 123
}
```

### Response Example

```json
{
  "contract_update_history": [
    {
      "order_date": 1234567890,
      "order_type": "take_profit",
      "value": 1
    }
  ],
  "msg_type": "contract_update_history"
}
```

##### Authentication Required

This endpoint requires a valid session. Ensure your WebSocket connection is authenticated before calling this endpoint.

## About contract_update_history

The `contract_update_history` endpoint get history of updates for a contract.

This is a trading endpoint. Use it to get proposals, buy/sell contracts, and manage active positions. Most trading endpoints require authentication.