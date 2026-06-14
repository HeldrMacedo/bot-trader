# Contract update history

Trading Auth Required

Retrieves the historical and most recent update status of a contract, including all changes made to contract parameters such as stop loss and take profit values.

##### 3 Breaking Changes

The `loginid` parameter has been removed, the `contract_update_history` response field is now required, and response array items now have required fields.

## Quick comparison

| Aspect | Legacy API | New API | Action |
| --- | --- | --- | --- |
| Endpoint | contract_update_history | contract_update_history | None |
| Auth Required | Yes | Yes | None |
| loginid Parameter | Optional | Removed | Remove from requests |
| Response contract_update_history | Optional | Required | Update response handling |

## Breaking changes

### 1. LoginID parameter removed

The `loginid` parameter used for multi-token authorization scenarios has been removed. Account context must now be managed through the authorization flow.

### 2. Response field contract_update_history now required

The `contract_update_history` array in the response is now a required field.

**Required change:** Update response handling code. You can now rely on this field being present without null checks for the array itself.

### 3. Response array items have required fields

Each item in the `contract_update_history` array now requires four fields: `display_name` , `order_amount` , `order_date` , and `order_type` .

**Required change:** You can simplify your code by removing defensive null checks for these now-required fields.

## Request structure

Legacy API request example

JSON

```json
{
  "contract_update_history": 1,
  "contract_id": 123,
  "limit": 500,  // Optional: defaults to 500, min 1, max 999
  "loginid": "CR123456"  // ❌ Removed in New
}
```

New API request example

JSON

```json
{
  "contract_update_history": 1,
  "contract_id": 123,
  "limit": 500
}
```

## Response structure

Legacy API response example

JSON

```json
// contract_update_history: OPTIONAL
// All array item fields: OPTIONAL
{
  "contract_update_history": [
    {
      "display_name": "Stop Loss",
      "order_amount": "10.50",
      "order_date": 1699564800,
      "order_type": "stop_loss",
      "value": "1234.56"
    }
  ],
  "msg_type": "contract_update_history"
}
```

New API response example

JSON

```json
// contract_update_history: ✅ REQUIRED
// Required fields: display_name, order_amount, order_date, order_type
{
  "contract_update_history": [
    {
      "display_name": "Stop Loss",
      "order_amount": "10.50",
      "order_date": 1699564800,
      "order_type": "stop_loss",
      "value": "1234.56"
    }
  ],
  "msg_type": "contract_update_history"
}
```

## Code examples

Legacy API 

```javascript
async function getContractUpdateHistory(contractId) {
  const request = {
    contract_update_history: 1,
    contract_id: contractId,
    limit: 500,
    loginid: "CR123456"
  };
  
  ws.send(JSON.stringify(request));
  
  ws.onmessage = (event) => {
    const response = JSON.parse(event.data);
    if (response.msg_type === "contract_update_history") {
      const updates = response.contract_update_history;
      updates?.forEach(update => {
        console.log(update.display_name + ": " + update.order_amount);
      });
    }
  };
}
```
New API
```javascript
async function getContractUpdateHistory(contractId) {
  const request = {
    contract_update_history: 1,
    contract_id: contractId,
    limit: 500
  };
  
  ws.send(JSON.stringify(request));
  
  ws.onmessage = (event) => {
    const response = JSON.parse(event.data);
    if (response.msg_type === "contract_update_history") {
      const updates = response.contract_update_history;
      updates.forEach(update => {
        console.log(update.display_name + ": " + update.order_amount);
      });
    }
  };
}
```