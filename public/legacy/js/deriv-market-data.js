// Gerenciamento de dados de mercado da Deriv
// O SISTEMA DEVE SER 100% ISOLADO POR USUÁRIO
class DerivMarketData {
    constructor(token) {
        this.token = token;
        this.ws = null;
        this.isAuthorized = false; // Track authorization status
        this.activeSymbols = [];
        this.contracts = {};
        this.subscriptions = new Map();
        this._pendingTicksHistory = new Map(); // symbol -> Promise
        this.reqId = 1000; // Começar IDs de requisição a partir de 1000
        this.tickSubscriptionId = null; // ID da subscrição de tick ativa
        this.tickCallback = null; // Callback para o tick em tempo real
        this.currentActiveSymbol = null; // Ativo atualmente selecionado

        // ✅ CORREÇÃO: Sistema de múltiplos callbacks para subscrições compartilhadas
        this.tickCallbacks = new Map(); // symbol -> Set of callbacks
        this.activeSubscriptions = new Set(); // símbolos com subscrições ativas

        // 🔐 Sistema de histórico centralizado SEGURO - ISOLADO POR USUÁRIO
        this.sessionId = SessionManager.getUserSessionId();
        this.tabId = this.generateTabId(); // ID único para esta aba
        this.historicalData = this.loadHistoricalData(); // Carrega dados salvos
        this.maxHistorySize = CONFIG.API.HISTORY_COUNT_DEFAULT; // ✅ CORRIGIDO: Aumentado para suportar indicadores maiores
        this.isHistoryInitialized = false;

        this.priceBuffer = new Map(); // symbol -> array com últimos 100 preços
        this.bufferSize = 250; // ✅ FORÇADO: Garantir 250 ticks para cobrir regras de 100 + margem
        this.bufferUpdateCallbacks = new Set(); // Callbacks chamados quando buffer é atualizado
        this.activeSymbol = null; // Símbolo atualmente ativo
        this.activePriceBuffer = []; // Buffer para o símbolo ativo

        // ✅ NOVO: Sistema de inicialização automática
        this.initializationPromises = new Map(); // symbol -> Promise de inicialização
        this.isBufferReady = new Map(); // symbol -> boolean

        // 🔍 Validar integridade dos dados na inicialização
        this.validateDataIntegrity();

        // ✅ NOVO: Variáveis para monitoramento de inatividade e reconexão
        this.lastTickReceived = Date.now();
        this.reconnectAttempts = 0;
        this.inactivityCheckInterval = null;
        this.consecutivePingFailures = 0; // Contador de falhas consecutivas de ping
        this.connectionQuality = 'good'; // good, fair, poor
        this.disconnectionCount = 0; // Contador de desconexões
        this.lastDisconnectionTime = 0; // Timestamp da última desconexão

        // ✅ NOVO: Filtros anti-duplicação
        this.lastProcessedTick = null;
        this.recentTicks = new Map(); // tickKey -> timestamp

        // ⏰ NOVO: Sistema de cálculo inicial do intervalo entre ticks
        this.systemTickIntervalCalculated = false;
        this.systemInitialTickTimestamps = [];
        this.systemTickCalculationPromise = null;

        // ✅ NOVO: Variáveis para monitoramento de inatividade e PING/PONG inteligente
        this.monitoringStateCheckInterval = null; // Intervalo para verificar estado do monitoramento
        this.monitoringInactivityThreshold = CONFIG.API.INACTIVITY_CHECK_INTERVAL; // 30 segundos de inatividade para ativar PING/PONG
        this.lastMonitoringActivity = Date.now(); // Timestamp da última atividade detectada (tick ou monitoramento ativo)
        this.isPingPongActive = false; // Flag para indicar se PING/PONG está ativo no momento

        // ✅ NOVO: Variáveis de estado para troca de conta
        this.isAccountSwitchInProgress = false;

        // ✅ NOVO: Variáveis para monitoramento de inatividade e reconexãoastProcessedTick = null;
        this.lastBalanceEvent = 0;

        // 🎯 NOVO: Sistema de detecção de casas decimais por ativo
        this.assetDecimalPlaces = new Map();
        this.decimalSamples = new Map(); // Guardar amostras para análise
        this.marketInfo = null; // Armazenar informações de mercado para detecção de decimais
        this.currentUser = SessionManager.getCurrentUser(); // Armazenar usuário atual para controle de instância
        this._shouldAllowStopAll = false; // ✅ Por padrão, não permitir cancelamento da instância única

        // ✅ SISTEMA PING/PONG ÚNICO E SEGURO
        this.keepAliveInterval = null; // Intervalo único para PING
        this.activePingReqId = null; // ID do PING ativo aguardando PONG
        this.pingTimeout = null; // Timeout para PONG
        this.lastPingTime = null; // Timestamp do último PING
        this.lastPongReceived = Date.now(); // Timestamp do último PONG
        this.isExplicitDisconnect = false; // Flag para disconnect explícito
        this.isReconnecting = false; // Flag para reconexão

        // ✅ MELHORIA 2: Armazenar referências dos handlers para poder remover listeners
        this.wsHandlers = {
            open: null,
            message: null,
            error: null,
            close: null
        };
    }

    // ✅ NOVO: Método para gerenciar o estado de troca de conta
    setAccountSwitchState(isSwitching) {
        this.isAccountSwitchInProgress = isSwitching;
        if (isSwitching) {
            window.accountSwitchInProgress = true; // Flag global para outros módulos
        } else {
            delete window.accountSwitchInProgress; // Remover flag global
        }
    }

    // ✅ NOVO: Método para permitir cancelamento apenas em situações específicas (logout, troca real de ativo)
    allowStopAll(reason = 'Manual') {

        this._shouldAllowStopAll = true;
    }

    // ✅ NOVO: Método para bloquear cancelamento
    blockStopAll(reason = 'Protection') {

        this._shouldAllowStopAll = false;
    }

    // 🔑 Gerar ID único para esta aba/instância
    generateTabId() {
        return `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // 🔍 Validar integridade dos dados
    validateDataIntegrity() {
        if (!SessionManager.validateDataIntegrity()) {

            this.historicalData = {};
            this.saveHistoricalData();
        }
    }

    // 🔐 Carregar dados históricos com segurança (isolado por usuário)
    loadHistoricalData() {
        try {
            // 🔍 Verificar se o usuário atual tem permissão para acessar estes dados
            const currentUser = this._getCurrentUser();
            if (!currentUser) return {};

            const data = localStorage.getItem(`historical_data_${this.sessionId}`);
            if (!data) return {};

            const parsedData = JSON.parse(data);

            // 🔍 Validar que os dados pertencem ao usuário atual
            if (parsedData._userId && parsedData._userId !== currentUser.loginid) {
                // ❌ REMOVIDO: Não limpar dados de mercado durante troca de conta
                // Dados de mercado são do ATIVO (Deriv), não da CONTA do usuário
                // this.clearHistoricalData();

                // Apenas atualizar o userId nos metadados sem limpar os dados
                parsedData._userId = currentUser.loginid;
                localStorage.setItem(`historical_data_${this.sessionId}`, JSON.stringify(parsedData));

                return parsedData;
            }

            return parsedData;
        } catch (error) {

            return {};
        }
    }

    // 🔐 Salvar dados históricos com segurança e proteção contra race conditions
    saveHistoricalData() {
        try {
            const currentUser = this._getCurrentUser();
            if (!currentUser) return;

            // 🔒 Usar operação segura para evitar race conditions
            return SessionManager.safeStorageOperation(`historical_data_${this.sessionId}`, () => {
                // 📊 Adicionar metadados de segurança
                const dataToSave = {
                    ...this.historicalData,
                    _userId: currentUser.loginid,
                    _tabId: this.tabId,
                    _lastUpdate: Date.now(),
                    _sessionId: this.sessionId
                };

                localStorage.setItem(`historical_data_${this.sessionId}`, JSON.stringify(dataToSave));

                // 💾 Backup em sessionStorage para esta aba específica
                sessionStorage.setItem(`historical_backup_${this.tabId}`, JSON.stringify(this.historicalData));

                return true;
            });
        } catch (error) {
        }
    }

    // 🗑️ Limpar dados históricos com segurança
    clearHistoricalData() {
        const currentUser = this._getCurrentUser();
        if (currentUser) {
            localStorage.removeItem(`historical_data_${this.sessionId}`);
            sessionStorage.removeItem(`historical_backup_${this.tabId}`);
            this.historicalData = {};
        }
    }

    // ✅ OTIMIZADO: Atualizar token sem reconectar
    updateToken(newToken) {
        if (this.token === newToken) {

            return;
        }

        this.token = newToken;

        // Não desconectar pois os dados de mercado são os mesmos
        this.isAuthorized = false;

        // ✅ FORÇAR disparo de evento para notificar components
        this.forceMarketDataUpdate();
    }

    // ✅ NOVO: Forçar atualização dos componentes após troca de token
    forceMarketDataUpdate() {
        if (this.currentActiveSymbol && this.priceBuffer.has(this.currentActiveSymbol)) {
            const buffer = this.priceBuffer.get(this.currentActiveSymbol);
            if (buffer.length > 0) {
                const lastPrice = buffer[buffer.length - 1];

                // Disparar evento com dados válidos
                window.dispatchEvent(new CustomEvent('marketDataUpdate', {
                    detail: {
                        symbol: this.currentActiveSymbol,
                        lastPrice: lastPrice,
                        timestamp: Date.now(),
                        type: 'force_update'
                    }
                }));

            }
        }
    }


    // ✅ NOVO: Garantir buffer de 100 preços para um símbolo
    async ensurePriceBuffer(symbol) {


        // Se já está inicializando, aguardar
        if (this.initializationPromises.has(symbol)) {

            return await this.initializationPromises.get(symbol);
        }

        // Se buffer já está pronto, retornar
        if (this.isBufferReady.get(symbol) && this.priceBuffer.has(symbol)) {
            const buffer = this.priceBuffer.get(symbol);
            if (buffer.length >= this.bufferSize) {

                return buffer;
            }
        }

        // Criar Promise de inicialização
        const initPromise = this.initializePriceBuffer(symbol);
        this.initializationPromises.set(symbol, initPromise);

        try {
            const buffer = await initPromise;
            this.isBufferReady.set(symbol, true);

            return buffer;
        } catch (error) {
            console.error(`❌ [BUFFER] Falha ao inicializar buffer para ${symbol}:`, error);
            this.isBufferReady.set(symbol, false);
            return [];
        } finally {
            this.initializationPromises.delete(symbol);
        }
    }

    // ✅ NOVO: Inicializar buffer de preços para um símbolo
    async initializePriceBuffer(symbol) {
        // ❌ CORREÇÃO CRÍTICA: Validar símbolo antes de processar
        if (!symbol || typeof symbol !== 'string') {
            return [];
        }

        // Garantir conexão
        if (!this.isReady()) {
            await this.connect();
        }

        // ✅ PRIMEIRO: Verificar se já temos dados no histórico tradicional
        const existingData = this.historicalData[symbol];
        if (existingData && existingData.prices && existingData.prices.length >= 25) {

            const prices = existingData.prices.slice(-this.bufferSize);
            this.priceBuffer.set(symbol, [...prices]);
            this.notifyBufferUpdate(symbol, prices);
            return prices;
        }

        // ✅ SEGUNDO: Tentar obter dados via API com mais agressividade
        let attempts = 0;
        const maxAttempts = 5; // Aumentar tentativas

        while (attempts < maxAttempts) {
            attempts++;

            try {
                // ✅ CORRIGIDO: Solicitar TODOS os dados necessários sem limitações artificiais
                const requestCount = Math.max(this.bufferSize, 200); // Aumentado para garantir dados suficientes
                const history = await this.getTicksHistoryFromAPI(symbol, requestCount);

                if (history && history.prices && history.prices.length > 0) {
                    // Garantir que temos dados suficientes
                    const prices = history.prices.slice(-this.bufferSize);

                    // Armazenar no buffer
                    this.priceBuffer.set(symbol, [...prices]);

                    // Salvar também no histórico tradicional para compatibilidade
                    this.historicalData[symbol] = {
                        prices: [...prices],
                        times: history.times ? history.times.slice(-this.bufferSize) : [],
                        lastUpdate: Date.now()
                    };
                    this.saveHistoricalData();


                    // Notificar componentes sobre buffer pronto
                    this.notifyBufferUpdate(symbol, prices);

                    // ✅ NOVO: Realizar detecção de casas decimais após obter histórico inicial
                    const detectedDecimals = this.analyzeAssetDecimalPattern(symbol, prices);
                    this.assetDecimalPlaces.set(symbol, detectedDecimals);

                    return prices;
                }

                if (attempts < maxAttempts) {
                    // Aguardar progressivamente mais tempo
                    await new Promise(resolve => setTimeout(resolve, 1500 * attempts));
                }

            } catch (error) {
                if (attempts < maxAttempts) {
                    await new Promise(resolve => setTimeout(resolve, 1500 * attempts));
                }
            }
        }


        // Criar um buffer com pelo menos alguns dados simulados se necessário
        const fallbackPrices = [];
        this.priceBuffer.set(symbol, fallbackPrices);

        // Agendar nova tentativa em background
        setTimeout(() => {
            this.retryBufferInitialization(symbol);
        }, 10000);

        return fallbackPrices;
    }

    // ✅ NOVO: Retry de inicialização em background
    async retryBufferInitialization(symbol) {
        try {

            const currentBuffer = this.priceBuffer.get(symbol) || [];

            if (currentBuffer.length < 25) {
                const result = await this.initializePriceBuffer(symbol);

            }
        } catch (error) {
        }
    }

    // Inicializar histórico para um símbolo
    async initializeHistoryForSymbol(symbol) {
        // ✅ NOVO: Usar sistema de buffer centralizado
        const buffer = await this.ensurePriceBuffer(symbol);

        // Retornar no formato esperado pelo sistema legado
        return {
            prices: buffer,
            times: this.historicalData[symbol]?.times || [],
            lastUpdate: Date.now()
        };


        // Garantir que a conexão está ativa e autorizada
        if (!this.isReady()) {
            await this.connect();
        }

        // Tentar obter histórico com retry em caso de falha
        let attempts = 0;
        const maxAttempts = 2; // Reduzir tentativas para acelerar o processo

        while (attempts < maxAttempts) {
            attempts++;

            try {

                // Determinar quantidade de ticks baseado na necessidade geral (pelo menos 100 para indicadores)
                let tickCount = Math.max(100, this.bufferSize || 100);

                // 🔧 CORREÇÃO: Removido limite artificial de 50 ticks para Forex
                // O sistema precisa de histórico profundo para indicadores SMA/Suporte/Resistência


                const history = await this.getTicksHistoryFromAPI(symbol, tickCount);

                // Aceitar qualquer histórico válido, mesmo que vazio
                if (history) {
                    this.historicalData[symbol] = {
                        prices: history.prices || [],
                        times: history.times || [],
                        lastUpdate: Date.now()
                    };

                    this.saveHistoricalData();

                    if (history.prices && history.prices.length > 0) {

                    }

                    return this.historicalData[symbol];
                }

                if (attempts < maxAttempts) {

                    await new Promise(resolve => setTimeout(resolve, 1000));
                }

            } catch (error) {
                if (attempts < maxAttempts) {

                    await new Promise(resolve => setTimeout(resolve, 1000));
                } else {
                }
            }
        }

        // Criar histórico vazio se não conseguiu obter dados
        this.historicalData[symbol] = {
            prices: [],
            times: [],
            lastUpdate: Date.now()
        };
        this.saveHistoricalData();

        return this.historicalData[symbol];
    }

    // Adicionar novo tick ao histórico (manter apenas os últimos 1000)
    addTickToHistory(symbol, price, time = null) {
        if (!this.historicalData[symbol]) {
            this.historicalData[symbol] = {
                prices: [],
                times: [],
                lastUpdate: Date.now()
            };
        }

        const tickTime = time || Math.floor(Date.now() / 1000);

        // Adicionar novo tick
        this.historicalData[symbol].prices.push(price);
        this.historicalData[symbol].times.push(tickTime);

        // 🔧 OTIMIZADO: Manter apenas os últimos 200 ticks (reduzido de 1000)
        if (this.historicalData[symbol].prices.length > this.maxHistorySize) {
            this.historicalData[symbol].prices.shift();
            this.historicalData[symbol].times.shift();
        }

        this.historicalData[symbol].lastUpdate = Date.now();

        // Salvar dados atualizados
        this.saveHistoricalData();

    }

    // Obter últimos N ticks do histórico
    getLastNTicks(symbol, count = 10) {
        if (!this.historicalData[symbol] || this.historicalData[symbol].prices.length === 0) {
            return { prices: [], times: [] };
        }

        const prices = this.historicalData[symbol].prices.slice(-count);
        const times = this.historicalData[symbol].times.slice(-count);

        return { prices, times };
    }

    // Obter todo o histórico de um símbolo
    getFullHistory(symbol) {
        return this.historicalData[symbol] || { prices: [], times: [], lastUpdate: null };
    }

    // 🔧 NOVO: Obter último preço disponível para um símbolo (usado quando regras são atendidas)
    getCurrentPrice(symbol) {
        if (!this.historicalData[symbol] || this.historicalData[symbol].prices.length === 0) {

            return null;
        }

        // Retornar o último preço conhecido
        const prices = this.historicalData[symbol].prices;
        const lastPrice = prices[prices.length - 1];


        return lastPrice;
    }

    // ✅ NOVO: Expor método genérico de requisição para compatibilidade com interface de API
    // ✅ NOVO: Expor método genérico de requisição para compatibilidade com interface de API
    async sendRequest(request) {
        return new Promise((resolve, reject) => {
            // ✅ CORREÇÃO: Permitir 'authorize' mesmo se isAuthorized for false (re-autorização)
            const isAuthorize = request.authorize || (request.msg_type === 'authorize');

            if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
                reject(new Error("WebSocket não conectado"));
                return;
            }

            // Se não for authorize, exigir autorização prévia
            if (!isAuthorize && !this.isAuthorized) {
                reject(new Error("WebSocket não conectado ou não autorizado"));
                return;
            }

            const reqId = request.req_id || this.getNextReqId();
            request.req_id = reqId;

            // ✅ DIAGNOSTIC: Log the request type
            const requestType = Object.keys(request).filter(k => k !== 'req_id' && k !== 'subscribe')[0] || 'unknown';
         
            this.subscriptions.set(reqId, {
                type: 'generic_request',
                resolve,
                reject,
                // Adicionar timeout padrão de 30s
                timeoutId: setTimeout(() => {
                    if (this.subscriptions.has(reqId)) {
                        this.subscriptions.delete(reqId);
                        console.error(`❌ [DIAGNOSTIC] WS-MARKET TIMEOUT for req_id ${reqId} (${requestType}) (30s limit reached)`);
                        reject(new Error(`Timeout na requisição: ${requestType}`));
                    }
                }, 30000)
            });

            if (!this._safeWebSocketSend(request)) {
                this.subscriptions.delete(reqId);
                reject(new Error("Falha ao enviar requisição via WebSocket"));
            }
        });
    }

    connect() {
        // ✅ 1. Se já está conectado e autorizado, retornar imediatamente
        if (this.isReady()) {
            return Promise.resolve();
        }

        // ✅ 2. Se já existe uma conexão em andamento, verificar se ainda é válida
        if (this.connectionPromise) {
            // 🔥 CORREÇÃO: Verificar se WebSocket ainda está tentando conectar
            if (this.ws && this.ws.readyState === WebSocket.CONNECTING) {
                return this.connectionPromise;
            }
            // Se não está mais conectando, limpar e reconectar
            console.warn('[MarketData] connectionPromise existe mas WebSocket não está conectando, limpando...');
            this.connectionPromise = null;
        }

        // 🛡️ LIMPEZA: Se existir socket aberto mas não autorizado (Zombie), fechar antes
        if (this.ws) {
            try {
                // Remove listeners para evitar erros durante fechamento
                if (this.wsHandlers) {
                    if (this.wsHandlers.open) this.ws.removeEventListener('open', this.wsHandlers.open);
                    if (this.wsHandlers.message) this.ws.removeEventListener('message', this.wsHandlers.message);
                    if (this.wsHandlers.error) this.ws.removeEventListener('error', this.wsHandlers.error);
                    if (this.wsHandlers.close) this.ws.removeEventListener('close', this.wsHandlers.close);
                }
                this.ws.close();
            } catch (e) {
                console.warn('[MarketData] Erro ao fechar socket zombie:', e);
            }
            this.ws = null;
        }

        this.connectionPromise = new Promise((resolve, reject) => {
            const wsUrl = `${CONFIG.WS_URL}?app_id=${CONFIG.APP_ID}`;
            this.ws = new WebSocket(wsUrl);
            this.isAuthorized = false; // Track authorization status

            // ⏱️ TIMEOUT GLOBAL DA CONEXÃO (15 segundos)
            const connectionTimeout = setTimeout(() => {
                if (this.connectionPromise && !this.isAuthorized) {

                    if (this.ws) {
                        try { this.ws.close(); } catch (e) { }
                    }
                    this.connectionPromise = null;
                    reject(new Error("Timeout conectando ao servidor de mercado (15s)"));
                }
            }, 15000);

            // Logs reduzidos - apenas inicialização
            this._logDebug('🔌 [DERIV WS] Conectando...', 0.1);

            // ✅ OTIMIZAÇÃO: Definir handlers antes para evitar perda de eventos
            const handleOpen = async () => {
                if (this.ws && this.ws.readyState === WebSocket.OPEN) {

                    // 🏓 HANDSHAKE: Garantir integridade da conexão (Ping-Pong)
                    // Substitui o timeout fixo por uma verificação real de prontidão
                    try {
                        const reqId = this.getNextReqId();
                        const handshakePromise = new Promise((resolve, reject) => {
                            this.subscriptions.set(reqId, {
                                type: 'ping',
                                resolve: resolve,
                                reject: reject,
                                timeoutId: setTimeout(() => {
                                    this.subscriptions.delete(reqId);
                                    reject(new Error("Timeout waiting for Handshake Pong"));
                                }, 3000) // 🔥 REDUZIDO: 5s → 3s
                            });
                        });

                        // Enviar Ping silenciando logs de erro temporariamente
                        this._safeWebSocketSend({ "ping": 1, "req_id": reqId });

                        // Aguardar Pong (bloqueante)
                        await handshakePromise;

                        // ✅ Conexão Validada: Enviar Autorização
                        this._safeWebSocketSend({
                            "authorize": this.token,
                            "req_id": this.getNextReqId()
                        });

                        // ✅ INICIAR monitoramento
                        this.lastTickReceived = Date.now();
                        this.reconnectAttempts = 0;
                        this.startInactivityMonitor();

                    } catch (error) {
                        console.error("❌ Falha no Handshake (MarketData):", error);
                        // Fechar conexão e rejeitar promessa
                        clearTimeout(connectionTimeout); // Limpar timeout global
                        if (this.ws) this.ws.close();
                        reject(new Error("Handshake falhou: " + error.message));
                    }
                }
            };

            const handleMessage = (event) => {
                const data = JSON.parse(event.data);
                this.handleMessage(data);

                if (data.msg_type === 'authorize' && !data.error) {
                    this.isAuthorized = true; // Mark as authorized

                    clearTimeout(connectionTimeout); // ✅ Sucesso! Limpar timeout

                    // ✅ CORREÇÃO: Iniciar PING/PONG apenas após autorização
                    this.startKeepAlive();

                    // ✅ Limpar promise de conexão
                    this.connectionPromise = null;
                    resolve();
                } else if (data.error && (data.msg_type === 'authorize' || data.echo_req.req_id <= 1001)) {
                    clearTimeout(connectionTimeout); // Falha explicita
                    this.connectionPromise = null;
                    reject(new Error(data.error.message));
                }
            };


            const handleError = (error) => {
                console.error("❌ Erro na conexão WebSocket de mercado:", error);
                this.isAuthorized = false;
                clearTimeout(connectionTimeout);
                this.connectionPromise = null;

                // ✅ CORRIGIDO: Permitir reconexão mesmo durante troca de conta
                // Dados de mercado são independentes da conta do usuário
                if (!this.isExplicitDisconnect) {
                    this.forceReconnect();
                }

                reject(error);
            };

            const handleClose = (event) => {
                clearInterval(this.inactivityCheckInterval); // Limpar monitor de inatividade
                clearTimeout(connectionTimeout);
                this.connectionPromise = null;

                // 🔧 CRÍTICO: Só parar PING/PONG se for desconexão intencional
                if (this.isExplicitDisconnect) {
                    this.stopKeepAlive();
                }

                this.isAuthorized = false; // Reset authorization status

                // ✅ DIAGNÓSTICO DETALHADO: Logs específicos sobre a causa da desconexão
                const closeInfo = {
                    code: event.code,
                    reason: event.reason || 'Sem motivo específico',
                    wasClean: event.wasClean,
                    timestamp: new Date().toISOString(),
                    readyState: this.ws?.readyState,
                    url: this.ws?.url
                };

                // Mapear códigos de erro conhecidos
                const closeReasons = {
                    1000: 'Fechamento normal',
                    1001: 'Endpoint indo embora (navegação/refresh)',
                    1002: 'Erro de protocolo',
                    1003: 'Dados não suportados',
                    1004: 'Reservado',
                    1005: 'Nenhum código fornecido',
                    1006: 'Fechamento anormal (sem handshake)',
                    1007: 'Dados inválidos (UTF-8)',
                    1008: 'Violação de política',
                    1009: 'Mensagem muito grande',
                    1010: 'Extensão necessária',
                    1011: 'Erro interno do servidor',
                    1012: 'Reinício do servidor',
                    1013: 'Tente novamente mais tarde',
                    1014: 'Gateway inválido',
                    1015: 'Falha na negociação TLS'
                };

                const codeDescription = closeReasons[event.code] || `Código desconhecido: ${event.code}`;


                // Informações de contexto adicional
                const timeSinceLastTick = Date.now() - this.lastTickReceived;
                const timeSinceLastPong = Date.now() - this.lastPongReceived;

                // Verificar se overlay existe no DOM
                const overlayExists = document.querySelector('.cooldown-overlay-modal');

                // Verificar se há trades reais em andamento
                if (typeof window.tradeManagerInstance !== 'undefined') {
                    const tradeManager = window.tradeManagerInstance;

                }

                // ✅ MELHORADO: Análise inteligente de reconexão
                if (event.code !== 1000 && event.code !== 1001) { // Não reconectar se foi fechamento intencional
                    this.disconnectionCount++;
                    this.lastDisconnectionTime = Date.now();

                    // Avaliar qualidade da conexão baseado em desconexões recentes
                    const timeSinceLastDisconnection = Date.now() - this.lastDisconnectionTime;
                    if (this.disconnectionCount > 3 && timeSinceLastDisconnection < 300000) { // 5 minutos
                        this.connectionQuality = 'poor';

                    } else if (this.disconnectionCount > 1 && timeSinceLastDisconnection < 120000) { // 2 minutos
                        this.connectionQuality = 'fair';

                    }



                    // ✅ NOVO: Verificar impacto na operação em curso
                    this.logReconnectionImpact();

                    // Delay baseado na qualidade da conexão
                    const reconnectDelay = this.connectionQuality === 'poor' ? 5000 :
                        this.connectionQuality === 'fair' ? 3000 : 2000;

                    setTimeout(() => {
                        if (!this.isReady()) { // Só reconectar se ainda não estiver conectado
                            this.forceReconnect();
                        }
                    }, reconnectDelay);
                }
            };

            // ✅ MELHORIA 2: Armazenar handlers e usar addEventListener
            this.wsHandlers.open = handleOpen;
            this.wsHandlers.message = handleMessage;
            this.wsHandlers.error = handleError;
            this.wsHandlers.close = handleClose;

            // ✅ MELHORIA 2: Adicionar event listeners ao invés de onXXX
            this.ws.addEventListener('open', handleOpen);
            this.ws.addEventListener('message', handleMessage);
            this.ws.addEventListener('error', handleError);
            this.ws.addEventListener('close', handleClose);
        });

        // 🔥 CORREÇÃO CRÍTICA: Garantir limpeza de connectionPromise em TODOS os cenários
        this.connectionPromise = this.connectionPromise
            .finally(() => {
                // SEMPRE limpar connectionPromise ao finalizar (sucesso ou erro)
                this.connectionPromise = null;
            });

        return this.connectionPromise;
    }

    // Verificar se o WebSocket está pronto para uso (conectado e autorizado)
    isReady() {
        const ready = this.ws &&
            this.ws.readyState === WebSocket.OPEN &&
            this.isAuthorized;
        return ready;
    }

    getNextReqId() {
        return this.reqId++;
    }

    handleMessage(data) {
        const subscription = this.subscriptions.get(data.req_id);

        // ✅ DIAGNOSTIC: Log response arrival for tracked requests
        if (data.req_id) {
            const responseType = data.msg_type || (data.ping === "pong" ? "pong" : "unknown");
          
        }

        // ✅ NOVO: Verificação específica para pongs que podem vir sem msg_type
        if (data.ping === "pong" || data.echo_req?.ping === 1) {
            this.handlePong(data);
            return;
        }

        switch (data.msg_type) {
            case 'active_symbols':
                this.handleActiveSymbols(data);
                break;
            case 'contracts_for':
                this.handleContractsFor(data);
                break;
            case 'history':
            case 'ticks_history':
                this.handleTicksHistory(data);
                break;
            case 'tick':
                this.handleTick(data);
                break;
            case 'proposal':
                this.handleProposal(data);
                break;
            case 'balance':
                this.handleBalance(data);
                break;
            case 'authorize':
                if (subscription) {
                    subscription.resolve(data);
                    this.subscriptions.delete(data.req_id);
                }
                break;
            case 'forget':
                if (subscription) {
                    this.subscriptions.delete(data.req_id);
                }
                break;
            case 'pong':

                this.handlePong(data);
                break;
            default:
                // ✅ CORREÇÃO: Log todas mensagens desconhecidas que podem ser pongs
                if (data.req_id && this.subscriptions.has(data.req_id)) {

                }

                // Verificar se é uma resposta para um ping que enviamos
                const pingSubscription = this.subscriptions.get(data.req_id);
                if (pingSubscription && pingSubscription.type === 'ping') {

                    this.handlePong(data);
                }
        }

        // 🎯 CRÍTICO: Resolver/rejeitar subscription para msg_type que não tem case específico
        if (subscription && !data.error) {
          
            // Limpar timeout
            if (subscription.timeoutId) {
                clearTimeout(subscription.timeoutId);
            }

            subscription.resolve(data);
            this.subscriptions.delete(data.req_id);
        }
        else if (subscription && data.error) {
         
            // Limpar timeout
            if (subscription.timeoutId) {
                clearTimeout(subscription.timeoutId);
            }

            subscription.reject(new Error(data.error.message));
            this.subscriptions.delete(data.req_id);
        }
    }

    async getActiveSymbols() {
        // ✅ DETECTAR tipo de usuário para ajustar parâmetros
        const currentUser = SessionManager.getCurrentUser();
        const isVirtualAccount = currentUser?.authorize?.loginid?.startsWith('VRT') || false;
        const maxRetries = isVirtualAccount ? 3 : 3; // Mesmo número de tentativas, mas mais rápido

        // ✅ CACHE: Verificar se já temos símbolos carregados recentemente
        const accountType = isVirtualAccount ? 'virtual' : 'real';
        const cacheKey = `active_symbols_cache_${accountType}`;
        const cacheTimeout = isVirtualAccount ? 10 * 60 * 1000 : 5 * 60 * 1000; // Cache mais longo para FREE
        const cachedData = sessionStorage.getItem(cacheKey);

        if (cachedData) {
            try {
                const { symbols, timestamp } = JSON.parse(cachedData);
                if (Date.now() - timestamp < cacheTimeout && symbols.length > 0) {
                    this.activeSymbols = symbols;
                    return symbols;
                }
            } catch (error) {
                sessionStorage.removeItem(cacheKey);
            }
        }

        // 🔥 CORREÇÃO CRÍTICA: Loop iterativo em vez de recursão
        // Isso garante que todas as Promises sejam resolvidas ou rejeitadas
        let lastError = null;

        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                // Garantir que estamos conectados antes de tentar
                if (!this.isReady()) {
                    console.warn(`⚠️ [SYMBOLS] Tentativa ${attempt + 1}/${maxRetries}: WebSocket não está pronto, conectando...`);
                    await this.connect();
                }

                // Tentar obter símbolos com timeout controlado
                const symbols = await this._getActiveSymbolsSingleAttempt(isVirtualAccount);

                // ✅ SUCESSO: Retornar imediatamente
                return symbols;

            } catch (error) {
                lastError = error;
                console.warn(`⚠️ [SYMBOLS] Tentativa ${attempt + 1}/${maxRetries} falhou:`, error.message);

                // Se não é a última tentativa, aguardar antes de tentar novamente
                if (attempt < maxRetries - 1) {
                    const retryDelay = isVirtualAccount ? 1500 : 1000; // Delay reduzido
                 
                    await new Promise(resolve => setTimeout(resolve, retryDelay));
                }
            }
        }

        // ✅ TODAS AS TENTATIVAS FALHARAM: Rejeitar com erro claro
        console.error('❌ [SYMBOLS] ERRO CRÍTICO: Falha ao carregar símbolos após todas as tentativas');
        const errorMsg = isVirtualAccount
            ? `Não foi possível carregar os símbolos da Deriv após ${maxRetries} tentativas.\n\nPor favor:\n1. Verifique sua conexão com a internet\n2. Recarregue a página\n3. Se o problema persistir, aguarde alguns minutos`
            : `Não foi possível carregar os símbolos da Deriv após ${maxRetries} tentativas.\n\nVerifique sua conexão com a internet e recarregue a página.`;

        throw new Error(errorMsg + `\nÚltimo erro: ${lastError?.message || 'Desconhecido'}`);
    }

    // 🔥 NOVO: Método auxiliar para uma única tentativa de obter símbolos
    // Isso separa a lógica de retry da lógica de requisição
    async _getActiveSymbolsSingleAttempt(isVirtualAccount = false) {
        return new Promise((resolve, reject) => {
            const reqId = this.getNextReqId();

            // ✅ TIMEOUT REDUZIDO: 8-10s em vez de 20-30s
            const timeoutDuration = isVirtualAccount ? 10000 : 8000; // 10s para FREE, 8s para REAL

            let timeoutId = null;
            let isResolved = false;

            // Função para limpar e resolver
            const cleanup = () => {
                if (timeoutId) {
                    clearTimeout(timeoutId);
                    timeoutId = null;
                }
                if (this.subscriptions.has(reqId)) {
                    this.subscriptions.delete(reqId);
                }
            };

            // Função para resolver com sucesso
            const resolveWithSymbols = (symbols) => {
                if (isResolved) return;
                isResolved = true;
                cleanup();
                resolve(symbols);
            };

            // Função para rejeitar com erro
            const rejectWithError = (error) => {
                if (isResolved) return;
                isResolved = true;
                cleanup();
                reject(error);
            };

            // Configurar subscription
            this.subscriptions.set(reqId, {
                type: 'active_symbols',
                resolve: resolveWithSymbols,
                reject: rejectWithError,
                timeoutId: null // Será setado abaixo
            });

            // ✅ OTIMIZADO: Requisição mais específica
            const symbolRequest = {
                "active_symbols": "brief",
                "product_type": "basic",
                "req_id": reqId
            };

            // Enviar requisição
            if (!this._safeWebSocketSend(symbolRequest)) {
                rejectWithError(new Error('Falha ao enviar requisição WebSocket'));
                return;
            }

            // Configurar timeout
            timeoutId = setTimeout(() => {
                rejectWithError(new Error(`Timeout ao obter símbolos (${timeoutDuration}ms)`));
            }, timeoutDuration);

            // Salvar timeout ID na subscription
            const subscription = this.subscriptions.get(reqId);
            if (subscription) {
                subscription.timeoutId = timeoutId;
            }
        });
    }


    // ⏰ NOVO: Calcular intervalo do sistema baseado nos primeiros ticks
    calculateSystemTickInterval(currentTime) {
        // Se já foi calculado, não fazer novamente
        if (this.systemTickIntervalCalculated || typeof CooldownOverlay === 'undefined') {
            return;
        }

        // Adicionar timestamp atual
        this.systemInitialTickTimestamps.push(currentTime);

        // Aguardar pelo menos 2 ticks para calcular intervalo
        if (this.systemInitialTickTimestamps.length >= 2) {
            const timestamps = this.systemInitialTickTimestamps;
            let totalInterval = 0;
            let intervals = 0;

            // Calcular todos os intervalos entre ticks consecutivos
            for (let i = 1; i < timestamps.length; i++) {
                const interval = timestamps[i] - timestamps[i - 1];

                // Filtrar intervalos anômalos (entre 500ms e 5s)
                if (interval >= 500 && interval <= 5000) {
                    totalInterval += interval;
                    intervals++;
                }
            }

            if (intervals > 0) {
                const calculatedInterval = Math.round(totalInterval / intervals);

                // Definir valor no CooldownOverlay
                CooldownOverlay.averageTickInterval = calculatedInterval;
                this.systemTickIntervalCalculated = true;

                // Ativar timer dinâmico agora que temos o valor base
                CooldownOverlay.dynamicTimerActive = true;

                // Limpar timestamps iniciais para economizar memória
                this.systemInitialTickTimestamps = [];
            }
        }
    }
    handleActiveSymbols(data) {
        const reqId = data.echo_req?.req_id;

        if (data.error) {
            console.error("❌ [SYMBOLS] Erro na resposta da API:", data.error);

            if (reqId && this.subscriptions.has(reqId)) {
                const subscription = this.subscriptions.get(reqId);
                if (subscription.timeoutId) {
                    clearTimeout(subscription.timeoutId);
                }
                subscription.reject(new Error(`API Error: ${data.error.message}`));
                this.subscriptions.delete(reqId);
            }
            return;
        }

        this.activeSymbols = data.active_symbols || [];

        // ✅ CACHE: Salvar símbolos no cache para próximas cargas
        if (this.activeSymbols.length > 0) {
            try {
                const currentUser = SessionManager.getCurrentUser();
                const isVirtualAccount = currentUser?.authorize?.loginid?.startsWith('VRT') || false;
                const accountType = isVirtualAccount ? 'virtual' : 'real';
                const cacheKey = `active_symbols_cache_${accountType}`;

                const cacheData = {
                    symbols: this.activeSymbols,
                    timestamp: Date.now()
                };
                sessionStorage.setItem(cacheKey, JSON.stringify(cacheData));

            } catch (error) {

            }
        }

        if (reqId && this.subscriptions.has(reqId)) {
            const subscription = this.subscriptions.get(reqId);

            // Cancelar timeout
            if (subscription.timeoutId) {
                clearTimeout(subscription.timeoutId);
            }

            subscription.resolve(this.activeSymbols);
            this.subscriptions.delete(reqId);
        }
    }

    async getContractsFor(symbol) {
        return new Promise(async (resolve, reject) => {
            // ✅ DETECTAR tipo de usuário para ajustar timeouts
            const currentUser = SessionManager.getCurrentUser();
            const isVirtualAccount = currentUser?.authorize?.loginid?.startsWith('VRT') || false;
            const timeout = isVirtualAccount ? 25000 : 15000; // 25s para FREE, 15s para REAL

            // Garantir conexão antes de fazer a requisição
            if (!this.isReady()) {
                try {
                    await this.connect();

                    // ✅ Aguardar autorização com mais paciência para usuários FREE
                    let retries = 0;
                    const maxRetries = isVirtualAccount ? 20 : 10;
                    const retryDelay = isVirtualAccount ? 1000 : 500;

                    while (!this.isReady() && retries < maxRetries) {
                        await new Promise(resolve => setTimeout(resolve, retryDelay));
                        retries++;
                    }

                    if (!this.isReady()) {
                        const errorMsg = isVirtualAccount
                            ? "Falha ao conectar WebSocket para obter contratos (usuário FREE). Tente recarregar a página."
                            : "Falha ao conectar WebSocket para obter contratos";
                        this.forceReconnect(); // Tentar reconectar em caso de falha na conexão
                        reject(new Error(errorMsg));
                        return;
                    }
                } catch (error) {
                    reject(new Error(`Erro de conexão: ${error.message}`));
                    return;
                }
            }

            const reqId = this.getNextReqId();
            this.subscriptions.set(reqId, { type: 'contracts_for', symbol, resolve, reject });

            this._safeWebSocketSend({
                "contracts_for": symbol,
                "currency": "USD",
                "req_id": reqId
            });

            // ✅ Timeout diferenciado por tipo de usuário
            setTimeout(() => {
                if (this.subscriptions.has(reqId)) {
                    this.subscriptions.delete(reqId);

                    const errorMsg = isVirtualAccount
                        ? `Timeout ao obter contratos para ${symbol} (usuário FREE - ${timeout}ms). Verifique sua conexão.`
                        : `Timeout ao obter contratos para ${symbol} (${timeout}ms)`;

                    reject(new Error(errorMsg));
                }
            }, timeout);
        });
    }

    handleContractsFor(data) {
        if (data.error) {
            console.error("❌ Erro ao obter contratos:", data.error);
            return;
        }

        const symbol = data.echo_req?.contracts_for;
        if (symbol) {
            // ✅ CORREÇÃO: API da Deriv retorna contratos em 'contracts_for', não 'contracts'
            this.contracts[symbol] = data.contracts_for || {};


        }

        const reqId = data.echo_req.req_id;
        if (this.subscriptions.has(reqId)) {
            const { resolve } = this.subscriptions.get(reqId);
            resolve(this.contracts[symbol]);
            this.subscriptions.delete(reqId);
        }
    }

    // Método interno para obter histórico da API (usado apenas para inicialização)
    async getTicksHistoryFromAPI(symbol, count = 100) {
        // ✅ OTIMIZAÇÃO: Se já há uma requisição pendente para este símbolo, retornar a mesma Promise
        if (this._pendingTicksHistory.has(symbol)) {
            console.log(`📡 [WS-MARKET] Reutilizando requisição pendente para: ${symbol}`);
            return this._pendingTicksHistory.get(symbol);
        }

        const historyPromise = new Promise((resolve, reject) => {
            if (!this.isReady()) {
                reject(new Error("WebSocket não conectado ou não autorizado"));
                return;
            }

            const reqId = this.getNextReqId();
            this.subscriptions.set(reqId, { type: 'ticks_history', symbol, resolve, reject });

            // ✅ MELHORADO: Tentar diferentes formatos de requisição
            let historyRequest;

            // Para ativos sintéticos (R_10, R_25, etc.), usar formato padrão com 'style': 'ticks'
            // Para ativos forex e outros, usar o formato antigo se o novo falhar
            if (symbol.startsWith('R_') || symbol.startsWith('B_') || symbol.startsWith('S_') || symbol.startsWith('W_')) {
                // Usar formato mais robusto para sintéticos
                historyRequest = {
                    "ticks_history": symbol,
                    "end": "latest",
                    "style": "ticks", // Importante para obter ticks individuais
                    "count": Math.min(count, 1000), // Limitar para evitar timeout
                    "req_id": reqId
                };
            } else {
                // Para outros ativos, usar formato alternativo
                historyRequest = {
                    "ticks_history": symbol,
                    "count": Math.min(count, 500),
                    "end": "latest",
                    "req_id": reqId
                };
            }

            this._safeWebSocketSend(historyRequest);

            // ✅ MELHORADO: Timeout aumentado para dados históricos
            const timeoutId = setTimeout(() => {
                if (this.subscriptions.has(reqId)) {
                    // Remover da lista de pendentes ao finalizar (erro/timeout)
                    this._pendingTicksHistory.delete(symbol);

                    // Tentar resolver com dados parciais se disponíveis
                    const partialHistory = this.historicalData[symbol];
                    if (partialHistory && partialHistory.prices && partialHistory.prices.length > 0) {
                        const { resolve } = this.subscriptions.get(reqId);
                        resolve(partialHistory);
                    } else {
                        // Resolver com histórico mínimo para não quebrar o fluxo
                        const { resolve } = this.subscriptions.get(reqId);
                        const emptyHistory = {
                            prices: [],
                            times: [],
                            lastUpdate: Date.now()
                        };
                        resolve(emptyHistory);
                    }
                    this.subscriptions.delete(reqId);
                }
            }, CONFIG.API.CONNECT_TIMEOUT); // ✅ Timeout configurável para histórico

            // Salvar o timeoutId para poder cancelá-lo se necessário
            const subscription = this.subscriptions.get(reqId);
            if (subscription) subscription.timeoutId = timeoutId;
        });

        // Registrar como pendente
        this._pendingTicksHistory.set(symbol, historyPromise);

        // Garantir remoção ao finalizar a Promise
        return historyPromise.finally(() => {
            this._pendingTicksHistory.delete(symbol);
        });
    }

    handleTicksHistory(data) {
        const reqId = data.echo_req?.req_id;
        const symbol = data.echo_req?.ticks_history;

        // Cancelar timeout se existir
        if (this.subscriptions.has(reqId)) {
            const subscription = this.subscriptions.get(reqId);
            if (subscription.timeoutId) {
                clearTimeout(subscription.timeoutId);
            }
        }

        if (data.error) {
            console.error(`❌ Erro ao obter histórico para ${symbol}: ${data.error.message}`);
            if (this.subscriptions.has(reqId)) {
                const { reject } = this.subscriptions.get(reqId);
                reject(new Error(`Erro API: ${data.error.message}`));
                this.subscriptions.delete(reqId);
            }
            return;
        }

        if (symbol && this.subscriptions.has(reqId)) {
            let history = null;

            // Verificar se temos dados de histórico no formato esperado
            if (data.history && (data.history.prices || data.history.times)) {
                history = {
                    prices: data.history.prices || [],
                    times: data.history.times || [],
                    lastUpdate: Date.now()
                };
            }

            // Se não temos histórico estruturado, tentar extrair de outros formatos
            if (!history || history.prices.length === 0) {
                if (data.candles && data.candles.length > 0) {
                    // Formato de candles (ticks de maior granularidade)
                    history = {
                        prices: data.candles.map(candle => candle.close || candle.high || candle.low || candle.open),
                        times: data.candles.map(candle => candle.epoch),
                        lastUpdate: Date.now()
                    };
                } else if (data.tick && data.tick.quote) {
                    // Formato de tick único retornado (raro em history)
                    history = {
                        prices: [data.tick.quote],
                        times: [data.tick.epoch],
                        lastUpdate: Date.now()
                    };
                } else if (data.prices && data.times) {
                    // Formato alternativo direto
                    history = {
                        prices: data.prices,
                        times: data.times,
                        lastUpdate: Date.now()
                    };
                }
            }

            // Se ainda não temos histórico, criar um objeto vazio para não falhar
            if (!history || !history.prices) {
                history = {
                    prices: [],
                    times: [],
                    lastUpdate: Date.now()
                };
            }

            // Salvar no histórico centralizado SOMENTE se obtivemos dados válidos
            if (history.prices.length > 0) {
                this.historicalData[symbol] = history;
                this.saveHistoricalData();
            }

            const { resolve } = this.subscriptions.get(reqId);
            resolve(history);
            this.subscriptions.delete(reqId);
        } else if (this.subscriptions.has(reqId)) {
            // Se o req_id está na lista mas não encontramos symbol, tratar como sucesso com histórico vazio
            const emptyHistory = {
                prices: [],
                times: [],
                lastUpdate: Date.now()
            };

            const { resolve } = this.subscriptions.get(reqId);
            resolve(emptyHistory);
            this.subscriptions.delete(reqId);
        }
    }

    async subscribeToTicks(symbol, callback) {
        // ✅ VALIDAÇÃO INICIAL
        if (!this.isReady()) {
            await this.connect();
            if (!this.isReady()) {
                throw new Error("Falha ao conectar WebSocket para subscrição");
            }
        }

        // ✅ NOVO SISTEMA: Verifica se já existe subscrição válida
        if (this.currentActiveSymbol === symbol && this.tickSubscriptionId) {

            // Garantir que callbacks existem
            if (!this.tickCallbacks.has(symbol)) {
                this.tickCallbacks.set(symbol, new Set());
            }

            // Adicionar callback
            const callbacks = this.tickCallbacks.get(symbol);
            callbacks.add(callback);

            // Retornar função de cleanup
            return () => {
                if (this.tickCallbacks.has(symbol)) {
                    this.tickCallbacks.get(symbol).delete(callback);
                }
            };
        }

        // ✅ PRIMEIRA SUBSCRIÇÃO OU NOVA SUBSCRIÇÃO
        if (!this.currentActiveSymbol || this.currentActiveSymbol !== symbol) {
            // Limpar subscrição anterior se existir
            if (this.currentActiveSymbol && this.currentActiveSymbol !== symbol) {

                await this.clearPreviousSubscription();
            }

            // Configurar novo ativo
            this.activeSymbol = symbol;
            this.currentActiveSymbol = symbol;
            this.tickCallback = callback;

            // Inicializar buffer
            const buffer = await this.ensurePriceBuffer(symbol);
            if (buffer && buffer.length > 0) {
                this.activePriceBuffer = [...buffer];
            }

            // Configurar callbacks
            this.tickCallbacks.set(symbol, new Set([callback]));

            // Criar subscrição
            const reqId = this.getNextReqId();
            this.tickSubscriptionId = reqId;

            try {
                this._safeWebSocketSend({
                    "ticks": symbol,
                    "subscribe": 1,
                    "req_id": reqId
                });

                this.activeSubscriptions.add(symbol);

                // Retornar função de cleanup
                return () => {
                    if (this.tickCallbacks.has(symbol)) {
                        this.tickCallbacks.get(symbol).delete(callback);
                    }
                };

            } catch (error) {
                console.error(`❌ [SUBSCRIBE] Erro ao enviar subscrição:`, error);
                throw error;
            }
        }


        if (!this.tickCallbacks.has(symbol)) {
            this.tickCallbacks.set(symbol, new Set());
        }

        this.tickCallbacks.get(symbol).add(callback);

        return () => {
            if (this.tickCallbacks.has(symbol)) {
                this.tickCallbacks.get(symbol).delete(callback);
            }
        };
    }

    // ✅ NOVO: Limpar subscrição anterior de forma segura
    async clearPreviousSubscription() {
        try {
            if (this.tickSubscriptionId && this.ws && this.ws.readyState === WebSocket.OPEN) {
                this.ws.send(JSON.stringify({
                    "forget": this.tickSubscriptionId,
                    "req_id": this.getNextReqId()
                }));

                // Aguardar um pouco para o comando ser processado
                await new Promise(resolve => setTimeout(resolve, 200));
            }

            // Limpar estado local
            this.tickCallbacks.clear();
            this.activeSubscriptions.clear();
            this.tickSubscriptionId = null;
            this.currentActiveSymbol = null;
            this.activeSymbol = null;

        } catch (error) {

        }
    }

    // 🔧 CORRIGIDO: Cancelar subscrições sem desativar PING/PONG
    async stopAllTicks() {

        try {
            if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {

                return { success: false, reason: 'WebSocket não conectado' };
            }

            // 🔧 CRÍTICO: Cancelar subscrições mas MANTER conexão e PING/PONG ativos
            const response = await this.sendRequest({
                "forget_all": "ticks",
                "req_id": this.getNextReqId()
            });

            // Limpar estado local de subscrições
            this.activeSubscriptions.clear();
            this.tickCallbacks.clear();
            this.tickSubscriptionId = null;
            this.currentActiveSymbol = null;

            // ✅ CRÍTICO: GARANTIR que PING/PONG continue ativo mesmo sem subscrições
            if (!this.keepAliveInterval) {

                this.startKeepAlive();
            }

            return { success: true, response };

        } catch (error) {
            console.error('❌ [STOP TICKS] Erro ao cancelar subscrições:', error);
            return { success: false, error: error.message };
        }
    }

    hasActiveSubscription() {
        // 🔧 CORREÇÃO: Verificação mais robusta de subscrições ativas
        if (!this.activeSubscriptions) {
            return false;
        }

        const activeCount = Object.keys(this.activeSubscriptions).length;

        // Verificar se as subscrições realmente estão ativas
        const reallyActiveSubscriptions = Object.values(this.activeSubscriptions).filter(sub => {
            return sub && sub.active !== false && sub.reqId;
        });

        return reallyActiveSubscriptions.length > 0;
    }

    // 💰 NOVO: Subscrever ao stream de balance da Deriv
    async subscribeToBalance(callback) {

        // ✅ VALIDAÇÃO INICIAL
        if (!this.isReady()) {
            await this.connect();
            if (!this.isReady()) {
                throw new Error("Falha ao conectar WebSocket para subscrição de balance");
            }
        }

        // Se já existe subscrição, apenas adicionar callback
        if (this.balanceSubscriptionId) {

            if (!this.balanceCallbacks) {
                this.balanceCallbacks = new Set();
            }
            this.balanceCallbacks.add(callback);

            return () => {
                if (this.balanceCallbacks) {
                    this.balanceCallbacks.delete(callback);
                }
            };
        }

        // Criar nova subscrição
        const reqId = this.getNextReqId();
        this.balanceSubscriptionId = reqId;
        this.balanceCallbacks = new Set([callback]);

        try {
            this._safeWebSocketSend({
                "balance": 1,
                "subscribe": 1,
                "req_id": reqId
            });

            // Retornar função de cleanup
            return () => {
                if (this.balanceCallbacks) {
                    this.balanceCallbacks.delete(callback);

                    // Se não há mais callbacks, cancelar subscrição
                    if (this.balanceCallbacks.size === 0) {
                        this.unsubscribeFromBalance();
                    }
                }
            };

        } catch (error) {
            console.error('❌ [BALANCE] Erro ao subscrever:', error);
            this.balanceSubscriptionId = null;
            this.balanceCallbacks = null;
            throw error;
        }
    }

    // 💰 NOVO: Cancelar subscrição de balance
    async unsubscribeFromBalance() {
        if (this.balanceSubscriptionId && this.ws && this.ws.readyState === WebSocket.OPEN) {
            try {

                this.ws.send(JSON.stringify({
                    "forget": this.balanceSubscriptionId,
                    "req_id": this.getNextReqId()
                }));

                this.balanceSubscriptionId = null;
                this.balanceCallbacks = null;

            } catch (error) {

            }
        }
    }

    // 💰 NOVO: Handler para mensagens de balance
    handleBalance(data) {
        if (data.error) {
            console.error('❌ [BALANCE] Erro:', data.error);
            return;
        }

        if (data.balance) {
            const balanceData = {
                balance: parseFloat(data.balance.balance),
                currency: data.balance.currency,
                loginid: data.balance.loginid
            };

            // Executar callbacks registrados
            if (this.balanceCallbacks && this.balanceCallbacks.size > 0) {
                this.balanceCallbacks.forEach(callback => {
                    try {
                        callback(balanceData);
                    } catch (error) {
                        console.error('❌ [BALANCE] Erro em callback:', error);
                    }
                });
            }

            // Disparar evento global para compatibilidade
            window.dispatchEvent(new CustomEvent('balanceUpdated', {
                detail: balanceData
            }));

            // ✅ CORREÇÃO: Resolver promessa pendente (evitar timeout)
            const reqId = data.echo_req?.req_id;
            if (reqId && this.subscriptions.has(reqId)) {
                const subscription = this.subscriptions.get(reqId);
                subscription.resolve(data);
                this.subscriptions.delete(reqId);
            }
        }
    }


    handleTick(data) {
        if (!data || !data.tick) return;

        const tick = data.tick;
        const symbol = tick.symbol;
        const price = tick.quote;
        const timestamp = tick.epoch;

        // ✅ NOVO: Registrar recebimento de tick para monitoramento de inatividade
        this.lastTickReceived = Date.now();

        // 🎯 NOVO: Atualizar atividade do monitoramento (sistema está recebendo dados)
        this.lastMonitoringActivity = Date.now();

        if (data.error) {
            const errorDetails = {
                message: data.error.message || 'Erro desconhecido',
                code: data.error.code || 'N/A',
                details: data.error.details || 'N/A',
                symbol: data.echo_req?.ticks || 'desconhecido',
                full_error: data.error
            };

            // ✅ TRATAMENTO ESPECIAL: Erro AlreadySubscribed
            if (data.error.code === 'AlreadySubscribed') {
                const symbol = data.echo_req?.ticks;

                // ✅ CORREÇÃO: SEMPRE enviar forget para AlreadySubscribed para limpar duplicatas
                setTimeout(() => {
                    try {
                        const forgetReqId = this.getNextReqId();
                        this._safeWebSocketSend({
                            "forget": data.echo_req.req_id,
                            "req_id": forgetReqId
                        });

                    } catch (cleanupError) {
                        console.error('❌ [ALREADY SUBSCRIBED] Erro na limpeza:', cleanupError);
                    }
                }, 100);

                return; // Não processar tick duplicado
            }

            // Para outros erros, mostrar erro completo
            console.error("❌ Erro no tick:", JSON.stringify(errorDetails, null, 2));
            return;
        }

        // ✅ SIMPLIFICADO: Filtro básico para ativo fixo da sessão
        if (symbol !== this.currentActiveSymbol) {
            // Log ocasional para debug apenas se receber ativo diferente (não deveria acontecer)

            return;
        }

        // ✅ FILTRO DE TIMESTAMP: Evitar ticks duplicados do mesmo segundo
        const tickKey = `${symbol}_${timestamp}_${price}`;
        if (this.lastProcessedTick === tickKey) {

            return;
        }

        // ✅ NOVO: Filtro adicional baseado em timestamp recente (últimos 2 segundos)
        const currentTime = Date.now();
        const recentTickWindow = 2000; // 2 segundos

        if (!this.recentTicks) {
            this.recentTicks = new Map();
        }

        // Limpar ticks antigos do buffer
        for (const [key, timestamp] of this.recentTicks.entries()) {
            if (currentTime - timestamp > recentTickWindow) {
                this.recentTicks.delete(key);
            }
        }

        // Verificar se tick já foi processado recentemente
        if (this.recentTicks.has(tickKey)) {
            const lastTimestamp = this.recentTicks.get(tickKey);
            if (currentTime - lastTimestamp < 1000) { // Menos de 1 segundo

                return;
            }
        }

        // Registrar tick atual
        this.lastProcessedTick = tickKey;
        this.recentTicks.set(tickKey, currentTime);

        // ✅ ATUALIZAR buffer centralizado PRIMEIRO (Protegido)
        try {
            this.updatePriceBuffer(symbol, price, timestamp);
        } catch (e) {
            console.error('❌ Erro no updatePriceBuffer:', e);
        }

        // 🎯 NOVO: Atualizar detecção de casas decimais (Protegido)
        try {
            this.updateDecimalDetection(symbol, price);
        } catch (e) {
            console.error('❌ Erro no updateDecimalDetection:', e);
        }

        // ✅ EVENTO GLOBAL: Apenas para atualização do saldo (throttled) (Protegido)
        try {
            if (!this.lastBalanceEvent || Date.now() - this.lastBalanceEvent > 1000) {
                this.lastBalanceEvent = Date.now();
                window.dispatchEvent(new CustomEvent('marketDataUpdate', {
                    detail: {
                        symbol: symbol,
                        price: price,
                        time: timestamp,
                        type: 'tick'
                    }
                }));
            }
        } catch (e) {
            console.error('❌ Erro no evento global marketDataUpdate:', e);
        }

        // ⏰ NOVO: Calcular intervalo do sistema nos primeiros ticks (Protegido)
        try {
            this.calculateSystemTickInterval(currentTime);
        } catch (e) {
            console.error('❌ Erro no calculateSystemTickInterval:', e);
        }

        // ⏰ Sistema 2 removido - usando apenas cálculo inicial

        // ✅ EXECUTAR CALLBACKS IMEDIATAMENTE SEM THROTTLING
        if (this.tickCallbacks.has(symbol) && this.tickCallbacks.get(symbol).size > 0) {
            // Adicionar ao histórico tradicional para compatibilidade
            this.addTickToHistory(symbol, price, timestamp);

            // Executar todos os callbacks imediatamente
            const callbacks = this.tickCallbacks.get(symbol);
            callbacks.forEach(callback => {
                try {
                    callback(price);
                } catch (error) {
                    console.error(`❌ Erro ao executar callback para ${symbol}:`, error);
                }
            });
        }
        // ✅ FALLBACK: Callback antigo
        else if (this.tickCallback && this.currentActiveSymbol && symbol === this.currentActiveSymbol) {
            this.addTickToHistory(symbol, price, timestamp);
            try {
                this.tickCallback(price);
            } catch (error) {
                console.error(`❌ Erro ao executar callback principal para ${symbol}:`, error);
            }
        }

    }

    // ✅ CORREÇÃO: Atualizar buffer para símbolo ativo e manter buffers específicos
    updatePriceBuffer(symbol, price, time) {
        // ✅ Atualizar buffer específico do símbolo
        if (!this.priceBuffer.has(symbol)) {
            this.priceBuffer.set(symbol, []);
        }

        const symbolBuffer = this.priceBuffer.get(symbol);
        symbolBuffer.push(price);

        // Manter apenas os últimos 50 preços no buffer específico
        if (symbolBuffer.length > this.bufferSize) {
            symbolBuffer.shift();
        }

        // ✅ Se for o símbolo ativo, atualizar também o buffer ativo
        if (this.activeSymbol === symbol) {
            this.activePriceBuffer.push(price);

            // Manter apenas os últimos 50 preços no buffer ativo
            if (this.activePriceBuffer.length > this.bufferSize) {
                this.activePriceBuffer.shift();
            }

            // Notificar componentes sobre atualização
            this.notifyBufferUpdate(symbol, this.activePriceBuffer);
        }
    }

    // ✅ NOVO: Notificar callbacks sobre atualização do buffer
    notifyBufferUpdate(symbol, prices) {
        const data = {
            symbol: symbol,
            prices: prices,
            count: prices.length,
            lastUpdate: Date.now()
        };

        this.bufferUpdateCallbacks.forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error('❌ [BUFFER] Erro em callback de atualização:', error);
            }
        });
    }

    handleProposal(data) {
        if (data.error) {
            return;
        }
    }

    async getProposal(contractType, symbol, options = {}) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            throw new Error("WebSocket não conectado");
        }

        const reqId = this.getNextReqId();

        const proposal = {
            "proposal": 1,
            "amount": options.amount || 10,
            "barrier": options.barrier || undefined,
            "basis": options.basis || "stake",
            "contract_type": contractType,
            "currency": options.currency || "USD",
            "duration": options.duration || 5,
            "duration_unit": options.durationUnit || "t",
            "symbol": symbol,
            "req_id": reqId
        };
        Object.keys(proposal).forEach(key =>
            proposal[key] === undefined && delete proposal[key]
        );
        this._safeWebSocketSend(proposal);
    }

    // Disconnect método com proteção aprimorada
    disconnect() {
        // ✅ DIAGNÓSTICO: Capturar quem está chamando disconnect
        const stack = new Error().stack;
        const caller = stack.split('\n')[2]?.trim() || 'desconhecido';

        // 🔧 CRÍTICO: Marcar como disconnect explícito
        this.isExplicitDisconnect = true;
        this.isAuthorized = false;

        // ✅ CRÍTICO: Parar PING/PONG apenas na desconexão real
        this.stopKeepAlive();

        // Limpar intervalos ativos
        if (this.inactivityCheckInterval) {
            clearInterval(this.inactivityCheckInterval);
            this.inactivityCheckInterval = null;
        }

        // Limpar callbacks e subscrições
        this.tickCallbacks.clear();
        this.activeSubscriptions.clear();
        if (this.messageCallbacks) {
            this.messageCallbacks.clear();
        }

        // ✅ MELHORADO: Gerenciar WebSocket com mais cuidado
        if (this.ws) {
            try {
                const currentState = this.ws.readyState;

                // Remover event listeners antes de fechar
                if (this.wsHandlers) {
                    if (this.wsHandlers.open) this.ws.removeEventListener('open', this.wsHandlers.open);
                    if (this.wsHandlers.message) this.ws.removeEventListener('message', this.wsHandlers.message);
                    if (this.wsHandlers.error) this.ws.removeEventListener('error', this.wsHandlers.error);
                    if (this.wsHandlers.close) this.ws.removeEventListener('close', this.wsHandlers.close);
                }

                // Só tentar fechar se o WebSocket estiver em estado apropriado
                if (currentState === WebSocket.OPEN) {
                    this.ws.close(1000, 'Desconexão programática');
                } else if (currentState === WebSocket.CONNECTING) {
                    // Para WebSocket em estado CONNECTING, aguardar um momento antes de forçar close

                    setTimeout(() => {
                        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                            this.ws.close(1000, 'Desconexão programática');
                        }
                    }, 200);
                }
                // Se já está CLOSED ou CLOSING, não fazer nada

            } catch (closeError) {

            }

            this.ws = null;
        }

        // Reset flag após desconectar
        this.isExplicitDisconnect = false;

    }

    // ✅ CORRIGIDO: Sistema de monitoramento de inatividade ESTRITO
    // REQUISITO: O sistema DEVE reconectar se os ticks pararem
    startInactivityMonitor() {
        if (this.inactivityCheckInterval) {
            clearInterval(this.inactivityCheckInterval);
        }

        // Verificar a cada 1 segundo (muito mais agressivo)
        this.inactivityCheckInterval = setInterval(() => {
            if (!this.isReady()) return;

            // Se estiver em modo de reconexão ou troca de conta, ignorar
            if (this.isReconnecting || this.isAccountSwitchInProgress) return;

            // Se não tiver subscrição ativa, não precisa monitorar ticks
            if (!this.hasActiveSubscription()) return;

            const now = Date.now();
            const timeSinceLastTick = now - this.lastTickReceived;
            const timeSinceLastPong = now - this.lastPongReceived;

            // 🚨 REQUISITO DO USUÁRIO: Se parar de receber ticks, RECONECTAR
            // Threshold agressivo de 5 segundos (se passar 5s sem tick em mercado ativo, algo está errado)
            if (timeSinceLastTick > 5000) {
                console.warn(`⚠️ [WATCHDOG] Sem ticks há ${timeSinceLastTick}ms. Forçando reconexão...`);

                // Disparar evento de warning para UI
                window.dispatchEvent(new CustomEvent('marketDataStalled', {
                    detail: { timeSinceLastTick }
                }));

                // Forçar reconexão imediata
                this.forceReconnect();
                return;
            }

            // Monitor de PONG (conexão morta silenciosa)
            if (timeSinceLastPong > 30000 && this.isPingPongActive) {
                console.warn(`⚠️ [WATCHDOG] Sem PONG há ${timeSinceLastPong}ms. Forçando reconexão...`);
                this.forceReconnect();
            }
        }, 1000);
    }


    // ✅ PROCESSAR PONG - SEMPRE ATUALIZAR lastPongReceived
    handlePong(data) {
        // ✅ CRÍTICO: SEMPRE atualizar lastPongReceived quando PONG chegar
        this.lastPongReceived = Date.now();

        // 1. Resolver promessa se houver subscrição (GENÉRICO - Suporta Handshake e Keep-Alive)
        const reqId = data.req_id;
        if (reqId && this.subscriptions.has(reqId)) {
            const subscription = this.subscriptions.get(reqId);

            // Cancelar timeout de segurança se existir (Handshake)
            if (subscription.timeoutId) {
                clearTimeout(subscription.timeoutId);
            }

            if (typeof subscription.resolve === 'function') {
                subscription.resolve(data);
            }
        }

        // 2. Lógica específica do Sistema Keep-Alive
        if (this.activePingReqId && reqId === this.activePingReqId) {
            this.consecutivePingFailures = 0;

            if (this.pingTimeout) {
                clearTimeout(this.pingTimeout);
                this.pingTimeout = null;
            }

            this.subscriptions.delete(this.activePingReqId);
            this.activePingReqId = null;
        }
        // 3. Limpeza genérica para outros Pings (ex: Handshake)
        else if (reqId && this.subscriptions.has(reqId)) {
            this.subscriptions.delete(reqId);
        }
    }

    forceReconnect() {
        // Proteção anti-reentrada
        if (this.isReconnecting) {
            return;
        }

        // Limitar frequência de reconexões
        const now = Date.now();
        const timeSinceLastReconnect = now - (this.lastReconnectAttempt || 0);
        if (timeSinceLastReconnect < 5000) {
            return;
        }
        this.lastReconnectAttempt = now;

        if (this.reconnectAttempts >= 10) {
            this.isReconnecting = false;

            setTimeout(() => {
                this.reconnectAttempts = 0;
                this.forceReconnect();
            }, 60000);

            window.dispatchEvent(new CustomEvent('derivConnectionTemporaryFailure'));
            return;
        }


        const timeSinceLastTick = Date.now() - this.lastTickReceived;
        const timeSinceLastPong = Date.now() - this.lastPongReceived;


        this.isReconnecting = true;
        this.reconnectAttempts++;

        // ✅ LIMPEZA COMPLETA antes de reconectar
        if (this.inactivityCheckInterval) {
            clearInterval(this.inactivityCheckInterval);
            this.inactivityCheckInterval = null;
        }
        // 🔧 CRÍTICO: NÃO chamar stopKeepAlive - manter PING ativo durante reconexão

        // ✅ CRÍTICO: Salvar apenas O SÍMBOLO ATIVO atual (não todas as subscrições)
        const currentActiveSymbol = this.currentActiveSymbol || this.activeSymbol;

        // ✅ LIMPEZA AGRESSIVA: Limpar TODAS as subscrições e callbacks
        this.activeSubscriptions.clear();
        this.tickCallbacks.clear();
        this.subscriptions.clear();

        // Resetar IDs e flags
        this.tickSubscriptionId = null;
        this.tickCallback = null;

        // Fechar conexão atual
        if (this.ws) {
            this.ws.close(1000, 'Reconexão programática');
            this.ws = null;
        }

        // Reconectar após delay progressivo
        setTimeout(() => {
            this.connect().then(async () => {
                this.isReconnecting = false;
                this.reconnectAttempts = 0;

                this.startKeepAlive();

                // ✅ RESUBSCREVER APENAS O SÍMBOLO ATIVO ATUAL (aguardar conclusão)
                if (currentActiveSymbol) {
                    await this.resubscribeToSingleSymbol(currentActiveSymbol);
                }

                // ✅ CRÍTICO: Disparar evento APENAS após subscription estar restaurada
                // Debounce de eventos
                if (this.lastReconnectEventTime && (Date.now() - this.lastReconnectEventTime < 2000)) {
                    return;
                }
                this.lastReconnectEventTime = Date.now();

                window.dispatchEvent(new CustomEvent('derivWebSocketReconnected', {
                    detail: {
                        symbol: currentActiveSymbol,
                        timestamp: Date.now(),
                        reconnectAttempt: this.reconnectAttempts,
                        subscriptionRestored: true
                    }
                }));
            }).catch(error => {
                console.error(`❌ [DERIV RECONNECT] Falha na reconexão (tentativa ${this.reconnectAttempts}):`, error.message);
                this.isReconnecting = false;
                // ✅ CORRIGIDO: Continuar tentando indefinidamente a cada 5 segundos
                console.log(`🔄 [DERIV RECONNECT] Próxima tentativa em 5 segundos...`);
                setTimeout(() => this.forceReconnect(), 5000);
            });
        }, Math.min(2000 * this.reconnectAttempts, 10000)); // Max 10s delay
    }

    async resubscribeToSingleSymbol(symbol) {
        // ✅ SIMPLIFICADO: Resubscrição para ativo fixo da sessão
        if (!symbol || symbol !== this.currentActiveSymbol) {

            return;
        }

        try {
            // Aguardar conexão estável
            let attempts = 0;
            while ((!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.isAuthorized) && attempts < 20) {
                await new Promise(resolve => setTimeout(resolve, 200));
                attempts++;
            }

            if (!this.isReady()) {
                console.error('❌ [DERIV RECONNECT] WebSocket não está pronto');
                return;
            }

            // Limpar estado local
            this.activeSubscriptions.clear();
            this.tickCallbacks.clear();
            this.tickSubscriptionId = null;
            this.lastProcessedTick = null;

            // Enviar forget_all para garantir limpeza no servidor
            try {
                this._safeWebSocketSend({
                    "forget_all": "ticks",
                    "req_id": this.getNextReqId()
                });
                await new Promise(resolve => setTimeout(resolve, 500));
            } catch (e) {
                console.warn('⚠️ [FORGET_ALL] Erro:', e.message);
            }

            // Reconfigurar estado
            const validCallback = this.findValidCallback(symbol);
            if (!validCallback) {
                console.error(`❌ [DERIV RECONNECT] Callback não encontrado para ${symbol}`);
                return;
            }

            this.tickCallback = validCallback;
            this.tickCallbacks.set(symbol, new Set([validCallback]));
            this.activeSubscriptions.add(symbol);

            // Criar nova subscrição
            const reqId = this.getNextReqId();
            this.tickSubscriptionId = reqId;

            this._safeWebSocketSend({
                "ticks": symbol,
                "subscribe": 1,
                "req_id": reqId
            });


        } catch (error) {
            console.error(`❌ [DERIV RECONNECT] Erro ao resubscrever:`, error);
            this.performEmergencyReset();
        }
    }

    // ✅ NOVO: Garantir que callbacks são válidos
    ensureValidCallbacks(symbol) {
        let validCallback = this.findValidCallback(symbol);

        if (validCallback) {
            // Atualizar com callback válido
            this.tickCallback = validCallback;
            this.tickCallbacks.set(symbol, new Set([validCallback]));

        }
    }

    // ✅ NOVO: Encontrar callback válido
    findValidCallback(symbol) {
        // Buscar instância ativa do DisplayView para o símbolo
        if (window.__displayInstances) {
            const instances = Object.values(window.__displayInstances);
            const activeInstance = instances.find(instance =>
                instance &&
                typeof instance.handleNewTick === 'function' &&
                instance.currentSymbol === symbol &&
                !instance.isDestroyed
            );

            if (activeInstance) {
                return (price) => {
                    try {
                        activeInstance.handleNewTick(price);
                    } catch (error) {
                        console.error('❌ Erro no callback principal:', error);
                    }
                };
            }
        }

        // ✅ FALLBACK: Callback genérico
        return (price) => {
            if (window.__displayInstances) {
                const instances = Object.values(window.__displayInstances);
                const firstInstance = instances.find(inst => inst && !inst.isDestroyed);
                if (firstInstance && typeof firstInstance.handleNewTick === 'function') {
                    try {
                        firstInstance.handleNewTick(price);
                    } catch (error) {
                        console.error('❌ Erro no callback genérico:', error);
                    }
                }
            }
        };
    }

    // ✅ NOVO: Reset completo apenas em emergências
    performEmergencyReset() {
        console.error('🚨 [EMERGENCY RESET] Executando reset completo devido a erro crítico');

        this.activeSubscriptions.clear();
        this.tickCallbacks.clear();
        this.subscriptions.clear();
        this.tickSubscriptionId = null;
        this.tickCallback = null;
        this.currentActiveSymbol = null;
        this.activeSymbol = null;
        this.lastProcessedTick = null;
    }

    getActiveSymbolsList() {
        return this.activeSymbols;
    }

    getSymbolContracts(symbol) {
        return this.contracts[symbol] || null;
    }

    // ✅ NOVO: Método principal para obter preços do buffer centralizado
    getPriceBuffer(symbol, count = null) {
        // ✅ CORREÇÃO: Se o símbolo solicitado é diferente do ativo, usar buffer específico
        let bufferPrices = [];

        if (symbol === this.activeSymbol && this.activePriceBuffer.length > 0) {
            // Usar buffer ativo se for o mesmo símbolo
            bufferPrices = this.activePriceBuffer;
        } else if (this.priceBuffer.has(symbol)) {
            // Usar buffer específico do símbolo
            bufferPrices = this.priceBuffer.get(symbol);
        } else {
            // Tentar buffer do histórico tradicional como fallback
            const historicalData = this.historicalData[symbol];
            if (historicalData && historicalData.prices) {
                bufferPrices = historicalData.prices;
            }
        }

        const prices = count ? bufferPrices.slice(-count) : bufferPrices;
        return {
            prices: prices,
            count: prices.length
        };
    }

    // ✅ NOVO: Verificar se buffer está pronto para um símbolo
    isBufferReady(symbol) {
        return this.isBufferReady.get(symbol) === true &&
            this.priceBuffer.has(symbol) &&
            this.priceBuffer.get(symbol).length > 0;
    }

    // ✅ NOVO: Obter últimos N preços de um símbolo
    getLastNPrices(symbol, count) {
        const bufferData = this.getPriceBuffer(symbol, count);
        return bufferData.prices;
    }

    // ✅ NOVO: Obter último preço de um símbolo
    getLastPrice(symbol) {
        const prices = this.getLastNPrices(symbol, 1);
        return prices.length > 0 ? prices[0] : null;
    }

    // ✅ NOVO: Obter últimos N dígitos de um símbolo
    getLastNDigits(symbol, count) {
        const prices = this.getLastNPrices(symbol, count);
        return prices.map(price => this.extractLastDigitForAsset(price, symbol));
    }

    // ✅ NOVO: Calcular estatísticas de dígitos (percentuais)
    getDigitStats(period = 100) {
        // Usar símbolo ativo ou o último solicitado
        const symbol = this.currentActiveSymbol || this.activeSymbol;
        if (!symbol) return Array(10).fill(0);

        const digits = this.getLastNDigits(symbol, period);

        if (!digits || digits.length === 0) {
            return Array(10).fill(0);
        }

        const counts = Array(10).fill(0);
        digits.forEach(d => {
            if (d !== null && d >= 0 && d <= 9) {
                counts[d]++;
            }
        });

        const total = digits.length;
        return counts.map(count => (count / total) * 100);
    }

    // ✅ NOVO: Obter dados completos para display (preços + dígitos)
    getDisplayData(symbol) {
        const bufferData = this.getPriceBuffer(symbol, 25);
        const prices = bufferData.prices;

        return {
            lastPrice: prices.length > 0 ? prices[prices.length - 1] : null,
            last3Prices: prices.slice(-3),
            last10Digits: prices.slice(-10).map(p => this.extractLastDigitForAsset(p, symbol)),
            last25Digits: prices.slice(-25).map(p => this.extractLastDigitForAsset(p, symbol)),
            symbol: symbol,
            timestamp: Date.now()
        };
    }

    // ✅ NOVO: Registrar callback para updates do buffer
    onBufferUpdate(callback) {
        this.bufferUpdateCallbacks.add(callback);
        return () => this.bufferUpdateCallbacks.delete(callback); // Retorna função de cleanup
    }

    // ✅ NOVO: Obter estatísticas do buffer
    getBufferStats() {
        const stats = {
            totalSymbols: this.priceBuffer.size,
            readySymbols: 0,
            symbols: {}
        };

        for (const [symbol, buffer] of this.priceBuffer.entries()) {
            const isReady = this.isBufferReady.get(symbol) === true;
            if (isReady) stats.readySymbols++;

            stats.symbols[symbol] = {
                count: buffer.length,
                maxSize: this.bufferSize,
                isReady: isReady,
                completion: Math.round((buffer.length / this.bufferSize) * 100)
            };
        }
        return stats;
    }

    // Métodos públicos para acessar o histórico centralizado (compatibilidade)
    getHistoricalTicks(symbol, count = null) {
        const startTime = performance.now();
        // ✅ PRIORIZAR buffer centralizado
        const bufferData = this.getPriceBuffer(symbol, count);
        if (bufferData.prices.length > 0) {
            return {
                prices: bufferData.prices,
                times: [], // Times não são críticos para a maioria dos casos
                lastUpdate: bufferData.lastUpdate
            };
        }

        const historyResult = count ? this.getLastNTicks(symbol, count) : this.getFullHistory(symbol);

        const duration = performance.now() - startTime;
        if (duration > 3) {
            console.warn(`[PERF] getHistoricalTicks (${symbol}) took ${duration.toFixed(2)}ms`);
        }
        return historyResult;
    }

    getDataStats() {
        const totalTicks = Object.values(this.historicalData).reduce((sum, history) => sum + history.prices.length, 0);

        return {
            sessionId: this.sessionId,
            activeSymbolsCount: this.activeSymbols.length,
            contractsCount: Object.keys(this.contracts).length,
            historicalSymbolsCount: Object.keys(this.historicalData).length,
            totalHistoricalTicks: totalTicks,
            connectionStatus: this.ws ? this.ws.readyState : 'disconnected'
        };
    }

    // Limpar dados históricos (para manutenção)
    clearHistoricalData() {
        localStorage.removeItem(`historical_data_${this.sessionId}`);
        this.historicalData = {};
    }

    // 🎯 NOVO: Detectar quantas casas decimais um preço possui
    detectDecimalPlaces(price) {
        const priceStr = price.toString();
        const decimalIndex = priceStr.indexOf('.');

        if (decimalIndex === -1) {
            return 0; // Preço inteiro
        }

        // Contar casas decimais reais (incluindo zeros finais se estiverem na string)
        return priceStr.length - decimalIndex - 1;
    }

    // 🎯 NOVO: Analisar padrão de casas decimais de um ativo
    analyzeAssetDecimalPattern(symbol, prices) {
        // 🎯 NOVO: Analisar padrão de casas decimais de um ativo com base nos metadados da API (Authoritative)
        const activeSymbolData = this.activeSymbols.find(s => s.symbol === symbol);
        if (activeSymbolData && activeSymbolData.pip) {
            // pip geralmente é 0.01, 0.001 etc. Logs10(1/pip) = casas decimais
            // Ex: 0.001 -> 1000 -> log10(1000) = 3
            const decimals = Math.log10(1 / activeSymbolData.pip);
            return Math.round(decimals);
        }

        if (!prices || prices.length === 0) return 3; // Default fallback

        const decimalCounts = {};
        let samplesAnalyzed = 0;

        // Analisar até 50 amostras recentes
        const samplesToAnalyze = Math.min(50, prices.length);
        const recentPrices = prices.slice(-samplesToAnalyze);

        for (const price of recentPrices) {
            const decimals = this.detectDecimalPlaces(price);
            decimalCounts[decimals] = (decimalCounts[decimals] || 0) + 1;
            samplesAnalyzed++;
        }

        // Encontrar o padrão mais comum
        let mostCommon = 3; // Default
        let maxCount = 0;

        for (const [decimals, count] of Object.entries(decimalCounts)) {
            if (count > maxCount) {
                maxCount = count;
                mostCommon = parseInt(decimals);
            }
        }

        // Validar se é um padrão consistente (pelo menos 60% das amostras)
        const consistency = (maxCount / samplesAnalyzed) * 100;

        if (consistency >= 60) {
            return mostCommon;
        } else {

            return 3; // Fallback para padrão inconsistente
        }
    }

    // 🎯 NOVO: Obter casas decimais de um ativo (com cache e detecção automática)
    getAssetDecimalPlaces(symbol) {
        // ✅ PRIMEIRO: Verificar se já temos casas decimais no cache
        const cachedDecimals = this.assetDecimalPlaces.get(symbol);
        if (cachedDecimals !== undefined) {
            return cachedDecimals;
        }

        // ✅ SEGUNDO: Tentar analisar buffer de preços (MAIS CONFIÁVEL)
        const bufferData = this.priceBuffer.get(symbol);
        if (bufferData && bufferData.prices && bufferData.prices.length >= 10) {
            const detectedDecimals = this.analyzeAssetDecimalPattern(symbol, bufferData.prices);
            this.assetDecimalPlaces.set(symbol, detectedDecimals);

            return detectedDecimals;
        }

        // ✅ TERCEIRO: Tentar usar pip_size da API (se disponível)
        if (this.marketInfo && this.marketInfo.active_symbols) {
            const assetInfo = this.marketInfo.active_symbols.find(asset => asset.symbol === symbol);

            if (assetInfo && assetInfo.pip_size) {
                try {
                    const pipSizeStr = assetInfo.pip_size.toString();
                    if (pipSizeStr && pipSizeStr.includes('.')) {
                        const decimalPart = pipSizeStr.split('.')[1];
                        if (decimalPart && decimalPart.length) {
                            const decimalPlaces = decimalPart.length;
                            this.assetDecimalPlaces.set(symbol, decimalPlaces);

                            return decimalPlaces;
                        }
                    }
                } catch (error) {
                    console.error('❌ [DECIMAL PLACES] Erro ao processar pip_size:', error);
                }
            }
        }

        // ✅ FALLBACK FINAL: Retornar padrão baseado no tipo de ativo
        const fallbackDecimals = symbol.startsWith('R_') ? 3 : 2;

        return fallbackDecimals;
    }

    // ✅ MELHORADO: Extrair último dígito usando detecção automática de casas decimais
    extractLastDigitForAsset(price, symbol) {
        try {
            if (typeof price !== 'number' || price === null || price === undefined) {
                return null;
            }

            // Obter casas decimais detectadas para este ativo
            let detectedDecimals = this.assetDecimalPlaces.get(symbol);

            // Se não temos detecção para este símbolo, detectar automaticamente
            if (!detectedDecimals) {
                const priceStr = price.toString();
                const decimalIndex = priceStr.indexOf('.');

                if (decimalIndex !== -1) {
                    detectedDecimals = priceStr.length - decimalIndex - 1;
                    this.assetDecimalPlaces.set(symbol, detectedDecimals);
                } else {
                    detectedDecimals = 0;
                }
            }

            // ✅ CORREÇÃO: Respeitar exatamente as casas decimais detectadas, com mínimo de 1
            const effectiveDecimals = Math.max(1, detectedDecimals);
            const multiplier = Math.pow(10, effectiveDecimals);
            const processedPrice = Math.round(price * multiplier);

            // Extrair último dígito
            const lastDigit = processedPrice % 10;



            return lastDigit;
        } catch (error) {
            console.error(`❌ [DECIMAL EXTRACTION] Erro para ${symbol}:`, error);
            return null;
        }
    }

    // ✅ NOVO: Atualizar detecção de casas decimais com novos ticks
    updateDecimalDetection(symbol, price) {
        // Manter amostras dos últimos preços para análise contínua
        if (!this.decimalSamples.has(symbol)) {
            this.decimalSamples.set(symbol, []);
        }

        const samples = this.decimalSamples.get(symbol);
        samples.push(price);

        // Manter apenas as últimas 30 amostras
        if (samples.length > 30) {
            samples.shift();
        }

        // Re-analisar padrão a cada 10 amostras
        if (samples.length % 10 === 0 && samples.length >= 20) {
            const newDecimalPlaces = this.analyzeAssetDecimalPattern(symbol, samples);
            const currentDecimalPlaces = this.assetDecimalPlaces.get(symbol);

            // Se detectou mudança no padrão, atualizar (log apenas ocasional)
            if (currentDecimalPlaces !== newDecimalPlaces) {
                // Log apenas 5% das vezes para reduzir spam

                this.assetDecimalPlaces.set(symbol, newDecimalPlaces);
            }
        }
    }

    // Limpar dados de um símbolo
    clearSymbolData(symbol) {
        delete this.historicalData[symbol];
        this.priceBuffer.delete(symbol);
        this.decimalSamples.delete(symbol);
        this.assetDecimalPlaces.delete(symbol);
        this.saveHistoricalData(); // Salvar após remoção
    }


    // 🔧 HELPERS INTERNOS (FASE 2 Refatoração)

    // 🔐 NOVO: Método para obter usuário atual com fallback seguro
    _getCurrentUser() {
        try {
            // ✅ CORRIGIDO: Sempre retornar usuário atual, mesmo durante troca de conta
            // Dados de mercado são independentes da conta do usuário
            return SessionManager.getCurrentUser();
        } catch (error) {
            return null;
        }
    }

    _logDebug(message, frequency = 0.1) {

    }

    // ✅ MELHORIA 3: Método seguro para envio via WebSocket com validação de readyState
    _safeWebSocketSend(data) {
        if (!this.ws) {

            return false;
        }

        if (this.ws.readyState !== WebSocket.OPEN) {

            return false;
        }

        try {
            this.ws.send(JSON.stringify(data));
            return true;
        } catch (error) {
            console.error('❌ [WS SEND] Erro ao enviar mensagem:', error);
            return false;
        }
    }

    _isWebSocketReady() {
        return this.ws && this.ws.readyState === WebSocket.OPEN && this.isAuthorized;
    }

    // ✅ NOVO: Função para logar o impacto da reconexão nas operações em curso
    logReconnectionImpact() {


        // Trade Manager
        if (typeof window.tradeManagerInstance !== 'undefined') {
            const tradeManager = window.tradeManagerInstance;

        }

        // Mensagens de Trade
        if (typeof getTradeMessagesInstance === 'function') {
            const tradeMessages = getTradeMessagesInstance();
            if (tradeMessages && tradeMessages.messageBuffer) {

            }
        }

        // Overlay no DOM
        const overlayExists = document.querySelector('.cooldown-overlay-modal');

        console.groupEnd();
    }

    // ✅ PING/PONG SEMPRE ATIVO: Manter WebSocket vivo
    // ✅ NOVO: Atualizar token (usado na troca de conta)
    async updateToken(token) {
        if (this.token === token) return; // Mesmo token, nada a fazer


        this.token = token;

        // Se conectado, re-autorizar imediatamente
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.isAuthorized = false; // Resetar flag temporariamente

            try {
                await this.sendRequest({
                    "authorize": this.token,
                    "req_id": this.getNextReqId()
                });

                this.isAuthorized = true;

                // Reiniciar PING/PONG com novo contexto
                this.stopKeepAlive();
                this.startKeepAlive();

            } catch (error) {
                console.error('[MarketData] Falha na re-autorização com novo token:', error);
                this.forceReconnect(); // Fallback para reconexão total
            }
        }
    }

    startKeepAlive() {
        // Verificar se já está ativo
        if (this.keepAliveInterval) {
            return;
        }

        // Só iniciar se conectado e autorizado
        if (!this.isReady()) {
            return;
        }

        this.isPingPongActive = true;

        // PING a cada 30 segundos
        this.keepAliveInterval = setInterval(() => {
            this.sendPing();
        }, CONFIG.API.PING_INTERVAL);

        // Enviar PING imediato
        this.sendPing();

        // Atualizar timestamp do último pong
        this.lastPongReceived = Date.now();
    }

    // ✅ Parar sistema PING/PONG completamente
    stopKeepAlive() {

        this.isPingPongActive = false;

        if (this.keepAliveInterval) {
            clearInterval(this.keepAliveInterval);
            this.keepAliveInterval = null;
        }

        if (this.pingTimeout) {
            clearTimeout(this.pingTimeout);
            this.pingTimeout = null;
        }

        this.activePingReqId = null;
    }


    // ✅ NOVO: Enviar PING de forma segura (apenas quando PING/PONG ativo)
    sendPing() {
        // ✅ Verificar se PING/PONG está habilitado
        if (!this.isPingPongActive) {
            return;
        }

        // Verificar se WebSocket está pronto
        if (!this.isReady()) {
            return;
        }

        // Verificar se há PING pendente
        if (this.activePingReqId) {
            const timeSincePing = Date.now() - (this.lastPingTime || 0);
            if (timeSincePing < CONFIG.API.PONG_TIMEOUT) { // Se PING foi enviado há menos tempo que o timeout, aguardar
                return;
            } else {
                // PING anterior não teve resposta há mais de 25s - considerar timeout

                this.consecutivePingFailures++;
            }
        }

        try {
            const pingReqId = this.getNextReqId();
            this.activePingReqId = pingReqId;
            this.lastPingTime = Date.now();

            // Registrar subscrição para o PING
            this.subscriptions.set(pingReqId, {
                type: 'ping',
                resolve: () => { },
                reject: () => { }
            });

            // Enviar PING
            this._safeWebSocketSend({
                "ping": 1,
                "req_id": pingReqId
            });

            // ✅ Configurar timeout para PONG (15 segundos)
            this.pingTimeout = setTimeout(() => {
                if (this.activePingReqId === pingReqId) {

                    this.consecutivePingFailures++;
                    this.activePingReqId = null;

                    // Se muitas falhas consecutivas, tentar reconectar
                    if (this.consecutivePingFailures >= 3) {
                        console.error('❌ [PING FAILURE] 3 PINGs consecutivos falharam - forçando reconexão');
                        this.consecutivePingFailures = 0;
                        this.forceReconnect();
                    }
                }
            }, 15000);

        } catch (error) {
            console.error('❌ [PING ERROR] Erro ao enviar PING:', error);
        }
    }
}

// ✅ NOVO: Sistema de instâncias persistentes por usuário
const persistentInstances = new Map(); // loginId -> MarketDataInstance

function getMarketDataInstance(token) {
    console.log("PASSOU token ",  token);
    if (!token) {
        console.error('❌ [MARKET DATA] Token não fornecido');
        return null;
    }
    
    const currentUser = SessionManager.getCurrentUser();
    if (!currentUser || !currentUser.authorize || !currentUser.authorize.loginid) {
        // Durante troca de conta, silenciar erro e retornar instância global se existir
        if (window.accountSwitchInProgress && window.marketDataInstance) {
            return window.marketDataInstance;
        }
        console.error('❌ [MARKET DATA] LoginId não encontrado');
        return null;
    }

    // ✅ CRÍTICO: Durante troca de conta, REUTILIZAR instância existente
    // Dados de mercado são do ATIVO, não da CONTA
    if (window.marketDataInstance && window.marketDataInstance.token) {
        const existingInstance = window.marketDataInstance;

        // Se token mudou, apenas atualizar sem criar nova instância
        if (existingInstance.token !== token) {

            existingInstance.updateToken(token);
        }

        // Atualizar mapeamento para novo loginId
        persistentInstances.set(currentUser.authorize.loginid, existingInstance);

        return existingInstance;
    }

    // ✅ REUTILIZAR instância existente se for o mesmo usuário
    if (persistentInstances.has(currentUser.authorize.loginid)) {
        const existingInstance = persistentInstances.get(currentUser.authorize.loginid);

        // Verificar se token mudou (renovação de token)
        if (existingInstance.token === token) {

            return existingInstance;
        } else {

            existingInstance.updateToken(token);
            return existingInstance;
        }
    }


    const newInstance = new DerivMarketData(token);
    persistentInstances.set(currentUser.authorize.loginid, newInstance);
    window.marketDataInstance = newInstance; // Expor globalmente para uso em caso de troca de conta

    return newInstance;
}

// ✅ NOVO: Função para forçar nova instância (casos especiais)
function forceNewMarketDataInstance(token) {
    const currentUser = SessionManager.getCurrentUser();
    const loginId = currentUser?.authorize?.loginid;

    if (loginId && persistentInstances.has(loginId)) {
        const oldInstance = persistentInstances.get(loginId);


        try {
            oldInstance.disconnect();

        } catch (error) {

        }
        persistentInstances.delete(loginId);

    }

    const newInstance = getMarketDataInstance(token);

    return newInstance;
}

// ✅ NOVO: Cleanup ao fazer logout completo
function cleanupAllMarketDataInstances() {
    for (const [loginId, instance] of persistentInstances.entries()) {
        try {
            instance.disconnect();
        } catch (error) {

        }
    }
    persistentInstances.clear();
    window.marketDataInstance = null; // Limpar referência global
}

// Expor globalmente para uso em outros arquivos
window.DerivMarketData = DerivMarketData;
window.getMarketDataInstance = getMarketDataInstance; // Mantido para compatibilidade
window.forceNewMarketDataInstance = forceNewMarketDataInstance;
window.cleanupAllMarketDataInstances = cleanupAllMarketDataInstances; // Exportado para ser chamado no logout

// ✅ EXPOR função globalmente
window.getMarketDataInstance = getMarketDataInstance;