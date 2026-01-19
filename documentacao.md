# Documentação do Fluxo do Sistema de Bot de Trading (Strategy Free)

Helder, boa noite! Aqui em Canguaretama, Rio Grande do Norte, deve estar uma noite quente de verão (janeiro de 2026, por volta das 18:54 no horário local -03). Como você pediu uma análise completa do fluxo do sistema, compilei uma documentação detalhada baseada nos arquivos fornecidos (como monitoring.js, gemini-ai.js, trade-manager.js, configurations.js, e outros). Usei uma abordagem sistemática para mapear o processo end-to-end, focando nas áreas que mencionou: configuração de estratégias, Trade (execução), gestão (risco e controle), IA (Gemini para análise), grupos de regras, e resultados/simulação.

Essa documentação é derivada da análise do código legado, destacando métodos, arquivos e fluxos lógicos. O sistema é monolítico (muitos globals e singletons), com ênfase em isolamento por usuário via `SessionManager.getUserSessionId()`. Ele integra Deriv API para market data, Gemini para IA, e Firebase para storage/cache. O fluxo é assíncrono, impulsionado por eventos (ex.: 'tickUpdate', 'tradeResult') e UI interativa.

## Visão Geral do Sistema
- **Objetivo**: Permitir que usuários configurem estratégias de trading em texto natural, usem IA para traduzi-las em regras JSON executáveis, configurem parâmetros de trade/gestão, e executem/simulem trades em ativos Deriv (ex.: dígitos, over/under).
- **Componentes Chave**:
  - **UI/Views**: monitoring.js (entrada de estratégias), configurations.js (parâmetros de trade).
  - **IA**: gemini-ai.js (tradução de texto para JSON).
  - **Lógica de Negócio**: trade-manager.js (execução de trades), generate-format.js (validação de regras).
  - **Dados/Real-time**: deriv-market-data.js (ticks/preços), trade-messages.js (resultados).
  - **Gestão/Controle**: TradeModeRiskController.js (risco, streaks), cooldown-overlay.js (pausas).
  - **Simulação**: Modo 'SIMULACAO' em trade-manager.js.
- **Fluxo Alto Nível**: Usuário insere texto → IA traduz → Configura trade/gestão → Verifica regras em real-time → Executa trade/simulação → Mostra resultados.
- **Segurança/Isolamento**: Todo arquivo repete `this.sessionId = SessionManager.getUserSessionId();` para isolar dados por usuário (localStorage com prefixos, sessions separadas).

## Fluxo Detalhado do Sistema
Dividi em etapas lógicas, com arquivos/métodos envolvidos, entradas/saídas, e condições. O fluxo inicia no login (app-manager.js/session.js) e foca na configuração pós-autenticação.

### 1. Inicialização e Login (Pré-Configuração)
- **Descrição**: O sistema carrega, autentica via OAuth/Deriv, e prepara a UI. Isso é pré-requisito para configurações.
- **Arquivos Principais**:
  - app.js: Verifica rota `/app` e inicia AppManager.
  - app-manager.js: `init()` – Carrega scripts sequencialmente (session.js, deriv-api.js, etc.), conecta WS Deriv, e dispara 'AppManagerReady'.
  - session.js: `generateUserSessionId(loginId)` – Cria ID único por usuário; `getLocalToken()` para auth.
  - loading-manager.js: Mostra tela de loading com progresso (ex.: "Validando sessão...").
- **Fluxo**:
  1. Usuário acessa `/app` → Redireciona para OAuth se sem token (config.js: `getOAuthURL()`).
  2. Pós-OAuth: Salva token (token-backend-client.js: `saveToken()`), cria sessionId.
  3. Carrega UI inicial (ui.js: `displayUserDashboard(container, userData)`).
- **Entradas/Saídas**: Entrada: URL params (token); Saída: Session ativa, UI renderizada.
- **Condições**: Se admin/VIP (user-levels.js: `getCurrentUserLevel()`), habilita features extras.

### 2. Configuração de Estratégias (Entrada e Salvamento)
- **Descrição**: Usuário insere texto de estratégia (ex.: "Entre over 5 quando RSI > 70") via textarea. Sistema salva, valida e prepara para IA.
- **Arquivos Principais**:
  - monitoring.js: UI principal para input (textarea ID 'strategy-text').
  - rules-history-manager.js: Gerencia histórico/salvamento.
  - Auxiliar-regras.js: Assistente para gerar texto de estratégias (modal com passos).
  - IA.js: Gera sugestões automáticas via IA.
- **Fluxo**:
  1. Renderiza view: `MonitoringView.render(containerId)` – Cria textarea e botões (ex.: "Salvar Estratégia", "Traduzir com Gemini").
  2. Usuário digita texto: Evento 'input' em textarea → `autoResize()` ajusta altura; `saveStrategy()` salva em localStorage (`rules_history_${sessionId}`).
  3. Opcional: Usa auxiliar (AuxiliarRegras: `startWizard()`) – Modal guia o usuário para criar texto compatível (ex.: seleciona contratos, condições).
     - Método: `handleNext()` – Coleta respostas e gera texto final.
  4. Opcional: Sugestões IA (IA.js: `generateRuleSuggestions()`) – Botão "🤖IA" → Monta prompt → Envia para Gemini → Insere sugestões no textarea (ModalSuggestoesIA: `showSuggestions(suggestions)`).
  5. Validação Inicial: `gemini-strategy-validator.js`: `validate(strategyText)` – Checa ambiguidades (ex.: padrões vagos) antes de enviar para IA.
- **Entradas/Saídas**: Entrada: Texto do usuário; Saída: Texto salvo em cache/histórico (JSON com timestamp).
- **Condições**: VIP/Admin para features avançadas (level-features.js: `hasFeature('advancedIndicators')`); Erros mostram modal (modalErros.js).

### 3. Integração com IA (Análise/Tradução da Estratégia)
- **Descrição**: Texto é pré-processado, enviado para Gemini para tradução em regras JSON estruturadas (ex.: {type: 'rsi', condition: '>', value: 70}).
- **Arquivos Principais**:
  - monitoring.js: Inicia o processo.
  - strategy-preprocessor.js: Pré-processa texto.
  - gemini-strategy-validator.js: Valida pré-envio.
  - gemini-ai.js: Envio para API Gemini.
  - generate-format.js: Formata resultado.
  - regras-json.js: Cacheia JSON traduzido.
- **Fluxo**:
  1. Botão "Traduzir" clicado (monitoring.js: `translateWithGemini(strategyValue)`) → Pega `strategyText` do textarea.
  2. Pré-Processamento: `strategy-preprocessor.js`: `processStrategy(strategyText)` – Normaliza termos (ex.: 'media movel' → 'SMA'), corrige erros (`autoCorrect()`), extrai entidades (`extractAllEntities()`).
     - Método: `validateSyntax(strategyText)` – Checa operadores, valores numéricos.
  3. Validação: `gemini-strategy-validator.js`: `validate(strategyText)` – Detecta padrões problemáticos (ex.: vagas como "às vezes"), sugere correções (`suggestCorrections()`).
     - Se erros: Mostra modal (strategy-validation-modal.js: `show(validationResult, originalStrategy)`).
  4. Envio para IA: `gemini-ai.js`: `translateStrategy(strategyText)` – Monta prompt (`buildPrompt(strategyText)` com instruções para JSON), envia via `sendToGemini(prompt)` (POST para API Gemini).
     - Animação: gemini-translation-animation.js: `start()` – Mostra progresso (ex.: "Analisando estratégia...").
  5. Pós-Análise: `formatGeminiResponse(response)` – Formata para JSON válido (generate-format.js: `canonizePercentageRule()`, etc.).
     - Cache: regras-json.js: `setCachedGeminiJson(geminiJson)`.
- **Entradas/Saídas**: Entrada: Texto cru; Saída: JSON de regras (ex.: array de {type: 'percentage', parameters: {...}}).
- **Condições**: Créditos VIP (credits-manager.js: `deductCredits()`); Modo simulado para admins (admin-gemini-toggle.js).

### 4. Configurações de Trade, Gestão e Controle
- **Descrição**: Após tradução, usuário configura parâmetros como stake, duração, modo (simulação/real), limites de risco, Gale (martingale).
- **Arquivos Principais**:
  - configurations.js: UI para inputs (ex.: stake, duration).
  - TradeSessionConfig.js: Salva configs.
  - TradeModeRiskController.js: Gestão de risco (streaks, accumulatedLosses).
  - rule-compatibility-validator.js: Valida compatibilidade (ex.: regras vs. contrato).
- **Fluxo**:
  1. Renderiza configs: `ConfigurationsView.render(containerId)` – Inputs como 'stake-input', 'duration-input', selects para modo ('SIMULACAO', 'REAL').
  2. Salva Configs: `saveConfiguration()` – Armazena em TradeSessionConfig (`this.config = this.loadConfiguration();`).
  3. Gestão de Risco: `TradeModeRiskController.updateOnTradeResult(isWin, profit)` – Atualiza streaks (ex.: `realWinsStreak++`), verifica limites (`checkStopConditions()`).
     - Gale: `applyGale()` – Aumenta stake em perdas (`this.accumulatedLosses += lossAmount`).
  4. Controle: cooldown-overlay.js: `activateCooldown(ticks)` – Pausa após trade; stop-monitor.js: `showStopTradePopup(type, currentValue, limitValue)` para limites atingidos.
  5. Validação: `RuleCompatibilityValidator.validateAllRules(translatedRules)` – Checa se regras batem com configs (ex.: dígitos vs. contrato 'DIGITOVER').
- **Entradas/Saídas**: Entrada: Valores de forms; Saída: Configs salvas (JSON em session).
- **Condições**: Modo 'SIMULACAO' ignora API real; VIP para limites altos.

### 5. Grupos de Regras (Avaliação Lógica)
- **Descrição**: Regras são agrupadas (AND dentro do grupo, OR entre grupos). Sistema verifica em real-time.
- **Arquivos Principais**:
  - monitoring.js: Avalia grupos.
  - generate-format.js: Canoniza regras para grupos (`canonizePercentageRule(rawRule)`).
  - digit-pattern-rules.js/percentage-rules.js/price-movement-rules.js: Processadores por tipo de regra.
- **Fluxo**:
  1. Pós-Tradução: Regras em JSON têm "groups" (array de {id: 1, rules: [...] }).
  2. Avaliação: `checkRulesForTrading(translatedRules, forcedPrice)` – Para cada grupo: `allRulesInGroupSatisfied = rules.every(rule => checkRuleCondition(rule))`.
     - Se qualquer grupo satisfeito (`anyGroupSatisfied`), captura ID do grupo e previsão (ex.: dígito via ProbabilityResolver).
  3. Processadores: Ex.: `PercentageRulesProcessor.processPercentageRule(rule)` – Calcula percentuais de dígitos.
- **Entradas/Saídas**: Entrada: JSON regras; Saída: Grupo satisfeito (ID), previsão para trade.
- **Condições**: Dados de ticks reais (deriv-market-data.js: `subscribeToTicks(symbol)`).

### 6. Execução de Trades e Resultados/Simulação
- **Descrição**: Quando regras batem, executa trade (real/simulado). Mostra resultados em mensagens/histórico.
- **Arquivos Principais**:
  - monitoring.js: `executeTradeBasedOnRules(satisfiedGroupId, capturedPrediction)`.
  - trade-manager.js: Execução core.
  - TradeSettlementReporter.js: Relata resultados.
  - trade-messages.js: Mostra mensagens (wins/losses).
- **Fluxo**:
  1. Regras Batem: monitoring.js chama `getTradeManagerInstance().executeTrade(entryPrice, satisfiedGroupId)`.
  2. Execução: `executeTrade(...)` – Verifica modo:
     - Simulação: `executeSimulatedTrade(entryPrice)` – Simula resultado baseado em ticks futuros (sem API real), atualiza contadores (`historyCounters.simulatedWinsTotal++`).
     - Real: `executeRealTrade(entryPrice)` – Monta proposta (`buildProposalParams()`), envia `api.sendRequest(buyParams)` via Deriv API.
     - Múltiplos (BOTH): `executeBothTrade(...)` – Usa TradeContractSelector para múltiplos contratos.
  3. Pós-Trade: `onTradeResult(contract)` – Atualiza P&L (`sessionProfitLoss += profit`), streaks, e mensagens (trade-messages.js: `addTradeResultMessage(...)`).
     - Simulação: Registra em histórico (TradeSettlementReporter: `addTradeResultMessage(...)`).
  4. Resultados: Display em UI (trade-messages.js: `updateCountersDisplay()`), gráfico (chart-modal.js), planilha manual (planilhaTrade.js).
     - Histórico: rules-history-manager.js: `addToHistory(strategyText, translatedRules)`.
- **Entradas/Saídas**: Entrada: Preço de entrada, grupo ID; Saída: Resultado (win/loss, profit), atualizações UI.
- **Condições**: Cooldown ativo bloqueia (cooldown-overlay.js); Limites de risco param (stop-monitor.js).

## Diagrama Simplificado do Fluxo (Texto)
```
Login/OAuth (app-manager.js) → UI Render (monitoring.js)
↓
Entrada Estratégia (textarea) → Salvar (saveStrategy())
↓
Pré-Processo/Validação (strategy-preprocessor.js + gemini-strategy-validator.js)
↓
Envio IA (gemini-ai.js: translateStrategy()) → JSON Regras
↓
Config Trade/Gestão (configurations.js: saveConfiguration()) + Risco (TradeModeRiskController)
↓
Avaliação Regras/Grupos (monitoring.js: checkRulesForTrading()) em Ticks (deriv-market-data.js)
↓
Regras Batem? → Execute Trade/Simulação (trade-manager.js: executeTrade())
↓
Resultados (trade-messages.js) + Histórico (rules-history-manager.js)
```

! 😊