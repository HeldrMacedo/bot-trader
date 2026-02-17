// js/admin-vip-manager.js
// Sistema de ativação manual VIP para pagamentos PIX
// APENAS PARA ADMINISTRADORES

class AdminVipManager {
    static isInitialized = false;

    // 💳 Planos disponíveis (sincronizados com VipPaymentModal)
    static PLANS = {
        basic: {
            name: 'BASIC',
            price: 29.90,
            credits: 10,
            description: 'Rodapé VIP + 10 Créditos'
        },
        trade: {
            name: 'TRADE',
            price: 59.90,
            credits: 30,
            description: 'Rodapé VIP + 30 Créditos'
        },
        pro: {
            name: 'PRO',
            price: 99.90,
            credits: 60,
            description: 'Rodapé VIP + 60 Créditos'
        }
    };

    // 📋 Obter informações de um plano
    static getPlanInfo(planKey) {
        return this.PLANS[planKey] || {
            name: planKey.toUpperCase(),
            price: 0,
            credits: 0,
            description: 'Plano personalizado'
        };
    }

    // 🔄 Fetch com retry para lidar com cold starts do Replit
    static async fetchWithRetry(url, options = {}, maxRetries = 3) {
        let lastError;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {

                const response = await fetch(url, options);

                // Se resposta OK, retornar
                if (response.ok) {

                    return response;
                }

                // Se erro 404/500, não vale a pena retry
                if (response.status === 404 || response.status >= 500) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                lastError = new Error(`HTTP ${response.status}`);

            } catch (error) {
                lastError = error;
                console.warn(`⚠️ [ADMIN VIP] Tentativa ${attempt} falhou:`, error.message);

                // Se não é a última tentativa, aguardar antes de tentar novamente
                if (attempt < maxRetries) {
                    const delay = attempt * 2000; // 2s, 4s, 6s

                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }

        // Se chegou aqui, todas as tentativas falharam
        throw lastError;
    }

    // 🔑 Inicializar sistema de administração VIP
    static initialize() {
        if (this.isInitialized) return;

        // Verificar se é admin
        const userInfo = UserLevelsManager.getUserInfo();
        if (!userInfo || !userInfo.isAdmin) {
            console.warn('🔒 [ADMIN VIP] Acesso negado - apenas administradores');
            return;
        }

        this.createAdminPanel();
        this.isInitialized = true;

    }

    // 🎛️ Criar painel de administração
    static createAdminPanel() {
        // Verificar se já existe
        if (document.getElementById('admin-vip-panel')) return;

        const panel = document.createElement('div');
        panel.id = 'admin-vip-panel';
        panel.innerHTML = `
            <div class="admin-panel-content">
                <div class="admin-panel-header">
                    <div class="header-left">
                        <h3>👑 Administração VIP</h3>
                        <span id="online-users-counter"></span>
                    </div>
                    <button class="close-admin-panel" onclick="AdminVipManager.hidePanel()">×</button>
                </div>
                <div class="admin-panel-body">
                    <div class="credit-management-section" style="background: #e3f2fd; border-color: #90caf9;">
                         <h4 style="color: #0d47a1;">💰 Gestão de Créditos (Rápido)</h4>
                         <div class="form-group">
                             <label>Login ID do usuário:</label>
                             <input type="text" id="credit-loginid" placeholder="Ex: CR1234567" />
                         </div>
                         <div class="form-group" style="display: flex; gap: 10px;">
                             <div style="flex: 1;">
                                 <label>Ação:</label>
                                 <select id="credit-action">
                                     <option value="add">➕ Adicionar Créditos</option>
                                     <option value="remove">➖ Remover Créditos</option>
                                 </select>
                             </div>
                             <div style="flex: 1;">
                                 <label>Quantidade:</label>
                                 <input type="number" id="credit-amount" placeholder="10" min="1" step="1" />
                             </div>
                         </div>
                         <button class="activate-vip-btn" style="background: linear-gradient(135deg, #007bff, #0056b3);" onclick="AdminVipManager.manageCredits()">
                             🚀 Executar Ação
                         </button>
                    </div>

                    <div class="manual-activation-section">
                        <h4>💳 Ativação Manual (PIX)</h4>
                        <div class="form-group">
                            <label>Login ID do usuário:</label>
                            <input type="text" id="manual-loginid" placeholder="Ex: CR1234567" />
                        </div>
                        <div class="form-group">
                            <label>Plano VIP:</label>
                            <select id="manual-plan">
                                <option value="basic">BASIC - R$ 29,90 (10 Créditos)</option>
                                <option value="trade" selected>TRADE - R$ 59,90 (30 Créditos)</option>
                                <option value="pro">PRO - R$ 99,90 (60 Créditos)</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Valor recebido (PIX):</label>
                            <input type="number" id="pix-amount" placeholder="19.90" step="0.01" />
                        </div>
                        <div class="form-group">
                            <label>Email do cliente:</label>
                            <input type="email" id="client-email" placeholder="cliente@exemplo.com" />
                        </div>
                        <div class="form-group">
                            <label>Observações:</label>
                            <textarea id="pix-notes" placeholder="Ex: PIX recebido em [data] - Comprovante anexado"></textarea>
                        </div>
                        <button class="activate-vip-btn" onclick="AdminVipManager.activateVipManually()">
                            ✅ Ativar VIP
                        </button>
                    </div>

                    <div class="vip-stats-section">
                        <h4>📊 Estatísticas VIP</h4>
                        <div id="vip-stats-content">
                            <button onclick="AdminVipManager.loadVipStats()">🔄 Carregar Estatísticas</button>
                            <button onclick="AdminVipManager.runDatabaseDiagnostics()" style="margin-left: 10px; background: #17a2b8;">🔍 Diagnóstico DB</button>
                            <button onclick="CommissionTracker.getInstance().startTracking()" style="margin-left: 10px; background: #28a745;">💰 Mostrar Comissões</button>
                        </div>
                    </div>

                    <div class="user-lookup-section">
                        <h4>🔍 Consultar Usuário</h4>
                        <div class="form-group lookup-controls">
                            <input type="text" id="lookup-loginid" placeholder="Login ID para consultar" />
                            <button onclick="AdminVipManager.lookupUser()">🔍 Consultar</button>
                        </div>
                        <div id="user-lookup-result"></div>
                    </div>

                    <div class="users-credits-section" style="margin-top: 20px; border-top: 2px solid #ffc107; padding-top: 15px;">
                        <h4 style="color: #856404;">💰 Usuários com Créditos</h4>
                        <button class="activate-vip-btn" style="background: linear-gradient(135deg, #ffc107, #e0a800); color: #333; margin-bottom: 10px;" onclick="AdminVipManager.loadUsersWithCredits()">
                            📋 Carregar Lista de Usuários
                        </button>
                        <div id="users-credits-list" style="max-height: 300px; overflow-y: auto;"></div>
                    </div>
                </div>
            </div>
        `;

        // Adicionar estilos
        this.addAdminStyles();

        // Adicionar ao body
        document.body.appendChild(panel);

        // Ocultar inicialmente
        panel.style.display = 'none';

        // Iniciar contador de usuários online
        this.startOnlineUserCounter();
    }

    // 🎨 Adicionar estilos do painel admin
    static addAdminStyles() {
        if (document.getElementById('admin-vip-styles')) return;

        const style = document.createElement('style');
        style.id = 'admin-vip-styles';
        style.textContent = `
            #admin-vip-panel {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                z-index: 10000;
                background: white;
                border-radius: 12px;
                box-shadow: 0 8px 32px rgba(0,0,0,0.3);
                max-width: 600px;
                width: 90%;
                max-height: 80vh;
                overflow-y: auto;
            }

            .admin-panel-content {
                padding: 0;
            }

            .admin-panel-header {
                background: linear-gradient(135deg, #dc3545, #fd7e14);
                color: white;
                padding: 15px 20px;
                border-radius: 12px 12px 0 0;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }

            .header-left {
                display: flex;
                align-items: center;
                gap: 15px;
            }

            .admin-panel-header h3 {
                margin: 0;
                font-size: 1.2em;
            }

            .online-users-counter {
                background-color: rgba(255, 255, 255, 0.2);
                padding: 6px 12px;
                border-radius: 6px;
                font-size: 0.9em;
                font-weight: bold;
                border: 1px solid rgba(255, 255, 255, 0.3);
            }

            .close-admin-panel {
                background: none;
                border: none;
                color: white;
                font-size: 1.5em;
                cursor: pointer;
                padding: 0;
                width: 30px;
                height: 30px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .close-admin-panel:hover {
                background: rgba(255,255,255,0.2);
            }

            .admin-panel-body {
                padding: 20px;
            }

            .manual-activation-section,
            .vip-stats-section,
            .user-lookup-section {
                margin-bottom: 25px;
                padding: 15px;
                border: 1px solid #ddd;
                border-radius: 8px;
                background: #f8f9fa;
            }

            .manual-activation-section h4,
            .vip-stats-section h4,
            .user-lookup-section h4 {
                margin: 0 0 15px 0;
                color: #333;
                font-size: 1.1em;
            }

            .form-group {
                margin-bottom: 15px;
            }

            .form-group label {
                display: block;
                margin-bottom: 5px;
                font-weight: bold;
                color: #555;
            }

            .form-group input,
            .form-group select,
            .form-group textarea {
                width: 100%;
                padding: 8px 12px;
                border: 1px solid #ddd;
                border-radius: 6px;
                font-size: 14px;
                box-sizing: border-box;
            }

            .form-group textarea {
                resize: vertical;
                min-height: 60px;
            }

            .activate-vip-btn {
                background: linear-gradient(135deg, #28a745, #20c997);
                color: white;
                border: none;
                padding: 12px 20px;
                border-radius: 8px;
                font-weight: bold;
                cursor: pointer;
                width: 100%;
                font-size: 16px;
                transition: all 0.3s ease;
            }

            .activate-vip-btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(40, 167, 69, 0.3);
            }

            .activate-vip-btn:disabled {
                background: #6c757d;
                cursor: not-allowed;
                transform: none;
                box-shadow: none;
            }

            #vip-stats-content {
                background: white;
                padding: 15px;
                border-radius: 6px;
                border: 1px solid #eee;
            }

            .stats-item {
                display: flex;
                justify-content: space-between;
                padding: 8px 0;
                border-bottom: 1px solid #eee;
            }

            .stats-item:last-child {
                border-bottom: none;
            }

            .stats-label {
                font-weight: bold;
                color: #666;
            }

            .stats-value {
                color: #333;
            }

            #user-lookup-result {
                margin-top: 15px;
                padding: 15px;
                background: white;
                border-radius: 6px;
                border: 1px solid #eee;
                min-height: 50px;
            }

            .user-info-item {
                display: flex;
                justify-content: space-between;
                padding: 5px 0;
                border-bottom: 1px solid #f0f0f0;
            }

            .user-info-label {
                font-weight: bold;
                color: #555;
            }

            .user-info-value {
                color: #333;
                font-weight: 600;
            }

            .lookup-controls {
                display: flex;
                gap: 10px;
            }

            .lookup-controls input {
                flex: 1;
            }

            .lookup-controls button {
                padding: 8px 15px;
                background: #007bff;
                color: white;
                border: none;
                border-radius: 6px;
                cursor: pointer;
            }

            .admin-vip-trigger {
                position: fixed !important;
                top: 20px !important;
                left: 20px !important;
                background: linear-gradient(135deg, #dc3545, #fd7e14) !important;
                color: white !important;
                border: none !important;
                padding: 0 !important;
                border-radius: 6px !important;
                cursor: pointer !important;
                font-weight: bold !important;
                font-size: 1.2em !important;
                z-index: 2147483647 !important;
                box-shadow: 0 4px 12px rgba(220, 53, 69, 0.5) !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                visibility: visible !important;
                opacity: 1 !important;
                width: 40px !important;
                height: 40px !important;
                border: 2px solid rgba(255,255,255,0.3) !important;
                line-height: 1 !important;
            }

            .admin-vip-trigger:hover {
                transform: translateY(-2px) scale(1.05) !important;
                box-shadow: 0 6px 16px rgba(220, 53, 69, 0.7) !important;
                background: linear-gradient(135deg, #fd7e14, #dc3545) !important;
            }

            #admin-sync-notification {
                position: fixed;
                top: 20px;
                right: 20px;
                background: linear-gradient(135deg, #28a745, #20c997);
                color: white;
                padding: 15px 20px;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(40, 167, 69, 0.3);
                z-index: 999999;
                font-weight: bold;
                animation: slideInRight 0.5s ease;
            }

            #admin-sync-notification small {
                font-size: 0.8em;
                opacity: 0.8;
            }

            .status-vip {
                    color: #28a745;
                    font-weight: bold;
                }

                .status-free {
                    color: #dc3545;
                    font-weight: bold;
                }

                .credits-display {
                    color: #007bff;
                    font-weight: bold;
                    font-size: 1.1em;
                    background: #e3f2fd;
                    padding: 2px 6px;
                    border-radius: 4px;
                }
                .credits-display.user-current-credits { /* Estilo específico para créditos na consulta */
                    color: #0056b3;
                    background: #d0e4ff;
                }

            @keyframes slideInRight {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes slideOutRight {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }

            @media (max-width: 768px) {
                .header-left {
                    flex-direction: column;
                    align-items: flex-start;
                    gap: 8px;
                }

                .online-users-counter {
                    font-size: 0.75em;
                    padding: 4px 8px;
                }

                .admin-panel-header {
                    padding: 12px 15px;
                }

                .admin-vip-trigger {
                    /* O trigger deve ser oculto em mobile ou ter um comportamento diferente,
                       como aparecer no menu hambúrguer. Por enquanto, vamos ocultá-lo. */
                    display: none !important;
                }
            }
        `;

        document.head.appendChild(style);
    }

    // 🎯 Mostrar painel de administração
    static showPanel() {
        const panel = document.getElementById('admin-vip-panel');
        if (panel) {
            panel.style.display = 'block';

            // Auto-carregar estatísticas
            setTimeout(() => this.loadVipStats(), 500);
        }
    }

    // 🚫 Ocultar painel de administração
    static hidePanel() {
        const panel = document.getElementById('admin-vip-panel');
        if (panel) {
            panel.style.display = 'none';
        }
    }

    // ✅ Ativar VIP manualmente (para PIX)
    static async activateVipManually() {
        const loginId = document.getElementById('manual-loginid').value.trim();
        const plan = document.getElementById('manual-plan').value;
        const pixAmount = document.getElementById('pix-amount').value;
        const clientEmail = document.getElementById('client-email').value.trim();
        const notes = document.getElementById('pix-notes').value.trim();

        // Validações
        if (!loginId) {
            alert('❌ Login ID é obrigatório');
            return;
        }

        if (!pixAmount || parseFloat(pixAmount) <= 0) {
            alert('❌ Valor do PIX deve ser maior que zero');
            return;
        }

        if (!clientEmail || !clientEmail.includes('@')) {
            alert('❌ Email do cliente é obrigatório e deve ser válido');
            return;
        }

        // Obter informações do plano selecionado
        const planInfo = this.getPlanInfo(plan);

        // Verificar se o valor recebido é suficiente para o plano
        if (parseFloat(pixAmount) < planInfo.price) {
            alert(`❌ O valor recebido (R$ ${pixAmount}) é menor que o preço do plano ${planInfo.name} (R$ ${planInfo.price}).`);
            return;
        }

        // Oferecer a opção de adicionar créditos extras
        let additionalCredits = 0;
        if (parseFloat(pixAmount) > planInfo.price) {
            const extraAmount = parseFloat(pixAmount) - planInfo.price;
            const confirmExtra = confirm(`O valor recebido (R$ ${pixAmount}) excede o preço do plano (R$ ${planInfo.price}). Deseja adicionar créditos extras com o valor excedente?\n\nValor excedente: R$ ${extraAmount.toFixed(2)}`);
            if (confirmExtra) {
                // Poderia implementar uma lógica para calcular créditos extras com base em um valor por crédito,
                // mas por enquanto, vamos apenas adicionar um crédito simbólico ou alertar o admin.
                // Para simplicidade, vamos apenas confirmar o valor total e deixar para o backend processar.
                // Se houver necessidade de cálculo de créditos extras, adicionar aqui.
            }
        }

        const confirmMsg = `Confirmar ativação VIP?\n\n` +
            `👤 Usuário: ${loginId}\n` +
            `💎 Plano: ${planInfo.name} (${planInfo.credits} créditos)\n` +
            `💰 Valor esperado: R$ ${planInfo.price.toFixed(2)}\n` +
            `💰 Valor recebido: R$ ${pixAmount}\n` +
            `📧 Email: ${clientEmail}\n` +
            `📝 Obs: ${notes || 'Nenhuma'}`;

        if (!confirm(confirmMsg)) {
            return;
        }

        try {
            // Desabilitar botão durante processo
            const btn = document.querySelector('.activate-vip-btn');
            btn.disabled = true;
            btn.textContent = '⏳ Ativando...';

            // Chamar endpoint de ativação manual
            const response = await fetch('/api/activate-vip', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    loginId: loginId,
                    plan: plan,
                    adminKey: prompt('🔑 Digite a chave de administrador:'),
                    paymentMethod: 'pix',
                    amount: parseFloat(pixAmount),
                    email: clientEmail,
                    userEmail: clientEmail, // Mantendo userEmail para compatibilidade com backend antigo
                    notes: notes,
                    processedBy: UserLevelsManager.getUserInfo()?.loginId || 'unknown',
                    processedAt: new Date().toISOString(),
                    // Adicionar informações de créditos se houver cálculo de extras
                    additionalCredits: additionalCredits, // Se implementado
                    originalPlanPrice: planInfo.price // Para referência
                })
            });

            const result = await response.json();

            if (result.success) {
                const planInfo = this.getPlanInfo(plan);
                alert(`✅ VIP ativado com sucesso!\n\n👤 Usuário: ${loginId}\n💎 Plano: ${planInfo.name}\n💰 Créditos adicionados: ${planInfo.credits + additionalCredits}\n💳 Valor: R$ ${pixAmount}`);

                // Limpar formulário
                document.getElementById('manual-loginid').value = '';
                document.getElementById('pix-amount').value = '';
                document.getElementById('client-email').value = '';
                document.getElementById('pix-notes').value = '';

                // Recarregar estatísticas
                this.loadVipStats();

                // 🚀 CRÍTICO: Forçar sincronização imediata após ativação manual
                if (typeof VipBackendSync !== 'undefined' && VipBackendSync.syncAfterManualActivation) {

                    VipBackendSync.syncAfterManualActivation(loginId, true); // isManualRecharge = true

                    // ✅ VERIFICAÇÃO ADICIONAL: Tentar múltiplas sincronizações
                    setTimeout(() => {

                        VipBackendSync.syncAfterManualActivation(loginId, true);
                    }, 3000);

                    setTimeout(() => {

                        VipBackendSync.syncAfterManualActivation(loginId, true);
                    }, 6000);
                } else {
                    console.warn(`⚠️ [ADMIN VIP] VipBackendSync não disponível, usuário precisará recarregar a página`);
                }

                // Forçar sincronização direta com o novo método
                const syncSuccess = await this.forceUserCreditsSync(loginId);
                if (!syncSuccess) {
                    alert(`⚠️ A sincronização automática falhou. O usuário pode precisar recarregar a página para ver os créditos atualizados.`);
                }



            } else {
                alert(`❌ Erro ao ativar VIP: ${result.error}`);
            }

        } catch (error) {
            console.error('❌ [ADMIN VIP] Erro na ativação manual:', error);
            alert('❌ Erro na comunicação com servidor');
        } finally {
            // Re-habilitar botão
            const btn = document.querySelector('.activate-vip-btn');
            btn.disabled = false;
            btn.textContent = '✅ Ativar VIP';
        }
    }

    // � GERENCIAR CRÉDITOS (NOVO)
    static async manageCredits() {
        const loginId = document.getElementById('credit-loginid').value.trim();
        const action = document.getElementById('credit-action').value;
        const amount = parseInt(document.getElementById('credit-amount').value);

        if (!loginId) {
            alert('❌ Login ID é obrigatório');
            return;
        }

        if (!amount || amount <= 0) {
            alert('❌ Quantidade deve ser maior que zero');
            return;
        }

        const actionText = action === 'add' ? 'ADICIONAR' : 'REMOVER';
        const confirmMsg = `Confirmar ação de CRÉDITOS?\n\n` +
            `👤 Usuário: ${loginId}\n` +
            `⚡ Ação: ${actionText} ${amount} créditos\n` +
            `🌍 Efeito: Alteração no saldo GLOBAL (todas as contas vinculadas)`;

        if (!confirm(confirmMsg)) {
            return;
        }

        const adminKey = prompt('🔑 Digite a chave de administrador:');
        if (!adminKey) return;

        try {
            const btn = document.querySelector('.credit-management-section button');
            if (btn) {
                btn.disabled = true;
                btn.textContent = '⏳ Processando...';
            }

            let endpoint = '';
            let bodyData = {};

            if (action === 'add') {
                endpoint = '/api/add-credits';
                bodyData = {
                    loginId: loginId,
                    amount: amount,
                    reason: 'admin_manual_add',
                    adminKey: adminKey
                };
            } else {
                endpoint = '/api/debit-credits';
                bodyData = {
                    loginId: loginId,
                    amount: amount,
                    reason: 'admin_manual_remove',
                    adminKey: adminKey
                };
            }

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(bodyData)
            });

            const result = await response.json();

            if (response.ok && result.success) {
                const newBalance = result.newBalance;
                alert(`✅ Sucesso!\n\n${actionText} ${amount} créditos.\nNovo saldo global: ${newBalance}`);

                // Limpar campos
                document.getElementById('credit-loginid').value = '';
                document.getElementById('credit-amount').value = '';

                // Tentar forçar atualização na interface se o usuário for o mesmo logado (apenas visual)
                if (typeof CreditsManager !== 'undefined') {
                    // Se for o próprio admin testando em si mesmo, atualiza display
                    const currentUser = SessionManager.getCurrentUser();
                    if (currentUser && currentUser.authorize && currentUser.authorize.loginid === loginId) {
                        CreditsManager.updateCreditsDisplay(newBalance);
                    }
                }

            } else {
                alert(`❌ Erro: ${result.error || result.message || 'Falha na operação'}`);
            }

        } catch (error) {
            console.error('❌ [ADMIN CREDITS] Erro:', error);
            alert('❌ Erro de comunicação com o servidor');
        } finally {
            const btn = document.querySelector('.credit-management-section button');
            if (btn) {
                btn.disabled = false;
                btn.textContent = '🚀 Executar Ação';
            }
        }
    }

    // �🔍 Executar diagnóstico de database
    static async runDatabaseDiagnostics() {
        try {
            const adminKey = prompt('🔑 Digite a chave de administrador:');
            if (!adminKey) return;

            const response = await fetch('/api/database-diagnostics', {
                headers: {
                    'Authorization': `Bearer ${adminKey}`
                }
            });

            const diagnostics = await response.json();

            if (diagnostics.error) {
                alert(`❌ Erro: ${diagnostics.error}`);
                return;
            }


            // Formatar resultado
            const result = `
📊 DIAGNÓSTICO DO DATABASE
========================

🗄️ Database:
  - Disponível: ${diagnostics.database.available ? '✅ SIM' : '❌ NÃO'}
  - Tipo: ${diagnostics.database.type}

🌍 Ambiente:
  - REPLIT_DB_URL: ${diagnostics.environment.hasReplitDbUrl ? '✅' : '❌'}
  - /tmp/replitdb: ${diagnostics.environment.hasTmpReplitdb ? '✅' : '❌'}
  - ADMIN_SECRET_KEY: ${diagnostics.environment.hasAdminSecret ? '✅' : '❌'}
  - NODE_ENV: ${diagnostics.environment.nodeEnv}

🚀 Deployment:
  - Modo: ${diagnostics.deployment.mode}
  - É deployment: ${diagnostics.deployment.isDeployment ? '✅ SIM' : '❌ NÃO'}
  ${diagnostics.deployment.dbUrlPreview ? `- DB URL Preview: ${diagnostics.deployment.dbUrlPreview}` : ''}
  ${diagnostics.deployment.dbUrlLength ? `- DB URL Length: ${diagnostics.deployment.dbUrlLength}` : ''}

⏰ Timestamp: ${new Date(diagnostics.timestamp).toLocaleString('pt-BR')}
            `.trim();

            alert(result);
            console.log(result);

        } catch (error) {
            console.error('❌ [DIAGNOSTICS] Erro:', error);
            alert('❌ Erro ao executar diagnóstico: ' + error.message);
        }
    }

    // 🚀 NOVO: Forçar sincronização de créditos para usuário específico
    static async forceUserCreditsSync(loginId) {
        try {

            // 1. Buscar dados do servidor para confirmar ativação
            const response = await fetch(`/api/vip/${loginId}`);
            const vipData = await response.json();

            if (vipData.success && vipData.isVip) {

                // 2. Buscar créditos atualizados
                const creditsResponse = await fetch(`/api/credits/${loginId}`);
                const creditsData = await creditsResponse.json();

                if (creditsData.success) {

                    // 3. Se usuário está logado no sistema, atualizar dados locais
                    const currentUser = SessionManager.getCurrentUser();
                    if (currentUser?.authorize?.loginid === loginId) {

                        // Limpar cache de créditos
                        const cacheKey = `credits_cache_${loginId}`;
                        localStorage.removeItem(cacheKey);

                        // Limpar cache de nível de usuário
                        if (typeof UserLevelsManager !== 'undefined') {
                            UserLevelsManager.levelCache?.delete(`user_level_${loginId}`);
                            UserLevelsManager.levelCacheTime?.delete(`user_level_${loginId}`);
                        }

                        // Atualizar VIP data local
                        const vipKey = `vip_status_${loginId}`;
                        const localVipData = {
                            isVip: true,
                            credits: creditsData.credits,
                            plan: vipData.vipData.plan,
                            purchaseDate: vipData.vipData.purchaseDate,
                            serverSourced: true,
                            lastServerSync: Date.now(),
                            syncedByAdmin: true
                        };
                        localStorage.setItem(vipKey, JSON.stringify(localVipData));

                        // Forçar atualização da interface
                        if (typeof UserLevelsManager !== 'undefined') {
                            UserLevelsManager.updateInterfaceForUserLevel();
                        }

                        // Disparar evento de atualização de créditos
                        window.dispatchEvent(new CustomEvent('creditsUpdated', {
                            detail: {
                                userId: loginId,
                                credits: creditsData.credits,
                                source: 'admin_activation'
                            }
                        }));

                        // Mostrar notificação de sucesso
                        this.showSyncSuccessNotification(loginId, creditsData.credits);
                    }
                } else {
                    console.error(`❌ [ADMIN VIP] Falha ao obter créditos para ${loginId}: ${creditsData.error}`);
                    return false;
                }
            } else {
                console.warn(`⚠️ [ADMIN VIP] Usuário ${loginId} não encontrado como VIP no servidor.`);
                // Poderia adicionar lógica aqui para desativar status VIP local se não encontrado no servidor
                return false;
            }

            return true;
        } catch (error) {
            console.error(`❌ [ADMIN VIP] Erro na sincronização forçada para ${loginId}:`, error);
            return false;
        }
    }

    // 🎉 Mostrar notificação de sincronização bem-sucedida
    static showSyncSuccessNotification(loginId, credits) {
        // Criar notificação temporária
        const notification = document.createElement('div');
        notification.id = 'admin-sync-notification';
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #28a745, #20c997);
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(40, 167, 69, 0.3);
            z-index: 999999;
            font-weight: bold;
            animation: slideInRight 0.5s ease;
        `;

        notification.innerHTML = `
            ✅ Créditos sincronizados!<br>
            <small>${loginId}: ${credits} créditos</small>
        `;

        // Adicionar animação CSS se não existir
        if (!document.getElementById('admin-sync-animation')) {
            const style = document.createElement('style');
            style.id = 'admin-sync-animation';
            style.textContent = `
                @keyframes slideInRight {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes slideOutRight {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(100%); opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }

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

    // 📊 Carregar estatísticas VIP
    static async loadVipStats() {
        const statsContent = document.getElementById('vip-stats-content');
        if (!statsContent) return;

        statsContent.innerHTML = '⏳ Carregando estatísticas...';

        try {
            // Verificar se VipBackendSync está disponível
            if (typeof VipBackendSync === 'undefined' || !VipBackendSync || !VipBackendSync.getVipStats) {
                console.warn('⚠️ [ADMIN VIP] VipBackendSync não disponível - usando endpoint direto');

                // Usar endpoint direto do servidor
                const response = await fetch('/api/vip/stats');
                const stats = await response.json();

                if (stats && stats.success) {
                    statsContent.innerHTML = `
                        <div class="stats-item">
                            <span class="stats-label">💎 VIPs Ativos:</span>
                            <span class="stats-value">${stats.activeCount || 0}</span>
                        </div>
                        <div class="stats-item">
                            <span class="stats-label">⏰ VIPs Expirados:</span>
                            <span class="stats-value">${stats.expiredCount || 0}</span>
                        </div>
                        <div class="stats-item">
                            <span class="stats-label">📦 Total de Registros:</span>
                            <span class="stats-value">${stats.totalKeys || 0}</span>
                        </div>
                    `;
                } else {
                    statsContent.innerHTML = '❌ Erro ao carregar estatísticas do servidor';
                }
                return;
            }

            const stats = await VipBackendSync.getVipStats();

            if (stats) {
                statsContent.innerHTML = `
                    <div class="stats-item">
                        <span class="stats-label">💎 VIPs Ativos:</span>
                        <span class="stats-value">${stats.activeVips || 0}</span>
                    </div>
                    <div class="stats-item">
                        <span class="stats-label">⏰ VIPs Expirados:</span>
                        <span class="stats-value">${stats.expiredVips || 0}</span>
                    </div>
                    <div class="stats-item">
                        <span class="stats-label">📦 Total de Registros:</span>
                        <span class="stats-value">${stats.totalKeys || 0}</span>
                    </div>
                    <div class="stats-item">
                        <span class="stats-label">📈 Total de Trades Reais:</span>
                        <span class="stats-value">${stats.totalRealTrades || 0}</span>
                    </div>
                `;
            } else {
                statsContent.innerHTML = '❌ Erro ao carregar estatísticas';
            }
        } catch (error) {
            console.error('❌ [ADMIN VIP] Erro ao carregar estatísticas:', error);
            statsContent.innerHTML = '❌ Erro na comunicação com servidor';
        }
    }

    // 🔍 Consultar usuário específico
    static async lookupUser() {
        const loginId = document.getElementById('lookup-loginid').value.trim();
        const resultDiv = document.getElementById('user-lookup-result');

        if (!loginId) {
            alert('❌ Digite um Login ID para consultar');
            return;
        }

        resultDiv.innerHTML = '⏳ Consultando usuário... (pode demorar se servidor estiver hibernando)';

        try {
            // Buscar dados do usuário e créditos com retry
            const [vipResponse, creditsResponse] = await Promise.all([
                this.fetchWithRetry(`/api/vip/${loginId}`),
                this.fetchWithRetry(`/api/credits/${loginId}`)
            ]);

            const vipData = await vipResponse.json();
            const creditsData = await creditsResponse.json();

            if (vipData.success && creditsData.success) {
                const userData = { ...vipData, credits: creditsData.credits }; // Combinar dados

                let statusDisplay;
                let expiryDateFormatted = 'N/A';
                let remainingDays = 0;

                if (vipData.isVip) {
                    statusDisplay = `<span class="status-vip">🟢 VIP ATIVO</span>`;
                    const expiresAt = new Date(vipData.vipData.expiresAt);
                    expiryDateFormatted = expiresAt.toLocaleDateString('pt-BR') + ', ' + expiresAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

                    const now = new Date();
                    const diffTime = expiresAt.getTime() - now.getTime();
                    remainingDays = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
                } else {
                    statusDisplay = `<span class="status-free">🔴 FREE</span>`;
                }

                const purchaseDateFormatted = (vipData.vipData && vipData.vipData.purchaseDate) ?
                    new Date(vipData.vipData.purchaseDate).toLocaleDateString('pt-BR') + ', ' + new Date(vipData.vipData.purchaseDate).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) :
                    'N/A';

                resultDiv.innerHTML = `
                    <div class="user-info-item">
                        <span class="user-info-label">Login ID:</span>
                        <span class="user-info-value">${loginId}</span>
                    </div>
                    <div class="user-info-item">
                        <span class="user-info-label">Status:</span>
                        <span class="user-info-value">${statusDisplay}</span>
                    </div>
                    <div class="user-info-item">
                        <span class="user-info-label">Plano:</span>
                        <span class="user-info-value">${vipData.vipData?.plan || 'N/A'}</span>
                    </div>
                    <div class="user-info-item">
                        <span class="user-info-label">Créditos Atuais:</span>
                        <span class="user-info-value credits-display user-current-credits">${userData.credits || 0}</span>
                    </div>
                    <div class="user-info-item">
                        <span class="user-info-label">Compra:</span>
                        <span class="user-info-value">${purchaseDateFormatted}</span>
                    </div>
                    <div class="user-info-item">
                        <span class="user-info-label">Expira:</span>
                        <span class="user-info-value">${expiryDateFormatted}</span>
                    </div>
                    <div class="user-info-item">
                        <span class="user-info-label">Dias Restantes:</span>
                        <span class="user-info-value">${remainingDays} dias</span>
                    </div>
                    <div class="user-info-item">
                        <span class="user-info-label">Ativado Por:</span>
                        <span class="user-info-value">${vipData.vipData?.activatedBy || 'N/A'}</span>
                    </div>
                `;
            } else {
                resultDiv.innerHTML = `❌ Erro ao buscar dados do usuário. VIP: ${vipData.error || 'N/A'}, Créditos: ${creditsData.error || 'N/A'}`;
            }

        } catch (error) {
            console.error('❌ [ADMIN VIP] Erro na consulta:', error);
            resultDiv.innerHTML = '❌ Erro na comunicação com servidor';
        }
    }

    // 📋 Carregar lista de usuários com créditos
    static async loadUsersWithCredits() {
        const listDiv = document.getElementById('users-credits-list');
        if (!listDiv) return;

        // 1. Verificar se a chave já está em memória ou localStorage para evitar prompt repetitivo
        let adminKey = localStorage.getItem('admin_key_cache');

        if (!adminKey) {
            // Se não tem chave, solicitar (ainda bloqueante, mas necessário na primeira vez)
            // Ideal seria um modal próprio, mas para resolver rápido:
            adminKey = prompt('Digite a chave de administrador:');
            if (!adminKey) {
                listDiv.innerHTML = '❌ Operação cancelada';
                return;
            }
            // Salvar temporariamente (segurança aceitável para sessão local de admin)
            localStorage.setItem('admin_key_cache', adminKey);
        }

        listDiv.innerHTML = '<div style="text-align:center; padding: 20px;">⏳ Consultando banco de dados... (isso pode levar alguns segundos)</div>';

        try {
            // Usar setTimeout para permitir que a UI desenhe o "Carregando" antes de travar no fetch se houver
            await new Promise(resolve => setTimeout(resolve, 50));

            const response = await this.fetchWithRetry('/api/admin/users-credits', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ adminKey })
            });

            const data = await response.json();

            if (data.success && data.users) {
                if (data.users.length === 0) {
                    let debugMsg = '';
                    if (data.debug && data.debug.length > 0) {
                        debugMsg = `<br><small style="color: #999; font-size: 0.8em; margin-top: 5px; display: block;">Debug: ${data.debug.join(', ')}</small>`;
                    }
                    listDiv.innerHTML = `<div style="text-align:center; padding: 20px; color: #666;">📭 Nenhum registro de créditos encontrado no banco de dados.${debugMsg}</div>`;
                    return;
                }

                let html = `
                    <div style="margin-bottom: 10px; font-weight: bold; color: #856404; display: flex; justify-content: space-between; align-items: center;">
                        <span>📊 Total: ${data.total} usuários</span>
                        <div>
                            <button onclick="AdminVipManager.resetSelectedUsers()" style="margin-right: 10px; padding: 4px 10px; background: #ffc107; border: 1px solid #d39e00; border-radius: 4px; cursor: pointer; font-weight: bold;" title="Resetar usuários selecionados">
                                🔄 Resetar Selecionados
                            </button>
                            <button onclick="AdminVipManager.loadUsersWithCredits()" style="font-size: 0.8em; padding: 4px 10px;">🔄 Atualizar</button>
                        </div>
                    </div>
                    <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                        <thead>
                            <tr style="background: #fff3cd; border-bottom: 2px solid #ffc107;">
                                <th style="padding: 8px; text-align: center; width: 30px;">
                                    <input type="checkbox" id="select-all-users" onclick="AdminVipManager.toggleSelectAll(this)">
                                </th>
                                <th style="padding: 8px; text-align: left;">Login ID</th>
                                <th style="padding: 8px; text-align: right;">Créditos</th>
                                <th style="padding: 8px; text-align: center;">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                `;

                // Ordenar por créditos (decrescente) no cliente também para garantir
                data.users.sort((a, b) => b.credits - a.credits);

                for (const user of data.users) {
                    const creditColor = user.credits > 60 ? '#dc3545' : (user.credits > 30 ? '#fd7e14' : '#28a745');
                    const lastUpdateFormatted = user.lastUpdate ? new Date(user.lastUpdate).toLocaleDateString('pt-BR') : 'N/A';

                    html += `
                        <tr style="border-bottom: 1px solid #ddd;">
                            <td style="padding: 6px; text-align: center;">
                                <input type="checkbox" class="user-select-cb" value="${user.loginId}">
                            </td>
                            <td style="padding: 6px;">
                                <strong>${user.loginId}</strong>
                                <br><small style="color: #666;">Atualizado: ${lastUpdateFormatted}</small>
                            </td>
                            <td style="padding: 6px; text-align: right; font-weight: bold; color: ${creditColor};">
                                ${user.credits}
                            </td>
                            <td style="padding: 6px; text-align: center;">
                                <button onclick="AdminVipManager.quickLookup('${user.loginId}')" style="padding: 2px 8px; font-size: 11px; cursor: pointer; border-radius: 4px; border: 1px solid #ccc;" title="Detalhes">
                                    🔍
                                </button>
                                <button onclick="AdminVipManager.deleteUserCredits('${user.loginId}')" style="padding: 2px 8px; font-size: 11px; cursor: pointer; border-radius: 4px; border: 1px solid #ff9999; background: #ffcccc; margin-left: 5px;" title="Excluir (Lixeira)">
                                    🗑️
                                </button>
                                <button onclick="AdminVipManager.resetUserCredits('${user.loginId}')" style="padding: 2px 8px; font-size: 11px; cursor: pointer; border-radius: 4px; border: 1px solid #ffc107; background: #fff3cd; margin-left: 5px;" title="Resetar Saldo (Zerar)">
                                    🔄
                                </button>
                            </td>
                        </tr>
                    `;
                }

                html += '</tbody></table>';

                // Adicionar resumo de alertas
                const highCredits = data.users.filter(u => u.credits > 60).length;
                if (highCredits > 0) {
                    html += `
                        <div style="margin-top: 10px; padding: 8px; background: #f8d7da; border-radius: 4px; color: #721c24;">
                            ⚠️ <strong>${highCredits}</strong> usuário(s) com saldo alto (>60)
                        </div>
                    `;
                }

                listDiv.innerHTML = html;

            } else {
                // Se falhar na chave, limpar cache
                if (data.error === 'Chave admin inválida') {
                    localStorage.removeItem('admin_key_cache');
                }
                listDiv.innerHTML = `<div style="color: red; padding: 10px;">❌ Erro: ${data.error || 'Falha desconhecida'}</div>`;
            }

        } catch (error) {
            console.error('❌ [ADMIN] Erro ao carregar usuários:', error);
            listDiv.innerHTML = `<div style="color: red; padding: 10px;">❌ Erro de conexão: ${error.message}</div>`;
        }
    }

    // 🔍 Consulta rápida de usuário (a partir da lista)
    static quickLookup(loginId) {
        document.getElementById('lookup-loginid').value = loginId;
        this.lookupUser();
        // Scroll para seção de consulta
        document.querySelector('.user-lookup-section').scrollIntoView({ behavior: 'smooth' });
    }

    // 🎛️ Criar botão trigger para administradores
    static createAdminTrigger() {
        // Verificar se é admin
        const userInfo = UserLevelsManager.getUserInfo();
        if (!userInfo || !userInfo.isAdmin) {

            return;
        }

        // 📱 NÃO criar botão em mobile (≤768px) - ele vai para o menu hambúrguer
        if (window.innerWidth <= 768) {

            return;
        }

        // Remover botão existente se houver
        const existingTrigger = document.querySelector('.admin-vip-trigger');
        if (existingTrigger) {
            existingTrigger.remove();
        }

        const trigger = document.createElement('button');
        trigger.className = 'admin-vip-trigger';
        trigger.innerHTML = '👑';
        trigger.onclick = () => {

            this.showPanel();
        };

        // Garantir que o botão seja adicionado após o DOM estar pronto
        if (document.body) {
            document.body.appendChild(trigger);

        } else {
            setTimeout(() => this.createAdminTrigger(), 1000);
        }
    }

    // ⚡ Iniciar contador de usuários online
    static startOnlineUserCounter() {
        const counterElement = document.getElementById('online-users-counter');
        if (!counterElement) return;

        let counterDisabled = false;

        // Função para buscar e atualizar o contador
        const updateCounter = async () => {
            if (counterDisabled) return;

            try {
                const response = await fetch('/api/online-users');

                // Se 503, desabilitar contador silenciosamente
                if (response.status === 503) {
                    counterDisabled = true;
                    if (this.onlineUserInterval) {
                        clearInterval(this.onlineUserInterval);
                        this.onlineUserInterval = null;
                    }
                    counterElement.textContent = '👥 N/A';
                    return;
                }

                if (!response.ok) {
                    counterElement.textContent = '👥 --';
                    return;
                }

                const data = await response.json();

                if (data && data.success && typeof data.count === 'number') {
                    counterElement.textContent = `👥 ${data.count} online`;
                } else {
                    counterElement.textContent = '👥 Offline';
                }
            } catch (error) {
                counterElement.textContent = '👥 --';
            }
        };

        // Atualizar imediatamente
        updateCounter();

        // Atualizar a cada 30 segundos
        if (this.onlineUserInterval) {
            clearInterval(this.onlineUserInterval);
        }
        this.onlineUserInterval = setInterval(updateCounter, 30000);
    }

    // 🗑️ Método para excluir créditos de usuário
    static async deleteUserCredits(loginId) {
        if (!confirm(`⚠️ PERIGO: Tem certeza que deseja apagar DEFINITIVAMENTE os registros de créditos do usuário "${loginId}"?\n\nIsso não pode ser desfeito.`)) {
            return;
        }

        const adminKey = localStorage.getItem('adminKey_cache');
        // Se chave não estiver no cache (raro se lista já carregou), pedir
        let keyToUse = adminKey;
        if (!keyToUse) {
            keyToUse = prompt('Confirme a Chave Admin para excluir:');
            if (!keyToUse) return;
        }

        try {
            const response = await this.fetchWithRetry('/api/admin/delete-user-credits', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ adminKey: keyToUse, loginId })
            });

            const data = await response.json();

            if (data.success) {
                alert(`✅ ${data.message}`);
                // Recarregar a lista para atualizar
                this.loadUsersWithCredits();
            } else {
                alert(`❌ Erro ao excluir: ${data.error}`);
            }
        } catch (error) {
            console.error('Erro ao excluir usuário:', error);
            alert('Erro ao excluir. Verifique o console.');
        }
    }

    // 🔄 Método para resetar créditos de usuário para ZERO
    static async resetUserCredits(loginId) {
        if (!confirm(`⚠️ Confirmar RESET de saldo?\n\nO saldo do usuário "${loginId}" será definido como ZERO (0).\n\nEssa ação é irreversível via interface (precisaria adicionar créditos manualmente depois).`)) {
            return;
        }

        const adminKey = localStorage.getItem('adminKey_cache') || localStorage.getItem('admin_key_cache');

        // Se chave não estiver no cache, pedir
        let keyToUse = adminKey;
        if (!keyToUse) {
            keyToUse = prompt('Confirme a Chave Admin para resetar:');
            if (!keyToUse) return;
        }

        try {
            const response = await this.fetchWithRetry('/api/admin/reset-user-credits', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ adminKey: keyToUse, loginId })
            });

            const data = await response.json();

            if (data.success) {
                alert(`✅ ${data.message}`);
                // Recarregar a lista para atualizar
                this.loadUsersWithCredits();
            } else {
                alert(`❌ Erro ao resetar: ${data.error}`);
            }
        } catch (error) {
            console.error('Erro ao resetar usuário:', error);
            alert('Erro ao resetar. Verifique o console.');
        }
    }

    // 🔄 Método para resetar usuários selecionados (Bulk)
    static async resetSelectedUsers() {
        // Coletar usuários selecionados
        const checkboxes = document.querySelectorAll('.user-select-cb:checked');
        const selectedUsers = Array.from(checkboxes).map(cb => cb.value);

        if (selectedUsers.length === 0) {
            alert('⚠️ Selecione pelo menos um usuário para resetar.');
            return;
        }

        if (!confirm(`⚠️ RESET EM MASSA\n\nVocê selecionou ${selectedUsers.length} usuários para ZERAR o saldo.\n\nTem certeza absoluta?`)) {
            return;
        }

        const adminKey = localStorage.getItem('adminKey_cache') || localStorage.getItem('admin_key_cache');

        // Se chave não estiver no cache, pedir
        let keyToUse = adminKey;
        if (!keyToUse) {
            keyToUse = prompt('Confirme a Chave Admin para resetar em massa:');
            if (!keyToUse) return;
        }

        try {
            const response = await this.fetchWithRetry('/api/admin/bulk-reset-user-credits', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ adminKey: keyToUse, loginIds: selectedUsers })
            });

            const data = await response.json();

            if (data.success) {
                alert(`✅ ${data.message}\n${data.details}`);
                // Recarregar a lista para atualizar
                this.loadUsersWithCredits();
            } else {
                alert(`❌ Erro no reset em massa: ${data.error}`);
            }
        } catch (error) {
            console.error('Erro no reset em massa:', error);
            alert('Erro ao resetar em massa. Verifique o console.');
        }
    }

    // ✅ Toggle Select All
    static toggleSelectAll(source) {
        const checkboxes = document.querySelectorAll('.user-select-cb');
        for (const checkbox of checkboxes) {
            checkbox.checked = source.checked;
        }
    }
}

// 🎯 CONTROLE DE FUNCIONALIDADES ADMIN: Inicializar recursos específicos quando for admin
window.addEventListener('userLevelChanged', (event) => {
    const userInfo = event.detail;

    if (userInfo && userInfo.isAdmin) {

        setTimeout(() => {
            AdminVipManager.initialize();
            AdminVipManager.createAdminTrigger();
        }, 1000);
    } else {
        // Para usuários não-admin, garantir que recursos admin não estejam disponíveis
        const adminTrigger = document.querySelector('.admin-vip-trigger');
        if (adminTrigger) {
            adminTrigger.remove();
        }
    }
});

// ✅ NOVO: Verificar se é admin após carregamento da página
window.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (typeof UserLevelsManager !== 'undefined') {
            const userInfo = UserLevelsManager.getUserInfo();
            if (userInfo && userInfo.isAdmin) {
                AdminVipManager.initialize();
                AdminVipManager.createAdminTrigger();
            }
        }
    }, 2000);
});

// ✅ NOVO: Verificar após AppManager estar pronto
window.addEventListener('AppManagerReady', () => {
    setTimeout(() => {
        if (typeof UserLevelsManager !== 'undefined') {
            const userInfo = UserLevelsManager.getUserInfo();
            if (userInfo && userInfo.isAdmin) {
                AdminVipManager.initialize();
                AdminVipManager.createAdminTrigger();
            }
        }
    }, 3000);
});

// Comando global para abrir painel (console)
window.openAdminVip = () => {
    if (typeof UserLevelsManager !== 'undefined' && UserLevelsManager.getUserInfo()?.isAdmin) {
        AdminVipManager.initialize();
        AdminVipManager.showPanel();
    } else {
        console.warn('🔒 Acesso negado - apenas administradores');
    }
};