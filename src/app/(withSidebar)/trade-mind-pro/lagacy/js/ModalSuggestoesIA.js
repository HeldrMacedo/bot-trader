// js/ModalSuggestoesIA.js
// Módulo responsável pelo modal de sugestões da IA

class ModalSuggestoesIA {
    static lastSuggestions = null;

    // ========================================
    // MÉTODOS PRINCIPAIS
    // ========================================

    // Inicializar o módulo
    static init() {
        this.addSuggestionsStyles();
    }

    // Obter últimas sugestões salvas
    static getLastSuggestions() {
        try {
            const sessionId = SessionManager.getUserSessionId();
            const savedData = localStorage.getItem(`ia_suggestions_${sessionId}`);

            if (savedData) {
                const parsedData = JSON.parse(savedData);
                this.lastSuggestions = parsedData;
                return parsedData;
            }

            // Fallback para chave alternativa
            const currentUser = SessionManager.getCurrentUser();
            if (currentUser && currentUser.authorize && currentUser.authorize.loginid) {
                const fallbackKey = `monitoring_ia_suggestions_${currentUser.authorize.loginid}`;
                const fallbackData = localStorage.getItem(fallbackKey);
                if (fallbackData) {
                    const parsedFallbackData = JSON.parse(fallbackData);
                    this.lastSuggestions = parsedFallbackData;
                    return parsedFallbackData;
                }
            }

            return null;
        } catch (error) {
            CommonHelpers.showError('❌ Erro ao obter sugestões salvas:', error);
            return null;
        }
    }

    // Salvar sugestões no localStorage
    static saveSuggestions(suggestions, userConfig) {
        try {
            const currentUser = SessionManager.getCurrentUser();
            if (!currentUser) {

                return;
            }

            const sessionId = SessionManager.getUserSessionId();
            const dataToSave = {
                suggestions: suggestions,
                userConfig: userConfig,
                timestamp: Date.now(),
                userId: currentUser.authorize.loginid
            };

            // Salvar com chave principal
            const primaryKey = `ia_suggestions_${sessionId}`;
            localStorage.setItem(primaryKey, JSON.stringify(dataToSave));

            // Salvar também com chave de fallback
            const fallbackKey = `monitoring_ia_suggestions_${currentUser.authorize.loginid}`;
            localStorage.setItem(fallbackKey, JSON.stringify(dataToSave));


            // Atualizar cache local
            this.lastSuggestions = dataToSave;

        } catch (error) {
            console.error('❌ [IA SUGGESTIONS] Erro ao salvar sugestões:', error);
        }
    }

    // Mostrar modal de sugestões
    static showSuggestionsModal(suggestions, userConfig, savedData = null) {

        if (!suggestions || !userConfig) {
            console.error('💡 [MODAL SUGESTÕES] Dados inválidos:', { suggestions, userConfig });
            this.showNoSuggestionsPopup();
            return;
        }

        // 🔧 CORREÇÃO: Garantir estilos ANTES de criar modal
        this.addSuggestionsStyles();

        // Armazenar sugestões atuais para acesso via índice
        this.currentSuggestions = suggestions;

        const modal = document.createElement('div');
        modal.className = 'ia-suggestions-modal';

        // 🔧 CORREÇÃO: Aplicar estilos críticos imediatamente
        modal.style.cssText = `
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            height: 100% !important;
            z-index: 2147483647 !important;
            background: rgba(0, 0, 0, 0.95) !important;
            backdrop-filter: blur(5px) !important;
            display: flex !important;
            justify-content: center !important;
            align-items: center !important;
            overflow-y: auto !important;
            padding: 20px !important;
            box-sizing: border-box !important;
            opacity: 1 !important;
            visibility: visible !important;
        `;
        modal.innerHTML = `
            <div class="ia-suggestions-content">
                <div class="ia-suggestions-header">
                    <h2>💡 Sugestões da IA</h2>
                    <button class="ia-close-btn" onclick="this.closest('.ia-suggestions-modal').remove()">×</button>
                </div>

                <div class="ia-config-summary">
                    <h3>📋 Configuração Completa Analisada:</h3>
                    <p><strong>Ativo:</strong> ${userConfig.symbol} | <strong>Grupo:</strong> ${userConfig.contractGroup} | <strong>Duração:</strong> ${userConfig.duration}${userConfig.durationUnit}</p>
                    ${userConfig.specificContractName && userConfig.specificContractName !== userConfig.contractGroup ?
                `<p><strong>Tipo Trader:</strong> ${userConfig.specificContractName} (${userConfig.contractType})</p>` :
                `<p><strong>Tipo Trader:</strong> ${userConfig.contractType || 'Não especificado'}</p>`}
                    ${this.buildPredictionBarrierDisplay(userConfig)}
                    ${userConfig.tradeMode ? `<p><strong>Modo:</strong> ${userConfig.tradeMode}</p>` : ''}
                    ${savedData ? `<p><strong>Gerado em:</strong> ${new Date(savedData.timestamp).toLocaleString('pt-BR')}</p>` : ''}
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
                                <button class="ia-use-strategy-btn" onclick="ModalSuggestoesIA.useStrategySuggestion(${index})">
                                    ✅ Usar Esta Estratégia
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>

                <div class="ia-suggestions-footer">
                    <p class="ia-disclaimer">⚠️ <strong>Aviso:</strong> Use estas sugestões como ponto de partida. Sempre teste suas estratégias antes de usar com valores reais.</p>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Animar entrada
        setTimeout(() => {
            modal.classList.add('show');
        }, 10);
    }

    // Mostrar sugestões anteriores
    static showPreviousSuggestions() {

        try {
            const savedData = this.getLastSuggestions();

            if (!savedData || !savedData.suggestions || !savedData.suggestions.strategies) {

                this.showNoSuggestionsPopup();
                return;
            }

            this.showSuggestionsModal(savedData.suggestions, savedData.userConfig, savedData);
        } catch (error) {
            console.error('❌ [IA SUGGESTIONS] Erro ao exibir sugestões:', error);
            CommonHelpers.showError('❌ Erro ao carregar sugestões da IA: ' + error.message);
        }
    }

    // ========================================
    // MÉTODOS DE AÇÃO
    // ========================================

    // Usar estratégia da sugestão
    // Usar estratégia da sugestão (agora aceita índice ou texto legado)
    static useStrategySuggestion(identifier) {
        try {
            let rulesText = '';
            let jsonLogic = null;

            // Verificar se é índice (novo formato) ou texto (legado)
            if (typeof identifier === 'number') {
                if (this.currentSuggestions && this.currentSuggestions.strategies && this.currentSuggestions.strategies[identifier]) {
                    const strategy = this.currentSuggestions.strategies[identifier];
                    rulesText = strategy.rules_text;
                    jsonLogic = strategy.json_logic;
                } else {
                    throw new Error('Estratégia não encontrada');
                }
            } else {
                // Legado: identifier é o texto da regra
                rulesText = identifier;
            }

            const strategyTextArea = CommonHelpers.getElement('strategy-text');
            if (strategyTextArea) {
                // Limpar caracteres problemáticos
                let cleanRulesText = rulesText.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');

                // 🔧 CORREÇÃO: Organizar automaticamente os asteriscos em linhas separadas
                cleanRulesText = this.organizeRuleGroups(cleanRulesText);

                // 💾 NOVO: Se houver JSON lógico pronto, salvar no cache para evitar retradução
                if (jsonLogic && window.regrasJsonManager) {
                    console.log('💾 [IA] Salvando JSON pré-gerado no cache...');
                    window.regrasJsonManager.saveCachedTranslation(cleanRulesText, jsonLogic);
                }

                strategyTextArea.value = cleanRulesText;
                strategyTextArea.dispatchEvent(new Event('input')); // Trigger save

                // Fechar modal
                document.querySelector('.ia-suggestions-modal')?.remove();

                // Mostrar feedback
                this.showFeedback('✅ Estratégia aplicada e organizada com sucesso!');
            }
        } catch (error) {
            CommonHelpers.showError('❌ Erro ao aplicar estratégia:', error);
            alert(`Erro ao aplicar estratégia: ${error.message}`);
        }
    }

    // 🔧 NOVO: Organizar grupos de regras automaticamente
    static organizeRuleGroups(text) {
        try {
            // Dividir por asteriscos para identificar grupos
            const parts = text.split('*');

            // Filtrar partes vazias e processar cada grupo
            const organizedGroups = [];

            for (let i = 0; i < parts.length; i++) {
                const part = parts[i].trim();

                // Pular partes vazias
                if (part.length === 0) {
                    continue;
                }

                // Adicionar asterisco no início e quebra de linha
                organizedGroups.push(`* ${part}`);
            }

            // Juntar grupos com quebras de linha
            const organizedText = organizedGroups.join('\n');


            return organizedText;

        } catch (error) {
            console.error('❌ [ORGANIZE] Erro ao organizar grupos:', error);
            // Em caso de erro, retornar texto original
            return text;
        }
    }



    // ========================================
    // POPUPS E ALERTAS
    // ========================================

    // Mostrar popup quando não há sugestões
    static showNoSuggestionsPopup() {
        const modal = document.createElement('div');
        modal.className = 'ia-error-modal';
        modal.innerHTML = `
            <div class="ia-error-content">
                <div class="ia-error-icon">📋</div>
                <h2>Nenhuma Sugestão Encontrada</h2>
                <p>Não foram geradas sugestões da IA até o momento. Para gerar sugestões personalizadas, clique no botão 🤖IA no rodapé.</p>
                <div class="no-suggestions-buttons">
                    <button class="close-modal-btn" onclick="this.closest('.ia-error-modal').remove()">Fechar</button>
                    <button class="ia-generate-btn" onclick="document.querySelector('#floating-ia-button')?.click(); this.closest('.ia-error-modal').remove();">🤖 Gerar Nova Sugestão</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Auto-fechar após 10 segundos
        setTimeout(() => {
            if (modal.parentNode) {
                modal.remove();
            }
        }, 10000);
    }

    // Mostrar popup de upgrade para VIP
    static showVipUpgradePopup() {
        const modal = document.createElement('div');
        modal.className = 'ia-error-modal';
        modal.innerHTML = `
            <div class="ia-error-content">
                <div class="ia-error-icon">🔒</div>
                <h2>Recurso VIP</h2>
                <p>As sugestões da IA são um recurso exclusivo para usuários VIP. Faça upgrade para ter acesso a análises inteligentes de mercado!</p>
                <div class="vip-upgrade-buttons">
                    <button onclick="this.closest('.ia-error-modal').remove()">Fechar</button>
                    <button class="vip-upgrade-button-popup" onclick="VipPaymentModal.show(); this.closest('.ia-error-modal').remove();">
                        💎 Fazer Upgrade VIP
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
    }

    // ========================================
    // UTILITÁRIOS
    // ========================================

    // Helper para construir a exibição de previsão/barreira
    static buildPredictionBarrierDisplay(userConfig) {
        if (!userConfig.predictionBarrier) {
            return '';
        }
        const barrier = userConfig.predictionBarrier;
        const label = barrier.type === 'prediction' ? 'Previsão' : 'Barreira';
        return `<p><strong>${label}:</strong> ${barrier.value}</p>`;
    }

    // Obter label do nível de risco
    static getRiskLabel(riskLevel) {
        const labels = {
            'baixo': '🟢 Baixo Risco',
            'médio': '🟡 Médio Risco',
            'alto': '🔴 Alto Risco'
        };
        return labels[riskLevel] || '⚪ Risco Desconhecido';
    }

    // Mostrar feedback visual
    static showFeedback(message, type = 'success') {
        const feedback = document.createElement('div');
        feedback.className = `ia-feedback ${type}`;
        feedback.innerHTML = message;
        feedback.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#28a745' : '#dc3545'};
            color: white;
            padding: 10px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 10001;
            font-weight: bold;
            animation: slideInRight 0.3s ease-out;
        `;

        document.body.appendChild(feedback);

        // Remover após 3 segundos
        setTimeout(() => {
            feedback.style.animation = 'slideOutRight 0.3s ease-in';
            setTimeout(() => feedback.remove(), 300);
        }, 3000);
    }

    // ========================================
    // ESTILOS CSS
    // ========================================

    // Adicionar estilos CSS para o modal
    static addSuggestionsStyles() {
        if (document.getElementById('modal-sugestoes-styles')) return;

        const style = document.createElement('style');
        style.id = 'modal-sugestoes-styles';
        style.textContent = `
            .suggestions-btn {
                background: linear-gradient(135deg, #6a11cb, #2575fc);
                color: white;
                border: none;
                padding: 8px 16px;
                border-radius: 8px;
                font-size: 0.9em;
                font-weight: bold;
                cursor: pointer;
                transition: all 0.3s ease;
                box-shadow: 0 2px 8px rgba(106, 17, 203, 0.3);
            }

            .suggestions-btn:hover {
                background: linear-gradient(135deg, #2575fc, #6a11cb);
                transform: translateY(-1px);
                box-shadow: 0 4px 12px rgba(106, 17, 203, 0.4);
            }

            .ia-suggestions-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.95);
                backdrop-filter: blur(5px);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 10000;
                opacity: 0;
                transition: opacity 0.3s ease;
                overflow-y: auto;
                padding: 20px;
                box-sizing: border-box;
            }

            .ia-suggestions-modal.show {
                opacity: 1;
            }

            .ia-suggestions-content {
                background: var(--modal-bg-dark);
                background-color: #0c1318; /* Fundo sólido */
                color: var(--modal-text);
                border-radius: 15px;
                padding: 30px;
                max-width: 1000px;
                width: 90%;
                max-height: 90%;
                overflow-y: auto;
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
                border: 1px solid var(--modal-border);
                animation: modalFadeIn 0.3s ease-out;
            }

            @keyframes modalFadeIn {
                from {
                    opacity: 0;
                    transform: scale(0.9) translateY(-20px);
                }
                to {
                    opacity: 1;
                    transform: scale(1) translateY(0);
                }
            }

            .ia-suggestions-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 25px;
                border-bottom: 1px solid var(--modal-border);
                padding-bottom: 15px;
                background: var(--modal-header-bg);
                margin: -30px -30px 25px -30px;
                padding: 20px 30px;
                border-radius: 15px 15px 0 0;
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
                padding: 5px;
                border-radius: 50%;
                transition: all 0.3s ease;
            }

            .ia-close-btn:hover {
                background: rgba(255, 107, 107, 0.1);
                transform: scale(1.1);
            }

            .ia-config-summary {
                background: var(--modal-input-bg);
                border-radius: 10px;
                padding: 20px;
                margin-bottom: 20px;
                border: 1px solid var(--modal-border);
            }

            .ia-config-summary h3 {
                color: #4a9eff;
                margin-top: 0;
                font-size: 1.2em;
            }

            .ia-config-summary p {
                color: #e0e0e0;
                margin: 8px 0;
                font-size: 0.95em;
            }

            .ia-analysis-summary {
                background: var(--modal-input-bg);
                border-radius: 10px;
                padding: 20px;
                margin-bottom: 20px;
                border: 1px solid var(--modal-border);
            }

            .ia-analysis-summary h3 {
                color: #ffc107;
                margin-top: 0;
                font-size: 1.2em;
            }

            .ia-analysis-summary p {
                color: #e0e0e0;
                margin: 8px 0;
                font-size: 0.95em;
            }

            .ia-strategies {
                display: grid;
                gap: 20px;
            }

            .ia-strategy {
                background: var(--modal-input-bg);
                border-radius: 12px;
                padding: 20px;
                border: 1px solid var(--modal-border);
                transition: all 0.3s ease;
            }

            .ia-strategy:hover {
                transform: translateY(-2px);
                box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
            }

            .ia-strategy.baixo {
                border-left: 4px solid #28a745;
            }

            .ia-strategy.médio {
                border-left: 4px solid #ffc107;
            }

            .ia-strategy.alto {
                border-left: 4px solid #dc3545;
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
                color: white;
            }

            .ia-risk-badge.baixo {
                background: #28a745;
            }

            .ia-risk-badge.médio {
                background: #ffc107;
                color: #000;
            }

            .ia-risk-badge.alto {
                background: #dc3545;
            }

            .ia-strategy-description {
                color: #b0b0b0;
                margin-bottom: 15px;
                font-size: 0.95em;
                line-height: 1.5;
            }

            .ia-strategy-rules {
                background: rgba(0, 0, 0, 0.3);
                border-radius: 8px;
                padding: 15px;
                margin-bottom: 15px;
            }

            .ia-strategy-rules h4 {
                color: #4a9eff;
                margin-top: 0;
                margin-bottom: 10px;
                font-size: 1em;
            }

            .ia-strategy-rules pre {
                color: #e0e0e0;
                margin: 0;
                font-family: 'Courier New', monospace;
                font-size: 0.9em;
                white-space: pre-wrap;
                word-wrap: break-word;
            }

            .ia-strategy-actions {
                display: flex;
                gap: 10px;
                flex-wrap: wrap;
            }

            .ia-use-strategy-btn {
                background: linear-gradient(135deg, #28a745, #20c997);
                color: white;
                border: none;
                padding: 8px 16px;
                border-radius: 6px;
                font-size: 0.9em;
                font-weight: bold;
                cursor: pointer;
                transition: all 0.3s ease;
                flex: 1;
                min-width: 120px;
            }

            .ia-use-strategy-btn:hover {
                background: linear-gradient(135deg, #20c997, #17a2b8);
                transform: translateY(-1px);
            }

            .ia-preview-strategy-btn {
                background: linear-gradient(135deg, #6c757d, #495057);
                color: white;
                border: none;
                padding: 8px 16px;
                border-radius: 6px;
                font-size: 0.9em;
                font-weight: bold;
                cursor: pointer;
                transition: all 0.3s ease;
                flex: 1;
                min-width: 120px;
            }

            .ia-preview-strategy-btn:hover {
                background: linear-gradient(135deg, #495057, #343a40);
                transform: translateY(-1px);
            }

            .ia-suggestions-footer {
                margin-top: 20px;
                padding-top: 20px;
                border-top: 1px solid rgba(255, 255, 255, 0.1);
            }

            .ia-disclaimer {
                color: #ffc107;
                font-size: 0.9em;
                margin: 0;
                text-align: center;
                background: rgba(255, 193, 7, 0.1);
                padding: 10px;
                border-radius: 6px;
                border: 1px solid rgba(255, 193, 7, 0.3);
            }

            .ia-error-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.95) !important;
                backdrop-filter: blur(5px);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 10001;
            }

            .ia-error-content {
                background: var(--modal-bg-dark);
                color: var(--modal-text);
                border-radius: 15px;
                padding: 40px;
                text-align: center;
                max-width: 500px;
                width: 90%;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
                border: 1px solid var(--modal-border);
            }

            .ia-error-icon {
                font-size: 4em;
                margin-bottom: 20px;
            }

            .ia-error-content h2 {
                color: var(--modal-text);
                margin-bottom: 20px;
            }

            .ia-error-content p {
                color: #8b9cb5;
                margin-bottom: 30px;
                line-height: 1.5;
            }

            .no-suggestions-buttons,
            .vip-upgrade-buttons {
                display: flex;
                gap: 15px;
                justify-content: center;
                flex-wrap: wrap;
            }

            .close-modal-btn {
                background: #6c757d;
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 8px;
                cursor: pointer;
                font-weight: bold;
                transition: all 0.3s ease;
            }

            .close-modal-btn:hover {
                background: #495057;
                transform: translateY(-1px);
            }

            .ia-generate-btn,
            .vip-upgrade-button-popup {
                background: linear-gradient(135deg, #6a11cb, #2575fc);
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 8px;
                cursor: pointer;
                font-weight: bold;
                transition: all 0.3s ease;
            }

            .ia-generate-btn:hover,
            .vip-upgrade-button-popup:hover {
                background: linear-gradient(135deg, #2575fc, #6a11cb);
                transform: translateY(-1px);
            }

            @keyframes slideInRight {
                from {
                    opacity: 0;
                    transform: translateX(100px);
                }
                to {
                    opacity: 1;
                    transform: translateX(0);
                }
            }

            @keyframes slideOutRight {
                from {
                    opacity: 1;
                    transform: translateX(0);
                }
                to {
                    opacity: 0;
                    transform: translateX(100px);
                }
            }

            @media (max-width: 768px) {
                .ia-suggestions-content {
                    padding: 20px;
                    margin: 10px;
                }

                .ia-strategy-actions {
                    flex-direction: column;
                }

                .ia-use-strategy-btn,
                .ia-preview-strategy-btn {
                    min-width: 100%;
                }
            }
        `;

        document.head.appendChild(style);
    }
}

// Tornar disponível globalmente
window.ModalSuggestoesIA = ModalSuggestoesIA;