/**
 * Sistema de Reconexão e Atualização Automática do Frontend
 * Mantém o frontend conectado e sincronizado mesmo com reinicializações do servidor
 */
class FrontendReconnectionManager {
    constructor() {
        this.isReconnecting = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectInterval = null;
        this.heartbeatInterval = null;
        this.serverStatus = 'unknown';
        this.lastSuccessfulPing = Date.now();
        this.hasHadFirstConnection = false; // Flag para detectar primeira conexão
        this.reconnectDelay = 2000; // Inicial: 2 segundos
        this.maxReconnectDelay = 30000; // Máximo: 30 segundos

        // Elementos da UI
        this.statusIndicator = null;
        this.reconnectionOverlay = null;

        // ✅ NOVO: Flag para controlar restauração e evitar múltiplas chamadas
        this.restorationInProgress = false;

        this.init();
    }

    init() {
        this.createStatusIndicator();
        this.startHeartbeat();
        this.setupEventListeners();
    }

    // 🎨 Criar indicador visual de status da conexão
    createStatusIndicator() {
        // Remover indicador existente
        const existingIndicator = document.getElementById('server-status-indicator');
        if (existingIndicator) {
            existingIndicator.remove();
        }

        const indicator = document.createElement('div');
        indicator.id = 'server-status-indicator';
        indicator.className = 'server-status-indicator online';
        indicator.innerHTML = `
            <div class="status-dot"></div>
            <span class="status-text">Online</span>
        `;

        // Adicionar estilos
        this.addStatusStyles();

        // Posicionar no canto superior direito
        document.body.appendChild(indicator);
        this.statusIndicator = indicator;

        // Adicionar evento de clique para detalhes
        indicator.addEventListener('click', () => this.showConnectionDetails());
    }

    // 🎨 Adicionar estilos do indicador de status
    addStatusStyles() {
        if (document.getElementById('reconnection-styles')) return;

        const style = document.createElement('style');
        style.id = 'reconnection-styles';
        style.textContent = `
            .server-status-indicator {
                position: fixed;
                top: 20px;
                right: 20px;
                background: white;
                border-radius: 20px;
                padding: 8px 15px;
                display: flex;
                align-items: center;
                gap: 8px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                z-index: 1000;
                cursor: pointer;
                transition: all 0.3s ease;
                font-size: 12px;
                font-weight: 500;
            }

            .server-status-indicator:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 15px rgba(0,0,0,0.15);
            }

            .status-dot {
                width: 8px;
                height: 8px;
                border-radius: 50%;
                animation: pulse 2s infinite;
            }

            .server-status-indicator.online .status-dot {
                background: #28a745;
            }

            .server-status-indicator.offline .status-dot {
                background: #dc3545;
                animation: blink 1s infinite;
            }

            .server-status-indicator.reconnecting .status-dot {
                background: #ffc107;
                animation: spin 1s linear infinite;
            }

            @keyframes pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.5; }
            }

            @keyframes blink {
                0%, 100% { opacity: 1; }
                50% { opacity: 0; }
            }

            @keyframes spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
            }

            .reconnection-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.8);
                backdrop-filter: blur(5px);
                z-index: 9999;
                display: flex;
                align-items: center;
                justify-content: center;
                opacity: 0;
                transition: opacity 0.3s ease;
            }

            .reconnection-overlay.show {
                opacity: 1;
            }

            .reconnection-modal {
                background: white;
                border-radius: 15px;
                padding: 30px;
                max-width: 400px;
                width: 90%;
                text-align: center;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            }

            .reconnection-spinner {
                width: 40px;
                height: 40px;
                border: 4px solid #f3f3f3;
                border-top: 4px solid #007bff;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin: 0 auto 20px;
            }

            .reconnection-status {
                color: #666;
                margin-bottom: 15px;
            }

            .reconnection-attempts {
                font-size: 12px;
                color: #999;
            }
        `;

        document.head.appendChild(style);
    }

    // 💗 Sistema de heartbeat para detectar quedas do servidor
    startHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
        }

        // 🔧 NOVA LÓGICA: Heartbeat adaptativo baseado no contexto
        let heartbeatInterval = 10000; // Padrão: 10 segundos

        // ✅ NOVO: Contador de falhas consecutivas para detecção precoce
        this.consecutiveFailures = 0;
        this.systemHealthWarnings = [];

        this.heartbeatInterval = setInterval(async () => {
            try {
                // 🚨 DIAGNÓSTICO: Detectar se estamos em processo de mudança de conta
                const isAccountSwitching = this.detectAccountSwitching();

                if (isAccountSwitching) {

                    heartbeatInterval = 30000; // Reduzir frequência durante mudança
                    return; // Pular verificação durante mudança de conta
                } else {
                    heartbeatInterval = 10000; // Voltar ao normal
                }

                const isOnline = await this.checkServerStatus();

                if (isOnline) {
                    if (this.serverStatus !== 'online') {
                        // Marcar que tivemos primeira conexão
                        if (!this.hasHadFirstConnection) {
                            this.hasHadFirstConnection = true;
                        }
                        this.onServerOnline();
                    }
                    this.lastSuccessfulPing = Date.now();
                    this.reconnectAttempts = 0;
                    this.consecutiveFailures = 0; // Reset contador de falhas
                } else {
                    this.consecutiveFailures++;

                    // ✅ NOVO: Alerta precoce após 3 falhas consecutivas
                    if (this.consecutiveFailures >= 3 && this.consecutiveFailures <= 5) {
                        this.addSystemHealthWarning('Conectividade instável detectada');
                    }

                    if (this.serverStatus !== 'offline' && this.hasHadFirstConnection) {

                        // 🔍 DIAGNÓSTICO: Log detalhado da causa da desconexão
                        this.diagnosePotentialCauses();
                        this.onServerOffline();
                    }
                }
            } catch (error) {

                if (this.serverStatus !== 'offline') {
                    this.onServerOffline();
                }
            }
        }, heartbeatInterval);
    }

    // 🔍 NOVO: Detectar se estamos em processo de mudança de conta
    detectAccountSwitching() {
        // Verificar se há mudança recente de current_user_loginid
        const currentLoginId = localStorage.getItem('current_user_loginid');
        const lastKnownLoginId = this.lastKnownLoginId;

        if (lastKnownLoginId && currentLoginId !== lastKnownLoginId) {

            this.lastKnownLoginId = currentLoginId;
            this.accountSwitchTimestamp = Date.now();
            return true;
        }

        // Verificar se mudança foi recente (últimos 30 segundos)
        if (this.accountSwitchTimestamp &&
            Date.now() - this.accountSwitchTimestamp < 30000) {
            return true;
        }

        // Atualizar último loginId conhecido
        this.lastKnownLoginId = currentLoginId;
        return false;
    }

    // 🔍 NOVO: Diagnosticar possíveis causas de desconexão
    diagnosePotentialCauses() {


        // 2. Verificar mudanças recentes de conta
        const recentAccountSwitch = this.detectAccountSwitching();


        // 3. Verificar uso de memória
        if (performance.memory) {
            const memoryMB = Math.round(performance.memory.usedJSHeapSize / 1024 / 1024);


        }

        // 4. Verificar conexões WebSocket ativas
        const wsConnections = this.activeWebSockets?.size || 0;


        // 5. Verificar última atividade de API
        const lastApiCall = window.lastApiCallTime || 0;
        const timeSinceLastApi = Date.now() - lastApiCall;

        // 6. Verificar se há erros recentes
        const recentErrors = this.getRecentErrors();
        if (recentErrors.length > 0) {
            console.error(`   ❌ Recent Errors: ${recentErrors.length}`);
            recentErrors.forEach((error, index) => {
                console.error(`     ${index + 1}. ${error.message} (${error.timestamp})`);
            });
        }

        // 7. Verificar se window.lastApiCallTime precisa ser inicializado
        if (!window.lastApiCallTime || window.lastApiCallTime === 0) {

            window.lastApiCallTime = Date.now();
        }

        // 7. Verificar estado do AppManager
        const appManagerStatus = window.AppManager?.isInitialized || false;

        // 8. Verificar problemas de rate limiting
        const rateLimitInfo = this.checkRateLimitStatus();
        if (rateLimitInfo.detected) {
            console.error(`   🚫 RATE LIMIT DETECTED: ${rateLimitInfo.details}`);
        }
    }

    // 🔍 NOVO: Obter erros recentes do console (últimos 5 minutos)
    getRecentErrors() {
        if (!window.recentErrors) {
            window.recentErrors = [];
        }

        const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
        return window.recentErrors.filter(error => error.timestamp > fiveMinutesAgo);
    }

    // 🔍 NOVO: Verificar status de rate limiting
    checkRateLimitStatus() {
        // Verificar se houve muitas chamadas à API recentemente
        const apiCallTimes = window.apiCallTimes || [];
        const oneMinuteAgo = Date.now() - 60000;
        const recentCalls = apiCallTimes.filter(time => time > oneMinuteAgo);

        if (recentCalls.length > 20) { // Mais de 20 chamadas por minuto
            return {
                detected: true,
                details: `${recentCalls.length} chamadas na última minute`
            };
        }

        return { detected: false };
    }

    // 🏥 Verificar status do servidor
    async checkServerStatus(forceDetailedLogs = false) {
        const startTime = Date.now();
        let errorDetails = null;

        // 🔇 MODO SILENCIOSO: Só mostrar logs detalhados em casos específicos
        const shouldShowDetailedLogs = forceDetailedLogs ||
            this.serverStatus !== 'online' ||
            this.isReconnecting;

        // 🔍 DETECÇÃO: Se Commission Tracker está ativo, usar timeout maior
        const isCommissionActive = document.getElementById('commission-display');
        const timeoutMs = isCommissionActive ? 8000 : 5000;

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

            const response = await fetch('/api', {
                method: 'GET',
                signal: controller.signal,
                cache: 'no-cache'
            });

            clearTimeout(timeoutId);
            const responseTime = Date.now() - startTime;

            if (response.ok) {
                const data = await response.json();
                const isOk = data.status === 'ok';
                return isOk;
            } else if (response.status === 429) {
                // 🛡️ PROTEÇÃO: 429 (Too Many Requests) não significa que o servidor caiu
                // Se o servidor respondeu 429, ele está ONLINE e funcional, apenas pedindo calma.
                console.warn(`⚠️ [SERVER CHECK] Rate Limit atingido (429). Mantendo status Online.`);
                return true;
            } else {
                // ❌ SEMPRE logar erros HTTP
                console.warn(`❌ [SERVER CHECK] Resposta não OK: ${response.status} ${response.statusText}`);
                errorDetails = `HTTP ${response.status}: ${response.statusText}`;
            }

            return false;
        } catch (error) {
            const responseTime = Date.now() - startTime;


            // Análise detalhada do tipo de erro
            if (error.name === 'AbortError') {

                errorDetails = 'Timeout (5s)';
            } else if (error.message.includes('fetch')) {

                errorDetails = 'Network Error';
            } else if (error.message.includes('Failed to fetch')) {

                errorDetails = 'Connection Lost';
            } else {

                errorDetails = error.message;
            }


            return false;
        }
    }

    // ✅ Servidor voltou online
    onServerOnline() {
        const timeSinceOffline = Date.now() - (this.offlineTimestamp || Date.now());

        // 🔧 CORREÇÃO: Só mostrar logs de reconexão se houve desconexão real
        const wasActuallyOffline = this.offlineTimestamp && this.serverStatus === 'offline';

        if (wasActuallyOffline) {

            // Log de restauração

            this.restoreApplicationFunctionality();


        }

        this.serverStatus = 'online';
        this.updateStatusIndicator('online', 'Online');
        this.hideReconnectionOverlay();

        // 🔧 NOVO: Limpar modais de troca de conta órfãos ao reconectar
        this.clearOrphanedAccountSwitchModals();

        // 🔧 NOVO: Disparar evento para notificar outros sistemas
        window.dispatchEvent(new CustomEvent('serverOnline', {
            detail: {
                timeSinceOffline: timeSinceOffline,
                reconnectAttempts: this.reconnectAttempts
            }
        }));

        // Resetar contador de tentativas
        this.reconnectDelay = 2000;
        this.offlineTimestamp = null;
    }

    // 🔧 NOVO: Limpar modais órfãos de troca de conta
    clearOrphanedAccountSwitchModals() {
        try {
            // Verificar se AppManager está processando mudança de conta
            const isAccountSwitching = window.accountSwitchInProgress;

            if (!isAccountSwitching) {
                // Se não há mudança de conta em andamento, remover modais órfãos
                const orphanedModals = [
                    document.getElementById('account-switch-overlay'),
                    document.getElementById('account-switch-error')
                ];

                orphanedModals.forEach(modal => {
                    if (modal) {
                        console.log('🧹 [RECONNECTION] Removendo modal órfão de troca de conta');
                        modal.remove();
                    }
                });
            } else {
                // Se há mudança em andamento, verificar se não está travada
                const switchStartTime = window.accountSwitchStartTime;
                if (switchStartTime && Date.now() - switchStartTime > 30000) { // 30 segundos
                    console.warn('⚠️ [RECONNECTION] Mudança de conta travada há mais de 30s, forçando limpeza');

                    // Forçar limpeza de mudança travada
                    window.accountSwitchInProgress = false;
                    window.accountSwitchStartTime = null;

                    // Remover modais
                    const stuckModals = [
                        document.getElementById('account-switch-overlay'),
                        document.getElementById('account-switch-error')
                    ];

                    stuckModals.forEach(modal => {
                        if (modal) {
                            modal.remove();
                        }
                    });

                    // Notificar AppManager que a mudança foi cancelada
                    if (window.AppManager && typeof window.AppManager.hideAccountSwitchLoading === 'function') {
                        window.AppManager.hideAccountSwitchLoading(false);
                    }
                }
            }
        } catch (error) {
            console.error('❌ [RECONNECTION] Erro ao limpar modais órfãos:', error);
        }
    }

    // ❌ Servidor ficou offline
    onServerOffline() {
        this.offlineTimestamp = Date.now();
        const timeSinceLastPing = Date.now() - this.lastSuccessfulPing;

        this.serverStatus = 'offline';
        this.updateStatusIndicator('offline', 'Offline');

        // ✅ RESETAR flag de restauração quando servidor fica offline
        this.restorationInProgress = false;

        if (!this.isReconnecting) {

            this.startReconnectionProcess();
        } else {
            console.warn('⚠️ [RECONNECTION] Processo de reconexão já em andamento');
        }
    }

    // 🔄 Iniciar processo de reconexão
    startReconnectionProcess() {
        if (this.isReconnecting) return;

        this.isReconnecting = true;
        this.reconnectAttempts = 0;


        this.updateStatusIndicator('reconnecting', 'Reconectando...');
        this.showReconnectionOverlay();

        this.attemptReconnection();
    }

    // 🔄 Tentar reconectar


    // ✅ NOVO: Sistema de alertas de saúde do sistema
    addSystemHealthWarning(warning) {
        const timestamp = Date.now();
        this.systemHealthWarnings.push({ warning, timestamp });

        // Manter apenas últimos 10 warnings
        if (this.systemHealthWarnings.length > 10) {
            this.systemHealthWarnings.shift();
        }

        // Disparar evento para notificar componentes
        window.dispatchEvent(new CustomEvent('systemHealthWarning', {
            detail: { warning, timestamp, totalWarnings: this.systemHealthWarnings.length }
        }));
    }

    // ✅ NOVO: Verificar saúde geral do sistema
    getSystemHealthStatus() {
        const now = Date.now();
        const recentWarnings = this.systemHealthWarnings.filter(w => now - w.timestamp < 300000); // 5 min

        if (recentWarnings.length >= 5) {
            return { status: 'critical', warnings: recentWarnings };
        } else if (recentWarnings.length >= 2) {
            return { status: 'warning', warnings: recentErrors };
        } else {
            return { status: 'healthy', warnings: [] };
        }
    }

    async attemptReconnection() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('❌ [RECONNECTION] Máximo de tentativas atingido');
            this.onMaxAttemptsReached();
            return;
        }

        this.reconnectAttempts++;


        this.updateReconnectionStatus(
            `Tentativa ${this.reconnectAttempts}/${this.maxReconnectAttempts}`,
            `Próxima tentativa em ${this.reconnectDelay / 1000}s...`
        );

        const isOnline = await this.checkServerStatus();

        if (isOnline) {

            this.isReconnecting = false;
            this.onServerOnline();
            return;
        }

        // Incrementar delay exponencialmente
        this.reconnectDelay = Math.min(this.reconnectDelay * 1.5, this.maxReconnectDelay);

        // Próxima tentativa
        setTimeout(() => {
            if (this.isReconnecting) {
                this.attemptReconnection();
            }
        }, this.reconnectDelay);
    }

    // ❌ Máximo de tentativas atingido
    onMaxAttemptsReached() {
        this.isReconnecting = false;

        this.updateReconnectionStatus(
            'Não foi possível reconectar',
            'O servidor pode estar passando por manutenção'
        );

        // Adicionar botão de reload manual
        const overlay = this.reconnectionOverlay;
        if (overlay) {
            const modal = overlay.querySelector('.reconnection-modal');
            const reloadBtn = document.createElement('button');
            reloadBtn.textContent = 'Recarregar Página';
            reloadBtn.style.cssText = `
                background: #007bff;
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 5px;
                cursor: pointer;
                margin-top: 15px;
                font-weight: bold;
            `;
            reloadBtn.onclick = () => window.location.reload();

            modal.appendChild(reloadBtn);
        }
    }

    // 🎨 Atualizar indicador de status
    updateStatusIndicator(status, text) {
        if (!this.statusIndicator) return;

        this.statusIndicator.className = `server-status-indicator ${status}`;
        this.statusIndicator.querySelector('.status-text').textContent = text;
    }

    // 🎨 Mostrar overlay de reconexão
    showReconnectionOverlay() {
        if (this.reconnectionOverlay) {
            this.reconnectionOverlay.remove();
        }

        const overlay = document.createElement('div');
        overlay.className = 'reconnection-overlay';
        overlay.innerHTML = `
            <div class="reconnection-modal">
                <div class="reconnection-spinner"></div>
                <h3>🔄 Reconectando...</h3>
                <div class="reconnection-status" id="reconnection-status">
                    Detectamos que o servidor foi reiniciado
                </div>
                <div class="reconnection-attempts" id="reconnection-attempts">
                    Aguarde enquanto restabelecemos a conexão...
                </div>
            </div>
        `;

        document.body.appendChild(overlay);
        this.reconnectionOverlay = overlay;

        setTimeout(() => overlay.classList.add('show'), 100);
    }

    // 🎨 Esconder overlay de reconexão
    hideReconnectionOverlay() {
        if (!this.reconnectionOverlay) return;

        this.reconnectionOverlay.classList.remove('show');

        setTimeout(() => {
            if (this.reconnectionOverlay) {
                this.reconnectionOverlay.remove();
                this.reconnectionOverlay = null;
            }
        }, 300);
    }

    // 🎨 Atualizar status da reconexão
    updateReconnectionStatus(status, attempts) {
        const statusEl = document.getElementById('reconnection-status');
        const attemptsEl = document.getElementById('reconnection-attempts');

        if (statusEl) statusEl.textContent = status;
        if (attemptsEl) attemptsEl.textContent = attempts;
    }

    // 🔧 Restaurar funcionalidades da aplicação
    restoreApplicationFunctionality() {
        // 🔧 CORREÇÃO: Só restaurar se houve desconexão real
        const wasActuallyOffline = this.offlineTimestamp && this.serverStatus === 'offline';

        if (!wasActuallyOffline) {

            return;
        }

        try {
            // 1. Reativar atualizações de saldo COM RATE LIMITING RIGOROSO
            // ✅ PROTEÇÃO: Evitar múltiplas chamadas simultâneas
            if (typeof FooterManager !== 'undefined' && FooterManager.resumeBalanceUpdates) {
                const appManagerReady = !!(window.AppManager?.apiInstance);

                // ✅ VERIFICAR se já há uma restauração em andamento
                if (this.restorationInProgress) {

                    return;
                }

                this.restorationInProgress = true;

                if (appManagerReady) {
                    // ✅ DELAY MAIOR: 15 segundos para respeitar rate limit da Deriv
                    setTimeout(() => {
                        if (!this.restorationInProgress) return; // Verificar se ainda é válido


                        FooterManager.resumeBalanceUpdates();
                        this.restorationInProgress = false;
                    }, 15000);
                } else {
                    // ✅ DELAY AINDA MAIOR para AppManager não pronto: 30 segundos
                    setTimeout(() => {
                        if (!this.restorationInProgress) return; // Verificar se ainda é válido

                        if (window.AppManager?.apiInstance && typeof FooterManager.resumeBalanceUpdates === 'function') {

                            FooterManager.resumeBalanceUpdates();
                        }
                        this.restorationInProgress = false;
                    }, 30000);
                }
            }

            // 2. Reconectar market data se necessário E limpar duplicatas
            if (window.displayViewInstance?.marketData) {
                const marketData = window.displayViewInstance.marketData;
                if (!marketData.isReady()) {

                    // ✅ NOVO: Limpar callbacks duplicados antes de reconectar
                    if (marketData.tickCallbacks && marketData.tickCallbacks.size > 0) {

                        marketData.tickCallbacks.clear();
                    }

                    marketData.connect().catch(console.error);
                } else {

                    // ✅ NOVO: Mesmo se estiver pronto, limpar possíveis duplicatas
                    if (marketData.tickCallbacks) {
                        for (const [symbol, callbacks] of marketData.tickCallbacks.entries()) {
                            if (callbacks && callbacks.size > 1) {

                                // Manter apenas o primeiro callback (mais recente)
                                const firstCallback = Array.from(callbacks)[0];
                                callbacks.clear();
                                callbacks.add(firstCallback);
                            }
                        }
                    }
                }
            }

            // 3. Reativar monitoramento se estava ativo
            const monitoringStrategy = localStorage.getItem('monitoring_strategy');
            if (monitoringStrategy && window.monitoringViewInstance) {

                // Se estava monitorando antes da desconexão, garantir continuidade
                if (MonitoringView.state === 'MONITORING' ||
                    MonitoringView.state === 'COOLDOWN_PROTECTED' ||
                    MonitoringView.state === 'COOLDOWN') {
                    setTimeout(() => {
                        MonitoringView.recoverFromDisconnection();
                    }, 2000); // Aguardar estabilização da conexão
                }
            }

            // Sincronizar VIP status
            if (typeof VipBackendSync !== 'undefined' && VipBackendSync.syncUserVipStatus) {
                const currentUser = SessionManager.getActiveUser();
                if (currentUser && currentUser.loginid) {
                    VipBackendSync.syncUserVipStatus(currentUser.loginid);

                }
            }



        } catch (error) {
            console.error('❌ [RECONNECTION] Erro ao restaurar funcionalidades:', error);
        }
    }

    // 🎨 Mostrar detalhes da conexão
    showConnectionDetails() {
        const timeSinceLastPing = Math.floor((Date.now() - this.lastSuccessfulPing) / 1000);
        const details = `
Status: ${this.serverStatus}
Última verificação: ${timeSinceLastPing}s atrás
Tentativas de reconexão: ${this.reconnectAttempts}
        `.trim();

        alert(`Detalhes da Conexão:\n\n${details}`);
    }

    // 📡 Configurar listeners de eventos
    setupEventListeners() {
        // Detectar quando a aba fica visível novamente
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && this.serverStatus === 'offline') {

                this.checkServerStatus().then(isOnline => {
                    if (isOnline && this.serverStatus !== 'online') {
                        this.onServerOnline();
                    }
                });
            }
        });

        // Detectar mudanças na conectividade da internet
        window.addEventListener('online', () => {

            if (this.serverStatus === 'offline') {
                this.checkServerStatus().then(isOnline => {
                    if (isOnline) {
                        this.onServerOnline();
                    }
                });
            }
        });

        window.addEventListener('offline', () => {

            this.updateStatusIndicator('offline', 'Sem Internet');
        });
    }

    //  cleanup recursos
    destroy() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
        }

        if (this.reconnectInterval) {
            clearInterval(this.reconnectInterval);
        }

        if (this.statusIndicator) {
            this.statusIndicator.remove();
        }

        if (this.reconnectionOverlay) {
            this.reconnectionOverlay.remove();
        }


    }
}

// Instância global do sistema de reconexão
let frontendReconnectionManager = null;

// Função para inicializar o sistema
function initFrontendReconnection() {
    if (!frontendReconnectionManager) {
        frontendReconnectionManager = new FrontendReconnectionManager();
    }
    return frontendReconnectionManager;
}

// Função para finalizar o sistema
function destroyFrontendReconnection() {
    if (frontendReconnectionManager) {
        frontendReconnectionManager.destroy();
        frontendReconnectionManager = null;
    }
}

// ✅ CORREÇÃO: Função para obter a instância atual
function getFrontendReconnectionInstance() {
    return frontendReconnectionManager;
}

// Tornar disponível globalmente
window.FrontendReconnectionManager = FrontendReconnectionManager;
window.initFrontendReconnection = initFrontendReconnection;
window.destroyFrontendReconnection = destroyFrontendReconnection;
window.getFrontendReconnectionInstance = getFrontendReconnectionInstance;

// Extensões para FooterManager (se existir)
if (typeof FooterManager !== 'undefined') {
    FooterManager.pauseBalanceUpdates = function () {
        if (this.balanceUpdateInterval) {
            clearInterval(this.balanceUpdateInterval);

        }
    };

    FooterManager.resumeBalanceUpdates = function () {
        this.initBalanceAutoUpdate();

    };
}