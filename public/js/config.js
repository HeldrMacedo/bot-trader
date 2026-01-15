
// Configurações da aplicação
// OBRIGATÓRIO USAR 100% SISTEMA ISOLADO POR USUÁRIO
const CONFIG = {
    APP_ID: 67957,
    WS_URL: 'wss://ws.derivws.com/websockets/v3',
    OAUTH_BASE_URL: 'https://oauth.deriv.com/oauth2/authorize',
    SCOPE: 'trading,admin',  // Adicionar 'admin' para permitir api_token

    // Configurações do Sistema
    SYSTEM: {
        UI_TRANSITION_DELAY: 800,
        ACCOUNT_SWITCH_TIMEOUT: 45000,
        LOADING_MIN_TIME: 1500,
        TOAST_DURATION: 3000
    },

    // Configurações da API
    API: {
        CONNECT_TIMEOUT: 10000,
        MAX_RETRIES: 8,
        RETRY_DELAY_INITIAL: 1000,
        RETRY_DELAY_MAX: 10000,
        PING_INTERVAL: 30000,
        PONG_TIMEOUT: 15000,
        INACTIVITY_CHECK_INTERVAL: 60000,
        PRICE_BUFFER_SIZE: 300,
        HISTORY_COUNT_DEFAULT: 300
    },

    // Configurações de Armazenamento
    STORAGE: {
        QUOTA_WARNING_THRESHOLD: 4500000, // ~4.5MB
        MAX_HISTORY_ITEMS: 50,
        CACHE_EXPIRY: 3600000 // 1 hora
    }
};

// Função para normalizar o domínio (remove subdomínios como 'app', mantém 'www')
function getNormalizedDomain() {
    const hostname = window.location.hostname;

    // ✅ CORREÇÃO CRÍTICA: Detectar se estamos no deployment ou workspace
    const isDeployment = hostname === 'n8f3fxvr-3004.brs.devtunnels.ms/' ||
        hostname === 'n8f3fxvr-3004.brs.devtunnels.ms/' ||
        hostname.endsWith('.replit.app');

    const isWorkspace = hostname.includes('.replit.dev') ||
        hostname.includes('localhost');

    // 🎯 DEPLOYMENT: Usar sempre www.strategyfree.com para OAuth
    if (isDeployment) {
        // Se já está no domínio correto
        if (hostname === 'n8f3fxvr-3004.brs.devtunnels.ms/') {
            return window.location.origin;
        }
        // Se está em strategyfree.com ou .replit.app, redirecionar para www
        return 'https://n8f3fxvr-3004.brs.devtunnels.ms/';
    }

    // 🔧 WORKSPACE: Usar URL do workspace para desenvolvimento
    if (isWorkspace) {
        return window.location.origin;
    }

    // 🛡️ FALLBACK: Para qualquer outro caso, usar www.strategyfree.com
    return 'https://n8f3fxvr-3004.brs.devtunnels.ms/';
}

// Função para obter a URL base correta (sempre retorna /app para OAuth)
function getBaseUrl() {
    const normalizedOrigin = getNormalizedDomain();
    const redirectUri = normalizedOrigin + '/app';

    return redirectUri;
}

// Gerar URL completa do OAuth
function getOAuthURL() {
    const redirectUri = encodeURIComponent(getBaseUrl());
    return `${CONFIG.OAUTH_BASE_URL}?app_id=${CONFIG.APP_ID}&scope=${CONFIG.SCOPE}&redirect_uri=${redirectUri}`;
}
