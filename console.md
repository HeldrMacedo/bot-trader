testLosingDigitsAsX  OXOX, [
    6,
    8,
    9,
    7
],
[
    2
],
{
    "totalLength": 4,
    "xPositions": [
        1,
        3
    ],
    "oPositions": [
        0,
        2
    ],
    "xCount": 2,
    "oCount": 2,
    "originalPattern": "OXOX"
},
DIGITDIFF

testLosingDigitsAsX  XXOX, [
    8,
    9,
    7,
    0
],
[
    2
],
{
    "totalLength": 4,
    "xPositions": [
        0,
        1,
        3
    ],
    "oPositions": [
        2
    ],
    "xCount": 3,
    "oCount": 1,
    "originalPattern": "XXOX"
},
DIGITDIFF





gemini-ai.js?v=1775837116734:230 localMatch: null
gemini-ai.js?v=1775837116734:252 Regra não reconhecida localmente. Enviando para IA...'
gemini-ai.js?v=1775837116734:1459 📡 [GEMINI-1775837165621-o18p] Enviando requisição para /api/gemini: {modelId: 'gemini-2.5-pro', promptPreview: '\nSISTEMA DE TRADUÇÃO E VALIDAÇÃO DE ESTRATÉGIAS DE…DING\n\nVocê deve traduzir estratégias de tradin...'}
forward-logs-shared.ts:95 [Fast Refresh] rebuilding
forward-logs-shared.ts:95 [Fast Refresh] done in 542ms
digit-pattern-rules.js?v=1775837114943:515 ❌ [TEST LOSING DIGITS FLEXIBLE] Erro: ReferenceError: losingDigits is not defined
    at DigitPatternRulesProcessor.testDigitAsX (digit-pattern-rules.js?v=1775837114943:525:55)
    at DigitPatternRulesProcessor.testLosingDigitsAsX (digit-pattern-rules.js?v=1775837114943:488:33)
    at DigitPatternRulesProcessor.verifyPatternMatch (digit-pattern-rules.js?v=1775837114943:378:25)
    at DigitPatternRulesProcessor.analyzeDigitPattern (digit-pattern-rules.js?v=1775837114943:268:33)
    at DigitPatternRulesProcessor.processDigitPatternRule (digit-pattern-rules.js?v=1775837114943:54:33)
    at FormatGenerator.checkRuleCondition (generate-format.js?v=1775837116221:2044:66)
    at MonitoringService.checkRuleCondition (Monitoring.ts:822:30)
    at Monitoring.ts:1032:44
    at Array.forEach (<anonymous>)
    at Monitoring.ts:1024:23
    at Array.forEach (<anonymous>)
    at MonitoringService.setTranslatedRules (Monitoring.ts:1015:30)
    at handleAiMessage (page.tsx:441:31)
error @ intercept-console-error.ts:42
testLosingDigitsAsX @ digit-pattern-rules.js?v=1775837114943:515
verifyPatternMatch @ digit-pattern-rules.js?v=1775837114943:378
analyzeDigitPattern @ digit-pattern-rules.js?v=1775837114943:268
processDigitPatternRule @ digit-pattern-rules.js?v=1775837114943:54
checkRuleCondition @ generate-format.js?v=1775837116221:2044
checkRuleCondition @ Monitoring.ts:822
(anonymous) @ Monitoring.ts:1032
(anonymous) @ Monitoring.ts:1024
setTranslatedRules @ Monitoring.ts:1015
handleAiMessage @ page.tsx:441
digit-pattern-rules.js?v=1775837114943:515 ❌ [TEST LOSING DIGITS FLEXIBLE] Erro: ReferenceError: losingDigits is not defined
    at DigitPatternRulesProcessor.testDigitAsX (digit-pattern-rules.js?v=1775837114943:525:55)
    at DigitPatternRulesProcessor.testLosingDigitsAsX (digit-pattern-rules.js?v=1775837114943:488:33)
    at DigitPatternRulesProcessor.verifyPatternMatch (digit-pattern-rules.js?v=1775837114943:378:25)
    at DigitPatternRulesProcessor.analyzeDigitPattern (digit-pattern-rules.js?v=1775837114943:268:33)
    at DigitPatternRulesProcessor.processDigitPatternRule (digit-pattern-rules.js?v=1775837114943:54:33)
    at FormatGenerator.checkRuleCondition (generate-format.js?v=1775837116221:2044:66)
    at MonitoringService.checkRuleCondition (Monitoring.ts:822:30)
    at Monitoring.ts:1032:44
    at Array.forEach (<anonymous>)
    at Monitoring.ts:1024:23
    at Array.forEach (<anonymous>)
    at MonitoringService.setTranslatedRules (Monitoring.ts:1015:30)
    at handleAiMessage (page.tsx:441:31)
error @ intercept-console-error.ts:42
testLosingDigitsAsX @ digit-pattern-rules.js?v=1775837114943:515
verifyPatternMatch @ digit-pattern-rules.js?v=1775837114943:378
analyzeDigitPattern @ digit-pattern-rules.js?v=1775837114943:268
processDigitPatternRule @ digit-pattern-rules.js?v=1775837114943:54
checkRuleCondition @ generate-format.js?v=1775837116221:2044
checkRuleCondition @ Monitoring.ts:822
(anonymous) @ Monitoring.ts:1032
(anonymous) @ Monitoring.ts:1024
setTranslatedRules @ Monitoring.ts:1015
handleAiMessage @ page.tsx:441
digit-pattern-rules.js?v=1775837114943:515 ❌ [TEST LOSING DIGITS FLEXIBLE] Erro: ReferenceError: losingDigits is not defined
    at DigitPatternRulesProcessor.testDigitAsX (digit-pattern-rules.js?v=1775837114943:525:55)
    at DigitPatternRulesProcessor.testLosingDigitsAsX (digit-pattern-rules.js?v=1775837114943:488:33)
    at DigitPatternRulesProcessor.verifyPatternMatch (digit-pattern-rules.js?v=1775837114943:378:25)
    at DigitPatternRulesProcessor.analyzeDigitPattern (digit-pattern-rules.js?v=1775837114943:268:33)
    at DigitPatternRulesProcessor.processDigitPatternRule (digit-pattern-rules.js?v=1775837114943:54:33)
    at FormatGenerator.checkRuleCondition (generate-format.js?v=1775837116221:2044:66)
    at MonitoringService.checkRuleCondition (Monitoring.ts:822:30)
    at Monitoring.ts:1032:44
    at Array.forEach (<anonymous>)
    at Monitoring.ts:1024:23
    at Array.forEach (<anonymous>)
    at MonitoringService.setTranslatedRules (Monitoring.ts:1015:30)
    at MonitoringService.handleTick (Monitoring.ts:541:12)
    at Monitoring.ts:488:14
    at simpleObserver.ts:21:21
    at Map.forEach (<anonymous>)
    at Observer.emit (simpleObserver.ts:19:37)
    at DerivService.handleMessage (DerivService.tsx:446:23)
    at WebSocket.<anonymous> (DerivService.tsx:395:52)
error @ intercept-console-error.ts:42
testLosingDigitsAsX @ digit-pattern-rules.js?v=1775837114943:515
verifyPatternMatch @ digit-pattern-rules.js?v=1775837114943:378
analyzeDigitPattern @ digit-pattern-rules.js?v=1775837114943:268
processDigitPatternRule @ digit-pattern-rules.js?v=1775837114943:54
checkRuleCondition @ generate-format.js?v=1775837116221:2044
checkRuleCondition @ Monitoring.ts:822
(anonymous) @ Monitoring.ts:1032
(anonymous) @ Monitoring.ts:1024
setTranslatedRules @ Monitoring.ts:1015
handleTick @ Monitoring.ts:541
(anonymous) @ Monitoring.ts:488
(anonymous) @ simpleObserver.ts:21
emit @ simpleObserver.ts:19
handleMessage @ DerivService.tsx:446
(anonymous) @ DerivService.tsx:395
digit-pattern-rules.js?v=1775837114943:515 ❌ [TEST LOSING DIGITS FLEXIBLE] Erro: ReferenceError: losingDigits is not defined
    at DigitPatternRulesProcessor.testDigitAsX (digit-pattern-rules.js?v=1775837114943:525:55)
    at DigitPatternRulesProcessor.testLosingDigitsAsX (digit-pattern-rules.js?v=1775837114943:488:33)
    at DigitPatternRulesProcessor.verifyPatternMatch (digit-pattern-rules.js?v=1775837114943:378:25)
    at DigitPatternRulesProcessor.analyzeDigitPattern (digit-pattern-rules.js?v=1775837114943:268:33)
    at DigitPatternRulesProcessor.processDigitPatternRule (digit-pattern-rules.js?v=1775837114943:54:33)
    at FormatGenerator.checkRuleCondition (generate-format.js?v=1775837116221:2044:66)
    at MonitoringService.checkRuleCondition (Monitoring.ts:822:30)
    at Monitoring.ts:1032:44
    at Array.forEach (<anonymous>)
    at Monitoring.ts:1024:23
    at Array.forEach (<anonymous>)
    at MonitoringService.setTranslatedRules (Monitoring.ts:1015:30)
    at MonitoringService.handleTick (Monitoring.ts:541:12)
    at Monitoring.ts:488:14
    at simpleObserver.ts:21:21
    at Map.forEach (<anonymous>)
    at Observer.emit (simpleObserver.ts:19:37)
    at DerivService.handleMessage (DerivService.tsx:446:23)
    at WebSocket.<anonymous> (DerivService.tsx:395:52)
error @ intercept-console-error.ts:42
testLosingDigitsAsX @ digit-pattern-rules.js?v=1775837114943:515
verifyPatternMatch @ digit-pattern-rules.js?v=1775837114943:378
analyzeDigitPattern @ digit-pattern-rules.js?v=1775837114943:268
processDigitPatternRule @ digit-pattern-rules.js?v=1775837114943:54
checkRuleCondition @ generate-format.js?v=1775837116221:2044
checkRuleCondition @ Monitoring.ts:822
(anonymous) @ Monitoring.ts:1032
(anonymous) @ Monitoring.ts:1024
setTranslatedRules @ Monitoring.ts:1015
handleTick @ Monitoring.ts:541
(anonymous) @ Monitoring.ts:488
(anonymous) @ simpleObserver.ts:21
emit @ simpleObserver.ts:19
handleMessage @ DerivService.tsx:446
(anonymous) @ DerivService.tsx:395
digit-pattern-rules.js?v=1775837114943:515 ❌ [TEST LOSING DIGITS FLEXIBLE] Erro: ReferenceError: losingDigits is not defined
    at DigitPatternRulesProcessor.testDigitAsX (digit-pattern-rules.js?v=1775837114943:525:55)
    at DigitPatternRulesProcessor.testLosingDigitsAsX (digit-pattern-rules.js?v=1775837114943:488:33)
    at DigitPatternRulesProcessor.verifyPatternMatch (digit-pattern-rules.js?v=1775837114943:378:25)
    at DigitPatternRulesProcessor.analyzeDigitPattern (digit-pattern-rules.js?v=1775837114943:268:33)
    at DigitPatternRulesProcessor.processDigitPatternRule (digit-pattern-rules.js?v=1775837114943:54:33)
    at FormatGenerator.checkRuleCondition (generate-format.js?v=1775837116221:2044:66)
    at MonitoringService.checkRuleCondition (Monitoring.ts:822:30)
    at Monitoring.ts:1032:44
    at Array.forEach (<anonymous>)
    at Monitoring.ts:1024:23
    at Array.forEach (<anonymous>)
    at MonitoringService.setTranslatedRules (Monitoring.ts:1015:30)
    at MonitoringService.handleTick (Monitoring.ts:541:12)
    at Monitoring.ts:488:14
    at simpleObserver.ts:21:21
    at Map.forEach (<anonymous>)
    at Observer.emit (simpleObserver.ts:19:37)
    at DerivService.handleMessage (DerivService.tsx:446:23)
    at WebSocket.<anonymous> (DerivService.tsx:395:52)
error @ intercept-console-error.ts:42
testLosingDigitsAsX @ digit-pattern-rules.js?v=1775837114943:515
verifyPatternMatch @ digit-pattern-rules.js?v=1775837114943:378
analyzeDigitPattern @ digit-pattern-rules.js?v=1775837114943:268
processDigitPatternRule @ digit-pattern-rules.js?v=1775837114943:54
checkRuleCondition @ generate-format.js?v=1775837116221:2044
checkRuleCondition @ Monitoring.ts:822
(anonymous) @ Monitoring.ts:1032
(anonymous) @ Monitoring.ts:1024
setTranslatedRules @ Monitoring.ts:1015
handleTick @ Monitoring.ts:541
(anonymous) @ Monitoring.ts:488
(anonymous) @ simpleObserver.ts:21
emit @ simpleObserver.ts:19
handleMessage @ DerivService.tsx:446
(anonymous) @ DerivService.tsx:395
digit-pattern-rules.js?v=1775837114943:515 ❌ [TEST LOSING DIGITS FLEXIBLE] Erro: ReferenceError: losingDigits is not defined
    at DigitPatternRulesProcessor.testDigitAsX (digit-pattern-rules.js?v=1775837114943:525:55)
    at DigitPatternRulesProcessor.testLosingDigitsAsX (digit-pattern-rules.js?v=1775837114943:488:33)
    at DigitPatternRulesProcessor.verifyPatternMatch (digit-pattern-rules.js?v=1775837114943:378:25)
    at DigitPatternRulesProcessor.analyzeDigitPattern (digit-pattern-rules.js?v=1775837114943:268:33)
    at DigitPatternRulesProcessor.processDigitPatternRule (digit-pattern-rules.js?v=1775837114943:54:33)
    at FormatGenerator.checkRuleCondition (generate-format.js?v=1775837116221:2044:66)
    at MonitoringService.checkRuleCondition (Monitoring.ts:822:30)
    at Monitoring.ts:1032:44
    at Array.forEach (<anonymous>)
    at Monitoring.ts:1024:23
    at Array.forEach (<anonymous>)
    at MonitoringService.setTranslatedRules (Monitoring.ts:1015:30)
    at MonitoringService.handleTick (Monitoring.ts:541:12)
    at Monitoring.ts:488:14
    at simpleObserver.ts:21:21
    at Map.forEach (<anonymous>)
    at Observer.emit (simpleObserver.ts:19:37)
    at DerivService.handleMessage (DerivService.tsx:446:23)
    at WebSocket.<anonymous> (DerivService.tsx:395:52)
error @ intercept-console-error.ts:42
testLosingDigitsAsX @ digit-pattern-rules.js?v=1775837114943:515
verifyPatternMatch @ digit-pattern-rules.js?v=1775837114943:378
analyzeDigitPattern @ digit-pattern-rules.js?v=1775837114943:268
processDigitPatternRule @ digit-pattern-rules.js?v=1775837114943:54
checkRuleCondition @ generate-format.js?v=1775837116221:2044
checkRuleCondition @ Monitoring.ts:822
(anonymous) @ Monitoring.ts:1032
(anonymous) @ Monitoring.ts:1024
setTranslatedRules @ Monitoring.ts:1015
handleTick @ Monitoring.ts:541
(anonymous) @ Monitoring.ts:488
(anonymous) @ simpleObserver.ts:21
emit @ simpleObserver.ts:19
handleMessage @ DerivService.tsx:446
(anonymous) @ DerivService.tsx:395
digit-pattern-rules.js?v=1775837114943:515 ❌ [TEST LOSING DIGITS FLEXIBLE] Erro: ReferenceError: losingDigits is not defined
    at DigitPatternRulesProcessor.testDigitAsX (digit-pattern-rules.js?v=1775837114943:525:55)
    at DigitPatternRulesProcessor.testLosingDigitsAsX (digit-pattern-rules.js?v=1775837114943:488:33)
    at DigitPatternRulesProcessor.verifyPatternMatch (digit-pattern-rules.js?v=1775837114943:378:25)
    at DigitPatternRulesProcessor.analyzeDigitPattern (digit-pattern-rules.js?v=1775837114943:268:33)
    at DigitPatternRulesProcessor.processDigitPatternRule (digit-pattern-rules.js?v=1775837114943:54:33)
    at FormatGenerator.checkRuleCondition (generate-format.js?v=1775837116221:2044:66)
    at MonitoringService.checkRuleCondition (Monitoring.ts:822:30)
    at Monitoring.ts:1032:44
    at Array.forEach (<anonymous>)
    at Monitoring.ts:1024:23
    at Array.forEach (<anonymous>)
    at MonitoringService.setTranslatedRules (Monitoring.ts:1015:30)
    at MonitoringService.handleTick (Monitoring.ts:541:12)
    at Monitoring.ts:488:14
    at simpleObserver.ts:21:21
    at Map.forEach (<anonymous>)
    at Observer.emit (simpleObserver.ts:19:37)
    at DerivService.handleMessage (DerivService.tsx:446:23)
    at WebSocket.<anonymous> (DerivService.tsx:395:52)
error @ intercept-console-error.ts:42
testLosingDigitsAsX @ digit-pattern-rules.js?v=1775837114943:515
verifyPatternMatch @ digit-pattern-rules.js?v=1775837114943:378
analyzeDigitPattern @ digit-pattern-rules.js?v=1775837114943:268
processDigitPatternRule @ digit-pattern-rules.js?v=1775837114943:54
checkRuleCondition @ generate-format.js?v=1775837116221:2044
checkRuleCondition @ Monitoring.ts:822
(anonymous) @ Monitoring.ts:1032
(anonymous) @ Monitoring.ts:1024
setTranslatedRules @ Monitoring.ts:1015
handleTick @ Monitoring.ts:541
(anonymous) @ Monitoring.ts:488
(anonymous) @ simpleObserver.ts:21
emit @ simpleObserver.ts:19
handleMessage @ DerivService.tsx:446
(anonymous) @ DerivService.tsx:395
digit-pattern-rules.js?v=1775837114943:515 ❌ [TEST LOSING DIGITS FLEXIBLE] Erro: ReferenceError: losingDigits is not defined
    at DigitPatternRulesProcessor.testDigitAsX (digit-pattern-rules.js?v=1775837114943:525:55)
    at DigitPatternRulesProcessor.testLosingDigitsAsX (digit-pattern-rules.js?v=1775837114943:488:33)
    at DigitPatternRulesProcessor.verifyPatternMatch (digit-pattern-rules.js?v=1775837114943:378:25)
    at DigitPatternRulesProcessor.analyzeDigitPattern (digit-pattern-rules.js?v=1775837114943:268:33)
    at DigitPatternRulesProcessor.processDigitPatternRule (digit-pattern-rules.js?v=1775837114943:54:33)
    at FormatGenerator.checkRuleCondition (generate-format.js?v=1775837116221:2044:66)
    at MonitoringService.checkRuleCondition (Monitoring.ts:822:30)
    at Monitoring.ts:1032:44
    at Array.forEach (<anonymous>)
    at Monitoring.ts:1024:23
    at Array.forEach (<anonymous>)
    at MonitoringService.setTranslatedRules (Monitoring.ts:1015:30)
    at MonitoringService.handleTick (Monitoring.ts:541:12)
    at Monitoring.ts:488:14
    at simpleObserver.ts:21:21
    at Map.forEach (<anonymous>)
    at Observer.emit (simpleObserver.ts:19:37)
    at DerivService.handleMessage (DerivService.tsx:446:23)
    at WebSocket.<anonymous> (DerivService.tsx:395:52)
error @ intercept-console-error.ts:42
testLosingDigitsAsX @ digit-pattern-rules.js?v=1775837114943:515
verifyPatternMatch @ digit-pattern-rules.js?v=1775837114943:378
analyzeDigitPattern @ digit-pattern-rules.js?v=1775837114943:268
processDigitPatternRule @ digit-pattern-rules.js?v=1775837114943:54
checkRuleCondition @ generate-format.js?v=1775837116221:2044
checkRuleCondition @ Monitoring.ts:822
(anonymous) @ Monitoring.ts:1032
(anonymous) @ Monitoring.ts:1024
setTranslatedRules @ Monitoring.ts:1015
handleTick @ Monitoring.ts:541
(anonymous) @ Monitoring.ts:488
(anonymous) @ simpleObserver.ts:21
emit @ simpleObserver.ts:19
handleMessage @ DerivService.tsx:446
(anonymous) @ DerivService.tsx:395
digit-pattern-rules.js?v=1775837114943:515 ❌ [TEST LOSING DIGITS FLEXIBLE] Erro: ReferenceError: losingDigits is not defined
    at DigitPatternRulesProcessor.testDigitAsX (digit-pattern-rules.js?v=1775837114943:525:55)
    at DigitPatternRulesProcessor.testLosingDigitsAsX (digit-pattern-rules.js?v=1775837114943:488:33)
    at DigitPatternRulesProcessor.verifyPatternMatch (digit-pattern-rules.js?v=1775837114943:378:25)
    at DigitPatternRulesProcessor.analyzeDigitPattern (digit-pattern-rules.js?v=1775837114943:268:33)
    at DigitPatternRulesProcessor.processDigitPatternRule (digit-pattern-rules.js?v=1775837114943:54:33)
    at FormatGenerator.checkRuleCondition (generate-format.js?v=1775837116221:2044:66)
    at MonitoringService.checkRuleCondition (Monitoring.ts:822:30)
    at Monitoring.ts:1032:44
    at Array.forEach (<anonymous>)
    at Monitoring.ts:1024:23
    at Array.forEach (<anonymous>)
    at MonitoringService.setTranslatedRules (Monitoring.ts:1015:30)
    at MonitoringService.handleTick (Monitoring.ts:541:12)
    at Monitoring.ts:488:14
    at simpleObserver.ts:21:21
    at Map.forEach (<anonymous>)
    at Observer.emit (simpleObserver.ts:19:37)
    at DerivService.handleMessage (DerivService.tsx:446:23)
    at WebSocket.<anonymous> (DerivService.tsx:395:52)
error @ intercept-console-error.ts:42
testLosingDigitsAsX @ digit-pattern-rules.js?v=1775837114943:515
verifyPatternMatch @ digit-pattern-rules.js?v=1775837114943:378
analyzeDigitPattern @ digit-pattern-rules.js?v=1775837114943:268
processDigitPatternRule @ digit-pattern-rules.js?v=1775837114943:54
checkRuleCondition @ generate-format.js?v=1775837116221:2044
checkRuleCondition @ Monitoring.ts:822
(anonymous) @ Monitoring.ts:1032
(anonymous) @ Monitoring.ts:1024
setTranslatedRules @ Monitoring.ts:1015
handleTick @ Monitoring.ts:541
(anonymous) @ Monitoring.ts:488
(anonymous) @ simpleObserver.ts:21
emit @ simpleObserver.ts:19
handleMessage @ DerivService.tsx:446
(anonymous) @ DerivService.tsx:395
digit-pattern-rules.js?v=1775837114943:515 ❌ [TEST LOSING DIGITS FLEXIBLE] Erro: ReferenceError: losingDigits is not defined
    at DigitPatternRulesProcessor.testDigitAsX (digit-pattern-rules.js?v=1775837114943:525:55)
    at DigitPatternRulesProcessor.testLosingDigitsAsX (digit-pattern-rules.js?v=1775837114943:488:33)
    at DigitPatternRulesProcessor.verifyPatternMatch (digit-pattern-rules.js?v=1775837114943:378:25)
    at DigitPatternRulesProcessor.analyzeDigitPattern (digit-pattern-rules.js?v=1775837114943:268:33)
    at DigitPatternRulesProcessor.processDigitPatternRule (digit-pattern-rules.js?v=1775837114943:54:33)
    at FormatGenerator.checkRuleCondition (generate-format.js?v=1775837116221:2044:66)
    at MonitoringService.checkRuleCondition (Monitoring.ts:822:30)
    at Monitoring.ts:1032:44
    at Array.forEach (<anonymous>)
    at Monitoring.ts:1024:23
    at Array.forEach (<anonymous>)
    at MonitoringService.setTranslatedRules (Monitoring.ts:1015:30)
    at MonitoringService.handleTick (Monitoring.ts:541:12)
    at Monitoring.ts:488:14
    at simpleObserver.ts:21:21
    at Map.forEach (<anonymous>)
    at Observer.emit (simpleObserver.ts:19:37)
    at DerivService.handleMessage (DerivService.tsx:446:23)
    at WebSocket.<anonymous> (DerivService.tsx:395:52)
error @ intercept-console-error.ts:42
testLosingDigitsAsX @ digit-pattern-rules.js?v=1775837114943:515
verifyPatternMatch @ digit-pattern-rules.js?v=1775837114943:378
analyzeDigitPattern @ digit-pattern-rules.js?v=1775837114943:268
processDigitPatternRule @ digit-pattern-rules.js?v=1775837114943:54
checkRuleCondition @ generate-format.js?v=1775837116221:2044
checkRuleCondition @ Monitoring.ts:822
(anonymous) @ Monitoring.ts:1032
(anonymous) @ Monitoring.ts:1024
setTranslatedRules @ Monitoring.ts:1015
handleTick @ Monitoring.ts:541
(anonymous) @ Monitoring.ts:488
(anonymous) @ simpleObserver.ts:21
emit @ simpleObserver.ts:19
handleMessage @ DerivService.tsx:446
(anonymous) @ DerivService.tsx:395
digit-pattern-rules.js?v=1775837114943:515 ❌ [TEST LOSING DIGITS FLEXIBLE] Erro: ReferenceError: losingDigits is not defined
    at DigitPatternRulesProcessor.testDigitAsX (digit-pattern-rules.js?v=1775837114943:525:55)
    at DigitPatternRulesProcessor.testLosingDigitsAsX (digit-pattern-rules.js?v=1775837114943:488:33)
    at DigitPatternRulesProcessor.verifyPatternMatch (digit-pattern-rules.js?v=1775837114943:378:25)
    at DigitPatternRulesProcessor.analyzeDigitPattern (digit-pattern-rules.js?v=1775837114943:268:33)
    at DigitPatternRulesProcessor.processDigitPatternRule (digit-pattern-rules.js?v=1775837114943:54:33)
    at FormatGenerator.checkRuleCondition (generate-format.js?v=1775837116221:2044:66)
    at MonitoringService.checkRuleCondition (Monitoring.ts:822:30)
    at Monitoring.ts:1032:44
    at Array.forEach (<anonymous>)
    at Monitoring.ts:1024:23
    at Array.forEach (<anonymous>)
    at MonitoringService.setTranslatedRules (Monitoring.ts:1015:30)
    at MonitoringService.handleTick (Monitoring.ts:541:12)
    at Monitoring.ts:488:14
    at simpleObserver.ts:21:21
    at Map.forEach (<anonymous>)
    at Observer.emit (simpleObserver.ts:19:37)
    at DerivService.handleMessage (DerivService.tsx:446:23)
    at WebSocket.<anonymous> (DerivService.tsx:395:52)
error @ intercept-console-error.ts:42
testLosingDigitsAsX @ digit-pattern-rules.js?v=1775837114943:515
verifyPatternMatch @ digit-pattern-rules.js?v=1775837114943:378
analyzeDigitPattern @ digit-pattern-rules.js?v=1775837114943:268
processDigitPatternRule @ digit-pattern-rules.js?v=1775837114943:54
checkRuleCondition @ generate-format.js?v=1775837116221:2044
checkRuleCondition @ Monitoring.ts:822
(anonymous) @ Monitoring.ts:1032
(anonymous) @ Monitoring.ts:1024
setTranslatedRules @ Monitoring.ts:1015
handleTick @ Monitoring.ts:541
(anonymous) @ Monitoring.ts:488
(anonymous) @ simpleObserver.ts:21
emit @ simpleObserver.ts:19
handleMessage @ DerivService.tsx:446
(anonymous) @ DerivService.tsx:395
digit-pattern-rules.js?v=1775837114943:515 ❌ [TEST LOSING DIGITS FLEXIBLE] Erro: ReferenceError: losingDigits is not defined
    at DigitPatternRulesProcessor.testDigitAsX (digit-pattern-rules.js?v=1775837114943:525:55)
    at DigitPatternRulesProcessor.testLosingDigitsAsX (digit-pattern-rules.js?v=1775837114943:488:33)
    at DigitPatternRulesProcessor.verifyPatternMatch (digit-pattern-rules.js?v=1775837114943:378:25)
    at DigitPatternRulesProcessor.analyzeDigitPattern (digit-pattern-rules.js?v=1775837114943:268:33)
    at DigitPatternRulesProcessor.processDigitPatternRule (digit-pattern-rules.js?v=1775837114943:54:33)
    at FormatGenerator.checkRuleCondition (generate-format.js?v=1775837116221:2044:66)
    at MonitoringService.checkRuleCondition (Monitoring.ts:822:30)
    at Monitoring.ts:1032:44
    at Array.forEach (<anonymous>)
    at Monitoring.ts:1024:23
    at Array.forEach (<anonymous>)
    at MonitoringService.setTranslatedRules (Monitoring.ts:1015:30)
    at MonitoringService.handleTick (Monitoring.ts:541:12)
    at Monitoring.ts:488:14
    at simpleObserver.ts:21:21
    at Map.forEach (<anonymous>)
    at Observer.emit (simpleObserver.ts:19:37)
    at DerivService.handleMessage (DerivService.tsx:446:23)
    at WebSocket.<anonymous> (DerivService.tsx:395:52)
error @ intercept-console-error.ts:42
testLosingDigitsAsX @ digit-pattern-rules.js?v=1775837114943:515
verifyPatternMatch @ digit-pattern-rules.js?v=1775837114943:378
analyzeDigitPattern @ digit-pattern-rules.js?v=1775837114943:268
processDigitPatternRule @ digit-pattern-rules.js?v=1775837114943:54
checkRuleCondition @ generate-format.js?v=1775837116221:2044
checkRuleCondition @ Monitoring.ts:822
(anonymous) @ Monitoring.ts:1032
(anonymous) @ Monitoring.ts:1024
setTranslatedRules @ Monitoring.ts:1015
handleTick @ Monitoring.ts:541
(anonymous) @ Monitoring.ts:488
(anonymous) @ simpleObserver.ts:21
emit @ simpleObserver.ts:19
handleMessage @ DerivService.tsx:446
(anonymous) @ DerivService.tsx:395
digit-pattern-rules.js?v=1775837114943:515 ❌ [TEST LOSING DIGITS FLEXIBLE] Erro: ReferenceError: losingDigits is not defined
    at DigitPatternRulesProcessor.testDigitAsX (digit-pattern-rules.js?v=1775837114943:525:55)
    at DigitPatternRulesProcessor.testLosingDigitsAsX (digit-pattern-rules.js?v=1775837114943:488:33)
    at DigitPatternRulesProcessor.verifyPatternMatch (digit-pattern-rules.js?v=1775837114943:378:25)
    at DigitPatternRulesProcessor.analyzeDigitPattern (digit-pattern-rules.js?v=1775837114943:268:33)
    at DigitPatternRulesProcessor.processDigitPatternRule (digit-pattern-rules.js?v=1775837114943:54:33)
    at FormatGenerator.checkRuleCondition (generate-format.js?v=1775837116221:2044:66)
    at MonitoringService.checkRuleCondition (Monitoring.ts:822:30)
    at Monitoring.ts:1032:44
    at Array.forEach (<anonymous>)
    at Monitoring.ts:1024:23
    at Array.forEach (<anonymous>)
    at MonitoringService.setTranslatedRules (Monitoring.ts:1015:30)
    at MonitoringService.handleTick (Monitoring.ts:541:12)
    at Monitoring.ts:488:14
    at simpleObserver.ts:21:21
    at Map.forEach (<anonymous>)
    at Observer.emit (simpleObserver.ts:19:37)
    at DerivService.handleMessage (DerivService.tsx:446:23)
    at WebSocket.<anonymous> (DerivService.tsx:395:52)
error @ intercept-console-error.ts:42
testLosingDigitsAsX @ digit-pattern-rules.js?v=1775837114943:515
verifyPatternMatch @ digit-pattern-rules.js?v=1775837114943:378
analyzeDigitPattern @ digit-pattern-rules.js?v=1775837114943:268
processDigitPatternRule @ digit-pattern-rules.js?v=1775837114943:54
checkRuleCondition @ generate-format.js?v=1775837116221:2044
checkRuleCondition @ Monitoring.ts:822
(anonymous) @ Monitoring.ts:1032
(anonymous) @ Monitoring.ts:1024
setTranslatedRules @ Monitoring.ts:1015
handleTick @ Monitoring.ts:541
(anonymous) @ Monitoring.ts:488
(anonymous) @ simpleObserver.ts:21
emit @ simpleObserver.ts:19
handleMessage @ DerivService.tsx:446
(anonymous) @ DerivService.tsx:395
digit-pattern-rules.js?v=1775837114943:515 ❌ [TEST LOSING DIGITS FLEXIBLE] Erro: ReferenceError: losingDigits is not defined
    at DigitPatternRulesProcessor.testDigitAsX (digit-pattern-rules.js?v=1775837114943:525:55)
    at DigitPatternRulesProcessor.testLosingDigitsAsX (digit-pattern-rules.js?v=1775837114943:488:33)
    at DigitPatternRulesProcessor.verifyPatternMatch (digit-pattern-rules.js?v=1775837114943:378:25)
    at DigitPatternRulesProcessor.analyzeDigitPattern (digit-pattern-rules.js?v=1775837114943:268:33)
    at DigitPatternRulesProcessor.processDigitPatternRule (digit-pattern-rules.js?v=1775837114943:54:33)
    at FormatGenerator.checkRuleCondition (generate-format.js?v=1775837116221:2044:66)
    at MonitoringService.checkRuleCondition (Monitoring.ts:822:30)
    at Monitoring.ts:1032:44
    at Array.forEach (<anonymous>)
    at Monitoring.ts:1024:23
    at Array.forEach (<anonymous>)
    at MonitoringService.setTranslatedRules (Monitoring.ts:1015:30)
    at MonitoringService.handleTick (Monitoring.ts:541:12)
    at Monitoring.ts:488:14
    at simpleObserver.ts:21:21
    at Map.forEach (<anonymous>)
    at Observer.emit (simpleObserver.ts:19:37)
    at DerivService.handleMessage (DerivService.tsx:446:23)
    at WebSocket.<anonymous> (DerivService.tsx:395:52)
error @ intercept-console-error.ts:42
testLosingDigitsAsX @ digit-pattern-rules.js?v=1775837114943:515
verifyPatternMatch @ digit-pattern-rules.js?v=1775837114943:378
analyzeDigitPattern @ digit-pattern-rules.js?v=1775837114943:268
processDigitPatternRule @ digit-pattern-rules.js?v=1775837114943:54
checkRuleCondition @ generate-format.js?v=1775837116221:2044
checkRuleCondition @ Monitoring.ts:822
(anonymous) @ Monitoring.ts:1032
(anonymous) @ Monitoring.ts:1024
setTranslatedRules @ Monitoring.ts:1015
handleTick @ Monitoring.ts:541
(anonymous) @ Monitoring.ts:488
(anonymous) @ simpleObserver.ts:21
emit @ simpleObserver.ts:19
handleMessage @ DerivService.tsx:446
(anonymous) @ DerivService.tsx:395
digit-pattern-rules.js?v=1775837114943:515 ❌ [TEST LOSING DIGITS FLEXIBLE] Erro: ReferenceError: losingDigits is not defined
    at DigitPatternRulesProcessor.testDigitAsX (digit-pattern-rules.js?v=1775837114943:525:55)
    at DigitPatternRulesProcessor.testLosingDigitsAsX (digit-pattern-rules.js?v=1775837114943:488:33)
    at DigitPatternRulesProcessor.verifyPatternMatch (digit-pattern-rules.js?v=1775837114943:378:25)
    at DigitPatternRulesProcessor.analyzeDigitPattern (digit-pattern-rules.js?v=1775837114943:268:33)
    at DigitPatternRulesProcessor.processDigitPatternRule (digit-pattern-rules.js?v=1775837114943:54:33)
    at FormatGenerator.checkRuleCondition (generate-format.js?v=1775837116221:2044:66)
    at MonitoringService.checkRuleCondition (Monitoring.ts:822:30)
    at Monitoring.ts:1032:44
    at Array.forEach (<anonymous>)
    at Monitoring.ts:1024:23
    at Array.forEach (<anonymous>)
    at MonitoringService.setTranslatedRules (Monitoring.ts:1015:30)
    at MonitoringService.handleTick (Monitoring.ts:541:12)
    at Monitoring.ts:488:14
    at simpleObserver.ts:21:21
    at Map.forEach (<anonymous>)
    at Observer.emit (simpleObserver.ts:19:37)
    at DerivService.handleMessage (DerivService.tsx:446:23)
    at WebSocket.<anonymous> (DerivService.tsx:395:52)
error @ intercept-console-error.ts:42
testLosingDigitsAsX @ digit-pattern-rules.js?v=1775837114943:515
verifyPatternMatch @ digit-pattern-rules.js?v=1775837114943:378
analyzeDigitPattern @ digit-pattern-rules.js?v=1775837114943:268
processDigitPatternRule @ digit-pattern-rules.js?v=1775837114943:54
checkRuleCondition @ generate-format.js?v=1775837116221:2044
checkRuleCondition @ Monitoring.ts:822
(anonymous) @ Monitoring.ts:1032
(anonymous) @ Monitoring.ts:1024
setTranslatedRules @ Monitoring.ts:1015
handleTick @ Monitoring.ts:541
(anonymous) @ Monitoring.ts:488
(anonymous) @ simpleObserver.ts:21
emit @ simpleObserver.ts:19
handleMessage @ DerivService.tsx:446
(anonymous) @ DerivService.tsx:395
digit-pattern-rules.js?v=1775837114943:515 ❌ [TEST LOSING DIGITS FLEXIBLE] Erro: ReferenceError: losingDigits is not defined
    at DigitPatternRulesProcessor.testDigitAsX (digit-pattern-rules.js?v=1775837114943:525:55)
    at DigitPatternRulesProcessor.testLosingDigitsAsX (digit-pattern-rules.js?v=1775837114943:488:33)
    at DigitPatternRulesProcessor.verifyPatternMatch (digit-pattern-rules.js?v=1775837114943:378:25)
    at DigitPatternRulesProcessor.analyzeDigitPattern (digit-pattern-rules.js?v=1775837114943:268:33)
    at DigitPatternRulesProcessor.processDigitPatternRule (digit-pattern-rules.js?v=1775837114943:54:33)
    at FormatGenerator.checkRuleCondition (generate-format.js?v=1775837116221:2044:66)
    at MonitoringService.checkRuleCondition (Monitoring.ts:822:30)
    at Monitoring.ts:1032:44
    at Array.forEach (<anonymous>)
    at Monitoring.ts:1024:23
    at Array.forEach (<anonymous>)
    at MonitoringService.setTranslatedRules (Monitoring.ts:1015:30)
    at MonitoringService.handleTick (Monitoring.ts:541:12)
    at Monitoring.ts:488:14
    at simpleObserver.ts:21:21
    at Map.forEach (<anonymous>)
    at Observer.emit (simpleObserver.ts:19:37)
    at DerivService.handleMessage (DerivService.tsx:446:23)
    at WebSocket.<anonymous> (DerivService.tsx:395:52)
error @ intercept-console-error.ts:42
testLosingDigitsAsX @ digit-pattern-rules.js?v=1775837114943:515
verifyPatternMatch @ digit-pattern-rules.js?v=1775837114943:378
analyzeDigitPattern @ digit-pattern-rules.js?v=1775837114943:268
processDigitPatternRule @ digit-pattern-rules.js?v=1775837114943:54
checkRuleCondition @ generate-format.js?v=1775837116221:2044
checkRuleCondition @ Monitoring.ts:822
(anonymous) @ Monitoring.ts:1032
(anonymous) @ Monitoring.ts:1024
setTranslatedRules @ Monitoring.ts:1015
handleTick @ Monitoring.ts:541
(anonymous) @ Monitoring.ts:488
(anonymous) @ simpleObserver.ts:21
emit @ simpleObserver.ts:19
handleMessage @ DerivService.tsx:446
(anonymous) @ DerivService.tsx:395
digit-pattern-rules.js?v=1775837114943:515 ❌ [TEST LOSING DIGITS FLEXIBLE] Erro: ReferenceError: losingDigits is not defined
    at DigitPatternRulesProcessor.testDigitAsX (digit-pattern-rules.js?v=1775837114943:525:55)
    at DigitPatternRulesProcessor.testLosingDigitsAsX (digit-pattern-rules.js?v=1775837114943:488:33)
    at DigitPatternRulesProcessor.verifyPatternMatch (digit-pattern-rules.js?v=1775837114943:378:25)
    at DigitPatternRulesProcessor.analyzeDigitPattern (digit-pattern-rules.js?v=1775837114943:268:33)
    at DigitPatternRulesProcessor.processDigitPatternRule (digit-pattern-rules.js?v=1775837114943:54:33)
    at FormatGenerator.checkRuleCondition (generate-format.js?v=1775837116221:2044:66)
    at MonitoringService.checkRuleCondition (Monitoring.ts:822:30)
    at Monitoring.ts:1032:44
    at Array.forEach (<anonymous>)
    at Monitoring.ts:1024:23
    at Array.forEach (<anonymous>)
    at MonitoringService.setTranslatedRules (Monitoring.ts:1015:30)
    at MonitoringService.handleTick (Monitoring.ts:541:12)
    at Monitoring.ts:488:14
    at simpleObserver.ts:21:21
    at Map.forEach (<anonymous>)
    at Observer.emit (simpleObserver.ts:19:37)
    at DerivService.handleMessage (DerivService.tsx:446:23)
    at WebSocket.<anonymous> (DerivService.tsx:395:52)
error @ intercept-console-error.ts:42
testLosingDigitsAsX @ digit-pattern-rules.js?v=1775837114943:515
verifyPatternMatch @ digit-pattern-rules.js?v=1775837114943:378
analyzeDigitPattern @ digit-pattern-rules.js?v=1775837114943:268
processDigitPatternRule @ digit-pattern-rules.js?v=1775837114943:54
checkRuleCondition @ generate-format.js?v=1775837116221:2044
checkRuleCondition @ Monitoring.ts:822
(anonymous) @ Monitoring.ts:1032
(anonymous) @ Monitoring.ts:1024
setTranslatedRules @ Monitoring.ts:1015
handleTick @ Monitoring.ts:541
(anonymous) @ Monitoring.ts:488
(anonymous) @ simpleObserver.ts:21
emit @ simpleObserver.ts:19
handleMessage @ DerivService.tsx:446
(anonymous) @ DerivService.tsx:395
digit-pattern-rules.js?v=1775837114943:515 ❌ [TEST LOSING DIGITS FLEXIBLE] Erro: ReferenceError: losingDigits is not defined
    at DigitPatternRulesProcessor.testDigitAsX (digit-pattern-rules.js?v=1775837114943:525:55)
    at DigitPatternRulesProcessor.testLosingDigitsAsX (digit-pattern-rules.js?v=1775837114943:488:33)
    at DigitPatternRulesProcessor.verifyPatternMatch (digit-pattern-rules.js?v=1775837114943:378:25)
    at DigitPatternRulesProcessor.analyzeDigitPattern (digit-pattern-rules.js?v=1775837114943:268:33)
    at DigitPatternRulesProcessor.processDigitPatternRule (digit-pattern-rules.js?v=1775837114943:54:33)
    at FormatGenerator.checkRuleCondition (generate-format.js?v=1775837116221:2044:66)
    at MonitoringService.checkRuleCondition (Monitoring.ts:822:30)
    at Monitoring.ts:1032:44
    at Array.forEach (<anonymous>)
    at Monitoring.ts:1024:23
    at Array.forEach (<anonymous>)
    at MonitoringService.setTranslatedRules (Monitoring.ts:1015:30)
    at MonitoringService.handleTick (Monitoring.ts:541:12)
    at Monitoring.ts:488:14
    at simpleObserver.ts:21:21
    at Map.forEach (<anonymous>)
    at Observer.emit (simpleObserver.ts:19:37)
    at DerivService.handleMessage (DerivService.tsx:446:23)
    at WebSocket.<anonymous> (DerivService.tsx:395:52)
error @ intercept-console-error.ts:42
testLosingDigitsAsX @ digit-pattern-rules.js?v=1775837114943:515
verifyPatternMatch @ digit-pattern-rules.js?v=1775837114943:378
analyzeDigitPattern @ digit-pattern-rules.js?v=1775837114943:268
processDigitPatternRule @ digit-pattern-rules.js?v=1775837114943:54
checkRuleCondition @ generate-format.js?v=1775837116221:2044
checkRuleCondition @ Monitoring.ts:822
(anonymous) @ Monitoring.ts:1032
(anonymous) @ Monitoring.ts:1024
setTranslatedRules @ Monitoring.ts:1015
handleTick @ Monitoring.ts:541
(anonymous) @ Monitoring.ts:488
(anonymous) @ simpleObserver.ts:21
emit @ simpleObserver.ts:19
handleMessage @ DerivService.tsx:446
(anonymous) @ DerivService.tsx:395
digit-pattern-rules.js?v=1775837114943:515 ❌ [TEST LOSING DIGITS FLEXIBLE] Erro: ReferenceError: losingDigits is not defined
    at DigitPatternRulesProcessor.testDigitAsX (digit-pattern-rules.js?v=1775837114943:525:55)
    at DigitPatternRulesProcessor.testLosingDigitsAsX (digit-pattern-rules.js?v=1775837114943:488:33)
    at DigitPatternRulesProcessor.verifyPatternMatch (digit-pattern-rules.js?v=1775837114943:378:25)
    at DigitPatternRulesProcessor.analyzeDigitPattern (digit-pattern-rules.js?v=1775837114943:268:33)
    at DigitPatternRulesProcessor.processDigitPatternRule (digit-pattern-rules.js?v=1775837114943:54:33)
    at FormatGenerator.checkRuleCondition (generate-format.js?v=1775837116221:2044:66)
    at MonitoringService.checkRuleCondition (Monitoring.ts:822:30)
    at Monitoring.ts:1032:44
    at Array.forEach (<anonymous>)
    at Monitoring.ts:1024:23
    at Array.forEach (<anonymous>)
    at MonitoringService.setTranslatedRules (Monitoring.ts:1015:30)
    at MonitoringService.handleTick (Monitoring.ts:541:12)
    at Monitoring.ts:488:14
    at simpleObserver.ts:21:21
    at Map.forEach (<anonymous>)
    at Observer.emit (simpleObserver.ts:19:37)
    at DerivService.handleMessage (DerivService.tsx:446:23)
    at WebSocket.<anonymous> (DerivService.tsx:395:52)
error @ intercept-console-error.ts:42
testLosingDigitsAsX @ digit-pattern-rules.js?v=1775837114943:515
verifyPatternMatch @ digit-pattern-rules.js?v=1775837114943:378
analyzeDigitPattern @ digit-pattern-rules.js?v=1775837114943:268
processDigitPatternRule @ digit-pattern-rules.js?v=1775837114943:54
checkRuleCondition @ generate-format.js?v=1775837116221:2044
checkRuleCondition @ Monitoring.ts:822
(anonymous) @ Monitoring.ts:1032
(anonymous) @ Monitoring.ts:1024
setTranslatedRules @ Monitoring.ts:1015
handleTick @ Monitoring.ts:541
(anonymous) @ Monitoring.ts:488
(anonymous) @ simpleObserver.ts:21
emit @ simpleObserver.ts:19
handleMessage @ DerivService.tsx:446
(anonymous) @ DerivService.tsx:395
digit-pattern-rules.js?v=1775837114943:515 ❌ [TEST LOSING DIGITS FLEXIBLE] Erro: ReferenceError: losingDigits is not defined
    at DigitPatternRulesProcessor.testDigitAsX (digit-pattern-rules.js?v=1775837114943:525:55)
    at DigitPatternRulesProcessor.testLosingDigitsAsX (digit-pattern-rules.js?v=1775837114943:488:33)
    at DigitPatternRulesProcessor.verifyPatternMatch (digit-pattern-rules.js?v=1775837114943:378:25)
    at DigitPatternRulesProcessor.analyzeDigitPattern (digit-pattern-rules.js?v=1775837114943:268:33)
    at DigitPatternRulesProcessor.processDigitPatternRule (digit-pattern-rules.js?v=1775837114943:54:33)
    at FormatGenerator.checkRuleCondition (generate-format.js?v=1775837116221:2044:66)
    at MonitoringService.checkRuleCondition (Monitoring.ts:822:30)
    at Monitoring.ts:1032:44
    at Array.forEach (<anonymous>)
    at Monitoring.ts:1024:23
    at Array.forEach (<anonymous>)
    at MonitoringService.setTranslatedRules (Monitoring.ts:1015:30)
    at MonitoringService.handleTick (Monitoring.ts:541:12)
    at Monitoring.ts:488:14
    at simpleObserver.ts:21:21
    at Map.forEach (<anonymous>)
    at Observer.emit (simpleObserver.ts:19:37)
    at DerivService.handleMessage (DerivService.tsx:446:23)
    at WebSocket.<anonymous> (DerivService.tsx:395:52)
error @ intercept-console-error.ts:42
testLosingDigitsAsX @ digit-pattern-rules.js?v=1775837114943:515
verifyPatternMatch @ digit-pattern-rules.js?v=1775837114943:378
analyzeDigitPattern @ digit-pattern-rules.js?v=1775837114943:268
processDigitPatternRule @ digit-pattern-rules.js?v=1775837114943:54
checkRuleCondition @ generate-format.js?v=1775837116221:2044
checkRuleCondition @ Monitoring.ts:822
(anonymous) @ Monitoring.ts:1032
(anonymous) @ Monitoring.ts:1024
setTranslatedRules @ Monitoring.ts:1015
handleTick @ Monitoring.ts:541
(anonymous) @ Monitoring.ts:488
(anonymous) @ simpleObserver.ts:21
emit @ simpleObserver.ts:19
handleMessage @ DerivService.tsx:446
(anonymous) @ DerivService.tsx:395
digit-pattern-rules.js?v=1775837114943:515 ❌ [TEST LOSING DIGITS FLEXIBLE] Erro: ReferenceError: losingDigits is not defined
    at DigitPatternRulesProcessor.testDigitAsX (digit-pattern-rules.js?v=1775837114943:525:55)
    at DigitPatternRulesProcessor.testLosingDigitsAsX (digit-pattern-rules.js?v=1775837114943:488:33)
    at DigitPatternRulesProcessor.verifyPatternMatch (digit-pattern-rules.js?v=1775837114943:378:25)
    at DigitPatternRulesProcessor.analyzeDigitPattern (digit-pattern-rules.js?v=1775837114943:268:33)
    at DigitPatternRulesProcessor.processDigitPatternRule (digit-pattern-rules.js?v=1775837114943:54:33)
    at FormatGenerator.checkRuleCondition (generate-format.js?v=1775837116221:2044:66)
    at MonitoringService.checkRuleCondition (Monitoring.ts:822:30)
    at Monitoring.ts:1032:44
    at Array.forEach (<anonymous>)
    at Monitoring.ts:1024:23
    at Array.forEach (<anonymous>)
    at MonitoringService.setTranslatedRules (Monitoring.ts:1015:30)
    at MonitoringService.handleTick (Monitoring.ts:541:12)
    at Monitoring.ts:488:14
    at simpleObserver.ts:21:21
    at Map.forEach (<anonymous>)
    at Observer.emit (simpleObserver.ts:19:37)
    at DerivService.handleMessage (DerivService.tsx:446:23)
    at WebSocket.<anonymous> (DerivService.tsx:395:52)
error @ intercept-console-error.ts:42
testLosingDigitsAsX @ digit-pattern-rules.js?v=1775837114943:515
verifyPatternMatch @ digit-pattern-rules.js?v=1775837114943:378
analyzeDigitPattern @ digit-pattern-rules.js?v=1775837114943:268
processDigitPatternRule @ digit-pattern-rules.js?v=1775837114943:54
checkRuleCondition @ generate-format.js?v=1775837116221:2044
checkRuleCondition @ Monitoring.ts:822
(anonymous) @ Monitoring.ts:1032
(anonymous) @ Monitoring.ts:1024
setTranslatedRules @ Monitoring.ts:1015
handleTick @ Monitoring.ts:541
(anonymous) @ Monitoring.ts:488
(anonymous) @ simpleObserver.ts:21
emit @ simpleObserver.ts:19
handleMessage @ DerivService.tsx:446
(anonymous) @ DerivService.tsx:395
digit-pattern-rules.js?v=1775837114943:515 ❌ [TEST LOSING DIGITS FLEXIBLE] Erro: ReferenceError: losingDigits is not defined
    at DigitPatternRulesProcessor.testDigitAsX (digit-pattern-rules.js?v=1775837114943:525:55)
    at DigitPatternRulesProcessor.testLosingDigitsAsX (digit-pattern-rules.js?v=1775837114943:488:33)
    at DigitPatternRulesProcessor.verifyPatternMatch (digit-pattern-rules.js?v=1775837114943:378:25)
    at DigitPatternRulesProcessor.analyzeDigitPattern (digit-pattern-rules.js?v=1775837114943:268:33)
    at DigitPatternRulesProcessor.processDigitPatternRule (digit-pattern-rules.js?v=1775837114943:54:33)
    at FormatGenerator.checkRuleCondition (generate-format.js?v=1775837116221:2044:66)
    at MonitoringService.checkRuleCondition (Monitoring.ts:822:30)
    at Monitoring.ts:1032:44
    at Array.forEach (<anonymous>)
    at Monitoring.ts:1024:23
    at Array.forEach (<anonymous>)
    at MonitoringService.setTranslatedRules (Monitoring.ts:1015:30)
    at MonitoringService.handleTick (Monitoring.ts:541:12)
    at Monitoring.ts:488:14
    at simpleObserver.ts:21:21
    at Map.forEach (<anonymous>)
    at Observer.emit (simpleObserver.ts:19:37)
    at DerivService.handleMessage (DerivService.tsx:446:23)
    at WebSocket.<anonymous> (DerivService.tsx:395:52)
error @ intercept-console-error.ts:42
testLosingDigitsAsX @ digit-pattern-rules.js?v=1775837114943:515
verifyPatternMatch @ digit-pattern-rules.js?v=1775837114943:378
analyzeDigitPattern @ digit-pattern-rules.js?v=1775837114943:268
processDigitPatternRule @ digit-pattern-rules.js?v=1775837114943:54
checkRuleCondition @ generate-format.js?v=1775837116221:2044
checkRuleCondition @ Monitoring.ts:822
(anonymous) @ Monitoring.ts:1032
(anonymous) @ Monitoring.ts:1024
setTranslatedRules @ Monitoring.ts:1015
handleTick @ Monitoring.ts:541
(anonymous) @ Monitoring.ts:488
(anonymous) @ simpleObserver.ts:21
emit @ simpleObserver.ts:19
handleMessage @ DerivService.tsx:446
(anonymous) @ DerivService.tsx:395
digit-pattern-rules.js?v=1775837114943:515 ❌ [TEST LOSING DIGITS FLEXIBLE] Erro: ReferenceError: losingDigits is not defined
    at DigitPatternRulesProcessor.testDigitAsX (digit-pattern-rules.js?v=1775837114943:525:55)
    at DigitPatternRulesProcessor.testLosingDigitsAsX (digit-pattern-rules.js?v=1775837114943:488:33)
    at DigitPatternRulesProcessor.verifyPatternMatch (digit-pattern-rules.js?v=1775837114943:378:25)
    at DigitPatternRulesProcessor.analyzeDigitPattern (digit-pattern-rules.js?v=1775837114943:268:33)
    at DigitPatternRulesProcessor.processDigitPatternRule (digit-pattern-rules.js?v=1775837114943:54:33)
    at FormatGenerator.checkRuleCondition (generate-format.js?v=1775837116221:2044:66)
    at MonitoringService.checkRuleCondition (Monitoring.ts:822:30)
    at Monitoring.ts:1032:44
    at Array.forEach (<anonymous>)
    at Monitoring.ts:1024:23
    at Array.forEach (<anonymous>)
    at MonitoringService.setTranslatedRules (Monitoring.ts:1015:30)
    at MonitoringService.handleTick (Monitoring.ts:541:12)
    at Monitoring.ts:488:14
    at simpleObserver.ts:21:21
    at Map.forEach (<anonymous>)
    at Observer.emit (simpleObserver.ts:19:37)
    at DerivService.handleMessage (DerivService.tsx:446:23)
    at WebSocket.<anonymous> (DerivService.tsx:395:52)
error @ intercept-console-error.ts:42
testLosingDigitsAsX @ digit-pattern-rules.js?v=1775837114943:515
verifyPatternMatch @ digit-pattern-rules.js?v=1775837114943:378
analyzeDigitPattern @ digit-pattern-rules.js?v=1775837114943:268
processDigitPatternRule @ digit-pattern-rules.js?v=1775837114943:54
checkRuleCondition @ generate-format.js?v=1775837116221:2044
checkRuleCondition @ Monitoring.ts:822
(anonymous) @ Monitoring.ts:1032
(anonymous) @ Monitoring.ts:1024
setTranslatedRules @ Monitoring.ts:1015
handleTick @ Monitoring.ts:541
(anonymous) @ Monitoring.ts:488
(anonymous) @ simpleObserver.ts:21
emit @ simpleObserver.ts:19
handleMessage @ DerivService.tsx:446
(anonymous) @ DerivService.tsx:395
digit-pattern-rules.js?v=1775837114943:515 ❌ [TEST LOSING DIGITS FLEXIBLE] Erro: ReferenceError: losingDigits is not defined
    at DigitPatternRulesProcessor.testDigitAsX (digit-pattern-rules.js?v=1775837114943:525:55)
    at DigitPatternRulesProcessor.testLosingDigitsAsX (digit-pattern-rules.js?v=1775837114943:488:33)
    at DigitPatternRulesProcessor.verifyPatternMatch (digit-pattern-rules.js?v=1775837114943:378:25)
    at DigitPatternRulesProcessor.analyzeDigitPattern (digit-pattern-rules.js?v=1775837114943:268:33)
    at DigitPatternRulesProcessor.processDigitPatternRule (digit-pattern-rules.js?v=1775837114943:54:33)
    at FormatGenerator.checkRuleCondition (generate-format.js?v=1775837116221:2044:66)
    at MonitoringService.checkRuleCondition (Monitoring.ts:822:30)
    at Monitoring.ts:1032:44
    at Array.forEach (<anonymous>)
    at Monitoring.ts:1024:23
    at Array.forEach (<anonymous>)
    at MonitoringService.setTranslatedRules (Monitoring.ts:1015:30)
    at MonitoringService.handleTick (Monitoring.ts:541:12)
    at Monitoring.ts:488:14
    at simpleObserver.ts:21:21
    at Map.forEach (<anonymous>)
    at Observer.emit (simpleObserver.ts:19:37)
    at DerivService.handleMessage (DerivService.tsx:446:23)
    at WebSocket.<anonymous> (DerivService.tsx:395:52)
error @ intercept-console-error.ts:42
testLosingDigitsAsX @ digit-pattern-rules.js?v=1775837114943:515
verifyPatternMatch @ digit-pattern-rules.js?v=1775837114943:378
analyzeDigitPattern @ digit-pattern-rules.js?v=1775837114943:268
processDigitPatternRule @ digit-pattern-rules.js?v=1775837114943:54
checkRuleCondition @ generate-format.js?v=1775837116221:2044
checkRuleCondition @ Monitoring.ts:822
(anonymous) @ Monitoring.ts:1032
(anonymous) @ Monitoring.ts:1024
setTranslatedRules @ Monitoring.ts:1015
handleTick @ Monitoring.ts:541
(anonymous) @ Monitoring.ts:488
(anonymous) @ simpleObserver.ts:21
emit @ simpleObserver.ts:19
handleMessage @ DerivService.tsx:446
(anonymous) @ DerivService.tsx:395
digit-pattern-rules.js?v=1775837114943:515 ❌ [TEST LOSING DIGITS FLEXIBLE] Erro: ReferenceError: losingDigits is not defined
    at DigitPatternRulesProcessor.testDigitAsX (digit-pattern-rules.js?v=1775837114943:525:55)
    at DigitPatternRulesProcessor.testLosingDigitsAsX (digit-pattern-rules.js?v=1775837114943:488:33)
    at DigitPatternRulesProcessor.verifyPatternMatch (digit-pattern-rules.js?v=1775837114943:378:25)
    at DigitPatternRulesProcessor.analyzeDigitPattern (digit-pattern-rules.js?v=1775837114943:268:33)
    at DigitPatternRulesProcessor.processDigitPatternRule (digit-pattern-rules.js?v=1775837114943:54:33)
    at FormatGenerator.checkRuleCondition (generate-format.js?v=1775837116221:2044:66)
    at MonitoringService.checkRuleCondition (Monitoring.ts:822:30)
    at Monitoring.ts:1032:44
    at Array.forEach (<anonymous>)
    at Monitoring.ts:1024:23
    at Array.forEach (<anonymous>)
    at MonitoringService.setTranslatedRules (Monitoring.ts:1015:30)
    at MonitoringService.handleTick (Monitoring.ts:541:12)
    at Monitoring.ts:488:14
    at simpleObserver.ts:21:21
    at Map.forEach (<anonymous>)
    at Observer.emit (simpleObserver.ts:19:37)
    at DerivService.handleMessage (DerivService.tsx:446:23)
    at WebSocket.<anonymous> (DerivService.tsx:395:52)
error @ intercept-console-error.ts:42
testLosingDigitsAsX @ digit-pattern-rules.js?v=1775837114943:515
verifyPatternMatch @ digit-pattern-rules.js?v=1775837114943:378
analyzeDigitPattern @ digit-pattern-rules.js?v=1775837114943:268
processDigitPatternRule @ digit-pattern-rules.js?v=1775837114943:54
checkRuleCondition @ generate-format.js?v=1775837116221:2044
checkRuleCondition @ Monitoring.ts:822
(anonymous) @ Monitoring.ts:1032
(anonymous) @ Monitoring.ts:1024
setTranslatedRules @ Monitoring.ts:1015
handleTick @ Monitoring.ts:541
(anonymous) @ Monitoring.ts:488
(anonymous) @ simpleObserver.ts:21
emit @ simpleObserver.ts:19
handleMessage @ DerivService.tsx:446
(anonymous) @ DerivService.tsx:395
digit-pattern-rules.js?v=1775837114943:515 ❌ [TEST LOSING DIGITS FLEXIBLE] Erro: ReferenceError: losingDigits is not defined
    at DigitPatternRulesProcessor.testDigitAsX (digit-pattern-rules.js?v=1775837114943:525:55)
    at DigitPatternRulesProcessor.testLosingDigitsAsX (digit-pattern-rules.js?v=1775837114943:488:33)
    at DigitPatternRulesProcessor.verifyPatternMatch (digit-pattern-rules.js?v=1775837114943:378:25)
    at DigitPatternRulesProcessor.analyzeDigitPattern (digit-pattern-rules.js?v=1775837114943:268:33)
    at DigitPatternRulesProcessor.processDigitPatternRule (digit-pattern-rules.js?v=1775837114943:54:33)
    at FormatGenerator.checkRuleCondition (generate-format.js?v=1775837116221:2044:66)
    at MonitoringService.checkRuleCondition (Monitoring.ts:822:30)
    at Monitoring.ts:1032:44
    at Array.forEach (<anonymous>)
    at Monitoring.ts:1024:23
    at Array.forEach (<anonymous>)
    at MonitoringService.setTranslatedRules (Monitoring.ts:1015:30)
    at MonitoringService.handleTick (Monitoring.ts:541:12)
    at Monitoring.ts:488:14
    at simpleObserver.ts:21:21
    at Map.forEach (<anonymous>)
    at Observer.emit (simpleObserver.ts:19:37)
    at DerivService.handleMessage (DerivService.tsx:446:23)
    at WebSocket.<anonymous> (DerivService.tsx:395:52)
error @ intercept-console-error.ts:42
testLosingDigitsAsX @ digit-pattern-rules.js?v=1775837114943:515
verifyPatternMatch @ digit-pattern-rules.js?v=1775837114943:378
analyzeDigitPattern @ digit-pattern-rules.js?v=1775837114943:268
processDigitPatternRule @ digit-pattern-rules.js?v=1775837114943:54
checkRuleCondition @ generate-format.js?v=1775837116221:2044
checkRuleCondition @ Monitoring.ts:822
(anonymous) @ Monitoring.ts:1032
(anonymous) @ Monitoring.ts:1024
setTranslatedRules @ Monitoring.ts:1015
handleTick @ Monitoring.ts:541
(anonymous) @ Monitoring.ts:488
(anonymous) @ simpleObserver.ts:21
emit @ simpleObserver.ts:19
handleMessage @ DerivService.tsx:446
(anonymous) @ DerivService.tsx:395
digit-pattern-rules.js?v=1775837114943:515 ❌ [TEST LOSING DIGITS FLEXIBLE] Erro: ReferenceError: losingDigits is not defined
    at DigitPatternRulesProcessor.testDigitAsX (digit-pattern-rules.js?v=1775837114943:525:55)
    at DigitPatternRulesProcessor.testLosingDigitsAsX (digit-pattern-rules.js?v=1775837114943:488:33)
    at DigitPatternRulesProcessor.verifyPatternMatch (digit-pattern-rules.js?v=1775837114943:378:25)
    at DigitPatternRulesProcessor.analyzeDigitPattern (digit-pattern-rules.js?v=1775837114943:268:33)
    at DigitPatternRulesProcessor.processDigitPatternRule (digit-pattern-rules.js?v=1775837114943:54:33)
    at FormatGenerator.checkRuleCondition (generate-format.js?v=1775837116221:2044:66)
    at MonitoringService.checkRuleCondition (Monitoring.ts:822:30)
    at Monitoring.ts:1032:44
    at Array.forEach (<anonymous>)
    at Monitoring.ts:1024:23
    at Array.forEach (<anonymous>)
    at MonitoringService.setTranslatedRules (Monitoring.ts:1015:30)
    at MonitoringService.handleTick (Monitoring.ts:541:12)
    at Monitoring.ts:488:14
    at simpleObserver.ts:21:21
    at Map.forEach (<anonymous>)
    at Observer.emit (simpleObserver.ts:19:37)
    at DerivService.handleMessage (DerivService.tsx:446:23)
    at WebSocket.<anonymous> (DerivService.tsx:395:52)
error @ intercept-console-error.ts:42
testLosingDigitsAsX @ digit-pattern-rules.js?v=1775837114943:515
verifyPatternMatch @ digit-pattern-rules.js?v=1775837114943:378
analyzeDigitPattern @ digit-pattern-rules.js?v=1775837114943:268
processDigitPatternRule @ digit-pattern-rules.js?v=1775837114943:54
checkRuleCondition @ generate-format.js?v=1775837116221:2044
checkRuleCondition @ Monitoring.ts:822
(anonymous) @ Monitoring.ts:1032
(anonymous) @ Monitoring.ts:1024
setTranslatedRules @ Monitoring.ts:1015
handleTick @ Monitoring.ts:541
(anonymous) @ Monitoring.ts:488
(anonymous) @ simpleObserver.ts:21
emit @ simpleObserver.ts:19
handleMessage @ DerivService.tsx:446
(anonymous) @ DerivService.tsx:395
digit-pattern-rules.js?v=1775837114943:515 ❌ [TEST LOSING DIGITS FLEXIBLE] Erro: ReferenceError: losingDigits is not defined
    at DigitPatternRulesProcessor.testDigitAsX (digit-pattern-rules.js?v=1775837114943:525:55)
    at DigitPatternRulesProcessor.testLosingDigitsAsX (digit-pattern-rules.js?v=1775837114943:488:33)
    at DigitPatternRulesProcessor.verifyPatternMatch (digit-pattern-rules.js?v=1775837114943:378:25)
    at DigitPatternRulesProcessor.analyzeDigitPattern (digit-pattern-rules.js?v=1775837114943:268:33)
    at DigitPatternRulesProcessor.processDigitPatternRule (digit-pattern-rules.js?v=1775837114943:54:33)
    at FormatGenerator.checkRuleCondition (generate-format.js?v=1775837116221:2044:66)
    at MonitoringService.checkRuleCondition (Monitoring.ts:822:30)
    at Monitoring.ts:1032:44
    at Array.forEach (<anonymous>)
    at Monitoring.ts:1024:23
    at Array.forEach (<anonymous>)
    at MonitoringService.setTranslatedRules (Monitoring.ts:1015:30)
    at MonitoringService.handleTick (Monitoring.ts:541:12)
    at Monitoring.ts:488:14
    at simpleObserver.ts:21:21
    at Map.forEach (<anonymous>)
    at Observer.emit (simpleObserver.ts:19:37)
    at DerivService.handleMessage (DerivService.tsx:446:23)
    at WebSocket.<anonymous> (DerivService.tsx:395:52)
error @ intercept-console-error.ts:42
testLosingDigitsAsX @ digit-pattern-rules.js?v=1775837114943:515
verifyPatternMatch @ digit-pattern-rules.js?v=1775837114943:378
analyzeDigitPattern @ digit-pattern-rules.js?v=1775837114943:268
processDigitPatternRule @ digit-pattern-rules.js?v=1775837114943:54
checkRuleCondition @ generate-format.js?v=1775837116221:2044
checkRuleCondition @ Monitoring.ts:822
(anonymous) @ Monitoring.ts:1032
(anonymous) @ Monitoring.ts:1024
setTranslatedRules @ Monitoring.ts:1015
handleTick @ Monitoring.ts:541
(anonymous) @ Monitoring.ts:488
(anonymous) @ simpleObserver.ts:21
emit @ simpleObserver.ts:19
handleMessage @ DerivService.tsx:446
(anonymous) @ DerivService.tsx:395
digit-pattern-rules.js?v=1775837114943:515 ❌ [TEST LOSING DIGITS FLEXIBLE] Erro: ReferenceError: losingDigits is not defined
    at DigitPatternRulesProcessor.testDigitAsX (digit-pattern-rules.js?v=1775837114943:525:55)
    at DigitPatternRulesProcessor.testLosingDigitsAsX (digit-pattern-rules.js?v=1775837114943:488:33)
    at DigitPatternRulesProcessor.verifyPatternMatch (digit-pattern-rules.js?v=1775837114943:378:25)
    at DigitPatternRulesProcessor.analyzeDigitPattern (digit-pattern-rules.js?v=1775837114943:268:33)
    at DigitPatternRulesProcessor.processDigitPatternRule (digit-pattern-rules.js?v=1775837114943:54:33)
    at FormatGenerator.checkRuleCondition (generate-format.js?v=1775837116221:2044:66)
    at MonitoringService.checkRuleCondition (Monitoring.ts:822:30)
    at Monitoring.ts:1032:44
    at Array.forEach (<anonymous>)
    at Monitoring.ts:1024:23
    at Array.forEach (<anonymous>)
    at MonitoringService.setTranslatedRules (Monitoring.ts:1015:30)
    at MonitoringService.handleTick (Monitoring.ts:541:12)
    at Monitoring.ts:488:14
    at simpleObserver.ts:21:21
    at Map.forEach (<anonymous>)
    at Observer.emit (simpleObserver.ts:19:37)
    at DerivService.handleMessage (DerivService.tsx:446:23)
    at WebSocket.<anonymous> (DerivService.tsx:395:52)
error @ intercept-console-error.ts:42
testLosingDigitsAsX @ digit-pattern-rules.js?v=1775837114943:515
verifyPatternMatch @ digit-pattern-rules.js?v=1775837114943:378
analyzeDigitPattern @ digit-pattern-rules.js?v=1775837114943:268
processDigitPatternRule @ digit-pattern-rules.js?v=1775837114943:54
checkRuleCondition @ generate-format.js?v=1775837116221:2044
checkRuleCondition @ Monitoring.ts:822
(anonymous) @ Monitoring.ts:1032
(anonymous) @ Monitoring.ts:1024
setTranslatedRules @ Monitoring.ts:1015
handleTick @ Monitoring.ts:541
(anonymous) @ Monitoring.ts:488
(anonymous) @ simpleObserver.ts:21
emit @ simpleObserver.ts:19
handleMessage @ DerivService.tsx:446
(anonymous) @ DerivService.tsx:395
digit-pattern-rules.js?v=1775837114943:515 ❌ [TEST LOSING DIGITS FLEXIBLE] Erro: ReferenceError: losingDigits is not defined
    at DigitPatternRulesProcessor.testDigitAsX (digit-pattern-rules.js?v=1775837114943:525:55)
    at DigitPatternRulesProcessor.testLosingDigitsAsX (digit-pattern-rules.js?v=1775837114943:488:33)
    at DigitPatternRulesProcessor.verifyPatternMatch (digit-pattern-rules.js?v=1775837114943:378:25)
    at DigitPatternRulesProcessor.analyzeDigitPattern (digit-pattern-rules.js?v=1775837114943:268:33)
    at DigitPatternRulesProcessor.processDigitPatternRule (digit-pattern-rules.js?v=1775837114943:54:33)
    at FormatGenerator.checkRuleCondition (generate-format.js?v=1775837116221:2044:66)
    at MonitoringService.checkRuleCondition (Monitoring.ts:822:30)
    at Monitoring.ts:1032:44
    at Array.forEach (<anonymous>)
    at Monitoring.ts:1024:23
    at Array.forEach (<anonymous>)
    at MonitoringService.setTranslatedRules (Monitoring.ts:1015:30)
    at MonitoringService.handleTick (Monitoring.ts:541:12)
    at Monitoring.ts:488:14
    at simpleObserver.ts:21:21
    at Map.forEach (<anonymous>)
    at Observer.emit (simpleObserver.ts:19:37)
    at DerivService.handleMessage (DerivService.tsx:446:23)
    at WebSocket.<anonymous> (DerivService.tsx:395:52)
error @ intercept-console-error.ts:42
testLosingDigitsAsX @ digit-pattern-rules.js?v=1775837114943:515
verifyPatternMatch @ digit-pattern-rules.js?v=1775837114943:378
analyzeDigitPattern @ digit-pattern-rules.js?v=1775837114943:268
processDigitPatternRule @ digit-pattern-rules.js?v=1775837114943:54
checkRuleCondition @ generate-format.js?v=1775837116221:2044
checkRuleCondition @ Monitoring.ts:822
(anonymous) @ Monitoring.ts:1032
(anonymous) @ Monitoring.ts:1024
setTranslatedRules @ Monitoring.ts:1015
handleTick @ Monitoring.ts:541
(anonymous) @ Monitoring.ts:488
(anonymous) @ simpleObserver.ts:21
emit @ simpleObserver.ts:19
handleMessage @ DerivService.tsx:446
(anonymous) @ DerivService.tsx:395
digit-pattern-rules.js?v=1775837114943:515 ❌ [TEST LOSING DIGITS FLEXIBLE] Erro: ReferenceError: losingDigits is not defined
    at DigitPatternRulesProcessor.testDigitAsX (digit-pattern-rules.js?v=1775837114943:525:55)
    at DigitPatternRulesProcessor.testLosingDigitsAsX (digit-pattern-rules.js?v=1775837114943:488:33)
    at DigitPatternRulesProcessor.verifyPatternMatch (digit-pattern-rules.js?v=1775837114943:378:25)
    at DigitPatternRulesProcessor.analyzeDigitPattern (digit-pattern-rules.js?v=1775837114943:268:33)
    at DigitPatternRulesProcessor.processDigitPatternRule (digit-pattern-rules.js?v=1775837114943:54:33)
    at FormatGenerator.checkRuleCondition (generate-format.js?v=1775837116221:2044:66)
    at MonitoringService.checkRuleCondition (Monitoring.ts:822:30)
    at Monitoring.ts:1032:44
    at Array.forEach (<anonymous>)
    at Monitoring.ts:1024:23
    at Array.forEach (<anonymous>)
    at MonitoringService.setTranslatedRules (Monitoring.ts:1015:30)
    at MonitoringService.handleTick (Monitoring.ts:541:12)
    at Monitoring.ts:488:14
    at simpleObserver.ts:21:21
    at Map.forEach (<anonymous>)
    at Observer.emit (simpleObserver.ts:19:37)
    at DerivService.handleMessage (DerivService.tsx:446:23)
    at WebSocket.<anonymous> (DerivService.tsx:395:52)
error @ intercept-console-error.ts:42
testLosingDigitsAsX @ digit-pattern-rules.js?v=1775837114943:515
verifyPatternMatch @ digit-pattern-rules.js?v=1775837114943:378
analyzeDigitPattern @ digit-pattern-rules.js?v=1775837114943:268
processDigitPatternRule @ digit-pattern-rules.js?v=1775837114943:54
checkRuleCondition @ generate-format.js?v=1775837116221:2044
checkRuleCondition @ Monitoring.ts:822
(anonymous) @ Monitoring.ts:1032
(anonymous) @ Monitoring.ts:1024
setTranslatedRules @ Monitoring.ts:1015
handleTick @ Monitoring.ts:541
(anonymous) @ Monitoring.ts:488
(anonymous) @ simpleObserver.ts:21
emit @ simpleObserver.ts:19
handleMessage @ DerivService.tsx:446
(anonymous) @ DerivService.tsx:395
digit-pattern-rules.js?v=1775837114943:515 ❌ [TEST LOSING DIGITS FLEXIBLE] Erro: ReferenceError: losingDigits is not defined
    at DigitPatternRulesProcessor.testDigitAsX (digit-pattern-rules.js?v=1775837114943:525:55)
    at DigitPatternRulesProcessor.testLosingDigitsAsX (digit-pattern-rules.js?v=1775837114943:488:33)
    at DigitPatternRulesProcessor.verifyPatternMatch (digit-pattern-rules.js?v=1775837114943:378:25)
    at DigitPatternRulesProcessor.analyzeDigitPattern (digit-pattern-rules.js?v=1775837114943:268:33)
    at DigitPatternRulesProcessor.processDigitPatternRule (digit-pattern-rules.js?v=1775837114943:54:33)
    at FormatGenerator.checkRuleCondition (generate-format.js?v=1775837116221:2044:66)
    at MonitoringService.checkRuleCondition (Monitoring.ts:822:30)
    at Monitoring.ts:1032:44
    at Array.forEach (<anonymous>)
    at Monitoring.ts:1024:23
    at Array.forEach (<anonymous>)
    at MonitoringService.setTranslatedRules (Monitoring.ts:1015:30)
    at MonitoringService.handleTick (Monitoring.ts:541:12)
    at Monitoring.ts:488:14
    at simpleObserver.ts:21:21
    at Map.forEach (<anonymous>)
    at Observer.emit (simpleObserver.ts:19:37)
    at DerivService.handleMessage (DerivService.tsx:446:23)
    at WebSocket.<anonymous> (DerivService.tsx:395:52)
error @ intercept-console-error.ts:42
testLosingDigitsAsX @ digit-pattern-rules.js?v=1775837114943:515
verifyPatternMatch @ digit-pattern-rules.js?v=1775837114943:378
analyzeDigitPattern @ digit-pattern-rules.js?v=1775837114943:268
processDigitPatternRule @ digit-pattern-rules.js?v=1775837114943:54
checkRuleCondition @ generate-format.js?v=1775837116221:2044
checkRuleCondition @ Monitoring.ts:822
(anonymous) @ Monitoring.ts:1032
(anonymous) @ Monitoring.ts:1024
setTranslatedRules @ Monitoring.ts:1015
handleTick @ Monitoring.ts:541
(anonymous) @ Monitoring.ts:488
(anonymous) @ simpleObserver.ts:21
emit @ simpleObserver.ts:19
handleMessage @ DerivService.tsx:446
(anonymous) @ DerivService.tsx:395
digit-pattern-rules.js?v=1775837114943:515 ❌ [TEST LOSING DIGITS FLEXIBLE] Erro: ReferenceError: losingDigits is not defined
    at DigitPatternRulesProcessor.testDigitAsX (digit-pattern-rules.js?v=1775837114943:525:55)
    at DigitPatternRulesProcessor.testLosingDigitsAsX (digit-pattern-rules.js?v=1775837114943:488:33)
    at DigitPatternRulesProcessor.verifyPatternMatch (digit-pattern-rules.js?v=1775837114943:378:25)
    at DigitPatternRulesProcessor.analyzeDigitPattern (digit-pattern-rules.js?v=1775837114943:268:33)
    at DigitPatternRulesProcessor.processDigitPatternRule (digit-pattern-rules.js?v=1775837114943:54:33)
    at FormatGenerator.checkRuleCondition (generate-format.js?v=1775837116221:2044:66)
    at MonitoringService.checkRuleCondition (Monitoring.ts:822:30)
    at Monitoring.ts:1032:44
    at Array.forEach (<anonymous>)
    at Monitoring.ts:1024:23
    at Array.forEach (<anonymous>)
    at MonitoringService.setTranslatedRules (Monitoring.ts:1015:30)
    at MonitoringService.handleTick (Monitoring.ts:541:12)
    at Monitoring.ts:488:14
    at simpleObserver.ts:21:21
    at Map.forEach (<anonymous>)
    at Observer.emit (simpleObserver.ts:19:37)
    at DerivService.handleMessage (DerivService.tsx:446:23)
    at WebSocket.<anonymous> (DerivService.tsx:395:52)
error @ intercept-console-error.ts:42
testLosingDigitsAsX @ digit-pattern-rules.js?v=1775837114943:515
verifyPatternMatch @ digit-pattern-rules.js?v=1775837114943:378
analyzeDigitPattern @ digit-pattern-rules.js?v=1775837114943:268
processDigitPatternRule @ digit-pattern-rules.js?v=1775837114943:54
checkRuleCondition @ generate-format.js?v=1775837116221:2044
checkRuleCondition @ Monitoring.ts:822
(anonymous) @ Monitoring.ts:1032
(anonymous) @ Monitoring.ts:1024
setTranslatedRules @ Monitoring.ts:1015
handleTick @ Monitoring.ts:541
(anonymous) @ Monitoring.ts:488
(anonymous) @ simpleObserver.ts:21
emit @ simpleObserver.ts:19
handleMessage @ DerivService.tsx:446
(anonymous) @ DerivService.tsx:395
digit-pattern-rules.js?v=1775837114943:515 ❌ [TEST LOSING DIGITS FLEXIBLE] Erro: ReferenceError: losingDigits is not defined
    at DigitPatternRulesProcessor.testDigitAsX (digit-pattern-rules.js?v=1775837114943:525:55)
    at DigitPatternRulesProcessor.testLosingDigitsAsX (digit-pattern-rules.js?v=1775837114943:488:33)
    at DigitPatternRulesProcessor.verifyPatternMatch (digit-pattern-rules.js?v=1775837114943:378:25)
    at DigitPatternRulesProcessor.analyzeDigitPattern (digit-pattern-rules.js?v=1775837114943:268:33)
    at DigitPatternRulesProcessor.processDigitPatternRule (digit-pattern-rules.js?v=1775837114943:54:33)
    at FormatGenerator.checkRuleCondition (generate-format.js?v=1775837116221:2044:66)
    at MonitoringService.checkRuleCondition (Monitoring.ts:822:30)
    at Monitoring.ts:1032:44
    at Array.forEach (<anonymous>)
    at Monitoring.ts:1024:23
    at Array.forEach (<anonymous>)
    at MonitoringService.setTranslatedRules (Monitoring.ts:1015:30)
    at MonitoringService.handleTick (Monitoring.ts:541:12)
    at Monitoring.ts:488:14
    at simpleObserver.ts:21:21
    at Map.forEach (<anonymous>)
    at Observer.emit (simpleObserver.ts:19:37)
    at DerivService.handleMessage (DerivService.tsx:446:23)
    at WebSocket.<anonymous> (DerivService.tsx:395:52)
error @ intercept-console-error.ts:42
testLosingDigitsAsX @ digit-pattern-rules.js?v=1775837114943:515
verifyPatternMatch @ digit-pattern-rules.js?v=1775837114943:378
analyzeDigitPattern @ digit-pattern-rules.js?v=1775837114943:268
processDigitPatternRule @ digit-pattern-rules.js?v=1775837114943:54
checkRuleCondition @ generate-format.js?v=1775837116221:2044
checkRuleCondition @ Monitoring.ts:822
(anonymous) @ Monitoring.ts:1032
(anonymous) @ Monitoring.ts:1024
setTranslatedRules @ Monitoring.ts:1015
handleTick @ Monitoring.ts:541
(anonymous) @ Monitoring.ts:488
(anonymous) @ simpleObserver.ts:21
emit @ simpleObserver.ts:19
handleMessage @ DerivService.tsx:446
(anonymous) @ DerivService.tsx:395
digit-pattern-rules.js?v=1775837114943:515 ❌ [TEST LOSING DIGITS FLEXIBLE] Erro: ReferenceError: losingDigits is not defined
    at DigitPatternRulesProcessor.testDigitAsX (digit-pattern-rules.js?v=1775837114943:525:55)
    at DigitPatternRulesProcessor.testLosingDigitsAsX (digit-pattern-rules.js?v=1775837114943:488:33)
    at DigitPatternRulesProcessor.verifyPatternMatch (digit-pattern-rules.js?v=1775837114943:378:25)
    at DigitPatternRulesProcessor.analyzeDigitPattern (digit-pattern-rules.js?v=1775837114943:268:33)
    at DigitPatternRulesProcessor.processDigitPatternRule (digit-pattern-rules.js?v=1775837114943:54:33)
    at FormatGenerator.checkRuleCondition (generate-format.js?v=1775837116221:2044:66)
    at MonitoringService.checkRuleCondition (Monitoring.ts:822:30)
    at Monitoring.ts:1032:44
    at Array.forEach (<anonymous>)
    at Monitoring.ts:1024:23
    at Array.forEach (<anonymous>)
    at MonitoringService.setTranslatedRules (Monitoring.ts:1015:30)
    at MonitoringService.handleTick (Monitoring.ts:541:12)
    at Monitoring.ts:488:14
    at simpleObserver.ts:21:21
    at Map.forEach (<anonymous>)
    at Observer.emit (simpleObserver.ts:19:37)
    at DerivService.handleMessage (DerivService.tsx:446:23)
    at WebSocket.<anonymous> (DerivService.tsx:395:52)
error @ intercept-console-error.ts:42
testLosingDigitsAsX @ digit-pattern-rules.js?v=1775837114943:515
verifyPatternMatch @ digit-pattern-rules.js?v=1775837114943:378
analyzeDigitPattern @ digit-pattern-rules.js?v=1775837114943:268
processDigitPatternRule @ digit-pattern-rules.js?v=1775837114943:54
checkRuleCondition @ generate-format.js?v=1775837116221:2044
checkRuleCondition @ Monitoring.ts:822
(anonymous) @ Monitoring.ts:1032
(anonymous) @ Monitoring.ts:1024
setTranslatedRules @ Monitoring.ts:1015
handleTick @ Monitoring.ts:541
(anonymous) @ Monitoring.ts:488
(anonymous) @ simpleObserver.ts:21
emit @ simpleObserver.ts:19
handleMessage @ DerivService.tsx:446
(anonymous) @ DerivService.tsx:395
digit-pattern-rules.js?v=1775837114943:515 ❌ [TEST LOSING DIGITS FLEXIBLE] Erro: ReferenceError: losingDigits is not defined
    at DigitPatternRulesProcessor.testDigitAsX (digit-pattern-rules.js?v=1775837114943:525:55)
    at DigitPatternRulesProcessor.testLosingDigitsAsX (digit-pattern-rules.js?v=1775837114943:488:33)
    at DigitPatternRulesProcessor.verifyPatternMatch (digit-pattern-rules.js?v=1775837114943:378:25)
    at DigitPatternRulesProcessor.analyzeDigitPattern (digit-pattern-rules.js?v=1775837114943:268:33)
    at DigitPatternRulesProcessor.processDigitPatternRule (digit-pattern-rules.js?v=1775837114943:54:33)
    at FormatGenerator.checkRuleCondition (generate-format.js?v=1775837116221:2044:66)
    at MonitoringService.checkRuleCondition (Monitoring.ts:822:30)
    at Monitoring.ts:1032:44
    at Array.forEach (<anonymous>)
    at Monitoring.ts:1024:23
    at Array.forEach (<anonymous>)
    at MonitoringService.setTranslatedRules (Monitoring.ts:1015:30)
    at MonitoringService.handleTick (Monitoring.ts:541:12)
    at Monitoring.ts:488:14
    at simpleObserver.ts:21:21
    at Map.forEach (<anonymous>)
    at Observer.emit (simpleObserver.ts:19:37)
    at DerivService.handleMessage (DerivService.tsx:446:23)
    at WebSocket.<anonymous> (DerivService.tsx:395:52)
error @ intercept-console-error.ts:42
testLosingDigitsAsX @ digit-pattern-rules.js?v=1775837114943:515
verifyPatternMatch @ digit-pattern-rules.js?v=1775837114943:378
analyzeDigitPattern @ digit-pattern-rules.js?v=1775837114943:268
processDigitPatternRule @ digit-pattern-rules.js?v=1775837114943:54
checkRuleCondition @ generate-format.js?v=1775837116221:2044
checkRuleCondition @ Monitoring.ts:822
(anonymous) @ Monitoring.ts:1032
(anonymous) @ Monitoring.ts:1024
setTranslatedRules @ Monitoring.ts:1015
handleTick @ Monitoring.ts:541
(anonymous) @ Monitoring.ts:488
(anonymous) @ simpleObserver.ts:21
emit @ simpleObserver.ts:19
handleMessage @ DerivService.tsx:446
(anonymous) @ DerivService.tsx:395
digit-pattern-rules.js?v=1775837114943:515 ❌ [TEST LOSING DIGITS FLEXIBLE] Erro: ReferenceError: losingDigits is not defined
    at DigitPatternRulesProcessor.testDigitAsX (digit-pattern-rules.js?v=1775837114943:525:55)
    at DigitPatternRulesProcessor.testLosingDigitsAsX (digit-pattern-rules.js?v=1775837114943:488:33)
    at DigitPatternRulesProcessor.verifyPatternMatch (digit-pattern-rules.js?v=1775837114943:378:25)
    at DigitPatternRulesProcessor.analyzeDigitPattern (digit-pattern-rules.js?v=1775837114943:268:33)
    at DigitPatternRulesProcessor.processDigitPatternRule (digit-pattern-rules.js?v=1775837114943:54:33)
    at FormatGenerator.checkRuleCondition (generate-format.js?v=1775837116221:2044:66)
    at MonitoringService.checkRuleCondition (Monitoring.ts:822:30)
    at Monitoring.ts:1032:44
    at Array.forEach (<anonymous>)
    at Monitoring.ts:1024:23
    at Array.forEach (<anonymous>)
    at MonitoringService.setTranslatedRules (Monitoring.ts:1015:30)
    at MonitoringService.handleTick (Monitoring.ts:541:12)
    at Monitoring.ts:488:14
    at simpleObserver.ts:21:21
    at Map.forEach (<anonymous>)
    at Observer.emit (simpleObserver.ts:19:37)
    at DerivService.handleMessage (DerivService.tsx:446:23)
    at WebSocket.<anonymous> (DerivService.tsx:395:52)
error @ intercept-console-error.ts:42
testLosingDigitsAsX @ digit-pattern-rules.js?v=1775837114943:515
verifyPatternMatch @ digit-pattern-rules.js?v=1775837114943:378
analyzeDigitPattern @ digit-pattern-rules.js?v=1775837114943:268
processDigitPatternRule @ digit-pattern-rules.js?v=1775837114943:54
checkRuleCondition @ generate-format.js?v=1775837116221:2044
checkRuleCondition @ Monitoring.ts:822
(anonymous) @ Monitoring.ts:1032
(anonymous) @ Monitoring.ts:1024
setTranslatedRules @ Monitoring.ts:1015
handleTick @ Monitoring.ts:541
(anonymous) @ Monitoring.ts:488
(anonymous) @ simpleObserver.ts:21
emit @ simpleObserver.ts:19
handleMessage @ DerivService.tsx:446
(anonymous) @ DerivService.tsx:395
digit-pattern-rules.js?v=1775837114943:515 ❌ [TEST LOSING DIGITS FLEXIBLE] Erro: ReferenceError: losingDigits is not defined
    at DigitPatternRulesProcessor.testDigitAsX (digit-pattern-rules.js?v=1775837114943:525:55)
    at DigitPatternRulesProcessor.testLosingDigitsAsX (digit-pattern-rules.js?v=1775837114943:488:33)
    at DigitPatternRulesProcessor.verifyPatternMatch (digit-pattern-rules.js?v=1775837114943:378:25)
    at DigitPatternRulesProcessor.analyzeDigitPattern (digit-pattern-rules.js?v=1775837114943:268:33)
    at DigitPatternRulesProcessor.processDigitPatternRule (digit-pattern-rules.js?v=1775837114943:54:33)
    at FormatGenerator.checkRuleCondition (generate-format.js?v=1775837116221:2044:66)
    at MonitoringService.checkRuleCondition (Monitoring.ts:822:30)
    at Monitoring.ts:1032:44
    at Array.forEach (<anonymous>)
    at Monitoring.ts:1024:23
    at Array.forEach (<anonymous>)
    at MonitoringService.setTranslatedRules (Monitoring.ts:1015:30)
    at MonitoringService.handleTick (Monitoring.ts:541:12)
    at Monitoring.ts:488:14
    at simpleObserver.ts:21:21
    at Map.forEach (<anonymous>)
    at Observer.emit (simpleObserver.ts:19:37)
    at DerivService.handleMessage (DerivService.tsx:446:23)
    at WebSocket.<anonymous> (DerivService.tsx:395:52)
error @ intercept-console-error.ts:42
testLosingDigitsAsX @ digit-pattern-rules.js?v=1775837114943:515
verifyPatternMatch @ digit-pattern-rules.js?v=1775837114943:378
analyzeDigitPattern @ digit-pattern-rules.js?v=1775837114943:268
processDigitPatternRule @ digit-pattern-rules.js?v=1775837114943:54
checkRuleCondition @ generate-format.js?v=1775837116221:2044
checkRuleCondition @ Monitoring.ts:822
(anonymous) @ Monitoring.ts:1032
(anonymous) @ Monitoring.ts:1024
setTranslatedRules @ Monitoring.ts:1015
handleTick @ Monitoring.ts:541
(anonymous) @ Monitoring.ts:488
(anonymous) @ simpleObserver.ts:21
emit @ simpleObserver.ts:19
handleMessage @ DerivService.tsx:446
(anonymous) @ DerivService.tsx:395
digit-pattern-rules.js?v=1775837114943:515 ❌ [TEST LOSING DIGITS FLEXIBLE] Erro: ReferenceError: losingDigits is not defined
    at DigitPatternRulesProcessor.testDigitAsX (digit-pattern-rules.js?v=1775837114943:525:55)
    at DigitPatternRulesProcessor.testLosingDigitsAsX (digit-pattern-rules.js?v=1775837114943:488:33)
    at DigitPatternRulesProcessor.verifyPatternMatch (digit-pattern-rules.js?v=1775837114943:378:25)
    at DigitPatternRulesProcessor.analyzeDigitPattern (digit-pattern-rules.js?v=1775837114943:268:33)
    at DigitPatternRulesProcessor.processDigitPatternRule (digit-pattern-rules.js?v=1775837114943:54:33)
    at FormatGenerator.checkRuleCondition (generate-format.js?v=1775837116221:2044:66)
    at MonitoringService.checkRuleCondition (Monitoring.ts:822:30)
    at Monitoring.ts:1032:44
    at Array.forEach (<anonymous>)
    at Monitoring.ts:1024:23
    at Array.forEach (<anonymous>)
    at MonitoringService.setTranslatedRules (Monitoring.ts:1015:30)
    at MonitoringService.handleTick (Monitoring.ts:541:12)
    at Monitoring.ts:488:14
    at simpleObserver.ts:21:21
    at Map.forEach (<anonymous>)
    at Observer.emit (simpleObserver.ts:19:37)
    at DerivService.handleMessage (DerivService.tsx:446:23)
    at WebSocket.<anonymous> (DerivService.tsx:395:52)
error @ intercept-console-error.ts:42
testLosingDigitsAsX @ digit-pattern-rules.js?v=1775837114943:515
verifyPatternMatch @ digit-pattern-rules.js?v=1775837114943:378
analyzeDigitPattern @ digit-pattern-rules.js?v=1775837114943:268
processDigitPatternRule @ digit-pattern-rules.js?v=1775837114943:54
checkRuleCondition @ generate-format.js?v=1775837116221:2044
checkRuleCondition @ Monitoring.ts:822
(anonymous) @ Monitoring.ts:1032
(anonymous) @ Monitoring.ts:1024
setTranslatedRules @ Monitoring.ts:1015
handleTick @ Monitoring.ts:541
(anonymous) @ Monitoring.ts:488
(anonymous) @ simpleObserver.ts:21
emit @ simpleObserver.ts:19
handleMessage @ DerivService.tsx:446
(anonymous) @ DerivService.tsx:395
digit-pattern-rules.js?v=1775837114943:515 ❌ [TEST LOSING DIGITS FLEXIBLE] Erro: ReferenceError: losingDigits is not defined
    at DigitPatternRulesProcessor.testDigitAsX (digit-pattern-rules.js?v=1775837114943:525:55)
    at DigitPatternRulesProcessor.testLosingDigitsAsX (digit-pattern-rules.js?v=1775837114943:488:33)
    at DigitPatternRulesProcessor.verifyPatternMatch (digit-pattern-rules.js?v=1775837114943:378:25)
    at DigitPatternRulesProcessor.analyzeDigitPattern (digit-pattern-rules.js?v=1775837114943:268:33)
    at DigitPatternRulesProcessor.processDigitPatternRule (digit-pattern-rules.js?v=1775837114943:54:33)
    at FormatGenerator.checkRuleCondition (generate-format.js?v=1775837116221:2044:66)
    at MonitoringService.checkRuleCondition (Monitoring.ts:822:30)
    at Monitoring.ts:1032:44
    at Array.forEach (<anonymous>)
    at Monitoring.ts:1024:23
    at Array.forEach (<anonymous>)
    at MonitoringService.setTranslatedRules (Monitoring.ts:1015:30)
    at MonitoringService.handleTick (Monitoring.ts:541:12)
    at Monitoring.ts:488:14
    at simpleObserver.ts:21:21
    at Map.forEach (<anonymous>)
    at Observer.emit (simpleObserver.ts:19:37)
    at DerivService.handleMessage (DerivService.tsx:446:23)
    at WebSocket.<anonymous> (DerivService.tsx:395:52)
error @ intercept-console-error.ts:42
testLosingDigitsAsX @ digit-pattern-rules.js?v=1775837114943:515
verifyPatternMatch @ digit-pattern-rules.js?v=1775837114943:378
analyzeDigitPattern @ digit-pattern-rules.js?v=1775837114943:268
processDigitPatternRule @ digit-pattern-rules.js?v=1775837114943:54
checkRuleCondition @ generate-format.js?v=1775837116221:2044
checkRuleCondition @ Monitoring.ts:822
(anonymous) @ Monitoring.ts:1032
(anonymous) @ Monitoring.ts:1024
setTranslatedRules @ Monitoring.ts:1015
handleTick @ Monitoring.ts:541
(anonymous) @ Monitoring.ts:488
(anonymous) @ simpleObserver.ts:21
emit @ simpleObserver.ts:19
handleMessage @ DerivService.tsx:446
(anonymous) @ DerivService.tsx:395
digit-pattern-rules.js?v=1775837114943:515 ❌ [TEST LOSING DIGITS FLEXIBLE] Erro: ReferenceError: losingDigits is not defined
    at DigitPatternRulesProcessor.testDigitAsX (digit-pattern-rules.js?v=1775837114943:525:55)
    at DigitPatternRulesProcessor.testLosingDigitsAsX (digit-pattern-rules.js?v=1775837114943:488:33)
    at DigitPatternRulesProcessor.verifyPatternMatch (digit-pattern-rules.js?v=1775837114943:378:25)
    at DigitPatternRulesProcessor.analyzeDigitPattern (digit-pattern-rules.js?v=1775837114943:268:33)
    at DigitPatternRulesProcessor.processDigitPatternRule (digit-pattern-rules.js?v=1775837114943:54:33)
    at FormatGenerator.checkRuleCondition (generate-format.js?v=1775837116221:2044:66)
    at MonitoringService.checkRuleCondition (Monitoring.ts:822:30)
    at Monitoring.ts:1032:44
    at Array.forEach (<anonymous>)
    at Monitoring.ts:1024:23
    at Array.forEach (<anonymous>)
    at MonitoringService.setTranslatedRules (Monitoring.ts:1015:30)
    at MonitoringService.handleTick (Monitoring.ts:541:12)
    at Monitoring.ts:488:14
    at simpleObserver.ts:21:21
    at Map.forEach (<anonymous>)
    at Observer.emit (simpleObserver.ts:19:37)
    at DerivService.handleMessage (DerivService.tsx:446:23)
    at WebSocket.<anonymous> (DerivService.tsx:395:52)
error @ intercept-console-error.ts:42
testLosingDigitsAsX @ digit-pattern-rules.js?v=1775837114943:515
verifyPatternMatch @ digit-pattern-rules.js?v=1775837114943:378
analyzeDigitPattern @ digit-pattern-rules.js?v=1775837114943:268
processDigitPatternRule @ digit-pattern-rules.js?v=1775837114943:54
checkRuleCondition @ generate-format.js?v=1775837116221:2044
checkRuleCondition @ Monitoring.ts:822
(anonymous) @ Monitoring.ts:1032
(anonymous) @ Monitoring.ts:1024
setTranslatedRules @ Monitoring.ts:1015
handleTick @ Monitoring.ts:541
(anonymous) @ Monitoring.ts:488
(anonymous) @ simpleObserver.ts:21
emit @ simpleObserver.ts:19
handleMessage @ DerivService.tsx:446
(anonymous) @ DerivService.tsx:395
digit-pattern-rules.js?v=1775837114943:515 ❌ [TEST LOSING DIGITS FLEXIBLE] Erro: ReferenceError: losingDigits is not defined
    at DigitPatternRulesProcessor.testDigitAsX (digit-pattern-rules.js?v=1775837114943:525:55)
    at DigitPatternRulesProcessor.testLosingDigitsAsX (digit-pattern-rules.js?v=1775837114943:488:33)
    at DigitPatternRulesProcessor.verifyPatternMatch (digit-pattern-rules.js?v=1775837114943:378:25)
    at DigitPatternRulesProcessor.analyzeDigitPattern (digit-pattern-rules.js?v=1775837114943:268:33)
    at DigitPatternRulesProcessor.processDigitPatternRule (digit-pattern-rules.js?v=1775837114943:54:33)
    at FormatGenerator.checkRuleCondition (generate-format.js?v=1775837116221:2044:66)
    at MonitoringService.checkRuleCondition (Monitoring.ts:822:30)
    at Monitoring.ts:1032:44
    at Array.forEach (<anonymous>)
    at Monitoring.ts:1024:23
    at Array.forEach (<anonymous>)
    at MonitoringService.setTranslatedRules (Monitoring.ts:1015:30)
    at MonitoringService.handleTick (Monitoring.ts:541:12)
    at Monitoring.ts:488:14
    at simpleObserver.ts:21:21
    at Map.forEach (<anonymous>)
    at Observer.emit (simpleObserver.ts:19:37)
    at DerivService.handleMessage (DerivService.tsx:446:23)
    at WebSocket.<anonymous> (DerivService.tsx:395:52)
error @ intercept-console-error.ts:42
testLosingDigitsAsX @ digit-pattern-rules.js?v=1775837114943:515
verifyPatternMatch @ digit-pattern-rules.js?v=1775837114943:378
analyzeDigitPattern @ digit-pattern-rules.js?v=1775837114943:268
processDigitPatternRule @ digit-pattern-rules.js?v=1775837114943:54
checkRuleCondition @ generate-format.js?v=1775837116221:2044
checkRuleCondition @ Monitoring.ts:822
(anonymous) @ Monitoring.ts:1032
(anonymous) @ Monitoring.ts:1024
setTranslatedRules @ Monitoring.ts:1015
handleTick @ Monitoring.ts:541
(anonymous) @ Monitoring.ts:488
(anonymous) @ simpleObserver.ts:21
emit @ simpleObserver.ts:19
handleMessage @ DerivService.tsx:446
(anonymous) @ DerivService.tsx:395
digit-pattern-rules.js?v=1775837114943:515 ❌ [TEST LOSING DIGITS FLEXIBLE] Erro: ReferenceError: losingDigits is not defined
    at DigitPatternRulesProcessor.testDigitAsX (digit-pattern-rules.js?v=1775837114943:525:55)
    at DigitPatternRulesProcessor.testLosingDigitsAsX (digit-pattern-rules.js?v=1775837114943:488:33)
    at DigitPatternRulesProcessor.verifyPatternMatch (digit-pattern-rules.js?v=1775837114943:378:25)
    at DigitPatternRulesProcessor.analyzeDigitPattern (digit-pattern-rules.js?v=1775837114943:268:33)
    at DigitPatternRulesProcessor.processDigitPatternRule (digit-pattern-rules.js?v=1775837114943:54:33)
    at FormatGenerator.checkRuleCondition (generate-format.js?v=1775837116221:2044:66)
    at MonitoringService.checkRuleCondition (Monitoring.ts:822:30)
    at Monitoring.ts:1032:44
    at Array.forEach (<anonymous>)
    at Monitoring.ts:1024:23
    at Array.forEach (<anonymous>)
    at MonitoringService.setTranslatedRules (Monitoring.ts:1015:30)
    at MonitoringService.handleTick (Monitoring.ts:541:12)
    at Monitoring.ts:488:14
    at simpleObserver.ts:21:21
    at Map.forEach (<anonymous>)
    at Observer.emit (simpleObserver.ts:19:37)
    at DerivService.handleMessage (DerivService.tsx:446:23)
    at WebSocket.<anonymous> (DerivService.tsx:395:52)
error @ intercept-console-error.ts:42
testLosingDigitsAsX @ digit-pattern-rules.js?v=1775837114943:515
verifyPatternMatch @ digit-pattern-rules.js?v=1775837114943:378
analyzeDigitPattern @ digit-pattern-rules.js?v=1775837114943:268
processDigitPatternRule @ digit-pattern-rules.js?v=1775837114943:54
checkRuleCondition @ generate-format.js?v=1775837116221:2044
checkRuleCondition @ Monitoring.ts:822
(anonymous) @ Monitoring.ts:1032
(anonymous) @ Monitoring.ts:1024
setTranslatedRules @ Monitoring.ts:1015
handleTick @ Monitoring.ts:541
(anonymous) @ Monitoring.ts:488
(anonymous) @ simpleObserver.ts:21
emit @ simpleObserver.ts:19
handleMessage @ DerivService.tsx:446
(anonymous) @ DerivService.tsx:395
digit-pattern-rules.js?v=1775837114943:515 ❌ [TEST LOSING DIGITS FLEXIBLE] Erro: ReferenceError: losingDigits is not defined
    at DigitPatternRulesProcessor.testDigitAsX (digit-pattern-rules.js?v=1775837114943:525:55)
    at DigitPatternRulesProcessor.testLosingDigitsAsX (digit-pattern-rules.js?v=1775837114943:488:33)
    at DigitPatternRulesProcessor.verifyPatternMatch (digit-pattern-rules.js?v=1775837114943:378:25)
    at DigitPatternRulesProcessor.analyzeDigitPattern (digit-pattern-rules.js?v=1775837114943:268:33)
    at DigitPatternRulesProcessor.processDigitPatternRule (digit-pattern-rules.js?v=1775837114943:54:33)
    at FormatGenerator.checkRuleCondition (generate-format.js?v=1775837116221:2044:66)
    at MonitoringService.checkRuleCondition (Monitoring.ts:822:30)
    at Monitoring.ts:1032:44
    at Array.forEach (<anonymous>)
    at Monitoring.ts:1024:23
    at Array.forEach (<anonymous>)
    at MonitoringService.setTranslatedRules (Monitoring.ts:1015:30)
    at MonitoringService.handleTick (Monitoring.ts:541:12)
    at Monitoring.ts:488:14
    at simpleObserver.ts:21:21
    at Map.forEach (<anonymous>)
    at Observer.emit (simpleObserver.ts:19:37)
    at DerivService.handleMessage (DerivService.tsx:446:23)
    at WebSocket.<anonymous> (DerivService.tsx:395:52)
error @ intercept-console-error.ts:42
testLosingDigitsAsX @ digit-pattern-rules.js?v=1775837114943:515
verifyPatternMatch @ digit-pattern-rules.js?v=1775837114943:378
analyzeDigitPattern @ digit-pattern-rules.js?v=1775837114943:268
processDigitPatternRule @ digit-pattern-rules.js?v=1775837114943:54
checkRuleCondition @ generate-format.js?v=1775837116221:2044
checkRuleCondition @ Monitoring.ts:822
(anonymous) @ Monitoring.ts:1032
(anonymous) @ Monitoring.ts:1024
setTranslatedRules @ Monitoring.ts:1015
handleTick @ Monitoring.ts:541
(anonymous) @ Monitoring.ts:488
(anonymous) @ simpleObserver.ts:21
emit @ simpleObserver.ts:19
handleMessage @ DerivService.tsx:446
(anonymous) @ DerivService.tsx:395
digit-pattern-rules.js?v=1775837114943:515 ❌ [TEST LOSING DIGITS FLEXIBLE] Erro: ReferenceError: losingDigits is not defined
    at DigitPatternRulesProcessor.testDigitAsX (digit-pattern-rules.js?v=1775837114943:525:55)
    at DigitPatternRulesProcessor.testLosingDigitsAsX (digit-pattern-rules.js?v=1775837114943:488:33)
    at DigitPatternRulesProcessor.verifyPatternMatch (digit-pattern-rules.js?v=1775837114943:378:25)
    at DigitPatternRulesProcessor.analyzeDigitPattern (digit-pattern-rules.js?v=1775837114943:268:33)
    at DigitPatternRulesProcessor.processDigitPatternRule (digit-pattern-rules.js?v=1775837114943:54:33)
    at FormatGenerator.checkRuleCondition (generate-format.js?v=1775837116221:2044:66)
    at MonitoringService.checkRuleCondition (Monitoring.ts:822:30)
    at Monitoring.ts:1032:44
    at Array.forEach (<anonymous>)
    at Monitoring.ts:1024:23
    at Array.forEach (<anonymous>)
    at MonitoringService.setTranslatedRules (Monitoring.ts:1015:30)
    at MonitoringService.handleTick (Monitoring.ts:541:12)
    at Monitoring.ts:488:14
    at simpleObserver.ts:21:21
    at Map.forEach (<anonymous>)
    at Observer.emit (simpleObserver.ts:19:37)
    at DerivService.handleMessage (DerivService.tsx:446:23)
    at WebSocket.<anonymous> (DerivService.tsx:395:52)
error @ intercept-console-error.ts:42
testLosingDigitsAsX @ digit-pattern-rules.js?v=1775837114943:515
verifyPatternMatch @ digit-pattern-rules.js?v=1775837114943:378
analyzeDigitPattern @ digit-pattern-rules.js?v=1775837114943:268
processDigitPatternRule @ digit-pattern-rules.js?v=1775837114943:54
checkRuleCondition @ generate-format.js?v=1775837116221:2044
checkRuleCondition @ Monitoring.ts:822
(anonymous) @ Monitoring.ts:1032
(anonymous) @ Monitoring.ts:1024
setTranslatedRules @ Monitoring.ts:1015
handleTick @ Monitoring.ts:541
(anonymous) @ Monitoring.ts:488
(anonymous) @ simpleObserver.ts:21
emit @ simpleObserver.ts:19
handleMessage @ DerivService.tsx:446
(anonymous) @ DerivService.tsx:395
digit-pattern-rules.js?v=1775837114943:515 ❌ [TEST LOSING DIGITS FLEXIBLE] Erro: ReferenceError: losingDigits is not defined
    at DigitPatternRulesProcessor.testDigitAsX (digit-pattern-rules.js?v=1775837114943:525:55)
    at DigitPatternRulesProcessor.testLosingDigitsAsX (digit-pattern-rules.js?v=1775837114943:488:33)
    at DigitPatternRulesProcessor.verifyPatternMatch (digit-pattern-rules.js?v=1775837114943:378:25)
    at DigitPatternRulesProcessor.analyzeDigitPattern (digit-pattern-rules.js?v=1775837114943:268:33)
    at DigitPatternRulesProcessor.processDigitPatternRule (digit-pattern-rules.js?v=1775837114943:54:33)
    at FormatGenerator.checkRuleCondition (generate-format.js?v=1775837116221:2044:66)
    at MonitoringService.checkRuleCondition (Monitoring.ts:822:30)
    at Monitoring.ts:1032:44
    at Array.forEach (<anonymous>)
    at Monitoring.ts:1024:23
    at Array.forEach (<anonymous>)
    at MonitoringService.setTranslatedRules (Monitoring.ts:1015:30)
    at MonitoringService.handleTick (Monitoring.ts:541:12)
    at Monitoring.ts:488:14
    at simpleObserver.ts:21:21
    at Map.forEach (<anonymous>)
    at Observer.emit (simpleObserver.ts:19:37)
    at DerivService.handleMessage (DerivService.tsx:446:23)
    at WebSocket.<anonymous> (DerivService.tsx:395:52)
error @ intercept-console-error.ts:42
testLosingDigitsAsX @ digit-pattern-rules.js?v=1775837114943:515
verifyPatternMatch @ digit-pattern-rules.js?v=1775837114943:378
analyzeDigitPattern @ digit-pattern-rules.js?v=1775837114943:268
processDigitPatternRule @ digit-pattern-rules.js?v=1775837114943:54
checkRuleCondition @ generate-format.js?v=1775837116221:2044
checkRuleCondition @ Monitoring.ts:822
(anonymous) @ Monitoring.ts:1032
(anonymous) @ Monitoring.ts:1024
setTranslatedRules @ Monitoring.ts:1015
handleTick @ Monitoring.ts:541
(anonymous) @ Monitoring.ts:488
(anonymous) @ simpleObserver.ts:21
emit @ simpleObserver.ts:19
handleMessage @ DerivService.tsx:446
(anonymous) @ DerivService.tsx:395
digit-pattern-rules.js?v=1775837114943:515 ❌ [TEST LOSING DIGITS FLEXIBLE] Erro: ReferenceError: losingDigits is not defined
    at DigitPatternRulesProcessor.testDigitAsX (digit-pattern-rules.js?v=1775837114943:525:55)
    at DigitPatternRulesProcessor.testLosingDigitsAsX (digit-pattern-rules.js?v=1775837114943:488:33)
    at DigitPatternRulesProcessor.verifyPatternMatch (digit-pattern-rules.js?v=1775837114943:378:25)
    at DigitPatternRulesProcessor.analyzeDigitPattern (digit-pattern-rules.js?v=1775837114943:268:33)
    at DigitPatternRulesProcessor.processDigitPatternRule (digit-pattern-rules.js?v=1775837114943:54:33)
    at FormatGenerator.checkRuleCondition (generate-format.js?v=1775837116221:2044:66)
    at MonitoringService.checkRuleCondition (Monitoring.ts:822:30)
    at Monitoring.ts:1032:44
    at Array.forEach (<anonymous>)
    at Monitoring.ts:1024:23
    at Array.forEach (<anonymous>)
    at MonitoringService.setTranslatedRules (Monitoring.ts:1015:30)
    at MonitoringService.handleTick (Monitoring.ts:541:12)
    at Monitoring.ts:488:14
    at simpleObserver.ts:21:21
    at Map.forEach (<anonymous>)
    at Observer.emit (simpleObserver.ts:19:37)
    at DerivService.handleMessage (DerivService.tsx:446:23)
    at WebSocket.<anonymous> (DerivService.tsx:395:52)
error @ intercept-console-error.ts:42
testLosingDigitsAsX @ digit-pattern-rules.js?v=1775837114943:515
verifyPatternMatch @ digit-pattern-rules.js?v=1775837114943:378
analyzeDigitPattern @ digit-pattern-rules.js?v=1775837114943:268
processDigitPatternRule @ digit-pattern-rules.js?v=1775837114943:54
checkRuleCondition @ generate-format.js?v=1775837116221:2044
checkRuleCondition @ Monitoring.ts:822
(anonymous) @ Monitoring.ts:1032
(anonymous) @ Monitoring.ts:1024
setTranslatedRules @ Monitoring.ts:1015
handleTick @ Monitoring.ts:541
(anonymous) @ Monitoring.ts:488
(anonymous) @ simpleObserver.ts:21
emit @ simpleObserver.ts:19
handleMessage @ DerivService.tsx:446
(anonymous) @ DerivService.tsx:395
digit-pattern-rules.js?v=1775837114943:515 ❌ [TEST LOSING DIGITS FLEXIBLE] Erro: ReferenceError: losingDigits is not defined
    at DigitPatternRulesProcessor.testDigitAsX (digit-pattern-rules.js?v=1775837114943:525:55)
    at DigitPatternRulesProcessor.testLosingDigitsAsX (digit-pattern-rules.js?v=1775837114943:488:33)
    at DigitPatternRulesProcessor.verifyPatternMatch (digit-pattern-rules.js?v=1775837114943:378:25)
    at DigitPatternRulesProcessor.analyzeDigitPattern (digit-pattern-rules.js?v=1775837114943:268:33)
    at DigitPatternRulesProcessor.processDigitPatternRule (digit-pattern-rules.js?v=1775837114943:54:33)
    at FormatGenerator.checkRuleCondition (generate-format.js?v=1775837116221:2044:66)
    at MonitoringService.checkRuleCondition (Monitoring.ts:822:30)
    at Monitoring.ts:1032:44
    at Array.forEach (<anonymous>)
    at Monitoring.ts:1024:23
    at Array.forEach (<anonymous>)
    at MonitoringService.setTranslatedRules (Monitoring.ts:1015:30)
    at MonitoringService.handleTick (Monitoring.ts:541:12)
    at Monitoring.ts:488:14
    at simpleObserver.ts:21:21
    at Map.forEach (<anonymous>)
    at Observer.emit (simpleObserver.ts:19:37)
    at DerivService.handleMessage (DerivService.tsx:446:23)
    at WebSocket.<anonymous> (DerivService.tsx:395:52)
error @ intercept-console-error.ts:42
testLosingDigitsAsX @ digit-pattern-rules.js?v=1775837114943:515
verifyPatternMatch @ digit-pattern-rules.js?v=1775837114943:378
analyzeDigitPattern @ digit-pattern-rules.js?v=1775837114943:268
processDigitPatternRule @ digit-pattern-rules.js?v=1775837114943:54
checkRuleCondition @ generate-format.js?v=1775837116221:2044
checkRuleCondition @ Monitoring.ts:822
(anonymous) @ Monitoring.ts:1032
(anonymous) @ Monitoring.ts:1024
setTranslatedRules @ Monitoring.ts:1015
handleTick @ Monitoring.ts:541
(anonymous) @ Monitoring.ts:488
(anonymous) @ simpleObserver.ts:21
emit @ simpleObserver.ts:19
handleMessage @ DerivService.tsx:446
(anonymous) @ DerivService.tsx:395
digit-pattern-rules.js?v=1775837114943:515 ❌ [TEST LOSING DIGITS FLEXIBLE] Erro: ReferenceError: losingDigits is not defined
    at DigitPatternRulesProcessor.testDigitAsX (digit-pattern-rules.js?v=1775837114943:525:55)
    at DigitPatternRulesProcessor.testLosingDigitsAsX (digit-pattern-rules.js?v=1775837114943:488:33)
    at DigitPatternRulesProcessor.verifyPatternMatch (digit-pattern-rules.js?v=1775837114943:378:25)
    at DigitPatternRulesProcessor.analyzeDigitPattern (digit-pattern-rules.js?v=1775837114943:268:33)
    at DigitPatternRulesProcessor.processDigitPatternRule (digit-pattern-rules.js?v=1775837114943:54:33)
    at FormatGenerator.checkRuleCondition (generate-format.js?v=1775837116221:2044:66)
    at MonitoringService.checkRuleCondition (Monitoring.ts:822:30)
    at Monitoring.ts:1032:44
    at Array.forEach (<anonymous>)
    at Monitoring.ts:1024:23
    at Array.forEach (<anonymous>)
    at MonitoringService.setTranslatedRules (Monitoring.ts:1015:30)
    at MonitoringService.handleTick (Monitoring.ts:541:12)
    at Monitoring.ts:488:14
    at simpleObserver.ts:21:21
    at Map.forEach (<anonymous>)
    at Observer.emit (simpleObserver.ts:19:37)
    at DerivService.handleMessage (DerivService.tsx:446:23)
    at WebSocket.<anonymous> (DerivService.tsx:395:52)
error @ intercept-console-error.ts:42
testLosingDigitsAsX @ digit-pattern-rules.js?v=1775837114943:515
verifyPatternMatch @ digit-pattern-rules.js?v=1775837114943:378
analyzeDigitPattern @ digit-pattern-rules.js?v=1775837114943:268
processDigitPatternRule @ digit-pattern-rules.js?v=1775837114943:54
checkRuleCondition @ generate-format.js?v=1775837116221:2044
checkRuleCondition @ Monitoring.ts:822
(anonymous) @ Monitoring.ts:1032
(anonymous) @ Monitoring.ts:1024
setTranslatedRules @ Monitoring.ts:1015
handleTick @ Monitoring.ts:541
(anonymous) @ Monitoring.ts:488
(anonymous) @ simpleObserver.ts:21
emit @ simpleObserver.ts:19
handleMessage @ DerivService.tsx:446
(anonymous) @ DerivService.tsx:395
digit-pattern-rules.js?v=1775837114943:515 ❌ [TEST LOSING DIGITS FLEXIBLE] Erro: ReferenceError: losingDigits is not defined
    at DigitPatternRulesProcessor.testDigitAsX (digit-pattern-rules.js?v=1775837114943:525:55)
    at DigitPatternRulesProcessor.testLosingDigitsAsX (digit-pattern-rules.js?v=1775837114943:488:33)
    at DigitPatternRulesProcessor.verifyPatternMatch (digit-pattern-rules.js?v=1775837114943:378:25)
    at DigitPatternRulesProcessor.analyzeDigitPattern (digit-pattern-rules.js?v=1775837114943:268:33)
    at DigitPatternRulesProcessor.processDigitPatternRule (digit-pattern-rules.js?v=1775837114943:54:33)
    at FormatGenerator.checkRuleCondition (generate-format.js?v=1775837116221:2044:66)
    at MonitoringService.checkRuleCondition (Monitoring.ts:822:30)
    at Monitoring.ts:1032:44
    at Array.forEach (<anonymous>)
    at Monitoring.ts:1024:23
    at Array.forEach (<anonymous>)
    at MonitoringService.setTranslatedRules (Monitoring.ts:1015:30)
    at MonitoringService.handleTick (Monitoring.ts:541:12)
    at Monitoring.ts:488:14
    at simpleObserver.ts:21:21
    at Map.forEach (<anonymous>)
    at Observer.emit (simpleObserver.ts:19:37)
    at DerivService.handleMessage (DerivService.tsx:446:23)
    at WebSocket.<anonymous> (DerivService.tsx:395:52)
error @ intercept-console-error.ts:42
testLosingDigitsAsX @ digit-pattern-rules.js?v=1775837114943:515
verifyPatternMatch @ digit-pattern-rules.js?v=1775837114943:378
analyzeDigitPattern @ digit-pattern-rules.js?v=1775837114943:268
processDigitPatternRule @ digit-pattern-rules.js?v=1775837114943:54
checkRuleCondition @ generate-format.js?v=1775837116221:2044
checkRuleCondition @ Monitoring.ts:822
(anonymous) @ Monitoring.ts:1032
(anonymous) @ Monitoring.ts:1024
setTranslatedRules @ Monitoring.ts:1015
handleTick @ Monitoring.ts:541
(anonymous) @ Monitoring.ts:488
(anonymous) @ simpleObserver.ts:21
emit @ simpleObserver.ts:19
handleMessage @ DerivService.tsx:446
(anonymous) @ DerivService.tsx:395
digit-pattern-rules.js?v=1775837114943:515 ❌ [TEST LOSING DIGITS FLEXIBLE] Erro: ReferenceError: losingDigits is not defined
    at DigitPatternRulesProcessor.testDigitAsX (digit-pattern-rules.js?v=1775837114943:525:55)
    at DigitPatternRulesProcessor.testLosingDigitsAsX (digit-pattern-rules.js?v=1775837114943:488:33)
    at DigitPatternRulesProcessor.verifyPatternMatch (digit-pattern-rules.js?v=1775837114943:378:25)
    at DigitPatternRulesProcessor.analyzeDigitPattern (digit-pattern-rules.js?v=1775837114943:268:33)
    at DigitPatternRulesProcessor.processDigitPatternRule (digit-pattern-rules.js?v=1775837114943:54:33)
    at FormatGenerator.checkRuleCondition (generate-format.js?v=1775837116221:2044:66)
    at MonitoringService.checkRuleCondition (Monitoring.ts:822:30)
    at Monitoring.ts:1032:44
    at Array.forEach (<anonymous>)
    at Monitoring.ts:1024:23
    at Array.forEach (<anonymous>)
    at MonitoringService.setTranslatedRules (Monitoring.ts:1015:30)
    at MonitoringService.handleTick (Monitoring.ts:541:12)
    at Monitoring.ts:488:14
    at simpleObserver.ts:21:21
    at Map.forEach (<anonymous>)
    at Observer.emit (simpleObserver.ts:19:37)
    at DerivService.handleMessage (DerivService.tsx:446:23)
    at WebSocket.<anonymous> (DerivService.tsx:395:52)
error @ intercept-console-error.ts:42
testLosingDigitsAsX @ digit-pattern-rules.js?v=1775837114943:515
verifyPatternMatch @ digit-pattern-rules.js?v=1775837114943:378
analyzeDigitPattern @ digit-pattern-rules.js?v=1775837114943:268
processDigitPatternRule @ digit-pattern-rules.js?v=1775837114943:54
checkRuleCondition @ generate-format.js?v=1775837116221:2044
checkRuleCondition @ Monitoring.ts:822
(anonymous) @ Monitoring.ts:1032
(anonymous) @ Monitoring.ts:1024
setTranslatedRules @ Monitoring.ts:1015
handleTick @ Monitoring.ts:541
(anonymous) @ Monitoring.ts:488
(anonymous) @ simpleObserver.ts:21
emit @ simpleObserver.ts:19
handleMessage @ DerivService.tsx:446
(anonymous) @ DerivService.tsx:395
digit-pattern-rules.js?v=1775837114943:515 ❌ [TEST LOSING DIGITS FLEXIBLE] Erro: ReferenceError: losingDigits is not defined
    at DigitPatternRulesProcessor.testDigitAsX (digit-pattern-rules.js?v=1775837114943:525:55)
    at DigitPatternRulesProcessor.testLosingDigitsAsX (digit-pattern-rules.js?v=1775837114943:488:33)
    at DigitPatternRulesProcessor.verifyPatternMatch (digit-pattern-rules.js?v=1775837114943:378:25)
    at DigitPatternRulesProcessor.analyzeDigitPattern (digit-pattern-rules.js?v=1775837114943:268:33)
    at DigitPatternRulesProcessor.processDigitPatternRule (digit-pattern-rules.js?v=1775837114943:54:33)
    at FormatGenerator.checkRuleCondition (generate-format.js?v=1775837116221:2044:66)
    at MonitoringService.checkRuleCondition (Monitoring.ts:822:30)
    at Monitoring.ts:1032:44
    at Array.forEach (<anonymous>)
    at Monitoring.ts:1024:23
    at Array.forEach (<anonymous>)
    at MonitoringService.setTranslatedRules (Monitoring.ts:1015:30)
    at MonitoringService.handleTick (Monitoring.ts:541:12)
    at Monitoring.ts:488:14
    at simpleObserver.ts:21:21
    at Map.forEach (<anonymous>)
    at Observer.emit (simpleObserver.ts:19:37)
    at DerivService.handleMessage (DerivService.tsx:446:23)
    at WebSocket.<anonymous> (DerivService.tsx:395:52)
error @ intercept-console-error.ts:42
testLosingDigitsAsX @ digit-pattern-rules.js?v=1775837114943:515
verifyPatternMatch @ digit-pattern-rules.js?v=1775837114943:378
analyzeDigitPattern @ digit-pattern-rules.js?v=1775837114943:268
processDigitPatternRule @ digit-pattern-rules.js?v=1775837114943:54
checkRuleCondition @ generate-format.js?v=1775837116221:2044
checkRuleCondition @ Monitoring.ts:822
(anonymous) @ Monitoring.ts:1032
(anonymous) @ Monitoring.ts:1024
setTranslatedRules @ Monitoring.ts:1015
handleTick @ Monitoring.ts:541
(anonymous) @ Monitoring.ts:488
(anonymous) @ simpleObserver.ts:21
emit @ simpleObserver.ts:19
handleMessage @ DerivService.tsx:446
(anonymous) @ DerivService.tsx:395
digit-pattern-rules.js?v=1775837114943:515 ❌ [TEST LOSING DIGITS FLEXIBLE] Erro: ReferenceError: losingDigits is not defined
    at DigitPatternRulesProcessor.testDigitAsX (digit-pattern-rules.js?v=1775837114943:525:55)
    at DigitPatternRulesProcessor.testLosingDigitsAsX (digit-pattern-rules.js?v=1775837114943:488:33)
    at DigitPatternRulesProcessor.verifyPatternMatch (digit-pattern-rules.js?v=1775837114943:378:25)
    at DigitPatternRulesProcessor.analyzeDigitPattern (digit-pattern-rules.js?v=1775837114943:268:33)
    at DigitPatternRulesProcessor.processDigitPatternRule (digit-pattern-rules.js?v=1775837114943:54:33)
    at FormatGenerator.checkRuleCondition (generate-format.js?v=1775837116221:2044:66)
    at MonitoringService.checkRuleCondition (Monitoring.ts:822:30)
    at Monitoring.ts:1032:44
    at Array.forEach (<anonymous>)
    at Monitoring.ts:1024:23
    at Array.forEach (<anonymous>)
    at MonitoringService.setTranslatedRules (Monitoring.ts:1015:30)
    at MonitoringService.handleTick (Monitoring.ts:541:12)
    at Monitoring.ts:488:14
    at simpleObserver.ts:21:21
    at Map.forEach (<anonymous>)
    at Observer.emit (simpleObserver.ts:19:37)
    at DerivService.handleMessage (DerivService.tsx:446:23)
    at WebSocket.<anonymous> (DerivService.tsx:395:52)
error @ intercept-console-error.ts:42
testLosingDigitsAsX @ digit-pattern-rules.js?v=1775837114943:515
verifyPatternMatch @ digit-pattern-rules.js?v=1775837114943:378
analyzeDigitPattern @ digit-pattern-rules.js?v=1775837114943:268
processDigitPatternRule @ digit-pattern-rules.js?v=1775837114943:54
checkRuleCondition @ generate-format.js?v=1775837116221:2044
checkRuleCondition @ Monitoring.ts:822
(anonymous) @ Monitoring.ts:1032
(anonymous) @ Monitoring.ts:1024
setTranslatedRules @ Monitoring.ts:1015
handleTick @ Monitoring.ts:541
(anonymous) @ Monitoring.ts:488
(anonymous) @ simpleObserver.ts:21
emit @ simpleObserver.ts:19
handleMessage @ DerivService.tsx:446
(anonymous) @ DerivService.tsx:395
digit-pattern-rules.js?v=1775837114943:515 ❌ [TEST LOSING DIGITS FLEXIBLE] Erro: ReferenceError: losingDigits is not defined
    at DigitPatternRulesProcessor.testDigitAsX (digit-pattern-rules.js?v=1775837114943:525:55)
    at DigitPatternRulesProcessor.testLosingDigitsAsX (digit-pattern-rules.js?v=1775837114943:488:33)
    at DigitPatternRulesProcessor.verifyPatternMatch (digit-pattern-rules.js?v=1775837114943:378:25)
    at DigitPatternRulesProcessor.analyzeDigitPattern (digit-pattern-rules.js?v=1775837114943:268:33)
    at DigitPatternRulesProcessor.processDigitPatternRule (digit-pattern-rules.js?v=1775837114943:54:33)
    at FormatGenerator.checkRuleCondition (generate-format.js?v=1775837116221:2044:66)
    at MonitoringService.checkRuleCondition (Monitoring.ts:822:30)
    at Monitoring.ts:1032:44
    at Array.forEach (<anonymous>)
    at Monitoring.ts:1024:23
    at Array.forEach (<anonymous>)
    at MonitoringService.setTranslatedRules (Monitoring.ts:1015:30)
    at MonitoringService.handleTick (Monitoring.ts:541:12)
    at Monitoring.ts:488:14
    at simpleObserver.ts:21:21
    at Map.forEach (<anonymous>)
    at Observer.emit (simpleObserver.ts:19:37)
    at DerivService.handleMessage (DerivService.tsx:446:23)
    at WebSocket.<anonymous> (DerivService.tsx:395:52)
error @ intercept-console-error.ts:42
testLosingDigitsAsX @ digit-pattern-rules.js?v=1775837114943:515
verifyPatternMatch @ digit-pattern-rules.js?v=1775837114943:378
analyzeDigitPattern @ digit-pattern-rules.js?v=1775837114943:268
processDigitPatternRule @ digit-pattern-rules.js?v=1775837114943:54
checkRuleCondition @ generate-format.js?v=1775837116221:2044
checkRuleCondition @ Monitoring.ts:822
(anonymous) @ Monitoring.ts:1032
(anonymous) @ Monitoring.ts:1024
setTranslatedRules @ Monitoring.ts:1015
handleTick @ Monitoring.ts:541
(anonymous) @ Monitoring.ts:488
(anonymous) @ simpleObserver.ts:21
emit @ simpleObserver.ts:19
handleMessage @ DerivService.tsx:446
(anonymous) @ DerivService.tsx:395
digit-pattern-rules.js?v=1775837114943:515 ❌ [TEST LOSING DIGITS FLEXIBLE] Erro: ReferenceError: losingDigits is not defined
    at DigitPatternRulesProcessor.testDigitAsX (digit-pattern-rules.js?v=1775837114943:525:55)
    at DigitPatternRulesProcessor.testLosingDigitsAsX (digit-pattern-rules.js?v=1775837114943:488:33)
    at DigitPatternRulesProcessor.verifyPatternMatch (digit-pattern-rules.js?v=1775837114943:378:25)
    at DigitPatternRulesProcessor.analyzeDigitPattern (digit-pattern-rules.js?v=1775837114943:268:33)
    at DigitPatternRulesProcessor.processDigitPatternRule (digit-pattern-rules.js?v=1775837114943:54:33)
    at FormatGenerator.checkRuleCondition (generate-format.js?v=1775837116221:2044:66)
    at MonitoringService.checkRuleCondition (Monitoring.ts:822:30)
    at Monitoring.ts:1032:44
    at Array.forEach (<anonymous>)
    at Monitoring.ts:1024:23
    at Array.forEach (<anonymous>)
    at MonitoringService.setTranslatedRules (Monitoring.ts:1015:30)
    at MonitoringService.handleTick (Monitoring.ts:541:12)
    at Monitoring.ts:488:14
    at simpleObserver.ts:21:21
    at Map.forEach (<anonymous>)
    at Observer.emit (simpleObserver.ts:19:37)
    at DerivService.handleMessage (DerivService.tsx:446:23)
    at WebSocket.<anonymous> (DerivService.tsx:395:52)
error @ intercept-console-error.ts:42
testLosingDigitsAsX @ digit-pattern-rules.js?v=1775837114943:515
verifyPatternMatch @ digit-pattern-rules.js?v=1775837114943:378
analyzeDigitPattern @ digit-pattern-rules.js?v=1775837114943:268
processDigitPatternRule @ digit-pattern-rules.js?v=1775837114943:54
checkRuleCondition @ generate-format.js?v=1775837116221:2044
checkRuleCondition @ Monitoring.ts:822
(anonymous) @ Monitoring.ts:1032
(anonymous) @ Monitoring.ts:1024
setTranslatedRules @ Monitoring.ts:1015
handleTick @ Monitoring.ts:541
(anonymous) @ Monitoring.ts:488
(anonymous) @ simpleObserver.ts:21
emit @ simpleObserver.ts:19
handleMessage @ DerivService.tsx:446
(anonymous) @ DerivService.tsx:395
digit-pattern-rules.js?v=1775837114943:515 ❌ [TEST LOSING DIGITS FLEXIBLE] Erro: ReferenceError: losingDigits is not defined
    at DigitPatternRulesProcessor.testDigitAsX (digit-pattern-rules.js?v=1775837114943:525:55)
    at DigitPatternRulesProcessor.testLosingDigitsAsX (digit-pattern-rules.js?v=1775837114943:488:33)
    at DigitPatternRulesProcessor.verifyPatternMatch (digit-pattern-rules.js?v=1775837114943:378:25)
    at DigitPatternRulesProcessor.analyzeDigitPattern (digit-pattern-rules.js?v=1775837114943:268:33)
    at DigitPatternRulesProcessor.processDigitPatternRule (digit-pattern-rules.js?v=1775837114943:54:33)
    at FormatGenerator.checkRuleCondition (generate-format.js?v=1775837116221:2044:66)
    at MonitoringService.checkRuleCondition (Monitoring.ts:822:30)
    at Monitoring.ts:1032:44
    at Array.forEach (<anonymous>)
    at Monitoring.ts:1024:23
    at Array.forEach (<anonymous>)
    at MonitoringService.setTranslatedRules (Monitoring.ts:1015:30)
    at MonitoringService.handleTick (Monitoring.ts:541:12)
    at Monitoring.ts:488:14
    at simpleObserver.ts:21:21
    at Map.forEach (<anonymous>)
    at Observer.emit (simpleObserver.ts:19:37)
    at DerivService.handleMessage (DerivService.tsx:446:23)
    at WebSocket.<anonymous> (DerivService.tsx:395:52)
error @ intercept-console-error.ts:42
testLosingDigitsAsX @ digit-pattern-rules.js?v=1775837114943:515
verifyPatternMatch @ digit-pattern-rules.js?v=1775837114943:378
analyzeDigitPattern @ digit-pattern-rules.js?v=1775837114943:268
processDigitPatternRule @ digit-pattern-rules.js?v=1775837114943:54
checkRuleCondition @ generate-format.js?v=1775837116221:2044
checkRuleCondition @ Monitoring.ts:822
(anonymous) @ Monitoring.ts:1032
(anonymous) @ Monitoring.ts:1024
setTranslatedRules @ Monitoring.ts:1015
handleTick @ Monitoring.ts:541
(anonymous) @ Monitoring.ts:488
(anonymous) @ simpleObserver.ts:21
emit @ simpleObserver.ts:19
handleMessage @ DerivService.tsx:446
(anonymous) @ DerivService.tsx:395
digit-pattern-rules.js?v=1775837114943:515 ❌ [TEST LOSING DIGITS FLEXIBLE] Erro: ReferenceError: losingDigits is not defined
    at DigitPatternRulesProcessor.testDigitAsX (digit-pattern-rules.js?v=1775837114943:525:55)
    at DigitPatternRulesProcessor.testLosingDigitsAsX (digit-pattern-rules.js?v=1775837114943:488:33)
    at DigitPatternRulesProcessor.verifyPatternMatch (digit-pattern-rules.js?v=1775837114943:378:25)
    at DigitPatternRulesProcessor.analyzeDigitPattern (digit-pattern-rules.js?v=1775837114943:268:33)
    at DigitPatternRulesProcessor.processDigitPatternRule (digit-pattern-rules.js?v=1775837114943:54:33)
    at FormatGenerator.checkRuleCondition (generate-format.js?v=1775837116221:2044:66)
    at MonitoringService.checkRuleCondition (Monitoring.ts:822:30)
    at Monitoring.ts:1032:44
    at Array.forEach (<anonymous>)
    at Monitoring.ts:1024:23
    at Array.forEach (<anonymous>)
    at MonitoringService.setTranslatedRules (Monitoring.ts:1015:30)
    at MonitoringService.handleTick (Monitoring.ts:541:12)
    at Monitoring.ts:488:14
    at simpleObserver.ts:21:21
    at Map.forEach (<anonymous>)
    at Observer.emit (simpleObserver.ts:19:37)
    at DerivService.handleMessage (DerivService.tsx:446:23)
    at WebSocket.<anonymous> (DerivService.tsx:395:52)
error @ intercept-console-error.ts:42
testLosingDigitsAsX @ digit-pattern-rules.js?v=1775837114943:515
verifyPatternMatch @ digit-pattern-rules.js?v=1775837114943:378
analyzeDigitPattern @ digit-pattern-rules.js?v=1775837114943:268
processDigitPatternRule @ digit-pattern-rules.js?v=1775837114943:54
checkRuleCondition @ generate-format.js?v=1775837116221:2044
checkRuleCondition @ Monitoring.ts:822
(anonymous) @ Monitoring.ts:1032
(anonymous) @ Monitoring.ts:1024
setTranslatedRules @ Monitoring.ts:1015
handleTick @ Monitoring.ts:541
(anonymous) @ Monitoring.ts:488
(anonymous) @ simpleObserver.ts:21
emit @ simpleObserver.ts:19
handleMessage @ DerivService.tsx:446
(anonymous) @ DerivService.tsx:395
digit-pattern-rules.js?v=1775837114943:515 ❌ [TEST LOSING DIGITS FLEXIBLE] Erro: ReferenceError: losingDigits is not defined
    at DigitPatternRulesProcessor.testDigitAsX (digit-pattern-rules.js?v=1775837114943:525:55)
    at DigitPatternRulesProcessor.testLosingDigitsAsX (digit-pattern-rules.js?v=1775837114943:488:33)
    at DigitPatternRulesProcessor.verifyPatternMatch (digit-pattern-rules.js?v=1775837114943:378:25)
    at DigitPatternRulesProcessor.analyzeDigitPattern (digit-pattern-rules.js?v=1775837114943:268:33)
    at DigitPatternRulesProcessor.processDigitPatternRule (digit-pattern-rules.js?v=1775837114943:54:33)
    at FormatGenerator.checkRuleCondition (generate-format.js?v=1775837116221:2044:66)
    at MonitoringService.checkRuleCondition (Monitoring.ts:822:30)
    at Monitoring.ts:1032:44
    at Array.forEach (<anonymous>)
    at Monitoring.ts:1024:23
    at Array.forEach (<anonymous>)
    at MonitoringService.setTranslatedRules (Monitoring.ts:1015:30)
    at MonitoringService.handleTick (Monitoring.ts:541:12)
    at Monitoring.ts:488:14
    at simpleObserver.ts:21:21
    at Map.forEach (<anonymous>)
    at Observer.emit (simpleObserver.ts:19:37)
    at DerivService.handleMessage (DerivService.tsx:446:23)
    at WebSocket.<anonymous> (DerivService.tsx:395:52)
error @ intercept-console-error.ts:42
testLosingDigitsAsX @ digit-pattern-rules.js?v=1775837114943:515
verifyPatternMatch @ digit-pattern-rules.js?v=1775837114943:378
analyzeDigitPattern @ digit-pattern-rules.js?v=1775837114943:268
processDigitPatternRule @ digit-pattern-rules.js?v=1775837114943:54
checkRuleCondition @ generate-format.js?v=1775837116221:2044
checkRuleCondition @ Monitoring.ts:822
(anonymous) @ Monitoring.ts:1032
(anonymous) @ Monitoring.ts:1024
setTranslatedRules @ Monitoring.ts:1015
handleTick @ Monitoring.ts:541
(anonymous) @ Monitoring.ts:488
(anonymous) @ simpleObserver.ts:21
emit @ simpleObserver.ts:19
handleMessage @ DerivService.tsx:446
(anonymous) @ DerivService.tsx:395
digit-pattern-rules.js?v=1775837114943:515 ❌ [TEST LOSING DIGITS FLEXIBLE] Erro: ReferenceError: losingDigits is not defined
    at DigitPatternRulesProcessor.testDigitAsX (digit-pattern-rules.js?v=1775837114943:525:55)
    at DigitPatternRulesProcessor.testLosingDigitsAsX (digit-pattern-rules.js?v=1775837114943:488:33)
    at DigitPatternRulesProcessor.verifyPatternMatch (digit-pattern-rules.js?v=1775837114943:378:25)
    at DigitPatternRulesProcessor.analyzeDigitPattern (digit-pattern-rules.js?v=1775837114943:268:33)
    at DigitPatternRulesProcessor.processDigitPatternRule (digit-pattern-rules.js?v=1775837114943:54:33)
    at FormatGenerator.checkRuleCondition (generate-format.js?v=1775837116221:2044:66)
    at MonitoringService.checkRuleCondition (Monitoring.ts:822:30)
    at Monitoring.ts:1032:44
    at Array.forEach (<anonymous>)
    at Monitoring.ts:1024:23
    at Array.forEach (<anonymous>)
    at MonitoringService.setTranslatedRules (Monitoring.ts:1015:30)
    at MonitoringService.handleTick (Monitoring.ts:541:12)
    at Monitoring.ts:488:14
    at simpleObserver.ts:21:21
    at Map.forEach (<anonymous>)
    at Observer.emit (simpleObserver.ts:19:37)
    at DerivService.handleMessage (DerivService.tsx:446:23)
    at WebSocket.<anonymous> (DerivService.tsx:395:52)
error @ intercept-console-error.ts:42
testLosingDigitsAsX @ digit-pattern-rules.js?v=1775837114943:515
verifyPatternMatch @ digit-pattern-rules.js?v=1775837114943:378
analyzeDigitPattern @ digit-pattern-rules.js?v=1775837114943:268
processDigitPatternRule @ digit-pattern-rules.js?v=1775837114943:54
checkRuleCondition @ generate-format.js?v=1775837116221:2044
checkRuleCondition @ Monitoring.ts:822
(anonymous) @ Monitoring.ts:1032
(anonymous) @ Monitoring.ts:1024
setTranslatedRules @ Monitoring.ts:1015
handleTick @ Monitoring.ts:541
(anonymous) @ Monitoring.ts:488
(anonymous) @ simpleObserver.ts:21
emit @ simpleObserver.ts:19
handleMessage @ DerivService.tsx:446
(anonymous) @ DerivService.tsx:395
digit-pattern-rules.js?v=1775837114943:515 ❌ [TEST LOSING DIGITS FLEXIBLE] Erro: ReferenceError: losingDigits is not defined
    at DigitPatternRulesProcessor.testDigitAsX (digit-pattern-rules.js?v=1775837114943:525:55)
    at DigitPatternRulesProcessor.testLosingDigitsAsX (digit-pattern-rules.js?v=1775837114943:488:33)
    at DigitPatternRulesProcessor.verifyPatternMatch (digit-pattern-rules.js?v=1775837114943:378:25)
    at DigitPatternRulesProcessor.analyzeDigitPattern (digit-pattern-rules.js?v=1775837114943:268:33)
    at DigitPatternRulesProcessor.processDigitPatternRule (digit-pattern-rules.js?v=1775837114943:54:33)
    at FormatGenerator.checkRuleCondition (generate-format.js?v=1775837116221:2044:66)
    at MonitoringService.checkRuleCondition (Monitoring.ts:822:30)
    at Monitoring.ts:1032:44
    at Array.forEach (<anonymous>)
    at Monitoring.ts:1024:23
    at Array.forEach (<anonymous>)
    at MonitoringService.setTranslatedRules (Monitoring.ts:1015:30)
    at MonitoringService.handleTick (Monitoring.ts:541:12)
    at Monitoring.ts:488:14
    at simpleObserver.ts:21:21
    at Map.forEach (<anonymous>)
    at Observer.emit (simpleObserver.ts:19:37)
    at DerivService.handleMessage (DerivService.tsx:446:23)
    at WebSocket.<anonymous> (DerivService.tsx:395:52)
error @ intercept-console-error.ts:42
testLosingDigitsAsX @ digit-pattern-rules.js?v=1775837114943:515
verifyPatternMatch @ digit-pattern-rules.js?v=1775837114943:378
analyzeDigitPattern @ digit-pattern-rules.js?v=1775837114943:268
processDigitPatternRule @ digit-pattern-rules.js?v=1775837114943:54
checkRuleCondition @ generate-format.js?v=1775837116221:2044
checkRuleCondition @ Monitoring.ts:822
(anonymous) @ Monitoring.ts:1032
(anonymous) @ Monitoring.ts:1024
setTranslatedRules @ Monitoring.ts:1015
handleTick @ Monitoring.ts:541
(anonymous) @ Monitoring.ts:488
(anonymous) @ simpleObserver.ts:21
emit @ simpleObserver.ts:19
handleMessage @ DerivService.tsx:446
(anonymous) @ DerivService.tsx:395
digit-pattern-rules.js?v=1775837114943:515 ❌ [TEST LOSING DIGITS FLEXIBLE] Erro: ReferenceError: losingDigits is not defined
    at DigitPatternRulesProcessor.testDigitAsX (digit-pattern-rules.js?v=1775837114943:525:55)
    at DigitPatternRulesProcessor.testLosingDigitsAsX (digit-pattern-rules.js?v=1775837114943:488:33)
    at DigitPatternRulesProcessor.verifyPatternMatch (digit-pattern-rules.js?v=1775837114943:378:25)
    at DigitPatternRulesProcessor.analyzeDigitPattern (digit-pattern-rules.js?v=1775837114943:268:33)
    at DigitPatternRulesProcessor.processDigitPatternRule (digit-pattern-rules.js?v=1775837114943:54:33)
    at FormatGenerator.checkRuleCondition (generate-format.js?v=1775837116221:2044:66)
    at MonitoringService.checkRuleCondition (Monitoring.ts:822:30)
    at Monitoring.ts:1032:44
    at Array.forEach (<anonymous>)
    at Monitoring.ts:1024:23
    at Array.forEach (<anonymous>)
    at MonitoringService.setTranslatedRules (Monitoring.ts:1015:30)
    at MonitoringService.handleTick (Monitoring.ts:541:12)
    at Monitoring.ts:488:14
    at simpleObserver.ts:21:21
    at Map.forEach (<anonymous>)
    at Observer.emit (simpleObserver.ts:19:37)
    at DerivService.handleMessage (DerivService.tsx:446:23)
    at WebSocket.<anonymous> (DerivService.tsx:395:52)
error @ intercept-console-error.ts:42
testLosingDigitsAsX @ digit-pattern-rules.js?v=1775837114943:515
verifyPatternMatch @ digit-pattern-rules.js?v=1775837114943:378
analyzeDigitPattern @ digit-pattern-rules.js?v=1775837114943:268
processDigitPatternRule @ digit-pattern-rules.js?v=1775837114943:54
checkRuleCondition @ generate-format.js?v=1775837116221:2044
checkRuleCondition @ Monitoring.ts:822
(anonymous) @ Monitoring.ts:1032
(anonymous) @ Monitoring.ts:1024
setTranslatedRules @ Monitoring.ts:1015
handleTick @ Monitoring.ts:541
(anonymous) @ Monitoring.ts:488
(anonymous) @ simpleObserver.ts:21
emit @ simpleObserver.ts:19
handleMessage @ DerivService.tsx:446
(anonymous) @ DerivService.tsx:395
digit-pattern-rules.js?v=1775837114943:515 ❌ [TEST LOSING DIGITS FLEXIBLE] Erro: ReferenceError: losingDigits is not defined
    at DigitPatternRulesProcessor.testDigitAsX (digit-pattern-rules.js?v=1775837114943:525:55)
    at DigitPatternRulesProcessor.testLosingDigitsAsX (digit-pattern-rules.js?v=1775837114943:488:33)
    at DigitPatternRulesProcessor.verifyPatternMatch (digit-pattern-rules.js?v=1775837114943:378:25)
    at DigitPatternRulesProcessor.analyzeDigitPattern (digit-pattern-rules.js?v=1775837114943:268:33)
    at DigitPatternRulesProcessor.processDigitPatternRule (digit-pattern-rules.js?v=1775837114943:54:33)
    at FormatGenerator.checkRuleCondition (generate-format.js?v=1775837116221:2044:66)
    at MonitoringService.checkRuleCondition (Monitoring.ts:822:30)
    at Monitoring.ts:1032:44
    at Array.forEach (<anonymous>)
    at Monitoring.ts:1024:23
    at Array.forEach (<anonymous>)
    at MonitoringService.setTranslatedRules (Monitoring.ts:1015:30)
    at MonitoringService.handleTick (Monitoring.ts:541:12)
    at Monitoring.ts:488:14
    at simpleObserver.ts:21:21
    at Map.forEach (<anonymous>)
    at Observer.emit (simpleObserver.ts:19:37)
    at DerivService.handleMessage (DerivService.tsx:446:23)
    at WebSocket.<anonymous> (DerivService.tsx:395:52)
error @ intercept-console-error.ts:42
testLosingDigitsAsX @ digit-pattern-rules.js?v=1775837114943:515
verifyPatternMatch @ digit-pattern-rules.js?v=1775837114943:378
analyzeDigitPattern @ digit-pattern-rules.js?v=1775837114943:268
processDigitPatternRule @ digit-pattern-rules.js?v=1775837114943:54
checkRuleCondition @ generate-format.js?v=1775837116221:2044
checkRuleCondition @ Monitoring.ts:822
(anonymous) @ Monitoring.ts:1032
(anonymous) @ Monitoring.ts:1024
setTranslatedRules @ Monitoring.ts:1015
handleTick @ Monitoring.ts:541
(anonymous) @ Monitoring.ts:488
(anonymous) @ simpleObserver.ts:21
emit @ simpleObserver.ts:19
handleMessage @ DerivService.tsx:446
(anonymous) @ DerivService.tsx:395
digit-pattern-rules.js?v=1775837114943:515 ❌ [TEST LOSING DIGITS FLEXIBLE] Erro: ReferenceError: losingDigits is not defined
    at DigitPatternRulesProcessor.testDigitAsX (digit-pattern-rules.js?v=1775837114943:525:55)
    at DigitPatternRulesProcessor.testLosingDigitsAsX (digit-pattern-rules.js?v=1775837114943:488:33)
    at DigitPatternRulesProcessor.verifyPatternMatch (digit-pattern-rules.js?v=1775837114943:378:25)
    at DigitPatternRulesProcessor.analyzeDigitPattern (digit-pattern-rules.js?v=1775837114943:268:33)
    at DigitPatternRulesProcessor.processDigitPatternRule (digit-pattern-rules.js?v=1775837114943:54:33)
    at FormatGenerator.checkRuleCondition (generate-format.js?v=1775837116221:2044:66)
    at MonitoringService.checkRuleCondition (Monitoring.ts:822:30)
    at Monitoring.ts:1032:44
    at Array.forEach (<anonymous>)
    at Monitoring.ts:1024:23
    at Array.forEach (<anonymous>)
    at MonitoringService.setTranslatedRules (Monitoring.ts:1015:30)
    at MonitoringService.handleTick (Monitoring.ts:541:12)
    at Monitoring.ts:488:14
    at simpleObserver.ts:21:21
    at Map.forEach (<anonymous>)
    at Observer.emit (simpleObserver.ts:19:37)
    at DerivService.handleMessage (DerivService.tsx:446:23)
    at WebSocket.<anonymous> (DerivService.tsx:395:52)
error @ intercept-console-error.ts:42
testLosingDigitsAsX @ digit-pattern-rules.js?v=1775837114943:515
verifyPatternMatch @ digit-pattern-rules.js?v=1775837114943:378
analyzeDigitPattern @ digit-pattern-rules.js?v=1775837114943:268
processDigitPatternRule @ digit-pattern-rules.js?v=1775837114943:54
checkRuleCondition @ generate-format.js?v=1775837116221:2044
checkRuleCondition @ Monitoring.ts:822
(anonymous) @ Monitoring.ts:1032
(anonymous) @ Monitoring.ts:1024
setTranslatedRules @ Monitoring.ts:1015
handleTick @ Monitoring.ts:541
(anonymous) @ Monitoring.ts:488
(anonymous) @ simpleObserver.ts:21
emit @ simpleObserver.ts:19
handleMessage @ DerivService.tsx:446
(anonymous) @ DerivService.tsx:395
digit-pattern-rules.js?v=1775837114943:515 ❌ [TEST LOSING DIGITS FLEXIBLE] Erro: ReferenceError: losingDigits is not defined
    at DigitPatternRulesProcessor.testDigitAsX (digit-pattern-rules.js?v=1775837114943:525:55)
    at DigitPatternRulesProcessor.testLosingDigitsAsX (digit-pattern-rules.js?v=1775837114943:488:33)
    at DigitPatternRulesProcessor.verifyPatternMatch (digit-pattern-rules.js?v=1775837114943:378:25)
    at DigitPatternRulesProcessor.analyzeDigitPattern (digit-pattern-rules.js?v=1775837114943:268:33)
    at DigitPatternRulesProcessor.processDigitPatternRule (digit-pattern-rules.js?v=1775837114943:54:33)
    at FormatGenerator.checkRuleCondition (generate-format.js?v=1775837116221:2044:66)
    at MonitoringService.checkRuleCondition (Monitoring.ts:822:30)
    at Monitoring.ts:1032:44
    at Array.forEach (<anonymous>)
    at Monitoring.ts:1024:23
    at Array.forEach (<anonymous>)
    at MonitoringService.setTranslatedRules (Monitoring.ts:1015:30)
    at MonitoringService.handleTick (Monitoring.ts:541:12)
    at Monitoring.ts:488:14
    at simpleObserver.ts:21:21
    at Map.forEach (<anonymous>)
    at Observer.emit (simpleObserver.ts:19:37)
    at DerivService.handleMessage (DerivService.tsx:446:23)
    at WebSocket.<anonymous> (DerivService.tsx:395:52)
error @ intercept-console-error.ts:42
testLosingDigitsAsX @ digit-pattern-rules.js?v=1775837114943:515
verifyPatternMatch @ digit-pattern-rules.js?v=1775837114943:378
analyzeDigitPattern @ digit-pattern-rules.js?v=1775837114943:268
processDigitPatternRule @ digit-pattern-rules.js?v=1775837114943:54
checkRuleCondition @ generate-format.js?v=1775837116221:2044
checkRuleCondition @ Monitoring.ts:822
(anonymous) @ Monitoring.ts:1032
(anonymous) @ Monitoring.ts:1024
setTranslatedRules @ Monitoring.ts:1015
handleTick @ Monitoring.ts:541
(anonymous) @ Monitoring.ts:488
(anonymous) @ simpleObserver.ts:21
emit @ simpleObserver.ts:19
handleMessage @ DerivService.tsx:446
(anonymous) @ DerivService.tsx:395
digit-pattern-rules.js?v=1775837114943:515 ❌ [TEST LOSING DIGITS FLEXIBLE] Erro: ReferenceError: losingDigits is not defined
    at DigitPatternRulesProcessor.testDigitAsX (digit-pattern-rules.js?v=1775837114943:525:55)
    at DigitPatternRulesProcessor.testLosingDigitsAsX (digit-pattern-rules.js?v=1775837114943:488:33)
    at DigitPatternRulesProcessor.verifyPatternMatch (digit-pattern-rules.js?v=1775837114943:378:25)
    at DigitPatternRulesProcessor.analyzeDigitPattern (digit-pattern-rules.js?v=1775837114943:268:33)
    at DigitPatternRulesProcessor.processDigitPatternRule (digit-pattern-rules.js?v=1775837114943:54:33)
    at FormatGenerator.checkRuleCondition (generate-format.js?v=1775837116221:2044:66)
    at MonitoringService.checkRuleCondition (Monitoring.ts:822:30)
    at Monitoring.ts:1032:44
    at Array.forEach (<anonymous>)
    at Monitoring.ts:1024:23
    at Array.forEach (<anonymous>)
    at MonitoringService.setTranslatedRules (Monitoring.ts:1015:30)
    at MonitoringService.handleTick (Monitoring.ts:541:12)
    at Monitoring.ts:488:14
    at simpleObserver.ts:21:21
    at Map.forEach (<anonymous>)
    at Observer.emit (simpleObserver.ts:19:37)
    at DerivService.handleMessage (DerivService.tsx:446:23)
    at WebSocket.<anonymous> (DerivService.tsx:395:52)
error @ intercept-console-error.ts:42
testLosingDigitsAsX @ digit-pattern-rules.js?v=1775837114943:515
verifyPatternMatch @ digit-pattern-rules.js?v=1775837114943:378
analyzeDigitPattern @ digit-pattern-rules.js?v=1775837114943:268
processDigitPatternRule @ digit-pattern-rules.js?v=1775837114943:54
checkRuleCondition @ generate-format.js?v=1775837116221:2044
checkRuleCondition @ Monitoring.ts:822
(anonymous) @ Monitoring.ts:1032
(anonymous) @ Monitoring.ts:1024
setTranslatedRules @ Monitoring.ts:1015
handleTick @ Monitoring.ts:541
(anonymous) @ Monitoring.ts:488
(anonymous) @ simpleObserver.ts:21
emit @ simpleObserver.ts:19
handleMessage @ DerivService.tsx:446
(anonymous) @ DerivService.tsx:395
digit-pattern-rules.js?v=1775837114943:515 ❌ [TEST LOSING DIGITS FLEXIBLE] Erro: ReferenceError: losingDigits is not defined
    at DigitPatternRulesProcessor.testDigitAsX (digit-pattern-rules.js?v=1775837114943:525:55)
    at DigitPatternRulesProcessor.testLosingDigitsAsX (digit-pattern-rules.js?v=1775837114943:488:33)
    at DigitPatternRulesProcessor.verifyPatternMatch (digit-pattern-rules.js?v=1775837114943:378:25)
    at DigitPatternRulesProcessor.analyzeDigitPattern (digit-pattern-rules.js?v=1775837114943:268:33)
    at DigitPatternRulesProcessor.processDigitPatternRule (digit-pattern-rules.js?v=1775837114943:54:33)
    at FormatGenerator.checkRuleCondition (generate-format.js?v=1775837116221:2044:66)
    at MonitoringService.checkRuleCondition (Monitoring.ts:822:30)
    at Monitoring.ts:1032:44
    at Array.forEach (<anonymous>)
    at Monitoring.ts:1024:23
    at Array.forEach (<anonymous>)
    at MonitoringService.setTranslatedRules (Monitoring.ts:1015:30)
    at MonitoringService.handleTick (Monitoring.ts:541:12)
    at Monitoring.ts:488:14
    at simpleObserver.ts:21:21
    at Map.forEach (<anonymous>)
    at Observer.emit (simpleObserver.ts:19:37)
    at DerivService.handleMessage (DerivService.tsx:446:23)
    at WebSocket.<anonymous> (DerivService.tsx:395:52)
error @ intercept-console-error.ts:42
testLosingDigitsAsX @ digit-pattern-rules.js?v=1775837114943:515
verifyPatternMatch @ digit-pattern-rules.js?v=1775837114943:378
analyzeDigitPattern @ digit-pattern-rules.js?v=1775837114943:268
processDigitPatternRule @ digit-pattern-rules.js?v=1775837114943:54
checkRuleCondition @ generate-format.js?v=1775837116221:2044
checkRuleCondition @ Monitoring.ts:822
(anonymous) @ Monitoring.ts:1032
(anonymous) @ Monitoring.ts:1024
setTranslatedRules @ Monitoring.ts:1015
handleTick @ Monitoring.ts:541
(anonymous) @ Monitoring.ts:488
(anonymous) @ simpleObserver.ts:21
emit @ simpleObserver.ts:19
handleMessage @ DerivService.tsx:446
(anonymous) @ DerivService.tsx:395
digit-pattern-rules.js?v=1775837114943:515 ❌ [TEST LOSING DIGITS FLEXIBLE] Erro: ReferenceError: losingDigits is not defined
    at DigitPatternRulesProcessor.testDigitAsX (digit-pattern-rules.js?v=1775837114943:525:55)
    at DigitPatternRulesProcessor.testLosingDigitsAsX (digit-pattern-rules.js?v=1775837114943:488:33)
    at DigitPatternRulesProcessor.verifyPatternMatch (digit-pattern-rules.js?v=1775837114943:378:25)
    at DigitPatternRulesProcessor.analyzeDigitPattern (digit-pattern-rules.js?v=1775837114943:268:33)
    at DigitPatternRulesProcessor.processDigitPatternRule (digit-pattern-rules.js?v=1775837114943:54:33)
    at FormatGenerator.checkRuleCondition (generate-format.js?v=1775837116221:2044:66)
    at MonitoringService.checkRuleCondition (Monitoring.ts:822:30)
    at Monitoring.ts:1032:44
    at Array.forEach (<anonymous>)
    at Monitoring.ts:1024:23
    at Array.forEach (<anonymous>)
    at MonitoringService.setTranslatedRules (Monitoring.ts:1015:30)
    at MonitoringService.handleTick (Monitoring.ts:541:12)
    at Monitoring.ts:488:14
    at simpleObserver.ts:21:21
    at Map.forEach (<anonymous>)
    at Observer.emit (simpleObserver.ts:19:37)
    at DerivService.handleMessage (DerivService.tsx:446:23)
    at WebSocket.<anonymous> (DerivService.tsx:395:52)
error @ intercept-console-error.ts:42
testLosingDigitsAsX @ digit-pattern-rules.js?v=1775837114943:515
verifyPatternMatch @ digit-pattern-rules.js?v=1775837114943:378
analyzeDigitPattern @ digit-pattern-rules.js?v=1775837114943:268
processDigitPatternRule @ digit-pattern-rules.js?v=1775837114943:54
checkRuleCondition @ generate-format.js?v=1775837116221:2044
checkRuleCondition @ Monitoring.ts:822
(anonymous) @ Monitoring.ts:1032
(anonymous) @ Monitoring.ts:1024
setTranslatedRules @ Monitoring.ts:1015
handleTick @ Monitoring.ts:541
(anonymous) @ Monitoring.ts:488
(anonymous) @ simpleObserver.ts:21
emit @ simpleObserver.ts:19
handleMessage @ DerivService.tsx:446
(anonymous) @ DerivService.tsx:395
digit-pattern-rules.js?v=1775837114943:515 ❌ [TEST LOSING DIGITS FLEXIBLE] Erro: ReferenceError: losingDigits is not defined
    at DigitPatternRulesProcessor.testDigitAsX (digit-pattern-rules.js?v=1775837114943:525:55)
    at DigitPatternRulesProcessor.testLosingDigitsAsX (digit-pattern-rules.js?v=1775837114943:488:33)
    at DigitPatternRulesProcessor.verifyPatternMatch (digit-pattern-rules.js?v=1775837114943:378:25)
    at DigitPatternRulesProcessor.analyzeDigitPattern (digit-pattern-rules.js?v=1775837114943:268:33)
    at DigitPatternRulesProcessor.processDigitPatternRule (digit-pattern-rules.js?v=1775837114943:54:33)
    at FormatGenerator.checkRuleCondition (generate-format.js?v=1775837116221:2044:66)
    at MonitoringService.checkRuleCondition (Monitoring.ts:822:30)
    at Monitoring.ts:1032:44
    at Array.forEach (<anonymous>)
    at Monitoring.ts:1024:23
    at Array.forEach (<anonymous>)
    at MonitoringService.setTranslatedRules (Monitoring.ts:1015:30)
    at MonitoringService.handleTick (Monitoring.ts:541:12)
    at Monitoring.ts:488:14
    at simpleObserver.ts:21:21
    at Map.forEach (<anonymous>)
    at Observer.emit (simpleObserver.ts:19:37)
    at DerivService.handleMessage (DerivService.tsx:446:23)
    at WebSocket.<anonymous> (DerivService.tsx:395:52)
error @ intercept-console-error.ts:42
testLosingDigitsAsX @ digit-pattern-rules.js?v=1775837114943:515
verifyPatternMatch @ digit-pattern-rules.js?v=1775837114943:378
analyzeDigitPattern @ digit-pattern-rules.js?v=1775837114943:268
processDigitPatternRule @ digit-pattern-rules.js?v=1775837114943:54
checkRuleCondition @ generate-format.js?v=1775837116221:2044
checkRuleCondition @ Monitoring.ts:822
(anonymous) @ Monitoring.ts:1032
(anonymous) @ Monitoring.ts:1024
setTranslatedRules @ Monitoring.ts:1015
handleTick @ Monitoring.ts:541
(anonymous) @ Monitoring.ts:488
(anonymous) @ simpleObserver.ts:21
emit @ simpleObserver.ts:19
handleMessage @ DerivService.tsx:446
(anonymous) @ DerivService.tsx:395
digit-pattern-rules.js?v=1775837114943:515 ❌ [TEST LOSING DIGITS FLEXIBLE] Erro: ReferenceError: losingDigits is not defined
    at DigitPatternRulesProcessor.testDigitAsX (digit-pattern-rules.js?v=1775837114943:525:55)
    at DigitPatternRulesProcessor.testLosingDigitsAsX (digit-pattern-rules.js?v=1775837114943:488:33)
    at DigitPatternRulesProcessor.verifyPatternMatch (digit-pattern-rules.js?v=1775837114943:378:25)
    at DigitPatternRulesProcessor.analyzeDigitPattern (digit-pattern-rules.js?v=1775837114943:268:33)
    at DigitPatternRulesProcessor.processDigitPatternRule (digit-pattern-rules.js?v=1775837114943:54:33)
    at FormatGenerator.checkRuleCondition (generate-format.js?v=1775837116221:2044:66)
    at MonitoringService.checkRuleCondition (Monitoring.ts:822:30)
    at Monitoring.ts:1032:44
    at Array.forEach (<anonymous>)
    at Monitoring.ts:1024:23
    at Array.forEach (<anonymous>)
    at MonitoringService.setTranslatedRules (Monitoring.ts:1015:30)
    at MonitoringService.handleTick (Monitoring.ts:541:12)
    at Monitoring.ts:488:14
    at simpleObserver.ts:21:21
    at Map.forEach (<anonymous>)
    at Observer.emit (simpleObserver.ts:19:37)
    at DerivService.handleMessage (DerivService.tsx:446:23)
    at WebSocket.<anonymous> (DerivService.tsx:395:52)
error @ intercept-console-error.ts:42
testLosingDigitsAsX @ digit-pattern-rules.js?v=1775837114943:515
verifyPatternMatch @ digit-pattern-rules.js?v=1775837114943:378
analyzeDigitPattern @ digit-pattern-rules.js?v=1775837114943:268
processDigitPatternRule @ digit-pattern-rules.js?v=1775837114943:54
checkRuleCondition @ generate-format.js?v=1775837116221:2044
checkRuleCondition @ Monitoring.ts:822
(anonymous) @ Monitoring.ts:1032
(anonymous) @ Monitoring.ts:1024
setTranslatedRules @ Monitoring.ts:1015
handleTick @ Monitoring.ts:541
(anonymous) @ Monitoring.ts:488
(anonymous) @ simpleObserver.ts:21
emit @ simpleObserver.ts:19
handleMessage @ DerivService.tsx:446
(anonymous) @ DerivService.tsx:395
digit-pattern-rules.js?v=1775837114943:515 ❌ [TEST LOSING DIGITS FLEXIBLE] Erro: ReferenceError: losingDigits is not defined
    at DigitPatternRulesProcessor.testDigitAsX (digit-pattern-rules.js?v=1775837114943:525:55)
    at DigitPatternRulesProcessor.testLosingDigitsAsX (digit-pattern-rules.js?v=1775837114943:488:33)
    at DigitPatternRulesProcessor.verifyPatternMatch (digit-pattern-rules.js?v=1775837114943:378:25)
    at DigitPatternRulesProcessor.analyzeDigitPattern (digit-pattern-rules.js?v=1775837114943:268:33)
    at DigitPatternRulesProcessor.processDigitPatternRule (digit-pattern-rules.js?v=1775837114943:54:33)
    at FormatGenerator.checkRuleCondition (generate-format.js?v=1775837116221:2044:66)
    at MonitoringService.checkRuleCondition (Monitoring.ts:822:30)
    at Monitoring.ts:1032:44
    at Array.forEach (<anonymous>)
    at Monitoring.ts:1024:23
    at Array.forEach (<anonymous>)
    at MonitoringService.setTranslatedRules (Monitoring.ts:1015:30)
    at MonitoringService.handleTick (Monitoring.ts:541:12)
    at Monitoring.ts:488:14
    at simpleObserver.ts:21:21
    at Map.forEach (<anonymous>)
    at Observer.emit (simpleObserver.ts:19:37)
    at DerivService.handleMessage (DerivService.tsx:446:23)
    at WebSocket.<anonymous> (DerivService.tsx:395:52)
error @ intercept-console-error.ts:42
testLosingDigitsAsX @ digit-pattern-rules.js?v=1775837114943:515
verifyPatternMatch @ digit-pattern-rules.js?v=1775837114943:378
analyzeDigitPattern @ digit-pattern-rules.js?v=1775837114943:268
processDigitPatternRule @ digit-pattern-rules.js?v=1775837114943:54
checkRuleCondition @ generate-format.js?v=1775837116221:2044
checkRuleCondition @ Monitoring.ts:822
(anonymous) @ Monitoring.ts:1032
(anonymous) @ Monitoring.ts:1024
setTranslatedRules @ Monitoring.ts:1015
handleTick @ Monitoring.ts:541
(anonymous) @ Monitoring.ts:488
(anonymous) @ simpleObserver.ts:21
emit @ simpleObserver.ts:19
handleMessage @ DerivService.tsx:446
(anonymous) @ DerivService.tsx:395
digit-pattern-rules.js?v=1775837114943:515 ❌ [TEST LOSING DIGITS FLEXIBLE] Erro: ReferenceError: losingDigits is not defined
    at DigitPatternRulesProcessor.testDigitAsX (digit-pattern-rules.js?v=1775837114943:525:55)
    at DigitPatternRulesProcessor.testLosingDigitsAsX (digit-pattern-rules.js?v=1775837114943:488:33)
    at DigitPatternRulesProcessor.verifyPatternMatch (digit-pattern-rules.js?v=1775837114943:378:25)
    at DigitPatternRulesProcessor.analyzeDigitPattern (digit-pattern-rules.js?v=1775837114943:268:33)
    at DigitPatternRulesProcessor.processDigitPatternRule (digit-pattern-rules.js?v=1775837114943:54:33)
    at FormatGenerator.checkRuleCondition (generate-format.js?v=1775837116221:2044:66)
    at MonitoringService.checkRuleCondition (Monitoring.ts:822:30)
    at Monitoring.ts:1032:44
    at Array.forEach (<anonymous>)
    at Monitoring.ts:1024:23
    at Array.forEach (<anonymous>)
    at MonitoringService.setTranslatedRules (Monitoring.ts:1015:30)
    at MonitoringService.handleTick (Monitoring.ts:541:12)
    at Monitoring.ts:488:14
    at simpleObserver.ts:21:21
    at Map.forEach (<anonymous>)
    at Observer.emit (simpleObserver.ts:19:37)
    at DerivService.handleMessage (DerivService.tsx:446:23)
    at WebSocket.<anonymous> (DerivService.tsx:395:52)
error @ intercept-console-error.ts:42
testLosingDigitsAsX @ digit-pattern-rules.js?v=1775837114943:515
verifyPatternMatch @ digit-pattern-rules.js?v=1775837114943:378
analyzeDigitPattern @ digit-pattern-rules.js?v=1775837114943:268
processDigitPatternRule @ digit-pattern-rules.js?v=1775837114943:54
checkRuleCondition @ generate-format.js?v=1775837116221:2044
checkRuleCondition @ Monitoring.ts:822
(anonymous) @ Monitoring.ts:1032
(anonymous) @ Monitoring.ts:1024
setTranslatedRules @ Monitoring.ts:1015
handleTick @ Monitoring.ts:541
(anonymous) @ Monitoring.ts:488
(anonymous) @ simpleObserver.ts:21
emit @ simpleObserver.ts:19
handleMessage @ DerivService.tsx:446
(anonymous) @ DerivService.tsx:395
digit-pattern-rules.js?v=1775837114943:515 ❌ [TEST LOSING DIGITS FLEXIBLE] Erro: ReferenceError: losingDigits is not defined
    at DigitPatternRulesProcessor.testDigitAsX (digit-pattern-rules.js?v=1775837114943:525:55)
    at DigitPatternRulesProcessor.testLosingDigitsAsX (digit-pattern-rules.js?v=1775837114943:488:33)
    at DigitPatternRulesProcessor.verifyPatternMatch (digit-pattern-rules.js?v=1775837114943:378:25)
    at DigitPatternRulesProcessor.analyzeDigitPattern (digit-pattern-rules.js?v=1775837114943:268:33)
    at DigitPatternRulesProcessor.processDigitPatternRule (digit-pattern-rules.js?v=1775837114943:54:33)
    at FormatGenerator.checkRuleCondition (generate-format.js?v=1775837116221:2044:66)
    at MonitoringService.checkRuleCondition (Monitoring.ts:822:30)
    at Monitoring.ts:1032:44
    at Array.forEach (<anonymous>)
    at Monitoring.ts:1024:23
    at Array.forEach (<anonymous>)
    at MonitoringService.setTranslatedRules (Monitoring.ts:1015:30)
    at MonitoringService.handleTick (Monitoring.ts:541:12)
    at Monitoring.ts:488:14
    at simpleObserver.ts:21:21
    at Map.forEach (<anonymous>)
    at Observer.emit (simpleObserver.ts:19:37)
    at DerivService.handleMessage (DerivService.tsx:446:23)
    at WebSocket.<anonymous> (DerivService.tsx:395:52)
error @ intercept-console-error.ts:42
testLosingDigitsAsX @ digit-pattern-rules.js?v=1775837114943:515
verifyPatternMatch @ digit-pattern-rules.js?v=1775837114943:378
analyzeDigitPattern @ digit-pattern-rules.js?v=1775837114943:268
processDigitPatternRule @ digit-pattern-rules.js?v=1775837114943:54
checkRuleCondition @ generate-format.js?v=1775837116221:2044
checkRuleCondition @ Monitoring.ts:822
(anonymous) @ Monitoring.ts:1032
(anonymous) @ Monitoring.ts:1024
setTranslatedRules @ Monitoring.ts:1015
handleTick @ Monitoring.ts:541
(anonymous) @ Monitoring.ts:488
(anonymous) @ simpleObserver.ts:21
emit @ simpleObserver.ts:19
handleMessage @ DerivService.tsx:446
(anonymous) @ DerivService.tsx:395
digit-pattern-rules.js?v=1775837114943:515 ❌ [TEST LOSING DIGITS FLEXIBLE] Erro: ReferenceError: losingDigits is not defined
    at DigitPatternRulesProcessor.testDigitAsX (digit-pattern-rules.js?v=1775837114943:525:55)
    at DigitPatternRulesProcessor.testLosingDigitsAsX (digit-pattern-rules.js?v=1775837114943:488:33)
    at DigitPatternRulesProcessor.verifyPatternMatch (digit-pattern-rules.js?v=1775837114943:378:25)
    at DigitPatternRulesProcessor.analyzeDigitPattern (digit-pattern-rules.js?v=1775837114943:268:33)
    at DigitPatternRulesProcessor.processDigitPatternRule (digit-pattern-rules.js?v=1775837114943:54:33)
    at FormatGenerator.checkRuleCondition (generate-format.js?v=1775837116221:2044:66)
    at MonitoringService.checkRuleCondition (Monitoring.ts:822:30)
    at Monitoring.ts:1032:44
    at Array.forEach (<anonymous>)
    at Monitoring.ts:1024:23
    at Array.forEach (<anonymous>)
    at MonitoringService.setTranslatedRules (Monitoring.ts:1015:30)
    at MonitoringService.handleTick (Monitoring.ts:541:12)
    at Monitoring.ts:488:14
    at simpleObserver.ts:21:21
    at Map.forEach (<anonymous>)
    at Observer.emit (simpleObserver.ts:19:37)
    at DerivService.handleMessage (DerivService.tsx:446:23)
    at WebSocket.<anonymous> (DerivService.tsx:395:52)
error @ intercept-console-error.ts:42
testLosingDigitsAsX @ digit-pattern-rules.js?v=1775837114943:515
verifyPatternMatch @ digit-pattern-rules.js?v=1775837114943:378
analyzeDigitPattern @ digit-pattern-rules.js?v=1775837114943:268
processDigitPatternRule @ digit-pattern-rules.js?v=1775837114943:54
checkRuleCondition @ generate-format.js?v=1775837116221:2044
checkRuleCondition @ Monitoring.ts:822
(anonymous) @ Monitoring.ts:1032
(anonymous) @ Monitoring.ts:1024
setTranslatedRules @ Monitoring.ts:1015
handleTick @ Monitoring.ts:541
(anonymous) @ Monitoring.ts:488
(anonymous) @ simpleObserver.ts:21
emit @ simpleObserver.ts:19
handleMessage @ DerivService.tsx:446
(anonymous) @ DerivService.tsx:395
digit-pattern-rules.js?v=1775837114943:515 ❌ [TEST LOSING DIGITS FLEXIBLE] Erro: ReferenceError: losingDigits is not defined
    at DigitPatternRulesProcessor.testDigitAsX (digit-pattern-rules.js?v=1775837114943:525:55)
    at DigitPatternRulesProcessor.testLosingDigitsAsX (digit-pattern-rules.js?v=1775837114943:488:33)
    at DigitPatternRulesProcessor.verifyPatternMatch (digit-pattern-rules.js?v=1775837114943:378:25)
    at DigitPatternRulesProcessor.analyzeDigitPattern (digit-pattern-rules.js?v=1775837114943:268:33)
    at DigitPatternRulesProcessor.processDigitPatternRule (digit-pattern-rules.js?v=1775837114943:54:33)
    at FormatGenerator.checkRuleCondition (generate-format.js?v=1775837116221:2044:66)
    at MonitoringService.checkRuleCondition (Monitoring.ts:822:30)
    at Monitoring.ts:1032:44
    at Array.forEach (<anonymous>)
    at Monitoring.ts:1024:23
    at Array.forEach (<anonymous>)
    at MonitoringService.setTranslatedRules (Monitoring.ts:1015:30)
    at MonitoringService.handleTick (Monitoring.ts:541:12)
    at Monitoring.ts:488:14
    at simpleObserver.ts:21:21
    at Map.forEach (<anonymous>)
    at Observer.emit (simpleObserver.ts:19:37)
    at DerivService.handleMessage (DerivService.tsx:446:23)
    at WebSocket.<anonymous> (DerivService.tsx:395:52)
error @ intercept-console-error.ts:42
testLosingDigitsAsX @ digit-pattern-rules.js?v=1775837114943:515
verifyPatternMatch @ digit-pattern-rules.js?v=1775837114943:378
analyzeDigitPattern @ digit-pattern-rules.js?v=1775837114943:268
processDigitPatternRule @ digit-pattern-rules.js?v=1775837114943:54
checkRuleCondition @ generate-format.js?v=1775837116221:2044
checkRuleCondition @ Monitoring.ts:822
(anonymous) @ Monitoring.ts:1032
(anonymous) @ Monitoring.ts:1024
setTranslatedRules @ Monitoring.ts:1015
handleTick @ Monitoring.ts:541
(anonymous) @ Monitoring.ts:488
(anonymous) @ simpleObserver.ts:21
emit @ simpleObserver.ts:19
handleMessage @ DerivService.tsx:446
(anonymous) @ DerivService.tsx:395
digit-pattern-rules.js?v=1775837114943:515 ❌ [TEST LOSING DIGITS FLEXIBLE] Erro: ReferenceError: losingDigits is not defined
    at DigitPatternRulesProcessor.testDigitAsX (digit-pattern-rules.js?v=1775837114943:525:55)
    at DigitPatternRulesProcessor.testLosingDigitsAsX (digit-pattern-rules.js?v=1775837114943:488:33)
    at DigitPatternRulesProcessor.verifyPatternMatch (digit-pattern-rules.js?v=1775837114943:378:25)
    at DigitPatternRulesProcessor.analyzeDigitPattern (digit-pattern-rules.js?v=1775837114943:268:33)
    at DigitPatternRulesProcessor.processDigitPatternRule (digit-pattern-rules.js?v=1775837114943:54:33)
    at FormatGenerator.checkRuleCondition (generate-format.js?v=1775837116221:2044:66)
    at MonitoringService.checkRuleCondition (Monitoring.ts:822:30)
    at Monitoring.ts:1032:44
    at Array.forEach (<anonymous>)
    at Monitoring.ts:1024:23
    at Array.forEach (<anonymous>)
    at MonitoringService.setTranslatedRules (Monitoring.ts:1015:30)
    at MonitoringService.handleTick (Monitoring.ts:541:12)
    at Monitoring.ts:488:14
    at simpleObserver.ts:21:21
    at Map.forEach (<anonymous>)
    at Observer.emit (simpleObserver.ts:19:37)
    at DerivService.handleMessage (DerivService.tsx:446:23)
    at WebSocket.<anonymous> (DerivService.tsx:395:52)
error @ intercept-console-error.ts:42
testLosingDigitsAsX @ digit-pattern-rules.js?v=1775837114943:515
verifyPatternMatch @ digit-pattern-rules.js?v=1775837114943:378
analyzeDigitPattern @ digit-pattern-rules.js?v=1775837114943:268
processDigitPatternRule @ digit-pattern-rules.js?v=1775837114943:54
checkRuleCondition @ generate-format.js?v=1775837116221:2044
checkRuleCondition @ Monitoring.ts:822
(anonymous) @ Monitoring.ts:1032
(anonymous) @ Monitoring.ts:1024
setTranslatedRules @ Monitoring.ts:1015
handleTick @ Monitoring.ts:541
(anonymous) @ Monitoring.ts:488
(anonymous) @ simpleObserver.ts:21
emit @ simpleObserver.ts:19
handleMessage @ DerivService.tsx:446
(anonymous) @ DerivService.tsx:395
digit-pattern-rules.js?v=1775837114943:515 ❌ [TEST LOSING DIGITS FLEXIBLE] Erro: ReferenceError: losingDigits is not defined
    at DigitPatternRulesProcessor.testDigitAsX (digit-pattern-rules.js?v=1775837114943:525:55)
    at DigitPatternRulesProcessor.testLosingDigitsAsX (digit-pattern-rules.js?v=1775837114943:488:33)
    at DigitPatternRulesProcessor.verifyPatternMatch (digit-pattern-rules.js?v=1775837114943:378:25)
    at DigitPatternRulesProcessor.analyzeDigitPattern (digit-pattern-rules.js?v=1775837114943:268:33)
    at DigitPatternRulesProcessor.processDigitPatternRule (digit-pattern-rules.js?v=1775837114943:54:33)
    at FormatGenerator.checkRuleCondition (generate-format.js?v=1775837116221:2044:66)
    at MonitoringService.checkRuleCondition (Monitoring.ts:822:30)
    at Monitoring.ts:1032:44
    at Array.forEach (<anonymous>)
    at Monitoring.ts:1024:23
    at Array.forEach (<anonymous>)
    at MonitoringService.setTranslatedRules (Monitoring.ts:1015:30)
    at MonitoringService.handleTick (Monitoring.ts:541:12)
    at Monitoring.ts:488:14
    at simpleObserver.ts:21:21
    at Map.forEach (<anonymous>)
    at Observer.emit (simpleObserver.ts:19:37)
    at DerivService.handleMessage (DerivService.tsx:446:23)
    at WebSocket.<anonymous> (DerivService.tsx:395:52)
error @ intercept-console-error.ts:42
testLosingDigitsAsX @ digit-pattern-rules.js?v=1775837114943:515
verifyPatternMatch @ digit-pattern-rules.js?v=1775837114943:378
analyzeDigitPattern @ digit-pattern-rules.js?v=1775837114943:268
processDigitPatternRule @ digit-pattern-rules.js?v=1775837114943:54
checkRuleCondition @ generate-format.js?v=1775837116221:2044
checkRuleCondition @ Monitoring.ts:822
(anonymous) @ Monitoring.ts:1032
(anonymous) @ Monitoring.ts:1024
setTranslatedRules @ Monitoring.ts:1015
handleTick @ Monitoring.ts:541
(anonymous) @ Monitoring.ts:488
(anonymous) @ simpleObserver.ts:21
emit @ simpleObserver.ts:19
handleMessage @ DerivService.tsx:446
(anonymous) @ DerivService.tsx:395
digit-pattern-rules.js?v=1775837114943:515 ❌ [TEST LOSING DIGITS FLEXIBLE] Erro: ReferenceError: losingDigits is not defined
    at DigitPatternRulesProcessor.testDigitAsX (digit-pattern-rules.js?v=1775837114943:525:55)
    at DigitPatternRulesProcessor.testLosingDigitsAsX (digit-pattern-rules.js?v=1775837114943:488:33)
    at DigitPatternRulesProcessor.verifyPatternMatch (digit-pattern-rules.js?v=1775837114943:378:25)
    at DigitPatternRulesProcessor.analyzeDigitPattern (digit-pattern-rules.js?v=1775837114943:268:33)
    at DigitPatternRulesProcessor.processDigitPatternRule (digit-pattern-rules.js?v=1775837114943:54:33)
    at FormatGenerator.checkRuleCondition (generate-format.js?v=1775837116221:2044:66)
    at MonitoringService.checkRuleCondition (Monitoring.ts:822:30)
    at Monitoring.ts:1032:44
    at Array.forEach (<anonymous>)
    at Monitoring.ts:1024:23
    at Array.forEach (<anonymous>)
    at MonitoringService.setTranslatedRules (Monitoring.ts:1015:30)
    at MonitoringService.handleTick (Monitoring.ts:541:12)
    at Monitoring.ts:488:14
    at simpleObserver.ts:21:21
    at Map.forEach (<anonymous>)
    at Observer.emit (simpleObserver.ts:19:37)
    at DerivService.handleMessage (DerivService.tsx:446:23)
    at WebSocket.<anonymous> (DerivService.tsx:395:52)
error @ intercept-console-error.ts:42
testLosingDigitsAsX @ digit-pattern-rules.js?v=1775837114943:515
verifyPatternMatch @ digit-pattern-rules.js?v=1775837114943:378
analyzeDigitPattern @ digit-pattern-rules.js?v=1775837114943:268
processDigitPatternRule @ digit-pattern-rules.js?v=1775837114943:54
checkRuleCondition @ generate-format.js?v=1775837116221:2044
checkRuleCondition @ Monitoring.ts:822
(anonymous) @ Monitoring.ts:1032
(anonymous) @ Monitoring.ts:1024
setTranslatedRules @ Monitoring.ts:1015
handleTick @ Monitoring.ts:541
(anonymous) @ Monitoring.ts:488
(anonymous) @ simpleObserver.ts:21
emit @ simpleObserver.ts:19
handleMessage @ DerivService.tsx:446
(anonymous) @ DerivService.tsx:395
digit-pattern-rules.js?v=1775837114943:515 ❌ [TEST LOSING DIGITS FLEXIBLE] Erro: ReferenceError: losingDigits is not defined
    at DigitPatternRulesProcessor.testDigitAsX (digit-pattern-rules.js?v=1775837114943:525:55)
    at DigitPatternRulesProcessor.testLosingDigitsAsX (digit-pattern-rules.js?v=1775837114943:488:33)
    at DigitPatternRulesProcessor.verifyPatternMatch (digit-pattern-rules.js?v=1775837114943:378:25)
    at DigitPatternRulesProcessor.analyzeDigitPattern (digit-pattern-rules.js?v=1775837114943:268:33)
    at DigitPatternRulesProcessor.processDigitPatternRule (digit-pattern-rules.js?v=1775837114943:54:33)
    at FormatGenerator.checkRuleCondition (generate-format.js?v=1775837116221:2044:66)
    at MonitoringService.checkRuleCondition (Monitoring.ts:822:30)
    at Monitoring.ts:1032:44
    at Array.forEach (<anonymous>)
    at Monitoring.ts:1024:23
    at Array.forEach (<anonymous>)
    at MonitoringService.setTranslatedRules (Monitoring.ts:1015:30)
    at MonitoringService.handleTick (Monitoring.ts:541:12)
    at Monitoring.ts:488:14
    at simpleObserver.ts:21:21
    at Map.forEach (<anonymous>)
    at Observer.emit (simpleObserver.ts:19:37)
    at DerivService.handleMessage (DerivService.tsx:446:23)
    at WebSocket.<anonymous> (DerivService.tsx:395:52)
error @ intercept-console-error.ts:42
testLosingDigitsAsX @ digit-pattern-rules.js?v=1775837114943:515
verifyPatternMatch @ digit-pattern-rules.js?v=1775837114943:378
analyzeDigitPattern @ digit-pattern-rules.js?v=1775837114943:268
processDigitPatternRule @ digit-pattern-rules.js?v=1775837114943:54
checkRuleCondition @ generate-format.js?v=1775837116221:2044
checkRuleCondition @ Monitoring.ts:822
(anonymous) @ Monitoring.ts:1032
(anonymous) @ Monitoring.ts:1024
setTranslatedRules @ Monitoring.ts:1015
handleTick @ Monitoring.ts:541
(anonymous) @ Monitoring.ts:488
(anonymous) @ simpleObserver.ts:21
emit @ simpleObserver.ts:19
handleMessage @ DerivService.tsx:446
(anonymous) @ DerivService.tsx:395
digit-pattern-rules.js?v=1775837114943:515 ❌ [TEST LOSING DIGITS FLEXIBLE] Erro: ReferenceError: losingDigits is not defined
    at DigitPatternRulesProcessor.testDigitAsX (digit-pattern-rules.js?v=1775837114943:525:55)
    at DigitPatternRulesProcessor.testLosingDigitsAsX (digit-pattern-rules.js?v=1775837114943:488:33)
    at DigitPatternRulesProcessor.verifyPatternMatch (digit-pattern-rules.js?v=1775837114943:378:25)
    at DigitPatternRulesProcessor.analyzeDigitPattern (digit-pattern-rules.js?v=1775837114943:268:33)
    at DigitPatternRulesProcessor.processDigitPatternRule (digit-pattern-rules.js?v=1775837114943:54:33)
    at FormatGenerator.checkRuleCondition (generate-format.js?v=1775837116221:2044:66)
    at MonitoringService.checkRuleCondition (Monitoring.ts:822:30)
    at Monitoring.ts:1032:44
    at Array.forEach (<anonymous>)
    at Monitoring.ts:1024:23
    at Array.forEach (<anonymous>)
    at MonitoringService.setTranslatedRules (Monitoring.ts:1015:30)
    at MonitoringService.handleTick (Monitoring.ts:541:12)
    at Monitoring.ts:488:14
    at simpleObserver.ts:21:21
    at Map.forEach (<anonymous>)
    at Observer.emit (simpleObserver.ts:19:37)
    at DerivService.handleMessage (DerivService.tsx:446:23)
    at WebSocket.<anonymous> (DerivService.tsx:395:52)
error @ intercept-console-error.ts:42
testLosingDigitsAsX @ digit-pattern-rules.js?v=1775837114943:515
verifyPatternMatch @ digit-pattern-rules.js?v=1775837114943:378
analyzeDigitPattern @ digit-pattern-rules.js?v=1775837114943:268
processDigitPatternRule @ digit-pattern-rules.js?v=1775837114943:54
checkRuleCondition @ generate-format.js?v=1775837116221:2044
checkRuleCondition @ Monitoring.ts:822
(anonymous) @ Monitoring.ts:1032
(anonymous) @ Monitoring.ts:1024
setTranslatedRules @ Monitoring.ts:1015
handleTick @ Monitoring.ts:541
(anonymous) @ Monitoring.ts:488
(anonymous) @ simpleObserver.ts:21
emit @ simpleObserver.ts:19
handleMessage @ DerivService.tsx:446
(anonymous) @ DerivService.tsx:395
digit-pattern-rules.js?v=1775837114943:515 ❌ [TEST LOSING DIGITS FLEXIBLE] Erro: ReferenceError: losingDigits is not defined
    at DigitPatternRulesProcessor.testDigitAsX (digit-pattern-rules.js?v=1775837114943:525:55)
    at DigitPatternRulesProcessor.testLosingDigitsAsX (digit-pattern-rules.js?v=1775837114943:488:33)
    at DigitPatternRulesProcessor.verifyPatternMatch (digit-pattern-rules.js?v=1775837114943:378:25)
    at DigitPatternRulesProcessor.analyzeDigitPattern (digit-pattern-rules.js?v=1775837114943:268:33)
    at DigitPatternRulesProcessor.processDigitPatternRule (digit-pattern-rules.js?v=1775837114943:54:33)
    at FormatGenerator.checkRuleCondition (generate-format.js?v=1775837116221:2044:66)
    at MonitoringService.checkRuleCondition (Monitoring.ts:822:30)
    at Monitoring.ts:1032:44
    at Array.forEach (<anonymous>)
    at Monitoring.ts:1024:23
    at Array.forEach (<anonymous>)
    at MonitoringService.setTranslatedRules (Monitoring.ts:1015:30)
    at MonitoringService.handleTick (Monitoring.ts:541:12)
    at Monitoring.ts:488:14
    at simpleObserver.ts:21:21
    at Map.forEach (<anonymous>)
    at Observer.emit (simpleObserver.ts:19:37)
    at DerivService.handleMessage (DerivService.tsx:446:23)
    at WebSocket.<anonymous> (DerivService.tsx:395:52)
error @ intercept-console-error.ts:42
testLosingDigitsAsX @ digit-pattern-rules.js?v=1775837114943:515
verifyPatternMatch @ digit-pattern-rules.js?v=1775837114943:378
analyzeDigitPattern @ digit-pattern-rules.js?v=1775837114943:268
processDigitPatternRule @ digit-pattern-rules.js?v=1775837114943:54
checkRuleCondition @ generate-format.js?v=1775837116221:2044
checkRuleCondition @ Monitoring.ts:822
(anonymous) @ Monitoring.ts:1032
(anonymous) @ Monitoring.ts:1024
setTranslatedRules @ Monitoring.ts:1015
handleTick @ Monitoring.ts:541
(anonymous) @ Monitoring.ts:488
(anonymous) @ simpleObserver.ts:21
emit @ simpleObserver.ts:19
handleMessage @ DerivService.tsx:446
(anonymous) @ DerivService.tsx:395
digit-pattern-rules.js?v=1775837114943:515 ❌ [TEST LOSING DIGITS FLEXIBLE] Erro: ReferenceError: losingDigits is not defined
    at DigitPatternRulesProcessor.testDigitAsX (digit-pattern-rules.js?v=1775837114943:525:55)
    at DigitPatternRulesProcessor.testLosingDigitsAsX (digit-pattern-rules.js?v=1775837114943:488:33)
    at DigitPatternRulesProcessor.verifyPatternMatch (digit-pattern-rules.js?v=1775837114943:378:25)
    at DigitPatternRulesProcessor.analyzeDigitPattern (digit-pattern-rules.js?v=1775837114943:268:33)
    at DigitPatternRulesProcessor.processDigitPatternRule (digit-pattern-rules.js?v=1775837114943:54:33)
    at FormatGenerator.checkRuleCondition (generate-format.js?v=1775837116221:2044:66)
    at MonitoringService.checkRuleCondition (Monitoring.ts:822:30)
    at Monitoring.ts:1032:44
    at Array.forEach (<anonymous>)
    at Monitoring.ts:1024:23
    at Array.forEach (<anonymous>)
    at MonitoringService.setTranslatedRules (Monitoring.ts:1015:30)
    at MonitoringService.handleTick (Monitoring.ts:541:12)
    at Monitoring.ts:488:14
    at simpleObserver.ts:21:21
    at Map.forEach (<anonymous>)
    at Observer.emit (simpleObserver.ts:19:37)
    at DerivService.handleMessage (DerivService.tsx:446:23)
    at WebSocket.<anonymous> (DerivService.tsx:395:52)
error @ intercept-console-error.ts:42
testLosingDigitsAsX @ digit-pattern-rules.js?v=1775837114943:515
verifyPatternMatch @ digit-pattern-rules.js?v=1775837114943:378
analyzeDigitPattern @ digit-pattern-rules.js?v=1775837114943:268
processDigitPatternRule @ digit-pattern-rules.js?v=1775837114943:54
checkRuleCondition @ generate-format.js?v=1775837116221:2044
checkRuleCondition @ Monitoring.ts:822
(anonymous) @ Monitoring.ts:1032
(anonymous) @ Monitoring.ts:1024
setTranslatedRules @ Monitoring.ts:1015
handleTick @ Monitoring.ts:541
(anonymous) @ Monitoring.ts:488
(anonymous) @ simpleObserver.ts:21
emit @ simpleObserver.ts:19
handleMessage @ DerivService.tsx:446
(anonymous) @ DerivService.tsx:395
digit-pattern-rules.js?v=1775837114943:515 ❌ [TEST LOSING DIGITS FLEXIBLE] Erro: ReferenceError: losingDigits is not defined
    at DigitPatternRulesProcessor.testDigitAsX (digit-pattern-rules.js?v=1775837114943:525:55)
    at DigitPatternRulesProcessor.testLosingDigitsAsX (digit-pattern-rules.js?v=1775837114943:488:33)
    at DigitPatternRulesProcessor.verifyPatternMatch (digit-pattern-rules.js?v=1775837114943:378:25)
    at DigitPatternRulesProcessor.analyzeDigitPattern (digit-pattern-rules.js?v=1775837114943:268:33)
    at DigitPatternRulesProcessor.processDigitPatternRule (digit-pattern-rules.js?v=1775837114943:54:33)
    at FormatGenerator.checkRuleCondition (generate-format.js?v=1775837116221:2044:66)
    at MonitoringService.checkRuleCondition (Monitoring.ts:822:30)
    at Monitoring.ts:1032:44
    at Array.forEach (<anonymous>)
    at Monitoring.ts:1024:23
    at Array.forEach (<anonymous>)
    at MonitoringService.setTranslatedRules (Monitoring.ts:1015:30)
    at MonitoringService.handleTick (Monitoring.ts:541:12)
    at Monitoring.ts:488:14
    at simpleObserver.ts:21:21
    at Map.forEach (<anonymous>)
    at Observer.emit (simpleObserver.ts:19:37)
    at DerivService.handleMessage (DerivService.tsx:446:23)
    at WebSocket.<anonymous> (DerivService.tsx:395:52)
error @ intercept-console-error.ts:42
testLosingDigitsAsX @ digit-pattern-rules.js?v=1775837114943:515
verifyPatternMatch @ digit-pattern-rules.js?v=1775837114943:378
analyzeDigitPattern @ digit-pattern-rules.js?v=1775837114943:268
processDigitPatternRule @ digit-pattern-rules.js?v=1775837114943:54
checkRuleCondition @ generate-format.js?v=1775837116221:2044
checkRuleCondition @ Monitoring.ts:822
(anonymous) @ Monitoring.ts:1032
(anonymous) @ Monitoring.ts:1024
setTranslatedRules @ Monitoring.ts:1015
handleTick @ Monitoring.ts:541
(anonymous) @ Monitoring.ts:488
(anonymous) @ simpleObserver.ts:21
emit @ simpleObserver.ts:19
handleMessage @ DerivService.tsx:446
(anonymous) @ DerivService.tsx:395
digit-pattern-rules.js?v=1775837114943:515 ❌ [TEST LOSING DIGITS FLEXIBLE] Erro: ReferenceError: losingDigits is not defined
    at DigitPatternRulesProcessor.testDigitAsX (digit-pattern-rules.js?v=1775837114943:525:55)
    at DigitPatternRulesProcessor.testLosingDigitsAsX (digit-pattern-rules.js?v=1775837114943:488:33)
    at DigitPatternRulesProcessor.verifyPatternMatch (digit-pattern-rules.js?v=1775837114943:378:25)
    at DigitPatternRulesProcessor.analyzeDigitPattern (digit-pattern-rules.js?v=1775837114943:268:33)
    at DigitPatternRulesProcessor.processDigitPatternRule (digit-pattern-rules.js?v=1775837114943:54:33)
    at FormatGenerator.checkRuleCondition (generate-format.js?v=1775837116221:2044:66)
    at MonitoringService.checkRuleCondition (Monitoring.ts:822:30)
    at Monitoring.ts:1032:44
    at Array.forEach (<anonymous>)
    at Monitoring.ts:1024:23
    at Array.forEach (<anonymous>)
    at MonitoringService.setTranslatedRules (Monitoring.ts:1015:30)
    at MonitoringService.handleTick (Monitoring.ts:541:12)
    at Monitoring.ts:488:14
    at simpleObserver.ts:21:21
    at Map.forEach (<anonymous>)
    at Observer.emit (simpleObserver.ts:19:37)
    at DerivService.handleMessage (DerivService.tsx:446:23)
    at WebSocket.<anonymous> (DerivService.tsx:395:52)
error @ intercept-console-error.ts:42
testLosingDigitsAsX @ digit-pattern-rules.js?v=1775837114943:515
verifyPatternMatch @ digit-pattern-rules.js?v=1775837114943:378
analyzeDigitPattern @ digit-pattern-rules.js?v=1775837114943:268
processDigitPatternRule @ digit-pattern-rules.js?v=1775837114943:54
checkRuleCondition @ generate-format.js?v=1775837116221:2044
checkRuleCondition @ Monitoring.ts:822
(anonymous) @ Monitoring.ts:1032
(anonymous) @ Monitoring.ts:1024
setTranslatedRules @ Monitoring.ts:1015
handleTick @ Monitoring.ts:541
(anonymous) @ Monitoring.ts:488
(anonymous) @ simpleObserver.ts:21
emit @ simpleObserver.ts:19
handleMessage @ DerivService.tsx:446
(anonymous) @ DerivService.tsx:395
digit-pattern-rules.js?v=1775837114943:515 ❌ [TEST LOSING DIGITS FLEXIBLE] Erro: ReferenceError: losingDigits is not defined
    at DigitPatternRulesProcessor.testDigitAsX (digit-pattern-rules.js?v=1775837114943:525:55)
    at DigitPatternRulesProcessor.testLosingDigitsAsX (digit-pattern-rules.js?v=1775837114943:488:33)
    at DigitPatternRulesProcessor.verifyPatternMatch (digit-pattern-rules.js?v=1775837114943:378:25)
    at DigitPatternRulesProcessor.analyzeDigitPattern (digit-pattern-rules.js?v=1775837114943:268:33)
    at DigitPatternRulesProcessor.processDigitPatternRule (digit-pattern-rules.js?v=1775837114943:54:33)
    at FormatGenerator.checkRuleCondition (generate-format.js?v=1775837116221:2044:66)
    at MonitoringService.checkRuleCondition (Monitoring.ts:822:30)
    at Monitoring.ts:1032:44
    at Array.forEach (<anonymous>)
    at Monitoring.ts:1024:23
    at Array.forEach (<anonymous>)
    at MonitoringService.setTranslatedRules (Monitoring.ts:1015:30)
    at MonitoringService.handleTick (Monitoring.ts:541:12)
    at Monitoring.ts:488:14
    at simpleObserver.ts:21:21
    at Map.forEach (<anonymous>)
    at Observer.emit (simpleObserver.ts:19:37)
    at DerivService.handleMessage (DerivService.tsx:446:23)
    at WebSocket.<anonymous> (DerivService.tsx:395:52)
error @ intercept-console-error.ts:42
testLosingDigitsAsX @ digit-pattern-rules.js?v=1775837114943:515
verifyPatternMatch @ digit-pattern-rules.js?v=1775837114943:378
analyzeDigitPattern @ digit-pattern-rules.js?v=1775837114943:268
processDigitPatternRule @ digit-pattern-rules.js?v=1775837114943:54
checkRuleCondition @ generate-format.js?v=1775837116221:2044
checkRuleCondition @ Monitoring.ts:822
(anonymous) @ Monitoring.ts:1032
(anonymous) @ Monitoring.ts:1024
setTranslatedRules @ Monitoring.ts:1015
handleTick @ Monitoring.ts:541
(anonymous) @ Monitoring.ts:488
(anonymous) @ simpleObserver.ts:21
emit @ simpleObserver.ts:19
handleMessage @ DerivService.tsx:446
(anonymous) @ DerivService.tsx:395
digit-pattern-rules.js?v=1775837114943:515 ❌ [TEST LOSING DIGITS FLEXIBLE] Erro: ReferenceError: losingDigits is not defined
    at DigitPatternRulesProcessor.testDigitAsX (digit-pattern-rules.js?v=1775837114943:525:55)
    at DigitPatternRulesProcessor.testLosingDigitsAsX (digit-pattern-rules.js?v=1775837114943:488:33)
    at DigitPatternRulesProcessor.verifyPatternMatch (digit-pattern-rules.js?v=1775837114943:378:25)
    at DigitPatternRulesProcessor.analyzeDigitPattern (digit-pattern-rules.js?v=1775837114943:268:33)
    at DigitPatternRulesProcessor.processDigitPatternRule (digit-pattern-rules.js?v=1775837114943:54:33)
    at FormatGenerator.checkRuleCondition (generate-format.js?v=1775837116221:2044:66)
    at MonitoringService.checkRuleCondition (Monitoring.ts:822:30)
    at Monitoring.ts:1032:44
    at Array.forEach (<anonymous>)
    at Monitoring.ts:1024:23
    at Array.forEach (<anonymous>)
    at MonitoringService.setTranslatedRules (Monitoring.ts:1015:30)
    at MonitoringService.handleTick (Monitoring.ts:541:12)
    at Monitoring.ts:488:14
    at simpleObserver.ts:21:21
    at Map.forEach (<anonymous>)
    at Observer.emit (simpleObserver.ts:19:37)
    at DerivService.handleMessage (DerivService.tsx:446:23)
    at WebSocket.<anonymous> (DerivService.tsx:395:52)
error @ intercept-console-error.ts:42
testLosingDigitsAsX @ digit-pattern-rules.js?v=1775837114943:515
verifyPatternMatch @ digit-pattern-rules.js?v=1775837114943:378
analyzeDigitPattern @ digit-pattern-rules.js?v=1775837114943:268
processDigitPatternRule @ digit-pattern-rules.js?v=1775837114943:54
checkRuleCondition @ generate-format.js?v=1775837116221:2044
checkRuleCondition @ Monitoring.ts:822
(anonymous) @ Monitoring.ts:1032
(anonymous) @ Monitoring.ts:1024
setTranslatedRules @ Monitoring.ts:1015
handleTick @ Monitoring.ts:541
(anonymous) @ Monitoring.ts:488
(anonymous) @ simpleObserver.ts:21
emit @ simpleObserver.ts:19
handleMessage @ DerivService.tsx:446
(anonymous) @ DerivService.tsx:395
digit-pattern-rules.js?v=1775837114943:515 ❌ [TEST LOSING DIGITS FLEXIBLE] Erro: ReferenceError: losingDigits is not defined
    at DigitPatternRulesProcessor.testDigitAsX (digit-pattern-rules.js?v=1775837114943:525:55)
    at DigitPatternRulesProcessor.testLosingDigitsAsX (digit-pattern-rules.js?v=1775837114943:488:33)
    at DigitPatternRulesProcessor.verifyPatternMatch (digit-pattern-rules.js?v=1775837114943:378:25)
    at DigitPatternRulesProcessor.analyzeDigitPattern (digit-pattern-rules.js?v=1775837114943:268:33)
    at DigitPatternRulesProcessor.processDigitPatternRule (digit-pattern-rules.js?v=1775837114943:54:33)
    at FormatGenerator.checkRuleCondition (generate-format.js?v=1775837116221:2044:66)
    at MonitoringService.checkRuleCondition (Monitoring.ts:822:30)
    at Monitoring.ts:1032:44
    at Array.forEach (<anonymous>)
    at Monitoring.ts:1024:23
    at Array.forEach (<anonymous>)
    at MonitoringService.setTranslatedRules (Monitoring.ts:1015:30)
    at MonitoringService.handleTick (Monitoring.ts:541:12)
    at Monitoring.ts:488:14
    at simpleObserver.ts:21:21
    at Map.forEach (<anonymous>)
    at Observer.emit (simpleObserver.ts:19:37)
    at DerivService.handleMessage (DerivService.tsx:446:23)
    at WebSocket.<anonymous> (DerivService.tsx:395:52)
error @ intercept-console-error.ts:42
testLosingDigitsAsX @ digit-pattern-rules.js?v=1775837114943:515
verifyPatternMatch @ digit-pattern-rules.js?v=1775837114943:378
analyzeDigitPattern @ digit-pattern-rules.js?v=1775837114943:268
processDigitPatternRule @ digit-pattern-rules.js?v=1775837114943:54
checkRuleCondition @ generate-format.js?v=1775837116221:2044
checkRuleCondition @ Monitoring.ts:822
(anonymous) @ Monitoring.ts:1032
(anonymous) @ Monitoring.ts:1024
setTranslatedRules @ Monitoring.ts:1015
handleTick @ Monitoring.ts:541
(anonymous) @ Monitoring.ts:488
(anonymous) @ simpleObserver.ts:21
emit @ simpleObserver.ts:19
handleMessage @ DerivService.tsx:446
(anonymous) @ DerivService.tsx:395
digit-pattern-rules.js?v=1775837114943:515 ❌ [TEST LOSING DIGITS FLEXIBLE] Erro: ReferenceError: losingDigits is not defined
    at DigitPatternRulesProcessor.testDigitAsX (digit-pattern-rules.js?v=1775837114943:525:55)
    at DigitPatternRulesProcessor.testLosingDigitsAsX (digit-pattern-rules.js?v=1775837114943:488:33)
    at DigitPatternRulesProcessor.verifyPatternMatch (digit-pattern-rules.js?v=1775837114943:378:25)
    at DigitPatternRulesProcessor.analyzeDigitPattern (digit-pattern-rules.js?v=1775837114943:268:33)
    at DigitPatternRulesProcessor.processDigitPatternRule (digit-pattern-rules.js?v=1775837114943:54:33)
    at FormatGenerator.checkRuleCondition (generate-format.js?v=1775837116221:2044:66)
    at MonitoringService.checkRuleCondition (Monitoring.ts:822:30)
    at Monitoring.ts:1032:44
    at Array.forEach (<anonymous>)
    at Monitoring.ts:1024:23
    at Array.forEach (<anonymous>)
    at MonitoringService.setTranslatedRules (Monitoring.ts:1015:30)
    at MonitoringService.handleTick (Monitoring.ts:541:12)
    at Monitoring.ts:488:14
    at simpleObserver.ts:21:21
    at Map.forEach (<anonymous>)
    at Observer.emit (simpleObserver.ts:19:37)
    at DerivService.handleMessage (DerivService.tsx:446:23)
    at WebSocket.<anonymous> (DerivService.tsx:395:52)
error @ intercept-console-error.ts:42
testLosingDigitsAsX @ digit-pattern-rules.js?v=1775837114943:515
verifyPatternMatch @ digit-pattern-rules.js?v=1775837114943:378
analyzeDigitPattern @ digit-pattern-rules.js?v=1775837114943:268
processDigitPatternRule @ digit-pattern-rules.js?v=1775837114943:54
checkRuleCondition @ generate-format.js?v=1775837116221:2044
checkRuleCondition @ Monitoring.ts:822
(anonymous) @ Monitoring.ts:1032
(anonymous) @ Monitoring.ts:1024
setTranslatedRules @ Monitoring.ts:1015
handleTick @ Monitoring.ts:541
(anonymous) @ Monitoring.ts:488
(anonymous) @ simpleObserver.ts:21
emit @ simpleObserver.ts:19
handleMessage @ DerivService.tsx:446
(anonymous) @ DerivService.tsx:395
digit-pattern-rules.js?v=1775837114943:515 ❌ [TEST LOSING DIGITS FLEXIBLE] Erro: ReferenceError: losingDigits is not defined
    at DigitPatternRulesProcessor.testDigitAsX (digit-pattern-rules.js?v=1775837114943:525:55)
    at DigitPatternRulesProcessor.testLosingDigitsAsX (digit-pattern-rules.js?v=1775837114943:488:33)
    at DigitPatternRulesProcessor.verifyPatternMatch (digit-pattern-rules.js?v=1775837114943:378:25)
    at DigitPatternRulesProcessor.analyzeDigitPattern (digit-pattern-rules.js?v=1775837114943:268:33)
    at DigitPatternRulesProcessor.processDigitPatternRule (digit-pattern-rules.js?v=1775837114943:54:33)
    at FormatGenerator.checkRuleCondition (generate-format.js?v=1775837116221:2044:66)
    at MonitoringService.checkRuleCondition (Monitoring.ts:822:30)
    at Monitoring.ts:1032:44
    at Array.forEach (<anonymous>)
    at Monitoring.ts:1024:23
    at Array.forEach (<anonymous>)
    at MonitoringService.setTranslatedRules (Monitoring.ts:1015:30)
    at MonitoringService.handleTick (Monitoring.ts:541:12)
    at Monitoring.ts:488:14
    at simpleObserver.ts:21:21
    at Map.forEach (<anonymous>)
    at Observer.emit (simpleObserver.ts:19:37)
    at DerivService.handleMessage (DerivService.tsx:446:23)
    at WebSocket.<anonymous> (DerivService.tsx:395:52)
error @ intercept-console-error.ts:42
testLosingDigitsAsX @ digit-pattern-rules.js?v=1775837114943:515
verifyPatternMatch @ digit-pattern-rules.js?v=1775837114943:378
analyzeDigitPattern @ digit-pattern-rules.js?v=1775837114943:268
processDigitPatternRule @ digit-pattern-rules.js?v=1775837114943:54
checkRuleCondition @ generate-format.js?v=1775837116221:2044
checkRuleCondition @ Monitoring.ts:822
(anonymous) @ Monitoring.ts:1032
(anonymous) @ Monitoring.ts:1024
setTranslatedRules @ Monitoring.ts:1015
handleTick @ Monitoring.ts:541
(anonymous) @ Monitoring.ts:488
(anonymous) @ simpleObserver.ts:21
emit @ simpleObserver.ts:19
handleMessage @ DerivService.tsx:446
(anonymous) @ DerivService.tsx:395
digit-pattern-rules.js?v=1775837114943:515 ❌ [TEST LOSING DIGITS FLEXIBLE] Erro: ReferenceError: losingDigits is not defined
    at DigitPatternRulesProcessor.testDigitAsX (digit-pattern-rules.js?v=1775837114943:525:55)
    at DigitPatternRulesProcessor.testLosingDigitsAsX (digit-pattern-rules.js?v=1775837114943:488:33)
    at DigitPatternRulesProcessor.verifyPatternMatch (digit-pattern-rules.js?v=1775837114943:378:25)
    at DigitPatternRulesProcessor.analyzeDigitPattern (digit-pattern-rules.js?v=1775837114943:268:33)
    at DigitPatternRulesProcessor.processDigitPatternRule (digit-pattern-rules.js?v=1775837114943:54:33)
    at FormatGenerator.checkRuleCondition (generate-format.js?v=1775837116221:2044:66)
    at MonitoringService.checkRuleCondition (Monitoring.ts:822:30)
    at Monitoring.ts:1032:44
    at Array.forEach (<anonymous>)
    at Monitoring.ts:1024:23
    at Array.forEach (<anonymous>)
    at MonitoringService.setTranslatedRules (Monitoring.ts:1015:30)
    at MonitoringService.handleTick (Monitoring.ts:541:12)
    at Monitoring.ts:488:14
    at simpleObserver.ts:21:21
    at Map.forEach (<anonymous>)
    at Observer.emit (simpleObserver.ts:19:37)
    at DerivService.handleMessage (DerivService.tsx:446:23)
    at WebSocket.<anonymous> (DerivService.tsx:395:52)
error @ intercept-console-error.ts:42
testLosingDigitsAsX @ digit-pattern-rules.js?v=1775837114943:515
verifyPatternMatch @ digit-pattern-rules.js?v=1775837114943:378
analyzeDigitPattern @ digit-pattern-rules.js?v=1775837114943:268
processDigitPatternRule @ digit-pattern-rules.js?v=1775837114943:54
checkRuleCondition @ generate-format.js?v=1775837116221:2044
checkRuleCondition @ Monitoring.ts:822
(anonymous) @ Monitoring.ts:1032
(anonymous) @ Monitoring.ts:1024
setTranslatedRules @ Monitoring.ts:1015
handleTick @ Monitoring.ts:541
(anonymous) @ Monitoring.ts:488
(anonymous) @ simpleObserver.ts:21
emit @ simpleObserver.ts:19
handleMessage @ DerivService.tsx:446
(anonymous) @ DerivService.tsx:395
digit-pattern-rules.js?v=1775837114943:515 ❌ [TEST LOSING DIGITS FLEXIBLE] Erro: ReferenceError: losingDigits is not defined
    at DigitPatternRulesProcessor.testDigitAsX (digit-pattern-rules.js?v=1775837114943:525:55)
    at DigitPatternRulesProcessor.testLosingDigitsAsX (digit-pattern-rules.js?v=1775837114943:488:33)
    at DigitPatternRulesProcessor.verifyPatternMatch (digit-pattern-rules.js?v=1775837114943:378:25)
    at DigitPatternRulesProcessor.analyzeDigitPattern (digit-pattern-rules.js?v=1775837114943:268:33)
    at DigitPatternRulesProcessor.processDigitPatternRule (digit-pattern-rules.js?v=1775837114943:54:33)
    at FormatGenerator.checkRuleCondition (generate-format.js?v=1775837116221:2044:66)
    at MonitoringService.checkRuleCondition (Monitoring.ts:822:30)
    at Monitoring.ts:1032:44
    at Array.forEach (<anonymous>)
    at Monitoring.ts:1024:23
    at Array.forEach (<anonymous>)
    at MonitoringService.setTranslatedRules (Monitoring.ts:1015:30)
    at MonitoringService.handleTick (Monitoring.ts:541:12)
    at Monitoring.ts:488:14
    at simpleObserver.ts:21:21
    at Map.forEach (<anonymous>)
    at Observer.emit (simpleObserver.ts:19:37)
    at DerivService.handleMessage (DerivService.tsx:446:23)
    at WebSocket.<anonymous> (DerivService.tsx:395:52)
error @ intercept-console-error.ts:42
testLosingDigitsAsX @ digit-pattern-rules.js?v=1775837114943:515
verifyPatternMatch @ digit-pattern-rules.js?v=1775837114943:378
analyzeDigitPattern @ digit-pattern-rules.js?v=1775837114943:268
processDigitPatternRule @ digit-pattern-rules.js?v=1775837114943:54
checkRuleCondition @ generate-format.js?v=1775837116221:2044
checkRuleCondition @ Monitoring.ts:822
(anonymous) @ Monitoring.ts:1032
(anonymous) @ Monitoring.ts:1024
setTranslatedRules @ Monitoring.ts:1015
handleTick @ Monitoring.ts:541
(anonymous) @ Monitoring.ts:488
(anonymous) @ simpleObserver.ts:21
emit @ simpleObserver.ts:19
handleMessage @ DerivService.tsx:446
(anonymous) @ DerivService.tsx:395
digit-pattern-rules.js?v=1775837114943:515 ❌ [TEST LOSING DIGITS FLEXIBLE] Erro: ReferenceError: losingDigits is not defined
    at DigitPatternRulesProcessor.testDigitAsX (digit-pattern-rules.js?v=1775837114943:525:55)
    at DigitPatternRulesProcessor.testLosingDigitsAsX (digit-pattern-rules.js?v=1775837114943:488:33)
    at DigitPatternRulesProcessor.verifyPatternMatch (digit-pattern-rules.js?v=1775837114943:378:25)
    at DigitPatternRulesProcessor.analyzeDigitPattern (digit-pattern-rules.js?v=1775837114943:268:33)
    at DigitPatternRulesProcessor.processDigitPatternRule (digit-pattern-rules.js?v=1775837114943:54:33)
    at FormatGenerator.checkRuleCondition (generate-format.js?v=1775837116221:2044:66)
    at MonitoringService.checkRuleCondition (Monitoring.ts:822:30)
    at Monitoring.ts:1032:44
    at Array.forEach (<anonymous>)
    at Monitoring.ts:1024:23
    at Array.forEach (<anonymous>)
    at MonitoringService.setTranslatedRules (Monitoring.ts:1015:30)
    at MonitoringService.handleTick (Monitoring.ts:541:12)
    at Monitoring.ts:488:14
    at simpleObserver.ts:21:21
    at Map.forEach (<anonymous>)
    at Observer.emit (simpleObserver.ts:19:37)
    at DerivService.handleMessage (DerivService.tsx:446:23)
    at WebSocket.<anonymous> (DerivService.tsx:395:52)
error @ intercept-console-error.ts:42
testLosingDigitsAsX @ digit-pattern-rules.js?v=1775837114943:515
verifyPatternMatch @ digit-pattern-rules.js?v=1775837114943:378
analyzeDigitPattern @ digit-pattern-rules.js?v=1775837114943:268
processDigitPatternRule @ digit-pattern-rules.js?v=1775837114943:54
checkRuleCondition @ generate-format.js?v=1775837116221:2044
checkRuleCondition @ Monitoring.ts:822
(anonymous) @ Monitoring.ts:1032
(anonymous) @ Monitoring.ts:1024
setTranslatedRules @ Monitoring.ts:1015
handleTick @ Monitoring.ts:541
(anonymous) @ Monitoring.ts:488
(anonymous) @ simpleObserver.ts:21
emit @ simpleObserver.ts:19
handleMessage @ DerivService.tsx:446
(anonymous) @ DerivService.tsx:395
digit-pattern-rules.js?v=1775837114943:515 ❌ [TEST LOSING DIGITS FLEXIBLE] Erro: ReferenceError: losingDigits is not defined
    at DigitPatternRulesProcessor.testDigitAsX (digit-pattern-rules.js?v=1775837114943:525:55)
    at DigitPatternRulesProcessor.testLosingDigitsAsX (digit-pattern-rules.js?v=1775837114943:488:33)
    at DigitPatternRulesProcessor.verifyPatternMatch (digit-pattern-rules.js?v=1775837114943:378:25)
    at DigitPatternRulesProcessor.analyzeDigitPattern (digit-pattern-rules.js?v=1775837114943:268:33)
    at DigitPatternRulesProcessor.processDigitPatternRule (digit-pattern-rules.js?v=1775837114943:54:33)
    at FormatGenerator.checkRuleCondition (generate-format.js?v=1775837116221:2044:66)
    at MonitoringService.checkRuleCondition (Monitoring.ts:822:30)
    at Monitoring.ts:1032:44
    at Array.forEach (<anonymous>)
    at Monitoring.ts:1024:23
    at Array.forEach (<anonymous>)
    at MonitoringService.setTranslatedRules (Monitoring.ts:1015:30)
    at MonitoringService.handleTick (Monitoring.ts:541:12)
    at Monitoring.ts:488:14
    at simpleObserver.ts:21:21
    at Map.forEach (<anonymous>)
    at Observer.emit (simpleObserver.ts:19:37)
    at DerivService.handleMessage (DerivService.tsx:446:23)
    at WebSocket.<anonymous> (DerivService.tsx:395:52)
error @ intercept-console-error.ts:42
testLosingDigitsAsX @ digit-pattern-rules.js?v=1775837114943:515
verifyPatternMatch @ digit-pattern-rules.js?v=1775837114943:378
analyzeDigitPattern @ digit-pattern-rules.js?v=1775837114943:268
processDigitPatternRule @ digit-pattern-rules.js?v=1775837114943:54
checkRuleCondition @ generate-format.js?v=1775837116221:2044
checkRuleCondition @ Monitoring.ts:822
(anonymous) @ Monitoring.ts:1032
(anonymous) @ Monitoring.ts:1024
setTranslatedRules @ Monitoring.ts:1015
handleTick @ Monitoring.ts:541
(anonymous) @ Monitoring.ts:488
(anonymous) @ simpleObserver.ts:21
emit @ simpleObserver.ts:19
handleMessage @ DerivService.tsx:446
(anonymous) @ DerivService.tsx:395
digit-pattern-rules.js?v=1775837114943:515 ❌ [TEST LOSING DIGITS FLEXIBLE] Erro: ReferenceError: losingDigits is not defined
    at DigitPatternRulesProcessor.testDigitAsX (digit-pattern-rules.js?v=1775837114943:525:55)
    at DigitPatternRulesProcessor.testLosingDigitsAsX (digit-pattern-rules.js?v=1775837114943:488:33)
    at DigitPatternRulesProcessor.verifyPatternMatch (digit-pattern-rules.js?v=1775837114943:378:25)
    at DigitPatternRulesProcessor.analyzeDigitPattern (digit-pattern-rules.js?v=1775837114943:268:33)
    at DigitPatternRulesProcessor.processDigitPatternRule (digit-pattern-rules.js?v=1775837114943:54:33)
    at FormatGenerator.checkRuleCondition (generate-format.js?v=1775837116221:2044:66)
    at MonitoringService.checkRuleCondition (Monitoring.ts:822:30)
    at Monitoring.ts:1032:44
    at Array.forEach (<anonymous>)
    at Monitoring.ts:1024:23
    at Array.forEach (<anonymous>)
    at MonitoringService.setTranslatedRules (Monitoring.ts:1015:30)
    at MonitoringService.handleTick (Monitoring.ts:541:12)
    at Monitoring.ts:488:14
    at simpleObserver.ts:21:21
    at Map.forEach (<anonymous>)
    at Observer.emit (simpleObserver.ts:19:37)
    at DerivService.handleMessage (DerivService.tsx:446:23)
    at WebSocket.<anonymous> (DerivService.tsx:395:52)
error @ intercept-console-error.ts:42
testLosingDigitsAsX @ digit-pattern-rules.js?v=1775837114943:515
verifyPatternMatch @ digit-pattern-rules.js?v=1775837114943:378
analyzeDigitPattern @ digit-pattern-rules.js?v=1775837114943:268
processDigitPatternRule @ digit-pattern-rules.js?v=1775837114943:54
checkRuleCondition @ generate-format.js?v=1775837116221:2044
checkRuleCondition @ Monitoring.ts:822
(anonymous) @ Monitoring.ts:1032
(anonymous) @ Monitoring.ts:1024
setTranslatedRules @ Monitoring.ts:1015
handleTick @ Monitoring.ts:541
(anonymous) @ Monitoring.ts:488
(anonymous) @ simpleObserver.ts:21
emit @ simpleObserver.ts:19
handleMessage @ DerivService.tsx:446
(anonymous) @ DerivService.tsx:395
digit-pattern-rules.js?v=1775837114943:515 ❌ [TEST LOSING DIGITS FLEXIBLE] Erro: ReferenceError: losingDigits is not defined
    at DigitPatternRulesProcessor.testDigitAsX (digit-pattern-rules.js?v=1775837114943:525:55)
    at DigitPatternRulesProcessor.testLosingDigitsAsX (digit-pattern-rules.js?v=1775837114943:488:33)
    at DigitPatternRulesProcessor.verifyPatternMatch (digit-pattern-rules.js?v=1775837114943:378:25)
    at DigitPatternRulesProcessor.analyzeDigitPattern (digit-pattern-rules.js?v=1775837114943:268:33)
    at DigitPatternRulesProcessor.processDigitPatternRule (digit-pattern-rules.js?v=1775837114943:54:33)
    at FormatGenerator.checkRuleCondition (generate-format.js?v=1775837116221:2044:66)
    at MonitoringService.checkRuleCondition (Monitoring.ts:822:30)
    at Monitoring.ts:1032:44
    at Array.forEach (<anonymous>)
    at Monitoring.ts:1024:23
    at Array.forEach (<anonymous>)
    at MonitoringService.setTranslatedRules (Monitoring.ts:1015:30)
    at MonitoringService.handleTick (Monitoring.ts:541:12)
    at Monitoring.ts:488:14
    at simpleObserver.ts:21:21
    at Map.forEach (<anonymous>)
    at Observer.emit (simpleObserver.ts:19:37)
    at DerivService.handleMessage (DerivService.tsx:446:23)
    at WebSocket.<anonymous> (DerivService.tsx:395:52)
error @ intercept-console-error.ts:42
testLosingDigitsAsX @ digit-pattern-rules.js?v=1775837114943:515
verifyPatternMatch @ digit-pattern-rules.js?v=1775837114943:378
analyzeDigitPattern @ digit-pattern-rules.js?v=1775837114943:268
processDigitPatternRule @ digit-pattern-rules.js?v=1775837114943:54
checkRuleCondition @ generate-format.js?v=1775837116221:2044
checkRuleCondition @ Monitoring.ts:822
(anonymous) @ Monitoring.ts:1032
(anonymous) @ Monitoring.ts:1024
setTranslatedRules @ Monitoring.ts:1015
handleTick @ Monitoring.ts:541
(anonymous) @ Monitoring.ts:488
(anonymous) @ simpleObserver.ts:21
emit @ simpleObserver.ts:19
handleMessage @ DerivService.tsx:446
(anonymous) @ DerivService.tsx:395
digit-pattern-rules.js?v=1775837114943:515 ❌ [TEST LOSING DIGITS FLEXIBLE] Erro: ReferenceError: losingDigits is not defined
    at DigitPatternRulesProcessor.testDigitAsX (digit-pattern-rules.js?v=1775837114943:525:55)
    at DigitPatternRulesProcessor.testLosingDigitsAsX (digit-pattern-rules.js?v=1775837114943:488:33)
    at DigitPatternRulesProcessor.verifyPatternMatch (digit-pattern-rules.js?v=1775837114943:378:25)
    at DigitPatternRulesProcessor.analyzeDigitPattern (digit-pattern-rules.js?v=1775837114943:268:33)
    at DigitPatternRulesProcessor.processDigitPatternRule (digit-pattern-rules.js?v=1775837114943:54:33)
    at FormatGenerator.checkRuleCondition (generate-format.js?v=1775837116221:2044:66)
    at MonitoringService.checkRuleCondition (Monitoring.ts:822:30)
    at Monitoring.ts:1032:44
    at Array.forEach (<anonymous>)
    at Monitoring.ts:1024:23
    at Array.forEach (<anonymous>)
    at MonitoringService.setTranslatedRules (Monitoring.ts:1015:30)
    at MonitoringService.handleTick (Monitoring.ts:541:12)
    at Monitoring.ts:488:14
    at simpleObserver.ts:21:21
    at Map.forEach (<anonymous>)
    at Observer.emit (simpleObserver.ts:19:37)
    at DerivService.handleMessage (DerivService.tsx:446:23)
    at WebSocket.<anonymous> (DerivService.tsx:395:52)
error @ intercept-console-error.ts:42
testLosingDigitsAsX @ digit-pattern-rules.js?v=1775837114943:515
verifyPatternMatch @ digit-pattern-rules.js?v=1775837114943:378
analyzeDigitPattern @ digit-pattern-rules.js?v=1775837114943:268
processDigitPatternRule @ digit-pattern-rules.js?v=1775837114943:54
checkRuleCondition @ generate-format.js?v=1775837116221:2044
checkRuleCondition @ Monitoring.ts:822
(anonymous) @ Monitoring.ts:1032
(anonymous) @ Monitoring.ts:1024
setTranslatedRules @ Monitoring.ts:1015
handleTick @ Monitoring.ts:541
(anonymous) @ Monitoring.ts:488
(anonymous) @ simpleObserver.ts:21
emit @ simpleObserver.ts:19
handleMessage @ DerivService.tsx:446
(anonymous) @ DerivService.tsx:395
digit-pattern-rules.js?v=1775837114943:515 ❌ [TEST LOSING DIGITS FLEXIBLE] Erro: ReferenceError: losingDigits is not defined
    at DigitPatternRulesProcessor.testDigitAsX (digit-pattern-rules.js?v=1775837114943:525:55)
    at DigitPatternRulesProcessor.testLosingDigitsAsX (digit-pattern-rules.js?v=1775837114943:488:33)
    at DigitPatternRulesProcessor.verifyPatternMatch (digit-pattern-rules.js?v=1775837114943:378:25)
    at DigitPatternRulesProcessor.analyzeDigitPattern (digit-pattern-rules.js?v=1775837114943:268:33)
    at DigitPatternRulesProcessor.processDigitPatternRule (digit-pattern-rules.js?v=1775837114943:54:33)
    at FormatGenerator.checkRuleCondition (generate-format.js?v=1775837116221:2044:66)
    at MonitoringService.checkRuleCondition (Monitoring.ts:822:30)
    at Monitoring.ts:1032:44
    at Array.forEach (<anonymous>)
    at Monitoring.ts:1024:23
    at Array.forEach (<anonymous>)
    at MonitoringService.setTranslatedRules (Monitoring.ts:1015:30)
    at MonitoringService.handleTick (Monitoring.ts:541:12)
    at Monitoring.ts:488:14
    at simpleObserver.ts:21:21
    at Map.forEach (<anonymous>)
    at Observer.emit (simpleObserver.ts:19:37)
    at DerivService.handleMessage (DerivService.tsx:446:23)
    at WebSocket.<anonymous> (DerivService.tsx:395:52)
error @ intercept-console-error.ts:42
testLosingDigitsAsX @ digit-pattern-rules.js?v=1775837114943:515
verifyPatternMatch @ digit-pattern-rules.js?v=1775837114943:378
analyzeDigitPattern @ digit-pattern-rules.js?v=1775837114943:268
processDigitPatternRule @ digit-pattern-rules.js?v=1775837114943:54
checkRuleCondition @ generate-format.js?v=1775837116221:2044
checkRuleCondition @ Monitoring.ts:822
(anonymous) @ Monitoring.ts:1032
(anonymous) @ Monitoring.ts:1024
setTranslatedRules @ Monitoring.ts:1015
handleTick @ Monitoring.ts:541
(anonymous) @ Monitoring.ts:488
(anonymous) @ simpleObserver.ts:21
emit @ simpleObserver.ts:19
handleMessage @ DerivService.tsx:446
(anonymous) @ DerivService.tsx:395
digit-pattern-rules.js?v=1775837114943:515 ❌ [TEST LOSING DIGITS FLEXIBLE] Erro: ReferenceError: losingDigits is not defined
    at DigitPatternRulesProcessor.testDigitAsX (digit-pattern-rules.js?v=1775837114943:525:55)
    at DigitPatternRulesProcessor.testLosingDigitsAsX (digit-pattern-rules.js?v=1775837114943:488:33)
    at DigitPatternRulesProcessor.verifyPatternMatch (digit-pattern-rules.js?v=1775837114943:378:25)
    at DigitPatternRulesProcessor.analyzeDigitPattern (digit-pattern-rules.js?v=1775837114943:268:33)
    at DigitPatternRulesProcessor.processDigitPatternRule (digit-pattern-rules.js?v=1775837114943:54:33)
    at FormatGenerator.checkRuleCondition (generate-format.js?v=1775837116221:2044:66)
    at MonitoringService.checkRuleCondition (Monitoring.ts:822:30)
    at Monitoring.ts:1032:44
    at Array.forEach (<anonymous>)
    at Monitoring.ts:1024:23
    at Array.forEach (<anonymous>)
    at MonitoringService.setTranslatedRules (Monitoring.ts:1015:30)
    at MonitoringService.handleTick (Monitoring.ts:541:12)
    at Monitoring.ts:488:14
    at simpleObserver.ts:21:21
    at Map.forEach (<anonymous>)
    at Observer.emit (simpleObserver.ts:19:37)
    at DerivService.handleMessage (DerivService.tsx:446:23)
    at WebSocket.<anonymous> (DerivService.tsx:395:52)
error @ intercept-console-error.ts:42
testLosingDigitsAsX @ digit-pattern-rules.js?v=1775837114943:515
verifyPatternMatch @ digit-pattern-rules.js?v=1775837114943:378
analyzeDigitPattern @ digit-pattern-rules.js?v=1775837114943:268
processDigitPatternRule @ digit-pattern-rules.js?v=1775837114943:54
checkRuleCondition @ generate-format.js?v=1775837116221:2044
checkRuleCondition @ Monitoring.ts:822
(anonymous) @ Monitoring.ts:1032
(anonymous) @ Monitoring.ts:1024
setTranslatedRules @ Monitoring.ts:1015
handleTick @ Monitoring.ts:541
(anonymous) @ Monitoring.ts:488
(anonymous) @ simpleObserver.ts:21
emit @ simpleObserver.ts:19
handleMessage @ DerivService.tsx:446
(anonymous) @ DerivService.tsx:395
digit-pattern-rules.js?v=1775837114943:515 ❌ [TEST LOSING DIGITS FLEXIBLE] Erro: ReferenceError: losingDigits is not defined
    at DigitPatternRulesProcessor.testDigitAsX (digit-pattern-rules.js?v=1775837114943:525:55)
    at DigitPatternRulesProcessor.testLosingDigitsAsX (digit-pattern-rules.js?v=1775837114943:488:33)
    at DigitPatternRulesProcessor.verifyPatternMatch (digit-pattern-rules.js?v=1775837114943:378:25)
    at DigitPatternRulesProcessor.analyzeDigitPattern (digit-pattern-rules.js?v=1775837114943:268:33)
    at DigitPatternRulesProcessor.processDigitPatternRule (digit-pattern-rules.js?v=1775837114943:54:33)
    at FormatGenerator.checkRuleCondition (generate-format.js?v=1775837116221:2044:66)
    at MonitoringService.checkRuleCondition (Monitoring.ts:822:30)
    at Monitoring.ts:1032:44
    at Array.forEach (<anonymous>)
    at Monitoring.ts:1024:23
    at Array.forEach (<anonymous>)
    at MonitoringService.setTranslatedRules (Monitoring.ts:1015:30)
    at MonitoringService.handleTick (Monitoring.ts:541:12)
    at Monitoring.ts:488:14
    at simpleObserver.ts:21:21
    at Map.forEach (<anonymous>)
    at Observer.emit (simpleObserver.ts:19:37)
    at DerivService.handleMessage (DerivService.tsx:446:23)
    at WebSocket.<anonymous> (DerivService.tsx:395:52)
error @ intercept-console-error.ts:42
testLosingDigitsAsX @ digit-pattern-rules.js?v=1775837114943:515
verifyPatternMatch @ digit-pattern-rules.js?v=1775837114943:378
analyzeDigitPattern @ digit-pattern-rules.js?v=1775837114943:268
processDigitPatternRule @ digit-pattern-rules.js?v=1775837114943:54
checkRuleCondition @ generate-format.js?v=1775837116221:2044
checkRuleCondition @ Monitoring.ts:822
(anonymous) @ Monitoring.ts:1032
(anonymous) @ Monitoring.ts:1024
setTranslatedRules @ Monitoring.ts:1015
handleTick @ Monitoring.ts:541
(anonymous) @ Monitoring.ts:488
(anonymous) @ simpleObserver.ts:21
emit @ simpleObserver.ts:19
handleMessage @ DerivService.tsx:446
(anonymous) @ DerivService.tsx:395
digit-pattern-rules.js?v=1775837114943:515 ❌ [TEST LOSING DIGITS FLEXIBLE] Erro: ReferenceError: losingDigits is not defined
    at DigitPatternRulesProcessor.testDigitAsX (digit-pattern-rules.js?v=1775837114943:525:55)
    at DigitPatternRulesProcessor.testLosingDigitsAsX (digit-pattern-rules.js?v=1775837114943:488:33)
    at DigitPatternRulesProcessor.verifyPatternMatch (digit-pattern-rules.js?v=1775837114943:378:25)
    at DigitPatternRulesProcessor.analyzeDigitPattern (digit-pattern-rules.js?v=1775837114943:268:33)
    at DigitPatternRulesProcessor.processDigitPatternRule (digit-pattern-rules.js?v=1775837114943:54:33)
    at FormatGenerator.checkRuleCondition (generate-format.js?v=1775837116221:2044:66)
    at MonitoringService.checkRuleCondition (Monitoring.ts:822:30)
    at Monitoring.ts:1032:44
    at Array.forEach (<anonymous>)
    at Monitoring.ts:1024:23
    at Array.forEach (<anonymous>)
    at MonitoringService.setTranslatedRules (Monitoring.ts:1015:30)
    at MonitoringService.handleTick (Monitoring.ts:541:12)
    at Monitoring.ts:488:14
    at simpleObserver.ts:21:21
    at Map.forEach (<anonymous>)
    at Observer.emit (simpleObserver.ts:19:37)
    at DerivService.handleMessage (DerivService.tsx:446:23)
    at WebSocket.<anonymous> (DerivService.tsx:395:52)
error @ intercept-console-error.ts:42
testLosingDigitsAsX @ digit-pattern-rules.js?v=1775837114943:515
verifyPatternMatch @ digit-pattern-rules.js?v=1775837114943:378
analyzeDigitPattern @ digit-pattern-rules.js?v=1775837114943:268
processDigitPatternRule @ digit-pattern-rules.js?v=1775837114943:54
checkRuleCondition @ generate-format.js?v=1775837116221:2044
checkRuleCondition @ Monitoring.ts:822
(anonymous) @ Monitoring.ts:1032
(anonymous) @ Monitoring.ts:1024
setTranslatedRules @ Monitoring.ts:1015
handleTick @ Monitoring.ts:541
(anonymous) @ Monitoring.ts:488
(anonymous) @ simpleObserver.ts:21
emit @ simpleObserver.ts:19
handleMessage @ DerivService.tsx:446
(anonymous) @ DerivService.tsx:395
digit-pattern-rules.js?v=1775837114943:515 ❌ [TEST LOSING DIGITS FLEXIBLE] Erro: ReferenceError: losingDigits is not defined
    at DigitPatternRulesProcessor.testDigitAsX (digit-pattern-rules.js?v=1775837114943:525:55)
    at DigitPatternRulesProcessor.testLosingDigitsAsX (digit-pattern-rules.js?v=1775837114943:488:33)
    at DigitPatternRulesProcessor.verifyPatternMatch (digit-pattern-rules.js?v=1775837114943:378:25)
    at DigitPatternRulesProcessor.analyzeDigitPattern (digit-pattern-rules.js?v=1775837114943:268:33)
    at DigitPatternRulesProcessor.processDigitPatternRule (digit-pattern-rules.js?v=1775837114943:54:33)
    at FormatGenerator.checkRuleCondition (generate-format.js?v=1775837116221:2044:66)
    at MonitoringService.checkRuleCondition (Monitoring.ts:822:30)
    at Monitoring.ts:1032:44
    at Array.forEach (<anonymous>)
    at Monitoring.ts:1024:23
    at Array.forEach (<anonymous>)
    at MonitoringService.setTranslatedRules (Monitoring.ts:1015:30)
    at MonitoringService.handleTick (Monitoring.ts:541:12)
    at Monitoring.ts:488:14
    at simpleObserver.ts:21:21
    at Map.forEach (<anonymous>)
    at Observer.emit (simpleObserver.ts:19:37)
    at DerivService.handleMessage (DerivService.tsx:446:23)
    at WebSocket.<anonymous> (DerivService.tsx:395:52)
error @ intercept-console-error.ts:42
testLosingDigitsAsX @ digit-pattern-rules.js?v=1775837114943:515
verifyPatternMatch @ digit-pattern-rules.js?v=1775837114943:378
analyzeDigitPattern @ digit-pattern-rules.js?v=1775837114943:268
processDigitPatternRule @ digit-pattern-rules.js?v=1775837114943:54
checkRuleCondition @ generate-format.js?v=1775837116221:2044
checkRuleCondition @ Monitoring.ts:822
(anonymous) @ Monitoring.ts:1032
(anonymous) @ Monitoring.ts:1024
setTranslatedRules @ Monitoring.ts:1015
handleTick @ Monitoring.ts:541
(anonymous) @ Monitoring.ts:488
(anonymous) @ simpleObserver.ts:21
emit @ simpleObserver.ts:19
handleMessage @ DerivService.tsx:446
(anonymous) @ DerivService.tsx:395
digit-pattern-rules.js?v=1775837114943:515 ❌ [TEST LOSING DIGITS FLEXIBLE] Erro: ReferenceError: losingDigits is not defined
    at DigitPatternRulesProcessor.testDigitAsX (digit-pattern-rules.js?v=1775837114943:525:55)
    at DigitPatternRulesProcessor.testLosingDigitsAsX (digit-pattern-rules.js?v=1775837114943:488:33)
    at DigitPatternRulesProcessor.verifyPatternMatch (digit-pattern-rules.js?v=1775837114943:378:25)
    at DigitPatternRulesProcessor.analyzeDigitPattern (digit-pattern-rules.js?v=1775837114943:268:33)
    at DigitPatternRulesProcessor.processDigitPatternRule (digit-pattern-rules.js?v=1775837114943:54:33)
    at FormatGenerator.checkRuleCondition (generate-format.js?v=1775837116221:2044:66)
    at MonitoringService.checkRuleCondition (Monitoring.ts:822:30)
    at Monitoring.ts:1032:44
    at Array.forEach (<anonymous>)
    at Monitoring.ts:1024:23
    at Array.forEach (<anonymous>)
    at MonitoringService.setTranslatedRules (Monitoring.ts:1015:30)
    at MonitoringService.handleTick (Monitoring.ts:541:12)
    at Monitoring.ts:488:14
    at simpleObserver.ts:21:21
    at Map.forEach (<anonymous>)
    at Observer.emit (simpleObserver.ts:19:37)
    at DerivService.handleMessage (DerivService.tsx:446:23)
    at WebSocket.<anonymous> (DerivService.tsx:395:52)
error @ intercept-console-error.ts:42
testLosingDigitsAsX @ digit-pattern-rules.js?v=1775837114943:515
verifyPatternMatch @ digit-pattern-rules.js?v=1775837114943:378
analyzeDigitPattern @ digit-pattern-rules.js?v=1775837114943:268
processDigitPatternRule @ digit-pattern-rules.js?v=1775837114943:54
checkRuleCondition @ generate-format.js?v=1775837116221:2044
checkRuleCondition @ Monitoring.ts:822
(anonymous) @ Monitoring.ts:1032
(anonymous) @ Monitoring.ts:1024
setTranslatedRules @ Monitoring.ts:1015
handleTick @ Monitoring.ts:541
(anonymous) @ Monitoring.ts:488
(anonymous) @ simpleObserver.ts:21
emit @ simpleObserver.ts:19
handleMessage @ DerivService.tsx:446
(anonymous) @ DerivService.tsx:395
digit-pattern-rules.js?v=1775837114943:515 ❌ [TEST LOSING DIGITS FLEXIBLE] Erro: ReferenceError: losingDigits is not defined
    at DigitPatternRulesProcessor.testDigitAsX (digit-pattern-rules.js?v=1775837114943:525:55)
    at DigitPatternRulesProcessor.testLosingDigitsAsX (digit-pattern-rules.js?v=1775837114943:488:33)
    at DigitPatternRulesProcessor.verifyPatternMatch (digit-pattern-rules.js?v=1775837114943:378:25)
    at DigitPatternRulesProcessor.analyzeDigitPattern (digit-pattern-rules.js?v=1775837114943:268:33)
    at DigitPatternRulesProcessor.processDigitPatternRule (digit-pattern-rules.js?v=1775837114943:54:33)
    at FormatGenerator.checkRuleCondition (generate-format.js?v=1775837116221:2044:66)
    at MonitoringService.checkRuleCondition (Monitoring.ts:822:30)
    at Monitoring.ts:1032:44
    at Array.forEach (<anonymous>)
    at Monitoring.ts:1024:23
    at Array.forEach (<anonymous>)
    at MonitoringService.setTranslatedRules (Monitoring.ts:1015:30)
    at MonitoringService.handleTick (Monitoring.ts:541:12)
    at Monitoring.ts:488:14
    at simpleObserver.ts:21:21
    at Map.forEach (<anonymous>)
    at Observer.emit (simpleObserver.ts:19:37)
    at DerivService.handleMessage (DerivService.tsx:446:23)
    at WebSocket.<anonymous> (DerivService.tsx:395:52)
error @ intercept-console-error.ts:42
testLosingDigitsAsX @ digit-pattern-rules.js?v=1775837114943:515
verifyPatternMatch @ digit-pattern-rules.js?v=1775837114943:378
analyzeDigitPattern @ digit-pattern-rules.js?v=1775837114943:268
processDigitPatternRule @ digit-pattern-rules.js?v=1775837114943:54
checkRuleCondition @ generate-format.js?v=1775837116221:2044
checkRuleCondition @ Monitoring.ts:822
(anonymous) @ Monitoring.ts:1032
(anonymous) @ Monitoring.ts:1024
setTranslatedRules @ Monitoring.ts:1015
handleTick @ Monitoring.ts:541
(anonymous) @ Monitoring.ts:488
(anonymous) @ simpleObserver.ts:21
emit @ simpleObserver.ts:19
handleMessage @ DerivService.tsx:446
(anonymous) @ DerivService.tsx:395
