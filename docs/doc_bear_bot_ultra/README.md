# Bear Bot Ultra — Guia Técnico e Manual de Referência do Sistema

Este documento serve como referência técnica detalhada sobre o funcionamento interno, arquitetura, lógica de negócios e integridade do **Bear Bot Ultra** no ecossistema `bot-trader`. Ele foi desenvolvido especialmente para orientar programadores e assistentes de Inteligência Artificial no entendimento e evolução segura do código sem quebrar regras de negócios críticas ou introduzir regressões.

---

## 1. Arquitetura e Estrutura de Estado

O sistema está concentrado em um único componente React Client-Side: [page.tsx](file:///home/helder/Desenvolvimento/bot-trader/src/app/(withSidebar)/bear-bot-ultra/page.tsx).

### 1.1 Hydration e Rendering do Next.js
Para evitar erros de inconsistência de hidratação (Hydration Mismatch) decorrentes do Next.js pré-renderizar no servidor partes dinâmicas (como horários, dados do local storage ou áudios), todos os elementos baseados em janelas de navegador (`window` / `localStorage`) ou inicializações dinâmicas devem ser carregados dentro de um gancho `useEffect` ou isolados do fluxo principal de renderização SSR.

### 1.2 Gerenciamento Duplo de Estado: `useState` vs `stateRef`
Para lidar com o fluxo assíncrono e contínuo de dados vindos do WebSocket da Deriv, a aplicação implementa um padrão híbrido:
1. **`useState` (UI State):** Usado estritamente para renderização visual na tela (por exemplo, atualizar contadores na tabela, alterar gráficos, exibir logs e habilitar botões).
2. **`stateRef` (useRef - Engine State):** Mantém a referência mutável e instantânea de todas as variáveis cruciais de controle do robô (Stakes atuais, saldo, logs acumulados, configurações de Gale, travas de operação e estados das propostas).

> [!IMPORTANT]
> **Por que o `stateRef` é crucial?**
> Funções que escutam eventos do WebSocket (como retornos de ticks e ordens terminadas) são anexadas em ganchos `useEffect` com dependências vazias `[]` para evitar re-subscrições constantes no servidor. 
> Se essas funções lessem as variáveis de estado comuns (`useState`), elas sofreriam de **Stale Closure** (fechamento estagnado), operando sempre com os valores do primeiro render da página (ex: stake sempre zerando em `0.35`). Ao ler e escrever no `stateRef.current`, o robô acessa sempre a configuração mais recente configurada na tela sem precisar re-instanciar o ouvinte de rede.

---

## 2. Comunicação e Integração com a API Deriv

A comunicação ocorre de forma assíncrona bidirecional usando a instância compartilhada `derivService` (WebSocket).

### 2.1 Fluxo de Ticks (Market Data)
Ao iniciar, o robô se inscreve nas atualizações em tempo real dos 7 mercados sintéticos:
* Volatility 10 (1s), 25 (1s), 50 (1s), 75 (1s), 100 (1s), 10, 25.
* A cada nova mensagem recebida no barramento `deriv.tick`:
  1. O último dígito do preço é extraído.
  2. Ele é inserido no array de histórico do respectivo mercado (`tickDataRef.current[symbol].digits`). Capped em no máximo 120 ticks.
  3. A função principal `onNewTick(symbol, digit)` é disparada para computar as regras estatísticas.

### 2.2 Ciclo de Proposals (Proposta de Preço)
Antes de comprar um contrato (por exemplo, DIFFER ou OVER/UNDER), a API da Deriv exige que o robô assine um contrato de proposta (`proposal`) enviando o tipo de operação, barreira, stake e duração.
* **Subscription Clean-Up:** Durante o ciclo de vida ou recarregamento rápido (HMR), a Deriv pode emitir erros de `AlreadySubscribed` ("You are already subscribed to proposal").
* Para evitar conflitos, o sistema possui a função `forgetAllProposals()` que limpa todas as propostas ativas da memória da API antes de requisitar novos preços.
* Sempre que o stake muda (devido a um Gale ou reset de vitória), as propostas antigas são invalidadas e recalculadas em um curto intervalo de tempo (`50ms`).

---

## 3. Modos de Operação e Lógica de Entrada

O robô opera com 4 modalidades fundamentais:

| Modo de Jogo | Descrição Matemática |
| :--- | :--- |
| **DIFFER** | O jogador ganha se o último dígito do tick final for **diferente** do dígito alvo. Paga lucros pequenos (~9.8%), mas possui alta taxa de acerto. |
| **MATCH** | O jogador ganha se o último dígito for **exatamente igual** ao alvo. Paga prêmios elevados (~900%). |
| **OVER** | O jogador ganha se o último dígito for **maior** do que a barreira escolhida. |
| **UNDER** | O jogador ganha se o último dígito for **menor** do que a barreira escolhida. |

### 3.1 Compra Rápida (Quick Trade)
Permite a entrada manual instantânea por parte do usuário a partir dos botões de ação rápida. Essa operação ignora as análises de padrões ou gatilhos estatísticos em background e envia a proposta de compra imediatamente.

---

## 4. O Sistema de Loss Virtual (Janela Deslizante)

O **Loss Virtual (VL)** é o mecanismo de segurança usado para proteger a banca do usuário. Ele simula perdas fictícias antes de colocar o dinheiro real na mesa da corretora.

### 4.1 O Algoritmo da Janela Deslizante (Sliding Window)
O robô monitora as perdas virtuais acumuladas usando o conceito de **Janela Deslizante** no modo `acum`:

1. **A Janela:** Definida pelas variáveis `vlWindow` (tamanho da janela em ticks, ex: 14) e `vlQty` (quantidade mínima de perdas necessárias para liberar a entrada, ex: 5).
2. **Gatilho de Entrada (`vlGateOpen`):** A entrada real só é autorizada se houver pelo menos `vlQty` derrotas acumuladas dentro da janela ativa.
3. **Reset de Histórico e Isolamento Pré-Início (`ticksSinceReset`):**
   * Ao clicar em **Ligar Robô** (`startRobo`), ao resetar estatísticas ou ao concluir uma operação (`vlReset` / `vlResetAllM`), o sistema zera o contador de ticks decorridos desde o início (`ticksSinceReset[sym] = 0`).
   * Isso garante que os ticks coletados enquanto o robô estava desligado **não entrem** no cálculo de loss virtual ao iniciar.
   * A cada novo tick recebido, `ticksSinceReset[sym]` é incrementado em ambos os modos (Mercado Único `vlOnDigit` e Multi-Mercado `vlOnDigitM`).
   * A janela calculada é `windowSize = Math.min(countSinceReset, vlWindow)`.
   * Para evitar a armadilha do JavaScript onde `array.slice(-0)` equivale a `array.slice(0)` (que retornava todo o histórico prévio), a fatia de ticks utiliza a trava `windowSize > 0 ? digits.slice(-windowSize) : []`.
   * Nos primeiros ticks pós-início, a janela cresce gradativamente (ex: `1/14`, `2/14`...) contabilizando estritamente as perdas ocorridas durante a execução ativa.

### 4.2 Lógica Consecutiva (`consec`)
No modo `consec`, o sistema desconsidera a janela e exige que ocorram **X perdas seguidas** sem nenhuma vitória no meio. Se um dígito vencedor aparecer, o contador de perdas consecutivas retorna imediatamente a 0.

---

## 5. Inteligência de Multi-Mercado (Multi ON)

O sistema de múltiplos mercados permite rastrear as oportunidades em todos os 7 índices simultaneamente. Ele funciona sob duas mecânicas baseadas na configuração de Execução (`exec`):

### 5.1 Execução AUTOMÁTICA (`exec === 'auto'`)
O robô analisa os 7 mercados em background.
1. Assim que a condição de Loss Virtual é atingida em um ou mais mercados, eles são incluídos na lista de candidatos (`multiCand`).
2. Os candidatos são ordenados pela maior taxa de exaustão/anomalia (Score).
3. O robô automaticamente foca no mercado de maior pontuação e **dispara a operação real** sem interação humana.

### 5.2 Execução MANUAL (`exec !== 'auto'`)
Com o Multi-Mercado ligado no manual:
1. O robô continua analisando silenciosamente os 7 mercados e calculando o Score de probabilidade baseando-se nas perdas virtuais acumuladas.
2. Quando um mercado atinge o gatilho necessário de entrada, ele se torna um candidato ativo.
3. **Troca Automática de Foco (Auto-Switch):** Se o melhor mercado da lista for diferente do mercado que o usuário está visualizando no momento, o sistema altera dinamicamente o mercado ativo (`setActiveSym`), trazendo os gráficos e o painel de **Compra Rápida** desse mercado quente de forma automática para a tela do usuário.
4. **Trava Anti-Flicker (Mecanismo de Usabilidade):** Para evitar que a tela mude repetidamente em milissegundos devido a ticks concorrentes em alta velocidade, o sistema impõe um tempo de espera mínimo de **3 segundos** (`lastManualSwitch`) entre cada troca automática de mercado na tela do usuário.

---

## 6. Padrões de Diferença (Differ Pattern Mode)

No modo Differ, o robô pode aguardar padrões comportamentais nos dígitos antes de ativar os filtros de perdas virtuais.

* **Armamento do Padrão:** O robô varre os dígitos em busca de uma transição específica (exemplo: padrão $a \to b$).
* **Armamento:** Ao detectar o dígito $a$, o robô fica armado à espera do dígito $b$.
* **Exaustão:** Uma vez completado o padrão, ele monitora quantas vezes o dígito de perda (geralmente $b$) sai de forma virtual para então liberar a compra real do contrato de diferença.
* O Score do padrão é a soma:
  $$\text{Score} = \text{Perdas Virtuais acumuladas no dígito alvo} + \text{Contador de sequência do padrão}$$

---

## 7. Confiabilidade de Ordens

Regras que protegem a banca quando a rede, a corretora ou o usuário agem no meio de uma operação. Cada uma tem teste de regressão (ids `BBU-xx` nos testes).

### 7.1 Trava de operação (`tradeLock`) e ordem viva
* **Ordem viva** é uma compra aguardando resposta (`ordersInFlight`) ou um contrato dentro do prazo de liquidação (`settleTimers`).
* Enquanto houver ordem viva, nada solta a trava: nem **Reset**, nem **Pausar / Abortar** / **Zerar Gale**. A trava sai na liquidação do contrato (`finishTrade` recalcula `tradeLock = hasLiveOrder()`).
* **Trocar de conta** com ordem viva é recusado antes de zerar qualquer estado.
* Sem ordem viva (ex.: compra não confirmada ou contrato que estourou o prazo), **Pausar / Abortar** é a ação explícita que libera o robô.

### 7.2 Compra
* Recusa da corretora (erro comum) libera a próxima entrada.
* `BuyUnconfirmed` (buy enviado sem resposta, vindo do `DerivService`): a ordem pode ter sido executada. A trava fica, o robô para e o usuário deve conferir o extrato antes de abortar.
* **Combo** usa `Promise.allSettled`: perna comprada é sempre acompanhada até liquidar, mesmo se a outra for recusada ("COMBO parcial"). O resultado do combo soma só as pernas compradas.
* Os dados da ordem (`Order`: tipo, stake, mercado, dígito) são gravados na compra. A liquidação registra esses valores, não os da tela, que podem ter mudado enquanto o contrato corria.

### 7.3 Resultado do contrato
* O acompanhamento usa `derivService.subscribe({ proposal_open_contract, contract_id })`. Só assim o `DerivService` reassina o contrato quando o canal de trade cai e volta. Na liquidação, o stream é cancelado (`forget`).
* Só contratos comprados por este robô (`stateRef.contracts`) entram no placar. Resultado de outra tela ou consulta avulsa na mesma conta é ignorado, assim como resultado repetido.
* Liquidado = `is_sold` ou `status` diferente de `open`. Mensagens do contrato ainda aberto não contam.
* Auditoria (`audit_details`) é só exibição: ausente ou com menos de 3 ticks não impede a liquidação.
* O dígito de saída vem de `exit_tick_display_value` (preserva o zero final); `exit_spot` é o fallback.
* **Prazo:** sem resultado em `SETTLEMENT_TIMEOUT_MS` (60s), o robô para com toast de erro e faz uma consulta avulsa do contrato. Se a corretora já liquidou, o resultado entra normalmente. Um resultado que chegue depois do Abortar entra no placar sem soltar a trava de uma ordem nova.

### 7.4 Conexão e ciclo de vida da tela
* Ids de proposta só valem na conexão que os criou: nos eventos `close` e `open` do `DerivService`, `props` é descartado e, na reabertura, as propostas são pedidas de novo.
* **Desligar Robô** e **Abortar** atualizam `stateRef.autoOn` na hora; o tick seguinte não dispara ordem.
* Depois do unmount (`stateRef.alive = false`), respostas e timers atrasados não assinam propostas nem abrem acompanhamento de contrato; os prazos de liquidação são cancelados.
* O botão de som é lido da ref (`stateRef.soundOn`), pois os sons tocam no listener de resultado criado no primeiro render.

---

## 8. Suíte de Testes Automatizados (Vitest)

O Bear Bot Ultra possui cobertura de testes com Vitest e `@testing-library/react`, com piso de 90% por arquivo (linhas, statements e funções) definido em `vitest.config.ts`.

| Arquivo | Conteúdo |
| :--- | :--- |
| `bearBotUltra.test.tsx` | Renderização, troca de conta, ligar/desligar, janela do loss virtual acumulado. |
| `bearBotUltraReliability.test.tsx` | Trava, compra, liquidação, prazo, unmount (BBU-03 a BBU-12), com `DerivService` falso. |
| `bearBotUltraReconnect.test.tsx` | Reconexão com o `DerivService` real sobre WebSocket falso (BBU-01, BBU-02). |
| `bearBotUltraFeatures.test.tsx` | Propostas pré-abertas, martingale, stops, loss virtual, modos, multi-mercado, CSV, som. |
| `bearBotUltraPage.test.tsx` | Controle de acesso da página. |
| `bearBotUltraTestHarness.ts` | `DerivService` falso com observer real, ticks, contratos e áudio falsos. |

```bash
npx vitest run src/__tests__/bearBotUltra --exclude '.kilo/**'
```

> [!NOTE]
> Os ramos de **gatilho por padrão** (`patTrigger`) e do modo de padrão sequencial (`patMode = 'seq'`) não têm controle na interface: `setPatTrigger` e `setPatMode` nunca são chamados. São as principais linhas sem cobertura.

---

Este manual detalha o núcleo lógico e de arquitetura do robô. Ao alterar qualquer trecho do código, garanta que as sincronias entre `stateRef` e o WebSocket permaneçam seguras e livres de travas de renderização. 
