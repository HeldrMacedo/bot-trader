// Processador de Contexto para Chat IA
// Analisa perguntas do usuário e obtém dados relevantes do mercado

class AIChatContextProcessor {
    constructor() {
        // Palavras-chave para detecção de tipo de dados
        this.keywords = {
            digits: ['dígito', 'digito', 'digit', 'último dígito', 'ultimo digito', 'sequência', 'sequencia'],
            prices: ['preço', 'preco', 'price', 'vela', 'candle', 'cotação', 'cotacao', 'valor'],
            indicators: ['rsi', 'média móvel', 'media movel', 'sma', 'tendência', 'tendencia', 'indicador'],
            system: ['json', 'regra', 'rule', 'criar', 'desenvolver', 'formato', 'como', 'ajuda', 'help', 'exemplo', 'example']
        };

        // 🎯 NOVO: Contexto do sistema (conhecimento sobre o app)
        this.systemContext = this._buildSystemKnowledge();
    }

    /**
     * Constrói base de conhecimento sobre o sistema
     * @private
     */
    _buildSystemKnowledge() {
        return `
=== CONHECIMENTO DO SISTEMA DERIVBOT ===

Você é um assistente especializado no DerivBot, um sistema de trading automatizado para a plataforma Deriv.

## FORMATO DE REGRAS JSON

As regras são criadas em formato JSON com a seguinte estrutura:

{
  "groups": [
    {
      "id": 1,
      "rules": [
        {
          "id": 1,
          "type": "tipo_da_regra",
          "description": "Descrição em português",
          "parameters": { /* parâmetros específicos */ }
        }
      ]
    }
  ]
}

## TIPOS DE REGRAS SUPORTADOS

1. **dynamic_prediction** - Previsões dinâmicas (over, under, match, differ)
   - Exemplo: "Entrar over 2 se últimos 3 dígitos = (0,1,2,7,8,9)"
   - Parâmetros: predictionAction, targetValue, predictionType, explicitPrediction

2. **last_digits** - Condições baseadas em últimos dígitos
   - Exemplo: "Se últimos 5 dígitos = (1,3,5,7,9)"
   - Parâmetros: count, allowedDigits, operator

3. **rsi** - Indicador RSI
   - Exemplo: "Se RSI(14) > 70"
   - Parâmetros: period, value, operator

4. **sma** - Média Móvel Simples
   - Exemplo: "Se SMA(10) > SMA(20)"
   - Parâmetros: period1, period2, operator

5. **sma_crossover** - Cruzamento de médias móveis
   - Exemplo: "Quando SMA(10) cruza acima de SMA(20)"
   - Parâmetros: period1, period2, direction

6. **digit_pattern** - Padrões de dígitos (X=repetido, O=diferente)
   - Exemplo: "Se padrão = XXOX"
   - Parâmetros: pattern

7. **percentage** - Percentual de ocorrência de dígitos
   - Exemplo: "Se dígito 7 aparece > 30% nos últimos 50"
   - Parâmetros: digit, percentage, operator, period

## EXEMPLO COMPLETO

Regra: "Entrar over 2 e under 7 se os ultimos 3 digitos =(0,1,2,7,8,9)"

JSON:
{
  "groups": [
    {
      "id": 1,
      "rules": [
        {
          "id": 1,
          "type": "dynamic_prediction",
          "description": "Entrar over 2 se os ultimos 3 digitos =(0,1,2,7,8,9)",
          "parameters": {
            "predictionAction": "over",
            "targetValue": 2,
            "predictionType": "conditional_value",
            "explicitPrediction": true,
            "count": 3,
            "allowedDigits": [0,1,2,7,8,9]
          }
        },
        {
          "id": 2,
          "type": "dynamic_prediction",
          "description": "Entrar under 7 se os ultimos 3 digitos =(0,1,2,7,8,9)",
          "parameters": {
            "predictionAction": "under",
            "targetValue": 7,
            "predictionType": "conditional_value",
            "explicitPrediction": true,
            "count": 3,
            "allowedDigits": [0,1,2,7,8,9]
          }
        }
      ]
    }
  ]
}

## FUNCIONALIDADES DO APP

- **Processamento de Regras**: Digite regras em português e o sistema converte para JSON
- **Múltiplas Previsões**: Pode executar vários contratos simultaneamente (ex: over 2 E under 7)
- **Indicadores**: Suporta RSI, SMA, padrões de dígitos, percentuais
- **Modo BOTH**: Executa contratos opostos automaticamente
- **Gale**: Sistema de martingale configurável
- **Simulação**: Testa estratégias sem risco antes de usar dinheiro real

## DICAS IMPORTANTES

1. Use "explicitPrediction: true" quando especificar valores como "over 2", "under 7"
2. Para múltiplas previsões no mesmo grupo, crie múltiplas regras dynamic_prediction
3. allowedDigits deve ser array de números: [0,1,2,7,8,9]
4. Operadores válidos: ">", "<", "=", ">=", "<=", "!="
5. predictionAction válidos: "over", "under", "match", "differ", "even", "odd"

SEMPRE forneça exemplos de JSON quando o usuário pedir ajuda para criar regras.
`;
    }

    /**
     * Analisa a pergunta do usuário e determina tipo de dados necessários
     * @param {string} question - Pergunta do usuário
     * @returns {Object} { dataType: string, count: number, error: string|null, needsSystemContext: boolean }
     */
    analyzeQuestion(question) {
        const lowerQuestion = question.toLowerCase();

        // 🎯 NOVO: Detectar perguntas sobre o sistema
        let needsSystemContext = false;
        for (const keyword of this.keywords.system) {
            if (lowerQuestion.includes(keyword)) {
                needsSystemContext = true;
                break;
            }
        }

        // Extrair quantidade solicitada (ex: "últimos 25", "last 50")
        const countMatch = lowerQuestion.match(/últimos?\s+(\d+)|last\s+(\d+)|(\d+)\s+últimos?|(\d+)\s+last/i);
        let count = 100; // Padrão

        if (countMatch) {
            const extractedCount = parseInt(countMatch[1] || countMatch[2] || countMatch[3] || countMatch[4]);

            // Validar limite máximo
            if (extractedCount > 100) {
                return {
                    dataType: 'none',
                    count: 0,
                    error: 'O período máximo é de 100 dados. Por favor, solicite até 100.',
                    needsSystemContext
                };
            }

            count = extractedCount;
        }

        // Detectar tipo de dados necessários
        let dataType = 'none';

        // Verificar dígitos
        for (const keyword of this.keywords.digits) {
            if (lowerQuestion.includes(keyword)) {
                dataType = 'digits';
                break;
            }
        }

        // Verificar preços (se não for dígitos)
        if (dataType === 'none') {
            for (const keyword of this.keywords.prices) {
                if (lowerQuestion.includes(keyword)) {
                    dataType = 'prices';
                    break;
                }
            }
        }

        // Verificar indicadores (se não for dígitos nem preços)
        if (dataType === 'none') {
            for (const keyword of this.keywords.indicators) {
                if (lowerQuestion.includes(keyword)) {
                    dataType = 'indicators';
                    break;
                }
            }
        }

        return {
            dataType,
            count,
            error: null,
            needsSystemContext
        };
    }

    /**
     * Obtém dados de mercado baseado no tipo e quantidade
     * @param {string} dataType - Tipo de dados ('digits', 'prices', 'indicators', 'none')
     * @param {number} count - Quantidade de dados
     * @returns {string} Contexto formatado para enviar ao Gemini
     */
    getMarketData(dataType, count) {
        try {
            const token = SessionManager.getLocalToken();
            if (!token) {
                return 'Dados de mercado não disponíveis (não autenticado).';
            }

            const marketData = getMarketDataInstance(token);
            if (!marketData) {
                return 'Dados de mercado não disponíveis no momento.';
            }

            const symbol = marketData.currentActiveSymbol || marketData.activeSymbol;
            if (!symbol) {
                return 'Nenhum ativo selecionado no momento.';
            }

            let context = '';

            switch (dataType) {
                case 'digits':
                    context = this._getDigitsContext(marketData, symbol, count);
                    break;

                case 'prices':
                    context = this._getPricesContext(marketData, symbol, count);
                    break;

                case 'indicators':
                    context = this._getIndicatorsContext(marketData, symbol, count);
                    break;

                default:
                    // Sem contexto específico
                    context = `Ativo atual: ${symbol}`;
            }

            return context;

        } catch (error) {
            console.error('❌ [AI CHAT] Erro ao obter dados de mercado:', error);
            return 'Erro ao obter dados de mercado.';
        }
    }

    /**
     * Obtém contexto de dígitos
     * @private
     */
    _getDigitsContext(marketData, symbol, count) {
        const digits = marketData.getLastNDigits(symbol, count);

        if (!digits || digits.length === 0) {
            return 'Dados de dígitos não disponíveis ainda. Aguarde alguns ticks.';
        }

        const validDigits = digits.filter(d => d !== null);

        return `Ativo: ${symbol}\nÚltimos ${validDigits.length} dígitos: [${validDigits.join(', ')}]`;
    }

    /**
     * Obtém contexto de preços
     * @private
     */
    _getPricesContext(marketData, symbol, count) {
        const prices = marketData.getLastNPrices(symbol, count);

        if (!prices || prices.length === 0) {
            return 'Dados de preços não disponíveis ainda. Aguarde alguns ticks.';
        }

        const formattedPrices = prices.map(p => p.toFixed(4));

        return `Ativo: ${symbol}\nÚltimos ${prices.length} preços: [${formattedPrices.join(', ')}]`;
    }

    /**
     * Obtém contexto de indicadores
     * @private
     */
    _getIndicatorsContext(marketData, symbol, count) {
        const prices = marketData.getLastNPrices(symbol, count);

        if (!prices || prices.length === 0) {
            return 'Dados não disponíveis para calcular indicadores.';
        }

        let context = `Ativo: ${symbol}\n`;
        context += `Últimos ${prices.length} preços disponíveis.\n`;

        // Calcular RSI se houver dados suficientes
        if (prices.length >= 14) {
            try {
                const rsiInstance = getRSIIndicatorInstance();
                const rsiValue = rsiInstance.calculateRSI(prices, 14);
                context += `RSI(14): ${rsiValue.toFixed(2)}\n`;
            } catch (error) {
                console.warn('Erro ao calcular RSI:', error);
            }
        }

        // Calcular SMA se houver dados suficientes
        if (prices.length >= 25) {
            const sma25 = prices.slice(-25).reduce((a, b) => a + b, 0) / 25;
            context += `SMA(25): ${sma25.toFixed(4)}\n`;
        }

        // Preço atual
        const currentPrice = prices[prices.length - 1];
        context += `Preço atual: ${currentPrice.toFixed(4)}`;

        return context;
    }

    /**
     * Monta prompt completo para enviar ao Gemini
     * @param {string} userMessage - Mensagem do usuário
     * @param {string} marketContext - Contexto de mercado
     * @param {boolean} needsSystemContext - Se precisa incluir contexto do sistema
     * @returns {string} Prompt completo
     */
    buildPrompt(userMessage, marketContext, needsSystemContext = false) {
        let fullPrompt = userMessage;

        // 🎯 SEMPRE incluir contexto do sistema quando detectado
        if (needsSystemContext) {
            fullPrompt = `${this.systemContext}\n\n${userMessage}`;
        }

        // Adicionar contexto de mercado se disponível
        if (marketContext && !marketContext.includes('não disponível')) {
            fullPrompt += `\n\n--- Contexto do Mercado ---\n${marketContext}`;
        }

        return fullPrompt;
    }
}

// Instância singleton
let aiChatContextProcessorInstance = null;

function getAIChatContextProcessor() {
    if (!aiChatContextProcessorInstance) {
        aiChatContextProcessorInstance = new AIChatContextProcessor();
    }
    return aiChatContextProcessorInstance;
}

// Exportar globalmente
window.AIChatContextProcessor = AIChatContextProcessor;
window.getAIChatContextProcessor = getAIChatContextProcessor;
