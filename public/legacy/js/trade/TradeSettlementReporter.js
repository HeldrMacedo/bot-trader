// js/trade/TradeSettlementReporter.js
// Relatório de liquidação de trades

class TradeSettlementReporter {
    constructor(sessionId) {
        this.sessionId = sessionId;

        // Contadores de histórico
        this.historyCounters = {
            realWinsTotal: 0,
            realLossesTotal: 0,
            simulatedWinsTotal: 0,
            simulatedLossesTotal: 0
        };

        // ✅ PROTEÇÃO: Controle anti-duplicação
        this.lastMessageKey = null;
        this.lastMessageTime = 0;


    }

    // 🔧 Adicionar mensagem de resultado do trade
    addTradeResultMessage(contractType, entryPrice, exitPrice, mode, isWin, stake = null, profit = null, prediction = null) {
        try {
            console.log('📨 [TRADE MESSAGE] === ADICIONANDO MENSAGEM DE RESULTADO ===');
            console.log('📨 [TRADE MESSAGE] ContractType:', contractType);
            console.log('📨 [TRADE MESSAGE] EntryPrice:', entryPrice);
            console.log('📨 [TRADE MESSAGE] ExitPrice:', exitPrice);
            console.log('📨 [TRADE MESSAGE] Mode:', mode);
            console.log('📨 [TRADE MESSAGE] IsWin:', isWin);
            console.log('📨 [TRADE MESSAGE] Stake:', stake);
            console.log('📨 [TRADE MESSAGE] Profit:', profit);
            console.log('📨 [TRADE MESSAGE] Prediction:', prediction);

            // ✅ PROTEÇÃO PRECISA: Só bloquear se TODOS os campos forem 100% idênticos
            const now = Date.now();

            // Criar chave única com TODOS os campos relevantes
            const fullMessageKey = `${contractType}_${entryPrice}_${exitPrice}_${mode}_${isWin}_${stake}_${profit}_${prediction}`;

            // Só bloquear se for EXATAMENTE a mesma mensagem em menos de 200ms (muito rápido)
            if (this.lastMessageKey === fullMessageKey && (now - this.lastMessageTime) < 200) {
                console.warn('🚫 [TRADE MESSAGE] Mensagem 100% duplicada ignorada - todos os campos idênticos');
                logConfig.debug('trade_settlement', `🚫 Duplicata exata ignorada: ${contractType} ${isWin ? 'WIN' : 'LOSS'}`);
                return;
            }

            this.lastMessageKey = fullMessageKey;
            this.lastMessageTime = now;

            console.log('📨 [TRADE MESSAGE] Mensagem validada - prosseguindo com adição');
            logConfig.debug('trade_settlement', `📝 Adicionando mensagem: ${contractType} ${isWin ? 'WIN' : 'LOSS'}`);

            // Validar e sanitizar valores numéricos
            const sanitizedEntryPrice = this.sanitizePrice(entryPrice, 'entryPrice');
            const sanitizedExitPrice = this.sanitizePrice(exitPrice, 'exitPrice');
            const actualStake = stake !== null ? this.sanitizePrice(stake, 'stake') : 0.35;
            const actualProfit = profit !== null ? this.sanitizePrice(profit, 'profit') : null;

            console.log('📨 [TRADE MESSAGE] Valores sanitizados:');
            console.log('📨 [TRADE MESSAGE] - EntryPrice:', sanitizedEntryPrice);
            console.log('📨 [TRADE MESSAGE] - ExitPrice:', sanitizedExitPrice);
            console.log('📨 [TRADE MESSAGE] - Stake:', actualStake);
            console.log('📨 [TRADE MESSAGE] - Profit:', actualProfit);

            // Verificar função de mensagens
            if (typeof getTradeMessagesInstance !== 'function') {
                console.error('❌ [TRADE MESSAGE] getTradeMessagesInstance não é uma função');
                return;
            }

            const messagesManager = getTradeMessagesInstance();
            if (!messagesManager) {
                console.error('❌ [TRADE MESSAGE] messagesManager não foi obtido');
                return;
            }

            console.log('📨 [TRADE MESSAGE] MessagesManager obtido - adicionando mensagem...');
            messagesManager.addTradeMessage(
                contractType,
                sanitizedEntryPrice,
                sanitizedExitPrice,
                mode,
                isWin,
                actualStake,
                actualProfit,
                null,
                prediction
            );

            console.log('✅ [TRADE MESSAGE] === MENSAGEM ADICIONADA COM SUCESSO ===');
            logConfig.debug('trade_settlement', `✅ Mensagem adicionada com sucesso`);

        } catch (error) {
            console.error('❌ [TRADE MESSAGE] Erro crítico ao adicionar mensagem de trade:', error);
        }
    }

    // 🔧 Sanitizar preços
    sanitizePrice(price, fieldName) {
        if (price === undefined || price === null) {
            console.warn(`⚠️ ${fieldName} é undefined/null, usando 0`);
            return 0;
        }

        const parsed = parseFloat(price);
        if (isNaN(parsed)) {
            console.error(`❌ ${fieldName} é NaN: ${price}, usando 0`);
            return 0;
        }

        return parsed;
    }

    // ✅ Formatar mensagem de resultado
    formatTradeResultMessage(contractType, startPrice, finalPrice, mode, isWin) {
        const resultIcon = isWin ? '✅' : '❌';
        const modeText = mode === 'SIMULACAO' ? 'SIMULACAO' : mode;
        return `${resultIcon} ${contractType} | ${startPrice} | ${finalPrice} | ${modeText}`;
    }

    // 📊 Atualizar contadores de histórico
    updateHistoryCounters(mode, isWin) {
        if (mode === 'SIMULACAO') {
            if (isWin) {
                this.historyCounters.simulatedWinsTotal++;
                logConfig.debug('trade_settlement', `📊 Wins simulados: ${this.historyCounters.simulatedWinsTotal}`);
            } else {
                this.historyCounters.simulatedLossesTotal++;
                logConfig.debug('trade_settlement', `📊 Perdas simuladas: ${this.historyCounters.simulatedLossesTotal}`);
            }
        } else {
            if (isWin) {
                this.historyCounters.realWinsTotal++;
                logConfig.debug('trade_settlement', `📊 Wins reais: ${this.historyCounters.realWinsTotal}`);
            } else {
                this.historyCounters.realLossesTotal++;
                logConfig.debug('trade_settlement', `📊 Perdas reais: ${this.historyCounters.realLossesTotal}`);
            }
        }

        // Disparar evento de atualização
        window.dispatchEvent(new CustomEvent('historyCountersUpdated', {
            detail: this.historyCounters
        }));
    }

    // 📊 Obter contadores
    getHistoryCounters() {
        return { ...this.historyCounters };
    }

    // 🗑️ Limpar contadores
    clearHistoryCounters() {
        this.historyCounters = {
            realWinsTotal: 0,
            realLossesTotal: 0,
            simulatedWinsTotal: 0,
            simulatedLossesTotal: 0
        };

        logConfig.info('trade_settlement', '🗑️ Contadores de histórico limpos');

        window.dispatchEvent(new CustomEvent('historyCountersCleared'));
    }

    // 🔄 Resetar contadores
    resetCounters() {
        this.clearHistoryCounters();
    }
}

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.TradeSettlementReporter = TradeSettlementReporter;
}