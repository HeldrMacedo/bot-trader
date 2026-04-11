# Melhorias Bot Copy Trader — Baseado no ZeekBot

## Concluido

- [x] Limite de Martingale (maxMartingale + onMaxMartingale: stop/reset)
- [x] Testes automatizados (61 testes cobrindo todas as regras de configuracao)
- [x] Fix: guard onTrade (bool_89 do ZeekBot) — previne trade real duplicado por race condition
- [x] Fix: consecutiveLosses exclusivo da demo — previne reentrada indevida na real
- [x] Fix: stakeMultiple=0 tratado como falsy (|| vs ??)
- [x] Fix: calculateNextStake usando martingaleLevel ao inves de consecutiveLosses

## Pendente

### Prioridade Alta

- [ ] **Persistencia em Banco de Dados** — Sessoes, configuracoes e historico de trades salvos no MySQL via Prisma. Atualmente tudo roda em memoria e e perdido ao reiniciar o servidor.

- [ ] **Recovery de sessao na reconexao** — Ao reconectar WebSocket, restaurar estado completo (consecutiveLosses, martingaleLevel, currentStake, etc). Atualmente o retry existe mas o estado nao e recuperado.

### Prioridade Media

- [ ] **Switch on Loss** — Inverter direcao do trade apos perda (CALL->PUT, PUT->CALL). ZeekBot tem `switchlose` para estrategias contrarias.

- [ ] **Notificacoes sonoras** — Sons configuraveis para buy, win, loss, tick no frontend. ZeekBot tem `soundbuy`, `soundwin`, `soundlose`, `soundtick`.

- [ ] **Integracao Telegram** — Campo para Bot Token + Chat ID na configuracao. Enviar notificacoes de win/loss/stop/martingale reset. ZeekBot tem integracao completa com Telegram.Bot.

- [ ] **Grid de trades expandido** — Adicionar colunas: Entry Time, Trade Type, Duration, Barrier ao historico de transacoes. ZeekBot tem GridView completo com todas essas colunas.

- [ ] **Graficos P&L** — Grafico de lucro/prejuizo ao longo do tempo e distribuicao de resultados. ZeekBot tem Charting.cs (6304 linhas) para visualizacao.

- [ ] **Stop Win dinamico (% saldo)** — Opcao de stop win baseado em percentual do saldo ao inves de valor fixo. ZeekBot tem `cbRFAutoBreakWin`.

- [ ] **WebSocket no frontend (substituir polling)** — Trocar o polling de 2s por SSE ou WebSocket para atualizacoes em tempo real na UI.

### Prioridade Baixa

- [ ] **Delay de execucao** — Atraso intencional (em ms) antes de executar o trade na real. Diferente do pauseTime (pausa apos resultado). ZeekBot tem `Delay` na configuracao de estrategia.

- [ ] **Master/Slave toggle** — Selecionar modo de operacao (master envia sinais, slave copia). ZeekBot tem TglSwitch com verde=master, rosa=slave.

- [ ] **Solo trading mode** — Modo de trading isolado para evitar interferencia entre sessoes. ZeekBot tem `chkAlone`.
