# Deriv Real-Time Analyzer API

This is a Node.js-based backend API that connects to the Deriv trading platform and provides real-time market analysis for digit trading strategies.

## Technology Stack

- **Node.js** with **Express** for the web server
- **WebSocket** for real-time communication
- **@deriv/deriv-api** for connecting to the Deriv trading platform
- **TypeScript** for the frontend service layer

## Architecture

The backend connects directly to the Deriv WebSocket API to receive real-time tick data for volatility indices (R_10, R_25, R_50, R_75, R_100). It analyzes digit patterns and generates trading suggestions based on market trends.

## Features

- Real-time digit analysis for volatility indices
- Pattern recognition for exhausted and absent digits
- Trading strategy suggestions (OVER 2, UNDER 7, DIFFERS)
- WebSocket broadcasting to connected clients
- Market quality assessment

## API Endpoints

- `GET /api/status` - Get server status and connection information
- WebSocket `/` - Real-time data stream

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set environment variables:
```bash
export DERIV_TOKEN=your_deriv_token
```

3. Start the server:
```bash
npm start
```

## Frontend Integration

The frontend connects to this backend via WebSocket and uses the `DerivAnalyzerService` to handle real-time updates and API calls.

## Trading Strategies

The system analyzes digit patterns and suggests strategies based on:

- **OVER 2**: When low digits (0,1,2) are exhausted
- **UNDER 7**: When high digits (7,8,9) are exhausted
- **DIFFERS**: When a particular digit appears frequently

## Data Analysis

The system tracks:
- Last digit of each tick
- Digit distribution over time
- Trend analysis
- Sequence patterns
- Market quality metrics