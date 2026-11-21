# Dívida técnica

Prioridade: **P0** agora · **P1** próximo ciclo · **P2** quando tocar na área. Itens pagos saem daqui (o git guarda).
Levantada em 2026-11-21 durante a reestruturação da documentação.

| # | P | Item | Evidência | Gatilho / como pagar |
|---|---|------|-----------|----------------------|
| 1 | P0 | **Tokens reais no histórico do git** (`localstorage.md`, `docs/localStorage.md`, removidos do working tree) | `git log -- localstorage.md docs/localStorage.md` | Revogar o JWT (`JWT_SECRET` novo invalida todos) e o token Deriv `activeToken`; se o repo sair da máquina, reescrever histórico (`git filter-repo`) |
| 2 | P1 | Script `lint` aponta para `bot-strategy/**` (módulo removido): lint não roda em nada | `package.json` linha `lint` | Apontar para `src/` e corrigir avisos; ou usar `eslint src` |
| 3 | P1 | Dependências sem uso: `@tensorflow/*`, `json-rules-engine`, `@deriv/deriv-api` (nenhum import em `src/`) + regras webpack/`transpilePackages` de TensorFlow em `next.config.mjs` | `grep` em `src/` | Remover pacotes e config; checar `npm run build` |
| 4 | P1 | `BearBot2Engine` acessa `window`/`localStorage` (17 ocorrências) | `grep -c` | Injetar storage/clock; subir acesso para `useBearBot2` |
| 5 | P1 | Sem verificação mecânica de camadas/dependências | — | Teste estrutural (ex.: vitest varrendo imports de `services/*Engine.ts` proibindo `react`, `next`, `window`) com mensagem de correção |
| 6 | P2 | `SharedRule` no schema sem uso no código (rota `/api/shared-rules` não existe; `sharedRules.test.ts` órfão foi removido); doc `COMMUNITY_RULES.md` removido | `prisma/schema.prisma` | Decidir: remover modelo (migração) ou reativar feature |
| 7 | P2 | `bear-bot-ultra/` v1 em um único componente | `bearBotUltra.tsx` | Extrair engine/hook ou aposentar a v1 |
| 8 | P2 | Rate limiter e estado do BotTrader em memória | `rateLimiter.js`, `copyTradingManager.ts` | Redis/DB se houver >1 instância |
| 9 | P2 | Entradas comentadas de módulos extintos em `SideBar.tsx` (`/bot-analitico`, `/bot-strategy`) | `SideBar.tsx` ~linhas 116-122 | Apagar comentários |
| 10 | P2 | `prisma/migrations` com nomes `init_postgres` apesar de provider MySQL; `prisma/dev.db` versionado | `prisma/` | Revisar migrações; tirar `dev.db` do git se não for fixture |
| 11 | P2 | Docs `doc_bear_bot_*/README.md` extensos (300–620 linhas) | `wc -l` | Dividir por tópico, manter README curto com links |
| 12 | P1 | `bearDifferTradeResults.test.tsx` "keeps only the last ten" falha: commit 8552624 removeu `slice(0, limit)` da `TradeResultsTable` (tabela agora rola); `limit` virou prop morta | `npm test` | Atualizar o teste para a nova regra (mostra todas) e remover prop `limit` |
| 13 | P2 | Agente recorrente para caça de doc obsoleto e atualização de `QUALITY_SCORE.md` | — | `/loop` ou rotina agendada rodando `docsHarness` + revisão |
