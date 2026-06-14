# Buy

Trading Auth Required

Purchase a contract. The loginid parameter has been removed and buy field validation relaxed.

##### 3 Breaking Changes

The `loginid` parameter has been removed. Multi-account users must update their requests.

## Quick comparison

| Aspect | Legacy API | New API | Action |
| --- | --- | --- | --- |
| Endpoint | buy | buy | None |
| Auth Required | Yes | Yes | None |
| loginid Parameter | Optional | Removed | Remove from requests |
| buy Field Pattern | Strict (32-128 chars) | Relaxed | Review validation |

## Breaking changes

### 1. loginid parameter removed

The `loginid` parameter has been removed in New. This parameter was previously used for multi-account authentication.

**Required change:** Remove the `loginid` field from your buy requests. Account selection is now handled through the authorization token.

### 2. buy field validation relaxed

The `buy` field no longer enforces the strict pattern `^(:[\w-]{32,128}|1)$` .

**Required change:** If you have client-side validation matching the legacy pattern, you may relax it.

### 3. buy object now required in response

The `buy` object is now a required field in the response.

**Required change:** Update error handling to expect the `buy` object to always be present in successful responses.

## Request structure

Legacy API request example

JSON

```json
{
  "buy": "uw2mk7no3oktoRVVsB4Dz7TQnFfAB",
  "price": 10.50,
  "loginid": "CR123456"
}
```

New API request example

JSON

```json
{
  "buy": "uw2mk7no3oktoRVVsB4Dz7TQnFfAB",
  "price": 10.50
}
```

## Response structure

Legacy API response example

JSON

```json
{
  "buy": {
    "balance_after": 9989.50,
    "buy_price": 10.50,
    "contract_id": 123456789,
    "longcode": "Win payout if Volatility 100 Index is strictly higher than entry spot at 5 minutes after contract start time.",
    "payout": 20.00,
    "purchase_time": 1234567890,
    "shortcode": "CALL_R_100_20_1234567890_1234568190_S0P_0",
    "start_time": 1234567890,
    "transaction_id": 987654321
  },
  "echo_req": { "buy": "uw2mk7no3oktoRVVsB4Dz7TQnFfAB", "price": 10.50 },
  "msg_type": "buy"
}
```

New API response example

JSON

```json
{
  "buy": {
    "balance_after": 9989.50,
    "buy_price": 10.50,
    "contract_id": 123456789,
    "longcode": "Win payout if Volatility 100 Index is strictly higher than entry spot at 5 minutes after contract start time.",
    "payout": 20.00,
    "purchase_time": 1234567890,
    "shortcode": "CALL_R_100_20_1234567890_1234568190_S0P_0",
    "start_time": 1234567890,
    "transaction_id": 987654321
  },
  "echo_req": { "buy": "uw2mk7no3oktoRVVsB4Dz7TQnFfAB", "price": 10.50 },
  "msg_type": "buy"
}
```

## Code examples

Legacy API 

```javascript
async function buyContract(proposalId, price, loginid) {
  const request = {
    buy: proposalId,
    price: price,
    // loginid used for multi-account support
    loginid: loginid
  };

  ws.send(JSON.stringify(request));

  ws.onmessage = (event) => {
    const response = JSON.parse(event.data);
    if (response.msg_type === "buy") {
      // buy object may be missing in some cases
      if (response.buy) {
        console.log("Contract ID:", response.buy.contract_id);
      }
    }
  };
}
```

New API
```javascript
async function buyContract(proposalId, price) {
  const request = {
    buy: proposalId,
    price: price
    // loginid removed - account selection via auth token
  };

  ws.send(JSON.stringify(request));

  ws.onmessage = (event) => {
    const response = JSON.parse(event.data);
    if (response.msg_type === "buy") {
      // buy object is always present in successful responses
      console.log("Contract ID:", response.buy.contract_id);
    }
  };
}
```