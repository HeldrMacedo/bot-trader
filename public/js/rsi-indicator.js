
// js/rsi-indicator.js
// Indicador RSI calculado usando histórico de ticks da Deriv
// O SISTEMA DEVE SER 100% ISOLADO POR USUARIO

class RSIIndicator {
    constructor() {
        this.sessionId = SessionManager.getUserSessionId();
        this.cache = new Map(); // Cache para evitar recálculos desnecessários
        this.cacheTimeout = 1000; // Cache válido por 1 segundo
    }

    // Calcular RSI usando histórico de ticks
    calculateRSI(symbol, period = 14) {
              
        // Verificar cache primeiro
        const cacheKey = `${symbol}_${period}`;
        const cached = this.cache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
         
            return cached.value;
        }

        try {
            // Obter instância do market data
            const marketData = getMarketDataInstance(SessionManager.getLocalToken());
            if (!marketData) {
                console.error('❌ Market data instance não disponível para RSI');
                return null;
            }

            // Obter histórico de preços (precisamos de period + 1 preços mínimo)
            const requiredTicks = Math.max(period + 10, 50); // Margem de segurança
            const history = marketData.getHistoricalTicks(symbol, requiredTicks);
            
            if (!history || !history.prices || history.prices.length < period + 1) {
                console.warn(`⚠️ Histórico insuficiente para RSI: ${history?.prices?.length || 0} ticks (necessário: ${period + 1})`);
                return null;
            }

            // Usar apenas os últimos ticks necessários
            const prices = history.prices.slice(-(period + 10)); // Pequena margem extra
            
                    
            // Calcular diferenças de preço
            const changes = [];
            for (let i = 1; i < prices.length; i++) {
                changes.push(prices[i] - prices[i - 1]);
            }

            if (changes.length < period) {
                console.warn(`⚠️ Mudanças insuficientes para RSI: ${changes.length} (necessário: ${period})`);
                return null;
            }

            // Separar ganhos e perdas
            const gains = changes.map(change => change > 0 ? change : 0);
            const losses = changes.map(change => change < 0 ? Math.abs(change) : 0);

            // Calcular médias iniciais (SMA para os primeiros valores)
            let avgGain = gains.slice(0, period).reduce((sum, gain) => sum + gain, 0) / period;
            let avgLoss = losses.slice(0, period).reduce((sum, loss) => sum + loss, 0) / period;

            // Calcular EMA para o restante dos valores (método Wilder)
            for (let i = period; i < changes.length; i++) {
                avgGain = ((avgGain * (period - 1)) + gains[i]) / period;
                avgLoss = ((avgLoss * (period - 1)) + losses[i]) / period;
            }

            // Evitar divisão por zero
            if (avgLoss === 0) {
               
                return 100;
            }

            // Calcular RSI
            const rs = avgGain / avgLoss;
            const rsi = 100 - (100 / (1 + rs));

            // Arredondar para 2 casas decimais
            const finalRSI = Math.round(rsi * 100) / 100;

          
            // Salvar no cache
            this.cache.set(cacheKey, {
                value: finalRSI,
                timestamp: Date.now()
            });

            return finalRSI;

        } catch (error) {
            console.error(`❌ Erro ao calcular RSI para ${symbol}:`, error);
            return null;
        }
    }

    // Verificar condição de RSI
    checkRSICondition(symbol, operator, targetValue, period = 14) {
        const currentRSI = this.calculateRSI(symbol, period);
        
        if (currentRSI === null) {
            console.warn(`⚠️ RSI não disponível para ${symbol}`);
            return false;
        }

      
        switch (operator) {
            case '>':
                return currentRSI > targetValue;
            case '<':
                return currentRSI < targetValue;
            case '=':
                return Math.abs(currentRSI - targetValue) < 0.1; // Tolerância de 0.1
            case '>=':
                return currentRSI >= targetValue;
            case '<=':
                return currentRSI <= targetValue;
            default:
                console.error(`❌ Operador RSI desconhecido: ${operator}`);
                return false;
        }
    }

    // Obter valor atual do RSI (para display)
    getCurrentRSI(symbol, period = 14) {
        return this.calculateRSI(symbol, period);
    }

    // Limpar cache (útil para testes ou reset)
    clearCache() {
        this.cache.clear();
     
    }

    // Obter estatísticas do cache
    getCacheStats() {
        const now = Date.now();
        let validEntries = 0;
        let expiredEntries = 0;

        this.cache.forEach((entry) => {
            if (now - entry.timestamp < this.cacheTimeout) {
                validEntries++;
            } else {
                expiredEntries++;
            }
        });

        return {
            totalEntries: this.cache.size,
            validEntries,
            expiredEntries,
            cacheTimeout: this.cacheTimeout
        };
    }

    // Validar se período é válido
    static isValidPeriod(period) {
        return typeof period === 'number' && period >= 2 && period <= 200;
    }

    // Normalizar período (com fallback)
    static normalizePeriod(period) {
        if (!period || !RSIIndicator.isValidPeriod(period)) {
            console.warn(`⚠️ Período RSI inválido: ${period}. Usando padrão: 14`);
            return 14;
        }
        return period;
    }
}

// Singleton para uso global
let rsiIndicatorInstance = null;

function getRSIIndicatorInstance() {
    if (!rsiIndicatorInstance) {
        rsiIndicatorInstance = new RSIIndicator();
    }
    return rsiIndicatorInstance;
}
