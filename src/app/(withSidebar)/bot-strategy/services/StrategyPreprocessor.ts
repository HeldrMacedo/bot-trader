export interface ValidationIssue {
    type: string;
    message: string;
    suggestion?: string;
}

export interface ValidationResult {
    isValid: boolean;
    errors: ValidationIssue[];
    warnings: ValidationIssue[];
}

export interface ExtractedEntities {
    contractAction: string | null;
    contractValue: number | null;
    conditions: string[];
    indicators: string[];
    operators: string[];
    values: number[];
    allowedDigits: number[] | null;
    count: number | null;
}

export interface PreprocessedEntityGroup {
    groupIndex: number;
    line: string;
    entities: ExtractedEntities;
}

export interface StrategyGroupStructure {
    groupIndex: number;
    line: string;
    ruleType: string;
    predictionType: string | null;
    entities: ExtractedEntities;
    suggestedStructure: Record<string, any>;
}

export interface StrategyStructure {
    groups: StrategyGroupStructure[];
    totalGroups: number;
    logic: string;
}

export interface ProcessedStrategy {
    processedText: string;
    entities: PreprocessedEntityGroup[];
    validation: ValidationResult;
    structure: StrategyStructure;
    metadata: {
        originalLength: number;
        processedLength: number;
        corrections: boolean;
        normalizations: boolean;
        warnings: number;
        groups: number;
    };
}

export class StrategyPreprocessor {
    private termGlossary: Record<string, string>;

    constructor() {
        this.termGlossary = {
            'porcentagem': 'percentual',
            'porcento': 'percentual',
            'média móvel': 'SMA',
            'média simples': 'SMA',
            'media movel': 'SMA',
            'media simples': 'SMA',
            'índice de força': 'RSI',
            'indice de força': 'RSI',
            'indice de forca': 'RSI',
            'força relativa': 'RSI',
            'forca relativa': 'RSI',
            'maior que': '>',
            'menor que': '<',
            'maior ou igual': '>=',
            'menor ou igual': '<=',
            'igual a': '=',
            'diferente de': '!=',
            'números pares': 'par',
            'numeros pares': 'par',
            'dígitos pares': 'par',
            'digitos pares': 'par',
            'números ímpares': 'ímpar',
            'numeros impares': 'ímpar',
            'números impares': 'ímpar',
            'dígitos ímpares': 'ímpar',
            'digitos impares': 'ímpar',
            'digitos ímpares': 'ímpar'
        };
    }

    public async processStrategy(
        strategyText: string,
        onProgress: (percent: number, message: string) => void = () => {}
    ): Promise<ProcessedStrategy> {
        try {
            onProgress(5, 'Corrigindo erros de digitação...');
            const corrected = this.autoCorrect(strategyText);
            await this.delay(100);

            onProgress(10, 'Normalizando termos...');
            const normalized = this.normalizeTerms(corrected);
            await this.delay(100);

            onProgress(15, 'Validando sintaxe...');
            const validation = this.validateSyntax(normalized);
            await this.delay(100);

            if (!validation.isValid) {
                throw new Error(`Erros na estratégia:\n${validation.errors.map(e => e.message).join('\n')}`);
            }

            onProgress(20, 'Extraindo entidades...');
            const entities = this.extractAllEntities(normalized);
            await this.delay(100);

            onProgress(25, 'Analisando estrutura...');
            const structure = this.analyzeStructure(normalized, entities);
            await this.delay(100);

            return {
                processedText: normalized,
                entities,
                validation,
                structure,
                metadata: {
                    originalLength: strategyText.length,
                    processedLength: normalized.length,
                    corrections: corrected !== strategyText,
                    normalizations: normalized !== corrected,
                    warnings: validation.warnings.length,
                    groups: structure.groups.length
                }
            };
        } catch (error) {
            console.error('❌ [PREPROCESSOR] Erro no processamento:', error);
            throw error;
        }
    }

    public autoCorrect(strategyText: string): string {
        let corrected = strategyText;

        corrected = corrected.replace(/([^\n])\s*\*/g, '$1\n*');

        const keywords = [
            'over', 'under', 'match', 'differ', 'even', 'odd',
            'digito', 'digitos', 'dígito', 'dígitos',
            'percentual', 'porcentagem', 'percentage',
            'padrao', 'padrão', 'pattern',
            'suporte', 'resistencia', 'resistência',
            'preco', 'preço', 'tick', 'tique',
            'entrar', 'quando', 'rsi', 'sma'
        ];

        corrected = corrected.replace(/\b([a-zA-ZáàâãéèêíïóôõöúçñÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ]+)\b/g, (word) => {
            if (word.length < 3) return word;
            const lower = word.toLowerCase();
            if (keywords.includes(lower)) return word;

            const bestMatch = this._getBestMatch(lower, keywords);
            const threshold = lower.length <= 4 ? 1 : 2;

            if (bestMatch.word && bestMatch.distance <= threshold) {
                return bestMatch.word;
            }
            return word;
        });

        corrected = corrected.replace(/(over|under|match|differ)(\d+)/gi, '$1 $2');
        corrected = corrected.replace(/\s*(>=|<=|!=|>|<|=)\s*/g, ' $1 ');

        corrected = corrected.split('\n')
            .map(line => line.replace(/\s+/g, ' ').trim())
            .filter(line => line.length > 0)
            .join('\n');

        return corrected;
    }

    public normalizeTerms(strategyText: string): string {
        let normalized = strategyText;

        Object.entries(this.termGlossary).forEach(([term, replacement]) => {
            const regex = new RegExp(`\\b${term}\\b`, 'gi');
            normalized = normalized.replace(regex, replacement);
        });

        return normalized;
    }

    public validateSyntax(strategyText: string): ValidationResult {
        const errors: ValidationIssue[] = [];
        const warnings: ValidationIssue[] = [];

        const ambiguousContractPattern = /entrar\s+(over|under|match|differ)\s+quando/i;
        if (ambiguousContractPattern.test(strategyText)) {
            warnings.push({
                type: 'AMBIGUOUS_CONTRACT',
                message: 'Detectado "Entrar over/under quando..." sem número específico.',
                suggestion: 'Especifique: "Entrar over 2 quando..." ou remova "over" para condição pura.'
            });
        }

        const numberPattern = /(\d+)/g;
        const numbers = strategyText.match(numberPattern);
        if (numbers) {
            numbers.forEach(num => {
                const value = parseInt(num);
                if (value > 1000) {
                    warnings.push({
                        type: 'LARGE_NUMBER',
                        message: `Número muito grande detectado: ${value}`,
                        suggestion: 'Verifique se o valor está correto.'
                    });
                }
            });
        }

        const hasCondition = /quando|se|caso/i.test(strategyText);
        const hasAction = /entrar|over|under|match|differ|par|ímpar/i.test(strategyText);

        if (!hasCondition && !hasAction) {
            errors.push({
                type: 'NO_CONDITION_OR_ACTION',
                message: 'Estratégia não tem condição ou ação clara.',
                suggestion: 'Adicione "quando", "se" ou "entrar" para definir a estratégia.'
            });
        }

        if (!strategyText || strategyText.trim().length === 0) {
            errors.push({
                type: 'EMPTY_STRATEGY',
                message: 'Estratégia vazia.',
                suggestion: 'Digite uma estratégia válida.'
            });
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }

    public extractAllEntities(strategyText: string): PreprocessedEntityGroup[] {
        const lines = strategyText.split('\n').filter(line => line.trim().startsWith('*'));

        return lines.map((line, index) => ({
            groupIndex: index,
            line: line.trim(),
            entities: this.extractEntities(line)
        }));
    }

    public extractEntities(line: string): ExtractedEntities {
        const entities: ExtractedEntities = {
            contractAction: null,
            contractValue: null,
            conditions: [],
            indicators: [],
            operators: [],
            values: [],
            allowedDigits: null,
            count: null
        };

        const contractPattern = /entrar\s+(over|under|match|differ)\s+(\d+)/i;
        const contractMatch = line.match(contractPattern);
        if (contractMatch) {
            entities.contractAction = contractMatch[1].toLowerCase();
            entities.contractValue = parseInt(contractMatch[2]);
        }

        const parityPattern = /entrar\s+(?:em\s+)?(par|ímpar|impar)/i;
        const parityMatch = line.match(parityPattern);
        if (parityMatch && !contractMatch) {
            entities.contractAction = parityMatch[1].toLowerCase();
            if (entities.contractAction === 'impar') {
                entities.contractAction = 'ímpar';
            }
        }

        if (/RSI/i.test(line)) {
            entities.indicators.push('RSI');
        }
        if (/SMA/i.test(line)) {
            entities.indicators.push('SMA');
        }
        if (/percentual/i.test(line)) {
            entities.indicators.push('PERCENTAGE');
        }

        const operatorPattern = /(>=|<=|!=|>|<|=)/g;
        const operators = line.match(operatorPattern);
        if (operators) {
            entities.operators = [...new Set(operators)];
        }

        const numberPattern = /(\d+)/g;
        const numbers = line.match(numberPattern);
        if (numbers) {
            entities.values = numbers.map(n => parseInt(n));
        }

        const allowedDigitsPattern = /=\s*\(([0-9,\s]+)\)/;
        const allowedMatch = line.match(allowedDigitsPattern);
        if (allowedMatch) {
            entities.allowedDigits = allowedMatch[1]
                .split(',')
                .map(d => parseInt(d.trim()))
                .filter(d => !isNaN(d));
        }

        const countPattern = /últimos?\s+(\d+)\s+dígitos?/i;
        const countMatch = line.match(countPattern);
        if (countMatch) {
            entities.count = parseInt(countMatch[1]);
        }

        const conditionPattern = /quando\s+(.+?)(?:\.|$)/gi;
        let match;
        while ((match = conditionPattern.exec(line)) !== null) {
            entities.conditions.push(match[1].trim());
        }

        return entities;
    }

    public analyzeStructure(strategyText: string, allEntities: PreprocessedEntityGroup[]): StrategyStructure {
        const groups = allEntities.map(({ groupIndex, line, entities }) => {
            let ruleType = 'condition';
            let predictionType: string | null = null;

            if (entities.contractAction) {
                ruleType = 'dynamic_prediction';

                if (entities.indicators.includes('PERCENTAGE')) {
                    predictionType = 'conditional_percentage';
                } else if (entities.indicators.includes('RSI')) {
                    predictionType = 'conditional_rsi';
                } else if (entities.indicators.includes('SMA')) {
                    predictionType = 'conditional_sma';
                } else if (entities.allowedDigits) {
                    predictionType = 'conditional_value';
                } else {
                    predictionType = 'conditional_value';
                }
            }

            return {
                groupIndex,
                line,
                ruleType,
                predictionType,
                entities,
                suggestedStructure: this.buildSuggestedStructure(ruleType, predictionType, entities, line)
            };
        });

        return {
            groups,
            totalGroups: groups.length,
            logic: groups.length > 1 ? 'OR entre grupos, AND dentro do grupo' : 'Grupo único'
        };
    }

    private buildSuggestedStructure(ruleType: string, predictionType: string | null, entities: ExtractedEntities, line: string): Record<string, any> {
        const structure: Record<string, any> = {
            type: ruleType
        };

        if (ruleType === 'dynamic_prediction') {
            structure.predictionType = predictionType;
            structure.predictionAction = entities.contractAction;

            if (entities.contractValue !== null) {
                structure.targetValue = entities.contractValue;
            } else if (entities.contractAction === 'par') {
                structure.targetValue = 'dynamic_parity_even';
            } else if (entities.contractAction === 'ímpar') {
                structure.targetValue = 'dynamic_parity_odd';
            }

            if (entities.indicators.length > 0 || entities.allowedDigits) {
                structure.combinedRule = {};

                if (entities.allowedDigits) {
                    structure.combinedRule.allowedDigitsRule = {
                        type: 'allowed_digits',
                        allowedDigits: entities.allowedDigits,
                        count: entities.count || 1
                    };
                }

                if (entities.indicators.includes('RSI')) {
                    const rsiOperator = entities.operators.find(op => op !== '=') || '>';
                    const rsiValue = entities.values.find(v => v >= 0 && v <= 100) || 50;

                    structure.combinedRule.rsiRule = {
                        type: 'rsi',
                        operator: rsiOperator,
                        value: rsiValue,
                        period: 14
                    };
                }

                if (entities.indicators.includes('PERCENTAGE')) {
                    const percentageOperator = entities.operators[entities.operators.length - 1] || '>';
                    const targetPercentage = entities.values[entities.values.length - 1] || 50;
                    const hasExplicitDigitComparison = /d[ií]gitos?\s*(?:abaixo|acima|menor|maior|<=|>=|<|>|=)\s*\d+/i.test(line);
                    const conditionOperator = entities.operators[0] || '<';
                    let conditionType: string | null = null;
                    if (hasExplicitDigitComparison) {
                        if (conditionOperator === '<') conditionType = 'below';
                        if (conditionOperator === '>') conditionType = 'above';
                        if (conditionOperator === '=') conditionType = 'equal';
                    }

                    structure.combinedRule.percentageRule = {
                        type: 'percentage',
                        operator: percentageOperator,
                        targetPercentage,
                        conditionType,
                        value: hasExplicitDigitComparison ? (entities.values[0] || 5) : undefined,
                        period: 25
                    };
                }
            }
        }

        return structure;
    }

    public enrichPrompt(basePrompt: string, preprocessedData: ProcessedStrategy): string {
        const { structure, validation } = preprocessedData;

        let enrichedPrompt = basePrompt;

        enrichedPrompt += `\n\n═══════════════════════════════════════════════════════════════════\n`;
        enrichedPrompt += `🔍 CONTEXTO PRÉ-PROCESSADO (use como guia prioritário):\n`;
        enrichedPrompt += `═══════════════════════════════════════════════════════════════════\n\n`;

        enrichedPrompt += `📊 ESTRUTURA DETECTADA:\n`;
        enrichedPrompt += `- ${structure.totalGroups} grupo(s)\n`;
        enrichedPrompt += `- Lógica: ${structure.logic}\n\n`;

        if (structure.totalGroups > 1) {
            enrichedPrompt += `⚠️ REGRA DE ESTRUTURA (CRÍTICA):\n`;
            enrichedPrompt += `Você DETECTOU ${structure.totalGroups} GRUPOS DISTINTOS.\n`;
            enrichedPrompt += `O JSON DEVE TER EXATAMENTE ${structure.totalGroups} OBJETOS DENTRO DO ARRAY "groups".\n`;
            enrichedPrompt += `NÃO JUNTAR REGRAS DE LINHAS DIFERENTES NO MESMO GRUPO.\n`;
            enrichedPrompt += `CADA LINHA QUE COMEÇA COM "*" É UM GRUPO SEPARADO (id: 1, id: 2, ...).\n\n`;
        }

        if (validation.warnings.length > 0) {
            enrichedPrompt += `⚠️ AVISOS:\n`;
            validation.warnings.forEach(warning => {
                enrichedPrompt += `- ${warning.message}\n`;
            });
            enrichedPrompt += `\n`;
        }

        structure.groups.forEach((group, index) => {
            enrichedPrompt += `🎯 GRUPO ${index + 1}:\n`;
            enrichedPrompt += `Linha: "${group.line}"\n\n`;

            enrichedPrompt += `Entidades Identificadas:\n`;
            if (group.entities.contractAction) {
                enrichedPrompt += `- Ação de Contrato: ${group.entities.contractAction.toUpperCase()}\n`;
            }
            if (group.entities.contractValue !== null) {
                enrichedPrompt += `- Valor do Contrato: ${group.entities.contractValue}\n`;
            }
            if (group.entities.indicators.length > 0) {
                enrichedPrompt += `- Indicadores: ${group.entities.indicators.join(', ')}\n`;
            }
            if (group.entities.allowedDigits) {
                enrichedPrompt += `- Dígitos Permitidos: [${group.entities.allowedDigits.join(', ')}]\n`;
            }
            if (group.entities.count) {
                enrichedPrompt += `- Quantidade: ${group.entities.count}\n`;
            }

            enrichedPrompt += `\nEstrutura JSON Sugerida:\n`;
            enrichedPrompt += JSON.stringify(group.suggestedStructure, null, 2);
            enrichedPrompt += `\n\n---\n\n`;
        });

        enrichedPrompt += `═══════════════════════════════════════════════════════════════════\n`;
        enrichedPrompt += `⚠️ INSTRUÇÕES CRÍTICAS:\n`;
        enrichedPrompt += `- Use EXATAMENTE as estruturas JSON sugeridas acima\n`;
        enrichedPrompt += `- NÃO invente novos campos ou estruturas\n`;
        enrichedPrompt += `- Os valores numéricos já foram extraídos e validados\n`;
        enrichedPrompt += `- A lógica AND/OR já foi identificada\n`;
        enrichedPrompt += `═══════════════════════════════════════════════════════════════════\n`;

        return enrichedPrompt;
    }

    private _getBestMatch(word: string, candidates: string[]): { word: string | null, distance: number } {
        let minDistance = Infinity;
        let bestWord = null;

        for (const candidate of candidates) {
            const distance = this._calculateLevenshteinDistance(word, candidate);
            if (distance < minDistance) {
                minDistance = distance;
                bestWord = candidate;
            }
        }
        return { word: bestWord, distance: minDistance };
    }

    private _calculateLevenshteinDistance(a: string, b: string): number {
        if (a.length === 0) return b.length;
        if (b.length === 0) return a.length;

        const matrix = [];

        for (let i = 0; i <= b.length; i++) {
            matrix[i] = [i];
        }

        for (let j = 0; j <= a.length; j++) {
            matrix[0][j] = j;
        }

        for (let i = 1; i <= b.length; i++) {
            for (let j = 1; j <= a.length; j++) {
                if (b.charAt(i - 1) === a.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        Math.min(
                            matrix[i][j - 1] + 1,
                            matrix[i - 1][j] + 1
                        )
                    );
                }
            }
        }
        return matrix[b.length][a.length];
    }

    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
