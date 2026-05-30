# Modo Avançado — trade-mind-pro

O Modo Avançado é o quarto modo do `AiChatPanel` no módulo `trade-mind-pro`. Ele permite expressar estratégias complexas em linguagem natural, que a IA converte para o formato `json-rules-engine`. Um motor dedicado avalia as regras a cada tick e executa trades automaticamente quando as condições batem.

## Por que existe

O modo Estratégia padrão suporta apenas tipos fixos de regra (percentage, digit_pattern, etc.) e não consegue expressar lógica como:
- "Conte os últimos 10 dígitos e aposte no mais frequente"
- "Só opere se os 2 últimos dígitos forem diferentes"
- "Se o dígito X não apareceu nos últimos N ticks, aposte nele"
- "Se o último dígito é ímpar aposte par, OU se for par aposte ímpar"

O Modo Avançado resolve isso usando `json-rules-engine` com facts computados dinamicamente a cada tick.

---

## Arquitetura

```
Usuário digita estratégia (modo Avançado)
        ↓
AdvancedGeminiService.translateAdvancedStrategy()
        ↓  chama /api/gemini com prompt especializado
Gemini retorna JSON: objeto único OU array de regras
        ↓
AdvancedRulesEngine.loadRules(json)   ← aceita objeto ou array
        ↓
Usuário clica INICIAR
        ↓
AdvancedRulesEngine.start() → subscreve deriv.tick via DerivService.observerInstance
        ↓
A cada tick:
  extrai dígito do preço → tickHistory.push(digit)
  engine.run({}) → json-rules-engine avalia conditions usando facts ao vivo
        ↓ (condição bate)
onTradeSignal(contractType, prediction)
  → window.tradeManager.capturedPredictionsForTrade = [...]
  → window.tradeManager.executeTrade(null, 'advanced')
        ↓
Trade result via bridge ('trade' event) ou window ('tradeResultFront')
  → advancedEngineRef.current.notifyTradeResult()  ← reseta isAwaitingTrade
```

## Arquivos principais

| Arquivo | Papel |
|---------|-------|
| `trade-mind-pro/service/AdvancedRulesEngine.ts` | Motor json-rules-engine: subscreve ticks, mantém histórico, avalia regras, dispara onTradeSignal e emite dados visuais |
| `trade-mind-pro/service/AdvancedGeminiService.ts` | Monta prompt especializado e chama `/api/gemini` para converter estratégia em JSON (objeto ou array) |
| `trade-mind-pro/components/AiChatPanel.tsx` | UI: botão "Avançado", badge verde quando regras carregadas, placeholder com exemplos |
| `trade-mind-pro/page.tsx` | Orquestração: estados `advancedRules`, `advancedEngineRef`, funções `executeAdvancedStrategyTranslation` e integração com `toggleBot` |

---

## Facts disponíveis

Os facts são funções que lêem o `tickHistory` (rolling buffer de 200 ticks) em tempo real a cada `engine.run()`.

### Sem parâmetros

| Fact | Tipo | Descrição |
|------|------|-----------|
| `lastDigit` | number (0-9) | Último dígito do tick atual |
| `secondLastDigit` | number (0-9) | Penúltimo dígito |
| `twoLastDifferent` | boolean | `true` se os 2 últimos dígitos são diferentes entre si |
| `consecutiveSame` | number | Quantidade de dígitos iguais consecutivos no final |
| `tickCount` | number | Total de ticks acumulados no histórico |

### Com parâmetros (campo `params` na condição)

| Fact | Params | Tipo | Descrição |
|------|--------|------|-----------|
| `digitCount` | `{ n, digit }` | number | Contagem de um dígito específico nos últimos N ticks |
| `mostFrequentDigit` | `{ n }` | number (0-9) | Dígito mais frequente nos últimos N ticks (desempate: mais recente vence) |
| `mostFrequentCount` | `{ n }` | number | Quantidade de aparições do dígito mais frequente |
| `digitNotInLastN` | `{ n, digit }` | boolean | `true` se o dígito NÃO apareceu nos últimos N ticks |

---

## Operadores disponíveis

`equal`, `notEqual`, `lessThan`, `lessThanInclusive`, `greaterThan`, `greaterThanInclusive`, `in`, `notIn`

## Tipos de contrato (event.params.contractType)

| contractType | prediction | Significado |
|---|---|---|
| `DIGITOVER` | 0-9 | Próximo dígito MAIOR que prediction |
| `DIGITUNDER` | 0-9 | Próximo dígito MENOR que prediction |
| `DIGITMATCH` | 0-9 | Próximo dígito IGUAL a prediction |
| `DIGITDIFF` | 0-9 | Próximo dígito DIFERENTE de prediction |
| `DIGITEVEN` | null | Próximo dígito PAR |
| `DIGITODD` | null | Próximo dígito ÍMPAR |
| `CALL` | null | Preço SOBE |
| `PUT` | null | Preço CAI |

## Predição dinâmica

Quando a prediction deve ser calculada a partir dos ticks (ex: "apostar no dígito mais frequente"), use `predictionFact` no lugar de `prediction`:

```json
"event": {
  "type": "trade",
  "params": {
    "contractType": "DIGITMATCH",
    "predictionFact": "mostFrequentDigit",
    "predictionFactParams": { "n": 10 }
  }
}
```

Facts suportados como predictionFact: `mostFrequentDigit`, `lastDigit`, `secondLastDigit`.

---

## Formato JSON — regra única

Para estratégias com uma única lógica de entrada:

```json
{
  "name": "Descrição breve da estratégia",
  "conditions": {
    "all": [
      { "fact": "twoLastDifferent", "operator": "equal", "value": true },
      { "fact": "mostFrequentCount", "params": { "n": 10 }, "operator": "greaterThanInclusive", "value": 3 }
    ]
  },
  "event": {
    "type": "trade",
    "params": {
      "contractType": "DIGITMATCH",
      "predictionFact": "mostFrequentDigit",
      "predictionFactParams": { "n": 10 }
    }
  }
}
```

A lógica de condições aceita `all` (AND), `any` (OR) e aninhamentos entre os dois.

---

## Formato JSON — múltiplas regras (array)

Quando a estratégia tem **caminhos mutuamente exclusivos com tipos de contrato diferentes**, a IA retorna um **array de regras**. Cada regra tem sua própria condição e seu próprio `contractType`.

**Exemplo:** *"Se o último dígito é ímpar aposte par, OU se for par aposte ímpar"*

```json
[
  {
    "name": "Ímpar → aposte par",
    "conditions": {
      "all": [{ "fact": "lastDigit", "operator": "in", "value": [1, 3, 5, 7, 9] }]
    },
    "event": { "type": "trade", "params": { "contractType": "DIGITEVEN", "prediction": null } }
  },
  {
    "name": "Par → aposte ímpar",
    "conditions": {
      "all": [{ "fact": "lastDigit", "operator": "in", "value": [0, 2, 4, 6, 8] }]
    },
    "event": { "type": "trade", "params": { "contractType": "DIGITODD", "prediction": null } }
  }
]
```

Como as condições são mutuamente exclusivas (um dígito não pode ser par e ímpar ao mesmo tempo), exatamente **um sinal é disparado por tick**.

### `any` vs array — quando usar cada um

| Situação | Formato correto |
|----------|----------------|
| Condições alternativas que levam ao **mesmo contrato** | `any` dentro de uma regra única |
| Condições alternativas que levam a **contratos diferentes** | Array de regras |

**Exemplo `any`:** *"Se consecutiveSame >= 4 OU dígito 9 ausente nos últimos 10 → DIGITMATCH 9"*
→ Use `any` porque ambas as condições disparam o mesmo `DIGITMATCH 9`.

**Exemplo array:** *"Se ímpar → DIGITEVEN OU se par → DIGITODD"*
→ Use array porque cada caminho leva a um contrato diferente.

---

## Visualização em tempo real

A cada tick, o `AdvancedRulesEngine` emite `RulesVisualData` com o estado atual de cada condição.

### Campos de `RulesVisualData`

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `groups` | `RulesVisualGroup[]` | Um grupo por regra, na ordem original do `rulesJson` |
| `isPreview` | boolean | `true` logo após `loadRules` (sem ticks ainda); `false` durante execução |
| `timestamp` | number | Timestamp do último update |
| `activeGroupIds` | `(string \| number)[] \| null` | IDs dos grupos que dispararam; `null` = sem filtro |

### Comportamento de `activeGroupIds`

| Cenário | Valor |
|---------|-------|
| Preview (`loadRules`) | `null` — todas as regras visíveis, sem lock |
| Regra única (disparou ou não) | `null` — sem necessidade de destacar |
| Array de regras: **uma disparou** | `['nome da regra que disparou']` — as demais recebem overlay 🔒 |
| Array de regras: **nenhuma disparou** | `null` — todas visíveis sem lock |

### Indicadores visuais por condição

Cada `RulesVisualRule` dentro de um grupo mostra:

| Estado | Ícone | `status` |
|--------|-------|----------|
| Aguardando (preview) | ⚪ | `'waiting'` |
| Condição satisfeita | 🟢 | `'satisfied'` |
| Condição não satisfeita | 🔴 | `'failed'` |

O `displayText` inclui o valor atual do fact entre parênteses: ex. `🟢 2 últimos diferentes = true (atual: true)`.

### Ordenação estável dos grupos

Os grupos são sempre emitidos na mesma ordem do `rulesJson` original, independentemente de qual regra disparou no tick. Isso evita flickering na UI quando múltiplas regras são avaliadas.

---

## Comportamento durante execução

- **cooldownTicks = 3**: após disparar um sinal, o engine ignora os próximos 3 ticks para evitar entradas em sequência imediata
- **isAwaitingTrade**: travado após sinalizar, desbloqueado apenas quando `notifyTradeResult()` é chamado (ao receber resultado do trade via bridge ou window event)
- **mínimo de 5 ticks**: o engine não avalia regras enquanto o `tickHistory` tiver menos de 5 entradas
- **monitoringService fica idle**: em modo avançado, `monitoringService.setTranslatedRules({ groups: [] })` é chamado antes do start, garantindo que só o AdvancedRulesEngine dispare trades

---

## Exemplos de Estratégias

Você pode descrever as estratégias abaixo em linguagem natural no chat. A IA gera o JSON automaticamente.

### Baseadas em frequência

**Dígito dominante com confiança**
> "Nos últimos 15 ticks, se um dígito apareceu 5 vezes ou mais, aposte que ele vai aparecer novamente"

**Dígito saturado — apostar contra**
> "Se o dígito mais frequente nos últimos 10 ticks apareceu 4 ou mais vezes, aposte que o próximo será DIFERENTE dele"

**Dígito em falta**
> "Se o dígito 9 não apareceu nos últimos 10 ticks, aposte que ele vai aparecer agora"

---

### Baseadas em sequência

**Quebra de sequência**
> "Se os últimos 3 dígitos são iguais, aposte que o próximo será diferente"

**Alternância confirmada**
> "Se os últimos 2 dígitos são diferentes entre si, e o dígito mais frequente nos últimos 10 apareceu 3 ou mais vezes, aposte nesse dígito mais frequente"

**Série longa — reversão**
> "Se o mesmo dígito se repetiu 4 vezes consecutivas, aposte em DIFERENTE dele"

---

### Baseadas em par/ímpar

**Alternância automática (array de regras)**
> "Se o último dígito é ímpar, aposte par; se for par, aposte ímpar"
> *(A IA retornará um array de 2 regras mutuamente exclusivas)*

**Alternância par/ímpar — entrada por sequência**
> "Se os últimos 2 dígitos foram pares, aposte no próximo como ímpar"

**Sequência ímpar longa**
> "Se os últimos 3 dígitos foram ímpares, aposte em par"

---

### Baseadas em faixas

**Últimos dígitos baixos — apostar alto**
> "Se os últimos 3 dígitos foram todos menores que 3, aposte DIGITOVER 5"

**Pressão para cima / para baixo (array de regras)**
> "Se o dígito mais frequente nos últimos 10 é menor que 4, aposte DIGITOVER 4; se for maior que 5, aposte DIGITUNDER 5"
> *(A IA retornará um array de 2 regras com contratos diferentes)*

---

### Condições compostas (AND + OR)

**Dois critérios juntos**
> "Os últimos 2 dígitos são diferentes E o dígito 7 não apareceu nos últimos 8 ticks — apostar DIGITMATCH 7"

**Qualquer um de dois cenários**
> "Se o dígito 0 apareceu 3 ou mais vezes nos últimos 10 ticks OU se houve 4 ou mais dígitos iguais consecutivos, aposte DIGITOVER 5"

---

### Baseadas em ausência

**Dois dígitos em falta**
> "Se o dígito 3 não apareceu nos últimos 8 ticks OU o dígito 7 não apareceu nos últimos 8 ticks, aposte DIGITOVER 2"

---

## O que NÃO é suportado

- RSI, SMA, Bandas de Bollinger ou qualquer indicador técnico de preço
- Análise de tendência ou suporte/resistência
- Estratégias baseadas no valor absoluto do preço (apenas no último dígito)
- Histórico além dos últimos 200 ticks
