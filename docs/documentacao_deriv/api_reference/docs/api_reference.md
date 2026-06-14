[Getting Started](/docs)

# API Overview

Understanding the Deriv API ecosystem and its core capabilities.

## Introduction

Deriv API provides programmatic access to trading services, account management, and market data for the Options trading platform. The API enables developers to integrate Deriv's robust trading infrastructure into their applications using REST endpoints for account setup and WebSocket connections for real-time trading.

##### Key features

- Options account creation and management (REST)
- Real-time market data streaming (WebSocket)
- Contract trading (buy, sell, update) (WebSocket)
- Portfolio and account monitoring (WebSocket)
- Historical data access (WebSocket)
- Subscription-based real-time updates (WebSocket)
- Secured access via **OAuth 2.0** or **Personal Access Token (PAT)**

## API Architecture

The Deriv API consists of two complementary components designed to work together seamlessly:

### REST APIs

- Account creation and management
- OTP generation for WebSocket authentication
- System health monitoring
- Standard HTTP methods (GET, POST)
- Stateless requests
- Authentication via `Deriv-App-ID` header + `Authorization: Bearer` token (OAuth 2.0 or PAT)

### WebSocket APIs

- Real-time trading operations (buy, sell, proposals)
- Live market data streaming (ticks, symbols)
- Account data subscriptions (balance, portfolio)
- Persistent bidirectional connection
- Real-time push notifications
- Three endpoint types: **public** (no auth), **demo** , and **real** (both authenticated via OTP)

## When to use REST vs WebSocket

| Feature | REST API | WebSocket API |
| --- | --- | --- |
| Use Case | Account setup and management | Real-time trading and market data |
| Connection Type | Stateless HTTP requests | Persistent connection |
| Authentication | Deriv-App-ID header + Bearer token (OAuth 2.0 or PAT) | OTP-based (obtained via REST API); public endpoint requires no auth |
| Real-time Updates | No (request-response only) | Yes (subscriptions) |
| Examples | `POST /trading/v1/options/accounts` , `POST .../{accountId}/otp` , `GET /v1/health` | Buy contract, stream ticks, get balance |

##### Typical workflow

1. **REST:** Get an authenticated WebSocket URL via the OTP endpoint (requires your Bearer token)
2. **WebSocket:** Connect using the authenticated URL returned in the OTP response
3. **WebSocket:** Perform real-time trading operations

**Note:** Users receive a default demo account upon signup — you do not need to create one via the API before trading.

## API Endpoints

**REST base URL:**

```text
https://api.derivws.com
```

**WebSocket endpoints:**

```bash
# Public (no authentication required)
wss://api.derivws.com/trading/v1/options/ws/public

# Demo account (authenticated via OTP)
wss://api.derivws.com/trading/v1/options/ws/demo?otp=YOUR_OTP

# Real account (authenticated via OTP)
wss://api.derivws.com/trading/v1/options/ws/real?otp=YOUR_OTP
```

The OTP is obtained by calling `POST /trading/v1/options/accounts/{accountId}/otp` — the response contains a ready-to-use WebSocket URL with the OTP already embedded.

**Connection requirements:**

- WebSocket-capable client (browser or server-side)
- Stable internet connection
- Valid `Deriv-App-ID` and Bearer token for REST calls and OTP generation

## Download API schemas

All API schemas are published with every production release as `schemas.zip` . The archive contains all WebSocket JSON Schema files and the REST API OpenAPI 3.1.0 spec — ready for offline use, SDK generators, or client tooling.

[Download schemas.zip →](https://github.com/deriv-com/deriv-api-schemas/releases/latest/download/schemas.zip)

https://github.com/deriv-com/deriv-api-schemas/releases/latest/download/schemas.zip

Need a specific version? Each release has a versioned URL in the format `…/releases/download/{tag}/schemas.zip` . Browse all releases at [github.com/deriv-com/deriv-api-schemas/releases](https://github.com/deriv-com/deriv-api-schemas/releases) .

## Next steps

Continue with these guides to start building with the Deriv API:

### [Authentication](/docs/intro/authentication/)

Compare OAuth 2.0 and PAT authentication methods and choose the right one for your use case.

Explore

### [OAuth 2.0](/docs/intro/oauth/)

Step-by-step guide to the OAuth 2.0 Authorization Code flow with PKCE.

Explore

### [Complete Workflows](/docs/workflows/)

End-to-end examples combining REST and WebSocket APIs for common trading scenarios.

Explore

### [Options REST API](/docs/options/)

Full reference for all REST endpoints: accounts, OTP, WebSocket setup, and more.

Explore