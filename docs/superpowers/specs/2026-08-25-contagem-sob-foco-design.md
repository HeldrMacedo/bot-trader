# Contagem sob Foco — Loss Virtual Modifier

## Resumo

Novo toggle modificador no card de Loss Virtual que, quando ativado no modo multi-mercado, faz com que a contagem de loss virtual de um mercado **comece do zero** toda vez que ele ganha foco (`activeSym`) — ignorando qualquer histórico de ticks anterior ao momento do foco.

## Motivação

No comportamento atual, o loss virtual conta ticks continuamente em background para todos os 7 mercados, mesmo antes de um mercado entrar em foco. Isso significa que um mercado pode já ter acumulado losses suficientes no background e, quando o score de oportunidade trocar o foco para ele, o gatilho de entrada já está aberto imediatamente — baseado em perdas que o trader não "testemunhou".

Com a **Contagem sob Foco**, o loss virtual se torna uma etapa de **confirmação** pós-foco: primeiro o score de oportunidade escolhe o melhor mercado, depois o trader aguarda as perdas se acumularem enquanto observa aquele mercado ativamente. Isso aumenta o conservadorismo e a confiança na decisão de entrada.

## Escopo

- **Aplica-se apenas ao modo multi-mercado** (`multiOn: true`).
- **É um modificador** sobre os modos existentes (`consec` e `accum`), não um terceiro modo.
- No modo single-market, o toggle não aparece na UI (o foco é fixo, então não teria efeito).

## Comportamento Detalhado

### Fluxo de Funcionamento

1. Score de Oportunidade avalia os 7 mercados.
2. Seleciona o melhor candidato (ex: `R_75`) → foco muda para `R_75`.
3. Contador de loss virtual do `R_75` **reseta para zero** (`count = 0`, `seen = 0`, `ticksSinceReset = 0`).
4. Ticks começam a chegar para `R_75` em foco.
5. Perdas são contadas normalmente usando o modo selecionado (consecutivo ou acumulado).
6. Só quando atingir `vlQty` perdas **pós-foco** → gate abre → trade liberado.

### Reset ao Perder Foco

Quando o foco sai de um mercado e vai para outro, o contador do mercado anterior torna-se irrelevante. Se ele voltar a ganhar foco posteriormente, a contagem começa do zero novamente. Não há "congelamento" ou "retomada" de progresso entre períodos de foco.

### Comparação com Comportamento Atual

| Aspecto | Sem Contagem sob Foco | Com Contagem sob Foco |
|---|---|---|
| Foco muda para R_75 | Contador mantém histórico, gate pode já estar aberto | Contador reseta, precisa acumular perdas novamente |
| Papel do VL | Pré-condição para ganhar foco | Confirmação após ganhar foco |
| Conservadorismo | Menor (aceita perdas "antigas") | Maior (só aceita perdas "testemunhadas") |

### Interação com Modos de Execução

- **Automático (`exec === 'auto'`):** Quando o engine troca `activeSym` automaticamente para o melhor candidato, o reset é disparado para o novo mercado.
- **Manual (`exec === 'manual'`):** Quando o multi-mercado troca foco automaticamente (troca automática de foco com trava anti-flicker de 3s), o reset é disparado igualmente.
- **Troca manual pelo usuário (clique no MarketGrid):** Também dispara reset ao trocar foco, mantendo consistência.

## Mudanças Técnicas

### 1. Tipos (`bearbot2.types.ts`)

#### [MODIFY] [bearbot2.types.ts](file:///home/helder/Desenvolvimento/bot-trader/src/app/services/bearbot2.types.ts)

- Adicionar campo `vlFocusOnly: boolean` na interface `BotConfig`.
- Adicionar default `vlFocusOnly: false` no `DEFAULT_CONFIG`.

```typescript
// Na interface BotConfig
vlFocusOnly: boolean;  // Contagem sob Foco — reseta loss ao trocar activeSym (multi-mercado)

// No DEFAULT_CONFIG
vlFocusOnly: false,
```

---

### 2. Engine (`BearBot2Engine.ts`)

#### [MODIFY] [BearBot2Engine.ts](file:///home/helder/Desenvolvimento/bot-trader/src/app/services/BearBot2Engine.ts)

- **Detectar troca de foco:** Onde o engine altera `config.activeSym` no fluxo multi-mercado (auto e manual), verificar se `vlFocusOnly` está ativo e, em caso positivo, chamar `vlResetM(novoSym)` para o mercado que acabou de ganhar foco.
- Pontos de interceptação:
  - Modo auto: após `config.activeSym = pick.sym` (~L1020)
  - Modo manual: após `config.activeSym = pick.sym` (~L1045)
  - Troca manual pelo usuário: onde `activeSym` é alterado externamente (hook/componente)

```typescript
// Após trocar activeSym no multi-mercado:
if (this.config.vlFocusOnly) {
  this.vlResetM(this.config.activeSym);
  this.addLog(`🎯 Contagem sob Foco · Reset VL para ${this.config.activeSym}`, 'info');
}
```

---

### 3. UI (`bearBotUltra2.tsx`)

#### [MODIFY] [bearBotUltra2.tsx](file:///home/helder/Desenvolvimento/bot-trader/src/app/(withSidebar)/bear-bot-ultra-2/bearBotUltra2.tsx)

- Adicionar toggle "🎯 Contagem sob Foco" dentro do card de Loss Virtual.
- O toggle só aparece quando `config.vlOn === true && config.multiOn === true`.
- Posição: abaixo dos inputs de "Qtd. Perdas" e "Janela".

```
🛡️ LOSS VIRTUAL                         [ON/OFF]

Tipo:  [Consecutivo] [Acumulado]
Qtd. Perdas: [2]     Janela: [14]

🎯 Contagem sob Foco                    [ON/OFF]   ← só visível quando multiOn
```

---

### 4. Hook (`useBearBot2.ts`)

#### [MODIFY] [useBearBot2.ts](file:///home/helder/Desenvolvimento/bot-trader/src/app/hooks/useBearBot2.ts)

- Garantir que quando o usuário troca `activeSym` manualmente (clique no MarketGrid), o engine também dispare o reset se `vlFocusOnly` estiver ativo.

## Verificação

### Testes Automatizados

- Verificar que `vlResetM(sym)` é chamado ao trocar `activeSym` quando `vlFocusOnly === true`.
- Verificar que `vlResetM(sym)` NÃO é chamado quando `vlFocusOnly === false`.
- Verificar que o toggle não aparece na UI quando `multiOn === false`.
- Verificar que a contagem pós-reset funciona corretamente para ambos os modos (consec e accum).

### Verificação Manual

- Ativar multi-mercado + contagem sob foco + modo consecutivo.
- Observar que ao trocar de mercado, o contador zera e recomeça.
- Verificar nos logs a mensagem `🎯 Contagem sob Foco · Reset VL para {sym}`.
- Repetir com modo acumulado e confirmar que a janela deslizante também reseta.
