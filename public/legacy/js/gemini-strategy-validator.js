/**
 * Validador pré-Gemini para identificar problemas em estratégias
 * antes de enviar para a IA, economizando créditos do usuário
 */
class GeminiStrategyValidator {
    constructor() {
        // Padrões problemáticos comuns que confundem o Gemini
        this.problematicPatterns = {
            // Regras muito vagas ou ambíguas
            vague: [
                /\b(às vezes|talvez|pode ser|mais ou menos|aproximadamente|por volta)\b/i,
                /\b(quando der|se der certo|se possível)\b/i,
                /\b(muitos?|poucos?|alguns?|vários)\s+(dígitos|ticks|vezes)\b/i
            ],

            // Valores fora dos limites conhecidos
            outOfRange: [
                /(\d{3,})\s+(dígitos|digitos)/i, // Mais de 99 dígitos
                /dígito[s]?\s+[=><!]+\s+(\d{2,})/i, // Dígito > 9
                /percentual.*?(\d{3,})%/i // Percentual > 100%
            ],

            // Contradições óbvias - NOTA: Regex apenas identifica padrões suspeitos,
            // a validação real de números é feita em _checkSpecificIssues
            contradictory: [
                /(maior|>)\s+(\d+).*?(menor|<)\s+(\d+)/i, // "maior que 5 e menor que 3"
                /(subiu|sobe).*?(desceu|desce)/i // "subiu e desceu" na mesma condição
            ],

            // Formatação problemática
            badFormat: [
                /\*\s*$/, // Asterisco sem regra após
                /^[^*].*?,[^*]/m, // Vírgula sem estar em grupo com *
                /(\*.*?){6,}/ // Mais de 5 grupos (limite do sistema)
            ],

            // Palavras que indicam incerteza
            uncertainty: [
                /\b(acho que|parece que|deve ser|provavelmente)\b/i,
                /\b(não tenho certeza|não sei|dúvida)\b/i
            ],

            // Operadores mal formatados
            badOperators: [
                /[<>]=?\s*[<>]/,  // Operadores duplicados: "><", "<<", etc
                /\b(maior|menor|igual)\s+(maior|menor|igual)\b/i, // "maior igual" em vez de ">="
            ],

            // Falta de especificação crítica
            missingSpecs: [
                /\bdígitos?\b(?!\s*(?:[<>=]|\(\d))/i, // "dígitos" sem operador ou lista (aceita =, <, >, ou =(digitos))
                /\bpercentual\b(?!.*?[<>=].*?\d+%)/i, // "percentual" sem valor
                /\brsi\b(?!\s*[(<>=])/i // "RSI" sem operador ou parênteses
            ]
        };

        // Sugestões para cada tipo de problema
        this.suggestions = {
            vague: "Use valores específicos em vez de termos vagos. Ex: 'últimos 5 dígitos' em vez de 'alguns dígitos'",
            outOfRange: "Verifique os valores: dígitos devem ser 0-9, contagem até 50, percentual até 100%",
            contradictory: "Há condições contraditórias na sua regra. Revise a lógica",
            badFormat: "Cada linha com * deve ter pelo menos uma regra. Use vírgula apenas dentro de grupos",
            uncertainty: "Remova termos de incerteza. A estratégia deve ser clara e definida",
            badOperators: "Use operadores corretos: >, <, =, >=, <=",
            missingSpecs: "Especifique operadores e valores para cada condição"
        };
    }

    /**
     * Valida uma estratégia antes de enviar para o Gemini
     * @param {string} strategyText - Texto da estratégia
     * @returns {Object} - { valid: boolean, issues: [], suggestions: [] }
     */
    validate(strategyText) {
      
        const issues = [];
        const suggestions = new Set();

        if (!strategyText || typeof strategyText !== 'string') {
            return {
                valid: false,
                issues: ['Estratégia vazia ou inválida'],
                suggestions: ['Escreva uma estratégia válida']
            };
        }

        const text = strategyText.trim();

        // 1. Verificar se está totalmente vazia
        if (text.length === 0) {
            return {
                valid: false,
                issues: ['Estratégia vazia'],
                suggestions: ['Escreva sua estratégia de trading']
            };
        }

        // 2. Verificar se é muito curta (provável que seja vaga)
        if (text.length < 10) {
            issues.push('Estratégia muito curta - pode estar incompleta');
            suggestions.add('Descreva sua estratégia com mais detalhes');
        }

        // 3. Verificar cada categoria de problemas
        for (const [category, patterns] of Object.entries(this.problematicPatterns)) {
            for (const pattern of patterns) {
                if (pattern.test(text)) {
                    // Verificação especial para contradições numéricas
                    if (category === 'contradictory' && pattern.source.includes('maior') && pattern.source.includes('menor')) {
                        const match = text.match(pattern);
                        if (match && match[2] && match[4]) {
                            const val1 = parseInt(match[2]);
                            const val2 = parseInt(match[4]);
                            // Só é contradição se maior valor > menor valor (ex: "> 5 e < 3")
                            if (val1 <= val2) continue; // Não é contradição
                        }
                    }

                    const issueText = this._getCategoryIssueText(category);
                    issues.push(issueText);
                    suggestions.add(this.suggestions[category]);
                }
            }
        }

        // 4. Verificações específicas adicionais
        this._checkSpecificIssues(text, issues, suggestions);

        // 5. Determinar se é válido (sem problemas críticos)
        const criticalIssues = issues.filter(issue =>
            issue.includes('contraditório') ||
            issue.includes('fora dos limites') ||
            issue.includes('vazia')
        );

        return {
            valid: criticalIssues.length === 0,
            issues: Array.from(issues),
            suggestions: Array.from(suggestions),
            warnings: issues.length > 0 ? issues : []
        };
    }

    /**
     * Obtém texto descritivo para cada categoria de problema
     */
    _getCategoryIssueText(category) {
        const texts = {
            vague: 'Encontrei termos vagos ou ambíguos',
            outOfRange: 'Valores fora dos limites permitidos',
            contradictory: 'Condições contraditórias detectadas',
            badFormat: 'Formatação incorreta (verifique uso de * e vírgulas)',
            uncertainty: 'Termos de incerteza encontrados',
            badOperators: 'Operadores mal formatados',
            missingSpecs: 'Faltam especificações importantes'
        };
        return texts[category] || 'Problema detectado';
    }

    /**
     * Verificações específicas adicionais
     */
    _checkSpecificIssues(text, issues, suggestions) {
        // Verificar número de grupos (linhas com *)
        const groups = text.split('\n').filter(line => line.trim().startsWith('*'));
        if (groups.length > 5) {
            issues.push('Máximo de 5 grupos permitidos (linhas com *)');
            suggestions.add('Reduza para no máximo 5 grupos diferentes');
        }

        // Verificar se há pelo menos um grupo ou regra
        if (groups.length === 0 && !text.includes('último') && !text.includes('digito') && !text.includes('rsi')) {
            issues.push('Nenhuma regra clara identificada');
            suggestions.add('Use * para definir grupos de regras ou descreva condições claras (ex: "últimos 3 dígitos > 5")');
        }

        // Verificar valores de dígitos
        const digitValueMatch = text.match(/dígito[s]?\s+[=><!]+\s+(\d+)/i);
        if (digitValueMatch) {
            const value = parseInt(digitValueMatch[1]);
            if (value > 9) {
                issues.push(`Valor de dígito ${value} é maior que 9`);
                suggestions.add('Dígitos devem estar entre 0 e 9');
            }
        }

        // Verificar contagem de dígitos
        const digitCountMatch = text.match(/(?:últimos?|primeiros?)\s+(\d+)\s+dígitos?/i);
        if (digitCountMatch) {
            const count = parseInt(digitCountMatch[1]);
            if (count > 50) {
                issues.push(`Contagem de ${count} dígitos excede o limite de 50`);
                suggestions.add('Use no máximo 50 dígitos');
            }
            if (count === 0) {
                issues.push('Contagem de dígitos não pode ser zero');
                suggestions.add('Use pelo menos 1 dígito');
            }
        }

        // Verificar percentuais
        const percentMatch = text.match(/(\d+)%/g);
        if (percentMatch) {
            for (const match of percentMatch) {
                const value = parseInt(match);
                if (value > 100) {
                    issues.push(`Percentual ${value}% excede 100%`);
                    suggestions.add('Percentuais devem estar entre 0% e 100%');
                }
            }
        }
    }

    /**
     * Gera sugestões de correção automática (quando possível)
     */
    suggestCorrections(strategyText, validationResult) {
        if (validationResult.valid && validationResult.issues.length === 0) {
            return null;
        }

        const corrections = [];
        let correctedText = strategyText;

        // Corrigir operadores mal formatados
        correctedText = correctedText
            .replace(/\bmaior ou igual\b/gi, '>=')
            .replace(/\bmenor ou igual\b/gi, '<=')
            .replace(/\bmaior que\b/gi, '>')
            .replace(/\bmenor que\b/gi, '<')
            .replace(/\bigual a\b/gi, '=');

        // Remover termos de incerteza
        correctedText = correctedText
            .replace(/\b(acho que|parece que|deve ser|provavelmente)\s+/gi, '')
            .replace(/\b(talvez|pode ser|mais ou menos)\s+/gi, '');

        if (correctedText !== strategyText) {
            corrections.push({
                type: 'automatic',
                description: 'Formatação de operadores melhorada',
                before: strategyText,
                after: correctedText
            });
        }

        return corrections.length > 0 ? {
            correctedText,
            corrections
        } : null;
    }
}

// Instância global
let geminiStrategyValidator = null;

function getGeminiStrategyValidatorInstance() {
    if (!geminiStrategyValidator) {
        geminiStrategyValidator = new GeminiStrategyValidator();
    }
    return geminiStrategyValidator;
}

// Tornar disponível globalmente
if (typeof window !== 'undefined') {
    window.GeminiStrategyValidator = GeminiStrategyValidator;
    window.getGeminiStrategyValidatorInstance = getGeminiStrategyValidatorInstance;
}
