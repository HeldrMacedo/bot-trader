# Deriv Real-Time Analyzer Frontend

This is a Next.js-based frontend that connects to the Deriv Real-Time Analyzer API to display real-time trading analysis and suggestions.

## Technology Stack

- **Next.js 16** with **React 19**
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **WebSocket** for real-time communication
- **React Icons** for UI elements

## Architecture

The frontend connects to the backend API via WebSocket to receive real-time market analysis data. It displays digit patterns, trading suggestions, and market quality metrics in a responsive dashboard.

## Features

- Real-time digit analysis dashboard
- Trading strategy suggestions (OVER 2, UNDER 7, DIFFERS)
- Market quality assessment
- Live tick data visualization
- Connection status monitoring
- Responsive design for all devices

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

## Components

- **DerivAnalyzerService**: Handles WebSocket communication with the backend
- **Dashboard**: Main interface displaying all analysis data
- **Data Tables**: Organized presentation of trading suggestions
- **Real-time Charts**: Visual representation of tick data

## Integration with Backend

The frontend uses the `DerivAnalyzerService` to:
- Connect to the backend WebSocket
- Handle real-time data updates
- Manage reconnection logic
- Fetch API data when needed

## UI Elements

- Connection status indicators
- Market quality metrics
- Trading suggestions with confidence levels
- Real-time tick data display
- Strategy reason explanations

## Trading Strategies Displayed

- **OVER 2**: When low digits (0,1,2) are exhausted
- **UNDER 7**: When high digits (7,8,9) are exhausted
- **DIFFERS**: When a particular digit appears frequently
