# Proposal

Trading No Auth

Get contract pricing and proposals with major changes to parameter structure and response format.

##### 10 Breaking Changes

The `symbol` parameter renamed to `underlying_symbol` , multiple request parameters removed, and response fields reduced.

## Quick comparison

| Aspect | Legacy API | New API | Action |
| --- | --- | --- | --- |
| Endpoint | proposal | proposal | None |
| symbol parameter | symbol | underlying_symbol | Rename in requests |
| loginid parameter | Optional | Removed | Remove from requests |
| Response proposal object | Optional | Required | Update response handling |
| Proposal required fields | 8 fields required | Only id required | Add null checks |

## Breaking changes

### 1. Symbol parameter renamed

The `symbol` parameter has been renamed to `underlying_symbol` .

**Required change:** Update all requests to use `underlying_symbol` instead of `symbol` .

### 2. LoginID parameter removed

The `loginid` parameter used for multi-token authorization scenarios has been removed.

### 3. Multiple request parameters removed

The following parameters have been removed from the request:

- `barrier_range` , `product_type` , `date_start` , `trade_risk_profile` , `trading_period_start` (removed)

### 4. Response proposal object now required

The `proposal` object in the response is now required. Previously it was optional.

### 5. Proposal required fields reduced

The `proposal` object now only requires the `id` field. Previously, 8 fields were required.

**Required change:** Add null/undefined checks for fields other than `id` as they may not always be present.

### 6. Response field types changed

Several response fields now accept both numbers and strings: `ask_price` , `payout` , and `commission` .

**Required change:** Update parsing logic to handle both number and string values for these fields.

## Request structure

Legacy API request example

JSON

```json
{
  "proposal": 1,
  "amount": 10,
  "contract_type": "CALL",
  "currency": "USD",
  "symbol": "frxEURUSD",  // ❌ Renamed in New
  "loginid": "CR123456",  // ❌ Removed in New
  "barrier_range": "middle"  // ❌ Removed in New
}
```

New API request example

JSON

```json
{
  "proposal": 1,
  "amount": 10,
  "contract_type": "CALL",
  "currency": "USD",
  "underlying_symbol": "frxEURUSD",  // ✅ Renamed from symbol
  "subscribe": 1
}
```

## Response structure

Legacy API response example

JSON

```json
{
  "proposal": {
    "ask_price": 10.50,  // type: number
    "id": "proposal-id-123",
    "payout": 20.00,  // type: number
    "spot": 1.0850
  },
  "msg_type": "proposal"
}
```

New API response example

JSON

```json
{
  "proposal": {
    "ask_price": "10.50",  // type: number | string
    "id": "proposal-id-123",  // ✅ Only required field
    "payout": "20.00",  // type: number | string
    "spot": 1.0850
  },
  "msg_type": "proposal"
}
```

## Code examples

Legacy API 

```javascript
async function getProposal() {
  const request = {
    proposal: 1,
    amount: 10,
    contract_type: "CALL",
    currency: "USD",
    symbol: "frxEURUSD",
    loginid: "CR123456"
  };

  ws.send(JSON.stringify(request));

  ws.onmessage = (event) => {
    const response = JSON.parse(event.data);
    if (response.msg_type === "proposal") {
      console.log("Price:", response.proposal.ask_price);
    }
  };
}
```
New API

```javascript
async function getProposal() {
  const request = {
    proposal: 1,
    amount: 10,
    contract_type: "CALL",
    currency: "USD",
    underlying_symbol: "frxEURUSD"
  };

  ws.send(JSON.stringify(request));

  ws.onmessage = (event) => {
    const response = JSON.parse(event.data);
    if (response.msg_type === "proposal") {
      // Only id is guaranteed - add null checks for others
      // ask_price/payout may be string or number
      const askPrice = Number(response.proposal.ask_price);
      console.log("Price:", askPrice);
      console.log("ID:", response.proposal.id);
    }
  };
}
```