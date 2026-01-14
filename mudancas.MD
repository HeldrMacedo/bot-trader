# Prompt de Migração: Sistema de Bot Trading IA (JS -> Next.js)

## Objetivo
Converter o sistema legado localizado em `bot-ia` para uma arquitetura moderna em Next.js dentro de `src/app/(withSidebar)/bot-strategy`. A implementação deve ser funcionalmente idêntica, mas seguindo os padrões de design e performance do novo ecossistema React.

## 1. Requisitos de Migração e Regras de Negócio

### Gerenciamento de Trading (Mapear `TradeManager.js`)
- **Modos de Operação:** Implementar estados para `SIMULACAO`, `REAL` e `VIRTUAL`.
- **Gestão de Risco:** 
  - Stop Loss e Take Profit globais.
  - Sistema de Gale (Martingale) com: `martingaleFactor`, `martingaleLevels`, `galeSplitThreshold` (divisão de stake) e `galeRemovesSoros`.
  - Estratégia Soros: `sorosLimit` (níveis) e `sorosProfitPercentage`.
- **Ciclo de Execução:** Hook `useBotEngine` para gerenciar o estado `isRunning`, `balance`, `totalProfit` e a lista de `resultsList`.

### Processamento de Sinais e IA (Mapear `GeminiAIService.ts` e `StrategyPreprocessor.ts`)
- **Contexto da IA:** Integrar o `AIChatContextProcessor` para manter o histórico de conversas e as regras de trading extraídas.
- **Validação:** Implementar `GeminiStrategyValidator` para garantir que a estratégia gerada pela IA é compatível com os tipos de contrato da Deriv (CALL/PUT, DIGITS, etc).

## 2. Adaptação de Layout e UI (React/Tailwind)

### Estrutura de Componentes
- **Painel Lateral (Tabs):**
  - `TradeConfig.tsx`: Configurações de Stake, Duração e Tipo de Contrato.
  - `ManagementConfig.tsx`: Parâmetros de Martingale e Soros.
  - `ControllerConfig.tsx`: Configurações de troca de modo (ex: 2 Wins na Virtual -> 1 Real).
- **Visualização Principal:**
  - `BotDashboard.tsx`: Tabela de resultados em tempo real e logs de sistema (font-mono).
  - `AiChatPanel.tsx`: Interface de chat para interação com a IA.
  - `BlocklyEditor.tsx`: Workspace para visualização/edição dos blocos gerados.

### Consistência Visual
- Utilizar a paleta de cores do projeto Next.js (fundos escuros `#13111c`, bordas `#1e1b2e`).
- Manter a hierarquia de informações: Status do Bot (Rodando/Parado) sempre visível.
- Responsividade: Garantir que o Dashboard e o Chat se adaptem a telas menores usando Flexbox/Grid.

## 3. Especificações Técnicas (TypeScript/Next.js)

- **Hooks de Estado:** Utilizar `useReducer` ou `useContext` para o estado global do bot (configurações + resultados).
- **Serviços:**
  - `MarketDataService.ts`: Singleton para gerenciar subscrições de ticks via WebSocket.
  - `BlocklyExecutionEngine.ts`: Converter o XML do Blockly em JavaScript executável de forma segura (eval isolado ou generator).
- **Tipagem:** Definir interfaces para `TradeConfig`, `ContractResult`, `AiStrategy` e `MarketTick`.
- **Persistência:** Sincronizar configurações com `localStorage` via useEffect.

## 4. Critérios de Qualidade

- **Isolamento:** Cada instância de execução deve ser isolada, evitando vazamento de estado entre trocas de conta.
- **Performance:** O processamento de ticks deve ser otimizado para não travar a UI (usar `requestAnimationFrame` ou `Web Workers` se necessário para cálculos pesados).
- **Logs:** Implementar sistema de logs com cores (Verde: Win, Vermelho: Loss, Azul: Info, Amarelo: Aviso).
- **Erros:** Tratamento robusto para desconexões de rede e erros de API (Insuficiente Balance, Contract Error).

## Estrutura de Arquivos Esperada
- `page.tsx`: Orquestrador principal.
- `components/`: Componentes modulares (TradeConfig, BotDashboard, etc).
- `services/`: Lógica de negócio (BotExecutionEngine, MarketDataService).
- `hooks/`: `useDerivAccount`, `useBotRunner`.