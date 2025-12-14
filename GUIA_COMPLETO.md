# 📚 Guia Completo - Bot Deriv Avançado

## ✨ Novas Funcionalidades Implementadas

### 🎯 1. OPERAÇÕES CUSTOMIZÁVEIS

Agora você pode configurar EXATAMENTE quais dígitos operar:

#### 🟢 **OVER Específico**
- **O que faz**: Opera quando o próximo dígito for MAIOR que os selecionados
- **Exemplo**: Se você selecionar `0, 1, 2, 3` → o bot vai operar quando detectar que o próximo dígito será > 3
- **Como usar**:
  1. Ative o checkbox "OVER Específico"
  2. Clique nos dígitos que você quer usar como referência (0-8)
  3. O bot mostrará: "Opera quando dígito for > X"

**Caso de Uso Real:**
```
Selecionou: 0, 1, 2
Sistema detecta: Dígitos 0, 1, 2 estão exaustos (apareceram muito)
Sugestão: "Over 0,1,2" (próximo dígito será > 2)
```

---

#### 🔵 **UNDER Específico**
- **O que faz**: Opera quando o próximo dígito for MENOR que os selecionados
- **Exemplo**: Se você selecionar `7, 8, 9` → o bot vai operar quando detectar que o próximo dígito será < 7
- **Como usar**:
  1. Ative o checkbox "UNDER Específico"
  2. Clique nos dígitos que você quer usar como referência (1-9)
  3. O bot mostrará: "Opera quando dígito for < X"

**Caso de Uso Real:**
```
Selecionou: 7, 8, 9
Sistema detecta: Dígitos 7, 8, 9 estão exaustos (apareceram muito)
Sugestão: "Under 7,8,9" (próximo dígito será < 7)
```

---

#### 🎯 **MATCHES Específico**
- **O que faz**: Opera quando o dígito selecionado VAI APARECER
- **Exemplo**: Se você selecionar `5` → o bot vai operar quando detectar alta probabilidade do 5 aparecer
- **Como usar**:
  1. Ative o checkbox "MATCHES Específico"
  2. Clique no dígito que você quer que apareça (0-9)
  3. O bot mostrará: "Opera quando dígito for = X"

**Caso de Uso Real:**
```
Selecionou: 5
Sistema detecta: Dígito 5 ausente há 18 ticks
Sugestão: "Matches 5" (alta probabilidade de 5 aparecer)
```

---

#### 🟣 **DIFFERS Customizável**
- **O que faz**: Opera EVITANDO os dígitos selecionados
- **Exemplo**: Se você selecionar `0, 5, 9` → o bot vai operar quando detectar que esses dígitos NÃO vão aparecer
- **Como usar**:
  1. Ative o checkbox "DIFFERS Customizável"
  2. Clique nos dígitos que você quer EVITAR (0-9)
  3. O bot mostrará: "Opera quando dígito for ≠ X, Y, Z"

**Caso de Uso Real:**
```
Selecionou: 0, 5, 9
Sistema detecta: Dígitos 0, 5, 9 estão exaustos
Sugestão: "Differs 0,5,9" (próximo dígito será diferente destes)
```

---

### 💰 2. SISTEMA DE MARTINGALE

O Martingale é uma estratégia de gestão de risco que DOBRA (ou multiplica) o stake após perdas.

#### ⚙️ **Configurações do Martingale**

**1. Multiplicador** (1.5x - 3.0x)
- Define quanto o stake aumenta após LOSS
- **Exemplo**:
  - Multiplicador 2.0x:
    - Stake inicial: $1.00
    - Após 1 LOSS: $2.00
    - Após 2 LOSS: $4.00
    - Após 3 LOSS: $8.00
  - Multiplicador 1.5x:
    - Stake inicial: $1.00
    - Após 1 LOSS: $1.50
    - Após 2 LOSS: $2.25
    - Após 3 LOSS: $3.38

**2. Níveis Máximos** (1-5)
- Define quantos martingales consecutivos são permitidos
- **Recomendação**: 3 níveis (seguro) ou 2 níveis (muito conservador)

**3. Resetar ao Vencer**
- ✅ Ativado: Ao vencer, volta ao stake inicial
- ❌ Desativado: Mantém o stake atual mesmo após WIN

---

#### 📊 **Tabela de Simulação de Martingale**

O bot mostra em tempo real:

```
Exemplo com Multiplicador 2x e 3 Níveis Máximos:

Inicial:  $1.00   (Risco Total: $1.00)
Nível 1:  $2.00   (Risco Total: $3.00)  ← Após 1 LOSS
Nível 2:  $4.00   (Risco Total: $7.00)  ← Após 2 LOSS
Nível 3:  $8.00   (Risco Total: $15.00) ← Após 3 LOSS

Ao WIN em qualquer nível → RECUPERA todas as perdas + lucro
```

---

#### ⚠️ **Avisos Importantes do Martingale**

**🟢 Vantagens:**
- Recupera perdas rapidamente com 1 WIN
- Aumenta lucro em sequências favoráveis

**🔴 Riscos:**
- Pode esgotar saldo rapidamente em sequência de LOSS
- Exige capital suficiente

**💡 Dica de Uso:**
1. **Conservador**: Multiplicador 1.5x | 2 Níveis | Stake baixo
2. **Moderado**: Multiplicador 2.0x | 3 Níveis | Stake médio
3. **Agressivo**: Multiplicador 2.5x | 4 Níveis | Stake médio

**NUNCA use Agressivo sem capital de sobra!**

---

### 🎯 3. COMO COMBINAR TUDO

#### **Estratégia Recomendada #1: Over/Under Customizado**
```
1. Ativar OVER Específico: 0, 1, 2, 3, 4
2. Ativar UNDER Específico: 5, 6, 7, 8, 9
3. Confiança Mínima: 75%
4. Exaustão: 5 vezes
5. Martingale: 2.0x | 3 Níveis
6. Stake: $1.00

Resultado esperado:
- Opera apenas quando detectar padrões fortes
- Martingale recupera perdas
- Alta assertividade
```

---

#### **Estratégia Recomendada #2: Matches + Differs**
```
1. Ativar MATCHES: Dígito 5
2. Ativar DIFFERS: 0, 3, 7, 9
3. Confiança Mínima: 70%
4. Ausência: 15 ticks
5. Martingale: 1.5x | 2 Níveis (conservador)
6. Stake: $2.00

Resultado esperado:
- Opera quando 5 está ausente (Matches)
- Opera evitando 0, 3, 7, 9 quando exaustos (Differs)
- Martingale suave para recuperação
```

---

### 📈 4. GATILHOS AVANÇADOS

O bot agora exibe os **gatilhos detectados** em cada sugestão:

**🔥 Exaustão**
```
"Dígito 7 apareceu 6x em 20 ticks (30%)"
→ Alta probabilidade de NÃO aparecer no próximo tick
```

**⏰ Ausência Prolongada**
```
"Dígito 2 não aparece há 18 ticks"
→ Alta probabilidade de APARECER no próximo tick
```

**📉 Declínio Pós-Pico**
```
"3 dígito(s) em queda após pico"
→ Reversão de tendência detectada
```

**📊 Distribuição Anormal**
```
"5 dígito(s) fora do padrão"
→ Desequilíbrio estatístico detectado
```

---

### 🎮 5. EXEMPLO PRÁTICO COMPLETO

**Cenário**: Você quer operar OVER 2, evitando dígitos altos:

**Passo 1**: Configurar
```
✅ OVER Específico: 0, 1, 2
✅ DIFFERS Customizável: 7, 8, 9
Confiança Mínima: 70%
Martingale: 2.0x | 3 Níveis
Stake: $1.00
```

**Passo 2**: Bot Analisa
```
Últimos 20 ticks: 7, 7, 9, 8, 7, 9, 1, 2, 8, 7, ...
Detecta:
🔥 Dígito 7 exausto (apareceu 6x)
🔥 Dígito 9 exausto (apareceu 4x)
📉 Dígitos altos em declínio
```

**Passo 3**: Bot Sugere
```
TIPO: Over 0,1,2
CONFIANÇA: 82%
ASSERTIVIDADE: HIGH
GATILHOS:
  🔥 7 exausto (6x)
  🔥 9 exausto (4x)
  📉 Declínio pós-pico
AÇÃO: Executar trade com $1.00
```

**Passo 4**: Resultado
```
✅ WIN → +$0.95 (volta ao stake $1.00)
OU
❌ LOSS → -$1.00 (próximo stake: $2.00 - Martingale Nível 1)
```

---

### 🚀 6. DICAS FINAIS

**✅ FAÇA:**
- Comece no modo DEMO
- Teste configurações diferentes
- Use confiança mínima ≥ 70%
- Monitore os gatilhos detectados
- Use Martingale conservador (1.5-2.0x)

**❌ NÃO FAÇA:**
- Operar com stake alto demais
- Usar Martingale 3x sem capital
- Ignorar os limites de assertividade
- Desativar proteção de LOSS

---

## 🎯 RESUMO VISUAL

```
┌─────────────────────────────────────────┐
│  OPERAÇÕES CUSTOMIZÁVEIS                │
├─────────────────────────────────────────┤
│ OVER Específico    → Dígito > X         │
│ UNDER Específico   → Dígito < X         │
│ MATCHES            → Dígito = X         │
│ DIFFERS            → Dígito ≠ X, Y, Z   │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  MARTINGALE                             │
├─────────────────────────────────────────┤
│ Multiplicador   → 1.5x - 3.0x           │
│ Níveis Máximos  → 1 - 5                 │
│ Reset ao WIN    → ✅/❌                  │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  GATILHOS                               │
├─────────────────────────────────────────┤
│ 🔥 Exaustão        → Dígito repetido    │
│ ⏰ Ausência        → Dígito sumido      │
│ 📉 Declínio        → Reversão           │
│ 📊 Distribuição    → Anomalia           │
└─────────────────────────────────────────┘
```

---

## 📞 Suporte

Se tiver dúvidas, teste no DEMO primeiro e observe os logs no console do navegador (F12).

**Boa sorte! 🍀**
