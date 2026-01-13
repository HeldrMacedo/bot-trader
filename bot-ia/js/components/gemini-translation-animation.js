/**
 * Componente de animaÃ§Ã£o visual durante a traduÃ§Ã£o Gemini
 * Mostra feedback visual ao usuÃ¡rio enquanto a IA processa a estratÃ©gia
 */
class GeminiTranslationAnimation {
    constructor() {
        this.overlay = null;
        this.progressSteps = [
            { text: 'Analisando sua estratÃ©gia...', icon: 'ðŸ”', duration: 2000 },
            { text: 'Processando com IA Gemini...', icon: 'ðŸ¤–', duration: 3000 },
            { text: 'Gerando automaÃ§Ã£o...', icon: 'âš¡', duration: 2000 },
            { text: 'Validando regras...', icon: 'âœ…', duration: 1500 }
        ];
        this.currentStep = 0;
        this.stepInterval = null;
    }

    /**
     * Mostra a animaÃ§Ã£o de traduÃ§Ã£o
     */
    show() {
        if (this.overlay) {
            return; // JÃ¡ estÃ¡ sendo exibida
        }

        this.overlay = this._createOverlay();
        document.body.appendChild(this.overlay);

        // Iniciar animaÃ§Ã£o de steps
        this._startStepAnimation();

        // Animar entrada
        setTimeout(() => {
            this.overlay.classList.add('active');
        }, 50);
    }

    /**
     * Esconde a animaÃ§Ã£o
     */
    hide() {
        if (!this.overlay) return;

        // Limpar intervalo
        if (this.stepInterval) {
            clearInterval(this.stepInterval);
            this.stepInterval = null;
        }

        // Animar saÃ­da
        this.overlay.classList.remove('active');

        setTimeout(() => {
            if (this.overlay && this.overlay.parentNode) {
                this.overlay.remove();
            }
            this.overlay = null;
            this.currentStep = 0;
        }, 300);
    }

    /**
     * Atualiza o texto da animaÃ§Ã£o
     */
    updateStatus(text, icon = 'âš¡') {
        if (!this.overlay) return;

        const statusText = this.overlay.querySelector('.gemini-status-text');
        const statusIcon = this.overlay.querySelector('.gemini-status-icon');

        if (statusText) {
            statusText.textContent = text;
        }
        if (statusIcon) {
            statusIcon.textContent = icon;
        }
    }

    /**
     * Atualiza o progresso manualmente
     * @param {number} percent - Porcentagem de 0 a 100
     * @param {string} message - Mensagem opcional
     */
    updateProgress(percent, message = null) {
        if (!this.overlay) return;

        // Parar animaÃ§Ã£o automÃ¡tica se estiver rodando
        if (this.stepInterval) {
            clearInterval(this.stepInterval);
            this.stepInterval = null;
        }

        // Atualizar barra de progresso
        const progressFill = this.overlay.querySelector('.gemini-progress-fill');
        if (progressFill) {
            // Remover animaÃ§Ã£o infinita e definir largura fixa
            progressFill.style.animation = 'none';
            progressFill.style.width = `${Math.max(0, Math.min(100, percent))}%`;
            progressFill.style.transition = 'width 0.3s ease-out';
        }

        // Atualizar mensagem se fornecida
        if (message) {
            this.updateStatus(message);
        }
    }

    /**
     * Cria o overlay de animaÃ§Ã£o
     */
    _createOverlay() {
        const overlay = document.createElement('div');
        overlay.id = 'gemini-translation-overlay';
        overlay.className = 'gemini-translation-overlay';

        overlay.innerHTML = `
            <style>
                .gemini-translation-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.85);
                    backdrop-filter: blur(10px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 99999;
                    opacity: 0;
                    transition: opacity 0.3s ease;
                }

                .gemini-translation-overlay.active {
                    opacity: 1;
                }

                .gemini-animation-container {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    border-radius: 24px;
                    padding: 48px 64px;
                    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
                    max-width: 500px;
                    width: 90%;
                    text-align: center;
                    animation: slideUp 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
                }

                @keyframes slideUp {
                    from {
                        transform: translateY(50px);
                        opacity: 0;
                    }
                    to {
                        transform: translateY(0);
                        opacity: 1;
                    }
                }

                .gemini-icon-container {
                    margin-bottom: 32px;
                    position: relative;
                }

                .gemini-main-icon {
                    font-size: 80px;
                    display: inline-block;
                    animation: float 3s ease-in-out infinite;
                    filter: drop-shadow(0 10px 20px rgba(0, 0, 0, 0.3));
                }

                @keyframes float {
                    0%, 100% { transform: translateY(0px); }
                    50% { transform: translateY(-20px); }
                }

                .gemini-particles {
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    width: 120px;
                    height: 120px;
                }

                .particle {
                    position: absolute;
                    width: 8px;
                    height: 8px;
                    background: white;
                    border-radius: 50%;
                    opacity: 0;
                }

                .particle-1 {
                    top: 0%;
                    left: 50%;
                    animation: particle1 2s ease-in-out infinite;
                }

                .particle-2 {
                    top: 50%;
                    right: 0%;
                    animation: particle2 2s ease-in-out infinite 0.4s;
                }

                .particle-3 {
                    bottom: 0%;
                    left: 50%;
                    animation: particle3 2s ease-in-out infinite 0.8s;
                }

                .particle-4 {
                    top: 50%;
                    left: 0%;
                    animation: particle4 2s ease-in-out infinite 1.2s;
                }

                @keyframes particle1 {
                    0%, 100% { opacity: 0; transform: translateY(0); }
                    50% { opacity: 1; transform: translateY(-30px); }
                }

                @keyframes particle2 {
                    0%, 100% { opacity: 0; transform: translateX(0); }
                    50% { opacity: 1; transform: translateX(30px); }
                }

                @keyframes particle3 {
                    0%, 100% { opacity: 0; transform: translateY(0); }
                    50% { opacity: 1; transform: translateY(30px); }
                }

                @keyframes particle4 {
                    0%, 100% { opacity: 0; transform: translateX(0); }
                    50% { opacity: 1; transform: translateX(-30px); }
                }

                .gemini-status {
                    color: white;
                }

                .gemini-status-icon {
                    font-size: 36px;
                    display: block;
                    margin-bottom: 16px;
                    animation: pulse 1.5s ease-in-out infinite;
                }

                @keyframes pulse {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.1); }
                }

                .gemini-status-text {
                    font-size: 20px;
                    font-weight: 600;
                    margin-bottom: 8px;
                }

                .gemini-status-subtitle {
                    font-size: 14px;
                    opacity: 0.9;
                    font-weight: 400;
                }

                .gemini-progress-bar {
                    margin-top: 32px;
                    background: rgba(255, 255, 255, 0.2);
                    height: 6px;
                    border-radius: 3px;
                    overflow: hidden;
                }

                .gemini-progress-fill {
                    height: 100%;
                    background: white;
                    width: 0%;
                    animation: progressFill 8s ease-in-out infinite;
                    box-shadow: 0 0 10px rgba(255, 255, 255, 0.5);
                }

                @keyframes progressFill {
                    0% { width: 0%; }
                    50% { width: 60%; }
                    100% { width: 100%; }
                }

                .gemini-tips {
                    margin-top: 24px;
                    padding: 16px;
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 12px;
                    font-size: 13px;
                    color: rgba(255, 255, 255, 0.95);
                    line-height: 1.6;
                }

                .gemini-tips strong {
                    font-weight: 600;
                    display: block;
                    margin-bottom: 8px;
                }

            </style>

            <div class="gemini-animation-container">
                <div class="gemini-icon-container">
                    <div class="gemini-main-icon">ðŸ¤–</div>
                    <div class="gemini-particles">
                        <div class="particle particle-1"></div>
                        <div class="particle particle-2"></div>
                        <div class="particle particle-3"></div>
                        <div class="particle particle-4"></div>
                    </div>
                </div>

                <div class="gemini-status">
                    <span class="gemini-status-icon">ðŸ”</span>
                    <div class="gemini-status-text" data-testid="text-gemini-status">Analisando sua estratÃ©gia...</div>
                    <div class="gemini-status-subtitle">Aguarde enquanto a IA processa</div>
                </div>

                <div class="gemini-progress-bar">
                    <div class="gemini-progress-fill"></div>
                </div>

                <div class="gemini-tips">
                    <strong>ðŸ’¡ VocÃª sabia?</strong>
                    A IA Gemini analisa padrÃµes complexos e transforma sua estratÃ©gia em linguagem natural em regras precisas de trading.
                </div>
            </div>
        `;

        return overlay;
    }

    /**
     * Inicia animaÃ§Ã£o de steps de progresso
     */
    _startStepAnimation() {
        let stepIndex = 0;

        const nextStep = () => {
            if (!this.overlay) return;

            const step = this.progressSteps[stepIndex];
            if (step) {
                this.updateStatus(step.text, step.icon);
                stepIndex = (stepIndex + 1) % this.progressSteps.length;
            }
        };

        // Primeira execuÃ§Ã£o imediata
        nextStep();

        // Continuar mudando a cada 2.5 segundos
        this.stepInterval = setInterval(nextStep, 2500);
    }

    /**
     * Adiciona um log em tempo real ao console
     * @param {string} message - Mensagem do log
     * @param {string} level - NÃ­vel do log (info, success, warning, error)
     */
    addLog(message, level = 'info') {
        if (!this.overlay) return;

        const logsContent = this.overlay.querySelector('#gemini-logs-content');
        if (!logsContent) return;

        const timestamp = new Date().toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });

        const logEntry = document.createElement('div');
        logEntry.className = 'gemini-log-entry';
        logEntry.innerHTML = `
            <span class="gemini-log-timestamp">[${timestamp}]</span>
            <span class="gemini-log-level ${level}">${level.toUpperCase()}</span>
            <span class="gemini-log-message">${message}</span>
        `;

        logsContent.appendChild(logEntry);

        // Auto-scroll para o final
        const logsContainer = this.overlay.querySelector('#gemini-logs-container');
        if (logsContainer) {
            logsContainer.scrollTop = logsContainer.scrollHeight;
        }

        // Limitar a 50 logs para evitar sobrecarga
        const allLogs = logsContent.querySelectorAll('.gemini-log-entry');
        if (allLogs.length > 50) {
            allLogs[0].remove();
        }
    }


    /**
     * Mostra erro na animaÃ§Ã£o
     */
    showError(errorMessage) {
        if (!this.overlay) return;

        const container = this.overlay.querySelector('.gemini-animation-container');
        if (container) {
            container.style.background = 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)';
        }

        // Parar animaÃ§Ã£o de steps
        if (this.stepInterval) {
            clearInterval(this.stepInterval);
            this.stepInterval = null;
        }

        // Converter quebras de linha em HTML
        const formattedMessage = errorMessage.replace(/\n/g, '<br>');

        // Atualizar conteÃºdo com formataÃ§Ã£o melhorada
        const statusDiv = this.overlay.querySelector('.gemini-status');
        if (statusDiv) {
            statusDiv.innerHTML = `
                <span class="gemini-status-icon">âŒ</span>
                <div class="gemini-status-text" style="text-align: left; white-space: pre-line; max-width: 500px; margin: 0 auto; font-size: 14px; line-height: 1.6;">
                    ${formattedMessage}
                </div>
            `;
        }

        // Adicionar botÃ£o de fechar
        const tips = this.overlay.querySelector('.gemini-tips');
        if (tips) {
            tips.innerHTML = `
                <button 
                    id="gemini-error-close-btn"
                    data-testid="button-close-error"
                    style="
                        width: 100%;
                        padding: 12px 24px;
                        background: white;
                        color: #dc3545;
                        border: none;
                        border-radius: 8px;
                        font-size: 16px;
                        font-weight: 600;
                        cursor: pointer;
                        transition: all 0.2s;
                    "
                >
                    Fechar
                </button>
            `;

            // Adicionar event listeners diretamente (sem inline onclick)
            const closeBtn = tips.querySelector('#gemini-error-close-btn');
            if (closeBtn) {
                // Click para fechar
                closeBtn.addEventListener('click', () => this.hide());

                // Hover effects
                closeBtn.addEventListener('mouseover', () => {
                    closeBtn.style.background = 'rgba(255,255,255,0.9)';
                });
                closeBtn.addEventListener('mouseout', () => {
                    closeBtn.style.background = 'white';
                });
            }
        }

        // âš ï¸ NÃƒO fechar automaticamente - deixar o usuÃ¡rio ler o erro e fechar manualmente
    }

    /**
     * Mostra sucesso na animaÃ§Ã£o
     */
    showSuccess(successMessage = 'TraduÃ§Ã£o concluÃ­da com sucesso!') {
        if (!this.overlay) return;

        const container = this.overlay.querySelector('.gemini-animation-container');
        if (container) {
            container.style.background = 'linear-gradient(135deg, #28a745 0%, #218838 100%)';
        }

        this.updateStatus(successMessage, 'âœ…');

        // Esconder automaticamente apÃ³s 2 segundos
        setTimeout(() => this.hide(), 2000);
    }
    /**
     * Mostra as regras prÃ©-processadas no modal
     * @param {object} data - Dados do prÃ©-processamento
     */
    showPreprocessedRules(data) {
        if (!this.overlay) return;

        const container = this.overlay.querySelector('.gemini-animation-container');
        if (!container) return;

        // Remover container anterior se existir
        const existingRules = container.querySelector('.gemini-preprocessed-rules');
        if (existingRules) existingRules.remove();

        // Criar container de regras
        const rulesDiv = document.createElement('div');
        rulesDiv.className = 'gemini-preprocessed-rules';

        // Estilos inline para garantir visualizaÃ§Ã£o
        rulesDiv.style.cssText = `
            margin-top: 20px;
            background: rgba(0, 0, 0, 0.2);
            border-radius: 12px;
            padding: 15px;
            text-align: left;
            border: 1px solid rgba(255, 255, 255, 0.1);
            animation: fadeIn 0.5s ease;
            max-height: 150px;
            overflow-y: auto;
            scrollbar-width: thin;
            scrollbar-color: rgba(255, 255, 255, 0.3) transparent;
        `;

        // Formatar texto para HTML
        const formattedText = data.processedText
            .split('\n')
            .map(line => line.trim())
            .filter(line => line)
            .map(line => {
                if (line.startsWith('*')) {
                    return `<div style="color: #a3bffa; margin-bottom: 4px; padding-left: 10px; border-left: 2px solid #4fd1c5;">${line}</div>`;
                }
                return `<div style="color: rgba(255,255,255,0.8);">${line}</div>`;
            })
            .join('');

        rulesDiv.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 5px;">
                <span style="font-size: 12px; font-weight: 600; color: #ffd700; text-transform: uppercase; letter-spacing: 1px;">
                    ðŸ‘ï¸ Regras Identificadas
                </span>
                <span style="font-size: 11px; background: rgba(255,255,255,0.15); padding: 2px 8px; border-radius: 10px; color: white;">
                    ${data.structure.totalGroups} Grupo(s)
                </span>
            </div>
            <div style="font-family: 'Consolas', 'Monaco', monospace; font-size: 11px; line-height: 1.4;">
                ${formattedText}
            </div>
        `;

        // Inserir antes da barra de progresso ou no final
        const progressBar = container.querySelector('.gemini-progress-bar');
        if (progressBar) {
            container.insertBefore(rulesDiv, progressBar);
        } else {
            container.appendChild(rulesDiv);
        }
    }
}

// InstÃ¢ncia global
let geminiTranslationAnimation = null;

function getGeminiTranslationAnimation() {
    if (!geminiTranslationAnimation) {
        geminiTranslationAnimation = new GeminiTranslationAnimation();
    }
    return geminiTranslationAnimation;
}

// Tornar disponÃ­vel globalmente
if (typeof window !== 'undefined') {
    window.GeminiTranslationAnimation = GeminiTranslationAnimation;
    window.getGeminiTranslationAnimation = getGeminiTranslationAnimation;
}