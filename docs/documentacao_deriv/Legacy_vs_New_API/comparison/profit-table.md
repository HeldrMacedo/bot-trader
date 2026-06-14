# Profit table

Account Auth Required

Get profit and loss history. The loginid parameter removed, response fields now required, and validation relaxed.

##### 5 Breaking Changes

The `loginid` parameter has been removed, response fields are now required, and `app_id` is no longer nullable.

## Quick comparison

| Aspect | Legacy API | New API | Action |
| --- | --- | --- | --- |
| Endpoint | profit_table | profit_table | None |
| Auth Required | Yes | Yes | None |
| loginid Parameter | Supported | Removed | Remove from requests |
| Response Fields | Optional | Required | Update error handling |
| app_id Type | integer \| null | integer | Remove null checks |

## Breaking changes

### 1. loginid parameter removed

The `loginid` parameter is no longer supported in requests. Authentication is now handled via session tokens.

### 2. app_id no longer nullable

The `app_id` field in transactions changed from `integer | null` to `integer` .

### 3. Response fields now required

The `profit_table` object, `count` , and `transactions` are now required in the response.

### 4. Transaction fields now required

Transaction objects now have required fields: `buy_price` , `payout` , `purchase_time` , `sell_price` , and `transaction_id` .

### 5. Validation relaxed

Server-side validation is more lenient for `sort` , `limit` , `contract_type` , and date parameters.

**Required change:** Implement client-side validation if you were relying on the server to reject invalid values.

## Request structure

Legacy API request example

JSON

```json
{
  "profit_table": 1,
  "limit": 25,
  "sort": "ASC",
  "loginid": "CR12345"
}
```

New API request example

JSON

```json
{
  "profit_table": 1,
  "limit": 25,
  "sort": "ASC"
}
```

## Response structure

Legacy API response example

JSON

```json
{
  "profit_table": {
    "count": 100,
    "transactions": [
      {
        "app_id": null,
        "buy_price": 10.00,
        "sell_price": 15.00
      }
    ]
  },
  "msg_type": "profit_table"
}
```

New API response example

JSON

```json
{
  "profit_table": {
    "count": 100,
    "transactions": [
      {
        "app_id": 12345,
        "buy_price": 10.00,
        "sell_price": 15.00
      }
    ]
  },
  "msg_type": "profit_table"
}
```

## Code examples

Legacy API 

```javascript
async function getProfitTable() {
  const request = {
    profit_table: 1,
    limit: 25,
    loginid: "CR12345"
  };

  ws.send(JSON.stringify(request));

  ws.onmessage = (event) => {
    const response = JSON.parse(event.data);
    if (response.msg_type === 'profit_table') {
      const count = response.profit_table?.count || 0;
      console.log('Total:', count);
      
      response.profit_table?.transactions?.forEach(t => {
        const appId = t.app_id ?? 'Unknown';
      });
    }
  };
}
```

New API

```javascript
async function getProfitTable() {
  const request = {
    profit_table: 1,
    limit: 25
  };

  ws.send(JSON.stringify(request));

  ws.onmessage = (event) => {
    const response = JSON.parse(event.data);
    if (response.msg_type === 'profit_table') {
      // profit_table, count, transactions guaranteed
      console.log('Total:', response.profit_table.count);
      
      response.profit_table.transactions.forEach(t => {
        // app_id is always a number (not null)
        console.log(`App: ${t.app_id}`);
      });
    }
  };
}
```