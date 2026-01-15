// Cliente para comunicação com a API da Deriv
// O SISTEMA DEVE SER 100% ISOLADO POR USUARIO
class DerivAPI {

    constructor() {
        this.ws = null;
        this.messageCallbacks = {}; // Armazena callbacks para cada requisição
        this.reqIdCounter = 1; // Contador para requisições únicas
        this.isAuthenticated = false; // Estado de autenticação da sessão
        this.sessionToken = null; // Token de sessão atual
        this.keepAliveInterval = null;
        this.lastActivity = Date.now();
    }

    // Função para conectar ou obter uma conexão WebSocket existente
    async connect() {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            return this.ws;
        }

        const wsUrl = `${CONFIG.WS_URL}?app_id=${CONFIG.APP_ID}`;
        this.ws = new WebSocket(wsUrl);

        return new Promise((resolve, reject) => {
            this.ws.onopen = async () => {
                this.ws.onmessage = this.handleMessage.bind(this); // Adiciona o handler único

                // 🏓 HANDSHAKE: Garantir que o servidor está processando (Ping-Pong) antes de liberar
                try {
                    const reqId = this.reqIdCounter++;
                    const handshakePromise = new Promise((pongResolve, pongReject) => {
                        const timeout = setTimeout(() => {
                            delete this.messageCallbacks[reqId];
                            pongReject(new Error("Timeout during connection handshake (Ping-Pong)"));
                        }, 5000);

                        this.messageCallbacks[reqId] = {
                            resolve: pongResolve,
                            reject: pongReject,
                            timeout: timeout
                        };
                    });

                    // Enviar Ping silenciando logs (bypass sendRequest para evitar recursão)
                    this.ws.send(JSON.stringify({ ping: 1, req_id: reqId }));
                    await handshakePromise;

                    resolve(this.ws);
                } catch (e) {
                    console.error("❌ Erro no Handshake de Conexão:", e);
                    this.ws.close();
                    reject(new Error("Falha no Handshake com o Servidor."));
                }
            };

            this.ws.onerror = (error) => {
                console.error("❌ Erro na conexão WebSocket:", error);
                reject(new Error("Erro de conexão com a API."));
            };

            this.ws.onclose = () => {

                this.isAuthenticated = false; // Reseta o estado de autenticação ao fechar
                this.messageCallbacks = {}; // Limpa callbacks ao fechar conexão
                this.stopKeepAlive();
            };
        });
    }

    // 🔐 FORÇA NOVA AUTENTICAÇÃO: Limpa cache e re-autentica com token específico
    async forceAuthorize(token, expectedLoginId = null) {

        // 🔍 DIAGNÓSTICO: Verificar formato do token
        if (!token || typeof token !== 'string') {
            throw new Error(`❌ Token inválido: ${typeof token} - "****"`);
        }
        if (token.length < 10) {
            throw new Error(`❌ Token muito curto: ${token.length} chars - "****"`);
        }
        if (!token.startsWith('a1-')) {
            console.warn(`⚠️ Token não tem prefixo esperado 'a1-': ****...${token.slice(-4)}`);
        }

        // 1. LIMPAR ESTADO COMPLETAMENTE
        this.isAuthenticated = false;
        this.sessionToken = null;
        this.messageCallbacks = {}; // Limpar callbacks pendentes

        // 2. TENTAR LOGOUT PRIMEIRO (se conexão estiver ativa)
        try {
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {

                await this.sendRequest({ "logout": 1 }, false);
            }
        } catch (logoutError) {

        }

        // 3. FECHAR E RECRIAR CONEXÃO WEBSOCKET
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }

        // 4. RECONECTAR
        await this.connect();

        // 5. AUTORIZAR COM NOVO TOKEN (COM RETRY)
        let authResult;
        let authError;

        for (let attempt = 1; attempt <= 3; attempt++) {
            try {
                authResult = await this.sendRequest({ "authorize": token }, false);
                if (authResult.error) {
                    throw new Error(authResult.error.message);
                }
                break; // Sucesso
            } catch (err) {
                authError = err;

                if (attempt < 3) await new Promise(r => setTimeout(r, 1500));
            }
        }

        if (!authResult || authResult.error) {
            const errorMsg = `Falha na autorização após 3 tentativas: ${authError ? authError.message : 'Unknown error'}`;
            console.error(`❌ [FORCE AUTH] ${errorMsg}`);
            throw new Error(errorMsg);
        }

        // 6. CONFIGURAR NOVA SESSÃO
        this.sessionToken = token;
        this.isAuthenticated = true;
        this.currentLoginId = authResult.authorize.loginid;

        // ✅ Iniciar keep-alive após autorização bem-sucedida
        this.startKeepAlive();


        // 7. VERIFICAR SE A CONTA É A ESPERADA
        if (expectedLoginId && authResult.authorize.loginid !== expectedLoginId) {
            const errorMsg = `❌ MISMATCH DE CONTA: Esperado ${expectedLoginId}, mas autorizou ${authResult.authorize.loginid}`;
            console.error(errorMsg);
            throw new Error(errorMsg);
        }

        return authResult;
    }

    // Garante que a sessão está autenticada antes de qualquer requisição
    async #ensureAuthenticated() {
        if (!this.isAuthenticated && this.sessionToken) {

            try {
                const authResponse = await this.sendRequest({ "authorize": this.sessionToken }, false); // Não autoriza novamente
                if (authResponse.error) {
                    throw new Error(authResponse.error.message);
                }
                this.isAuthenticated = true;

            } catch (error) {
                console.error("❌ Falha na reautenticação:", error);
                this.isAuthenticated = false;
                throw error;
            }
        }
    }

    // Manipulador de mensagens único para todas as respostas
    handleMessage(event) {
        const data = JSON.parse(event.data);
        const reqId = data.req_id;

        // ✅ CHART MODAL & ROBOT FIX: Disparar evento para mensagens de subscrição
        // Ticks e OHLC devem disparar evento SEMPRE, mesmo se tiverem req_id (orphaned)
        if (data.proposal_open_contract || data.tick || data.ohlc || data.balance || (!reqId && (data.tick || data.ohlc))) {
            window.dispatchEvent(new CustomEvent('deriv-api-message', { detail: data }));
        }

        if (this.messageCallbacks[reqId]) {
            const { resolve, reject, timeout } = this.messageCallbacks[reqId];
            clearTimeout(timeout);
            delete this.messageCallbacks[reqId]; // Remove a callback após a resposta

            // ✅ DIAGNOSTIC: Log the response arrival
            const responseType = data.msg_type || 'unknown';
         
            if (data.error) {
                // Se a resposta for um erro, a promessa é rejeitada.
                // 🔇 LOG SILENCIOSO: Erros de autorização inválida são comuns em trocas de conta
                if (data.error.code !== 'InvalidToken') {
                    console.warn(`❌ [DIAGNOSTIC] API Error for req_id ${reqId}:`, data.error.code);
                }
                reject(new Error(data.error.message));
            } else {
                resolve(data);
            }
        } else if (reqId) {
            // ✅ SILENCIAR WARNING se for uma requisição que já deu timeout
            if (this.timedOutReqIds && this.timedOutReqIds.has(reqId)) {
                // Silenciosamente ignorar, pois o cliente já tratou o timeout
                this.timedOutReqIds.delete(reqId); // Limpeza
            } else {
                // Ignore orphaned ticks/ohlc/balance as they are dispatched effectively
                if (data.msg_type !== 'tick' && data.msg_type !== 'ohlc' && data.msg_type !== 'balance') {
                    console.warn(`⚠️ [DIAGNOSTIC] Orphaned Message for req_id: ${reqId} received! (Did App timeout early?) Type: ${data.msg_type}`);
                }
            }
        }
    }

    // Envia uma requisição e espera pela resposta
    async sendRequest(request, shouldEnsureAuth = true, timeoutMs = 30000) {
        await this.connect();
        if (shouldEnsureAuth) {
            await this.#ensureAuthenticated();
        }

        const reqId = this.reqIdCounter++; // Incrementa o contador para cada nova requisição
        request.req_id = reqId;

        // Verifica se o WebSocket está conectado antes de enviar
        if (!this.ws) {
            throw new Error("WebSocket não está inicializado");
        }

        if (this.ws.readyState === WebSocket.CONNECTING) {
            // Aguardar conexão por até 8 segundos
            return new Promise((resolve, reject) => {
                const connectTimeout = setTimeout(() => {
                    reject(new Error("Timeout aguardando conexão WebSocket"));
                }, 8000);

                this.ws.addEventListener('open', () => {
                    clearTimeout(connectTimeout);
                    // Tenta reenviar a requisição após a conexão ser aberta
                    this.sendRequest(request, shouldEnsureAuth).then(resolve).catch(reject);
                }, { once: true });

                this.ws.addEventListener('error', (error) => {
                    clearTimeout(connectTimeout);
                    reject(new Error(`Erro de conexão WebSocket: ${error.message || 'Unknown error'}`));
                }, { once: true });
            });
        }

        if (this.ws.readyState !== WebSocket.OPEN) {
            throw new Error("WebSocket não está conectado");
        }


        // ✅ DIAGNOSTIC: Log the request type and payload
        const requestType = Object.keys(request).filter(k => k !== 'req_id')[0] || 'unknown';
    
        this.ws.send(JSON.stringify(request));
        this.lastActivity = Date.now();

        return new Promise((resolve, reject) => {
            // ✅ TIMEOUT AUMENTADO: 20s → 30s para redes muito lentas
            const timeout = setTimeout(() => {
                delete this.messageCallbacks[reqId];

                // ✅ TRACKING: Marcar ID como timed-out para evitar warnings futuros
                if (!this.timedOutReqIds) this.timedOutReqIds = new Set();
                this.timedOutReqIds.add(reqId);

                // Limpeza periódica do Set (para não crescer infinitamente)
                if (this.timedOutReqIds.size > 100) {
                    this.timedOutReqIds.clear();
                }

                console.error(`❌ [DIAGNOSTIC] WS TIMEOUT for req_id ${req_id} (${requestType}) (${timeoutMs / 1000}s limit reached)`);

                // Se authorize falhou, a conexão é inútil
                if (requestType === 'authorize') {
                    console.error('🛑 [CRITICAL] Authorize TIMEOUT. Recarregando página em 2s...');
                    this.disconnect();
                    setTimeout(() => {
                        location.reload();
                    }, 2000);
                }

                reject(new Error(`[DIAGNOSTIC] WS TIMEOUT: No response for req_id: ${req_id} (${requestType}) in ${timeoutMs / 1000}s`));
            }, timeoutMs);

            // Armazena a callback para a requisição específica
            this.messageCallbacks[reqId] = { resolve, reject, timeout };
        });
    }


    // - Status da conta
    async getUserAccountData(token, options = {}) {
        if (!token) {
            throw new Error("Token não fornecido");
        }

        const timeoutMs = options.timeout || 30000;

        // ✅ NOVO: Opção para silenciar logs quando chamado para verificação de mudança
        const silentMode = options.silent || false;

        try {
            // 🔍 VERIFICAR SAÚDE DO WEBSOCKET ANTES DE AUTENTICAR
            // ✅ OTIMIZAÇÃO: Reutilizar socket se estiver Conectando ou Aberto
            if (!this.ws || (this.ws.readyState !== WebSocket.OPEN && this.ws.readyState !== WebSocket.CONNECTING)) {

                // Fechar conexão antiga se estiver fechando ou fechada
                if (this.ws) {
                    try { this.ws.close(); } catch (e) { }
                    this.ws = null;
                }

                // Reconectar
                await this.connect();
            } else if (this.ws.readyState === WebSocket.CONNECTING) {
                // Se estiver conectando, aguardar ficar pronto
                await new Promise(resolve => {
                    const check = setInterval(() => {
                        if (this.ws.readyState === WebSocket.OPEN) {
                            clearInterval(check);
                            resolve();
                        }
                    }, 50);
                });
            }

            // 🔄 RETRY LOGIC: Tokens OAuth podem precisar de algumas tentativas
            let authResponse;
            let lastError;

            for (let attempt = 1; attempt <= 3; attempt++) {
                try {

                    authResponse = await this.sendRequest({ "authorize": token }, false, timeoutMs);

                    if (authResponse.error) {
                        lastError = new Error(authResponse.error.message);



                        // Análise específica do tipo de erro
                        const errorMsg = authResponse.error.message.toLowerCase();
                        if (errorMsg.includes('invalid') || errorMsg.includes('expired')) {
                            console.error(`   💀 [TOKEN INVALID] Token é inválido ou expirado - OAuth necessário`);
                            if (attempt === 1) {
                                // Para tokens inválidos, não tentar mais vezes
                                throw lastError;
                            }
                        } else if (errorMsg.includes('network') || errorMsg.includes('connection')) {
                            console.error(`   🌐 [NETWORK] Problema de conectividade - tentando novamente...`);
                        }

                        // Se erro é "invalid token", tentar novamente após delay
                        if (authResponse.error.message.includes('invalid') && attempt < 3) {
                            await new Promise(resolve => setTimeout(resolve, 2000));
                            continue;
                        }
                        throw lastError;
                    }


                    break;

                } catch (error) {
                    lastError = error;
                    if (!silentMode) {
                        console.error(`❌ [AUTH] Tentativa ${attempt} falhou:`, error.message);
                        if (error.stack && attempt === 3) {
                            console.error(`   📍 [STACK] ${error.stack}`);
                        }
                    }

                    if (attempt < 3) {
                        // ✅ HEARTBEAT: Notificar progresso para evitar reset do watchdog durante o delay de retry
                        if (typeof LoadingManager !== 'undefined') {
                            LoadingManager.updateProgress(LoadingManager.currentProgress, `Tentativa ${attempt} de conexão...`);
                        }
                        await new Promise(resolve => setTimeout(resolve, 2000));
                    }
                }
            }

            if (!authResponse || authResponse.error) {
                console.error('🛑 [CRITICAL] Todas as tentativas de autorização falharam. Recarregando página em 3s...');
                setTimeout(() => {
                    location.reload();
                }, 3000);
                throw lastError || new Error("Falha em todas as tentativas de autorização");
            }
            this.sessionToken = token;
            this.isAuthenticated = true;
            const authorizeData = authResponse.authorize;


            const [balanceResponse, settingsResponse, statusResponse] = await Promise.all([
                this.sendRequest({ "balance": 1, "account": "all" }, true, timeoutMs),
                this.sendRequest({ "get_settings": 1 }, true, timeoutMs),
                this.sendRequest({ "get_account_status": 1 }, true, timeoutMs)
            ]);

            const userData = {
                authorize: authorizeData,
                balance: balanceResponse.balance,
                settings: settingsResponse.get_settings,
                status: statusResponse.get_account_status
            };


            return userData;
        } catch (error) {
            if (!silentMode) {
                console.error('❌ Erro ao obter dados da API da Deriv:', error);
            }
            throw new Error("Falha na autenticação: " + error.message);
        }
    }

    // Função para trocar de conta usando loginid específico
    async switchAccount(token, targetLoginId) {
        if (!token || !targetLoginId) {
            throw new Error("Token e LoginID são obrigatórios para troca de conta");
        }

        try {
            // Re-autoriza com o token
            const authResponse = await this.sendRequest({ "authorize": token }, false);
            if (authResponse.error) {
                throw new Error(authResponse.error.message);
            }

            this.sessionToken = token;
            this.isAuthenticated = true;

            // Para trocar de conta no Deriv, precisamos usar o token específico da conta
            // e criar uma nova conexão/autorização para essa conta

            // Obter lista de contas para verificar se a conta existe
            const accountListResponse = await this.sendRequest({ "account_list": 1 });
            if (accountListResponse.error) {
                throw new Error(accountListResponse.error.message);
            }

            const accounts = accountListResponse.account_list || [];
            const targetAccount = accounts.find(acc => acc.loginid === targetLoginId);

            if (!targetAccount) {
                throw new Error(`Conta ${targetLoginId} não encontrada na lista de contas`);
            }


            // Buscar dados da conta usando o token (no Deriv, o mesmo token acessa todas as contas do usuário)
            const [balanceResponse, settingsResponse, statusResponse] = await Promise.all([
                this.sendRequest({ "balance": 1, "account": targetLoginId }),
                this.sendRequest({ "get_settings": 1 }),
                this.sendRequest({ "get_account_status": 1 })
            ]);

            // Criar objeto de resposta simulando os dados da conta específica
            const accountData = {
                ...authResponse.authorize,
                loginid: targetLoginId,
                account_list: accounts,
                // Encontrar dados específicos da conta
                currency: targetAccount.currency,
                is_virtual: targetAccount.is_virtual
            };

            return {
                authorize: accountData,
                balance: balanceResponse.balance,
                settings: settingsResponse.get_settings,
                status: statusResponse.get_account_status
            };

        } catch (error) {
            console.error("❌ Erro ao trocar de conta:", error);
            throw error;
        }
    }

    // Solicitar autorização para uma conta específica
    async requestAccountAuthorization(loginId) {

        try {
            // Tentar obter informações da conta usando o token principal
            const accountInfoResponse = await this.sendRequest({
                "account_list": 1
            });

            if (accountInfoResponse.error) {
                throw new Error(accountInfoResponse.error.message);
            }

            // Verificar se a conta está na lista de contas autorizadas
            const accounts = accountInfoResponse.account_list || [];
            const targetAccount = accounts.find(acc => acc.loginid === loginId);

            if (!targetAccount) {
                throw new Error(`Conta ${loginId} não encontrada na lista de contas`);
            }

            // Os tokens específicos serão priorizados através do OAuth multi-token
            return this.sessionToken;

        } catch (error) {
            console.error(`❌ [ACCOUNT AUTH] Erro ao autorizar conta ${loginId}:`, error);
            throw error;
        }
    }

    // 🏓 KEEP-ALIVE: Manter conexão ativa com o servidor
    startKeepAlive() {
        this.stopKeepAlive(); // Garantir que não existam múltiplos intervals

        this.keepAliveInterval = setInterval(() => {
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                // SÓ enviar ping se não houve atividade recente (> 20s)
                const now = Date.now();
                if (now - this.lastActivity > 20000) {
                    const reqId = this.getNextReqId();
                    this.ws.send(JSON.stringify({ ping: 1, req_id: reqId }));
                }
            } else {
                this.stopKeepAlive();
            }
        }, 25000); // Verificar a cada 25s
    }

    stopKeepAlive() {
        if (this.keepAliveInterval) {
            clearInterval(this.keepAliveInterval);
            this.keepAliveInterval = null;
        }
    }

    disconnect() {
        this.stopKeepAlive();
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }
}