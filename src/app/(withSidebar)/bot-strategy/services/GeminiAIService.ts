import { StrategyPreprocessor } from './StrategyPreprocessor';

export interface GeminiResponse {
    success: boolean;
    strategy?: any;
    error?: string;
    rawText?: string;
}

export class GeminiAIService {
    private apiKey: string;
    private baseUrl: string = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
    private preprocessor: StrategyPreprocessor;

    constructor() {
        // Use environment variable ideally, or fallback to the one found in legacy code for migration continuity
        // CAUTION: Exposing API keys in client-side code is risky. 
        // In a real production app, this should be proxied through a Next.js API route.
        this.apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || 'AIzaSyDO8QsMYHkItt2gP6FdpLCbayvzw9RkCZU'; 
        this.preprocessor = new StrategyPreprocessor();
    }

    async translateStrategy(strategyText: string, onProgress: (msg: string) => void): Promise<GeminiResponse> {
        if (!this.apiKey) {
            return { success: false, error: 'API Key não configurada' };
        }

        try {
            onProgress('Pré-processando estratégia...');
            const processed = await this.preprocessor.processStrategy(strategyText);
            const finalText = processed.processedText;

            onProgress('Enviando para o Gemini AI...');
            
            // Construct the prompt for the AI
            // We want the AI to return a JSON structure that our execution engine can understand.
            const systemPrompt = `
                Você é um especialista em estratégias de trading para opções binárias e índices de volatilidade.
                Sua tarefa é traduzir a descrição de uma estratégia em um objeto JSON estruturado.
                
                O JSON deve seguir este formato:
                {
                    "name": "Nome da Estratégia",
                    "description": "Breve descrição",
                    "conditions": [
                        {
                            "indicator": "RSI" | "SMA" | "PRICE" | "DIGIT",
                            "period": number (para indicadores),
                            "operator": ">" | "<" | ">=" | "<=" | "==" | "!=" | "CROSS_UP" | "CROSS_DOWN",
                            "value": number | "SMA" | "EMA",
                            "compare_period": number (opcional, se comparar com outra média)
                        }
                    ],
                    "action": "CALL" | "PUT" | "DIGITOVER" | "DIGITUNDER",
                    "money_management": {
                        "stake": number,
                        "stop_loss": number,
                        "take_profit": number
                    }
                }
                
                Se a estratégia for sobre dígitos (ex: "se o último dígito for par"), use "indicator": "DIGIT", "operator": "IS_EVEN" ou "IS_ODD".
                Se for "último dígito maior que 5", use "indicator": "DIGIT", "operator": ">", "value": 5.

                Responda APENAS com o JSON, sem markdown ou explicações adicionais.
            `;

            const response = await fetch(`${this.baseUrl}?key=${this.apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: `${systemPrompt}\n\nEstratégia do usuário:\n${finalText}`
                        }]
                    }]
                })
            });

            if (!response.ok) {
                throw new Error(`Erro na API do Gemini: ${response.statusText}`);
            }

            const data = await response.json();
            
            if (data.candidates && data.candidates[0] && data.candidates[0].content) {
                const rawContent = data.candidates[0].content.parts[0].text;
                // Clean markdown code blocks if present
                const cleanJson = rawContent.replace(/```json/g, '').replace(/```/g, '').trim();
                
                try {
                    const strategyObj = JSON.parse(cleanJson);
                    return { success: true, strategy: strategyObj, rawText: rawContent };
                } catch (e) {
                    console.error("Erro ao fazer parse do JSON:", e);
                    return { success: false, error: 'A IA não retornou um JSON válido.', rawText: rawContent };
                }
            } else {
                return { success: false, error: 'Sem resposta da IA' };
            }

        } catch (error: any) {
            console.error('Gemini Service Error:', error);
            return { success: false, error: error.message };
        }
    }
}
