# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start dev server (allocates 4GB RAM for TensorFlow.js)
npm run build     # Production build (uses webpack, not Turbopack)
npm run start     # Start production server
npm run lint      # ESLint (scoped to bot-strategy module only)
npm test          # Run test suite (vitest)
npm run test:watch # Watch mode for tests
```

## Architecture Overview

This is a **Next.js 16 + React 19 trading bot platform** that integrates with the [Deriv](https://deriv.com) broker via WebSocket API. The project is mid-migration from a legacy Vanilla JS system (`public/legacy/js/`) to a modern TypeScript/React stack.

### Key Modules (`src/app/(withSidebar)/`)

| Module | Status | Description |
|--------|--------|-------------|
| `bot-strategy/` | **Discontinued** | Legacy trading bot — não usar, módulo descontinuado |
| `trade-mind-pro/` | **Active** | AI-powered trading panel with Gemini integration |
| `bot-analitico/` | Inactive | ML analytics with TensorFlow.js |
| `advanced-bot/` | Inactive | Advanced bot features |
| `bottrader/` | **Active** | Bot Copy Trader |

### Core Architecture Patterns

**Legacy Integration (`bot-strategy/services/LegacyBridge.ts`):**
Legacy scripts from `public/legacy/js/` are loaded dynamically via `<script>` tags. Communication happens through `window` globals and `CustomEvent`s. Key shims: `CreditsManager` (infinite credits), `UserLevels` (VIP), `selectedSymbol`, `logConfig`.

**Deriv WebSocket (`src/app/services/DerivService.tsx`):**
Singleton service managing the Deriv API WebSocket connection. Provides tick data, contract proposals, and account information. `src/lib/deriv-api-client.ts` and `src/lib/use-deriv-websocket.ts` are lower-level primitives.

**Monitoring & Probability (`bot-strategy/services/Monitoring.ts`):**
Singleton with a 5-period weighted probability algorithm:
- Periods: 1-10 (weight 5.0), 10-25 (2.5), 25-50 (1.0), 50-100 (0.5), 1-100 (0.5)
- Applies saturation penalty if frequency > 15%, dynamic bias for repetitions, gap bonus for absences ≥ 10 ticks

**Strategy Translation Flow:**
`translateStrategy()` resolves in order: JSON cached → rule code → history → translation cache → Gemini AI fallback. Results are saved to `strategy_cache_global` and `rules_history_*` in localStorage.

**AI Integration (`trade-mind-pro/service/AdvancedGeminiService.ts` e `/api/gemini/route.ts`):**
Google Gemini AI para geração e validação de estratégias. O módulo `bot-strategy` está descontinuado — toda integração com IA deve passar pelo endpoint `/api/gemini` diretamente. `GeminiStrategyValidator.ts` valida pré-condições no modo Estratégia padrão.

**Modo Avançado (`trade-mind-pro`) — json-rules-engine:**
Quarto modo do AiChatPanel que aceita estratégias complexas em linguagem natural. A IA gera JSON no formato `json-rules-engine` com facts computados dinamicamente a cada tick (contagem de dígitos, sequências, frequência, ausência). O `AdvancedRulesEngine` subscreve `deriv.tick`, mantém rolling buffer de 200 ticks e avalia as regras. Ao bater uma condição, chama `window.tradeManager.executeTrade()`. Ver `docs/ADVANCED_MODE.md` para documentação completa, facts disponíveis e exemplos de estratégias.

### Digit Precision by Symbol

```
R_100:           2 decimal places
R_25, R_10:      3 decimal places
RDBEAR, RDBULL:  4 decimal places
JD*, 1HZ*:       2 decimal places
Default:         4 decimal places
```

### Database

Prisma ORM with MySQL. Schema in `prisma/schema.prisma`. Models: `User`, `Operation`, `Module`, `UserModule`. Run `prisma generate` is automated on `npm install`.

### Environment Variables

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | MySQL connection string |
| `NEXT_PUBLIC_APPID` | Deriv app ID (public, safe to expose) |
| `JWT_SECRET` | JWT signing secret |
| `NEXT_PUBLIC_DERIV_API_URL` | Deriv OAuth endpoint |

### webpack Configuration

Turbopack is explicitly disabled. The `next.config.mjs` has special webpack rules for TensorFlow.js: WASM headers (`COOP`/`COEP`), fallbacks for `fs`/`path`/`crypto`, and server-side externals for `utf-8-validate` and `bufferutil`.

### What Is NOT Yet Migrated

- Trade execution (TradeManager commented out in LegacyBridge)
- Real headless monitoring (MonitoringView from legacy)
- Results/performance dashboard (BotDashboard is a placeholder)
- Automatic stop/limit system (StopMonitor)
- Telegram integration

See `docs/MIGRATION_ARCHITECTURE.md` and `docs/MIGRATION_DOCUMENTATION.md` for detailed migration guidance.
See `docs/ADVANCED_MODE.md` for the trade-mind-pro Advanced Mode (json-rules-engine) documentation.
See `docs/AUTH_ROUTES.md` for authentication and route protection documentation.
See `docs/BOTTRADER.md` for the BotTrader (Copy Trader) module documentation.

### Authentication & Route Protection

**Dupla camada de proteção:**
- `src/middleware.ts` — proteção server-side via cookie HttpOnly `auth_token` (Edge Runtime, usa `jose`)
- `src/app/(withSidebar)/layout.js` — barreira client-side, redireciona para `/login` se `getUser()` falhar

**Fluxo de login:** `POST /api/login` → gera JWT → seta cookie `auth_token` (HttpOnly, 8h) + `localStorage.access_token`

**Logout:** sempre usar `logout()` de `userService.js` — limpa localStorage **e** cookie via `POST /api/logout`

### BotTrader (Copy Trader)

**Arquitetura server-side:** `CopyTradingManager` (singleton) → `CopyTradingService` (por usuário) → `WsListener` (demo WS) + `TradeExecutor` (real WS)

**Modo Quantity Loss:** `quantityLoss=N` faz o bot aguardar N losses consecutivos na demo antes de entrar na real. Uma vez ativado (`isInRealMode=true`), permanece operando na real até sair um **win** — só então volta ao modo demo. Ver `docs/BOTTRADER.md`.

**Martingale:** `stake(level) = initialValue × (1 + stakeMultiple)^level`. Win reseta nível; `maxMartingale` limita com ação `reset` (volta ao inicial) ou `stop` (encerra bot).

**Guard onTrade:** previne dois trades reais simultâneos — equivalente ao `bool_89` do ZeekBot original.

**Rotas públicas:** `/login`, `/api/login`, `/api/register`, `/api/forgot-password`, `/api/reset-password`, `/api/logout`

**Runtime:** middleware usa `jose` (Edge-compatible); rotas de API usam `jsonwebtoken` (Node.js)
