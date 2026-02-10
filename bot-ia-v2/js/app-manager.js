// Gerenciador principal da aplicação
// O SISTEMA DEVE SER 100% ISOLADO POR USUARIO
class AppManager {
    static appId = 67957; // Substitua pelo seu ID de aplicativo
    static redirectUri = null; // Será definido dinamicamente com domínio normalizado
    static apiInstance = null;
    static isInitialized = false; // Flag para indicar se o AppManager foi inicializado

    // Método para obter redirectUri normalizado
    static getRedirectUri() {
        if (!this.redirectUri) {
            this.redirectUri = getBaseUrl(); // Usa função do config.js que normaliza domínio

        }
        return this.redirectUri;
    }

    static init() {
        // CRÍTICO: Verificar se realmente estamos na rota correta antes de inicializar
        if (window.location.pathname !== '/app') {
            return;
        }

        this.setupStartupSequence();
    }

    // Sequência de inicialização do AppManager (chamada por this.init())
    static async setupStartupSequence() {
        // ✅ SISTEMA DE LOGS IMEDIATOS E VISÍVEIS
        const logImediato = (message, data = null) => {
            const time = new Date().toISOString().split('T')[1].split('.')[0];

            if (data)
                // Forçar flush visual
                window.requestAnimationFrame(() => { });
            document.body.offsetHeight; // Força repaint
        };

        logImediato('=== INICIANDO SEQUÊNCIA DE STARTUP ===');
        logImediato('Timestamp:', new Date().toISOString());
        logImediato('Performance now:', performance.now() + 'ms');

        this.isInitialized = false; // Resetar flag ao iniciar
        const appContainer = document.getElementById('app-container');
        logImediato('App container encontrado:', !!appContainer);

        // 🎬 Inicializar tela de loading
        logImediato('Inicializando LoadingManager...');
        LoadingManager.init();
        logImediato('LoadingManager inicializado');

        // 🚀 FAST PATH: Verificar se pre-auth já foi feito na home page
        const preAuthStatus = sessionStorage.getItem('pre_auth_status');
        const preAuthTimestamp = sessionStorage.getItem('pre_auth_timestamp');

        if (preAuthStatus && preAuthTimestamp) {
            const age = Date.now() - parseInt(preAuthTimestamp);

            // Se pre-auth foi feito há menos de 5 minutos, usar resultado
            if (age < 300000) { // 5 minutos
                logImediato(`⚡ [FAST PATH] Pre-auth encontrado: ${preAuthStatus} (${Math.floor(age / 1000)}s atrás)`);

                if (preAuthStatus === 'success') {
                    // Pre-auth bem-sucedido! Pular validação de token
                    const preAuthUserData = sessionStorage.getItem('pre_auth_userdata');
                    const preAuthSymbols = sessionStorage.getItem('pre_auth_symbols');

                    if (preAuthUserData) {
                        try {
                            const userData = JSON.parse(preAuthUserData);
                            logImediato('✅ [FAST PATH] Usando dados de pre-auth, pulando validação');

                            // Pular direto para seleção de ativo
                            LoadingManager.goToStep("Carregando configurações...", 70);
                            SessionManager.saveUserData(userData);

                            const mainLoginId = userData.authorize.loginid;
                            const mainToken = SessionManager.getLocalToken();

                            if (mainLoginId && mainToken) {
                                SessionManager.saveTokenByLoginId(mainLoginId, mainToken);
                            }

                            LoadingManager.goToStep("Selecionando ativo...", 80);

                            // Usar símbolos do pre-auth se disponíveis
                            let symbols = null;
                            if (preAuthSymbols) {
                                try {
                                    symbols = JSON.parse(preAuthSymbols);
                                    logImediato(`✅ [FAST PATH] ${symbols.length} símbolos do pre-auth`);
                                } catch (e) {
                                    logImediato('⚠️ [FAST PATH] Erro ao parsear símbolos, buscando novamente');
                                }
                            }

                            // Se não tem símbolos do pre-auth, buscar agora
                            if (!symbols) {
                                logImediato('📊 [FAST PATH] Buscando símbolos...');
                                const marketData = await this._connectMarketDataSafely(SessionManager.getLocalToken(), CONFIG.API.MAX_RETRIES, 400);
                                symbols = await marketData.getActiveSymbols();
                            }

                            if (!symbols || symbols.length === 0) {
                                throw new Error('❌ Nenhum símbolo disponível');
                            }

                            // Mostrar modal de seleção de ativo
                            const selectedSymbol = await LoadingManager.showAssetSelectionModal(symbols);

                            if (!selectedSymbol) {
                                throw new Error('❌ Seleção de ativo é obrigatória');
                            }

                            SessionManager.setSessionData('selected_symbol', selectedSymbol);
                            window.selectedSymbol = selectedSymbol;

                            // Continuar com inicialização normal
                            LoadingManager.goToStep("Inicializando interface...", 85);
                            await UIManager.displayUserDashboard(document.getElementById('app-container'), userData);

                            LoadingManager.goToStep("Preparando dados de mercado...", 95);
                            await this.delay(200);
                            await this.ensureHistoricalDataLoaded();
                            await this.waitForMonitoringButtonsReady();

                            LoadingManager.complete();
                            this.isInitialized = true;

                            // Limpar dados do pre-auth após usar
                            sessionStorage.removeItem('pre_auth_status');
                            sessionStorage.removeItem('pre_auth_userdata');
                            sessionStorage.removeItem('pre_auth_symbols');
                            sessionStorage.removeItem('pre_auth_timestamp');

                            logImediato('🎉 [FAST PATH] Inicialização completa via pre-auth!');

                            // Inicializar reconexão
                            setTimeout(() => {
                                initFrontendReconnection();
                                if (typeof MonitoringView !== 'undefined') {
                                    MonitoringView.setupGlobalReconnectionListener();
                                }
                            }, 2000);

                            return; // Sair da função, inicialização completa

                        } catch (error) {
                            logImediato('❌ [FAST PATH] Erro ao usar pre-auth:', error.message);
                            // Continuar com fluxo normal se falhar
                        }
                    }
                } else if (preAuthStatus === 'oauth_needed') {
                    // Pre-auth detectou que OAuth é necessário
                    logImediato('🔄 [FAST PATH] Pre-auth indica OAuth necessário, redirecionando...');
                    LoadingManager.pauseForAuth();
                    await this.delay(1000);
                    this.redirectToOAuth();
                    return;
                }
            } else {
                logImediato('⚠️ [FAST PATH] Pre-auth expirado, ignorando');
            }
        }

        // Fluxo normal se não há pre-auth ou se falhou
        logImediato('Aguardando 300ms para mostrar tela de loading...');
        await this.delay(300); // Pequeno delay para mostrar tela de loading
        logImediato('Delay concluído, prosseguindo...');

        // 🧹 NOVO: Limpeza inteligente do localStorage mantendo apenas tokens de sessões anteriores
        LoadingManager.updateProgress(15, "Limpando cache...");
        this.intelligentLocalStorageCleanup();

        // 🔐 Validar integridade do sistema
        LoadingManager.setWatchdogTimeout(2); // CRÍTICO: 2s para validar
        LoadingManager.nextStep(); // "Validando sessão..."
        this.validateSystemIntegrity();

        // 🏷️ Inicializar isolamento por aba
        this.initTabIsolation();
        LoadingManager.setWatchdogTimeout(5); // Retornar para 5s (padrão)
        LoadingManager.updateProgress(25, "Verificando autenticação...");

        const urlParams = new URLSearchParams(window.location.search);

        // 🔍 ANÁLISE ESPECÍFICA: Verificar se há fragmento (#) na URL (alguns provedores OAuth usam fragment)
        if (window.location.hash) {

            const hashParams = new URLSearchParams(window.location.hash.substring(1));

        }

        // 🎯 NOVA ABORDAGEM: Capturar TODOS os tokens do OAuth (como Deriv API funciona nativamente)
        const multiTokenData = this.extractMultipleTokensFromUrl(urlParams);
        const hasTokens = multiTokenData.tokens.length > 0;
        const userToken = SessionManager.getLocalToken();

        // 🔍 Detectar se temos tokens em localStorage (pode ser uma nova sessão)
        const localStorageTokens = SessionManager.getAccountsWithTokens();

        // 🚫 CORREÇÃO LOOP OAUTH: Se já temos tokens armazenados, usar eles em vez de redirecionar
        if (!hasTokens && !userToken && localStorageTokens.length > 0) {

            const firstAccount = localStorageTokens[0];
            SessionManager.saveLocalToken(SessionManager.getTokenByLoginId(firstAccount.loginid));
        }

        // 🔐 VALIDAÇÃO ESTRITA: Validar TODOS os tokens antes de prosseguir
        if (localStorageTokens.length > 0 && !hasTokens) {
            LoadingManager.goToStep("Validando tokens...", 30);
            logImediato('🔐 [TOKEN VALIDATION] Iniciando validação preventiva de tokens...');

            let allTokensValid = true;
            let validationAttempt = 1;
            const maxValidationAttempts = 2; // Permitir 1 retry para timeouts

            while (validationAttempt <= maxValidationAttempts && !allTokensValid) {
                allTokensValid = true; // Assumir sucesso até provar o contrário
                logImediato(`🔬 [TOKEN VALIDATION] Tentativa ${validationAttempt}/${maxValidationAttempts}...`);

                for (const account of localStorageTokens) {
                    const token = SessionManager.getTokenByLoginId(account.loginid);

                    if (!token) {
                        console.error(`❌ [TOKEN VALIDATION] Token ausente para ${account.loginid}`);
                        allTokensValid = false;
                        break;
                    }

                    try {
                        logImediato(`🔍 [TOKEN VALIDATION] Validando ${account.loginid}...`);
                        const validation = await this.validateTokenRobustly(token, account.loginid);

                        if (!validation.valid) {
                            console.error(`❌ [TOKEN VALIDATION] Token inválido para ${account.loginid}: ${validation.reason}`);
                            allTokensValid = false;
                            break;
                        }

                        logImediato(`✅ [TOKEN VALIDATION] Token válido para ${account.loginid}`);
                    } catch (error) {
                        console.error(`❌ [TOKEN VALIDATION] Erro ao validar ${account.loginid}:`, error.message);
                        allTokensValid = false;
                        break;
                    }
                }

                // Se falhou e ainda temos tentativas, aguardar e tentar novamente
                if (!allTokensValid && validationAttempt < maxValidationAttempts) {
                    console.warn(`⚠️ [TOKEN VALIDATION] Tentativa ${validationAttempt} falhou. Aguardando 2s antes de retry...`);
                    LoadingManager.updateProgress(30, "Revalidando tokens...");
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    validationAttempt++;
                } else {
                    break;
                }
            }

            // Se após todas as tentativas ainda há tokens inválidos, redirecionar para OAuth
            if (!allTokensValid) {
                console.error(`🔐 [TOKEN VALIDATION] Validação falhou após ${validationAttempt} tentativa(s). Redirecionando para OAuth...`);

                CommonHelpers.showWarning("🔄 Tokens expirados detectados. Redirecionando para autenticação...");
                LoadingManager.pauseForAuth();

                // Limpar tokens inválidos
                logImediato('🧹 [TOKEN VALIDATION] Limpando tokens inválidos...');
                localStorageTokens.forEach(account => {
                    SessionManager.removeTokenByLoginId(account.loginid);
                });

                await this.delay(1500);
                this.redirectToOAuth();
                return; // Interromper inicialização
            }

            logImediato('✅ [TOKEN VALIDATION] Todos os tokens validados com sucesso!');
        }

        // 🔥 NOVO: Variável para armazenar resultado do OAuth (inclui apiInstance reutilizável)
        let oauthResult = null;

        // Detectar se está retornando do OAuth


        if (hasTokens && LoadingManager.isReturningFromOAuth()) {
            localStorage.setItem('oauth_multitoken_source', 'true');
            LoadingManager.resumeAfterAuth();
            LoadingManager.setWatchdogTimeout(5); // Ajustado para 5s (API pode ser lenta)
            LoadingManager.goToStep("Buscando dados da conta...", 40);

            oauthResult = await this.saveMultipleTokensFromOAuth(multiTokenData);


            if (oauthResult && oauthResult.success) {
                this.initializationSuccess = true;

            }
        } else if (hasTokens) {
            localStorage.setItem('oauth_multitoken_source', 'true');
            LoadingManager.setWatchdogTimeout(5); // Ajustado para 5s (API pode ser lenta)
            LoadingManager.goToStep("Buscando dados da conta...", 40);

            oauthResult = await this.saveMultipleTokensFromOAuth(multiTokenData);


            if (oauthResult && oauthResult.success) {
                this.initializationSuccess = true;

            }
        } else {

            // Fallback para método antigo (compatibilidade)
            const legacyToken = urlParams.get('token1') || urlParams.get('token');
            if (legacyToken) {

                SessionManager.saveLocalToken(legacyToken);
            }
        }

        const detectedToken = SessionManager.getLocalToken();
        if (detectedToken) {

            LoadingManager.goToStep("Conectando ao servidor...", 50);
            try {
                let userData = null;

                // 🔥 OTIMIZAÇÃO CRÍTICA: Reutilizar conexão OAuth se disponível


                if (oauthResult && oauthResult.success && oauthResult.apiInstance) {

                    this.apiInstance = oauthResult.apiInstance;
                    window.AppManager = this;


                    window.dispatchEvent(new CustomEvent('AppManagerReady', {
                        detail: { apiInstance: this.apiInstance }
                    }));

                    LoadingManager.setWatchdogTimeout(5); // Ajustado para 5s (API pode ser lenta)
                    LoadingManager.goToStep("Buscando dados da conta...", 65);

                    // Buscar dados complementares usando a conexão já autenticada

                    const parallelStart = performance.now();

                    const [balanceResponse, settingsResponse, statusResponse] = await Promise.all([
                        this.apiInstance.sendRequest({ "balance": 1, "account": "all" }),
                        this.apiInstance.sendRequest({ "get_settings": 1 }),
                        this.apiInstance.sendRequest({ "get_account_status": 1 })
                    ]);


                    userData = {
                        authorize: oauthResult.primaryAuthData,
                        balance: balanceResponse?.balance,
                        settings: settingsResponse?.get_settings,
                        status: statusResponse?.get_account_status
                    };



                } else {
                    // Caminho tradicional: criar nova conexão
                    if (!this.apiInstance) {

                        this.apiInstance = new DerivAPI();

                        window.AppManager = this;


                        window.dispatchEvent(new CustomEvent('AppManagerReady', {
                            detail: { apiInstance: this.apiInstance }
                        }));
                    }

                    LoadingManager.setWatchdogTimeout(5); // Ajustado para 5s (API pode ser lenta)
                    LoadingManager.goToStep("Buscando dados da conta...", 65);


                    const tradStart = performance.now();
                    userData = await this.apiInstance.getUserAccountData(SessionManager.getLocalToken(), { timeout: 5000 });

                }

                if (userData && userData.authorize) {

                    LoadingManager.goToStep("Carregando configurações...", 75);
                    SessionManager.saveUserData(userData);

                    // 🔑 Log detalhado do token da conta inicial
                    const mainLoginId = userData.authorize.loginid;
                    let mainToken = SessionManager.getLocalToken();

                    // ✅ CRÍTICO: Verificar se o token foi recebido corretamente
                    if (!mainToken) {
                        CommonHelpers.showError("❌ Token principal não encontrado! Verificando URL...");
                        const urlParams = new URLSearchParams(window.location.search);
                        const fallbackToken = urlParams.get('token1') || urlParams.get('token');
                        if (fallbackToken) {

                            SessionManager.saveLocalToken(fallbackToken);
                            mainToken = fallbackToken;
                        }
                    }

                    if (mainLoginId && mainToken) {
                        SessionManager.saveTokenByLoginId(mainLoginId, mainToken);

                    } else {
                        CommonHelpers.showError(`❌ Falha ao salvar token: loginId=${mainLoginId}, token=${mainToken ? 'presente' : 'ausente'}`);
                    }

                    // 🔄 A lógica de salvar múltiplos tokens pode ser ajustada, pois o 'authorize' não
                    // necessariamente retorna tokens para todas as contas.
                    const accounts = userData.authorize.account_list || [];
                    // Adicionando o token principal à lista de contas para garantir que ele seja salvo
                    const mainAccount = accounts.find(acc => acc.loginid === mainLoginId);
                    if (mainAccount) {
                        mainAccount.token = mainToken;
                    }

                    // ✅ CRÍTICO: Só chamar saveMultipleTokens se NÃO viemos de OAuth multi-token
                    const isOAuthMultiToken = localStorage.getItem('oauth_multitoken_source') === 'true';
                    const hasMultipleTokens = SessionManager.hasPerAccountTokens();

                    if (!hasTokens && !isOAuthMultiToken && !hasMultipleTokens) {
                        // Fluxo tradicional (token único) - aplicar token principal a todas as contas
                        SessionManager.saveMultipleTokens(accounts, mainLoginId, mainToken);

                    } else {
                        // Fluxo OAuth multi-token ou tokens específicos já existem
                        if (hasTokens || isOAuthMultiToken) {

                        }
                    }

                    // 🧹 AGORA: Limpar URL após migração completa de tokens (manter em /app)
                    if (hasTokens || urlParams.get('token1') || urlParams.get('token')) {
                        window.history.replaceState({}, document.title, '/app');

                    }

                    // ⚠️ CRÍTICO: Verificar termos de uso ANTES de tudo
                    LoadingManager.goToStep("Verificando termos de uso...", 70);

                    if (typeof TermsModal !== 'undefined') {
                        try {
                            const termsAccepted = await TermsModal.hasAcceptedTerms(mainLoginId);

                            if (!termsAccepted) {

                                // BLOQUEIO TOTAL: Mostrar modal e aguardar aceitação
                                const accepted = await TermsModal.showTermsModal(mainLoginId);

                                if (!accepted) {
                                    // Se usuário não aceitou (não deveria acontecer), não pode continuar
                                    throw new Error('É necessário aceitar os termos de uso para utilizar o sistema');
                                }

                            }
                        } catch (error) {
                            console.error('❌ [TERMS] Erro ao verificar/aceitar termos:', error);
                            throw new Error('Erro ao processar termos de uso. Por favor, recarregue a página.');
                        }
                    } else {
                        console.warn('⚠️ [TERMS] TermsModal não disponível - pulando verificação (DEV MODE)');
                    }

                    if (typeof CreditsManager !== 'undefined') {
                        try {
                            // 👤 Exibir créditos atuais
                            const currentCredits = await CreditsManager.getCurrentCredits(mainLoginId);
                            CreditsManager.updateCreditsDisplay(currentCredits);
                        } catch (error) {
                            console.error('❌ [CREDITS] Erro na sincronização de créditos:', error);
                        }
                    }

                    // 🎯 NOVO: Seleção de ativo OBRIGATÓRIA na inicialização
                    LoadingManager.goToStep("Selecionando ativo...", 60);



                    let symbols = null;
                    let marketData = null;

                    try {
                        // Buscar símbolos disponíveis com timeout global
                        LoadingManager.setWatchdogTimeout(5); // Ajustado para 5s (Rede)
                        marketData = await this._connectMarketDataSafely(SessionManager.getLocalToken(), CONFIG.API.MAX_RETRIES, 400);

                    } catch (connectError) {
                        console.error('❌ [ASSET SELECTION] Falha ao conectar MarketData:', connectError.message);
                        console.error('Stack:', connectError.stack);
                        // Continuar mesmo com erro - tentaremos fallback abaixo
                    }

                    // 🔥 CORREÇÃO: Simplificar lógica de busca de símbolos
                    // getActiveSymbols() já tem retry interno, não precisa de loop aqui
                    let attempts = 0;
                    const maxAttempts = 2; // Reduzido de 3 para 2

                    while (!symbols && attempts < maxAttempts && marketData) {
                        attempts++;

                        try {
                            // ✅ FEEDBACK VISUAL: Mostrar tentativa atual
                            if (attempts > 1) {
                                LoadingManager.updateProgress(60, `loading.states.selecting_asset`);
                            }

                            // 🔥 SIMPLIFICADO: getActiveSymbols() já tem timeout interno de 8-10s
                            // Não precisa de Promise.race adicional
                            symbols = await marketData.getActiveSymbols();

                            // ✅ VALIDAÇÃO RIGOROSA: Verificar se símbolos têm dados necessários
                            if (symbols && symbols.length > 0) {
                                const validSymbols = symbols.filter(s =>
                                    s && s.symbol && s.display_name && s.market
                                );


                                if (validSymbols.length === 0) {
                                    console.warn(`⚠️ [SYMBOLS] Tentativa ${attempts}: Símbolos sem dados válidos`);
                                    symbols = null;
                                } else {

                                    symbols = validSymbols; // Usar apenas símbolos válidos
                                }
                            } else {
                                console.warn(`⚠️ [SYMBOLS] Tentativa ${attempts}: Resposta vazia ou inválida`);
                                symbols = null;
                            }

                            // Se não conseguiu símbolos válidos, aguardar antes da próxima tentativa
                            if (!symbols && attempts < maxAttempts) {
                                LoadingManager.updateProgress(60, `loading.states.waiting_market`);
                                await new Promise(resolve => setTimeout(resolve, 500)); // 🔥 REDUZIDO: 1s → 500ms
                            }

                        } catch (error) {
                            console.error(`❌ [SYMBOLS] Tentativa ${attempts} falhou:`, error.message);
                            console.error('Stack:', error.stack);
                            if (attempts < maxAttempts) {
                                LoadingManager.updateProgress(60, `loading.states.connecting`);
                                await new Promise(resolve => setTimeout(resolve, 1000));
                            }
                        }
                    }

                    // 🆘 FALLBACK CRÍTICO: Se todas as tentativas falharam, usar R_10 como padrão
                    if (!symbols || symbols.length === 0) {
                        console.error('❌ [ASSET SELECTION] Falha após todas as tentativas. Usando fallback para R_10');
                        LoadingManager.updateProgress(65, 'Carregando configurações...');

                        // Criar symbol object mínimo para R_10
                        const defaultSymbol = 'R_10';

                        // Salvar símbolo padrão
                        SessionManager.setSessionData('selected_symbol', defaultSymbol);
                        window.selectedSymbol = defaultSymbol;

                        // Avisar o usuário
                        CommonHelpers.showWarning('⚠️ Erro ao carregar lista de ativos. Usando Volatility 10 Index (R_10) como padrão.');

                        // Pular para próxima etapa
                        LoadingManager.goToStep("Inicializando interface...", 80);
                        await UIManager.displayUserDashboard(appContainer, userData);

                        LoadingManager.goToStep("Preparando dados de mercado...", 95);
                        await this.delay(200);
                        await this.ensureHistoricalDataLoaded();
                        await this.waitForMonitoringButtonsReady();

                        LoadingManager.complete();
                        this.isInitialized = true;

                        // Inicializar reconexão
                        setTimeout(() => {
                            initFrontendReconnection();
                            if (typeof MonitoringView !== 'undefined') {
                                MonitoringView.setupGlobalReconnectionListener();
                            }
                        }, 2000);

                        return; // Sair - inicialização completada com fallback
                    }


                    // Mostrar modal de seleção de ativo (sem fallbacks)
                    LoadingManager.pauseWatchdog(); // Pausar para esperar interação humana
                    const selectedSymbol = await LoadingManager.showAssetSelectionModal(symbols);
                    LoadingManager.resumeWatchdog();
                    LoadingManager.setWatchdogTimeout(5); // Retornar para 5s

                    if (!selectedSymbol) {
                        throw new Error('❌ Seleção de ativo é obrigatória para continuar.');
                    }

                    // Salvar símbolo selecionado
                    SessionManager.setSessionData('selected_symbol', selectedSymbol);

                    // 🔧 CRÍTICO: Salvar também no contexto global para acesso imediato
                    window.selectedSymbol = selectedSymbol;

                    // Exibir dashboard inicial com nível correto já determinado
                    LoadingManager.setWatchdogTimeout(10); // Dashboard é pesado, 10s + heartbeats
                    LoadingManager.goToStep("Inicializando interface...", 80);
                    await UIManager.displayUserDashboard(appContainer, userData);

                    // Preparar dados de mercado
                    LoadingManager.goToStep("Preparando dados de mercado...", 95);
                    await this.delay(200); // Delay mínimo otimizado

                    await this.ensureHistoricalDataLoaded();

                    // Aguardar que os botões de monitoramento estejam renderizados na interface
                    await this.waitForMonitoringButtonsReady();

                    // Finalizar carregamento (agora vai aguardar as imagens automaticamente)
                    LoadingManager.complete();
                    this.isInitialized = true; // Marcar como inicializado

                    // 🔄 Inicializar sistema de reconexão automática
                    setTimeout(() => {
                        initFrontendReconnection();

                        // 🎯 REGISTRAR listener global para reconexões Deriv WebSocket
                        if (typeof MonitoringView !== 'undefined') {
                            MonitoringView.setupGlobalReconnectionListener();

                        }
                    }, 2000);

                    // 👑 Sistema de níveis já foi inicializado durante loading
                    // Apenas inicializar listeners adicionais
                    setTimeout(() => {
                        if (typeof FooterManager !== 'undefined') {
                            FooterManager.initAdminLevelListeners();
                        }

                        // 💰 NOVO: Auto-iniciar CommissionTracker para administradores
                        if (typeof CommissionTracker !== 'undefined' && CommissionTracker.isAdmin()) {
                            setTimeout(() => {
                                CommissionTracker.getInstance().startTracking(true);
                            }, 2000); // Aguardar 2 segundos após inicialização completa
                        }
                    }, 1000);
                } else {
                    throw new Error("Dados da conta incompletos ou inválidos.");
                }
            } catch (error) {
                console.error("🚨 [AUTH FAILURE] FALHA CRÍTICA na autenticação:");
                console.error(`   🔑 Token usado: ${detectedToken ? `${detectedToken.substring(0, 15)}...${detectedToken.slice(-5)}` : 'NULL'}`);
                console.error(`   📊 Erro: ${error.message}`);
                console.error(`   🕐 Timestamp: ${new Date().toISOString()}`);
                console.error(`   🌐 URL: ${window.location.href}`);
                console.error(`   📋 Stack:`, error.stack);

                // 🔄 NOVO: Retry automático para erro genérico da API Deriv
                if (error.message.includes("Sorry, an error occurred while processing your request")) {
                    console.warn("⚠️ [AUTH RETRY] Erro genérico da API Deriv detectado - tentando novamente...");

                    // Aguardar 2 segundos antes de tentar novamente
                    await new Promise(resolve => setTimeout(resolve, 2000));

                    try {
                        // Tentar reconectar e autenticar novamente
                        if (this.apiInstance) {
                            await this.apiInstance.disconnect();
                        }
                        this.apiInstance = new DerivAPI();

                        const retryUserData = await this.apiInstance.getUserAccountData(SessionManager.getLocalToken());

                        if (retryUserData && retryUserData.authorize) {


                            // Continuar com o fluxo normal
                            LoadingManager.goToStep("Carregando configurações...", 75);
                            SessionManager.saveUserData(retryUserData);

                            const mainLoginId = retryUserData.authorize.loginid;
                            const mainToken = SessionManager.getLocalToken();

                            if (mainLoginId && mainToken) {
                                SessionManager.saveTokenByLoginId(mainLoginId, mainToken);
                            }

                            // 🎯 NOVO: Seleção de ativo OBRIGATÓRIA também no retry
                            LoadingManager.goToStep("Selecionando ativo...", 80);

                            // Buscar símbolos disponíveis
                            const marketData = await this._connectMarketDataSafely(SessionManager.getLocalToken(), CONFIG.API.MAX_RETRIES, 400);

                            // Tentar obter símbolos com múltiplas tentativas
                            let symbols = null;
                            let attempts = 0;
                            const maxAttempts = 3;

                            while (!symbols && attempts < maxAttempts) {
                                attempts++;
                                try {
                                    const symbolsPromise = marketData.getActiveSymbols();
                                    const timeoutPromise = new Promise((_, reject) => {
                                        setTimeout(() => reject(new Error('Timeout ao obter símbolos')), CONFIG.API.CONNECT_TIMEOUT);
                                    });

                                    symbols = await Promise.race([symbolsPromise, timeoutPromise]);

                                    if (symbols && symbols.length > 0) {
                                        const validSymbols = symbols.filter(s => s && s.symbol && s.display_name && s.market);
                                        if (validSymbols.length > 0) {
                                            symbols = validSymbols;
                                        } else {
                                            symbols = null;
                                        }
                                    } else {
                                        symbols = null;
                                    }

                                    if (!symbols && attempts < maxAttempts) {
                                        await new Promise(resolve => setTimeout(resolve, 1000));
                                    }
                                } catch (error) {
                                    console.error(`❌ [SYMBOLS RETRY] Tentativa ${attempts} falhou:`, error.message);
                                    if (attempts < maxAttempts) {
                                        await new Promise(resolve => setTimeout(resolve, 1000));
                                    }
                                }
                            }

                            if (!symbols || symbols.length === 0) {
                                throw new Error('❌ Nenhum símbolo válido disponível após múltiplas tentativas. Recarregue a página.');
                            }

                            // Mostrar modal de seleção de ativo
                            const selectedSymbol = await LoadingManager.showAssetSelectionModal(symbols);

                            if (!selectedSymbol) {
                                throw new Error('❌ Seleção de ativo é obrigatória para continuar.');
                            }

                            // Salvar símbolo selecionado
                            SessionManager.setSessionData('selected_symbol', selectedSymbol);
                            window.selectedSymbol = selectedSymbol;

                            // Preparar dados de mercado
                            LoadingManager.goToStep("Preparando dados de mercado...", 90);
                            await this.ensureHistoricalDataLoaded();

                            // Pular para finalização
                            await UIManager.displayUserDashboard(appContainer, retryUserData);
                            LoadingManager.complete();
                            this.isInitialized = true;
                            return;
                        }
                    } catch (retryError) {
                        console.error("❌ [AUTH RETRY] Falha na segunda tentativa:", retryError.message);
                        // Continuar com o tratamento de erro normal
                    }
                }

                CommonHelpers.showError("❌ Falha na autenticação com o token salvo:", error);

                // 🧹 TRATAMENTO ESPECIAL: QuotaExceededError
                if (error.name === 'QuotaExceededError') {
                    CommonHelpers.showWarning('⚠️ [QUOTA] Erro de quota detectado, executando limpeza...');
                    try {
                        // ✅ EXECUTAR limpezas em sequência
                        const cleaned1 = SessionManager.emergencyCleanup();
                        const cleaned2 = SessionManager.cleanupOldUserData();
                        const cleaned3 = SessionManager.cleanupOrphanedSessionData();

                        // ✅ AGUARDAR um pouco antes de tentar novamente
                        await new Promise(resolve => setTimeout(resolve, 1000));

                        // Tentar novamente após limpeza
                        const userData = await this.apiInstance.getUserAccountData(SessionManager.getLocalToken());
                        if (userData && userData.authorize) {
                            SessionManager.saveUserData(userData);
                            await UIManager.displayUserDashboard(appContainer, userData);
                            LoadingManager.complete();
                            this.isInitialized = true;
                            return;
                        }
                    } catch (cleanupError) {
                        CommonHelpers.showError('❌ Falha na recuperação após limpeza:', cleanupError);

                        try {
                            CommonHelpers.showWarning('🔥 [QUOTA] Tentativa de limpeza agressiva...');
                            SessionManager.aggressiveCleanup();

                            // Forçar recarregamento da página após limpeza agressiva
                            setTimeout(() => {
                                window.location.reload();
                            }, 2000);
                        } catch (aggressiveError) {
                            CommonHelpers.showError('❌ Falha na limpeza agressiva:', aggressiveError);
                        }
                    }
                }

                // 🔍 DIAGNÓSTICO CRÍTICO ANTES DE QUALQUER REDIRECIONAMENTO
                console.error("🚨 [CRITICAL DEBUG] ANÁLISE COMPLETA ANTES DO REDIRECIONAMENTO:");
                console.error(`   🌐 URL atual: ${window.location.href}`);
                console.error(`   📊 hasTokens: ${hasTokens}`);
                console.error(`   🔑 userToken presente: ${!!userToken}`);
                console.error(`   💾 localStorage tokens: ${localStorageTokens.length}`);
                console.error(`   👤 Current user: ${SessionManager.getCurrentUser() ? 'PRESENTE' : 'AUSENTE'}`);

                // 🔍 DIAGNÓSTICO DETALHADO DOS TOKENS ENCONTRADOS
                if (localStorageTokens.length > 0) {
                    console.error("   📝 [TOKENS ENCONTRADOS]:");
                    localStorageTokens.forEach((account, index) => {
                        const token = SessionManager.getTokenByLoginId(account.loginid);
                        console.error(`      ${index + 1}. ${account.loginid}: ${token ? 'TOKEN PRESENTE' : 'TOKEN AUSENTE'}`);
                        if (token) {
                            console.error(`         • Token: ${token.substring(0, 15)}...${token.slice(-5)}`);
                            console.error(`         • Comprimento: ${token.length} chars`);
                        }
                    });
                }

                // 🔍 TESTE IMEDIATO DOS TOKENS ANTES DE DECIDIR SOBRE O OAUTH
                let validTokenFound = false;
                let validUserData = null;

                if (localStorageTokens.length > 0) {
                    console.error("   🧪 [TESTE CRÍTICO] Testando tokens ANTES de redirecionar...");

                    for (const account of localStorageTokens) {
                        const token = SessionManager.getTokenByLoginId(account.loginid);

                        if (token) {
                            console.error(`   🔬 [TESTE TOKEN] Validando ${account.loginid}...`);

                            try {
                                // 🚨 TESTE SÍNCRONO RÁPIDO - não aguardar muito tempo
                                const testResult = await this.validateTokenRobustly(token, account.loginid);

                                if (testResult.valid) {
                                    console.error(`   ✅ [TOKEN VÁLIDO] ${account.loginid} - TOKEN FUNCIONA!`);
                                    validTokenFound = true;
                                    validUserData = testResult.userData;

                                    // Usar este token imediatamente
                                    SessionManager.saveUserData(validUserData);
                                    SessionManager.setCurrentUserLoginId(validUserData.authorize.loginid);
                                    SessionManager.saveLocalToken(token);

                                    // Marcar sucesso para evitar redirecionamento
                                    this.initializationSuccess = true;
                                    localStorage.setItem('token_recovery_timestamp', Date.now());

                                    console.error(`   🎯 [SUCESSO CRÍTICO] Token válido encontrado - CANCELANDO OAUTH!`);
                                    break;
                                } else {
                                    console.error(`   ❌ [TOKEN INVÁLIDO] ${account.loginid}: ${testResult.reason}`);
                                }
                            } catch (error) {
                                console.error(`   💥 [ERRO TESTE] ${account.loginid}: ${error.message}`);
                            }
                        }
                    }
                }

                // 🚫 PROTEÇÃO ANTI-LOOP: Verificar se já tentamos OAuth recentemente
                const lastOAuthAttempt = localStorage.getItem('last_oauth_attempt');
                const now = Date.now();
                const fiveMinutesAgo = now - (5 * 60 * 1000);

                if (lastOAuthAttempt && parseInt(lastOAuthAttempt) > fiveMinutesAgo && !validTokenFound) {
                    const timeSinceLastAttempt = Math.floor((now - parseInt(lastOAuthAttempt)) / 1000);

                    console.error("🚫 [OAUTH LOOP PROTECTION] OAuth tentado recentemente!");
                    console.error(`   ⏰ Última tentativa: ${timeSinceLastAttempt}s atrás`);
                    console.error(`   🔄 Cooldown: 300s (${300 - timeSinceLastAttempt}s restantes)`);
                    console.error(`   📅 Timestamp: ${new Date(parseInt(lastOAuthAttempt)).toISOString()}`);

                    CommonHelpers.showError("🚫 OAuth tentado muito recentemente. Aguarde alguns minutos.");
                    // LoadingManager.updateStatus removido - função não existe mais

                    // Aguardar cooldown
                    await new Promise(resolve => setTimeout(resolve, 3000));
                    return;
                }

                // ✅ SE ENCONTRAMOS TOKEN VÁLIDO, CONTINUAR COM INICIALIZAÇÃO
                if (validTokenFound && validUserData) {
                    console.error("🎉 [OAUTH CANCELADO] Token válido encontrado - prosseguindo com inicialização!");

                    try {
                        LoadingManager.goToStep("loading.states.verifying_auth", 50);
                        await UIManager.displayUserDashboard(document.getElementById('app-container'), validUserData);
                        LoadingManager.complete();
                        this.isInitialized = true;
                        return;
                    } catch (error) {
                        console.error("❌ [INIT ERROR] Erro após encontrar token válido:", error);
                    }
                }

                // ❌ ÚLTIMO RECURSO: OAUTH NECESSÁRIO
                if (!this.initializationSuccess && !validTokenFound) {
                    console.error("🔐 [OAUTH NECESSÁRIO] Nenhum token válido encontrado:");
                    console.error("   📋 [MOTIVOS IDENTIFICADOS]:");
                    console.error(`      • Tokens testados: ${localStorageTokens.length}`);
                    console.error(`      • Tokens válidos: 0`);
                    console.error(`      • URL tem OAuth params: ${window.location.search.includes('token')}`);

                    console.error("   ⏱️ [REDIRECIONAMENTO] Iniciando em 5 segundos...");
                    console.error("   📝 [LOGS PRESERVADOS] Estes logs serão perdidos após redirect");
                    console.error("   🔍 [DEBUG] Aguarde 5 segundos para ler os logs antes do redirect...");

                    // Salvar diagnóstico no localStorage antes do redirect
                    const diagnosticData = {
                        timestamp: now,
                        hasTokens,
                        userToken: !!userToken,
                        localStorageTokensCount: localStorageTokens.length,
                        currentUser: !!SessionManager.getCurrentUser(),
                        url: window.location.href,
                        reason: 'no_valid_tokens_found'
                    };
                    localStorage.setItem('oauth_redirect_diagnostic', JSON.stringify(diagnosticData));

                    CommonHelpers.showWarning("🔄 [OAUTH] Redirecionando para autenticação em 1 segundo...");
                    // LoadingManager.updateStatus removido - função não existe mais

                    // Salvar timestamp da tentativa
                    localStorage.setItem('last_oauth_attempt', now.toString());

                    await new Promise(resolve => setTimeout(resolve, 1000));
                    this.redirectToOAuth();
                }
            }
        } else {

            LoadingManager.pauseForAuth();
            await this.delay(1000); // Delay para mostrar mensagem
            AppManager.redirectToOAuth();
        }
    }

    // 🔬 MÉTODO CRÍTICO: Validação robusta de token com logs detalhados
    static async validateTokenRobustly(token, expectedLoginId) {
        console.error(`🔬 [TOKEN TEST] Iniciando validação robusta para ${expectedLoginId}...`);
        console.error(`   • Token: ${token.substring(0, 15)}...${token.slice(-5)}`);
        console.error(`   • Token length: ${token.length} chars`);
        console.error(`   • Esperado loginId: ${expectedLoginId}`);

        try {
            const testApi = new DerivAPI();

            // Timeout mais agressivo para não travar o fluxo
            const testPromise = testApi.getUserAccountData(token, { silent: true });
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Timeout na validação - 3 segundos')), 3000);
            });

            console.error(`   ⏳ [TOKEN TEST] Aguardando resposta da API...`);

            const userData = await Promise.race([testPromise, timeoutPromise]);

            if (userData && userData.authorize) {
                const actualLoginId = userData.authorize.loginid;
                console.error(`   ✅ [TOKEN TEST] Token válido! LoginId retornado: ${actualLoginId}`);

                if (actualLoginId === expectedLoginId) {
                    console.error(`   🎯 [TOKEN TEST] MATCH PERFEITO! Token pertence à conta esperada.`);
                    await testApi.disconnect();
                    return {
                        valid: true,
                        userData: userData,
                        reason: 'token_valido_match_perfeito'
                    };
                } else {
                    console.error(`   ❌ [TOKEN TEST] MISMATCH! Esperado: ${expectedLoginId}, Atual: ${actualLoginId}`);
                    await testApi.disconnect();
                    return {
                        valid: false,
                        userData: null,
                        reason: `token_mismatch_esperado_${expectedLoginId}_atual_${actualLoginId}`
                    };
                }
            } else {
                console.error(`   ❌ [TOKEN TEST] Resposta inválida da API`);
                console.error(`   📊 [TOKEN TEST] userData:`, userData);
                await testApi.disconnect();
                return {
                    valid: false,
                    userData: null,
                    reason: 'resposta_api_invalida'
                };
            }

        } catch (error) {
            console.error(`   💥 [TOKEN TEST] ERRO na validação: ${error.message}`);
            console.error(`   📊 [TOKEN TEST] Error details:`, error);

            // Classificar tipo de erro
            let errorReason = 'erro_desconhecido';
            if (error.message.includes('Timeout')) {
                errorReason = 'timeout_5s';
            } else if (error.message.includes('invalid') || error.message.includes('Invalid')) {
                errorReason = 'token_invalido';
            } else if (error.message.includes('expired') || error.message.includes('Expired')) {
                errorReason = 'token_expirado';
            } else if (error.message.includes('network') || error.message.includes('Network')) {
                errorReason = 'erro_rede';
            }

            return {
                valid: false,
                userData: null,
                reason: errorReason
            };
        }
    }

    // Troca de conta via token salvo com UX melhorado
    static async switchAccount(loginid) {
        if (!loginid) {
            CommonHelpers.showError("ID de login inválido.");
            return;
        }

        const switchStartTime = Date.now();

        const currentUser = SessionManager.getCurrentUser();
        const currentLoginId = localStorage.getItem('current_user_loginid');
        const memoryBefore = performance.memory ?
            Math.round(performance.memory.usedJSHeapSize / 1024 / 1024) : 'N/A';

        window.accountSwitchInProgress = true;
        window.accountSwitchStartTime = switchStartTime;

        const reconnectionHandler = () => {

        };

        window.addEventListener('serverOnline', reconnectionHandler, { once: true });

        try {
            this.showAccountSwitchLoading(loginid);
            this.blurFloatingComponents(); // Embaça componentes flutuantes

            const specificToken = SessionManager.getTokenByLoginId(loginid);
            const mintedToken = SessionManager.getDurableToken(loginid);

            const tokenToUse = mintedToken || specificToken;

            if (!tokenToUse) {
                CommonHelpers.showError(`❌ [SWITCH CRITICAL] Token não encontrado para ${loginid}`);
                CommonHelpers.showError(`Tokens disponíveis:`, Object.keys(localStorage).filter(key => key.startsWith('token_')));

                this.hideAccountSwitchLoading();
                this.redirectToOAuth();
                return false;
            }

            try {
                const tempApi = new DerivAPI();
                const quickAuth = await tempApi.getUserAccountData(tokenToUse);

                if (quickAuth && quickAuth.authorize) {
                    const tokenLoginId = quickAuth.authorize.loginid;

                    if (tokenLoginId !== loginid) {
                        CommonHelpers.showError(`❌ [SWITCH VALIDATION] Token pertence à conta ${tokenLoginId}, mas esperado ${loginid}`);

                        const correctToken = SessionManager.getTokenByLoginId(tokenLoginId);
                        if (!correctToken) {
                            SessionManager.saveTokenByLoginId(tokenLoginId, tokenToUse);

                        }

                        localStorage.removeItem(`token_${loginid}`);
                        localStorage.removeItem(`token_${loginid}_minted`);

                        this.hideAccountSwitchLoading();
                        this.showAccountSwitchError(
                            'Token incorreto',
                            `Token pertence à conta ${tokenLoginId}. Redirecionando para OAuth...`
                        );

                        setTimeout(() => {
                            this.redirectToOAuth();
                        }, 3000);
                        return false;
                    }

                }

                await tempApi.disconnect();
            } catch (validationError) {
                CommonHelpers.showWarning(`⚠️ [SWITCH VALIDATION] Erro na validação prévia: ${validationError.message}`);
            }

            SessionManager.setCurrentUserLoginId(loginid);

            const tokenTimestamp = localStorage.getItem(`token_${loginid}_timestamp`);
            if (tokenTimestamp) {
                const tokenAge = Date.now() - parseInt(tokenTimestamp);
                const tokenAgeMinutes = Math.floor(tokenAge / 60000);

                if (tokenAge > 300000) { // 5 minutos
                    CommonHelpers.showWarning(`⚠️ [SWITCH DEBUG] TOKEN PODE ESTAR EXPIRADO! Idade: ${tokenAgeMinutes} minutos`);
                }
            }

            const accounts = SessionManager.getAccountList();
            const targetAccount = accounts.find(acc => acc.loginid === loginid);

            if (targetAccount) {

            } else {
                CommonHelpers.showWarning(`⚠️ [SWITCH DEBUG] Conta ${loginid} não está na lista, mas prosseguindo com token válido`);
            }

            this.updateAccountSwitchLoading('Conectando à nova conta...');

            // 🔄 RETRY LOGIC: Tentar até 3 vezes em caso de timeout
            let newUserData = null;
            let lastError = null;
            const maxRetries = 3;

            for (let attempt = 1; attempt <= maxRetries; attempt++) {
                try {
                    if (attempt > 1) {
                        this.updateAccountSwitchLoading(`Tentativa ${attempt}/${maxRetries}...`);
                        // Aguardar antes de retry
                        await new Promise(resolve => setTimeout(resolve, 2000));
                    }

                    const switchingApi = new DerivAPI();
                    newUserData = await switchingApi.getUserAccountData(tokenToUse);

                    // Se chegou aqui, sucesso!
                    break;
                } catch (error) {
                    lastError = error;
                    console.warn(`⚠️ [SWITCH] Tentativa ${attempt}/${maxRetries} falhou:`, error.message);

                    // Se não é timeout, não tentar novamente
                    if (!error.message.includes('Timeout') && !error.message.includes('timeout')) {
                        break;
                    }

                    // Se é a última tentativa, lançar erro
                    if (attempt === maxRetries) {
                        throw error;
                    }
                }
            }

            if (!newUserData) {
                throw lastError || new Error('Falha ao obter dados da conta');
            }

            if (newUserData && newUserData.authorize) {
                const actualLoginId = newUserData.authorize.loginid;

                if (actualLoginId !== loginid) {
                    CommonHelpers.showError(`❌ [SWITCH MISMATCH] Autorizado: ${actualLoginId}, Esperado: ${loginid}`);

                    const correctToken = tokenToUse;

                    localStorage.removeItem(`token_${loginid}`);
                    localStorage.removeItem(`token_${loginid}_minted`);

                    const existingCorrectToken = SessionManager.getTokenByLoginId(actualLoginId);
                    if (!existingCorrectToken) {
                        SessionManager.saveTokenByLoginId(actualLoginId, correctToken);

                    }

                    throw new Error(`Token pertence à conta ${actualLoginId}, não ${loginid}. Mapeamento corrigido - tente novamente.`);
                }


                this.updateAccountSwitchLoading('Atualizando dados da conta...');

                // ✅ CRÍTICO: Salvar dados do usuário ANTES de qualquer renderização
                SessionManager.saveUserData(newUserData, tokenToUse);
                SessionManager.setCurrentUserLoginId(loginid);

                // ✅ CRÍTICO: Estabelecer símbolo selecionado ANTES da UI (GLOBAL)
                const savedConfig = localStorage.getItem(`trade_config_global`);
                let symbolToSet = 'R_10'; // Padrão

                if (savedConfig) {
                    try {
                        const parsedConfig = JSON.parse(savedConfig);
                        const configSymbol = parsedConfig.config?.symbol || parsedConfig.symbol;
                        if (configSymbol) {
                            symbolToSet = configSymbol;

                        }
                    } catch (e) {
                        console.warn('⚠️ [ACCOUNT SWITCH] Erro ao parsear config global');
                    }
                }

                // Definir símbolo em TODAS as fontes
                window.selectedSymbol = symbolToSet;
                SessionManager.setSessionData('selected_symbol', symbolToSet);

                this.updateAccountSwitchLoading("Inicializando Interface...");

                await this.fadeOutCurrentInterface();

                await UIManager.displayUserDashboard(document.getElementById('app-container'), newUserData);

                // 📱 CRÍTICO: Garantir que body.app-loading seja removido após troca de conta
                document.body.classList.remove('app-loading');

                this.updateAccountSwitchLoading("Preparando dados de mercado...");

                setTimeout(async () => {
                    try {


                        // 🔄 ATUALIZAÇÃO MÍNIMA: Apenas atualizar token da instância existente
                        if (window.marketDataInstance) {
                            const newToken = SessionManager.getLocalToken();
                            window.marketDataInstance.updateToken(newToken);

                        }

                        setTimeout(async () => {
                            try {
                                // Recarregar apenas os blocos de interface, reutilizando dados existentes
                                await UIManager.loadMarketBlocks(SessionManager.getLocalToken());

                                let configAttempts = 0;
                                while (!document.getElementById('contract-select')?.options?.length && configAttempts < 8) {

                                    await new Promise(resolve => setTimeout(resolve, 1000));
                                    configAttempts++;
                                }

                                const contractSelect = document.getElementById('contract-select');
                                if (contractSelect && contractSelect.options.length > 1) {

                                } else {
                                    CommonHelpers.showWarning('⚠️ [SWITCH] Contratos não carregaram completamente');

                                    // Forçar recarregamento dos contratos
                                    if (typeof ConfigurationsView !== 'undefined' && ConfigurationsView.populateContractsDropdown) {
                                        const symbolSelect = document.getElementById('symbol-select');
                                        if (symbolSelect?.value) {
                                            // ✅ CORREÇÃO: Passar loginid explicitamente para evitar getCurrentUser() desatualizado
                                            const savedConfig = ConfigurationsView.getSavedConfiguration(loginid);
                                            const preferredContract = savedConfig?.contractType;
                                            await ConfigurationsView.populateContractsDropdown(symbolSelect.value, preferredContract);
                                        }
                                    }
                                }

                                // 👑 Atualizar interface para o nível do novo usuário
                                UserLevelsManager.updateInterfaceForUserLevel();

                                // 🤖 CRÍTICO: Recriar botão IA para usuários VIP/ADMIN após troca de conta
                                const newUserLevel = UserLevelsManager.getCurrentUserLevel();
                                if (newUserLevel === UserLevelsManager.USER_LEVELS.VIP || newUserLevel === UserLevelsManager.USER_LEVELS.ADMIN) {
                                    // Aguardar um pouco para garantir que o rodapé VIP esteja totalmente carregado
                                    setTimeout(() => {
                                        const vipFooter = FooterManager.getCurrentFooter();
                                        if (vipFooter && typeof vipFooter.addFloatingIAButton === 'function') {
                                            vipFooter.addFloatingIAButton();
                                        }
                                    }, 1000);
                                }

                                // 💰 NOVO: Auto-iniciar CommissionTracker se trocar para conta admin
                                if (typeof CommissionTracker !== 'undefined' && CommissionTracker.isAdmin()) {
                                    setTimeout(() => {
                                        CommissionTracker.getInstance().startTracking(true);
                                    }, 1500);
                                }

                                await this.fadeInNewInterface();

                                this.hideAccountSwitchLoading(true);
                                this.unblurFloatingComponents(); // Restaura componentes flutuantes

                                // 🔔 Disparar evento para atualizar o dropdown do footer
                                window.dispatchEvent(new CustomEvent('accountSwitched', {
                                    detail: { loginid: loginid }
                                }));

                                // 🔧 CRÍTICO: Forçar reconexão do marketDataListener após troca de conta
                                // Isso garante que os dados de mercado (dígitos, ticks) continuem atualizando
                                if (typeof FooterManager !== 'undefined' && FooterManager.ensureMarketDataListener) {
                                    setTimeout(() => {
                                        FooterManager.ensureMarketDataListener();

                                    }, 1000);
                                }

                                // ⚡ CRÍTICO: Forçar atualização do dropdown do footer com o loginId correto
                                if (typeof FooterManager !== 'undefined' && FooterManager.forceUpdateDropdown) {

                                    FooterManager.forceUpdateDropdown(loginid);

                                    // Segunda tentativa após delay para garantir
                                    setTimeout(() => {
                                        FooterManager.forceUpdateDropdown(loginid);
                                    }, 500);
                                }

                            } catch (error) {
                                CommonHelpers.showError('❌ [SWITCH] Erro ao preparar dados de mercado:', error);
                                this.hideAccountSwitchLoading(false);
                                this.unblurFloatingComponents(); // Restaura componentes flutuantes em caso de erro
                                this.showAccountSwitchError('Erro ao carregar dados', error.message);
                            }
                        }, 800); // Aumentado de 500ms para 800ms

                        if (window.displayViewInstance) {
                            window.displayViewInstance.restartDisplay();
                        }
                    } catch (error) {
                        CommonHelpers.showError('❌ [SWITCH] Erro ao preparar dados de mercado:', error);
                        this.hideAccountSwitchLoading(false);
                        this.unblurFloatingComponents(); // Restaura componentes flutuantes em caso de erro
                        this.showAccountSwitchError('Erro ao carregar dados', error.message);
                    }
                }, 800); // Aumentado de 500ms para 800ms

                if (window.displayViewInstance) {
                    window.displayViewInstance.restartDisplay();
                }
            } else {
                throw new Error("Falha ao obter dados da nova conta.");
            }

        } catch (error) {
            CommonHelpers.showError("❌ Erro durante a troca de conta:", error);
            this.unblurFloatingComponents(); // Restaura componentes flutuantes em caso de erro

            this.hideAccountSwitchLoading(false);

            if (error.message.includes('invalid') || error.message.includes('Invalid') || error.message.includes('Token pertence')) {
                CommonHelpers.showWarning(`🔄 [AUTO FALLBACK] Token inválido para ${loginid} - iniciando re-OAuth...`);

                // Limpar tokens corrompidos/expirados
                localStorage.removeItem(`token_${loginid}`);
                localStorage.removeItem(`token_${loginid}_minted`);
                localStorage.removeItem(`token_${loginid}_minted_timestamp`);

                // Preparar re-OAuth para conta específica
                localStorage.setItem('pending_account_switch', loginid);

                if (error.message.includes('Token pertence')) {
                    localStorage.setItem('account_switch_reason', 'token_mismatch');
                    this.showAccountSwitchError(
                        `Mapeamento de token corrigido`,
                        'Redirecionando para nova autenticação...'
                    );
                } else {
                    localStorage.setItem('account_switch_reason', 'token_invalid');
                    this.showAccountSwitchError(
                        `Token expirado para ${loginid}`,
                        'Redirecionando para nova autenticação...'
                    );
                }

                // Redirecionar após breve delay
                setTimeout(() => {
                    this.redirectToOAuth();
                }, 3000);

                return; // Não mostrar erro adicional
            }

            this.showAccountSwitchError(
                'Erro ao trocar de conta',
                error.message
            );
        } finally {
            // 🏁 FINALIZAÇÃO: Limpar flags e timers, independentemente do sucesso ou falha
            const switchEndTime = Date.now();
            const switchDuration = switchStartTime ? switchEndTime - switchStartTime : 0;

            // Marcar fim da mudança
            window.accountSwitchInProgress = false;
            window.lastAccountSwitchTime = switchEndTime;
            window.accountSwitchStartTime = null; // Limpar timer

            window.removeEventListener('serverOnline', reconnectionHandler);

            setTimeout(() => {
                const remainingModals = [
                    document.getElementById('account-switch-overlay'),
                    document.getElementById('account-switch-error')
                ];

                remainingModals.forEach(modal => {
                    if (modal) {

                        modal.remove();
                    }
                });
            }, 1000);

            // 📊 DIAGNÓSTICO FINAL
            const memoryAfter = performance.memory ?
                Math.round(performance.memory.usedJSHeapSize / 1024 / 1024) : 'N/A';
            const memoryBefore = localStorage.getItem('memory_before_switch_log') ?
                parseInt(localStorage.getItem('memory_before_switch_log')) : 'N/A';
            const memoryDelta = (memoryAfter !== 'N/A' && memoryBefore !== 'N/A') ?
                (memoryAfter - memoryBefore) : 'N/A';

            // Alertas se houver problemas
            if (switchDuration > 10000) {
                CommonHelpers.showWarning(`⚠️ [ACCOUNT SWITCH] Mudança demorou mais que 10s: ${switchDuration}ms`);
            }

            if (memoryDelta > 50) {
                CommonHelpers.showWarning(`⚠️ [ACCOUNT SWITCH] Aumento significativo de memória: +${memoryDelta}MB`);
            }

            if (this.onAccountSwitched) {
                this.onAccountSwitched(loginid);
            }
        }
    }

    static showAccountSwitchLoading(loginId) {
        // Remover overlay anterior se existir
        this.hideAccountSwitchLoading();

        this.setupAccountSwitchTimeout();

        const overlay = document.createElement('div');
        overlay.id = 'account-switch-overlay';
        overlay.className = 'account-switch-overlay';
        overlay.innerHTML = `
            <div class="account-switch-modal">
                <div class="account-switch-header">
                    <h3>🔄 Trocando de Conta</h3>
                </div>
                <div class="account-switch-body">
                    <div class="account-switch-spinner"></div>
                    <div class="account-info">
                        <div class="current-account">De: <span id="current-account-display"></span></div>
                        <div class="target-account">Para: <span class="target-account-name">${loginId}</span></div>
                    </div>
                    <div class="switch-status" id="switch-status">Verificando token...</div>
                </div>
            </div>
        `;

        // Adicionar estilos se não existirem
        this.addAccountSwitchStyles();

        // Obter conta atual para exibir
        const currentUser = SessionManager.getCurrentUser();
        const currentLoginId = currentUser?.authorize?.loginid || 'N/A';

        document.body.appendChild(overlay);

        // Atualizar conta atual no overlay
        const currentAccountDisplay = document.getElementById('current-account-display');
        if (currentAccountDisplay) {
            currentAccountDisplay.textContent = currentLoginId;
        }

        // Animar entrada
        setTimeout(() => {
            overlay.classList.add('show');
        }, 10);
    }

    static updateAccountSwitchLoading(message) {
        const statusElement = document.getElementById('switch-status');
        if (statusElement) {
            statusElement.textContent = message;
        }
    }

    static hideAccountSwitchLoading(success = false) {
        const overlay = document.getElementById('account-switch-overlay');
        if (overlay) {
            if (success) {
                const modal = overlay.querySelector('.account-switch-modal');
                if (modal) {
                    modal.classList.add('success');
                    this.updateAccountSwitchLoading('✅ Conta alterada com sucesso!');
                }

                setTimeout(() => {
                    overlay.classList.add('hide');
                    setTimeout(() => {
                        if (overlay.parentElement) {
                            overlay.remove();
                        }
                    }, 300);
                }, 800);
            } else {
                overlay.classList.add('hide');
                setTimeout(() => {
                    if (overlay.parentElement) {
                        overlay.remove();
                    }
                }, 300);
            }
        }
    }

    static setupAccountSwitchTimeout() {
        if (this.accountSwitchTimeout) {
            clearTimeout(this.accountSwitchTimeout);
        }

        this.accountSwitchTimeout = setTimeout(() => {
            CommonHelpers.showWarning('⚠️ [ACCOUNT SWITCH] Timeout de segurança ativado - forçando limpeza de modais');

            window.accountSwitchInProgress = false;
            window.accountSwitchStartTime = null;

            const stuckModals = [
                document.getElementById('account-switch-overlay'),
                document.getElementById('account-switch-error')
            ];

            stuckModals.forEach(modal => {
                if (modal) {
                    modal.remove();
                }
            });

        }, CONFIG.SYSTEM.ACCOUNT_SWITCH_TIMEOUT);
    }

    static showAccountSwitchError(title, message) {
        this.hideAccountSwitchLoading();

        const overlay = document.createElement('div');
        overlay.id = 'account-switch-error';
        overlay.className = 'account-switch-overlay';
        overlay.innerHTML = `
            <div class="account-switch-modal error">
                <div class="account-switch-header">
                    <h3>❌ ${title}</h3>
                </div>
                <div class="account-switch-body">
                    <div class="error-message">${message}</div>
                    <button class="error-ok-btn" onclick="this.parentElement.parentElement.parentElement.remove()">
                        OK
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);
        setTimeout(() => overlay.classList.add('show'), 10);

        setTimeout(() => {
            if (overlay.parentElement) {
                overlay.classList.add('hide');
                setTimeout(() => overlay.remove(), 300);
            }
        }, 5000);
    }

    static async fadeOutCurrentInterface() {
        const appContainer = document.getElementById('app-container');
        if (appContainer) {
            appContainer.style.transition = 'opacity 0.3s ease';
            appContainer.style.opacity = '0.7';
            await new Promise(resolve => setTimeout(resolve, 300));
        }
    }

    // 🌫️ NOVO: Embaçar componentes flutuantes durante processos
    static blurFloatingComponents() {
        const floatingComponents = [
            document.querySelector('.vip-upgrade-button'),
            document.getElementById('floating-ia-button'),
            document.querySelector('.help-icon'),
            document.getElementById('credito-visor') // ✅ NOVO: Incluir visor de créditos
        ];

        floatingComponents.forEach(component => {
            if (component) {
                component.style.filter = 'blur(3px)';
                component.style.opacity = '0.5';
                component.style.pointerEvents = 'none';
                component.style.transition = 'all 0.3s ease';
            }
        });
    }

    // 🌫️ NOVO: Restaurar componentes flutuantes após processos
    static unblurFloatingComponents() {
        const floatingComponents = [
            document.querySelector('.vip-upgrade-button'),
            document.getElementById('floating-ia-button'),
            document.querySelector('.help-icon'),
            document.getElementById('credito-visor') // ✅ NOVO: Incluir visor de créditos
        ];

        floatingComponents.forEach(component => {
            if (component) {
                component.style.filter = 'none';
                component.style.opacity = '1';
                component.style.pointerEvents = 'auto';
                component.style.transition = 'all 0.3s ease';
            }
        });
    }

    static async fadeInNewInterface() {
        const appContainer = document.getElementById('app-container');
        if (appContainer) {
            appContainer.style.opacity = '0.7';
            setTimeout(() => {
                appContainer.style.opacity = '1';
                setTimeout(() => {
                    appContainer.style.transition = '';
                }, 300);
            }, 100);
        }
    }

    static addAccountSwitchStyles() {
        if (document.getElementById('account-switch-styles')) return;

        const style = document.createElement('style');
        style.id = 'account-switch-styles';
        style.textContent = `
            .account-switch-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.4);
                backdrop-filter: blur(5px);
                z-index: 10000;
                display: flex;
                align-items: center;
                justify-content: center;
                opacity: 0;
                transition: opacity 0.3s ease;
            }

            .account-switch-overlay.show {
                opacity: 1;
            }

            .account-switch-overlay.hide {
                opacity: 0;
            }

            .account-switch-modal {
                background: white;
                border-radius: 15px;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                max-width: 400px;
                width: 90%;
                transform: scale(0.9);
                transition: transform 0.3s ease;
            }

            .account-switch-overlay.show .account-switch-modal {
                transform: scale(1);
            }

            .account-switch-modal.success {
                border: 3px solid #28a745;
            }

            .account-switch-modal.error {
                border: 3px solid #dc3545;
            }

            .account-switch-header {
                background: linear-gradient(135deg, #007bff, #0056b3);
                color: white;
                padding: 20px;
                border-radius: 15px 15px 0 0;
                text-align: center;
            }

            .account-switch-header h3 {
                margin: 0;
                font-size: 1.2em;
            }

            .account-switch-body {
                padding: 30px;
                text-align: center;
            }

            .account-switch-spinner {
                width: 40px;
                height: 40px;
                border: 4px solid #f3f3f3;
                border-top: 4px solid #007bff;
                border-radius: 50%;
                animation: accountSwitchSpin 1s linear infinite;
                margin: 0 auto 20px;
            }

            @keyframes accountSwitchSpin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }

            .account-info {
                margin: 20px 0;
                background: #f8f9fa;
                padding: 15px;
                border-radius: 10px;
                border-left: 4px solid #007bff;
            }

            .current-account, .target-account {
                margin: 8px 0;
                color: #495057;
                font-weight: 500;
            }

            .target-account-name {
                color: #007bff;
                font-weight: bold;
            }

            .switch-status {
                color: #6c757d;
                font-style: italic;
                margin-top: 15px;
            }

            .error-message {
                color: #dc3545;
                margin-bottom: 20px;
                line-height: 1.5;
            }

            .error-ok-btn {
                background: #dc3545;
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 5px;
                cursor: pointer;
                font-weight: bold;
                transition: background 0.3s ease;
            }

            .error-ok-btn:hover {
                background: #c82333;
            }
        `;

        document.head.appendChild(style);
    }

    // 🎯 FUNÇÃO OTIMIZADA: Extrair múltiplos tokens da URL (suporte nativo ao OAuth da Deriv)
    static extractMultipleTokensFromUrl(urlParams) {
        const tokens = [];
        let tokenIndex = 1;

        // 🔄 Iterar através dos parâmetros numerados (token1, token2, etc.)
        while (urlParams.has(`token${tokenIndex}`) || urlParams.has(`acct${tokenIndex}`)) {
            const token = urlParams.get(`token${tokenIndex}`);
            const account = urlParams.get(`acct${tokenIndex}`);
            const currency = urlParams.get(`cur${tokenIndex}`) || 'USD';

            if (token) {
                tokens.push({
                    token: token,
                    accountId: account, // Pode ser null se não fornecido
                    loginId: account,   // ✅ NOVO: Alias para compatibilidade
                    currency: currency,
                    index: tokenIndex
                });

            }

            tokenIndex++;
        }

        // 🔄 Fallback: Verificar token único (compatibilidade)
        if (tokens.length === 0) {
            const singleToken = urlParams.get('token1') || urlParams.get('token');
            if (singleToken) {
                tokens.push({
                    token: singleToken,
                    accountId: urlParams.get('acct1') || urlParams.get('loginid'),
                    loginId: urlParams.get('acct1') || urlParams.get('loginid'), // ✅ NOVO
                    currency: urlParams.get('cur1') || urlParams.get('currency') || 'USD',
                    index: 1
                });

            }
        }

        return {
            tokens: tokens,
            count: tokens.length,
            hasMultiple: tokens.length > 1
        };
    }

    // 📝 ETAPA 3: Processar e salvar múltiplos tokens (com descoberta de loginId) - OTIMIZADO
    static async saveMultipleTokensFromOAuth(multiTokenData) {
        const startTime = performance.now();
        // 🔄 Obter contador de tentativas de validação para lógica de retry/oauth
        const retryCount = parseInt(localStorage.getItem('oauth_validation_retry_count') || '0');

        try {
            if (!multiTokenData || multiTokenData.tokens.length === 0) {
                console.error('❌ [OAUTH] Nenhum token recebido do OAuth');
                CommonHelpers.showError('❌ Nenhum token válido encontrado no OAuth');
                return false;
            }

            const totalTokens = multiTokenData.tokens.length;
            const tokenMappings = [];
            let lastAuthData = null;


            multiTokenData.tokens.forEach((t, i) => {

            });

            // ✅ OTIMIZAÇÃO: Usar UMA ÚNICA conexão para validar todos os tokens
            const validatorApi = new DerivAPI();


            try {
                LoadingManager.updateProgress(40, "loading.states.connecting_validation");
                const connectStart = performance.now();
                await validatorApi.connect();


                for (let i = 0; i < totalTokens; i++) {
                    const tokenData = multiTokenData.tokens[i];
                    const token = tokenData.token;
                    const index = i;
                    const tokenStart = performance.now();



                    LoadingManager.updateProgress(45 + (index * 10), `Validando conta ${index + 1}/${totalTokens}...`);

                    const MAX_RETRIES = 2;
                    let tokenValidated = false;

                    for (let attempt = 1; attempt <= MAX_RETRIES && !tokenValidated; attempt++) {
                        const attemptStart = performance.now();


                        try {
                            // Verificar estado do WebSocket
                            const wsState = validatorApi.ws ? validatorApi.ws.readyState : 'null';


                            if (!validatorApi.ws || validatorApi.ws.readyState !== WebSocket.OPEN) {

                                const reconnectStart = performance.now();
                                await validatorApi.connect();

                            }

                            // Enviar authorize

                            const authStart = performance.now();

                            // 1. Tentar autorizar (usando raw request para evitar reconexão da forceAuthorize)
                            // Timeout: Removido limite artificial de 10s. Agora respeita o timeout do socket (30s)
                            const authPromise = validatorApi.sendRequest({ "authorize": token }, false);

                            // Aguardar resposta completa do servidor (pode levar >10s em redes lentas)
                            const authResponse = await authPromise;


                            if (authResponse && authResponse.authorize && authResponse.authorize.loginid) {
                                const loginId = authResponse.authorize.loginid;
                                const tokenTime = (performance.now() - tokenStart).toFixed(0);

                                if (tokenData.loginId && loginId !== tokenData.loginId) {
                                    console.warn(`⚠️ [TOKEN ${index + 1}] ID retornado (${loginId}) difere do esperado (${tokenData.loginId})`);
                                }

                                tokenMappings.push({
                                    token: token,
                                    loginId: loginId,
                                    currency: tokenData.currency,
                                    index: index,
                                    authData: authResponse.authorize
                                });

                                lastAuthData = authResponse.authorize;


                                tokenValidated = true;

                                // Manter conexão aberta para próximo token
                                validatorApi.isAuthenticated = false;

                            } else {
                                console.error(`❌ [TOKEN ${index + 1}] Resposta inválida:`, authResponse);
                                throw new Error('Resposta de autorização inválida');
                            }

                        } catch (error) {
                            const attemptTime = (performance.now() - attemptStart).toFixed(0);
                            const errorMsg = error.message || '';
                            console.error(`❌ [TOKEN ${index + 1}] Erro na tentativa ${attempt}: ${errorMsg} (${attemptTime}ms)`);

                            if (errorMsg.includes('APP TIMEOUT')) {
                                console.error(`   👉 [DIAGNOSTIC] The SERVER did not reply within 10s. This is a latency issue, not a token issue.`);
                            }

                            const isTokenInvalid = error.code === 'InvalidToken' ||
                                errorMsg.includes('InvalidToken') ||
                                errorMsg.includes('token is invalid') ||
                                errorMsg.includes('Token inválido');

                            // 🔥 LÓGICA RIGOROSA: Se o token for inválido OU esgotar tentativas, o sistema deve agir
                            if (isTokenInvalid || attempt === MAX_RETRIES) {
                                const finalError = isTokenInvalid ? 'Token inválido/expirado' : `Falha total após ${MAX_RETRIES} tentativas: ${errorMsg}`;
                                console.error(`❌ [TOKEN ${index + 1}] ${finalError}`);

                                // 🔄 LÓGICA DE REPROCESSO (REINICIAR OU REDIRECIONAR OAUTH)
                                const newRetryCount = retryCount + 1;
                                localStorage.setItem('oauth_validation_retry_count', newRetryCount.toString());

                                if (newRetryCount <= 1) {
                                    // Primeira falha: Tentar reiniciar sistema (pode ser timeout pontual)
                                    console.warn(`⚠️ [OAUTH] Falha na conta ${index + 1}. Tentando reiniciar sistema (Attempt ${newRetryCount})...`);
                                    CommonHelpers.showWarning(`⚠️ Falha na validação da conta ${index + 1}. Reiniciando para tentar novamente...`);

                                    setTimeout(() => this.restart(), 2000);
                                } else {
                                    // Segunda falha (ou mais): Redirecionar para OAuth da Deriv
                                    console.error(`❌ [OAUTH] Falha persistente na conta ${index + 1}. Redirecionando para OAuth...`);
                                    localStorage.removeItem('oauth_validation_retry_count'); // Limpar para próxima vez após redirect
                                    CommonHelpers.showError(`❌ Erro crítico na conta ${index + 1}. Por favor, realize o login novamente.`);

                                    setTimeout(() => this.redirectToOAuth(), 2000);
                                }
                                return false; // Abortar processamento para evitar inicialização parcial
                            }

                            if (attempt < MAX_RETRIES) {
                                // Tentar recuperar conexão antes do próximo retry
                                if (!validatorApi.ws || validatorApi.ws.readyState !== WebSocket.OPEN) {
                                    try {
                                        await validatorApi.connect();
                                    } catch (e) { }
                                }
                                await new Promise(r => setTimeout(r, 1000));
                            }
                        }
                    }

                    // Log do tempo total do token
                    const tokenTotalTime = (performance.now() - tokenStart).toFixed(0);

                }
            } catch (connectionError) {
                console.error('❌ [OAUTH] Falha na conexão inicial:', connectionError);
                CommonHelpers.showError('❌ Falha na conexão com servidor de validação', connectionError);
                return false;
            }
            // 🔥 CRÍTICO: NÃO fechar validatorApi! Será reutilizado como conexão principal

            // Resumo da validação


            if (tokenMappings.length === 0) {
                console.error('❌ [OAUTH] Nenhum token validado com sucesso!');
                CommonHelpers.showWarning('⚠️ Nenhum token válido. Redirecionando para login...');
                setTimeout(() => this.redirectToOAuth(), 1000);
                return false;
            }

            const processedMappings = tokenMappings;

            if (processedMappings.length > 0) {

                LoadingManager.updateProgress(75, `${processedMappings.length} contas autorizadas salvas.`);

                // Preferir conta real se disponível, senão usar primeira
                const realAccount = processedMappings.find(m => !m.loginId.includes('VRT'));
                const primaryMapping = realAccount || processedMappings[0];

                // 🔐 CRÍTICO: Definir contexto ANTES de salvar (para validações corretas)
                const allAuthorizedLoginIds = processedMappings.map(m => m.loginId);

                localStorage.setItem('temp_authorized_loginids', JSON.stringify(allAuthorizedLoginIds));
                localStorage.setItem('oauth_authorized_loginids', JSON.stringify(allAuthorizedLoginIds));


                LoadingManager.updateProgress(80, `Criando sessão para ${allAuthorizedLoginIds.length} contas...`);

                // ✅ SUCESSO TOTAL: Limpar contador de retentativa
                localStorage.removeItem('oauth_validation_retry_count');

                // 🔑 CRÍTICO: Passar userData=null, token e allowedLoginIds corretamente

                SessionManager.createSecureSession(primaryMapping.loginId, null, primaryMapping.token, allAuthorizedLoginIds);

                // ✅ OTIMIZAÇÃO: Salvar tokens em paralelo também
                const savePromises = processedMappings.map(async (mapping, index) => {
                    SessionManager.saveTokenByLoginId(mapping.loginId, mapping.token);

                    // Progresso incremental do salvamento
                    const progress = 80 + (index / processedMappings.length) * 10;
                    LoadingManager.updateProgress(progress, `Salvando conta ${index + 1}/${processedMappings.length}...`);
                });

                await Promise.all(savePromises);

                // 📝 ETAPA 3.5: Criar lista de contas baseada nos tokens OAuth (SIMPLIFICADA)
                LoadingManager.updateProgress(90, 'loading.states.creating_account_list');

                const accountList = processedMappings.map(mapping => ({
                    loginid: mapping.loginId,
                    currency: mapping.currency,
                    is_virtual: mapping.loginId.includes('VRT') ? 1 : 0,
                    token: mapping.token
                }));

                SessionManager.saveAccountList(accountList);

                // 🔗 VINCULAR CONTAS NO SERVIDOR (para créditos globais)
                // 🛡️ SECURITY: Agora enviamos {loginId, token} para validação no backend
                if (processedMappings.length > 1) {
                    try {
                        const accountsPayload = processedMappings.map(m => ({
                            loginId: m.loginId,
                            token: m.token
                        }));

                        fetch('/api/link-accounts', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ accounts: accountsPayload })
                        }).then(res => res.json()).then(result => {

                        }).catch(err => console.warn('⚠️ [LINK ACCOUNTS] Falha ao vincular:', err.message));
                    } catch (linkError) {
                        console.warn('⚠️ [LINK ACCOUNTS] Erro:', linkError.message);
                    }
                }

                // 🎯 DEFINIR conta principal (preferir conta real)
                const mainAccount = accountList.find(acc => !acc.is_virtual) || accountList[0];

                SessionManager.setCurrentUserLoginId(mainAccount.loginid);

                // 🔑 CRÍTICO: Salvar token principal usando AMBOS os métodos para garantir compatibilidade

                SessionManager.saveTokenByLoginId(mainAccount.loginid, mainAccount.token);  // Método correto que getLocalToken() procura
                SessionManager.saveLocalToken(mainAccount.token);  // Fallback para compatibilidade

                // 🔵 VERIFICAÇÃO: Confirmar que o token foi salvo corretamente
                const verificarToken = SessionManager.getLocalToken();

                if (verificarToken) {

                } else {
                    console.error(`   ❌ ERRO CRÍTICO: Token NÃO foi salvo corretamente!`);
                }

                // 🔥 CRÍTICO: Retornar validatorApi para reutilização como conexão principal
                const primaryAuthData = processedMappings.find(m => m.loginId === mainAccount.loginid)?.authData;

                // Configurar validatorApi com o token principal
                validatorApi.sessionToken = mainAccount.token;
                validatorApi.isAuthenticated = true;
                validatorApi.currentLoginId = mainAccount.loginid;

                LoadingManager.updateProgress(95, `Finalizando configurações de ${mainAccount.loginid}...`);



                // 🔥 RETORNAR OBJETO com API e dados ao invés de boolean
                return {
                    success: true,
                    apiInstance: validatorApi,
                    primaryAuthData: primaryAuthData,
                    mainAccount: mainAccount,
                    accountList: accountList,
                    allMappings: processedMappings
                };
            } else {
                CommonHelpers.showError('❌ [MULTI-TOKEN] Nenhum token foi processado com sucesso');
                return false;
            }

        } catch (error) {

            console.error("   • Stack:", error.stack);
            CommonHelpers.showError("❌ [MULTI-TOKEN] Erro ao processar múltiplos tokens:", error);
            return false; // Retornar false em caso de erro grave
        }
    }

    static async discoverLoginIdFromToken(token) {
        try {

            // Criar conexão temporária para descobrir loginId (usando mesmo app_id)
            const tempApi = new DerivAPI(`wss://ws.derivws.com/websockets/v3?app_id=${this.appId}`);
            await tempApi.connect();

            const authResponse = await tempApi.sendRequest({ "authorize": token });
            const loginId = authResponse.authorize?.loginid;

            await tempApi.disconnect();

            if (loginId) {

                return loginId;
            } else {
                throw new Error("Resposta de autorização não contém loginId");
            }

        } catch (error) {
            CommonHelpers.showError(`❌ [DISCOVER] Erro ao descobrir loginId:`, error);
            return null;
        }
    }

    static redirectToOAuth() {

        const redirectUri = this.getRedirectUri();

        const oauthUrl = `https://oauth.deriv.com/oauth2/authorize?app_id=${this.appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${CONFIG.SCOPE}`;

        setTimeout(() => {

            window.location.href = oauthUrl;
        }, 200);
    }

    // Autorizar contas adicionais automaticamente
    static async authorizeAdditionalAccounts(userData) {
        const accounts = userData?.authorize?.account_list || [];
        const mainLoginId = userData?.authorize?.loginid;

        for (const account of accounts) {
            const loginId = account.loginid;

            // Pular a conta principal (já autorizada)
            if (loginId === mainLoginId) {
                continue;
            }

            // Verificar se já tem token
            const existingToken = SessionManager.getTokenByLoginId(loginid);
            if (existingToken) {

                continue;
            }

            try {
                // Tentar obter token para a conta adicional
                const accountToken = await this.requestAccountToken(loginId);
                if (accountToken) {
                    SessionManager.saveTokenByLoginId(loginId, accountToken);

                } else {
                    CommonHelpers.showWarning(`⚠️ Não foi possível obter token para conta ${loginId}`);
                }
            } catch (error) {
                CommonHelpers.showWarning(`⚠️ Erro ao autorizar conta ${loginId}:`, error.message);
            }
        }
    }

    // Solicitar token para uma conta específica
    static async requestAccountToken(loginId) {
        try {
            // Usar a API para solicitar autorização da conta
            const tokenResponse = await this.apiInstance.requestAccountAuthorization(loginId);
            return tokenResponse?.token || null;
        } catch (error) {
            CommonHelpers.showError(`❌ Falha ao solicitar token para ${loginId}:`, error);
            return null;
        }
    }

    // 🧪 Validação robusta de tokens com diagnóstico detalhado
    async validateTokenRobustly(token, expectedLoginId = null) {
        try {

            // 1. Validações básicas
            if (!token || typeof token !== 'string' || token.length < 10) {
                return {
                    valid: false,
                    reason: 'Token inválido ou muito curto',
                    userData: null
                };
            }

            // 2. Teste de conectividade

            const tempApi = new DerivAPI();

            try {
                await tempApi.connect();

            } catch (connectError) {
                return {
                    valid: false,
                    reason: `Falha na conectividade: ${connectError.message}`,
                    userData: null
                };
            }


            for (let attempt = 1; attempt <= 3; attempt++) {
                try {
                    const authResult = await tempApi.forceAuthorize(token, expectedLoginId);

                    if (authResult && authResult.authorize) {


                        try {
                            const fullData = await tempApi.getUserAccountData(token, { silent: true });

                            if (fullData && fullData.authorize) {

                                // Limpar conexão temporária
                                tempApi.disconnect();

                                return {
                                    valid: true,
                                    reason: 'Token válido e funcional',
                                    userData: fullData
                                };
                            } else {
                                throw new Error('Dados da conta não obtidos');
                            }
                        } catch (dataError) {
                            console.error(`   ❌ [DATA FETCH] Falha ao obter dados: ${dataError.message}`);
                            return {
                                valid: false,
                                reason: `Dados da conta inacessíveis: ${dataError.message}`,
                                userData: null
                            };
                        }
                    } else {
                        throw new Error('Resposta de autorização inválida');
                    }

                } catch (authError) {
                    console.error(`   ⚠️ [AUTHORIZATION] Tentativa ${attempt} falhou: ${authError.message}`);

                    if (attempt < 3) {

                        await new Promise(resolve => setTimeout(resolve, 2000));
                    } else {
                        console.error(`   ❌ [AUTHORIZATION] Todas as tentativas falharam`);

                        // Limpar conexão em caso de falha
                        tempApi.disconnect();

                        return {
                            valid: false,
                            reason: `Autorização falhou após 3 tentativas: ${authError.message}`,
                            userData: null
                        };
                    }
                }
            }

        } catch (error) {
            console.error(`❌ [TOKEN VALIDATION] Erro crítico na validação:`, error);
            return {
                valid: false,
                reason: `Erro crítico: ${error.message}`,
                userData: null
            };
        }

        return {
            valid: false,
            reason: 'Validação não concluída',
            userData: null
        };
    }


    // 🔧 Validar integridade do sistema
    static validateSystemIntegrity() {
        try {
            // Verificar se dados essenciais estão íntegros
            const currentUser = SessionManager.getCurrentUser();
            const hasValidSession = SessionManager.validateDataIntegrity();

            if (!hasValidSession && currentUser) {
                CommonHelpers.showWarning('⚠️ [INTEGRITY] Inconsistência detectada, limpando dados corrompidos');
                SessionManager.removeAllUserData(currentUser.loginid);
            }

            return true;
        } catch (error) {
            CommonHelpers.showError('❌ [INTEGRITY] Erro na validação do sistema:', error);
            return false;
        }
    }

    // 🏷️ Inicializar sistema de isolamento por aba
    static initTabIsolation() {
        try {
            // 🧹 Limpar dados órfãos de outras abas/sessões
            SessionManager.cleanupOrphanedSessionData();

            // 📡 Inicializar sincronização entre abas
            SessionManager.initTabSynchronization();

            // 🏷️ Obter ID da aba atual
            const tabId = SessionManager.getTabId();

            SessionManager.setSessionData('app_init', {
                timestamp: Date.now(),
                url: window.location.href,
                userAgent: navigator.userAgent.substring(0, 50) + '...'
            });

        } catch (error) {
            CommonHelpers.showError('❌ Erro ao inicializar isolamento por aba:', error);
        }
    }

    static restart() {
        SessionManager.clearUserSession();

        location.reload();
    }

    static async ensureHistoricalDataLoaded() {

        try {
            if (window.displayViewInstance) {

            } else {
                // Aguardar DisplayView estar inicializado apenas se não existir
                let attempts = 0;
                const maxAttempts = 15; // Reduzido

                while (!window.displayViewInstance && attempts < maxAttempts) {
                    await this.delay(400);
                    attempts++;
                }

                if (!window.displayViewInstance) {
                    // DisplayView ainda inicializando, continuar sem bloquear
                    return;
                }
            }

            // Aguardar market data estar conectado (verificação única)
            const displayInstance = window.displayViewInstance;
            if (!displayInstance.marketData || !displayInstance.marketData.isReady()) {

                await this.delay(1500); // Reduzido
            }

            // Para usuários VIP/ADMIN, aguardar dados históricos estarem disponíveis
            const userLevel = UserLevelsManager?.getCurrentUserLevel();
            const isVipOrAdmin = userLevel === 'VIP' || userLevel === 'ADMIN';

            if (isVipOrAdmin) {

                // Aguardar buffer ter pelo menos 25 preços
                let bufferAttempts = 0;
                const maxBufferAttempts = 15;

                while (bufferAttempts < maxBufferAttempts) {
                    const bufferData = displayInstance.marketData?.getPriceBuffer?.(
                        displayInstance.currentSymbol || 'R_10', 25
                    );

                    if (bufferData && bufferData.prices && bufferData.prices.length >= 25) {

                        break;
                    }

                    await this.delay(1000);
                    bufferAttempts++;
                }

                // Aguardar rodapé VIP processar dados históricos
                const vipFooter = FooterManager?.getCurrentFooter();
                if (vipFooter && vipFooter.analyticsData) {
                    let vipAttempts = 0;
                    const maxVipAttempts = 10;

                    while (vipAttempts < maxVipAttempts) {
                        const hasDigits = vipFooter.analyticsData.last25Digits?.length >= 10;

                        if (hasDigits) {

                            break;
                        }

                        await this.delay(1000);
                        vipAttempts++;
                    }
                }
            }

        } catch (error) {
            CommonHelpers.showError('❌ [APP MANAGER] Erro ao garantir dados históricos:', error);
            // Continuar loading mesmo com erro para não travar a interface
        }
    }

    // 🧹 Limpeza inteligente do localStorage mantendo apenas tokens de sessões anteriores
    static intelligentLocalStorageCleanup() {
        try {

            const allKeys = Object.keys(localStorage);
            let cleanedCount = 0;

            const validTokenKeys = new Set();
            const validSessionMaps = new Set();
            const validUserLoginIds = new Set();

            // Coletar todos os tokens válidos (formatos: token_LOGINID, token_LOGINID_minted)
            allKeys.forEach(key => {
                if (key.startsWith('token_') && !key.includes('_timestamp') && !key.includes('_session')) {
                    const token = localStorage.getItem(key);
                    if (token && token.length > 10) { // Token válido tem mais de 10 caracteres
                        validTokenKeys.add(key);

                        // Extrair loginId do token
                        if (key.startsWith('token_') && !key.includes('_minted')) {
                            const loginId = key.replace('token_', '').split('_')[0];
                            if (loginId && loginId.length > 5) {
                                validUserLoginIds.add(loginId);
                            }
                        }
                    }
                }

                // Coletar session_map válidos
                if (key.startsWith('session_map_')) {
                    const sessionId = localStorage.getItem(key);
                    if (sessionId) {
                        validSessionMaps.add(key);
                        const loginId = key.replace('session_map_', '');
                        validUserLoginIds.add(loginId);
                    }
                }
            });

            // 🗑️ ETAPA 2: Remover dados desnecessários mas preservar estrutura de usuários válidos
            const keysToPreserve = new Set([
                'current_user_loginid',
                'oauth_multitoken_source',
                'oauth_authorized_loginids'
            ]);

            // Adicionar chaves essenciais de usuários válidos
            validUserLoginIds.forEach(loginId => {
                keysToPreserve.add(`token_${loginId}`);
                keysToPreserve.add(`token_${loginId}_minted`);
                keysToPreserve.add(`token_${loginId}_minted_timestamp`);
                keysToPreserve.add(`token_${loginId}_minted_name`);
                keysToPreserve.add(`session_map_${loginId}`);

                // Preservar dados da sessão ativa se existir
                const sessionId = localStorage.getItem(`session_map_${loginId}`);
                if (sessionId) {
                    keysToPreserve.add(`user_data_${sessionId}`);
                    keysToPreserve.add(`access_token_${sessionId}`);
                    keysToPreserve.add(`account_list_${sessionId}`);
                }
            });

            // 🧹 LIMPEZA SELETIVA: Remover tudo exceto o que deve ser preservado
            allKeys.forEach(key => {
                let shouldRemove = false;

                // Remover dados temporários
                if (key.startsWith('temp_') ||
                    key.startsWith('lock_') ||
                    key.startsWith('activity_') ||
                    key.startsWith('log_') ||
                    key.includes('_backup') ||
                    key.includes('_trace') ||
                    key.includes('_audit')) {
                    shouldRemove = true;
                }

                // Remover timestamps órfãos e dados históricos antigos
                else if (key.includes('_timestamp') && !key.includes('_minted_timestamp')) {
                    shouldRemove = true;
                }

                // Remover dados de sessões órfãs
                else if (key.startsWith('user_data_') ||
                    key.startsWith('access_token_') ||
                    key.startsWith('account_list_') ||
                    key.startsWith('historical_data_') ||
                    key.startsWith('translated_strategy_') ||
                    key.startsWith('trade_config_') ||
                    key.startsWith('monitoring_strategy_')) {
                    if (!keysToPreserve.has(key)) {
                        shouldRemove = true;
                    }
                }

                // Remover tokens órfãos ou duplicados
                else if (key.startsWith('token_') && !keysToPreserve.has(key)) {
                    shouldRemove = true;
                }

                // Remover session_map órfãos
                else if (key.startsWith('session_map_') && !keysToPreserve.has(key)) {
                    shouldRemove = true;
                }

                // Remover dados muito grandes (> 100KB)
                else if (!keysToPreserve.has(key)) {
                    try {
                        const value = localStorage.getItem(key);
                        if (value && value.length > 100000) {
                            shouldRemove = true;
                        }
                    } catch (e) {
                        shouldRemove = true; // Se não conseguir ler, remover
                    }
                }

                if (shouldRemove) {
                    localStorage.removeItem(key);
                    cleanedCount++;
                }
            });

            const finalKeyCount = Object.keys(localStorage).length;
            const preservedTokens = Array.from(validUserLoginIds).map(loginId => {
                const hasToken = localStorage.getItem(`token_${loginId}`) ? '✅' : '❌';
                const hasMinted = localStorage.getItem(`token_${loginId}_minted`) ? '🪙' : '';
                return `${loginId}: ${hasToken}${hasMinted}`;
            }).join(', ');

            try {
                const testKey = 'quota_test_startup';
                const testData = 'x'.repeat(10000); // 10KB test
                localStorage.setItem(testKey, testData);
                localStorage.removeItem(testKey);

            } catch (quotaError) {
                CommonHelpers.showWarning('⚠️ [STARTUP CLEANUP] Ainda há problemas de quota, executando limpeza de emergência...');
                SessionManager.emergencyCleanup();
            }

        } catch (error) {
            CommonHelpers.showError('❌ [STARTUP CLEANUP] Erro na limpeza inteligente:', error);
            // Fallback para limpeza de emergência se algo der errado
            try {
                SessionManager.emergencyCleanup();
            } catch (fallbackError) {
                CommonHelpers.showError('❌ [STARTUP CLEANUP] Erro no fallback de limpeza:', fallbackError);
            }
        }
    }

    // 🕰️ Sincronização Hierárquica: Garante que o servidor esteja pronto antes de prosseguir
    static async ensureServerStability() {
        try {
            if (!this.apiInstance || !this.apiInstance.ws || this.apiInstance.ws.readyState !== WebSocket.OPEN) {
                console.warn('⚠️ [HIERARCHY] Conexão principal não está pronta para sincronização. Pulando.');
                return true; // Se não tem conexão, não há o que sincronizar
            }


            const start = performance.now();

            // Enviar PING e aguardar PONG (Garante que a fila de processamento do servidor esvaziou)
            await this.apiInstance.sendRequest({ "ping": 1 });

            const duration = (performance.now() - start).toFixed(0);

            return true;

        } catch (error) {
            console.warn('⚠️ [HIERARCHY] Falha na sincronização (não crítico):', error);
            return false;
        }
    }

    static async _connectMarketDataSafely(token, maxAttempts = CONFIG.API.MAX_RETRIES, delayMs = CONFIG.SYSTEM.UI_TRANSITION_DELAY) {
        // 🔥 HIERARQUIA: Aguardar confirmação explícita do servidor em vez de delay fixo


        const isStable = await this.ensureServerStability();

        if (!isStable) {
            // Fallback se o ping falhar: Usar delay conservador

            await new Promise(resolve => setTimeout(resolve, 800));
        } else {
            // Pequeno respiro técnico para o navegador (micro-task queue)
            await new Promise(resolve => setTimeout(resolve, 50));
        }

        const marketDataInstance = getMarketDataInstance(token);

        if (!marketDataInstance) {
            console.error('❌ [MARKET DATA] Falha ao obter instância MarketData');
            throw new Error('Não foi possível criar instância MarketData');
        }

        // 🔥 NOVO: Tentar conectar com retry em caso de erro genérico da Deriv
        let connectAttempts = 0;
        const maxConnectAttempts = 3;

        while (connectAttempts < maxConnectAttempts) {
            connectAttempts++;
            try {

                await marketDataInstance.connect();
                break; // Sucesso
            } catch (connectError) {

                if (connectAttempts < maxConnectAttempts) {
                    // Aguardar antes de tentar novamente (backoff exponencial)
                    const waitTime = 1000 * connectAttempts;

                    await new Promise(resolve => setTimeout(resolve, waitTime));

                    // Forçar reconexão limpa
                    if (marketDataInstance.ws) {
                        try { marketDataInstance.ws.close(); } catch (e) { }
                        marketDataInstance.ws = null;
                    }
                } else {
                    throw connectError;
                }
            }
        }

        let attempts = 0;
        while (!marketDataInstance.isReady() && attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, delayMs));
            attempts++;
        }

        if (!marketDataInstance.isReady()) {
            throw new Error('MarketData não conseguiu conectar');
        }


        return marketDataInstance;
    }

    // Método removido - não há necessidade de desconectar WebSocket

    // 🔄 NOVO: Aguardar que os botões de monitoramento estejam renderizados no DOM
    static async waitForMonitoringButtonsReady() {

        let attempts = 0;
        const maxAttempts = 10; // 5 segundos máximo

        while (attempts < maxAttempts) {
            const startBtn = document.getElementById('start-monitoring-btn');
            const stopBtn = document.getElementById('stop-monitoring-btn');

            if (startBtn && stopBtn) {

                return;
            }

            await this.delay(500);
            attempts++;
        }

        console.warn('⚠️ [APP MANAGER] Timeout aguardando botões de monitoramento');
    }

    static delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // 📜 Carregar scripts essenciais primeiro
    static async loadScript(scriptName) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = scriptName;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    // 🔧 Utilitários e helpers
    static async loadEssentialScripts() {
        // Carrega scripts em sequência para garantir ordem de dependência
        await this.loadScript('js/session.js');
        await this.loadScript('js/deriv-api.js');
        await this.loadScript('js/config.js');

        // 🔧 Utilitários e helpers
        await this.loadScript('js/utils/common-helpers.js');
        await this.loadScript('js/loading-manager.js');
        await this.loadScript('js/cooldown-overlay.js');
        await this.loadScript('js/text-correction-system.js');
        await this.loadScript('js/text-enhancement-integration.js');
    }

}