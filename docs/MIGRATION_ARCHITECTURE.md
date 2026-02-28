# Arquitetura de Migração: Sistema de Análise de Mercado

## Visão Geral

Esta documentação descreve a arquitetura de migração do sistema de análise de mercado do código legado (bot-ia-v2) para o novo sistema Next.js (trade-mind-pro).

## Fluxo de Dados

```
┌─────────────────────────────────────────────────────────────────┐
│                        FLUXO DE DADOS                          │
└─────────────────────────────────────────────────────────────────┘

┌──────────────┐     ┌──────────────┐     ┌──────────────────┐
│  page.tsx    │────▶│Monitoring.ts │────▶│  LegacyBridge.ts │
│  (React)     │     │  (Service)   │     │ (Carrega Legado) │
└──────────────┘     └──────────────┘     └──────────────────┘
       │                     │                       │
       │                     ▼                       ▼
       │            ┌──────────────┐        ┌──────────────┐
       │            │ DerivService │        │ Scripts JS   │
       │            │   (API)      │        │  Legados     │
       │            └──────────────┘        └──────────────┘
       │                     │                       │
       ▼                     ▼                       ▼
┌──────────────┐     ┌──────────────┐        ┌──────────────┐
│ MarketAnalysis│◀────│    Ticks     │◀───────│ Cálculos de  │
│    Panel     │      │   (Dados)    │        │Probabilidades│
│  (Visual)    │      │              │        │   (Legacy)   │
└──────────────┘      └──────────────┘        └──────────────┘
```

## Componentes

### 1. page.tsx (Componente Principal)

**Responsabilidades:**
- Inicializa conexão com Deriv após autenticação
- Gerencia estado das configurações (Trade, Management, Controller)
- Inicia o MonitoringService quando símbolo é selecionado
- Coordena a visualização dos componentes

**Fluxo:**
1. Autentica Deriv na inicialização
2. Quando usuário seleciona símbolo, inicia `monitoringService.start()`
3. Recebe callbacks de ticks e probabilidades
4. Repassa dados para MarketAnalysisPanel
5. No modo estratégia, valida pré-condições e executa tradução da estratégia com feedback de progresso no chat

### 2. Monitoring.ts (Serviço de Monitoramento)

**Responsabilidades:**
- Orquestra a coleta de ticks em tempo real
- Calcula probabilidades usando algoritmo do legado
- Integra com scripts legados via LegacyBridge
- Mantém histórico de ticks (últimos 200)

**Métodos Principais:**
- `start(config)`: Inicia monitoramento para um símbolo
- `stop()`: Para monitoramento
- `calculateProbabilities()`: Calcula probabilidades baseado no histórico
- `handleTick()`: Processa cada tick recebido
- `_validatePreconditions(strategyText, config)`: Valida compatibilidade da estratégia com contrato/tipo trade
- `translateStrategy(strategyText, onProgress)`: Resolve tradução (cache/histórico/Gemini) com progresso

**Algoritmo de Probabilidades:**
Baseado no `monitoring.js` legado, considera:
- 5 períodos ponderados (1-10, 10-25, 25-50, 50-100, 1-100 ticks)
- Pesos: 5.0, 2.5, 1.0, 0.5, 0.5
- Penalidade de saturação (>15%)
- Bias dinâmico baseado em repetições
- Bônus de gap (dígitos ausentes)

### 3. LegacyBridge.ts (Ponte para Legado)

**Responsabilidades:**
- Carrega scripts JavaScript legados dinamicamente
- Cria shims para compatibilidade
- Intercepta eventos do sistema legado
- Emite eventos para o React

**Scripts Carregados:**
1. Utils (common-helpers, market-data-helpers, ui-helpers)
2. Core (session, deriv-api, deriv-market-data)
3. Indicadores (RSI, SMA, probability-accuracy)
4. Regras (regras-json, Auxiliar-regras, robot-strategy)
5. AI (gemini-ai, strategy-preprocessor, prompt-manager)
6. Trade (trade-manager, monitoring)
7. Validação e cache de estratégia (rule-compatibility-validator, regras-json, rules-history-manager)

**Shims Criados:**
- `selectedSymbol`: Propriedade global para símbolo
- `logConfig`: Sistema de logging compatível
- `CreditsManager`: Mock para créditos (bypass)
- `UserLevels`: Mock para níveis VIP

### 4. MarketAnalysisPanel.tsx (Visualização)

**Responsabilidades:**
- Exibe layout idêntico ao bot-strategy
- Mostra probabilidades em tempo real
- Exibe estatísticas de mercado
- Visualiza sequência de dígitos

**Layout (Baseado em bot-strategy):**
```
┌─────────────────────────────────────┐
│  📊 Análise - [SYMBOL]              │
├─────────────────────────────────────┤
│  Probabilidade (100 Ticks)          │
│  ┌─────┐ ┌────────┐ ┌─────┐        │
│  │Maior│ │Gráfico │ │Menor│        │
│  │  X  │ │0-9     │ │  Y  │        │
│  └─────┘ └────────┘ └─────┘        │
├─────────────────────────────────────┤
│  Frequência (25)  Par/Ímpar (25)    │
├─────────────────────────────────────┤
│  Direção Preço (100)                │
├─────────────────────────────────────┤
│  Últimos Dígitos: 1 2 3 4 5...      │
└─────────────────────────────────────┘
```

## Integração com Legado

### Como o Monitoring.ts usa o Legado

```typescript
// 1. Carrega scripts legados
await legacyBridge.loadLegacyScripts();

// 2. Acessa funções globais do legado
if (window.ProbabilityAccuracyManager) {
  const accManager = window.ProbabilityAccuracyManager.getInstance();
  accManager.updateOutcome(digit);
}

// 3. Dispara eventos para comunicação
window.dispatchEvent(new CustomEvent('marketDataUpdate', {
  detail: { symbol, price, digit, stats }
}));
```

### Tradução de Estratégia (Fluxo)
1. page.tsx valida pré-condições e, se ok, chama `translateStrategy`
2. `translateStrategy` tenta JSON cached, código embutido, histórico e cache de traduções
3. Se não houver cache, aplica pré-processamento e chama Gemini
4. Salva tradução no cache e no histórico quando aplicável
5. Emite mensagens de progresso para o chat via `setAiProgressMessage`

### Eventos

**Do Monitoring para Legado:**
- `marketDataUpdate`: Novo tick recebido

**Do Legado para Monitoring:**
- `trade`: Trade executado
- `stop_limit`: Limite atingido
- `mode_change`: Mudança de modo

## Ciclo de Vida

### Inicialização

1. **page.tsx** monta componente
2. **DerivService** conecta e autentica
3. Usuário seleciona símbolo em VolatilitySelector
4. **page.tsx** chama `monitoringService.start({ symbol })`
5. **Monitoring.ts** carrega scripts legados via LegacyBridge
6. **Monitoring.ts** inscreve em ticks da Deriv
7. Sistema pronto para receber dados

### Execução

1. Deriv envia tick via WebSocket
2. **Monitoring.ts** recebe via DerivService.observer
3. Extrai dígito do preço
4. Adiciona ao histórico (máx 200)
5. Calcula probabilidades
6. Atualiza estado em page.tsx
7. **MarketAnalysisPanel** re-renderiza com novos dados

### Finalização

1. Usuário troca de símbolo ou sai da página
2. **page.tsx** chama `monitoringService.stop()`
3. Remove listener de ticks
4. Limpa histórico
5. Scripts legados permanecem carregados

## Benefícios da Arquitetura

### 1. Separação de Responsabilidades
- Cada componente tem uma função clara
- Fácil manutenção e testes
- Código legado isolado

### 2. Reutilização
- LegacyBridge carrega scripts uma única vez
- MonitoringService é singleton
- Componentes React puros e reutilizáveis

### 3. Performance
- Cálculos de probabilidade otimizados
- Histórico limitado a 200 ticks
- Atualizações em tempo real eficientes

### 4. Compatibilidade
- Scripts legados funcionam sem modificações
- Shims garantem compatibilidade
- Eventos permitem comunicação bidirecional

## Próximos Passos

### Fase 1: Estabilização
- [ ] Testar cálculos de probabilidades vs legado
- [ ] Validar precisão das previsões
- [ ] Otimizar performance dos cálculos

### Fase 2: Integração Completa
- [ ] Conectar Trading Engine com legado
- [ ] Implementar execução de trades
- [ ] Integrar gestão de risco

### Fase 3: Melhorias
- [ ] Cache de probabilidades
- [ ] Web Workers para cálculos pesados
- [ ] Gráficos avançados

## Referências

- **Arquivos Legados:**
  - `bot-ia-v2/js/views/monitoring.js` - Cálculos de probabilidades
  - `bot-ia-v2/js/ui.js` - Interface original
  
- **Arquivos Novos:**
  - `service/Monitoring.ts` - Serviço de monitoramento
  - `service/LegacyBridge.ts` - Ponte para legado
  - `components/MarketAnalysisPanel.tsx` - Visualização
  - `page.tsx` - Componente principal

## Notas Técnicas

### Cálculo de Dígitos
```javascript
// Precisão por símbolo
R_100: 2 casas decimais
R_25, R_10: 3 casas decimais
RDBEAR, RDBULL: 4 casas decimais
JD*, 1HZ*: 2 casas decimais
Padrão: 4 casas decimais
```

### Pesos dos Períodos
```javascript
{
  '1-10': 5.0,    // Curto prazo (mais importante)
  '10-25': 2.5,   // Médio curto
  '25-50': 1.0,   // Médio
  '50-100': 0.5,  // Longo
  '1-100': 0.5    // Muito longo
}
```

### Fórmula de Score
```
Final = Base + GapBonus + DynamicBias - SaturationPenalty

Onde:
- Base = Média ponderada das probabilidades
- GapBonus = (Gap/10)^2 se Gap >= 10
- DynamicBias = Ajuste baseado em repetições
- SaturationPenalty = (Freq - 15) * 2 se Freq > 15%
```
