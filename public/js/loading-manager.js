// Gerenciador da tela de loading
// O SISTEMA DEVE SER 100% ISOLADO POR USUARIO

class LoadingManager {
    static currentProgress = 0;
    static progressSteps = [
        { progress: 10, key: "Inicializando sistema..." },
        { progress: 20, key: "Validando sessão..." },
        { progress: 30, key: "Verificando autenticação..." },
        { progress: 50, key: "Conectando ao servidor..." },
        { progress: 65, key: "Buscando dados da conta..." },
        { progress: 75, key: "Carregando configurações..." },
        { progress: 85, key: "Inicializando interface..." },
        { progress: 95, key: "Preparando dados de mercado..." },
        { progress: 100, key: "Concluído" }
    ];

    // Frases promocionais rotativas
    static promotionalPhrases = [];
    static phraseInterval = null;

    // 🛡️ WATCHDOG: Monitorar travamentos na inicialização
    static watchdogInterval = null;
    static lastProgressUpdate = Date.now();
    static watchdogPaused = false;
    static WATCHDOG_TIMEOUT = 5000; // REDUZIDO: 5 segundos sem atividade = travou

    // Inicializar a tela de loading
    static init() {

        // 🛡️ INICIAR WATCHDOG IMEDIATAMENTE
        this.startWatchdog();

        // ⚡ VERIFICAÇÃO IMEDIATA DOS ELEMENTOS
        const elements = {
            progressFill: document.getElementById('progress-fill'),
            progressPercentage: document.getElementById('progress-percentage'),
            progressText: document.getElementById('progress-text'),
            promotionalPhrase: document.getElementById('promotional-phrase')
        };


        // ⚡ PROGRESSO IMEDIATO - SEM AGUARDAR
        if (elements.progressFill) {
            elements.progressFill.style.width = '10%';

        }
        if (elements.progressPercentage) {
            elements.progressPercentage.textContent = '10%';

        }
        if (elements.progressText) {
            elements.progressText.textContent = 'Inicializando sistema...';
        }

        // ⚡ FORÇAR REPAINT VISUAL
        document.body.offsetHeight;
        window.requestAnimationFrame(() => { });

        this.currentProgress = 10;
        this.lastProgressUpdate = Date.now(); // Resetar timer
        this.startPromotionalPhrases();


        // ⚡ CONTINUAR COM PROGRESSO NORMAL
        setTimeout(() => {
            this.updateProgress(20, "loading.states.validating_session");
        }, 100);
    }

    // 🛡️ Iniciar monitoramento
    static startWatchdog() {
        if (this.watchdogInterval) clearInterval(this.watchdogInterval);

     
        this.lastProgressUpdate = Date.now();

        this.watchdogInterval = setInterval(() => {
            if (this.watchdogPaused) return;

            const timeSinceLastUpdate = Date.now() - this.lastProgressUpdate;

            // Se passou do limite e não completou
            if (timeSinceLastUpdate > this.WATCHDOG_TIMEOUT && this.currentProgress < 100) {
                console.error(`🚨 [WATCHDOG] Travamento detectado! Sem progresso há ${Math.floor(timeSinceLastUpdate / 1000)}s. Reiniciando...`);

                // Mostrar feedback visual antes de recarregar
                const progressText = document.getElementById('progress-text');
                if (progressText) {
                    progressText.textContent = "Problema detectado. Reiniciando sistema...";
                    progressText.style.color = '#ff6b6b';
                }

                this.stopWatchdog();

                // Forçar reload após 1s
                setTimeout(() => {
                    window.location.reload();
                }, 1000);
            }
        }, 1000);
    }

    // 🛡️ Parar monitoramento
    static stopWatchdog() {
        if (this.watchdogInterval) {
            clearInterval(this.watchdogInterval);
            this.watchdogInterval = null;
        }
    }

    // 🛡️ Pausar temporariamente (ex: durante modais de interação)
    static pauseWatchdog() {
        this.watchdogPaused = true;
       
    }

    // 🛡️ Retomar monitoramento
    static resumeWatchdog() {
        this.watchdogPaused = false;
        this.lastProgressUpdate = Date.now(); // Resetar tempo ao retomar
     
    }

    // 🛡️ NOVO: Ajustar timeout do watchdog dinamicamente
    static setWatchdogTimeout(seconds) {
        this.WATCHDOG_TIMEOUT = seconds * 1000;
     
        // Trigger update para o novo timeout ter efeito imediato se necessário
        this.lastProgressUpdate = Date.now();
    }

    // Atualizar o progresso
    static updateProgress(percentage, text = null) {
        // ✅ ATUALIZAR TIMESTAMP DO WATCHDOG
        this.lastProgressUpdate = Date.now();

        // ✅ LOG IMEDIATO E VISÍVEL
        const timestamp = new Date().toISOString().split('T')[1].split('.')[0];

        const progressFill = document.getElementById('progress-fill');
        const progressPercentage = document.getElementById('progress-percentage');
        const progressText = document.getElementById('progress-text');

        if (progressFill) {
            progressFill.style.width = `${percentage}%`;

            // Forçar repaint visual
            progressFill.offsetWidth;
        } else {
            console.warn(`⚠️ [${timestamp}] progress-fill NÃO ENCONTRADO`);
        }

        if (progressPercentage) {
            progressPercentage.textContent = `${Math.round(percentage)}%`;

            progressPercentage.offsetWidth;
        } else {
            console.warn(`⚠️ [${timestamp}] progress-percentage NÃO ENCONTRADO`);
        }

        if (text && progressText) {
            progressText.textContent = text;

            progressText.offsetWidth;
        } else if (text) {
            console.warn(`⚠️ [${timestamp}] progress-text NÃO ENCONTRADO`);
        }

        this.currentProgress = percentage;

        // Forçar processamento imediato no navegador
        window.requestAnimationFrame(() => { });
    }

    // Avançar para o próximo passo automático
    static nextStep() {
        const nextStep = this.progressSteps.find(step => step.progress > this.currentProgress);
        if (nextStep) {
            this.updateProgress(nextStep.progress, nextStep.key);
        }
    }

    // Pular para um passo específico
    static goToStep(stepKey, customProgress = null) {
        const step = this.progressSteps.find(s => s.key === stepKey || s.key.endsWith(stepKey));
        if (step) {
            this.updateProgress(customProgress || step.progress, step.key);
        } else if (customProgress) {
            this.updateProgress(customProgress, stepKey);
        }
    }

    // Parar a animação (para OAuth redirect)
    static pauseForAuth() {
        this.updateProgress(this.currentProgress, 'Redirecionando para autenticação...');
        this.stopPromotionalPhrases();
    }

    // Retomar após OAuth
    static resumeAfterAuth() {
        this.goToStep("Conectando ao servidor...", 50);
        this.startPromotionalPhrases();
    }

    // Iniciar rotação das frases promocionais
    static startPromotionalPhrases() {
        // Carregar frases hardcoded em Português
        const phrases = [
            "Você sabia? O Gemini analisa padrões de entropia para evitar bloqueios.",
            "Dica: Regras com mais dígitos de confirmação tendem a ser mais seguras.",
            "O Robô opera 24/7. Deixe a tecnologia trabalhar enquanto você descansa.",
            "Gestão de banca é o segredo do sucesso no trade algorítmico.",
            "Dica: No modo Real, comece sempre com valores pequenos para testar sua regra.",
            "O sistema simula vitorias e derrotas com 99% de precisão antes de entrar real.",
            "Acompanhe o monitor de probabilidades para ver a força da sua tendência.",
            "Use o 'Filtro de Risco' para pausar o robô automaticamente em mercados ruins.",
            "Nossas estratégias pré-definidas são baseadas em modelos matemáticos reais.",
            "Otimize seu lucro configurando corretamente o Martingale na aba de sessão."
        ];
        if (Array.isArray(phrases) && phrases.length > 0) {
            this.promotionalPhrases = phrases;
        }

        // Mostrar primeira frase imediatamente
        this.updatePromotionalPhrase();

        // Configurar rotação das frases a cada 4 segundos
        this.phraseInterval = setInterval(() => {
            this.updatePromotionalPhrase();
        }, 4000);
    }

    // Atualizar frase promocional atual
    static updatePromotionalPhrase() {
        const phraseElement = document.getElementById('promotional-phrase');
        if (!phraseElement) return;

        // ⚡ OTIMIZAÇÃO: Usar requestAnimationFrame para sincronizar com o navegador
        // Fade out
        requestAnimationFrame(() => {
            phraseElement.style.opacity = '0';
            phraseElement.style.transform = 'translateY(20px)';

            // ⚡ Aguardar transição CSS (300ms) de forma otimizada
            requestAnimationFrame(() => {
                setTimeout(() => {
                    // ⚡ BATCH: Agrupar todas as operações DOM em um único frame
                    requestAnimationFrame(() => {
                        // Atualizar texto
                        phraseElement.textContent = this.promotionalPhrases[this.currentPhraseIndex];

                        // Fade in (batch de estilos)
                        phraseElement.style.cssText = `
                            opacity: 1;
                            transform: translateY(0);
                        `;

                        // 🎲 Próxima frase ALEATÓRIA (sem repetições consecutivas)
                        let newIndex;
                        do {
                            newIndex = Math.floor(Math.random() * this.promotionalPhrases.length);
                        } while (newIndex === this.currentPhraseIndex && this.promotionalPhrases.length > 1);
                        this.currentPhraseIndex = newIndex;
                    });
                }, 300);
            });
        });
    }

    // Parar rotação das frases
    static stopPromotionalPhrases() {
        if (this.phraseInterval) {
            clearInterval(this.phraseInterval);
            this.phraseInterval = null;
        }
    }

    // Finalizar loading e mostrar interface
    static async complete() {

        const loadingScreen = document.getElementById('loading-screen');
        const appContainer = document.getElementById('app-container');

        if (loadingScreen && appContainer) {

            this.stopPromotionalPhrases();

            // 🛑 NOVO: Aguardar dados de mercado antes de liberar o UI
            // Isso previne que o rodapé apareça vazio
            await this.waitForInitialMarketData();

            this.waitForButtonImagesLoad(() => {

                setTimeout(() => {

                    loadingScreen.style.opacity = '0';
                    setTimeout(() => {

                        loadingScreen.style.display = 'none';

                        appContainer.classList.remove('app-container-hidden');

                        document.body.classList.remove('app-loading');
                        if (window.innerWidth <= 768) {
                            setTimeout(() => {
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
                            }, 100);
                        }

                        // Notificação de bônus gerenciada em app-manager.js

                        // 👤 NOVO: Criar badge de usuário APÓS loading completo
                        setTimeout(() => {
                            if (typeof UserLevelsManager !== 'undefined' && UserLevelsManager.updateUserLevelBadge) {
                                UserLevelsManager.updateUserLevelBadge();
                            }
                        }, 500);

                        // 📚 Garantir que o manual de ajuda seja inicializado após loading completo
                        setTimeout(() => {
                            if (typeof HelpManual !== 'undefined' && HelpManual.init) {

                                HelpManual.init();
                            }
                        }, 1000);
                    }, 300);
                }, 500);
            });
        }
    }

    // 🛑 NOVO: Aguardar dados de mercado confirmados
    static waitForInitialMarketData() {
        return new Promise((resolve) => {
            // Se já temos dados válidos no footer, liberar imediatamente
            const footerBalance = document.querySelector('.vip-balance strong, .balance strong');
            if (footerBalance && footerBalance.textContent !== 'USD 0.00' && footerBalance.textContent.trim() !== '') {
                return resolve();
            }

            // Atualizar texto de loading para feedback
            this.updateProgress(96, "Sincronizando dados de mercado...");

            let resolved = false;
            const safeResolve = () => {
                if (!resolved) {
                    resolved = true;
                    resolve();
                }
            };

            // 1. Escutar evento de update de mercado
            const marketHandler = (e) => {
                if (e.detail && (e.detail.lastPrice || e.detail.balance)) {
                    window.removeEventListener('marketDataUpdate', marketHandler);
                    safeResolve();
                }
            };
            window.addEventListener('marketDataUpdate', marketHandler);

            // 2. Escutar evento de update de saldo
            const balanceHandler = (e) => {
                if (e.detail && (e.detail.balance || e.detail.total)) {
                    window.removeEventListener('balanceUpdated', balanceHandler);
                    safeResolve();
                }
            };
            window.addEventListener('balanceUpdated', balanceHandler);

            // 3. Verificar periodicamente se os dados chegaram (polling seguro)
            const checkInterval = setInterval(() => {
                const currentUser = SessionManager?.getCurrentUser();
                if (currentUser && (currentUser.balance || currentUser.loginid)) {
                    // Verificar se o footerManager já atualizou algo
                    const currentFooterPrice = document.querySelector('.footer-price-display');
                    if (currentFooterPrice) {
                        clearInterval(checkInterval);
                        safeResolve();
                    }
                }
            }, 500);

            // 4. Timeout de segurança (8 segundos) - NUNCA travar o usuário para sempre
            // 4. Timeout de segurança (REMOVIDO: Não forçar UI sem dados)
            // Em vez de travar, avisa e continua tentando
            const connectionCheckInterval = setInterval(() => {
                if (!resolved) {
                    this.updateProgress(97, "Aguardando dados de mercado (Tente recarregar se demorar)...");
                    console.warn('⏳ [LOADING] Ainda aguardando dados de mercado...');

                    // Tentar reconectar ou verificar estado
                    if (window.marketDataInstance && !window.marketDataInstance.isReady()) {
                        window.marketDataInstance.connect();
                    }
                } else {
                    clearInterval(connectionCheckInterval);
                }
            }, 5000);
        });
    }

    // 🖼️ NOVO: Aguardar carregamento das imagens dos botões de monitoramento
    static waitForButtonImagesLoad(callback) {

        this.updateProgress(98, "loading.states.loading_images");

        const imagesToLoad = [
            'attached_assets/BotaoStart.png',
            'attached_assets/BotaoStop.png',
            'attached_assets/Alvo.png'
        ];

        let loadedImages = 0;
        const totalImages = imagesToLoad.length;
        let timeoutReached = false;

        // Timeout de segurança de 5 segundos
        const timeout = setTimeout(() => {
            if (!timeoutReached) {
                console.warn('⚠️ [LOADING] Timeout ao carregar imagens dos botões, finalizando loading...');

                timeoutReached = true;
                callback();
            }
        }, 5000);

        const checkComplete = () => {
            if (timeoutReached) return;

            loadedImages++;

            if (loadedImages >= totalImages) {

                clearTimeout(timeout);
                timeoutReached = true;
                this.updateProgress(100, "Carregamento concluído!");
                callback();
            }
        };

        // Verificar se as imagens já estão carregadas ou pré-carregar
        imagesToLoad.forEach((imageSrc, index) => {

            const img = new Image();

            img.onload = () => {

                checkComplete();
            };

            img.onerror = () => {
                console.warn(`❌ [LOADING] Erro ao carregar imagem: ${imageSrc}`);
                checkComplete(); // Contar como "carregada" mesmo com erro para não travar
            };

            // Verificar se já está em cache
            if (img.complete) {

                checkComplete();
            } else {
                img.src = imageSrc;

            }
        });

        // Se todas as imagens já estavam carregadas, callback imediato
        if (loadedImages >= totalImages && !timeoutReached) {

            clearTimeout(timeout);
            callback();
        }
    }

    // 🎁 Verificar e mostrar notificação de bônus de boas-vindas
    static checkAndShowWelcomeBonusNotification() {
        try {
            const currentUser = SessionManager?.getCurrentUser();
            if (!currentUser) return;

            const loginId = currentUser.authorize?.loginid;
            if (!loginId || UserLevelsManager.ADMIN_LOGIN_IDS.includes(loginId)) return;

            // Verificar se recebeu bônus recentemente (últimos 10 segundos)
            const vipData = UserLevelsManager.getVipData(loginId);
            if (vipData?.welcomeBonusReceived && vipData?.welcomeBonusDate) {
                const bonusDate = new Date(vipData.welcomeBonusDate);
                const now = new Date();
                const timeDiff = now.getTime() - bonusDate.getTime();

                // Se bônus foi concedido nos últimos 10 segundos, mostrar notificação
                if (timeDiff < 10000) {

                    setTimeout(() => {
                        if (typeof CreditsManager !== 'undefined' && CreditsManager.showWelcomeBonusNotification) {
                            CreditsManager.showWelcomeBonusNotification();
                        }
                    }, 2000);
                }
            }
        } catch (error) {
            console.error('❌ [LOADING] Erro ao verificar notificação de bônus:', error);
        }
    }

    // 🎯 NOVO: Mostrar popup de seleção de ativo (OBRIGATÓRIO - sem fallbacks)
    static async showAssetSelectionModal(symbols) {
        return new Promise((resolve, reject) => {
            try {
                // 🔧 CRÍTICO: Adicionar estilos ANTES de criar o modal

                this.addAssetSelectionStyles();

                const modal = document.createElement('div');
                modal.id = 'asset-selection-modal';
                modal.className = 'asset-selection-modal';

                // 🔧 CRÍTICO: Definir estilos inline IMEDIATAMENTE
                modal.style.cssText = `
                    position: fixed !important;
                    top: 0 !important;
                    left: 0 !important;
                    width: 100vw !important;
                    height: 100vh !important;
                    background: transparent !important;
                    z-index: 2147483647 !important;
                    display: flex !important;
                    align-items: center !important;
                    justify-content: flex-end !important;
                    padding-right: 50px !important;
                    opacity: 0 !important;
                    transition: opacity 0.3s ease !important;
                    pointer-events: all !important;
                `;

                // 🎯 ORGANIZAÇÃO PERSONALIZADA: Classificar ativos conforme especificação
                const groupedSymbols = {
                    "Derivado Sintetico": [],
                    "Forex": [],
                    "Índices": [],
                    "Commodities": [],
                    "Crypto Basket": []
                };

                // 📋 LISTAS ESPECÍFICAS DE ATIVOS POR CATEGORIA (conforme especificação)
                const forexAssets = [
                    'AUDJPY', 'AUDUSD', 'EURAUD', 'EURCAD', 'EURCHF', 'EURGBP', 'EURJPY', 'EURUSD',
                    'GBPAUD', 'GBPJPY', 'GBPUSD', 'USDCAD', 'USDCHF', 'USDJPY', 'AUDCAD', 'AUDCHF',
                    'AUDNZD', 'EURNZD', 'GBPCAD', 'GBPCHF', 'GBPNOK', 'GBPNZD', 'NZDJPY', 'NZDUSD',
                    'USDMXN', 'USDNOK', 'USDPLN', 'USDSEK'
                ];

                const stockIndicesAssets = [
                    'AS51', 'HK50', 'JPN225', 'SX5E', 'FRA40', 'GER40', 'AEX', 'SPC',
                    'UK100', 'SPX500', 'NAS100', 'US30'
                ];

                const commoditiesAssets = [
                    'XAUUSD', 'XPDUSD', 'XPTUSD', 'XAGUSD'
                ];

                const basketAssets = [
                    'WLDAUD', 'WLDEUR', 'WLDGBP', 'WLDUSD', 'WLDXAU', 'OTC_DJI'
                ];

                // TODOS os sintéticos (volatilidades serão ordenadas dentro do grupo)
                const syntheticAssets = [
                    'RDBEAR', 'RDBULL', 'JD10', 'JD25', 'JD50', 'JD75', 'JD100',
                    'STP100', 'STP200', 'STP300', 'STP400', 'STP500',
                    '1HZ10V', 'R_10', '1HZ15V', '1HZ25V', 'R_25', '1HZ30V',
                    '1HZ50V', 'R_50', '1HZ75V', 'R_75', '1HZ90V', '1HZ100V', 'R_100'
                ];


                // 🔍 CLASSIFICAR SÍMBOLOS baseado nas listas específicas
                symbols.forEach(symbol => {
                    const symbolName = symbol.symbol.toUpperCase();
                    const displayName = symbol.display_name;
                    let classified = false;

                    // 💱 FOREX
                    if (forexAssets.includes(symbolName) ||
                        displayName.includes('/') && (
                            displayName.includes('AUD') || displayName.includes('EUR') ||
                            displayName.includes('GBP') || displayName.includes('USD') ||
                            displayName.includes('JPY') || displayName.includes('CAD') ||
                            displayName.includes('CHF') || displayName.includes('NZD') ||
                            displayName.includes('NOK') || displayName.includes('SEK') ||
                            displayName.includes('PLN') || displayName.includes('MXN')
                        )) {
                        groupedSymbols["Forex"].push(symbol);
                        classified = true;
                    }
                    // 📈 STOCK INDICES
                    else if (stockIndicesAssets.includes(symbolName) ||
                        displayName.includes('Australia 200') || displayName.includes('Hong Kong 50') ||
                        displayName.includes('Japan 225') || displayName.includes('Euro 50') ||
                        displayName.includes('France 40') || displayName.includes('Germany 40') ||
                        displayName.includes('Netherlands 25') || displayName.includes('Swiss 20') ||
                        displayName.includes('UK 100') || displayName.includes('US 500') ||
                        displayName.includes('US Tech 100') || displayName.includes('Wall Street 30')) {
                        groupedSymbols["Índices"].push(symbol);
                        classified = true;
                    }
                    // 🏅 COMMODITIES
                    else if (commoditiesAssets.includes(symbolName) ||
                        displayName.includes('Gold/USD') || displayName.includes('Silver/USD') ||
                        displayName.includes('Palladium/USD') || displayName.includes('Platinum/USD')) {
                        groupedSymbols["Commodities"].push(symbol);
                        classified = true;
                    }
                    // 🧺 DERIVADO BASKET
                    else if (basketAssets.includes(symbolName) ||
                        displayName.includes('AUD Basket') || displayName.includes('EUR Basket') ||
                        displayName.includes('GBP Basket') || displayName.includes('USD Basket') ||
                        displayName.includes('Gold Basket') || displayName.includes('Daily Reset')) {
                        groupedSymbols["Crypto Basket"].push(symbol);
                        classified = true;
                    }
                    // 🎲 DERIVADO SINTÉTICO
                    else if (syntheticAssets.includes(symbolName) ||
                        displayName.includes('Bear Market') || displayName.includes('Bull Market') ||
                        displayName.includes('Jump') || displayName.includes('Step') ||
                        displayName.includes('Volatility') || displayName.includes('Index')) {
                        groupedSymbols["Derivado Sintetico"].push(symbol);
                        classified = true;
                    }
                });

                // 📊 ORDENAÇÃO ESPECÍFICA dentro de cada grupo
                Object.keys(groupedSymbols).forEach(group => {
                    if (group === "Forex") {
                        // Forex: ordenar por ordem alfabética das moedas base
                        groupedSymbols[group].sort((a, b) => {
                            const aName = a.display_name.replace('/', '');
                            const bName = b.display_name.replace('/', '');
                            return aName.localeCompare(bName);
                        });
                    } else if (group === "Derivado Sintetico") {
                        // Derivados Sintéticos: VOLATILIDADES PRIMEIRO, depois outros
                        groupedSymbols[group].sort((a, b) => {
                            const aIsVolatility = a.display_name.includes('Volatility') || a.symbol.includes('V') || a.symbol.startsWith('R_');
                            const bIsVolatility = b.display_name.includes('Volatility') || b.symbol.includes('V') || b.symbol.startsWith('R_');

                            // Se ambos são volatilidade ou ambos não são, ordenar alfabéticamente
                            if (aIsVolatility === bIsVolatility) {
                                return a.display_name.localeCompare(b.display_name);
                            }

                            // Volatilidades vem primeiro
                            return bIsVolatility ? 1 : -1;
                        });
                    } else {
                        // Outros grupos: ordem alfabética normal
                        groupedSymbols[group].sort((a, b) => a.display_name.localeCompare(b.display_name));
                    }
                });

                // 🗑️ REMOVER grupos vazios
                Object.keys(groupedSymbols).forEach(group => {
                    if (groupedSymbols[group].length === 0) {
                        delete groupedSymbols[group];
                    }
                });

                const optionsHtml = Object.entries(groupedSymbols).map(([groupName, groupSymbols]) => {
                    if (groupSymbols.length === 0) return '';
                    return `
                        <optgroup label="${groupName}">
                            ${groupSymbols.map(symbol =>
                        `<option value="${symbol.symbol}">${symbol.display_name} (${symbol.symbol})</option>`
                    ).join('')}
                        </optgroup>
                    `;
                }).join('');


                // 🎯 NOVO: Definir especificamente R_10 (Volatility 10 Index) como padrão
                const defaultVolatilityOption = symbols.find(s =>
                    s.symbol === 'R_10'
                );

                const defaultSymbol = defaultVolatilityOption ? defaultVolatilityOption.symbol : '';

                // Marcar opção padrão como selected no HTML
                let optionsHtmlWithDefault = optionsHtml;
                if (defaultSymbol) {
                    optionsHtmlWithDefault = optionsHtml.replace(
                        new RegExp(`<option value="${defaultSymbol}">`),
                        `<option value="${defaultSymbol}" selected>`
                    );
                }

                modal.innerHTML = `
                    <div class="asset-selection-content" style="
                        background: white !important;
                        border-radius: 20px !important;
                        box-shadow: 0 0 100px rgba(0, 0, 0, 0.9), 0 25px 80px rgba(0, 0, 0, 0.6) !important;
                        max-width: 500px !important;
                        width: 90% !important;
                        min-width: 320px !important;
                        transform: scale(0.8) !important;
                        transition: transform 0.3s ease !important;
                        position: relative !important;
                    ">
                        <div class="asset-selection-header">
                            <h2>🎯 Selecione o Ativo de Trading</h2>
                            <p>O ativo poderá ser alterado durante a sessão</p>
                        </div>
                        <div class="asset-selection-body">
                            <select id="asset-selection-dropdown" class="asset-selection-dropdown">
                                <option value="">Selecione um ativo...</option>
                                ${optionsHtmlWithDefault}
                            </select>
                            <div class="asset-selection-info">
                                <p>⚠️ <strong>Importante:</strong> <span>As funções disponibilizadas no nosso site são complexas e comportam um risco significativo de perda potencial...</span></p>
                            </div>
                        </div>
                        <div class="asset-selection-footer">
                            <button id="confirm-asset-btn" class="confirm-asset-btn" disabled>Confirmar Seleção</button>
                        </div>
                    </div>
                `;


                document.body.appendChild(modal);

                // ✅ NÃO ocultar a tela de loading - deixar nome e barra visíveis
                const loadingScreen = document.getElementById('loading-screen');

                const dropdown = document.getElementById('asset-selection-dropdown');
                const confirmBtn = document.getElementById('confirm-asset-btn');

                if (!dropdown || !confirmBtn) {
                    console.error('❌ [MODAL] Elementos do modal não encontrados no DOM');
                    reject(new Error('Elementos do modal não encontrados'));
                    return;
                }

                // 🎯 NOVO: Definir valor padrão no dropdown após criação
                if (defaultSymbol) {
                    dropdown.value = defaultSymbol;

                    // 🔍 VALIDAÇÃO ADICIONAL: Verificar se realmente é R_10
                    if (defaultSymbol !== 'R_10') {
                        console.warn(`⚠️ [MODAL] ATENÇÃO: Esperado R_10, mas foi definido: ${defaultSymbol}`);
                    }
                } else {
                    console.warn(`⚠️ [MODAL] R_10 não encontrado na lista de símbolos disponíveis`);
                }

                // 🔧 CORREÇÃO: Múltiplos event listeners para capturar seleção de forma robusta
                const validateSelection = () => {
                    const selectedValue = dropdown.value;
                    const placeholder = "Selecione um ativo...";
                    const isValid = selectedValue && selectedValue.trim() !== '' && selectedValue !== placeholder;

                    confirmBtn.disabled = !isValid;
                    if (isValid) {
                        confirmBtn.classList.add('enabled');
                    } else {
                        confirmBtn.classList.remove('enabled');
                    }
                };

                // ✅ MÚLTIPLOS EVENT LISTENERS para máxima compatibilidade
                dropdown.addEventListener('change', validateSelection);
                dropdown.addEventListener('input', validateSelection);
                dropdown.addEventListener('click', validateSelection);
                dropdown.addEventListener('focus', validateSelection);

                // ✅ VALIDAÇÃO IMEDIATA após anexar listeners
                validateSelection();

                // ✅ VALIDAÇÃO PERIÓDICA RÁPIDA para casos edge (a cada 100ms)
                const periodicCheck = setInterval(validateSelection, 100);

                // 🔧 VERIFICAÇÃO RÁPIDA após 10ms caso já tenha valor selecionado
                setTimeout(() => {
                    const placeholder = "Selecione um ativo...";
                    if (dropdown.value && dropdown.value !== placeholder) {

                        validateSelection();
                    }
                }, 10);

                // 🔧 VERIFICAÇÕES ADICIONAIS em múltiplos intervalos
                setTimeout(validateSelection, 50);
                setTimeout(validateSelection, 150);
                setTimeout(validateSelection, 300);

                confirmBtn.addEventListener('click', () => {
                    const selectedSymbol = dropdown.value;
                    const placeholder = "Selecione um ativo...";
                    if (selectedSymbol && selectedSymbol.trim() !== '' && selectedSymbol !== placeholder) {


                        // Salvar ativo selecionado na sessão
                        SessionManager.setSessionData('selected_symbol', selectedSymbol);

                        // ✅ LIMPEZA: Parar verificações periódicas e timeout
                        clearInterval(periodicCheck);
                        clearTimeout(modalTimeout);

                        // Remover modal (tela de loading continuará normalmente)
                        modal.remove();

                        // Resolver com o símbolo selecionado
                        resolve(selectedSymbol);
                    } else {
                        console.warn('⚠️ [MODAL] Nenhum ativo selecionado ou valor inválido');
                        alert("Selecione um ativo...");

                        // 🔧 NOVO: Dar foco no dropdown para facilitar nova seleção
                        dropdown.focus();
                    }
                });

                // 🔧 CRÍTICO: Mostrar modal imediatamente e com força bruta
                const modalTimeout = setTimeout(() => {
                    modal.style.opacity = '1';
                    const content = modal.querySelector('.asset-selection-content');
                    if (content) {
                        content.style.transform = 'scale(1)';
                    }

                }, 10); // ✅ REDUZIDO: 50ms -> 10ms para aparecer mais rápido

            } catch (error) {
                console.error('❌ [MODAL] Erro ao criar modal:', error);
                reject(error);
            }
        });
    }

    // 🎨 NOVO: Adicionar estilos do modal de seleção de ativo
    static addAssetSelectionStyles() {
        if (document.getElementById('asset-selection-styles')) {

            return;
        }


        const style = document.createElement('style');
        style.id = 'asset-selection-styles';
        style.textContent = `
            /* 🔧 CRÍTICO: Forçar visibilidade absoluta do modal */
            .asset-selection-modal {
                position: fixed !important;
                top: 0 !important;
                left: 0 !important;
                width: 100vw !important;
                height: 100vh !important;
                background: transparent !important;
                z-index: 2147483647 !important;
                display: flex !important;
                align-items: center !important;
                justify-content: flex-end !important;
                padding-right: 50px !important;
                opacity: 1 !important;
                pointer-events: all !important;
                margin: 0 !important;
                box-sizing: border-box !important;
            }

            /* 🔧 Garantir que todas as telas de loading ficam atrás */
            .loading-screen {
                z-index: 1000000 !important;
            }

            .asset-selection-content {
                background: white !important;
                border-radius: 20px !important;
                box-shadow: 0 0 100px rgba(0, 0, 0, 0.9), 0 25px 80px rgba(0, 0, 0, 0.6) !important;
                max-width: 500px !important;
                width: 90% !important;
                min-width: 320px !important;
                transform: scale(1) !important;
                position: relative !important;
                z-index: 2147483648 !important;
            }

            .asset-selection-header {
                background: linear-gradient(135deg, #10b981 0%, #047857 100%) !important;
                color: white !important;
                padding: 30px !important;
                border-radius: 20px 20px 0 0 !important;
                text-align: center !important;
            }

            .asset-selection-header h2 {
                margin: 0 0 10px 0 !important;
                font-size: 1.5em !important;
                font-weight: 600 !important;
                color: white !important;
            }

            .asset-selection-header p {
                margin: 0 !important;
                opacity: 0.9 !important;
                font-size: 0.95em !important;
                color: white !important;
            }

            .asset-selection-body {
                padding: 40px !important;
                background: white !important;
            }

            .asset-selection-dropdown {
                width: 100%;
                padding: 12px 15px;
                border: 2px solid #e1e5e9;
                border-radius: 10px;
                font-size: 1em;
                background: white;
                color: #333;
                cursor: pointer;
                transition: all 0.3s ease;
                max-height: 300px;
                overflow-y: auto;
            }

            .asset-selection-dropdown:focus {
                outline: none;
                border-color: #007bff;
                box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
            }

            .asset-selection-dropdown optgroup {
                background: #f8f9fa;
                font-weight: bold;
                color: #495057;
                padding: 8px 0;
                border-top: 1px solid #dee2e6;
            }

            .asset-selection-dropdown optgroup:first-child {
                border-top: none;
            }

            .asset-selection-dropdown option {
                padding: 8px 15px;
                color: #333;
                background: white;
                font-weight: normal;
            }

            .asset-selection-dropdown option:hover {
                background: #e3f2fd;
            }

            .asset-selection-info {
                margin-top: 25px !important;
                padding: 20px !important;
                background: #f8f9fa !important;
                border-radius: 10px !important;
                border-left: 4px solid #ffc107 !important;
            }

            .asset-selection-info p {
                margin: 0 !important;
                color: #495057 !important;
                font-size: 0.9em !important;
                line-height: 1.5 !important;
            }

            .asset-selection-footer {
                padding: 0 40px 40px !important;
                text-align: center !important;
                background: white !important;
                border-radius: 0 0 20px 20px !important;
            }

            .confirm-asset-btn {
                background: #6c757d !important;
                color: white !important;
                border: none !important;
                padding: 15px 40px !important;
                border-radius: 50px !important;
                font-size: 1.1em !important;
                font-weight: 600 !important;
                cursor: not-allowed !important;
                transition: all 0.3s ease !important;
                opacity: 0.6 !important;
            }

            .confirm-asset-btn.enabled {
                background: linear-gradient(135deg, #10b981 0%, #047857 100%) !important;
                cursor: pointer !important;
                opacity: 1 !important;
                transform: translateY(-2px) !important;
                box-shadow: 0 8px 25px rgba(16, 185, 129, 0.3) !important;
            }

            .confirm-asset-btn.enabled:hover {
                transform: translateY(-3px) !important;
                box-shadow: 0 12px 35px rgba(16, 185, 129, 0.4) !important;
            }

            /* 🔧 FORÇA BRUTA: Ocultar qualquer elemento que possa sobrepor (EXCETO botões flutuantes!) */
            body > *:not(#asset-selection-modal):not(.vip-upgrade-button) {
                z-index: 1000000 !important;
            }
        `;

        document.head.appendChild(style);

    }


    // ✅ NOVO: Aguardar carregamento completo dos dados do rodapé
    static waitForCompleteDataLoad(callback) {

        let attempts = 0;
        const maxAttempts = 30; // Máximo 15 segundos (500ms * 30)

        const checkDataLoad = () => {
            attempts++;

            // Verificar se o rodapé existe
            const currentFooter = window.FooterManager?.getCurrentFooter();
            if (!currentFooter) {

                if (attempts < maxAttempts) {
                    setTimeout(checkDataLoad, 500);
                    return;
                }
            }

            // ✅ NOVO: Todos os usuários agora recebem rodapé VIP
            const currentUser = window.SessionManager?.getCurrentUser();
            const loginId = currentUser?.authorize?.loginid;
            const userLevel = window.UserLevelsManager?.getCurrentUserLevel();

            // Todos os usuários precisam aguardar dados históricos para o rodapé VIP
            const vipFooter = currentFooter;

            // Verificar múltiplas condições para garantir que dados estão prontos
            const hasHistoricalDigits = vipFooter.analyticsData?.last25Digits?.length >= 10;
            const hasMarketData = vipFooter.marketData?.isReady?.();
            // ❌ REMOVIDO fallback de R_10 - usar ativo selecionado
            const selectedSymbol = window.selectedSymbol || SessionManager.getSessionData('selected_symbol');
            const bufferData = selectedSymbol ? window.displayViewInstance?.marketData?.getPriceBuffer?.(selectedSymbol, 25) : null;
            const hasBufferData = bufferData?.prices?.length >= 10;

            const isDataReady = hasHistoricalDigits && hasMarketData && hasBufferData;

            if (isDataReady) {

                callback();

            } else if (attempts >= maxAttempts) {
                console.warn('⚠️ [LOADING] Timeout aguardando dados, finalizando loading mesmo assim');
                callback();

            } else {
                // Continuar aguardando
                setTimeout(checkDataLoad, 500);
            }
        };

        checkDataLoad();
    }

    // Simular progresso automático (para desenvolvimento/teste)
    static simulateProgress() {
        let stepIndex = 0;
        const interval = setInterval(() => {
            if (stepIndex < this.progressSteps.length) {
                const step = this.progressSteps[stepIndex];
                this.updateProgress(step.progress, step.text);
                stepIndex++;
            } else {
                clearInterval(interval);
                this.complete();
            }
        }, 1000);
    }

    // Detectar se está voltando do OAuth
    static isReturningFromOAuth() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.has('token1') || urlParams.has('token');
    }

    // Detectar se precisa fazer OAuth
    static needsOAuth() {
        // Verificar se tem token local válido
        try {
            const token = SessionManager.getLocalToken();
            return !token;
        } catch (error) {
            return true;
        }
    }
}