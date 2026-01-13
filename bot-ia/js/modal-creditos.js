// js/modal-creditos.js
// Sistema centralizado de modais para gerenciamento de créditos
// O SISTEMA DEVE SER 100% ISOLADO POR USUARIO

class ModalCreditos {
    static modals = {};
    static isInitialized = false;
    static currentCreditsResolver = null;
    static monitoringButtonsState = {}; // State to store button states
    static pendingConfirmationCallback = null; // ✅ NOVO: Armazena callback de confirmação

    // 🎨 Estilos globais dos modais
    static addGlobalStyles() {
        if (document.getElementById('modal-creditos-styles')) return;

        const style = document.createElement('style');
        style.id = 'modal-creditos-styles';
        style.textContent = `
            .creditos-modal-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.75);
                backdrop-filter: blur(5px);
                z-index: 10000;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 20px;
                box-sizing: border-box;
                animation: fadeIn 0.3s ease;
            }

            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }

            .creditos-modal {
                background: white;
                border-radius: 15px;
                max-width: 500px;
                width: 100%;
                max-height: 90vh;
                overflow-y: auto;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                transform: scale(0.9);
                opacity: 0;
                animation: scaleIn 0.3s ease forwards;
            }

            @keyframes scaleIn {
                to {
                    transform: scale(1);
                    opacity: 1;
                }
            }

            .creditos-modal-header {
                background: linear-gradient(135deg, #ffd700, #ffed4e);
                padding: 20px;
                border-radius: 15px 15px 0 0;
                display: flex;
                justify-content: space-between;
                align-items: center;
                border-bottom: 2px solid #f0f0f0;
            }

            .creditos-modal-title {
                margin: 0;
                font-size: 1.4em;
                font-weight: bold;
                color: #000;
                display: flex;
                align-items: center;
                gap: 10px;
            }

            .creditos-modal-close {
                background: none;
                border: none;
                font-size: 1.8em;
                color: #000;
                cursor: pointer;
                width: 35px;
                height: 35px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: background 0.3s ease;
            }

            .creditos-modal-close:hover {
                background: rgba(0, 0, 0, 0.1);
            }

            .creditos-modal-body {
                padding: 25px;
            }

            .creditos-info-section {
                background: #f8f9fa;
                padding: 20px;
                border-radius: 12px;
                margin-bottom: 20px;
                border-left: 4px solid #ffd700;
            }

            .creditos-info-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 10px;
                padding: 8px 0;
                border-bottom: 1px solid #dee2e6;
            }

            .creditos-info-item:last-child {
                margin-bottom: 0;
                border-bottom: none;
            }

            .creditos-info-label {
                font-weight: 600;
                color: #495057;
            }

            .creditos-info-value {
                font-weight: bold;
                color: #28a745;
            }

            .creditos-warning {
                background: #fff3cd;
                color: #856404;
                padding: 15px;
                border-radius: 8px;
                border: 1px solid #ffeaa7;
                margin-bottom: 20px;
                display: flex;
                align-items: center;
                gap: 10px;
            }

            .creditos-error {
                background: #f8d7da;
                color: #721c24;
                padding: 15px;
                border-radius: 8px;
                border: 1px solid #f1aeb5;
                margin-bottom: 20px;
                display: flex;
                align-items: center;
                gap: 10px;
            }

            .creditos-success {
                background: #d1e7dd;
                color: #0f5132;
                padding: 15px;
                border-radius: 8px;
                border: 1px solid #badbcc;
                margin-bottom: 20px;
                display: flex;
                align-items: center;
                gap: 10px;
            }

            .creditos-modal-actions {
                display: flex;
                gap: 8px;
                margin-top: 20px;
                flex-wrap: wrap;
                justify-content: space-between;
            }

            .creditos-btn {
                padding: 12px 16px;
                border: none;
                border-radius: 8px;
                font-weight: bold;
                cursor: pointer;
                transition: all 0.3s ease;
                display: flex;
                align-items: center;
                gap: 6px;
                text-decoration: none;
                text-align: center;
                justify-content: center;
                min-width: 100px;
                flex: 1;
                font-size: 0.9em;
            }

            .creditos-btn-primary {
                background: linear-gradient(135deg, #ffd700, #ffed4e);
                color: #000;
            }

            .creditos-btn-primary:hover {
                background: linear-gradient(135deg, #ffed4e, #ffc107);
                transform: translateY(-1px);
                box-shadow: 0 4px 12px rgba(255, 215, 0, 0.3);
            }

            .creditos-btn-secondary {
                background: #6c757d;
                color: white;
            }

            .creditos-btn-secondary:hover {
                background: #545b62;
                transform: translateY(-1px);
            }

            .creditos-btn-danger {
                background: #dc3545;
                color: white;
            }

            .creditos-btn-danger:hover {
                background: #c82333;
                transform: translateY(-1px);
            }

            .creditos-cost-display {
                background: #e3f2fd;
                padding: 15px;
                border-radius: 8px;
                border: 2px solid #90caf9;
                margin: 15px 0;
                text-align: center;
            }

            .creditos-cost-amount {
                font-size: 1.5em;
                font-weight: bold;
                color: #1976d2;
                margin-bottom: 5px;
            }

            .creditos-cost-description {
                color: #666;
                font-size: 0.9em;
            }

            .creditos-progress-bar {
                background: #e9ecef;
                border-radius: 10px;
                height: 8px;
                overflow: hidden;
                margin: 10px 0;
            }

            .creditos-progress-fill {
                background: linear-gradient(135deg, #28a745, #20c997);
                height: 100%;
                border-radius: 10px;
                transition: width 0.3s ease;
            }

            /* Estilos para o modal de sucesso de ativação admin */
            .modal-header.success {
                background: linear-gradient(135deg, #28a745, #20c997);
                color: white;
            }

            .modal-header.success h3 {
                color: white;
            }

            .success-icon {
                font-size: 3em;
                color: #28a745;
                text-align: center;
                margin-bottom: 15px;
            }

            .success-message h4 {
                color: #0f5132;
                text-align: center;
                margin-bottom: 5px;
            }

            .success-message p {
                color: #666;
                text-align: center;
                font-size: 0.95em;
                margin-bottom: 15px;
            }

            .credits-display {
                text-align: center;
                background: #e3f2fd;
                padding: 12px;
                border-radius: 8px;
                margin: 15px auto;
                max-width: 250px;
            }

            .credits-count {
                font-size: 1.8em;
                font-weight: bold;
                color: #1976d2;
                margin-right: 8px;
            }

            .credits-label {
                font-size: 1.1em;
                color: #0f5132;
                font-weight: bold;
            }

            .success-note {
                font-size: 0.9em;
                color: #555;
                margin-top: 10px;
                text-align: left;
            }

            .benefits-list {
                list-style: none;
                padding: 0;
                margin: 10px 0;
                color: #333;
                font-size: 0.9em;
            }

            .benefits-list li {
                margin-bottom: 6px;
                display: flex;
                align-items: center;
                gap: 8px;
            }

            .benefits-list li::before {
                content: '•';
                color: #28a745;
                font-weight: bold;
            }

            .modal-footer {
                display: flex;
                justify-content: center;
                padding: 20px;
                border-top: 1px solid #eee;
            }

            .btn-primary {
                padding: 12px 25px;
                background: linear-gradient(135deg, #ffd700, #ffed4e);
                color: #000;
                border: none;
                border-radius: 8px;
                font-weight: bold;
                cursor: pointer;
                font-size: 1em;
                transition: all 0.3s ease;
            }

            .btn-primary:hover {
                background: linear-gradient(135deg, #ffed4e, #ffc107);
                transform: translateY(-1px);
                box-shadow: 0 4px 12px rgba(255, 215, 0, 0.3);
            }

            @media (max-width: 768px) {
                .creditos-modal-overlay {
                    padding: 10px;
                }

                .creditos-modal {
                    max-width: 95vw;
                }

                .creditos-modal-actions {
                    flex-direction: column;
                }

                .creditos-btn {
                    width: 100%;
                }

                .credits-display {
                    max-width: 100%;
                }
            }
        `;
        document.head.appendChild(style);
    }

    // 🚀 Inicializar sistema de modais
    static init() {
        if (this.isInitialized) return;

        this.addGlobalStyles();
        this.isInitialized = true;

        // Adicionar listener para fechar modais com ESC
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && Object.keys(this.modals).length > 0) {
                // Fechar o modal mais recente
                const latestModalId = Object.keys(this.modals).pop();
                this.hideModal(latestModalId);
                this.restoreMonitoringButtonsState(); // Restaura estado dos botões ao fechar com ESC
            }
        });

        // Escutar eventos de mudança de créditos
        window.addEventListener('creditsUpdated', (event) => {
            // ✅ CORREÇÃO: Apenas mostrar modal de admin se aplicável
            // updateCreditsDisplay removido pois não é usado nesta classe

            // Se foi uma ativação por admin, mostrar modal especial
            if (event.detail.source === 'admin_activation') {
                setTimeout(() => {
                    this.showAdminActivationSuccess(event.detail.credits);
                }, 1000);
            }
        });
    }

    // 📱 Modal: Créditos Insuficientes
    static showCreditosInsuficientes(creditosNecessarios, creditosAtuais, funcionalidade) {
        this.init();
        this.saveMonitoringButtonsState(); // Salva estado atual dos botões

        // 🛑 PARAR MONITORAMENTO automaticamente quando detectar saldo insuficiente
        if (typeof MonitoringView !== 'undefined' && MonitoringView.state !== 'IDLE') {
        
            MonitoringView.stopMonitoring();
        }

        const modalId = 'creditos-insuficientes';
        this.hideModal(modalId); // Remover modal anterior se existir

        const userInfo = UserLevelsManager.getUserInfo();
        const deficit = creditosNecessarios - creditosAtuais;

        const overlay = document.createElement('div');
        overlay.className = 'creditos-modal-overlay';
        overlay.id = `modal-${modalId}`;

        overlay.innerHTML = `
            <div class="creditos-modal">
                <div class="creditos-modal-header">
                    <h3 class="creditos-modal-title">
                        💳 Créditos Insuficientes
                    </h3>
                    <button class="creditos-modal-close" onclick="ModalCreditos.hideModal('${modalId}'); ModalCreditos.restoreMonitoringButtonsState()">×</button>
                </div>
                <div class="creditos-modal-body">
                    <div class="creditos-error">
                        <span>⚠️</span>
                        <div>
                            <strong>Não foi possível executar: ${funcionalidade}</strong><br>
                            Você não tem créditos suficientes para esta ação.
                        </div>
                    </div>

                    <div class="creditos-info-section">
                        <div class="creditos-info-item">
                            <span class="creditos-info-label">Créditos necessários:</span>
                            <span class="creditos-info-value">${creditosNecessarios}</span>
                        </div>
                        <div class="creditos-info-item">
                            <span class="creditos-info-label">Seus créditos atuais:</span>
                            <span class="creditos-info-value">${creditosAtuais}</span>
                        </div>
                        <div class="creditos-info-item">
                            <span class="creditos-info-label">Déficit:</span>
                            <span class="creditos-info-value" style="color: #dc3545;">-${deficit}</span>
                        </div>
                    </div>

                    <div class="creditos-cost-display">
                        <div class="creditos-cost-amount">💰 Adquira mais créditos</div>
                        <div class="creditos-cost-description">
                            Nosso plano básico oferece 10 créditos por R$ 29,90
                        </div>
                    </div>

                    <div class="creditos-modal-actions">
                        <button class="creditos-btn creditos-btn-primary" onclick="ModalCreditos.hideModal('${modalId}'); if(typeof VipPaymentModal !== 'undefined') VipPaymentModal.show(); ModalCreditos.restoreMonitoringButtonsState()">
                            💎 Comprar Créditos
                        </button>
                        <button class="creditos-btn creditos-btn-secondary" onclick="ModalCreditos.hideModal('${modalId}'); ModalCreditos.restoreMonitoringButtonsState()">
                            Fechar
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);
        this.modals[modalId] = overlay;

        // Auto-fechar após 15 segundos
        setTimeout(() => {
            this.hideModal(modalId);
            this.restoreMonitoringButtonsState(); // Restaura estado dos botões ao auto-fechar
        }, 15000);

    }

    // 🎉 Mostrar modal de bônus de boas-vindas concedido
    static showBonusRececebido(creditosConcedidos) {
        this.init();
        this.saveMonitoringButtonsState(); // Salva estado atual dos botões

        const modalId = 'bonus-recebido';
        this.hideModal(modalId);

        const overlay = document.createElement('div');
        overlay.className = 'creditos-modal-overlay';
        overlay.id = `modal-${modalId}`;

        overlay.innerHTML = `
            <div class="creditos-modal">
                <div class="creditos-modal-header">
                    <h3 class="creditos-modal-title">
                        🎉 Bônus de Boas-vindas!
                    </h3>
                    <button class="creditos-modal-close" onclick="ModalCreditos.hideModal('${modalId}'); ModalCreditos.restoreMonitoringButtonsState()">×</button>
                </div>
                <div class="creditos-modal-body">
                    <div class="creditos-success">
                        <span>🎁</span>
                        <div>
                            <strong>Parabéns! Você recebeu créditos grátis!</strong><br>
                            Bem-vindo ao nosso sistema VIP.
                        </div>
                    </div>

                    <div class="creditos-cost-display">
                        <div class="creditos-cost-amount">+${creditosConcedidos} Créditos</div>
                        <div class="creditos-cost-description">
                            Créditos adicionados à sua conta automaticamente
                        </div>
                    </div>

                    <div class="creditos-info-section">
                        <div style="text-align: center; margin-bottom: 15px;">
                            <strong>🤖 O que você pode fazer com seus créditos:</strong>
                        </div>
                        <div style="margin-bottom: 8px;">• Traduzir estratégias com IA (1 crédito)</div>
                        <div style="margin-bottom: 8px;">• Usar botão de análise IA (3 créditos)</div>
                        <div style="margin-bottom: 8px;">• Acessar recursos VIP premium</div>
                    </div>

                    <div class="creditos-modal-actions">
                        <button class="creditos-btn creditos-btn-primary" onclick="ModalCreditos.hideModal('${modalId}'); ModalCreditos.restoreMonitoringButtonsState()">
                            ✨ Começar a Usar!
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);
        this.modals[modalId] = overlay;


    }

    // 💸 Modal: Confirmação de Gasto de Créditos
    static async showConfirmacaoGasto(funcionalidade, custoCreditos, callback) {
        this.init();
        this.saveMonitoringButtonsState(); // Salva estado atual dos botões

        // ✅ CORREÇÃO CRÍTICA: Armazenar callback em variável estática
        this.pendingConfirmationCallback = callback;

        const modalId = 'confirmacao-gasto';
        this.hideModal(modalId);

        const creditosAtuais = await CreditsManager.getCurrentCredits();
        const creditosRestantes = creditosAtuais - custoCreditos;

        const overlay = document.createElement('div');
        overlay.className = 'creditos-modal-overlay';
        overlay.id = `modal-${modalId}`;

        overlay.innerHTML = `
            <div class="creditos-modal">
                <div class="creditos-modal-header">
                    <h3 class="creditos-modal-title">
                        💰 Confirmar Uso de Créditos
                    </h3>
                    <button class="creditos-modal-close" onclick="ModalCreditos.cancelarGasto('${modalId}')">×</button>
                </div>
                <div class="creditos-modal-body">
                    <div class="creditos-warning">
                        <span>💡</span>
                        <div>
                            <strong>Esta função consome créditos!</strong><br>
                            Deseja continuar com: ${funcionalidade}?
                        </div>
                    </div>

                    <div class="creditos-cost-display">
                        <div class="creditos-cost-amount">-${custoCreditos} Créditos</div>
                        <div class="creditos-cost-description">${funcionalidade}</div>
                    </div>

                    <div class="creditos-info-section">
                        <div class="creditos-info-item">
                            <span class="creditos-info-label">Seus créditos atuais:</span>
                            <span class="creditos-info-value">${creditosAtuais}</span>
                        </div>
                        <div class="creditos-info-item">
                            <span class="creditos-info-label">Após esta ação:</span>
                            <span class="creditos-info-value" style="color: ${creditosRestantes > 0 ? '#28a745' : '#dc3545'}">${creditosRestantes}</span>
                        </div>
                    </div>

                    <div class="creditos-progress-bar">
                        <div class="creditos-progress-fill" style="width: ${(creditosRestantes / creditosAtuais) * 100}%"></div>
                    </div>

                    <div class="creditos-modal-actions">
                        <button class="creditos-btn creditos-btn-primary" onclick="ModalCreditos.confirmarGasto('${modalId}')">
                            ✅ Confirmar e Gastar
                        </button>
                        <button class="creditos-btn creditos-btn-secondary" onclick="ModalCreditos.cancelarGasto('${modalId}')">
                            ❌ Cancelar
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);
        this.modals[modalId] = overlay;

    }

    // 😔 Modal: Créditos Esgotados
    static showCreditosEsgotados() {
        this.init();
        this.saveMonitoringButtonsState(); // Salva estado atual dos botões

        // 🛑 PARAR MONITORAMENTO automaticamente quando créditos esgotarem
        if (typeof MonitoringView !== 'undefined' && MonitoringView.state !== 'IDLE') {
        
            MonitoringView.stopMonitoring();
        }

        const modalId = 'creditos-esgotados';
        this.hideModal(modalId);

        const overlay = document.createElement('div');
        overlay.className = 'creditos-modal-overlay';
        overlay.id = `modal-${modalId}`;

        overlay.innerHTML = `
            <div class="creditos-modal">
                <div class="creditos-modal-header">
                    <h3 class="creditos-modal-title">
                        💳 Créditos Esgotados
                    </h3>
                    <button class="creditos-modal-close" onclick="ModalCreditos.hideModal('${modalId}'); ModalCreditos.restoreMonitoringButtonsState()">×</button>
                </div>
                <div class="creditos-modal-body">
                    <div class="creditos-error">
                        <span>😔</span>
                        <div>
                            <strong>Seus créditos acabaram!</strong><br>
                            Você foi convertido para usuário FREE.
                        </div>
                    </div>

                    <div style="text-align: center; margin: 20px 0;">
                        <div style="font-size: 4em; margin-bottom: 10px;">📱</div>
                        <p>Adquira mais créditos para continuar usando os recursos VIP!</p>
                    </div>

                    <div class="creditos-info-section">
                        <div style="text-align: center; margin-bottom: 15px;">
                            <strong>💎 Recursos VIP disponíveis:</strong>
                        </div>
                        <div style="margin-bottom: 8px;">• Sistema de IA avançado</div>
                        <div style="margin-bottom: 8px;">• Análises automáticas</div>
                        <div style="margin-bottom: 8px;">• Rodapé VIP premium</div>
                        <div style="margin-bottom: 8px;">• Suporte prioritário</div>
                    </div>

                    <div class="creditos-modal-actions">
                        <button class="creditos-btn creditos-btn-primary" onclick="ModalCreditos.hideModal('${modalId}'); if(typeof VipPaymentModal !== 'undefined') VipPaymentModal.show(); ModalCreditos.restoreMonitoringButtonsState()">
                            💎 Comprar Créditos
                        </button>
                        <button class="creditos-btn creditos-btn-secondary" onclick="ModalCreditos.hideModal('${modalId}'); ModalCreditos.restoreMonitoringButtonsState()">
                            Continuar como FREE
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);
        this.modals[modalId] = overlay;

        // Auto-fechar após 20 segundos
        setTimeout(() => {
            this.hideModal(modalId);
            this.restoreMonitoringButtonsState(); // Restaura estado dos botões ao auto-fechar
        }, 20000);

     
    }

    // 🎯 Modal: Recurso Premium (para usuários FREE)
    static showRecursoPremium(nomeRecurso, descricao = '') {
        this.init();
        this.saveMonitoringButtonsState(); // Salva estado atual dos botões

        const modalId = 'recurso-premium';
        this.hideModal(modalId);

        const overlay = document.createElement('div');
        overlay.className = 'creditos-modal-overlay';
        overlay.id = `modal-${modalId}`;

        overlay.innerHTML = `
            <div class="creditos-modal">
                <div class="creditos-modal-header">
                    <h3 class="creditos-modal-title">
                        🔒 Recurso Premium
                    </h3>
                    <button class="creditos-modal-close" onclick="ModalCreditos.hideModal('${modalId}'); ModalCreditos.restoreMonitoringButtonsState()">×</button>
                </div>
                <div class="creditos-modal-body">
                    <div class="creditos-warning">
                        <span>💎</span>
                        <div>
                            <strong>${nomeRecurso}</strong><br>
                            ${descricao || 'Este recurso está disponível apenas para usuários VIP.'}
                        </div>
                    </div>

                    <div style="text-align: center; margin: 20px 0;">
                        <div style="font-size: 3em; margin-bottom: 10px;">⭐</div>
                        <p>Upgrade para VIP e tenha acesso completo!</p>
                    </div>

                    <div class="creditos-info-section">
                        <div style="text-align: center; margin-bottom: 15px;">
                            <strong>Para usuários FREE, você pode:</strong>
                        </div>
                        <div style="margin-bottom: 8px; color: #28a745;">✅ Usar regras JSON já existentes no histórico</div>
                        <div style="margin-bottom: 8px; color: #28a745;">✅ Inserir código JSON manualmente</div>
                        <div style="margin-bottom: 8px; color: #28a745;">✅ Funcionalidades básicas do sistema</div>
                    </div>

                    <div class="creditos-cost-display">
                        <div class="creditos-cost-amount">R$ 29,90</div>
                        <div class="creditos-cost-description">
                            Plano BASIC - 10 Créditos + Rodapé VIP
                        </div>
                    </div>

                    <div class="creditos-modal-actions">
                        <button class="creditos-btn creditos-btn-primary" onclick="ModalCreditos.hideModal('${modalId}'); if(typeof VipPaymentModal !== 'undefined') VipPaymentModal.show(); ModalCreditos.restoreMonitoringButtonsState()">
                            💎 Upgrade para VIP
                        </button>
                        <button class="creditos-btn creditos-btn-secondary" onclick="ModalCreditos.hideModal('${modalId}'); ModalCreditos.restoreMonitoringButtonsState()">
                            Entendi
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);
        this.modals[modalId] = overlay;

       
    }

    // 💰 Modal: Confirmação de Gasto de Créditos (Promise-based)
    static showCreditsConfirmationModal() {
       
        this.saveMonitoringButtonsState(); // Salva estado atual dos botões
        return new Promise((resolve) => {
            this.init();

            const modalId = 'confirmacao-creditos-promise';
            this.hideModal(modalId);

            const overlay = document.createElement('div');
            overlay.className = 'creditos-modal-overlay';
            overlay.id = `modal-${modalId}`;

            overlay.innerHTML = `
                <div class="creditos-modal">
                    <div class="creditos-modal-header">
                        <h3 class="creditos-modal-title">
                            💰 Confirmar Uso de Créditos
                        </h3>
                        <button class="creditos-modal-close" onclick="ModalCreditos.hideModal('${modalId}'); ModalCreditos.resolveCreditsModal(false); ModalCreditos.restoreMonitoringButtonsState()">×</button>
                    </div>
                    <div class="creditos-modal-body">
                        <div class="creditos-warning">
                            <span>💡</span>
                            <div>
                                <strong>Esta função consome créditos!</strong><br>
                                Deseja continuar com a tradução da estratégia usando IA Gemini?
                            </div>
                        </div>

                        <div class="creditos-cost-display">
                            <div class="creditos-cost-amount">-1 Crédito</div>
                            <div class="creditos-cost-description">Sistema de IA Avançada</div>
                        </div>

                        <div class="creditos-info-section">
                            <div style="text-align: center; margin-bottom: 15px;">
                                <strong>⚡ Esta operação irá:</strong>
                            </div>
                            <div style="margin-bottom: 8px;">• Analisar sua estratégia com IA avançada</div>
                            <div style="margin-bottom: 8px;">• Gerar regras estruturadas automaticamente</div>
                            <div style="margin-bottom: 8px;">• Salvar no histórico para reutilização</div>
                        </div>

                        <div class="creditos-modal-actions">
                            <button class="creditos-btn creditos-btn-primary" onclick="ModalCreditos.hideModal('${modalId}'); ModalCreditos.resolveCreditsModal(true); ModalCreditos.restoreMonitoringButtonsState()">
                                ✅ Confirmar e Gastar
                            </button>
                            <button class="creditos-btn creditos-btn-secondary" onclick="ModalCreditos.hideModal('${modalId}'); ModalCreditos.loadFileFromModal(); ModalCreditos.restoreMonitoringButtonsState()" style="background: #17a2b8; color: white;">
                                📁 Carregar Arquivo
                            </button>
                            <button class="creditos-btn creditos-btn-secondary" onclick="ModalCreditos.hideModal('${modalId}'); ModalCreditos.resolveCreditsModal(false); ModalCreditos.restoreMonitoringButtonsState()">
                                ❌ Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            `;

            document.body.appendChild(overlay);
            this.modals[modalId] = overlay;

            // Armazenar o resolver para uso posterior
            this.currentCreditsResolver = resolve;

        });
    }

    // Resolver a Promise do modal de créditos
    static resolveCreditsModal(confirmed) {
        if (confirmed && this.currentCreditsResolver) {
            // ❌ REMOVIDO: Download automático
            // O usuário pode fazer download manual pelo botão no histórico de regras
            try {
                const strategyTextArea = document.getElementById('strategy-text');
                if (strategyTextArea && strategyTextArea.value.trim()) {
                    // ✅ Apenas log - sem download automático
                  
                    // Mostrar feedback informativo (sem download)
                    setTimeout(() => {
                        const feedback = document.createElement('div');
                        feedback.style.cssText = `
                            position: fixed;
                            top: 20px;
                            right: 20px;
                            background: #17a2b8;
                            color: white;
                            padding: 15px 20px;
                            border-radius: 8px;
                            font-weight: bold;
                            z-index: 10001;
                            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
                        `;
                        feedback.textContent = `💾 Regra salva! Use o histórico 📋 para fazer download`;
                        document.body.appendChild(feedback);

                        setTimeout(() => feedback.remove(), 3000);
                    }, 500);
                }
            } catch (error) {
                console.error('❌ [MODAL CREDITOS] Erro ao processar feedback:', error);
            }
        }

        if (this.currentCreditsResolver) {
            this.currentCreditsResolver(confirmed);
            this.currentCreditsResolver = null;
        }
    }

    // 🔧 Confirmar gasto de créditos
    static confirmarGasto(modalId) {
        this.hideModal(modalId);
        this.restoreMonitoringButtonsState(); // Restaura estado dos botões após confirmação

     
        // ✅ CORREÇÃO CRÍTICA: Executar callback armazenado
        if (typeof this.pendingConfirmationCallback === 'function') {
          
            this.pendingConfirmationCallback();
            this.pendingConfirmationCallback = null; // Limpar após usar
        } else {
            console.warn('⚠️ [MODAL] Nenhum callback pendente encontrado');
        }
    }

    // ❌ Cancelar gasto de créditos
    static cancelarGasto(modalId) {
        this.hideModal(modalId);
        this.restoreMonitoringButtonsState(); // Restaura estado dos botões após cancelamento

    
        // Limpar callback pendente
        this.pendingConfirmationCallback = null;
    }

    // ❌ Fechar modal específico
    static hideModal(modalId) {
        const modal = this.modals[modalId] || document.getElementById(`modal-${modalId}`);
        if (modal) {
            modal.remove();
            delete this.modals[modalId];
        }
    }

    // 🧹 Fechar todos os modais
    static hideAllModals() {
        Object.keys(this.modals).forEach(modalId => {
            this.hideModal(modalId);
        });

        // Fallback: remover qualquer modal órfão
        const orphanModals = document.querySelectorAll('.creditos-modal-overlay');
        orphanModals.forEach(modal => modal.remove());
        this.restoreMonitoringButtonsState(); // Restaura estado dos botões ao fechar todos
    }

    // 📊 Verificar se algum modal está aberto
    static hasOpenModal() {
        return Object.keys(this.modals).length > 0;
    }

    // 📁 Carregar arquivo do modal de créditos
    static loadFileFromModal() {
        // Usar o sistema existente do RulesHistoryManager
        if (window.rulesHistoryManager && typeof window.rulesHistoryManager.loadFilesDirectly === 'function') {
            window.rulesHistoryManager.loadFilesDirectly();
        } else {
            console.error('❌ [MODAL CREDITOS] RulesHistoryManager não disponível');
            alert('Sistema de carregamento de arquivos não disponível no momento.');
        }
    }

    // 📥 Download automático com nome fixo e numeração
    static downloadStrategyFile(jsonData) {
        try {
            const baseFileName = 'STRATEGY_FREE';
            const extension = '.json';
            let fileName = baseFileName + extension;
            let counter = 1;

            // Simular verificação de arquivo existente usando timestamp para uniqueness
            const timestamp = Date.now();
            const randomSuffix = Math.floor(Math.random() * 1000);

            // Se precisar numerar (simulação baseada em probabilidade de conflito)
            if (Math.random() > 0.7) { // 30% chance de usar numeração
                fileName = `${baseFileName}(${counter + randomSuffix})${extension}`;
            }

            const jsonString = JSON.stringify(jsonData, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });

            // 🔧 CORREÇÃO: Usar URL do objeto temporário e forçar download
            if (window.navigator && window.navigator.msSaveOrOpenBlob) {
                // Para Internet Explorer
                window.navigator.msSaveOrOpenBlob(blob, fileName);
            } else {
                // Para navegadores modernos - forçar download direto
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');

                // 🎯 CORREÇÃO CRÍTICA: Configurações para download automático
                link.href = url;
                link.download = fileName;
                link.style.display = 'none';
                link.style.visibility = 'hidden';
                link.style.position = 'absolute';
                link.style.left = '-9999px';

                // 🚀 FORÇAR atributos para evitar diálogo
                link.setAttribute('download', fileName);
                link.setAttribute('target', '_blank');

                document.body.appendChild(link);

                // 🚀 DISPARAR download com diferentes métodos
                try {
                    link.click();
                } catch (clickError) {
                    // Fallback: usar dispatchEvent
                    const clickEvent = new MouseEvent('click', {
                        bubbles: true,
                        cancelable: true,
                        view: window
                    });
                    link.dispatchEvent(clickEvent);
                }

                // Limpar após um pequeno delay
                setTimeout(() => {
                    document.body.removeChild(link);
                    URL.revokeObjectURL(url);
                }, 100);
            }


            return fileName;

        } catch (error) {
            console.error('❌ [MODAL CREDITOS] Erro no download automático:', error);

            // 🛡️ FALLBACK: Se falhar, tentar método alternativo
            try {
                const jsonString = JSON.stringify(jsonData, null, 2);
                const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(jsonString);
                const link = document.createElement('a');
                link.href = dataUri;
                link.download = 'STRATEGY_FREE.json';
                link.click();
              
                return 'STRATEGY_FREE.json';
            } catch (fallbackError) {
                console.error('❌ [MODAL CREDITOS] Erro no fallback:', fallbackError);
                throw error;
            }
        }
    }

    // 💾 Salva o estado atual dos botões de monitoramento
    static saveMonitoringButtonsState() {
        const startButton = document.getElementById('btn-iniciar-monitoramento');
        const stopButton = document.getElementById('btn-parar-monitoramento');

        if (startButton) {
            this.monitoringButtonsState.startButtonDisabled = startButton.disabled;
            this.monitoringButtonsState.startButtonText = startButton.textContent;
        }
        if (stopButton) {
            this.monitoringButtonsState.stopButtonDisabled = stopButton.disabled;
            this.monitoringButtonsState.stopButtonText = stopButton.textContent;
        }

    }

    // 🔄 Restaura o estado dos botões de monitoramento
    static restoreMonitoringButtonsState() {
        const startButton = document.getElementById('btn-iniciar-monitoramento');
        const stopButton = document.getElementById('btn-parar-monitoramento');

        if (startButton && typeof this.monitoringButtonsState.startButtonDisabled !== 'undefined') {
            startButton.disabled = this.monitoringButtonsState.startButtonDisabled;
            if (this.monitoringButtonsState.startButtonText) {
                startButton.textContent = this.monitoringButtonsState.startButtonText;
            }
        }
        if (stopButton && typeof this.monitoringButtonsState.stopButtonDisabled !== 'undefined') {
            stopButton.disabled = this.monitoringButtonsState.stopButtonDisabled;
            if (this.monitoringButtonsState.stopButtonText) {
                stopButton.textContent = this.monitoringButtonsState.stopButtonText;
            }
        }

        // Limpa o estado salvo após restauração
        this.monitoringButtonsState = {};
    }

    // Helper para mostrar modais genéricos
    static showModal(modalId, htmlContent) {
        this.init();
        this.saveMonitoringButtonsState(); // Salva estado dos botões

        this.hideModal(modalId); // Remove modal anterior se existir

        const overlay = document.createElement('div');
        overlay.className = 'creditos-modal-overlay';
        overlay.id = `modal-${modalId}`;

        overlay.innerHTML = `
            <div class="creditos-modal">
                ${htmlContent}
            </div>
        `;

        document.body.appendChild(overlay);
        this.modals[modalId] = overlay;

    }

    // 🎉 Mostrar modal de ativação por admin
    static showAdminActivationSuccess(credits) {
        this.showModal('admin-activation-success', `
            <div class="modal-header success">
                <h3>🎉 VIP Ativado com Sucesso!</h3>
                <button class="modal-close" onclick="ModalCreditos.hideModal('admin-activation-success')">×</button>
            </div>
            <div class="modal-body">
                <div class="success-icon">✅</div>
                <div class="success-message">
                    <h4>Seu pagamento foi confirmado!</h4>
                    <p>Seu plano VIP foi ativado automaticamente pelo administrador.</p>
                    <div class="credits-display">
                        <span class="credits-count">${credits}</span>
                        <span class="credits-label">créditos disponíveis</span>
                    </div>
                    <p class="success-note">
                        Agora você tem acesso a todos os recursos VIP, incluindo:
                    </p>
                    <ul class="benefits-list">
                        <li>🤖 Sistema de IA avançada</li>
                        <li>📊 Analytics detalhados</li>
                        <li>🎨 Rodapé VIP personalizado</li>
                        <li>💰 Sistema flexível por créditos</li>
                    </ul>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn-primary" onclick="ModalCreditos.hideModal('admin-activation-success')">
                    Começar a usar VIP
                </button>
            </div>
        `);
    }
}

// 🚀 Auto-inicializar quando DOM estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => ModalCreditos.init());
} else {
    ModalCreditos.init();
}

// 🌐 Exportar para uso global
window.ModalCreditos = ModalCreditos;