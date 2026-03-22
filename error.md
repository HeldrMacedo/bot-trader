❌ [EXTRACT DIGIT] Erro ao extrair último dígito: ReferenceError: CONFIG is not defined
    at new DerivMarketData (deriv-market-data.js…1774124805637:25:31)
    at getMarketDataInstance (deriv-market-data.js…74124805637:2903:25)
    at TradeManager.extractLastDigit (trade-manager.js?v=1774124808991:5080:32)
    at TradeManager.determineDigitOverResult (trade-manager.js?v=1774124808991:5943:28)
    at TradeManager.determineTradeResult (trade-manager.js?v=1774124808991:5844:29)
    at TradeManager.executeSimulatedTrade (trade-manager.js?v=1774124808991:3199:32)
    at async TradeManager.executeTrade (trade-manager.js?v=1774124808991:2962:34)
extractLastDigit	@	trade-manager.js?v=1774124808991:5119
determineDigitOverResult	@	trade-manager.js?v=1774124808991:5943
determineTradeResult	@	trade-manager.js?v=1774124808991:5844
executeSimulatedTrade	@	trade-manager.js?v=1774124808991:3199
await in executeSimulatedTrade		
executeTrade	@	trade-manager.js?v=1774124808991:2962
TradeMindPro.useEffect.startMonitoring	@	page.tsx:256
setTranslatedRules	@	Monitoring.ts:956
handleTick	@	Monitoring.ts:507
(anonymous)	@	Monitoring.ts:461
(anonymous)	@	simpleObserver.ts:21
emit	@	simpleObserver.ts:19
handleMessage	@	DerivService.tsx:446
(anonymous)	@	DerivService.tsx:395
