# Skill: Trade Strategy Expert

Você é um especialista no sistema de estratégias de trading deste projeto TradePlatform — cobrindo tradução via Gemini AI, regras JSON, cache, validação e execução.

## Arquivos Chave

- `src/app/(withSidebar)/trade-mind-pro/service/Monitoring.ts` — `translateStrategy()`, `setTranslatedRules()`
- `src/app/(withSidebar)/bot-strategy/services/GeminiAIService.ts` — wrapper Gemini moderno
- `public/legacy/js/gemini-ai.js` — Gemini legado (ainda usado via LegacyBridge)
- `public/legacy/js/regras-json.js` — cache localStorage das regras (TTL 7 dias)
- `public/legacy/js/rule-compatibility-validator.js` — valida estratégia vs contrato
- `public/legacy/js/generate-format.js` — formata output visual das regras

## Fluxo de Tradução de Estratégia

```
Texto do usuário
  ↓ preprocessStrategy() — normaliza texto ("* quando" → "* Entrar quando")
  ↓ validateStrategy() — rejeita texto vazio/inválido
  ↓ translateStrategy(text, onProgress)
      1. JSON cached? → retorna imediatamente (regras-json.js localStorage)
      2. rule code match? → retorna do histórico
      3. historical rules match? → retorna do cache de traduções
      4. Gemini AI fallback → gera novo JSON
  ↓ setTranslatedRules(rules) — carrega no MonitoringService
  ↓ startExecution() — habilita emissão de sinais
```

## Seleção de Modelo Gemini

| Grupos | Modelo | Tokens |
|--------|--------|--------|
| 1 grupo | Gemini 2.5 Flash | 128k |
| 2 grupos | Gemini 2.5 Pro | 1M |
| 3+ grupos | Gemini 3.0 Pro | ilimitado |
| fallback | Gemini 2.0 Flash Thinking | — |

## Estrutura JSON de Regras

```json
{
  "groups": [
    {
      "id": 1,
      "rules": [
        { "indicator": "lastDigit", "operator": "==", "value": 9, "type": "condition" },
        { "indicator": "rsi", "period": 14, "operator": ">", "value": 70, "type": "condition" }
      ],
      "logic": "and"
    }
  ],
  "action": "trade",
  "prediction": 5,
  "contractType": "DIGITDIFF",
  "parameters": {
    "groupActivation": {
      "1": {
        "initial": true,
        "winReal": true,
        "lossReal": false,
        "winSimulated": true,
        "lossSimulated": false
      }
    }
  }
}
```

## Tipos de Contrato

```typescript
type ContractType =
  | 'DIGITDIFF'    // último dígito ≠ prediction
  | 'DIGITMATCH'   // último dígito = prediction
  | 'DIGITOVER'    // último dígito > barrier
  | 'DIGITUNDER'   // último dígito < barrier
  | 'DIGITEVEN'    // último dígito par
  | 'DIGITODD'     // último dígito ímpar
  | 'CALL'         // preço sobe
  | 'PUT'          // preço cai
  | 'CALLE'        // preço > barrier (European)
  | 'PUTE';        // preço < barrier (European)
```

## Indicadores Disponíveis

- `lastDigit` — último dígito do preço (0-9)
- `rsi` — RSI (período configurável, default 14)
- `sma` — SMA (média simples)
- `ema` — EMA (média exponencial)
- `bollinger` — Bandas de Bollinger
- `priceDirection` — direção do preço (RISE/FALL)
- `digitPattern` — padrão de sequência de dígitos

## Regras de Negócio Importantes

- Cache tem TTL de 7 dias por chave (`strategy_cache_global` + hash)
- Histórico armazenado em `rules_history_<loginId>`
- Após tradução, sempre chamar `rule-compatibility-validator.js` antes de executar
- Grupos ativam/desativam baseado em resultado anterior (WIN/LOSS × REAL/SIMULADO)

## Tarefa

$ARGUMENTS

Leia os arquivos relevantes antes de qualquer modificação. Respeite os padrões de cache e fluxo de tradução existentes.
