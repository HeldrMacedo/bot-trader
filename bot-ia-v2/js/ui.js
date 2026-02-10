// Gerenciador da interface do usuário
// O SISTEMA DEVE SER 100% ISOLADO POR USUARIO
class UIManager {
    // 🔄 NOVO: Cache para restaurar regras após cooldown
    static lastRulesData = null;
    static displayLoadingMessage(container) {
        container.innerHTML = `
            <h1>Carregando Sistema...</h1>
            <p>Por favor, aguarde enquanto preparamos sua interface de trading inteligente.</p>
            <div class="loading-spinner"></div>
        `;
    }

    static async displayUserDashboard(container, userData) {
        // 🔍 VALIDAÇÃO CRÍTICA: Verificar se dados estão completos
        const hasBalance = userData?.balance && userData.balance.balance !== undefined;
        const hasSettings = userData?.settings && userData.settings.email;
        const currentLoginId = userData?.authorize?.loginid;



        // 🔧 Se dados incompletos, buscar dados frescos da API
        if (!hasBalance || !hasSettings) {
            console.warn(`⚠️ Dados incompletos detectados! Buscando dados completos da API...`);

            try {
                const token = SessionManager.getTokenByLoginId(currentLoginId);
                if (token && window.AppManager?.apiInstance) {

                    const freshData = await window.AppManager.apiInstance.getUserAccountData(token);

                    if (freshData && freshData.authorize) {

                        userData = freshData;
                        // Salvar dados completos
                        SessionManager.saveUserData(userData);
                    }
                }
            } catch (error) {
                console.error(`❌ Erro ao buscar dados completos:`, error);
            }
        }

        const dashboardHtml = `
            <div class="dashboard">
                <div class="user-info-grid">
                    <div class="user-info-left">
                        <!-- Bloco "Informações da Conta" removido -->
                    </div>

                    <div class="user-info-center">
                    </div>

                    <div class="user-info-right">
                        <!-- Displays movidos para o rodapé -->
                    </div>
                </div>

                <div class="main-content-blocks">
                    <div id="configurations-block" class="trade-block"></div>
                    <div id="monitoring-block" class="trade-block"></div>
                    <div id="rules-display-block" class="trade-block"></div>
                </div>

                <!-- Barra fixa no rodapé - será renderizada pelo FooterManager -->
                <div class="bottom-bar">
                    <!-- Conteúdo será gerado dinamicamente pelo FooterManager baseado no nível do usuário -->
                </div>
            </div>
        `;

        // 🛡️ PROTEÇÃO OTIMIZADA: Manter dashboard ao trocar conta, apenas atualizar footer
        const existingDashboard = container.querySelector('.dashboard');
        if (existingDashboard) {
            // Dashboard já existe, não destruir HTML

            // Atualizar loginId no dataset
            if (currentLoginId) {
                container.dataset.loginId = currentLoginId;
            }

            // Atualizar rodapé (FooterManager decide se recria ou mantém)
            if (typeof FooterManager !== 'undefined') {
                await FooterManager.initializeFooter();
            }

            // Recarregar blocos de mercado com novo token
            this.loadMarketBlocks(SessionManager.getLocalToken());

            return;
        }

        container.innerHTML = dashboardHtml;

        // 🔐 Marcar container com loginId atual
        if (currentLoginId) {
            container.dataset.loginId = currentLoginId;
        }

        // 🦶 Inicializar rodapé baseado no nível do usuário
        if (typeof FooterManager !== 'undefined') {
            await FooterManager.initializeFooter();
        } else {
            console.warn('⚠️ FooterManager não encontrado, usando rodapé padrão');
            this.loadLegacyFooter(userData);
        }

        this.loadMarketBlocks(SessionManager.getLocalToken());

        // 🎨 FORÇAR: Aplicar tema escuro nos blocos principais
        setTimeout(() => {
            const blocks = [
                document.getElementById('monitoring-block'),
                document.getElementById('rules-display-block'),
                document.getElementById('configurations-block'),
                document.getElementById('trade-messages-container'),
                document.querySelector('.trade-messages-container')
            ];

            blocks.forEach(block => {
                if (block) {
                    block.style.backgroundColor = '#0c1318';
                    block.style.color = '#e8f0f7';
                    block.style.border = '0.5px solid #1de9b6'; // Borda mais fina
                }
            });

            // Aplicar tema escuro aos contadores
            const counters = document.querySelectorAll('.counter-group, .real-counters, .simulated-counters, .counter-item-horizontal');
            counters.forEach(counter => {
                counter.style.backgroundColor = '#0c1318';
                counter.style.border = '0.5px solid #1de9b6'; // Borda mais fina
                counter.style.color = '#e8f0f7';
            });

            // Aplicar tema escuro aos títulos dos contadores
            const counterTitles = document.querySelectorAll('.counter-group-title');
            counterTitles.forEach(title => {
                title.style.backgroundColor = '#0c1318';
                title.style.color = '#1de9b6';
            });

            // Aplicar tema escuro à mensagem "Nenhum trade executado ainda"
            const noMessages = document.querySelectorAll('.no-messages');
            noMessages.forEach(msg => {
                msg.style.backgroundColor = 'transparent';
                msg.style.color = '#8b9cb5';
            });

            // Aplicar tema escuro ao rodapé
            const footers = document.querySelectorAll('.footer, .vip-footer-content, .bottom-bar');
            footers.forEach(footer => {
                footer.style.background = '#1a2332';
                footer.style.backgroundColor = '#1a2332';
                footer.style.borderTop = '0.5px solid #1de9b6'; // Borda mais fina
            });
        }, 100);

        // 📱 MOBILE: Remover classe app-loading para mostrar header mobile
        // (Backup de segurança caso LoadingManager.complete() não seja chamado)
        setTimeout(() => {
            document.body.classList.remove('app-loading');

            // Verificar se é dispositivo móvel real, não apenas tela pequena
            if (this.isMobileDevice()) {
                const mobileHeader = document.querySelector('.mobile-header');
                if (mobileHeader) {
                    mobileHeader.style.cssText = `
                        position: fixed !important;
                        top: 0 !important;
                        left: 0 !important;
                        right: 0 !important;
                        width: 100vw !important;
                        height: 60px !important;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
                        color: white !important;
                        display: flex !important;
                        visibility: visible !important;
                        opacity: 1 !important;
                        align-items: center !important;
                        justify-content: space-between !important;
                        padding: 0 15px !important;
                        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2) !important;
                        z-index: 2147483646 !important;
                        box-sizing: border-box !important;
                        pointer-events: auto !important;
                        backdrop-filter: blur(10px) !important;
                    `;
                    document.body.style.paddingTop = '60px';
                }
            }
        }, 500);
    }

    // 🔧 NOVO: Detectar se é realmente um dispositivo móvel
    static isMobileDevice() {
        const userAgent = navigator.userAgent || navigator.vendor || window.opera;

        // Detectar dispositivos móveis reais através do User Agent
        const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);

        // Detectar tela touch
        const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

        // Verificar largura da tela (mas só como critério adicional)
        const isSmallScreen = window.innerWidth <= 768;

        // Detectar orientação (dispositivos móveis geralmente suportam)
        const hasOrientationSupport = typeof window.orientation !== 'undefined';

        // Considerar móvel se: (tem UA móvel OU tem touch E tela pequena) E não é desktop
        const isDesktopUA = /Windows NT|Macintosh|Linux x86_64/i.test(userAgent);

        return (isMobileUA || (isTouchDevice && isSmallScreen && hasOrientationSupport)) && !isDesktopUA;
    }

    // 🔄 Método legacy para compatibilidade (caso FooterManager falhe)
    static loadLegacyFooter(userData) {
        const { authorize } = userData;
        const accountList = authorize?.account_list || [];
        const balance = userData?.balance || {};

        let accountSelectorHtml = '';

        if (accountList.length > 1) {
            accountSelectorHtml = `
                <div class="account-selector-container">
                    <div class="dropdown-wrapper">
                        <button class="account-dropdown-btn">
                            <span>${authorize?.loginid || 'N/A'}</span>
                            <span class="dropdown-arrow">▼</span>
                        </button>
                        <div class="account-dropdown-content">
                            ${accountList.map(account => {
                const loginId = account.loginid;
                const currency = account.currency;
                const hasToken = SessionManager.getTokenByLoginId(loginId);
                const statusIcon = hasToken ? '🟢' : '🟡';
                const isDisabled = !hasToken ? 'disabled' : '';
                const statusText = hasToken ? '' : '(Autorizando...)';

                return `
                                    <a href="#" class="account-item ${isDisabled}" data-loginid="${loginId}" ${!hasToken ? 'onclick="return false;"' : ''}>
                                        ${statusIcon} ${loginId} - ${currency} ${statusText}
                                    </a>
                                `;
            }).join('')}
                            <div class="dropdown-separator"></div>
                            <a href="#" class="account-item logout-item" onclick="ModalLogout.show()">
                                🚪 Sair
                            </a>
                        </div>
                    </div>
                </div>
            `;
        } else {
            accountSelectorHtml = `
                <div class="account-selector-container">
                    <span class="account-display">${authorize?.loginid || 'N/A'}</span>
                </div>
            `;
        }

        const bottomBar = document.querySelector('.bottom-bar');
        if (bottomBar) {
            bottomBar.innerHTML = `
                <div class="bottom-bar-content">
                    <div class="bottom-left-section">
                        <div id="bottom-digits-display" class="bottom-display-container bottom-digits-only"></div>
                    </div>
                    <div class="bottom-center-section">
                        <div class="bottom-account-section">
                            ${accountSelectorHtml}
                        </div>
                        <div class="bottom-balance-section">
                            <p class="bottom-balance">
                                <strong>${balance?.currency || ''} ${balance?.balance || '0.00'}</strong>
                            </p>
                        </div>
                    </div>
                    <div class="bottom-right-section">
                        <div id="bottom-price-display" class="bottom-display-container bottom-price-only"></div>
                    </div>
                </div>
            `;
        }

        // Event listeners para o dropdown
        const accountDropdownBtn = document.querySelector('.account-dropdown-btn');
        if (accountDropdownBtn) {
            accountDropdownBtn.addEventListener('click', () => {
                const dropdownContent = document.querySelector('.account-dropdown-content');
                if (dropdownContent) {
                    dropdownContent.classList.toggle('show');
                }
            });
        }

        const accountItems = document.querySelectorAll('.account-item');
        accountItems.forEach(item => {
            item.addEventListener('click', (event) => {
                event.preventDefault();
                const loginid = event.currentTarget.dataset.loginid;

                // ✅ CORREÇÃO 1: Fechar dropdown automaticamente após seleção
                const dropdownContent = document.querySelector('.account-dropdown-content');
                if (dropdownContent) {
                    dropdownContent.classList.remove('show');
                }

                AccountManager.switchAccount(loginid);
            });
        });
    }

    static displayErrorMessage(container, message) {
        container.innerHTML = `
            <h1>Erro de Inicialização</h1>
            <p class="error-message">${message}</p>
        `;
    }

    static async loadMarketBlocks(token, retryCount = 0) {
        try {
            // 🔍 Se token não está disponível, aguardar um pouco (mudança de conta)
            if (!token && retryCount < 5) {

                setTimeout(() => {
                    const newToken = SessionManager.getLocalToken();
                    this.loadMarketBlocks(newToken, retryCount + 1);
                }, 1000);
                return;
            }

            if (!token) {
                console.warn("⚠️ Token não disponível após múltiplas tentativas, renderizando blocos sem market data");
                // Renderizar blocos vazios ao invés de mostrar erro
                this.renderEmptyBlocks();
                return;
            }

            // Verificar se todas as Views estão disponíveis antes de renderizar
            if (typeof ConfigurationsView === 'undefined') {
                throw new Error('ConfigurationsView não está carregada');
            }
            if (typeof MonitoringView === 'undefined') {
                throw new Error('MonitoringView não está carregada');
            }
            if (typeof DisplayView === 'undefined') {
                throw new Error('DisplayView não está carregada');
            }

            // 🔄 Primeiro renderizar as interfaces vazias (exceto DisplayView)
            await ConfigurationsView.render('configurations-block');
            MonitoringView.render('monitoring-block');
            this.renderRulesDisplayBlock('rules-display-block');

            // ✅ NOVO: Inicializar Monitor de Probabilidade (agora no bloco 3)
            try {

                if (typeof MonitoringView !== 'undefined' && typeof MonitoringView.setupProbabilityMonitor === 'function') {

                    MonitoringView.setupProbabilityMonitor();

                }
            } catch (e) {
                console.error('❌ [UI] Erro ao inicializar Monitor de Probabilidade:', e);
            }

            this.setupRulesSync();


            // 🔌 Depois conectar e aguardar o WebSocket estar pronto

            const marketData = getMarketDataInstance(token);
            await marketData.connect();

            // ✅ Aguardar WebSocket estar completamente pronto (conectado + autorizado)

            let attempts = 0;
            const maxAttempts = 10;

            while (!marketData.isReady() && attempts < maxAttempts) {
                // ✅ HEARTBEAT: Notificar progresso para evitar reset do watchdog
                if (typeof LoadingManager !== 'undefined') {
                    LoadingManager.updateProgress(LoadingManager.currentProgress, "Sincronizando dados de mercado...");
                }
                await new Promise(resolve => setTimeout(resolve, 500));
                attempts++;

            }

            if (!marketData.isReady()) {
                throw new Error('WebSocket não conseguiu se conectar e autorizar dentro do tempo limite');
            }


            // 🔧 CORREÇÃO: Carregar configurações salvas nos campos de input
            ConfigurationsView.loadSavedConfigurationIntoUI();


            // Renderizar os dois displays separados no rodapé
            DisplayView.render('bottom-price-display', true, 'price');
            DisplayView.render('bottom-digits-display', true, 'digits');



            // 🔧 SINCRONIZAÇÃO FINAL: Garantir que DisplayView use símbolo correto após renderização
            const sessionSymbol = SessionManager.getSessionData('selected_symbol');
            const globalSymbol = window.selectedSymbol;
            const symbolSelect = document.getElementById('symbol-select');

            // Priorizar símbolos na seguinte ordem: global > sessão > select
            const symbolToUse = globalSymbol || sessionSymbol || symbolSelect?.value;


            if (window.displayViewInstance && typeof window.displayViewInstance.setSymbol === 'function') {
                if (symbolToUse) {

                    window.displayViewInstance.setSymbol(symbolToUse);

                    // Garantir que o select mostra o símbolo correto se existe
                    if (symbolSelect) {
                        if (symbolSelect.value !== symbolToUse) {

                            symbolSelect.value = symbolToUse;
                        }
                    }
                }
            } else {

                // 🔧 NOVO: Tentar novamente após um delay se DisplayView não estiver pronto
                setTimeout(() => {
                    if (window.displayViewInstance && typeof window.displayViewInstance.setSymbol === 'function' && symbolToUse) {

                        window.displayViewInstance.setSymbol(symbolToUse);
                    }
                }, 2000);
            }

            // 🎨 OBSERVADOR: Aplicar tema escuro em elementos criados dinamicamente
            const applyDarkThemeToElement = (element) => {
                // Contadores
                if (element.classList?.contains('counter-group') ||
                    element.classList?.contains('real-counters') ||
                    element.classList?.contains('simulated-counters') ||
                    element.classList?.contains('counter-item-horizontal')) {
                    element.style.backgroundColor = '#1a2332';
                    element.style.border = '0.5px solid #1de9b6';
                    element.style.color = '#e8f0f7';
                }

                // Títulos dos contadores
                if (element.classList?.contains('counter-group-title')) {
                    element.style.backgroundColor = '#1a2332';
                    element.style.color = '#1de9b6';
                }

                // Mensagem "Nenhum trade executado ainda"
                if (element.classList?.contains('no-messages')) {
                    element.style.backgroundColor = 'transparent';
                    element.style.color = '#8b9cb5';
                }
            };

            // Criar observador de mutações
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === 1) { // Element node
                            applyDarkThemeToElement(node);
                            // Aplicar também aos filhos
                            node.querySelectorAll?.('.counter-group, .real-counters, .simulated-counters, .counter-item-horizontal, .counter-group-title, .no-messages').forEach(applyDarkThemeToElement);
                        }
                    });
                });
            });

            // Observar mudanças no DOM
            observer.observe(document.body, {
                childList: true,
                subtree: true
            });

            // ⏱️ Pequena pausa para garantir que o DOM foi atualizado
            await new Promise(resolve => setTimeout(resolve, 100));

            // 🎨 FORÇAR: Aplicar tema escuro nos blocos principais
            const blocks = [
                document.getElementById('monitoring-block'),
                document.getElementById('rules-display-block'),
                document.getElementById('configurations-block')
            ];

            blocks.forEach(block => {
                if (block) {
                    block.style.backgroundColor = '#1a2332';
                    block.style.color = '#e8f0f7';
                }
            });

        } catch (error) {
            console.error("❌ Erro ao carregar dados de mercado:", error);

            // 🔄 Se for erro de token ou conexão, tentar novamente
            if (error.message.includes('token') || error.message.includes('authorize') || error.message.includes('WebSocket')) {
                if (retryCount < 3) {

                    setTimeout(() => {
                        const newToken = SessionManager.getLocalToken();
                        this.loadMarketBlocks(newToken, retryCount + 1);
                    }, 3000);
                    return;
                }
            }

            // Em caso de erro persistente, renderizar blocos com mensagem de erro
            this.renderErrorBlocks(error.message);
        }
    }

    static renderEmptyBlocks() {
        // Renderizar blocos vazios ao invés de substituir por mensagem de erro
        const configBlock = document.getElementById('configurations-block');
        const monitoringBlock = document.getElementById('monitoring-block');
        const rulesBlock = document.getElementById('rules-display-block');

        // Não fazer nada - os blocos serão renderizados pelos componentes específicos
    }

    static renderErrorBlocks(errorMessage) {
        // Renderizar blocos com erro específico ao invés de substituir tudo
        const configBlock = document.getElementById('configurations-block');
        const monitoringBlock = document.getElementById('monitoring-block');
        const rulesBlock = document.getElementById('rules-display-block');

        // Não fazer nada - os blocos serão renderizados pelos componentes específicos
    }

    static renderRulesDisplayBlock(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = `
            <div class="block-content">
                <!-- Display de Modo de Trading -->
                <div class="trading-mode-display-container">
                    <div class="mode-indicators-container">
                        <div id="active-mode-indicator" class="mode-indicator simulacao selected" data-mode="SIMULACAO">
                            <span class="mode-icon">🟡</span>
                            <span class="mode-text">SIMULAÇÃO</span>
                        </div>
                    </div>
                </div>

                <div class="rules-visual-container">
                    <div id="rules-visual-display" class="rules-visual-display">
                        <div class="rules-placeholder">
                            <div class="waiting-chart-container">
                                <div class="waiting-bars">
                                    <div class="waiting-bar"></div>
                                    <div class="waiting-bar"></div>
                                    <div class="waiting-bar"></div>
                                    <div class="waiting-bar"></div>
                                    <div class="waiting-bar"></div>
                                    <div class="waiting-bar"></div>
                                    <div class="waiting-bar"></div>
                                </div>
                                <div class="waiting-text">Aguardando regras...</div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 🎲 MONITOR DE PROBABILIDADE (REVERSÃO) - MOVIDO PARA BLOCO 3 -->
                <div class="probability-monitor-block" style="margin-top: 15px; margin-bottom: 0px; border-top: 1px solid rgba(255,255,255,0.1); border-bottom: 1px solid rgba(255,255,255,0.1); padding: 35px 10px 10px 10px; background: rgba(0, 0, 0, 0.3); border-radius: 8px 8px 0 0; position: relative; z-index: 10;">

                    <!-- 🆕 CSS para barras de força -->
                    <style>
                        .prob-card { position: relative; overflow: hidden; display: flex; flex-direction: column; align-items: center; justify-content: center; }
                        /* Barra removida conforme solicitado */

                        .strength-indicator {
                            font-size: 0.6rem;
                            padding: 2px 6px;
                            border-radius: 3px;
                            margin-top: 4px;
                            font-weight: 600;
                            text-transform: uppercase;
                            letter-spacing: 0.5px;
                        }
                        /* Cores do Indicador baseadas no Nível (Mantidas) */
                        .prob-card.strength-1 .strength-indicator { background: rgba(255, 0, 0, 0.2); color: #FF0000; }
                        .prob-card.strength-2 .strength-indicator { background: rgba(255, 128, 0, 0.2); color: #FF8000; }
                        .prob-card.strength-3 .strength-indicator { background: rgba(255, 255, 0, 0.2); color: #FFFF00; }
                        .prob-card.strength-4 .strength-indicator { background: rgba(128, 255, 0, 0.2); color: #80FF00; }
                        .prob-card.strength-5 .strength-indicator { background: rgba(0, 255, 0, 0.2); color: #00FF00; }
                    </style>


                    <!-- Overlay de Cálculo -->
                    <div id="prob-calculating-overlay" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(12, 19, 24, 0.95); display: flex; align-items: center; justify-content: center; z-index: 20; border-radius: 8px; backdrop-filter: blur(2px);">
                        <span style="color: #8b9cb5; font-size: 0.9rem; font-weight: 500; display: flex; align-items: center; gap: 8px;">
                            <span class="loading-spinner-small" style="width: 16px; height: 16px; border: 2px solid rgba(29, 233, 182, 0.3); border-top: 2px solid #1de9b6; border-radius: 50%; animation: spin 1s linear infinite;"></span>
                            Calculando estatísticas...
                        </span>
                    </div>

                    <div class="prob-content" style="display: flex; justify-content: space-between; align-items: center; background: rgba(0,0,0,0.2); border-radius: 8px; padding: 8px 12px; height: 80px;">

                        <!-- Lado Esquerdo: Maior Chance -->
                        <div class="prob-card highest" style="text-align: center; flex: 0 0 80px; position: relative;">
                            <div style="font-size: 0.6rem; color: #1de9b6; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 5px;">Maior Probabilidade</div>
                            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px;">
                                <div id="prob-high-digit" style="font-size: 1.8rem; font-weight: bold; color: white; line-height: 1; text-shadow: 0 0 10px rgba(29, 233, 182, 0.3);">-</div>
                                <div id="prob-high-pct" style="display: flex; flex-direction: column; align-items: center; font-size: 0.85rem; color: #1de9b6; font-weight: 500;">
                                    <span>--%</span>
                                    <div class="strength-bar-container">
                                        <div class="strength-bar-fill" style="width: 0%"></div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Centro: Lista de Probabilidades (Ordenada) -->
                        <div id="prob-middle-list" style="flex: 1; display: flex; justify-content: center; align-items: center; gap: 12px; margin: 0 20px;">
                            <!-- Serão inseridos via JS: <div class="middle-digit-badge">X</div> -->
                        </div>

                        <!-- Lado Direito: Menor Chance -->
                        <div class="prob-card lowest" style="text-align: center; flex: 0 0 80px; position: relative;">
                            <div style="font-size: 0.6rem; color: #dc3545; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 5px;">Menor Probabilidade</div>
                            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px;">
                                <div id="prob-low-digit" style="font-size: 1.8rem; font-weight: bold; color: white; line-height: 1; text-shadow: 0 0 10px rgba(220, 53, 69, 0.3);">-</div>
                                <div id="prob-low-pct" style="display: flex; flex-direction: column; align-items: center; font-size: 0.85rem; color: #dc3545; font-weight: 500;">
                                    <span>--%</span>
                                    <div class="strength-bar-container">
                                        <div class="strength-bar-fill" style="width: 0%"></div>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>

                 <!-- Visor de Contadores de Ganhos e Perdas -->
                <div class="counters-display-container" style="margin-top: 0;">

                    <div class="counters-grid">
                        <div class="counter-group real-counters">
                            <div class="counter-group-title">TRADES REAIS</div>
                            <div class="counter-items-horizontal">
                                <div class="counter-item-horizontal">
                                    <span class="counter-label">Vitórias</span>
                                    <span id="real-wins-counter" class="counter-value wins">0</span>
                                </div>
                                <div class="counter-item-horizontal">
                                    <span class="counter-label">Perdas</span>
                                    <span id="real-losses-counter" class="counter-value losses">0</span>
                                </div>
                            </div>
                        </div>
                        <div class="counter-group simulated-counters">
                            <div class="counter-group-title">TRADES SIMULADOS</div>
                            <div class="counter-items-horizontal">
                                <div class="counter-item-horizontal">
                                    <span class="counter-label">Vitórias</span>
                                    <span id="simulated-wins-counter" class="counter-value wins">0</span>
                                </div>
                                <div class="counter-item-horizontal">
                                    <span class="counter-label">Perdas</span>
                                    <span id="simulated-losses-counter" class="counter-value losses">0</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Adicionar event listeners para os botões de modo (apenas visual, não funcional)
        // Removido - botões são apenas decorativos
        // this.attachModeDisplayListeners();

        // 🔧 CORREÇÃO: Verificar modo atual do TradeManager e atualizar interface
        setTimeout(() => {
            if (window.tradeManager || (typeof getTradeManagerInstance === 'function')) {
                const tradeManager = window.tradeManager || getTradeManagerInstance();
                if (tradeManager && typeof tradeManager.getCurrentMode === 'function') {
                    const currentMode = tradeManager.getCurrentMode();

                    this.updateModeSelector(currentMode);

                    // ✅ NOVO: Atualizar contadores iniciais
                    this.updateTradingCounters();
                }
            }
        }, 100); // Pequeno delay para garantir que tudo esteja carregado
    }

    static setupRulesSync() {
        // Event listener para atualização de regras
        window.addEventListener('rulesUpdated', (event) => {
            try {

                this.updateRulesDisplay(event.detail);

            } catch (error) {
                console.error('❌ [UI] Error updating rules display:', error);
                console.error('Stack trace:', error.stack);
                // Show error to user
                if (typeof CommonHelpers !== 'undefined' && CommonHelpers.showError) {
                    CommonHelpers.showError('Erro ao atualizar visualização de regras. Tente parar e iniciar novamente.');
                }
            }
        });

        // 🔧 CORREÇÃO: Event listener para mudanças de modo
        window.addEventListener('modeChanged', (event) => {
            const { mode, reason, visualDelay } = event.detail;

            // Se não há delay visual explicito, atualizar normally
            if (!visualDelay) {
                this.updateModeSelector(mode);
            }
            // Atualizar contadores quando modo mudar
            this.updateTradingCounters();
        });

        // ✅ NOVO: Event listener para fim de cooldown - aplicar mudanças visuais pendentes
        window.addEventListener('cooldownEnded', (event) => {

            // Aplicar mudança visual de modo pendente
            if (UIManager.pendingModeVisualUpdate) {

                this.updateModeSelector(UIManager.pendingModeVisualUpdate);
                UIManager.pendingModeVisualUpdate = null;
            }

            // Aplicar outras atualizações visuais se necessário
            if (window.tradeManager && typeof window.tradeManager.applyPendingVisualUpdates === 'function') {
                window.tradeManager.applyPendingVisualUpdates();
            }
        });

        // ✅ NOVO: Event listener para atualização de tradeExecuted
        window.addEventListener('tradeExecuted', (event) => {
            this.updateTradingCounters();
        });

        // 📊 NOVO: Event listener para limpeza de contadores de histórico
        window.addEventListener('historyCountersCleared', (event) => {
            this.updateTradingCounters();
        });
    }

    // Adicionar listeners para o display visual dos modos (apenas visual)
    static attachModeDisplayListeners() {
        const modeOptions = document.querySelectorAll('.mode-option');

        modeOptions.forEach(option => {
            option.addEventListener('click', async (e) => {
                const selectedMode = e.target.dataset.mode;


                try {
                    // 🔐 SEGURANÇA: Verificar se troca de conta é necessária
                    const currentUser = SessionManager.getCurrentUser();
                    const userIsVirtual = currentUser?.authorize?.is_virtual;
                    const userLoginId = currentUser?.authorize?.loginid;


                    // 🚨 Verificar se necessário trocar de conta
                    const needsAccountSwitch = (selectedMode === 'VIRTUAL' && !userIsVirtual) ||
                        (selectedMode === 'REAL' && userIsVirtual);

                    if (needsAccountSwitch) {
                        const message = selectedMode === 'VIRTUAL'
                            ? 'Para usar modo VIRTUAL, você precisa trocar para uma conta virtual.'
                            : 'Para usar modo REAL, você precisa trocar para uma conta real.';

                        console.warn(`🚨 [MODE CHANGE] ${message}`);
                        alert(`${message} Por favor, use o menu de contas no topo da página.`);
                        return;
                    }

                    // 🔧 CORREÇÃO: Mudar modo REAL no TradeManager
                    if (window.tradeManager || (typeof getTradeManagerInstance === 'function')) {
                        const tradeManager = window.tradeManager || getTradeManagerInstance();
                        if (tradeManager && typeof tradeManager.setMode === 'function') {
                            tradeManager.setMode(selectedMode);

                        }
                    }

                    // 🎯 Atualizar interface visual (ambos os seletores)
                    this.updateModeSelector(selectedMode);
                    this.updateTradingModeDisplay(selectedMode);

                } catch (error) {
                    console.error(`❌ Erro ao alterar modo para ${selectedMode}:`, error);
                    alert(`Erro ao alterar modo: ${error.message}`);
                }
            });
        });
    }

    // Atualizar display de modos dinamicamente (APENAS VISUAL) - Modo único ativo
    static updateModeSelector(nextMode) {

        const activeModeIndicator = document.getElementById('active-mode-indicator');

        if (!activeModeIndicator) {
            console.warn('⚠️ [MODE SELECTOR] Indicador de modo ativo não encontrado');
            return;
        }

        // 🔄 CRÍTICO: Verificar se cooldown está ativo antes de atualizar visual
        const isCooldownActive = typeof CooldownOverlay !== 'undefined' &&
            CooldownOverlay.isCooldownActive && CooldownOverlay.isCooldownActive();

        if (isCooldownActive) {

            // Salvar mudança pendente para aplicar após cooldown
            UIManager.pendingModeVisualUpdate = nextMode;
            return;
        }

        // 🔧 CORREÇÃO: Debounce mais robusto para evitar atualizações múltiplas
        clearTimeout(this.modeUpdateTimeout);
        this.modeUpdateTimeout = setTimeout(() => {
            // Normalizar modo para comparação (remover acentos e converter para maiúsculo)
            const normalizedNextMode = nextMode?.toUpperCase().replace('Ã', 'A'); // SIMULAÇÃO → SIMULACAO

            // Determinar configuração do modo ativo
            let modeConfig = {
                icon: '',
                text: 'SIMULAÇÃO',
                className: 'simulacao',
                dataMode: 'SIMULACAO'
            };

            if (normalizedNextMode === 'REAL') {
                modeConfig = {
                    icon: '',
                    text: 'REAL',
                    className: 'real',
                    dataMode: 'REAL'
                };
            } else if (normalizedNextMode === 'VIRTUAL') {
                modeConfig = {
                    icon: '',
                    text: 'VIRTUAL',
                    className: 'virtual',
                    dataMode: 'VIRTUAL'
                };
            }

            // Atualizar o indicador único
            activeModeIndicator.className = `mode-indicator ${modeConfig.className} selected`;
            activeModeIndicator.dataset.mode = modeConfig.dataMode;

            const modeIcon = activeModeIndicator.querySelector('.mode-icon');
            const modeText = activeModeIndicator.querySelector('.mode-text');

            if (modeIcon) modeIcon.textContent = modeConfig.icon;
            if (modeText) modeText.textContent = modeConfig.text;


        }, 100); // Aumentado para 100ms para maior estabilidade
    }

    // Método para atualizar modo de trading no seletor (COMPLETAMENTE DESABILITADO)
    static updateTradingModeDisplay(status) {
        // 🔧 CORREÇÃO TOTAL: Não fazer NADA que possa criar elementos visuais
        // O modo de trading é exibido exclusivamente nos indicadores do bloco de regras

        // Remover qualquer elemento flutuante existente se encontrado
        const existingDisplay = document.getElementById('trading-mode-display');
        if (existingDisplay) {
            existingDisplay.remove();

        }


    }

    // Método de atualização visual legado (manter compatibilidade)
    static updateTradingModeDisplayLegacy(nextMode, description = '') {
        // Atualizar seleção visual
        const modeOptions = document.querySelectorAll('.mode-option');
        modeOptions.forEach(option => {
            option.classList.remove('selected');
            if (option.dataset.mode === nextMode) {
                option.classList.add('selected');
            }
        });

        // Atualizar descrição (REMÓTODO - elemento removido da UI)
        // Elemento 'next-mode-description' não existe mais

    }

    // 🔄 CORRIGIDO: Processar estrutura de GRUPOS corretamente AGORA COM DOM DIFFING
    static updateRulesDisplay(rulesData) {
        const uiStartTime = performance.now();
        const rulesContainer = document.getElementById('rules-visual-display');
        if (!rulesContainer) {
            console.error('❌ [UI] rules-visual-display container not found!');
            return;
        }

        if (!rulesData) {
            console.error('❌ [UI] rulesData is null or undefined!');
            return;
        }


        // 🔧 MELHORADO: Verificar se cooldown está realmente ativo
        const isCooldownActive = typeof CooldownOverlay !== 'undefined' &&
            CooldownOverlay.isCooldownActive && CooldownOverlay.isCooldownActive();

        const existingCooldown = rulesContainer.querySelector('.cooldown-overlay-modal') ||
            rulesContainer.closest('.rules-visual-container')?.querySelector('.cooldown-overlay-modal');

        // 🔧 FIX: Permitir atualizações mesmo com cooldown (para mostrar status 'satisfied-cooldown')
        // O overlay deve ser gerenciado separadamente (z-index superior) sem bloquear updates visuais abaixo dele

        // 🔧 CORREÇÃO: Se overlay existe mas cooldown não está ativo, remover overlay órfão
        if (existingCooldown && !isCooldownActive) {
            existingCooldown.remove();
        }

        // 🔄 NOVO: Cachear regras para restauração após cooldown
        UIManager.lastRulesData = rulesData;

        // ✅ NOVA ESTRUTURA: verificar grupos

        if (!rulesData.groups || rulesData.groups.length === 0) {

            // ⚠️ COMPATIBILIDADE: se não há grupos, verificar regras individuais (legado)
            if (!rulesData.rules || rulesData.rules.length === 0) {

                rulesContainer.innerHTML = `
                    <div class="rules-placeholder">
                        <div class="waiting-chart-container">
                            <div class="waiting-bars">
                                <div class="waiting-bar"></div>
                                <div class="waiting-bar"></div>
                                <div class="waiting-bar"></div>
                                <div class="waiting-bar"></div>
                                <div class="waiting-bar"></div>
                                <div class="waiting-bar"></div>
                                <div class="waiting-bar"></div>
                            </div>
                            <div class="waiting-text">Aguardando regras...</div>
                        </div>
                    </div>
                `;
                return;
            }


            // Processo legado para regras individuais (Mantido simplificado, mas idealmente deveria migrar)
            const rulesHtml = rulesData.rules.map(rule => {
                const statusClass = rule.status || 'waiting';
                return `
                    <div class="rule-visual-item ${statusClass}" data-rule-id="${rule.id}">
                        ${rule.displayText || rule.text || 'Regra Indefinida'}
                    </div>
                `;
            }).join('');

            rulesContainer.innerHTML = `<div class="rules-visual-display">${rulesHtml}</div>`;
            return;
        }

        // ✅ NOVA LÓGICA COM DOM DIFFING
        // Verificar se precisamos criar a estrutura base (se container estiver vazio ou com placeholder)
        const rulesWrapper = rulesContainer.querySelector('.rules-visual-display');

        // Se não existe wrapper ou se tem placeholder/conteúdo antigo incompatível, reconstruir estrutura base
        if (!rulesWrapper || rulesWrapper.querySelector('.rules-placeholder')) {
            let groupsHtml = '';
            rulesData.groups.forEach((group) => {
                // Construção inicial HTML
                groupsHtml += `
                    <div class="rule-group group-waiting" data-group-id="${group.id}">
                        <div class="group-header">
                            <span class="group-label">Regra Grupo ${group.id}</span>
                        </div>
                        <div class="group-rules">
                 `;

                (group.rules || []).forEach((rule) => {
                    groupsHtml += `
                        <div class="rule-visual-item grouped-rule grouped" data-rule-id="${rule.id}">
                            ${rule.displayText || 'Regra Indefinida'}
                        </div>
                     `;
                });

                groupsHtml += '</div></div>';
            });

            rulesContainer.innerHTML = `
                <div class="rules-visual-display">
                    ${groupsHtml}
                </div>
            `;
            // Após criar a estrutura, ainda chamamos a atualização para garantir estilos corretos
        }

        // ⚡ ALGORITMO DE DOM DIFFING / ATUALIZAÇÃO IN-PLACE
        // Agora vamos atualizar os elementos existentes sem destruir o DOM
        const currentWrapper = rulesContainer.querySelector('.rules-visual-display');
        if (!currentWrapper) return; // Should not happen

        rulesData.groups.forEach(group => {
            // 1. Encontrar o elemento do grupo
            let groupEl = currentWrapper.querySelector(`.rule-group[data-group-id="${group.id}"]`);

            // Se grupo não existe (mudança estrutural dinâmica!), precisamos reconstruir tudo
            // (Assumimos que estrutura de grupos é estável na maioria dos casos)
            if (!groupEl) {
                // Fallback para reconstrução se estrutura mudou
                // Isso pode acontecer se o usuário editou regras
                return;
            }

            const rules = group.rules || [];

            // 2. Atualizar status do grupo
            const groupStatusStartTime = performance.now();
            const groupStatus = this.determineGroupStatus(rules);
            const groupStatusDuration = performance.now() - groupStatusStartTime;
            if (groupStatusDuration > 1) {
                console.warn(`[PERF] determineGroupStatus took ${groupStatusDuration.toFixed(2)}ms`);
            }

            // Remover classes de status antigas
            groupEl.classList.remove('group-waiting', 'group-satisfied', 'group-failed', 'group-satisfied-cooldown');
            // Adicionar nova classe
            groupEl.classList.add(`group-${groupStatus}`);

            // 3. Atualizar regras individuais dentro do grupo
            rules.forEach(rule => {
                const ruleEl = groupEl.querySelector(`.rule-visual-item[data-rule-id="${rule.id}"]`);
                if (ruleEl) {
                    // Verificar se o texto mudou para evitar reflow desnecessário
                    const newText = rule.displayText || 'Regra Indefinida';
                    if (ruleEl.innerHTML.trim() !== newText.trim()) {
                        ruleEl.innerHTML = newText;
                    }

                    // Regras agrupadas também podem ter classes de update visual se desejado no futuro
                    // Por enquanto mantemos 'grouped-rule grouped' estático

                    // Se quisermos destacar regras que falharam/sucesso individualmente dentro do grupo:
                    // ruleEl.dataset.status = rule.status;
                }
            });
        });

        // 🔧 PROTEÇÃO PARA OVERLAY: Preservar overlay durante atualizações
        const existingOverlayCheck = rulesContainer.querySelector('.cooldown-overlay-modal');
        // Se overlay sumiu por algum motivo e deveria estar lá (embora diffing deva preservar), aqui seria o lugar de restaurar, 
        // mas com diffing ele deve permanecer intacto se for filho de rulesContainer mas fora de rules-visual-display? 
        // Na estrutura atual o overlay é frequentemente injetado diretamente.

        // No código original, o overlay era reanexado. 
        // Como agora não estamos zerando o innerHTML, o overlay deve ser preservado se ele estiver appended no rulesContainer (fora do wrapper) 
        // ou se formos cuidadosos.

        const uiDuration = performance.now() - uiStartTime;
        if (uiDuration > 10) {
            console.warn(`[PERF] UIManager.updateRulesDisplay total: ${uiDuration.toFixed(2)}ms`);
        }
    }

    // Determinar status do grupo baseado no status das regras
    static determineGroupStatus(rules) {
        if (!rules || rules.length === 0) {
            return 'waiting';
        }

        // ✅ NOVO: Verificar se há regras atendidas durante cooldown
        const allSatisfiedCooldown = rules.every(rule => rule.status === 'satisfied-cooldown');
        if (allSatisfiedCooldown) {
            return 'satisfied-cooldown';
        }

        // Se todas as regras estão satisfeitas (e não há cooldown), o grupo está satisfeito
        const allSatisfied = rules.every(rule => rule.status === 'satisfied');
        if (allSatisfied) {
            return 'satisfied';
        }

        // ✅ NOVO: Status misto - algumas atendidas durante cooldown, outras não
        const anySatisfiedCooldown = rules.some(rule => rule.status === 'satisfied-cooldown');
        if (anySatisfiedCooldown) {
            return 'satisfied-cooldown';
        }

        // Se alguma regra falhou, o grupo falhou
        const anyFailed = rules.some(rule => rule.status === 'failed');
        if (anyFailed) {
            return 'failed';
        }

        // Caso contrário, o grupo está aguardando
        return 'waiting';
    }

    // 🎨 NOVO: Mostrar loading suave nos blocos durante troca de conta
    static showBlocksLoading() {
        const blocks = ['configurations-block', 'monitoring-block', 'rules-display-block'];

        blocks.forEach(blockId => {
            const block = document.getElementById(blockId);
            if (block) {
                // Adicionar overlay de loading no bloco
                const overlay = document.createElement('div');
                overlay.className = 'block-loading-overlay';
                overlay.innerHTML = `
                    <div class="block-loading-content">
                        <div class="block-loading-spinner"></div>
                        <div class="block-loading-text">Atualizando...</div>
                    </div>
                `;

                // Adicionar estilos se não existirem
                this.addBlockLoadingStyles();

                block.style.position = 'relative';
                block.appendChild(overlay);

                // Animar entrada
                setTimeout(() => {
                    overlay.style.opacity = '1';
                }, 10);
            }
        });
    }

    // 🎨 NOVO: Esconder loading dos blocos
    static hideBlocksLoading(success = true) {
        const overlays = document.querySelectorAll('.block-loading-overlay');

        overlays.forEach(overlay => {
            if (success) {
                // Mostrar sucesso brevemente
                const text = overlay.querySelector('.block-loading-text');
                const spinner = overlay.querySelector('.block-loading-spinner');

                if (text && spinner) {
                    spinner.style.display = 'none';
                    text.textContent = 'Atualizado';
                    text.style.color = '#28a745';
                }

                setTimeout(() => {
                    overlay.style.opacity = '0';
                    setTimeout(() => overlay.remove(), 300);
                }, 500);
            } else {
                overlay.style.opacity = '0';
                setTimeout(() => overlay.remove(), 300);
            }
        });
    }

    // 🎨 NOVO: Adicionar estilos para loading dos blocos
    static addBlockLoadingStyles() {
        if (document.getElementById('block-loading-styles')) return;

        const style = document.createElement('style');
        style.id = 'block-loading-styles';
        style.textContent = `
            .block-loading-overlay {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(255, 255, 255, 0.9);
                backdrop-filter: blur(2px);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 1000;
                opacity: 0;
                transition: opacity 0.3s ease;
                border-radius: 8px;
            }

            .block-loading-content {
                text-align: center;
                color: #495057;
            }

            .block-loading-spinner {
                width: 30px;
                height: 30px;
                border: 3px solid #f3f3f3;
                border-top: 3px solid #007bff;
                border-radius: 50%;
                animation: blockLoadingSpin 1s linear infinite;
                margin: 0 auto 10px;
            }

            @keyframes blockLoadingSpin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }

            .block-loading-text {
                font-size: 0.9em;
                font-weight: 500;
            }
        `;

        document.head.appendChild(style);
    }

    // Atualizar contadores visuais
    static updateTradingCounters() {
        try {
            const tradeManager = getTradeManagerInstance();
            const counters = tradeManager.getCounters();


            // Atualizar contador real (vitórias | perdas)
            const realCounterElement = document.getElementById('real-counter-display');
            if (realCounterElement) {
                realCounterElement.textContent = `V: ${counters.realWinsStreak} | P: ${counters.realLossesStreak}`;
            }

            // Atualizar vitórias simuladas
            const simulatedWinsElement = document.getElementById('simulated-wins-display');
            if (simulatedWinsElement) {
                simulatedWinsElement.textContent = (counters.simulatedWinsStreak || 0).toString();
            }

            // Atualizar perdas simuladas
            const simulatedLossesElement = document.getElementById('simulated-losses-display');
            if (simulatedLossesElement) {
                simulatedLossesElement.textContent = counters.simulatedLossesStreak.toString();
            }

            // ✅ NOVO: Atualizar visor de contadores detalhado
            this.updateCountersDisplay(counters);

        } catch (error) {
            console.error('❌ [COUNTER UPDATE] Erro ao atualizar contadores:', error);
        }
    }

    // ✅ NOVA FUNÇÃO: Atualizar visor detalhado de contadores
    static updateCountersDisplay(counters) {
        try {
            const tradeManager = getTradeManagerInstance();
            const historyCounters = tradeManager.getHistoryCounters();

            // 📊 NOVO: Usar contadores de histórico independentes para o visor
            const realWinsElement = document.getElementById('real-wins-counter');
            const realLossesElement = document.getElementById('real-losses-counter');
            const simulatedWinsElement = document.getElementById('simulated-wins-counter');
            const simulatedLossesElement = document.getElementById('simulated-losses-counter');

            if (realWinsElement) {
                realWinsElement.textContent = historyCounters.realWinsTotal.toString();
            }
            if (realLossesElement) {
                realLossesElement.textContent = historyCounters.realLossesTotal.toString();
            }
            if (simulatedWinsElement) {
                simulatedWinsElement.textContent = historyCounters.simulatedWinsTotal.toString();
            }
            if (simulatedLossesElement) {
                simulatedLossesElement.textContent = historyCounters.simulatedLossesTotal.toString();
            }

            // 📊 Note: Total trades and win rate calculations kept for potential future use
            // Elements removed from UI as per user request
        } catch (error) {
            console.error('❌ [COUNTER DISPLAY] Erro ao atualizar contadores de histórico:', error);
        }
    }
}