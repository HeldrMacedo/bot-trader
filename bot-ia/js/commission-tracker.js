class CommissionTracker {
    static instance = null;

    constructor() {
        this.commissionData = null;
        this.updateInterval = null;
        this.isTracking = false;
        this.updateInProgress = false;
    }

    static getInstance() {
        if (!CommissionTracker.instance) {
            CommissionTracker.instance = new CommissionTracker();
        }
        return CommissionTracker.instance;
    }

    // 🔍 Verificar se usuário é admin (MANTIDO)
    static isAdmin() {
        const currentUser = SessionManager.getCurrentUser();
        const loginId = currentUser?.authorize?.loginid;

        const ADMIN_LOGIN_IDS = [
            'CR2691758',
            'VRTC4540558',
            'CR5996283',
            'CR3853510',
            'VRTC12422137'
        ];

        return ADMIN_LOGIN_IDS.includes(loginId);
    }

    // 🔑 Obter token de qualquer conta válida (MANTIDO)
    static getValidTokenForCommissions() {
        const currentToken = SessionManager.getLocalToken();
        if (currentToken) return currentToken;

        const accounts = SessionManager.getAccountList();
        for (const account of accounts) {
            const token = SessionManager.getTokenByLoginId(account.loginid);
            if (token) return token;
        }

        const ADMIN_ACCOUNTS = ['CR2691758', 'CR5996283', 'CR3853510', 'VRTC4540558', 'VRTC12422137'];
        for (const loginId of ADMIN_ACCOUNTS) {
            const token = SessionManager.getTokenByLoginId(loginId);
            if (token) return token;
        }

        console.warn('⚠️ [COMMISSION] Nenhum token válido disponível para buscar comissões');
        return null;
    }

    // 🚀 Iniciar rastreamento (MANTIDO)
    async startTracking(autoInit = false) {
        if (!CommissionTracker.isAdmin()) {
            if (!autoInit) {
                console.warn('⚠️ [COMMISSION] Acesso negado - apenas para administradores');
            }
            return;
        }

        if (this.isTracking) return;

        this.isTracking = true;

        this.createCommissionDisplay();

        if (autoInit) {
            await new Promise(resolve => setTimeout(resolve, 3000));
        }

        await this.updateCommissionData();
    }

    // ⏹️ Parar rastreamento (MANTIDO)
    stopTracking() {
        if (!this.isTracking) return;

        this.isTracking = false;

        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }

        const display = document.getElementById('commission-display');
        if (display) {
            display.remove();
        }
    }

    // 🔄 NOVO: Função para atualização manual (MANTIDO)
    async refreshCommissions() {
        if (!CommissionTracker.isAdmin() || !this.isTracking || this.updateInProgress) {
            if (this.updateInProgress) console.warn('⚠️ [COMMISSION] Atualização já em andamento, aguarde...');
            return;
        }

        this.showCommissionLoading();

        try {
            await this.updateCommissionData();
        } catch (error) {
            console.error('❌ [COMMISSION] Erro na atualização manual:', error);
        }
    }

    // 📊 CORRIGIDO: Atualizar dados de comissão (Foco no Mês Aberto)
    async updateCommissionData() {
        if (this.updateInProgress) return;
        this.updateInProgress = true;

        try {
            const token = CommissionTracker.getValidTokenForCommissions();
            if (!token) {
                this.showCommissionError('Token necessário para visualizar comissões do aplicativo');
                return;
            }

            const backendOnline = await this.checkBackendHealth();
            if (!backendOnline) {
                this.showCommissionError('Servidor temporariamente indisponível');
                return;
            }

            let apiInstance = window.AppManager?.apiInstance;
            let shouldDisconnect = false;

            if (!apiInstance || !apiInstance.ws || apiInstance.ws.readyState !== WebSocket.OPEN) {
                apiInstance = new DerivAPI();
                await apiInstance.connect();
                await apiInstance.forceAuthorize(token);
                shouldDisconnect = true;
            }

            // 🎯 ALTERAÇÃO CRÍTICA: Buscar apenas do dia 1 do mês atual até agora
            const now = new Date();
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

            const date_to = now.toISOString().slice(0, 19).replace('T', ' ');
            const date_from = startOfMonth.toISOString().slice(0, 19).replace('T', ' ');

            const APP_IDS = {
                current: 67957,
                others: [31171, 36168, 63661, 66035, 117847, 117662, 118421]
            };


            const appMarkupResponse = await apiInstance.sendRequest({
                "app_markup_statistics": 1,
                "date_from": date_from,
                "date_to": date_to
            }).catch(err => {
                console.error(`❌ [COMMISSION] Erro ao buscar app_markup_statistics:`, err.message);
                return { app_markup_statistics: null };
            });

            const allCommissionData = appMarkupResponse.app_markup_statistics || null;

            // O total será o MÊS ABERTO, não mais 90 dias
            this.processAllAppsCommissionData(allCommissionData, APP_IDS, date_from, date_to);

            this.updateCommissionDisplay();

            if (shouldDisconnect) {
                await apiInstance.disconnect();
            }

        } catch (error) {
            console.error('❌ [COMMISSION] Erro ao buscar dados de comissão:', error);
            this.showCommissionError(error.message);
        } finally {
            this.updateInProgress = false;
        }
    }

    // 🏥 Verificar saúde do backend (MANTIDO)
    async checkBackendHealth() {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000);

            const response = await fetch('/api', {
                method: 'GET',
                signal: controller.signal,
                cache: 'no-cache'
            });

            clearTimeout(timeoutId);
            return response.ok;
        } catch (error) {
            console.warn('⚠️ [COMMISSION] Health check falhou:', error.message);
            return false;
        }
    }



    // 🔢 NOVA: Processar dados de comissão de TODOS os apps
    processAllAppsCommissionData(statisticsData, appIds, date_from_api, date_to_api) {

        // 🛡️ SILENT FAIL: Se statisticsData for null (erro já logado no fetch), não poluir log com "Dados inválidos"
        if (statisticsData === null) {
            return;
        }

        if (!statisticsData || !statisticsData.breakdown || !Array.isArray(statisticsData.breakdown)) {
            console.error('❌ [COMMISSION] Dados inválidos recebidos da API:', statisticsData);
            this.showCommissionError('Dados de comissão não disponíveis');
            return;
        }

        let currency = 'USD';
        let totalTransactionCount = 0;

        // 📱 Mapeamento de nomes personalizados para cada app
        const appNames = {
            67957: 'StrategyFree',
            31171: 'APP1',
            36168: 'APP2',
            63661: 'APP3',
            66035: 'APP4',
            117847: 'APP5',
            117662: 'APP6',
            118421: 'APP7'
        };

        // Nova estrutura: apps individuais + total
        const commissionSummary = {
            individualApps: {},
            totalAllApps: { monthly: 0, count: 0 }
        };

        // 📱 INICIALIZAR TODOS OS APPS MONITORADOS (mesmo sem dados)
        const allAppIds = [appIds.current, ...appIds.others];

        for (const appId of allAppIds) {
            commissionSummary.individualApps[appId] = {
                appId: appId,
                name: appNames[appId] || `App ${appId}`,
                monthly: 0,
                count: 0
            };
        }

        // Processar breakdown (array de apps com dados)
        for (const appData of statisticsData.breakdown) {
            const appId = parseInt(appData.app_id);
            const markup = parseFloat(appData.app_markup_usd || appData.app_markup_value || 0);
            const count = parseInt(appData.transaction_count || 0);

            // Verificar se é um dos nossos apps monitorados
            if (allAppIds.includes(appId)) {
                // Atualizar dados do app individual
                commissionSummary.individualApps[appId].monthly = markup;
                commissionSummary.individualApps[appId].count = count;

                // Adicionar ao total geral
                commissionSummary.totalAllApps.monthly += markup;
                // Somar as transações no total
                commissionSummary.totalAllApps.count += count;
            } else {
                console.warn(`⚠️ [COMMISSION] App ${appId} não monitorado, ignorando.`);
            }


            // Detectar moeda
            if (appData.dev_currcode) {
                currency = appData.dev_currcode;
            }
        }

        // Usar totais da API como validação
        const apiTotal = parseFloat(statisticsData.total_app_markup_usd || 0);
        const apiCount = parseInt(statisticsData.total_transaction_count || 0);

        // Salvar dados processados
        this.commissionData = {
            individualApps: commissionSummary.individualApps,
            totalAllApps: commissionSummary.totalAllApps,
            lastUpdate: new Date(),
            currency: currency,
            totalTransactionCount: totalTransactionCount,
            debug: {
                period: `Mês Aberto (${date_from_api} a ${date_to_api})`,
                usingStatistics: true,
                apiTotal: apiTotal,
                apiCount: apiCount,
                rawData: statisticsData
            }
        };
    }

    // 🔢 Processar dados de comissão usando app_markup_statistics (FUNÇÃO ANTIGA - MANTER PARA COMPATIBILIDADE)
    processMultipleAppCommissionData(allCommissionData, appIds, date_from_api, date_to_api) {
        let currency = 'USD';
        let totalTransactionCount = 0;

        // Inicialização da estrutura
        const commissionSummary = {
            currentApp: { daily: 0, monthly: 0, total: 0, count: 0, appId: appIds.current },
            otherApps: { daily: 0, monthly: 0, total: 0, count: 0, appIds: appIds.others }
        };

        const processStatistics = (appId, statistics, summaryContainer) => {

            if (!statistics) {
                console.warn(`⚠️ [COMMISSION] Nenhum dado disponível para app ${appId}`);
                return;
            }

            // app_markup_statistics pode retornar diferentes estruturas
            // Vamos tentar extrair os valores de diferentes campos possíveis
            let totalMarkup = 0;
            let count = 0;

            // Usar os campos corretos da API app_markup_statistics
            if (statistics.total_app_markup_usd !== undefined) {
                totalMarkup = parseFloat(statistics.total_app_markup_usd) || 0;
            } else if (statistics.total_app_markup !== undefined) {
                totalMarkup = parseFloat(statistics.total_app_markup) || 0;
            } else if (statistics.breakdown && Array.isArray(statistics.breakdown)) {
                // Somar todos os apps do breakdown
                totalMarkup = statistics.breakdown.reduce((sum, item) => {
                    const value = parseFloat(item.app_markup_usd || item.app_markup_value || 0);
                    return sum + value;
                }, 0);
            }

            // Extrair contagem de transações
            if (statistics.total_transaction_count !== undefined) {
                count = parseInt(statistics.total_transaction_count) || 0;
            } else if (statistics.breakdown && Array.isArray(statistics.breakdown)) {
                // Somar todas as transações do breakdown
                count = statistics.breakdown.reduce((sum, item) => {
                    return sum + (parseInt(item.transaction_count) || 0);
                }, 0);
            }

            summaryContainer.total += totalMarkup;
            summaryContainer.monthly += totalMarkup; // Para o período do mês
            summaryContainer.count += count;
            totalTransactionCount += count;

            // Para daily, como app_markup_statistics não separa por dia,
            // vamos calcular uma estimativa baseada no tempo decorrido do mês
            const now = new Date();
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
            const daysElapsed = now.getDate();
            const dailyEstimate = (totalMarkup / daysElapsed) || 0;

            summaryContainer.daily += dailyEstimate;

            // Detectar moeda
            if (statistics.currency) {
                currency = statistics.currency;
            }
        };

        // 1. Processar App Principal
        const currentAppStats = allCommissionData[appIds.current];
        processStatistics(appIds.current, currentAppStats, commissionSummary.currentApp);

        // 2. Processar Outros Apps
        appIds.others.forEach(appId => {
            const appStats = allCommissionData[appId];
            processStatistics(appId, appStats, commissionSummary.otherApps);
        });

        // Salvar dados processados
        this.commissionData = {
            currentApp: commissionSummary.currentApp,
            otherApps: commissionSummary.otherApps,
            lastUpdate: new Date(),
            currency: currency,
            totalTransactionCount: totalTransactionCount,
            debug: {
                period: `Mês Aberto (${date_from_api} a ${date_to_api})`,
                usingStatistics: true,
                rawData: allCommissionData
            }
        };
    }

    // Helper para parsing de data de transação (MANTIDO)
    parseTransactionDate(transactionTime) {
        if (typeof transactionTime === 'number' && transactionTime < 10000000000) {
            return new Date(transactionTime * 1000);
        }
        return new Date(transactionTime);
    }

    // Helper para extrair valor da comissão (MANTIDO O FOCO EM MARKUP)
    extractCommissionAmount(transaction) {
        let amount = 0;

        // PRIORIDADE #1: Usar 'app_markup', que é o campo principal
        if (transaction.app_markup !== undefined && transaction.app_markup !== null && transaction.app_markup !== '') {
            amount = parseFloat(transaction.app_markup);
        }
        // PRIORIDADE #2: Usar 'markup'
        else if (transaction.markup !== undefined && transaction.markup !== null && transaction.markup !== '') {
            amount = parseFloat(transaction.markup);
        }
        // PRIORIDADE #3: Usar 'app_markup_value'
        else if (transaction.app_markup_value !== undefined && transaction.app_markup_value !== null && transaction.app_markup_value !== '') {
            amount = parseFloat(transaction.app_markup_value);
        }
        // PRIORIDADE #4: Usar 'amount' (último recurso)
        else if (transaction.amount !== undefined && transaction.amount !== null && transaction.amount !== '') {
            amount = parseFloat(transaction.amount);
        }

        if (isNaN(amount)) {
            console.warn(`⚠️ [COMMISSION] Valor extraído inválido:`, amount, 'da transação:', transaction);
            return 0;
        }

        return Math.abs(amount);
    }

    // 🎨 Criar visor de comissão (MANTIDO)
    createCommissionDisplay() {
        let display = document.getElementById('commission-display');

        if (!display) {
            display = document.createElement('div');
            display.id = 'commission-display';
            display.className = 'commission-display';

            const appContainer = document.getElementById('app-container');
            if (appContainer && appContainer.firstChild) {
                appContainer.insertBefore(display, appContainer.firstChild);
            } else if (document.body.firstChild) {
                document.body.insertBefore(display, document.body.firstChild);
            }
        }

        this.applyCommissionStyles();
        this.showCommissionLoading();
    }

    // 🎨 Aplicar estilos CSS (MANTIDO)
    applyCommissionStyles() {
        if (document.getElementById('commission-styles')) return;

        const style = document.createElement('style');
        style.id = 'commission-styles';
        style.textContent = `
            .commission-display {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                background: linear-gradient(135deg, #2E8B57 0%, #3CB371 100%);
                color: white;
                padding: 8px 20px;
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                font-size: 0.9em;
                font-weight: 500;
                z-index: 10001;
                box-shadow: 0 2px 8px rgba(0,0,0,0.2);
                border-bottom: 2px solid rgba(255,255,255,0.2);
                display: flex;
                align-items: center;
                justify-content: space-between;
                flex-wrap: wrap;
                gap: 15px;
                backdrop-filter: blur(10px);
            }

            .commission-title {
                display: flex;
                align-items: center;
                gap: 8px;
                font-weight: bold;
            }

            .commission-stats {
                display: flex;
                align-items: center;
                gap: 20px;
                flex-wrap: wrap;
            }

            .commission-item {
                display: flex;
                flex-direction: column;
                align-items: center;
                min-width: 100px;
            }

            .commission-total {
                border-left: 3px solid rgba(255,255,255,0.6);
                padding-left: 15px;
                margin-left: 15px;
                background: rgba(255,255,255,0.1);
                border-radius: 8px;
                padding: 8px 15px;
            }

            .commission-total .commission-value {
                font-size: 1.3em;
                color: #FFD700;
            }

            .commission-label {
                font-size: 0.75em;
                opacity: 0.9;
                margin-bottom: 2px;
                font-weight: bold;
            }

            .commission-value {
                font-size: 1.1em;
                font-weight: bold;
                text-shadow: 1px 1px 2px rgba(0,0,0,0.3);
            }

            .commission-sublabel {
                font-size: 0.6em;
                opacity: 0.7;
                margin-top: 2px;
                text-align: center;
                line-height: 1.2;
            }

            .commission-close,
            .commission-refresh {
                background: rgba(255,255,255,0.2);
                border: none;
                color: white;
                padding: 4px 8px;
                border-radius: 4px;
                cursor: pointer;
                font-size: 0.8em;
                transition: background-color 0.3s ease;
            }

            .commission-close:hover,
            .commission-refresh:hover {
                background: rgba(255,255,255,0.3);
            }

            .commission-refresh {
                background: rgba(46, 139, 87, 0.8);
            }

            .commission-refresh:hover {
                background: rgba(46, 139, 87, 1);
            }

            .commission-loading {
                display: flex;
                align-items: center;
                gap: 8px;
                opacity: 0.8;
            }

            .commission-loading .spinner {
                width: 16px;
                height: 16px;
                border: 2px solid rgba(255,255,255,0.3);
                border-top: 2px solid white;
                border-radius: 50%;
                animation: spin 1s linear infinite;
            }

            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }

            .commission-error {
                color: #ffdddd;
                font-style: italic;
            }

            /* Ajustar body para não ficar atrás do visor */
            body {
                padding-top: 50px !important;
            }

            @media (max-width: 768px) {
                .commission-display {
                    padding: 6px 15px;
                    font-size: 0.8em;
                }

                .commission-stats {
                    gap: 10px;
                }

                .commission-item {
                    min-width: 60px;
                }

                body {
                    padding-top: 60px !important;
                }
            }
        `;

        document.head.appendChild(style);
    }

    // ⏳ Mostrar loading (MANTIDO)
    showCommissionLoading() {
        const display = document.getElementById('commission-display');
        if (!display) return;

        // Note que CONFIG.APP_ID é usado aqui; certifique-se de que está definido globalmente
        display.innerHTML = `
            <div class="commission-title">
                💰 Comissões Multi-App (Mês Aberto)
            </div>
            <div class="commission-loading">
                <div class="spinner"></div>
                <span>Carregando comissões do aplicativo...</span>
            </div>
            <button class="commission-close" onclick="CommissionTracker.getInstance().stopTracking()">
                ✕ Fechar
            </button>
        `;
    }

    // ❌ Mostrar erro (MANTIDO)
    showCommissionError(errorMessage) {
        const display = document.getElementById('commission-display');
        if (!display) return;

        display.innerHTML = `
            <div class="commission-title">
                💰 Comissões Multi-App (Mês Aberto)
            </div>
            <div class="commission-error">
                ⚠️ Erro: ${errorMessage}
            </div>
            <button class="commission-close" onclick="CommissionTracker.getInstance().stopTracking()">
                ✕ Fechar
            </button>
        `;
    }

    // 🔄 NOVO: Atualizar visor com apps individuais
    updateCommissionDisplay() {
        const display = document.getElementById('commission-display');
        if (!display || !this.commissionData) return;

        const { individualApps, totalAllApps, lastUpdate, currency, totalTransactionCount } = this.commissionData;

        const formatCurrency = (value) => {
            const effectiveCurrency = currency || 'USD';
            return new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: effectiveCurrency,
                minimumFractionDigits: 2
            }).format(value);
        };

        const formatTime = (date) => {
            return date.toLocaleTimeString('pt-BR', {
                hour: '2-digit',
                minute: '2-digit'
            });
        };

        // Criar HTML para apps individuais - TODOS os apps monitorados
        let individualAppsHTML = '';

        // 📱 Definir nomes dos apps
        const appNamesLocal = {
            67957: 'StrategyFree',
            31171: 'APP1',
            36168: 'APP2',
            63661: 'APP3',
            66035: 'APP4',
            117847: 'APP5',
            117662: 'APP6',
            118421: 'APP7'
        };

        // Ordem específica: StrategyFree primeiro, depois os outros em ordem
        const orderedAppIds = ['67957', '31171', '36168', '63661', '66035', '117847', '117662', '118421'];

        for (const appId of orderedAppIds) {
            const app = individualApps[appId];
            const appName = appNamesLocal[appId] || `App ${appId}`;

            // SEMPRE mostrar o app, mesmo com valor zero
            const monthly = app ? app.monthly : 0;
            const count = app ? app.count : 0;

            individualAppsHTML += `
                <div class="commission-item">
                    <div class="commission-label">${appName}(${appId})</div>
                    <div class="commission-value">${formatCurrency(monthly)}</div>
                    <div class="commission-sublabel">${count} transações</div>
                </div>
            `;
        }

        display.innerHTML = `
            <div class="commission-title">
                💰 
            </div>
            <div class="commission-stats">
                ${individualAppsHTML}
                <div class="commission-item commission-total">
                    <div class="commission-label">Total Geral</div>
                    <div class="commission-value">${formatCurrency(totalAllApps.monthly)}</div>
                    <div class="commission-sublabel">${totalAllApps.count} transações</div>
                </div>
            </div>
            <div style="display: flex; gap: 10px;">
                <button class="commission-refresh" onclick="CommissionTracker.getInstance().refreshCommissions()">
                    🔄 Atualizar
                </button>
                <button class="commission-close" onclick="CommissionTracker.getInstance().stopTracking()">
                    ✕ Fechar
                </button>
            </div>
        `;
    }

    // 📱 Toggle visor (MANTIDO)
    static toggle() {
        const instance = CommissionTracker.getInstance();

        if (instance.isTracking) {
            instance.stopTracking();
        } else {
            instance.startTracking();
        }
    }
}

// 🌟 Função global para fácil acesso
window.CommissionTracker = CommissionTracker;