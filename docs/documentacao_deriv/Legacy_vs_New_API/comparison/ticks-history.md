# Ticks history

Data No Auth

Get historical tick data for a symbol. Response required fields changed, validation relaxed, and new parameter options added.

##### 6 Breaking Changes

Required fields in `history` and `candles` response objects changed. The `echo_req` field is no longer guaranteed.

## Quick comparison

| Aspect | Legacy API | New API | Action |
| --- | --- | --- | --- |
| Endpoint | ticks_history | ticks_history | None |
| Auth Required | No | No | None |
| subscribe Values | 1 only | 0 or 1 | Optional: use 0 for one-time request |
| Granularity Restriction | Fixed enum values | Any integer | More flexibility available |

## Breaking changes

### 1. Required fields in history object changed

The `prices` and `times` arrays inside the `history` object are now required fields.

- **Legacy:** Both `prices` and `times` were optional.
- **New:** Both are now required when `history` object is present.

**Required change:** You can now safely access `history.prices` and `history.times` without null checks when the history object exists.

### 2. Required fields in candles array changed

All candle properties ( `close` , `epoch` , `high` , `low` , `open` ) are now required.

- **Legacy:** All candle properties were optional.
- **New:** All five properties are required within each candle object.

**Required change:** You can now safely destructure all candle properties without null checks.

### 3. echo_req no longer required in response

The `echo_req` field is no longer a required field in the response.

- **Legacy:** `echo_req` and `msg_type` were required.
- **New:** Only `msg_type` is required.

**Required change:** Add existence checks before accessing `response.echo_req` .

### 4. Granularity enum restriction removed

The `granularity` parameter no longer has a fixed set of allowed values.

- **Legacy:** Restricted to [60, 120, 180, 300, 600, 900, 1800, 3600, 7200, 14400, 28800, 86400].
- **New:** Any integer value is accepted.

**Required change:** You now have more flexibility in granularity values.

### 5. Input validation patterns removed

Pattern validation on `ticks_history` and `end` parameters has been removed.

- **Legacy:** `ticks_history` required pattern `^\w{2,30}$` , `end` required pattern `^(latest|[0-9]{1,10})$` .
- **New:** No pattern validation on these parameters.

### 6. subscribe and adjust_start_time now accept 0

Both parameters now accept `0` as a valid value in addition to `1` .

- **Legacy:** Both parameters only accepted `1` .
- **New:** Both accept `0` or `1` .

**Required change:** This is a new capability. Use `subscribe: 0` for one-time requests without subscription.

## Request structure

Legacy API request example

JSON

```json
{
  "ticks_history": "frxEURUSD",
  "end": "latest",
  "start": 1234567890,
  "style": "ticks",
  "count": 100,
  "adjust_start_time": 1,  // Only 1 allowed
  "subscribe": 1           // Only 1 allowed
}
```

New API request example

JSON

```json
{
  "ticks_history": "frxEURUSD",
  "end": "latest",
  "start": 1234567890,
  "style": "ticks",
  "count": 100,
  "adjust_start_time": 1,
  "subscribe": 1
}
```

## Response structure

Legacy API response example

JSON

```json
{
  "echo_req": {              // REQUIRED in legacy
    "ticks_history": "frxEURUSD",
    "end": "latest"
  },
  "history": {
    "prices": [1.0850, 1.0851],  // Optional
    "times": [1234567890, 1234567891]  // Optional
  },
  "pip_size": 5,
  "msg_type": "history"
}
```

New API request example

JSON

```json
{
  "echo_req": {              // Now OPTIONAL
    "ticks_history": "frxEURUSD",
    "end": "latest"
  },
  "history": {
    "prices": [1.0850, 1.0851],  // REQUIRED
    "times": [1234567890, 1234567891]  // REQUIRED
  },
  "pip_size": 5,
  "msg_type": "history"      // Only required field
}
```

## Code examples

Legacy API 

```javascript
async function getTicksHistory(symbol) {
  const request = {
    ticks_history: symbol,
    end: "latest",
    start: Date.now() / 1000 - 86400,
    style: "ticks",
    count: 100,
    adjust_start_time: 1,  // Only 1 is valid
    subscribe: 1           // Only 1 is valid
  };

  ws.send(JSON.stringify(request));

  ws.onmessage = (event) => {
    const response = JSON.parse(event.data);
    
    // echo_req is guaranteed
    console.log('Request:', response.echo_req);
    
    if (response.msg_type === 'history') {
      // history.prices and history.times may be missing
      if (response.history) {
        if (response.history.prices) {
          console.log('Prices:', response.history.prices);
        }
        if (response.history.times) {
          console.log('Times:', response.history.times);
        }
      }
    }
    
    if (response.msg_type === 'candles') {
      response.candles?.forEach(candle => {
        // Each property may be missing
        const close = candle.close ?? null;
        const open = candle.open ?? null;
        const high = candle.high ?? null;
        const low = candle.low ?? null;
        console.log({ open, high, low, close });
      });
    }
  };
}
```

New API

```javascript
async function getTicksHistory(symbol, subscribe = 1) {
  const request = {
    ticks_history: symbol,
    end: "latest",
    start: Date.now() / 1000 - 86400,
    style: "ticks",
    count: 100,
    adjust_start_time: 1,
    subscribe  // Can be 0 or 1
  };

  ws.send(JSON.stringify(request));

  ws.onmessage = (event) => {
    const response = JSON.parse(event.data);
    
    // echo_req may not be present
    if (response.echo_req) {
      console.log('Request:', response.echo_req);
    }
    
    if (response.msg_type === 'history') {
      // prices and times are guaranteed
      const { prices, times } = response.history;
      console.log('Prices:', prices);
      console.log('Times:', times);
    }
    
    if (response.msg_type === 'candles') {
      // All candle properties are guaranteed
      response.candles.forEach(candle => {
        const { open, high, low, close, epoch } = candle;
        console.log({ epoch, open, high, low, close });
      });
    }
  };
}

// New: One-time request without subscription
async function getTicksHistoryOnce(symbol) {
  const request = {
    ticks_history: symbol,
    end: "latest",
    style: "ticks",
    subscribe: 0,           // New in v4
    adjust_start_time: 0    // New in v4
  };
  ws.send(JSON.stringify(request));
}
```