# Proposal open contract

Trading Auth Required

Get open contract details. The loginid parameter removed, response field types changed, and several display fields removed.

##### 8 Breaking Changes

The `loginid` parameter has been removed, multiple response fields changed to `string | number` , and several display fields have been removed.

## Quick comparison

| Aspect | Legacy API | New API | Action |
| --- | --- | --- | --- |
| Endpoint | proposal_open_contract | proposal_open_contract | None |
| loginid Parameter | Optional | Removed | Remove from requests |
| Response Required Fields | echo_req only | contract_id, contract_type, currency | Update type expectations |

## Breaking changes

### 1. loginid parameter removed

The `loginid` parameter has been removed from the request schema.

### 2. Response field types changed

Several numeric fields now return `string | number` instead of just `number` :

- `bid_price` , `buy_price` , `current_spot` , `profit` : `string | number`
- `payout` : `string` (always string now)

### 3. Required fields in response

The `proposal_open_contract` response object now has required fields: `contract_id` , `contract_type` , and `currency` .

### 4. Display fields removed

Several display-specific fields have been removed: `display_value` , `exit_tick_display_value` , and `sell_spot_display_value` .

### 5. Deprecated fields

The `sell_spot` and `sell_spot_time` fields are deprecated. Migrate to `exit_spot` and `exit_spot_time` .

### 6. is_forward_starting field removed

The `is_forward_starting` boolean flag has been removed.

### 7. Snowball contract fields removed

Snowball contract-specific fields have been removed: `caution_price` , `profit_price` , `coupon_rate` , etc.

## Request structure

Legacy API request example

JSON

```json
{
  "proposal_open_contract": 1,
  "contract_id": 123456789,
  "subscribe": 1,
  "loginid": "CR90000001"
}
```

New API request example

JSON

```json
{
  "proposal_open_contract": 1,
  "contract_id": 123456789,
  "subscribe": 1
}
```

## Response structure

Legacy API response example

JSON

```json
{
  "proposal_open_contract": {
    "contract_id": 123456789,
    "buy_price": 10.50,
    "display_value": "15.50",
    "payout": 20.00,
    "sell_spot": 1.0852
  },
  "msg_type": "proposal_open_contract"
}
```

New API response example

JSON

```json
{
  "proposal_open_contract": {
    "contract_id": 123456789,
    "buy_price": "10.50",
    "payout": "20.00",
    "exit_spot": "1.0852",
    "exit_spot_time": 1446629000
  },
  "msg_type": "proposal_open_contract"
}
```

## Code examples

Legacy API

```javascript
async function getOpenContract(contractId, loginId) {
  const request = {
    proposal_open_contract: 1,
    contract_id: contractId,
    subscribe: 1,
    loginid: loginId
  };

  ws.send(JSON.stringify(request));

  ws.onmessage = (event) => {
    const response = JSON.parse(event.data);
    if (response.msg_type === "proposal_open_contract") {
      const contract = response.proposal_open_contract;
      const profit = contract.profit;
      const displayValue = contract.display_value;
    }
  };
}
```

 New API
 ```javascript
 async function getOpenContract(contractId) {
  const request = {
    proposal_open_contract: 1,
    contract_id: contractId,
    subscribe: 1
  };

  ws.send(JSON.stringify(request));

  ws.onmessage = (event) => {
    const response = JSON.parse(event.data);
    if (response.msg_type === "proposal_open_contract") {
      const contract = response.proposal_open_contract;
      const profit = Number(contract.profit);
      // display_value removed - format manually
      const displayValue = Number(contract.payout).toFixed(2);
    }
  };
}
 
 ```