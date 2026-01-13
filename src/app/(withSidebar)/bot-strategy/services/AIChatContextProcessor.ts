import { MarketDataService } from './MarketDataService';

interface QuestionAnalysis {
    dataType: 'digits' | 'prices' | 'indicators' | 'none';
    count: number;
    error: string | null;
    needsSystemContext: boolean;
}

export class AIChatContextProcessor {
    private keywords: {
        digits: string[];
        prices: string[];
        indicators: string[];
        system: string[];
    };
    private systemContext: string;
    private marketDataService: MarketDataService;

    constructor() {
        this.marketDataService = MarketDataService.getInstance();
        
        // Palavras-chave para detecção de tipo de dados
        this.keywords = {
            digits: ['dígito', 'digito', 'digit', 'último dígito', 'ultimo digito', 'sequência', 'sequencia'],
            prices: ['preço', 'preco', 'price', 'vela', 'candle', 'cotação', 'cotacao', 'valor'],
            indicators: ['rsi', 'média móvel', 'media movel', 'sma', 'tendência', 'tendencia', 'indicador'],
            system: ['json', 'regra', 'rule', 'criar', 'desenvolver', 'formato', 'como', 'ajuda', 'help', 'exemplo', 'example']
        };

        // Contexto do sistema (conhecimento sobre o app)
        this.systemContext = this._buildSystemKnowledge();
    }

    public buildPrompt(userMessage: string, marketContext: string, needsSystemContext: boolean = false): string {
        let fullPrompt = userMessage;

        if (needsSystemContext) {
            fullPrompt = `${this.systemContext}\n\n${userMessage}`;
        }

        if (marketContext && !marketContext.toLowerCase().includes('não disponível')) {
            fullPrompt += `\n\n--- Contexto do Mercado ---\n${marketContext}`;
        }

        return fullPrompt;
    }

    private _buildSystemKnowledge(): string {
        return `
=== CONHECIMENTO DO SISTEMA DERIVBOT ===

Você é um assistente especializado no DerivBot, um sistema de trading automatizado para a plataforma Deriv.

## FORMATO DE REGRAS JSON

As regras são criadas em formato JSON com a seguinte estrutura:

{
  "name": "Nome da Estratégia",
  "description": "Breve descrição",
  "conditions": [
    {
        "indicator": "RSI" | "SMA" | "PRICE" | "DIGIT",
        "period": number (para indicadores),
        "operator": ">" | "<" | ">=" | "<=" | "==" | "!=" | "CROSS_UP" | "CROSS_DOWN" | "IS_EVEN" | "IS_ODD",
        "value": number | "SMA" | "EMA",
        "compare_period": number (opcional, se comparar com outra média)
    }
  ],
  "action": "CALL" | "PUT" | "DIGITOVER" | "DIGITUNDER" | "DIGITMATCH" | "DIGITDIFF" | "DIGITEVEN" | "DIGITODD",
  "prediction": number (para DIGITOVER/UNDER/MATCH/DIFF),
  "money_management": {
    "stake": number,
    "stop_loss": number,
    "take_profit": number
  }
}

## EXEMPLOS DE CONDIÇÕES

1. **RSI**: "Se RSI(14) > 70"
   {"indicator": "RSI", "period": 14, "operator": ">", "value": 70}

2. **SMA**: "Se SMA(10) > SMA(20)"
   {"indicator": "SMA", "period": 10, "operator": ">", "value": "SMA", "compare_period": 20}

3. **Dígito**: "Se último dígito for par"
   {"indicator": "DIGIT", "operator": "IS_EVEN"}

4. **Preço**: "Se preço > 1000"
   {"indicator": "PRICE", "operator": ">", "value": 1000}

## FUNCIONALIDADES DO APP

- **Processamento de Regras**: Digite regras em português e o sistema converte para JSON
- **Indicadores**: Suporta RSI, SMA, Padrões de Dígitos
- **Gestão**: Martingale configurável, Stop Loss, Take Profit

SEMPRE forneça exemplos de JSON quando o usuário pedir ajuda para criar regras.
`;
    }

    /**
     * Analisa a pergunta do usuário e determina tipo de dados necessários
     */
    public analyzeQuestion(question: string): QuestionAnalysis {
        const lowerQuestion = question.toLowerCase();

        // Detectar perguntas sobre o sistema
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
        let dataType: 'digits' | 'prices' | 'indicators' | 'none' = 'none';

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
     */
    public getMarketData(dataType: string, count: number): string {
        try {
            const symbol = this.marketDataService.getActiveSymbol();
            if (!symbol) {
                return 'Nenhum ativo selecionado no momento. Peça ao usuário para selecionar um ativo.';
            }

            let context = '';

            switch (dataType) {
                case 'digits':
                    context = this._getDigitsContext(symbol, count);
                    break;

                case 'prices':
                    context = this._getPricesContext(symbol, count);
                    break;

                case 'indicators':
                    context = this._getIndicatorsContext(symbol, count);
                    break;

                default:
                    context = `Ativo atual: ${symbol}`;
            }

            return context;

        } catch (error) {
            console.error('❌ [AI CHAT] Erro ao obter dados de mercado:', error);
            return 'Erro ao obter dados de mercado.';
        }
    }

    private _getDigitsContext(symbol: string, count: number): string {
        const digits = this.marketDataService.getLastNDigits(symbol, count);

        if (!digits || digits.length === 0) {
            return 'Dados de dígitos não disponíveis ainda. Aguarde alguns ticks.';
        }

        return `Ativo: ${symbol}\nÚltimos ${digits.length} dígitos: [${digits.join(', ')}]`;
    }

    private _getPricesContext(symbol: string, count: number): string {
        const prices = this.marketDataService.getLastNPrices(symbol, count);

        if (!prices || prices.length === 0) {
            return 'Dados de preços não disponíveis ainda. Aguarde alguns ticks.';
        }

        const formattedPrices = prices.map(p => p.toFixed(4));
        return `Ativo: ${symbol}\nÚltimos ${prices.length} preços: [${formattedPrices.join(', ')}]`;
    }

    private _getIndicatorsContext(symbol: string, count: number): string {
        const prices = this.marketDataService.getLastNPrices(symbol, count);

        if (!prices || prices.length === 0) {
            return 'Dados não disponíveis para calcular indicadores.';
        }

        let context = `Ativo: ${symbol}\n`;
        context += `Últimos ${prices.length} preços disponíveis.\n`;

        // Calcular RSI se houver dados suficientes
        if (prices.length >= 14) {
            try {
                const rsiValue = this.calculateRSI(prices, 14);
                context += `RSI(14): ${rsiValue.toFixed(2)}\n`;
            } catch (error) {
                console.warn('Erro ao calcular RSI:', error);
            }
        }

        // Calcular SMA se houver dados suficientes
        if (prices.length >= 25) {
            const sma25 = this.calculateSMA(prices, 25);
            context += `SMA(25): ${sma25.toFixed(4)}\n`;
        }
        
        if (prices.length >= 100) {
             const sma100 = this.calculateSMA(prices, 100);
            context += `SMA(100): ${sma100.toFixed(4)}\n`;
        }

        // Preço atual
        const currentPrice = prices[prices.length - 1];
        context += `Preço atual: ${currentPrice.toFixed(4)}`;

        return context;
    }

    private calculateSMA(data: number[], period: number): number {
        if (data.length < period) return 0;
        const slice = data.slice(-period);
        const sum = slice.reduce((a, b) => a + b, 0);
        return sum / period;
    }

    private calculateRSI(data: number[], period: number): number {
        if (data.length < period + 1) return 50;
        
        let gains = 0;
        let losses = 0;

        for (let i = data.length - period; i < data.length; i++) {
            const diff = data[i] - data[i - 1];
            if (diff >= 0) gains += diff;
            else losses -= diff;
        }

        if (losses === 0) return 100;
        
        const rs = gains / losses;
        return 100 - (100 / (1 + rs));
    }
}
