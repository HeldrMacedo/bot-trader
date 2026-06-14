# Ticks

Data No Auth

Subscribe to real-time tick stream for market data. Required response fields changed and subscribe parameter extended.

##### 4 Breaking Changes

Required fields in tick response changed. The `tick` object is now always present and `pip_size` is no longer guaranteed.

## Quick comparison

| Aspect | Legacy API | New API | Action |
| --- | --- | --- | --- |
| Endpoint | ticks | ticks | None |
| Auth Required | No | No | None |
| Subscribe Values | 1 only | 0 or 1 | Optional: use 0 for single tick |
| tick Object | Optional | Required | Update response handling |

## Breaking changes

### 1. Required fields in tick response changed

The required fields inside the `tick` object have changed:

- **Legacy:** Only `pip_size` was required.
- **New:** `epoch` , `quote` , and `symbol` are now required.
- `pip_size` is now optional and may not always be present.

**Required change:** Add existence checks before accessing `pip_size` . You can now rely on `epoch` , `quote` , and `symbol` always being present.

### 2. Tick object now required in response

The `tick` object is now a required field in the response.

- **Legacy:** Only `echo_req` and `msg_type` were required at top level.
- **New:** `tick` and `msg_type` are required; `echo_req` is now optional.

**Required change:** You can now safely access `response.tick` without checking for existence. Update any code that relies on `echo_req` always being present.

### 3. Subscribe parameter now accepts 0

The `subscribe` parameter now accepts both `0` and `1` .

- **Legacy:** Only `1` was valid.
- **New:** `0` (single tick, no subscription) or `1` (continuous stream).

**Required change:** This is a new capability. Use `subscribe: 0` when you only need a single tick snapshot without ongoing updates.

### 4. Input validation pattern removed

The pattern validation on the `ticks` parameter has been removed.

- **Legacy:** Pattern `^\w{2,30}$` was enforced.
- **New:** No pattern validation on symbol names.

**Required change:** This change relaxes input validation. Existing valid symbol names will continue to work. If you relied on the API to validate symbol format, consider adding client-side validation.

## Request structure

Legacy API request example

JSON

```json
{
  "ticks": "frxEURUSD",
  "subscribe": 1
}
```

New API request example

JSON

```json
{
  "ticks": "frxEURUSD",
  "subscribe": 1
}
```

## Response structure

Legacy API response example

JSON

```json
{
  "echo_req": {            // Required in legacy
    "ticks": "frxEURUSD",
    "subscribe": 1
  },
  "tick": {                // Optional in legacy
    "ask": 1.08501,
    "bid": 1.08499,
    "epoch": 1234567890,   // Optional
    "id": "tick-id-123",
    "pip_size": 5,         // REQUIRED in legacy
    "quote": 1.08500,      // Optional
    "symbol": "frxEURUSD"  // Optional
  },
  "msg_type": "tick",
  "subscription": { "id": "sub-123" }
}
```

New API response example

JSON

```json
{
  "echo_req": {            // Now optional
    "ticks": "frxEURUSD",
    "subscribe": 1
  },
  "tick": {                // REQUIRED in new API
    "ask": 1.08501,
    "bid": 1.08499,
    "epoch": 1234567890,   // REQUIRED
    "id": "tick-id-123",
    "pip_size": 5,         // Now optional
    "quote": 1.08500,      // REQUIRED
    "symbol": "frxEURUSD"  // REQUIRED
  },
  "msg_type": "tick",
  "subscription": { "id": "sub-123" }
}
```

## Code examples

Legacy API 

```javascript
async function subscribeTicks(symbol) {
  const request = {
    ticks: symbol,
    subscribe: 1  // Only 1 is valid
  };

  ws.send(JSON.stringify(request));

  ws.onmessage = (event) => {
    const response = JSON.parse(event.data);
    if (response.msg_type === 'tick') {
      // tick object may not exist
      if (response.tick) {
        // pip_size is guaranteed
        const pipSize = response.tick.pip_size;
        
        // These fields are optional
        const quote = response.tick.quote;
        const epoch = response.tick.epoch;
        const symbol = response.tick.symbol;
        
        console.log('Pip size:', pipSize);
        if (quote) console.log('Quote:', quote);
      }
      
      // echo_req is always available
      console.log('Request:', response.echo_req);
    }
  };
}
```

New API

```javascript
async function subscribeTicks(symbol, subscribe = 1) {
  const request = {
    ticks: symbol,
    subscribe  // Can be 0 or 1
  };

  ws.send(JSON.stringify(request));

  ws.onmessage = (event) => {
    const response = JSON.parse(event.data);
    if (response.msg_type === 'tick') {
      // tick object is guaranteed to exist
      const { tick } = response;
      
      // These fields are guaranteed
      const { quote, epoch, symbol } = tick;
      console.log('Quote:', quote);
      console.log('Epoch:', epoch);
      console.log('Symbol:', symbol);
      
      // pip_size is now optional
      if (tick.pip_size !== undefined) {
        console.log('Pip size:', tick.pip_size);
      }
      
      // echo_req may not be present
      if (response.echo_req) {
        console.log('Request:', response.echo_req);
      }
    }
  };
}

// New: Get single tick without subscription
async function getSingleTick(symbol) {
  const request = {
    ticks: symbol,
    subscribe: 0  // New in v4
  };
  ws.send(JSON.stringify(request));
```