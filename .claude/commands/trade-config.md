# Skill: Trade Configuration & Risk Management Expert

Você é especialista no sistema de configuração e gestão de risco deste projeto TradePlatform, cobrindo Gale/Martingale, Soros, modos de operação e limites de stop.

## Componentes de Configuração

### TradeConfig — `src/app/(withSidebar)/trade-mind-pro/components/TradeConfig.tsx`

```typescript
interface TradeConfigData {
  contractType: ContractType;   // DIGITDIFF | DIGITMATCH | DIGITOVER | DIGITUNDER | ...
  duration: number;             // valor da duração
  durationUnit: 't' | 's' | 'm' | 'h'; // ticks | segundos | minutos | horas
  prediction: number;           // 0-9 (para contratos DIGIT*)
  barrier: string;              // para OVER/UNDER e CALL/PUT
}
// localStorage: 'trade_config_trade'
```

### ManagementConfig — `src/app/(withSidebar)/trade-mind-pro/components/ManagementConfig.tsx`

```typescript
interface ManagementConfigData {
  stake: number;           // stake base (USD)
  galeMultiplier: number;  // multiplicador Gale (ex: 2.0)
  galeSplit: number;       // divisor de nível (ex: 2 = avança nível a cada 2 perdas)
  sorosPercent: number;    // % do lucro reinvestido no stake (0-100)
  stopLoss: number;        // perda máxima (negativo, ex: -10)
  stopWin: number;         // ganho máximo (positivo, ex: 20)
}
// localStorage: 'trade_config_management'
```

### ControllerConfig — `src/app/(withSidebar)/trade-mind-pro/components/ControllerConfig.tsx`

```typescript
interface ControllerConfigData {
  winRealLimit: number;        // vitórias seguidas no REAL antes de mudar para SIM
  lossRealLimit: number;       // derrotas seguidas no REAL antes de mudar para SIM
  winSimulatedLimit: number;   // vitórias seguidas no SIM antes de mudar para REAL
  lossSimulatedLimit: number;  // derrotas seguidas no SIM (continua SIM)
  cooldownTicks: number;       // ticks de espera entre trades
}
// localStorage: 'trade_config_controller'
```

## Algoritmo Gale (Martingale)

```
Nível 0 (sem perdas): stake = baseStake
Nível 1 (1 perda):    stake = baseStake × galeMultiplier^1
Nível 2 (2 perdas):   stake = baseStake × galeMultiplier^2
...

Com galeSplit = 2:
  Nível avança a cada 2 perdas consecutivas
  stake = baseStake × galeMultiplier^floor(losses/galeSplit)

Reset: stake volta ao baseStake após WIN
```

## Algoritmo Soros (Reinvestimento de Lucro)

```
Após WIN:
  lucroAcumulado += resultado
  stakePróximo = baseStake + (lucroAcumulado × sorosPercent / 100)

Após LOSS:
  lucroAcumulado = 0
  stakePróximo = baseStake  (volta ao base)
```

## Configuração Completa (localStorage)

```typescript
// 'trade_config_full' — objeto combinado salvo ao iniciar o bot
interface FullConfig {
  trade: TradeConfigData;
  management: ManagementConfigData;
  controller: ControllerConfigData;
}
```

## Bottrader (Copy Trading) — `src/app/(withSidebar)/bottrader/`

```typescript
interface Configure {
  quantityLoss: number;           // perdas consecutivas para ativar Gale
  stopLoss: number;               // stop loss total (USD)
  stopWin: number;                // stop win total (USD)
  initialValue: number;           // stake inicial
  stakeMultiple: number;          // multiplicador Gale
  pauseTime: number;              // segundos de pausa após stop
  pauseTimeLoss: boolean;         // pausar após loss?
  pauseTimeWin: boolean;          // pausar após win?
  maxMartingale: number;          // nível máximo de Gale (0 = sem limite)
  onMaxMartingale: 'stop' | 'reset'; // ação ao atingir máximo
}
```

## Validações de Configuração

Antes de iniciar o bot, sempre valide:

```typescript
// Regras básicas
if (stake <= 0) throw new Error('Stake deve ser positivo');
if (galeMultiplier < 1) throw new Error('Multiplicador Gale mínimo é 1.0');
if (stopLoss >= 0) throw new Error('Stop Loss deve ser negativo');
if (stopWin <= 0) throw new Error('Stop Win deve ser positivo');
if (Math.abs(stopLoss) > balance * 0.5) warn('Stop loss acima de 50% do saldo');

// Regras de duração por tipo
if (contractType.startsWith('DIGIT') && durationUnit !== 't') {
  warn('Contratos DIGIT geralmente usam ticks');
}
```

## Persistência

Todos os configs são auto-salvos no `onChange` e carregados no mount:

```typescript
useEffect(() => {
  const saved = localStorage.getItem('trade_config_management');
  if (saved) setManagementConfig(JSON.parse(saved));
}, []);

const handleChange = (newConfig) => {
  setManagementConfig(newConfig);
  localStorage.setItem('trade_config_management', JSON.stringify(newConfig));
};
```

## Tarefa

$ARGUMENTS

Leia os componentes de configuração relevantes antes de modificar. Mantenha a compatibilidade com os schemas de localStorage existentes — mudanças breaking requerem migração.
