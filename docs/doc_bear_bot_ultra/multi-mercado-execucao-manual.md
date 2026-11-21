O modo **Multi-Mercado ON com Execução MANUAL** funciona como um "radar inteligente" de alta velocidade. A principal diferença é que, em vez de o robô clicar no botão de compra sozinho (Automático), ele assume o papel de analista em tempo real, jogando para a sua tela o mercado mais quente para que você execute o clique.

Aqui está o funcionamento detalhado, passo a passo, incluindo a lógica matemática por trás dele:

---

### 1. Varredura Simultânea (Paralelismo)
O robô mantém conexões abertas com os **7 mercados de volatilidade** da Deriv ao mesmo tempo (R_10, R_25, R_50, R_75, R_100, R_10S, R_25S).
Cada vez que um novo dígito sai em *qualquer* um desses 7 mercados, o robô dispara uma análise individual para ele, mantendo um histórico dos últimos 120 dígitos para cada índice de forma independente.

---

### 2. A Métrica de Exaustão (Os Cálculos)
Para classificar se um mercado está pronto para ser operado, o robô calcula duas coisas dependendo do modo que você configurou:

#### A. Se você usa Padrão de Gatilho (Modo Differ com Padrão):
O robô analisa os dígitos do mercado `sym` procurando a sequência que você definiu (exemplo: `3` seguido de `6`).
* Se a sequência armar, ele ativa o monitoramento de Loss Virtual para o dígito que deve ser evitado (`b`).
* O cálculo da força do gatilho (**Score**) é:
  $$\text{Score} = \text{Losses Virtuais Acumulados no dígito b} + \text{Repetições da sequência nos últimos ticks}$$
* Quanto mais perdas virtuais ocorrerem seguidas no dígito do contrato, mais "exaurido" está o mercado, aumentando o Score.

#### B. Se você NÃO usa Padrão (Estratégia Clássica):
O robô analisa a distribuição estatística geral daquele mercado nas últimas 50 rodadas utilizando um cálculo de anomalia (desvio matemático):
* Ele analisa se o dígito que você selecionou para evitar (ex: `5`) está saindo **muito mais do que a média matemática normal** (o normal é sair $10\%$ das vezes).
* Se o dígito selecionado tiver saído muito mais do que a média esperada (ex: saindo $20\%$ ou $30\%$ nos últimos 50 ticks), isso indica um desvio estatístico.
* O cálculo do **Score** nesse caso é:
  $$\text{Score} = \text{Losses Virtuais do Mercado} + \text{Excesso de Anomalia}$$
  *(Onde o Excesso é a porcentagem a mais que o dígito saiu em relação à média padrão)*.

---

### 3. A Tomada de Decisão (O Auto-Foco)
Toda vez que um novo tick chega em qualquer mercado:
1. O robô recalcula o **Score** do mercado correspondente.
2. Ele verifica se o **Gatilho de Loss Virtual está Aberto** para aquele mercado (ou seja, se a quantidade de perdas virtuais dentro da nossa nova *Janela Deslizante* atingiu a **Qtd. Perdas** configurada por você).
3. Se o gatilho estiver aberto, esse mercado é adicionado a uma lista de "Candidatos Quentes".
4. O robô ordena todos os candidatos pelo **Score** (do maior para o menor). O mercado com o maior Score é considerado o de "volatilidade ideal" (maior probabilidade de vitória).

---

### 4. A Troca e Indicação na Tela (UI)
Se o mercado com o maior Score no momento for **diferente** do mercado que você está vendo na tela agora:
1. O robô verifica se já se passaram mais de **3 segundos** desde a última troca automática (trava anti-flicker).
2. Se sim, ele atualiza a tela instantaneamente:
   * O gráfico muda para o novo índice.
   * Os dados de ticks, dígitos e estatísticas mudam para o novo índice.
   * Se for o modo Differ com padrão, o dígito alvo de entrada é ajustado automaticamente.
   * O Log avisa: `🌐 MULTI (Manual) · Foco em R_XX (Pronto!)`.
3. Tudo o que você precisa fazer é olhar para o botão rápido de **"Entrar Agora"** (Compra Rápida) e clicar nele. Você estará entrando exatamente no mercado que a matemática provou ser o mais provável de dar **WIN** naquele exato instante!