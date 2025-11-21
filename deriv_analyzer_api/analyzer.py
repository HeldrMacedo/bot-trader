"""
Main Analyzer Module
Combines WebSocket connection with statistical analysis
"""
import asyncio
import json
from typing import Dict, List, Optional, Callable
from datetime import datetime
import logging
from collections import defaultdict, deque

from .deriv_ws import DerivWebSocket
from .analysis import StatisticalAnalyzer

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class DerivAnalyzer:
    def __init__(self, api_token: str):
        self.api_token = api_token
        self.ws_client = DerivWebSocket(api_token, self.on_tick_received)
        self.analyzer = StatisticalAnalyzer()
        self.running = False
        
        # Data storage
        self.digit_histories = defaultdict(lambda: deque(maxlen=100))
        self.analyses = {}
        self.signals = []
        self.market_quality = {}
        
        # Configuration
        self.config = {
            'exhaustion_threshold': 5,
            'absence_threshold': 15,
            'min_signal_strength': 10,
            'over2_enabled': True,
            'under7_enabled': True,
            'differs_enabled': True,
            'min_confidence': 70,
            'max_history_size': 100
        }
        
    async def on_tick_received(self, symbol: str, quote: float, digit: int):
        """Callback when a new tick is received"""
        # Add to history
        self.digit_histories[symbol].append(digit)
        
        # Perform analysis
        await self.analyze_symbol(symbol)
        
        # Generate signals
        await self.generate_signals(symbol)
        
    async def analyze_symbol(self, symbol: str):
        """Analyze a specific symbol"""
        digits = list(self.digit_histories[symbol])
        if len(digits) < 10:
            return
            
        # Perform statistical analysis
        distribution = self.analyzer.analyze_digit_distribution(digits)
        exhaustion = self.analyzer.detect_exhaustion(digits, self.config['exhaustion_threshold'])
        absence = self.analyzer.detect_absence(digits, self.config['absence_threshold'])
        trends = self.analyzer.detect_trends(digits)
        sequences = self.analyzer.find_sequences(digits)
        probabilities = self.analyzer.calculate_probabilities(digits)
        market_quality = self.analyzer.analyze_market_quality(digits, symbol)
        
        # Store analysis
        self.analyses[symbol] = {
            'timestamp': datetime.now().isoformat(),
            'distribution': distribution,
            'exhaustion': exhaustion,
            'absence': absence,
            'trends': trends,
            'sequences': sequences,
            'probabilities': probabilities,
            'market_quality': market_quality,
            'current_digit': digits[-1] if digits else None
        }
        
        # Update overall market quality
        self.market_quality[symbol] = market_quality
        
    async def generate_signals(self, symbol: str):
        """Generate trading signals for a symbol"""
        digits = list(self.digit_histories[symbol])
        if len(digits) < 20:
            return
            
        signals = self.analyzer.generate_trading_signals(digits, self.config)
        
        # Filter by minimum confidence
        filtered_signals = [s for s in signals if s['confidence'] >= self.config['min_confidence']]
        
        # Add symbol information
        for signal in filtered_signals:
            signal['symbol'] = symbol
            signal['timestamp'] = datetime.now().isoformat()
            
        # Store signals
        self.signals = [s for s in self.signals if s['symbol'] != symbol]  # Remove old signals for this symbol
        self.signals.extend(filtered_signals)
        
        # Sort by confidence
        self.signals.sort(key=lambda x: x['confidence'], reverse=True)
        
    async def start(self):
        """Start the analyzer"""
        self.running = True
        logger.info("Starting Deriv Analyzer...")
        await self.ws_client.connect()
        
    async def stop(self):
        """Stop the analyzer"""
        self.running = False
        await self.ws_client.disconnect()
        logger.info("Deriv Analyzer stopped")
        
    def get_current_analysis(self) -> Dict:
        """Get current analysis for all symbols"""
        return {
            'analyses': dict(self.analyses),
            'signals': self.signals[:10],  # Top 10 signals
            'market_quality': self.market_quality,
            'should_trade': any(mq.get('should_trade', False) for mq in self.market_quality.values()),
            'timestamp': datetime.now().isoformat()
        }
        
    def get_symbol_analysis(self, symbol: str) -> Optional[Dict]:
        """Get analysis for a specific symbol"""
        return self.analyses.get(symbol)
        
    def get_trading_signals(self) -> List[Dict]:
        """Get all current trading signals"""
        return self.signals
        
    def get_best_signal(self) -> Optional[Dict]:
        """Get the best trading signal"""
        if not self.signals:
            return None
        return self.signals[0] if self.signals else None
        
    def update_config(self, new_config: Dict):
        """Update configuration"""
        self.config.update(new_config)
        
    def get_config(self) -> Dict:
        """Get current configuration"""
        return self.config
        
    def get_digit_history(self, symbol: str, count: int = 100) -> List[int]:
        """Get digit history for a symbol"""
        return list(self.digit_histories.get(symbol, deque(maxlen=count)))[:count]
        
    def get_performance_stats(self) -> Dict:
        """Get performance statistics"""
        total_signals = len(self.signals)
        high_confidence_signals = len([s for s in self.signals if s['confidence'] >= 80])
        medium_confidence_signals = len([s for s in self.signals if 60 <= s['confidence'] < 80])
        
        return {
            'total_signals': total_signals,
            'high_confidence_signals': high_confidence_signals,
            'medium_confidence_signals': medium_confidence_signals,
            'symbols_monitored': len(self.digit_histories),
            'total_digits_analyzed': sum(len(hist) for hist in self.digit_histories.values()),
            'timestamp': datetime.now().isoformat()
        }