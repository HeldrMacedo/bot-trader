Download the React DevTools for a better development experience: https://react.dev/link/react-devtools
forward-logs-shared.ts:95 [HMR] connected
page.tsx:145 authenticate response  Promise {<pending>}
LegacyBridge.ts:94 [LegacyBridge] Iniciando carregamento de scripts legados...
LegacyBridge.ts:166 [LegacyBridge] Todos os scripts legados carregados com sucesso.
LegacyBridge.ts:200 [LegacyBridge] Interceptador de StopMonitor configurado.
LegacyBridge.ts:224 [LegacyBridge] tradeManager instance not found for ModeChange interceptor.

[TradeManager] Config carregada do trade_config_full (sistema migrado): trade-manager.js?v=1774813486979:538 
{
    "duration": 1,
    "durationUnit": "t",
    "stake": 0.4,
    "goal": 1,
    "stopLoss": 100,
    "realWinsLimit": 5,
    "realLossesLimit": 5,
    "simulatedLossesLimit": 0,
    "simulatedWinsLimit": 0,
    "prediction": {
        "type": "prediction",
        "value": "5"
    },
    "symbol": "R_10",
    "galeAdjustment": 1,
    "galeSplit": 1,
    "galeSplitThreshold": 0,
    "galeActive": true,
    "tradeLimit": 0,
    "cooldownPeriod": 3,
    "sorosLimit": 0,
    "sorosPercentage": 100,
    "galeRemovesSoros": false,
    "countRepeated": false,
    "contractType": "DIGITOVER",
    "barrier": "+1"
}

trade-manager.js?v=1774813486979:538 [TradeManager] Config carregada do trade_config_full (sistema migrado): 
{
    "duration": 1,
    "durationUnit": "t",
    "stake": 0.4,
    "goal": 1,
    "stopLoss": 100,
    "realWinsLimit": 5,
    "realLossesLimit": 5,
    "simulatedLossesLimit": 0,
    "simulatedWinsLimit": 0,
    "prediction": {
        "type": "prediction",
        "value": 5
    },
    "symbol": "R_10",
    "galeAdjustment": 1,
    "galeSplit": 1,
    "galeSplitThreshold": 0,
    "galeActive": true,
    "tradeLimit": 0,
    "cooldownPeriod": 3,
    "sorosLimit": 0,
    "sorosPercentage": 100,
    "galeRemovesSoros": false,
    "countRepeated": false,
    "contractType": "DIGITOVER",
    "barrier": "+1"
}

[LegacyBridge] Modo inicial definido: VIRTUAL LegacyBridge.ts:510 
[LegacyBridge] TradeManager configurado: LegacyBridge.ts:521
{
    "symbol": "R_10",
    "contractType": "DIGITOVER",
    "duration": 1,
    "durationUnit": "t",
    "prediction": {
        "type": "prediction",
        "value": 5
    },
    "barrier": "+1",
    "stake": 0.4,
    "galeActive": false,
    "galeAdjustment": 1,
    "galeSplit": 1,
    "galeSplitThreshold": 0,
    "cooldownPeriod": 3,
    "sorosLimit": 0,
    "sorosPercentage": 100,
    "galeRemovesSoros": false,
    "realWinsLimit": 5,
    "realLossesLimit": 5,
    "simulatedWinsLimit": 0,
    "simulatedLossesLimit": 0,
    "goal": 1,
    "stopLoss": 100
}

trade-manager.js?v=1774813486979:538 [TradeManager] Config carregada do trade_config_full (sistema migrado):
{
    "duration": 1,
    "durationUnit": "t",
    "stake": 0.4,
    "goal": 1,
    "stopLoss": 100,
    "realWinsLimit": 5,
    "realLossesLimit": 5,
    "simulatedLossesLimit": 0,
    "simulatedWinsLimit": 0,
    "prediction": {
        "type": "prediction",
        "value": "5"
    },
    "symbol": "R_10",
    "galeAdjustment": 1,
    "galeSplit": 1,
    "galeSplitThreshold": 0,
    "galeActive": true,
    "tradeLimit": 0,
    "cooldownPeriod": 3,
    "sorosLimit": 0,
    "sorosPercentage": 100,
    "galeRemovesSoros": false,
    "countRepeated": false,
    "contractType": "DIGITOVER",
    "barrier": "+1"
}

[trade_risk] ⚙️ Configuração de Risco atualizada. Threshold: $0
[trade_manager] 🎰 [EXECUTE REAL] Stake Final: 0.4
[trade_manager] 💰 P&L Sessão Atualizado: 0.55 (Lucro trade: 0.55)
[trade_risk] 💰 Vitória REAL - streak: 1
LegacyBridge.ts:353 [trade_manager] 🎰 [EXECUTE REAL] Stake Final: 0.4
LegacyBridge.ts:353 [trade_manager] 💰 P&L Sessão Atualizado: 0.15 (Lucro trade: -0.40)
LegacyBridge.ts:353 [trade_risk] 💰 Perda REAL - streak: 1
LegacyBridge.ts:353 [trade_risk]   - Valor da perda: 0.4000
[trade_risk]   - Perdas acumuladas: 0.4000 LegacyBridge.ts:353
[trade_risk] 🎰 [GALE SERÁ ACIONADO] Próximo trade usará Gale com total acumulado de $0.4000
TradeModeRiskController.js?v=1774813486126:143 IsCalculatingGale  false
this.config TradeModeRiskController.js?v=1774813486126:144 
{
    "duration": 1,
    "durationUnit": "t",
    "stake": 0.4,
    "goal": 1,
    "stopLoss": 100,
    "realWinsLimit": 5,
    "realLossesLimit": 5,
    "simulatedLossesLimit": 0,
    "simulatedWinsLimit": 0,
    "prediction": {
        "type": "prediction",
        "value": 5
    },
    "symbol": "R_10",
    "galeAdjustment": 1,
    "galeSplit": 1,
    "galeSplitThreshold": 0,
    "galeActive": true,
    "tradeLimit": 0,
    "cooldownPeriod": 3,
    "sorosLimit": 0,
    "sorosPercentage": 100,
    "galeRemovesSoros": false,
    "countRepeated": false,
    "contractType": "DIGITOVER",
    "barrier": "+1"
}

LegacyBridge.ts:357 [trade_risk] 🎰 [CÁLCULO GALE DETALHADO] ============================================
warn @ forward-logs-shared.ts:95
warn @ LegacyBridge.ts:357
calculateGaleStake @ TradeModeRiskController.js?v=1774813486126:296
monitorContractResult @ trade-manager.js?v=1774813486979:4841
await in monitorContractResult
executeRealTrade @ trade-manager.js?v=1774813486979:4389
await in executeRealTrade
executeTrade @ trade-manager.js?v=1774813486979:3028
TradeMindPro.useEffect.startMonitoring @ page.tsx:288
setTranslatedRules @ Monitoring.ts:1029
handleTick @ Monitoring.ts:521
(anonymous) @ Monitoring.ts:468
(anonymous) @ simpleObserver.ts:21
emit @ simpleObserver.ts:19
handleMessage @ DerivService.tsx:446
(anonymous) @ DerivService.tsx:395
LegacyBridge.ts:357 [trade_risk] 🎰 Motivo: 1 perda(s) real(is) consecutiva(s) detectada(s)
warn @ forward-logs-shared.ts:95
warn @ LegacyBridge.ts:357
calculateGaleStake @ TradeModeRiskController.js?v=1774813486126:297
monitorContractResult @ trade-manager.js?v=1774813486979:4841
await in monitorContractResult
executeRealTrade @ trade-manager.js?v=1774813486979:4389
await in executeRealTrade
executeTrade @ trade-manager.js?v=1774813486979:3028
TradeMindPro.useEffect.startMonitoring @ page.tsx:288
setTranslatedRules @ Monitoring.ts:1029
handleTick @ Monitoring.ts:521
(anonymous) @ Monitoring.ts:468
(anonymous) @ simpleObserver.ts:21
emit @ simpleObserver.ts:19
handleMessage @ DerivService.tsx:446
(anonymous) @ DerivService.tsx:395
LegacyBridge.ts:357 [trade_risk] 🎰 Perdas Acumuladas: $0.4000
warn @ forward-logs-shared.ts:95
warn @ LegacyBridge.ts:357
calculateGaleStake @ TradeModeRiskController.js?v=1774813486126:298
monitorContractResult @ trade-manager.js?v=1774813486979:4841
await in monitorContractResult
executeRealTrade @ trade-manager.js?v=1774813486979:4389
await in executeRealTrade
executeTrade @ trade-manager.js?v=1774813486979:3028
TradeMindPro.useEffect.startMonitoring @ page.tsx:288
setTranslatedRules @ Monitoring.ts:1029
handleTick @ Monitoring.ts:521
(anonymous) @ Monitoring.ts:468
(anonymous) @ simpleObserver.ts:21
emit @ simpleObserver.ts:19
handleMessage @ DerivService.tsx:446
(anonymous) @ DerivService.tsx:395
LegacyBridge.ts:357 [trade_risk] 🎰 Fator Split: 1x (Wins pendentes: 0)
warn @ forward-logs-shared.ts:95
warn @ LegacyBridge.ts:357
calculateGaleStake @ TradeModeRiskController.js?v=1774813486126:299
monitorContractResult @ trade-manager.js?v=1774813486979:4841
await in monitorContractResult
executeRealTrade @ trade-manager.js?v=1774813486979:4389
await in executeRealTrade
executeTrade @ trade-manager.js?v=1774813486979:3028
TradeMindPro.useEffect.startMonitoring @ page.tsx:288
setTranslatedRules @ Monitoring.ts:1029
handleTick @ Monitoring.ts:521
(anonymous) @ Monitoring.ts:468
(anonymous) @ simpleObserver.ts:21
emit @ simpleObserver.ts:19
handleMessage @ DerivService.tsx:446
(anonymous) @ DerivService.tsx:395
LegacyBridge.ts:357 [trade_risk] 🎰 Cálculo Base: ($0.4000 / (2.3750-1)) × 1
warn @ forward-logs-shared.ts:95
warn @ LegacyBridge.ts:357
calculateGaleStake @ TradeModeRiskController.js?v=1774813486126:300
monitorContractResult @ trade-manager.js?v=1774813486979:4841
await in monitorContractResult
executeRealTrade @ trade-manager.js?v=1774813486979:4389
await in executeRealTrade
executeTrade @ trade-manager.js?v=1774813486979:3028
TradeMindPro.useEffect.startMonitoring @ page.tsx:288
setTranslatedRules @ Monitoring.ts:1029
handleTick @ Monitoring.ts:521
(anonymous) @ Monitoring.ts:468
(anonymous) @ simpleObserver.ts:21
emit @ simpleObserver.ts:19
handleMessage @ DerivService.tsx:446
(anonymous) @ DerivService.tsx:395
LegacyBridge.ts:357 [trade_risk] 🎰 Valor Final: $0.35 (Min $0.35) | Payout: 2.375 (Real)
warn @ forward-logs-shared.ts:95
warn @ LegacyBridge.ts:357
calculateGaleStake @ TradeModeRiskController.js?v=1774813486126:302
monitorContractResult @ trade-manager.js?v=1774813486979:4841
await in monitorContractResult
executeRealTrade @ trade-manager.js?v=1774813486979:4389
await in executeRealTrade
executeTrade @ trade-manager.js?v=1774813486979:3028
TradeMindPro.useEffect.startMonitoring @ page.tsx:288
setTranslatedRules @ Monitoring.ts:1029
handleTick @ Monitoring.ts:521
(anonymous) @ Monitoring.ts:468
(anonymous) @ simpleObserver.ts:21
emit @ simpleObserver.ts:19
handleMessage @ DerivService.tsx:446
(anonymous) @ DerivService.tsx:395
LegacyBridge.ts:357 [trade_risk] 🎰 ================================================================
warn @ forward-logs-shared.ts:95
warn @ LegacyBridge.ts:357
calculateGaleStake @ TradeModeRiskController.js?v=1774813486126:303
monitorContractResult @ trade-manager.js?v=1774813486979:4841
await in monitorContractResult
executeRealTrade @ trade-manager.js?v=1774813486979:4389
await in executeRealTrade
executeTrade @ trade-manager.js?v=1774813486979:3028
TradeMindPro.useEffect.startMonitoring @ page.tsx:288
setTranslatedRules @ Monitoring.ts:1029
handleTick @ Monitoring.ts:521
(anonymous) @ Monitoring.ts:468
(anonymous) @ simpleObserver.ts:21
emit @ simpleObserver.ts:19
handleMessage @ DerivService.tsx:446
(anonymous) @ DerivService.tsx:395
riskController  trade-manager.js?v=1774813486979:4933
{
    "sessionId": "VRTC12422137",
    "config": {
        "duration": 1,
        "durationUnit": "t",
        "stake": 0.4,
        "goal": 1,
        "stopLoss": 100,
        "realWinsLimit": 5,
        "realLossesLimit": 5,
        "simulatedLossesLimit": 0,
        "simulatedWinsLimit": 0,
        "prediction": {
            "type": "prediction",
            "value": 5
        },
        "symbol": "R_10",
        "galeAdjustment": 1,
        "galeSplit": 1,
        "galeSplitThreshold": 0,
        "galeActive": true,
        "tradeLimit": 0,
        "cooldownPeriod": 3,
        "sorosLimit": 0,
        "sorosPercentage": 100,
        "galeRemovesSoros": false,
        "countRepeated": false,
        "contractType": "DIGITOVER",
        "barrier": "+1"
    },
    "currentMode": "VIRTUAL",
    "realWinsStreak": 0,
    "realLossesStreak": 2,
    "simulatedLossesStreak": 0,
    "simulatedWinsStreak": 0,
    "_accumulatedLosses": 0.75,
    "currentProposalPayout": 2.3714285714285714,
    "lastCalculatedStake": null,
    "lastRealGaleValue": 0.546875,
    "pendingGaleApplication": false,
    "sessionProfitLoss": 0,
    "initialBalance": 0,
    "pendingSplitWins": 0,
    "lastCalculatedStakeSplitted": null,
    "lastRealTradeWasLoss": true,
    "splitGaleJustCompleted": false,
    "pendingModeTransition": null,
    "pendingModeProcessing": null,
    "popupShown": false,
    "tradeReal": false,
    "isCalculatingGale": false,
    "lastExecutedContractType": "DIGITOVER",
    "processedContractIds": {}
}

TradeModeRiskController.js?v=1774813486126:143 IsCalculatingGale  false
TradeModeRiskController.js?v=1774813486126:144 this.config  

{
    "duration": 1,
    "durationUnit": "t",
    "stake": 0.4,
    "goal": 1,
    "stopLoss": 100,
    "realWinsLimit": 5,
    "realLossesLimit": 5,
    "simulatedLossesLimit": 0,
    "simulatedWinsLimit": 0,
    "prediction": {
        "type": "prediction",
        "value": 5
    },
    "symbol": "R_10",
    "galeAdjustment": 1,
    "galeSplit": 1,
    "galeSplitThreshold": 0,
    "galeActive": true,
    "tradeLimit": 0,
    "cooldownPeriod": 3,
    "sorosLimit": 0,
    "sorosPercentage": 100,
    "galeRemovesSoros": false,
    "countRepeated": false,
    "contractType": "DIGITOVER",
    "barrier": "+1"
}

TradeModeRiskControl…v=1774813486126:145 lastCalculatedStake  null

LegacyBridge.ts:357 [trade_risk] 🎰 [CÁLCULO GALE DETALHADO] ============================================
warn @ forward-logs-shared.ts:95
warn @ LegacyBridge.ts:357
calculateGaleStake @ TradeModeRiskController.js?v=1774813486126:296
calculateGaleStake @ trade-manager.js?v=1774813486979:4940
executeRealTrade @ trade-manager.js?v=1774813486979:4230
executeTrade @ trade-manager.js?v=1774813486979:3028
TradeMindPro.useEffect.startMonitoring @ page.tsx:288
setTranslatedRules @ Monitoring.ts:1029
handleTick @ Monitoring.ts:521
(anonymous) @ Monitoring.ts:468
(anonymous) @ simpleObserver.ts:21
emit @ simpleObserver.ts:19
handleMessage @ DerivService.tsx:446
(anonymous) @ DerivService.tsx:395
LegacyBridge.ts:357 [trade_risk] 🎰 Motivo: 1 perda(s) real(is) consecutiva(s) detectada(s)
warn @ forward-logs-shared.ts:95
warn @ LegacyBridge.ts:357
calculateGaleStake @ TradeModeRiskController.js?v=1774813486126:297
calculateGaleStake @ trade-manager.js?v=1774813486979:4940
executeRealTrade @ trade-manager.js?v=1774813486979:4230
executeTrade @ trade-manager.js?v=1774813486979:3028
TradeMindPro.useEffect.startMonitoring @ page.tsx:288
setTranslatedRules @ Monitoring.ts:1029
handleTick @ Monitoring.ts:521
(anonymous) @ Monitoring.ts:468
(anonymous) @ simpleObserver.ts:21
emit @ simpleObserver.ts:19
handleMessage @ DerivService.tsx:446
(anonymous) @ DerivService.tsx:395
LegacyBridge.ts:357 [trade_risk] 🎰 Perdas Acumuladas: $0.4000
warn @ forward-logs-shared.ts:95
warn @ LegacyBridge.ts:357
calculateGaleStake @ TradeModeRiskController.js?v=1774813486126:298
calculateGaleStake @ trade-manager.js?v=1774813486979:4940
executeRealTrade @ trade-manager.js?v=1774813486979:4230
executeTrade @ trade-manager.js?v=1774813486979:3028
TradeMindPro.useEffect.startMonitoring @ page.tsx:288
setTranslatedRules @ Monitoring.ts:1029
handleTick @ Monitoring.ts:521
(anonymous) @ Monitoring.ts:468
(anonymous) @ simpleObserver.ts:21
emit @ simpleObserver.ts:19
handleMessage @ DerivService.tsx:446
(anonymous) @ DerivService.tsx:395
LegacyBridge.ts:357 [trade_risk] 🎰 Fator Split: 1x (Wins pendentes: 0)
warn @ forward-logs-shared.ts:95
warn @ LegacyBridge.ts:357
calculateGaleStake @ TradeModeRiskController.js?v=1774813486126:299
calculateGaleStake @ trade-manager.js?v=1774813486979:4940
executeRealTrade @ trade-manager.js?v=1774813486979:4230
executeTrade @ trade-manager.js?v=1774813486979:3028
TradeMindPro.useEffect.startMonitoring @ page.tsx:288
setTranslatedRules @ Monitoring.ts:1029
handleTick @ Monitoring.ts:521
(anonymous) @ Monitoring.ts:468
(anonymous) @ simpleObserver.ts:21
emit @ simpleObserver.ts:19
handleMessage @ DerivService.tsx:446
(anonymous) @ DerivService.tsx:395
LegacyBridge.ts:357 [trade_risk] 🎰 Cálculo Base: ($0.4000 / (2.3750-1)) × 1
warn @ forward-logs-shared.ts:95
warn @ LegacyBridge.ts:357
calculateGaleStake @ TradeModeRiskController.js?v=1774813486126:300
calculateGaleStake @ trade-manager.js?v=1774813486979:4940
executeRealTrade @ trade-manager.js?v=1774813486979:4230
executeTrade @ trade-manager.js?v=1774813486979:3028
TradeMindPro.useEffect.startMonitoring @ page.tsx:288
setTranslatedRules @ Monitoring.ts:1029
handleTick @ Monitoring.ts:521
(anonymous) @ Monitoring.ts:468
(anonymous) @ simpleObserver.ts:21
emit @ simpleObserver.ts:19
handleMessage @ DerivService.tsx:446
(anonymous) @ DerivService.tsx:395
LegacyBridge.ts:357 [trade_risk] 🎰 Valor Final: $0.35 (Min $0.35) | Payout: 2.375 (Real)
warn @ forward-logs-shared.ts:95
warn @ LegacyBridge.ts:357
calculateGaleStake @ TradeModeRiskController.js?v=1774813486126:302
calculateGaleStake @ trade-manager.js?v=1774813486979:4940
executeRealTrade @ trade-manager.js?v=1774813486979:4230
executeTrade @ trade-manager.js?v=1774813486979:3028
TradeMindPro.useEffect.startMonitoring @ page.tsx:288
setTranslatedRules @ Monitoring.ts:1029
handleTick @ Monitoring.ts:521
(anonymous) @ Monitoring.ts:468
(anonymous) @ simpleObserver.ts:21
emit @ simpleObserver.ts:19
handleMessage @ DerivService.tsx:446
(anonymous) @ DerivService.tsx:395
LegacyBridge.ts:357 [trade_risk] 🎰 ================================================================
warn @ forward-logs-shared.ts:95
warn @ LegacyBridge.ts:357
calculateGaleStake @ TradeModeRiskController.js?v=1774813486126:303
calculateGaleStake @ trade-manager.js?v=1774813486979:4940
executeRealTrade @ trade-manager.js?v=1774813486979:4230
executeTrade @ trade-manager.js?v=1774813486979:3028
TradeMindPro.useEffect.startMonitoring @ page.tsx:288
setTranslatedRules @ Monitoring.ts:1029
handleTick @ Monitoring.ts:521
(anonymous) @ Monitoring.ts:468
(anonymous) @ simpleObserver.ts:21
emit @ simpleObserver.ts:19
handleMessage @ DerivService.tsx:446
(anonymous) @ DerivService.tsx:395
trade-manager.js?v=1774813486979:4231 this.nextTradeStake 0.35
[trade_manager] 🎰 [PROATIVO] Stake ajustada para DIGITOVER em executeRealTrade: 0.35
LegacyBridge.ts:353 [trade_manager] 🎰 [EXECUTE REAL] Stake Final: 0.35
LegacyBridge.ts:353 [trade_manager] 💰 P&L Sessão Atualizado: -0.20 (Lucro trade: -0.35)
LegacyBridge.ts:353 [trade_risk] 💰 Perda REAL - streak: 2
LegacyBridge.ts:353 [trade_risk]   - Valor da perda: 0.3500
LegacyBridge.ts:353 [trade_risk]   - Perdas acumuladas: 0.7500
LegacyBridge.ts:357 [trade_risk] 🎰 [GALE SERÁ ACIONADO] Próximo trade usará Gale com total acumulado de $0.7500
warn @ forward-logs-shared.ts:95
warn @ LegacyBridge.ts:357
handleRealResult @ TradeModeRiskController.js?v=1774813486126:491
processRealTradeResult @ trade-manager.js?v=1774813486979:2082
handleTradeResult @ trade-manager.js?v=1774813486979:1850
monitorContractResult @ trade-manager.js?v=1774813486979:4822
await in monitorContractResult
executeRealTrade @ trade-manager.js?v=1774813486979:4389
await in executeRealTrade
executeTrade @ trade-manager.js?v=1774813486979:3028
TradeMindPro.useEffect.startMonitoring @ page.tsx:288
setTranslatedRules @ Monitoring.ts:1029
handleTick @ Monitoring.ts:521
(anonymous) @ Monitoring.ts:468
(anonymous) @ simpleObserver.ts:21
emit @ simpleObserver.ts:19
handleMessage @ DerivService.tsx:446
(anonymous) @ DerivService.tsx:395
TradeModeRiskController.js?v=1774813486126:143 IsCalculatingGale  false
TradeModeRiskController.js?v=1774813486126:144 this.config  {
    "duration": 1,
    "durationUnit": "t",
    "stake": 0.4,
    "goal": 1,
    "stopLoss": 100,
    "realWinsLimit": 5,
    "realLossesLimit": 5,
    "simulatedLossesLimit": 0,
    "simulatedWinsLimit": 0,
    "prediction": {
        "type": "prediction",
        "value": 5
    },
    "symbol": "R_10",
    "galeAdjustment": 1,
    "galeSplit": 1,
    "galeSplitThreshold": 0,
    "galeActive": true,
    "tradeLimit": 0,
    "cooldownPeriod": 3,
    "sorosLimit": 0,
    "sorosPercentage": 100,
    "galeRemovesSoros": false,
    "countRepeated": false,
    "contractType": "DIGITOVER",
    "barrier": "+1"
}
lastCalculatedStake  null
LegacyBridge.ts:357 [trade_risk] 🎰 [CÁLCULO GALE DETALHADO] ============================================
warn @ forward-logs-shared.ts:95
warn @ LegacyBridge.ts:357
calculateGaleStake @ TradeModeRiskController.js?v=1774813486126:296
monitorContractResult @ trade-manager.js?v=1774813486979:4841
await in monitorContractResult
executeRealTrade @ trade-manager.js?v=1774813486979:4389
await in executeRealTrade
executeTrade @ trade-manager.js?v=1774813486979:3028
TradeMindPro.useEffect.startMonitoring @ page.tsx:288
setTranslatedRules @ Monitoring.ts:1029
handleTick @ Monitoring.ts:521
(anonymous) @ Monitoring.ts:468
(anonymous) @ simpleObserver.ts:21
emit @ simpleObserver.ts:19
handleMessage @ DerivService.tsx:446
(anonymous) @ DerivService.tsx:395
LegacyBridge.ts:357 [trade_risk] 🎰 Motivo: 2 perda(s) real(is) consecutiva(s) detectada(s)
warn @ forward-logs-shared.ts:95
warn @ LegacyBridge.ts:357
calculateGaleStake @ TradeModeRiskController.js?v=1774813486126:297
monitorContractResult @ trade-manager.js?v=1774813486979:4841
await in monitorContractResult
executeRealTrade @ trade-manager.js?v=1774813486979:4389
await in executeRealTrade
executeTrade @ trade-manager.js?v=1774813486979:3028
TradeMindPro.useEffect.startMonitoring @ page.tsx:288
setTranslatedRules @ Monitoring.ts:1029
handleTick @ Monitoring.ts:521
(anonymous) @ Monitoring.ts:468
(anonymous) @ simpleObserver.ts:21
emit @ simpleObserver.ts:19
handleMessage @ DerivService.tsx:446
(anonymous) @ DerivService.tsx:395
LegacyBridge.ts:357 [trade_risk] 🎰 Perdas Acumuladas: $0.7500
warn @ forward-logs-shared.ts:95
warn @ LegacyBridge.ts:357
calculateGaleStake @ TradeModeRiskController.js?v=1774813486126:298
monitorContractResult @ trade-manager.js?v=1774813486979:4841
await in monitorContractResult
executeRealTrade @ trade-manager.js?v=1774813486979:4389
await in executeRealTrade
executeTrade @ trade-manager.js?v=1774813486979:3028
TradeMindPro.useEffect.startMonitoring @ page.tsx:288
setTranslatedRules @ Monitoring.ts:1029
handleTick @ Monitoring.ts:521
(anonymous) @ Monitoring.ts:468
(anonymous) @ simpleObserver.ts:21
emit @ simpleObserver.ts:19
handleMessage @ DerivService.tsx:446
(anonymous) @ DerivService.tsx:395
LegacyBridge.ts:357 [trade_risk] 🎰 Fator Split: 1x (Wins pendentes: 0)
warn @ forward-logs-shared.ts:95
warn @ LegacyBridge.ts:357
calculateGaleStake @ TradeModeRiskController.js?v=1774813486126:299
monitorContractResult @ trade-manager.js?v=1774813486979:4841
await in monitorContractResult
executeRealTrade @ trade-manager.js?v=1774813486979:4389
await in executeRealTrade
executeTrade @ trade-manager.js?v=1774813486979:3028
TradeMindPro.useEffect.startMonitoring @ page.tsx:288
setTranslatedRules @ Monitoring.ts:1029
handleTick @ Monitoring.ts:521
(anonymous) @ Monitoring.ts:468
(anonymous) @ simpleObserver.ts:21
emit @ simpleObserver.ts:19
handleMessage @ DerivService.tsx:446
(anonymous) @ DerivService.tsx:395
LegacyBridge.ts:357 [trade_risk] 🎰 Cálculo Base: ($0.7500 / (2.3714-1)) × 1
warn @ forward-logs-shared.ts:95
warn @ LegacyBridge.ts:357
calculateGaleStake @ TradeModeRiskController.js?v=1774813486126:300
monitorContractResult @ trade-manager.js?v=1774813486979:4841
await in monitorContractResult
executeRealTrade @ trade-manager.js?v=1774813486979:4389
await in executeRealTrade
executeTrade @ trade-manager.js?v=1774813486979:3028
TradeMindPro.useEffect.startMonitoring @ page.tsx:288
setTranslatedRules @ Monitoring.ts:1029
handleTick @ Monitoring.ts:521
(anonymous) @ Monitoring.ts:468
(anonymous) @ simpleObserver.ts:21
emit @ simpleObserver.ts:19
handleMessage @ DerivService.tsx:446
(anonymous) @ DerivService.tsx:395
LegacyBridge.ts:357 [trade_risk] 🎰 Valor Final: $0.55 (Min $0.35) | Payout: 2.371 (Real)
warn @ forward-logs-shared.ts:95
warn @ LegacyBridge.ts:357
calculateGaleStake @ TradeModeRiskController.js?v=1774813486126:302
monitorContractResult @ trade-manager.js?v=1774813486979:4841
await in monitorContractResult
executeRealTrade @ trade-manager.js?v=1774813486979:4389
await in executeRealTrade
executeTrade @ trade-manager.js?v=1774813486979:3028
TradeMindPro.useEffect.startMonitoring @ page.tsx:288
setTranslatedRules @ Monitoring.ts:1029
handleTick @ Monitoring.ts:521
(anonymous) @ Monitoring.ts:468
(anonymous) @ simpleObserver.ts:21
emit @ simpleObserver.ts:19
handleMessage @ DerivService.tsx:446
(anonymous) @ DerivService.tsx:395
LegacyBridge.ts:357 [trade_risk] 🎰 ================================================================
warn @ forward-logs-shared.ts:95
warn @ LegacyBridge.ts:357
calculateGaleStake @ TradeModeRiskController.js?v=1774813486126:303
monitorContractResult @ trade-manager.js?v=1774813486979:4841
await in monitorContractResult
executeRealTrade @ trade-manager.js?v=1774813486979:4389
await in executeRealTrade
executeTrade @ trade-manager.js?v=1774813486979:3028
TradeMindPro.useEffect.startMonitoring @ page.tsx:288
setTranslatedRules @ Monitoring.ts:1029
handleTick @ Monitoring.ts:521
(anonymous) @ Monitoring.ts:468
(anonymous) @ simpleObserver.ts:21
emit @ simpleObserver.ts:19
handleMessage @ DerivService.tsx:446
(anonymous) @ DerivService.tsx:395



29/03/2026, 17:09:18	R_10	DIGITOVER	5	5073.635	0.35	LOSS	-0.35	REAL
29/03/2026, 17:09:08	R_10	DIGITOVER	5	5072.951	0.4	LOSS	-0.4	REAL
29/03/2026, 17:08:58	R_10	DIGITOVER	5	5073.168	0.4	WIN	+0.55	REAL
