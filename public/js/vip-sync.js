
// js/vip-sync.js
// Sistema de sincronização de status VIP
// O SISTEMA DEVE SER 100% ISOLADO POR USUARIO

class VipSyncManager {
    static syncInterval = null;
    static isVipUser = false;

    // 🔄 Iniciar sincronização automática
    static startSync() {
        // Verificar imediatamente
        this.checkVipStatus();

        // Verificar a cada 5 minutos
        this.syncInterval = setInterval(() => {
            this.checkVipStatus();
        }, 5 * 60 * 1000);

     
    }

    // 🛑 Parar sincronização
    static stopSync() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
           
        }
    }

    // 🔍 Verificar status VIP atual
    static async checkVipStatus() {
        try {
            const userInfo = UserLevelsManager.getUserInfo();
            if (!userInfo || !userInfo.loginId) {
                return;
            }

            const currentVipStatus = userInfo.isVip;
          

            // Verificar se há alguma notificação de ativação pendente
            await this.checkPendingVipActivation(userInfo.loginId);

        } catch (error) {
            console.error('❌ [VIP SYNC] Erro ao verificar status VIP:', error);
        }
    }

    // 📨 Verificar ativações VIP pendentes
    static async checkPendingVipActivation(loginId) {
        try {
            // Verificar no localStorage se há uma flag de ativação pendente
            const pendingActivation = localStorage.getItem(`pending_vip_${loginId}`);
            
            if (pendingActivation) {
                const data = JSON.parse(pendingActivation);
                const now = Date.now();
                
                // Se a ativação pendente tem menos de 24h, continuar verificando
                if (now - data.timestamp < 24 * 60 * 60 * 1000) {
                  
                    
                    // Simular ativação após pagamento (em sistema real, verificaria com backend)
                    if (data.shouldActivate) {
                        this.activateVipLocally(loginId, data.plan);
                        localStorage.removeItem(`pending_vip_${loginId}`);
                    }
                } else {
                    // Remover ativação expirada
                    localStorage.removeItem(`pending_vip_${loginId}`);
                   
                }
            }
        } catch (error) {
            console.error('❌ [VIP SYNC] Erro ao verificar ativação pendente:', error);
        }
    }

    // 💎 Ativar VIP localmente
    static activateVipLocally(loginId, plan) {
        try {
            const success = UserLevelsManager.activateVip(loginId, plan);
            
            if (success) {
                              
                // Atualizar interface
                UserLevelsManager.updateInterfaceForUserLevel();
                
                // Mostrar notificação de sucesso
                this.showVipActivationNotification(plan);
                
                return true;
            }
        } catch (error) {
            console.error('❌ [VIP SYNC] Erro ao ativar VIP localmente:', error);
        }
        return false;
    }

    // 🎉 Mostrar notificação de ativação VIP
    static showVipActivationNotification(plan) {
        // Criar notificação visual
        const notification = document.createElement('div');
        notification.className = 'vip-activation-notification';
        notification.innerHTML = `
            <div class="vip-notification-content">
                <div class="vip-notification-header">
                    <span class="vip-icon">💎</span>
                    <h3>VIP Ativado!</h3>
                    <button class="close-notification" onclick="this.parentElement.parentElement.parentElement.remove()">×</button>
                </div>
                <div class="vip-notification-body">
                    <p>Seu plano <strong>${plan}</strong> foi ativado com sucesso!</p>
                    <p>Agora você tem acesso a todos os recursos VIP.</p>
                </div>
            </div>
        `;

        // Adicionar estilos
        if (!document.getElementById('vip-notification-styles')) {
            const style = document.createElement('style');
            style.id = 'vip-notification-styles';
            style.textContent = `
                .vip-activation-notification {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    z-index: 10001;
                    background: linear-gradient(135deg, #ffd700, #ffed4e);
                    border-radius: 12px;
                    box-shadow: 0 8px 32px rgba(255, 215, 0, 0.6);
                    animation: slideInRight 0.5s ease;
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

                .vip-notification-content {
                    padding: 20px;
                    color: #000;
                }

                .vip-notification-header {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    margin-bottom: 10px;
                }

                .vip-notification-header h3 {
                    margin: 0;
                    flex: 1;
                }

                .vip-icon {
                    font-size: 1.5em;
                }

                .close-notification {
                    background: none;
                    border: none;
                    font-size: 1.5em;
                    cursor: pointer;
                    color: #000;
                    padding: 0;
                }

                .vip-notification-body p {
                    margin: 5px 0;
                    font-size: 0.9em;
                }
            `;
            document.head.appendChild(style);
        }

        document.body.appendChild(notification);

        // Auto-remover após 10 segundos
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 10000);
    }

    // 📝 Registrar pagamento pendente (chamado após iniciar pagamento)
    static registerPendingPayment(loginId, plan) {
        const pendingData = {
            timestamp: Date.now(),
            plan: plan,
            shouldActivate: false // Será true quando pagamento for confirmado
        };

        localStorage.setItem(`pending_vip_${loginId}`, JSON.stringify(pendingData));
    
    }

    // ✅ Marcar pagamento como confirmado (simulação para desenvolvimento)
    static markPaymentAsConfirmed(loginId) {
        const pendingKey = `pending_vip_${loginId}`;
        const pendingData = localStorage.getItem(pendingKey);
        
        if (pendingData) {
            const data = JSON.parse(pendingData);
            data.shouldActivate = true;
            localStorage.setItem(pendingKey, JSON.stringify(data));
        
        }
    }
}

// Inicializar sincronização quando usuário estiver logado
window.addEventListener('userLevelChanged', () => {
    const userInfo = UserLevelsManager.getUserInfo();
    if (userInfo && userInfo.loginId) {
        VipSyncManager.startSync();
    } else {
        VipSyncManager.stopSync();
    }
});

// Inicializar ao carregar a página
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (typeof UserLevelsManager !== 'undefined') {
            const userInfo = UserLevelsManager.getUserInfo();
            if (userInfo && userInfo.loginId) {
                VipSyncManager.startSync();
            }
        }
    }, 2000); // Aguardar sistema estar pronto
});
