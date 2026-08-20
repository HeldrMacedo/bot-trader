# Especificação de Design: Dígitos Dinâmicos no Modo Differ (Bear Bot Ultra 2)

## 1. Visão Geral
Este documento define o design da funcionalidade **Dígitos Dinâmicos** para o modo **DIFFER** do robô **Bear Bot Ultra 2**.
A funcionalidade calcula a cada tick o dígito estatisticamente mais seguro para colocar como barreira no contrato `DIGITDIFF` (isto é, o dígito com menor probabilidade de ser sorteado no próximo tick), utilizando um **Score Composto Multi-Dimensional** que combina:
- Frequência Inversa Multi-Janela (10, 25 e 50 ticks)
- Probabilidade de Transição de Markov Inversa
- Boost de Trigrama/Sequência Inverso
- Resistência a Anomalias Estatísticas

Esta funcionalidade opera de forma totalmente independente de Loss Virtual (`vlOn`) e de Padrão A→B (`patTrigger`), funcionando tanto em modo de mercado único quanto em Multi-Mercado (`multiOn`).

---

## 2. Modelo Matemático do Score Composto

Para cada dígito $d \in \{0, 1, 2, \dots, 9\}$, calcula-se um score de segurança $S(d) \in [0, 100]$:

$$S(d) = 0.40 \cdot F_{\text{frio}}(d) + 0.30 \cdot M_{\text{frio}}(d) + 0.15 \cdot T_{\text{frio}}(d) + 0.15 \cdot A_{\text{frio}}(d)$$

### 2.1. Componentes do Score:
1. **$F_{\text{frio}}(d)$ — Frequência Inversa Multi-Janela (Peso: 40%)**
   - Janelas analisadas: $W_1 = 10$, $W_2 = 25$, $W_3 = 50$ ticks.
   - Frequência observada ponderada:
     $$freq_{\text{comp}}(d) = 0.5 \cdot \frac{count_{10}(d)}{10} + 0.3 \cdot \frac{count_{25}(d)}{25} + 0.2 \cdot \frac{count_{50}(d)}{50}$$
   - Como a frequência teórica esperada é $0.10$ (10%):
     $$F_{\text{frio}}(d) = \max(0, \min(100, 100 \cdot (1 - \frac{freq_{\text{comp}}(d)}{0.30})))$$

2. **$M_{\text{frio}}(d)$ — Inverso de Transição de Markov (Peso: 30%)**
   - Seja $last$ o último dígito observado no ativo.
   - A probabilidade condicional histórica $P(d \mid last) = \frac{\text{ocorrências de } last \to d}{\text{total de vezes que } last \text{ apareceu}}$.
   - Score:
     $$M_{\text{frio}}(d) = \max(0, \min(100, 100 \cdot (1 - \frac{P(d \mid last)}{0.30})))$$

3. **$T_{\text{frio}}(d)$ — Inverso de Trigrama / Continuação de Sequência (Peso: 15%)**
   - Seja $prev$ o penúltimo dígito e $last$ o último dígito.
   - Avalia a probabilidade de $d$ vir logo após a sequência $(prev, last)$ nos últimos 50 ticks.
   - Score:
     $$T_{\text{frio}}(d) = \max(0, \min(100, 100 \cdot (1 - \frac{P(d \mid prev, last)}{0.40})))$$

4. **$A_{\text{frio}}(d)$ — Resistência a Anomalias (Peso: 15%)**
   - Usa a métrica de desvio de proporção do ativo nos últimos 25 ticks:
     $$\text{excess}(d) = \frac{obsFrac(d) - 0.10}{0.10}$$
   - Se um dígito estiver em anomalia positiva ($\text{excess} > 0$), é arriscado. Se estiver abaixo ou zerado ($\text{excess} \le 0$), é seguro:
     $$A_{\text{frio}}(d) = \max(0, \min(100, 50 - 50 \cdot \text{excess}(d)))$$

### 2.2. Critério de Seleção
O dígito escolhido para a entrada será:
$$d^* = \arg\max_{d \in \{0..9\}} S(d)$$
*Desempate:* Em caso de pontuações idênticas, seleciona-se o dígito com menor frequência bruta total nos últimos 50 ticks.

---

## 3. Alterações na Arquitetura de Tipos e Engine

### 3.1. Tipos (`src/app/services/bearbot2.types.ts`)
Adicionar à interface `BotConfig` e `DEFAULT_CONFIG`:
```typescript
export interface BotConfig {
  // ... campos existentes ...
  differDynamicDigit: boolean;
}
```

### 3.2. Engine (`src/app/services/BearBot2Engine.ts`)
1. Implementar método:
   ```typescript
   computeDynamicDifferDigit(sym: string): { digit: number; score: number; scores: Record<number, number> }
   ```
2. No método `onNewTick(sym, dig)`:
   - Quando `config.mode === 'differ'` e `config.differDynamicDigit === true`:
     - **Multi-Mercado (`multiOn: true`):** Cada mercado calcula seu melhor dígito $d^*_{sym}$. O score de oportunidade pondera o menor risco desse dígito. O candidato vencedor carrega seu $d^*_{sym}$ no `multiCand[sym] = { sym, b: target, score }`.
     - **Mercado Único (`multiOn: false`):** O ativo corrente atualiza seu dígito alvo para $d^*$.
3. Nos métodos `prepareTrade` e `simulateTrade`:
   - Utilizam o dígito dinâmico determinado pelo algoritmo caso a opção esteja ligada.

---

## 4. Alterações na Interface Gráfica (`src/app/(withSidebar)/bear-bot-ultra-2/bearBotUltra2.tsx`)

1. **Card / Toggle de Ativação:**
   - Exibido logo acima dos seletores de dígito quando `config.mode === 'differ'`.
   - Card com toggle switch:
     - Título: **Dígitos Dinâmicos**
     - Subtítulo: *Calcula o dígito estatisticamente mais seguro a cada tick via Score Composto*
2. **Comportamento do Seletor de Dígitos 0-9:**
   - Quando `config.differDynamicDigit` for `true`, o grid de botões manuais 0-9 fica desabilitado com visual atenuado (`opacity-40 pointer-events-none`) e exibe a etiqueta `[DÍGITO DINÂMICO ATIVO]`.

---

## 5. Plano de Testes Automatizados

Criar arquivo `src/__tests__/bearBot2DynamicDigit.test.ts` com cobertura completa:
- `computeDynamicDifferDigit`: Validação matemática com histórico controlado (dígitos frios vs frequentes).
- Desempate determinístico quando múltiplos dígitos possuem score similar.
- Transições de Markov influenciando a exclusão de dígitos que costumam vir logo após o último tick.
- Execução de trade em mercado único (`exec === 'auto'` e `exec === 'manual'`).
- Execução em Multi-Mercado (`multiOn === true`), selecionando mercado correto e seu $d^*$ correspondente.
- Renderização e interação na UI.
