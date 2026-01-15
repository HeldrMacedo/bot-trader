// js/token-backend-client.js
// Cliente para comunicar com o backend de tokens de forma segura
// O SISTEMA DEVE SER 100% ISOLADO POR USUARIO

class TokenBackendClient {
    constructor() {
        this.baseUrl = window.location.origin;
    }

    // 🔐 Salvar token no backend
    async saveToken(sessionId, loginId, token) {
              
        try {
            const response = await fetch(`${this.baseUrl}/api/tokens`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    sessionId: sessionId,
                    loginId: loginId,
                    token: token
                })
            });
            
            const result = await response.json();
            if (result.success) {
             
                return true;
            } else {
                console.error(`❌ [TOKEN BACKEND] Erro ao salvar token:`, result.error);
                return false;
            }
        } catch (error) {
            console.error(`❌ [TOKEN BACKEND] Erro de comunicação:`, error);
            return false;
        }
    }

    // 🔍 Recuperar token específico do backend
    async getToken(sessionId, loginId) {
              
        try {
            const response = await fetch(`${this.baseUrl}/api/tokens/${sessionId}/${loginId}`);
            const result = await response.json();
            
            if (result.success) {
          
                return result.token;
            } else {
              
                return null;
            }
        } catch (error) {
            console.error(`❌ [TOKEN BACKEND] Erro ao buscar token:`, error);
            return null;
        }
    }

    // 📋 Listar todos os tokens de uma sessão
    async getSessionTokens(sessionId) {
             
        try {
            const response = await fetch(`${this.baseUrl}/api/tokens/${sessionId}`);
            const result = await response.json();
            
            if (result.success) {
             
                return result.tokens;
            } else {
             
                return {};
            }
        } catch (error) {
            console.error(`❌ [TOKEN BACKEND] Erro ao listar tokens:`, error);
            return {};
        }
    }

    // 🧹 Limpar todos os tokens de uma sessão
    async clearSession(sessionId) {
              
        try {
            const response = await fetch(`${this.baseUrl}/api/tokens/${sessionId}`, {
                method: 'DELETE'
            });
            
            const result = await response.json();
            if (result.success) {
              
                return true;
            } else {
                console.error(`❌ [TOKEN BACKEND] Erro ao limpar sessão:`, result.error);
                return false;
            }
        } catch (error) {
            console.error(`❌ [TOKEN BACKEND] Erro de comunicação:`, error);
            return false;
        }
    }

    // 📊 Obter estatísticas do sistema
    async getStats() {
        try {
            const response = await fetch(`${this.baseUrl}/api/tokens-stats`);
            const result = await response.json();
            
            if (result.success) {
             
                return result.stats;
            } else {
            
                return null;
            }
        } catch (error) {
            console.error(`❌ [TOKEN BACKEND] Erro ao buscar estatísticas:`, error);
            return null;
        }
    }

    // 🔄 Migrar tokens do localStorage para backend (função auxiliar)
    async migrateFromLocalStorage(sessionId) {
              
        const migrated = [];
        const failed = [];
        
        // Buscar todos os tokens no localStorage
        const allKeys = Object.keys(localStorage);
        const tokenKeys = allKeys.filter(key => key.startsWith('token_') && !key.includes('_timestamp') && !key.includes('_minted'));
        
        for (const key of tokenKeys) {
            const token = localStorage.getItem(key);
            if (token && token.length > 10) { // Validação básica
                // Extrair loginId da chave (formato: token_LOGINID ou token_LOGINID_SESSION)
                const loginId = key.replace('token_', '').split('_')[0];
                
                if (loginId) {
                    const success = await this.saveToken(sessionId, loginId, token);
                    if (success) {
                        migrated.push(loginId);
                    } else {
                        failed.push(loginId);
                    }
                }
            }
        }
             
              
        return { migrated, failed };
    }
}

// Instância global para uso em todo o sistema
const tokenBackend = new TokenBackendClient();

// 🔧 INTEGRAÇÃO: Adicionar à classe SessionManager
if (typeof SessionManager !== 'undefined') {
    // Método auxiliar para usar backend em vez de localStorage
    SessionManager.saveTokenToBackend = async function(loginId, token) {
        const sessionId = this.getUserSessionId();
        return await tokenBackend.saveToken(sessionId, loginId, token);
    };
    
    SessionManager.getTokenFromBackend = async function(loginId) {
        const sessionId = this.getUserSessionId();
        return await tokenBackend.getToken(sessionId, loginId);
    };
       
}