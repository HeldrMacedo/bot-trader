# Contracts for

Data No Auth

Get available contracts for a symbol. Request parameters reduced, market data removed from response, and several contract metadata fields removed.

##### 5 Breaking Changes

The `currency` request parameter has been removed, market data fields removed from response, and required fields `barrier_category` and `start_type` removed from contract items.

## Quick comparison

| Aspect | Legacy API | New API | Action |
| --- | --- | --- | --- |
| Endpoint | contracts_for | contracts_for | None |
| Auth Required | No | No | None |
| Request Complexity | 8 parameters | 3 parameters | Remove filtering parameters |
| Response Structure | Nested with market data | Simplified | Update response parsing |

## Breaking changes

### 1. Request parameters removed

Multiple filtering parameters have been removed from the request:

- `currency` (removed) - Currency filtering no longer supported in request
- `landing_company` , `landing_company_short` , `product_type` , `loginid` (removed)

##### Currency Handling Changed

Contract pricing currency is now determined by the authenticated user's account currency, not by a request parameter.

### 2. Market data fields removed from response

Market timing and spot price fields removed from the `contracts_for` object:

- `spot` , `open` , `close` , `feed_license` , `non_available` (removed)

##### Alternatives

Use the `ticks` endpoint for spot prices and `trading_times` for market hours.

### 3. Display fields removed from contract items

Display-specific fields removed from contract item objects:

- `contract_display` (e.g., "Higher", "Lower")
- `contract_category_display` (e.g., "Up/Down", "Asians")

### 4. Contract metadata fields removed

Several contract metadata fields removed from contract item objects:

- `barrier_category` , `start_type` (removed) - Was required in Legacy
- `forward_starting_options` , `trading_period` (removed)

### 5. Specialized contract options removed

Specialized configuration fields for certain contract types removed:

- `duration_choices` , `trade_risk_profile_choices` (removed) - Snowball contract options

## Request structure

Legacy API request example

JSON

```json
{
  "contracts_for": "frxEURUSD",
  "currency": "USD",  // ❌ Removed in New
  "landing_company_short": "svg",  // ❌ Removed in New
  "product_type": "basic",  // ❌ Removed in New
  "loginid": "CR123456"  // ❌ Removed in New
}
```

New API request example

JSON

```json
{
  "contracts_for": "frxEURUSD"
}
```

## Response structure

Legacy API response example

JSON

```json
{
  "contracts_for": {
    "available": [
      {
        "barrier_category": "euro_atm",  // ❌ Not in New
        "barriers": 0,
        "contract_category": "callput",
        "contract_category_display": "Up/Down",  // ❌ Not in New
        "contract_display": "Higher",  // ❌ Not in New
        "contract_type": "CALL",
        "exchange_name": "FOREX",
        "expiry_type": "intraday",
        "market": "forex",
        "sentiment": "up",
        "start_type": "spot",  // ❌ Not in New
        "submarket": "major_pairs",
        "underlying_symbol": "frxEURUSD"
      }
    ],
    "close": 1699574400,  // ❌ Not in New
    "feed_license": "realtime",  // ❌ Not in New
    "hit_count": 1,
    "open": 1699488000,  // ❌ Not in New
    "spot": 1.0850  // ❌ Not in New
  },
  "msg_type": "contracts_for"
}
```

New API response example

JSON

```json
{
  "contracts_for": {
    "available": [
      {
        "barriers": 0,
        "contract_category": "callput",
        "contract_type": "CALL",
        "exchange_name": "FOREX",
        "expiry_type": "intraday",
        "market": "forex",
        "sentiment": "up",
        "submarket": "major_pairs",
        "underlying_symbol": "frxEURUSD"
      }
    ],
    "hit_count": 1
  },
  "msg_type": "contracts_for"
}
```

## Code examples

Legacy API 

```javascript
async function getContractsFor(symbol) {
  const request = {
    contracts_for: symbol,
    currency: "USD",
    landing_company_short: "svg",
    product_type: "basic"
  };

  ws.send(JSON.stringify(request));

  ws.onmessage = (event) => {
    const response = JSON.parse(event.data);
    if (response.msg_type === 'contracts_for') {
      const { spot, open, close } = response.contracts_for;
      console.log(`Spot: ${spot}, Open: ${open}, Close: ${close}`);
      
      response.contracts_for.available.forEach(c => {
        console.log(`Type: ${c.contract_type}`);
        console.log(`Display: ${c.contract_display}`);
        console.log(`Barrier Category: ${c.barrier_category}`);
      });
    }
  };
}
```

New API

```javascript
async function getContractsFor(symbol) {
  // Simplified request - only symbol required
  const request = {
    contracts_for: symbol
  };

  ws.send(JSON.stringify(request));

  ws.onmessage = (event) => {
    const response = JSON.parse(event.data);
    if (response.msg_type === 'contracts_for') {
      // spot, open, close no longer available
      // Use ticks endpoint for spot prices
      
      response.contracts_for.available.forEach(c => {
        console.log(`Type: ${c.contract_type}`);
        // contract_display, barrier_category no longer available
      });
    }
  };
}
```