# Forget all

Subscription No Auth

Unsubscribe from all streams of a given type. Simplified with fewer options.

##### 3 Breaking Changes

Stream type enum validation removed, response field now required, and array items now typed.

## Quick comparison

| Aspect | Legacy API | New API | Action |
| --- | --- | --- | --- |
| Endpoint | forget_all | forget_all | None |
| Auth Required | No | No | None |
| Stream Types | Enum (14 types) | Any string | None |
| Response Field | Optional | Required | Update response handling |

## Breaking changes

### 1. Stream type enum validation removed

Legacy restricted stream types to a specific enum of 14 values. New accepts any string value, providing more flexibility.

### 2. Response field now required

In Legacy, the `forget_all` array in the response was optional. In New, this field is always present and required.

### 3. Response array items now typed

Legacy defined `forget_all` as an array without specifying item types. New explicitly types array items as strings.

## Request structure

Legacy API request example

JSON

```json
{
  "forget_all": "ticks"
  // Must be one of 14 enum values
}

// Or multiple types:
{
  "forget_all": ["ticks", "proposal"]
}
```

New API request example

JSON

```json
{
  "forget_all": "ticks"
  // Any string value accepted
}

// Or multiple types:
{
  "forget_all": ["ticks", "proposal"]
}
```

## Response structure

Legacy API response example

JSON

```json
{
  "forget_all": ["sub-id-1", "sub-id-2"],
  // ⚠️ forget_all is optional
  "msg_type": "forget_all"
}
```

New API response example

JSON

```json
{
  "forget_all": ["sub-id-1", "sub-id-2"],
  // ✓ forget_all is always present
  "msg_type": "forget_all"
}
```

## Code examples

Legacy API

```javascript
async function forgetAllTicks() {
  const request = {
    forget_all: "ticks"
  };

  ws.send(JSON.stringify(request));

  ws.onmessage = (event) => {
    const response = JSON.parse(event.data);
    if (response.msg_type === 'forget_all') {
      if (response.forget_all) {
        console.log('Unsubscribed from:', response.forget_all.length);
      }
    }
  };
}
```

New API

```javascript
async function forgetAllTicks() {
  const request = {
    forget_all: "ticks"
  };

  ws.send(JSON.stringify(request));

  ws.onmessage = (event) => {
    const response = JSON.parse(event.data);
    if (response.msg_type === 'forget_all') {
      // forget_all is always present
      console.log('Unsubscribed from:', response.forget_all.length);
    }
  };
}

```
