# Graph Report - bot-trader  (2026-09-09)

## Corpus Check
- 262 files · ~673,060 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1522 nodes · 2630 edges · 125 communities (73 shown, 42 thin omitted)
- Extraction: 94% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 138 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `56a196a0`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- WsListener
- DerivService WebSocket Manager
- Graphify Pipeline
- CopyTradingService
- BearBotEngine
- Deriv Account & Markup API
- bearbot2.types.ts
- devDependencies
- BearDifferMath.ts
- BearDifferEngine
- buy Endpoint
- verifyAdminToken
- useModuleAccess
- compilerOptions
- BearDifferEngine.ts
- DerivApiClient
- BearBotDiffer.tsx
- login/route.js
- bearBotUltra2.tsx
- DerivConnection
- useBearDiffer.ts
- create_account Endpoint
- translateStrategy Pipeline
- BotConfig
- useBearBot2.ts
- TradePlatform Architecture Overview
- Remoção do parâmetro loginid (multi-conta)
- Canal Market Público (ws/public)
- userService.js
- TicksTest.tsx
- DerivService WebSocket Singleton
- Weighted Period Scoring
- bearBotUltra.test.tsx
- src/middleware.ts (proteção server-side)
- Pilar: Força do Padrão A→B (patternStrength)
- Bot Copy Trader (demo → real replication)
- BotState
- EngineState
- .prepareTrade
- ZeeK 3.0 Trading Robot
- Score de Oportunidade
- Holographic Trading Dashboard Visual
- useAuth
- DerivService.tsx
- Bear Bot Ultra (v1)
- BearBot2Engine.ts (motor desacoplado)
- computeDynamicDifferDigit (spec contract)
- DerivService.tsx (singleton dois canais)
- Radar de Dígitos Dinâmicos (differDynamicDigit)
- bearBot2Engine.test.ts
- dependencies
- trade_config_full
- Bear Bot Ultra 10.0 Refactor Code Review
- Login Page Trading Illustration
- checkToken
- BotConfig
- CopyTradingService (uma instância por usuário)
- .runPipeline
- Inteligência de Multi-Mercado (Multi ON)
- differDynamicDigit (BotConfig flag)
- Bear Bot Pro Logo Image
- sharedRules.test.ts
- Observer
- middleware.ts
- resetPassword.test.js
- Gale (Martingale) Algorithm
- deriv_accounts (OAuth token snapshot)
- dynamic_prediction Rule Schema
- eslint.config.mjs
- Globe Glyph Path (grid-lined sphere, #666 fill)
- Vercel Logo Mark (SVG Triangle)
- forgot-password/route.js
- app/layout.js
- buyTable.tsx
- Next.js Wordmark Logo (SVG)
- Window Icon (window.svg)
- reset-password/page.tsx
- compilerOptions
- postcss.config.mjs
- File Icon (SVG)
- check-token/route.js
- operation/route.js
- profile/route.js
- FalkorDB Cypher Export
- bcryptjs
- date-fns
- @deriv/deriv-api
- Teste de Aderência Qui-Quadrado (χ²)
- @heroicons/react
- jose
- json-rules-engine
- jsonwebtoken
- lucide-react
- moment
- mysql2
- next.config.mjs
- nextjs
- next
- query-string
- react
- react-icons
- react-toastify
- @tensorflow/tfjs
- @tensorflow/tfjs-backend-cpu
- @tensorflow/tfjs-backend-webgl
- @tensorflow/tfjs-converter
- @types/react-dom
- typescript
- uuid
- ws
- intelPanel.test.ts
- Pending: Replace 2s Polling with SSE/WebSocket
- MonitoringService Lifecycle
- bearBot2FocusVirtualLossGate.test.ts
- useBearDiffer.test.ts

## God Nodes (most connected - your core abstractions)
1. `DerivService` - 85 edges
2. `BearDifferEngine` - 82 edges
3. `BearBotEngine` - 73 edges
4. `CopyTradingService` - 32 edges
5. `WsListener` - 30 edges
6. `EngineState` - 27 edges
7. `TradeExecutor` - 25 edges
8. `DerivConnection` - 22 edges
9. `createEngine()` - 18 edges
10. `DerivApiClient` - 17 edges

## Surprising Connections (you probably didn't know these)
- `M_frio — Markov Transition Inverse (30%)` --semantically_similar_to--> `Pilar: Força do Padrão A→B (patternStrength)`  [INFERRED] [semantically similar]
  docs/superpowers/specs/2026-08-17-differ-dynamic-digit-design.md → src/app/(withSidebar)/bear-bot-ultra-2/score_oportunidade.md
- `Motor 2.0 e Classificação das 17 Lógicas` --implements--> `BearDifferEngine`  [EXTRACTED]
  docs/doc_bear_bot_differ/README.md → src/app/services/BearDifferEngine.ts
- `Controle FDR de Benjamini-Hochberg (q=0.10)` --implements--> `benjaminiHochberg()`  [EXTRACTED]
  docs/doc_bear_bot_differ/README.md → src/app/services/BearDifferMath.ts
- `Simulação de Ruína de Monte Carlo` --implements--> `simulateMonteCarloRuin()`  [EXTRACTED]
  docs/doc_bear_bot_differ/README.md → src/app/services/BearDifferMath.ts
- `SIMULADO/REAL Mode Switching` --semantically_similar_to--> `Quantity Loss Mode`  [INFERRED] [semantically similar]
  .claude/commands/monitoring.md → CLAUDE.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Triple Cascade Genetic Validation Flow (Discovery - FDR - Monte Carlo)** — docs_doc_bear_bot_differ_readme_pipeline_genetico_cascata, src_app_services_beardiffermath_drifttest, src_app_services_beardiffermath_benjaminihochberg, src_app_services_beardifferengine_beardifferengine_runpipeline [EXTRACTED 1.00]
- **Bear Differ Risk Protection and Capital Preservation Suite** — docs_doc_bear_bot_differ_manual_do_usuario_regras_ouro_risco, docs_doc_bear_bot_differ_readme_criterio_kelly_fracionario, docs_doc_bear_bot_differ_readme_simulacao_ruina_monte_carlo, docs_code_review_bear_bot_differ_safety_guards_gating [EXTRACTED 1.00]
- **Bear Differ Three-Tier Architecture (Math - Engine - Bridge)** — docs_doc_bear_bot_differ_readme_arquitetura_soc, src_app_services_beardiffermath, src_app_services_beardifferengine, src_app_hooks_usebeardiffer [EXTRACTED 1.00]
- **Os 4 Pilares do Score de Oportunidade** — docs_doc_bear_bot_ultra_2_readme_opportunity_score, docs_doc_bear_bot_ultra_2_readme_pillar_pressure, docs_doc_bear_bot_ultra_2_readme_pillar_pattern_strength, docs_doc_bear_bot_ultra_2_readme_pillar_vlprogress, docs_doc_bear_bot_ultra_2_readme_pillar_syncscore, docs_doc_bear_bot_ultra_2_readme_ai_gate [EXTRACTED 1.00]
- **Pipeline de Copy Trading (demo → real)** — docs_bottrader_copytradingmanager, docs_bottrader_copytradingservice, docs_bottrader_wslistener, docs_bottrader_signalprocessor, docs_bottrader_tradeexecutor, docs_bottrader_tradesignal [EXTRACTED 1.00]
- **Four Dimensions of Composite Score S(d)** — docs_superpowers_specs_2026_08_17_differ_dynamic_digit_design_f_frio, docs_superpowers_specs_2026_08_17_differ_dynamic_digit_design_m_frio, docs_superpowers_specs_2026_08_17_differ_dynamic_digit_design_t_frio, docs_superpowers_specs_2026_08_17_differ_dynamic_digit_design_a_frio, docs_superpowers_specs_2026_08_17_differ_dynamic_digit_design_composite_score [EXTRACTED 1.00]
- **Contract Lifecycle: quote, buy, monitor, adjust, exit** — docs_documentacao_deriv_api_reference_docs_trading_proposal_proposal, docs_documentacao_deriv_api_reference_docs_trading_buy_buy, docs_documentacao_deriv_api_reference_docs_trading_proposal_open_contract_proposal_open_contract, docs_documentacao_deriv_api_reference_docs_trading_contract_update_contract_update, docs_documentacao_deriv_api_reference_docs_trading_sell_sell, docs_documentacao_deriv_api_reference_docs_trading_cancel_cancel [EXTRACTED 1.00]
- **Legacy Data Retrieval Workflow (status gate → accounts → statement)** — docs_documentacao_deriv_api_reference_docs_options_legacy_legacy_migration_status_legacy_migration_status, docs_documentacao_deriv_api_reference_docs_options_legacy_legacy_accounts_legacy_accounts, docs_documentacao_deriv_api_reference_docs_options_legacy_legacy_statement_legacy_statement, docs_documentacao_deriv_api_reference_docs_options_legacy_http_409_migration_gate [EXTRACTED 1.00]
- **Endpoints afetados pela remoção do loginid na New API** — docs_documentacao_deriv_legacy_vs_new_api_comparison_buy_buy, docs_documentacao_deriv_legacy_vs_new_api_comparison_sell_sell, docs_documentacao_deriv_legacy_vs_new_api_comparison_cancel_cancel, docs_documentacao_deriv_legacy_vs_new_api_comparison_balance_balance, docs_documentacao_deriv_legacy_vs_new_api_comparison_portfolio_portfolio, docs_documentacao_deriv_legacy_vs_new_api_comparison_statement_statement, docs_documentacao_deriv_legacy_vs_new_api_comparison_profit_table_profit_table, docs_documentacao_deriv_legacy_vs_new_api_comparison_proposal_proposal, docs_documentacao_deriv_legacy_vs_new_api_comparison_proposal_open_contract_proposal_open_contract, docs_documentacao_deriv_legacy_vs_new_api_comparison_contract_update_contract_update, docs_documentacao_deriv_legacy_vs_new_api_comparison_contract_update_history_contract_update_history, docs_documentacao_deriv_legacy_vs_new_api_comparison_contracts_for_contracts_for, docs_documentacao_deriv_legacy_vs_new_api_comparison_transaction_transaction [EXTRACTED 1.00]
- **OAuth 2.0 + PKCE Login Flow Participants** — docs_documentacao_deriv_api_reference_docs_intro_oauth_authorization_code_flow, docs_documentacao_deriv_api_reference_docs_intro_oauth_pkce, docs_documentacao_deriv_api_reference_docs_intro_oauth_state_csrf_protection, docs_documentacao_deriv_api_reference_docs_intro_oauth_session_storage_tip, docs_documentacao_deriv_api_reference_docs_intro_authentication_oauth2_app, docs_documentacao_deriv_api_reference_docs_api_reference_otp_workflow [EXTRACTED 1.00]
- **Options Account Provisioning and WebSocket Handshake** — docs_documentacao_deriv_api_reference_docs_options_create_account_create_account, docs_documentacao_deriv_api_reference_docs_options_get_accounts_get_accounts, docs_documentacao_deriv_api_reference_docs_options_reset_demo_balance_reset_demo_balance, docs_documentacao_deriv_api_reference_docs_options_websocket_otp_endpoint, docs_documentacao_deriv_api_reference_docs_workflows_request_headers [EXTRACTED 1.00]
- **Three activeSym Focus-Change Interception Points** — docs_superpowers_plans_2026_08_25_contagem_sob_foco_updateconfig_interceptor, docs_superpowers_plans_2026_08_25_contagem_sob_foco_tryfiremulticandidate_interceptor, docs_superpowers_plans_2026_08_25_contagem_sob_foco_tryswitchmulticandidate_interceptor, docs_superpowers_specs_2026_08_25_contagem_sob_foco_design_vlresetm [EXTRACTED 1.00]
- **Graphify Build Pipeline Stages** — _agents_skills_graphify_skill_detect_step, _agents_skills_graphify_skill_ast_structural_extraction, _agents_skills_graphify_skill_semantic_extraction, _agents_skills_graphify_skill_community_detection, _agents_skills_graphify_skill_graph_health_check, _agents_skills_graphify_skill_manifest_stamping [EXTRACTED 1.00]
- **INICIAR Button to Broker Trade Flow** — ciclo_monitoramento_trader_toggle_bot, _claude_commands_legacy_bridge_configure_trade_manager, ciclo_monitoramento_trader_start_execution, _claude_commands_monitoring_on_trade_signal, ciclo_monitoramento_trader_execute_trade, ciclo_monitoramento_trader_trade_manager_js, ciclo_monitoramento_trader_trade_message_interceptor [EXTRACTED 1.00]
- **Four Pillars of the Score de Oportunidade** — src_app__withsidebar__bear_bot_ultra_2_score_oportunidade_pressao_perdedores, src_app__withsidebar__bear_bot_ultra_2_score_oportunidade_forca_padrao, src_app__withsidebar__bear_bot_ultra_2_score_oportunidade_vl_progress, src_app__withsidebar__bear_bot_ultra_2_score_oportunidade_sync_pillar, src_app__withsidebar__bear_bot_ultra_2_score_oportunidade_ai_mode_weights [EXTRACTED 1.00]
- **Risk Management Configuration Triad** — _claude_commands_trade_config_trade_config_data, _claude_commands_trade_config_management_config_data, _claude_commands_trade_config_controller_config_data, _claude_commands_trade_config_gale_algorithm, _claude_commands_trade_config_soros_algorithm, _claude_commands_trade_config_validation_rules [EXTRACTED 1.00]
- **Account Transaction/History Endpoint Family** — docs_documentacao_deriv_api_reference_docs_account_portfolio_portfolio, docs_documentacao_deriv_api_reference_docs_account_profit_table_profit_table, docs_documentacao_deriv_api_reference_docs_account_statement_statement, docs_documentacao_deriv_api_reference_docs_account_transaction_transaction, docs_documentacao_deriv_api_reference_docs_options_legacy_legacy_statement_legacy_statement [INFERRED 0.85]
- **Connection Health and Session Hygiene Endpoints** — docs_documentacao_deriv_api_reference_docs_system_ping_ping, docs_documentacao_deriv_api_reference_docs_system_time_server_time, docs_documentacao_deriv_api_reference_docs_system_health_health_check, docs_documentacao_deriv_api_reference_docs_subscription_forget_forget, docs_documentacao_deriv_api_reference_docs_subscription_forget_all_forget_all [INFERRED 0.85]

## Communities (125 total, 42 thin omitted)

### Community 0 - "WsListener"
Cohesion: 0.05
Nodes (19): buildDerivWsUrl(), DerivConnection, fetchAccountIdFromPat(), fetchOtpWebsocketUrl(), getDerivAppId(), isPatToken(), parseDerivToken(), ParsedToken (+11 more)

### Community 2 - "Graphify Pipeline"
Cohesion: 0.05
Nodes (53): graph.json Artifact, GRAPH_REPORT.md Audit Report, Graphify Always-On Rule, Graphify Agent Wiki, URL Ingest (graphify add), Watch Mode, Graphify MCP Server, Token Reduction Benchmark (+45 more)

### Community 3 - "CopyTradingService"
Cohesion: 0.06
Nodes (18): POST(), GET(), POST(), CopyTradingManager, UserCopyTrading, UserStats, CopyTradingService, createService() (+10 more)

### Community 4 - "BearBotEngine"
Cohesion: 0.12
Nodes (3): BearBotEngine, getBestPattern(), wilsonLB()

### Community 5 - "Deriv Account & Markup API"
Cohesion: 0.06
Nodes (49): Account Management WebSocket Endpoint Group, balance Endpoint, Client loginid Identifier, Per-Application Markup Breakdown, Deriv-App-ID Header, markup_statistics REST Endpoint, Contract Type Enumeration (DIGITOVER, CALL, MULTUP, …), portfolio Endpoint (+41 more)

### Community 6 - "bearbot2.types.ts"
Cohesion: 0.09
Nodes (25): AIMode, BotMode, ComboPending, DEFAULT_BOT_STATE, DerivAccount, DerivAuthState, DynamicDigitDetail, ExecMode (+17 more)

### Community 7 - "devDependencies"
Cohesion: 0.05
Nodes (42): cross-env, eslint, eslint-config-next, @eslint/eslintrc, jsdom, devDependencies, cross-env, eslint (+34 more)

### Community 8 - "BearDifferMath.ts"
Cohesion: 0.21
Nodes (17): MonteCarloResult, benjaminiHochberg(), binomP(), calculateKelly(), chiP(), driftTest(), DriftTestResult, erfc() (+9 more)

### Community 10 - "buy Endpoint"
Cohesion: 0.09
Nodes (34): forget_all Endpoint, forget vs forget_all Selection Guidance, Stream Types Enum (balance, candles, proposal, ticks, transaction), forget Endpoint, Subscription ID (subscription.id field), Subscription Management WebSocket, Health Check REST Endpoint (/v1/health), Health Polling Best Practices (30-60s, exponential backoff) (+26 more)

### Community 11 - "verifyAdminToken"
Cohesion: 0.13
Nodes (22): GET(), POST(), prisma, getOperations(), verifyAdminToken(), OperationsPage(), OperationWithUser, createModule() (+14 more)

### Community 12 - "useModuleAccess"
Cohesion: 0.14
Nodes (15): useModuleAccess(), Page(), Page(), Page(), BotTraderX(), Configure, Console, RealAccount (+7 more)

### Community 13 - "compilerOptions"
Cohesion: 0.07
Nodes (29): dom, dom.iterable, esnext, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules, **/*.ts (+21 more)

### Community 14 - "BearDifferEngine.ts"
Cohesion: 0.10
Nodes (25): AnomalyLogItem, BASE_GENOME, BiasTestResult, DEFAULT_DIFFER_CONFIG, DEFAULT_DIFFER_MARKETS, DifferAudit, DifferTradeRecord, LogicDef (+17 more)

### Community 15 - "DerivApiClient"
Cohesion: 0.11
Nodes (11): AnalysisResponse, ConfigResponse, ConfigUpdate, ConnectionRequest, DerivApiClient, MarketQuality, PerformanceStats, SymbolAnalysis (+3 more)

### Community 16 - "BearBotDiffer.tsx"
Cohesion: 0.09
Nodes (24): propKey(), useBearDiffer(), StrategyCandidate, WatchStatus, BearBotDiffer(), ConfigSidebar(), LabTab(), LabTabProps (+16 more)

### Community 17 - "login/route.js"
Cohesion: 0.12
Nodes (16): getClientIp(), POST(), prisma, getClientIp(), POST(), prisma, GET(), prisma (+8 more)

### Community 18 - "bearBotUltra2.tsx"
Cohesion: 0.05
Nodes (32): BearBotUltra(), sanitizeDecimalInput(), validateNumber(), TradeLogComponent(), TradeLogProps, localStorageMock, MockAudioContext, mockExtractLastDigit (+24 more)

### Community 20 - "useBearDiffer.ts"
Cohesion: 0.09
Nodes (26): Fast Execution via Proposal Keeper, Live Tracking de Assertividade Virtual (virtStats), Next-Tick Settlement em Simulação, Paridade Funcional e Matemática Bear Differ, Pipeline Genético com Drift Test, Relatório de Code Review Bear Bot Differ v3.5, Safety Guards e Gating de Modo Real, Contrato Differ na Deriv (+18 more)

### Community 21 - "create_account Endpoint"
Cohesion: 0.14
Nodes (20): Demo vs Real Account Types, create_account Endpoint, Deriv REST Error Response Format (errors[] + meta), Options Account Object Schema, get_accounts Endpoint, Options OAuth2 Scopes (trade / account_manage), Options Setup REST API, Demo-Only Balance Reset Constraint ($10,000 default) (+12 more)

### Community 22 - "translateStrategy Pipeline"
Cohesion: 0.15
Nodes (17): configureTradeManager, Legacy Bridge Expert Skill, Legacy Rules Cache and History API, Legacy Script Load Order, Window Global Shims, Group Activation Logic, Gemini Model Selection by Group Count, Available Strategy Indicators (+9 more)

### Community 23 - "BotConfig"
Cohesion: 0.25
Nodes (6): BotConfig, DynamicDigitResult, clampRateLimits(), DynamicDigitPanel(), DynamicDigitPanelProps, getScoreColor()

### Community 24 - "useBearBot2.ts"
Cohesion: 0.14
Nodes (13): extractLastDigit(), isTerminalContract(), useBearBot(), MARKETS, ProposalEntry, MockAudioContext, mockGetStorageDerivAccount, mockOn (+5 more)

### Community 25 - "TradePlatform Architecture Overview"
Cohesion: 0.13
Nodes (16): CustomEvent Interceptors, Trade Strategy Expert Skill, Serena Project Configuration, TypeScript Language Server Backend, window.tradeManager (trade-manager.js), setupTradeMessageInterceptor, Dual-Layer Auth and Route Protection, Bear Bot Ultra 2 (+8 more)

### Community 26 - "Remoção do parâmetro loginid (multi-conta)"
Cohesion: 0.17
Nodes (15): TradeExecutor (WebSocket conta real), Canal Trading autenticado via OTP, Barreira Congelada (lockedDigit / resolveDynamicBarrier), PropKeeper e Pre-opened Proposals (<10ms), Portão vlDynGateOpen (3 condições obrigatórias), balance (Legacy vs New), buy (Legacy vs New), Remoção do parâmetro loginid (multi-conta) (+7 more)

### Community 27 - "Canal Market Público (ws/public)"
Cohesion: 0.17
Nodes (15): CSP connect-src em next.config.mjs, Endpoint legado websockets/v3 retorna InvalidSymbol, Canal Market Público (ws/public), TicksTest.tsx (consumo de ticks na home), bearbot2.types.ts (buildLoserSet / isWinCheck), Modo COMBO (Dual-Leg Simultâneo), extractLastDigit e Pip Size por símbolo, active_symbols (Legacy vs New) (+7 more)

### Community 28 - "userService.js"
Cohesion: 0.24
Nodes (9): updateUserProfile(), getUser(), logout(), Sidebar(), HomeLayout(), ProfileModal(), ProfileModalProps, localStorageMock (+1 more)

### Community 29 - "TicksTest.tsx"
Cohesion: 0.19
Nodes (12): Authentication, AuthenticationHandle, TicksGraph(), AccountSelectorProps, extractDigit(), getDecimalPlaces(), getSymbolLabel(), INITIAL_TICKS (+4 more)

### Community 30 - "DerivService WebSocket Singleton"
Cohesion: 0.33
Nodes (7): Automatic Reconnection and Request Queue, Deriv API Expert Skill, extractLastDigit, Tick/Balance Subscription Management, DerivService Test Mock, DerivService WebSocket Singleton, Digit Precision by Symbol

### Community 31 - "Weighted Period Scoring"
Cohesion: 0.16
Nodes (14): Gap Bonus, Monitoring & Probability Expert Skill, ProbabilityStats Interface, Saturation Penalty, Top-N Digits, Weighted Period Scoring, localStorage Test Mock, Test Priority Matrix (+6 more)

### Community 32 - "bearBotUltra.test.tsx"
Cohesion: 0.14
Nodes (11): BearBotUltra(), HistoryPage(), localStorageMock, mockExtractLastDigit, mockGetStorageDerivAccount, mockOn, mockRemoveById, mockSend (+3 more)

### Community 33 - "src/middleware.ts (proteção server-side)"
Cohesion: 0.15
Nodes (13): Cookie auth_token (HttpOnly, 8h), jose no Edge Runtime, Dupla Camada de Proteção JWT, logout() de userService.js, src/middleware.ts (proteção server-side), Rotas Públicas (sem autenticação), (withSidebar)/layout.js — barreira client-side, Integração onUseRule no AiChatPanel (+5 more)

### Community 34 - "Pilar: Força do Padrão A→B (patternStrength)"
Cohesion: 0.18
Nodes (13): F_frio — Frequência Inversa Multi-Janela (40%), Fase 'Coletando Dados' (50 ticks), IntelPanel Status Transition (coletando → recomendação), 120-Tick Rolling Memory per Market, Cronograma de Ativação por Ticks, Proposed Alternative Sync Metrics, Gráfico de Sincronia (syncScore formula), Sync Test Passes Only via Identical Fed Sequences (+5 more)

### Community 35 - "Bot Copy Trader (demo → real replication)"
Cohesion: 0.15
Nodes (13): Bot Copy Trader (demo → real replication), Limite de Martingale (reset vs stop), Pause Time (cooldown between real trades), Quantity Loss (demo losses before real entry), Stake Multiple (Martingale multiplier), Stop Loss / Stop Win (real account limits), calculateNextStake Uses martingaleLevel, consecutiveLosses Scoped to Demo Only (+5 more)

### Community 36 - "BotState"
Cohesion: 0.16
Nodes (13): BotState, buildLoserSet(), DEFAULT_CONFIG, getIntelColor(), getRecLabel(), IntelPanel(), IntelPanelProps, getIntelColor() (+5 more)

### Community 37 - "EngineState"
Cohesion: 0.25
Nodes (9): DifferConfig, DifferLogItem, DifferMarket, EngineState, ConfigSidebarProps, LogicsTabProps, OperationTabProps, TradeResultsTable() (+1 more)

### Community 39 - "ZeeK 3.0 Trading Robot"
Cohesion: 0.24
Nodes (12): BotTrader Configure Interface, BotTrader Copy Trader, Martingale Stake Formula, onTrade Guard, Quantity Loss Mode, Nuitka Constant-Blob Decompilation Limit, ZeeK Heartbeat Telemetry, ZeeK License Validation (+4 more)

### Community 40 - "Score de Oportunidade"
Cohesion: 0.20
Nodes (12): Contagem sob Foco Implementation Plan, toggle-vl-focus-only UI Control, 3s Anti-Flicker Manual Switch Lock, Contagem sob Foco (Focus-Scoped VL Counting), VL as Post-Focus Confirmation (not Pre-condition), Loss Virtual Modes (consec / accum), vlFocusOnly (BotConfig field), AI Gate (Score >= 40 to authorize entry) (+4 more)

### Community 41 - "Holographic Trading Dashboard Visual"
Cohesion: 0.23
Nodes (12): Authentication Page Branding Asset, Businessman Holding Floating Screen, Candlestick Price Chart with Volume Bars, Coinbase Prime Institutional UI (BTC/USD), Dark Navy / Cyan Visual Palette, Holographic Trading Dashboard Visual, Login Screen Background Image, Bid/Ask Market Depth Chart (+4 more)

### Community 42 - "useAuth"
Cohesion: 0.27
Nodes (7): useAuth(), HomePage(), ProfilePage(), MarkupBreakdown, MarkupStatisticsData, MarkupStatisticsReport(), MarkupStatisticsPage()

### Community 43 - "DerivService.tsx"
Cohesion: 0.20
Nodes (10): AccountInfo, DerivEventMap, PendingRequest, TokenData, UserInfo, Market, MARKETS, PatternState (+2 more)

### Community 44 - "Bear Bot Ultra (v1)"
Cohesion: 0.18
Nodes (11): Modo Quantity Loss (isInRealMode), Bear Bot Ultra 2 (v10.0 Refatorado), Desacoplamento total Engine ↔ React, Bear Bot Ultra (v1), forgetAllProposals() e AlreadySubscribed, Loss Virtual — Janela Deslizante (modo acum), Stale Closure em listeners de WebSocket, Padrão híbrido useState vs stateRef (+3 more)

### Community 45 - "BearBot2Engine.ts (motor desacoplado)"
Cohesion: 0.20
Nodes (11): AI Gate (OpportunityScore >= 40), BearBot2Engine.ts (motor desacoplado), Martingale Multiplicador vs Parcelado, Score de Oportunidade e os 4 Pilares, Validação Rigorosa de Padrões A → B (Wilson LB + Lift), Pilar 2: Força do Padrão A → B, Pilar 1: Pressão de Perdedores, Pilar 3: Progresso de Loss Virtual (+3 more)

### Community 46 - "computeDynamicDifferDigit (spec contract)"
Cohesion: 0.20
Nodes (11): Backward Compatibility with differAutoDigit and patTrigger, bearBot2DynamicDigit.test.ts (planned suite), Dynamic Digit Engine Tick & Trade Integration, Differ Dynamic Digit Implementation Plan, Score Composto Multi-Dimensional S(d), computeDynamicDifferDigit (spec contract), Dígitos Dinâmicos (DIFFER Mode Feature), Independence from Loss Virtual and Padrão A→B (+3 more)

### Community 48 - "DerivService.tsx (singleton dois canais)"
Cohesion: 0.20
Nodes (10): Proteção contra duplicatas do TradeExecutor, Guard onTrade (prevenção de trade duplicado), bool_89 do ZeekBot original, client_id (alfanumérico) vs app_id (numérico), DerivService.tsx (singleton dois canais), Deriv OAuth 2.0 PKCE Flow, SAFETY_TIMEOUT_MS (30s) e abortPendingTrade, tradeLock (trava atômica de concorrência) (+2 more)

### Community 49 - "Radar de Dígitos Dinâmicos (differDynamicDigit)"
Cohesion: 0.20
Nodes (10): Anti-Cascade Reset (prevenção de disparos em cascata), Dígito Automático no Differ (differAutoDigit), Radar de Dígitos Dinâmicos (differDynamicDigit), Sub-Score de Resistência à Anomalia (15%), Sub-Score de Frequência Multi-Janela (40%), Sub-Score de Markov Inverso (30%), Sub-Score de Trigramas Inversos (15%), Contagem sob Foco (vlFocusOnly) (+2 more)

### Community 50 - "bearBot2Engine.test.ts"
Cohesion: 0.22
Nodes (5): AI_WEIGHTS, AIModeName, feedABPattern(), seedLoserPressure(), seedPatternIntel()

### Community 51 - "dependencies"
Cohesion: 0.22
Nodes (9): axios, dependencies, axios, @prisma/client, react-dom, resend, @prisma/client, react-dom (+1 more)

### Community 52 - "trade_config_full"
Cohesion: 0.25
Nodes (9): _timestamp/_autoSaved Config Envelope, selectedSymbol (localStorage key), trade_config_controller, trade_config_full, trade_config_management, trade_config_trade, trade_config_user_<loginId> (per-account config), Pending: Database Persistence via Prisma/MySQL (+1 more)

### Community 53 - "Bear Bot Ultra 10.0 Refactor Code Review"
Cohesion: 0.25
Nodes (9): A_frio — Anomaly Resistance (15%), Teste Qui-Quadrado (30-tick minimum), GAP: chiSquare / marketAnomaly Not Rendered, BUG: prepareCombo Payload Rejected by Deriv API, Decoupled Engine Pattern (BearBotEngine + useBearBot2), engine.onAutoTrade → executeTrade Event Bridge, Bear Bot Ultra 10.0 Refactor Code Review, BUG: Empty 10s Trade Lock Safety Timeout (+1 more)

### Community 54 - "Login Page Trading Illustration"
Cohesion: 0.36
Nodes (9): Buy / Sell Signal Iconography, Candlestick Chart Panel (STOCKS), Blue / Green / Red Trading Palette, Flat Vector Stock-Art Illustration Style, Login Page Trading Illustration, Login Page Hero Artwork Slot, Lorem Ipsum Placeholder Asset Labels, Trading Dashboard Visual Motif (+1 more)

### Community 55 - "checkToken"
Cohesion: 0.36
Nodes (6): ForgotPasswordModal(), LoginPage(), Home(), checkToken(), registerUser(), userLogin()

### Community 57 - "CopyTradingService (uma instância por usuário)"
Cohesion: 0.29
Nodes (8): BotTrader (Bot Copy Trader), CopyTradingManager (singleton server-side), CopyTradingService (uma instância por usuário), Martingale (progressão geométrica), Reconexão automática de WebSockets, SignalProcessor, TradeSignal (símbolo, tipo, duração, barrier), WsListener (WebSocket conta demo)

### Community 58 - ".runPipeline"
Cohesion: 0.33
Nodes (3): Pontuação Composta de Dígitos (scoreAll), DifferGenome, PipelineCandidate

### Community 59 - "Inteligência de Multi-Mercado (Multi ON)"
Cohesion: 0.29
Nodes (8): Pilar 4: Sincronia Cross-Market, Auto-Foco / Troca Automática de Mercado, Métrica de Exaustão (Score), Multi-Mercado ON com Execução MANUAL (radar inteligente), 7 Mercados de Volatilidade Deriv, Trava Anti-Flicker de 3 segundos, Inteligência de Multi-Mercado (Multi ON), Compra Rápida (Quick Trade)

### Community 60 - "differDynamicDigit (BotConfig flag)"
Cohesion: 0.29
Nodes (8): bearBotUltra2AutoDigitUI.test.tsx (planned suite), tryFireMultiCandidate Focus-Reset (auto exec), trySwitchMultiCandidate Focus-Reset (manual exec), updateConfig Focus-Reset Interceptor (user click), differDynamicDigit (BotConfig flag), Dígitos Dinâmicos UI Toggle & Disabled Digit Grid, vlResetM(sym) — VL Counter Reset per Market, GAP: No UI for Padrão A→B (patTrigger stuck at default)

### Community 61 - "Bear Bot Pro Logo Image"
Cohesion: 0.43
Nodes (8): Bear Bot Ultra Module Branding, BEAR BOT Wordmark, Bearish Trading Brand Theme, Bear Bot Pro Logo Image, White Bear Silhouette Mark, Green Rising / Red Falling Bar Chart Motif, Dark Charcoal Brand Palette, PRO Badge with Blue Bot-Face Emblem

### Community 62 - "sharedRules.test.ts"
Cohesion: 0.29
Nodes (5): ../app/api/shared-rules/route, BASE_RULE, makeRequest(), makeToken(), mocks

### Community 64 - "middleware.ts"
Cohesion: 0.29
Nodes (4): config, isPublicPath(), middleware(), PUBLIC_PATHS

### Community 65 - "resetPassword.test.js"
Cohesion: 0.29
Nodes (3): prisma, freshTokenSentAt, mocks

### Community 66 - "Gale (Martingale) Algorithm"
Cohesion: 0.29
Nodes (8): Proposal and Buy Contract Flow, Gale (Martingale) Algorithm, ManagementConfigData, Soros (Profit Reinvestment) Algorithm, TradeConfigData, Trade Configuration & Risk Management Skill, Pre-Start Config Validation, Deriv Contract Types

### Community 68 - "deriv_accounts (OAuth token snapshot)"
Cohesion: 0.60
Nodes (5): deriv_accounts (localStorage key), token_list (localStorage key), deriv_accounts (OAuth token snapshot), OAuth Token Format (oauth:ory_at_...:loginid), token_list (OAuth token snapshot)

### Community 69 - "dynamic_prediction Rule Schema"
Cohesion: 0.40
Nodes (5): dynamic_prediction Rule Schema, monitoring_group_activation_config_<scope>, monitoring_strategy_<loginId> (raw strategy text), parameters_ui Path-Bound Parameter Binding, strategy_cache_global (translation cache)

### Community 70 - "eslint.config.mjs"
Cohesion: 0.40
Nodes (4): compat, __dirname, eslintConfig, __filename

### Community 71 - "Globe Glyph Path (grid-lined sphere, #666 fill)"
Cohesion: 0.60
Nodes (5): clipPath id="a" (16x16 square mask), Globe Glyph Path (grid-lined sphere, #666 fill), Globe Icon (globe.svg), 16x16 Monochrome Icon Convention, Next.js Starter Public Asset

### Community 72 - "Vercel Logo Mark (SVG Triangle)"
Cohesion: 0.60
Nodes (5): create-next-app Boilerplate Branding Asset, Static Public Asset (Next.js /public), Filled Triangle Path (#fff, viewBox 0 0 1155 1000), Vercel Logo Mark (SVG Triangle), Vercel Hosting Platform

### Community 73 - "forgot-password/route.js"
Cohesion: 0.50
Nodes (4): generateSecureToken(), POST(), prisma, resend

### Community 74 - "app/layout.js"
Cohesion: 0.40
Nodes (3): geistMono, geistSans, metadata

### Community 75 - "buyTable.tsx"
Cohesion: 0.60
Nodes (3): saveOperation(), BuyTable(), BuyTableProps

### Community 76 - "Next.js Wordmark Logo (SVG)"
Cohesion: 0.67
Nodes (4): create-next-app Default Static Asset, Next.js Framework Branding, Next.js Wordmark Logo (SVG), Monochrome Vector Wordmark Asset

### Community 77 - "Window Icon (window.svg)"
Cohesion: 0.67
Nodes (4): Browser Window Glyph (title bar with three dots), Monochrome 16x16 UI Icon Set (#666 fill), Next.js Starter Template Static Asset, Window Icon (window.svg)

### Community 81 - "File Icon (SVG)"
Cohesion: 0.67
Nodes (3): Document Page Glyph with Folded Corner, File Icon (SVG), Next.js Starter Template Icon Asset

### Community 128 - "MonitoringService Lifecycle"
Cohesion: 0.29
Nodes (8): Cooldown Ticks, MonitoringService Lifecycle, SIMULADO/REAL Mode Switching, onTradeSignal Callback, ControllerConfigData, LegacyBridge.executeTrade, startExecution (isExecutionActive), LegacyBridge Integration Layer

### Community 131 - "useBearDiffer.test.ts"
Cohesion: 0.33
Nodes (5): mockListeners, mockObserver, mockSend, mockSubscribe, mockSwitchAccount

## Ambiguous Edges - Review These
- `DerivService WebSocket Singleton` → `Deriv API Expert Skill`  [AMBIGUOUS]
  .claude/commands/deriv-api.md · relation: conceptually_related_to
- `Coinbase Prime Institutional UI (BTC/USD)` → `Holographic Trading Dashboard Visual`  [AMBIGUOUS]
  public/img/background-login-2.jpg · relation: references
- `Trading Dashboard Visual Motif` → `Login Page Trading Illustration`  [AMBIGUOUS]
  public/img/form-login.png · relation: shares_data_with
- `Bear Bot Ultra Module Branding` → `PRO Badge with Blue Bot-Face Emblem`  [AMBIGUOUS]
  public/img/bear-logo.jpg · relation: conceptually_related_to
- `Next.js Starter Public Asset` → `Globe Glyph Path (grid-lined sphere, #666 fill)`  [AMBIGUOUS]
  public/globe.svg · relation: conceptually_related_to
- `Vercel Hosting Platform` → `Filled Triangle Path (#fff, viewBox 0 0 1155 1000)`  [AMBIGUOUS]
  public/vercel.svg · relation: semantically_similar_to
- `Browser Window Glyph (title bar with three dots)` → `Monochrome 16x16 UI Icon Set (#666 fill)`  [AMBIGUOUS]
  public/window.svg · relation: semantically_similar_to

## Knowledge Gaps
- **326 isolated node(s):** `__filename`, `__dirname`, `compat`, `eslintConfig`, `paths` (+321 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 487 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **42 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `DerivService WebSocket Singleton` and `Deriv API Expert Skill`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Coinbase Prime Institutional UI (BTC/USD)` and `Holographic Trading Dashboard Visual`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._
- **What is the exact relationship between `Trading Dashboard Visual Motif` and `Login Page Trading Illustration`?**
  _Edge tagged AMBIGUOUS (relation: shares_data_with) - confidence is low._
- **What is the exact relationship between `Bear Bot Ultra Module Branding` and `PRO Badge with Blue Bot-Face Emblem`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Next.js Starter Public Asset` and `Globe Glyph Path (grid-lined sphere, #666 fill)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Vercel Hosting Platform` and `Filled Triangle Path (#fff, viewBox 0 0 1155 1000)`?**
  _Edge tagged AMBIGUOUS (relation: semantically_similar_to) - confidence is low._
- **What is the exact relationship between `Browser Window Glyph (title bar with three dots)` and `Monochrome 16x16 UI Icon Set (#666 fill)`?**
  _Edge tagged AMBIGUOUS (relation: semantically_similar_to) - confidence is low._