# Cancel

Trading Auth Required

Cancel an active contract by providing the contract ID. The loginid parameter has been removed and response fields are now guaranteed.

##### 3 Breaking Changes

The `loginid` parameter has been removed and all response fields are now required.

## Quick comparison

| Aspect | Legacy API | New API | Action |
| --- | --- | --- | --- |
| Endpoint | cancel | cancel | None |
| Auth Required | Yes | Yes | None |
| loginid Parameter | Optional | Removed | Remove from requests |
| cancel Object in Response | Optional | Required | Simplify error handling |

## Breaking changes

### 1. Removal of loginid parameter

The `loginid` parameter is no longer supported in New. In Legacy, this parameter was used to specify which account to cancel a contract from when multiple tokens were provided during authorization.

**Required change:** Remove the `loginid` field from your cancel requests. Account selection is now handled through the authorization token.

### 2. cancel object now required in response

The `cancel` object is now a required field at the root level of the response.

**Required change:** You can now rely on the `cancel` object always being present in successful responses. Remove any conditional checks for its existence.

### 3. All response fields now required

All fields within the `cancel` response object are now required: `balance_after` , `contract_id` , `reference_id` , `sold_for` , and `transaction_id` .

**Required change:** You can simplify your response handling code by removing null/undefined checks for these fields. They are guaranteed to be present in successful responses.

## Request structure

Legacy API request example

JSON

```json
{
  "cancel": 11542203588,
  "loginid": "CR123456",  // ❌ Removed in New
  "passthrough": {
    "user_action": "manual_cancel"
  },
  "req_id": 1
}
```

New API request example

JSON

```json
{
  "cancel": 11542203588,
  "passthrough": {
    "user_action": "manual_cancel"
  },
  "req_id": 1
}
```

## Response structure

Legacy API response example

JSON

```json
{
  "cancel": {
    "balance_after": 10450.50,
    "contract_id": 11542203588,
    "reference_id": 11542203587,
    "sold_for": 23.45,
    "transaction_id": 11542203589
  },
  "echo_req": {
    "cancel": 11542203588,
    "req_id": 1
  },
  "msg_type": "cancel",
  "req_id": 1
}
```

New API response example

JSON

```json
{
  "cancel": {
    "balance_after": 10450.50,
    "contract_id": 11542203588,
    "reference_id": 11542203587,
    "sold_for": 23.45,
    "transaction_id": 11542203589
  },
  "echo_req": {
    "cancel": 11542203588,
    "req_id": 1
  },
  "msg_type": "cancel",
  "req_id": 1
}
```

## Code examples

Legacy API

```javascript
async function cancelContract(contractId, loginId = null) {
  const request = {
    cancel: contractId,
    req_id: 1
  };
  
  // Add loginid if provided (for multi-account scenarios)
  if (loginId) {
    request.loginid = loginId;
  }
  
  ws.send(JSON.stringify(request));
  
  // Handle response
  ws.onmessage = (message) => {
    const response = JSON.parse(message.data);
    if (response.msg_type === "cancel") {
      // Fields may be undefined - need null checks
      if (response.cancel) {
        const soldFor = response.cancel.sold_for ?? 0;
        const balance = response.cancel.balance_after ?? 0;
        console.log("Contract cancelled");
      }
    }
  };
}
```

NEW API
```javascript
async function cancelContract(contractId) {
  const request = {
    cancel: contractId,
    req_id: 1
  };
  // loginid removed - account selection via auth token
  
  ws.send(JSON.stringify(request));
  
  // Handle response
  ws.onmessage = (message) => {
    const response = JSON.parse(message.data);
    if (response.msg_type === "cancel") {
      // All fields guaranteed - no null checks needed
      console.log("Contract " + response.cancel.contract_id + " cancelled");
      console.log("Sold for: " + response.cancel.sold_for);
      console.log("New balance: " + response.cancel.balance_after);
    }
  };
}
```