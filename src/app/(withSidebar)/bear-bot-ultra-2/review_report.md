## Revisão de Código: Bear Bot Ultra 10.0 (Refatorado)

Entendido o pedido. Faremos a verificação do que está na documentação (`BearBotUltra_10_Analise_Funcionalidades.md` e `BearBotUltra_10_Refatorado.txt`) em relação à realidade do código na pasta `src/app/(withSidebar)/bear-bot-ultra-2` e os arquivos de lógica base no backend (`BearBot2Engine.ts` e `useBearBot2.ts`).

### O que está de acordo com o planejado:
1. **Engine de Trading Desacoplada**: A lógica central está corretamente isolada na classe `BearBotEngine` (TypeScript puro), enquanto os componentes React apenas consomem o estado através do `useBearBot2`.
2. **Loss Virtual, Gale e Proteções**: As configurações e regras de Loss Virtual (Acumulado/Consecutivo), Martingale (Multiplicador/Parcelado), e Proteções (Pós-loss Recover/Analyze) estão implementadas no estado e renderizadas na interface.
3. **Métricas de IA**: A UI (`IntelPanel.tsx` e `MarketGrid.tsx`) reflete o Score de Oportunidade, Pressão, Padrão, VL, Sincronia e Recomendação com os respectivos pesos cruzados.
4. **Ciclo de Compra Automático**: O apontamento de que o robô não executava trades automaticamente ("sinal sim, executeTrade automático não") **foi resolvido**. O código atual implementa um event listener `engine.onAutoTrade` que dispara assincronamente `executeTrade(kind)` no `useBearBot2.ts`.

---

### Pontos de BUG e Ajustes Necessários (Gaps de Funcionalidade):

Abaixo listo os pontos que requerem sua atenção e ajuste para que o sistema funcione 100% como especificado na análise de funcionalidades:

#### 1. Timeout Falso de Trade Lock (Risco de Travar o Robô)
No hook `useBearBot2.ts` (`executeTrade`), há um `setTimeout` de 10s programado como safety timeout, mas o callback **está vazio** (possui apenas um comentário):
```typescript
const timeout = setTimeout(() => {
  // Engine libera tradeLock via settlement ou timeout
}, 10000);
```
**O Bug**: Se houver um engasgo na WebSocket e o evento de finalização (`proposal_open_contract`) nunca chegar, a engine continuará com `tradeLock = true` permanentemente, travando novas ordens.
**Ajuste**: Criar e chamar um método na engine (como `engineRef.current.releaseTradeLock()`) dentro do timeout, para garantir o destravamento após falha da API.

#### 2. Funcionalidade Combo Incompatível com a API da Deriv (Real Mode)
No arquivo `BearBot2Engine.ts`, o `prepareCombo()` retorna um payload local `payload: { combo: true, stakeVal: ... }`.
**O Bug**: Em `useBearBot2.ts`, o método `executeTrade` despacha esse objeto genérico de forma direta com `await derivService.send(prep.payload)`. A Deriv rejeitará essa chamada, pois a flag `combo` é um controle interno do bot, e não um endpoint existente na API da corretora.
**Ajuste**: No `executeTrade`, capturar a requisição `if (prep.kind === 'combo')` e manualmente orquestrar duas chamadas assíncronas `derivService.send({ buy: 1, parameters: {...} })` (uma para a perna OVER e outra para UNDER).

#### 3. Ausência de Controles Visuais para "Padrão A→B" na UI
A engine implementa toda a lógica complexa do padrão A→B de markov/wilson/lift, além das flags `patTrigger`, `patReps`, `patMinForce` e `patMode`.
**O Bug**: Como alertado na sua análise funcional, não existe nenhum lugar em `page.tsx` para o usuário configurar ou habilitar esses padrões, ficando travado permanentemente nos `defaults` da engine (`patTrigger: false`). O usuário nunca conseguirá operar usando Padrões nesse momento.
**Ajuste**: Adicionar um novo painel (Card) de configuração para `Padrões de Repetição` no `page.tsx` para permitir que o usuário ative/desative (`patTrigger`), escolha repetições e defina o modo de acumulação.

#### 4. Métrica chiSquare (Anomalia de Distribuição) não é exibida
**O Bug**: O cálculo `chiSquare(sym)` existe e tem impacto teórico, mas não foi injetado em tela, tanto no `IntelPanel.tsx` como no `MarketGrid.tsx`.
**Ajuste**: Renderizar os outputs visuais de `chiSquare` e `marketAnomaly` no `IntelPanel` para dar mais granularidade sobre o estado estocástico de longo prazo do mercado.

Deseja que eu inicie a implementação desses 4 pontos de correção, começando pelo destravamento do Trade Lock e execução do Combo?
