# Portfolio

Account Auth Required

Retrieve information about the current portfolio of outstanding options, including all open positions for the authenticated account.

##### 3 Breaking Changes

The `symbol` field renamed to `underlying_symbol` , `loginid` parameter removed, and `app_id` can no longer be null.

## Quick comparison

| Aspect | Legacy API | New API | Action |
| --- | --- | --- | --- |
| Endpoint | portfolio | portfolio | None |
| Auth Required | Yes | Yes | None |
| Symbol Field | symbol | underlying_symbol | Update field references |
| loginid Parameter | Optional | Removed | Remove from requests |
| app_id Field | integer \| null | integer only | Update null handling |

## Breaking changes

### 1. Symbol field renamed

The `symbol` field in each contract object has been renamed to `underlying_symbol` .

### 2. LoginId parameter removed

The `loginid` parameter has been removed from the request structure. Account context must now be managed through the authorization flow.

### 3. app_id field can no longer be null

The `app_id` field in each contract object can no longer be `null` .

**Required change:** If your code handles null app_id values, update your logic to expect an integer value only.

## Request structure

Legacy API request example

JSON

```json
{
  "portfolio": 1,
  "contract_type": ["CALL", "PUT"],
  "loginid": "CR1234567"  // ❌ Removed in New
}
```

New API request example

JSON

```json
{
  "portfolio": 1,
  "contract_type": ["CALL", "PUT"]
}
```

## Response structure

Legacy API response example

JSON

```json
{
  "portfolio": {
    "contracts": [
      {
        "app_id": null,
        "contract_id": 123456789,
        "symbol": "R_100"  // ❌ Renamed in New
      }
    ]
  },
  "msg_type": "portfolio"
}
```

New API response example

JSON

```json
{
  "portfolio": {
    "contracts": [
      {
        "app_id": 12345,
        "contract_id": 123456789,
        "underlying_symbol": "R_100"  // 🆕 Renamed from symbol
      }
    ]
  },
  "msg_type": "portfolio"
}
```

## Code examples

Legacy API 

```javascript
async function getPortfolio() {
  const request = {
    portfolio: 1
  };
  
  ws.send(JSON.stringify(request));

  ws.onmessage = (event) => {
    const response = JSON.parse(event.data);
    if (response.msg_type === "portfolio") {
      const contracts = response.portfolio.contracts;
      contracts.forEach(contract => {
        console.log(`Symbol: ${contract.symbol}`);
      });
    }
  };
}
```

New API
```javascript
async function getPortfolio() {
  const request = {
    portfolio: 1
  };
  
  ws.send(JSON.stringify(request));

  ws.onmessage = (event) => {
    const response = JSON.parse(event.data);
    if (response.msg_type === "portfolio") {
      const contracts = response.portfolio.contracts;
      contracts.forEach(contract => {
        console.log(`Symbol: ${contract.underlying_symbol}`);
      });
    }
  };
}
```