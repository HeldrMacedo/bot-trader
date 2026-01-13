// Arquivo principal - apenas inicialização quando estiver na rota /app
// O SISTEMA DEVE SER 100% ISOLADO POR USUARIO

// ✅ CORREÇÃO CRÍTICA: Verificar e inicializar logConfig antes de qualquer outra coisa
(function initializeLogConfig() {
    // Garantir que window existe e logConfig não está definido OU está incompleto
    if (typeof window !== 'undefined') {
        const needsInit = (!window.logConfig ||
                          typeof window.logConfig.shouldLog !== 'function' ||
                          typeof window.logConfig.debug !== 'function' ||
                          typeof window.logConfig.info !== 'function' ||
                          typeof window.logConfig.warn !== 'function' ||
                          typeof window.logConfig.error !== 'function');

        if (needsInit) {

            window.logConfig = {
                // Lista de contextos que devem ser filtrados (silenciados)
                filteredContexts: [],

                // Lista de mensagens específicas que devem ser filtradas
                filteredMessages: [
                    '🎰 Multiplicador Gale atualizado para:',
                    '🔄 [RESET] Todos os contadores zerados no início do monitoramento:',
                    '  - realWinsStreak:',
                    '  - realLossesStreak:',
                    '  - simulatedWinsStreak:',
                    '  - simulatedLossesStreak:',
                    '  - accumulatedLosses:',
                    '💰 [RESET] Saldo inicial definido:',
                    '🔄 [RELOAD CONFIG] CENÁRIO',
                    '🔄 Modo alterado manualmente para:',
                    '🔄 Configuração recarregada - Modo inicial:',
                    '(valor definido pelo usuário)',
                    '🎰 [CÁLCULO GALE DETALHADO]',
                    '🎰 Motivo:',
                    '🎰 Perdas Acumuladas:',
                    '🎰 Payout Multiplicador:',
                    '🎰 Multiplicador de Ajuste:',
                    '🎰 Fórmula:',
                    '🎰 Cálculo:',
                    '🎰 Valor Final:',
                    '🎰 Valor Real Salvo:',
                    '================================================================',
                    '⏰ Timeout aguardando',
                    'ticks',
                    'perda(s) real(is) consecutiva(s) detectada(s)',
                    'soma de todas as perdas anteriores',
                    'payout real da proposta atual da Deriv',
                    'configurado pelo usuário',
                    '(Perdas Acumuladas / (Payout-1)) × Ajuste',
                    'aplicado mínimo de $0.35 da Deriv e arredondamento',
                    'será usado para próxima perda se houver'
                ],

                // Verificar se uma mensagem deve ser filtrada
                shouldFilter: (context, message) => {
                    // Filtrar contextos específicos apenas para mensagens específicas
                    if (context === 'trade_manager' || context === 'trade_risk') {
                        // Verificar padrões específicos
                        const shouldFilterMessage = window.logConfig.filteredMessages.some(pattern => 
                            message.includes(pattern)
                        );

                        // Filtrar também qualquer coisa que contenha esses padrões específicos do Gale
                        const galePatterns = [
                            /🎰.*=/,  // Qualquer linha do Gale que contenha =
                            /⏰ Timeout aguardando \d+ ticks/,  // Timeout de ticks
                            /🎰.*\$\d+\.\d+.*\(/,  // Valores monetários do Gale
                            /🎰.*x \(/,  // Multiplicadores do Gale
                        ];

                        const matchesGalePattern = galePatterns.some(pattern => 
                            pattern.test(message)
                        );

                        return shouldFilterMessage || matchesGalePattern;
                    }

                    // Filtrar outros contextos completamente
                    if (window.logConfig.filteredContexts.includes(context)) {
                        return true;
                    }

                    return false;
                },

                info: (context, message) => {

                },
                error: (context, message) => console.error(),
                warn: (context, message) => {

                },
                debug: (context, message) => {

                },
                shouldLog: (context, frequency = 1.0) => {
                    // Verificar se deve fazer log baseado na frequência (0.0 a 1.0)
                    return Math.random() <= frequency;
                }
            };

        }
    }
})();


// ✅ VERIFICAÇÃO IMEDIATA DOS ELEMENTOS CRÍTICOS
const immediateCheck = () => {
    const elements = {
        loadingScreen: document.getElementById('loading-screen'),
        progressFill: document.getElementById('progress-fill'),
        progressPercentage: document.getElementById('progress-percentage'),
        progressText: document.getElementById('progress-text')
    };


    return elements;
};

// 🚀 INICIALIZAÇÃO SUPER PRECOCE - EXECUTAR IMEDIATAMENTE
const initializeImmediately = () => {

    // 🔧 MODIFICATION: Allow local development paths
    const path = window.location.pathname;
    const isValidPath = path === '/app' || path === '/' || path.endsWith('index.html') || window.location.protocol === 'file:';

    if (isValidPath) {

        const elements = immediateCheck();

        if (elements.loadingScreen && elements.progressFill) {

            // ⚡ FORÇAR PROGRESSO IMEDIATO - SEM AGUARDAR LOADINGMANAGER
            elements.progressFill.style.width = '5%';
            if (elements.progressPercentage) elements.progressPercentage.textContent = '5%';
            if (elements.progressText) elements.progressText.textContent = '⚡ Inicialização imediata...';


            // ⚡ CONTINUAR PROGRESSO VISUAL ENQUANTO AGUARDA LOADINGMANAGER
            let progress = 5;
            const visualProgressInterval = setInterval(() => {
                if (typeof LoadingManager !== 'undefined') {

                    clearInterval(visualProgressInterval);

                    // Transferir controle para LoadingManager
                    LoadingManager.init();

                    return;
                }

                progress = Math.min(progress + 1, 15); // Limitar a 15% até LoadingManager assumir
                elements.progressFill.style.width = progress + '%';
                if (elements.progressPercentage) elements.progressPercentage.textContent = progress + '%';
                if (elements.progressText) elements.progressText.textContent = `⚡ Carregando sistema... ${progress}%`;

            }, 200); // A cada 200ms

            // ⚡ TIMEOUT DE SEGURANÇA
            setTimeout(() => {
                if (typeof LoadingManager === 'undefined') {
                    console.warn('🔴 [SYNC] ⚠️ LoadingManager ainda não disponível após 10s');
                    clearInterval(visualProgressInterval);
                }
            }, 10000);

        } else {
            console.error('🔴 [SYNC] ❌ Elementos de loading não encontrados!');
        }
    }
};

// ⚡ EXECUTAR IMEDIATAMENTE - SEM AGUARDAR NADA
initializeImmediately();

document.addEventListener('DOMContentLoaded', function() {
    // ✅ LOGS IMEDIATOS E VISÍVEIS
    const forceLog = (message, data = null) => {
              // Forçar processamento imediato
        window.requestAnimationFrame(() => {

        });
    };

    forceLog('📄 [APP] === DOMContentLoaded DISPARADO ===');
    forceLog('📄 [APP] Timestamp:', new Date().toISOString());
    forceLog('⏰ [APP] Tempo desde página iniciada:', performance.now() + 'ms');

    // CRÍTICO: Verificar se estamos realmente na rota /app (ou ambiente local permitido)
    const currentPath = window.location.pathname;
    forceLog(`🛤️ [APP] Verificando rota atual: ${currentPath}`);

    const isValidPath = currentPath === '/app' || currentPath === '/' || currentPath.endsWith('index.html') || window.location.protocol === 'file:';

    if (!isValidPath) {
        forceLog('⚠️ [APP] Rota não padrão detectada (' + currentPath + '), mas permitindo inicialização para debug.');
        // return; // Removido return estrito para permitir dev local
    }

    forceLog('✅ [APP] Rota validada, prosseguindo com inicialização...');

    const loadingState = {
        'loading-screen': !!document.getElementById('loading-screen'),
        'app-container': !!document.getElementById('app-container'),
        'progress-fill': !!document.getElementById('progress-fill')
    };
    forceLog('🔍 [APP] Estado atual dos elementos de loading:', loadingState);

    // 🔧 FALLBACK: Garantir que getCooldownOverlayInstance está disponível
    if (typeof window.getCooldownOverlayInstance === 'undefined') {
        console.warn('⚠️ [APP] getCooldownOverlayInstance não definido, criando fallback...');
        window.getCooldownOverlayInstance = function() {
            if (typeof CooldownOverlay !== 'undefined') {
                return CooldownOverlay;
            }
            console.error('❌ [APP] CooldownOverlay também não está definido!');
            return null;
        };
    }

    // ✅ CORREÇÃO: Aguardar tanto logConfig quanto AppManager estarem disponíveis
    const waitForDependencies = () => {

        // ✅ CORREÇÃO CRÍTICA: Verificar se logConfig existe E tem as funções necessárias
        const hasLogConfig = (typeof window !== 'undefined' &&
                             window.logConfig &&
                             typeof window.logConfig.shouldLog === 'function' &&
                             typeof window.logConfig.debug === 'function');


        if (!hasLogConfig) {
            console.warn('⚠️ [APP] logConfig ainda não disponível, aguardando...');
            return false;
        }

        // Verificar se AppManager está disponível
        const hasAppManager = typeof AppManager !== 'undefined';

        if (!hasAppManager) {
            console.warn('⚠️ [APP] AppManager ainda não disponível, aguardando...');
            return false;
        }

        return true;
    };

    if (waitForDependencies()) {
        // 🔒 PROTEÇÃO CONTRA INICIALIZAÇÃO MÚLTIPLA
        if (window.appInitialized) {
            window.logConfig.warn('app_init', '⚠️ AppManager já foi inicializado, ignorando nova tentativa');
            return;
        }

        window.appInitialized = true;
        window.logConfig.info('app_init', '✅ Todas as dependências carregadas, inicializando AppManager...');
        AppManager.init();
    } else {
        // ✅ PROTEÇÃO: Contador de tentativas para evitar loop infinito
        let attemptCount = 0;
        const maxAttempts = 100; // Máximo 100 tentativas (10 segundos)

        // Aguardar dependências serem carregadas
        const checkDependencies = setInterval(() => {
            attemptCount++;

            if (waitForDependencies()) {
                clearInterval(checkDependencies);
                window.logConfig.info('app_init', '✅ Dependências carregadas após espera, inicializando AppManager...');
                AppManager.init();
            } else if (attemptCount >= maxAttempts) {
                clearInterval(checkDependencies);
                console.error(`❌ [APP] Dependências não carregaram após ${maxAttempts} tentativas`);

                // Tentar inicializar AppManager mesmo assim como último recurso
                if (typeof AppManager !== 'undefined') {
                    console.warn('⚠️ [APP] Inicializando AppManager sem todas as dependências...');
                    AppManager.init();
                } else {
                    console.error('❌ [APP] AppManager não está disponível, não é possível inicializar');
                    // Recarregar a página em último caso
                    console.warn('🔄 [APP] Recarregando página devido a falha de inicialização...');
                    setTimeout(() => window.location.reload(), 2000);
                }
            }
        }, 100);
    }
});

// Event listeners globais
window.addEventListener('load', () => {
    // 🔒 INTERCEPTADOR: Garantir estilo consistente do display de ativo
    setInterval(() => {
        const assetDisplay = document.getElementById('selected-asset-display');
        if (assetDisplay && typeof ConfigurationsView !== 'undefined' && ConfigurationsView.forceConsistentAssetDisplayStyle) {
            // Verificar se o estilo foi alterado
            const computedStyle = window.getComputedStyle(assetDisplay);
            const expectedGradient = 'linear-gradient(135deg, rgb(102, 126, 234) 0%, rgb(118, 75, 162) 100%)';

            if (!computedStyle.background.includes('linear-gradient') ||
                !computedStyle.background.includes('102, 126, 234')) {
                ConfigurationsView.forceConsistentAssetDisplayStyle();
            }
        }
    }, 2000); // Verificar a cada 2 segundos
});