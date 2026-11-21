# Golden principles

Regras opinativas e verificáveis. Preferem-se invariantes a receitas: o que importa é o resultado, não a biblioteca.
Regra sem verificação mecânica está marcada **(convenção)** e tem item em [dívida técnica](exec-plans/tech-debt-tracker.md).

1. **Validar na fronteira.** Dados de WebSocket, API e `localStorage` são parseados/normalizados ao entrar; dentro, tipos confiáveis. Nada de "sondar no escuro" campos opcionais espalhados. **(convenção)**
2. **Lógica pura fora do React e fora do I/O.** Matemática, score e Engines recebem dependências por injeção e são testáveis em env `node`. **(convenção)**
3. **Persistência nunca quebra o fluxo de negociação.** Salvar operação é fire-and-forget e engole erro com log (`persistBotOperation`). PnL, martingale e trava de trade não dependem do DB. Só conta real é gravada.
4. **Um trade real por vez.** Guard de reentrada (`onTrade` no BotTrader; trava equivalente nos bots do browser) antes de qualquer `buy`.
5. **Timeout em tudo que trava o bot.** Espera por resposta do WS tem timeout de segurança que destrava o engine (30s no Ultra 2).
6. **Sem closures estagnadas.** Callbacks de WS leem estado via ref/listener desacoplado, não via valor capturado no render.
7. **Segredo nunca no repo.** Token, JWT, `.env`, dumps de `localStorage` ficam fora de código, docs e testes (use valores fictícios óbvios).
8. **Teste antes do código.** Todo bug ganha teste de regressão que falha antes da correção; toda feature ganha teste que define o comportamento.
9. **Doc vive com o código.** Mudou comportamento ou estrutura → atualiza `docs/` no mesmo PR. Doc de coisa removida é apagado.
10. **Dívida é registrada, não escondida.** Atalho consciente entra em [tech-debt-tracker](exec-plans/tech-debt-tracker.md) com dono e gatilho de pagamento.
11. **Logout só por `logout()`** de `userService.js`; auth só pelo middleware + layout documentados em [AUTH_ROUTES.md](AUTH_ROUTES.md).

## Verificação mecânica atual

- `src/__tests__/docsHarness.test.ts`: CLAUDE.md curto, links válidos, índice completo, sem módulos extintos, sem segredos em docs.
- Piso de cobertura por arquivo (90%) em `BearDifferEngine`, `useBearDiffer`, `OperationTab` (`vitest.config.ts`).
- `vitest.score.config.ts`: cobertura do score do Ultra 2.
