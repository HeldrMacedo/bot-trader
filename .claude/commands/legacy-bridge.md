# Skill: Legacy Bridge Expert

Você é especialista na integração entre o sistema React/TypeScript moderno e os ~70 scripts JavaScript legados neste projeto TradePlatform.

## Arquivos Chave

- `src/app/(withSidebar)/trade-mind-pro/service/LegacyBridge.ts` — carregador e interceptador
- `public/legacy/js/` — scripts legados servidos como estáticos

## Padrão de Carregamento

Os scripts são injetados como `<script>` tags no DOM em **ordem de dependência**. O carregamento é idempotente (verifica se o script já existe antes de injetar).

```typescript
// Ordem obrigatória:
// 1. Utils base (common-helpers.js, deriv-market-data.js)
// 2. Indicadores (rsi-indicator.js, sma-indicator.js)
// 3. Gerenciamento (probability-accuracy.js, rules-history-manager.js)
// 4. Validadores (rule-compatibility-validator.js, regras-json.js)
// 5. AI modules (prompt-manager.js, generate-format.js, gemini-ai.js)
// 6. Execução (trade-manager.js, stop-monitor.js, pause-manager.js)
```

## Shims Obrigatórios (window globals)

Antes de carregar os scripts legados, configure estes globals:

```typescript
window.CreditsManager = { hasCredits: () => true, consumeCredit: () => {} };
window.UserLevels = { isVIP: () => true, getLevel: () => 'vip' };
window.selectedSymbol = symbol;  // símbolo atual
window.logConfig = { enabled: false };
```

## Comunicação React → Legacy

```typescript
// Configurar trade-manager com config do React
LegacyBridge.configureTradeManager({
  symbol: 'R_100',
  contractType: 'DIGITDIFF',
  stake: 1.00,
  galeMultiplier: 2.0,
  stopLoss: -10,
  stopWin: 20,
  // ...demais configs
});

// Acesso direto ao Gemini legado
const geminiAI = LegacyBridge.getInstance().getGeminiAI();
await geminiAI.translateStrategy(text);
```

## Comunicação Legacy → React (CustomEvents)

O LegacyBridge intercepta eventos do sistema legado e emite via Observer:

| CustomEvent (Legacy) | Observer Event (React) | Payload |
|---------------------|----------------------|---------|
| `trade-result` | `onTradeResult` | `{ win, amount, contractType, mode }` |
| `mode-change` | `onModeChange` | `{ newMode, reason }` |
| `stop-triggered` | `onStopTriggered` | `{ reason, type }` |
| `pause-start` | `onPauseStart` | `{ duration }` |
| `pause-end` | `onPauseEnd` | `{}` |

```typescript
// Interceptadores configurados no LegacyBridge:
setupStopMonitorInterceptor()    // captura stop-loss/stop-win legados
setupModeChangeInterceptor()     // captura SIMULACAO ↔ REAL
setupTradeManagerInterceptors()  // captura resultados de trade
```

## Acessando APIs Legadas

```typescript
// Após loadLegacyScripts() completar:
const bridge = LegacyBridge.getInstance();

// Validar compatibilidade de estratégia
window.validateRuleCompatibility(rules, contractType); // → { valid, errors }

// Gerar formato visual das regras
window.generateRulesFormat(rules); // → HTML string

// Gerenciar histórico de regras
window.rulesHistoryManager.save(loginId, rules);
window.rulesHistoryManager.get(loginId); // → rules[]

// Cache de regras (TTL 7 dias)
window.regrasJson.set(key, rules);
window.regrasJson.get(key); // → rules | null
```

## Adicionando Novos Scripts Legados

1. Coloque o arquivo em `public/legacy/js/`
2. Adicione no array de carregamento em `LegacyBridge.ts` **após** suas dependências
3. Declare o tipo em `window` global declarations (se TypeScript precisar acessar)
4. Configure interceptadores se o script emitir eventos

## Tarefa

$ARGUMENTS

Leia `LegacyBridge.ts` antes de qualquer modificação. Mantenha a ordem de carregamento e os shims existentes. Nunca importe scripts legados diretamente — sempre via LegacyBridge.
