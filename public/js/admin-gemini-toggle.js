
// js/admin-gemini-toggle.js
// Sistema de toggle entre Gemini e IA simulada para administradores

class AdminGeminiToggle {
    static isInitialized = false;
    static currentMode = 'gemini'; // 'gemini' ou 'simulada'
    static toggleButton = null;

    // 🔑 Inicializar sistema de toggle (apenas para admins)
    static initialize() {
        if (this.isInitialized) return;

        // Verificar se é admin
        const currentUser = SessionManager.getCurrentUser();
        const loginId = currentUser?.authorize?.loginid;
        
        if (!UserLevelsManager.ADMIN_LOGIN_IDS.includes(loginId)) {
          
            return;
        }

        // Aguardar DOM estar pronto
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.createToggleButton());
        } else {
            this.createToggleButton();
        }

        this.isInitialized = true;
     
    }

    // 🎛️ Criar botão de toggle
    static createToggleButton() {
        // Remover botão existente se houver
        if (this.toggleButton) {
            this.toggleButton.remove();
        }

        // Criar botão
        this.toggleButton = document.createElement('button');
        this.toggleButton.id = 'admin-gemini-toggle-btn';
        this.toggleButton.className = 'admin-gemini-toggle-btn';
        
        this.updateButtonAppearance();
        
        // Event listener
        this.toggleButton.onclick = () => this.toggleMode();

        // Adicionar estilos
        this.addToggleStyles();

        // Adicionar ao DOM
        document.body.appendChild(this.toggleButton);
       
    }

    // 🎨 Adicionar estilos do botão
    static addToggleStyles() {
        if (document.getElementById('admin-gemini-toggle-styles')) return;

        const style = document.createElement('style');
        style.id = 'admin-gemini-toggle-styles';
        style.textContent = `
            .admin-gemini-toggle-btn {
                position: fixed !important;
                bottom: 120px !important;
                left: 20px !important;
                z-index: 9999 !important;
                padding: 12px 16px !important;
                border: none !important;
                border-radius: 8px !important;
                cursor: pointer !important;
                font-weight: bold !important;
                font-size: 12px !important;
                color: white !important;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3) !important;
                transition: all 0.3s ease !important;
                min-width: 80px !important;
                text-align: center !important;
                line-height: 1.2 !important;
                backdrop-filter: blur(10px) !important;
            }

            .admin-gemini-toggle-btn:hover {
                transform: translateY(-2px) scale(1.05) !important;
                box-shadow: 0 6px 16px rgba(0, 0, 0, 0.4) !important;
            }

            .admin-gemini-toggle-btn:active {
                transform: translateY(0) scale(0.98) !important;
            }

            /* Modo Gemini */
            .admin-gemini-toggle-btn.gemini-mode {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
            }

            .admin-gemini-toggle-btn.gemini-mode:hover {
                background: linear-gradient(135deg, #764ba2 0%, #667eea 100%) !important;
            }

            /* Modo IA Simulada */
            .admin-gemini-toggle-btn.simulada-mode {
                background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%) !important;
            }

            .admin-gemini-toggle-btn.simulada-mode:hover {
                background: linear-gradient(135deg, #f5576c 0%, #f093fb 100%) !important;
            }

            /* Responsividade */
            @media (max-width: 768px) {
                .admin-gemini-toggle-btn {
                    bottom: 100px !important;
                    left: 10px !important;
                    font-size: 11px !important;
                    padding: 10px 12px !important;
                    min-width: 70px !important;
                }
            }

            /* Animação de mudança de modo */
            .admin-gemini-toggle-btn.mode-changing {
                animation: modeChangeAnimation 0.5s ease;
            }

            @keyframes modeChangeAnimation {
                0% { transform: scale(1); }
                50% { transform: scale(1.1) rotate(5deg); }
                100% { transform: scale(1); }
            }
        `;

        document.head.appendChild(style);
    }

    // 🎯 Atualizar aparência do botão
    static updateButtonAppearance() {
        if (!this.toggleButton) return;

        // Remover classes de modo
        this.toggleButton.classList.remove('gemini-mode', 'simulada-mode');

        if (this.currentMode === 'gemini') {
            this.toggleButton.classList.add('gemini-mode');
            this.toggleButton.innerHTML = `🤖<br>IA PRIN<br><small>ATIVO</small>`;
            this.toggleButton.title = 'Clique para ativar IA Alternativa';
        } else {
            this.toggleButton.classList.add('simulada-mode');
            this.toggleButton.innerHTML = `🎯<br>IA ALT<br><small>ATIVO</small>`;
            this.toggleButton.title = 'Clique para ativar IA Principal';
        }
    }

    // 🔄 Alternar entre modos
    static async toggleMode() {
        // Animação visual
        this.toggleButton.classList.add('mode-changing');
        
        setTimeout(() => {
            this.toggleButton.classList.remove('mode-changing');
        }, 500);

        // Alternar modo
        const previousMode = this.currentMode;
        this.currentMode = this.currentMode === 'gemini' ? 'simulada' : 'gemini';

        // Atualizar aparência
        this.updateButtonAppearance();

        // Salvar preferência no localStorage
        localStorage.setItem('admin_ia_mode_preference', this.currentMode);

        // Notificar mudança
        this.showModeChangeNotification(previousMode, this.currentMode);

        // Disparar evento para outros sistemas
        window.dispatchEvent(new CustomEvent('adminIAModeChanged', {
            detail: {
                previousMode: previousMode,
                currentMode: this.currentMode,
                timestamp: Date.now()
            }
        }));

       
    }

    // 📢 Mostrar notificação de mudança de modo
    static showModeChangeNotification(previousMode, currentMode) {
        // Remover notificação existente
        const existingNotification = document.getElementById('admin-mode-change-notification');
        if (existingNotification) {
            existingNotification.remove();
        }

        // Criar nova notificação
        const notification = document.createElement('div');
        notification.id = 'admin-mode-change-notification';
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${currentMode === 'gemini' ? 
                'linear-gradient(135deg, #667eea, #764ba2)' : 
                'linear-gradient(135deg, #f093fb, #f5576c)'};
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            z-index: 999999;
            font-weight: bold;
            animation: slideInRight 0.5s ease;
            max-width: 280px;
        `;

        const modeNames = {
            gemini: '🤖 IA Principal',
            simulada: '🎯 IA Alternativa'
        };

        notification.innerHTML = `
            <div style="margin-bottom: 5px;">🔄 Modo IA Alterado</div>
            <small style="opacity: 0.9;">
                ${modeNames[previousMode]} → ${modeNames[currentMode]}
            </small>
        `;

        document.body.appendChild(notification);

        // Remover após 4 segundos
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.5s ease';
            setTimeout(() => {
                if (notification.parentElement) {
                    notification.remove();
                }
            }, 500);
        }, 4000);
    }

    // 🔍 Obter modo atual
    static getCurrentMode() {
        // Retornar modo atual da instância
        if (this.currentMode && ['gemini', 'simulada'].includes(this.currentMode)) {
            return this.currentMode;
        }
        
        // Fallback: gemini
        return 'gemini';
    }

    // 📄 Carregar preferência salva do localStorage
    static loadSavedPreference() {
        const savedMode = localStorage.getItem('admin_ia_mode_preference');
        if (savedMode && ['gemini', 'simulada'].includes(savedMode)) {
            this.currentMode = savedMode;
           
        }
    }

    // 🚀 Inicialização automática
    static autoInitialize() {
        // Carregar preferência salva do localStorage
        this.loadSavedPreference();

        // Aguardar usuário estar logado
        if (SessionManager.getCurrentUser()) {
            this.initialize();
        } else {
            // Aguardar login
            window.addEventListener('userLogin', () => {
                this.loadSavedPreference();
                setTimeout(() => this.initialize(), 1000);
            });
        }
    }
}

// Inicializar automaticamente quando DOM estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        AdminGeminiToggle.autoInitialize();
    });
} else {
    AdminGeminiToggle.autoInitialize();
}

// Exportar para uso global
window.AdminGeminiToggle = AdminGeminiToggle;
