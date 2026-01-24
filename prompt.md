Enviei essas estratégias no chat da IA, o comportamento de foi errado, ao invés de criar o json com as regras e grupos, ela retornou o json no promprio chat.
Entrada:
* entra differ do digito menor chance, ultimo digito = menor chance, ultimo digito se repetir 2 vezes
* entrar over 1 quando os últimos 2 dígitos <= 1
* entrar odd quando percentual dos dígitos pares =56%, últimos 2 dígitos = (0,2,4,6,8)
* entrar even quando o percentual dos dígitos impares =56%, últimos 2 dígitos =(1,3,5,7,9)


Saída:
```json { "groups": [ { "id": 1, "rules": [ { "type": "dynamic_prediction", "predictionType": "last_digit_probability_match", "predictionAction": "differ", "targetValue": "$LOWER_PROB", "explicitPrediction": true, "condition": { "probabilityVariable": "$LOWER_PROB" }, "description": "Entrar differ do digito menor chance" }, { "type": "condition", "predictionType": "last_digit_probability_match", "count": 1, "condition": { "type": "last_digit_equals_probability_variable", "probabilityVariable": "$LOWER_PROB" }, "description": "Ultimo digito = menor chance" }, { "type": "condition", "predictionType": "conditional_pattern", "combinedRule": { "patternRule": { "type": "digit_repetition", "count": 2, "parameter_key": "g1r3_repetition_count" } }, "description": "Ultimo digito se repetir 2 vezes" } ] }, { "id":

console:
inter.css:1  Failed to load resource: net::ERR_BLOCKED_BY_RESPONSE.NotSameOriginAfterDefaultedToSameOriginByCoep
forward-logs-shared.ts:95 Download the React DevTools for a better development experience: https://react.dev/link/react-devtools
forward-logs-shared.ts:95 Blockly ou Blockly.JavaScript não estão disponíveis ainda. Aguardando...
warn @ forward-logs-shared.ts:95
forward-logs-shared.ts:95 [HMR] connected
forward-logs-shared.ts:95 volatilitySymbols Array(13)
forward-logs-shared.ts:95 volatilitySymbols Array(13)
intercept-console-error.ts:42 Object
error @ intercept-console-error.ts:42
forward-logs-shared.ts:95 [Fast Refresh] rebuilding
forward-logs-shared.ts:95 [Fast Refresh] done in 376ms
api/gemini:1  Failed to load resource: the server responded with a status of 429 ()
forward-logs-shared.ts:95 Falha no modelo versão 3 Pro: Erro Gemini (429): You exceeded your current quota, please check your plan and billing details. For more information on this error, head to: https://ai.google.dev/gemini-api/docs/rate-limits. To monitor your current usage, head to: https://ai.dev/rate-limit. 
* Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_input_token_count, limit: 0, model: gemini-3-pro
* Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests, limit: 0, model: gemini-3-pro
* Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests, limit: 0, model: gemini-3-pro
* Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_input_token_count, limit: 0, model: gemini-3-pro
Please retry in 26.069652218s.
warn @ forward-logs-shared.ts:95
api/gemini:1  Failed to load resource: the server responded with a status of 404 ()
forward-logs-shared.ts:95 Falha no modelo versão 3 Pro thinking: Erro Gemini (404): models/gemini-2.0-flash-thinking-exp-01-21 is not found for API version v1, or is not supported for generateContent. Call ListModels to see the list of available models and their supported methods.
warn @ forward-logs-shared.ts:95
api/gemini:1  Failed to load resource: the server responded with a status of 429 ()
forward-logs-shared.ts:95 Falha no modelo versão pro 2.5 Pro: Erro Gemini (429): You exceeded your current quota, please check your plan and billing details. For more information on this error, head to: https://ai.google.dev/gemini-api/docs/rate-limits. To monitor your current usage, head to: https://ai.dev/rate-limit. 
* Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_input_token_count, limit: 0, model: gemini-2.5-pro
* Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests, limit: 0, model: gemini-2.5-pro
* Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests, limit: 0, model: gemini-2.5-pro
* Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_input_token_count, limit: 0, model: gemini-2.5-pro
Please retry in 22.378470912s.
warn @ forward-logs-shared.ts:95
GeminiAIService.ts:690  POST https://n8f3fxvr-3000.brs.devtunnels.ms/api/gemini 429 (Too Many Requests)
callGeminiAPI @ GeminiAIService.ts:690
translateStrategy @ GeminiAIService.ts:159
await in translateStrategy
handleAiMessage @ page.tsx:473
handleSubmit @ AiChatPanel.tsx:71
executeDispatch @ react-dom-client.development.js:20543
runWithFiberInDEV @ react-dom-client.development.js:986
processDispatchQueue @ react-dom-client.development.js:20593
(anonymous) @ react-dom-client.development.js:21164
batchedUpdates$1 @ react-dom-client.development.js:3377
dispatchEventForPluginEventSystem @ react-dom-client.development.js:20747
dispatchEvent @ react-dom-client.development.js:25693
dispatchDiscreteEvent @ react-dom-client.development.js:25661
GeminiAIService.ts:162 Falha no modelo versão 3 Pro: Erro Gemini (429): You exceeded your current quota, please check your plan and billing details. For more information on this error, head to: https://ai.google.dev/gemini-api/docs/rate-limits. To monitor your current usage, head to: https://ai.dev/rate-limit. 
* Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_input_token_count, limit: 0, model: gemini-3-pro
* Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_input_token_count, limit: 0, model: gemini-3-pro
* Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests, limit: 0, model: gemini-3-pro
* Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests, limit: 0, model: gemini-3-pro
Please retry in 51.468591434s.
warn @ forward-logs-shared.ts:95
translateStrategy @ GeminiAIService.ts:162
await in translateStrategy
handleAiMessage @ page.tsx:473
handleSubmit @ AiChatPanel.tsx:71
executeDispatch @ react-dom-client.development.js:20543
runWithFiberInDEV @ react-dom-client.development.js:986
processDispatchQueue @ react-dom-client.development.js:20593
(anonymous) @ react-dom-client.development.js:21164
batchedUpdates$1 @ react-dom-client.development.js:3377
dispatchEventForPluginEventSystem @ react-dom-client.development.js:20747
dispatchEvent @ react-dom-client.development.js:25693
dispatchDiscreteEvent @ react-dom-client.development.js:25661
GeminiAIService.ts:690  POST https://n8f3fxvr-3000.brs.devtunnels.ms/api/gemini 404 (Not Found)
callGeminiAPI @ GeminiAIService.ts:690
translateStrategy @ GeminiAIService.ts:159
await in translateStrategy
handleAiMessage @ page.tsx:473
handleSubmit @ AiChatPanel.tsx:71
executeDispatch @ react-dom-client.development.js:20543
runWithFiberInDEV @ react-dom-client.development.js:986
processDispatchQueue @ react-dom-client.development.js:20593
(anonymous) @ react-dom-client.development.js:21164
batchedUpdates$1 @ react-dom-client.development.js:3377
dispatchEventForPluginEventSystem @ react-dom-client.development.js:20747
dispatchEvent @ react-dom-client.development.js:25693
dispatchDiscreteEvent @ react-dom-client.development.js:25661
GeminiAIService.ts:162 Falha no modelo versão 3 Pro thinking: Erro Gemini (404): models/gemini-2.0-flash-thinking-exp-01-21 is not found for API version v1, or is not supported for generateContent. Call ListModels to see the list of available models and their supported methods.
warn @ forward-logs-shared.ts:95
translateStrategy @ GeminiAIService.ts:162
await in translateStrategy
handleAiMessage @ page.tsx:473
handleSubmit @ AiChatPanel.tsx:71
executeDispatch @ react-dom-client.development.js:20543
runWithFiberInDEV @ react-dom-client.development.js:986
processDispatchQueue @ react-dom-client.development.js:20593
(anonymous) @ react-dom-client.development.js:21164
batchedUpdates$1 @ react-dom-client.development.js:3377
dispatchEventForPluginEventSystem @ react-dom-client.development.js:20747
dispatchEvent @ react-dom-client.development.js:25693
dispatchDiscreteEvent @ react-dom-client.development.js:25661
GeminiAIService.ts:690  POST https://n8f3fxvr-3000.brs.devtunnels.ms/api/gemini 429 (Too Many Requests)
callGeminiAPI @ GeminiAIService.ts:690
translateStrategy @ GeminiAIService.ts:159
await in translateStrategy
handleAiMessage @ page.tsx:473
handleSubmit @ AiChatPanel.tsx:71
executeDispatch @ react-dom-client.development.js:20543
runWithFiberInDEV @ react-dom-client.development.js:986
processDispatchQueue @ react-dom-client.development.js:20593
(anonymous) @ react-dom-client.development.js:21164
batchedUpdates$1 @ react-dom-client.development.js:3377
dispatchEventForPluginEventSystem @ react-dom-client.development.js:20747
dispatchEvent @ react-dom-client.development.js:25693
dispatchDiscreteEvent @ react-dom-client.development.js:25661
GeminiAIService.ts:162 Falha no modelo versão pro 2.5 Pro: Erro Gemini (429): You exceeded your current quota, please check your plan and billing details. For more information on this error, head to: https://ai.google.dev/gemini-api/docs/rate-limits. To monitor your current usage, head to: https://ai.dev/rate-limit. 
* Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests, limit: 0, model: gemini-2.5-pro
* Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests, limit: 0, model: gemini-2.5-pro
* Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_input_token_count, limit: 0, model: gemini-2.5-pro
* Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_input_token_count, limit: 0, model: gemini-2.5-pro
Please retry in 47.095501804s.
warn @ forward-logs-shared.ts:95
translateStrategy @ GeminiAIService.ts:162
await in translateStrategy
handleAiMessage @ page.tsx:473
handleSubmit @ AiChatPanel.tsx:71
executeDispatch @ react-dom-client.development.js:20543
runWithFiberInDEV @ react-dom-client.development.js:986
processDispatchQueue @ react-dom-client.development.js:20593
(anonymous) @ react-dom-client.development.js:21164
batchedUpdates$1 @ react-dom-client.development.js:3377
dispatchEventForPluginEventSystem @ react-dom-client.development.js:20747
dispatchEvent @ react-dom-client.development.js:25693
dispatchDiscreteEvent @ react-dom-client.development.js:25661
