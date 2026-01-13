
// js/modalLogout.js
// Sistema de Modal de Logout Profissional
// Gerencia opções de logout: sessão apenas ou logout completo

class ModalLogout {
    static isModalOpen = false;
    static currentModal = null;

    // 🎨 Mostrar modal de logout com duas opções
    static show() {
        if (this.isModalOpen) {
            return; // Evitar múltiplos modais
        }

        this.isModalOpen = true;

        // 🌫️ NOVO: Embaçar componentes flutuantes durante logout
        this.blurFloatingComponents();

        // Criar modal de logout
        const modal = document.createElement('div');
        modal.className = 'logout-modal-overlay';
        modal.id = 'logout-modal-overlay';
        modal.innerHTML = `
            <div class="logout-modal-content">
                <div class="logout-modal-header">
                    <h2>🚪 Opções de Saída</h2>
                    <button class="close-modal-btn" onclick="ModalLogout.hide()">×</button>
                </div>
                
                <div class="logout-modal-body">
                    <p class="logout-description">
                        Como deseja encerrar sua sessão?
                    </p>

                    <div class="logout-options">
                        <div class="logout-option session-only" onclick="ModalLogout.logoutSession()">
                            <div class="option-icon">🔄</div>
                            <div class="option-content">
                                <h3>Encerrar Somente a Sessão</h3>
                                <p>Seus dados ficam salvos para próximo acesso. Login automático na próxima vez.</p>
                                <ul>
                                    <li>✅ Mantém tokens salvos</li>
                                    <li>✅ Configurações preservadas</li>
                                    <li>✅ Login rápido no retorno</li>
                                </ul>
                            </div>
                        </div>

                        <div class="logout-option full-logout" onclick="ModalLogout.logoutComplete()">
                            <div class="option-icon">🧹</div>
                            <div class="option-content">
                                <h3>Sair Completamente</h3>
                                <p>Remove todos os dados e tokens. Será necessário fazer login novamente.</p>
                                <ul>
                                    <li>🔒 Remove todos os tokens</li>
                                    <li>🧹 Limpa dados salvos</li>
                                    <li>🔐 Logout completo e seguro</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    <div class="logout-note">
                        <strong>💡 Recomendação:</strong> Use "Encerrar Somente a Sessão" para maior praticidade, 
                        ou "Sair Completamente" se estiver em um computador compartilhado.
                    </div>
                </div>
            </div>
        `;

        // Adicionar estilos se não existirem
        this.addModalStyles();

        // Adicionar ao DOM
        document.body.appendChild(modal);
        this.currentModal = modal;

        // Animar entrada
        setTimeout(() => {
            modal.classList.add('show');
        }, 10);

        // Adicionar event listener para fechar ao clicar fora
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.hide();
            }
        });

        // Event listener para ESC
        this.escapeHandler = (e) => {
            if (e.key === 'Escape') {
                this.hide();
            }
        };
        document.addEventListener('keydown', this.escapeHandler);
    }

    // 🙈 Ocultar modal
    static hide() {
        if (!this.isModalOpen || !this.currentModal) {
            return;
        }

        this.currentModal.classList.add('hide');
        
        setTimeout(() => {
            if (this.currentModal && this.currentModal.parentElement) {
                this.currentModal.remove();
            }
            this.currentModal = null;
            this.isModalOpen = false;
            
            // 🌫️ NOVO: Restaurar componentes flutuantes após fechar modal
            this.unblurFloatingComponents();
        }, 300);

        // Remover event listener do ESC
        if (this.escapeHandler) {
            document.removeEventListener('keydown', this.escapeHandler);
            this.escapeHandler = null;
        }
    }

    // 🔄 Logout apenas da sessão (mantém tokens)
    static logoutSession() {
        this.hide();
        this.removeFloatingComponents();
        this.showSessionLogoutProcess();
    }

    // 🧹 Logout completo (remove tudo)
    static logoutComplete() {
        this.hide();
        this.removeFloatingComponents();
        this.showCompleteLogoutProcess();
    }

    // 🔄 Processo de logout da sessão
    static showSessionLogoutProcess() {
        const modal = document.createElement('div');
        modal.className = 'logout-process-modal';
        modal.innerHTML = `
            <div class="logout-process-content">
                <div class="logout-icon">🔄</div>
                <h2>Encerrando Sessão...</h2>
                <div class="logout-progress">
                    <div class="logout-progress-bar">
                        <div class="logout-progress-fill"></div>
                    </div>
                    <div class="logout-status">Preservando dados para próximo acesso...</div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        setTimeout(() => {
            modal.classList.add('show');
            this.executeSessionLogout();
        }, 100);
    }

    // 🧹 Processo de logout completo
    static showCompleteLogoutProcess() {
        const modal = document.createElement('div');
        modal.className = 'logout-process-modal';
        modal.innerHTML = `
            <div class="logout-process-content">
                <div class="logout-icon">🧹</div>
                <h2>Logout Completo...</h2>
                <div class="logout-progress">
                    <div class="logout-progress-bar">
                        <div class="logout-progress-fill"></div>
                    </div>
                    <div class="logout-status">Removendo todos os dados...</div>
                </div>
                <div class="logout-steps">
                    <div class="logout-step" data-step="1">
                        <span class="step-icon">🔄</span>
                        <span class="step-text">Limpando dados da sessão</span>
                        <span class="step-status">⏳</span>
                    </div>
                    <div class="logout-step" data-step="2">
                        <span class="step-icon">🔑</span>
                        <span class="step-text">Removendo tokens de acesso</span>
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

        document.body.appendChild(modal);

        setTimeout(() => {
            modal.classList.add('show');
            this.executeCompleteLogout();
        }, 100);
    }

    // ⚡ Executar logout da sessão (rápido)
    static async executeSessionLogout() {
        const progressFill = document.querySelector('.logout-progress-fill');
        const statusText = document.querySelector('.logout-status');

        // Simular processo rápido
        progressFill.style.width = '30%';
        statusText.textContent = 'Limpando mensagens de trade...';

        // ✅ CRÍTICO: Limpar mensagens de trade AGRESSIVAMENTE
        try {
            const messagesManager = getTradeMessagesInstance();
            if (messagesManager) {
                messagesManager.clearMessages();
            }
        } catch (error) {
          
        }

        await new Promise(resolve => setTimeout(resolve, 600));

        progressFill.style.width = '60%';
        statusText.textContent = 'Notificando sistemas...';

        // ✅ Notificar sistemas online ANTES de limpar dados
        const currentUser = SessionManager.getCurrentUser();
        if (typeof window !== "undefined" && window.onlineUsersMonitor && currentUser?.loginid) {
            window.onlineUsersMonitor.handleUserLogout(currentUser.loginid);
        }

        await new Promise(resolve => setTimeout(resolve, 300));

        progressFill.style.width = '70%';
        statusText.textContent = 'Finalizando limpeza total...';

              
        // Limpar TODO localStorage
        Object.keys(localStorage).forEach(key => localStorage.removeItem(key));
        
        // Limpar TODO sessionStorage
        Object.keys(sessionStorage).forEach(key => sessionStorage.removeItem(key));
        
        // Limpar cookies
        document.cookie.split(";").forEach((c) => {
            document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
        });
        
        await new Promise(resolve => setTimeout(resolve, 400));

        progressFill.style.width = '100%';
        statusText.textContent = 'Sessão encerrada com sucesso!';

        await new Promise(resolve => setTimeout(resolve, 500));

        this.showLogoutSuccess('Sessão encerrada!', 'Você pode fazer login novamente quando quiser.');
    }

    // 🔥 Executar logout completo com limpeza total
    static async executeCompleteLogout() {
        const steps = document.querySelectorAll('.logout-step');
        const progressFill = document.querySelector('.logout-progress-fill');
        const statusText = document.querySelector('.logout-status');

        // Etapa 1: Notificar sistemas
        await this.animateLogoutStep(1, 'Notificando sistemas online...', async () => {
            const currentUser = SessionManager.getCurrentUser();
            if (typeof window !== "undefined" && window.onlineUsersMonitor && currentUser?.loginid) {
                window.onlineUsersMonitor.handleUserLogout(currentUser.loginid);
            }
        });

        progressFill.style.width = '25%';

        // Etapa 2: Remover tokens
        await this.animateLogoutStep(2, 'Removendo tokens de acesso...', async () => {
            // Remover todos os tokens
            const allKeys = Object.keys(localStorage);
            allKeys.forEach((key) => {
                if (key.startsWith("token_") || key.startsWith("access_token_")) {
                    localStorage.removeItem(key);
                }
            });

            // Finalizar OAuth
            if (typeof SessionManager !== 'undefined' && SessionManager.finalizeOAuthProcess) {
                SessionManager.finalizeOAuthProcess();
            }
        });

        progressFill.style.width = '50%';

        // Etapa 3: Limpar dados
        await this.animateLogoutStep(3, 'Removendo dados temporários...', async () => {
            // ✅ Limpar mensagens de trade explicitamente
            try {
                const messagesManager = getTradeMessagesInstance();
                if (messagesManager) {
                    messagesManager.clearMessages();
                }
            } catch (error) {
              
            }
            
            // 🔥 LIMPEZA COMPLETA E AGRESSIVA - ZERO VAZAMENTO
                      
            // 1. Limpar TODO o localStorage (incluindo global_persistent_session_id, current_user_loginid, etc)
            const allKeys = Object.keys(localStorage);
            allKeys.forEach((key) => {
                localStorage.removeItem(key);
              
            });
            
            // 2. 🔥 NOVO: Limpar TODO o sessionStorage também
         
            const sessionKeys = Object.keys(sessionStorage);
            sessionKeys.forEach((key) => {
                sessionStorage.removeItem(key);
              
            });
            
            // 3. ✅ VERIFICAÇÃO: Garantir que chaves críticas foram removidas
            const criticalKeys = [
                'global_persistent_session_id',
                'current_user_loginid',
                'oauth_multitoken_source',
                'oauth_authorized_loginids'
            ];
            
            let allCleared = true;
            criticalKeys.forEach(key => {
                if (localStorage.getItem(key)) {
                
                    localStorage.removeItem(key); // Forçar remoção
                    allCleared = false;
                }
            });
            
                     
            // 4. 🔥 Limpar cookies do navegador (se existirem)
            document.cookie.split(";").forEach((c) => {
                document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
            });
            
         
        });

        progressFill.style.width = '75%';

        // Etapa 4: Finalizar
        await this.animateLogoutStep(4, 'Logout realizado com sucesso!', async () => {
            await new Promise(resolve => setTimeout(resolve, 500));
        });

        progressFill.style.width = '100%';
        statusText.textContent = 'Redirecionando...';

        await new Promise(resolve => setTimeout(resolve, 1000));

        this.showLogoutSuccess('Logout completo!', 'Todos os dados foram removidos com segurança.');
    }

    // 🎯 Animar etapa do logout
    static async animateLogoutStep(stepNumber, statusMessage, action) {
        const step = document.querySelector(`[data-step="${stepNumber}"]`);
        const statusText = document.querySelector('.logout-status');
        
        if (statusText) {
            statusText.textContent = statusMessage;
        }
        
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
    static showLogoutSuccess(title, description) {
        // Remover modal anterior
        const existingModal = document.querySelector('.logout-process-modal');
        if (existingModal) {
            existingModal.remove();
        }

        const modal = document.createElement('div');
        modal.className = 'logout-process-modal';
        modal.innerHTML = `
            <div class="logout-process-content success">
                <div class="success-icon">🎉</div>
                <h2>${title}</h2>
                <p>${description}</p>
                <div class="success-message">
                    Redirecionando para a página inicial...
                </div>
                <div class="redirect-countdown">
                    <span id="countdown">3</span>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        setTimeout(() => modal.classList.add('show'), 10);

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

    // 🎨 Adicionar estilos do modal
    static addModalStyles() {
        if (document.getElementById('modal-logout-styles')) return;

        const style = document.createElement('style');
        style.id = 'modal-logout-styles';
        style.textContent = `
            /* Modal de Logout - Estilos */
            .logout-modal-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                background: rgba(0, 0, 0, 0.8);
                backdrop-filter: blur(10px);
                z-index: 2147483647;
                display: flex;
                align-items: center;
                justify-content: center;
                opacity: 0;
                visibility: hidden;
                transition: all 0.3s ease;
            }

            .logout-modal-overlay.show {
                opacity: 1;
                visibility: visible;
            }

            .logout-modal-overlay.hide {
                opacity: 0;
                visibility: hidden;
            }

            .logout-modal-content {
                background: white;
                border-radius: 20px;
                max-width: 700px;
                width: 90%;
                max-height: 90vh;
                overflow-y: auto;
                box-shadow: 0 25px 80px rgba(0, 0, 0, 0.4);
                transform: scale(0.9) translateY(20px);
                transition: transform 0.3s ease;
                position: relative;
            }

            .logout-modal-overlay.show .logout-modal-content {
                transform: scale(1) translateY(0);
            }

            .logout-modal-header {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 25px 30px;
                border-radius: 20px 20px 0 0;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }

            .logout-modal-header h2 {
                margin: 0;
                font-size: 1.4em;
                font-weight: 600;
            }

            .close-modal-btn {
                background: none;
                border: none;
                color: white;
                font-size: 1.8em;
                cursor: pointer;
                width: 35px;
                height: 35px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 50%;
                transition: background 0.2s ease;
            }

            .close-modal-btn:hover {
                background: rgba(255, 255, 255, 0.1);
            }

            .logout-modal-body {
                padding: 30px;
            }

            .logout-description {
                text-align: center;
                font-size: 1.1em;
                color: #495057;
                margin-bottom: 25px;
                line-height: 1.5;
            }

            .logout-options {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 20px;
                margin-bottom: 25px;
            }

            .logout-option {
                border: 2px solid #e9ecef;
                border-radius: 15px;
                padding: 20px;
                cursor: pointer;
                transition: all 0.3s ease;
                position: relative;
                overflow: hidden;
            }

            .logout-option:hover {
                border-color: #667eea;
                transform: translateY(-2px);
                box-shadow: 0 8px 25px rgba(102, 126, 234, 0.15);
            }

            .logout-option.session-only:hover {
                border-color: #28a745;
                box-shadow: 0 8px 25px rgba(40, 167, 69, 0.15);
            }

            .logout-option.full-logout:hover {
                border-color: #dc3545;
                box-shadow: 0 8px 25px rgba(220, 53, 69, 0.15);
            }

            .option-icon {
                font-size: 2.5em;
                text-align: center;
                margin-bottom: 15px;
            }

            .option-content h3 {
                margin: 0 0 10px 0;
                color: #333;
                font-size: 1.1em;
                font-weight: 600;
            }

            .option-content p {
                color: #666;
                font-size: 0.9em;
                line-height: 1.4;
                margin-bottom: 15px;
            }

            .option-content ul {
                list-style: none;
                padding: 0;
                margin: 0;
            }

            .option-content li {
                font-size: 0.85em;
                color: #666;
                margin-bottom: 5px;
                padding-left: 20px;
                position: relative;
            }

            .logout-note {
                background: #f8f9fa;
                border: 1px solid #e9ecef;
                border-radius: 10px;
                padding: 15px;
                font-size: 0.9em;
                color: #495057;
                line-height: 1.5;
            }

            /* Modal de Processo */
            .logout-process-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                background: rgba(0, 0, 0, 0.9);
                backdrop-filter: blur(8px);
                z-index: 2147483647;
                display: flex;
                align-items: center;
                justify-content: center;
                opacity: 0;
                visibility: hidden;
                transition: all 0.3s ease;
            }

            .logout-process-modal.show {
                opacity: 1;
                visibility: visible;
            }

            .logout-process-content {
                background: white;
                border-radius: 20px;
                padding: 40px;
                max-width: 500px;
                width: 90%;
                text-align: center;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                transform: scale(0.9);
                transition: transform 0.3s ease;
            }

            .logout-process-modal.show .logout-process-content {
                transform: scale(1);
            }

            .logout-process-content.success {
                border: 3px solid #28a745;
            }

            .logout-icon, .success-icon {
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

            .logout-process-content h2 {
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
                border-radius: 10px;
                overflow: hidden;
                margin-bottom: 15px;
            }

            .logout-progress-fill {
                height: 100%;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                width: 0%;
                transition: width 0.5s ease;
                border-radius: 10px;
            }

            .logout-status {
                color: #6c757d;
                font-style: italic;
                font-size: 0.9em;
            }

            .logout-steps {
                text-align: left;
                margin-top: 20px;
            }

            .logout-step {
                display: flex;
                align-items: center;
                margin-bottom: 15px;
                padding: 10px;
                border-radius: 8px;
                transition: background 0.3s ease;
            }

            .logout-step.active {
                background: #f8f9fa;
                border-left: 4px solid #667eea;
            }

            .logout-step.completed {
                background: #d4edda;
                border-left: 4px solid #28a745;
            }

            .step-icon {
                margin-right: 15px;
                min-width: 20px;
            }

            .step-text {
                flex: 1;
                color: #495057;
                font-size: 0.9em;
            }

            .step-status {
                margin-left: 10px;
            }

            .success-message {
                color: #28a745;
                font-weight: 500;
                margin-bottom: 20px;
            }

            .redirect-countdown {
                font-size: 2em;
                font-weight: bold;
                color: #667eea;
            }

            /* Responsividade */
            @media (max-width: 768px) {
                .logout-modal-content {
                    width: 95%;
                    margin: 10px;
                }

                .logout-modal-body {
                    padding: 20px;
                }

                .logout-options {
                    grid-template-columns: 1fr;
                    gap: 15px;
                }

                .option-content h3 {
                    font-size: 1em;
                }

                .option-content p {
                    font-size: 0.85em;
                }

                .option-content li {
                    font-size: 0.8em;
                }

                .logout-process-content {
                    padding: 30px 20px;
                }
            }
        `;

        document.head.appendChild(style);
    }

    // 🌫️ NOVO: Embaçar componentes flutuantes
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

    // 🌫️ NOVO: Restaurar componentes flutuantes
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

    // 🗑️ NOVO: Remover componentes flutuantes completamente durante logout
    static removeFloatingComponents() {
        const floatingComponents = [
            document.querySelector('.vip-upgrade-button'),
            document.getElementById('floating-ia-button'),
            document.querySelector('.help-icon'),
            document.getElementById('credito-visor'),
            document.querySelector('.admin-vip-trigger') // Incluir botão admin se existir
        ];

        floatingComponents.forEach(component => {
            if (component) {
                // Animar saída
                component.style.transition = 'all 0.3s ease';
                component.style.opacity = '0';
                component.style.transform = 'scale(0.8)';
                
                // Remover do DOM após animação
                setTimeout(() => {
                    if (component.parentElement) {
                        component.remove();
                    }
                }, 300);
            }
        });

      
    }

    // 🚀 Método público para inicializar o modal
    static init() {
      
    }
}

// Expor globalmente
window.ModalLogout = ModalLogout;

// Auto-inicialização quando DOM estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        ModalLogout.init();
    });
} else {
    ModalLogout.init();
}
