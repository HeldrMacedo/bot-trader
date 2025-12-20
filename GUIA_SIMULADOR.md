# 🎯 Guia Completo - Simulador & Recomendações Inteligentes

## 🚀 O Que é o Simulador?

O **Simulador de Estratégias** é um sistema de IA que analisa o mercado em tempo real e executa **140 trades virtuais** para descobrir:

✅ **Melhor estratégia** para operar no momento  
✅ **Melhor volatilidade** para focar 
---

## 📊 Análise em Tempo Real

### 🟢 Qualidade do Mercado (0-100)

O sistema analisa continuamente e dá uma **nota de 0 a 100** para o momento atual:

| Score | Significado | Ação |
|-------|------------|------|
| 70-100 | 🟢 EXCELENTE | PLAY - Opere com confiança |
| 50-69 | 🟡 RAZOÁVEL | PLAY com cautela |
| 0-49 | 🔴 RUIM | STOP - Aguarde melhor momento |

### 📈 Fatores Analisados

O score é calculado baseado em:

1. **Padrões Detectados** (até 25 pontos)
   - Quantos dígitos estão com exaustão ou ausência
   - Exemplo: Se detectar 4+ padrões claros → +25 pts

2. **Distribuição dos Dígitos** (até 20 pontos)
   - Verifica se há desequilíbrio favorável
   - Distribuição aleatória = RUIM
   - Distribuição concentrada = BOM

3. **Reversões de Tendência** (até 15 pontos)
   - Detecta quando dígitos mudam de comportamento
   - Picos seguidos de quedas = oportunidade

4. **Oportunidades HIGH** (até 20 pontos)
   - Conta quantas sugestões de alta confiança existem
   - 2+ oportunidades HIGH = +20 pts

5. **Win Rate Recente** (±10-20 pontos)
   - Se está vencendo: +10 pts
   - Se está perdendo: -20 pts

---

## 🎮 Como Usar o Simulador

### Passo 1: Conectar e Aguardar

```
1. Conecte-se à API
2. Selecione volatilidades para monitorar
3. Aguarde pelo menos 2-3 minutos de coleta de dados
4. O bot precisa de no mínimo 30 ticks para análise
```

### Passo 2: Executar Simulação

```
1. Clique em "Iniciar Simulação"
2. O bot testará 140 trades (20 por estratégia)
3. Aguarde 10-20 segundos
4. Receba a recomendação completa
```

### Passo 3: Interpretar Resultados

#### 🟢 Recomendação: ÓTIMO MOMENTO PARA OPERAR

```
✅ Condições ideais detectadas
✅ Alta qualidade de mercado (≥70)
✅ Bom horário (≥60)
✅ Múltiplos padrões fortes

AÇÃO: Dê PLAY com confiança
```

#### 🟡 Recomendação: MOMENTO RAZOÁVEL - OPERE COM CAUTELA

```
⚠️ Condições aceitáveis, mas não ideais
⚠️ Qualidade de mercado OK (50-69)
⚠️ Poucos padrões fortes

AÇÃO: Pode operar, mas:
- Aumente confiança mínima (≥75%)
- Reduza stake
- Fique atento aos sinais
```

#### 🔴 Recomendação: NÃO É BOM MOMENTO - AGUARDE

```
❌ Condições desfavoráveis
❌ Qualidade de mercado baixa (<50)
❌ Horário ruim ou sem padrões

AÇÃO: NÃO DÊ PLAY
- Continue monitorando
- Aguarde melhora nos scores
- Execute nova simulação em 15-30 min
```

---

## 🎯 Card de Recomendação PLAY/STOP

### 🟢 PLAY ✅ (Verde Pulsante)

Quando você vê isso:
```
┌──────────────────────┐
│  ▶️ PLAY ✅          │
│  Momento favorável   │
│  Score: 78/100       │
└──────────────────────┘
```

**Significa:**
- Sistema detectou condições ótimas
- Botão "Iniciar" ficará VERDE
- Pode dar PLAY com confiança

---

### 🔴 STOP 🛑 (Vermelho)

Quando você vê isso:
```
┌──────────────────────┐
│  ⏸️ STOP 🛑          │
│  Aguarde momento     │
│  Score: 42/100       │
└──────────────────────┘
```

**Significa:**
- Sistema recomenda NÃO operar
- Botão "Iniciar" ficará CINZA (bloqueado)
- Aguarde análise melhorar

---

## 📊 Interpretando os Scores

### Score Mercado (0-100)

```
90-100 ⭐⭐⭐⭐⭐ PERFEITO - Condições raras e ideais
70-89  ⭐⭐⭐⭐   EXCELENTE - Opere com confiança
50-69  ⭐⭐⭐     BOM - Opere com cautela
30-49  ⭐⭐       FRACO - Evite operar
0-29   ⭐         PÉSSIMO - NÃO opere
```

### Score Horário (0-100)

```
Horários EXCELENTES (75-80):
09h-11h - Abertura dos mercados europeus
14h-16h - Sobreposição Europa/América
19h-21h - Movimento noturno forte

Horários BONS (60-75):
08h, 12h-13h, 17h-18h, 22h

Horários FRACOS (30-50):
00h-07h, 23h

Horários RUINS (10-30):
01h-05h - Baixíssimo volume
```

---

## 🏆 Resultados Detalhados da Simulação

Após a simulação, você verá um ranking das estratégias:

```
┌─────────────────────────────────────────┐
│ 1. Over 2              [TOP]            │
│    Win Rate: 62.5%                      │
│    Wins/Losses: 12/8                    │
│    Lucro: +$4.20                        │
├─────────────────────────────────────────┤
│ 2. Differs                              │
│    Win Rate: 58.3%                      │
│    Wins/Losses: 11/9                    │
│    Lucro: +$2.10                        │
├─────────────────────────────────────────┤
│ 3. Under 7                              │
│    Win Rate: 55.0%                      │
│    Wins/Losses: 11/9                    │
│    Lucro: +$1.50                        │
└─────────────────────────────────────────┘
```

**Como usar:**
- Foque na estratégia #1 (TOP)
- Ative apenas ela se quiser ser conservador
- Ou ative top 3 para diversificar

---

## 💡 Estratégias de Uso

### 🎯 Estratégia #1: Conservadora (Recomendado)

```
1. Execute simulação
2. Aguarde recomendação 🟢 PLAY
3. Ative APENAS a estratégia TOP
4. Use confiança mínima 75%+
5. Stake baixo ($1-2)
6. Martingale conservador (1.5x, 2 níveis)
```

**Resultado esperado:**
- Poucas operações, mas assertivas
- Win rate alto (55-65%)
- Lucro consistente

---

### 🎯 Estratégia #2: Moderada

```
1. Execute simulação a cada 30 minutos
2. Opere apenas quando score ≥ 60
3. Ative Top 3 estratégias
4. Use confiança mínima 70%
5. Stake médio ($2-5)
6. Martingale moderado (2.0x, 3 níveis)
```

**Resultado esperado:**
- Mais operações que conservadora
- Win rate médio (50-60%)
- Lucro bom em dias favoráveis

---

### 🎯 Estratégia #3: Agressiva (Risco Alto)

```
1. Execute simulação apenas 1x
2. Opere mesmo com score 50+
3. Ative todas estratégias
4. Use confiança mínima 60%
5. Stake alto ($5-10)
6. Martingale agressivo (2.5x, 4 níveis)
```

**⚠️ ATENÇÃO:**
- Alto risco de perda rápida
- Exige capital grande
- Só use em conta DEMO ou com dinheiro que pode perder

---

## 📈 Quando Re-simular?

Execute nova simulação quando:

✅ **A cada 30-60 minutos** (condições mudam)  
✅ **Após 10 trades consecutivos** (padrões podem ter mudado)  
✅ **Quando score cair abaixo de 50** (mercado piorou)  
✅ **Ao mudar de horário** (manhã → tarde → noite)  
✅ **Após sequência de 3+ losses** (re-avaliar estratégia)  

---

## 🚨 Avisos Importantes

### ❌ NÃO opere se:
- Score mercado < 40
- Score horário < 30
- Simulação recomenda 🔴 STOP
- Nenhuma estratégia com win rate >50%
- Está em horário 1h-5h da manhã

### ✅ OPERE se:
- Score mercado ≥ 70
- Score horário ≥ 60
- Simulação recomenda 🟢 PLAY
- Estratégia TOP com win rate >55%
- Tem 3+ oportunidades HIGH

---

## 🎓 Exemplo Prático Completo

### Cenário: Você está em dúvida se deve operar

**Hora: 15:30 (Tarde)**

**Passo 1:** Análise em Tempo Real
```
Score Mercado: 68/100 🟡
Razão: "3 padrões fortes | Horário favorável | 2 oportunidades HIGH"
Recomendação: PODE OPERAR
```

**Passo 2:** Executar Simulação
```
[Aguarda 15 segundos...]

Resultado:
🟡 MOMENTO RAZOÁVEL - OPERE COM CAUTELA
Confiança: MÉDIA

Melhor Estratégia: Over 2 (Win rate: 57.5%)
Melhor Volatilidade: Volatility 100
Score Mercado: 68/100
Score Horário: 70/100

Dicas:
• Condições aceitáveis, mas não ideais
• Prefira Over 2 (maior win rate)
• Use confiança mínima alta (≥75%)
```

**Passo 3:** Decisão Final
```
✅ PODE OPERAR, mas com cautela:
1. Ativar APENAS "Over 2"
2. Confiança mínima: 75%
3. Stake: $2 (conservador)
4. Martingale: 1.5x, 2 níveis
5. Max trades: 20
6. Monitorar de perto
```

**Passo 4:** Dar PLAY
```
Card mostra: 🟢 PLAY ✅
Botão VERDE disponível
[Clica em Iniciar]
Bot começa a operar
```

---

## 📞 Troubleshooting

### "Score sempre baixo"
- Aguarde mais tempo (colete mais dados)
- Mude de volatilidade
- Tente outro horário

### "Simulação não inicia"
- Verifique se está conectado
- Certifique-se que tem dados (30+ ticks)
- Aguarde alguns minutos

### "Recomenda sempre STOP"
- Pode ser horário ruim mesmo
- Tente em horários melhores (9-11h, 14-16h)
- Execute nova simulação em 30 min

---

## 🎯 Resumo Ultra-Rápido

```
1️⃣ Conecte e aguarde 2-3 minutos
2️⃣ Execute Simulação
3️⃣ Veja recomendação:
   🟢 PLAY → Pode operar
   🔴 STOP → Aguarde
4️⃣ Se PLAY:
   - Use estratégia TOP
   - Configure confiança alta
   - Dê PLAY
5️⃣ Re-simule a cada 30-60 min
```

---

## 🏆 Melhor Prática Recomendada

```
┌──────────────────────────────────────┐
│ ROTINA IDEAL DE USO                  │
├──────────────────────────────────────┤
│ 1. Conectar às 9h                    │
│ 2. Executar simulação                │
│ 3. Se 🟢 → Operar 1-2 horas          │
│ 4. Nova simulação ao meio-dia        │
│ 5. Se 🟢 → Operar tarde              │
│ 6. Nova simulação às 19h             │
│ 7. Se 🟢 → Operar à noite            │
│ 8. STOP após 22h                     │
└──────────────────────────────────────┘

Total: 3 simulações/dia
Trades: 20-50 por sessão
Win rate esperado: 55-65%
```

---

**Boa sorte e bons lucros! 💰🚀**
