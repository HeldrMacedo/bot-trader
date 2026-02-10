// js/IA.js
// Sistema de IA para geração de sugestões de regras inteligentes
// O SISTEMA DEVE SER 100% ISOLADO POR USUARIO - APENAS VIP/ADMIN

class IASystem {
    constructor() {
        this.sessionId = SessionManager.getUserSessionId();
        this.geminiInstance = null;
        this.isProcessing = false;
        this.geminiCallInProgress = false; // Novo: para rastrear chamadas ativas ao Gemini

        // 🔍 Validar integridade na inicialização
        this.validateUserAccess();

        // 🎯 Inicializar sistema
        this.initializeIA();
    }

    // 🔍 Validar acesso do usuário (apenas VIP/ADMIN)
    validateUserAccess() {
        const currentUser = SessionManager.getCurrentUser();

        // ✅ CORREÇÃO: Só validar se usuário já está logado
        if (!currentUser) {
            // Estado normal de pré-login
            return false;
        }

        const loginId = currentUser.authorize?.loginid;
        if (!loginId) {
            return false;
        }

        // ✅ Para Admin, sempre permitir acesso
        if (UserLevelsManager.ADMIN_LOGIN_IDS.includes(loginId)) {

            return true;
        }

        // ✅ CORREÇÃO CRÍTICA: Verificar créditos DIRETAMENTE (mesmo método do footer-manager.js)
        // NÃO usar getCurrentUserLevel() que pode ter cache desatualizado
        try {
            // Verificar VIP via vipData
            const vipData = UserLevelsManager.getVipData(loginId);
            if (vipData && UserLevelsManager.isVipActive(vipData)) {

                return true;
            }

            // Verificar VIP via créditos (sistema separado)
            const creditsKey = `user_credits_${loginId}`;
            const creditsDataString = localStorage.getItem(creditsKey);
            if (creditsDataString) {
                const creditsData = JSON.parse(creditsDataString);
                if (creditsData && creditsData.credits > 0) {

                    return true;
                }
            }
        } catch (error) {
            console.warn('⚠️ [IA ACCESS] Erro ao verificar acesso:', error);
        }

        console.error('🔒 [IA SYSTEM] Acesso negado - usuário não é VIP/ADMIN');
        return false;
    }

    // 🔐 NOVA: Validação server-side obrigatória para uso da IA
    async validateServerSideAccess(loginId) {
        try {
            // 🔍 DEBUG: Verificar dados locais primeiro
            const localVipData = UserLevelsManager.getVipData(loginId);


            const response = await fetch(`/api/vip/${loginId}`);
            const data = await response.json();


            if (!data.success) {
                CommonHelpers.showError('❌ [IA SECURITY] Falha na comunicação com servidor');

                // 🔄 Se há dados VIP locais válidos, tentar sincronizar com servidor
                if (localVipData && UserLevelsManager.isVipActive(localVipData)) {

                    const syncResult = await this.syncLocalVipToServer(loginId, localVipData);
                    if (syncResult.success) {

                        return {
                            valid: true,
                            serverVipData: localVipData,
                            synced: true
                        };
                    }
                }

                return { valid: false, reason: 'Erro de comunicação com servidor' };
            }

            if (!data.isVip) {
                CommonHelpers.showWarning(`⚠️ [IA SECURITY] Servidor confirmou que ${loginId} NÃO é VIP`);

                // 🔄 Verificar se há discrepância entre local e servidor
                if (localVipData && UserLevelsManager.isVipActive(localVipData)) {
                    CommonHelpers.showWarning('🔄 [IA SYNC] DISCREPÂNCIA: Local diz VIP, servidor diz NÃO VIP');

                    // Mostrar popup de diagnóstico para usuário
                    await this.showVipSyncDiagnostic(loginId, localVipData, data);

                    // Tentar sincronizar
                    const syncResult = await this.syncLocalVipToServer(loginId, localVipData);
                    if (syncResult.success) {

                        return {
                            valid: true,
                            serverVipData: localVipData,
                            synced: true
                        };
                    }
                }

                return { valid: false, reason: 'Status VIP não confirmado pelo servidor' };
            }

            // ✅ Verificar tempo restante no servidor
            if (data.remainingDays !== undefined && data.remainingDays <= 0) {
                CommonHelpers.showWarning(`⚠️ [IA SECURITY] Plano VIP expirado conforme servidor`);
                return { valid: false, reason: 'Plano VIP expirado' };
            }


            return {
                valid: true,
                serverVipData: data.vipData,
                remainingDays: data.remainingDays
            };

        } catch (error) {
            CommonHelpers.showError('❌ [IA SECURITY] Erro na validação server-side:', error);

            // 🔄 Fallback: Se há dados VIP locais válidos, permitir uso em modo offline
            const localVipData = UserLevelsManager.getVipData(loginId);
            if (localVipData && UserLevelsManager.isVipActive(localVipData)) {
                CommonHelpers.showWarning('🔄 [IA FALLBACK] Usando dados VIP locais devido a erro de servidor');

                // Mostrar aviso ao usuário
                this.showOfflineModeWarning();

                return {
                    valid: true,
                    serverVipData: localVipData,
                    offlineMode: true
                };
            }

            return { valid: false, reason: 'Falha na validação do servidor' };
        }
    }

    // 🔄 Tentar sincronizar dados VIP locais com o servidor
    async syncLocalVipToServer(loginId, localVipData) {
        try {
            const response = await fetch('/api/vip/sync', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    loginId: loginId,
                    localVipData: localVipData
                })
            });

            const result = await response.json();
            return result;

        } catch (error) {
            CommonHelpers.showError('❌ [IA SYNC] Erro na sincronização:', error);
            return { success: false, error: error.message };
        }
    }

    // 🔍 Mostrar popup de diagnóstico VIP
    async showVipSyncDiagnostic(loginId, localData, serverData) {
        return new Promise((resolve) => {
            const modal = document.createElement('div');
            modal.className = 'vip-diagnostic-modal';
            modal.innerHTML = `
                <div class="vip-diagnostic-content">
                    <div class="vip-diagnostic-header">
                        <h2>🔍 Diagnóstico VIP</h2>
                    </div>
                    <div class="vip-diagnostic-body">
                        <h3>Discrepância detectada:</h3>
                        <div class="diagnostic-info">
                            <div class="local-info">
                                <h4>📱 Dados Locais:</h4>
                                <p>Status: ${localData ? '✅ VIP Ativo' : '❌ Não VIP'}</p>
                                ${localData ? `<p>Expira: ${new Date(localData.expiresAt).toLocaleString()}</p>` : ''}
                            </div>
                            <div class="server-info">
                                <h4>🌐 Dados do Servidor:</h4>
                                <p>Status: ${serverData.isVip ? '✅ VIP Ativo' : '❌ Não VIP'}</p>
                                <p>Resposta: ${JSON.stringify(serverData, null, 2)}</p>
                            </div>
                        </div>
                        <p><strong>Tentando sincronizar automaticamente...</strong></p>
                    </div>
                    <div class="vip-diagnostic-actions">
                        <button onclick="this.closest('.vip-diagnostic-modal').remove(); resolve(true);">
                            OK, Entendido
                        </button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            // Auto-fechar após 5 segundos
            setTimeout(() => {
                if (modal.parentElement) {
                    modal.remove();
                    resolve(true);
                }
            }, 5000);
        });
    }

    // ⚠️ Mostrar aviso de modo offline
    showOfflineModeWarning() {
        const notification = document.createElement('div');
        notification.className = 'ia-offline-warning';
        notification.innerHTML = `
            <div class="ia-offline-content">
                <h3>⚠️ Modo Offline</h3>
                <p>Sistema de IA funcionando com dados locais devido a problemas de conexão com o servidor.</p>
                <p>Funcionalidade mantida, mas recomenda-se verificar conexão.</p>
            </div>
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 8000);
    }

    // 🎯 Inicializar sistema de IA
    initializeIA() {
        try {
            // Carregar estilos CSS primeiro
            this.addProcessingStyles();
            this.addSuggestionsStyles();

            // Obter instância do Gemini
            this.geminiInstance = getGeminiInstance();

            if (!this.geminiInstance) {
                CommonHelpers.showError('❌ [IA SYSTEM] Instância do Gemini não disponível');
                return;
            }


        } catch (error) {
            CommonHelpers.showError('❌ [IA SYSTEM] Erro ao inicializar:', error);
        }
    }

    // 🎯 Mostrar modal de escolha da IA
    async showIAChoiceModal() {

        return new Promise((resolve) => {
            // Garantir que os estilos sejam carregados primeiro
            this.addIAChoiceStyles();

            const modal = document.createElement('div');
            modal.className = 'ia-choice-modal';
            modal.style.cssText = `
                position: fixed !important;
                top: 0 !important;
                left: 0 !important;
                width: 100% !important;
                height: 100% !important;
                z-index: 2147483647 !important;
                background: rgba(0, 0, 0, 0.8) !important;
                display: flex !important;
                justify-content: center !important;
                align-items: center !important;
                opacity: 1 !important;
                visibility: visible !important;
            `;

            modal.innerHTML = `
                <div class="ia-choice-overlay">
                    <div class="ia-choice-content">
                        <div class="ia-choice-header">
                            <h2>🧠 Sistema de IA Avançada</h2>
                            <p>Escolha qual funcionalidade deseja utilizar:</p>
                        </div>
                        <div class="ia-choice-options">
                            <button class="ia-option-btn" id="ia-option-rules">
                                <div class="ia-option-icon">🎯</div>
                                <div class="ia-option-content">
                                    <h3>Gerar Regras de Estratégia</h3>
                                    <p>Analise suas configurações e gere estratégias inteligentes</p>
                                    <div class="ia-option-cost">💳 Custo: 1 Crédito</div>
                                </div>
                            </button>
                            <button class="ia-option-btn" id="ia-option-risk">
                                <div class="ia-option-icon">🛡️</div>
                                <div class="ia-option-content">
                                    <h3>Filtro de Risco Algorítmico</h3>
                                    <p>Sistema avançado de proteção contra manipulação algorítmica</p>
                                    <div class="ia-option-cost">💳 Custo: 1 Crédito por análise</div>
                                </div>
                            </button>
                            <button class="ia-option-btn" id="ia-option-chat">
                                <div class="ia-option-icon">💬</div>
                                <div class="ia-option-content">
                                    <h3>Converse com a IA Trader</h3>
                                    <p>Chat conversacional com análise de mercado em tempo real</p>
                                    <div class="ia-option-cost">💳 Custo: 1 Crédito por mensagem</div>
                                </div>
                            </button>
                        </div>
                        <div class="ia-choice-actions">
                            <button class="ia-btn cancel" id="ia-choice-cancel">❌ Cancelar</button>
                        </div>
                    </div>
                </div>
            `;


            document.body.appendChild(modal);

            // Event listeners com logs
            const rulesBtn = modal.querySelector('#ia-option-rules');
            const riskBtn = modal.querySelector('#ia-option-risk');
            const chatBtn = modal.querySelector('#ia-option-chat');
            const cancelBtn = modal.querySelector('#ia-choice-cancel');

            if (rulesBtn) {
                rulesBtn.addEventListener('click', () => {

                    modal.remove();
                    resolve({ choice: 'rules' });
                });
            }

            if (riskBtn) {
                riskBtn.addEventListener('click', () => {

                    modal.remove();
                    resolve({ choice: 'risk' });
                });
            }

            if (chatBtn) {
                chatBtn.addEventListener('click', () => {
                    console.log('💬 [IA CHOICE] Usuário escolheu Chat IA');
                    modal.remove();
                    resolve({ choice: 'chat' });
                });
            }

            if (cancelBtn) {
                cancelBtn.addEventListener('click', () => {

                    modal.remove();
                    resolve({ choice: 'cancel' });
                });
            }

            // Fechar com ESC
            const escHandler = (e) => {
                if (e.key === 'Escape') {

                    modal.remove();
                    document.removeEventListener('keydown', escHandler);
                    resolve({ choice: 'cancel' });
                }
            };
            document.addEventListener('keydown', escHandler);


        });
    }

    // 🎨 Adicionar estilos do modal de escolha
    addIAChoiceStyles() {
        if (document.getElementById('ia-choice-styles')) return;

        const style = document.createElement('style');
        style.id = 'ia-choice-styles';
        style.textContent = `
            .ia-choice-modal {
                position: fixed !important;
                top: 0 !important;
                left: 0 !important;
                width: 100% !important;
                height: 100% !important;
                z-index: 2147483647 !important;
                display: flex !important;
                justify-content: center !important;
                align-items: center !important;
            }

            .ia-choice-overlay {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.8);
                display: flex;
                justify-content: center;
                align-items: center;
            }

            .ia-choice-content {
                background: #1e1e2e;
                border-radius: 16px;
                padding: 30px;
                max-width: 600px;
                width: 90%;
                color: #cdd6f4;
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6);
                animation: modalSlideIn 0.3s ease-out;
            }

            @keyframes modalSlideIn {
                from {
                    opacity: 0;
                    transform: translateY(-30px) scale(0.95);
                }
                to {
                    opacity: 1;
                    transform: translateY(0) scale(1);
                }
            }

            .ia-choice-header {
                text-align: center;
                margin-bottom: 30px;
            }

            .ia-choice-header h2 {
                margin: 0 0 10px 0;
                color: #f9e2af;
                font-size: 28px;
            }

            .ia-choice-header p {
                margin: 0;
                color: #a6adc8;
                font-size: 16px;
            }

            .ia-choice-options {
                display: flex;
                flex-direction: column;
                gap: 20px;
                margin-bottom: 30px;
            }

            .ia-option-btn {
                display: flex;
                align-items: center;
                padding: 20px;
                border: 2px solid #313244;
                border-radius: 12px;
                background: #181825;
                color: #cdd6f4;
                cursor: pointer;
                transition: all 0.3s ease;
                text-align: left;
                width: 100%;
            }

            .ia-option-btn:hover {
                border-color: #89b4fa;
                background: #1e1e2e;
                transform: translateY(-2px);
                box-shadow: 0 8px 20px rgba(137, 180, 250, 0.2);
            }

            .ia-option-icon {
                font-size: 48px;
                margin-right: 20px;
                flex-shrink: 0;
            }

            .ia-option-content {
                flex: 1;
            }

            .ia-option-content h3 {
                margin: 0 0 8px 0;
                color: #f9e2af;
                font-size: 20px;
            }

            .ia-option-content p {
                margin: 0 0 12px 0;
                color: #a6adc8;
                font-size: 14px;
                line-height: 1.4;
            }

            .ia-option-cost {
                color: #94e2d5;
                font-weight: bold;
                font-size: 14px;
            }

            .ia-choice-actions {
                display: flex;
                justify-content: center;
                gap: 15px;
            }

            .ia-btn {
                padding: 12px 24px;
                border: none;
                border-radius: 8px;
                font-weight: bold;
                cursor: pointer;
                font-size: 14px;
                transition: all 0.2s ease;
            }

            .ia-btn.cancel {
                background: #f38ba8;
                color: #181825;
            }

            .ia-btn.cancel:hover {
                background: #f5c2e7;
                transform: translateY(-1px);
            }

            @media (max-width: 768px) {
                .ia-choice-content {
                    padding: 20px;
                    margin: 20px;
                }

                .ia-option-btn {
                    flex-direction: column;
                    text-align: center;
                    padding: 15px;
                }

                .ia-option-icon {
                    margin: 0 0 15px 0;
                    font-size: 36px;
                }
            }
        `;

        document.head.appendChild(style);
    }

    // 🤖 Função principal de entrada da IA
    async generateRuleSuggestions() {
        const executionId = `IA-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

        // 🚨 PROTEÇÃO CONTRA CHAMADAS DUPLICADAS
        if (this.isProcessing) {
            console.warn(`⚠️ [${executionId}] CHAMADA DUPLICADA DETECTADA - processo já em andamento`);
            console.warn(`⚠️ [${executionId}] Flag isProcessing = ${this.isProcessing}`);
            alert('⏳ Sistema de IA já está processando. Aguarde...');
            return {
                success: false,
                reason: 'duplicate_call',
                message: 'Sistema de IA já está processando outra solicitação'
            };
        }

        // 🎯 MOSTRAR MENU DE ESCOLHA DA IA

        const choice = await this.showIAChoiceModal();


        if (choice.choice === 'cancel') {

            return {
                success: false,
                reason: 'user_cancelled',
                message: 'Operação cancelada pelo usuário'
            };
        }

        // 💳 VERIFICAR E CONFIRMAR CRÉDITOS APÓS ESCOLHA DO USUÁRIO
        const currentUser = SessionManager.getCurrentUser();
        const loginId = currentUser?.authorize?.loginid;
        const isAdmin = UserLevelsManager.ADMIN_LOGIN_IDS.includes(loginId);
        const requiredCredits = 1;

        // Verificar créditos apenas para não-Admin
        if (!isAdmin) {
            const currentCredits = await CreditsManager.getCurrentCredits();

            if (currentCredits < requiredCredits) {
                console.warn(`⚠️ [${executionId}] Créditos insuficientes: ${currentCredits} < ${requiredCredits}`);

                if (typeof ModalCreditos !== 'undefined') {
                    ModalCreditos.showCreditosInsuficientes(requiredCredits, currentCredits, 'Sistema de IA Avançada');
                } else {
                    alert('❌ Créditos insuficientes! Necessário: 1 crédito para usar o Sistema de IA');
                }

                return {
                    success: false,
                    reason: 'insufficient_credits',
                    message: 'Créditos insuficientes'
                };
            }

            // Modal de confirmação
            const userConfirmed = await new Promise((resolve) => {
                if (typeof ModalCreditos !== 'undefined') {
                    ModalCreditos.showConfirmacaoGasto(
                        '🤖 Sistema de IA Avançada',
                        requiredCredits,
                        () => resolve(true),
                        () => resolve(false)
                    );
                } else {
                    resolve(confirm(`Esta ação consumirá 1 crédito. Continuar?`));
                }
            });

            if (!userConfirmed) {
                console.log(`⚠️ [${executionId}] Usuário cancelou após ver confirmação de créditos`);
                return {
                    success: false,
                    reason: 'user_cancelled_after_confirmation',
                    message: 'Operação cancelada pelo usuário'
                };
            }
        }


        if (choice.choice === 'risk') {

            // 🛡️ ATIVAR FILTRO DE RISCO
            try {
                // Verificar se o módulo existe globalmente
                if (typeof window.riskFilterModule !== 'undefined' && window.riskFilterModule) {

                    const activated = await window.riskFilterModule.activateRiskFilter();

                    // Debitar créditos apenas se ativado com sucesso e não for Admin
                    if (activated && !isAdmin) {
                        await CreditsManager.debitCredits(requiredCredits, 'Filtro de Risco Algorítmico');
                    }

                    return {
                        success: activated,
                        reason: activated ? 'risk_filter_activated' : 'risk_filter_cancelled',
                        message: activated ? 'Filtro de Risco Algorítmico ativado com sucesso!' : 'Ativação do filtro cancelada'
                    };
                }
                // Se não existe, tentar criar uma nova instância
                else if (typeof window.RiskFilterModule !== 'undefined') {

                    window.riskFilterModule = new window.RiskFilterModule();
                    const activated = await window.riskFilterModule.activateRiskFilter();

                    // Debitar créditos apenas se ativado com sucesso e não for Admin
                    if (activated && !isAdmin) {
                        await CreditsManager.debitCredits(requiredCredits, 'Filtro de Risco Algorítmico');
                    }

                    return {
                        success: activated,
                        reason: activated ? 'risk_filter_activated' : 'risk_filter_cancelled',
                        message: activated ? 'Filtro de Risco Algorítmico ativado com sucesso!' : 'Ativação do filtro cancelada'
                    };
                }
                // Tentar carregar o módulo dinamicamente
                else {

                    await this.loadRiskFilterModule();

                    if (window.riskFilterModule) {
                        const activated = await window.riskFilterModule.activateRiskFilter();

                        // Debitar créditos apenas se ativado com sucesso e não for Admin
                        if (activated && !isAdmin) {
                            await CreditsManager.debitCredits(requiredCredits, 'Filtro de Risco Algorítmico');
                        }

                        return {
                            success: activated,
                            reason: activated ? 'risk_filter_activated' : 'risk_filter_cancelled',
                            message: activated ? 'Filtro de Risco Algorítmico ativado com sucesso!' : 'Ativação do filtro cancelada'
                        };
                    } else {
                        throw new Error('Falha ao carregar módulo após tentativa');
                    }
                }
            } catch (error) {
                console.error('❌ [IA] Erro ao ativar filtro de risco:', error);
                alert(`❌ Erro ao ativar Filtro de Risco: ${error.message}`);
                return {
                    success: false,
                    reason: 'risk_module_error',
                    message: `Erro no módulo de filtro: ${error.message}`
                };
            }
        }

        // 💬 ABRIR CHAT COM IA TRADER
        // ⚠️ NOTA: Créditos são debitados POR MENSAGEM no gemini-ai.js, não na abertura do chat
        if (choice.choice === 'chat') {
            console.log('💬 [IA] Abrindo chat com IA Trader...');

            try {
                // Obter instância do chat manager
                const chatManager = getAIChatManager();
                await chatManager.openChat();

                return {
                    success: true,
                    reason: 'chat_opened',
                    message: 'Chat com IA Trader aberto com sucesso!'
                };
            } catch (error) {
                console.error('❌ [IA] Erro ao abrir chat:', error);
                alert(`❌ Erro ao abrir chat: ${error.message}`);
                return {
                    success: false,
                    reason: 'chat_error',
                    message: `Erro ao abrir chat: ${error.message}`
                };
            }
        }

        // 🎯 CONTINUAR COM GERAÇÃO DE ESTRATÉGIAS (choice.choice === 'rules')
        if (choice.choice === 'rules') {

            const result = await this.generateRuleStrategies(executionId);

            // Debitar créditos apenas se geração foi bem-sucedida e não for Admin
            if (result && result.success && !isAdmin) {
                await CreditsManager.debitCredits(
                    requiredCredits,
                    `Geração de estratégias com IA${result.fallback_used ? ' (IA Simulada)' : ' (IA Principal)'}`
                );
            }

            return result;
        }

        // Se chegou aqui, houve algum problema
        console.warn(`⚠️ [${executionId}] Escolha inválida: ${choice.choice}`);
        return {
            success: false,
            reason: 'invalid_choice',
            message: 'Escolha inválida do usuário'
        };
    }

    // 🎯 Função específica para geração de estratégias
    async generateRuleStrategies(executionId) {
        this.isProcessing = true;

        // 🔧 TIMEOUT DE SEGURANÇA: Se não finalizar em 5 minutos, liberar
        const safetyTimeout = setTimeout(() => {
            console.error(`⚠️ [${executionId}] TIMEOUT DE SEGURANÇA ATIVADO - liberando processo após 5 minutos`);
            this.isProcessing = false;
        }, 5 * 60 * 1000); // 5 minutos

        const currentUser = SessionManager.getCurrentUser();

        try {
            this.showIAModal('🤖 Analisando configurações...', 'Coletando dados do usuário...');

            const userConfig = this.getUserConfiguration();

            if (!userConfig.isValid) {
                console.error(`❌ [${executionId}] Erro nas configurações do usuário: ${userConfig.error}`);
                throw new Error(userConfig.error || 'Configuração inválida');
            }

            this.updateIAModal('📊 Coletando histórico...', 'Obtendo dados do mercado...');

            const historicalData = await this.getRelevantHistoricalData(userConfig);

            // 💾 ARMAZENAR DADOS PARA POSSÍVEL USO NO FALLBACK
            this.lastUserConfig = userConfig;
            this.lastHistoricalData = historicalData;

            this.updateIAModal('🧠 Processando com IA...', 'Configurando sistema Gemini...');


            if (!this.geminiInstance.apiKey) {
                this.updateIAModal('🔑 Carregando credenciais...', 'Obtendo API Key do Gemini...');
                await this.geminiInstance.loadApiKeyFromSecrets();

                if (!this.geminiInstance.apiKey) {
                    console.error(`❌ [${executionId}] API Key do Gemini não encontrada. Verifique se GEMINI_API_KEY está configurada nos Secrets do Replit.`);
                    throw new Error('API Key do Gemini não encontrada. Verifique se GEMINI_API_KEY está configurada nos Secrets do Replit.');
                }

            }

            this.updateIAModal('🧠 Processando com IA...', 'Gerando sugestões inteligentes...');


            const prompt = this.buildIAPrompt(userConfig, historicalData);

            // ✅ VALIDAR PROMPT antes de enviar
            if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
                console.error(`❌ [${executionId}] Prompt inválido gerado:`, {
                    prompt: prompt,
                    type: typeof prompt,
                    userConfig: userConfig,
                    historicalData: historicalData
                });
                throw new Error('Erro interno: Prompt inválido gerado para IA');
            }

            // 🎯 VERIFICAR MODO ADMIN: Gemini ou IA Simulada
            let suggestions;
            let fallbackUsed = false;
            const adminMode = window.AdminGeminiToggle ? window.AdminGeminiToggle.getCurrentMode() : 'gemini';

            if (adminMode === 'simulada') {

                this.updateIAModal('🎯 Processando com IA Advance...', 'Modo analítico...');

                // Usar IA simulada diretamente
                let iaFallback;
                if (window.getIAFallbackInstance && typeof window.getIAFallbackInstance === 'function') {
                    iaFallback = window.getIAFallbackInstance();
                } else if (window.IAFallback && typeof window.IAFallback === 'function') {
                    iaFallback = new window.IAFallback();
                } else {

                    await this.loadIAFallbackScript();
                    iaFallback = window.getIAFallbackInstance ? window.getIAFallbackInstance() : new window.IAFallback();
                }
                suggestions = await iaFallback.processWithFallbackAI(userConfig, historicalData);
                fallbackUsed = true;


            } else {

                try {
                    suggestions = await this.getGeminiSuggestions(prompt, executionId);
                    fallbackUsed = false;

                } catch (geminiError) {
                    console.error(`❌ [${executionId}] FALHA DO SISTEMA PRINCIPAL - Ativando sistema de backup:`, geminiError);
                    this.updateIAModal('🤖 Processando com IA avançada...', 'Alternando para sistema de backup inteligente...');

                    // Fallback automático
                    let iaFallback;
                    if (window.getIAFallbackInstance && typeof window.getIAFallbackInstance === 'function') {
                        iaFallback = window.getIAFallbackInstance();
                    } else if (window.IAFallback && typeof window.IAFallback === 'function') {
                        iaFallback = new window.IAFallback();
                    } else {
                        // Fallback: tentar carregar o script se não estiver disponível
                        console.warn(`⚠️ [${executionId}] Sistema de backup não encontrado, carregando...`);
                        await this.loadIAFallbackScript();
                        iaFallback = window.getIAFallbackInstance ? window.getIAFallbackInstance() : new window.IAFallback();
                    }
                    suggestions = await iaFallback.processWithFallbackAI(userConfig, historicalData);
                    fallbackUsed = true;


                }
            }

            this.updateIAModal('✨ Finalizando...', 'Preparando sugestões...');

            this.displaySuggestions(suggestions, userConfig);

            // ✅ RETORNAR OBJETO COM METADADOS PARA SISTEMA DE CRÉDITOS
            return {
                suggestions: suggestions,
                fallback_used: fallbackUsed,
                executionId: executionId,
                success: true
            };

        } catch (error) {
            console.error(`❌ [${executionId}] ERRO DURANTE A EXECUÇÃO:`, {
                message: error.message,
                stack: error.stack,
                name: error.name,
                errorObject: error
            });
            CommonHelpers.showError('❌ [IA SYSTEM] Erro ao gerar sugestões:', error);
            this.showErrorModal('Erro ao gerar sugestões', error.message);

            // ✅ RETORNAR OBJETO DE ERRO PARA EVITAR DÉBITO DE CRÉDITOS
            return {
                success: false,
                reason: 'execution_error',
                message: error.message,
                executionId: executionId
            };

        } finally {

            clearTimeout(safetyTimeout);

            this.isProcessing = false;

        }
    }

    // 📋 Obter configurações atuais do usuário
    getUserConfiguration() {
        try {
            const symbolSelect = CommonHelpers.getElement('symbol-select');
            const contractSelect = CommonHelpers.getElement('contract-select');
            const tradeTypeSelect = CommonHelpers.getElement('trade-type-select');
            const durationInput = CommonHelpers.getElement('duration-input');
            const durationUnitSelect = CommonHelpers.getElement('duration-unit-select');
            const predictionInput = CommonHelpers.getElement('prediction-input'); // Para contratos de dígitos (previsão 0-9)
            const barrierInput = CommonHelpers.getElement('barrier-input'); // Para contratos de barreira
            const barrierHighInput = CommonHelpers.getElement('barrier-high-input');
            const barrierLowInput = CommonHelpers.getElement('barrier-low-input');

            // 🎯 CORREÇÃO: Obter símbolo de múltiplas fontes com verificação segura
            const selectedSymbol = (symbolSelect && symbolSelect.value) ||
                window.selectedSymbol ||
                SessionManager.getSessionData('selected_symbol');

            if (!selectedSymbol) {
                return {
                    isValid: false,
                    error: 'Nenhum ativo foi selecionado. Por favor, selecione um ativo primeiro.'
                };
            }

            // 🎯 NOVA LÓGICA: Capturar configuração COMPLETA do usuário
            let finalContractType = null;
            let contractGroup = 'Desconhecido';
            let specificContractName = null;
            let predictionBarrier = null;

            // Mapeamento completo de contratos para grupos e nomes específicos
            const contractInfo = {
                'DIGITOVER': { group: 'Over/Under', name: 'Digit Over', isDigit: true },
                'DIGITUNDER': { group: 'Over/Under', name: 'Digit Under', isDigit: true },
                'CALL': { group: 'Rise/Fall', name: 'Rise', isDigit: false },
                'PUT': { group: 'Rise/Fall', name: 'Fall', isDigit: false },
                'DIGITDIFF': { group: 'Differ/Match', name: 'Differs', isDigit: true },
                'DIGITMATCH': { group: 'Differ/Match', name: 'Matches', isDigit: true },
                'DIGITEVEN': { group: 'Even/Odd', name: 'Even', isDigit: true },
                'DIGITODD': { group: 'Even/Odd', name: 'Odd', isDigit: true },
                'TOUCH': { group: 'Touch/No Touch', name: 'Touch', isDigit: false },
                'NOTOUCH': { group: 'Touch/No Touch', name: 'No Touch', isDigit: false }
            };

            // 1️⃣ PRIORIDADE: Verificar se há contrato específico selecionado (não BOTH)
            const selectedTradeType = tradeTypeSelect?.value;
            if (selectedTradeType && selectedTradeType !== 'BOTH' && contractInfo[selectedTradeType]) {
                finalContractType = selectedTradeType;
                contractGroup = contractInfo[selectedTradeType].group;
                specificContractName = contractInfo[selectedTradeType].name;

            }
            // 2️⃣ FALLBACK: Usar contract-select se disponível
            else if (contractSelect?.value && contractInfo[contractSelect.value]) {
                finalContractType = contractSelect.value;
                contractGroup = contractInfo[contractSelect.value].group;
                specificContractName = contractInfo[contractSelect.value].name;

            }
            // 3️⃣ MODO BOTH: Detectar com base na configuração ativa
            else if (selectedTradeType === 'BOTH') {
                // Para modo BOTH, tentar detectar o contrato com base na configuração atual
                const activeConfig = this.detectActiveContractFromConfiguration();
                if (activeConfig.contractType) {
                    finalContractType = activeConfig.contractType;
                    contractGroup = activeConfig.group;
                    specificContractName = activeConfig.name;

                } else {
                    console.warn('⚠️ [IA CONFIG] Modo BOTH sem contrato específico detectável');
                    contractGroup = 'Modo Ambos';
                    specificContractName = 'Ambos os contratos do grupo';
                }
            }

            if (!finalContractType && selectedTradeType !== 'BOTH') {
                return {
                    isValid: false,
                    error: 'Nenhum tipo de contrato foi selecionado. Por favor, selecione um tipo de contrato primeiro.'
                };
            }

            // 🎯 CAPTURAR PREVISÃO/BARREIRA ESPECÍFICA
            const isDigitContract = finalContractType ? contractInfo[finalContractType]?.isDigit : false;

            // 🔧 CORREÇÃO: Tentar múltiplas fontes para capturar previsão/barreira
            if (isDigitContract) {
                // 🎯 CRÍTICO: Verificar se o contrato REQUER previsão
                const contractsWithoutPrediction = ['DIGITODD', 'DIGITEVEN'];
                const requiresPrediction = !contractsWithoutPrediction.includes(finalContractType);

                if (requiresPrediction) {
                    // Contratos de dígitos que REQUEREM previsão (0-9)
                    let predictionValue = null;

                    // Fonte 1: Campo prediction-input
                    if (predictionInput && predictionInput.value !== '') {
                        predictionValue = parseInt(predictionInput.value);
                      
                    }
                    // Fonte 2: Campo barrier-input (alguns contratos de dígitos usam esse campo)
                    else if (barrierInput && barrierInput.value !== '') {
                        const barrierValue = parseInt(barrierInput.value);
                        if (barrierValue >= 0 && barrierValue <= 9) {
                            predictionValue = barrierValue;
                          
                        }
                    }
                    // Fonte 3: Verificar configuração salva
                    else {
                        try {
                            const savedConfig = ConfigurationsView.getSavedConfiguration();
                            if (savedConfig && savedConfig.prediction !== undefined) {
                                predictionValue = parseInt(savedConfig.prediction);
                              
                            }
                        } catch (error) {
                            console.warn('⚠️ [IA CONFIG] Erro ao obter configuração salva:', error);
                        }
                    }

                    // Validar e aplicar previsão (SEM fallback para 0)
                    if (predictionValue !== null && !isNaN(predictionValue) && predictionValue >= 0 && predictionValue <= 9) {
                        predictionBarrier = {
                            type: 'prediction',
                            value: predictionValue,
                            display: `Previsão: ${predictionValue}`
                        };
                     
                    } else {
                        console.warn(`⚠️ [IA CONFIG] Nenhuma previsão válida encontrada para ${finalContractType}`);
                        // NÃO definir predictionBarrier - deixar null para contratos que precisam mas não têm
                    }
                } 
            } else {
                // Contratos de barreira: capturar barreira(s)
                if (barrierHighInput && barrierHighInput.value !== '' && barrierLowInput && barrierLowInput.value !== '') {
                    // Barreira dupla
                    predictionBarrier = {
                        type: 'double_barrier',
                        high: parseFloat(barrierHighInput.value),
                        low: parseFloat(barrierLowInput.value),
                        display: `Barreiras: ${barrierLowInput.value} - ${barrierHighInput.value}`
                    };
                } else if (barrierInput && barrierInput.value !== '') {
                    // Barreira simples
                    predictionBarrier = {
                        type: 'single_barrier',
                        value: parseFloat(barrierInput.value),
                        display: `Barreira: ${barrierInput.value}`
                    };
                }
            }

            // Obter duração com verificação segura
            const duration = durationInput && durationInput.value ? parseInt(durationInput.value) : 1;
            const durationUnit = durationUnitSelect && durationUnitSelect.value ? durationUnitSelect.value : 't';
            const durationDisplay = `${duration}${durationUnit === 't' ? ' tick' + (duration > 1 ? 's' : '') :
                durationUnit === 's' ? ' segundo' + (duration > 1 ? 's' : '') :
                    durationUnit === 'm' ? ' minuto' + (duration > 1 ? 's' : '') :
                        ' ' + durationUnit}`;

            return {
                isValid: true,
                symbol: selectedSymbol,
                contractType: finalContractType,
                contractGroup: contractGroup,
                specificContractName: specificContractName || contractGroup,
                duration: duration,
                durationUnit: durationUnit,
                durationDisplay: durationDisplay,
                predictionBarrier: predictionBarrier,
                isDigitContract: isDigitContract,
                // NOVAS propriedades para o Gemini
                tradeMode: selectedTradeType === 'BOTH' ? 'Modo Ambos' : 'Contrato Específico'
            };

        } catch (error) {
            console.error('❌ [IA CONFIG] Erro ao obter configurações:', error);
            return {
                isValid: false,
                error: `Erro ao obter configurações: ${error.message}`
            };
        }
    }

    // 🔍 Detectar contrato ativo com base na configuração atual (para modo BOTH)
    detectActiveContractFromConfiguration() {
        try {
            // Verificar campos de previsão/barreira para detectar tipo
            const predictionInput = CommonHelpers.getElement('barrier-input');
            const barrierHighInput = CommonHelpers.getElement('barrier-high-input');
            const barrierLowInput = CommonHelpers.getElement('barrier-low-input');

            // Se há previsão (0-9), provavelmente é contrato de dígitos
            if (predictionInput && predictionInput.value !== '') {
                const predValue = parseInt(predictionInput.value);
                if (predValue >= 0 && predValue <= 9) {

                    // Esta é uma heurística básica - pode ser refinada
                    return {
                        contractType: 'DIGITDIFF', // Padrão para dígitos
                        group: 'Differ/Match',
                        name: 'Differs/Matches'
                    };
                }
            }

            // Se há barreiras, é contrato de barreira
            if ((barrierHighInput && barrierHighInput.value) ||
                (barrierLowInput && barrierLowInput.value) ||
                (predictionInput && predictionInput.value && !this.isDigitValue(predictionInput.value))) {
                return {
                    contractType: 'CALL', // Padrão para barreiras
                    group: 'Rise/Fall',
                    name: 'Rise/Fall'
                };
            }

            return { contractType: null, group: null, name: null };
        } catch (error) {
            console.error('❌ [IA CONFIG] Erro ao detectar contrato ativo:', error);
            return { contractType: null, group: null, name: null };
        }
    }

    // 🔢 Verificar se valor é dígito (0-9)
    isDigitValue(value) {
        const num = parseInt(value);
        return !isNaN(num) && num >= 0 && num <= 9;
    }

    // 🔍 Verificar se é contrato de dígitos
    isDigitContract(contractType) {
        const digitContracts = [
            'DIGITDIFF', 'DIGITMATCH', 'DIGITEVEN', 'DIGITODD',
            'DIGITOVER', 'DIGITUNDER'
        ];
        return digitContracts.includes(contractType);
    }

    // 📊 Obter dados históricos relevantes
    async getRelevantHistoricalData(userConfig) {
        try {
            const marketData = getMarketDataInstance(SessionManager.getLocalToken());

            if (!marketData) {
                throw new Error('Dados de mercado não disponíveis');
            }

            if (userConfig.isDigitContract) {
                // Para contratos de dígitos, obter últimos 100 dígitos
                return this.getLast100Digits(marketData, userConfig.symbol);
            } else {
                // Para outros contratos, obter últimos 100 preços
                return this.getLast100Prices(marketData, userConfig.symbol);
            }

        } catch (error) {
            console.error('❌ [IA HISTORICAL] Erro ao obter dados históricos:', error);
            throw new Error(`Falha ao obter histórico: ${error.message}`);
        }
    }

    // 🔢 Obter últimos 100 dígitos
    getLast100Digits(marketData, symbol) {
        try {
            const historyData = marketData.getFullHistory(symbol);

            if (!historyData.prices || historyData.prices.length === 0) {
                throw new Error('Histórico de preços não disponível');
            }

            // Extrair últimos dígitos dos preços
            const digits = historyData.prices.slice(-100).map(price => {
                const priceStr = price.toString();
                return parseInt(priceStr.charAt(priceStr.length - 1));
            });

            // Análise estatística dos dígitos
            const digitAnalysis = this.analyzeDigits(digits);

            return {
                type: 'digits',
                data: digits,
                count: digits.length,
                analysis: digitAnalysis
            };

        } catch (error) {
            console.error('❌ [IA DIGITS] Erro ao extrair dígitos:', error);
            throw error;
        }
    }

    // 💰 Obter últimos 100 preços
    getLast100Prices(marketData, symbol) {
        try {
            const historyData = marketData.getFullHistory(symbol);

            if (!historyData.prices || historyData.prices.length === 0) {
                throw new Error('Histórico de preços não disponível');
            }

            const prices = historyData.prices.slice(-100);

            // Análise estatística dos preços
            const priceAnalysis = this.analyzePrices(prices);

            return {
                type: 'prices',
                data: prices,
                count: prices.length,
                analysis: priceAnalysis
            };

        } catch (error) {
            console.error('❌ [IA PRICES] Erro ao obter preços:', error);
            throw error;
        }
    }

    // 📈 Analisar dígitos estatisticamente
    analyzeDigits(digits) {
        const counts = {};
        let evenCount = 0;
        let oddCount = 0;

        // Contar frequência de cada dígito
        digits.forEach(digit => {
            counts[digit] = (counts[digit] || 0) + 1;
            if (digit % 2 === 0) evenCount++;
            else oddCount++;
        });

        // Encontrar dígito mais e menos frequente
        const entries = Object.entries(counts);
        if (entries.length === 0) {
            return {
                totalCount: 0,
                digitCounts: {},
                mostFrequent: { digit: null, count: 0 },
                leastFrequent: { digit: null, count: 0 },
                evenPercentage: 0,
                oddPercentage: 0,
                sequences: { above5: 0, below5: 0 },
                lastDigits: []
            };
        }

        const mostFrequent = entries.reduce((a, b) => counts[a[0]] > counts[b[0]] ? a : b);
        const leastFrequent = entries.reduce((a, b) => counts[a[0]] < counts[b[0]] ? a : b);

        // Sequências
        const sequences = this.findDigitSequences(digits);

        return {
            totalCount: digits.length,
            digitCounts: counts,
            mostFrequent: { digit: parseInt(mostFrequent[0]), count: mostFrequent[1] },
            leastFrequent: { digit: parseInt(leastFrequent[0]), count: leastFrequent[1] },
            evenPercentage: Math.round((evenCount / digits.length) * 100),
            oddPercentage: Math.round((oddCount / digits.length) * 100),
            sequences: sequences,
            lastDigits: digits.slice(-10) // Últimos 10 dígitos
        };
    }

    // 📊 Analisar preços estatisticamente
    analyzePrices(prices) {
        if (!prices || prices.length === 0) {
            return {
                totalCount: 0,
                upPercentage: 0,
                downPercentage: 0,
                sequences: { maxUpSequence: 0, maxDownSequence: 0 },
                volatility: 0,
                support: 0,
                resistance: 0,
                currentPrice: 0,
                priceRange: 0,
                lastPrices: []
            };
        }

        const movements = [];
        let upCount = 0;
        let downCount = 0;

        // Analisar movimentos
        for (let i = 1; i < prices.length; i++) {
            const movement = prices[i] > prices[i - 1] ? 'up' : 'down';
            movements.push(movement);
            if (movement === 'up') upCount++;
            else downCount++;
        }

        // Sequências de movimento
        const sequences = this.findPriceSequences(movements);

        // Volatilidade
        const volatility = this.calculateVolatility(prices);

        // Suporte e resistência básicos
        const support = Math.min(...prices);
        const resistance = Math.max(...prices);
        const currentPrice = prices[prices.length - 1];

        return {
            totalCount: prices.length,
            upPercentage: movements.length > 0 ? Math.round((upCount / movements.length) * 100) : 0,
            downPercentage: movements.length > 0 ? Math.round((downCount / movements.length) * 100) : 0,
            sequences: sequences,
            volatility: volatility,
            support: support,
            resistance: resistance,
            currentPrice: currentPrice,
            priceRange: resistance - support,
            lastPrices: prices.slice(-10) // Últimos 10 preços
        };
    }

    // 📦 Carregar script IAFallback dinamicamente se não estiver disponível
    async loadIAFallbackScript() {
        return new Promise((resolve, reject) => {
            // Verificar se já existe
            if (document.querySelector('script[src*="iaFallback.js"]')) {

                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = 'js/iaFallback.js';
            script.async = true;

            script.onload = () => {

                resolve();
            };

            script.onerror = () => {
                console.error('❌ [IA FALLBACK LOADER] Erro ao carregar iaFallback.js');
                reject(new Error('Falha ao carregar script IAFallback'));
            };

            document.head.appendChild(script);
        });
    }

    // 🛡️ Carregar módulo de filtro de risco dinamicamente
    async loadRiskFilterModule() {
        return new Promise((resolve, reject) => {
            // Verificar se já existe
            if (document.querySelector('script[src*="risk-filter-module.js"]')) {

                // Aguardar um pouco para o script ser processado
                setTimeout(() => {
                    if (typeof window.RiskFilterModule !== 'undefined') {
                        window.riskFilterModule = new window.RiskFilterModule();

                        resolve();
                    } else {

                        resolve(); // Resolver mesmo assim para não bloquear
                    }
                }, 100);
                return;
            }


            const script = document.createElement('script');
            script.src = 'js/risk-filter-module.js';
            script.async = true;

            script.onload = () => {

                // Aguardar processamento e criar instância
                setTimeout(() => {
                    if (typeof window.RiskFilterModule !== 'undefined') {
                        window.riskFilterModule = new window.RiskFilterModule();

                    } else {
                        console.warn('🛡️ [RISK LOADER] Classe RiskFilterModule não encontrada após carregamento');
                    }
                    resolve();
                }, 100);
            };

            script.onerror = () => {
                console.error('❌ [RISK LOADER] Erro ao carregar risk-filter-module.js');
                reject(new Error('Falha ao carregar módulo de filtro de risco'));
            };

            document.head.appendChild(script);
        });
    }

    // 🔄 Encontrar sequências de dígitos
    findDigitSequences(digits) {
        const sequences = { above5: 0, below5: 0 };
        let currentSequence = { type: null, count: 0 };
        let maxSequences = { above5: 0, below5: 0 };

        digits.forEach(digit => {
            const isAbove5 = digit > 5;

            if (currentSequence.type === null) { // Inicializa a primeira sequência
                currentSequence.type = isAbove5 ? 'above5' : 'below5';
                currentSequence.count = 1;
            } else if (isAbove5 && currentSequence.type === 'above5') {
                currentSequence.count++;
            } else if (!isAbove5 && currentSequence.type === 'below5') {
                currentSequence.count++;
            } else { // Tipo de sequência mudou
                maxSequences[currentSequence.type] = Math.max(maxSequences[currentSequence.type], currentSequence.count);
                currentSequence = { type: isAbove5 ? 'above5' : 'below5', count: 1 };
            }
        });

        // Atualiza a última sequência encontrada
        if (currentSequence.type) {
            maxSequences[currentSequence.type] = Math.max(maxSequences[currentSequence.type], currentSequence.count);
        }

        return maxSequences;
    }

    // 📈 Encontrar sequências de movimento de preços
    findPriceSequences(movements) {
        let upSequence = 0;
        let downSequence = 0;
        let maxUpSequence = 0;
        let maxDownSequence = 0;

        movements.forEach(movement => {
            if (movement === 'up') {
                upSequence++;
                maxDownSequence = Math.max(maxDownSequence, downSequence);
                downSequence = 0;
            } else {
                downSequence++;
                maxUpSequence = Math.max(maxUpSequence, upSequence);
                upSequence = 0;
            }
        });

        // Captura a última sequência
        maxUpSequence = Math.max(maxUpSequence, upSequence);
        maxDownSequence = Math.max(maxDownSequence, downSequence);

        return {
            maxUpSequence: maxUpSequence,
            maxDownSequence: maxDownSequence
        };
    }

    // 📊 Calcular volatilidade básica
    calculateVolatility(prices) {
        if (prices.length < 2) return 0;

        const returns = [];
        for (let i = 1; i < prices.length; i++) {
            const priceChange = prices[i] - prices[i - 1];
            const percentageChange = prices[i - 1] !== 0 ? priceChange / prices[i - 1] : 0;
            returns.push(percentageChange);
        }

        if (returns.length === 0) return 0;

        const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
        const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length;

        return Math.sqrt(variance);
    }

    // 🧠 Construir prompt para o Gemini (OTIMIZADO)
    buildIAPrompt(userConfig, historicalData) {
        // Construir seção de configuração detalhada
        let configSection = `
===== CONFIGURAÇÃO COMPLETA DO USUÁRIO =====
- Ativo: ${userConfig.symbol}
- Grupo de Contratos: ${userConfig.contractGroup}`;

        // Adicionar tipo específico de contrato se disponível
        if (userConfig.specificContractName && userConfig.specificContractName !== userConfig.contractGroup) {
            configSection += `
- Tipo Trader Específico: ${userConfig.specificContractName} (${userConfig.contractType})`;
        } else if (userConfig.contractType) {
            configSection += `
- Tipo Trader: ${userConfig.contractType}`;
        }

        // Adicionar modo de trade
        if (userConfig.tradeMode) {
            configSection += `
- Modo de Trade: ${userConfig.tradeMode}`;
        }

        // Adicionar previsão/barreira detalhada
        if (userConfig.predictionBarrier) {
            if (userConfig.predictionBarrier.type === 'prediction') {
                configSection += `\n- Previsão do Dígito: ${userConfig.predictionBarrier.value} (estratégia deve focar no dígito ${userConfig.predictionBarrier.value})`;
            } else if (userConfig.predictionBarrier.type === 'double_barrier') {
                configSection += `\n- Barreira Superior: ${userConfig.predictionBarrier.high}\n- Barreira Inferior: ${userConfig.predictionBarrier.low}`;
            } else if (userConfig.predictionBarrier.type === 'single_barrier') {
                configSection += `\n- Barreira: ${userConfig.predictionBarrier.value}`;
            }
        } else if (userConfig.isDigitContract) {
            // Contratos de dígitos sem previsão (DIGITODD, DIGITEVEN)
            const contractsWithoutPrediction = ['DIGITODD', 'DIGITEVEN'];
            if (contractsWithoutPrediction.includes(userConfig.contractType)) {
                configSection += `\n- Tipo de Contrato: ${userConfig.contractType} (não requer previsão de dígito específico)`;
            } else {
                console.warn(`⚠️ [IA PROMPT] Contrato de dígito ${userConfig.contractType} sem previsão definida`);
            }
        }

        // Adicionar duração
        configSection += `
- Duração: ${userConfig.durationDisplay}`;

        const prompt = `
SISTEMA DE GERAÇÃO DE ESTRATÉGIAS DE TRADING - ${userConfig.symbol}

${configSection}

===== DADOS HISTÓRICOS (ÚLTIMOS 100 ${historicalData.type === 'digits' ? 'DÍGITOS' : 'PREÇOS'}) =====
${historicalData.type === 'digits' ? this.formatDigitAnalysisForPrompt(historicalData) : this.formatPriceAnalysisForPrompt(historicalData)}

==== VOCÊ É UM ALGORITMO DE GERAÇÃO DE ESTRATÉGIAS, ATUANDO COMO UM PROFISSIONAL EXPERT EM ANÁLISE QUANTITATIVA DE MERCADO. SUA TAREFA É: =====
Com base nos dados históricos fornecidos e na configuração do usuário, analise padrões estatísticos e de preço que possam POTENCIALIZAR GANHOS, e gere 3 estratégias coerentes e com base **REALISTA E ESTATÍSTICA** nos dados compartilhados. **É PROIBIDO** gerar regras genéricas ou baseadas APENAS nos exemplos. As regras devem **EXPLORAR VANTAGENS ESTATÍSTICAS** para potencializar os ganhos.

**LÓGICA DAS REGRAS (CRÍTICO):**
* Cada linha que começa com asterisco (\`*\`) é um novo GRUPO. Os grupos são combinados com a lógica **OU (OR)** (Qualquer grupo que for atendido dispara o trade).
* As regras dentro de um mesmo grupo (separadas por vírgula ",") são combinadas com a lógica **E (AND)** (Todas as regras do grupo devem ser atendidas simultaneamente para disparar o trade).

**DIRETRIZES DE RISCO E QUANTIDADE:**

1. **Conservadora** (BAIXO RISCO/ALTA PRECISÃO): Crie **3 grupos** de regras. Cada grupo deve ter no mínimo 2 e no máximo 4 regras (combinadas com AND).
2. **Moderada** (MÉDIO RISCO/BALANCEADA): Crie **2 grupos** de regras. Cada grupo deve ter no mínimo 1 e no máximo 3 regras (combinadas com AND).
3. **Agressiva** (ALTO RISCO/ALTA FREQUÊNCIA): Crie **1 grupo** de regra. O grupo deve ter apenas 1 regra simples (exclusivamente para maximizar a frequência).

===== FORMATO OBRIGATÓRIO DAS REGRAS =====
**CRÍTICO: AS REGRAS DEVEM SER CRIADAS EXCLUSIVAMENTE A PARTIR DA ANÁLISE DOS DADOS HISTÓRICOS. JAMAIS USE OS EXEMPLOS CORRETOS COMO BASE PARA A LÓGICA DA ESTRATÉGIA. USE-OS APENAS PARA O FORMATO DA SINTAXE.**
Use APENAS a sintaxe EXATA abaixo. NÃO use linguagem natural descritiva!

${userConfig.isDigitContract ? `
**REGRAS PARA CONTRATOS DE DÍGITOS:**

EXEMPLOS CORRETOS:
✅ * ultimos 3 digitos > 5
✅ * ultimos 5 digitos < 3
✅ * ultimos 4 digitos != 7
✅ * percentual dos digitos pares > 60%
✅ * percentual dos digitos impares < 40%
✅ * percentual dos digitos abaixo de 5 > 50%
✅ * percentual dos digitos acima de 5 > 70%
✅ * percentual dos digitos igual a 3 > 20%
✅ * padrão dos dígitos XXXOX

EXEMPLOS INCORRETOS (NÃO FAÇA ISSO):
❌ Se o dígito 4 não apareceu nos últimos 5 ticks
❌ Apostar que o próximo dígito será 6
❌ Quando a frequência do dígito 6 for superior a 10%
` : `
**REGRAS PARA CONTRATOS DE PREÇOS:**

EXEMPLOS CORRETOS:
✅ * rsi > 70
✅ * rsi < 30
✅ * rsi(14) > 60
✅ * sma(10) > sma(20)
✅ * sma(5) < sma(15)
✅ * ultimo tick > suporte
✅ * ultimo tick < resistencia
✅ * preco subiu 5 pontos
✅ * preco desceu 10 pontos
✅ * preco subiu 2%
✅ * 3 ticks consecutivos subindo
✅ * 4 ticks consecutivos descendo

EXEMPLOS INCORRETOS (NÃO FAÇA ISSO):
❌ Quando o RSI estiver em sobrecompra
❌ Se o preço romper a resistência
❌ Apostar em alta quando SMA cruzar
`}

**OPERADORES VÁLIDOS:** > (maior), < (menor), >= (maior ou igual), <= (menor ou igual), = (igual), != (diferente)

===== INSTRUÇÕES FINAIS =====
1. Analise os padrões nos dados históricos
2. Gere regras que EXPLORAM esses padrões identificados
3. Use APENAS a sintaxe exata dos exemplos acima
4. Cada linha de regra deve começar com *
5. Múltiplas regras na mesma linha são combinadas com E (AND)
6. Regras em linhas diferentes são combinadas com OU (OR)
7. Máximo 3-4 regras por estratégia

Responda APENAS com o JSON estruturado no formato exato abaixo (sem explicações adicionais):

{
  "strategies": [
    {
      "name": "Nome da Estratégia",
      "description": "Descrição da estratégia",
      "risk_level": "baixo|médio|alto",
      "rules_text": "* regra1, regra2\\n* regra3",
      "json_logic": { ... }
    }
  ],
  "analysis_summary": "Resumo da análise"
}

IMPORTANTE:
1. Use "strategies" (em inglês).
2. O campo "json_logic" DEVE conter a estrutura JSON executável completa (groups, parameters) correspondente ao "rules_text". Isso é CRÍTICO para a execução imediata.
`;

        return prompt;
    }

    // 📊 Formatar análise de dígitos para o prompt
    formatDigitAnalysisForPrompt(historicalData) {
        const analysis = historicalData.analysis;

        return `
ANÁLISE DOS ÚLTIMOS ${analysis.totalCount} DÍGITOS:

Frequência por Dígito:
${Object.entries(analysis.digitCounts).map(([digit, count]) =>
            `- Dígito ${digit}: ${count} vezes (${Math.round((count / analysis.totalCount) * 100)}%)`
        ).join('\n')}

Padrões Identificados:
- Dígito mais frequente: ${analysis.mostFrequent.digit} (${analysis.mostFrequent.count} vezes - ${Math.round((analysis.mostFrequent.count / analysis.totalCount) * 100)}%)
- Dígito menos frequente: ${analysis.leastFrequent.digit} (${analysis.leastFrequent.count} vezes - ${Math.round((analysis.leastFrequent.count / analysis.totalCount) * 100)}%)
- Dígitos pares: ${analysis.evenPercentage}%
- Dígitos ímpares: ${analysis.oddPercentage}%

Últimos 10 dígitos: [${analysis.lastDigits.join(', ')}]

Sequências máximas identificadas:
- Dígitos acima de 5: ${analysis.sequences.above5} consecutivos
- Dígitos abaixo de 5: ${analysis.sequences.below5} consecutivos
`;
    }

    // 💰 Formatar análise de preços para o prompt
    formatPriceAnalysisForPrompt(historicalData) {
        const analysis = historicalData.analysis;

        return `
ANÁLISE DOS ÚLTIMOS ${analysis.totalCount} PREÇOS:

Movimentação:
- Movimentos para cima: ${analysis.upPercentage}%
- Movimentos para baixo: ${analysis.downPercentage}%

Níveis de Preço:
- Preço atual: ${analysis.currentPrice}
- Suporte: ${analysis.support}
- Resistência: ${analysis.resistance}
- Range de preços: ${analysis.priceRange.toFixed(5)}
- Volatilidade: ${(analysis.volatility * 100).toFixed(2)}%

Sequências máximas:
- Máxima sequência de alta: ${analysis.sequences.maxUpSequence} ticks
- Máxima sequência de baixa: ${analysis.sequences.maxDownSequence} ticks

Últimos 10 preços: [${analysis.lastPrices.map(p => p.toFixed(5)).join(', ')}]
`;
    }

    // 🤖 Obter sugestões do Gemini
    async getGeminiSuggestions(prompt, executionId = 'UNKNOWN') {
        try {

            // 🚨 PROTEÇÃO: Verificar se já está fazendo chamada ao Gemini
            if (this.geminiCallInProgress) {
                console.warn(`⚠️ [${executionId}] GEMINI - Chamada já em progresso, aguardando...`);
                throw new Error('Chamada ao Gemini já em progresso');
            }

            this.geminiCallInProgress = true;

            if (!this.geminiInstance) {
                console.error(`❌ [${executionId}] Instância do Gemini não encontrada`);
                throw new Error('Instância do Gemini não encontrada');
            }


            // Verificar e carregar API Key se ainda não estiver carregada
            if (!this.geminiInstance.apiKey) {

                await this.geminiInstance.loadApiKeyFromSecrets();
                if (!this.geminiInstance.apiKey) {
                    console.error(`❌ [${executionId}] API Key do Gemini não encontrada após tentativa de load. Verifique os secrets.`);
                    throw new Error('API Key do Gemini não configurada. Verifique se GEMINI_API_KEY está definida nos Secrets.');
                }

            }


            // Verificar caracteres especiais problemáticos
            const hasNullChar = prompt.includes('\u0000');
            const hasControlChars = /[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(prompt);
            const hasInvalidUnicode = /[\uD800-\uDFFF]/.test(prompt);


            const response = await this.geminiInstance.callGeminiAPI(prompt);

            if (!response) {
                console.error(`❌ [${executionId}] Resposta vazia ou nula recebida do Gemini.`);
                throw new Error('Resposta vazia ou nula do Gemini');
            }

            let suggestions = response;

            // Se a resposta é um objeto com strategies, usar diretamente
            if (response && typeof response === 'object' && response.strategies) {

                suggestions = response;
            }

            else if (response && typeof response === 'object' && response.estrategias) {

                suggestions = {
                    strategies: response.estrategias,
                    analysis_summary: response.resumo_analise || response.analysis_summary || "Estratégia gerada com base na configuração atual e análise dos dados históricos"
                };
            }
            // Se a resposta é um objeto com groups (formato de tradução), converter
            else if (response && typeof response === 'object' && response.groups) {

                // Converter formato de tradução para formato de sugestões
                suggestions = {
                    strategies: [
                        {
                            name: "Estratégia Gerada pela IA",
                            description: "Estratégia baseada na análise dos dados históricos",
                            risk_level: "médio",
                            rules_text: this.convertGroupsToRulesText(response.groups)
                        }
                    ],
                    analysis_summary: "Estratégia gerada com base na configuração atual e análise dos dados históricos"
                };

            }
            // Se é string, tentar processar
            else if (typeof response === 'string') {

                try {
                    const parsedResponse = JSON.parse(response);
                    if (parsedResponse && parsedResponse.strategies) {
                        suggestions = parsedResponse;

                    } else {
                        console.error('❌ [IA DEBUG] String JSON não contém "strategies".');
                        throw new Error('String JSON não contém "strategies"');
                    }
                } catch (parseError) {
                    console.error(`❌ [${executionId}] Erro ao parsear resposta string do Gemini:`, parseError);
                    throw new Error('Resposta do Gemini não é um JSON válido');
                }
            }
            else {
                console.error(`❌ [${executionId}] Formato de resposta do Gemini não reconhecido:`, response);
                throw new Error('Formato de resposta não reconhecido do Gemini');
            }

            // Validação final da estrutura da resposta
            if (!suggestions || !suggestions.strategies || !Array.isArray(suggestions.strategies)) {
                console.error(`❌ [${executionId}] Estrutura de resposta inválida:`, suggestions);
                console.error(`🔍 [${executionId}] Estrutura recebida:`, JSON.stringify(response, null, 2));
                throw new Error('Estrutura de resposta inválida - "strategies" não encontrado ou não é um array');
            }

            return suggestions;

        } catch (error) {
            // 🔍 DEBUG: Log completo do erro em formato legível
            const errorDetails = {
                message: error.message,
                stack: error.stack,
                name: error.name,
                errorType: typeof error,
                timestamp: new Date().toISOString()
            };

            console.error(`❌ [${executionId}] ERRO COMPLETO CAPTURADO - DETALHES:`);
            console.error(JSON.stringify(errorDetails, null, 2));
            console.error(`❌ [${executionId}] ERRO COMPLETO CAPTURADO (OBJETO):`, errorDetails);
            console.error(`❌ [${executionId}] ERRO ORIGINAL:`, error);

            // 🚨 ATIVAR IA FALLBACK QUANDO GEMINI FALHA COMPLETAMENTE
            console.warn(`🔄 [${executionId}] Todos os modelos Gemini falharam, ativando IA Fallback...`);

            try {
                // Usar dados que foram obtidos anteriormente na função principal
                const userConfig = this.lastUserConfig;
                const historicalData = this.lastHistoricalData;

                if (userConfig && historicalData) {

                    // Atualizar modal para mostrar que está usando fallback
                    this.updateIAModal('🤖 IA Fallback Ativa', 'Processando com sistema inteligente alternativo...');

                    let iaFallback;
                    if (window.getIAFallbackInstance && typeof window.getIAFallbackInstance === 'function') {
                        iaFallback = window.getIAFallbackInstance();
                    } else if (window.IAFallback && typeof window.IAFallback === 'function') {
                        iaFallback = new window.IAFallback();
                    } else {
                        // Fallback: tentar carregar o script se não estiver disponível
                        console.warn(`⚠️ [${executionId}] IAFallback não encontrada no catch, tentando carregar...`);
                        await this.loadIAFallbackScript();
                        iaFallback = window.getIAFallbackInstance ? window.getIAFallbackInstance() : new window.IAFallback();
                    }
                    const fallbackSuggestions = await iaFallback.processWithFallbackAI(userConfig, historicalData);

                    return fallbackSuggestions;
                } else {
                    console.error(`❌ [${executionId}] Dados necessários para IA Fallback não disponíveis`);
                    throw new Error('Dados insuficientes para IA Fallback');
                }
            } catch (fallbackError) {
                console.error(`❌ [${executionId}] IA Fallback também falhou:`, fallbackError);
                CommonHelpers.showError('❌ [IA SYSTEM] Erro crítico: Tanto Gemini quanto IA Fallback falharam:', fallbackError);
                throw new Error(`Falha crítica na IA: ${error.message} (Fallback: ${fallbackError.message})`);
            }
        } finally {

            this.geminiCallInProgress = false;
        }
    }

    // 🔄 Converter grupos de regras para texto de regras
    convertGroupsToRulesText(groups) {
        if (!groups || !Array.isArray(groups)) {
            return "* Erro ao processar regras";
        }

        const rulesLines = groups.map(group => {
            if (!group.rules || !Array.isArray(group.rules)) {
                return "* Grupo inválido";
            }

            const groupRules = group.rules.map(rule => {
                if (rule.description) {
                    return rule.description;
                } else {
                    // Construir descrição baseada no tipo de regra
                    switch (rule.type) {
                        case 'last_digits':
                            return `ultimos ${rule.count} digitos ${rule.operator} ${rule.value}`;
                        case 'percentage':
                            return `percentual dos digitos ${rule.conditionType} ${rule.value || ''} ${rule.operator} ${rule.targetPercentage}%`;
                        case 'rsi':
                            return `rsi ${rule.operator} ${rule.value}`;
                        default:
                            return `regra ${rule.type}`;
                    }
                }
            }).join(', ');

            return `* ${groupRules}`;
        });

        return rulesLines.join('\n');
    }

    // ✨ Exibir sugestões para o usuário
    displaySuggestions(suggestions, userConfig) {

        this.hideIAModal();

        // Salvar sugestões para visualização posterior
        if (typeof MonitoringView !== 'undefined' && MonitoringView.saveSuggestions) {
            MonitoringView.saveSuggestions(suggestions, userConfig);
        }

        // 🔧 CORREÇÃO CRÍTICA: Garantir que estilos sejam aplicados ANTES de criar modal
        this.addSuggestionsStyles();

        const modal = document.createElement('div');
        modal.className = 'ia-suggestions-modal';

        // 🔧 CORREÇÃO: Aplicar estilos inline críticos imediatamente para evitar flash
        modal.style.cssText = `
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100vw !important;
            height: 100vh !important;
            z-index: 2147483647 !important;
            background: rgba(0, 0, 0, 0.8) !important;
            display: flex !important;
            justify-content: center !important;
            align-items: center !important;
            overflow-y: auto !important;
            visibility: visible !important;
            opacity: 1 !important;
            margin: 0 !important;
            padding: 20px !important;
            box-sizing: border-box !important;
        `;

        modal.innerHTML = `
            <div class="ia-suggestions-content">
                <div class="ia-suggestions-header">
                    <h2>🤖 Sugestões de Estratégias IA</h2>
                    <button class="ia-close-btn" onclick="this.closest('.ia-suggestions-modal').remove()">×</button>
                </div>

                <div class="ia-config-summary">
                    <h3>📋 Configuração Completa Analisada:</h3>
                    <p><strong>Ativo:</strong> ${userConfig.symbol} | <strong>Grupo:</strong> ${userConfig.contractGroup}</p>
                    ${userConfig.specificContractName && userConfig.specificContractName !== userConfig.contractGroup ?
                `<p><strong>Tipo Trader:</strong> ${userConfig.specificContractName} (${userConfig.contractType})</p>` :
                `<p><strong>Tipo Trader:</strong> ${userConfig.contractType || 'Não especificado'}</p>`}
                    <p><strong>Duração:</strong> ${userConfig.durationDisplay}</p>
                    ${userConfig.predictionBarrier ? `<p><strong>${userConfig.predictionBarrier.display}</strong></p>` : ''}
                    ${userConfig.tradeMode ? `<p><strong>Modo:</strong> ${userConfig.tradeMode}</p>` : ''}
                </div>

                <div class="ia-analysis-summary">
                    <h3>📊 Análise dos Dados:</h3>
                    <p>${suggestions.analysis_summary || 'Análise baseada nos últimos 100 ' + (userConfig.isDigitContract ? 'dígitos' : 'preços')}</p>
                </div>

                <div class="ia-strategies">
                    ${suggestions.strategies.map((strategy, index) => `
                        <div class="ia-strategy ${strategy.risk_level}">
                            <div class="ia-strategy-header">
                                <h3>${strategy.name}</h3>
                                <span class="ia-risk-badge ${strategy.risk_level}">${this.getRiskLabel(strategy.risk_level)}</span>
                            </div>
                            <p class="ia-strategy-description">${strategy.description}</p>
                            <div class="ia-strategy-rules">
                                <h4>📝 Regras:</h4>
                                <pre>${strategy.rules_text}</pre>
                            </div>
                            <div class="ia-strategy-actions">
                                <button class="ia-use-strategy-btn" onclick="window.iaSystem.useStrategy(\`${strategy.rules_text.replace(/`/g, '\\`')}\`)">
                                    ✅ Usar Esta Estratégia
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>

                <div class="ia-suggestions-footer">
                    <p class="ia-disclaimer">⚠️ <strong>Aviso:</strong> As estratégias são geradas por IA baseadas em análise histórica. Sempre analise e teste antes de usar com dinheiro real.</p>
                </div>
            </div>
        `;

        // 🔧 CORREÇÃO: Aplicar estilos críticos ao conteúdo também
        const content = modal.querySelector('.ia-suggestions-content');
        if (content) {
            content.style.cssText = `
                background: linear-gradient(135deg, #1a1a2e, #16213e) !important;
                border-radius: 15px !important;
                padding: 30px !important;
                max-width: 1000px !important;
                width: 90% !important;
                max-height: 85vh !important;
                overflow-y: auto !important;
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5) !important;
                border: 2px solid #4a9eff !important;
                position: relative !important;
                margin: 0 auto !important;
                display: block !important;
                transform: none !important;
                top: auto !important;
                left: auto !important;
                right: auto !important;
                bottom: auto !important;
            `;
        }

        document.body.appendChild(modal);

        // Expor sistema globalmente para os botões
        window.iaSystem = this;
    }

    // 🎨 Obter label do nível de risco
    getRiskLabel(riskLevel) {
        const labels = {
            'baixo': '🟢 Baixo Risco',
            'médio': '🟡 Médio Risco',
            'alto': '🔴 Alto Risco'
        };
        return labels[riskLevel] || '⚪ Risco Desconhecido';
    }

    // ✅ Usar estratégia selecionada
    useStrategy(rulesText) {
        try {
            // Validar entrada
            if (!rulesText || typeof rulesText !== 'string') {
                throw new Error('Texto da estratégia inválido');
            }

            const strategyTextArea = CommonHelpers.getElement('strategy-text');
            if (strategyTextArea) {
                // Limpar caracteres problemáticos
                let cleanRulesText = rulesText.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');

                // Formatação correta: organizar cada grupo em uma linha separada
                // Dividir por \n e processar cada linha
                const lines = cleanRulesText.split('\\n').map(line => line.trim()).filter(line => line.length > 0);

                // Garantir que cada linha que não inicia com * tenha um * adicionado
                const formattedLines = lines.map(line => {
                    if (!line.startsWith('*')) {
                        return '* ' + line;
                    }
                    return line;
                });

                // Juntar as linhas com quebras de linha reais
                const finalFormattedText = formattedLines.join('\n');

                strategyTextArea.value = finalFormattedText;

                // Disparar evento de mudança para atualizar sistema
                strategyTextArea.dispatchEvent(new Event('change'));

                // Fechar modal
                document.querySelector('.ia-suggestions-modal')?.remove();

                // Mostrar confirmação
                this.showSuccessMessage('✅ Estratégia aplicada com sucesso! Você pode iniciar o monitoramento agora.');

            } else {
                throw new Error('Campo de estratégia não encontrado');
            }
        } catch (error) {
            console.error('❌ [IA USE STRATEGY] Erro ao aplicar estratégia:', error);
            CommonHelpers.showError('❌ [IA SYSTEM] Erro ao aplicar estratégia:', error);
            alert(`Erro ao aplicar estratégia: ${error.message}`);
        }
    }

    // 💫 Mostrar modal de carregamento da IA
    showIAModal(title, description) {
        // Remover modal existente
        this.hideIAModal();

        // Garantir que os estilos CSS estejam carregados primeiro
        this.addProcessingStyles();

        const modal = document.createElement('div');
        modal.id = 'ia-processing-modal';
        modal.className = 'ia-processing-modal';

        modal.innerHTML = `
            <div class="ia-processing-content">
                <div class="ia-processing-animation">
                    <div class="ia-brain">🧠</div>
                    <div class="ia-pulse"></div>
                </div>
                <h2 class="ia-processing-title">${title}</h2>
                <p class="ia-processing-description">${description}</p>
                <div class="ia-processing-bar">
                    <div class="ia-processing-progress"></div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Garantir aplicação dos estilos após inserção no DOM
        setTimeout(() => {
            modal.style.cssText = `
                position: fixed !important;
                top: 0 !important;
                left: 0 !important;
                width: 100vw !important;
                height: 100vh !important;
                background: rgba(0, 0, 0, 0.8) !important;
                display: flex !important;
                justify-content: center !important;
                align-items: center !important;
                z-index: 2147483647 !important;
                margin: 0 !important;
                padding: 0 !important;
                overflow: hidden !important;
                box-sizing: border-box !important;
            `;

            const content = modal.querySelector('.ia-processing-content');
            if (content) {
                content.style.cssText = `
                    background: linear-gradient(135deg, #1a1a2e, #16213e) !important;
                    border-radius: 15px !important;
                    padding: 40px !important;
                    text-align: center !important;
                    border: 2px solid #4a9eff !important;
                    min-width: 400px !important;
                    max-width: 500px !important;
                    width: 450px !important;
                    position: relative !important;
                    transform: none !important;
                    box-sizing: border-box !important;
                `;
            }
        }, 10);

        // Forçar reflow para evitar problemas de layout
        modal.offsetHeight;
    }

    // 🔄 Atualizar modal de carregamento
    updateIAModal(title, description) {
        const modal = CommonHelpers.getElement('ia-processing-modal');
        if (modal) {
            const titleEl = modal.querySelector('.ia-processing-title');
            const descEl = modal.querySelector('.ia-processing-description');

            if (titleEl) titleEl.textContent = title;
            if (descEl) descEl.textContent = description;
        }
    }

    // ❌ Esconder modal de carregamento
    hideIAModal() {
        const modal = CommonHelpers.getElement('ia-processing-modal');
        if (modal) {
            modal.remove();
        }
    }

    // ❌ Mostrar modal de erro
    showErrorModal(title, message) {
        this.hideIAModal();

        const modal = document.createElement('div');
        modal.className = 'ia-error-modal';
        modal.innerHTML = `
            <div class="ia-error-content">
                <div class="ia-error-icon">❌</div>
                <h2>${title}</h2>
                <p>${message}</p>
                <button onclick="this.closest('.ia-error-modal').remove()"> Fechar</button>
            </div>
        `;

        document.body.appendChild(modal);

        // Auto-fechar após 10 segundos
        setTimeout(() => {
            modal.remove();
        }, 10000);
    }

    // ✅ Mostrar mensagem de sucesso
    showSuccessMessage(message) {
        const notification = document.createElement('div');
        notification.className = 'ia-success-notification';
        notification.innerHTML = `
            <div class="ia-success-content">
                ${message}
            </div>
        `;

        document.body.appendChild(notification);

        // Remover após 5 segundos
        setTimeout(() => {
            notification.remove();
        }, 5000);
    }

    // 🔔 Mostrar popup de confirmação para uso da IA
    async showIAUsageConfirmation(hoursLeft) {
        return new Promise((resolve) => {
            // 🕰️ Calcular tempo exato restante em formato horas:minutos
            const userInfo = UserLevelsManager.getUserInfo();
            const vipData = UserLevelsManager.getVipData(userInfo.loginId);

            let timeDisplay = `${hoursLeft} horas`;
            let afterUseDisplay = `${hoursLeft - 1} horas`;

            if (vipData && vipData.expiresAt) {
                const expiresAt = new Date(vipData.expiresAt);
                const now = new Date();
                const timeLeft = expiresAt - now;

                if (timeLeft > 0) {
                    const hours = Math.floor(timeLeft / (1000 * 60 * 60));
                    const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));

                    // Formato para exibição atual
                    if (hours > 0) {
                        timeDisplay = `${hours}:${minutes.toString().padStart(2, '0')} horas`;
                    } else {
                        timeDisplay = `${minutes} minutos`;
                    }

                    // Calcular tempo após desconto de 1 hora (3600000 ms)
                    const timeAfterDeduction = timeLeft - (60 * 60 * 1000);
                    if (timeAfterDeduction > 0) {
                        const afterHours = Math.floor(timeAfterDeduction / (1000 * 60 * 60));
                        const afterMinutes = Math.floor((timeAfterDeduction % (1000 * 60 * 60)) / (1000 * 60));

                        if (afterHours > 0) {
                            afterUseDisplay = `${afterHours}:${afterMinutes.toString().padStart(2, '0')} horas`;
                        } else {
                            afterUseDisplay = `${afterMinutes} minutos`;
                        }
                    } else {
                        afterUseDisplay = "0 minutos (plano expirará)";
                    }
                }
            }

            const modal = document.createElement('div');
            modal.className = 'ia-usage-confirmation-modal';
            modal.innerHTML = `
                <div class="ia-confirmation-content">
                    <div class="ia-confirmation-header">
                        <h2>🤖 Usar Sistema de IA</h2>
                    </div>
                    <div class="ia-confirmation-body">
                        <div class="ia-warning-icon">⚠️</div>
                        <h3>Confirmação de Uso</h3>
                        <p><strong>Seu plano VIP tem ${timeDisplay} restantes.</strong></p>
                        <p>O sistema de IA irá <strong style="color: #ff6b6b;">descontar 1 hora</strong> do seu tempo restante <strong>APENAS SE</strong> a operação for concluída com sucesso.</p>
                        <p>Em caso de sucesso, você terá <strong style="color: #4ecdc4;">${afterUseDisplay} restantes</strong>.</p>
                        <p style="color: #ffd93d; font-size: 0.9em;">⚠️ <strong>Se houver erro, nenhum tempo será descontado.</strong></p>
                        <div class="ia-confirmation-question">
                            <p><strong>Deseja continuar mesmo assim?</strong></p>
                        </div>
                    </div>
                    <div class="ia-confirmation-actions">
                        <button class="ia-confirm-btn" onclick="this.closest('.ia-usage-confirmation-modal').dataset.result = 'yes'; this.closest('.ia-usage-confirmation-modal').remove();">
                            ✅ Sim, Usar IA (-1 hora)
                        </button>
                        <button class="ia-cancel-btn" onclick="this.closest('.ia-usage-confirmation-modal').dataset.result = 'no'; this.closest('.ia-usage-confirmation-modal').remove();">
                            ❌ Cancelar
                        </button>
                    </div>
                </div>
            `;

            // Adicionar estilos do modal de confirmação
            this.addConfirmationStyles();

            document.body.appendChild(modal);

            // Aguardar resposta do usuário
            const checkResult = () => {
                if (modal.dataset.result) {
                    const result = modal.dataset.result === 'yes';
                    if (modal.parentElement) {
                        modal.remove();
                    }
                    resolve(result);
                } else {
                    setTimeout(checkResult, 100);
                }
            };

            setTimeout(checkResult, 100);

            // Auto-cancelar após 30 segundos
            setTimeout(() => {
                if (modal.parentElement && !modal.dataset.result) {
                    modal.dataset.result = 'no';
                    modal.remove();
                    resolve(false);
                }
            }, 30000);
        });
    }

    // ⏰ Descontar 1 hora do plano VIP
    deductOneHourFromPlan(loginId, vipData) {
        try {
            const currentExpiration = new Date(vipData.expiresAt);
            const newExpiration = new Date(currentExpiration.getTime() - (60 * 60 * 1000)); // -1 hora

            // Atualizar dados VIP
            const updatedVipData = {
                ...vipData,
                expiresAt: newExpiration.toISOString(),
                lastIAUsage: new Date().toISOString(),
                iaUsageCount: (vipData.iaUsageCount || 0) + 1
            };

            // Salvar no localStorage
            const vipKey = `vip_status_${loginId}`;
            localStorage.setItem(vipKey, JSON.stringify(updatedVipData));

            // Limpar cache de nível
            if (UserLevelsManager.levelCache) {
                UserLevelsManager.levelCache.delete(`user_level_${loginId}`);
                UserLevelsManager.levelCacheTime.delete(`user_level_${loginId}`);
            }

            // Atualizar contador regressivo no rodapé
            this.updateVipCountdownDisplay();

            // Mostrar notificação
            this.showTimeDeductionNotification();


        } catch (error) {
            console.error('❌ [IA DEDUCT TIME] Erro ao descontar tempo do plano:', error);
            CommonHelpers.showError('❌ [IA SYSTEM] Erro ao descontar tempo do plano:', error);
        }
    }

    // 🔄 Atualizar display do contador regressivo
    updateVipCountdownDisplay() {
        // Disparar evento para atualizar rodapé
        window.dispatchEvent(new CustomEvent('vipTimeUpdated'));
    }

    // 🔔 Mostrar notificação de desconto de tempo
    showTimeDeductionNotification() {
        const notification = document.createElement('div');
        notification.className = 'ia-time-deduction-notification';
        notification.innerHTML = `
            <div class="ia-deduction-content">
                <div class="ia-deduction-icon">✅</div>
                <h3>IA Concluída - Tempo Descontado</h3>
                <p><strong>1 hora foi descontada</strong> do seu plano VIP após o sucesso completo da IA.</p>
                <p>Verifique o tempo restante no rodapé.</p>
            </div>
        `;

        document.body.appendChild(notification);

        // Auto-remover após 5 segundos
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    }

    // 🎨 Estilos para o modal de confirmação
    addConfirmationStyles() {
        if (CommonHelpers.getElement('ia-confirmation-styles')) return;

        const style = document.createElement('style');
        style.id = 'ia-confirmation-styles';
        style.textContent = `
            .ia-usage-confirmation-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.8);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 1000000;
            }

            .ia-confirmation-content {
                background: linear-gradient(135deg, #1a1a2e, #16213e);
                border-radius: 15px;
                padding: 30px;
                max-width: 500px;
                width: 90%;
                text-align: center;
                border: 2px solid #ffd93d;
                animation: slideInUp 0.3s ease;
            }

            @keyframes slideInUp {
                from {
                    transform: translateY(50px);
                    opacity: 0;
                }
                to {
                    transform: translateY(0);
                    opacity: 1;
                }
            }

            .ia-confirmation-header h2 {
                color: #ffd93d;
                margin: 0 0 20px 0;
                font-size: 1.5em;
            }

            .ia-warning-icon {
                font-size: 3em;
                margin-bottom: 15px;
            }

            .ia-confirmation-body h3 {
                color: #fff;
                margin: 0 0 15px 0;
            }

            .ia-confirmation-body p {
                color: #e0e0e0;
                margin: 10px 0;
                line-height: 1.5;
            }

            .ia-confirmation-question {
                background: rgba(255, 217, 61, 0.1);
                border-radius: 8px;
                padding: 15px;
                margin: 20px 0;
                border: 1px solid #ffd93d;
            }

            .ia-confirmation-question p {
                color: #ffd93d;
                font-weight: bold;
                margin: 0;
            }

            .ia-confirmation-actions {
                display: flex;
                gap: 15px;
                margin-top: 25px;
            }

            .ia-confirm-btn, .ia-cancel-btn {
                flex: 1;
                padding: 12px 20px;
                border: none;
                border-radius: 8px;
                font-weight: bold;
                cursor: pointer;
                transition: all 0.3s ease;
                font-size: 0.9em;
            }

            .ia-confirm-btn {
                background: linear-gradient(135deg, #4ecdc4, #44bd87);
                color: white;
            }

            .ia-confirm-btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 5px 15px rgba(78, 205, 196, 0.4);
            }

            .ia-cancel-btn {
                background: linear-gradient(135deg, #ff6b6b, #ee5a24);
                color: white;
            }

            .ia-cancel-btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 5px 15px rgba(255, 107, 107, 0.4);
            }

            .ia-time-deduction-notification {
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 1000001;
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

            .ia-deduction-content {
                background: linear-gradient(135deg, #ff6b6b, #ee5a24);
                color: white;
                padding: 20px;
                border-radius: 12px;
                box-shadow: 0 8px 25px rgba(255, 107, 107, 0.4);
                text-align: center;
                min-width: 300px;
            }

            .ia-deduction-icon {
                font-size: 2.5em;
                margin-bottom: 10px;
            }

            .ia-deduction-content h3 {
                margin: 0 0 10px 0;
                font-size: 1.2em;
            }

            .ia-deduction-content p {
                margin: 5px 0;
                font-size: 0.9em;
                line-height: 1.4;
            }

            @media (max-width: 768px) {
                .ia-confirmation-content {
                    width: 95%;
                    padding: 20px;
                }

                .ia-confirmation-actions {
                    flex-direction: column;
                }
            }
        `;

        document.head.appendChild(style);
    }

    // 🎨 Adicionar estilos para o modal de processamento
    addProcessingStyles() {
        if (CommonHelpers.getElement('ia-processing-styles')) return;

        const style = document.createElement('style');
        style.id = 'ia-processing-styles';
        style.textContent = `
            .ia-processing-modal {
                position: fixed !important;
                top: 0 !important;
                left: 0 !important;
                width: 100vw !important;
                height: 100vh !important;
                background: rgba(0, 0, 0, 0.8) !important;
                display: flex !important;
                justify-content: center !important;
                align-items: center !important;
                z-index: 2147483647 !important;
                margin: 0 !important;
                padding: 0 !important;
                overflow: hidden !important;
                box-sizing: border-box !important;
            }

            .ia-processing-content {
                background: linear-gradient(135deg, #1a1a2e, #16213e) !important;
                border-radius: 15px !important;
                padding: 40px !important;
                text-align: center !important;
                border: 2px solid #4a9eff !important;
                min-width: 400px !important;
                max-width: 500px !important;
                width: 450px !important;
                position: relative !important;
                transform: none !important;
                box-sizing: border-box !important;
            }

            .ia-processing-animation {
                position: relative !important;
                margin-bottom: 20px !important;
                height: 80px !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
            }

            .ia-brain {
                font-size: 3em !important;
                animation: bounce 2s infinite !important;
            }

            .ia-pulse {
                position: absolute !important;
                width: 60px !important;
                height: 60px !important;
                border: 3px solid #4a9eff !important;
                border-radius: 50% !important;
                animation: pulse 2s infinite !important;
            }

            .ia-processing-title {
                color: #4a9eff !important;
                margin: 0 0 10px 0 !important;
                font-size: 1.4em !important;
            }

            .ia-processing-description {
                color: #e0e0e0 !important;
                margin: 0 0 20px 0 !important;
                line-height: 1.4 !important;
            }

            .ia-processing-bar {
                width: 100% !important;
                height: 6px !important;
                background: rgba(74, 158, 255, 0.2) !important;
                border-radius: 3px !important;
                overflow: hidden !important;
            }

            .ia-processing-progress {
                width: 100% !important;
                height: 100% !important;
                background: linear-gradient(90deg, #4a9eff, #74b9ff) !important;
                animation: progress 3s infinite !important;
            }

            @keyframes bounce {
                0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
                40% { transform: translateY(-10px); }
                60% { transform: translateY(-5px); }
            }

            @keyframes pulse {
                0% { transform: scale(0.8); opacity: 1; }
                100% { transform: scale(1.5); opacity: 0; }
            }

            @keyframes progress {
                0% { transform: translateX(-100%); }
                100% { transform: translateX(100%); }
            }
        `;

        document.head.appendChild(style);
    }

    // 🎨 Adicionar estilos para as sugestões
    addSuggestionsStyles() {
        if (CommonHelpers.getElement('ia-suggestions-styles')) return;

        const style = document.createElement('style');
        style.id = 'ia-suggestions-styles';
        style.textContent = `
            /* Estilos para o sistema de sugestões de IA */
            .ia-suggestions-modal, .ia-processing-modal, .ia-error-modal {
                position: fixed !important;
                top: 0 !important;
                left: 0 !important;
                width: 100% !important;
                height: 100% !important;
                z-index: 2147483647 !important;
                background: rgba(0, 0, 0, 0.8) !important;
                display: flex !important;
                justify-content: center !important;
                align-items: center !important;
                overflow-y: auto !important;
                visibility: visible !important;
                opacity: 1 !important;
            }

            .ia-suggestions-content {
                background: linear-gradient(135deg, #1a1a2e, #16213e);
                border-radius: 15px;
                padding: 30px;
                max-width: 1000px;
                width: 90%;
                max-height: 85vh;
                overflow-y: auto;
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
                border: 2px solid #4a9eff;
                position: relative;
                margin: 0 auto;
                display: block;
                animation: modalFadeIn 0.3s ease-out;
            }

            .ia-suggestions-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 25px;
                border-bottom: 2px solid #4a9eff;
                padding-bottom: 15px;
            }

            .ia-suggestions-header h2 {
                color: #4a9eff;
                margin: 0;
                font-size: 1.8em;
            }

            .ia-close-btn {
                background: none;
                border: none;
                font-size: 2em;
                color: #ff6b6b;
                cursor: pointer;
                padding: 0;
                width: 40px;
                height: 40px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .ia-close-btn:hover {
                background: rgba(255, 107, 107, 0.2);
            }

            .ia-config-summary, .ia-analysis-summary {
                background: rgba(74, 158, 255, 0.1);
                border-radius: 10px;
                padding: 15px;
                margin-bottom: 20px;
                border-left: 4px solid #4a9eff;
            }

            .ia-config-summary h3, .ia-analysis-summary h3 {
                color: #4a9eff;
                margin: 0 0 10px 0;
                font-size: 1.2em;
            }

            .ia-config-summary p, .ia-analysis-summary p {
                color: #e0e0e0;
                margin: 5px 0;
                line-height: 1.4;
            }

            .ia-strategies {
                display: grid;
                gap: 20px;
                margin-bottom: 25px;
            }

            .ia-strategy {
                background: rgba(255, 255, 255, 0.05);
                border-radius: 12px;
                padding: 20px;
                border: 2px solid transparent;
                transition: all 0.3s ease;
            }

            .ia-strategy.baixo {
                border-color: #4ecdc4;
                background: rgba(78, 205, 196, 0.1);
            }

            .ia-strategy.médio {
                border-color: #ffd93d;
                background: rgba(255, 217, 61, 0.1);
            }

            .ia-strategy.alto {
                border-color: #ff6b6b;
                background: rgba(255, 107, 107, 0.1);
            }

            .ia-strategy-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 15px;
            }

            .ia-strategy-header h3 {
                color: #ffffff;
                margin: 0;
                font-size: 1.3em;
            }

            .ia-risk-badge {
                padding: 5px 12px;
                border-radius: 20px;
                font-size: 0.8em;
                font-weight: bold;
            }

            .ia-risk-badge.baixo {
                background: #4ecdc4;
                color: #000;
            }

            .ia-risk-badge.médio {
                background: #ffd93d;
                color: #000;
            }

            .ia-risk-badge.alto {
                background: #ff6b6b;
                color: #fff;
            }

            .ia-strategy-description {
                color: #e0e0e0;
                margin-bottom: 15px;
                line-height: 1.5;
            }

            .ia-strategy-rules {
                margin-bottom: 20px;
            }

            .ia-strategy-rules h4 {
                color: #4a9eff;
                margin: 0 0 10px 0;
            }

            .ia-strategy-rules pre {
                background: rgba(0, 0, 0, 0.3);
                border-radius: 8px;
                padding: 15px;
                color: #fff;
                font-family: 'Courier New', monospace;
                font-size: 0.9em;
                line-height: 1.4;
                white-space: pre-wrap;
                border-left: 4px solid #4a9eff;
            }

            .ia-strategy-actions {
                display: flex;
                gap: 10px;
                flex-wrap: wrap;
            }

            .ia-use-strategy-btn, .ia-preview-strategy-btn {
                padding: 10px 20px;
                border: none;
                border-radius: 8px;
                font-weight: bold;
                cursor: pointer;
                transition: all 0.3s ease;
                flex: 1;
                min-width: 150px;
            }

            .ia-use-strategy-btn {
                background: linear-gradient(135deg, #4ecdc4, #44bd87);
                color: white;
            }

            .ia-use-strategy-btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 5px 15px rgba(78, 205, 196, 0.4);
            }

            .ia-preview-strategy-btn {
                background: linear-gradient(135deg, #74b9ff, #0984e3);
                color: white;
            }

            .ia-preview-strategy-btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 5px 15px rgba(116, 185, 255, 0.4);
            }

            .ia-suggestions-footer {
                border-top: 2px solid #4a9eff;
                padding-top: 15px;
            }

            .ia-disclaimer {
                color: #ffd93d;
                text-align: center;
                margin: 0;
                font-size: 0.9em;
                line-height: 1.4;
            }

            /* Modal de processamento */
            .ia-processing-modal {
                position: fixed !important;
                top: 0 !important;
                left: 0 !important;
                width: 100vw !important;
                height: 100vh !important;
                background: rgba(0, 0, 0, 0.8) !important;
                display: flex !important;
                justify-content: center !important;
                align-items: center !important;
                z-index: 2147483647 !important;
                margin: 0 !important;
                padding: 0 !important;
                overflow: hidden !important;
                box-sizing: border-box !important;
            }

            .ia-processing-content {
                background: linear-gradient(135deg, #1a1a2e, #16213e);
                border-radius: 15px;
                padding: 40px;
                text-align: center;
                border: 2px solid #4a9eff;
                min-width: 400px;
                max-width: 500px;
                width: 450px;
                position: relative;
                transform: none;
                box-sizing: border-box;
            }

            .ia-processing-animation {
                position: relative;
                margin-bottom: 20px;
                height: 80px;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .ia-brain {
                font-size: 3em;
                animation: bounce 2s infinite;
            }

            .ia-pulse {
                position: absolute;
                width: 60px;
                height: 60px;
                border: 3px solid #4a9eff;
                border-radius: 50%;
                animation: pulse 2s infinite;
            }

            .ia-processing-title {
                color: #4a9eff;
                margin: 0 0 10px 0;
            }

            .ia-processing-description {
                color: #e0e0e0;
                margin: 0 0 20px 0;
            }

            .ia-processing-bar {
                width: 100%;
                height: 6px;
                background: rgba(74, 158, 255, 0.2);
                border-radius: 3px;
                overflow: hidden;
            }

            .ia-processing-progress {
                width: 100%;
                height: 100%;
                background: linear-gradient(90deg, #4a9eff, #74b9ff);
                animation: progress 3s infinite;
            }

            /* Modal de erro */
            .ia-error-content {
                background: linear-gradient(135deg, #2d1b2d, #4a1a2e);
                border-radius: 15px;
                padding: 30px;
                text-align: center;
                border: 2px solid #ff6b6b;
                min-width: 300px;
            }

            .ia-error-icon {
                font-size: 3em;
                margin-bottom: 15px;
            }

            .ia-error-content h2 {
                color: #ff6b6b;
                margin: 0 0 15px 0;
            }

            .ia-error-content p {
                color: #e0e0e0;
                margin: 0 0 20px 0;
                line-height: 1.4;
            }

            .ia-error-content button {
                background: #ff6b6b;
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 8px;
                cursor: pointer;
                font-weight: bold;
            }

            /* Notificação de sucesso */
            .ia-success-notification {
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 1000001;
                animation: slideIn 0.5s ease;
            }

            .ia-success-content {
                background: linear-gradient(135deg, #4ecdc4, #44bd87);
                color: white;
                padding: 15px 20px;
                border-radius: 10px;
                box-shadow: 0 5px 15px rgba(78, 205, 196, 0.4);
                font-weight: bold;
                max-width: 400px;
            }

            /* Animações */
            @keyframes bounce {
                0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
                40% { transform: translateY(-10px); }
                60% { transform: translateY(-5px); }
            }

            @keyframes pulse {
                0% { transform: scale(0.8); opacity: 1; }
                100% { transform: scale(1.5); opacity: 0; }
            }

            @keyframes progress {
                0% { transform: translateX(-100%); }
                100% { transform: translateX(100%); }
            }

            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }

            /* Responsividade */
            @media (max-width: 768px) {
                .ia-suggestions-content {
                    padding: 20px;
                    width: 95%;
                }

                .ia-strategy-actions {
                    flex-direction: column;
                }

                .ia-use-strategy-btn, .ia-preview-strategy-btn {
                    min-width: auto;
                    width: 100%;
                }
            }
        `;

        document.head.appendChild(style);
    }
}

// 🌍 Instância global do sistema de IA
let iaSystemInstance = null;

// 🎯 Função para obter instância do sistema de IA
function getIASystemInstance() {
    if (!iaSystemInstance) {
        iaSystemInstance = new IASystem();
    }
    return iaSystemInstance;
}

// 🚀 Função global para ativar o sistema de IA (chamada pelo botão 🤖IA)
function activateIASystem() {
    const iaSystem = getIASystemInstance();
    iaSystem.generateRuleSuggestions();
}

// 🌐 Expor funções globalmente
window.getIASystemInstance = getIASystemInstance;
window.activateIASystem = activateIASystem;