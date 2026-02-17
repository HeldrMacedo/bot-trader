// js/strategy-preprocessor.js
// Sistema de pré-processamento de estratégias antes de enviar ao Gemini
// Reduz ambiguidades e melhora taxa de sucesso da tradução


class StrategyPreprocessor {
    constructor() {
        // Glossário de termos normalizados
        this.termGlossary = {
            // Percentuais
            'porcentagem': 'percentual',
            'porcento': 'percentual',

            // Indicadores
            'média móvel': 'SMA',
            'média simples': 'SMA',
            'media movel': 'SMA',
            'media simples': 'SMA',
            'índice de força': 'RSI',
            'indice de força': 'RSI',
            'indice de forca': 'RSI',
            'força relativa': 'RSI',
            'forca relativa': 'RSI',
            'rei': 'RSI', // Gíria do usuário

            // Precisão/Probabilidade
            'precisão': 'precisão',
            'accuracy': 'precisão',
            'chance': 'chance',

            // Operadores (por extenso)
            'maior que': '>',
            'menor que': '<',
            'maior ou igual a': '>=',
            'menor ou igual a': '<=',
            'maior ou igual': '>=',
            'menor ou igual': '<=',
            'igual a': '=',
            'diferente de': '!=',
            'inferiores a': '<',
            'superiores a': '>',
            'abaixo de': '<',
            'acima de': '>',

            // ❌ REMOVIDO: Ações de contrato (causam ambiguidade)
            // 'acima de': 'over',  // Conflita com "dígitos acima de 5"
            // 'abaixo de': 'under', // Conflita com "dígitos abaixo de 5"
            // 'igual ao': 'match',
            // 'diferente do': 'differ',

            // Paridade
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

    /**
     * Processar estratégia completa (pipeline completo)
     * @param {string} strategyText - Texto original da estratégia
     * @param {function} onProgress - Callback de progresso (percent, message)
     * @returns {object} { processedText, entities, validation, metadata }
     */
    async processStrategy(strategyText, onProgress = () => { }) {

        try {
            // Passo 1: Auto-correção (5%)
            onProgress(5, 'Corrigindo erros de digitação...');
            const corrected = this.autoCorrect(strategyText);
            await this.delay(100);

            // Passo 2: Normalização (10%)
            onProgress(10, 'Normalizando termos...');
            const normalized = this.normalizeTerms(corrected);
            await this.delay(100);

            // Passo 3: Validação (15%)
            onProgress(15, 'Validando sintaxe...');
            const validation = this.validateSyntax(normalized);
            await this.delay(100);

            // Se houver erros críticos, retornar imediatamente
            if (!validation.isValid) {
                throw new Error(`Erros na estratégia:\n${validation.errors.map(e => e.message).join('\n')}`);
            }

            // Passo 4: Extração de entidades (20%)
            onProgress(20, 'Extraindo entidades...');
            const entities = this.extractAllEntities(normalized);
            await this.delay(100);

            // Passo 5: Análise estrutural (25%)
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
                    groups: structure.groups.length,
                    keywords: this.detectKeywords(normalized)
                }
            };

        } catch (error) {
            console.error('❌ [PREPROCESSOR] Erro no processamento:', error);
            throw error;
        }
    }

    /**
     * Delay helper para progresso visual
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Corrigir erros comuns de digitação
     * @param {string} strategyText - Texto original
     * @returns {string} Texto corrigido
     */
    autoCorrect(strategyText) {
        let corrected = strategyText;

        // 0. ⚠️ CRÍTICO: Garantir que * sempre inicie uma nova linha
        corrected = corrected.replace(/([^\n])\s*\*/g, '$1\n*');

        // 1. Definições para Fuzzy Matching
        const keywords = [
            'over', 'under', 'match', 'differ', 'even', 'odd',
            'digito', 'digitos', 'dígito', 'dígitos',
            'percentual', 'porcentagem', 'percentage',
            'padrao', 'padrão', 'pattern',
            'suporte', 'resistencia', 'resistência',
            'preco', 'preço', 'tick', 'tique',
            'entrar', 'quando', 'rsi', 'sma'
        ];

        // 2. Tokenizar e corrigir palavras individualmente
        // Preservar pontuação e espaços, focando em palavras
        corrected = corrected.replace(/\b([a-zA-ZáàâãéèêíïóôõöúçñÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ]+)\b/g, (word) => {
            // Ignorar números ou palavras muito curtas (menos de 3 letras)
            if (word.length < 3) return word;

            const lower = word.toLowerCase();

            // Se já é uma keyword exata, retorna (ignorando case)
            if (keywords.includes(lower)) return word;

            // Tentar encontrar melhor match
            const bestMatch = this._getBestMatch(lower, keywords);

            // Critérios de aceitação:
            // - Distância <= 1 para palavras curtas (3-4 letras)
            // - Distância <= 2 para palavras médias/longas (5+ letras)
            const threshold = lower.length <= 4 ? 1 : 2;

            if (bestMatch && bestMatch.distance <= threshold) {
                // console.log(`🔧 AutoCorrect: ${word} -> ${bestMatch.word}`);
                return bestMatch.word; // Retorna a correção
            }

            return word; // Sem correção
        });

        // 3. Ajustes de pontuação e espaçamento
        corrected = corrected.replace(/(over|under|match|differ)(\d+)/gi, '$1 $2'); // Espaço após ação
        corrected = corrected.replace(/\s*(>=|<=|!=|>|<|=)\s*/g, ' $1 '); // Espaços operadores

        // 4. Limpeza final de espaços (preservando quebras)
        corrected = corrected.split('\n')
            .map(line => line.replace(/\s+/g, ' ').trim())
            .filter(line => line.length > 0)
            .join('\n');

        return corrected;
    }

    /**
     * Encontrar a palavra-chave mais próxima usando Levenshtein
     */
    _getBestMatch(word, candidates) {
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

    /**
     * Calcular distância de Levenshtein entre duas strings
     */
    _calculateLevenshteinDistance(a, b) {
        if (a.length === 0) return b.length;
        if (b.length === 0) return a.length;

        const matrix = [];

        // Inicializar primeira linha e coluna
        for (let i = 0; i <= b.length; i++) {
            matrix[i] = [i];
        }
        for (let j = 0; j <= a.length; j++) {
            matrix[0][j] = j;
        }

        // Preencher matriz
        for (let i = 1; i <= b.length; i++) {
            for (let j = 1; j <= a.length; j++) {
                if (b.charAt(i - 1) === a.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1, // Substituição
                        Math.min(
                            matrix[i][j - 1] + 1, // Inserção
                            matrix[i - 1][j] + 1  // Remoção
                        )
                    );
                }
            }
        }

        return matrix[b.length][a.length];
    }

    /**
     * Normalizar termos da estratégia
     * @param {string} strategyText - Texto original
     * @returns {string} Texto normalizado
     */
    normalizeTerms(strategyText) {
        let normalized = strategyText;

        // Aplicar cada substituição do glossário
        Object.entries(this.termGlossary).forEach(([term, replacement]) => {
            // Case-insensitive replacement usando regex
            const regex = new RegExp(`\\b${term}\\b`, 'gi');
            normalized = normalized.replace(regex, replacement);
        });


        return normalized;
    }

    /**
     * Validar sintaxe e detectar ambiguidades
     * @param {string} strategyText - Texto da estratégia
     * @returns {object} { isValid, errors, warnings }
     */
    validateSyntax(strategyText) {
        const errors = [];
        const warnings = [];

        // 1. Detectar "over/under" sem número (ambíguo)
        const ambiguousContractPattern = /entrar\s+(over|under|match|differ)\s+quando/i;
        if (ambiguousContractPattern.test(strategyText)) {
            warnings.push({
                type: 'AMBIGUOUS_CONTRACT',
                message: 'Detectado "Entrar over/under quando..." sem número específico.',
                suggestion: 'Especifique: "Entrar over 2 quando..." ou remova "over" para condição pura.'
            });
        }

        // 2. Verificar números muito grandes
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

        // 3. Verificar se tem pelo menos uma condição ou ação
        const hasCondition = /quando|se|caso/i.test(strategyText);
        const hasAction = /entrar|over|under|match|differ|par|ímpar/i.test(strategyText);

        if (!hasCondition && !hasAction) {
            errors.push({
                type: 'NO_CONDITION_OR_ACTION',
                message: 'Estratégia não tem condição ou ação clara.',
                suggestion: 'Adicione "quando", "se" ou "entrar" para definir a estratégia.'
            });
        }

        // 4. Verificar se a estratégia não está vazia
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

    /**
     * Extrair entidades de todas as linhas
     * @param {string} strategyText - Texto da estratégia
     * @returns {array} Array de entidades por grupo
     */
    extractAllEntities(strategyText) {
        const lines = strategyText.split('\n').filter(line => line.trim().startsWith('*'));

        return lines.map((line, index) => ({
            groupIndex: index,
            line: line.trim(),
            entities: this.extractEntities(line)
        }));
    }

    /**
     * Extrair entidades de uma linha
     * @param {string} line - Linha da estratégia
     * @returns {object} Entidades extraídas
     */
    extractEntities(line) {
        const entities = {
            contractAction: null,
            contractValue: null,
            conditions: [],
            indicators: [],
            operators: [],
            values: [],
            allowedDigits: null,
            count: null
        };

        // 1. Extrair ação de contrato + valor
        const contractPattern = /entrar\s+(over|under|match|differ)\s+(\d+)/i;
        const contractMatch = line.match(contractPattern);
        if (contractMatch) {
            entities.contractAction = contractMatch[1].toLowerCase();
            entities.contractValue = parseInt(contractMatch[2]);
        }

        // 2. Detectar ações de paridade (sem número)
        const parityPattern = /entrar\s+(?:em\s+)?(par|ímpar|impar)/i;
        const parityMatch = line.match(parityPattern);
        if (parityMatch && !contractMatch) {
            entities.contractAction = parityMatch[1].toLowerCase();
            if (entities.contractAction === 'impar') {
                entities.contractAction = 'ímpar';
            }
        }

        // 3. Extrair indicadores
        if (/RSI/i.test(line)) {
            entities.indicators.push('RSI');
        }
        if (/SMA/i.test(line)) {
            entities.indicators.push('SMA');
        }
        if (/percentual/i.test(line)) {
            entities.indicators.push('PERCENTAGE');
        }

        // 4. Extrair operadores
        const operatorPattern = /(>=|<=|!=|>|<|=)/g;
        const operators = line.match(operatorPattern);
        if (operators) {
            entities.operators = [...new Set(operators)];
        }

        // 5. Extrair valores numéricos
        const numberPattern = /(\d+)/g;
        const numbers = line.match(numberPattern);
        if (numbers) {
            entities.values = numbers.map(n => parseInt(n));
        }

        // 6. Extrair dígitos permitidos da sintaxe (0,1,2) ou =(0,1,2)
        const allowedDigitsPattern = /(?:=|\s|^)\s*\(([0-9,\s]+)\)/;
        const allowedMatch = line.match(allowedDigitsPattern);
        if (allowedMatch) {
            entities.allowedDigits = allowedMatch[1]
                .split(',')
                .map(d => parseInt(d.trim()))
                .filter(d => !isNaN(d));
        }

        // 7. Extrair count (últimos X dígitos)
        const countPattern = /últimos?\s+(\d+)\s+dígitos?/i;
        const countMatch = line.match(countPattern);
        if (countMatch) {
            entities.count = parseInt(countMatch[1]);
        }

        // 8. Extrair condições (texto após "quando" ou palavras de probabilidade)
        const conditionPattern = /(?:quando|chance|dígitos?)\s+(.+?)(?:\.|$)/gi;
        let match;
        while ((match = conditionPattern.exec(line)) !== null) {
            entities.conditions.push(match[1].trim());
        }

        return entities;
    }

    /**
     * Analisar estrutura da estratégia
     * @param {string} strategyText - Texto normalizado
     * @param {array} allEntities - Entidades extraídas
     * @returns {object} Estrutura analisada
     */
    analyzeStructure(strategyText, allEntities) {
        const groups = allEntities.map(({ groupIndex, line, entities }) => {
            let ruleType = 'last_digits'; // Fallback seguro
            let predictionType = null;

            // Se tem ação de contrato ou indicadores, é dynamic_prediction
            if (entities.contractAction || entities.indicators.length > 0 || entities.allowedDigits) {
                ruleType = 'dynamic_prediction';

                // Determinar predictionType baseado nos indicadores
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

                // Se não há ação explícita mas há indicadores, NÃO forçar 'match' 
                // para que a IA possa usar as regras de fallback (explicitPrediction: false)
                if (!entities.contractAction) {
                    // Mantém como null para detecção da IA
                }
            } else if (entities.operators.length > 0 && entities.values.length > 0) {
                // Se tem operador e valor mas nada específico, pode ser uma regra de dígitos simples
                ruleType = 'last_digits';
            }

            return {
                groupIndex,
                line,
                ruleType,
                predictionType,
                entities,
                suggestedStructure: this.buildSuggestedStructure(ruleType, predictionType, entities)
            };
        });

        return {
            groups,
            totalGroups: groups.length,
            logic: groups.length > 1 ? 'OR entre grupos, AND dentro do grupo' : 'Grupo único'
        };
    }

    /**
     * Construir estrutura JSON sugerida
     * @param {string} ruleType - Tipo da regra
     * @param {string} predictionType - Tipo de previsão
     * @param {object} entities - Entidades extraídas
     * @returns {object} Estrutura JSON sugerida
     */
    buildSuggestedStructure(ruleType, predictionType, entities) {
        const structure = {
            type: ruleType
        };

        if (ruleType === 'dynamic_prediction') {
            structure.predictionType = predictionType;
            structure.predictionAction = entities.contractAction;

            // Determinar targetValue baseado na ação
            if (entities.contractValue !== null) {
                structure.targetValue = entities.contractValue;
            } else if (entities.contractAction === 'par') {
                structure.targetValue = 'dynamic_parity_even';
            } else if (entities.contractAction === 'ímpar') {
                structure.targetValue = 'dynamic_parity_odd';
            }

            // Adicionar combinedRule se houver múltiplas condições
            if (entities.indicators.length > 0 || entities.allowedDigits) {
                structure.combinedRule = {};

                // Adicionar regra de dígitos permitidos
                if (entities.allowedDigits) {
                    structure.combinedRule.allowedDigitsRule = {
                        type: 'allowed_digits',
                        allowedDigits: entities.allowedDigits,
                        count: entities.count || 1,
                        predictionAction: entities.contractAction || null
                    };
                    if (!entities.contractAction) {
                        structure.combinedRule.allowedDigitsRule.explicitPrediction = false;
                    }
                }

                // Adicionar regra de RSI
                if (entities.indicators.includes('RSI')) {
                    const rsiOperator = entities.operators.find(op => op !== '=') || '>';
                    const rsiValue = entities.values.find(v => v >= 0 && v <= 100) || 50;

                    structure.combinedRule.rsiRule = {
                        type: 'rsi',
                        operator: rsiOperator,
                        value: rsiValue,
                        period: 14,
                        predictionAction: entities.contractAction || null
                    };
                    if (!entities.contractAction) {
                        structure.combinedRule.rsiRule.explicitPrediction = false;
                    }
                }

                // Adicionar regra de percentual
                if (entities.indicators.includes('PERCENTAGE')) {
                    const hasAllowedDigits = entities.allowedDigits && entities.allowedDigits.length > 0;

                    structure.combinedRule.percentageRule = {
                        type: 'percentage',
                        operator: entities.operators[entities.operators.length - 1] || '>',
                        targetPercentage: entities.values[entities.values.length - 1] || 50,
                        // Se tem lista de dígitos, conditionType é null (o motor usará allowedDigits automaticamente)
                        conditionType: hasAllowedDigits ? null : this._mapOperatorToConditionType(entities.operators[0]),
                        value: hasAllowedDigits ? null : (entities.values[0] || 5),
                        allowedDigits: entities.allowedDigits || null,
                        predictionAction: entities.contractAction || null
                    };
                    if (!entities.contractAction) {
                        structure.combinedRule.percentageRule.explicitPrediction = false;
                    }
                }
            }
        }

        return structure;
    }

    /**
     * Enriquecer prompt do Gemini com contexto pré-processado
     * @param {string} basePrompt - Prompt base original
     * @param {object} preprocessedData - Dados do pré-processamento
     * @returns {string} Prompt enriquecido
     */
    enrichPrompt(basePrompt, preprocessedData) {
        const { processedText, structure, validation } = preprocessedData;

        let enrichedPrompt = basePrompt;

        enrichedPrompt += `\n\n═══════════════════════════════════════════════════════════════════\n`;
        enrichedPrompt += `🔍 CONTEXTO PRÉ-PROCESSADO (use como guia prioritário):\n`;
        enrichedPrompt += `═══════════════════════════════════════════════════════════════════\n\n`;

        // Adicionar estrutura detectada
        enrichedPrompt += `📊 ESTRUTURA DETECTADA:\n`;
        enrichedPrompt += `- ${structure.totalGroups} grupo(s)\n`;
        enrichedPrompt += `- Lógica: ${structure.logic}\n\n`;

        // ⚠️ REGRA CRÍTICA DE AGRUPAMENTO
        if (structure.totalGroups > 1) {
            enrichedPrompt += `⚠️ REGRA DE ESTRUTURA (CRÍTICA):\n`;
            enrichedPrompt += `Você DETECTOU ${structure.totalGroups} GRUPOS DISTINTOS.\n`;
            enrichedPrompt += `O JSON DEVE TER EXATAMENTE ${structure.totalGroups} OBJETOS DENTRO DO ARRAY "groups".\n`;
            enrichedPrompt += `NÃO JUNTAR REGRAS DE LINHAS DIFERENTES NO MESMO GRUPO.\n`;
            enrichedPrompt += `CADA LINHA QUE COMEÇA COM "*" É UM GRUPO SEPARADO (id: 1, id: 2, ...).\n\n`;
        }

        // Adicionar avisos se houver
        if (validation.warnings.length > 0) {
            enrichedPrompt += `⚠️ AVISOS:\n`;
            validation.warnings.forEach(warning => {
                enrichedPrompt += `- ${warning.message}\n`;
            });
            enrichedPrompt += `\n`;
        }

        // Adicionar detalhes SIMPLIFICADOS de cada grupo (SEM sugerir estrutura JSON)
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

            enrichedPrompt += `\n---\n\n`;
        });

        return enrichedPrompt;
    }

    /**
     * Detectar palavras-chave para o PromptManager
     */
    detectKeywords(text) {
        const keywords = [];
        const lower = text.toLowerCase();

        // Mapa de busca simples (pode ser expandido)
        const checkList = [
            'rsi', 'sma', 'suporte', 'resistencia', 'resistência',
            'percentual', 'porcentagem', 'digitos', 'dígitos',
            'repetição', 'repetir', 'par', 'ímpar', 'impar',
            'preco', 'preço', 'tick', 'tique', 'subiu', 'desceu',
            'padrao', 'padrão', 'pattern', 'chance', 'precisão', 'accuracy'
        ];

        checkList.forEach(kw => {
            if (lower.includes(kw)) {
                keywords.push(kw);
            }
        });

        // Casos especiais compostos
        if (lower.includes('maior chance')) keywords.push('maior chance');
        if (lower.includes('menor chance')) keywords.push('menor chance');

        return [...new Set(keywords)];
    }

    /**
     * Mapear operador para tipo de condição de percentual
     */
    _mapOperatorToConditionType(operator) {
        switch (operator) {
            case '<': return 'below';
            case '>': return 'above';
            case '<=': return 'below_or_equal';
            case '>=': return 'above_or_equal';
            case '=': return 'equal';
            case '!=': return 'not_equal';
            default: return 'equal';
        }
    }
}

// Singleton para uso global
let strategyPreprocessorInstance = null;

function getStrategyPreprocessorInstance() {
    if (!strategyPreprocessorInstance) {
        strategyPreprocessorInstance = new StrategyPreprocessor();
    }
    return strategyPreprocessorInstance;
}

