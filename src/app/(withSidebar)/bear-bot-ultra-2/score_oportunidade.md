O **Score de Oportunidade** é o "cérebro" de inteligência quantitativa e estatística do BearBot Ultra 2. Ele avalia em tempo real (atualizado a cada 3 ticks) a qualidade das condições operacionais do mercado.

---

### 1. Para que ele serve?

1. **Filtro de Proteção Automático (AI Gate):**
   No motor do robô ([BearBot2Engine.ts](file:///home/helder/Desenvolvimento/bot-trader/src/app/services/BearBot2Engine.ts#L594)), o robô exige um **Score $\ge 40$** para autorizar uma entrada automática. Se o score estiver abaixo de 40 (mercado desfavorável/com anomalia), as entradas são **bloqueadas** para evitar perdas (a menos que esteja em modo de recuperação *recovery* pós-loss).

2. **Seleção Inteligente no Modo Multi-Market:**
   No modo de múltiplos mercados (`multiOn: true`), o robô calcula o score para os 7 índices simultaneamente. Ele usa essa pontuação para selecionar e trocar automaticamente para o mercado que apresentar o **maior Score de Oportunidade**.

3. **Recomendação Visual para o Trader:**
   No painel da interface ([IntelPanel.tsx](file:///home/helder/Desenvolvimento/bot-trader/src/app/(withSidebar)/bear-bot-ultra-2/components/IntelPanel.tsx#L10-L26)), a pontuação é traduzida em 5 níveis de recomendação:
   - **80 a 100:** ⭐ **COMPRA FORTE** *(Verde)*
   - **60 a 79:** ✓ **COMPRA** *(Azul)*
   - **40 a 59:** ◌ **NEUTRO** *(Amarelo)*
   - **20 a 39:** ✕ **EVITAR** *(Laranja)*
   - **0 a 19:** ⛔ **EVITAR FORTE** *(Vermelho)*

---

### 2. Como ele funciona? (A Fórmula de Cálculo)

O Score de Oportunidade varia de **0 a 100** e é fruto da combinação ponderada de **4 pilares estatísticos**:

$$\text{OpportunityScore} = (\text{PressãoInvertida} \times w_{\text{Pressure}}) + (\text{ForçaPadrão} \times w_{\text{Pattern}}) + (\text{ProgressoVL} \times w_{\text{VL}}) + (\text{Sincronia} \times w_{\text{Sync}})$$

---

#### Os 4 Pilares do Score:

1. **Pressão de Perdedores (`100 - pressure`):**
   * Avalia a frequência em que os dígitos perdedores saíram nas últimas janelas (10, 25 e 50 ticks) em relação ao esperado teoricamente.
   * Se os dígitos perdedores estão saindo em excesso, a pressão é alta (ex: 80%), reduzindo a nota de segurança do mercado ($100 - 80 = 20\%$). Se a pressão de perdedores for baixa, a pontuação sobe para perto de 100%.
2. **Força do Padrão $A \rightarrow B$ (`patternStrength`):**
   * Mede a consistência estatística de repetição do padrão de dígitos $A \rightarrow B$.
   * Inicia em 40% se o padrão estiver armado e ganha bônus adicionais caso passe em critérios rigorosos de probabilidade:
     * Força condicional ($\ge 50\%$): $+20\%$
     * Limite Inferior de Wilson ($\ge 0.30$): $+15\%$
     * Lift estatístico ($\ge 1.5$): $+15\%$
     * Estabilidade contínua ($\ge 3$ repetições): $+10\%$
3. **Progresso de Loss Virtual (`vlProgress`):**
   * Mede o quão próximo o mercado está de atingir a meta de Loss Virtual configurada (`vlQty`).
   * Se a Loss Virtual estiver atingida (100%) ou desativada, esse pilar contribui com 100%. Se a Loss Virtual estiver em $1/2$, contribui com 50%.
4. **Sincronia Cross-Market (`syncScore`):**
   * Verifica se o mesmo padrão estatístico armado no mercado atual está acontecendo simultaneamente nos outros 6 mercados monitorados. A sincronia entre mercados aumenta a confiabilidade da entrada.

---

### 3. Ponderação pelos Modos de IA (`aiMode`)

Os pesos de cada pilar variam de acordo com o perfil de risco selecionado ([BearBot2Engine.ts](file:///home/helder/Desenvolvimento/bot-trader/src/app/services/BearBot2Engine.ts#L443-L446)):

| Modo de IA | Pressão de Perdedores | Força do Padrão | Progresso Loss Virtual | Sincronia Cross-Market |
| :--- | :---: | :---: | :---: | :---: |
| **Conservador** | **45%** *(Foco em EVITAR anomalias)* | 20% | 25% | 10% |
| **Equilibrado** (Padrão) | **35%** | 25% | 25% | 15% |
| **Agressivo** | **25%** | **30%** *(Foco em padrões)* | 20% | **25%** *(Foco em sincronia)* |

### Resumo
Em resumo, o Score de Oportunidade sintetiza de forma simples (0 a 100) se o momento atual tem **estatística a favor**, garantindo que o bot execute operações apenas quando as probabilidades jogam a seu favor.

**Modo Personalizado (`aiMode: 'custom'`):**
Quarto perfil. Os quatro pesos passam a vir de `config.aiWeights` e são editáveis no painel IA Cross-Market (campos em %). Regras de resolução (`resolveAIWeights` em `bearbot2.types.ts`):

- Os pesos são **normalizados** pela própria soma — a proporção importa, a escala não (50/50/50/50 equivale a 25/25/25/25), então o score continua no intervalo 0..100.
- Peso negativo conta como zero.
- Soma zero cai para o preset **Equilibrado**, evitando score NaN.
- Clicar em qualquer preset reescreve `aiWeights` com os valores daquele preset: voltar ao padrão é um clique.
- Selecionar "Personalizado" semeia os pesos com os do preset ativo, então o score não salta no clique.

O limiar do AI Gate (score ≥ `aiMinScore`, padrão 40, editável no campo **Score mín.**) **não** é afetado pelo modo de IA: os pesos decidem como o score é composto, o limiar decide o corte.
