[Trading Operations](/docs/trading)

# Update Contract

Auth required

Update settings for an open contract.

## Request & Response

## Request Schema

#### `contract_update` — Required `integer | enum`

Must be `1`

Allowed values: `1`

#### `contract_id` — Required `integer`

Internal unique contract identifier.

#### `limit_order` — Required `object`

Specify limit order to update.

**Object Properties:**

  ##### `stop_loss` — Optional `null | number`

  New stop loss value for a contract. To cancel, pass `null`.

  ##### `take_profit` — Optional `null | number`

  New take profit value for a contract. To cancel, pass `null`.

#### `passthrough` — Optional `object`

[Optional] Used to pass data through the websocket, which may be retrieved via the `echo_req` output field.

#### `req_id` — Optional `integer`

[Optional] Used to map request to response.

```json
{
  "$schema": "http://json-schema.org/draft-04/schema#",
  "title": "Update Contract (request)",
  "description": "Update a contract condition.",
  "type": "object",
  "auth_required": 1,
  "auth_scopes": [
    "trade"
  ],
  "additionalProperties": false,
  "required": [
    "contract_update",
    "contract_id",
    "limit_order"
  ],
  "properties": {
    "contract_update": {
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
    "limit_order": {
      "description": "Specify limit order to update.",
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "stop_loss": {
          "description": "New stop loss value for a contract. To cancel, pass `null`.",
          "type": [
            "null",
            "number"
          ]
        },
        "take_profit": {
          "description": "New take profit value for a contract. To cancel, pass `null`.",
          "type": [
            "null",
            "number"
          ]
        }
      }
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

#### `contract_update` — Optional `object`

Contains the update status of the request

**Object Properties:**

  ##### `stop_loss` — Optional `object`

  The target spot price where the contract will be closed automatically at the loss specified by the user.

  **Object Properties:**

    ###### `display_name` — Optional `string`

    Localized display name

    ###### `order_amount` — Optional `null | number`

    Stop loss amount

    ###### `order_date` — Optional `integer`

    Stop loss order epoch

    ###### `value` — Optional `null | string`

    Stop loss pip-sized barrier value

  ##### `take_profit` — Optional `object`

  The target spot price where the contract will be closed automatically at the profit specified by the user.

  **Object Properties:**

    ###### `display_name` — Optional `string`

    Localized display name

    ###### `order_amount` — Optional `null | number`

    Take profit amount

    ###### `order_date` — Optional `integer`

    Take profit order epoch

    ###### `value` — Optional `null | string`

    Take profit pip-sized barrier value

#### `echo_req` — Required `object`

Echo of the request made.

#### `msg_type` — Required `string | enum`

Action name of the request made.

Allowed values: `"contract_update"`

#### `req_id` — Optional `integer`

Optional field sent in request to map to response, present only when request contains `req_id`.

```json
{
  "$schema": "http://json-schema.org/draft-04/schema#",
  "title": "Update Contract (response)",
  "description": "Contract update status",
  "type": "object",
  "required": [
    "echo_req",
    "msg_type"
  ],
  "properties": {
    "contract_update": {
      "title": "contract_update",
      "description": "Contains the update status of the request",
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "stop_loss": {
          "description": "The target spot price where the contract will be closed automatically at the loss specified by the user.",
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "display_name": {
              "description": "Localized display name",
              "type": "string"
            },
            "order_amount": {
              "description": "Stop loss amount",
              "type": [
                "null",
                "number"
              ]
            },
            "order_date": {
              "description": "Stop loss order epoch",
              "type": "integer"
            },
            "value": {
              "description": "Stop loss pip-sized barrier value",
              "type": [
                "null",
                "string"
              ]
            }
          }
        },
        "take_profit": {
          "description": "The target spot price where the contract will be closed automatically at the profit specified by the user.",
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "display_name": {
              "description": "Localized display name",
              "type": "string"
            },
            "order_amount": {
              "description": "Take profit amount",
              "type": [
                "null",
                "number"
              ]
            },
            "order_date": {
              "description": "Take profit order epoch",
              "type": "integer"
            },
            "value": {
              "description": "Take profit pip-sized barrier value",
              "type": [
                "null",
                "string"
              ]
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
        "contract_update"
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
  "contract_update": 1,
  "contract_id": 123,
  "limit_order": {
    "take_profit": 1
  }
}
```

### Response Example

```json
{
  "contract_update": {
    "contract_id": 123,
    "limit_order": {
      "take_profit": {
        "order_amount": 1
      }
    }
  },
  "msg_type": "contract_update"
}
```

##### Authentication Required

This endpoint requires a valid session. Ensure your WebSocket connection is authenticated before calling this endpoint.

## About contract_update

The `contract_update` endpoint update settings for an open contract.

This is a trading endpoint. Use it to get proposals, buy/sell contracts, and manage active positions. Most trading endpoints require authentication.