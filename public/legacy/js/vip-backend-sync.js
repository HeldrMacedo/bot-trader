// js/vip-backend-sync.js
// Sistema de sincronização VIP com backend persistente
// O SISTEMA DEVE SER 100% ISOLADO POR USUARIO

class VipBackendSync {
    static isInitialized = false;
    static syncInterval = null;
    static lastSyncData = null; // Para armazenar os últimos dados sincronizados
    static backendAvailable = true; // Flag para verificar a disponibilidade do backend

    // 🚀 Inicializar sistema de sincronização
    static async initialize() {
        if (this.isInitialized) return;

        // Sincronizar imediatamente ao inicializar
        await this.syncWithBackend();

        // Configurar sincronização automática a cada 30 minutos (reduzido para evitar rate limiting)
        this.syncInterval = setInterval(() => {
            this.syncWithBackend();
        }, 30 * 60 * 1000);

        this.isInitialized = true;
    }

    // 🔄 Sincronizar status VIP com backend para todas as contas
    static async syncWithBackend() {
        if (!this.backendAvailable) {
          
            return;
        }

        try {
            const userInfo = UserLevelsManager.getUserInfo();
            if (!userInfo || !userInfo.loginId) {
                return;
            }

            const loginId = userInfo.loginId;

            // Sincronizar conta atual
            await this.syncSingleAccount(loginId);

            // Buscar e sincronizar todas as contas relacionadas do localStorage
            const allUserAccounts = this.getAllUserAccountsFromLocalStorage();

            for (const accountId of allUserAccounts) {
                if (accountId !== loginId) { // Evitar sincronizar a conta atual duas vezes
                    // Adicionar delay de 2 segundos entre cada conta para evitar rate limiting
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    await this.syncSingleAccount(accountId);
                }
            }

        } catch (error) {
            console.error('❌ [VIP BACKEND] Erro ao sincronizar todas as contas:', error);
        }
    }

    // 🔄 Sincronizar uma conta específica
    static async syncSingleAccount(loginId) {
        try {
            // Buscar dados VIP locais para enviar na sincronização
            const localVipData = UserLevelsManager?.getVipData(loginId);
            
            // Fazer requisição para o backend
            const response = await fetch(`/api/vip/sync`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    loginId,
                    localVipData: localVipData 
                })
            });

            // Verificar se a resposta é válida antes de tentar parsear JSON
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP error ${response.status}: ${errorText}`);
            }

            const data = await response.json();
          
            if (data.success) {
                this.lastSyncData = data; // Armazenar dados da sincronização bem-sucedida
                if (data.shouldSync && data.vipData) {
                    // Sincronizar dados do servidor para localStorage
                    const vipKey = `vip_status_${loginId}`;
                    const previousLocalData = localStorage.getItem(vipKey);

                    localStorage.setItem(vipKey, JSON.stringify(data.vipData));
                                      
                    // ✅ FORÇAR LIMPEZA DO CACHE DE NÍVEL DE USUÁRIO
                    if (typeof UserLevelsManager !== 'undefined') {
                        UserLevelsManager.levelCache?.delete(`user_level_${loginId}`);
                        UserLevelsManager.levelCacheTime?.delete(`user_level_${loginId}`);
                      
                    }

                    // Verificar se UserLevelsManager existe e forçar atualização
                    if (typeof UserLevelsManager !== 'undefined') {
                      
                        // Atualizar interface para TODAS as contas (não apenas a atual)
                        UserLevelsManager.updateInterfaceForUserLevel();

                        // Verificar nível após atualização
                        const currentUser = UserLevelsManager.getUserInfo();
                        if (currentUser && currentUser.loginId === loginId) {
                            const newLevel = UserLevelsManager.getCurrentUserLevel();
                           
                            // Forçar recriação do rodapé se necessário
                            if (newLevel === 'VIP' && typeof FooterManager !== 'undefined') {
                             
                                setTimeout(() => {
                                    FooterManager.initializeFooter();
                                }, 1000);
                            }
                        }

                        // REMOVIDO: Notificação de sincronização VIP removida para evitar spam
                        // A notificação só será mostrada em ativações manuais específicas
                    }

                   
                } else {
                 
                    // ✅ AGUARDAR UM POUCO ANTES DE REMOVER - pode ser delay de sincronização
                    setTimeout(() => {
                        // Remover VIP local se expirado no servidor
                        const vipKey = `vip_status_${loginId}`;
                        const localVipData = localStorage.getItem(vipKey);

                        if (localVipData) {
                            try {
                                const parsedLocal = JSON.parse(localVipData);
                                const expiresAt = new Date(parsedLocal.expiresAt);
                                const now = new Date();
                                
                                // Só remover se realmente expirado
                                if (expiresAt <= now) {
                                    localStorage.removeItem(vipKey);
                                                                      
                                    // Limpar cache
                                    if (typeof UserLevelsManager !== 'undefined') {
                                        UserLevelsManager.levelCache?.delete(`user_level_${loginId}`);
                                        UserLevelsManager.levelCacheTime?.delete(`user_level_${loginId}`);
                                        
                                        const currentUser = UserLevelsManager.getUserInfo();
                                        if (currentUser && currentUser.loginId === loginId) {
                                            UserLevelsManager.updateInterfaceForUserLevel();
                                        }
                                    }
                                } 
                            } catch (error) {
                                console.error(`❌ [VIP BACKEND] Erro ao verificar VIP local:`, error);
                            }
                        }
                    }, 2000); // Aguardar 2 segundos
                }
            } 
        } catch (error) {
            // ✅ NOVO: Tratamento especial para erro 429 (Rate Limit)
            if (error.message.includes('HTTP error 429') || error.message.includes('Rate limit')) {
                console.warn(`⚠️ [VIP BACKEND] Rate limit atingido para ${loginId}, aguardando...`);
                
                // Extrair tempo de retry se disponível
                let retryAfter = 60; // Default 60 segundos
                try {
                    const match = error.message.match(/"retryAfter":(\d+)/);
                    if (match) {
                        retryAfter = parseInt(match[1]) + 5; // Adicionar 5s de buffer
                    }
                } catch (parseError) {
                    console.warn('⚠️ [VIP BACKEND] Erro ao parsear retryAfter, usando default');
                }
                
                // Reagendar sincronização após o tempo de retry
                setTimeout(() => {
                    console.log(`🔄 [VIP BACKEND] Tentando sincronizar ${loginId} novamente após rate limit`);
                    this.syncSingleAccount(loginId);
                }, retryAfter * 1000);
                
            } else if (error.message.includes('Unexpected token \'<\'') || error.message.includes('DOCTYPE') || error.message.includes('HTTP error 502') || error.message.includes('HTTP error 503')) {
                console.warn('⚠️ [VIP BACKEND] Servidor retornou HTML (erro 502/503), backend indisponível');
                this.backendAvailable = false;

                // Tentar novamente após delay maior
                setTimeout(() => {
                    this.backendAvailable = true;
                }, 30000); // 30 segundos
            } else {
                console.error(`❌ [VIP BACKEND] Erro ao sincronizar ${loginId}:`, error);
            }
        }
    }

    // 🚀 Sincronização imediata após ativação manual VIP (triggered pelo AdminVipManager)
    static async syncAfterManualActivation(loginId, isManualRecharge = false) {
       
        // Aguardar um pouco para o backend processar
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Forçar sincronização da conta específica
        await this.syncSingleAccount(loginId);

        // Se for a conta atual, forçar atualização completa da interface
        const currentUser = UserLevelsManager?.getUserInfo();
        if (currentUser && currentUser.loginId === loginId) {
          
            // Aguardar um pouco mais e forçar nova verificação
            setTimeout(() => {
                if (typeof UserLevelsManager !== 'undefined') {
                    UserLevelsManager.updateInterfaceForUserLevel();

                    // Verificar se a mudança foi aplicada
                    const newLevel = UserLevelsManager.getCurrentUserLevel();
                  
                    if (newLevel === 'vip') {
                     
                    } else {
                        console.warn(`⚠️ [VIP BACKEND] Usuário ${loginId} ainda não está como VIP, tentando novamente...`);
                        // Tentar mais uma vez
                        setTimeout(() => {
                            this.syncSingleAccount(loginId);
                        }, 2000);
                    }
                }
            }, 1500);
        } else if (isManualRecharge) {
            // ✅ LIMPEZA: Remover conta de outro usuário do localStorage do admin após recarga manual bem-sucedida
            setTimeout(() => {
                const vipKey = `vip_status_${loginId}`;
                const existingData = localStorage.getItem(vipKey);
                
                if (existingData) {
                 
                    localStorage.removeItem(vipKey);
                 
                }
            }, 3000); // Aguardar 3 segundos para garantir que a sincronização foi completada
        }
    }


    // 🧹 LIMPEZA: Remover contas de recargas manuais antigas do localStorage
    static cleanupOldManualRechargeAccounts() {
        const currentUser = UserLevelsManager?.getUserInfo();
        if (!currentUser || !currentUser.loginId) {
            console.warn('⚠️ [VIP CLEANUP] Nenhum usuário logado');
            return 0;
        }

        const currentLoginId = currentUser.loginId;
        const currentPrefix = currentLoginId.match(/^[A-Z]+/)?.[0];
        let removedCount = 0;

     

        for (let i = localStorage.length - 1; i >= 0; i--) {
            const key = localStorage.key(i);

            if (key && key.startsWith('vip_status_')) {
                const accountId = key.replace('vip_status_', '');
                const accountPrefix = accountId.match(/^[A-Z]+/)?.[0];

                // Remover se for de outro tipo de conta (ex: admin CR removendo contas VRTC)
                if (accountPrefix && currentPrefix && accountPrefix !== currentPrefix) {
                  
                    localStorage.removeItem(key);
                    removedCount++;
                }
            }
        }


        return removedCount;
    }

    // 🔍 Buscar APENAS as contas do usuário ATUAL no localStorage (ignorar contas de recargas manuais)
    static getAllUserAccountsFromLocalStorage() {
        const accounts = new Set();
        const currentUser = UserLevelsManager?.getUserInfo();
        
        if (!currentUser || !currentUser.loginId) {
            return [];
        }

        const currentLoginId = currentUser.loginId;

        // Percorrer todas as chaves do localStorage
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);

            // Buscar chaves de VIP
            if (key && key.startsWith('vip_status_')) {
                const accountId = key.replace('vip_status_', '');
                
                // ✅ FILTRO: Incluir APENAS contas que começam com o mesmo prefixo do usuário atual
                // Exemplo: Se admin é CR2483297, só sincroniza CR* (suas contas reais)
                //          Se admin é VRTC5518735, só sincroniza VRTC* (suas contas virtuais)
                const currentPrefix = currentLoginId.match(/^[A-Z]+/)?.[0]; // CR, VRTC, etc
                const accountPrefix = accountId.match(/^[A-Z]+/)?.[0];
                
                if (currentPrefix && accountPrefix && currentPrefix === accountPrefix) {
                    accounts.add(accountId);
                 
                } 
            }
        }

        return Array.from(accounts);
    }

    // 🎉 Mostrar notificação de sincronização
    static showSyncNotification(plan, isGroupActivation = false) {
        // Criar notificação visual
        const notification = document.createElement('div');
        notification.className = 'vip-sync-notification';

        const groupMessage = isGroupActivation ? 
            '<p><strong>🎯 VIP ativado em TODAS suas contas!</strong></p>' : '';

        notification.innerHTML = `
            <div class="vip-notification-content">
                <div class="vip-notification-header">
                    <span class="vip-icon">💎</span>
                    <h3>${isGroupActivation ? 'VIP Multi-Conta Ativado!' : 'VIP Sincronizado!'}</h3>
                    <button class="close-notification" onclick="this.parentElement.parentElement.parentElement.remove()">×</button>
                </div>
                <div class="vip-notification-body">
                    <p>Seu plano <strong>${plan}</strong> foi sincronizado do servidor!</p>
                    ${groupMessage}
                    <p>Agora você tem acesso a todos os recursos VIP${isGroupActivation ? ' em todas suas contas' : ''}.</p>
                </div>
            </div>
        `;

        // Adicionar estilos se ainda não existir
        if (!document.getElementById('vip-sync-notification-styles')) {
            const style = document.createElement('style');
            style.id = 'vip-sync-notification-styles';
            style.textContent = `
                .vip-sync-notification {
                    position: fixed;
                    top: 20px;
                    left: 20px;
                    z-index: 10001;
                    background: linear-gradient(135deg, #667eea, #764ba2);
                    border-radius: 12px;
                    box-shadow: 0 8px 32px rgba(102, 126, 234, 0.6);
                    animation: slideInLeft 0.5s ease;
                }

                @keyframes slideInLeft {
                    from {
                        transform: translateX(-100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }

                .vip-sync-notification .vip-notification-content {
                    padding: 20px;
                    color: white;
                }

                .vip-sync-notification .vip-notification-header {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    margin-bottom: 10px;
                }

                .vip-sync-notification .vip-notification-header h3 {
                    margin: 0;
                    flex: 1;
                }

                .vip-sync-notification .vip-icon {
                    font-size: 1.5em;
                }

                .vip-sync-notification .close-notification {
                    background: none;
                    border: none;
                    font-size: 1.5em;
                    cursor: pointer;
                    color: white;
                    padding: 0;
                }

                .vip-sync-notification .vip-notification-body p {
                    margin: 5px 0;
                    font-size: 0.9em;
                }
            `;
            document.head.appendChild(style);
        }

        document.body.appendChild(notification);

        // Auto-remover após 8 segundos
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 8000);
    }

    // 📊 Obter estatísticas VIP do servidor
    static async getVipStats() {
        if (!this.backendAvailable) {
         
            return null;
        }
        try {
            const response = await fetch('/api/vip/stats');
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP error ${response.status}: ${errorText}`);
            }
            const data = await response.json();

            if (data.success) {
              
                return data.stats;
            } else {
                console.error('❌ [VIP STATS] Erro:', data.error);
                return null;
            }
        } catch (error) {
            // Verificar se é erro de servidor (HTML response)
            if (error.message.includes('Unexpected token \'<\'') || error.message.includes('DOCTYPE') || error.message.includes('HTTP error 502') || error.message.includes('HTTP error 503')) {
                console.warn('⚠️ [VIP STATS] Servidor retornou HTML (erro 502/503), backend indisponível');
                this.backendAvailable = false;
                setTimeout(() => {
                    this.backendAvailable = true;
                }, 30000); // 30 segundos
            } else {
                console.error('❌ [VIP STATS] Erro ao obter estatísticas:', error);
            }
            return null;
        }
    }

    // 🔄 Forçar sincronização manual (para teste)
    static async forceSyncNow() {
      
        await this.syncWithBackend();
      
    }

    // 🛑 Parar sincronização
    static stop() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
            this.isInitialized = false;
        }
    }
}

// Inicializar sincronização quando usuário fizer login
window.addEventListener('userLevelChanged', () => {
    const userInfo = UserLevelsManager.getUserInfo();
    if (userInfo && userInfo.loginId) {
        VipBackendSync.initialize();
    } else {
        VipBackendSync.stop();
    }
});

// Inicializar ao carregar a página se usuário já estiver logado
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        const userInfo = UserLevelsManager.getUserInfo();
        if (userInfo && userInfo.loginId) {
            VipBackendSync.initialize();
        }
    }, 15 * 60 * 1000); // Aguardar 15 minutos após carregar página para evitar rate limit
});

// 🔧 Expor função global para sincronização manual (para debug)
window.forceSyncVip = () => VipBackendSync.forceSyncNow();
window.checkVipStatus = () => {
        const userInfo = UserLevelsManager.getUserInfo();
       
    };

    // 🚀 Comando global para sincronização imediata após ativação manual
    window.syncVipNow = (loginId) => {
        if (!loginId) {
            const userInfo = UserLevelsManager.getUserInfo();
            loginId = userInfo?.loginId;
        }

        if (loginId) {
         
            VipBackendSync.syncAfterManualActivation(loginId);
        } else {
            console.error('❌ [VIP SYNC] LoginId não encontrado');
        }
    };