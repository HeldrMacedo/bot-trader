# Transaction

Account Auth Required

Subscribe to real-time transaction notifications for user account activity including buys, sells, deposits, withdrawals, and other financial transactions.

##### 7 Breaking Changes

Several contract-related fields have been removed, symbol field renamed, and `action` enum validation removed in New.

## Quick comparison

| Aspect | Legacy API | New API | Action |
| --- | --- | --- | --- |
| Endpoint | transaction | transaction | None |
| Auth Required | Yes | Yes | None |
| Symbol Field | symbol | underlying_symbol | Update field references |
| Barrier Fields | Supported | Removed | Remove field usage |

## Breaking changes

### 1. Subscribe parameter value change

Legacy only accepts `subscribe: 1` , while New accepts both `0` and `1` .

### 2. LoginId parameter removed

The optional `loginid` parameter has been removed in New.

### 3. Contract barrier fields removed

Response fields `barrier` , `high_barrier` , and `low_barrier` have been removed.

### 4. Display name field removed

The `display_name` field has been removed from the response in New.

### 5. Stop loss/take profit fields removed

Response fields `stop_loss` , `stop_out` , and `take_profit` have been removed.

### 6. Symbol field renamed

The `symbol` field has been replaced with `underlying_symbol` in New.

### 7. action enum validation removed

The `action` field in the response no longer validates against a fixed enum. New accepts any string value.

## Request structure

Legacy API request example

JSON

```json
{
  "transaction": 1,
  "subscribe": 1,
  "loginid": "CR90000001"
}
```

New API request example

JSON

```json
{
  "transaction": 1,
  "subscribe": 1
}
```

## Response structure

Legacy API response example

JSON

```json
{
  "transaction": {
    "action": "buy",
    "amount": -83.23,
    "symbol": "R_100",  // ❌ Removed
    "display_name": "Volatility 100 Index",  // ❌ Removed
    "barrier": "100.50"  // ❌ Removed
  },
  "msg_type": "transaction"
}
```

New API response example

JSON

```json
{
  "transaction": {
    "action": "buy",
    "amount": -83.23,
    "underlying_symbol": "R_100",  // 🆕 Renamed
    "transaction_id": 10867502908,
    "transaction_time": 1699564500
  },
  "msg_type": "transaction"
}
```

## Code examples

Legacy API 

```javascript
async function subscribeToTransactions() {
  const request = {
    transaction: 1,
    subscribe: 1,
    loginid: "CR90000001"
  };
  
  ws.send(JSON.stringify(request));

  ws.onmessage = (msg) => {
    const response = JSON.parse(msg.data);
    if (response.msg_type === 'transaction') {
      const txn = response.transaction;
      console.log('Symbol:', txn.symbol);
      if (txn.barrier) console.log('Barrier:', txn.barrier);
    }
  };
}
```
NEW API
```javascript
async function subscribeToTransactions() {
  const request = {
    transaction: 1,
    subscribe: 1
  };
  
  ws.send(JSON.stringify(request));

  ws.onmessage = (msg) => {
    const response = JSON.parse(msg.data);
    if (response.msg_type === 'transaction') {
      const txn = response.transaction;
      console.log('Symbol:', txn.underlying_symbol);
      // barrier info no longer available
    }
  };
}
```