# Active symbols

Data No Auth

Retrieves a list of all currently active symbols (underlying markets upon which contracts are available for trading).

##### 6 Breaking Changes

Response field names changed: `symbol` → `underlying_symbol` , and many filtering and display fields have been removed.

## Quick comparison

| Aspect | Legacy API | New API | Action |
| --- | --- | --- | --- |
| Endpoint | active_symbols | active_symbols | None |
| Auth Required | No | No | None |
| Request Complexity | 9 parameters | 4 parameters | Remove obsolete parameters |

## Breaking changes

### 1. Response field name changes

Core symbol identification and data fields have been renamed in the response:

- `symbol` → `underlying_symbol`
- `symbol_type` → `underlying_symbol_type`
- `display_name` → `underlying_symbol_name`
- `pip` → `pip_size`

### 2. Translated display name fields removed

Translated display name fields have been removed from the response:

- `market_display_name` (removed)
- `subgroup_display_name` (removed)
- `submarket_display_name` (removed)

### 3. Spot price data removed

Real-time spot price fields are no longer included:

- `spot` , `spot_age` , `spot_percentage_change` , `spot_time` (removed)

##### Alternative

Use the `ticks` endpoint to fetch real-time spot prices.

### 4. Landing company and product type filtering removed

Request parameters for filtering by landing company and product type removed:

- `landing_company` , `landing_company_short` , `product_type` , `loginid` (removed)

### 5. Barrier category filtering removed

The `barrier_category` request parameter has been removed. No longer possible to filter by: american, asian, euro_atm, euro_non_atm, non_financial, lookback, reset.

##### Required Change

If using barrier category filtering, handle filtering client-side after receiving the full symbol list, or use the `contract_type` parameter as an alternative filter.

### 6. Additional metadata fields removed

Various metadata fields no longer available:

- `allow_forward_starting` , `close_only` , `display_order` , `exchange_name` , `delay_amount` , `intraday_interval_minutes` , `quoted_currency_symbol` (removed)

## Request structure

Legacy API request example

JSON

```json
{
  "active_symbols": "brief",
  "product_type": "basic",  // ❌ Removed in New
  "landing_company_short": "svg",  // ❌ Removed in New
  "contract_type": ["CALL", "PUT"]
}
```

New API request example

JSON

```json
{
  "active_symbols": "brief",
  "contract_type": ["CALL", "PUT"]
}
```

## Response structure

Legacy API response example

JSON

```json
{
  "active_symbols": [
    {
      "allow_forward_starting": 1,  // ❌ Not in New
      "close_only": 0,
      "display_name": "EUR/USD",  // ❌ Not in New
      "display_order": 1,
      "exchange_is_open": 1,
      "is_trading_suspended": 0,
      "market": "forex",
      "market_display_name": "Forex",  // ❌ Not in New
      "pip": 0.0001,
      "spot": 1.0850,  // ❌ Not in New
      "spot_age": "2",  // ❌ Not in New
      "subgroup": "major_pairs",
      "submarket": "major_pairs",
      "symbol": "frxEURUSD",  // ❌ Changed
      "symbol_type": "forex"  // ❌ Changed
    }
  ],
  "msg_type": "active_symbols"
}
```

New API response example

JSON

```json
{
  "active_symbols": [
    {
      "exchange_is_open": 1,
      "is_trading_suspended": 0,
      "market": "forex",
      "pip_size": 0.0001,
      "subgroup": "major_pairs",
      "submarket": "major_pairs",
      "trade_count": 0,  // 🆕 New field
      "underlying_symbol": "frxEURUSD",  // 🆕 Replaces symbol
      "underlying_symbol_name": "EUR/USD",  // 🆕 Replaces display_name
      "underlying_symbol_type": "forex"  // 🆕 Replaces symbol_type
    }
  ],
  "msg_type": "active_symbols"
}
```

## Code examples

Legacy API 

```javascript
async function getActiveSymbols() {
  const request = {
    active_symbols: "brief",
    product_type: "basic",
    landing_company_short: "svg"
  };

  ws.send(JSON.stringify(request));

  ws.onmessage = (message) => {
    const data = JSON.parse(message.data);
    if (data.msg_type === "active_symbols") {
      data.active_symbols.forEach(symbol => {
        console.log(`Symbol: ${symbol.symbol}`);
        console.log(`Type: ${symbol.symbol_type}`);
        console.log(`Display: ${symbol.display_name}`);
      });
    }
  };
}
```
New API
```javascript
async function getActiveSymbols() {
  const request = {
    active_symbols: "brief"
  };

  ws.send(JSON.stringify(request));

  ws.onmessage = (message) => {
    const data = JSON.parse(message.data);
    if (data.msg_type === "active_symbols") {
      data.active_symbols.forEach(symbol => {
        console.log(`Symbol: ${symbol.underlying_symbol}`);
        console.log(`Type: ${symbol.underlying_symbol_type}`);
        // Display name no longer available
      });
    }
  };
}
```