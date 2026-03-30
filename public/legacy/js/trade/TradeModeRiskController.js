// js/trade/TradeModeRiskController.js
// Controlador de risco e modos de trading

class TradeModeRiskController {
    constructor(sessionId, config) {
        this.sessionId = sessionId;
        this.config = config;

        // Modo atual
        this.currentMode = 'SIMULACAO';

        // Contadores de streak
        this.realWinsStreak = 0;
        this.realLossesStreak = 0;
        this.simulatedLossesStreak = 0;
        this.simulatedWinsStreak = 0;

        // Sistema de Gale
        this._accumulatedLosses = 0; // 🔒 Backing field
        this.currentProposalPayout = null;
        this.lastCalculatedStake = null;
        this.lastRealGaleValue = 0; // 📝 Valor real do Gale (sem arredondamento)
        this.pendingGaleApplication = false;

        // Lucro/Perda da sessão
        this.sessionProfitLoss = 0;
        this.initialBalance = 0;

        // 🎯 SPLIT GALE STATE
        this.pendingSplitWins = 0;
        this.lastCalculatedStakeSplitted = null;
        this.lastRealTradeWasLoss = false; // 🎯 FIX: Rastreio independente de streak para resistir a trocas de modo
        this.splitGaleJustCompleted = false; // 🎯 NOVO: Flag para sinalizar fim de ciclo Split (não conta para Soros)

        // Transições de modo
        this.pendingModeTransition = null;
        this.pendingModeProcessing = null;

        // Flags de controle
        this.popupShown = false;
        this.tradeReal = false;
        this.isCalculatingGale = false;
        this.lastExecutedContractType = null; // 🎯 Rastrear tipo de contrato anterior

        // Callbacks
        this.onModeChange = null;

        // Inicializar sistema de Gale
        this.initializeGaleSystem();
    }

    // 🕵️ SETTER TRAP: Rastrear quem está resetando as perdas acumuladas
    get accumulatedLosses() {
        return this._accumulatedLosses;
    }

    // 🎯 NOVO: Setter para payout da proposta
    setProposalPayout(payout) {
        if (payout && !isNaN(parseFloat(payout))) {
            this.currentProposalPayout = parseFloat(payout);
            logConfig.debug('trade_risk', `🎯 Payout definido manualmente: ${this.currentProposalPayout}`);
        }
    }

    set accumulatedLosses(value) {
      
        // Se estiver resetando (valor 0) e tinha valor antes (>0)
        if (value === 0 && this._accumulatedLosses > 0) {
            // 🛡️ PROTEÇÃO EXPERIMENTAL: Se Split Gale estiver ativo, IMPEDIR O RESET?
            // "Se pendingSplitWins > 0, IGNORAR reset externo"
            if (this.pendingSplitWins > 0) {
           
                return;
            }
        }
        this._accumulatedLosses = value;
    }

    // 🔄 Atualizar configurações dinamicamente
    updateConfig(newConfig) {
        this.config = newConfig;
        logConfig.info('trade_risk', `⚙️ Configuração de Risco atualizada via sync explícito.`);
        logConfig.info('trade_risk', `  - Split: ${this.config.galeSplit} | Threshold: ${this.config.galeSplitThreshold} | Gale Ativo: ${this.config.galeActive}`);
    }

    //  Verificar se Split Gale está ativo
    isSplitActive() {
        return this.pendingSplitWins > 0;
    }

    // 🎰 Inicializar sistema de Gale
    initializeGaleSystem() {
        if (typeof this.accumulatedLosses === 'undefined') {
            this.accumulatedLosses = 0;
        }
    }

    // 🎰 Verificar se deve aplicar Gale
    shouldApplyGale() {
        const isGaleConfigActive = this.config.galeActive === true;
        const hasAccumulatedLosses = this.accumulatedLosses > 0;
     
        const isSplitActive = this.pendingSplitWins > 0;

        const galeAdjustment = (this.config.galeAdjustment !== undefined && this.config.galeAdjustment !== null) ? this.config.galeAdjustment : 1;
        const isAdjustmentValid = galeAdjustment > 0;

        // 🎰 CORREÇÃO: Usar acumulado OU split ativo
        const shouldApply = isGaleConfigActive && (hasAccumulatedLosses || isSplitActive) && isAdjustmentValid;

        logConfig.debug('trade_risk', `🎰 Deve aplicar Gale: ${shouldApply}`);
        logConfig.debug('trade_risk', `  - Gale ativo: ${isGaleConfigActive}`);
        logConfig.debug('trade_risk', `  - Perdas acumuladas: ${hasAccumulatedLosses} (${this._accumulatedLosses.toFixed(4)})`);
        logConfig.debug('trade_risk', `  - Split ativo: ${isSplitActive} (${this.pendingSplitWins} pendentes)`);
        logConfig.debug('trade_risk', `  - Ajuste válido (>0): ${isAdjustmentValid} (valor: ${galeAdjustment})`);

        return shouldApply;
    }

    // 🎯 FALLBACK PAYOUTS (Oficial - 3% para segurança)
    static get FALLBACK_PAYOUTS() {
        return {
            'DIGITDIFF': 1.095,   // 9.5%
            'DIGITMATCH': 8.70,   // 770%
            'DIGITEVEN': 1.92,    // 92%
            'DIGITODD': 1.92,     // 92%
            'CALL': 1.92,         // 92%
            'PUT': 1.92,          // 92%
            'CALLE': 1.92,        // Rise/Fall Higher/Lower (médio)
            'PUTE': 1.92,
            'DIGITOVER': {
                0: 1.08, 1: 1.21, 2: 1.36, 3: 1.55, 4: 1.87, 5: 2.30, 6: 3.05, 7: 4.60, 8: 8.70
            },
            'DIGITUNDER': {
                9: 1.08, 8: 1.21, 7: 1.36, 6: 1.55, 5: 1.87, 4: 2.30, 3: 3.05, 2: 4.60, 1: 8.70
            }
        };
    }

    // 🎰 Calcular stake com Gale
    calculateGaleStake(targetContractType = null, targetBarrier = null) {
     
        console.log("IsCalculatingGale ", this.isCalculatingGale);
        console.log("this.config ", this.config);
        console.log("lastCalculatedStake ", this.lastCalculatedStake);
        // 🔒 PROTEÇÃO CONTRA LOOP INFINITO
        if (this.isCalculatingGale) {
        
            return this.lastCalculatedStake || this.config.stake || 0.35;
        }

        this.isCalculatingGale = true;

        try {
            const baseStake = this.config.stake || 0.35;
            if (!this.config.galeActive) {
                logConfig.info('trade_risk', `🎰 Gale desativado, usando stake base: ${baseStake}`);
                return parseFloat(baseStake.toFixed(2));
            }

            // ✅ NOVA CONDIÇÃO: Se Ajuste de Gale = 0, não aplicar Gale
            const galeAdjustment = (this.config.galeAdjustment !== undefined && this.config.galeAdjustment !== null) ? this.config.galeAdjustment : 1;
            if (galeAdjustment === 0) {
                logConfig.info('trade_risk', `🎰 Ajuste de Gale = 0, mantendo stake original: ${baseStake}`);
                return parseFloat(baseStake.toFixed(2));
            }

            // 🎯 LÓGICA DE RECUPERAÇÃO DE ESTADO PERDIDO - SPLIT GALE
            // Se temos vitórias pendentes e uma stake dividida salva, USE-A!
            // Isso previne que resets acidentais de accumulatedLosses (bug externo) interrompam a sequência.
            if (this.pendingSplitWins > 0 && this.lastCalculatedStakeSplitted) {
                // Verificar se accumulatedLosses está zerado (o que seria o bug)
                if (this.accumulatedLosses <= 0) {
                    logConfig.warn('trade_risk', `⚠️ [GALE RECOVERY] Accum zerado mas Pending Wins=${this.pendingSplitWins}. Forçando uso de Stake Dividida preservada.`);
                } else {
                    logConfig.info('trade_risk', `🎰 [SPLIT SEQ] Continuando sequência (${this.pendingSplitWins} wins pendentes).`);
                }
                return parseFloat(this.lastCalculatedStakeSplitted.toFixed(2));
            }
            console.log("this.accumulatedLosses ", this.accumulatedLosses);
            // 🎰 CORREÇÃO: Usar accumulatedLosses ao invés de realLossesStreak
            if (this.accumulatedLosses <= 0) {
                logConfig.info('trade_risk', `🎰 Sem perdas acumuladas, usando stake base: ${baseStake}`);
                return parseFloat(baseStake.toFixed(2));
            }

            // 🎯 ESCOLHER PAYOUT PARA CÁLCULO
            let currentPayout = parseFloat(this.currentProposalPayout);
            const fallbackMap = TradeModeRiskController.FALLBACK_PAYOUTS;
            let usingFallback = false;

            // 🔍 Se mudou o tipo de contrato ou não temos payout, usar fallback
            if (targetContractType) {
                const isTypeDifferent = this.lastExecutedContractType && this.lastExecutedContractType !== targetContractType;

                if (isTypeDifferent || !currentPayout || currentPayout <= 0) {
                    let fallbackVal = fallbackMap[targetContractType];

                    // Tratar barreira para Over/Under
                    if (typeof fallbackVal === 'object' && targetBarrier !== null) {
                        fallbackVal = fallbackVal[targetBarrier] || 1.95;
                    }

                    if (fallbackVal) {
                        currentPayout = fallbackVal;
                        usingFallback = true;
                        logConfig.warn('trade_risk', `🎰 [GALE] Detectada mudança/falta de payout. Usando Fallback para ${targetContractType} (${targetBarrier ?? ''}): ${currentPayout}`);
                    }
                }
            }

            if (!currentPayout || currentPayout <= 0 || isNaN(currentPayout)) {
                const errorMsg = `❌ Payout real ou fallback não disponível: ${currentPayout}`;
                console.error(errorMsg);
                // Fallback de emergência (Gale 2.0x) para não travar
                currentPayout = 2.0;
                logConfig.warn('trade_risk', `🎰 [EMERGENCY] Usando payout de emergência 2.0x`);
            }
            let totalLosses = this.accumulatedLosses;
          
            // Se já há Gale ativo (lastRealGaleValue > 0), NÃO remover (é perda em sequência)
            const lastGaleVal = this.lastRealGaleValue || 0;
            const isNoGalePrevious = lastGaleVal < 0.01;

            if (this.config.galeRemovesSoros && isNoGalePrevious) {
                const baseStake = this.config.stake || 0.35;
             
                // Se accumulatedLosses > baseStake (com margem), tinha Soros
                const tolerance = baseStake * 0.05; // 5% de tolerância
                if (totalLosses > (baseStake + tolerance)) {
                    // A stake perdida tinha Soros! Remover o acréscimo
                    const sorosProfit = totalLosses - baseStake;

                    // Usar apenas stake base para cálculo do Gale
                    totalLosses = baseStake;
                 
                    this.accumulatedLosses = baseStake;

                 
                } 
            } else if (this.config.galeRemovesSoros && this.lastRealGaleValue > 0) {
             
            }

            // 🎰 NOVA FÓRMULA: (Perdas / (Payout-1)) × Ajuste
            console.log(`Total Losses: ${totalLosses}, Payout: ${currentPayout}, Ajuste: ${galeAdjustment}`);
            let stakeGaleCalculated = (totalLosses / (currentPayout - 1)) * galeAdjustment;
        
            // O Split deve vir EXCLUSIVAMENTE da configuração atual (this.config.galeSplit)
            let galeSplit = parseInt(this.config.galeSplit) || 1;
            const splitThreshold = parseFloat(this.config.galeSplitThreshold) || 0; 
            if (this.pendingSplitWins === 0 && totalLosses < splitThreshold) {
                logConfig.info('trade_risk', `Checking Split: Total Losses ($${totalLosses.toFixed(2)}) < Threshold ($${splitThreshold.toFixed(2)}). Mantendo Gale Padrão (Sem divisão).`);
                galeSplit = 1;
            } else if (this.pendingSplitWins > 0) {
                logConfig.info('trade_risk', `Checking Split: Sequência ativa (${this.pendingSplitWins} pendentes). Mantendo divisão.`);
            } else if (totalLosses >= splitThreshold && galeSplit > 1) {
                logConfig.info('trade_risk', `Checking Split: Total Losses ($${totalLosses.toFixed(2)}) >= Threshold ($${splitThreshold.toFixed(2)}). split ativado (÷${galeSplit}).`);
            }


            if (galeSplit > 1) {
              
                // Se pendingSplitWins > 0, significa que já dividimos e estamos aguardando vitórias
                if (this.pendingSplitWins > 0 && this.lastCalculatedStakeSplitted) {
                    // Manter a stake dividida para o próximo trade
                    logConfig.info('trade_risk', `🎰 [SPLIT GALE] Mantendo stake dividida (${this.pendingSplitWins} wins restantes): ${this.lastCalculatedStakeSplitted}`);
                    return parseFloat(this.lastCalculatedStakeSplitted.toFixed(2));
                }
                console.log("stakeGaleCalculated dentro if ", stakeGaleCalculated);
                console.log("galeSplit dentro if ", galeSplit);
                // Caso 2: Nova perda ou início da sequência -> Recalcular e Dividir
                stakeGaleCalculated = stakeGaleCalculated / galeSplit;

                // Atualizar estado - RESETAR para exigir vitórias consecutivas
                this.pendingSplitWins = galeSplit;

                // 📝 LOG SPLIT START
                logConfig.warn('trade_risk', `🎰 [SPLIT GALE INICIADO] Perda detectada! Dividindo Gale por ${galeSplit}.`);
                logConfig.warn('trade_risk', `🎰 [SPLIT GALE META] Necessário ${galeSplit} vitórias consecutivas para zerar.`);

                this.lastCalculatedStakeSplitted = Math.max(stakeGaleCalculated, 0.35);

                logConfig.warn('trade_risk', `🎰 [SPLIT GALE] Valor dividido por ${galeSplit}. Wins necessários: ${galeSplit}`);
            }
            console.log("stakeGaleCalculated fora if ", stakeGaleCalculated);
            console.log("galeSplit fora if ", galeSplit);
            this.lastRealGaleValue = stakeGaleCalculated;
        
            // Se for split, já dividimos acima.
            const finalStake = parseFloat(Math.max(stakeGaleCalculated, 0.35).toFixed(2));

            // Atualizar lastCalculatedStakeSplitted com o final (caso tenha batido no minimo)
            if (galeSplit > 1) {
                this.lastCalculatedStakeSplitted = finalStake;
            }

            // 🎰 LOG ÚNICO E DETALHADO DO CÁLCULO COMPLETO DE GALE
            logConfig.warn('trade_risk', `🎰 [CÁLCULO GALE DETALHADO] ============================================`);
            logConfig.warn('trade_risk', `🎰 Motivo: ${this.realLossesStreak} perda(s) real(is) consecutiva(s) detectada(s)`);
            logConfig.warn('trade_risk', `🎰 Perdas Acumuladas: $${totalLosses.toFixed(4)}`);
            logConfig.warn('trade_risk', `🎰 Fator Split: ${galeSplit}x (Wins pendentes: ${this.pendingSplitWins})`);
            logConfig.warn('trade_risk', `🎰 Cálculo Base: ($${totalLosses.toFixed(4)} / (${currentPayout.toFixed(4)}-1)) × ${galeAdjustment}`);
            if (galeSplit > 1) logConfig.warn('trade_risk', `🎰 Cálculo Split: Base / ${galeSplit} = $${stakeGaleCalculated.toFixed(4)}`);
            logConfig.warn('trade_risk', `🎰 Valor Final: $${finalStake} (Min $0.35) | Payout: ${currentPayout.toFixed(3)} ${usingFallback ? '(Fallback)' : '(Real)'}`);
            logConfig.warn('trade_risk', `🎰 ================================================================`);

            return finalStake;

        } catch (error) {
            console.error('❌ Erro no cálculo de Gale:', error);
            throw error;
        } finally {
            // 🔒 SEMPRE LIMPAR FLAG DE CÁLCULO
            this.isCalculatingGale = false;
        }
    }

    // 🎰 Obter valor real da stake usada
    getActualStakeUsed(contract = null) {
        try {
            // 🎯 CRÍTICO: SEMPRE priorizar buy_price do contrato (especialmente em modo BOTH)
            if (contract && contract.buy_price !== undefined && contract.buy_price !== null) {
                const buyPrice = parseFloat(contract.buy_price);
                if (!isNaN(buyPrice) && buyPrice > 0) {

                    logConfig.debug('trade_risk', `🎰 Usando buy_price: ${buyPrice}`);
                    return buyPrice;
                }
            }
         
            // 🎰 CORREÇÃO: Usar apenas accumulatedLosses (realLossesStreak reseta nas transições)
            if (this.accumulatedLosses === 0) {
                const baseStake = this.config.stake || 0.35;
                logConfig.debug('trade_risk', `🎮 Sem perdas acumuladas - stake base: ${baseStake}`);
                return baseStake;
            }

            if (this.config.galeActive && this.accumulatedLosses > 0) {
                if (!this.currentProposalPayout || this.currentProposalPayout <= 0) {
                    logConfig.debug('trade_risk', `🎰 Payout não disponível - stake base`);
                    return this.config.stake || 0.35;
                }

                const currentStake = this.calculateGaleStake();
                logConfig.debug('trade_risk', `🎰 Stake Gale: ${currentStake}`);
                return currentStake;
            }

            const fallbackStake = this.config.stake || 0.35;
            logConfig.debug('trade_risk', `🎰 Stake base: ${fallbackStake}`);
            return fallbackStake;

        } catch (error) {
            if (this.currentMode === 'SIMULACAO') {
                const currentValue = this.lastCalculatedStake || this.config.stake || 0.35;
                logConfig.debug('trade_risk', `🎮 Simulação - mantendo valor: ${currentValue}`);
                return currentValue;
            } else {
                logConfig.warn('trade_risk', `⚠️ Erro Gale, usando stake base`);
                return this.config.stake || 0.35;
            }
        }
    }

    // 🔄 Processar resultado do trade
    handleTradeResult(resultData) {
        const { mode, result, simulated } = resultData;

        logConfig.info('trade_risk', `📊 Processando resultado: ${result} (modo: ${mode}, simulado: ${simulated})`);

        if (simulated) {
            this.handleSimulatedResult(result);
        } else {
            this.handleRealResult(result);
        }

        // Verificar mudanças de modo
        this.processModeChanges(mode, result, simulated);
    }

    // 🎮 Processar resultado simulado
    handleSimulatedResult(result) {
        if (result === 'WIN') {
            this.simulatedWinsStreak++;
            this.simulatedLossesStreak = 0;
            logConfig.info('trade_risk', `🎮 Vitória simulada - streak: ${this.simulatedWinsStreak}`);
        } else if (result === 'LOSS') {
            this.simulatedLossesStreak++;
            this.simulatedWinsStreak = 0;
            logConfig.info('trade_risk', `🎮 Perda simulada - streak: ${this.simulatedLossesStreak}`);
        }
    }

    // 💰 Processar resultado real
    handleRealResult(result, contractId = null, tradeStake = null) {
        // 🛡️ IDEMPOTÊNCIA: Evitar processar o mesmo contrato múltiplas vezes
        if (contractId) {
            if (!this.processedContractIds) {
                this.processedContractIds = new Set();
            }
            if (this.processedContractIds.has(contractId)) {
                logConfig.warn('trade_risk', `⚠️ [DUPLICIDADE] Contrato ${contractId} já processado. Ignorando chamada duplicada.`);
                return;
            }
            this.processedContractIds.add(contractId);

            // Limpeza periódica do Set para evitar vazamento de memória
            if (this.processedContractIds.size > 100) {
                this.processedContractIds.clear(); // Limpeza agressiva simples
            }
        } else {
            // 🛡️ DEBOUNCE: Se não tem ID, usar tempo para evitar duplicação rápida (<500ms)
            const now = Date.now();
            if (this.lastRealResultTime && (now - this.lastRealResultTime < 500)) {
                logConfig.warn('trade_risk', `⚠️ [DEBOUNCE] Resultado duplicado detectado por tempo (<500ms). Ignorando.`);
                return;
            }
            this.lastRealResultTime = now;
        }

        const baseStake = this.config.stake || 0.35;
        // 🎯 VALIDAR STAKE: Se não informado, tentar inferir (arriscado, mas fallback)
        const currentTradeStake = tradeStake !== null ? parseFloat(tradeStake) : baseStake;
     
        let isGaleTrade = currentTradeStake > (baseStake * 1.05);
        if (this.pendingSplitWins > 0) {
            isGaleTrade = true;
        }

        if (result === 'WIN') {
            this.lastRealTradeWasLoss = false; // 🎯 FIX: Marcar como Vitória Real
            this.realWinsStreak++;
            this.realLossesStreak = 0;

            // ✅ ÚNICO LOCAL QUE RESETA GALE: após vitória REAL
            const hadGaleActive = this.accumulatedLosses > 0 || this.lastRealGaleValue > 0;

            // 🎯 LÓGICA SPLIT GALE RESET
            if (this.pendingSplitWins > 0) {
             
                if (isGaleTrade) {
                    this.pendingSplitWins--;

                    // 📝 LOG SPLIT PROGRESS
                    const winsCompleted = (this.config.galeSplit || 1) - this.pendingSplitWins;
                    const totalNeeded = this.config.galeSplit || 1;
                    logConfig.warn('trade_risk', `🎰 [SPLIT GALE PROGRESSO] Vitória ${winsCompleted}/${totalNeeded} confirmada com Gale ($${currentTradeStake})!`);
                    logConfig.info('trade_risk', `🎰 [SPLIT GALE STATUS] Restam ${this.pendingSplitWins} vitórias de recuperação para resetar.`);

                    if (this.pendingSplitWins <= 0) {
                        // Sequência completa -> Resetar
                        this.accumulatedLosses = 0;
                        this.lastRealGaleValue = 0;
                        this.pendingSplitWins = 0;
                        this.lastRealTradeWasLoss = false; // 🎯 FIX: Reset completo
                        this.lastCalculatedStakeSplitted = null; // Limpar stake dividida salva
                        this.splitGaleJustCompleted = true; 
                        logConfig.warn('trade_risk', `🎰 [SPLIT GALE CONCLUÍDO] Sequência de ${totalNeeded} vitórias atingida! Sistema Gale resetado com sucesso.`);
                        logConfig.warn('trade_risk', `📈 [SOROS BLOCK] Vitória de recuperação final NÃO contará para Soros. Próximo win iniciará contagem.`);
                    } else {
                        // Ainda pendente -> NÃO resetar accumulatedLosses
                        logConfig.warn('trade_risk', `🎰 [SPLIT GALE PENDENTE] Mantendo stake de recuperação na próxima entrada.`);
                    }
                } else {
                    logConfig.info('trade_risk', `🎰 [SPLIT GALE IGNORADO] Vitória com stake base ($${currentTradeStake}) não afeta contagem de recuperação.`);
                }
            } else {
              
                this.accumulatedLosses = 0;
                this.lastRealGaleValue = 0;
                this.pendingSplitWins = 0;
                this.lastRealTradeWasLoss = false; // 🎯 FIX: Reset completo

                logConfig.info('trade_risk', `💰 Vitória REAL - streak: ${this.realWinsStreak}`);
                if (hadGaleActive) {
                    logConfig.warn('trade_risk', `🎰 [GALE RESETADO] Sistema Gale zerado após WIN`);
                }
            }
        } else if (result === 'LOSS') {
            this.lastRealTradeWasLoss = true; // 🎯 FIX: Marcar como Perda Real
            this.realLossesStreak++;
            this.realWinsStreak = 0;
            this.splitGaleJustCompleted = false; 
            const lossAmount = tradeStake !== null ? parseFloat(tradeStake) : (this.lastRealGaleValue > 0 ? this.lastRealGaleValue : baseStake);
            this.accumulatedLosses += lossAmount;

            logConfig.info('trade_risk', `💰 Perda REAL - streak: ${this.realLossesStreak}`);
            logConfig.info('trade_risk', `  - Valor da perda: ${lossAmount.toFixed(4)}`);
            logConfig.info('trade_risk', `  - Perdas acumuladas: ${this.accumulatedLosses.toFixed(4)}`);

            // 🎰 LOG DETALHADO: Mostrar se Gale será acionado no próximo trade
            if (this.config.galeActive && this.accumulatedLosses > 0) {
                logConfig.warn('trade_risk', `🎰 [GALE SERÁ ACIONADO] Próximo trade usará Gale com total acumulado de $${this.accumulatedLosses.toFixed(4)}`);
            }

            // 🎯 LÓGICA SPLIT GALE: Perda durante o ciclo
            const galeSplit = this.config.galeSplit || 1;
            const splitThreshold = parseFloat(this.config.galeSplitThreshold) || 0;

            // Se threshold = 0, ativar split imediatamente (comportamento padrão)
            const shouldActivateSplit = galeSplit > 1 && (splitThreshold === 0 || this.accumulatedLosses >= splitThreshold);

            if (shouldActivateSplit) {
                logConfig.warn('trade_risk', `🎰 [SPLIT GALE] Perda detectada! (Split Config: ${galeSplit}, Threshold: $${splitThreshold}, Accumulated: $${this.accumulatedLosses.toFixed(2)})`);

                // Resetar contagem para exigir novamente N vitórias seguidas
                this.pendingSplitWins = galeSplit;

                if (this.currentProposalPayout && this.currentProposalPayout > 1) {
                    const totalLosses = this.accumulatedLosses;
                    const galeAdjustment = this.config.galeAdjustment || 1;
                    const estimatedFullStake = (totalLosses / (this.currentProposalPayout - 1)) * galeAdjustment;

                    const splittedStake = estimatedFullStake / galeSplit;
                    this.lastCalculatedStakeSplitted = Math.max(splittedStake, 0.35); 

                    logConfig.warn('trade_risk', `🎰 [SPLIT PRE-CALC] Próxima stake já definida para $${this.lastCalculatedStakeSplitted.toFixed(2)} (Full: $${estimatedFullStake.toFixed(2)} / ${galeSplit})`);
                } else {
                    // Forçar recálculo na próxima (fallback se não tiver payout agora)
                    this.lastCalculatedStakeSplitted = null;
                }
            } else if (galeSplit > 1 && splitThreshold > 0) {
                logConfig.info('trade_risk', `🎰 [SPLIT GALE AGUARDANDO] Threshold: $${splitThreshold.toFixed(2)}, Accumulated: $${this.accumulatedLosses.toFixed(2)}. Aguardando threshold para ativar split.`);
            }
        }
    }

    // 🔄 Processar mudanças de modo
    processModeChanges(currentMode, result, simulated) {
        const winsReais = this.realWinsStreak;
        const perdasReais = this.realLossesStreak;
        const perdasSimuladas = this.simulatedLossesStreak;
        const winsSimulados = this.simulatedWinsStreak;

        const limiteWinsReais = this.config.realWinsLimit || 0;
        const limitePerdasReais = this.config.realLossesLimit || 0;
        const limitePerdasSimuladas = this.config.simulatedLossesLimit || 0;
        const limiteWinsSimulados = this.config.simulatedWinsLimit || 0;

        logConfig.info('trade_risk', `🔍 Analisando mudanças de modo:`);
        logConfig.info('trade_risk', `  - Wins reais: ${winsReais}/${limiteWinsReais}`);
        logConfig.info('trade_risk', `  - Perdas reais: ${perdasReais}/${limitePerdasReais}`);
        logConfig.info('trade_risk', `  - Perdas simuladas: ${perdasSimuladas}/${limitePerdasSimuladas}`);
        logConfig.info('trade_risk', `  - Wins simulados: ${winsSimulados}/${limiteWinsSimulados}`);

        // PARAR MONITORAMENTO quando perdas/vitórias simuladas = 0 (desabilitado)
        const simulacaoDesabilitada = limiteWinsSimulados === 0 && limitePerdasSimuladas === 0;

        // REAL → PARAR (após perdas reais quando simulação desabilitada)
        if (!simulated && perdasReais >= limitePerdasReais && limitePerdasReais > 0 && simulacaoDesabilitada) {
            logConfig.info('trade_risk', `🛑 PARAR: ${perdasReais} perdas reais atingidas (simulação desabilitada)`);

            // ✅ CORREÇÃO: Parar monitoramento IMEDIATAMENTE via MonitoringView
            if (typeof MonitoringView !== 'undefined' && MonitoringView.stopMonitoring) {
                MonitoringView.stopMonitoring();
            }

            // Mostrar popup após pequeno delay
            setTimeout(() => {
                this.stopMonitoring('losses', perdasReais, limitePerdasReais);
            }, 100);
            return;
        }

        // REAL → PARAR (após wins reais quando simulação desabilitada)  
        if (!simulated && winsReais >= limiteWinsReais && limiteWinsReais > 0 && simulacaoDesabilitada) {
            logConfig.info('trade_risk', `🛑 PARAR: ${winsReais} wins reais atingidos (simulação desabilitada)`);

            // ✅ CORREÇÃO: Parar monitoramento IMEDIATAMENTE via MonitoringView
            if (typeof MonitoringView !== 'undefined' && MonitoringView.stopMonitoring) {
                MonitoringView.stopMonitoring();
            }

            // Mostrar popup após pequeno delay
            setTimeout(() => {
                this.stopMonitoring('wins', winsReais, limiteWinsReais);
            }, 100);
            return;
        }

        // REAL → SIMULACAO (após perdas reais quando simulação habilitada)
        if (!simulated && perdasReais >= limitePerdasReais && limitePerdasReais > 0 && !simulacaoDesabilitada) {
            logConfig.info('trade_risk', `🔄 Mudança: REAL → SIMULACAO (perdas reais atingidas)`);
            this.switchMode('SIMULACAO', 'Perdas reais atingidas');
            return;
        }

        // REAL → SIMULACAO (após wins reais quando simulação habilitada)
        if (!simulated && winsReais >= limiteWinsReais && limiteWinsReais > 0 && !simulacaoDesabilitada) {
            logConfig.info('trade_risk', `🔄 Mudança: REAL → SIMULACAO (wins reais atingidos)`);
            this.switchMode('SIMULACAO', 'Wins reais atingidos');
            return;
        }

        // SIMULACAO → REAL (após wins simulados)
        if (simulated && winsSimulados >= limiteWinsSimulados && limiteWinsSimulados > 0) {
            const realMode = this.getRealLabel();
            logConfig.info('trade_risk', `🔄 Mudança: SIMULACAO → ${realMode} (wins simulados atingidos)`);
            this.switchMode(realMode, 'Wins simulados atingidos');
            return;
        }

        // SIMULACAO → REAL (após perdas simuladas)
        if (simulated && perdasSimuladas >= limitePerdasSimuladas && limitePerdasSimuladas > 0) {
            const realMode = this.getRealLabel();
            logConfig.info('trade_risk', `🔄 Mudança: SIMULACAO → ${realMode} (perdas simuladas atingidas)`);
            this.switchMode(realMode, 'Perdas simuladas atingidas');
            return;
        }
    }

    // 🛑 NOVO: Parar monitoramento
    stopMonitoring(type, currentValue, limitValue) {
        if (typeof StopMonitor !== 'undefined') {
            StopMonitor.showStopTradePopup(type, currentValue, limitValue);
        }
    }

    // 🔄 Trocar modo
    switchMode(newMode, reason) {
        if (this.currentMode === newMode) {
            logConfig.debug('trade_risk', `⚠️ Modo já é ${newMode}, ignorando`);
            return;
        }

        const oldMode = this.currentMode;
        this.currentMode = newMode;

        logConfig.info('trade_risk', `🔄 Modo alterado: ${oldMode} → ${newMode}`);
        logConfig.info('trade_risk', `  - Razão: ${reason}`);
      
        // Reset de contadores de streak SEM tocar em Gale
        if (oldMode !== 'SIMULACAO' && newMode === 'SIMULACAO') {
            // REAL/VIRTUAL → SIMULAÇÃO: Resetar contadores de streak reais (WIN/LOSS)
            logConfig.info('trade_risk', `🔄 Resetando contadores de streak reais (${this.realWinsStreak}W, ${this.realLossesStreak}L → 0W, 0L)`);
            logConfig.warn('trade_risk', `🎰 [GALE PRESERVADO] accumulatedLosses=${this.accumulatedLosses.toFixed(4)}, lastRealGaleValue=${this.lastRealGaleValue.toFixed(4)} mantidos`);
            this.realWinsStreak = 0;
            this.realLossesStreak = 0;
            // ✅ NÃO resetar accumulatedLosses, lastRealGaleValue - serão resetados apenas em WIN
        } else if (oldMode === 'SIMULACAO' && newMode !== 'SIMULACAO') {
            // SIMULAÇÃO → REAL/VIRTUAL: Resetar contadores simulados
            logConfig.info('trade_risk', `🔄 Resetando contadores simulados (${this.simulatedWinsStreak}W, ${this.simulatedLossesStreak}L → 0W, 0L)`);
            this.simulatedWinsStreak = 0;
            this.simulatedLossesStreak = 0;
            // ✅ Gale permanece intacto para continuar após retorno ao modo real
        }

        // Disparar callback
        if (this.onModeChange) {
            this.onModeChange(this.currentMode, reason);
        }

        // Disparar evento global
        window.dispatchEvent(new CustomEvent('modeChanged', {
            detail: { mode: this.currentMode, reason }
        }));
    }

    // 🔄 Forçar modo
    setMode(mode) {
        if (['SIMULACAO', 'REAL', 'VIRTUAL'].includes(mode)) {
            this.currentMode = mode;
            logConfig.info('trade_risk', `🔄 Modo definido manualmente: ${mode}`);

            if (this.onModeChange) {
                this.onModeChange(this.currentMode, 'Alteração manual');
            }
        }
    }

    // 🔍 Obter label do modo real
    getRealLabel() {
        const userData = SessionManager.getUserData();
        if (userData && userData.authorize) {
            const realMode = userData.authorize.is_virtual ? 'VIRTUAL' : 'REAL';
            return realMode;
        }

        const currentUser = SessionManager.getCurrentUser();
        if (currentUser && currentUser.authorize) {
            const realMode = currentUser.authorize.is_virtual ? 'VIRTUAL' : 'REAL';
            return realMode;
        }

        logConfig.warn('trade_risk', '⚠️ Não foi possível detectar tipo de conta, assumindo VIRTUAL');
        return 'VIRTUAL';
    }

    // 🔍 Verificar se simulação está habilitada
    isSimulationEnabled() {
        const enabled = (this.config.simulatedWinsLimit > 0 || this.config.simulatedLossesLimit > 0);
        logConfig.debug('trade_risk', `🔍 Simulação habilitada: ${enabled}`);
        return enabled;
    }

    // 🎯 Computar modo inicial
    computeStartMode() {
        const winsSimulados = this.config.simulatedWinsLimit || 0;
        const lossesSimulados = this.config.simulatedLossesLimit || 0;
        const realLabel = this.getRealLabel();

        let startMode;

        if (winsSimulados === 0 && lossesSimulados === 0) {
            startMode = realLabel;
            logConfig.info('trade_risk', `🎯 Modo inicial: ${startMode} (simulação desabilitada)`);
        } else if (winsSimulados > 0 || lossesSimulados > 0) {
            startMode = 'SIMULACAO';
            logConfig.info('trade_risk', `🎯 Modo inicial: ${startMode} (simulação habilitada)`);
        } else {
            startMode = realLabel;
            logConfig.info('trade_risk', `🎯 Modo inicial: ${startMode} (fallback)`);
        }

        this.currentMode = startMode;
        return startMode;
    }

    // 🎯 Resetar contadores no início do monitoramento
    resetCountersForMonitoring() {
        this.realWinsStreak = 0;
        this.realLossesStreak = 0;
        this.simulatedWinsStreak = 0;
        this.simulatedLossesStreak = 0;
        this.accumulatedLosses = 0;
        this.pendingGaleApplication = false;
        this.lastCalculatedStakeSplitted = null;
        this.pendingSplitWins = 0;
        this.lastCalculatedStake = null;
        this.currentProposalPayout = null;
        this.popupShown = false;

        // Definir saldo inicial
        const currentUser = SessionManager.getCurrentUser();
        if (currentUser?.balance) {
            this.initialBalance = parseFloat(currentUser.balance.balance) || 0;
            logConfig.info('trade_risk', `💰 Saldo inicial: $${this.initialBalance.toFixed(2)}`);
        } else {
            this.initialBalance = 0;
        }

        logConfig.info('trade_risk', `🔄 Contadores resetados`);
    }

    // 🎯 Atualizar lucro/perda da sessão
    updateSessionProfitLoss(profit) {
        this.sessionProfitLoss += profit;
        logConfig.info('trade_risk', `💰 P&L da sessão: $${this.sessionProfitLoss.toFixed(2)}`);
    }

    // 🎯 Verificar meta de lucro e stop loss
    checkProfitLossLimits() {
        if (this.popupShown) {
            return;
        }

        if (this.config.goal > 0 && this.sessionProfitLoss >= this.config.goal) {
            logConfig.info('trade_risk', `✅ Meta de lucro atingida: $${this.sessionProfitLoss.toFixed(2)}`);
            return { type: 'goal', value: this.sessionProfitLoss };
        }

        if (this.config.stopLoss > 0 && this.sessionProfitLoss <= -this.config.stopLoss) {
            logConfig.info('trade_risk', `❌ Stop loss atingido: $${this.sessionProfitLoss.toFixed(2)}`);
            return { type: 'stop', value: Math.abs(this.sessionProfitLoss) };
        }

        return null;
    }

    // 🎯 Atualizar configuração dinamicamente
    updateConfig(newConfig) {
        this.config = newConfig;
        logConfig.info('trade_risk', `⚙️ Configuração de Risco atualizada. Threshold: $${this.config.galeSplitThreshold}`);
    }

    // 🎯 Resetar contadores gerais
    resetCounters() {
        this.realWinsStreak = 0;
        this.realLossesStreak = 0;
        this.simulatedLossesStreak = 0;
        this.simulatedWinsStreak = 0;

        // 🧹 LIMPEZA COMPLETA DE ESTADO DO GALE (Evita "Zombie Splits")
        this.pendingSplitWins = 0;
        this.accumulatedLosses = 0;
        this.lastCalculatedStakeSplitted = null;
        this.lastRealTradeWasLoss = false;

        logConfig.info('trade_risk', '🔄 Contadores e Estado Gale resetados');
    }

    // 🎯 Obter estado atual
    getState() {
        return {
            currentMode: this.currentMode,
            realWinsStreak: this.realWinsStreak,
            realLossesStreak: this.realLossesStreak,
            simulatedWinsStreak: this.simulatedWinsStreak,
            simulatedLossesStreak: this.simulatedLossesStreak,
            accumulatedLosses: this.accumulatedLosses,
            sessionProfitLoss: this.sessionProfitLoss,
            tradeReal: this.tradeReal
        };
    }
}

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.TradeModeRiskController = TradeModeRiskController;
}