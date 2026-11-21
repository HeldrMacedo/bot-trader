# bot-trader

Plataforma de bots de trading sobre a API WebSocket da [Deriv](https://deriv.com): Next.js 16, React 19, TypeScript, Prisma (MySQL), vitest.

Bots ativos: **Bear Bot Ultra 2**, **Bear Bot Differ**, **Bear Bot Ultra (v1)** e **BotTrader** (copy trader). Mapa completo em [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Começando

```bash
npm install            # também roda prisma generate
cp .env.example .env   # se existir; defina DATABASE_URL, JWT_SECRET, NEXT_PUBLIC_APPID, NEXT_PUBLIC_DERIV_API_URL
npm run dev            # http://localhost:3000
npm test               # suíte vitest
npm run build          # produção (webpack)
```

## Documentação

Comece por [docs/index.md](docs/index.md). Agentes de IA: [CLAUDE.md](CLAUDE.md).
