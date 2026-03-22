// js/trade-manager.js
// Sistema de gerenciamento de trading com modos SIMULAÇÃO, REAL e VIRTUAL
// O SISTEMA DEVE SER 100% ISOLADO POR USUARIO

// 📋 LOGGING: Usar definição global de logConfig (definida em common-helpers.js)

// 🔧 FUNÇÃO AUXILIAR: Extrair últimos 4 dígitos de um preço
function getLast4DigitsTM(price) {
    if (!price) return '????';
    const priceStr = price.toString().replace('.', '');
    return priceStr.slice(-4);
}

class TradeManager {
    constructor() {

        this.sessionId = SessionManager.getUserSessionId();
        this.currentMode = 'SIMULACAO'; // SIMULACAO, REAL, VIRTUAL

        // 🔄 NOVO: Instanciar módulos de trading (se disponíveis)
        this._initializeModules();
        this.isActive = false;
        this.currentContract = null;
        this.contractStartTime = null;
        this.contractStartPrice = null;
        this.awaitingExpiration = false;
        this.lastCompletedContract = null;

        // Contadores para controle de modo
        this.realWinsStreak = 0;
        this.realLossesStreak = 0;
        this.simulatedLossesStreak = 0;
        this.simulatedWinsStreak = 0;

        // 🎯 NOVO: Flag simples para Gale seletivo em modo BOTH
        // Exemplo: { 'DIGITOVER': true, 'DIGITUNDER': false } = apenas DIGITOVER usa Gale
        this.pendingGaleByContract = {};

        // 🔧 NOVO: Flag para evitar múltiplos popups
        this.popupShown = false;

        // 🔧 NOVO: Flag específica para modal de limite de trades
        this.tradeLimitModalShown = false;

        // 🔧 NOVO: Flag para evitar loop infinito do modal de saldo insuficiente
        this.insufficientBalanceModalShown = false;

        this.sessionProfitLoss = 0; // Lucro/perda total da sessão
        this.initialBalance = 0; // Saldo inicial para referência

        // 🔧 CORRIGIDO: Set para rastrear múltiplos contratos sendo monitorados simultaneamente (suporte a modo BOTH)
        this.monitoringContracts = new Set();

        // 🎯 CRÍTICO: Map para armazenar dados específicos de cada contrato (contractId => contractData)
        this.activeContracts = new Map();

        this.lastSatisfiedGroupId = null;

        // 🎰 NOVO: Flag para aplicação pendente de Gale após transição de modo
        this.pendingGaleApplication = false;

        // 🔍 Validar integridade na inicialização
        //this.validateUserAccess();

        // Configurações atuais
        this.config = this.loadConfiguration();

        // 🔄 LISTENER: Reagir à troca de conta
        window.addEventListener('accountSwitched', async (event) => {

            // Aguardar um pouco para garantir que os dados foram salvos
            setTimeout(async () => {
                try {
                    await this.updateAccountBalance();
                } catch (error) {
                }
            }, 1000);
        });

        setTimeout(() => {
            this.syncWithUIConfiguration();
        }, 500);

        // Callbacks para UI updates
        this.onModeChange = null;
        this.onTradeStart = null;
        this.onTradeEnd = null;
        this.onConfigUpdate = null;

        // 🎰 NOVO: Inicializar sistema de Gale
        this.initializeGaleSystem();

        // 🎰 NOVO: Variáveis para controle de perdas acumuladas do Gale
        this.accumulatedLosses = 0; // Perdas acumuladas para cálculo do Gale

        // 🎰 NOVO: Variável para armazenar payout real da proposta
        this.currentProposalPayout = null;

        // 🎰 NOVO: Variável para armazenar último stake calculado do Gale
        this.lastCalculatedStake = null;

        // ⚡ OTIMIZAÇÃO: Variáveis para pré-cálculo de Gale após LOSS
        this.lastContractPayout = null; // Payout do último contrato finalizado
        this.nextTradeStake = null; // Stake pré-calculado com Gale para próximo trade

        // 🔄 NOVO: Variáveis para controle de transições visuais após cooldown
        this.pendingModeTransition = null;
        this.pendingVisualUpdate = null;
        this.pendingModeProcessing = null; // Para atrasar mudanças de modo até após cooldown

        // 📊 NOVO: Inicializar contadores de histórico
        this.historyCounters = {
            realWinsTotal: 0,
            realLossesTotal: 0,
            simulatedWinsTotal: 0,
            simulatedLossesTotal: 0,
            totalContractsExecuted: 0,  // 🎯 Total de CONTRATOS executados (reais + simulados)
            totalRealContractsExecuted: 0,  // 🎯 Total de CONTRATOS REAIS executados (display permanente)
            tradeLimitCounter: 0  // 🎯 NOVO: Contador independente para verificar limite (reseta automaticamente)
        };

        // 🎯 CRÍTICO: Inicializar variável tradeReal
        this.tradeReal = false;

        // ✅ PROTEÇÃO: Flag para evitar múltiplas mensagens do mesmo trade
        this.currentTradeMessageAdded = false;

        // 🔧 NOVO: Set para rastrear contratos já processados em trades simultâneos
        this.processedContracts = new Set();

        // 🎯 NOVO: Sistema de rastreamento de grupos BOTH (trades duplos)
        // Estrutura: groupId => {contracts: Set, results: Map(contractId => isWin), expectedCount: N, mode: string}
        this.bothTradeGroups = new Map();
        this.nextBothGroupId = 1; // Contador para gerar groupIds únicos

        // ⚡ OTIMIZAÇÃO: Conexão persistente para trades reais (elimina latência de reconexão)
        this.tradingAPI = null;
        this.tradingAPIConnected = false;

        // ⚡ OTIMIZAÇÃO CRÍTICA: Cache de proposals para eliminar latência de 200-800ms
        this.proposalCache = null; // {id, payout, timestamp, stake}
        this.proposalCacheExpiry = 30000; // 30 segundos
        this.proposalCacheUpdateInterval = null;
        this.isFetchingProposal = false;

        // 🔒 PROTEÇÃO: Flag para bloquear trades durante troca de conta
        this.isAccountSwitching = false;

        // 📋 NOVO: Armazenar regras traduzidas para análise de contratos
        this.translatedRules = null;

        this.tradesExecutedInCurrentTick = 0;
        this.lastTickTimestamp = null;

        // 📈 NOVO: Variáveis para controle da Estratégia Soros
        this.sorosWins = 0;           // Contador de wins atuais no ciclo Soros
        this.nextSorosStake = null;   // Valor da próxima stake calculada (Stake + Lucro)
        this.sorosLimit = 0;          // Limite configurado (0 = desativado)
        this.sorosPercentage = 100;   // Porcentagem do lucro a ser reinvestida (padrão: 100%)
        this.galeRemovesSoros = false; // Se true, remove Soros ao calcular Gale (usa apenas stake base)

        // 📊 NOVO: Sistema de Tempo de Pausa
        this.pauseTradeCounter = 0;   // Contador de trades reais (wins ou losses)
        this.isPaused = false;        // Estado de pausa
    }

    // 🔄 REFATORAÇÃO: Inicializar módulos de trading separados
    _initializeModules() {
        try {
            // Carregar configuração primeiro
            this.config = this.loadConfiguration();

            if (typeof TradeSessionConfig !== 'undefined') {
                this.sessionConfig = new TradeSessionConfig(this.sessionId);
            }

            if (typeof TradeContractSelector !== 'undefined') {
                this.contractSelector = new TradeContractSelector(this.sessionId, this.config);
            }

            if (typeof TradeModeRiskController !== 'undefined') {

                this.riskController = new TradeModeRiskController(this.sessionId, this.config);

                // Sincronizar callbacks de mudança de modo
                this.riskController.onModeChange = (mode, reason) => {
                    this.currentMode = mode;

                    // 🧹 CRÍTICO: Limpar flags de Gale ao trocar de modo (evitar contaminação cross-mode)
                    this.pendingGaleByContract = {};

                    if (this.onModeChange) {
                        this.onModeChange(mode, reason);
                    }
                };
            }

            if (typeof TradeSettlementReporter !== 'undefined') {
                this.settlementReporter = new TradeSettlementReporter(this.sessionId);
            }

        } catch (error) {
            console.error('❌ [TradeManager] Erro fatal ao inicializar módulos:', error);
        }
    }

    // 🎰 NOVO: Inicializar sistema de Gale
    initializeGaleSystem() {
        // Inicializar variáveis do Gale se não existirem
        if (typeof this.accumulatedLosses === 'undefined') {
            this.accumulatedLosses = 0;
        }
    }

    // 🎯 CONTADOR POR TICK: Determinar limite de trades baseado no modo
    getTradeLimit() {
        // Modo BOTH permite 2 trades por tick (OVER + UNDER)
        // Modo normal permite apenas 1 trade por tick
        return this.isBothModeActive() ? 2 : 1;
    }

    // 🎯 CONTADOR POR TICK: Resetar contador a cada novo tick
    resetTradesCounter(tickTimestamp) {
        // ✅ CORREÇÃO: Normalizar timestamp para segundos (epoch)
        // tick.epoch vem em segundos, Date.now() em milissegundos
        const normalizedTimestamp = tickTimestamp > 9999999999
            ? Math.floor(tickTimestamp / 1000)  // Converter milissegundos para segundos
            : Math.floor(tickTimestamp);        // Já está em segundos

        // Só reseta se for um novo tick (timestamp diferente)
        if (normalizedTimestamp !== this.lastTickTimestamp) {
            this.tradesExecutedInCurrentTick = 0;
            this.lastTickTimestamp = normalizedTimestamp;
            logConfig.debug('trade_manager', `🔄 [CONTADOR] Resetado para novo tick: ${normalizedTimestamp} (original: ${tickTimestamp})`);
        }
    }

    // 🎯 CONTADOR POR TICK: Verificar se pode executar trade
    canExecuteTrade() {
        // 🛡️ FAILSAFE DE EXECUÇÃO: Se a flag isExecutingTrade estiver travada por muito tempo (ex: erro desconhecido)
        // resetar automaticamente se passou mais de 60 segundos desde o início do contrato
        
        if (this.isExecutingTrade && this.contractStartTime) {
            const stuckDuration = Date.now() - this.contractStartTime;
            if (stuckDuration > 60000) { // 60 segundos de tolerância máxima
                console.warn(`⚠️ [FAILSAFE] isExecutingTrade travado por ${stuckDuration}ms. Resetando forçadamente!`);
                this.isExecutingTrade = false;
                this.awaitingExpiration = false;
            }
        }

        const limit = this.getTradeLimit();
        const canExecuteInTick = this.tradesExecutedInCurrentTick < limit;
        if (!canExecuteInTick) {
            logConfig.debug('trade_manager', `🚫 [CONTADOR] Limite atingido: ${this.tradesExecutedInCurrentTick}/${limit} trades no tick atual`);
        }

        return canExecuteInTick;
    }

    // 🎯 CONTADOR POR TICK: Incrementar contador após executar trade
    incrementTradesCounter() {
        this.tradesExecutedInCurrentTick++;
        const limit = this.getTradeLimit();
        logConfig.info('trade_manager', `✅ [CONTADOR] Trade executado: ${this.tradesExecutedInCurrentTick}/${limit} no tick atual`);
    }

    // 🔄 REFATORADO: Delegar para TradeModeRiskController
    shouldApplyGale() {
        if (this.riskController) {
            return this.riskController.shouldApplyGale();
        }

        // Fallback legado
        // 🎰 CORREÇÃO: Usar apenas accumulatedLosses (realLossesStreak reseta nas transições)
        const isGaleConfigActive = this.config.galeActive === true;
        const hasAccumulatedLosses = this.accumulatedLosses > 0;
        return isGaleConfigActive && hasAccumulatedLosses;
    }

    // Executar trade imediato (chamado pelo botão ou atalho)
    // ✅ MODAL FIX: Adicionado parâmetro forceMode para garantir execução no modo correto
    async executeImmediateTrade(contractType, customPrediction = null, customSymbol = null, forceMode = null) {
        if (this.isPaused) {
            throw new Error("Sistema em pausa. Aguarde o fim da contagem regressiva.");
        }
        try {

            // ✅ CRÍTICO: Inicializar tradingAPI se não estiver pronto
            // Isso garante que o modal funcione mesmo se aberto antes do monitoramento inicializar
            if (!this.tradingAPI) {

                await this.initializeTradingConnection();
            }

            // Validar se API está pronta
            if (!this.tradingAPI) {
                throw new Error(i18n.t('alerts.api_error'));
            }

            // Usar símbolo fornecido ou o atual
            const symbol = customSymbol || window.selectedSymbol;
            if (!symbol) {
                throw new Error(i18n.t('alerts.select_symbol'));
            }

            // Obter preço atual
            const currentPrice = this.marketData ? this.marketData.getLastPrice(symbol) : 0;

            // Salvar configurações originais para restaurar depois
            const originalContractType = this.config.contractType;
            const originalPrediction = this.config.prediction;

            this.config.contractType = contractType;
            this.config.symbol = symbol;

            // Determinar modo de execução
            // Se forceMode for fornecido, usa ele. Senão, usa o modo atual.
            const actualMode = forceMode || this.currentMode;

            // Capturar modo anterior para restauração garantida
            const previousMode = this.currentMode;

            try {
                // Obter previsão se necessário
                let prediction = customPrediction;

                if (this.requiresPrediction(contractType)) {
                    if (prediction === null) {
                        // Tentar obter da estratégia ou usar padrão
                        const defaultPredictions = {
                            'DIGITOVER': 5,
                            'DIGITUNDER': 4,
                            'DIGITMATCH': 5,
                            'DIGITDIFF': 5,
                            'DIGITODD': null,
                            'DIGITEVEN': null
                        };

                        prediction = defaultPredictions[contractType];


                        if (prediction === undefined) {
                            throw new Error(`Previsão é obrigatória para ${contractType} e não foi definida`);
                        }
                    }
                }

                // Configurar previsão se fornecida
                if (prediction !== null && prediction !== undefined) {
                    this.config.prediction = {
                        type: 'prediction',
                        value: prediction
                    };
                }

                let result;

                if (actualMode === 'SIMULACAO') {
                    // ✅ CORREÇÃO: Bypassar limite de trades por tick (trades imediatos sempre executam)
                    // ✅ MODAL FIX: Passar preço atual como entryPrice
                    result = await this.executeSimulatedTrade(currentPrice, true);

                    // executeSimulatedTrade pode retornar false (falha) ou { results: [...], successCount: ... } (sucesso)
                    if (result === false) {
                        throw new Error('executeSimulatedTrade retornou false - verifique logs para detalhes');
                    }

                    if (result && result.results && result.results.length > 0) {
                        const firstResult = result.results[0];

                        return {
                            success: true,
                            contractId: 'simulated-' + Date.now(),
                            stake: firstResult.actualStake || this.config.stake,
                            contractType: contractType,
                            payout: 0, // Simulação não tem payout real
                            mode: actualMode,
                            isSimulation: true
                        };
                    } else {
                        throw new Error(i18n.t('alerts.sim_execution_error'));
                    }

                } else {

                    // 🎯 CRÍTICO: Atualizar currentMode para que executeRealTrade() passe o guard de modo
                    // Mas APENAS se estivermos forçando um modo diferente
                    if (forceMode && forceMode !== previousMode) {
                        this.currentMode = forceMode;
                    }

                    // ✅ MODAL FIX: Resetar estado de Gale para trades imediatos
                    // Trades do modal são independentes e não devem usar Gale
                    const savedAccumulatedLosses = this.accumulatedLosses;
                    const savedNextTradeStake = this.nextTradeStake;
                    this.accumulatedLosses = 0;
                    this.nextTradeStake = null;

                    try {
                        // 🎯 Executar trade real (com bypass de limite e supressão de efeitos globais)
                        result = await this.executeRealTrade(currentPrice, true, { suppressGlobalSideEffects: true });
                    } finally {
                        // Restaurar estado de Gale
                        this.accumulatedLosses = savedAccumulatedLosses;
                        this.nextTradeStake = savedNextTradeStake;
                    }

                    // ✅ MODAL FIX: executeRealTrade agora retorna objeto com contractId
                    if (result && result.success) {

                        return {
                            success: true,
                            contractId: result.contractId,
                            stake: result.stake,
                            contractType: contractType,
                            payout: result.payout,
                            mode: actualMode,
                            isSimulation: false
                        };
                    } else {
                        throw new Error(i18n.t('alerts.trade_execution_error', { mode: actualMode }));
                    }
                }

            } catch (innerError) {
                throw innerError;
            } finally {
                // 🔄 RESTAURAÇÃO GARANTIDA
                // Restaurar configurações originais
                this.config.contractType = originalContractType;
                this.config.prediction = originalPrediction;

                // Restaurar modo se foi alterado
                if (forceMode && forceMode !== previousMode) {
                    this.currentMode = previousMode;
                }
            }

        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Roteia para simulação ou real baseado no modo atual


    // Verificar se contrato requer previsão
    requiresPrediction(contractType) {
        const digitContracts = ['DIGITOVER', 'DIGITUNDER', 'DIGITMATCH', 'DIGITDIFF'];
        return digitContracts.includes(contractType);
    }

    // Construir parâmetros da proposta
    buildProposalParams() {
        const params = {
            proposal: 1,
            contract_type: this.config.contractType,
            symbol: this.config.symbol || window.selectedSymbol,
            duration: this.config.duration || 1,
            duration_unit: this.config.durationUnit || 't',
            basis: 'stake',
            amount: this.config.stake || 0.35
        };

        // Adicionar barrier para contratos que precisam
        if (this.config.prediction && this.config.prediction.value !== null && this.config.prediction.value !== undefined) {
            const contractType = this.config.contractType;
            if (['DIGITOVER', 'DIGITUNDER', 'DIGITMATCH', 'DIGITDIFF'].includes(contractType)) {
                params.barrier = this.config.prediction.value;
            }
        }

        // Adicionar barrier para contratos CALLE/PUTE
        if (this.config.barrier && ['CALLE', 'PUTE'].includes(this.config.contractType)) {
            params.barrier = this.config.barrier;
        }

        return params;
    }


    // 🔄 REFATORADO: Delegar para TradeSessionConfig
    validateUserAccess() {
        if (this.sessionConfig) {
            return this.sessionConfig.validateUserAccess();
        }

        // Fallback legado
        const currentUser = SessionManager.getCurrentUser();
        if (currentUser && !SessionManager.validateDataIntegrity()) {
            CommonHelpers.showWarning(i18n.t('alerts.integrity_error'));
        }
    }

    // 🔐 Carregar configuração com segurança (isolada por usuário)
    loadConfiguration() {
        try {
            const currentUser = SessionManager.getCurrentUser();
            if (!currentUser) {
                CommonHelpers.showWarning(i18n.t('alerts.no_user_logged'));
                return this.getDefaultConfiguration();
            }

            const userConfigKey = `trade_config_user_${currentUser.loginid}`;
            const userSaved = localStorage.getItem(userConfigKey);

            // Se existe configuração específica do usuário, usar ela
            if (userSaved) {
                try {
                    const userParsedData = JSON.parse(userSaved);
                    const userConfig = userParsedData.config || userParsedData;

                    const defaultConfig = this.getDefaultConfiguration();
                    const finalConfig = { ...defaultConfig, ...userConfig };

                    // ✅ MIGRAÇÃO: Normalizar barreira antiga (sem sinal) para novo formato
                    // Aceitar valor 0 (não usar || que trata 0 como falsy)
                    const barrierToMigrate = finalConfig.barrier !== null && finalConfig.barrier !== undefined
                        ? finalConfig.barrier
                        : finalConfig.prediction?.value;


                    if (barrierToMigrate !== null && barrierToMigrate !== undefined) {
                        finalConfig.barrier = this.migrateBarrierValue(barrierToMigrate);

                    }

                    if (finalConfig.prediction && (finalConfig.prediction.value !== null && finalConfig.prediction.value !== undefined)) {
                        finalConfig.prediction.value = this.migrateBarrierValue(finalConfig.prediction.value);
                    }


                    return finalConfig;
                } catch (userError) {
                    CommonHelpers.showWarning(i18n.t('alerts.config_error'), userError);
                }
            }

            // Fallback: tentar configuração de sessão (sistema antigo)
            const saved = localStorage.getItem(`trade_config_${this.sessionId}`);
            const defaultConfig = this.getDefaultConfiguration();

            if (!saved) {

                return defaultConfig;
            }

            const parsedData = JSON.parse(saved);

            // 🔍 Validar que os dados pertencem ao usuário atual
            if (parsedData._userId && parsedData._userId !== currentUser.loginid) {
                CommonHelpers.showWarning(i18n.t('alerts.other_user_config'));
                return defaultConfig;
            }

            // 📊 Extrair configuração real dos metadados
            const config = parsedData.config || parsedData;
            const finalConfig = { ...defaultConfig, ...config };

            // ✅ MIGRAÇÃO: Normalizar barreira antiga (sem sinal) para novo formato
            // Aceitar valor 0 (não usar || que trata 0 como falsy)
            const barrierToMigrate = finalConfig.barrier !== null && finalConfig.barrier !== undefined
                ? finalConfig.barrier
                : finalConfig.prediction?.value;
            if (barrierToMigrate !== null && barrierToMigrate !== undefined) {
                finalConfig.barrier = this.migrateBarrierValue(barrierToMigrate);
            }

            if (finalConfig.prediction && (finalConfig.prediction.value !== null && finalConfig.prediction.value !== undefined)) {
                finalConfig.prediction.value = this.migrateBarrierValue(finalConfig.prediction.value);
            }

            return finalConfig;
        } catch (error) {
            CommonHelpers.showError(i18n.t('alerts.config_load_error'), error);
            return this.getDefaultConfiguration();
        }
    }

    // 📋 Obter configuração padrão (sem valores padrão de ativo e contrato)
    getDefaultConfiguration() {
        return {
            duration: 1,
            durationUnit: 't',
            stake: 0.35,
            goal: 1,
            stopLoss: 100,
            realWinsLimit: 5,
            realLossesLimit: 1,
            simulatedLossesLimit: 1,
            simulatedWinsLimit: 0,
            prediction: { type: 'none', value: 1 },
            symbol: SessionManager.getSessionData('selected_symbol'), // 🎯 NOVO: Apenas símbolo da sessão (sem fallback)
            // 🎰 CORREÇÃO: Configurações do Gale - usar valor do usuário
            galeAdjustment: this.getGaleAdjustmentFromUI() || 1, // Usar valor definido pelo usuário ou 1 como fallback
            galeSplit: 1, // Padrão: Sem divisão
            galeSplitThreshold: 0, // Padrão: Sem threshold
            galeActive: true, // Sempre ativo
            tradeLimit: 0, // 🔧 NOVO: Limite de trades reais (0 = ilimitado)
            cooldownPeriod: 3, // 🔧 NOVO: Período de cooldown (ticks extras, 0 = duração natural apenas)
            sorosLimit: 0, // 📈 NOVO: Limite de Soros (0 = desativado)
            sorosPercentage: 100, // 📈 NOVO: Porcentagem do lucro Soros (padrão: 100%)
            galeRemovesSoros: false, // 📈 NOVO: Remove Soros do Gale (padrão: false = comportamento atual)
            countRepeated: true // 🎯 NOVO: Padrão é contar todos os dígitos
        };
    }

    // ✅ MIGRAÇÃO: Converter barreira antiga (sem sinal) para novo formato
    migrateBarrierValue(barrierValue) {
        // ✅ CORREÇÃO: Aceitar valor 0 (não usar ! que trata 0 como falsy)
        if (barrierValue === null || barrierValue === undefined) return null;

        const strValue = String(barrierValue).trim();

        // Se já tem sinal, retornar como está
        if (/^[+-]/.test(strValue)) {
            return strValue;
        }

        // Se é número sem sinal, adicionar "+"
        const numValue = parseFloat(strValue);
        if (!isNaN(numValue)) {
            const migrated = numValue >= 0 ? `+${numValue}` : String(numValue);

            return migrated;
        }

        // Se não é número válido, retornar null

        return null;
    }

    // ✅ NOVA FUNÇÃO: Obter preço atual do mercado (reutiliza getCurrentPrice existente)
    getCurrentMarketPrice() {
        try {
            // ✅ CORREÇÃO: Usar getCurrentPrice() que já existe no TradeManager
            const currentPrice = this.getCurrentPrice();

            if (currentPrice && !isNaN(currentPrice)) {
                return parseFloat(currentPrice);
            }


            return null;
        } catch (error) {
            console.error('❌ [MARKET PRICE] Erro ao obter preço:', error);
            return null;
        }
    }

    // ✅ NOVA FUNÇÃO: Normalizar barreira com sinal (+/-) para número com sinal
    parseSignedBarrier(barrierStr) {
        if (!barrierStr) return null;

        const barrierRegex = /^([+-])(\d+(?:\.\d+)?)$/;
        const match = String(barrierStr).trim().match(barrierRegex);

        if (!match) {

            return null;
        }

        const sign = match[1];
        const value = parseFloat(match[2]);
        const signedValue = sign === '+' ? value : -value;

        return {
            raw: barrierStr.trim(),
            sign: sign,
            absoluteValue: value,
            signedValue: signedValue
        };
    }

    // 🔐 Salvar configuração com segurança
    saveConfiguration() {
        try {
            const currentUser = SessionManager.getCurrentUser();
            if (!currentUser) {
                CommonHelpers.showWarning(i18n.t('alerts.save_error'));
                return false;
            }

            // 🔒 Usar operação segura para evitar race conditions
            return SessionManager.safeStorageOperation(`trade_config_${this.sessionId}`, () => {
                // 📊 Adicionar metadados de segurança
                const dataToSave = {
                    config: this.config,
                    _userId: currentUser.loginid,
                    _timestamp: Date.now(),
                    _sessionId: this.sessionId
                };

                // 💾 Salvar na sessão atual (compatibilidade)
                localStorage.setItem(`trade_config_${this.sessionId}`, JSON.stringify(dataToSave));

                const userConfigKey = `trade_config_user_${currentUser.loginid}`;
                const userDataToSave = {
                    config: this.config,
                    _userId: currentUser.loginid,
                    _timestamp: Date.now(),
                    _lastSession: this.sessionId
                };

                localStorage.setItem(userConfigKey, JSON.stringify(userDataToSave));


                return true;
            });
        } catch (error) {
            CommonHelpers.showError(i18n.t('alerts.config_save_error'), error);
            return false;
        }
    }

    isBothModeActive() {
        // 1. Verificar seleção na UI
        const tradeTypeSelect = CommonHelpers.getElement('trade-type-select');
        const uiActive = tradeTypeSelect?.value === 'BOTH';

        if (uiActive) return true;

        // 2. Verificar se as Regras (via MonitoringView) solicitaram execução múltipla
        // Se capturedPredictionsForTrade contém múltiplos contratos distintos, forçamos o modo Both
        if (this.capturedPredictionsForTrade && Array.isArray(this.capturedPredictionsForTrade) && this.capturedPredictionsForTrade.length > 1) {
            // Filtrar apenas contratos válidos e contar tipos distintos
            const distinctContracts = new Set(
                this.capturedPredictionsForTrade
                    .map(p => p.contractType)
                    .filter(c => c && c !== 'null' && c !== 'undefined')
            );

            if (distinctContracts.size > 1) {
                // logConfig.info('trade_manager', '⚡ [BOTH MODE] Ativado automaticamente pelas regras da estratégia');
                return true;
            }
        }

        return false;
    }

    // 🎯 NOVA FUNÇÃO: Obter o contrato correto para execução
    getSelectedContractType() {
        // Usar a verificação inteligente de Modo Both (UI ou Regras Automáticas)
        if (this.isBothModeActive()) {
            return null; // Será processado pela lógica do modo Ambos
        }

        const tradeTypeSelect = CommonHelpers.getElement('trade-type-select');
        const selectedValue = tradeTypeSelect?.value;

        // Se um contrato específico foi selecionado, retornar ele
        if (selectedValue && selectedValue !== 'BOTH') {
            return selectedValue;
        }

        // Fallback: usar contractType da configuração
        const contractType = this.config.contractType;
        return contractType;
    }

    // 🔄 REFATORADO: Delegar para TradeContractSelector
    getBothContracts() {
        if (this.contractSelector) {
            return this.contractSelector.getBothContracts();
        }

        // Fallback legado (implementação original)
        const contractSelect = CommonHelpers.getElement('contract-select');
        if (!contractSelect?.value) return null;

        const contractGroups = {
            'Over/Under': ['DIGITOVER', 'DIGITUNDER'],
            'Call/Put': ['CALL', 'PUT'],
            'Higher/Lower': ['CALLE', 'PUTE'],
            'Differ/Match': ['DIGITDIFF', 'DIGITMATCH'],
            'Even/Odd': ['DIGITEVEN', 'DIGITODD'],
            'Touch/No Touch': ['TOUCH', 'NOTOUCH'],
            'Asian Up/Down': ['ASIANU', 'ASIAND'],
            'Reset Call/Put': ['RESETCALL', 'RESETPUT'],
            'Tick High/Low': ['TICKHIGH', 'TICKLOW'],
            'Run High/Low': ['RUNHIGH', 'RUNLOW']
        };

        const selectedOption = contractSelect.options[contractSelect.selectedIndex];
        const groupName = selectedOption?.getAttribute('data-group');

        if (groupName && contractGroups[groupName]) {
            const contracts = contractGroups[groupName];
            const filteredContracts = contracts.filter(c => {
                const configView = window.ConfigurationsView || {};
                if (configView.availableContracts) {
                    return configView.availableContracts.some(ac => ac.contract_type === c);
                }
                return true;
            });

            return { groupName, contracts: filteredContracts };
        }

        const selectedContract = contractSelect.value;
        for (const [groupName, contracts] of Object.entries(contractGroups)) {
            if (contracts.includes(selectedContract)) {
                const filteredContracts = contracts.filter(c => {
                    const configView = window.ConfigurationsView || {};
                    if (configView.availableContracts) {
                        return configView.availableContracts.some(ac => ac.contract_type === c);
                    }
                    return true;
                });

                return { groupName, contracts: filteredContracts };
            }
        }

        return null;
    }

    // 🔄 REFATORADO: Delegar para TradeContractSelector
    determineContractsForBothMode(bothContracts, satisfiedGroupId = null, executionMode = null, forceSync = false, capturedPredictions = null) {
        // Se capturamos previsões mas elas não foram passadas explicitamente, usar o cache da instância
        const finalCapturedPredictions = capturedPredictions || this.capturedPredictionsForTrade;

        if (this.contractSelector) {


            // 🔧 CORREÇÃO: Garantir que as regras traduzidas estejam disponíveis
            if (!this.contractSelector.translatedRules && this.translatedRules) {
                this.contractSelector.translatedRules = this.translatedRules;
            }

            // 🔧 CORREÇÃO: Passar as regras traduzidas e previsões capturadas para o selector
            const result = this.contractSelector.determineContractsForBothMode(
                bothContracts,
                satisfiedGroupId,
                this.config,
                this.translatedRules,
                finalCapturedPredictions
            );

            // 🎯 DEBUG: Verificar se múltiplos contratos foram detectados
            if (Array.isArray(result) && result.length > 1) {
            } else if (Array.isArray(result) && result.length === 1) {
            }

            return result;
        }


        const fallbackResult = bothContracts.contracts || [];

        return fallbackResult;
    }

    // Para previsões DINÂMICAS (ex: "differ from repeated digit"), use capturedPredictionForTrade
    extractSpecificPredictionsFromRules(contractsToExecute, satisfiedGroupId = null) {
        const predictions = {};

        try {
            // 🔍 Se não há grupo satisfeito, não tem como extrair configurações específicas
            if (!satisfiedGroupId) {

                return predictions;
            }

            // 🎯 PEGAR A ESTRATÉGIA ORIGINAL DO DOM (mesma abordagem do TradeContractSelector)
            const strategyText = document.getElementById('strategy-text');

            if (!strategyText?.value?.trim()) {

                return predictions;
            }

            const strategyContent = strategyText.value.trim();

            // Dividir a estratégia em linhas (cada linha com * é uma regra separada)
            const strategyLines = strategyContent.split('*')
                .map(line => line.trim())
                .filter(line => line.length > 0);

            // Grupo 1 = linha 0, Grupo 2 = linha 1, Grupo 3 = linha 2
            const lineIndex = satisfiedGroupId - 1;

            if (lineIndex < 0 || lineIndex >= strategyLines.length) {

                return predictions;
            }

            const targetLine = strategyLines[lineIndex];



            // 🎯 REGEX MELHORADA para detectar contratos com previsões específicas
            const contractPredictionRegex = /(over|under|match|differ|even|odd)\s+(\d)/gi;

            // Analisar APENAS o texto da linha do grupo satisfeito
            const groupText = targetLine.toLowerCase();

            const matches = [...groupText.matchAll(contractPredictionRegex)];



            for (const match of matches) {
                const contractWord = match[1].toLowerCase();
                const prediction = parseInt(match[2]);

                // Mapear palavra para tipo de contrato
                let contractType = null;
                if (contractWord === 'over' && contractsToExecute.includes('DIGITOVER')) {
                    contractType = 'DIGITOVER';
                } else if (contractWord === 'under' && contractsToExecute.includes('DIGITUNDER')) {
                    contractType = 'DIGITUNDER';
                } else if (contractWord === 'match' && contractsToExecute.includes('DIGITMATCH')) {
                    contractType = 'DIGITMATCH';
                } else if (contractWord === 'differ' && contractsToExecute.includes('DIGITDIFF')) {
                    contractType = 'DIGITDIFF';
                } else if (contractWord === 'even' && contractsToExecute.includes('DIGITEVEN')) {
                    contractType = 'DIGITEVEN';
                } else if (contractWord === 'odd' && contractsToExecute.includes('DIGITODD')) {
                    contractType = 'DIGITODD';
                }

                if (contractType && prediction >= 0 && prediction <= 9) {
                    predictions[contractType] = prediction;

                }
            }

        } catch (error) {
        }

        return predictions;
    }


    calculateBothTradeCountingResult(successCount, totalContracts) {

        if (successCount === 0) {
            // Todos os contratos falharam = 1 PERDA
            return 'LOSS';
        } else if (successCount === totalContracts) {
            // Todos os contratos tiveram sucesso = 1 VITÓRIA
            return 'WIN';
        } else {
            // 🔧 CORREÇÃO: Resultado misto = NEUTRO (não conta nada, igual aos simulados)
            return 'MIXED'; // Resultado misto será tratado como neutro
        }
    }

    // 🎯 NOVO: Processar resultado consolidado de um grupo BOTH
    processBothTradeGroupResult(bothGroupId, group) {

        // Marcar como processado para evitar duplicação
        group.processed = true;

        // Contar sucessos
        let successCount = 0;
        const totalContracts = group.expectedCount;

        // 💰 NOVO: Somar todos os lucros dos contratos do grupo
        let totalProfit = 0;
        if (group.profits && group.profits.size > 0) {
            for (const [contractId, profit] of group.profits.entries()) {
                const numericProfit = Number(profit) || 0;
                totalProfit += numericProfit;
            }
        }

        // 🎯 SIMPLES: Marcar flags de Gale por contrato (APENAS se modo REAL/VIRTUAL E galeActive)
        const shouldMarkFlags = group.mode !== 'SIMULACAO' && this.config.galeActive;

        if (shouldMarkFlags) {

            // Isso evita que flags antigas contaminem o próximo ciclo
            const contractTypesInGroup = new Set(group.contractTypes.values());
            for (const contractType of contractTypesInGroup) {
                if (this.pendingGaleByContract[contractType] !== undefined) {
                    delete this.pendingGaleByContract[contractType];
                }
            }

            // 🎯 NOVO: Objeto para armazenar perdas acumuladas por contractType
            if (!this.accumulatedLossesByContract) {
                this.accumulatedLossesByContract = {};
            }

            // Agora marcar as novas flags baseadas nos resultados
            for (const [contractId, isWin] of group.results.entries()) {
                const contractType = group.contractTypes.get(contractId);
                // 🎯 CRÍTICO: Usar buy_price REAL (pode ser Gale), não stake configurada
                const contractStake = group.contractStakes.get(contractId) || this.config.stake;


                if (isWin) {
                    successCount++;
                    // WIN: Limpar flag de Gale para este contrato
                    this.pendingGaleByContract[contractType] = false;
                    // WIN: Resetar perdas acumuladas deste contrato
                    this.accumulatedLossesByContract[contractType] = 0;

                } else {
                    // LOSS: Marcar para usar Gale na próxima execução
                    this.pendingGaleByContract[contractType] = true;
                    // LOSS: Acumular perda REAL (incluindo Gale) para este contractType específico
                    if (!this.accumulatedLossesByContract[contractType]) {
                        this.accumulatedLossesByContract[contractType] = 0;
                    }
                    const previousLosses = this.accumulatedLossesByContract[contractType];
                    this.accumulatedLossesByContract[contractType] += contractStake;

                }
            }

        } else {
            // SIMULAÇÃO ou Gale desativado: apenas contar sucessos, NÃO marcar flags
            for (const [contractId, isWin] of group.results.entries()) {
                if (isWin) successCount++;
            }
        }

        // Calcular resultado consolidado
        const consolidatedResult = this.calculateBothTradeCountingResult(successCount, totalContracts);


        // 💰 CRÍTICO: Atualizar P&L da sessão UMA ÚNICA VEZ com a soma dos lucros
        this.updateSessionProfitLoss(totalProfit);

        // ✅ CRÍTICO: Processar resultado consolidado UMA ÚNICA VEZ (sempre, inclusive MIXED)
        const wasSimulated = group.mode === 'SIMULACAO';
        this.handleTradeResult({
            mode: group.mode,
            result: consolidatedResult,
            simulated: wasSimulated
        });

        // 🎯 CRÍTICO (Modo BOTH): Se o resultado consolidado for LOSS ou MIXED, 
        // sincronizar a perda líquida com o RiskController global para permitir recuperação
        if (!wasSimulated && (consolidatedResult === 'LOSS' || consolidatedResult === 'MIXED')) {
            if (totalProfit < 0) {
                const netLoss = Math.abs(totalProfit);

                // Adicionar ao RiskController global para que o próximo trade (de qualquer tipo) aplique Gale
                if (this.riskController) {
                    logConfig.warn('trade_manager', `🎰 [BOTH RECOVERY] Sincronizando perda líquida de $${netLoss.toFixed(2)} com o RiskController global.`);
                    this.riskController.accumulatedLosses += netLoss;
                    this.riskController.lastRealTradeWasLoss = true;
                }

                // Também atualizar localmente se necessário
                this.accumulatedLosses += netLoss;
            }
        }

        // 🎯 CRÍTICO: Reset SÍNCRONO após WIN no grupo BOTH (manter consistência)
        if (consolidatedResult === 'WIN' && !wasSimulated) {
            this.nextTradeStake = null;
            this.lastCalculatedStake = null;
            this.accumulatedLosses = 0;
            this.realLossesStreak = 0;
            this.lastContractPayout = null;
            this.currentProposalPayout = null;

            // Resetar riskController também
            if (this.riskController) {
                this.riskController.accumulatedLosses = 0;
                this.riskController.realLossesStreak = 0;
            }
        }

        // 🎯 CRÍTICO: PROCESSAR MUDANÇA DE MODO quando Cooldown=0
        const cooldownPeriod = this.config?.cooldownPeriod ?? 3;
        if (cooldownPeriod <= 0) {
            this.processModeChanges(group.mode, consolidatedResult, wasSimulated);
        }

        if (consolidatedResult === 'MIXED') {
        } else {
        }

        // Limpar grupo após processamento
        setTimeout(() => {
            this.bothTradeGroups.delete(bothGroupId);
        }, 5000); // Aguardar 5s para garantir que todos os logs foram gerados
    }

    // 🎰 NOVO: Obter valor do multiplicador Gale da UI
    getGaleAdjustmentFromUI() {
        try {
            const galeMultiplierInput = CommonHelpers.getElement('gale-multiplier-input');
            if (galeMultiplierInput && galeMultiplierInput.value) {
                const adjustment = parseFloat(galeMultiplierInput.value);
                if (!isNaN(adjustment) && adjustment >= 0) {
                    return adjustment;
                }
            }
            return null; // Retorna null se não encontrar valor válido
        } catch (error) {
            return null;
        }
    }

    // Atualizar configurações a partir da UI
    updateConfigurationFromUI() {

        const durationInput = CommonHelpers.getElement('duration-input');
        const durationUnitSelect = CommonHelpers.getElement('duration-unit-select');
        const stakeInput = CommonHelpers.getElement('stake-input');
        const goalInput = CommonHelpers.getElement('goal-input');
        const stopLossInput = CommonHelpers.getElement('stop-loss-input');
        const winRealInput = CommonHelpers.getElement('win-real-input');
        const lossRealInput = CommonHelpers.getElement('loss-real-input');
        const winSimulatedInput = CommonHelpers.getElement('win-simulated-input');
        const lossSimulatedInput = CommonHelpers.getElement('loss-simulated-input');
        const symbolSelect = CommonHelpers.getElement('symbol-select');
        const contractSelect = CommonHelpers.getElement('contract-select');
        // 🎰 CORREÇÃO: Obter inputs do Gale
        const galeMultiplierInput = CommonHelpers.getElement('gale-multiplier-input');
        const galeActiveCheckbox = CommonHelpers.getElement('gale-active-checkbox');



        if (durationInput) this.config.duration = parseInt(durationInput.value) || 5;
        if (durationUnitSelect) this.config.durationUnit = durationUnitSelect.value || 't';
        if (stakeInput) this.config.stake = parseFloat(stakeInput.value) || 10;
        if (goalInput) this.config.goal = parseFloat(goalInput.value) || 0;
        if (stopLossInput) this.config.stopLoss = parseFloat(stopLossInput.value) || 0;
        if (winRealInput) this.config.realWinsLimit = parseInt(winRealInput.value) || 0;
        if (lossRealInput) this.config.realLossesLimit = parseInt(lossRealInput.value) || 0;

        if (winSimulatedInput) {
            const oldValue = this.config.simulatedWinsLimit;
            const newValue = parseInt(winSimulatedInput.value) || 0;
            this.config.simulatedWinsLimit = newValue;
        }

        if (lossSimulatedInput) {
            const oldValue = this.config.simulatedLossesLimit;
            const newValue = parseInt(lossSimulatedInput.value) || 0;
            this.config.simulatedLossesLimit = newValue;
        }

        // 🔧 NOVO: Configuração de limite de trades
        const tradeLimitInput = CommonHelpers.getElement('trade-limit-input');
        if (tradeLimitInput) {
            this.config.tradeLimit = parseInt(tradeLimitInput.value) || 0;
        }

        // 🔧 NOVO: Configuração do período de cooldown
        const cooldownPeriodInput = CommonHelpers.getElement('cooldown-period-input');
        if (cooldownPeriodInput) {
            const cooldownValue = parseInt(cooldownPeriodInput.value);
            // 🎯 PERMITIR valor 0 para modo dinâmico (aguarda apenas duração natural)
            // ✅ CORREÇÃO: Usar cooldownValue diretamente se for 0, só usar fallback se for NaN
            this.config.cooldownPeriod = isNaN(cooldownValue) ? 3 : cooldownValue;

            if (cooldownValue === 0) {
            } else {
            }
        }

        // 📈 NOVO: Configuração Soros
        const sorosLimitInput = CommonHelpers.getElement('soros-limit-input');
        if (sorosLimitInput) {
            this.config.sorosLimit = parseInt(sorosLimitInput.value) || 0;
            this.sorosLimit = this.config.sorosLimit; // Sincronizar propriedade local
        }

        const sorosPercentageInput = CommonHelpers.getElement('soros-profit-percentage');
        if (sorosPercentageInput) {
            this.config.sorosPercentage = parseInt(sorosPercentageInput.value) || 100;
            this.sorosPercentage = this.config.sorosPercentage; // Sincronizar propriedade local
        }

        const galeRemovesSorosCheckbox = CommonHelpers.getElement('gale-removes-soros');
        if (galeRemovesSorosCheckbox) {
            this.config.galeRemovesSoros = galeRemovesSorosCheckbox.checked;
            this.galeRemovesSoros = this.config.galeRemovesSoros; // Sincronizar propriedade local
        }

        if (symbolSelect) this.config.symbol = symbolSelect.value;
        if (contractSelect) this.config.contractType = contractSelect.value;

        // 🎯 CORREÇÃO: Capturar também o tipo de trade selecionado
        const tradeTypeSelect = CommonHelpers.getElement('trade-type-select');
        if (tradeTypeSelect) {
            this.config.tradeType = tradeTypeSelect.value;
        }

        // 🎰 CORREÇÃO: Atualizar configurações do Gale com valor do usuário
        if (galeMultiplierInput && galeMultiplierInput.value) {
            const adjustment = parseFloat(galeMultiplierInput.value);
            if (!isNaN(adjustment) && adjustment >= 0) {
                this.config.galeAdjustment = adjustment;
            } else {
            }
        } else {
            // Se não há input ou valor, manter o valor atual (não resetar para 1)
        }

        // 🎯 SPLIT THRESHOLD: Ler valor do input de threshold (SOMENTE SE O ELEMENTO EXISTIR)
        // Evita resetar para 0 se o DOM ainda não foi renderizado
        const galeSplitThresholdInput = document.getElementById('gale-split-threshold');
        if (galeSplitThresholdInput) {
            const val = parseFloat(galeSplitThresholdInput.value);
            this.config.galeSplitThreshold = isNaN(val) ? 0 : val;
            logConfig.debug('trade_manager', `🎰 Split Threshold lido da UI: $${this.config.galeSplitThreshold}`);
        }

        // 🎯 SPLIT GALE: Ler valor do seletor (SOMENTE SE O ELEMENTO EXISTIR)
        const galeSplitInput = document.getElementById('gale-split-input');
        if (galeSplitInput) {
            const val = parseInt(galeSplitInput.value);
            this.config.galeSplit = isNaN(val) || val < 1 ? 1 : val;
            logConfig.debug('trade_manager', `🎰 Split Gale lido da UI: ÷${this.config.galeSplit}`);
        }

        // 📊 NOVO: Configuração de Tempo de Pausa
        const pauseTimeInput = CommonHelpers.getElement('pause-time-input');
        const pauseTradesInput = CommonHelpers.getElement('pause-trades-input');
        const pauseOnWinsCheckbox = CommonHelpers.getElement('pause-on-wins');

        if (pauseTimeInput) {
            const val = parseInt(pauseTimeInput.value);
            this.config.pauseTime = isNaN(val) ? null : val;
        }
        if (pauseTradesInput) {
            this.config.pauseTrades = parseInt(pauseTradesInput.value) || 2;
        }
        if (pauseOnWinsCheckbox) {
            this.config.pauseOnWins = pauseOnWinsCheckbox.checked;
        }

        // 🎯 NOVO: Sincronizar filtro de dígitos repetidos
        const countRepeatedCheckbox = document.getElementById('count-repeated-digits-input');
        if (countRepeatedCheckbox) {
            this.config.countRepeated = countRepeatedCheckbox.checked;
        }

        // 🎰 CORREÇÃO: Gale sempre ativo
        this.config.galeActive = true;

        // Obter valores de previsão/barreira usando o método do ConfigurationsView
        if (typeof ConfigurationsView !== 'undefined' && typeof ConfigurationsView.getPredictionBarrierValues === 'function') {
            this.config.prediction = ConfigurationsView.getPredictionBarrierValues();
        } else {
            // Fallback: tentar obter diretamente dos campos de input
            const predictionInput = CommonHelpers.getElement('prediction-input');
            if (predictionInput && this.config.contractType && this.config.contractType.startsWith('DIGIT')) {
                const predictionValue = parseInt(predictionInput.value);
                if (!isNaN(predictionValue) && predictionValue >= 0 && predictionValue <= 9) {
                    this.config.prediction = {
                        type: 'prediction',
                        value: predictionValue
                    };
                } else {
                    CommonHelpers.showWarning(`⚠️ [CONFIG UPDATE] Valor de previsão inválido no input: ${predictionInput.value}`);
                    this.config.prediction = { type: 'none', value: null };
                }
            }
        }

        // ✅ CORREÇÃO CRÍTICA: Force-read barrier for HIGHER_LOWER_GROUP
        // Garantir que barrier seja lida diretamente do input quando o grupo sintético é usado
        if (this.config.contractType === 'HIGHER_LOWER_GROUP') {
            const barrierInput = CommonHelpers.getElement('barrier-input', true);
            if (barrierInput && barrierInput.value) {
                this.config.barrier = barrierInput.value;

            }
        }

        const winsSimulados = this.config.simulatedWinsLimit || 0;
        const lossesSimulados = this.config.simulatedLossesLimit || 0;
        const cenario1 = (winsSimulados === 0 && lossesSimulados === 0);
        const cenario2 = (winsSimulados > 0 || lossesSimulados > 0);

        this.saveConfiguration();

        // 🔄 NOVO: Sincronizar RiskController explicitamente
        if (this.riskController && typeof this.riskController.updateConfig === 'function') {
            this.riskController.updateConfig(this.config);
            // Log for visibility

        }

        // O modo só deve ser definido na inicialização ou reload completo

        if (this.onModeChange) {
            this.onModeChange(this.currentMode, 'Configuração atualizada');
        }

        window.dispatchEvent(new CustomEvent('modeChanged', {
            detail: { mode: this.currentMode, reason: 'Configuração atualizada' }
        }));

        if (this.onConfigUpdate) {
            this.onConfigUpdate(this.config, this.currentMode);
        }

    }

    determineModeFromConfig() {

        const winsSimulados = this.config.simulatedWinsLimit || 0;
        const lossesSimulados = this.config.simulatedLossesLimit || 0;
        const realLabel = this.getRealLabel();

        let finalMode;

        //CENÁRIO 1: Ganhos=0 E Perdas=0 -> DESABILITA simulação (modo real)
        if (winsSimulados === 0 && lossesSimulados === 0) {
            finalMode = realLabel;
        }
        //CENÁRIO 2: Ganhos>0 OU Perdas>0 -> HABILITA simulação
        else if (winsSimulados > 0 || lossesSimulados > 0) {
            finalMode = 'SIMULACAO';
        }
        // Fallback (não deveria acontecer)
        else {
            finalMode = realLabel;
        }

        this.currentMode = finalMode;

        window.dispatchEvent(new CustomEvent('modeChanged', {
            detail: { mode: finalMode, reason: 'Configuração inicial' }
        }));

    }

    // 🔧 NOVO: Sincronizar configurações com a UI após carregamento
    syncWithUIConfiguration() {
        try {
            // 🔧 CORREÇÃO: Recarregar config completa do localStorage primeiro
            const loadedConfig = this.loadConfiguration();

            // Mesclar config carregada com config atual
            if (loadedConfig) {
                // ✅ CRÍTICO: Preservar barreira e PREVISÃO normalizada do localStorage
                if (loadedConfig.barrier) {
                    this.config.barrier = loadedConfig.barrier;
                }
                if (loadedConfig.prediction) {
                    this.config.prediction = loadedConfig.prediction;
                }

                // 🎯 FIX CRÍTICO: Carregar parâmetros principais que podem não estar na DOM (Monitoring Mode)
                if (loadedConfig.galeSplit) this.config.galeSplit = loadedConfig.galeSplit;
                if (loadedConfig.galeSplitThreshold) this.config.galeSplitThreshold = loadedConfig.galeSplitThreshold;
                if (loadedConfig.galeMultiplier) this.config.galeMultiplier = loadedConfig.galeMultiplier;
                if (loadedConfig.stake) this.config.stake = loadedConfig.stake;
                if (loadedConfig.goal) this.config.goal = loadedConfig.goal;
                if (loadedConfig.stopLoss) this.config.stopLoss = loadedConfig.stopLoss;
                if (loadedConfig.contractType) this.config.contractType = loadedConfig.contractType;
                if (loadedConfig.tradeType) this.config.tradeType = loadedConfig.tradeType;
                if (loadedConfig.sorosLimit) {
                    this.config.sorosLimit = loadedConfig.sorosLimit;
                    this.sorosLimit = loadedConfig.sorosLimit;
                }
                if (loadedConfig.sorosPercentage !== undefined) {
                    this.config.sorosPercentage = loadedConfig.sorosPercentage;
                    this.sorosPercentage = loadedConfig.sorosPercentage;
                }
                if (loadedConfig.galeRemovesSoros !== undefined) {
                    this.config.galeRemovesSoros = loadedConfig.galeRemovesSoros;
                    this.galeRemovesSoros = loadedConfig.galeRemovesSoros;
                }
                if (loadedConfig.pauseTime !== undefined) this.config.pauseTime = loadedConfig.pauseTime;
                if (loadedConfig.pauseTrades !== undefined) this.config.pauseTrades = loadedConfig.pauseTrades;
                if (loadedConfig.pauseOnWins !== undefined) this.config.pauseOnWins = loadedConfig.pauseOnWins;
            }

            // Depois atualizar outros campos da UI (se existirem na DOM)
            this.updateConfigurationFromUI();

        } catch (error) {
            CommonHelpers.showError('❌ [SYNC CONFIG] Erro na sincronização:', error);
        }
    }

    // Determinar modo baseado no tipo de conta do usuário
    determineAccountMode() {
        const userData = SessionManager.getUserData();
        if (userData && userData.authorize) {
            const accountMode = userData.authorize.is_virtual ? 'VIRTUAL' : 'REAL';
            return accountMode;
        }

        // Fallback melhorado: tentar determinar via currentUser
        const currentUser = SessionManager.getCurrentUser();
        if (currentUser && currentUser.authorize) {
            const accountMode = currentUser.authorize.is_virtual ? 'VIRTUAL' : 'REAL';
            return accountMode;
        }

        CommonHelpers.showWarning('⚠️ [determineAccountMode] Não foi possível detectar tipo de conta, assumindo VIRTUAL como fallback');
        return 'VIRTUAL'; // Fallback mais seguro que SIMULACAO
    }

    // Verificar se simulação está habilitada
    isSimulationEnabled() {
        // Se ambos são 0, desabilita simulação completamente
        const winsLimit = parseInt(this.config.simulatedWinsLimit) || 0;
        const lossesLimit = parseInt(this.config.simulatedLossesLimit) || 0;
        const enabled = (winsLimit > 0 || lossesLimit > 0);


        return enabled;
    }

    // Obter label do modo real baseado na conta
    getRealLabel() {
        const userData = SessionManager.getUserData();
        if (userData && userData.authorize) {
            const realMode = userData.authorize.is_virtual ? 'VIRTUAL' : 'REAL';
            return realMode;
        }

        // Fallback: tentar determinar via método original
        const fallbackMode = this.determineAccountMode();
        return fallbackMode;
    }

    // Computar modo inicial baseado na configuração
    computeStartMode() {

        const realLabel = this.getRealLabel();
        const winsSimulados = this.config.simulatedWinsLimit || 0;
        const lossesSimulados = this.config.simulatedLossesLimit || 0;


        const cenario1 = (winsSimulados === 0 && lossesSimulados === 0);
        const cenario2 = (winsSimulados > 0 || lossesSimulados > 0);


        let resultado;

        // CENÁRIO 1: Ganhos=0 E Perdas=0 -> DESABILITA simulação (REAL)
        if (cenario1) {
            resultado = realLabel;
        }
        // CENÁRIO 2: Ganhos>0 OU Perdas>0 -> HABILITA simulação (SIMULACAO)
        else if (cenario2) {
            resultado = 'SIMULACAO';
        }
        // Fallback (não deveria acontecer)
        else {
            resultado = realLabel;
        }


        return resultado;
    }

    // Computar próximo modo de trade
    computeNextMode() {
        if (this.awaitingExpiration) {
            // Se estamos aguardando expiração, próximo trade será no mesmo modo
            return this.currentMode;
        }

        // Retornar o modo atual se não há transições pendentes
        return this.currentMode;
    }

    determineNextExecutionMode() {


        // Se não há configuração de limites, sempre usar modo atual
        if (!this.config.simulatedWinsLimit && !this.config.simulatedLossesLimit &&
            !this.config.realWinsLimit && !this.config.realLossesLimit) {

            return this.currentMode;
        }

        const mode = this.currentMode;

        // Verificar se há um "próximo modo pendente" que foi calculado após o último resultado
        if (this.pendingNextMode) {

            // 🎯 CORREÇÃO: Limpar pendingNextMode se já foi usado e modo atual já mudou
            if (this.currentMode === this.pendingNextMode) {

                this.pendingNextMode = null;
                // Continuar verificação normal abaixo
            } else {
                // NÃO limpar aqui - será limpo quando modo realmente mudar
                return this.pendingNextMode;
            }
        }

        if (mode === 'SIMULACAO') {
            // Verificar se DEVERIA transicionar para REAL baseado nos contadores ATUAIS
            if (this.config.simulatedWinsLimit > 0 &&
                this.simulatedWinsStreak >= this.config.simulatedWinsLimit) {
                logConfig.info('trade_manager', `🔄 [MODE CALC] Próximo trade será REAL (wins simulados: ${this.simulatedWinsStreak}/${this.config.simulatedWinsLimit})`);
                return this.getRealLabel(); // REAL ou VIRTUAL
            }
            if (this.config.simulatedLossesLimit > 0 &&
                this.simulatedLossesStreak >= this.config.simulatedLossesLimit) {
                logConfig.info('trade_manager', `🔄 [MODE CALC] Próximo trade será REAL (losses simulados: ${this.simulatedLossesStreak}/${this.config.simulatedLossesLimit})`);
                return this.getRealLabel(); // REAL ou VIRTUAL
            }
        } else {
            // Modo REAL/VIRTUAL


            if (this.config.realWinsLimit > 0 &&
                this.realWinsStreak >= this.config.realWinsLimit) {
                logConfig.info('trade_manager', `🔄 [MODE CALC] Próximo trade será SIMULADO (wins reais: ${this.realWinsStreak}/${this.config.realWinsLimit})`);
                return 'SIMULACAO';
            }
            if (this.config.realLossesLimit > 0 &&
                this.realLossesStreak >= this.config.realLossesLimit) {
                logConfig.info('trade_manager', `🔄 [MODE CALC] Próximo trade será SIMULADO (losses reais: ${this.realLossesStreak}/${this.config.realLossesLimit})`);
                return 'SIMULACAO';
            }
        }

        // Sem transição, manter modo atual

        return mode;
    }

    // Definir modo atual
    setMode(mode) {
        const previousMode = this.currentMode;

        // 🎯 CORREÇÃO: Limpar pendingNextMode quando modo realmente mudar PARA o valor pendente
        // Verificar ANTES de atualizar this.currentMode
        if (this.pendingNextMode && mode === this.pendingNextMode) {
            this.pendingNextMode = null;
        }

        this.currentMode = mode;
        this.tradeReal = (mode !== 'SIMULACAO'); // 🎯 FIX: Sincronizar flag tradeReal com o modo

        if (previousMode !== mode) {
            logConfig.info('trade_manager', `🔄 [MODE CHANGE] ${previousMode} → ${mode}`);
        }
        window.dispatchEvent(new CustomEvent('modeChanged', {
            detail: { mode: mode, reason: 'Mudança de modo' }
        }));

        // 🔄 CRÍTICO: SEMPRE verificar se cooldown está ativo antes de atualizar visual
        if (this.isCooldownActive()) {
            // Marcar para atualizar após cooldown
            this.pendingVisualUpdate = mode;
        } else {
            // 🔧 Atualizar indicadores visuais imediatamente se não há cooldown
            this.updateVisualMode(mode);
        }

        if (this.onModeChange) {
            this.onModeChange(mode, this.computeNextMode());
        }
    }

    // 🔄 NOVO: Definir modo apenas logicamente (sem atualização visual)
    setModeLogicalOnly(mode) {
        const previousMode = this.currentMode;
        this.currentMode = mode;


        // 🔄 CRÍTICO: Marcar mudança visual pendente para após cooldown
        this.pendingVisualUpdate = mode;

        // Disparar evento global mas sem atualização visual
        window.dispatchEvent(new CustomEvent('modeChanged', {
            detail: { mode: mode, reason: 'Mudança lógica de modo', visualDelay: true }
        }));
    }

    // 🔄 NOVO: Atualizar indicadores visuais de modo
    updateVisualMode(mode) {
        setTimeout(() => {
            if (typeof UIManager !== 'undefined' && typeof UIManager.updateModeSelector === 'function') {
                UIManager.updateModeSelector(mode);

            }
        }, 100);
    }

    // 🔄 NOVO: Verificar se cooldown está ativo
    isCooldownActive() {
        try {
            // Verificar no CooldownOverlay primeiro
            if (typeof CooldownOverlay !== 'undefined' && typeof CooldownOverlay.isCooldownActive === 'function') {
                const cooldownOverlayActive = CooldownOverlay.isCooldownActive();
                if (cooldownOverlayActive) {
                    return true;
                }
            }

            // Verificar no MonitoringView como fallback
            if (typeof MonitoringView !== 'undefined' && MonitoringView.cooldownActive === true) {
                return true;
            }

            // 🔧 NOVO: Verificar se overlay existe no DOM como última verificação
            const overlayExists = document.querySelector('.cooldown-overlay-modal');
            if (overlayExists && overlayExists.style.display !== 'none') {

                return true;
            }

            return false;
        } catch (error) {
            CommonHelpers.showError('❌ [COOLDOWN CHECK] Erro ao verificar cooldown:', error);
            return false;
        }
    }

    // 🔄 NOVO: Aplicar atualizações visuais pendentes após cooldown
    applyPendingVisualUpdates() {

        // 🔄 PRIMEIRO: Processar mudanças de modo pendentes (que podem alterar o modo)
        if (this.pendingModeProcessing) {
            this.processModeChanges(
                this.pendingModeProcessing.mode,
                this.pendingModeProcessing.result,
                this.pendingModeProcessing.simulated
            );
            this.pendingModeProcessing = null;
        }

        // 🔄 DEPOIS: Aplicar TODAS as atualizações visuais pendentes
        const finalModeToShow = this.pendingVisualUpdate ||
            this.pendingModeTransition?.mode ||
            this.currentMode;

        if (finalModeToShow) {
            this.updateVisualMode(finalModeToShow);

            // 🎯 NOVO: Forçar atualização do MonitoringView para refletir novo modo visual
            if (typeof MonitoringView !== 'undefined' && MonitoringView.updateModeDisplay) {
                setTimeout(() => {
                    MonitoringView.updateModeDisplay();
                }, 100);
            }
        }

        // 🧹 LIMPAR todas as flags pendentes
        this.pendingVisualUpdate = null;
        this.pendingModeTransition = null;

    }

    // 🔄 NOVO: Processar mudanças de modo (separado do handleTradeResult)
    processModeChanges(mode, result, simulated = false) {

        if (mode === 'SIMULACAO' || simulated) {
            this.processModeChangesForSimulated(result);
        } else {
            this.processModeChangesForReal(result);
        }

    }

    // 🔄 NOVO: Processar mudanças de modo para trades simulados
    processModeChangesForSimulated(result) {
        const isWin = result === 'WIN';

        if (isWin) {
            // Verificar se atingiu limite de vitórias simuladas SEGUIDAS
            if (this.simulatedWinsStreak >= this.config.simulatedWinsLimit && this.config.simulatedWinsLimit > 0) {
                this.transitionToRealMode('Vitórias simuladas atingidas');
            }
        } else {
            // Verificar se atingiu limite de perdas simuladas SEGUIDAS
            if (this.simulatedLossesStreak >= this.config.simulatedLossesLimit && this.config.simulatedLossesLimit > 0) {
                this.transitionToRealMode('Perdas simuladas atingidas');
            }
        }
    }

    // 🔄 NOVO: Processar mudanças de modo para trades reais
    processModeChangesForReal(result) {
        const isWin = result === 'WIN';

        // (handleTradeResult/processRealTradeResult já incrementaram)
        if (isWin) {
            const currentWinsStreak = this.realWinsStreak;


            if (this.config.realWinsLimit > 0 && currentWinsStreak >= this.config.realWinsLimit) {

                // caso handleRealLimitReached falhe ou seja adiado.

            }

            // Verificar se atingiu limite de vitórias reais SEGUIDAS
            if (this.realWinsStreak >= this.config.realWinsLimit && this.config.realWinsLimit > 0) {
                this.handleRealLimitReached('vitórias', this.realWinsStreak);
            }
        } else {
            const currentLossesStreak = this.realLossesStreak;

            if (this.config.realLossesLimit > 0 && currentLossesStreak >= this.config.realLossesLimit) {

            }

            // Verificar se atingiu limite de perdas reais SEGUIDAS
            if (this.realLossesStreak >= this.config.realLossesLimit && this.config.realLossesLimit > 0) {
                this.handleRealLimitReached('perdas', this.realLossesStreak);
            }
        }
    }

    // 🔄 NOVO: Processar apenas lógica interna sem mudanças visuais
    processModeChangesLogicOnly(mode, result, simulated = false) {

        if (mode === 'SIMULACAO' || simulated) {
            this.checkSimulatedModeLogic(result);
        } else {
            this.checkRealModeLogic(result);
        }
    }

    // 🔄 NOVO: Verificar lógica simulada (sem visual)
    checkSimulatedModeLogic(result) {
        const isWin = result === 'WIN';

        if (isWin) {
            if (this.simulatedWinsStreak >= this.config.simulatedWinsLimit && this.config.simulatedWinsLimit > 0) {
                this.nextModeLogic = this.getRealLabel();
            }
        } else {
            if (this.simulatedLossesStreak >= this.config.simulatedLossesLimit && this.config.simulatedLossesLimit > 0) {
                this.nextModeLogic = this.getRealLabel();
            }
        }
    }

    // 🔄 NOVO: Verificar lógica real (sem visual)
    checkRealModeLogic(result) {
        const isWin = result === 'WIN';

        if (isWin) {
            if (this.realWinsStreak >= this.config.realWinsLimit && this.config.realWinsLimit > 0) {
                const simulationEnabled = this.isSimulationEnabled();
                this.nextModeLogic = simulationEnabled ? 'SIMULACAO' : this.getRealLabel();
            }
        } else {
            if (this.realLossesStreak >= this.config.realLossesLimit && this.config.realLossesLimit > 0) {
                const simulationEnabled = this.isSimulationEnabled();
                this.nextModeLogic = simulationEnabled ? 'SIMULACAO' : this.getRealLabel();
            }
        }
    }

    // 🎯 NOVO: Verificar limites de streaks reais IMEDIATAMENTE após resultado
    checkRealStreakLimits(result) {
        const isWin = result === 'WIN';

        if (isWin) {
            // Verificar se atingiu limite de vitórias reais SEGUIDAS
            if (this.realWinsStreak >= this.config.realWinsLimit && this.config.realWinsLimit > 0) {
                this.handleRealLimitReached('vitórias', this.realWinsStreak);
            }
        } else {
            // Verificar se atingiu limite de perdas reais SEGUIDAS
            if (this.realLossesStreak >= this.config.realLossesLimit && this.config.realLossesLimit > 0) {
                this.handleRealLimitReached('perdas', this.realLossesStreak);
            }
        }
    }

    // Resetar contadores para um modo específico
    resetStreaksFor(mode) {
        switch (mode) {
            case 'SIMULACAO':
                this.simulatedWinsStreak = 0;
                this.simulatedLossesStreak = 0;
                break;
            case 'REAL':
            case 'VIRTUAL':
                this.realWinsStreak = 0;
                this.realLossesStreak = 0;
                break;
        }

    }

    // 🔧 NOVO: Limpar contratos processados para novo ciclo de trades
    clearProcessedContracts() {
        if (this.processedContracts) {
            this.processedContracts.clear();
        }
        this.currentTradeMessageAdded = false;
    }

    // 🎯 skipGaleProcessing: Quando true, LOCAL JUDGE já processou Gale (evita duplicação)
    handleTradeResult({ mode, result, simulated = false, skipGaleProcessing = false }) {

        // 📊 NOVO: Lógica de Tempo de Pausa
        this.processPauseLogic(simulated, result);

        if (mode === 'SIMULACAO' || simulated) {
            this.processSimulatedTradeResult(result);
        } else if (!skipGaleProcessing) {
            // 🎰 CORREÇÃO: Processar resultado (JÁ soma accumulatedLosses internamente)
            this.processRealTradeResult(result);

            // accumulatedLosses já é atualizado dentro de processRealTradeResult
        } else {
            // 🎯 LOCAL JUDGE: Apenas atualizar contadores de streak (Gale já processado)
            const isWin = result === 'WIN' || result === 'win';
            const isLoss = result === 'LOSS' || result === 'loss';

            if (isWin) {
                this.realWinsStreak++;
                this.realLossesStreak = 0;
                this.historyCounters.realWinsTotal++;
                this.checkRealStreakLimits('WIN');

                // 📈 SOROS: Lógica já processada no Local Judge (linhas 4558-4584)
                // Não duplicar aqui para evitar conflitos
            } else if (isLoss) {
                this.realLossesStreak++;
                this.realWinsStreak = 0;
                this.historyCounters.realLossesTotal++;
                this.checkRealStreakLimits('LOSS');

                // 📈 SOROS: Lógica já processada no Local Judge
            }

            // Disparar evento do trade
            window.dispatchEvent(new CustomEvent('tradeExecuted', {
                detail: {
                    mode: this.currentMode,
                    result: result,
                    counters: this.getCounters()
                }
            }));
        }

        // Mesmo com cooldown ativo, resetar contadores imediatamente para consistência
        this.processModeChanges(mode, result, simulated);

        // 🎯 VISUAL: Atrasar apenas atualizações visuais se cooldown ativo
        if (this.isCooldownActive()) {
            this.pendingModeProcessing = { mode, result, simulated };
        }
    }

    /**
     * 📊 Lógica de processamento do Tempo de Pausa
     */
    processPauseLogic(simulated, result) {
        if (simulated || !this.config.pauseTime) return;

        const res = result.toLowerCase();
        const pauseOnWins = this.config.pauseOnWins; // true = wins, false = losses
        const isTargetResult = (pauseOnWins && res === 'win') || (!pauseOnWins && res === 'loss');

        if (isTargetResult) {
            this.pauseTradeCounter++;
            logConfig.info('trade-manager', `📊 [PAUSE] Contador: ${this.pauseTradeCounter}/${this.config.pauseTrades}`);

            if (this.pauseTradeCounter >= this.config.pauseTrades) {
                this.triggerPause();
            }
        } else {
            // Resetar contador se a sequência for quebrada
            this.pauseTradeCounter = 0;
        }
    }

    /**
     * Dispara a pausa do sistema
     */
    triggerPause() {
        if (this.isPaused) return;

        logConfig.info('trade-manager', `⚠️ [PAUSE] Gatilho atingido. Iniciando pausa de ${this.config.pauseTime} minutos.`);

        this.isPaused = true;
        this.pauseTradeCounter = 0; // Resetar para o próximo ciclo

        if (window.PauseManager) {
            window.PauseManager.showOverlay(this.config.pauseTime, () => {
                logConfig.info('trade-manager', `✅ [PAUSE] Tempo de pausa encerrado.`);
                this.isPaused = false;
            });
        }
    }

    // Processar resultado de trade simulado
    processSimulatedTradeResult(result) {
        const isWin = result === 'WIN';
        const isLoss = result === 'LOSS';
        const isMixed = result === 'MIXED';


        if (isMixed) {

        } else if (isWin) {
            // VITÓRIA SIMULADA: +1 em vitórias, zerar perdas simuladas
            this.simulatedWinsStreak++;
            this.simulatedLossesStreak = 0;

            // 📊 Incrementar contador de histórico
            this.historyCounters.simulatedWinsTotal++;
        } else {
            // PERDA SIMULADA: +1 em perdas, zerar vitórias simuladas
            this.simulatedLossesStreak++;
            this.simulatedWinsStreak = 0;

            // 📊 Incrementar contador de histórico
            this.historyCounters.simulatedLossesTotal++;
        }


        // 🎯 Verificar Meta e Stop Loss
        setTimeout(() => {
            this.checkGoalAndStopLoss();
        }, 1000);

        // 🔧 CORREÇÃO: Só disparar evento se não for resultado misto
        if (!isMixed) {
            window.dispatchEvent(new CustomEvent('tradeExecuted', {
                detail: {
                    mode: 'SIMULACAO',
                    result: result,
                    simulated: true,
                    counters: this.getCounters()
                }
            }));
        } else {
            // Para resultado misto, disparar evento especial
            window.dispatchEvent(new CustomEvent('mixedTradeExecuted', {
                detail: {
                    mode: 'SIMULACAO',
                    result: 'MIXED',
                    simulated: true,
                    counters: this.getCounters(),
                    message: 'Resultado misto - contadores preservados'
                }
            }));
        }

    }

    // Verificar se atingiu limite de trades reais
    hasReachedTradeLimit() {
        if (!this.config.tradeLimit || this.config.tradeLimit === 0) {
            return false; // Sem limite ou limite 0 = ilimitado
        }

        // 🎯 Usar contador INDEPENDENTE para verificar limite
        const limitCounter = this.historyCounters.tradeLimitCounter;
        const reachedLimit = limitCounter >= this.config.tradeLimit;

        if (reachedLimit) {
        }

        return reachedLimit;
    }

    // 🛑 NOVO: Verificar limite IMEDIATAMENTE após execução (não esperar resultado)
    checkTradeLimitAfterExecution() {

        if (!this.hasReachedTradeLimit()) {

            return; // Limite não atingido, continuar normalmente
        }

        // Limite atingido! Parar monitoramento e mostrar modal
        const totalRealTrades = this.historyCounters.totalRealContractsExecuted;

        // 🔧 PROTEÇÃO: Evitar múltiplos modais
        if (this.tradeLimitModalShown) {

            return;
        }

        this.tradeLimitModalShown = true;

        // Parar monitoramento IMEDIATAMENTE (sem setTimeout)
        if (typeof MonitoringView !== 'undefined' && MonitoringView.stopMonitoring) {

            MonitoringView.stopMonitoring();

            // Exibir modal após pequeno delay
            setTimeout(() => {

                // 🎯 Exibir modal centralizado com estatísticas
                const message = `
                    O limite configurado de <strong>${this.config.tradeLimit} trade${this.config.tradeLimit > 1 ? 's' : ''} real${this.config.tradeLimit > 1 ? 'is' : ''}</strong> foi atingido!
                    <br><br>
                    <div style="background:#f8f9fa;padding:15px;border-radius:8px;margin-top:15px">
                        <strong>📊 Estatísticas da Sessão:</strong><br>
                        <div style="margin-top:10px;text-align:left">
                            ✅ <strong>Vitórias:</strong> ${this.historyCounters.realWinsTotal}<br>
                            ❌ <strong>Perdas:</strong> ${this.historyCounters.realLossesTotal}<br>
                            📈 <strong>Contratos executados:</strong> ${totalRealTrades} contrato${totalRealTrades > 1 ? 's' : ''}
                        </div>
                    </div>
                    <br>
                    <small style="color:#666">O monitoramento foi interrompido automaticamente.</small>
                `;

                this.showPopup(
                    'Limite de Trades Atingido',
                    message,
                    '🛑',
                    'Fechar'
                );

                // 🎯 RESETAR contador do limite automaticamente
                this.historyCounters.tradeLimitCounter = 0;
            }, 500);
        } else {
        }
    }

    // Processar resultado de trade real
    processRealTradeResult(result) {
        // 🔄 INTEGRAR RISK CONTROLLER COM IDEMPOTÊNCIA
        if (this.riskController && typeof this.riskController.handleRealResult === 'function') {
            // Tentar obter ID de várias formas possíveis (contract_id, id, transaction_id)
            const contract = this.lastCompletedContract || {};
            const contractId = contract.contract_id || contract.id || contract.transaction_id || null;

            // Log para debug se contrato for nulo
            if (!this.lastCompletedContract) {
                console.warn('⚠️ [TradeManager] Aviso: lastCompletedContract nulo ao processar resultado real');
            }

            // 🎯 CAPTURAR STAKE USADA: Obter stake real usada no trade
            const lastTradeStake = this.getLastTradeStake();

            // 🎯 PASSAR STAKE PARA O RISK CONTROLLER
            this.riskController.handleRealResult(result, contractId, lastTradeStake);

            // 🎯 DEBUG EXTRA: JSON stringify para garantir visibilidade
            const debugState = {
                res: result,
                id: contractId,
                stake: lastTradeStake, // Logar stake passada
                pending: this.riskController.pendingSplitWins,
                accum: this.riskController.accumulatedLosses,
                splitActive: this.riskController.isSplitActive ? this.riskController.isSplitActive() : '?'
            };

        }

        const isWin = result === 'WIN';
        const isLoss = result === 'LOSS';
        const isMixed = result === 'MIXED';


        if (isMixed) {
            // 🔧 RESULTADO MISTO: Não alterar streaks GLOBAIS
            // O rastreamento individual por contrato é feito em processBothTradeGroupResult

        } else if (isWin) {
            // VITÓRIA REAL: +1 em vitórias, zerar perdas reais
            const beforeWins = this.realWinsStreak;
            this.realWinsStreak++;
            this.realLossesStreak = 0;

            // 🎯 Rastrear tipo de contrato para detecção de mudança no próximo trade
            if (this.riskController) {
                this.riskController.lastExecutedContractType = this.config.contractType;
            }


            // 🎯 CAPTURAR ESTADO DO GALE ANTES DO RESET (Para bloquear Soros na recuperação)
            // Verificar no RiskController ou localmente
            const riskControllerLosses = this.riskController ? this.riskController.accumulatedLosses : 0;
            const wasGaleActive = this.accumulatedLosses > 0 || riskControllerLosses > 0;

            // 🎯 LÓGICA SPLIT GALE: Não resetar se sequência ainda ativa
            let isSplitActive = false;
            if (this.riskController && typeof this.riskController.isSplitActive === 'function') {
                isSplitActive = this.riskController.isSplitActive();
            }

            if (!isSplitActive) {
                // 🎰 Resetar perdas acumuladas do Gale (Apenas se não houver split ativo)
                if (this.accumulatedLosses > 0) {
                    this.accumulatedLosses = 0;
                }

                // 🎰 Resetar stake preservada
                this.lastCalculatedStake = null;
            } else {
                logConfig.info('trade_manager', '🎰 [SPLIT GALE] Vitória registrada, mas mantendo stake e acumulado para próxima entrada.');
            }

            // ⚡ OTIMIZAÇÃO: Resetar stake pré-calculado
            if (this.nextTradeStake !== null) {
                this.nextTradeStake = null;
            }

            // 📊 Incrementar contador de histórico
            this.historyCounters.realWinsTotal++;

            // 🎯 CRÍTICO: Verificar limites de vitórias SEGUIDAS
            this.checkRealStreakLimits('WIN');

            // 📈 LÓGICA SOROS (Apenas se configurado e não estiver em Gale/Split)

            if (this.config.sorosLimit > 0 && !isSplitActive && this.accumulatedLosses === 0) {

                // 🎯 VERIFICAR: Se Split Gale acabou de finalizar, NÃO contar essa vitória para Soros
                const splitJustFinished = this.riskController && this.riskController.splitGaleJustCompleted;

                // 🎯 FIX CRÍTICO: Se foi uma recuperação de Gale Normal (wasGaleActive) TAMBÉM não deve contar para Soros
                // O Soros deve ser resetado para iniciar limpo na PRÓXIMA entrada de stake base
                if (splitJustFinished || wasGaleActive) {
                    const reason = splitJustFinished ? 'Split Gale Recovery' : 'Normal Gale Recovery';

                    // 📍 IGNORAR: Vitória de recuperação não inicia Soros
                    logConfig.info('trade_manager', `📈 [SOROS IGNORED] Vitória de recuperação (${reason}) ignorada. Soros iniciará no próximo win com stake base.`);

                    // Resetar flag de split finalizado
                    if (this.riskController) this.riskController.splitGaleJustCompleted = false;

                    // 🎯 CRÍTICO: Garantir reset completo do Soros (como pedido pelo usuário)
                    this.sorosWins = 0;
                    this.nextSorosStake = null;

                    logConfig.info('trade_manager', `📈 [SOROS RESET] Contadores zerados após recuperação. Próxima entrada será Stake Base.`);

                } else {
                    // Calcular lucro real deste trade usando lastCompletedContract
                    const contract = this.lastCompletedContract || {};
                    const contractId = contract.contract_id || contract.id || 'unknown';
                    const buyPrice = parseFloat(contract.buy_price || this.config.stake || 0.35);
                    const payout = parseFloat(contract.payout || 0);
                    const profit = payout - buyPrice;


                    // Incrementar contador de wins do Soros (começa a contar do primeiro win)
                    this.sorosWins++;

                    if (this.sorosWins <= this.config.sorosLimit) {
                        // 📈 APLICAR PORCENTAGEM ao lucro antes de acumular
                        const profitPercentage = this.config.sorosPercentage || 100;
                        const adjustedProfit = profit * (profitPercentage / 100);

                        // Ainda dentro do limite de Soros: Acumular Stake + Lucro Ajustado
                        this.nextSorosStake = buyPrice + adjustedProfit;
                        // Arredondar para 2 casas decimais
                        this.nextSorosStake = Math.round(this.nextSorosStake * 100) / 100;

                        logConfig.info('trade_manager', `📈 [SOROS PROGRESS] Win ${this.sorosWins}/${this.config.sorosLimit}. Lucro: ${profit.toFixed(2)} (${profitPercentage}% = ${adjustedProfit.toFixed(2)}). Próxima Stake: ${this.nextSorosStake}`);
                    } else {
                        // Atingiu o limite: Resetar Soros (Volta para stake base na próxima)

                        logConfig.info('trade_manager', `📈 [SOROS TARGET] Meta de ${this.config.sorosLimit} wins atingida! Resetando para stake base.`);
                        this.sorosWins = 0;
                        this.nextSorosStake = null;

                    }
                }
            } else {

                // Só resetar se Soros não está configurado OU se há perdas acumuladas (Gale ativo)
                if (this.config.sorosLimit === 0 || this.accumulatedLosses > 0) {

                    this.sorosWins = 0;
                    this.nextSorosStake = null;
                }
            }

        } else {
            // PERDA REAL: +1 em perdas, zerar vitórias reais
            const beforeWins = this.realWinsStreak;
            this.realLossesStreak++;
            this.realWinsStreak = 0;

            // 🎯 Rastrear tipo de contrato até em perdas
            if (this.riskController) {
                this.riskController.lastExecutedContractType = this.config.contractType;
            }

            // 🔍 LOG DETALHADO: Rastrear reset de vitórias por perda
            if (beforeWins > 0) {

            }

            // 🎰 CRÍTICO: Acumular perda IMEDIATAMENTE após processamento
            const lastTradeStake = this.getLastTradeStake();
            this.accumulatedLosses += lastTradeStake;

            // 📈 SOROS RESET: Perdeu? Reseta Soros imediatamente
            if (this.config.sorosLimit > 0) {
                this.sorosWins = 0;
                this.nextSorosStake = null;
                logConfig.info('trade_manager', `📉 [SOROS RESET] Loss detectado. Soros resetado.`);
            }


            // 📊 Incrementar contador de histórico
            this.historyCounters.realLossesTotal++;

            // 🎯 CRÍTICO: Verificar limites de perdas SEGUIDAS  
            this.checkRealStreakLimits('LOSS');
        }

        // 🎯 Verificar Meta e Stop Loss (incluindo MIXED, pois afeta P&L)
        setTimeout(() => {
            this.checkGoalAndStopLoss();
        }, 1000);

        // 🔧 CORREÇÃO: Só disparar evento se não for resultado misto
        if (!isMixed) {
            window.dispatchEvent(new CustomEvent('tradeExecuted', {
                detail: {
                    mode: this.currentMode,
                    result: result,
                    counters: this.getCounters()
                }
            }));
        } else {
            // Para resultado misto, disparar evento especial
            window.dispatchEvent(new CustomEvent('mixedTradeExecuted', {
                detail: {
                    mode: this.currentMode,
                    result: 'MIXED',
                    counters: this.getCounters(),
                    message: 'Resultado misto - contadores preservados'
                }
            }));
        }

    }

    // 🎯 Verificar se previsão dinâmica está ativa
    isDynamicPredictionActive() {
        try {
            if (typeof getDynamicPredictionFromRules === 'function') {
                const dynamicPrediction = getDynamicPredictionFromRules(null);
                return dynamicPrediction !== null;
            }
            return false;
        } catch (error) {
            return false;
        }
    }

    // 🆕 NOVO PARÂMETRO: contractType para verificar Gale seletivo em modo BOTH
    getCurrentStakeValue(contractType = null) {
        try {

            // PRIORIDADE 1: Se há contrato atual sendo executado, usar o buy_price
            if (this.currentContract && this.currentContract.buyPrice) {
                const currentStake = parseFloat(this.currentContract.buyPrice);
                return currentStake;
            }

            // 🎯 FIX CRÍTICO: NUNCA aplicar Gale em modo SIMULACAO
            if (this.lastCalculatedStake && this.lastCalculatedStake > 0 && this.accumulatedLosses > 0 && this.currentMode !== 'SIMULACAO') {

                return this.lastCalculatedStake;
            }

            // 🎯 FIX CRÍTICO: NUNCA aplicar Gale em modo SIMULACAO
            if (this.lastCompletedContract && this.lastCompletedContract.buy_price && this.accumulatedLosses > 0 && this.currentMode !== 'SIMULACAO') {
                const lastStake = parseFloat(this.lastCompletedContract.buy_price);
                return lastStake;
            }


            // Se Soros está ativo, temos uma stake calculada e NÃO estamos em ciclo de recuperação (Gale)
            if (this.config.sorosLimit > 0 && this.nextSorosStake && this.accumulatedLosses === 0) {

                logConfig.info('trade_manager', `📈 [SOROS] Usando stake Soros: ${this.nextSorosStake} (Win ${this.sorosWins + 1}/${this.config.sorosLimit})`);
                return this.nextSorosStake;
            } else if (this.config.sorosLimit > 0) {

            }

            if (contractType && this.pendingGaleByContract && this.pendingGaleByContract[contractType] === false) {
                const baseStake = this.config.stake || 0.35;
                return baseStake;
            }

            // 🎯 FIX CRÍTICO: NUNCA calcular ou aplicar Gale em modo SIMULACAO
            const shouldApplyGale = this.currentMode !== 'SIMULACAO' && (this.riskController ? this.riskController.shouldApplyGale() :
                (this.config.galeActive && this.accumulatedLosses > 0));

            if (shouldApplyGale) {

                // ⚠️ IMPORTANTE: Não calcular aqui se não há payout - será calculado no executeRealTrade
                if (this.currentProposalPayout && this.currentProposalPayout > 0) {
                    try {
                        const calculatedStake = this.riskController.calculateGaleStake(contractType);

                        // Salvar localmente também para consistência visual
                        this.lastCalculatedStake = calculatedStake;

                        if (contractType) {
                            // Lógica de Gale específico por contrato (se houver) já tratada no RiskController/Config
                        }
                        return calculatedStake;
                    } catch (error) {
                        console.warn('⚠️ Erro ao calcular Gale no RiskController:', error);
                        // Fallback, mas preferivelmente deixar o erro propagar ou usar base
                    }
                } else {

                    // 🔍 NOVO: Se há stake preservada e deveria aplicar Gale, usar ela
                    if (this.lastCalculatedStake && this.lastCalculatedStake > this.config.stake) {
                        return this.lastCalculatedStake;
                    }
                }
            }

            // FALLBACK: Usar stake base da configuração
            const baseStake = this.config.stake || 0.35;

            if (this.currentMode !== 'SIMULACAO' && this.accumulatedLosses > 0 && this.config.galeActive) {
                // 🎯 CRÍTICO: Não alertar se Gale seletivo está bloqueando corretamente (flag !== true)
                const isSelectiveBlock = contractType && this.pendingGaleByContract[contractType] !== true;
                if (!isSelectiveBlock) {
                }
            }

            return baseStake;

        } catch (error) {
            CommonHelpers.showError('❌ [CURRENT STAKE] Erro ao obter valor atual da stake:', error);
            return this.config.stake || 0.35;
        }
    }

    // 🎰 NOVO: Obter último valor calculado do Gale (se disponível)
    getLastCalculatedGaleStake() {
        // Esta variável pode ser definida quando calculamos o Gale
        return this.lastCalculatedStake || 0;
    }

    // 🎰 NOVO: Obter valor da stake do último trade
    getLastTradeStake() {
        try {
            // Se há um contrato completado, usar o buy_price real
            if (this.lastCompletedContract && this.lastCompletedContract.buy_price) {
                const stake = parseFloat(this.lastCompletedContract.buy_price);

                return stake;
            }

            // Fallback: usar stake configurado
            const stake = this.config.stake || 0.35;

            return stake;

        } catch (error) {
            CommonHelpers.showError('❌ [LAST STAKE] Erro ao obter stake do último trade:', error);
            return this.config.stake || 0.35;
        }
    }

    // Transição para modo real
    transitionToRealMode(reason) {
        const newMode = this.getRealLabel();


        // 🎰 CRÍTICO: Preservar TODO o estado do Gale durante transição
        const preservedAccumulatedLosses = this.accumulatedLosses;
        const preservedRealLossesStreak = this.realLossesStreak;
        const preservedLastStake = this.lastCalculatedStake;
        const preservedCurrentPayout = this.currentProposalPayout;

        // 🔄 CRÍTICO: Resetar contadores simulados ao sair do modo SIMULAÇÃO
        this.simulatedWinsStreak = 0;
        this.simulatedLossesStreak = 0;

        // 🎰 RESTAURAR estado do Gale
        this.accumulatedLosses = preservedAccumulatedLosses;
        this.realLossesStreak = preservedRealLossesStreak;
        this.lastCalculatedStake = preservedLastStake;
        this.currentProposalPayout = preservedCurrentPayout;

        // 🎯 FIX: Restaurar stake pré-calculada se houver
        if (this.riskController && this.riskController.lastCalculatedStakeSplitted) {
            // Opcional: restaurar algo no RiskController? Ele já mantém o estado.
        }

        // 🎯 FIX: Verificar RiskController também, pois ele é a fonte da verdade
        const hasAccumulatedLosses = this.accumulatedLosses > 0 || (this.riskController && this.riskController.accumulatedLosses > 0);

        if (hasAccumulatedLosses) {
            this.pendingGaleApplication = true;

            // 🎯 SAFETY: Se nextTradeStake foi perdido, tentar recalcular
            if (!this.nextTradeStake && this.currentProposalPayout) {
                try {
                    // Recalcular apenas se tivermos payout válido
                    this.nextTradeStake = this.calculateGaleStake();
                    logConfig.info('trade_manager', `🎰 [TRANSITION] Gale stake recalculada na transição: ${this.nextTradeStake}`);
                } catch (e) {
                    logConfig.warn('trade_manager', `⚠️ [TRANSITION] Falha ao recalcular Gale na transição: ${e.message}`);
                }
            }
        } else {
            this.pendingGaleApplication = false;
        }

        // 🔄 Definir novo modo SEMPRE imediatamente
        this.setMode(newMode);

        if (this.onModeChange) {
            this.onModeChange(newMode, reason);
        }
    }

    // Lidar com limite real atingido
    handleRealLimitReached(type, count) {
        // 🎯 LÓGICA CORRETA: Verificar se simulação está habilitada
        const simulationEnabled = this.isSimulationEnabled();


        if (simulationEnabled) {

            // 🔄 CORREÇÃO: Resetar APENAS contadores de streak reais (não o Gale)
            this.realWinsStreak = 0;
            this.realLossesStreak = 0; // ✅ Apenas contador - Gale permanece intacto


            // 🎰 Configurar Gale pendente se necessário
            if (this.accumulatedLosses > 0) {
                this.pendingGaleApplication = true;
                logConfig.warn('trade_manager', `🎰 [GALE PENDENTE] Configurado para próximo trade real`);
            } else {
                this.pendingGaleApplication = false;
            }

            // 🔄 Definir modo simulação SEMPRE imediatamente
            this.setMode('SIMULACAO');

            if (this.onModeChange) {
                this.onModeChange('SIMULACAO', `${count} ${type} reais atingidas - voltando ao ciclo`);
            }

        } else {

            if (this.popupShown) {
                return;
            }

            this.popupShown = true;

            // 🎰 CRÍTICO: RESETAR TODO ESTADO GALE quando vai parar monitoramento
            this.realWinsStreak = 0;
            this.realLossesStreak = 0;
            this.accumulatedLosses = 0;
            this.lastCalculatedStake = null;
            this.currentProposalPayout = null;
            this.nextTradeStake = null;
            this.pendingGaleApplication = false;

            // 🛑 CRÍTICO: PARAR MONITORAMENTO ANTES DE MOSTRAR POPUP
            if (typeof MonitoringView !== 'undefined' && typeof MonitoringView.stopMonitoring === 'function') {
                MonitoringView.stopMonitoring();
            }

            // 🎨 USAR STOPMONITOR CENTRALIZADO
            if (typeof StopMonitor !== 'undefined') {
                if (type === 'vitórias') {
                    StopMonitor.showStopTradePopup('wins', count, this.config.realWinsLimit);
                } else if (type === 'perdas') {
                    StopMonitor.showStopTradePopup('losses', count, this.config.realLossesLimit);
                }
            } else {
                CommonHelpers.showError('❌ StopMonitor não disponível - usando fallback');
                // Fallback: mostrar alerta simples
                const message = type === 'vitórias'
                    ? `Limite de ${count} vitórias reais seguidas atingido!`
                    : `Limite de ${count} perdas reais seguidas atingido!`;
                alert(message);
            }
        }
    }

    checkGoalAndStopLoss() {
        // 🛡️ PROTEÇÃO CRÍTICA: Verificar se popup já foi mostrado (previne duplicação)
        if (this.popupShown) {

            return;
        }

        // Verificar apenas se as condições estão configuradas
        if (this.config.goal <= 0 && this.config.stopLoss <= 0) {
            return; // Nenhuma condição configurada
        }

        // SOLUÇÃO: sessionProfitLoss só atualiza DEPOIS do resultado final do trade
        const profitLoss = this.sessionProfitLoss;


        // 🎯 Verificar VALOR DA META (lucro positivo)
        if (this.config.goal > 0 && profitLoss >= this.config.goal) {

            // 🛡️ CRÍTICO: Setar flag ANTES de mostrar modal (previne duplicação)
            this.popupShown = true;

            if (typeof StopMonitor !== 'undefined') {
                StopMonitor.showStopTradePopup('meta', profitLoss, this.config.goal);
            } else {
                CommonHelpers.showError('❌ StopMonitor não disponível - usando fallback');
                this.showEnhancedStopPopup('meta', profitLoss, this.config.goal);
            }
            return;
        }

        // Condição: profitLoss <= -stopLoss (equivalente a: Math.abs(profitLoss) >= stopLoss)
        if (this.config.stopLoss > 0) {
            const absLoss = Math.abs(profitLoss);
            const shouldStop = absLoss >= this.config.stopLoss;


            if (shouldStop) {
                // 🛡️ CRÍTICO: Setar flag ANTES de mostrar modal (previne duplicação)
                this.popupShown = true;

                if (typeof StopMonitor !== 'undefined') {
                    StopMonitor.showStopTradePopup('stoploss', Math.abs(profitLoss), this.config.stopLoss);
                } else {
                    CommonHelpers.showError('❌ StopMonitor não disponível - usando fallback');
                    this.showEnhancedStopPopup('stoploss', Math.abs(profitLoss), this.config.stopLoss);
                }
                return;
            }

        }
    }

    // Mostrar popup de parada (versão legada - mantida para compatibilidade)
    showStopPopup(message) {
        // 🔧 Redirecionar para o novo popup melhorado
        if (message.includes('vitórias')) {
            this.showEnhancedStopPopup('wins', this.realWinsStreak, this.config.realWinsLimit);
        } else if (message.includes('perdas')) {
            this.showEnhancedStopPopup('losses', this.realLossesStreak, this.config.realLossesLimit);
        } else {
            // Popup genérico para casos não específicos
            this.showEnhancedStopPopup('generic', 0, 0);
        }
    }

    // 💰 NOVO: Obter saldo atual do rodapé (não do cache)
    getCurrentFooterBalance() {
        try {
            // Tentar diferentes seletores do rodapé conforme a estrutura atual
            const selectors = [
                '#header-balance-value',         // ✅ NOVO: Visor de saldo principal (Sidebar/Config)
                '.vip-balance strong',           // Rodapé VIP
                '.bottom-balance strong',        // Rodapé legacy
                '.balance strong'                // Fallback genérico
            ];

            for (const selector of selectors) {
                const balanceElement = document.querySelector(selector);
                if (balanceElement) {
                    const balanceText = balanceElement.textContent.trim();

                    // Extrair apenas o número do saldo (ex: "USD 123.45" -> 123.45)
                    const balanceMatch = balanceText.match(/[\d,]+\.?\d*/);
                    if (balanceMatch) {
                        const balanceValue = parseFloat(balanceMatch[0].replace(/,/g, ''));
                        if (!isNaN(balanceValue)) {
                            return balanceValue;
                        }
                    }
                }
            }

            return null;
        } catch (error) {
            return null;
        }
    }

    // 🔧 NOVO: Implementar stopMonitoring no TradeManager
    stopMonitoring() {

        // Reset de todas as flags e estados
        this.isActive = false;
        this.currentContract = null;
        this.awaitingExpiration = false;
        this.monitoringContracts.clear(); // 🔧 CORRIGIDO: Limpar Set de contratos monitorados
        this.lastCompletedContract = null;
        this.currentProposalPayout = null;
        this.lastCalculatedStake = null;
        this.lastSatisfiedGroupId = null;
        this.contractStartTime = null;
        this.contractStartPrice = null;

        // Reset das flags de popup para permitir novos alertas
        this.popupShown = false;

        // Reset do sistema de Gale
        this.accumulatedLosses = 0;

        // Reset do Soros
        this.sorosWins = 0;
        this.nextSorosStake = null;

    }

    // 🎯 REFATORADO: Função genérica de popup
    showPopup(title, message, icon = '⚠️', buttonText = 'Entendi', focusField = null) {
        if (window.MonitoringView?.stopAll) window.MonitoringView.stopAll();
        else this.stopMonitoring();

        const popup = document.createElement('div');
        popup.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);display:flex;justify-content:center;align-items:center;z-index:10000;font-family:Arial';
        popup.innerHTML = `<div style="background:white;padding:30px;border-radius:10px;max-width:500px;width:90%;text-align:center;box-shadow:0 10px 30px rgba(0,0,0,0.3)"><h3 style="color:#e74c3c;margin-bottom:20px;font-size:1.5em">${icon} ${title}</h3><p style="margin-bottom:20px;line-height:1.6;color:#333">${message}</p><button onclick="this.parentElement.parentElement.remove()" style="background:#3498db;color:white;border:none;padding:12px 30px;border-radius:5px;cursor:pointer;font-size:1em">${buttonText}</button></div>`;
        document.body.appendChild(popup);

        if (focusField) {
            popup.addEventListener('click', (e) => {
                if (e.target === popup || e.target.tagName === 'BUTTON') {
                    setTimeout(() => CommonHelpers.getElement(focusField)?.focus(), 100);
                }
            });
        }
    }

    showMinimumStakePopup(currentStake) {
        this.showPopup('Valor de Entrada Inválido', `O valor de entrada configurado é <strong>$${currentStake}</strong>, mas a Deriv exige um valor mínimo de <strong>$0.35</strong>. Por favor, ajuste o "Valor de Entrada" para pelo menos $0.35 antes de iniciar o monitoramento.`, '⚠️', 'Entendi', 'stake-input');
    }

    // Método para recarregar configuração da UI (entrada do monitoramento)
    reloadConfigurationFromUI() {
        // 🔧 CRÍTICO: Marcar início de novo monitoramento ANTES de qualquer coisa
        const newMonitoringTimestamp = Date.now().toString();
        sessionStorage.setItem('new_monitoring_started', newMonitoringTimestamp);
        sessionStorage.setItem(`new_monitoring_${this.sessionId}`, newMonitoringTimestamp);


        // Atualizar configuração da UI
        this.updateConfigurationFromUI();

        this.realWinsStreak = 0;
        this.realLossesStreak = 0;
        this.simulatedWinsStreak = 0;
        this.simulatedLossesStreak = 0;

        // 🎰 Resetar sistema de Gale
        this.accumulatedLosses = 0;
        this.pendingGaleApplication = false;
        this.lastCalculatedStake = null;
        this.currentProposalPayout = null;
        this.nextTradeStake = null; // 🎯 CRÍTICO: Resetar stake pré-calculado
        this.lastContractPayout = null; // 🎯 CRÍTICO: Resetar payout do último contrato

        // 🎯 CRÍTICO: Resetar contadores de Gale específicos do modo BOTH
        this.pendingGaleByContract = {};
        this.accumulatedLossesByContract = {};

        // 📈 Resetar Soros
        this.sorosWins = 0;
        this.nextSorosStake = null;

        // 💰 Resetar lucro/perda da sessão
        this.sessionProfitLoss = 0;

        // 🔧 Resetar flags de controle
        this.popupShown = false;
        this.monitoringContracts.clear(); // 🔧 CORRIGIDO: Limpar Set de contratos monitorados
        this.awaitingExpiration = false;

        // Resetar flag no StopMonitor
        if (typeof StopMonitor !== 'undefined') {
            StopMonitor.resetPopupFlag();
        }

        // Resetar flag específica do limite de trades
        this.tradeLimitModalShown = false;


        // 🎯 Definir saldo inicial para Meta e Stop Loss
        const currentUser = SessionManager.getCurrentUser();
        if (currentUser?.balance) {
            this.initialBalance = parseFloat(currentUser.balance.balance) || 0;
        } else {
            this.initialBalance = 0;
            CommonHelpers.showWarning('⚠️ [GOAL/STOP] Saldo inicial não disponível');
        }

        // 🎯 FIX: Resetar RiskController explicitamente se existir
        if (this.riskController) {
            this.riskController.resetCountersForMonitoring();
        }

        // 🎯 CORREÇÃO DEFINITIVA: Aplicar lógica exata dos cenários no reload
        const winsSimulados = this.config.simulatedWinsLimit || 0;
        const lossesSimulados = this.config.simulatedLossesLimit || 0;
        const realLabel = this.getRealLabel();

        let startMode;

        // CENÁRIO 1: Ganhos=0 E Perdas=0 -> DESABILITA simulação (modo real)
        if (winsSimulados === 0 && lossesSimulados === 0) {
            startMode = realLabel;
        }
        // CENÁRIO 2: Ganhos>0 OU Perdas>0 -> HABILITA simulação
        else if (winsSimulados > 0 || lossesSimulados > 0) {
            startMode = 'SIMULACAO';
        }
        // Fallback
        else {
            startMode = realLabel;
        }

        this.setMode(startMode);

        // Notificar UI sobre modo inicial
        if (this.onModeChange) {
            this.onModeChange(startMode, this.computeNextMode());
        }

        // 🔧 NOVO: Limpar flag de novo monitoramento após um delay
        setTimeout(() => {
            sessionStorage.removeItem('new_monitoring_started');
            sessionStorage.removeItem(`new_monitoring_${this.sessionId}`);

        }, 5000); // 5 segundos de proteção

        return startMode;
    }

    // Executar trade baseado no modo atual
    async executeTrade(entryPrice = null, satisfiedGroupId = null, bypassTradeLimit = false) {
        if (this.isPaused) {
            logConfig.info('trade_manager', `🚫 [PAUSE] Execução bloqueada globalmente: Sistema em pausa.`);
            return { success: false, reason: 'PAUSED' };
        }

        if (!this.isActive || this.awaitingExpiration) {

            CommonHelpers.showError('🚫🚫🚫 [EXECUTE TRADE] BLOQUEADO:');
            CommonHelpers.showError(`  - isActive: ${this.isActive} (precisa true)`);
            CommonHelpers.showError(`  - awaitingExpiration: ${this.awaitingExpiration} (precisa false)`);
            CommonHelpers.showWarning('⚠️ Trade já em andamento ou sistema inativo');
            return false;
        }


        // 🎯 CRÍTICO: Bloquear trades duplicados do mesmo tipo no mesmo tick (cooldown=0)
        // Permite trades diferentes (ex: OVER 3 + UNDER 6 em modo BOTH)
        if ((this.config.cooldownPeriod || 0) <= 0) {
            const currentContractType = this.config.contractType;
            const currentPrediction = this.config.prediction;

            // Verificar se já existe trade pendente do mesmo tipo
            for (const [contractId, contractData] of this.activeContracts.entries()) {
                if (contractData.contractType === currentContractType &&
                    contractData.prediction === currentPrediction) {
                    console.warn(`⚠️ [EXECUTE TRADE] Bloqueado: Trade duplicado do mesmo tipo já em execução (${currentContractType} ${currentPrediction})`);
                    return false;
                }
            }
        }

        // Setar flag de execução
        this.isExecutingTrade = true;


        // 📊 NOVO: Iniciar diagnóstico de execução
        if (window.tradeExecutionDiagnostics?.isActive) {
            const selectedTradeType = CommonHelpers.getElement('trade-type-select')?.value || this.config.contractType;
            window.tradeExecutionDiagnostics.startTradeExecution(selectedTradeType, this.currentMode);
            window.tradeExecutionDiagnostics.addExecutionStep('trade_validation', {
                isActive: this.isActive,
                awaitingExpiration: this.awaitingExpiration,
                currentMode: this.currentMode
            });
        }

        this.currentTradeMessageAdded = false;

        try {

            // Previne race condition quando trade é executado imediatamente após resultado
            const executionMode = this.determineNextExecutionMode();

            // Log para debug
            if (executionMode !== this.currentMode) {
                logConfig.info('trade_manager', `🔄 [EXECUTION MODE] Calculado: ${executionMode}, Atual: ${this.currentMode}`);
            }

            const executionConfig = { ...this.config }; // Clone da configuração atual

            // 🎯 CRÍTICO: Identificar se é trade real ou simulado no momento da execução
            this.tradeReal = (executionMode !== 'SIMULACAO');

            // 📊 DIAGNÓSTICO: Registrar início da execução
            if (window.tradeExecutionDiagnostics?.isActive) {
                window.tradeExecutionDiagnostics.addExecutionStep('execution_start', {
                    mode: executionMode,
                    tradeReal: this.tradeReal,
                    entryPrice: entryPrice
                });
            }

            // 🔐SEGURANÇA: Verificar consistência de conta ANTES de qualquer trade
            const currentUser = SessionManager.getCurrentUser();

            if (this.currentMode === 'REAL' || this.currentMode === 'VIRTUAL') {

                const userIsVirtual = currentUser?.authorize?.is_virtual;
                const userLoginId = currentUser?.authorize?.loginid;

                // Bloquear se modo não corresponde ao tipo de conta
                if ((this.currentMode === 'VIRTUAL' && !userIsVirtual) || (this.currentMode === 'REAL' && userIsVirtual)) {
                    const errorMsg = `🚨 BLOQUEIO DE SEGURANÇA: Tentativa de trade ${this.currentMode} em conta ${userIsVirtual ? 'virtual' : 'real'}`;
                    CommonHelpers.showError(errorMsg);
                    throw new Error(errorMsg);
                }
            }

            // ✅ VERIFICAÇÃO DE SALDO: Sempre verificar saldo atual antes de trade real
            if (executionMode !== 'SIMULACAO') {

                const currentUser = SessionManager.getCurrentUser();
                let currentBalance = 0;

                // Tentar obter saldo do rodapé primeiro (mais atualizado)
                const footerBalance = this.getCurrentFooterBalance();

                if (footerBalance !== null) {
                    currentBalance = footerBalance;
                } else if (currentUser?.balance?.balance) {
                    currentBalance = parseFloat(currentUser.balance.balance);
                }

                const requiredStake = this.getCurrentStakeValue();


                if (currentBalance < requiredStake) {
                    const errorMsg = `Saldo insuficiente: ${currentBalance.toFixed(2)} ${currentUser?.balance?.currency || 'USD'} < ${requiredStake.toFixed(2)}`;
                    CommonHelpers.showError(`❌ ${errorMsg}`);

                    // 📊 DIAGNÓSTICO: Registrar falha de saldo
                    if (window.tradeExecutionDiagnostics?.isActive) {
                        window.tradeExecutionDiagnostics.addExecutionStep('insufficient_balance', {
                            currentBalance,
                            requiredStake,
                            currency: currentUser?.balance?.currency
                        });
                        window.tradeExecutionDiagnostics.finishTradeExecution('insufficient_balance');
                    }

                    this.showInsufficientBalancePopup(currentBalance, requiredStake);
                    this.isExecutingTrade = false; // 🛡️ CRÍTICO: Resetar flag antes de retornar erro de saldo
                    return false;
                }
            }


            if (!this.validateConfiguration()) {
                CommonHelpers.showError('🚫🚫🚫 [EXECUTE TRADE] CONFIGURAÇÃO INVÁLIDA');

                // 📊 DIAGNÓSTICO: Registrar falha de validação
                if (window.tradeExecutionDiagnostics?.isActive) {
                    window.tradeExecutionDiagnostics.addExecutionStep('validation_failed', { reason: 'invalid_configuration' });
                    window.tradeExecutionDiagnostics.finishTradeExecution('validation_failed');
                }

                this.isExecutingTrade = false; // 🛡️ CRÍTICO: Resetar flag antes de retornar erro de validação
                return false;
            }

            // 📊 DIAGNÓSTICO: Validações OK
            if (window.tradeExecutionDiagnostics?.isActive) {
                window.tradeExecutionDiagnostics.addExecutionStep('validations_passed', {
                    currentBalance: currentUser?.balance?.balance,
                    requiredStake: this.isBothModeActive() ? (this.config.stake * 2) : this.config.stake
                });
            }

            // gerencia sua própria flag após suas validações específicas
            this.contractStartTime = Date.now();

            if (this.onTradeStart) {
                this.onTradeStart(this.currentMode, this.config);
            }

            let result = false;

            const tradeTypeSelect = CommonHelpers.getElement('trade-type-select');
            const selectedTradeType = tradeTypeSelect?.value;


            if (selectedTradeType && selectedTradeType !== 'BOTH' && selectedTradeType.trim() !== '') {
                this.config.contractType = selectedTradeType;

            }

            if (this.capturedPredictionsForTrade && Array.isArray(this.capturedPredictionsForTrade) && this.capturedPredictionsForTrade.length > 0) {
                // Pegar a primeira previsão que tenha um contractType definido
                const specificPrediction = this.capturedPredictionsForTrade.find(p => p.contractType !== null);

                if (specificPrediction && specificPrediction.contractType) {

                    this.config.contractType = specificPrediction.contractType;
                    this.proposalCache = null; // Invalidar cache pois o tipo mudou

                    // 🎯 FIX CRÍTICO: Resolver tokens dinâmicos para valor real (ex: dynamic_highest_percentage_digit -> 6)
                    let predictionValue = this._resolveDynamicPrediction(specificPrediction);

                    if (predictionValue === specificPrediction.predictionValue || predictionValue === specificPrediction.prediction) {
                        // Se não resolveu acima, tentar logar falha se era um token
                        const val = predictionValue;
                        if (typeof val === 'string' && val.startsWith('dynamic_')) {
                            logConfig.warn('trade_manager', `⚠️ [DYNAMIC RESOLVE] Falha ao resolver token: ${val}. _triggerDigit não encontrado.`);
                        }
                    } else {
                        logConfig.info('trade_manager', `🎯 [DYNAMIC RESOLVE] Token resolvido: ${specificPrediction.predictionValue || specificPrediction.prediction} -> ${predictionValue}`);
                    }

                    // Atualizar configuração se tivermos um valor válido
                    if (predictionValue !== undefined && predictionValue !== null) {
                        this.config.prediction = {
                            type: 'prediction',
                            value: predictionValue
                        };
                    }
                }
            }

            // 🔍 DEBUG: Salvar grupo satisfeito se foi fornecido
            if (satisfiedGroupId) {

                this.lastSatisfiedGroupId = satisfiedGroupId;
            }

            // Só usar executeBothTrade se "BOTH" foi explicitamente selecionado
            if (selectedTradeType === 'BOTH') {
                const bothContracts = this.getBothContracts();

                if (bothContracts) {

                } else {
                }

                // Obter ID do grupo satisfeito se disponível
                const groupId = satisfiedGroupId || this.lastSatisfiedGroupId || null;

                result = await this.executeBothTrade(entryPrice, groupId, executionMode);

            } else {

                // 🎯 CORREÇÃO: Usar executionMode calculado, não this.currentMode

                switch (executionMode) {
                    case 'SIMULACAO':
                        // 🎯 EXECUTAR trade simulado
                        result = await this.executeSimulatedTrade(entryPrice, bypassTradeLimit, 'EXECUTE TRADER SIMULATE DENTRO DO CASE');
                        break;
                    case 'REAL':
                    case 'VIRTUAL':

                        result = await this.executeRealTrade(entryPrice, bypassTradeLimit, 'EXECUTE TRADER REAL DENTRO DO CASE');
                        break;
                    default:
                        CommonHelpers.showError('🚫🚫🚫 [EXECUTE TRADE] MODO DESCONHECIDO:');
                        CommonHelpers.showError(`  - currentMode: ${this.currentMode}`);
                        CommonHelpers.showError(`❌ [EXECUTE DEBUG] Modo desconhecido: ${this.currentMode}`);
                        this.isExecutingTrade = false; // 🛡️ CRÍTICO: Resetar flag antes de retornar erro de modo
                        return false;
                }
            }

            // 📊 DIAGNÓSTICO: Finalizar execução
            if (window.tradeExecutionDiagnostics?.isActive) {
                window.tradeExecutionDiagnostics.addExecutionStep('execution_completed', {
                    result: result,
                    mode: this.currentMode
                });
                window.tradeExecutionDiagnostics.finishTradeExecution(result ? 'completed' : 'failed');
            }

            return result;
        } catch (error) {
            CommonHelpers.showError('🚫🚫🚫 [EXECUTE TRADE] EXCEÇÃO CAPTURADA:');
            CommonHelpers.showError(`  - erro: ${error.message}`);
            CommonHelpers.showError(`  - stack:`, error.stack);
            CommonHelpers.showError(`❌ Erro no trade ${this.currentMode}:`, error);

            // 📊 DIAGNÓSTICO: Registrar erro
            if (window.tradeExecutionDiagnostics?.isActive) {
                window.tradeExecutionDiagnostics.addExecutionStep('execution_error', {
                    error: error.message,
                    stack: error.stack
                });
                window.tradeExecutionDiagnostics.finishTradeExecution('error');
            }

            this.awaitingExpiration = false;
            return false;
        } finally {
            this.isExecutingTrade = false;

            // Isso garante que elas durem por todo o loop de trades no modo "Ambos"
            this.capturedPredictionsForTrade = null;
        }
    }

    // Executar trade simulado
    async executeSimulatedTrade(entryPrice = null, bypassTradeLimit = false, tradeChamada = '') {
        // ✅ EXCEÇÃO: Trades imediatos do modal podem bypassar o limite
        if (!bypassTradeLimit && !this.canExecuteTrade()) {
            logConfig.warn('trade_manager', `⛔ [SIMULADO] Trade bloqueado - limite de ${this.getTradeLimit()} por tick atingido`);
            return false;
        }

        // 🛡️ PROTEÇÃO: Marcar como em execução no início
        this.awaitingExpiration = true;
        this.currentTradeMessageAdded = false; // ✅ Resetar flag para novo trade

        // 🎯 CONTADOR POR TICK: Incrementar contador ANTES da execução
        this.incrementTradesCounter();

        // 🎯 NOVO: Incrementar contador de contratos executados (1 contrato simples SIMULADO)
        this.historyCounters.totalContractsExecuted++;

        // Salvar valores atuais de Gale para restauração posterior
        const savedNextTradeStake = this.nextTradeStake;
        const savedLastCalculatedStake = this.lastCalculatedStake;
        const savedConfigStake = this.config.stake;  // 🎯 NOVO: Salvar stake base original
        
        // Limpar temporariamente para forçar uso de stake base
        this.nextTradeStake = null;
        this.lastCalculatedStake = null;


        if (savedNextTradeStake) {
            logConfig.info('trade_manager', `🎮 [SIMULADO] Limpando Gale temporariamente (preservado: ${savedNextTradeStake}). Usando stake base: ${savedConfigStake}`);
        }

        try {
            // 🎯 MODERNO: Shim que adapta DerivServiceInstance à interface de marketData usada
            // por waitForNextTick / waitForTicks / waitForContractExpiration
            const derivSvc = window.DerivServiceInstance;
            const marketData = {
                getCurrentPrice: (symbol) => {
                    const hist = derivSvc && derivSvc.getHistoricalTicksSync(symbol, 1);
                    return hist?.prices?.[0] ?? null;
                },
                subscribeToTicks: (symbol, callback) => {
                    return new Promise((resolve) => {
                        if (!derivSvc) {
                            resolve(() => {});
                            return;
                        }
                        const listenerId = derivSvc.observerInstance.on('deriv.tick', (data) => {
                            if (data.tick && data.tick.symbol === symbol) {
                                callback(data.tick.quote);
                            }
                        });
                        resolve(() => derivSvc.observerInstance.removeById(listenerId));
                    });
                }
            };

            // 1. 🔧 CORREÇÃO: USAR PREÇO fornecido pelo MonitoringView quando regras foram atendidas
            if (entryPrice) {
                this.contractStartPrice = entryPrice;
            } else {
                // Fallback para método antigo caso entryPrice não seja fornecido
                const currentPrice = marketData.getCurrentPrice(this.config.symbol);

                if (!currentPrice) {
                    CommonHelpers.showError('❌ Não foi possível obter preço atual para simulação');
                    this.awaitingExpiration = false;
                    return false;
                }

                this.contractStartPrice = currentPrice;
            }

            // Suportar tanto array (novo formato) quanto valor único (backward compatibility)
            let usedPredictionValue = null; // 🎯 NOVO: Salvar previsão usada para mensagem

            if (this.capturedPredictionsForTrade && Array.isArray(this.capturedPredictionsForTrade) && this.capturedPredictionsForTrade.length > 0) {

                const specificPrediction = this.capturedPredictionsForTrade.find(p => p.contractType !== null);

                if (specificPrediction && specificPrediction.contractType &&
                    specificPrediction.contractType !== this.config.contractType) {

                    this.config.contractType = specificPrediction.contractType;
                    this.proposalCache = null; // Invalidar cache
                }

                // Para simulação, usar a primeira previsão que corresponde ao contractType atual (agora possivelmente atualizado)
                const matchingPrediction = this.capturedPredictionsForTrade.find(
                    pred => pred.contractType === this.config.contractType
                );

                if (matchingPrediction) {
                    // 🚀 FIX: Resolver tokens dinâmicos (ex: dynamic_repeated_digit -> 2)
                    const resolvedVal = this._resolveDynamicPrediction(matchingPrediction);

                    if (resolvedVal !== undefined && resolvedVal !== null) {
                        usedPredictionValue = resolvedVal; // 🎯 Salvar para mensagem
                        this.config.prediction = {
                            type: 'prediction',
                            value: resolvedVal
                        };
                        // 🎯 CRÍTICO: INVALIDAR CACHE pois previsão mudou!
                        this.proposalCache = null;
                    }
                }

                // Limpeza movida para o final do ciclo (executeTrade)
            } else if (this.capturedPredictionForTrade !== null && this.capturedPredictionForTrade !== undefined) {

                usedPredictionValue = this.capturedPredictionForTrade; // 🎯 Salvar para mensagem

                // Se for um token, tentar resolver (fallback)
                if (typeof usedPredictionValue === 'string' && usedPredictionValue.startsWith('dynamic_')) {
                    const tempObj = { predictionValue: usedPredictionValue };
                    // Aqui não temos a regra completa, mas o _resolveDynamicPrediction pode tentar via config se melhorarmos ele
                    // Por enquanto o ideal é que venha via capturedPredictionsForTrade (array)
                }

                this.config.prediction = {
                    type: 'prediction',
                    value: this.capturedPredictionForTrade
                };

                // 🎯 CRÍTICO: INVALIDAR CACHE pois previsão mudou!
                this.proposalCache = null;

                // Limpar após usar
                this.capturedPredictionForTrade = null;
            }

            try {
                const cooldownInstance = getCooldownOverlayInstance();
                if (cooldownInstance && typeof cooldownInstance.activateCooldown === 'function') {
                    // 🎯 VERIFICAR: Só ativar cooldown se período > 0
                    if (this.config.cooldownPeriod > 0) {
                        cooldownInstance.activateCooldown();
                    } else {
                    }
                } else {
                    CommonHelpers.showWarning('⚠️ Sistema de cooldown não disponível');
                }
            } catch (error) {
            }

            let exitTick;

            // 2. Aguardar expiração do contrato
            if (this.config.durationUnit === 't') {

                exitTick = await this.waitForContractExpiration(marketData);
            } else {

                await this.waitForContractExpiration(marketData);

                exitTick = await this.waitForNextTick(marketData);
            }

            if (!exitTick) {
                CommonHelpers.showError('❌ Não foi possível obter tick de saída');
                this.awaitingExpiration = false;
                this.isExecutingTrade = false; // 🛡️ CORREÇÃO: Resetar flag se não houver tick
                return false;
            }

            if (!exitTick.price) {
                CommonHelpers.showError('❌ Não foi possível obter preço de saída');
                this.awaitingExpiration = false;
                this.isExecutingTrade = false; // 🛡️ CORREÇÃO: Resetar flag se não houver preço
                return false;
            }

            // 4. USAR LÓGICA CORRETA PARA TRADES SIMULADOS
            const digitContracts = ['DIGITOVER', 'DIGITUNDER', 'DIGITEVEN', 'DIGITODD', 'DIGITDIFF', 'DIGITMATCH'];
            const isDigitContract = digitContracts.includes(this.config.contractType);

            // (mantém consistência com trades reais de dígitos)
            const entryPriceSimulated = this.contractStartPrice;
            const exitPriceSimulated = exitTick.price;

            if (isDigitContract) {
            } else {
            }

            // 5. COMPARAR RESULTADO BASEADO NO TIPO DE NEGOCIAÇÃO
            const isWin = this.determineTradeResult(entryPriceSimulated, exitPriceSimulated);

            // 📊 Processar resultado e atualizar contadores
            const tradeMode = this.tradeReal ? this.determineAccountMode() : 'SIMULACAO';
            const tradeSimulated = !this.tradeReal;

            this.handleTradeResult({
                mode: tradeMode,
                result: isWin ? 'WIN' : 'LOSS',
                simulated: tradeSimulated
            });

            this.awaitingExpiration = false;

            // (para que os preços corretos sejam mostrados antes de executar próximo trade)
            if (!this.currentTradeMessageAdded) {

                // savedConfigStake foi salvo no início de executeSimulatedTrade
                const baseStake = savedConfigStake || this.config.stake || 0.35;
                const simulatedProfit = isWin ? baseStake : -baseStake;

                // 🎯 NOVO: Passar previsão usada para mensagem (se disponível)
                this.addTradeResultMessage(
                    this.config.contractType,
                    entryPriceSimulated,
                    exitPriceSimulated,
                    'SIMULACAO',
                    isWin,
                    baseStake,  // ← CORRIGIDO: Usar stake base salva
                    simulatedProfit,
                    null, // contractId (null para simulação)
                    usedPredictionValue // 🎯 Previsão que foi realmente usada
                );
                this.currentTradeMessageAdded = true;

                // 🎯 MODERNO: Disparar evento direto para o front-end (React/BotDashboard)
                // Garante que o resultado chegue mesmo que o interceptor do LegacyBridge não esteja ativo
                window.dispatchEvent(new CustomEvent('tradeResultFront', {
                    detail: {
                        id: `sim-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
                        contractType: this.config.contractType,
                        type: this.config.contractType,
                        entryPrice: String(entryPriceSimulated || ''),
                        exitPrice: String(exitPriceSimulated || ''),
                        target: usedPredictionValue !== null && usedPredictionValue !== undefined
                            ? String(usedPredictionValue)
                            : (this.config.prediction?.value !== undefined ? String(this.config.prediction.value) : ''),
                        exit: String(exitPriceSimulated || ''),
                        mode: 'SIMULACAO',
                        isSimulation: 'SIMULACAO',
                        status: isWin ? 'WIN' : 'LOSS',
                        stake: baseStake,
                        profit: simulatedProfit,
                        symbol: this.config.symbol || window.selectedSymbol || '',
                        timestamp: new Date()
                    }
                }));
            }

            // 8. 🎯 CRÍTICO: PROCESSAR MUDANÇA DE MODO quando Cooldown=0
            const cooldownPeriod = this.config?.cooldownPeriod ?? 3;
            if (cooldownPeriod <= 0) {
                this.processModeChanges(tradeMode, isWin ? 'WIN' : 'LOSS', tradeSimulated);
            }

            // 🎯 CRÍTICO: Resetar flag de execução antes de qualquer possibilidade de re-entrada imediata
            this.isExecutingTrade = false;

            // 9. 🎯 CRÍTICO: Verificar regras IMEDIATAMENTE quando Cooldown=0 (Delay 0)
            // Agora habilitado para WIN e LOSS para garantir perseguição instantânea entre regras diferentes
            if (cooldownPeriod <= 0 && typeof MonitoringView !== 'undefined' && MonitoringView.forceImmediateRuleCheck) {
                // 🔓 CRÍTICO: Resetar flag estática também
                if (typeof MonitoringView !== 'undefined') {
                    MonitoringView.isExecutingTrade = false;
                }

                const outcome = { result: isWin ? 'WIN' : 'LOSS', mode: tradeMode, simulated: tradeSimulated };
                logConfig.info('trade_manager', `⚡ [DELAY 0] Disparando verificação imediata após trade (${outcome.result})`);
                // forceImmediateRuleCheck agora reseta todas as flags internamente
                await MonitoringView.forceImmediateRuleCheck(exitPriceSimulated, outcome);
            }

            if (this.onTradeEnd) {
                this.onTradeEnd('SIMULACAO', isWin, {
                    startPrice: entryPriceSimulated,
                    endPrice: exitPriceSimulated,
                    profit: isWin ? this.config.stake : -this.config.stake
                });
            }

            // Garante que está falso ao final
            this.isExecutingTrade = false;

            // ✅ CORREÇÃO: Retornar objeto com results para compatibilidade com executeImmediateTrade
            return {
                results: [{
                    contractType: this.config.contractType,
                    entryPrice: entryPriceSimulated,
                    exitPrice: exitPriceSimulated,
                    result: isWin,
                    actualStake: this.config.stake
                }],
                successCount: isWin ? 1 : 0
            };
        } catch (error) {
            CommonHelpers.showError('❌ Erro na execução do trade simulado:', error);

            // 🛡️ CRÍTICO: Resetar flag em caso de erro
            this.awaitingExpiration = false;
            this.isExecutingTrade = false; // 🛡️ CRÍTICO: Resetar flag de execução em caso de erro simulado

            return false;
        } finally {

            // Isso preserva o Gale para o próximo trade REAL
            this.nextTradeStake = savedNextTradeStake;
            this.lastCalculatedStake = savedLastCalculatedStake;

            if (savedNextTradeStake) {
                logConfig.info('trade_manager', `🎮 [SIMULADO FINALIZADO] Gale restaurado para próximo trade REAL: ${savedNextTradeStake}`);
            }
        }
    }

    async executeBothSimulated(contractsToExecute, entryPrice, satisfiedGroupId = null) {
        // 🎯 CRÍTICO: Salvar stake base ANTES de qualquer modificação
        const baseStake = this.config.stake;

        const marketData = getMarketDataInstance(SessionManager.getLocalToken());

        // 🎯 CRÍTICO: Para trades duplos simulados, sempre usar preço fornecido (das regras)
        const sharedEntryPrice = entryPrice || marketData.getCurrentPrice(this.config.symbol);

        if (!sharedEntryPrice) {
            throw new Error('Não foi possível obter preço de entrada para simulação');
        }

        // Para contratos de dígitos, este preço será usado nos cálculos dos dígitos
        const digitContracts = ['DIGITOVER', 'DIGITUNDER', 'DIGITEVEN', 'DIGITODD', 'DIGITDIFF', 'DIGITMATCH'];
        const hasDigitContracts = contractsToExecute.some(contract => digitContracts.includes(contract));

        if (hasDigitContracts) {
        }

        try {
            const cooldownInstance = getCooldownOverlayInstance();
            if (cooldownInstance && typeof cooldownInstance.activateCooldown === 'function') {
                // 🎯 VERIFICAR: Só ativar cooldown se período > 0
                if (this.config.cooldownPeriod > 0) {
                    cooldownInstance.activateCooldown();
                } else {
                }
            }
        } catch (error) {
        }

        // Aguardar expiração uma vez (compartilhada)
        let sharedExitTick;
        if (this.config.durationUnit === 't') {
            sharedExitTick = await this.waitForContractExpiration(marketData);
        } else {
            await this.waitForContractExpiration(marketData);
            sharedExitTick = await this.waitForNextTick(marketData);
        }

        if (!sharedExitTick) {
            throw new Error('Não foi possível obter tick de saída compartilhado');
        }

        const sharedExitPrice = sharedExitTick.price;

        // 🎯 CRÍTICO: Priorizar previsões capturadas (dinâmicas) sobre previsões estáticas
        let specificPredictions = {};

        // 1. Tentar usar previsões capturadas (para previsões dinâmicas das regras)
        if (this.capturedPredictionsForTrade && Array.isArray(this.capturedPredictionsForTrade) && this.capturedPredictionsForTrade.length > 0) {

            // Converter array para objeto { contractType: predictionValue }
            this.capturedPredictionsForTrade.forEach(pred => {
                // 🚀 FIX: Aceitar predictionValue null (necessário para Odd/Even)
                if (pred.contractType && pred.predictionValue !== undefined) {
                    specificPredictions[pred.contractType] = pred.predictionValue;
                }
            });

        }
        // 2. Fallback: Extrair previsões estáticas das regras
        else {

            specificPredictions = this.extractSpecificPredictionsFromRules(contractsToExecute, satisfiedGroupId);
        }

        // Avaliar resultado para cada contrato
        const results = [];
        let successCount = 0;

        for (const contractType of contractsToExecute) {
            // Configurar temporariamente o contrato
            const originalType = this.config.contractType;
            const originalPrediction = this.config.prediction;
            const originalBarrier = this.config.barrier; // ✅ CORREÇÃO: Salvar barrier também
            this.config.contractType = contractType;

            // 🎯 NOVO: Configurar previsão específica se disponível
            const specificPrediction = specificPredictions[contractType];

            if (specificPrediction !== undefined) {
                this.config.prediction = {
                    type: 'prediction',
                    value: specificPrediction
                };

            }

            // Se o tipo original era HIGHER_LOWER_GROUP e havia barrier, preservá-la
            if (!this.config.barrier && originalBarrier) {
                this.config.barrier = originalBarrier;
            }

            // Determinar resultado baseado no tipo de contrato
            const isWin = this.determineTradeResult(sharedEntryPrice, sharedExitPrice);

            if (isWin) successCount++;

            results.push({
                contractType: contractType,
                entryPrice: sharedEntryPrice,
                exitPrice: sharedExitPrice,
                result: isWin,
                actualStake: baseStake,
                specificPrediction: specificPrediction
            });

            // Restaurar configuração
            this.config.contractType = originalType;
            if (originalPrediction) {
                this.config.prediction = originalPrediction;
            }
            // ✅ CORREÇÃO: Restaurar barrier também
            this.config.barrier = originalBarrier;
        }

        return {
            results: results,
            successCount: successCount
        };
    }

    async executeBothReal(contractsToExecute, entryPrice, satisfiedGroupId = null) {

        // 🎯 NOVO: Gerar groupId único para este trade BOTH
        const bothGroupId = `both_${this.nextBothGroupId++}`;

        // 🎯 NOVO: Inicializar rastreamento do grupo BOTH
        this.bothTradeGroups.set(bothGroupId, {
            contracts: new Set(),
            results: new Map(), // contractId => isWin
            contractTypes: new Map(), // contractId => contractType (para Gale seletivo)
            contractStakes: new Map(), // contractId => stake usado (para calcular perdas)
            expectedCount: contractsToExecute.length,
            mode: this.currentMode,
            processed: false
        });

        try {
            // 🔐 VERIFICAÇÃO DE AUTENTICAÇÃO CRÍTICA
            const token = SessionManager.getLocalToken();
            if (!token) {
                const errorMsg = 'Sessão expirada. Por favor, faça login novamente.';
                CommonHelpers.showError(`🔐 ${errorMsg}`);
                throw new Error(errorMsg);
            }

            const currentUser = SessionManager.getCurrentUser();
            if (!currentUser?.authorize) {
                const errorMsg = 'Dados do usuário não encontrados. Por favor, faça login novamente.';
                CommonHelpers.showError(`🔐 ${errorMsg}`);
                throw new Error(errorMsg);
            }

            // 🔐 Verificar se o token ainda é válido
            if (!currentUser.authorize.loginid) {
                const errorMsg = 'Token de autenticação inválido. Por favor, faça login novamente.';
                CommonHelpers.showError(`🔐 ${errorMsg}`);
                throw new Error(errorMsg);
            }


            // ⚡ CRÍTICO: Mostrar overlay IMEDIATAMENTE (antes de executar contratos)
            try {
                const cooldownInstance = getCooldownOverlayInstance();
                if (cooldownInstance && this.config.cooldownPeriod > 0) {
                    if (typeof cooldownInstance.showProcessingOverlay === 'function') {
                        cooldownInstance.showProcessingOverlay('Processando contrato...');
                    } else {
                        // Fallback: ativar cooldown imediatamente
                        if (typeof cooldownInstance.activateCooldown === 'function') {
                            cooldownInstance.activateCooldown();
                        }
                    }
                } else {
                }
            } catch (error) {
            }

            const originalContractType = this.config.contractType;


            // Se não houver, extrair da estratégia (para previsões estáticas como "differ 3")
            let specificPredictions = {};

            if (this.capturedPredictionsForTrade && Array.isArray(this.capturedPredictionsForTrade) && this.capturedPredictionsForTrade.length > 0) {

                this.capturedPredictionsForTrade.forEach(pred => {
                    // Aceitar predictionValue null (para Even/Odd) ou definido
                    if (pred.contractType && pred.predictionValue !== undefined) {
                        specificPredictions[pred.contractType] = pred.predictionValue;
                    }
                });

            }
            // Fallback para previsão única (backward compatibility)
            else if (this.capturedPredictionForTrade !== null && this.capturedPredictionForTrade !== undefined) {

                for (const contractType of contractsToExecute) {
                    specificPredictions[contractType] = this.capturedPredictionForTrade;
                }
                // Limpar após usar
                this.capturedPredictionForTrade = null;
                specificPredictions = this.extractSpecificPredictionsFromRules(contractsToExecute, satisfiedGroupId);

            }

            // 🎯 NOVO: Passar bothGroupId para cada contrato individual
            for (const contractType of contractsToExecute) {
                // 🚀 FIX: Garantir que 0 e null passem (previsões válidas)
                const specificPrediction = (specificPredictions[contractType] !== undefined) ? specificPredictions[contractType] : null;
                logConfig.info('trade_manager', `🔄 [BOTH LOOP] Chamando executeSingleRealContract para ${contractType} com previsão: ${specificPrediction}`);
                await this.executeSingleRealContract(contractType, entryPrice, token, currentUser, specificPrediction, bothGroupId);
            }

            // 🎯 LIMPAR após o loop de contratos
            this.capturedPredictionsForTrade = null;

            // Restaurar configuração original
            this.config.contractType = originalContractType;

            // 🎯 LIMPAR previsão capturada após uso
            this.capturedPredictionForTrade = null;

            return true;

        } catch (error) {

            // 🎯 CRÍTICO: Limpar previsão capturada mesmo em caso de erro
            if (this.capturedPredictionForTrade !== null) {
                this.capturedPredictionForTrade = null;
            }

            // Limpar grupo em caso de erro
            this.bothTradeGroups.delete(bothGroupId);
            throw error;
        }
    }

    async executeSingleRealContract(contractType, entryPrice, token, currentUser, specificPrediction = null, bothGroupId = null) {

        try {

            // ⚡ OTIMIZAÇÃO: Garantir que conexão persistente está ativa
            if (!this.tradingAPI || !this.tradingAPIConnected) {

                const connected = await this.initializeTradingConnection();

                if (!connected) {

                    throw new Error('Não foi possível estabelecer conexão com a Deriv');
                }

            }

            // ⚡ OTIMIZAÇÃO: Reutilizar conexão já estabelecida
            const api = this.tradingAPI;

            // Configurar temporariamente o tipo de contrato
            const originalType = this.config.contractType;
            const originalPrediction = this.config.prediction;
            const originalBarrier = this.config.barrier; // ✅ CORREÇÃO: Salvar barrier também
            this.config.contractType = contractType;
            logConfig.info('trade_manager', `🔀 [SINGLE] Configurando contrato: ${contractType}`);

            // 🎯 NOVO: Verificar array de previsões primeiro
            if (this.capturedPredictionsForTrade && Array.isArray(this.capturedPredictionsForTrade) && this.capturedPredictionsForTrade.length > 0) {
                const matchingPrediction = this.capturedPredictionsForTrade.find(
                    pred => pred.contractType === contractType
                );

                if (matchingPrediction) {
                    // 🚀 FIX: Resolver tokens dinâmicos
                    const resolvedVal = this._resolveDynamicPrediction(matchingPrediction);

                    if (resolvedVal !== undefined && resolvedVal !== null) {
                        this.config.prediction = {
                            type: 'prediction',
                            value: resolvedVal
                        };
                        // 🎯 CRÍTICO: INVALIDAR CACHE pois previsão mudou!
                        this.proposalCache = null;
                    }
                }

            }
            else if (this.capturedPredictionForTrade !== null && this.capturedPredictionForTrade !== undefined) {

                this.config.prediction = {
                    type: 'prediction',
                    value: this.capturedPredictionForTrade
                };

                // 🎯 CRÍTICO: INVALIDAR CACHE pois previsão mudou!
                this.proposalCache = null;

            }
            // 🎯 PRIORIDADE 2: Usar specificPrediction se fornecido e NÃO há captura
            else if (specificPrediction !== undefined) {
                logConfig.info('trade_manager', `🎯 [SINGLE] Usando specificPrediction: ${specificPrediction}`);
                this.config.prediction = {
                    type: 'prediction',
                    value: specificPrediction
                };
            } else {
                logConfig.warn('trade_manager', `🚨 [SINGLE] Nenhuma previsão disponível para ${contractType}!`);
            }

            // Se o tipo original era HIGHER_LOWER_GROUP e havia barrier, preservá-la
            if (!this.config.barrier && originalBarrier) {
                this.config.barrier = originalBarrier;
            }

            try {
                // Obter preço atual se não fornecido
                const currentPrice = entryPrice || this.getCurrentPrice();
                if (!currentPrice) {
                    throw new Error(`Preço atual não disponível para ${this.config.symbol}`);
                }

                // 🎯 CRÍTICO: Salvar o preço de entrada quando as regras foram atendidas
                this.contractStartPrice = currentPrice;


                // ETAPA 1: Proposta inicial com Gale PROATIVO
                let proactiveStake = this.config.stake;

                const hasGlobalLosses = (this.accumulatedLosses > 0) || (this.riskController && this.riskController.accumulatedLosses > 0);
                const hasSpecificGale = bothGroupId && this.pendingGaleByContract[contractType] === true;

                const shouldUseGaleForThisContract = bothGroupId ?
                    (this.pendingGaleByContract[contractType] !== false && (hasSpecificGale || hasGlobalLosses)) :
                    (this.shouldApplyGale() || hasGlobalLosses);

                if (shouldUseGaleForThisContract) {
                    try {
                        // 🎯 [PROATIVO] Usar fallback se detectada mudança de contrato
                        proactiveStake = this.calculateGaleStake(contractType, specificPrediction);
                        logConfig.info('trade_manager', `🎰 [SINGLE-PROATIVO] Stake estimada para ${contractType}: ${proactiveStake}`);
                    } catch (e) {
                        logConfig.warn('trade_manager', `⚠️ [SINGLE-PROATIVO] Erro no cálculo estimado: ${e.message}`);
                    }
                }

                const tradeParams = this.buildProposalParams();
                tradeParams.currency = currentUser.authorize.currency;
                tradeParams.amount = proactiveStake;

                const proposalResponse = await api.sendRequest(tradeParams);


                if (proposalResponse.error) {
                    // 🔐 Tratamento especial para erro de autenticação
                    if (proposalResponse.error.message && proposalResponse.error.message.toLowerCase().includes('log in')) {
                        const errorMsg = '🔐 Sessão expirada. Por favor, faça logout e login novamente para continuar operando.';
                        CommonHelpers.showError(errorMsg);
                        throw new Error('Sessão expirada - login necessário');
                    }
                    throw new Error(`Erro na proposta: ${proposalResponse.error.message}`);
                }

                // Precisamos calcular o multiplicador: payout / ask_price
                if (!proposalResponse.proposal || !proposalResponse.proposal.payout) {
                    throw new Error('Proposta não contém payout válido');
                }

                const payoutAbsoluto = parseFloat(proposalResponse.proposal.payout);
                const askPrice = parseFloat(proposalResponse.proposal.ask_price || this.config.stake);
                const payoutMultiplicador = payoutAbsoluto / askPrice;

                this.currentProposalPayout = payoutMultiplicador;

                // 🎯 FIX: Priorizar nextTradeStake (calculado pelo LOCAL JUDGE) sobre stake base
                let finalStake = this.nextTradeStake || this.config.stake;
                let finalProposalId = proposalResponse.proposal.id;

                // Se usou nextTradeStake, limpar para evitar reuso incorreto
                if (this.nextTradeStake && Math.abs(this.nextTradeStake - this.config.stake) > 0.01) {

                    // Fazer nova proposta com stake do Gale
                    tradeParams.amount = this.nextTradeStake;
                    const newProposal = await api.sendRequest(tradeParams);

                    if (!newProposal.error && newProposal.proposal) {
                        finalProposalId = newProposal.proposal.id;
                        // Atualizar payout da nova proposta
                        if (newProposal.proposal.payout) {
                            const newPayoutAbsoluto = parseFloat(newProposal.proposal.payout);
                            const newAskPrice = parseFloat(newProposal.proposal.ask_price || this.nextTradeStake);
                            this.currentProposalPayout = newPayoutAbsoluto / newAskPrice;
                        }
                    }
                }


                if (shouldUseGaleForThisContract) {

                    try {
                        // 🎯 CRÍTICO: Em modo BOTH, usar perdas acumuladas específicas deste contractType
                        let galeStake;
                        if (bothGroupId && this.accumulatedLossesByContract && this.accumulatedLossesByContract[contractType] > 0) {
                            const lossesForThisContract = this.accumulatedLossesByContract[contractType];

                            // Calcular Gale baseado nas perdas específicas deste contrato
                            const currentPayout = parseFloat(this.currentProposalPayout);
                            if (currentPayout && currentPayout > 0) {
                                const profitMultiplier = currentPayout > 1.0 ? (currentPayout - 1) : currentPayout;
                                galeStake = (lossesForThisContract / profitMultiplier) * (this.config.galeAdjustment || 2.4);
                                galeStake = parseFloat(Math.max(galeStake, this.config.stake).toFixed(2));

                            } else {

                                galeStake = this.config.stake;
                            }
                        } else {
                            // Modo normal (não-BOTH) ou sem perdas específicas
                            galeStake = this.calculateGaleStake(contractType, specificPrediction);
                        }

                        // ETAPA 3: Se stake mudou, fazer nova proposta com stake Gale
                        if (Math.abs(galeStake - this.config.stake) > 0.01) {
                            tradeParams.amount = galeStake;

                            const newProposal = await api.sendRequest(tradeParams);
                            if (newProposal.error) {
                                CommonHelpers.showError(`❌ [SINGLE CONTRACT] Erro na proposta Gale, usando inicial`);
                            } else {
                                // Calcular multiplicador correto da nova proposta
                                if (newProposal.proposal && newProposal.proposal.payout) {
                                    const newPayoutAbsoluto = parseFloat(newProposal.proposal.payout);
                                    const newAskPrice = parseFloat(newProposal.proposal.ask_price || galeStake);
                                    const newPayoutMultiplicador = newPayoutAbsoluto / newAskPrice;

                                    this.currentProposalPayout = newPayoutMultiplicador;
                                }

                                finalStake = galeStake;
                                finalProposalId = newProposal.proposal.id;
                                this.lastCalculatedStake = galeStake;


                            }
                        } else {

                        }
                    } catch (error) {
                        CommonHelpers.showError(`❌ [SINGLE CONTRACT] Erro ao calcular Gale:`, error);
                    }
                } else {

                }

                // Isso garante que ambos os contratos do grupo usem as mesmas flags
                if (bothGroupId) {
                }

                // ETAPA 3.5: FILTRO DE RISCO ALGORÍTMICO
                if (typeof window.riskFilterModule !== 'undefined') {
                    const riskCheck = window.riskFilterModule.filtrarRisco();

                    if (!riskCheck.permitirTrade) {
                        CommonHelpers.showWarning(`🛡️ ${riskCheck.motivo}`);

                        return;
                    }
                }

                // ETAPA 4: Executar compra com a proposta final (pode ser Gale ou base)
                const buyParams = {
                    buy: finalProposalId,
                    price: finalStake
                };

                const buyResponse = await api.sendRequest(buyParams);


                if (buyResponse.error) {
                    throw new Error(`Erro na compra: ${buyResponse.error.message}`);
                }

                const contractId = buyResponse.buy.contract_id;
                const actualBuyPrice = parseFloat(buyResponse.buy.buy_price);

                // 🎯 CORREÇÃO: Suportar tanto objeto quanto valor primitivo
                const savedPrediction = this.config.prediction ?
                    (typeof this.config.prediction === 'object' ? this.config.prediction.value : this.config.prediction)
                    : null;

                const contractData = {
                    id: contractId,
                    startTime: Date.now(),
                    startPrice: entryPrice,
                    buyPrice: actualBuyPrice,
                    payout: buyResponse.buy.payout,
                    contractType: contractType,
                    symbol: this.config.symbol,
                    prediction: savedPrediction,  // 🎯 CRÍTICO: Salvar previsão específica
                    bothGroupId: bothGroupId,  // 🎯 NOVO: Salvar groupId para trades BOTH
                    contractStake: actualBuyPrice // 🎯 FIX: Salvar stake real para LOCAL JUDGE
                };

                // 🎯 CRUCIAL: Salvar no Map indexado por contractId
                this.activeContracts.set(contractId, contractData);


                // 🎯 NOVO: Se for parte de um grupo BOTH, adicionar ao rastreamento
                if (bothGroupId && this.bothTradeGroups.has(bothGroupId)) {
                    const group = this.bothTradeGroups.get(bothGroupId);
                    group.contracts.add(contractId);
                    group.contractTypes.set(contractId, contractType); // Armazenar tipo para Gale seletivo
                    group.contractStakes.set(contractId, actualBuyPrice); // Armazenar stake usado
                }

                // 🔧 Manter compatibilidade com código legado
                this.currentContract = contractData;

                this.monitorContractResult(api, contractId, this.currentMode);

                return {
                    contractType: contractType,
                    contractId: contractId,
                    entryPrice: entryPrice,
                    actualStake: actualBuyPrice,
                    success: true
                };

            } finally {
                // Restaurar configurações originais
                this.config.contractType = originalType;
                if (originalPrediction) {
                    this.config.prediction = originalPrediction;
                }
                // ✅ CORREÇÃO: Restaurar barrier também
                this.config.barrier = originalBarrier;

            }

        } catch (error) {
            CommonHelpers.showError(`🚫🚫🚫 [SINGLE CONTRACT] EXCEÇÃO:`, error);
            throw error;
        }
    }

    async waitForSingleContractResult(api, contractId) {
        try {
            const maxAttempts = 30; // 5 minutos máximo
            let attempts = 0;

            while (attempts < maxAttempts) {
                attempts++;

                const contractResponse = await api.sendRequest({
                    proposal_open_contract: 1,
                    contract_id: contractId
                });

                if (contractResponse.error) {
                    break;
                }

                const contract = contractResponse.proposal_open_contract;

                if (contract.is_expired || contract.status === 'sold') {

                    return contract;
                }

                await new Promise(resolve => setTimeout(resolve, 2000));
            }

            return null;

        } catch (error) {
            return null;
        }
    }

    getCurrentPrice() {
        try {
            const marketData = getMarketDataInstance(SessionManager.getLocalToken());
            if (!marketData) {
                return null;
            }
            return marketData.getCurrentPrice(this.config.symbol);
        } catch (error) {
            return null;
        }
    }

    async executeBothTrade(entryPrice = null, satisfiedGroupId = null, executionMode = null) {

        // 🎯 NOVO: Calcular quantos contratos serão executados para verificação preventiva
        const bothContracts = this.getBothContracts();

        if (!bothContracts || bothContracts.contracts.length === 0) {
            CommonHelpers.showError('❌ [BOTH] Não foi possível obter contratos para modo "Ambos"');
            return false;
        }

        const contractsToExecute = this.determineContractsForBothMode(bothContracts, satisfiedGroupId, executionMode, false, this.capturedPredictionsForTrade);
        console.warn(`  - contractsToExecute (determinados pelo selector): ${JSON.stringify(contractsToExecute)}`);
        const numContracts = contractsToExecute.length;

        if (numContracts === 0) {
            CommonHelpers.showError('❌ [BOTH] Nenhum contrato foi determinado para execução');
            return false;
        }

        if (this.awaitingExpiration) {
            return false;
        }

        this.awaitingExpiration = true;

        let realContractsReserved = false;

        try {

            this.historyCounters.totalContractsExecuted += numContracts;

            if (!executionMode) {
                throw new Error('[BOTH TRADE] ERRO CRÍTICO: executionMode não foi fornecido como parâmetro!');
            }

            const executedMode = executionMode; // Usar APENAS o parâmetro, não this.currentMode

            const isRealOrVirtual = (executedMode === 'REAL' || executedMode === 'VIRTUAL');

            if (isRealOrVirtual) {


                if (executedMode === 'REAL') {
                    this.historyCounters.totalRealContractsExecuted += numContracts;
                }
                this.historyCounters.tradeLimitCounter += numContracts;

                realContractsReserved = true;
            }

            const originalContractType = this.config.contractType;

            // 🎯 CRÍTICO: Variável executedMode já foi declarada acima
            const wasSimulated = executedMode === 'SIMULACAO';

            if (executedMode === 'SIMULACAO') {

                const sharedResults = await this.executeBothSimulated(contractsToExecute, entryPrice, satisfiedGroupId);

                const tradeResults = sharedResults.results;
                const successCount = sharedResults.successCount;

                // Restaurar configuração original
                this.config.contractType = originalContractType;

                // Calcular resultado consolidado
                const totalContracts = contractsToExecute.length;
                const tradeCountingResult = this.calculateBothTradeCountingResult(successCount, totalContracts);

                // Contabilizar resultado
                if (tradeCountingResult === 'MIXED') {
                } else if (tradeCountingResult === 'WIN' || tradeCountingResult === 'LOSS') {
                    this.handleTradeResult({
                        mode: executedMode,
                        result: tradeCountingResult,
                        simulated: wasSimulated
                    });
                }


                tradeResults.forEach((result, index) => {

                    const realProfit = result.result ? result.actualStake : -result.actualStake;

                    this.addTradeResultMessage(
                        result.contractType,
                        result.entryPrice,
                        result.exitPrice,
                        executedMode,
                        result.result,
                        result.actualStake,
                        realProfit,
                        null, // contractId (null para simulação)
                        result.specificPrediction // 🎯 Passar previsão específica usada
                    );
                });

                // Resetar flag após cooldown
                this.awaitingExpiration = false;

                return successCount > 0;

            } else {

                await this.executeBothReal(contractsToExecute, entryPrice, satisfiedGroupId);

                // Restaurar configuração original
                this.config.contractType = originalContractType;

                this.awaitingExpiration = false;

                return true;
            }

        } catch (error) {
            CommonHelpers.showError('❌ [BOTH] Erro crítico no trade duplo:', error);

            // 🎯 CRÍTICO: ROLLBACK dos slots reservados se execução falhou
            this.historyCounters.totalContractsExecuted -= numContracts;
            if (realContractsReserved) {
                this.historyCounters.totalRealContractsExecuted -= numContracts;
                this.historyCounters.tradeLimitCounter -= numContracts;
            }


            this.awaitingExpiration = false;
            return false;
        }
    }

    // Executar trade real (REAL ou VIRTUAL)
    async executeRealTrade(entryPrice = null, bypassTradeLimit = false, options = {}, tradeChamada = '') {
        console.log("REAL TRADER ", tradeChamada);
        const { suppressGlobalSideEffects = false } = options;


        // Isso previne que trades simulados sejam executados como reais devido a race conditions
        if (this.tradeReal === false) {
            return await this.executeSimulatedTrade(entryPrice, bypassTradeLimit);
        }

        // 🎯 CRÍTICO: Capturar modo NO INÍCIO antes de qualquer mudança assíncrona
        const capturedMode = this.currentMode;

        // ✅ EXCEÇÃO: Trades imediatos do modal podem bypassar o limite
        if (!bypassTradeLimit && !this.canExecuteTrade()) {

            logConfig.warn('trade_manager', `⛔ [REAL] Trade bloqueado - limite de ${this.getTradeLimit()} por tick atingido`);
            this.isExecutingTrade = false; // 🛡️ CORREÇÃO: Resetar flag se for bloqueado por limite
            return false;
        }

        let proposalId;
        let finalStake;

        // 🎯 MODERNO: Usar DerivServiceInstance (TypeScript) em vez de tradingAPI (legado)
        const derivService = window.DerivServiceInstance;
        if (!derivService || !derivService.isConnected) {
            logConfig.warn('trade_manager', '⛔ [REAL] DerivService não está conectado. Verifique a conexão com a corretora.');
            this.isExecutingTrade = false;
            return false;
        }

        if (this.capturedPredictionsForTrade && Array.isArray(this.capturedPredictionsForTrade)) {
            const specificContract = this.capturedPredictionsForTrade.find(p => p.contractType !== null);

            if (specificContract && specificContract.contractType &&
                specificContract.contractType !== this.config.contractType) {

                logConfig.info('trade_manager', `🔀 [REAL] Switch Dinâmico detectado! De ${this.config.contractType} para ${specificContract.contractType}`);
                this.config.contractType = specificContract.contractType;
                this.proposalCache = null; // OBRIGATÓRIO: Cache é inválido para novo contrato
            }
        }

        let capturedPrediction = this.config.prediction ?
            (typeof this.config.prediction === 'object' ? this.config.prediction.value : this.config.prediction)
            : null;

        // 1. Tentar array de previsões (novo formato)
        if (this.capturedPredictionsForTrade && Array.isArray(this.capturedPredictionsForTrade) && this.capturedPredictionsForTrade.length > 0) {

            // Tentar encontrar previsão para o contrato atual (que pode ter sido atualizado acima)
            const matchingPrediction = this.capturedPredictionsForTrade.find(
                pred => pred.contractType === this.config.contractType
            );

            // Atualizar config se encontrar previsão específica
            if (matchingPrediction) {
                // 🚀 FIX: Resolver tokens dinâmicos (ex: dynamic_repeated_digit -> 2)
                const resolvedVal = this._resolveDynamicPrediction(matchingPrediction);

                if (resolvedVal !== undefined && resolvedVal !== null) {
                    capturedPrediction = resolvedVal;

                    // Atualizar config para garantir consistência
                    this.config.prediction = {
                        type: 'prediction',
                        value: capturedPrediction
                    };

                    // Invalidar cache se previsão mudou
                    if (this.currentProposal && this.currentProposal.prediction !== capturedPrediction) {
                        this.proposalCache = null;
                    }
                }
            }

        }

        const capturedContractType = this.config.contractType;

        // Declarar variáveis usadas fora do try
        let barrierValue = null;

        try {

            // 🎯 CRÍTICO: Verificar se a previsão (barrier) mudou. Se mudou, NÃO usar cache!
            let isCacheValid = false;
            if (this.currentProposal && this.currentProposal.id && (Date.now() - this.currentProposal.timestamp < 5000)) {
                // Verificar se barrier mudou
                const currentPrediction = capturedPrediction; // Usar valor capturado
                const cachedPrediction = this.currentProposal.prediction;

                if (currentPrediction === cachedPrediction) {
                    isCacheValid = true;
                }
            }

            if (isCacheValid) {
                proposalId = this.currentProposal.id;

                const expectedStake = this.nextTradeStake || this.getCurrentStakeValue();

                if (Math.abs(expectedStake - this.currentProposal.stake) > 0.01) {

                    isCacheValid = false;
                } else {
                    finalStake = expectedStake;

                }
            } else {

                // 🎰 [PROATIVO] Recalcular Gale se necessário ANTES da proposta
                if (this.config.galeActive && (this.accumulatedLosses > 0 || (this.riskController && this.riskController.accumulatedLosses > 0))) {
                    try {
                        const targetBarrier = capturedPrediction !== null ? capturedPrediction : null;
                        this.nextTradeStake = this.calculateGaleStake(capturedContractType, targetBarrier);
                        logConfig.info('trade_manager', `🎰 [PROATIVO] Stake ajustada para ${capturedContractType} em executeRealTrade: ${this.nextTradeStake}`);
                    } catch (e) {
                        logConfig.warn('trade_manager', `⚠️ [PROATIVO] Falha no recálculo Gale: ${e.message}`);
                    }
                }

                finalStake = this.nextTradeStake || this.getCurrentStakeValue();

                logConfig.info('trade_manager', `🎰 [EXECUTE REAL] Stake Final: ${finalStake}`);

                // Preparar parâmetros da proposta
                const proposalParams = {
                    proposal: 1,
                    amount: finalStake,
                    basis: 'stake',
                    contract_type: capturedContractType, // Usar valor capturado
                    currency: this.config.currency || 'USD',
                    symbol: this.config.symbol,
                    duration: this.config.duration,
                    duration_unit: this.config.durationUnit
                };

                // Adicionar previsão APENAS se for contrato de dígito que requer barreira
                const digitContractsWithBarrier = ['DIGITMATCH', 'DIGITDIFF', 'DIGITOVER', 'DIGITUNDER'];
                // barrierValue já foi declarado

                if (digitContractsWithBarrier.includes(capturedContractType) &&
                    capturedPrediction !== null &&
                    capturedPrediction !== undefined) {

                    barrierValue = capturedPrediction;

                    // Validar que é um número válido (0-9)
                    if (typeof barrierValue === 'number' && barrierValue >= 0 && barrierValue <= 9) {
                        proposalParams.barrier = barrierValue;
                    }
                }

                // 🎯 MODERNO: Enviar proposta via DerivServiceInstance
                const proposalResponse = await derivService.send(proposalParams);

                if (proposalResponse.error) {
                    throw new Error(`Erro na proposta: ${proposalResponse.error.message}`);
                }

                proposalId = proposalResponse.proposal.id;
                // Atualizar cache
                this.currentProposal = {
                    id: proposalId,
                    stake: finalStake,
                    timestamp: Date.now(),
                    payout: proposalResponse.proposal.payout,
                    prediction: barrierValue
                };

                // 🎯 [REATIVO] Validar ROI real da proposta
                if (this.riskController && finalStake > 0) {
                    const realPayout = proposalResponse.proposal.payout;
                    const realROI = realPayout / finalStake;

                    // Sincronizar payout real no riskController
                    this.riskController.setProposalPayout(realROI);

                    // Se o ROI real for muito diferente do esperado (> 3%), RECALCULAR E REPROPOR
                    if (this.config.galeActive && this.accumulatedLosses > 0) {
                        const expectedROI = this.riskController.currentProposalPayout || 1.95;
                        const diff = Math.abs(realROI - expectedROI);

                        if (diff > 0.03) {
                            logConfig.warn('trade_manager', `🎰 [REATIVO] ROI Real (${realROI.toFixed(3)}) difere do estimado (${expectedROI.toFixed(3)}). Recalculando...`);

                            const correctedStake = this.calculateGaleStake(capturedContractType, barrierValue);

                            if (correctedStake !== finalStake) {
                                logConfig.warn('trade_manager', `🎰 [REATIVO] Stake Corrigida: ${finalStake} -> ${correctedStake}. Solicitando nova proposta...`);

                                // Atualizar stake e pedir nova proposta
                                finalStake = correctedStake;
                                proposalParams.amount = finalStake;

                                const secondProposal = await derivService.send(proposalParams);
                                if (!secondProposal.error) {
                                    proposalId = secondProposal.proposal.id;
                                    proposalResponse.proposal = secondProposal.proposal; // Atualizar ref para cache abaixo
                                    logConfig.info('trade_manager', `✅ [REATIVO] Proposta Corretiva aceita. ID: ${proposalId}`);
                                }
                            }
                        }
                    }
                }
            }
        } catch (error) {
            console.error('❌ [REAL] Falha ao obter proposta:', error);
            return false;
        }

        // Isso corrige o problema de "repetir preço do simulado"
        const effectiveEntryPrice = entryPrice || this.forcedEntryPrice || this.getCurrentPrice();

        // Salvar para uso no monitoramento
        this.contractStartPrice = effectiveEntryPrice;

        // 💼 Executar compra com a proposta (pode ser do cache ou nova)

        const buyParams = {
            buy: proposalId,
            price: finalStake
        };

        // 🛡️ OPÇÃO: Suprimir overlay global se solicitado
        if (!suppressGlobalSideEffects) {
            try {
                const cooldownInstance = getCooldownOverlayInstance();
                if (cooldownInstance && this.config.cooldownPeriod > 0) {
                    if (typeof cooldownInstance.showProcessingOverlay === 'function') {
                        cooldownInstance.showProcessingOverlay('Processando contrato...');
                    } else {
                        // Fallback: ativar cooldown imediatamente
                        if (typeof cooldownInstance.activateCooldown === 'function') {
                            cooldownInstance.activateCooldown();
                        }
                    }
                } else {
                }
            } catch (error) {
            }
        }

        const buyStartTime = Date.now();
        // 🎯 MODERNO: Executar compra via DerivServiceInstance
        const buyResponse = await derivService.send(buyParams);
        const buyEndTime = Date.now();
        const buyDuration = buyEndTime - buyStartTime;

        if (buyResponse.error) {
            console.error(`❌ [REAL] Erro na compra: ${buyResponse.error.message}`);
            throw new Error(buyResponse.error.message);
        }

        const contractId = buyResponse.buy.contract_id;

        // 🎯 LOCAL JUDGE: Armazenar metadados do contrato para validação local em Delay=0
        this.activeContracts.set(contractId, {
            contractType: capturedContractType, // Usar valor capturado
            prediction: capturedPrediction,
            payout: this.currentProposal?.payout || buyResponse.buy.payout,
            entryPrice: effectiveEntryPrice,
            contractStake: finalStake,
            startTime: buyStartTime,
            duration: this.config.duration || 1, // 🎯 Fallback: 1 tick
            durationUnit: this.config.durationUnit || 't', // 🎯 Fallback: ticks
            symbol: this.config.activeSymbol || this.config.symbol,
            isDelayZero: (this.config.cooldownPeriod || 0) <= 0
        });

        // 🛡️ OPÇÃO: Suprimir monitoramento global se solicitado
        if (!suppressGlobalSideEffects) {
            this.monitorContractResult(derivService, contractId, capturedMode);
        } else {

        }

        // 🎯 CRÍTICO: Invalidar cache de proposta após compra bem sucedida
        this.currentProposal = null;

        // 🎯 CRÍTICO: Limpar flag de execução para permitir próximo trade
        this.isExecutingTrade = false;

        return {
            success: true,
            contractId: contractId,
            stake: finalStake,
            payout: buyResponse.buy.payout
        };
    }

    // 🔍 Verificar status atual do contrato
    async checkContract(api, contractId) {
        try {
            const contractResponse = await api.sendRequest({
                proposal_open_contract: 1,
                contract_id: contractId
            });

            if (contractResponse.error) {
                CommonHelpers.showError(`❌ Erro ao verificar contrato: ${contractResponse.error.message}`);
                return null;
            }

            return contractResponse.proposal_open_contract;
        } catch (error) {
            CommonHelpers.showError(`❌ Erro na verificação do contrato ${contractId}:`, error);
            return null;
        }
    }

    // Monitorar resultado do contrato real
    async monitorContractResult(api, contractId, capturedMode = null) {

        if (this.monitoringContracts.has(contractId)) {
            return;
        }

        // 🔧 CORRIGIDO: Adicionar este contrato ao Set de monitoramentos ativos
        this.monitoringContracts.add(contractId);

        // 🎯 CRÍTICO: Usar modo capturado ou fallback para currentMode
        const tradeMode = capturedMode || this.currentMode;
        const wasSimulated = tradeMode === 'SIMULACAO';


        const contractData = this.activeContracts.get(contractId);
        const isDelayZero = contractData?.isDelayZero ?? ((this.config.cooldownPeriod || 0) <= 0);

        if (isDelayZero && contractData) {
            // 🎯 CRÍTICO: Verificar se este contrato já está sendo processado
            if (this.processingContracts?.has(contractId)) {
                console.warn(`⚠️ [LOCAL JUDGE] Contrato ${contractId} já está sendo processado. Ignorando duplicata.`);
                return;
            }

            // Marcar contrato como em processamento
            if (!this.processingContracts) {
                this.processingContracts = new Set();
            }
            this.processingContracts.add(contractId);

            // 🔒 CRÍTICO: Bloquear novos trades DURANTE processamento local
            this.awaitingExpiration = true;

            try {
                const marketData = getMarketDataInstance(SessionManager.getLocalToken());

                if (!marketData) {
                    throw new Error('MarketData não disponível');
                }

                // 1. Aguardar Duração (usando metadados do contrato, não this.config)
                const duration = contractData.duration || 1;
                const durationUnit = contractData.durationUnit || 't';

                let exitTick;
                if (durationUnit === 't') {

                    // Usamos waitForNextTick para cada tick da duração (sem descartar o primeiro)
                    for (let i = 0; i < duration; i++) {
                        exitTick = await this.waitForNextTick(marketData);
                        if (!exitTick) break;
                    }
                } else {
                    // Segundos/minutos - esperar tempo e depois capturar próximo tick
                    let seconds = duration;
                    if (durationUnit === 'm') seconds = duration * 60;
                    if (durationUnit === 'h') seconds = duration * 3600;
                    await new Promise(resolve => setTimeout(resolve, seconds * 1000));
                    exitTick = await this.waitForNextTick(marketData);
                }

                if (!exitTick || !exitTick.price) {
                    throw new Error('Tick de saída não obtido');
                }

                // 2. Calcular WIN/LOSS localmente (mesma lógica do trade simulado)
                const entryPrice = contractData.entryPrice || this.contractStartPrice;
                const exitPrice = exitTick.price;

                const savedPrediction = this.config.prediction;
                const savedContractType = this.config.contractType;

                // Aplicar dados do contrato
                if (contractData.prediction !== undefined && contractData.prediction !== null) {
                    this.config.prediction = { value: contractData.prediction };
                }
                if (contractData.contractType) {
                    this.config.contractType = contractData.contractType;
                }

                const isWinLocal = this.determineTradeResult(entryPrice, exitPrice);

                // Restaurar config original
                this.config.prediction = savedPrediction;
                this.config.contractType = savedContractType;

                // 🎯 FIX: Usar contractStake ou buyPrice (ambos podem ter o stake real)
                const stake = contractData.contractStake || contractData.buyPrice || this.config.stake;
                const payout = parseFloat(contractData.payout) || 0;
                const profit = isWinLocal ? (payout - stake) : -stake;

                // 4. Aplicar Gale SE LOSS (antes de qualquer resposta da Deriv)
                if (!isWinLocal && this.config.galeActive) {

                    if (this.riskController && typeof this.riskController.handleRealResult === 'function') {
                        this.riskController.handleRealResult('LOSS', contractId, stake);

                    } else {
                        // Fallback: Acumular perda manualmente se RiskController não disponível
                        this.accumulatedLosses += stake;
                        if (this.riskController) {
                            this.riskController.accumulatedLosses = this.accumulatedLosses;
                        }
                    }

                    // Sincronizar accumulatedLosses do RiskController
                    if (this.riskController) {
                        this.accumulatedLosses = this.riskController.accumulatedLosses;
                    }

                    // Caso contrário, usar payout do contrato finalizado como fallback
                    const payoutForCalculation = this.currentProposalPayout || (payout / stake) || 1.95;
                    // 🎯 CRÍTICO: Setar payout no RiskController antes de calcular
                    if (this.riskController) {
                        this.riskController.setProposalPayout(payoutForCalculation);

                    }

                    this.nextTradeStake = this.calculateGaleStake();

                    // 🎯 CRÍTICO: Preservar lastCalculatedStake para o próximo trade
                    this.lastCalculatedStake = this.nextTradeStake;
                    if (this.riskController) {
                        this.riskController.lastCalculatedStake = this.nextTradeStake;
                    }


                } else if (isWinLocal) {
                    // WIN: Processar no RiskController primeiro
                    if (this.riskController && typeof this.riskController.handleRealResult === 'function') {
                        this.riskController.handleRealResult('WIN', contractId, stake);
                    }

                    // - Soros: accumulatedLosses === 0 E stake > base (acumulando lucro)
                    const isGaleRecovery = this.accumulatedLosses > 0;
                    const isSorosActive = (this.config.sorosLimit || 0) > 0;

                    if (isSorosActive) {
                        if (isGaleRecovery) {

                            this.sorosWins = 0;
                            this.nextSorosStake = null;
                        } else {

                            if (this.sorosWins < (this.config.sorosLimit || 0)) {
                                this.sorosWins++;

                                // 🎯 LÓGICA DE PORCENTAGEM DE SOROS
                                const sorosPercentage = this.config.sorosPercentage !== undefined ? this.config.sorosPercentage : 100;
                                const profitToReinvest = (profit * sorosPercentage) / 100;
                                const nextStake = stake + profitToReinvest;

                                this.nextSorosStake = parseFloat(nextStake.toFixed(2));

                            } else {

                                this.sorosWins = 0;
                                this.nextSorosStake = null;
                            }
                        }
                    } else {
                        // Se Soros desativado, garantir limpeza
                        this.sorosWins = 0;
                        this.nextSorosStake = null;
                    }

                    // WIN: Verificar Split Gale antes de resetar
                    const baseStake = this.config.stake || 0.35;

                    let isGaleTrade = stake > (baseStake * 1.05);
                    if (this.riskController && this.riskController.pendingSplitWins > 0) {
                        isGaleTrade = true;
                    }

                    // 🎯 LÓGICA SPLIT GALE: Verificar se há vitórias pendentes
                    if (this.riskController && this.riskController.pendingSplitWins > 0) {
                        // Só decrementar se foi um trade de RECUPERAÇÃO (Gale)
                        if (isGaleTrade) {
                            this.riskController.pendingSplitWins--;

                            const winsCompleted = (this.config.galeSplit || 1) - this.riskController.pendingSplitWins;
                            const totalNeeded = this.config.galeSplit || 1;


                            if (this.riskController.pendingSplitWins <= 0) {
                                // Sequência completa → Resetar

                                this.accumulatedLosses = 0;
                                this.nextTradeStake = null;
                                this.lastCalculatedStake = null;
                                // RiskController já resetou via handleRealResult
                            } else {

                                // Sincronizar estado
                                this.accumulatedLosses = this.riskController.accumulatedLosses;
                            }
                        }
                    } else {
                        // Comportamento padrão (Sem split ou split finalizado)

                        this.accumulatedLosses = 0;
                        this.nextTradeStake = null;
                        this.lastCalculatedStake = null;
                        // RiskController já resetou via handleRealResult
                    }
                }

                // 5. Atualizar P&L e UI
                this.sessionProfitLoss += profit;
                this.addTradeResultMessage(
                    contractData.contractType,
                    entryPrice,
                    exitPrice,
                    tradeMode,
                    isWinLocal,
                    stake,
                    profit,
                    contractId,
                    contractData.prediction
                );

                // 🎯 MODERNO: Disparar evento direto para o front-end (React/BotDashboard)
                window.dispatchEvent(new CustomEvent('tradeResultFront', {
                    detail: {
                        id: `${contractId}-${Date.now()}`,
                        contractType: contractData.contractType,
                        type: contractData.contractType,
                        entryPrice: String(entryPrice || ''),
                        exitPrice: String(exitPrice || ''),
                        target: contractData.prediction !== null && contractData.prediction !== undefined
                            ? String(contractData.prediction) : '',
                        exit: String(exitPrice || ''),
                        mode: tradeMode,
                        isSimulation: tradeMode === 'SIMULACAO' ? 'SIMULACAO' : 'REAL',
                        status: isWinLocal ? 'WIN' : 'LOSS',
                        stake: stake,
                        profit: profit,
                        symbol: contractData.symbol || this.config.symbol || window.selectedSymbol || '',
                        timestamp: new Date()
                    }
                }));

                // 🎯 CRÍTICO: Salvar dados do contrato para o Soros poder acessar
                this.lastCompletedContract = {
                    contract_id: contractId,
                    buy_price: stake,
                    payout: stake + profit,
                    profit: profit
                };

                this.handleTradeResult({
                    mode: tradeMode,
                    result: isWinLocal ? 'WIN' : 'LOSS',
                    simulated: false,
                    skipGaleProcessing: true
                });

                this.awaitingExpiration = false;
                this.monitoringContracts.delete(contractId);
                this.activeContracts.delete(contractId);

                // 🎯 CRÍTICO: Remover contrato do Set de processamento
                if (this.processingContracts) {
                    this.processingContracts.delete(contractId);
                }

                // 🎯 CRÍTICO: Limpar flag de execução para permitir próximo trade com cooldown=0
                this.isExecutingTrade = false;

                // 🛡️ FIX: Disparar apenas se for LOSS no Delay=0
                if (isDelayZero && !isWinLocal && typeof MonitoringView !== 'undefined' && MonitoringView.forceImmediateRuleCheck) {

                    MonitoringView.isExecutingTrade = false;
                    await MonitoringView.forceImmediateRuleCheck(exitPrice);
                }

                return; // 🚪 SAIR - validação local concluída

            } catch (localError) {
                console.warn(`[LOCAL JUDGE] ⚠️ Fallback para API: ${localError.message}`);
                // Se falhar, continua para o loop de API normal abaixo
            }
        }

        try {
            // Aguardar alguns segundos antes de verificar o resultado
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Loop para verificar o status do contrato
            const maxAttempts = 60; // Aumentado para 10 minutos (10s * 60)
            let attempts = 0;

            while (attempts < maxAttempts) {
                attempts++;

                try {
                    // 🎯 MODERNO: DerivService usa .send() em vez de .sendRequest()
                    const contractResponse = await api.send({
                        proposal_open_contract: 1,
                        contract_id: contractId
                    });

                    if (contractResponse.error) {
                        CommonHelpers.showError(`❌ Erro ao verificar contrato: ${contractResponse.error.message}`);
                        break;
                    }

                    const contract = contractResponse.proposal_open_contract;
                    if (!contract) break;

                    // Verificar se o contrato foi finalizado
                    if (contract.is_expired || contract.status === 'sold') {
                        this.lastCompletedContract = contract;
                        const derivWin = contract.profit > 0;
                        const savedContract = this.activeContracts.get(contractId);

                        // Determinar tipo e previsão
                        const correctContractType = savedContract?.contractType || this.config.contractType;
                        const correctPrediction = savedContract?.prediction !== null && savedContract?.prediction !== undefined
                            ? savedContract.prediction
                            : (this.config.prediction ? this.config.prediction.value : null);

                        const digitContracts = ['DIGITOVER', 'DIGITUNDER', 'DIGITEVEN', 'DIGITODD', 'DIGITDIFF', 'DIGITMATCH'];
                        const isDigitContract = digitContracts.includes(correctContractType);

                        const entryPrice = (isDigitContract && (savedContract?.contractStartPrice || this.contractStartPrice))
                            ? (savedContract?.contractStartPrice || this.contractStartPrice)
                            : this.extractEntryPriceFromContract(contract);
                        const exitPrice = this.extractExitPriceFromContract(contract);

                        // Determinar WIN/LOSS real
                        let isWin = derivWin;

                        // UI Feedback e Logs
                        const actualStakeUsed = this.getActualStakeUsed(contract);
                        const realProfit = Number(contract.profit || 0);

                        this.addTradeResultMessage(
                            correctContractType,
                            entryPrice,
                            exitPrice,
                            tradeMode,
                            isWin,
                            actualStakeUsed,
                            realProfit,
                            contractId,
                            savedContract?.prediction
                        );

                        // 🎯 MODERNO: Disparar evento direto para o front-end (React/BotDashboard)
                        window.dispatchEvent(new CustomEvent('tradeResultFront', {
                            detail: {
                                id: `${contractId}-${Date.now()}`,
                                contractType: correctContractType,
                                type: correctContractType,
                                entryPrice: String(entryPrice || ''),
                                exitPrice: String(exitPrice || ''),
                                target: savedContract?.prediction !== null && savedContract?.prediction !== undefined
                                    ? String(savedContract.prediction) : '',
                                exit: String(exitPrice || ''),
                                mode: tradeMode,
                                isSimulation: tradeMode === 'SIMULACAO' ? 'SIMULACAO' : 'REAL',
                                status: isWin ? 'WIN' : 'LOSS',
                                stake: actualStakeUsed,
                                profit: realProfit,
                                symbol: savedContract?.symbol || this.config.symbol || window.selectedSymbol || '',
                                timestamp: new Date()
                            }
                        }));

                        if (this.onTradeEnd) {
                            this.onTradeEnd(this.currentMode, isWin, {
                                startPrice: entryPrice,
                                endPrice: exitPrice,
                                profit: realProfit,
                                contractId: contractId,
                                isDelayZero: isDelayZero
                            });
                        }

                        // Processar resultado
                        if (savedContract?.bothGroupId) {
                            const groupData = this.bothTradeGroups.get(savedContract.bothGroupId);
                            if (groupData) {
                                groupData.results.set(contractId, isWin);
                                if (!groupData.profits) groupData.profits = new Map();
                                groupData.profits.set(contractId, realProfit);
                                if (groupData.results.size === groupData.expectedCount && !groupData.processed) {
                                    this.processBothTradeGroupResult(savedContract.bothGroupId, groupData);
                                }
                            }
                        } else {
                            this.updateSessionProfitLoss(realProfit);
                            this.handleTradeResult({
                                mode: tradeMode,
                                result: isWin ? 'WIN' : 'LOSS',
                                simulated: false
                            });
                        }

                        this.updateAccountBalance();

                        // 🎰 GALE CALC (DENTRO DO IF FINISHED)
                        if (!isWin && tradeMode !== 'SIMULACAO') {
                            this.checkBalanceAfterLoss();
                            if (this.riskController) {
                                if (contract.buy_price || actualStakeUsed) {
                                    const buyPrice = parseFloat(contract.buy_price || actualStakeUsed);
                                    if (buyPrice > 0 && this.lastContractPayout > 0) {
                                        this.riskController.setProposalPayout(this.lastContractPayout / buyPrice);
                                    }
                                }
                                this.nextTradeStake = this.riskController.calculateGaleStake();
                            }
                        }

                        const cooldownPeriod = this.config?.cooldownPeriod ?? 3;

                        if (cooldownPeriod <= 0) {
                            this.awaitingExpiration = false;
                            this.isExecutingTrade = false; // 🎯 CRÍTICO: Resetar antes da verificação imediata

                            // ⚡ Habilitado para WIN e LOSS no Delay 0
                            if (typeof MonitoringView !== 'undefined' && MonitoringView.forceImmediateRuleCheck) {
                                MonitoringView.isExecutingTrade = false;
                                const outcome = { result: isWin ? 'WIN' : 'LOSS', mode: tradeMode, simulated: false };
                                logConfig.info('trade_manager', `⚡ [DELAY 0 REAL] Disparando verificação imediata após trade REAL (${outcome.result})`);
                                await MonitoringView.forceImmediateRuleCheck(exitPrice, outcome);

                                // Se um novo trade já foi disparado pelo forceCheck, não prosseguir com resets padrão
                                if (this.awaitingExpiration || this.isExecutingTrade) {
                                    return;
                                }
                            }
                        }

                        // Cooldown Overlay (se Delay > 0)
                        if (cooldownPeriod > 0) {
                            try {
                                const cooldownInstance = getCooldownOverlayInstance();
                                if (cooldownInstance?.activateCooldown) cooldownInstance.activateCooldown();
                            } catch (e) { }
                        }

                        // Cleanup e Reset Final
                        this.currentProposalPayout = null;
                        if (isWin) {

                            if (this.riskController) {
                                if (!this.riskController.isSplitActive || !this.riskController.isSplitActive()) {
                                    this.nextTradeStake = null;
                                }
                            } else {
                                this.accumulatedLosses = 0;
                                this.realLossesStreak = 0;
                                this.nextTradeStake = null;
                            }

                        }

                        this.currentContract = null;
                        this.monitoringContracts.delete(contractId);
                        this.activeContracts.delete(contractId);
                        if (this.processingContracts) this.processingContracts.delete(contractId);

                        if (!this.awaitingExpiration) {
                            this.isExecutingTrade = false;
                        }

                        setTimeout(() => {
                            this.checkTradeLimitAfterExecution();
                        }, 2000);

                        break; // FINALIZA O MONITORAMENTO COM SUCESSO
                    }

                    // Se não finalizado, aguardar
                    await new Promise(resolve => setTimeout(resolve, 10000));

                } catch (error) {
                    CommonHelpers.showError(`❌ Erro no loop de monitoramento:`, error);
                    await new Promise(resolve => setTimeout(resolve, 5000));
                }
            }

            // Timeout Failsafe
            if (attempts >= maxAttempts) {
                CommonHelpers.showWarning(`⏰ Timeout no monitoramento do contrato ${contractId}`);
                this.awaitingExpiration = false;
                this.isExecutingTrade = false;
                this.monitoringContracts.delete(contractId);
                if (this.processingContracts) this.processingContracts.delete(contractId);
            }

        } catch (error) {
            CommonHelpers.showError('❌ Erro fatal no monitoramento:', error);
            this.awaitingExpiration = false;
            this.isExecutingTrade = false;
            this.monitoringContracts.delete(contractId);
        }
    }

    // 🔄 REFATORADO: Delegar para TradeModeRiskController
    calculateGaleStake(targetContractType = null, targetBarrier = null) {

        if (this.riskController) {

            if (this.config.galeRemovesSoros) console.log("🔍 [DEBUG GALE] Delegando cálculo para RiskController...");
            // Sincronizar estado antes de calcular
            this.riskController.config = this.config;

            return this.riskController.calculateGaleStake(targetContractType, targetBarrier);
        }

        try {
            const baseStake = this.config.stake || 0.35;
            if (!this.config.galeActive) {

                return parseFloat(baseStake.toFixed(2));
            }
            if (this.realLossesStreak <= 0) {

                return parseFloat(baseStake.toFixed(2));
            }
            if (!this.currentProposalPayout || this.currentProposalPayout <= 0 || isNaN(this.currentProposalPayout)) {

                throw new Error('Payout real obrigatório para cálculo de Gale');
            }

            const currentPayout = parseFloat(this.currentProposalPayout);
            const totalLosses = this.accumulatedLosses;

            let stakeGaleCalculated;

            // 🎯 LÓGICA GALE REMOVES SOROS (FALLBACK LEGADO)
            let lossesToCalc = totalLosses;

            // Só aplicar se for a PRIMEIRA perda da sequência (evita quebrar Martingale)
            if (this.config.galeRemovesSoros && this.realLossesStreak === 1) {
                const baseStake = this.config.stake || 0.35;
                if (totalLosses > (baseStake * 1.05)) { // Margem de 5%
                    lossesToCalc = baseStake;
                    logConfig.info('trade_manager', `🛡️ [FALLBACK SOROS] Perda de Soros detectada (${totalLosses}). Ajustando para base (${baseStake}).`);
                    console.log(`🛡️ [FALLBACK SOROS] Ajuste: ${totalLosses} -> ${lossesToCalc}`);
                }
            }

            if (currentPayout < 1.0) {
                stakeGaleCalculated = (lossesToCalc / currentPayout) * this.config.galeAdjustment;
            } else {
                const profitMultiplier = currentPayout - 1;
                stakeGaleCalculated = (lossesToCalc / profitMultiplier) * this.config.galeAdjustment;
            }

            return parseFloat(Math.max(stakeGaleCalculated, 0.35).toFixed(2));
        } catch (error) {
            CommonHelpers.showError('❌ [GALE CALC] Erro no cálculo de Gale:', error);
            throw error;
        }
    }

    // 🔄 REFATORADO: Delegar para TradeModeRiskController
    getActualStakeUsed(contract = null) {

        if (this.riskController) {

            // Sincronizar estado
            this.riskController.config = this.config; // Config é syncada via updateConfig


            // Sync apenas de contexto volátil necessário
            if (this.currentProposalPayout) {
                this.riskController.currentProposalPayout = this.currentProposalPayout;
            }
            this.riskController.currentMode = this.currentMode;

            return this.riskController.getActualStakeUsed(contract);
        }

        try {
            // 🎯 CRÍTICO: Sempre priorizar buy_price do contrato (especialmente em modo BOTH)
            if (contract && contract.buy_price !== undefined && contract.buy_price !== null) {
                const buyPrice = parseFloat(contract.buy_price);
                if (!isNaN(buyPrice) && buyPrice > 0) {
                    return buyPrice;
                }
            }

            // 🎰 CORREÇÃO: Usar apenas accumulatedLosses (realLossesStreak reseta nas transições)
            if (this.accumulatedLosses === 0) {
                return this.config.stake;
            }
            if (this.config.galeActive && this.accumulatedLosses > 0) {
                if (!this.currentProposalPayout || this.currentProposalPayout <= 0) {
                    return this.config.stake;
                }
                const galeStake = this.calculateGaleStake();
                return galeStake;
            }
            return this.config.stake;
        } catch (error) {
            if (this.currentMode === 'SIMULACAO') {
                // Manter valor atual da stake sem alterar
                const currentValue = this.lastCalculatedStake || this.config.stake;
                return currentValue;
            } else {
                // Se não for simulação, mas erro de payout, usar stake base como fallback

                return this.config.stake;
            }
        }
    }

    async updateAccountBalance(retryCount = 3) {
        try {

            // Evita criar nova conexão e re-autorizar (causa de timeouts)
            const token = SessionManager.getLocalToken();
            if (!token) return false;

            const marketData = getMarketDataInstance(token);
            let balanceResponse = null;

            if (marketData && marketData.isReady()) {

                balanceResponse = await marketData.sendRequest({ "balance": 1 });
            } else {

                return false;
            }

            if (balanceResponse && balanceResponse.balance) {
                // Atualizar dados do usuário
                const userData = SessionManager.getCurrentUser();
                if (userData) {
                    const oldBalance = userData.balance?.balance || 0;
                    const newBalance = parseFloat(balanceResponse.balance.balance);

                    userData.balance = balanceResponse.balance;
                    SessionManager.saveUserData(userData);

                    if (typeof FooterUtils !== 'undefined' && typeof FooterUtils.updateBalanceElements === 'function') {
                        FooterUtils.updateBalanceElements(balanceResponse.balance.currency, balanceResponse.balance.balance);
                    } else {
                        // Fallback legado caso FooterUtils não esteja disponível
                        const balanceSelectors = [
                            '.balance strong',
                            '.bottom-balance strong',
                            '.vip-balance strong'
                        ];

                        balanceSelectors.forEach(selector => {
                            const balanceElement = document.querySelector(selector);
                            if (balanceElement) {

                                const balanceValue = balanceResponse.balance.balance;
                                const currency = balanceResponse.balance.currency;
                                const numericBalance = parseFloat(balanceValue);
                                const formattedBalance = isNaN(numericBalance) ? '0.00' : numericBalance.toFixed(2);

                                balanceElement.textContent = `${currency} ${formattedBalance}`;
                            }
                        });
                    }

                    window.dispatchEvent(new CustomEvent('balanceUpdated', {
                        detail: {
                            balance: balanceResponse.balance,
                            currency: balanceResponse.balance.currency,
                            amount: balanceResponse.balance.balance,
                            oldBalance: oldBalance,
                            newBalance: newBalance
                        }
                    }));

                    return true;
                }
            }

            return false;
        } catch (error) {
            // 🎯 RETRY LOGIC: Tentar novamente se for erro de Timeout
            if (retryCount > 0 && error.message && error.message.includes('Timeout')) {


                // Aguardar 1s antes de tentar novamente
                await new Promise(resolve => setTimeout(resolve, 1000));
                return this.updateAccountBalance(retryCount - 1);
            }

            // ✅ SILENCIAR ERROS durante troca de conta (são esperados)
            if (window.accountSwitchInProgress && error.message && error.message.includes('Timeout')) {
                console.warn('⚠️ [BALANCE] Timeout ignorado durante troca de conta (esperado).');
                return false;
            }

            console.error('❌ [BALANCE] Erro ao atualizar saldo:', error);

            // Isso corrige o problema de "dados paralisados" após erro de rede
            if (error.message && error.message.includes('Timeout')) {
                // Não reconectar se estiver trocando de conta
                if (window.accountSwitchInProgress) return false;

                console.warn('⚠️ [BALANCE] Timeout persistente! Forçando reconexão do stream de dados...');
                try {
                    const token = SessionManager.getLocalToken();
                    const marketData = getMarketDataInstance(token);
                    if (marketData && typeof marketData.connect === 'function') {
                        marketData.connect(); // Força reconexão do WS
                    }
                } catch (recError) {
                    console.error('❌ Falha na tentativa de recuperação:', recError);
                }
            }
            return false;
        }
    }

    extractLastDigit(price) {
        try {
            const currentSymbol = this.config.symbol || window.selectedSymbol || '';

            // 🎯 MODERNO: Usar DerivServiceInstance (evita instanciar DerivMarketData legado)
            const derivSvc = window.DerivServiceInstance;
            if (derivSvc && typeof derivSvc.extractLastDigit === 'function') {
                const lastDigit = derivSvc.extractLastDigit(price, currentSymbol);
                if (lastDigit !== null && lastDigit !== undefined) {
                    return lastDigit;
                }
            }

            // ⚠️ FALLBACK: Se DerivService não disponível, usar CommonHelpers
            const result = CommonHelpers.extractLastDigitUnified(price, currentSymbol);

            if (result !== null && result !== undefined) {
                return result;
            }

            let processedPrice;
            if (typeof price === 'number') {
                processedPrice = price * 1000;
            } else {
                const numPrice = parseFloat(price);
                processedPrice = isNaN(numPrice) ? 0 : numPrice * 1000;
            }

            const priceStr = processedPrice.toString();
            const allDigits = priceStr.replace(/[^0-9]/g, '');

            if (allDigits.length === 0) {
                CommonHelpers.showError(`❌ Nenhum dígito encontrado em: ${price}`);
                return 0;
            }

            const lastDigit = parseInt(allDigits.charAt(allDigits.length - 1));
            return isNaN(lastDigit) ? 0 : lastDigit;

        } catch (error) {
            console.error('❌ [EXTRACT DIGIT] Erro ao extrair último dígito:', error);
            return 0;
        }
    }

    extractEntryPriceFromContract(contract, contractTypeOverride = null) {
        // 🎯 CORREÇÃO: Permitir override do tipo de contrato para modo "Ambos"
        const contractType = contractTypeOverride || this.config.contractType;
        const digitContracts = ['DIGITOVER', 'DIGITUNDER', 'DIGITEVEN', 'DIGITODD', 'DIGITDIFF', 'DIGITMATCH'];
        const isDigitContract = digitContracts.includes(contractType);

        // Isso garante consistência entre Tipo Trade: Ambos e não-Ambos
        if (isDigitContract && this.contractStartPrice) {
            const price = parseFloat(this.contractStartPrice);
            const modeLabel = this.tradeReal ? 'REAL' : 'SIMULADO';
            return price;
        }

        // 🔧 Para contratos NÃO-dígitos REAIS - usar preços oficiais da Deriv
        if (!isDigitContract && this.tradeReal) {

            // PRIORIDADE 1: entry_spot (preço real de execução registrado pela Deriv)
            if (contract.entry_spot !== undefined && contract.entry_spot !== null) {
                const price = parseFloat(contract.entry_spot);
                return price;
            }

            // PRIORIDADE 2: entry_tick (alternativa ao entry_spot)
            if (contract.entry_tick !== undefined && contract.entry_tick !== null) {
                const price = parseFloat(contract.entry_tick);
                return price;
            }

            // PRIORIDADE 3: Tentar extrair de audit_details (contract_start_time)
            if (contract.audit_details && contract.audit_details.all_ticks) {

                // Para contratos imediatos, geralmente é o primeiro tick
                const firstTick = contract.audit_details.all_ticks[0];
                if (firstTick && (firstTick.tick || firstTick.tick_display_value)) {
                    const price = parseFloat(firstTick.tick || firstTick.tick_display_value);

                    return price;
                }
            }

            // FALLBACK para trades REAIS não-dígitos: contractStartPrice
            if (this.contractStartPrice) {
                const price = parseFloat(this.contractStartPrice);
                CommonHelpers.showWarning(`⚠️ [NON-DIGIT REAL] FALLBACK: Usando contractStartPrice para entrada: ${price}`);
                return price;
            }
        }

        // 🎮 Para contratos NÃO-dígitos SIMULADOS - usar preço das regras (consistência)
        if (!isDigitContract && !this.tradeReal && this.contractStartPrice) {
            const price = parseFloat(this.contractStartPrice);
            return price;
        }

        // FALLBACK FINAL: contractStartPrice (capturado no momento das regras)
        if (this.contractStartPrice) {
            const price = parseFloat(this.contractStartPrice);
            CommonHelpers.showWarning(`⚠️ [ENTRY PRICE] Usando contractStartPrice como fallback final: ${price}`);
            return price;
        }

        CommonHelpers.showError(`❌ [ENTRY PRICE] ERRO CRÍTICO: Nenhum preço de entrada disponível!`);
        CommonHelpers.showError(`❌ [ENTRY PRICE] Contract data:`, contract);
        return 0;
    }

    extractExitPriceFromContract(contract) {

        const isOneTickContract = this.config?.duration === 1 && this.config?.durationUnit === 't';
        const isWinTrade = contract.profit > 0;

        // 🔧 FUNÇÃO AUXILIAR: Validar e converter preço para evitar NaN
        const validateAndParsePrice = (price, fieldName) => {
            if (price === undefined || price === null) {
                CommonHelpers.showWarning(`⚠️ [EXIT PRICE] ${fieldName} é undefined/null`);
                return null;
            }

            const parsed = parseFloat(price);
            if (isNaN(parsed)) {
                CommonHelpers.showError(`❌ [EXIT PRICE] ${fieldName} resultou em NaN: ${price}`);
                return null;
            }

            if (parsed <= 0) {
                CommonHelpers.showError(`❌ [EXIT PRICE] ${fieldName} é inválido (≤ 0): ${parsed}`);
                return null;
            }

            return parsed;
        };

        if (isOneTickContract) {

            // PRIORIDADE 1: exit_tick (próximo tick oficial da Deriv para contratos de 1 tick)
            const exitTickPrice = validateAndParsePrice(contract.exit_tick, 'exit_tick');
            if (exitTickPrice !== null) {
                return exitTickPrice;
            }

            // PRIORIDADE 2: exit_spot (preço oficial de saída se exit_tick não disponível)
            const exitSpotPrice = validateAndParsePrice(contract.exit_spot, 'exit_spot');
            if (exitSpotPrice !== null) {
                return exitSpotPrice;
            }

            // current_spot continua mudando após expiração e não reflete o preço usado pela Deriv
            CommonHelpers.showError(`❌ [1-TICK] ERRO: exit_tick e exit_spot não disponíveis no contrato!`);
            CommonHelpers.showError(`❌ [1-TICK] exit_tick: ${contract.exit_tick}, exit_spot: ${contract.exit_spot}`);
            CommonHelpers.showError(`❌ [1-TICK] Status: ${contract.status}, Expired: ${contract.is_expired}, Profit: ${contract.profit}`);
            CommonHelpers.showError(`❌ [1-TICK] NÃO USAR current_spot (${contract.current_spot}) pois não reflete o preço de liquidação!`);
        }

        else {

            // PRIORIDADE 1: exit_spot (preço oficial de saída)
            const exitSpotPrice = validateAndParsePrice(contract.exit_spot, 'exit_spot');
            if (exitSpotPrice !== null) {
                return exitSpotPrice;
            }

            // PRIORIDADE 2: exit_tick
            const exitTickPrice = validateAndParsePrice(contract.exit_tick, 'exit_tick');
            if (exitTickPrice !== null) {
                return exitTickPrice;
            }

            // current_spot continua mudando após expiração e não reflete o preço usado pela Deriv
            CommonHelpers.showError(`❌ [EXIT PRICE] ERRO: exit_spot e exit_tick não disponíveis no contrato!`);
            CommonHelpers.showError(`❌ [EXIT PRICE] exit_spot: ${contract.exit_spot}, exit_tick: ${contract.exit_tick}`);
            CommonHelpers.showError(`❌ [EXIT PRICE] Status: ${contract.status}, Expired: ${contract.is_expired}, Profit: ${contract.profit}`);
            CommonHelpers.showError(`❌ [EXIT PRICE] NÃO USAR current_spot (${contract.current_spot}) pois não reflete o preço de liquidação!`);
        }

        CommonHelpers.showError(`❌ [EXIT PRICE] ERRO CRÍTICO: Nenhum preço de saída válido disponível!`);
        CommonHelpers.showError(`❌ [EXIT PRICE] Status do contrato: ${contract.status}`);
        CommonHelpers.showError(`❌ [EXIT PRICE] Is expired: ${contract.is_expired}`);
        CommonHelpers.showError(`❌ [EXIT PRICE] Tick count: ${contract.tick_count}`);
        CommonHelpers.showError(`❌ [EXIT PRICE] Contract data completo:`, contract);

        // 🔧 NOVO: Retornar valor do preço de entrada como fallback extremo para evitar NaN
        const entryPrice = this.extractEntryPriceFromContract(contract);
        if (entryPrice > 0) {
            CommonHelpers.showWarning(`⚠️ [EXIT PRICE] FALLBACK EXTREMO: Usando preço de entrada como saída: ${entryPrice}`);
            return entryPrice;
        }

        // 🔧 ÚLTIMO RECURSO: Retornar 0 em vez de undefined para evitar NaN
        CommonHelpers.showError(`❌ [EXIT PRICE] RETORNANDO 0 para evitar NaN`);
        return 0;
    }

    validateConfiguration() {
        // Verificar se stake é válido (mínimo $0.35)
        if (!this.config.stake || this.config.stake < 0.35) {
            CommonHelpers.showError(`❌ Valor de entrada inválido: ${this.config.stake} - mínimo $0.35`);
            this.showMinimumStakePopup(this.config.stake);
            return false;
        }

        // Verificar se contractType é válido
        if (!this.config.contractType) {
            CommonHelpers.showError('❌ Tipo de contrato não definido');
            return false;
        }

        // Verificar se symbol é válido
        if (!this.config.symbol) {
            CommonHelpers.showError('❌ Símbolo não definido');
            return false;
        }

        const validationResult = this.validateContractCompatibility();
        if (!validationResult.isValid) {
            this.showCompatibilityError(validationResult.error, validationResult.field);
            return false;
        }

        return true;
    }

    validateContractCompatibility() {
        const bothMode = this.isBothModeActive();

        if (bothMode) {
            // Para modo "Ambos", validar todos os contratos do grupo
            const bothContracts = this.getBothContracts();
            if (!bothContracts || bothContracts.contracts.length === 0) {
                return {
                    isValid: false,
                    error: 'Não foi possível determinar os contratos para o modo "Ambos"',
                    field: 'trade-type-select'
                };
            }

            // Verificar se há especificação nas regras
            const contractsToExecute = this.determineContractsForBothMode(bothContracts);

            // Validar cada contrato que será executado
            for (const contractType of contractsToExecute) {
                const validation = this.validateSingleContract(contractType);
                if (!validation.isValid) {
                    return validation;
                }
            }

            return { isValid: true };
        } else {
            // Para modo individual, validar apenas o contrato selecionado
            return this.validateSingleContract(this.config.contractType);
        }
    }

    validateSingleContract(contractType) {
        const digitContracts = ['DIGITDIFF', 'DIGITOVER', 'DIGITUNDER', 'DIGITMATCH'];
        const strictBarrierContracts = ['TOUCH', 'NOTOUCH', 'ONETOUCH'];

        // Validação para contratos de dígitos
        if (digitContracts.includes(contractType)) {
            if (!this.config.prediction ||
                this.config.prediction.type !== 'prediction' ||
                this.config.prediction.value === null ||
                this.config.prediction.value === undefined) {

                return {
                    isValid: false,
                    error: `Previsão de dígito obrigatória para contrato ${contractType}`,
                    field: 'prediction-input'
                };
            }

            const predictionValue = parseInt(this.config.prediction.value);
            if (isNaN(predictionValue) || predictionValue < 0 || predictionValue > 9) {
                return {
                    isValid: false,
                    error: `Valor de previsão inválido: ${this.config.prediction.value} (deve ser 0-9)`,
                    field: 'prediction-input'
                };
            }

            if (contractType === 'DIGITUNDER' && predictionValue === 0) {
                return {
                    isValid: false,
                    error: `Impossível: UNDER 0 não é válido. O último dígito não pode ser menor que 0.`,
                    field: 'prediction-input'
                };
            }

            if (contractType === 'DIGITOVER' && predictionValue === 9) {
                return {
                    isValid: false,
                    error: `Impossível: OVER 9 não é válido. O último dígito não pode ser maior que 9.`,
                    field: 'prediction-input'
                };
            }
        }

        if (contractType === 'CALL' || contractType === 'PUT') {
            // Verificar se há barreira configurada
            const hasBarrier = this.config.prediction &&
                this.config.prediction.type === 'single_barrier' &&
                this.config.prediction.value;

            if (hasBarrier) {
                const barrierValue = parseFloat(this.config.prediction.value);
                if (isNaN(barrierValue)) {
                    return {
                        isValid: false,
                        error: `Valor de barreira inválido: ${this.config.prediction.value}`,
                        field: 'barrier-input'
                    };
                }
            }
            // Se não há barreira, assumir que é Rise/Fall (válido)
            return { isValid: true };
        }

        // Validação para contratos que SEMPRE precisam de barreira
        if (strictBarrierContracts.includes(contractType)) {
            if (!this.config.prediction ||
                this.config.prediction.type !== 'single_barrier' ||
                !this.config.prediction.value) {

                return {
                    isValid: false,
                    error: `Barreira obrigatória para contrato ${contractType}`,
                    field: 'barrier-input'
                };
            }

            const barrierValue = parseFloat(this.config.prediction.value);
            if (isNaN(barrierValue)) {
                return {
                    isValid: false,
                    error: `Valor de barreira inválido: ${this.config.prediction.value}`,
                    field: 'barrier-input'
                };
            }
        }

        // Validação para contratos dupla barreira
        const doubleBarrierContracts = ['RANGE', 'UPORDOWN', 'EXPIRYMISS', 'EXPIRYRANGE'];
        if (doubleBarrierContracts.includes(contractType)) {
            if (!this.config.prediction ||
                this.config.prediction.type !== 'double_barrier' ||
                !this.config.prediction.highValue ||
                !this.config.prediction.lowValue) {

                return {
                    isValid: false,
                    error: `Barreiras alta e baixa obrigatórias para contrato ${contractType}`,
                    field: 'barrier-high-input'
                };
            }
        }

        return { isValid: true };
    }

    showBothModeConfigurationError(errorMessage, invalidContracts) {
        CommonHelpers.showError(`❌ [BOTH MODE] ${errorMessage}`);
        invalidContracts.forEach(ic => {
            const field = CommonHelpers.getElement(ic.field);
            if (field) {
                field.style.boxShadow = '0 0 0 3px rgba(255,193,7,0.5)';
                field.style.border = '2px solid #ffc107';
                setTimeout(() => { field.style.boxShadow = ''; field.style.border = ''; }, 10000);
            }
        });
        this.showPopup('Configuração do Modo "Ambos" Incompleta', `${errorMessage}<br><br><small>Configure a previsão para contratos de dígitos, barreiras para contratos que requerem, ou especifique contratos nas regras de estratégia.</small>`, '⚠️', 'Vou Configurar');
    }

    showCompatibilityError(errorMessage, fieldId) {
        CommonHelpers.showError(`❌ [COMPATIBILITY] ${errorMessage}`);
        const field = CommonHelpers.getElement(fieldId);
        if (field) {
            field.style.boxShadow = '0 0 0 3px rgba(255,193,7,0.5)';
            field.style.border = '2px solid #ffc107';
            setTimeout(() => { field.style.boxShadow = ''; field.style.border = ''; }, 10000);
        }
        this.showPopup('Configuração Incompatível', `${errorMessage}<br><br><small>👈 O campo destacado em amarelo precisa ser corrigido antes de iniciar o monitoramento.</small>`, '⚠️', 'Vou Corrigir', fieldId);
    }

    // 🗑️ MÉTODOS LEGADOS MANTIDOS PARA COMPATIBILIDADE
    extractEntryPrice(buyResult, contractResult) {
        const contract = contractResult?.contract;
        if (contract) {
            return this.extractEntryPriceFromContract(contract);
        }
        return this.contractStartPrice || 0;
    }

    extractExitPrice(contractResult) {
        const contract = contractResult?.contract;
        if (contract) {
            return this.extractExitPriceFromContract(contract);
        }
        return 0;
    }

    // 🎰 CORRIGIDO: Construir parâmetros base para proposta de contrato
    buildProposalParams() {

        // Trades simulados SEMPRE usam stake base (não consomem Gale)
        let stakeToUse = this.config.stake;

        if (this.tradeReal && this.nextTradeStake) {
            stakeToUse = this.nextTradeStake;
            logConfig.info('trade_manager', `🎰 [GALE] Aplicando Gale em trade REAL: ${stakeToUse}`);
        } else if (!this.tradeReal && this.nextTradeStake) {
            logConfig.info('trade_manager', `🎮 [SIMULADO] Preservando Gale (${this.nextTradeStake}) para próximo trade REAL. Usando stake base: ${stakeToUse}`);
        }


        const params = {
            "proposal": 1,
            "amount": stakeToUse, // ✅ CORRIGIDO: Usa Gale se aplicável
            "basis": "stake",
            "contract_type": this.config.contractType,
            "currency": "USD",
            "duration": this.config.duration,
            "duration_unit": this.config.durationUnit,
            "symbol": this.config.symbol
        };

        const minDurationMap = {
            'ASIANU': { t: 5 },
            'ASIAND': { t: 5 },
            'CALL': { t: 1, s: 15, m: 1, h: 1 },
            'PUT': { t: 1, s: 15, m: 1, h: 1 },
            'CALLE': { t: 5, s: 15, m: 1, h: 1 },  // ✅ HIGHER/LOWER: Ticks mínimo 5
            'PUTE': { t: 5, s: 15, m: 1, h: 1 },   // ✅ HIGHER/LOWER: Ticks mínimo 5
            'RESETCALL': { t: 1, s: 15, m: 1, h: 1 },
            'RESETPUT': { t: 1, s: 15, m: 1, h: 1 },
            'TICKHIGH': { t: 1 },
            'TICKLOW': { t: 1 },
            'RUNHIGH': { t: 2 },
            'RUNLOW': { t: 2 },
            'DIGITOVER': { t: 1, s: 15, m: 1, h: 1 },
            'DIGITUNDER': { t: 1, s: 15, m: 1, h: 1 },
            'TOUCH': { t: 2, m: 1, h: 1 },
            'NOTOUCH': { t: 2, m: 1, h: 1 },
            'ONETOUCH': { t: 2, m: 1, h: 1 },
            'EXPIRYRANGE': { m: 2, h: 1, d: 1 },
            'EXPIRYMISS': { m: 2, h: 1, d: 1 },
            'RANGE': { m: 2, h: 1, d: 1 },
            'UPORDOWN': { m: 2, h: 1, d: 1 }
        };

        const contractConfig = minDurationMap[this.config.contractType];
        if (contractConfig) {
            const minDurationForUnit = contractConfig[this.config.durationUnit];
            if (minDurationForUnit && this.config.duration < minDurationForUnit) {
                params.duration = minDurationForUnit;

            }
        }

        // Adicionar parâmetros específicos baseado no tipo de contrato
        if (this.config.contractType && this.config.contractType.startsWith('DIGIT')) {
            // Para contratos de dígitos, verificar se precisam do parâmetro digit
            switch (this.config.contractType) {
                case 'DIGITDIFF':
                case 'DIGITMATCH':
                case 'DIGITOVER':
                case 'DIGITUNDER':
                    // 🎯 LOG ANTES DE CONVERTER
                    const predictionValue = parseInt(this.config.prediction.value);


                    if (predictionValue !== null && predictionValue !== undefined && !isNaN(predictionValue)) {
                        params.barrier = predictionValue.toString();

                    } else {
                        throw new Error('Valor de previsão obrigatório para contratos de dígitos');
                    }
                    break;
                case 'DIGITEVEN':
                case 'DIGITODD':
                    // Estes tipos não precisam de digit parameter
                    break;
                default:
            }
        } else {

            // 🔧 CRÍTICO: Verificar contractType E tradeType para detectar Higher/Lower
            const isHigherLower = ['CALLE', 'PUTE'].includes(this.config.contractType) ||
                ['CALLE', 'PUTE'].includes(this.config.tradeType) ||
                this.config.contractType === 'HIGHER_LOWER_GROUP';

            if (isHigherLower) {
                // 🔧 HIGHER/LOWER: Usar ?? para respeitar valores como "0" e "-0.0"
                const barrierValue = this.config.barrier ?? this.config.prediction?.value;

                if (!barrierValue && barrierValue !== 0) {
                    console.error(`❌ [BARRIER ERROR] Barreira não definida!`);
                    console.error(`   config.barrier:`, this.config.barrier);
                    console.error(`   config.prediction:`, this.config.prediction);
                    throw new Error(`❌ Barreira não definida para ${this.config.contractType}. Configure uma barreira com sinal (ex: +0.5 ou -0.3)`);
                }

                const parsedBarrier = this.parseSignedBarrier(barrierValue);

                if (!parsedBarrier) {
                    console.error(`❌ [BARRIER ERROR] Barreira inválida: "${barrierValue}"`);
                    throw new Error(`❌ Barreira inválida para ${this.config.contractType}: "${barrierValue}". Use formato com sinal (ex: +0.5 ou -0.3)`);
                }

                const currentPrice = this.getCurrentMarketPrice();

                if (!currentPrice) {
                    console.error(`❌ [BARRIER ERROR] Preço de mercado indisponível`);
                    throw new Error('❌ Preço de mercado indisponível para calcular barreira absoluta');
                }

                // Calcular barreira absoluta: preço atual + offset
                const absoluteBarrier = currentPrice + parsedBarrier.signedValue;
                params.barrier = absoluteBarrier.toFixed(5);


            } else if (this.config.prediction) {
                // Para outros contratos com prediction
                switch (this.config.prediction.type) {
                    case 'single_barrier':
                        if (this.config.prediction.value !== null && this.config.prediction.value !== undefined) {
                            params.barrier = this.config.prediction.value;
                        } else {
                            if (this.config.contractType === 'CALL' || this.config.contractType === 'PUT') {
                            }
                        }
                        break;
                    case 'double_barrier':
                        if (this.config.prediction.high !== null && this.config.prediction.low !== null) {
                            params.barrier = `+${this.config.prediction.high}`;
                            params.barrier2 = `-${Math.abs(this.config.prediction.low)}`;
                        }
                        break;
                }
            } else {
                if (this.config.contractType === 'CALL' || this.config.contractType === 'PUT') {
                }
            }
        }

        return params;
    }

    // Aguardar resultado do contrato real
    async waitForContractResult(api, contractId) {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Timeout aguardando resultado do contrato'));
            }, 300000); // 5 minutos timeout

            // Subscrever ao status do contrato
            const subscription = {
                "proposal_open_contract": 1,
                "contract_id": contractId,
                "subscribe": 1
            };

            api.sendRequest(subscription).then(() => {
                // Listener para updates do contrato
                const originalHandler = api.handleMessage;
                api.handleMessage = (event) => {
                    originalHandler.call(api, event);

                    const data = JSON.parse(event.data);
                    if (data.msg_type === 'proposal_open_contract' && data.proposal_open_contract) {
                        const contract = data.proposal_open_contract;

                        if (contract.is_settleable || contract.is_sold) {
                            clearTimeout(timeout);

                            const isWin = parseFloat(contract.profit) > 0;
                            const profit = parseFloat(contract.profit);

                            resolve({
                                isWin,
                                profit,
                                contract
                            });
                        }
                    }
                };
            }).catch(reject);
        });
    }

    // 🔄 NOVO: Aguardar próximo tick real do mercado (para simulação correta)
    async waitForNextTick(marketData) {
        return new Promise((resolve) => {
            let tickReceived = false;
            let unsubscribe = null;

            const callback = (price) => {
                if (!tickReceived) {
                    tickReceived = true;
                    if (unsubscribe) unsubscribe();
                    resolve({
                        price: price,
                        time: Date.now()
                    });
                }
            };

            marketData.subscribeToTicks(this.config.symbol, callback).then(unsub => {
                unsubscribe = unsub;
            }).catch(error => {
                resolve(null);
            });

            // Timeout de segurança (30 segundos)
            setTimeout(() => {
                if (!tickReceived) {
                    if (unsubscribe) unsubscribe();
                    resolve(null);
                }
            }, 30000);
        });
    }

    async getCurrentTick(marketData) {
        return new Promise((resolve) => {
            let tickReceived = false;

            const callback = (price) => {
                if (!tickReceived) {
                    tickReceived = true;
                    resolve({
                        price: price,
                        time: Date.now()
                    });
                }
            };

            // Subscrever temporariamente para obter um tick
            marketData.subscribeToTicks(this.config.symbol, callback).catch(() => {
                resolve(null);
            });

            // Timeout de segurança
            setTimeout(() => {
                if (!tickReceived) {
                    resolve(null);
                }
            }, 10000);
        });
    }

    // 🔄 MELHORADO: Aguardar expiração do contrato com base na configuração
    async waitForContractExpiration(marketData) {
        const duration = this.config.duration;
        const unit = this.config.durationUnit;


        switch (unit) {
            case 't': // ticks - aguardar ticks reais do mercado e retornar último tick como resultado
                return await this.waitForTicks(marketData, duration);
            case 's': // segundos
                return await this.waitForSeconds(duration);
            case 'm': // minutos
                return await this.waitForSeconds(duration * 60);
            case 'h': // horas
                return await this.waitForSeconds(duration * 60 * 60);
            default:
                return await this.waitForSeconds(duration);
        }
    }

    // Aguardar N ticks reais do mercado
    async waitForTicks(marketData, tickCount) {

        return new Promise((resolve) => {
            let ticksReceived = 0;
            let unsubscribe = null;
            let lastTickPrice = null;
            const receivedTicks = []; // 🔍 Rastrear todos os ticks
            let firstTickDiscarded = false; // 🎯 Flag para descartar primeiro tick

            const callback = (price) => {
                // 🎯 CORREÇÃO CRÍTICA: Descartar o PRIMEIRO tick (ainda é o tick da entrada)
                if (!firstTickDiscarded) {
                    firstTickDiscarded = true;

                    return; // Não contar este tick
                }

                ticksReceived++;
                lastTickPrice = price;
                receivedTicks.push(price); // 🔍 Guardar histórico


                if (ticksReceived >= tickCount) {
                    if (unsubscribe) unsubscribe();

                    if (this.config?.cooldownPeriod === 0) {
                        this.exitPriceForImmediateReentry = lastTickPrice;
                    }

                    resolve({ price: lastTickPrice, time: Date.now() });
                }
            };

            // Subscrever aos ticks
            marketData.subscribeToTicks(this.config.symbol, callback).then(unsub => {
                unsubscribe = unsub;
            }).catch(error => {
                // Fallback para tempo aproximado se subscrição falhar
                const fallbackTime = tickCount * 2000; // 2 segundos por tick aproximadamente
                setTimeout(() => {
                    // Obter preço atual como fallback
                    const currentPrice = marketData.getCurrentPrice(this.config.symbol);
                    resolve({ price: currentPrice || 0, time: Date.now() });
                }, fallbackTime);
            });

            // Timeout de segurança (5 minutos)
            setTimeout(() => {
                if (unsubscribe) unsubscribe();
                // Usar preço atual como fallback do timeout
                const currentPrice = marketData.getCurrentPrice(this.config.symbol);
                resolve({ price: currentPrice || 0, time: Date.now() });
            }, 300000);
        });
    }

    // Aguardar N segundos
    async waitForSeconds(seconds) {
        const waitTime = seconds * 1000;

        return new Promise((resolve) => {
            setTimeout(() => {
                resolve();
            }, waitTime);
        });
    }


    // Determinar resultado do trade baseado no tipo de contrato
    determineTradeResult(entryPrice, exitPrice) {
        const contractType = this.config.contractType;

        // Validar preços de entrada
        if (!entryPrice || !exitPrice || isNaN(entryPrice) || isNaN(exitPrice)) {
            return false;
        }

        const entry = parseFloat(entryPrice);
        const exit = parseFloat(exitPrice);

        switch (contractType) {
            // ========== CONTRATOS DE DÍGITOS (lógica delegada) ==========
            case 'DIGITDIFF':
                return this.determineDigitDiffResult(entryPrice, exitPrice);
            case 'DIGITEVEN':
                return this.determineDigitEvenResult(exitPrice);
            case 'DIGITODD':
                return this.determineDigitOddResult(exitPrice);
            case 'DIGITOVER':
                return this.determineDigitOverResult(exitPrice);
            case 'DIGITUNDER':
                return this.determineDigitUnderResult(exitPrice);
            case 'DIGITMATCH':
                return this.determineDigitMatchResult(exitPrice);

            case 'CALL':
                // CALL = preço deve SUBIR (apostamos que vai subir)
                const callResult = exit > entry;
                return callResult;

            case 'PUT':
                // PUT = preço deve DESCER (apostamos que vai descer)
                const putResult = exit < entry;
                return putResult;

            case 'CALLE':

                // 🔧 USAR ?? para respeitar valores "0" e "-0.0"
                const barrierCalle = this.config.barrier ?? this.config.prediction?.value;
                if (!barrierCalle && barrierCalle !== 0) {
                    console.error('❌ [CALLE] Barreira não configurada');
                    console.error('  - this.config.barrier:', this.config.barrier);
                    console.error('  - this.config.prediction:', this.config.prediction);
                    return false;
                }

                const parsedBarrierCalle = this.parseSignedBarrier(barrierCalle);
                if (!parsedBarrierCalle) {
                    console.error(`❌ [CALLE] Barreira inválida: ${barrierCalle}`);
                    return false;
                }

                // Preço referência = Entrada + Barreira (com sinal)
                const referencePriceCalle = entry + parsedBarrierCalle.signedValue;
                const calleResult = exit > referencePriceCalle;

                return calleResult;

            case 'PUTE':

                // 🔧 USAR ?? para respeitar valores "0" e "-0.0"
                const barrierPute = this.config.barrier ?? this.config.prediction?.value;
                if (!barrierPute && barrierPute !== 0) {
                    console.error('❌ [PUTE] Barreira não configurada');
                    console.error('  - this.config.barrier:', this.config.barrier);
                    console.error('  - this.config.prediction:', this.config.prediction);
                    return false;
                }

                const parsedBarrierPute = this.parseSignedBarrier(barrierPute);
                if (!parsedBarrierPute) {
                    console.error(`❌ [PUTE] Barreira inválida: ${barrierPute}`);
                    return false;
                }

                // Preço referência = Entrada + Barreira (com sinal)
                const referencePricePute = entry + parsedBarrierPute.signedValue;
                const puteResult = exit < referencePricePute;

                return puteResult;

            default:
                return false;
        }
    }

    // Determinar resultado para DIGITDIFF
    determineDigitDiffResult(entryPrice, exitPrice) {
        const exitDigit = this.extractLastDigit(exitPrice);
        const prediction = parseInt(this.config.prediction.value);

        // Se forem DIFERENTES = WIN, se forem IGUAIS = LOSS
        const result = exitDigit !== prediction;

        return result;
    }

    // Determinar resultado para DIGITEVEN
    determineDigitEvenResult(exitPrice) {
        const digit = this.extractLastDigit(exitPrice);
        const result = digit % 2 === 0;


        return result;
    }

    // Determinar resultado para DIGITODD
    determineDigitOddResult(exitPrice) {
        const digit = this.extractLastDigit(exitPrice);
        const result = digit % 2 !== 0;


        return result;
    }

    // Determinar resultado para DIGITOVER
    determineDigitOverResult(exitPrice) {
        const prediction = parseInt(this.config.prediction.value);
        const digit = this.extractLastDigit(exitPrice);
        const result = digit > prediction;

        return result;
    }

    // Determinar resultado para DIGITUNDER
    determineDigitUnderResult(exitPrice) {
        const prediction = parseInt(this.config.prediction.value);
        const digit = this.extractLastDigit(exitPrice);
        const result = digit < prediction;

        return result;
    }

    // Determinar resultado para DIGITMATCH
    determineDigitMatchResult(exitPrice) {
        const prediction = parseInt(this.config.prediction.value);
        const digit = this.extractLastDigit(exitPrice);
        const result = digit === prediction;
        return result;
    }

    // Validar configuração antes do trade
    validateConfiguration() {

        if (!this.config.symbol) {
            return false;
        }

        if (!this.config.contractType) {
            return false;
        }

        if (this.config.stake <= 0) {
            return false;
        }

        if (this.config.stake < 0.35) {
            this.showMinimumStakePopup(this.config.stake);
            return false;
        }

        if (this.config.duration <= 0) {
            return false;
        }

        // Validações específicas para contratos de dígitos
        if (this.config.contractType.startsWith('DIGIT')) {
            const requiresDigit = ['DIGITDIFF', 'DIGITMATCH', 'DIGITOVER', 'DIGITUNDER'].includes(this.config.contractType);

            if (requiresDigit) {
                const prediction = this.config.prediction;
                if (!prediction || prediction.value === null || prediction.value === undefined || isNaN(prediction.value)) {
                    return false;
                }

                const digitValue = parseInt(prediction.value);
                if (digitValue < 0 || digitValue > 9) {
                    return false;
                }

            } else {
            }
        }

        // Validações específicas para trades reais
        if (this.currentMode !== 'SIMULACAO') {
            const sessionToken = SessionManager.getLocalToken();
            if (!sessionToken) {
                return false;
            }
        }

        return true;
    }

    // ⚡ OTIMIZAÇÃO: Inicializar conexão persistente para trades reais
    async initializeTradingConnection() {
        try {
            const token = SessionManager.getLocalToken();
            if (!token) return false;

            // ✅ CRÍTICO: Preferir instância global já inicializada pelo AppManager
            let marketData = window.marketDataInstance;

            if (!marketData) {
                marketData = getMarketDataInstance(token);
            }

            // ✅ CRÍTICO: Reutilizar conexão existente se estiver pronta
            if (marketData && marketData.isReady()) {

                this.tradingAPI = marketData;
                this.tradingAPIConnected = true;
                return true;
            }

            // Se existir mas não estiver conectada, aguardar conexão
            if (marketData) {

                await marketData.connect();

                if (marketData.isReady()) {
                    this.tradingAPI = marketData;
                    this.tradingAPIConnected = true;
                    return true;
                } else {
                    console.warn('[TRADING CONNECTION] MarketData connect() retornou mas isReady() é falso. Estado:', {
                        hasWs: !!marketData.ws,
                        readyState: marketData.ws ? marketData.ws.readyState : 'N/A',
                        isAuthorized: marketData.isAuthorized
                    });
                }
            }

            // Mas idealmente isso não deve ocorrer pois MarketData gerencia a conexão global
            console.warn('[TRADING CONNECTION] Falha ao reutilizar MarketData, criando nova conexão de emergência');
            this.tradingAPI = new DerivAPI();
            await this.tradingAPI.connect();

            // ✅ CRÍTICO: Aguardar resposta de autorização com mecanismo de retry
            let attempts = 0;
            const maxAttempts = 3;
            let authResponse = null;

            while (attempts < maxAttempts) {
                try {
                    authResponse = await this.tradingAPI.sendRequest({ "authorize": token });
                    if (authResponse.error) {
                        throw new Error(authResponse.error.message);
                    }
                    // Sucesso!
                    break;
                } catch (err) {
                    attempts++;
                    console.warn(`⚠️ Tentativa de autorização ${attempts}/${maxAttempts} falhou:`, err.message);
                    if (attempts >= maxAttempts) throw err;
                    // Aguardar antes de tentar novamente (backoff exponencial)
                    await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
                }
            }

            this.tradingAPIConnected = true;
            return true;

        } catch (error) {
            console.error('❌ [TRADING API] Erro na conexão:', error);
            this.tradingAPI = null;
            this.tradingAPIConnected = false;
            return false;
        }
    }

    // ⚡ OTIMIZAÇÃO: Desconectar API de trading
    disconnectTradingAPI() {
        // Se estiver usando a conexão compartilhada do MarketData, NÃO fechar o WebSocket
        if (this.tradingAPI && typeof this.tradingAPI.isReady === 'function') {

            this.tradingAPI = null;
            this.tradingAPIConnected = false;
            return;
        }

        if (this.tradingAPI && this.tradingAPI.ws) {
            try {
                this.tradingAPI.ws.close();
                this.tradingAPI = null;
                this.tradingAPIConnected = false;
            } catch (error) {
            }
        }
    }

    // 🔒 PROTEÇÃO: Iniciar troca de conta (bloqueia novos trades)
    beginAccountSwitch() {
        this.isAccountSwitching = true;

        // Desconectar API de trading
        this.disconnectTradingAPI();

        // Limpar cache de propostas
        this.stopProposalCaching();

    }

    // 🔓 PROTEÇÃO: Finalizar troca de conta (permite novos trades)
    endAccountSwitch() {
        this.isAccountSwitching = false;
    }

    // ⚡ OTIMIZAÇÃO CRÍTICA: Buscar e cachear proposal (elimina 200-800ms por trade)
    async fetchAndCacheProposal() {
        // Evitar múltiplas requisições simultâneas
        if (this.isFetchingProposal) {
            return;
        }

        try {
            this.isFetchingProposal = true;

            // Verificar se conexão está ativa
            if (!this.tradingAPI || !this.tradingAPIConnected) {
                return;
            }

            const currentUser = SessionManager.getCurrentUser();
            if (!currentUser || !currentUser.authorize) {
                return;
            }

            // Construir parâmetros da proposta
            const tradeParams = this.buildProposalParams();
            tradeParams.currency = currentUser.authorize.currency;
            tradeParams.amount = this.getCurrentStakeValue(); // ✅ CORREÇÃO: Usar stake calculado (Gale se necessário)

            const startTime = Date.now();

            // Buscar proposta
            const proposalResponse = await this.tradingAPI.sendRequest(tradeParams);

            const duration = Date.now() - startTime;

            if (proposalResponse.error) {
                return;
            }

            if (!proposalResponse.proposal || !proposalResponse.proposal.id) {
                return;
            }

            // Calcular payout multiplier
            const payoutAbsoluto = parseFloat(proposalResponse.proposal.payout);
            const askPrice = parseFloat(proposalResponse.proposal.ask_price || this.config.stake);
            const payoutMultiplier = payoutAbsoluto / askPrice;

            // Armazenar no cache
            this.proposalCache = {
                id: proposalResponse.proposal.id,
                payout: payoutMultiplier,
                ask_price: askPrice,
                timestamp: Date.now(),
                stake: this.config.stake,
                contractType: this.config.contractType,
                symbol: this.config.symbol
            };


        } catch (error) {
        } finally {
            this.isFetchingProposal = false;
        }
    }

    // ⚡ OTIMIZAÇÃO: Obter proposal do cache (se válido)
    getProposalFromCache() {
        // Verificar se existe cache
        if (!this.proposalCache) {
            return null;
        }

        // Verificar se cache está expirado
        const age = Date.now() - this.proposalCache.timestamp;
        if (age > this.proposalCacheExpiry) {
            this.proposalCache = null;
            return null;
        }

        // Verificar se configuração mudou
        if (this.proposalCache.contractType !== this.config.contractType ||
            this.proposalCache.symbol !== this.config.symbol ||
            this.proposalCache.stake !== this.config.stake) {
            this.proposalCache = null;
            return null;
        }

        return this.proposalCache;
    }

    // ⚡ OTIMIZAÇÃO: Iniciar sistema de cache de proposals
    async startProposalCaching() {
        try {

            // Buscar primeira proposal imediatamente
            await this.fetchAndCacheProposal();

            // Configurar atualização periódica (a cada 20 segundos)
            this.proposalCacheUpdateInterval = setInterval(() => {
                this.fetchAndCacheProposal();
            }, 20000);


        } catch (error) {
        }
    }

    // ⚡ OTIMIZAÇÃO: Parar sistema de cache
    stopProposalCaching() {
        if (this.proposalCacheUpdateInterval) {
            clearInterval(this.proposalCacheUpdateInterval);
            this.proposalCacheUpdateInterval = null;
        }

        // Limpar cache
        this.proposalCache = null;
    }

    // Iniciar sistema de trading
    start() {
        this.isActive = true;
        this.awaitingExpiration = false; // ✅ GARANTIR que não esteja aguardando expiração
    }

    // Parar sistema de trading
    stop() {
        this.isActive = false;
        this.awaitingExpiration = false;

        // ⚡ OTIMIZAÇÃO: Parar cache de proposals
        this.stopProposalCaching();

        // ⚡ OTIMIZAÇÃO: Desconectar API de trading ao parar
        this.disconnectTradingAPI();

    }

    // 🎯 ALIAS: Compatibilidade com MonitoringView.stopAll()
    stopMonitoring() {
        logConfig.info('trade_manager', '🛑 stopMonitoring chamado via alias');
        return this.stop();
    }

    // Getters para status atual
    getCurrentMode() {
        return this.currentMode;
    }

    isTradeActive() {
        return this.isActive;
    }

    isAwaitingExpiration() {
        return this.awaitingExpiration;
    }

    getConfiguration() {
        return { ...this.config };
    }

    // Obter contadores atuais
    getCounters() {
        return {
            realWinsStreak: this.realWinsStreak,
            realLossesStreak: this.realLossesStreak,
            simulatedLossesStreak: this.simulatedLossesStreak,
            simulatedWinsStreak: this.simulatedWinsStreak
        };
    }

    // 📊 NOVO: Obter contadores de histórico independentes
    getHistoryCounters() {
        return {
            realWinsTotal: this.historyCounters.realWinsTotal,
            realLossesTotal: this.historyCounters.realLossesTotal,
            simulatedWinsTotal: this.historyCounters.simulatedWinsTotal,
            simulatedLossesTotal: this.historyCounters.simulatedLossesTotal,
            totalContractsExecuted: this.historyCounters.totalContractsExecuted || 0,  // 🎯 NOVO
            totalRealContractsExecuted: this.historyCounters.totalRealContractsExecuted || 0
        };
    }

    // 📊 NOVO: Zerar contadores de histórico (apenas quando usuário limpar mensagens)
    clearHistoryCounters() {
        this.historyCounters = {
            realWinsTotal: 0,
            realLossesTotal: 0,
            simulatedWinsTotal: 0,
            simulatedLossesTotal: 0,
            totalContractsExecuted: 0,
            totalRealContractsExecuted: 0,
            tradeLimitCounter: 0  // 🎯 Contador do limite também é resetado
        };


        // Disparar evento para atualizar UI
        window.dispatchEvent(new CustomEvent('historyCountersCleared'));
    }

    // Forçar mudança de modo (para testes ou ajustes manuais)
    setMode(mode) {
        if (['SIMULACAO', 'REAL', 'VIRTUAL'].includes(mode)) {
            this.currentMode = mode;

            if (this.onModeChange) {
                this.onModeChange(this.currentMode, 'Alteração manual');
            }
        }
    }

    // 🔧 CORRIGIDO: Adicionar mensagem de resultado do trade com validação anti-NaN
    addTradeResultMessage(contractType, entryPrice, exitPrice, mode, isWin, stake = null, profit = null, contractId = null, predictionOverride = null) {
        try {

            // 🔧 NOVO: Validar e sanitizar todos os valores numéricos para evitar NaN
            const sanitizePrice = (price, fieldName) => {
                if (price === undefined || price === null) {
                    CommonHelpers.showWarning(`⚠️ [TRADE MESSAGE] ${fieldName} é undefined/null, usando 0`);
                    return 0;
                }

                const parsed = parseFloat(price);
                if (isNaN(parsed)) {
                    CommonHelpers.showError(`❌ [TRADE MESSAGE] ${fieldName} é NaN: ${price}, usando 0`);
                    return 0;
                }

                return parsed;
            };

            const sanitizedEntryPrice = sanitizePrice(entryPrice, 'entryPrice');
            const sanitizedExitPrice = sanitizePrice(exitPrice, 'exitPrice');
            const actualStake = stake !== null ? sanitizePrice(stake, 'stake') : sanitizePrice(this.config.stake, 'config.stake');
            const actualProfit = profit !== null ? sanitizePrice(profit, 'profit') : null;

            // Verificar se os preços são iguais (problema reportado pelo usuário)
            if (sanitizedEntryPrice === sanitizedExitPrice) {
                CommonHelpers.showError(`❌ [TRADE MESSAGE] PROBLEMA DETECTADO: Preços iguais!`);
                CommonHelpers.showError(`❌ [TRADE MESSAGE] Entry: ${sanitizedEntryPrice}, Exit: ${sanitizedExitPrice}`);
            }

            // Verificar se função getTradeMessagesInstance existe
            if (typeof getTradeMessagesInstance !== 'function') {
                CommonHelpers.showError('❌ [TRADE MESSAGE] getTradeMessagesInstance não é uma função');
                return;
            }

            // Obter instância do sistema de mensagens
            const messagesManager = getTradeMessagesInstance();

            if (!messagesManager) {
                CommonHelpers.showError('❌ [TRADE MESSAGE] messagesManager não foi obtido');
                return;
            }

            // 🎯 CRÍTICO: Priorizar previsão passada explicitamente (para simulação)
            let predictionValue = null;

            // 1. Usar predictionOverride se fornecido (simulação com regra)
            if (predictionOverride !== null && predictionOverride !== undefined) {
                predictionValue = predictionOverride;

            }
            // 2. Usar previsão do contractData salvo quando o contrato foi criado (real)
            else if (contractId) {
                const savedContract = this.activeContracts.get(contractId);
                if (savedContract && savedContract.prediction !== undefined) {
                    predictionValue = savedContract.prediction;
                }
            }
            // 3. Fallback: usar config atual
            else {
                predictionValue = this.config.prediction?.value ?? null;
            }

            messagesManager.addTradeMessage(contractType, sanitizedEntryPrice, sanitizedExitPrice, mode, isWin, actualStake, actualProfit, null, predictionValue);

        } catch (error) {
            CommonHelpers.showError('❌ Erro ao adicionar mensagem de trade:', error);
            CommonHelpers.showError('❌ Stack trace:', error.stack);
        }
    }

    formatTradeResultMessage(contractType, startPrice, finalPrice, mode, isWin) {
        const resultIcon = isWin ? '✅' : '❌';
        const modeText = mode === 'SIMULACAO' ? 'SIMULACAO' : mode;

        // Formato similar ao simulado mas identificando como real
        return `${resultIcon} ${contractType} | ${startPrice} | ${finalPrice} | ${modeText}`;
    }

    // Resetar contadores
    resetCounters() {
        this.realWinsStreak = 0;
        this.realLossesStreak = 0;
        this.simulatedLossesStreak = 0;
    }

    // 🗑️ NOVO: Limpar configurações antigas (método utilitário)
    clearUserConfiguration() {
        try {
            const currentUser = SessionManager.getCurrentUser();
            if (!currentUser) {
                CommonHelpers.showWarning('⚠️ Nenhum usuário logado para limpar configuração');
                return false;
            }

            // Remover configuração específica do usuário
            const userConfigKey = `trade_config_user_${currentUser.loginid}`;
            localStorage.removeItem(userConfigKey);

            // Remover configuração de sessão
            localStorage.removeItem(`trade_config_${this.sessionId}`);

            return true;
        } catch (error) {
            CommonHelpers.showError('❌ Erro ao limpar configuração:', error);
            return false;
        }
    }

    // 🎯 Atualizar lucro/perda cumulativo da sessão
    updateSessionProfitLoss(profit) {
        const numericProfit = Number(profit);
        if (isNaN(numericProfit)) {
            logConfig.error('trade_manager', `❌ updateSessionProfitLoss recebeu valor inválido: ${profit}`);
            return;
        }

        this.sessionProfitLoss += numericProfit;
        logConfig.info('trade_manager', `💰 P&L Sessão Atualizado: ${this.sessionProfitLoss.toFixed(2)} (Lucro trade: ${numericProfit.toFixed(2)})`);

        // 🎯 CRÍTICO: Verificar limites (Meta/Stop) IMEDIATAMENTE após atualizar saldo
        this.checkGoalAndStopLoss();
    }

    checkProfitLossLimits() {
        // 🔧 PROTEÇÃO: Verificar se popup já foi mostrado
        if (this.popupShown) {

            return;
        }

        // Verificar meta de lucro
        if (this.config.goal > 0 && this.sessionProfitLoss >= this.config.goal) {

            this.handleProfitLossLimitReached('meta de lucro', this.sessionProfitLoss, this.config.goal);
            return;
        }

        // Verificar stop loss
        if (this.config.stopLoss > 0 && this.sessionProfitLoss <= -this.config.stopLoss) {

            this.handleProfitLossLimitReached('stop loss', Math.abs(this.sessionProfitLoss), this.config.stopLoss);
            return;
        }

    }

    forceStopMonitoring() {
        if (window.MonitoringView && typeof window.MonitoringView.stopAll === 'function') {
            window.MonitoringView.stopAll();

        } else {
            this.stopMonitoring();
            CommonHelpers.showWarning('⚠️ [FORCE STOP] Fallback para stopMonitoring local');
        }
    }

    // ✅ NOVO: Verificar saldo apenas após resultado LOSS confirmado pela Deriv
    checkBalanceAfterLoss() {
        try {

            // Obter saldo atual (atualizado após o resultado da Deriv)
            const footerBalance = this.getCurrentFooterBalance();
            const currentUser = SessionManager.getCurrentUser();
            const currentBalance = footerBalance !== null ? footerBalance : (currentUser?.balance?.balance || 0);

            // Calcular stake necessária para próximo trade (considerando possível Gale)
            const nextStake = this.getCurrentStakeValue();


            if (currentBalance < nextStake) {

                // Parar monitoramento e mostrar popup
                this.forceStopMonitoring();
                this.showStopPopup(`Saldo insuficiente ($${currentBalance.toFixed(2)}) para continuar operando. Próximo trade requer $${nextStake.toFixed(2)}.`);
                return false;
            } else {
                return true;
            }

        } catch (error) {
            return true; // Em caso de erro, continuar operando (a Deriv fará a validação)
        }
    }

    showInsufficientBalancePopup(currentBalance, requiredStake) {
        // 🛡️ PROTEÇÃO: Evitar loop infinito de modals
        if (this.insufficientBalanceModalShown) {

            return;
        }

        // Marcar que modal foi exibido
        this.insufficientBalanceModalShown = true;


        if (window.MonitoringView && typeof window.MonitoringView.stopMonitoring === 'function') {

            window.MonitoringView.stopMonitoring();
        } else {
            console.error('❌ [BALANCE] MonitoringView não encontrado ou stopMonitoring não é função', {
                MonitoringView: !!window.MonitoringView,
                stopMonitoring: window.MonitoringView ? typeof window.MonitoringView.stopMonitoring : 'undefined'
            });
        }

        // Criar modal personalizado com texto branco
        const modal = document.createElement('div');
        modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
    `;
        const modalContent = document.createElement('div');
        modalContent.style.cssText = `
        background: #4a5f7f;
        padding: 30px;
        border-radius: 10px;
        max-width: 500px;
        text-align: center;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    `;
        modalContent.innerHTML = `
        <div style="color: #ffc107; font-size: 24px; margin-bottom: 15px;">
            ⚠️ Saldo Insuficiente
        </div>
        <div style="color: white; font-size: 16px; margin-bottom: 20px; line-height: 1.5;">
            Seu saldo atual é <strong>$${currentBalance.toFixed(2)}</strong>, mas a operação requer <strong>$${requiredStake.toFixed(2)}</strong>. 
            <br><br>
            O monitoramento foi <strong>parado automaticamente</strong>. 
            <br>
            Por favor, recarregue seu saldo para continuar operando.
        </div>
        <button id="close-insufficient-balance-modal" style="
            background: #007bff;
            color: white;
            border: none;
            padding: 10px 30px;
            border-radius: 5px;
            cursor: pointer;
            font-size: 16px;
            font-weight: bold;
        ">Entendi</button>
    `;
        modal.appendChild(modalContent);
        document.body.appendChild(modal);
        // Adicionar evento de fechar
        document.getElementById('close-insufficient-balance-modal').addEventListener('click', () => {
            modal.remove();
            // 🔓 Resetar flag quando modal for fechado
            this.insufficientBalanceModalShown = false;
        });
        // Fechar ao clicar fora do modal
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
                // 🔓 Resetar flag quando modal for fechado
                this.insufficientBalanceModalShown = false;
            }
        });
    }

    // Esta função executa trades REAIS sem tocar no estado de monitoramento
    async executeChartTrade(params) {
        try {


            // 1. Validar parâmetros
            if (!params.contractType || !params.stake || !params.symbol) {
                throw new Error('Parâmetros inválidos');
            }

            // Isso garante que a API está autenticada e evita "Please log in"

            const connected = await this.initializeTradingConnection();
            if (!connected) {
                throw new Error('Falha ao conectar com API de trading');
            }

            // 3. Obter informações do usuário
            const currentUser = SessionManager.getCurrentUser();
            if (!currentUser || !currentUser.authorize) {
                throw new Error('Usuário não autorizado');
            }

            // 4. Construir proposta
            const proposal = this.buildChartProposal(params, currentUser.authorize.currency);


            // 5. Obter preço da proposta
            const priceResponse = await this.tradingAPI.sendRequest(proposal);

            if (priceResponse.error) {
                throw new Error(`Erro na proposta: ${priceResponse.error.message}`);
            }

            if (!priceResponse.proposal || !priceResponse.proposal.id) {
                throw new Error('Proposta inválida retornada pela API');
            }

            // 6. Comprar contrato
            const buyRequest = {
                buy: priceResponse.proposal.id,
                price: params.stake
            };

            const buyResponse = await this.tradingAPI.sendRequest(buyRequest);

            if (buyResponse.error) {
                throw new Error(`Erro na compra: ${buyResponse.error.message}`);
            }

            if (!buyResponse.buy || !buyResponse.buy.contract_id) {
                throw new Error('Resposta de compra inválida');
            }

            // Isso garante que o desconto da stake seja refletido na UI
            await this.updateAccountBalance();

            // 7. Retornar resultado (SEM modificar estado de monitoramento)
            return {
                success: true,
                contractId: buyResponse.buy.contract_id,
                buyPrice: buyResponse.buy.buy_price,
                payout: buyResponse.buy.payout,
                transactionId: buyResponse.buy.transaction_id,
                shortcode: buyResponse.buy.shortcode
            };

        } catch (error) {
            console.error('❌ [CHART TRADE] Erro:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // 🎯 NOVO: Construir proposta para trade do modal
    buildChartProposal(params, currency) {
        const proposal = {
            proposal: 1,
            amount: params.stake,
            basis: 'stake',
            contract_type: params.contractType,
            currency: currency || 'USD',
            duration: params.duration || 1,
            duration_unit: params.durationType || 't',
            symbol: params.symbol
        };

        // Adicionar previsão/barreira se necessário
        if (params.prediction !== null && params.prediction !== undefined) {
            proposal.barrier = params.prediction.toString();
        }

        if (params.barrier) {
            proposal.barrier = params.barrier;
        }

        return proposal;
    }

    /**
     * 🎯 CENTRALIZADO: Resolver tokens de previsão dinâmica (ex: dynamic_repeated_digit) para números (0-9)
     * @param {Object} predictionObj Objeto de previsão capturado
     * @returns {Number|String} Valor resolvido ou o original
     */
    _resolveDynamicPrediction(predictionObj) {
        if (!predictionObj) return null;

        // Suportar tanto predictionValue quanto prediction (legado)
        let value = predictionObj.predictionValue !== undefined ? predictionObj.predictionValue : predictionObj.prediction;

        // Se já for um número ou null (sem token), retornar direto
        // 🎯 FIX: Permitir que variáveis que começam com '$' passem para resolução (ex: $LOWER_PROB)
        if (typeof value !== 'string' || (!value.startsWith('dynamic_') && !value.startsWith('$'))) {
            return value;
        }

        // Tentar resolver o token usando o dígito disparador capturado
        try {
            const rule = predictionObj.rule || {};
            const params = rule.parameters || {};
            const combined = params.combinedRule || {};

            const resolved = predictionObj._triggerDigit ??
                rule._triggerDigit ??
                params._triggerDigit ??
                combined.patternRule?._triggerDigit ??
                combined.percentageRule?._triggerDigit ??
                combined.rsiRule?._triggerDigit;

            if (resolved !== undefined && resolved !== null) {
                // Se conseguimos resolver pelo trigger digit, ótimo!
                return resolved;
            }

            // 🎯 FALLBACK ADICIONAL: Se for '$' e não resolvemos acima, resolver pelo sistema de prob
            if (typeof value === 'string' && value.startsWith('$')) {
                if (typeof getProbabilityResolver === 'function') {
                    const resolver = getProbabilityResolver();
                    if (resolver) {
                        // 🎯 FIX: Tentar primeiro resolver em tempo real para o log, ou usar o padrão.
                        const finalResolved = resolver.resolve(value, false);
                        if (finalResolved !== null) {
                            return finalResolved;
                        } else {
                            logConfig.warn('trade_manager', `⚠️ [DYNAMIC RESOLVE] Falha ao resolver ${value} via ProbabilityResolver.`);
                        }
                    }
                }
            } else if (typeof value === 'string' && value.startsWith('dynamic_')) {
                logConfig.warn('trade_manager', `⚠️ [DYNAMIC RESOLVE] Token ${value} não foi resolvido pelo _triggerDigit.`);
            }
        } catch (e) {
            console.warn('⚠️ Erro ao resolver previsão dinâmica:', e);
        }

        return value; // Retorna o token original se não conseguir resolver
    }

}

// Singleton para uso global
let tradeManagerInstance = null;

function getTradeManagerInstance() {
    if (!tradeManagerInstance) {
        tradeManagerInstance = new TradeManager();
        // 🔍 DEBUG: Expor no window para facilitar inspeção no console
        if (typeof window !== 'undefined') {
            window.tradeManager = tradeManagerInstance;
        }
    }
    return tradeManagerInstance;
}

// ✅ EXPOR GLOBALMENTE: Garantir acesso de chart-modal.js e outros módulos
if (typeof window !== 'undefined') {
    window.getTradeManagerInstance = getTradeManagerInstance;
}
