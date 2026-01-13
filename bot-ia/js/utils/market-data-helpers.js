// js/utils/market-data-helpers.js
// Helpers para operações com Market Data

class MarketDataHelpers {
    // ========================================
    // MARKET DATA INSTANCE MANAGEMENT
    // ========================================

    static getMarketDataInstance() {
        const token = SessionManager.getLocalToken();
        if (!token) {
            console.warn('⚠️ [MARKET DATA] Token não encontrado');
            return null;
        }
        return getMarketDataInstance(token);
    }

    static async connectSafely(maxAttempts = 3, delayMs = 1000) {
        const marketData = this.getMarketDataInstance();
        if (!marketData) return null;

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                await marketData.connect();
                
                // Aguardar conexão estar pronta
                await this.waitForReady(marketData, 5000);
                
                console.log(`✅ [MARKET DATA] Conectado (tentativa ${attempt})`);
                return marketData;
            } catch (error) {
                if (attempt === maxAttempts) throw error;
                console.warn(`⚠️ [MARKET DATA] Tentativa ${attempt} falhou, tentando novamente...`);
                await CommonHelpers.sleep(delayMs);
            }
        }
    }

    static async waitForReady(marketData, timeoutMs = 5000) {
        const startTime = Date.now();
        while (!marketData.isAuthorized) {
            if (Date.now() - startTime > timeoutMs) {
                throw new Error('Timeout aguardando Market Data ficar pronto');
            }
            await CommonHelpers.sleep(100);
        }
    }

    static disconnectSafely() {
        // ✅ CORRIGIDO: NÃO desconectar - instância única deve permanecer ativa
        console.log('✅ [MARKET DATA] Instância única preservada - não desconectando');
    }

    // ========================================
    // SUBSCRIPTION MANAGEMENT
    // ========================================

    static async subscribeToSymbol(symbol, callback) {
        const marketData = this.getMarketDataInstance();
        if (!marketData) {
            throw new Error('Market Data não disponível');
        }

        try {
            await marketData.subscribeToTicks(symbol, callback);
            console.log(`✅ [SUBSCRIPTION] Inscrito em ${symbol}`);
            return () => marketData.unsubscribeFromSymbol(symbol);
        } catch (error) {
            console.error(`❌ [SUBSCRIPTION] Erro ao inscrever em ${symbol}:`, error);
            throw error;
        }
    }

    static unsubscribeAll() {
        try {
            const marketData = this.getMarketDataInstance();
            if (marketData) {
                marketData.stopAllTicks();
                console.log('✅ [SUBSCRIPTION] Todas as inscrições removidas');
            }
        } catch (error) {
            console.warn('⚠️ [SUBSCRIPTION] Erro ao remover inscrições:', error);
        }
    }

    // ========================================
    // DATA RETRIEVAL
    // ========================================

    static getHistoricalTicks(symbol, count = 50) {
        const marketData = this.getMarketDataInstance();
        if (!marketData) return null;

        const history = marketData.getHistoricalTicks(symbol, count);
        
        if (!history || !history.prices || history.prices.length === 0) {
            console.warn(`⚠️ [HISTORY] Sem dados históricos para ${symbol}`);
            return null;
        }

        return history;
    }

    static getPriceBuffer(symbol) {
        const marketData = this.getMarketDataInstance();
        if (!marketData) return [];

        return marketData.getPriceBuffer(symbol) || [];
    }

    static getCurrentPrice(symbol) {
        const buffer = this.getPriceBuffer(symbol);
        return buffer.length > 0 ? buffer[buffer.length - 1] : null;
    }

    // ========================================
    // VALIDATION
    // ========================================

    static isConnected() {
        const marketData = this.getMarketDataInstance();
        return marketData && marketData.isAuthorized;
    }

    static hasHistoricalData(symbol, minCount = 10) {
        const history = this.getHistoricalTicks(symbol, minCount);
        return history && history.prices && history.prices.length >= minCount;
    }

    static validateSymbol(symbol) {
        if (!symbol || typeof symbol !== 'string') {
            return { valid: false, error: 'Símbolo inválido' };
        }

        const marketData = this.getMarketDataInstance();
        if (!marketData) {
            return { valid: false, error: 'Market Data não disponível' };
        }

        const activeSymbols = marketData.activeSymbols || [];
        const isValid = activeSymbols.some(s => s.symbol === symbol);

        return {
            valid: isValid,
            error: isValid ? null : `Símbolo ${symbol} não encontrado`
        };
    }
}

// Exportar para uso global
window.MarketDataHelpers = MarketDataHelpers;
