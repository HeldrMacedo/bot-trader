# Arquitetura

Next.js 16 (App Router, webpack) + React 19 + TypeScript. Backend = API Routes do Next + Prisma/MySQL. Corretora = Deriv via WebSocket.

## Mapa de domínios

| Domínio | Onde | Papel |
|---------|------|-------|
| Bear Bot Ultra 2 | `(withSidebar)/bear-bot-ultra-2/`, `services/BearBot2Engine.ts`, `bearbot2.score.ts`, `bearbot2.types.ts`, `hooks/useBearBot2.ts` | Bot multi-mercado (Over/Under/Differ/Combo, Loss Virtual, score cross-market) |
| Bear Bot Differ | `(withSidebar)/bear-bot-differ/`, `services/BearDifferEngine.ts`, `BearDifferMath.ts`, `beardiffer.types.ts`, `hooks/useBearDiffer.ts` | Bot Differ com ranking de lógicas, pre-trade gate, 8 abas analíticas |
| Bear Bot Ultra v1 | `(withSidebar)/bear-bot-ultra/` | Versão 1 (componente único) |
| BotTrader | `(withSidebar)/bottrader/`, `services/copyTrading*.ts`, `wsListener.ts`, `tradeExecutor.ts`, `signalProcessor.ts`, `models/BotConfig.ts`, API `start`/`stop`/`status` | Copy Trader demo→real, roda no servidor |
| Operações | `(withSidebar)/operations,history,reports`, `services/operation*.{ts,js}`, `botOperationPersistence.ts`, API `operation`, `markup-statistics` | Persistência e relatórios de operações reais |
| Conta/Acesso | `login/`, `register`, `profile/`, `users/`, `lib/auth.js`, `lib/rateLimiter.js`, `middleware.ts`, API `login`, `logout`, `register`, `check-token`, `forgot-password`, `reset-password`, `profile`, `modules`, `user-modules` | Autenticação JWT, módulos por usuário |
| Deriv | `services/DerivService.tsx`, `derivConfig.ts`, `derivTokenDiagnostics.ts`, API `deriv-auth`, `deriv-otp` | OAuth PKCE, OTP, canais WebSocket |

## Camadas (dentro de cada bot)

```
types  →  math/score (puro)  →  Engine (puro, sem React/window)  →  hook (ponte Deriv + estado React)  →  UI (componentes/abas)
```

Dependências permitidas apontam **para a esquerda**:

- `types`/`math`/`score`: não importam nada de React, Deriv ou Next.
- `Engine`: importa só `types`, `math`, `score`; recebe I/O por injeção (callbacks). `BearDifferEngine` cumpre isso (0 acessos a `window`); `BearBot2Engine` ainda toca `window`/`localStorage` (dívida).
- `hook`: ponto que fala com `DerivService.getInstance()`, `localStorage` de conta e `persistBotOperation` (`useBearBot2`, `useBearDiffer`; no Ultra v1 o próprio componente).
- `UI`: consome só o hook e tipos. Não importa Engine para executar lógica (testes de UI podem importar para tipagem).
- Engines de um bot não importam engines de outro. Código comum sobe para `services/` com nome neutro.

Estas regras hoje são convenção; a verificação mecânica está na [dívida técnica](exec-plans/tech-debt-tracker.md).

## Deriv (resumo)

`DerivService` é singleton com dois canais:

1. **Público** `wss://api.derivws.com/trading/v1/options/ws/public` — `ticks`, `ticks_history`, sem auth.
2. **Trading** `.../ws/demo|real?otp=...` — `buy`, `proposal`, `balance`; OTP obtido via REST (`/api/deriv-otp`).

Detalhes em [DERIV_OAUTH_MIGRATION.md](DERIV_OAUTH_MIGRATION.md). Não usar `ws.derivws.com/websockets/v3` (retorna `InvalidSymbol` em sintéticos).

## Precisão de dígitos por símbolo

`R_100`: 2 · `R_25`, `R_10`: 3 · `RDBEAR`, `RDBULL`: 4 · `JD*`, `1HZ*`: 2 · padrão: 4.

## Autenticação

Dupla camada: `src/middleware.ts` (Edge, `jose`, cookie HttpOnly `auth_token`) e `(withSidebar)/layout.js` (cliente, `getUser()`). Rotas API usam `jsonwebtoken` (Node). Ver [AUTH_ROUTES.md](AUTH_ROUTES.md).

## Persistência

Prisma: `User`, `SharedRule` (sem uso no código, ver dívida), `Operation`, `Module`, `UserModule`. Hooks dos bots gravam operação **real** liquidada via `persistBotOperation` (fire-and-forget, nunca lança). Estado de config/UI dos bots vive em `localStorage` (cliente).

## Testes

`src/__tests__/` (vitest, env `node` por padrão; UI com `// @vitest-environment jsdom`). Testes de serviço em `src/app/services/__tests__/`. Detalhes em [QUALITY_SCORE.md](QUALITY_SCORE.md).

## Removido (não existe mais no código)

`bot-strategy`, `trade-mind-pro` (modo avançado, `AdvancedRulesEngine`, integração Gemini), `bot-analitico`, `advanced-bot`, `LegacyBridge` e `public/legacy/` (scripts JS legados), `Monitoring.ts` (probabilidade de 5 períodos), documento de regras da comunidade. A única referência ao legado no menu são entradas comentadas em `SideBar.tsx`.
