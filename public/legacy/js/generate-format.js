// js/generate-format.js
// Sistema centralizado de geração de formatos para regras de trading
// O SISTEMA DEVE SER 100% ISOLADO POR USUARIO

class FormatGenerator {
    constructor() {
        this.sessionId = JSON.parse(localStorage.getItem('deriv_accounts'))?.[0]?.selectedLoginId || null;
    }

    getGlobalCountRepeated() {
        // 1. Tentar pelo DOM (prioridade se a aba estiver aberta)
        const checkbox = document.getElementById('count-repeated-digits-input');
        if (checkbox) {
            const val = checkbox.checked;

            return val;
        }

        // 2. Tentar pelo TradeManager (se iniciado)
        if (window.tradeManager && window.tradeManager.config && window.tradeManager.config.countRepeated !== undefined) {
            const val = window.tradeManager.config.countRepeated;

            return val;
        }

        try {
            const loginid = localStorage.getItem('current_user_loginid');
            if (loginid) {
                const saved = localStorage.getItem(`trade_config_user_${loginid}`);
                if (saved) {
                    const data = JSON.parse(saved);
                    const config = data.config || data;
                    if (config.countRepeated !== undefined) {
                        console.error(`[STORE-LOG] LocalStorage found, countRepeated: ${config.countRepeated}`);
                        return config.countRepeated;
                    }
                }
            }
        } catch (e) { }

        // 4. Default
        console.error(`[DEFAULT-LOG] No source found, using default: true`);
        return true;
    }

    // 🎯 FUNÇÃO AUXILIAR: Obter ativo selecionado (SEM FALLBACKS)
    getSelectedSymbol() {
        const globalSymbol = window.selectedSymbol;
        const sessionSymbol = localStorage.getItem('selectedSymbol');
        const displaySymbol = window.displayViewInstance?.currentSymbol;
        const selectedSymbol = globalSymbol || sessionSymbol || displaySymbol;

        if (!selectedSymbol) {
            console.error('❌ [FORMAT GENERATOR] CRÍTICO: Nenhum ativo selecionado!');
            throw new Error('ERRO CRÍTICO: Nenhum ativo foi selecionado. Recarregue a página.');
        }

        return selectedSymbol;
    }

    // Gerar formato de display para cada tipo de regra
    generateDisplayFormat(rule) {


        switch (rule.type) {
            case 'last_digits': {
                const params = rule.parameters || rule;
                const count = params.count || rule.count;
                const value = params.value !== undefined ? params.value : rule.value;
                const operator = params.operator || rule.operator;

                // 🎯 NOVO: Suporte para intervalo
                const startIndex = params.startIndex || rule.startIndex;
                const endIndex = params.endIndex || rule.endIndex;

                const operatorSymbol = this.normalizeOperator(operator);

                if (startIndex && endIndex) {
                    return `Dígitos #${startIndex} ao #${endIndex}: ${operatorSymbol} ${value}`;
                }
                const finalCount = count || 1;
                return `Últimos ${finalCount} dígitos: ${operatorSymbol} ${value}`;
            }

            case 'rsi': {
                const params = rule.parameters || rule;
                const period = params.period || rule.period || 14;
                const value = params.value !== undefined ? params.value : rule.value;
                const operator = params.operator || rule.operator;

                const operatorRsi = this.normalizeOperator(operator);
                return `RSI(${period}) ${operatorRsi} ${value}`;
            }

            case 'sma': {
                const params = rule.parameters || rule;
                const period1 = params.period1 || rule.period1;
                const period2 = params.period2 || rule.period2;
                const period = params.period || rule.period || 14;
                const value = params.value !== undefined ? params.value : rule.value;
                const operator = params.operator || rule.operator;
                const supportLevel = params.supportLevel || rule.supportLevel;
                const resistanceLevel = params.resistanceLevel || rule.resistanceLevel;

                if (period2) {
                    // Comparação entre dois SMAs: SMA(80) > SMA(20)
                    const operatorSma = this.normalizeOperator(operator);
                    return `SMA(${period1 || 14}) ${operatorSma} SMA(${period2})`;
                } else if (supportLevel || resistanceLevel) {
                    // SMA comparado com suporte/resistência
                    const level = supportLevel ? 'Suporte' : 'Resistência';
                    const operatorSma = this.normalizeOperator(operator);
                    return `SMA(${period}) ${operatorSma} ${level}`;
                } else {
                    // SMA comparado com valor fixo
                    const operatorSma = this.normalizeOperator(operator);
                    return `SMA(${period}) ${operatorSma} ${value}`;
                }
            }

            case 'support': {
                const params = rule.parameters || rule;
                const period = params.period || rule.period || 100;
                const operator = params.operator || rule.operator;
                const operatorSup = this.normalizeOperator(operator);
                return `Último tick ${operatorSup} Suporte(${period})`;
            }

            case 'resistance': {
                const params = rule.parameters || rule;
                const period = params.period || rule.period || 100;
                const operator = params.operator || rule.operator;
                const operatorRes = this.normalizeOperator(operator);
                return `Último tick ${operatorRes} Resistência(${period})`;
            }

            case 'price_move': {
                const params = rule.parameters || rule;
                const direction = (params.direction || rule.direction) === 'up' ? '↗️ subir' : '↘️ descer';
                const operator = params.operator || rule.operator;
                const points = params.points || rule.points;
                const operatorPrice = operator ? ` ${this.normalizeOperator(operator)}` : '';
                return `Preço ${direction}${operatorPrice} ${points} pontos`;
            }

            case 'sequence': {
                const params = rule.parameters || rule;
                const direction = (params.direction || rule.direction) === 'up' ? '↗️ subindo' : '↘️ descendo';
                const count = params.count || rule.count;
                return `${count} ticks consecutivos ${direction}`;
            }

            case 'isolated_digits': {
                const params = rule.parameters || rule;
                const count = params.count || rule.count || 2;
                const operator = params.operator || rule.operator || '>';
                const value = params.value !== undefined ? params.value : rule.value;
                return `Entrar após ${count} dígitos isolados ${operator} ${value}`;
            }

            case 'level': {
                const params = rule.parameters || rule;
                const levelType = (params.level_type || rule.level_type) === 'resistance' ? 'Resistência' : 'Suporte';
                const action = (params.action || rule.action) === 'break' ? 'quebrar' : 'atingir';
                const value = params.value !== undefined ? params.value : rule.value;
                return `${action} ${levelType} ${value}`;
            }

            case 'percentage': {
                const percentageProcessor = getPercentageRulesInstance();
                return percentageProcessor.generateDisplayFormat(rule);
            }

            case 'digit_repetition': {
                const params = rule.parameters || rule;
                const repetitionCount = params.count || rule.count || 2;
                const startIndex = params.startIndex || rule.startIndex;
                const endIndex = params.endIndex || rule.endIndex;

                if (startIndex && endIndex) {
                    return `Repetição de dígitos (#${startIndex} ao #${endIndex})`;
                }
                return `Últimos ${repetitionCount} dígitos repetindo`;
            }

            case 'digit_parity': { // Nova regra para paridade de dígitos
                const params = rule.parameters || rule;
                const parityCount = params.count || rule.count || 1;
                const parity = params.parity || rule.parity;
                const parityLabel = parity === 'par' || parity === 'even' ? 'pares' : 'ímpares';

                const startIndex = params.startIndex || rule.startIndex;
                const endIndex = params.endIndex || rule.endIndex;

                if (startIndex && endIndex) {
                    return `Dígitos #${startIndex} ao #${endIndex} ${parityLabel}`;
                }
                return `Últimos ${parityCount} dígito${parityCount > 1 ? 's' : ''} ${parityLabel}`;
            }

            case 'digit_pattern': { // Nova regra para padrões de dígitos
                const params = rule.parameters || rule;
                const pattern = params.pattern || rule.pattern || '';
                return `Padrão de dígitos: ${pattern}`;
            }

            case 'allowed_digits': { // Nova regra para dígitos permitidos
                const params = rule.parameters || rule;
                const allowedCount = params.count || rule.count || 1;
                let allowedList = params.allowedDigits || rule.allowedDigits || [];

                // 🎯 FIX: Garantir que seja array para evitar erro no .join()
                if (typeof allowedList === 'string') {
                    allowedList = allowedList.split(',').map(d => d.trim()).filter(d => d !== '');
                }

                return `Últimos ${allowedCount} dígito${allowedCount > 1 ? 's' : ''} = (${Array.isArray(allowedList) ? allowedList.join(',') : allowedList})`;
            }

            case 'dynamic_prediction': {
                const params = rule.parameters || rule;
                const predType = params.predictionType || 'conditional_value';

                const count = rule.count || params.count || params.period || 1;
                const target = rule.targetValue !== undefined ? rule.targetValue : params.targetValue;
                const cond = params.condition || {};

                if (predType === 'conditional_value' && (cond.type || cond.operator) && target !== undefined) {
                    // 🎯 FIX: Suporte específico para digit_parity caindo como conditional_value
                    if (cond.type === 'digit_parity' || cond.type === 'parity') {
                        const parity = cond.value || 'par';
                        const parityText = (parity === 'par' || parity === 'even') ? 'pares' : 'ímpares';
                        const action = String(rule.predictionAction || params.predictionAction || '').toUpperCase();

                        // Evitar duplicação "Entrar ODD odd"
                        let prefix = `Entrar ${target}`;
                        if (action && action !== String(target) && action !== String(target).toUpperCase()) {
                            prefix = `Entrar ${action} ${target}`;
                        } else if (action && !target) {
                            prefix = `Entrar ${action}`;
                        }

                        return `${prefix} quando últimos ${count} dígitos ${parityText}`;
                    }

                    const op = this.normalizeOperator(cond.type || cond.operator);
                    const val = cond.value;
                    const action = String(rule.predictionAction || params.predictionAction || '').toUpperCase();
                    const actionText = (action && action !== String(target) && action !== String(target).toUpperCase()) ? `${action} ` : '';
                    return `Entrar ${actionText}${target} quando últimos ${count} dígitos ${op} ${val}`;
                } else if (predType === 'conditional_percentage') {
                    // 🎯 NOVO: Regras híbridas com percentual
                    const combinedRule = params.combinedRule;
                    if (combinedRule && combinedRule.percentageRule) {
                        const percentageRule = combinedRule.percentageRule;
                        const percentage = percentageRule.targetPercentage || 55;
                        const operator = this.normalizeOperator(percentageRule.operator || '>=');
                        const condType = percentageRule.conditionType;
                        const value = percentageRule.value;

                        let conditionText = '';
                        if (condType === 'above') {
                            conditionText = `dígitos superiores ${value}`;
                        } else if (condType === 'below') {
                            conditionText = `dígitos inferiores a ${value}`;
                        } else if (condType === 'even') {
                            conditionText = 'pares';
                        } else if (condType === 'odd') {
                            conditionText = 'ímpares';
                        } else if (condType === 'equal') {
                            conditionText = `dígitos = ${value}`;
                        }

                        if (target !== undefined) {
                            return `Entrar ${target} se percentual dos ${conditionText} ${operator} ${percentage}%`;
                        } else {
                            // Sem contrato especificado - mostrar apenas a condição
                            return `Percentual dos ${conditionText} ${operator} ${percentage}%`;
                        }
                    }
                    return `Entrar ${target} com condição de percentual`;
                } else if (predType === 'conditional_pattern') {
                    // 🎯 NOVO: Regras híbridas com padrão
                    const combinedRule = params.combinedRule;
                    if (combinedRule && combinedRule.patternRule) {

                        // ✅ NORMALIZAR: Converter 'pattern' → 'digit_pattern'
                        const patternRule = normalizePatternRuleType(combinedRule.patternRule);

                        if (patternRule.type === 'digit_repetition' && params.count) {
                            patternRule.count = params.count;
                        }
                        const patternText = this.interpretPatternRule(patternRule);

                        const action = String(params.predictionAction || target || '');
                        if (action !== '') {
                            const actionUpper = action.toUpperCase();

                            const targetStr = String(target || '');
                            if (targetStr === action || (targetStr !== '' && targetStr.toLowerCase() === action.toLowerCase())) {
                                return `Entrar ${actionUpper} quando ${String(patternText || '').toLowerCase()}`;
                            }
                            return `Entrar ${actionUpper} do ${String(patternText || '').toLowerCase()}`;
                        }

                        return `Previsão dinâmica: ${patternText}`;
                    }
                    return `Previsão dinâmica com padrão`;
                } else if (predType === 'conditional_probability_accuracy') {
                    // 🎯 NOVO: Regras híbridas com precisão de probabilidade
                    const combinedRule = params.combinedRule;
                    if (combinedRule && combinedRule.probabilityAccuracyRule) {
                        const accRule = combinedRule.probabilityAccuracyRule;
                        const threshold = accRule.value || 60;
                        const operator = this.normalizeOperator(accRule.operator || '>=');

                        return `Entrar ${target} se precisão da IA ${operator} ${threshold}%`;
                    }
                    return `Entrar ${target} com condição de precisão`;
                } else if (predType === 'last_digit_value' && target !== undefined) {
                    return `Entrar ${target} quando último dígito = ${cond.value}`;
                } else if (predType === 'percentage_digit_inverse' || predType === 'percentage_digit_match') {
                    // Nova regra: "differ/match do dígito com percentual > X%"
                    const operation = predType === 'percentage_digit_inverse' ? 'differ' : 'match';
                    const combinedRule = params.combinedRule;
                    if (combinedRule && combinedRule.percentageRule) {
                        const percentageRule = combinedRule.percentageRule;
                        const percentage = percentageRule.targetPercentage || 32;
                        const operator = this.normalizeOperator(percentageRule.operator || '>');
                        return `Entrar ${operation} do dígito quando percentual ${operator} ${percentage}%`;
                    }
                    return `Entrar ${operation} do dígito com percentual`;
                } else if (predType === 'last_digit_probability_match') {
                    // 🎯 NOVO: Regras com condição de último dígito == variável de probabilidade
                    const condition = params.condition || {};
                    const probVar = condition.probabilityVariable;
                    const action = (params.predictionAction || 'match').toUpperCase();
                    const count = parseInt(params.count || 1);

                    let varText = 'variável';
                    if (probVar === '$LOWER_PROB') varText = 'menor chance';
                    if (probVar === '$HIGHER_PROB') varText = 'maior chance';

                    const label = count > 1 ? `últimos ${count} dígitos` : 'último dígito';
                    return `Entrar ${action} quando ${label} = ${varText}`;
                } else if (predType === 'conditional_sma') {
                    const combinedRule = params.combinedRule;
                    if (combinedRule && combinedRule.smaRule) {
                        const smaRule = combinedRule.smaRule;
                        const period = smaRule.period || 14;
                        const op = this.normalizeOperator(smaRule.operator || '>');
                        const val = smaRule.value || 0;
                        return `Entrar ${target} se SMA(${period}) ${op} ${val}`;
                    }
                    return `Entrar ${target} com condição SMA`;
                } else if (predType === 'conditional_rsi') {
                    const combinedRule = params.combinedRule;
                    if (combinedRule && combinedRule.rsiRule) {
                        const rsiRule = combinedRule.rsiRule;
                        const period = rsiRule.period || 14;
                        const op = this.normalizeOperator(rsiRule.operator || '>');
                        const val = rsiRule.value || 0;
                        return `Entrar ${target} se RSI(${period}) ${op} ${val}`;
                    }
                    return `Entrar ${target} com condição RSI`;
                } else if (predType === 'last_digit') {
                    const action = (params.predictionAction || '').toUpperCase();
                    return `Entrar ${action} do último dígito`;
                } else {
                    return `Previsão dinâmica: ${rule.description || 'condição personalizada'}`;
                }
            }


            case 'probability_check': {
                const params = rule.parameters || rule;
                const target = params.target || '';
                const operator = this.normalizeOperator(params.operator || '==');
                const value = params.value !== undefined ? params.value : '';

                // Caso 1: Comparando ÚLTIMO DÍGITO com VARIÁVEL (Ex: ultimo digito = menor chance)
                if (target === 'last_digit') {
                    let varText = value;
                    if (value === '$LOWER_PROB') varText = 'Menor Chance';
                    if (value === '$HIGHER_PROB') varText = 'Maior Chance';
                    return `Último Dígito ${operator} ${varText}`;
                }

                // Caso 2: Comparando VARIÁVEL com NÚMERO (Ex: menor chance <= 2)
                let targetText = target;
                if (target === '$LOWER_PROB') targetText = 'Dígito Menor Chance';
                if (target === '$HIGHER_PROB') targetText = 'Dígito Maior Chance';
                if (target === '$LOWER_PROB_VALUE') targetText = 'Percentual Menor Chance';
                if (target === '$HIGHER_PROB_VALUE') targetText = 'Percentual Maior Chance';

                // Se for percentual, adicionar % no visual se não tiver
                let displayValue = value;
                if (target.includes('_VALUE') && !String(value).includes('%')) {
                    displayValue += '%';
                }

                return `${targetText} ${operator} ${displayValue}`;
            }

            // 🔄 MIGRAÇÃO: Suporte para tipos de regras antigas (backward compatibility)
            case 'dynamic_target_on_repetition': {
                // Tipo antigo que foi substituído por dynamic_prediction + conditional_pattern
                const count = rule.count || rule.parameters?.count || 2;
                const action = rule.action || rule.parameters?.action || 'differ';

                console.warn(`⚠️ [FORMAT-GENERATOR] Tipo de regra antiga detectado: ${rule.type}. Usando formatação de compatibilidade.`);

                return `Entrar ${action.toUpperCase()} do dígito que se repetir ${count} vezes`;
            }

            case 'probability_accuracy': {
                const params = rule.parameters || rule;
                const threshold = params.value !== undefined ? params.value : 60;
                const operator = this.normalizeOperator(params.operator || '>=');
                return `Precisão da probabilidade IA ${operator} ${threshold}%`;
            }

            case 'sma_crossover': {
                const params = rule.parameters || rule;
                const p1 = params.period1 || rule.period1 || 14;
                const p2 = params.period2 || rule.period2 || 50;
                const dir = (params.direction || rule.direction || 'up') === 'up' ? 'subindo ↗️' : 'descendo ↘️';
                return `Cruzamento SMA(${p1}) com SMA(${p2}) ${dir}`;
            }

            default:
                return rule.description || 'Regra não formatada';
        }
    }

    // Cache para evitar logs duplicados
    static formatCache = new Map();
    static lastLogTime = new Map();

    // Gerar formato visual simplificado para cada regra (usado no monitoring)
    generateVisualFormat(rule, statusIcon) {
        const cacheKey = `${rule.id}_${statusIcon}`;
        const now = Date.now();
        const lastLog = FormatGenerator.lastLogTime.get(cacheKey) || 0;

        // ⚡ OTIMIZAÇÃO: Reduzir tempo de log para melhor sincronização
        const shouldLog = (now - lastLog) > 2000;

        if (shouldLog) {

            FormatGenerator.lastLogTime.set(cacheKey, now);
        }

        switch (rule.type) {
            case 'last_digits': {

                const params = rule.parameters || {};
                // 🔧 CORREÇÃO: Priorizar rule.count (atualizado) sobre params.count (original)
                const count = rule.count || params.count;
                const operator = rule.operator || params.operator;
                const value = (rule.value !== undefined) ? rule.value : ((params.value !== undefined) ? params.value : undefined);

                // 🎯 NOVO: Suporte para intervalo
                const startIndex = rule.startIndex || params.startIndex;
                const endIndex = rule.endIndex || params.endIndex;

                // VALIDAÇÃO RIGOROSA: Count ou Range deve ser válido
                const expectedCount = (startIndex && endIndex) ? (Math.abs(startIndex - endIndex) + 1) : count;

                if (!expectedCount || typeof expectedCount !== 'number' || expectedCount < 1 || expectedCount > 100) {
                    console.error(`❌ Valor de contagem inválido na regra:`, rule);
                    return `${statusIcon} ERRO: Contagem inválida`;
                }

                // Obter os dígitos (com suporte a intervalo)
                const countRepeated = this.getGlobalCountRepeated();
                const digits = this.getRecentDigitsFromMarket(count, null, countRepeated, startIndex, endIndex);

                if (digits === null) {
                    console.error(`❌ Dados indisponíveis`);
                    return `${statusIcon} ERRO: Dados indisponíveis`;
                }

                let digitsDisplay;

                try {
                    // Se temos a quantidade exata ou mais, usar os dígitos como estão
                    if (digits.length >= expectedCount) {
                        digitsDisplay = digits.join(',');
                    } else if (digits.length > 0) {
                        // Se temos alguns dígitos, mas não o suficiente, preencher com X
                        const missingCount = expectedCount - digits.length;
                        const placeholders = Array(missingCount).fill('X');
                        digitsDisplay = [...placeholders, ...digits].join(',');
                    } else {
                        // Se não temos nenhum dígito, mostrar apenas X's
                        const placeholders = Array(expectedCount).fill('X');
                        digitsDisplay = placeholders.join(',');
                    }
                } catch (error) {
                    console.error(`❌ Erro ao gerar formato visual para regra ${rule.id}:`, error);
                    return `${statusIcon} ERRO: ${error.message}`;
                }

                const finalFormat = `${statusIcon} ${digitsDisplay}`;

                // Verificar se o formato mudou antes de logar
                const previousFormat = FormatGenerator.formatCache.get(cacheKey);
                if (shouldLog || finalFormat !== previousFormat) {
                    FormatGenerator.formatCache.set(cacheKey, finalFormat);
                }

                return finalFormat;

            }

            case 'digit_repetition':
                // 🔧 CORREÇÃO: Priorizar rule.count
                const repetitionCount = rule.count || rule.parameters?.count || 2;
                const repetitionDigits = this.getLastNDigitsFromMarketData(repetitionCount) || [];
                const repetitionDisplay = repetitionDigits.length > 0 ? `[${repetitionDigits.join(',')}]` : '[?]';
                return `${statusIcon} ${repetitionCount} dígitos repetidos ${repetitionDisplay}`;

            case 'digit_parity': {
                const parityParams = rule.parameters || rule;
                const parityCount = rule.count || parityParams.count || 1;
                const startIndex = rule.startIndex || parityParams.startIndex;
                const endIndex = rule.endIndex || parityParams.endIndex;
                const parity = rule.parity || parityParams.parity || 'par';
                const countRepeated = this.getGlobalCountRepeated();

                // Obter dígitos do intervalo ou últimos N
                const parityDigits = this.getRecentDigitsFromMarket(parityCount, null, countRepeated, startIndex, endIndex) || [];
                const expectedCount = (startIndex && endIndex) ? (Math.abs(startIndex - endIndex) + 1) : parityCount;

                let parityDisplay;
                if (parityDigits.length >= expectedCount) {
                    parityDisplay = `[${parityDigits.join(',')}]`;
                } else {
                    const placeholders = Array(expectedCount - parityDigits.length).fill('X');
                    parityDisplay = `[${[...placeholders, ...parityDigits].join(',')}]`;
                }

                const parityLabel = parity === 'par' || parity === 'even' ? 'pares' : 'ímpares';
                const parityResult = this.checkDigitParityCondition(rule);
                const parityStatusIcon = parityResult ? '🟢' : '🔴';

                if (startIndex && endIndex) {
                    return `${parityStatusIcon} #${startIndex}..#${endIndex} ${parityLabel} ${parityDisplay}`;
                }
                return `${parityStatusIcon} ${parityCount} dígito${parityCount > 1 ? 's' : ''} ${parityLabel} ${parityDisplay}`;
            }


            case 'digit_pattern': // Nova formatação visual para padrões de dígitos
                const digitPatternRulesInstance = getDigitPatternRulesInstance();
                return digitPatternRulesInstance.generateVisualFormat(rule, statusIcon);

            case 'allowed_digits': // Nova formatação visual para dígitos permitidos
                const allowedParams = rule.parameters || rule;
                // 🔧 CORREÇÃO: Priorizar rule.count e rule.allowedDigits
                const allowedDigitsCount = rule.count || allowedParams.count || 1;

                // 🔧 GARANTIR que allowedDigitsList seja sempre um array
                let allowedDigitsList = rule.allowedDigits || allowedParams.allowedDigits || [];

                // Se for string, converter para array
                if (typeof allowedDigitsList === 'string') {
                    allowedDigitsList = allowedDigitsList.split(',').map(d => parseInt(d.trim()));
                }

                // Se não for array, transformar em array
                if (!Array.isArray(allowedDigitsList)) {
                    allowedDigitsList = [];
                }

                // Obter os dígitos recentes
                const recentAllowedDigits = this.getLastNDigitsFromMarketData(allowedDigitsCount);
                const allowedDigitsDisplay = recentAllowedDigits && recentAllowedDigits.length > 0
                    ? recentAllowedDigits.join(',')
                    : 'X'.repeat(allowedDigitsCount).split('').join(',');

                return `${statusIcon}(${allowedDigitsList.join(',')}) : ${allowedDigitsDisplay}`;

            case 'rsi':
                // Priorizar propriedade raiz (atualizada pelo applyParameters)
                const rsiPeriod = rule.period || rule.parameters?.period || 14;

                // Obter valor atual do RSI
                const rsiIndicator = getRSIIndicatorInstance();
                const currentSymbol = this.getSelectedSymbol();
                const rsiValue = rsiIndicator.getCurrentRSI(currentSymbol, rsiPeriod);

                const rsiDisplay = rsiValue !== null ? rsiValue.toFixed(1) : 'X';
                const rsiFormat = `${statusIcon} RSI(${rsiPeriod}) ${rsiDisplay}`;


                return rsiFormat;

            case 'sma':
                try {
                    const smaIndicator = getSMAIndicatorInstance();
                    const symbol = this.getSelectedSymbol();

                    // Verificar parâmetros na raiz ou em parameters
                    const params = rule.parameters || {};

                    // 🔧 CORREÇÃO: Priorizar propriedades da raiz
                    const period1 = rule.period1 || params.period1 || 14;
                    const period2 = rule.period2 || params.period2;
                    const period = rule.period || params.period || 14;
                    const supportLevel = rule.supportLevel || params.supportLevel;
                    const resistanceLevel = rule.resistanceLevel || params.resistanceLevel;


                    if (period2) {
                        // Comparação entre dois SMAs: SMA(80) X : SMA(20) Y
                        const sma1Value = smaIndicator.getCurrentSMA(symbol, period1);
                        const sma2Value = smaIndicator.getCurrentSMA(symbol, period2);

                        const sma1Display = sma1Value !== null ? sma1Value.toFixed(5) : 'X';
                        const sma2Display = sma2Value !== null ? sma2Value.toFixed(5) : 'X';

                        const smaFormat = `${statusIcon} S(${period1}) ${sma1Display} S(${period2}) ${sma2Display}`;

                        return smaFormat;
                    } else if (supportLevel) {
                        // SMA comparado com suporte: SMA(14) X : suporte
                        const smaValue = smaIndicator.getCurrentSMA(symbol, period);
                        const smaDisplay = smaValue !== null ? smaValue.toFixed(5) : 'X';

                        const smaFormat = `${statusIcon} S(${period}) ${smaDisplay} sup`;

                        return smaFormat;
                    } else if (resistanceLevel) {
                        // SMA comparado com resistência: SMA(14) X : resistência
                        const smaValue = smaIndicator.getCurrentSMA(symbol, period);
                        const smaDisplay = smaValue !== null ? smaValue.toFixed(5) : 'X';

                        const smaFormat = `${statusIcon} S(${period}) ${smaDisplay} res`;

                        return smaFormat;
                    } else if (params.compareWithPrice || (rule.description || '').toLowerCase().includes('preco') || (rule.description || '').toLowerCase().includes('price')) {
                        // Preço comparado com SMA: Preço X : SMA(14) Y
                        const smaValue = smaIndicator.getCurrentSMA(symbol, period);
                        const lastTick = smaIndicator.getLastTick(symbol);

                        const smaDisplay = smaValue !== null ? smaValue.toFixed(5) : 'X';
                        const lastTickDisplay = lastTick !== null ? lastTick.toFixed(5) : 'X';

                        return `${statusIcon} ${lastTickDisplay} : S(${period}) ${smaDisplay}`;
                    } else {
                        // SMA simples: SMA(14) X
                        const smaValue = smaIndicator.getCurrentSMA(symbol, period);
                        const smaDisplay = smaValue !== null ? smaValue.toFixed(5) : 'X';

                        const smaFormat = `${statusIcon} S(${period}) ${smaDisplay}`;

                        return smaFormat;
                    }
                } catch (error) {
                    console.error(`❌ Erro ao gerar formato SMA:`, error);
                    return `${statusIcon} SMA erro`;
                }

            case 'sma_crossover':
                try {
                    const params = rule.parameters || {};
                    const symbol = this.getSelectedSymbol();
                    const smaIndicator = getSMAIndicatorInstance();

                    // 🔧 CORREÇÃO: Priorizar propriedades da raiz
                    const period1 = rule.period1 || params.period1 || 14;
                    const period2 = rule.period2 || params.period2 || 50;
                    const direction = rule.direction || params.direction || 'any';

                    // Verificar se é um cruzamento válido
                    const isCrossover = smaIndicator.checkSMACrossoverCondition(
                        symbol,
                        period1,
                        period2,
                        direction
                    );

                    // Definir ícone baseado no resultado
                    const statusIcon = isCrossover ? '🟢' : '🔴';

                    // Obter valores atuais das SMAs
                    const sma1 = smaIndicator.getCurrentSMA(symbol, period1);
                    const sma2 = smaIndicator.getCurrentSMA(symbol, period2);

                    const sma1Display = sma1 !== null ? sma1.toFixed(5) : 'X';
                    const sma2Display = sma2 !== null ? sma2.toFixed(5) : 'X';

                    // Determinar seta de direção
                    let directionArrow = '🔄';
                    if (sma1 !== null && sma2 !== null) {
                        if (sma1 > sma2) {
                            directionArrow = '⬆️'; // SMA1 acima
                        } else {
                            directionArrow = '⬇️'; // SMA1 abaixo
                        }
                    }

                    // Formato: 🟢 SMA(20) 1.2345 🔄 SMA(50) 1.2340 ⬆️
                    const crossoverFormat = `${statusIcon} SMA(${period1}) ${sma1Display} 🔄 SMA(${period2}) ${sma2Display} ${directionArrow}`;


                    return crossoverFormat;

                } catch (error) {
                    console.error(`❌ Erro ao gerar formato SMA crossover:`, error);
                    return `🔴 SMA crossover erro`;
                }

            case 'support':
                const supportIndicator = getSMAIndicatorInstance();
                const symbolSup = this.getSelectedSymbol();
                // 🔧 CORREÇÃO: Priorizar rule.period
                const supportPeriod = rule.period || rule.parameters?.period || 100;

                let supportValue = supportIndicator.getCurrentSupport(symbolSup, supportPeriod);

                // 🔧 CORREÇÃO: Se retornou null, tentar novamente sem cache
                if (supportValue === null) {
                    const cacheKey = `support_${symbolSup}_${supportPeriod}`;
                    supportIndicator.cache.delete(cacheKey);
                    supportValue = supportIndicator.getCurrentSupport(symbolSup, supportPeriod);
                }

                const lastTickSup = supportIndicator.getLastTick(symbolSup);

                const supportDisplay = (typeof supportValue === 'number') ? supportValue.toFixed(5) : 'X';
                const lastTickSupDisplay = (typeof lastTickSup === 'number') ? lastTickSup.toFixed(5) : 'X';

                const supportFormat = `${statusIcon} Sup ${supportDisplay} : ${lastTickSupDisplay}`;

                return supportFormat;


            case 'resistance':
                const resistanceIndicator = getSMAIndicatorInstance();
                const symbolRes = this.getSelectedSymbol();
                // 🔧 CORREÇÃO: Priorizar rule.period
                const resistancePeriod = rule.period || rule.parameters?.period || 100;

                let resistanceValue = resistanceIndicator.getCurrentResistance(symbolRes, resistancePeriod);

                // Isso resolve o problema de grupos 2+ não terem dados disponíveis imediatamente
                if (resistanceValue === null) {
                    // Forçar recálculo sem cache
                    const cacheKey = `resistance_${symbolRes}_${resistancePeriod}`;
                    resistanceIndicator.cache.delete(cacheKey);
                    resistanceValue = resistanceIndicator.getCurrentResistance(symbolRes, resistancePeriod);
                }

                const lastTickRes = resistanceIndicator.getLastTick(symbolRes);

                const resistanceDisplay = (typeof resistanceValue === 'number') ? resistanceValue.toFixed(5) : (this.lastResistanceValue || '...');
                if (typeof resistanceValue === 'number') this.lastResistanceValue = resistanceDisplay;

                const lastTickResDisplay = (typeof lastTickRes === 'number') ? lastTickRes.toFixed(5) : '...';

                const resistanceFormat = `${statusIcon} Res ${resistanceDisplay} : ${lastTickResDisplay}`;

                return resistanceFormat;



            case 'probability_check': {
                const params = rule.parameters || rule;
                const target = params.target || '';
                const operator = rule.operator || params.operator || '==';
                const value = rule.value !== undefined ? rule.value : params.value;
                const count = parseInt(rule.count || params.count || 1);

                const resolver = getProbabilityResolver();
                // Obter estatísticas detalhadas
                let stats = null;
                if (typeof MonitoringView !== 'undefined' && typeof MonitoringView.calculateProbabilities === 'function') {
                    stats = MonitoringView.calculateProbabilities(true);
                }

                // CASO 1: Comparação de Valor Percentual (Percentual Menor Chance <= 10%)
                if (target === '$LOWER_PROB_VALUE' || target === '$HIGHER_PROB_VALUE') {
                    let currentPercent = 0;
                    if (stats) {
                        currentPercent = (target === '$HIGHER_PROB_VALUE') ? stats.mostProbableValue : stats.leastProbableValue;
                    }
                    return `${statusIcon} ${currentPercent}% : ${value}%`;
                }

                // CASO 2: Comparação de Dígito de Probabilidade com Número (Menor Chance <= 2)
                if ((target === '$LOWER_PROB' || target === '$HIGHER_PROB') && typeof value === 'number') {
                    let probDigit = '?';
                    if (stats && stats.sorted && stats.sorted.length >= 10) {
                        probDigit = (target === '$HIGHER_PROB') ? stats.sorted[0] : stats.sorted[9];
                    }

                    // Formato: 🔴 9 : 2 (Onde 9 é o dígito de menor chance e 2 é o limite)
                    return `${statusIcon} ${probDigit} : ${value}`;
                }

                // Ultimo digito = Menor Chance
                let probDigit = '?';
                if (stats && stats.sorted) {
                    probDigit = (value === '$HIGHER_PROB') ? stats.sorted[0] : stats.sorted[9];
                }
                const lastDigits = this.getLastNDigitsFromMarketData(count) || [];
                const digitsDisplay = lastDigits.length > 0 ? lastDigits.join(',') : 'X'.repeat(count).split('').join(',');

                return `${statusIcon} ${digitsDisplay} : ${probDigit}`;
            }

            case 'price_move':
                const priceMovementProcessor = getPriceMovementRulesInstance();
                return priceMovementProcessor.generateVisualFormat(rule, statusIcon);

            case 'sequence':
                // 🔧 CORREÇÃO: Priorizar rule.count
                const reqCount = rule.count || rule.parameters?.count || 3;
                const progress = rule.currentValue || 0;

                // 🎯 FIX: Limitar visualização ao máximo requerido para não "estourar" a linha
                const cappedProgress = Math.min(progress, reqCount);

                const balls = '🟢'.repeat(cappedProgress) + '⚪'.repeat(Math.max(0, reqCount - cappedProgress));

                // Determinar ícone de status baseado no progresso
                let currentStatusIcon = statusIcon;
                if (progress >= reqCount) {
                    currentStatusIcon = '🟢'; // Regra atendida
                } else if (progress > 0) {
                    currentStatusIcon = '🔴'; // Em progresso mas não atendida
                } else {
                    currentStatusIcon = '🔴'; // Nenhum progresso
                }

                return `${currentStatusIcon} ${reqCount} consecutivos: ${balls}`;

            case 'isolated_digits':
                const isoCount = rule.count || rule.parameters?.count || 2;
                const isoProgress = rule.currentValue || 0;
                const isoSequence = rule._isolatedSequence || [];

                // Obter dígito atual do mercado para exibição "ÚltimoDígito"
                const currentDigits = this.getLastNDigitsFromMarketData(1);
                const currentDigitIso = (currentDigits && currentDigits.length > 0) ? currentDigits[0] : '-';

                // Formato: 🔴/🟢 ÚltimoDígito (DígitosIsoladosAcumulados)
                // Ex: 🔴 4 (8,9)
                const seqDisplay = isoSequence.length > 0 ? `(${isoSequence.join(',')})` : '(0)';
                const isoColor = isoProgress >= isoCount ? '🟢' : '🔴';

                return `${isoColor} ${currentDigitIso} ${seqDisplay}`;

            case 'percentage':
                const percentageProcessor = getPercentageRulesInstance();
                const percentageFormat = percentageProcessor.generateVisualFormat(rule, statusIcon);
                return percentageFormat;


            case 'dynamic_prediction': {
                const params = rule.parameters || rule;
                const predictionType = params.predictionType;

                const target = params.target || params.targetValue;
                const value = params.value;
                if ((target === '$LOWER_PROB' || target === '$HIGHER_PROB') && value !== undefined && typeof value === 'number') {
                    const resolver = getProbabilityResolver();
                    let stats = null;
                    if (typeof MonitoringView !== 'undefined' && typeof MonitoringView.calculateProbabilities === 'function') {
                        stats = MonitoringView.calculateProbabilities(true);
                    }

                    let probDigit = '?';
                    if (stats && stats.sorted && stats.sorted.length >= 10) {
                        probDigit = (target === '$HIGHER_PROB') ? stats.sorted[0] : stats.sorted[9];
                    }
                    // Formato: 🔴 0 : 2 (ProbDigit : Limit)
                    return `${statusIcon} ${probDigit} : ${value}`;
                }

                // 🎯 NOVO: Regras com RSI (conditional_rsi)
                if (predictionType === 'conditional_rsi') {
                    const combinedRule = params.combinedRule;
                    if (combinedRule && combinedRule.rsiRule) {
                        const rsiRule = combinedRule.rsiRule;
                        const rsiPeriod = rsiRule.period || 14;

                        // Obter valor atual do RSI
                        const rsiIndicator = getRSIIndicatorInstance();
                        const currentSymbol = this.getSelectedSymbol();
                        const rsiValue = rsiIndicator.getCurrentRSI(currentSymbol, rsiPeriod);

                        const rsiDisplay = (typeof rsiValue === 'number') ? rsiValue.toFixed(1) : 'X';

                        // Adicionar a previsão (over/under/match/differ) no final
                        const predictionAction = params.predictionAction;
                        if (predictionAction) {
                            return `${statusIcon} RSI(${rsiPeriod}) ${rsiDisplay} (→${predictionAction})`;
                        }

                        return `${statusIcon} RSI(${rsiPeriod}) ${rsiDisplay}`;
                    }
                }

                // 🎯 NOVO: Regras com último dígito (last_digit)
                if (predictionType === 'last_digit') {
                    const processor = getDigitPatternRulesInstance();
                    const lastDigit = processor ? processor.getLastDigit() : '?';
                    const action = (params.predictionAction || 'differ').toUpperCase();
                    return `${statusIcon} ${action} do último dígito (${lastDigit})`;
                }

                // 🎯 NOVO: Regras com SMA (conditional_sma)
                if (predictionType === 'conditional_sma') {
                    const combinedRule = params.combinedRule;
                    if (combinedRule && combinedRule.smaRule) {
                        const smaRule = combinedRule.smaRule;
                        const period1 = smaRule.period1 || smaRule.period || 14;
                        const period2 = smaRule.period2;

                        const smaIndicator = getSMAIndicatorInstance();
                        const currentSymbol = this.getSelectedSymbol();

                        if (period2) {
                            const val1 = smaIndicator.getCurrentSMA(currentSymbol, period1);
                            const val2 = smaIndicator.getCurrentSMA(currentSymbol, period2);
                            const d1 = val1 !== null ? val1.toFixed(5) : 'X';
                            const d2 = val2 !== null ? val2.toFixed(5) : 'X';
                            return `${statusIcon} SMA(${period1}) ${d1} SMA(${period2}) ${d2}`;
                        } else {
                            const val = smaIndicator.getCurrentSMA(currentSymbol, period1);
                            const d = val !== null ? val.toFixed(5) : 'X';
                            return `${statusIcon} SMA(${period1}) ${d}`;
                        }
                    }
                }

                // 🎯 NOVO: Regras com percentual (conditional_percentage)
                if (predictionType === 'conditional_percentage') {
                    const combinedRule = params.combinedRule;
                    if (combinedRule && combinedRule.percentageRule) {
                        const percentageRule = combinedRule.percentageRule;
                        const percentageProcessor = getPercentageRulesInstance();

                        const tempRule = {
                            type: 'dynamic_prediction',
                            parameters: {
                                predictionType: 'conditional_percentage',
                                combinedRule: {
                                    percentageRule: percentageRule
                                }
                            }
                        };

                        percentageProcessor.checkPercentageCondition(tempRule);

                        // Usar o formato visual do sistema de percentual
                        const percentageFormat = percentageProcessor.generateVisualFormat(tempRule, statusIcon);

                        // Adicionar a previsão (over/under/match/differ) no final
                        const targetValue = params.targetValue;
                        if (targetValue !== undefined) {

                            const isDynamicToken = typeof targetValue === 'string' &&
                                (targetValue.startsWith('dynamic_') || targetValue === 'dynamic_highest_percentage_digit');

                            if (!isDynamicToken) {
                                return `${percentageFormat} (→${targetValue})`;
                            }
                        }

                        return percentageFormat;
                    }
                }

                // 🎯 NOVO: Regras com precisão (conditional_probability_accuracy)
                if (predictionType === 'conditional_probability_accuracy') {
                    const combinedRule = params.combinedRule;
                    if (combinedRule && combinedRule.probabilityAccuracyRule) {
                        const accManager = window.ProbabilityAccuracyManager ? window.ProbabilityAccuracyManager.getInstance() : null;
                        const currentAcc = accManager ? accManager.getAccuracy() : 0;
                        const displayAcc = Math.round(currentAcc);

                        // Adicionar a previsão (over/under/match/differ) no final
                        const action = params.predictionAction || '';
                        let target = params.targetValue;

                        // Resolver variável se necessário
                        if (target && typeof target === 'string' && target.startsWith('$')) {
                            const resolver = getProbabilityResolver();
                            const resolved = resolver ? resolver.resolve(target) : null;
                            if (resolved !== null) target = resolved;
                        }

                        const targetText = target !== undefined ? ` ${target}` : '';
                        const actionText = action ? ` (→${action}${targetText})` : '';

                        return `${statusIcon} Precisão: ${displayAcc}%${actionText}`;
                    }
                }

                // 🎯 NOVO: Regras com padrão (conditional_pattern)
                if (predictionType === 'conditional_pattern') {
                    const combinedRule = params.combinedRule;
                    if (combinedRule && combinedRule.patternRule) {
                        // ✅ NORMALIZAR: Converter 'pattern' → 'digit_pattern'
                        const patternRule = normalizePatternRuleType(combinedRule.patternRule);

                        if (patternRule.type === 'digit_pattern') {
                            const pattern = patternRule.pattern || 'XOX';
                            const patternLength = pattern.length;

                            // Obter últimos dígitos correspondentes ao tamanho do padrão
                            const digits = this.getLastNDigitsFromMarketData(patternLength);
                            const digitsDisplay = digits && digits.length > 0 ?
                                `[${digits.join(',')}]` :
                                '[' + 'X,'.repeat(patternLength).slice(0, -1) + ']';

                            return `${statusIcon} ${pattern} ${digitsDisplay}`;
                        }

                        if (patternRule.type === 'digit_repetition') {
                            // 🔧 CORREÇÃO: Priorizar params.count sobre patternRule.count
                            const count = params.count || patternRule.count || 2;
                            const digits = this.getLastNDigitsFromMarketData(count);
                            const digitsDisplay = digits && digits.length > 0 ? digits.join(',') : 'X,'.repeat(count).slice(0, -1);
                            return `${statusIcon} ${digitsDisplay}`;
                        }

                        // Para outros tipos de padrão, usar formato descritivo
                        const patternText = this.interpretPatternRule(patternRule);
                        return `${statusIcon} ${patternText}`;
                    }
                }

                // Mostra: "🔴/🟢 último_dígito : dígito_esperado"
                if (predictionType === 'last_digit_probability_match') {
                    const condition = params.condition || {};
                    // Tentar obter variável do local mais provável
                    const probVar = condition.probabilityVariable || params._originalTargetValue || params.targetValue || rule.targetValue;

                    // Obter últimos dígitos baseada no count
                    const count = parseInt(params.count || rule.count || 1);
                    const lastDigits = this.getLastNDigitsFromMarketData(count) || [];
                    const digitsDisplay = lastDigits.length > 0 ? lastDigits.join(',') : 'X'.repeat(count).split('').join(',');

                    // Resolver variável de probabilidade
                    let expectedDigit = '?';
                    if (probVar !== undefined && probVar !== null) {
                        // 1. Se já for um número, usar direto
                        if (typeof probVar === 'number') {
                            expectedDigit = probVar;
                        }
                        // 2. Se for uma string que NÃO é uma variável especial, tentar converter
                        else if (typeof probVar === 'string' && !probVar.startsWith('$')) {
                            const num = parseInt(probVar);
                            expectedDigit = isNaN(num) ? probVar : num;
                        }
                        // 3. Se for uma variável especial, resolver agora
                        else {
                            const resolver = getProbabilityResolver();
                            if (resolver) {
                                const resolved = resolver.resolve(probVar);
                                if (resolved !== null && resolved !== undefined) {
                                    expectedDigit = resolved;
                                }
                            }
                        }
                    }

                    return `${statusIcon} ${digitsDisplay} : ${expectedDigit}`;
                }

                if (predictionType === 'percentage_digit_inverse' ||
                    predictionType === 'percentage_digit_match' ||
                    predictionType === 'conditional_percentage' ||
                    params.targetValue === 'dynamic_highest_percentage_digit' ||
                    params.targetValue === 'dynamic_allowed_digit') {

                    const combinedRule = params.combinedRule;

                    const percentageProcessor = getPercentageRulesInstance();

                    // Para conditional_percentage ou dynamic tokens, usar o processamento direto
                    if (predictionType === 'conditional_percentage' ||
                        predictionType === 'percentage_digit_inverse' ||
                        predictionType === 'percentage_digit_match' ||
                        params.targetValue === 'dynamic_highest_percentage_digit' ||
                        params.targetValue === 'dynamic_allowed_digit') {

                        // 🎯 CRÍTICO: Calcular trigger digit antes de gerar formato
                        percentageProcessor.checkPercentageCondition(rule);
                        return percentageProcessor.generateVisualFormat(rule, statusIcon);
                    }

                    // Para outros tipos, usar regra temporária
                    if (combinedRule && combinedRule.percentageRule) {
                        const percentageRule = combinedRule.percentageRule;
                        const tempRule = {
                            type: 'percentage',
                            parameters: percentageRule,
                            _triggerDigit: undefined
                        };

                        // 🎯 CRÍTICO: Verificar condição primeiro para capturar _triggerDigit
                        const isConditionMet = percentageProcessor.checkPercentageCondition(tempRule);

                        if (tempRule._triggerDigit !== undefined) {
                            params._triggerDigit = tempRule._triggerDigit;
                            rule._triggerDigit = tempRule._triggerDigit;
                        }

                        // Formato: "🔴/🟢 X" onde X é o dígito que atende à condição
                        if (tempRule._triggerDigit !== undefined) {
                            return `${statusIcon} ${tempRule._triggerDigit}`;
                        } else {
                            return `${statusIcon} X`;
                        }
                    }
                }

                // 🔧 CORREÇÃO: Priorizar rule.count (atualizado)
                const count = rule.count || params.count || rule.period || params.period || 1;
                const digits = this.getLastNDigitsFromMarketData(count);

                let digitsDisplay;
                if (digits && digits.length > 0) {
                    if (digits.length < count) {
                        // Preencher com X se não houver dígitos suficientes
                        const missingCount = count - digits.length;
                        const placeholders = Array(missingCount).fill('X');
                        digitsDisplay = [...placeholders, ...digits].join(',');
                    } else {
                        digitsDisplay = digits.join(',');
                    }
                } else {
                    digitsDisplay = Array(count).fill('X').join(',');
                }

                // Mostrar informação da previsão dinâmica se disponível
                if (params.targetValue !== undefined) {
                    let displayValue = params.targetValue;

                    // 🎲 RESOLVER variáveis de probabilidade para mostrar dígito real
                    if (typeof displayValue === 'string' &&
                        (displayValue === '$HIGHER_PROB' || displayValue === '$LOWER_PROB')) {

                        let resolved = null;

                        // 1. Tentar resolver via Helper
                        if (typeof getProbabilityResolver === 'function') {
                            const resolver = getProbabilityResolver();
                            resolved = resolver.resolve(displayValue);
                        }

                        if (resolved === null || resolved === undefined || isNaN(resolved)) {
                            if (typeof MonitoringView !== 'undefined') {

                                let stats = null;

                                if (typeof MonitoringView.calculateProbabilities === 'function') {
                                    stats = MonitoringView.calculateProbabilities(true);
                                }

                                if (stats && stats.sorted && stats.sorted.length >= 10) {
                                    if (displayValue === '$HIGHER_PROB') resolved = stats.sorted[0];
                                    if (displayValue === '$LOWER_PROB') resolved = stats.sorted[9];
                                }
                            }

                            // 3. Aplicar valor
                            if (resolved !== null && resolved !== undefined && !isNaN(resolved)) {
                                displayValue = resolved;
                            } else {
                                // 4. Fallback visual para não mostrar variáveis quebradas ou NaN
                                displayValue = '...';
                            }
                        }



                        // 🎯 CORREÇÃO: Não mostrar targetValue se for um token dinâmico interno
                        const isDynamicToken = typeof params.targetValue === 'string' &&
                            params.targetValue.startsWith('dynamic_');

                        if (!isDynamicToken) {
                            return `${statusIcon} ${digitsDisplay} (→${displayValue})`;
                        }
                    }

                    return `${statusIcon} ${digitsDisplay}`;
                }
            }
            case 'dynamic_target_on_repetition': {

                // 🔧 CORREÇÃO: Priorizar rule.count
                const count = rule.count || rule.parameters?.count || 2;

                // 🎯 FORMATO VISUAL: Mostrar últimos N dígitos ao invés de texto descritivo
                const digits = this.getLastNDigitsFromMarketData(count);
                const digitsDisplay = digits && digits.length > 0 ? digits.join(',') : 'X,'.repeat(count).slice(0, -1);
                return `${statusIcon} ${digitsDisplay}`;
            }

            // 🎯 FALLBACK: conditional_percentage pode chegar aqui diretamente
            case 'conditional_percentage': {
                const percentageProcessorForFormat = getPercentageRulesInstance();
                return percentageProcessorForFormat.generateConditionalPercentageFormat(rule, statusIcon);
            }

            // 🆕 NOVO: Comparação de Dígitos (ex: Last Digit vs Higher Prob)
            case 'digit_comparison': {
                // Fallback para ler de parameters se não estiver na raiz
                const rTarget = rule.target || (rule.parameters && rule.parameters.target);
                const rOperator = rule.operator || (rule.parameters && rule.parameters.operator);
                const rValue = rule.value || (rule.parameters && rule.parameters.value);

                let targetText = rTarget === 'last_digit' ? 'Último Dígito' : rTarget;

                // Isso atende ao pedido: "🔴 7 : 3" em vez de "🔴 Último Dígito : 3"
                if (rTarget === 'last_digit') {
                    const count = parseInt(rule.count || (rule.parameters && rule.parameters.count) || 1);
                    const marketDigitsBase = this.getLastNDigitsFromMarketData(count) || [];
                    if (marketDigitsBase.length > 0) {
                        targetText = marketDigitsBase.join(',');
                    } else {
                        targetText = 'X'.repeat(count).split('').join(',');
                    }
                }

                // Se for regra de probabilidade, mostrar o valor resolvido se disponível
                if (rValue && typeof rValue === 'string' && rValue.startsWith('$')) {
                    let resolved = null;

                    // Não confiar apenas no Resolver que pode estar com dados Real-Time
                    if (typeof MonitoringView !== 'undefined' && typeof MonitoringView.calculateProbabilities === 'function') {
                        const stats = MonitoringView.calculateProbabilities(true);
                        if (stats && stats.sorted && stats.sorted.length >= 10) {
                            if (rValue === '$HIGHER_PROB') resolved = stats.sorted[0];
                            if (rValue === '$LOWER_PROB') resolved = stats.sorted[9];
                        }
                    }

                    // Fallback para o resolver comum se falhar (mas o de cima deve prevalecer)
                    if (resolved === null) {
                        const resolver = typeof getProbabilityResolver === 'function' ? getProbabilityResolver() : null;
                        resolved = resolver ? resolver.resolve(rValue) : null;
                    }

                    if (resolved !== null) {
                        // Formato solicitado: 🔴/🟢 X : Y
                        return `${statusIcon} ${targetText} : ${resolved}`;
                    } else {
                        // Fallback visual
                        return `${statusIcon} ${targetText} : (?)`;
                    }
                }

                return `${statusIcon} ${targetText} ${rOperator} ${rValue}`;
            }

            // 🆕 NOVO: Verificação de Probabilidade (ex: Menor Chance < 4)
            case 'probability_check': {
                const rTarget = rule.target || (rule.parameters && rule.parameters.target);
                const rOperator = rule.operator || (rule.parameters && rule.parameters.operator);
                const rValue = rule.value || (rule.parameters && rule.parameters.value);

                let targetText = rTarget;
                let resolvedValue = null;

                if (rTarget === '$HIGHER_PROB') targetText = 'Maior Chance';
                if (rTarget === '$LOWER_PROB') targetText = 'Menor Chance';

                // Tentar resolver o valor atual para mostrar no log (ex: "Menor Chance (7)")
                if (typeof MonitoringView !== 'undefined' && typeof MonitoringView.calculateProbabilities === 'function') {
                    const stats = MonitoringView.calculateProbabilities(true);
                    if (stats && stats.sorted && stats.sorted.length >= 10) {
                        if (rTarget === '$HIGHER_PROB') resolvedValue = stats.sorted[0];
                        if (rTarget === '$LOWER_PROB') resolvedValue = stats.sorted[9];
                    }
                }

                if (resolvedValue !== null) {
                    return `${statusIcon} ${targetText} (${resolvedValue}) ${rOperator} ${rValue}`;
                }
                return `${statusIcon} ${targetText} ${rOperator} ${rValue}`;
            }

            case 'probability_accuracy': {
                const accManager = window.ProbabilityAccuracyManager ? window.ProbabilityAccuracyManager.getInstance() : null;
                const currentAcc = accManager ? accManager.getAccuracy() : 0;
                const displayAcc = Math.round(currentAcc);
                return `${statusIcon} Precisão: ${displayAcc}%`;
            }

            default:
                const defaultFormat = `${statusIcon} Regra ${rule.type}`;
                console.error(`❌ TIPO DE REGRA DESCONHECIDO: ${rule.type} `);

                return defaultFormat;
        }
    }

    // 🎯 Interpretar patternRule em texto legível
    interpretPatternRule(patternRule) {
        if (!patternRule || !patternRule.type) {
            console.warn('⚠️ patternRule inválido:', patternRule);
            return 'Padrão inválido';
        }

        const type = patternRule.type;
        const count = patternRule.count || 2;

        switch (type) {
            case 'digit_repetition':
                if (count === 2) {
                    return 'Dígito que se repetir 2 vezes';
                }
                return `Dígito que se repetir ${count} vezes`;

            case 'digit_sequence':
                const sequence = patternRule.sequence || [];
                if (sequence.length > 0) {
                    return `Sequência: ${sequence.join(', ')} `;
                }
                return 'Sequência de dígitos';

            case 'consecutive_digits':
                return `${count} dígitos consecutivos`;

            case 'parity_pattern':
            case 'digit_parity': // 🔧 FIX: Suporte para digit_parity
                const parity = patternRule.parity || patternRule.value || 'par';
                const parityText = (parity === 'par' || parity === 'even') ? 'pares' : 'ímpares';
                return `últimos ${count} dígitos ${parityText}`;

            case 'range_pattern':
                const min = patternRule.min || 0;
                const max = patternRule.max || 9;
                return `Dígitos entre ${min} e ${max} `;

            case 'explicit_pattern':
                const pattern = patternRule.pattern || '';
                if (pattern) {
                    return `Padrão: ${pattern} `;
                }
            case 'explicit_pattern':
                const explicitPattern = patternRule.pattern || '';
                if (explicitPattern) {
                    return `Padrão: ${explicitPattern} `;
                }
                return 'Padrão explícito';

            case 'digit_pattern':
                const dPattern = patternRule.pattern || '';
                return `Padrão: ${dPattern} `;

            default:
                console.warn(`⚠️ Tipo de padrão desconhecido: ${type} `);
                return `Padrão ${type} `;
        }
    }

    // Normalizar operadores para exibição consistente
    normalizeOperator(operator) {
        const operatorMap = {
            '>': '>',
            '<': '<',
            '=': '=',
            '>=': '≥',
            '<=': '≤',
            '!=': '≠',
            'maior que': '>',
            'menor que': '<',
            'igual a': '=',
            'maior ou igual': '≥',
            'menor ou igual': '≤',
            'diferente de': '≠',
            'diferente': '≠',
            'não igual': '≠',
            'acima de': '>',
            'abaixo de': '<'
        };

        return operatorMap[operator] || operator;
    }

    // Extrair parâmetros da regra para análise
    static extractParameters(rule) {

        const params = {
            type: rule.type
        };

        // Extrair parâmetros específicos baseados no tipo
        Object.keys(rule).forEach(key => {
            if (key !== 'id' && key !== 'type' && key !== 'description' && key !== 'display_format') {

                params[key] = rule[key];
            }
        });

        // Validar parâmetros dinâmicos
        this.validateParameters(params);


        return params;
    }

    // Validar parâmetros dinâmicos
    static validateParameters(params) {


        switch (params.type) {
            case 'last_digits':

                // Log apenas para debug, não interromper processamento
                if (!params.count || typeof params.count !== 'number' || params.count < 1 || params.count > 50) {
                    console.warn(`⚠️ Count inválido para last_digits: ${params.count} - será processado pelo Gemini`);
                }

                // 🛠️ FIX: Normalizar '==' para '='
                if (params.operator === '==') params.operator = '=';

                if (!params.operator || !['>', '<', '=', '>=', '<=', '!='].includes(params.operator)) {
                    console.error(`❌ ERRO CRÍTICO: Operador inválido: ${params.operator} `);
                    console.error(`   - Esta regra será REJEITADA - SEM FALLBACKS!`);

                    // Disparar evento para mostrar modal de erro
                    const errorEvent = new CustomEvent('parameterValidationError', {
                        detail: {
                            rule: { type: params.type, operator: params.operator },
                            message: `Operador inválido: "${params.operator}".Use: >, <, =, >=, <=, != (ou suas variantes em texto como "diferente de")`,
                            suggestedFix: `Use "!=" ou "diferente de" para comparações de diferença`
                        }
                    });
                    document.dispatchEvent(errorEvent);

                    params.operator = null;
                } else {
                    if (window.logConfig && window.logConfig.shouldLog('parameter_validation')) {

                    }
                }

                // 🎯 FIX: Permitir variáveis de probabilidade ($LOWER_PROB, $HIGHER_PROB)
                const isVariable = typeof params.value === 'string' && params.value.startsWith('$');
                const isNumeric = typeof params.value === 'number' || (typeof params.value === 'string' && !isNaN(parseFloat(params.value)));

                if (!isVariable && !isNumeric) {
                    console.error(`❌ ERRO CRÍTICO: Value inválido para dígitos: ${params.value} `);
                    console.error(`   - Esta regra será REJEITADA - SEM FALLBACKS!`);
                    params.value = null;
                } else if (isNumeric) {
                    // Validar se número está no range 0-9
                    const numValue = parseFloat(params.value);
                    if (numValue < 0 || numValue > 9) {
                        console.error(`❌ ERRO CRÍTICO: Dígito fora do range (0-9): ${numValue}`);
                        params.value = null;
                    }
                }
                break;

            case 'rsi':
                // Validar período RSI
                if (!params.period || typeof params.period !== 'number' || params.period < 2 || params.period > 200) {
                    console.warn(`⚠️ Período RSI inválido: ${params.period}. Usando padrão: 14`);
                    params.period = 14;
                }

                // Validar valor alvo do RSI
                if (params.value === undefined || typeof params.value !== 'number' || params.value < 0 || params.value > 100) {
                    console.error(`❌ Valor alvo RSI inválido: ${params.value}. Esta regra será rejeitada!`);
                    params.value = null;
                }

                // Validar operador RSI
                if (!params.operator || !['>', '<', '=', '>=', '<=', '!='].includes(params.operator)) {
                    console.error(`❌ Operador RSI inválido: ${params.operator}. Esta regra será rejeitada!`);
                    params.operator = null;
                }
                break;

            case 'sma':
                // Validar períodos SMA
                if (params.period1 && (typeof params.period1 !== 'number' || params.period1 < 1 || params.period1 > 1000)) {
                    console.warn(`⚠️ Período 1 SMA inválido: ${params.period1}. Usando padrão: 14`);
                    params.period1 = 14;
                }

                if (params.period2 && (typeof params.period2 !== 'number' || params.period2 < 1 || params.period2 > 1000)) {
                    console.warn(`⚠️ Período 2 SMA inválido: ${params.period2}. Rejeitando regra!`);
                    params.period2 = null;
                }

                if (!params.period && !params.period1) {
                    console.warn(`⚠️ Nenhum período SMA especificado.Usando padrão: 14`);
                    params.period = 14;
                }

                // Validar operador SMA
                if (!params.operator || !['>', '<', '=', '>=', '<=', '!='].includes(params.operator)) {
                    console.error(`❌ Operador SMA inválido: ${params.operator}. Esta regra será rejeitada!`);
                    params.operator = null;
                } else {
                    if (window.logConfig && window.logConfig.shouldLog('parameter_validation')) {

                    }
                }
                break;

            case 'support':
            case 'resistance':
                // Validar período para suporte/resistência
                if (!params.period || typeof params.period !== 'number' || params.period < 1 || params.period > 1000) {
                    console.warn(`⚠️ Período ${params.type} inválido: ${params.period}. Usando padrão: 100`);
                    params.period = 100;
                } else {
                    if (window.logConfig && window.logConfig.shouldLog('parameter_validation')) {

                    }
                }

                // Validar operador
                if (!params.operator || !['>', '<', '=', '>=', '<=', '!='].includes(params.operator)) {
                    console.error(`❌ Operador ${params.type} inválido: ${params.operator}. Esta regra será rejeitada!`);
                    params.operator = null;
                } else {
                    if (window.logConfig && window.logConfig.shouldLog('parameter_validation')) {

                    }
                }
                break;

            case 'price_move':
                // Verificar se tem pontos OU percentual
                if (!params.points && !params.percentage) {
                    console.warn(`⚠️ Nem pontos nem percentual especificados.Usando pontos padrão: 1`);
                    params.points = 1;
                } else if (params.points && params.points <= 0) {
                    console.warn(`⚠️ Pontos inválidos: ${params.points}. Usando padrão: 1`);
                    params.points = 1;
                } else if (params.percentage && params.percentage <= 0) {
                    console.warn(`⚠️ Percentual inválido: ${params.percentage}. Usando padrão: 1 % `);
                    params.percentage = 1;
                }
                break;

            case 'sequence':
                if (!params.count || params.count < 2 || params.count > 20) {
                    console.warn(`⚠️ Contagem de sequência inválida: ${params.count}. Usando padrão: 3`);
                    params.count = 3;
                }
                break;

            case 'percentage':

                // Delegar validação para o PercentageRulesProcessor
                const PercentageRulesProcessor = getPercentageRulesInstance().constructor;
                PercentageRulesProcessor.validateParameters(params);
                break;

            case 'digit_repetition':

                // Log apenas para debug, processamento será feito pelo Gemini
                if (!params.count || typeof params.count !== 'number' || params.count < 2 || params.count > 10) {
                    console.warn(`⚠️ Contagem de repetição inválida: ${params.count} - processado pelo Gemini`);
                }
                break;

            case 'digit_parity': // Log apenas, processamento pelo Gemini
                if (!params.count || typeof params.count !== 'number' || params.count < 1 || params.count > 10) {
                    console.warn(`⚠️ Contagem para paridade inválida: ${params.count} - processado pelo Gemini`);
                }
                if (!params.parity || !['par', 'impar', 'even', 'odd'].includes(params.parity)) {
                    console.warn(`⚠️ Paridade inválida: ${params.parity} - processado pelo Gemini`);
                }
                break;

            case 'digit_comparison':
                // Validar se targets e values são string
                if (params.value && typeof params.value === 'string' && params.value.startsWith('$')) {
                    // É uma variável, ignorar validação de número
                } else if (params.value !== undefined && isNaN(parseFloat(params.value))) {
                    console.warn('⚠️ Valor inválido para digit_comparison:', params.value);
                }
                if (params.target !== 'last_digit' && !params.target.startsWith('last_digit_')) {
                    // console.warn('Target incomum para digit_comparison:', params.target);
                }
                break;

            case 'digit_pattern': // Validação para padrões de dígitos
                if (!params.pattern || typeof params.pattern !== 'string' || params.pattern.length === 0) {
                    console.error(`❌ ERRO CRÍTICO: Padrão inválido para digit_pattern: ${params.pattern} `);
                    params.pattern = null;
                } else {
                    // Validar caracteres permitidos (X, x, O, o)
                    const validChars = /^[XxOo]+$/;
                    if (!validChars.test(params.pattern)) {
                        console.error(`❌ ERRO CRÍTICO: Padrão contém caracteres inválidos: ${params.pattern}. Use apenas X / x e O / o.`);
                        params.pattern = null;
                    }
                }
                break;

            case 'dynamic_prediction': // Validação para previsão dinâmica
                const validPredictionTypes = [
                    'conditional_value',
                    'conditional_pattern',
                    'conditional_percentage',
                    'conditional_rsi',
                    'conditional_sma',
                    'last_digit_inverse',
                    'last_digit_match',
                    'repeated_digit_inverse',
                    'repeated_digit_match',
                    'most_frequent_inverse',
                    'percentage_digit_inverse',
                    'percentage_digit_match'
                ];

                // 📋 LISTA COMPLETA de targetValues válidos
                const validTargetValues = {
                    // Números 0-9
                    numbers: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
                    // Palavras-chave de contrato
                    contracts: ['over', 'under', 'differ', 'match', 'call', 'put'],
                    // Tokens de paridade
                    parity: ['even', 'odd', 'par', 'impar'],
                    // Tokens dinâmicos (gerados por análise de padrão ou probabilidade)
                    dynamic: [
                        'dynamic_repeated_digit',
                        'dynamic_most_frequent',
                        'dynamic_least_frequent',
                        'dynamic_last_digit',
                        'dynamic_pattern_result',
                        'dynamic_highest_percentage_digit',
                        'dynamic_allowed_digit',
                        // 🎲 Variáveis de probabilidade
                        '$HIGHER_PROB',
                        '$LOWER_PROB',
                        '$HIGHER_PROB_SCORE',
                        '$LOWER_PROB_SCORE',
                        '$LAST_DIGIT'
                    ]
                };

                // ✅ Validar targetValue com lista permitida
                if (params.targetValue !== undefined) {
                    let targetValue = params.targetValue;

                    // 🔄 NORMALIZAR: Converter termos em português para inglês
                    if (typeof targetValue === 'string') {
                        const parityNormalization = {
                            'par': 'even',
                            'ímpar': 'odd',
                            'impar': 'odd'
                        };

                        const lowerValue = targetValue.toLowerCase();
                        if (parityNormalization[lowerValue]) {
                            console.log(`🔄[VALIDATION] Normalizando paridade: "${targetValue}" → "${parityNormalization[lowerValue]}"`);
                            targetValue = parityNormalization[lowerValue];
                            params.targetValue = targetValue; // Atualizar na regra
                        }
                    }

                    const isNumber = typeof targetValue === 'number' && targetValue >= 0 && targetValue <= 9;

                    // 🎲 Variáveis de probabilidade são case-sensitive
                    const isProbabilityVar = typeof targetValue === 'string' &&
                        (targetValue === '$HIGHER_PROB' || targetValue === '$LOWER_PROB' || targetValue === '$LAST_DIGIT');

                    const isValidString = typeof targetValue === 'string' && (
                        validTargetValues.contracts.includes(targetValue.toLowerCase()) ||
                        validTargetValues.parity.includes(targetValue.toLowerCase()) ||
                        validTargetValues.dynamic.includes(targetValue.toLowerCase()) ||
                        isProbabilityVar // Verificação extra para variáveis especiais
                    );

                    if (!isNumber && !isValidString) {

                        params.targetValue = null;
                    } else if (typeof targetValue === 'string' && !isProbabilityVar) {
                        // Normalizar para lowercase EXCETO variáveis de probabilidade
                        params.targetValue = targetValue.toLowerCase();

                    }
                }

                // 🔄 NORMALIZAR: predictionAction também pode ter termos em português
                if (params.predictionAction && typeof params.predictionAction === 'string') {
                    const parityNormalization = {
                        'par': 'even',
                        'ímpar': 'odd',
                        'impar': 'odd'
                    };

                    const lowerAction = params.predictionAction.toLowerCase();
                    if (parityNormalization[lowerAction]) {

                        params.predictionAction = parityNormalization[lowerAction];
                    }
                }

                if (params.predictionType === 'percentage_digit_inverse' || params.predictionType === 'percentage_digit_match') {
                    // Verificar se tem combinedRule com percentageRule
                    if (params.combinedRule && params.combinedRule.percentageRule) {
                        const percentageRule = params.combinedRule.percentageRule;
                        params.count = percentageRule.period || 25;
                    } else {
                        params.count = params.count || 25; // Padrão para regras de percentual
                    }
                } else {
                    // Para outros tipos, validar count normalmente
                    if (!params.count || typeof params.count !== 'number' || params.count < 1 || params.count > 50) {

                        params.count = 1;
                    }
                }
                break;

            case 'probability_check':
                if (!params.target || (params.target !== '$HIGHER_PROB' && params.target !== '$LOWER_PROB' &&
                    params.target !== '$HIGHER_PROB_VALUE' && params.target !== '$LOWER_PROB_VALUE')) {
                    console.error(`❌ Target inválido para probability_check: ${params.target} `);
                    params.target = null;
                }

                // Validar operator
                if (!params.operator || !['>', '<', '=', '>=', '<=', '!=', '=='].includes(params.operator)) {
                    console.error(`❌ Operador inválido para probability_check: ${params.operator} `);
                    params.operator = null;
                }

                // Validar value (deve ser dígito 0-9)
                if (params.value === undefined || typeof params.value !== 'number' || params.value < 0 || params.value > 9) {
                    console.error(`❌ Value inválido para probability_check: ${params.value} `);
                    params.value = null;
                }
                break;

            case 'Calle/Pute': // Alterado de 'Call/Put Europeu' para 'Calle/Pute'

                break;

            default:

        }

        if (window.logConfig && window.logConfig.shouldLog('parameter_validation')) {

        }
    }

    // Obter últimos N dígitos do market data
    getLastNDigitsFromMarketData(count) {
        try {
            // VALIDAÇÃO RIGOROSA da entrada - SEM FALLBACKS
            if (!count || typeof count !== 'number' || count < 1 || count > 100) {
                console.error(`⚠️ Valor de count inválido: ${count} `);
                return null; // Retorna null em vez de fallback
            }

            // Obter símbolo atual selecionado (sem fallback)
            const currentSymbol = this.getSelectedSymbol();

            // 🎯 TENTATIVA 1: Usar DerivServiceInstance (Sistema Moderno)
            // Isso permite acessar os dados coletados pelo Monitoring.ts
            let history = null;
            
            if (window.DerivServiceInstance && typeof window.DerivServiceInstance.getHistoricalTicksSync === 'function') {
                try {
                    const modernHistory = window.DerivServiceInstance.getHistoricalTicksSync(currentSymbol, count);
                    if (modernHistory && modernHistory.prices && modernHistory.prices.length > 0) {
                        history = modernHistory;
                        // console.log(`✅ [GENERATE-FORMAT] Usando dados do DerivService moderno para ${currentSymbol}`);
                    }
                } catch (e) {
                    console.warn('⚠️ Erro ao acessar DerivServiceInstance:', e);
                }
            }

            // 🎯 TENTATIVA 2: Usar sistema legado (Fallback)
            if (!history) {
                const token = JSON.parse(localStorage.getItem('deriv_accounts'))?.[0]?.activeToken || null;
                const marketData = getMarketDataInstance(token);
                
                if (marketData) {
                    history = marketData.getHistoricalTicks(currentSymbol, count);
                }
            }

            if (!history) {
                console.error('❌ Market data instance não disponível (Moderno e Legado falharam)');
                return null;
            }

            if (history && history.prices && Array.isArray(history.prices) && history.prices.length > 0) {
                // GARANTIR que pegamos APENAS os últimos N preços, não mais
                const lastPrices = history.prices.slice(-count);

                // Converter APENAS esses preços limitados para dígitos
                const digits = lastPrices.map(price => {
                    if (typeof price !== 'number') {
                        console.error(`❌ Preço não é número: ${price} `);
                        return null;
                    }

                    // ✅ USAR MÉTODO UNIFICADO VIA DERIV SERVICE (MODERNO)
                    const currentSymbol = this.getSelectedSymbol();
                    let lastDigit = null;

                    if (window.DerivServiceInstance && typeof window.DerivServiceInstance.extractLastDigit === 'function') {
                        lastDigit = window.DerivServiceInstance.extractLastDigit(price, currentSymbol);
                    } else {
                        // Fallback para CommonHelpers apenas se DerivService não estiver disponível
                        lastDigit = CommonHelpers.extractLastDigitUnified(price, currentSymbol);
                    }

                    if (lastDigit === null) {
                        console.error(`❌ Dígito inválido extraído de: ${price} `);
                        return null;
                    }

                    return lastDigit;
                });

                // Verificar se todos os dígitos são válidos
                if (digits.includes(null)) {
                    console.error(`❌ Alguns dígitos são inválidos`);
                    return null;
                }

                // Log ocasional para monitoramento
                if (Math.random() < 0.01) { // Log apenas 1% das vezes
                    if (window.logConfig && window.logConfig.shouldLog('market_data')) {

                    }
                }

                // Retornar os dígitos já processados (sem slice adicional)
                return digits;
            }


            return [];
        } catch (error) {
            console.error('❌ Erro ao obter dígitos do market data:', error);
            return null;
        }
    }

    // Verificar se uma regra específica está sendo atendida
    checkRuleCondition(rule, forcedPrice = null) {

        try {
            const ruleType = rule.type;

            switch (ruleType) {
                case 'last_digits':
                    // 🎯 CRÍTICO: Passar preço forçado para checkLastDigitsCondition
                    return this.checkLastDigitsCondition(rule, forcedPrice);

                case 'rsi':
                    return this.checkRSICondition(rule);

                case 'sma':
                    return this.checkSMACondition(rule);

                case 'sma_crossover':
                    try {
                        const smaIndicator = getSMAIndicatorInstance();
                        const symbol = this.getSelectedSymbol();
                        const params = rule.parameters || {};
                        const period1 = rule.period1 || params.period1 || 14;
                        const period2 = rule.period2 || params.period2 || 50;
                        const direction = rule.direction || params.direction || 'any';

                        return smaIndicator.checkSMACrossoverCondition(symbol, period1, period2, direction);
                    } catch (error) {
                        console.error(`❌ Erro ao verificar condição SMA crossover: `, error);
                        return false;
                    }

                case 'support':
                    return this.checkSupportCondition(rule);

                case 'resistance':
                    return this.checkResistanceCondition(rule);

                case 'percentage':
                    const percentageProcessor = getPercentageRulesInstance();
                    return percentageProcessor.checkPercentageCondition(rule, forcedPrice);

                case 'price_move':
                    const priceMovementProcessor = getPriceMovementRulesInstance();
                    return priceMovementProcessor.checkPriceMovementCondition(rule);

                case 'digit_pattern': // Nova verificação para padrões de dígitos
                    const digitPatternProcessor = getDigitPatternRulesInstance();
                    return digitPatternProcessor.checkDigitPatternCondition(rule, forcedPrice);

                case 'sequence':
                    return this.checkSequenceCondition(rule);

                case 'digit_repetition': // Adicionado suporte para digit_repetition
                    const repetitionResult = this.checkDigitRepetitionCondition(rule, forcedPrice);
                    logConfig.debug('generate_format', `🔄[REPETITION CHECK] Regra ${rule.id}: ${repetitionResult ? 'ATENDIDA' : 'NÃO ATENDIDA'} `);
                    return repetitionResult;

                case 'isolated_digits': // ✅ NOVO: Suporte para isolated_digits
                    return this.checkIsolatedDigitsCondition(rule, forcedPrice);

                // ✅ NOVO: Verificar condições de paridade de dígitos (par/ímpar)
                case 'digit_parity':
                    const parityResult = this.checkDigitParityCondition(rule, forcedPrice);
                    logConfig.debug('generate_format', `🔢[PARITY CHECK] Regra ${rule.id}: ${parityResult ? 'ATENDIDA' : 'NÃO ATENDIDA'} `);
                    return parityResult;

                case 'dynamic_prediction':

                    const params = rule.parameters || rule;
                    const possibleTarget = params.target || params.targetValue;
                    if ((possibleTarget === '$LOWER_PROB' || possibleTarget === '$HIGHER_PROB') &&
                        params.value !== undefined && typeof params.value === 'number') {

                        // Redirecionar para lógica de probability_check
                        return this.checkRuleCondition({
                            ...rule,
                            type: 'probability_check',
                            target: possibleTarget, // Garantir que está no campo target
                            parameters: { ...params, target: possibleTarget }
                        }, forcedPrice);
                    }

                    const predParams = rule.parameters || rule;
                    const predType = predParams.predictionType || rule.predictionType;

                    // 1. Conditional Pattern (inclui digit_repetition, digit_sequence, etc)
                    if (predType === 'conditional_pattern') {
                        if (predParams.combinedRule && predParams.combinedRule.patternRule) {
                            // Normalizar e verificar usando o processador de padrões
                            const patternRule = normalizePatternRuleType(predParams.combinedRule.patternRule);

                            // 1.1 Se for digit_repetition, usar método local direto (mais robusto)
                            if (patternRule.type === 'digit_repetition') {
                                return this.checkDigitRepetitionCondition(patternRule, forcedPrice);
                            }

                            // 1.2 Se for digit_pattern ou outro, usar PatternProcessor
                            const digitPatternProcessor = getDigitPatternRulesInstance();
                            const context = { action: predParams.predictionAction, target: predParams.targetValue };
                            const result = digitPatternProcessor.processDigitPatternRule(patternRule, context, forcedPrice);
                            return result ? result.matches : false;
                        }
                        // Se tem tipo mas não tem regra definida, falhar (segurança)
                        return false;
                    }

                    // 2. Conditional Percentage
                    if (predType === 'conditional_percentage') {

                        return this.checkDynamicPredictionCondition(rule, forcedPrice);
                    }

                    // 3. Conditional RSI
                    if (predType === 'conditional_rsi') {
                        if (predParams.combinedRule && predParams.combinedRule.rsiRule) {
                            // Reutilizar checkRSICondition existente
                            const tempRule = {
                                type: 'rsi',
                                parameters: predParams.combinedRule.rsiRule
                            };
                            return this.checkRSICondition(tempRule);
                        }
                        return false;
                    }

                    // 4. Conditional SMA
                    if (predType === 'conditional_sma') {
                        if (predParams.combinedRule && predParams.combinedRule.smaRule) {
                            const smaRule = predParams.combinedRule.smaRule;
                            const tempRule = {
                                type: 'sma',
                                parameters: {
                                    period1: smaRule.period1 || smaRule.period || 14,
                                    period2: smaRule.period2,
                                    operator: smaRule.operator || '>',
                                    value: smaRule.value
                                }
                            };
                            return this.checkSMACondition(tempRule);
                        }
                        return false;
                    }

                    if (rule.parameters?.condition) {
                        const condition = rule.parameters.condition;
                        const conditionType = condition.type || rule.parameters.predictionType;

                        // que tem o handler correto para last_digit_probability_match
                        if (conditionType === 'last_digit_equals' && rule.parameters.predictionType === 'last_digit_probability_match') {

                            return this.checkDynamicPredictionCondition(rule);
                        }

                        const validOperators = ['>', '<', '=', '>=', '<=', '!=', '==', '===', 'match', 'matches'];

                        if (conditionType === 'digit_comparison' || validOperators.includes(conditionType)) {

                            // Determinar operador correto
                            let operator = condition.operator;
                            if (!operator && validOperators.includes(conditionType)) {
                                operator = conditionType;
                            }

                            let count = parseInt(rule.parameters.count || 1, 10);
                            if (isNaN(count) || count < 1) count = 1;

                            // Se count > 1, usar lógica de last_digits (verificar histórico)
                            if (count > 1) {

                                let resolvedValue = condition.value;

                                if (typeof resolvedValue === 'string' && (resolvedValue === '$LOWER_PROB' || resolvedValue === '$HIGHER_PROB')) {
                                    if (typeof getProbabilityResolver === 'function') {
                                        const resolver = getProbabilityResolver();
                                        if (resolver) {
                                            const resolved = resolver.resolve(resolvedValue);
                                            if (resolved !== null) {
                                                resolvedValue = resolved;

                                            } else {
                                                console.warn(`⚠️ [COUNT>1 FIX] Falha ao resolver ${condition.value}`);
                                            }
                                        }
                                    }
                                }

                                const tempRule = {
                                    type: 'last_digits',
                                    count: count,
                                    operator: operator || '==',
                                    value: resolvedValue, // 🎯 USAR VALOR RESOLVIDO
                                    parameters: {
                                        ...condition,
                                        count: count,
                                        value: resolvedValue, // 🎯 USAR VALOR RESOLVIDO
                                        operator: operator || '=='
                                    }
                                };

                                const matches = this.checkLastDigitsCondition(tempRule, forcedPrice);

                                // DEBUG DETALHADO
                                if (window.logConfig?.shouldLog('rule_check') || true) {
                                    const recentDigits = this.getRecentDigitsFromMarket(count, forcedPrice);

                                }

                                // Retornar o resultado booleano diretamente
                                return matches;

                            } else {

                                const tempRule = {
                                    type: 'digit_comparison',
                                    target: condition.target || 'last_digit',
                                    operator: operator || '==',
                                    value: condition.value,
                                    parameters: {
                                        ...condition,
                                        value: condition.value,
                                        target: condition.target || 'last_digit',
                                        operator: operator || '=='
                                    }
                                };


                                return this.checkDigitComparisonCondition(tempRule, forcedPrice);
                            }
                        }
                    }

                    const typesIsalwaysTrue = [
                        'last_digit_inverse', 'last_digit_match',
                        'most_frequent_inverse', 'most_frequent_match',
                        'repeated_digit_inverse', 'repeated_digit_match'

                    ];

                    if (typesIsalwaysTrue.includes(predType)) {

                        // Se "repeated_digit_inverse", só é true se TIVER um repetido agora.
                        if (predType.includes('repeated_digit')) {
                            const patternProcessor = getDigitPatternRulesInstance();
                            // Verificar repetição simples de 2 (padrão)
                            const hasRepetition = patternProcessor.findDigitRepeatedNTimes(2) !== null;
                            return hasRepetition;
                        }
                        return true;
                    }

                    if (predType === 'conditional_value' || predType === 'last_digit_probability_match') {
                        return this.checkDynamicPredictionCondition(rule, forcedPrice);
                    }

                    // A validação será feita no momento da execução do trade
                    if (predParams.explicitPrediction === true && !predType) {
                        if (window.logConfig?.shouldLog('rule_check')) {
                            console.log(`✅ [DYNAMIC-PRED] Regra ${rule.id} é previsão estática (explicitPrediction: true). Retornando TRUE.`);
                        }
                        return true;
                    }

                    if (predType === 'last_digit') {
                        return true;
                    }

                    // Se não é um tipo conhecido, retornar FALSE por segurança
                    console.warn(`⚠️ [DYNAMIC-PRED] Regra ${rule.id} com tipo ${predType || 'DESCONHECIDO'} sem handler. Retornando FALSE.`);
                    return false;

                case 'allowed_digits':
                    return this.checkAllowedDigitsCondition(rule, forcedPrice);

                // 🆕 NOVO: Comparação de Dígitos (Last Digit vs Higher Prob)
                case 'digit_comparison':
                    // 🔍 DEBUG DIAGNÓSTICO: Ver exatamente o que chega aqui
                    if (rule.value === undefined && rule.parameters && rule.parameters.value === null) {
                        console.error(`🚨 [FORMAT-DIAGNOSTIC] Regra chegou com value UNDEFINED!`, JSON.stringify(rule));
                    }
                    return this.checkDigitComparisonCondition(rule, forcedPrice);

                // 🎯 FALLBACK: conditional_percentage pode chegar aqui diretamente
                case 'conditional_percentage': {
                    const percentageProcessorForCheck = getPercentageRulesInstance();
                    return percentageProcessorForCheck.checkPercentageCondition(rule, forcedPrice);
                }

                // 🆕 NOVO: Suporte para verificação de probability_check
                case 'probability_check': {
                    // 1. Obter parâmetros
                    const target = rule.target || rule.parameters?.target;
                    const operator = rule.operator || rule.parameters?.operator;
                    const limitValue = rule.value !== undefined ? rule.value : rule.parameters?.value;

                    if (!target || !operator || limitValue === undefined) {
                        console.error(`❌ [PROB CHECK] Parâmetros incompletos:`, rule);
                        return false;
                    }

                    // 2. Resolver valor atual da variável (com atraso para sincronia)
                    let resolvedDigit = null;
                    if (typeof MonitoringView !== 'undefined' && typeof MonitoringView.calculateProbabilities === 'function') {
                        const stats = MonitoringView.calculateProbabilities(true);
                        if (stats && stats.sorted && stats.sorted.length >= 10) {
                            if (target === '$HIGHER_PROB') resolvedDigit = stats.sorted[0];
                            if (target === '$LOWER_PROB') resolvedDigit = stats.sorted[9];

                            // 🆕 Suporte para valores percentuais
                            if (target === '$HIGHER_PROB_VALUE') resolvedDigit = stats.mostProbableValue;
                            if (target === '$LOWER_PROB_VALUE') resolvedDigit = stats.leastProbableValue;
                        }
                    }

                    if (resolvedDigit === null) {
                        // console.warn(`⚠️ [PROB CHECK] Não foi possível resolver ${target}`);
                        return false;
                    }

                    // normalizar operador
                    const op = this.normalizeOperator(operator);

                    let result = false;
                    switch (op) {
                        case '>': result = resolvedDigit > limitValue; break;
                        case '<': result = resolvedDigit < limitValue; break;
                        case '>=':
                        case '≥': result = resolvedDigit >= limitValue; break;
                        case '<=':
                        case '≤': result = resolvedDigit <= limitValue; break;
                        case '==':
                        case '=': result = resolvedDigit == limitValue; break;
                        case '!=':
                        case '≠': result = resolvedDigit != limitValue; break;
                        default: result = false;
                    }


                    return result;
                }

                // 🆕 NOVO: Suporte para verificação de precisão de probabilidade
                case 'probability_accuracy': {
                    const accManager = window.ProbabilityAccuracyManager ? window.ProbabilityAccuracyManager.getInstance() : null;
                    if (!accManager) return false;

                    const currentAcc = accManager.getAccuracy();
                    const operator = rule.operator || rule.parameters?.operator || '>=';
                    const threshold = rule.value !== undefined ? rule.value : (rule.parameters?.value !== undefined ? rule.parameters.value : 60);

                    const op = this.normalizeOperator(operator);
                    switch (op) {
                        case '>': return currentAcc > threshold;
                        case '<': return currentAcc < threshold;
                        case '>=':
                        case '≥': return currentAcc >= threshold;
                        case '<=':
                        case '≤': return currentAcc <= threshold;
                        case '==':
                        case '=': return Math.abs(currentAcc - threshold) < 0.1;
                        default: return false;
                    }
                }

                default:
                    console.warn(`⚠️ Tipo de regra não suportado para verificação: ${ruleType} `);

                    return false;
            }
        } catch (error) {
            console.error(`❌ Erro crítico ao verificar regra ${rule.id}: `, error);
            return false;
        }
    }
    // 🆕 NOVO: Lógica de Comparação de Dígitos
    checkDigitComparisonCondition(rule, forcedPrice = null) {
        try {
            // Fallback para ler de parameters se não estiver na raiz
            let rTarget = rule.target || (rule.parameters && rule.parameters.target);
            let rValue = rule.value || (rule.parameters && rule.parameters.value);
            // 🎯 FIX: Default operator para '==' se não estiver definido
            let rOperator = rule.operator || (rule.parameters && rule.parameters.operator) || '==';

            let targetValue = null;

            // Resolver o valor do alvo (Target)
            if (rTarget === 'last_digit') {

                // Isso garante que se o visual mostra "0 : 0", a lógica vê "0 : 0"
                const recentDigits = this.getRecentDigitsFromMarket(1, forcedPrice);
                if (recentDigits && recentDigits.length > 0) {
                    targetValue = recentDigits[0]; // Último dígito (mais recente)
                }
            }

            if (targetValue === null) {
                // console.warn('Target value is null for digit_comparison');
                return false;
            }

            // 🎯 FIX: Garantir leitura correta mesmo se parameters.value for null
            let ruleValue = rule.value;
            if (ruleValue === undefined || ruleValue === null) {
                if (rule.parameters && rule.parameters.value !== undefined && rule.parameters.value !== null) {
                    ruleValue = rule.parameters.value;
                }
            }

            // Se ainda for nulo, tentar targetValue (algumas regras usam isso)
            if (ruleValue === undefined || ruleValue === null) {
                ruleValue = rule.targetValue || (rule.parameters && rule.parameters.targetValue);
            }

            // Se ainda for string (não resolvido), tentar resolver aqui como fallback
            if (typeof ruleValue === 'string' && ruleValue.startsWith('$')) {
                if (typeof getProbabilityResolver === 'function') {
                    const resolver = getProbabilityResolver();
                    const resolved = resolver ? resolver.resolve(ruleValue) : null;
                    if (resolved !== null) {
                        ruleValue = resolved;
                    }
                }
            }

            // 🚨 DEBUG CRÍTICO
            if (window.logConfig?.shouldLog('rule_check') || true) {
                // Safe log
                const tVal = targetValue !== undefined ? targetValue : 'undefined';
                const rVal = ruleValue !== undefined ? ruleValue : 'undefined';

            }

            // Isso resolve o problema de comparação entre "8" (string) e 8 (number)
            if (targetValue !== null && targetValue !== undefined) {
                const tNum = parseInt(targetValue, 10);
                if (!isNaN(tNum)) targetValue = tNum;
            }

            if (ruleValue !== null && ruleValue !== undefined) {
                // Se for string numérica ou número
                const rNum = parseInt(ruleValue, 10);
                if (!isNaN(rNum)) ruleValue = rNum;
            }

            // 🚨 DEBUG ATUALIZADO
            if (window.logConfig?.shouldLog('rule_check') || true) {
                // Safe log
                const tVal = targetValue !== undefined ? targetValue : 'undefined';
                const rVal = ruleValue !== undefined ? ruleValue : 'undefined';

            }

            // Usar comparador unificado
            const isConditionMet = this.evaluateDigitsCondition([targetValue], rOperator, ruleValue);

            if (isConditionMet) {
                // 🎯 FIX: Salvar o dígito gatilho para uso na execução do trade
                rule._triggerDigit = targetValue;
                if (rule.parameters) rule.parameters._triggerDigit = targetValue;
            }

            return isConditionMet;
        } catch (e) {
            console.error('Error in digit comparison', e);
            return false;
        }
    }


    // ✅ NOVO: Verificar condição RSI
    checkRSICondition(rule) {
        try {
            // 🎯 CORREÇÃO: Priorizar propriedades diretas
            const period = rule.period || rule.parameters?.period || 14;
            const operator = rule.operator || rule.parameters?.operator;
            const targetValue = (rule.value !== undefined) ? rule.value : rule.parameters?.value;

            if (!operator || targetValue === undefined) {
                console.warn('⚠️ Parâmetros RSI incompletos');
                return false;
            }

            const rsiIndicator = getRSIIndicatorInstance();
            const currentSymbol = this.getSelectedSymbol();
            const currentRSI = rsiIndicator.getCurrentRSI(currentSymbol, period);

            if (currentRSI === null) {
                console.warn(`⚠️ RSI não disponível para ${currentSymbol} `);
                return false;
            }

            switch (operator) {
                case '>': return currentRSI > targetValue;
                case '<': return currentRSI < targetValue;
                case '=': return Math.abs(currentRSI - targetValue) < 0.1;
                case '>=': return currentRSI >= targetValue;
                case '<=': return currentRSI <= targetValue;
                case '!=': return Math.abs(currentRSI - targetValue) >= 0.1;
                default:
                    console.error(`❌ Operador RSI desconhecido: ${operator} `);
                    return false;
            }
        } catch (error) {
            console.error('❌ Erro ao verificar condição RSI:', error);
            return false;
        }
    }

    // ✅ NOVO: Verificar condição SMA
    checkSMACondition(rule) {
        try {
            // 🎯 CORREÇÃO: Priorizar propriedades diretas
            const operator = rule.operator || rule.parameters?.operator;
            const params = rule.parameters || rule; // Fallback para params complexos

            if (!operator) {
                console.warn('⚠️ Operador SMA não especificado');
                return false;
            }

            const smaIndicator = getSMAIndicatorInstance();
            const currentSymbol = this.getSelectedSymbol();

            // SMA comparado com outro SMA
            if (params.period1 && params.period2) {
                return smaIndicator.checkSMAComparison(currentSymbol, params.period1, operator, params.period2);
            }

            // SMA comparado com suporte
            if (params.supportLevel) {
                const period = params.period || 14;
                const smaValue = smaIndicator.getCurrentSMA(currentSymbol, period);
                const supportValue = smaIndicator.getCurrentSupport(currentSymbol, 100);

                if (smaValue === null || supportValue === null) {
                    console.warn('⚠️ SMA ou Suporte não disponível');
                    return false;
                }

                switch (operator) {
                    case '>': return smaValue > supportValue;
                    case '<': return smaValue < supportValue;
                    case '=': return Math.abs(smaValue - supportValue) < 0.00001;
                    case '>=': return smaValue >= supportValue;
                    case '<=': return smaValue <= supportValue;
                    default: return false;
                }
            }

            // SMA comparado com resistência
            if (params.resistanceLevel) {
                const period = params.period || 14;
                const smaValue = smaIndicator.getCurrentSMA(currentSymbol, period);
                const resistanceValue = smaIndicator.getCurrentResistance(currentSymbol, 100);

                if (smaValue === null || resistanceValue === null) {
                    console.warn('⚠️ SMA ou Resistência não disponível');
                    return false;
                }

                switch (operator) {
                    case '>': return smaValue > resistanceValue;
                    case '<': return smaValue < resistanceValue;
                    case '=': return Math.abs(smaValue - resistanceValue) < 0.00001;
                    case '>=': return smaValue >= resistanceValue;
                    case '<=': return smaValue <= resistanceValue;
                    default: return false;
                }
            }

            // SMA comparado com valor fixo
            if (params.value !== undefined && !params.compareWithPrice && params.targetValue !== 'price') {
                const period = params.period || 14;
                return smaIndicator.checkSMACondition(currentSymbol, operator, params.value, period);
            }

            // 🆕 NOVO: Preço comparado com SMA (ex: preço > sma 40)
            const description = (rule.description || '').toLowerCase();
            if (params.compareWithPrice || description.includes('preco') || description.includes('price') || params.targetValue === 'price') {
                const period = params.period || 14;
                const smaValue = smaIndicator.getCurrentSMA(currentSymbol, period);
                const lastTick = smaIndicator.getLastTick(currentSymbol);

                if (smaValue === null || lastTick === null) {
                    return false;
                }

                switch (operator) {
                    case '>': return lastTick > smaValue;
                    case '<': return lastTick < smaValue;
                    case '=': return Math.abs(lastTick - smaValue) < 0.00001;
                    case '>=': return lastTick >= smaValue;
                    case '<=': return lastTick <= smaValue;
                    default: return false;
                }
            }

            console.warn('⚠️ Tipo de condição SMA não reconhecido');
            return false;

        } catch (error) {
            console.error('❌ Erro ao verificar condição SMA:', error);
            return false;
        }
    }

    // ✅ NOVO: Verificar condição de suporte
    checkSupportCondition(rule) {
        try {
            const params = rule.parameters || rule;
            const operator = params.operator;
            const period = params.period || 100;

            if (!operator) {
                console.warn('⚠️ Operador de suporte não especificado');
                return false;
            }

            const smaIndicator = getSMAIndicatorInstance();
            const currentSymbol = this.getSelectedSymbol();

            return smaIndicator.checkSupportResistanceCondition(currentSymbol, 'support', operator, period);

        } catch (error) {
            console.error('❌ Erro ao verificar condição de suporte:', error);
            return false;
        }
    }

    // ✅ NOVO: Verificar condição de resistência
    checkResistanceCondition(rule) {
        try {
            const params = rule.parameters || rule;
            const operator = params.operator;
            const period = params.period || 100;

            if (!operator) {
                console.warn('⚠️ Operador de resistência não especificado');
                return false;
            }

            const smaIndicator = getSMAIndicatorInstance();
            const currentSymbol = this.getSelectedSymbol();

            return smaIndicator.checkSupportResistanceCondition(currentSymbol, 'resistance', operator, period);

        } catch (error) {
            console.error('❌ Erro ao verificar condição de resistência:', error);
            return false;
        }
    }

    // ✅ NOVO: Verificar condição de últimos dígitos
    checkLastDigitsCondition(rule, forcedPrice = null) {
        try {
            // 🎯 CORREÇÃO: Priorizar propriedades diretas da regra (atualizadas via UI)
            const count = rule.count || rule.parameters?.count || 1;
            const operator = rule.operator || rule.parameters?.operator || '>';
            const value = (rule.value !== undefined) ? rule.value : rule.parameters?.value;

            // 🎯 NOVO: Suporte para intervalo customizado (#6#2)
            const startIndex = rule.startIndex || rule.parameters?.startIndex;
            const endIndex = rule.endIndex || rule.parameters?.endIndex;

            if (value === undefined || value === null) {
                console.warn('⚠️ Valor não especificado para regra de dígitos');
                return false;
            }

            // 🎯 LER CONFIGURAÇÃO GLOBAL: Verificar se deve pular dígitos repetidos
            const countRepeated = this.getGlobalCountRepeated();

            // Obter os últimos dígitos do market data (COM PREÇO FORÇADO se houver)
            // Se houver startIndex/endIndex, lidamos com isso aqui ou dentro de getRecentDigitsFromMarket
            const recentDigits = this.getRecentDigitsFromMarket(count, forcedPrice, countRepeated, startIndex, endIndex);

            if (forcedPrice !== null) {
                console.log(`📊 [DELAY 0 DIGITS] Rule ${rule.id} (${operator} ${value}). Digitos: [${recentDigits.join(',')}]`);
            }

            if (!recentDigits || recentDigits.length === 0) {
                return false;
            }

            // Se for intervalo, o length pode ser diferente de count
            const expectedCount = (startIndex && endIndex) ? (Math.abs(startIndex - endIndex) + 1) : count;

            if (recentDigits.length < expectedCount) {
                return false;
            }

            // Avaliar a condição
            return this.evaluateDigitsCondition(recentDigits, operator, value);

        } catch (error) {
            console.error('❌ Erro ao verificar condição de últimos dígitos:', error);
            return false;
        }
    }

    // ✅ NOVO: Obter dígitos recentes do market data (com suporte a Forced Price)
    getRecentDigitsFromMarket(count = 1, forcedPrice = null, countRepeated = true, startIndex = null, endIndex = null) {
        try {
            // Se for intervalo, precisamos de pelo menos o startIndex (ex: #6#2 precisa de 6 tiques)
            const baseCount = (startIndex && endIndex) ? Math.max(startIndex, endIndex) : count;
            const searchCount = countRepeated ? baseCount : Math.min(Math.max(baseCount * 3, 20), 100);

            let availableDigits = this.getLastNDigitsFromMarketData(searchCount);

            if (forcedPrice !== null) {
                const symbol = this.getSelectedSymbol();
                let forcedDigit = null;
                
                if (window.DerivServiceInstance && typeof window.DerivServiceInstance.extractLastDigit === 'function') {
                    forcedDigit = window.DerivServiceInstance.extractLastDigit(forcedPrice, symbol);
                } else {
                    forcedDigit = CommonHelpers.extractLastDigitUnified(forcedPrice, symbol);
                }

                if (!availableDigits) availableDigits = [];

                // 🛡️ EVITAR DUPLICIDADE: Ver se o último dígito do histórico já é o mesmo que o forçado
                const lastHistoricalDigit = availableDigits.length > 0 ? availableDigits[availableDigits.length - 1] : null;

                if (forcedDigit !== null && forcedDigit !== lastHistoricalDigit) {
                    availableDigits.push(forcedDigit);
                }
            }

            if (!availableDigits || availableDigits.length === 0) {
                return [];
            }

            // Lógica de Filtragem de Dígitos Repetidos
            if (!countRepeated) {
                const filtered = [];
                for (let i = 0; i < availableDigits.length; i++) {
                    // Pular se for igual ao anterior
                    if (i === 0 || availableDigits[i] !== availableDigits[i - 1]) {
                        filtered.push(availableDigits[i]);
                    }
                }

                if (filtered.length < baseCount) {
                    // logConfig.debug('generate_format', `[FILTER-LOG] Insufficient unique digits: ${filtered.length}/${baseCount}`);
                }

                // Se for intervalo, aplicar slice customizado nos filtrados
                if (startIndex !== null && endIndex !== null) {
                    // Índices são base 1 (1 = último, 2 = penúltimo, etc)
                    const reversed = [...filtered].reverse();
                    const start = Math.max(startIndex, endIndex);
                    const end = Math.min(startIndex, endIndex);
                    const range = reversed.slice(end - 1, start).reverse();
                    return range;
                }

                return filtered.slice(-count);
            }

            // Padrão: apenas os últimos N ou intervalo
            if (startIndex !== null && endIndex !== null) {
                const reversed = [...availableDigits].reverse();
                const start = Math.max(startIndex, endIndex);
                const end = Math.min(startIndex, endIndex);
                const range = reversed.slice(end - 1, start).reverse();
                return range;
            }

            return availableDigits.slice(-count);

        } catch (error) {
            console.error('❌ Erro ao obter dígitos recentes do market data:', error);
            return [];
        }
    }

    // Avaliar condição dos dígitos
    evaluateDigitsCondition(digits, operator, value) {
        // Para simplificar, vamos verificar quantos dígitos atendem a condição
        const satisfiedCount = digits.filter(digit => {
            // 🛡️ GARANTIA DE TIPO: Converter para números se possível
            let d = digit;
            let v = value;
            if (!isNaN(parseFloat(d))) d = parseFloat(d);
            if (!isNaN(parseFloat(v))) v = parseFloat(v);

            switch (operator) {
                case '<': return d < v;
                case '>': return d > v;
                case '=':
                case '==':
                case '===':
                case 'match':
                case 'matches':
                case 'equal':
                case 'equals':
                    return d === v;
                case '<=': return d <= v;
                case '>=': return d >= v;
                case '!=':
                case '!==':
                    return d !== v;
                default: return false;
            }
        }).length;

        // A regra é atendida se todos os dígitos atendem a condição
        return satisfiedCount === digits.length && digits.length > 0;
    }

    // ✅ NOVO: Verificar condição de dígitos permitidos (allowed_digits)
    checkAllowedDigitsCondition(rule, forcedPrice = null) {
        try {

            const params = rule.parameters || rule;

            // 🔧 CORREÇÃO: Priorizar rule.count (atualizado pela UI) sobre params.count
            const count = rule.count || params.count || 1;

            // Formato 2: objeto {value: [2,5,8], parameter_key: "..."}
            let allowedDigits = params.allowedDigits || [];
            if (allowedDigits && typeof allowedDigits === 'object' && allowedDigits.value && Array.isArray(allowedDigits.value)) {
                allowedDigits = allowedDigits.value;
            }


            if (!allowedDigits || allowedDigits.length === 0) {
                console.warn('⚠️ [ALLOWED DIGITS] Lista de dígitos permitidos não especificada ou vazia');
                console.warn('⚠️ [ALLOWED DIGITS] allowedDigits recebido:', allowedDigits);
                return false;
            }

            // 🎯 LER CONFIGURAÇÃO GLOBAL: Verificar se deve pular dígitos repetidos
            const countRepeated = this.getGlobalCountRepeated();

            // Obter os últimos N dígitos do market data (respeitando countRepeated)
            const recentDigits = this.getRecentDigitsFromMarket(count, forcedPrice, countRepeated);

            if (!recentDigits || recentDigits.length < count) {
                return false;
            }

            // Verificar se TODOS os dígitos estão na lista permitida
            const allDigitsAllowed = recentDigits.every(digit => allowedDigits.includes(digit));


            if (allDigitsAllowed) {

            } else {
                const notAllowedDigits = recentDigits.filter(d => !allowedDigits.includes(d));

            }

            return allDigitsAllowed;

        } catch (error) {
            console.error('❌ Erro ao verificar condição de dígitos permitidos:', error);
            return false;
        }
    }

    // ✅ NOVO: Verificar condição de repetição de dígitos
    checkDigitRepetitionCondition(rule, forcedPrice = null) {
        try {
            const params = rule.parameters || rule;
            if (!params) return false;

            // 🎯 PRIORIDADE: propriedades da raiz (para atualizações via UI)
            const count = rule.count || params.count || 2;
            const startIndex = rule.startIndex || params.startIndex;
            const endIndex = rule.endIndex || params.endIndex;

            // Obter dígitos recentes
            const countRepeated = this.getGlobalCountRepeated();
            const recentDigits = this.getRecentDigitsFromMarket(count, forcedPrice, countRepeated, startIndex, endIndex);

            const expectedCount = (startIndex && endIndex) ? (Math.abs(startIndex - endIndex) + 1) : count;

            if (!recentDigits || recentDigits.length < expectedCount) {
                return false;
            }

            // Verificar se todos os dígitos são iguais
            const firstDigit = recentDigits[0];
            const allSame = recentDigits.every(digit => digit === firstDigit);

            if (allSame) {
                rule._triggerDigit = firstDigit;
                params._triggerDigit = firstDigit;
            } else {
                delete rule._triggerDigit;
                delete params._triggerDigit;
            }

            return allSame;

        } catch (error) {
            console.error('❌ Erro ao verificar repetição de dígitos:', error);
            return false;
        }
    }

    // ✅ NOVO: Verificar condição de paridade de dígitos (par/ímpar)
    checkDigitParityCondition(rule, forcedPrice = null) {
        try {
            const params = rule.parameters || rule;

            if (!params || params.type !== 'digit_parity') {
                return false;
            }

            const count = rule.count || params.count || 1;
            const parity = rule.parity || params.parity; // 'par', 'impar', 'even', 'odd'

            // 🎯 NOVO: Suporte para intervalo
            const startIndex = rule.startIndex || params.startIndex;
            const endIndex = rule.endIndex || params.endIndex;

            const countRepeated = this.getGlobalCountRepeated();
            const recentDigits = this.getRecentDigitsFromMarket(count, forcedPrice, countRepeated, startIndex, endIndex);

            const expectedCount = (startIndex && endIndex) ? (Math.abs(startIndex - endIndex) + 1) : count;

            if (!recentDigits || recentDigits.length < expectedCount) {
                return false;
            }

            // Normalizar paridade para inglês
            const normalizedParity = parity === 'par' ? 'even' : (parity === 'impar' ? 'odd' : parity);

            // Verificar se todos os dígitos atendem à condição de paridade
            const allSatisfied = recentDigits.every(digit => {
                if (normalizedParity === 'even') {
                    return digit % 2 === 0;
                } else if (normalizedParity === 'odd') {
                    return digit % 2 !== 0;
                }
                return false;
            });

            return allSatisfied;

        } catch (error) {
            console.error('❌ [DIGIT PARITY] Erro ao verificar paridade de dígitos:', error);
            return false;
        }
    }

    // ✅ INCREMENTAL: Verificar condição de dítigos isolados (Ultra Performance)
    // Analisa apenas o NOVO dígito que chega, agindo como os outros contadores do sistema.
    checkIsolatedDigitsCondition(rule, forcedPrice = null) {
        try {
            const params = rule.parameters || rule;
            const requiredCount = params.count || rule.count || 2;
            const operator = this.normalizeOperator(params.operator || rule.operator || '>');

            // 1. Resolver variável de probabilidade se necessário
            let ruleValue = params.value !== undefined ? params.value : rule.value;
            if (typeof ruleValue === 'string' && ruleValue.startsWith('$')) {
                const resolver = typeof getProbabilityResolver === 'function' ? getProbabilityResolver() : null;
                const resolved = resolver ? resolver.resolve(ruleValue) : null;
                if (resolved !== null) ruleValue = resolved;
            }
            const value = parseFloat(ruleValue);

            if (isNaN(value)) {
                if (window.logConfig?.shouldLog('rule_check')) {
                    console.warn(`[ISOLATED] Valor inválido para a regra:`, ruleValue);
                }
                return false;
            }

            const currentSymbol = this.getSelectedSymbol();
            const marketData = getMarketDataInstance(SessionManager.getLocalToken());

            // 2. Determinar o preço e dígito atual (Priorizar forcedPrice)
            let currentPrice = null;
            let currentTickTime = null;

            if (forcedPrice !== null && forcedPrice !== undefined) {
                currentPrice = forcedPrice;
                currentTickTime = Date.now(); // Para evitar detecção dupla no mesmo tick real
            } else {
                const lastHistory = marketData.getLastNTicks(currentSymbol, 1);
                if (!lastHistory || !lastHistory.prices || lastHistory.prices.length === 0) return false;
                currentPrice = lastHistory.prices[0];
                currentTickTime = lastHistory.times[0];
            }

            let currentDigit = null;
            if (window.DerivServiceInstance && typeof window.DerivServiceInstance.extractLastDigit === 'function') {
                currentDigit = window.DerivServiceInstance.extractLastDigit(currentPrice, currentSymbol);
            } else {
                currentDigit = CommonHelpers.extractLastDigitUnified(currentPrice, currentSymbol);
            }

            if (currentDigit === null) return false;

            // 🚀 OTIMIZAÇÃO: Se já processamos este tick para esta regra, retornar o valor atual
            if (rule._lastTickTime === currentTickTime) {
                return (rule.currentValue || 0) >= requiredCount;
            }

            // Função de auxilio para o match
            const isMatch = (d) => {
                if (d === null || d === undefined) return false;
                switch (operator) {
                    case '>': return d > value;
                    case '<': return d < value;
                    case '=':
                    case '==':
                    case '===': return d === value;
                    case '≥':
                    case '>=': return d >= value;
                    case '≤':
                    case '<=': return d <= value;
                    case '≠':
                    case '!=': return d !== value;
                    default: return false;
                }
            };

            // 3. Inicialização (Sem histórico, começando do zero conforme solicitado)
            if (rule._isolatedSequence === undefined) {
                rule.currentValue = 0;
                rule._isolatedSequence = [];
                rule._recentDigits = [];
                rule._lastTickTime = currentTickTime;

                // Salvar o dígito atual para ter o buffer preenchido para o próximo tick
                rule._recentDigits.push(currentDigit);
                return false;
            }

            // 4. Lógica Incremental O(1) - Processa apenas o novo dígito
            const prev1 = rule._recentDigits.length > 0 ? rule._recentDigits[rule._recentDigits.length - 1] : null;
            const prev2 = rule._recentDigits.length > 1 ? rule._recentDigits[rule._recentDigits.length - 2] : null;

            if (isMatch(prev1)) {
                if (isMatch(currentDigit)) {
                    rule.currentValue = 0;
                    rule._isolatedSequence = [];
                }
                else if (!isMatch(prev2)) {
                    rule.currentValue++;
                    rule._isolatedSequence.push(prev1);

                    if (rule._isolatedSequence.length > 20) rule._isolatedSequence.shift();
                }
            }

            // 5. Atualizar buffer [D-2, D-1] para o próximo tick
            rule._recentDigits.push(currentDigit);
            if (rule._recentDigits.length > 2) rule._recentDigits.shift();
            rule._lastTickTime = currentTickTime;

            return (rule.currentValue || 0) >= requiredCount;



        } catch (error) {
            console.error('❌ [ISOLATED-INCREMENTAL] Erro:', error);
            rule.currentValue = 0;
            return false;
        }
    }





    checkSequenceCondition(rule) {
        try {
            const params = rule.parameters || rule;
            const requiredCount = params.count;
            const direction = params.direction;
            const currentSymbol = this.getSelectedSymbol();
            const marketData = getMarketDataInstance(SessionManager.getLocalToken());

            // Obter histórico suficiente para análise sequencial
            const history = marketData.getHistoricalTicks(currentSymbol, Math.max(requiredCount + 20, 30));

            if (!history || !history.prices || history.prices.length < 2) {
                rule.currentValue = 0;
                return false;
            }

            const prices = history.prices;
            let consecutiveCount = 0;

            // Começar do tick mais recente e contar quantos consecutivos temos
            for (let i = prices.length - 1; i > 0; i--) {
                const currentTick = parseFloat(prices[i]);
                const previousTick = parseFloat(prices[i - 1]);

                let tickIsValid = false;

                if (direction === 'up') {
                    tickIsValid = currentTick > previousTick;
                } else if (direction === 'down') {
                    tickIsValid = currentTick < previousTick;
                }

                if (tickIsValid) {
                    consecutiveCount++;

                    // Se atingiu o necessário, continuar contando para mostrar progresso completo
                    if (consecutiveCount >= requiredCount) {
                        // Mas limitar o máximo para não crescer infinitamente
                        if (consecutiveCount >= requiredCount + 2) {
                            break;
                        }
                    }
                } else {

                    break;
                }
            }

            rule.currentValue = consecutiveCount;
            const isConditionMet = consecutiveCount >= requiredCount;

            // Log do status atual
            if (Math.random() < 0.05) { // Log ocasional
                const status = isConditionMet ? '✅ ATENDIDA' : `⏳ ${consecutiveCount}/${requiredCount}`;

            }

            return isConditionMet;

        } catch (error) {
            console.error('❌ [SEQUENCE] Erro:', error);
            rule.currentValue = 0;
            return false;
        }
    }



    checkDynamicPredictionCondition(rule, forcedPrice = null) {
        try {
            const params = rule.parameters || rule;
            // 🎯 FIX: Robustez na detecção dos tipos
            const predictionType = params.predictionType || rule.predictionType;
            const combinedRule = params.combinedRule || rule.combinedRule;
            const predictionAction = params.predictionAction || rule.predictionAction;

            // Variável para acumular o resultado das condições
            let isSatisfied = true;
            let conditionsChecked = 0;

            // 1. Verificação de Probabilidade (last_digit_probability_match)
            if (predictionType === 'last_digit_probability_match') {
                conditionsChecked++;
                const condition = params.condition || {};
                // 🎯 FIX: Buscar em múltiplos locais (mesma lógica do visual format)
                const originalProbabilityVariable = condition.probabilityVariable || params.targetValue || rule.targetValue;

                const resolver = getProbabilityResolver();

                if (resolver) {
                    const probabilityVariable = params.probabilityVariable ||
                        rule.probabilityVariable ||
                        (params.condition && params.condition.probabilityVariable) ||
                        (rule.condition && rule.condition.probabilityVariable);

                    let expectedDigit = null;
                    if (typeof probabilityVariable === 'number') {
                        expectedDigit = probabilityVariable;
                    } else if (typeof probabilityVariable === 'string' && probabilityVariable.startsWith('$')) {
                        // 🎯 FIX DESYNC: Usar resolve(..., false) para sincronizar com o que o usuário vê na barra de probabilidade (UI)
                        expectedDigit = resolver.resolve(probabilityVariable, false);
                    } else {
                        // Fallback: tentar converter para número se for string numérica
                        expectedDigit = parseInt(probabilityVariable);
                        if (isNaN(expectedDigit)) expectedDigit = null;
                    }

                    // 🎯 NOVO: Verificar se o dígito esperado (da probabilidade) satisfaz um limite
                    // Útil para regras como "menor chance > 5"
                    const op = this.normalizeOperator(params.operator || rule.operator);
                    const limitVal = params.value !== undefined ? params.value : rule.value;

                    if (expectedDigit !== null && limitVal !== undefined && op) {
                        let conditionMet = false;
                        switch (op) {
                            case '>': conditionMet = expectedDigit > limitVal; break;
                            case '<': conditionMet = expectedDigit < limitVal; break;
                            case '>=':
                            case '≥': conditionMet = expectedDigit >= limitVal; break;
                            case '<=':
                            case '≤': conditionMet = expectedDigit <= limitVal; break;
                            case '==':
                            case '=': conditionMet = expectedDigit == limitVal; break;
                            case '!=':
                            case '≠': conditionMet = expectedDigit != limitVal; break;
                            default: conditionMet = true; // Se operador for um match de dígito (ex: '=') e não comparação
                        }

                        // Se o dígito da probabilidade não atingir o critério, a regra não é satisfeita
                        if (!conditionMet) {
                            isSatisfied = false;
                        }
                    }

                    if (isSatisfied) {
                        const startIndex = params.startIndex || rule.startIndex;
                        const endIndex = params.endIndex || rule.endIndex;
                        const count = parseInt(params.count || rule.count || 1);
                        const countRepeated = this.getGlobalCountRepeated();
                        const lastDigits = this.getRecentDigitsFromMarket(count, forcedPrice, countRepeated, startIndex, endIndex);

                        if (expectedDigit !== null && lastDigits && lastDigits.length >= count) {

                            const allMatch = lastDigits.every(digit => digit == expectedDigit);

                            if (allMatch) {
                                // Marcar triggerDigit para exibição no monitoramento
                                rule._triggerDigit = expectedDigit;
                                if (rule.parameters) rule.parameters._triggerDigit = expectedDigit;
                            } else {
                                isSatisfied = false;
                            }
                        } else {
                            // 🔍 LOG DE ERRO: Por que os dados não estão disponíveis?
                            if (Math.random() < 0.1) {
                                console.warn(`⚠️ [PROB-CHECK] Falha nos dados: expectedDigit=${expectedDigit}, lastDigits=${lastDigits?.length || 0}`);
                            }
                            isSatisfied = false;
                        }
                    }

                } else {
                    isSatisfied = false;
                }
            }

            // 2. Verificação de Padrões (conditional_pattern ou combinedRule.patternRule)
            if (isSatisfied && (predictionType === 'conditional_pattern' || (combinedRule && combinedRule.patternRule))) {
                conditionsChecked++;
                const patternRule = combinedRule ? (combinedRule.patternRule || combinedRule.digit_pattern) : null;

                if (patternRule) {
                    const normalizedRule = normalizePatternRuleType(patternRule);
                    if (normalizedRule.type === 'digit_repetition') {
                        const startIndex = normalizedRule.startIndex || params.startIndex || rule.startIndex;
                        const endIndex = normalizedRule.endIndex || params.endIndex || rule.endIndex;
                        const count = normalizedRule.count || 2;
                        const countRepeated = this.getGlobalCountRepeated();
                        const digits = this.getRecentDigitsFromMarket(count, forcedPrice, countRepeated, startIndex, endIndex);
                        if (digits && digits.length >= count) {
                            const firstDigit = digits[0];
                            const allSame = digits.every(digit => digit === firstDigit);
                            if (allSame) {
                                rule._triggerDigit = firstDigit;
                                if (params) params._triggerDigit = firstDigit;
                            } else {
                                isSatisfied = false;
                            }
                        } else {
                            isSatisfied = false;
                        }
                    } else if (normalizedRule.type === 'digit_pattern') {
                        const digitPatternProcessor = getDigitPatternRulesInstance();
                        // 🎯 PASSAR CONTEXTO: Garantir que a ação/alvo da regra dinâmica chegue no processador de padrão
                        const tempRule = {
                            type: 'digit_pattern',
                            parameters: normalizedRule,
                            contextAction: predictionAction,
                            contextTarget: params.targetValue !== undefined ? params.targetValue : rule.targetValue
                        };
                        if (!digitPatternProcessor.checkDigitPatternCondition(tempRule)) {
                            isSatisfied = false;
                        }
                    }
                }
            }

            // 3. Verificação de Percentual (conditional_percentage ou combinedRule.percentageRule)
            if (isSatisfied && (predictionType === 'conditional_percentage' || (combinedRule && combinedRule.percentageRule))) {
                conditionsChecked++;
                const pRule = combinedRule ? combinedRule.percentageRule : null;
                if (pRule) {
                    const percentageProcessor = getPercentageRulesInstance();
                    const tempRule = {
                        type: 'dynamic_prediction',
                        parameters: { predictionType: 'conditional_percentage', combinedRule: { percentageRule: pRule } }
                    };
                    if (percentageProcessor.checkPercentageCondition(tempRule)) {
                        if (tempRule._triggerDigit !== undefined) {
                            rule._triggerDigit = tempRule._triggerDigit;
                            rule._triggerPercentage = tempRule._triggerPercentage;
                        }
                    } else {
                        isSatisfied = false;
                    }
                }
            }

            // 4. Verificação de Valores Simples ou allowedDigits (conditional_value)
            if (isSatisfied && predictionType === 'conditional_value') {
                conditionsChecked++;

                // Formato 2: objeto {value: [2,5,8], parameter_key: "..."}
                let allowedDigits = params.allowedDigits || (params.condition ? params.condition.allowedDigits : []);
                if (allowedDigits && typeof allowedDigits === 'object' && allowedDigits.value && Array.isArray(allowedDigits.value)) {
                    allowedDigits = allowedDigits.value;
                }

                const startIndex = params.startIndex || rule.startIndex;
                const endIndex = params.endIndex || rule.endIndex;
                const count = params.count || rule.count || 1;
                const countRepeated = this.getGlobalCountRepeated();
                const digits = this.getRecentDigitsFromMarket(count, forcedPrice, countRepeated, startIndex, endIndex);

                if (digits && digits.length >= count) {
                    if (allowedDigits && allowedDigits.length > 0) {
                        if (!digits.every(digit => allowedDigits.includes(digit))) {
                            isSatisfied = false;
                        }
                    } else if (params.condition && params.condition.type) {
                        const cType = params.condition.type;
                        const cValue = parseFloat(params.condition.value);
                        if (!digits.every(digit => {
                            switch (cType) {
                                case '>': return digit > cValue;
                                case '<': return digit < cValue;
                                case '=': return digit == cValue;
                                case '>=': return digit >= cValue;
                                case '<=': return digit <= cValue;
                                case 'digit_parity':
                                case 'parity':
                                    const conditionObj = params.condition || {};
                                    // 🎯 FIX: Ler parity OU value e garantir conversão correta
                                    const pVal = (conditionObj.parity || conditionObj.value || 'par').toLowerCase();
                                    const dInt = parseInt(digit, 10);
                                    if (isNaN(dInt)) return false;

                                    const isEven = dInt % 2 === 0;
                                    if (pVal === 'par' || pVal === 'even') return isEven;
                                    return !isEven;
                                default: return false;
                            }
                        })) {
                            isSatisfied = false;
                        }
                    }
                } else {
                    isSatisfied = false;
                }
            }

            if (isSatisfied && (predictionType === 'conditional_probability_accuracy' || (combinedRule && combinedRule.probabilityAccuracyRule))) {
                conditionsChecked++;
                const accRule = combinedRule ? combinedRule.probabilityAccuracyRule : null;
                if (accRule) {
                    const accManager = window.ProbabilityAccuracyManager ? window.ProbabilityAccuracyManager.getInstance() : null;
                    if (accManager) {
                        const currentAcc = accManager.getAccuracy();
                        const operator = accRule.operator || '>=';
                        const threshold = accRule.value !== undefined ? accRule.value : 60;

                        const op = this.normalizeOperator(operator);
                        let met = false;
                        switch (op) {
                            case '>': met = currentAcc > threshold; break;
                            case '<': met = currentAcc < threshold; break;
                            case '>=':
                            case '≥': met = currentAcc >= threshold; break;
                            case '<=':
                            case '≤': met = currentAcc <= threshold; break;
                            case '==':
                            case '=': met = Math.abs(currentAcc - threshold) < 0.1; break;
                        }
                        if (!met) isSatisfied = false;
                    } else {
                        isSatisfied = false;
                    }
                }
            }

            // 6. Verificação de SMA (conditional_sma ou combinedRule.smaRule)
            if (isSatisfied && (predictionType === 'conditional_sma' || (combinedRule && combinedRule.smaRule))) {
                conditionsChecked++;
                const smaRule = combinedRule ? (combinedRule.smaRule || combinedRule) : (params.smaRule || params);
                if (smaRule) {
                    const smaIndicator = typeof getSMAIndicatorInstance === 'function' ? getSMAIndicatorInstance() : null;
                    if (smaIndicator) {
                        const symbol = this.getSelectedSymbol();
                        const period = smaRule.period || params.period || 14;
                        const operator = smaRule.operator || params.operator || '>';

                        // Detecção robusta de comparação com preço
                        const isPriceMatch = smaRule.compareWithPrice ||
                            (rule.description || '').toLowerCase().includes('preco') ||
                            (rule.description || '').toLowerCase().includes('price') ||
                            smaRule.targetValue === 'price';

                        if (isPriceMatch) {
                            const smaValue = smaIndicator.getCurrentSMA(symbol, period);
                            const lastTick = smaIndicator.getLastTick(symbol);
                            if (smaValue === null || lastTick === null) {
                                isSatisfied = false;
                            } else {
                                switch (operator) {
                                    case '>': isSatisfied = lastTick > smaValue; break;
                                    case '<': isSatisfied = lastTick < smaValue; break;
                                    case '=': isSatisfied = Math.abs(lastTick - smaValue) < 0.00001; break;
                                    case '>=': isSatisfied = lastTick >= smaValue; break;
                                    case '<=': isSatisfied = lastTick <= smaValue; break;
                                    default: isSatisfied = false;
                                }
                            }
                        } else {
                            const val = smaRule.value !== undefined ? smaRule.value : (params.value || 0);
                            if (!smaIndicator.checkSMACondition(symbol, operator, val, period)) {
                                isSatisfied = false;
                            }
                        }
                    } else {
                        isSatisfied = false;
                    }
                }
            }

            // 7. Verificação de RSI (conditional_rsi ou combinedRule.rsiRule)
            if (isSatisfied && (predictionType === 'conditional_rsi' || (combinedRule && combinedRule.rsiRule))) {
                conditionsChecked++;
                const rsiRule = combinedRule ? (combinedRule.rsiRule || combinedRule) : (params.rsiRule || params);
                if (rsiRule) {
                    const rsiIndicator = typeof getRSIIndicatorInstance === 'function' ? getRSIIndicatorInstance() : null;
                    if (rsiIndicator) {
                        const symbol = this.getSelectedSymbol();
                        const period = rsiRule.period || params.period || 14;
                        const operator = rsiRule.operator || params.operator || '>';
                        const val = rsiRule.value !== undefined ? rsiRule.value : (params.value || 50);

                        if (!rsiIndicator.checkRSICondition(symbol, operator, val, period)) {
                            isSatisfied = false;
                        }
                    } else {
                        isSatisfied = false;
                    }
                }
            }

            // Se não houver condições específicas mas for um dynamic_prediction simples
            if (conditionsChecked === 0 && !predictionType) {
                return true;
            }

            const result = isSatisfied && conditionsChecked > 0;

            return result;
        } catch (error) {
            console.error('❌ [DYNAMIC PREDICTION] Erro:', error);
            return false;
        }
    }


    // 🎯 NOVO: Normalizar estrutura de regras "achatadas" ou incorretas da IA
    normalizeRuleStructure(rule, contextAction = null) {
        const description = (rule.description || '').toLowerCase();
        const type = rule.type;
        const params = rule.parameters || {};
        const predictionType = rule.predictionType || params.predictionType;

        // deve seguir para a normalização de probabilidade abaixo.
        const isProbDesc = description.includes('chance') || description.includes('prob');

        if ((type === 'rsi' || type === 'sma' || (type === 'last_digits' && !isProbDesc)) ||
            (type === 'dynamic_prediction' && predictionType)) {
            return rule;
        }

        // Caso 1: Fala de "chance" ou "probabilidade" OU contém variáveis especiais
        const hasProbVar = (val) => typeof val === 'string' && (val.includes('$LOWER_PROB') || val.includes('$HIGHER_PROB'));

        const isProbability = description.includes('chance') || description.includes('prob') ||
            hasProbVar(rule.targetValue) || hasProbVar(params.targetValue) ||
            (params && (params.probabilityVariable || params.probability_variable));

        if (isProbability) {
            if (window.logConfig?.shouldLog('rule_check')) {
                console.info(`🎯 [NORMALIZE] Forçando regra para probabilidade: "${description}"`);
            }

            const probVar = description.includes('menor') ||
                (rule.targetValue === '$LOWER_PROB' || params.targetValue === '$LOWER_PROB')
                ? '$LOWER_PROB' : '$HIGHER_PROB';

            // 🎯 NOVO: Tentar extrair count da descrição se for 1 ou indefinido
            let finalCount = rule.count || params.count || 1;
            if (finalCount === 1) {
                const countMatch = description.match(/(\d+)\s+[uú]ltimos?\s+d[ií]gito/i);
                if (countMatch) finalCount = parseInt(countMatch[1]);
            }

            // 🎯 FIX: Só forçar fallback ('differ'/'match') se houver menção no texto ou se for essencial.
            // Se vier nulo do PromptManager e não houver contexto, mantém nulo para usar a Base (UI).
            let finalAction = rule.predictionAction || contextAction;
            if (!finalAction && (description.includes('match') || description.includes('differ'))) {
                finalAction = description.includes('match') ? 'match' : 'differ';
            }

            const finalTarget = rule.targetValue && rule.targetValue !== 'dynamic_probability' ? rule.targetValue : probVar;
            const explicitPrediction = !!(rule.predictionAction || rule.targetValue || description.includes('match') || description.includes('differ') || description.includes('chance') || description.includes('prob'));

            return {
                ...rule, // Manter todos os campos originais
                type: 'dynamic_prediction',
                predictionType: 'last_digit_probability_match',
                predictionAction: finalAction,
                targetValue: finalTarget,
                count: finalCount,
                explicitPrediction: explicitPrediction,
                parameters: {
                    ...rule.parameters,
                    type: 'dynamic_prediction',
                    predictionType: 'last_digit_probability_match',
                    predictionAction: finalAction,
                    targetValue: finalTarget,
                    count: finalCount,
                    condition: {
                        type: 'last_digit_probability_match',
                        probabilityVariable: probVar
                    }
                }
            };
        }

        // 🕵️‍♂️ CASO 2: Regra de Padrão (conditional_pattern) na raiz
        if (type === 'conditional_pattern' || type === 'digit_pattern') {
            const pattern = rule.pattern || (rule.parameters && rule.parameters.pattern) || 'XOX';

            // 🎯 FIX: Permitir nulo para fallback
            let finalAction = rule.predictionAction || contextAction;
            if (!finalAction && (description.includes('match') || description.includes('differ'))) {
                finalAction = description.includes('match') ? 'match' : 'differ';
            }

            return {
                ...rule,
                type: 'dynamic_prediction',
                predictionType: 'conditional_pattern',
                predictionAction: finalAction,
                targetValue: rule.targetValue || 'dynamic_pattern_match',
                explicitPrediction: !!(finalAction || rule.targetValue),
                parameters: {
                    ...rule.parameters,
                    combinedRule: {
                        patternRule: {
                            type: 'digit_pattern',
                            pattern: pattern,
                            pattern_type: 'loser_winner',
                            contextAction: finalAction,
                            contextTarget: rule.targetValue || 'dynamic_pattern_match'
                        }
                    }
                }
            };
        }

        // 🕵️‍♂️ CASO 3: Regra de Valor do Último Dígito (last_digit_equals)
        if (type === 'last_digit_equals' || type === 'digit_value') {
            const value = rule.value !== undefined ? rule.value : (rule.parameters && rule.parameters.value);

            return {
                ...rule,
                type: 'dynamic_prediction',
                predictionAction: rule.predictionAction || contextAction || (description.includes('differ') ? 'differ' : 'match'),
                targetValue: rule.targetValue || value,
                explicitPrediction: true,
                parameters: {
                    ...rule.parameters,
                    condition: {
                        value: value,
                        operator: '='
                    }
                }
            };
        }

        return rule;
    }

    // Formatar resposta do Gemini para uso no sistema
    formatGeminiResponse(geminiResponse) {
        try {
            // Log controlado para formatação do Gemini
            if (window.logConfig && window.logConfig.shouldLog('gemini_format')) {

            }

            const groups = geminiResponse.groups || [];

            if (window.logConfig && window.logConfig.shouldLog('gemini_format')) {

            }

            const formattedGroups = groups.map((group, groupIndex) => {
                if (window.logConfig && window.logConfig.shouldLog('gemini_format')) {

                }

                const rules = group.rules || [];

                if (window.logConfig && window.logConfig.shouldLog('gemini_format')) {

                }

                // Se o primeiro item ou qualquer item tem "differ", o grupo todo é differ
                let groupAction = null;
                rules.forEach(r => {
                    const desc = (r.description || '').toLowerCase();
                    if (desc.includes('differ') || r.predictionAction === 'differ') {
                        groupAction = 'differ';
                    } else if (!groupAction && (desc.includes('match') || r.predictionAction === 'match')) {
                        groupAction = 'match';
                    }
                });

                const formattedRules = rules.map((rawRule, ruleIndex) => {
                    try {
                        // 🛡️ NORMALIZAÇÃO: Corrigir estrutura antes de qualquer processamento
                        const rule = this.normalizeRuleStructure(rawRule, groupAction);


                        // 🎯 REFINAMENTO: Atualizar parâmetros baseados na descrição
                        this.refineParametersFromDescription(rule);

                        const formattedRule = {
                            id: rule.id ? `${groupIndex + 1}_${rule.id}` : `g${groupIndex + 1}r${ruleIndex + 1}`,
                            type: rule.type,
                            description: rule.description,
                            displayFormat: '', // Será gerado após sincronização de parâmetros
                            parameters: FormatGenerator.extractParameters(rule),
                            status: 'waiting', // waiting, satisfied, failed
                            currentValue: null
                        };

                        const syncParams = ['count', 'value', 'operator', 'targetValue', 'targetPercentage', 'period', 'predictionAction', 'predictionType', 'combinedRule', 'condition', 'pattern', 'parity', 'direction', 'parameters_ui'];
                        syncParams.forEach(param => {

                            if (rule[param] !== undefined) {
                                formattedRule[param] = rule[param];
                                // Garantir que esteja em parameters também
                                if (formattedRule.parameters) {
                                    formattedRule.parameters[param] = rule[param];
                                }
                            }
                            // 2. Ou se existe em rule.parameters (vindo de refine ou da IA)
                            else if (rule.parameters && rule.parameters[param] !== undefined) {
                                formattedRule[param] = rule.parameters[param];
                                if (formattedRule.parameters) {
                                    formattedRule.parameters[param] = rule.parameters[param];
                                }
                            }
                        });

                        // 🛡️ SINCRONIZAR CONDITION: Se refine alterou condition, propagar
                        if (rule.parameters?.condition && formattedRule.parameters) {
                            formattedRule.parameters.condition = {
                                ...formattedRule.parameters.condition,
                                ...rule.parameters.condition
                            };
                        }


                        if (formattedRule.parameters && formattedRule.parameters.parameters) {

                            delete formattedRule.parameters.parameters;
                        }

                        formattedRule.displayFormat = this.generateDisplayFormat(formattedRule);

                        if (window.logConfig && window.logConfig.shouldLog('gemini_format')) {

                        }

                        return formattedRule;
                    } catch (ruleError) {
                        // 🆕 CAPTURAR ERROS ESPECÍFICOS POR REGRA
                        console.error(`❌ [FORMAT ERROR] Erro ao formatar regra ${ruleIndex + 1}:`, ruleError);

                        // Criar erro detalhado para o usuário
                        const errorDetails = {
                            ruleIndex: ruleIndex + 1,
                            groupIndex: groupIndex + 1,
                            ruleDescription: (typeof rule !== 'undefined' && rule && rule.description) || (rawRule && rawRule.description) || 'Descrição não disponível',
                            errorType: ruleError.name || 'Error',
                            errorMessage: ruleError.message || 'Erro desconhecido',
                            ruleType: (typeof rule !== 'undefined' && rule && rule.type) || (rawRule && rawRule.type),
                            hasAllowedDigits: !!((typeof rule !== 'undefined' && rule && rule.allowedDigits) || (rawRule && (rawRule.allowedDigits || rawRule.parameters?.allowedDigits)))
                        };

                        // Lançar erro com contexto
                        const detailedError = new Error(
                            `Erro ao processar regra ${errorDetails.ruleIndex} do grupo ${errorDetails.groupIndex}: ${errorDetails.errorMessage}`
                        );
                        detailedError.ruleDetails = errorDetails;
                        detailedError.originalError = ruleError;
                        throw detailedError;
                    }
                });

                // Adicionar regras formatadas ao grupo
                return {
                    ...group, // Mantém outras propriedades do grupo, se houver
                    rules: formattedRules,
                    status: 'inactive' // inactive, active, satisfied
                };
            });

            // 🎯 FIX: SEMPRE gerar parâmetros a partir das regras formatadas
            // Isso garante que o generateEditableParameters rode e corrija os labels de grupo (G1R1 -> G2R1)
            let finalParameters = [];

            // (Removido bloco que usava geminiResponse.parameters direto)

            // Gerar parâmetros a partir das regras formatadas
            formattedGroups.forEach((group, groupIndex) => {
                group.rules.forEach((rule, ruleIndex) => {
                    try {
                        if (rule.parameters && typeof rule.parameters === 'object') {
                            const ruleParams = this.generateEditableParameters(rule, groupIndex, ruleIndex);
                            finalParameters.push(...ruleParams);
                        }
                    } catch (paramError) {
                        // 🆕 CAPTURAR ERROS NA GERAÇÃO DE PARÂMETROS
                        console.error(`❌ [PARAM ERROR] Erro ao gerar parâmetros para G${groupIndex + 1}R${ruleIndex + 1}:`, paramError);

                        const detailedError = new Error(
                            `Erro ao gerar parâmetros editáveis para regra ${ruleIndex + 1} do grupo ${groupIndex + 1}: ${paramError.message}`
                        );
                        detailedError.paramDetails = {
                            groupIndex: groupIndex + 1,
                            ruleIndex: ruleIndex + 1,
                            ruleType: rule.type,
                            errorMessage: paramError.message
                        };
                        throw detailedError;
                    }
                });
            });

            // Atualizar o total de regras formatadas
            let totalRulesFormatted = 0;
            formattedGroups.forEach(group => {
                totalRulesFormatted += group.rules.length;
            });


            return {
                groups: formattedGroups,
                parameters: finalParameters,
                totalRules: totalRulesFormatted,
                logic: geminiResponse.logic || "OR entre grupos, AND dentro do grupo"
            };

        } catch (error) {
            // 🆕 TRATAMENTO DE ERRO GLOBAL COM MENSAGENS DETALHADAS
            console.error('❌ [FORMAT GEMINI RESPONSE] Erro crítico:', error);

            // Criar mensagem de erro amigável baseada no tipo de erro
            let userMessage = 'Erro ao processar a resposta do Gemini AI';
            let suggestions = [];

            // Detectar tipos específicos de erro
            if (error.message && error.message.includes('is not a function')) {
                userMessage = 'Erro de função não encontrada durante o processamento';
                suggestions.push('A resposta do Gemini pode conter código inválido');
                suggestions.push('Tente simplificar sua regra');
                suggestions.push('Evite usar sintaxes muito complexas');
            }

            if (error.ruleDetails) {
                userMessage = `Erro na regra ${error.ruleDetails.ruleIndex} do grupo ${error.ruleDetails.groupIndex}`;
                suggestions.push(`Regra problemática: "${error.ruleDetails.ruleDescription}"`);

                if (error.ruleDetails.hasAllowedDigits) {
                    suggestions.push('Problema detectado em regra com lista de dígitos =(x,x,x)');
                    suggestions.push('Tente usar uma sintaxe diferente, como "ultimos 2 digitos > 5"');
                }
            }

            if (error.paramDetails) {
                userMessage = `Erro ao gerar parâmetros editáveis`;
                suggestions.push(`Grupo ${error.paramDetails.groupIndex}, Regra ${error.paramDetails.ruleIndex}`);
                suggestions.push(`Tipo de regra: ${error.paramDetails.ruleType}`);
            }

            // Adicionar sugestões gerais se não houver específicas
            if (suggestions.length === 0) {
                suggestions.push('Verifique se a sintaxe da regra está correta');
                suggestions.push('Use operadores válidos: >, <, =, >=, <=, !=');
                suggestions.push('Valores de dígitos devem estar entre 0 e 9');
                suggestions.push('Consulte o manual de ajuda para exemplos');
            }

            // Criar erro estruturado para o modal
            const structuredError = new Error(userMessage);
            structuredError.geminiValidationData = {
                invalidRule: error.ruleDetails?.ruleDescription || 'Regra não identificada',
                corrections: suggestions
            };
            structuredError.originalError = error;

            throw structuredError;
        }

    }

    // 🎯 NOVO: Gerar parâmetros editáveis a partir de uma regra
    generateEditableParameters(rule, groupIndex, ruleIndex) {
        // ⚡ OTIMIZAÇÃO: Se já vier com UI definida (do PromptManager), usar direto!
        // MAS: Precisamos reescrever os caminhos para garantir que correspondam ao grupo atual
        if (rule.parameters_ui && Array.isArray(rule.parameters_ui)) {
            return rule.parameters_ui.map(param => {
                // Atualizar label para incluir grupo/regra corretos: (G1R1) -> (G2R1)
                const newLabel = param.label.replace(/\(G\d+R\d+\)/, `(G${groupIndex + 1}R${ruleIndex + 1})`);

                // Se não tinha label de grupo, adicionar (para casos do PromptManager que podem não ter)
                const finalLabel = newLabel === param.label && !newLabel.includes(`(G${groupIndex + 1}R${ruleIndex + 1})`)
                    ? `${newLabel} (G${groupIndex + 1}R${ruleIndex + 1})`
                    : newLabel;

                // Atualizar path para apontar para groups[groupIndex] e rules[ruleIndex] corretamente
                // Ex: "groups[0].rules[0].parameters.count" -> "groups[1].rules[0].parameters.count"
                let newPath = param.path;
                if (newPath) {
                    newPath = newPath.replace(/groups\[\d+\]/, `groups[${groupIndex}]`)
                        .replace(/rules\[\d+\]/, `rules[${ruleIndex}]`);
                }

                return {
                    ...param,
                    label: finalLabel,
                    path: newPath
                };
            });
        }

        const params = [];
        const ruleParams = rule.parameters || {};
        const ruleId = `g${groupIndex + 1}_r${ruleIndex + 1}`; // ✅ Incluir grupo para unicidade

        // Mapear campos comuns para parâmetros editáveis
        const parameterMappings = {
            'count': { label: 'Qtd. Últimos Dígitos', path: `groups[${groupIndex}].rules[${ruleIndex}].parameters.count` },
            'value': { label: 'Dígito Referência', path: `groups[${groupIndex}].rules[${ruleIndex}].parameters.value` },
            'targetPercentage': { label: 'Percentual Alvo', path: `groups[${groupIndex}].rules[${ruleIndex}].parameters.targetPercentage` },
            'period': { label: 'Período Percentual', path: `groups[${groupIndex}].rules[${ruleIndex}].parameters.period` },
            'period1': { label: 'Período SMA 1', path: `groups[${groupIndex}].rules[${ruleIndex}].parameters.period1` },
            'period2': { label: 'Período SMA 2', path: `groups[${groupIndex}].rules[${ruleIndex}].parameters.period2` }
        };

        // Gerar parâmetros para cada campo presente
        Object.keys(parameterMappings).forEach(field => {
            // Tentar obter valor de parameters ou da raiz da regra
            const val = ruleParams[field] !== undefined ? ruleParams[field] : rule[field];

            if (val !== undefined) {
                // 🎯 FIX: Detectar se é variável dinâmica para definir tipo correto
                const isDynamic = typeof val === 'string' && val.startsWith('$');

                // Determinar o path correto (muitas regras IA têm os campos na raiz)
                const isAtRoot = ruleParams[field] === undefined && rule[field] !== undefined;
                const path = isAtRoot ?
                    `groups[${groupIndex}].rules[${ruleIndex}].${field}` :
                    parameterMappings[field].path;

                // Label contextual
                let label = parameterMappings[field].label;
                if (rule.type === 'probability_accuracy' && field === 'value') label = 'Mínimo Precisão %';
                if (rule.type === 'probability_check' && field === 'value') label = 'Dígito Referência';

                params.push({
                    key: `param_${ruleId}_${field}`,
                    label: `${label} (G${groupIndex + 1}R${ruleIndex + 1})`,
                    value: val,
                    type: isDynamic ? 'text' : 'number',
                    path: path
                });
            }
        });

        // 🎯 FIX: Suporte para conditional_percentage com parâmetros diretos (sem combinedRule)
        if (ruleParams.predictionType === 'conditional_percentage') {
            const percentageDirectMappings = {
                'targetPercentage': { label: 'Percentual Alvo', path: `groups[${groupIndex}].rules[${ruleIndex}].parameters.targetPercentage` },
                'value': { label: 'Dígito Referência', path: `groups[${groupIndex}].rules[${ruleIndex}].parameters.value` },
                'period': { label: 'Período Percentual', path: `groups[${groupIndex}].rules[${ruleIndex}].parameters.period` }
            };

            Object.keys(percentageDirectMappings).forEach(field => {

                if (ruleParams.condition && ruleParams.condition[field] !== undefined) {
                    params.push({
                        key: `param_${ruleId}_condition_${field}`,
                        label: `${percentageDirectMappings[field].label} (G${groupIndex + 1}R${ruleIndex + 1})`,
                        value: ruleParams.condition[field],
                        type: 'number',
                        path: `groups[${groupIndex}].rules[${ruleIndex}].parameters.condition.${field}`
                    });
                }
            });
        }

        // ✅ NOVO: Suporte para regras conditional_value (targetValue e condition.value)
        if (ruleParams.predictionType === 'conditional_value') {
            // Adicionar targetValue (previsão ou condição)
            if (ruleParams.targetValue !== undefined) {
                params.push({
                    key: `param_${ruleId}_targetValue`,
                    label: `Valor Alvo (G${groupIndex + 1}R${ruleIndex + 1})`,
                    value: ruleParams.targetValue,
                    type: 'number',
                    path: `groups[${groupIndex}].rules[${ruleIndex}].parameters.targetValue`
                });
            }

            // Adicionar condition.value (valor da condição)
            if (ruleParams.condition && ruleParams.condition.value !== undefined) {
                params.push({
                    key: `param_${ruleId}_conditionValue`,
                    label: `Condição Valor (G${groupIndex + 1}R${ruleIndex + 1})`,
                    value: ruleParams.condition.value,
                    type: 'number',
                    path: `groups[${groupIndex}].rules[${ruleIndex}].parameters.condition.value`
                });
            }
        }

        // ✅ NOVO: Suporte especial para allowedDigits (array → texto editável)
        if (ruleParams.allowedDigits && Array.isArray(ruleParams.allowedDigits)) {
            params.push({
                key: `param_${ruleId}_allowedDigits`,
                label: `Dígitos Permitidos (G${groupIndex + 1}R${ruleIndex + 1})`,
                value: ruleParams.allowedDigits.join(','), // Converter array para string "3,8,6"
                type: 'text',
                path: `groups[${groupIndex}].rules[${ruleIndex}].allowedDigits`,
                isArray: true // Flag para indicar que deve ser convertido de volta para array
            });
        }

        // 🎯 NOVO: Suporte para padrões de dígitos em combinedRule.patternRule
        if (ruleParams.combinedRule && ruleParams.combinedRule.patternRule) {
            const patternRule = ruleParams.combinedRule.patternRule;

            // Extrair o padrão se existir
            if (patternRule.pattern) {
                params.push({
                    key: `param_pattern_${ruleId}`,
                    label: `Padrão (G${groupIndex + 1}R${ruleIndex + 1})`,
                    value: patternRule.pattern,
                    type: 'text',
                    validation: 'pattern',
                    path: `groups[${groupIndex}].rules[${ruleIndex}].parameters.combinedRule.patternRule.pattern`
                });
            }
        }

        // 🎯 NOVO: Suporte para regras de percentual em combinedRule.percentageRule
        if (ruleParams.combinedRule && ruleParams.combinedRule.percentageRule) {
            const percentageRule = ruleParams.combinedRule.percentageRule;

            // Mapeamento específico para regras de percentual aninhadas
            const nestedMappings = {
                'targetPercentage': { label: 'Percentual Alvo', pathSuffix: 'targetPercentage' },
                'value': { label: 'Dígito Referência', pathSuffix: 'value' },
                'period': { label: 'Período Percentual', pathSuffix: 'period' }
            };

            Object.keys(nestedMappings).forEach(field => {
                if (percentageRule[field] !== undefined) {
                    params.push({
                        key: `param_${ruleId}_nested_${field}`,
                        label: `${nestedMappings[field].label} (G${groupIndex + 1}R${ruleIndex + 1})`,
                        value: percentageRule[field],
                        type: 'number',
                        path: `groups[${groupIndex}].rules[${ruleIndex}].parameters.combinedRule.percentageRule.${nestedMappings[field].pathSuffix}`
                    });
                }
            });
        }

        // 🎯 NOVO: Suporte para regras de precisão em combinedRule.probabilityAccuracyRule
        if (ruleParams.combinedRule && ruleParams.combinedRule.probabilityAccuracyRule) {
            const accRule = ruleParams.combinedRule.probabilityAccuracyRule;
            if (accRule.value !== undefined) {
                params.push({
                    key: `param_${ruleId}_accuracy_threshold`,
                    label: `Limite Precisão (G${groupIndex + 1}R${ruleIndex + 1})`,
                    value: accRule.value,
                    type: 'number',
                    path: `groups[${groupIndex}].rules[${ruleIndex}].parameters.combinedRule.probabilityAccuracyRule.value`
                });
            }
        }

        return params;
    }
    // 🎯 REFINAMENTO: Extrair parâmetros reais da descrição atualizada (Text-to-JSON fix)
    refineParametersFromDescription(rule) {
        if (!rule.description) return rule;

        // Normalizar texto: lowercase + remover acentos
        const desc = rule.description.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const ruleParams = rule.parameters || {};

        // 🎯 FIX: Adicionado suporte para 'last' e 'digits'
        const digitsMatch = desc.match(/(?:ultimos|ultimas|finais|last)\s*(\d+)\s*(?:digitos|digito|digits)/i);
        if (digitsMatch) {
            const extractedCount = parseInt(digitsMatch[1], 10);
            if (!isNaN(extractedCount)) {
                // Atualizar na raiz
                rule.count = extractedCount;
                // Atualizar em parameters
                ruleParams.count = extractedCount;
                // Atualizar em parameters.condition se existir
                if (ruleParams.condition) {
                    ruleParams.condition.count = extractedCount;
                }
            }
        }

        // 2. Extrair Operador e Valor da Condição (<= 1, > 5, etc)
        const operatorMap = {
            'menor': '<', 'maior': '>', 'igual': '=', 'acima': '>', 'abaixo': '<',
            'diferente': '!=', 'entre': 'range', 'sobe': 'up', 'desce': 'down',
            'lower': '<', 'higher': '>', 'equal': '=', 'above': '>', 'below': '<',
            'different': '!='
        };

        // Tentar capturar símbolos primeiro (mais forte)
        let operator = null;
        let val = null;

        const symbolMatch = desc.match(/(<=|>=|<|>|=|!=)\s*(\d+)/);
        if (symbolMatch) {
            operator = symbolMatch[1];
            val = parseInt(symbolMatch[2], 10);
        } else {
            // Tentar capturar texto (menor que 3, igual a 0)
            const textMatch = desc.match(/(menor|maior|igual|acima|abaixo|diferente|lower|higher|equal|above|below|different)\s+(?:que|a|de|than|to)?\s*(\d+)/i);
            if (textMatch) {
                const term = textMatch[1].toLowerCase();
                operator = operatorMap[term] || term;
                val = parseInt(textMatch[2], 10);
            }
        }

        if (operator && val !== null && (rule.type === 'conditional_value' || ruleParams.predictionType === 'conditional_value')) {
            if (!ruleParams.condition) ruleParams.condition = {};
            ruleParams.condition.type = operator;
            ruleParams.condition.operator = operator;
            ruleParams.condition.value = val;
            if (ruleParams.value !== undefined) ruleParams.value = val;
            rule.value = val;
            rule.operator = operator;
        }

        // 3. 🎯 CRÍTICO: Extrair TargetValue para ações previsíveis (Over 2, Under 7)
        // Isso corrige o problema do "OVER 0" quando deveria ser "OVER 2"
        const targetActionMatch = desc.match(/\b(over|under|match|differ|call|put|acima|abaixo|igual|diferente)\s*(\d+)/i);
        if (targetActionMatch) {
            const actionTerm = targetActionMatch[1].toLowerCase();
            const explicitValue = parseInt(targetActionMatch[2], 10);

            if (!isNaN(explicitValue)) {
                // Mapeamento de termos para ações internas
                const actionMap = {
                    'over': 'over', 'under': 'under', 'match': 'match', 'differ': 'differ',
                    'acima': 'over', 'abaixo': 'under', 'igual': 'match', 'diferente': 'differ'
                };
                const action = actionMap[actionTerm] || actionTerm;

                rule.predictionAction = action;
                ruleParams.predictionAction = action;
                rule.targetValue = explicitValue;
                ruleParams.targetValue = explicitValue;

                // Se for digit_comparison, atualizar também o value
                if (rule.type === 'digit_comparison') {
                    rule.value = explicitValue;
                    ruleParams.value = explicitValue;
                }
            }
        }

        if (!rule.predictionAction || rule.predictionAction === '') {
            const actionOnlyMatch = desc.match(/\b(over|under|match|matches|differ|differs|even|odd|par|impar|call|put|rise|fall|higher|lower|acima|abaixo|igual|diferente)\b/i);
            if (actionOnlyMatch) {
                const actionTerm = actionOnlyMatch[1].toLowerCase();
                const actionMap = {
                    'over': 'over', 'under': 'under', 'match': 'match', 'matches': 'match',
                    'differ': 'differ', 'differs': 'differ', 'even': 'even', 'odd': 'odd',
                    'par': 'even', 'impar': 'odd', 'acima': 'over', 'abaixo': 'under',
                    'igual': 'match', 'diferente': 'differ'
                };
                const action = actionMap[actionTerm] || actionTerm;
                rule.predictionAction = action;
                ruleParams.predictionAction = action;
            }
        }

        // 4. 🎯 NOVO: Extrair Percentual (ex: > 55%, igual a 30%)
        const percentageMatch = desc.match(/(>|>=|<|<=|==|=)\s*(\d+(?:\.\d+)?)\s*%/);
        const isPercentage = rule.type === 'percentage' || ruleParams.predictionType === 'conditional_percentage';

        if (percentageMatch && isPercentage) {
            const percOperator = percentageMatch[1];
            const percValue = parseFloat(percentageMatch[2]);

            // Atualizar na raiz
            rule.targetPercentage = percValue;
            rule.operator = percOperator;

            // Atualizar em parameters
            ruleParams.targetPercentage = percValue;
            ruleParams.operator = percOperator;

            // Se for aninhado (dynamic_prediction)
            if (ruleParams.combinedRule?.percentageRule) {
                ruleParams.combinedRule.percentageRule.targetPercentage = percValue;
                ruleParams.combinedRule.percentageRule.operator = percOperator;
            }
        }

        // 5. Extrair Períodos de SMA ou Percentual (ex: sma 20, periodo 25)
        const periodMatch = desc.match(/(?:periodo|period)\s*(\d+)/i);
        if (periodMatch) {
            const extractedPeriod = parseInt(periodMatch[1], 10);
            if (!isNaN(extractedPeriod)) {
                rule.period = extractedPeriod;
                ruleParams.period = extractedPeriod;

                if (ruleParams.combinedRule?.percentageRule) {
                    ruleParams.combinedRule.percentageRule.period = extractedPeriod;
                }
            }
        }

        const smaMatches = desc.match(/sma\s*\(?(\d+)\)?/gi);
        if (smaMatches) {
            smaMatches.forEach((match, idx) => {
                const period = parseInt(match.match(/\d+/)[0], 10);
                if (!isNaN(period)) {
                    const key = idx === 0 ? 'period1' : 'period2';
                    rule[key] = period;
                    ruleParams[key] = period;
                }
            });
        }

        // 6. Atualizar parâmetros na regra
        rule.parameters = ruleParams;
        return rule;
    }

}

// 🎯 NORMALIZAÇÃO: Converter tipos de padrão legados do Gemini
function normalizePatternRuleType(rule) {
    if (!rule) return rule;

    // Gemini retorna 'pattern' mas o código espera tipos específicos
    if (rule.type === 'pattern') {
        // Sempre mapear 'pattern' para 'digit_pattern' (tipo padrão)
        rule.type = 'digit_pattern';

    }

    return rule;
}

// Singleton para uso global
let formatGeneratorInstance = null;

function getFormatGeneratorInstance() {
    if (!formatGeneratorInstance) {
        formatGeneratorInstance = new FormatGenerator();
    }
    if (typeof window !== 'undefined') {
        window.formatGeneratorInstance = formatGeneratorInstance;
    }
    return formatGeneratorInstance;
}

// ✅ Expor para uso global
window.getFormatGeneratorInstance = getFormatGeneratorInstance;
window.formatGeneratorInstance = getFormatGeneratorInstance();
