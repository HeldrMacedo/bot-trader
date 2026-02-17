/**
 * Modal para mostrar problemas de validação da estratégia
 * e permitir que o usuário corrija ou force o envio para Gemini
 */
class StrategyValidationModal {
    /**
     * Mostra modal com problemas encontrados na validação
     * @param {Object} validationResult - Resultado da validação
     * @param {string} originalStrategy - Texto original da estratégia
     * @returns {Promise<Object>} - { action: 'edit'|'force'|'cancel', correctedStrategy?: string }
     */
    static async show(validationResult, originalStrategy) {
        return new Promise((resolve) => {
            const modal = this._createModal(validationResult, originalStrategy, resolve);
            document.body.appendChild(modal);

            // Focar no modal
            setTimeout(() => {
                const firstButton = modal.querySelector('button');
                if (firstButton) firstButton.focus();
            }, 100);
        });
    }

    static _createModal(validationResult, originalStrategy, resolve) {
        const overlay = document.createElement('div');
        overlay.id = 'strategy-validation-modal';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            animation: fadeIn 0.3s ease;
        `;

        const modal = document.createElement('div');
        modal.style.cssText = `
            background: #2c3e50;
            border-radius: 16px;
            padding: 32px;
            max-width: 600px;
            width: 90%;
            max-height: 80vh;
            overflow-y: auto;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
            animation: slideUp 0.3s ease;
        `;

        // Determinar severidade
        const severity = validationResult.valid ? 'warning' : 'error';
        const icon = severity === 'error' ? '⚠️' : '⚡';
        const title = severity === 'error' ? 
            'Problemas Críticos Detectados' : 
            'Sugestões de Melhoria';

        modal.innerHTML = `
            <style>
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes slideUp {
                    from { transform: translateY(50px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }

                .validation-modal-header {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    margin-bottom: 24px;
                    padding-bottom: 16px;
                    border-bottom: 2px solid #e9ecef;
                }

                .validation-modal-icon {
                    font-size: 48px;
                    filter: drop-shadow(0 2px 4px rgba(0,0,0,0.1));
                }

                .validation-modal-title {
                    flex: 1;
                }

                .validation-modal-title h2 {
                    margin: 0 0 8px 0;
                    font-size: 24px;
                    color: ${severity === 'error' ? '#dc3545' : '#fd7e14'};
                }

                .validation-modal-title p {
                    margin: 0;
                    font-size: 14px;
                    color: #6c757d;
                }

                .validation-section {
                    margin-bottom: 24px;
                }

                .validation-section-title {
                    font-weight: 600;
                    font-size: 16px;
                    color: #495057;
                    margin-bottom: 12px;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .issue-list, .suggestion-list {
                    list-style: none;
                    padding: 0;
                    margin: 0;
                }

                .issue-item, .suggestion-item {
                    padding: 12px 16px;
                    margin-bottom: 8px;
                    border-radius: 8px;
                    display: flex;
                    align-items: start;
                    gap: 12px;
                }

                .issue-item {
                    background: #fff3cd;
                    border-left: 4px solid #ffc107;
                }

                .suggestion-item {
                    background: #d1ecf1;
                    border-left: 4px solid #17a2b8;
                }

                .issue-icon, .suggestion-icon {
                    font-size: 20px;
                    flex-shrink: 0;
                }

                .issue-text, .suggestion-text {
                    flex: 1;
                    font-size: 14px;
                    color: #212529;
                    line-height: 1.5;
                }

                .modal-actions {
                    display: flex;
                    gap: 12px;
                    margin-top: 32px;
                    padding-top: 24px;
                    border-top: 2px solid #e9ecef;
                }

                .modal-btn {
                    flex: 1;
                    padding: 14px 24px;
                    border: none;
                    border-radius: 8px;
                    font-size: 16px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                }

                .modal-btn:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                }

                .modal-btn:active {
                    transform: translateY(0);
                }

                .btn-edit {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                }

                .btn-force {
                    background: #6c757d;
                    color: white;
                }

                .btn-force:hover {
                    background: #5a6268;
                }

                .btn-cancel {
                    background: #e9ecef;
                    color: #495057;
                }

                .btn-cancel:hover {
                    background: #dee2e6;
                }

                .force-warning {
                    background: #f8d7da;
                    border: 1px solid #f5c6cb;
                    border-radius: 8px;
                    padding: 12px 16px;
                    margin-top: 16px;
                    font-size: 13px;
                    color: #721c24;
                    display: ${severity === 'error' ? 'block' : 'none'};
                }
            </style>

            <div class="validation-modal-header">
                <span class="validation-modal-icon">${icon}</span>
                <div class="validation-modal-title">
                    <h2>${title}</h2>
                    <p data-testid="text-validation-subtitle">Encontramos ${validationResult.issues.length} problema(s) na sua estratégia</p>
                </div>
            </div>

            ${validationResult.issues.length > 0 ? `
            <div class="validation-section">
                <div class="validation-section-title">
                    <span>📋</span>
                    <span>Problemas Encontrados:</span>
                </div>
                <ul class="issue-list">
                    ${validationResult.issues.map((issue, index) => `
                        <li class="issue-item" data-testid="issue-item-${index}">
                            <span class="issue-icon">⚠️</span>
                            <span class="issue-text">${issue}</span>
                        </li>
                    `).join('')}
                </ul>
            </div>
            ` : ''}

            ${validationResult.suggestions.length > 0 ? `
            <div class="validation-section">
                <div class="validation-section-title">
                    <span>💡</span>
                    <span>Sugestões de Correção:</span>
                </div>
                <ul class="suggestion-list">
                    ${validationResult.suggestions.map((suggestion, index) => `
                        <li class="suggestion-item" data-testid="suggestion-item-${index}">
                            <span class="suggestion-icon">✨</span>
                            <span class="suggestion-text">${suggestion}</span>
                        </li>
                    `).join('')}
                </ul>
            </div>
            ` : ''}

            <div class="force-warning">
                <strong>⚠️ Atenção:</strong> Enviar mesmo assim pode resultar em tradução incorreta ou falha, 
                e você perderá os créditos. Recomendamos editar a estratégia primeiro.
            </div>

            <div class="modal-actions">
                <button class="modal-btn btn-edit" data-testid="button-edit-strategy">
                    <span>✏️</span>
                    <span>Editar Estratégia</span>
                </button>
                ${severity === 'warning' ? `
                <button class="modal-btn btn-force" data-testid="button-force-send">
                    <span>⚡</span>
                    <span>Enviar Mesmo Assim</span>
                </button>
                ` : ''}
                <button class="modal-btn btn-cancel" data-testid="button-cancel-validation">
                    <span>✖️</span>
                    <span>Cancelar</span>
                </button>
            </div>
        `;

        overlay.appendChild(modal);

        // Event listeners
        const btnEdit = modal.querySelector('.btn-edit');
        const btnForce = modal.querySelector('.btn-force');
        const btnCancel = modal.querySelector('.btn-cancel');

        btnEdit?.addEventListener('click', () => {
            this._closeModal(overlay);
            resolve({ action: 'edit', originalStrategy });
        });

        btnForce?.addEventListener('click', () => {
            this._closeModal(overlay);
            resolve({ action: 'force', originalStrategy });
        });

        btnCancel?.addEventListener('click', () => {
            this._closeModal(overlay);
            resolve({ action: 'cancel' });
        });

        // Fechar ao clicar fora do modal
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                this._closeModal(overlay);
                resolve({ action: 'cancel' });
            }
        });

        // Fechar com ESC
        const handleEsc = (e) => {
            if (e.key === 'Escape') {
                this._closeModal(overlay);
                resolve({ action: 'cancel' });
                document.removeEventListener('keydown', handleEsc);
            }
        };
        document.addEventListener('keydown', handleEsc);

        return overlay;
    }

    static _closeModal(overlay) {
        overlay.style.animation = 'fadeOut 0.2s ease';
        setTimeout(() => {
            overlay.remove();
        }, 200);
    }
}

// Adicionar animação fadeOut ao style global
if (typeof document !== 'undefined' && !document.getElementById('strategy-validation-modal-styles')) {
    const style = document.createElement('style');
    style.id = 'strategy-validation-modal-styles';
    style.textContent = `
        @keyframes fadeOut {
            from { opacity: 1; }
            to { opacity: 0; }
        }
    `;
    document.head.appendChild(style);
}

// Tornar disponível globalmente
if (typeof window !== 'undefined') {
    window.StrategyValidationModal = StrategyValidationModal;
}
