// Integração com Gemini AI para traduzir estratégias
// O SISTEMA DEVE SER 100% ISOLADO POR USUARIO


class GeminiAI {
    constructor() {
        this.apiKey = null; // Será configurado via Secrets
        
        this.sessionId = JSON.parse(localStorage.getItem('deriv_accounts'))[0].selectedLoginId;

        // 🔒 CONTROLE DE CONCORRÊNCIA
        this.isProcessing = false;
        this.requestQueue = [];
        this.maxConcurrentRequests = 1;
        this.requestDelay = 1000; // 1 segundo entre requests

        // ✅ CORREÇÃO: Verificar se logConfig está disponível antes de usar
        this.ensureLogConfigAvailable();

        // 🔍 Validar integridade na inicialização
        //this.validateUserAccess();

        // ✅ CORREÇÃO: Sistema de fallback robusto com modelos Gemini - ORDEM OTIMIZADA
        this.modelVersions = [
            {
                name: 'versão fl 2.5 flash',
                url: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
                description: 'IA Strategy Flash - Rápido, ideal para regras simples (Limite: 128k tokens)',
                maxTokens: 128000 // Limite de 128k para o modelo Flash inicial
            },
            {
                name: 'versão pro 2.5 Pro',
                url: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent',
                description: 'IA Strategy Pro - Equilíbrio entre lógica e janela de contexto (Limite: 1M tokens)',
                maxTokens: 1000000 // Limite de 1M para a versão Pro intermediária
            },
            {
                name: 'versão 3 Pro',
                url: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-preview:generateContent',
                description: 'IA Strategy Ultra - Máxima janela de contexto para regras gigantes',
                maxTokens: null // Sem limite definido (suporta milhões de tokens)
            },
            {
                name: 'versão 3 Pro thinking', // ✅ Raciocínio Profundo
                url: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-thinking-exp-01-21:generateContent',
                description: 'IA Strategy Thinking - Máxima lógica e contexto para estratégias complexas',
                maxTokens: null // Sem limite definido
            }
        ];

        this.currentModelIndex = 0;
        this.baseUrl = this.modelVersions[this.currentModelIndex].url;

        this.loadApiKeyFromSecrets();
    }

    // 🔍 Gerar hash simples para detectar prompts duplicados
    generatePromptHash(prompt) {
        let hash = 0;
        for (let i = 0; i < prompt.length; i++) {
            const char = prompt.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash).toString(16);
    }

    // 📏 Estimar quantidade de tokens (aprox. 4 caracteres por token)
    estimateTokenCount(text) {
        if (!text) return 0;
        // Adicionando margem de segurança de 10%
        return Math.ceil((text.length / 4) * 1.1);
    }

    // ✅ NOVO: Garantir que logConfig está disponível
    ensureLogConfigAvailable() {
        if (typeof window !== 'undefined' &&
            (!window.logConfig || typeof window.logConfig.shouldLog !== 'function')) {

            // Criar logConfig local se não existir
            if (!window.logConfig) {
                window.logConfig = {};
            }

            // Adicionar funções que estão faltando
            if (typeof window.logConfig.shouldLog !== 'function') {
                window.logConfig.shouldLog = (context, frequency = 1.0) => {
                    return Math.random() <= frequency;
                };
            }

            if (typeof window.logConfig.warn !== 'function') {
                window.logConfig.warn = (context, message) => {
                };
            }

            if (typeof window.logConfig.info !== 'function') {
                window.logConfig.info = (context, message) => {
                };
            }

            if (typeof window.logConfig.error !== 'function') {
                window.logConfig.error = (context, message) => {
                    console.error(`❌ [${context}] ${message}`);
                };
            }

            if (typeof window.logConfig.debug !== 'function') {
                window.logConfig.debug = (context, message) => {

                };
            }
        }
    }
    // Carregar API Key dos Secrets do Replit (Redirecionado para Proxy)
    async loadApiKeyFromSecrets() {
        try {
            // 🛡️ NOVO: Chaves agora são gerenciadas 100% no servidor via Proxy
            this.apiKey = 'SERVER_MANAGED';
        } catch (error) {
            console.error('❌ Erro ao carregar segredos:', error);
        }
    }

    // Configurar API Key manualmente (fallback)
    setApiKey(apiKey) {
        this.apiKey = apiKey;
    }

    /**
     * Realiza o débito manual de crédito no servidor (usado após confirmação do usuário)
     */
    async manualDebit(reason = 'Tradução de Estratégia') {
        try {
            const loginId = SessionManager.getUserSessionId()?.split('_')[0];
            if (!loginId) throw new Error('Usuário não logado');

            const response = await fetch('/api/ai/debit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    loginId,
                    reason,
                    token: SessionManager.getLocalToken() // ✅ NOVO: Enviar token para validação segura de admin
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Erro ao debitar crédito');
            }

            const data = await response.json();
          
            // Atualizar UI de créditos se disponível
            if (typeof CreditsManager !== 'undefined' && CreditsManager.refreshCredits) {
                CreditsManager.refreshCredits();
            }

            return true;
        } catch (error) {
            console.error('❌ Erro no débito manual:', error);
            throw error;
        }
    }

    async translateStrategy(strategyText, onProgress = () => { }, isAlreadyPaid = false) {
        // 🔒 VERIFICAR SE JÁ ESTÁ PROCESSANDO
        if (this.isProcessing) {
            throw new Error('Outra tradução já está em andamento. Aguarde a conclusão.');
        }

        if (!this.apiKey) {
            throw new Error("API Key da IA não configurada");
        }
        // 🔒 MARCAR COMO PROCESSANDO
        this.isProcessing = true;

        // 💰 VERIFICAÇÃO DE CRÉDITOS (UX - Fail Fast)
        // Se já foi pago (manualDebit), ignoramos esta verificação interna.
        // if (!isAlreadyPaid && typeof CreditsManager !== 'undefined') {
        //     const currentCredits = await CreditsManager.getCurrentCredits();
        //     const cost = CreditsManager.CREDIT_COSTS.GEMINI_TRANSLATION || 1;

        //     if (currentCredits < cost) {
        //         this.isProcessing = false;
        //         const msg = `Saldo insuficiente (${currentCredits}). Necessário: ${cost} crédito(s).`;
        //         throw new Error(msg);
        //     }
        // }

        // 🔒 MARCAR COMO PROCESSANDO
        this.isProcessing = true;

        // 📋 Helper para adicionar logs ao modal (definir ANTES do try)
        // const addLog = (message, level = 'info') => {
        //     try {
        //         const animation = window.geminiTranslationAnimation || (typeof getGeminiTranslationAnimation === 'function' ? getGeminiTranslationAnimation() : null);
        //         if (animation && typeof animation.addLog === 'function') {
        //             animation.addLog(message, level);
        //         }
        //     } catch (e) {
        //         // Silenciosamente ignorar erros de log para não quebrar a tradução

        //     }
        // };

        try {
           
            // addLog('🔍 Iniciando tradução da estratégia...', 'info');
          
            // ✅ CORREÇÃO: Validação ignorada pois a chave é gerenciada pelo servidor
            if (this.apiKey !== 'SERVER_MANAGED' && !this.apiKey.startsWith('AIza')) {
                throw new Error("API Key da IA inválida");
            }

            // addLog(`✅ API Key validada`, 'success');
            // addLog(`📡 Modelo: ${this.getCurrentVersion().name}`, 'info');

            // ⚡ OTIMIZAÇÃO: Tentar match com Templates Locais (Sem Gasto de Tokens)
            try {
                // Tenta pegar do escopo global ou da função factory
                let promptManager = null;
                if (typeof getPromptManagerInstance === 'function') {
                    promptManager = getPromptManagerInstance();
                } else if (typeof PromptManager !== 'undefined') {
                    promptManager = new PromptManager();
                } else if (window.PromptManager) {
                    promptManager = new window.PromptManager();
                }

                if (promptManager) {
                    // addLog('⚡ Verificando templates locais...', 'info');

                    const localMatch = promptManager.matchStrategy(strategyText);

                    if (localMatch) {
                        // addLog('🚀 Estratégia reconhecida! Usando template local.', 'success');
                        // addLog('⚡ Gerando JSON instantaneamente...', 'success');

                        // Pequeno delay para garantir que a UI atualize
                        await new Promise(r => setTimeout(r, 800));

                        // ⚡ CORREÇÃO: Formatar estrutura igual à da IA
                        // Isso garante IDs únicos e normalização de timestamps
                        const formattedLocal = this.formatGeminiResponse(localMatch);

                        this.isProcessing = false;
                        // onProgress(100, 'Tradução (Local) concluída!');
                        return formattedLocal;
                    }
                } else {
                    console.error("[GEMINI DEBUG] PromptManager NÃO encontrado!");
                    // addLog('⚠️ PromptManager indisponível.', 'warning');
                }

                if (!promptManager.matchStrategy(strategyText)) {
                    console.log("Regra não reconhecida localmente. Enviando para IA...'");
                    // addLog('⚠️ Regra não reconhecida localmente. Enviando para IA...', 'warning');
                }

            } catch (e) {
                console.error("[GEMINI DEBUG] Erro FATAL no match local:", e);
                console.error("[GEMINI DEBUG] Stack:", e.stack);
                // addLog(`⚠️ Erro na verificação local: ${e.message}. Seguindo para IA...`, 'warning');
            }

            // ✨ NOVO: Pré-processamento da estratégia
            const preprocessor = getStrategyPreprocessorInstance();

            // Processar estratégia
            // onProgress(10, 'Pré-processando estratégia...');
            // addLog('🔧 Pré-processando texto da estratégia...', 'info');

            const preprocessedData = await preprocessor.processStrategy(strategyText, (percent, message) => {
                // Não chamar onProgress aqui para evitar conflito
                // addLog(message, 'info');
            });

            // addLog(`📊 ${preprocessedData.structure.totalGroups} grupo(s) identificado(s)`, 'info');
            
            // ✨ Mostrar regras pré-processadas no modal
            if (typeof getGeminiTranslationAnimation === 'function') {
                const animation = getGeminiTranslationAnimation();
                if (animation && typeof animation.showPreprocessedRules === 'function') {
                    animation.showPreprocessedRules(preprocessedData);
                }
            }
            
            // 🔍 Construir prompt
            // onProgress(20, 'Construindo prompt para IA...');
            // addLog('📝 Construindo prompt estruturado...', 'info');

            const basePrompt = this.buildPrompt(strategyText);
            const enrichedPrompt = preprocessor.enrichPrompt(basePrompt, preprocessedData);

            const estimatedTokens = this.estimateTokenCount(enrichedPrompt);
            // addLog(`📏 Tamanho do prompt: ${enrichedPrompt.length} caracteres (~${estimatedTokens} tokens)`, 'info');

            // 🎯 OTIMIZAÇÃO: Seleção inteligente baseada na quantidade de GRUPOS
            const totalGroups = preprocessedData.structure?.totalGroups || 1;
            let startModelIndex = 0;

            if (totalGroups === 1) {
                startModelIndex = 0; // Flash (Modelo 1)
                // addLog('🎯 Estratégia Simples (1 Grupo) -> Iniciando com Modelo 1', 'info');
            } else if (totalGroups === 2) {
                startModelIndex = 1; // Pro (Modelo 2)
                // addLog('🎯 Estratégia Média (2 Grupos) -> Iniciando com Modelo 2', 'info');
            } else {
                startModelIndex = 2; // Avançado (Modelo 3)
                // addLog(`🎯 Estratégia Complexa (${totalGroups} Grupos) -> Iniciando direto com Modelo 3`, 'info');
            }

            // Fallback de segurança: Se o modelo escolhido tiver limite de tokens E o prompt estourar
            // pular para o próximo compatível
            for (let i = startModelIndex; i < this.modelVersions.length; i++) {
                const model = this.modelVersions[i];
                if (model.maxTokens && estimatedTokens > model.maxTokens) {
                    // addLog(`⚠️ Prompt muito grande para ${model.name}. Pulando...`, 'warning');
                    continue;
                }
                startModelIndex = i;
                break;
            }

            if (startModelIndex > 0) {
                // addLog(`🚀 Otimização ativada: Pulando modelos menores.`, 'success');
            }

            // 🔄 Tentar com cada versão disponível, começando do modelo ideal
            for (let attempt = startModelIndex; attempt < this.modelVersions.length; attempt++) {
                try {
                    // Atualizar para a versão atual
                    this.currentModelIndex = attempt;
                    this.baseUrl = this.modelVersions[attempt].url;

                    const currentModel = this.modelVersions[attempt];

                    // 🛠️ VERIFICAÇÃO REDUNDANTE REMOVIDA: Já calculamos o modelo ideal acima
                    // A lógica antiga de "pular" dentro do loop foi removida pois agora começamos do modelo correto

                    // addLog(`🤖 Tentando com ${currentModel.name}...`, 'info');

                    // onProgress(30 + (attempt * 10), `Enviando para ${currentModel.name}...`);

                    // 🔥 CHAMAR API
                    // addLog('📤 Enviando requisição para IA API...', 'info');
                    const response = await this.callGeminiAPI(enrichedPrompt, isAlreadyPaid);

                    // addLog('📥 Resposta recebida do IA ', 'success');
                    // onProgress(70, 'Processando resposta...');

                    // 🔍 Validar resposta
                    // addLog('🔍 Validando estrutura da resposta...', 'info');
                    if (!response) {
                        throw new Error('Resposta vazia da IA');
                    }

                    let geminiJson;

                    // Se callGeminiAPI já retornou um objeto JSON parseado
                    if (typeof response === 'object' && response.groups) {
                        // addLog('✅ JSON já parseado pela API', 'success');
                        geminiJson = response;
                    }
                    // Se retornou string, precisamos extrair o JSON
                    else if (typeof response === 'string') {
                        // 🔍 Extrair JSON
                        // onProgress(80, 'Extraindo JSON da resposta...');
                        // addLog('📋 Extraindo JSON da resposta...', 'info');

                        const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/) ||
                            response.match(/```\s*([\s\S]*?)\s*```/) ||
                            response.match(/({[\s\S]*})/);

                        if (!jsonMatch) {
                            throw new Error('Não foi possível encontrar JSON na resposta');
                        }

                        // addLog('✅ JSON extraído com sucesso', 'success');

                        const jsonText = jsonMatch[1] || jsonMatch[0];
                        geminiJson = JSON.parse(jsonText);

                        // addLog('✅ JSON parseado com sucesso', 'success');
                    }
                    else {
                        throw new Error('Formato de resposta inválido da IA');
                    }

                    // 🔍 Formatar resposta
                    // onProgress(90, 'Formatando regras...');
                    // addLog('🎨 Formatando regras para o sistema...', 'info');

                    const formattedRules = this.formatGeminiResponse(geminiJson);

                    // ✨ NOVO: Anexar prompt enriquecido para fins de exportação/debug
                    if (formattedRules) {
                        formattedRules._gemini_prompt = enrichedPrompt;
                    }

                    // addLog(`✅ ${formattedRules.groups?.length || 0} grupo(s) formatado(s)`, 'success');
                    // addLog('🎉 Tradução concluída com sucesso!', 'success');

                    // 🔒 LIMPAR FLAG DE PROCESSAMENTO
                    this.isProcessing = false;

                    // onProgress(100, 'Tradução concluída!');
                    return formattedRules;

                } catch (error) {
                    // Se é a última tentativa, lançar erro
                    if (attempt === this.modelVersions.length - 1) {
                        console.error(` Erro: ${error.message}`)
                        throw error;
                    }

                    const currentModel = this.modelVersions[attempt];
                    console.error(`⚠️ Falha com ${currentModel.name}: ${error.message}`);

                    // ✅ CORREÇÃO: Log seguro sem depender de logConfig.shouldLog
                    if (typeof window !== 'undefined' && window.logConfig && typeof window.logConfig.warn === 'function') {
                        window.logConfig.warn('gemini_api', `Falha com ${currentModel.name}: ${error.message}`);
                    }
                }

                // Se não é a última tentativa, tentar próxima versão
                if (attempt < this.modelVersions.length - 1) {
                    // onProgress(30 + ((attempt + 1) * 10), `Tentando próximo modelo...`);
                    // addLog('🔄 Tentando próximo modelo...', 'info');
                    continue;
                }

                // Se todas as versões falharam
                console.error("❌ Todas as versões da IA falharam");
                console.error("🔍 Versões testadas:", this.modelVersions.map(m => m.name));


                // 🔒 LIMPAR FLAG DE PROCESSAMENTO
                this.isProcessing = false;
                throw new Error(`Falha em todas as versões da IA. Último erro: ${error.message}`);
            }
        } catch (error) {
            this.isProcessing = false;
            console.error(error);
            addLog(`❌ Erro fatal: ${error.message}`, 'error');
            throw error;
        }
    }

    // Construir prompt estruturado para o Gemini
    buildPrompt(strategyText) {
        return `
SISTEMA DE TRADUÇÃO E VALIDAÇÃO DE ESTRATÉGIAS DE TRADING

Você deve traduzir estratégias de trading escritas em linguagem natural para um formato estruturado JSON.
IMPORTANTE: Siga uma HIERARQUIA DE DECISÕES EM ETAPAS para processar cada regra com precisão.

═══════════════════════════════════════════════════════════════════
📋 HIERARQUIA DE PROCESSAMENTO (SIGA ESSA ORDEM):
═══════════════════════════════════════════════════════════════════


🔹 ETAPA 1: ANÁLISE ESTRUTURAL
├─ Quantas linhas começam com "*"? → Cada linha = 1 GRUPO
├─ Dentro de cada linha, regras separadas por vírgula = REGRAS DIFERENTES (AND)
│  └─ **DICA CRÍTICA**: Se o usuário escreve "Ação QUANDO Condição" (ex: "Entrar over 2 quando digito < 5"), ISSO É UMA ÚNICA REGRA!
│     NÃO separe em ação e condição. Crie uma única regra dynamic_prediction com a condição embutida.
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
    * **Exemplo 1:** "Entrar differ do dígito que se repetir".
        * "predictionAction": "differ"
        * "targetValue": "dynamic_repeated_digit"
        * "explicitPrediction": true
    * **Exemplo 2: "Entrar differ do ultimo digito"**
        * "type": "dynamic_prediction"
        * "predictionAction": "differ"
        * "targetValue": "$LAST_DIGIT"
        * "predictionType": "last_digit"
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
"parameters": [
  { "key": "param_contract_val", "label": "Valor Over", "value": 2, "type": "number" },
  { "key": "param_last_digits_count", "label": "Qtd. Últimos Dígitos", "value": 4, "type": "number" },
  { "key": "param_threshold", "label": "Dígito Referência", "value": 6, "type": "number" }
]

EXEMPLO DE EXTRAÇÃO DE PERCENTUAL:
Regra: "Entrar differ do digito com percentual >= 24%"

"parameters": [
  { "key": "param_percentage_val", "label": "Percentual Mínimo", "value": 24, "type": "number", "path": "combinedRule.percentageRule.value" }
]

⚠️ CRÍTICO:
- EXTRAIA O VALOR EXATO QUE O USUÁRIO DIGITOU (ex: 24).
- NÃO INVENTE VALORES PADRÃO (como 70 ou 60) se o usuário especificou um número.
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

TIPOS DE REGRAS VÁLIDAS (use a sintaxe exata):
- "ultimos X digitos OPERADOR Y" (X=1-50, OPERADOR=>, <, =, >=, <=, Y=0-9)
- "percentual dos digitos CONDIÇÃO OPERADOR Z%" (CONDIÇÃO=pares, impares, abaixo de N, acima de N, igual a N)
- "padrão dos dígitos PADRÃO" (PADRÃO usando X para repetidos e O para diferentes, ex: XXOX, OOOOXXO)
- "rsi OPERADOR Y" ou "rsi(período) OPERADOR Y"
- "sma(período1) OPERADOR sma(período2)"
- "ultimo tick OPERADOR suporte" ou "ultimo tick OPERADOR resistencia"
- "preco subiu/desceu X pontos" ou "preco subiu/desceu X%"
- "X ticks consecutivos subindo/descendo"

1. ÚLTIMOS DÍGITOS (DINÂMICO):
- "ultimos 3 digitos < 5" → "type": "last_digits", "count": 3, "operator": "<", "value": 5

1.1. REPETIÇÃO DE DÍGITOS (DINÂMICO):
- "ultimos 2 digitos se repetir" → "type": "digit_repetition", "count": 2

2. PARIDADE DE DÍGITOS (DINÂMICO):
- "ultimos 3 digitos for par" → "type": "digit_parity", "count": 3, "parity": "par"

3. PADRÃO DE DÍGITOS (DINÂMICO):
- "padrão dos dígitos XXXOX" → "type": "digit_pattern", "pattern": "XXXOX"

4. RSI (DINÂMICO):
- "rsi > 70" → "type": "rsi", "operator": ">", "value": 70, "period": 14

5. SMA - SIMPLE MOVING AVERAGE (DINÂMICO):
- "sma 80 > sma 20" → "type": "sma", "period1": 80, "operator": ">", "period2": 20
- "preço > sma 40" → "type": "sma", "operator": ">", "period": 40, "targetValue": "price"

6. SUPORTE (DINÂMICO):
- "ultimo tick > suporte" → "type": "support", "operator": ">", "period": 100

7. RESISTÊNCIA (DINÂMICO):
- "ultimo tick > resistencia" → "type": "resistance", "operator": ">", "period": 100

8. MOVIMENTAÇÃO DE PREÇO (DINÂMICO):
- "preco subiu 5 pontos" → "type": "price_move", "direction": "up", "points": 5

9. SEQUÊNCIA (DINÂMICO):
- "5 ticks consecutivos subindo" → "type": "sequence", "direction": "up", "count": 5
- "ultimos 3 preços subindo" → "type": "sequence", "direction": "up", "count": 3

10. NÍVEIS DE SUPORTE/RESISTÊNCIA:
- "atingir suporte 1.1800" → "type": "level", "level_type": "support", "value": 1.1800

11. PERCENTUAIS DE DÍGITOS (DINÂMICO):
- "percentual dos digitos inferiores a 4 > 40%" → "type": "percentage", "conditionType": "below", "value": 4, "operator": ">", "targetPercentage": 40, "period": 25

13. SMA CROSSOVER (CRITICAL - NOVO):
- "sma 20 cruzou sma 50 subindo" → "type": "sma_crossover", "period1": 20, "period2": 50, "direction": "up"
- "sma 14 cruza sma 28 descendo" → "type": "sma_crossover", "period1": 14, "period2": 28, "direction": "down"

14. PRECISÃO DA PROBABILIDADE (DINÂMICO):
- "precisão > 60%" → "type": "probability_accuracy", "operator": ">", "value": 60

12.1. RECOMENDAÇÃO PARA MULTI-REGRAS (USO DE VÍRGULA):
- "Entrar differ do digito menor chance, precisão >= 60%" → (Gerar 2 regras no Grupo 1)
  1. { "type": "dynamic_prediction", "predictionAction": "differ", "targetValue": "$LOWER_PROB" }
  2. { "type": "probability_accuracy", "operator": ">=", "value": 60 }

⚠️ CRÍTICO - RECONHECIMENTO DE PADRÕES EVEN/ODD EM PERCENTUAIS:
═══════════════════════════════════════════════════════════════════

Quando a regra menciona "percentual dos dígitos =(lista)" você DEVE verificar se a lista corresponde a PARES ou ÍMPARES:

🔍 DETECÇÃO AUTOMÁTICA:
├─ Se a lista é EXATAMENTE (2,4,6,8,0) ou qualquer permutação → "conditionType": "even"
├─ Se a lista é EXATAMENTE (1,3,5,7,9) ou qualquer permutação → "conditionType": "odd"
└─ Caso contrário → usar "allowedDigits"

📌 EXEMPLOS CORRETOS:

EXEMPLO A: "Entrar even quando o percentual dos digitos =(2,4,6,8,0) >= 55%"
✅ CORRETO:
{
  "type": "dynamic_prediction",
  "predictionType": "conditional_percentage",
  "predictionAction": "even",
  "targetValue": "even",
  "combinedRule": {
    "percentageRule": {
      "type": "percentage",
      "conditionType": "even",  // ✅ Reconhecer padrão, NÃO usar allowedDigits
      "operator": ">=",
      "targetPercentage": 55,
      "period": 25
    }
  }
}

❌ INCORRETO (NÃO FAZER):
{
  "combinedRule": {
    "percentageRule": {
      "allowedDigits": [2,4,6,8,0]  // ❌ ERRADO! Deve usar conditionType: "even"
    }
  }
}

EXEMPLO B: "Entrar odd quando o percentual dos digitos =(1,3,5,7,9) >= 55%"
✅ CORRETO:
{
  "type": "dynamic_prediction",
  "predictionType": "conditional_percentage",
  "predictionAction": "odd",
  "targetValue": "odd",
  "combinedRule": {
    "percentageRule": {
      "type": "percentage",
      "conditionType": "odd",  // ✅ Reconhecer padrão, NÃO usar allowedDigits
      "operator": ">=",
      "targetPercentage": 55,
      "period": 25
    }
  }
}

EXEMPLO C: "Entrar when percentual dos digitos =(2,3,7) >= 40%"
✅ CORRETO (lista NÃO é even/odd completo):
{
  "combinedRule": {
    "percentageRule": {
      "type": "percentage",
      "allowedDigits": [2,3,7],  // ✅ Lista customizada, usar allowedDigits
      "operator": ">=",
      "targetPercentage": 40,
      "period": 25
    }
  }
}

⚠️ REGRA DE OURO:
- (2,4,6,8,0) em QUALQUER ORDEM → SEMPRE "conditionType": "even"
- (1,3,5,7,9) em QUALQUER ORDEM → SEMPRE "conditionType": "odd"
- Qualquer outra lista → usar "allowedDigits"

═══════════════════════════════════════════════════════════════════

12. APLICANDO A HIERARQUIA - EXEMPLOS PRÁTICOS:

📌 EXEMPLO 1: "Entrar over 2 quando os 3 últimos >= 5"
├─ ETAPA 2.5: É dynamic_prediction (over 2) → "type": "dynamic_prediction", "predictionAction": "over", "targetValue": 2
│  └─ "predictionType": "conditional_value"
└─ ETAPA 4: Tipo de análise? "os 3 últimos" → Contagem de dígitos

RESULTADO (PARCIAL):
"type": "dynamic_prediction"
"predictionType": "conditional_value"
"predictionAction": "over"
"targetValue": 2
"condition": { "type": ">=", "value": 5 }
"count": 3

📌 EXEMPLO 2: "Entrar over 2 se percentual dos dígitos superiores 6 >= 55%"
├─ ETAPA 2.5: É dynamic_prediction (over 2) → "type": "dynamic_prediction", "predictionAction": "over", "targetValue": 2
│  └─ IR PARA ETAPA 4 para determinar "predictionType"
└─ ETAPA 4: DETECTAR palavra "PERCENTUAL" na condição
└─ ✅ ENCONTROU "percentual" → "predictionType" = "conditional_percentage"
└─ ⚠️ USAR combinedRule.percentageRule (NÃO usar "condition")

⚠️ ESTRUTURA JSON EXATA (REGRAS HÍBRIDAS):
{
"type": "dynamic_prediction",
"predictionType": "conditional_percentage",
"predictionAction": "over",
"targetValue": 2,
"combinedRule": {
"percentageRule": {
"type": "percentage",
"conditionType": "above",
"value": 6,
"operator": ">=",
"targetPercentage": 55,
"period": 25
}
}
}

📌 EXEMPLO 4 (Condição Pura): "Quando os últimos 3 dígitos >= 5"
├─ ETAPA 2.5: SEM AÇÃO de contrato (over/under/match/differ) → NÃO é dynamic_prediction
└─ ETAPA 4: Tipo de análise? "os últimos X" → Contagem de dígitos
└─ "type": "last_digits"

RESULTADO:
"type": "last_digits"
"count": 3
"operator": ">="
"value": 5

═══════════════════════════════════════════════════════════════════
🔄 RESUMO DA HIERARQUIA - CHECKLIST:
═══════════════════════════════════════════════════════════════════

PARA CADA REGRA, SIGA ESTE CHECKLIST:

1️⃣ Quantos grupos? (contar linhas com *)
2️⃣ Quantos contratos por grupo? (1 ou BOTH)
3️⃣ Tem AÇÃO DE CONTRATO (over/under/match/differ/par/ímpar)?
└─ SIM → "type" = "dynamic_prediction" + Definir **predictionAction** e **targetValue** (ETAPA 2.5) + IR PARA PASSO 4
└─ NÃO → "type" vem do tipo de análise (ETAPA 4)
4️⃣ DETECTAR palavra-chave na condição:
├─ Contém "PERCENTUAL" ou "PORCENTAGEM"?
│  └─ "predictionType": "conditional_percentage", Estrutura: combinedRule.percentageRule
├─ Contém "RSI"?
│  └─ "predictionType": "conditional_rsi", Estrutura: combinedRule.rsiRule
├─ Contém "SMA" ou "média móvel" (COMPARAÇÃO SIMPLES)?
│  └─ "predictionType": "conditional_sma", Estrutura: combinedRule.smaRule (Se for preço vs sma: usar targetValue: "price" dentro do smaRule)
├─ Contém "SMA/Média" + "CRUZOU/CRUZA" (CROSSOVER)?
│  └─ "type": "sma_crossover", "period1": X, "period2": Y, "direction": "up/down"
├─ Contém "padrão" ou "pattern"?
│  └─ "predictionType": "conditional_pattern", Estrutura: combinedRule.patternRule
└─ Contém "últimos X dígitos" ou lista de dígitos?
└─ "predictionType": "conditional_value", Estrutura: condition/allowedDigits + count

⚠️ REGRA DE OURO:
- PERCENTUAL/RSI/SMA/PATTERN → SEMPRE usar "combinedRule"
- CONTAGEM DE DÍGITOS/LISTA DE DÍGITOS → usar "condition" ou "allowedDigits" + "count"

═══════════════════════════════════════════════════════════════════

13. ENTRADAS DUPLAS (BOTH MODE):
⚠️ CRÍTICO: Quando a regra menciona MÚLTIPLOS contratos com previsões numéricas (over X e under Y, match X e differ Y),
você deve criar MÚLTIPLAS regras dynamic_prediction no MESMO grupo, preservando cada contrato!

EXEMPLO COMPLETO DE ENTRADA DUPLA:

ENTRADA: "* Entrar over 1 e under 8 quando ultimo digito <= 1"

SAÍDA JSON CORRETA:
{
"groups": [
{
"id": 1,
"rules": [
{
"id": 1,
"type": "dynamic_prediction",
"predictionType": "conditional_value",
"predictionAction": "over",
"targetValue": 1,
"condition": { "type": "<=", "value": 1 },
"count": 1,
"description": "Entrar over 1 quando ultimo digito <= 1"
},
{
"id": 2,
"type": "dynamic_prediction",
"predictionType": "conditional_value",
"predictionAction": "under",
"targetValue": 8,
"condition": { "type": "<=", "value": 1 },
"count": 1,
"description": "Entrar under 8 quando ultimo digito <= 1"
}
]
}
]
}

⚠️ IMPORTANTE:
- Cada contrato vira UMA regra dynamic_prediction separada
- TODAS as regras ficam no MESMO grupo (mesmo id)
- Cada regra tem sua própria targetValue, predictionAction e description
- As condições (count, operator, value) são iguais para ambas

14. CONDIÇÕES COM "OU" (MÚLTIPLOS GRUPOS):
⚠️ CRÍTICO: Quando o usuário usa "OU" dentro da mesma condição, você deve sugerir reformulação!
O sistema só entende "OU" através de GRUPOS SEPARADOS (linhas com *).

AÇÃO OBRIGATÓRIA:
Quando detectar "OU", adicione em "validation_issues":
"Detectei condição com "OU": [texto da regra]. Para funcionar corretamente, reescreva usando grupos separados com asterisco (*)"

E adicione em "corrected_strategy" a sugestão:
"* [primeira condição]
* [segunda condição]"

15. ÚLTIMOS X DÍGITOS = (LISTA DE DÍGITOS PERMITIDOS):
⚠️ NOVA REGRA: Verifica se TODOS os últimos N dígitos estão em uma lista de dígitos permitidos.
TIPO DE REGRA: "allowed_digits"

⚠️ CRÍTICO - PREVISÃO DINÂMICA COM LISTA:
- Se a regra começar com AÇÃO DE CONTRATO (ex: Entrar **under**...), use a estrutura "dynamic_prediction" da ETAPA 2.5 e adicione "count" e "allowedDigits" (Exemplo 2 da ETAPA 2.5).
- Se a regra for de CONDIÇÃO PURA (ex: Entrar quando...), use a estrutura "allowed_digits".

EXEMPLOS CORRETOS:
- "Entrar quando os ultimos 3 digitos = (2,4,7,6,9)" →
"type": "allowed_digits", "count": 3, "allowedDigits": [2, 4, 7, 6, 9]

- "Entrar under do digito =(4,7,9,3)" (Analisa 1 dígito) →
"type": "dynamic_prediction", "predictionAction": "under", "targetValue": "dynamic_allowed_digit", "count": 1, "allowedDigits": [4, 7, 9, 3]

- "Entrar over 3 e under 5 quando os 3 ultimos digitos = (1,3,5,7,9)" →
[DUAS REGRAS COM MODO BOTH]:
1) "predictionAction": "over", "targetValue": 3, "type": "dynamic_prediction", "count": 3, "allowedDigits": [1,3,5,7,9]
2) "predictionAction": "under", "targetValue": 5, "type": "dynamic_prediction", "count": 3, "allowedDigits": [1,3,5,7,9]

16. ENTRAR [PARIDADE] QUANDO DÍGITOS = (LISTA):
⚠️ REGRA ESPECIAL: Quando a regra especifica uma AÇÃO DE PARIDADE (par/ímpar/even/odd) baseada em uma LISTA de dígitos permitidos.

ESTRUTURA CORRETA:
{
  "type": "dynamic_prediction",
  "predictionType": "conditional_value",
  "predictionAction": "even",  // ou "odd" - SEMPRE EM INGLÊS, SEM ACENTO
  "targetValue": "even",        // ou "odd" - SEMPRE EM INGLÊS, SEM ACENTO
  "count": N,
  "allowedDigits": [lista de dígitos]
}

EXEMPLOS CORRETOS:
- "Entrar par quando os últimos 3 dígitos =(1,3,5,7,9)" →
  {
    "type": "dynamic_prediction",
    "predictionAction": "even",
    "targetValue": "even",
    "count": 3,
    "allowedDigits": [1, 3, 5, 7, 9]
  }

- "Entrar ímpar quando os últimos 2 dígitos =(0,2,4,6,8)" →
  {
    "type": "dynamic_prediction",
    "predictionAction": "odd",
    "targetValue": "odd",
    "count": 2,
    "allowedDigits": [0, 2, 4, 6, 8]
  }

⚠️ CRÍTICO: 
- SEMPRE use "even" para PAR e "odd" para ÍMPAR
- NUNCA use "par", "ímpar", "impar" - apenas "even" ou "odd"
- O targetValue deve ser IGUAL ao predictionAction para regras de paridade



OPERADORES SUPORTADOS:
- >, maior que, acima de → ">"
- <, menor que, abaixo de → "<"
- =, igual a, igual → "="
- >=, maior ou igual, maior igual → ">="
- <=, menor ou igual, menor igual → "<="
- !=, diferente de, diferente, não igual → "!="

INSTRUÇÕES ESPECIAIS:
- SEMPRE extraia valores numéricos dinâmicos do texto do usuário
- SEMPRE identifique o operador correto baseado nas palavras usadas
- Se não especificado, use valores padrão razoáveis (ex: RSI period = 14, Percentual period = 25)
- Mantenha a descrição fiel ao texto original do usuário
- Para regras de percentual, se o período não for especificado, use 25 como padrão.
- Para regras de percentual, sempre inclua o período na descrição se ele estiver presente na regra original.
- Para allowed_digits, se a contagem não for especificada (ex: "...ultimo digito = (X,Y)"), use "count": 1.

⚠️ TRADUÇÃO CRÍTICA - REGRAS COM PERCENTUAL:

Se a regra contém "PERCENTUAL" ou "PORCENTAGEM" + Ação de Contrato (dynamic_prediction):
├─ "predictionType": "conditional_percentage"
└─ "combinedRule.percentageRule" (NÃO usar "condition")

EXEMPLO CORRETO (Regra com condição específica):
"Entrar over 2 se percentual dos dígitos superiores 6 >= 55%"
→ {
"predictionType": "conditional_percentage",
"targetValue": 2,
"combinedRule": {
"percentageRule": {
"type": "percentage",
"conditionType": "above", // Valor explícito (acima de 6)
"value": 6,
"operator": ">=",
"targetPercentage": 55,
"period": 25
}
}
}

// 🆕 EXCEÇÃO CRÍTICA: PARA REGRAS DE DÍGITO COM PERCENTUAL (ex: "do digito com percentual > X%"):
// ⚠️ OBLIGATÓRIO: REMOVER "conditionType" e "value" para evitar erro de validação (undefined/single_digit)
EXEMPLO CORRETO PARA A SUA REGRA:
"Entrar differ do digito com percentual > 20%"
→ {
"predictionType": "conditional_percentage",
"predictionAction": "differ",
"targetValue": "dynamic_highest_percentage_digit",
"combinedRule": {
"percentageRule": {
"type": "percentage",
"operator": ">",
"targetPercentage": 20,
"period": 25
// ⚠️ conditionType e value OMITIDOS
}
}
}

═══════════════════════════════════════════════════════════════════
🎲 REGRAS COM PROBABILIDADE DINÂMICA:
═══════════════════════════════════════════════════════════════════

O sistema possui um componente de PROBABILIDADE que analisa o histórico recente e calcula
qual dígito tem maior/menor chance de sair no próximo tick.

VARIÁVEIS ESPECIAIS (Dígitos):
- "$HIGHER_PROB" = O dígito com MAIOR probabilidade (Retorna 0-9)
- "$LOWER_PROB" = O dígito com MENOR probabilidade (Retorna 0-9)


VARIÁVEIS ESPECIAIS (Dígitos - 0 a 9):
- "$HIGHER_PROB" = O DIGITO que tem a maior probabilidade (Ex: 7)
- "$LOWER_PROB" = O DIGITO que tem a menor probabilidade (Ex: 2)
- "$LAST_DIGIT" = O ÚLTIMO DÍGITO que saiu no mercado (Ex: 5)

VARIÁVEIS ESPECIAIS (Valores Percentuais - 0 a 100):
- "$HIGHER_PROB_VALUE" = O VALOR da probabilidade do dígito de maior chance (Ex: 40.5)
- "$LOWER_PROB_VALUE" = O VALOR da probabilidade do dígito de menor chance (Ex: 2.1)

VARIÁVEIS ESPECIAIS (Dígitos - 0 a 9):
- "$HIGHER_PROB" = O DIGITO que tem a maior probabilidade (Ex: 7)
- "$LOWER_PROB" = O DIGITO que tem a menor probabilidade (Ex: 2)
- "$LAST_DIGIT" = O ÚLTIMO DÍGITO (Ex: 3)

VARIÁVEIS ESPECIAIS (Valores Percentuais - 0 a 100):
- "$HIGHER_PROB_VALUE" = O VALOR da probabilidade do dígito de maior chance (Ex: 40.5)
- "$LOWER_PROB_VALUE" = O VALOR da probabilidade do dígito de menor chance (Ex: 2.1)

PALAVRAS-CHAVE E CONTEXTO:
1. SE REFERE A DÍGITO (Padrão para comparações simples):
   - "digito maior chance", "ultimo digito = maior chance", "entrar differ maior chance"
   - "menor chance <= 2" (Está verificando se o DÍGITO de menor chance é 0, 1 ou 2)
   - USE: $HIGHER_PROB ou $LOWER_PROB


2. SE REFERE A VALOR/PORCENTAGEM (Requer palavras explícitas ou %):
   - "percentual maior chance > 30", "score menor chance <= 10%", "probabilidade > 40"
   - USE: $HIGHER_PROB_VALUE ou $LOWER_PROB_VALUE


⚠️ REGRA CRÍTICA DE PROBABILIDADE - DISTINÇÃO DE CONTEXTO:

1. COMPARAÇÃO COM ÚLTIMO DÍGITO ("ultimo digito" + "menor/maior chance"):
   - Regra: "Entrar quando ultimo digito = menor chance"
   - Contexto: Verifica se o dígito que ACABOU de sair no mercado é igual ao dígito de menor probabilidade.
   - JSON:
     {
       "type": "probability_check",
       "target": "last_digit",  // Alvo é o ÚLTIMO DÍGITO
       "operator": "=",
       "value": "$LOWER_PROB",  // Valor é a VARIÁVEL
       "description": "ultimo digito = menor chance"
     }

2. COMPARAÇÃO DIRETA DA VARIÁVEL ("menor/maior chance" + NÚMERO):
   - Regra: "Entrar quando menor chance <= 2"
   - Contexto: Verifica se a VARIÁVEL (o dígito de menor chance) é menor ou igual a 2. NÃO IMPORTE qual foi o último dígito do mercado.
   - JSON:
     {
       "type": "probability_check",
       "target": "$LOWER_PROB", // Alvo é a VARIÁVEL
       "operator": "<=",
       "value": 2,              // Valor é um NÚMERO
       "description": "menor chance <= 2"
     }

📌 EXEMPLO 1: "Entrar quando o digito de menor chance <= 2" (Comparando a Variável)
{
  "type": "probability_check",
  "target": "$LOWER_PROB",
  "operator": "<=",
  "value": 2,
  "description": "menor chance <= 2"
}

📌 EXEMPLO 2: "Entrar quando ultimo digito for igual ao maior chance" (Comparando Último Dígito)
{
  "type": "probability_check",
  "target": "last_digit",
  "operator": "=",
  "value": "$HIGHER_PROB",
  "description": "ultimo digito = maior chance"
}

📌 EXEMPLO 3: "percentual menor chance <= 10%" (Comparando Valor Percentual)
{
  "type": "probability_check",
  "target": "$LOWER_PROB_VALUE",
  "operator": "<=",
  "value": 10,
  "description": "percentual menor chance <= 10%"
}

⚠️ CRÍTICO - DIFERENCIAÇÃO DE REGRAS COM "ULTIMO DIGITO":
═══════════════════════════════════════════════════════════════════

Quando usar variáveis de probabilidade ($HIGHER_PROB, $LOWER_PROB), observe se a regra menciona "ULTIMO DIGITO":

🔹 REGRA 1: SEM "ultimo digito" → EXECUÇÃO DIRETA (sem condição)
   - Exemplo: "entrar differ do digito = menor chance"
   - Comportamento: Define previsão no dígito de menor chance e executa IMEDIATAMENTE
   - Estrutura JSON:
     {
       "type": "dynamic_prediction",
       "predictionAction": "differ",
       "targetValue": "$LOWER_PROB",
       "explicitPrediction": true
     }

🔹 REGRA 2: COM "ultimo digito" → EXECUÇÃO CONDICIONAL (verifica se último dígito == variável)
   - Exemplo: "entrar differ do ultimo digito = menor chance"
   - Comportamento: Só executa quando último dígito do mercado == dígito de menor chance
   - Estrutura JSON:
     {
       "type": "dynamic_prediction",
       "predictionAction": "differ",
       "targetValue": "$LOWER_PROB",
       "explicitPrediction": true,
       "predictionType": "last_digit_probability_match",
       "condition": {
         "type": "last_digit_equals",
         "probabilityVariable": "$LOWER_PROB"
       }
     }

⚠️ REGRA DE OURO:
- Palavra "ULTIMO" presente → Adicionar predictionType e condition
- Palavra "ULTIMO" ausente → NÃO adicionar predictionType nem condition

📌 EXEMPLO 2 (ATUALIZADO): "Entrar differ do digito = menor chance" (SEM "ultimo")
{
  "type": "dynamic_prediction",
  "predictionAction": "differ",
  "targetValue": "$LOWER_PROB",
  "explicitPrediction": true,
  "description": "Entrar differ do digito = menor chance"
}

📌 EXEMPLO 4: "Entrar differ do ultimo digito = menor chance" (COM "ultimo")
{
  "type": "dynamic_prediction",
  "predictionAction": "differ",
  "targetValue": "$LOWER_PROB",
  "explicitPrediction": true,
  "predictionType": "last_digit_probability_match",
  "condition": {
    "type": "last_digit_equals",
    "probabilityVariable": "$LOWER_PROB"
  },
  "description": "Entrar differ do ultimo digito = menor chance"
}

📌 EXEMPLO 5: "Entrar match do ultimo digito = maior chance" (COM "ultimo")
{
  "type": "dynamic_prediction",
  "predictionAction": "match",
  "targetValue": "$HIGHER_PROB",
  "explicitPrediction": true,
  "predictionType": "last_digit_probability_match",
  "condition": {
    "type": "last_digit_equals",
    "probabilityVariable": "$HIGHER_PROB"
  },
  "description": "Entrar match do ultimo digito = maior chance"
}

📌 EXEMPLO 6: "Entrar quando RSI(14) > 70" (Regra de Indicador)
{
  "type": "dynamic_prediction",
  "predictionAction": "call",
  "parameters": {
    "predictionType": "conditional_rsi",
    "combinedRule": {
      "rsiRule": {
        "period": 14,
        "operator": ">",
        "value": 70
      }
    }
  },
  "description": "Entrar quando RSI(14) > 70"
}

⚠️ IMPORTANTE:
- Use as variáveis especiais EXATAMENTE como mostrado ($HIGHER_PROB, $LOWER_PROB)
- O sistema resolverá essas variáveis em runtime
- Para regras com ação de contrato (differ, match, over, under) + variáveis de probabilidade, SEMPRE use 'dynamic_prediction'
- NUNCA use 'digit_comparison' - esse tipo NÃO existe no sistema!

═══════════════════════════════════════════════════════════════════

ESTRATÉGIA A TRADUZIR:
"""
${strategyText}
"""

CRÍTICO:
- Conte quantas linhas começam com "*" - esse é o número EXATO de grupos
- NUNCAA crie mais grupos do que linhas com "*"
- Regras separadas por vírgula na MESMA linha devem ficar no MESMO grupo
- Extraia valores numéricos e operadores dinamicamente
- Para regras de percentual, se o período não for especificado, use 25 como padrão.
- SEMPRE inclua o array "parameters" com os valores editáveis.

Responda APENAS com o JSON estruturado, sem explicações adicionais.
        `;
    }

    // Chamar API do Gemini
    async callGeminiAPI(prompt, isAlreadyPaid = false) {
        const callId = `GEMINI-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;

        // 🚨 DETECÇÃO DE DUPLICATAS
        const promptHash = this.generatePromptHash(prompt);


        this.lastPromptHash = promptHash;
        this.lastPromptTime = Date.now();

        // ✅ CORREÇÃO CRÍTICA: Validar prompt antes de criar requestBody
        if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
            console.error(`❌ [${callId}] PROMPT INVÁLIDO:`, {
                prompt: prompt,
                type: typeof prompt,
                length: prompt ? prompt.length : 'N/A'
            });
            throw new Error('Prompt inválido ou vazio para API Gemini');
        }

        const requestBody = {
            contents: [{
                parts: [{
                    text: prompt.trim()
                }]
            }],
            generationConfig: {
                temperature: 0.2,
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 8192
            }
        };



        // ✅ CORREÇÃO: Log condicional seguro
        const shouldLog = (typeof window !== 'undefined' &&
            window.logConfig &&
            typeof window.logConfig.shouldLog === 'function')
            ? window.logConfig.shouldLog('gemini_api', 0.1) : false;


        // 🔍 DEBUG: Log dos dados que seriam enviados ao Proxy
        const proxyPayload = {
            loginId: SessionManager.getUserSessionId(),
            token: (SessionManager.getLocalToken() || localStorage.getItem(`token_${SessionManager.getUserSessionId()}`) || localStorage.getItem(`access_token_session_${SessionManager.getUserSessionId()}`) || '').trim(),
            contents: requestBody.contents,
            generationConfig: requestBody.generationConfig,
            modelUrl: this.baseUrl,
            isAlreadyDebited: isAlreadyPaid
        };

        if (shouldLog) {
            console.log(`📡 [${callId}] Enviando requisição para o Proxy:`, {
                loginId: proxyPayload.loginId,
                modelUrl: proxyPayload.modelUrl,
                promptPreview: prompt.substring(0, 100) + '...'
            });
        }

        // ✅ SEGURANÇA: Chamar via Proxy no Servidor (Protege a API Key e Créditos)
        const response = await fetch('/api/ai/proxy', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(proxyPayload)
        });



        if (!response.ok) {
            const errorText = await response.text().catch(() => 'Erro desconhecido');

            // 🔍 DEBUG: Log completo do erro
            const errorDetails = {
                status: response.status,
                statusText: response.statusText,
                model: this.modelVersions[this.currentModelIndex].name,
                url: this.baseUrl,
                errorText: errorText,
                timestamp: new Date().toISOString(),
                promptLength: prompt.length
            };

            console.error(`❌ [${callId}] GEMINI HTTP ERROR - DETALHES COMPLETOS:`);
            console.error(JSON.stringify(errorDetails, null, 2));
            console.error(`❌ [${callId}] GEMINI HTTP ERROR (OBJETO):`, errorDetails);

            // Log específico por tipo de erro
            if (response.status === 400) {
                console.error(`⚠️ [${callId}] ERRO 400: Requisição inválida`);
                console.error(`📋 [${callId}] Detalhes da requisição enviada:`, {
                    model: this.modelVersions[this.currentModelIndex].name,
                    url: this.baseUrl,
                    promptLength: prompt.length,
                    config: requestBody.generationConfig
                });
                console.error(`📄 [${callId}] Resposta do servidor:`, errorText);

                // Tentar parsear a mensagem de erro do Gemini
                try {
                    const errorData = JSON.parse(errorText);
                    console.error(`🔍 [${callId}] Erro parseado do Gemini:`, errorData);
                    const errorMessage = errorData.error?.message || errorText;
                    throw new Error(`Requisição inválida para o Gemini: ${errorMessage}`);
                } catch (parseErr) {
                    throw new Error(`Requisição inválida (400). Verifique a configuração do modelo ${this.modelVersions[this.currentModelIndex].name}. Erro: ${errorText}`);
                }
            } else if (response.status === 403 || response.status === 401) {
                console.error(`🔑 [${callId}] ERRO DE AUTORIZAÇÃO: API Key inválida ou crédito insuficiente`);
                throw new Error(`Erro de autorização ou saldo insuficiente para o modelo ${this.modelVersions[this.currentModelIndex].name}`);
            } else if (response.status === 402) {
                console.error(`💰 [${callId}] ERRO 402: Créditos insuficientes`);
                throw new Error("Saldo insuficiente de créditos de IA. Por favor, recarregue sua conta.");
            } else if (response.status === 404) {
                console.error(`🔍 [${callId}] ERRO 404: Modelo não encontrado`);
                throw new Error(`Modelo ${this.modelVersions[this.currentModelIndex].name} não encontrado ou URL incorreta`);
            } else if (response.status === 429) {
                console.error(`⏱️ [${callId}] ERRO 429: Rate limit excedido`);
                throw new Error(`Rate limit excedido para o modelo ${this.modelVersions[this.currentModelIndex].name}`);
            } else {
                console.error(`❌ [${callId}] ERRO HTTP ${response.status}: ${errorText}`);
                throw new Error(`Erro HTTP ${response.status}: ${errorText}`);
            }
        }


        const data = await response.json();


        // ✅ CORREÇÃO: Validação robusta da estrutura da resposta
        if (!data || typeof data !== 'object') {
            console.error("❌ GEMINI RESPONSE ERROR: Resposta não é um objeto válido", data);
            throw new Error("Resposta inválida do Gemini");
        }

        if (!data.candidates || !Array.isArray(data.candidates)) {
            console.error("❌ GEMINI RESPONSE ERROR: Candidates ausente ou inválido", {
                hasCandidates: !!data.candidates,
                candidatesType: typeof data.candidates,
                isArray: Array.isArray(data.candidates),
                responseKeys: Object.keys(data)
            });
            throw new Error("Resposta do Gemini não contém candidates válidos");
        }

        if (data.candidates.length === 0) {
            console.error("❌ GEMINI RESPONSE ERROR: Array de candidates vazio");
            throw new Error("Resposta do Gemini não contém nenhum candidate");
        }

        // ✅ VERIFICAÇÃO CRÍTICA: Detectar se a resposta foi truncada por MAX_TOKENS
        if (data.candidates && Array.isArray(data.candidates) && data.candidates.length > 0) {
            const candidate = data.candidates[0];
            if (candidate.finishReason === 'MAX_TOKENS') {

                throw new Error('Resposta do Gemini foi truncada por limite de tokens. Tente com um prompt mais curto ou modelo diferente.');
            }

            // Verificar outros tipos de finalização problemática
            if (candidate.finishReason && candidate.finishReason !== 'STOP') {

                if (candidate.finishReason === 'SAFETY') {
                    throw new Error('Resposta bloqueada por filtros de segurança do Gemini');
                }
                if (candidate.finishReason === 'RECITATION') {
                    throw new Error('Resposta bloqueada por detecção de recitação do Gemini');
                }
            }
        }


        // A nova API pode retornar texto diretamente ou em candidates
        let textResponse = null;

        // Método 1: Verificar se há text diretamente na resposta
        if (data.text && typeof data.text === 'string') {
            textResponse = data.text;

        }
        // Método 2: Verificar structure candidates[0].content.parts[0].text (estrutura padrão)
        else if (data.candidates && Array.isArray(data.candidates) && data.candidates.length > 0) {
            const candidate = data.candidates[0];

            if (candidate.content) {
                // Verificar se tem parts
                if (candidate.content.parts && Array.isArray(candidate.content.parts) && candidate.content.parts.length > 0) {
                    const part = candidate.content.parts[0];
                    if (part.text && typeof part.text === 'string') {
                        textResponse = part.text;

                    }
                }
                // Verificar se tem texto diretamente no content
                else if (candidate.content.text && typeof candidate.content.text === 'string') {
                    textResponse = candidate.content.text;

                }
                // CASO ESPECIAL: content só tem role mas pode ter parts ocultos
                else if (candidate.content.role === 'model') {


                    // Verificar se há texto em outras propriedades do candidate
                    if (candidate.text && typeof candidate.text === 'string') {
                        textResponse = candidate.text;

                    }
                    // Verificar propriedades aninhadas
                    else if (candidate.output && typeof candidate.output === 'string') {
                        textResponse = candidate.output;

                    }
                }
            }
            // Verificar se há texto diretamente no candidate
            else if (candidate.text && typeof candidate.text === 'string') {
                textResponse = candidate.text;

            }
        }

        // Método 3: Procurar propriedade 'message' ou similar
        if (!textResponse && data.message && typeof data.message === 'string') {
            textResponse = data.message;

        }

        // Método 4: Procurar propriedade 'response' ou similar
        if (!textResponse && data.response && typeof data.response === 'string') {
            textResponse = data.response;

        }

        // Método 5: Procurar em todas as propriedades string da resposta
        if (!textResponse) {

            for (const [key, value] of Object.entries(data)) {
                if (typeof value === 'string' && value.length > 10) { // Lowered threshold
                    textResponse = value;

                    break;
                }
            }
        }

        // TRATAMENTO ESPECIAL: Se não encontrou texto mas tem usageMetadata, é problema de API
        if (!textResponse && data.usageMetadata && data.usageMetadata.totalTokenCount > 0) {
            console.error('❌ [GEMINI ERROR] API retornou metadados mas sem conteúdo de texto');
            throw new Error('Gemini processou a requisição mas não retornou conteúdo de texto. Pode ser problema temporário da API.');
        }

        if (!textResponse || typeof textResponse !== 'string') {
            console.error("❌ GEMINI RESPONSE ERROR: Nenhum texto válido encontrado na resposta", {
                dataKeys: Object.keys(data),
                dataStructure: JSON.stringify(data, null, 2),
                hasUsageMetadata: !!data.usageMetadata,
                tokenCount: data.usageMetadata?.totalTokenCount || 'N/A'
            });
            throw new Error("Resposta do Gemini não contém texto válido");
        }

        try {
            // Tentar múltiplas estratégias para extrair JSON
            let parsedJson;

            // Estratégia 1: Extrair JSON da resposta
            const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const extractedJson = jsonMatch[0];
                parsedJson = JSON.parse(extractedJson);
            } else {
                // Estratégia 2: Tentar extrair JSON com ```json blocks
                const jsonBlockMatch = textResponse.match(/```json\s*(\{[\s\S]*?\})\s*```/);
                if (jsonBlockMatch) {
                    parsedJson = JSON.parse(jsonBlockMatch[1]);
                } else {
                    // Estratégia 3: Procurar por patterns comuns
                    const strategiesMatch = textResponse.match(/"groups"\s*:\s*\[[\s\S]*?\]/);
                    if (strategiesMatch) {
                        // Construir JSON mínimo
                        const strategiesData = strategiesMatch[0];
                        parsedJson = JSON.parse(`{${strategiesData}}`);
                    } else {
                        console.error("❌ JSON NÃO ENCONTRADO na resposta:", textResponse);
                        throw new Error("JSON não encontrado na resposta");
                    }
                }
            }

            // Processar regras e adicionar novos tipos se necessário
            if (parsedJson && parsedJson.groups) {
                parsedJson.groups.forEach(group => {
                    group.rules.forEach(rule => {
                        // Adicionar regra de padrão de dígitos se não existir
                        if (rule.type === 'digit_pattern') {
                            // O padrão já vem do Gemini
                        } else if (rule.type === 'last_digits') {
                            // Manter como está
                        } else if (rule.type === 'digit_parity') {
                            // Regra de paridade foi adicionada
                            if (rule.parity === 'par') rule.parity = 'even';
                            if (rule.parity === 'impar') rule.parity = 'odd';
                        }
                    });
                });
            }

            return parsedJson;

        } catch (parseError) {
            console.error("❌ ERRO DE PARSE JSON:", {
                error: parseError.message,
                textResponse: textResponse
            });

            // Fallback: retornar a resposta como string para processamento posterior
            return textResponse;
        }
    }

    // Formatar resposta do Gemini para uso no sistema
    formatGeminiResponse(geminiResponse) {
        const formatGenerator = getFormatGeneratorInstance();
        return formatGenerator.formatGeminiResponse(geminiResponse);
    }

    // 🔍 Validar acesso do usuário
    // validateUserAccess() {
    //     // ✅ CORREÇÃO: Só validar se usuário já está logado
    //     const currentUser = SessionManager.getCurrentUser();

    // }

    // 🔐 Salvar estratégia traduzida com segurança (isolada por usuário)
    saveTranslatedStrategy(strategyRules) {
        try {
            const currentUser = SessionManager.getCurrentUser();
            if (!currentUser) {

                return false;
            }

            // 🔒 Usar operação segura para evitar race conditions
            return SessionManager.safeStorageOperation(`translated_strategy_${this.sessionId}`, () => {
                // 📊 Adicionar metadados de segurança
                const dataToSave = {
                    strategy: strategyRules,
                    _userId: currentUser.loginid,
                    _timestamp: Date.now(),
                    _sessionId: this.sessionId
                };

                const key = `translated_strategy_${this.sessionId}`;
                localStorage.setItem(key, JSON.stringify(dataToSave));

                return true;
            });
        } catch (error) {
            console.error('❌ Erro ao salvar estratégia traduzida:', error);
            return false;
        }
    }

    // 🔐 Carregar estratégia traduzida com validação de segurança
    loadTranslatedStrategy() {
        try {
            const currentUser = SessionManager.getCurrentUser();
            if (!currentUser) {

                return null;
            }

            const key = `translated_strategy_${this.sessionId}`;
            const data = localStorage.getItem(key);
            if (!data) return null;

            const parsedData = JSON.parse(data);

            // 🔍 Validar que os dados pertencem ao usuário atual
            if (parsedData._userId && parsedData._userId !== currentUser.loginid) {

                localStorage.removeItem(key);
                return null;
            }

            // 📊 Retornar apenas a estratégia, sem metadados
            return parsedData.strategy || parsedData;
        } catch (error) {
            console.error('❌ Erro ao carregar estratégia traduzida:', error);
            return null;
        }
    }

    // 🗑️ Limpar estratégia salva com segurança
    clearTranslatedStrategy() {
        const currentUser = SessionManager.getCurrentUser();
        if (currentUser) {
            const key = `translated_strategy_${this.sessionId}`;
            localStorage.removeItem(key);

        }
    }

    // Método para testar a conexão com Gemini (com fallback automático)
    async testConnection() {
        if (!this.apiKey) {
            console.error("❌ API Key não configurada para teste");
            return false;
        }


        for (let i = 0; i < this.modelVersions.length; i++) {
            try {
                const model = this.modelVersions[i];
                this.baseUrl = model.url;


                const testPrompt = "Responda apenas com a palavra 'OK' se você conseguir me entender.";
                const response = await this.callGeminiAPI(testPrompt);

                if (response && response.includes && response.includes('OK')) {

                    this.currentModelIndex = i;
                    return true;
                }

            } catch (error) {

            }
        }

        console.error("❌ Todas as versões falharam no teste de conexão");
        return false;
    }

    // Obter status de todas as versões disponíveis
    getAvailableVersions() {
        return this.modelVersions.map((model, index) => ({
            ...model,
            isCurrent: index === this.currentModelIndex,
            status: index === this.currentModelIndex ? 'ativa' : 'disponível'
        }));
    }

    // Forçar mudança para uma versão específica
    switchToVersion(versionName) {
        const versionIndex = this.modelVersions.findIndex(model => model.name === versionName);

        if (versionIndex !== -1) {
            this.currentModelIndex = versionIndex;
            this.baseUrl = this.modelVersions[versionIndex].url;

            return true;
        } else {
            console.error(`❌ Versão ${versionName} não encontrada`);
            return false;
        }
    }

    // Obter informações da versão atual
    getCurrentVersion() {
        return this.modelVersions[this.currentModelIndex];
    }

    // Método para gerar conteúdo com suporte a AbortController
    async generateContent(prompt, systemInstruction = '', options = {}) {
        try {
            await this.loadApiKeyFromSecrets();

            if (!this.apiKey) {
                throw new Error('API Key do Gemini não encontrada. Verifique se GEMINI_API_KEY está definida nos Secrets.');
            }

            // 🔧 CORREÇÃO: Usar this.baseUrl dinâmico em vez de URL hardcoded
            // Isso garante que a versão correta do modelo seja usada (v1 ou v1beta)
            const url = `${this.baseUrl}?key=${this.apiKey}`;

            // Construir parts do usuário
            const userParts = [];

            // Adicionar texto
            if (prompt) {
                userParts.push({ text: prompt });
            }

            // Adicionar imagem se fornecida
            if (options.imageData) {
                userParts.push({
                    inlineData: {
                        mimeType: options.imageData.mimeType,
                        data: options.imageData.data
                    }
                });
            }

            const requestBody = {
                contents: [
                    ...(systemInstruction ? [{
                        role: "user",
                        parts: [{ text: systemInstruction }]
                    }] : []),
                    {
                        role: "user",
                        parts: userParts
                    }
                ],
                generationConfig: {
                    temperature: options.temperature || 0.7,
                    topK: options.topK || 40,
                    topP: options.topP || 0.95,
                    // 🔧 AUMENTADO: De 2048 para 8192 para acomodar thinking tokens do gemini-2.5-flash
                    // O modelo usa ~2000 tokens para "pensamento interno", precisamos de mais espaço
                    maxOutputTokens: options.maxOutputTokens || 8192,
                }
            };

            // 🛡️ SEGURANÇA: Redirecionar via Proxy Seguro no Servidor
            const proxyUrl = '/api/ai/proxy';

            const proxyBody = {
                loginId: SessionManager.getUserSessionId(),
                token: (SessionManager.getLocalToken() || localStorage.getItem(`token_${SessionManager.getUserSessionId()}`) || localStorage.getItem(`access_token_session_${SessionManager.getUserSessionId()}`) || '').trim(),
                contents: requestBody.contents,
                generationConfig: requestBody.generationConfig,
                modelUrl: this.baseUrl,
                isAlreadyDebited: options.isAlreadyPaid || false
            };

            const response = await fetch(proxyUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(proxyBody),
                signal: options.signal
            });

            if (!response.ok) {
                const errorText = await response.text().catch(() => 'Erro desconhecido ao processar erro HTTP');
                console.error(`❌ Erro na chamada à API Gemini: ${response.status} ${response.statusText} - ${errorText}`);
                throw new Error(`Falha ao gerar conteúdo: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();

            // Verificar se há candidatos
            if (data.candidates && data.candidates.length > 0) {
                const candidate = data.candidates[0];

                // 🛡️ VERIFICAR: Razão de finalização
                if (candidate.finishReason === 'MAX_TOKENS') {

                    throw new Error('Resposta truncada: MAX_TOKENS atingido. Configure maxOutputTokens maior.');
                }

                if (candidate.finishReason === 'SAFETY') {

                    throw new Error('Resposta bloqueada por filtro de segurança');
                }

                // Verificar se há content.parts
                if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
                    return candidate.content.parts.map(part => part.text).join('');
                } else {
                    console.error('❌ [GEMINI-API] candidate.content não tem parts:', candidate.content);
                }
            }

            // Tentar diferentes formatos de resposta
            if (data.predictions && data.predictions.length > 0 && data.predictions[0].content && data.predictions[0].content.parts) {
                return data.predictions[0].content.parts.map(part => part.text).join('');
            } else if (data.text) {
            } else if (data.text) {
                return data.text;
            } else if (data.content && typeof data.content === 'string') {
            } else if (data.content && typeof data.content === 'string') {
                return data.content;
            } else if (typeof data === 'string') {
            } else if (typeof data === 'string') {
                return data;
            } else {
                console.error("❌ Resposta inesperada da API Gemini:", data);
                console.error("❌ Estrutura disponível:", Object.keys(data));
                throw new Error("Formato de resposta inesperado da API Gemini");
            }
        } catch (error) {
            // Verifica se o erro foi devido ao cancelamento
            if (error.name === 'AbortError') {

                return null; // Retorna null ou um valor indicando cancelamento
            }
            console.error('Erro ao gerar conteúdo com Gemini:', error);
            throw error; // Re-lança o erro para ser tratado pelo chamador
        }
    }

    /**
     * Chat conversacional com Gemini AI
     * @param {string} userMessage - Mensagem do usuário
     * @param {string} marketContext - Contexto de mercado (opcional)
     * @param {object} imageData - Dados da imagem (opcional) { mimeType, data }
     * @returns {Promise<string>} Resposta do Gemini
     */
    async chatWithAI(userMessage, marketContext = '', imageData = null) {
        // Verificar créditos ANTES de chamar API (Bypass para Admin)
        const isAdmin = typeof UserLevelsManager !== 'undefined' && UserLevelsManager.getCurrentUserLevel() === 'admin';

        if (!isAdmin) {
            const credits = await CreditsManager.getCurrentCredits();
            if (credits < 1) {
                const error = new Error('Créditos insuficientes');
                error.message = 'INSUFFICIENT_CREDITS';
                throw error;
            }
        }

        if (!this.apiKey) {
            throw new Error("API Key do Gemini não configurada");
        }

        try {
            // Obter ativo atual do usuário
            const token = SessionManager.getLocalToken();
            const marketData = token ? getMarketDataInstance(token) : null;
            const currentSymbol = marketData ? (marketData.currentActiveSymbol || marketData.activeSymbol || 'não definido') : 'não definido';

            // Montar prompt ESPECÍFICO para Deriv.com
            let fullPrompt = `Você é uma IA especialista em trading EXCLUSIVAMENTE para a plataforma Deriv.com.

🎯 REGRAS IMPORTANTES:
1. SEMPRE baseie suas respostas nos dados REAIS fornecidos abaixo
2. NUNCA dê respostas genéricas sobre "mercado financeiro em geral"
3. FOQUE APENAS nos tipos de contrato da Deriv: Over/Under, Digits (Match/Differs), Rise/Fall, Higher/Lower
4. Use APENAS o ativo atual do usuário: ${currentSymbol}
5. Analise os dados históricos fornecidos para dar recomendações ESPECÍFICAS
6. Seja DIRETO e PRÁTICO - sem teoria genérica de trading

📊 ATIVO ATUAL DO USUÁRIO: ${currentSymbol}

❓ PERGUNTA DO USUÁRIO:
${userMessage}`;

            // Adicionar contexto de mercado se disponível
            if (marketContext && !marketContext.includes('não disponível')) {
                fullPrompt += `\n\n📈 DADOS HISTÓRICOS REAIS (use estes dados para sua análise):\n${marketContext}`;

                fullPrompt += `\n\n💡 INSTRUÇÕES DE RESPOSTA:
- Analise os dados históricos acima
- Identifique padrões específicos nos últimos valores
- Recomende um tipo de contrato ESPECÍFICO da Deriv (ex: "Over 5", "Digit Differs 3", etc.)
- Explique BREVEMENTE o porquê baseado nos dados
- NÃO dê conselhos genéricos de "diversificação" ou "gestão de risco" - seja ESPECÍFICO para este momento e este ativo`;
            } else {
                fullPrompt += `\n\n⚠️ ATENÇÃO: Não há dados históricos disponíveis no momento.
- Informe ao usuário que precisa de dados do mercado para análise precisa
- Sugira que ele faça uma pergunta mais específica mencionando "dígitos", "preços" ou "indicadores"
- NÃO invente análises sem dados reais`;
            }

            // Chamar API do Gemini usando generateContent
            // Passar imageData nas options
            const response = await this.generateContent(fullPrompt, '', { imageData });

            // ✅ NOTA: O débito agora é feito AUTOMATICAMENTE pelo servidor via Proxy
            // em caso de sucesso da API, garantindo segurança e justiça (não debita se falhar).

            return response;

        } catch (error) {
            console.error('❌ [AI CHAT] Erro ao processar chat:', error);

            // NÃO descontar crédito em caso de erro
            if (error.message === 'INSUFFICIENT_CREDITS') {
                throw error;
            }

            throw new Error(`Erro ao processar mensagem: ${error.message}`);
        }
    }
}

// Singleton para uso global
let geminiInstance = null;

function getGeminiInstance() {
    if (!geminiInstance) {
        geminiInstance = new GeminiAI();
    }
    return geminiInstance;
}

// Função auxiliar para obter instância do FormatGenerator
function getFormatGeneratorInstance() {
    if (typeof window !== 'undefined' && window.formatGeneratorInstance) {
        return window.formatGeneratorInstance;
    }

    // Fallback se a instância global não estiver disponível
    return {
        formatGeminiResponse: (response) => {
            console.warn("⚠️ FormatGenerator não disponível, retornando resposta original");
            return response;
        }
    };
}