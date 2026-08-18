# Graph Report - bot-trader  (2026-08-17)

## Corpus Check
- 202 files · ~597,686 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1992 nodes · 2465 edges · 163 communities (118 shown, 45 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `6c200661`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- DerivService
- CopyTradingService
- WsListener
- devDependencies
- SideBar.tsx
- verifyAdminToken
- compilerOptions
- BearBotEngine
- DerivApiClient
- rateLimiter.js
- DerivConnection
- TicksTest.tsx
- DerivService.tsx
- bearBotUltra.test.tsx
- dependencies
- BotConfig
- buyTable.tsx
- useAuth
- OAuth 2.0
- sharedRules.test.ts
- eslint.config.mjs
- forgot-password/route.js
- app/layout.js
- middleware.ts
- reset-password/page.tsx
- resetPassword.test.js
- compilerOptions
- check-token/route.js
- operation/route.js
- profile/route.js
- reset-password/route.ts
- Request Schema
- userService.test.ts
- bcryptjs
- date-fns
- @deriv/deriv-api
- @heroicons/react
- jose
- json-rules-engine
- jsonwebtoken
- lucide-react
- moment
- mysql2
- next
- next.config.mjs
- nextjs
- query-string
- react
- react-icons
- react-toastify
- resend
- @tensorflow/tfjs-backend-cpu
- @tensorflow/tfjs-backend-webgl
- @tensorflow/tfjs-converter
- @types/react-dom
- typescript
- uuid
- ws
- postcss.config.mjs
- Bot Copy Trader
- Legacy Statement
- Request Schema
- Complete Workflows
- bearbot2.types.ts
- bearBotUltra2.test.tsx
- Request Schema
- Request Schema
- Create Account
- bearBotUltra2.tsx
- buildLoserSet
- Request Schema
- Balance
- Response Schema
- WebSockets
- Portfolio
- Request Schema
- Contract Update History
- Open Contract Status
- Estratégias da Comunidade (Community Rules)
- Bear Bot Ultra — Guia Técnico e Manual de Referência do Sistema
- Response Schema
- Reset Demo Account Balance
- Sell Contract
- Markup Statistics
- Active Symbols
- Legacy Accounts
- Migration Status
- Forget Subscription
- Forget All Subscriptions
- Ping
- Server Time
- Trading Times
- Cancel Contract
- API Overview
- Contracts For Symbol
- Contracts List
- Get All Accounts
- Health Check
- Active symbols
- bearBot2Engine.test.ts
- Contracts for
- Breaking changes
- Breaking changes
- Breaking changes
- Breaking changes
- useModuleAccess
- Architecture Overview
- Skill: Automated Testing Expert
- Skill: Trade Configuration & Risk Management Expert
- Profit table
- Padrões Obrigatórios
- Skill: Monitoring & Probability Expert
- Options Trading (Legacy) REST
- Balance
- Sell
- Statement
- Ticks
- Autenticação e Proteção de Rotas
- Options Setup REST
- Buy
- Cancel
- Contract update
- Contract update history
- Forget all
- Portfolio
- Skill: Legacy Bridge Expert
- Skill: Trade Strategy Expert
- Forget
- userService.js
- Relatório de Engenharia Reversa — ZeeK 3.0
- Deriv OAuth 2.0 & WebSocket Connection
- Authentication
- Migração Bot Strategy (2025)
- Pontos de BUG e Ajustes Necessários (Gaps de Funcionalidade):
- ciclo_monitoramento_trader.md
- explicacao_multi_mercado_com_execicao_manual.md
- Mark-up
- .computeMarketIntelligence
- bottraderx.tsx
- Pendente
- .prepareTrade
- score_oportunidade.md
- System
- cronograma_de_ativacao_por_ticks.md
- account.md
- data.md
- subscription.md
- trading.md
- intelPanel.test.ts

## God Nodes (most connected - your core abstractions)
1. `DerivService` - 84 edges
2. `BearBotEngine` - 65 edges
3. `CopyTradingService` - 30 edges
4. `WsListener` - 29 edges
5. `TradeExecutor` - 24 edges
6. `DerivConnection` - 22 edges
7. `Request Schema` - 21 edges
8. `DerivApiClient` - 17 edges
9. `compilerOptions` - 17 edges
10. `buildLoserSet()` - 14 edges

## Surprising Connections (you probably didn't know these)
- `TradeLogProps` --references--> `BotState`  [EXTRACTED]
  src/app/(withSidebar)/bear-bot-ultra-2/components/TradeLog.tsx → src/app/services/bearbot2.types.ts
- `seedLoserPressure()` --calls--> `createEngine()`  [EXTRACTED]
  src/__tests__/bearBot2Engine.test.ts → src/app/services/BearBot2Engine.ts
- `BearBotUltra()` --calls--> `buildLoserSet()`  [EXTRACTED]
  src/app/(withSidebar)/bear-bot-ultra-2/bearBotUltra2.tsx → src/app/services/bearbot2.types.ts
- `Page()` --calls--> `useModuleAccess()`  [EXTRACTED]
  src/app/(withSidebar)/bear-bot-ultra/page.tsx → src/app/hooks/useModuleAccess.ts
- `BotTrade()` --calls--> `useModuleAccess()`  [EXTRACTED]
  src/app/(withSidebar)/bottrader/page.tsx → src/app/hooks/useModuleAccess.ts

## Import Cycles
- None detected.

## Communities (163 total, 45 thin omitted)

### Community 1 - "CopyTradingService"
Cohesion: 0.06
Nodes (18): POST(), GET(), POST(), CopyTradingManager, UserCopyTrading, UserStats, CopyTradingService, createService() (+10 more)

### Community 2 - "WsListener"
Cohesion: 0.05
Nodes (19): buildDerivWsUrl(), DerivConnection, fetchAccountIdFromPat(), fetchOtpWebsocketUrl(), getDerivAppId(), isPatToken(), parseDerivToken(), ParsedToken (+11 more)

### Community 3 - "devDependencies"
Cohesion: 0.05
Nodes (42): cross-env, eslint, eslint-config-next, @eslint/eslintrc, jsdom, devDependencies, cross-env, eslint (+34 more)

### Community 4 - "SideBar.tsx"
Cohesion: 0.33
Nodes (7): updateUserProfile(), getUser(), logout(), Sidebar(), HomeLayout(), ProfileModal(), ProfileModalProps

### Community 5 - "verifyAdminToken"
Cohesion: 0.13
Nodes (22): GET(), POST(), prisma, getOperations(), verifyAdminToken(), OperationsPage(), OperationWithUser, createModule() (+14 more)

### Community 6 - "compilerOptions"
Cohesion: 0.07
Nodes (29): dom, dom.iterable, esnext, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules, **/*.ts (+21 more)

### Community 8 - "DerivApiClient"
Cohesion: 0.11
Nodes (11): AnalysisResponse, ConfigResponse, ConfigUpdate, ConnectionRequest, DerivApiClient, MarketQuality, PerformanceStats, SymbolAnalysis (+3 more)

### Community 9 - "rateLimiter.js"
Cohesion: 0.12
Nodes (16): getClientIp(), POST(), prisma, getClientIp(), POST(), prisma, GET(), prisma (+8 more)

### Community 11 - "TicksTest.tsx"
Cohesion: 0.19
Nodes (11): Authentication, AuthenticationHandle, TicksGraph(), AccountSelectorProps, extractDigit(), getDecimalPlaces(), INITIAL_TICKS, SYMBOL_LABELS (+3 more)

### Community 12 - "DerivService.tsx"
Cohesion: 0.12
Nodes (12): AccountInfo, DerivEventMap, PendingRequest, TokenData, UserInfo, Listener, Observer, Market (+4 more)

### Community 13 - "bearBotUltra.test.tsx"
Cohesion: 0.14
Nodes (11): BearBotUltra(), HistoryPage(), localStorageMock, mockExtractLastDigit, mockGetStorageDerivAccount, mockOn, mockRemoveById, mockSend (+3 more)

### Community 14 - "dependencies"
Cohesion: 0.22
Nodes (9): axios, dependencies, axios, @prisma/client, react-dom, @tensorflow/tfjs, @prisma/client, react-dom (+1 more)

### Community 16 - "buyTable.tsx"
Cohesion: 0.60
Nodes (3): saveOperation(), BuyTable(), BuyTableProps

### Community 17 - "useAuth"
Cohesion: 0.27
Nodes (7): useAuth(), HomePage(), ProfilePage(), MarkupBreakdown, MarkupStatisticsData, MarkupStatisticsReport(), MarkupStatisticsPage()

### Community 18 - "OAuth 2.0"
Cohesion: 0.06
Nodes (33): Also maintaining a Legacy API app?, Before you start, cURL example, Example, Generating PKCE in JavaScript, How the flow works, Implementation checklist, Important (+25 more)

### Community 19 - "sharedRules.test.ts"
Cohesion: 0.33
Nodes (4): BASE_RULE, makeRequest(), makeToken(), mocks

### Community 20 - "eslint.config.mjs"
Cohesion: 0.40
Nodes (4): compat, __dirname, eslintConfig, __filename

### Community 21 - "forgot-password/route.js"
Cohesion: 0.50
Nodes (4): generateSecureToken(), POST(), prisma, resend

### Community 22 - "app/layout.js"
Cohesion: 0.40
Nodes (3): geistMono, geistSans, metadata

### Community 23 - "middleware.ts"
Cohesion: 0.60
Nodes (4): config, isPublicPath(), middleware(), PUBLIC_PATHS

### Community 31 - "Request Schema"
Cohesion: 0.06
Nodes (33): About proposal, `amount` — Optional `number`, `barrier2` — Optional `string`, `barrier` — Optional `string`, `basis` — Optional `string | enum`, `cancellation` — Optional `string`, `contract_type` — Required `string | enum`, `currency` — Required `string` (+25 more)

### Community 68 - "Bot Copy Trader"
Cohesion: 0.07
Nodes (26): API Routes, Arquitetura, Arquivos, Bot Copy Trader, Ciclo de trade, Configurações, Extração de Sinais (WsListener), Fluxo de Execução (+18 more)

### Community 69 - "Legacy Statement"
Cohesion: 0.07
Nodes (26): About legacy_statement, `action_type` — Optional `string | enum`, Action Types, Authentication Required, `count` — Required `integer`, `date_from` — Optional `integer`, Date Range, `date_to` — Optional `integer` (+18 more)

### Community 70 - "Request Schema"
Cohesion: 0.08
Nodes (25): About ticks_history, `adjust_start_time` — Optional `integer | enum`, `candles` — Optional `array`, `count` — Optional `integer`, `echo_req` — Required `object`, `end` — Required `string`, Examples, `granularity` — Optional `integer | enum` (+17 more)

### Community 71 - "Complete Workflows"
Cohesion: 0.08
Nodes (25): Authentication Workflows, Authorization Token, Before You Begin, Common Patterns, Complete Example, Complete Integration, Complete Trading Workflow, Complete Workflows (+17 more)

### Community 72 - "bearbot2.types.ts"
Cohesion: 0.12
Nodes (20): AIMode, BotMode, ComboPending, DEFAULT_BOT_STATE, DEFAULT_CONFIG, DerivAccount, DerivAuthState, ExecMode (+12 more)

### Community 73 - "bearBotUltra2.test.tsx"
Cohesion: 0.07
Nodes (20): localStorageMock, MockAudioContext, mockExtractLastDigit, mockGetStorageDerivAccount, mockOn, mockRemoveById, mockSend, mockSubscribe (+12 more)

### Community 74 - "Request Schema"
Cohesion: 0.08
Nodes (24): About profit_table, Authentication Required, `contract_type` — Optional `array`, `date_from` — Optional `string`, `date_to` — Optional `string`, `description` — Optional `integer | enum`, `echo_req` — Required `object`, Examples (+16 more)

### Community 75 - "Request Schema"
Cohesion: 0.08
Nodes (23): About statement, `action_type` — Optional `string | enum`, Authentication Required, `date_from` — Optional `integer`, `date_to` — Optional `integer`, `description` — Optional `integer | enum`, `echo_req` — Required `object`, Examples (+15 more)

### Community 76 - "Create Account"
Cohesion: 0.08
Nodes (23): 200 OK - Account Already Exists, 201 Created - New Account, About create_account, Account Types, Authentication Required, `body` — Required `object`, Create Account, Currency Support (+15 more)

### Community 77 - "bearBotUltra2.tsx"
Cohesion: 0.12
Nodes (14): extractLastDigit(), isTerminalContract(), useBearBot(), TradeLog, BearBotUltra(), validateNumber(), TradeLogComponent(), TradeLogProps (+6 more)

### Community 78 - "buildLoserSet"
Cohesion: 0.15
Nodes (13): BotConfig, BotState, buildLoserSet(), MARKETS, clampRateLimits(), getIntelColor(), getRecLabel(), IntelPanel() (+5 more)

### Community 79 - "Request Schema"
Cohesion: 0.10
Nodes (20): About buy, Authentication Required, Buy Contract, `buy` — Optional `object`, `buy` — Required `string`, `echo_req` — Required `object`, Examples, `msg_type` — Required `string | enum` (+12 more)

### Community 80 - "Balance"
Cohesion: 0.10
Nodes (19): About balance, Authentication Required, Balance, `balance` — Optional `object`, `balance` — Required `integer | enum`, `echo_req` — Required `object`, Examples, `msg_type` — Required `string | enum` (+11 more)

### Community 81 - "Response Schema"
Cohesion: 0.10
Nodes (19): About transaction, Authentication Required, `echo_req` — Required `object`, Examples, `msg_type` — Required `string | enum`, `passthrough` — Optional `object`, Real-time updates, `req_id` — Optional `integer` (+11 more)

### Community 82 - "WebSockets"
Cohesion: 0.10
Nodes (19): About websocket, Authentication Required, `data` — Required `object`, Endpoint, Error Responses, Examples, `headers` — Required `object`, `meta` — Required `object` (+11 more)

### Community 83 - "Portfolio"
Cohesion: 0.11
Nodes (18): About portfolio, Authentication Required, `contract_type` — Optional `array`, `echo_req` — Required `object`, Examples, `msg_type` — Required `string | enum`, Open positions only, `passthrough` — Optional `object` (+10 more)

### Community 84 - "Request Schema"
Cohesion: 0.11
Nodes (18): About contract_update, Authentication Required, `contract_id` — Required `integer`, `contract_update` — Optional `object`, `contract_update` — Required `integer | enum`, `echo_req` — Required `object`, Examples, `limit_order` — Required `object` (+10 more)

### Community 85 - "Contract Update History"
Cohesion: 0.11
Nodes (18): About contract_update_history, Authentication Required, `contract_id` — Required `integer`, Contract Update History, `contract_update_history` — Optional `array`, `contract_update_history` — Required `integer | enum`, `echo_req` — Required `object`, Examples (+10 more)

### Community 86 - "Open Contract Status"
Cohesion: 0.11
Nodes (18): About proposal_open_contract, `contract_id` — Optional `integer`, `echo_req` — Required `object`, Examples, `msg_type` — Optional `string | enum`, Open Contract Status, `passthrough` — Optional `object`, `proposal_open_contract` — Optional `object` (+10 more)

### Community 87 - "Estratégias da Comunidade (Community Rules)"
Cohesion: 0.11
Nodes (17): Abas, Acesso, API — `/api/shared-rules`, API — `src/__tests__/sharedRules.test.ts`, Autenticação no cliente, Banco de Dados, Componente — `SharedRulesModal.tsx`, Componente — `src/__tests__/sharedRulesModal.test.tsx` (+9 more)

### Community 88 - "Bear Bot Ultra — Guia Técnico e Manual de Referência do Sistema"
Cohesion: 0.11
Nodes (17): 1.1 Hydration e Rendering do Next.js, 1.2 Gerenciamento Duplo de Estado: `useState` vs `stateRef`, 1. Arquitetura e Estrutura de Estado, 2.1 Fluxo de Ticks (Market Data), 2.2 Ciclo de Proposals (Proposta de Preço), 2. Comunicação e Integração com a API Deriv, 3.1 Compra Rápida (Quick Trade), 3. Modos de Operação e Lógica de Entrada (+9 more)

### Community 89 - "Response Schema"
Cohesion: 0.11
Nodes (17): About ticks, `echo_req` — Required `object`, Examples, `msg_type` — Required `string | enum`, `passthrough` — Optional `object`, `req_id` — Optional `integer`, `req_id` — Optional `integer`, Request Example (+9 more)

### Community 90 - "Reset Demo Account Balance"
Cohesion: 0.11
Nodes (17): About reset_demo_balance, Authentication Required, `data` — Optional `object`, Default Balance, Demo Accounts Only, Endpoint, Error Responses, Examples (+9 more)

### Community 91 - "Sell Contract"
Cohesion: 0.11
Nodes (17): About sell, Authentication Required, `echo_req` — Required `object`, Examples, `msg_type` — Required `string | enum`, `passthrough` — Optional `object`, `price` — Required `number`, `req_id` — Optional `integer` (+9 more)

### Community 92 - "Markup Statistics"
Cohesion: 0.12
Nodes (16): Authentication Required, `data` — Required `object`, `date_from` — Required `string`, `date_to` — Required `string`, `Deriv-App-ID` — Required `string`, Endpoint, Error Responses, Examples (+8 more)

### Community 93 - "Active Symbols"
Cohesion: 0.12
Nodes (16): About active_symbols, Active Symbols, `active_symbols` — Optional `array`, `active_symbols` — Required `string | enum`, `contract_type` — Optional `array`, `echo_req` — Required `object`, Examples, `msg_type` — Required `string | enum` (+8 more)

### Community 94 - "Legacy Accounts"
Cohesion: 0.12
Nodes (16): About legacy_accounts, Authentication Required, `Deriv-App-ID` — Required `string`, Endpoint, Error Responses, Examples, Legacy Accounts, `loginids` — Required `object` (+8 more)

### Community 95 - "Migration Status"
Cohesion: 0.12
Nodes (16): About legacy_migration_status, Authentication Required, `Deriv-App-ID` — Required `string`, Endpoint, Error Responses, Examples, Migration Status, Polling (+8 more)

### Community 96 - "Forget Subscription"
Cohesion: 0.12
Nodes (16): About forget, `echo_req` — Required `object`, Examples, `forget` — Optional `integer | enum`, `forget` — Required `string`, Forget Subscription, `msg_type` — Required `string | enum`, `passthrough` — Optional `object` (+8 more)

### Community 97 - "Forget All Subscriptions"
Cohesion: 0.12
Nodes (16): About forget_all, `echo_req` — Required `object`, Examples, `forget_all` — Optional `array`, `forget_all` — Required, Forget All Subscriptions, `msg_type` — Required `string | enum`, `passthrough` — Optional `object` (+8 more)

### Community 98 - "Ping"
Cohesion: 0.12
Nodes (16): About ping, `echo_req` — Required `object`, Examples, Keeping connections alive, `msg_type` — Required `string | enum`, `passthrough` — Optional `object`, Ping, `ping` — Optional `string | enum` (+8 more)

### Community 99 - "Server Time"
Cohesion: 0.12
Nodes (16): About time, Clock synchronisation, `echo_req` — Required `object`, Examples, `msg_type` — Required `string | enum`, `passthrough` — Optional `object`, `req_id` — Optional `integer`, `req_id` — Optional `integer` (+8 more)

### Community 100 - "Trading Times"
Cohesion: 0.12
Nodes (16): About trading_times, `echo_req` — Required `object`, Examples, `msg_type` — Required `string | enum`, `passthrough` — Optional `object`, `req_id` — Optional `integer`, `req_id` — Optional `integer`, Request Example (+8 more)

### Community 101 - "Cancel Contract"
Cohesion: 0.12
Nodes (16): About cancel, Authentication Required, Cancel Contract, `cancel` — Optional `object`, `cancel` — Required `integer`, `echo_req` — Required `object`, Examples, `msg_type` — Required `string | enum` (+8 more)

### Community 102 - "API Overview"
Cohesion: 0.12
Nodes (15): API Architecture, API Endpoints, API Overview, [Authentication](/docs/intro/authentication/), [Complete Workflows](/docs/workflows/), Download API schemas, Introduction, Key features (+7 more)

### Community 103 - "Contracts For Symbol"
Cohesion: 0.12
Nodes (15): About contracts_for, `contracts_for` — Optional `object`, `contracts_for` — Required `string`, Contracts For Symbol, `echo_req` — Required `object`, Examples, `msg_type` — Required `string | enum`, `passthrough` — Optional `object` (+7 more)

### Community 104 - "Contracts List"
Cohesion: 0.12
Nodes (15): About contracts_list, Contracts List, `contracts_list` — Optional `array`, `contracts_list` — Required `integer | enum`, `echo_req` — Required `object`, Examples, `msg_type` — Required `string | enum`, `passthrough` — Optional `object` (+7 more)

### Community 105 - "Get All Accounts"
Cohesion: 0.12
Nodes (15): About get_accounts, Account Information, Authentication Required, `data` — Optional `array`, Endpoint, Error Responses, Examples, Get All Accounts (+7 more)

### Community 106 - "Health Check"
Cohesion: 0.12
Nodes (15): About Health Checks, Best Practices, Endpoint, Error Responses, Example Usage, Examples, Health Check, Monitoring Integration (+7 more)

### Community 107 - "Active symbols"
Cohesion: 0.12
Nodes (15): 1. Response field name changes, 2. Translated display name fields removed, 3. Spot price data removed, 4. Landing company and product type filtering removed, 5. Barrier category filtering removed, 6. Additional metadata fields removed, 6 Breaking Changes, Active symbols (+7 more)

### Community 108 - "bearBot2Engine.test.ts"
Cohesion: 0.15
Nodes (6): createEngine(), AI_WEIGHTS, AIModeName, feedABPattern(), seedLoserPressure(), seedPatternIntel()

### Community 109 - "Contracts for"
Cohesion: 0.13
Nodes (14): 1. Request parameters removed, 2. Market data fields removed from response, 3. Display fields removed from contract items, 4. Contract metadata fields removed, 5 Breaking Changes, 5. Specialized contract options removed, Alternatives, Breaking changes (+6 more)

### Community 110 - "Breaking changes"
Cohesion: 0.13
Nodes (14): 1. loginid parameter removed, 2. Response field types changed, 3. Required fields in response, 4. Display fields removed, 5. Deprecated fields, 6. is_forward_starting field removed, 7. Snowball contract fields removed, 8 Breaking Changes (+6 more)

### Community 111 - "Breaking changes"
Cohesion: 0.13
Nodes (14): 1. Subscribe parameter value change, 2. LoginId parameter removed, 3. Contract barrier fields removed, 4. Display name field removed, 5. Stop loss/take profit fields removed, 6. Symbol field renamed, 7. action enum validation removed, 7 Breaking Changes (+6 more)

### Community 112 - "Breaking changes"
Cohesion: 0.14
Nodes (13): 10 Breaking Changes, 1. Symbol parameter renamed, 2. LoginID parameter removed, 3. Multiple request parameters removed, 4. Response proposal object now required, 5. Proposal required fields reduced, 6. Response field types changed, Breaking changes (+5 more)

### Community 113 - "Breaking changes"
Cohesion: 0.14
Nodes (13): 1. Required fields in history object changed, 2. Required fields in candles array changed, 3. echo_req no longer required in response, 4. Granularity enum restriction removed, 5. Input validation patterns removed, 6 Breaking Changes, 6. subscribe and adjust_start_time now accept 0, Breaking changes (+5 more)

### Community 114 - "useModuleAccess"
Cohesion: 0.26
Nodes (7): useModuleAccess(), Page(), Page(), HasAcessComponet(), BotTrade(), HasAcessComponet(), mockUseModuleAccess

### Community 115 - "Architecture Overview"
Cohesion: 0.15
Nodes (11): Architecture Overview, Authentication & Route Protection, BotTrader (Copy Trader), Commands, Core Architecture Patterns, Database, Digit Precision by Symbol, Environment Variables (+3 more)

### Community 116 - "Skill: Automated Testing Expert"
Cohesion: 0.15
Nodes (12): 1. Serviços/Singletons (ex: MonitoringService), 2. Algoritmo Gale/Soros, 3. Componentes React, 4. Integração DerivService (mock WebSocket), Configuração do Vitest, Executar Testes, O Que Testar (Prioridade), Padrões de Teste por Tipo (+4 more)

### Community 117 - "Skill: Trade Configuration & Risk Management Expert"
Cohesion: 0.15
Nodes (12): Algoritmo Gale (Martingale), Algoritmo Soros (Reinvestimento de Lucro), Bottrader (Copy Trading) — `src/app/(withSidebar)/bottrader/`, Componentes de Configuração, Configuração Completa (localStorage), ControllerConfig — `src/app/(withSidebar)/trade-mind-pro/components/ControllerConfig.tsx`, ManagementConfig — `src/app/(withSidebar)/trade-mind-pro/components/ManagementConfig.tsx`, Persistência (+4 more)

### Community 118 - "Profit table"
Cohesion: 0.15
Nodes (12): 1. loginid parameter removed, 2. app_id no longer nullable, 3. Response fields now required, 4. Transaction fields now required, 5 Breaking Changes, 5. Validation relaxed, Breaking changes, Code examples (+4 more)

### Community 119 - "Padrões Obrigatórios"
Cohesion: 0.17
Nodes (11): Autenticação, Contexto do Projeto, Envio de mensagens, Extração de dígito, Padrões Obrigatórios, Ping-Pong, Reconexão automática, Skill: Deriv API Expert (+3 more)

### Community 120 - "Skill: Monitoring & Probability Expert"
Cohesion: 0.17
Nodes (11): Ajustes aplicados, Algoritmo de Probabilidades (5 períodos ponderados), Arquivo Principal, Ciclo de Vida do MonitoringService, Cooldown, Interface ProbabilityStats, Lógica de Group Activation, Lógica de Mode Switching (ControllerConfig) (+3 more)

### Community 121 - "Options Trading (Legacy) REST"
Cohesion: 0.17
Nodes (11): Authentication, Available Endpoints, Error Response Format, OAuth2 Scopes, OpenAPI Specification, Options Trading (Legacy) REST, Overview, Response Status Codes (+3 more)

### Community 122 - "Balance"
Cohesion: 0.17
Nodes (11): 1. Account parameter removed, 2. Multi-account response removed, 3. Total balances removed, 4. Login ID parameter removed, Balance, Breaking Changes, Code Examples, Critical change (+3 more)

### Community 123 - "Sell"
Cohesion: 0.17
Nodes (11): 1. Removed loginid parameter, 2. price parameter validation added, 3. sell object now required in response, 4. All sell object fields now required, 4 Breaking Changes, Breaking changes, Code examples, Quick comparison (+3 more)

### Community 124 - "Statement"
Cohesion: 0.17
Nodes (11): 1. loginid parameter removed, 2. Transfer-related fields removed, 3. action_type enum validation removed, 4. Response fields now required, 7 Breaking Changes, Breaking changes, Code examples, Quick comparison (+3 more)

### Community 125 - "Ticks"
Cohesion: 0.17
Nodes (11): 1. Required fields in tick response changed, 2. Tick object now required in response, 3. Subscribe parameter now accepts 0, 4 Breaking Changes, 4. Input validation pattern removed, Breaking changes, Code examples, Quick comparison (+3 more)

### Community 126 - "Autenticação e Proteção de Rotas"
Cohesion: 0.18
Nodes (10): Arquivos Envolvidos, Autenticação e Proteção de Rotas, Cookie `auth_token`, Fluxo de autenticação, Função `logout`, JWT e Edge Runtime, Rotas Protegidas, Rotas Públicas (sem autenticação) (+2 more)

### Community 127 - "Options Setup REST"
Cohesion: 0.18
Nodes (10): Authentication, Available Endpoints, Error Response Format, OAuth2 Scopes, OpenAPI Specification, Options Setup REST, Overview, Response Status Codes (+2 more)

### Community 128 - "Buy"
Cohesion: 0.18
Nodes (10): 1. loginid parameter removed, 2. buy field validation relaxed, 3 Breaking Changes, 3. buy object now required in response, Breaking changes, Buy, Code examples, Quick comparison (+2 more)

### Community 129 - "Cancel"
Cohesion: 0.18
Nodes (10): 1. Removal of loginid parameter, 2. cancel object now required in response, 3. All response fields now required, 3 Breaking Changes, Breaking changes, Cancel, Code examples, Quick comparison (+2 more)

### Community 130 - "Contract update"
Cohesion: 0.18
Nodes (10): 1. loginid parameter removed, 2. contract_update object now required in response, 3 Breaking Changes, 3. New display_order_amount field added, Breaking changes, Code examples, Contract update, Quick comparison (+2 more)

### Community 131 - "Contract update history"
Cohesion: 0.18
Nodes (10): 1. LoginID parameter removed, 2. Response field contract_update_history now required, 3 Breaking Changes, 3. Response array items have required fields, Breaking changes, Code examples, Contract update history, Quick comparison (+2 more)

### Community 132 - "Forget all"
Cohesion: 0.18
Nodes (10): 1. Stream type enum validation removed, 2. Response field now required, 3 Breaking Changes, 3. Response array items now typed, Breaking changes, Code examples, Forget all, Quick comparison (+2 more)

### Community 133 - "Portfolio"
Cohesion: 0.18
Nodes (10): 1. Symbol field renamed, 2. LoginId parameter removed, 3. app_id field can no longer be null, 3 Breaking Changes, Breaking changes, Code examples, Portfolio, Quick comparison (+2 more)

### Community 134 - "Skill: Legacy Bridge Expert"
Cohesion: 0.20
Nodes (9): Acessando APIs Legadas, Adicionando Novos Scripts Legados, Arquivos Chave, Comunicação Legacy → React (CustomEvents), Comunicação React → Legacy, Padrão de Carregamento, Shims Obrigatórios (window globals), Skill: Legacy Bridge Expert (+1 more)

### Community 135 - "Skill: Trade Strategy Expert"
Cohesion: 0.20
Nodes (9): Arquivos Chave, Estrutura JSON de Regras, Fluxo de Tradução de Estratégia, Indicadores Disponíveis, Regras de Negócio Importantes, Seleção de Modelo Gemini, Skill: Trade Strategy Expert, Tarefa (+1 more)

### Community 136 - "Forget"
Cohesion: 0.20
Nodes (9): 1. Stream ID pattern validation relaxed, 2 Breaking Changes, 2. Response field always present, Breaking changes, Code examples, Forget, Quick comparison, Request structure (+1 more)

### Community 137 - "userService.js"
Cohesion: 0.40
Nodes (6): ForgotPasswordModal(), LoginPage(), Home(), checkToken(), registerUser(), userLogin()

### Community 138 - "Relatório de Engenharia Reversa — ZeeK 3.0"
Cohesion: 0.20
Nodes (9): Comportamento de rede (CONFIRMADO em captura ao vivo), Ferramentas usadas, Identificação do empacotamento, Limite técnico encontrado, Lógica do robô (reconstruída das constantes Nuitka), O heartbeat é telemetria/vigilância, Pontos de risco, Relatório de Engenharia Reversa — ZeeK 3.0 (+1 more)

### Community 139 - "Deriv OAuth 2.0 & WebSocket Connection"
Cohesion: 0.22
Nodes (8): 1. Market data (público — sem login), 2. Trading autenticado (OTP), Arquitetura de Autenticação (OAuth 2.0 PKCE), Consumo de Ticks (API da aplicação), CSP (`next.config.mjs`), Deriv OAuth 2.0 & WebSocket Connection, Referências internas, WebSocket

### Community 140 - "Authentication"
Cohesion: 0.22
Nodes (8): Authentication, Authentication Methods, OAuth 2.0 app vs PAT app, OAuth 2.0 apps, PAT apps, Token-based access, When to choose which, Why Authentication Matters

### Community 141 - "Migração Bot Strategy (2025)"
Cohesion: 0.22
Nodes (8): 1. Arquitetura, 2. Funcionalidades, 3. Inicialização, 4. Componentes Chave, Deploy on Vercel, Getting Started, Learn More, Migração Bot Strategy (2025)

### Community 142 - "Pontos de BUG e Ajustes Necessários (Gaps de Funcionalidade):"
Cohesion: 0.25
Nodes (7): 1. Timeout Falso de Trade Lock (Risco de Travar o Robô), 2. Funcionalidade Combo Incompatível com a API da Deriv (Real Mode), 3. Ausência de Controles Visuais para "Padrão A→B" na UI, 4. Métrica chiSquare (Anomalia de Distribuição) não é exibida, O que está de acordo com o planejado:, Pontos de BUG e Ajustes Necessários (Gaps de Funcionalidade):, Revisão de Código: Bear Bot Ultra 10.0 (Refatorado)

### Community 143 - "ciclo_monitoramento_trader.md"
Cohesion: 0.29
Nodes (6): 1. O Clique no Botão (`page.tsx`), 2. O Fluxo de Inicialização em `toggleBot`, 3. O Ciclo de Monitoramento Ativo (`Monitoring.ts`), 4. O Callback de Trade (`page.tsx` conectando ao `LegacyBridge.ts`), 5. Execução Final (`trade-manager.js`), Resumo do Fluxo:

### Community 144 - "explicacao_multi_mercado_com_execicao_manual.md"
Cohesion: 0.29
Nodes (6): 1. Varredura Simultânea (Paralelismo), 2. A Métrica de Exaustão (Os Cálculos), 3. A Tomada de Decisão (O Auto-Foco), 4. A Troca e Indicação na Tela (UI), A. Se você usa Padrão de Gatilho (Modo Differ com Padrão):, B. Se você NÃO usa Padrão (Estratégia Clássica):

### Community 145 - "Mark-up"
Cohesion: 0.29
Nodes (6): Another example, Earning partner commissions, Example, Mark-up, Markup impacts user profit, Other ways to monetise the Deriv API

### Community 146 - ".computeMarketIntelligence"
Cohesion: 0.29
Nodes (3): MarketIntelligence, getBestPattern(), wilsonLB()

### Community 147 - "bottraderx.tsx"
Cohesion: 0.29
Nodes (6): BotTraderX(), Configure, Console, RealAccount, Stats, VirtualAccount

### Community 148 - "Pendente"
Cohesion: 0.29
Nodes (6): Concluido, Melhorias Bot Copy Trader — Baseado no ZeekBot, Pendente, Prioridade Alta, Prioridade Baixa, Prioridade Media

### Community 150 - "score_oportunidade.md"
Cohesion: 0.33
Nodes (5): 1. Para que ele serve?, 2. Como ele funciona? (A Fórmula de Cálculo), 3. Ponderação pelos Modos de IA (`aiMode`), Os 4 Pilares do Score:, Resumo

### Community 151 - "System"
Cohesion: 0.40
Nodes (4): Available Endpoints, System, Use Cases, WebSocket & REST Endpoints

## Knowledge Gaps
- **1022 isolated node(s):** `__filename`, `__dirname`, `compat`, `eslintConfig`, `paths` (+1017 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **45 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `DerivService` connect `DerivService` to `TicksTest.tsx`, `DerivService.tsx`, `bearBotUltra.test.tsx`, `bearBotUltra2.tsx`, `buyTable.tsx`, `useAuth`?**
  _High betweenness centrality (0.014) - this node is a cross-community bridge._
- **Why does `BearBotEngine` connect `BearBotEngine` to `bearbot2.types.ts`, `bearBotUltra2.tsx`, `buildLoserSet`, `.computeMarketIntelligence`, `.prepareTrade`?**
  _High betweenness centrality (0.013) - this node is a cross-community bridge._
- **Why does `dependencies` connect `dependencies` to `devDependencies`, `bcryptjs`, `date-fns`, `@deriv/deriv-api`, `@heroicons/react`, `jose`, `json-rules-engine`, `jsonwebtoken`, `lucide-react`, `moment`, `mysql2`, `next`, `nextjs`, `query-string`, `react`, `react-icons`, `react-toastify`, `resend`, `@tensorflow/tfjs-backend-cpu`, `@tensorflow/tfjs-backend-webgl`, `@tensorflow/tfjs-converter`, `@types/react-dom`, `typescript`, `uuid`, `ws`?**
  _High betweenness centrality (0.003) - this node is a cross-community bridge._
- **What connects `__filename`, `__dirname`, `compat` to the rest of the system?**
  _1022 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `DerivService` be split into smaller, more focused modules?**
  _Cohesion score 0.06522522522522523 - nodes in this community are weakly interconnected._
- **Should `CopyTradingService` be split into smaller, more focused modules?**
  _Cohesion score 0.05520614954577219 - nodes in this community are weakly interconnected._
- **Should `WsListener` be split into smaller, more focused modules?**
  _Cohesion score 0.05348101265822785 - nodes in this community are weakly interconnected._