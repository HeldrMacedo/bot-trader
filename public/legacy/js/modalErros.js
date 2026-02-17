// js/modalErros.js
// Sistema centralizado para exibição de modais de erro e validação de estratégias

class ModalErros {
    constructor() {
        this.sessionId = SessionManager?.getUserSessionId?.() || 'default';
        this.modalId = `error-modal-${this.sessionId}`;
        this.currentModal = null;
        this.currentCallback = null;
    }

    // Método principal para lidar com erros de validação do Gemini
    async handleGeminiValidationError(validationData, originalStrategy) {
        const { invalidRule, corrections } = validationData;

        // 🔧 FILTRAR sugestões que são idênticas à regra original
        const filteredCorrections = corrections.filter(correction => {
            const normalizedCorrection = correction.toLowerCase().trim().replace(/\s+/g, ' ');
            const normalizedRule = invalidRule.toLowerCase().trim().replace(/\s+/g, ' ');
            return normalizedCorrection !== normalizedRule;
        });

        // Se todas as correções foram filtradas, usar uma correção padrão
        const finalCorrections = filteredCorrections.length > 0 ? filteredCorrections : 
            ['Por favor, revise a regra manualmente para corrigir os problemas identificados.'];

        return new Promise((resolve) => {
            this.showGeminiErrorModal(invalidRule, finalCorrections, originalStrategy, resolve);
        });
    }

    // Método para exibir o modal de erro do Gemini
    showGeminiErrorModal(invalidRule, corrections, originalStrategy, callback) {
        this.hideModal(); // Remover modal anterior se existir

        const modal = document.createElement('div');
        modal.id = this.modalId;
        modal.className = 'gemini-error-modal-overlay';
        modal.innerHTML = this.generateGeminiErrorHTML(invalidRule, corrections, originalStrategy);

        // Adicionar estilos
        this.addGeminiErrorStyles();

        document.body.appendChild(modal);
        this.currentModal = modal;
        this.currentCallback = callback;

        this.attachGeminiErrorEventListeners(modal, callback);

        setTimeout(() => {
            modal.classList.add('show');
        }, 10);
    }

    // Gerar HTML do modal de erro do Gemini
    generateGeminiErrorHTML(invalidRule, corrections, originalStrategy) {
        const shortOriginal = originalStrategy.length > 150 ? originalStrategy.substring(0, 150) + '...' : originalStrategy;

        let correctionsHTML = '';
        if (corrections && corrections.length > 0) {
            correctionsHTML = `
                <div class="corrections-section">
                    <h4>💡 Sugestões de Correção:</h4>
                    <ul class="corrections-list">
                        ${corrections.map(correction => `<li>${correction}</li>`).join('')}
                    </ul>
                </div>
            `;
        }

        return `
            <div class="gemini-error-modal">
                <div class="modal-header error">
                    <h3>🤖 IA Gemini - Problema na Regra Detectado</h3>
                    <button class="modal-close-btn" data-action="cancel">×</button>
                </div>

                <div class="modal-body">
                    <div class="problem-description">
                        <p><strong>A IA Gemini identificou um problema na sua regra:</strong></p>
                        <div class="invalid-rule">${invalidRule}</div>
                    </div>

                    ${correctionsHTML}

                    <div class="strategy-info">
                        <h4>📝 Estratégia que contém a regra:</h4>
                        <div class="strategy-text original">${shortOriginal}</div>
                    </div>

                    <div class="modal-actions">
                        <button class="btn btn-primary" data-action="accept_correction">
                            ✅ Aplicar Correção Sugerida
                        </button>
                        <button class="btn btn-secondary" data-action="manual_correction">
                            ✏️ Corrigir Manualmente
                        </button>
                        <button class="btn btn-cancel" data-action="cancel">
                            ❌ Cancelar
                        </button>
                    </div>

                    <div class="help-text">
                        <p><em>💡 Dica: Escolha 'Aplicar Correção Sugerida' para aplicar a primeira sugestão da IA. Use 'Corrigir Manualmente' se preferir ajustar a regra por conta própria.</em></p>
                    </div>
                </div>
            </div>
        `;
    }

    // Event listeners para o modal de erro do Gemini
    attachGeminiErrorEventListeners(modal, resolve) {
        const buttons = modal.querySelectorAll('[data-action]');

        buttons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                const action = button.getAttribute('data-action');

                this.hideModal();

                // Se a ação for 'accept_correction', recuperamos a primeira correção sugerida
                if (action === 'accept_correction' && this.currentModal) {
                    const firstCorrection = this.currentModal.querySelector('.corrections-list li')?.textContent || '';
                    resolve({ action: 'retry_with_correction', correctedStrategy: firstCorrection });
                } else {
                    resolve({ action });
                }
            });
        });

        // Fechar com ESC
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                document.removeEventListener('keydown', handleKeyDown);
                this.hideModal();
                resolve({ action: 'cancel' });
            }
        };

        document.addEventListener('keydown', handleKeyDown);

        // Fechar clicando fora do modal
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.hideModal();
                resolve({ action: 'cancel' });
            }
        });
    }

    // Adicionar estilos para o modal de erro do Gemini
    addGeminiErrorStyles() {
        if (document.getElementById('gemini-error-styles')) return;

        const style = document.createElement('style');
        style.id = 'gemini-error-styles';
        style.textContent = `
            .gemini-error-modal-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0, 0, 0, 0.7);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 10000;
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                backdrop-filter: blur(5px);
                opacity: 0;
                transition: opacity 0.3s ease;
            }

            .gemini-error-modal-overlay.show {
                opacity: 1;
            }

            .gemini-error-modal {
                background: white;
                border-radius: 15px;
                max-width: 700px;
                width: 90%;
                max-height: 90vh;
                overflow-y: auto;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                transform: scale(0.9);
                transition: transform 0.3s ease;
            }

            .gemini-error-modal-overlay.show .gemini-error-modal {
                transform: scale(1);
            }

            .modal-header.error {
                background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);
                color: white;
            }

            .modal-header h3 {
                margin: 0;
                font-size: 1.4em;
                font-weight: bold;
            }

            .modal-close-btn {
                background: none;
                border: none;
                font-size: 24px;
                color: white;
                cursor: pointer;
                width: 30px;
                height: 30px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: background-color 0.3s ease;
            }

            .modal-close-btn:hover {
                background-color: rgba(255, 255, 255, 0.2);
            }

            .modal-body {
                padding: 30px;
            }

            .problem-description {
                margin-bottom: 25px;
                padding: 15px;
                background: #f8d7da;
                border-left: 4px solid #dc3545;
                border-radius: 5px;
            }

            .problem-description p {
                margin: 0;
                color: #721c24;
                line-height: 1.5;
            }

            .invalid-rule {
                margin-top: 10px;
                padding: 10px;
                background: #ffffff;
                border: 1px solid #f5c6cb;
                border-radius: 4px;
                font-family: monospace;
                color: #721c24;
                font-weight: bold;
            }

            .corrections-section {
                margin-bottom: 25px;
                padding: 15px;
                background: #d4edda;
                border-left: 4px solid #28a745;
                border-radius: 5px;
            }

            .corrections-section h4 {
                margin: 0 0 10px 0;
                color: #155724;
                font-size: 1.1em;
            }

            .corrections-list {
                margin: 0;
                padding-left: 20px;
            }

            .corrections-list li {
                margin-bottom: 8px;
                line-height: 1.4;
                color: #155724;
            }

            .strategy-info {
                margin-bottom: 20px;
            }

            .strategy-info h4 {
                color: #495057;
                margin-bottom: 10px;
            }

            .strategy-text {
                padding: 15px;
                font-family: 'Courier New', monospace;
                font-size: 0.9em;
                line-height: 1.4;
                background: #f8f9fa;
                min-height: 80px;
                white-space: pre-wrap;
                word-wrap: break-word;
                border: 1px solid #dee2e6;
                border-radius: 8px;
                overflow: hidden;
            }

            .modal-actions {
                display: flex;
                gap: 15px;
                justify-content: center;
                flex-wrap: wrap;
                margin-bottom: 20px;
            }

            .btn {
                padding: 12px 24px;
                border: none;
                border-radius: 8px;
                font-size: 1em;
                font-weight: bold;
                cursor: pointer;
                transition: all 0.3s ease;
                min-width: 140px;
            }

            .btn-primary {
                background: linear-gradient(135deg, #28a745, #20c997);
                color: white;
                box-shadow: 0 4px 15px rgba(40, 167, 69, 0.3);
            }

            .btn-primary:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(40, 167, 69, 0.4);
            }

            .btn-secondary {
                background: linear-gradient(135deg, #007bff, #0056b3);
                color: white;
                box-shadow: 0 4px 15px rgba(0, 123, 255, 0.3);
            }

            .btn-secondary:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(0, 123, 255, 0.4);
            }

            .btn-cancel {
                background: linear-gradient(135deg, #6c757d, #545b62);
                color: white;
                box-shadow: 0 4px 15px rgba(108, 117, 125, 0.3);
            }

            .btn-cancel:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(108, 117, 125, 0.4);
            }

            .help-text {
                text-align: center;
                color: #6c757d;
                font-style: italic;
                padding: 15px;
                background: #f8f9fa;
                border-radius: 5px;
            }

            .help-text p {
                margin: 0;
                line-height: 1.4;
            }
        `;

        document.head.appendChild(style);
    }


    // Método principal para lidar com erros de validação do Gemini
    async handleGeminiValidationError(validationData, originalStrategy) {
        const { invalidRule, corrections } = validationData;

        // 🔧 FILTRAR sugestões que são idênticas à regra original
        const filteredCorrections = corrections.filter(correction => {
            const normalizedCorrection = correction.toLowerCase().trim().replace(/\s+/g, ' ');
            const normalizedRule = invalidRule.toLowerCase().trim().replace(/\s+/g, ' ');
            return normalizedCorrection !== normalizedRule;
        });

        // Se todas as correções foram filtradas, usar uma correção padrão
        const finalCorrections = filteredCorrections.length > 0 ? filteredCorrections : 
            ['Por favor, revise a regra manualmente para corrigir os problemas identificados.'];

        return new Promise((resolve) => {
            this.showGeminiErrorModal(invalidRule, finalCorrections, originalStrategy, resolve);
        });
    }


    // Método genérico para mostrar erros de tradução
    showTranslationError(error, strategyValue) {
        return new Promise((resolve) => {
            this.hideModal();

            const modal = document.createElement('div');
            modal.id = this.modalId;
            modal.className = 'translation-error-modal-overlay';
            modal.innerHTML = this.generateTranslationErrorHTML(error, strategyValue);

            this.addTranslationErrorStyles();
            document.body.appendChild(modal);
            this.currentModal = modal;

            this.attachTranslationErrorEventListeners(modal, resolve);

            setTimeout(() => {
                modal.classList.add('show');
            }, 10);
        });
    }

    // HTML para modal de erro de tradução
    generateTranslationErrorHTML(error, strategyValue) {
        const errorMessage = error.message || 'Erro desconhecido';
        const shortStrategy = strategyValue && strategyValue.length > 100 
            ? strategyValue.substring(0, 100) + '...' 
            : strategyValue || 'Estratégia não informada';

        return `
            <div class="translation-error-modal">
                <div class="modal-header error">
                    <h3>❌ Erro na Tradução da Estratégia</h3>
                    <button class="modal-close-btn" data-action="close">×</button>
                </div>

                <div class="modal-body">
                    <div class="error-description">
                        <p><strong>Não foi possível traduzir sua estratégia:</strong></p>
                        <div class="error-message">${errorMessage}</div>
                    </div>

                    <div class="strategy-info">
                        <h4>📝 Estratégia que causou o erro:</h4>
                        <div class="strategy-text error">${shortStrategy}</div>
                    </div>

                    <div class="suggestions">
                        <h4>💡 Sugestões para correção:</h4>
                        <ul>
                            <li>Verifique se a sintaxe das regras está correta</li>
                            <li>Use operadores válidos: >, <, =, >=, <=, !=</li>
                            <li>Valores de dígitos devem estar entre 0 e 9</li>
                            <li>Contagem de dígitos deve estar entre 1 e 50</li>
                            <li>Consulte o manual de ajuda para exemplos</li>
                        </ul>
                    </div>

                    <div class="modal-actions">
                        <button class="btn btn-primary" data-action="close">
                            ✏️ Corrigir Estratégia
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    // Event listeners para modal de erro de tradução
    attachTranslationErrorEventListeners(modal, resolve) {
        const closeButtons = modal.querySelectorAll('[data-action="close"]');

        closeButtons.forEach(button => {
            button.addEventListener('click', () => {
                this.hideModal();
                resolve({ action: 'close' });
            });
        });

        // Fechar com ESC
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                document.removeEventListener('keydown', handleKeyDown);
                this.hideModal();
                resolve({ action: 'close' });
            }
        };

        document.addEventListener('keydown', handleKeyDown);

        // Fechar clicando fora
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.hideModal();
                resolve({ action: 'close' });
            }
        });
    }

    // Estilos para modal de erro de tradução
    addTranslationErrorStyles() {
        if (document.getElementById('translation-error-styles')) return;

        const style = document.createElement('style');
        style.id = 'translation-error-styles';
        style.textContent = `
            .translation-error-modal-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0, 0, 0, 0.7);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 10000;
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                backdrop-filter: blur(5px);
                opacity: 0;
                transition: opacity 0.3s ease;
            }

            .translation-error-modal-overlay.show {
                opacity: 1;
            }

            .translation-error-modal {
                background: white;
                border-radius: 15px;
                max-width: 600px;
                width: 90%;
                max-height: 90vh;
                overflow-y: auto;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                transform: scale(0.9);
                transition: transform 0.3s ease;
            }

            .translation-error-modal-overlay.show .translation-error-modal {
                transform: scale(1);
            }

            .modal-header.error {
                background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);
            }

            .error-description {
                margin-bottom: 20px;
                padding: 15px;
                background: #f8d7da;
                border-left: 4px solid #dc3545;
                border-radius: 5px;
            }

            .error-message {
                margin-top: 10px;
                padding: 10px;
                background: #ffffff;
                border: 1px solid #dc3545;
                border-radius: 4px;
                font-family: monospace;
                color: #721c24;
                font-weight: bold;
            }

            .strategy-info {
                margin-bottom: 20px;
            }

            .strategy-info h4 {
                color: #495057;
                margin-bottom: 10px;
            }

            .strategy-text.error {
                background: #fff5f5;
                border: 1px solid #feb2b2;
            }

            .suggestions {
                margin-bottom: 25px;
                padding: 15px;
                background: #d1ecf1;
                border-left: 4px solid #17a2b8;
                border-radius: 5px;
            }

            .suggestions h4 {
                color: #0c5460;
                margin: 0 0 10px 0;
            }

            .suggestions ul {
                margin: 0;
                padding-left: 20px;
            }

            .suggestions li {
                margin-bottom: 5px;
                color: #0c5460;
            }
        `;

        document.head.appendChild(style);
    }

    // Ocultar modal atual
    hideModal() {
        if (this.currentModal) {
            this.currentModal.classList.remove('show');
            setTimeout(() => {
                if (this.currentModal && this.currentModal.parentNode) {
                    this.currentModal.parentNode.removeChild(this.currentModal);
                }
                this.currentModal = null;
                this.currentCallback = null;
            }, 300);
        }
    }

    // Método estático para criar instância global
    static getInstance() {
        if (!window.modalErrosInstance) {
            window.modalErrosInstance = new ModalErros();
        }
        return window.modalErrosInstance;
    }
}

// Exportar instância global
window.ModalErros = ModalErros;
window.modalErrosInstance = ModalErros.getInstance();