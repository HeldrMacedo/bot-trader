// js/sma-indicator.js
// Indicador SMA e níveis de Suporte/Resistência calculados usando histórico de ticks da Deriv
// O SISTEMA DEVE SER 100% ISOLADO POR USUARIO

class SMAIndicator {
    constructor() {
        this.sessionId = SessionManager.getUserSessionId();
        this.cache = new Map(); // Cache para evitar recálculos desnecessários
        this.cacheTimeout = 1000; // Cache válido por 1 segundo
    }

    // Calcular SMA usando histórico de ticks
    calculateSMA(symbol, period = 14) {


        // Verificar cache primeiro
        const cacheKey = `sma_${symbol}_${period}`;
        const cached = this.cache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {

            return cached.value;
        }

        try {
            // Obter instância do market data
            const marketData = getMarketDataInstance(SessionManager.getLocalToken());
            if (!marketData) {
                console.error('❌ Market data instance não disponível para SMA');
                return null;
            }

            // ✅ CORRIGIDO: Obter TODOS os dados históricos necessários DE UMA VEZ
            const requiredTicks = Math.max(period + 20, 100); // Margem mais robusta
            const history = marketData.getHistoricalTicks(symbol, requiredTicks);

            // ✅ SISTEMA DEVE TER os dados necessários - se não tem, o MarketData deve obtê-los
            if (!history || !history.prices || history.prices.length < period) {
                console.warn(`⚠️ Histórico insuficiente para SMA(${period}): ${history?.prices?.length || 0} ticks (necessário: ${period})`);
                // ✅ FORÇAR inicialização do histórico se necessário
                if (marketData.initializeHistoryForSymbol) {

                    marketData.initializeHistoryForSymbol(symbol);
                }
                return null;
            }

            // Usar apenas os últimos ticks necessários para o cálculo
            const prices = history.prices.slice(-period);


            // Calcular média simples
            const sum = prices.reduce((acc, price) => acc + price, 0);
            const sma = sum / prices.length;

            // Arredondar para o número apropriado de casas decimais
            const finalSMA = Math.round(sma * 100000) / 100000; // 5 casas decimais

            // Salvar no cache
            this.cache.set(cacheKey, {
                value: finalSMA,
                timestamp: Date.now()
            });

            return finalSMA;

        } catch (error) {
            console.error(`❌ Erro ao calcular SMA para ${symbol}:`, error);
            return null;
        }
    }

    // Calcular Suporte (menor preço em um período)
    calculateSupport(symbol, period = 100) {

        // Verificar cache primeiro
        const cacheKey = `support_${symbol}_${period}`;
        const cached = this.cache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {

            return cached.value;
        }

        try {
            // Obter instância do market data
            const marketData = getMarketDataInstance(SessionManager.getLocalToken());
            if (!marketData) {
                console.error('❌ Market data instance não disponível para Suporte');
                return null;
            }

            // ✅ CORRIGIDO: Garantir que o buffer tem dados históricos suficientes
            const requiredTicks = Math.max(period + 50, 200);

            // ✅ OTIMIZAÇÃO: Não aguardar, apenas agendar carga se necessário (SYNC)
            if (marketData.ensurePriceBuffer) {
                marketData.ensurePriceBuffer(symbol).catch(e => console.warn('Loading background history...'));
            }

            // ✅ USAR getAllTicks para evitar inconsistência de buffer incompleto
            // Se o ensurePriceBuffer ainda está rodando, isso vai retornar o que tem ou vazio
            const history = marketData.getHistoricalTicks(symbol, requiredTicks);

            // Se ainda não tem dados suficientes após inicialização, retornar null
            if (!history || !history.prices || history.prices.length < period) {
                // Silenciar warning se estiver inicializando para não spammar console
                // console.warn(`⚠️ Histórico insuficiente para Suporte(${period}): ${history?.prices?.length || 0} ticks (necessário: ${period})`);
                return null;
            }

            // Usar apenas os últimos ticks do período especificado
            const prices = history.prices.slice(-period);

            // Encontrar o menor preço (suporte)
            const support = Math.min(...prices);
            const finalSupport = Math.round(support * 100000) / 100000;


            // Salvar no cache
            this.cache.set(cacheKey, {
                value: finalSupport,
                timestamp: Date.now()
            });

            return finalSupport;

        } catch (error) {
            console.error(`❌ Erro ao calcular Suporte para ${symbol}:`, error);
            return null;
        }
    }

    // Calcular Resistência (maior preço em um período)
    calculateResistance(symbol, period = 100) {

        // Verificar cache primeiro
        const cacheKey = `resistance_${symbol}_${period}`;
        const cached = this.cache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {

            return cached.value;
        }

        try {
            // Obter instância do market data
            const marketData = getMarketDataInstance(SessionManager.getLocalToken());
            if (!marketData) {
                console.error('❌ Market data instance não disponível para Resistência');
                return null;
            }

            // ✅ CORRIGIDO: Garantir que o buffer tem dados históricos suficientes
            const requiredTicks = Math.max(period + 50, 200);

            // ✅ OTIMIZAÇÃO: Não aguardar, apenas agendar carga se necessário (SYNC)
            if (marketData.ensurePriceBuffer) {
                marketData.ensurePriceBuffer(symbol).catch(e => console.warn('Loading background history...'));
            }

            const history = marketData.getHistoricalTicks(symbol, requiredTicks);

            // ✅ SISTEMA DEVE TER os dados necessários - se não tem, vai retornar null e tentar depois
            if (!history || !history.prices || history.prices.length < period) {
                // Silenciar warning durante carregamento
                // console.warn(`⚠️ Histórico insuficiente para Resistência(${period}): ${history?.prices?.length || 0} ticks (necessário: ${period})`);
                // ✅ FORÇAR inicialização do histórico se necessário (redundante com ensurePriceBuffer mas seguro)
                if (marketData.initializeHistoryForSymbol) {

                    marketData.initializeHistoryForSymbol(symbol).catch(e => { });
                }
                return null;
            }

            // Usar apenas os últimos ticks do período especificado
            const prices = history.prices.slice(-period);

            // Encontrar o maior preço (resistência)
            const resistance = Math.max(...prices);
            const finalResistance = Math.round(resistance * 100000) / 100000;


            // Salvar no cache
            this.cache.set(cacheKey, {
                value: finalResistance,
                timestamp: Date.now()
            });

            return finalResistance;

        } catch (error) {
            console.error(`❌ Erro ao calcular Resistência para ${symbol}:`, error);
            return null;
        }
    }

    // Obter último tick (preço atual)
    getLastTick(symbol) {
        try {
            const marketData = getMarketDataInstance(SessionManager.getLocalToken());
            if (!marketData) {
                console.error('❌ Market data instance não disponível para último tick');
                return null;
            }

            const history = marketData.getHistoricalTicks(symbol, 1);

            if (!history || !history.prices || history.prices.length === 0) {
                console.warn(`⚠️ Nenhum tick disponível para ${symbol}`);
                return null;
            }

            const lastTick = history.prices[history.prices.length - 1];
            const finalTick = Math.round(lastTick * 100000) / 100000;

            return finalTick;

        } catch (error) {
            console.error(`❌ Erro ao obter último tick para ${symbol}:`, error);
            return null;
        }
    }

    // Verificar condição de SMA
    checkSMACondition(symbol, operator, targetValue, period = 14) {
        const currentSMA = this.calculateSMA(symbol, period);

        if (currentSMA === null) {
            console.warn(`⚠️ SMA não disponível para ${symbol}`);
            return false;
        }


        switch (operator) {
            case '>':
                return currentSMA > targetValue;
            case '<':
                return currentSMA < targetValue;
            case '=':
                return Math.abs(currentSMA - targetValue) < 0.00001; // Tolerância pequena
            case '>=':
                return currentSMA >= targetValue;
            case '<=':
                return currentSMA <= targetValue;
            default:
                console.error(`❌ Operador SMA desconhecido: ${operator}`);
                return false;
        }
    }

    // Verificar condição de comparação entre dois SMAs
    checkSMAComparison(symbol, period1, operator, period2) {
        const sma1 = this.calculateSMA(symbol, period1);
        const sma2 = this.calculateSMA(symbol, period2);

        if (sma1 === null || sma2 === null) {
            console.warn(`⚠️ SMA não disponível para comparação: SMA(${period1})=${sma1}, SMA(${period2})=${sma2}`);
            return false;
        }


        switch (operator) {
            case '>':
                return sma1 > sma2;
            case '<':
                return sma1 < sma2;
            case '=':
                return Math.abs(sma1 - sma2) < 0.00001;
            case '>=':
                return sma1 >= sma2;
            case '<=':
                return sma1 <= sma2;
            default:
                console.error(`❌ Operador de comparação SMA desconhecido: ${operator}`);
                return false;
        }
    }

    // Verificar condição de suporte/resistência
    async checkSupportResistanceCondition(symbol, type, operator, period = 100) {
        const lastTick = this.getLastTick(symbol);
        let level = null;

        if (type === 'support') {
            level = this.calculateSupport(symbol, period);
        } else if (type === 'resistance') {
            level = this.calculateResistance(symbol, period);
        }

        if (lastTick === null || level === null) {
            // Silencioso durante carregamento
            return false;
        }


        switch (operator) {
            case '>':
                return lastTick > level;
            case '<':
                return lastTick < level;
            case '=':
                return Math.abs(lastTick - level) < 0.00001;
            case '>=':
                return lastTick >= level;
            case '<=':
                return lastTick <= level;
            default:
                console.error(`❌ Operador ${type} desconhecido: ${operator}`);
                return false;
        }
    }

    // Obter valor atual do SMA (para display)
    getCurrentSMA(symbol, period = 14) {
        return this.calculateSMA(symbol, period);
    }

    // Obter valor atual do Suporte (para display)
    getCurrentSupport(symbol, period = 100) {
        return this.calculateSupport(symbol, period);
    }

    // Obter valor atual da Resistência (para display)
    getCurrentResistance(symbol, period = 100) {
        return this.calculateResistance(symbol, period);
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
        return typeof period === 'number' && period >= 1 && period <= 1000;
    }

    // Normalizar período (com fallback)
    static normalizePeriod(period, defaultPeriod = 14) {
        if (!period || !SMAIndicator.isValidPeriod(period)) {
            console.warn(`⚠️ Período SMA inválido: ${period}. Usando padrão: ${defaultPeriod}`);
            return defaultPeriod;
        }
        return period;
    }

    // 🔄 NOVO: Detectar cruzamento entre duas SMAs
    checkSMACrossover(symbol, period1, period2, direction = 'any') {
        // Obter valores atuais das SMAs
        const currentSMA1 = this.calculateSMA(symbol, period1);
        const currentSMA2 = this.calculateSMA(symbol, period2);

        if (currentSMA1 === null || currentSMA2 === null) {
            console.warn(`⚠️ SMAs não disponíveis para crossover: SMA(${period1})=${currentSMA1}, SMA(${period2})=${currentSMA2}`);
            return false;
        }

        // Obter valores anteriores das SMAs (usando cache histórico)
        const previousSMA1 = this.getPreviousSMA(symbol, period1);
        const previousSMA2 = this.getPreviousSMA(symbol, period2);

        if (previousSMA1 === null || previousSMA2 === null) {
            console.warn(`⚠️ SMAs anteriores não disponíveis para crossover`);
            return false;
        }

        // Detectar cruzamento
        const currentRelation = currentSMA1 > currentSMA2 ? 'above' : 'below';
        const previousRelation = previousSMA1 > previousSMA2 ? 'above' : 'below';

        // Verificar se houve mudança de relação (cruzamento)
        const hasCrossover = currentRelation !== previousRelation;

        if (!hasCrossover) {
            return false;
        }



        // Verificar direção específica se solicitada
        switch (direction) {
            case 'up':
                return currentRelation === 'above' && previousRelation === 'below';
            case 'down':
                return currentRelation === 'below' && previousRelation === 'above';
            case 'any':
            default:
                return true; // Qualquer cruzamento
        }
    }

    // 🔄 NOVO: Obter valor anterior da SMA (para detecção de cruzamento)
    getPreviousSMA(symbol, period) {
        try {
            const marketData = getMarketDataInstance(SessionManager.getLocalToken());
            if (!marketData) {
                console.error('❌ Market data instance não disponível para SMA anterior');
                return null;
            }

            // Obter histórico estendido para calcular SMA anterior
            const requiredTicks = Math.max(period + 20, 60); // Mais dados para calcular anterior
            const history = marketData.getHistoricalTicks(symbol, requiredTicks);

            if (!history || !history.prices || history.prices.length < period + 1) {
                console.warn(`⚠️ Histórico insuficiente para SMA anterior: ${history?.prices?.length || 0} ticks (necessário: ${period + 1})`);
                return null;
            }

            // Calcular SMA usando preços até o penúltimo tick (excludindo o último)
            const pricesForPrevious = history.prices.slice(-(period + 1), -1);

            if (pricesForPrevious.length < period) {
                console.warn(`⚠️ Dados insuficientes para SMA anterior: ${pricesForPrevious.length} (necessário: ${period})`);
                return null;
            }

            // Calcular média simples dos preços anteriores
            const sum = pricesForPrevious.reduce((acc, price) => acc + price, 0);
            const previousSMA = sum / pricesForPrevious.length;

            const finalPreviousSMA = Math.round(previousSMA * 100000) / 100000; // 5 casas decimais

            return finalPreviousSMA;

        } catch (error) {
            console.error(`❌ Erro ao calcular SMA anterior para ${symbol}:`, error);
            return null;
        }
    }

    // 🔄 NOVO: Verificar condição de cruzamento SMA
    checkSMACrossoverCondition(symbol, period1, period2, direction) {
        return this.checkSMACrossover(symbol, period1, period2, direction);
    }
}

// Singleton para uso global
let smaIndicatorInstance = null;

function getSMAIndicatorInstance() {
    if (!smaIndicatorInstance) {
        smaIndicatorInstance = new SMAIndicator();
    }
    return smaIndicatorInstance;
}