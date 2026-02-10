
// js/chart-modal.js
// Modal de gráfico em tempo real com execução imediata de trades
class ChartModal {
    constructor() {
        this.isOpen = false;
        this.modal = null;
        this.tickData = [];
        this.digitData = Array(10).fill(0);
        this.currentView = 'ticks'; // 'ticks' ou 'digits'
        this.marketDataInstance = null;
        this.tickSubscription = null;
        this.chart = null;
        this.maxTicks = 100;
        this.digitPeriod = 25; // Últimos 25 dígitos para análise percentual
        this.tickCallback = null;
        this.escHandler = null;
        this.unsubscribeCleanup = null;
        this.currentSymbol = null;
        this.tradeHistory = []; // Histórico de trades executados no modal
        this.maxHistoryItems = 50; // Máximo de itens no histórico

        // ✅ Throttling para renderização do gráfico
        this.lastDrawTime = 0;
        this.drawThrottleMs = 100; // Redesenhar no máximo a cada 100ms
        this.pendingDraw = false;

        // 🔄 Account switch listener
        this.accountSwitchListener = null;
    }

    // Mostrar modal
    show() {
        if (this.isOpen) return;

        if (this.isOpen) return;
        this.isOpen = true;
        this.createModal();
        this.disableAppFunctions();

        // Aguardar o DOM estar pronto antes de inicializar
        setTimeout(() => {
            this.initializeChart();
            this.setupTickSubscription();
        }, 100);
    }

    // Fechar modal
    hide() {
        if (!this.isOpen) return;

        if (!this.isOpen) return;
        this.isOpen = false;
        this.cleanup();
        this.enableAppFunctions();

        if (this.modal) {
            this.modal.classList.remove('show');
            setTimeout(() => {
                if (this.modal) {
                    this.modal.remove();
                    this.modal = null;
                }
            }, 300);
        }
    }

    // Criar estrutura do modal
    createModal() {
        // Remover modal existente se houver
        const existingModal = document.querySelector('.chart-modal');
        if (existingModal) {
            existingModal.remove();
        }

        this.modal = document.createElement('div');
        this.modal.className = 'chart-modal';
        this.modal.innerHTML = this.getModalHTML();

        document.body.appendChild(this.modal);

        // 🎯 FORÇA POSICIONAMENTO VIA JAVASCRIPT
        this.modal.style.cssText = `
            display: table !important;
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100vw !important;
            height: 100vh !important;
            background-color: rgba(0, 0, 0, 0.85) !important;
            z-index: 2147483647 !important;
            margin: 0 !important;
            padding: 0 !important;
            box-sizing: border-box !important;
            opacity: 0 !important;
            transition: opacity 0.3s ease !important;
        `;

        const overlay = this.modal.querySelector('.chart-modal-overlay');
        if (overlay) {
            overlay.style.cssText = `
                display: table-cell !important;
                vertical-align: middle !important;
                text-align: center !important;
                width: 100vw !important;
                height: 100vh !important;
                padding: 20px !important;
                box-sizing: border-box !important;
            `;
        }

        const content = this.modal.querySelector('.chart-modal-content');
        if (content) {
            content.style.cssText = `
                display: flex !important;
                flex-direction: column !important;
                width: 95% !important;
                max-width: 1400px !important;
                max-height: 90vh !important;
                margin: 0 auto !important;
                background: var(--modal-bg-dark) !important;
                background-color: #0c1318 !important; /* Fundo sólido */
                border: 1px solid var(--modal-border) !important;
                border-radius: 15px !important;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5) !important;
                text-align: left !important;
                color: var(--modal-text) !important;
            `;
        }

        // 🔧 CORREÇÃO DE LAYOUT INTERNO
        const header = this.modal.querySelector('.chart-modal-header');
        if (header) {
            header.style.cssText = `
                display: flex !important;
                justify-content: space-between !important;
                align-items: center !important;
                width: 100% !important;
                padding: 20px !important;
                box-sizing: border-box !important;
                border-bottom: 1px solid var(--modal-border) !important;
                background: var(--modal-header-bg) !important;
                border-radius: 15px 15px 0 0 !important;
            `;
        }

        const body = this.modal.querySelector('.chart-modal-body');
        if (body) {
            body.style.cssText = `
                display: flex !important;
                flex-direction: row !important;
                width: 100% !important;
                flex: 1 !important;
                padding: 20px !important;
                gap: 20px !important;
                box-sizing: border-box !important;
                overflow: hidden !important;
            `;
        }

        const mainContainer = this.modal.querySelector('.chart-main-container');
        if (mainContainer) {
            mainContainer.style.cssText = `
                flex: 1 !important;
                display: flex !important;
                flex-direction: column !important;
                min-width: 0 !important;
            `;
        }

        const toggles = this.modal.querySelector('.chart-view-toggles');
        if (toggles) {
            toggles.style.cssText = `
                display: flex !important;
                gap: 10px !important;
            `;
        }

        // 🔧 ESTILIZAÇÃO DOS BOTÕES DE TOGGLE (não dos botões de trade)
        const toggleButtons = this.modal.querySelectorAll('.chart-toggle');
        toggleButtons.forEach(btn => {
            btn.style.cssText = `
                background: var(--modal-input-bg) !important;
                border: 1px solid var(--primary-color) !important;
                color: var(--primary-color) !important;
                padding: 8px 16px !important;
                border-radius: 6px !important;
                cursor: pointer !important;
                font-weight: 600 !important;
                transition: all 0.3s ease !important;
                text-transform: uppercase !important;
                font-size: 0.8em !important;
                letter-spacing: 0.5px !important;
            `;

            btn.addEventListener('mouseenter', () => {
                btn.style.background = 'rgba(29, 233, 182, 0.1)';
                btn.style.boxShadow = '0 0 10px rgba(29, 233, 182, 0.3)';
            });

            btn.addEventListener('mouseleave', () => {
                btn.style.background = 'var(--modal-input-bg)';
                btn.style.boxShadow = 'none';
            });
        });

        // Estilo específico para o botão ativo
        const activeToggle = this.modal.querySelector('.chart-toggle.active');
        if (activeToggle) {
            activeToggle.style.background = 'rgba(29, 233, 182, 0.2) !important';
            activeToggle.style.color = '#ffffff !important';
        }

        // Animar entrada
        setTimeout(() => {
            this.modal.classList.add('show');
            this.modal.style.opacity = '1';
        }, 10);

        // Event listeners
        this.attachEventListeners();
    }

    // HTML do modal
    getModalHTML() {
        return `
            <div class="chart-modal-overlay">
                <div class="chart-modal-content">
                    <div class="chart-modal-header">
                        <h2>📉 Gráfico em Tempo Real</h2>
                        <div class="chart-view-toggles">
                            <button class="chart-toggle active" data-view="ticks">Ticks</button>
                            <button class="chart-toggle" data-view="digits">Dígitos %</button>
                        </div>
                        <button class="chart-close-btn">✕</button>
                    </div>
                    <div class="chart-modal-body">
                        <div class="chart-main-container">
                            <div class="chart-container">
                                <canvas id="chart-canvas" width="800" height="400"></canvas>
                                <div id="digits-chart" class="digits-chart-container hidden">
                                    <div class="digits-bars">
                                        ${Array.from({ length: 10 }, (_, i) => `
                                            <div class="digit-bar-container">
                                                <div class="digit-bar" data-digit="${i}">
                                                    <div class="digit-bar-fill"></div>
                                                </div>
                                                <div class="digit-percentage">0%</div>
                                                <div class="digit-label">${i}</div>
                                            </div>
                                        `).join('')}
                                    </div>
                                </div>
                            </div>
                            <div class="chart-trade-controls">
                                <div class="chart-modal-warning">
                                    ⚠️ <strong>AVISO:</strong> Todos os trades executados neste modal são <strong>REAIS</strong> (abrem contratos na Deriv), independente da configuração de simulação.
                                </div>
                                <div id="trade-buttons-container" class="trade-buttons">
                                    <!-- Botões serão preenchidos dinamicamente -->
                                </div>
                            </div>
                        </div>
                        <div class="chart-trade-history">
                            <h3>📊 Histórico de Trades</h3>
                            <div class="trade-history-list" id="trade-history-list">
                                <div class="trade-history-empty">
                                    Nenhum trade executado ainda
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // Anexar event listeners
    attachEventListeners() {
        // Fechar modal
        const closeBtn = this.modal.querySelector('.chart-close-btn');
        closeBtn?.addEventListener('click', () => this.hide());

        // Clique no overlay para fechar
        const overlay = this.modal.querySelector('.chart-modal-overlay');
        overlay?.addEventListener('click', (e) => {
            if (e.target === overlay) {
                this.hide();
            }
        });

        // Toggle de visualização
        const toggles = this.modal.querySelectorAll('.chart-toggle');
        toggles.forEach(toggle => {
            toggle.addEventListener('click', () => {
                const view = toggle.dataset.view;
                this.switchView(view);

                // Atualizar UI dos botões
                toggles.forEach(t => t.classList.remove('active'));
                toggle.classList.add('active');
            });
        });

        // ESC para fechar
        this.escHandler = (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.hide();
            }
        };
        document.addEventListener('keydown', this.escHandler);

        // 🔄 Account switch handler
        this.accountSwitchListener = async (event) => {
            await this.handleAccountSwitch(event);
        };
        window.addEventListener('accountSwitched', this.accountSwitchListener);
    }

    // Inicializar gráfico
    initializeChart() {
        const canvas = this.modal.querySelector('#chart-canvas');
        if (!canvas) {
            console.error('❌ [CHART MODAL] Canvas não encontrado!');
            return;
        }

        this.chart = canvas.getContext('2d');

        if (!this.chart) {
            console.error('❌ [CHART MODAL] Contexto 2D não disponível!');
            return;
        }

        // Desenhar gráfico inicial (vazio)
        this.drawChart();
        this.updateTradeButtons();

        this.drawChart();
        this.updateTradeButtons();
    }

    // Atualizar botões de trade
    updateTradeButtons() {
        const container = this.modal.querySelector('#trade-buttons-container');
        if (!container) return;

        container.innerHTML = '';

        const buttons = [
            { type: 'CALL', label: 'SOBE', class: 'btn-call', icon: '📈' },
            { type: 'PUT', label: 'DESCE', class: 'btn-put', icon: '📉' }
        ];

        buttons.forEach(btn => {
            const button = document.createElement('button');
            button.className = `trade-btn ${btn.class}`;
            button.dataset.contract = btn.type;
            button.innerHTML = `${btn.icon} ${btn.label}`;

            button.addEventListener('click', () => this.executeTrade(btn.type));

            container.appendChild(button);
        });
    }

    // Executar trade
    async executeTrade(contractType) {

        const tradeManager = getTradeManagerInstance();
        if (!tradeManager) {
            this.showTradeNotification('❌ Erro: TradeManager não disponível', 'error');
            return;
        }

        // Desabilitar botão temporariamente
        const button = this.modal.querySelector(`[data-contract="${contractType}"]`);
        if (button) {
            button.disabled = true;
            button.textContent = 'Processando...';
        }

        try {
            // 🎯 CRÍTICO: Modal SEMPRE executa trades REAIS (REAL/VIRTUAL)
            // Agora usamos o parâmetro forceMode 'REAL' diretamente no executeImmediateTrade
            // Isso evita a necessidade de mudar o estado global do bot, que causava problemas

            let result;
            try {
                // Executar trade imediato FORÇANDO modo REAL
                result = await tradeManager.executeImmediateTrade(
                    contractType,
                    null,
                    this.currentSymbol,
                    'REAL' // ⚡ forceMode: Sempre REAL
                );
            } catch (e) {
                throw e;
            }

            if (result && result.success) {
                // Adicionar ao histórico do modal
                this.addTradeToHistory({
                    contractType: contractType,
                    contractId: result.contractId,
                    stake: result.stake,
                    payout: result.payout,
                    timestamp: new Date(),
                    mode: 'REAL', // Sempre REAL no modal
                    isSimulation: false // Nunca simulação
                });

                this.showTradeNotification(`✅ Trade ${contractType} executado com sucesso! (Contrato Real)`, 'success');
            } else {
                throw new Error((result && result.error) || 'Falha na execução do trade');
            }

        } catch (error) {
            console.error('❌ [CHART MODAL] Erro ao executar trade:', error);
            this.showTradeNotification(`❌ Erro: ${error.message}`, 'error');
        } finally {
            // Reabilitar botão
            setTimeout(() => {
                if (button) {
                    button.disabled = false;
                    // Restaurar texto original
                    const label = contractType === 'CALL' ? 'SOBE' : 'DESCE';
                    const icon = contractType === 'CALL' ? '📈' : '📉';
                    button.innerHTML = `${icon} ${label}`;
                }
            }, 2000);
        }
    }

    // Alternar visualização
    switchView(view) {
        this.currentView = view;

        const ticksCanvas = this.modal.querySelector('#chart-canvas');
        const digitsChart = this.modal.querySelector('#digits-chart');

        if (view === 'ticks') {
            ticksCanvas.style.display = 'block';
            digitsChart.classList.add('hidden');
            this.drawChart();
        } else {
            ticksCanvas.style.display = 'none';
            digitsChart.classList.remove('hidden');
            this.updateDigitsChart();
        }
    }

    // Configurar subscrição de ticks
    setupTickSubscription() {
        try {
            // Obter símbolo atual do sistema
            const selectedSymbol = window.selectedSymbol || SessionManager.getSessionData('selected_symbol');
            if (!selectedSymbol) {
                console.warn('⚠️ [CHART MODAL] Símbolo não selecionado');
                return;
            }

            this.currentSymbol = selectedSymbol;

            // Obter instância de dados de mercado usando a função global
            this.marketDataInstance = getMarketDataInstance(SessionManager.getLocalToken());
            if (!this.marketDataInstance) {
                return;
            }

            // ✅ Monitorar saúde da conexão
            this.connectionHealthInterval = setInterval(() => {
                if (this.isOpen && this.marketDataInstance) {
                    const ws = this.marketDataInstance.ws;
                    if (!ws || ws.readyState !== WebSocket.OPEN) {
                        this.reconnectMarketData();
                    }
                }
            }, 5000); // Verificar a cada 5 segundos

            // Configurar callback para novos ticks (recebe apenas o preço)
            this.tickCallback = (price) => {
                if (typeof price === 'number' && !isNaN(price)) {
                    this.onNewTick(price);
                }
            };

            // Carregar dados históricos PRIMEIRO
            this.loadHistoricalData(selectedSymbol);

            // Subscrever aos ticks em tempo real
            if (this.marketDataInstance.subscribeToTicks) {
                this.unsubscribeCleanup = this.marketDataInstance.subscribeToTicks(selectedSymbol, this.tickCallback);
            } else {
                console.warn('⚠️ [CHART MODAL] Método subscribeToTicks não disponível');
            }
        } catch (error) {
            console.error('❌ [CHART MODAL] Erro ao configurar subscrição:', error);
        }
    }

    // ✅ Reconectar market data se conexão for perdida
    async reconnectMarketData() {
        try {
            if (this.marketDataInstance && typeof this.marketDataInstance.connect === 'function') {
                await this.marketDataInstance.connect();

                // Reinscrever aos ticks
                if (this.currentSymbol && this.tickCallback) {
                    this.unsubscribeCleanup = this.marketDataInstance.subscribeToTicks(
                        this.currentSymbol,
                        this.tickCallback
                    );
                }
            }
        } catch (error) {
            console.error('❌ [CHART MODAL] Falha ao reconectar:', error);
        }
    }

    // Carregar dados históricos
    loadHistoricalData(symbol) {
        try {
            const historicalData = this.marketDataInstance.getFullHistory(symbol);

            if (historicalData && historicalData.prices && historicalData.prices.length > 0) {
                this.tickData = historicalData.prices.slice(-this.maxTicks).map((price, index) => ({
                    price: parseFloat(price),
                    time: Date.now() - ((historicalData.prices.length - index) * 1000),
                    digit: this.getLastDigit(price)
                }));

                this.updateDigitData();

                // Redesenhar gráficos
                if (this.currentView === 'ticks') {
                    this.drawChart();
                } else {
                    this.updateDigitsChart();
                }
            } else {
                console.warn('⚠️ [CHART MODAL] Nenhum dado histórico encontrado');

                // Criar dados iniciais vazios para mostrar o gráfico
                this.tickData = [];
                this.drawChart();
            }
        } catch (error) {
            console.error('❌ [CHART MODAL] Erro ao carregar dados históricos:', error);
        }
    }

    // Processar novo tick
    onNewTick(price) {
        try {
            // 🛡️ PROTEÇÃO: Não processar se modal foi fechado
            if (!this.isOpen || !this.modal) {
                return;
            }

            // Se recebeu um objeto, extrair o preço
            if (typeof price === 'object' && price !== null) {
                price = parseFloat(price.quote || price.price || price);
            } else {
                price = parseFloat(price);
            }

            if (!price || isNaN(price)) {
                return;
            }

            const digit = this.getLastDigit(price);

            // Adicionar ao array de ticks
            this.tickData.push({
                price: price,
                time: Date.now(),
                digit: digit
            });

            // Manter apenas os últimos ticks
            if (this.tickData.length > this.maxTicks) {
                this.tickData.shift();
            }

            // Atualizar dados dos dígitos
            this.updateDigitData();

            // ✅ THROTTLED REDRAW: Redesenhar apenas se tempo suficiente passou
            const now = Date.now();
            if (now - this.lastDrawTime >= this.drawThrottleMs) {
                this.lastDrawTime = now;
                if (this.currentView === 'ticks') {
                    this.drawChart();
                } else {
                    this.updateDigitsChart();
                }
                this.pendingDraw = false;
            } else if (!this.pendingDraw) {
                // Agendar redesenho para depois
                this.pendingDraw = true;
                setTimeout(() => {
                    if (this.pendingDraw && this.isOpen) {
                        this.lastDrawTime = Date.now();
                        if (this.currentView === 'ticks') {
                            this.drawChart();
                        } else {
                            this.updateDigitsChart();
                        }
                        this.pendingDraw = false;
                    }
                }, this.drawThrottleMs);
            }

        } catch (error) {
            console.error('❌ [CHART MODAL] Erro ao processar tick:', error);
        }
    }

    // Obter último dígito do preço
    getLastDigit(price) {
        try {
            const priceStr = price.toString().replace('.', '');
            const lastDigit = parseInt(priceStr.slice(-1)) || 0;
            return lastDigit;
        } catch (error) {
            console.error('❌ [CHART MODAL] Erro ao extrair último dígito:', error);
            return 0;
        }
    }

    // Atualizar dados dos dígitos
    updateDigitData() {
        this.digitData = Array(10).fill(0);

        // Analisar últimos dígitos do período especificado
        const recentTicks = this.tickData.slice(-this.digitPeriod);
        recentTicks.forEach(tick => {
            if (tick.digit >= 0 && tick.digit <= 9) {
                this.digitData[tick.digit]++;
            }
        });
    }

    // Desenhar gráfico de ticks
    drawChart() {
        if (!this.chart) {
            console.warn('⚠️ [CHART MODAL] Canvas não inicializado para desenhar gráfico');
            return;
        }

        const canvas = this.chart.canvas;
        const width = canvas.width;
        const height = canvas.height;

        // Desenhar fundo preto
        this.chart.fillStyle = '#000000';
        this.chart.fillRect(0, 0, width, height);

        // Se não há dados, mostrar mensagem
        if (this.tickData.length === 0) {
            this.chart.fillStyle = '#ffffff';
            this.chart.font = '18px Arial';
            this.chart.textAlign = 'center';
            this.chart.fillText('Aguardando dados...', width / 2, height / 2);
            return;
        }

        // Configurar cores para fundo preto
        const gridColor = '#333333';
        const textColor = '#ffffff';

        // Desenhar grade
        this.chart.strokeStyle = gridColor;
        this.chart.lineWidth = 1;

        // Linhas horizontais
        for (let i = 0; i <= 10; i++) {
            const y = (height / 10) * i;
            this.chart.beginPath();
            this.chart.moveTo(0, y);
            this.chart.lineTo(width, y);
            this.chart.stroke();
        }

        // Linhas verticais
        for (let i = 0; i <= 10; i++) {
            const x = (width / 10) * i;
            this.chart.beginPath();
            this.chart.moveTo(x, 0);
            this.chart.lineTo(x, height);
            this.chart.stroke();
        }

        // Calcular valores mín/máx
        const prices = this.tickData.map(t => t.price);
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        const priceRange = maxPrice - minPrice || 0.00001; // Evitar divisão por zero

        // Determinar tendência geral (comparar primeiro e último preço)
        const firstPrice = this.tickData[0].price;
        const lastPrice = this.tickData[this.tickData.length - 1].price;
        const isUpTrend = lastPrice > firstPrice;

        // Cores dinâmicas baseadas na tendência
        const lineColor = isUpTrend ? '#00ff00' : '#ff0000'; // Verde para alta, vermelho para baixa
        const fillColor = isUpTrend ? 'rgba(0, 255, 0, 0.1)' : 'rgba(255, 0, 0, 0.1)';

        // Desenhar área preenchida primeiro
        this.chart.fillStyle = fillColor;
        this.chart.beginPath();
        this.chart.moveTo(0, height);

        this.tickData.forEach((tick, index) => {
            const x = (width / (this.tickData.length - 1 || 1)) * index;
            const y = height - ((tick.price - minPrice) / priceRange) * height;

            if (index === 0) {
                this.chart.lineTo(x, y);
            } else {
                this.chart.lineTo(x, y);
            }
        });

        this.chart.lineTo(width, height);
        this.chart.closePath();
        this.chart.fill();

        // Desenhar linha do gráfico com cores dinâmicas por segmento
        this.chart.lineWidth = 2;

        for (let i = 1; i < this.tickData.length; i++) {
            const prevTick = this.tickData[i - 1];
            const currentTick = this.tickData[i];

            const x1 = (width / (this.tickData.length - 1 || 1)) * (i - 1);
            const y1 = height - ((prevTick.price - minPrice) / priceRange) * height;
            const x2 = (width / (this.tickData.length - 1 || 1)) * i;
            const y2 = height - ((currentTick.price - minPrice) / priceRange) * height;

            // Cor do segmento baseada na direção (verde para alta, vermelho para baixa)
            const segmentColor = currentTick.price > prevTick.price ? '#00ff00' : '#ff0000';

            this.chart.strokeStyle = segmentColor;
            this.chart.beginPath();
            this.chart.moveTo(x1, y1);
            this.chart.lineTo(x2, y2);
            this.chart.stroke();
        }

        // Adicionar pontos nos ticks para melhor visualização
        this.tickData.forEach((tick, index) => {
            const x = (width / (this.tickData.length - 1 || 1)) * index;
            const y = height - ((tick.price - minPrice) / priceRange) * height;

            // Cor do ponto baseada na posição relativa
            let pointColor = '#ffffff';
            if (index > 0) {
                pointColor = tick.price > this.tickData[index - 1].price ? '#00ff00' : '#ff0000';
            }

            this.chart.fillStyle = pointColor;
            this.chart.beginPath();
            this.chart.arc(x, y, 2, 0, 2 * Math.PI);
            this.chart.fill();
        });

        // Mostrar informações com texto branco
        this.chart.fillStyle = textColor;
        this.chart.font = '14px Arial';
        this.chart.textAlign = 'left';

        const lastTick = this.tickData[this.tickData.length - 1];
        const trendText = isUpTrend ? '📈 ALTA' : '📉 BAIXA';
        const trendColor = isUpTrend ? '#00ff00' : '#ff0000';

        this.chart.fillText(`Último: ${lastTick.price.toFixed(5)}`, 10, 25);
        this.chart.fillText(`Ticks: ${this.tickData.length}`, 10, 45);
        this.chart.fillText(`Min: ${minPrice.toFixed(5)} | Max: ${maxPrice.toFixed(5)}`, 10, 65);

        // Mostrar tendência com cor
        this.chart.fillStyle = trendColor;
        this.chart.fillText(`Tendência: ${trendText}`, 10, 85);
    }

    // Atualizar gráfico de dígitos
    updateDigitsChart() {
        const totalTicks = Math.min(this.tickData.length, this.digitPeriod);

        if (totalTicks === 0) {
            // Mostrar barras vazias
            this.digitData.forEach((count, digit) => {
                const barFill = this.modal.querySelector(`.digit-bar[data-digit="${digit}"] .digit-bar-fill`);
                const percentageLabel = this.modal.querySelector(`.digit-bar-container:nth-child(${digit + 1}) .digit-percentage`);

                if (barFill && percentageLabel) {
                    barFill.style.height = '0%';
                    percentageLabel.textContent = '0%';
                    barFill.style.backgroundColor = '#1976d2'; // Azul padrão
                }
            });
            return;
        }

        // Calcular percentuais e encontrar maior e menor
        const percentages = [];
        let maxCount = -1, minCount = Infinity;
        let maxDigit = -1, minDigit = -1;

        this.digitData.forEach((count, digit) => {
            const percentage = parseFloat(((count / totalTicks) * 100).toFixed(1));
            percentages[digit] = percentage;

            if (count > maxCount) {
                maxCount = count;
                maxDigit = digit;
            }
            if (count < minCount) {
                minCount = count;
                minDigit = digit;
            }
        });

        // Atualizar barras com cores baseadas em maior/menor
        this.digitData.forEach((count, digit) => {
            const percentage = percentages[digit];

            const barFill = this.modal.querySelector(`.digit-bar[data-digit="${digit}"] .digit-bar-fill`);
            const percentageLabel = this.modal.querySelector(`.digit-bar-container:nth-child(${digit + 1}) .digit-percentage`);

            if (barFill && percentageLabel) {
                barFill.style.height = `${percentage}%`;
                percentageLabel.textContent = `${percentage}%`;

                // Sistema de cores: Verde para maior, Vermelho para menor, Azul para outros
                if (digit === maxDigit && maxCount > 0) {
                    barFill.style.backgroundColor = '#4CAF50'; // Verde para maior
                } else if (digit === minDigit && totalTicks > 1) {
                    barFill.style.backgroundColor = '#f44336'; // Vermelho para menor
                } else {
                    barFill.style.backgroundColor = '#1976d2'; // Azul para outros
                }
            }
        });
    }

    // Atualizar botões de trade
    updateTradeButtons() {
        const container = this.modal.querySelector('#trade-buttons-container');
        if (!container) return;

        // Obter configurações atuais
        const tradeTypeSelect = document.getElementById('trade-type-select');
        const contractSelect = document.getElementById('contract-select');

        const selectedTradeType = tradeTypeSelect?.value;
        const selectedContract = contractSelect?.value;

        let buttonsHTML = '';

        if (selectedTradeType === 'BOTH') {
            // Modo Ambos - mostrar ambos os contratos do grupo
            const bothContracts = this.getBothContracts();
            if (bothContracts && bothContracts.contracts) {
                bothContracts.contracts.forEach(contractType => {
                    const contractName = this.getContractDisplayName(contractType);
                    buttonsHTML += `
                        <button class="chart-trade-btn" data-contract="${contractType}">
                            ${contractName}
                        </button>
                    `;
                });
            }
        } else if (selectedContract) {
            // Contrato específico
            const contractName = this.getContractDisplayName(selectedContract);
            buttonsHTML += `
                <button class="chart-trade-btn" data-contract="${selectedContract}">
                    ${contractName}
                </button>
            `;
        }

        container.innerHTML = buttonsHTML;

        // Anexar event listeners aos botões
        const tradeButtons = container.querySelectorAll('.chart-trade-btn');
        tradeButtons.forEach(button => {
            button.addEventListener('click', () => {
                const contractType = button.dataset.contract;
                this.executeTrade(contractType);
            });
        });
    }

    // Obter contratos para modo Ambos
    getBothContracts() {
        const contractSelect = document.getElementById('contract-select');
        if (!contractSelect?.value) return null;

        const contractGroups = {
            'Over/Under': ['DIGITOVER', 'DIGITUNDER'],
            'Call/Put': ['CALL', 'PUT'],
            'Higher/Lower': ['CALLE', 'PUTE'],
            'Differ/Match': ['DIGITDIFF', 'DIGITMATCH'],
            'Even/Odd': ['DIGITEVEN', 'DIGITODD']
        };

        const selectedOption = contractSelect.options[contractSelect.selectedIndex];
        const groupName = selectedOption?.getAttribute('data-group');

        if (groupName && contractGroups[groupName]) {
            return {
                groupName,
                contracts: contractGroups[groupName]
            };
        }

        // Buscar por contrato individual
        const selectedContract = contractSelect.value;
        for (const [groupName, contracts] of Object.entries(contractGroups)) {
            if (contracts.includes(selectedContract)) {
                return {
                    groupName,
                    contracts: contracts
                };
            }
        }

        return null;
    }

    // Obter nome de exibição do contrato
    getContractDisplayName(contractType) {
        const displayNames = {
            'DIGITOVER': 'Over',
            'DIGITUNDER': 'Under',
            'CALL': 'Call',
            'PUT': 'Put',
            'CALLE': 'Higher',
            'PUTE': 'Lower',
            'DIGITDIFF': 'Differ',
            'DIGITMATCH': 'Match',
            'DIGITEVEN': 'Even',
            'DIGITODD': 'Odd'
        };

        return displayNames[contractType] || contractType;
    }

    // 🎯 NOVO: Coletar parâmetros do trade da UI
    gatherTradeParameters(contractType) {
        // Obter valores dos inputs
        const stakeInput = document.getElementById('stake-input');
        const durationInput = document.getElementById('duration-input');
        const durationTypeSelect = document.getElementById('duration-type-select');

        // Obter símbolo atual
        const symbol = this.currentSymbol || window.selectedSymbol || SessionManager.getSessionData('selected_symbol');

        // Obter previsão se necessário
        let prediction = null;
        if (this.requiresPrediction(contractType)) {
            prediction = this.getDefaultPrediction(contractType);
        }

        return {
            contractType,
            prediction,
            duration: parseInt(durationInput?.value) || 1,
            durationType: durationTypeSelect?.value || 't',
            stake: parseFloat(stakeInput?.value) || 1,
            symbol
        };
    }

    // Verificar se contrato requer previsão
    requiresPrediction(contractType) {
        return ['DIGITOVER', 'DIGITUNDER', 'DIGITDIFF', 'DIGITMATCH'].includes(contractType);
    }

    // Obter previsão padrão
    getDefaultPrediction(contractType) {
        // Usar previsão do último dígito ou padrão
        const lastTick = this.tickData[this.tickData.length - 1];
        if (lastTick && lastTick.digit !== undefined) {
            return lastTick.digit;
        }
        return 5; // Padrão
    }

    // Executar trade (INDEPENDENTE do monitoramento)
    async executeTrade(contractType) {
        try {
         
            // Desabilitar botão temporariamente
            const button = this.modal.querySelector(`[data-contract="${contractType}"]`);
            if (button) {
                button.disabled = true;
                button.textContent = 'Executando...';
            }

            // Obter instância do TradeManager
            const tradeManager = getTradeManagerInstance();
            if (!tradeManager) {
                throw new Error('TradeManager não disponível');
            }

          
            const result = await tradeManager.executeImmediateTrade(
                contractType,
                null,  // prediction
                this.currentSymbol,
                'REAL' // forceMode
            );

            if (result && result.success) {
                // Adicionar ao histórico do modal
                this.addTradeToHistory({
                    contractType: contractType,
                    contractId: result.contractId,
                    stake: result.stake,
                    payout: result.payout,
                    timestamp: new Date(),
                    mode: 'REAL',
                    isSimulation: false
                });

                this.showTradeNotification(`✅ Trade ${contractType} executado! Contrato: ${result.contractId}`, 'success');
            } else {
                throw new Error(result.error || 'Falha na execução do trade');
            }

        } catch (error) {
            console.error('❌ [CHART MODAL] Erro ao executar trade:', error);
            this.showTradeNotification(`❌ Erro: ${error.message}`, 'error');
        } finally {
            // Reabilitar botão
            setTimeout(() => {
                // 🎯 FIX: Verificar se modal ainda existe antes de buscar botão
                if (this.modal) {
                    const button = this.modal.querySelector(`[data-contract="${contractType}"]`);
                    if (button) {
                        button.disabled = false;
                        button.textContent = this.getContractDisplayName(contractType);
                    }
                }
            }, 2000);
        }
    }

    // Mostrar notificação de trade
    showTradeNotification(message, type) {
        const notification = document.createElement('div');
        notification.className = `chart-trade-notification ${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            padding: 15px 25px;
            border-radius: 8px;
            font-weight: bold;
            z-index: 999999;
            opacity: 0;
            transition: opacity 0.3s ease;
            ${type === 'success' ? 'background: #4CAF50; color: white;' : 'background: #f44336; color: white;'}
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.opacity = '1';
        }, 10);

        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 3000);
    }

    // Desabilitar funções do app
    disableAppFunctions() {
        // Adicionar classe ao body para desfocar fundo
        document.body.classList.add('chart-modal-active');

        // Desabilitar botões de monitoramento
        const startBtn = document.getElementById('start-monitoring-btn');
        const stopBtn = document.getElementById('stop-monitoring-btn');

        if (startBtn && !startBtn.disabled) {
            startBtn.disabled = true;
            startBtn.dataset.chartDisabled = 'true';
        }
        if (stopBtn && !stopBtn.disabled) {
            stopBtn.disabled = true;
            stopBtn.dataset.chartDisabled = 'true';
        }

        // Desabilitar outros botões do header
        const headerButtons = document.querySelectorAll('.header-center-actions button:not([data-chart-btn])');
        headerButtons.forEach(btn => {
            if (!btn.disabled) {
                btn.disabled = true;
                btn.dataset.chartDisabled = 'true';
            }
        });
    }

    // Reabilitar funções do app
    enableAppFunctions() {
        // Remover classe do body
        document.body.classList.remove('chart-modal-active');

        // Reabilitar botões que foram desabilitados pelo modal
        const disabledElements = document.querySelectorAll('[data-chart-disabled="true"]');
        disabledElements.forEach(element => {
            element.disabled = false;
            delete element.dataset.chartDisabled;
        });

        // 🎯 CRÍTICO: Sincronizar estado do MonitoringView com estado do botão
        // Se o botão de iniciar monitoramento foi reabilitado, garantir que o state seja IDLE
        const startBtn = document.getElementById('start-monitoring-btn');
        if (startBtn && !startBtn.disabled) {
            // Botão habilitado = estado DEVE ser IDLE
            if (typeof MonitoringView !== 'undefined' &&
                (MonitoringView.state === 'MONITORING' || MonitoringView.state === 'COOLDOWN')) {
              
                MonitoringView.state = 'IDLE';
            }
        }
    }

    // Adicionar trade ao histórico
    addTradeToHistory(tradeData) {
       
        const tradeId = Date.now() + Math.random();

        this.tradeHistory.unshift({
            ...tradeData,
            id: tradeId,
            status: 'pending' // pending, win, loss
        });

        // Manter apenas os últimos itens
        if (this.tradeHistory.length > this.maxHistoryItems) {
            this.tradeHistory = this.tradeHistory.slice(0, this.maxHistoryItems);
        }

        this.updateTradeHistoryDisplay();

        // Monitorar resultado do contrato
        if (tradeData.contractId) {
         
            this.monitorTradeResult(tradeData.contractId, tradeId);
        } else {
            console.error('❌ [CHART MODAL] ContractID não fornecido:', tradeData);
        }
    }

    // Monitorar resultado de um trade específico
    async monitorTradeResult(contractId, tradeId) {
        try {
          
            const tradeManager = getTradeManagerInstance();
            if (!tradeManager || !tradeManager.tradingAPI) {
                console.error('❌ [CHART MODAL] Trading API não disponível');
                return;
            }

            if (!contractId || contractId === 'unknown') {
                console.error('❌ [CHART MODAL] Contract ID inválido:', contractId);
                return;
            }

            // Subscrever ao contrato usando o método correto da API
            const subscription = {
                proposal_open_contract: 1,
                contract_id: contractId,
                subscribe: 1
            };

            // Usar sendRequest que retorna uma Promise e permite callback
            const response = await tradeManager.tradingAPI.sendRequest(subscription);

            // Processar primeira atualização
            if (response.proposal_open_contract) {
                this.handleContractUpdate(response.proposal_open_contract, tradeId);
            }

            // Configurar callback para atualizações subsequentes
            const originalOnMessage = tradeManager.tradingAPI.ws.onmessage;

            tradeManager.tradingAPI.ws.onmessage = (event) => {
                // Chamar handler original primeiro
                if (originalOnMessage) {
                    originalOnMessage.call(tradeManager.tradingAPI.ws, event);
                }

                try {
                    const data = JSON.parse(event.data);

                    // Verificar se é atualização do nosso contrato
                    if (data.proposal_open_contract &&
                        data.proposal_open_contract.contract_id === contractId) {

                        // console.log('📈 [CHART MODAL] Atualização recebida:', data.proposal_open_contract);
                        this.handleContractUpdate(data.proposal_open_contract, tradeId);

                        // Se finalizado, restaurar handler original e atualizar saldo
                        if (data.proposal_open_contract.is_settled ||
                            data.proposal_open_contract.status === 'sold') {

                            tradeManager.tradingAPI.ws.onmessage = originalOnMessage;

                            // 🔄 ATUALIZAR HISTÓRICO
                            const tradeIndex = this.tradeHistory.findIndex(t => t.id === tradeId);
                            if (tradeIndex !== -1) {
                                const trade = this.tradeHistory[tradeIndex];
                                const contract = data.proposal_open_contract;

                                trade.profit = parseFloat(contract.profit) || 0;
                                trade.status = trade.profit > 0 ? 'win' : 'loss';
                                trade.finalPrice = contract.exit_spot;

                                // Forçar atualização da UI
                                if (typeof this.updateTradeHistoryDisplay === 'function') {
                                    this.updateTradeHistoryDisplay();
                                }
                            }

                            // 💰 ATUALIZAR SALDO
                            setTimeout(() => {
                                if (typeof this.refreshBalance === 'function') {
                                    this.refreshBalance();
                                } else if (typeof FooterUtils !== 'undefined' && typeof FooterUtils.updateAccountBalance === 'function') {
                                    FooterUtils.updateAccountBalance();
                                }
                            }, 1000);
                        }
                    }
                } catch (error) {
                    console.error('❌ [CHART MODAL] Erro ao processar mensagem:', error);
                }
            };

        } catch (error) {
            console.error('❌ [CHART MODAL] Erro ao monitorar contrato:', error);
        }
    }

    // 🆕 Atualizar saldo do rodapé
    async refreshBalance() {
        try {
          
            // Usar FooterManager para atualização consistente
            if (window.FooterManager && typeof FooterManager.updateAccountBalance === 'function') {
                await FooterManager.updateAccountBalance();
              
                return;
            }

            // Fallback: Atualizar diretamente via API
            const tradeManager = getTradeManagerInstance();
            if (tradeManager && tradeManager.tradingAPI && tradeManager.tradingAPIConnected) {
                const token = SessionManager.getLocalToken();
                if (token) {
                    const authResponse = await tradeManager.tradingAPI.sendRequest({ authorize: token });

                    if (authResponse.authorize && authResponse.authorize.balance) {
                        // Atualizar saldo no SessionManager
                        const currentUser = SessionManager.getCurrentUser();
                        if (currentUser && currentUser.balance) {
                            currentUser.balance.balance = parseFloat(authResponse.authorize.balance);

                            // Disparar evento para atualizar UI
                            window.dispatchEvent(new CustomEvent('balanceUpdated', {
                                detail: {
                                    balance: authResponse.authorize.balance,
                                    currency: authResponse.authorize.currency,
                                    amount: parseFloat(authResponse.authorize.balance).toFixed(2)
                                }
                            }));

                        }
                    }
                }
            }
        } catch (error) {
            console.error('❌ [CHART MODAL] Erro ao atualizar saldo:', error);
        }
    }

    // 🔄 Handle account switch event
    async handleAccountSwitch(event) {
        try {
         
            // 1. Force TradeManager to reset its trading API connection
            const tradeManager = getTradeManagerInstance();
            if (tradeManager) {
                // Disconnect old connection immediately
                if (typeof tradeManager.disconnectTradingAPI === 'function') {
                    tradeManager.disconnectTradingAPI();
                
                }

              
                await new Promise(resolve => setTimeout(resolve, 1500));

                // Force reconnection with new account
                if (typeof tradeManager.initializeTradingConnection === 'function') {
                    const connected = await tradeManager.initializeTradingConnection();
                   
                }
            }

            // 2. Refresh balance display
            await this.refreshBalance();

            // 3. Show notification to user
            if (this.isOpen) {
                this.showTradeNotification('🔄 Conta alterada com sucesso', 'success');
            }

        } catch (error) {
            console.error('❌ [CHART MODAL] Erro ao processar troca de conta:', error);
            if (this.isOpen) {
                this.showTradeNotification('⚠️ Erro ao trocar conta', 'error');
            }
        }
    }


    // Processar atualização do contrato
    // Processar atualização do contrato
    handleContractUpdate(contractData, tradeId) {
      
        const tradeIndex = this.tradeHistory.findIndex(t => t.id === tradeId);

        if (tradeIndex === -1) {
            return;
        }

        const trade = this.tradeHistory[tradeIndex];

        // Atualizar dados do trade
        if (contractData.entry_spot) {
            trade.entryPrice = contractData.entry_spot;
        }

        if (contractData.exit_spot) {
            trade.exitPrice = contractData.exit_spot;
        }

        if (contractData.profit !== undefined) {
            trade.profit = parseFloat(contractData.profit);
        }

        // 🎯 NOVO: Atualizar status quando contrato for finalizado
        if (contractData.is_settled || contractData.status === 'sold') {
            trade.status = trade.profit > 0 ? 'win' : 'loss';
         
        }

        // SEMPRE atualizar display
        if (typeof this.updateTradeHistoryDisplay === 'function') {
            this.updateTradeHistoryDisplay();
        }
    }

    // Atualizar display do histórico
    updateTradeHistoryDisplay() {
        const historyList = this.modal?.querySelector('#trade-history-list');
        if (!historyList) return;

        if (this.tradeHistory.length === 0) {
            historyList.innerHTML = `
                <div class="trade-history-empty">
                    Nenhum trade executado ainda
                </div>
            `;
            return;
        }

        historyList.innerHTML = this.tradeHistory.map(trade => {
            const resultClass = trade.isSimulation ? 'simulation' :
                trade.status === 'win' ? 'win' :
                    trade.status === 'loss' ? 'loss' : '';

            const resultText = trade.isSimulation ?
                (trade.status === 'win' ? 'Simulação' : trade.status === 'loss' ? 'Simulação' : 'Simulação') :
                trade.status === 'win' ? `+$${Math.abs(trade.profit || 0).toFixed(2)}` :
                    trade.status === 'loss' ? `-$${Math.abs(trade.profit || 0).toFixed(2)}` :
                        'Aguardando...';

            return `
                <div class="trade-history-item ${resultClass}">
                    <div class="trade-item-header">
                        <div class="trade-item-contract">${trade.contractType}</div>
                        <div class="trade-item-time">${trade.timestamp.toLocaleTimeString()}</div>
                    </div>
                    <div class="trade-item-result ${resultClass}">
                        ${resultText}
                    </div>
                    <div class="trade-item-details">
                        Stake: $${(trade.stake || 0).toFixed(2)}
                        ${trade.entryPrice ? `<br>Entrada: ${trade.entryPrice}` : ''}
                        ${trade.exitPrice ? `<br>Saída: ${trade.exitPrice}` : ''}
                    </div>
                </div>
            `;
        }).join('');
    }

    // Limpeza ao fechar
    cleanup() {
        // Limpar verificação de saúde da conexão
        if (this.connectionHealthInterval) {
            clearInterval(this.connectionHealthInterval);
            this.connectionHealthInterval = null;
        }

        // Remover subscrição de ticks usando o cleanup retornado
        if (this.unsubscribeCleanup && typeof this.unsubscribeCleanup === 'function') {
            try {
                this.unsubscribeCleanup();
            } catch (error) {
                console.error('❌ [CHART MODAL] Erro ao executar cleanup:', error);
            }
        }

        // Remover event listener de ESC
        if (this.escHandler) {
            document.removeEventListener('keydown', this.escHandler);
            this.escHandler = null;
        }

        // 🔄 Remover event listener de account switch
        if (this.accountSwitchListener) {
            window.removeEventListener('accountSwitched', this.accountSwitchListener);
            this.accountSwitchListener = null;
        }

        // Limpar dados
        this.tickData = [];
        this.digitData = Array(10).fill(0);
        this.chart = null;
        this.marketDataInstance = null;
        this.tickCallback = null;
        this.unsubscribeCleanup = null;
        this.currentSymbol = null;
        this.tradeHistory = [];
    }
}

// Instância global
let chartModalInstance = null;

// Função para obter/criar instância
function getChartModalInstance() {
    if (!chartModalInstance) {
        chartModalInstance = new ChartModal();
    }
    return chartModalInstance;
}

// Exportar para uso global
window.ChartModal = ChartModal;
window.getChartModalInstance = getChartModalInstance;
