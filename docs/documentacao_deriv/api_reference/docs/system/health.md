[System](/docs/system)

# Health Check

GET No auth

Health check endpoint to verify service availability

## Endpoint

GET `/v1/health`

Base URL: `https://api.derivws.com`

##### No Authentication Required

This endpoint is publicly accessible and does not require any authentication headers.

## Request Schema

No properties defined.
## Response Schema

No properties defined.
## Examples

### Request Example

```json
GET /v1/health

No headers or parameters required.
```

### Response Example

```json
OK
```

## Status Codes

200 OK - Service is healthy and operational

```
OK
```

503 Service Unavailable - Service is down or experiencing issues

## Error Responses

When the service is unavailable or experiencing issues, the endpoint may return error responses.

503 Service Unavailable

```
Service temporarily unavailable
```

## About Health Checks

The health check endpoint provides a simple way to verify that the Deriv API service is operational and responding to requests.

### Response Format

Returns plain text `OK` when the service is healthy. A non-200 status code indicates the service is experiencing issues.

## Best Practices

- Poll at regular intervals (e.g. every 30–60 seconds) for continuous monitoring
- Set appropriate timeouts (e.g. 5 seconds) to detect slow responses
- Monitor both response status and response time
- Log health check failures with timestamps for troubleshooting
- Implement exponential backoff if health checks fail repeatedly

## Example Usage

cURL JavaScript Python

```bash
curl https://api.derivws.com/v1/health
```

## Monitoring Integration

Uptime Monitors

Use services like UptimeRobot, Pingdom, or StatusCake to monitor this endpoint:

- Set check interval to 1–5 minutes
- Alert on HTTP status code != 200
- Alert on response time > 2 seconds

Application Monitoring (APM)

Integrate with APM tools like DataDog, New Relic, or Prometheus:

- Track response times as metrics
- Set up alerts for failures
- Create dashboards for uptime visualization