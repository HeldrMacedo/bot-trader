// js/credits-manager.js
// Sistema de gerenciamento de créditos para usuários VIP
// O SISTEMA DEVE SER 100% ISOLADO POR USUARIO

class CreditsManager {
    // 🔄 Fila de operações pendentes durante reconexão
    static pendingOperations = [];
    static isProcessingQueue = false;
    static processingBonus = new Set();

    static CREDIT_COSTS = {
        GEMINI_TRANSLATION: 1,
        AI_BUTTON: 1
    };

    static PLANS = {
        BASIC: {
            name: 'BASIC',
            price: 29.90,
            credits: 10,
            description: 'Plano básico com rodapé VIP'
        },
        TRADE: {
            name: 'TRADE',
            price: 59.90,
            credits: 30,
            description: 'Plano intermediário com mais créditos'
        },
        PRO: {
            name: 'PRO',
            price: 99.90,
            credits: 60,
            description: 'Plano profissional com máximos créditos'
        }
    };

    // 🎁 Créditos bônus de boas-vindas (DESATIVADO: Agora iniciamos com 0)
    static WELCOME_BONUS_CREDITS = 0;

    // 🔍 Obter créditos atuais do usuário (SEMPRE do servidor)
    static async getCurrentCredits(loginId = null) {
        try {
            const currentUser = SessionManager.getCurrentUser();
            const userId = loginId || currentUser?.authorize?.loginid;

            if (!userId) return 0;
            //return 5000;

            // 👑 ADMIN: Créditos ilimitados
            const isAdmin = UserLevelsManager.ADMIN_LOGIN_IDS.includes(userId);
            if (isAdmin) {
                return 999999; // Número alto para representar "ilimitado"
            }

            // ✅ SEMPRE buscar do servidor (Replit Database)
            const serverCredits = await this.getCreditsFromServer(userId);

            // 💾 Cache temporário no localStorage (apenas para performance)
            const cacheKey = `credits_cache_${userId}`;
            localStorage.setItem(cacheKey, JSON.stringify({
                credits: serverCredits,
                timestamp: Date.now()
            }));

            return serverCredits;
        } catch (error) {
            console.error('❌ [CREDITS] Erro ao obter créditos:', error);

            // Fallback para cache se servidor falhar
            return this.getCachedCredits(loginId);
        }
    }

    // 🔍 Versão síncrona para exibição imediata (usa cache)
    static getCurrentCreditsSync(loginId = null) {
        try {
            const currentUser = SessionManager.getCurrentUser();
            const userId = loginId || currentUser?.authorize?.loginid;

            if (!userId) return 0;

            // 👑 ADMIN: Créditos ilimitados
            const isAdmin = UserLevelsManager.ADMIN_LOGIN_IDS.includes(userId);
            if (isAdmin) {
                return 999999; // Número alto para representar "ilimitado"
            }

            // Tentar cache primeiro
            const cachedCredits = this.getCachedCredits(loginId);
            if (cachedCredits > 0) {
                return cachedCredits;
            }

            // Se não tem cache, buscar assincronamente em background
            this.getCurrentCredits(loginId).then(credits => {
                // Atualizar UI quando os créditos chegarem
                CreditsManager.updateCreditsDisplay(credits);
            });

            return 0; // Retorna 0 temporariamente até carregar
        } catch (error) {
            console.error('❌ [CREDITS] Erro ao obter créditos síncronos:', error);
            return 0;
        }
    }

    // 🔄 Atualizar exibição de créditos na UI
    static updateCreditsDisplay(credits) {
        // Atualizar todos os elementos que mostram créditos
        const creditElements = document.querySelectorAll('[data-credits-display]');
        creditElements.forEach(el => {
            if (el) {
                el.textContent = credits;
            }
        });

        // Disparar evento para outros componentes
        window.dispatchEvent(new CustomEvent('creditsDisplayUpdated', {
            detail: { credits }
        }));
    }

    // 🔍 Obter créditos do servidor (Replit Database)
    static async getCreditsFromServer(loginId) {
        try {
            const response = await fetch(`/api/credits/${loginId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                return data.credits || 0;
            }
            return 0;
        } catch (error) {
            console.error('❌ [CREDITS] Erro ao buscar créditos do servidor:', error);
            return 0;
        }
    }

    // 💾 Obter créditos do cache (fallback)
    static getCachedCredits(loginId = null) {
        try {
            const currentUser = SessionManager.getCurrentUser();
            const userId = loginId || currentUser?.authorize?.loginid;

            if (!userId) return 0;

            const cacheKey = `credits_cache_${userId}`;
            const cached = localStorage.getItem(cacheKey);

            if (cached) {
                const data = JSON.parse(cached);
                // Cache válido por 5 minutos
                if (Date.now() - data.timestamp < 5 * 60 * 1000) {
                    return data.credits || 0;
                }
            }

            return 0;
        } catch (error) {
            console.error('❌ [CREDITS] Erro ao obter cache:', error);
            return 0;
        }
    }

    // ❌ REMOVIDO: hasReceivedWelcomeBonus - Sistema de bônus desativado

    // ❌ REMOVIDO: syncCreditsToLocalStorage - dados gerenciados apenas pelo servidor

    // 📊 Obter dados VIP locais (função auxiliar)
    static getLocalVipData(loginId) {
        try {
            const vipKey = `vip_status_${loginId}`;
            const vipData = localStorage.getItem(vipKey);
            return vipData ? JSON.parse(vipData) : null;
        } catch (error) {
            console.error('❌ [CREDITS] Erro ao obter dados VIP locais:', error);
            return null;
        }
    }

    // ❌ REMOVIDO: markWelcomeBonusReceived - Sistema de bônus desativado

    // ❌ REMOVIDO: grantWelcomeBonus e checkAndGrantWelcomeBonus - Sistema de bônus desativado

    // 💰 Verificar se usuário tem créditos suficientes
    static async hasEnoughCredits(requiredCredits, loginId = null) {
        const currentUser = SessionManager.getCurrentUser();
        const userId = loginId || currentUser?.authorize?.loginid;

        // 👑ADMIN: Sempre tem créditos suficientes
        const isAdmin = UserLevelsManager.ADMIN_LOGIN_IDS.includes(userId);
        if (isAdmin) {
            return true;
        }

        const currentCredits = await this.getCurrentCredits(loginId);
        return currentCredits >= requiredCredits;
    }

    // 💎 Verificar E debitar créditos atomicamente (para prevenir race conditions)
    static async tryDebitCredits(amount, reason = '', loginId = null, options = {}) {
        const currentUser = SessionManager.getCurrentUser();
        const userId = loginId || currentUser?.authorize?.loginid;

        if (!userId) {
            console.error('❌ [CREDITS] Usuário não identificado para débito');
            return { success: false, error: 'user_not_identified' };
        }

        // 👑 ADMIN: Sempre tem créditos (sem debitar)
        const isAdmin = UserLevelsManager.ADMIN_LOGIN_IDS.includes(userId);
        if (isAdmin) {

            return { success: true, admin: true, newBalance: Infinity };
        }

        // ✅ Verificar créditos ANTES de tentar debitar
        const currentCredits = await this.getCurrentCredits(loginId);
        if (currentCredits < amount) {
            console.warn(`⚠️ [CREDITS] Créditos insuficientes: ${currentCredits} < ${amount}`);
            return {
                success: false,
                error: 'insufficient_credits',
                currentCredits,
                requiredCredits: amount
            };
        }


        const result = await this.debitCredits(amount, reason, loginId, options);

        if (result.success) {

        } else {
            console.error(`❌ [CREDITS] Falha no débito atômico:`, result.error);
        }

        return result;
    }

    // 🌐 Verificar se servidor está online
    static async isServerOnline() {
        // ✅ Garantir que a instância existe, criando se necessário
        let instance = null;

        if (typeof getFrontendReconnectionInstance === 'function') {
            instance = getFrontendReconnectionInstance();

            // Se não existe, tentar criar
            if (!instance && typeof initFrontendReconnection === 'function') {
                instance = initFrontendReconnection();
            }
        }

        if (instance) {
            const status = instance.serverStatus;

            // Se status é 'offline', servidor definitivamente offline
            if (status === 'offline') {
                return false;
            }

            // Se status é 'online', servidor definitivamente online
            if (status === 'online') {
                return true;
            }

            // Se status é 'unknown' ou outro valor, fazer verificação imediata
            try {
                const isOnline = await instance.checkServerStatus(true);
                return isOnline;
            } catch (error) {
                return true; // Assumir online em caso de erro
            }
        }

        // Se instância não existe e não pode ser criada, fazer verificação direta
        try {
            const response = await fetch('/api', {
                method: 'GET',
                cache: 'no-cache'
            });
            return response.ok;
        } catch (error) {
            return true; // Assumir online em caso de erro
        }
    }

    // 💸 Debitar créditos do usuário (APENAS no servidor) - COM PROTEÇÃO DE RECONEXÃO
    static async debitCredits(amount, reason = '', loginId = null, options = {}) {
        const {
            maxRetries = 3,
            retryDelay = 2000,
            showUserFeedback = true
        } = options;

        try {
            const currentUser = SessionManager.getCurrentUser();
            const userId = loginId || currentUser?.authorize?.loginid;

            if (!userId) {
                console.error('❌ [CREDITS] Usuário não identificado para débito');
                return { success: false, error: 'user_not_identified' };
            }

            // 👑 ADMIN: Nunca gasta créditos
            const isAdmin = UserLevelsManager.ADMIN_LOGIN_IDS.includes(userId);
            if (isAdmin) {
                return { success: true, admin: true };
            }

            // 🔍 VERIFICAÇÃO PREVENTIVA DESABILITADA: Causando falsos positivos
            // A verificação com retry já cobre casos de servidor offline
            // const serverOnline = await this.isServerOnline();
            // if (!serverOnline) {
            //     console.warn('⚠️ [CREDITS] Servidor offline detectado - adicionando à fila');
            //     
            //     if (showUserFeedback) {
            //         this.showReconnectionMessage();
            //     }
            //
            //     // Adicionar à fila de operações pendentes
            //     return await this.queuePendingOperation({
            //         type: 'debit',
            //         userId,
            //         amount,
            //         reason,
            //         maxRetries,
            //         retryDelay
            //     });
            // }

            // ✅ TENTATIVA DE DÉBITO COM RETRY AUTOMÁTICO
            for (let attempt = 1; attempt <= maxRetries; attempt++) {
                try {

                    const response = await fetch('/api/debit-credits', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            loginId: userId,
                            amount: amount,
                            reason: reason,
                            timestamp: Date.now()
                        })
                    });

                    if (response.ok) {
                        const data = await response.json();

                        if (data.success) {
                            // ✅ Atualizar cache local
                            const cacheKey = `credits_cache_${userId}`;
                            localStorage.setItem(cacheKey, JSON.stringify({
                                credits: data.newBalance,
                                timestamp: Date.now()
                            }));

                            // ✅ CRÍTICO: Se créditos chegaram a 0, converter para FREE
                            if (data.newBalance <= 0) {
                                console.warn('⚠️ [CREDITS] Créditos esgotados - convertendo usuário para FREE');
                                this.convertToFreeUser(userId);
                            }

                            // Limpar cache de nível para forçar nova detecção
                            if (typeof UserLevelsManager !== 'undefined') {
                                UserLevelsManager.levelCache?.delete(`user_level_${userId}`);
                                UserLevelsManager.levelCacheTime?.delete(`user_level_${userId}`);
                            }

                            // Disparar evento de atualização de créditos
                            window.dispatchEvent(new CustomEvent('creditsUpdated', {
                                detail: {
                                    userId: userId,
                                    credits: data.newBalance,
                                    debitAmount: amount,
                                    reason: reason
                                }
                            }));

                            return { success: true, newBalance: data.newBalance };
                        } else {
                            console.warn(`⚠️ [CREDITS] ${data.error}`);
                            return { success: false, error: data.error };
                        }
                    }

                    // Se resposta não OK, tentar novamente
                    throw new Error(`HTTP ${response.status}`);

                } catch (fetchError) {
                    console.warn(`⚠️ [CREDITS] Tentativa ${attempt} falhou:`, fetchError.message);

                    // Se ainda tem tentativas, aguardar e tentar novamente
                    if (attempt < maxRetries) {

                        await new Promise(resolve => setTimeout(resolve, retryDelay));

                        // Verificar se servidor voltou online
                        const serverOnlineRetry = await this.isServerOnline();
                        if (!serverOnlineRetry) {
                            console.warn('⚠️ [CREDITS] Servidor ainda offline - movendo para fila');
                            return await this.queuePendingOperation({
                                type: 'debit',
                                userId,
                                amount,
                                reason,
                                maxRetries: maxRetries - attempt,
                                retryDelay
                            });
                        }
                    } else {
                        // Última tentativa falhou
                        if (showUserFeedback) {
                            this.showDebitErrorMessage(fetchError);
                        }
                        return { success: false, error: 'max_retries_exceeded', details: fetchError.message };
                    }
                }
            }

            return { success: false, error: 'unknown' };
        } catch (error) {
            console.error('❌ [CREDITS] Erro crítico ao debitar créditos:', error);
            return { success: false, error: 'critical_error', details: error.message };
        }
    }

    // 🔄 Adicionar operação à fila de pendentes
    static async queuePendingOperation(operation) {
        return new Promise((resolve) => {
            const operationId = Date.now() + Math.random();

            this.pendingOperations.push({
                id: operationId,
                ...operation,
                resolve,
                timestamp: Date.now()
            });


            // Iniciar processamento quando servidor voltar
            this.startQueueProcessor();
        });
    }

    // 🔄 Processar fila de operações pendentes
    static async startQueueProcessor() {
        if (this.isProcessingQueue) return;

        this.isProcessingQueue = true;

        const processQueue = async () => {
            let serverOnlineQueue = await this.isServerOnline();
            while (this.pendingOperations.length > 0 && serverOnlineQueue) {
                const operation = this.pendingOperations.shift();
                serverOnlineQueue = await this.isServerOnline(); // Atualizar a cada iteração

                if (operation.type === 'debit') {
                    const result = await this.debitCredits(
                        operation.amount,
                        operation.reason,
                        operation.userId,
                        {
                            maxRetries: operation.maxRetries || 2,
                            retryDelay: operation.retryDelay || 2000,
                            showUserFeedback: false
                        }
                    );

                    operation.resolve(result);
                }
            }

            this.isProcessingQueue = false;

            // Se ainda tem operações mas servidor offline, tentar novamente em 5s
            if (this.pendingOperations.length > 0) {

                setTimeout(() => this.startQueueProcessor(), 5000);
            }
        };

        // Aguardar servidor ficar online
        const serverOnlineInitial = await this.isServerOnline();
        if (!serverOnlineInitial) {

            const checkInterval = setInterval(async () => {
                const serverOnlineCheck = await this.isServerOnline();
                if (serverOnlineCheck) {
                    clearInterval(checkInterval);

                    processQueue();
                }
            }, 2000);
        } else {
            processQueue();
        }
    }

    // 💬 Mostrar mensagem de reconexão
    static showReconnectionMessage() {
        const message = document.createElement('div');
        message.className = 'credits-reconnection-toast';
        message.innerHTML = `
            <div class="toast-content">
                <span class="toast-icon">🔄</span>
                <span class="toast-text">Servidor reconectando... Sua operação será processada automaticamente</span>
            </div>
        `;

        // Adicionar estilos se não existir
        if (!document.getElementById('credits-toast-styles')) {
            const style = document.createElement('style');
            style.id = 'credits-toast-styles';
            style.textContent = `
                .credits-reconnection-toast {
                    position: fixed;
                    top: 80px;
                    right: 20px;
                    z-index: 10000;
                    background: linear-gradient(135deg, #f39c12, #e67e22);
                    color: white;
                    padding: 16px 24px;
                    border-radius: 8px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                    animation: slideInRight 0.3s ease;
                }
                .toast-content {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }
                .toast-icon {
                    font-size: 24px;
                    animation: spin 2s linear infinite;
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                @keyframes slideInRight {
                    from {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
            `;
            document.head.appendChild(style);
        }

        document.body.appendChild(message);

        // Remover após 5s
        setTimeout(() => message.remove(), 5000);
    }

    // ❌ Mostrar mensagem de erro de débito
    static showDebitErrorMessage(error) {
        const isNetworkError = error.message.includes('fetch') || error.message.includes('network');

        const message = document.createElement('div');
        message.className = 'credits-error-toast';
        message.innerHTML = `
            <div class="toast-content">
                <span class="toast-icon">❌</span>
                <span class="toast-text">
                    ${isNetworkError
                ? 'Servidor temporariamente indisponível. Tente novamente em instantes.'
                : 'Falha ao processar operação. Por favor, tente novamente.'}
                </span>
            </div>
        `;

        if (!document.getElementById('credits-error-toast-styles')) {
            const style = document.createElement('style');
            style.id = 'credits-error-toast-styles';
            style.textContent = `
                .credits-error-toast {
                    position: fixed;
                    top: 80px;
                    right: 20px;
                    z-index: 10000;
                    background: linear-gradient(135deg, #e74c3c, #c0392b);
                    color: white;
                    padding: 16px 24px;
                    border-radius: 8px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                    animation: slideInRight 0.3s ease;
                }
            `;
            document.head.appendChild(style);
        }

        document.body.appendChild(message);
        setTimeout(() => message.remove(), 7000);
    }

    // 🔄 Sincronizar créditos atualizados com o servidor
    static async syncCreditsToServer(loginId, newCredits, vipData) {
        try {
            const response = await fetch('/api/update-credits', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    loginId: loginId,
                    credits: newCredits,
                    plan: vipData.plan,
                    expiresAt: vipData.expiresAt,
                    lastUpdate: Date.now(),
                    creditHistory: vipData.creditHistory?.slice(-10) || [] // Só últimas 10 transações
                })
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {

                    return true;
                }
            }

            throw new Error('Falha na sincronização com servidor');
        } catch (error) {
            console.error('❌ [CREDITS SYNC] Erro ao sincronizar créditos:', error);
            return false;
        }
    }

    // 💳 Adicionar créditos ao usuário (após pagamento)
    static addCredits(amount, plan, loginId = null) {
        try {
            const currentUser = SessionManager.getCurrentUser();
            const userId = loginId || currentUser?.authorize?.loginid;

            if (!userId) {
                console.error('❌ [CREDITS] Usuário não identificado para adição de créditos');
                return false;
            }

            const sessionId = SessionManager.getUserSessionId();
            const vipKey = `vip_status_${userId}`;

            // Obter dados VIP existentes ou criar novos
            let vipData = JSON.parse(localStorage.getItem(vipKey)) || {};

            const currentCredits = vipData.credits || 0;
            const newCreditsTotal = currentCredits + amount;

            // Atualizar dados VIP
            vipData = {
                ...vipData,
                isVip: true,
                credits: newCreditsTotal,
                plan: plan,
                purchaseDate: new Date().toISOString(),
                lastCreditUpdate: Date.now(),
                creditHistory: vipData.creditHistory || []
            };

            vipData.creditHistory.push({
                type: 'credit',
                amount: amount,
                plan: plan,
                timestamp: Date.now(),
                remainingCredits: newCreditsTotal
            });

            // Salvar dados atualizados
            localStorage.setItem(vipKey, JSON.stringify(vipData));


            // Disparar evento de atualização de créditos
            window.dispatchEvent(new CustomEvent('creditsUpdated', {
                detail: {
                    userId: userId,
                    credits: newCreditsTotal,
                    creditAmount: amount,
                    plan: plan
                }
            }));

            return true;
        } catch (error) {
            console.error('❌ [CREDITS] Erro ao adicionar créditos:', error);
            return false;
        }
    }

    // 🔄 Converter usuário para FREE quando créditos acabam
    static convertToFreeUser(loginId) {
        try {
            const vipKey = `vip_status_${loginId}`;
            const vipData = JSON.parse(localStorage.getItem(vipKey));

            if (vipData) {
                vipData.isVip = false;
                vipData.credits = 0;
                vipData.downgradedAt = new Date().toISOString();
                vipData.downgradeReason = 'credits_exhausted';

                localStorage.setItem(vipKey, JSON.stringify(vipData));
            }

            // Limpar cache de nível
            UserLevelsManager.levelCache?.delete(`user_level_${loginId}`);
            UserLevelsManager.levelCacheTime?.delete(`user_level_${loginId}`);

            // Forçar atualização da interface
            UserLevelsManager.updateInterfaceForUserLevel();

            // Mostrar notificação de créditos esgotados
            this.showCreditsExhaustedNotification();

            // Disparar evento de mudança de nível
            window.dispatchEvent(new CustomEvent('userLevelChanged', {
                detail: {
                    userId: loginId,
                    newLevel: 'FREE',
                    reason: 'credits_exhausted'
                }
            }));


            return true;
        } catch (error) {
            console.error('❌ [CREDITS] Erro ao converter usuário para FREE:', error);
            return false;
        }
    }

    // 🚫 Mostrar notificação de créditos esgotados
    static showCreditsExhaustedNotification() {
        // Usar o sistema centralizado de modais
        if (typeof ModalCreditos !== 'undefined') {
            ModalCreditos.showCreditosEsgotados();
        } else {
            // Fallback simples se modal centralizado não estiver disponível
            alert('💳 Seus créditos acabaram! Você foi convertido para usuário FREE. Adquira mais créditos para continuar usando os recursos VIP.');
        }
    }

    // 💳 Verificar se usuário tem créditos suficientes e mostrar modal apropriado
    static async checkCreditsAndShowModal(requiredCredits, funcionalidade, callback) {
        const currentCredits = await this.getCurrentCredits();

        // 👑ADMIN: Sempre tem créditos suficientes
        const currentUser = SessionManager.getCurrentUser();
        const userId = currentUser?.authorize?.loginid;
        const isAdmin = UserLevelsManager.ADMIN_LOGIN_IDS.includes(userId);

        if (isAdmin) {
            if (typeof callback === 'function') callback();
            return true;
        }

        if (currentCredits >= requiredCredits) {
            // Mostrar modal de confirmação
            if (typeof ModalCreditos !== 'undefined') {
                ModalCreditos.showConfirmacaoGasto(funcionalidade, requiredCredits, callback);
            } else {
                // Fallback: perguntar diretamente
                if (confirm(`Esta ação consumirá ${requiredCredits} créditos. Continuar?`)) {
                    if (typeof callback === 'function') callback();
                }
            }
            return true;
        } else {
            // Mostrar modal de créditos insuficientes
            if (typeof ModalCreditos !== 'undefined') {
                ModalCreditos.showCreditosInsuficientes(requiredCredits, currentCredits, funcionalidade);
            } else {
                // Fallback: alert simples
                alert(`Créditos insuficientes! Necessário: ${requiredCredits} crédito(s), Atual: ${currentCredits}`);
            }
            return false;
        }
    }

    // ❌ REMOVIDO: showWelcomeBonusModal - Sistema de bônus desativado

    // 📊 Obter histórico de créditos
    static getCreditHistory(loginId = null) {
        try {
            const currentUser = SessionManager.getCurrentUser();
            const userId = loginId || currentUser?.authorize?.loginid;

            if (!userId) return [];

            const vipData = UserLevelsManager.getVipData(userId);
            return vipData?.creditHistory || [];
        } catch (error) {
            console.error('❌ [CREDITS] Erro ao obter histórico:', error);
            return [];
        }
    }

    // 📈 Obter estatísticas de créditos
    static getCreditStats(loginId = null) {
        try {
            const history = this.getCreditHistory(loginId);
            const currentCredits = this.getCurrentCredits(loginId);

            const totalEarned = history
                .filter(entry => entry.type === 'credit')
                .reduce((sum, entry) => sum + entry.amount, 0);

            const totalSpent = history
                .filter(entry => entry.type === 'debit')
                .reduce((sum, entry) => sum + entry.amount, 0);

            return {
                currentCredits,
                totalEarned,
                totalSpent,
                transactionCount: history.length
            };
        } catch (error) {
            console.error('❌ [CREDITS] Erro ao calcular estatísticas:', error);
            return {
                currentCredits: 0,
                totalEarned: 0,
                totalSpent: 0,
                transactionCount: 0
            };
        }
    }
}

// Instância global
window.CreditsManager = CreditsManager;

// 🔄 LISTENER: Processar fila automaticamente quando servidor voltar online
window.addEventListener('serverOnline', (event) => {

    if (CreditsManager.pendingOperations.length > 0) {

        CreditsManager.startQueueProcessor();

        // Mostrar notificação para o usuário
        const notification = document.createElement('div');
        notification.className = 'credits-queue-processing-toast';
        notification.innerHTML = `
            <div class="toast-content">
                <span class="toast-icon">⚙️</span>
                <span class="toast-text">Processando ${CreditsManager.pendingOperations.length} operação(ões) pendente(s)...</span>
            </div>
        `;

        if (!document.getElementById('credits-queue-toast-styles')) {
            const style = document.createElement('style');
            style.id = 'credits-queue-toast-styles';
            style.textContent = `
                .credits-queue-processing-toast {
                    position: fixed;
                    top: 80px;
                    right: 20px;
                    z-index: 10000;
                    background: linear-gradient(135deg, #3498db, #2980b9);
                    color: white;
                    padding: 16px 24px;
                    border-radius: 8px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                    animation: slideInRight 0.3s ease;
                }
            `;
            document.head.appendChild(style);
        }

        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 5000);
    }
});

// 🎁 BÔNUS PROCESSADO DURANTE LOADING: Listeners removidos para evitar mudanças de rodapé
// O AppManager agora processa todos os bônus durante a tela de loading

// 🔄 SYNC: Sincronização entre abas (Cross-Tab)
window.addEventListener('storage', (event) => {
    // Verificar se é uma chave de cache de créditos
    if (event.key && event.key.startsWith('credits_cache_')) {
        try {
            const currentUser = SessionManager.getCurrentUser();
            const userId = currentUser?.authorize?.loginid;

            // Só atualizar se for o cache do usuário atual
            if (userId && event.key === `credits_cache_${userId}`) {
                if (event.newValue) {
                    const data = JSON.parse(event.newValue);
                    if (data && typeof data.credits === 'number') {
                     
                        // Atualizar display sem fazer fetch (usar dados do evento)
                        CreditsManager.updateCreditsDisplay(data.credits);
                    }
                }
            }
        } catch (error) {
            console.warn('⚠️ [CREDITS SYNC] Erro ao processar evento de storage:', error);
        }
    }
});