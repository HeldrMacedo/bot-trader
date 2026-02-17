// js/cooldown-overlay.js
// Sistema de Cooldown e Overlay - Módulo independente
// TODO O SISTEMA DEVE SER 100% ISOLADO POR USUARIO, SEM INTERFERENCIA ENTRE SESSÕES

// 🔧 CRÍTICO: Definir função global IMEDIATAMENTE para evitar erros de carregamento
window.getCooldownOverlayInstance = function() {
    return CooldownOverlay;
};

class CooldownOverlay {
    // 🔄 PROPRIEDADES ESTÁTICAS DO COOLDOWN
    static cooldownActive = false;
    static cooldownTicksRemaining = 0;
    static cooldownTicksTotal = 3;
    static cooldownUnsubscribe = null;

    // 👑 NOVA PROPRIEDADE CRÍTICA: Proteção imediata do cooldown
    static cooldownProtected = false; // Proteção ativa desde que regras são atendidas
    static protectionStarted = null; // Timestamp de quando proteção iniciou

    // ✅ NOVO: Proteção contra múltiplas ativações
    static protectionLock = false;

    // ✅ NOVO: Flag para controle de inicialização
    static cooldownInitialized = false;

    // 🔧 NOVO: Propriedades para cooldown dinâmico
    static cooldownType = 'TICKS_ONLY'; // Pode ser 'TICKS_ONLY' ou 'TICKS_PLUS_TIME'
    static cooldownTimeRemaining = 0;
    static cooldownTotalTime = 0;

    // 🚨 NOVO: Timer de backup para cooldown independente do WebSocket
    static backupTimerInterval = null;

    // ⏰ Sistema de timer baseado apenas no cálculo inicial
    static averageTickInterval = null; // Será calculado apenas no início do sistema

    // 🚫 PROTEÇÃO ANTI-REENTRADA: Flag para evitar processamento simultâneo de ticks
    static _isProcessingTick = false;

    // ✅ NOVA FUNÇÃO: Calcular duração do cooldown baseada na configuração
    static calculateCooldownDuration(config) {

        if (!config || !config.duration || !config.durationUnit) {
        
            return 3; // Fallback para apenas os 3 ticks extras
        }

        let durationInTicks = 0;
        const baseDuration = parseInt(config.duration) || 1;


        switch (config.durationUnit) {
            case 't': // Ticks
                durationInTicks = baseDuration;

                break;
            case 's': // Segundos (aproximadamente 1 tick por segundo)
                durationInTicks = baseDuration;

                break;
            case 'm': // Minutos
                durationInTicks = baseDuration * 60;

                break;
            case 'h': // Horas
                durationInTicks = baseDuration * 3600;

                break;
            default:
              
                durationInTicks = baseDuration;
        }

        // 🎯 CORREÇÃO: Obter período de cooldown configurado pelo usuário
        const tradeManager = getTradeManagerInstance();
        const cooldownPeriod = tradeManager?.config?.cooldownPeriod;
        
        // Se cooldownPeriod for 0, usar APENAS a duração natural do contrato
        if (cooldownPeriod === 0) {
         
            return durationInTicks;
        }

        // Caso contrário, aplicar fórmula normal: Duração + período configurado
        const finalCooldownPeriod = cooldownPeriod || 3; // Fallback para 3 se undefined
        const totalCooldownTicks = durationInTicks + finalCooldownPeriod;

        return totalCooldownTicks;
    }

    // ⏰ OBTER intervalo calculado no início do sistema
    static getDynamicInterval() {
        // 🔧 CORREÇÃO: Buscar em múltiplas fontes o intervalo calculado
        let calculatedInterval = null;

        // 1️⃣ PRIORIDADE 1: Valor já definido no CooldownOverlay
        if (CooldownOverlay.averageTickInterval && CooldownOverlay.averageTickInterval > 0) {
            calculatedInterval = CooldownOverlay.averageTickInterval;

            return calculatedInterval;
        }

        // 2️⃣ PRIORIDADE 2: Obter do MarketData
        try {
            const marketData = getMarketDataInstance(SessionManager.getLocalToken());
            if (marketData && marketData.averageTickInterval && marketData.averageTickInterval > 0) {
                calculatedInterval = marketData.averageTickInterval;
                // Definir também no CooldownOverlay para próximas chamadas
                CooldownOverlay.averageTickInterval = calculatedInterval;

                return calculatedInterval;
            }
        } catch (error) {
          
        }

        // 3️⃣ PRIORIDADE 3: Buscar em instâncias globais
        try {
            // Buscar em window.globalMarketDataInstance
            if (window.globalMarketDataInstance && window.globalMarketDataInstance.averageTickInterval > 0) {
                calculatedInterval = window.globalMarketDataInstance.averageTickInterval;
                CooldownOverlay.averageTickInterval = calculatedInterval;

                return calculatedInterval;
            }

            // Buscar em window.displayViewInstance
            if (window.displayViewInstance?.marketData?.averageTickInterval > 0) {
                calculatedInterval = window.displayViewInstance.marketData.averageTickInterval;
                CooldownOverlay.averageTickInterval = calculatedInterval;

                return calculatedInterval;
            }
        } catch (error) {
          
        }

     
        return 1000;
    }

    // 🔧 NOVA FUNÇÃO: Sincronizar intervalo calculado do sistema
    static syncCalculatedInterval() {
        try {
            // Tentar obter intervalo mais recente
            const marketData = getMarketDataInstance(SessionManager.getLocalToken());
            if (marketData && marketData.averageTickInterval && marketData.averageTickInterval > 0) {
                const newInterval = marketData.averageTickInterval;
                if (newInterval !== CooldownOverlay.averageTickInterval) {

                    CooldownOverlay.averageTickInterval = newInterval;
                }
                return newInterval;
            }
        } catch (error) {
            console.warn('⚠️ [INTERVAL SYNC] Erro na sincronização:', error);
        }

        return CooldownOverlay.averageTickInterval || 1000;
    }

    // ✅ NOVA FUNÇÃO: Inicializar processo de cooldown quando COOLDOWN=TRUE é detectado
    static initializeCooldownProcess() {

        // Calcular duração baseada na configuração atual
        const tradeManager = getTradeManagerInstance();
        if (tradeManager) {
            const config = tradeManager.getConfiguration();
            CooldownOverlay.cooldownTicksTotal = CooldownOverlay.calculateCooldownDuration(config);
        } else {
            CooldownOverlay.cooldownTicksTotal = 3; // Fallback mínimo
        }

        CooldownOverlay.cooldownTicksRemaining = CooldownOverlay.cooldownTicksTotal;

        // Criar overlay visual
        CooldownOverlay.createCooldownOverlay();

        // Ativar modo buffer no sistema de mensagens
        try {
            const messagesManager = getTradeMessagesInstance();
            if (messagesManager) {
                messagesManager.activateCooldownMode();
            }
        } catch (error) {
            console.warn('⚠️ [COOLDOWN INIT] Erro ao ativar buffer de mensagens:', error);
        }

    }

    // ✅ FUNÇÃO DE INTERFACE: Processar tick do cooldown
    static processCooldownTick() {
        // 🚫 PROTEÇÃO ANTI-REENTRADA: Evitar processamento simultâneo
        if (CooldownOverlay._isProcessingTick) {
            console.warn('⚠️ [COOLDOWN TICK] Tentativa de processamento simultâneo bloqueada');
            return { finished: false, ticksRemaining: CooldownOverlay.cooldownTicksRemaining };
        }

        // 🔒 MARCAR como processando
        CooldownOverlay._isProcessingTick = true;

        try {
            if (CooldownOverlay.cooldownActive && CooldownOverlay.cooldownTicksRemaining > 0) {

                CooldownOverlay.cooldownTicksRemaining--;

                // Atualizar progresso visual
                CooldownOverlay.updateCooldownProgress();

                return { finished: CooldownOverlay.cooldownTicksRemaining <= 0, ticksRemaining: CooldownOverlay.cooldownTicksRemaining };
            }

            return { finished: true, ticksRemaining: 0 };

        } finally {
            // 🔓 SEMPRE liberar flag de processamento
            CooldownOverlay._isProcessingTick = false;
        }
    }

    // 🔄 NOVO: Parar cooldown
    static async endCooldown() {

        // 🚨 CRÍTICO: Parar o timer PRIMEIRO
        if (CooldownOverlay.backupTimerInterval) {

            clearInterval(CooldownOverlay.backupTimerInterval);
            CooldownOverlay.backupTimerInterval = null;

        }

        // Resetar todas as flags
        CooldownOverlay.cooldownActive = false;
        CooldownOverlay.cooldownTicksRemaining = 0;
        CooldownOverlay.cooldownProtected = false; // 👑 LIMPAR proteção
        CooldownOverlay.protectionStarted = null;
        CooldownOverlay.protectionLock = false; // ✅ LIMPAR lock de proteção
        CooldownOverlay.cooldownInitialized = false; // Reset completo

        // 🔧 CRÍTICO: SEMPRE processar mensagens em buffer - trade foi executado durante cooldown
        try {
            const messagesManager = getTradeMessagesInstance();
            if (messagesManager) {
                // Forçar processamento do buffer mesmo se estado não estiver correto
                const bufferStats = messagesManager.getBufferStats();

                messagesManager.deactivateCooldownMode();

            } else {
                console.warn('🏁 [COOLDOWN END] MessagesManager não encontrado');
            }
        } catch (error) {
            console.error('❌ [COOLDOWN END] Erro ao processar buffer de mensagens:', error);
        }

        // 🔓 DESBLOQUEAR previsão dinâmica para próximo ciclo
        try {
            const tradeManager = getTradeManagerInstance();
            if (tradeManager && tradeManager.predictionLocked) {
                tradeManager.predictionLocked = false;
            }
        } catch (error) {
            console.error('❌ Erro ao desbloquear previsão:', error);
        }

        // 🔧 VERIFICAR: Se há parada pendente (mas SEMPRE finalizar trade primeiro)
        const isPendingStop = (typeof MonitoringView !== 'undefined' && MonitoringView.pendingStop === true);

        // 🎯 CRÍTICO: Disparar evento global ANTES de aplicar atualizações
        window.dispatchEvent(new CustomEvent('cooldownEnded', {
            detail: { 
                timestamp: Date.now(),
                reason: 'Cooldown finalizado'
            }
        }));

        // 🔄 Aplicar atualizações visuais (SEMPRE, mesmo com parada pendente)
        try {
            const tradeManager = getTradeManagerInstance();
            if (tradeManager && typeof tradeManager.applyPendingVisualUpdates === 'function') {
                tradeManager.applyPendingVisualUpdates();
            }
        } catch (error) {
            console.error('❌ [COOLDOWN END] Erro ao aplicar atualizações visuais pendentes:', error);
        }

        CooldownOverlay.hideCooldownOverlay();
        CooldownOverlay.restoreRulesDisplay();
        CooldownOverlay.resumeDisplayUpdates();

        // 🔧 VERIFICAR: Se é parada completa do sistema (ANTES de resetar estado)
        const isCompleteSystemStop = (typeof MonitoringView !== 'undefined' && MonitoringView.pendingStop === true && MonitoringView.state === 'INTERRUPTED');

        // 🚨 CRÍTICO: Resetar MonitoringView.state de volta para MONITORING (se não for parada completa)
        if (typeof MonitoringView !== 'undefined' && !isCompleteSystemStop) {

            MonitoringView.state = 'MONITORING';

            MonitoringView.isExecutingTrade = false;

        } 

        if (window.tradeFlowLogger) {
            window.tradeFlowLogger.endTradeFlow(true, 'Cooldown finalizado com sucesso - Sistema pronto para novo trade');
        }

        if (isCompleteSystemStop) {
            try {
                // 🔍 BUSCA ROBUSTA: Encontrar marketData PRIORIZANDO instância persistente
                let marketDataInstance = null;

                // 🥇 PRIORIDADE 1: Instância persistente global
                if (window.globalMarketDataInstance) {
                    marketDataInstance = window.globalMarketDataInstance;
                }
                // 🥈 PRIORIDADE 2: DisplayView global
                else if (window.displayViewInstance?.marketData) {
                    marketDataInstance = window.displayViewInstance.marketData;
                }
                // 🥉 PRIORIDADE 3: Instância global direta (legacy)
                else if (window.marketDataInstance) {
                    marketDataInstance = window.marketDataInstance;
                }
                // 🏃 PRIORIDADE 4: AppManager
                else if (window.AppManager?.apiInstance?.marketData) {
                    marketDataInstance = window.AppManager.apiInstance.marketData;
                }
                // 🔄 PRIORIDADE 5: Buscar em todas as instâncias registradas
                else if (window.__displayInstances) {
                    const instances = Object.values(window.__displayInstances);
                    const activeInstance = instances.find(inst => inst && inst.marketData && !inst.isDestroyed);
                    if (activeInstance) {
                        marketDataInstance = activeInstance.marketData;
                    }
                }

                // ✅ CORRIGIDO: Cancelar subscrições mas manter PING/PONG ativo
                if (isCompleteSystemStop && marketDataInstance && typeof marketDataInstance.stopAllTicks === 'function') {
                    try {
                        const cancelPromise = marketDataInstance.stopAllTicks();

                        await Promise.race([
                            cancelPromise,
                            new Promise((_, reject) => 
                                setTimeout(() => reject(new Error('Timeout no cancelamento')), 5000)
                            )
                        ]);
                    } catch (error) {
                        console.error('❌ [COOLDOWN END] Erro ao cancelar subscrições:', error);
                    }
                } 

                if (!marketDataInstance) {
                    console.warn('⚠️ [COOLDOWN END] MarketData não encontrado em nenhuma instância:', {
                        displayViewInstance: !!window.displayViewInstance,
                        displayViewMarketData: !!window.displayViewInstance?.marketData,
                        marketDataGlobal: !!window.marketDataInstance,
                        appManagerApi: !!window.AppManager?.apiInstance,
                        appManagerMarketData: !!window.AppManager?.apiInstance?.marketData,
                        displayInstances: window.__displayInstances ? Object.keys(window.__displayInstances).length : 0
                    });

                    // 🚨 FALLBACK CRÍTICO: Tentar cancelamento via websocket direto se existir
                    if (window.displayViewInstance?.ws && window.displayViewInstance.ws.readyState === WebSocket.OPEN) {
                        console.warn('🚨 [COOLDOWN END] Tentando cancelamento direto via WebSocket...');
                        try {
                            window.displayViewInstance.ws.send(JSON.stringify({
                                "forget_all": "ticks",
                                "req_id": Date.now()
                            }));
                        } catch (wsError) {
                            console.error('❌ [COOLDOWN END] Erro no cancelamento direto:', wsError);
                        }
                    }
                }

                // Finalizar parada via StopMonitor
                if (typeof StopMonitor !== 'undefined') {
                    StopMonitor.updateMonitoringButtons(false);
                    if (typeof MonitoringView !== 'undefined') {
                        MonitoringView.state = 'IDLE';
                        MonitoringView.pendingStop = false;
                    }
                }

            } catch (err) {
                console.error('❌ [COOLDOWN END] Erro ao finalizar parada:', err);

                // 🚨 FALLBACK FINAL: Forçar limpeza de estado mesmo com erro
                if (typeof MonitoringView !== 'undefined') {
                    MonitoringView.state = 'IDLE';
                    MonitoringView.pendingStop = false;
                }
                if (typeof StopMonitor !== 'undefined') {
                    StopMonitor.updateMonitoringButtons(false);
                }
            }
        }
    }

    // 🔧 NOVO: Função para esconder overlay de cooldown
    static hideCooldownOverlay() {
        // 🔧 CORREÇÃO: Buscar overlay nos containers de regras onde o overlay realmente está
        const containers = [
            document.querySelector('.rules-visual-container'),
            document.getElementById('rules-visual-display'),
            document.getElementById('rules-container'),
            document.querySelector('.strategy-rules-display')
        ];

        let overlaysRemoved = 0;
        containers.forEach(container => {
            if (container) {
                const overlays = container.querySelectorAll('.cooldown-overlay-modal');
                overlays.forEach(overlay => {
                    overlay.remove();
                    overlaysRemoved++;
                });
            }
        });
    }

    // 🔧 NOVO: Restaurar display de regras após cooldown
    static restoreRulesDisplay() {
        // Retomar atualizações visuais se houver regras traduzidas no MonitoringView
        if (window.MonitoringView && window.MonitoringView.currentTranslatedRules) {
            // 🔧 CORREÇÃO: Forçar atualização com dados mais recentes após cooldown
            // Os dados continuaram sendo atualizados durante o cooldown, agora mostrar os novos dados
            window.MonitoringView.displayStrategyRules(window.MonitoringView.currentTranslatedRules, false);

            // Forçar atualização imediata com dados atuais
            setTimeout(() => {
                if (window.MonitoringView) {
                    window.MonitoringView.updateRuleVisuals();
                }
            }, 100);
        }
    }

    // 🔧 NOVO: Retomar atualizações pausadas
    static resumeDisplayUpdates() {
        // 🔧 CORREÇÃO: Forçar múltiplas atualizações para garantir sincronização com dados atuais
        if (window.MonitoringView && window.MonitoringView.currentTranslatedRules) {
            // Primeira atualização imediata
            window.MonitoringView.updateRuleVisuals();

            // Segunda atualização após pequeno delay para garantir dados frescos
            setTimeout(() => {
                if (window.MonitoringView) {
                    window.MonitoringView.updateRuleVisuals();
                }
            }, 200);

            // Terceira atualização para garantir sincronização completa
            setTimeout(() => {
                if (window.MonitoringView) {
                    window.MonitoringView.updateRuleVisuals();
                }
            }, 500);
        }
    }

    // 🔧 NOVA FUNÇÃO: Atualizar progress bar baseado em ticks - Modal Version
    static updateCooldownProgress() {
        // Verificar se cooldown ainda está ativo antes de tentar atualizar
        if (!CooldownOverlay.cooldownActive) {
            return;
        }

        const overlayModal = document.querySelector('.cooldown-overlay-modal');
        if (!overlayModal) {
            // Modal já foi removido - sistema funcionando normalmente
            return;
        }

        // Buscar elementos do progresso no overlay
        const cooldownNumber = overlayModal.querySelector('.cooldown-number');
        const progressBar = overlayModal.querySelector('.cooldown-progress');
        const progressText = overlayModal.querySelector('.cooldown-text');
        const progressPercentageElement = overlayModal.querySelector('.cooldown-percentage');

        if (!cooldownNumber || !progressBar || !progressText) {
            console.warn('⚠️ [OVERLAY UPDATE] Elementos do overlay não encontrados:', {
                cooldownNumber: !!cooldownNumber,
                progressBar: !!progressBar,
                progressText: !!progressText
            });
            return;
        }

        let displayNumber, progressPercentage, displayText;

        if (CooldownOverlay.cooldownType === 'TICKS_ONLY') {
            // Modo apenas ticks - MELHORADO para durações dinâmicas
            displayNumber = CooldownOverlay.cooldownTicksRemaining;
            progressPercentage = CooldownOverlay.cooldownTicksTotal > 0
                ? ((CooldownOverlay.cooldownTicksTotal - CooldownOverlay.cooldownTicksRemaining) / CooldownOverlay.cooldownTicksTotal) * 100
                : 100;

            const pluralTicks = CooldownOverlay.cooldownTicksRemaining !== 1 ? 's' : '';
            const remainingTime = CooldownOverlay.cooldownTicksRemaining;
            const totalTime = CooldownOverlay.cooldownTicksTotal;

            // 🎯 NOVO: Verificar se é modo dinâmico (cooldown = 0)
            const tradeManager = getTradeManagerInstance();
            const cooldownPeriod = tradeManager?.config?.cooldownPeriod || 3;
            const isDynamicMode = (cooldownPeriod === 0);

            // ✅ MELHOR FORMATAÇÃO para durações longas
            if (totalTime > 100) {
                // Para durações muito longas, mostrar em formato mais compacto
                const minutes = Math.floor(remainingTime / 60);
                const seconds = remainingTime % 60;
                if (minutes > 0) {
                    displayText = isDynamicMode 
                        ? `Aguardando ${minutes}m${seconds}s (duração natural)`
                        : `Aguardando ${minutes}m${seconds}s (${remainingTime}/${totalTime} ticks)`;
                } else {
                    displayText = isDynamicMode
                        ? `Aguardando ${remainingTime} tick${pluralTicks} (duração natural)`
                        : `Aguardando ${remainingTime} de ${totalTime} tick${pluralTicks}`;
                }
            } else {
                displayText = isDynamicMode
                    ? `Aguardando ${remainingTime} tick${pluralTicks} (duração natural)`
                    : `Aguardando ${remainingTime} de ${totalTime} tick${pluralTicks}`;
            }

        } else if (CooldownOverlay.cooldownType === 'TICKS_PLUS_TIME') {
            // Modo ticks + tempo
            if (CooldownOverlay.cooldownTicksRemaining > 0) {
                // Ainda processando ticks de overlay
                displayNumber = CooldownOverlay.cooldownTicksRemaining;
                const ticksProgress = (3 - CooldownOverlay.cooldownTicksRemaining) / 3;
                const totalProgress = ticksProgress * 0.3; // 30% para ticks de overlay
                progressPercentage = totalProgress * 100;

                const pluralTicks = CooldownOverlay.cooldownTicksRemaining !== 1 ? 's' : '';
                displayText = `Aguardando ${CooldownOverlay.cooldownTicksRemaining} tick${pluralTicks}...`;

            } else {
                // Processando tempo de duração
                displayNumber = Math.ceil(CooldownOverlay.cooldownTimeRemaining);
                const timeProgress = (CooldownOverlay.cooldownTotalTime - CooldownOverlay.cooldownTimeRemaining) / CooldownOverlay.cooldownTotalTime;
                const totalProgress = 0.3 + (timeProgress * 0.7); // 30% ticks + 70% tempo
                progressPercentage = Math.min(totalProgress * 100, 100);

                const unit = CooldownOverlay.cooldownTimeRemaining > 1 ? 'segundos' : 'segundo';
                const dynamicInfo = CooldownOverlay.dynamicTimerActive ? 
                    ` (${Math.round(CooldownOverlay.averageTickInterval)}ms/tick)` : '';
                displayText = `Aguardando ${Math.ceil(CooldownOverlay.cooldownTimeRemaining)} ${unit}${dynamicInfo}...`;
            }
        }

        // Atualizar interface
        cooldownNumber.textContent = displayNumber;
        progressBar.style.width = `${Math.min(progressPercentage, 100)}%`;
        progressText.textContent = displayText;

        // Atualizar percentual se elemento existir
        if (progressPercentageElement) {
            progressPercentageElement.textContent = `${Math.round(progressPercentage)}%`;
        }
    }

    // 🔧 CORRIGIDO: Criar overlay de cooldown com posicionamento correto
    static createCooldownOverlay() {

        // 🔧 CRÍTICO: Buscar container de regras visuais específico
        const rulesContainer = document.querySelector('.rules-visual-container') ||
                           document.getElementById('rules-visual-display') ||
                           document.getElementById('rules-container') ||
                           document.querySelector('.strategy-rules-display');


        if (!rulesContainer) {
            console.error('❌ [OVERLAY] Nenhum container de regras encontrado no DOM!');
            console.error('❌ [OVERLAY] Tentando criar em document.body como fallback...');

            // Fallback: criar overlay em body se não encontrar container
            const bodyOverlay = document.createElement('div');
            bodyOverlay.className = 'cooldown-overlay-modal';
            bodyOverlay.style.cssText = `
                position: fixed !important;
                top: 0 !important;
                left: 0 !important;
                width: 100vw !important;
                height: 100vh !important;
                z-index: 10000 !important;
                display: flex !important;
                justify-content: center !important;
                align-items: center !important;
                background: rgba(0, 0, 0, 0.7) !important;
                backdrop-filter: blur(5px) !important;
            `;

            bodyOverlay.innerHTML = `
                <div style="background: linear-gradient(135deg, #f5d950 0%, #f0c854 100%);
                           border-radius: 15px; padding: 30px; text-align: center; color: #333;">
                    <h3 style="margin: 0 0 15px 0; color: #d63384;">📊 Contrato Aberto</h3>
                    <div style="width: 80px; height: 80px; border-radius: 50%;
                               background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                               display: flex; align-items: center; justify-content: center; margin: 0 auto 15px;">
                        <span class="cooldown-number" style="font-size: 1.8em; font-weight: bold; color: white;">
                            ${CooldownOverlay.cooldownTicksRemaining}
                        </span>
                    </div>
                    <div class="cooldown-text">Aguardando ${CooldownOverlay.cooldownTicksRemaining} ticks...</div>
                    <div style="width: 200px; height: 8px; background: rgba(255,255,255,0.3);
                               border-radius: 4px; margin: 15px auto; overflow: hidden;">
                        <div class="cooldown-progress" style="height: 100%; background: #28a745;
                               border-radius: 4px; transition: width 0.3s; width: 0%;"></div>
                    </div>
                </div>
            `;

            document.body.appendChild(bodyOverlay);
            return;
        }

        // 🔧 GARANTIR que o container tenha position relative
        if (getComputedStyle(rulesContainer).position === 'static') {
            rulesContainer.style.position = 'relative';
            rulesContainer.style.overflow = 'hidden'; // Impedir vazamento
        }

        // 🔧 CORREÇÃO: Verificar se já existe overlay ATIVO antes de criar novo
        const existingActiveOverlay = rulesContainer.querySelector('.cooldown-overlay-modal');
        if (existingActiveOverlay && CooldownOverlay.cooldownActive) {
            CooldownOverlay.updateCooldownProgress();
            return;
        }

        // Limpar apenas overlays inativos
        const inactiveOverlays = rulesContainer.querySelectorAll('.cooldown-overlay-modal');
        inactiveOverlays.forEach(existing => {
            const isInactive = existing.style.display === 'none' ||
                             existing.style.visibility === 'hidden' ||
                             !CooldownOverlay.cooldownActive;
            if (isInactive) {
                existing.remove();
            }
        });

        // Verificar se overlay já existe no container correto (deve estar limpo agora)
        let overlay = rulesContainer.querySelector('.cooldown-overlay-modal');

        if (!overlay) {

            // 🔧 CORRIGIDO: Overlay que respeita exatamente os limites do container pai
            const overlayHTML = `
                <div class="cooldown-overlay-modal" data-overlay-id="cooldown-${Date.now()}" style="
                    position: absolute !important;
                    top: 0 !important;
                    left: 0 !important;
                    right: 0 !important;
                    bottom: 0 !important;
                    width: 100% !important;
                    height: 100% !important;
                    z-index: 9999 !important;
                    display: flex !important;
                    justify-content: center !important;
                    align-items: center !important;
                    border-radius: 8px !important;
                    overflow: hidden !important;
                    margin: 0 !important;
                    padding: 0 !important;
                    box-sizing: border-box !important;
                    background: linear-gradient(135deg, rgba(255, 235, 130, 0.92) 0%, rgba(255, 220, 100, 0.92) 100%) !important;
                    backdrop-filter: blur(10px) !important;
                ">
                    <div class="cooldown-overlay-content" style="
                        position: relative;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        background: linear-gradient(135deg, #f5d950 0%, #f0c854 100%);
                        border-radius: 15px;
                        padding: 20px;
                        width: 80%;
                        max-width: 300px;
                        min-height: 200px;
                        max-height: 90%;
                        box-shadow: 0 15px 40px rgba(0, 0, 0, 0.25);
                        border: 2px solid #fff;
                        text-align: center;
                        color: #333;
                        box-sizing: border-box;
                    ">
                        <div class="cooldown-header">
                            <h3 style="margin: 0 0 15px 0; font-size: 1.4em; color: #d63384; text-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);">
                                📊 Contrato Aberto
                            </h3>
                        </div>

                        <div class="cooldown-progress-container" style="display: flex; flex-direction: column; align-items: center; gap: 15px;">
                            <div class="cooldown-circle" style="
                                width: 90px;
                                height: 90px;
                                border-radius: 50%;
                                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
                                animation: cooldownPulse 2s infinite;
                            ">
                                <span class="cooldown-number" style="font-size: 1.8em; font-weight: bold; color: white; text-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);">
                                    ${CooldownOverlay.cooldownTicksRemaining}
                                </span>
                            </div>

                            <div class="cooldown-text" style="margin: 8px 0; font-size: 1em; color: #495057; font-weight: 600;">
                                Aguardando ${CooldownOverlay.cooldownTicksRemaining} de ${CooldownOverlay.cooldownTicksTotal} tick${CooldownOverlay.cooldownTicksRemaining !== 1 ? 's' : ''}...
                            </div>

                            <div class="cooldown-progress-bar" style="
                                width: 180px;
                                height: 8px;
                                background: rgba(255, 255, 255, 0.4);
                                border-radius: 4px;
                                overflow: hidden;
                                box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.1);
                            ">
                                <div class="cooldown-progress" style="
                                    height: 100%;
                                    background: linear-gradient(90deg, #28a745, #20c997);
                                    border-radius: 4px;
                                    transition: width 0.3s ease;
                                    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
                                    width: ${((CooldownOverlay.cooldownTicksTotal - CooldownOverlay.cooldownTicksRemaining) / CooldownOverlay.cooldownTicksTotal) * 100}%;
                                "></div>
                            </div>
                            <div style="font-size: 0.8em; color: #6c757d; margin-top: 5px;">
                                Progresso: <span class="cooldown-percentage">${Math.round(((CooldownOverlay.cooldownTicksTotal - CooldownOverlay.cooldownTicksRemaining) / CooldownOverlay.cooldownTicksTotal) * 100)}%</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            // Adicionar ao container de regras visuais
            rulesContainer.insertAdjacentHTML('beforeend', overlayHTML);
            overlay = rulesContainer.querySelector('.cooldown-overlay-modal');

        } 

        // Atualizar valores iniciais
        CooldownOverlay.updateCooldownProgress();

        // ✅ FORÇAR VISIBILIDADE
        if (overlay) {
            overlay.style.display = 'flex';
            overlay.style.visibility = 'visible';
            overlay.style.opacity = '1';

        } else {
            console.error(`❌ [CREATE OVERLAY] Overlay NÃO encontrado para tornar visível!`);

        }
    }

    // 🔧 NOVA FUNÇÃO: Limpar overlay anterior antes de iniciar novo monitoramento
    static clearPreviousOverlay() {
        // 🔧 CRÍTICO: APENAS resetar flags se não há cooldown ativo
        if (!CooldownOverlay.cooldownActive) {
            CooldownOverlay.cooldownTicksRemaining = 0;
            CooldownOverlay.cooldownTicksTotal = 3;
        }

        // Buscar e remover APENAS overlays inativos
        const containers = [
            document.querySelector('.rules-visual-container'),
            document.getElementById('rules-visual-display'),
            document.getElementById('rules-container'),
            document.querySelector('.strategy-rules-display')
        ];

        let overlaysRemoved = 0;
        containers.forEach(container => {
            if (container) {
                // 🔧 CORREÇÃO: Só remover overlays que NÃO estão ativos
                const cooldownOverlays = container.querySelectorAll('.cooldown-overlay-modal');
                cooldownOverlays.forEach(overlay => {
                    // Verificar se overlay está ativo baseado no estilo de display
                    const isActive = overlay.style.display !== 'none' &&
                                   overlay.style.visibility !== 'hidden' &&
                                   CooldownOverlay.cooldownActive;

                    if (!isActive) {
                        overlay.remove();
                        overlaysRemoved++;
                    }
                });
            }
        });
    }

    // ✅ FUNÇÃO DE INTERFACE: Verificar se cooldown está ativo
    static isCooldownActive() {
        return CooldownOverlay.cooldownActive;
    }

    // ✅ FUNÇÃO DE INTERFACE: Obter estado do cooldown
    static getCooldownState() {
        return {
            active: CooldownOverlay.cooldownActive,
            protected: CooldownOverlay.cooldownProtected, // 👑 NOVO: Estado de proteção
            ticksRemaining: CooldownOverlay.cooldownTicksRemaining,
            ticksTotal: CooldownOverlay.cooldownTicksTotal,
            type: CooldownOverlay.cooldownType,
            protectionStarted: CooldownOverlay.protectionStarted,
            // ⏰ Informações do timer (apenas Sistema 1)
            dynamicTimer: {
                active: false, // Sistema 2 removido
                averageInterval: CooldownOverlay.averageTickInterval,
                samples: 0 // Sistema contínuo removido
            }
        };
    }

    // ✅ FUNÇÃO DE INTERFACE: Ativar cooldown (chamada do MonitoringView)
    static activateCooldown() {
        // 🎯 VERIFICAR: Só ativar se período de cooldown > 0
        const tradeManager = getTradeManagerInstance();
        const cooldownPeriod = tradeManager?.config?.cooldownPeriod ?? 3;
        
        if (cooldownPeriod <= 0) {
            logConfig.info('cooldown_overlay', '🎯 [COOLDOWN DISABLED] Período ≤ 0 detectado - cooldown e overlay desativados');
            return;
        }

        // 🔧 CRÍTICO: Prevenir múltiplas ativações simultâneas
        if (CooldownOverlay.cooldownActive) {

            console.groupEnd();
            return;
        }


        // 🔧 CRÍTICO: Garantir que ticks estão configurados ANTES de ativar
        if (CooldownOverlay.cooldownTicksRemaining <= 0) {
            // Calcular duração baseada na configuração atual
            const tradeManager = getTradeManagerInstance();
            if (tradeManager) {
                const config = tradeManager.getConfiguration();
                CooldownOverlay.cooldownTicksTotal = CooldownOverlay.calculateCooldownDuration(config);
            } else {
                CooldownOverlay.cooldownTicksTotal = 3;
            }
            CooldownOverlay.cooldownTicksRemaining = CooldownOverlay.cooldownTicksTotal;

        }

        // 🔄 NOVO: Log detalhado da ativação
        if (window.tradeFlowLogger) {
            window.tradeFlowLogger.logPhase('COOLDOWN_START', {
                'Duração total': CooldownOverlay.cooldownTicksTotal,
                'Ticks restantes': CooldownOverlay.cooldownTicksRemaining,
                'Estado atual': CooldownOverlay.cooldownActive ? 'JÁ ATIVO' : 'INATIVO',
                'Delay aplicado': 'Sim (1 segundo)'
            });
        }

        // 👑 CRÍTICO: Se já está protegido, ativar cooldown IMEDIATAMENTE
        if (CooldownOverlay.cooldownProtected && !CooldownOverlay.cooldownActive) {

            CooldownOverlay.cooldownActive = true;
            CooldownOverlay.createCooldownOverlay();
            CooldownOverlay.startIndependentTimer(); // ⏰ NOVO: Iniciar timer independente
            return;
        }

        // ✅ ATIVAR COOLDOWN
        CooldownOverlay.cooldownActive = true;

        // 🔧 NOVO: Ativar modo buffer no sistema de mensagens
        try {
            const messagesManager = getTradeMessagesInstance();
            if (messagesManager) {
                messagesManager.activateCooldownMode();

            }
        } catch (error) {
            console.warn('⚠️ [COOLDOWN] Erro ao ativar buffer de mensagens:', error);
        }

        // ⏰ CRÍTICO: Aguardar 500ms antes de mostrar overlay (permite ver regras satisfeitas)

        setTimeout(() => {

            CooldownOverlay.createCooldownOverlay();

        }, 200); // 500ms de delay

        // ⏰ CRÍTICO: Iniciar timer independente baseado em averageTickInterval
        const averageInterval = CooldownOverlay.getDynamicInterval();

        CooldownOverlay.startIndependentTimer();

        // ✅ AGUARDAR UM POUCO E ATUALIZAR PROGRESSO
        setTimeout(() => {
            CooldownOverlay.updateCooldownProgress();
        }, 100);

    }

    // ⏰ NOVO: Sistema de timer independente baseado em averageTickInterval
    static startIndependentTimer() {
        // 🔧 CORREÇÃO: Sincronizar intervalo antes de usar
        CooldownOverlay.syncCalculatedInterval();
        const averageTickInterval = CooldownOverlay.getDynamicInterval();

        // Parar timer anterior se existir
        if (CooldownOverlay.backupTimerInterval) {
            clearInterval(CooldownOverlay.backupTimerInterval);
            CooldownOverlay.backupTimerInterval = null;
        }

        // ⏰ TIMER DIRETO baseado no averageTickInterval
        let intervalsProcessed = 0;

        // 🕒 NOVO: Sistema de medição de tempo real
        let overlayStartTime = null;
        let lastCountTime = null;
        let countNumber = 0;

        // 🕒 INICIALIZAR medição de tempo ANTES do timer
        overlayStartTime = Date.now();
        lastCountTime = overlayStartTime;
        countNumber = 0;

        CooldownOverlay.backupTimerInterval = setInterval(() => {

            // ✅ CONDIÇÃO GLOBAL: Se COOLDOWN=TRUE (abre condição)
            if (CooldownOverlay.cooldownActive === true) {

                // Se é a primeira vez que detecta COOLDOWN=TRUE, inicializar APENAS UMA VEZ
                if (!CooldownOverlay.cooldownInitialized) {
                    CooldownOverlay.initializeCooldownProcess();
                    CooldownOverlay.cooldownInitialized = true;
                    intervalsProcessed = 0; // Zerar contador de intervalos
                }

                // 📖 Processar tick de cooldown
                const result = CooldownOverlay.processCooldownTick();
                intervalsProcessed++;
                countNumber++;

                // 🕒 MEDIR TEMPO REAL entre contagens
                const currentTime = Date.now();
                const timeSinceStart = currentTime - overlayStartTime;
                const timeSinceLastCount = currentTime - lastCountTime;


                // Atualizar tempo da última contagem
                lastCountTime = currentTime;

                // Atualizar progresso visual
                CooldownOverlay.updateCooldownProgress();

                if (intervalsProcessed >= CooldownOverlay.cooldownTicksTotal) {

                    // 🕒 LOG FINAL do tempo total
                    const totalTime = Date.now() - overlayStartTime;
                    const expectedTime = averageTickInterval * CooldownOverlay.cooldownTicksTotal;
                    const timeDifference = totalTime - expectedTime;
                    const averageRealInterval = totalTime / countNumber;

                    // Parar o timer imediatamente
                    if (CooldownOverlay.backupTimerInterval) {
                        clearInterval(CooldownOverlay.backupTimerInterval);
                        CooldownOverlay.backupTimerInterval = null;
                    }

                    CooldownOverlay.cooldownActive = false; // ❌ COOLDOWN=FALSE (fecha condição)
                    CooldownOverlay.cooldownInitialized = false; // Reset para próximo ciclo

                    // Finalizar cooldown
                    CooldownOverlay.endCooldown();

                } 
            } else {
                // 🚫 Se COOLDOWN=FALSE, parar o timer para economizar recursos
                if (CooldownOverlay.backupTimerInterval) {
                    clearInterval(CooldownOverlay.backupTimerInterval);
                    CooldownOverlay.backupTimerInterval = null;

                }
            }

        }, averageTickInterval); // 🎯 CORREÇÃO: Usar intervalo correto diretamente
    }

    // ✅ FUNÇÃO DE INTERFACE: Forçar parada do cooldown
    static forceStop() {
        // 🔧 CRÍTICO: Verificar se há parada pendente - se sim, NÃO forçar parada
        const isPendingStop = (typeof MonitoringView !== 'undefined' && MonitoringView.pendingStop === true);

        if (isPendingStop) {
            return; // NÃO interromper cooldown se há parada pendente
        }

        // 🔧 NOVO: Verificar se cooldown está em execução normal
        if (CooldownOverlay.cooldownActive && CooldownOverlay.cooldownTicksRemaining > 0) {
            return; // NÃO interromper cooldown em execução normal
        }

        // 🔧 NOVO: Só forçar parada se foi explicitamente solicitado pelo usuário
        const isUserStop = (typeof MonitoringView !== 'undefined' && MonitoringView.state === 'INTERRUPTED');

        if (!isUserStop) {
            return;
        }

        CooldownOverlay.cooldownActive = false;
        CooldownOverlay.cooldownTicksRemaining = 0;
        CooldownOverlay.cooldownTicksTotal = 3;
        CooldownOverlay.cooldownProtected = false; // 👑 LIMPAR proteção
        CooldownOverlay.protectionStarted = null;

        // 🚨 Parar o timer de backup
        if (CooldownOverlay.backupTimerInterval) {
            clearInterval(CooldownOverlay.backupTimerInterval);
            CooldownOverlay.backupTimerInterval = null;
        }

        // 🔧 NOVO: Processar buffer mesmo em parada forçada
        try {
            const messagesManager = getTradeMessagesInstance();
            if (messagesManager) {
                messagesManager.deactivateCooldownMode();
            }
        } catch (error) {
            console.warn('⚠️ [COOLDOWN FORCE STOP] Erro ao processar buffer:', error);
        }

        // 🔧 CRÍTICO: Limpar TODOS os overlays, não apenas esconder
        CooldownOverlay.clearPreviousOverlay();
        CooldownOverlay.hideCooldownOverlay();
    }
}

// Tornar disponível globalmente
window.CooldownOverlay = CooldownOverlay;

// Função de conveniência para obter instância
function getCooldownOverlayInstance() {
    return CooldownOverlay;
}

// Tornar função global
window.getCooldownOverlayInstance = getCooldownOverlayInstance;