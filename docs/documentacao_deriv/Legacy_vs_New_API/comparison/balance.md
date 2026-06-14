[Account Endpoints](/comparison/account/)

# Balance

Auth Required

Get the current account balance and optionally subscribe to real-time balance updates.

##### Critical change

New only returns the current account balance — multi-account support and `loginid` parameter removed.

## Quick Comparison

| Aspect | Legacy API | New API | Status |
| --- | --- | --- | --- |
| Endpoint | `balance` | `balance` | Unchanged |
| Auth Required | Yes | Yes | Unchanged |
| Multi-account | Supported | Not supported | Removed |

## Breaking Changes

### 1. Account parameter removed

The `account` parameter (for fetching "all" accounts, "current", or specific account ID) has been removed.

### 2. Multi-account response removed

The `accounts` object in the response that contained detailed information about all active accounts has been removed.

### 3. Total balances removed

The `total` object that provided summary totals by account type (deriv, deriv_demo, mt5, mt5_demo) has been removed.

### 4. Login ID parameter removed

The `loginid` parameter has been removed. This parameter was mandatory when multiple tokens were provided during authorization.

**Required change:** Use separate WebSocket connections or separate authorize calls for each account you need to query.

## Request Structure

Legacy API request example

JSON

```json
{
  "balance": 1,
  "account": "all",      // ❌ Removed in New
  "loginid": "CR123456", // ❌ Removed in New
  "subscribe": 1
}
```

New API request example

JSON

```json
{
  "balance": 1,
  "subscribe": 1
}
```

## Response Structure

Legacy API response example

JSON

```json
{
  "balance": {
    "balance": 10000.50,
    "currency": "USD",
    "loginid": "CR123456",
    "accounts": {  // ❌ Not in New
      "CR123456": {
        "balance": 10000.50,
        "converted_amount": 10000.50,
        "currency": "USD",
        "demo_account": 0,
        "status": 1,
        "type": "deriv"
      }
    }
  }
}
```

New API response example

JSON

```json
{
  "balance": {
    "balance": 10000.50,
    "currency": "USD",
    "loginid": "CR123456"
  },
  "msg_type": "balance"
}
```

## Code Examples

Legacy API implementation

JavaScript

```javascript
async function getCurrentBalance() {
  const request = {
    balance: 1,
    subscribe: 1
  };

  ws.send(JSON.stringify(request));

  ws.onmessage = (event) => {
    const response = JSON.parse(event.data);
    if (response.msg_type === 'balance') {
      console.log('Balance:', response.balance.balance);
      console.log('Currency:', response.balance.currency);
      console.log('Login ID:', response.balance.loginid);
      
      // Access multi-account data
      if (response.balance.accounts) {
        Object.keys(response.balance.accounts).forEach(id => {
          const acc = response.balance.accounts[id];
          console.log(`Account ${id}: ${acc.balance}`);
        });
      }
    }
  };
}
```

New API implementation

JavaScript

```javascript
async function getCurrentBalance() {
  const request = {
    balance: 1,
    subscribe: 1
  };

  ws.send(JSON.stringify(request));

  ws.onmessage = (event) => {
    const response = JSON.parse(event.data);
    if (response.msg_type === 'balance') {
      console.log('Balance:', response.balance.balance);
      console.log('Currency:', response.balance.currency);
      console.log('Login ID:', response.balance.loginid);
      
      // Multi-account data no longer available
      // Make separate calls for each account
    }
  };
}
```