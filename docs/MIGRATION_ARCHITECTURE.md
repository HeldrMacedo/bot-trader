# Arquitetura de Migração: Sistema de Análise de Mercado

## Visão Geral

Esta documentação descreve a arquitetura de migração do sistema de análise de mercado do código legado (bot-ia-v2) para o novo sistema Next.js (trade-mind-pro). Última atualização: reflete o estado real do código em produção.

## Fluxo de Dados

```
┌─────────────────────────────────────────────────────────────────────────┐
│                             FLUXO DE DADOS                              │
└─────────────────────────────────────────────────────────────────────────┘

┌──────────────┐     ┌──────────────────┐     ┌──────────────────────┐
│  page.tsx    │────▶│  Monitoring.ts   │────▶│  LegacyBridge.ts     │
│  (React)     │     │  (Singleton)     │     │  (EventEmitter)      │
└──────────────┘     └──────────────────┘     └──────────────────────┘
       │                      │                          │
       │                      ▼                          ▼
       │             ┌──────────────┐         ┌──────────────────┐
       │             │ DerivService │         │  Scripts JS       │
       │             │  (WebSocket) │         │  Legados (30+)   │
       │             └──────────────┘         └──────────────────┘
       │                      │                          │
       ▼                      ▼                          ▼
┌──────────────┐     ┌──────────────┐         ┌──────────────────┐
│ MarketAnalysis│◀────│    Ticks     │         │  window.trade    │
│    Panel     │      │  (Real-time) │         │  Manager (exec.) │
│  (Visual)    │      └──────────────┘         └──────────────────┘
└──────────────┘
```

## Layout da Interface (page.tsx)

```
┌────────────────────┬─────────────────────────────────────────────────┐
│  SIDEBAR ESQUERDA  │              ÁREA PRINCIPAL                      │
│  (w-80, fixo)      │                                                  │
│                    │  Tabs: [IA Trader] [Dashboard] [Editor Visual]   │
│  [AccountSelector] ├─────────────────────────────────────────────────┤
│  [Volatility]      │                                                  │
│                    │  mainView='chat':    AiChatPanel (full)          │
│  Tabs:             │  mainView='dashboard': BotDashboard              │
│  [Trade][Gestão]   │  mainView='blockly': BlocklyEditor               │
│  [Controler]       │                                                  │
│                    ├─────────────────────────────────────────────────┤
│  ↕ Config Ativa    │  PAINEL DIREITO (quando símbolo selecionado)     │
│                    │  MarketAnalysisPanel (oculto no blockly)         │
│  [INICIAR/PARAR]   │                                                  │
└────────────────────┴─────────────────────────────────────────────────┘
```

## Componentes

### 1. page.tsx (Componente Principal)

**Estado Gerenciado:**
```typescript
// Navegação
const [activeTab, setActiveTab]   // 'trade' | 'management' | 'controller'
const [mainView, setMainView]     // 'dashboard' | 'chat' | 'blockly'

// Configurações (carregadas do localStorage no mount)
const [tradeConfig, setTradeConfig]           // localStorage: 'trade_config_trade'
const [managementConfig, setManagementConfig] // localStorage: 'trade_config_management'
const [controllerConfig, setControllerConfig] // localStorage: 'trade_config_controller'

// Execução
const [isRunning, setIsRunning]
const [isStarting, setIsStarting]
const [logs, setLogs]
const [resultsList, setResultsList]
const recentTradeKeysRef = useRef<Set<string>>()  // deduplicação de trades

// IA & Estratégia
const [messages, setMessages]
const [isAiProcessing, setIsAiProcessing]
const [aiMode, setAiMode]          // 'strategy' | 'chat' | 'config'
const [aiProgressMessage, setAiProgressMessage]
const [translatedRules, setTranslatedRules]

// Mercado
const [selectedSymbol, setSelectedSymbol]   // persiste em localStorage 'selectedSymbol'
const [marketStats, setMarketStats]         // ProbabilityStats
const [rulesVisualData, setRulesVisualData] // RulesVisualData
```

**Fluxo de Inicialização:**
1. Lê `deriv_accounts` do localStorage → redireciona para `/home` se vazio
2. `DerivService.getInstance().connect()` → aguarda 100ms → `authenticate(activeToken)`
3. Quando `selectedSymbol` muda → `monitoringService.start({ symbol, callbacks... })`
4. LegacyBridge registra listeners: `bridge.on('trade', ...)`, `bridge.on('mode_change', ...)`, `bridge.on('stop_limit', ...)`
5. Listener de fallback: `window.addEventListener('tradeResultFront', ...)` — capta trades que o interceptor do LegacyBridge não captura

**Deduplicação de Trades:**
Chave: `contractType|status|exitPrice(2dec)|stake|timeWindow(2s)` com TTL de 4s no Set.

**`toggleBot()` — Sequência de Início:**
1. Valida símbolo selecionado
2. `bridge.loadLegacyScripts()` (idempotente)
3. Salva config completa em `trade_config_full`
4. `bridge.configureTradeManager(config)` → mapeia React config → TradeManager legado
5. Se não há `translatedRules` → `setTranslatedRules({ groups: [], contract_type: null, prediction: null })` (modo entrada imediata)
6. `monitoringService.startExecution(groupActivation, cooldownPeriod)`
7. `setIsRunning(true)` + `setMainView('dashboard')`

### 2. Monitoring.ts (Serviço de Monitoramento)

**Singleton** (`monitoringService` exportado como instância global).  
Exposto em `window.MonitoringServiceInstance` para debugging.

**Interfaces Públicas:**

```typescript
interface ProbabilityStats {
  probabilities: number[];           // array[10]: prob de cada dígito (0-9) em %
  mostProbable: number;              // dígito mais provável
  leastProbable: number;             // dígito menos provável
  mostProbableValue: number;         // prob do mais provável (%)
  leastProbableValue: number;        // prob do menos provável (%)
  highestStrength: number;           // consensus alto (≥ 1)
  lowestStrength: number;            // consensus baixo (≥ 1)
  sortedScores: { digit: number; prob: number }[];
  topN?: number;                     // configurado via localStorage 'prob_accuracy_topN'
  topNDigits?: number[];             // top N dígitos por score final
}

interface CapturedPrediction {
  contractType: string;              // ex: 'DIGITDIFF', 'CALL'
  predictionValue: number | string | null;
  _triggerDigit?: number;
  rule?: any;
}

interface RulesVisualData {
  groups: RulesVisualGroup[];
  isPreview: boolean;
  timestamp: number;
  activeGroupIds: number[] | null;
}

interface Config {
  symbol: string;
  onTick?: (data: TickData) => void;
  onProbabilityUpdate?: (stats: ProbabilityStats) => void;
  onRulesVisualUpdate?: (rulesData: RulesVisualData) => void;
  onTradeSignal?: (groupId: number | string, entryPrice: number, capturedPredictions: CapturedPrediction[] | null) => void;
}
```

**Métodos Públicos:**

| Método | Descrição |
|--------|-----------|
| `start(config)` | Inicia monitoramento: carrega scripts legados + inscreve ticks |
| `stop()` | Para monitoramento: remove listener, limpa histórico, state='IDLE' |
| `translateStrategy(text, onProgress?)` | Resolve por cache/histórico/Gemini com feedback de progresso |
| `_validatePreconditions(text, config)` | Valida estratégia vs contrato via `rule-compatibility-validator.js` |
| `setTranslatedRules(rules, autoStart?)` | Carrega regras no serviço, gera visual data via `getFormatGeneratorInstance()` |
| `updateGroupActivation(config)` | Atualiza ativação de grupos sem reiniciar execução |
| `startExecution(groupActivation?, cooldownTicks?)` | Habilita emissão de sinais de trade |
| `stopExecution()` | Desabilita emissão de sinais |
| `notifyTradeResult(result, simulated)` | Notifica resultado do trade → reseta cooldown e `isAwaitingTrade` |
| `calculateProbabilities(excludeLastTick?)` | Calcula stats — requer mínimo 10 ticks no histórico |

**Estado Interno:**

```typescript
private probabilityHistory: number[]     // histórico de dígitos, máx 200
private globalTickCounter = 0
private currentTickPrice = 0
private isExecutionActive = false
private isAwaitingTrade = false          // evita trades simultâneos
private groupActivationConfig: Record<number, any> | null
private lastTradeOutcome: { result: string; simulated: boolean } | null
private cooldownTicksRemaining = 0
private cooldownTicksTotal = 0
```

**Processamento de tick (`handleTick`):**
1. Reseta `tradeManager.resetTradesCounter(tick.epoch)` se disponível
2. Extrai dígito via `extractLastDigit(price, symbol)` (precisão por símbolo)
3. Adiciona ao `probabilityHistory` (máx 200)
4. `calculateProbabilities()` → callback `onProbabilityUpdate`
5. `setTranslatedRules(current, false)` → atualiza visual data
6. `updateLegacySystem(symbol, price, digit, stats)` → dispara `marketDataUpdate` CustomEvent
7. Avalia regras se `isExecutionActive && !isAwaitingTrade && cooldownTicksRemaining <= 0`
8. Se regras satisfeitas → `extractCapturedPredictions()` → callback `onTradeSignal`

### 3. LegacyBridge.ts (Ponte para Legado)

**Estende `EventEmitter`** (Node.js) — usa `emit/on/removeListener`.

**Scripts Carregados (ordem obrigatória):**
```
1. Utils
   └─ common-helpers.js, deriv-market-data.js

2. Regras e Indicadores
   ├─ rsi-indicator.js, sma-indicator.js
   ├─ probability-accuracy.js
   ├─ digit-pattern-rules.js
   ├─ percentage-rules.js
   └─ price-movement-rules.js

3. Estratégia Base
   ├─ regras-json.js
   ├─ rules-history-manager.js
   └─ rule-compatibility-validator.js

4. AI Modules (Factories)
   ├─ prompt-manager.js         → getPromptManagerInstance
   ├─ generate-format.js        → getFormatGeneratorInstance (★ salvo após carregamento)
   ├─ strategy-preprocessor.js  → getStrategyPreprocessorInstance
   ├─ gemini-strategy-validator.js
   ├─ gemini-ai.js              → getGeminiInstance
   └─ ai-chat-context.js

5. Trade Execution
   ├─ trade/TradeContractSelector.js
   ├─ trade/TradeModeRiskController.js
   ├─ trade/TradeSessionConfig.js
   ├─ trade/TradeSettlementReporter.js
   ├─ commission-tracker.js
   ├─ stop-monitor.js
   ├─ pause_manager.js
   └─ trade-manager.js          → window.tradeManager (instância global)
```

> **Importante:** `loadScript()` **força reload** a cada chamada — remove o `<script>` existente e adiciona `?v=<timestamp>` para evitar cache do navegador.

**Shims Configurados (`setupShims`):**

| Global | Implementação |
|--------|---------------|
| `window.selectedSymbol` | `get/set` → `localStorage('selectedSymbol')` |
| `window.logConfig` | `{ shouldLog, info, warn, error, debug }` + emite `bridge.emit('log', ...)` |
| `window.CreditsManager` | Mock com créditos infinitos e custo zero |
| `window.UserLevels` | Mock sempre VIP |
| `window.SessionManager` | Lê dados de `localStorage('deriv_accounts')` — necessário para `gemini-ai.js` |

**Interceptadores (configurados 2s após carregamento):**

| Interceptador | Evento Emitido | Payload |
|---------------|---------------|---------|
| `StopMonitor.showStopTradePopup` | `stop_limit` | `{ type, currentValue, limitValue, message }` |
| `StopMonitor.stopAllMonitoring` | (chama `stopAllMonitoring`) | — |
| `tradeManager.onModeChange` | `mode_change` | `{ mode, reason, previousMode }` |
| `tradeManager.onTradeStart` | `trade_start` | `{ contractId }` |
| `tradeManager.onTradeEnd` | `trade_end` | `{ contractId, result }` |

**Mapeamento `configureTradeManager` (React → Legado):**

```typescript
// Campos mapeados diretamente
symbol, contractType, duration, durationUnit, barrier, stake
galeActive, galeAdjustment, galeSplit, galeSplitThreshold
cooldownPeriod, sorosLimit, sorosPercentage, galeRemovesSoros
goal, stopLoss, tradeReal

// Campos renomeados
prediction  → { type: 'prediction', value: Number(prediction) }
winReal     → realWinsLimit
lossReal    → realLossesLimit
winSimulated → simulatedWinsLimit
lossSimulated → simulatedLossesLimit
```

Após configurar, chama `tm.computeStartMode()` + `tm.setMode(startMode)` + `tm.start()`.

**Métodos Públicos:**

| Método | Descrição |
|--------|-----------|
| `loadLegacyScripts()` | Idempotente — carrega uma vez, reutiliza depois |
| `configureTradeManager(config)` | Mapeia config React → TradeManager legado e inicia |
| `stopTradeManager()` | Para `window.tradeManager` |
| `stopLegacyMonitoring()` | Para via `MonitoringView.stopMonitoring()` ou fallback |
| `stopAllMonitoring()` | Para via `MonitoringView.stopAll()` ou fallback |
| `getGeminiAI()` | Retorna instância via `getGeminiInstance()` |
| `getStrategyPreprocessor()` | Retorna instância via `getStrategyPreprocessorInstance()` |
| `updateTradeConfig(config)` | Atualiza config do TradeManager sem reiniciar |
| `startMonitoring(strategyText)` | Passa estratégia para `window.MonitoringView` (modo headless) |
| `verifyMarketDataConnection(symbol)` | Aguarda evento `marketDataUpdate` em 5s |

### 4. MarketAnalysisPanel.tsx (Visualização)

Exibe dados em tempo real do `MonitoringService`. Só renderizado quando `selectedSymbol` está definido e `mainView !== 'blockly'`.

**Props:**
```typescript
symbol: string
marketStats: ProbabilityStats | null    // nulo até 10 ticks acumulados
rulesVisualData: RulesVisualData | null
```

## Algoritmo de Probabilidades

### Fórmula Final por Dígito

```
Final = (base + gapBonus + dynamicBias) - saturationPenalty

base              = média ponderada entre os 5 períodos
saturationPenalty = (freq_longterm - 15) × 2.0    se freq > 15%
dynamicBias       = varia conforme último dígito e taxa de repetição
gapBonus          = (gap/10)²                      se ausência ≥ 10 ticks
```

### Períodos e Pesos

```typescript
const periods = [
  { name: '1-10',   data: history.slice(-10),      weight: 5.0 },
  { name: '10-25',  data: history.slice(-25, -10), weight: 2.5 },
  { name: '25-50',  data: history.slice(-50, -25), weight: 1.0 },
  { name: '50-100', data: history.slice(-100, -50),weight: 0.5 },
  { name: '1-100',  data: history.slice(-100),     weight: 0.5 },
];
```

### Dynamic Bias (para o último dígito recebido)

```
repRate = (repetições / aparições) × 100

Se dígito == lastDigit:
  repRate < 5%  → bias = +8   (raro repetir → maior chance)
  repRate > 15% → bias = -10  (frequentemente repete → penalidade)
  default       → bias = -5

Outros dígitos:
  repRate < 5%  → bias = +2
```

### Histórico
- Tamanho máximo: **200 ticks**
- Calculado só com ≥ 10 ticks no histórico
- `topN` configurável via `localStorage('prob_accuracy_topN')` (1-10, default 5)

## Tradução de Estratégia

### Fluxo de Resolução (em ordem)

```
translateStrategy(text)
  ├─ 1. Carrega scripts legados (se não carregados)
  ├─ 2. Cache JSON recente? → getRegrasJsonManagerInstance().hasCachedJson()
  ├─ 3. Rule code embutido? → extractRuleCodeFromText() + getJsonByRuleCode()
  ├─ 4. Histórico local?    → checkForHistoricalJson() (localStorage 'rules_history_*')
  ├─ 5. Cache de traduções? → getCachedTranslation(normalizedText)
  ├─ 6. Pré-processa texto  → preprocessStrategyForGemini() (corrige linhas sem "Entrar quando")
  └─ 7. Gemini AI           → gemini.translateStrategy(processedText)
        ↓ sucesso
        saveCachedTranslation(normalized, rules)
        rulesHistoryManager.saveRule(normalized, rules)
```

### Normalização para Comparação de Cache

Aplica: `.toLowerCase()` + remove acentos + colapsa espaços/pontuação + trim.

### Mensagens de Progresso

1. "Carregando módulos da IA..."
2. "Encontrando JSON em cache..."
3. "Buscando código de regra..."
4. "Verificando histórico..."
5. "Verificando cache de traduções..."
6. "Pré-processando estratégia..."
7. "Gerando estratégia da IA..."
8. "Estratégia criada com sucesso!"

## Validação de Pré-condições

`_validatePreconditions(text, { contractType, tradeType, prediction })` cria elementos DOM ocultos para alimentar o `rule-compatibility-validator.js` legado:

```
#contract-select     → contractType
#trade-type-select   → tradeType
#prediction-input    → prediction
#strategy-text       → strategyText
```

Após a validação, remove os elementos criados e restaura os valores originais.

**Tipos de erro detectados:**
- `nonsense_trading_logic` — texto sem sentido para trading
- `prediction_logic_error` — previsão inválida para o contrato
- `single_contract_mismatch` — tipo trade ≠ termos da estratégia

## Fluxo de Sinal de Trade (`onTradeSignal`)

Quando `MonitoringService` emite o sinal, o `page.tsx` executa:

```typescript
onTradeSignal: (groupId, entryPrice, capturedPredictions) => {
  if (window.tradeManager?.isActive) {
    // 1. Setar capturedPredictionsForTrade no tradeManager
    tm.capturedPredictionsForTrade = capturedPredictions;

    // 2. Ler tradeType e prediction do localStorage 'trade_config_full' como fallback
    if (cfg.tradeType !== 'BOTH') tm.config.contractType = cfg.tradeType;
    tm.config.prediction = { type: 'prediction', value: Number(cfg.prediction) };

    // 3. Executar trade — em caso de erro, notifica LOSS para desbloquear cooldown
    tm.executeTrade(entryPrice, groupId).catch(() => {
      monitoringService.notifyTradeResult('LOSS', true);
    });
  }
}
```

## Ciclo de Vida Completo

### Inicialização
1. `page.tsx` monta → verifica localStorage `deriv_accounts`
2. `DerivService.connect()` + `DerivService.authenticate(token)` (após 100ms)
3. Usuário seleciona símbolo → `monitoringService.start({ symbol, ... })`
4. `LegacyBridgeService.loadLegacyScripts()` (dentro do `start()`)
5. `deriv.send({ ticks: symbol, subscribe: 1 })` → inicia stream
6. `deriv.observerInstance.on('deriv.tick', ...)` → listener ativo

### Execução (a cada tick)
1. `handleTick(tick)` → reseta counter, extrai dígito
2. Adiciona ao `probabilityHistory` (máx 200)
3. `calculateProbabilities()` → `onProbabilityUpdate(stats)`
4. `setTranslatedRules(current, false)` → `onRulesVisualUpdate(data)`
5. `updateLegacySystem(...)` → dispara `marketDataUpdate` CustomEvent
6. Verifica condições de execução → emite `onTradeSignal` se satisfeito

### Stop
1. Usuário clica "PARAR" → `monitoringService.stopExecution()`
2. `bridge.stopLegacyMonitoring()` → `MonitoringView.stopMonitoring()` ou fallback
3. `bridge.stopTradeManager()` → `window.tradeManager.stop()`
4. Troca de símbolo → `monitoringService.stop()` (remove listener, limpa histórico)

## LocalStorage: Chaves Utilizadas

| Chave | Responsável | Conteúdo |
|-------|------------|---------|
| `deriv_accounts` | page.tsx | Contas e tokens Deriv |
| `selectedSymbol` | VolatilitySelector | Símbolo ativo |
| `trade_config_trade` | TradeConfig | Contrato, duração, previsão |
| `trade_config_management` | ManagementConfig | Stake, gale, soros |
| `trade_config_controller` | ControllerConfig | Limites, cooldown, pausa |
| `trade_config_full` | page.tsx (toggleBot) | Config completa no início |
| `strategy_cache_global` | regras-json.js | Cache de regras traduzidas |
| `rules_history_<loginId>` | rules-history-manager.js | Histórico de regras |
| `monitoring_strategy_<loginId>` | AiChatPanel | Draft da estratégia atual |
| `prob_accuracy_topN` | Monitoring.ts | Configuração top-N (1-10) |

## Precisão por Símbolo

| Símbolo | Casas Decimais | Exemplo | Dígito |
|---------|---------------|---------|--------|
| R_100 | 2 | 5170.**16** | 6 |
| R_25, R_10 | 3 | 4321.2**34** | 4 |
| RDBEAR, RDBULL | 4 | 1234.567**8** | 8 |
| JD* | 2 | 1234.**56** | 6 |
| 1HZ* | 2 | 1234.**56** | 6 |
| default | 4 | 1234.567**8** | 8 |

## Status de Migração

### Migrado ✅
- Painel de análise de mercado (probabilidades, dígitos, direção preço)
- Configurações: TradeConfig, ManagementConfig, ControllerConfig
- Chat IA + tradução de estratégias (cache → histórico → Gemini)
- Validação de pré-condições de estratégia
- Formato visual das regras via `getFormatGeneratorInstance()`
- Algoritmo de probabilidades reimplementado em TypeScript
- Execução de trades via `window.tradeManager.executeTrade()`
- Interceptação de resultados e mudanças de modo
- Editor visual Blockly
- BotDashboard com logs e resultados

### NÃO Migrado ❌
- Monitoramento headless real (`MonitoringView` do legado — parcialmente ativo)
- Dashboard de resultados/performance avançado
- Integração Telegram
- Contagem de dígitos repetidos (ControllerConfig tem campo mas sem uso na lógica)

## Referências

- `src/app/(withSidebar)/trade-mind-pro/page.tsx`
- `src/app/(withSidebar)/trade-mind-pro/service/Monitoring.ts`
- `src/app/(withSidebar)/trade-mind-pro/service/LegacyBridge.ts`
- `public/legacy/js/trade-manager.js`
- `public/legacy/js/generate-format.js`
- `docs/MIGRATION_DOCUMENTATION.md`
