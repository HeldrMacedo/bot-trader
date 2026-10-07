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
        ├─ Valida JWT do usuário (CopyTradingManager.validateJWT)   → 401 se inválido
        ├─ Para sessão anterior se existir
        ├─ Cria CopyTradingService com a configuração
        ├─ Conecta TradeExecutor (conta real) via WebSocket — 3 tentativas (espera 2s, 4s)
        │     falha → para o service, remove a sessão e responde 502 com o erro
        └─ Conecta WsListener (conta demo) via WebSocket
```

A rota **aguarda** a conexão com a conta real antes de responder, por isso o start leva
alguns segundos. Se `/api/stop` (ou um novo start do mesmo usuário) chegar durante a conexão,
o start é cancelado com `Copy trading parado durante a conexão` e nenhum socket fica aberto.

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
SignalProcessor.processSignal()            → false: sinal descartado (ver abaixo)
        │ valida tipo de contrato e mercado
        ▼
TradeExecutor.executeTrade()               → false: bloqueado como duplicata
        │ envia buy para WebSocket da conta real e inicia o prazo de resposta (30s)
        ▼
TradeExecutor recebe a resposta do buy
        │ erro → emite 'buyRejected' (libera o guard)
        │ ok   → guarda o contract_id e inicia o prazo de liquidação
        ▼
TradeExecutor recebe proposal_open_contract (won/lost/sold)
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
2. Ao receber resultado da conta real (`won`, `lost` ou `sold`) → `onTrade = false`
3. Novos sinais da demo chegando enquanto `onTrade = true` são descartados

Isso equivale ao `bool_89` do ZeekBot original.

O guard só é liberado quando há certeza de que **não existe ordem aberta**:

| Evento | Libera o guard? | Motivo |
|--------|-----------------|--------|
| Resultado do contrato (`won`/`lost`/`sold`) | Sim | Contrato encerrado |
| Deriv rejeita o buy (`buyRejected`, ex.: saldo insuficiente) | Sim | A ordem não existe |
| Sinal descartado (mercado não mapeado, inválido, duplicata) | Sim | Nenhum buy foi enviado; registrado como info `Sinal Descartado` |
| Falha ao reconectar dentro do `executeTrade` | Sim | O buy não chegou a ser enviado |
| Erro genérico do executor (socket, parse, reconexão) | **Não** | A ordem pode estar aberta; liberar permitiria uma segunda ordem real |
| Timeout da Deriv | Bot é **parado** | Ver "Timeouts da Deriv" |

O modo real (`isInRealMode`) só é ativado depois que o buy é enviado de fato.

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

**Erros:**

| Status | Quando | Corpo |
|--------|--------|-------|
| `401` | Sem Bearer ou JWT inválido | `{ "success": false, "userId": "", "error": "Token JWT inválido", ... }` |
| `502` | Falha ao conectar na Deriv (OTP, rede, cancelado por stop) | `{ "success": false, "userId": "123", "error": "<mensagem>", ... }` |

---

### `POST /api/stop`

**Headers:** `Authorization: Bearer <jwt>`

Sempre exige JWT válido (`401` sem Bearer).

**Body (usuário):** `{}` — para apenas a sessão do usuário do JWT. É o que o botão "Parar" envia.

**Resposta (200):**
```json
{ "message": "Copy trading parado com sucesso", "timestamp": "..." }
```

`404` quando o usuário não tem sessão ativa.

**Body (admin):** `{ "stopAll": true }` — para as sessões de **todos** os usuários. Exige
`role = "admin"` (verificado no banco via `verifyAdminToken`); usuário comum recebe `403`.

```json
{ "message": "Paradas 3 sessões", "stoppedSessions": 3, "timestamp": "..." }
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

Sem sessão para o usuário: `{ "isRunning": false, "message": "Copy trading não iniciado" }`.

**Sincronização da UI (`bottraderx.tsx`):**
- Se o servidor informa bot parado (`copyTrading.isRunning=false`, por stopWin/stopLoss/timeout)
  ou sessão inexistente (`isRunning=false`, ex.: reinício do servidor), a UI destrava os campos e
  exibe `Bot parado pelo servidor: <errors.lastError.message>`.
- Respostas de status são ordenadas: uma resposta mais antiga não sobrescreve uma mais nova, e
  respostas a pedidos feitos antes do último start/stop são descartadas.

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
| `ONETOUCH` / `NOTOUCH` | Toca/Não toca barreira (relativa `plus`/`minus` ou absoluta: número logo após `touches` / `does not touch`) |
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

- `WsListener` (demo): ao detectar `close` **ou falha ao resolver a conexão (OTP)**, tenta
  reconectar após 5 segundos enquanto o bot estiver em execução.
- `TradeExecutor` (real): até 5 tentativas com backoff linear (`5s × tentativa`). Só uma conexão
  que chegou a abrir dispara reconexão ao cair; tentativa que falha antes de abrir agenda a próxima.
- **Uma conexão real por vez:** ao abrir uma nova, a anterior é fechada e seus eventos ignorados.
  A reconexão agendada é dispensada se o `executeTrade` já reconectou.
- **Contratos abertos são reassinados:** o subscribe do buy morre com o socket antigo; ao reconectar,
  o executor envia `proposal_open_contract` para cada contrato sem resultado (OTP: na abertura;
  token clássico: após o `authorize` OK).
- **`stop()` cancela tudo:** timers de reconexão, conexões em andamento (inclusive aguardando OTP),
  prazos de compra/liquidação e o timer de pausa. Nenhum socket é aberto depois do stop.
- **Atenção:** o estado interno (martingaleLevel, consecutiveLosses, etc.) não é recuperado após reinício do servidor — ver pendências abaixo

---

## Timeouts da Deriv

| Prazo | Valor | Ao estourar |
|-------|-------|-------------|
| Resposta do `buy` | 30s | Bot parado |
| Resultado do contrato | duração do contrato + 60s (ticks contam 2s cada) | Bot parado |

Sem resposta não dá para saber se a ordem existe: liberar o guard arriscaria ordem duplicada, e
continuar operando desalinharia o martingale. Por isso o executor emite `tradeTimeout`, o service
registra o erro `Timeout da Deriv` (`... Bot parado para evitar ordem duplicada; confira a conta real.`)
e chama `stop()`. A UI mostra o motivo ao detectar a parada.

---

## Testes

```bash
npx vitest run src/__tests__/copyTrader src/__tests__/copyTrading.test.ts src/app/services/__tests__/copyTradingService.test.ts
npm run test:coverage   # piso de 90% por arquivo (linhas, statements e funções) para o módulo
```

| Arquivo | Conteúdo |
|---------|----------|
| `src/app/services/__tests__/copyTradingService.test.ts` | Regras de negócio: `shouldProcessSignal`, martingale, `isInRealMode`, stop loss/win, pausas, guard |
| `src/__tests__/copyTraderReliability.test.ts` | Regressões de confiabilidade (BUG-01..17): reconexão com ordem ativa, guard vs. eventos assíncronos, timeouts, ciclo start/stop |
| `src/__tests__/copyTraderUnits.test.ts` | `WsListener` (parser de longcode), `TradeExecutor`, `SignalProcessor` |
| `src/__tests__/copyTraderApi.test.ts` | `CopyTradingManager` e rotas `/api/start`, `/api/stop`, `/api/status` |
| `src/__tests__/copyTraderUi.test.tsx` | `bottraderx.tsx` e `page.tsx`: fluxo, sincronização com o servidor |
| `src/__tests__/copyTraderDerivConfig.test.ts` | Resolução de token/conexão (PAT, OAuth, clássico) |
| `src/__tests__/copyTraderTestHarness.ts` | WebSocket falso (`FakeWs`), `resolveMock` e helpers |

Os testes usam um `FakeWs` no lugar do pacote `ws` e relógio falso do Vitest: é possível derrubar
conexões, injetar mensagens da Deriv e avançar o tempo para exercitar reconexões e timeouts.

---

## Pendências (MELHORIAS.md)

### Prioridade Alta
- **Persistência em banco** — sessões e histórico atualmente em memória (perdem-se no restart)
- **Recovery de sessão** — estado não restaurado após reinício do servidor
- **Handshake sem prazo** — o `ws` não tem `handshakeTimeout`; se a conexão nunca abrir nem fechar, `/api/start` fica pendente
- **Queda antes da resposta do buy** — sem `contract_id` não há o que reassinar; hoje o timeout de 30s para o bot. Poderia consultar `portfolio` para recuperar

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
