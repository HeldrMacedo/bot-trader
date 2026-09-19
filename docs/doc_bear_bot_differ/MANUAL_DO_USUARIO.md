# Bear Bot Differ (v3.5 Refatorado) — Manual Completo do Usuário e Guia Operacional

Bem-vindo ao manual oficial de operação do **Bear Bot Differ**, o mais avançado robô quantitativo para operações em contratos de dígitos (**DIFERENTE DE / DIFFER**) na corretora [Deriv](https://deriv.com).

Este guia foi elaborado para traders iniciantes e avançados, explicando passo a passo como configurar o robô, entender cada uma das 8 abas de inteligência analítica, aplicar a gestão de risco matemática e operar com disciplina e consistência.

---

## 1. Introdução: Como Funciona o Contrato Differ

No mercado de índices sintéticos da Deriv, o contrato **DIFERENTE DE (DIFFER)** funciona da seguinte maneira:
- Você seleciona um **Dígito Barreira** (entre $0$ e $9$).
- O robô aposta que o **último dígito** da cotação no tick seguinte **NÃO SERÁ** o dígito escolhido.
- Se o tick sair com qualquer um dos outros 9 dígitos, a operação é **VENCEDORA (WIN)**.
- Se o tick sair exatamente com o dígito da barreira, a operação é **PERDEDORA (LOSS)**.

### A Matemática da Operação:
- **Taxa Teórica de Acerto:** $\approx 90\%$ (9 chances em 10).
- **Retorno Financeiro (Payout):** $\approx 9.5\%$ a $10\%$ sobre o valor apostado.
- **Risco de Cauda:** Uma única perda consome $100\%$ do valor da stake daquela operação.

> [!WARNING]
> Devido à assimetria do contrato Differ (ganhos pequenos frequentes e perdas grandes pontuais), operar de forma aleatória ou emocional é o caminho mais rápido para quebrar uma conta. O **Bear Bot Differ** utiliza modelos estatísticos avançados (como o Motor 2.0, FDR de Benjamini-Hochberg e Loss Virtual) para encontrar anomalias exploráveis e só enviar ordens quando as probabilidades estiverem matematicamente a seu favor.

---

## 2. Primeiros Passos e Conexão Automática

O Bear Bot Differ foi integrado de forma transparente ao sistema `bot-trader`:

1. **Seleção de Conta:**  
   No cabeçalho superior direito da plataforma, verifique qual conta Deriv está ativa: **DEMO (Virtual)** ou **REAL**. O robô se sincroniza instantaneamente com a conta selecionada.
2. **Sem Necessidade de Chaves Manuais:**  
   Você **não precisa** digitar Token ou App ID na tela. A autenticação é segura e realizada automaticamente pelo sistema.
3. **Navegação:**  
   No menu lateral esquerdo, clique em **Bear Bot Differ** para acessar o módulo.

---

## 3. Painel de Configurações Lateral (Barra Lateral Esquerda)

Antes de iniciar as operações, configure os parâmetros de acordo com o seu plano de trading:

### 3.1. Parâmetros Financeiros
- **Mercado:** Selecione o índice sintético desejado (ex: `Volatility 10 Index`, `Volatility 100 Index` ou índices de 1 segundo `Volatility 10 (1s) Index`).
- **Stake Inicial ($):** O valor da primeira entrada (recomendado: o mínimo da corretora, como `$0.35` ou `$1.00`, dependendo do tamanho da sua banca).
- **Meta de Lucro / Take Profit ($):** O valor em dólares que você deseja alcançar no dia. Assim que atingida, o robô encerra o ciclo automático e protege o capital.
- **Limite de Perda / Stop Loss ($):** O valor máximo que você aceita perder na sessão. **Esta trava é inviolável.**

### 3.2. Gestão de Martingale
- **Multiplicador:** O fator pelo qual a stake será multiplicada após um loss (no Differ, valores típicos variam entre $10.5\text{x}$ e $11.5\text{x}$ para recuperação imediata).
- **Tipo de Martingale:**
  - **Normal:** Recupera toda a perda anterior mais o lucro inicial em um único acerto. Exige banca adequada.
  - **Parcial:** Divide a recuperação em etapas fracionadas, reduzindo drasticamente o rebaixamento de banca em sequências negativas.
- **Máximo de Etapas:** Quantas vezes o robô tem permissão para multiplicar a aposta (ex: se configurado para `1`, após um segundo loss consecutivo ele aceita o stop e não multiplica novamente).

### 3.3. Modo Operacional
- **Simulação (Paper Trading):** Executa todas as lógicas e simula as compras em tempo real contra o mercado sem arriscar seu saldo real. Ideal para testar estratégias e validar o mercado do dia.
- **Modo Real:** Envia ordens financeiras reais para a corretora Deriv.

No modo simulado **não correm martingale, stop loss nem stop win**. A stake fica sempre no valor base e os limites financeiros só valem sobre a conta real: prejuízo e lucro de papel não gastam limite de conta nenhuma, e recuperar perda falsa com stake maior distorceria a medição do robô.

### 3.3.1. Testes antes de operar (trava de validação)

O bloco "Testes antes de operar" tem um checkbox, **Testar antes de liberar o real**, que só pode ser marcado com o modo de operação em Simulação. Com ele desmarcado, os campos abaixo ficam bloqueados e o Modo Real vale imediatamente. Com ele marcado, cada lógica precisa se provar antes de mandar ordem para a corretora:

- **Liberar real após (ops):** tamanho da janela de operações simuladas que a lógica precisa completar.
- **Com acerto simulado ≥:** acerto mínimo exigido no fechamento dessa janela.

Como funciona na prática, com `10` ops e `60%`: quando a lógica escolhida aponta um alvo, o robô entra em papel. Ao completar as 10 operações, ele confere o acerto da janela. Se estiver em 60% ou mais, aquela lógica passa a operar na conta real e o seletor de modo muda sozinho para Real. Se estiver abaixo, a janela **recomeça do zero** e a lógica continua em papel.

Pontos importantes:

- **A liberação é da lógica, não do robô.** Cada lógica tem a própria janela. Com a lógica A liberada, um alvo vindo da lógica B — que ainda está medindo — sai em papel. Quando a liderança passa para uma lógica não liberada, o seletor volta sozinho para Simulação.
- **O progresso de cada lógica congela e é retomado.** Trocando a lógica ativa no meio, a janela parcial fica guardada e continua de onde parou quando aquela lógica voltar a dar as ordens.
- **O Motor 2.0 é tratado como uma lógica.** Na fonte `Motor 2.0` ele tem a própria janela. Na fonte `Motor + Lógica` o alvo só nasce quando os dois concordam, então a janela já mede exatamente esse par.
- **As janelas zeram** ao parar o bot, ao recarregar a página, ao trocar a fonte do sinal ou a lógica escolhida, e ao desmarcar o checkbox. Validação vale para a sessão corrente: progresso velho liberaria dinheiro real com base em medição obsoleta.
- **`Liberar real após (ops)` em `0`** libera na hora — é o jeito de dizer "sem teste" mantendo o checkbox ligado.

### 3.4. Gatilho de Perda Virtual (Virtual Loss)
- **Ativar Loss Virtual:** O robô não entra de imediato. Ele calcula as entradas em segundo plano e aguarda ocorrerem derrotas simuladas consecutivas (ex: $1$ ou $2$ perdas virtuais) antes de colocar dinheiro real.
- **Perdas Virtuais Mínimas:** Quantidade de derrotas consecutivas exigidas para armar o gatilho (recomendado: `1` ou `2`).
- **Repick no Gatilho:** Quando o loss virtual acontece, o robô isola o dígito que acabou de sair e recalcula a barreira mais segura.
- **Filtro de Exaustão:** Só permite o disparo se o termômetro estatístico confirmar que o padrão de repetição atingiu o ponto de exaustão.

### 3.5. Travas de Segurança (Safety Guards)
- **Trava de Operações:** Limite máximo de trades por sessão (ex: $50$ operações).
- **Trava de Assertividade Mínima:** Se a taxa de acerto real da sessão cair abaixo de um limite (ex: $85\%$), o robô pausa imediatamente as operações automáticas para preservar o saldo.

---

## 4. Guia Passo a Passo das 8 Abas Analíticas

O Bear Bot Differ é composto por 8 abas de alta tecnologia. Veja a utilidade de cada uma:

```
┌───────────┬─────────┬────────────┬─────────────┬────────────┬───────┬──────────┬────────┐
│ Operação  │ Lógicas │ Vigilância │ Laboratório │ Validação  │ Risco │ Esteira  │ Sistema│
└───────────┴─────────┴────────────┴─────────────┴────────────┴───────┴──────────┴────────┘
```

---

### Aba 1: Operação (Painel de Controle Principal)

Esta é a tela onde você acompanha a execução dos trades:

1. **Fita dos Últimos Ticks:**  
   Exibe visualmente os últimos 20 dígitos extraídos do índice em tempo real. O dígito mais recente aparece em destaque dourado.
2. **Medidor de Assertividade (Gauge Circular):**  
   Mostra em tempo real a taxa de acerto da sessão. Ele acompanha tanto a assertividade das previsões virtuais quanto a das operações executadas.
3. **Termômetro de Exaustão:**  
   Indica se o mercado está em fase de saturação estocástica ou se há risco de repetição consecutiva de dígitos anômalos.
4. **Indicador do Proposal Keeper (⚡ Ícone de Raio):**  
   - **Verde (⚡ Ativo):** O robô já está com a cotação do contrato Differ subscrita no WebSocket. A ordem será executada em menos de 10 milissegundos.
   - **Cinza / Amarelo:** O robô está negociando a nova proposta com a Deriv.
5. **Botões de Comando:**  
   - **Iniciar Operações Automáticas:** Coloca o robô em modo de caça contínua, analisando cada tick e entrando quando os filtros forem satisfeitos.
   - **Pausar Robô:** Interrompe novas entradas imediatamente.
   - **Executar Entrada Manual:** Dispara uma ordem pontual no dígito recomendado. A recomendação segue a configuração **Fonte do sinal**, e não mais sempre o Motor 2.0 — veja a seção correspondente abaixo.
   - **Resetar Estatísticas:** Zera o painel da sessão para começar uma nova jornada de operações.

#### Fonte do sinal: quem escolhe o dígito

O seletor **Fonte do sinal**, no card do automático, define o critério de recomendação — e vale tanto para as entradas automáticas quanto para as manuais. As duas leem exatamente o mesmo alvo, de modo que o número mostrado na tela é sempre o número que será operado.

| Fonte | Quando entra |
| :--- | :--- |
| **Motor 2.0** | Quando o score composto de saturação atinge o mínimo configurado. As lógicas seguem apenas medindo. |
| **Lógica medida** | Quando a lógica escolhida no seletor "Lógica" atinge a confiança mínima. O score do motor deixa de valer. |
| **As duas, no mesmo dígito** (padrão) | Confirmação dupla: score e confiança acima dos mínimos **e** os dois apontando o mesmo dígito. |

Com a fonte no Motor 2.0, o seletor "Lógica" fica desabilitado, porque nesse modo ele não influencia entrada nenhuma.

#### Os dois sentidos de "a líder do ranking"

O seletor "Lógica" oferece duas leituras do topo da tabela, e elas não são a mesma coisa:

- **Por evidência — a líder aprovada no teste (FDR):** só considera lógicas que passaram no Benjamini-Hochberg. Em índices sintéticos, o normal é nenhuma passar, e então o robô não entra. Isso é o funcionamento correto, não uma falha.
- **A líder por acerto medido — maior acerto da tabela:** pega o topo da tabela por taxa de acerto, exigindo apenas amostra mínima e acerto acima do empate técnico. Não há prova de vantagem aqui — você está operando a medição bruta, e uma nota abaixo do seletor lembra disso enquanto a opção estiver escolhida.

Com esse modo escolhido, o card **Melhor alvo no momento** mostra em qual lógica ele parou e com que taxa de acerto — por exemplo, `lógica escolhida: Exaustão de perdedores · acerto 92,5%`. Quando nenhuma qualifica, a mesma linha diz isso.

Um exemplo real: a primeira colocada tinha 92,52% de acerto em 254 sinais, acima do empate técnico de 90,91%, com p = 0,2166 — ou seja, uma chance em cinco de esse resultado ser puro acaso. O modo por evidência recusa operar; o modo por acerto medido aceita.

A coluna **Acerto** na aba Lógicas e a **confiança** no card do alvo são coisas diferentes: acerto é a taxa medida dos sinais passados daquela lógica, confiança é a convicção do palpite que ela está fazendo agora.

#### As três formas de entrar

1. **Analisar mercados → Confirmar entrada:** congela o alvo na tela, abre uma proposta pré-cotada na Deriv e espera sua confirmação. É o caminho mais rápido na hora da compra.
2. **Botão no card "Melhor alvo no momento":** entra imediatamente no alvo ao vivo, recalculado no instante do clique. Não usa proposta pré-cotada — o alvo muda a cada tick e mantê-lo cotado encheria a conexão de propostas que vencem sem uso.
3. **Automático:** o robô entra sozinho a cada tick que satisfizer os filtros.

Com o **Gatilho de Perda Virtual** ligado, os dois botões manuais não compram: eles armam o Loss Virtual e esperam as perdas configuradas, exatamente como o automático faz.

#### O que barra uma entrada manual

O clique manual passa pelas mesmas travas do automático: mercado ligado, operação única por vez, travas de segurança, amostra mínima, fonte do sinal, trava de viés e filtro de exaustão. Quando alguma delas barra, o botão fica desabilitado e o motivo aparece escrito abaixo dele.

Duas diferenças propositais em relação ao automático:

- O **intervalo mínimo entre entradas** não barra o clique manual — ele existe para frear o robô, não o operador. Mas a sua ordem manual passa a contar para o intervalo do automático, já que as duas vão para a mesma conta.
- Uma **trava de segurança** apenas recusa o clique, sem desligar o automático. No caminho automático, a mesma trava desliga o robô.

#### A trava de testes no modo manual

Com o checkbox "Testar antes de liberar o real" ligado, as entradas simuladas da janela são **automáticas mesmo com o modo automático desligado** — é o robô que precisa provar a lógica, não você que precisa clicar dezenas de vezes em papel. Enquanto a janela não fecha, o botão do card "Melhor alvo no momento" fica desabilitado e o motivo mostra o progresso, no formato `Trava de testes: 7/10 ops · 57.1% (mín. 60%)`. O mesmo progresso aparece como etiqueta no topo do card.

Quando a lógica passa, o botão destrava e o clique entra na conta real. Ele continua destravado enquanto aquela lógica for a que está dando as ordens; se a liderança passar para uma lógica ainda não medida, o botão volta a travar até a janela dela fechar.

---

### Aba 2: Lógicas (Disputa das 17 Lógicas & FDR)

O sistema possui 17 algoritmos de inteligência em constante competição, todos medidos a cada tick, em todos os mercados ligados — não há configuração que restrinja quais entram na disputa:

1. **Tabela de Ranking FDR (Taxa de Falsas Descobertas):**  
   Aplica o rigoroso teste estatístico de **Benjamini-Hochberg** com $q = 0.10$. Apenas as lógicas que possuem significância matemática comprovada recebem o selo verde **"APROVADA"**. Lógicas que estão vencendo por mera sorte ou ruído são marcadas como **"DESCARTE"**.
2. **Desempenho por Mercado:**  
   Permite conferir qual lógica está tendo melhor assertividade no ativo específico que você escolheu (`R_10`, `R_50`, etc.).
3. **Modo de Seleção de Lógica:**  
   - **Auto (Recomendado):** O robô opera sempre com a lógica que possui o maior score e aprovação FDR no momento do tick.
   - **Rotação:** Alterna entre as melhores lógicas para diversificar as entradas.
   - **Recente:** Foca na lógica com melhor desempenho nos últimos 50 ticks.
   - **Manual:** Permite que você fixe uma das 17 lógicas disponíveis.

---

### Aba 3: Vigilância (Scanner Multivariado a cada 5 segundos)

A aba de Vigilância monitora continuamente os 7 mercados sintéticos da Deriv:

- **Como funciona:** A cada 5 segundos, o scanner aplica testes de estabilidade do gerador de números e verifica a saúde estatística de cada índice.
- **Os 4 Níveis de Status:**
  - 🟢 **Normal:** O mercado apresenta distribuição equilibrada e comportamento previsível. **Excelente para operar.**
  - 🟡 **Observação:** Pequenas assimetrias detectadas. Recomenda-se cautela ou exigência de Loss Virtual mais alto.
  - 🔴 **Quebra de Regime:** O gerador de ticks sofreu uma mudança estrutural abrupta (detectada via Drift Test). **NÃO OPERE neste ativo até que ele volte a se estabilizar.**
  - ⚪ **Amostra Baixa:** O mercado ainda está acumulando os primeiros 120 ticks do histórico.
- **Dica de Ouro:** Antes de ligar o robô, consulte a aba de Vigilância e escolha o mercado que estiver com status verde e maior estabilidade.

---

### Aba 4: Laboratório (Testes Científicos de Aleatoriedade)

O Laboratório submete o histórico de ticks a uma bateria de 5 testes estatísticos formais:

1. **Frequência Qui-Quadrado ($\chi^2$):** Testa se a distribuição dos dígitos de 0 a 9 é perfeitamente uniforme.
2. **Teste de Sequências (Runs Test):** Avalia se as sequências de alternância e repetição seguem um padrão aleatório autêntico.
3. **Autocorrelação de 1ª Ordem:** Verifica se o dígito atual tem dependência linear com o dígito anterior.
4. **Serial Test (Pares de Dígitos):** Testa a probabilidade de pares consecutivos (ex: $2 \to 7$, $8 \to 3$).
5. **Gap Test:** Mede o intervalo de distância entre as saídas de um mesmo dígito.
6. **Veredito Global com Correção de Bonferroni:**  
   O sistema combina os 5 testes e aplica a rigorosa correção de Bonferroni. Se o veredito indicar *"Presença de Anomalia Explorável"*, o robô sabe exatamente qual dígito está matematicamente menos propenso a se repetir.
7. **Matriz de Transição de Markov ($10 \times 10$):**  
   Um mapa de calor completo mostrando a probabilidade de transição de cada dígito para qualquer outro dígito.

---

### Aba 5: Validação (Walk-Forward & Backtesting Rápido)

Nunca arrisque dinheiro sem antes testar seu plano:

- O simulador Walk-Forward processa o histórico coletado de ticks e simula a execução das estratégias.
- Apresenta métricas indispensáveis:
  - **Fator de Lucro (Profit Factor);**
  - **Assertividade Percentual;**
  - **Rebaixamento Máximo (Max Drawdown);**
  - **Gráfico de Evolução da Curva de Capital.**

---

### Aba 6: Risco (Critério de Kelly & Ruína de Monte Carlo)

A ciência da preservação de capital aplicada às suas operações:

1. **Dimensionador de Lote pelo Critério de Kelly:**  
   Calcula matematicamente a fração exata do seu saldo que deve ser alocada por entrada, baseado no payout do Differ e na sua taxa histórica de acerto.
   - **Full-Kelly:** O limite matemático teórico (muito agressivo para trading prático).
   - **Half-Kelly (50%):** Recomendado para crescimento acelerado de banca com volatilidade controlada.
   - **Quarter-Kelly (25%):** **Recomendado para conservadores.** Menor rebaixamento e curva de capital suave.
2. **Simulação de Ruína de Monte Carlo:**  
   Executa 1.000 simulações de trajetórias futuras com $100$ trades cada, informando a probabilidade exata da sua banca sofrer um drawdown superior a $25\%$, $50\%$ ou atingir a quebra total.

---

### Aba 7: Esteira Genética (Pipeline de Otimização Tripla)

A esteira genética é uma ferramenta que cria e valida novas estratégias automaticamente, sem cair na armadilha do *overfitting* (sobreajuste):

- **Requisito:** É necessário acumular pelo menos **600 ticks** no mercado selecionado.
- **O Processo em 4 Fases:**
  - **Fase 0 (Filtro de Regime):** Analisa se o mercado não está em quebra estrutural.
  - **Fase 1 (Descoberta):** Gera centenas de genomas candidatos com pesos aleatórios e testa na partição $A$ (primeiros 50% dos dados).
  - **Fase 2 (Validação Out-of-Sample):** Testa os sobreviventes na partição $B$ (próximos 25% dos dados) sob controle estrito de falsas descobertas (FDR).
  - **Fase 3 (Reserva & Permutação):** Testa os melhores na partição $C$ (últimos 25% dos dados) e roda 50 permutações de Monte Carlo para garantir que a estratégia não venceu por mero acaso.
- Estratégias que sobrevivem a todo o funil são promovidas automaticamente para disputar entradas com o Motor 2.0 de referência!

---

### Aba 8: Sistema (Latência, CSV e Backup)

Controle técnico da sua estação de trabalho:

- **Monitor de Qualidade da Conexão:** Exibe o tempo de resposta em milissegundos do WebSocket da Deriv para envio de propostas e compras.
- **Exportar Operações (CSV):** Baixe uma planilha completa com cada trade executado na sessão (timestamp, mercado, contrato, barreira, stake, payout, resultado e saldo acumulado) para sua declaração ou análise no Excel.
- **Exportar / Importar Perfil (JSON):** Salve suas configurações favoritas de gestão de risco e recarregue-as a qualquer momento com 1 clique.

---

## 5. Regras de Ouro de Gestão de Risco para Contratos Differ

Para obter sucesso no longo prazo operando Differ, siga rigorosamente estas diretrizes:

1. **Respeite Incondicionalmente o Stop Loss:**  
   Nunca aumente ou desligue o Stop Loss durante um momento de perda. No Differ, uma sequência descontrolada de Martingale consome qualquer banca.
2. **Utilize o Gatilho de Loss Virtual:**  
   Não opere sem Loss Virtual em contas reais. Exigir ao menos $1$ derrota virtual reduz expressivamente a exposição ao risco de repetição de dígitos consecutivos.
3. **Consulte Sempre a Aba Vigilância:**  
   Opere apenas em ativos que estiverem com status verde (**Normal**). Se o ativo entrar em **Quebra de Regime**, pare imediatamente ou mude para outro índice.
4. **Defina Metas Diárias Razoáveis:**  
   Uma meta diária entre $1\%$ e $3\%$ sobre a banca é sustentável. O overtrading (operar por horas consecutivas sem parar) inevitavelmente expõe sua conta a eventos de cauda estatística.
5. **Prefira o Martingale Parcial:**  
   Se sua banca for pequena (abaixo de $200), utilize o Martingale Parcial ou limite as etapas a no máximo 1 ou 2 multiplicações.

---

## 6. Perguntas Frequentes (FAQ) & Solução de Problemas

### ❓ "O robô está com o modo automático ligado, mas não faz entradas. O que pode ser?"
- **Causa 1:** O **Loss Virtual** está ativo e o mercado ainda não gerou a quantidade de derrotas virtuais necessárias para armar o gatilho. Isso é normal e demonstra que o robô está protegendo seu capital.
- **Causa 2:** O **Filtro de Exaustão** está ligado e a pontuação do mercado ainda não atingiu o nível de saturação exigido.
- **Causa 3:** Alguma **Trava de Segurança** (limite de operações ou assertividade mínima) foi atingida. Verifique o aviso no painel de Operação.

### ❓ "Apareceu a mensagem de que são necessários 600 ticks na Esteira Genética. Como resolver?"
- Deixe o robô aberto no ativo escolhido por alguns minutos. A Deriv gera cerca de 1 tick a cada 1 ou 2 segundos. Assim que o contador atingir 600 ticks, o botão da Esteira Genética será liberado.

### ❓ "Como alternar entre a conta Demo e a conta Real?"
- Basta clicar no seletor de contas no topo da página do `bot-trader`. O Bear Bot Differ detectará a mudança de conta em tempo real, atualizará o saldo na barra lateral e reiniciará as propostas com total segurança, sem necessidade de atualizar a página (`F5`).

### ❓ "Onde meus dados e histórico de operações ficam salvos?"
- Suas operações ficam registradas na memória local segura do seu navegador e podem ser exportadas a qualquer momento em arquivo `.csv` através da aba **Sistema**.
