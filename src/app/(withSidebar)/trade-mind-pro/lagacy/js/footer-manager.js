// js/footer-manager.js
// Gerenciador de rodapés VIP/ADMIN unificado
// TODOS OS USUÁRIOS TERÃO ACESSO AO RODAPÉ VIP

const FooterUtils = {
    getBottomBarElement() {
        return document.querySelector('.bottom-bar');
    },

    clearFooterContent(containerId = null) {
        const bottomBar = this.getBottomBarElement();
        if (bottomBar) {
            bottomBar.innerHTML = '';
        }
        if (containerId) {
            const container = document.getElementById(containerId);
            if (container) {
                container.remove();
            }
        }
    },

    async getFormattedBalance() {
        try {
            const currentUser = SessionManager.getCurrentUser();
            if (!currentUser) return 'USD 0.00';

            // Helper para parse seguro
            const safeParse = (val) => {
                if (val === undefined || val === null || val === '') return 0;
                const parsed = parseFloat(val);
                return isNaN(parsed) ? 0 : parsed;
            };

            const token = SessionManager.getLocalToken();
            if (!token || !window.AppManager?.apiInstance) {
                return `${currentUser.currency || 'USD'} ${safeParse(currentUser.balance).toFixed(2)}`;
            }

            // Tentar obter saldo atualizado da API
            try {
                const response = await window.AppManager.apiInstance.send({ balance: 1, account: 'current' });
                if (response && response.balance) {
                    return `${response.balance.currency} ${safeParse(response.balance.balance).toFixed(2)}`;
                }
            } catch (apiError) {
                // Silencioso: falha na API, usar cache
            }

            return `${currentUser.currency || 'USD'} ${safeParse(currentUser.balance).toFixed(2)}`;
        } catch (error) {
            const currentUser = SessionManager.getCurrentUser();
            const safeParse = (val) => {
                if (val === undefined || val === null || val === '') return 0;
                const parsed = parseFloat(val);
                return isNaN(parsed) ? 0 : parsed;
            };
            return `${currentUser?.currency || 'USD'} ${safeParse(currentUser?.balance).toFixed(2)}`;
        }
    },

    removeFloatingButtons() {
        // 🔧 DESABILITADO: Botões agora são estáticos no header
        // Não remover para não quebrar o layout do header
    },

    cleanupMarketDataListeners(listenerRef) {
        // Limpeza acontece em FooterManager.clearCurrentFooter()
    },

    updateBalanceElements(currency, amount) {
        // ✅ CRÍTICO: Validar e formatar amount para evitar NaN
        let formattedAmount;
        if (amount === null || amount === undefined || amount === '') {
            formattedAmount = '0.00';
        } else {
            const numericAmount = parseFloat(amount);
            formattedAmount = isNaN(numericAmount) ? '0.00' : numericAmount.toFixed(2);
        }

        const newBalanceText = `${currency} ${formattedAmount}`;

        // ⚡ OTIMIZAÇÃO: Cache de seletores para evitar querySelectorAll repetitivo
        if (!this._balanceSelectorsCache) {
            this._balanceSelectorsCache = [
                '.vip-balance strong',
                '.balance strong',
                '[class*="balance"] strong',
                '.deriv-balance-inline .balance-value'
            ];
        }

        let elementsUpdated = 0;

        // ⚡ OTIMIZAÇÃO: Usar requestAnimationFrame para não bloquear thread principal
        requestAnimationFrame(() => {
            for (const selector of this._balanceSelectorsCache) {
                // Tentar selecionar apenas se necessário (não spammar DOM)
                const elements = document.querySelectorAll(selector);
                if (elements.length > 0) {
                    elements.forEach(element => {
                        // ⚡ OTIMIZAÇÃO: Só atualizar se texto mudou
                        if (element.textContent !== newBalanceText) {
                            const currentText = element.textContent.trim();
                            // Verificar heurística simples para não sobrescrever coisas erradas
                            if (currentText.includes('USD') || currentText.includes('EUR') || /\d+\.\d+/.test(currentText) || currentText === 'Carregando...') {
                                element.textContent = newBalanceText;
                                elementsUpdated++;
                                this.addBalanceRefreshButton(element);
                            }
                        }
                    });
                }
            }
        });

        return elementsUpdated; // Retornará 0 imediato devido ao RAF, mas tudo bem
    },

    // 💰 NOVO: Adicionar botão de refresh manual do saldo
    addBalanceRefreshButton(balanceElement) {
        // Tentar encontrar o container pai mais adequado
        // 🎯 FIX: Adicionado .deriv-balance-inline e verificação para não selecionar o próprio elemento
        let parentContainer = balanceElement.closest('.vip-balance, .balance, .deriv-balance-inline, [class*="balance"]');

        // Se o container encontrado for o próprio elemento (ex: span com classe balance-value), pegar o pai
        if (parentContainer === balanceElement) {
            parentContainer = balanceElement.parentElement;
        }

        // Fallback: Se não encontrar container específico, usar o pai direto do elemento strong/span
        if (!parentContainer) {
            parentContainer = balanceElement.parentElement;
        }

        if (!parentContainer) return;

        // Garantir que o container pai tenha posição relativa
        try {
            if (window.getComputedStyle(parentContainer).position === 'static') {
                parentContainer.style.position = 'relative';
            }
        } catch (e) {
            parentContainer.style.position = 'relative';
        }

        const existingButton = parentContainer.querySelector('.balance-refresh-btn');
        if (existingButton) {
            existingButton.style.display = 'block';
            return;
        }

        // Criar botão de refresh
        const refreshButton = document.createElement('button');
        refreshButton.className = 'balance-refresh-btn';
        refreshButton.innerHTML = '⟳'; // 🎯 Ícone diferente do reset de P&L (↻)
        refreshButton.title = 'Atualizar saldo manualmente';
        refreshButton.style.cssText = `
            background: rgba(255, 255, 255, 0.15);
            border: 1px solid rgba(255, 255, 255, 0.3);
            border-radius: 4px;
            color: white;
            cursor: pointer;
            font-size: 14px; /* Um pouco maior para o novo ícone */
            margin-top: 4px;
            padding: 0;
            transition: all 0.2s;
            display: block;
            width: 100%;
            height: 20px;
            line-height: 18px;
            min-width: 24px;
            text-align: center;
            z-index: 9999;
            position: relative;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
            pointer-events: auto;
        `;

        // Hover effect
        refreshButton.onmouseenter = () => {
            refreshButton.style.background = 'rgba(255, 255, 255, 0.25)';
            refreshButton.style.transform = 'translateY(-1px)';
            refreshButton.style.boxShadow = '0 4px 8px rgba(0,0,0,0.3)';
        };
        refreshButton.onmouseleave = () => {
            refreshButton.style.background = 'rgba(255, 255, 255, 0.15)';
            refreshButton.style.transform = 'translateY(0)';
            refreshButton.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
        };

        // Click handler
        refreshButton.onclick = async (e) => {
            e.preventDefault();
            e.stopPropagation();

            refreshButton.disabled = true;
            refreshButton.innerHTML = '⏳';
            refreshButton.style.opacity = '0.7';

            try {
                // Tentar usar TradeManager primeiro
                let tm = null;
                if (typeof getTradeManagerInstance === 'function') {
                    tm = getTradeManagerInstance();
                } else if (window.tradeManager) {
                    tm = window.tradeManager;
                }

                if (tm && typeof tm.updateAccountBalance === 'function') {

                    await tm.updateAccountBalance();
                } else if (typeof FooterManager !== 'undefined' && typeof FooterManager.updateAccountBalance === 'function') {

                    await FooterManager.updateAccountBalance();
                } else {
                    // Fallback final: Tentar atualizar via API direta se tudo falhar

                    const currentUser = SessionManager.getCurrentUser();
                    if (window.AppManager?.apiInstance) {
                        const response = await window.AppManager.apiInstance.send({ balance: 1, account: 'current' });
                        if (response.balance) {
                            FooterUtils.updateBalanceElements(response.balance.currency, response.balance.balance);
                        }
                    }
                }

                // Feedback visual de sucesso
                refreshButton.innerHTML = '✓';
                refreshButton.style.background = 'rgba(40, 167, 69, 0.4)';

                setTimeout(() => {
                    refreshButton.innerHTML = '🔄';
                    refreshButton.disabled = false;
                    refreshButton.style.opacity = '1';
                    refreshButton.style.background = 'rgba(255, 255, 255, 0.15)';
                }, 1500);
            } catch (error) {
                console.error('❌ [BALANCE REFRESH] Erro ao atualizar saldo:', error);
                refreshButton.innerHTML = '✗';
                refreshButton.style.background = 'rgba(220, 53, 69, 0.4)';

                setTimeout(() => {
                    refreshButton.innerHTML = '🔄';
                    refreshButton.disabled = false;
                    refreshButton.style.opacity = '1';
                    refreshButton.style.background = 'rgba(255, 255, 255, 0.15)';
                }, 2000);
            }
        };

        // Adicionar botão ao container
        parentContainer.appendChild(refreshButton);

    }
};

class FooterManager {
    static currentFooter = null;
    static isInitializing = false;
    static isFullyInitialized = false;
    static balanceInitialized = false;
    static currentLevel = null;
    static balanceUpdateInterval = null;
    static balanceEventListenerAttached = false;
    static adminLevelListener = null;
    static balanceUpdateListener = null;
    static marketDataListener = null;
    static instanceId = Math.random().toString(36).substring(2, 8);
    static isAccountSwitching = false; // 🔒 NOVO: Flag para proteger dados de ativo durante troca de conta

    static lastBalanceUpdate = 0;
    static minBalanceUpdateInterval = 5000;

    // 🎯 Inicializar rodapé usando o FLUXO ÚNICO DO ADMIN (funciona para todos)
    static async initializeFooter() {
        // 🚨 SINGLETON: Prevenir inicializações múltiplas
        if (this.isInitializing) {

            return;
        }

        // ✅ TROCA DE CONTA: Se footer já existe, apenas garantir listeners (NÃO LIMPAR)
        if (this.currentFooter) {

            this.ensureMarketDataListener();
            return;
        }

        // 🆕 PRIMEIRA INICIALIZAÇÃO: Criar footer do zero
        this.isInitializing = true;

        // Limpar estado anterior se existir
        if (this.isFullyInitialized) {
            this.forceCleanup();
        }

        // 🧹 Limpar rodapé atual se existir
        this.clearCurrentFooter();

        // 🎯 USAR FLUXO DO ADMIN: Todos os usuários recebem VipFooter
        this.currentFooter = new VipFooter();

        // 🚀 Renderizar o rodapé (mesmo processo que Admin usa)
        await this.currentFooter.render();

        // 💰 NOVO: Forçar adição do botão de refresh logo após renderizar
        setTimeout(() => {
            const currentUser = SessionManager.getCurrentUser();
            if (currentUser) {
                FooterUtils.updateBalanceElements(currentUser.currency || 'USD', currentUser.balance || '0.00');
            }
        }, 500);

        // Garantir que o footer sempre escuta eventos
        this.ensureMarketDataListener();

        // 💰 NOVO: Forçar verificação de elementos de saldo para adicionar botão
        setTimeout(() => {
            const currentUser = SessionManager.getCurrentUser();
            if (currentUser) {
                FooterUtils.updateBalanceElements(currentUser.currency || 'USD', currentUser.balance || '0.00');
            }
        }, 1000);

        this.initAdminLevelListeners();

        this.initVipCountdownUpdater();

        // 🎯 Botões flutuantes agora são gerenciados por monitoring.js

        this.isInitializing = false;
        this.isFullyInitialized = true;

        // 🔧 Botões flutuantes agora são gerenciados por monitoring.js
    }

    // 🎯 NOVO: Garantir que marketDataListener está sempre ativo
    static ensureMarketDataListener() {
        // 🧹 CRÍTICO: Se já existe, remover primeiro para evitar duplicatas
        if (this.marketDataListener) {
            window.removeEventListener('marketDataUpdate', this.marketDataListener);
            this.marketDataListener = null;

        }

        // 🛡️ PROTEÇÃO EXTRA: Verificar se há listeners órfãos e registrar ID único
        const listenerId = `footer_${Date.now()}_${Math.random().toString(36).substring(7)}`;

        // Criar novo listener CORRIGIDO
        this.marketDataListener = (event) => {

            if (!event || !event.detail) {

                return;
            }

            const data = event.detail;

            // 🛡️ PROTEÇÃO: Verificar se currentFooter ainda existe e não foi destruído
            if (!this.currentFooter) {

                return;
            }

            if (this.currentFooter.isDestroyed) {

                return;
            }

            // ✅ FILTRAR eventos sem dados válidos (que causam o problema)
            if (!data.lastPrice || data.lastPrice === undefined) {
                // Log apenas ocasionalmente para evitar spam

                return;
            }


            // ✅ BUSCAR dados diretamente do buffer central se evento não tem dados completos
            let processedData = data;
            if (!data.symbol || !data.lastPrice) {
                const marketData = getMarketDataInstance(SessionManager.getLocalToken());
                if (marketData) {
                    const currentSymbol = window.selectedSymbol || SessionManager.getSessionData('selected_symbol');
                    if (currentSymbol) {
                        const lastPrice = marketData.getCurrentPrice(currentSymbol);
                        const last10Digits = marketData.getLastNDigits(currentSymbol, 10);
                        const last100Prices = marketData.getLastNPrices(currentSymbol, 100);

                        processedData = {
                            symbol: currentSymbol,
                            lastPrice: lastPrice,
                            timestamp: Date.now(),
                            digits: last10Digits,
                            prices: last100Prices
                        };
                    }
                }
            }


            // Delegar para o footer atual se ele tiver handler próprio
            if (typeof this.currentFooter.handleMarketDataUpdate === 'function') {
                this.currentFooter.handleMarketDataUpdate(processedData);
            }
        };

        // Adicionar propriedade identificadora para debug
        this.marketDataListener._footerListenerId = listenerId;

        // Registrar listener global
        window.addEventListener('marketDataUpdate', this.marketDataListener);

    }

    // 🤖 Manipular clique no botão IA (chamado pelos event listeners do header)
    static async handleIAButtonClick() {
        const buttonClickId = `IA-BTN-${Date.now()}`;

        try {

            // Executar IA diretamente (verificação de créditos será feita após escolha do usuário)
            if (typeof IASystem !== 'undefined') {
                const iaSystem = new IASystem();
                await iaSystem.generateRuleSuggestions();
            } else {
                console.error(`❌ [${buttonClickId}] IASystem não disponível!`);
                CommonHelpers.showError('❌ Sistema de IA não disponível');
            }
        } catch (error) {
            console.error(`❌ [${buttonClickId}] ERRO NO BOTÃO IA:`, {
                message: error.message,
                stack: error.stack,
                timestamp: new Date().toISOString()
            });
            CommonHelpers.showError('❌ [IA BUTTON] Erro: ' + error.message);
        }
    }

    // 🧹 Limpar rodapé atual
    static clearCurrentFooter() {


        if (this.currentFooter) {
            // 🧹 CRÍTICO: Garantir limpeza completa antes de destruir
            if (typeof this.currentFooter.cleanup === 'function') {
                this.currentFooter.cleanup();

            }
            this.currentFooter.destroy();

            this.currentFooter = null;
        }

        // 🧹 CRÍTICO: Limpar interval de atualização de saldo
        if (this.balanceUpdateInterval) {
            clearInterval(this.balanceUpdateInterval);
            this.balanceUpdateInterval = null;
        }

        // 🧹 CRÍTICO: Remover listener global de ticks do mercado
        if (this.marketDataListener) {
            window.removeEventListener('marketDataUpdate', this.marketDataListener);
            this.marketDataListener = null;

        }

        FooterUtils.clearFooterContent();
        FooterUtils.removeFloatingButtons();
        FooterUtils.cleanupMarketDataListeners(null);

        this.balanceInitialized = false;
        this.appManagerReady = false;
        this.balanceEventListenerAttached = false;
        this.adminLevelListener = null;
        this.balanceUpdateListener = null;


    }

    // 🧹 NOVO: Limpeza forçada completa para reinicialização
    static forceCleanup() {

        // Limpar tudo do clearCurrentFooter
        this.clearCurrentFooter();

        // Resetar flags singleton
        this.isInitializing = false;
        this.isFullyInitialized = false;

        // Limpar listeners globais órfãos
        const events = ['balanceUpdated', 'adminLevelChanged', 'marketDataUpdate', 'AppManagerReady'];
        events.forEach(eventName => {
            const listeners = window.__footerListeners?.[eventName] || [];
            listeners.forEach(listener => {
                try {
                    window.removeEventListener(eventName, listener);
                } catch (e) {
                    // Ignorar erros de limpeza
                }
            });
        });

        // Resetar array de listeners
        window.__footerListeners = {};

        // 🔄 CRÍTICO: Forçar reconexão do marketDataListener após limpeza
        setTimeout(() => {

            this.ensureMarketDataListener();
        }, 100);
    }

    // 🔄 Atualizar rodapé (fluxo único - não precisa verificar nível)
    static updateFooterForLevel() {
        if (!this.isInitializing) {
            this.initializeFooter();
        }
    }

    // 🎧 Inicializar listeners para mudanças de nível do Admin
    static initAdminLevelListeners() {
        // 🧹 CRÍTICO: Remover listeners anteriores antes de adicionar novos
        if (this.adminLevelListener) {
            window.removeEventListener('adminLevelChanged', this.adminLevelListener);
            this.adminLevelListener = null;
        }

        if (this.balanceUpdateListener) {
            window.removeEventListener('balanceUpdated', this.balanceUpdateListener);
            this.balanceUpdateListener = null;
        }

        this.adminLevelListener = async (event) => {
            const { tempLevel, isTemporary } = event.detail;
            await this.updateFooterForLevel(tempLevel);
        };

        window.addEventListener('adminLevelChanged', this.adminLevelListener);

        if (!this.balanceEventListenerAttached) {
            this.balanceEventListenerAttached = true;

            this.balanceUpdateListener = (event) => {
                const { balance, currency, amount, changed } = event.detail;

                if (changed) {
                    // ✅ CRÍTICO: Validar amount antes de atualizar para evitar NaN
                    let safeAmount = amount;
                    if (amount === null || amount === undefined || amount === '' || isNaN(parseFloat(amount))) {
                        safeAmount = balance || '0.00';
                    }

                    const elementsUpdated = FooterUtils.updateBalanceElements(currency, safeAmount);

                    if (elementsUpdated === 0) {
                        setTimeout(() => {
                            this.initializeFooter();
                        }, 1000);
                    }
                }
            };
            window.addEventListener('balanceUpdated', this.balanceUpdateListener);

            if (!window.__footerListeners) {
                window.__footerListeners = {};
            }
            if (!window.__footerListeners.balanceUpdated) {
                window.__footerListeners.balanceUpdated = [];
            }
            window.__footerListeners.balanceUpdated.push(this.balanceUpdateListener);
        }

        this.initVipCountdownUpdater();
        this.initBalanceAutoUpdate();

        // 💰 NOVO: Inicializar subscrição de balance em tempo real
        this.initializeBalanceSubscription();
    }

    static initBalanceAutoUpdate() {
        // 🚨 SINGLETON: Prevenir múltiplas inicializações
        if (this.balanceInitialized) {
            return;
        }

        // Prevenir múltiplas inicializações - limpar recursos anteriores
        if (this.balanceUpdateInterval) {
            clearInterval(this.balanceUpdateInterval);
            this.balanceUpdateInterval = null;
        }

        // 🔍 DEBUG: Estado atual do sistema
        const currentUser = SessionManager.getCurrentUser();
        const token = SessionManager.getLocalToken();
        const appManagerReady = !!(window.AppManager?.apiInstance);

        if (this.balanceInitialized && this.appManagerReady) {
            return;
        }

        this.balanceInitialized = true;
        this.tickCount = 0;
        this.lastBalanceUpdate = 0;
        this.appManagerReady = false;

        this.waitForAppManagerInitialization();

        // ✅ MIGRAÇÃO: Criar método handleMarketDataUpdate() para VipFooter
        this.handleMarketDataUpdate = (data) => {
            if (!this.appManagerReady) {
                return;
            }

            this.tickCount++;
            const now = Date.now();
            const timeSinceLastUpdate = now - this.lastBalanceUpdate;

            const isMonitoringActive = FooterManager.isMonitoringActive();
            const isCooldownActive = FooterManager.isCooldownActive();

            // ✅ PROCESSAR DÍGITOS se fornecidos
            if (data.digits && data.digits.length > 0) {
                const recentDigits = data.digits.slice(-10);
                this.updateVipDigits(recentDigits);
                this.analyticsData.last25Digits = data.digits.slice(-25);
                this.updateDigitAnalytics();
            }

            // ⚠️ DEPRECADO: Não atualizar saldo aqui - agora usa balance subscription
            // A atualização de saldo é feita via WebSocket stream em tempo real
        };

        // Balance subscription é o método principal agora
        this.balanceUpdateInterval = setInterval(async () => {
            if (!this.appManagerReady) {
                return;
            }

            const now = Date.now();
            const timeSinceLastUpdate = now - this.lastBalanceUpdate;

            // Só atualizar se não houve atualização nos últimos 30 segundos (fallback)
            if (timeSinceLastUpdate >= 30000) {

                await this.updateAccountBalance();
            }
        }, 30000); // Aumentado para 30s pois balance subscription é o método principal
    }

    // 💰 NOVO: Inicializar subscrição de balance em tempo real
    static async initializeBalanceSubscription() {
        try {

            // Aguardar MarketData estar pronto
            const token = SessionManager.getLocalToken();
            if (!token) {

                return;
            }

            const marketData = getMarketDataInstance(token);

            if (!marketData) {

                return;
            }

            // Aguardar conexão estar pronta
            let retries = 0;
            while (!marketData.isReady() && retries < 10) {
                // ✅ HEARTBEAT: Notificar progresso para evitar reset do watchdog
                if (typeof LoadingManager !== 'undefined') {
                    LoadingManager.updateProgress(LoadingManager.currentProgress, "Sincronizando saldo...");
                }
                await new Promise(resolve => setTimeout(resolve, 500));
                retries++;
            }

            if (!marketData.isReady()) {

                return;
            }

            // Subscrever ao balance
            this.balanceUnsubscribe = await marketData.subscribeToBalance((balanceData) => {

                // Atualizar display do rodapé
                this.updateBalanceDisplay(balanceData);

                // Atualizar timestamp da última atualização
                this.lastBalanceUpdate = Date.now();
            });

        } catch (error) {
            console.error('❌ [FOOTER] Erro ao iniciar subscrição de balance:', error);

        }
    }

    // 💰 NOVO: Atualizar apenas o display do saldo (sem fazer requisição)
    static updateBalanceDisplay(balanceData) {
        // ✅ CRÍTICO: Ignorar updates durante troca de conta
        if (window.accountSwitchInProgress) {

            return;
        }

        // ✅ CRÍTICO: Validar balanceData antes de atualizar
        if (!balanceData || balanceData.balance === null || balanceData.balance === undefined) {
            console.warn('⚠️ [BALANCE DISPLAY] Dados de saldo inválidos recebidos:', balanceData);
            return;
        }

        // Usar FooterUtils para garantir atualização consistente e botão de refresh
        FooterUtils.updateBalanceElements(balanceData.currency, balanceData.balance);

        // Atualizar SessionManager
        const currentUser = SessionManager.getCurrentUser();
        if (currentUser && currentUser.balance) {
            currentUser.balance.balance = balanceData.balance;
            currentUser.balance.currency = balanceData.currency;

            // Salvar no localStorage
            const sessionId = SessionManager.getUserSessionId();
            try {
                localStorage.setItem(`user_data_${sessionId}`, JSON.stringify(currentUser));
            } catch (error) {

            }
        }

    }

    static onMonitoringStarted() {
        this.monitoringActive = true;

        // Forçar uma atualização imediata do saldo
        setTimeout(() => {
            this.updateAccountBalance();
        }, 1000);
    }

    static onMonitoringStopped() {
        this.monitoringActive = false;
    }

    static isMonitoringActive() {
        try {
            // Primeiro verificar flag interna
            if (this.monitoringActive === true) {
                return true;
            }

            // Verificar se MonitoringView existe e está ativo
            if (typeof MonitoringView !== 'undefined' && MonitoringView.state === 'MONITORING') {
                return true;
            }

            // Verificar se TradeManager existe e está ativo
            if (window.tradeManager && typeof window.tradeManager.isTradeActive === 'function') {
                return window.tradeManager.isTradeActive();
            }

            // Verificar se botão de parar está habilitado
            const stopBtn = document.getElementById('stop-monitoring-btn');
            if (stopBtn && !stopBtn.disabled) {
                return true;
            }

            return false;
        } catch (error) {
            return false;
        }
    }

    static isCooldownActive() {
        try {
            // Verificar se o cooldown está ativo
            const cooldownIndicator = document.querySelector('.cooldown-active');
            if (cooldownIndicator && window.getComputedStyle(cooldownIndicator).display !== 'none') {
                return true;
            }

            if (typeof checkCooldownStatus === 'function' && checkCooldownStatus()) {
                return true;
            }

            const cooldownTimer = document.querySelector('.cooldown-timer');
            if (cooldownTimer && window.getComputedStyle(cooldownTimer).display !== 'none' && cooldownTimer.textContent.includes(':')) {
                return true;
            }

            return false;
        } catch (error) {
            return false;
        }
    }

    static waitForAppManagerInitialization() {
        if (window.AppManager && window.AppManager.apiInstance) {
            this.onAppManagerReady();
            return;
        }

        const handleAppManagerReady = (event) => {
            window.removeEventListener('AppManagerReady', handleAppManagerReady);
            this.onAppManagerReady();
        };

        window.addEventListener('AppManagerReady', handleAppManagerReady);

        setTimeout(() => {
            if (!this.appManagerReady) {
                // ⚠️ CRÍTICO: Não remover o listener! A internet pode estar lenta.
                // window.removeEventListener('AppManagerReady', handleAppManagerReady);

                if (window.AppManager && window.AppManager.apiInstance) {
                    this.onAppManagerReady();
                } else {
                    console.warn('⚠️ [BALANCE INIT] AppManager demorando para responder (>30s) - Aguardando conexão...');
                    // Não marcar como falha definitiva, apenas avisar
                    // this.balanceInitialized = false; 
                }
            }
        }, 30000);
    }

    static onAppManagerReady() {
        this.appManagerReady = true;

        setTimeout(() => {
            this.updateAccountBalance();
        }, 2000);
    }

    static async updateAccountBalance() {
        try {
            const currentUser = SessionManager.getCurrentUser();
            const token = SessionManager.getLocalToken();

            if (!currentUser || !token) {
                return;
            }

            let apiInstance = window.AppManager?.apiInstance;

            if (!apiInstance) {
                if (window.AppManager && !window.AppManager.apiInstance) {
                    this.appManagerReady = false;
                }

                if (!this.lastApiWarning || Date.now() - this.lastApiWarning > 30000) {
                    this.lastApiWarning = Date.now();
                }
                return;
            }

            let currentFooterBalance = null;
            const currentFooterType = this.currentFooter?.constructor?.name;

            // Buscar no elemento VIP (todos agora usam VIP)
            const vipBalanceElement = document.querySelector('.vip-balance strong');
            if (vipBalanceElement) {
                currentFooterBalance = vipBalanceElement.textContent.trim();
            }

            if (!this.lastKnownBalance) {
                this.lastKnownBalance = currentFooterBalance;
            }

            const startTime = Date.now();
            const freshUserData = await apiInstance.getUserAccountData(token, { silent: true });

            if (freshUserData && freshUserData.authorize && freshUserData.balance) {
                const newBalance = freshUserData.balance.balance;
                const currency = freshUserData.balance.currency;
                const formattedNewBalance = (isNaN(parseFloat(newBalance)) ? 0 : parseFloat(newBalance)).toFixed(2);

                const derivBalance = `${currency} ${formattedNewBalance}`;
                const hasDiscrepancy = derivBalance !== currentFooterBalance;

                if (hasDiscrepancy) {
                    // Evita salvamento completo desnecessário a cada tick
                    const updatedUserData = {
                        ...currentUser,
                        balance: freshUserData.balance,
                        authorize: {
                            ...currentUser.authorize,
                        }
                    };

                    // 🔧 SUBSTITUIR dados existentes sem criar nova sessão
                    const sessionId = SessionManager.getUserSessionId();
                    try {
                        localStorage.setItem(`user_data_${sessionId}`, JSON.stringify(updatedUserData));
                    } catch (error) {
                        if (error.name === "QuotaExceededError") {
                            SessionManager.smartCleanupForQuota(currentUser.loginid);
                            localStorage.setItem(`user_data_${sessionId}`, JSON.stringify(updatedUserData));
                        }
                    }

                    const eventDetail = {
                        balance: newBalance,
                        currency: currency,
                        amount: formattedNewBalance,
                        changed: true,
                        tickCount: this.tickCount || 0,
                        hasDiscrepancy: true,
                        footerBalance: currentFooterBalance,
                        derivBalance: derivBalance
                    };

                    window.dispatchEvent(new CustomEvent('balanceUpdated', {
                        detail: eventDetail
                    }));

                    setTimeout(() => {
                        let updatedFooterBalance = null;
                        const vipBalanceElement = document.querySelector('.vip-balance strong');
                        if (vipBalanceElement) {
                            updatedFooterBalance = vipBalanceElement.textContent.trim();
                        }

                        if (updatedFooterBalance === derivBalance) {
                            this.lastKnownBalance = derivBalance;
                        } else {
                            const retrySelectors = ['.vip-balance strong'];
                            let retrySuccess = false;

                            retrySelectors.forEach(selector => {
                                const elements = document.querySelectorAll(selector);
                                elements.forEach(element => {
                                    if (element.textContent.trim() !== derivBalance) {
                                        element.textContent = derivBalance;
                                        retrySuccess = true;
                                    }
                                });
                            });
                        }
                    }, 200);

                } else {
                    const updatedUserData = {
                        ...currentUser,
                        authorize: freshUserData.authorize,
                        balance: freshUserData.balance,
                        settings: freshUserData.settings || currentUser.settings,
                        status: freshUserData.status || currentUser.status
                    };

                    SessionManager.saveUserData(updatedUserData);
                }
            }

        } catch (error) {
            if (!this.lastErrorWarning || Date.now() - this.lastErrorWarning > 60000) {
                this.lastErrorWarning = Date.now();
            }

            if (error.message.includes('WebSocket') && !this.retryScheduled) {
                this.retryScheduled = true;
                setTimeout(() => {
                    this.retryScheduled = false;
                    this.updateAccountBalance();
                }, 10000);
            }
        }
    }

    // 🔄 Inicializar atualizador dos créditos VIP
    static initVipCountdownUpdater() {
        // Atualizar créditos a cada 10 segundos
        setInterval(() => {
            if (this.currentFooter instanceof VipFooter) {
                const creditsElement = document.getElementById('vip-credits-display');
                if (creditsElement && this.currentFooter.getVipCreditsDisplay) {
                    creditsElement.innerHTML = this.currentFooter.getVipCreditsDisplay();
                }
            }
        }, 10000);

        // Listener para atualização imediata quando créditos são alterados
        window.addEventListener('creditsUpdated', () => {
            if (this.currentFooter instanceof VipFooter) {
                const creditsElement = document.getElementById('vip-credits-display');
                if (creditsElement && this.currentFooter.getVipCreditsDisplay) {
                    creditsElement.innerHTML = this.currentFooter.getVipCreditsDisplay();
                }
            }
        });
    }

    // 📊 Obter instância do rodapé atual
    static getCurrentFooter() {
        return this.currentFooter;
    }

    // 🚀 Inicialização do sistema
    static init() {
        if (this.isInitialized) {
            return;
        }

        this.isInitialized = true;

        // Listener para atualizações de créditos
        window.addEventListener('creditsUpdated', (event) => {
            const credits = event.detail.credits;
            const creditDisplays = document.querySelectorAll('.credits-display');
            creditDisplays.forEach(el => {
                if (el) {
                    el.textContent = credits;
                }
            });
        });

        // Listener para atualizações da exibição
        window.addEventListener('creditsDisplayUpdated', (event) => {
            const credits = event.detail.credits;
            const creditDisplays = document.querySelectorAll('.credits-display');
            creditDisplays.forEach(el => {
                if (el) {
                    el.textContent = credits;
                }
            });
        });

        // Carregar script da IA se necessário
        if (!document.querySelector('script[src="js/IA.js"]')) {
            const iaScript = document.createElement('script');
            iaScript.src = 'js/IA.js';
            iaScript.async = true;
            document.head.appendChild(iaScript);
        }

        // Carregar script da IA Fallback
        if (!document.querySelector('script[src="js/iaFallback.js"]')) {
            const iaFallbackScript = document.createElement('script');
            iaFallbackScript.src = 'js/iaFallback.js';
            iaFallbackScript.async = true;
            document.head.appendChild(iaFallbackScript);
        }
    }

    // 💰 NOVO: Atualizar APENAS dados da conta (sem tocar em dados de ativo)
    static updateAccountDataOnly(accountData) {

        // Update balance display
        if (accountData && accountData.balance) {
            FooterUtils.updateBalanceElements(
                accountData.balance.currency,
                accountData.balance.balance
            );
        }

        // Update account dropdown
        if (accountData && accountData.loginid) {
            this.forceUpdateDropdown(accountData.loginid);
        }


    }

    // 🔄 Forçar atualização do dropdown com loginId específico (usado durante troca de conta)
    static forceUpdateDropdown(loginId) {

        // Atualizar texto do botão dropdown (buscar em ambos os locais possíveis)
        // Primeiro tentar VipFooter (com emoji 💎)
        let dropdownBtn = document.querySelector('.vip-center-section .account-dropdown-btn span:first-child');

        // Se não encontrou, tentar footer legacy
        if (!dropdownBtn) {
            dropdownBtn = document.querySelector('.account-dropdown-btn span:first-child');
        }

        // Se ainda não encontrou, tentar buscar apenas o botão
        if (!dropdownBtn) {
            const button = document.querySelector('.account-dropdown-btn');
            if (button) {
                // Atualizar todo o conteúdo do botão se não conseguir encontrar o span específico
                button.innerHTML = `<span>💎 ${loginId}</span><span class="dropdown-arrow">▲</span>`;

            } else {

                // ✅ OTIMIZADO: Durante troca de conta, aguardar em vez de recriar
                if (window.accountSwitchInProgress) {

                    setTimeout(() => {
                        this.forceUpdateDropdown(loginId);
                    }, 500);
                    return;
                } else {
                    // Só recriar se não for durante troca de conta
                    setTimeout(() => {
                        this.initializeFooter();
                    }, 1000);
                    return;
                }
            }
        } else {
            const oldValue = dropdownBtn.textContent;
            dropdownBtn.textContent = `💎 ${loginId}`;

        }

        // Atualizar seleção visual na lista de contas
        const accountItems = document.querySelectorAll('.account-item');
        accountItems.forEach(item => {
            const itemLoginId = item.dataset.loginid;
            if (itemLoginId === loginId) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });

        // Atualizar saldo também
        this.updateAccountBalance();
    }

    // 🔄 Atualizar display do dropdown de conta (método público chamado por AccountManager)
    static updateAccountDropdownDisplay() {
        const currentUser = SessionManager.getCurrentUser();
        if (!currentUser || !currentUser.authorize) {

            return;
        }

        const currentLoginId = currentUser.authorize.loginid;
        this.forceUpdateDropdown(currentLoginId);
    }

    // 🔄 Listener para quando a conta é trocada
    static onAccountSwitched(event) {

        // Atualizar dropdown quando o evento é disparado
        this.updateAccountDropdownDisplay();

        // ✅ FORÇAR reconexão dos dados de mercado após troca de conta
        // Aumentado delay para garantir que o novo token esteja pronto
        setTimeout(() => {

            // 1. Garantir que temos um token válido antes de reconectar
            const token = SessionManager.getLocalToken();
            if (token) {
                this.forceMarketDataReconnection();
            } else {

                setTimeout(() => this.forceMarketDataReconnection(), 1000);
            }
        }, 1500);
    }

    // 🔄 NOVO: Forçar reconexão dos dados de mercado
    static forceMarketDataReconnection() {

        if (!this.currentFooter || !this.currentFooter.setupDataSync) {

            return;
        }

        try {
            // Reconectar o footer com novos dados
            this.currentFooter.setupDataSync();

            // Forçar carregamento de dados históricos para analytics
            if (this.currentFooter.loadHistoricalDataForAnalytics) {
                this.currentFooter.loadHistoricalDataForAnalytics();
            }

        } catch (error) {
            console.error(`❌ [FOOTER] Erro na reconexão dos dados:`, error);
        }
    }
}

// 🏗️ CLASSE BASE PARA TODOS OS RODAPÉS (Template Method Pattern)
class BaseFooter {
    constructor(containerId) {
        this.containerId = containerId;
        this.displayInstances = {};
    }

    async render() {
        const bottomBar = FooterUtils.getBottomBarElement();
        if (!bottomBar) return;

        bottomBar.innerHTML = await this.getTemplate();
        await this.initializeComponents();
    }

    async getTemplate() {
        throw new Error('Subclasse deve implementar getTemplate()');
    }

    async initializeComponents() {
        throw new Error('Subclasse deve implementar initializeComponents()');
    }

    cleanup() {
        // Implementação base vazia
    }

    destroy() {
        const container = document.getElementById(this.containerId);
        if (container) {
            container.remove();
        }
    }
}

// 💎 CLASSE PARA RODAPÉ VIP - AGORA USADO POR TODOS OS USUÁRIOS
class VipFooter extends BaseFooter {
    constructor() {
        super('vip-footer-container');
        this.analyticsData = this.getDefaultAnalyticsData();
        this.lastSequenceValues = { maxUp: 0, maxDown: 0 };
        this.syncInterval = null;
        this.marketDataListener = null;
        this.tickCount = 0;
        this.dataReady = false;
        this.lastReloadAttempt = 0;
        this.balanceInitialized = false;
    }

    getDefaultAnalyticsData() {
        return {
            last25Digits: [],
            last100Digits: [],
            last100Prices: [],
            last5Prices: [],
            digitCounts: {},
            patterns: {},
            hotColdAnalysis: {},
            lastUpdate: null
        };
    }

    clearAnalyticsData() {
        const sessionId = SessionManager.getUserSessionId();
        localStorage.removeItem(`vip_analytics_${sessionId}`);
        this.analyticsData = this.getDefaultAnalyticsData();
    }

    saveAnalyticsData() {
        try {
            const currentUser = SessionManager.getCurrentUser();
            if (!currentUser) return;

            const sessionId = SessionManager.getUserSessionId();
            const dataToSave = {
                ...this.analyticsData,
                _userId: currentUser.loginid,
                lastUpdate: Date.now()
            };

            localStorage.setItem(`vip_analytics_${sessionId}`, JSON.stringify(dataToSave));
        } catch (error) {
            console.error('❌ Erro ao salvar dados de analytics:', error);
        }
    }



    async render() {
        this.addVipStyles();

        const bottomBar = FooterUtils.getBottomBarElement();
        if (bottomBar) {
            bottomBar.style.overflow = 'visible';
            bottomBar.style.overflowY = 'visible';
        }

        await super.render();
    }

    async getTemplate() {
        return `
            <div id="${this.containerId}" class="vip-footer-content" style="overflow: visible !important; position: relative !important; z-index: 1000000 !important;">
                <div class="vip-footer-grid" style="overflow: visible !important;">
                    <!-- Seção de Dígitos VIP -->
                    <div class="vip-digits-section">
                        <div class="vip-digits-display" id="vip-digits-display"></div>
                        <div id="vip-digits-display-container" style="display: none;"></div>
                        <div class="vip-digits-analytics">
                            <div class="analytics-row">
                                <div class="analytics-item">
                                    <span class="analytics-label">Mais/Menos Frequente (25)</span>
                                    <div class="analytics-values">
                                        <span id="digit-max-25" class="value-max">-</span> / <span id="digit-min-25" class="value-min">-</span>
                                    </div>
                                </div>
                            </div>
                            <div class="analytics-row">
                                <div class="analytics-item">
                                    <span class="analytics-label">Par/Ímpar (25)</span>
                                    <div class="analytics-values">
                                        <span id="digit-even-25" class="value-even">-%</span>
                                        <span id="digit-odd-25" class="value-odd">-%</span>
                                    </div>
                                </div>
                            </div>
                            <div class="analytics-row">
                                <div class="analytics-item">
                                    <span class="analytics-label">Padrão Frequente (100)</span>
                                    <div class="analytics-pattern" id="digit-pattern-100">---</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Seção Central VIP -->
                    <div class="vip-center-section">
                        <!-- 🎯 Container para os botões de monitoramento (preenchido via JavaScript) -->
                        <div class="vip-monitoring-controls" id="footer-monitoring-controls">
                            <!-- Os 4 elementos serão movidos aqui: botão ON, checkbox, P&L (com saldo integrado), botão OFF -->
                        </div>
                    </div>

                    <!-- Seção de Preços VIP -->
                    <div class="vip-prices-section">
                        <div class="vip-prices-display" id="vip-prices-display"></div>
                        <div id="vip-prices-display-container" style="display: none;"></div>
                        <div class="vip-prices-analytics">
                            <div class="analytics-row">
                                <div class="analytics-item">
                                    <span class="analytics-label">Acima/Abaixo (100)</span>
                                    <div class="analytics-values">
                                        <span id="price-up-100" class="value-up">-%</span>
                                        <span id="price-down-100" class="value-down">-%</span>
                                    </div>
                                </div>
                            </div>
                            <div class="analytics-row">
                                <div class="analytics-item">
                                    <span class="analytics-label">Maior Volume (100)</span>
                                    <div class="analytics-volume" id="price-volume-100">-.---</div>
                                </div>
                            </div>
                            <div class="analytics-row">
                                <div class="analytics-item">
                                    <span class="analytics-label">Sequência Máx.</span>
                                    <div class="analytics-values">
                                        <span id="price-seq-up" class="value-up" data-component="sequence-up">-</span>
                                        <span id="price-seq-down" class="value-down" data-component="sequence-down">-</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    async initializeComponents() {
        await this.initializeVipComponents();
    }

    addVipStyles() {
        if (document.getElementById('vip-footer-styles')) return;

        const style = document.createElement('style');
        style.id = 'vip-footer-styles';
        style.textContent = `
            /* Estilos do rodapé VIP - agora usado por todos */
            .vip-footer-content {
                background: #0c1318;
                border-radius: 0;
                padding: 20px;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
                border: 2px solid rgba(255, 255, 255, 0.1);
                backdrop-filter: blur(10px);
                width: 100vw;
                margin-left: calc(-50vw + 50%);
                position: relative;
                left: 50%;
                transform: translateX(-50%);
            }

            .vip-footer-grid {
                display: grid;
                grid-template-columns: 1fr auto 1fr;
                gap: 40px;
                align-items: flex-start;
                min-height: 100px;
                max-width: 1400px;
                margin: 0 auto;
                width: 100%;
                padding-top: 0;
            }

            .vip-digits-section, .vip-prices-section {
                display: flex;
                flex-direction: column;
                gap: 8px;
                margin-top: 0;
                padding-top: 0;
            }

            .vip-digits-display, .vip-prices-display {
                background: rgba(255, 255, 255, 0.1);
                border-radius: 12px;
                padding: 12px;
                display: flex;
                justify-content: center;
                gap: 4px;
                flex-wrap: nowrap;
            }

            .vip-digit-item {
                width: 32px;
                height: 32px;
                background: rgba(255, 255, 255, 0.9);
                border-radius: 6px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 0.95em;
                font-weight: bold;
                font-family: 'Courier New', monospace;
                color: #333;
                transition: all 0.3s ease;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
            }

            .vip-digit-item.digit-odd {
                background: linear-gradient(135deg, #ff6b6b, #ee5a24);
                color: white;
            }

            .vip-digit-item.digit-even {
                background: linear-gradient(135deg, #4ecdc4, #44bd87);
                color: white;
            }

            .vip-price-item {
                background: rgba(255, 255, 255, 0.9);
                border-radius: 6px;
                padding: 4px 10px;
                font-size: 0.9em;
                font-weight: bold;
                font-family: 'Courier New', monospace;
                color: #333;
                min-width: 65px;
                max-width: 65px;
                height: 26px;
                display: flex;
                align-items: center;
                justify-content: center;
                text-align: center;
                transition: all 0.3s ease;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
            }

            .vip-price-item.price-up {
                background: linear-gradient(135deg, #4ecdc4, #44bd87);
                color: white;
            }

            .vip-price-item.price-down {
                background: linear-gradient(135deg, #ff6b6b, #ee5a24);
                color: white;
            }

            .vip-digits-analytics, .vip-prices-analytics {
                background: rgba(255, 255, 255, 0.05);
                border-radius: 8px;
                padding: 8px 8px 15px 8px;
                display: flex;
                flex-direction: row;
                gap: 12px;
                justify-content: center;
                align-items: center;
                flex-wrap: wrap;
                margin-bottom: 5px;
            }

            .analytics-row {
                display: flex;
                justify-content: center;
                margin-bottom: 0;
                min-width: 0;
                flex: 0 0 auto;
            }

            .analytics-row:last-child {
                margin-bottom: 0;
            }

            .analytics-item {
                text-align: center;
            }

            .analytics-label {
                display: block;
                font-size: 0.7em;
                color: rgba(255, 255, 255, 0.8);
                margin-bottom: 2px;
                font-weight: 600;
            }

            .analytics-values {
                display: flex;
                gap: 8px;
                justify-content: center;
            }

            .analytics-values span, .analytics-volume, .analytics-pattern {
                background: rgba(255, 255, 255, 0.1);
                padding: 2px 6px;
                border-radius: 4px;
                font-size: 0.8em;
                font-weight: bold;
                color: white;
                min-width: 30px;
                text-align: center;
                border: 1px solid rgba(255, 255, 255, 0.2);
            }

            .value-max, .value-up {
                background: linear-gradient(135deg, #4ecdc4, #44bd87);
            }

            .value-min, .value-down {
                background: linear-gradient(135deg, #ff6b6b, #ee5a24);
            }

            .value-even {
                background: linear-gradient(135deg, #74b9ff, #0984e3);
            }

            .value-odd {
                background: linear-gradient(135deg, #fd79a8, #e84393);
            }

            .vip-center-section {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 12px;
                min-width: 200px;
                margin-top: 0;
                padding-top: 0;
                overflow: visible !important;
                position: relative !important;
                z-index: 10 !important;
            }

            /* 🎯 Container dos controles de monitoramento no rodapé - SEM bloco visual */
            .vip-monitoring-controls {
                display: flex !important;
                flex-direction: row !important;
                align-items: center !important;
                justify-content: center !important;
                gap: 15px !important;
                padding: 0 !important;
                background: transparent !important;
                border: none !important;
                width: auto !important;
            }

            /* Ajustar botões quando movidos para o footer - mantém as imagens de fundo */
            .vip-monitoring-controls .market-btn {
                width: 120px !important;
                height: 75px !important;
                font-size: 1em !important;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2) !important;
                transition: all 0.3s ease !important;
            }

            /* NÃO sobrescrever background dos botões - mantém imagens originais */

            /* Checkbox entrada imediata no footer */
            .vip-monitoring-controls .immediate-execution-container {
                margin: 0 !important;
                padding: 0 !important;
            }

            .vip-monitoring-controls .immediate-execution-checkbox {
                transform: scale(1.2) !important;
            }

            /* Visor P&L no footer - container flex vertical para P&L + saldo */
            .vip-monitoring-controls .profit-loss-display-inline {
                background: transparent !important;
                padding: 0 !important;
                border: none !important;
                min-width: auto !important;
                display: flex !important;
                flex-direction: column !important;
                align-items: center !important;
                gap: 4px !important;
                justify-content: center !important;
            }

            .vip-monitoring-controls .profit-loss-value {
                font-size: 1.2em !important;
                font-weight: bold !important;
                color: white !important;
                text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3) !important;
            }

            /* Botão reset mantém estilo original */
            .vip-monitoring-controls .reset-profit-loss-btn {
                /* Mantém estilos originais do botão */
            }

            /* Saldo Deriv abaixo do visor P&L */
            .vip-monitoring-controls .deriv-balance-inline {
                font-size: 0.9em !important;
                color: white !important;
                font-weight: bold !important;
                width: 100% !important;
                text-align: center !important;
                text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3) !important;
                margin-top: 2px !important;
            }

            .vip-balance {
                background: rgba(255, 255, 255, 0.15);
                color: white;
                padding: 10px 20px;
                border-radius: 10px;
                font-size: 1.2em;
                font-weight: bold;
                box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
                border: 2px solid rgba(255, 255, 255, 0.3);
                backdrop-filter: blur(5px);
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                min-height: 60px;
            }





            /* Responsividade */
            @media (max-width: 768px) {
                .vip-footer-content {
                    padding: 15px 10px;
                }

                .vip-footer-grid {
                    grid-template-columns: 1fr;
                    gap: 15px;
                    max-width: 100%;
                    padding: 0 10px;
                }

                .vip-digit-item {
                    width: 24px;
                    height: 24px;
                    font-size: 0.8em;
                }

                .vip-price-item {
                    padding: 6px 8px;
                    font-size: 0.8em;
                    min-width: 60px;
                }

                .vip-digits-analytics, .vip-prices-analytics {
                    flex-direction: column;
                    gap: 6px;
                }

                .analytics-row {
                    margin-bottom: 6px;
                }

                .analytics-row:last-child {
                    margin-bottom: 0;
                }

                /* Ajustar controles de monitoramento em mobile */
                .vip-monitoring-controls {
                    flex-wrap: wrap !important;
                    gap: 10px !important;
                    justify-content: center !important;
                }

                .vip-monitoring-controls .market-btn {
                    width: 80px !important;
                    height: 55px !important;
                    font-size: 0.85em !important;
                }

                .vip-monitoring-controls .profit-loss-display-inline {
                    min-width: 120px !important;
                }

                .vip-monitoring-controls .profit-loss-value {
                    font-size: 1em !important;
                }

                .vip-monitoring-controls .deriv-balance-inline {
                    font-size: 0.8em !important;
                }
            }

            @media (max-width: 480px) {
                .vip-monitoring-controls {
                    flex-direction: column !important;
                    gap: 8px !important;
                }

                .vip-monitoring-controls .market-btn {
                    width: 100% !important;
                    max-width: 200px !important;
                    height: 50px !important;
                    font-size: 0.9em !important;
                }

                .vip-monitoring-controls .profit-loss-display-inline {
                    width: 100% !important;
                    max-width: 200px !important;
                }

                .vip-monitoring-controls .immediate-execution-container {
                    width: 100% !important;
                    max-width: 200px !important;
                    text-align: center !important;
                }
            }

            @media (min-width: 1200px) {
                .vip-footer-grid {
                    gap: 50px;
                    max-width: 1600px;
                }
            }
        `;

        document.head.appendChild(style);
    }

    async getVipAccountSelector() {
        const currentUser = SessionManager.getCurrentUser();
        const accountList = currentUser?.authorize?.account_list || [];
        const currentLoginId = currentUser?.authorize?.loginid;

        return `
            <div class="dropdown-wrapper">
                <button class="account-dropdown-btn">
                    <span>💎 ${currentLoginId || 'N/A'}</span>
                    <span class="dropdown-arrow">▲</span>
                </button>
                <div class="account-dropdown-content">
                    ${accountList.length > 1 ? accountList.map(account => {
            const hasToken = SessionManager.getTokenByLoginId(account.loginid);
            const statusIcon = hasToken ? '🟢' : '🟡';
            return `
                            <a href="#" class="account-item" data-loginid="${account.loginid}">
                                ${statusIcon} ${account.loginid} - ${account.currency}
                            </a>
                        `;
        }).join('') + '<div class="dropdown-separator"></div>' : ''}
                    <a href="#" class="account-item logout-item" onclick="ModalLogout.show()">
                        🚪 Sair
                    </a>
                </div>
            </div>
        `;
    }

    async getBalanceDisplay() {
        const currentUser = SessionManager.getCurrentUser();
        const balance = currentUser?.balance || {};

        if (!balance.balance && !FooterManager.balanceInitialized) {
            FooterManager.balanceInitialized = true;
            setTimeout(() => FooterManager.updateAccountBalance(), 1000);
        }

        const currency = balance?.currency || '';
        // ✅ CRÍTICO: Validar rawAmount para evitar NaN
        const rawAmount = balance?.balance;
        let amount;
        if (rawAmount === null || rawAmount === undefined || rawAmount === '') {
            amount = '0.00';
        } else if (typeof rawAmount === 'number') {
            amount = rawAmount.toFixed(2);
        } else {
            const numericAmount = parseFloat(rawAmount);
            amount = isNaN(numericAmount) ? '0.00' : numericAmount.toFixed(2);
        }

        return `${currency} ${amount}`;
    }

    async initializeVipComponents() {
        // 🎯 Inicializar displays específicos do VIP
        this.initializeVipDigitsDisplay();
        this.initializeVipPricesDisplay();

        this.validateSequenceElements();

        // 🔗 Setup event listeners
        this.setupVipEventListeners();

        // 🚀 Renderizar displays usando DisplayView existente
        DisplayView.render('vip-digits-display-container', true, 'digits');
        DisplayView.render('vip-prices-display-container', true, 'price');

        await this.loadHistoricalDataForAnalytics();

        // 📊 Configurar sincronização
        this.setupDataSync();

        this.initializeAnalytics();

        // 🎯 Mover controles de monitoramento para o rodapé
        this.moveMonitoringControlsToFooter();

        this.waitForDisplayViewAndPopulateAnalytics();
    }

    initializeVipDigitsDisplay() {
        const container = document.getElementById('vip-digits-display');
        if (!container) return;

        // Criar 10 elementos para os dígitos
        for (let i = 0; i < 10; i++) {
            const digitElement = document.createElement('div');
            digitElement.className = 'vip-digit-item';
            digitElement.textContent = '-';
            digitElement.id = `vip-digit-${i}`;
            container.appendChild(digitElement);
        }
    }

    initializeVipPricesDisplay() {
        const container = document.getElementById('vip-prices-display');
        if (!container) return;

        // Criar 5 elementos para os preços
        for (let i = 0; i < 5; i++) {
            const priceElement = document.createElement('div');
            priceElement.className = 'vip-price-item';
            priceElement.textContent = '---.---';
            priceElement.id = `vip-price-${i}`;
            container.appendChild(priceElement);
        }
    }

    initializeAnalytics() {
        this.updatePriceAnalytics();
    }

    // 🎯 Mover controles de monitoramento para o rodapé (com retry robusto)
    moveMonitoringControlsToFooter(attempt = 0, maxAttempts = 10) {
        const footerContainer = document.getElementById('footer-monitoring-controls');

        // Verificar se container do footer existe
        if (!footerContainer) {
            if (attempt < maxAttempts) {
                setTimeout(() => this.moveMonitoringControlsToFooter(attempt + 1, maxAttempts), 200);
                return;
            }

            return;
        }

        // Buscar os 5 elementos do monitoring
        const startBtn = document.getElementById('start-monitoring-btn');
        const immediateContainer = document.querySelector('.immediate-execution-container');
        const profitLossDisplay = document.querySelector('.profit-loss-display-inline');
        const vpsToggle = document.getElementById('vps-toggle-container'); // ☁️ NOVO
        const resetBtn = document.getElementById('reset-profit-loss-btn');
        const stopBtn = document.getElementById('stop-monitoring-btn');

        // Verificar se todos os elementos existem
        const allElementsExist = startBtn && immediateContainer && profitLossDisplay && resetBtn && stopBtn;

        if (!allElementsExist) {
            if (attempt < maxAttempts) {
                setTimeout(() => this.moveMonitoringControlsToFooter(attempt + 1, maxAttempts), 200);
                return;
            }

            return;
        }

        // 🎯 IDEMPOTÊNCIA: Verificar se os controles JÁ estão no footer
        const allControlsInFooter =
            footerContainer.contains(startBtn) &&
            footerContainer.contains(immediateContainer) &&
            footerContainer.contains(profitLossDisplay) &&
            footerContainer.contains(resetBtn) &&
            footerContainer.contains(stopBtn);

        if (allControlsInFooter) {
            // Controles já estão no footer, não fazer nada
            return;
        }

        // Mover elementos para o footer (appendChild move automaticamente, não duplica)
        footerContainer.appendChild(startBtn);
        footerContainer.appendChild(immediateContainer);
        footerContainer.appendChild(profitLossDisplay);

        // ☁️ Adicionar Toggle VPS se existir
        if (vpsToggle) {
            // 🎯 FIX UI: Inserir DENTRO do P&L para posicionamento absoluto relativo a ele
            profitLossDisplay.appendChild(vpsToggle);
            profitLossDisplay.style.position = 'relative';
            profitLossDisplay.style.overflow = 'visible';
        }

        // 💰 REMOVIDO: Saldo Deriv agora está no bloco verde acima das configurações
        // this.createDerivBalanceDisplay(footerContainer);

        footerContainer.appendChild(resetBtn);
        footerContainer.appendChild(stopBtn);

        // Adicionar classe para estilização
        footerContainer.classList.add('controls-moved-to-footer');

    }

    // 💰 Integrar saldo Deriv dentro do visor P&L
    // 💰 Criar display de saldo Deriv SEPARADO do P&L (mas visualmente integrado)
    async createDerivBalanceDisplay(footerContainer) {
        if (!footerContainer) return;

        // Encontrar o container do P&L para inserir o saldo DENTRO dele (abaixo do valor)
        const profitLossDisplay = footerContainer.querySelector('.profit-loss-display-inline');
        if (!profitLossDisplay) return;

        // Verificar se já existe
        if (profitLossDisplay.querySelector('.deriv-balance-inline')) {
            return;
        }

        // Criar elemento container do saldo
        const balanceContainer = document.createElement('div');
        balanceContainer.className = 'deriv-balance-inline';
        balanceContainer.style.display = 'flex';
        balanceContainer.style.flexDirection = 'column';
        balanceContainer.style.alignItems = 'center';
        balanceContainer.style.justifyContent = 'center';
        balanceContainer.style.marginTop = '8px'; // Espaço acima
        balanceContainer.style.paddingTop = '4px';
        balanceContainer.style.borderTop = '1px solid rgba(255,255,255,0.15)'; // Separador superior
        balanceContainer.style.width = '100%'; // Ocupar largura total do container pai

        // Criar elemento do valor (span) para não sobrescrever o botão
        const balanceValue = document.createElement('span');
        balanceValue.className = 'balance-value';
        balanceValue.style.fontWeight = 'bold';
        balanceValue.style.color = '#fff';
        balanceValue.style.fontSize = '0.9em'; // Um pouco menor que o P&L
        balanceValue.style.marginBottom = '2px';

        // Buscar saldo atual
        const balanceDisplay = await this.getBalanceDisplay();
        balanceValue.textContent = balanceDisplay;

        // Montar estrutura
        balanceContainer.appendChild(balanceValue);

        // Adicionar botão de refresh IMEDIATAMENTE
        if (typeof FooterUtils !== 'undefined' && typeof FooterUtils.addBalanceRefreshButton === 'function') {
            FooterUtils.addBalanceRefreshButton(balanceValue);
        }

        // 🎯 POSICIONAMENTO: Adicionar DENTRO do container P&L, ao final (abaixo do valor P&L)
        profitLossDisplay.appendChild(balanceContainer);

        // Atualizar saldo periodicamente
        this.startBalanceUpdateInterval();
    }

    // 🔄 Atualizar saldo periodicamente
    startBalanceUpdateInterval() {
        // Limpar intervalo anterior se existir
        if (this.balanceUpdateInterval) {
            clearInterval(this.balanceUpdateInterval);
        }

        // Atualizar a cada 2 segundos
        this.balanceUpdateInterval = setInterval(async () => {
            // 🎯 CRÍTICO: Buscar apenas o SPAN de valor, não o container inteiro
            const balanceValueElement = document.querySelector('.deriv-balance-inline .balance-value');
            if (balanceValueElement) {
                const balanceDisplay = await this.getBalanceDisplay();

                // Verificar se mudou para evitar repintura desnecessária
                if (balanceValueElement.textContent !== balanceDisplay) {
                    balanceValueElement.textContent = balanceDisplay;
                }
            }
        }, 2000);
    }

    setupVipEventListeners() {
        // Nenhum event listener necessário - dropdown removido
    }

    setupDataSync() {
        // 🧹 CRÍTICO: Limpar TODOS os listeners e intervals anteriores
        this.cleanup();

        // Marcar como não destruído (está sendo reinicializado)
        this.isDestroyed = false;

        // 🔄 INICIALIZAÇÃO IMEDIATA DOS DADOS HISTÓRICOS
        this.loadHistoricalDataForAnalytics();

        this.marketDataListener = (data) => {
            if (this.isDestroyed) return;
            if (!data || typeof data !== 'object') return;

            const currentSymbol = this.getCurrentSymbol();
            if (!currentSymbol) return;

            const token = SessionManager.getLocalToken();
            const marketData = getMarketDataInstance(token);
            if (!marketData) return;

            // 🎯 PROCESSAMENTO IMEDIATO POR TICK (Sem Debounce)

            // 1. Atualizar Dígitos (VIP Bar)
            const last10Digits = marketData.getLastNDigits(currentSymbol, 10);
            if (last10Digits.length > 0) {
                this.updateVipDigits(last10Digits);
            }

            // 2. Atualizar Analytics de Dígitos
            const last25Digits = marketData.getLastNDigits(currentSymbol, 25);
            if (last25Digits.length > 0) {
                this.analyticsData.last25Digits = last25Digits;
                this.updateDigitAnalytics();
            }

            // 3. Atualizar Preços e Analytics de Preços
            const last100Prices = marketData.getLastNPrices(currentSymbol, 100);
            if (last100Prices.length > 0) {
                const last5Prices = last100Prices.slice(-5);
                this.updateVipPrices(last5Prices);

                this.analyticsData.last100Prices = last100Prices;
                this.analyticsData.last5Prices = last5Prices;
                this.updatePriceAnalyticsUnified(last100Prices);
            }
        };

        // 🛡️ SECURITY POLL: Loop de segurança para garantir atualização visual
        // Caso o evento do WebSocket falhe ou seja dropado
        if (this.securityPollInterval) clearInterval(this.securityPollInterval);

        this.securityPollInterval = setInterval(() => {
            if (this.isDestroyed) {
                clearInterval(this.securityPollInterval);
                return;
            }

            // 🚀 OTIMIZAÇÃO: Usar requestIdleCallback ou requestAnimationFrame para não travar a UI
            requestAnimationFrame(() => {
                const currentSymbol = this.getCurrentSymbol();
                if (!currentSymbol) return;

                const token = SessionManager.getLocalToken();
                const marketData = getMarketDataInstance(token);
                if (!marketData) return;

                const lastBufferPrice = marketData.getLastPrice(currentSymbol);
                if (!lastBufferPrice) return;

                const firstPriceElement = document.getElementById('vip-price-0');
                if (firstPriceElement) {
                    const displayedPrice = parseFloat(firstPriceElement.textContent);

                    if (lastBufferPrice !== displayedPrice) {
                        const last5Prices = marketData.getLastNPrices(currentSymbol, 5);
                        this.updateVipPrices(last5Prices);

                        const last10Digits = marketData.getLastNDigits(currentSymbol, 10);
                        if (last10Digits.length > 0) {
                            this.updateVipDigits(last10Digits);
                        }

                        // ⏱️ Processamento pesado fatiado
                        setTimeout(() => {
                            const last25Digits = marketData.getLastNDigits(currentSymbol, 25);
                            if (last25Digits.length > 0) {
                                this.analyticsData.last25Digits = last25Digits;
                                this.updateDigitAnalytics();
                            }
                        }, 50);
                    }
                }
            });
        }, 3000); // Aumentado para 3s (é apenas um fallback de segurança)
        // ✅ MIGRAÇÃO: Criar método handleMarketDataUpdate() para ser chamado pelo listener global
        // 🔧 CORREÇÃO: Wrapper para converter dados do formato global para o formato esperado
        this.handleMarketDataUpdate = (data) => {

            // 🔧 CONVERTER dados do formato global para o formato esperado pelo marketDataListener
            const token = SessionManager.getLocalToken();
            const marketData = getMarketDataInstance(token);

            if (!marketData || !data.symbol) {

                return;
            }

            // Buscar arrays de dígitos e preços do buffer central
            const digits = marketData.getLastNDigits(data.symbol, 100) || [];
            const prices = marketData.getLastNPrices(data.symbol, 100) || [];


            // Criar evento com dados no formato esperado
            const fakeEvent = {
                detail: {
                    symbol: data.symbol,
                    lastPrice: data.lastPrice,
                    timestamp: data.timestamp,
                    digits: digits,  // Array de dígitos
                    prices: prices   // Array de preços
                }
            };

            this.marketDataListener(fakeEvent);
        };
    }

    // 🔧 FUNÇÃO AUXILIAR: Extrair último dígito usando método unificado
    extractLastDigitFromPrice(price, symbol = null) {
        // 🚀 OTIMIZAÇÃO: Usar símbolo fornecido ou buscar apenas uma vez fora do loop
        const targetSymbol = symbol || this.cachedSymbol || this.getCurrentSymbol();
        const result = CommonHelpers.extractLastDigitUnified(price, targetSymbol);
        return result !== null ? result : 0;
    }

    // 🧹 REMOVIDO: Debounce removido para processamento em tempo real a cada tick


    // 🧹 CRÍTICO: Método de limpeza completa
    cleanup() {
        // Marcar como destruído para evitar atualizações após cleanup
        this.isDestroyed = true;

        // Limpar intervals e timeouts
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }

        if (this.digitsUpdateTimeout) {
            clearTimeout(this.digitsUpdateTimeout);
            this.digitsUpdateTimeout = null;
        }

        if (this.pricesUpdateTimeout) {
            clearTimeout(this.pricesUpdateTimeout);
            this.pricesUpdateTimeout = null;
        }

        // 💰 Limpar intervalo de atualização do saldo
        if (this.balanceUpdateInterval) {
            clearInterval(this.balanceUpdateInterval);
            this.balanceUpdateInterval = null;
        }

        // 🧹 CRÍTICO: Remover listener de marketDataUpdate se existir
        if (this.marketDataListener) {
            window.removeEventListener('marketDataUpdate', this.marketDataListener);
            this.marketDataListener = null;
        }

        // 🧹 CRÍTICO: Limpar referência do handleMarketDataUpdate
        if (this.handleMarketDataUpdate) {
            this.handleMarketDataUpdate = null;
        }

        // 🧹 CRÍTICO: Limpar arrays de dados para evitar duplicação residual
        if (this.analyticsData) {
            this.analyticsData.last25Digits = [];
            this.analyticsData.last100Digits = [];
            this.analyticsData.last100Prices = [];
            this.analyticsData.last5Prices = [];
        }


    }

    // 🔄 CORRIGIDO: Buscar dados do MarketData
    async loadHistoricalDataForAnalytics() {
        try {
            const currentSymbol = this.getCurrentSymbol();
            if (!currentSymbol) {

                this.analyticsData = this.getDefaultAnalyticsData();
                return;
            }

            const marketData = getMarketDataInstance(SessionManager.getLocalToken());
            if (!marketData) {

                this.analyticsData = this.getDefaultAnalyticsData();
                return;
            }

            const bufferData = marketData.getPriceBuffer(currentSymbol, 100);

            if (bufferData.prices && bufferData.prices.length > 0) {
                // 🚀 OTIMIZAÇÃO: Buscar símbolo uma vez fora do loop
                const currentSymbolStr = currentSymbol.toString();
                this.cachedSymbol = currentSymbolStr;

                const digits = bufferData.prices.map(price => {
                    if (marketData.extractLastDigitForAsset) {
                        return marketData.extractLastDigitForAsset(price, currentSymbolStr);
                    } else {
                        return this.extractLastDigitFromPrice(price, currentSymbolStr);
                    }
                }).filter(digit => digit !== null && digit !== undefined);

                const zerosCount = digits.filter(d => d === 0).length;

                this.analyticsData = {
                    last25Digits: digits.slice(-25),
                    last100Digits: digits.slice(-100),
                    last100Prices: bufferData.prices.slice(-100),
                    last5Prices: bufferData.prices.slice(-5),
                    digitCounts: {},
                    patterns: {},
                    hotColdAnalysis: {},
                    lastUpdate: bufferData.lastUpdate || Date.now()
                };

                // Atualizar displays imediatamente com dados disponíveis
                if (this.analyticsData.last25Digits.length >= 10) {
                    this.updateVipDigits(this.analyticsData.last25Digits.slice(-10));
                }
                if (this.analyticsData.last5Prices.length > 0) {
                    this.updateVipPrices(this.analyticsData.last5Prices);
                }
            } else {
                this.analyticsData = this.getDefaultAnalyticsData();
            }

            this.historicalDataReady = true;

        } catch (error) {
            console.error('❌ Erro ao carregar dados históricos de analytics:', error);
            this.analyticsData = this.getDefaultAnalyticsData();
            this.historicalDataReady = true;
        }
    }

    // 🔄 NOVO: Obter símbolo atual
    getCurrentSymbol() {
        const globalSymbol = window.selectedSymbol;
        const sessionSymbol = SessionManager.getSessionData('selected_symbol');
        const displaySymbol = window.displayViewInstance?.currentSymbol;
        const selected = globalSymbol || sessionSymbol || displaySymbol;

        if (!selected) {
            console.error('❌ [FOOTER] Nenhum ativo selecionado!');
            throw new Error('ERRO: Nenhum ativo selecionado. Recarregue a página.');
        }

        return selected;
    }

    updateDigitAnalytics() {
        if (this.analyticsData.last25Digits.length < 5) {
            this.displayInsufficientDataMessage();

            if (!this.lastReloadAttempt || Date.now() - this.lastReloadAttempt > 30000) {
                this.lastReloadAttempt = Date.now();
                setTimeout(() => {
                    this.forceReloadHistoricalData();
                }, 5000);
            }
            return;
        }

        // Processar dados se tiver pelo menos 10 dígitos
        if (this.analyticsData.last25Digits.length >= 10) {
            const digitCounts = {};
            for (let i = 0; i <= 9; i++) {
                digitCounts[i] = 0;
            }

            this.analyticsData.last25Digits.forEach(digit => {
                if (digit >= 0 && digit <= 9) {
                    digitCounts[digit]++;
                }
            });

            let maxDigit = 0, minDigit = 0;
            let maxCount = digitCounts[0], minCount = digitCounts[0];

            for (let digit = 0; digit <= 9; digit++) {
                const count = digitCounts[digit];

                if (digit === 0) {
                    maxCount = count;
                    minCount = count;
                    maxDigit = digit;
                    minDigit = digit;
                } else {
                    if (count > maxCount) {
                        maxCount = count;
                        maxDigit = digit;
                    }

                    if (count < minCount && count > 0) {
                        minCount = count;
                        minDigit = digit;
                    }
                }
            }

            if (minCount === 0) {
                minCount = Number.MAX_SAFE_INTEGER;
                for (let digit = 0; digit <= 9; digit++) {
                    const count = digitCounts[digit];
                    if (count < minCount) {
                        minCount = count;
                        minDigit = digit;
                    }
                }
            }

            if (maxCount === -1) {
                maxCount = 0;
                maxDigit = 0;
            }
            if (minCount === Number.MAX_SAFE_INTEGER) {
                minCount = 0;
                minDigit = 0;
            }

            const totalDigitsAnalyzed = this.analyticsData.last25Digits.length;
            const maxPercent = totalDigitsAnalyzed > 0 ? Math.round((maxCount / totalDigitsAnalyzed) * 100) : 0;
            const minPercent = totalDigitsAnalyzed > 0 ? Math.round((minCount / totalDigitsAnalyzed) * 100) : 0;

            const maxElement = document.getElementById('digit-max-25');
            const minElement = document.getElementById('digit-min-25');
            const maxText = `${maxDigit} (${maxPercent}%)`;
            const minText = `${minDigit} (${minPercent}%)`;

            if (maxElement && maxElement.textContent !== maxText) {
                requestAnimationFrame(() => maxElement.textContent = maxText);
            }
            if (minElement && minElement.textContent !== minText) {
                requestAnimationFrame(() => minElement.textContent = minText);
            }
        }

        // Par/Ímpar nos últimos 25
        if (this.analyticsData.last25Digits.length > 0) {
            const evenCount = this.analyticsData.last25Digits.filter(d => d % 2 === 0).length;
            const oddCount = this.analyticsData.last25Digits.length - evenCount;
            const evenPercent = Math.round((evenCount / this.analyticsData.last25Digits.length) * 100);
            const oddPercent = Math.round((oddCount / this.analyticsData.last25Digits.length) * 100);

            const evenElement = document.getElementById('digit-even-25');
            const oddElement = document.getElementById('digit-odd-25');
            const evenText = `${evenPercent}%`;
            const oddText = `${oddPercent}%`;

            if (evenElement && evenElement.textContent !== evenText) {
                requestAnimationFrame(() => evenElement.textContent = evenText);
            }
            if (oddElement && oddElement.textContent !== oddText) {
                requestAnimationFrame(() => oddElement.textContent = oddText);
            }
        }

        let digitsForPattern = this.analyticsData.last100Digits;
        if (!digitsForPattern || digitsForPattern.length < 3) {
            digitsForPattern = this.analyticsData.last25Digits;
        }

        if (digitsForPattern && digitsForPattern.length >= 3) {
            const pattern = this.findMostFrequentPattern(digitsForPattern);
            const patternElement = document.getElementById('digit-pattern-100');

            if (patternElement) {
                patternElement.textContent = pattern;
            }
        } else {
            const patternElement = document.getElementById('digit-pattern-100');
            if (patternElement) {
                patternElement.textContent = '⏳⏳';
            }
        }
    }

    updatePriceAnalytics() {
        const prices100 = this.analyticsData.last100Prices || [];

        if (!prices100 || prices100.length < 2) {
            const upElement = document.getElementById('price-up-100');
            const downElement = document.getElementById('price-down-100');
            const volumeElement = document.getElementById('price-volume-100');
            const seqUpElement = document.getElementById('price-seq-up');
            const seqDownElement = document.getElementById('price-seq-down');

            if (upElement) upElement.textContent = '0%';
            if (downElement) downElement.textContent = '0%';
            if (volumeElement) volumeElement.textContent = '0.000';
            if (seqUpElement) seqUpElement.textContent = '0';
            if (seqDownElement) seqDownElement.textContent = '0';
            return;
        }

        this.updatePriceAnalyticsUnified(prices100);
    }

    findMostFrequentPattern(digits) {
        if (!digits || digits.length < 3) return '---';

        const patterns = {};

        for (let i = 0; i <= digits.length - 3; i++) {
            const pattern = digits.slice(i, i + 3).join('');
            if (/^\d{3}$/.test(pattern)) {
                patterns[pattern] = (patterns[pattern] || 0) + 1;
            }
        }

        if (Object.keys(patterns).length === 0) {
            return '---';
        }

        let mostFrequent = '---';
        let maxCount = 0;

        for (const [pattern, count] of Object.entries(patterns)) {
            if (count > maxCount) {
                maxCount = count;
                mostFrequent = pattern;
            }
        }

        return mostFrequent !== '---' ? mostFrequent : Object.keys(patterns)[0] || '---';
    }

    updateSequenceInterface(sequences) {
        const seqUpElement = document.getElementById('price-seq-up');
        const seqDownElement = document.getElementById('price-seq-down');

        if (!seqUpElement || !seqDownElement) {

            return;
        }

        const upText = sequences.maxUp.toString();
        const downText = sequences.maxDown.toString();

        seqUpElement.textContent = upText;
        seqDownElement.textContent = downText;

        if (Math.random() < 0.03) {
            // Log ocasional
        }
    }

    findMaxSequences(prices) {
        if (prices.length < 2) return { maxUp: 0, maxDown: 0 };

        let maxUp = 0;
        let maxDown = 0;
        let currentUpSequence = 0;
        let currentDownSequence = 0;

        for (let i = 1; i < prices.length; i++) {
            const precoAtual = parseFloat(prices[i]);
            const precoAnterior = parseFloat(prices[i - 1]);

            if (isNaN(precoAtual) || isNaN(precoAnterior)) {
                currentUpSequence = 0;
                currentDownSequence = 0;
                continue;
            }

            const atual = Math.round(precoAtual * 100000) / 100000;
            const anterior = Math.round(precoAnterior * 100000) / 100000;

            if (atual > anterior) {
                currentUpSequence++;
                if (currentUpSequence > maxUp) {
                    maxUp = currentUpSequence;
                }
                currentDownSequence = 0;

            } else if (atual < anterior) {
                currentDownSequence++;
                if (currentDownSequence > maxDown) {
                    maxDown = currentDownSequence;
                }
                currentUpSequence = 0;

            } else {
                currentUpSequence = 0;
                currentDownSequence = 0;
            }
        }

        return { maxUp, maxDown };
    }



    validateSequenceElements() {
        const seqUpElement = document.getElementById('price-seq-up');
        const seqDownElement = document.getElementById('price-seq-down');

        if (!seqUpElement) {
            console.error('❌ [SEQUENCE ERROR] Elemento #price-seq-up não encontrado!');
        }

        if (!seqDownElement) {
            console.error('❌ [SEQUENCE ERROR] Elemento #price-seq-down não encontrado!');
        }

        if (seqUpElement && seqDownElement) {
            this.setupSequenceObserver(seqUpElement, seqDownElement);
        }
    }

    setupSequenceObserver(seqUpElement, seqDownElement) {
        const observer = new MutationObserver((mutations) => {
            // Observer silencioso
        });

        observer.observe(seqUpElement, { childList: true, characterData: true, subtree: true });
        observer.observe(seqDownElement, { childList: true, characterData: true, subtree: true });
    }

    destroy() {

        // Marcar como destruído ANTES de qualquer limpeza
        this.isDestroyed = true;

        // Limpar intervals e timeouts
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }

        if (this.digitsUpdateTimeout) {
            clearTimeout(this.digitsUpdateTimeout);
            this.digitsUpdateTimeout = null;
        }

        if (this.pricesUpdateTimeout) {
            clearTimeout(this.pricesUpdateTimeout);
            this.pricesUpdateTimeout = null;
        }

        // 🧹 CRÍTICO: Remover listener de eventos
        if (this.marketDataListener) {
            window.removeEventListener('marketDataUpdate', this.marketDataListener);
            this.marketDataListener = null;

        }

        // 🧹 CRÍTICO: Limpar referência do handleMarketDataUpdate
        if (this.handleMarketDataUpdate) {
            this.handleMarketDataUpdate = null;
        }

        // 🧹 CRÍTICO: Limpar todos os arrays de dados
        if (this.analyticsData) {
            this.analyticsData.last25Digits = [];
            this.analyticsData.last100Digits = [];
            this.analyticsData.last100Prices = [];
            this.analyticsData.last5Prices = [];
        }

        // Limpar container DOM
        const container = document.getElementById(this.containerId);
        if (container) {
            container.remove();
        }



        // Remover estilos específicos do VIP
        const vipStyles = document.getElementById('vip-footer-styles');
        if (vipStyles) {
            vipStyles.remove();
        }

    }

    // 🔧 MÉTODO ÚNICO E DEFINITIVO para todos os analytics de preços
    updatePriceAnalyticsUnified(prices100) {
        if (!prices100 || prices100.length < 2) {
            const upElement = document.getElementById('price-up-100');
            const downElement = document.getElementById('price-down-100');
            const volumeElement = document.getElementById('price-volume-100');
            const seqUpElement = document.getElementById('price-seq-up');
            const seqDownElement = document.getElementById('price-seq-down');

            if (upElement) upElement.textContent = '0%';
            if (downElement) downElement.textContent = '0%';
            if (volumeElement) volumeElement.textContent = '0.000';
            if (seqUpElement) seqUpElement.textContent = '0';
            if (seqDownElement) seqDownElement.textContent = '0';
            return;
        }

        let ticksAcima = 0;
        let ticksAbaixo = 0;
        let maxVolume = 0;

        let maxUp = 0;
        let maxDown = 0;
        let currentUpSequence = 0;
        let currentDownSequence = 0;

        for (let i = 1; i < prices100.length; i++) {
            const precoAtual = parseFloat(prices100[i]);
            const precoAnterior = parseFloat(prices100[i - 1]);

            if (isNaN(precoAtual) || isNaN(precoAnterior)) {
                currentUpSequence = 0;
                currentDownSequence = 0;
                continue;
            }

            const atual = Math.round(precoAtual * 100000) / 100000;
            const anterior = Math.round(precoAnterior * 100000) / 100000;

            if (atual > anterior) {
                ticksAcima++;
                currentUpSequence++;
                if (currentUpSequence > maxUp) {
                    maxUp = currentUpSequence;
                }
                currentDownSequence = 0;

            } else if (atual < anterior) {
                ticksAbaixo++;
                currentDownSequence++;
                if (currentDownSequence > maxDown) {
                    maxDown = currentDownSequence;
                }
                currentUpSequence = 0;

            } else {
                currentUpSequence = 0;
                currentDownSequence = 0;
            }

            const volume = Math.abs(atual - anterior);
            if (volume > maxVolume) maxVolume = volume;
        }

        const upElement = document.getElementById('price-up-100');
        const downElement = document.getElementById('price-down-100');
        const volumeElement = document.getElementById('price-volume-100');
        const seqUpElement = document.getElementById('price-seq-up');
        const seqDownElement = document.getElementById('price-seq-down');

        const totalTicks = ticksAcima + ticksAbaixo;
        if (totalTicks > 0) {
            const percentualAcima = Math.round((ticksAcima / totalTicks) * 100);
            const percentualAbaixo = Math.round((ticksAbaixo / totalTicks) * 100);

            if (upElement && upElement.textContent !== `${percentualAcima}%`) {
                requestAnimationFrame(() => upElement.textContent = `${percentualAcima}%`);
            }
            if (downElement && downElement.textContent !== `${percentualAbaixo}%`) {
                requestAnimationFrame(() => downElement.textContent = `${percentualAbaixo}%`);
            }
        }

        if (volumeElement && volumeElement.textContent !== maxVolume.toFixed(3)) {
            requestAnimationFrame(() => volumeElement.textContent = maxVolume.toFixed(3));
        }

        if (seqUpElement && seqUpElement.textContent !== maxUp.toString()) {
            requestAnimationFrame(() => seqUpElement.textContent = maxUp.toString());
        }
        if (seqDownElement && seqDownElement.textContent !== maxDown.toString()) {
            requestAnimationFrame(() => seqDownElement.textContent = maxDown.toString());
        }

        if (Math.random() < 0.02) {
            // Log ocasional
        }
    }

    updateVipDigits(digits) {
        if (!digits || digits.length === 0) {
            this.showDigitsLoading();
            return;
        }

        this.hideDigitsLoading();

        const last10 = digits.slice(-10);

        for (let i = 0; i < 10; i++) {
            const element = document.getElementById(`vip-digit-${i}`);
            if (element) {
                if (i < last10.length) {
                    const digit = last10[i];
                    const digitStr = digit.toString();

                    requestAnimationFrame(() => {
                        element.textContent = digitStr;
                        element.classList.remove('digit-even', 'digit-odd', 'digit-loading');
                        if (digit % 2 === 0) {
                            element.classList.add('digit-even');
                        } else {
                            element.classList.add('digit-odd');
                        }

                        // 💫 Feedback Visual: Flash no último dígito do row
                        if (i === last10.length - 1) {
                            element.classList.add('tick-active');
                            setTimeout(() => element.classList.remove('tick-active'), 300);
                        }
                    });
                } else if (element.textContent !== '-') {
                    requestAnimationFrame(() => {
                        element.textContent = '-';
                        element.classList.remove('digit-even', 'digit-odd', 'digit-loading');
                    });
                }
            }
        }
    }

    forceUpdateProfitLossDisplay() {
        const possibleElements = [
            'profit-loss-display',
            'profit-loss-display-inline',
            'profit-loss-value' // Para o caso de ser o próprio span
        ];

        possibleElements.forEach(elementId => {
            const element = document.getElementById(elementId);
            if (element) {
                // 🛡️ PROTEÇÃO: Se for o container principal, buscar o span de valor dentro dele
                // para não apagar o botão de saldo que foi injetado
                if (elementId === 'profit-loss-display' || element.classList.contains('profit-loss-display-inline')) {
                    const valueSpan = element.querySelector('.profit-loss-value');
                    if (valueSpan) {
                        valueSpan.textContent = '$0.00';
                        valueSpan.className = 'profit-loss-value neutral';
                        valueSpan.style.color = 'white';
                        valueSpan.style.backgroundColor = '#6c757d';
                    }
                    return; // Não continuar para este elemento (já tratamos o filho)
                }

                // FORÇAR texto para $0.00 (apenas se não for container protegido)
                element.textContent = '$0.00';
                element.innerText = '$0.00';

                // FORÇAR classes CSS para neutral
                element.className = 'profit-loss-value neutral';

                // FORÇAR estilo visual para neutral (cinza)
                element.style.color = 'white';
                element.style.backgroundColor = '#6c757d';
                element.style.borderColor = '#545b62';

                // Animação de confirmação
                element.style.animation = 'resetPulse 0.8s ease-out';
                setTimeout(() => {
                    element.style.animation = '';
                }, 800);

            }
        });
    }

    showDigitsLoading() {
        for (let i = 0; i < 10; i++) {
            const element = document.getElementById(`vip-digit-${i}`);
            if (element) {
                element.textContent = '⏳';
                element.classList.remove('digit-even', 'digit-odd');
                element.classList.add('digit-loading');
            }
        }
    }

    hideDigitsLoading() {
        for (let i = 0; i < 10; i++) {
            const element = document.getElementById(`vip-digit-${i}`);
            if (element) {
                element.classList.remove('digit-loading');
            }
        }
    }

    updateVipPrices(prices) {
        if (!prices || prices.length === 0) {
            return;
        }

        const last5 = prices.slice(-5);

        for (let i = 0; i < 5; i++) {
            const item = document.getElementById(`vip-price-${i}`);
            if (item) {
                if (i < last5.length) {
                    const currentPrice = parseFloat(last5[i]);

                    // ✅ CORREÇÃO: Usar casas decimais detectadas automaticamente
                    const token = SessionManager.getLocalToken();
                    const marketData = getMarketDataInstance(token);
                    const currentSymbol = window.selectedSymbol || SessionManager.getSessionData('selected_symbol');

                    let decimalPlaces = 5; // Fallback padrão para sintéticos
                    if (marketData && currentSymbol) {
                        const detectedDecimals = marketData.getAssetDecimalPlaces ?
                            marketData.getAssetDecimalPlaces(currentSymbol) : 5;
                        decimalPlaces = detectedDecimals;


                    }

                    requestAnimationFrame(() => {
                        item.textContent = currentPrice.toFixed(decimalPlaces);
                        item.classList.remove('price-up', 'price-down', 'price-same');

                        if (i > 0 && last5[i - 1] !== undefined) {
                            const prevPrice = parseFloat(last5[i - 1]);
                            if (currentPrice > prevPrice) {
                                item.classList.add('price-up');
                            } else if (currentPrice < prevPrice) {
                                item.classList.add('price-down');
                            } else {
                                item.classList.add('price-same');
                            }
                        }

                        // 💫 Feedback Visual: Flash no preço mais recente
                        if (i === last5.length - 1) {
                            item.classList.add('tick-active');
                            setTimeout(() => item.classList.remove('tick-active'), 300);
                        }
                    });

                } else {
                    item.textContent = '---.---';
                    item.classList.remove('price-up', 'price-down', 'price-same');
                }
            }
        }
    }

    ensureAnalyticsDataSufficiency(displayInstance) {
        try {
            if (displayInstance && displayInstance.marketData) {
                const fullHistory = displayInstance.marketData.getHistoricalTicks(displayInstance.currentSymbol, 100);
                if (fullHistory && fullHistory.prices && fullHistory.prices.length >= 25) {
                    const fullDigits = fullHistory.prices.map(price => this.extractLastDigitFromPrice(price));
                    this.analyticsData.last25Digits = fullDigits.slice(-25);
                    this.analyticsData.last100Digits = fullDigits.slice(-100);

                    this.saveAnalyticsData();
                    return true;
                }
            }


            this.forceReloadHistoricalData();
            return false;
        } catch (error) {
            console.error('❌ [SUFFICIENCY] Erro ao garantir suficiência:', error);
            return false;
        }
    }

    async waitForDisplayViewAndPopulateAnalytics() {
        let attempts = 0;
        const maxAttempts = 10;

        while (!window.displayViewInstance && attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 500));
            attempts++;
        }

        if (window.displayViewInstance) {
            const displayInstance = window.displayViewInstance;
            const currentSymbol = this.getCurrentSymbol();

            if (displayInstance.marketData) {
                try {
                    displayInstance.marketData.activeSymbol = currentSymbol;

                    const fullHistory = displayInstance.marketData.getHistoricalTicks(currentSymbol, 100);

                    if (fullHistory && fullHistory.prices && fullHistory.prices.length >= 25) {
                        const fullDigits = fullHistory.prices.map(price => this.extractLastDigitFromPrice(price));

                        this.analyticsData.last25Digits = fullDigits.slice(-25);
                        this.analyticsData.last100Digits = fullDigits.slice(-100);
                        this.analyticsData.last100Prices = fullHistory.prices.slice(-100);
                        this.analyticsData.last5Prices = fullHistory.prices.slice(-5);

                        this.updateDigitAnalytics();
                        this.updatePriceAnalyticsUnified(this.analyticsData.last100Prices);
                        this.saveAnalyticsData();

                        this.updateVipDigits(fullDigits.slice(-10));
                        this.updateVipPrices(fullHistory.prices.slice(-5));

                    } else {
                        await this.forceReloadHistoricalData();
                    }
                } catch (error) {
                    console.error('❌ [VIP ANALYTICS] Erro ao carregar dados completos:', error);
                }
            }
        }
    }

    async forceReloadHistoricalData() {
        // Implementação simplificada para recarregar dados

        await this.loadHistoricalDataForAnalytics();
    }

    // 🚀 OTIMIZAÇÃO: marketDataListener agora é definido dinamicamente em setupDataSync()
    // para garantir o uso de closures e debouncing corretos.
}

// 🌐 Expor classes globalmente para uso externo
window.FooterManager = FooterManager;
window.VipFooter = VipFooter;