# Statement

Account Auth Required

Get account statement showing transactions. The `loginid` parameter removed, transfer-related fields removed, and `action_type` validation relaxed.

##### 7 Breaking Changes

The `loginid` parameter has been removed. Transfer-related response fields ( `app_id` , `fees` , `from` , `to` , `withdrawal_details` ) are no longer available.

## Quick comparison

| Aspect | Legacy API | New API | Action |
| --- | --- | --- | --- |
| Endpoint | statement | statement | None |
| Auth Required | Yes | Yes | None |
| loginid param | Supported | Removed | Remove from requests |
| Transfer fields | fees, from, to | Removed | Update response handling |
| Response fields | Optional | Required | Simplify null checks |

## Breaking changes

### 1. loginid parameter removed

The `loginid` parameter used for multi-token authorization has been removed from the request.

**Required change:** Remove `loginid` from your request payloads. Authenticate with the specific account token instead.

### 2. Transfer-related fields removed

The following fields are no longer returned in transaction objects:

- `app_id` , `fees` , `from` , `to` , `withdrawal_details` (removed)

### 3. action_type enum validation removed

The `action_type` parameter no longer validates against a fixed enum. The new API accepts any string value.

### 4. Response fields now required

The response now guarantees certain fields: `statement.count` , `statement.transactions` , and for each transaction: `action_type` , `amount` , `balance_after` , `transaction_id` , and `transaction_time` .

## Request structure

Legacy API request example

JSON

```json
{
  "statement": 1,
  "action_type": "buy",
  "limit": 25,
  "loginid": "CR123456"
}
```

New API request example

JSON

```json
{
  "statement": 1,
  "action_type": "buy",
  "limit": 25
}
```

## Response structure

Legacy API response example

JSON

```json
{
  "statement": {
    "count": 100,
    "transactions": [
      {
        "action_type": "buy",
        "amount": -10.50,
        "app_id": 1234,
        "fees": { "amount": 0.5 }
      }
    ]
  },
  "msg_type": "statement"
}
```

New API response example

JSON

```json
{
  "statement": {
    "count": 100,
    "transactions": [
      {
        "action_type": "buy",
        "amount": -10.50,
        "balance_after": 989.50,
        "transaction_id": 987654321,
        "transaction_time": 1234567890
      }
    ]
  },
  "msg_type": "statement"
}
```

## Code examples

Legacy API 

```javascript
async function getStatement(loginid) {
  const request = {
    statement: 1,
    loginid: loginid
  };

  ws.send(JSON.stringify(request));

  ws.onmessage = (event) => {
    const response = JSON.parse(event.data);
    if (response.msg_type === 'statement') {
      response.statement.transactions.forEach(t => {
        if (t.fees) console.log('Fee:', t.fees.amount);
      });
    }
  };
}
```
New API
```javascript
async function getStatement() {
  const request = {
    statement: 1
  };

  ws.send(JSON.stringify(request));

  ws.onmessage = (event) => {
    const response = JSON.parse(event.data);
    if (response.msg_type === 'statement') {
      // count and transactions guaranteed
      console.log('Total:', response.statement.count);
      response.statement.transactions.forEach(t => {
        console.log(`${t.action_type}: ${t.amount}`);
      });
    }
  };
}
```