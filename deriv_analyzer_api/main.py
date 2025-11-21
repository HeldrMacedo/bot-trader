from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from typing import Dict, List, Optional, Any
import asyncio
import json
import logging
import time
from datetime import datetime
from threading import Thread
from collections import deque, defaultdict
import pandas as pd
import numpy as np
from pydantic import BaseModel
import websockets
import redis
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Deriv Real-Time Analyzer API", version="1.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Redis connection for data persistence
try:
    redis_client = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)
    redis_client.ping()
    logger.info("Connected to Redis successfully")
except redis.ConnectionError:
    logger.warning("Redis not available, using in-memory storage")
    redis_client = None

class TradingSignal(BaseModel):
    symbol: str
    strategy: str
    confidence: float
    reason: str
    assertiveness: str
    timestamp: datetime

class MarketAnalysis(BaseModel):
    overall_quality: float
    should_trade: bool
    suggestions_count: int
    high_confidence_suggestions: int
    timestamp: datetime

class PerformanceStats(BaseModel):
    total_trades: int
    win_count: int
    loss_count: int
    win_rate: float
    total_profit: float
    avg_profit_per_trade: float

class DerivRealTimeAnalyzer:
    def __init__(self, api_token: str, account_type: str = "demo"):
        self.api_token = api_token
        self.account_type = account_type
        self.ws = None
        self.connected = False
        self.is_running = False
        
        # Configurações
        self.volatilities = {
            'R_10': 'Volatility 10',
            'R_25': 'Volatility 25', 
            'R_50': 'Volatility 50',
            'R_75': 'Volatility 75',
            'R_100': 'Volatility 100'
        }
        
        # Dados em tempo real
        self.tick_data = {}
        self.digit_history = defaultdict(lambda: deque(maxlen=100))
        self.analysis_results = {}
        self.suggestions = []
        
        # Configurações do usuário
        self.min_confidence = 70
        self.exhaustion_threshold = 5
        self.absence_threshold = 15
        self.active_strategies = {
            'over2': True,
            'under7': True,
            'differs': True,
            'matches': False,
            'specific_over': False,
            'specific_under': False
        }
        
        # Estatísticas
        self.trades_count = 0
        self.win_count = 0
        self.loss_count = 0
        self.total_profit = 0.0
        
        # WebSocket connection for Deriv API
        self.deriv_ws_url = "wss://ws.binaryws.com/websockets/v3?app_id=1089"
        
    def connect(self):
        """Conecta à API Deriv via WebSocket"""
        try:
            # Iniciar thread para conexão WebSocket com Deriv
            self.ws_thread = Thread(target=self._connect_websocket, daemon=True)
            self.ws_thread.start()
        except Exception as e:
            logger.error(f"Erro na conexão: {e}")
            
    def _connect_websocket(self):
        """Establish WebSocket connection to Deriv API"""
        import websocket
        import _thread
        
        def on_message(ws, message):
            self._on_message(ws, message)
            
        def on_error(ws, error):
            logger.error(f"WebSocket error: {error}")
            
        def on_close(ws, close_status_code, close_msg):
            logger.info("WebSocket connection closed")
            self.connected = False
            
        def on_open(ws):
            logger.info("Conectado à Deriv WebSocket")
            self.connected = True
            
            # Autorizar com token
            auth_msg = {
                "authorize": self.api_token
            }
            ws.send(json.dumps(auth_msg))
            
            # Inscrever nos ticks das volatilidades selecionadas
            for symbol in self.volatilities.keys():
                subscribe_msg = {
                    "ticks": symbol,
                    "subscribe": 1
                }
                ws.send(json.dumps(subscribe_msg))
                logger.info(f"Inscrito em {symbol}")
        
        self.ws = websocket.WebSocketApp(
            self.deriv_ws_url,
            on_message=on_message,
            on_error=on_error,
            on_close=on_close,
            on_open=on_open
        )
        
        self.ws.run_forever()
        
    def _on_message(self, ws, message):
        """Processa mensagens recebidas"""
        try:
            data = json.loads(message)
            
            if data.get("msg_type") == "authorize":
                if not data.get("error"):
                    logger.info("Autorizado com sucesso!")
                else:
                    logger.error(f"Erro de autorização: {data['error']['message']}")
                    
            elif data.get("msg_type") == "tick":
                self._process_tick(data["tick"])
                
        except Exception as e:
            logger.error(f"Erro processando mensagem: {e}")
            
    def _process_tick(self, tick_data):
        """Processa cada tick recebido"""
        symbol = tick_data["symbol"]
        quote = float(tick_data["quote"])
        digit = int(str(quote)[-1])  # Último dígito
        
        # Atualizar histórico
        self.digit_history[symbol].append(digit)
        self.tick_data[symbol] = {
            "quote": quote,
            "digit": digit,
            "timestamp": datetime.now()
        }
        
        # Analisar padrões
        self._analyze_patterns(symbol)
        
        # Gerar sugestões
        self._generate_suggestions()
        
    def _analyze_patterns(self, symbol: str):
        """Analisa padrões nos dígitos"""
        if len(self.digit_history[symbol]) < 20:
            return
            
        digits = list(self.digit_history[symbol])
        recent_digits = digits[-20:]  # Últimos 20 ticks
        
        analysis = {
            "symbol": symbol,
            "timestamp": datetime.now(),
            "current_digit": digits[-1],
            "exhausted_digits": [],
            "absent_digits": [],
            "distribution": self._calculate_distribution(recent_digits),
            "trends": self._analyze_trends(digits),
            "sequences": self._find_sequences(digits)
        }
        
        # Detectar exaustão
        for digit in range(10):
            count = recent_digits.count(digit)
            if count >= self.exhaustion_threshold:
                analysis["exhausted_digits"].append({
                    "digit": digit,
                    "count": count,
                    "percentage": (count / len(recent_digits)) * 100
                })
                
        # Detectar ausência
        for digit in range(10):
            if digit not in recent_digits:
                analysis["absent_digits"].append(digit)
            else:
                last_index = len(recent_digits) - 1 - recent_digits[::-1].index(digit)
                ticks_since = len(recent_digits) - 1 - last_index
                if ticks_since >= self.absence_threshold:
                    analysis["absent_digits"].append(digit)
                    
        self.analysis_results[symbol] = analysis
        
    def _calculate_distribution(self, digits: List[int]) -> Dict:
        """Calcula distribuição estatística dos dígitos"""
        series = pd.Series(digits)
        distribution = {
            "mean": float(series.mean()),
            "std": float(series.std()),
            "skew": float(series.skew()),
            "counts": series.value_counts().to_dict(),
            "percentages": (series.value_counts(normalize=True) * 100).to_dict()
        }
        return distribution
        
    def _analyze_trends(self, digits: List[int]) -> Dict:
        """Analisa tendências nos dígitos"""
        if len(digits) < 10:
            return {}
            
        series = pd.Series(digits)
        
        # Tendência de alta/baixa
        rolling_mean = series.rolling(window=10).mean()
        current_trend = "alta" if rolling_mean.iloc[-1] > rolling_mean.iloc[-2] else "baixa"
        
        # Volatilidade
        volatility = float(series.rolling(window=10).std().iloc[-1])
        
        return {
            "current_trend": current_trend,
            "volatility": volatility,
            "rolling_mean": float(rolling_mean.iloc[-1])
        }
        
    def _find_sequences(self, digits: List[int]) -> List[Dict]:
        """Encontra sequências repetitivas"""
        sequences = []
        if len(digits) < 5:
            return sequences
            
        # Procurar padrões de 3 dígitos
        for i in range(len(digits) - 3):
            sequence = digits[i:i+3]
            count = 0
            for j in range(i+3, len(digits) - 2, 3):
                if digits[j:j+3] == sequence:
                    count += 1
                else:
                    break
                    
            if count >= 1:  # Pelo menos uma repetição
                sequences.append({
                    "sequence": sequence,
                    "repetitions": count + 1,
                    "start_index": i
                })
                
        return sequences
        
    def _generate_suggestions(self):
        """Gera sugestões de entrada baseadas na análise"""
        suggestions = []
        
        for symbol, analysis in self.analysis_results.items():
            if len(analysis.get("exhausted_digits", [])) == 0 and len(analysis.get("absent_digits", [])) == 0:
                continue
                
            # ESTRATÉGIA OVER 2
            if self.active_strategies['over2']:
                over2_score = self._calculate_over2_score(analysis)
                if over2_score >= self.min_confidence:
                    suggestions.append({
                        "symbol": symbol,
                        "strategy": "OVER 2",
                        "confidence": over2_score,
                        "reason": f"Dígitos {[d['digit'] for d in analysis['exhausted_digits']]} exaustos favorecem OVER 2",
                        "assertiveness": "HIGH" if over2_score >= 80 else "MEDIUM",
                        "timestamp": datetime.now()
                    })
                    
            # ESTRATÉGIA UNDER 7
            if self.active_strategies['under7']:
                under7_score = self._calculate_under7_score(analysis)
                if under7_score >= self.min_confidence:
                    suggestions.append({
                        "symbol": symbol,
                        "strategy": "UNDER 7", 
                        "confidence": under7_score,
                        "reason": f"Padrões favorecem dígitos baixos",
                        "assertiveness": "HIGH" if under7_score >= 80 else "MEDIUM",
                        "timestamp": datetime.now()
                    })
                    
            # ESTRATÉGIA DIFFERS
            if self.active_strategies['differs']:
                differs_score = self._calculate_differs_score(analysis)
                if differs_score >= self.min_confidence:
                    most_common = max(analysis['distribution']['counts'].items(), key=lambda x: x[1])
                    suggestions.append({
                        "symbol": symbol,
                        "strategy": f"DIFFERS {most_common[0]}",
                        "confidence": differs_score,
                        "reason": f"Evitar dígito {most_common[0]} (apareceu {most_common[1]}x)",
                        "assertiveness": "HIGH" if differs_score >= 80 else "MEDIUM",
                        "timestamp": datetime.now()
                    })
                    
        # Ordenar por confiança
        self.suggestions = sorted(suggestions, key=lambda x: x['confidence'], reverse=True)
        
    def _calculate_over2_score(self, analysis: Dict) -> float:
        """Calcula score para estratégia OVER 2"""
        score = 0
        
        # Pontuar dígitos exaustos baixos (0,1,2)
        for exhausted in analysis.get("exhausted_digits", []):
            if exhausted['digit'] <= 2:
                score += exhausted['percentage'] * 0.8
                
        # Pontuar ausência de dígitos altos
        for absent in analysis.get("absent_digits", []):
            if absent >= 3:
                score += 15
                
        # Distribuição favorável
        low_digits = [d for d in range(3) if analysis['distribution']['counts'].get(d, 0) > 3]
        if len(low_digits) >= 2:
            score += 20
            
        return min(score, 100)
        
    def _calculate_under7_score(self, analysis: Dict) -> float:
        """Calcula score para estratégia UNDER 7"""
        score = 0
        
        # Pontuar dígitos exaustos altos (7,8,9)
        for exhausted in analysis.get("exhausted_digits", []):
            if exhausted['digit'] >= 7:
                score += exhausted['percentage'] * 0.8
                
        # Pontuar ausência de dígitos baixos
        for absent in analysis.get("absent_digits", []):
            if absent <= 6:
                score += 15
                
        return min(score, 100)
        
    def _calculate_differs_score(self, analysis: Dict) -> float:
        """Calcula score para estratégia DIFFERS"""
        counts = analysis['distribution']['counts']
        if not counts:
            return 0
            
        most_common_count = max(counts.values())
        total_ticks = sum(counts.values())
        
        if total_ticks == 0:
            return 0
            
        percentage = (most_common_count / total_ticks) * 100
        
        # Score baseado na dominância do dígito
        if percentage >= 30:
            return 85
        elif percentage >= 25:
            return 75
        elif percentage >= 20:
            return 65
        else:
            return 50
            
    def get_best_suggestion(self) -> Optional[Dict]:
        """Retorna a melhor sugestão atual"""
        if not self.suggestions:
            return None
        return self.suggestions[0]
        
    def get_market_analysis(self) -> Dict:
        """Retorna análise completa do mercado"""
        total_quality = 0
        valid_symbols = 0
        
        for symbol, analysis in self.analysis_results.items():
            if len(self.digit_history[symbol]) >= 20:
                quality = self._calculate_market_quality(analysis)
                total_quality += quality
                valid_symbols += 1
                
        avg_quality = total_quality / valid_symbols if valid_symbols > 0 else 0
        
        return {
            "overall_quality": avg_quality,
            "should_trade": avg_quality >= 60,
            "suggestions_count": len(self.suggestions),
            "high_confidence_suggestions": len([s for s in self.suggestions if s['assertiveness'] == 'HIGH']),
            "timestamp": datetime.now()
        }
        
    def _calculate_market_quality(self, analysis: Dict) -> float:
        """Calcula qualidade do mercado para um símbolo"""
        quality = 0
        
        # Padrões detectados
        patterns = len(analysis.get("exhausted_digits", [])) + len(analysis.get("absent_digits", []))
        if patterns >= 3:
            quality += 25
        elif patterns >= 2:
            quality += 15
        elif patterns >= 1:
            quality += 5
            
        # Distribuição
        distribution = analysis['distribution']
        if distribution['std'] > 3.0:  # Alta variância = boa oportunidade
            quality += 20
            
        # Tendências
        if analysis['trends']:
            if analysis['trends']['volatility'] > 2.5:
                quality += 15
                
        return min(quality, 100)
        
    def start_auto_trading(self):
        """Inicia modo de trading automático"""
        if not self.connected:
            logger.error("Não conectado à API")
            return
            
        self.is_running = True
        logger.info("Modo automático iniciado")
        
        def auto_trade_loop():
            while self.is_running:
                try:
                    market_analysis = self.get_market_analysis()
                    
                    if market_analysis['should_trade'] and market_analysis['high_confidence_suggestions'] > 0:
                        best_suggestion = self.get_best_suggestion()
                        if best_suggestion and best_suggestion['confidence'] >= 75:
                            self._execute_trade(best_suggestion)
                            
                    time.sleep(2)  # Verificar a cada 2 segundos
                    
                except Exception as e:
                    logger.error(f"Erro no loop automático: {e}")
                    time.sleep(5)
                    
        self.auto_thread = Thread(target=auto_trade_loop, daemon=True)
        self.auto_thread.start()
        
    def _execute_trade(self, suggestion: Dict):
        """Executa um trade baseado na sugestão"""
        # Aqui você implementaria a lógica real de trade
        # Por enquanto, apenas simulação
        
        logger.info(f"🎯 EXECUTANDO TRADE: {suggestion['strategy']} em {suggestion['symbol']}")
        logger.info(f"   Confiança: {suggestion['confidence']}%")
        logger.info(f"   Razão: {suggestion['reason']}")
        
        # Simular resultado (em produção, usar API real)
        win_probability = 0.35 + (suggestion['confidence'] / 100) * 0.25
        is_win = np.random.random() < win_probability
        
        if is_win:
            self.win_count += 1
            profit = 0.95  # Considerando stake $1
            logger.info("   ✅ RESULTADO: WIN")
        else:
            self.loss_count += 1
            profit = -1.0
            logger.info("   ❌ RESULTADO: LOSS")
            
        self.trades_count += 1
        self.total_profit += profit
        
        logger.info(f"   Lucro: ${profit:.2f} | Total: ${self.total_profit:.2f}")
        
    def stop_auto_trading(self):
        """Para o trading automático"""
        self.is_running = False
        logger.info("Modo automático parado")
        
    def get_performance_stats(self) -> Dict:
        """Retorna estatísticas de performance"""
        total_trades = self.win_count + self.loss_count
        win_rate = (self.win_count / total_trades * 100) if total_trades > 0 else 0
        
        return {
            "total_trades": total_trades,
            "win_count": self.win_count,
            "loss_count": self.loss_count,
            "win_rate": win_rate,
            "total_profit": self.total_profit,
            "avg_profit_per_trade": self.total_profit / total_trades if total_trades > 0 else 0
        }

# Global instance of the analyzer
analyzer = DerivRealTimeAnalyzer(api_token=os.getenv("DERIV_TOKEN", "your_token_here"))

# Start the analyzer connection
analyzer.connect()

@app.get("/")
async def root():
    return {"message": "Deriv Real-Time Analyzer API", "status": "running"}

@app.get("/api/status")
async def get_status():
    return {
        "connected": analyzer.connected,
        "running": analyzer.is_running,
        "symbols_monitored": list(analyzer.tick_data.keys()),
        "total_ticks_received": sum(len(hist) for hist in analyzer.digit_history.values()),
        "timestamp": datetime.now()
    }

@app.get("/api/ticks/{symbol}")
async def get_ticks(symbol: str):
    if symbol not in analyzer.tick_data:
        raise HTTPException(status_code=404, detail="Symbol not found")
    return {
        "symbol": symbol,
        "tick_data": analyzer.tick_data[symbol],
        "digit_history": list(analyzer.digit_history[symbol])
    }

@app.get("/api/analysis")
async def get_analysis():
    return {
        "market_analysis": analyzer.get_market_analysis(),
        "suggestions": analyzer.suggestions,
        "best_suggestion": analyzer.get_best_suggestion(),
        "analysis_results": analyzer.analysis_results
    }

@app.get("/api/performance")
async def get_performance():
    return {
        "performance_stats": analyzer.get_performance_stats()
    }

@app.get("/api/config")
async def get_config():
    return {
        "min_confidence": analyzer.min_confidence,
        "exhaustion_threshold": analyzer.exhaustion_threshold,
        "absence_threshold": analyzer.absence_threshold,
        "active_strategies": analyzer.active_strategies,
        "volatilities": analyzer.volatilities
    }

@app.put("/api/config")
async def update_config(
    min_confidence: Optional[int] = Query(None),
    exhaustion_threshold: Optional[int] = Query(None),
    absence_threshold: Optional[int] = Query(None),
    over2: Optional[bool] = Query(None),
    under7: Optional[bool] = Query(None),
    differs: Optional[bool] = Query(None),
    matches: Optional[bool] = Query(None)
):
    if min_confidence is not None:
        analyzer.min_confidence = min_confidence
    if exhaustion_threshold is not None:
        analyzer.exhaustion_threshold = exhaustion_threshold
    if absence_threshold is not None:
        analyzer.absence_threshold = absence_threshold
    
    strategies = {
        'over2': over2,
        'under7': under7,
        'differs': differs,
        'matches': matches
    }
    
    for key, value in strategies.items():
        if value is not None:
            analyzer.active_strategies[key] = value
    
    return {
        "message": "Configuration updated",
        "config": {
            "min_confidence": analyzer.min_confidence,
            "exhaustion_threshold": analyzer.exhaustion_threshold,
            "absence_threshold": analyzer.absence_threshold,
            "active_strategies": analyzer.active_strategies
        }
    }

@app.post("/api/trading/start")
async def start_trading():
    analyzer.start_auto_trading()
    return {"message": "Auto trading started"}

@app.post("/api/trading/stop")
async def stop_trading():
    analyzer.stop_auto_trading()
    return {"message": "Auto trading stopped"}

@app.websocket("/ws/realtime")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    
    try:
        while True:
            # Send real-time updates
            data = {
                "market_analysis": analyzer.get_market_analysis(),
                "suggestions": analyzer.suggestions,
                "best_suggestion": analyzer.get_best_suggestion(),
                "tick_data": analyzer.tick_data,
                "timestamp": datetime.now().isoformat()
            }
            
            await websocket.send_text(json.dumps(data))
            await asyncio.sleep(1)  # Send updates every second
            
    except WebSocketDisconnect:
        logger.info("WebSocket disconnected")

@app.websocket("/ws/ticks")
async def ticks_websocket(websocket: WebSocket):
    await websocket.accept()
    
    try:
        while True:
            # Send tick data updates
            data = {
                "tick_data": analyzer.tick_data,
                "digit_history": {k: list(v) for k, v in analyzer.digit_history.items()},
                "timestamp": datetime.now().isoformat()
            }
            
            await websocket.send_text(json.dumps(data))
            await asyncio.sleep(0.5)  # Send updates every 0.5 seconds
            
    except WebSocketDisconnect:
        logger.info("Ticks WebSocket disconnected")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)