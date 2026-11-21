# Qualidade por domínio

Atualizado em 2026-11-21. Nota 0–5 (0 = sem garantia, 5 = coberto, documentado e verificado mecanicamente). Baseada em inspeção de testes/docs, **não** em cobertura medida, salvo onde indicado. Reavaliar ao fechar um plano ou pagar dívida.

| Domínio | Testes | Docs | Nota | Lacuna principal |
|---------|--------|------|------|------------------|
| Bear Bot Differ | ~25 arquivos (engine, math, gate, UI, persistência); piso 90%/arquivo em engine, hook e `OperationTab` | README, manual | 4 | Cobertura medida só em 3 arquivos |
| Bear Bot Ultra 2 | ~25 arquivos `bearBot2*` + UI; `vitest.score.config.ts` para o score | README extenso, docs ao lado do código | 3 | `BearBot2Engine` (1824 linhas) toca `window`; sem piso de cobertura geral |
| Bear Bot Ultra v1 | `bearBotUltra*.test.tsx` | README | 2 | Componente único, lógica misturada à UI |
| BotTrader | `copyTrading*.test.ts`, `copyTradingService.test.ts` | `BOTTRADER.md`, `copy-trader-doc.md` | 3 | Estado em memória; sem teste de reconexão do WS |
| Operações/Histórico | `operation*`, `history*`, `manualFinishedTrade` | nenhum doc dedicado | 3 | Falta doc de contrato de `Operation` |
| Autenticação | `auth`, `login`, `register`, `resetPassword`, `middleware`, `rateLimiter` | `AUTH_ROUTES.md`, [SECURITY.md](SECURITY.md) | 3 | Rate limit só em memória |
| Deriv (`DerivService`) | `derivServiceOtpAuth`, `derivTokenDiagnostics`, `derivProfitTableRange` | `DERIV_OAUTH_MIGRATION.md` | 2 | Reconexão e canais pouco testados |
| Docs/Harness | `docsHarness.test.ts` | este índice | 3 | Sem lint de arquitetura nem agente de limpeza recorrente |

## Camadas

| Camada | Estado |
|--------|--------|
| types/math/score puros | Bom no Differ; Ultra 2 tem `bearbot2.score.ts` isolado |
| Engines sem React/window | Differ ok; Ultra 2 não |
| Hooks como única ponte Deriv | Ultra 2 e Differ ok; Ultra v1 mistura |
| Verificação mecânica de dependência | Inexistente (ver [dívida](exec-plans/tech-debt-tracker.md)) |

## Como rodar

```bash
npm test                  # suíte completa
npm run test:coverage     # piso por arquivo configurado
npm run test:score:coverage
```
