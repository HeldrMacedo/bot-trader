# Forget

Subscription No Auth

Immediately cancel the real-time stream of messages with a specific ID.

##### 2 Breaking Changes

Stream ID pattern validation relaxed and response field now always required.

## Quick comparison

| Aspect | Legacy API | New API | Action |
| --- | --- | --- | --- |
| Endpoint | forget | forget | None |
| Auth Required | No | No | None |
| Stream ID Pattern | Strict | Any string | None |
| Response Field | Optional | Required | Update response handling |

## Breaking changes

### 1. Stream ID pattern validation relaxed

Legacy enforced a strict pattern `^[\w-]{32,128}$` for stream IDs. New accepts any string value, providing more flexibility.

### 2. Response field always present

In Legacy, the `forget` field in the response was optional. In New, this field is always present and required.

## Request structure

Legacy API request example

JSON

```json
{
  "forget": "d1ee7d0d-3ca9-fbb4-720b-5312d487185b"
}
```

New API request example

JSON

```json
{
  "forget": "d1ee7d0d-3ca9-fbb4-720b-5312d487185b"
}
```

## Response structure

Legacy API response example

JSON

```json
{
  "forget": 1,  // Optional field
  "msg_type": "forget"
}
```

New API response example

JSON

```json
{
  "forget": 1,  // ⚠️ Now required
  "msg_type": "forget"
}
```

## Code examples

Legacy API

```javascript
async function cancelStream(streamId) {
  const request = {
    forget: streamId
  };
  
  ws.send(JSON.stringify(request));

  ws.onmessage = (msg) => {
    const response = JSON.parse(msg.data);
    if (response.msg_type === 'forget') {
      if (response.forget === 1) {
        console.log('Stream successfully cancelled');
      }
    }
  };
}
```

New API

```javascript
async function cancelStream(streamId) {
  const request = {
    forget: streamId
  };
  
  ws.send(JSON.stringify(request));

  ws.onmessage = (msg) => {
    const response = JSON.parse(msg.data);
    if (response.msg_type === 'forget') {
      // forget field is always present in New
      if (response.forget === 1) {
        console.log('Stream successfully cancelled');
      }
    }
  };
}
```