# Skill: Monitoring & Probability Expert

Você é especialista no `MonitoringService` e no algoritmo de probabilidades deste projeto TradePlatform.

## Arquivo Principal

`src/app/(withSidebar)/trade-mind-pro/service/Monitoring.ts`

## Algoritmo de Probabilidades (5 períodos ponderados)

```typescript
const PERIODS = [
  { name: '1-10',   data: history.slice(-10),        weight: 5.0 },
  { name: '10-25',  data: history.slice(-25, -10),   weight: 2.5 },
  { name: '25-50',  data: history.slice(-50, -25),   weight: 1.0 },
  { name: '50-100', data: history.slice(-100, -50),  weight: 0.5 },
  { name: '1-100',  data: history.slice(-100),       weight: 0.5 },
];

// Para cada dígito (0-9):
// score = Σ(ocorrências_no_período × peso_do_período)
// prob  = score / Σ(total_amostras × peso_do_período)
```

### Ajustes aplicados

| Ajuste | Condição | Efeito |
|--------|----------|--------|
| Penalidade de saturação | frequência > 15% | Reduz prob proporcional ao excesso |
| Bias dinâmico | repetições consecutivas do mesmo dígito | Aumenta prob dos outros |
| Bônus de gap | ausência ≥ 10 ticks | Aumenta prob do dígito ausente |

## Top-N Dígitos

- Configurável via `prob_accuracy_topN` no localStorage (1-10, default 5)
- Retornado em `ProbabilityStats.topNDigits[]`
- Usado para validar condições de regras (`lastDigit in topN`)

## Interface ProbabilityStats

```typescript
interface ProbabilityStats {
  probabilities: number[];        // [0-9] → probabilidade 0..1
  topNDigits: number[];           // dígitos ordenados por prob descendente
  sortedScores: Array<{ digit: number; prob: number }>;
  mostProbable: number;           // dígito mais provável
  highestStrength: number;        // prob do mais provável
  periodStats: Record<string, number[]>; // por período
}
```

## Ciclo de Vida do MonitoringService

```
start(config)
  → subscribe ticks (DerivService)
  → loadLegacyScripts (LegacyBridge)
  → inicializa tick history buffer

onTick(price)
  → extractLastDigit(price, symbol)
  → history.push(digit)
  → calculateProbabilities()
  → if (isExecutionActive && cooldownElapsed) → checkRules()
  → if (allRulesMet) → emit onTradeSignal(groupId, entryPrice, predictions)

notifyTradeResult(result, simulated)
  → update cooldown counter (reset to cooldownTicks)
  → update WIN/LOSS streaks
  → updateGroupActivation() baseado no resultado
  → se modo mudou → emit onModeChange(newMode, reason)

stop()
  → unsubscribe ticks
  → clear history buffer
```

## Lógica de Group Activation

```typescript
// groupActivation por grupo (id: string → boolean)
// Regras de transição configuráveis:
interface GroupActivationConfig {
  initial: boolean;         // Estado inicial
  winReal: boolean;         // Ativar após WIN no modo REAL?
  lossReal: boolean;        // Ativar após LOSS no modo REAL?
  winSimulated: boolean;    // Ativar após WIN no modo SIMULADO?
  lossSimulated: boolean;   // Ativar após LOSS no modo SIMULADO?
}
```

## Lógica de Mode Switching (ControllerConfig)

```
SIMULADO → se wins_sim ≥ winSimLimit → muda para REAL
SIMULADO → se losses_sim ≥ lossSimLimit → continua SIMULADO, reseta streak
REAL → se wins_real ≥ winRealLimit → muda para SIMULADO
REAL → se losses_real ≥ lossRealLimit → muda para SIMULADO
```

## Cooldown

- `cooldownTicks`: número de ticks a ignorar após cada trade
- Decrementado a cada tick recebido
- Quando cooldown = 0 → próxima avaliação de regras habilitada

## Tarefa

$ARGUMENTS

Analise o arquivo Monitoring.ts antes de qualquer modificação. Mantenha a compatibilidade com os tipos `ProbabilityStats` e os callbacks `onTradeSignal`, `onModeChange`, `onStats`.
