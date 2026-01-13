
// js/creditoVisor.js
// Visor de créditos posicionado no canto inferior esquerdo
// Exibe créditos apenas para usuários não-admin

class CreditoVisor {
    static instance = null;
    static visorElement = null;
    static updateInterval = null;

    // 🎯 Inicializar visor de créditos
    static initialize() {
        if (this.instance) {
            return this.instance;
        }

        this.instance = this;
        this.createVisor();
        this.startUpdating();
        this.setupEventListeners();

        return this.instance;
    }

    // 🎨 Criar elemento visual do visor
    static createVisor() {
        // Remover visor existente se houver
        if (this.visorElement) {
            this.visorElement.remove();
        }

        this.visorElement = document.createElement('div');
        this.visorElement.id = 'credito-visor';
        this.visorElement.className = 'credito-visor';

        // Estilos inline para garantir posicionamento correto
        this.visorElement.style.cssText = `
            position: fixed !important;
            bottom: 20px !important;
            left: 22px !important;
            z-index: 2147483646 !important;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
            color: white !important;
            padding: 12px 16px !important;
            border-radius: 12px !important;
            font-weight: bold !important;
            font-size: 0.9em !important;
            box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4) !important;
            border: 2px solid rgba(255, 255, 255, 0.3) !important;
            backdrop-filter: blur(10px) !important;
            display: none !important;
            visibility: hidden !important;
            opacity: 0 !important;
            transition: all 0.3s ease !important;
            min-width: 120px !important;
            text-align: center !important;
            cursor: pointer !important;
            user-select: none !important;
        `;

        this.visorElement.innerHTML = `
            <div class="credito-visor-content">
                <div class="credito-icon">💰</div>
                <div class="credito-amount" id="credito-amount">-</div>
                <div class="credito-label">créditos</div>
            </div>
        `;

        // Adicionar estilos CSS específicos
        this.addStyles();

        // Adicionar ao DOM
        document.body.appendChild(this.visorElement);

        // Event listeners para interação
        this.visorElement.addEventListener('click', () => {
            this.onVisorClick();
        });

        this.visorElement.addEventListener('mouseenter', () => {
            this.visorElement.style.transform = 'translateY(-2px) scale(1.05)';
            this.visorElement.style.boxShadow = '0 8px 25px rgba(102, 126, 234, 0.6)';
        });

        this.visorElement.addEventListener('mouseleave', () => {
            this.visorElement.style.transform = 'translateY(0) scale(1)';
            this.visorElement.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.4)';
        });

    }

    // 🎨 Adicionar estilos CSS
    static addStyles() {
        if (document.getElementById('credito-visor-styles')) return;

        const style = document.createElement('style');
        style.id = 'credito-visor-styles';
        style.textContent = `
            .credito-visor-content {
                display: flex !important;
                flex-direction: column !important;
                align-items: center !important;
                gap: 2px !important;
            }

            .credito-icon {
                font-size: 1.2em !important;
                margin-bottom: 2px !important;
            }

            .credito-amount {
                font-size: 1.1em !important;
                font-weight: bold !important;
                color: #ffd700 !important;
                text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3) !important;
            }

            .credito-label {
                font-size: 0.75em !important;
                opacity: 0.9 !important;
                text-transform: uppercase !important;
                letter-spacing: 0.5px !important;
            }

            /* Responsividade mobile */
            @media (max-width: 768px) {
                .credito-visor {
                    bottom: 115px !important;
                    left: 15px !important;
                    padding: 10px 14px !important;
                    font-size: 0.8em !important;
                    min-width: 100px !important;
                }

                .credito-amount {
                    font-size: 1em !important;
                }

                .credito-label {
                    font-size: 0.7em !important;
                }
            }
        `;

        document.head.appendChild(style);
    }

    // 🔄 Atualizar quantidade de créditos
    static async updateCredits() {
        try {
            // Verificar se a tela de loading ainda está ativa antes de continuar
            const loadingScreen = document.getElementById('loading-screen');
            const isLoadingVisible = loadingScreen && 
                loadingScreen.style.display !== 'none' && 
                window.getComputedStyle(loadingScreen).display !== 'none' &&
                parseFloat(window.getComputedStyle(loadingScreen).opacity) > 0;

            if (isLoadingVisible) {
                // Se loading ainda está visível, não atualizar o visor ainda
                return;
            }

            const currentUser = SessionManager.getCurrentUser();
            if (!currentUser) {
                this.hide();
                return;
            }

            const loginId = currentUser.authorize?.loginid;
            if (!loginId) {
                this.hide();
                return;
            }

            // Verificar se é admin - não mostrar visor para admins
            if (typeof UserLevelsManager !== 'undefined') {
                const isAdmin = UserLevelsManager.ADMIN_LOGIN_IDS.includes(loginId);
                if (isAdmin) {
                    this.hide();
                    return;
                }
            }

            // Obter créditos atuais
            let credits = 0;
            if (typeof CreditsManager !== 'undefined') {
                credits = await CreditsManager.getCurrentCredits();
            }

            // Atualizar display
            const amountElement = document.getElementById('credito-amount');
            if (amountElement) {
                amountElement.textContent = credits.toString();
            }

            // Mostrar visor se estava oculto
            this.show();

        } catch (error) {
            console.error('❌ [CREDITO VISOR] Erro ao atualizar créditos:', error);
            this.hide();
        }
    }

    // 👁️ Mostrar visor (apenas se loading screen estiver fechado)
    static show() {
        if (!this.visorElement) return;

        // Verificar se a tela de loading ainda está ativa
        const loadingScreen = document.getElementById('loading-screen');
        const isLoadingVisible = loadingScreen && 
            loadingScreen.style.display !== 'none' && 
            window.getComputedStyle(loadingScreen).display !== 'none' &&
            parseFloat(window.getComputedStyle(loadingScreen).opacity) > 0;

        if (isLoadingVisible) {
            // Se loading ainda está visível, tentar novamente em 500ms
            setTimeout(() => this.show(), 500);
            return;
        }

        this.visorElement.style.display = 'block';
        this.visorElement.style.visibility = 'visible';
        
        // Animar entrada
        setTimeout(() => {
            this.visorElement.style.opacity = '1';
        }, 10);
    }

    // 🙈 Ocultar visor
    static hide() {
        if (!this.visorElement) return;

        this.visorElement.style.opacity = '0';
        
        setTimeout(() => {
            this.visorElement.style.display = 'none';
            this.visorElement.style.visibility = 'hidden';
        }, 300);
    }

    // 🔄 Iniciar atualizações automáticas
    static startUpdating() {
        // Atualização inicial
        this.updateCredits();

        // Atualizar a cada 10 segundos
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }

        this.updateInterval = setInterval(() => {
            this.updateCredits();
        }, 10000);
    }

    // 🛑 Parar atualizações
    static stopUpdating() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }

    // 🎧 Configurar event listeners
    static setupEventListeners() {
        // Listener para mudanças de créditos
        window.addEventListener('creditsUpdated', (event) => {
            const credits = event.detail?.credits;
            if (typeof credits === 'number') {
                const amountElement = document.getElementById('credito-amount');
                if (amountElement) {
                    amountElement.textContent = credits.toString();
                }
            }
        });

        // Listener para mudanças de usuário
        window.addEventListener('userLevelChanged', () => {
            setTimeout(() => this.updateCredits(), 500);
        });

        // Listener para troca de conta
        window.addEventListener('accountSwitched', () => {
            setTimeout(() => this.updateCredits(), 1000);
        });

        // Listener para quando app está pronto
        window.addEventListener('AppManagerReady', () => {
            setTimeout(() => this.updateCredits(), 2000);
        });
    }

    // 🖱️ Ação ao clicar no visor
    static onVisorClick() {
        try {
            // Abrir modal de créditos se disponível
            if (typeof VipPaymentModal !== 'undefined') {
                VipPaymentModal.show();
            } else if (typeof ModalCreditos !== 'undefined') {
                ModalCreditos.showRecursoPremium(
                    'Gerenciar Créditos', 
                    'Adquira mais créditos para continuar usando os recursos premium'
                );
            } 
        } catch (error) {
            console.error('❌ [CREDITO VISOR] Erro ao abrir modal:', error);
        }
    }

    // 🧹 Destruir visor
    static destroy() {
        this.stopUpdating();
        
        if (this.visorElement) {
            this.visorElement.remove();
            this.visorElement = null;
        }

        const styles = document.getElementById('credito-visor-styles');
        if (styles) {
            styles.remove();
        }

        this.instance = null;
    }

    // 🔄 Reinicializar visor (útil para mudanças de conta)
    static reinitialize() {
        this.destroy();
        setTimeout(() => {
            this.initialize();
        }, 100);
    }
}

// Instância global
window.CreditoVisor = CreditoVisor;

// Auto-inicialização quando DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        CreditoVisor.initialize();
    }, 2000);
});

// Inicialização após AppManager estar pronto
window.addEventListener('AppManagerReady', () => {
    setTimeout(() => {
        if (!CreditoVisor.instance) {
            CreditoVisor.initialize();
        }
    }, 3000);
});
