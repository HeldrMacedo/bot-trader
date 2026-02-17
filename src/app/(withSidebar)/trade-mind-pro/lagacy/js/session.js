// 🔐 SISTEMA DE ISOLAMENTO SEGURO 100% POR USUÁRIO
// Correções de segurança implementadas para evitar conflitos entre usuários simultâneos

class SessionManager {
    // 🔑 Gerar identificador único baseado no loginId do usuário (não mais global)
    static generateUserSessionId(loginId) {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substr(2, 9);
        return `${loginId}_${timestamp}_${random}`;
    }

    // 🔐 Obter loginId atual (sem sessionId desnecessário)
    static getUserSessionId() {
        // ✅ PRIMEIRO: verificar se há loginId atual definido
        const currentLoginId = localStorage.getItem("current_user_loginid");
        if (currentLoginId) {
            return currentLoginId; // Usar loginId diretamente
        }

        // ✅ Fallback: verificar se há usuário logado e usar seu loginId
        const currentUser = this.getCurrentUser();
        if (currentUser && currentUser.authorize && currentUser.authorize.loginid) {
            return currentUser.authorize.loginid; // Usar loginId diretamente
        }

        // 🔧 CORREÇÃO: Usar sessionId global persistente se não há usuário
        let sessionId = localStorage.getItem("global_persistent_session_id");
        if (!sessionId) {
            sessionId = `session_global_${Date.now().toString(36)}`;
            localStorage.setItem("global_persistent_session_id", sessionId);
        
        }
        return sessionId;
    }

    // --- DEFINE loginId do usuário atual (para múltiplos tokens) ---
    static setCurrentUserLoginId(loginId) {
        if (!loginId) {
            CommonHelpers.showWarning("⚠️ setCurrentUserLoginId: loginId inválido");
            return;
        }

        localStorage.setItem("current_user_loginid", loginId);
    }

    // 🔑 Criar sessão segura para um usuário específico (reutilizando existente)
    static createSecureSession(loginId, userData, token, allowedLoginIds = []) {
        // 🔑 CRÍTICO: Preservar token ANTES da limpeza
        let preservedToken = token;

        // 🚀 Tentar diferentes fontes de token se não foi passado como parâmetro
        if (!preservedToken) {
            // Tentar sessão temporária primeiro (login inicial)
            const tempSessionId = localStorage.getItem("temp_session_id");
            if (tempSessionId) {
                preservedToken = localStorage.getItem(`access_token_${tempSessionId}`);
            }

            // Se ainda não tem token, tentar sessão estável existente
            if (!preservedToken) {
                const stableSessionId = `session_${loginId}`;
                preservedToken = localStorage.getItem(`access_token_${stableSessionId}`);
            }
        }

        // 🔐 Usar sessionId estável baseado no loginId (não gera novo)
        const stableSessionId = `session_${loginId}`;

        // 💾 CRÍTICO: Salvar mapeamento e dados do usuário
        localStorage.setItem(`session_map_${loginId}`, stableSessionId);
        localStorage.setItem(`current_user_loginid`, loginId);

        // 🔑 Salvar token na sessão estável
        if (preservedToken) {
            localStorage.setItem(`access_token_${stableSessionId}`, preservedToken);
        }

        // 🗑️ Remover dados temporários
        localStorage.removeItem("temp_session_id");

      
        return stableSessionId;
    }

    // 🔍 Obter sessionId de um usuário específico
    static getSessionIdByLoginId(loginId) {
        return localStorage.getItem(`session_map_${loginId}`);
    }

    // 👤 Obter usuário atual
    static getCurrentUser() {
        const currentLoginId = localStorage.getItem("current_user_loginid");
        if (!currentLoginId) return null;

        const sessionId = this.getSessionIdByLoginId(currentLoginId);
        if (!sessionId) return null;

        const userData = localStorage.getItem(`user_data_${sessionId}`);
        if (!userData) return null;

        try {
            return JSON.parse(userData);
        } catch (error) {
            CommonHelpers.showError(
                `❌ getCurrentUser: Erro ao parsear dados do usuário: ${error.message}`,
            );
            return null;
        }
    }

    // 🧹 CRÍTICO: Limpar TODOS os dados de usuários anteriores (isolamento 100%)
    static cleanupPreviousUserData(newLoginId, allowedLoginIds = []) {
        // 🔍 CORREÇÃO: Ler lista autorizada do OAuth se disponível
        const tempAuthorizedStr = localStorage.getItem(
            "temp_authorized_loginids",
        );
        if (tempAuthorizedStr) {
            try {
                const tempAuthorized = JSON.parse(tempAuthorizedStr);
                allowedLoginIds = [...allowedLoginIds, ...tempAuthorized];
            } catch (e) {
                CommonHelpers.showWarning("⚠️ Erro ao ler temp_authorized_loginids:", e);
            }
        }

        // 🎯 ESTRATÉGIA OAUTH SAFE: Proteger todos os tokens OAuth válidos + conta atual
        // 🔍 Detectar TODAS as contas com tokens OAuth válidos
        const storageKeys = Object.keys(localStorage);
        const oauthAccounts = storageKeys
            .filter(
                (key) =>
                    key.startsWith("token_") &&
                    !key.includes("_timestamp") &&
                    !key.includes("_session") &&
                    key.match(/^token_[A-Z]+\d+$/), // Pattern: token_CR123456 ou token_VRTC123456
            )
            .map((key) => key.replace("token_", ""));

        const protectedIds = new Set([
            newLoginId,
            ...allowedLoginIds,
            ...oauthAccounts,
        ]);

        // 🔍 Encontrar TODOS os usuários salvos anteriormente
        const allKeys = Object.keys(localStorage);
        const usersToClean = new Set();

        allKeys.forEach((key) => {
            if (key.startsWith("session_map_")) {
                const oldLoginId = key.replace("session_map_", "");

                // ✅ SÓ preservar se está na lista explícita de contas autorizadas
                if (!protectedIds.has(oldLoginId)) {
                    usersToClean.add(oldLoginId);
                }
            }
        });

        // 🗑️ Remover dados de usuários não autorizados
        if (usersToClean.size > 0) {
            usersToClean.forEach((oldLoginId) => {
                this.removeAllUserData(oldLoginId);
            });
        }

        // 🧹 Limpar dados temporários e globais
        allKeys.forEach((key) => {
            if (
                key.startsWith("temp_") ||
                key.startsWith("access_token_temp_") ||
                key.startsWith("user_data_temp_") ||
                key.startsWith("historical_data_temp_") ||
                key.startsWith("translated_strategy_temp_")
            ) {
                localStorage.removeItem(key);
            }
        });

        // 🔐 CRÍTICO: Validação pós-limpeza para garantir 100% de isolamento
        this.validatePostCleanupIsolation(protectedIds);
    }

    // 🔐 Validação crítica: Garantir que nenhum token de usuário não autorizado permanece
    static validatePostCleanupIsolation(protectedLoginIds) {
        // 🚨 PROTEÇÃO OAUTH: Verificar se há tokens OAuth ativos que devem ser preservados
        const oauthMultiToken =
            localStorage.getItem("oauth_multitoken_source") === "true";
        let oauthProtectedIds = [];

        if (oauthMultiToken) {
            // Primeiro: tentar chave estável oauth_authorized_loginids
            const stableAuthorizedStr = localStorage.getItem(
                "oauth_authorized_loginids",
            );
            if (stableAuthorizedStr) {
                try {
                    oauthProtectedIds = JSON.parse(stableAuthorizedStr);
                } catch (e) {
                    CommonHelpers.showWarning(
                        "⚠️ Erro ao ler oauth_authorized_loginids:",
                        e,
                    );
                }
            }

            // Fallback: temp_authorized_loginids se estável não existir
            if (oauthProtectedIds.length === 0) {
                const tempAuthorizedStr = localStorage.getItem(
                    "temp_authorized_loginids",
                );
                if (tempAuthorizedStr) {
                    try {
                        oauthProtectedIds = JSON.parse(tempAuthorizedStr);
                    } catch (e) {
                        CommonHelpers.showWarning(
                            "⚠️ Erro ao ler temp_authorized_loginids na validação:",
                            e,
                        );
                    }
                }
            }

            // Adicionar IDs OAuth à lista de proteção
            protectedLoginIds = new Set([
                ...Array.from(protectedLoginIds),
                ...oauthProtectedIds,
            ]);
        }

        const allKeys = Object.keys(localStorage);
        const leakedTokens = [];
        const leakedAccessTokens = [];

        // 🔍 ETAPA 1: Mapear sessionIds para loginIds protegidos
        const protectedSessionIds = new Set();
        protectedLoginIds.forEach((loginId) => {
            const sessionId = this.getSessionIdByLoginId(loginId);
            if (sessionId) {
                protectedSessionIds.add(sessionId);
            }
        });

        allKeys.forEach((key) => {
            // ✅ VERIFICAR: token_* keys (vazamento por loginId)
            if (key.startsWith("token_")) {
                let loginIdFromKey = null;

                // Padrão: token_LOGINID_SESSIONID
                const match1 = key.match(/^token_([^_]+)_/);
                if (match1) {
                    loginIdFromKey = match1[1];
                }
                // Padrão: token_LOGINID (sem sessionId)
                else if (key.startsWith("token_") && !key.includes("_", 6)) {
                    loginIdFromKey = key.substring(6);
                }

                // Se encontrou loginId e não está protegido, é vazamento!
                if (loginIdFromKey && !protectedLoginIds.has(loginIdFromKey)) {
                    leakedTokens.push({ key, loginId: loginIdFromKey });
                }
            }

            // ✅ VERIFICAR: access_token_* keys (vazamento por sessionId órfão)
            else if (key.startsWith("access_token_")) {
                const sessionIdFromKey = key.substring(13); // Remove 'access_token_'

                // Se sessionId não está mapeado para usuário protegido, é vazamento!
                if (!protectedSessionIds.has(sessionIdFromKey)) {
                    leakedAccessTokens.push({
                        key,
                        sessionId: sessionIdFromKey,
                    });
                }
            }
        });

        // 🚨 CRÍTICO: Remover tokens vazados e alertar
        const totalLeaks = leakedTokens.length + leakedAccessTokens.length;
        if (totalLeaks > 0) {
            leakedTokens.forEach((leak) => {
                localStorage.removeItem(leak.key);
            });

            leakedAccessTokens.forEach((leak) => {
                localStorage.removeItem(leak.key);
            });
        }
    }

    // 🗑️ Remover TODOS os dados de um usuário específico
    static removeAllUserData(loginId) {
        const sessionId = this.getSessionIdByLoginId(loginId);
        if (!sessionId) return;

        // 🧹 Remover dados do usuário
        localStorage.removeItem(`user_data_${sessionId}`);
        localStorage.removeItem(`access_token_${sessionId}`);
        localStorage.removeItem(`account_list_${sessionId}`);
        localStorage.removeItem(`historical_data_${sessionId}`);
        localStorage.removeItem(`translated_strategy_${sessionId}`);
        localStorage.removeItem(`trade_config_${sessionId}`);
        localStorage.removeItem(`monitoring_strategy_${sessionId}`);

        // 🧹 CRÍTICO: Remover TODOS os tokens associados ao loginId (múltiplos padrões de chave)
        const allKeys = Object.keys(localStorage);
        allKeys.forEach((key) => {
            // ✅ Remover tokens por sessionId
            if (key.startsWith(`token_`) && key.endsWith(`_${sessionId}`)) {
                localStorage.removeItem(key);
            }
            // ✅ CRÍTICO: Remover tokens diretos por loginId (vazamento encontrado pelo Architect)
            else if (
                key === `token_${loginId}` ||
                key.startsWith(`token_${loginId}_`)
            ) {
                localStorage.removeItem(key);
            }
        });

        // 🧹 Remover mapeamento de sessão
        localStorage.removeItem(`session_map_${loginId}`);

        // 🧹 CRÍTICO: Limpar current_user_loginid se for do usuário removido
        const currentLoginId = localStorage.getItem("current_user_loginid");
        if (currentLoginId === loginId) {
            localStorage.removeItem("current_user_loginid");
        }
    }

    static getLocalToken() {
        // 🔐 SEGURANÇA: Obter token da conta atualmente selecionada
        const currentLoginId = localStorage.getItem("current_user_loginid");

        if (currentLoginId) {
            // 🎯 PRIORIDADE 1: Token durável (minted)
            const durableToken = this.getDurableToken(currentLoginId);
            if (durableToken) {
                return durableToken;
            }

            // 🎯 FALLBACK: Token OAuth original (se durável falhar)
            const token = this.getTokenByLoginId(currentLoginId);

            if (token) {
                // ✅ CORREÇÃO: Usar OAuth temporário é comportamento normal para contas não-admin
                // Apenas logar uma vez por sessão para não poluir console
                if (!this._oauthTokenLoggedOnce) {
                   
                    this._oauthTokenLoggedOnce = true;
                }
                return token;
            }
        }

        // Fallback para método antigo (compatibilidade)
        const sessionId = this.getUserSessionId();
        const token = localStorage.getItem(`access_token_${sessionId}`);

        // Não logar durante processo de inicialização
        return token;
    }

    static saveLocalToken(token) {
        const sessionId = this.getUserSessionId();
        localStorage.setItem(`access_token_${sessionId}`, token);
    }

    static saveUserData(userData, allowedLoginIds = null) {
        const loginId = userData?.authorize?.loginid;
        if (!loginId) {
            CommonHelpers.showError("❌ LoginId não encontrado nos dados do usuário");
            return;
        }

        // 🚀 OTIMIZAÇÃO: Sempre usar sessão estável baseada no loginId
        const stableSessionId = `session_${loginId}`;
        
        // Definir loginId atual e mapeamento
        localStorage.setItem(`current_user_loginid`, loginId);
        localStorage.setItem(`session_map_${loginId}`, stableSessionId);
        
        const sessionId = stableSessionId;

        // 💾 OTIMIZAÇÃO: Substituir dados em vez de acumular
        try {
            const userDataStr = JSON.stringify(userData);
            
            // 🔧 SUBSTITUIR dados existentes na mesma chave
            localStorage.setItem(`user_data_${sessionId}`, userDataStr);
            
        } catch (error) {
            if (error.name === "QuotaExceededError") {
                CommonHelpers.showWarning("⚠️ [QUOTA] Limite de armazenamento excedido, limpando dados antigos...");
                
                // 🧹 LIMPEZA INTELIGENTE: Remover apenas dados desnecessários
                this.smartCleanupForQuota(loginId);
                
                // Tentar novamente após limpeza
                try {
                    localStorage.setItem(`user_data_${sessionId}`, userDataStr);
                } catch (retryError) {
                    CommonHelpers.showError("❌ [QUOTA] Falha após limpeza:", retryError);
                    throw retryError;
                }
            } else {
                throw error;
            }
        }

        // 🔄 Verificar se token foi migrado corretamente
        const migratedToken = this.getLocalToken();

        if (migratedToken && loginId) {
            this.saveTokenByLoginId(loginId, migratedToken);
        } else if (currentToken && loginId) {
            // 🚨 Fallback: forçar salvamento se migração falhou
            CommonHelpers.showWarning(
                "⚠️ Forçando salvamento de token após falha na migração",
            );
            localStorage.setItem(`access_token_${sessionId}`, currentToken);
            this.saveTokenByLoginId(loginId, currentToken);

            // 🔍 Verificar novamente após fallback
            const fallbackToken = this.getLocalToken();
        }

        // 🤓 Notificar sistema de usuários online
        if (
            typeof window !== "undefined" &&
            window.onlineUsersMonitor &&
            loginId
        ) {
            window.onlineUsersMonitor.handleUserLogin(loginId);
        }

        // 🚀 NOVO: Disparar evento de login para sistemas dependentes
        if (typeof window !== "undefined" && loginId) {
            window.dispatchEvent(new CustomEvent('userLogin', {
                detail: { loginId: loginId, userData: userData }
            }));
        }

        // 🔄 Salvar lista de contas (só se NÃO viemos de OAuth multi-token)
        const accounts = userData?.authorize?.account_list || [];
        const isOAuthMultiToken =
            localStorage.getItem("oauth_multitoken_source") === "true";
        const hasMultipleTokens = this.hasPerAccountTokens();

        if (!isOAuthMultiToken && !hasMultipleTokens) {
            // Fluxo tradicional - aplicar token principal a todas as contas
            this.saveMultipleTokens(
                accounts,
                loginId,
                migratedToken || currentToken,
            );
        } else {
            // Fluxo OAuth multi-token ou tokens específicos já existem
            this.saveAccountList(accounts);
            if (isOAuthMultiToken) {
            }
        }
    }

    static getUserData() {
        const sessionId = this.getUserSessionId();
        const data = localStorage.getItem(`user_data_${sessionId}`);
        return data ? JSON.parse(data) : null;
    }

    // 🔐 Operações protegidas contra race conditions com validação de integridade
    static safeStorageOperation(key, operation) {
        const lockKey = `lock_${key}`;
        const lockTimestamp = Date.now();

        try {
            // 🔍 Validação pré-operação
            const preValidation = this.validateOperationIntegrity(key);
            if (!preValidation.valid) {
                CommonHelpers.showWarning(
                    `⚠️ Validação pré-operação falhou para ${key}: ${preValidation.reason}`,
                );
                return null;
            }

            // 🔒 Verificar se há lock ativo
            const existingLock = localStorage.getItem(lockKey);
            if (existingLock && lockTimestamp - parseInt(existingLock) < 1000) {
                CommonHelpers.showWarning(`⚠️ Operação bloqueada por lock: ${key}`);
                return null;
            }

            // 🔒 Criar lock
            localStorage.setItem(lockKey, lockTimestamp.toString());

            // ✅ Executar operação
            const result = operation();

            // 🔍 Validação pós-operação
            const postValidation = this.validateOperationIntegrity(key);
            if (!postValidation.valid) {
                CommonHelpers.showWarning(
                    `⚠️ Problema de integridade após operação ${key}: ${postValidation.reason}`,
                );
            }

            // 🔓 Remover lock
            localStorage.removeItem(lockKey);

            return result;
        } catch (error) {
            // 🔓 Garantir remoção do lock em caso de erro
            localStorage.removeItem(lockKey);
            throw error;
        }
    }

    // 🔍 Validação de integridade para operações críticas
    static validateOperationIntegrity(key) {
        try {
            // 🚀 MODO FLEXÍVEL: Permitir operações durante processo de login/autenticação e monitoramento
            const isLoginProcess =
                key.includes("temp_") ||
                key.includes("user_data_") ||
                key.includes("account_list_") ||
                key.includes("historical_data_") ||
                key.includes("translated_strategy_") ||
                key.includes("trade_config_");

            // 🔑 Verificar se há usuário atual válido (flexível durante login)
            const currentUser = this.getCurrentUser();
            if (!currentUser && !isLoginProcess) {
                return { valid: false, reason: "Nenhum usuário autenticado" };
            }

            // c��� Verificar consistência de sessionId (flexível durante login)
            if (currentUser && !isLoginProcess) {
                const expectedSessionId = this.getSessionIdByLoginId(
                    currentUser.loginid,
                );
                const currentSessionId = this.getUserSessionId();
                if (
                    expectedSessionId &&
                    currentSessionId &&
                    expectedSessionId !== currentSessionId
                ) {
                    return {
                        valid: false,
                        reason: "Inconsistência de sessionId detectada",
                    };
                }
            }

            // 🔍 Verificar se não há tentativas de acesso simultâneo suspeitas (flexível durante login)
            if (!isLoginProcess) {
                const suspiciousActivity = this.detectSuspiciousActivity(key);
                if (suspiciousActivity.detected) {
                    return {
                        valid: false,
                        reason: `Atividade suspeita: ${suspiciousActivity.reason}`,
                    };
                }
            }

            return { valid: true, reason: "Integridade validada" };
        } catch (error) {
            return {
                valid: false,
                reason: `Erro na validação: ${error.message}`,
            };
        }
    }

    // 🚨 Detectar atividade suspeita
    static detectSuspiciousActivity(key) {
        try {
            const now = Date.now();
            const userId = this.getCurrentUser()?.loginid;

            // 🔧 Para operações do monitoramento, usar um ID alternativo se necessário
            const isMonitoringOperation =
                key.includes("translated_strategy_") ||
                key.includes("trade_config_");
            if (!userId && isMonitoringOperation) {
                // Tentar obter ID da sessão como fallback
                const sessionId = this.getUserSessionId();
                if (sessionId) {
                } else {
                    return {
                        detected: true,
                        reason: "Usuário não identificado",
                    };
                }
            } else if (!userId) {
                return { detected: true, reason: "Usuário não identificado" };
            }

            // 📊 Verificar frequência de operações
            const effectiveUserId =
                userId ||
                this.getUserSessionId()?.substring(0, 10) ||
                "anonymous";
            const activityKey = `activity_${effectiveUserId}_${key}`;
            const recentActivity = JSON.parse(
                localStorage.getItem(activityKey) || "[]",
            );

            // 🧹 Limpar atividades antigas (> 1 minuto)
            const recentOps = recentActivity.filter(
                (timestamp) => now - timestamp < 60000,
            );

            // 🚨 Detectar operações muito frequentes (> 10 por minuto)
            if (recentOps.length > 10) {
                return {
                    detected: true,
                    reason: "Operações muito frequentes detectadas",
                };
            }

            // 📝 Registrar esta operação
            recentOps.push(now);
            localStorage.setItem(activityKey, JSON.stringify(recentOps));

            return { detected: false, reason: "Nenhuma atividade suspeita" };
        } catch (error) {
            return {
                detected: true,
                reason: `Erro na detecção: ${error.message}`,
            };
        }
    }

    // 🔧 Operação crítica com retry automático
    static async criticalOperation(key, operation, maxRetries = 3) {
        let lastError = null;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                // 📊 Executar operação com timeout
                const result = await Promise.race([
                    Promise.resolve(this.safeStorageOperation(key, operation)),
                    new Promise((_, reject) =>
                        setTimeout(
                            () => reject(new Error("Timeout na operação")),
                            5000,
                        ),
                    ),
                ]);

                if (result !== null) {
                    return result;
                } else {
                    throw new Error(
                        "Operação retornou null (provavelmente por lock ou validação)",
                    );
                }
            } catch (error) {
                lastError = error;
                CommonHelpers.showWarning(
                    `⚠️ Tentativa ${attempt} falhou para ${key}:`,
                    error.message,
                );

                if (attempt < maxRetries) {
                    // 🔄 Aguardar antes da próxima tentativa (backoff exponencial)
                    const delay = Math.pow(2, attempt) * 100; // 200ms, 400ms, 800ms
                    await new Promise((resolve) => setTimeout(resolve, delay));

                    // 🧹 Limpar estado possivelmente corrompido
                    this.cleanupCorruptedState(key);
                }
            }
        }

        CommonHelpers.showError(
            `❌ Operação crítica falhou após ${maxRetries} tentativas: ${key}`,
        );
        throw lastError;
    }

    // 🧹 Limpar estado corrompido
    static cleanupCorruptedState(key) {
        try {
            // 🔓 Remover locks órfãos
            const lockKey = `lock_${key}`;
            localStorage.removeItem(lockKey);

            // 🧹 Limpar dados de atividade relacionados
            const userId = this.getCurrentUser()?.loginid;
            if (userId) {
                const activityKey = `activity_${userId}_${key}`;
                localStorage.removeItem(activityKey);
            }
        } catch (error) {
            CommonHelpers.showError("❌ Erro ao limpar estado corrompido:", error);
        }
    }

    // 🧹 NOVA: Limpeza inteligente para quota excedida
    static smartCleanupForQuota(currentLoginId) {
        let removedItems = 0;
        const allKeys = Object.keys(localStorage);
        
        // 1. Remover dados de teste de quota
        allKeys.forEach(key => {
            if (key.startsWith('quota_test_')) {
                localStorage.removeItem(key);
                removedItems++;
            }
        });

        // 2. Remover sessionIds órfãos (sem user_data correspondente)
        const sessionMaps = allKeys.filter(key => key.startsWith('session_map_'));
        sessionMaps.forEach(sessionMapKey => {
            const loginId = sessionMapKey.replace('session_map_', '');
            const sessionId = localStorage.getItem(sessionMapKey);
            
            if (sessionId && !localStorage.getItem(`user_data_${sessionId}`)) {
                localStorage.removeItem(sessionMapKey);
                removedItems++;
            }
        });

        // 3. Remover tokens duplicados (manter apenas formato canônico)
        const allTokenKeys = allKeys.filter(key => key.startsWith('token_'));
        const tokensByLoginId = {};
        
        // Agrupar tokens por loginId
        allTokenKeys.forEach(key => {
            const match = key.match(/^token_([^_]+)/);
            if (match) {
                const loginId = match[1];
                if (!tokensByLoginId[loginId]) tokensByLoginId[loginId] = [];
                tokensByLoginId[loginId].push(key);
            }
        });

        // Manter apenas token canônico para cada loginId
        Object.entries(tokensByLoginId).forEach(([loginId, keys]) => {
            if (keys.length > 1) {
                const canonicalKey = `token_${loginId}`;
                const canonicalToken = localStorage.getItem(canonicalKey);
                
                if (canonicalToken) {
                    // Remover todos os outros formatos
                    keys.forEach(key => {
                        if (key !== canonicalKey && !key.endsWith('_minted') && !key.endsWith('_timestamp')) {
                            localStorage.removeItem(key);
                            removedItems++;
                        }
                    });
                }
            }
        });

        // 4. Remover dados históricos antigos (VIP analytics)
        allKeys.forEach(key => {
            if (key.startsWith('vip_analytics_') || key.startsWith('historical_data_')) {
                const data = localStorage.getItem(key);
                try {
                    const parsed = JSON.parse(data);
                    if (parsed.lastUpdate && Date.now() - parsed.lastUpdate > 24 * 60 * 60 * 1000) {
                        // Remover dados históricos com mais de 24h
                        localStorage.removeItem(key);
                        removedItems++;
                    }
                } catch (e) {
                    // Se não conseguir parsear, remover
                    localStorage.removeItem(key);
                    removedItems++;
                }
            }
        });

        // ✅ VALIDAÇÃO PÓS-LIMPEZA: Verificar se dados essenciais foram preservados
        const currentUserStillExists = localStorage.getItem("current_user_loginid");
        const currentSessionStillExists = currentUser && localStorage.getItem(`user_data_session_${currentUser.loginid}`);
        const tokensPreserved = Object.keys(localStorage).filter(key => 
            key.startsWith("token_") && key.match(/^token_[A-Z]+\d+$/)
        ).length;

               
        return removedItems;
    }

    // --- SALVA A LISTA DE CONTAS (com proteção) ---
    static saveAccountList(accountList) {
        const sessionId = this.getUserSessionId();
        return this.safeStorageOperation(`account_list_${sessionId}`, () => {
            localStorage.setItem(
                `account_list_${sessionId}`,
                JSON.stringify(accountList),
            );

            return true;
        });
    }

    // --- RECUPERA A LISTA DE CONTAS ---
    static getAccountList() {
        const sessionId = this.getUserSessionId();
        let data = localStorage.getItem(`account_list_${sessionId}`);

        // 🔍 FALLBACK: Se não encontrar na sessão atual, buscar em qualquer sessão OAuth
        if (!data) {
            const allKeys = Object.keys(localStorage);
            const accountListKeys = allKeys.filter((key) =>
                key.startsWith("account_list_"),
            );

            // Preferir sessão mais recente
            for (const key of accountListKeys.reverse()) {
                const listData = localStorage.getItem(key);
                if (listData) {
                    try {
                        const accounts = JSON.parse(listData);
                        if (accounts.length > 0) {
                            return accounts;
                        }
                    } catch (e) {
                        CommonHelpers.showWarning(
                            `⚠️ [ACCOUNT LIST] Erro ao ler ${key}:`,
                            e,
                        );
                    }
                }
            }
            // Não logar durante processo de inicialização
            return [];
        }

        return data ? JSON.parse(data) : [];
    }

    // --- SALVA token por loginId (com validação flexível durante login) ---
    static saveTokenByLoginId(loginId, token) {
        if (!loginId || !token) {
            CommonHelpers.showWarning(
                `⚠️ LoginId ou token inválido: loginId=${loginId}, token=${token ? "presente" : "ausente"}`,
            );
            return;
        }

        // 🚀 MODO FLEXÍVEL: Usar fallback seguro durante processo de login
        const currentUser = this.getCurrentUser();
        const currentUserLoginId =
            currentUser?.loginid ||
            localStorage.getItem("current_user_loginid");

        // ✅ Durante login inicial, permitir salvamento mais flexível
        if (currentUserLoginId) {
            // ✅ Permitir para conta principal ou contas associadas
            const accounts = this.getAccountList();
            const isValidAccount =
                currentUserLoginId === loginId ||
                accounts.some((acc) => acc.loginid === loginId) ||
                !accounts.length; // Permitir durante processo inicial

            if (!isValidAccount) {
                CommonHelpers.showWarning(
                    `⚠️ Tentativa de salvar token para usuário não autorizado: ${loginId}`,
                );
                return;
            }
        }

        // 🧹 CRÍTICO: Purgar TODAS as chaves antigas para este loginId

        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(`token_${loginId}`)) {
                keysToRemove.push(key);
            }
        }

        // Remover chaves antigas
        keysToRemove.forEach((key) => {
            localStorage.removeItem(key);
        });

        // 💾 Salvar com formato canônico + compatibilidade + TIMESTAMP
        const sessionId = this.getUserSessionId();
        const timestamp = Date.now();
        localStorage.setItem(`token_${loginId}`, token); // Formato canônico
        localStorage.setItem(`token_${loginId}_${sessionId}`, token); // Compatibilidade
        localStorage.setItem(`token_${loginId}_timestamp`, timestamp); // Timestamp para diagnóstico
    }

    // --- OBTÉM token por loginId (com precedência canônica) ---
    static getTokenByLoginId(loginId) {
        // 🎯 PRECEDÊNCIA 1: Formato canônico (sempre prioritário)
        const canonicalKey = `token_${loginId}`;
        const canonicalToken = localStorage.getItem(canonicalKey);
        if (canonicalToken) {
            return canonicalToken;
        }

        // 🎯 PRECEDÊNCIA 2: Formato com sessão atual
        const sessionId = this.getUserSessionId();
        const sessionKey = `token_${loginId}_${sessionId}`;
        const sessionToken = localStorage.getItem(sessionKey);
        if (sessionToken) {
            return sessionToken;
        }

        // 🎯 PRECEDÊNCIA 3: Buscar outras variações (fallback)

        const fallbackKeys = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (
                key &&
                key.startsWith(`token_${loginId}_`) &&
                key !== sessionKey
            ) {
                fallbackKeys.push(key);
            }
        }

        if (fallbackKeys.length > 0) {
            // Usar o primeiro encontrado como fallback
            const fallbackKey = fallbackKeys[0];
            const fallbackToken = localStorage.getItem(fallbackKey);

            return fallbackToken;
        }

        // 🎯 PRECEDÊNCIA 4: Último recurso - access_token (compatibilidade)
        const accessKey = `access_token_${sessionId}`;
        const accessToken = localStorage.getItem(accessKey);
        if (accessToken) {
            return accessToken;
        }

        return null;
    }

    // --- 🪙 MINT TOKEN DURÁVEL: Converte token OAuth temporário em token durável ---
    static async mintDurableToken(loginId, tempToken) {
        const tempApi = new DerivAPI();

        try {
            // 1. Criar instância Deriv API temporária e autorizar
            await tempApi.connect();
            await tempApi.forceAuthorize(tempToken, loginId);

            // 2. Tentar criar token durável via api_token
            // Nota: Isto funcionará se a conta tiver permissão para criar API tokens
            const response = await tempApi.sendRequest({
                api_token: 1,
                new_token: `TradingBot_${loginId}_${Date.now()}`,
                new_token_scopes: ["read", "trade"],
            });

            if (response.error) {
                throw new Error(`Deriv API Error: ${response.error.message}`);
            }

            if (!response.api_token || !response.api_token.token) {
                throw new Error("Token durável não retornado pela API");
            }

            const durableToken = response.api_token.token;
           

            // 3. Salvar token durável com marcador especial
            const mintTimestamp = Date.now();
            localStorage.setItem(`token_${loginId}_minted`, durableToken);
            localStorage.setItem(
                `token_${loginId}_minted_timestamp`,
                mintTimestamp,
            );
            localStorage.setItem(
                `token_${loginId}_minted_name`,
                response.api_token.display_name || "",
            );

            return { minted: true, token: durableToken };
        } catch (error) {
            // Se falhar por qualquer motivo, usar token OAuth temporário
            if (
                error.message.includes("Permission denied") ||
                error.message.includes("InvalidToken")
            ) {
              
            } 
            return { minted: false, token: tempToken };
        } finally {
            // Garantir cleanup de conexão em todos os caminhos
            try {
                await tempApi.disconnect();
            } catch (e) {
                // Ignorar erros de disconnect
            }
        }
    }

    // --- OBTÉM token durável (preferência: minted > original) ---
    static getDurableToken(loginId) {
        // 1. Tentar obter token minted primeiro
        const mintedToken = localStorage.getItem(`token_${loginId}_minted`);
        if (mintedToken) {
            const mintTimestamp = localStorage.getItem(
                `token_${loginId}_minted_timestamp`,
            );
            const age = Date.now() - parseInt(mintTimestamp || "0");
            const ageHours = Math.floor(age / 3600000);

            // Tokens duráveis geralmente são válidos por semanas/meses
            if (age < 7 * 24 * 3600000) {
                // 7 dias
                return mintedToken;
            } else {
                CommonHelpers.showWarning(
                    `⚠️ [DURABLE TOKEN] Token minted expirado para ${loginId} (${ageHours}h)`,
                );
                // Limpar token expirado
                localStorage.removeItem(`token_${loginId}_minted`);
                localStorage.removeItem(`token_${loginId}_minted_timestamp`);
            }
        }

        // 2. Fallback para token original se não há minted ou está expirado
        const originalToken = this.getTokenByLoginId(loginId);
        if (originalToken) {
            return originalToken;
        }

        CommonHelpers.showWarning(
            `⚠️ [DURABLE TOKEN] Nenhum token encontrado para ${loginId}`,
        );
        return null;
    }

    // --- FINALIZAR PROCESSO OAUTH: Limpar flags temporárias após minting ---
    static finalizeOAuthProcess(successfulMints = []) {
        // Limpar flags temporárias OAuth
        localStorage.removeItem("oauth_multitoken_source");
        localStorage.removeItem("temp_authorized_loginids");
        localStorage.removeItem("last_oauth_attempt");

        // Limpar tokens temporários para contas que tiveram minting bem-sucedido
        successfulMints.forEach((loginId) => {
            // Manter apenas tokens minted, remover originais OAuth
            const mintedToken = localStorage.getItem(`token_${loginId}_minted`);
            if (mintedToken) {
                localStorage.removeItem(`token_${loginId}_timestamp`);
                // Manter formato canônico mas com token minted
                localStorage.setItem(`token_${loginId}`, mintedToken);
            }
        });
    }

    // --- SALVA tokens múltiplos (com validação flexível durante login) ---
    static saveMultipleTokens(
        accounts = [],
        mainLoginId = null,
        mainToken = null,
    ) {
        // 🚀 MODO FLEXÍVEL: Durante o processo de login inicial, usar fallback seguro
        const currentUser = this.getCurrentUser();
        const currentUserLoginId =
            currentUser?.loginid ||
            localStorage.getItem("current_user_loginid");

        // ✅ Validar apenas se há conflito real (flexível durante processo de login)
        if (
            currentUserLoginId &&
            mainLoginId &&
            currentUserLoginId !== mainLoginId
        ) {
            CommonHelpers.showWarning(
                `⚠️ Tentativa de salvar tokens para usuário diferente: ${mainLoginId} vs ${currentUserLoginId}`,
            );
            return;
        }

        accounts.forEach((acc) => {
            if (acc.loginid === mainLoginId && mainToken) {
                this.saveTokenByLoginId(acc.loginid, mainToken);
            } else if (acc.token) {
                // caso especial (se o OAuth retornar tokens extras algum dia)
                this.saveTokenByLoginId(acc.loginid, acc.token);
            } else {
                // 🔍 Verificar se a conta pode usar o token principal
                if (mainToken && this.isAccountAccessibleWithMainToken(acc)) {
                    this.saveTokenByLoginId(acc.loginid, mainToken);
                } else {
                    // 🎯 NOVA ESTRATÉGIA: Para contas que não podem compartilhar token, obter token específico

                    this.requestSpecificTokenForAccount(acc.loginid, mainToken);
                }
            }
        });

        // sempre salvar lista de contas
        this.saveAccountList(accounts);
    }

    // Verificar se uma conta pode usar o token principal
    static isAccountAccessibleWithMainToken(account) {
        // 🎯 NOVA ABORDAGEM: Com tokens específicos do OAuth, permitir uso mais flexível
        // Agora que temos tokens específicos para cada conta, podemos ser menos restritivos
        const currentUser = this.getCurrentUser();

        // ✅ Sempre permitir se a conta tem informações básicas (será usada apenas como fallback)
        // Os tokens específicos serão priorizados através do OAuth multi-token
        const hasBasicInfo =
            account.currency &&
            (account.is_virtual !== undefined || account.loginid);

        return hasBasicInfo;
    }

    // 🎯 Obter token específico para conta que não pode compartilhar token principal
    static async requestSpecificTokenForAccount(loginId, fallbackToken) {
        try {
            // 🔍 Primeiro, verificar se já temos token específico salvo
            const existingToken = this.getTokenByLoginId(loginId);
            if (existingToken) {
                return existingToken;
            }

            // 🎯 Com o novo sistema de múltiplos tokens do OAuth, as contas deveriam ter tokens específicos
            console.info(
                `ℹ️ [SPECIFIC TOKEN] Conta ${loginId} não tem token específico. Será obtido no próximo OAuth.`,
            );

            return null;
        } catch (error) {
            CommonHelpers.showError(
                `❌ [SPECIFIC TOKEN] Erro ao obter token para ${loginId}:`,
                error,
            );
            return null;
        }
    }

    // 🔍 Verificar se existe token armazenado para um loginId específico
    static hasTokenForLoginId(loginId) {
        const allKeys = Object.keys(localStorage);

        // Verificar se há token armazenado com qualquer formato para este loginId
        const hasToken = allKeys.some((key) => {
            return (
                key.startsWith(`token_${loginId}_`) ||
                key === `token_${loginId}`
            );
        });

        return hasToken;
    }

    // Verificar quantas contas têm tokens válidos
    static getAccountsWithTokens() {
        const accounts = this.getAccountList();
        return accounts.filter((account) => {
            const token = this.getTokenByLoginId(account.loginid);
            return token !== null;
        });
    }

    // Verificar quantas contas não têm tokens
    static getAccountsWithoutTokens() {
        const accounts = this.getAccountList();
        return accounts.filter((account) => {
            const token = this.getTokenByLoginId(account.loginid);
            return token === null;
        });
    }

    // 🔐 Limpeza segura da sessão atual
    static clearUserSession() {
        const currentUser = this.getCurrentUser();
        if (currentUser) {
            this.removeAllUserData(currentUser.loginid);
            localStorage.removeItem("current_user_loginid");
        }

        // 🧹 Limpar dados temporários
        const allKeys = Object.keys(localStorage);
        allKeys.forEach((key) => {
            if (key.startsWith("temp_") || key.startsWith("lock_")) {
                localStorage.removeItem(key);
            }
        });
    }

    // 🔐 Logout seguro com modal de opções
    static logout() {
        // ✅ PERMITIR cancelamento da instância única apenas no logout
        if (window.displayViewInstance?.marketData) {
            window.displayViewInstance.marketData.allowStopAll('Logout do usuário');
        }
        
        // Usar o novo sistema de modal de logout
        if (typeof ModalLogout !== 'undefined') {
            ModalLogout.show();
        } else {
            // Fallback para método antigo se ModalLogout não estiver carregado
            this.showLogoutModal();
        }
    }

    // 🎨 Mostrar modal de logout com processo de limpeza
    static showLogoutModal() {
        // Criar modal de logout
        const modal = document.createElement('div');
        modal.className = 'logout-modal';
        modal.innerHTML = `
            <div class="logout-modal-backdrop"></div>
            <div class="logout-modal-content">
                <div class="logout-icon">🚪</div>
                <h2>Saindo com Segurança...</h2>
                <div class="logout-progress">
                    <div class="logout-progress-bar">
                        <div class="logout-progress-fill"></div>
                    </div>
                    <div class="logout-status">Iniciando processo de logout...</div>
                </div>
                <div class="logout-steps">
                    <div class="logout-step" data-step="1">
                        <span class="step-icon">🔄</span>
                        <span class="step-text">Limpando dados da sessão</span>
                        <span class="step-status">⏳</span>
                    </div>
                    <div class="logout-step" data-step="2">
                        <span class="step-icon">🛡️</span>
                        <span class="step-text">Protegendo informações</span>
                        <span class="step-status">⏳</span>
                    </div>
                    <div class="logout-step" data-step="3">
                        <span class="step-icon">🧹</span>
                        <span class="step-text">Finalizando limpeza</span>
                        <span class="step-status">⏳</span>
                    </div>
                    <div class="logout-step" data-step="4">
                        <span class="step-icon">✅</span>
                        <span class="step-text">Logout concluído</span>
                        <span class="step-status">⏳</span>
                    </div>
                </div>
            </div>
        `;

        // Adicionar estilos do modal
        this.addLogoutModalStyles();

        // Adicionar ao DOM
        document.body.appendChild(modal);

        // Animar entrada
        setTimeout(() => {
            modal.classList.add('show');
            this.executeLogoutProcess();
        }, 100);
    }

    // 🔄 Executar processo de logout com animação
    static async executeLogoutProcess() {
        const steps = document.querySelectorAll('.logout-step');
        const progressFill = document.querySelector('.logout-progress-fill');
        const statusText = document.querySelector('.logout-status');

        // Etapa 1: Notificar sistemas
        await this.animateLogoutStep(1, 'Notificando sistemas online...', async () => {
            const currentUser = this.getCurrentUser();
            if (typeof window !== "undefined" && window.onlineUsersMonitor && currentUser?.loginid) {
                window.onlineUsersMonitor.handleUserLogout(currentUser.loginid);
            }
        });

        progressFill.style.width = '25%';

        // Etapa 2: Finalizar OAuth
        await this.animateLogoutStep(2, 'Protegendo dados de acesso...', async () => {
            this.finalizeOAuthProcess();
        });

        progressFill.style.width = '50%';

        // Etapa 3: Limpar dados
        await this.animateLogoutStep(3, 'Removendo dados temporários...', async () => {
            const allKeys = Object.keys(localStorage);
            allKeys.forEach((key) => {
                localStorage.removeItem(key);
            });
        });

        progressFill.style.width = '75%';

        // Etapa 4: Finalizar
        await this.animateLogoutStep(4, 'Logout realizado com sucesso!', async () => {
            // Pequena pausa para mostrar sucesso
            await new Promise(resolve => setTimeout(resolve, 500));
        });

        progressFill.style.width = '100%';
        statusText.textContent = 'Redirecionando...';

        // Mostrar mensagem de sucesso final
        setTimeout(() => {
            this.showLogoutSuccess();
        }, 1000);
    }

    // 🎯 Animar etapa do logout
    static async animateLogoutStep(stepNumber, statusMessage, action) {
        const step = document.querySelector(`[data-step="${stepNumber}"]`);
        const statusText = document.querySelector('.logout-status');
        
        statusText.textContent = statusMessage;
        
        if (step) {
            const statusIcon = step.querySelector('.step-status');
            statusIcon.textContent = '🔄';
            step.classList.add('active');
        }

        // Executar ação
        await action();

        // Marcar como concluído
        if (step) {
            const statusIcon = step.querySelector('.step-status');
            statusIcon.textContent = '✅';
            step.classList.add('completed');
        }

        // Pequena pausa entre etapas
        await new Promise(resolve => setTimeout(resolve, 800));
    }

    // 🎉 Mostrar mensagem de sucesso e redirecionar
    static showLogoutSuccess() {
        const modal = document.querySelector('.logout-modal');
        const content = modal.querySelector('.logout-modal-content');

        content.innerHTML = `
            <div class="logout-success">
                <div class="success-icon">🎉</div>
                <h2>Você saiu com segurança!</h2>
                <p>Seus dados e sessão foram encerrados com sucesso.</p>
                <div class="success-message">
                    Redirecionando para conhecer nossos recursos...
                </div>
                <div class="redirect-countdown">
                    <span id="countdown">3</span>
                </div>
            </div>
        `;

        // Countdown para redirecionamento
        let countdown = 3;
        const countdownElement = document.getElementById('countdown');
        
        const countdownInterval = setInterval(() => {
            countdown--;
            if (countdownElement) {
                countdownElement.textContent = countdown;
            }
            
            if (countdown <= 0) {
                clearInterval(countdownInterval);
                window.location.href = '/logout-page.html';
            }
        }, 1000);
    }

    // 🎨 Adicionar estilos do modal de logout
    static addLogoutModalStyles() {
        if (document.getElementById('logout-modal-styles')) return;

        const style = document.createElement('style');
        style.id = 'logout-modal-styles';
        style.textContent = `
            .logout-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                z-index: 2147483647;
                display: flex;
                align-items: center;
                justify-content: center;
                opacity: 0;
                visibility: hidden;
                transition: all 0.3s ease;
            }

            .logout-modal.show {
                opacity: 1;
                visibility: visible;
            }

            .logout-modal-backdrop {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.8);
                backdrop-filter: blur(5px);
            }

            .logout-modal-content {
                position: relative;
                background: white;
                border-radius: 20px;
                padding: 40px;
                max-width: 500px;
                width: 90%;
                text-align: center;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                animation: modalSlideIn 0.5s ease-out;
            }

            @keyframes modalSlideIn {
                from {
                    opacity: 0;
                    transform: scale(0.8) translateY(-50px);
                }
                to {
                    opacity: 1;
                    transform: scale(1) translateY(0);
                }
            }

            .logout-icon {
                font-size: 4em;
                margin-bottom: 20px;
                animation: bounce 2s infinite;
            }

            @keyframes bounce {
                0%, 20%, 50%, 80%, 100% {
                    transform: translateY(0);
                }
                40% {
                    transform: translateY(-10px);
                }
                60% {
                    transform: translateY(-5px);
                }
            }

            .logout-modal-content h2 {
                color: #333;
                margin-bottom: 30px;
                font-size: 1.5em;
            }

            .logout-progress {
                margin-bottom: 30px;
            }

            .logout-progress-bar {
                width: 100%;
                height: 8px;
                background: #e9ecef;
                border-radius: 4px;
                overflow: hidden;
                margin-bottom: 15px;
            }

            .logout-progress-fill {
                height: 100%;
                background: linear-gradient(90deg, #28a745, #20c997);
                width: 0%;
                transition: width 0.8s ease;
                border-radius: 4px;
            }

            .logout-status {
                color: #666;
                font-size: 0.9em;
                font-weight: 500;
            }

            .logout-steps {
                text-align: left;
                background: #f8f9fa;
                border-radius: 10px;
                padding: 20px;
                margin: 20px 0;
            }

            .logout-step {
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 8px 0;
                transition: all 0.3s ease;
            }

            .logout-step.active {
                color: #007bff;
                font-weight: 500;
            }

            .logout-step.completed {
                color: #28a745;
                font-weight: 500;
            }

            .step-icon {
                font-size: 1.2em;
                width: 25px;
                text-align: center;
            }

            .step-text {
                flex: 1;
                font-size: 0.9em;
            }

            .step-status {
                font-size: 1.1em;
            }

            .logout-success {
                animation: successPulse 0.6s ease-out;
            }

            @keyframes successPulse {
                from {
                    transform: scale(0.9);
                    opacity: 0;
                }
                to {
                    transform: scale(1);
                    opacity: 1;
                }
            }

            .success-icon {
                font-size: 5em;
                margin-bottom: 20px;
                animation: successBounce 1s ease-out;
            }

            @keyframes successBounce {
                0%, 20%, 50%, 80%, 100% {
                    transform: scale(1);
                }
                40% {
                    transform: scale(1.1);
                }
                60% {
                    transform: scale(1.05);
                }
            }

            .success-message {
                color: #666;
                margin: 20px 0;
                font-size: 1.1em;
            }

            .redirect-countdown {
                margin-top: 20px;
                padding: 15px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                border-radius: 10px;
                font-size: 1.2em;
                font-weight: bold;
            }

            #countdown {
                display: inline-block;
                font-size: 2em;
                color: #ffd93d;
                margin-left: 10px;
                animation: countdownPulse 1s infinite;
            }

            @keyframes countdownPulse {
                0%, 100% {
                    transform: scale(1);
                }
                50% {
                    transform: scale(1.2);
                }
            }

            @media (max-width: 768px) {
                .logout-modal-content {
                    padding: 30px 20px;
                    margin: 20px;
                }

                .logout-icon {
                    font-size: 3em;
                }

                .logout-modal-content h2 {
                    font-size: 1.3em;
                }
            }
        `;

        document.head.appendChild(style);
    }

    // 🔐 Finalizar processo OAuth - limpar flags temporárias
    static finalizeOAuthProcess() {
        // Limpar flags OAuth
        localStorage.removeItem("oauth_multitoken_source");
        localStorage.removeItem("temp_authorized_loginids");
        localStorage.removeItem("oauth_authorized_loginids");
    }

    // 🔍 Detectar se já existem tokens específicos por conta (OAuth multi-token)
    static hasPerAccountTokens() {
        const allKeys = Object.keys(localStorage);
        const distinctTokenKeys = allKeys.filter(
            (key) => key.startsWith("token_") && !key.includes("_"), // token_CR2691758, não token_CR2691758_session
        );

        const distinctTokens = new Set();
        distinctTokenKeys.forEach((key) => {
            const token = localStorage.getItem(key);
            if (token) distinctTokens.add(token);
        });

        const hasMultiple = distinctTokens.size > 1;

        return hasMultiple;
    }

    // 🔍 Verificar integridade dos dados do usuário atual (flexível durante login)
    static validateDataIntegrity() {
        const currentUser = this.getCurrentUser();
        if (!currentUser) {
            // Não logar durante processo de inicialização
            return false; // Permitir processo de login continuar
        }

        // ✅ CORREÇÃO: Verificar se há token válido (OAuth temporário ou durável)
        const currentToken = this.getLocalToken();
        if (currentToken) {
            // Token presente, dados válidos
            return true;
        }

        const sessionId = this.getSessionIdByLoginId(currentUser.loginid);
        if (!sessionId) {
            // 🔄 Durante o processo de login, é normal que o sessionId ainda não exista
            // Não bloquear operações, apenas avisar
            if (window.logConfig && window.logConfig.shouldLog("general")) {
            }

            // 🔧 Criar sessionId automaticamente se necessário
            const autoSessionId = this.getUserSessionId();
            if (autoSessionId) {
                return true;
            }

            return true; // Permitir continuar mesmo sem sessionId durante inicialização
        }

        return true;
    }

    // 🏷️ ISOLAMENTO POR ABA - Gerar ID único para a aba atual
    static getTabId() {
        if (!this.tabId) {
            // 🔍 Verificar se já existe um ID para esta aba no sessionStorage
            this.tabId = sessionStorage.getItem("current_tab_id");

            if (!this.tabId) {
                // 🆔 Gerar novo ID único para esta aba
                this.tabId = `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                sessionStorage.setItem("current_tab_id", this.tabId);
            }
        }
        return this.tabId;
    }

    // 💾 OPERAÇÕES SEGURAS DE SESSIONSTORAGE POR ABA
    static setSessionData(key, data) {
        try {
            const tabId = this.getTabId();
            const sessionKey = `${tabId}_${key}`;
            const dataWithMetadata = {
                data: data,
                _tabId: tabId,
                _timestamp: Date.now(),
                _sessionId: this.getUserSessionId(),
            };
            sessionStorage.setItem(
                sessionKey,
                JSON.stringify(dataWithMetadata),
            );

            return true;
        } catch (error) {
            CommonHelpers.showError("❌ Erro ao salvar dados de sessão:", error);
            return false;
        }
    }

    static getSessionData(key) {
        try {
            const tabId = this.getTabId();
            const sessionKey = `${tabId}_${key}`;
            const stored = sessionStorage.getItem(sessionKey);

            if (!stored) return null;

            const parsed = JSON.parse(stored);

            // 🔍 Validar que os dados pertencem à aba e sessão atuais
            if (
                parsed._tabId !== tabId ||
                parsed._sessionId !== this.getUserSessionId()
            ) {
              
                sessionStorage.removeItem(sessionKey);
                return null;
            }

            return parsed.data;
        } catch (error) {
            CommonHelpers.showError("❌ Erro ao carregar dados de sessão:", error);
            return null;
        }
    }

    static removeSessionData(key) {
        try {
            const tabId = this.getTabId();
            const sessionKey = `${tabId}_${key}`;
            sessionStorage.removeItem(sessionKey);

            return true;
        } catch (error) {
            CommonHelpers.showError("❌ Erro ao remover dados de sessão:", error);
            return false;
        }
    }

    // 🧹 Limpar dados de sessão órfãos (de outras abas/sessões)
    static cleanupOrphanedSessionData() {
        try {
            const currentTabId = this.getTabId();
            const currentSessionId = this.getUserSessionId();
            let cleanedCount = 0;

            // 📋 Listar todas as chaves do sessionStorage
            const keys = Object.keys(sessionStorage);

            for (const key of keys) {
                if (key.startsWith("tab_") && key.includes("_")) {
                    try {
                        const data = JSON.parse(sessionStorage.getItem(key));

                        // 🔍 Verificar se é dados órfãos
                        if (data._tabId && data._tabId !== currentTabId) {
                            // Dados de outra aba - remover se muito antigos (> 1 hora)
                            const age = Date.now() - (data._timestamp || 0);
                            if (age > 3600000) {
                                // 1 hora
                                sessionStorage.removeItem(key);
                                cleanedCount++;
                            }
                        } else if (
                            data._sessionId &&
                            data._sessionId !== currentSessionId
                        ) {
                            // Dados de sessão diferente - sempre remover
                            sessionStorage.removeItem(key);
                            cleanedCount++;
                        }
                    } catch (error) {
                        // Dados corrompidos - remover
                        sessionStorage.removeItem(key);
                        cleanedCount++;
                    }
                }
            }

            if (cleanedCount > 0) {
            }
        } catch (error) {
            CommonHelpers.showError("❌ Erro na limpeza de dados de sessão:", error);
        }
    }

    // 🔄 Sincronizar dados entre abas (para dados que devem ser compartilhados)
    static syncDataBetweenTabs(key, data) {
        try {
            // 💾 Salvar em localStorage para compartilhar entre abas
            const syncKey = `sync_${this.getUserSessionId()}_${key}`;
            const syncData = {
                data: data,
                _timestamp: Date.now(),
                _sessionId: this.getUserSessionId(),
                _syncedBy: this.getTabId(),
            };
            localStorage.setItem(syncKey, JSON.stringify(syncData));

            // 📡 Notificar outras abas via storage event
            window.dispatchEvent(
                new StorageEvent("storage", {
                    key: syncKey,
                    newValue: JSON.stringify(syncData),
                    url: window.location.href,
                }),
            );

            return true;
        } catch (error) {
            CommonHelpers.showError("❌ Erro ao sincronizar dados entre abas:", error);
            return false;
        }
    }

    // 🧹 Limpeza de dados antigos para liberar espaço
    static cleanupOldUserData() {
        try {
            const allKeys = Object.keys(localStorage);
            const now = Date.now();
            const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000; // 7 dias

            // Remover dados muito antigos
            allKeys.forEach((key) => {
                if (key.includes("_timestamp")) {
                    const timestamp = localStorage.getItem(key);
                    if (timestamp && parseInt(timestamp) < oneWeekAgo) {
                        // Remover o timestamp e a chave associada
                        localStorage.removeItem(key);
                        const baseKey = key.replace("_timestamp", "");
                        localStorage.removeItem(baseKey);
                    }
                }
            });
        } catch (error) {
            CommonHelpers.showError("❌ Erro na limpeza de dados antigos:", error);
        }
    }

    // 🚨 Limpeza de emergência quando quota é excedida
    static emergencyCleanup() {
        try {
          
            const allKeys = Object.keys(localStorage);
            let cleanedCount = 0;
            const currentUser = this.getCurrentUser();
            const currentSession = this.getUserSessionId();

            // ✅ LIMPEZA AGRESSIVA POR PRIORIDADE:

            // 1. 🗑️ REMOVER DADOS TEMPORÁRIOS E LOCKS
            const tempKeys = allKeys.filter(
                (key) =>
                    key.startsWith("temp_") ||
                    key.startsWith("lock_") ||
                    key.startsWith("tab_") ||
                    key.includes("_backup"),
            );
            tempKeys.forEach((key) => {
                localStorage.removeItem(key);
                cleanedCount++;
            });

            // 2. 🗑️ REMOVER DADOS DE ATIVIDADE E LOGS ANTIGOS
            const activityKeys = allKeys.filter(
                (key) =>
                    key.startsWith("activity_") ||
                    key.startsWith("log_") ||
                    key.includes("_audit") ||
                    key.includes("_trace"),
            );
            activityKeys.forEach((key) => {
                localStorage.removeItem(key);
                cleanedCount++;
            });

            // 3. 🗑️ REMOVER TOKENS ÓRFÃOS (que não pertencem ao usuário atual)
            const tokenKeys = allKeys.filter((key) =>
                key.startsWith("access_token_"),
            );
            tokenKeys.forEach((key) => {
                const sessionId = key.replace("access_token_", "");
                if (sessionId !== currentSession) {
                    localStorage.removeItem(key);
                    cleanedCount++;
                }
            });

            // 4. 🗑️ REMOVER DADOS DE USUÁRIOS ÓRFÃOS (exceto atual)
            if (currentUser) {
                const userDataKeys = allKeys.filter(
                    (key) =>
                        key.startsWith("user_data_") ||
                        key.startsWith("account_list_") ||
                        key.startsWith("historical_data_"),
                );
                userDataKeys.forEach((key) => {
                    const sessionId = key.split("_").pop();
                    if (sessionId !== currentSession) {
                        localStorage.removeItem(key);
                        cleanedCount++;
                    }
                });
            }

            // 5. 🗑️ REMOVER CONFIGURAÇÕES DE TRADE ANTIGAS
            const tradeKeys = allKeys.filter(
                (key) =>
                    key.startsWith("trade_config_") ||
                    key.startsWith("translated_strategy_") ||
                    key.startsWith("trade_messages_"),
            );
            // Manter apenas os 2 mais recentes
            if (tradeKeys.length > 2) {
                tradeKeys.slice(0, -2).forEach((key) => {
                    localStorage.removeItem(key);
                    cleanedCount++;
                });
            }

            // 6. 🗑️ LIMPAR MAPEAMENTOS DE SESSÃO ÓRFÃOS
            const mappingKeys = allKeys.filter((key) =>
                key.startsWith("session_map_"),
            );
            if (currentUser) {
                mappingKeys.forEach((key) => {
                    const loginId = key.replace("session_map_", "");
                    if (loginId !== currentUser.loginid) {
                        localStorage.removeItem(key);
                        cleanedCount++;
                    }
                });
            }

            // 7. 🗑️ FORÇAR LIMPEZA DE DADOS GRANDES
            const remainingKeys = Object.keys(localStorage);
            remainingKeys.forEach((key) => {
                try {
                    const value = localStorage.getItem(key);
                    if (value && value.length > 50000) {
                        // Dados > 50KB
                        localStorage.removeItem(key);
                        cleanedCount++;
                    }
                } catch (e) {
                    // Se não conseguir ler, remover
                    localStorage.removeItem(key);
                    cleanedCount++;
                }
            });

           

            // ✅ VERIFICAR ESPAÇO DISPONÍVEL
            try {
                const testKey = "quota_test_" + Date.now();
                const testData = "x".repeat(1000); // 1KB test
                localStorage.setItem(testKey, testData);
                localStorage.removeItem(testKey);
            } catch (quotaError) {
                CommonHelpers.showWarning(
                    "⚠️ [EMERGENCY] Ainda há problemas de quota após limpeza",
                );
                // Limpeza mais agressiva se ainda há problema
                this.aggressiveCleanup();
            }

            return cleanedCount;
        } catch (error) {
            CommonHelpers.showError("❌ Erro na limpeza de emergência:", error);
            return 0;
        }
    }

    // 🚨 Limpeza mais agressiva quando ainda há problemas de quota
    static aggressiveCleanup() {
        try {
            CommonHelpers.showWarning("🔥 [AGGRESSIVE] Iniciando limpeza agressiva...");
            const allKeys = Object.keys(localStorage);
            let cleanedCount = 0;
            const currentUser = this.getCurrentUser();
            const currentSession = this.getUserSessionId();

            // ⚠️ LIMPEZA EXTREMA - manter apenas essenciais
            allKeys.forEach((key) => {
                // ✅ PRESERVAR apenas dados críticos do usuário atual
                const isEssential =
                    key === "current_user_loginid" ||
                    key === `access_token_${currentSession}` ||
                    key === `user_data_${currentSession}` ||
                    (currentUser &&
                        key === `session_map_${currentUser.loginid}`);

                if (!isEssential) {
                    localStorage.removeItem(key);
                    cleanedCount++;
                }
            });

            CommonHelpers.showWarning(
                `🔥 [AGGRESSIVE] Limpeza agressiva: ${cleanedCount} itens removidos`,
            );
            return cleanedCount;
        } catch (error) {
            CommonHelpers.showError("❌ Erro na limpeza agressiva:", error);
            return 0;
        }
    }

    // 📡 Listener para sincronização entre abas
    static initTabSynchronization() {
        if (this.tabSyncInitialized) return;

        window.addEventListener("storage", (event) => {
            if (
                event.key &&
                event.key.startsWith(`sync_${this.getUserSessionId()}_`)
            ) {
                try {
                    const data = JSON.parse(event.newValue);
                    const syncKey = event.key.replace(
                        `sync_${this.getUserSessionId()}_`,
                        "",
                    );

                    // 🔍 Verificar se não foi esta aba que enviou a sincronização
                    if (data._syncedBy !== this.getTabId()) {
                        // 🎯 Trigger eventos customizados para componentes interessados
                        window.dispatchEvent(
                            new CustomEvent("tabDataSync", {
                                detail: {
                                    key: syncKey,
                                    data: data.data,
                                    timestamp: data._timestamp,
                                },
                            }),
                        );
                    }
                } catch (error) {
                    CommonHelpers.showError(
                        "❌ Erro ao processar sincronização entre abas:",
                        error,
                    );
                }
            }
        });

        this.tabSyncInitialized = true;
    }
}
