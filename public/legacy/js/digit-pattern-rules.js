// js/digit-pattern-rules.js
// Sistema de regras baseadas em padrões de dígitos (XXOX, OOOOXXO, etc.)
// O SISTEMA DEVE SER 100% ISOLADO POR USUARIO

class DigitPatternRulesProcessor {
    constructor() {
        this.sessionId = SessionManager.getUserSessionId();

        this.patternCache = new Map();
        this.lastCacheUpdate = 0;
        this.cacheTimeout = 1000;
        this.predictionModalDismissed = false;
        this.predictionModalDismissedKey = null;
    }

    // Processar regra de padrão de dígitos
    processDigitPatternRule(rule, context = null, forcedPrice = null) {
        try {
            // Validar parâmetros da regra
            if (!this.validateDigitPatternRule(rule)) {
                console.error('❌ Regra de padrão de dígitos inválida:', rule);
                return null;
            }

            const params = rule.parameters || rule;
            // 🎯 CORREÇÃO: Normalizar apenas para processamento interno, preservar original
            const pattern = params.pattern.toUpperCase(); // Usado apenas para lógica interna
            const originalPattern = params.pattern; // Preservar padrão original
            const patternLength = pattern.length;

            // Obter histórico de dígitos para o padrão especificado
            const digits = this.getDigitsForPattern(patternLength, forcedPrice);

            if (!digits || digits.length < patternLength) {
                console.warn(`⚠️ Histórico de dígitos insuficiente para padrão ${pattern}`);
                return {
                    pattern: pattern,
                    patternLength: patternLength,
                    availableDigits: digits ? digits.length : 0,
                    sufficient: false,
                    matches: false
                };
            }

            // 🎯 PASSAR CONTEXTO: Se o contexto for nulo, tenta extrair da própria regra
            let effectiveContext = context;
            if (!effectiveContext) {
                effectiveContext = {
                    action: params.predictionAction || (params.combinedRule && params.combinedRule.patternRule ? params.combinedRule.patternRule.contextAction : null),
                    target: params.targetValue !== undefined ? params.targetValue : (params.combinedRule && params.combinedRule.patternRule ? params.combinedRule.patternRule.contextTarget : null)
                };
            }

            const result = this.analyzeDigitPattern(pattern, digits, effectiveContext);

            return {
                pattern: originalPattern, // 🎯 CORREÇÃO: Retornar padrão original
                internalPattern: pattern, // Manter padrão normalizado para lógica interna
                patternLength: patternLength,
                availableDigits: digits.length,
                sufficient: true,
                matches: result.matches,
                analysis: result.analysis,
                actualDigits: digits.slice(-patternLength) // Últimos N dígitos analisados
            };

        } catch (error) {
            console.error('❌ Erro ao processar regra de padrão de dígitos:', error);
            return null;
        }
    }

    // Validar regra de padrão de dígitos
    validateDigitPatternRule(rule) {
        if (!rule || rule.type !== 'digit_pattern') {
            return false;
        }

        const params = rule.parameters || rule;
        if (!params || !params.pattern) {
            console.error('❌ Padrão não especificado na regra');
            return false;
        }

        // Validar caracteres do padrão (apenas X, x, O, o)
        const pattern = params.pattern.toUpperCase();

        const validChars = /^[XO]+$/;
        if (!validChars.test(pattern)) {
            console.error('❌ Padrão contém caracteres inválidos. Use apenas X e O:', params.pattern);
            console.error('❌ Padrão normalizado:', pattern);
            return false;
        }

        // Validar comprimento mínimo
        if (pattern.length < 2) {
            console.error('❌ Padrão muito curto. Mínimo 2 caracteres:', params.pattern);
            return false;
        }

        // Validar comprimento máximo
        if (pattern.length > 20) {
            console.error('❌ Padrão muito longo. Máximo 20 caracteres:', params.pattern);
            return false;
        }


        return true;
    }

    // Obter dígitos para análise do padrão
    getDigitsForPattern(patternLength, forcedPrice = null) {
        const startTime = performance.now();
        try {
            const derivService = window.DerivServiceInstance;

            // ❌ REMOVIDO fallback de R_10 - usar ativo selecionado obrigatoriamente
            const currentSymbol = window.selectedSymbol || SessionManager.getSessionData('selected_symbol');
            if (!currentSymbol) {
                console.error('❌ [DIGIT PATTERN] Nenhum ativo selecionado!');
                throw new Error('ERRO: Nenhum ativo selecionado. Recarregue a página.');
            }
            // 🎯 LER CONFIGURAÇÃO GLOBAL: Verificar se deve pular dígitos repetidos de forma robusta
            const countRepeated = (function () {
                const checkbox = document.getElementById('count-repeated-digits-input');
                if (checkbox) return checkbox.checked;

                if (window.tradeManager && window.tradeManager.config && window.tradeManager.config.countRepeated !== undefined) {
                    return window.tradeManager.config.countRepeated;
                }

                try {
                    const loginid = localStorage.getItem('current_user_loginid');
                    if (loginid) {
                        const saved = localStorage.getItem(`trade_config_user_${loginid}`);
                        if (saved) {
                            const data = JSON.parse(saved);
                            const config = data.config || data;
                            if (config.countRepeated !== undefined) return config.countRepeated;
                        }
                    }
                } catch (e) { }
                return true;
            })();


            // Se for para filtrar repetidos, precisamos de muito mais histórico
            const multiplier = countRepeated ? 1 : 4;
            const searchCount = (patternLength * multiplier) + 20; // Margem de segurança

            // Obter mais dígitos que o necessário para ter certeza
            let history = null;

            if (derivService && typeof derivService.getHistoricalTicksSync === 'function') {
                try {
                    history = derivService.getHistoricalTicksSync(currentSymbol, searchCount);
                } catch (e) {
                    console.warn('⚠️ [DIGIT PATTERN] Erro ao acessar DerivServiceInstance:', e);
                }
            }

            if (!history || !history.prices || history.prices.length === 0) {
                const marketData = getMarketDataInstance(SessionManager.getLocalToken());
                if (!marketData) {
                    console.error('❌ Market data instance não disponível');
                    return [];
                }

                history = marketData.getHistoricalTicks(currentSymbol, searchCount);
            }

            if (history && history.prices && Array.isArray(history.prices) && history.prices.length > 0) {
                // Converter preços para últimos dígitos
                let digits = history.prices.map(price => {
                    return this.extractLastDigit(price);
                }).filter(digit => digit !== null);

                // 🎯 [DELAY 0] Injetar o preço forçado (dígito de saída) se disponível
                if (forcedPrice !== null && forcedPrice !== undefined) {
                    const forcedDigit = this.extractLastDigit(forcedPrice);
                    if (forcedDigit !== null) {
                        // Verificar se o último dígito do histórico já é o mesmo que o forçado para evitar dublagem
                        const lastInHistory = digits.length > 0 ? digits[digits.length - 1] : null;
                        if (lastInHistory !== forcedDigit) {
                            digits.push(forcedDigit);
                        }
                    }
                }

                // 🎯 FILTRAGEM DE REPETIDOS
                if (!countRepeated) {
                    const filtered = [];
                    // Log antes
                    const sampleRaw = digits.slice(-10).join(',');

                    for (let i = 0; i < digits.length; i++) {
                        // Pular se for igual ao anterior
                        if (i === 0 || digits[i] !== digits[i - 1]) {
                            filtered.push(digits[i]);
                        }
                    }
                    digits = filtered;

                    // Log depois
                    console.warn(`🔍 [DEBUG FILTER] Repetidos DESATIVADO. Raw: [${sampleRaw}] -> Filtered: [${digits.slice(-10).join(',')}]`);
                } 

                return digits;
            }

            const duration = performance.now() - startTime;
            if (duration > 5) {
                console.warn(`[PERF] getDigitsForPattern took ${duration.toFixed(2)}ms`);
            }
            return [];
        } catch (error) {
            console.error('❌ Erro ao obter dígitos para padrão:', error);
            return [];
        }
    }

    // ✅ USAR o mesmo método que o rodapé usa (extractLastDigitForAsset)
    extractLastDigit(price) {
        try {
            // Obter marketData e símbolo
            const currentSymbol = localStorage.getItem('selectedSymbol');

            // 1. Tentar DerivServiceInstance (Novo Sistema)
            if (window.DerivServiceInstance && typeof window.DerivServiceInstance.extractLastDigitUnified === 'function') {
                return window.DerivServiceInstance.extractLastDigitUnified(price, currentSymbol || undefined);
            }

            // 2. Fallback para sistema legado
            const marketData = getMarketDataInstance(SessionManager.getLocalToken());

            if (!marketData || !currentSymbol) {
                console.error('❌ [DIGIT PATTERN] MarketData ou símbolo não disponível');
                return null;
            }

            // 🎯 USAR O MESMO MÉTODO QUE O RODAPÉ USA
            if (typeof marketData.extractLastDigitForAsset === 'function') {
                const lastDigit = marketData.extractLastDigitForAsset(price, currentSymbol);
                return lastDigit;
            } else {
                console.error('❌ [DIGIT PATTERN] extractLastDigitForAsset não disponível');
                return null;
            }
        } catch (error) {
            console.error('❌ [DIGIT PATTERN] Erro ao extrair dígito:', error);
            return null;
        }
    }

    // Analisar se os dígitos seguem o padrão especificado
    analyzeDigitPattern(pattern, allDigits, context = null) {
        try {
            const patternLength = pattern.length;
            const digits = allDigits.slice(-patternLength); // Últimos N dígitos


            // Identificar o dígito "X" (o que mais se repete no padrão)
            const patternAnalysis = this.analyzePatternStructure(pattern);


            // Verificar se os dígitos seguem o padrão
            // 🎯 PASSAR CONTEXTO
            const result = this.verifyPatternMatch(pattern, digits, patternAnalysis, context);

            return {
                matches: result.isMatch,
                analysis: {
                    pattern: pattern,
                    digits: digits,
                    patternStructure: patternAnalysis,
                    matchDetails: result.details
                }
            };

        } catch (error) {
            console.error('❌ Erro ao analisar padrão de dígitos:', error);
            return {
                matches: false,
                analysis: { error: error.message }
            };
        }
    }

    // Analisar a estrutura do padrão para identificar X e O
    analyzePatternStructure(pattern) {
        const chars = pattern.split('');
        const xCount = chars.filter(c => c === 'X').length;
        const oCount = chars.filter(c => c === 'O').length;


        return {
            totalLength: pattern.length,
            xPositions: chars.map((c, i) => c === 'X' ? i : -1).filter(i => i >= 0),
            oPositions: chars.map((c, i) => c === 'O' ? i : -1).filter(i => i >= 0),
            xCount: xCount,
            oCount: oCount,
            originalPattern: pattern
        };
    }

    // Verificar se os dígitos reais seguem o padrão
    verifyPatternMatch(pattern, digits, patternStructure, context = null) {
        try {
            // 🎯 DEBUG: Verificação de contexto
            const action = context ? (context.action || context.contextAction || context.predictionAction) : null;
            const target = context ? (context.target !== undefined ? context.target : (context.contextTarget !== undefined ? context.contextTarget : context.targetValue)) : undefined;

            // Log de depuração SEMPRE VISÍVEL para ajudar o usuário a diagnosticar
         
            let contractTypeOverride = null;
            if (action) {
                const actionMap = {
                    'over': 'DIGITOVER',
                    'under': 'DIGITUNDER',
                    'differ': 'DIGITDIFF',
                    'match': 'DIGITMATCH',
                    'odd': 'DIGITODD',
                    'even': 'DIGITEVEN',
                    'par': 'DIGITEVEN',
                    'impar': 'DIGITODD',
                    'ímpar': 'DIGITODD',
                    'acima': 'DIGITOVER',
                    'abaixo': 'DIGITUNDER',
                    'superior': 'DIGITOVER',
                    'inferior': 'DIGITUNDER'
                };
                contractTypeOverride = actionMap[action.toLowerCase()] || null;
            }

            const contractType = contractTypeOverride || this.getCurrentContractType();
            const isParityContract = (contractType === 'DIGITODD' || contractType === 'DIGITEVEN');

            // ✅ NOVA ESTRATÉGIA: Usar "dígitos perdedores" baseado no contrato e previsão
            let predictionDigit = this.getPredictionDigit();

            // SÓ usar o fallback do DOM se a regra NÃO tiver um alvo próprio
            if (target !== undefined && target !== null && typeof target !== 'string') {
                predictionDigit = target;
            }

            // Validar previsão apenas se não for contrato de paridade (Odd/Even)
            if (predictionDigit === null && !isParityContract) {
                console.log('❌ [DIGIT PATTERN] Dígito da previsão não definido para contrato:', contractType, isParityContract);
                const modalKey = this.buildPredictionRequiredModalKey(contractType, context);
                this.showPredictionRequiredModal(modalKey);

                return {
                    isMatch: false,
                    details: {
                        message: 'Dígito da previsão não definido',
                        predictionDigit: null,
                        requiresPrediction: true
                    }
                };
            }

            // 🎯 NOVO: Obter dígitos perdedores baseado no contrato atual
            // Passamos contractTypeOverride para garantir que ele use o contexto da regra se disponível
            const losingDigits = this.getLosingDigits(predictionDigit, contractTypeOverride);

            if (!losingDigits || losingDigits.length === 0) {
                return {
                    isMatch: false,
                    details: {
                        message: 'Não foi possível determinar dígitos perdedores',
                        predictionDigit: predictionDigit,
                        contractType: contractTypeOverride || this.getCurrentContractType()
                    }
                };
            }

            // Testar se algum dígito perdedor funciona como "X" no padrão
            return this.testLosingDigitsAsX(pattern, digits, losingDigits, patternStructure, contractType);

        } catch (error) {
            console.error('❌ Erro ao verificar padrão:', error);
            return {
                isMatch: false,
                details: { error: error.message }
            };
        }
    }

    // 🎯 NOVO: Obter dígitos perdedores baseado no tipo de contrato
    getLosingDigits(predictionDigit, contractTypeOverride = null) {
        try {
            const contractType = contractTypeOverride || this.getCurrentContractType();
            switch (contractType) {
                case 'DIGITDIFF':
                    // DIFFER: perde apenas quando sai o dígito da previsão
                    return [predictionDigit];

                case 'DIGITOVER':
                    // OVER: perde quando sai dígito menor ou igual à previsão
                    const overLosing = [];
                    for (let i = 0; i <= predictionDigit; i++) {
                        overLosing.push(i);
                    }
                    return overLosing;

                case 'DIGITUNDER':
                    // UNDER: perde quando sai dígito maior ou igual à previsão
                    const underLosing = [];
                    for (let i = predictionDigit; i <= 9; i++) {
                        underLosing.push(i);
                    }
                    return underLosing;

                case 'DIGITMATCH':
                    // MATCH: perde quando NÃO sai o dígito da previsão (todos os outros)
                    const matchLosing = [];
                    for (let i = 0; i <= 9; i++) {
                        if (i !== predictionDigit) {
                            matchLosing.push(i);
                        }
                    }
                    return matchLosing;

                case 'DIGITEVEN':
                    // EVEN: perde quando sai ímpar (1,3,5,7,9)
                    return [1, 3, 5, 7, 9];

                case 'DIGITODD':
                    // ODD: perde quando sai par (0,2,4,6,8)
                    return [0, 2, 4, 6, 8];

                default:
                    // Para outros contratos, usar apenas o dígito da previsão
                    console.warn(`⚠️ [LOSING DIGITS] Contrato ${contractType} não suportado, usando previsão como fallback`);
                    return [predictionDigit];
            }

        } catch (error) {
            console.error('❌ [LOSING DIGITS] Erro ao calcular dígitos perdedores:', error);
            return [predictionDigit]; // Fallback
        }
    }

    // 🎯 NOVO: Obter tipo de contrato atual
    getCurrentContractType() {
        try {
            const savedConfig = localStorage.getItem('trade_config_trade');
            const parsed = JSON.parse(savedConfig);
            const contractType = parsed?.config?.contractType || parsed?.config?.tradeType;
            // 1. Tentar obter do trade type select (modo BOTH) — legado
            if (contractType && contractType !== 'BOTH') {
                return contractType;
            }

            // 3. Tentar obter do localStorage do sistema migrado (trade_config_trade)
            try {
                
                if (savedConfig) {
                    
                    if (contractType && typeof contractType === 'string' && contractType.length > 0) {
                        return contractType;
                    }
                }
            } catch (e) {
                // ignorar erro de parse
            }

            // 4. Fallback para configuração do trade manager — legado
            if (typeof window !== 'undefined' && window.tradeManagerInstance && window.tradeManagerInstance.config) {
                return window.tradeManagerInstance.config.contractType;
            }

            // 5. Último fallback
            return 'DIGITDIFF';

        } catch (error) {
            console.error('❌ [CONTRACT TYPE] Erro ao obter tipo de contrato:', error);
            return 'DIGITDIFF'; // Fallback padrão
        }
    }

    // 🎯 NOVO: Testar dígitos perdedores como "X" no padrão (LÓGICA FLEXÍVEL)
    testLosingDigitsAsX(pattern, digits, losingDigits, patternStructure, effectiveContractType = null) {
        console.log("testLosingDigitsAsX ", pattern, digits, losingDigits, patternStructure, effectiveContractType);
        try {
            const contractType = effectiveContractType || this.getCurrentContractType();

            // 🎯 NOVA ESTRATÉGIA: Usar testDigitAsX com os dígitos perdedores CORRETOS
            const result = this.testDigitAsX(pattern, digits, losingDigits, patternStructure);

            if (result.isMatch) {
                return {
                    isMatch: true,
                    details: {
                        ...result.details,
                        allLosingDigits: losingDigits,
                        contractType: contractType,
                        strategy: 'flexible_losing_digits'
                    }
                };
            }

            // Padrão não atendido
            return {
                isMatch: false,
                details: {
                    reason: 'Padrão não atendido com dígitos perdedores flexíveis',
                    losingDigits: losingDigits,
                    contractType: contractType,
                    actualDigits: digits,
                    patternStructure: patternStructure
                }
            };

        } catch (error) {
            console.error('❌ [TEST LOSING DIGITS FLEXIBLE] Erro:', error);
            return {
                isMatch: false,
                details: { error: error.message }
            };
        }
    }

    // 🎯 NOVA LÓGICA: Testar se padrão é válido com dígitos perdedores específicos
    testDigitAsX(pattern, digits, losingDigitsInput = null, patternStructure) {
        console.log("testDigitAsX ", pattern, digits, losingDigitsInput, patternStructure);
        try {
            // 🎯 CORREÇÃO CRÍTICA: Usar os dígitos perdedores passados (que já consideram o contexto da regra)
            let losingDigits = losingDigitsInput;
            
            if (!losingDigits) {
                const predictionDigit = this.getPredictionDigit();
                losingDigits = this.getLosingDigits(predictionDigit);
            }

            // Verificar se todas as posições X são dígitos perdedores (podem ser diferentes)
            const xMatches = patternStructure.xPositions.every(pos => {
                const digitAtX = digits[pos];
                const isLosingDigit = losingDigits.includes(digitAtX);

                return isLosingDigit;
            });

            if (!xMatches) {
                return {
                    isMatch: false,
                    details: {
                        reason: 'Nem todas as posições X são dígitos perdedores',
                        xPositions: patternStructure.xPositions,
                        actualDigitsAtX: patternStructure.xPositions.map(pos => digits[pos]),
                        losingDigits: losingDigits
                    }
                };
            }

            // Verificar se todas as posições O são dígitos vencedores (não perdedores)
            const oMatches = patternStructure.oPositions.every(pos => {
                const digitAtO = digits[pos];
                const isWinningDigit = !losingDigits.includes(digitAtO);

                return isWinningDigit;
            });

            if (!oMatches) {
                return {
                    isMatch: false,
                    details: {
                        reason: 'Nem todas as posições O são dígitos vencedores',
                        oPositions: patternStructure.oPositions,
                        actualDigitsAtO: patternStructure.oPositions.map(pos => digits[pos]),
                        losingDigits: losingDigits
                    }
                };
            }


            return {
                isMatch: true,
                details: {
                    strategy: 'flexible_losing_digits',
                    xDigits: patternStructure.xPositions.map(pos => digits[pos]),
                    oDigits: patternStructure.oPositions.map(pos => digits[pos]),
                    losingDigits: losingDigits,
                    winningDigits: [],
                    fullMatch: digits.map((digit, i) => ({
                        position: i,
                        digit: digit,
                        expected: pattern[i],
                        matches: (pattern[i] === 'X' && losingDigits.includes(digit)) ||
                            (pattern[i] === 'O' && !losingDigits.includes(digit))
                    }))
                }
            };

        } catch (error) {
            console.error('❌ [TEST DIGIT AS X] Erro:', error);
            return {
                isMatch: false,
                details: { error: error.message }
            };
        }
    }

    // Verificar se condição de padrão é atendida
    checkDigitPatternCondition(rule, forcedPrice = null) {
        const startTime = performance.now();
        try {
            // 🎯 CONTEXTO: Extrair contexto se disponível na regra (injetado pelo PromptManager)
            const context = {
                action: rule.contextAction || rule.predictionAction || (rule.parameters && (rule.parameters.contextAction || rule.parameters.predictionAction)),
                target: rule.contextTarget !== undefined ? rule.contextTarget : (rule.targetValue !== undefined ? rule.targetValue : (rule.parameters && (rule.parameters.contextTarget !== undefined ? rule.parameters.contextTarget : rule.parameters.targetValue)))
            };

            const result = this.processDigitPatternRule(rule, context, forcedPrice);

            if (!result || !result.sufficient) {
                return false; // Dados insuficientes
            }

            const duration = performance.now() - startTime;
            if (duration > 5) {
                console.warn(`[PERF] checkDigitPatternCondition took ${duration.toFixed(2)}ms`);
            }
            return result.matches;

        } catch (error) {
            console.error('❌ Erro ao verificar condição de padrão:', error);
            return false;
        }
    }

    // Gerar formato visual para regra de padrão
    generateVisualFormat(rule, statusIcon) {
        try {
            const params = rule.parameters || rule;
            const result = this.processDigitPatternRule(rule);

            if (!result) {
                return `${statusIcon} Padrão: Erro`;
            }

            // 🎯 CORREÇÃO: Usar padrão EXATAMENTE como foi digitado pelo usuário
            const originalPattern = params.pattern; // NÃO aplicar toUpperCase() aqui

            if (!result.sufficient) {
                return `${statusIcon} ${originalPattern} (dados insuficientes)`;
            }

            // Mostrar padrão ORIGINAL e últimos dígitos analisados
            const actualDigits = result.actualDigits || [];
            const digitsDisplay = actualDigits.length > 0 ?
                `[${actualDigits.join(',')}]` :
                '[?]';

            // 🎯 CORREÇÃO: Mostrar informação sobre dígitos perdedores e vencedores se disponível
            let extraInfo = '';
            if (result.analysis && result.analysis.matchDetails) {
                const matchDetails = result.analysis.matchDetails;
                const contractType = matchDetails.contractType;

                if (matchDetails.strategy === 'flexible_losing_digits') {
                    const xDigits = matchDetails.xDigits || [];
                    const oDigits = matchDetails.oDigits || [];
                    extraInfo = ` (${contractType}: X=[${xDigits.join(',')}], O=[${oDigits.join(',')}])`;
                } else if (matchDetails.strategy === 'losing_digits') {
                    const losingDigitUsed = matchDetails.losingDigitUsed;
                    const winningDigits = matchDetails.winningDigits;
                    if (winningDigits && winningDigits.length > 0) {
                        extraInfo = ` (${contractType}: X=${losingDigitUsed}, O=[${winningDigits.join(',')}])`;
                    } else {
                        extraInfo = ` (${contractType}: X=${losingDigitUsed})`;
                    }
                }
            }


            // 🔧 CRÍTICO: SEMPRE usar padrão original da regra, preservando maiúsculas e minúsculas
            return `${statusIcon} ${originalPattern} ${digitsDisplay}${extraInfo}`;

        } catch (error) {
            console.error('❌ Erro ao gerar formato visual:', error);
            return `${statusIcon} Padrão: Erro`;
        }
    }

    // Gerar formato de display para regra de padrão
    generateDisplayFormat(rule) {
        try {
            const params = rule.parameters || rule;
            const pattern = params.pattern.toUpperCase();

            // Explicar o padrão de forma legível
            const explanation = this.explainPattern(pattern);

            return `Padrão de dígitos: ${pattern} (${explanation})`;

        } catch (error) {
            console.error('❌ Erro ao gerar formato de display:', error);
            return 'Regra de padrão não formatada';
        }
    }

    // Explicar o padrão em linguagem natural
    explainPattern(pattern) {
        try {
            const chars = pattern.split('');
            const xCount = chars.filter(c => c === 'X').length;
            const oCount = chars.filter(c => c === 'O').length;

            let explanation = `${pattern.length} dígitos: `;

            if (xCount > 0) {
                explanation += `${xCount} repetidos (X)`;
            }

            if (oCount > 0) {
                if (xCount > 0) explanation += ', ';
                explanation += `${oCount} diferentes (O)`;
            }

            return explanation;

        } catch (error) {
            return 'padrão personalizado';
        }
    }

    // Extrair parâmetros da regra de padrão
    static extractParameters(rule) {
        const params = {
            type: 'digit_pattern'
        };

        // Copiar todos os parâmetros específicos da regra
        Object.keys(rule).forEach(key => {
            if (key !== 'id' && key !== 'type' && key !== 'description' && key !== 'display_format') {
                params[key] = rule[key];
            }
        });

        return params;
    }

    // Validar parâmetros extraídos
    static validateParameters(params) {
        if (params.type !== 'digit_pattern') {
            console.error(`❌ ERRO: Tipo incorreto para regra de padrão: ${params.type}`);
            params.pattern = null;
            return;
        }

        if (!params.pattern || typeof params.pattern !== 'string') {
            console.error(`❌ ERRO: Padrão inválido: ${params.pattern}`);
            params.pattern = null;
            return;
        }

        // Normalizar padrão para maiúsculo
        params.pattern = params.pattern.toUpperCase();

        // Validar caracteres
        const validChars = /^[XO]+$/;
        if (!validChars.test(params.pattern)) {
            console.error(`❌ ERRO: Padrão contém caracteres inválidos: ${params.pattern}`);
            params.pattern = null;
            return;
        }

        // Validar comprimento
        if (params.pattern.length < 2 || params.pattern.length > 20) {
            console.error(`❌ ERRO: Comprimento de padrão inválido: ${params.pattern.length}`);
            params.pattern = null;
            return;
        }
    }

    // Obter dígito da previsão do campo de input ou regras dinâmicas
    getPredictionDigit() {
        try {
            // 🎯 PRIORIDADE 1: Verificar se há previsão dinâmica definida pela regra atual
            const dynamicPrediction = this.getDynamicPredictionFromRules();
            if (dynamicPrediction !== null) {

                return dynamicPrediction;
            }

            // PRIORIDADE 2: Tentar obter do campo de previsão na interface
            // const predictionInput = document.getElementById('prediction-input');

            // if (predictionInput && predictionInput.value !== '') {
            //     const prediction = parseInt(predictionInput.value, 10);
            //     if (!isNaN(prediction) && prediction >= 0 && prediction <= 9) {
            //         this.predictionModalDismissed = false;
            //         this.predictionModalDismissedKey = null;
            //         return prediction;
            //     }
            // }

            // PRIORIDADE 3: Tentar obter do localStorage do sistema migrado (trade_config_trade)
            try {
                const savedConfig = localStorage.getItem('trade_config_trade');
                if (savedConfig) {
                    const parsed = JSON.parse(savedConfig);
                    const predictionStr = parsed?.config?.prediction;
                    if (predictionStr !== undefined && predictionStr !== null && predictionStr !== '') {
                        const prediction = parseInt(predictionStr, 10);
                        if (!isNaN(prediction) && prediction >= 0 && prediction <= 9) {
                            this.predictionModalDismissed = false;
                            this.predictionModalDismissedKey = null;
                            return prediction;
                        }
                    }
                }
            } catch (e) {
                // ignorar erro de parse
            }

            // Fallback: tentar obter da configuração de trade legada
            if (typeof window !== 'undefined' && window.tradeConfig &&
                window.tradeConfig.prediction !== undefined) {
                const prediction = parseInt(window.tradeConfig.prediction, 10);
                if (!isNaN(prediction) && prediction >= 0 && prediction <= 9) {
                    this.predictionModalDismissed = false;
                    this.predictionModalDismissedKey = null;
                    return prediction;
                }
            }

            return null;

        } catch (error) {
            console.error('❌ Erro ao obter dígito da previsão:', error);
            return null;
        }
    }

    // 🎯 NOVO: Obter previsão dinâmica das regras traduzidas
    getDynamicPredictionFromRules(satisfiedGroupId = null, overrideDigit = null) {
        try {
            // 🔧 CORREÇÃO: Usar a função global delegada para evitar duplicação de lógica
            return getDynamicPredictionFromRules(satisfiedGroupId, overrideDigit);
        } catch (error) {
            console.error('❌ Erro ao obter previsão dinâmica (instância):', error);
            return null;
        }
    }

    // 🎯 NOVO: Calcular previsão baseada em regra dinâmica
    calculateDynamicPrediction(rule) {
        try {
            const params = rule.parameters || rule;

            switch (params.predictionType) {
                case 'most_repeated_digit':
                    // Ex: "Differ do dígito que se repetir 3 vezes"
                    return this.findMostRepeatedDigit(params.period || 10);

                case 'last_digit':
                case 'last_digit_value':
                    // Ex: "Differ do último dígito" ou "Over 2 se último dígito = 0"
                    // 🎯 SE targetValue for string "$LAST_DIGIT", resolver agora
                    if (params.targetValue === '$LAST_DIGIT') {
                        return this.getLastDigit();
                    }
                    return params.targetValue;

                case 'conditional_value':
                    // Ex: "Over 7 se par, Under 3 se ímpar"
                    return this.getConditionalPrediction(params);

                case 'pattern_based':
                    // Ex: "Match do dígito mais frequente no padrão"
                    return this.getPatternBasedPrediction(params);

                case 'repeated_digit_inverse':
                case 'repeated_digit_match':
                    // Ex: "Entrar differ do digito que repetir 4 vezes"
                    // 🎯 CRÍTICO: Retornar o dígito que REALMENTE repetiu N vezes
                    // NÃO usar getLastDigit() pois isso retorna o último dígito do tick,
                    // que nem sempre é o que repetiu!
                    const count = params.count || 2;
                    const repeatedDigit = findDigitRepeatedNTimes(count);
                    logConfig.info('digit_pattern', `🎯 [REPEATED DIGIT] Buscando dígito que repetiu ${count}x: ${repeatedDigit}`);
                    return repeatedDigit;

                case 'last_digit_probability_match':
                    // Ex: "Entrar differ quando último dígito = menor chance"
                    // Retorna o dígito de menor probabilidade ($LOWER_PROB já resolvido)
                    let probValue = params.condition?.probabilityVariable ?? params.targetValue;

                    // 🎯 FIX: Se for uma variável, resolver agora
                    if (typeof probValue === 'string' && probValue.startsWith('$')) {
                        const resolver = typeof getProbabilityResolver === 'function' ? getProbabilityResolver() : null;
                        if (resolver) {
                            const resolved = resolver.resolve(probValue);
                            if (resolved !== null) probValue = resolved;
                        }
                    }

                    logConfig.info('digit_pattern', `🎯 [LAST_DIGIT_PROB_MATCH] Retornando dígito de probabilidade: ${probValue}`);
                    return probValue;

                default:
                    console.warn('⚠️ Tipo de previsão dinâmica desconhecido:', params.predictionType);
                    return null;
            }
        } catch (error) {
            console.error('❌ Erro ao calcular previsão dinâmica:', error);
            return null;
        }
    }

    // 🎯 NOVO: Encontrar dígito que mais se repete
    findMostRepeatedDigit(period = 10) {
        try {
            const digits = this.getDigitsForPattern(period);
            if (!digits || digits.length === 0) {
                return null;
            }

            // Contar frequência de cada dígito
            const frequency = {};
            for (let i = 0; i <= 9; i++) {
                frequency[i] = 0;
            }

            digits.forEach(digit => {
                if (digit >= 0 && digit <= 9) {
                    frequency[digit]++;
                }
            });

            // Encontrar o dígito mais frequente
            let mostRepeated = 0;
            let maxCount = frequency[0];

            for (let digit = 1; digit <= 9; digit++) {
                if (frequency[digit] > maxCount) {
                    maxCount = frequency[digit];
                    mostRepeated = digit;
                }
            }

            return mostRepeated;

        } catch (error) {
            console.error('❌ Erro ao encontrar dígito mais repetido:', error);
            return null;
        }
    }

    // 🎯 NOVO: Obter previsão condicional
    getConditionalPrediction(params) {
        try {
            const lastDigit = this.getLastDigit();
            if (lastDigit === null) {
                return params.defaultValue || null;
            }

            // Verificar condições
            for (const condition of params.conditions || []) {
                if (this.evaluateCondition(lastDigit, condition.condition)) {
                    return condition.value;
                }
            }

            return params.defaultValue || null;

        } catch (error) {
            console.error('❌ Erro ao obter previsão condicional:', error);
            return null;
        }
    }

    // 🎯 NOVO: Obter último dígito atual
    getLastDigit() {
        try {
            const currentSymbol = localStorage.getItem('selectedSymbol');
            if (!currentSymbol) return null;

            // 1. Tentar DerivServiceInstance (Novo Sistema)
            if (window.DerivServiceInstance && typeof window.DerivServiceInstance.getLastTick === 'function') {
                const tick = window.DerivServiceInstance.getLastTick(currentSymbol);
                if (tick) {
                    return window.DerivServiceInstance.extractLastDigitUnified(tick.quote, currentSymbol);
                }
            }

            return null;
        } catch (error) {
            console.error('❌ Erro ao obter último dígito:', error);
            return null;
        }
    }

    // 🎯 NOVO: Avaliar condição (par, ímpar, igual, etc.)
    evaluateCondition(digit, condition) {
        switch (condition.type) {
            case 'even':
                return digit % 2 === 0;
            case 'odd':
                return digit % 2 !== 0;
            case 'equal':
            case '==':
            case '=':
                return digit === condition.value;
            case 'greater':
            case '>':
                return digit > condition.value;
            case 'less':
            case '<':
                return digit < condition.value;
            case '>=':
                return digit >= condition.value;
            case '<=':
                return digit <= condition.value;
            case '!=':
            case '!==':
                return digit !== condition.value;
            default:
                return false;
        }
    }

    closePredictionRequiredModal() {
        const modal = document.getElementById('prediction-required-modal');
        if (modal) {
            modal.remove();
        }
    }

    buildPredictionRequiredModalKey(contractType, context = null) {
        const contextAction = context && (context.action || context.contextAction || context.predictionAction)
            ? String(context.action || context.contextAction || context.predictionAction)
            : '';
        const contextTarget = context && (context.target !== undefined && context.target !== null)
            ? String(context.target)
            : '';

        return `${contractType || 'UNKNOWN'}|${contextAction}|${contextTarget}`;
    }

    focusPredictionInput() {
        const predictionInput = document.getElementById('prediction-input');
        if (predictionInput && typeof predictionInput.focus === 'function') {
            predictionInput.focus();
            if (typeof predictionInput.select === 'function') {
                predictionInput.select();
            }
            return true;
        }

        const predictionContainer = document.getElementById('prediction-barrier-container');
        if (predictionContainer && typeof predictionContainer.scrollIntoView === 'function') {
            predictionContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }

        return false;
    }

    showPredictionRequiredModal(modalKey = 'default') {
        if (this.predictionModalDismissed && this.predictionModalDismissedKey === modalKey) {
            return;
        }

        if (typeof MonitoringView !== 'undefined' && MonitoringView.stopMonitoring) {
            console.warn('⚠️ [MODAL ERROR] Parando monitoramento devido a erro na regra');
            MonitoringView.stopMonitoring();
        }

        if (document.getElementById('prediction-required-modal')) {
            return;
        }

        const modal = document.createElement('div');
        modal.id = 'prediction-required-modal';
        modal.className = 'prediction-required-modal-overlay';
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        modal.setAttribute('aria-labelledby', 'prediction-required-modal-title');

        modal.innerHTML = `
            <div class="prediction-required-modal-panel">
                <div class="prediction-required-modal-header">
                    <div class="prediction-required-modal-badge">Previsão obrigatória</div>
                    <h3 id="prediction-required-modal-title" class="prediction-required-modal-title">
                        Configure a previsão para usar padrão de dígitos
                    </h3>
                    <p class="prediction-required-modal-subtitle">
                        O sistema migrado exige uma previsão válida para interpretar corretamente padrões como XXOX, OOOOXXO e similares.
                    </p>
                </div>

                <div class="prediction-required-modal-body">
                    <div class="prediction-required-modal-card prediction-required-modal-card-alert">
                        <div class="prediction-required-modal-card-title">O que está faltando</div>
                        <p class="prediction-required-modal-text">
                            Regras de padrão de dígitos precisam de um dígito de previsão entre 0 e 9 para calcular quais valores entram como "X" no padrão atual.
                        </p>
                    </div>

                    <div class="prediction-required-modal-card">
                        <div class="prediction-required-modal-card-title">Como resolver</div>
                        <ul class="prediction-required-modal-list">
                            <li>Preencha o campo <strong>Previsão</strong> com um dígito de 0 a 9</li>
                            <li>Use contratos compatíveis como DIGITOVER, DIGITUNDER, DIGITMATCH ou DIGITDIFF</li>
                            <li>O sistema usa os dígitos perdedores do contrato para montar a lógica do padrão</li>
                        </ul>
                    </div>

                    <div class="prediction-required-modal-card prediction-required-modal-card-example">
                        <div class="prediction-required-modal-card-title">Exemplos práticos</div>
                        <div class="prediction-required-modal-examples">
                            <div>XXOX + DIFFER previsão 7 → X pode ser apenas 7</div>
                            <div>XXOX + OVER previsão 3 → X pode ser 0, 1, 2 ou 3</div>
                            <div>XXOX + UNDER previsão 6 → X pode ser 6, 7, 8 ou 9</div>
                        </div>
                    </div>

                    <div class="prediction-required-modal-actions">
                        <button type="button" class="prediction-required-modal-secondary" data-action="close">
                            Fechar
                        </button>
                        <button type="button" class="prediction-required-modal-primary" data-action="focus-prediction">
                            Ir para previsão
                        </button>
                    </div>
                </div>
            </div>
        `;

        if (!document.getElementById('prediction-required-modal-styles')) {
            const style = document.createElement('style');
            style.id = 'prediction-required-modal-styles';
            style.textContent = `
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }

                @keyframes slideUpIn {
                    from { opacity: 0; transform: translateY(16px) scale(0.98); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }

                .prediction-required-modal-overlay {
                    position: fixed;
                    inset: 0;
                    z-index: 20000;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 24px;
                    background: rgba(3, 7, 18, 0.82);
                    backdrop-filter: blur(8px);
                    font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    animation: fadeIn 0.2s ease-out;
                }

                .prediction-required-modal-panel {
                    width: min(100%, 640px);
                    max-height: min(88vh, 760px);
                    overflow-y: auto;
                    background: #0d0a18;
                    border: 1px solid rgba(107, 114, 128, 0.45);
                    border-radius: 20px;
                    box-shadow: 0 32px 80px rgba(0, 0, 0, 0.45);
                    animation: slideUpIn 0.24s ease-out;
                }

                .prediction-required-modal-header {
                    padding: 24px 24px 18px;
                    background: linear-gradient(180deg, rgba(19, 17, 28, 0.98) 0%, rgba(13, 10, 24, 0.98) 100%);
                    border-bottom: 1px solid rgba(107, 114, 128, 0.28);
                }

                .prediction-required-modal-badge {
                    display: inline-flex;
                    align-items: center;
                    padding: 6px 10px;
                    margin-bottom: 14px;
                    border-radius: 999px;
                    background: rgba(37, 99, 235, 0.16);
                    border: 1px solid rgba(59, 130, 246, 0.35);
                    color: #93c5fd;
                    font-size: 12px;
                    font-weight: 700;
                    letter-spacing: 0.04em;
                    text-transform: uppercase;
                }

                .prediction-required-modal-title {
                    margin: 0;
                    color: #f9fafb;
                    font-size: 24px;
                    font-weight: 700;
                    line-height: 1.25;
                }

                .prediction-required-modal-subtitle {
                    margin: 12px 0 0;
                    color: #9ca3af;
                    font-size: 14px;
                    line-height: 1.6;
                }

                .prediction-required-modal-body {
                    display: flex;
                    flex-direction: column;
                    gap: 14px;
                    padding: 20px 24px 24px;
                }

                .prediction-required-modal-card {
                    background: #13111c;
                    border: 1px solid rgba(75, 85, 99, 0.55);
                    border-radius: 14px;
                    padding: 16px 18px;
                }

                .prediction-required-modal-card-alert {
                    border-color: rgba(59, 130, 246, 0.35);
                    background: linear-gradient(180deg, rgba(30, 27, 46, 0.92) 0%, rgba(19, 17, 28, 0.98) 100%);
                }

                .prediction-required-modal-card-example {
                    background: #1e1b2e;
                }

                .prediction-required-modal-card-title {
                    margin: 0 0 10px;
                    color: #f9fafb;
                    font-size: 14px;
                    font-weight: 700;
                }

                .prediction-required-modal-text,
                .prediction-required-modal-list,
                .prediction-required-modal-examples {
                    margin: 0;
                    color: #d1d5db;
                    font-size: 14px;
                    line-height: 1.65;
                }

                .prediction-required-modal-list {
                    padding-left: 18px;
                }

                .prediction-required-modal-list li + li {
                    margin-top: 8px;
                }

                .prediction-required-modal-examples {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                    color: #cbd5e1;
                }

                .prediction-required-modal-actions {
                    display: flex;
                    justify-content: flex-end;
                    gap: 12px;
                    margin-top: 4px;
                }

                .prediction-required-modal-primary,
                .prediction-required-modal-secondary {
                    border: none;
                    border-radius: 10px;
                    padding: 12px 18px;
                    font-size: 14px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: background 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
                }

                .prediction-required-modal-primary {
                    background: #2563eb;
                    color: #ffffff;
                    box-shadow: 0 8px 24px rgba(37, 99, 235, 0.28);
                }

                .prediction-required-modal-primary:hover {
                    background: #3b82f6;
                    transform: translateY(-1px);
                }

                .prediction-required-modal-secondary {
                    background: #1f2937;
                    color: #e5e7eb;
                    border: 1px solid rgba(107, 114, 128, 0.45);
                }

                .prediction-required-modal-secondary:hover {
                    background: #374151;
                    transform: translateY(-1px);
                }

                .prediction-required-modal-primary:active,
                .prediction-required-modal-secondary:active {
                    transform: translateY(0);
                }

                @media (max-width: 640px) {
                    .prediction-required-modal-overlay {
                        padding: 16px;
                    }

                    .prediction-required-modal-header,
                    .prediction-required-modal-body {
                        padding-left: 16px;
                        padding-right: 16px;
                    }

                    .prediction-required-modal-title {
                        font-size: 20px;
                    }

                    .prediction-required-modal-actions {
                        flex-direction: column-reverse;
                    }

                    .prediction-required-modal-primary,
                    .prediction-required-modal-secondary {
                        width: 100%;
                    }
                }
            `;
            document.head.appendChild(style);
        }

        document.body.appendChild(modal);

        const closeModal = () => {
            this.predictionModalDismissed = true;
            this.predictionModalDismissedKey = modalKey;
            this.closePredictionRequiredModal();
            document.removeEventListener('keydown', handleEsc);
        };

        const handlePrimaryAction = () => {
            closeModal();
            this.focusPredictionInput();
        };

        const primaryButton = modal.querySelector('[data-action="focus-prediction"]');
        const secondaryButton = modal.querySelector('[data-action="close"]');

        if (primaryButton) {
            primaryButton.addEventListener('click', handlePrimaryAction);
        }

        if (secondaryButton) {
            secondaryButton.addEventListener('click', closeModal);
        }

        const handleEsc = (e) => {
            if (e.key === 'Escape') {
                closeModal();
            }
        };
        document.addEventListener('keydown', handleEsc);

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal();
            }
        });

        if (primaryButton && typeof primaryButton.focus === 'function') {
            primaryButton.focus();
        }
    }
}

// 🎯 FUNÇÃO GLOBAL: Verificar se há previsão dinâmica nas regras traduzidas
function getDynamicPredictionFromRules(satisfiedGroupId = null, overrideDigit = null) {
    try {
        const translatedRules = (typeof MonitoringView !== 'undefined' && MonitoringView.currentTranslatedRules) ||
            window.currentTranslatedRules;

        if (!translatedRules || !translatedRules.groups || !Array.isArray(translatedRules.groups)) {
            return null;
        }

        // Se temos um grupo satisfeito, procurar APENAS nele
        if (satisfiedGroupId !== null && satisfiedGroupId !== undefined) {
            const satisfiedGroup = translatedRules.groups.find(g => (g.id == satisfiedGroupId || String(g.id) === String(satisfiedGroupId)));

            if (satisfiedGroup && satisfiedGroup.rules) {
                const predictions = [];

                for (const rule of satisfiedGroup.rules) {
                    const params = rule.parameters || rule;
                    const ruleId = rule.id || 'unknown';
                    const predictionAction = String(params.predictionAction || '').toLowerCase();
                    const predictionType = params.predictionType;


                    let capturedInBranch = false;

                    // 1. Mapeamento Universal de Contratos
                    const contractTypeMap = {
                        'over': 'DIGITOVER', 'under': 'DIGITUNDER', 'match': 'DIGITMATCH', 'matches': 'DIGITMATCH',
                        'differ': 'DIGITDIFF', 'differs': 'DIGITDIFF', 'even': 'DIGITEVEN', 'odd': 'DIGITODD',
                        'rise': 'CALL', 'fall': 'PUT', 'call': 'CALL', 'put': 'PUT',
                        'higher': 'CALLE', 'lower': 'PUTE'
                    };
                    const contractType = contractTypeMap[predictionAction];

                    // 2. Tentar coletar valor da previsão (se aplicável)
                    let predictionValue = null;

                    // 🎯 PRIORIDADE 0: Verificar valor explícito numérico PRIMEIRO
                    // Se o usuário disse "Over 4", deve ser 4, independente de qualquer lógica dinâmica (exceto se for conditional_value)
                    const explicitTarget = params.targetValue ?? params.value;
                    if (typeof explicitTarget === 'number' && explicitTarget >= 0 && explicitTarget <= 9) {
                        predictionValue = explicitTarget;

                    }

                    // Prioridade 1: Previsões Especiais (Inverse, Repeat, etc)

                    if (predictionValue === null && predictionType && predictionType !== 'conditional_value') {
                        const specialVal = calculateSpecialDynamicPrediction(rule, overrideDigit);

                        if (specialVal !== null) {
                            predictionValue = specialVal;

                        }
                    }

                    // Prioridade 2: Valores explícitos (TargetValue) - Fallback para strings/tokens ou se Priority 0 falhou e 1 também
                    if (predictionValue === null) {
                        const targetVal = params.targetValue ?? params.value;
                        if (typeof targetVal === 'number' && targetVal >= 0 && targetVal <= 9) {
                            predictionValue = targetVal;

                        } else if (typeof targetVal === 'string' && targetVal.startsWith('$')) {
                            // Dinâmicos ($LOWER_PROB, etc)
                            if (typeof window.getProbabilityResolver === 'function') {
                                const resolved = window.getProbabilityResolver().resolve(targetVal);
                                if (resolved !== null) {
                                    predictionValue = resolved;

                                }
                            }
                        }
                    }

                    // 3. Decidir se adicionamos esta regra como uma previsão
                    // 🛡️ CRÍTICO: Só extrair se a regra FOR de previsão ou tiver ação/tipo explícito
                    // Isso evita que regras de gatilho (last_digits etc) sobrescrevam a previsão padrão
                    const isExplicitPrediction = rule.type === 'dynamic_prediction' ||
                        predictionAction !== '' ||
                        predictionType;

                    if (isExplicitPrediction && (contractType || predictionValue !== null)) {
                        predictions.push({
                            contractType: contractType || null,
                            predictionValue: predictionValue,
                            ruleId: ruleId
                        });
                        capturedInBranch = true;

                    }
                }


                if (predictions.length > 0) {
                    // Fallback para valor único se não houver tipos de contrato (para compatibilidade)
                    const result = (predictions.length === 1 && predictions[0].contractType === null)
                        ? predictions[0].predictionValue
                        : predictions;
                    return result;
                }
            }
        }

        return null;
    } catch (error) {
        console.error('❌ Erro em getDynamicPredictionFromRules:', error);
        return null;
    }
}

// 🎯 NOVA FUNÇÃO: Obter dígito do percentual para previsão dinâmica
function getDigitFromPercentageRule(rule) {
    try {
        // 🎯 CRÍTICO: SEMPRE limpar _triggerDigit antigo e recalcular
        if (rule && rule._triggerDigit !== undefined) {
            delete rule._triggerDigit;
        }

        const params = rule.parameters || rule;
        if (params && params._triggerDigit !== undefined) {
            delete params._triggerDigit;
        }

        // Verificar se é uma regra de percentual por dígito individual
        if (params && (params.conditionType === 'individual_digits' || params.monitorAllDigits)) {
            const percentageProcessor = getPercentageRulesInstance();

            // 🎯 CRÍTICO: SEMPRE forçar nova verificação da condição (sem cache)
            const isConditionMet = percentageProcessor.checkPercentageCondition(rule);

            if (isConditionMet && rule._triggerDigit !== undefined) {

                return rule._triggerDigit;
            }
        }

        return null;
    } catch (error) {
        console.error('❌ Erro ao obter dígito do percentual:', error);
        return null;
    }
}

// 🎯 NOVA FUNÇÃO: Calcular previsões especiais dinâmicas
function calculateSpecialDynamicPrediction(rule, overrideDigit = null) {
    try {
        const params = rule.parameters || rule;
        const processor = getDigitPatternRulesInstance();

        switch (params.predictionType) {
            case 'conditional_value':
                // 🚫 NUNCA DEVERIA CHEGAR AQUI - conditional_value é filtrado antes!
                console.error('⚠️ ERRO: conditional_value não deveria chegar em calculateSpecialDynamicPrediction!');
                return null;

            case 'conditional_pattern':
            case 'repeated_digit_match':
            case 'repeated_digit_inverse':
                // 🎯 NOVO: Para regras como "Entrar differ do digito que se repetir 2 vezes"
                // O trigger digit foi capturado durante a verificação do padrão
                const patternDigit = params._triggerDigit ?? rule._triggerDigit;
                if (patternDigit !== undefined && patternDigit !== null) {

                    logConfig.info('digit_pattern', `🎯 [${params.predictionType.toUpperCase()}] Previsão: ${patternDigit}`);
                    return patternDigit;
                }

                // Se não há trigger digit, tentar extrair do patternRule
                if (params.combinedRule && params.combinedRule.patternRule) {
                    const patternRule = params.combinedRule.patternRule;
                    const patternRuleDigit = patternRule._triggerDigit;
                    if (patternRuleDigit !== undefined && patternRuleDigit !== null) {

                        logConfig.info('digit_pattern', `🎯 [${params.predictionType.toUpperCase()}] Previsão do patternRule: ${patternRuleDigit}`);
                        return patternRuleDigit;
                    }
                }

                return null;

            case 'conditional_percentage':
                // 🎯 FIX: Capturar dígito resultante da regra de percentual
                const percentageDigit = params._triggerDigit ?? rule._triggerDigit;
                if (percentageDigit !== undefined && percentageDigit !== null) {

                    return percentageDigit;
                }

                // Fallback: tentar recalcular se necessário
                const recalcDigit = getDigitFromPercentageRule(rule);

                return recalcDigit;

            case 'percentage_digit_inverse':

                let inversePercentageDigit = null;

                // 1. Verificar combinedRule primeiro
                if (params.combinedRule && params.combinedRule.percentageRule) {
                    const percentageRule = params.combinedRule.percentageRule;
                    const tempRule = {
                        type: 'percentage',
                        parameters: percentageRule,
                        _triggerDigit: undefined
                    };
                    inversePercentageDigit = getDigitFromPercentageRule(tempRule);
                }

                // 2. Fallback para triggerRule
                if (inversePercentageDigit === null) {
                    const triggerRule = params.triggerRule || params;
                    inversePercentageDigit = getDigitFromPercentageRule(triggerRule);
                }

                if (inversePercentageDigit !== null) {

                    logConfig.info('digit_pattern', `🎯 [PREDICTION] Dígito do percentual: ${inversePercentageDigit} (DIFFER)`);
                    return inversePercentageDigit;
                }

                break;

            case 'percentage_digit_match':

                let matchPercentageDigit = null;

                // 1. Verificar se há combinedRule com percentageRule
                if (params.combinedRule && params.combinedRule.percentageRule) {
                    const percentageRule = params.combinedRule.percentageRule;

                    // Criar regra temporária para processar
                    const tempRule = {
                        type: 'percentage',
                        parameters: percentageRule,
                        _triggerDigit: undefined
                    };

                    matchPercentageDigit = getDigitFromPercentageRule(tempRule);
                }

                // 2. Verificar se há triggerRule
                if (matchPercentageDigit === null) {
                    const triggerRule = params.triggerRule || params;
                    matchPercentageDigit = getDigitFromPercentageRule(triggerRule);
                }

                if (matchPercentageDigit !== null) {

                    logConfig.info('digit_pattern', `🎯 [PREDICTION] Dígito do percentual (MATCH): ${matchPercentageDigit}`);
                    return matchPercentageDigit;
                }

                break;

            case 'last_digit':
                // 🎯 NOVO: Suportar tipo básico 'last_digit'
                const basicLastDigit = (overrideDigit !== null) ? overrideDigit : processor.getLastDigit();
                if (basicLastDigit === null) return null;
                logConfig.info('digit_pattern', `🎯 [PREDICTION] Último dígito (básico): ${basicLastDigit} ${overrideDigit !== null ? '(Override)' : ''}`);
                return basicLastDigit;

            case 'last_digit_inverse':
                // 🎯 CRÍTICO: Retornar o último dígito para usar em DIGITDIFF
                // DIGITDIFF X = ganho se último dígito ≠ X
                const lastDigit = (overrideDigit !== null) ? overrideDigit : processor.getLastDigit();
                if (lastDigit === null) return null;
                logConfig.info('digit_pattern', `🎯 [PREDICTION] Último dígito: ${lastDigit} ${overrideDigit !== null ? '(Override)' : ''}`);
                return lastDigit;

            case 'last_digit_match':
                // Match do último dígito
                const matchDigit = (overrideDigit !== null) ? overrideDigit : processor.getLastDigit();
                return matchDigit;

            case 'repeated_digit_inverse':
            case 'repeated_digit_match':
                // 🎯 PRIORIDADE 1: Usar trigger digit já capturado durante a verificação da regra
                const storedDigit = params._triggerDigit ?? rule._triggerDigit;
                if (storedDigit !== undefined && storedDigit !== null) {
                    logConfig.info('digit_pattern', `🎯 [PREDICTION] Usando dígito repetido já capturado: ${storedDigit}`);
                    return storedDigit;
                }
                const repeatCount = params.count || 3;
                const repeatedDigit = findDigitRepeatedNTimes(repeatCount);
                if (repeatedDigit === null) return null;
                logConfig.info('digit_pattern', `🎯 [PREDICTION] Dígito repetido ${repeatCount}x: ${repeatedDigit}`);
                return repeatedDigit;

            case 'most_frequent_inverse':
                const period = params.period || 10;
                const mostFrequent = processor.findMostRepeatedDigit(period);
                if (mostFrequent === null) return null;
                logConfig.info('digit_pattern', `🎯 [PREDICTION] Dígito mais frequente: ${mostFrequent}`);
                return mostFrequent;

            case 'last_digit_probability_match':
                let probValue = params.condition?.probabilityVariable ?? params.targetValue;
                if (typeof probValue === 'string' && probValue.startsWith('$')) {
                    const resolver = typeof getProbabilityResolver === 'function' ? getProbabilityResolver() : null;
                    if (resolver) {
                        probValue = resolver.resolve(probValue);
                    }
                }
                logConfig.info('digit_pattern', `🎯 [LAST_DIGIT_PROB_MATCH] Previsão: ${probValue}`);
                return probValue;

            default:
                return null;
        }
    } catch (error) {
        console.error('❌ Erro ao calcular previsão especial:', error);
        return null;
    }
}

// 🎯 NOVA FUNÇÃO: Encontrar dígito que se repetiu N vezes consecutivas
function findDigitRepeatedNTimes(count) {
    try {
        const processor = getDigitPatternRulesInstance();
        const digits = processor.getDigitsForPattern(count + 10); // Buscar mais dígitos para ter certeza

        if (!digits || digits.length < count) {

            return null;
        }

        // Procurar nos últimos dígitos se há uma sequência de N repetições
        for (let i = digits.length - count; i >= 0; i--) {
            const slice = digits.slice(i, i + count);
            const firstDigit = slice[0];

            // Verificar se todos os dígitos da sequência são iguais
            if (slice.every(d => d === firstDigit)) {

                return firstDigit;
            }
        }

        return null;
    } catch (error) {
        console.error('❌ Erro ao encontrar dígito repetido:', error);
        return null;
    }
}

// Singleton para uso global
let digitPatternRulesInstance = null;

function getDigitPatternRulesInstance() {
    if (!digitPatternRulesInstance) {
        digitPatternRulesInstance = new DigitPatternRulesProcessor();
    }
    return digitPatternRulesInstance;
}



// 🎲 GLOBALLY EXECUTED FALLBACK: Ensure ProbabilityResolver exists
(function () {
    if (!window.getProbabilityResolver && !window.ProbabilityResolver) {

        class ProbabilityResolverInline {
            constructor() {
                this.probabilityData = null;
                this.lastUpdate = 0;
            }

            // 🎯 FIX: Adicionar método updateProbabilityData (suporta delay)
            updateProbabilityData(data) {
                // Suporta formato direto (array) ou objeto processado
                if (Array.isArray(data)) {
                    this.probabilityData = {
                        higher: data[0],
                        lower: data[9],
                        sorted: data
                    };
                } else {
                    this.probabilityData = data;
                }
                this.lastUpdate = Date.now();
                return true;
            }

            fetchProbabilityFromComponent() {
                // 🎯 FIX: Respeitar cache/manual updates (evita overwrite de dados Delayed)
                if (this.probabilityData && this.lastUpdate && (Date.now() - this.lastUpdate < 1000)) {
                    return true;
                }

                try {
                    if (typeof MonitoringView !== 'undefined') {
                        // 🎯 USA LÓGICA DE PREVISÃO ANTERIOR SE DISPONÍVEL
                        // Isso corrige o problema onde o dígito que acabou de sair já alterou a probabilidade
                        let calculated = null;

                        if (typeof MonitoringView.getPreviousProbabilities === 'function') {
                            calculated = MonitoringView.getPreviousProbabilities();
                        } else if (typeof MonitoringView.calculateProbabilities === 'function') {
                            calculated = MonitoringView.calculateProbabilities();
                        }

                        if (calculated && calculated.mostProbable !== undefined && calculated.leastProbable !== undefined) {
                            this.probabilityData = {
                                higher: calculated.mostProbable,
                                lower: calculated.leastProbable,
                                higherScore: calculated.mostProbableValue || 0,
                                lowerScore: calculated.leastProbableValue || 0
                            };
                            return true;
                        }
                    }
                    return false;
                } catch (error) {
                    console.error('❌ [FALLBACK] Error fetching probability:', error);
                    return false;
                }
            }

            resolve(variable) {
                this.fetchProbabilityFromComponent();
                if (!this.probabilityData) return null;

                switch (variable) {
                    case '$HIGHER_PROB': return this.probabilityData.higher;
                    case '$LOWER_PROB': return this.probabilityData.lower;
                    case '$HIGHER_PROB_SCORE': return this.probabilityData.higherScore;
                    case '$LOWER_PROB_SCORE': return this.probabilityData.lowerScore;
                    case '$LAST_DIGIT': {
                        const processor = getDigitPatternRulesInstance();
                        return processor ? processor.getLastDigit() : null;
                    }
                    default: return null;
                }
            }

            // 🎯 FIX: Adicionar resolveDelayed para suportar last_digit_probability_match
            resolveDelayed(variable) {


                // Tentar usar calculateProbabilities com excludeLastTick=true
                if (typeof MonitoringView !== 'undefined' && typeof MonitoringView.calculateProbabilities === 'function') {
                    const stats = MonitoringView.calculateProbabilities(true);

                    if (stats && stats.sorted && stats.sorted.length >= 10) {
                        switch (variable) {
                            case '$HIGHER_PROB':

                                return stats.sorted[0];
                            case '$LOWER_PROB':

                                return stats.sorted[9];
                            default:
                                return null;
                        }
                    } else if (stats) {
                        // Fallback para mostProbable/leastProbable se sorted não disponível
                        switch (variable) {
                            case '$HIGHER_PROB':

                                return stats.mostProbable;
                            case '$LOWER_PROB':

                                return stats.leastProbable;
                            case '$LAST_DIGIT':
                                return getDigitPatternRulesInstance().getLastDigit();
                            default:
                                return null;
                        }
                    }
                }

                // Fallback final: usar resolve() normal
                if (variable === '$LAST_DIGIT') {
                    return getDigitPatternRulesInstance().getLastDigit();
                }

                return this.resolve(variable);
            }

            isSpecialVariable(value) {
                if (typeof value !== 'string') return false;
                return value === '$HIGHER_PROB' || value === '$LOWER_PROB' ||
                    value === '$HIGHER_PROB_SCORE' || value === '$LOWER_PROB_SCORE' ||
                    value === '$LAST_DIGIT';
            }

            // Validate probability_check condition
            validateProbabilityCheck(rule) {
                const { target, operator, value } = rule;
                const resolved = this.resolve(target);
                if (resolved === null) return false;

                const factor = resolved;

                switch (operator) {
                    case '==': case '=': return factor === value;
                    case '!=': case '!==': return factor !== value;
                    case '>': return factor > value;
                    case '>=': return factor >= value;
                    case '<': return factor < value;
                    case '<=': return factor <= value;
                    default: return false;
                }
            }

            // Process rule to replace variables in target/value
            processRule(rule) {
                const processed = { ...rule };

                // Resolve TARGET (if it's a variable AND NOT probability_check)
                if (this.isSpecialVariable(processed.target)) {
                    // Special case: For probability_check, target IS the variable checking itself, don't replace it yet
                    // unless we want to convert it to a number for comparison (but validProbabilityCheck resolves it again)
                    if (rule.type === 'probability_check') {
                        processed._probabilityVariable = true;
                    } else {
                        processed.target = this.resolve(processed.target);
                    }
                }

                // Resolve TARGET VALUE (for dynamic prediction)
                if (this.isSpecialVariable(processed.targetValue)) {
                    processed.targetValue = this.resolve(processed.targetValue);
                }

                // Resolve VALUE (for comparisons)
                if (this.isSpecialVariable(processed.value)) {
                    processed.value = this.resolve(processed.value);
                }

                return processed;
            }
        }

        window.ProbabilityResolver = ProbabilityResolverInline;
        window.getProbabilityResolver = function () {
            if (!window._probabilityResolverInstance) {
                window._probabilityResolverInstance = new ProbabilityResolverInline();
            }
            return window._probabilityResolverInstance;
        };

    }
})();
