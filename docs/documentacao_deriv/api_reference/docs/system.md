[System](/docs)

# System

System endpoints provide essential utilities for WebSocket connectivity checks, server time synchronisation, trading schedule information, and session management.

##### WebSocket & REST Endpoints

This category includes both WebSocket endpoints (ping, time, trading_times) and REST endpoints (health). All endpoints are public and do not require authentication.

## Available Endpoints

[Ping WebSocket

Ping the server to check connectivity.](/docs/system/ping/)

[Server Time WebSocket

Get the current server time.](/docs/system/time/)

[Trading Times WebSocket

Get trading times for all symbols.](/docs/system/trading-times/)

[Health Check REST

Health check endpoint to verify service availability](/docs/system/health/)

## Use Cases

- **Connection Health Checks** — Use the ping endpoint to verify WebSocket connectivity and measure latency.
- **Time Synchronisation** — Get accurate server time to synchronise your application's clock.
- **Trading Schedule** — Check trading times to know when markets are open.