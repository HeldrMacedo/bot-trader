// js/trade/TradeSessionConfig.js
// Configurações de sessão de trading isoladas por usuário

class TradeSessionConfig {
    constructor(sessionId) {
        this.sessionId = sessionId;
        this.config = null;
        this.onConfigUpdate = null; // Callback para atualizações

        // Carregar configuração
        this.config = this.loadConfiguration();


    }

    // 🔍 Validar acesso do usuário
    validateUserAccess() {
        const currentUser = SessionManager.getCurrentUser();
        if (currentUser && !SessionManager.validateDataIntegrity()) {
            console.warn('⚠️ Problemas de integridade detectados para TradeSessionConfig');
            return false;
        }
        return true;
    }

    // 🔐 Carregar configuração com segurança (isolada por usuário)
    loadConfiguration() {
        try {
            const currentUser = SessionManager.getCurrentUser();
            if (!currentUser) {
                console.warn('⚠️ Nenhum usuário logado, usando configuração padrão');
                return this.getDefaultConfiguration();
            }

            // 🎯 Tentar carregar configuração específica do usuário primeiro
            const userConfigKey = `trade_config_user_${currentUser.loginid}`;
            const userSaved = localStorage.getItem(userConfigKey);

            if (userSaved) {
                try {
                    const userParsedData = JSON.parse(userSaved);
                    const userConfig = userParsedData.config || userParsedData;
                    const defaultConfig = this.getDefaultConfiguration();
                    const finalConfig = { ...defaultConfig, ...userConfig };

                    logConfig.debug('trade_config', `📋 Configuração carregada do usuário: ${currentUser.loginid}`);
                    return finalConfig;
                } catch (userError) {
                    console.warn('⚠️ Erro ao carregar configuração do usuário, tentando configuração de sessão:', userError);
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
                console.warn(`⚠️ Configuração de trade pertence a outro usuário, usando padrão`);
                return defaultConfig;
            }

            // 📊 Extrair configuração real dos metadados
            const config = parsedData.config || parsedData;
            const finalConfig = { ...defaultConfig, ...config };

            logConfig.debug('trade_config', `📋 Configuração carregada da sessão: ${this.sessionId}`);
            return finalConfig;
        } catch (error) {
            console.error('❌ Erro ao carregar configuração de trade:', error);
            return this.getDefaultConfiguration();
        }
    }

    // 📋 Obter configuração padrão
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
            symbol: SessionManager.getSessionData('selected_symbol'),
            galeAdjustment: this.getGaleAdjustmentFromUI() || 1.05,
            galeSplit: 1, // 🎯 DEFAULT SAFE
            galeActive: true
        };
    }

    // 🔐 Salvar configuração com segurança
    saveConfiguration() {
        try {
            const currentUser = SessionManager.getCurrentUser();
            if (!currentUser) {
                console.warn('⚠️ Não é possível salvar configuração sem usuário logado');
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

                // 🎯 Salvar configuração específica do usuário (persiste entre sessões)
                const userConfigKey = `trade_config_user_${currentUser.loginid}`;
                const userDataToSave = {
                    config: this.config,
                    _userId: currentUser.loginid,
                    _timestamp: Date.now(),
                    _lastSession: this.sessionId
                };

                localStorage.setItem(userConfigKey, JSON.stringify(userDataToSave));

                logConfig.debug('trade_config', `💾 Configuração salva para usuário: ${currentUser.loginid}`);

                return true;
            });
        } catch (error) {
            console.error('❌ Erro ao salvar configuração de trade:', error);
            return false;
        }
    }

    // 🎰 NOVO: Obter valor do multiplicador Gale da UI
    getGaleAdjustmentFromUI() {
        try {
            const galeMultiplierInput = document.getElementById('gale-multiplier-input');
            if (galeMultiplierInput && galeMultiplierInput.value) {
                const adjustment = parseFloat(galeMultiplierInput.value);
                if (!isNaN(adjustment) && adjustment > 0) {
                    return adjustment;
                }
            }
            return null; // Retorna null se não encontrar valor válido
        } catch (error) {
            console.warn(`⚠️ Erro ao obter multiplicador Gale da UI: ${error.message}`);
            return null;
        }
    }

    // Atualizar configurações a partir da UI
    updateConfigurationFromUI() {
        const durationInput = document.getElementById('duration-input');
        const durationUnitSelect = document.getElementById('duration-unit-select');
        const stakeInput = document.getElementById('stake-input');
        const goalInput = document.getElementById('goal-input');
        const stopLossInput = document.getElementById('stop-loss-input');
        const winRealInput = document.getElementById('win-real-input');
        const lossRealInput = document.getElementById('loss-real-input');
        const winSimulatedInput = document.getElementById('win-simulated-input');
        const lossSimulatedInput = document.getElementById('loss-simulated-input');
        const symbolSelect = document.getElementById('symbol-select');
        const contractSelect = document.getElementById('contract-select');
        const galeMultiplierInput = document.getElementById('gale-multiplier-input');
        const tradeTypeSelect = document.getElementById('trade-type-select');

        if (durationInput) this.config.duration = parseInt(durationInput.value) || 5;
        if (durationUnitSelect) this.config.durationUnit = durationUnitSelect.value || 't';
        if (stakeInput) this.config.stake = parseFloat(stakeInput.value) || 10;
        if (goalInput) this.config.goal = parseFloat(goalInput.value) || 0;
        if (stopLossInput) this.config.stopLoss = parseFloat(stopLossInput.value) || 0;
        if (winRealInput) this.config.realWinsLimit = parseInt(winRealInput.value) || 0;
        if (lossRealInput) this.config.realLossesLimit = parseInt(lossRealInput.value) || 0;
        if (winSimulatedInput) this.config.simulatedWinsLimit = parseInt(winSimulatedInput.value) || 0;
        if (lossSimulatedInput) this.config.simulatedLossesLimit = parseInt(lossSimulatedInput.value) || 0;
        if (symbolSelect) this.config.symbol = symbolSelect.value;
        if (contractSelect) this.config.contractType = contractSelect.value;
        if (tradeTypeSelect) this.config.tradeType = tradeTypeSelect.value;

        // 🎰 CORREÇÃO: Gale - usar valor definido pelo usuário
        if (galeMultiplierInput && galeMultiplierInput.value) {
            const adjustment = parseFloat(galeMultiplierInput.value);
            if (!isNaN(adjustment) && adjustment > 0) {
                this.config.galeAdjustment = adjustment;
                logConfig.debug('trade_config', `🎰 Multiplicador Gale atualizado: ${adjustment}`);
            } else {
                logConfig.debug('trade_config', `⚠️ Valor inválido para multiplicador Gale: ${galeMultiplierInput.value}, mantendo: ${this.config.galeAdjustment}`);
            }
        } else {
            logConfig.debug('trade_config', `🎰 Multiplicador Gale mantido: ${this.config.galeAdjustment}`);
        }

        // 🎯 SPLIT GALE: Ler valor do seletor
        const galeSplitInput = document.getElementById('gale-split-input');
        if (galeSplitInput && galeSplitInput.value) {
            this.config.galeSplit = parseInt(galeSplitInput.value) || 1;
            logConfig.debug('trade_config', `🎰 Split Gale atualizado: ÷${this.config.galeSplit}`);
        } else {
            // Fallback para 1 se não encontrado
            this.config.galeSplit = 1;
        }
        this.config.galeActive = true;

        // Obter valores de previsão/barreira
        if (typeof ConfigurationsView !== 'undefined' && typeof ConfigurationsView.getPredictionBarrierValues === 'function') {
            this.config.prediction = ConfigurationsView.getPredictionBarrierValues();
        } else {
            const predictionInput = document.getElementById('prediction-input');
            if (predictionInput && this.config.contractType && this.config.contractType.startsWith('DIGIT')) {
                const predictionValue = parseInt(predictionInput.value);
                if (!isNaN(predictionValue) && predictionValue >= 0 && predictionValue <= 9) {
                    this.config.prediction = {
                        type: 'prediction',
                        value: predictionValue
                    };
                } else {
                    this.config.prediction = { type: 'none', value: null };
                }
            }
        }

        this.saveConfiguration();

        // Notificar callback
        if (this.onConfigUpdate) {
            this.onConfigUpdate(this.config);
        }

        logConfig.debug('trade_config', '⚙️ Configuração atualizada da UI');
    }

    // 🔧 Sincronizar configurações com a UI após carregamento
    syncWithUIConfiguration() {
        try {
            this.updateConfigurationFromUI();
            logConfig.info('trade_config', `🔧 Configuração sincronizada com UI`);
        } catch (error) {
            console.error('❌ Erro na sincronização:', error);
        }
    }

    // 🗑️ Limpar configurações antigas
    clearUserConfiguration() {
        try {
            const currentUser = SessionManager.getCurrentUser();
            if (!currentUser) {
                console.warn('⚠️ Nenhum usuário logado para limpar configuração');
                return false;
            }

            const userConfigKey = `trade_config_user_${currentUser.loginid}`;
            localStorage.removeItem(userConfigKey);
            localStorage.removeItem(`trade_config_${this.sessionId}`);

            logConfig.info('trade_config', `🗑️ Configuração limpa para usuário: ${currentUser.loginid}`);
            return true;
        } catch (error) {
            console.error('❌ Erro ao limpar configuração:', error);
            return false;
        }
    }

    // Validar configuração
    validateConfiguration() {
        if (!this.config.symbol) {
            console.error('❌ Símbolo não definido');
            return false;
        }

        if (!this.config.contractType) {
            console.error('❌ Tipo de contrato não definido');
            return false;
        }

        if (this.config.stake < 0.35) {
            console.error(`❌ Stake muito baixo: ${this.config.stake} (mínimo: 0.35)`);
            return false;
        }

        return true;
    }

    // Atualizar campo específico da configuração
    updateConfigField(field, value) {
        if (this.config.hasOwnProperty(field)) {
            this.config[field] = value;
            this.saveConfiguration();

            if (this.onConfigUpdate) {
                this.onConfigUpdate(this.config);
            }

            logConfig.debug('trade_config', `🔧 Campo atualizado: ${field} = ${value}`);
            return true;
        }

        console.warn(`⚠️ Campo desconhecido: ${field}`);
        return false;
    }

    // Obter configuração atual
    getConfig() {
        return { ...this.config }; // Retornar cópia
    }

    // Obter sessão ID
    getSessionId() {
        return this.sessionId;
    }
}

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.TradeSessionConfig = TradeSessionConfig;
}