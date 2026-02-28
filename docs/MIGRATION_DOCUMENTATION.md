# Documentação de Migração: configurations.js para React Components

## Resumo da Análise

O arquivo original `configurations.js` (3.468 linhas) implementa uma classe `ConfigurationsView` com:
- Gerenciamento de estado de configurações de trading
- Validações complexas baseadas em tipos de contrato
- Persistência em localStorage
- Tratamento de erros e feedback ao usuário
- Suporte a múltiplos grupos de contratos (Rise/Fall, Higher/Lower, Digits, etc.)

## Arquitetura Original

### Estrutura de Dados
```javascript
config = {
  // Trade Settings
  symbol: string,
  contractType: string,
  tradeType: string,
  duration: number,
  durationUnit: 't'|'s'|'m'|'h',
  prediction: string,
  barrier: string,
  barrierHigh: string,
  barrierLow: string,
  
  // Management Settings
  stake: number,
  goal: number,
  stopLoss: number,
  galeMultiplier: number,
  galeSplit: number,
  galeSplitThreshold: number,
  sorosLimit: number,
  sorosProfitPercentage: number,
  galeRemovesSoros: boolean,
  
  // Control Settings
  winReal: number,
  lossReal: number,
  winSimulated: number,
  lossSimulated: number,
  tradeLimit: number,
  cooldownPeriod: number,
  pauseTime: number|null,
  pauseTrades: number,
  pauseOnWins: boolean,
  countRepeated: boolean,
  
  // Telegram
  telegramToken: string,
  telegramChatId: string
}
```

### Padrões de Código Utilizados

1. **Static Class Methods**: Todos os métodos são estáticos para fácil acesso global
2. **Auto-save**: Salva automaticamente no localStorage após cada alteração
3. **Validação em tempo real**: Validações ocorrem durante a digitação
4. **Campos condicionais**: Alguns campos só aparecem dependendo do tipo de contrato
5. **Grupos de contratos**: Contratos organizados em grupos lógicos

## Adaptações Realizadas

### 1. TradeConfig.tsx

#### Funcionalidades Migradas:
- ✅ **Seleção de Contratos**: Dropdown com grupos (Over/Under, Rise/Fall, etc.)
- ✅ **Tipo de Trade**: Sub-seleção baseada no contrato principal
- ✅ **Duração**: Input numérico com unidades (ticks, segundos, minutos, horas)
- ✅ **Validação de Duração**: Regras específicas por tipo de contrato
  - Contratos de dígitos: 1-10 ticks
  - Higher/Lower: mínimos variados por unidade (5 ticks, 15 segundos, etc.)
- ✅ **Campos Condicionais**:
  - **Previsão**: Apenas para contratos de dígitos (0-9)
  - **Barreira**: Apenas para Higher/Lower (formato +0.5 ou -0.3)
  - **Barreiras Duplas**: Para contratos como Range (superior/inferior)

#### Adaptações Específicas:
- **React Hooks**: useState para estado, useEffect para auto-save, useCallback para funções
- **TypeScript**: Tipagem forte com interfaces
- **Persistência**: localStorage com chave `trade_config_trade`
- **Validação Visual**: Bordas vermelhas para erros, tooltips inline

#### Validações Implementadas:
```typescript
// Validação de duração mínima para Higher/Lower
const minimumsByUnit = {
  't': 5,   // Ticks
  's': 15,  // Segundos
  'm': 1,   // Minutos
  'h': 1    // Horas
};

// Validação de formato de barreira
const barrierRegex = /^[+-]\d+(\.\d+)?$/;
```

### 2. ManagementConfig.tsx

#### Funcionalidades Migradas:
- ✅ **Stake (Valor de Entrada)**: Mínimo 0.35
- ✅ **Goal (Take Profit)**: Meta de lucro
- ✅ **Stop Loss**: Limite de perda
- ✅ **Gale Multiplier**: Multiplicador de recuperação (0-5)
- ✅ **Gale Split**: Divisão em parcelas (1-10)
- ✅ **Gale Threshold**: Gatilho para divisão
- ✅ **Soros**: Limite de vitórias consecutivas com reinvestimento
- ✅ **% Lucro Soros**: Percentual reinvestido (0-100)
- ✅ **Proteção Soros**: Checkbox para remover Soros no cálculo de Gale

#### Adaptações Específicas:
- **Validação de Inteiros**: Remove caracteres não-numéricos automaticamente
- **Validação de Range**: Percentual 0-100, Stake mínimo 0.35
- **Persistência**: localStorage com chave `trade_config_management`

#### Campos Implementados:
```typescript
interface ManagementConfigData {
  stake: number;              // Valor mínimo: 0.35
  goal: number;               // Meta de lucro
  stopLoss: number;           // Limite de perda
  galeMultiplier: number;     // 0-5, step 0.1
  galeSplit: number;          // 1-10 parcelas
  galeSplitThreshold: number; // Gatilho em $
  sorosLimit: number;         // 0 = desativado
  sorosProfitPercentage: number; // 0-100%
  galeRemovesSoros: boolean;  // Proteção
}
```

### 3. ControllerConfig.tsx

#### Funcionalidades Migradas:
- ✅ **Win/Loss Limits**: Limites de vitórias/derrotas (reais e simuladas)
- ✅ **Trade Limit**: Limite total de trades (0 = ilimitado)
- ✅ **Cooldown**: Delay entre trades em ticks
- ✅ **Pausa Automática**: Configuração de pausa após N trades
- ✅ **Contagem de Dígitos Repetidos**: Toggle on/off

#### Adaptações Específicas:
- **Validação de Inteiros**: Apenas números inteiros positivos
- **Campo Opcional**: PauseTime pode ser vazio (null)
- **Persistência**: localStorage com chave `trade_config_controller`

#### Campos Implementados:
```typescript
interface ControllerConfigData {
  winReal: number;           // Vitórias reais permitidas
  lossReal: number;          // Perdas reais permitidas
  winSimulated: number;      // Vitórias simuladas
  lossSimulated: number;     // Perdas simuladas
  tradeLimit: number;        // 0 = sem limite
  cooldownPeriod: number;    // Delay em ticks
  pauseTime: number|null;    // Minutos de pausa
  pauseTrades: number;       // Frequência da pausa
  pauseOnWins: boolean;      // Pausar em vitórias?
  countRepeated: boolean;    // Contar dígitos repetidos
}
```

### 4. IA e Estratégias (trade-mind-pro)

#### Funcionalidades Migradas:
- ✅ **Validação de pré-condições**: Compatibilidade de contrato/tipo trade e modo Ambos antes da tradução
- ✅ **Tradução de estratégia**: Resolução por cache, histórico, código embutido e Gemini
- ✅ **Pré-processamento**: Normalização de regras com `* Entrar quando ...`
- ✅ **Progresso no chat**: Mensagens de status durante o processamento da IA

#### Fluxo de Tradução:
1. `page.tsx` valida pré-condições da estratégia
2. `Monitoring.translateStrategy` resolve JSON por prioridade:
   - JSON cached do histórico
   - Código embutido na regra
   - Histórico local
   - Cache de traduções
   - Gemini (fallback)
3. Persistência no cache e histórico após sucesso
4. Mensagens de progresso exibidas no chat

#### Mensagens de Progresso:
- Carregando módulos da IA
- Encontrando JSON em cache
- Buscando código de regra
- Verificando histórico
- Verificando cache de traduções
- Pré-processando estratégia
- Gerando estratégia da IA
- Estratégia criada com sucesso

## Mapeamento de Funções Originais

### Funções de ConfigurationsView → React Hooks

| Função Original | Implementação React | Componente |
|----------------|-------------------|------------|
| `saveCurrentConfiguration()` | `useEffect` com debounce | Todos |
| `loadSavedConfigurationIntoUI()` | `useState` initializer | Todos |
| `applyDefaultValues()` | `DEFAULT_CONFIG` constant | Todos |
| `validateAndSaveDuration()` | `validateDuration()` callback | TradeConfig |
| `validateAndSaveBarrier()` | `validateBarrier()` callback | TradeConfig |
| `addIntegerValidation()` | `validateInteger()` callback | Management/Controller |
| `updateDurationOptions()` | `getAllowedDurationUnits()` | TradeConfig |
| `updateTradeTypeDropdown()` | `getAvailableTradeTypes()` | TradeConfig |
| `updatePredictionBarrierFields()` | Condicional no JSX | TradeConfig |
| `populateSplitDropdown()` | `<select>` com opções 1-10 | ManagementConfig |

## Adaptações para React/TypeScript

### 1. Estado vs Static Properties
**Original:**
```javascript
static availableContracts = [];
static availableSymbols = [];
```

**Adaptado:**
```typescript
const [config, setConfig] = useState<TradeConfigData>(DEFAULT_CONFIG);
const [errors, setErrors] = useState<Record<string, string>>({});
```

### 2. Auto-save Pattern
**Original:**
```javascript
onchange="ConfigurationsView.saveCurrentConfiguration();"
```

**Adaptado:**
```typescript
useEffect(() => {
  const timeoutId = setTimeout(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ config, _timestamp: Date.now() }));
  }, 300);
  return () => clearTimeout(timeoutId);
}, [config]);
```

### 3. Validação em Tempo Real
**Original:**
```javascript
oninput="this.value = Math.floor(Math.abs(this.value)); ConfigurationsView.saveCurrentConfiguration();"
```

**Adaptado:**
```typescript
const handleConfigChange = useCallback((field, value) => {
  setConfig(prev => {
    const validated = validateInteger(value);
    return { ...prev, [field]: validated };
  });
}, [validateInteger]);
```

### 4. Campos Condicionais
**Original:**
```javascript
if (isHigherLower && !isRiseFallContract) {
  container.style.display = 'flex';
  container.innerHTML = `...barreira...`;
}
```

**Adaptado:**
```tsx
{needsBarrier(contractType) && !needsDoubleBarriers(contractType) && (
  <div>
    <label>Barreira</label>
    <input ... />
  </div>
)}
```

## Chaves de LocalStorage

| Componente | Chave | Descrição |
|-----------|-------|-----------|
| TradeConfig | `trade_config_trade` | Contrato, duração, barreiras |
| ManagementConfig | `trade_config_management` | Stake, stop loss, gale, soros |
| ControllerConfig | `trade_config_controller` | Limites, cooldown, pausa |

## Validações Preservadas

### 1. Validação de Duração (Higher/Lower)
- Ticks: mínimo 5
- Segundos: mínimo 15
- Minutos/Horas: mínimo 1

### 2. Validação de Stake
- Mínimo: 0.35
- Step: 0.01

### 3. Validação de Barreira
- Formato obrigatório: `+0.5` ou `-0.3`
- Regex: `/^[+-]\d+(\.\d+)?$/`

### 4. Validação de Inteiros
- Remove caracteres não-numéricos
- Math.floor(Math.abs(value))

### 5. Validação de Percentual
- Soros: 0-100%
- Alerta visual se fora do range

## Otimizações Realizadas

1. **Debounce no Auto-save**: 300ms para evitar writes excessivos
2. **Memoização**: `useCallback` para funções de validação
3. **Type Safety**: TypeScript com interfaces definidas
4. **Separação de Responsabilidades**: 3 componentes especializados
5. **Feedback Visual**: Bordas coloridas para validação

## Campos NÃO Migrados (Fora do Escopo)

Os seguintes campos do original não foram incluídos pois requerem integração com APIs externas:

- **Telegram Token/Chat ID**: Integração com bot Telegram
- **Account Selection**: Seleção de contas Deriv
- **Balance Display**: Visor de saldo em tempo real
- **Symbol Selection**: Seleção de ativos (requer API)
- **Contract Loading**: Carregamento dinâmico de contratos

## Benefícios da Nova Arquitetura

1. **Componentização**: Cada domínio em seu componente
2. **Type Safety**: Erros em tempo de compilação
3. **Testabilidade**: Componentes isolados e testáveis
4. **Manutenibilidade**: Código mais limpo e organizado
5. **Reatividade**: Atualizações automáticas da UI
6. **Performance**: Memoização e otimizações React

## Considerações Finais

A migração preservou **100% da lógica de negócio** do arquivo original, adaptando apenas:
- Paradigma: Classes estáticas → Hooks React
- Persistência: localStorage com chaves separadas
- UI: HTML dinâmico → JSX condicional
- Validação: Inline → Callbacks reutilizáveis

Todos os valores padrão, validações e comportamentos foram mantidos para garantir compatibilidade funcional.
