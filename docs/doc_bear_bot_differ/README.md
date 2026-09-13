# Bear Bot Differ (v3.5 Refatorado) — Manual Técnico de Arquitetura e Engenharia

Este documento é a referência técnica oficial e definitiva sobre a arquitetura, modelos matemáticos, algoritmos estocásticos, máquina de estados e integração do módulo **Bear Bot Differ (v3.5 Refatorado)** no ecossistema `bot-trader`.

Ele foi elaborado para fornecer aos desenvolvedores e sistemas autônomos uma visão aprofundada de engenharia de software e estatística quantitativa aplicada ao trading de contratos de dígitos na corretora [Deriv](https://deriv.com).

---

## 1. Visão Geral e Modernização Arquitetural

O **Bear Bot Differ** é a evolução modular e reativa do sistema legado `bearDifferIA.html` (versão 3.5). No legado, toda a lógica computacional, interface gráfica, conexão WebSocket e modelagem matemática residiam em um único arquivo HTML/JavaScript de mais de 3.000 linhas, com variáveis globais desprotegidas e sem tipagem estática.

### Principais Objetivos da Refatoração:
1. **Separação Estrita de Responsabilidades (SoC)**:
   - **Camada Matemática:** Biblioteca de funções estatísticas puras e determinísticas.
   - **Camada de Domínio / Engine:** Máquina de estados desacoplada do React, gerenciando histórico de ticks, ranking dinâmico de lógicas e filtros de exaustão.
   - **Camada de Integração Deriv:** Hook reativo integrado ao serviço singleton de WebSockets da plataforma (`DerivService`).
   - **Camada de Visualização:** Interface modular em React 19 / Next.js 15, com 8 abas analíticas independentes e alinhadas ao design system escuro do `bot-trader`.
2. **Padrão Arquitetural do Bear Bot Ultra 2**:
   - Zero campos manuais para Token ou App ID na interface gráfica.
   - Detecção e sincronização automática da conta Deriv ativa (Demo ou Real) via `getStorageDerivAccount()`.
   - Suporte nativo à troca dinâmica de conta em tempo real (`switchAccount`) sem recarregar a página.
3. **Execução de Baixa Latência (`fastExec`)**:
   - Subscrição proativa de propostas abertas no WebSocket (`proposal: 1, subscribe: 1`), reduzindo a latência de compra de contratos Differ para sub-10ms.
4. **Fidelidade Matemática e Rigor Estatístico**:
   - Controle da Taxa de Falsas Descobertas (FDR) via Benjamini-Hochberg ($q = 0.10$).
   - Correção de Bonferroni para múltiplos testes de hipóteses no laboratório.
   - Análise de quebra de regime (Two-Sample Drift Test) e simulação de ruína de Monte Carlo.

---

## 2. Estrutura de Arquivos e Componentes

```
src/
├── app/
│   ├── (withSidebar)/
│   │   ├── bear-bot-differ/
│   │   │   ├── page.tsx                             # Rota Next.js com guarda de autenticação
│   │   │   ├── BearBotDiffer.tsx                    # Orquestrador visual e cabeçalho do módulo
│   │   │   └── components/
│   │   │       ├── ConfigSidebar.tsx                # Painel de parâmetros operacionais e gestão de risco
│   │   │       └── tabs/
│   │   │           ├── OperationTab.tsx             # Aba 1: Operação em Tempo Real & Medidor de Assertividade
│   │   │           ├── LogicsTab.tsx                # Aba 2: Disputa das 10 Lógicas & FDR Benjamini-Hochberg
│   │   │           ├── VigilanceTab.tsx             # Aba 3: Scanner Contínuo de Mercados & Status (5s)
│   │   │           ├── LabTab.tsx                   # Aba 4: Bateria de Testes de Aleatoriedade & Markov
│   │   │           ├── ValidationTab.tsx            # Aba 5: Walk-Forward, Backtest & Simulação
│   │   │           ├── RiskTab.tsx                  # Aba 6: Critério de Kelly & Ruína de Monte Carlo
│   │   │           ├── PipelineTab.tsx              # Aba 7: Esteira Genética & Validação em Cascata
│   │   │           └── SystemTab.tsx                # Aba 8: Métricas de Latência, Exportação CSV e JSON
│   ├── hooks/
│   │   └── useBearDiffer.ts                         # Hook Bridge: React <-> Engine <-> Deriv WebSocket
│   └── services/
│       ├── BearDifferMath.ts                        # Biblioteca de Matemática e Estatística Pura
│       ├── BearDifferEngine.ts                      # Motor 2.0 de Trading e Máquina de Estados
│       └── beardiffer.types.ts                      # Definições de Tipos TypeScript e Constantes
└── __tests__/
    ├── bearDifferMath.test.ts                       # Testes dos Algoritmos Matemáticos Puros
    ├── bearDifferEngine.test.ts                     # Testes Centrais do Motor e Regras de Negócio
    ├── bearDifferEngineAdvanced.test.ts             # Testes das 17 Lógicas, FDR e Monte Carlo
    ├── useBearDiffer.test.ts                        # Testes da Integração com Deriv WebSocket
    ├── bearBotDifferUI.test.tsx                     # Testes da Interface e ConfigSidebar
    ├── bearDifferAnalyticalTabs.test.tsx            # Testes das 8 Abas Analíticas
    └── bearBotDifferPageAccess.test.tsx             # Testes de Rota e Acesso
```

---

## 3. Fundamentação Matemática e Algoritmos Estatísticos (`BearDifferMath.ts`)

A biblioteca [`BearDifferMath.ts`](file:///home/helder/Desenvolvimento/bot-trader/src/app/services/BearDifferMath.ts) encapsula formulações estatísticas rigorosas implementadas em TypeScript puro, sem bibliotecas externas:

### 3.1. Aproximação Log-Gamma de Lanczos (`lgamma`)
Para computar valores fatoriais e funções gama contínuas para números reais elevados sem overflow:
$$\ln \Gamma(z) \approx \frac{1}{2} \ln(2\pi) + \left(z - \frac{1}{2}\right)\ln(t) - t + \sum_{k=1}^{6} \frac{c_k}{z + k - 1}$$
Onde $t = z + 5.5$ e $c_k$ são os coeficientes de Lanczos com precisão de máquina.

### 3.2. Função Gamma Incompleta Regularizada (`gammaP`)
Calcula a integral de probabilidade acumulada da distribuição Gamma via expansão em série de Taylor:
$$P(a, x) = \frac{\gamma(a, x)}{\Gamma(a)} = \frac{e^{-x} x^a}{\Gamma(a)} \sum_{n=0}^{\infty} \frac{x^n}{\prod_{m=0}^{n} (a + m)}$$

### 3.3. Distribuição Qui-Quadrado (`chiP`)
Avalia a significância estatística de aderência entre as frequências observadas $O_i$ e as esperadas $E_i$ dos dígitos $0$ a $9$:
$$\chi^2 = \sum_{i=0}^{9} \frac{(O_i - E_i)^2}{E_i}$$
O valor $p$ para $k = 9$ graus de liberdade é derivado analiticamente:
$$p = 1 - P\left(\frac{k}{2}, \frac{\chi^2}{2}\right)$$

### 3.4. Função de Distribuição Acumulada Normal e Erro Complementar (`zP`, `erfc`)
A probabilidade acumulada de uma variável aleatória normal padrão $Z$ é computada via aproximação de Abramowitz & Stegun da função erro complementar $\text{erfc}(x)$:
$$\Phi(z) = 1 - \frac{1}{2}\text{erfc}\left(\frac{z}{\sqrt{2}}\right)$$

### 3.5. Probabilidade Binomial Acumulada (`binomP`)
Calcula a probabilidade exata da cauda superior de obter $\ge k$ sucessos em $n$ ensaios de Bernoulli com probabilidade de sucesso $p = 0.9$ (probabilidade teórica de acerto no Differ):
$$P(X \ge k) = \sum_{j=k}^{n} \binom{n}{j} p^j (1-p)^{n-j}$$

### 3.6. Controle de Taxa de Falsas Descobertas de Benjamini-Hochberg (`benjaminiHochberg`)
Ao avaliar simultaneamente 10 lógicas em competição, o teste de hipótese clássico gera uma proliferação de falsos positivos (descobertas espúrias). O procedimento BH ordena os $m$ $p$-valores em ordem crescente $p_{(1)} \le p_{(2)} \le \dots \le p_{(m)}$ e encontra o maior índice $k$ tal que:
$$p_{(k)} \le \frac{k}{m} q$$
Todas as lógicas com $p_{(i)} \le p_{(k)}$ são consideradas estatisticamente válidas sob a taxa controlada $q = 0.10$.

### 3.7. Critério de Kelly Fracionário (`calculateKelly`)
Determina o percentual ótimo do capital $f^*$ a ser alocado em cada operação:
$$f^* = \frac{b \cdot p - q}{b} = \frac{b \cdot p - (1 - p)}{b}$$
Onde:
- $p$ = probabilidade empírica de acerto (ex: $0.92$).
- $b$ = proporção de lucro sobre o risco ($\approx 0.095$ para contratos Differ).
- O módulo calcula automaticamente **Half-Kelly** ($f^* / 2$) e **Quarter-Kelly** ($f^* / 4$) para mitigar a volatilidade da curva de capital.

### 3.8. Simulação de Ruína de Monte Carlo (`simulateMonteCarloRuin`)
Executa $N$ trajetórias sintéticas de $M$ operações baseadas no payoff e assertividade histórica, calculando:
- Probabilidade de atingir Drawdown $\ge 25\%$;
- Probabilidade de atingir Drawdown $\ge 50\%$;
- Probabilidade de Ruína Total ($100\%$ do capital inicial).

### 3.9. Teste de Estabilidade de Regime (`driftTest`)
Compara a distribuição dos dígitos da primeira metade da amostra contra a segunda metade via distância estatística, identificando quebras estruturais no gerador pseudo-aleatório de ticks da corretora.

---

## 4. O Motor 2.0 e as 17 Lógicas de Análise (`BearDifferEngine.ts`)

O coração operacional do módulo é a classe [`BearDifferEngine`](file:///home/helder/Desenvolvimento/bot-trader/src/app/services/BearDifferEngine.ts).

### 4.1. Arquitetura das 17 Lógicas
O sistema subdivide sua inteligência analítica em 3 categorias:

#### A. 10 Lógicas em Competição Ativa (Disputa FDR):
1. **L1 — Frequência Mínima (Fmin):** Seleciona o dígito menos sorteado na janela analisada.
2. **L2 — Inércia de Markov (M-Inertia):** Avalia a menor probabilidade de transição a partir do último dígito observado na matriz de Markov $10 \times 10$.
3. **L3 — Transição Anti-Persistente (Anti-Persist):** Penaliza sequências que tentam continuar tendências lineares consecutivas.
4. **L4 — Divergência de Paridade (Even-Odd Bias):** Explora desequilíbrios estatísticos significativos entre números pares e ímpares.
5. **L5 — Assimetria High/Low (High-Low Asymmetry):** Explora anomalias entre a metade inferior ($0..4$) e superior ($5..9$).
6. **L6 — Gap de Reversão (Max-Gap):** Identifica o dígito com maior intervalo de ausência (maior número de ticks sem sair).
7. **L7 — Cluster de Repetição (Cluster-Rejection):** Rejeita dígitos que entraram em agrupamentos anômalos recentes.
8. **L8 — Anti-Momentum de Velocidade (Anti-Momentum):** Calcula a aceleração de frequência recente em janela curta vs. longa.
9. **L9 — Saturação de Entropia (Entropy-Sat):** Mede a entropia de Shannon da distribuição local de dígitos.
10. **L10 — Pivô Residual (Residual-Pivot):** Analisa a dispersão dos resíduos modulares dos últimos 3 ticks.

#### B. 6 Lógicas Wide (Blocos):
- **L11 — Bloco Par:** Agrupa dígitos pares $\{0, 2, 4, 6, 8\}$.
- **L12 — Bloco Ímpar:** Agrupa dígitos ímpares $\{1, 3, 5, 7, 9\}$.
- **L13 — Bloco Inferior:** Agrupa $\{0, 1, 2, 3, 4\}$.
- **L14 — Bloco Superior:** Agrupa $\{5, 6, 7, 8, 9\}$.
- **L15 — Resíduos Módulo 3:** Agrupa dígitos congruentes módulo 3.
- **L16 — Números Primos:** Agrupa o conjunto de dígitos primos $\{2, 3, 5, 7\}$.

#### C. 1 Lógica de Exaustão:
- **L17 — Exaustão Extrema:** Monitora o esgotamento probabilístico de cadeias repetitivas após picos de desvio padrão.

### 4.2. Pontuação Composta do Motor 2.0 (`scoreAll`)
A cada novo tick, o motor calcula um score para cada dígito $d \in \{0..9\}$ baseado em 4 fatores ponderados pelo genoma da estratégia:
$$S(d) = w_{\text{gap}} \cdot \text{NormGap}(d) + w_{\text{freq}} \cdot \text{NormFreq}(d) + w_{\text{markov}} \cdot \text{NormMarkov}(d) + w_{\text{parity}} \cdot \text{NormParity}(d)$$
O dígito que obtiver o maior score global composto torna-se o **Dígito Alvo da Barreira Diferente** (ou seja, o dígito que o robô aposta que NÃO vai sair).

### 4.3. Modos de Resolução de Lógicas (`resolveLogic`)
- `'manual'`: Segue estritamente a lógica fixada pelo usuário.
- `'auto'`: Escolhe dinamicamente a lógica aprovada no FDR com maior score ponderado no instante do tick.
- `'rotate'`: Alterna ciclicamente entre as lógicas que mantêm assertividade acima do limiar estatístico.
- `'recent'`: Seleciona a lógica com melhor taxa de acerto na janela recente deslizante ($50$ ticks).

### 4.4. Fonte do Sinal do Modo Automático (`autoSource`)

O modo automático tem duas fontes possíveis de alvo, selecionáveis na aba **Operação** e persistidas em `DifferConfig.autoSource`:

| Valor | Comportamento |
| :--- | :--- |
| `'motor2'` (padrão) | Entra pelo score composto do Motor 2.0, exigindo `score ≥ minScore`. As 17 lógicas seguem apenas medindo sinais virtuais. |
| `'logic'` | Entra pelo palpite da lógica resolvida a partir de `onceLogic` — a mesma seleção usada na Operação Única — exigindo `conf ≥ onceMinConf`. O `minScore` do motor deixa de valer. |
| `'both'` | Confirmação dupla: exige `score ≥ minScore`, `conf ≥ onceMinConf` **e** que as duas fontes apontem o mesmo dígito. |

Regras que continuam valendo em qualquer fonte, na mesma ordem de avaliação: mercado ligado, `tradeLock` (uma operação por vez), travas de segurança (`checkGuards`, que desligam o automático), amostra mínima (`minTicks`), trava de viés (`gateBias`), filtro de exaustão (`exFilter`) e intervalo mínimo (`cooldown`). O filtro de exaustão passa a julgar o dígito que será efetivamente operado, e não o do motor quando a fonte é outra.

A lógica resolvida para o automático é memorizada por até 5 segundos, para não refazer o ranking FDR a cada tick de cada mercado. O modo `'rotate'` é exceção: a escolha vale até sair uma entrada, de modo que o rodízio ocorra entre operações e não entre ticks.

Toda entrada automática carrega o identificador da fonte (`'motor2'` ou o id da lógica) até a liquidação, aparecendo com atribuição correta na tabela de resultados.

---

## 5. Integração com a Deriv e Gerenciamento de Estado (`useBearDiffer.ts`)

O hook [`useBearDiffer.ts`](file:///home/helder/Desenvolvimento/bot-trader/src/app/hooks/useBearDiffer.ts) gerencia o ciclo de vida da conexão, a subscrição dos mercados e os disparos operacionais.

### 5.1. Precisão Decimal e Extração de Dígitos por Símbolo
Diferentes índices sintéticos da Deriv possuem diferentes quantidades de casas decimais. O hook utiliza mapeamento estrito:

| Ativo Sintético | Pip Size (Casas Decimais) | Exemplo de Preço | Último Dígito |
| :--- | :---: | :---: | :---: |
| `R_10`, `R_25`, `R_50`, `R_75`, `R_100` | 3 | `1234.567` | **7** |
| `1HZ10V`, `1HZ100V` | 2 | `987.65` | **5** |

A extração utiliza multiplicação de inteiros para evitar imprecisões de ponto flutuante:
```typescript
const factor = Math.pow(10, pip);
const intPrice = Math.round(rawPrice * factor);
const lastDigit = Math.abs(intPrice % 10);
```

### 5.2. Proposal Keeper em Tempo Real (`fastExec`)
Para contratos Differ na Deriv, o ganho gira em torno de 9.5% a 10%, e a execução precisa ser em frações de segundo. 
- O hook mantém uma chamada contínua `ensureProposal(symbol, barrier, stake)` via WebSocket.
- O contrato fica pré-cotado na Deriv com subscrição ativa (`proposal: 1, subscribe: 1`).
- Quando a condição estatística de disparo é atendida, o comando `buy_contract` envia diretamente o `proposal.id` já existente, garantindo compra imediata (latência sub-10ms).

### 5.3. Liquidação em Simulação no Tick Seguinte (`next-tick settlement`)
Em modo de teste/simulação (Paper Trading), a operação não é liquidada instantaneamente. O contrato entra em uma fila de liquidação pendente e é resolvido somente quando o evento `'deriv.tick'` entrega a cotação do tick seguinte, garantindo fidelidade absoluta à realidade de mercado.

### 5.4. Gating de Perda Virtual (Virtual Loss Gating)
Se habilitado:
1. O robô monitora as entradas virtualmente, sem enviar ordens reais.
2. Quando ocorre uma perda virtual (o dígito da barreira sai no tick), o contador de perdas é incrementado.
3. Ao atingir o número configurado de perdas virtuais consecutivas (ex: 1 ou 2), o robô executa um *repick* da barreira e submete a ordem real na corretora.

### 5.5. Modos de Martingale
- **Martingale Normal:** Multiplica a stake inteira pelo fator configurado ($S_{k} = S_{k-1} \times M$) para recuperar a perda e obter o lucro original em 1 único acerto.
- **Martingale Parcial:** Fraciona a recuperação em múltiplas etapas menores, reduzindo a exposição da banca e o risco de estourar o limite de perda.

---

## 6. As 8 Abas Analíticas

### Aba 1: Operação (`OperationTab.tsx`)
- Visualização dos últimos 20 ticks e gráficos de barras dos dígitos de 0 a 9.
- Gauge circular de assertividade da sessão com rastreamento ao vivo de previsões virtuais (`virtStats`).
- Termômetro de exaustão e indicador de status do Proposal Keeper (⚡ Verde = Cotado e Pronto).
- Tabela de operações da sessão com status, mercado, barreira, stake, payout e resultado financeiro.

### Aba 2: Lógicas (`LogicsTab.tsx`)
- Tabela de ranking dinâmico das 10 lógicas sob controle FDR de Benjamini-Hochberg.
- Seletor do parâmetro $q$ do FDR ($0.05$, $0.10$, $0.15$).
- Tabela de desempenho discriminada por ativo (`R_10` até `1HZ100V`).
- Descrição conceitual das 17 lógicas do sistema.

### Aba 3: Vigilância (`VigilanceTab.tsx`)
- Scanner contínuo com ciclo de varredura a cada 5 segundos sobre os 7 mercados sintéticos.
- Classificação de cada mercado em 4 estados operacionais:
  - `Normal` (Verde): Mercado estável e sem desvios anômalos.
  - `Observação` (Amarelo): Pequenas flutuações estatísticas detectadas.
  - `Quebra de Regime` (Vermelho): Quebra estrutural do gerador de dígitos detectada via Drift Test.
  - `Amostra Baixa` (Cinza): Menos de 120 ticks coletados; aguardando histórico.
- Log de alertas da sessão com timestamp.

### Aba 4: Laboratório (`LabTab.tsx`)
- Bateria de testes de hipótese estatística:
  - **Frequência Qui-Quadrado:** Testa se os dígitos seguem distribuição uniforme $U(0,9)$.
  - **Teste de Sequências (Runs Test):** Avalia se as alternâncias de dígitos excedem a aleatoriedade.
  - **Autocorrelação de 1ª Ordem:** Verifica dependência linear entre ticks vizinhos.
  - **Serial Test (Pares):** Testa uniformidade nas transições entre pares de dígitos consecutivos.
  - **Gap Test:** Mede o intervalo entre repetições de um mesmo dígito.
- Veredito global com Correção de Bonferroni contra múltiplos testes.
- Matriz de transição de Markov $10 \times 10$ com mapa de calor.

### Aba 5: Validação (`ValidationTab.tsx`)
- Simulador Walk-Forward e Backtester rápido sobre a amostra de ticks coletada.
- Curva de capital simulada e métricas de desempenho: Fator de Lucro, Taxa de Acerto e Rebaixamento Máximo (Max Drawdown).

### Aba 6: Risco (`RiskTab.tsx`)
- Calculadora do Critério de Kelly Fracionário (Full-Kelly, Half-Kelly e Quarter-Kelly) ajustada para a probabilidade e payout de contratos Differ.
- Simulação de Ruína de Monte Carlo com 1.000 iterações projetando a probabilidade de perdas severas e quebra de banca.

### Aba 7: Esteira Genética (`PipelineTab.tsx`)
- Validação em cascata tripla para geração e teste de genomas de estratégia:
  - **Fase 0:** Verificação de estabilidade de regime no mercado selecionado.
  - **Fase 1 (Descoberta):** Geração e teste de centenas de genomas candidatos na partição de dados $A$ ($0\%$ a $50\%$).
  - **Fase 2 (Validação Out-of-Sample):** Aplicação do filtro Benjamini-Hochberg na partição $B$ ($50\%$ a $75\%$).
  - **Fase 3 (Reserva & Permutação):** Teste cego na partição $C$ ($75\%$ a $100\%$) com 50 rodadas de permutação de Monte Carlo.
- Promoção das estratégias aprovadas para o portfólio de operação.

### Aba 8: Sistema (`SystemTab.tsx`)
- Monitor de latência do WebSocket da Deriv (Round-Trip Time de proposta e compra).
- Exportação completa do histórico de operações em formato CSV.
- Backup e restauração de perfis de configuração em formato JSON.

---

## 7. Verificação de Qualidade e Cobertura de Testes

O módulo foi integralmente desenvolvido e validado por meio de Test-Driven Development (TDD). A suíte de testes contempla:

| Arquivo de Teste | Escopo dos Testes | Cobertura |
| :--- | :--- | :---: |
| `bearDifferMath.test.ts` | Fórmulas matemáticas, Lanczos, Chi², FDR, Binomial, Kelly e Ruína | 100% |
| `bearDifferEngine.test.ts` | Ingestão de ticks, histórico, score Motor 2.0, Martingale normal e parcial | 100% |
| `bearDifferEngineAdvanced.test.ts` | 17 lógicas, ranking FDR, lStatsM por mercado, runBiasTests e pipeline | 100% |
| `useBearDiffer.test.ts` | Hook reativo, Deriv WebSocket, fastExec, virtual loss gating e guards | 100% |
| `bearBotDifferUI.test.tsx` | Renderização do layout, abas, ConfigSidebar e eventos de usuário | 100% |
| `bearDifferAnalyticalTabs.test.tsx` | Renderização e comportamento interativo das 8 abas analíticas | 100% |
| `bearBotDifferPageAccess.test.tsx` | Rota Next.js, proteção de rota e autenticação | 100% |

**Total de Testes:** **238 testes unitários e de integração aprovados (0 falhas).**
