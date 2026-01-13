// js/vip-payment-modal.js
// Modal de pagamento VIP com Mercado Pago
// O SISTEMA DEVE SER 100% ISOLADO POR USUARIO

// Verificar se a classe já foi declarada para evitar erro de redeclaração
if (typeof VipPaymentModal === 'undefined') {
    window.VipPaymentModal = class {
        static modal = null;
        static isVisible = false;

        // 💳 Planos disponíveis - Sistema de Créditos
        static PLANS = {
            basic: {
                name: 'BASIC',
                price: 29.90,
                credits: 10,
                description: 'Rodapé VIP + 10 Créditos',
                savings: null,
                popular: false
            },
            trade: {
                name: 'TRADE',
                price: 59.90,
                credits: 30,
                description: 'Rodapé VIP + 30 Créditos',
                savings: 'Economize R$ 29,80',
                popular: true
            },
            pro: {
                name: 'PRO',
                price: 99.90,
                credits: 60,
                description: 'Rodapé VIP + 60 Créditos',
                savings: 'Economize R$ 79,60',
                popular: false
            }
        };

        // 🎁 Benefícios VIP
        static VIP_BENEFITS = [
            '🎨 Rodapé VIP Premium',
            '🤖 Acesso ao sistema de IA',
            '📊 Analytics avançado',
            '💰 Sistema por créditos flexível'
        ];

        // 📱 Mostrar modal
        static show() {
            if (this.isVisible) return;

            this.createModal();
            this.isVisible = true;
            document.body.style.overflow = 'hidden'; // Prevenir scroll

        }

        // ❌ Fechar modal
        static hide() {
            if (this.modal) {
                this.modal.remove();
                this.modal = null;
            }
            this.isVisible = false;
            document.body.style.overflow = ''; // Restaurar scroll

        }

        // 🏗️ Criar estrutura do modal
        static createModal() {
            // Remover modal existente se houver
            if (this.modal) {
                this.modal.remove();
            }

            this.modal = document.createElement('div');
            this.modal.className = 'vip-payment-modal';
            this.modal.innerHTML = this.getModalHTML();

            // Adicionar estilos
            this.addModalStyles();

            // Adicionar event listeners
            this.addEventListeners();

            document.body.appendChild(this.modal);

            // Carregar créditos atuais
            this.loadCurrentCredits();

            // Animação de entrada
            setTimeout(() => {
                this.modal.querySelector('.modal-content').style.transform = 'scale(1)';
                this.modal.querySelector('.modal-content').style.opacity = '1';
            }, 10);
        }

        // 📝 HTML do modal
        static getModalHTML() {
            const userInfo = UserLevelsManager.getUserInfo();
            const currentLevel = UserLevelsManager.getCurrentUserLevel();
            const planCards = Object.entries(this.PLANS).map(([key, plan]) =>
                this.createPlanCard(key, plan)
            ).join('');

            // 🎨 Definir badge baseado no nível atual
            let levelBadge = '';
            if (currentLevel === UserLevelsManager.USER_LEVELS.ADMIN) {
                levelBadge = '<span class="level-badge admin">👑 ADMIN</span>';
            } else if (currentLevel === UserLevelsManager.USER_LEVELS.VIP) {
                levelBadge = '<span class="level-badge vip">💎 VIP</span>';
            } else {
                levelBadge = '<span class="level-badge free">🆓 FREE</span>';
            }

            return `
            <div class="modal-backdrop" onclick="VipPaymentModal.hide()"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h2>💰 Créditos</h2>
                    <button class="close-btn" onclick="VipPaymentModal.hide()">×</button>
                </div>

                <div class="modal-body">
                    <div class="user-info-section user-info-centered">
                        <p><strong>Conta:</strong> ${userInfo?.loginId || 'Não identificada'}</p>
                        <p><strong>Créditos:</strong> <span id="current-credits-display">Carregando...</span></p>
                    </div>

                    <div class="benefits-section">
                        <div class="benefits-grid">
                            <div class="benefit-item">🎯 Mais bots criados</div>
                            <div class="benefit-item">🤖 Mais acesso a IA Strategy</div>
                        </div>
                    </div>

                    <div class="plans-section">
                        <div class="plans-grid">
                            ${planCards}
                        </div>
                    </div>

                    <div class="payment-section" id="payment-section" style="display: none;">
                        <h3>💳 Dados para pagamento</h3>
                        <div class="payment-info">
                            <div class="mercadopago-info">
                                <h4>📱 PIX - Mercado Pago</h4>
                                <p><strong>Chave PIX:</strong> <code id="pix-key">(24)988528918</code></p>
                                <button onclick="VipPaymentModal.copyPixKey()" class="copy-btn">📋 Copiar PIX</button>

                                <div class="payment-instructions">
                                    <h5>📋 Instruções:</h5>
                                    <ol>
                                        <li>Copie a chave PIX acima</li>
                                        <li>Abra seu app do banco</li>
                                        <li>Faça o PIX com o valor exato do plano</li>
                                        <li>Envie o comprovante no WhatsApp: <strong>(24) 988528918</strong></li>
                                        <li>Seu VIP será ativado em até 24h</li>
                                    </ol>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="modal-footer">
                    <p class="security-note">🔒 Pagamento 100% seguro via Mercado Pago</p>
                </div>
            </div>
        `;
        }

        // 💳 Criar card de plano
        static createPlanCard(planKey, plan) {
            const isPopular = plan.popular;

            return `
            <div class="plan-card ${isPopular ? 'popular' : ''}" data-plan="${planKey}">
                ${isPopular ? '<div class="popular-badge">⭐ MAIS POPULAR</div>' : ''}
                <h4>${plan.name}</h4>
                <div class="price">
                    <span class="currency">R$</span>
                    <span class="amount">${plan.price.toFixed(2)}</span>
                </div>
                <div class="credits">💰 ${plan.credits} Créditos</div>
                ${plan.savings ? `<div class="savings">${plan.savings}</div>` : ''}
                <button class="select-plan-btn" onclick="VipPaymentModal.selectPlan('${planKey}')">
                    Escolher Crédito
                </button>
            </div>
        `;
        }

        // 🎯 Selecionar plano
        static selectPlan(planKey) {
            const plan = this.PLANS[planKey];
            if (!plan) return;

            // Remover seleção anterior
            document.querySelectorAll('.plan-card').forEach(card => {
                card.classList.remove('selected');
            });

            // Selecionar novo plano
            const selectedCard = document.querySelector(`[data-plan="${planKey}"]`);
            selectedCard.classList.add('selected');

            // Registrar pagamento pendente
            const userInfo = UserLevelsManager.getUserInfo();
            if (userInfo && userInfo.loginId && typeof VipSyncManager !== 'undefined') {
                VipSyncManager.registerPendingPayment(userInfo.loginId, planKey);
            }

            // Criar link de pagamento do Mercado Pago
            this.createMercadoPagoPayment(plan, planKey);

            // Mostrar seção de pagamento
            const paymentSection = document.getElementById('payment-section');
            paymentSection.style.display = 'block';

            // Scroll para seção de pagamento
            paymentSection.scrollIntoView({ behavior: 'smooth' });

        }

        // 💳 Criar pagamento no Mercado Pago (via backend seguro)
        static async createMercadoPagoPayment(plan, planKey) {
            try {
                const userInfo = UserLevelsManager.getUserInfo();

                if (!userInfo?.loginId) {
                    throw new Error('Usuário não autenticado');
                }

                // 🛡️ SECURITY: Criar preferência via backend (accessToken nunca exposto ao frontend)
                const response = await fetch('/api/create-payment-preference', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        planKey: planKey,
                        planName: plan.name,
                        planPrice: plan.price,
                        planCredits: plan.credits,
                        loginId: userInfo.loginId
                    })
                });

                const paymentData = await response.json();

                if (paymentData.success && paymentData.init_point) {
                    // Atualizar interface com link de pagamento
                    this.updatePaymentSection(paymentData.init_point, plan);
                } else {
                    throw new Error(paymentData.error || 'Erro ao criar link de pagamento');
                }

            } catch (error) {
                console.error('❌ [MERCADOPAGO ERROR]', error);
                // Fallback para PIX manual
                this.showPixFallback();
            }
        }

        // 🔄 Atualizar seção de pagamento com Mercado Pago
        static updatePaymentSection(paymentUrl, plan) {
            const paymentSection = document.getElementById('payment-section');
            paymentSection.innerHTML = `
            <div class="payment-header">
                <div class="payment-header-icon">💳</div>
                <h3>Finalizar Pagamento</h3>
                <div class="payment-plan-badge">${plan.name}</div>
            </div>

            <div class="payment-summary-card">
                <div class="summary-row">
                    <span class="summary-label">Plano:</span>
                    <span class="summary-value">${plan.name}</span>
                </div>
                <div class="summary-row">
                    <span class="summary-label">Créditos:</span>
                    <span class="summary-value">${plan.credits} créditos</span>
                </div>
                <div class="summary-row total-row">
                    <span class="summary-label">Total:</span>
                    <span class="summary-value">R$ ${plan.price.toFixed(2)}</span>
                </div>
            </div>

            <div class="payment-methods-container">
                <div class="payment-method-title">
                    <span class="method-icon">💰</span>
                    <span>Escolha sua forma de pagamento</span>
                </div>

                <div class="payment-options-grid">
                    <div class="payment-option primary-option" data-method="mercadopago">
                        <div class="option-header">
                            <div class="option-icon">🏪</div>
                            <div class="option-title">Mercado Pago</div>
                        </div>
                        <div class="option-features">
                            <div class="feature-item">✓ PIX, Cartão ou Boleto</div>
                            <div class="feature-item">✓ Ativação automática</div>
                            <div class="feature-item">✓ Pagamento seguro</div>
                        </div>
                        <a href="${paymentUrl}" target="_blank" class="payment-method-btn primary-btn">
                            <span class="btn-icon">🚀</span>
                            Pagar com Mercado Pago
                        </a>
                    </div>

                    <div class="payment-option secondary-option" data-method="pix">
                        <div class="option-header">
                            <div class="option-icon">📱</div>
                            <div class="option-title">PIX Direto</div>
                            <div class="option-badge recommended">Recomendado</div>
                        </div>
                        <div class="option-features">
                            <div class="feature-item">✓ PIX imediato</div>
                            <div class="feature-item">✓ Sem taxas extras</div>
                            <div class="feature-item">⏱ Ativação em até 24h</div>
                        </div>
                        <button onclick="VipPaymentModal.showPixFallback()" class="payment-method-btn secondary-btn">
                            <span class="btn-icon">📲</span>
                            Pagar com PIX
                        </button>
                    </div>
                </div>
            </div>

            <div class="payment-instructions-card">
                <div class="instructions-header">
                    <span class="instructions-icon">📋</span>
                    <span>Como funciona?</span>
                </div>
                <div class="instructions-content">
                    <div class="instruction-step">
                        <div class="step-number">1</div>
                        <div class="step-text">Escolha sua forma de pagamento preferida</div>
                    </div>
                    <div class="instruction-step">
                        <div class="step-number">2</div>
                        <div class="step-text">Complete o pagamento de forma segura</div>
                    </div>
                    <div class="instruction-step">
                        <div class="step-number">3</div>
                        <div class="step-text">Seus créditos serão ativados automaticamente</div>
                    </div>
                </div>
            </div>
        `;

            // Adicionar estilos para o novo layout
            this.addPaymentMethodStyles();
        }

        // 📱 Mostrar fallback PIX manual
        static showPixFallback() {
            const paymentSection = document.getElementById('payment-section');
            paymentSection.innerHTML = `
            <div class="payment-header pix-header">
                <div class="payment-header-icon">📱</div>
                <h3>Pagamento via PIX</h3>
                <div class="payment-status-badge pix">Direto</div>
            </div>

            <div class="pix-payment-container">
                <div class="pix-key-card">
                    <div class="pix-key-header">
                        <div class="pix-icon">🔑</div>
                        <h4>Chave PIX</h4>
                    </div>
                    <div class="pix-key-display">
                        <code id="pix-key" class="pix-key-value">(24)988528918</code>
                        <button onclick="VipPaymentModal.copyPixKey()" class="copy-pix-btn">
                            <span class="copy-icon">📋</span>
                            Copiar
                        </button>
                    </div>
                </div>

                <div class="pix-instructions-card">
                    <div class="instructions-header">
                        <span class="instructions-icon">📖</span>
                        <span>Instruções para pagamento</span>
                    </div>
                    <div class="pix-steps">
                        <div class="pix-step">
                            <div class="step-icon">1️⃣</div>
                            <div class="step-content">
                                <div class="step-title">Copie a chave PIX</div>
                                <div class="step-description">Use o botão "Copiar" acima</div>
                            </div>
                        </div>
                        <div class="pix-step">
                            <div class="step-icon">2️⃣</div>
                            <div class="step-content">
                                <div class="step-title">Abra seu app do banco</div>
                                <div class="step-description">Acesse a área PIX do seu banco</div>
                            </div>
                        </div>
                        <div class="pix-step">
                            <div class="step-icon">3️⃣</div>
                            <div class="step-content">
                                <div class="step-title">Faça a transferência</div>
                                <div class="step-description">Use o valor exato do plano escolhido</div>
                            </div>
                        </div>
                        <div class="pix-step">
                            <div class="step-icon">4️⃣</div>
                            <div class="step-content">
                                <div class="step-title">Envie o comprovante</div>
                                <div class="step-description">WhatsApp: <strong>(24) 988528918</strong></div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="pix-contact-card">
                    <div class="contact-header">
                        <span class="contact-icon">💬</span>
                        <span>Suporte</span>
                    </div>
                    <div class="contact-info">
                        <div class="contact-item">
                            <span class="contact-label">WhatsApp:</span>
                            <span class="contact-value">(24) 988528918</span>
                        </div>
                        <div class="contact-item">
                            <span class="contact-label">Ativação:</span>
                            <span class="contact-value">Em até 24 horas</span>
                        </div>
                    </div>
                </div>

                <div class="back-to-options">
                    <button onclick="VipPaymentModal.hide(); VipPaymentModal.show();" class="back-btn">
                        <span class="back-icon">←</span>
                        Voltar às opções de pagamento
                    </button>
                </div>
            </div>
        `;

            // Adicionar estilos específicos para PIX
            this.addPixStyles();
        }

        // 🎨 Adicionar estilos para métodos de pagamento
        static addPaymentMethodStyles() {
            if (document.getElementById('payment-method-styles')) return;

            const style = document.createElement('style');
            style.id = 'payment-method-styles';
            style.textContent = `
            .payment-header {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 15px;
                margin-bottom: 25px;
                padding: 20px;
                background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
                border-radius: 12px;
                border: 2px solid #dee2e6;
            }

            .payment-header-icon {
                font-size: 2em;
                background: white;
                padding: 10px;
                border-radius: 50%;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            }

            .payment-header h3 {
                margin: 0;
                color: #495057;
                font-size: 1.5em;
            }

            .payment-plan-badge {
                background: linear-gradient(135deg, #007bff, #0056b3);
                color: white;
                padding: 6px 12px;
                border-radius: 20px;
                font-size: 0.9em;
                font-weight: bold;
            }

            .payment-summary-card {
                background: white;
                border: 2px solid #e9ecef;
                border-radius: 12px;
                padding: 20px;
                margin-bottom: 25px;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
            }

            .summary-row {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 8px 0;
                border-bottom: 1px solid #f8f9fa;
            }

            .summary-row:last-child {
                border-bottom: none;
            }

            .summary-row.total-row {
                border-top: 2px solid #dee2e6;
                margin-top: 10px;
                padding-top: 15px;
                font-weight: bold;
                font-size: 1.1em;
            }

            .summary-label {
                color: #6c757d;
                font-weight: 500;
            }

            .summary-value {
                color: #495057;
                font-weight: 600;
            }

            .payment-methods-container {
                margin-bottom: 25px;
            }

            .payment-method-title {
                display: flex;
                align-items: center;
                gap: 10px;
                margin-bottom: 20px;
                font-size: 1.2em;
                font-weight: 600;
                color: #495057;
            }

            .method-icon {
                font-size: 1.3em;
            }

            .payment-options-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 20px;
            }

            .payment-option {
                background: var(--modal-input-bg);
                border: 1px solid var(--modal-border);
                border-radius: 16px;
                padding: 20px;
                transition: all 0.3s ease;
                cursor: pointer;
                position: relative;
                overflow: hidden;
            }

            .payment-option:hover {
                transform: translateY(-2px);
                box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
            }

            .payment-option.primary-option {
                border-color: var(--primary-color);
                background: var(--modal-input-bg);
            }

            .payment-option.secondary-option {
                border-color: var(--secondary-color);
                background: var(--modal-input-bg);
            }

            .option-header {
                display: flex;
                align-items: center;
                gap: 12px;
                margin-bottom: 15px;
                position: relative;
            }

            .option-icon {
                font-size: 2em;
                background: var(--modal-input-bg);
                padding: 8px;
                border-radius: 50%;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
            }

            .option-title {
                font-size: 1.3em;
                font-weight: bold;
                color: var(--modal-text);
                flex: 1;
            }

            .option-badge {
                padding: 4px 12px;
                border-radius: 15px;
                font-size: 0.8em;
                font-weight: bold;
                text-transform: uppercase;
            }

            .option-badge.recommended {
                background: #ffc107;
                color: #000;
                animation: pulse 2s infinite;
            }

            .option-badge:not(.recommended) {
                background: var(--modal-text-secondary);
                color: var(--modal-input-bg);
            }

            .option-features {
                margin-bottom: 20px;
            }

            .feature-item {
                display: flex;
                align-items: center;
                margin-bottom: 8px;
                color: var(--modal-text);
                font-size: 0.9em;
            }

            .payment-method-btn {
                width: 100%;
                padding: 15px;
                border: none;
                border-radius: 10px;
                font-weight: bold;
                font-size: 1em;
                cursor: pointer;
                transition: all 0.3s ease;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 10px;
                text-decoration: none;
            }

            .payment-method-btn.primary-btn {
                background: linear-gradient(135deg, #007bff, #0056b3);
                color: white;
                box-shadow: 0 4px 15px rgba(0, 123, 255, 0.3);
            }

            .payment-method-btn.primary-btn:hover {
                background: linear-gradient(135deg, #0056b3, #004085);
                transform: translateY(-1px);
                box-shadow: 0 6px 20px rgba(0, 123, 255, 0.4);
            }

            .payment-method-btn.secondary-btn {
                background: linear-gradient(135deg, #28a745, #1e7e34);
                color: white;
                box-shadow: 0 4px 15px rgba(40, 167, 69, 0.3);
            }

            .payment-method-btn.secondary-btn:hover {
                background: linear-gradient(135deg, #1e7e34, #155724);
                transform: translateY(-1px);
                box-shadow: 0 6px 20px rgba(40, 167, 69, 0.4);
            }

            .btn-icon {
                font-size: 1.2em;
            }

            .payment-instructions-card {
                background: var(--modal-input-bg);
                border: 1px solid var(--modal-border);
                border-radius: 12px;
                padding: 20px;
                margin-bottom: 20px;
            }

            .instructions-header {
                display: flex;
                align-items: center;
                gap: 10px;
                margin-bottom: 15px;
                font-weight: bold;
                font-size: 1.1em;
                color: var(--modal-text);
            }

            .instructions-icon {
                font-size: 1.3em;
            }

            .instructions-content {
                display: flex;
                flex-direction: column;
                gap: 12px;
            }

            .instruction-step {
                display: flex;
                align-items: center;
                gap: 15px;
                background: var(--modal-bg-dark);
                padding: 12px;
                border-radius: 8px;
                border-left: 4px solid #007bff;
            }

            .step-number {
                background: #007bff;
                color: white;
                width: 30px;
                height: 30px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: bold;
                flex-shrink: 0;
            }

            .step-text {
                color: var(--modal-text);
                font-weight: 500;
            }

            @media (max-width: 768px) {
                .payment-options-grid {
                    grid-template-columns: 1fr;
                }

                .payment-header {
                    flex-direction: column;
                    text-align: center;
                }

                .option-header {
                    flex-direction: column;
                    text-align: center;
                }
            }
        `;
            document.head.appendChild(style);
        }

        // 🎨 Adicionar estilos específicos para PIX
        static addPixStyles() {
            if (document.getElementById('pix-styles')) return;

            const style = document.createElement('style');
            style.id = 'pix-styles';
            style.textContent = `
            .payment-header.pix-header {
                background: var(--modal-input-bg);
                border-color: var(--secondary-color);
            }

            .payment-status-badge.pix {
                background: linear-gradient(135deg, #28a745, #1e7e34);
            }

            .pix-payment-container {
                display: flex;
                flex-direction: column;
                gap: 20px;
            }

            .pix-key-card {
                background: var(--modal-bg-dark);
                border: 1px solid var(--secondary-color);
                border-radius: 16px;
                padding: 25px;
                box-shadow: 0 4px 20px rgba(40, 167, 69, 0.1);
            }

            .pix-key-header {
                display: flex;
                align-items: center;
                gap: 10px;
                margin-bottom: 20px;
            }

            .pix-icon {
                font-size: 1.5em;
                background: #e8f5e9;
                padding: 8px;
                border-radius: 50%;
            }

            .pix-key-header h4 {
                margin: 0;
                color: var(--secondary-color);
                font-size: 1.3em;
            }

            .pix-key-display {
                display: flex;
                align-items: center;
                gap: 15px;
                background: var(--modal-bg-dark);
                padding: 15px;
                border-radius: 12px;
                border: 1px solid var(--modal-border);
            }

            .pix-key-value {
                flex: 1;
                background: var(--modal-input-bg);
                padding: 12px 16px;
                border-radius: 8px;
                font-family: 'Courier New', monospace;
                font-size: 1.2em;
                font-weight: bold;
                color: var(--secondary-color);
                border: 1px solid var(--modal-border);
                text-align: center;
            }

            .copy-pix-btn {
                background: linear-gradient(135deg, #28a745, #1e7e34);
                color: white;
                border: none;
                padding: 12px 20px;
                border-radius: 8px;
                font-weight: bold;
                cursor: pointer;
                display: flex;
                align-items: center;
                gap: 8px;
                transition: all 0.3s ease;
                box-shadow: 0 2px 8px rgba(40, 167, 69, 0.3);
            }

            .copy-pix-btn:hover {
                background: linear-gradient(135deg, #1e7e34, #155724);
                transform: translateY(-1px);
                box-shadow: 0 4px 12px rgba(40, 167, 69, 0.4);
            }

            .copy-icon {
                font-size: 1.1em;
            }

            .pix-instructions-card {
                background: var(--modal-input-bg);
                border: 1px solid var(--modal-border);
                border-radius: 16px;
                padding: 25px;
            }

            .pix-steps {
                display: flex;
                flex-direction: column;
                gap: 15px;
            }

            .pix-step {
                display: flex;
                align-items: flex-start;
                gap: 15px;
                background: var(--modal-bg-dark);
                padding: 20px;
                border-radius: 12px;
                border-left: 4px solid var(--secondary-color);
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
            }

            .step-icon {
                font-size: 1.5em;
                flex-shrink: 0;
            }

            .step-content {
                flex: 1;
            }

            .step-title {
                font-weight: bold;
                color: var(--modal-text);
                font-size: 1.1em;
                margin-bottom: 5px;
            }

            .step-description {
                color: var(--modal-text-secondary);
                font-size: 0.9em;
            }

            .pix-contact-card {
                background: var(--modal-bg-dark);
                border: 1px solid var(--modal-border);
                border-radius: 12px;
                padding: 20px;
                box-shadow: 0 2px 8px rgba(255, 193, 7, 0.2);
            }

            .contact-header {
                display: flex;
                align-items: center;
                gap: 10px;
                margin-bottom: 15px;
                font-weight: bold;
                color: var(--modal-text);
            }

            .contact-icon {
                font-size: 1.3em;
            }

            .contact-info {
                display: flex;
                flex-direction: column;
                gap: 10px;
            }

            .contact-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 8px 0;
                border-bottom: 1px solid var(--modal-border);
            }

            .contact-item:last-child {
                border-bottom: none;
            }

            .contact-label {
                color: var(--modal-text-secondary);
                font-weight: 500;
            }

            .contact-value {
                color: var(--modal-text);
                font-weight: bold;
            }

            .back-to-options {
                text-align: center;
                margin-top: 20px;
            }

            .back-btn {
                background: #6c757d;
                color: white;
                border: none;
                padding: 12px 24px;
                border-radius: 8px;
                cursor: pointer;
                display: inline-flex;
                align-items: center;
                gap: 10px;
                font-weight: 500;
                transition: all 0.3s ease;
            }

            .back-btn:hover {
                background: #5a6268;
                transform: translateY(-1px);
            }

            .back-icon {
                font-size: 1.2em;
            }

            @media (max-width: 768px) {
                .pix-key-display {
                    flex-direction: column;
                }

                .copy-pix-btn {
                    width: 100%;
                    justify-content: center;
                }

                .pix-step {
                    flex-direction: column;
                    text-align: center;
                }
            }
        `;
            document.head.appendChild(style);
        }

        // 📋 Copiar chave PIX
        static copyPixKey() {
            const pixKey = document.getElementById('pix-key').textContent;

            if (navigator.clipboard) {
                navigator.clipboard.writeText(pixKey).then(() => {
                    this.showCopySuccess();
                }).catch(() => {
                    this.fallbackCopyText(pixKey);
                });
            } else {
                this.fallbackCopyText(pixKey);
            }
        }

        // 📋 Fallback para copiar texto
        static fallbackCopyText(text) {
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();

            try {
                document.execCommand('copy');
                this.showCopySuccess();
            } catch (err) {
                console.error('❌ [COPY ERROR] Erro ao copiar PIX:', err);
                alert('Erro ao copiar. Chave PIX: ' + text);
            }

            document.body.removeChild(textArea);
        }

        // ✅ Mostrar sucesso da cópia
        static showCopySuccess() {
            const copyBtn = document.querySelector('.copy-pix-btn');
            const originalText = copyBtn.innerHTML; // Use innerHTML to preserve icon

            copyBtn.innerHTML = '✅ Copiado!';
            copyBtn.style.background = '#28a745';

            setTimeout(() => {
                copyBtn.innerHTML = originalText;
                copyBtn.style.background = '';
            }, 2000);

        }

        // 🎨 Adicionar estilos do modal
        static addModalStyles() {
            if (document.getElementById('vip-modal-styles')) return;

            const style = document.createElement('style');
            style.id = 'vip-modal-styles';
            style.textContent = `
            .vip-payment-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                z-index: 10000;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 20px;
                box-sizing: border-box;
            }

            .modal-backdrop {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.7);
                backdrop-filter: blur(5px);
            }

            .modal-content {
                background: var(--modal-bg-dark);
                background-color: #0c1318; /* Fundo sólido */
                color: var(--modal-text);
                border: 1px solid var(--modal-border);
                border-radius: 20px;
                max-width: 900px;
                width: 95%;
                max-height: 90vh;
                overflow-y: auto;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
                transform: scale(0.9);
                opacity: 0;
                transition: all 0.3s ease;
            }

            .modal-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 25px 30px;
                border-bottom: 1px solid var(--modal-border);
                background: var(--modal-header-bg);
                border-radius: 20px 20px 0 0;
                color: var(--modal-text);
            }

            .modal-header h2 {
                margin: 0;
                color: var(--modal-text);
                font-size: 1.5em;
                font-weight: bold;
                text-align: center;
                flex: 1;
            }

            .close-btn {
                background: none;
                border: none;
                font-size: 2em;
                color: var(--modal-text);
                cursor: pointer;
                padding: 0;
                width: 40px;
                height: 40px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: background 0.3s ease;
            }

            .close-btn:hover {
                background: rgba(255, 255, 255, 0.1);
            }

            .modal-body {
                padding: 25px;
            }

            .user-info-section {
                background: var(--modal-input-bg);
                padding: 15px;
                border-radius: 12px;
                margin-bottom: 25px;
                border: 1px solid var(--modal-border);
                display: flex;
                justify-content: center;
                gap: 20px;
                align-items: center;
                flex-wrap: wrap;
            }

            .user-info-section p {
                margin: 5px 0;
                color: var(--modal-text);
                font-size: 1.1em;
            }

            .user-info-centered {
                justify-content: center;
            }

            .level-badge {
                padding: 4px 8px;
                border-radius: 12px;
                font-size: 0.9em;
                font-weight: bold;
            }

            .level-badge.free {
                background: #6c757d;
                color: white;
            }

            .level-badge.vip {
                background: linear-gradient(135deg, #ffd700, #ffed4e);
                color: #000;
                font-weight: bold;
            }

            .level-badge.admin {
                background: linear-gradient(135deg, #dc3545, #fd7e14);
                color: white;
                font-weight: bold;
            }

            .benefits-section {
                margin-bottom: 25px;
            }

            .benefits-section h3 {
                color: var(--modal-text);
                margin-bottom: 15px;
                text-align: center;
            }

            .benefits-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                gap: 10px;
            }

            .benefit-item {
                padding: 8px 12px;
                background: var(--modal-input-bg);
                border-radius: 6px;
                font-size: 0.9em;
                border-left: 4px solid var(--secondary-color);
                color: var(--modal-text);
            }

            .plans-section h3 {
                color: var(--modal-text);
                margin-bottom: 15px;
                text-align: center;
            }

            .plans-grid {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 20px;
                margin-bottom: 20px;
                justify-content: center;
                align-items: stretch;
            }

            .plan-card {
                background: var(--modal-input-bg);
                border: 1px solid var(--modal-border);
                border-radius: 16px;
                padding: 25px;
                text-align: center;
                transition: all 0.3s ease;
                cursor: pointer;
                position: relative;
                display: flex;
                flex-direction: column;
            }

            .plan-card:hover {
                border-color: var(--primary-color);
                transform: translateY(-2px);
                box-shadow: 0 8px 25px rgba(255, 215, 0, 0.3);
            }

            .plan-card.popular {
                border-color: var(--primary-color);
                background: var(--modal-input-bg);
            }

            .plan-card.selected {
                border-color: var(--secondary-color);
                background: var(--modal-input-bg);
                transform: scale(1.02);
            }

            .popular-badge {
                position: absolute;
                top: -12px;
                left: 50%;
                transform: translateX(-50%);
                background: #ffd700;
                color: #000;
                padding: 6px 18px;
                border-radius: 20px;
                font-size: 0.75em;
                font-weight: bold;
                white-space: nowrap;
                min-width: 120px;
                text-align: center;
                box-shadow: 0 2px 8px rgba(255, 215, 0, 0.4);
                border: 2px solid #fff;
            }

            .plan-card h4 {
                margin: 15px 0;
                font-size: 1.4em;
                color: var(--modal-text);
            }

            .plan-card .credits {
                color: #8b9cb5;
                font-size: 1.1em;
                margin-bottom: 15px;
            }

            .plan-card .price {
                font-size: 2.5em;
                font-weight: bold;
                color: var(--modal-text);
                margin: 10px 0;
            }

            .currency {
                font-size: 1.2em;
                font-weight: bold;
            }

            .amount {
                font-size: 2em;
                font-weight: bold;
                margin-left: 2px;
            }

            .duration {
                color: var(--modal-text-secondary);
                margin-bottom: 10px;
            }

            .savings {
                color: var(--danger-color);
                font-weight: bold;
                font-size: 0.9em;
                margin-bottom: 15px;
            }

            .select-plan-btn {
                background: linear-gradient(135deg, #ffd700, #ffed4e);
                color: #000;
                border: none;
                padding: 10px 20px;
                border-radius: 8px;
                font-weight: bold;
                cursor: pointer;
                width: 100%;
                transition: all 0.3s ease;
            }

            .select-plan-btn:hover {
                background: linear-gradient(135deg, #ffed4e, #ffc107);
                transform: translateY(-1px);
            }

            .payment-section {
                background: var(--modal-input-bg);
                padding: 20px;
                border-radius: 12px;
                margin-top: 20px;
                border: 2px solid var(--secondary-color);
            }

            .payment-section h3 {
                color: var(--secondary-color);
                margin-bottom: 15px;
                text-align: center;
            }

            .mercadopago-info {
                background: var(--modal-bg-dark);
                padding: 15px;
                border-radius: 8px;
                border: 1px solid var(--modal-border);
                color: var(--modal-text);
            }

            .mercadopago-info h4 {
                color: var(--modal-text);
                margin-bottom: 10px;
                text-align: center;
            }

            #pix-key {
                background: var(--modal-input-bg);
                padding: 8px 12px;
                border-radius: 6px;
                font-family: monospace;
                border: 1px solid var(--modal-border);
                display: inline-block;
                margin: 0 10px;
                color: var(--modal-text);
            }

            .copy-btn {
                background: var(--primary-color);
                color: white;
                border: none;
                padding: 6px 12px;
                border-radius: 4px;
                cursor: pointer;
                font-size: 0.9em;
                transition: background 0.3s ease;
            }

            .copy-btn:hover {
                background: var(--primary-color-dark);
            }

            .payment-instructions {
                margin-top: 15px;
                padding: 15px;
                background: var(--modal-input-bg);
                border-radius: 6px;
                color: var(--modal-text);
            }

            .payment-instructions h5 {
                color: var(--primary-color);
                margin-bottom: 10px;
            }

            .payment-instructions ol {
                margin: 0;
                padding-left: 20px;
            }

            .payment-instructions li {
                margin-bottom: 5px;
                line-height: 1.4;
            }

            .modal-footer {
                padding: 20px;
                background: var(--modal-bg-dark);
                border-top: 1px solid var(--modal-border);
                text-align: center;
                border-radius: 0 0 20px 20px;
            }

            .security-note {
                color: var(--secondary-color);
                font-weight: bold;
                margin: 0 0 10px 0;
            }

            .support-note {
                color: #666;
                margin: 0;
                font-size: 0.9em;
            }

            /* Responsividade */
            @media (max-width: 1024px) {
                .modal-content {
                    max-width: 95vw;
                }

                .plans-grid {
                    grid-template-columns: repeat(2, 1fr);
                    gap: 18px;
                }
            }

            @media (max-width: 768px) {
                .modal-content {
                    max-height: 95vh;
                    max-width: 95vw;
                }

                .modal-header {
                    padding: 15px 20px;
                }

                .modal-header h2 {
                    font-size: 1.3em;
                }

                .modal-body {
                    padding: 20px;
                }

                .plans-grid {
                    grid-template-columns: 1fr;
                    gap: 20px;
                }

                .user-info-centered {
                    flex-direction: column;
                    gap: 10px;
                }

                .benefits-grid {
                    grid-template-columns: 1fr;
                }
            }
        `;

            document.head.appendChild(style);
        }

        // 🎧 Adicionar event listeners
        static addEventListeners() {
            // Fechar modal com ESC
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && this.isVisible) {
                    this.hide();
                }
            });

            // Prevenir scroll do body quando modal está aberto
            this.modal.addEventListener('wheel', (e) => {
                e.stopPropagation();
            });
        }

        // 💰 Carregar créditos atuais do usuário
        static async loadCurrentCredits() {
            try {
                const creditsDisplay = document.getElementById('current-credits-display');
                if (!creditsDisplay) return;

                let credits = 0;
                if (typeof CreditsManager !== 'undefined') {
                    credits = await CreditsManager.getCurrentCredits();
                }

                creditsDisplay.innerHTML = `💰 ${credits} créditos`;
            } catch (error) {
                console.error('❌ [VIP MODAL] Erro ao carregar créditos:', error);
                const creditsDisplay = document.getElementById('current-credits-display');
                if (creditsDisplay) {
                    creditsDisplay.textContent = '-- créditos';
                }
            }
        }

        // 🧪 Ativar VIP para teste (somente Admin)
        static activateVipForTesting(planKey = 'monthly') {
            const userInfo = UserLevelsManager.getUserInfo();
            if (!userInfo || !userInfo.isAdmin) {
                alert('❌ Apenas administradores podem ativar VIP para teste');
                return;
            }

            const success = UserLevelsManager.activateVip(userInfo.loginId, planKey);
            if (success) {
                alert('✅ VIP ativado para teste com sucesso!');
                this.hide();
                // Recarregar interface
                setTimeout(() => {
                    UserLevelsManager.updateInterfaceForUserLevel();
                }, 500);
            } else {
                alert('❌ Erro ao ativar VIP para teste');
            }
        }
    };
}