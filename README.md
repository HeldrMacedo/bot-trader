# Deriv Real-Time Analysis API

This project implements a comprehensive real-time analysis system for Deriv tickets with the following features:

## 🚀 Features

### 1. Real-Time Analysis
- WebSocket connection to Deriv API for live tick data
- Continuous monitoring of last digits across multiple volatility indices
- Configurable history lengths (25, 50, 100 digits)

### 2. Automated Entry System
- Configurable conditions for entry based on:
  - Specific digits for entry
  - Pattern sequences identification
  - Statistical frequency analysis
  - Market volatility settings

### 3. Advanced Predictive Analysis
- Statistical analysis using pandas, numpy, and scikit-learn
- Frequency and distribution analysis
- Trend identification and pattern recognition
- Probability calculations based on historical data
- Alerts for optimal entry moments

### 4. Control Interface
- Automatic mode: entries based on configuration
- Manual mode: display analysis for user decision
- Real-time dashboard showing:
  - Latest digits and statistics
  - Probabilities (under/over/differ/match/par/impar)
  - Suggested best digit
  - Historical performance

### 5. Specific Configurations
- Volatility settings (R_50, R_75, R_100)
- Martingale strategies (Gale)
- Bankroll management
- Market types (under/over/differ/match/par/impar)

## 🛠️ Technologies Used

- **Python Backend**: FastAPI, websockets, pandas, numpy, scikit-learn
- **Frontend**: Next.js with TypeScript
- **Real-time Communication**: WebSocket for live updates
- **Data Analysis**: pandas for data manipulation, numpy for calculations

## 📁 Project Structure

```
deriv_analyzer_api/
├── __init__.py
├── requirements.txt
├── deriv_ws.py          # WebSocket connection module
├── analysis.py          # Statistical analysis module
├── analyzer.py          # Main analyzer combining WS and analysis
├── server.py            # FastAPI server
└── run_server.py        # Server startup script

src/
├── lib/
│   ├── deriv-api-client.ts      # API client for frontend
│   └── use-deriv-websocket.ts   # WebSocket hook for real-time updates
└── app/(withSidebar)/
    └── deriv-analyzer/
        └── page.tsx             # Dashboard page
```

## 🚀 Getting Started

### 1. Install Python Dependencies

```bash
cd deriv_analyzer_api
pip install -r requirements.txt
```

### 2. Start the Python API Server

```bash
cd deriv_analyzer_api
python run_server.py
```

The API will be available at `http://localhost:8000`

### 3. Run the Next.js Frontend

```bash
npm run dev
```

The dashboard will be available at `http://localhost:3000/deriv-analyzer`

### 4. Using the Dashboard

1. Navigate to `/deriv-analyzer` in your browser
2. Enter your Deriv API token
3. Connect to the API
4. Monitor real-time analysis and trading signals
5. Configure parameters as needed

## 📊 API Endpoints

- `GET /analysis` - Get current analysis for all symbols
- `GET /analysis/{symbol}` - Get analysis for specific symbol
- `GET /signals` - Get all trading signals
- `GET /signals/best` - Get best trading signal
- `GET /config` - Get current configuration
- `PUT /config` - Update configuration
- `GET /history/{symbol}` - Get digit history
- `GET /performance` - Get performance statistics
- `GET /status` - Get connection status
- `GET /market-quality` - Get market quality assessment
- `GET /predictions/{symbol}` - Get predictions for symbol
- `POST /connect` - Connect to Deriv API
- `POST /disconnect` - Disconnect from Deriv API
- `WS /ws/updates` - WebSocket for real-time updates

## 🎯 Trading Signals

The system generates signals with:
- Strategy type (Over 2, Under 7, Differs, etc.)
- Confidence percentage
- Trigger reasons
- Expected profit calculation
- Assertiveness level (HIGH, MEDIUM, LOW)

## 📈 Analysis Metrics

- Digit distribution analysis
- Exhaustion detection (frequently appearing digits)
- Absence detection (long-absent digits)
- Trend analysis
- Sequence pattern detection
- Probability calculations
- Market quality assessment

## 🛡️ Configuration Options

- Exhaustion threshold (default: 5)
- Absence threshold (default: 15)
- Minimum signal strength (default: 10)
- Strategy enable/disable (Over2, Under7, Differs)
- Minimum confidence (default: 70)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

This project is licensed under the MIT License.
