"""
FastAPI Server for Deriv Analyzer
Exposes endpoints for the Next.js frontend to communicate with the analyzer
"""
import asyncio
import json
from typing import Dict, List, Optional
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime
import logging
import os

from .analyzer import DerivAnalyzer

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="Deriv Real-Time Analyzer API",
    description="API for real-time analysis of Deriv tickets",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global analyzer instance
analyzer: Optional[DerivAnalyzer] = None

# Pydantic models for request/response
class ConnectionRequest(BaseModel):
    api_token: str

class ConfigUpdate(BaseModel):
    exhaustion_threshold: Optional[int] = None
    absence_threshold: Optional[int] = None
    min_signal_strength: Optional[int] = None
    over2_enabled: Optional[bool] = None
    under7_enabled: Optional[bool] = None
    differs_enabled: Optional[bool] = None
    min_confidence: Optional[int] = None

class TradingSignal(BaseModel):
    strategy: str
    type: str
    confidence: float
    reasons: List[str]
    assertiveness: str
    expected_profit: float
    symbol: str
    timestamp: str

@app.on_event("startup")
async def startup_event():
    """Initialize the analyzer on startup"""
    global analyzer
    # Use a default token for testing, but in production get from environment
    api_token = os.getenv("DERIV_API_TOKEN", "ehOXyajRlX3TdOu")  # Example token
    analyzer = DerivAnalyzer(api_token)
    logger.info("Analyzer initialized")

@app.on_event("shutdown")
async def shutdown_event():
    """Stop the analyzer on shutdown"""
    global analyzer
    if analyzer:
        await analyzer.stop()

@app.post("/connect")
async def connect(request: ConnectionRequest):
    """Connect to Deriv API"""
    global analyzer
    try:
        if analyzer:
            await analyzer.stop()
        
        analyzer = DerivAnalyzer(request.api_token)
        # Start analyzer in background
        asyncio.create_task(analyzer.start())
        
        return {
            "status": "connected",
            "message": "Successfully connected to Deriv API"
        }
    except Exception as e:
        logger.error(f"Connection error: {e}")
        raise HTTPException(status_code=500, detail=f"Connection failed: {str(e)}")

@app.post("/disconnect")
async def disconnect():
    """Disconnect from Deriv API"""
    global analyzer
    try:
        if analyzer:
            await analyzer.stop()
            analyzer = None
        return {
            "status": "disconnected",
            "message": "Successfully disconnected from Deriv API"
        }
    except Exception as e:
        logger.error(f"Disconnection error: {e}")
        raise HTTPException(status_code=500, detail=f"Disconnection failed: {str(e)}")

@app.get("/analysis")
async def get_analysis():
    """Get current analysis for all symbols"""
    global analyzer
    if not analyzer:
        raise HTTPException(status_code=400, detail="Not connected to Deriv API")
    
    try:
        analysis = analyzer.get_current_analysis()
        return analysis
    except Exception as e:
        logger.error(f"Analysis error: {e}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

@app.get("/analysis/{symbol}")
async def get_symbol_analysis(symbol: str):
    """Get analysis for a specific symbol"""
    global analyzer
    if not analyzer:
        raise HTTPException(status_code=400, detail="Not connected to Deriv API")
    
    try:
        analysis = analyzer.get_symbol_analysis(symbol)
        if not analysis:
            raise HTTPException(status_code=404, detail=f"Symbol {symbol} not found")
        return analysis
    except Exception as e:
        logger.error(f"Symbol analysis error: {e}")
        raise HTTPException(status_code=500, detail=f"Symbol analysis failed: {str(e)}")

@app.get("/signals")
async def get_signals():
    """Get all current trading signals"""
    global analyzer
    if not analyzer:
        raise HTTPException(status_code=400, detail="Not connected to Deriv API")
    
    try:
        signals = analyzer.get_trading_signals()
        return {"signals": signals}
    except Exception as e:
        logger.error(f"Signals error: {e}")
        raise HTTPException(status_code=500, detail=f"Signals retrieval failed: {str(e)}")

@app.get("/signals/best")
async def get_best_signal():
    """Get the best trading signal"""
    global analyzer
    if not analyzer:
        raise HTTPException(status_code=400, detail="Not connected to Deriv API")
    
    try:
        best_signal = analyzer.get_best_signal()
        if not best_signal:
            return {"best_signal": None}
        return {"best_signal": best_signal}
    except Exception as e:
        logger.error(f"Best signal error: {e}")
        raise HTTPException(status_code=500, detail=f"Best signal retrieval failed: {str(e)}")

@app.get("/config")
async def get_config():
    """Get current configuration"""
    global analyzer
    if not analyzer:
        raise HTTPException(status_code=400, detail="Not connected to Deriv API")
    
    try:
        config = analyzer.get_config()
        return {"config": config}
    except Exception as e:
        logger.error(f"Config error: {e}")
        raise HTTPException(status_code=500, detail=f"Config retrieval failed: {str(e)}")

@app.put("/config")
async def update_config(config_update: ConfigUpdate):
    """Update configuration"""
    global analyzer
    if not analyzer:
        raise HTTPException(status_code=400, detail="Not connected to Deriv API")
    
    try:
        # Convert Pydantic model to dict and filter out None values
        update_dict = {k: v for k, v in config_update.dict().items() if v is not None}
        analyzer.update_config(update_dict)
        
        return {
            "status": "updated",
            "message": "Configuration updated successfully",
            "config": analyzer.get_config()
        }
    except Exception as e:
        logger.error(f"Config update error: {e}")
        raise HTTPException(status_code=500, detail=f"Config update failed: {str(e)}")

@app.get("/history/{symbol}")
async def get_history(symbol: str, count: int = 100):
    """Get digit history for a symbol"""
    global analyzer
    if not analyzer:
        raise HTTPException(status_code=400, detail="Not connected to Deriv API")
    
    try:
        history = analyzer.get_digit_history(symbol, count)
        return {"symbol": symbol, "history": history, "count": len(history)}
    except Exception as e:
        logger.error(f"History error: {e}")
        raise HTTPException(status_code=500, detail=f"History retrieval failed: {str(e)}")

@app.get("/performance")
async def get_performance():
    """Get performance statistics"""
    global analyzer
    if not analyzer:
        raise HTTPException(status_code=400, detail="Not connected to Deriv API")
    
    try:
        stats = analyzer.get_performance_stats()
        return stats
    except Exception as e:
        logger.error(f"Performance error: {e}")
        raise HTTPException(status_code=500, detail=f"Performance retrieval failed: {str(e)}")

@app.get("/status")
async def get_status():
    """Get connection status"""
    global analyzer
    if analyzer:
        return {
            "connected": True,
            "symbols_monitored": len(analyzer.digit_histories) if analyzer else 0,
            "total_signals": len(analyzer.signals) if analyzer else 0,
            "timestamp": datetime.now().isoformat()
        }
    else:
        return {
            "connected": False,
            "symbols_monitored": 0,
            "total_signals": 0,
            "timestamp": datetime.now().isoformat()
        }

# WebSocket endpoint for real-time updates
@app.websocket("/ws/updates")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time updates"""
    await websocket.accept()
    
    try:
        while True:
            # Send updates every 2 seconds
            if analyzer:
                try:
                    analysis = analyzer.get_current_analysis()
                    await websocket.send_text(json.dumps(analysis))
                except Exception as e:
                    logger.error(f"WebSocket analysis error: {e}")
                    await websocket.send_text(json.dumps({
                        "error": f"Analysis error: {str(e)}"
                    }))
            
            # Sleep for 2 seconds before next update
            await asyncio.sleep(2)
            
    except WebSocketDisconnect:
        logger.info("WebSocket disconnected")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")

# Additional endpoints for specific functionality

@app.get("/market-quality")
async def get_market_quality():
    """Get overall market quality assessment"""
    global analyzer
    if not analyzer:
        raise HTTPException(status_code=400, detail="Not connected to Deriv API")
    
    try:
        analysis = analyzer.get_current_analysis()
        return {
            "overall_quality": analysis.get("market_quality", {}),
            "should_trade": analysis.get("should_trade", False),
            "timestamp": analysis.get("timestamp", datetime.now().isoformat())
        }
    except Exception as e:
        logger.error(f"Market quality error: {e}")
        raise HTTPException(status_code=500, detail=f"Market quality retrieval failed: {str(e)}")

@app.get("/predictions/{symbol}")
async def get_predictions(symbol: str):
    """Get predictions for a specific symbol"""
    global analyzer
    if not analyzer:
        raise HTTPException(status_code=400, detail="Not connected to Deriv API")
    
    try:
        symbol_analysis = analyzer.get_symbol_analysis(symbol)
        if not symbol_analysis or 'probabilities' not in symbol_analysis:
            raise HTTPException(status_code=404, detail=f"Symbol {symbol} not found or no analysis available")
        
        probabilities = symbol_analysis['probabilities']
        
        # Format predictions
        predictions = {
            "symbol": symbol,
            "under_5_prob": probabilities.get('under_5_prob', 0),
            "over_4_prob": probabilities.get('over_4_prob', 0),
            "under_7_prob": probabilities.get('under_7_prob', 0),
            "over_2_prob": probabilities.get('over_2_prob', 0),
            "digit_probs": probabilities.get('digit_probs', {}),
            "even_prob": probabilities.get('even_prob', 0),
            "odd_prob": probabilities.get('odd_prob', 0),
            "timestamp": datetime.now().isoformat()
        }
        
        return predictions
    except Exception as e:
        logger.error(f"Predictions error: {e}")
        raise HTTPException(status_code=500, detail=f"Predictions retrieval failed: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)