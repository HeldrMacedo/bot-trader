// js/trade-messages.js
// Sistema de mensagens de resultados de trade
// O SISTEMA DEVE SER 100% ISOLADO POR USUARIO

class TradeMessagesManager {
    constructor() {
        this.sessionId = SessionManager.getUserSessionId();
        this.messagesContainer = null;
        this.maxMessages = null; // SEM LIMITE de mensagens armazenadas
        this.messages = [];

        // 🔧 NOVO: Sistema de buffer para mensagens durante cooldown
        this.bufferedMessages = [];
        this.cooldownActive = false; // Renomeado de cooldownMode para cooldownActive para consistência

        // 💰 NOVO: Sistema de controle de P&L real
        this.realProfitLoss = 0;

        // 🔧 CORREÇÃO: Limpar buffer e estado na inicialização
        this.clearBufferedMessages();

        // Flag para evitar recarregamento após limpeza
        this._clearInProgress = false;

        // 🧹 NOVO: Limpar mensagens antigas do localStorage na inicialização
        // Isso garante que mensagens de sessões anteriores (quando usuário fechou navegador) sejam removidas

        this.clearOldMessagesFromStorage();

        // 🔒 CRÍTICO: Marcar sessão como inicializada IMEDIATAMENTE para evitar limpeza de mensagens
        const sessionKey = `browser_session_${this.sessionId}`;
        if (!sessionStorage.getItem(sessionKey)) {
            sessionStorage.setItem(sessionKey, 'initialized');
        }

        // Validar acesso do usuário
        this.validateUserAccess();

    }

    // Validar acesso do usuário
    validateUserAccess() {
        // ✅ CORREÇÃO: Só validar se usuário já está logado
        const currentUser = SessionManager.getCurrentUser();
        if (currentUser && !SessionManager.validateDataIntegrity()) {
            console.warn('⚠️ Problemas de integridade detectados para TradeMessagesManager');
        }
    }

    // Inicializar o sistema de mensagens
    initialize() {

        this.createMessagesContainer();

        // 🛡️ CRÍTICO: Verificar se houve limpeza recente ANTES de carregar mensagens
        const currentUser = SessionManager.getCurrentUser();
        let wasRecentlyCleared = false;

        if (currentUser) {
            const clearMarkers = [
                sessionStorage.getItem(`messages_cleared_${this.sessionId}`),
                localStorage.getItem(`messages_cleared_${this.sessionId}`),
                sessionStorage.getItem(`messages_cleared_${currentUser.loginid}`),
                localStorage.getItem(`messages_cleared_${currentUser.loginid}`)
            ];

            for (const marker of clearMarkers) {
                if (marker) {
                    const timeSinceClear = Date.now() - parseInt(marker);
                    // 30 segundos de proteção contra recarga
                    if (timeSinceClear < 30000) {
                        wasRecentlyCleared = true;

                        break;
                    }
                }
            }
        }

        // ✅ CRÍTICO: Só carregar mensagens salvas se:
        // 1. Não houver mensagens em memória
        // 2. NÃO houve limpeza recente (últimos 30 segundos)
        if (this.messages.length === 0 && !wasRecentlyCleared) {

            this.loadSavedMessages();
        } else if (wasRecentlyCleared) {

            this.messages = [];
            this.bufferedMessages = [];
            this.updateMessagesDisplay();
        } else {

            this.updateMessagesDisplay();
        }

        // 🔄 CRÍTICO: SEMPRE RESETAR P&L NA INICIALIZAÇÃO
        this.realProfitLoss = 0;

        // FORÇAR atualização visual após containers estarem prontos
        setTimeout(() => {
            this.forceUpdateProfitLossDisplay();
        }, 500);

    }

    // 🔄 MELHORADO: Usar container de mensagens já criado no HTML
    createMessagesContainer() {
        // Tentar encontrar o container várias vezes com intervalos
        let attempts = 0;
        const maxAttempts = 20; // Aumentado para dar mais tempo
        const initialDelay = 100; // Delay inicial menor
        const maxDelay = 800; // Delay máximo

        const findContainer = () => {
            attempts++;
            this.messagesContainer = document.getElementById('trade-messages-container');

            if (this.messagesContainer) {
                // Container encontrado - configurar
                this.addMessagesCSS();
                TradeMessagesManager.attachClearButtonListener();
                TradeMessagesManager.attachResetProfitLossListener();
                return;
            }

            if (attempts < maxAttempts) {
                // 🔧 SILENCIOSO: Só mostrar aviso se realmente necessário
                const delay = Math.min(initialDelay * attempts, maxDelay);

                // Só logar nas últimas tentativas para reduzir spam
                if (attempts >= maxAttempts - 2) {
                    logConfig.debug('trade_messages', `🔍 [CONTAINER SEARCH] Tentativa ${attempts}/${maxAttempts} em ${delay}ms...`);
                }

                setTimeout(findContainer, delay);
            } else {
                // 🔧 NOVO: Última chance - aguardar DOM estar completamente pronto
                if (document.readyState !== 'complete') {
                    logConfig.info('trade_messages', '⏳ [CONTAINER SEARCH] Aguardando DOM completar carregamento...');
                    document.addEventListener('DOMContentLoaded', () => {
                        setTimeout(() => this.createFallbackContainer(), 200);
                    });
                    return;
                }

                logConfig.warn('trade_messages', '⚠️ [TRADE MESSAGES] Container HTML não encontrado após várias tentativas. Criando fallback robusto...');
                setTimeout(() => {
                    this.createFallbackContainer();
                    TradeMessagesManager.attachClearButtonListener();
                }, 500);
            }
        };

        // 🔧 OTIMIZADO: Aguardar sempre um pouco para garantir que a view foi renderizada
        if (document.readyState === 'loading') {
            // DOM ainda carregando - aguardar mais tempo
            setTimeout(findContainer, 1000);
        } else {
            // DOM pronto - aguardar um pouco para view ser renderizada
            setTimeout(findContainer, 500);
        }
    }

    // Criar container de fallback se não existir
    createFallbackContainer() {
        // 🎯 CORREÇÃO: Sistema de fallback mais robusto - procurar vários locais possíveis
        let targetContainer = null;

        // Opção 1: Procurar pelo bloco de monitoramento específico
        const monitoringBlock = document.getElementById('monitoring-block');
        if (monitoringBlock) {
            const monitoringContent = monitoringBlock.querySelector('.block-content');
            if (monitoringContent) {
                targetContainer = monitoringContent;

            }
        }

        // Opção 2: Procurar por qualquer container com classe block-content
        if (!targetContainer) {
            const blockContents = document.querySelectorAll('.block-content');
            if (blockContents.length > 0) {
                // Priorizar o primeiro block-content encontrado
                targetContainer = blockContents[0];

            }
        }

        // Opção 3: Procurar pelo container principal da aplicação
        if (!targetContainer) {
            const appContainer = document.getElementById('app-container') || document.body;
            targetContainer = appContainer;

        }

        if (!targetContainer) {

            return;
        }

        const messageDisplay = document.createElement('div');
        messageDisplay.className = 'trade-messages-display';
        messageDisplay.style.cssText = `
            margin: 20px 0;
            padding: 15px;
            border: 1px solid #e0e0e0;
            border-radius: 8px;
            background: #f8f9fa;
        `;

        messageDisplay.innerHTML = `
            <div class="trade-messages-header">
                <div class="profit-loss-display centered-display">
                    <span class="profit-loss-label">P&L:</span>
                    <span class="profit-loss-value neutral" id="profit-loss-value">$0.00</span>
                    <button class="reset-profit-loss-btn" id="reset-profit-loss-btn" title="Resetar P&L">
                        ↻
                    </button>
                </div>
                <button class="clear-messages-btn" id="clear-messages-btn" title="Limpar mensagens">
                    🗑️
                </button>
            </div>
            <div id="trade-messages-container" class="trade-messages-container">
                <div class="messages-list" id="messages-list">
                    <div class="no-messages">Nenhum trade executado ainda</div>
                </div>
            </div>
        `;

        targetContainer.appendChild(messageDisplay);
        this.messagesContainer = document.getElementById('trade-messages-container');

        this.addMessagesCSS();
        // 💰 NOVO: Adicionar listener do botão de reset P&L no fallback também
        TradeMessagesManager.attachResetProfitLossListener();
    }

    // Adicionar CSS adicional se necessário (estilos principais já estão no style.css)
    addMessagesCSS() {
        // Verificar se o CSS já foi adicionado
        if (document.getElementById('trade-messages-dynamic-css')) return;

        const style = document.createElement('style');
        style.id = 'trade-messages-dynamic-css';
        style.textContent = `
            /* CSS adicional para funcionalidades dinâmicas das mensagens */
            .trade-message:hover {
                transform: translateX(2px);
                box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
            }

            .trade-message.new-message {
                animation: newMessagePulse 0.6s ease-out;
            }

            @keyframes newMessagePulse {
                0% {
                    opacity: 0;
                    transform: translateX(-20px);
                    box-shadow: 0 0 0 0 rgba(26, 115, 232, 0.7);
                }
                50% {
                    opacity: 0.8;
                    transform: translateX(0);
                    box-shadow: 0 0 0 10px rgba(26, 115, 232, 0);
                }
                100% {
                    opacity: 1;
                    transform: translateX(0);
                    box-shadow: 0 0 0 0 rgba(26, 115, 232, 0);
                }
            }

            /* Estilos para o P&L */
            .profit-loss-value.profit {
                color: green;
            }

            .profit-loss-value.loss {
                color: red;
            }

            .profit-loss-value.neutral {
                color: grey; /* Ou a cor padrão */
            }

            /* 🔊 ATUALIZADO: Ajustes de altura para exibir mais mensagens */
            .trade-messages-container {
                min-height: 300px; /* Aumenta a altura mínima para exibir mais mensagens visualmente */
                max-height: 600px; /* Aumenta a altura máxima para acomodar mais mensagens com scroll */
                overflow-y: auto; /* Garante o scroll vertical */
                padding-right: 10px; /* Espaço para a barra de scroll */
                display: block; /* Garante que o display seja block para altura e overflow funcionarem */
            }

            .messages-list {
                /* O container principal já gerencia a altura e scroll */
            }

            /* 🔊 ATUALIZADO: Centralizar display de saldo */
            .profit-loss-display.centered-display {
                justify-content: center;
                align-items: center;
                flex-grow: 1; /* Permite que o display de P&L ocupe o espaço disponível */
            }

            .trade-messages-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 15px;
            }

            .reset-profit-loss-btn, .clear-messages-btn {
                background: none;
                border: none;
                font-size: 1.2em;
                cursor: pointer;
                padding: 5px;
                transition: transform 0.2s ease;
            }

            .reset-profit-loss-btn:hover, .clear-messages-btn:hover {
                transform: scale(1.1);
            }

            /* Ajustar badge ADMIN */
            .admin-badge {
                width: auto; /* Ajustar largura conforme necessário */
                padding: 5px 10px;
                font-size: 0.9em;
                height: auto; /* Ajustar altura conforme necessário */
            }

            .admin-badge span {
                font-size: 1.1em; /* Apenas o texto "ADMIN" */
            }

            /* 🎨 NOVO: Animação para feedback de reset */
            @keyframes resetPulse {
                0% {
                    transform: scale(1);
                    background-color: inherit;
                }
                50% {
                    transform: scale(1.05);
                    background-color: rgba(40, 167, 69, 0.3);
                }
                100% {
                    transform: scale(1);
                    background-color: inherit;
                }
            }
        `;

        document.head.appendChild(style);

    }

    // 🔧 NOVO: Método unificado para verificar duplicatas
    isDuplicateMessage(message) {
        const checkDuplicate = (list) => list.some(existing =>
            existing.tradeType === message.tradeType &&
            existing.entryPrice === message.entryPrice &&
            existing.exitPrice === message.exitPrice &&
            existing.mode === message.mode &&
            existing.isWin === message.isWin &&
            existing.stake === message.stake &&
            existing.profit === message.profit &&
            existing.prediction === message.prediction &&
            Math.abs(existing.timestamp - message.timestamp) < 50 // Reduzido para 50ms
        );

        // Verificar em buffer E lista principal
        return checkDuplicate(this.bufferedMessages) || checkDuplicate(this.messages);
    }

    // Adicionar mensagem de resultado de trade
    addTradeMessage(contractType, entryPrice, exitPrice, mode, isWin, stake = null, profit = null, galeMultiplier = null, prediction = null) {
        // 🛡️ PROTEÇÃO: Verificar se limpeza está em progresso
        if (this._clearInProgress) {
            console.warn('🚫 [ADD MESSAGE] Limpeza em progresso - mensagem ignorada');
            return;
        }

        // 🛡️ PROTEÇÃO: Verificar marcadores de limpeza recente (últimos 3 segundos)
        const currentUser = SessionManager.getCurrentUser();
        if (currentUser) {
            const clearMarker = sessionStorage.getItem(`messages_cleared_${this.sessionId}`) ||
                localStorage.getItem(`messages_cleared_${this.sessionId}`);
            if (clearMarker) {
                const timeSinceClear = Date.now() - parseInt(clearMarker);
                // 🎯 FIX: Reduzir tempo de bloqueio para 100ms (antes era 3000ms)
                // Isso evita bloquear mensagens legítimas de trades rápidos após mudança de config
                if (timeSinceClear < 100) {
                    console.warn(`🚫 [ADD MESSAGE] Limpeza muito recente (${timeSinceClear}ms atrás) - mensagem ignorada`);
                    return;
                }
            }
        }

        // 🎯 NOVO: Log específico para contratos de dígitos
        const digitContracts = ['DIGITOVER', 'DIGITUNDER', 'DIGITEVEN', 'DIGITODD', 'DIGITDIFF', 'DIGITMATCH'];
        if (digitContracts.includes(contractType)) {
            logConfig.info('trade_messages', `🎯 [DIGIT MESSAGE] ${contractType}: Entrada=${entryPrice}, Saída=${exitPrice}, Resultado=${isWin ? 'WIN' : 'LOSS'}, Modo=${mode}`);

            // Para trades reais de dígitos, confirmar que entrada veio das regras e saída da Deriv
            if (mode !== 'SIMULACAO') {
                logConfig.info('trade_messages', `🔍 [DIGIT REAL VALIDATION] ${contractType}: Entrada deve ser das regras, Saída da Deriv`);
            }
        }

        // 🚨 DEBUG: Rastrear chamada para CALL e PUT com resultado
        if (contractType === 'CALL' || contractType === 'PUT') {
            const entry = parseFloat(entryPrice);
            const exit = parseFloat(exitPrice);
            const actualMovement = exit > entry ? 'SUBIU' : (exit < entry ? 'DESCEU' : 'IGUAL');

            // Para trades reais não-dígitos, confirmar que ambos os preços vieram da Deriv
            if (mode !== 'SIMULACAO') {
                logConfig.info('trade_messages', `🔍 [NON-DIGIT REAL VALIDATION] ${contractType}: Entrada e Saída devem ser da Deriv`);
            }

            // Calcular resultado esperado baseado no tipo de contrato
            let expectedResult;
            if (contractType === 'CALL') {
                expectedResult = exit > entry; // CALL ganha quando preço sobe
            } else { // PUT
                expectedResult = exit < entry; // PUT ganha quando preço desce
            }

            // Alertar sobre inconsistências críticas (Downgrade para Warning devido a Slippage)
            if (contractType === 'CALL' && exit > entry && isWin === false) {
                console.warn(`⚠️ [SLIPPAGE DETECTED] CALL com preço SUBINDO marcado como LOSS. Possível slippage na entrada.`);
                console.warn(`   Entrada (Est/Real): ${entry}, Saída: ${exit}, Resultado Deriv: LOSS`);
            }

            if (contractType === 'PUT' && exit > entry && isWin === true) {
                console.warn(`⚠️ [SLIPPAGE DETECTED] PUT com preço SUBINDO marcado como WIN. Possível slippage na entrada.`);
                console.warn(`   Entrada (Est/Real): ${entry}, Saída: ${exit}, Resultado Deriv: WIN`);
            }
        }

        if (!this.messagesContainer) {
            console.warn('⚠️ Container de mensagens não inicializado, tentando reinicializar...');
            this.initialize();

            // Aguardar um pouco e tentar novamente
            setTimeout(() => {
                if (this.messagesContainer) {
                    this.addTradeMessage(contractType, entryPrice, exitPrice, mode, isWin, stake, profit, galeMultiplier, prediction);
                } else {
                    console.error('❌ Não foi possível inicializar container de mensagens');
                }
            }, 1000);
            return;
        }

        const message = {
            id: Date.now() + Math.random(),
            tradeType: contractType,
            entryPrice: entryPrice,
            exitPrice: exitPrice,
            mode: mode,
            isWin: isWin,
            stake: stake,
            profit: profit,
            galeMultiplier: galeMultiplier,
            prediction: prediction,
            timestamp: new Date(),
            sessionId: this.sessionId
        };

        // ✅ PROTEÇÃO UNIFICADA: Verificar duplicatas em todas as listas
        const isDuplicate = this.isDuplicateMessage(message);

        if (isDuplicate) {
            logConfig.warn('trade_messages', '🚫 [DUPLICATE] Mensagem duplicada ignorada');
            return;
        }

        // 🔧 NOVO: Verificar se cooldown está ativo para decidir onde armazenar
        const isCooldownActive = this.cooldownActive || this.isCooldownActiveGlobally();

        if (isCooldownActive) {
            this.bufferedMessages.push(message);
            logConfig.info('trade_messages', `📦 [BUFFER] Mensagem adicionada ao buffer: ${message.tradeType} ${message.isWin ? 'WIN' : 'LOSS'}`);
            return; // Não exibir ainda
        }

        // Adicionar à lista de mensagens normalmente se cooldown não está ativo
        this.messages.unshift(message); // Adicionar no início

        // 💰 CRÍTICO: Atualizar P&L APENAS para trades reais (REAL/VIRTUAL) - NUNCA para SIMULACAO
        if (message.mode !== 'SIMULACAO' && message.profit !== null && message.profit !== undefined) {
            this.realProfitLoss += parseFloat(message.profit);
            this.updateProfitLossDisplay();
            logConfig.info('trade_messages', `💰 [P&L UPDATE] Adicionado ao P&L: ${message.profit} | Total: ${this.realProfitLoss.toFixed(2)} (modo: ${message.mode})`);
        } else if (message.mode === 'SIMULACAO') {
            logConfig.info('trade_messages', `🎮 [P&L SKIP] Trade simulado ignorado no P&L: ${message.tradeType} ${message.isWin ? 'WIN' : 'LOSS'} (valor: ${message.profit || 'N/A'})`);
        }

        // SEM LIMITE: Manter todas as mensagens até limpeza manual pelo usuário

        // Salvar mensagens
        this.saveMessages();

        // Atualizar display
        this.updateMessagesDisplay();

        // 🔍 VALIDAÇÃO: Log da validação sem alterar o resultado (apenas informativo)
        if (message.mode !== 'SIMULACAO' && message.profit !== null && message.profit !== undefined) {
            const validation = this.validateTradeLogic(message.tradeType, message.entryPrice, message.exitPrice, isWin, message.profit);
            // Apenas log informativo - NÃO alterar o resultado
        }

        // Log da mensagem
        const result = isWin ? 'WIN' : 'LOSS';
        const messageType = message.mode === 'SIMULACAO' ? 'SIMULADA' : 'REAL';

    }

    // Atualizar display das mensagens
    updateMessagesDisplay() {
        if (!this.messagesContainer) {
            // Container ainda não inicializado
            return;
        }

        const messagesList = document.getElementById('messages-list');
        if (!messagesList) {
            // Lista ainda não disponível
            return;
        }

        // Limpar lista atual
        messagesList.innerHTML = '';

        if (this.messages.length === 0) {
            messagesList.innerHTML = '<div class="no-messages">Nenhum trade executado ainda</div>';
            // Remover indicador de mais mensagens
            this.messagesContainer.classList.remove('has-more-messages');
            return;
        }

        // Adicionar cada mensagem
        this.messages.forEach(message => {
            const messageElement = this.createMessageElement(message);
            messagesList.appendChild(messageElement);
        });

        // ✅ NOVO: Indicar visualmente quando há mais de 10 mensagens
        if (this.messages.length > 10) {
            this.messagesContainer.classList.add('has-more-messages');
        } else {
            this.messagesContainer.classList.remove('has-more-messages');
        }

        // Scroll para o topo (mensagem mais recente)
        this.messagesContainer.scrollTop = 0;
    }

    // Criar elemento visual da mensagem
    createMessageElement(message) {
        const messageDiv = document.createElement('div');

        // ✅ NOVO: Adicionar classe específica para modo simulado
        let messageClasses = 'trade-message';

        if (message.mode === 'SIMULACAO') {
            messageClasses += ' simulated';
        } else {
            messageClasses += message.isWin ? ' win' : ' loss';
        }

        messageDiv.className = messageClasses;

        const resultIcon = message.isWin ? '✅' : '❌';
        const resultText = message.isWin ? 'WIN' : 'LOSS';

        // 🎯 NOVO: Formatação padronizada com largura fixa
        const formattedMessage = this.formatStandardizedMessage(message, resultIcon, resultText);

        messageDiv.innerHTML = `
            <div class="message-content">
                <span class="standardized-message">${formattedMessage}</span>
            </div>
        `;

        return messageDiv;
    }

    // 🎯 NOVO: Formatar mensagem com largura fixa padronizada
    formatStandardizedMessage(message, resultIcon, resultText) {
        // ✅ CORREÇÃO: Detectar casas decimais do ativo atual
        const token = SessionManager.getLocalToken();
        const marketData = getMarketDataInstance(token);
        const currentSymbol = window.selectedSymbol || SessionManager.getSessionData('selected_symbol');

        let decimalPlaces = 5; // Fallback padrão para sintéticos
        if (marketData && currentSymbol) {
            const detectedDecimals = marketData.getAssetDecimalPlaces ?
                marketData.getAssetDecimalPlaces(currentSymbol) : 5;
            decimalPlaces = detectedDecimals;

        }

        const entryPrice = parseFloat(message.entryPrice).toFixed(decimalPlaces).padStart(9, ' ');
        const exitPrice = parseFloat(message.exitPrice).toFixed(decimalPlaces).padStart(9, ' ');

        // 🎯 NOVO: Adicionar previsão para contratos de dígito que usam previsão
        const predictionContracts = ['DIGITDIFF', 'DIGITMATCH', 'DIGITOVER', 'DIGITUNDER'];
        let contractTypeDisplay = message.tradeType;

        if (predictionContracts.includes(message.tradeType) && message.prediction !== null && message.prediction !== undefined) {
            contractTypeDisplay = `${message.tradeType} ${message.prediction}`;
        }

        // Formatar tipo de contrato com largura fixa (12 caracteres para acomodar previsão)
        const contractType = contractTypeDisplay.padEnd(12, ' ');

        // 🎰 NOVO: Adicionar indicador de Gale se aplicável
        let galeText = '';
        if (message.galeMultiplier && message.galeMultiplier > 1) {
            galeText = ` Gale:${message.galeMultiplier}x`;
        }

        // Formatar valores monetários
        let stakeText = '';
        let profitText = '';

        if (message.stake) {
            const stakeValue = parseFloat(message.stake).toFixed(2);
            stakeText = `$${stakeValue}`.padStart(7, ' ');

            if (message.profit !== null && message.profit !== undefined) {
                const profitValue = parseFloat(message.profit).toFixed(2);
                const profitSign = profitValue >= 0 ? '+' : '';
                profitText = `${profitSign}${profitValue}`.padStart(8, ' ');
            } else {
                profitText = '    N/A'.padStart(8, ' ');
            }
        } else {
            stakeText = '   N/A'.padStart(7, ' ');
            profitText = '    N/A'.padStart(8, ' ');
        }

        // Formatar timestamp
        const timeString = message.timestamp.toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });

        // Formatar resultado (4 caracteres)
        const result = resultText.padEnd(4, ' ');

        // Montar mensagem padronizada com Gale se aplicável (sem modo)
        return `${resultIcon} ${contractType} | ${entryPrice} | ${exitPrice} | ${stakeText}:${profitText}${galeText} | ${timeString} - ${result}`;
    }

    // Salvar mensagens no localStorage
    saveMessages() {
        try {
            const currentUser = SessionManager.getCurrentUser();
            if (!currentUser) {
                console.warn('⚠️ Não é possível salvar mensagens sem usuário logado');
                return;
            }

            // 🛡️ BLOQUEIO: Não salvar se houve limpeza recente (últimos 5 segundos)
            const clearMarker = sessionStorage.getItem(`messages_cleared_${this.sessionId}`) ||
                localStorage.getItem(`messages_cleared_${this.sessionId}`);
            if (clearMarker) {
                const timeSinceClear = Date.now() - parseInt(clearMarker);
                if (timeSinceClear < 5000) {
                    console.warn(`🚫 [SAVE BLOCK] Limpeza recente (${timeSinceClear}ms) - NÃO salvar mensagens`);
                    return;
                }
            }

            // 🛡️ BLOQUEIO EXTRA: Se array está vazio, não salvar (manter dados limpos)
            if (this.messages.length === 0) {
                console.warn('🚫 [SAVE BLOCK] Array de mensagens vazio - não sobrescrever dados limpos');
                return;
            }

            const dataToSave = {
                messages: this.messages,
                _userId: currentUser.loginid,
                _timestamp: Date.now(),
                _sessionId: this.sessionId
                // 🛡️ NUNCA incluir _clearedAt aqui - apenas em clearMessages()
            };

            localStorage.setItem(`trade_messages_${this.sessionId}`, JSON.stringify(dataToSave));

        } catch (error) {
            console.error('❌ Erro ao salvar mensagens:', error);
        }
    }

    // Carregar mensagens salvas
    loadSavedMessages() {
        try {
            const currentUser = SessionManager.getCurrentUser();
            if (!currentUser) {
                this.messages = [];
                return;
            }

            // 🔧 CRÍTICO: Verificar MÚLTIPLOS marcadores de limpeza
            const clearMarkers = [
                sessionStorage.getItem(`messages_cleared_${this.sessionId}`),
                sessionStorage.getItem(`messages_cleared_${currentUser.loginid}`),
                localStorage.getItem(`messages_cleared_${this.sessionId}`),
                localStorage.getItem(`messages_cleared_${currentUser.loginid}`)
            ];

            // Se QUALQUER marcador existe e é recente, não carregar mensagens
            for (const clearMarker of clearMarkers) {
                if (clearMarker) {
                    const clearedTime = parseInt(clearMarker);
                    const timeSinceClear = Date.now() - clearedTime;

                    // Aumentar tempo de proteção para 30 minutos
                    if (timeSinceClear < 30 * 60 * 1000) {

                        this.messages = [];
                        return;
                    }
                }
            }


            // 🔧 CRÍTICO: Detectar nova sessão de navegador (não apenas refresh)
            const sessionKey = `browser_session_${this.sessionId}`;
            const isNewBrowserSession = !sessionStorage.getItem(sessionKey);

            if (isNewBrowserSession) {

                // Marcar que já processamos esta sessão de navegador
                sessionStorage.setItem(sessionKey, 'initialized');
                // Limpar TODAS as mensagens antigas do localStorage
                localStorage.removeItem(`trade_messages_${this.sessionId}`);

                // 🔧 NOVO: Limpar todas as chaves relacionadas
                const allKeys = Object.keys(localStorage);
                const tradeMessageKeys = allKeys.filter(key =>
                    key.includes('trade_messages') || key.includes('messages')
                );
                tradeMessageKeys.forEach(key => localStorage.removeItem(key));

                this.messages = [];
                return;
            }

            // 🔧 NOVO: Verificar se localStorage foi limpo mas sessionStorage ainda tem dados
            const hasLocalStorageData = localStorage.getItem(`trade_messages_${this.sessionId}`);
            const hasSessionStorageCleanMarker = sessionStorage.getItem(`messages_cleared_${this.sessionId}`);

            if (!hasLocalStorageData && hasSessionStorageCleanMarker) {

                this.messages = [];
                return;
            }

            const saved = localStorage.getItem(`trade_messages_${this.sessionId}`);
            if (!saved) {
                this.messages = [];
                return;
            }

            const parsedData = JSON.parse(saved);

            // 🛡️ CRÍTICO: Verificar se os dados foram marcados como limpos
            if (parsedData._clearedAt) {

                this.messages = [];
                return;
            }

            // Validar que os dados pertencem ao usuário atual
            if (parsedData._userId && parsedData._userId !== currentUser.loginid) {
                console.warn('⚠️ Mensagens pertencem a outro usuário');
                this.messages = [];
                return;
            }

            // 🔧 NOVO: Verificar timestamp dos dados salvos vs marcadores de limpeza
            const dataTimestamp = parsedData._timestamp || 0;
            for (const clearMarker of clearMarkers) {
                if (clearMarker && parseInt(clearMarker) > dataTimestamp) {

                    this.messages = [];
                    return;
                }
            }

            // 🛡️ EXTRA: Se messages está vazio E há timestamp de limpeza, não carregar
            if ((!parsedData.messages || parsedData.messages.length === 0) && parsedData._timestamp) {

                this.messages = [];
                return;
            }

            // Restaurar mensagens e converter timestamps - SEM FILTRO DE IDADE
            this.messages = (parsedData.messages || []).map(msg => ({
                ...msg,
                timestamp: new Date(msg.timestamp)
            }));


        } catch (error) {
            console.error('❌ Erro ao carregar mensagens:', error);
            this.messages = [];
        }
    }

    // 🧹 Limpar mensagens antigas do localStorage (chamado na inicialização)
    clearOldMessagesFromStorage() {
        try {
            const currentUser = SessionManager.getCurrentUser();
            if (!currentUser) {

                return;
            }

            // Limpar mensagens do sessionId atual
            localStorage.removeItem(`trade_messages_${this.sessionId}`);


        } catch (error) {
            console.error('❌ Erro ao limpar mensagens antigas:', error);
        }
    }

    // Limpar todas as mensagens
    clearMessages() {

        // 1. Limpar arrays na memória
        this.messages = [];
        this.bufferedMessages = [];

        // 2. Forçar parada de cooldown para evitar repovoamento do buffer
        this.cooldownActive = false;

        const currentUser = SessionManager.getCurrentUser();
        const timestamp = Date.now().toString();

        // 3. 🔧 CRÍTICO: Criar MÚLTIPLOS marcadores de limpeza ANTES de limpar dados
        const clearMarkers = [
            { storage: sessionStorage, key: `messages_cleared_${this.sessionId}` },
            { storage: sessionStorage, key: `messages_cleared_${currentUser?.loginid}` },
            { storage: localStorage, key: `messages_cleared_${this.sessionId}` },
            { storage: localStorage, key: `messages_cleared_${currentUser?.loginid}` },
            { storage: sessionStorage, key: 'last_clear_operation' },
            { storage: localStorage, key: 'last_clear_operation' }
        ];

        clearMarkers.forEach(marker => {
            try {
                marker.storage.setItem(marker.key, timestamp);

            } catch (error) {
                console.warn(`⚠️ [CLEAR MARKER] Erro ao criar marcador ${marker.key}:`, error);
            }
        });

        // 4. 🔥 SOBRESCREVER (não remover) localStorage com array VAZIO para BLOQUEAR reload
        const emptyData = {
            messages: [],
            _timestamp: timestamp,
            _userId: currentUser?.loginid,
            _sessionId: this.sessionId,
            _clearedAt: timestamp
        };

        if (currentUser) {
            const keysToOverwrite = [
                `trade_messages_${this.sessionId}`,
                `trade_messages_${currentUser.loginid}`,
                `trade_messages_${currentUser.authorize?.loginid}`,
                'trade_messages',
                'messages',
            ];

            keysToOverwrite.forEach(key => {
                try {
                    localStorage.setItem(key, JSON.stringify(emptyData));

                } catch (error) {
                    console.warn(`⚠️ [CLEAR] Erro ao sobrescrever ${key}:`, error);
                }
            });
        }

        // 5. 🔥 SOBRESCREVER (não remover) sessionStorage também
        const sessionKeysToOverwrite = [
            `trade_messages_${this.sessionId}`,
            'trade_messages_cache',
            'buffered_messages'
        ];

        sessionKeysToOverwrite.forEach(key => {
            try {
                sessionStorage.setItem(key, JSON.stringify(emptyData));

            } catch (error) {
                console.warn(`⚠️ [CLEAR] Erro ao sobrescrever ${key}:`, error);
            }
        });

        // 6. 🔧 NOVO: Buscar e SOBRESCREVER TODAS as chaves relacionadas do localStorage
        const allKeys = Object.keys(localStorage);
        const tradeMessageKeys = allKeys.filter(key =>
            key.includes('trade_messages') ||
            key.includes('trade_history')
        );

        tradeMessageKeys.forEach(key => {
            try {
                localStorage.setItem(key, JSON.stringify(emptyData));

            } catch (error) {
                console.warn(`⚠️ [CLEAR SCAN] Erro ao sobrescrever ${key}:`, error);
            }
        });

        // 7. Marcar flag de limpeza para evitar recarregamento
        this._clearInProgress = true;

        // 8. Atualizar display imediatamente
        this.updateMessagesDisplay();

        // 9. 🔧 NOVO: Notificar outros sistemas sobre a limpeza
        try {
            // Disparar evento customizado
            window.dispatchEvent(new CustomEvent('messagesCleared', {
                detail: {
                    timestamp: timestamp,
                    sessionId: this.sessionId,
                    userId: currentUser?.loginid
                }
            }));

            // Notificar TradeManager para resetar contadores relacionados
            if (typeof getTradeManagerInstance === 'function') {
                const tradeManager = getTradeManagerInstance();
                if (tradeManager && typeof tradeManager.clearHistoryCounters === 'function') {
                    tradeManager.clearHistoryCounters();
                }
            }
        } catch (error) {
            console.warn('⚠️ [CLEAR] Erro ao notificar outros sistemas:', error);
        }

        // 10. 🔧 CRÍTICO: Verificação múltipla com retry
        const verifyClearing = (attempt = 1, maxAttempts = 3) => {
            setTimeout(() => {
                this._clearInProgress = false;

                // Verificar se mensagens retornaram
                if (this.messages.length > 0) {
                    console.warn(`⚠️ [CLEAR] Tentativa ${attempt}: Mensagens retornaram após limpeza!`);

                    if (attempt < maxAttempts) {
                        // Forçar nova limpeza
                        this.messages = [];
                        this.bufferedMessages = [];
                        this.updateMessagesDisplay();

                        // Recriar marcadores com timestamp mais recente
                        const newTimestamp = Date.now().toString();
                        clearMarkers.forEach(marker => {
                            try {
                                marker.storage.setItem(marker.key, newTimestamp);
                            } catch (error) {
                                console.warn(`⚠️ [CLEAR RETRY] Erro ao recriar marcador:`, error);
                            }
                        });

                        // Tentar novamente
                        verifyClearing(attempt + 1, maxAttempts);
                    } else {
                        console.error('❌ [CLEAR] Falha persistente na limpeza após múltiplas tentativas');
                    }
                }
            }, 1000 * attempt); // Delay crescente para cada tentativa
        };

        verifyClearing();
    }

    // 💰 NOVO: Atualizar display do P&L real
    updateProfitLossDisplay() {
        const profitLossElement = document.getElementById('profit-loss-value');
        if (profitLossElement) {
            const formattedValue = this.realProfitLoss >= 0 ?
                `$${this.realProfitLoss.toFixed(2)}` :
                `-$${Math.abs(this.realProfitLoss).toFixed(2)}`;

            profitLossElement.textContent = formattedValue;

            // Aplicar classe CSS baseada no valor
            profitLossElement.className = 'profit-loss-value';
            if (this.realProfitLoss > 0) {
                profitLossElement.classList.add('profit');
                // Cor verde para valores positivos
                profitLossElement.style.backgroundColor = '#28a745';
                profitLossElement.style.color = 'white';
            } else if (this.realProfitLoss < 0) {
                profitLossElement.classList.add('loss');
                // Cor vermelha para valores negativos
                profitLossElement.style.backgroundColor = '#dc3545';
                profitLossElement.style.color = 'white';
            } else {
                profitLossElement.classList.add('neutral');
                // Cor neutra para valor zero
                profitLossElement.style.backgroundColor = '#6c757d';
                profitLossElement.style.color = 'white';
            }

            // 🎨 NOVO: Feedback visual para reset
            if (this.realProfitLoss === 0) {
                profitLossElement.style.animation = 'resetPulse 0.6s ease-out';
                setTimeout(() => {
                    profitLossElement.style.animation = '';
                }, 600);
            }
        }
    }

    // 🔄 NOVO: FORÇAR atualização visual do P&L (sem cache)
    forceUpdateProfitLossDisplay() {

        // Buscar TODOS os possíveis elementos de P&L na página
        const possibleElements = [
            'profit-loss-value',
            'profit-loss-display',
            'realProfitLoss',
            'session-profit-loss'
        ];

        possibleElements.forEach(elementId => {
            const element = document.getElementById(elementId);
            if (element) {


                // FORÇAR texto para $0.00
                element.textContent = '$0.00';
                element.innerText = '$0.00';

                // FORÇAR classes CSS para neutral
                element.className = 'profit-loss-value neutral';

                // FORÇAR estilo visual para neutral (cinza)
                element.style.color = 'white';
                element.style.backgroundColor = '#6c757d';
                element.style.borderColor = '#545b62';

                // Animação de confirmação
                element.style.animation = 'resetPulse 0.8s ease-out';
                setTimeout(() => {
                    element.style.animation = '';
                }, 800);

            }
        });

        // FORÇAR atualização em outros possíveis locais
        const inlineDisplays = document.querySelectorAll('.profit-loss-display-inline .profit-loss-value');
        const centeredDisplays = document.querySelectorAll('.profit-loss-display.centered-display .profit-loss-value');

        [...inlineDisplays, ...centeredDisplays].forEach((element, index) => {
            if (element) {

                element.textContent = '$0.00';
                element.className = 'profit-loss-value neutral';
                element.style.backgroundColor = '#6c757d';
                element.style.color = 'white';
            }
        });

    }

    // 💰 NOVO: Resetar P&L real - RESET COMPLETO SEM CACHE
    resetProfitLoss() {

        // ETAPA 1: ZERAR VALOR NA MEMÓRIA
        this.realProfitLoss = 0;

        // ETAPA 2: LIMPAR COMPLETAMENTE TODOS OS CACHES E STORAGES
        const currentUser = SessionManager.getCurrentUser();
        if (currentUser) {
            // Remover TODAS as possíveis chaves de P&L
            const keysToRemove = [
                `profit_loss_${this.sessionId}`,
                `profit_loss_${currentUser.loginid}`,
                `profit_loss_${currentUser.authorize?.loginid}`,
                `realProfitLoss_${this.sessionId}`,
                `realProfitLoss_${currentUser.loginid}`,
                'realProfitLoss',
                'profit_loss',
                'sessionProfitLoss',
                'trade_profit_loss'
            ];

            let removedCount = 0;
            keysToRemove.forEach(key => {
                if (localStorage.getItem(key)) {
                    localStorage.removeItem(key);
                    removedCount++;

                }
            });

        }

        // ETAPA 3: FORÇAR ATUALIZAÇÃO VISUAL IMEDIATA

        this.forceUpdateProfitLossDisplay();

        // ✅ CORREÇÃO 2: SALVAR P&L zerado no localStorage para evitar recálculo
        this.saveProfitLoss();

        // ETAPA 4: VERIFICAR SE O RESET FOI APLICADO
        setTimeout(() => {
            const profitLossElement = document.getElementById('profit-loss-value');
            if (profitLossElement) {
                const currentText = profitLossElement.textContent;

                if (currentText !== '$0.00') {
                    console.warn(`⚠️ [P&L RESET] Elemento não foi atualizado corretamente! Forçando novamente...`);
                    profitLossElement.textContent = '$0.00';
                    profitLossElement.className = 'profit-loss-value neutral';
                }
            }
        }, 100);

    }

    // 💰 NOVO: Salvar P&L real no localStorage
    saveProfitLoss() {
        try {
            const currentUser = SessionManager.getCurrentUser();
            if (!currentUser) {
                console.warn('⚠️ Não é possível salvar P&L sem usuário logado');
                return;
            }

            const dataToSave = {
                realProfitLoss: this.realProfitLoss,
                _userId: currentUser.loginid,
                _timestamp: Date.now(),
                _sessionId: this.sessionId
            };

            // Salvar com chave consistente baseada no sessionId
            localStorage.setItem(`profit_loss_${this.sessionId}`, JSON.stringify(dataToSave));

        } catch (error) {
            console.error('❌ Erro ao salvar P&L:', error);
        }
    }

    // 💰 NOVO: Carregar P&L real salvo
    loadSavedProfitLoss() {
        try {
            const currentUser = SessionManager.getCurrentUser();
            if (!currentUser) {
                this.realProfitLoss = 0;
                this.updateProfitLossDisplay();
                return;
            }

            const saved = localStorage.getItem(`profit_loss_${this.sessionId}`);
            if (!saved) {
                this.realProfitLoss = 0;
                this.updateProfitLossDisplay();
                return;
            }

            const parsedData = JSON.parse(saved);

            // Validar que os dados pertencem ao usuário atual
            if (parsedData._userId && parsedData._userId !== currentUser.loginid) {
                console.warn('⚠️ P&L pertence a outro usuário');
                this.realProfitLoss = 0;
                this.updateProfitLossDisplay();
                return;
            }

            this.realProfitLoss = parsedData.realProfitLoss || 0;
            this.updateProfitLossDisplay();


        } catch (error) {
            console.error('❌ Erro ao carregar P&L:', error);
            this.realProfitLoss = 0;
            this.updateProfitLossDisplay();
        }
    }

    // 💰 NOVO: Recalcular P&L baseado nas mensagens existentes
    recalculateProfitLoss() {

        this.realProfitLoss = 0;

        this.messages.forEach(message => {
            // 💰 CRÍTICO: Recalcular APENAS para trades reais (REAL/VIRTUAL)
            if (message.mode !== 'SIMULACAO' && message.profit !== null && message.profit !== undefined) {
                this.realProfitLoss += parseFloat(message.profit);
            }
        });

        this.updateProfitLossDisplay();
        this.saveProfitLoss();

    }

    // Obter estatísticas das mensagens
    getStatistics() {
        if (this.messages.length === 0) {
            return {
                total: 0,
                wins: 0,
                losses: 0,
                winRate: 0
            };
        }

        const wins = this.messages.filter(msg => msg.isWin).length;
        const losses = this.messages.length - wins;
        const winRate = ((wins / this.messages.length) * 100).toFixed(1);

        return {
            total: this.messages.length,
            wins: wins,
            losses: losses,
            winRate: parseFloat(winRate)
        };
    }

    // 🔧 NOVO: Verificar se cooldown está ativo globalmente
    isCooldownActiveGlobally() {
        try {
            // Verificar se CooldownOverlay está ativo OU protegido
            if (typeof CooldownOverlay !== 'undefined') {
                const cooldownState = CooldownOverlay.getCooldownState();
                const isActiveOrProtected = cooldownState.active || cooldownState.protected;
                if (isActiveOrProtected) {
                    return true;
                }
            }

            // Verificar se MonitoringView está em estado de cooldown
            if (typeof MonitoringView !== 'undefined') {
                const isInCooldownState = MonitoringView.state === 'COOLDOWN' ||
                    MonitoringView.state === 'COOLDOWN_PROTECTED' ||
                    MonitoringView.state === 'COOLDOWN_PENDING' ||
                    MonitoringView.pendingCooldownStart === true;
                if (isInCooldownState) {
                    return true;
                }
            }

            // Verificar se existe overlay visual ativo
            const overlayExists = document.querySelector('.cooldown-overlay-modal');
            if (overlayExists && overlayExists.style.display !== 'none') {
                return true;
            }

            return false;
        } catch (error) {
            console.warn('⚠️ [TRADE MESSAGES] Erro ao verificar cooldown global:', error);
            return false;
        }
    }

    // 🔧 NOVO: Ativar modo cooldown
    activateCooldownMode() {
        this.cooldownActive = true; // Usando cooldownActive
    }

    // 🔧 NOVO: Desativar modo cooldown e processar mensagens em buffer
    deactivateCooldownMode() {

        // 🔧 CRÍTICO: Sempre processar buffer se houver mensagens, independente do estado local
        if (this.bufferedMessages.length === 0) {
            this.cooldownActive = false;

            return;
        }

        logConfig.debug('trade_messages', '📤 [BUFFER] Desativando modo cooldown e processando buffer...');
        this.cooldownActive = false; // Usando cooldownActive

        // 🔧 CORREÇÃO: Filtrar mensagens antigas do buffer antes de processar
        const now = Date.now();
        const MAX_BUFFER_AGE_MS = 5 * 60 * 1000; // 5 minutos para buffer

        const recentBufferedMessages = this.bufferedMessages.filter(msg => {
            const messageAge = now - msg.timestamp.getTime();
            const isRecent = messageAge <= MAX_BUFFER_AGE_MS;


            return isRecent;
        });

        // Processar apenas mensagens recentes do buffer
        const messagesToProcess = [...recentBufferedMessages];
        this.bufferedMessages = []; // Limpando buffer completamente

        messagesToProcess.forEach((msg, index) => {

            // Adicionar à lista principal e atualizar P&L
            this.messages.unshift(msg); // Adicionar no início da lista principal
            // 💰 CRÍTICO: Atualizar P&L APENAS para trades reais (REAL/VIRTUAL) - NUNCA para SIMULACAO
            if (msg.mode !== 'SIMULACAO' && msg.profit !== null && msg.profit !== undefined) {
                this.realProfitLoss += parseFloat(msg.profit);
                logConfig.info('trade_messages', `💰 [BUFFER P&L UPDATE] Adicionado ao P&L: ${msg.profit} | Total: ${this.realProfitLoss.toFixed(2)} (modo: ${msg.mode})`);
            } else if (msg.mode === 'SIMULACAO') {
                logConfig.info('trade_messages', `🎮 [BUFFER P&L SKIP] Trade simulado ignorado no P&L: ${msg.tradeType} ${msg.isWin ? 'WIN' : 'LOSS'} (valor: ${msg.profit || 'N/A'})`);
            }


            // SEM LIMITE: Manter todas as mensagens do buffer
        });

        if (messagesToProcess.length > 0) {

            this.saveMessages(); // Salvar mensagens após adicionar do buffer
            this.updateMessagesDisplay(); // Atualizar display
            this.updateProfitLossDisplay(); // Atualizar P&L
            this.saveProfitLoss(); // Salvar P&L
        }
    }

    // 🔧 NOVO: Limpar buffer de mensagens (caso necessário)
    clearBufferedMessages() {

        this.bufferedMessages = [];

    }

    // 🔧 NOVO: Obter estatísticas do buffer
    getBufferStats() {
        return {
            bufferedCount: this.bufferedMessages.length,
            cooldownActive: this.cooldownActive, // Usando cooldownActive
            globalCooldownActive: this.isCooldownActiveGlobally()
        };
    }

    // Método para ser chamado pelo TradeManager
    static getInstance() {
        if (!window.tradeMessagesInstance) {

            window.tradeMessagesInstance = new TradeMessagesManager();
        }
        return window.tradeMessagesInstance;
    }

    // 🔍 NOVO: Validar lógica dos resultados antes de exibir
    validateTradeLogic(contractType, entryPrice, exitPrice, result, profit) {
        const entry = parseFloat(entryPrice);
        const exit = parseFloat(exitPrice);

        // 🎯 CORREÇÃO CRÍTICA: Usar a mesma lógica do TradeManager
        let expectedWin = false;

        switch (contractType) {
            case 'CALL':
                // CALL = preço deve SUBIR
                expectedWin = exit > entry;
                break;
            case 'PUT':
                // PUT = preço deve DESCER
                expectedWin = exit < entry;

                // 🚨 VALIDAÇÃO CRÍTICA: Detectar erros óbvios em PUT
                if (exit > entry && result === true) {
                    console.error(`🚨 ERRO CRÍTICO DETECTADO: PUT marcado como WIN mas preço SUBIU!`);
                    console.error(`   ${contractType}: ${entry} → ${exit} (movimento: +${(exit - entry).toFixed(6)})`);
                    console.error(`   Resultado reportado: WIN (INCORRETO - deveria ser LOSS)`);
                }
                break;
            case 'DIGITOVER':
            case 'DIGITUNDER':
            case 'DIGITMATCH':
            case 'DIGITDIFF':
            case 'DIGITEVEN':
            case 'DIGITODD':
            case 'CALLE':
            case 'PUTE':
                // Para outros contratos, não validar aqui pois dependem de configurações específicas
                return { valid: true, expected: result, actual: result };
            default:
                return { valid: true, expected: result, actual: result };
        }

        const actualWin = profit > 0;

        // 🔍 IMPORTANTE: Para trades simulados, usar o resultado fornecido pelo TradeManager
        if (profit === null || profit === undefined) {
            // Se não há profit definido, confiar no resultado fornecido
            return { valid: true, expected: result, actual: result };
        }

        // Só validar inconsistências em trades reais com profit definido
        if (expectedWin !== actualWin && Math.abs(profit) > 0) {
            console.warn(`⚠️ [TRADE VALIDATION] Possível inconsistência detectada!`);
            console.warn(`   Contrato: ${contractType}`);
            console.warn(`   Preços: ${entry} → ${exit}`);
            console.warn(`   Movimento: ${exit > entry ? 'SUBIU' : exit < entry ? 'DESCEU' : 'IGUAL'}`);
            console.warn(`   Esperado: ${expectedWin ? 'WIN' : 'LOSS'}`);
            console.warn(`   Resultado: ${actualWin ? 'WIN' : 'LOSS'}`);
            console.warn(`   Lucro: ${profit}`);
        }

        return { valid: true, expected: expectedWin, actual: actualWin };
    }

    // Event listener para o botão de limpeza
    static attachClearButtonListener() {
        const clearButton = document.getElementById('clear-messages-btn');
        if (clearButton) {
            // Remover TODOS os event listeners anteriores
            const newButton = clearButton.cloneNode(true);
            clearButton.parentNode.replaceChild(newButton, clearButton);

            // Adicionar apenas o listener direto sem popup
            newButton.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();

                // LIMPEZA IMEDIATA - SEM POPUP, SEM CONFIRMAÇÃO
                const instance = TradeMessagesManager.getInstance();
                instance.clearMessages();

                // 🔧 NOVO: Forçar limpeza global de todos os storages relacionados
                setTimeout(() => {
                    const allKeys = Object.keys(localStorage);
                    const messageKeys = allKeys.filter(key =>
                        key.includes('trade_messages') ||
                        key.includes('messages') ||
                        key.includes('trade_history')
                    );

                    messageKeys.forEach(key => {
                        localStorage.removeItem(key);

                    });

                }, 100);

                // 📊 NOVO: Resetar contadores de histórico no TradeManager
                if (typeof getTradeManagerInstance === 'function') {
                    const tradeManager = getTradeManagerInstance();
                    if (tradeManager && typeof tradeManager.clearHistoryCounters === 'function') {
                        tradeManager.clearHistoryCounters();
                    }
                }

                // 🎯 NOVO: Atualizar contadores visuais imediatamente
                if (window.UIManager && typeof window.UIManager.updateTradingCounters === 'function') {
                    window.UIManager.updateTradingCounters();
                }
            });
        }
    }

    // 💰 NOVO: Event listener para o botão de reset P&L
    static attachResetProfitLossListener() {
        // 🔧 CORREÇÃO: Usar event delegation no document para garantir que funcione
        // mesmo se o botão for recriado ou movido no DOM

        // Remover listener anterior se existir
        if (window._resetPLListenerAttached) {
            return;
        }

        window._resetPLListenerAttached = true;

        // Event delegation - escutar cliques em qualquer botão de reset P&L
        document.addEventListener('click', (e) => {
            const target = e.target;

            // Verificar se o clique foi no botão de reset P&L
            if (target.id === 'reset-profit-loss-btn' ||
                target.classList.contains('reset-profit-loss-btn') ||
                target.closest('#reset-profit-loss-btn') ||
                target.closest('.reset-profit-loss-btn')) {

                e.preventDefault();
                e.stopPropagation();

                // RESET IMEDIATO - SEM POPUP, SEM CONFIRMAÇÃO
                const instance = TradeMessagesManager.getInstance();
                const valorAnterior = instance.realProfitLoss;
               
                // EXECUTAR RESET COMPLETO
                instance.resetProfitLoss();

                // VERIFICAR se realmente zerou
                const valorDepois = instance.realProfitLoss;

                if (valorDepois !== 0) {
                    console.error('🚨 [RESET BUTTON] ERRO: Valor não foi resetado corretamente!');
                    // FORÇAR reset novamente
                    instance.realProfitLoss = 0;
                    instance.forceUpdateProfitLossDisplay();
                }

                // 🎨 Feedback visual adicional no botão
                const button = target.closest('button') || target;
                button.style.transform = 'scale(0.95)';
                button.style.background = '#28a745';
                button.style.color = 'white';

                setTimeout(() => {
                    button.style.transform = '';
                    button.style.background = '';
                    button.style.color = '';
                }, 500);
            }
        }, true); // useCapture = true para garantir que pegue o evento
      
    }

    // Método para ser chamado pelo TradeManager
    _processMessage(contractType, entryPrice, exitPrice, mode, isWin, stake = null, profit = null) {
        const message = {
            id: Date.now() + Math.random(),
            tradeType: contractType,
            entryPrice: entryPrice,
            exitPrice: exitPrice,
            mode: mode,
            isWin: isWin,
            stake: stake,
            profit: profit,
            galeMultiplier: galeMultiplier,
            timestamp: new Date(),
            sessionId: this.sessionId
        };

        // ✅ VERIFICAR SE NÃO É DUPLICATA 100% IDÊNTICA antes de adicionar
        const isDuplicateExact = this.messages.some(existing =>
            existing.tradeType === message.tradeType &&
            existing.entryPrice === message.entryPrice &&
            existing.exitPrice === message.exitPrice &&
            existing.mode === message.mode &&
            existing.isWin === message.isWin &&
            existing.stake === message.stake &&
            existing.profit === message.profit &&
            Math.abs(existing.timestamp - message.timestamp) < 100
        );

        if (isDuplicateExact) {
            logConfig.warn('trade_messages', '🚫 [PROCESS DUPLICATE] Mensagem 100% idêntica ignorada');
            return;
        }

        // Adicionar à lista de mensagens normalmente
        this.messages.unshift(message); // Adicionar no início

        // 💰 CRÍTICO: Atualizar P&L APENAS para trades reais - NUNCA para simulados
        if (message.mode !== 'SIMULACAO' && message.profit !== null && message.profit !== undefined) {
            this.realProfitLoss += parseFloat(message.profit);
            this.updateProfitLossDisplay();
            logConfig.debug('trade_messages', `💰 [PROCESS P&L] ${message.tradeType}: ${message.profit} | Total: ${this.realProfitLoss.toFixed(2)}`);
        } else if (message.mode === 'SIMULACAO') {
            logConfig.debug('trade_messages', `🎮 [PROCESS SKIP] Trade simulado ignorado: ${message.tradeType} ${message.isWin ? 'WIN' : 'LOSS'}`);
        }

        // SEM LIMITE: Manter todas as mensagens

        // Salvar mensagens
        this.saveMessages();

        // Atualizar display
        this.updateMessagesDisplay();

        // 🔍 VALIDAÇÃO: Log da validação sem alterar o resultado (apenas informativo)
        if (message.mode !== 'SIMULACAO' && message.profit !== null && message.profit !== undefined) {
            this.validateTradeLogic(message.tradeType, message.entryPrice, message.exitPrice, isWin, message.profit);
        }

        // Log final da mensagem processada
        const result = isWin ? 'WIN' : 'LOSS';
        const messageType = message.mode === 'SIMULACAO' ? 'SIMULADA' : 'REAL';
        // console.log(`✅ [TRADE MESSAGES] Mensagem processada: ${contractType} | ${result} | ${messageType}`);
    }
}

// Função global para facilitar acesso
function getTradeMessagesInstance() {
    return TradeMessagesManager.getInstance();
}

// 🔧 NOVO: Sistema de inicialização inteligente e robusto
let initializationAttempted = false;

function attemptInitialization() {
    if (initializationAttempted) return;
    initializationAttempted = true;

    const messagesManager = getTradeMessagesInstance();
    messagesManager.initialize();
}

// Inicializar quando DOM estiver completamente pronto
if (document.readyState === 'complete') {
    setTimeout(attemptInitialization, 1000);
} else {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(attemptInitialization, 1500);
    });
}

// Também inicializar quando a view de monitoramento for renderizada (backup)
document.addEventListener('monitoringViewRendered', () => {
    if (!initializationAttempted) {
        setTimeout(attemptInitialization, 300);
    } else {
        // Se já inicializou mas container não existe, tentar novamente
        const instance = getTradeMessagesInstance();
        if (!instance.messagesContainer) {
            setTimeout(() => instance.initialize(), 200);
        }
    }
});

// Listener para views renderizadas (backup adicional)
document.addEventListener('viewRendered', (e) => {
    if (e.detail && e.detail.viewName === 'monitoring') {
        if (!initializationAttempted) {
            setTimeout(attemptInitialization, 200);
        } else {
            // Verificar se precisa reinicializar
            const instance = getTradeMessagesInstance();
            if (!instance.messagesContainer) {
                setTimeout(() => instance.initialize(), 100);
            }
        }
    }
});