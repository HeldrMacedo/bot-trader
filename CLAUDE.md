# CLAUDE.md

Índice para agentes. **Curto de propósito** (máx. 120 linhas, validado em `src/__tests__/docsHarness.test.ts`).
O sistema de registro é `docs/`. Comece por [docs/index.md](docs/index.md) e vá fundo só no que a tarefa pede.

## O que é

Plataforma de bots de trading em **Next.js 16 + React 19 + TypeScript** sobre a API WebSocket da [Deriv](https://deriv.com). Prisma + MySQL. Testes com vitest.

## Comandos

```bash
npm run dev            # dev server (4GB RAM, webpack)
npm run build          # build de produção (webpack, sem Turbopack)
npm test               # vitest run (toda a suíte)
npm run test:watch     # vitest em watch
npm run test:coverage  # cobertura (piso por arquivo, ver vitest.config.ts)
npm run lint           # ESLint — ver dívida técnica: script aponta para módulo removido
```

## Módulos (`src/app/(withSidebar)/`)

| Módulo | Estado | Doc |
|--------|--------|-----|
| `bear-bot-ultra-2/` | Ativo | [docs/doc_bear_bot_ultra_2/README.md](docs/doc_bear_bot_ultra_2/README.md) |
| `bear-bot-differ/` | Ativo | [docs/doc_bear_bot_differ/README.md](docs/doc_bear_bot_differ/README.md) |
| `bear-bot-ultra/` | Ativo (v1) | [docs/doc_bear_bot_ultra/README.md](docs/doc_bear_bot_ultra/README.md) |
| `bottrader/` | Ativo (Copy Trader, server-side) | [docs/BOTTRADER.md](docs/BOTTRADER.md) |
| `home/`, `operations/`, `history/`, `reports/`, `profile/`, `users/` | Ativos (apoio) | [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) |

**Removidos** (não existem mais no código; não reintroduzir sem plano): `bot-strategy`, `trade-mind-pro`, `bot-analitico`, `advanced-bot`, `LegacyBridge`, `public/legacy/`, integração Gemini.

## Onde está o quê

- Mapa de domínios, camadas e regras de dependência: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- Princípios mecânicos inegociáveis: [docs/GOLDEN_PRINCIPLES.md](docs/GOLDEN_PRINCIPLES.md)
- Qualidade por domínio e lacunas: [docs/QUALITY_SCORE.md](docs/QUALITY_SCORE.md)
- Confiabilidade (WS, travas, timeouts): [docs/RELIABILITY.md](docs/RELIABILITY.md)
- Segurança (auth, segredos): [docs/SECURITY.md](docs/SECURITY.md) e [docs/AUTH_ROUTES.md](docs/AUTH_ROUTES.md)
- Deriv (OAuth, canais WS): [docs/DERIV_OAUTH_MIGRATION.md](docs/DERIV_OAUTH_MIGRATION.md); referência da API em `docs/documentacao_deriv/`
- Planos de execução e dívida técnica: [docs/exec-plans/](docs/exec-plans/active/README.md)

## Regras que o agente deve seguir

1. **Repositório é a fonte da verdade.** Decisão tomada em conversa que importa vira doc, plano ou teste no repo.
2. **TDD sempre.** Teste falhando primeiro, depois a implementação. Mudança sem teste é incompleta.
3. **Bug real achado na análise: corrigir direto**, sem pedir permissão (ver memória do usuário).
4. **Lógica pura fora do React.** Engines (`BearBot2Engine`, `BearDifferEngine`) não importam React nem devem tocar `window` (BearBot2Engine ainda toca — dívida); hooks (`useBearBot2`, `useBearDiffer`) fazem a ponte com `DerivService`.
5. **Deriv:** um singleton (`DerivService`) com dois canais — público (`ticks`, `ticks_history`, sem auth) e trading via OTP (`buy`/`proposal`/`balance`). Nunca usar `ws.derivws.com/websockets/v3` para ticks.
6. **Persistência de operações:** hooks dos bots chamam `persistBotOperation` na liquidação; só conta **real**, nunca lança exceção.
7. **Logout:** sempre `logout()` de `userService.js` (limpa localStorage e cookie).
8. **Nunca** commitar tokens, `.env` ou dumps de `localStorage`. Ver [docs/SECURITY.md](docs/SECURITY.md).
9. Ao terminar: rodar `npm test`; se mudou estrutura/doc, atualizar `docs/` no mesmo PR.

## Fluxo de trabalho

- **Mudança pequena:** teste → código → `npm test`.
- **Mudança complexa:** plano em `docs/exec-plans/active/` (com log de progresso e decisões) antes de codar; ao concluir, mover para `completed/`.
- **Dívida encontrada e não resolvida:** registrar em [docs/exec-plans/tech-debt-tracker.md](docs/exec-plans/tech-debt-tracker.md).
- **Agente falhou?** Pergunte qual capacidade faltou (doc, ferramenta, teste/guard) e adicione ao repo — não só reprompte.

## Banco e ambiente

Prisma/MySQL (`prisma/schema.prisma`: `User`, `SharedRule`, `Operation`, `Module`, `UserModule`). `prisma generate` roda no `npm install`.
Variáveis: `DATABASE_URL`, `NEXT_PUBLIC_APPID`, `JWT_SECRET`, `NEXT_PUBLIC_DERIV_API_URL`.
`next.config.mjs` desliga Turbopack e tem regras webpack para TensorFlow.js (dependência hoje sem uso — ver dívida técnica).

## graphify

Existe grafo em `graphify-out/`. Para perguntas de código: `graphify query "<pergunta>"`, `graphify path "<A>" "<B>"`, `graphify explain "<conceito>"`. Após alterar código: `graphify update .`.
