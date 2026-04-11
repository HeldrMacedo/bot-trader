# Skill: Deriv API Expert

Você é um especialista na integração com a API Deriv WebSocket v3 neste projeto TradePlatform.

## Contexto do Projeto

- **Serviço principal:** `src/app/services/DerivService.tsx` — singleton WebSocket client
- **Primitivos de baixo nível:** `src/lib/deriv-api-client.ts`, `src/lib/use-deriv-websocket.ts` - **Inativo**
- **WebSocket URL:** `wss://ws.derivws.com/websockets/v3?app_id=<NEXT_PUBLIC_APPID>`

## Padrões Obrigatórios

### Envio de mensagens
Sempre use `DerivService.getInstance().send<T>(payload)` — nunca abra um WebSocket diretamente no componente.

### Subscriptions
Use `subscribe(payload)` para streams contínuos (ticks, balance). Armazene o `subscription_id` retornado para cancelar com `{ forget: id }`.

### Autenticação
Sempre autentique antes de qualquer request privado: `await derivService.authenticate(token)`. O token vem de `localStorage.getItem('deriv_accounts')`.

### Extração de dígito
Use `derivService.extractLastDigit(price, symbol)` — **nunca** extraia manualmente. Precisão por símbolo:
- R_100 → 2 casas decimais
- R_25, R_10 → 3 casas decimais
- RDBEAR, RDBULL → 4 casas decimais
- JD*, 1HZ* → 2 casas decimais
- default → 4 casas decimais

### Reconexão automática
O DerivService já gerencia reconexão + fila de requests pendentes. Não implemente retry manual.

### Ping-Pong
O serviço envia ping a cada 25s automaticamente. Não duplique.

## Tipos Deriv API relevantes

```typescript
// Tick stream
{ ticks: "R_100" }                                          // subscribe
{ ticks_history: "R_100", count: 1000, end: "latest" }     // histórico

// Proposal (precificar contrato)
{
  proposal: 1,
  amount: 1.00,
  basis: "stake",
  contract_type: "DIGITDIFF",   // DIGITDIFF | DIGITMATCH | DIGITOVER | DIGITUNDER | DIGITEVEN | DIGITODD | CALL | PUT
  currency: "USD",
  duration: 1,
  duration_unit: "t",           // t=ticks | s=seconds | m=minutes | h=hours
  symbol: "R_100",
  barrier: "5"                  // para DIGITOVER/UNDER ou CALL/PUT
}

// Comprar contrato
{ buy: proposalId, price: amount }

// Resultado (open_contract)
{ proposal_open_contract: 1, subscribe: 1 }
```

## Tarefa

$ARGUMENTS

Analise o contexto acima e implemente conforme os padrões estabelecidos neste projeto. Leia os arquivos relevantes antes de modificar qualquer coisa.
