// js/directAutomacao.js
// Sistema de redirecionamento para o site de automações do canal
// Versão corrigida - 2024-10-24

class DirectAutomacao {
    constructor() {
        this.isModalOpen = false;
        this.init();
    }

    init() {
        this.addModalStyles();
        this.addInfoCardStyles();
        // Aguardar DOM carregar antes de criar o botão
        this.waitForDOM();
    }

    // Aguardar que o DOM esteja pronto
    waitForDOM() {
        // Se o DOM já estiver pronto, aguardar loading fechar antes de criar botão
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.waitForLoadingComplete();
            });
        } else {
            // DOM já está pronto
            this.waitForLoadingComplete();
        }
    }

    // Aguardar que a tela de loading seja fechada
    waitForLoadingComplete() {
        const checkLoadingComplete = () => {
            const loadingScreen = document.getElementById('loading-screen');
            const appContainer = document.getElementById('app-container');

            // Verificar se loading foi removido/ocultado e app container está visível
            if ((!loadingScreen || loadingScreen.style.display === 'none' || loadingScreen.style.opacity === '0') &&
                appContainer && !appContainer.classList.contains('app-container-hidden')) {
                // Loading completo, criar o botão
                this.createFloatingButton();
            } else {
                // Continuar verificando a cada 100ms
                setTimeout(checkLoadingComplete, 100);
            }
        };

        checkLoadingComplete();
    }

    showModal() {
        if (this.isModalOpen) return;

        this.isModalOpen = true;

        const modal = document.createElement('div');
        modal.className = 'direct-automacao-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>🤖 Automações Disponíveis</h2>
                    <button class="close-modal" onclick="this.closest('.direct-automacao-modal').remove(); window.directAutomacaoInstance.isModalOpen = false;">×</button>
                </div>

                <div class="modal-body">
                    <div class="automacao-info">
                        <div class="info-card">
                            <div class="card-icon">🎯</div>
                            <h3>BinaryBOT & BinaryXML</h3>
                            <p>Robôs clássicos da Deriv com interface visual drag-and-drop</p>
                            <ul>
                                <li>✅ Interface amigável</li>
                                <li>✅ Lógica visual</li>
                                <li>✅ Execução automática</li>
                            </ul>
                        </div>

                        <div class="info-card">
                            <div class="card-icon">🚀</div>
                            <h3>BOTS da plataforma</h3>
                            <p>Sistema avançado de automação da própria Deriv</p>
                            <ul>
                                <li>✅ Integração nativa</li>
                                <li>✅ Performance otimizada</li>
                                <li>✅ Suporte oficial</li>
                            </ul>
                        </div>

                        <div class="info-card">
                            <div class="card-icon">⚡</div>
                            <h3>DTrader</h3>
                            <p>Plataforma de trading manual e semi-automático</p>
                            <ul>
                                <li>✅ Trading manual</li>
                                <li>✅ Análise avançada</li>
                                <li>✅ Controle total</li>
                            </ul>
                        </div>
                    </div>

                    <div class="platform-showcase">
                        <div class="platform-title">
                            <h3>🏆 A melhor e mais completa plataforma de robôs</h3>
                        </div>
                        <div class="robots-display">
                            <div class="robot-item">
                                <div class="robot-avatar">🤖</div>
                                <div class="robot-labels">
                                    <span class="robot-label binary-bot">BinaryBOT</span>
                                    <span class="robot-label binary-xml">BinaryXML</span>
                                </div>
                            </div>
                            <div class="robot-item">
                                <div class="robot-avatar">🎯</div>
                                <div class="robot-labels">
                                    <span class="robot-label platform-bots">BOTS da plataforma</span>
                                </div>
                            </div>
                            <div class="robot-item">
                                <div class="robot-avatar">⚡</div>
                                <div class="robot-labels">
                                    <span class="robot-label dtrader">DTrader</span>
                                </div>
                            </div>
                        </div>
                        <div class="deriv-branding">
                            <div class="deriv-logo">DERIV</div>
                            <div class="deriv-subtitle">Plataforma Oficial</div>
                        </div>
                    </div>

                    <div class="warning-section">
                        <div class="warning-box">
                            <ul>
                                <li>🎯 Defina limites claros antes de começar</li>
                                <li>💰 Use apenas valores que pode perder</li>
                                <li>⏱️ Monitore regularmente o desempenho</li>
                                <li>🛑 Pare ao atingir seus limites</li>
                            </ul>
                        </div>
                    </div>

                    <div class="action-buttons">
                        <a href="https://danielraiboltautomatiza.com/dbot" target="_blank" class="btn-primary">
                            🤖 Acessar DBots
                        </a>
                        <a href="https://www.new.danielraiboltautomatiza.com" target="_blank" class="btn-primary">
                            🚀 Plataforma de Bots
                        </a>
                        <a href="https://binaryxml.com/dbot" target="_blank" class="btn-primary">
                            ⚡ Acessar BinaryBots
                        </a>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        setTimeout(() => {
            modal.classList.add('show');
        }, 10);

        this.escapeHandler = (e) => {
            if (e.key === 'Escape') {
                this.closeModal();
            }
        };
        document.addEventListener('keydown', this.escapeHandler);
    }

    closeModal() {
        const modal = document.getElementById('automacao-modal');
        if (modal) {
            modal.classList.remove('show');
            setTimeout(() => {
                modal.remove();
                this.isModalOpen = false;
            }, 300);
        }

        if (this.escapeHandler) {
            document.removeEventListener('keydown', this.escapeHandler);
            this.escapeHandler = null;
        }
    }

    redirectToSite() {
        this.closeModal();

        setTimeout(() => {
            window.open('https://www.new.danielraiboltautomatiza.com', '_blank');
        }, 300);
    }

    // Criar botão no topo da página
    createFloatingButton() {
        // Usar apenas o elemento do header (não criar fallback)
        const headerAutomacaoBtn = document.querySelector('.header-center-actions #automacao-floating-btn');
        if (headerAutomacaoBtn) {
            // Garantir que o botão tenha o ícone correto
            if (!headerAutomacaoBtn.textContent.includes('🤖')) {
                headerAutomacaoBtn.innerHTML = '🤖';
            }
            // Adicionar listener se ainda não tiver
            if (!headerAutomacaoBtn.hasAttribute('data-automacao-listener')) {
                headerAutomacaoBtn.setAttribute('data-automacao-listener', 'true');
                headerAutomacaoBtn.addEventListener('click', () => this.showModal());
            }
        }
    }

    // Método para adicionar os estilos do modal ao head
    addModalStyles() {
        // Verificar se os estilos já foram adicionados para evitar duplicação
        if (document.getElementById('automacao-modal-styles')) return;

        const style = document.createElement('style');
        style.id = 'automacao-modal-styles';

        const css = '.automacao-modal-overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0, 0, 0, 0.8); backdrop-filter: blur(10px); z-index: 2147483647; display: flex; align-items: center; justify-content: center; opacity: 0; visibility: hidden; transition: all 0.3s ease; font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif; }' +
            '.automacao-modal-overlay.show { opacity: 1; visibility: visible; }' +
            '.automacao-modal-content { background: var(--modal-bg-dark); color: var(--modal-text); border: 1px solid var(--modal-border); border-radius: 20px; max-width: 600px; width: 90%; max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5); transform: scale(0.9); transition: transform 0.3s ease; }' +
            '.automacao-modal-overlay.show .automacao-modal-content { transform: scale(1); }' +
            '.automacao-modal-header { display: flex; justify-content: space-between; align-items: center; padding: 25px 30px; border-bottom: 1px solid var(--modal-border); background: var(--modal-header-bg); border-radius: 20px 20px 0 0; color: var(--modal-text); }' +
            '.automacao-modal-header h2 { margin: 0; font-size: 1.5em; font-weight: bold; }' +
            '.automacao-close-btn { background: none; border: none; font-size: 28px; color: white; cursor: pointer; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; transition: all 0.3s ease; }' +
            '.automacao-close-btn:hover { background: rgba(255, 255, 255, 0.2); transform: scale(1.1); }' +
            '.automacao-modal-body { padding: 30px; text-align: center; }' +
            '.automacao-modal-body p { margin: 15px 0; font-size: 1.1em; color: var(--modal-text); line-height: 1.6; }' +
            '.automacao-image-container { margin: 25px 0; display: flex; justify-content: center; }' +
            '.automacao-preview-image { max-width: 100%; height: auto; border-radius: 15px; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2); border: 3px solid #e9ecef; }' +
            '.automacao-site-url { font-family: "Courier New", monospace; font-weight: bold; color: #667eea; background: #f8f9fa; padding: 10px 15px; border-radius: 8px; border: 2px solid #e9ecef; display: inline-block; margin: 15px 0; }' +
            '.automacao-description { color: #666; font-style: italic; }' +
            '.automacao-modal-footer { display: flex; justify-content: center; gap: 15px; padding: 25px 30px; border-top: 1px solid #e9ecef; }' +
            '.automacao-btn { padding: 12px 25px; border: none; border-radius: 8px; font-size: 1em; font-weight: bold; cursor: pointer; transition: all 0.3s ease; min-width: 140px; }' +
            '.automacao-btn-cancel { background: #6c757d; color: white; box-shadow: 0 4px 15px rgba(108, 117, 125, 0.3); }' +
            '.automacao-btn-cancel:hover { background: #545b62; transform: translateY(-2px); box-shadow: 0 6px 20px rgba(108, 117, 125, 0.4); }' +
            '.automacao-btn-confirm { background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; box-shadow: 0 4px 15px rgba(40, 167, 69, 0.3); }' +
            '.automacao-btn-confirm:hover { background: linear-gradient(135deg, #20c997 0%, #17a2b8 100%); transform: translateY(-2px); box-shadow: 0 6px 20px rgba(40, 167, 69, 0.4); }' +
            '@media (max-width: 768px) { .automacao-modal-content { width: 95%; margin: 10px; } .automacao-modal-header { padding: 20px; } .automacao-modal-header h2 { font-size: 1.3em; } .automacao-modal-body { padding: 20px; } .automacao-modal-footer { padding: 20px; flex-direction: column; } .automacao-btn { width: 100%; } }' +
            '.platform-showcase { text-align: center; margin: 30px 0; padding: 25px; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%); border-radius: 20px; border: 2px solid #4a9eff; box-shadow: 0 15px 35px rgba(74, 158, 255, 0.2); position: relative; overflow: hidden; }' +
            '.platform-showcase::before { content: ""; position: absolute; top: -50%; left: -50%; width: 200%; height: 200%; background: linear-gradient(45deg, transparent, rgba(74, 158, 255, 0.1), transparent); animation: shimmer 3s infinite; }' +
            '@keyframes shimmer { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }' +
            '.platform-title h3 { color: #4a9eff; margin: 0 0 20px 0; font-size: 1.3em; text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5); position: relative; z-index: 1; }' +
            '.robots-display { display: flex; justify-content: space-around; align-items: center; margin: 25px 0; position: relative; z-index: 1; }' +
            '.robot-item { display: flex; flex-direction: column; align-items: center; gap: 15px; }' +
            '.robot-avatar { width: 80px; height: 80px; border-radius: 50%; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); display: flex; align-items: center; justify-content: center; font-size: 2em; box-shadow: 0 8px 20px rgba(102, 126, 234, 0.4); transition: all 0.3s ease; animation: float 3s ease-in-out infinite; }' +
            '.robot-avatar:hover { transform: scale(1.1); box-shadow: 0 12px 30px rgba(102, 126, 234, 0.6); }' +
            '@keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-10px); } }' +
            '.robot-item:nth-child(2) .robot-avatar { animation-delay: -1s; }' +
            '.robot-item:nth-child(3) .robot-avatar { animation-delay: -2s; }' +
            '.robot-labels { display: flex; flex-direction: column; gap: 5px; align-items: center; }' +
            '.robot-label { padding: 4px 12px; border-radius: 15px; font-size: 0.8em; font-weight: bold; color: white; text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5); transition: all 0.3s ease; }' +
            '.robot-label:hover { transform: scale(1.05); }' +
            '.binary-bot { background: linear-gradient(135deg, #ff6b6b, #ee5a24); }' +
            '.binary-xml { background: linear-gradient(135deg, #ff7675, #d63031); }' +
            '.platform-bots { background: linear-gradient(135deg, #a29bfe, #6c5ce7); }' +
            '.dtrader { background: linear-gradient(135deg, #00b894, #00cec9); }' +
            '.deriv-branding { margin-top: 20px; position: relative; z-index: 1; }' +
            '.deriv-logo { font-size: 2em; font-weight: bold; background: linear-gradient(135deg, #ff6b35, #f7931e); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; margin-bottom: 5px; text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3); }' +
            '.deriv-subtitle { color: #4a9eff; font-size: 0.9em; font-style: italic; }';

        style.textContent = css;
        document.head.appendChild(style);
    }

    // Adicionar estilos do modal (cards de informação e seções)
    addInfoCardStyles() {
        const infoCardStyles = `
            .direct-automacao-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.8);
                backdrop-filter: blur(10px);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 9999999;
                opacity: 0;
                transition: opacity 0.3s ease;
            }

            .direct-automacao-modal.show {
                opacity: 1;
            }

            .direct-automacao-modal .modal-content {
                background: var(--modal-bg-dark);
                background-color: #0c1318; /* Fundo sólido */
                color: var(--modal-text);
                border: 1px solid var(--modal-border);
                border-radius: 20px;
                max-width: 800px;
                width: 90%;
                max-height: 90vh;
                overflow-y: auto;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
            }

            .direct-automacao-modal .modal-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 25px 30px;
                border-bottom: 1px solid var(--modal-border);
                background: var(--modal-header-bg);
                border-radius: 20px 20px 0 0;
                color: var(--modal-text);
            }

            .direct-automacao-modal .modal-header h2 {
                margin: 0;
                font-size: 1.5em;
            }

            .direct-automacao-modal .close-modal {
                background: none;
                border: none;
                color: white;
                font-size: 28px;
                cursor: pointer;
                width: 40px;
                height: 40px;
                border-radius: 50%;
                transition: all 0.3s ease;
            }

            .direct-automacao-modal .close-modal:hover {
                background: rgba(255, 255, 255, 0.2);
            }

            .direct-automacao-modal .modal-body {
                padding: 30px;
            }

            .automacao-info {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 20px;
                margin-bottom: 30px;
            }

            .info-card {
                background: var(--modal-input-bg);
                padding: 20px;
                border-radius: 15px;
                text-align: center;
                border: 1px solid var(--modal-border);
            }

            .info-card .card-icon {
                font-size: 3em;
                margin-bottom: 10px;
            }

            .info-card h3 {
                margin: 10px 0;
                color: var(--modal-text);
            }

            .info-card p {
                color: #8b9cb5;
                font-size: 0.9em;
            }

            .info-card ul {
                list-style: none;
                padding: 0;
                margin: 10px 0 0 0;
            }

            .info-card li {
                padding: 5px 0;
                font-size: 0.9em;
            }

            .warning-section {
                margin: 20px 0;
            }

            .warning-box {
                background: rgba(255, 193, 7, 0.1);
                border: 1px solid #ffc107;
                border-radius: 10px;
                padding: 20px;
            }

            .warning-box h4 {
                margin: 0 0 10px 0;
                color: #ffc107;
            }

            .warning-box p {
                color: #ffc107;
                margin: 10px 0;
            }

            .warning-box ul {
                list-style: none;
                padding: 0;
                margin: 10px 0 0 0;
            }

            .warning-box li {
                padding: 5px 0;
                color: #ffc107;
            }

            .action-buttons {
                display: flex;
                gap: 15px;
                flex-wrap: wrap;
                justify-content: center;
                margin-top: 20px;
            }

            .btn-primary {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 12px 25px;
                border-radius: 8px;
                text-decoration: none;
                font-weight: bold;
                transition: all 0.3s ease;
                box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
            }

            .btn-primary:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
            }
        `;

        const style = document.createElement('style');
        style.textContent = infoCardStyles;
        document.head.appendChild(style);
    }
}

const directAutomacao = new DirectAutomacao();
window.directAutomacao = directAutomacao;
window.directAutomacaoInstance = directAutomacao;