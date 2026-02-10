
// js/percentage-rules.js
// Sistema de regras baseadas em percentuais de dígitos
// O SISTEMA DEVE SER 100% ISOLADO POR USUARIO

// 🎯 FUNÇÃO CENTRALIZADA: Normalizar regras de percentual para formato consistente
function canonizePercentageRule(rawRule, options = {}) {
    const allowMissingConditionType = options.allowMissingConditionType || false;

    if (!rawRule) return null;

    let params = rawRule;
    if (rawRule.parameters && Object.keys(rawRule.parameters).length > 0 && rawRule.parameters.operator) {
        params = rawRule.parameters;
    }
    if (params.combinedRule?.percentageRule) {
        params = params.combinedRule.percentageRule;
    }

    // Normalizador de Operadores
    const normalizeOp = (op) => {
        if (!op) return '>';
        const o = op.toLowerCase();
        if (o.includes('>') || o.includes('superior') || o.includes('acima') || o.includes('maior')) return (o.includes('=') || o.includes('igual')) ? '>=' : '>';
        if (o.includes('<') || o.includes('inferior') || o.includes('abaixo') || o.includes('menor')) return (o.includes('=') || o.includes('igual')) ? '<=' : '<';
        if (o.includes('=') || o.includes('igual')) return '=';
        return '>';
    };

    const operator = normalizeOp(params.operator);

    let rawTarget = params.targetPercentage !== undefined ? params.targetPercentage : params.threshold;
    let safeTarget = parseFloat(rawTarget);
    if (isNaN(safeTarget) && rawTarget !== undefined) {
        safeTarget = parseFloat(String(rawTarget).replace('%', ''));
    }

    if (safeTarget === undefined || isNaN(safeTarget) || safeTarget < 0 || safeTarget > 100) {
        return null;
    }

    let conditionType = params.conditionType || null;
    let safeValue = params.value !== undefined ? params.value : null;

    if (conditionType) {
        if (conditionType === 'equals') conditionType = 'equal';
        const validConditionTypes = ['below', 'above', 'equal', 'even', 'odd', 'single_digit', 'individual_digits', 'below_or_equal', 'above_or_equal', 'not_equal'];
        if (!validConditionTypes.includes(conditionType)) return null;

        if (['below', 'above', 'equal', 'below_or_equal', 'above_or_equal', 'not_equal'].includes(conditionType)) {
            if (params.value !== '$LAST_DIGIT') {
                safeValue = parseInt(params.value);
                if (isNaN(safeValue)) return null;
            } else {
                safeValue = '$LAST_DIGIT';
            }
        }
    } else if (!allowMissingConditionType) {
        return null;
    }

    return {
        operator: operator,
        targetPercentage: safeTarget,
        conditionType: conditionType,
        value: safeValue,
        period: params.period || 25,
        startIndex: params.startIndex || rawRule.startIndex || null,
        endIndex: params.endIndex || rawRule.endIndex || null,
        allowedDigits: params.allowedDigits !== undefined ? params.allowedDigits : null
    };
}

class PercentageRulesProcessor {
    constructor() {
        this.sessionId = SessionManager.getUserSessionId();
        this.defaultPeriod = 25;

        // Cache para otimizar cálculos
        this.percentageCache = new Map();
        this.lastCacheUpdate = 0;
        this.cacheTimeout = 1000; // 1 segundo
    }

    // Processar regra de percentual
    processPercentageRule(rule, forcedPrice = null) {
        try {
            // ✅ USAR FUNÇÃO CENTRALIZADA para normalização consistente
            const canonical = canonizePercentageRule(rule, { allowMissingConditionType: true });
            if (!canonical) {
                console.error('❌ Regra de percentual inválida:', rule);
                return null;
            }

            // Obter histórico de dígitos para o período especificado (ou intervalo)
            const digits = this.getDigitsForPeriod(canonical.period, canonical.startIndex, canonical.endIndex, forcedPrice);

            if (!digits || digits.length === 0) {
                console.warn('⚠️ Histórico de dígitos insuficiente para cálculo de percentual');
                return {
                    percentage: 0,
                    totalDigits: 0,
                    matchingDigits: 0,
                    sufficient: false
                };
            }

            // Calcular percentual baseado no tipo da regra
            const result = this.calculatePercentage(rule, digits);

            return {
                ...result,
                period: canonical.period,
                sufficient: digits.length >= Math.min(canonical.period, 10) // Pelo menos 10 dígitos ou o período solicitado
            };

        } catch (error) {
            console.error('❌ Erro ao processar regra de percentual:', error);
            return null;
        }
    }

    // Validar regra de percentual usando função centralizada
    validatePercentageRule(rule) {
        if (!rule) {
            return false;
        }

        // 🎯 NOVO: Suporte para regras conditional_percentage (conditionType OPCIONAL)
        if (rule.type === 'dynamic_prediction' && rule.parameters?.predictionType === 'conditional_percentage') {
            const params = rule.parameters;
            const combinedRule = params.combinedRule;

            if (!combinedRule || !combinedRule.percentageRule) {
                console.error('❌ Regra conditional_percentage sem percentageRule');
                return false;
            }

            // ✅ USAR FUNÇÃO CENTRALIZADA com conditionType opcional
            const canonical = canonizePercentageRule(combinedRule.percentageRule, {
                allowMissingConditionType: true
            });

            return canonical !== null;
        }

        // Validação para regras de percentual normais (conditionType OPCIONAL)
        if (rule.type !== 'percentage') {
            return false;
        }

        // ✅ USAR FUNÇÃO CENTRALIZADA com conditionType OPCIONAL
        const canonical = canonizePercentageRule(rule, {
            allowMissingConditionType: true  // ✅ PERMITIR sem conditionType
        });

        return canonical !== null;
    }

    // Obter dígitos para período específico (ou intervalo)
    getDigitsForPeriod(period, startIndex = null, endIndex = null, forcedPrice = null) {
        try {
            const marketData = getMarketDataInstance(SessionManager.getLocalToken());
            if (!marketData) {
                console.error('❌ Market data instance não disponível');
                return [];
            }

            const currentSymbol = window.selectedSymbol || SessionManager.getSessionData('selected_symbol');
            if (!currentSymbol) {
                console.error('❌ [PERCENTAGE] Nenhum ativo selecionado!');
                throw new Error('ERRO: Nenhum ativo selecionado. Recarregue a página.');
            }

            // Se houver intervalo, o período base é o maior índice
            const basePeriod = (startIndex && endIndex) ? Math.max(startIndex, endIndex) : period;
            const history = marketData.getHistoricalTicks(currentSymbol, basePeriod);

            if (history && history.prices && Array.isArray(history.prices) && history.prices.length > 0) {
                // Converter preços para últimos dígitos
                let digits = history.prices.map(price => {
                    return this.extractLastDigit(price);
                }).filter(digit => digit !== null);

                // 🎯 SINCRONIZAÇÃO IMEDIATA (DELAY 0)
                // Se temos um preço forçado, injetar o dígito no final da história real
                if (forcedPrice !== null) {
                    const forcedDigit = this.extractLastDigit(forcedPrice);
                    const lastHistoricalDigit = digits.length > 0 ? digits[digits.length - 1] : null;

                    if (forcedDigit !== null && forcedDigit !== lastHistoricalDigit) {
                        digits.push(forcedDigit);
                    }
                }

                // Aplicar intervalo se houver
                if (startIndex !== null && endIndex !== null) {
                    const reversed = [...digits].reverse();
                    const start = Math.max(startIndex, endIndex);
                    const end = Math.min(startIndex, endIndex);
                    digits = reversed.slice(end - 1, start).reverse();
                }

                return digits;
            }

            return [];
        } catch (error) {
            console.error('❌ Erro ao obter dígitos para período:', error);
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
                console.error('❌ [PERCENTAGE] MarketData ou símbolo não disponível');
                return null;
            }

            // 🎯 USAR O MESMO MÉTODO QUE O RODAPÉ USA
            // Esse método já funciona corretamente
            if (typeof marketData.extractLastDigitForAsset === 'function') {
                const lastDigit = marketData.extractLastDigitForAsset(price, currentSymbol);


                return lastDigit;
            } else {
                console.error('❌ [PERCENTAGE] extractLastDigitForAsset não disponível');
                return null;
            }
        } catch (error) {
            console.error('❌ [PERCENTAGE] Erro ao extrair dígito:', error);
            return null;
        }
    }

    // Calcular percentual baseado no tipo da regra
    calculatePercentage(rule, digits) {
        const params = rule.parameters || rule;
        const totalDigits = digits.length;
        let matchingDigits = 0;

        // 🎯 DETECÇÃO AUTOMÁTICA: Se a descrição menciona "ultimo digito" mas não tem conditionType, usar single_digit
        let effectiveConditionType = params.conditionType;
        if (!effectiveConditionType && rule.description) {
            const desc = rule.description.toLowerCase();
            if (desc.includes('ultimo digito') || desc.includes('último dígito')) {
                effectiveConditionType = 'single_digit';
                console.log('🎯 [AUTO-DETECT] Regra de percentual do último dígito detectada, usando single_digit');
            }
        }

        // ✅ Se não há conditionType, usar dígito da configuração ou allowedDigits
        if (!effectiveConditionType || effectiveConditionType === null) {
            // 🎯 NOVO: Suporte para allowedDigits (lista de dígitos permitidos)
            if (params.allowedDigits && Array.isArray(params.allowedDigits) && params.allowedDigits.length > 0) {
                // Soma ocorrências de TODOS os dígitos permitidos
                matchingDigits = digits.filter(digit => params.allowedDigits.includes(digit)).length;
            } else {
                // Comportamento original (apenas um dígito selecionado)
                const configDigit = window.selectedDigit !== undefined ? window.selectedDigit :
                    (SessionManager.getSessionData('selected_digit') || 0);
                matchingDigits = digits.filter(digit => digit === configDigit).length;
            }
        } else {
            switch (effectiveConditionType) {
                case 'below':
                    matchingDigits = digits.filter(digit => digit < params.value).length;
                    break;

                case 'below_or_equal':
                    matchingDigits = digits.filter(digit => digit <= params.value).length;
                    break;

                case 'above':
                    matchingDigits = digits.filter(digit => digit > params.value).length;
                    break;

                case 'above_or_equal':
                    matchingDigits = digits.filter(digit => digit >= params.value).length;
                    break;

                case 'equal':
                    // ✅ ATUALIZADO: Suporte para "equal" com $LAST_DIGIT
                    if (params.value === '$LAST_DIGIT') {
                        // Usar o último dígito que saiu
                        if (digits.length > 0) {
                            const lastDigit = digits[digits.length - 1];
                            matchingDigits = digits.filter(digit => digit === lastDigit).length;
                        } else {
                            matchingDigits = 0;
                        }
                    } else {
                        matchingDigits = digits.filter(digit => digit === params.value).length;
                    }
                    break;

                case 'not_equal':
                    matchingDigits = digits.filter(digit => digit !== params.value).length;
                    break;

                    // 🔍 DEBUG: Mostrar resultado da comparação
                    if (params.value === 0) {
                        const zerosFound = digits.filter(digit => digit === params.value);

                    }
                    break;

                case 'even':
                    matchingDigits = digits.filter(digit => digit % 2 === 0).length;
                    break;

                case 'odd':
                    matchingDigits = digits.filter(digit => digit % 2 !== 0).length;
                    break;
                case 'single_digit':
                    // ✅ NOVO: Usar o ÚLTIMO dígito que saiu no mercado
                    if (digits.length > 0) {
                        const lastDigit = digits[digits.length - 1];
                        matchingDigits = digits.filter(digit => digit === lastDigit).length;
                    } else {
                        matchingDigits = 0;
                    }
                    break;
                case 'individual_digits':
                    // Para individual_digits, mantém lógica de maior ocorrência
                    const counts = {};
                    digits.forEach(d => counts[d] = (counts[d] || 0) + 1);
                    matchingDigits = Math.max(0, ...Object.values(counts));
                    break;
                default:
                    console.error('❌ Tipo de condição desconhecido:', params.conditionType);
                    return { percentage: 0, totalDigits, matchingDigits: 0 };
            }
        }

        const percentage = totalDigits > 0 ? (matchingDigits / totalDigits) * 100 : 0;

        return {
            percentage: Math.round(percentage * 100) / 100, // Arredondar para 2 casas decimais
            totalDigits,
            matchingDigits
        };
    }

    // 🎯 NOVO: Verificar condição de percentual por dígito individual
    checkIndividualDigitPercentageCondition(rule, forcedPrice = null) {
        try {
            const params = rule.parameters || rule;

            // 🎯 CRÍTICO: Limpar qualquer trigger digit antigo ANTES do cálculo
            delete rule._triggerDigit;
            delete rule._triggerPercentage;
            delete params._triggerDigit;
            delete params._triggerPercentage;
            const period = params.period || this.defaultPeriod;
            const targetPercentage = params.targetPercentage || 32;
            const operator = params.operator || '>';

            // Obter histórico de dígitos ATUAL
            const digits = this.getDigitsForPeriod(period, null, null, forcedPrice);

            if (!digits || digits.length < 10) {

                return false; // Dados insuficientes
            }

            // Calcular percentual de cada dígito
            const digitCounts = {};

            // Inicializar contadores
            for (let i = 0; i <= 9; i++) {
                digitCounts[i] = 0;
            }

            // Contar ocorrências
            digits.forEach(digit => {
                if (digit >= 0 && digit <= 9) {
                    digitCounts[digit]++;
                }
            });

            // Verificar se algum dígito atende à condição ATUAL
            for (let i = 0; i <= 9; i++) {
                const percentage = (digitCounts[i] / digits.length) * 100;
                let meetsCondition = false;

                switch (operator) {
                    case '>':
                        meetsCondition = percentage > targetPercentage;
                        break;
                    case '>=':
                        meetsCondition = percentage >= targetPercentage;
                        break;
                    case '<':
                        meetsCondition = percentage < targetPercentage;
                        break;
                    case '<=':
                        meetsCondition = percentage <= targetPercentage;
                        break;
                    case '=':
                        meetsCondition = Math.abs(percentage - targetPercentage) < 0.1;
                        break;
                }

                if (meetsCondition) {
                    // Salvar qual dígito ATUAL acionou a condição (both rule and params)
                    rule._triggerDigit = i;
                    rule._triggerPercentage = percentage;
                    params._triggerDigit = i;
                    params._triggerPercentage = percentage;

                    return true;
                }
            }


            return false;

        } catch (error) {
            console.error('❌ Erro ao verificar condição de percentual por dígito:', error);
            return false;
        }
    }

    // 🎯 NOVO: Processar regras de conditional_percentage
    checkConditionalPercentageRule(rule) {
        try {
            const params = rule.parameters;
            const combinedRule = params.combinedRule;
            const percentageRule = combinedRule.percentageRule;

            // 🎯 CRÍTICO: Limpar qualquer trigger digit antigo ANTES do cálculo
            delete rule._triggerDigit;
            delete rule._triggerPercentage;
            delete params._triggerDigit;
            delete params._triggerPercentage;

            const period = percentageRule.period || this.defaultPeriod;
            const targetPercentage = percentageRule.targetPercentage;
            const operator = percentageRule.operator;
            const conditionType = percentageRule.conditionType; // Pode ser undefined

            // Obter histórico de dígitos ATUAL
            const digits = this.getDigitsForPeriod(period);

            if (!digits || digits.length < 10) {
                console.warn('⚠️ [CONDITIONAL_PERCENTAGE] Dados insuficientes:', digits?.length || 0);
                return false; // Dados insuficientes
            }

            // Calcular percentual de cada dígito
            const digitCounts = {};
            const digitPercentages = {};

            // Inicializar contadores
            for (let i = 0; i <= 9; i++) {
                digitCounts[i] = 0;
            }

            // Contar ocorrências
            digits.forEach(digit => {
                if (digit >= 0 && digit <= 9) {
                    digitCounts[digit]++;
                }
            });

            // Calcular percentuais
            for (let i = 0; i <= 9; i++) {
                digitPercentages[i] = (digitCounts[i] / digits.length) * 100;
            }

            // 🎯 DETERMINAR QUAIS DÍGITOS ANALISAR
            let digitsToCheck = [];

            if (percentageRule.allowedDigits && Array.isArray(percentageRule.allowedDigits) && percentageRule.allowedDigits.length > 0) {
                // ✅ PRIORIDADE 1: Lista explícita de dígitos (ex: 0,1,2)
                digitsToCheck = percentageRule.allowedDigits;
                // Para allowedDigits, queremos SOMAR os percentuais
                // Se o usuário pedir percentual de (0,1,2) > 30%, ele quer a soma!
            } else if (!conditionType) {
                // ✅ SEM conditionType: Analisar TODOS os dígitos (0-9)
                digitsToCheck = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
            } else {
                // ✅ COM conditionType: Filtrar dígitos específicos
                switch (conditionType) {
                    case 'below':
                        const belowValue = parseInt(percentageRule.value);
                        for (let i = 0; i < belowValue; i++) {
                            digitsToCheck.push(i);
                        }
                        break;
                    case 'below_or_equal':
                        const belowEqualValue = parseInt(percentageRule.value);
                        for (let i = 0; i <= belowEqualValue; i++) {
                            digitsToCheck.push(i);
                        }
                        break;
                    case 'above':
                        const aboveValue = parseInt(percentageRule.value);
                        for (let i = aboveValue + 1; i <= 9; i++) {
                            digitsToCheck.push(i);
                        }
                        break;
                    case 'above_or_equal':
                        const aboveEqualValue = parseInt(percentageRule.value);
                        for (let i = aboveEqualValue; i <= 9; i++) {
                            digitsToCheck.push(i);
                        }
                        break;
                    case 'equal':
                        digitsToCheck.push(parseInt(percentageRule.value));
                        break;
                    case 'even':
                        digitsToCheck = [0, 2, 4, 6, 8];
                        break;
                    case 'odd':
                        digitsToCheck = [1, 3, 5, 7, 9];
                        break;
                }

            }

            // 🎯 CÁLCULO DA CONDIÇÃO: SOMA ou INDIVIDUAL?

            let conditionMet = false;
            let currentMetric = 0;

            // Se for um grupo de dígitos (definido por allowedDigits ou conditionType), SOMAR percentuais
            if ((percentageRule.allowedDigits && percentageRule.allowedDigits.length > 0) || conditionType) {
                // Calcular soma do grupo
                let groupSum = 0;
                for (const i of digitsToCheck) {
                    groupSum += digitPercentages[i];
                }
                currentMetric = groupSum;

                // Verificar condição contra a SOMA
                switch (operator) {
                    case '>': conditionMet = groupSum > targetPercentage; break;
                    case '>=': conditionMet = groupSum >= targetPercentage; break;
                    case '<': conditionMet = groupSum < targetPercentage; break;
                    case '<=': conditionMet = groupSum <= targetPercentage; break;
                    case '=': conditionMet = Math.abs(groupSum - targetPercentage) < 0.1; break;
                }

                // Se condição atendida, definir triggerDigit como o primeiro do grupo (apenas para registro)
                if (conditionMet && digitsToCheck.length > 0) {
                    rule._triggerDigit = digitsToCheck[0];
                }

            } else {
                // Se não há filtro, analisar todos para encontrar o "Melhor Candidato"
                // Para > ou >=: Maior percentual
                // Para < ou <=: Menor percentual

                let bestDigit = null;
                let bestPercentage = -1;

                // Definir valor inicial impossível para garantir seleção
                if (['<', '<='].includes(operator)) {
                    bestPercentage = 999;
                } else {
                    bestPercentage = -1;
                }

                for (const i of digitsToCheck) {
                    const percentage = digitPercentages[i];
                    let isBetter = false;

                    if (['<', '<='].includes(operator)) {
                        // Para menor, buscamos o menor valor
                        if (percentage < bestPercentage) {
                            isBetter = true;
                        }
                    } else {
                        // Para maior/igual/outros, buscamos o maior valor (sinal mais forte)
                        if (percentage > bestPercentage) {
                            isBetter = true;
                        }
                    }

                    if (isBetter) {
                        bestPercentage = percentage;
                        bestDigit = i;
                    }
                }

                // Agora verificar se o MELHOR candidato atende à condição
                if (bestDigit !== null) {
                    let meetsCondition = false;
                    switch (operator) {
                        case '>': meetsCondition = bestPercentage > targetPercentage; break;
                        case '>=': meetsCondition = bestPercentage >= targetPercentage; break;
                        case '<': meetsCondition = bestPercentage < targetPercentage; break;
                        case '<=': meetsCondition = bestPercentage <= targetPercentage; break;
                        case '=': meetsCondition = Math.abs(bestPercentage - targetPercentage) < 0.1; break;
                    }

                    rule._triggerDigit = bestDigit;
                    currentMetric = bestPercentage;
                    conditionMet = meetsCondition;
                }
            }

            // Salvar métrica atual (seja soma ou individual) para exibição visual
            rule._triggerPercentage = currentMetric;
            params._triggerPercentage = currentMetric;
            rule._conditionMet = conditionMet;
            params._conditionMet = conditionMet;

            // Debug
            // console.log(`[PCT_RULE] Checked: ${digitsToCheck} | Sum/Val: ${currentMetric.toFixed(1)}% | Target: ${targetPercentage}% | Met: ${conditionMet}`);

            return conditionMet;

        } catch (error) {
            console.error('❌ Erro ao verificar conditional_percentage:', error);
            return false;
        }
    }

    // Verificar se condição de percentual é atendida
    checkPercentageCondition(rule, forcedPrice = null) {
        try {
            // 🎯 NOVO: Suporte para dynamic_prediction com conditional_percentage E variantes
            if (rule.type === 'dynamic_prediction' &&
                (rule.parameters?.predictionType === 'conditional_percentage' ||
                    rule.parameters?.predictionType === 'percentage_digit_inverse' ||
                    rule.parameters?.predictionType === 'percentage_digit_match')) {
                return this.checkConditionalPercentageRule(rule);
            }

            const params = rule.parameters || rule;

            // 🎯 NOVO: Se for monitoramento por dígito individual
            if (params.conditionType === 'individual_digits' || params.conditionType === 'single_digit' || params.monitorAllDigits) {
                return this.checkIndividualDigitPercentageCondition(rule, forcedPrice);
            }

            const result = this.processPercentageRule(rule, forcedPrice);

            if (!result || !result.sufficient) {
                return false; // Dados insuficientes
            }

            // ✅ CORREÇÃO: Verificar tanto rule.parameters quanto propriedades diretas da rule
            const currentPercentage = result.percentage;
            const targetPercentage = params.targetPercentage;

            // Avaliar condição baseada no operador
            switch (params.operator) {
                case '>':
                    return currentPercentage > targetPercentage;
                case '<':
                    return currentPercentage < targetPercentage;
                case '=':
                    return Math.abs(currentPercentage - targetPercentage) < 0.01; // Tolerância de 0.01%
                case '>=':
                    return currentPercentage >= targetPercentage;
                case '<=':
                    return currentPercentage <= targetPercentage;
                default:
                    return false;
            }

        } catch (error) {
            console.error('❌ Erro ao verificar condição de percentual:', error);
            return false;
        }
    }

    // 🎯 NOVO: Monitorar percentual de cada dígito individual
    // ✅ FORMATO CORRETO: "🔴/🟢 X,X,X%" analisando dígitos ACIMA DE 6 e ABAIXO DE 3
    generateDigitPercentageMonitoring(rule, statusIcon) {
        try {
            const params = rule.parameters || rule;
            const period = params.period || this.defaultPeriod;
            const targetPercentage = params.targetPercentage || 32;
            const operator = params.operator || '>';

            // 🎯 DETECÇÃO AUTOMÁTICA: Se a descrição menciona "ultimo digito" mas não tem conditionType, usar single_digit
            let effectiveConditionType = params.conditionType;
            if (!effectiveConditionType && rule.description) {
                const desc = rule.description.toLowerCase();
                if (desc.includes('ultimo digito') || desc.includes('último dígito')) {
                    effectiveConditionType = 'single_digit';
                }
            }

            // Obter histórico de dígitos
            const digits = this.getDigitsForPeriod(period);

            if (!digits || digits.length < 10) {
                return `${statusIcon} Coletando dados... (${digits?.length || 0}/10)`;
            }

            // Inicializar contadores
            const digitCounts = {};
            const digitPercentages = {};

            for (let i = 0; i <= 9; i++) {
                digitCounts[i] = 0;
            }

            // Contar ocorrências de cada dígito
            digits.forEach(digit => {
                if (digit >= 0 && digit <= 9) {
                    digitCounts[digit]++;
                }
            });

            // Calcular percentuais individuais
            let maxPercentage = 0;
            let dominantDigit = null;

            for (let i = 0; i <= 9; i++) {
                const percentage = (digitCounts[i] / digits.length) * 100;
                digitPercentages[i] = percentage;

                if (percentage > maxPercentage) {
                    maxPercentage = percentage;
                    dominantDigit = i;
                }
            }

            // 🎯 CORRIGIDO: Verificar se há allowedDigits OU conditionType para SOMAR percentuais
            let currentPercentage = 0;
            let displayText = '';

            let digitsToCheck = [];
            const conditionType = effectiveConditionType;

            // 1. Determinar quais dígitos verificar
            if (params.allowedDigits && Array.isArray(params.allowedDigits) && params.allowedDigits.length > 0) {
                digitsToCheck = params.allowedDigits;
            } else if (conditionType) {
                // ✅ COM conditionType: Filtrar dígitos específicos (Igual ao checkConditionalPercentageRule)
                switch (conditionType) {
                    case 'below':
                        for (let i = 0; i < parseInt(params.value); i++) digitsToCheck.push(i);
                        break;
                    case 'above':
                        for (let i = parseInt(params.value) + 1; i <= 9; i++) digitsToCheck.push(i);
                        break;
                    case 'equal':
                        digitsToCheck.push(parseInt(params.value));
                        break;
                    case 'even':
                        digitsToCheck = [0, 2, 4, 6, 8];
                        break;
                    case 'odd':
                        digitsToCheck = [1, 3, 5, 7, 9];
                        break;
                }
            }

            if (digitsToCheck.length > 0) {
                // ✅ SOMA dos percentuais dos dígitos especificados
                currentPercentage = digitsToCheck.reduce((sum, digit) => {
                    return sum + (digitPercentages[digit] || 0);
                }, 0);

                // Arredondar para 1 casa decimal
                currentPercentage = Math.round(currentPercentage * 10) / 10;

                // Formatar display baseado na condição
                // 🎯 CORRIGIDO (V2): Priorizar conditionType (ex: <3) sobre a lista de dígitos
                if (conditionType) {
                    // Formato para condições de intervalo
                    let symbol = '';
                    switch (conditionType) {
                        case 'below': symbol = `<${params.value}`; break;
                        case 'above': symbol = `>${params.value}`; break;
                        case 'equal': symbol = `=${params.value}`; break;
                        case 'even': symbol = 'Pares'; break;
                        case 'odd': symbol = 'Ímpares'; break;
                    }
                    // Ex: "<3 = 32%"
                    displayText = `${symbol} = ${currentPercentage}%`;

                } else if (params.allowedDigits && params.allowedDigits.length > 0) {
                    const digits_str = params.allowedDigits.join(',');
                    displayText = `(${digits_str}): ${currentPercentage}%`;
                }

            } else {
                // 🎯 FORMATO ORIGINAL: Grupos de dígitos (fallback se não houver condição específica)
                let countAbove6 = 0;  // Dígitos 7, 8, 9
                let countBelow3 = 0;  // Dígitos 0, 1, 2
                let countMiddle = 0;  // Dígitos 3, 4, 5, 6

                digits.forEach(digit => {
                    if (digit > 6) {
                        countAbove6++;
                    } else if (digit < 3) {
                        countBelow3++;
                    } else {
                        countMiddle++;
                    }
                });

                const percentAbove6 = Math.round((countAbove6 / digits.length) * 100);
                const percentBelow3 = Math.round((countBelow3 / digits.length) * 100);
                const percentMiddle = Math.round((countMiddle / digits.length) * 100);

                // Usar o maior percentual para comparação (padrão)
                currentPercentage = maxPercentage;
                displayText = `${percentAbove6},${percentBelow3},${percentMiddle}%`;
            }

            // Verificar se condição é atendida
            let conditionMet = false;
            let triggerDigit = null;

            switch (operator) {
                case '>':
                    conditionMet = currentPercentage > targetPercentage;
                    break;
                case '>=':
                    conditionMet = currentPercentage >= targetPercentage;
                    break;
                case '<':
                    conditionMet = currentPercentage < targetPercentage;
                    break;
                case '<=':
                    conditionMet = currentPercentage <= targetPercentage;
                    break;
                case '=':
                    conditionMet = Math.abs(currentPercentage - targetPercentage) < 0.1;
                    break;
            }

            // Se tem allowedDigits, usar o primeiro da lista como trigger
            if (params.allowedDigits && params.allowedDigits.length > 0 && conditionMet) {
                triggerDigit = params.allowedDigits[0];
            } else if (conditionMet) {
                // Sem allowedDigits, procurar dígito que atende individualmente
                for (let i = 0; i <= 9; i++) {
                    const percentage = digitPercentages[i];
                    let meetsCondition = false;

                    switch (operator) {
                        case '>':
                            meetsCondition = percentage > targetPercentage;
                            break;
                        case '>=':
                            meetsCondition = percentage >= targetPercentage;
                            break;
                        case '<':
                            meetsCondition = percentage < targetPercentage;
                            break;
                        case '<=':
                            meetsCondition = percentage <= targetPercentage;
                            break;
                        case '=':
                            meetsCondition = Math.abs(percentage - targetPercentage) < 0.1;
                            break;
                    }

                    if (meetsCondition) {
                        triggerDigit = i;
                        break;
                    }
                }
            }

            // Salvar dados para uso posterior
            rule._digitPercentages = digitPercentages;
            rule._dominantDigit = dominantDigit;
            rule._triggerDigit = triggerDigit;
            rule._conditionMet = conditionMet;
            rule._currentPercentage = currentPercentage; // ✅ NOVO: Salvar percentual calculado

            // 🎯 Ícone de status final
            const finalStatusIcon = conditionMet ? '🟢' : '🔴';

            return `${finalStatusIcon} ${displayText}`;

        } catch (error) {
            console.error('❌ Erro ao gerar monitoramento de dígitos:', error);
            return `${statusIcon} Erro no monitoramento`;
        }
    }


    // Gerar formato visual para regra de percentual


    // 🎯 CORRIGIDO: Gerar formato visual para regra de percentual
    generateVisualFormat(rule, statusIcon) {
        try {
            // 🎯 NOVO: Suporte para conditional_percentage (Dynamic Prediction) e variantes
            if (rule.type === 'dynamic_prediction' &&
                (rule.parameters?.predictionType === 'conditional_percentage' ||
                    rule.parameters?.predictionType === 'percentage_digit_inverse' ||
                    rule.parameters?.predictionType === 'percentage_digit_match')) {
                // Se temos um dígito gatilho (calculado dinamicamente), usar ele
                if (rule._triggerDigit !== undefined) {
                    const percentage = rule._triggerPercentage !== undefined ? Math.round(rule._triggerPercentage) : 0;

                    // 🎯 NOVO: Se for SOMA de grupo (allowedDigits), mostrar o grupo
                    const params = rule.parameters || {};
                    let allowedDigits = params.allowedDigits;
                    let conditionType = params.conditionType;

                    // Verificar se está aninhado em combinedRule (comum em dynamic_prediction)
                    if (params.combinedRule && params.combinedRule.percentageRule) {
                        allowedDigits = allowedDigits || params.combinedRule.percentageRule.allowedDigits;
                        conditionType = conditionType || params.combinedRule.percentageRule.conditionType;
                    }

                    // 🎯 FORMATO CORRIGIDO: Priorizar ConditionType (Pares, Ímpares, <3, etc)
                    if (conditionType) {
                        let symbol = '';
                        // Tentar obter valor do parametro (pode estar na raiz ou aninhado)
                        const val = params.value !== undefined ? params.value :
                            (params.combinedRule?.percentageRule?.value !== undefined ? params.combinedRule.percentageRule.value : 0);

                        switch (conditionType) {
                            case 'below': symbol = `<${val}`; break;
                            case 'below_or_equal': symbol = `≤${val}`; break;
                            case 'above': symbol = `>${val}`; break;
                            case 'above_or_equal': symbol = `≥${val}`; break;
                            case 'equal': symbol = `=${val}`; break;
                            case 'even': symbol = 'Pares'; break;
                            case 'odd': symbol = 'Ímpares'; break;
                            default: symbol = conditionType;
                        }
                        return `${statusIcon} ${symbol} = ${percentage}%`;
                    }

                    if (allowedDigits && Array.isArray(allowedDigits) && allowedDigits.length > 0) {
                        const digitsStr = allowedDigits.join(',');
                        return `${statusIcon} (${digitsStr}) = ${percentage}%`;
                    }

                    // Display padrão (Fallback)
                    return `${statusIcon} ${rule._triggerDigit !== null ? rule._triggerDigit : '?'} = ${percentage}%`;
                }
            }

            // ✅ CORREÇÃO: Priorizar PARAMETERS (onde a edição ocorre) sobre a raiz
            const params = rule.parameters || {};

            // Extrair valores priorizando parameters
            const conditionType = params.conditionType !== undefined ? params.conditionType : rule.conditionType;
            const value = (params.value !== undefined) ? params.value : rule.value;
            const targetPercentage = (params.targetPercentage !== undefined) ? params.targetPercentage : rule.targetPercentage;
            const period = params.period !== undefined ? params.period : rule.period;
            const operator = params.operator !== undefined ? params.operator : rule.operator;

            // Construir objeto de parâmetros unificado para canonização
            const unifiedParams = {
                ...params,
                conditionType,
                value,
                targetPercentage,
                period,
                operator,
                startIndex: params.startIndex || rule.startIndex,
                endIndex: params.endIndex || rule.endIndex,
                allowedDigits: params.allowedDigits !== undefined ? params.allowedDigits : rule.allowedDigits,
                description: rule.description
            };

            const canonical = canonizePercentageRule(unifiedParams, {
                allowMissingConditionType: true
            });

            if (!canonical) {
                return `${statusIcon} Regra inválida`;
            }

            // Obter dados de mercado com token
            const marketData = getMarketDataInstance(SessionManager.getLocalToken());

            if (!marketData) {
                return `${statusIcon} Aguardando dados...`;
            }

            // 🎯 NOVO: Lógica específica para INTERVALOS (#START#END)
            const startIndex = canonical.startIndex;
            const endIndex = canonical.endIndex;

            // Calcular percentual atual
            let currentPercentage = 0;
            let conditionMet = false;
            let rangeDisplay = null;

            if (startIndex && endIndex) {
                // Se for intervalo, calcular manualmente a partir da fatia
                const rangeDigits = this.getDigitsForPeriod(period, startIndex, endIndex);
                if (rangeDigits && rangeDigits.length > 0) {
                    const result = this.calculatePercentage(unifiedParams, rangeDigits);
                    currentPercentage = result.percentage;
                    conditionMet = result.conditionMet;
                    rangeDisplay = `(${startIndex}-${endIndex})`;
                }
            } else {
                // Lógica de período deslizante original
                const stats = marketData.getDigitStats(canonical.period);

                if (canonical.conditionType) {
                    // Lógica baseada no tipo de condição
                    switch (canonical.conditionType) {
                        case 'below':
                            // Soma percentuais de dígitos < value
                            for (let i = 0; i < canonical.value; i++) {
                                currentPercentage += (stats[i] || 0);
                            }
                            break;
                        case 'below_or_equal':
                            // Soma percentuais de dígitos <= value
                            for (let i = 0; i <= canonical.value; i++) {
                                currentPercentage += (stats[i] || 0);
                            }
                            break;
                        case 'above':
                            // Soma percentuais de dígitos > value
                            for (let i = canonical.value + 1; i <= 9; i++) {
                                currentPercentage += (stats[i] || 0);
                            }
                            break;
                        case 'above_or_equal':
                            // Soma percentuais de dígitos >= value
                            for (let i = canonical.value; i <= 9; i++) {
                                currentPercentage += (stats[i] || 0);
                            }
                            break;
                        case 'equal':
                            currentPercentage = (stats[canonical.value] || 0);
                            break;
                        case 'even':
                            [0, 2, 4, 6, 8].forEach(d => currentPercentage += (stats[d] || 0));
                            break;
                        case 'odd':
                            [1, 3, 5, 7, 9].forEach(d => currentPercentage += (stats[d] || 0));
                            break;
                        case 'single_digit':
                            // ✅ NOVO: Usar o percentual do ÚLTIMO dígito que saiu
                            const currentSymbol = window.selectedSymbol || SessionManager.getSessionData('selected_symbol');
                            if (currentSymbol) {
                                const lastPrice = marketData.getCurrentPrice(currentSymbol);
                                const lastDigit = marketData.extractLastDigitForAsset(lastPrice, currentSymbol);
                                if (lastDigit !== null) {
                                    currentPercentage = stats[lastDigit] || 0;
                                    // Guardar para o display
                                    canonical._lastDigit = lastDigit;
                                }
                            }
                            break;
                        case 'individual_digits':
                            // Monitoramento de todos os dígitos individualmente
                            // Usar o maior percentual encontrado
                            const maxPct = Math.max(...Object.values(stats));
                            currentPercentage = maxPct;
                            break;
                    }

                    // Verificar condição
                    conditionMet = this.evaluateCondition(currentPercentage, canonical.operator, canonical.targetPercentage);
                } else {
                    // Se não tem conditionType, usar allowedDigits ou dígito selecionado
                    if (canonical.allowedDigits && Array.isArray(canonical.allowedDigits) && canonical.allowedDigits.length > 0) {
                        // Somar percentuais de todos os dígitos permitidos
                        canonical.allowedDigits.forEach(d => {
                            if (stats[d] !== undefined) currentPercentage += stats[d];
                        });
                    } else {
                        // Comportamento legado
                        const configDigit = window.selectedDigit !== undefined ? window.selectedDigit :
                            (SessionManager.getSessionData('selected_digit') || 0);
                        currentPercentage = stats[configDigit];
                    }
                    conditionMet = this.evaluateCondition(currentPercentage, canonical.operator, canonical.targetPercentage);
                }
            }

            // Formatar display
            let digitsDisplay = '';

            // 🔍 Redundância: Tentar detectar conditionType se estiver faltando ou não for mapeado
            let effectiveCond = canonical.conditionType;
            if (!effectiveCond) {
                // Tenta pegar da regra original se a canonização falhou em propagar
                effectiveCond = params.conditionType || rule.conditionType;
            }

            if (rangeDisplay) {
                digitsDisplay = rangeDisplay;
            } else if (effectiveCond) {
                switch (effectiveCond) {
                    case 'below': digitsDisplay = `<${canonical.value}`; break;
                    case 'below_or_equal': digitsDisplay = `≤${canonical.value}`; break;
                    case 'above': digitsDisplay = `>${canonical.value}`; break;
                    case 'above_or_equal': digitsDisplay = `≥${canonical.value}`; break;
                    case 'equal': digitsDisplay = `=${canonical.value}`; break;
                    case 'even': digitsDisplay = 'pares'; break;
                    case 'odd': digitsDisplay = 'ímpares'; break;
                    case 'single_digit':
                        digitsDisplay = canonical._lastDigit !== undefined ? `${canonical._lastDigit}` : 'último';
                        break;
                    case 'individual_digits': digitsDisplay = 'qualquer'; break;
                }
            }

            if (!digitsDisplay) {
                if (canonical.allowedDigits && Array.isArray(canonical.allowedDigits) && canonical.allowedDigits.length > 0) {
                    digitsDisplay = `${canonical.allowedDigits.join(', ')}`;
                } else {
                    const configDigit = window.selectedDigit !== undefined ? window.selectedDigit :
                        (SessionManager.getSessionData('selected_digit') || 0);
                    digitsDisplay = `${configDigit}`;
                }
            }

            const finalStatusIcon = conditionMet ? '🟢' : '🔴';

            // 🔧 CORREÇÃO CRÍTICA: Mostrar currentPercentage (valor atual) em vez de targetPercentage (valor alvo)
            const percentageDisplay = Math.round(currentPercentage);
            return `${finalStatusIcon} ${digitsDisplay} = ${percentageDisplay}%`;

        } catch (error) {
            console.error('❌ Erro ao gerar formato de percentual:', error);
            return `${statusIcon} Erro no formato`;
        }
    }

    // ✅ NOVO: Avaliar condição de percentual
    evaluateCondition(currentValue, operator, targetValue) {
        if (currentValue === undefined || targetValue === undefined) return false;

        switch (operator) {
            case '>': return currentValue > targetValue;
            case '>=': return currentValue >= targetValue;
            case '<': return currentValue < targetValue;
            case '<=': return currentValue <= targetValue;
            case '=':
            case '==': return Math.abs(currentValue - targetValue) < 0.01;
            default: return currentValue > targetValue; // Default para maior que
        }
    }

    // Gerar formato de display para regra de percentual
    generateDisplayFormat(rule) {
        try {
            // ✅ CORREÇÃO: Priorizar PARAMETERS (onde a edição ocorre) sobre a raiz
            // A raiz pode conter valores antigos que impedem a atualização visual
            const params = rule.parameters || {};

            // Extrair valores priorizando parameters
            const conditionType = params.conditionType !== undefined ? params.conditionType : rule.conditionType;
            const value = (params.value !== undefined) ? params.value : rule.value;
            const targetPercentage = (params.targetPercentage !== undefined) ? params.targetPercentage : rule.targetPercentage;
            const period = params.period !== undefined ? params.period : rule.period;
            const operator = params.operator !== undefined ? params.operator : rule.operator;

            const unifiedParams = {
                ...params,
                conditionType,
                value,
                targetPercentage,
                period,
                operator,
                allowedDigits: params.allowedDigits !== undefined ? params.allowedDigits : rule.allowedDigits
            };

            const canonical = canonizePercentageRule(unifiedParams, {
                allowMissingConditionType: true
            });

            if (!canonical) {
                console.warn('⚠️ Não foi possível normalizar regra de percentual');
                return 'Regra de percentual (parâmetros incompletos)';
            }

            // 🎯 DETECÇÃO AUTOMÁTICA: Se a descrição menciona "ultimo digito" mas não tem conditionType, usar single_digit
            let effectiveConditionType = canonical.conditionType;
            if (!effectiveConditionType && rule.description) {
                const desc = rule.description.toLowerCase();
                if (desc.includes('ultimo digito') || desc.includes('último dígito')) {
                    effectiveConditionType = 'single_digit';
                }
            }

            let conditionText = '';

            // Se não há conditionType, usar allowedDigits ou dígito da configuração
            if (!effectiveConditionType) {
                if (canonical.allowedDigits && Array.isArray(canonical.allowedDigits) && canonical.allowedDigits.length > 0) {
                    conditionText = `dígitos ${canonical.allowedDigits.join(', ')}`;
                } else {
                    const configDigit = window.selectedDigit !== undefined ? window.selectedDigit :
                        (SessionManager.getSessionData('selected_digit') || 0);
                    conditionText = `dígito ${configDigit}`;
                }
            } else {
                switch (effectiveConditionType) {
                    case 'below':
                        conditionText = `dígitos abaixo de ${canonical.value}`;
                        break;
                    case 'below_or_equal':
                        conditionText = `dígitos até ${canonical.value}`;
                        break;
                    case 'above':
                        conditionText = `dígitos acima de ${canonical.value}`;
                        break;
                    case 'above_or_equal':
                        conditionText = `dígitos de ${canonical.value} para cima`;
                        break;
                    case 'equal':
                        conditionText = `dígitos iguais a ${canonical.value}`;
                        break;
                    case 'even':
                        conditionText = 'dígitos pares';
                        break;
                    case 'odd':
                        conditionText = 'dígitos ímpares';
                        break;
                    case 'single_digit':
                        conditionText = 'último dígito';
                        break;
                    case 'individual_digits':
                        conditionText = 'qualquer dígito';
                        break;
                    default:
                        conditionText = `dígitos (${effectiveConditionType})`;
                }
            }

            const operatorText = this.normalizeOperator(canonical.operator);
            const periodText = canonical.period && canonical.period !== 25 ? ` no período de ${canonical.period}` : '';

            // 🎯 NOVO: Texto para intervalo
            let targetText = conditionText;
            if (canonical.startIndex !== undefined && canonical.endIndex !== undefined) {
                targetText = `dígitos #${canonical.startIndex} ao #${canonical.endIndex}`;
            }

            // 🛡️ PROTEÇÃO: Evitar exibir NaN/null
            const displayPercentage = isNaN(canonical.targetPercentage) || canonical.targetPercentage === null ? 0 : canonical.targetPercentage;

            return `Percentual do ${targetText} ${operatorText} ${displayPercentage}%${periodText}`;

        } catch (error) {
            console.error('❌ Erro ao gerar formato de display:', error);
            return 'Regra de percentual não formatada';
        }
    }

    // Normalizar operadores para exibição
    normalizeOperator(operator) {
        const operatorMap = {
            '>': '>',
            '<': '<',
            '=': '=',
            '>=': '≥',
            '<=': '≤'
        };
        return operatorMap[operator] || operator;
    }

    // Extrair parâmetros da regra de percentual
    static extractParameters(rule) {
        const params = {
            type: 'percentage'
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
        // ✅ USAR FUNÇÃO CENTRALIZADA - conditionType OPCIONAL
        const canonical = canonizePercentageRule(params, {
            allowMissingConditionType: true
        });

        if (!canonical) {
            console.error(`❌ Parâmetros de percentual inválidos`);
            return;
        }

        // ✅ Aceitar conditionType opcional
        // Se null, será usado o dígito da configuração

        // Validar operador
        const validOperators = ['>', '<', '=', '>=', '<='];
        if (!params.operator || !validOperators.includes(params.operator)) {
            console.error(`❌ ERRO: Operador inválido: ${params.operator}`);
            params.operator = null;
            return;
        }

        // Validar percentual alvo
        if (params.targetPercentage === undefined || params.targetPercentage < 0 || params.targetPercentage > 100) {
            console.error(`❌ ERRO: Percentual alvo inválido: ${params.targetPercentage}`);
            params.targetPercentage = null;
            return;
        }

        // Validar valor para condições que necessitam
        if (['below', 'above', 'equal', 'below_or_equal', 'above_or_equal', 'not_equal'].includes(params.conditionType)) {
            if (params.value === undefined || params.value < 0 || params.value > 9) {
                console.error(`❌ ERRO: Valor de dígito inválido: ${params.value}`);
                params.value = null;
                return;
            }
        }

        // Validar período
        if (params.period !== undefined && (typeof params.period !== 'number' || params.period < 1 || params.period > 200)) {
            console.warn(`⚠️ Período inválido: ${params.period}. Usando padrão: 25`);
            params.period = 25;
        }


    }
}

// Singleton para uso global
let percentageRulesInstance = null;

function getPercentageRulesInstance() {
    if (!percentageRulesInstance) {
        percentageRulesInstance = new PercentageRulesProcessor();
    }
    return percentageRulesInstance;
}
