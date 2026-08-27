# Bear Bot Ultra 2 (v10.0 Refatorado) — Guia Técnico e Manual de Referência Completo

Este documento é o manual técnico definitivo sobre a arquitetura, modelos matemáticos, algoritmos estatísticos, máquina de estados, regras de negócio e integração do **Bear Bot Ultra 2 (v10.0 Refatorado)** no ecossistema `bot-trader`. 

Ele foi estruturado com rigor para que **Inteligências Artificiais** e **desenvolvedores** possam consultar, manter, depurar e evoluir o sistema com precisão cirúrgica sem introduzir regressões ou quebrar invariantes de trading.

---

## 1. Visão Geral e Inovações do Bear Bot Ultra 2

O **Bear Bot Ultra 2** representa uma reformulação arquitetural completa em relação à versão legada. Seu objetivo central é oferecer uma plataforma de alta performance para operações baseadas em dígitos em índices sintéticos da corretora [Deriv](https://deriv.com), combinando inteligência probabilística multi-mercado em tempo real, proteção avançada de capital e execução ultra-rápida.

### Principais Inovações em Relação à Versão 1:
1. **Engine 100% Desacoplada (`BearBot2Engine.ts`)**: Lógica de trading e cálculos matemáticos isolados em TypeScript puro, completamente desacoplados do ciclo de vida e renderização do React 19.
2. **Radar de Dígitos Dinâmicos (Score Composto)**: Análise estocástica a cada tick que seleciona dinamicamente o dígito estatisticamente mais seguro para operações `DIFFER`, avaliando 4 modelos concorrentes (Frequência Ponderada, Cadeia de Markov Inversa, Trigramas Inversos e Resistência à Anomalia).
3. **Inteligência Probabilística Cross-Market (Score de Oportunidade 0–100)**: Avaliação contínua dos 7 mercados sintéticos baseada em 4 pilares com pesos parametrizáveis pelo perfil de IA (**Conservador**, **Equilibrado** ou **Agressivo**).
4. **Modo Dual-Leg Combo (OVER + UNDER Simultâneo)**: Execução coordenada de duas pernas independentes com liquidação unificada de PnL e suporte a degradação elegante (*demotion*) em caso de falha de uma das pernas.
5. **Prevenção Robusta de Travamentos e Stale Closures**: Substituição de closures estagnadas por listeners desacoplados, além de *Safety Timeouts* de 30s que destravam a engine automaticamente em caso de perdas de pacote no WebSocket.
6. **PropKeeper e Quick Buy (Sub-10ms)**: Manutenção proativa de propostas abertas no WebSocket (`proposal: 1, subscribe: 1`), permitindo compras imediatas pelo `proposal.id` em 1 tick.
7. **Paper Trading Nativo**: Simulação local determinística com avaliação de resultado por tick e contabilidade de PnL e Martingale sem risco de capital.
8. **Proteções Pós-Loss Configuráveis**: Modos alternáveis entre **Recuperação Ativa** (disparos rápidos com Martingale) e **Análise Estocástica** (cooldown obrigatório e reavaliação de filtros estatísticos).

---

## 2. Estrutura de Arquivos e Arquitetura

O módulo segue o padrão arquitetural de **Separação de Responsabilidades (SoC)**:

```
src/
├── app/
│   ├── (withSidebar)/
│   │   └── bear-bot-ultra-2/
│   │       ├── page.tsx                     # Rota Next.js e verificação de autenticação
│   │       ├── bearBotUltra2.tsx            # Orquestrador visual principal (UI / Layout)
│   │       └── components/
│   │           ├── DynamicDigitPanel.tsx    # Painel do Radar de Dígitos Dinâmicos
│   │           ├── IntelPanel.tsx           # Painel de IA do Mercado Ativo & Ranking
│   │           ├── MarketGrid.tsx           # Grid dos 7 Mercados & Indicadores Cross-Market
│   │           └── TradeLog.tsx             # Console de Logs & Exportação CSV
│   ├── hooks/
│   │   └── useBearBot2.ts                   # Hook Bridge (React <-> Deriv WebSocket <-> Engine)
│   └── services/
│       ├── BearBot2Engine.ts                # Motor de Trading Puro (TypeScript sem React)
│       └── bearbot2.types.ts                # Tipos, Interfaces e Constantes do Domínio
└── __tests__/
    ├── bearBot2AutoDigit.test.ts            # Testes do Dígito Automático
    ├── bearBot2Combo.test.ts                # Testes do Modo Combo Dual-Leg
    ├── bearBot2DynamicDigit.test.ts         # Testes do Radar de Dígitos Dinâmicos
    ├── bearBot2Engine.test.ts               # Testes Centrais do Motor de Trading
    ├── bearBot2EnginePostLoss.test.ts       # Testes da Máquina de Pós-Loss
    ├── bearBot2PatternAB.test.ts            # Testes de Padrões de Markov A -> B
    ├── bearBot2QuickBuy.test.ts             # Testes de Proposals e Compra Rápida
    ├── bearBotUltra2.test.tsx               # Testes de Integração do Componente React
    ├── bearBotUltra2AutoDigitUI.test.tsx    # Testes de Interface do Dígito Automático
    ├── bearBotUltra2ComboUI.test.tsx        # Testes de Interface do Modo Combo
    ├── bearBotUltra2PageAccess.test.tsx     # Testes de Acesso e Guard de Autenticação
    └── bearBotUltra2PostLoss.test.tsx       # Testes de Interface dos Controles de Pós-Loss
```

### Diagrama de Fluxo de Dados:

```mermaid
flowchart TD
    subgraph Deriv_WebSocket ["Deriv WebSocket Server"]
        WS_Ticks["Market Public WS (Ticks 1s)"]
        WS_Trade["Trading WS (Buy / Proposals / POC)"]
    end

    subgraph Hook_Layer ["Hook Bridge (useBearBot2.ts)"]
        PropKeeper["PropKeeper (Proposal Cache)"]
        SafeTimer["Safety Timeout (30s Lock Release)"]
        AudioSynth["Audio Context WebAPI"]
    end

    subgraph Engine_Layer ["Core Engine (BearBot2Engine.ts)"]
        TickBuffer["Tick Buffer (120 ticks/sym)"]
        MarkovTri["Markov & Trigram Analyzers"]
        IntelBrain["Opportunity Score & 4 Pillars"]
        DynDigit["Dynamic Digit Composite Engine"]
        VLSystem["Virtual Loss System (Consec/Accum)"]
        GaleManager["Martingale & Capital Control"]
        PostLossSM["Post-Loss State Machine"]
    end

    subgraph UI_Layer ["React 19 Presentation (bearBotUltra2.tsx)"]
        MGrid["MarketGrid (7 Mercados)"]
        IPanel["IntelPanel (Score & Pilares)"]
        DynPanel["DynamicDigitPanel (Radar)"]
        TLog["TradeLog (Logs & CSV)"]
        Controls["Strategy & Risk Controls"]
    end

    WS_Ticks -->|deriv.tick| Hook_Layer
    Hook_Layer -->|processTick| Engine_Layer
    Engine_Layer -->|subscribe notify| Hook_Layer
    Hook_Layer -->|state / config| UI_Layer
    UI_Layer -->|updateConfig / startBot / manualFire| Hook_Layer
    Engine_Layer -->|triggerAutoTrade| Hook_Layer
    Hook_Layer -->|send buy payload / proposalId| WS_Trade
    WS_Trade -->|proposal_open_contract| Hook_Layer
    Hook_Layer -->|settleContract| Engine_Layer
```

---

## 3. Mercados Suportados e Precisão de Dígitos

O robô opera sobre **7 índices sintéticos contínuos** da Deriv. Como o último dígito é a base de todas as tomadas de decisão, a precisão de casas decimais (*pip size*) de cada índice deve ser rigorosamente respeitada:

| Símbolo (`sym`) | Nome do Índice (`nm`) | Pip Size (Casas Decimais) | Exemplo de Preço | Último Dígito Extraído |
| :--- | :--- | :---: | :---: | :---: |
| `R_100` | Volatilidade 100 | **2** | `1234.56` | **6** |
| `R_75` | Volatilidade 75 | **4** | `8543.2198` | **8** |
| `R_50` | Volatilidade 50 | **4** | `3421.5672` | **2** |
| `R_25` | Volatilidade 25 | **3** | `1987.654` | **4** |
| `R_10` | Volatilidade 10 | **3** | `6543.210` | **0** |
| `RDBEAR` | Bear Market Index | **4** | `4321.8765` | **5** |
| `RDBULL` | Bull Market Index | **4** | `7890.1234` | **4** |

### Algoritmo de Extração de Dígito (`extractLastDigit`):
```typescript
export function extractLastDigit(price: number, symbol: string): number | null {
  const pipSizes: Record<string, number> = {
    R_100: 2, R_75: 4, R_50: 4, R_25: 3, R_10: 3,
    RDBEAR: 4, RDBULL: 4,
  };
  const pip = pipSizes[symbol];
  if (pip === undefined) return null;
  const priceStr = price.toFixed(pip);
  return Number(priceStr.slice(-1));
}
```

---

## 4. Modos de Operação e Condições de Vitória

O Bear Bot Ultra 2 suporta 4 modalidades fundamentais de contrato com barreiras matemáticas distintas:

```mermaid
classDiagram
    class ContractMode {
        <<enumeration>>
        OVER
        UNDER
        DIFFER
        COMBO
    }
```

### 4.1 Modo OVER (`DIGITOVER`)
* **Condição de Vitória:** O último dígito final $r > \text{digit}$.
* **Conjunto de Perdedores:** $\{0, 1, \dots, \text{digit}\}$.
* **Taxa de Acerto Teórica:** $\frac{9 - \text{digit}}{10} \times 100\%$.

### 4.2 Modo UNDER (`DIGITUNDER`)
* **Condição de Vitória:** O último dígito final $r < \text{digit}$.
* **Conjunto de Perdedores:** $\{\text{digit}, \text{digit}+1, \dots, 9\}$.
* **Taxa de Acerto Teórica:** $\frac{\text{digit}}{10} \times 100\%$.

### 4.3 Modo DIFFER (`DIGITDIFF`)
* **Condição de Vitória:** O último dígito final $r \neq \text{digit}$.
* **Conjunto de Perdedores:** $\{\text{digit}\}$ (apenas o dígito alvo).
* **Taxa de Acerto Teórica:** $90\%$.
* **Sub-modalidades de Seleção de Dígito no Differ:**
  1. **Manual Fixo:** O usuário clica e escolhe manualmente o dígito $0$ a $9$.
  2. **Dígito Automático (`differAutoDigit`):** Detecta dígitos repetidos que causaram perdas virtuais e ajusta o alvo para esse dígito perdedor.
  3. **Radar de Dígitos Dinâmicos (`differDynamicDigit`):** Utiliza o motor estocástico de **Score Composto** para selecionar o dígito mais frio e estatisticamente desfavorável a cada novo tick recebido.
  4. **Padrão $A \to B$ (`patTrigger`):** Monitora sequências e probabilidades condicionais de Markov. Quando o dígito $A$ surge com o padrão validado, entra em Differ contra o dígito esperado $B$.

### 4.4 Modo COMBO (Dual-Leg Simultâneo)
O modo **COMBO** adquire simultaneamente duas pernas independentes de proteção:
* Perna 1: `DIGITOVER` com barreira `comboOver` (Padrão: 5).
* Perna 2: `DIGITUNDER` com barreira `comboUnder` (Padrão: 4).
* **Condição de Vitória:** $r < \text{comboUnder} \lor r > \text{comboOver}$.
* **Zona de Perda:** $\min(\text{comboUnder}, \text{comboOver}) \le r \le \max(\text{comboUnder}, \text{comboOver})$.
* **Mecânica de Execução e Degradação Elegante (*Demotion*):**
  * O bot submete duas ordens `buy` com stakes individuais.
  * Se ambas as ordens forem aceitas, o bot aguarda a liquidação das duas pernas (`comboPending.legs = 2`), somando os lucros líquidos. O trade só é considerado `LOSS` se ambas as pernas perderem.
  * Se uma perna for aceita e a outra for rejeitada pela corretora (ex: erro de saldo ou cotação), a engine aciona `demoteComboToSingle()`, rebaixando o trade imediatamente para uma operação de perna única sem quebrar o controle de Martingale ou travar a aplicação.

---

## 5. Cérebro de Inteligência Artificial: Score de Oportunidade e os 4 Pilares

O **Score de Oportunidade** ($0$ a $100$) é a métrica mestra calculada a cada 3 ticks para todos os 7 índices simultaneamente. Ele decide se o robô tem permissão para operar automaticamente e qual mercado deve receber o foco de operações.

### 5.1 A Fórmula de Cálculo
$$\text{OpportunityScore} = (100 - \text{Pressure}) \times w_{\text{Pressure}} + \text{PatternStrength} \times w_{\text{Pattern}} + \text{VLProgress} \times w_{\text{VL}} + \text{SyncScore} \times w_{\text{Sync}}$$

### 5.2 Ponderação por Perfil de IA (`aiMode`)
Os pesos dos 4 pilares adaptam-se dinamicamente conforme o perfil selecionado pelo trader:

| Perfil de IA | Pressão ($w_{\text{Pressure}}$) | Padrão ($w_{\text{Pattern}}$) | Loss Virtual ($w_{\text{VL}}$) | Sincronia ($w_{\text{Sync}}$) | Foco Principal |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **Conservador** | **0.45 (45%)** | 0.20 (20%) | 0.25 (25%) | 0.10 (10%) | Máxima aversão a anomalias e excesso de perdedores |
| **Equilibrado** *(Padrão)* | **0.35 (35%)** | 0.25 (25%) | 0.25 (25%) | 0.15 (15%) | Balanceamento ideal de todos os fatores |
| **Agressivo** | **0.25 (25%)** | **0.30 (30%)** | 0.20 (20%) | **0.25 (25%)** | Aproveitamento de padrões fortes e confirmação cruzada |

---

### 5.3 Os 4 Pilares Detalhados

#### Pilar 1: Pressão de Perdedores (`100 - pressure`)
Avalia a concentração recente de dígitos perdedores comparando 3 janelas deslizantes (10, 25 e 50 ticks) contra a fração teórica esperada $E = \frac{|\text{Losers}|}{10}$:
$$\text{Excess}_n = \frac{f_n - E}{\max(E, 0.05)}$$
$$\text{Pressure} = \text{clamp}\left(0, 100, \text{round}\left(\frac{\text{Excess}_{10} + \text{Excess}_{25} + \text{Excess}_{50}}{3} \times 100\right)\right)$$
* Se dígitos perdedores saíram em excesso, a pressão é alta (ex: 70%), derrubando a segurança do mercado para $100 - 70 = 30\%$.

#### Pilar 2: Força do Padrão $A \to B$ (`patternStrength`)
Mede a consistência estocástica de repetição do par $A \to B$:
* Se o padrão estiver armado (`armed = true`): Pontuação base de **40%**.
* **Bônus Adicionais:**
  * Força Condicional $P(B \mid A) \ge 0.50$: **+20%**
  * Limite Inferior de Wilson $LB \ge 0.30$: **+15%**
  * Lift Estatístico $\frac{P(B \mid A)}{P(B)} \ge 1.50$: **+15%**
  * Estabilidade Temporal $\ge 3$ ticks consecutivos: **+10%**
* Pontuação máxima: **100%**.

#### Pilar 3: Progresso de Loss Virtual (`vlProgress`)
Mede a proximidade de abertura do gatilho de Loss Virtual configurado (`vlQty`):
$$\text{VLProgress} = \min\left(100, \text{round}\left(\frac{\text{Count}}{\text{vlQty}} \times 100\right)\right)$$
* Se o Loss Virtual estiver desativado ou o gatilho atingido, contribui com **100%**.

#### Pilar 4: Sincronia Cross-Market (`syncScore`)
Mede a ocorrência simultânea do mesmo par $A \to B$ nos outros 6 mercados monitorados:
$$\text{SyncScore} = \min\left(100, \text{round}\left(\frac{\text{Outros Mercados com o mesmo } A \to B}{3} \times 100\right)\right)$$

---

### 5.4 Classificação e Portão de IA (AI Gate)

| Faixa do Score | Classificação (`recommendation`) | Rótulo Visual | Ação Recomendada |
| :---: | :---: | :---: | :--- |
| **80 a 100** | `strong_buy` | ⭐ **COMPRA FORTE** | Condições ideais. IA autoriza entrada plena. |
| **60 a 79** | `buy` | ✓ **COMPRA** | Mercado favorável. Operação segura. |
| **40 a 59** | `neutral` | ◌ **NEUTRO** | Condições medianas. Entrada permitida no limite inferior. |
| **20 a 39** | `avoid` | ✕ **EVITAR** | **Bloqueio de Entrada.** Anomalias ou pressão alta. |
| **0 a 19** | `strong_avoid` | ⛔ **EVITAR FORTE** | **Bloqueio Rigoroso.** Risco extremo de perda. |

> [!IMPORTANT]
> **Regra do AI Gate:**
> No modo automático, o robô exige `OpportunityScore >= 40` para abrir ordens reais. Se o score for menor que 40, a ordem é sumariamente abortada, a menos que o robô esteja ativamente no modo pós-loss `recover`.

---

## 6. Radar de Dígitos Dinâmicos (Score Composto no Modo Differ)

O **Radar de Dígitos Dinâmicos** (`differDynamicDigit`) é um motor estatístico avançado projetado para superar a vulnerabilidade da escolha de dígitos estáticos no modo `DIFFER`. A cada tick recebido, ele avalia individualmente todos os dígitos de $0$ a $9$ através de **4 sub-modelos estocásticos**, determinando o dígito com menor probabilidade de sair no próximo tick.

```mermaid
graph LR
    D[Dígitos 0 a 9] --> F[Frequência Multi-Janela 40%]
    D --> M[Markov Inverso 30%]
    D --> T[Trigrama Inverso 15%]
    D --> A[Resistência Anomalia 15%]
    F --> C[Score Composto 0-100]
    M --> C
    T --> C
    A --> C
    C --> B[Melhor Dígito Escolhido]
```

### 6.1 Os 4 Sub-Scores do Modelo Composto

Para cada dígito candidato $d \in \{0, 1, \dots, 9\}$:

1. **Score de Frequência Multi-Janela ($S_F$ — Peso 40%):**
   Combina as frequências de $d$ nas últimas 10, 25 e 50 rodadas:
   $$f_{\text{pond}} = 0.5 \times f_{10}(d) + 0.3 \times f_{25}(d) + 0.2 \times f_{50}(d)$$
   $$S_F(d) = \text{clamp}\left(0, 100, \text{round}\left(100 \times \left(1 - \frac{f_{\text{pond}}}{0.30}\right)\right)\right)$$

2. **Score de Markov Inverso ($S_M$ — Peso 30%):**
   Calcula a probabilidade de transição empírica do dígito do último tick ($\text{lastDigit}$) para o candidato $d$:
   $$P_{\text{Markov}}(d \mid \text{lastDigit}) = \frac{\text{Ocorrências de } (\text{lastDigit} \to d)}{\text{Total de Ocorrências de } \text{lastDigit}}$$
   $$S_M(d) = \text{clamp}\left(0, 100, \text{round}\left(100 \times \left(1 - \frac{P_{\text{Markov}}}{0.30}\right)\right)\right)$$

3. **Score de Trigramas Inversos ($S_T$ — Peso 15%):**
   Calcula a probabilidade de transição considerando o par de dígitos anterior $(\text{prevDigit}, \text{lastDigit}) \to d$ nos últimos 50 ticks:
   $$P_{\text{Tri}}(d \mid \text{prev}, \text{last}) = \frac{\text{Ocorrências de } (\text{prev}, \text{last} \to d)}{\text{Total de Ocorrências de } (\text{prev}, \text{last})}$$
   $$S_T(d) = \text{clamp}\left(0, 100, \text{round}\left(100 \times \left(1 - \frac{P_{\text{Tri}}}{0.40}\right)\right)\right)$$

4. **Score de Resistência à Anomalia ($S_A$ — Peso 15%):**
   Mede o desvio estocástico do candidato $d$ em relação à média esperada ($10\%$) na janela de 25 ticks:
   $$\text{Excess}(d) = \frac{f_{25}(d) - 0.10}{0.10}$$
   $$S_A(d) = \text{clamp}(0, 100, \text{round}(50 - \text{Excess}(d) \times 50))$$

### 6.2 O Score Composto Final e Critérios de Desempate
$$S_C(d) = \text{round}(0.40 S_F(d) + 0.30 S_M(d) + 0.15 S_T(d) + 0.15 S_A(d))$$

**Regra de Seleção do Dígito Vencedor:**
1. Dígito com **maior $S_C(d)$**.
2. Em caso de empate: dígito com **menor contagem bruta nos últimos 50 ticks** (`rawCount50`).
3. Em caso de novo empate: dígito de **menor valor nominal** ($0 < 1 < \dots < 9$).

---

## 7. Modelos Estatísticos Adicionais: Qui-Quadrado ($\chi^2$) e Padrões $A \to B$

### 7.1 Teste de Aderência Qui-Quadrado ($\chi^2$)
Executado nos últimos 50 ticks (mínimo de 30 ticks) para validar se a distribuição dos 10 dígitos diverge significativamente da distribuição uniforme teórica ($E = \frac{N}{10}$):
$$\chi^2 = \sum_{d=0}^{9} \frac{(O_d - E)^2}{E}$$
* $\chi^2 \ge 21.7 \implies \text{Nível Alto}$ ($p < 0.01$ — Anomalia extrema de distribuição).
* $\chi^2 \ge 16.9 \implies \text{Nível Médio}$ ($p < 0.05$ — Assimetria estatística moderada).
* $\chi^2 < 16.9 \implies \text{Nível Normal}$ (Distribuição uniforme saudável).

### 7.2 Validação Rigorosa de Padrões $A \to B$
A detecção do par $A \to B$ utiliza 4 filtros probabilísticos simultâneos para evitar falsos positivos:
1. **Probabilidade Condicional:** $P(B \mid A) \ge \frac{\text{patMinForce}}{100}$ (Padrão: $30\%$).
2. **Intervalo de Confiança Wilson Lower Bound:**
   $$LB = \frac{p + \frac{z^2}{2n} - z \sqrt{\frac{p(1-p) + z^2/(4n)}{n}}}{1 + \frac{z^2}{n}} \quad (\text{com } z = 1.96)$$
   Exige $LB \ge \max(0.15, \text{minForce} \times 0.7)$.
3. **Lift Estatístico:** $\text{Lift} = \frac{P(B \mid A)}{P(B)} \ge 1.15$ (Obriga correlação real superior à probabilidade marginal).
4. **Estabilidade Temporal:** Exige persistência do padrão por pelo menos 2 ticks consecutivos (`stable >= 2`).

---

## 8. Sistema de Loss Virtual (VL) e Contagem sob Foco

O Loss Virtual simula perdas fictícias em background para evitar entradas em momentos desfavoráveis.

### 8.1 Modalidades de Loss Virtual
1. **Consecutivo (`vlMode: 'consec'`):** Exige $N$ derrotas seguidas sem nenhuma vitória intercalada. Qualquer vitória reseta o contador imediatamente a zero.
2. **Acumulado (`vlMode: 'accum'`):** Avalia as derrotas dentro de uma **Janela Deslizante** (`vlWindow`). O gatilho abre quando o número de perdas na janela atinge `vlQty`.

### 8.2 Isolamento Pré-Início (`ticksSinceReset`)
Para garantir que ticks anteriores ao acionamento do robô não causem falsas entradas imediatas:
* Ao iniciar o robô (`startBot`), trocar configurações ou liquidar uma operação, a variável `ticksSinceReset[sym]` é zerada.
* A janela ativa calculada é estritamente:
  $$\text{WindowSize} = \min(\text{ticksSinceReset}[sym], \text{vlWindow})$$
* A fatia de ticks utilizada previne a armadilha do `slice(-0)` do JavaScript:
  $$\text{slice} = \text{WindowSize} > 0 \;?\; \text{digits.slice}(-\text{WindowSize}) : []$$

### 8.3 Contagem sob Foco (`vlFocusOnly`)
Quando ativado no modo Multi-Mercado (`multiOn = true`):
* Apenas o mercado que o usuário está visualizando ou que a IA colocou em foco acumula perdas virtuais.
* Ao trocar de mercado (manual ou automaticamente), o contador do mercado anterior e do novo mercado são resetados a $0$. Isso impede que um mercado execute compras imediatas com histórico acumulado fora do campo de visão do operador.

---

## 9. Gerenciamento de Capital, Martingale e Pós-Loss

### 9.1 Modos de Martingale
1. **Multiplicador Clássico (`galeMode: 'mult'`):**
   $$\text{Stake}_{\text{next}} = \text{Stake}_{\text{initial}} \times \text{Gale}^{\text{GaleLevel}}$$
   * Após vitória: $\text{GaleLevel} = 0$, retorna ao stake base.
2. **Martingale Parcelado (`galeMode: 'parc'`):**
   * Divide o prejuízo acumulado $\text{LossAcum}$ pelo número de parcelas configuradas $\text{galeParcels}$ (ex: 2 a 5 parcelas):
     $$\text{Stake}_{\text{next}} = \text{Stake}_{\text{initial}} + \frac{\text{LossAcum} / \text{ParcelsLeft}}{\text{Payout}}$$
   * Cada vitória deduz o lucro auferido de $\text{LossAcum}$ e consome uma parcela (`parcelsLeft--`). Quando $\text{LossAcum} \le 0$, o sistema retorna ao stake inicial.

### 9.2 Modos Pós-Loss (`postLossMode`)
Configurável via toggle `postLossOn`:

```mermaid
stateDiagram-v2
    [*] --> OperacaoNormal
    OperacaoNormal --> LossDetectado: Resultado LOSS
    
    state postLossMode {
        LossDetectado --> ModoRecover: postLossMode === 'recover'
        LossDetectado --> ModoAnalyze: postLossMode === 'analyze'
        
        ModoRecover --> DisparoRecuperacao: Delay expirado & Tentativas > 0
        DisparoRecuperacao --> OperacaoNormal: WIN (Reset Gale)
        DisparoRecuperacao --> ModoRecover: Novo LOSS (Tentativas--)
        ModoRecover --> OperacaoNormal: Tentativas Esgotadas (Reset)
        
        ModoAnalyze --> CooldownTimer: Aguarda cooldownSec (ex: 5s a 60s)
        CooldownTimer --> ResetVL: Zera Loss Virtual e Ticks
        ResetVL --> OperacaoNormal: Reavalia filtros estatísticos
    }
```

1. **Modo Recuperar (`recover`):**
   * Tenta recuperar a perda com velocidade executando até `recoverMaxAttempts` disparos consecutivos após um intervalo de `recoverDelay` ms.
   * **Bypass de Score:** Durante o modo de recuperação, o AI Gate é aberto (`aiGateOpen = true`) para permitir a execução da recuperação sem bloqueios de score.
2. **Modo Analisar (`analyze`):**
   * Pausa todas as operações durante `cooldownSec` segundos.
   * Ao expirar o tempo, reseta os contadores de Loss Virtual e exige que as condições estatísticas ideais se formem novamente antes de uma nova entrada.

---

## 10. Execução de Baixa Latência: PropKeeper e Pre-opened Proposals

Para atingir execução de ordens com latência inferior a **10ms**, o Bear Bot Ultra 2 mantém propostas abertas e ativas em tempo real no WebSocket da Deriv:

1. **Subscrição Contínua (`ensureProposal`):**
   * O hook calcula os contratos necessários para o setup atual através de `engine.getRequiredProposals()` (ex: `DIGITDIFF` na barreira $7$, ou `DIGITOVER 5` + `DIGITUNDER 4`).
   * Envia `{ proposal: 1, subscribe: 1, amount: curStake, ... }` com uma chave passthrough única (`sym|contract_type|barrier|stake`).
2. **Execução Instantânea por `proposal.id`:**
   * Quando o sinal de compra é disparado, a engine envia o payload de compra rápida:
     $$\text{Payload} = \{ \text{buy}: \text{proposalId}, \text{price}: \text{stake} \}$$
   * A corretora não precisa calcular o preço no momento da ordem, processando o preenchimento no próximo tick disponível.
3. **PropKeeper (Manutenção Cíclica):**
   * Um temporizador a cada 4 segundos (`useEffect`) valida se as propostas continuam prontas e renova propostas consumidas ou invalidadas após alterações de stake ou mercado.

---

## 11. Proteções de Taxa, Timeouts e Concorrência

| Mecanismo de Segurança | Arquivo / Linha de Código | Descrição |
| :--- | :--- | :--- |
| **`tradeLock`** | [`BearBot2Engine.ts`](file:///home/helder/Desenvolvimento/bot-trader/src/app/services/BearBot2Engine.ts) | Trava atômica que impede abertura de novas ordens enquanto houver uma operação em andamento ou pendente de liquidação. |
| **`maxTradesHour`** | [`BearBot2Engine.ts`](file:///home/helder/Desenvolvimento/bot-trader/src/app/services/BearBot2Engine.ts) | Limita a quantidade máxima de trades em uma janela deslizante de 60 minutos (1 a 500 trades/h). |
| **`tradeCooldownMs`** | [`BearBot2Engine.ts`](file:///home/helder/Desenvolvimento/bot-trader/src/app/services/BearBot2Engine.ts) | Impõe intervalo mínimo obrigatório entre o fim de uma operação e o início da próxima (0 a 600.000 ms). |
| **`SAFETY_TIMEOUT_MS` (30s)** | [`useBearBot2.ts`](file:///home/helder/Desenvolvimento/bot-trader/src/app/hooks/useBearBot2.ts) | Se a Deriv não enviar a confirmação de encerramento (`proposal_open_contract`) em 30 segundos, o bot destrava automaticamente chamando `abortPendingTrade`, sem afetar PnL ou Martingale. |
| **Anti-Flicker Switch (3s)** | [`BearBot2Engine.ts`](file:///home/helder/Desenvolvimento/bot-trader/src/app/services/BearBot2Engine.ts) | Trava temporal de 3 segundos entre trocas automáticas de mercado na tela para evitar fadiga visual e oscilações concorrentes. |

---

## 12. Cronograma de Ativação Progressiva por Ticks

O robô inicializa suas análises estocásticas de forma progressiva à medida que os ticks chegam do WebSocket:

```
[0 ticks]    Início da coleta
  │
  ├─► [3 ticks]   ⚡ Atualização do Score de IA (Ciclos de 3 em 3 ticks)
  │
  ├─► [8 ticks]   🔍 Detecção de Padrões A -> B de Markov ativada
  │
  ├─► [10 ticks]  📊 Taxa Observada de Win Rate exibida no painel
  │
  ├─► [12 ticks]  ⚠️ Anomalia de Mercado recente (Janela de 25 ticks)
  │
  ├─► [30 ticks]  📐 Teste de Bondade de Ajuste Qui-Quadrado (χ²)
  │
  └─► [50 ticks]  🎯 ANÁLISE COMPLETA CONCLUÍDA (Status "coletando dados" -> Liberação Plena)
```

---

## 13. Suíte de Testes Automatizados (Vitest)

O Bear Bot Ultra 2 possui uma cobertura massiva de **13 suítes de testes unitários e de integração com 132 cenários validados**:

### Comandos de Execução dos Testes:
```bash
# Executar todos os testes do Bear Bot 2
npx vitest run src/__tests__/bearBot*

# Executar testes do motor puro
npx vitest run src/__tests__/bearBot2Engine.test.ts

# Executar testes dos Dígitos Dinâmicos
npx vitest run src/__tests__/bearBot2DynamicDigit.test.ts

# Executar testes do Modo Combo
npx vitest run src/__tests__/bearBot2Combo.test.ts

# Executar testes da UI React
npx vitest run src/__tests__/bearBotUltra2.test.tsx
```

---

## 14. Guia Rápido de Consulta para Agentes de IA

Ao realizar manutenções, melhorias ou alterações no Bear Bot Ultra 2, obedeça rigorosamente às seguintes diretrizes:

1. **Nunca quebre o desacoplamento da Engine:** Toda lógica matemática, cálculo de probabilidade, controle de PnL e gestão de estado de trading pertence exclusivamente a `src/app/services/BearBot2Engine.ts`. Componentes React devem apenas exibir o estado retornado por `getState()`.
2. **Atenção às casas decimais dos símbolos:** Sempre use `extractLastDigit(price, symbol)` respeitando o pip size específico de cada índice.
3. **Não altere contratos sem atualizar `buildLoserSet` e `isWinCheck`:** Essas duas funções em `bearbot2.types.ts` são a referência única de verdade para definir se um dígito é vencedor ou perdedor em qualquer modo.
4. **Respeite o destravamento seguro (`abortPendingTrade`):** Em caso de erros de API ou abortos manuais, sempre utilize `abortPendingTrade()` para liberar a trava `tradeLock` sem registrar falsas derrotas ou avançar o Martingale indevidamente.
5. **Mantenha os testes verdes:** Toda nova funcionalidade deve vir acompanhada de testes em `src/__tests__/` e aprovada via `npx vitest run src/__tests__/bearBot*`.
