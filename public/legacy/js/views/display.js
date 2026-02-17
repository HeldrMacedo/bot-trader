// js/views/display.js
// Exibição de dados de mercado em tempo real
// O SISTEMA DEVE SER 100% ISOLADO POR USUARIO

class DisplayView {
    constructor(containerId = null) {
        // ❌ REMOVIDO fallback de R_10 - ativo DEVE ser definido via setSymbol()
        this.currentSymbol = null; // Ativo será definido após inicialização
        this.marketData = null;
        this.isSubscribed = false;
        this.isInitializing = false; // Flag para evitar inicializações múltiplas
        this.isPaused = false; // Flag para pausar atualizações
        this.isDestroyed = false; // Flag para indicar se a instância foi destruída

        // ✅ CORREÇÃO: Instance-scoped container para evitar duplicação
        this.containerId = containerId;
        this.containerElement = null; // Será definido no render
        this.unsubscribeFromTicks = null; // Função para desinscrever de ticks

        // ✅ CORREÇÃO: Registrar instância para controle global
        if (!window.__displayInstances) {
            window.__displayInstances = {};
        }
        if (containerId) {
            window.__displayInstances[containerId] = this;
        }
    }

    static render(containerId, isHeaderMode = false, displayMode = 'full') {
        const container = CommonHelpers.getElement(containerId);
        if (!container) return;

        // ✅ CORREÇÃO: Criar instância com containerId específico
        const instance = new DisplayView(containerId);
        instance.containerElement = container;

        // Adicionar CSS específico do Display
        DisplayView.addDisplayCSS();

        // Determinar se é modo cabeçalho baseado no ID do container
        const headerMode = containerId === 'header-display-block' || containerId === 'header-price-display' || containerId === 'header-digits-display' || isHeaderMode;

        const headerHtml = headerMode ? '' : `
            <div class="block-header">
                <h3>Display de Preços</h3>
            </div>`;

        // Determinar qual seção exibir baseado no displayMode
        let priceSection = '';
        let digitsSection = '';
        // ✅ REMOVIDO statusSection

        if (displayMode === 'full' || displayMode === 'price') {
            priceSection = `
                <div class="price-display-section">
                    <div class="current-price" id="current-price">
                        <div class="prices-container" id="prices-container">
                            <div class="price-item">---.---</div>
                            <div class="price-item">---.---</div>
                            <div class="price-item">---.---</div>
                            <div class="price-item">---.---</div>
                            <div class="price-item">---.---</div>
                        </div>
                        <span class="price-symbol" id="price-symbol"></span>
                    </div>
                </div>`;
        }

        if (displayMode === 'full' || displayMode === 'digits') {
            digitsSection = `
                <div class="digits-display-section">
                    <div class="digits-container" id="digits-container">
                        <div class="digit-item">-</div>
                        <div class="digit-item">-</div>
                        <div class="digit-item">-</div>
                        <div class="digit-item">-</div>
                        <div class="digit-item">-</div>
                        <div class="digit-item">-</div>
                        <div class="digit-item">-</div>
                        <div class="digit-item">-</div>
                        <div class="digit-item">-</div>
                        <div class="digit-item">-</div>
                    </div>
                    <div class="digits-legend">
                    </div>
                </div>`;
        }

        // Determinar classe do header baseado no modo
        const headerClass = headerMode ? ' header-mode' : '';

        // ✅ REMOVIDO A GERAÇÃO DA SEÇÃO DE STATUS
        container.innerHTML = `
            ${headerHtml}
            <div class="block-content">
                <div class="display-container${headerClass}">
                    ${priceSection}
                    ${digitsSection}
                </div>
            </div>
        `;

        // Inicializar a instância do DisplayView
        // ✅ CORREÇÃO: Usar apenas a instância instance-scoped já criada
        instance.initialize();


        // 🎯 CRÍTICO: Definir símbolo ANTES de iniciar display
        const selectedSymbol = window.selectedSymbol || SessionManager.getSessionData('selected_symbol');
        if (selectedSymbol) {

            instance.setSymbol(selectedSymbol);
        } else {
            CommonHelpers.showWarning('⚠️ [DISPLAY RENDER] Nenhum símbolo selecionado ainda');
        }

        // ⚡ Iniciar display automaticamente se WebSocket já está pronto
        setTimeout(() => {
            instance.startDisplayWithRetry();
        }, 200);
    }

    static addDisplayCSS() {
        // Verificar se o CSS já foi adicionado
        if (CommonHelpers.getElement('display-view-css', true)) return;

        const style = document.createElement('style');
        style.id = 'display-view-css';
        style.textContent = `
            /* CSS específico para DisplayView */
            .display-container {
                background: var(--bg-secondary);
                border-radius: 12px;
                padding: 25px;
                margin: 15px 0;
                box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
                /* ✅ BORDA MAIS ESCURA ADICIONADA */
                border: 1px solid var(--border-color);
            }

            .price-display-section {
                text-align: center;
                margin-bottom: 30px;
            }

            /* ✅ REMOVIDO: .block-header h3 { ... } - este era para o título "Display de Preços" */

            /* ✅ REMOVIDO: Texto "Grupo de Contratos:" - está sendo removido no JS */

            .current-price {
                background: rgba(255, 255, 255, 0.05);
                border-radius: 10px;
                padding: 20px;
                box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
                border: 1px solid var(--border-color);
            }

            .price-value {
                display: block;
                font-size: 2.5em;
                font-weight: bold;
                color: var(--accent-primary);
                font-family: 'Courier New', monospace;
                letter-spacing: 2px;
                margin-bottom: 5px;
                transition: transform 0.2s ease;
            }

            .price-symbol {
                display: block;
                font-size: 1.1em;
                color: var(--text-secondary);
                font-weight: 500;
            }

            .digits-display-section {
                margin-bottom: 25px;
            }

            /* ✅ REMOVIDO: .digits-display-section h4 { ... } - este era para "📊 Contadores de Trading" */

            .digits-container {
                display: flex;
                justify-content: center;
                gap: 8px;
                flex-wrap: wrap;
                margin-bottom: 10px;
            }

            .digit-item {
                width: 45px;
                height: 45px;
                background: rgba(255, 255, 255, 0.05);
                border: 1px solid var(--border-color);
                border-radius: 8px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 1.8em;
                font-weight: bold;
                font-family: 'Courier New', monospace;
                color: var(--text-primary);
                box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
                transition: all 0.3s ease;
            }

            .digit-item.new {
                background: #4caf50;
                color: white;
                border-color: #4caf50;
                transform: scale(1.1);
            }

            .digit-item.active {
                background: #2196f3;
                color: white;
                border-color: #2196f3;
            }

            .digits-legend {
                text-align: center;
                margin-top: 10px;
            }

            .legend-text {
                font-size: 0.9em;
                color: var(--text-secondary);
                font-style: italic;
            }

            /* ✅ REMOVIDO: Seção de status completo */
            /*
            .status-section {
                text-align: center;
            }

            .status-indicator {
                display: inline-flex;
                align-items: center;
                gap: 8px;
                padding: 8px 15px;
                background: #ffffff;
                border-radius: 20px;
                box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
            }

            .status-dot {
                width: 12px;
                height: 12px;
                border-radius: 50%;
                animation: pulse 2s infinite;
            }

            .status-dot.offline {
                background: #f44336;
            }

            .status-dot.online {
                background: #4caf50;
            }

            .status-dot.connecting {
                background: #ff9800;
            }

            .status-text {
                font-weight: 600;
                font-size: 0.9em;
            }

            @keyframes pulse {
                0% { opacity: 1; }
                50% { opacity: 0.5; }
                100% { opacity: 1; }
            }
            */

            @keyframes digitHighlight {
                0% { transform: scale(1); }
                50% { transform: scale(1.2); }
                100% { transform: scale(1); }
            }

            .digit-item.highlight {
                animation: digitHighlight 0.5s ease;
            }

            /* Responsividade */
            @media (max-width: 768px) {
                .display-container {
                    padding: 15px;
                }

                .price-value {
                    font-size: 2em;
                }

                .digit-item {
                    width: 35px;
                    height: 35px;
                    font-size: 1.5em;
                }

                .digits-container {
                    gap: 5px;
                }
            }
        `;

        document.head.appendChild(style);
    }

    initialize() {
        this.setupSymbolListener();
        // Não precisamos mais dos event listeners dos botões
    }

    async startDisplayWithRetry() {


        // Verificar se WebSocket está disponível antes de tentar
        const token = SessionManager.getLocalToken();
        if (!token) {

            this.startAutoRetry();
            return;
        }

        const marketData = getMarketDataInstance(token);
        if (!marketData || !marketData.isReady()) {

            this.startAutoRetry();
            return;
        }

        // WebSocket pronto, iniciar imediatamente

        await this.startDisplay();

        // Se não conseguiu se inscrever, configurar retry
        if (!this.isSubscribed) {

            this.startAutoRetry();
        }
    }

    startAutoRetry() {
        if (this.autoRetryInterval) {
            clearInterval(this.autoRetryInterval);
        }

        this.autoRetryInterval = setInterval(async () => {
            const token = SessionManager.getLocalToken();
            if (token && !this.isSubscribed) {

                clearInterval(this.autoRetryInterval);
                this.autoRetryInterval = null;
                this.retryCount = 0; // Reset do contador
                await this.startDisplay();
            }
        }, 2000); // Tentar a cada 2 segundos
    }

    setupSymbolListener() {
        // Configurar listener com retry para garantir que o elemento existe
        const setupListener = () => {
            const symbolSelect = CommonHelpers.getElement('symbol-select', true);
            if (symbolSelect) {
                // Remover listener anterior se existir
                symbolSelect.removeEventListener('change', this.symbolChangeHandler);

                // Criar handler bound para poder remover depois
                this.symbolChangeHandler = (event) => {
                    const selectedSymbol = event.target.value;
                    if (selectedSymbol && selectedSymbol !== this.currentSymbol) {


                        this.currentSymbol = selectedSymbol;
                        this.updateSymbolDisplay(selectedSymbol);

                        // Reiniciar automaticamente com o novo símbolo
                        this.restartDisplay();
                    }
                };

                symbolSelect.addEventListener('change', this.symbolChangeHandler);

                return true;
            }
            return false;
        };

        // Primeiro, tentar configurar imediatamente
        if (!setupListener()) {
            // Se não conseguiu, tentar novamente em intervalos
            let attempts = 0;
            const maxAttempts = 10;

            const retrySetup = setInterval(() => {
                attempts++;
                if (setupListener() || attempts >= maxAttempts) {
                    clearInterval(retrySetup);

                }
            }, 500);
        }
    }

    updateSymbolDisplay(symbol) {
        const priceSymbolElements = document.querySelectorAll('#price-symbol');
        priceSymbolElements.forEach(priceSymbolElement => {
            if (priceSymbolElement) {
                // Buscar o nome do símbolo nos dados carregados
                const symbolSelect = CommonHelpers.getElement('symbol-select', true);
                const selectedOption = symbolSelect?.querySelector(`option[value="${symbol}"]`);
                const displayName = selectedOption?.textContent || symbol;

                priceSymbolElement.textContent = displayName;
            }
        });
    }

    async startDisplay() {
        // 🔧 OTIMIZAÇÃO: Verificar se já está em processo de inicialização
        if (this.isInitializing) {

            return;
        }

        if (this.isSubscribed) {

            return;
        }

        this.isInitializing = true;

        try {

            this.updateStatus('connecting', 'Conectando...');

            // 🔑 CRÍTICO: Verificar se há token válido antes de tentar conectar
            const token = SessionManager.getLocalToken();
            if (!token) {
                CommonHelpers.showWarning('⚠️ Token não disponível para display de preços. Aguardando login...');
                this.updateStatus('offline', 'Aguardando login...');

                // Tentar novamente após delay
                if (!this.retryCount) this.retryCount = 0;
                this.retryCount++;

                if (this.retryCount < 15) {
                    setTimeout(() => this.startDisplay(), 1500);
                } else {
                    CommonHelpers.showError('❌ DisplayView: Muitas tentativas fallidas. Parando tentativas de reconexão.');
                    this.updateStatus('offline', 'Erro: Token não disponível');
                }
                return;
            }

            // ✅ VALIDAÇÃO CRÍTICA: Verificar se símbolo está definido
            if (!this.currentSymbol) {
                console.error('❌ [DISPLAY] Símbolo não definido - não é possível iniciar display');
                this.updateStatus('offline', 'Erro: Símbolo não definido');
                return;
            }

            // Reset retry count se conseguiu token
            this.retryCount = 0;

            // Obter instância do market data
            this.marketData = getMarketDataInstance(token);

            // Garantir que está conectado e autorizado
            if (!this.marketData.isReady()) {

                await this.marketData.connect();

                // Aguardar autorização com retry
                let waitAttempts = 0;
                while (!this.marketData.isReady() && waitAttempts < 15) {

                    await new Promise(resolve => setTimeout(resolve, 500));
                    waitAttempts++;
                }

                if (!this.marketData.isReady()) {
                    throw new Error("WebSocket não conseguiu autorizar após múltiplas tentativas");
                }
            }


            // Primeiro, obter histórico para popular os últimos 10 dígitos
            await this.loadInitialHistory();

            // Depois, se inscrever para receber ticks em tempo real
            await this.subscribeToSymbolTicks(this.currentSymbol);

            this.isSubscribed = true;
            this.updateStatus('online', 'Online');

            // 🔄 Parar retry automático quando consegue conectar
            if (this.autoRetryInterval) {
                clearInterval(this.autoRetryInterval);
                this.autoRetryInterval = null;
            }

        } catch (error) {
            console.error('❌ [DISPLAY] Erro ao iniciar display:', error);

            // Tratamento específico para diferentes tipos de erro
            if (error.message.includes('Estado inválido')) {
                console.error('🚨 [DISPLAY] Erro de estado inválido detectado - reiniciando subscrição');
                this.isSubscribed = false;
                this.updateStatus('offline', 'Reiniciando...');

                // Aguardar um pouco e tentar novamente
                setTimeout(() => this.startDisplay(), 2000);
            } else {
                CommonHelpers.showError('❌ Erro ao iniciar display:', error);
                this.updateStatus('offline', 'Erro de conexão');

                // Retry com delay maior para outros tipos de erro
                setTimeout(() => this.startDisplay(), 5000);
            }
        } finally {
            this.isInitializing = false;
        }
    }

    async loadInitialHistory() {
        try {
            // ❌ CORREÇÃO CRÍTICA: Verificar se símbolo está definido
            if (!this.currentSymbol) {
                CommonHelpers.showError('❌ [DISPLAY] Símbolo não definido para loadInitialHistory');
                this.initializeEmptyArrays();
                return;
            }

            // ✅ NOVO: Usar buffer centralizado
            const bufferData = this.marketData.getPriceBuffer(this.currentSymbol, 10);

            if (bufferData.prices.length === 0) {


                // Mostrar status de carregamento
                this.updateStatus('connecting', 'Carregando histórico...');

                // Garantir que buffer está inicializado
                try {
                    await this.marketData.ensurePriceBuffer(this.currentSymbol);

                    // Obter dados do buffer após inicialização
                    const newBufferData = this.marketData.getPriceBuffer(this.currentSymbol, 10);

                    if (newBufferData.prices.length > 0) {

                        this.processInitialHistory(newBufferData.prices);
                    } else {
                        CommonHelpers.showWarning(`⚠️ [DISPLAY] Buffer ainda vazio após inicialização`);
                        this.initializeEmptyArrays();
                    }

                } catch (timeoutError) {
                    CommonHelpers.showError(`❌ [DISPLAY] Timeout ao inicializar buffer:`, timeoutError);
                    this.initializeEmptyArrays();
                }
            } else {

                this.processInitialHistory(bufferData.prices);
            }
        } catch (error) {
            CommonHelpers.showError('❌ Erro ao carregar histórico inicial:', error);
            this.initializeEmptyArrays();
        }
    }

    // ✅ REFATORADO: Processar histórico inicial do buffer (sem arrays locais)
    processInitialHistory(prices) {
        if (prices.length === 0) return;

        // Atualizar display com dados do buffer
        const lastPrice = prices[prices.length - 1];
        this.updatePriceDisplay(lastPrice, null);
        this.updateMultiplePricesDisplay();
        this.updateDigitsDisplay();
    }

    // ✅ REFATORADO: Inicializar display vazio
    initializeEmptyArrays() {
        this.updateDigitsDisplay();
        this.updateMultiplePricesDisplay();
    }

    // ✅ NOVO: Pausar display sem fechar WebSocket
    pauseDisplay() {

        this.isPaused = true;

        // Parar atualizações visuais mas manter WebSocket
        if (this.autoRetryInterval) {
            clearInterval(this.autoRetryInterval);
            this.autoRetryInterval = null;
        }

        // Marcar como não subscrito para parar processamento de ticks
        // mas NÃO fechar o WebSocket
        this.isSubscribed = false;
    }

    // ✅ NOVO: Resumir display mantendo WebSocket
    resumeDisplay() {

        this.isPaused = false;

        // Se WebSocket ainda está ativo, apenas reativar subscrições
        if (this.marketData && this.marketData.isReady() && this.currentSymbol) {
            this.subscribeToSymbolTicks(this.currentSymbol);
        } else {
            // Se não, usar retry normal
            this.startDisplayWithRetry();
        }
    }

    extractLastDigit(price, symbol = null) {
        // ✅ USAR MÉTODO UNIFICADO
        return CommonHelpers.extractLastDigitUnified(price, symbol || this.currentSymbol);
    }

    handleNewTick(price) {
        // Verificação básica: apenas se está destruído
        if (this.isDestroyed) {
            return;
        }

        // Obter preço anterior do buffer para comparação
        const previousPrice = this.marketData?.getLastPrice(this.currentSymbol);

        // 🎯 ATUALIZAÇÃO DOM IMEDIATA E SÍNCRONA (dados vêm do buffer central)
        this.updatePriceDisplay(price, previousPrice);
        this.updateMultiplePricesDisplay();
        this.updateDigitsDisplay(true);

        // 🎯 NOTIFICAÇÃO SIMPLIFICADA: Componentes acessam buffer diretamente
        const marketDataEvent = {
            symbol: this.currentSymbol,
            lastPrice: price,
            timestamp: Date.now()
        };

        // 📡 Disparar evento global - todos os componentes escutam via listeners
        window.dispatchEvent(new CustomEvent('marketDataUpdate', {
            detail: marketDataEvent
        }));
    }

    updatePriceDisplay(price, previousPrice = null) {
        const priceValueElements = document.querySelectorAll('.price-value');
        priceValueElements.forEach(priceValueElement => {
            if (priceValueElement) {
                const currentPrice = parseFloat(price);

                // ✅ CORREÇÃO: Usar casas decimais detectadas automaticamente
                const token = SessionManager.getLocalToken();
                const marketData = getMarketDataInstance(token);

                let decimalPlaces = 3; // Fallback padrão
                if (this.marketData && this.currentSymbol) {
                    const detectedDecimals = this.marketData.getAssetDecimalPlaces ?
                        this.marketData.getAssetDecimalPlaces(this.currentSymbol) : 3;
                    decimalPlaces = Math.max(detectedDecimals, 2); // Mínimo 2 casas decimais
                }

                priceValueElement.textContent = currentPrice.toFixed(decimalPlaces);

                // Remover classes anteriores
                priceValueElement.classList.remove('price-up', 'price-down', 'price-same');

                // Aplicar nova classe baseada na comparação
                if (previousPrice !== null && previousPrice !== undefined) {
                    const prevPrice = parseFloat(previousPrice);

                    if (prevPrice > currentPrice) {
                        // Preço anterior MAIOR que atual = vermelho escuro (down)
                        priceValueElement.classList.add('price-down');

                    } else if (prevPrice < currentPrice) {
                        // Preço anterior MENOR que atual = azul (up)
                        priceValueElement.classList.add('price-up');

                    } else {
                        // Preços iguais = branco
                        priceValueElement.classList.add('price-same');

                    }
                } else {
                    // Primeiro preço = branco
                    priceValueElement.classList.add('price-same');

                }

                // Adicionar animação de atualização
                priceValueElement.style.transform = 'scale(1.05)';
                setTimeout(() => {
                    priceValueElement.style.transform = 'scale(1)';
                }, 150);
            }
        });
    }

    updateMultiplePricesDisplay() {
        const pricesContainers = document.querySelectorAll('.prices-container');
        pricesContainers.forEach(container => {
            if (container) {
                const priceItems = container.querySelectorAll('.price-item');

                // ✅ USAR BUFFER CENTRALIZADO: Obter 6 preços para comparação (5 para exibir + 1 para comparar o mais antigo)
                const last6Prices = this.marketData?.getLastNPrices(this.currentSymbol, 6) || [];
                const last5Prices = last6Prices.slice(-5);

                // Preencher com os últimos 5 preços para exibição
                priceItems.forEach((item, displayIndex) => {
                    if (displayIndex < last5Prices.length) {
                        const currentPrice = parseFloat(last5Prices[displayIndex]);

                        // ✅ CORREÇÃO: Usar casas decimais detectadas automaticamente
                        let decimalPlaces = 5; // Fallback padrão para sintéticos
                        if (this.marketData && this.currentSymbol) {
                            const detectedDecimals = this.marketData.getAssetDecimalPlaces ?
                                this.marketData.getAssetDecimalPlaces(this.currentSymbol) : 5;
                            decimalPlaces = detectedDecimals;


                        }

                        item.textContent = currentPrice.toFixed(decimalPlaces);

                        // Remover classes anteriores
                        item.classList.remove('price-up', 'price-down', 'price-same');

                        // ✅ LÓGICA CORRETA: Cada preço compara com o anterior cronologicamente
                        let comparisonPrice = null;

                        if (displayIndex === 0 && last6Prices.length >= 2) {
                            // Preço 1 (mais recente) compara com Preço 2
                            comparisonPrice = parseFloat(last6Prices[last6Prices.length - 2]);
                        } else if (displayIndex === 1 && last6Prices.length >= 3) {
                            // Preço 2 compara com Preço 3
                            comparisonPrice = parseFloat(last6Prices[last6Prices.length - 3]);
                        } else if (displayIndex === 2 && last6Prices.length >= 4) {
                            // Preço 3 compara com Preço 4
                            comparisonPrice = parseFloat(last6Prices[last6Prices.length - 4]);
                        } else if (displayIndex === 3 && last6Prices.length >= 5) {
                            // Preço 4 compara com Preço 5
                            comparisonPrice = parseFloat(last6Prices[last6Prices.length - 5]);
                        } else if (displayIndex === 4 && last6Prices.length >= 6) {
                            // Preço 5 (mais antigo exibido) compara com Preço 6
                            comparisonPrice = parseFloat(last6Prices[last6Prices.length - 6]);
                        }

                        if (comparisonPrice !== null) {
                            if (currentPrice > comparisonPrice) {
                                // Preço atual MAIOR que o anterior = azul
                                item.classList.add('price-up');
                            } else if (currentPrice < comparisonPrice) {
                                // Preço atual MENOR que o anterior = vermelho
                                item.classList.add('price-down');
                            } else {
                                // Preços iguais = branco
                                item.classList.add('price-same');
                            }
                        } else {
                            // Sem preço para comparação = branco
                            item.classList.add('price-same');
                        }
                    } else {
                        item.textContent = '---.---';
                        item.classList.remove('price-up', 'price-down', 'price-same');
                        item.classList.add('price-same');
                    }
                });
            }
        });
    }

    updateDigitsDisplay(isNewTick = false) {
        // Se pausado, não atualizar os dígitos
        if (this.isPaused) {
            return;
        }

        // ✅ OTIMIZADO: Buscar digit items de forma mais eficiente
        const digitItems = this.containerElement?.querySelectorAll('.digit-item') ||
            CommonHelpers.getElement(this.containerId)?.querySelectorAll('.digit-item') ||
            [];

        if (digitItems.length === 0) {
            return;
        }

        // ✅ USAR BUFFER CENTRALIZADO: Obter últimos 10 dígitos
        const last10Digits = this.marketData?.getLastNDigits(this.currentSymbol, 10) || [];

        // ✅ OTIMIZADO: Atualizar todos os dígitos em uma única passada
        for (let index = 0; index < digitItems.length; index++) {
            const item = digitItems[index];

            // Limpar classes anteriores de uma vez
            item.className = item.className.replace(/\b(new|active|digit-odd|digit-even|digit-empty|highlight)\b/g, '').trim();
            item.classList.add('digit-item'); // Garantir classe base

            if (index < last10Digits.length) {
                const digit = last10Digits[index];

                // Só atualizar texto se mudou
                if (item.textContent !== digit.toString()) {
                    item.textContent = digit;
                }

                // Aplicar cor baseada em par/ímpar (otimizado)
                const isSpecialContainer = item.closest('.header-display-container, .bottom-display-container');
                if (isSpecialContainer) {
                    item.classList.add(digit % 2 === 0 ? 'digit-even' : 'digit-odd');
                }

                // Destacar último dígito
                if (index === last10Digits.length - 1) {
                    item.classList.add('active');
                    if (isNewTick) {
                        item.classList.add('highlight');
                    }
                }
            } else {
                // Só atualizar texto se mudou
                if (item.textContent !== '-') {
                    item.textContent = '-';
                }

                // Para dígitos vazios (otimizado)
                const isSpecialContainer = item.closest('.header-display-container, .bottom-display-container');
                if (isSpecialContainer) {
                    item.classList.add('digit-empty');
                }
            }
        }
    }

    // ✅ NOVO: Atualizar dados da conta sem fechar WebSocket
    async updateAccountData() {

        try {
            // 1. Pausar atualizações temporariamente
            this.isPaused = true;

            // 2. Limpar dados visuais da conta anterior
            if (this.clearDisplayImmediate) {
                this.clearDisplayImmediate();
            }

            // 3. Recarregar dados do usuário atual (sem fechar WebSocket)
            const currentUser = SessionManager.getCurrentUser();
            if (currentUser) {
                // 4. Atualizar informações da conta nos elementos visuais
                this.updateAccountInfo(currentUser);

                // 5. Manter WebSocket ativo - apenas validar se ainda está conectado
                if (this.marketData && !this.marketData.isReady()) {

                    await this.marketData.connect();
                }

                // 6. Retomar atualizações
                this.isPaused = false;

                return true;
            } else {
                throw new Error('Usuário atual não encontrado');
            }

        } catch (error) {
            console.error('❌ [DISPLAY] Erro ao atualizar conta:', error);
            this.isPaused = false;
            return false;
        }
    }

    // ✅ HELPER: Atualizar informações da conta na interface
    updateAccountInfo(userData) {
        try {
            // Atualizar elementos da interface com dados da nova conta
            const accountElements = this.containerElement?.querySelectorAll('[data-account-info]') || [];
            accountElements.forEach(element => {
                const infoType = element.getAttribute('data-account-info');
                switch (infoType) {
                    case 'loginid':
                        element.textContent = userData.authorize.loginid;
                        break;
                    case 'currency':
                        element.textContent = userData.authorize.currency;
                        break;
                    case 'balance':
                        // Balance será atualizado pelo FooterManager
                        break;
                }
            });

        } catch (error) {
            console.warn('⚠️ [DISPLAY] Erro ao atualizar interface:', error);
        }
    }

    // ✅ NOVO: Pausar display mantendo WebSocket ativo
    pauseDisplay() {

        try {
            // Marcar como pausado
            this.isPaused = true;

            // Limpar interface visual mas manter WebSocket
            if (this.clearDisplayImmediate) {
                this.clearDisplayImmediate();
            }

            // Parar callbacks de tick temporariamente (sem fechar WebSocket)
            if (this.unsubscribeFromTicks) {
                this.unsubscribeFromTicks();
                this.unsubscribeFromTicks = null;
            }

        } catch (error) {
            console.error('❌ [DISPLAY] Erro ao pausar display:', error);
        }
    }

    // ✅ NOVO: Retomar display pausado
    resumeDisplay() {

        try {
            // Desmarcar pausa
            this.isPaused = false;

            // Reativar callbacks de tick se WebSocket ainda estiver ativo
            if (this.marketData && this.marketData.isReady() && this.currentSymbol) {
                this.subscribeToSymbolTicks(this.currentSymbol);
            }

        } catch (error) {
            console.error('❌ [DISPLAY] Erro ao retomar display:', error);
        }
    }


    async stopDisplay() {

        this.isDestroyed = true; // Marcar como destruído

        // Parar callbacks de tick
        if (this.unsubscribeFromTicks) {
            this.unsubscribeFromTicks();
            this.unsubscribeFromTicks = null;
        }


        this.isSubscribed = false;
        this.updateStatus('offline', 'Desconectado');

        // Limpar referência global se este for o container principal
        if (window.__displayInstances && window.__displayInstances[this.containerId]) {
            delete window.__displayInstances[this.containerId];
            if (Object.keys(window.__displayInstances).length === 0) {
                delete window.__displayInstances;
            }
        }
    }

    async restartDisplay() {
        // ✅ RESTART SIMPLIFICADO COM LIMPEZA COMPLETA

        // Parar retry automático se estiver rodando
        if (this.autoRetryInterval) {
            clearInterval(this.autoRetryInterval);
            this.autoRetryInterval = null;
        }

        // ✅ Limpar callbacks existentes ANTES de reiniciar
        if (this.marketData && this.currentSymbol) {
            try {
                // Remover callbacks existentes para evitar duplicação
                const callbacks = this.marketData.tickCallbacks.get(this.currentSymbol);
                if (callbacks && callbacks.size > 0) {

                    callbacks.clear();
                }

                // Limpar também a referência de callback principal se for este símbolo
                if (this.marketData.currentActiveSymbol === this.currentSymbol) {
                    this.marketData.tickCallback = null;
                }
            } catch (error) {
                CommonHelpers.showWarning('⚠️ [DISPLAY RESTART] Erro na limpeza de callbacks:', error);
            }
        }

        // Marcar como não subscrito para permitir reinício
        this.isSubscribed = false;

        // Limpar display visual
        this.clearDisplayImmediate();

        // ✅ AGUARDAR um pouco para garantir que limpeza foi processada
        await new Promise(resolve => setTimeout(resolve, 300));

        // Iniciar o novo ativo (sobrescreve o anterior)
        await this.startDisplayWithRetry();
    }

    updateStatus(status, message) {
        // ✅ REMOVIDO: Status indicator completamente removido conforme solicitado
        // Não fazer nada - visor de status foi removido da interface
    }

    clearDisplayImmediate() {
        // Limpar preço atual
        const priceValueElement = document.querySelector('.price-value');
        if (priceValueElement) {
            priceValueElement.textContent = '---.---';
        }

        // Limpar dígitos
        const digitItems = document.querySelectorAll('.digit-item');
        digitItems.forEach(item => {
            item.textContent = '-';
            item.classList.remove('new', 'active', 'highlight');
        });

        // Resetar arrays
        this.last10Digits = [];
        this.last25Digits = [];
        this.last3Prices = [];
        this.lastPrice = null;

        // Atualizar display de múltiplos preços
        this.updateMultiplePricesDisplay();

        // Mostrar status de carregamento
        this.updateStatus('connecting', 'Carregando novo ativo...');
    }

    // Método para definir um novo símbolo programaticamente
    setSymbol(symbol) {
        if (this.currentSymbol !== symbol) {

            this.currentSymbol = symbol;

            // 🎯 CRÍTICO: Atualizar também a sessão para manter consistência
            SessionManager.setSessionData('selected_symbol', symbol);

            // 🔧 Garantir que o select mostra o símbolo correto
            const symbolSelect = CommonHelpers.getElement('symbol-select');
            if (symbolSelect && symbolSelect.value !== symbol) {

                symbolSelect.value = symbol;
            }

            // Reiniciar display com novo símbolo
            this.restartDisplay();
        }
    }

    // ✅ NOVO: Inscrever-se para receber ticks de um símbolo
    async subscribeToSymbolTicks(symbol) {
        if (!this.marketData || !this.marketData.isReady() || !symbol) {
            console.warn(`⚠️ [DISPLAY] Não é possível inscrever em ticks: marketData não pronto ou símbolo inválido.`);
            throw new Error('Pré-requisitos não atendidos para subscrição');
        }

        // Remover callback anterior se existir para este símbolo
        if (this.unsubscribeFromTicks) {
            try {
                this.unsubscribeFromTicks();
            } catch (error) {
                console.warn('⚠️ [DISPLAY] Erro ao remover callback anterior:', error);
            }
            this.unsubscribeFromTicks = null;
        }


        try {
            // Criar callback robusto
            const tickCallback = (price) => {
                try {
                    // Chamado apenas se não estiver pausado e instância não foi destruída
                    if (!this.isPaused && !this.isDestroyed) {
                        this.handleNewTick(price);
                    }
                } catch (error) {
                    console.error('❌ [DISPLAY CALLBACK] Erro ao processar tick:', error);
                }
            };

            // Inscrever com retry em caso de falha
            let subscriptionAttempts = 0;
            let unsubscribe = null;

            while (!unsubscribe && subscriptionAttempts < 3) {
                subscriptionAttempts++;

                try {

                    unsubscribe = await this.marketData.subscribeToTicks(symbol, tickCallback);

                    if (unsubscribe) {

                        break;
                    }
                } catch (subscriptionError) {
                    console.error(`❌ [DISPLAY] Erro na tentativa ${subscriptionAttempts}:`, subscriptionError);

                    if (subscriptionAttempts < 3) {
                        // Aguardar antes da próxima tentativa
                        await new Promise(resolve => setTimeout(resolve, 1000 * subscriptionAttempts));

                        // Se erro foi de estado inválido, tentar resetar o marketData
                        if (subscriptionError.message.includes('Estado inválido')) {

                            try {
                                await this.marketData.connect();
                            } catch (reconnectError) {
                                console.warn('⚠️ [DISPLAY] Erro ao reconectar:', reconnectError);
                            }
                        }
                    }
                }
            }

            if (!unsubscribe) {
                throw new Error(`Falha ao criar subscrição para ${symbol} após ${subscriptionAttempts} tentativas`);
            }

            // Armazenar função de cleanup
            this.unsubscribeFromTicks = unsubscribe;

        } catch (error) {
            console.error(`❌ [DISPLAY] Erro crítico na subscrição para ${symbol}:`, error);
            throw error;
        }
    }

}

// 🌐 Expor DisplayView globalmente
window.DisplayView = DisplayView;