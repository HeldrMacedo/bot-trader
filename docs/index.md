# Índice da documentação

Sistema de registro do projeto. Ponto de entrada para agentes: [../CLAUDE.md](../CLAUDE.md).
Regra: todo doc vivo em `docs/` precisa estar listado aqui (validado por `src/__tests__/docsHarness.test.ts`).

## Núcleo

| Doc | Conteúdo |
|-----|----------|
| [ARCHITECTURE.md](ARCHITECTURE.md) | Mapa de domínios, camadas, dependências permitidas, módulos removidos |
| [GOLDEN_PRINCIPLES.md](GOLDEN_PRINCIPLES.md) | Regras mecânicas e opinativas do código |
| [QUALITY_SCORE.md](QUALITY_SCORE.md) | Nota de qualidade por domínio e lacunas |
| [RELIABILITY.md](RELIABILITY.md) | WebSocket, travas, timeouts, falhas toleradas |
| [SECURITY.md](SECURITY.md) | Segredos, autenticação, rate limit |

## Plataforma

| Doc | Conteúdo |
|-----|----------|
| [AUTH_ROUTES.md](AUTH_ROUTES.md) | JWT, middleware, rotas públicas/protegidas |
| [DERIV_OAUTH_MIGRATION.md](DERIV_OAUTH_MIGRATION.md) | OAuth PKCE, OTP, canais WebSocket da Deriv |
| `documentacao_deriv/` | Referência oficial da API Deriv (cópia; não editar à mão) |

## Bots

| Doc | Conteúdo |
|-----|----------|
| [BOTTRADER.md](BOTTRADER.md) | Copy Trader server-side |
| [doc_bear_bot_ultra/README.md](doc_bear_bot_ultra/README.md) | Bear Bot Ultra v1 |
| [doc_bear_bot_ultra/multi-mercado-execucao-manual.md](doc_bear_bot_ultra/multi-mercado-execucao-manual.md) | Multi-mercado com execução manual |
| [doc_bear_bot_ultra_2/README.md](doc_bear_bot_ultra_2/README.md) | Bear Bot Ultra 2 (referência técnica) |
| [doc_bear_bot_ultra_2/NOVA_TASK.md](doc_bear_bot_ultra_2/NOVA_TASK.md) | Spec do Ranking de Padrões W/L (em andamento) |
| [doc_bear_bot_ultra_2/PROPOSTA_FUNCIONALIDADES_IA.md](doc_bear_bot_ultra_2/PROPOSTA_FUNCIONALIDADES_IA.md) | Proposta de funcionalidades com IA (não implementada) |
| [doc_bear_bot_differ/README.md](doc_bear_bot_differ/README.md) | Bear Bot Differ (referência técnica) |
| [doc_bear_bot_differ/MANUAL_DO_USUARIO.md](doc_bear_bot_differ/MANUAL_DO_USUARIO.md) | Manual do usuário do Differ |

Docs ao lado do código: `src/app/(withSidebar)/bear-bot-ultra-2/` (`score_oportunidade.md`, `cronograma_de_ativacao_por_ticks.md`, `grafico_sincronia.md`, `review_report.md`) e `bottrader/` (`copy-trader-doc.md`, `MELHORIAS.md`).

## Planos e dívida

| Doc | Conteúdo |
|-----|----------|
| [exec-plans/active/README.md](exec-plans/active/README.md) | Planos ativos |
| [exec-plans/completed/README.md](exec-plans/completed/README.md) | Planos e revisões concluídos |
| [exec-plans/tech-debt-tracker.md](exec-plans/tech-debt-tracker.md) | Dívida técnica priorizada |

Planos/specs gerados pelo fluxo superpowers ficam em `superpowers/specs/` e `superpowers/plans/` (nomeados por data).

## Manutenção

- Doc mudou de lugar ou foi removido: atualizar este índice e rodar `npm test`.
- Doc descreve algo que não existe mais: apagar (git guarda o histórico), não deixar "descontinuado".
- Nunca colar tokens, JWT ou dumps de `localStorage` em doc.
