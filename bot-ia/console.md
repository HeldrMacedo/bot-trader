Error with Permissions-Policy header: Unrecognized feature: 'browsing-topics'.
app:50  GET https://static.cloudflareinsights.com/beacon.min.js/vcd15cbe7772f49c399c6a5babf22c1241717689176015 net::ERR_BLOCKED_BY_CLIENT
favicon.svg:1  GET https://n8f3fxvr-3004.brs.devtunnels.ms/favicon.svg?v=2024 404 (Not Found)
favicon.ico:1  GET https://n8f3fxvr-3004.brs.devtunnels.ms/favicon.ico?v=2024 404 (Not Found)
online-users-monitor.js:168  POST https://n8f3fxvr-3004.brs.devtunnels.ms/api/online-users/login 404 (Not Found)
handleUserLogin @ online-users-monitor.js:168
saveUserData @ session.js:435
setupStartupSequence @ app-manager.js?v=20260108:324
await in setupStartupSequence
init @ app-manager.js?v=20260108:29
(anonymous) @ app.js?v=20260108:258
credits-manager.js:173  GET https://n8f3fxvr-3004.brs.devtunnels.ms/api/welcome-bonus/VRTC12422137 404 (Not Found)
hasReceivedWelcomeBonus @ credits-manager.js:173
checkAndGrantWelcomeBonus @ credits-manager.js:405
setupStartupSequence @ app-manager.js?v=20260108:413
await in setupStartupSequence
init @ app-manager.js?v=20260108:29
(anonymous) @ app.js?v=20260108:258
credits-manager.js:173  GET https://n8f3fxvr-3004.brs.devtunnels.ms/api/welcome-bonus/VRTC12422137 404 (Not Found)
hasReceivedWelcomeBonus @ credits-manager.js:173
grantWelcomeBonus @ credits-manager.js:291
checkAndGrantWelcomeBonus @ credits-manager.js:421
await in checkAndGrantWelcomeBonus
setupStartupSequence @ app-manager.js?v=20260108:413
await in setupStartupSequence
init @ app-manager.js?v=20260108:29
(anonymous) @ app.js?v=20260108:258
credits-manager.js:298  POST https://n8f3fxvr-3004.brs.devtunnels.ms/api/add-credits 404 (Not Found)
grantWelcomeBonus @ credits-manager.js:298
await in grantWelcomeBonus
checkAndGrantWelcomeBonus @ credits-manager.js:421
await in checkAndGrantWelcomeBonus
setupStartupSequence @ app-manager.js?v=20260108:413
await in setupStartupSequence
init @ app-manager.js?v=20260108:29
(anonymous) @ app.js?v=20260108:258
credits-manager.js:373 ❌ [WELCOME BONUS] Falha na requisição: 404
grantWelcomeBonus @ credits-manager.js:373
await in grantWelcomeBonus
checkAndGrantWelcomeBonus @ credits-manager.js:421
await in checkAndGrantWelcomeBonus
setupStartupSequence @ app-manager.js?v=20260108:413
await in setupStartupSequence
init @ app-manager.js?v=20260108:29
(anonymous) @ app.js?v=20260108:258
online-users-monitor.js:168  POST https://n8f3fxvr-3004.brs.devtunnels.ms/api/online-users/login 404 (Not Found)
handleUserLogin @ online-users-monitor.js:168
init @ online-users-monitor.js:36
(anonymous) @ online-users-monitor.js:275
setTimeout
(anonymous) @ online-users-monitor.js:273
saveUserData @ session.js:440
setupStartupSequence @ app-manager.js?v=20260108:324
await in setupStartupSequence
init @ app-manager.js?v=20260108:29
(anonymous) @ app.js?v=20260108:258
online-users-monitor.js:59  POST https://n8f3fxvr-3004.brs.devtunnels.ms/api/online-users/heartbeat 404 (Not Found)
sendHeartbeat @ online-users-monitor.js:59
startHeartbeat @ online-users-monitor.js:135
init @ online-users-monitor.js:39
await in init
(anonymous) @ online-users-monitor.js:275
setTimeout
(anonymous) @ online-users-monitor.js:273
saveUserData @ session.js:440
setupStartupSequence @ app-manager.js?v=20260108:324
await in setupStartupSequence
init @ app-manager.js?v=20260108:29
(anonymous) @ app.js?v=20260108:258
online-users-monitor.js:106  GET https://n8f3fxvr-3004.brs.devtunnels.ms/api/online-users 404 (Not Found)
syncOnlineUsers @ online-users-monitor.js:106
startSync @ online-users-monitor.js:152
init @ online-users-monitor.js:42
await in init
(anonymous) @ online-users-monitor.js:275
setTimeout
(anonymous) @ online-users-monitor.js:273
saveUserData @ session.js:440
setupStartupSequence @ app-manager.js?v=20260108:324
await in setupStartupSequence
init @ app-manager.js?v=20260108:29
(anonymous) @ app.js?v=20260108:258
commission-tracker.js:185  GET https://n8f3fxvr-3004.brs.devtunnels.ms/api 404 (Not Found)
checkBackendHealth @ commission-tracker.js:185
updateCommissionData @ commission-tracker.js:122
startTracking @ commission-tracker.js:74
await in startTracking
(anonymous) @ app-manager.js?v=20260108:599
setTimeout
(anonymous) @ app-manager.js?v=20260108:598
setTimeout
setupStartupSequence @ app-manager.js?v=20260108:591
await in setupStartupSequence
init @ app-manager.js?v=20260108:29
(anonymous) @ app.js?v=20260108:258
frontend-reconnection-manager.js:361  GET https://n8f3fxvr-3004.brs.devtunnels.ms/api 404 (Not Found)
checkServerStatus @ frontend-reconnection-manager.js:361
(anonymous) @ frontend-reconnection-manager.js:207
setInterval
startHeartbeat @ frontend-reconnection-manager.js:194
init @ frontend-reconnection-manager.js:30
FrontendReconnectionManager @ frontend-reconnection-manager.js:25
initFrontendReconnection @ frontend-reconnection-manager.js:861
(anonymous) @ app-manager.js?v=20260108:580
setTimeout
setupStartupSequence @ app-manager.js?v=20260108:579
await in setupStartupSequence
init @ app-manager.js?v=20260108:29
(anonymous) @ app.js?v=20260108:258
frontend-reconnection-manager.js:376 ❌ [SERVER CHECK] Resposta não OK: 404 
checkServerStatus @ frontend-reconnection-manager.js:376
await in checkServerStatus
(anonymous) @ frontend-reconnection-manager.js:207
setInterval
startHeartbeat @ frontend-reconnection-manager.js:194
init @ frontend-reconnection-manager.js:30
FrontendReconnectionManager @ frontend-reconnection-manager.js:25
initFrontendReconnection @ frontend-reconnection-manager.js:861
(anonymous) @ app-manager.js?v=20260108:580
setTimeout
setupStartupSequence @ app-manager.js?v=20260108:579
await in setupStartupSequence
init @ app-manager.js?v=20260108:29
(anonymous) @ app.js?v=20260108:258
online-users-monitor.js:59  POST https://n8f3fxvr-3004.brs.devtunnels.ms/api/online-users/heartbeat 404 (Not Found)
sendHeartbeat @ online-users-monitor.js:59
(anonymous) @ online-users-monitor.js:139
setInterval
startHeartbeat @ online-users-monitor.js:138
init @ online-users-monitor.js:39
await in init
(anonymous) @ online-users-monitor.js:275
setTimeout
(anonymous) @ online-users-monitor.js:273
saveUserData @ session.js:440
setupStartupSequence @ app-manager.js?v=20260108:324
await in setupStartupSequence
init @ app-manager.js?v=20260108:29
(anonymous) @ app.js?v=20260108:258
frontend-reconnection-manager.js:361  GET https://n8f3fxvr-3004.brs.devtunnels.ms/api 404 (Not Found)
checkServerStatus @ frontend-reconnection-manager.js:361
(anonymous) @ frontend-reconnection-manager.js:207
setInterval
startHeartbeat @ frontend-reconnection-manager.js:194
init @ frontend-reconnection-manager.js:30
FrontendReconnectionManager @ frontend-reconnection-manager.js:25
initFrontendReconnection @ frontend-reconnection-manager.js:861
(anonymous) @ app-manager.js?v=20260108:580
setTimeout
setupStartupSequence @ app-manager.js?v=20260108:579
await in setupStartupSequence
init @ app-manager.js?v=20260108:29
(anonymous) @ app.js?v=20260108:258
frontend-reconnection-manager.js:376 ❌ [SERVER CHECK] Resposta não OK: 404 
checkServerStatus @ frontend-reconnection-manager.js:376
await in checkServerStatus
(anonymous) @ frontend-reconnection-manager.js:207
setInterval
startHeartbeat @ frontend-reconnection-manager.js:194
init @ frontend-reconnection-manager.js:30
FrontendReconnectionManager @ frontend-reconnection-manager.js:25
initFrontendReconnection @ frontend-reconnection-manager.js:861
(anonymous) @ app-manager.js?v=20260108:580
setTimeout
setupStartupSequence @ app-manager.js?v=20260108:579
await in setupStartupSequence
init @ app-manager.js?v=20260108:29
(anonymous) @ app.js?v=20260108:258
frontend-reconnection-manager.js:361  GET https://n8f3fxvr-3004.brs.devtunnels.ms/api 404 (Not Found)
checkServerStatus @ frontend-reconnection-manager.js:361
(anonymous) @ frontend-reconnection-manager.js:207
setInterval
startHeartbeat @ frontend-reconnection-manager.js:194
init @ frontend-reconnection-manager.js:30
FrontendReconnectionManager @ frontend-reconnection-manager.js:25
initFrontendReconnection @ frontend-reconnection-manager.js:861
(anonymous) @ app-manager.js?v=20260108:580
setTimeout
setupStartupSequence @ app-manager.js?v=20260108:579
await in setupStartupSequence
init @ app-manager.js?v=20260108:29
(anonymous) @ app.js?v=20260108:258
frontend-reconnection-manager.js:376 ❌ [SERVER CHECK] Resposta não OK: 404 
checkServerStatus @ frontend-reconnection-manager.js:376
await in checkServerStatus
(anonymous) @ frontend-reconnection-manager.js:207
setInterval
startHeartbeat @ frontend-reconnection-manager.js:194
init @ frontend-reconnection-manager.js:30
FrontendReconnectionManager @ frontend-reconnection-manager.js:25
initFrontendReconnection @ frontend-reconnection-manager.js:861
(anonymous) @ app-manager.js?v=20260108:580
setTimeout
setupStartupSequence @ app-manager.js?v=20260108:579
await in setupStartupSequence
init @ app-manager.js?v=20260108:29
(anonymous) @ app.js?v=20260108:258
frontend-reconnection-manager.js:361  GET https://n8f3fxvr-3004.brs.devtunnels.ms/api 404 (Not Found)
checkServerStatus @ frontend-reconnection-manager.js:361
(anonymous) @ frontend-reconnection-manager.js:207
setInterval
startHeartbeat @ frontend-reconnection-manager.js:194
init @ frontend-reconnection-manager.js:30
FrontendReconnectionManager @ frontend-reconnection-manager.js:25
initFrontendReconnection @ frontend-reconnection-manager.js:861
(anonymous) @ app-manager.js?v=20260108:580
setTimeout
setupStartupSequence @ app-manager.js?v=20260108:579
await in setupStartupSequence
init @ app-manager.js?v=20260108:29
(anonymous) @ app.js?v=20260108:258
frontend-reconnection-manager.js:376 ❌ [SERVER CHECK] Resposta não OK: 404 
checkServerStatus @ frontend-reconnection-manager.js:376
await in checkServerStatus
(anonymous) @ frontend-reconnection-manager.js:207
setInterval
startHeartbeat @ frontend-reconnection-manager.js:194
init @ frontend-reconnection-manager.js:30
FrontendReconnectionManager @ frontend-reconnection-manager.js:25
initFrontendReconnection @ frontend-reconnection-manager.js:861
(anonymous) @ app-manager.js?v=20260108:580
setTimeout
setupStartupSequence @ app-manager.js?v=20260108:579
await in setupStartupSequence
init @ app-manager.js?v=20260108:29
(anonymous) @ app.js?v=20260108:258
online-users-monitor.js:59  POST https://n8f3fxvr-3004.brs.devtunnels.ms/api/online-users/heartbeat 404 (Not Found)
sendHeartbeat @ online-users-monitor.js:59
(anonymous) @ online-users-monitor.js:139
setInterval
startHeartbeat @ online-users-monitor.js:138
init @ online-users-monitor.js:39
await in init
(anonymous) @ online-users-monitor.js:275
setTimeout
(anonymous) @ online-users-monitor.js:273
saveUserData @ session.js:440
setupStartupSequence @ app-manager.js?v=20260108:324
await in setupStartupSequence
init @ app-manager.js?v=20260108:29
(anonymous) @ app.js?v=20260108:258
online-users-monitor.js:106  GET https://n8f3fxvr-3004.brs.devtunnels.ms/api/online-users 404 (Not Found)
syncOnlineUsers @ online-users-monitor.js:106
(anonymous) @ online-users-monitor.js:156
setInterval
startSync @ online-users-monitor.js:155
init @ online-users-monitor.js:42
await in init
(anonymous) @ online-users-monitor.js:275
setTimeout
(anonymous) @ online-users-monitor.js:273
saveUserData @ session.js:440
setupStartupSequence @ app-manager.js?v=20260108:324
await in setupStartupSequence
init @ app-manager.js?v=20260108:29
(anonymous) @ app.js?v=20260108:258
frontend-reconnection-manager.js:361  GET https://n8f3fxvr-3004.brs.devtunnels.ms/api 404 (Not Found)
checkServerStatus @ frontend-reconnection-manager.js:361
(anonymous) @ frontend-reconnection-manager.js:207
setInterval
startHeartbeat @ frontend-reconnection-manager.js:194
init @ frontend-reconnection-manager.js:30
FrontendReconnectionManager @ frontend-reconnection-manager.js:25
initFrontendReconnection @ frontend-reconnection-manager.js:861
(anonymous) @ app-manager.js?v=20260108:580
setTimeout
setupStartupSequence @ app-manager.js?v=20260108:579
await in setupStartupSequence
init @ app-manager.js?v=20260108:29
(anonymous) @ app.js?v=20260108:258
frontend-reconnection-manager.js:376 ❌ [SERVER CHECK] Resposta não OK: 404 
checkServerStatus @ frontend-reconnection-manager.js:376
await in checkServerStatus
(anonymous) @ frontend-reconnection-manager.js:207
setInterval
startHeartbeat @ frontend-reconnection-manager.js:194
init @ frontend-reconnection-manager.js:30
FrontendReconnectionManager @ frontend-reconnection-manager.js:25
initFrontendReconnection @ frontend-reconnection-manager.js:861
(anonymous) @ app-manager.js?v=20260108:580
setTimeout
setupStartupSequence @ app-manager.js?v=20260108:579
await in setupStartupSequence
init @ app-manager.js?v=20260108:29
(anonymous) @ app.js?v=20260108:258
frontend-reconnection-manager.js:361  GET https://n8f3fxvr-3004.brs.devtunnels.ms/api 404 (Not Found)
checkServerStatus @ frontend-reconnection-manager.js:361
(anonymous) @ frontend-reconnection-manager.js:207
setInterval
startHeartbeat @ frontend-reconnection-manager.js:194
init @ frontend-reconnection-manager.js:30
FrontendReconnectionManager @ frontend-reconnection-manager.js:25
initFrontendReconnection @ frontend-reconnection-manager.js:861
(anonymous) @ app-manager.js?v=20260108:580
setTimeout
setupStartupSequence @ app-manager.js?v=20260108:579
await in setupStartupSequence
init @ app-manager.js?v=20260108:29
(anonymous) @ app.js?v=20260108:258
frontend-reconnection-manager.js:376 ❌ [SERVER CHECK] Resposta não OK: 404 
checkServerStatus @ frontend-reconnection-manager.js:376
await in checkServerStatus
(anonymous) @ frontend-reconnection-manager.js:207
setInterval
startHeartbeat @ frontend-reconnection-manager.js:194
init @ frontend-reconnection-manager.js:30
FrontendReconnectionManager @ frontend-reconnection-manager.js:25
initFrontendReconnection @ frontend-reconnection-manager.js:861
(anonymous) @ app-manager.js?v=20260108:580
setTimeout
setupStartupSequence @ app-manager.js?v=20260108:579
await in setupStartupSequence
init @ app-manager.js?v=20260108:29
(anonymous) @ app.js?v=20260108:258
frontend-reconnection-manager.js:361  GET https://n8f3fxvr-3004.brs.devtunnels.ms/api 404 (Not Found)
checkServerStatus @ frontend-reconnection-manager.js:361
(anonymous) @ frontend-reconnection-manager.js:207
setInterval
startHeartbeat @ frontend-reconnection-manager.js:194
init @ frontend-reconnection-manager.js:30
FrontendReconnectionManager @ frontend-reconnection-manager.js:25
initFrontendReconnection @ frontend-reconnection-manager.js:861
(anonymous) @ app-manager.js?v=20260108:580
setTimeout
setupStartupSequence @ app-manager.js?v=20260108:579
await in setupStartupSequence
init @ app-manager.js?v=20260108:29
(anonymous) @ app.js?v=20260108:258
frontend-reconnection-manager.js:376 ❌ [SERVER CHECK] Resposta não OK: 404 
checkServerStatus @ frontend-reconnection-manager.js:376
await in checkServerStatus
(anonymous) @ frontend-reconnection-manager.js:207
setInterval
startHeartbeat @ frontend-reconnection-manager.js:194
init @ frontend-reconnection-manager.js:30
FrontendReconnectionManager @ frontend-reconnection-manager.js:25
initFrontendReconnection @ frontend-reconnection-manager.js:861
(anonymous) @ app-manager.js?v=20260108:580
setTimeout
setupStartupSequence @ app-manager.js?v=20260108:579
await in setupStartupSequence
init @ app-manager.js?v=20260108:29
(anonymous) @ app.js?v=20260108:258
online-users-monitor.js:59  POST https://n8f3fxvr-3004.brs.devtunnels.ms/api/online-users/heartbeat 404 (Not Found)
sendHeartbeat @ online-users-monitor.js:59
(anonymous) @ online-users-monitor.js:139
setInterval
startHeartbeat @ online-users-monitor.js:138
init @ online-users-monitor.js:39
await in init
(anonymous) @ online-users-monitor.js:275
setTimeout
(anonymous) @ online-users-monitor.js:273
saveUserData @ session.js:440
setupStartupSequence @ app-manager.js?v=20260108:324
await in setupStartupSequence
init @ app-manager.js?v=20260108:29
(anonymous) @ app.js?v=20260108:258
frontend-reconnection-manager.js:361  GET https://n8f3fxvr-3004.brs.devtunnels.ms/api 404 (Not Found)
checkServerStatus @ frontend-reconnection-manager.js:361
(anonymous) @ frontend-reconnection-manager.js:207
setInterval
startHeartbeat @ frontend-reconnection-manager.js:194
init @ frontend-reconnection-manager.js:30
FrontendReconnectionManager @ frontend-reconnection-manager.js:25
initFrontendReconnection @ frontend-reconnection-manager.js:861
(anonymous) @ app-manager.js?v=20260108:580
setTimeout
setupStartupSequence @ app-manager.js?v=20260108:579
await in setupStartupSequence
init @ app-manager.js?v=20260108:29
(anonymous) @ app.js?v=20260108:258
frontend-reconnection-manager.js:376 ❌ [SERVER CHECK] Resposta não OK: 404 
checkServerStatus @ frontend-reconnection-manager.js:376
await in checkServerStatus
(anonymous) @ frontend-reconnection-manager.js:207
setInterval
startHeartbeat @ frontend-reconnection-manager.js:194
init @ frontend-reconnection-manager.js:30
FrontendReconnectionManager @ frontend-reconnection-manager.js:25
initFrontendReconnection @ frontend-reconnection-manager.js:861
(anonymous) @ app-manager.js?v=20260108:580
setTimeout
setupStartupSequence @ app-manager.js?v=20260108:579
await in setupStartupSequence
init @ app-manager.js?v=20260108:29
(anonymous) @ app.js?v=20260108:258
frontend-reconnection-manager.js:361  GET https://n8f3fxvr-3004.brs.devtunnels.ms/api 404 (Not Found)
checkServerStatus @ frontend-reconnection-manager.js:361
(anonymous) @ frontend-reconnection-manager.js:207
setInterval
startHeartbeat @ frontend-reconnection-manager.js:194
init @ frontend-reconnection-manager.js:30
FrontendReconnectionManager @ frontend-reconnection-manager.js:25
initFrontendReconnection @ frontend-reconnection-manager.js:861
(anonymous) @ app-manager.js?v=20260108:580
setTimeout
setupStartupSequence @ app-manager.js?v=20260108:579
await in setupStartupSequence
init @ app-manager.js?v=20260108:29
(anonymous) @ app.js?v=20260108:258
frontend-reconnection-manager.js:376 ❌ [SERVER CHECK] Resposta não OK: 404 
checkServerStatus @ frontend-reconnection-manager.js:376
await in checkServerStatus
(anonymous) @ frontend-reconnection-manager.js:207
setInterval
startHeartbeat @ frontend-reconnection-manager.js:194
init @ frontend-reconnection-manager.js:30
FrontendReconnectionManager @ frontend-reconnection-manager.js:25
initFrontendReconnection @ frontend-reconnection-manager.js:861
(anonymous) @ app-manager.js?v=20260108:580
setTimeout
setupStartupSequence @ app-manager.js?v=20260108:579
await in setupStartupSequence
init @ app-manager.js?v=20260108:29
(anonymous) @ app.js?v=20260108:258
frontend-reconnection-manager.js:361  GET https://n8f3fxvr-3004.brs.devtunnels.ms/api 404 (Not Found)
checkServerStatus @ frontend-reconnection-manager.js:361
(anonymous) @ frontend-reconnection-manager.js:207
setInterval
startHeartbeat @ frontend-reconnection-manager.js:194
init @ frontend-reconnection-manager.js:30
FrontendReconnectionManager @ frontend-reconnection-manager.js:25
initFrontendReconnection @ frontend-reconnection-manager.js:861
(anonymous) @ app-manager.js?v=20260108:580
setTimeout
setupStartupSequence @ app-manager.js?v=20260108:579
await in setupStartupSequence
init @ app-manager.js?v=20260108:29
(anonymous) @ app.js?v=20260108:258
frontend-reconnection-manager.js:376 ❌ [SERVER CHECK] Resposta não OK: 404 
checkServerStatus @ frontend-reconnection-manager.js:376
await in checkServerStatus
(anonymous) @ frontend-reconnection-manager.js:207
setInterval
startHeartbeat @ frontend-reconnection-manager.js:194
init @ frontend-reconnection-manager.js:30
FrontendReconnectionManager @ frontend-reconnection-manager.js:25
initFrontendReconnection @ frontend-reconnection-manager.js:861
(anonymous) @ app-manager.js?v=20260108:580
setTimeout
setupStartupSequence @ app-manager.js?v=20260108:579
await in setupStartupSequence
init @ app-manager.js?v=20260108:29
(anonymous) @ app.js?v=20260108:258
online-users-monitor.js:59  POST https://n8f3fxvr-3004.brs.devtunnels.ms/api/online-users/heartbeat 404 (Not Found)
sendHeartbeat @ online-users-monitor.js:59
(anonymous) @ online-users-monitor.js:139
setInterval
startHeartbeat @ online-users-monitor.js:138
init @ online-users-monitor.js:39
await in init
(anonymous) @ online-users-monitor.js:275
setTimeout
(anonymous) @ online-users-monitor.js:273
saveUserData @ session.js:440
setupStartupSequence @ app-manager.js?v=20260108:324
await in setupStartupSequence
init @ app-manager.js?v=20260108:29
(anonymous) @ app.js?v=20260108:258
online-users-monitor.js:106  GET https://n8f3fxvr-3004.brs.devtunnels.ms/api/online-users 404 (Not Found)
syncOnlineUsers @ online-users-monitor.js:106
(anonymous) @ online-users-monitor.js:156
setInterval
startSync @ online-users-monitor.js:155
init @ online-users-monitor.js:42
await in init
(anonymous) @ online-users-monitor.js:275
setTimeout
(anonymous) @ online-users-monitor.js:273
saveUserData @ session.js:440
setupStartupSequence @ app-manager.js?v=20260108:324
await in setupStartupSequence
init @ app-manager.js?v=20260108:29
(anonymous) @ app.js?v=20260108:258
frontend-reconnection-manager.js:361  GET https://n8f3fxvr-3004.brs.devtunnels.ms/api 404 (Not Found)
checkServerStatus @ frontend-reconnection-manager.js:361
(anonymous) @ frontend-reconnection-manager.js:207
setInterval
startHeartbeat @ frontend-reconnection-manager.js:194
init @ frontend-reconnection-manager.js:30
FrontendReconnectionManager @ frontend-reconnection-manager.js:25
initFrontendReconnection @ frontend-reconnection-manager.js:861
(anonymous) @ app-manager.js?v=20260108:580
setTimeout
setupStartupSequence @ app-manager.js?v=20260108:579
await in setupStartupSequence
init @ app-manager.js?v=20260108:29
(anonymous) @ app.js?v=20260108:258
frontend-reconnection-manager.js:376 ❌ [SERVER CHECK] Resposta não OK: 404 
checkServerStatus @ frontend-reconnection-manager.js:376
await in checkServerStatus
(anonymous) @ frontend-reconnection-manager.js:207
setInterval
startHeartbeat @ frontend-reconnection-manager.js:194
init @ frontend-reconnection-manager.js:30
FrontendReconnectionManager @ frontend-reconnection-manager.js:25
initFrontendReconnection @ frontend-reconnection-manager.js:861
(anonymous) @ app-manager.js?v=20260108:580
setTimeout
setupStartupSequence @ app-manager.js?v=20260108:579
await in setupStartupSequence
init @ app-manager.js?v=20260108:29
(anonymous) @ app.js?v=20260108:258
frontend-reconnection-manager.js:361  GET https://n8f3fxvr-3004.brs.devtunnels.ms/api 404 (Not Found)
checkServerStatus @ frontend-reconnection-manager.js:361
(anonymous) @ frontend-reconnection-manager.js:207
setInterval
startHeartbeat @ frontend-reconnection-manager.js:194
init @ frontend-reconnection-manager.js:30
FrontendReconnectionManager @ frontend-reconnection-manager.js:25
initFrontendReconnection @ frontend-reconnection-manager.js:861
(anonymous) @ app-manager.js?v=20260108:580
setTimeout
setupStartupSequence @ app-manager.js?v=20260108:579
await in setupStartupSequence
init @ app-manager.js?v=20260108:29
(anonymous) @ app.js?v=20260108:258
frontend-reconnection-manager.js:376 ❌ [SERVER CHECK] Resposta não OK: 404 
checkServerStatus @ frontend-reconnection-manager.js:376
await in checkServerStatus
(anonymous) @ frontend-reconnection-manager.js:207
setInterval
startHeartbeat @ frontend-reconnection-manager.js:194
init @ frontend-reconnection-manager.js:30
FrontendReconnectionManager @ frontend-reconnection-manager.js:25
initFrontendReconnection @ frontend-reconnection-manager.js:861
(anonymous) @ app-manager.js?v=20260108:580
setTimeout
setupStartupSequence @ app-manager.js?v=20260108:579
await in setupStartupSequence
init @ app-manager.js?v=20260108:29
(anonymous) @ app.js?v=20260108:258
frontend-reconnection-manager.js:361  GET https://n8f3fxvr-3004.brs.devtunnels.ms/api 404 (Not Found)
checkServerStatus @ frontend-reconnection-manager.js:361
(anonymous) @ frontend-reconnection-manager.js:207
setInterval
startHeartbeat @ frontend-reconnection-manager.js:194
init @ frontend-reconnection-manager.js:30
FrontendReconnectionManager @ frontend-reconnection-manager.js:25
initFrontendReconnection @ frontend-reconnection-manager.js:861
(anonymous) @ app-manager.js?v=20260108:580
setTimeout
setupStartupSequence @ app-manager.js?v=20260108:579
await in setupStartupSequence
init @ app-manager.js?v=20260108:29
(anonymous) @ app.js?v=20260108:258
frontend-reconnection-manager.js:376 ❌ [SERVER CHECK] Resposta não OK: 404 
checkServerStatus @ frontend-reconnection-manager.js:376
await in checkServerStatus
(anonymous) @ frontend-reconnection-manager.js:207
setInterval
startHeartbeat @ frontend-reconnection-manager.js:194
init @ frontend-reconnection-manager.js:30
FrontendReconnectionManager @ frontend-reconnection-manager.js:25
initFrontendReconnection @ frontend-reconnection-manager.js:861
(anonymous) @ app-manager.js?v=20260108:580
setTimeout
setupStartupSequence @ app-manager.js?v=20260108:579
await in setupStartupSequence
init @ app-manager.js?v=20260108:29
(anonymous) @ app.js?v=20260108:258
online-users-monitor.js:59  POST https://n8f3fxvr-3004.brs.devtunnels.ms/api/online-users/heartbeat 404 (Not Found)
sendHeartbeat @ online-users-monitor.js:59
(anonymous) @ online-users-monitor.js:139
setInterval
startHeartbeat @ online-users-monitor.js:138
init @ online-users-monitor.js:39
await in init
(anonymous) @ online-users-monitor.js:275
setTimeout
(anonymous) @ online-users-monitor.js:273
saveUserData @ session.js:440
setupStartupSequence @ app-manager.js?v=20260108:324
await in setupStartupSequence
init @ app-manager.js?v=20260108:29
(anonymous) @ app.js?v=20260108:258
frontend-reconnection-manager.js:361  GET https://n8f3fxvr-3004.brs.devtunnels.ms/api 404 (Not Found)
checkServerStatus @ frontend-reconnection-manager.js:361
(anonymous) @ frontend-reconnection-manager.js:207
setInterval
startHeartbeat @ frontend-reconnection-manager.js:194
init @ frontend-reconnection-manager.js:30
FrontendReconnectionManager @ frontend-reconnection-manager.js:25
initFrontendReconnection @ frontend-reconnection-manager.js:861
(anonymous) @ app-manager.js?v=20260108:580
setTimeout
setupStartupSequence @ app-manager.js?v=20260108:579
await in setupStartupSequence
init @ app-manager.js?v=20260108:29
(anonymous) @ app.js?v=20260108:258
frontend-reconnection-manager.js:376 ❌ [SERVER CHECK] Resposta não OK: 404 
checkServerStatus @ frontend-reconnection-manager.js:376
await in checkServerStatus
(anonymous) @ frontend-reconnection-manager.js:207
setInterval
startHeartbeat @ frontend-reconnection-manager.js:194
init @ frontend-reconnection-manager.js:30
FrontendReconnectionManager @ frontend-reconnection-manager.js:25
initFrontendReconnection @ frontend-reconnection-manager.js:861
(anonymous) @ app-manager.js?v=20260108:580
setTimeout
setupStartupSequence @ app-manager.js?v=20260108:579
await in setupStartupSequence
init @ app-manager.js?v=20260108:29
(anonymous) @ app.js?v=20260108:258
frontend-reconnection-manager.js:361  GET https://n8f3fxvr-3004.brs.devtunnels.ms/api 404 (Not Found)
checkServerStatus @ frontend-reconnection-manager.js:361
(anonymous) @ frontend-reconnection-manager.js:207
setInterval
startHeartbeat @ frontend-reconnection-manager.js:194
init @ frontend-reconnection-manager.js:30
FrontendReconnectionManager @ frontend-reconnection-manager.js:25
initFrontendReconnection @ frontend-reconnection-manager.js:861
(anonymous) @ app-manager.js?v=20260108:580
setTimeout
setupStartupSequence @ app-manager.js?v=20260108:579
await in setupStartupSequence
init @ app-manager.js?v=20260108:29
(anonymous) @ app.js?v=20260108:258
frontend-reconnection-manager.js:376 ❌ [SERVER CHECK] Resposta não OK: 404 
checkServerStatus @ frontend-reconnection-manager.js:376
await in checkServerStatus
(anonymous) @ frontend-reconnection-manager.js:207
setInterval
startHeartbeat @ frontend-reconnection-manager.js:194
init @ frontend-reconnection-manager.js:30
FrontendReconnectionManager @ frontend-reconnection-manager.js:25
initFrontendReconnection @ frontend-reconnection-manager.js:861
(anonymous) @ app-manager.js?v=20260108:580
setTimeout
setupStartupSequence @ app-manager.js?v=20260108:579
await in setupStartupSequence
init @ app-manager.js?v=20260108:29
(anonymous) @ app.js?v=20260108:258
frontend-reconnection-manager.js:361  GET https://n8f3fxvr-3004.brs.devtunnels.ms/api 404 (Not Found)
checkServerStatus @ frontend-reconnection-manager.js:361
(anonymous) @ frontend-reconnection-manager.js:207
setInterval
startHeartbeat @ frontend-reconnection-manager.js:194
init @ frontend-reconnection-manager.js:30
FrontendReconnectionManager @ frontend-reconnection-manager.js:25
initFrontendReconnection @ frontend-reconnection-manager.js:861
(anonymous) @ app-manager.js?v=20260108:580
setTimeout
setupStartupSequence @ app-manager.js?v=20260108:579
await in setupStartupSequence
init @ app-manager.js?v=20260108:29
(anonymous) @ app.js?v=20260108:258
frontend-reconnection-manager.js:376 ❌ [SERVER CHECK] Resposta não OK: 404 
checkServerStatus @ frontend-reconnection-manager.js:376
await in checkServerStatus
(anonymous) @ frontend-reconnection-manager.js:207
setInterval
startHeartbeat @ frontend-reconnection-manager.js:194
init @ frontend-reconnection-manager.js:30
FrontendReconnectionManager @ frontend-reconnection-manager.js:25
initFrontendReconnection @ frontend-reconnection-manager.js:861
(anonymous) @ app-manager.js?v=20260108:580
setTimeout
setupStartupSequence @ app-manager.js?v=20260108:579
await in setupStartupSequence
init @ app-manager.js?v=20260108:29
(anonymous) @ app.js?v=20260108:258
online-users-monitor.js:59  POST https://n8f3fxvr-3004.brs.devtunnels.ms/api/online-users/heartbeat 404 (Not Found)
sendHeartbeat @ online-users-monitor.js:59
(anonymous) @ online-users-monitor.js:139
setInterval
startHeartbeat @ online-users-monitor.js:138
init @ online-users-monitor.js:39
await in init
(anonymous) @ online-users-monitor.js:275
setTimeout
(anonymous) @ online-users-monitor.js:273
saveUserData @ session.js:440
setupStartupSequence @ app-manager.js?v=20260108:324
await in setupStartupSequence
init @ app-manager.js?v=20260108:29
(anonymous) @ app.js?v=20260108:258
online-users-monitor.js:106  GET https://n8f3fxvr-3004.brs.devtunnels.ms/api/online-users 404 (Not Found)
syncOnlineUsers @ online-users-monitor.js:106
(anonymous) @ online-users-monitor.js:156
setInterval
startSync @ online-users-monitor.js:155
init @ online-users-monitor.js:42
await in init
(anonymous) @ online-users-monitor.js:275
setTimeout
(anonymous) @ online-users-monitor.js:273
saveUserData @ session.js:440
setupStartupSequence @ app-manager.js?v=20260108:324
await in setupStartupSequence
init @ app-manager.js?v=20260108:29
(anonymous) @ app.js?v=20260108:258
frontend-reconnection-manager.js:361  GET https://n8f3fxvr-3004.brs.devtunnels.ms/api 404 (Not Found)
checkServerStatus @ frontend-reconnection-manager.js:361
(anonymous) @ frontend-reconnection-manager.js:207
setInterval
startHeartbeat @ frontend-reconnection-manager.js:194
init @ frontend-reconnection-manager.js:30
FrontendReconnectionManager @ frontend-reconnection-manager.js:25
initFrontendReconnection @ frontend-reconnection-manager.js:861
(anonymous) @ app-manager.js?v=20260108:580
setTimeout
setupStartupSequence @ app-manager.js?v=20260108:579
await in setupStartupSequence
init @ app-manager.js?v=20260108:29
(anonymous) @ app.js?v=20260108:258
frontend-reconnection-manager.js:376 ❌ [SERVER CHECK] Resposta não OK: 404 
checkServerStatus @ frontend-reconnection-manager.js:376
await in checkServerStatus
(anonymous) @ frontend-reconnection-manager.js:207
setInterval
startHeartbeat @ frontend-reconnection-manager.js:194
init @ frontend-reconnection-manager.js:30
FrontendReconnectionManager @ frontend-reconnection-manager.js:25
initFrontendReconnection @ frontend-reconnection-manager.js:861
(anonymous) @ app-manager.js?v=20260108:580
setTimeout
setupStartupSequence @ app-manager.js?v=20260108:579
await in setupStartupSequence
init @ app-manager.js?v=20260108:29
(anonymous) @ app.js?v=20260108:258
frontend-reconnection-manager.js:361  GET https://n8f3fxvr-3004.brs.devtunnels.ms/api 404 (Not Found)
checkServerStatus @ frontend-reconnection-manager.js:361
(anonymous) @ frontend-reconnection-manager.js:207
setInterval
startHeartbeat @ frontend-reconnection-manager.js:194
init @ frontend-reconnection-manager.js:30
FrontendReconnectionManager @ frontend-reconnection-manager.js:25
initFrontendReconnection @ frontend-reconnection-manager.js:861
(anonymous) @ app-manager.js?v=20260108:580
setTimeout
setupStartupSequence @ app-manager.js?v=20260108:579
await in setupStartupSequence
init @ app-manager.js?v=20260108:29
(anonymous) @ app.js?v=20260108:258
frontend-reconnection-manager.js:376 ❌ [SERVER CHECK] Resposta não OK: 404 
checkServerStatus @ frontend-reconnection-manager.js:376
await in checkServerStatus
(anonymous) @ frontend-reconnection-manager.js:207
setInterval
startHeartbeat @ frontend-reconnection-manager.js:194
init @ frontend-reconnection-manager.js:30
FrontendReconnectionManager @ frontend-reconnection-manager.js:25
initFrontendReconnection @ frontend-reconnection-manager.js:861
(anonymous) @ app-manager.js?v=20260108:580
setTimeout
setupStartupSequence @ app-manager.js?v=20260108:579
await in setupStartupSequence
init @ app-manager.js?v=20260108:29
(anonymous) @ app.js?v=20260108:258
frontend-reconnection-manager.js:361  GET https://n8f3fxvr-3004.brs.devtunnels.ms/api 404 (Not Found)
checkServerStatus @ frontend-reconnection-manager.js:361
(anonymous) @ frontend-reconnection-manager.js:207
setInterval
startHeartbeat @ frontend-reconnection-manager.js:194
init @ frontend-reconnection-manager.js:30
FrontendReconnectionManager @ frontend-reconnection-manager.js:25
initFrontendReconnection @ frontend-reconnection-manager.js:861
(anonymous) @ app-manager.js?v=20260108:580
setTimeout
setupStartupSequence @ app-manager.js?v=20260108:579
await in setupStartupSequence
init @ app-manager.js?v=20260108:29
(anonymous) @ app.js?v=20260108:258
frontend-reconnection-manager.js:376 ❌ [SERVER CHECK] Resposta não OK: 404 
checkServerStatus @ frontend-reconnection-manager.js:376
await in checkServerStatus
(anonymous) @ frontend-reconnection-manager.js:207
setInterval
startHeartbeat @ frontend-reconnection-manager.js:194
init @ frontend-reconnection-manager.js:30
FrontendReconnectionManager @ frontend-reconnection-manager.js:25
initFrontendReconnection @ frontend-reconnection-manager.js:861
(anonymous) @ app-manager.js?v=20260108:580
setTimeout
setupStartupSequence @ app-manager.js?v=20260108:579
await in setupStartupSequence
init @ app-manager.js?v=20260108:29
(anonymous) @ app.js?v=20260108:258
online-users-monitor.js:59  POST https://n8f3fxvr-3004.brs.devtunnels.ms/api/online-users/heartbeat 404 (Not Found)
sendHeartbeat @ online-users-monitor.js:59
(anonymous) @ online-users-monitor.js:139
setInterval
startHeartbeat @ online-users-monitor.js:138
init @ online-users-monitor.js:39
await in init
(anonymous) @ online-users-monitor.js:275
setTimeout
(anonymous) @ online-users-monitor.js:273
saveUserData @ session.js:440
setupStartupSequence @ app-manager.js?v=20260108:324
await in setupStartupSequence
init @ app-manager.js?v=20260108:29
(anonymous) @ app.js?v=20260108:258
frontend-reconnection-manager.js:361  GET https://n8f3fxvr-3004.brs.devtunnels.ms/api 404 (Not Found)
checkServerStatus @ frontend-reconnection-manager.js:361
(anonymous) @ frontend-reconnection-manager.js:207
setInterval
startHeartbeat @ frontend-reconnection-manager.js:194
init @ frontend-reconnection-manager.js:30
FrontendReconnectionManager @ frontend-reconnection-manager.js:25
initFrontendReconnection @ frontend-reconnection-manager.js:861
(anonymous) @ app-manager.js?v=20260108:580
setTimeout
setupStartupSequence @ app-manager.js?v=20260108:579
await in setupStartupSequence
init @ app-manager.js?v=20260108:29
(anonymous) @ app.js?v=20260108:258
frontend-reconnection-manager.js:376 ❌ [SERVER CHECK] Resposta não OK: 404 
checkServerStatus @ frontend-reconnection-manager.js:376
await in checkServerStatus
(anonymous) @ frontend-reconnection-manager.js:207
setInterval
startHeartbeat @ frontend-reconnection-manager.js:194
init @ frontend-reconnection-manager.js:30
FrontendReconnectionManager @ frontend-reconnection-manager.js:25
initFrontendReconnection @ frontend-reconnection-manager.js:861
(anonymous) @ app-manager.js?v=20260108:580
setTimeout
setupStartupSequence @ app-manager.js?v=20260108:579
await in setupStartupSequence
init @ app-manager.js?v=20260108:29
(anonymous) @ app.js?v=20260108:258
frontend-reconnection-manager.js:361  GET https://n8f3fxvr-3004.brs.devtunnels.ms/api 404 (Not Found)
checkServerStatus @ frontend-reconnection-manager.js:361
(anonymous) @ frontend-reconnection-manager.js:207
setInterval
startHeartbeat @ frontend-reconnection-manager.js:194
init @ frontend-reconnection-manager.js:30
FrontendReconnectionManager @ frontend-reconnection-manager.js:25
initFrontendReconnection @ frontend-reconnection-manager.js:861
(anonymous) @ app-manager.js?v=20260108:580
setTimeout
setupStartupSequence @ app-manager.js?v=20260108:579
await in setupStartupSequence
init @ app-manager.js?v=20260108:29
(anonymous) @ app.js?v=20260108:258
frontend-reconnection-manager.js:376 ❌ [SERVER CHECK] Resposta não OK: 404 
checkServerStatus @ frontend-reconnection-manager.js:376
await in checkServerStatus
(anonymous) @ frontend-reconnection-manager.js:207
setInterval
startHeartbeat @ frontend-reconnection-manager.js:194
init @ frontend-reconnection-manager.js:30
FrontendReconnectionManager @ frontend-reconnection-manager.js:25
initFrontendReconnection @ frontend-reconnection-manager.js:861
(anonymous) @ app-manager.js?v=20260108:580
setTimeout
setupStartupSequence @ app-manager.js?v=20260108:579
await in setupStartupSequence
init @ app-manager.js?v=20260108:29
(anonymous) @ app.js?v=20260108:258
frontend-reconnection-manager.js:361  GET https://n8f3fxvr-3004.brs.devtunnels.ms/api 404 (Not Found)
checkServerStatus @ frontend-reconnection-manager.js:361
(anonymous) @ frontend-reconnection-manager.js:207
setInterval
startHeartbeat @ frontend-reconnection-manager.js:194
init @ frontend-reconnection-manager.js:30
FrontendReconnectionManager @ frontend-reconnection-manager.js:25
initFrontendReconnection @ frontend-reconnection-manager.js:861
(anonymous) @ app-manager.js?v=20260108:580
setTimeout
setupStartupSequence @ app-manager.js?v=20260108:579
await in setupStartupSequence
init @ app-manager.js?v=20260108:29
(anonymous) @ app.js?v=20260108:258
frontend-reconnection-manager.js:376 ❌ [SERVER CHECK] Resposta não OK: 404 
checkServerStatus @ frontend-reconnection-manager.js:376
await in checkServerStatus
(anonymous) @ frontend-reconnection-manager.js:207
setInterval
startHeartbeat @ frontend-reconnection-manager.js:194
init @ frontend-reconnection-manager.js:30
FrontendReconnectionManager @ frontend-reconnection-manager.js:25
initFrontendReconnection @ frontend-reconnection-manager.js:861
(anonymous) @ app-manager.js?v=20260108:580
setTimeout
setupStartupSequence @ app-manager.js?v=20260108:579
await in setupStartupSequence
init @ app-manager.js?v=20260108:29
(anonymous) @ app.js?v=20260108:258
online-users-monitor.js:59  POST https://n8f3fxvr-3004.brs.devtunnels.ms/api/online-users/heartbeat 404 (Not Found)
sendHeartbeat @ online-users-monitor.js:59
(anonymous) @ online-users-monitor.js:139
setInterval
startHeartbeat @ online-users-monitor.js:138
init @ online-users-monitor.js:39
await in init
(anonymous) @ online-users-monitor.js:275
setTimeout
(anonymous) @ online-users-monitor.js:273
saveUserData @ session.js:440
setupStartupSequence @ app-manager.js?v=20260108:324
await in setupStartupSequence
init @ app-manager.js?v=20260108:29
(anonymous) @ app.js?v=20260108:258
online-users-monitor.js:106  GET https://n8f3fxvr-3004.brs.devtunnels.ms/api/online-users 404 (Not Found)
syncOnlineUsers @ online-users-monitor.js:106
(anonymous) @ online-users-monitor.js:156
setInterval
startSync @ online-users-monitor.js:155
init @ online-users-monitor.js:42
await in init
(anonymous) @ online-users-monitor.js:275
setTimeout
(anonymous) @ online-users-monitor.js:273
saveUserData @ session.js:440
setupStartupSequence @ app-manager.js?v=20260108:324
await in setupStartupSequence
init @ app-manager.js?v=20260108:29
(anonymous) @ app.js?v=20260108:258
frontend-reconnection-manager.js:361  GET https://n8f3fxvr-3004.brs.devtunnels.ms/api 404 (Not Found)
checkServerStatus @ frontend-reconnection-manager.js:361
(anonymous) @ frontend-reconnection-manager.js:207
setInterval
startHeartbeat @ frontend-reconnection-manager.js:194
init @ frontend-reconnection-manager.js:30
FrontendReconnectionManager @ frontend-reconnection-manager.js:25
initFrontendReconnection @ frontend-reconnection-manager.js:861
(anonymous) @ app-manager.js?v=20260108:580
setTimeout
setupStartupSequence @ app-manager.js?v=20260108:579
await in setupStartupSequence
init @ app-manager.js?v=20260108:29
(anonymous) @ app.js?v=20260108:258
frontend-reconnection-manager.js:376 ❌ [SERVER CHECK] Resposta não OK: 404 
checkServerStatus @ frontend-reconnection-manager.js:376
await in checkServerStatus
(anonymous) @ frontend-reconnection-manager.js:207
setInterval
startHeartbeat @ frontend-reconnection-manager.js:194
init @ frontend-reconnection-manager.js:30
FrontendReconnectionManager @ frontend-reconnection-manager.js:25
initFrontendReconnection @ frontend-reconnection-manager.js:861
(anonymous) @ app-manager.js?v=20260108:580
setTimeout
setupStartupSequence @ app-manager.js?v=20260108:579
await in setupStartupSequence
init @ app-manager.js?v=20260108:29
(anonymous) @ app.js?v=20260108:258
frontend-reconnection-manager.js:361  GET https://n8f3fxvr-3004.brs.devtunnels.ms/api 404 (Not Found)
checkServerStatus @ frontend-reconnection-manager.js:361
(anonymous) @ frontend-reconnection-manager.js:207
setInterval
startHeartbeat @ frontend-reconnection-manager.js:194
init @ frontend-reconnection-manager.js:30
FrontendReconnectionManager @ frontend-reconnection-manager.js:25
initFrontendReconnection @ frontend-reconnection-manager.js:861
(anonymous) @ app-manager.js?v=20260108:580
setTimeout
setupStartupSequence @ app-manager.js?v=20260108:579
await in setupStartupSequence
init @ app-manager.js?v=20260108:29
(anonymous) @ app.js?v=20260108:258
frontend-reconnection-manager.js:376 ❌ [SERVER CHECK] Resposta não OK: 404 
checkServerStatus @ frontend-reconnection-manager.js:376
await in checkServerStatus
(anonymous) @ frontend-reconnection-manager.js:207
setInterval
startHeartbeat @ frontend-reconnection-manager.js:194
init @ frontend-reconnection-manager.js:30
FrontendReconnectionManager @ frontend-reconnection-manager.js:25
initFrontendReconnection @ frontend-reconnection-manager.js:861
(anonymous) @ app-manager.js?v=20260108:580
setTimeout
setupStartupSequence @ app-manager.js?v=20260108:579
await in setupStartupSequence
init @ app-manager.js?v=20260108:29
(anonymous) @ app.js?v=20260108:258
frontend-reconnection-manager.js:361  GET https://n8f3fxvr-3004.brs.devtunnels.ms/api 404 (Not Found)
checkServerStatus @ frontend-reconnection-manager.js:361
(anonymous) @ frontend-reconnection-manager.js:207
setInterval
startHeartbeat @ frontend-reconnection-manager.js:194
init @ frontend-reconnection-manager.js:30
FrontendReconnectionManager @ frontend-reconnection-manager.js:25
initFrontendReconnection @ frontend-reconnection-manager.js:861
(anonymous) @ app-manager.js?v=20260108:580
setTimeout
setupStartupSequence @ app-manager.js?v=20260108:579
await in setupStartupSequence
init @ app-manager.js?v=20260108:29
(anonymous) @ app.js?v=20260108:258
frontend-reconnection-manager.js:376 ❌ [SERVER CHECK] Resposta não OK: 404 
checkServerStatus @ frontend-reconnection-manager.js:376
await in checkServerStatus
(anonymous) @ frontend-reconnection-manager.js:207
setInterval
startHeartbeat @ frontend-reconnection-manager.js:194
init @ frontend-reconnection-manager.js:30
FrontendReconnectionManager @ frontend-reconnection-manager.js:25
initFrontendReconnection @ frontend-reconnection-manager.js:861
(anonymous) @ app-manager.js?v=20260108:580
setTimeout
setupStartupSequence @ app-manager.js?v=20260108:579
await in setupStartupSequence
init @ app-manager.js?v=20260108:29
(anonymous) @ app.js?v=20260108:258
online-users-monitor.js:59  POST https://n8f3fxvr-3004.brs.devtunnels.ms/api/online-users/heartbeat 404 (Not Found)
sendHeartbeat @ online-users-monitor.js:59
(anonymous) @ online-users-monitor.js:139
setInterval
startHeartbeat @ online-users-monitor.js:138
init @ online-users-monitor.js:39
await in init
(anonymous) @ online-users-monitor.js:275
setTimeout
(anonymous) @ online-users-monitor.js:273
saveUserData @ session.js:440
setupStartupSequence @ app-manager.js?v=20260108:324
await in setupStartupSequence
init @ app-manager.js?v=20260108:29
(anonymous) @ app.js?v=20260108:258
frontend-reconnection-manager.js:361  GET https://n8f3fxvr-3004.brs.devtunnels.ms/api 404 (Not Found)
checkServerStatus @ frontend-reconnection-manager.js:361
(anonymous) @ frontend-reconnection-manager.js:207
setInterval
startHeartbeat @ frontend-reconnection-manager.js:194
init @ frontend-reconnection-manager.js:30
FrontendReconnectionManager @ frontend-reconnection-manager.js:25
initFrontendReconnection @ frontend-reconnection-manager.js:861
(anonymous) @ app-manager.js?v=20260108:580
setTimeout
setupStartupSequence @ app-manager.js?v=20260108:579
await in setupStartupSequence
init @ app-manager.js?v=20260108:29
(anonymous) @ app.js?v=20260108:258
frontend-reconnection-manager.js:376 ❌ [SERVER CHECK] Resposta não OK: 404 
checkServerStatus @ frontend-reconnection-manager.js:376
await in checkServerStatus
(anonymous) @ frontend-reconnection-manager.js:207
setInterval
startHeartbeat @ frontend-reconnection-manager.js:194
init @ frontend-reconnection-manager.js:30
FrontendReconnectionManager @ frontend-reconnection-manager.js:25
initFrontendReconnection @ frontend-reconnection-manager.js:861
(anonymous) @ app-manager.js?v=20260108:580
setTimeout
setupStartupSequence @ app-manager.js?v=20260108:579
await in setupStartupSequence
init @ app-manager.js?v=20260108:29
(anonymous) @ app.js?v=20260108:258
frontend-reconnection-manager.js:361  GET https://n8f3fxvr-3004.brs.devtunnels.ms/api 404 (Not Found)
checkServerStatus @ frontend-reconnection-manager.js:361
(anonymous) @ frontend-reconnection-manager.js:207
setInterval
startHeartbeat @ frontend-reconnection-manager.js:194
init @ frontend-reconnection-manager.js:30
FrontendReconnectionManager @ frontend-reconnection-manager.js:25
initFrontendReconnection @ frontend-reconnection-manager.js:861
(anonymous) @ app-manager.js?v=20260108:580
setTimeout
setupStartupSequence @ app-manager.js?v=20260108:579
await in setupStartupSequence
init @ app-manager.js?v=20260108:29
(anonymous) @ app.js?v=20260108:258
frontend-reconnection-manager.js:376 ❌ [SERVER CHECK] Resposta não OK: 404 
checkServerStatus @ frontend-reconnection-manager.js:376
await in checkServerStatus
(anonymous) @ frontend-reconnection-manager.js:207
setInterval
startHeartbeat @ frontend-reconnection-manager.js:194
init @ frontend-reconnection-manager.js:30
FrontendReconnectionManager @ frontend-reconnection-manager.js:25
initFrontendReconnection @ frontend-reconnection-manager.js:861
(anonymous) @ app-manager.js?v=20260108:580
setTimeout
setupStartupSequence @ app-manager.js?v=20260108:579
await in setupStartupSequence
init @ app-manager.js?v=20260108:29
(anonymous) @ app.js?v=20260108:258
frontend-reconnection-manager.js:361  GET https://n8f3fxvr-3004.brs.devtunnels.ms/api 404 (Not Found)
checkServerStatus @ frontend-reconnection-manager.js:361
(anonymous) @ frontend-reconnection-manager.js:207
setInterval
startHeartbeat @ frontend-reconnection-manager.js:194
init @ frontend-reconnection-manager.js:30
FrontendReconnectionManager @ frontend-reconnection-manager.js:25
initFrontendReconnection @ frontend-reconnection-manager.js:861
(anonymous) @ app-manager.js?v=20260108:580
setTimeout
setupStartupSequence @ app-manager.js?v=20260108:579
await in setupStartupSequence
init @ app-manager.js?v=20260108:29
(anonymous) @ app.js?v=20260108:258
frontend-reconnection-manager.js:376 ❌ [SERVER CHECK] Resposta não OK: 404 
checkServerStatus @ frontend-reconnection-manager.js:376
await in checkServerStatus
(anonymous) @ frontend-reconnection-manager.js:207
setInterval
startHeartbeat @ frontend-reconnection-manager.js:194
init @ frontend-reconnection-manager.js:30
FrontendReconnectionManager @ frontend-reconnection-manager.js:25
initFrontendReconnection @ frontend-reconnection-manager.js:861
(anonymous) @ app-manager.js?v=20260108:580
setTimeout
setupStartupSequence @ app-manager.js?v=20260108:579
await in setupStartupSequence
init @ app-manager.js?v=20260108:29
(anonymous) @ app.js?v=20260108:258
online-users-monitor.js:59  POST https://n8f3fxvr-3004.brs.devtunnels.ms/api/online-users/heartbeat 404 (Not Found)
sendHeartbeat @ online-users-monitor.js:59
(anonymous) @ online-users-monitor.js:139
setInterval
startHeartbeat @ online-users-monitor.js:138
init @ online-users-monitor.js:39
await in init
(anonymous) @ online-users-monitor.js:275
setTimeout
(anonymous) @ online-users-monitor.js:273
saveUserData @ session.js:440
setupStartupSequence @ app-manager.js?v=20260108:324
await in setupStartupSequence
init @ app-manager.js?v=20260108:29
(anonymous) @ app.js?v=20260108:258
online-users-monitor.js:106  GET https://n8f3fxvr-3004.brs.devtunnels.ms/api/online-users 404 (Not Found)
syncOnlineUsers @ online-users-monitor.js:106
(anonymous) @ online-users-monitor.js:156
setInterval
startSync @ online-users-monitor.js:155
init @ online-users-monitor.js:42
await in init
(anonymous) @ online-users-monitor.js:275
setTimeout
(anonymous) @ online-users-monitor.js:273
saveUserData @ session.js:440
setupStartupSequence @ app-manager.js?v=20260108:324
await in setupStartupSequence
init @ app-manager.js?v=20260108:29
(anonymous) @ app.js?v=20260108:258
frontend-reconnection-manager.js:361  GET https://n8f3fxvr-3004.brs.devtunnels.ms/api 404 (Not Found)
checkServerStatus @ frontend-reconnection-manager.js:361
(anonymous) @ frontend-reconnection-manager.js:207
setInterval
startHeartbeat @ frontend-reconnection-manager.js:194
init @ frontend-reconnection-manager.js:30
FrontendReconnectionManager @ frontend-reconnection-manager.js:25
initFrontendReconnection @ frontend-reconnection-manager.js:861
(anonymous) @ app-manager.js?v=20260108:580
setTimeout
setupStartupSequence @ app-manager.js?v=20260108:579
await in setupStartupSequence
init @ app-manager.js?v=20260108:29
(anonymous) @ app.js?v=20260108:258
frontend-reconnection-manager.js:376 ❌ [SERVER CHECK] Resposta não OK: 404 
checkServerStatus @ frontend-reconnection-manager.js:376
await in checkServerStatus
(anonymous) @ frontend-reconnection-manager.js:207
setInterval
startHeartbeat @ frontend-reconnection-manager.js:194
init @ frontend-reconnection-manager.js:30
FrontendReconnectionManager @ frontend-reconnection-manager.js:25
initFrontendReconnection @ frontend-reconnection-manager.js:861
(anonymous) @ app-manager.js?v=20260108:580
setTimeout
setupStartupSequence @ app-manager.js?v=20260108:579
await in setupStartupSequence
init @ app-manager.js?v=20260108:29
(anonymous) @ app.js?v=20260108:258
frontend-reconnection-manager.js:361  GET https://n8f3fxvr-3004.brs.devtunnels.ms/api 404 (Not Found)
checkServerStatus @ frontend-reconnection-manager.js:361
(anonymous) @ frontend-reconnection-manager.js:207
setInterval
startHeartbeat @ frontend-reconnection-manager.js:194
init @ frontend-reconnection-manager.js:30
FrontendReconnectionManager @ frontend-reconnection-manager.js:25
initFrontendReconnection @ frontend-reconnection-manager.js:861
(anonymous) @ app-manager.js?v=20260108:580
setTimeout
setupStartupSequence @ app-manager.js?v=20260108:579
await in setupStartupSequence
init @ app-manager.js?v=20260108:29
(anonymous) @ app.js?v=20260108:258
frontend-reconnection-manager.js:376 ❌ [SERVER CHECK] Resposta não OK: 404 
checkServerStatus @ frontend-reconnection-manager.js:376
await in checkServerStatus
(anonymous) @ frontend-reconnection-manager.js:207
setInterval
startHeartbeat @ frontend-reconnection-manager.js:194
init @ frontend-reconnection-manager.js:30
FrontendReconnectionManager @ frontend-reconnection-manager.js:25
initFrontendReconnection @ frontend-reconnection-manager.js:861
(anonymous) @ app-manager.js?v=20260108:580
setTimeout
setupStartupSequence @ app-manager.js?v=20260108:579
await in setupStartupSequence
init @ app-manager.js?v=20260108:29
(anonymous) @ app.js?v=20260108:258
frontend-reconnection-manager.js:361  GET https://n8f3fxvr-3004.brs.devtunnels.ms/api 404 (Not Found)
checkServerStatus @ frontend-reconnection-manager.js:361
(anonymous) @ frontend-reconnection-manager.js:207
setInterval
startHeartbeat @ frontend-reconnection-manager.js:194
init @ frontend-reconnection-manager.js:30
FrontendReconnectionManager @ frontend-reconnection-manager.js:25
initFrontendReconnection @ frontend-reconnection-manager.js:861
(anonymous) @ app-manager.js?v=20260108:580
setTimeout
setupStartupSequence @ app-manager.js?v=20260108:579
await in setupStartupSequence
init @ app-manager.js?v=20260108:29
(anonymous) @ app.js?v=20260108:258
frontend-reconnection-manager.js:376 ❌ [SERVER CHECK] Resposta não OK: 404 
checkServerStatus @ frontend-reconnection-manager.js:376
await in checkServerStatus
(anonymous) @ frontend-reconnection-manager.js:207
setInterval
startHeartbeat @ frontend-reconnection-manager.js:194
init @ frontend-reconnection-manager.js:30
FrontendReconnectionManager @ frontend-reconnection-manager.js:25
initFrontendReconnection @ frontend-reconnection-manager.js:861
(anonymous) @ app-manager.js?v=20260108:580
setTimeout
setupStartupSequence @ app-manager.js?v=20260108:579
await in setupStartupSequence
init @ app-manager.js?v=20260108:29
(anonymous) @ app.js?v=20260108:258
online-users-monitor.js:59  POST https://n8f3fxvr-3004.brs.devtunnels.ms/api/online-users/heartbeat 404 (Not Found)
sendHeartbeat @ online-users-monitor.js:59
(anonymous) @ online-users-monitor.js:139
setInterval
startHeartbeat @ online-users-monitor.js:138
init @ online-users-monitor.js:39
await in init
(anonymous) @ online-users-monitor.js:275
setTimeout
(anonymous) @ online-users-monitor.js:273
saveUserData @ session.js:440
setupStartupSequence @ app-manager.js?v=20260108:324
await in setupStartupSequence
init @ app-manager.js?v=20260108:29
(anonymous) @ app.js?v=20260108:258
frontend-reconnection-manager.js:361  GET https://n8f3fxvr-3004.brs.devtunnels.ms/api 404 (Not Found)
checkServerStatus @ frontend-reconnection-manager.js:361
(anonymous) @ frontend-reconnection-manager.js:207
setInterval
startHeartbeat @ frontend-reconnection-manager.js:194
init @ frontend-reconnection-manager.js:30
FrontendReconnectionManager @ frontend-reconnection-manager.js:25
initFrontendReconnection @ frontend-reconnection-manager.js:861
(anonymous) @ app-manager.js?v=20260108:580
setTimeout
setupStartupSequence @ app-manager.js?v=20260108:579
await in setupStartupSequence
init @ app-manager.js?v=20260108:29
(anonymous) @ app.js?v=20260108:258
frontend-reconnection-manager.js:376 ❌ [SERVER CHECK] Resposta não OK: 404 
checkServerStatus @ frontend-reconnection-manager.js:376
await in checkServerStatus
(anonymous) @ frontend-reconnection-manager.js:207
setInterval
startHeartbeat @ frontend-reconnection-manager.js:194
init @ frontend-reconnection-manager.js:30
FrontendReconnectionManager @ frontend-reconnection-manager.js:25
initFrontendReconnection @ frontend-reconnection-manager.js:861
(anonymous) @ app-manager.js?v=20260108:580
setTimeout
setupStartupSequence @ app-manager.js?v=20260108:579
await in setupStartupSequence
init @ app-manager.js?v=20260108:29
(anonymous) @ app.js?v=20260108:258
online-users-monitor.js:106  GET https://n8f3fxvr-3004.brs.devtunnels.ms/api/online-users 404 (Not Found)
syncOnlineUsers @ online-users-monitor.js:106
(anonymous) @ online-users-monitor.js:156
setInterval
startSync @ online-users-monitor.js:155
init @ online-users-monitor.js:42
await in init
(anonymous) @ online-users-monitor.js:275
setTimeout
(anonymous) @ online-users-monitor.js:273
saveUserData @ session.js:440
setupStartupSequence @ app-manager.js?v=20260108:324
await in setupStartupSequence
init @ app-manager.js?v=20260108:29
(anonymous) @ app.js?v=20260108:258
online-users-monitor.js:59  POST https://n8f3fxvr-3004.brs.devtunnels.ms/api/online-users/heartbeat 404 (Not Found)
sendHeartbeat @ online-users-monitor.js:59
(anonymous) @ online-users-monitor.js:139
setInterval
startHeartbeat @ online-users-monitor.js:138
init @ online-users-monitor.js:39
await in init
(anonymous) @ online-users-monitor.js:275
setTimeout
(anonymous) @ online-users-monitor.js:273
saveUserData @ session.js:440
setupStartupSequence @ app-manager.js?v=20260108:324
await in setupStartupSequence
init @ app-manager.js?v=20260108:29
(anonymous) @ app.js?v=20260108:258
frontend-reconnection-manager.js:361  GET https://n8f3fxvr-3004.brs.devtunnels.ms/api 404 (Not Found)
checkServerStatus @ frontend-reconnection-manager.js:361
(anonymous) @ frontend-reconnection-manager.js:207
setInterval
startHeartbeat @ frontend-reconnection-manager.js:194
init @ frontend-reconnection-manager.js:30
FrontendReconnectionManager @ frontend-reconnection-manager.js:25
initFrontendReconnection @ frontend-reconnection-manager.js:861
(anonymous) @ app-manager.js?v=20260108:580
setTimeout
setupStartupSequence @ app-manager.js?v=20260108:579
await in setupStartupSequence
init @ app-manager.js?v=20260108:29
(anonymous) @ app.js?v=20260108:258
frontend-reconnection-manager.js:376 ❌ [SERVER CHECK] Resposta não OK: 404 
checkServerStatus @ frontend-reconnection-manager.js:376
await in checkServerStatus
(anonymous) @ frontend-reconnection-manager.js:207
setInterval
startHeartbeat @ frontend-reconnection-manager.js:194
init @ frontend-reconnection-manager.js:30
FrontendReconnectionManager @ frontend-reconnection-manager.js:25
initFrontendReconnection @ frontend-reconnection-manager.js:861
(anonymous) @ app-manager.js?v=20260108:580
setTimeout
setupStartupSequence @ app-manager.js?v=20260108:579
await in setupStartupSequence
init @ app-manager.js?v=20260108:29
(anonymous) @ app.js?v=20260108:258
online-users-monitor.js:59  POST https://n8f3fxvr-3004.brs.devtunnels.ms/api/online-users/heartbeat 404 (Not Found)
sendHeartbeat @ online-users-monitor.js:59
(anonymous) @ online-users-monitor.js:139
setInterval
startHeartbeat @ online-users-monitor.js:138
init @ online-users-monitor.js:39
await in init
(anonymous) @ online-users-monitor.js:275
setTimeout
(anonymous) @ online-users-monitor.js:273
saveUserData @ session.js:440
setupStartupSequence @ app-manager.js?v=20260108:324
await in setupStartupSequence
init @ app-manager.js?v=20260108:29
(anonymous) @ app.js?v=20260108:258
frontend-reconnection-manager.js:361  GET https://n8f3fxvr-3004.brs.devtunnels.ms/api 404 (Not Found)
checkServerStatus @ frontend-reconnection-manager.js:361
(anonymous) @ frontend-reconnection-manager.js:207
setInterval
startHeartbeat @ frontend-reconnection-manager.js:194
init @ frontend-reconnection-manager.js:30
FrontendReconnectionManager @ frontend-reconnection-manager.js:25
initFrontendReconnection @ frontend-reconnection-manager.js:861
(anonymous) @ app-manager.js?v=20260108:580
setTimeout
setupStartupSequence @ app-manager.js?v=20260108:579
await in setupStartupSequence
init @ app-manager.js?v=20260108:29
(anonymous) @ app.js?v=20260108:258
frontend-reconnection-manager.js:376 ❌ [SERVER CHECK] Resposta não OK: 404 
checkServerStatus @ frontend-reconnection-manager.js:376
await in checkServerStatus
(anonymous) @ frontend-reconnection-manager.js:207
setInterval
startHeartbeat @ frontend-reconnection-manager.js:194
init @ frontend-reconnection-manager.js:30
FrontendReconnectionManager @ frontend-reconnection-manager.js:25
initFrontendReconnection @ frontend-reconnection-manager.js:861
(anonymous) @ app-manager.js?v=20260108:580
setTimeout
setupStartupSequence @ app-manager.js?v=20260108:579
await in setupStartupSequence
init @ app-manager.js?v=20260108:29
(anonymous) @ app.js?v=20260108:258
online-users-monitor.js:106  GET https://n8f3fxvr-3004.brs.devtunnels.ms/api/online-users 404 (Not Found)
syncOnlineUsers @ online-users-monitor.js:106
(anonymous) @ online-users-monitor.js:156
setInterval
startSync @ online-users-monitor.js:155
init @ online-users-monitor.js:42
await in init
(anonymous) @ online-users-monitor.js:275
setTimeout
(anonymous) @ online-users-monitor.js:273
saveUserData @ session.js:440
setupStartupSequence @ app-manager.js?v=20260108:324
await in setupStartupSequence
init @ app-manager.js?v=20260108:29
(anonymous) @ app.js?v=20260108:258
frontend-reconnection-manager.js:361  GET https://n8f3fxvr-3004.brs.devtunnels.ms/api 404 (Not Found)
checkServerStatus @ frontend-reconnection-manager.js:361
(anonymous) @ frontend-reconnection-manager.js:207
setInterval
startHeartbeat @ frontend-reconnection-manager.js:194
init @ frontend-reconnection-manager.js:30
FrontendReconnectionManager @ frontend-reconnection-manager.js:25
initFrontendReconnection @ frontend-reconnection-manager.js:861
(anonymous) @ app-manager.js?v=20260108:580
setTimeout
setupStartupSequence @ app-manager.js?v=20260108:579
await in setupStartupSequence
init @ app-manager.js?v=20260108:29
(anonymous) @ app.js?v=20260108:258
frontend-reconnection-manager.js:376 ❌ [SERVER CHECK] Resposta não OK: 404 
checkServerStatus @ frontend-reconnection-manager.js:376
await in checkServerStatus
(anonymous) @ frontend-reconnection-manager.js:207
setInterval
startHeartbeat @ frontend-reconnection-manager.js:194
init @ frontend-reconnection-manager.js:30
FrontendReconnectionManager @ frontend-reconnection-manager.js:25
initFrontendReconnection @ frontend-reconnection-manager.js:861
(anonymous) @ app-manager.js?v=20260108:580
setTimeout
setupStartupSequence @ app-manager.js?v=20260108:579
await in setupStartupSequence
init @ app-manager.js?v=20260108:29
(anonymous) @ app.js?v=20260108:258
online-users-monitor.js:106  GET https://n8f3fxvr-3004.brs.devtunnels.ms/api/online-users 404 (Not Found)
syncOnlineUsers @ online-users-monitor.js:106
(anonymous) @ online-users-monitor.js:156
setInterval
startSync @ online-users-monitor.js:155
init @ online-users-monitor.js:42
await in init
(anonymous) @ online-users-monitor.js:275
setTimeout
(anonymous) @ online-users-monitor.js:273
saveUserData @ session.js:440
setupStartupSequence @ app-manager.js?v=20260108:324
await in setupStartupSequence
init @ app-manager.js?v=20260108:29
(anonymous) @ app.js?v=20260108:258
online-users-monitor.js:59  POST https://n8f3fxvr-3004.brs.devtunnels.ms/api/online-users/heartbeat 404 (Not Found)
sendHeartbeat @ online-users-monitor.js:59
(anonymous) @ online-users-monitor.js:139
setInterval
startHeartbeat @ online-users-monitor.js:138
init @ online-users-monitor.js:39
await in init
(anonymous) @ online-users-monitor.js:275
setTimeout
(anonymous) @ online-users-monitor.js:273
saveUserData @ session.js:440
setupStartupSequence @ app-manager.js?v=20260108:324
await in setupStartupSequence
init @ app-manager.js?v=20260108:29
(anonymous) @ app.js?v=20260108:258
frontend-reconnection-manager.js:361  GET https://n8f3fxvr-3004.brs.devtunnels.ms/api 404 (Not Found)
checkServerStatus @ frontend-reconnection-manager.js:361
(anonymous) @ frontend-reconnection-manager.js:207
setInterval
startHeartbeat @ frontend-reconnection-manager.js:194
init @ frontend-reconnection-manager.js:30
FrontendReconnectionManager @ frontend-reconnection-manager.js:25
initFrontendReconnection @ frontend-reconnection-manager.js:861
(anonymous) @ app-manager.js?v=20260108:580
setTimeout
setupStartupSequence @ app-manager.js?v=20260108:579
await in setupStartupSequence
init @ app-manager.js?v=20260108:29
(anonymous) @ app.js?v=20260108:258
frontend-reconnection-manager.js:376 ❌ [SERVER CHECK] Resposta não OK: 404 
checkServerStatus @ frontend-reconnection-manager.js:376
await in checkServerStatus
(anonymous) @ frontend-reconnection-manager.js:207
setInterval
startHeartbeat @ frontend-reconnection-manager.js:194
init @ frontend-reconnection-manager.js:30
FrontendReconnectionManager @ frontend-reconnection-manager.js:25
initFrontendReconnection @ frontend-reconnection-manager.js:861
(anonymous) @ app-manager.js?v=20260108:580
setTimeout
setupStartupSequence @ app-manager.js?v=20260108:579
await in setupStartupSequence
init @ app-manager.js?v=20260108:29
(anonymous) @ app.js?v=20260108:258
online-users-monitor.js:59  POST https://n8f3fxvr-3004.brs.devtunnels.ms/api/online-users/heartbeat 404 (Not Found)
sendHeartbeat @ online-users-monitor.js:59
(anonymous) @ online-users-monitor.js:139
setInterval
startHeartbeat @ online-users-monitor.js:138
init @ online-users-monitor.js:39
await in init
(anonymous) @ online-users-monitor.js:275
setTimeout
(anonymous) @ online-users-monitor.js:273
saveUserData @ session.js:440
setupStartupSequence @ app-manager.js?v=20260108:324
await in setupStartupSequence
init @ app-manager.js?v=20260108:29
(anonymous) @ app.js?v=20260108:258
frontend-reconnection-manager.js:361  GET https://n8f3fxvr-3004.brs.devtunnels.ms/api 404 (Not Found)
checkServerStatus @ frontend-reconnection-manager.js:361
(anonymous) @ frontend-reconnection-manager.js:207
setInterval
startHeartbeat @ frontend-reconnection-manager.js:194
init @ frontend-reconnection-manager.js:30
FrontendReconnectionManager @ frontend-reconnection-manager.js:25
initFrontendReconnection @ frontend-reconnection-manager.js:861
(anonymous) @ app-manager.js?v=20260108:580
setTimeout
setupStartupSequence @ app-manager.js?v=20260108:579
await in setupStartupSequence
init @ app-manager.js?v=20260108:29
(anonymous) @ app.js?v=20260108:258
frontend-reconnection-manager.js:376 ❌ [SERVER CHECK] Resposta não OK: 404 
checkServerStatus @ frontend-reconnection-manager.js:376
await in checkServerStatus
(anonymous) @ frontend-reconnection-manager.js:207
setInterval
startHeartbeat @ frontend-reconnection-manager.js:194
init @ frontend-reconnection-manager.js:30
FrontendReconnectionManager @ frontend-reconnection-manager.js:25
initFrontendReconnection @ frontend-reconnection-manager.js:861
(anonymous) @ app-manager.js?v=20260108:580
setTimeout
setupStartupSequence @ app-manager.js?v=20260108:579
await in setupStartupSequence
init @ app-manager.js?v=20260108:29
(anonymous) @ app.js?v=20260108:258
