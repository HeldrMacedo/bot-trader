
// js/percentage-rules.js
// Sistema de regras baseadas em percentuais de dígitos
// O SISTEMA DEVE SER 100% ISOLADO POR USUARIO

// 🎯 FUNÇÃO CENTRALIZADA: Normalizar regras de percentual para formato consistente
function canonizePercentageRule(rawRule, options = {}) {
    const allowMissingConditionType = options.allowMissingConditionType || false;

    if (!rawRule) {
        return null;
    }

    // 🔧 CORREÇÃO: Extrair parâmetros de diferentes estruturas possíveis
    let params = rawRule.parameters || rawRule;

    // Se temos combinedRule.percentageRule, usar esses parâmetros
    if (params.combinedRule?.percentageRule) {
        params = params.combinedRule.percentageRule;
    }

    // Validar operador (obrigatório)
    const validOperators = ['>', '<', '=', '>=', '<='];
    if (!params.operator || !validOperators.includes(params.operator)) {
        console.error('❌ [CANONIZE] Operador inválido:', params.operator);
        console.error('❌ [CANONIZE] params:', params);
        console.error('❌ [CANONIZE] rawRule:', rawRule);
        return null;
    }

    // Validar targetPercentage (obrigatório)
    if (params.targetPercentage === undefined || params.targetPercentage < 0 || params.targetPercentage > 100) {
        console.error('❌ [CANONIZE] targetPercentage inválido:', params.targetPercentage);
        return null;
    }

    // conditionType é opcional se permitido
    let conditionType = params.conditionType || null;
    let value = params.value !== undefined ? params.value : null;

    if (conditionType) {
        const validConditionTypes = ['below', 'above', 'equal', 'even', 'odd', 'single_digit', 'individual_digits'];
        if (!validConditionTypes.includes(conditionType)) {
            console.error('❌ [CANONIZE] conditionType inválido:', conditionType);
            return null;
        }

        // Validar value para tipos que o necessitam
        if (['below', 'above', 'equal'].includes(conditionType)) {
            if (value === undefined || value === null || value < 0 || value > 9) {
                console.error('❌ [CANONIZE] value inválido para conditionType:', conditionType, value);
                console.error('❌ [CANONIZE] params completos:', params);
                console.error('❌ [CANONIZE] rawRule completo:', rawRule);
                return null;
            }
        }
    } else if (!allowMissingConditionType) {
        console.error('❌ [CANONIZE] conditionType obrigatório para esta regra');
        return null;
    }

    // Retornar formato canonizado
    return {
        operator: params.operator,
        targetPercentage: params.targetPercentage,
        conditionType: conditionType,
        value: value,
        period: params.period || 25,
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
    processPercentageRule(rule) {
        try {
            // Validar parâmetros da regra
            if (!this.validatePercentageRule(rule)) {
                console.error('❌ Regra de percentual inválida:', rule);
                return null;
            }

            // ✅ CORREÇÃO: Verificar tanto rule.parameters quanto propriedades diretas da rule
            const params = rule.parameters || rule;

            // Extrair período (usar padrão se não especificado)
            const period = params.period || this.defaultPeriod;

            // Obter histórico de dígitos para o período especificado
            const digits = this.getDigitsForPeriod(period);

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
                period: period,
                sufficient: digits.length >= Math.min(period, 10) // Pelo menos 10 dígitos ou o período solicitado
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

    // Obter dígitos para período específico
    getDigitsForPeriod(period) {
        try {
            const marketData = getMarketDataInstance(SessionManager.getLocalToken());
            if (!marketData) {
                console.error('❌ Market data instance não disponível');
                return [];
            }

            // ❌ REMOVIDO fallback de R_10 - usar ativo selecionado obrigatoriamente
            const currentSymbol = window.selectedSymbol || SessionManager.getSessionData('selected_symbol');
            if (!currentSymbol) {
                console.error('❌ [PERCENTAGE] Nenhum ativo selecionado!');
                throw new Error('ERRO: Nenhum ativo selecionado. Recarregue a página.');
            }
            const history = marketData.getHistoricalTicks(currentSymbol, period);

            if (history && history.prices && Array.isArray(history.prices) && history.prices.length > 0) {
                // Converter preços para últimos dígitos
                const digits = history.prices.map(price => {
                    return this.extractLastDigit(price);
                }).filter(digit => digit !== null);

                // 🔍 DEBUG: Mostrar os últimos 10 preços e seus dígitos
                if (digits.length > 0) {
                    const last10Prices = history.prices.slice(-10);
                    const last10Digits = digits.slice(-10);

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
        const params = rule.parameters;
        const totalDigits = digits.length;
        let matchingDigits = 0;

        // ✅ Se não há conditionType, usar dígito da configuração ou allowedDigits
        if (!params.conditionType || params.conditionType === null) {
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
            switch (params.conditionType) {
                case 'below':
                    matchingDigits = digits.filter(digit => digit < params.value).length;
                    break;

                case 'above':
                    matchingDigits = digits.filter(digit => digit > params.value).length;
                    break;

                case 'equal':
                    matchingDigits = digits.filter(digit => digit === params.value).length;

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
    checkIndividualDigitPercentageCondition(rule) {
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
            const digits = this.getDigitsForPeriod(period);

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
                    case 'above':
                        const aboveValue = parseInt(percentageRule.value);
                        for (let i = aboveValue + 1; i <= 9; i++) {
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
                // Se não há filtro (analisando todos individualmente para encontrar "algum"), manter lógica de "Melhor Dígito"

                let bestDigit = null;
                let bestPercentage = 0;

                // Primeiro, verificar se algum dígito atende à condição
                for (const i of digitsToCheck) {
                    const percentage = digitPercentages[i];
                    let meetsCondition = false;

                    switch (operator) {
                        case '>': meetsCondition = percentage > targetPercentage; break;
                        case '>=': meetsCondition = percentage >= targetPercentage; break;
                        case '<': meetsCondition = percentage < targetPercentage; break;
                        case '<=': meetsCondition = percentage <= targetPercentage; break;
                        case '=': meetsCondition = Math.abs(percentage - targetPercentage) < 0.1; break;
                    }

                    if (meetsCondition) {
                        bestDigit = i;
                        bestPercentage = percentage;
                        conditionMet = true;
                        break;
                    }
                }

                if (conditionMet) {
                    rule._triggerDigit = bestDigit;
                    currentMetric = bestPercentage;
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
    checkPercentageCondition(rule) {
        try {
            // 🎯 NOVO: Suporte para dynamic_prediction com conditional_percentage
            if (rule.type === 'dynamic_prediction' && rule.parameters?.predictionType === 'conditional_percentage') {
                return this.checkConditionalPercentageRule(rule);
            }

            const params = rule.parameters || rule;

            // 🎯 NOVO: Se for monitoramento por dígito individual
            if (params.conditionType === 'individual_digits' || params.conditionType === 'single_digit' || params.monitorAllDigits) {
                return this.checkIndividualDigitPercentageCondition(rule);
            }

            const result = this.processPercentageRule(rule);

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

            // 🎯 CORRIGIDO: Verificar se há allowedDigits para SOMAR percentuais
            let currentPercentage = 0;
            let displayText = '';

            if (params.allowedDigits && Array.isArray(params.allowedDigits) && params.allowedDigits.length > 0) {
                // ✅ SOMA dos percentuais dos dígitos especificados
                currentPercentage = params.allowedDigits.reduce((sum, digit) => {
                    return sum + (digitPercentages[digit] || 0);
                }, 0);

                // Arredondar para 1 casa decimal
                currentPercentage = Math.round(currentPercentage * 10) / 10;

                // Formato de exibição: "dígitos (X,Y,Z): XX.X%"
                const digits_str = params.allowedDigits.join(',');
                displayText = `(${digits_str}): ${currentPercentage}%`;

            } else {
                // 🎯 FORMATO ORIGINAL: Grupos de dígitos (acima 6, abaixo 3, meio)
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

                // Usar o maior percentual para comparação
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
            // 🎯 NOVO: Suporte para conditional_percentage (Dynamic Prediction)
            if (rule.type === 'dynamic_prediction' && rule.parameters?.predictionType === 'conditional_percentage') {
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

                    if (allowedDigits && Array.isArray(allowedDigits) && allowedDigits.length > 0 && !conditionType) {
                        const digitsStr = allowedDigits.join(',');
                        return `${statusIcon} (${digitsStr}) = ${percentage}%`;
                    }

                    // Display padrão
                    return `${statusIcon} ${rule._triggerDigit} = ${percentage}%`;
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
                allowedDigits: params.allowedDigits !== undefined ? params.allowedDigits : rule.allowedDigits
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

            const stats = marketData.getDigitStats(canonical.period);

            // Calcular percentual atual
            let currentPercentage = 0;
            let conditionMet = false;

            if (canonical.conditionType) {
                // Lógica baseada no tipo de condição
                switch (canonical.conditionType) {
                    case 'below':
                        // Soma percentuais de dígitos < value
                        for (let i = 0; i < canonical.value; i++) {
                            currentPercentage += stats[i];
                        }
                        break;
                    case 'above':
                        // Soma percentuais de dígitos > value
                        for (let i = canonical.value + 1; i <= 9; i++) {
                            currentPercentage += stats[i];
                        }
                        break;
                    case 'equal':
                        currentPercentage = stats[canonical.value];
                        break;
                    case 'even':
                        [0, 2, 4, 6, 8].forEach(d => currentPercentage += stats[d]);
                        break;
                    case 'odd':
                        [1, 3, 5, 7, 9].forEach(d => currentPercentage += stats[d]);
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

            // Formatar display
            let digitsDisplay = '';
            if (canonical.conditionType) {
                switch (canonical.conditionType) {
                    case 'below': digitsDisplay = `<${canonical.value}`; break;
                    case 'above': digitsDisplay = `>${canonical.value}`; break;
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

            let conditionText = '';

            // Se não há conditionType, usar allowedDigits ou dígito da configuração
            if (!canonical.conditionType) {
                if (canonical.allowedDigits && Array.isArray(canonical.allowedDigits) && canonical.allowedDigits.length > 0) {
                    conditionText = `dígitos ${canonical.allowedDigits.join(', ')}`;
                } else {
                    const configDigit = window.selectedDigit !== undefined ? window.selectedDigit :
                        (SessionManager.getSessionData('selected_digit') || 0);
                    conditionText = `dígito ${configDigit}`;
                }
            } else {
                switch (canonical.conditionType) {
                    case 'below':
                        conditionText = `dígitos abaixo de ${canonical.value}`;
                        break;
                    case 'above':
                        conditionText = `dígitos acima de ${canonical.value}`;
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
                        conditionText = `dígitos (${canonical.conditionType})`;
                }
            }

            const operatorText = this.normalizeOperator(canonical.operator);
            const periodText = canonical.period && canonical.period !== 25 ? ` no período de ${canonical.period}` : '';

            return `Percentual do ${conditionText} ${operatorText} ${canonical.targetPercentage}%${periodText}`;

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
        if (['below', 'above', 'equal'].includes(params.conditionType)) {
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
