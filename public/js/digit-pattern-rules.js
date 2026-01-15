// js/digit-pattern-rules.js
// Sistema de regras baseadas em padrões de dígitos (XXOX, OOOOXXO, etc.)
// O SISTEMA DEVE SER 100% ISOLADO POR USUARIO

class DigitPatternRulesProcessor {
    constructor() {
        this.sessionId = SessionManager.getUserSessionId();

        // Cache para otimizar cálculos
        this.patternCache = new Map();
        this.lastCacheUpdate = 0;
        this.cacheTimeout = 1000; // 1 segundo
    }

    // Processar regra de padrão de dígitos
    processDigitPatternRule(rule) {
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
            const digits = this.getDigitsForPattern(patternLength);

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

            // Verificar se o padrão é atendido
            const result = this.analyzeDigitPattern(pattern, digits);

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
    getDigitsForPattern(patternLength) {
        try {
            const marketData = getMarketDataInstance(SessionManager.getLocalToken());
            if (!marketData) {
                console.error('❌ Market data instance não disponível');
                return [];
            }

            // ❌ REMOVIDO fallback de R_10 - usar ativo selecionado obrigatoriamente
            const currentSymbol = window.selectedSymbol || SessionManager.getSessionData('selected_symbol');
            if (!currentSymbol) {
                console.error('❌ [DIGIT PATTERN] Nenhum ativo selecionado!');
                throw new Error('ERRO: Nenhum ativo selecionado. Recarregue a página.');
            }
            // Obter mais dígitos que o necessário para ter certeza
            const history = marketData.getHistoricalTicks(currentSymbol, patternLength + 10);

            if (history && history.prices && Array.isArray(history.prices) && history.prices.length > 0) {
                // Converter preços para últimos dígitos
                const digits = history.prices.map(price => {
                    return this.extractLastDigit(price);
                }).filter(digit => digit !== null);

                return digits;
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
            const marketData = getMarketDataInstance(SessionManager.getLocalToken());
            const currentSymbol = window.selectedSymbol || SessionManager.getSessionData('selected_symbol');

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
    analyzeDigitPattern(pattern, allDigits) {
        try {
            const patternLength = pattern.length;
            const digits = allDigits.slice(-patternLength); // Últimos N dígitos


            // Identificar o dígito "X" (o que mais se repete no padrão)
            const patternAnalysis = this.analyzePatternStructure(pattern);


            // Verificar se os dígitos seguem o padrão
            const result = this.verifyPatternMatch(pattern, digits, patternAnalysis);

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
    verifyPatternMatch(pattern, digits, patternStructure) {
        try {
            // ✅ NOVA ESTRATÉGIA: Usar "dígitos perdedores" baseado no contrato e previsão
            const predictionDigit = this.getPredictionDigit();

            if (predictionDigit === null) {
                // 🚨 NOVO: Mostrar modal explicativo sobre compatibilidade
                this.showPredictionRequiredModal();

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
            const losingDigits = this.getLosingDigits(predictionDigit);

            if (!losingDigits || losingDigits.length === 0) {
                return {
                    isMatch: false,
                    details: {
                        message: 'Não foi possível determinar dígitos perdedores',
                        predictionDigit: predictionDigit,
                        contractType: this.getCurrentContractType()
                    }
                };
            }

            // Testar se algum dígito perdedor funciona como "X" no padrão
            return this.testLosingDigitsAsX(pattern, digits, losingDigits, patternStructure);

        } catch (error) {
            console.error('❌ Erro ao verificar padrão:', error);
            return {
                isMatch: false,
                details: { error: error.message }
            };
        }
    }

    // 🎯 NOVO: Obter dígitos perdedores baseado no tipo de contrato
    getLosingDigits(predictionDigit) {
        try {
            const contractType = this.getCurrentContractType();

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
            // 1. Tentar obter do trade type select (modo BOTH)
            const tradeTypeSelect = document.getElementById('trade-type-select');
            if (tradeTypeSelect && tradeTypeSelect.value && tradeTypeSelect.value !== 'BOTH') {
                return tradeTypeSelect.value;
            }

            // 2. Tentar obter do contract select
            const contractSelect = document.getElementById('contract-select');
            if (contractSelect && contractSelect.value) {
                return contractSelect.value;
            }

            // 3. Fallback para configuração do trade manager
            if (typeof window !== 'undefined' && window.tradeManagerInstance && window.tradeManagerInstance.config) {
                return window.tradeManagerInstance.config.contractType;
            }

            // 4. Último fallback
            console.warn('⚠️ [CONTRACT TYPE] Não foi possível determinar tipo de contrato');
            return 'DIGITDIFF'; // Fallback padrão

        } catch (error) {
            console.error('❌ [CONTRACT TYPE] Erro ao obter tipo de contrato:', error);
            return 'DIGITDIFF'; // Fallback padrão
        }
    }

    // 🎯 NOVO: Testar dígitos perdedores como "X" no padrão (LÓGICA FLEXÍVEL)
    testLosingDigitsAsX(pattern, digits, losingDigits, patternStructure) {
        try {


            // 🎯 NOVA ESTRATÉGIA: Usar testDigitAsX com lógica flexível (não precisa de loop)
            const result = this.testDigitAsX(pattern, digits, null, patternStructure);

            if (result.isMatch) {
                return {
                    isMatch: true,
                    details: {
                        ...result.details,
                        allLosingDigits: losingDigits,
                        contractType: this.getCurrentContractType(),
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
                    contractType: this.getCurrentContractType(),
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

    // 🎯 NOVA LÓGICA: Testar se padrão é válido com dígitos perdedores flexíveis
    testDigitAsX(pattern, digits, xCandidate, patternStructure) {
        try {
            // 🎯 CORREÇÃO CRÍTICA: X pode ser QUALQUER dígito perdedor, não precisa ser o mesmo
            const predictionDigit = this.getPredictionDigit();
            const losingDigits = this.getLosingDigits(predictionDigit);

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
    checkDigitPatternCondition(rule) {
        try {
            const result = this.processDigitPatternRule(rule);

            if (!result || !result.sufficient) {
                return false; // Dados insuficientes
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
            const predictionInput = document.getElementById('prediction-input');

            if (predictionInput && predictionInput.value !== '') {
                const prediction = parseInt(predictionInput.value, 10);
                if (!isNaN(prediction) && prediction >= 0 && prediction <= 9) {
                 
                    return prediction;
                }
            }

            // Fallback: tentar obter da configuração de trade
            if (typeof window !== 'undefined' && window.tradeConfig &&
                window.tradeConfig.prediction !== undefined) {
                const prediction = parseInt(window.tradeConfig.prediction, 10);
                if (!isNaN(prediction) && prediction >= 0 && prediction <= 9) {
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
    getDynamicPredictionFromRules() {
        try {
            // 🔧 CORREÇÃO: Verificar se monitoramento está ativo
            if (typeof MonitoringView !== 'undefined' && MonitoringView.state === 'IDLE') {
                return null;
            }

            // Verificar se há regras traduzidas disponíveis
            if (!window.currentTranslatedRules || !Array.isArray(window.currentTranslatedRules)) {
                return null;
            }

            // Procurar por regras que definem previsão dinâmica
            for (const rule of window.currentTranslatedRules) {
                // 🛡️ CRÍTICO: Só extrair se a regra FOR de previsão ou tiver ação/tipo explícito
                const isExplicitPrediction = rule.type === 'dynamic_prediction' ||
                    rule.predictionAction ||
                    rule.predictionType;

                if (isExplicitPrediction) {
                    const dynamicValue = this.calculateDynamicPrediction(rule);
                    if (dynamicValue !== null) {
                        return dynamicValue;
                    }
                }
            }

            return null;
        } catch (error) {
            console.error('❌ Erro ao obter previsão dinâmica:', error);
            return null;
        }
    }

    // 🎯 NOVO: Calcular previsão baseada em regra dinâmica
    calculateDynamicPrediction(rule) {
        try {
            const params = rule.parameters || rule;

            switch (params.predictionType) {
                case 'last_digit_value':
                    // Ex: "Over 2 se último dígito = 0" → previsão = 2
                    return params.targetValue;

                case 'most_repeated_digit':
                    // Ex: "Differ do dígito que se repetir 3 vezes"
                    return this.findMostRepeatedDigit(params.period || 10);

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
                    const probValue = params.condition?.probabilityVariable ?? params.targetValue;
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
            const marketData = getMarketDataInstance(SessionManager.getLocalToken());
            if (!marketData) return null;

            const currentSymbol = window.selectedSymbol || SessionManager.getSessionData('selected_symbol');
            if (!currentSymbol) return null;

            const history = marketData.getHistoricalTicks(currentSymbol, 1);
            if (history && history.prices && history.prices.length > 0) {
                return this.extractLastDigit(history.prices[history.prices.length - 1]);
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
                return digit === condition.value;
            case 'greater':
                return digit > condition.value;
            case 'less':
                return digit < condition.value;
            default:
                return false;
        }
    }

    // 🚨 NOVO: Mostrar modal explicativo sobre necessidade de previsão
    showPredictionRequiredModal() {
        // 🛑 CRÍTICO: Parar monitoramento para evitar loop de erros
        if (typeof MonitoringView !== 'undefined' && MonitoringView.stopMonitoring) {
            console.warn('⚠️ [MODAL ERROR] Parando monitoramento devido a erro na regra');
            MonitoringView.stopMonitoring();
        }

        // Evitar múltiplos modais simultâneos
        if (document.getElementById('prediction-required-modal')) {
            return;
        }

        const modal = document.createElement('div');
        modal.id = 'prediction-required-modal';
        modal.className = 'prediction-required-modal-overlay';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            backdrop-filter: blur(5px);
            z-index: 20000;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            animation: fadeIn 0.3s ease-out;
        `;

        modal.innerHTML = `
            <div style="
                background: white;
                border-radius: 20px;
                box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
                max-width: 550px;
                width: 90%;
                max-height: 80vh;
                overflow-y: auto;
                border: 3px solid #ff6b35;
            ">
                <div style="
                    background: linear-gradient(135deg, #ff6b35 0%, #f7931e 100%);
                    color: white;
                    padding: 25px 30px;
                    border-radius: 20px 20px 0 0;
                    text-align: center;
                ">
                    <h3 style="margin: 0; font-size: 1.4em; font-weight: 700;">
                        ⚠️ Regra de Padrão Incompatível
                    </h3>
                </div>

                <div style="padding: 30px;">
                    <div style="
                        background: #fff3e0;
                        border-left: 4px solid #ff6b35;
                        padding: 20px;
                        border-radius: 8px;
                        margin-bottom: 25px;
                    ">
                        <h4 style="margin: 0 0 10px 0; color: #e65100; font-size: 1.1rem;">
                            🎯 Problema Detectado:
                        </h4>
                        <p style="margin: 0; color: #bf360c; line-height: 1.5;">
                            As regras de <strong>padrões de dígitos (XXOX, OOOOXXO, etc.)</strong> necessitam
                            de uma previsão definida para funcionar corretamente.
                        </p>
                    </div>

                    <div style="
                        background: #e8f5e8;
                        border-left: 4px solid #4caf50;
                        padding: 20px;
                        border-radius: 8px;
                        margin-bottom: 25px;
                    ">
                        <h4 style="margin: 0 0 10px 0; color: #2e7d32; font-size: 1.1rem;">
                            💡 Como Resolver:
                        </h4>
                        <ul style="margin: 0; padding-left: 20px; color: #1b5e20; line-height: 1.6;">
                            <li><strong>Configure uma previsão:</strong> Digite um dígito de 0 a 9 no campo "Previsão"</li>
                            <li><strong>Use contratos compatíveis:</strong> Como DIGITOVER, DIGITUNDER, DIGITMATCH, etc.</li>
                            <li><strong>Sistema inteligente:</strong> Os "dígitos perdedores" do contrato serão usados como "X" no padrão</li>
                            <li><strong>Exemplo:</strong> OVER 3 usa dígitos 0,1,2,3 como "X" (dígitos que fazem perder)</li>
                        </ul>
                    </div>

                    <div style="
                        background: #f3e5f5;
                        border-left: 4px solid #9c27b0;
                        padding: 15px;
                        border-radius: 8px;
                        margin-bottom: 25px;
                        font-size: 0.9rem;
                    ">
                        <strong>📋 Exemplos:</strong><br>
                        • Padrão XXOX + DIFFER previsão "7" = X pode ser apenas 7<br>
                        • Padrão XXOX + OVER previsão "3" = X pode ser 0,1,2 ou 3<br>
                        • Padrão XXOX + UNDER previsão "6" = X pode ser 6,7,8 ou 9
                    </div>

                    <div style="text-align: center;">
                        <button onclick="this.closest('.prediction-required-modal-overlay').remove()" style="
                            background: linear-gradient(135deg, #4caf50 0%, #45a049 100%);
                            color: white;
                            border: none;
                            padding: 15px 30px;
                            border-radius: 10px;
                            font-size: 1.1em;
                            font-weight: 600;
                            cursor: pointer;
                            transition: all 0.3s ease;
                            box-shadow: 0 4px 12px rgba(76, 175, 80, 0.3);
                        " onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 8px 20px rgba(76, 175, 80, 0.4)';"
                           onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 12px rgba(76, 175, 80, 0.3)';">
                            ✅ Entendi, vou configurar a previsão
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Adicionar estilos CSS se não existirem
        if (!document.getElementById('prediction-required-modal-styles')) {
            const style = document.createElement('style');
            style.id = 'prediction-required-modal-styles';
            style.textContent = `
                @keyframes fadeIn {
                    from { opacity: 0; transform: scale(0.9); }
                    to { opacity: 1; transform: scale(1); }
                }

                .prediction-required-modal-overlay {
                    animation: fadeIn 0.3s ease-out;
                }

                .prediction-required-modal-overlay button:active {
                    transform: translateY(-1px) scale(1.02) !important;
                }
            `;
            document.head.appendChild(style);
        }

        document.body.appendChild(modal);

        // Fechar com ESC
        const handleEsc = (e) => {
            if (e.key === 'Escape') {
                modal.remove();
                document.removeEventListener('keydown', handleEsc);
            }
        };
        document.addEventListener('keydown', handleEsc);

        // Fechar clicando fora
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
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
                    const predictionAction = (params.predictionAction || '').toLowerCase();
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

                    // Prioridade 1: Previsões Especiais (Inverse, Repeat, etc)
                  
                    if (predictionType && predictionType !== 'conditional_value') {
                        const specialVal = calculateSpecialDynamicPrediction(rule, overrideDigit);
                    
                        if (specialVal !== null) {
                            predictionValue = specialVal;
                          
                        }
                    }

                    // Prioridade 2: Valores explícitos (TargetValue)
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
                // 🎯 NOVO: Para regras como "Entrar differ do digito que se repetir 2 vezes"
                // O trigger digit foi capturado durante a verificação do padrão
                const patternDigit = params._triggerDigit ?? rule._triggerDigit;
                if (patternDigit !== undefined && patternDigit !== null) {

                    logConfig.info('digit_pattern', `🎯 [CONDITIONAL_PATTERN] Previsão: ${patternDigit}`);
                    return patternDigit;
                }

                // Se não há trigger digit, tentar extrair do patternRule
                if (params.combinedRule && params.combinedRule.patternRule) {
                    const patternRule = params.combinedRule.patternRule;
                    const patternRuleDigit = patternRule._triggerDigit;
                    if (patternRuleDigit !== undefined && patternRuleDigit !== null) {

                        logConfig.info('digit_pattern', `🎯 [CONDITIONAL_PATTERN] Previsão do patternRule: ${patternRuleDigit}`);
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
                // Check both params and rule for the trigger digit
                const storedDigit = params._triggerDigit ?? rule._triggerDigit;
                if (storedDigit !== undefined && storedDigit !== null) {
                    logConfig.info('digit_pattern', `🎯 [PREDICTION] Usando dígito repetido já capturado: ${storedDigit}`);
                    return storedDigit;
                }

                // Fallback: Detectar dígito que se repetiu X vezes (se não foi capturado)
                const repeatCount = params.count || 3;
                const repeatedDigit = findDigitRepeatedNTimes(repeatCount);
                if (repeatedDigit === null) {
                
                    return null;
                }

                logConfig.info('digit_pattern', `🎯 [PREDICTION] Dígito repetido ${repeatCount}x: ${repeatedDigit}`);
                return repeatedDigit;

            case 'most_frequent_inverse':
                // 🎯 CRÍTICO: Retornar o dígito mais frequente para usar em DIGITDIFF
                // DIGITDIFF X = ganho se último dígito ≠ X
                const period = params.period || 10;
                const mostFrequent = processor.findMostRepeatedDigit(period);
                if (mostFrequent === null) return null;
                logConfig.info('digit_pattern', `🎯 [PREDICTION] Dígito mais frequente: ${mostFrequent}`);
                return mostFrequent;

            case 'last_digit_probability_match':
                // Ex: "Entrar differ quando último dígito = menor chance"
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
                            default:
                                return null;
                        }
                    }
                }

                // Fallback final: usar resolve() normal

                return this.resolve(variable);
            }

            isSpecialVariable(value) {
                if (typeof value !== 'string') return false;
                return value === '$HIGHER_PROB' || value === '$LOWER_PROB' ||
                    value === '$HIGHER_PROB_SCORE' || value === '$LOWER_PROB_SCORE';
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
