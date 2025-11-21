"""
Deriv WebSocket Connection Module
Handles connection to Deriv API and receives real-time ticks
"""
import asyncio
import websockets
import json
import logging
from typing import Dict, List, Optional, Callable, Any
from datetime import datetime
import threading
from collections import deque

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class DerivWebSocket:
    def __init__(self, api_token: str, on_tick_callback: Optional[Callable] = None):
        self.api_token = api_token
        self.on_tick_callback = on_tick_callback
        self.websocket = None
        self.connected = False
        self.running = False
        self.volatilities = [
            'R_10', 'R_25', 'R_50', 'R_75', 'R_100'
        ]
        self.tick_history = {vol: deque(maxlen=100) for vol in self.volatilities}
        
    async def connect(self):
        """Connect to Deriv WebSocket API"""
        try:
            self.websocket = await websockets.connect(
                "wss://ws.derivws.com/websockets/v3?app_id=1089"
            )
            self.connected = True
            self.running = True
            logger.info("Connected to Deriv WebSocket")
            
            # Authorize with API token
            auth_msg = {
                "authorize": self.api_token
            }
            await self.websocket.send(json.dumps(auth_msg))
            
            # Subscribe to tick streams
            for symbol in self.volatilities:
                subscribe_msg = {
                    "ticks": symbol,
                    "subscribe": 1
                }
                await self.websocket.send(json.dumps(subscribe_msg))
                
            # Start listening for messages
            await self.listen()
            
        except Exception as e:
            logger.error(f"Error connecting to Deriv: {e}")
            self.connected = False
            
    async def listen(self):
        """Listen for incoming messages from WebSocket"""
        try:
            async for message in self.websocket:
                data = json.loads(message)
                
                if data.get("msg_type") == "tick":
                    tick_data = data["tick"]
                    symbol = tick_data["symbol"]
                    quote = float(tick_data["quote"])
                    digit = int(str(quote)[-1])  # Get last digit
                    
                    # Add to history
                    self.tick_history[symbol].append({
                        "quote": quote,
                        "digit": digit,
                        "timestamp": datetime.now().isoformat()
                    })
                    
                    # Call callback if provided
                    if self.on_tick_callback:
                        await self.on_tick_callback(symbol, quote, digit)
                        
                elif data.get("msg_type") == "authorize":
                    if data.get("error"):
                        logger.error(f"Authorization error: {data['error']['message']}")
                        self.connected = False
                    else:
                        logger.info("Successfully authorized")
                        
        except websockets.exceptions.ConnectionClosed:
            logger.warning("WebSocket connection closed")
            self.connected = False
        except Exception as e:
            logger.error(f"Error in listen: {e}")
            self.connected = False
            
    async def disconnect(self):
        """Disconnect from WebSocket"""
        self.running = False
        if self.websocket:
            await self.websocket.close()
        self.connected = False
        
    def get_tick_history(self, symbol: str, count: int = 100) -> List[Dict]:
        """Get tick history for a specific symbol"""
        return list(self.tick_history.get(symbol, deque(maxlen=count)))[:count]
        
    def get_all_histories(self) -> Dict[str, List[Dict]]:
        """Get tick history for all symbols"""
        return {symbol: list(history) for symbol, history in self.tick_history.items()}