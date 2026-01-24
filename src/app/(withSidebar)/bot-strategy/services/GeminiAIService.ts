import { StrategyPreprocessor } from './StrategyPreprocessor';
import { GeminiStrategyValidator } from './GeminiStrategyValidator';
import { AIChatContextProcessor } from './AIChatContextProcessor';
import { StrategyGroupProcessor } from './StrategyGroupProcessor';
import { FormatGenerator } from './FormatGenerator';

export interface GeminiResponse {
    success: boolean;
    strategy?: any;
    suggestions?: any;
    error?: string;
    rawText?: string;
}

interface ModelVersion {
    id: string;
    name: string;
    description: string;
    maxTokens: number | null;
}

export class GeminiAIService {
    private preprocessor: StrategyPreprocessor;
    private validator: GeminiStrategyValidator;
    private contextProcessor: AIChatContextProcessor;
    private formatGenerator: FormatGenerator;
    private isProcessing: boolean = false;
    private cachedGeminiJson: any | null = null;

    private modelVersions: ModelVersion[] = [
        {
            id: 'gemini-2.5-flash',
            name: 'versão fl 2.5 flash',
            description: 'Gemini 2.5 Flash - Rápido, ideal para regras simples (Limite: 128k tokens)',
            maxTokens: 128000
        },
        {
            id: 'gemini-2.5-pro',
            name: 'versão pro 2.5 Pro',
            description: 'Gemini 2.5 Pro - Equilíbrio entre lógica e janela de contexto (Limite: 1M tokens)',
            maxTokens: 1000000
        },
        {
            id: 'gemini-3-pro-preview',
            name: 'versão 3 Pro',
            description: 'Gemini 3.0 Pro Preview - Máxima janela de contexto para regras gigantes',
            maxTokens: null
        },
        {
            id: 'gemini-2.0-flash-thinking-exp-01-21',
            name: 'versão 3 Pro thinking',
            description: 'Gemini 2.0 Thinking - Máxima lógica e contexto para estratégias complexas',
            maxTokens: null
        }
    ];

    constructor() {
        this.preprocessor = new StrategyPreprocessor();
        this.validator = new GeminiStrategyValidator();
        this.contextProcessor = new AIChatContextProcessor();
        this.formatGenerator = FormatGenerator.getInstance();
    }

    private buildModelFallbackOrder(startIndex: number): number[] {
        const total = this.modelVersions.length;
        if (total === 0) return [];
        const clampedStart = Math.max(0, Math.min(startIndex, total - 1));

        const order: number[] = [];
        for (let i = clampedStart; i < total; i++) order.push(i);
        for (let i = clampedStart - 1; i >= 0; i--) order.push(i);
        return Array.from(new Set(order));
    }

    async translateStrategy(strategyText: string, onProgress: (msg: string) => void, imageData?: { data: string, mimeType: string }): Promise<GeminiResponse> {
        if (this.isProcessing) {
            return { success: false, error: 'Outra solicitação já está em andamento.' };
        }

        this.isProcessing = true;
        
        try {
            const cached = this.getCachedTranslation(strategyText, imageData);
            if (cached) {
                onProgress('Usando tradução em cache...');
                this.setCachedGeminiJson(cached);
                return { success: true, strategy: cached, rawText: JSON.stringify(cached) };
            }

            // 1. Validação Prévia
            onProgress('Validando estratégia...');
            const validation = this.validator.validate(strategyText);
            
            // Se houver problemas críticos, avisar mas tentar prosseguir se não for vazio
            if (!validation.valid && validation.issues.some(i => i.includes('vazia'))) {
                return { success: false, error: validation.issues.join(', ') };
            }

            // 2. Pré-processamento
            onProgress('Pré-processando texto...');
            const processed = await this.preprocessor.processStrategy(strategyText, (p, m) => onProgress(m));
            const finalText = processed.processedText;

            // 3. Análise de Contexto e Dados de Mercado
            onProgress('Analisando contexto de mercado...');
            const analysis = this.contextProcessor.analyzeQuestion(finalText);
            let marketContext = '';
            
            if (analysis.dataType !== 'none') {
                marketContext = this.contextProcessor.getMarketData(analysis.dataType, analysis.count);
            }

            // 4. Construção do Prompt
            onProgress('Construindo prompt...');
            const basePrompt = this.buildPrompt(finalText, marketContext, analysis.needsSystemContext);
            let fullPrompt = basePrompt;
            try {
                if (typeof (this.preprocessor as any).enrichPrompt === 'function') {
                    fullPrompt = this.preprocessor.enrichPrompt(basePrompt, processed as any);
                }
            } catch {
                fullPrompt = basePrompt;
            }

            // 5. Seleção de Modelo
            const estimatedTokens = this.estimateTokenCount(fullPrompt);
            const totalGroups = processed.structure?.totalGroups || (finalText.match(/^\s*\*/gm) || []).length || 1;
            let startModelIndex = 0;

            if (totalGroups === 1) {
                startModelIndex = 0; // Flash (Modelo 1)
                onProgress('🎯 Estratégia Simples (1 Grupo) -> Iniciando com Modelo 1');
            } else if (totalGroups === 2) {
                startModelIndex = 1; // Pro (Modelo 2)
                onProgress('🎯 Estratégia Média (2 Grupos) -> Iniciando com Modelo 2');
            } else {
                startModelIndex = 2; // Avançado (Modelo 3)
                onProgress(`🎯 Estratégia Complexa (${totalGroups} Grupos) -> Iniciando direto com Modelo 3`);
            }
            
            // 6. Chamada à API com Fallback
            let lastError = 'Falha em todos os modelos';
            let response: GeminiResponse = { success: false, error: lastError };
            
            const modelOrder = this.buildModelFallbackOrder(startModelIndex);
            for (const i of modelOrder) {
                const model = this.modelVersions[i];

                // Verificar limite de tokens
                if (model.maxTokens && estimatedTokens > model.maxTokens) {
                    console.warn(`Prompt muito grande para ${model.name} (${estimatedTokens} > ${model.maxTokens}). Pulando...`);
                    continue;
                }

                onProgress(`Consultando IA (${model.name})...`);
                
                try {
                    response = await this.callGeminiAPI(model.id, fullPrompt, { temperature: 0.2, topK: 40, topP: 0.95, maxOutputTokens: 8192 }, imageData);
                    if (response.success) break;
                } catch (e: any) {
                    console.warn(`Falha no modelo ${model.name}:`, e.message);
                    lastError = `Erro no modelo ${model.name}: ${e.message}`;
                    // Pequeno delay antes de tentar o próximo para evitar rate limit em cascata
                    if (i !== modelOrder[modelOrder.length - 1]) {
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    }
                }
            }

            if (!response.success) {
                return { success: false, error: lastError };
            }

            if (response.strategy) {
                const formattedRules = this.formatGenerator.formatGeminiResponse(response.strategy);
                if (formattedRules) {
                    formattedRules._gemini_prompt = fullPrompt;
                    this.setCachedGeminiJson(formattedRules);
                    this.saveCachedTranslation(strategyText, formattedRules, imageData);
                }
                return { success: true, strategy: formattedRules, rawText: response.rawText };
            }

            return { success: false, error: 'Resposta da IA não contém JSON válido.', rawText: response.rawText };

        } catch (error: any) {
            console.error('Gemini Service Error:', error);
            return { success: false, error: error.message };
        } finally {
            this.isProcessing = false;
        }
    }

    async chatWithAI(userMessage: string, onProgress: (msg: string) => void = () => {}, imageData?: { data: string, mimeType: string }): Promise<GeminiResponse> {
        if (this.isProcessing) {
            return { success: false, error: 'Outra solicitação já está em andamento.' };
        }

        this.isProcessing = true;

        try {
            onProgress('Analisando pergunta...');
            let marketContext = '';
            let needsSystemContext = false;

            if (!imageData) {
                const analysis = this.contextProcessor.analyzeQuestion(userMessage);
                if (analysis.error) {
                    return { success: false, error: analysis.error };
                }
                needsSystemContext = analysis.needsSystemContext;
                if (analysis.dataType !== 'none') {
                    marketContext = this.contextProcessor.getMarketData(analysis.dataType, analysis.count);
                }
            }

            const chatPrompt = this.contextProcessor.buildPrompt(userMessage, marketContext, needsSystemContext);
            onProgress('Consultando IA...');

            const response = await this.callGeminiAPI(
                this.modelVersions[0].id,
                chatPrompt,
                { temperature: 0.7, topK: 40, topP: 0.95, maxOutputTokens: 1024 },
                imageData
            );

            if (!response.success) return response;
            return { success: true, rawText: response.rawText || '' };
        } catch (error: any) {
            return { success: false, error: error.message };
        } finally {
            this.isProcessing = false;
        }
    }

    async generateSuggestions(
        userConfig: {
            symbol: string;
            tradeType: string;
            prediction?: number;
            duration: number;
            durationUnit: string;
        },
        onProgress: (msg: string) => void = () => {}
    ): Promise<GeminiResponse> {
        if (this.isProcessing) {
            return { success: false, error: 'Outra solicitação já está em andamento.' };
        }

        this.isProcessing = true;

        try {
            onProgress('Coletando dados de mercado...');
            const historicalData = this.buildHistoricalData(userConfig.symbol, userConfig.tradeType);
            if (!historicalData) {
                return { success: false, error: 'Dados de mercado insuficientes. Aguarde alguns ticks e tente novamente.' };
            }

            onProgress('Construindo prompt de sugestões...');
            const prompt = this.buildSuggestionsPrompt(userConfig, historicalData);

            onProgress('Consultando IA...');
            const response = await this.callGeminiAPI(
                this.modelVersions[1].id,
                prompt,
                { temperature: 0.4, topK: 40, topP: 0.95, maxOutputTokens: 4096 }
            );

            if (!response.success) return response;

            const parsed = response.strategy;
            if (!parsed || !parsed.strategies || !Array.isArray(parsed.strategies)) {
                return { success: false, error: 'Resposta de sugestões inválida da IA.' , rawText: response.rawText };
            }

            return { success: true, suggestions: parsed, rawText: response.rawText };
        } catch (error: any) {
            return { success: false, error: error.message };
        } finally {
            this.isProcessing = false;
        }
    }

    private buildPrompt(userMessage: string, marketContext: string, needsSystemContext: boolean): string {
        // Use the robust system instruction from the original system (gemini-ai.js)
        // to ensure complex strategies like "dynamic_prediction" are handled correctly.

        // Parse the strategy text to identify groups and structure
        const parsedStrategy = StrategyGroupProcessor.parseStrategyText(userMessage);

        const systemContext = `
SISTEMA DE TRADUÇÃO E VALIDAÇÃO DE ESTRATÉGIAS DE TRADING

Você deve traduzir estratégias de trading escritas em linguagem natural para um formato estruturado JSON.
IMPORTANTE: Siga uma HIERARQUIA DE DECISÕES EM ETAPAS para processar cada regra com precisão.

═══════════════════════════════════════════════════════════════════
📋 ANÁLISE ESTRUTURAL DA ESTRATÉGIA RECEBIDA:
═══════════════════════════════════════════════════════════════════
A estratégia contém:
- ${parsedStrategy.totalGroups} grupo(s) total(is)
- ${parsedStrategy.totalRules} regra(s) distribuída(s) entre os grupos
- Cada linha que começa com "*" representa UM GRUPO distinto
- Regras dentro de um grupo são separadas por vírgulas e conectadas por lógica AND
- Grupos diferentes são conectados por lógica OR (qualquer grupo pode acionar o trade)

${parsedStrategy.groups.map((group, index) =>
  `- Grupo ${index + 1}: ${group.rules.length} regra(s) conectadas por AND: [${group.rules.join(', ')}]`
).join('\n')}

═══════════════════════════════════════════════════════════════════
📋 HIERARQUIA DE PROCESSAMENTO (SIGA ESSA ORDEM):
═══════════════════════════════════════════════════════════════════

🔹 ETAPA 1: ANÁLISE ESTRUTURAL
├─ Quantas linhas começam com "*"? → Cada linha = 1 GRUPO (JÁ IDENTIFICADO: ${parsedStrategy.totalGroups})
├─ Dentro de cada linha, regras separadas por vírgula = REGRAS DIFERENTES (AND)
│  └─ **DICA**: Se o usuário escreve "Ação, Condição", crie UMA regra para a Ação e OUTRA para a Condição no mesmo grupo.
└─ Grupos diferentes (linhas diferentes) = OR

---

🔹 ETAPA 2: ANÁLISE DE CONTRATOS (Ação e Previsão)
Esta etapa é CRÍTICA para determinar o tipo de regra e a ação a ser tomada ("dynamic_prediction").
├─ Identificar a **AÇÃO DO CONTRATO** ("predictionAction"): Palavras-chave como "Entrar over", "Entrar under", "Entrar match", "Entrar differ", "Entrar par", "Entrar ímpar".
├─ Identificar a **PREVISÃO** ("targetValue"):
│  ├─ Previsão Estática (Número): Um número imediatamente após a Ação (ex: "over 2", "match 5").
│  └─ Previsão Dinâmica (Token/Ação): O resultado da condição define a previsão (ex: "differ **do dígito que se repetir**", "under **do dígito =(4,7,9,3)**").
│
├─ A regra menciona 2+ contratos/previsões estáticas? (ex: "over 2 e under 7")
│  ├─ SIM → MODO BOTH (criar múltiplas regras dynamic_prediction)
│  └─ NÃO → Modo simples
└─ Qual(is) tipo(s) de contrato? (over/under/match/differ/par/ímpar/etc)

---

🆕 🔹 ETAPA 2.5: DEFINIÇÃO DE CAMPOS DINÂMICOS (predictionAction e targetValue)

⚠️ **CRÍTICO**: Se for detectada uma AÇÃO DE CONTRATO (ETAPA 2), a regra é **dynamic_prediction**.

1.  **Regra com Previsão Estática (Número Fixo):**
    * **REGRA DO NÚMERO IMEDIATO:** Verifique se há um NÚMERO (0-9) IMEDIATAMENTE após a ação do contrato.
    * **Exemplo:** "Entrar over 2 se..." -> "over" seguido de "2".
    * **AÇÃO:**
        * "type": "dynamic_prediction"
        * "targetValue": 2
        * "explicitPrediction": true  <-- OBRIGATÓRIO: Indica que o usuário escolheu o número.

2.  **Regra SEM Previsão Estática (Implícita):**
    * **Exemplo:** "Entrar over se..." -> "over" NÃO seguido de número.
    * **AÇÃO:**
        * "type": "dynamic_prediction"
        * "explicitPrediction": false <-- OBRIGATÓRIO: Indica que deve usar configuração global.
        * "targetValue": null (ou omitir)

3.  **Regra com Previsão Dinâmica (Token):**
    * **Exemplo:** "Entrar differ do dígito que se repetir".
        * "predictionAction": "differ"
        * "targetValue": "dynamic_repeated_digit"
        * "explicitPrediction": true

4.  **⚠️ NOVO: Regra de Padrão SEM Ação Explícita (USAR CONFIG GLOBAL):**
    * **CRÍTICO:** Se a regra menciona "padrão" MAS NÃO especifica ação (over/under/match/differ)
    * **Exemplo:** "Entrar quando padrão xox" → NÃO tem "over", "under", "match", ou "differ"
    * **AÇÃO:**
        * "type": "dynamic_prediction"
        * "predictionType": "conditional_pattern"
        * "explicitPrediction": false ← Sistema usará contrato/previsão da configuração
        * "predictionAction": null (ou omitir)
        * "targetValue": null (ou omitir)
        * "combinedRule": { "patternRule": { "type": "digit_pattern", "pattern": "xox", "pattern_type": "loser_winner" } }
    * **INTERPRETAÇÃO DO PADRÃO:**
        * X = Dígito perdedor do contrato configurado
        * O = Dígito vencedor do contrato configurado
        * **Exemplo 1:** Config "Over 5" → padrão "xox" = perdedor(≤5), vencedor(>5), perdedor(≤5)
        * **Exemplo 2:** Config "Even" → padrão "xox" = ímpar(x), par(o), ímpar(x)
    * **PRIORIDADE:**
        * Se regra especifica ação: "Entrar match quando padrão xox" → Usa "match" (explicitPrediction: true)
        * Se regra NÃO especifica: "Entrar quando padrão xox" → Usa config global (explicitPrediction: false)

5.  **Regra de Condição Pura (Sem Ação Explícita):**
    * **Exemplo:** "Entrar quando os ultimos 3 digitos < 3".
    * "type": Virá da análise de condição (ETAPA 4).
    * **NÃO** usar "predictionAction".

⚠️ **ATENÇÃO ESPECIAL PARA PERCENTUAIS:**
- "Entrar over quando percentual dos dígitos < 4 > 80%" → **NÃO** é dynamic_prediction!
  - Não há número específico após "over" (ex: "over 2")
  - É uma CONDIÇÃO PURA → "type": "percentage"
- "Entrar over 2 quando percentual dos dígitos < 4 > 80%" → **SIM** é dynamic_prediction!
  - Há número específico "over 2" → "type": "dynamic_prediction", "targetValue": 2, "explicitPrediction": true

---

🔹 ETAPA 3: ANÁLISE DE ESTRUTURA E TIPO DE CONDIÇÃO

* **SE** é "dynamic_prediction" (ETAPA 2.5):
* **PredictionType NÃO é escolhido agora!** → Vá para ETAPA 4 para determinar "predictionType" e a estrutura de condição.
* **SE** **NÃO** é "dynamic_prediction" (Condição Pura):
* "type" depende da condição (ETAPA 4).

---

🔹 ETAPA 4: ANÁLISE DE CONDIÇÃO (tipo de análise)
⚠️ CRÍTICO: Esta etapa determina o predictionType E a estrutura!

📊 DETECTAR PALAVRAS-CHAVE NA CONDIÇÃO:

🔍 A condição contém "PERCENTUAL" ou "PORCENTAGEM"?
├─ ✅ SIM → predictionType: "conditional_percentage"
│  └─ Estrutura: combinedRule.percentageRule = { type: "percentage", ... }
│  └─ NÃO use "condition", use "combinedRule"!
│
├─ 🔍 A condição contém "PRECISÃO"?
├─ ✅ SIM → predictionType: "conditional_probability_accuracy"
│  └─ Estrutura: combinedRule.probabilityAccuracyRule = { type: "probability_accuracy", operator: ">=", value: 60 }
│  └─ NÃO use "condition", use "combinedRule"!
│
├─ ❌ NÃO → Verificar outras palavras-chave:
│  ├─ Contém "RSI" ou "índice de força"? → predictionType: "conditional_rsi"
│  │  └─ Estrutura: combinedRule.rsiRule = { ... }
│  │
│  ├─ Contém "SMA" ou "média móvel"? → predictionType: "conditional_sma"
│  │  └─ Estrutura: combinedRule.smaRule = { ... }
│  │
│  ├─ Contém "padrão" ou "pattern"? → predictionType: "conditional_pattern"
│  │  └─ Estrutura: combinedRule.patternRule = { ... }
│  │
│  └─ Contém "últimos X dígitos" ou "dígito =(X,Y,Z)"? → predictionType: "conditional_value"
└─ Estrutura: condition/allowedDigits + count

📋 REGRAS DE ESTRUTURA:

⚠️ SE a condição usa PERCENTUAL/RSI/SMA/PATTERN:
└─ SEMPRE use "combinedRule.<tipoRule>"
└─ NUNCA use "condition" ou "count" (exceto se a regra de padrão ou repetição o exigir).

⚠️ SE a condição usa CONTAGEM DE DÍGITOS (Valor, Repetição, Paridade ou Lista de Dígitos):
└─ Use "condition" ou "allowedDigits" + "count"
└─ predictionType: "conditional_value"

---

🔹 ETAPA 5: EXTRAÇÃO DE PARÂMETROS EDITÁVEIS (OBRIGATÓRIO)

Identifique TODOS os valores numéricos ou opções que o usuário pode querer ajustar e retorne-os em um array "parameters" na raiz do JSON.
Isso permitirá que o usuário edite esses valores na interface sem precisar chamar a IA novamente.

Estrutura de cada parâmetro:
{
  "key": "unique_id_for_parameter", // ID único (ex: "p1", "p2", "contract_val")
  "label": "Nome Amigável", // Nome curto para o label do input
  "value": valor_extraido, // O valor numérico ou string extraído da regra
  "type": "number", // Tipo do input (geralmente "number")
  "path": "caminho.para.o.valor" // (Opcional) Caminho para atualizar no JSON, se souber. Se não, o sistema tentará inferir.
}

EXEMPLO DE EXTRAÇÃO:
Regra: "Entrar Over 2 quando os ultimos 4 digitos >= 6"

"parameters": [
  { "key": "param_contract_val", "label": "Valor Over", "value": 2, "type": "number" },
  { "key": "param_last_digits_count", "label": "Qtd. Últimos Dígitos", "value": 4, "type": "number" },
  { "key": "param_threshold", "label": "Dígito Referência", "value": 6, "type": "number" }
]

⚠️ IMPORTANTE:
- Extraia TODOS os números significativos.
- Crie labels curtos e claros em Português.
- Se houver múltiplas regras, prefixe as keys para evitar colisão (ex: "r1_val", "r2_val").
- **CRÍTICO**: Ao criar um parâmetro, ADICIONE o campo "parameter_key" no objeto da regra onde esse valor é usado.
  Exemplo: { "type": "...", "value": 2, "parameter_key": "param_contract_val" }

⚠️ CASO ESPECIAL - PADRÕES DE DÍGITOS:
Quando uma regra usa "digit_pattern" type OU "conditional_pattern" (dentro de combinedRule), SEMPRE extraia o padrão como um parâmetro editável de TEXTO:

EXEMPLO DE PADRÃO:
Regra: "Entrar quando o padrão dos digitos for XXOX"

"parameters": [
  { 
    "key": "param_pattern_g1r1", 
    "label": "Padrão (G1R1)", 
    "value": "XXOX", 
    "type": "text",
    "validation": "pattern",
    "path": "groups[0].rules[0].parameters.combinedRule.patternRule.pattern" 
  }
]

CRÍTICO PARA PADRÕES:
- "type" DEVE ser "text" (não "number")
- "validation" DEVE ser "pattern" (para validação X/O)
- "value" é a string do padrão (ex: "XXOX", "OOOOXXO")
- "path" deve apontar para onde o padrão está (seja na raiz ou dentro de combinedRule.patternRule)
- Adicione "parameter_key" no objeto onde está o padrão: 
  { "patternRule": { "pattern": "XXOX", "parameter_key": "param_pattern_g1r1", ... } }

⚠️ CASO ESPECIAL - PRECISÃO DA PROBABILIDADE:
Quando uma regra usa "probability_accuracy" type OU "conditional_probability_accuracy" (dentro de combinedRule), SEMPRE extraia a precisão como um parâmetro editável de NÚMERO:

EXEMPLO DE PRECISÃO:
Regra: "Entrar differ do digito menor chance, precisão >= 60%"

"parameters": [
  { 
    "key": "param_accuracy_threshold", 
    "label": "Limite Precisão (G1R1)", 
    "value": 60, 
    "type": "number",
    "path": "groups[0].rules[0].parameters.combinedRule.probabilityAccuracyRule.value" 
  }
]

CRÍTICO PARA PRECISÃO:
- "value" DEVE ser o número sem o símbolo % (ex: 60)
- Adicione "parameter_key" no objeto onde está a precisão: 
  { "probabilityAccuracyRule": { "value": 60, "parameter_key": "param_accuracy_threshold", ... } }

═══════════════════════════════════════════════════════════════════
🎯 PROCESSAMENTO HIERÁRQUICO DE REGRAS HÍBRIDAS:
═══════════════════════════════════════════════════════════════════

Para regras que combinam AÇÃO DINÂMICA + CONDIÇÃO COMPLEXA:

EXEMPLO 1: "Entrar differ do digito que se repetir 3 vezes"

DECISÃO HIERÁRQUICA:
├─ ETAPA 2: Tem AÇÃO e PREVISÃO DINÂMICA? → SIM (differ, dynamic_repeated_digit)
│  └─ Então: type = "dynamic_prediction", predictionAction: "differ", targetValue: "dynamic_repeated_digit"
│
└─ ETAPA 4: Qual tipo de condição?
└─ "repetir 3 vezes" → Análise tipo PATTERN/Repetição
└─ predictionType = "conditional_pattern"
└─ Criar: combinedRule.patternRule com estrutura de repetição

ESTRUTURA FINAL DO EXEMPLO 1:
{
"type": "dynamic_prediction",
"predictionType": "conditional_pattern",
"predictionAction": "differ",
"targetValue": "dynamic_repeated_digit",
"combinedRule": {
"patternRule": {
"type": "digit_repetition",
"count": 3
}
},
"description": "Entrar differ do digito que se repetir 3 vezes"
}


EXEMPLO 2: "Entrar under do digito =(4,7,9,3)"

DECISÃO HIERÁRQUICA:
├─ ETAPA 2: Tem AÇÃO e PREVISÃO DINÂMICA? → SIM (under, dynamic_allowed_digit)
│  └─ Então: type = "dynamic_prediction", predictionAction: "under", targetValue: "dynamic_allowed_digit"
│
└─ ETAPA 4: Qual tipo de condição?
└─ "digito =(4,7,9,3)" → Análise tipo CONTAGEM/Lista de Dígitos
└─ predictionType = "conditional_value"
└─ Criar: allowedDigits + count (count = 1, se não especificado)

ESTRUTURA FINAL DO EXEMPLO 2:
{
"type": "dynamic_prediction",
"predictionType": "conditional_value",
"predictionAction": "under",
"targetValue": "dynamic_allowed_digit",
"count": 1,
"allowedDigits": [4, 7, 9, 3],
"description": "Entrar under do digito =(4,7,9,3)"
}

EXEMPLO 3: "Entrar differ do digito menor chance"

DECISÃO HIERÁRQUICA:
├─ ETAPA 2: Tem AÇÃO e PREVISÃO DINÂMICA? → SIM (differ, $LOWER_PROB)
│  └─ Então: type = "dynamic_prediction", predictionAction: "differ", targetValue: "$LOWER_PROB"
│
└─ ETAPA 4: Qual tipo de condição?
└─ "menor chance" → Análise tipo PROBABILIDADE
└─ predictionType = "last_digit_probability_match"
└─ Criar: condition = { "probabilityVariable": "$LOWER_PROB" }

ESTRUTURA FINAL DO EXEMPLO 3:
{
"type": "dynamic_prediction",
"predictionType": "last_digit_probability_match",
"predictionAction": "differ",
"targetValue": "$LOWER_PROB",
"condition": {
  "probabilityVariable": "$LOWER_PROB"
},
"description": "Entrar differ do digito menor chance"
}


═══════════════════════════════════════════════════════════════════

⚠️ IMPORTANTE: CAMPO predictionAction (REFORÇADO):
══════════════════════════════════════════════════════════════════
Para regras "dynamic_prediction" onde "targetValue" pode ser um **TOKEN DINÂMICO** (como "dynamic_repeated_digit", "dynamic_highest_percentage_digit", etc.), você DEVE incluir um campo adicional "**predictionAction**" que armazena a AÇÃO DO CONTRATO.

📋 QUANDO USAR predictionAction:
- Sempre que a regra começar com AÇÃO DE CONTRATO (differ, match, over, under, even, odd).
- Quando "targetValue" é um string dinâmico OU um número estático de contrato.
- Para garantir que o sistema saiba qual ação executar.

🔹 predictionAction → Ação do contrato (differ, match, over, under, even, odd)
🔹 targetValue → Operando (número 0-9 OU token dinâmico)

═══════════════════════════════════════════════════════════════════

DEFINIÇÕES IMPORTANTES - DÍGITOS x E o (PERDA E GANHO):
⚠️ CRÍTICO: "x" e "o" representam dígitos que fazem PERDER ou GANHAR baseado no contrato + previsão:
- "x" ou "X" = Dígitos que fazem PERDER
- "o" ou "O" = Dígitos que fazem GANHAR

Os valores de x e o mudam conforme o contrato e a previsão:
- **Over 4**: x=0,1,2,3,4 (perda) | o=5,6,7,8,9 (ganho)
- **Odd**: x=0,2,4,6,8 (perda) | o=1,3,5,7,9 (ganho)

⚠️ IMPORTANTE: Regras com x/o devem SEMPRE usar dynamic_prediction para especificar o contrato e previsão.

Exemplos de tradução CORRETA:
- "Entrar Over 4 quando 5 últimos dígitos = x" →
"type": "dynamic_prediction", "predictionAction": "over", "targetValue": 4, "predictionType": "conditional_value", "count": 5, "condition": { "type": "is_loser_digit" }

- "Entrar par quando os ultimos 2 digitos =(1,3,5,7,9)" →
"type": "dynamic_prediction", "predictionAction": "par", "targetValue": "par", "predictionType": "conditional_value", "count": 2, "allowedDigits": [1, 3, 5, 7, 9]

- "Entrar Odd quando último dígito = o" →
"type": "dynamic_prediction", "predictionAction": "odd", "targetValue": "odd", "predictionType": "conditional_value", "count": 1, "condition": { "type": "is_winner_digit" }

- "Match 3 quando padrão x-o-x" →
"type": "dynamic_prediction", "predictionAction": "match", "targetValue": 3, "predictionType": "conditional_pattern", "combinedRule": { "patternRule": { "pattern": "XOX", "pattern_type": "loser_winner" } }

REGRAS CRÍTICAS DE FORMATAÇÃO:
1. CADA linha iniciada com "*" define UM ÚNICO GRUPO
2. DENTRO de cada grupo (linha com *), condições separadas por vírgula são regras AND
3. GRUPOS DIFERENTES (linhas diferentes com *) são condições OR
4. NUNCAA criar mais grupos do que linhas com "*"
5. Máximo 5 grupos permitidos

VALIDAÇÃO OBRIGATÓRIA:
- Verificar se valores numéricos estão dentro dos limites (ex: dígitos 0-9, contagem 1-50)
- Identificar sintaxe incorreta ou ambígua
- NUNCA rejeite regras de dynamic_prediction baseado em "lógica aparente" - o usuário pode ter estratégias não-óbvias
- Aceite todas as combinações de targetValue e condições em dynamic_prediction (ex: "over 3 quando digito = 3" é VÁLIDO)
- Reconhecer "x" e "o" como dígitos perdedores e vencedores respectivamente

EXEMPLO DE ENTRADA:
* regra1, regra2, regra3
* regra4

DEVE GERAR EXATAMENTE:
- Grupo 1: contém regra1 AND regra2 AND regra3
- Grupo 2: contém regra4
- parameters: [ ...lista de parâmetros extraídos... ]

NUNCA criar mais grupos do que linhas com "*"!

`;

        return `${systemContext}\n\n${userMessage}\n\n--- Contexto de Mercado ---\n${marketContext}`;
    }

    private async callGeminiAPI(
        modelId: string,
        prompt: string,
        generationConfig: { temperature: number; topK: number; topP: number; maxOutputTokens: number },
        imageData?: { data: string, mimeType: string }
    ): Promise<GeminiResponse> {
        if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
            throw new Error('Prompt inválido ou vazio');
        }

        const parts: any[] = [{ text: prompt.trim() }];
        if (imageData) {
            parts.push({
                inlineData: {
                    mimeType: imageData.mimeType,
                    data: imageData.data
                }
            });
        }

        const response = await fetch('/api/gemini', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                modelId,
                contents: [{ parts }],
                generationConfig
            })
        });

        const data = await response.json().catch(() => null);
        if (!response.ok) {
            const message = data?.error?.message || data?.message || response.statusText;
            throw new Error(`Erro Gemini (${response.status}): ${message}`);
        }

        const rawText = this.extractTextFromGeminiResponse(data);
        if (!rawText) {
            return { success: false, error: 'Sem resposta válida da IA' };
        }

        const parsed = this.tryParseJsonFromText(rawText);
        if (parsed.ok) {
            return { success: true, strategy: parsed.value, rawText };
        }

        return { success: true, rawText, strategy: null };
    }

    private extractTextFromGeminiResponse(data: any): string | null {
        if (!data || typeof data !== 'object') return null;

        if (typeof data.text === 'string') return data.text;
        if (typeof data.message === 'string') return data.message;
        if (typeof data.response === 'string') return data.response;

        const candidate = data?.candidates?.[0];
        const partText = candidate?.content?.parts?.[0]?.text;
        if (typeof partText === 'string') return partText;

        const contentText = candidate?.content?.text;
        if (typeof contentText === 'string') return contentText;

        const candidateText = candidate?.text;
        if (typeof candidateText === 'string') return candidateText;

        return null;
    }

    private tryParseJsonFromText(rawText: string): { ok: true; value: any } | { ok: false } {
        const clean = rawText.replace(/```json/gi, '```').trim();
        const fenced = clean.match(/```[\s\S]*?```/);
        const unfenced = fenced ? fenced[0].replace(/```/g, '').trim() : clean;
        const jsonMatch = unfenced.match(/\{[\s\S]*\}/);
        const jsonStr = (jsonMatch ? jsonMatch[0] : unfenced).trim();

        try {
            return { ok: true, value: JSON.parse(jsonStr) };
        } catch {
            return { ok: false };
        }
    }

    private estimateTokenCount(text: string): number {
        if (!text) return 0;
        return Math.ceil((text.length / 4) * 1.1);
    }

    private generateStrategyHash(strategyText: string): string {
        const normalizedText = (strategyText || '')
            .toLowerCase()
            .replace(/\s+/g, ' ')
            .replace(/\n+/g, '\n')
            .trim();

        let hash = 0;
        for (let i = 0; i < normalizedText.length; i++) {
            const char = normalizedText.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(36);
    }

    private getCachedTranslation(strategyText: string, imageData?: { data: string, mimeType: string }): any | null {
        if (!strategyText || imageData) return null;
        try {
            const hash = this.generateStrategyHash(strategyText);
            const cacheKey = 'strategy_cache_global';
            const cacheData = typeof window !== 'undefined' ? localStorage.getItem(cacheKey) : null;
            if (!cacheData) return null;
            const cache = JSON.parse(cacheData);
            const entry = cache?.[hash];
            if (!entry?.translation) return null;

            const maxAge = 7 * 24 * 60 * 60 * 1000;
            const isExpired = (Date.now() - (entry.timestamp || 0)) > maxAge;
            if (isExpired) return null;
            if (!entry.translation.parameters) {
                delete cache[hash];
                localStorage.setItem(cacheKey, JSON.stringify(cache));
                return null;
            }
            return entry.translation;
        } catch {
            return null;
        }
    }

    private saveCachedTranslation(strategyText: string, translatedRules: any, imageData?: { data: string, mimeType: string }) {
        if (!strategyText || imageData) return;
        try {
            const hash = this.generateStrategyHash(strategyText);
            const cacheKey = 'strategy_cache_global';
            const existing = typeof window !== 'undefined' ? localStorage.getItem(cacheKey) : null;
            let cache: Record<string, any> = {};
            if (existing) {
                try {
                    cache = JSON.parse(existing) || {};
                } catch {
                    cache = {};
                }
            }

            cache[hash] = {
                originalText: strategyText,
                translation: translatedRules,
                timestamp: Date.now()
            };

            const entries = Object.entries(cache);
            if (entries.length > 20) {
                entries.sort((a: any, b: any) => (b[1]?.timestamp || 0) - (a[1]?.timestamp || 0));
                const next: Record<string, any> = {};
                entries.slice(0, 20).forEach(([k, v]) => { next[k] = v; });
                cache = next;
            }

            localStorage.setItem(cacheKey, JSON.stringify(cache));
        } catch {
        }
    }

    public setCachedGeminiJson(geminiJson: any): void {
        this.cachedGeminiJson = geminiJson;
    }

    public getCachedGeminiJson(): any | null {
        return this.cachedGeminiJson;
    }

    public clearCachedGeminiJson(): void {
        this.cachedGeminiJson = null;
    }

    public checkCachedTranslation(strategyText: string, imageData?: { data: string, mimeType: string }): any | null {
        return this.getCachedTranslation(strategyText, imageData);
    }

    private buildHistoricalData(symbol: string, tradeType: string): { type: 'digits' | 'prices'; analysis: any } | null {
        const marketContext = this.contextProcessor.getMarketData(tradeType.startsWith('DIGIT') ? 'digits' : 'prices', 100);
        if (!marketContext || marketContext.toLowerCase().includes('não disponível') || marketContext.toLowerCase().includes('aguarde')) {
            return null;
        }

        const isDigits = tradeType.startsWith('DIGIT');
        const extracted = isDigits
            ? marketContext.match(/\[(.*?)\]/)?.[1]?.split(',').map(s => parseInt(s.trim())).filter(n => Number.isFinite(n)) || []
            : marketContext.match(/\[(.*?)\]/)?.[1]?.split(',').map(s => parseFloat(s.trim())).filter(n => Number.isFinite(n)) || [];

        if (extracted.length < 30) return null;

        if (isDigits) {
            const digits = extracted as number[];
            const digitCounts: Record<string, number> = {};
            for (let i = 0; i < 10; i++) digitCounts[i.toString()] = 0;
            digits.forEach(d => { digitCounts[d.toString()] = (digitCounts[d.toString()] || 0) + 1; });
            const mostFrequent = Object.entries(digitCounts).sort((a, b) => b[1] - a[1])[0];
            const leastFrequent = Object.entries(digitCounts).sort((a, b) => a[1] - b[1])[0];
            const evenCount = digits.filter(d => d % 2 === 0).length;
            const oddCount = digits.length - evenCount;
            const lastDigits = digits.slice(-10);

            const sequences = this.calculateDigitSequences(digits);

            return {
                type: 'digits',
                analysis: {
                    totalCount: digits.length,
                    digitCounts,
                    mostFrequent: { digit: parseInt(mostFrequent[0]), count: mostFrequent[1] },
                    leastFrequent: { digit: parseInt(leastFrequent[0]), count: leastFrequent[1] },
                    evenPercentage: Math.round((evenCount / digits.length) * 100),
                    oddPercentage: Math.round((oddCount / digits.length) * 100),
                    lastDigits,
                    sequences
                }
            };
        }

        const prices = extracted as number[];
        const totalCount = prices.length;
        let upCount = 0;
        let downCount = 0;
        for (let i = 1; i < prices.length; i++) {
            if (prices[i] > prices[i - 1]) upCount++;
            else if (prices[i] < prices[i - 1]) downCount++;
        }
        const totalMoves = upCount + downCount;
        const upPercentage = totalMoves ? Math.round((upCount / totalMoves) * 100) : 0;
        const downPercentage = totalMoves ? Math.round((downCount / totalMoves) * 100) : 0;
        const lastPrices = prices.slice(-10);
        const currentPrice = prices[prices.length - 1];
        const support = Math.min(...prices.slice(-50));
        const resistance = Math.max(...prices.slice(-50));
        const priceRange = resistance - support;
        const sequences = this.calculatePriceSequences(prices);
        const volatility = this.calculateVolatility(prices);

        return {
            type: 'prices',
            analysis: {
                totalCount,
                upPercentage,
                downPercentage,
                currentPrice: currentPrice.toFixed(5),
                support: support.toFixed(5),
                resistance: resistance.toFixed(5),
                priceRange,
                volatility,
                sequences,
                lastPrices
            }
        };
    }

    private calculateDigitSequences(digits: number[]) {
        let above5 = 0;
        let below5 = 0;
        let currentAbove = 0;
        let currentBelow = 0;
        for (const d of digits) {
            if (d > 5) {
                currentAbove++;
                currentBelow = 0;
                above5 = Math.max(above5, currentAbove);
            } else {
                currentBelow++;
                currentAbove = 0;
                below5 = Math.max(below5, currentBelow);
            }
        }
        return { above5, below5 };
    }

    private calculatePriceSequences(prices: number[]) {
        let maxUpSequence = 0;
        let maxDownSequence = 0;
        let currentUp = 0;
        let currentDown = 0;
        for (let i = 1; i < prices.length; i++) {
            if (prices[i] > prices[i - 1]) {
                currentUp++;
                currentDown = 0;
                maxUpSequence = Math.max(maxUpSequence, currentUp);
            } else if (prices[i] < prices[i - 1]) {
                currentDown++;
                currentUp = 0;
                maxDownSequence = Math.max(maxDownSequence, currentDown);
            }
        }
        return { maxUpSequence, maxDownSequence };
    }

    private calculateVolatility(prices: number[]) {
        if (prices.length < 2) return 0;
        const returns: number[] = [];
        for (let i = 1; i < prices.length; i++) {
            const change = prices[i] - prices[i - 1];
            const pct = prices[i - 1] !== 0 ? change / prices[i - 1] : 0;
            returns.push(pct);
        }
        const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
        const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length;
        return Math.sqrt(variance);
    }

    private buildSuggestionsPrompt(
        userConfig: { symbol: string; tradeType: string; prediction?: number; duration: number; durationUnit: string },
        historicalData: { type: 'digits' | 'prices'; analysis: any }
    ): string {
        const durationDisplay = `${userConfig.duration}${userConfig.durationUnit}`;
        const isDigitContract = userConfig.tradeType.startsWith('DIGIT');
        const predictionBarrier = isDigitContract && ['DIGITODD', 'DIGITEVEN'].includes(userConfig.tradeType)
            ? null
            : isDigitContract
                ? { type: 'prediction', value: userConfig.prediction ?? 0 }
                : null;

        let configSection = `
===== CONFIGURAÇÃO COMPLETA DO USUÁRIO =====
- Ativo: ${userConfig.symbol}
- Tipo Trader: ${userConfig.tradeType}
- Duração: ${durationDisplay}`;

        if (predictionBarrier?.type === 'prediction') {
            configSection += `\n- Previsão do Dígito: ${predictionBarrier.value}`;
        }

        const dataSection = historicalData.type === 'digits'
            ? this.formatDigitAnalysisForPrompt(historicalData.analysis)
            : this.formatPriceAnalysisForPrompt(historicalData.analysis);

        return `
SISTEMA DE GERAÇÃO DE ESTRATÉGIAS DE TRADING - ${userConfig.symbol}

${configSection}

===== DADOS HISTÓRICOS (ÚLTIMOS ${historicalData.analysis.totalCount} ${historicalData.type === 'digits' ? 'DÍGITOS' : 'PREÇOS'}) =====
${dataSection}

==== VOCÊ É UM ALGORITMO DE GERAÇÃO DE ESTRATÉGIAS, ATUANDO COMO UM PROFISSIONAL EXPERT EM ANÁLISE QUANTITATIVA DE MERCADO. SUA TAREFA É: =====
Com base nos dados históricos fornecidos e na configuração do usuário, analise padrões estatísticos e de preço que possam POTENCIALIZAR GANHOS, e gere 3 estratégias coerentes e com base REALISTA E ESTATÍSTICA nos dados compartilhados.

LÓGICA DAS REGRAS (CRÍTICO):
* Cada linha que começa com asterisco (*) é um novo GRUPO. Os grupos são combinados com a lógica OU (OR).
* As regras dentro de um mesmo grupo (separadas por vírgula ",") são combinadas com a lógica E (AND).

DIRETRIZES DE RISCO E QUANTIDADE:
1. Conservadora (BAIXO RISCO/ALTA PRECISÃO): Crie 3 grupos, cada grupo 2-4 regras.
2. Moderada (MÉDIO RISCO/BALANCEADA): Crie 2 grupos, cada grupo 1-3 regras.
3. Agressiva (ALTO RISCO/ALTA FREQUÊNCIA): Crie 1 grupo com 1 regra simples.

FORMATO OBRIGATÓRIO DAS REGRAS:
Use APENAS a sintaxe EXATA abaixo. NÃO use linguagem natural descritiva!

${isDigitContract ? `
REGRAS PARA CONTRATOS DE DÍGITOS:
✅ * ultimos 3 digitos > 5
✅ * ultimos 4 digitos != 7
✅ * percentual dos digitos pares > 60%
✅ * percentual dos digitos abaixo de 5 > 50%
✅ * padrão dos dígitos XXXOX
` : `
REGRAS PARA CONTRATOS DE PREÇOS:
✅ * rsi > 70
✅ * rsi(14) < 30
✅ * sma(10) > sma(20)
✅ * ultimo tick > suporte
✅ * preco subiu 5 pontos
✅ * 3 ticks consecutivos subindo
`}

OPERADORES VÁLIDOS: >, <, >=, <=, =, !=

Responda APENAS com o JSON estruturado no formato exato abaixo (sem explicações adicionais):
{
  "strategies": [
    {
      "name": "Nome da Estratégia",
      "description": "Descrição da estratégia",
      "risk_level": "baixo|médio|alto",
      "rules_text": "* regra1, regra2\\n* regra3",
      "json_logic": { "groups": [], "parameters": [] }
    }
  ],
  "analysis_summary": "Resumo da análise"
}
`;
    }

    private formatDigitAnalysisForPrompt(analysis: any): string {
        return `
ANÁLISE DOS ÚLTIMOS ${analysis.totalCount} DÍGITOS:

Frequência por Dígito:
${Object.entries(analysis.digitCounts).map(([digit, count]: any) =>
            `- Dígito ${digit}: ${count} vezes (${Math.round((count / analysis.totalCount) * 100)}%)`
        ).join('\n')}

Padrões Identificados:
- Dígito mais frequente: ${analysis.mostFrequent.digit} (${analysis.mostFrequent.count} vezes - ${Math.round((analysis.mostFrequent.count / analysis.totalCount) * 100)}%)
- Dígito menos frequente: ${analysis.leastFrequent.digit} (${analysis.leastFrequent.count} vezes - ${Math.round((analysis.leastFrequent.count / analysis.totalCount) * 100)}%)
- Dígitos pares: ${analysis.evenPercentage}%
- Dígitos ímpares: ${analysis.oddPercentage}%

Últimos 10 dígitos: [${analysis.lastDigits.join(', ')}]

Sequências máximas identificadas:
- Dígitos acima de 5: ${analysis.sequences.above5} consecutivos
- Dígitos abaixo de 5: ${analysis.sequences.below5} consecutivos
`;
    }

    private formatPriceAnalysisForPrompt(analysis: any): string {
        return `
ANÁLISE DOS ÚLTIMOS ${analysis.totalCount} PREÇOS:

Movimentação:
- Movimentos para cima: ${analysis.upPercentage}%
- Movimentos para baixo: ${analysis.downPercentage}%

Níveis de Preço:
- Preço atual: ${analysis.currentPrice}
- Suporte: ${analysis.support}
- Resistência: ${analysis.resistance}
- Range de preços: ${analysis.priceRange.toFixed(5)}
- Volatilidade: ${(analysis.volatility * 100).toFixed(2)}%

Sequências máximas:
- Máxima sequência de alta: ${analysis.sequences.maxUpSequence} ticks
- Máxima sequência de baixa: ${analysis.sequences.maxDownSequence} ticks

Últimos 10 preços: [${analysis.lastPrices.map((p: number) => p.toFixed(5)).join(', ')}]
`;
    }
}
