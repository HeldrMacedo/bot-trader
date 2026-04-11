# Documentação de Migração: Componentes e Serviços do trade-mind-pro

Última atualização: reflete o estado real do código em produção.

---

## 1. TradeConfig.tsx

### Interface

```typescript
interface TradeConfigData {
  contractType: string;       // ex: 'Over/Under', 'Rise/Fall', 'Differ/Match', 'Even/Odd', 'Higher/Lower'
  tradeType: string;          // subtipo dentro do grupo (ex: 'DIGITOVER', 'CALL', 'DIGITDIFF')
  duration: number;
  durationUnit: 't' | 's' | 'm' | 'h';
  prediction: string | number; // 0-9 para contratos DIGIT*
  barrier: string;             // formato: '+0.5' ou '-0.3'
}
// localStorage: 'trade_config_trade'
// Carregamento: { ...DEFAULT_TRADE_CONFIG, ...parsed.config }
```

### Grupos de Contratos

```typescript
const CONTRACT_GROUPS = {
  'Over/Under':    ['DIGITOVER',  'DIGITUNDER'],
  'Rise/Fall':     ['CALL',       'PUT'],
  'Differ/Match':  ['DIGITDIFF',  'DIGITMATCH'],
  'Even/Odd':      ['DIGITEVEN',  'DIGITODD'],
  'Higher/Lower':  ['CALLE',      'PUTE', 'CALLPUT'],
};
```

### Validações

```typescript
// Duração mínima para Higher/Lower
const minimumsByUnit = { 't': 5, 's': 15, 'm': 1, 'h': 1 };

// Barreira (somente Higher/Lower)
const barrierRegex = /^[+-]\d+(\.\d+)?$/;

// Campos condicionais por tipo de contrato
// prediction: aparece somente para contratos DIGIT*
// barrier:    aparece somente para Higher/Lower (sem dupla barreira)
// barreiras duplas: para Range e similares
```

---

## 2. ManagementConfig.tsx

### Interface

```typescript
interface ManagementConfigData {
  stake: number;                 // mínimo: 0.35, step: 0.01
  goal: number;                  // meta de lucro (take profit)
  stopLoss: number;              // limite de perda (negativo)
  galeMultiplier: number;        // 0–5, step 0.1 (galeAdjustment no legado)
  galeSplit: number;             // 1–10 parcelas
  galeSplitThreshold: number;    // gatilho em $
  sorosLimit: number;            // 0 = desativado
  sorosProfitPercentage: number; // 0–100%
  galeRemovesSoros: boolean;     // proteção: remove Soros no cálculo de Gale
}
// localStorage: 'trade_config_management'
```

### Mapeamento para TradeManager Legado

| Campo React | Campo Legado |
|-------------|-------------|
| `galeMultiplier` | `galeAdjustment` |
| `sorosProfitPercentage` | `sorosPercentage` |
| `galeMultiplier > 1` | `galeActive` (boolean) |

---

## 3. ControllerConfig.tsx

### Interface

```typescript
interface ControllerConfigData {
  winReal: number;           // vitórias reais → muda para SIMULADO  (→ realWinsLimit)
  lossReal: number;          // derrotas reais → muda para SIMULADO  (→ realLossesLimit)
  winSimulated: number;      // vitórias simuladas → muda para REAL  (→ simulatedWinsLimit)
  lossSimulated: number;     // derrotas simuladas → continua SIM    (→ simulatedLossesLimit)
  tradeLimit: number;        // 0 = sem limite
  cooldownPeriod: number;    // delay em ticks entre trades
  pauseTime: number | null;  // minutos de pausa automática
  pauseTrades: number;       // frequência de pausa
  pauseOnWins: boolean;      // pausar em vitórias?
  countRepeated: boolean;    // contar dígitos repetidos
}
// localStorage: 'trade_config_controller'
```

### Lógica de Modo Inicial (computeStartMode no legado)

```
winSimulated = 0 E lossSimulated = 0  →  inicia em REAL
winSimulated > 0 OU lossSimulated > 0 →  inicia em SIMULACAO
```

---

## 4. AccountSelector.tsx

Lê `localStorage('deriv_accounts')` para exibir saldo e tipo de conta (REAL/VIRTUAL).  
Sem props — estado completamente local.

---

## 5. VolatilitySelector.tsx

```typescript
interface Props {
  selectedSymbol: string;
  onSelectSymbol: (symbol: string) => void;
}
```

Persiste símbolo selecionado em `localStorage('selectedSymbol')`.

---

## 6. AiChatPanel.tsx

```typescript
interface Props {
  messages: any[];
  isProcessing: boolean;
  onSendMessage: (text: string) => void;
  onStrategyGenerated: () => void;
  mode: 'strategy' | 'chat' | 'config';
  onModeChange: (mode: 'strategy' | 'chat' | 'config') => void;
  progressMessage: string | null;           // exibido durante processamento IA
  onRequestSuggestions: () => void;
  configRules: any | null;                  // regras JSON traduzidas (modo config)
  onConfigRulesChange: (rules: any) => void; // chamado ao editar JSON das regras
  draftStorageKey: string | null;           // 'monitoring_strategy_<loginId>'
}
```

**Modo `config`:** exibe editor JSON das regras traduzidas; alterações chamam `monitoringService.updateGroupActivation()`.

**Draft:** salva rascunho da estratégia no localStorage usando chave por `loginId`.

---

## 7. BotDashboard.tsx

```typescript
interface Props {
  logs: string[];       // formato: '[HH:MM:SS] mensagem'
  running: boolean;
  resultsList: any[];   // cada item: { type, target, exit, stake, status, profit, mode, time }
}
```

Exibe logs em tempo real e tabela de resultados com estatísticas de WIN/LOSS.

---

## 8. MarketAnalysisPanel.tsx

```typescript
interface Props {
  symbol: string;
  marketStats: ProbabilityStats | null;    // null até ≥ 10 ticks
  rulesVisualData: RulesVisualData | null;
}
```

Renderizado somente quando `selectedSymbol` definido e `mainView !== 'blockly'`.

---

## 9. BlocklyEditor.tsx

Editor visual de estratégias baseado em Blockly. Sem props — estado completamente local.

---

## 10. Serviço de Monitoramento: Monitoring.ts

### Ciclo de Vida Completo

```typescript
// Singleton exportado como instância
export const monitoringService = MonitoringService.getInstance();

// Iniciar (chamado quando símbolo muda)
await monitoringService.start({
  symbol: 'R_100',
  onTick: (data: TickData) => {},
  onProbabilityUpdate: (stats: ProbabilityStats) => setMarketStats(stats),
  onRulesVisualUpdate: (rulesData: RulesVisualData) => setRulesVisualData(rulesData),
  onTradeSignal: (groupId, entryPrice, capturedPredictions) => { /* executa trade */ }
});

// Configurar estratégia
monitoringService.setTranslatedRules({ groups: [], contract_type: null, prediction: null });

// Habilitar sinais
monitoringService.startExecution(groupActivation, cooldownTicks);

// Notificar resultado (chamado pelo page.tsx via interceptor/event)
monitoringService.notifyTradeResult('WIN' | 'LOSS', isSimulated);

// Parar sinais
monitoringService.stopExecution();

// Parar tudo (ao trocar símbolo ou desmontar componente)
monitoringService.stop();
```

### Group Activation

Grupos sem configuração explícita são tratados como **ativos por padrão** (default `true`).

```typescript
// conditionKey mapeado do último resultado:
// sem resultado  → 'initial'
// WIN  + REAL    → 'winReal'
// LOSS + REAL    → 'lossReal'
// WIN  + SIM     → 'winSimulated'
// LOSS + SIM     → 'lossSimulated'

// Grupo ativo se: cfg[id]?.[conditionKey] !== false
```

### Avaliação de Condições de Regras

Delegada para `window.getFormatGeneratorInstance().checkRuleCondition(rule, null)`.

**Suporte a variáveis especiais:** `$LOWER_PROB`, `$HIGHER_PROB` — resolvidas via `window.getProbabilityResolver()` antes da avaliação.

**Tipos de regra que requerem marketData:** `last_digits`, `digit_repetition`, `digit_pattern`, `dynamic_prediction`, `isolated_digits` — injetam `formatGenerator.marketData = this.deriv`.

### Extração de `capturedPredictions`

```typescript
// Mapeamento de tipos (case-insensitive)
const TYPE_MAP = {
  over: 'DIGITOVER', under: 'DIGITUNDER',
  match: 'DIGITMATCH', diff: 'DIGITDIFF', differ: 'DIGITDIFF',
  even: 'DIGITEVEN', odd: 'DIGITODD',
  call: 'CALL', put: 'PUT', rise: 'CALL', fall: 'PUT',
};

// Prioridade de leitura do contractType e predictionValue:
// rule.contractType → params.contractType → rule.predictionAction → params.predictionAction
// rule.contractPrediction → params.contractPrediction → rule.targetValue → params.targetValue
```

---

## 11. LegacyBridge.ts: Detalhes de Implementação

### `loadScript(src)` — Força Reload

```typescript
// Remove script existente antes de reinserir
existingScript?.remove();
script.src = `${src}?v=${Date.now()}`; // anti-cache
script.async = false;                  // mantém ordem de carregamento
```

### `SessionManager` Shim (Novo)

Necessário para `gemini-ai.js` autenticar via backend:

```typescript
window.SessionManager = {
  getUserSessionId()   → localStorage('deriv_accounts')[0].loginId
  getLocalToken()      → localStorage('deriv_accounts')[0].activeToken
  getCurrentUser()     → { loginid, authorize: { loginid, is_virtual } }
  getUserData()        → { authorize: { loginid, is_virtual } }
  getSessionData(key)  → localStorage.getItem(key)
  getTokenByLoginId(id) → tokens.find(t => t.acct === id)?.token
}
```

### Fluxo de Stop

```
bridge.stopLegacyMonitoring()
  → MonitoringView.stopMonitoring()  (se disponível)
  → fallback: stopTradeManager()

bridge.stopTradeManager()
  → window.tradeManager.stop()
  → emit('stop_monitoring')

bridge.stopAllMonitoring()
  → MonitoringView.stopAll()         (se disponível)
  → fallback: window.tradeManager.stop()
  → emit('stop_monitoring')
```

---

## 12. Chaves LocalStorage

| Chave | Componente/Serviço | Conteúdo |
|-------|-------------------|---------|
| `deriv_accounts` | page.tsx | Contas e tokens Deriv |
| `selectedSymbol` | VolatilitySelector | Símbolo ativo |
| `trade_config_trade` | TradeConfig | `{ config: TradeConfigData, _timestamp }` |
| `trade_config_management` | ManagementConfig | `{ config: ManagementConfigData, _timestamp }` |
| `trade_config_controller` | ControllerConfig | `{ config: ControllerConfigData, _timestamp }` |
| `trade_config_full` | page.tsx (toggleBot) | Config completa mesclada no início |
| `strategy_cache_global` | regras-json.js | Cache de regras traduzidas |
| `rules_history_<loginId>` | rules-history-manager.js | Histórico de regras por usuário |
| `monitoring_strategy_<loginId>` | AiChatPanel | Draft da estratégia em edição |
| `prob_accuracy_topN` | Monitoring.ts | Top-N dígitos (1–10, default 5) |

---

## 13. Deduplicação de Resultados (page.tsx)

Evita registros duplicados quando o evento `tradeResultFront` e o interceptor `bridge.on('trade', ...)` disparam para o mesmo trade:

```typescript
const makeTradeKey = (d: any) =>
  `${contractType}|${status}|${exitPrice.toFixed(2)}|${stake}|${Math.floor(Date.now() / 2000)}`;

// Se chave já existe no Set → ignora
// Caso contrário → adiciona ao Set + agenda remoção em 4s
```

---

## 14. Mapeamento: Funções Legadas → React

| Função Original (JS) | Implementação React/TS | Localização |
|---------------------|----------------------|-------------|
| `ConfigurationsView.saveCurrentConfiguration()` | `useEffect` com debounce 300ms | Todos os *Config |
| `ConfigurationsView.loadSavedConfigurationIntoUI()` | `useState` initializer | Todos os *Config |
| `ConfigurationsView.applyDefaultValues()` | constante `DEFAULT_*_CONFIG` | Todos os *Config |
| `validateAndSaveDuration()` | `validateDuration()` callback | TradeConfig |
| `validateAndSaveBarrier()` | `validateBarrier()` callback | TradeConfig |
| `addIntegerValidation()` | `validateInteger()` callback | Management/Controller |
| `updateTradeTypeDropdown()` | `getAvailableTradeTypes()` | TradeConfig |
| `monitoring.js calculateProbabilities()` | `MonitoringService.calculateProbabilities()` | Monitoring.ts |
| `trade-manager.js start()/stop()` | `bridge.configureTradeManager()` / `stopTradeManager()` | LegacyBridge.ts |
| `stop-monitor.js showStopTradePopup()` | `bridge.emit('stop_limit', ...)` | LegacyBridge.ts |
| `gemini-ai.js translateStrategy()` | `MonitoringService.translateStrategy()` | Monitoring.ts |
| `rule-compatibility-validator.js` | `MonitoringService._validatePreconditions()` | Monitoring.ts |
| `generate-format.js checkRuleCondition()` | `MonitoringService.checkRuleCondition()` | Monitoring.ts |

---

## 15. Status de Campos Migrados por Componente

### TradeConfig.tsx — ✅ 100%
- Grupos de contratos (Over/Under, Rise/Fall, Differ/Match, Even/Odd, Higher/Lower)
- Subtipo (tradeType) dentro de cada grupo
- Duração + unidades com validação mínima
- Campos condicionais: prediction, barrier, dupla barreira

### ManagementConfig.tsx — ✅ 100%
- Stake (mín 0.35), Goal, StopLoss
- Gale: multiplier (0-5), split (1-10), threshold, galeRemovesSoros
- Soros: limit, profit percentage (0-100%)

### ControllerConfig.tsx — ✅ 100% (campos), ⚠️ parcial (lógica)
- Todos os campos presentes: winReal, lossReal, winSimulated, lossSimulated
- tradeLimit, cooldownPeriod, pauseTime, pauseTrades, pauseOnWins
- `countRepeated`: campo presente, lógica não implementada no novo monitoramento

### Integração de Execução — ✅ Ativo
- `window.tradeManager.executeTrade()` funcional
- Interceptação de resultados via EventEmitter + window event fallback
- Deduplicação de trades por janela de 2s

### Campos NÃO Migrados
- Telegram (token/chatId): requer integração externa
- Monitoramento headless completo (`MonitoringView` do legado)
- Dashboard avançado de performance

---

## 16. Padrões de Código Estabelecidos

### Auto-save com debounce
```typescript
useEffect(() => {
  const timeout = setTimeout(() => {
    localStorage.setItem(KEY, JSON.stringify({ config, _timestamp: Date.now() }));
  }, 300);
  return () => clearTimeout(timeout);
}, [config]);
```

### Carregamento seguro do localStorage
```typescript
const [config, setConfig] = useState<T>(() => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem(KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return { ...DEFAULT_CONFIG, ...parsed.config };
      } catch (e) { /* fallback silencioso */ }
    }
  }
  return DEFAULT_CONFIG;
});
```

### Validação de inteiros
```typescript
// Remove não-numéricos, floor, abs
const validateInteger = (v: string | number) =>
  Math.floor(Math.abs(parseInt(String(v)) || 0));
```
