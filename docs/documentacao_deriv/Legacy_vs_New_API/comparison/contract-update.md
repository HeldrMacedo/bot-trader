# Contract update

Trading Auth Required

Update contract parameters like take profit and stop loss. The loginid parameter removed, response object now required, and new display_order_amount field added.

##### 3 Breaking Changes

The `loginid` parameter has been removed and the `contract_update` response object is now required.

## Quick comparison

| Aspect | Legacy API | New API | Action |
| --- | --- | --- | --- |
| Endpoint | contract_update | contract_update | None |
| Auth Required | Yes | Yes | None |
| loginid Parameter | Optional | Removed | Remove from requests |
| contract_update in Response | Optional | Required | Simplify error handling |

## Breaking changes

### 1. loginid parameter removed

The `loginid` parameter has been removed in New. This parameter was previously used to specify which account to update contracts for when multiple tokens were provided during authorization.

**Required change:** Remove the `loginid` field from your contract_update requests. Account selection is now handled through the authorization token.

### 2. contract_update object now required in response

The `contract_update` object is now a required field at the root level of the response.

**Required change:** You can now rely on the `contract_update` object always being present in successful responses. Remove any conditional checks for its existence.

### 3. New display_order_amount field added

A new `display_order_amount` string field has been added to both `stop_loss` and `take_profit` objects in the response.

**Required change:** You can optionally use this new field for displaying order amounts in the UI instead of formatting the `order_amount` number yourself.

## Request structure

Legacy API request example

JSON

```json
{
  "contract_update": 1,
  "contract_id": 123456789,
  "limit_order": {
    "stop_loss": 15.00,
    "take_profit": 25.00
  },
  "loginid": "CR123456"
}
```

New API request example

JSON

```json
{
  "contract_update": 1,
  "contract_id": 123456789,
  "limit_order": {
    "stop_loss": 15.00,
    "take_profit": 25.00
  }
}
```

## Response structure

Legacy API response example

JSON

```json
{
  "contract_update": {
    "stop_loss": {
      "display_name": "Stop loss",
      "order_amount": 15.00,
      "order_date": 1234567890,
      "value": "1234.56"
    },
    "take_profit": {
      "display_name": "Take profit",
      "order_amount": 25.00,
      "order_date": 1234567890,
      "value": "1256.78"
    }
  },
  "echo_req": { "contract_update": 1, "contract_id": 123456789 },
  "msg_type": "contract_update"
}
```

New API response example

JSON

```json
{
  "contract_update": {
    "stop_loss": {
      "display_name": "Stop loss",
      "display_order_amount": "15.00 USD",
      "order_amount": 15.00,
      "order_date": 1234567890,
      "value": "1234.56"
    },
    "take_profit": {
      "display_name": "Take profit",
      "display_order_amount": "25.00 USD",
      "order_amount": 25.00,
      "order_date": 1234567890,
      "value": "1256.78"
    }
  },
  "echo_req": { "contract_update": 1, "contract_id": 123456789 },
  "msg_type": "contract_update"
}
```

## Code examples

Legacy API 

```javascript
async function updateContract(contractId, loginId = null) {
  const request = {
    contract_update: 1,
    contract_id: contractId,
    limit_order: {
      stop_loss: 15.00,
      take_profit: 25.00
    }
  };
  
  // Add loginid if provided (for multi-account)
  if (loginId) {
    request.loginid = loginId;
  }

  ws.send(JSON.stringify(request));

  ws.onmessage = (event) => {
    const response = JSON.parse(event.data);
    if (response.msg_type === "contract_update") {
      // contract_update may be undefined
      if (response.contract_update) {
        const sl = response.contract_update.stop_loss;
        const tp = response.contract_update.take_profit;
        // Format order_amount manually
        console.log("Stop Loss:", sl?.order_amount);
      }
    }
  };
}
```

New API
```javascript
async function updateContract(contractId) {
  const request = {
    contract_update: 1,
    contract_id: contractId,
    limit_order: {
      stop_loss: 15.00,
      take_profit: 25.00
    }
    // loginid removed - account selection via auth token
  };

  ws.send(JSON.stringify(request));

  ws.onmessage = (event) => {
    const response = JSON.parse(event.data);
    if (response.msg_type === "contract_update") {
      // contract_update is always present
      const sl = response.contract_update.stop_loss;
      const tp = response.contract_update.take_profit;
      // Use new display_order_amount for formatted display
      console.log("Stop Loss:", sl.display_order_amount);
    }
  };
}

```