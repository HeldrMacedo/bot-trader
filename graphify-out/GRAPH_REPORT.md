# Graph Report - /home/helder/Desenvolvimento/bot-trader  (2026-08-08)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 633 nodes · 992 edges · 68 communities (29 shown, 39 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `de786f9b`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- DerivService
- CopyTradingService
- TradeExecutor
- devDependencies
- userService.js
- verifyAdminToken
- compilerOptions
- WsListener
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
- Observer
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
- MarkupStatisticsReport.tsx
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

## God Nodes (most connected - your core abstractions)
1. `DerivService` - 83 edges
2. `CopyTradingService` - 30 edges
3. `WsListener` - 29 edges
4. `TradeExecutor` - 24 edges
5. `DerivConnection` - 22 edges
6. `DerivApiClient` - 17 edges
7. `compilerOptions` - 17 edges
8. `TradeSignal` - 14 edges
9. `verifyAdminToken()` - 13 edges
10. `CopyTradingManager` - 13 edges

## Surprising Connections (you probably didn't know these)
- `Page()` --calls--> `useModuleAccess()`  [EXTRACTED]
  src/app/(withSidebar)/bear-bot-ultra/page.tsx → src/app/hooks/useModuleAccess.ts
- `BotTrade()` --calls--> `useModuleAccess()`  [EXTRACTED]
  src/app/(withSidebar)/bottrader/page.tsx → src/app/hooks/useModuleAccess.ts
- `TicksTest()` --calls--> `getUser()`  [EXTRACTED]
  src/app/(withSidebar)/home/components/TicksTest.tsx → src/app/services/userService.js
- `HomePage()` --calls--> `useAuth()`  [EXTRACTED]
  src/app/(withSidebar)/home/page.js → src/app/hooks/useAuth.js
- `HomeLayout()` --calls--> `getUser()`  [EXTRACTED]
  src/app/(withSidebar)/layout.js → src/app/services/userService.js

## Import Cycles
- None detected.

## Communities (68 total, 39 thin omitted)

### Community 1 - "CopyTradingService"
Cohesion: 0.06
Nodes (18): POST(), GET(), POST(), CopyTradingManager, UserCopyTrading, UserStats, CopyTradingService, createService() (+10 more)

### Community 2 - "TradeExecutor"
Cohesion: 0.08
Nodes (16): buildDerivWsUrl(), DerivConnection, fetchAccountIdFromPat(), fetchOtpWebsocketUrl(), getDerivAppId(), isPatToken(), parseDerivToken(), ParsedToken (+8 more)

### Community 3 - "devDependencies"
Cohesion: 0.05
Nodes (42): cross-env, eslint, eslint-config-next, @eslint/eslintrc, jsdom, devDependencies, cross-env, eslint (+34 more)

### Community 4 - "userService.js"
Cohesion: 0.10
Nodes (24): useModuleAccess(), ForgotPasswordModal(), LoginPage(), Home(), updateUserProfile(), checkToken(), getUser(), logout() (+16 more)

### Community 5 - "verifyAdminToken"
Cohesion: 0.13
Nodes (22): GET(), POST(), prisma, getOperations(), verifyAdminToken(), OperationsPage(), OperationWithUser, createModule() (+14 more)

### Community 6 - "compilerOptions"
Cohesion: 0.07
Nodes (29): dom, dom.iterable, esnext, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules, **/*.ts (+21 more)

### Community 7 - "WsListener"
Cohesion: 0.14
Nodes (3): WsListener, ContractInfo, DurationInfo

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
Cohesion: 0.19
Nodes (11): AccountInfo, DerivEventMap, PendingRequest, TokenData, UserInfo, BearBotUltra(), Market, MARKETS (+3 more)

### Community 13 - "bearBotUltra.test.tsx"
Cohesion: 0.20
Nodes (9): localStorageMock, mockExtractLastDigit, mockGetStorageDerivAccount, mockOn, mockRemoveById, mockSend, mockSubscribe, mockSwitchAccount (+1 more)

### Community 14 - "dependencies"
Cohesion: 0.22
Nodes (9): axios, dependencies, axios, @prisma/client, react-dom, @tensorflow/tfjs, @prisma/client, react-dom (+1 more)

### Community 16 - "buyTable.tsx"
Cohesion: 0.28
Nodes (5): saveOperation(), HistoryPage(), BuyTable(), BuyTableProps, MarkupStatisticsReport()

### Community 17 - "useAuth"
Cohesion: 0.46
Nodes (4): useAuth(), HomePage(), ProfilePage(), MarkupStatisticsPage()

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

## Knowledge Gaps
- **165 isolated node(s):** `__filename`, `__dirname`, `compat`, `eslintConfig`, `paths` (+160 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **39 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `DerivService` connect `DerivService` to `TicksTest.tsx`, `DerivService.tsx`, `buyTable.tsx`, `Observer`, `MarkupStatisticsReport.tsx`?**
  _High betweenness centrality (0.053) - this node is a cross-community bridge._
- **Why does `CopyTradingService` connect `CopyTradingService` to `TradeExecutor`, `WsListener`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **Why does `dependencies` connect `dependencies` to `devDependencies`, `bcryptjs`, `date-fns`, `@deriv/deriv-api`, `@heroicons/react`, `jose`, `json-rules-engine`, `jsonwebtoken`, `lucide-react`, `moment`, `mysql2`, `next`, `nextjs`, `query-string`, `react`, `react-icons`, `react-toastify`, `resend`, `@tensorflow/tfjs-backend-cpu`, `@tensorflow/tfjs-backend-webgl`, `@tensorflow/tfjs-converter`, `@types/react-dom`, `typescript`, `uuid`, `ws`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **What connects `__filename`, `__dirname`, `compat` to the rest of the system?**
  _165 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `DerivService` be split into smaller, more focused modules?**
  _Cohesion score 0.06522522522522523 - nodes in this community are weakly interconnected._
- **Should `CopyTradingService` be split into smaller, more focused modules?**
  _Cohesion score 0.05520614954577219 - nodes in this community are weakly interconnected._
- **Should `TradeExecutor` be split into smaller, more focused modules?**
  _Cohesion score 0.0815686274509804 - nodes in this community are weakly interconnected._