# Bot Copy Trader

## Visão Geral

O **BotTrader** replica automaticamente as operações de uma conta demo Deriv para uma conta real, respeitando as configurações de risco definidas pelo usuário. Toda a lógica de negócio roda no servidor Node.js (Next.js API Routes), o frontend apenas envia comandos e exibe o status via polling.

---

## Arquitetura

```
Frontend (bottraderx.tsx)
        │ POST /api/start   (inicia sessão)
        │ POST /api/stop    (para sessão)
        │ GET  /api/status  (polling 2s)
        ▼
CopyTradingManager          ← singleton server-side, gerencia sessões por userId
        │
        └─ CopyTradingService   ← uma instância por usuário ativo
                ├─ WsListener       ← WebSocket conta DEMO (observa sinais)
                ├─ SignalProcessor  ← valida e transforma o sinal
                └─ TradeExecutor    ← WebSocket conta REAL (executa trades)
```

### Arquivos

| Arquivo | Responsabilidade |
|---------|-----------------|
| `src/app/(withSidebar)/bottrader/page.tsx` | Verificação de acesso ao módulo |
| `src/app/(withSidebar)/bottrader/bottraderx.tsx` | Interface completa (UI) |
| `src/app/services/copyTradingManager.ts` | Singleton que gerencia sessões por userId |
| `src/app/services/copyTradingService.ts` | Lógica central: estados, regras, eventos |
| `src/app/services/wsListener.ts` | WebSocket da conta demo, extrai sinais |
| `src/app/services/signalProcessor.ts` | Valida sinal e mapeia mercado |
| `src/app/services/tradeExecutor.ts` | WebSocket da conta real, executa trade |
| `src/app/api/start/route.ts` | `POST /api/start` — inicia o copy trading |
| `src/app/api/stop/route.ts` | `POST /api/stop` — para o copy trading |
| `src/app/api/status/route.ts` | `GET /api/status` — retorna estatísticas |

---

## Fluxo de Execução

### Iniciar

```
POST /api/start { demoToken, realToken, configure }
        │
        ├─ Valida JWT do usuário (CopyTradingManager.validateJWT)
        ├─ Para sessão anterior se existir
        ├─ Cria CopyTradingService com a configuração
        ├─ Conecta TradeExecutor (conta real) via WebSocket
        └─ Conecta WsListener (conta demo) via WebSocket
```

### Ciclo de trade

```
Demo executa operação
        │
        ▼
WsListener recebe msg_type=transaction, action=buy
        │ extrai TradeSignal (símbolo, tipo, duração, barrier)
        ▼
CopyTradingService.shouldProcessSignal()
        │ false → ignora (aguardando losses / pausado)
        │ true  →
        ▼
SignalProcessor.processSignal()
        │ valida tipo de contrato e mercado
        ▼
TradeExecutor.executeTrade()
        │ envia buy para WebSocket da conta real
        ▼
TradeExecutor recebe proposal_open_contract (won/lost)
        │ emite evento 'transaction'
        ▼
CopyTradingService.handleRealTransaction()
        │ win → reseta martingale + sai do modo real
        └─ loss → incrementa martingale + permanece no modo real
```

---

## Configurações

| Campo | Tipo | Padrão | Descrição |
|-------|------|--------|-----------|
| `quantityLoss` | `number` | `0` | Losses consecutivos na demo para ativar entradas na real. `0` = sempre entra. |
| `stopLoss` | `number` | `0` | Para o bot quando o prejuízo acumulado na real atingir esse valor ($). `0` = sem limite. |
| `stopWin` | `number` | `0` | Para o bot quando o lucro acumulado na real atingir esse valor ($). `0` = sem limite. |
| `initialValue` | `number` | `0.35` | Stake inicial de cada operação na real ($). |
| `stakeMultiple` | `number` | `1` | Multiplicador do martingale. `stakeMultiple=1` dobra a cada loss (`ratio = 1 + stakeMultiple`). |
| `maxMartingale` | `number` | `0` | Limite de níveis de martingale. `0` = sem limite. |
| `onMaxMartingale` | `'reset'\|'stop'` | `'reset'` | Ação ao atingir `maxMartingale`: `reset` volta ao stake inicial, `stop` encerra o bot. |
| `pauseTime` | `number` | `0` | Segundos de pausa entre operações. |
| `pauseTimeLoss` | `boolean` | `false` | Aplica `pauseTime` após loss. |
| `pauseTimeWin` | `boolean` | `false` | Aplica `pauseTime` após win. |

---

## Modo Quantity Loss (isInRealMode)

O campo `quantityLoss` controla **quando** o bot entra na conta real:

| Valor | Comportamento |
|-------|--------------|
| `0` | Copia todos os trades da demo imediatamente |
| `N > 0` | Aguarda N losses consecutivos na demo antes de entrar na real |

### Lógica de permanência na real

Quando `consecutiveLosses >= quantityLoss`, o bot ativa `isInRealMode = true`. A partir daí:

- **Continua operando na real** a cada sinal da demo, independente do resultado
- **Só sai do modo real** quando ocorre um **win na conta real**
- Após o win: `isInRealMode = false`, `consecutiveLosses = 0` → volta a aguardar nova sequência na demo

```
Demo: LOSE LOSE      ← acumula 2 losses (quantityLoss=2)
              │
              └─ isInRealMode = true
Real: LOSE           ← permanece no modo real
Real: LOSE           ← permanece no modo real
Real: WIN            ← isInRealMode = false, consecutiveLosses = 0
Demo: aguarda 2 losses novamente...
```

---

## Martingale

Progressão geométrica baseada em `initialValue` e `stakeMultiple`:

```
stake(level) = initialValue × (1 + stakeMultiple)^level
```

Exemplos com `initialValue=0.35, stakeMultiple=1` (dobra):

| Nível | Stake |
|-------|-------|
| 0 | $0.35 |
| 1 | $0.70 |
| 2 | $1.40 |
| 3 | $2.80 |

- Win na real: `martingaleLevel = 0`, volta ao `initialValue`
- Loss na real: `martingaleLevel++`, calcula próximo stake
- Ao atingir `maxMartingale`: executa `onMaxMartingale` (reset ou stop)

O nível é exibido na UI como `nivel/maximo` (ex: `2/5`).

---

## Guard onTrade (prevenção de trade duplicado)

`onTrade` é um booleano que impede a execução de múltiplos trades reais simultaneamente:

1. **Antes** de `processSignal()` → `onTrade = true`
2. Ao receber resultado da conta real → `onTrade = false`
3. Novos sinais da demo chegando enquanto `onTrade = true` são descartados

Isso equivale ao `bool_89` do ZeekBot original.

---

## API Routes

### `POST /api/start`

**Headers:** `Authorization: Bearer <jwt>`

**Body:**
```json
{
  "demoToken": "string",
  "realToken": "string",
  "configure": { ...Configure }
}
```

**Resposta (200):**
```json
{ "success": true, "userId": "123", "message": "Copy trading iniciado com sucesso" }
```

---

### `POST /api/stop`

**Headers:** `Authorization: Bearer <jwt>`

**Body:**
```json
{ "stopAll": true }
```

**Resposta (200):**
```json
{ "success": true, "message": "Copy trading parado com sucesso" }
```

---

### `GET /api/status`

**Headers:** `Authorization: Bearer <jwt>`

**Resposta (200):**
```json
{
  "copyTrading": {
    "isRunning": true,
    "trading": {
      "consecutiveLosses": 1,
      "martingaleLevel": 0,
      "maxMartingale": 5,
      "onMaxMartingale": "reset",
      "currentStake": 0.35,
      "onTrade": false,
      "isInRealMode": false
    }
  },
  "realAccount": {
    "totalWin": 3,
    "totalLoss": 1,
    "totalProfit": 0.85,
    "totalValueWin": 1.05,
    "totalValueLoss": -0.35,
    "transactions": [...]
  },
  "realTransactions": [...],
  "console": [...],
  "timePause": 0,
  "balance": 120.50,
  "errors": { "errors": [...], "lastError": null, "errorCount": 0 }
}
```

---

## Extração de Sinais (WsListener)

O `WsListener` se conecta via `wss://ws.binaryws.com` com o token da conta demo e:

1. Autentica com `{ authorize: token }`
2. Subscreve ao stream de transações: `{ transaction: 1, subscribe: 1 }`
3. Ao receber `msg_type=transaction, action=buy`, extrai o `TradeSignal` a partir do `longcode`

### Tipos de contrato suportados

| Tipo | Descrição |
|------|-----------|
| `CALL` / `PUT` | Rise/Fall básico |
| `CALLE` / `PUTE` | Rise/Fall com igualdade |
| `DIGITODD` / `DIGITEVEN` | Último dígito par/ímpar |
| `DIGITMATCH` / `DIGITDIFF` | Último dígito igual/diferente |
| `DIGITOVER` / `DIGITUNDER` | Último dígito acima/abaixo |
| `ONETOUCH` / `NOTOUCH` | Toca/Não toca barreira |
| `RESETCALL` / `RESETPUT` | Reset contracts |
| `RUNHIGH` / `RUNLOW` | Run contracts |

### Unidades de duração suportadas

- Ticks (`t`): 1–10
- Segundos (`s`): 1–86400
- Minutos (`m`): 1–1440
- Horas (`h`): 1–24
- Durações compostas (ex: "1 hour 30 minutes")

---

## Proteção contra duplicatas (TradeExecutor)

O `TradeExecutor` tem proteção dupla contra trades duplicados:

1. **Mesmo segundo + mesmos parâmetros** → bloqueado
2. **1 segundo de diferença + mesmos parâmetros** → bloqueado

Parâmetros comparados: `símbolo|tipo|valor|barrier|duração|unidade`

---

## Reconexão automática

- `WsListener`: ao detectar `close`, tenta reconectar após 5 segundos (se ainda em execução)
- `TradeExecutor`: até 5 tentativas com backoff exponencial (`delay × tentativa`)
- **Atenção:** o estado interno (martingaleLevel, consecutiveLosses, etc.) não é recuperado após reconexão — ver pendências abaixo

---

## Testes

```bash
npx vitest run src/app/services/__tests__/copyTradingService.test.ts
```

Cobertura: 249 testes cobrindo `shouldProcessSignal`, `handleDemoTransaction`, `handleRealTransaction`, martingale (progressão, reset, stop), `isInRealMode`, `onTrade` guard, stop loss/win, pausas, e fluxos completos de ciclo.

---

## Pendências (MELHORIAS.md)

### Prioridade Alta
- **Persistência em banco** — sessões e histórico atualmente em memória (perdem-se no restart)
- **Recovery de sessão** — estado não restaurado após reconexão WebSocket

### Prioridade Média
- Switch on Loss (inverter direção após perda)
- Notificações sonoras
- Integração Telegram
- Grid de trades expandido (Entry Time, Trade Type, Duration, Barrier)
- Gráficos P&L
- Stop Win dinâmico (% do saldo)
- Substituir polling por SSE/WebSocket no frontend

### Prioridade Baixa
- Delay de execução configurável
- Master/Slave toggle
- Solo trading mode
