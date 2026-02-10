/**
 * Sistema de Tour Guiado
 * Tutorial interativo que explica cada componente do aplicativo
 */

class TourGuide {
    constructor() {
        this.currentStep = 0;
        this.isActive = false;
        this.tourSteps = this.defineTourSteps();
        this.overlay = null;
        this.modal = null;
    }

    defineTourSteps() {
        return [
            // === HEADER (TOPO) ===
            {
                target: '#change-asset-btn',
                title: 'Seletor de Ativo',
                description: 'Escolha qual ativo deseja negociar. Clique para ver a lista de ativos disponíveis.',
                position: 'bottom'
            },
            {
                target: '#current-account-display',
                title: 'Seletor de Conta',
                description: 'Selecione qual conta Deriv usar: Real ou Virtual.',
                position: 'bottom'
            },
            {
                target: '.selected-asset-display',
                title: 'Display de Ativo Selecionado',
                description: 'Mostra o ativo que será usado em suas negociações.',
                position: 'bottom'
            },

            // === BOTÕES DE FERRAMENTAS (ORDEM VISUAL) ===
            {
                target: '#rule-assistant-btn',
                title: 'Assistente de Regras 🤓',
                description: 'Assistente inteligente que ajuda a criar regras de forma guiada.',
                position: 'bottom'
            },
            {
                target: '#tour-guide-btn',
                title: 'Reiniciar Tour ♻',
                description: 'Clique aqui a qualquer momento para rever este tutorial.',
                position: 'bottom'
            },
            {
                target: '#help-icon',
                title: 'Manual de Instruções ❓',
                description: 'Abra o manual completo com instruções detalhadas sobre o sistema.',
                position: 'bottom'
            },
            {
                target: '#automacao-floating-btn',
                title: 'Automações 🤖',
                description: 'Acesse ferramentas de automação e chat com IA.',
                position: 'bottom'
            },
            {
                target: '#rules-history-btn',
                title: 'Histórico de Regras 📋',
                description: 'Acesse o histórico de regras usadas anteriormente.',
                position: 'bottom'
            },
            {
                target: '#examples-btn',
                title: 'Exemplos de Regras 📚',
                description: 'Veja modelos prontos de regras de negociação.',
                position: 'bottom'
            },
            {
                target: '#suggestions-btn',
                title: 'Sugestões IA 💡',
                description: 'Receba sugestões inteligentes baseadas no mercado atual.',
                position: 'bottom'
            },
            {
                target: '.planilha-btn',
                title: 'Planilha de Trades 📝',
                description: 'Exporte seus trades e veja estatísticas detalhadas.',
                position: 'bottom'
            },
            {
                target: '#floating-ia-button',
                title: 'IA Generativa 🧠',
                description: 'Use a IA para criar estratégias complexas automaticamente.',
                position: 'bottom'
            },
            {
                target: '#chart-modal-btn',
                title: 'Gráfico em Tempo Real 📉',
                description: 'Visualize o gráfico de preços e indicadores técnicos.',
                position: 'bottom'
            },
            {
                target: '.vip-upgrade-button',
                title: 'Carregar Créditos 💰',
                description: 'Gerencie seus créditos para recursos premium.',
                position: 'bottom'
            },
            {
                target: '#strategy-library-btn',
                title: 'Biblioteca de Estratégias',
                description: 'Acesse estratégias compartilhadas pela comunidade.',
                position: 'bottom'
            },

            // === COLUNA ESQUERDA (CONFIGURAÇÕES) ===
            {
                target: '.trade-settings-group',
                title: 'Configurações da Sessão',
                description: 'Configure contrato, valor da aposta e Martingale.',
                position: 'right'
            },

            // === COLUNA CENTRAL (REGRAS E CONTROLES) ===
            {
                target: '#strategy-text',
                title: 'Regras de Negociação',
                description: 'Digite suas regras em linguagem natural.',
                position: 'right'
            },
            {
                target: '.market-btn.start-btn',
                title: 'Botão Iniciar (ON)',
                description: 'Inicie o monitoramento e execução automática.',
                position: 'top'
            },
            {
                target: '.immediate-execution-container',
                title: 'Entrada Imediata',
                description: 'Execute uma ordem imediatamente ao iniciar.',
                position: 'top'
            },
            {
                target: '.profit-loss-display-inline',
                title: 'Lucro/Prejuízo',
                description: 'Acompanhe seu resultado financeiro em tempo real.',
                position: 'top'
            },
            {
                target: '[data-testid="button-reset-session"]',
                title: 'Resetar Sessão',
                description: 'Zere os contadores e reinicie a sessão.',
                position: 'top'
            },
            {
                target: '.market-btn.stop-btn',
                title: 'Botão Parar (OFF)',
                description: 'Pare o monitoramento e as negociações.',
                position: 'top'
            },

            // === MENSAGENS E HISTÓRICO ===
            {
                target: '#trade-messages-container',
                title: 'Mensagens de Resultados',
                description: 'Acompanhe aqui o resultado de cada trade executado (Vitória/Derrota) e mensagens do sistema.',
                position: 'top'
            },
            {
                target: '.trade-history-container',
                title: 'Histórico Detalhado',
                description: 'Lista completa das negociações recentes.',
                position: 'left'
            },

            // === DISPLAYS E ESTATÍSTICAS ===
            {
                target: '#active-mode-indicator',
                title: 'Modo de Trading',
                description: 'Indica se está em SIMULAÇÃO, VIRTUAL ou REAL.',
                position: 'left'
            },
            {
                target: '#rules-visual-display',
                title: 'Status das Regras',
                description: 'Visualização em tempo real do status de cada regra.',
                position: 'left'
            },
            {
                target: '.counter-group.real-counters',
                title: 'Contadores Reais 💰',
                description: 'Placar de vitórias/derrotas em conta Real/Virtual.',
                position: 'left'
            },
            {
                target: '.counter-group.simulated-counters',
                title: 'Contadores Simulados 🎮',
                description: 'Placar de vitórias/derrotas em Simulação.',
                position: 'left'
            },

            // === RODAPÉ ===
            {
                target: '.vip-digits-section',
                title: 'Análise de Dígitos',
                description: 'Estatísticas dos últimos dígitos em tempo real.',
                position: 'top'
            },
            {
                target: '.vip-prices-section',
                title: 'Análise de Preços',
                description: 'Estatísticas de variação de preços.',
                position: 'top'
            }
        ];
    }

    start() {
        if (this.isActive) return;

        this.isActive = true;
        this.currentStep = 0;
        this.createOverlay();
        this.showStep(this.currentStep);
    }

    stop() {
        this.isActive = false;
        this.removeOverlay();
        this.removeModal();
        this.removeHighlight();
    }

    removeHighlight() {
        const highlighted = document.querySelector('.tour-highlight');
        if (highlighted) {
            highlighted.classList.remove('tour-highlight');
        }
    }

    createOverlay() {
        this.overlay = document.createElement('div');
        this.overlay.className = 'tour-overlay';
        this.overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            z-index: 999998;
            pointer-events: none;
        `;
        document.body.appendChild(this.overlay);
    }

    removeOverlay() {
        if (this.overlay && this.overlay.parentNode) {
            this.overlay.parentNode.removeChild(this.overlay);
            this.overlay = null;
        }
    }

    removeModal() {
        if (this.modal && this.modal.parentNode) {
            this.modal.parentNode.removeChild(this.modal);
            this.modal = null;
        }
    }

    showStep(stepIndex) {
        if (stepIndex < 0 || stepIndex >= this.tourSteps.length) {
            this.stop();
            return;
        }

        const step = this.tourSteps[stepIndex];
        const targetElement = document.querySelector(step.target);

        if (!targetElement) {

            // Pular para próximo passo
            this.currentStep++;
            if (this.currentStep < this.tourSteps.length) {
                this.showStep(this.currentStep);
            } else {
                this.stop();
            }
            return;
        }

        // Destacar elemento alvo
        this.highlightElement(targetElement);

        // Criar modal
        this.createModal(step, targetElement);
    }

    highlightElement(element) {
        // Remover highlight anterior
        const previousHighlight = document.querySelector('.tour-highlight');
        if (previousHighlight) {
            previousHighlight.classList.remove('tour-highlight');
        }

        // Adicionar highlight
        element.classList.add('tour-highlight');
    }

    createModal(step, targetElement) {
        // Remover modal anterior
        this.removeModal();

        // Criar novo modal
        this.modal = document.createElement('div');
        this.modal.className = 'tour-modal';

        const progressText = `${this.currentStep + 1}/${this.tourSteps.length}`;

        this.modal.innerHTML = `
            <div class="tour-modal-content">
                <div class="tour-modal-header">
                    <h3>${step.title}</h3>
                    <span class="tour-progress">${progressText}</span>
                </div>
                <div class="tour-modal-body">
                    <p>${step.description}</p>
                </div>
                <div class="tour-modal-footer">
                    <button class="tour-btn tour-btn-stop" data-testid="button-stop-tour">Parar Tour</button>
                    <button class="tour-btn tour-btn-next" data-testid="button-next-tour">
                        ${this.currentStep < this.tourSteps.length - 1 ? 'Próximo →' : 'Finalizar'}
                    </button>
                </div>
            </div>
            <div class="tour-arrow tour-arrow-${step.position}"></div>
        `;

        document.body.appendChild(this.modal);

        // Posicionar modal
        this.positionModal(targetElement, step.position);

        // Event listeners
        this.modal.querySelector('.tour-btn-stop').addEventListener('click', () => this.stop());
        this.modal.querySelector('.tour-btn-next').addEventListener('click', () => this.nextStep());
    }

    positionModal(targetElement, position) {
        const targetRect = targetElement.getBoundingClientRect();
        const modalRect = this.modal.getBoundingClientRect();
        const isMobile = window.innerWidth <= 768;

        let top, left;

        // Em mobile, sempre centralizar verticalmente na tela
        if (isMobile) {
            top = Math.max(10, (window.innerHeight - modalRect.height) / 2);
            left = Math.max(10, (window.innerWidth - modalRect.width) / 2);
        } else {
            switch (position) {
                case 'top':
                    top = targetRect.top - modalRect.height - 20;
                    left = targetRect.left + (targetRect.width / 2) - (modalRect.width / 2);
                    break;
                case 'bottom':
                    top = targetRect.bottom + 20;
                    left = targetRect.left + (targetRect.width / 2) - (modalRect.width / 2);
                    break;
                case 'left':
                    top = targetRect.top + (targetRect.height / 2) - (modalRect.height / 2);
                    left = targetRect.left - modalRect.width - 20;
                    break;
                case 'right':
                    top = targetRect.top + (targetRect.height / 2) - (modalRect.height / 2);
                    left = targetRect.right + 20;
                    break;
                default:
                    top = targetRect.bottom + 20;
                    left = targetRect.left + (targetRect.width / 2) - (modalRect.width / 2);
            }

            // Ajustar se sair da tela (desktop)
            const padding = 10;
            if (left < padding) left = padding;
            if (left + modalRect.width > window.innerWidth - padding) {
                left = window.innerWidth - modalRect.width - padding;
            }
            if (top < padding) top = padding;
            if (top + modalRect.height > window.innerHeight - padding) {
                top = window.innerHeight - modalRect.height - padding;
            }
        }

        this.modal.style.top = `${top}px`;
        this.modal.style.left = `${left}px`;
    }

    nextStep() {
        this.currentStep++;
        if (this.currentStep < this.tourSteps.length) {
            this.showStep(this.currentStep);
        } else {
            this.stop();
        }
    }

    addStyles() {
        if (document.getElementById('tour-guide-styles')) return;

        const style = document.createElement('style');
        style.id = 'tour-guide-styles';
        style.textContent = `
            .tour-highlight {
                position: relative;
                z-index: 2147483647 !important; /* Máximo z-index possível */
                box-shadow: 0 0 0 4px rgba(255, 193, 7, 0.9), 0 0 20px rgba(255, 193, 7, 0.7) !important;
                outline: 2px solid rgba(255, 193, 7, 1) !important; /* Outline como fallback */
                border-radius: 8px;
                transition: all 0.3s ease;
            }

            .tour-modal {
                position: fixed;
                z-index: 2147483647; /* Máximo z-index possível */
                background: var(--modal-bg-dark);
                background-color: #0c1318; /* Fundo sólido garantido */
                color: var(--modal-text);
                border: 1px solid var(--modal-border);
                border-radius: 12px;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.8);
                min-width: 300px;
                max-width: 400px;
                pointer-events: auto;
                transition: all 0.3s ease;
            }

            @media (max-width: 768px) {
                .tour-modal {
                    min-width: 280px;
                    max-width: 90vw;
                    font-size: 0.9em;
                }

                .tour-modal-content {
                    padding: 15px;
                }

                .tour-modal-header h3 {
                    font-size: 1.1em;
                }

                .tour-modal-body p {
                    font-size: 0.9em;
                }

                .tour-btn {
                    padding: 8px 16px;
                    font-size: 0.85em;
                }
            }

            @media (max-width: 480px) {
                .tour-modal {
                    min-width: 260px;
                    max-width: 95vw;
                    font-size: 0.85em;
                }

                .tour-modal-content {
                    padding: 12px;
                }

                .tour-modal-header h3 {
                    font-size: 1em;
                }

                .tour-modal-body p {
                    font-size: 0.85em;
                    line-height: 1.5;
                }

                .tour-btn {
                    padding: 6px 12px;
                    font-size: 0.8em;
                }

                .tour-progress {
                    padding: 3px 8px;
                    font-size: 0.75em;
                }
            }

            .tour-modal-content {
                padding: 20px;
            }

            .tour-modal-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 15px;
            }

            .tour-modal-header h3 {
                margin: 0;
                font-size: 1.2em;
                color: var(--modal-text);
            }

            .tour-progress {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 4px 10px;
                border-radius: 12px;
                font-size: 0.85em;
                font-weight: bold;
            }

            .tour-modal-body {
                margin-bottom: 20px;
            }

            .tour-modal-body p {
                margin: 0;
                color: var(--modal-text-secondary);
                line-height: 1.6;
                font-size: 0.95em;
            }

            .tour-modal-footer {
                display: flex;
                gap: 10px;
                justify-content: flex-end;
            }

            .tour-btn {
                padding: 10px 20px;
                border: none;
                border-radius: 6px;
                font-weight: bold;
                cursor: pointer;
                transition: all 0.3s ease;
                font-size: 0.9em;
            }

            .tour-btn-stop {
                background: #dc3545;
                color: white;
            }

            .tour-btn-stop:hover {
                background: #c82333;
                transform: scale(1.05);
            }

            .tour-btn-next {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
            }

            .tour-btn-next:hover {
                transform: scale(1.05);
                box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
            }

            .tour-arrow {
                position: absolute;
                width: 0;
                height: 0;
                border-style: solid;
            }

            .tour-arrow-top {
                bottom: -10px;
                left: 50%;
                transform: translateX(-50%);
                border-width: 10px 10px 0 10px;
                border-color: var(--modal-bg-dark) transparent transparent transparent;
            }

            .tour-arrow-bottom {
                top: -10px;
                left: 50%;
                transform: translateX(-50%);
                border-width: 0 10px 10px 10px;
                border-color: transparent transparent var(--modal-bg-dark) transparent;
            }

            .tour-arrow-left {
                right: -10px;
                top: 50%;
                transform: translateY(-50%);
                border-width: 10px 0 10px 10px;
                border-color: transparent transparent transparent var(--modal-bg-dark);
            }

            .tour-arrow-right {
                left: -10px;
                top: 50%;
                transform: translateY(-50%);
                border-width: 10px 10px 10px 0;
                border-color: transparent var(--modal-bg-dark) transparent transparent;
            }
        `;
        document.head.appendChild(style);
    }
}

// Instância global do tour
window.tourGuide = new TourGuide();
window.tourGuide.addStyles();
