
export class StrategyPreprocessor {
    private termGlossary: Record<string, string>;

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

            // Operadores (por extenso)
            'maior que': '>',
            'menor que': '<',
            'maior ou igual': '>=',
            'menor ou igual': '<=',
            'igual a': '=',
            'diferente de': '!=',

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
     * Processar estratégia completa
     */
    async processStrategy(strategyText: string, onProgress: (percent: number, message: string) => void = () => {}) {
        try {
            // Passo 1: Auto-correção
            onProgress(5, 'Corrigindo erros de digitação...');
            const corrected = this.autoCorrect(strategyText);
            
            // Passo 2: Normalização
            onProgress(10, 'Normalizando termos...');
            const normalized = this.normalizeTerms(corrected);
            
            // Retornamos o texto normalizado.
            // Em uma implementação completa, faríamos validação sintática e extração de entidades aqui.
            return {
                processedText: normalized,
                metadata: {
                    originalLength: strategyText.length,
                    processedLength: normalized.length,
                    corrections: corrected !== strategyText
                }
            };

        } catch (error) {
            console.error('❌ [PREPROCESSOR] Erro no processamento:', error);
            throw error;
        }
    }

    /**
     * Corrigir erros comuns de digitação
     */
    private autoCorrect(strategyText: string): string {
        let corrected = strategyText;

        // 0. Garantir que * sempre inicie uma nova linha (bullet points)
        corrected = corrected.replace(/([^\n])\s*\*/g, '$1\n*');

        // 1. Keywords para fuzzy match
        const keywords = [
            'over', 'under', 'match', 'differ', 'even', 'odd',
            'digito', 'digitos', 'dígito', 'dígitos',
            'percentual', 'porcentagem', 'percentage',
            'padrao', 'padrão', 'pattern',
            'suporte', 'resistencia', 'resistência',
            'preco', 'preço', 'tick', 'tique',
            'entrar', 'quando', 'rsi', 'sma'
        ];

        // 2. Tokenizar e corrigir palavras
        corrected = corrected.replace(/\b([a-zA-ZáàâãéèêíïóôõöúçñÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ]+)\b/g, (word) => {
            if (word.length < 3) return word;
            const lower = word.toLowerCase();
            if (keywords.includes(lower)) return word;

            const bestMatch = this._getBestMatch(lower, keywords);
            const threshold = lower.length <= 4 ? 1 : 2;

            if (bestMatch.distance <= threshold && bestMatch.word) {
                return bestMatch.word;
            }
            return word;
        });

        // 3. Ajustes de pontuação
        corrected = corrected.replace(/(over|under|match|differ)(\d+)/gi, '$1 $2');
        corrected = corrected.replace(/\s*(>=|<=|!=|>|<|=)\s*/g, ' $1 ');

        // 4. Limpeza final
        corrected = corrected.split('\n')
            .map(line => line.replace(/\s+/g, ' ').trim())
            .filter(line => line.length > 0)
            .join('\n');

        return corrected;
    }

    private normalizeTerms(text: string): string {
        let normalized = text.toLowerCase();
        for (const [term, replacement] of Object.entries(this.termGlossary)) {
            const regex = new RegExp(`\\b${term}\\b`, 'gi');
            normalized = normalized.replace(regex, replacement);
        }
        return normalized;
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
        const matrix = [];

        for (let i = 0; i <= b.length; i++) {
            matrix[i] = [i];
        }

        for (let j = 0; j <= a.length; j++) {
            matrix[0][j] = j;
        }

        for (let i = 1; i <= b.length; i++) {
            for (let j = 1; j <= a.length; j++) {
                if (b.charAt(i - 1) == a.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1)
                    );
                }
            }
        }
        return matrix[b.length][a.length];
    }
}
