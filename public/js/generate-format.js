// js/generate-format.js
// Sistema centralizado de geração de formatos para regras de trading
// O SISTEMA DEVE SER 100% ISOLADO POR USUARIO

class FormatGenerator {
    constructor() {
        this.sessionId = SessionManager.getUserSessionId();
    }

    // 🎯 FUNÇÃO AUXILIAR: Obter ativo selecionado (SEM FALLBACKS)
    getSelectedSymbol() {
        const globalSymbol = window.selectedSymbol;
        const sessionSymbol = SessionManager.getSessionData('selected_symbol');
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

                const digitPlaceholders = 'X,'.repeat(count).slice(0, -1);
                const operatorSymbol = this.normalizeOperator(operator);
                return `Últimos ${count} dígitos: ${digitPlaceholders} ${operatorSymbol} ${value}`;
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
                return `Últimos ${repetitionCount} dígitos repetindo`;
            }

            case 'digit_parity': { // Nova regra para paridade de dígitos
                const params = rule.parameters || rule;
                const parityCount = params.count || rule.count || 1;
                const parity = params.parity || rule.parity;
                const parityLabel = parity === 'par' || parity === 'even' ? 'pares' : 'ímpares';
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
                const allowedList = params.allowedDigits || rule.allowedDigits || [];
                return `Últimos ${allowedCount} dígito${allowedCount > 1 ? 's' : ''} = (${allowedList.join(',')})`;
            }

            case 'dynamic_prediction': {
                const params = rule.parameters || rule;
                const predType = params.predictionType || 'conditional_value';
                const target = params.targetValue;
                const cond = params.condition || {};
                const count = params.count || rule.count || params.period || 1;

                if (predType === 'conditional_value' && cond.type && target !== undefined) {
                    const op = this.normalizeOperator(cond.type);
                    const val = cond.value;
                    return `Entrar ${target} quando últimos ${count} dígitos ${op} ${val}`;
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

                        return `Entrar ${target} se percentual dos ${conditionText} ${operator} ${percentage}%`;
                    }
                    return `Entrar ${target} com condição de percentual`;
                } else if (predType === 'conditional_pattern') {
                    // 🎯 NOVO: Regras híbridas com padrão
                    const combinedRule = params.combinedRule;
                    if (combinedRule && combinedRule.patternRule) {
                        // ✅ NORMALIZAR: Converter 'pattern' → 'digit_pattern'
                        // ✅ NORMALIZAR: Converter 'pattern' → 'digit_pattern'
                        const patternRule = normalizePatternRuleType(combinedRule.patternRule);

                        // 🔧 CORREÇÃO: Priorizar params.count (editável) sobre patternRule.count (aninhado)
                        if (patternRule.type === 'digit_repetition' && params.count) {
                            patternRule.count = params.count;
                        }
                        const patternText = this.interpretPatternRule(patternRule);

                        // Usar predictionAction em vez de targetValue para mostrar ação do contrato
                        const action = params.predictionAction || target;
                        if (action !== undefined) {
                            // 🎯 FORMATO CORRETO: "Entrar DIFFER do dígito que se repetir 3 vezes"
                            return `Entrar ${action.toUpperCase()} do ${patternText.toLowerCase()}`;
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
                    const action = params.predictionAction || 'match';

                    let varText = 'variável';
                    if (probVar === '$LOWER_PROB') varText = 'menor chance';
                    if (probVar === '$HIGHER_PROB') varText = 'maior chance';

                    return `Entrar ${action} quando último dígito = ${varText}`;
                } else {
                    return `Previsão dinâmica: ${rule.description || 'condição personalizada'}`;
                }
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
                // Acessar parâmetros da estrutura correta (priorizar raiz atualizada pelo applyParameters)
                const params = rule.parameters || {};
                // 🔧 CORREÇÃO: Priorizar rule.count (atualizado) sobre params.count (original)
                const count = rule.count || params.count;
                const operator = rule.operator || params.operator;
                const value = (rule.value !== undefined) ? rule.value : ((params.value !== undefined) ? params.value : undefined);

                // VALIDAÇÃO RIGOROSA: Count deve ser válido
                if (!count || typeof count !== 'number' || count < 1 || count > 50) {
                    console.error(`❌ Valor de count inválido na regra:`, rule);
                    return `${statusIcon} ERRO: Count inválido`;
                }

                // Para últimos dígitos, obter EXATAMENTE a quantidade especificada
                const digits = this.getLastNDigitsFromMarketData(count);

                if (shouldLog) {

                }

                if (digits === null) {
                    console.error(`❌ Dados indisponíveis para count=${count}`);
                    return `${statusIcon} ERRO: Dados indisponíveis`;
                }

                let digitsDisplay;

                try {
                    // Se temos a quantidade exata ou mais, usar os dígitos como estão
                    if (digits.length >= count) {
                        digitsDisplay = digits.join(',');
                        if (shouldLog) {

                        }
                    } else if (digits.length > 0) {
                        // Se temos alguns dígitos, mas não o suficiente, preencher com X
                        const missingCount = count - digits.length;
                        const placeholders = Array(missingCount).fill('X');
                        digitsDisplay = [...placeholders, ...digits].join(',');
                        if (shouldLog) {

                        }
                    } else {
                        // Se não temos nenhum dígito, mostrar apenas X's
                        const placeholders = Array(count).fill('X');
                        digitsDisplay = placeholders.join(',');
                        if (shouldLog) {

                        }
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

            case 'digit_parity':
                const parityParams = rule.parameters || rule;
                // 🔧 CORREÇÃO: Priorizar rule.count e rule.parity
                const parityCount = rule.count || parityParams.count || 1;
                const parity = rule.parity || parityParams.parity || 'par';
                const parityDigits = this.getLastNDigitsFromMarketData(parityCount) || [];
                const parityDisplay = parityDigits.length > 0 ? `[${parityDigits.join(',')}]` : '[?]';
                const parityLabel = parity === 'par' || parity === 'even' ? 'pares' : 'ímpares';

                // Check if the parity condition is met
                const parityResult = this.checkDigitParityCondition(rule);
                const parityStatusIcon = parityResult ? '🟢' : '🔴';

                return `${parityStatusIcon} ${parityCount} dígito${parityCount > 1 ? 's' : ''} ${parityLabel} ${parityDisplay}`;


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

                return `${statusIcon}(${allowedDigitsList.join(',')}): ${allowedDigitsDisplay}`;

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
                    const symbol = getCurrentSymbol();
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

                // 🔧 CORREÇÃO: Se retornou null, tentar novamente após pequeno delay
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

            case 'percentage':
                const percentageProcessor = getPercentageRulesInstance();
                const percentageFormat = percentageProcessor.generateVisualFormat(rule, statusIcon);
                return percentageFormat;

            case 'dynamic_prediction': {
                const params = rule.parameters || rule;
                const predictionType = params.predictionType;

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

                // 🎯 NOVO: Regras com percentual (conditional_percentage)
                if (predictionType === 'conditional_percentage') {
                    const combinedRule = params.combinedRule;
                    if (combinedRule && combinedRule.percentageRule) {
                        const percentageRule = combinedRule.percentageRule;
                        const percentageProcessor = getPercentageRulesInstance();

                        // Criar regra temporária para usar o sistema de percentual
                        // 🎯 CORREÇÃO: Usar estrutura de dynamic_prediction para acionar checkConditionalPercentageRule
                        const tempRule = {
                            type: 'dynamic_prediction',
                            parameters: {
                                predictionType: 'conditional_percentage',
                                combinedRule: {
                                    percentageRule: percentageRule
                                }
                            }
                        };

                        // 🎯 CRÍTICO: Calcular trigger digit antes de gerar formato
                        // Isso garante que _triggerDigit e _triggerPercentage sejam preenchidos
                        percentageProcessor.checkPercentageCondition(tempRule);

                        // Usar o formato visual do sistema de percentual
                        const percentageFormat = percentageProcessor.generateVisualFormat(tempRule, statusIcon);

                        // Adicionar a previsão (over/under/match/differ) no final
                        const targetValue = params.targetValue;
                        if (targetValue !== undefined) {
                            // 🎯 CORREÇÃO: Não mostrar targetValue se for um token dinâmico interno
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

                        // 🎯 FORMATO VISUAL: Para digit_pattern, mostrar o padrão e dígitos atuais
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

                        // 🎯 FORMATO VISUAL: Mostrar últimos N dígitos ao invés de texto descritivo
                        // Para regras de repetição, mostrar "🔴 X,X" ou "🟢 7,7" etc.
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

                // 🎯 NOVO: Formato visual para last_digit_probability_match
                // Mostra: "🔴/🟢 último_dígito : dígito_esperado"
                if (predictionType === 'last_digit_probability_match') {
                    const condition = params.condition || {};
                    // Tentar obter variável do local mais provável
                    const probVar = condition.probabilityVariable || params._originalTargetValue || params.targetValue || rule.targetValue;

                    // Obter último dígito
                    const lastDigits = this.getLastNDigitsFromMarketData(1);
                    const lastDigit = lastDigits && lastDigits.length > 0 ? lastDigits[0] : 'X';

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

                    return `${statusIcon} ${lastDigit} : ${expectedDigit}`;
                }


                // Para regras de percentual por dígito, mostrar formato simplificado
                // 🎯 CORREÇÃO ROBUSTA: Incluir detecção por targetValue para casos onde predictionType pode estar ausente
                if (predictionType === 'percentage_digit_inverse' ||
                    predictionType === 'percentage_digit_match' ||
                    predictionType === 'conditional_percentage' ||
                    params.targetValue === 'dynamic_highest_percentage_digit' ||
                    params.targetValue === 'dynamic_allowed_digit') {

                    const combinedRule = params.combinedRule;
                    // Se for dynamic token, pode não ter combinedRule explícito ainda, mas vamos tentar processar

                    const percentageProcessor = getPercentageRulesInstance();

                    // Para conditional_percentage ou dynamic tokens, usar o processamento direto
                    if (predictionType === 'conditional_percentage' ||
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

                        // 🎯 NOVO: Transferir _triggerDigit capturado de volta para a regra original
                        if (tempRule._triggerDigit !== undefined) {
                            params._triggerDigit = tempRule._triggerDigit;
                            rule._triggerDigit = tempRule._triggerDigit;
                        }

                        // 🎯 FORMATO SIMPLIFICADO: Para dynamic prediction, mostrar apenas o dígito que atende
                        // Formato: "🔴/🟢 X" onde X é o dígito que atende à condição
                        if (tempRule._triggerDigit !== undefined) {
                            return `${statusIcon} ${tempRule._triggerDigit}`;
                        } else {
                            return `${statusIcon} X`;
                        }
                    }
                }

                // Formato padrão para outras regras de dynamic_prediction
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

                        // 2. 🎯 FIX: Se resolver falhou ou retornou NULL/NAN, buscar direto da Fonte Única
                        if (resolved === null || resolved === undefined || isNaN(resolved)) {
                            if (typeof MonitoringView !== 'undefined') {
                                // 🎯 FIX: IGNORAR latestProbabilityStats pois ele pode ser Real-Time (sem delay)
                                // Forçar recálculo sempre com delay (true) para garantir consitência visual com a regra
                                let stats = null;

                                // Se não tem stats, calcular agora (mais seguro)
                                // 🎯 FIX: Usar dados DELAYED (true) para o texto da regra
                                // Isso sincroniza o texto com a lógica de verificação (Last N vs Lower N-1)
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
            } // Fecha case 'dynamic_prediction'
            // 🔄 MIGRAÇÃO: Suporte para tipos de regras antigas (backward compatibility)
            case 'dynamic_target_on_repetition': {
                // Tipo antigo que foi substituído por dynamic_prediction + conditional_pattern
                // Extrair informações da regra antiga
                // 🔧 CORREÇÃO: Priorizar rule.count
                const count = rule.count || rule.parameters?.count || 2;

                console.warn(`⚠️ [FORMAT-GENERATOR] Tipo de regra antiga detectado: ${rule.type}. Usando formatação de compatibilidade.`);

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

                // 🎯 FIX: Tentar obter valor REAL do mercado para exibição (ex: "7")
                // Isso atende ao pedido: "🔴 7 : 3" em vez de "🔴 Último Dígito : 3"
                if (rTarget === 'last_digit') {
                    const marketDigits = this.getLastNDigitsFromMarketData(1);
                    if (marketDigits && marketDigits.length > 0) {
                        targetText = `${marketDigits[0]}`;
                    }
                }

                // Se for regra de probabilidade, mostrar o valor resolvido se disponível
                if (rValue && typeof rValue === 'string' && rValue.startsWith('$')) {
                    let resolved = null;

                    // 🎯 FIX: Forçar cálculo com DELAY (true) para garantir consistência
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
                const parity = patternRule.parity || 'par';
                const parityText = parity === 'par' || parity === 'even' ? 'pares' : 'ímpares';
                return `${count} dígitos ${parityText} `;

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
        // Log controlado para extração de parâmetros

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
                if (window.logConfig && window.logConfig.shouldLog('parameter_validation')) {


                }

                // Log apenas para debug, não interromper processamento
                if (!params.count || typeof params.count !== 'number' || params.count < 1 || params.count > 50) {
                    console.warn(`⚠️ Count inválido para last_digits: ${params.count} - será processado pelo Gemini`);
                }

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

                if (params.value === undefined || typeof params.value !== 'number' || params.value < 0 || params.value > 9) {
                    console.error(`❌ ERRO CRÍTICO: Value inválido para dígitos: ${params.value} `);
                    console.error(`   - Esta regra será REJEITADA - SEM FALLBACKS!`);
                    params.value = null;
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
                // ✅ conditionType é OPCIONAL - se ausente, usa dígito da configuração
                // Delegar validação para o PercentageRulesProcessor
                const PercentageRulesProcessor = getPercentageRulesInstance().constructor;
                PercentageRulesProcessor.validateParameters(params);
                break;

            case 'digit_repetition':
                // Validar contagem para repetição de dígitos
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
                        '$LOWER_PROB_SCORE'
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
                        (targetValue === '$HIGHER_PROB' || targetValue === '$LOWER_PROB');

                    const isValidString = typeof targetValue === 'string' && (
                        validTargetValues.contracts.includes(targetValue.toLowerCase()) ||
                        validTargetValues.parity.includes(targetValue.toLowerCase()) ||
                        validTargetValues.dynamic.includes(targetValue.toLowerCase()) ||
                        isProbabilityVar // Verificação extra para variáveis especiais
                    );

                    if (!isNumber && !isValidString) {
                        console.error(`❌ targetValue inválido para dynamic_prediction: ${targetValue} `);

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
                        console.log(`🔄[VALIDATION] Normalizando predictionAction: "${params.predictionAction}" → "${parityNormalization[lowerAction]}"`);
                        params.predictionAction = parityNormalization[lowerAction];
                    }
                }

                // Para percentage_digit_inverse/match, o count pode não estar presente (usa percentageRule)
                if (params.predictionType === 'percentage_digit_inverse' || params.predictionType === 'percentage_digit_match') {
                    // Verificar se tem combinedRule com percentageRule
                    if (params.combinedRule && params.combinedRule.percentageRule) {
                        const percentageRule = params.combinedRule.percentageRule;
                        params.count = percentageRule.period || 25; // Usar período da regra de percentual
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

            case 'probability_check': // 🎲 Nova validação para regras de probabilidade
                // Validar target (deve ser variável especial)
                if (!params.target || (params.target !== '$HIGHER_PROB' && params.target !== '$LOWER_PROB')) {
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
                // Validações específicas para o grupo 'Calle/Pute' se necessário

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

            // Obter instância do market data
            const marketData = getMarketDataInstance(SessionManager.getLocalToken());
            if (!marketData) {
                console.error('❌ Market data instance não disponível');
                return null;
            }

            // Obter símbolo atual selecionado (sem fallback)
            const currentSymbol = this.getSelectedSymbol();

            // Obter EXATAMENTE o número de ticks necessários
            const history = marketData.getHistoricalTicks(currentSymbol, count);

            if (history && history.prices && Array.isArray(history.prices) && history.prices.length > 0) {
                // GARANTIR que pegamos APENAS os últimos N preços, não mais
                const lastPrices = history.prices.slice(-count);

                // Converter APENAS esses preços limitados para dígitos
                const digits = lastPrices.map(price => {
                    if (typeof price !== 'number') {
                        console.error(`❌ Preço não é número: ${price} `);
                        return null;
                    }

                    // Log COMPLETO do preço para debug
                    // ✅ USAR MÉTODO UNIFICADO
                    const currentSymbol = this.getSelectedSymbol();
                    const lastDigit = CommonHelpers.extractLastDigitUnified(price, currentSymbol);

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
                    return percentageProcessor.checkPercentageCondition(rule);

                case 'price_move':
                    const priceMovementProcessor = getPriceMovementRulesInstance();
                    return priceMovementProcessor.checkPriceMovementCondition(rule);

                case 'digit_pattern': // Nova verificação para padrões de dígitos
                    const digitPatternProcessor = getDigitPatternRulesInstance();
                    return digitPatternProcessor.checkDigitPatternCondition(rule);

                case 'sequence':
                    return this.checkSequenceCondition(rule);

                case 'digit_repetition': // Adicionado suporte para digit_repetition
                    const repetitionResult = this.checkDigitRepetitionCondition(rule);
                    logConfig.debug('generate_format', `🔄[REPETITION CHECK] Regra ${rule.id}: ${repetitionResult ? 'ATENDIDA' : 'NÃO ATENDIDA'} `);
                    return repetitionResult;

                // ✅ NOVO: Verificar condições de paridade de dígitos (par/ímpar)
                case 'digit_parity':
                    const parityResult = this.checkDigitParityCondition(rule);
                    logConfig.debug('generate_format', `🔢[PARITY CHECK] Regra ${rule.id}: ${parityResult ? 'ATENDIDA' : 'NÃO ATENDIDA'} `);
                    return parityResult;

                case 'dynamic_prediction':
                    // 🎯 FIX CRÍTICO: Tratamento específico para conditional_pattern (digit_repetition) e outros tipos complexos
                    // Isso previne que rules como "entrar quando repetir 2x" retornem true imediatamente

                    const predParams = rule.parameters || rule;
                    const predType = predParams.predictionType || rule.predictionType;

                    // 1. Conditional Pattern (inclui digit_repetition, digit_sequence, etc)
                    if (predType === 'conditional_pattern') {
                        if (predParams.combinedRule && predParams.combinedRule.patternRule) {
                            // Normalizar e verificar usando o processador de padrões
                            const patternRule = normalizePatternRuleType(predParams.combinedRule.patternRule);

                            // 1.1 Se for digit_repetition, usar método local direto (mais robusto)
                            if (patternRule.type === 'digit_repetition') {
                                return this.checkDigitRepetitionCondition(patternRule);
                            }

                            // 1.2 Se for digit_pattern ou outro, usar PatternProcessor
                            const digitPatternProcessor = getDigitPatternRulesInstance();
                            const result = digitPatternProcessor.processDigitPatternRule(patternRule);
                            return result ? result.matches : false;
                        }
                        // Se tem tipo mas não tem regra definida, falhar (segurança)
                        return false;
                    }

                    // 2. Conditional Percentage
                    if (predType === 'conditional_percentage') {
                        // 🎯 FIX CRÍTICO: Delegar para checkDynamicPredictionCondition que tem a lógica correta
                        // A implementação anterior convertia para 'percentage' padrão, o que falha pois
                        // verifica apenas o dígito 0 (default) em vez de escanear todos os dígitos.
                        return this.checkDynamicPredictionCondition(rule);
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

                    // 🎯 FIX: dynamic_prediction pode ter uma condition interna (Legacy/Conditional Value)
                    if (rule.parameters?.condition) {
                        const condition = rule.parameters.condition;
                        const conditionType = condition.type || rule.parameters.predictionType;


                        // 🎯 FIX: Se conditionType é last_digit_equals, delegar para checkDynamicPredictionCondition
                        // que tem o handler correto para last_digit_probability_match
                        if (conditionType === 'last_digit_equals' && rule.parameters.predictionType === 'last_digit_probability_match') {

                            return this.checkDynamicPredictionCondition(rule);
                        }

                        const validOperators = ['>', '<', '=', '>=', '<=', '!=', '==', '===', 'match', 'matches'];

                        // Se a condition é digit_comparison OU é um operador direto (estrutura simplificada)
                        if (conditionType === 'digit_comparison' || validOperators.includes(conditionType)) {

                            // Determinar operador correto
                            let operator = condition.operator;
                            if (!operator && validOperators.includes(conditionType)) {
                                operator = conditionType;
                            }

                            // 🎯 FIX: Verificar se há contagem definida (ex: "últimos 2 dígitos") - garantir Inteiro
                            let count = parseInt(rule.parameters.count || 1, 10);
                            if (isNaN(count) || count < 1) count = 1;

                            // Se count > 1, usar lógica de last_digits (verificar histórico)
                            if (count > 1) {
                                // 🎯 FIX CRÍTICO: Resolver variáveis de probabilidade ANTES de passar para checkLastDigitsCondition
                                let resolvedValue = condition.value;

                                // Se o valor é uma string de variável de probabilidade, resolver agora
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

                                // 🎯 STRICT MATCH: checkLastDigitsCondition JÁ verifica se TODOS os dígitos atendem
                                const matches = this.checkLastDigitsCondition(tempRule, forcedPrice);

                                // DEBUG DETALHADO
                                if (window.logConfig?.shouldLog('rule_check') || true) {
                                    const recentDigits = this.getRecentDigitsFromMarket(count, forcedPrice);

                                }

                                // Retornar o resultado booleano diretamente
                                return matches;

                            } else {
                                // Comportamento original para 1 dígito (fallback para checkDigitComparisonCondition)
                                const tempRule = {
                                    type: 'digit_comparison',
                                    target: condition.target || 'last_digit', // Default para last_digit
                                    operator: operator || '==',
                                    value: condition.value,
                                    parameters: {
                                        ...condition,
                                        value: condition.value,
                                        target: condition.target || 'last_digit',
                                        operator: operator || '=='
                                    }
                                };

                                // DEBUG
                                // console.log(`🔍 [DYNAMIC-PRED] Delegando para checkDigitComparisonCondition com tempRule:`, tempRule);
                                return this.checkDigitComparisonCondition(tempRule, forcedPrice);
                            }
                        }
                    }
                    // Fallback: assumir que a regra está sempre atendida (será validada no trade)
                    // ⚠️ CUIDADO: Isso causava o bug de entrada imediata. Agora, se tiver tipo definido mas não caiu nos if's acima
                    // e também não tem condition, deve retornar FALSE por segurança, exceto para tipos puramente dinâmicos sem condição de entrada

                    const typesIsalwaysTrue = [
                        'last_digit_inverse', 'last_digit_match',
                        'most_frequent_inverse', 'most_frequent_match',
                        'repeated_digit_inverse', 'repeated_digit_match' // Esses geralmente dependem de triggerDigit, que é calculado no trade, mas aqui deviam ser true?
                        // Na verdade, esses tipos geralmente não têm "condição de entrada" separada, eles SÃO a previsão.
                        // A condição de entrada deveria ser outra regra (AND).
                        // Se esta regra é "Entrar Inverso do Repetido", ela é uma Previsão, não necessariamente um Filtro.
                        // MAS, se for usada como filtro, ela deveria verificar se "existe um repetido".
                    ];

                    if (typesIsalwaysTrue.includes(predType)) {
                        // Para esses tipos, verificar apenas se é possível calcular (ex: tem repetido?)
                        // Se "repeated_digit_inverse", só é true se TIVER um repetido agora.
                        if (predType.includes('repeated_digit')) {
                            const patternProcessor = getDigitPatternRulesInstance();
                            // Verificar repetição simples de 2 (padrão)
                            const hasRepetition = patternProcessor.findDigitRepeatedNTimes(2) !== null;
                            return hasRepetition;
                        }
                        return true;
                    }

                    // 🎯 FIX: Se é conditional_value ou probability_match, delegar para checkDynamicPredictionCondition
                    if (predType === 'conditional_value' || predType === 'last_digit_probability_match') {
                        return this.checkDynamicPredictionCondition(rule, forcedPrice);
                    }

                    // Se não é um tipo conhecido, retornar FALSE por segurança
                    console.warn(`⚠️ [DYNAMIC-PRED] Regra ${rule.id} com tipo ${predType || 'DESCONHECIDO'} sem handler. Retornando FALSE.`);
                    return false;

                case 'allowed_digits':
                    return this.checkAllowedDigitsCondition(rule);

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
                    return percentageProcessorForCheck.checkPercentageCondition(rule);
                }

                // 🆕 NOVO: Suporte para verificação de probability_check
                case 'probability_check': {
                    // 1. Obter parâmetros
                    const target = rule.target || rule.parameters?.target; // $HIGHER_PROB ou $LOWER_PROB
                    const operator = rule.operator || rule.parameters?.operator;
                    const limitValue = rule.value !== undefined ? rule.value : rule.parameters?.value;

                    if (!target || !operator || limitValue === undefined) {
                        console.error(`❌ [PROB CHECK] Parâmetros incompletos:`, rule);
                        return false;
                    }

                    // 2. Resolver valor atual da variável (com atraso para sincronia)
                    let resolvedDigit = null;
                    if (typeof MonitoringView !== 'undefined' && typeof MonitoringView.calculateProbabilities === 'function') {
                        const stats = MonitoringView.calculateProbabilities(true); // TRUE para delay (sincronizado com ticks anteriores)
                        if (stats && stats.sorted && stats.sorted.length >= 10) {
                            if (target === '$HIGHER_PROB') resolvedDigit = stats.sorted[0];
                            if (target === '$LOWER_PROB') resolvedDigit = stats.sorted[9];
                        }
                    }

                    if (resolvedDigit === null) {
                        // console.warn(`⚠️ [PROB CHECK] Não foi possível resolver ${target}`);
                        return false;
                    }

                    // 3. Comparar
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
            // Resolver o valor do alvo (Target)
            if (rTarget === 'last_digit') {
                // 🎯 FIX CRÍTICO: Usar EXATAMENTE a mesma fonte de dados do visual (FormatGenerator)
                // Isso garante que se o visual mostra "0 : 0", a lógica vê "0 : 0"
                const recentDigits = this.getRecentDigitsFromMarket(1, forcedPrice);
                if (recentDigits && recentDigits.length > 0) {
                    targetValue = recentDigits[0]; // Último dígito (mais recente)
                } else {
                    // Fallback silencioso (pode acontecer na inicialização)
                    // console.warn('No digits available via getRecentDigitsFromMarket');
                }
            }

            if (targetValue === null) {
                // console.warn('Target value is null for digit_comparison');
                return false;
            }

            // O value já deve ter sido substituído pelo Resolver em MonitoringView
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

            // 🛡️ PROTEÇÃO ROBUSTA DE TIPOS: Converter tudo para número se for possível
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
                // console.log(`🔍 DIGIT CHECK COERCED: Target[${tVal}](${typeof targetValue}) vs Rule[${rVal}](${typeof ruleValue}) | Op: ${rOperator}`);
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
            if (params.value !== undefined) {
                const period = params.period || 14;
                return smaIndicator.checkSMACondition(currentSymbol, operator, params.value, period);
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

            if (value === undefined || value === null) {
                console.warn('⚠️ Valor não especificado para regra de dígitos');
                return false;
            }

            // Obter os últimos dígitos do market data (COM PREÇO FORÇADO se houver)
            const recentDigits = this.getRecentDigitsFromMarket(count, forcedPrice);

            if (!recentDigits || recentDigits.length === 0) {
                console.warn('⚠️ Não foi possível obter dígitos recentes');
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
    getRecentDigitsFromMarket(count = 1, forcedPrice = null) {
        try {
            // Se temos um preço forçado, precisamos de N-1 do histórico + o forçado
            // Ou N do histórico e depois fazemos o shift. Vamos pedir N
            let availableDigits = this.getLastNDigitsFromMarketData(count);

            if (forcedPrice !== null) {
                // ✅ USAR MÉTODO UNIFICADO para extrair dígito do forcedPrice
                const forcedDigit = CommonHelpers.extractLastDigitUnified(forcedPrice, this.getSelectedSymbol());

                if (!availableDigits) availableDigits = [];

                if (forcedDigit !== null) {
                    // Adicionar o dígito forçado ao final da lista
                    availableDigits.push(forcedDigit);
                }

                // Manter apenas os últimos 'count' dígitos
                if (availableDigits.length > count) {
                    availableDigits = availableDigits.slice(-count);
                }
            }

            if (!availableDigits || availableDigits.length === 0) {
                return [];
            }

            return availableDigits;

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
    checkAllowedDigitsCondition(rule) {
        try {

            const params = rule.parameters || rule;

            // 🔧 CORREÇÃO: Priorizar rule.count (atualizado pela UI) sobre params.count
            const count = rule.count || params.count || 1;
            const allowedDigits = params.allowedDigits || [];


            if (!allowedDigits || allowedDigits.length === 0) {
                console.warn('⚠️ [ALLOWED DIGITS] Lista de dígitos permitidos não especificada ou vazia');
                console.warn('⚠️ [ALLOWED DIGITS] allowedDigits recebido:', allowedDigits);
                return false;
            }

            // Obter os últimos N dígitos do market data
            const recentDigits = this.getLastNDigitsFromMarketData(count);

            if (!recentDigits || recentDigits.length === 0) {
                console.warn('⚠️ Não foi possível obter dígitos recentes para allowed_digits');
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
    checkDigitRepetitionCondition(rule) {
        try {
            const params = rule.parameters || rule;

            if (!params || params.type !== 'digit_repetition') {
                return false;
            }

            const count = params.count || 2;
            const recentDigits = this.getLastNDigitsFromMarketData(count);

            if (!recentDigits || recentDigits.length < count) {
                logConfig.debug('generate_format', `⚠️ Dígitos insuficientes para repetição: ${recentDigits ? recentDigits.length : 0}/${count}`);
                return false;
            }

            // Verificar se todos os dígitos são iguais
            const firstDigit = recentDigits[0];
            const allSame = recentDigits.every(digit => digit === firstDigit);

            logConfig.debug('generate_format', `🔄 Repetição de ${count} dígitos: [${recentDigits.join(', ')}] - Todos iguais: ${allSame}`);

            if (allSame) {
                rule._triggerDigit = firstDigit;
                params._triggerDigit = firstDigit;
                logConfig.info('generate_format', `🎯 [DIGIT REPETITION] Dígito repetido capturado: ${firstDigit}`);
            } else {
                // Clear stale trigger digits when condition fails
                delete rule._triggerDigit;
                delete params._triggerDigit;
            }

            return allSame;

        } catch (error) {
            console.error('❌ [DIGIT REPETITION] Erro ao verificar repetição de dígitos:', error);
            return false;
        }
    }

    // ✅ NOVO: Verificar condição de paridade de dígitos (par/ímpar)
    checkDigitParityCondition(rule) {
        try {
            const params = rule.parameters || rule;

            if (!params || params.type !== 'digit_parity') {
                return false;
            }

            const count = params.count || 1;
            const parity = params.parity; // 'par', 'impar', 'even', 'odd'
            const recentDigits = this.getLastNDigitsFromMarketData(count);

            if (!recentDigits || recentDigits.length < count) {
                logConfig.debug('generate_format', `⚠️ Dígitos insuficientes para paridade: ${recentDigits ? recentDigits.length : 0}/${count}`);
                return false;
            }

            // Normalizar paridade para inglês
            const normalizedParity = parity === 'par' ? 'even' : (parity === 'impar' ? 'odd' : parity);

            // Verificar se todos os dígitos atendem à condição de paridade
            const satisfiedCount = recentDigits.filter(digit => {
                if (normalizedParity === 'even') {
                    return digit % 2 === 0;
                } else if (normalizedParity === 'odd') {
                    return digit % 2 !== 0;
                }
                return false;
            }).length;

            const allSatisfied = satisfiedCount === count;

            logConfig.debug('generate_format', `🔢 Paridade de ${count} dígitos: [${recentDigits.join(', ')}] - ${normalizedParity} - Todos atendem: ${allSatisfied}`);

            return allSatisfied;

        } catch (error) {
            console.error('❌ [DIGIT PARITY] Erro ao verificar paridade de dígitos:', error);
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

            // 🎯 LÓGICA SEQUENCIAL TICK POR TICK
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
                const probabilityVariable = condition.probabilityVariable || params.targetValue || rule.targetValue;

                const resolver = getProbabilityResolver();

                if (resolver) {
                    // 🎯 FIX: Se a variável já foi resolvida para um número (pelo MonitoringView), usar direto
                    // senão, resolver agora usando resolveDelayed
                    let expectedDigit = null;
                    if (typeof probabilityVariable === 'number') {
                        expectedDigit = probabilityVariable;
                    } else if (typeof probabilityVariable === 'string' && probabilityVariable.startsWith('$')) {
                        expectedDigit = resolver.resolveDelayed(probabilityVariable);
                    } else {
                        // Fallback: tentar converter para número se for string numérica
                        expectedDigit = parseInt(probabilityVariable);
                        if (isNaN(expectedDigit)) expectedDigit = null;
                    }

                    const lastDigits = this.getRecentDigitsFromMarket(1, forcedPrice);

                    if (expectedDigit !== null && lastDigits && lastDigits.length > 0) {
                        const lastDigit = lastDigits[0];
                        const matches = lastDigit == expectedDigit;
                        
                        if (matches) {
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
                        const count = normalizedRule.count || 2;
                        const digits = this.getLastNDigitsFromMarketData(count);
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
                        const tempRule = { type: 'digit_pattern', parameters: normalizedRule };
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
                const allowedDigits = params.allowedDigits || (params.condition ? params.condition.allowedDigits : []);
                const count = params.count || 1;
                const digits = this.getLastNDigitsFromMarketData(count);

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

            // 5. Verificação de Precisão (conditional_probability_accuracy ou combinedRule.probabilityAccuracyRule)
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
    normalizeRuleStructure(rule) {
        const description = (rule.description || '').toLowerCase();
        const type = rule.type;
        const params = rule.parameters || {};
        const predictionType = rule.predictionType || params.predictionType;

        // Se a regra já tem um tipo padrão válido E tem um predictionType definido, 
        // ou se não é uma regra dinâmica que precisa de normalização especializada, retornar.
        if ((type === 'last_digits' || type === 'rsi' || type === 'sma') ||
            (type === 'dynamic_prediction' && predictionType)) {
            return rule;
        }

        // 🕵️‍♂️ DETECÇÃO SEMÂNTICA: Regras de Probabilidade
        // Caso 1: Fala de "chance" ou "probabilidade" OU contém variáveis especiais
        const hasProbVar = (val) => typeof val === 'string' && (val.includes('$LOWER_PROB') || val.includes('$HIGHER_PROB'));

        const isProbability = description.includes('chance') || description.includes('prob') ||
            hasProbVar(rule.targetValue) || hasProbVar(params.targetValue) ||
            (params && (params.probabilityVariable || params.probability_variable));

        if (isProbability) {
        
            const probVar = description.includes('menor') ||
                (rule.targetValue === '$LOWER_PROB' || params.targetValue === '$LOWER_PROB')
                ? '$LOWER_PROB' : '$HIGHER_PROB';


            const finalAction = rule.predictionAction || (description.includes('differ') ? 'differ' : 'match');
            const finalTarget = rule.targetValue && rule.targetValue !== 'dynamic_probability' ? rule.targetValue : probVar;

            return {
                ...rule, // Manter todos os campos originais
                type: 'dynamic_prediction',
                predictionType: 'last_digit_probability_match',
                predictionAction: finalAction,
                targetValue: finalTarget,
                explicitPrediction: true,
                parameters: {
                    ...rule.parameters,
                    type: 'dynamic_prediction', // 🎯 FIX: Consistência
                    predictionType: 'last_digit_probability_match', // 🎯 FIX: Consistência
                    predictionAction: finalAction,
                    targetValue: finalTarget,
                    condition: {
                        type: 'last_digit_probability_match', // 🎯 FIX: Enforçar tipo para o checkRuleCondition
                        probabilityVariable: probVar
                    }
                }
            };


        }

        // 🕵️‍♂️ CASO 2: Regra de Padrão (conditional_pattern) na raiz
        if (type === 'conditional_pattern' || type === 'digit_pattern') {
            const pattern = rule.pattern || (rule.parameters && rule.parameters.pattern) || 'XOX';
         
            return {
                ...rule,
                type: 'dynamic_prediction',
                predictionType: 'conditional_pattern',
                predictionAction: rule.predictionAction || 'match', // Default seguro
                targetValue: rule.targetValue || 'dynamic_pattern_match',
                explicitPrediction: false,
                parameters: {
                    ...rule.parameters,
                    combinedRule: {
                        patternRule: {
                            type: 'digit_pattern',
                            pattern: pattern,
                            pattern_type: 'loser_winner'
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
                predictionType: 'last_digit_value',
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

        // Se não conseguiu normalizar, retorna original para não quebrar
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

                const formattedRules = rules.map((rawRule, ruleIndex) => {
                    try {
                        // 🛡️ NORMALIZAÇÃO: Corrigir estrutura antes de qualquer processamento
                        const rule = this.normalizeRuleStructure(rawRule);

                        if (window.logConfig && window.logConfig.shouldLog('gemini_format')) {

                        }

                        const formattedRule = {
                            id: rule.id || (ruleIndex + 1),
                            type: rule.type,
                            description: rule.description,
                            displayFormat: this.generateDisplayFormat(rule),
                            parameters: FormatGenerator.extractParameters(rule),
                            status: 'waiting', // waiting, satisfied, failed
                            currentValue: null
                        };

                        // 🔧 CORREÇÃO CRÍTICA: Resolver conflitos de valores
                        // O Gemini às vezes gera 'value' na raiz E em 'parameters.value'
                        // Priorizar sempre o valor de 'parameters' pois é o correto
                        if (rule.type === 'last_digits') {
                            // Se temos valor em parameters, usar esse
                            if (rule.parameters?.value !== undefined) {
                                formattedRule.value = rule.parameters.value;
                                formattedRule.parameters.value = rule.parameters.value;
                            }
                            // Se temos count em parameters, usar esse
                            if (rule.parameters?.count !== undefined) {
                                formattedRule.count = rule.parameters.count;
                                formattedRule.parameters.count = rule.parameters.count;
                            }
                            // Se temos operator em parameters, usar esse
                            if (rule.parameters?.operator !== undefined) {
                                formattedRule.operator = rule.parameters.operator;
                                formattedRule.parameters.operator = rule.parameters.operator;
                            }
                        }

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
                            ruleDescription: rule.description || 'Descrição não disponível',
                            errorType: ruleError.name || 'Error',
                            errorMessage: ruleError.message || 'Erro desconhecido',
                            ruleType: rule.type,
                            hasAllowedDigits: !!(rule.allowedDigits || rule.parameters?.allowedDigits)
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

            // 🎯 SEMPRE gerar parâmetros localmente (mais confiável)
            // Os parâmetros do Gemini têm formato inconsistente (chaves abreviadas, sem path, etc.)
            const finalParameters = [];

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

        // 🛡️ GARANTIA FINAL: Se não há parâmetros, gerar agora
        if (!finalParameters || finalParameters.length === 0) {
            console.warn('⚠️ Nenhum parâmetro foi gerado, tentando gerar agora...');

            formattedGroups.forEach((group, groupIndex) => {
                group.rules.forEach((rule, ruleIndex) => {
                    const ruleParams = this.generateEditableParameters(rule, groupIndex, ruleIndex);
                    if (ruleParams && ruleParams.length > 0) {
                        finalParameters.push(...ruleParams);
                    }
                });
            });

            console.log(`✅ Parâmetros gerados no fallback: ${finalParameters.length}`);
        }

        return {
            groups: formattedGroups,
            parameters: finalParameters,
            totalRules: totalRulesFormatted,
            logic: geminiResponse.logic || "OR entre grupos, AND dentro do grupo"
        };
    }

    // 🎯 NOVO: Gerar parâmetros editáveis a partir de uma regra
    generateEditableParameters(rule, groupIndex, ruleIndex) {
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
                // Verificar se o campo existe (e não foi capturado no loop genérico acima)
                // O loop acima já captura se o nome for igual, mas 'targetPercentage' já está lá?
                // Sim, 'targetPercentage' está no 'parameterMappings' (linha 3016).
                // MAS 'value' e 'period' também estão.
                // Então se ruleParams tem esses campos, eles já deveriam ter sido pegos.

                // O PROBLEMA pode ser que ruleParams NÃO é o objeto parameters, mas sim rule.parameters.
                // Na linha 3009: const ruleParams = rule.parameters || {};

                // Se a regra é: parameters: { predictionType: 'conditional_percentage', targetPercentage: 32, ... }
                // O loop genérico (3023) DEVE pegar.

                // 🔍 DEBUG: Talvez o nome do campo seja diferente ou esteja em 'condition'?
                // Para "entrar differ do digito com percentual >=32%", o Gemini pode ter gerado:
                // parameters: { predictionType: 'conditional_percentage', condition: { type: 'percentage', targetPercentage: 32 } }

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
    return formatGeneratorInstance;
}

// ✅ Expor para uso global
window.getFormatGeneratorInstance = getFormatGeneratorInstance;