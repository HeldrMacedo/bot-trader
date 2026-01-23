
import { StrategyPreprocessor } from './StrategyPreprocessor';

export interface StrategyRule {
    id?: number | string;
    type: string;
    description?: string;
    displayFormat?: string;
    parameters?: any;
    status?: string;
    currentValue?: any;
    count?: number;
    value?: any;
    operator?: string;
    allowedDigits?: number[];
    [key: string]: any;
}

export interface FormattedGroup {
    id?: number | string;
    rules: StrategyRule[];
    status?: string;
    [key: string]: any;
}

export interface FormattedStrategy {
    groups: FormattedGroup[];
    parameters: any[];
    totalRules: number;
    logic: string;
}

export class FormatGenerator {
    private static instance: FormatGenerator;

    constructor() {}

    public static getInstance(): FormatGenerator {
        if (!FormatGenerator.instance) {
            FormatGenerator.instance = new FormatGenerator();
        }
        return FormatGenerator.instance;
    }

    private normalizeOperator(operator: string | undefined): string {
        if (!operator) return '';
        const map: Record<string, string> = {
            'greater_than': '>',
            'less_than': '<',
            'greater_or_equal': '>=',
            'less_or_equal': '<=',
            'equal': '=',
            'not_equal': '!=',
            'gt': '>',
            'lt': '<',
            'gte': '>=',
            'lte': '<=',
            'eq': '=',
            'neq': '!='
        };
        return map[operator.toLowerCase()] || operator;
    }

    private normalizePatternRuleType(patternRule: any): any {
        if (!patternRule) return null;
        const normalized = { ...patternRule };
        if (normalized.type === 'pattern') {
            normalized.type = 'digit_pattern';
        }
        if (normalized.pattern && !normalized.type) {
            normalized.type = 'digit_pattern';
        }
        return normalized;
    }

    private canonizePercentageRule(rawRule: any, options: { allowMissingConditionType?: boolean } = {}): any | null {
        const allowMissingConditionType = options.allowMissingConditionType || false;
        if (!rawRule) return null;

        let params = rawRule.parameters || rawRule;
        if (params.combinedRule?.percentageRule) {
            params = params.combinedRule.percentageRule;
        }

        const validOperators = ['>', '<', '=', '>=', '<='];
        if (!params.operator || !validOperators.includes(params.operator)) {
            return null;
        }

        if (params.targetPercentage === undefined || params.targetPercentage < 0 || params.targetPercentage > 100) {
            return null;
        }

        let conditionType = params.conditionType || null;
        let value = params.value !== undefined ? params.value : null;

        if (conditionType) {
            const validConditionTypes = ['below', 'above', 'equal', 'even', 'odd', 'single_digit', 'individual_digits'];
            if (!validConditionTypes.includes(conditionType)) {
                return null;
            }

            if (['below', 'above', 'equal'].includes(conditionType)) {
                if (value === undefined || value === null || value < 0 || value > 9) {
                    return null;
                }
            }
        } else if (!allowMissingConditionType) {
            return null;
        }

        return {
            operator: params.operator,
            targetPercentage: params.targetPercentage,
            conditionType,
            value,
            period: params.period || 25,
            allowedDigits: params.allowedDigits !== undefined ? params.allowedDigits : null
        };
    }

    private interpretPatternRule(rule: any): string {
        if (rule.type === 'digit_pattern' && rule.pattern) {
            return `Padrão ${rule.pattern}`;
        }
        if (rule.type === 'digit_repetition') {
            return `Repetição de ${rule.count || 2} dígitos`;
        }
        return 'Padrão desconhecido';
    }

    public generateDisplayFormat(rule: StrategyRule): string {
        switch (rule.type) {
            case 'last_digits': {
                const params = rule.parameters || rule;
                const count = params.count || rule.count;
                const value = params.value !== undefined ? params.value : rule.value;
                const operator = params.operator || rule.operator;

                const digitPlaceholders = 'X,'.repeat(count || 1).slice(0, -1);
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
                    const operatorSma = this.normalizeOperator(operator);
                    return `SMA(${period1 || 14}) ${operatorSma} SMA(${period2})`;
                } else if (supportLevel || resistanceLevel) {
                    const level = supportLevel ? 'Suporte' : 'Resistência';
                    const operatorSma = this.normalizeOperator(operator);
                    return `SMA(${period}) ${operatorSma} ${level}`;
                } else {
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
                const params = rule.parameters || rule;
                const canonical = this.canonizePercentageRule(params, { allowMissingConditionType: true }) || params;
                const percentage = canonical.targetPercentage ?? params.targetPercentage ?? rule.targetPercentage ?? 0;
                const operator = this.normalizeOperator(canonical.operator || params.operator || rule.operator || '>=');
                const conditionType = canonical.conditionType || params.conditionType || rule.conditionType;
                const value = canonical.value ?? params.value ?? rule.value;
                const allowedDigits = canonical.allowedDigits ?? params.allowedDigits ?? rule.allowedDigits;

                let conditionText = 'dígitos';
                if (conditionType === 'above') conditionText = `dígitos > ${value}`;
                else if (conditionType === 'below') conditionText = `dígitos < ${value}`;
                else if (conditionType === 'equal') conditionText = `dígitos = ${value}`;
                else if (conditionType === 'even') conditionText = 'pares';
                else if (conditionType === 'odd') conditionText = 'ímpares';
                else if (conditionType === 'single_digit') conditionText = 'último dígito';
                else if (conditionType === 'individual_digits') conditionText = 'qualquer dígito';
                else if (Array.isArray(allowedDigits) && allowedDigits.length > 0) conditionText = `dígitos (${allowedDigits.join(',')})`;

                return `Percentual ${conditionText} ${operator} ${percentage}%`;
            }

            case 'digit_repetition': {
                const params = rule.parameters || rule;
                const repetitionCount = params.count || rule.count || 2;
                return `Últimos ${repetitionCount} dígitos repetindo`;
            }

            case 'digit_parity': {
                const params = rule.parameters || rule;
                const parityCount = params.count || rule.count || 1;
                const parity = params.parity || rule.parity;
                const parityLabel = parity === 'par' || parity === 'even' ? 'pares' : 'ímpares';
                return `Últimos ${parityCount} dígito${parityCount > 1 ? 's' : ''} ${parityLabel}`;
            }

            case 'digit_pattern': {
                const params = rule.parameters || rule;
                const pattern = params.pattern || rule.pattern || '';
                return `Padrão de dígitos: ${pattern}`;
            }

            case 'allowed_digits': {
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
                    const combinedRule = params.combinedRule;
                    if (combinedRule && combinedRule.percentageRule) {
                        const percentageRule = combinedRule.percentageRule;
                        const canonical = this.canonizePercentageRule(percentageRule, { allowMissingConditionType: true }) || percentageRule;
                        const percentage = canonical.targetPercentage || 55;
                        const operator = this.normalizeOperator(canonical.operator || '>=');
                        const condType = canonical.conditionType;
                        const value = canonical.value;
                        const allowedDigits = canonical.allowedDigits;

                        let conditionText = '';
                        if (condType === 'above') conditionText = `dígitos superiores ${value}`;
                        else if (condType === 'below') conditionText = `dígitos inferiores a ${value}`;
                        else if (condType === 'even') conditionText = 'pares';
                        else if (condType === 'odd') conditionText = 'ímpares';
                        else if (condType === 'equal') conditionText = `dígitos = ${value}`;
                        else if (condType === 'single_digit') conditionText = 'último dígito';
                        else if (condType === 'individual_digits') conditionText = 'qualquer dígito';
                        else if (Array.isArray(allowedDigits) && allowedDigits.length > 0) conditionText = `dígitos (${allowedDigits.join(',')})`;
                        else conditionText = 'dígitos';

                        return `Entrar ${target} se percentual dos ${conditionText} ${operator} ${percentage}%`;
                    }
                    return `Entrar ${target} com condição de percentual`;
                } else if (predType === 'conditional_pattern') {
                    const combinedRule = params.combinedRule;
                    if (combinedRule && combinedRule.patternRule) {
                        const patternRule = this.normalizePatternRuleType(combinedRule.patternRule);
                        if (patternRule.type === 'digit_repetition' && params.count) {
                            patternRule.count = params.count;
                        }
                        const patternText = this.interpretPatternRule(patternRule);
                        const action = params.predictionAction || target;
                        if (action !== undefined) {
                            return `Entrar ${action.toUpperCase()} do ${patternText.toLowerCase()}`;
                        }
                        return `Previsão dinâmica: ${patternText}`;
                    }
                    return `Previsão dinâmica com padrão`;
                } else if (predType === 'conditional_probability_accuracy') {
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
                    const operation = predType === 'percentage_digit_inverse' ? 'differ' : 'match';
                    const combinedRule = params.combinedRule;
                    if (combinedRule && combinedRule.percentageRule) {
                        const percentageRule = combinedRule.percentageRule;
                        const canonical = this.canonizePercentageRule(percentageRule, { allowMissingConditionType: true }) || percentageRule;
                        const percentage = canonical.targetPercentage || 32;
                        const operator = this.normalizeOperator(canonical.operator || '>');
                        return `Entrar ${operation} do dígito quando percentual ${operator} ${percentage}%`;
                    }
                    return `Entrar ${operation} do dígito com percentual`;
                } else if (predType === 'last_digit_probability_match') {
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

            case 'dynamic_target_on_repetition': {
                const count = rule.count || rule.parameters?.count || 2;
                const action = rule.action || rule.parameters?.action || 'differ';
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

    private normalizeRuleStructure(rawRule: any): StrategyRule {
        // Simple normalization, can be expanded
        return { ...rawRule, parameters: rawRule.parameters || rawRule };
    }

    public static extractParameters(rule: StrategyRule): any {
        return rule.parameters || {};
    }

    private generateEditableParameters(rule: StrategyRule, groupIndex: number, ruleIndex: number): any[] {
        const params: any[] = [];
        const ruleParams = rule.parameters || {};
        const ruleId = `g${groupIndex + 1}_r${ruleIndex + 1}`;

        const parameterMappings: Record<string, any> = {
            'count': { label: 'Qtd. Últimos Dígitos', path: `groups[${groupIndex}].rules[${ruleIndex}].parameters.count` },
            'value': { label: 'Dígito Referência', path: `groups[${groupIndex}].rules[${ruleIndex}].parameters.value` },
            'targetPercentage': { label: 'Percentual Alvo', path: `groups[${groupIndex}].rules[${ruleIndex}].parameters.targetPercentage` },
            'period': { label: 'Período Percentual', path: `groups[${groupIndex}].rules[${ruleIndex}].parameters.period` },
            'period1': { label: 'Período SMA 1', path: `groups[${groupIndex}].rules[${ruleIndex}].parameters.period1` },
            'period2': { label: 'Período SMA 2', path: `groups[${groupIndex}].rules[${ruleIndex}].parameters.period2` }
        };

        Object.keys(parameterMappings).forEach(field => {
            const val = ruleParams[field] !== undefined ? ruleParams[field] : rule[field];
            if (val !== undefined) {
                const isDynamic = typeof val === 'string' && val.startsWith('$');
                const isAtRoot = ruleParams[field] === undefined && rule[field] !== undefined;
                const path = isAtRoot ?
                    `groups[${groupIndex}].rules[${ruleIndex}].${field}` :
                    parameterMappings[field].path;

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
        
        return params;
    }

    public formatGeminiResponse(geminiResponse: any): FormattedStrategy {
        try {
            const groups = geminiResponse.groups || [];
            
            const formattedGroups = groups.map((group: any, groupIndex: number) => {
                const rules = group.rules || [];
                const formattedRules = rules.map((rawRule: any, ruleIndex: number) => {
                    const rule = this.normalizeRuleStructure(rawRule);
                    
                    const formattedRule: StrategyRule = {
                        id: rule.id || (ruleIndex + 1),
                        type: rule.type,
                        description: rule.description,
                        displayFormat: this.generateDisplayFormat(rule),
                        parameters: FormatGenerator.extractParameters(rule),
                        status: 'waiting',
                        currentValue: null,
                        ...rule
                    };

                    // Resolve value conflicts
                    if (rule.type === 'last_digits') {
                         if (rule.parameters?.value !== undefined) {
                             formattedRule.value = rule.parameters.value;
                             if (formattedRule.parameters) formattedRule.parameters.value = rule.parameters.value;
                         }
                         if (rule.parameters?.count !== undefined) {
                             formattedRule.count = rule.parameters.count;
                             if (formattedRule.parameters) formattedRule.parameters.count = rule.parameters.count;
                         }
                         if (rule.parameters?.operator !== undefined) {
                             formattedRule.operator = rule.parameters.operator;
                             if (formattedRule.parameters) formattedRule.parameters.operator = rule.parameters.operator;
                         }
                    }

                    return formattedRule;
                });

                return {
                    ...group,
                    rules: formattedRules,
                    status: 'inactive'
                };
            });

            const finalParameters: any[] = [];
            formattedGroups.forEach((group: FormattedGroup, groupIndex: number) => {
                group.rules.forEach((rule: StrategyRule, ruleIndex: number) => {
                    try {
                        if (rule.parameters && typeof rule.parameters === 'object') {
                            const ruleParams = this.generateEditableParameters(rule, groupIndex, ruleIndex);
                            finalParameters.push(...ruleParams);
                        }
                    } catch (e) {
                        console.error("Error extracting params", e);
                    }
                });
            });

            return {
                groups: formattedGroups,
                parameters: finalParameters,
                totalRules: formattedGroups.reduce((acc: number, g: FormattedGroup) => acc + g.rules.length, 0),
                logic: geminiResponse.logic || "OR entre grupos, AND dentro do grupo"
            };

        } catch (error: any) {
            console.error('❌ [FORMAT GEMINI RESPONSE] Erro crítico:', error);
            throw new Error(`Erro ao processar a resposta do Gemini AI: ${error.message}`);
        }
    }
}
