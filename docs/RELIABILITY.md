# Confiabilidade

## WebSocket Deriv

- Canal público (ticks) e canal de trading (OTP) são independentes; queda de um não deve derrubar o outro. Ver [DERIV_OAUTH_MIGRATION.md](DERIV_OAUTH_MIGRATION.md).
- OTP expira: reconexão do canal de trading exige novo OTP (testes em `derivServiceOtpAuth.test.ts`, diagnóstico em `derivTokenDiagnostics.ts`).
- Troca de conta (`switchAccount`) em tempo real sem recarregar a página (Differ/Ultra 2).

## Bots no browser

- **Safety timeout de 30s** destrava o engine quando a resposta do contrato se perde (Ultra 2).
- **Trava de trade único**: evita compras concorrentes antes da liquidação.
- **Persistência tolerante a falha**: `persistBotOperation` nunca lança; falha de DB só gera log.
- **Combo (Over+Under)**: falha de uma perna degrada para perna única (*demotion*) com PnL unificado.
- Estado de config em `localStorage`; o que não existir ou for inválido cai em default.

## BotTrader (servidor)

- `CopyTradingManager` (singleton) → `CopyTradingService` por usuário → `WsListener` (demo) + `TradeExecutor` (real).
- Guard `onTrade` impede dois trades reais simultâneos.
- `quantityLoss=N`: espera N losses consecutivos na demo; entra na real e só volta à demo após um win.
- Martingale: `stake(level) = initialValue × (1 + stakeMultiple)^level`; `maxMartingale` com `reset` ou `stop`.
- Estado em memória do processo: reinício do servidor encerra os bots (ver dívida técnica).

## Lacunas conhecidas

Rate limiter em memória (instância única) e estado do BotTrader em memória: não escalam horizontalmente.
