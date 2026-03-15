# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start dev server (allocates 4GB RAM for TensorFlow.js)
npm run build     # Production build (uses webpack, not Turbopack)
npm run start     # Start production server
npm run lint      # ESLint (scoped to bot-strategy module only)
```

No test suite is configured.

## Architecture Overview

This is a **Next.js 16 + React 19 trading bot platform** that integrates with the [Deriv](https://deriv.com) broker via WebSocket API. The project is mid-migration from a legacy Vanilla JS system (`public/legacy/js/`) to a modern TypeScript/React stack.

### Key Modules (`src/app/(withSidebar)/`)

| Module | Status | Description |
|--------|--------|-------------|
| `bot-strategy/` | **Active** | Main trading bot (React/TS migration target) |
| `trade-mind-pro/` | In progress | AI-powered trading panel with Gemini integration |
| `bot-analitico/` | Active | ML analytics with TensorFlow.js |
| `advanced-bot/` | Legacy | Advanced bot features |

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

**AI Integration (`bot-strategy/services/GeminiAIService.ts`):**
Google Gemini AI for strategy generation and validation. `GeminiStrategyValidator.ts` validates preconditions before execution.

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
