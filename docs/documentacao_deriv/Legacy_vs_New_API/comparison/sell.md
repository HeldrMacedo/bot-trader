# Sell

Trading Auth Required

Sell an active contract before expiry to realize profit or minimize loss. The loginid parameter removed, price validation added, and response fields now guaranteed.

##### 4 Breaking Changes

The `loginid` parameter has been removed, the `price` parameter now requires minimum value of 0, and the `sell` object and its fields are now required in response.

## Quick comparison

| Aspect | Legacy API | New API | Action |
| --- | --- | --- | --- |
| Endpoint | sell | sell | None |
| Auth Required | Yes | Yes | None |
| loginid Parameter | Optional | Removed | Remove from requests |
| price Validation | No minimum | minimum: 0 | Ensure non-negative |
| Response sell Object | Optional | Required | Remove null checks |

## Breaking changes

### 1. Removed loginid parameter

The `loginid` parameter that was used for multi-account scenarios has been removed in v4. Account context must now be established through the authorization flow.

### 2. price parameter validation added

The `price` parameter now has a `minimum: 0` validation constraint. Negative values will be rejected.

**Required change:** Ensure you always pass a non-negative value for price. Use `0` for selling at market.

### 3. sell object now required in response

In legacy, the `sell` object was optional in the response. In v4, it is always present for successful sell operations.

### 4. All sell object fields now required

All 5 fields inside the `sell` object are now guaranteed to be present: `balance_after` , `contract_id` , `reference_id` , `sold_for` , and `transaction_id` .

## Request structure

Legacy API request example

JSON

```json
{
  "sell": 11542203588,
  "price": 500,
  "loginid": "CR123456"
}
```

New API request example

JSON

```json
{
  "sell": 11542203588,
  "price": 500
}
```

## Response structure

Legacy API response example

JSON

```json
{
  "sell": {
    "balance_after": 10500.50,
    "contract_id": 11542203588,
    "sold_for": 750.25
  },
  "msg_type": "sell"
}
```

New API response example

JSON

```json
{
  "sell": {
    "balance_after": 10500.50,
    "contract_id": 11542203588,
    "reference_id": 11542203587,
    "sold_for": 750.25,
    "transaction_id": 98765432
  },
  "msg_type": "sell"
}
```

## Code examples

Legacy API 
```javascript
async function sellContract(contractId, minimumPrice, loginId) {
  const request = {
    sell: contractId,
    price: minimumPrice,
    loginid: loginId
  };
  
  ws.send(JSON.stringify(request));
  
  ws.onmessage = (msg) => {
    const response = JSON.parse(msg.data);
    if (response.msg_type === "sell") {
      if (response.sell) {
        const soldFor = response.sell.sold_for ?? 0;
        console.log("Sold for: " + soldFor);
      }
    }
  };
}
```
New API
```javascript
async function sellContract(contractId, minimumPrice) {
  const request = {
    sell: contractId,
    price: minimumPrice
  };
  
  ws.send(JSON.stringify(request));
  
  ws.onmessage = (msg) => {
    const response = JSON.parse(msg.data);
    if (response.msg_type === "sell") {
      // sell object and fields guaranteed
      const { sold_for, balance_after } = response.sell;
      console.log("Sold for: " + sold_for);
    }
  };
}
```