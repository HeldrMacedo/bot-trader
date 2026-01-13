/**
 * Sistema de Monitoramento de Usuários Online
 * Rastreia usuários ativos em tempo real usando Replit Database
 */

class OnlineUsersMonitor {
    constructor() {
        this.localOnlineUsers = new Set(); // Cache local de usuários online
        this.heartbeatInterval = null;
        this.syncInterval = null;
        this.currentUserId = null;
        this.isInitialized = false;
        this.disabled = false; // 🔇 Flag para desabilitar quando backend indisponível

        // Configurações
        this.HEARTBEAT_FREQUENCY = 30000; // 30 segundos - enviar heartbeat
        this.SYNC_FREQUENCY = 60000; // 60 segundos - sincronizar com servidor
    }

    // 🚀 Inicializar monitor
    async init() {
        if (this.isInitialized) return;

        try {
            // Obter ID do usuário atual
            const currentUser = SessionManager.getCurrentUser();
            this.currentUserId = currentUser?.authorize?.loginid;

            if (!this.currentUserId) {
             
                return;
            }

         
            // Registrar usuário como online
            await this.handleUserLogin(this.currentUserId);

            // Iniciar heartbeat
            this.startHeartbeat();

            // Sincronizar lista periodicamente
            this.startSync();

            // Listener para logout
            this.setupLogoutListener();

            this.isInitialized = true;

        } catch (error) {
          
        }
    }

    // 💓 Enviar heartbeat para servidor
    async sendHeartbeat() {
        if (!this.currentUserId || this.disabled) return;

        try {
            const response = await fetch('/api/online-users/heartbeat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: this.currentUserId,
                    timestamp: Date.now()
                })
            });

            // Se 503, desabilitar monitor para não spammar
            if (response.status === 503) {
                this.handleServiceUnavailable();
            }
        } catch (error) {
            // Silenciar erro de rede
        }
    }
    
    // 🔇 Desabilitar monitor quando serviço indisponível
    handleServiceUnavailable() {
        if (!this.disabled) {
            console.warn('⚠️ [ONLINE USERS] Serviço indisponível. Monitor desabilitado.');
            this.disabled = true;
            this.stopHeartbeat();
            this.stopSync();
        }
    }
    
    stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }
    
    stopSync() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }
    }

    // 🔄 Sincronizar lista de usuários online
    async syncOnlineUsers() {
        if (this.disabled) return;
        
        try {
            const response = await fetch('/api/online-users');
            
            if (response.status === 503) {
                this.handleServiceUnavailable();
                return;
            }
            
            if (!response.ok) {
                return; // Silenciar outros erros
            }

            const data = await response.json();

            if (data.success && Array.isArray(data.users)) {
                this.localOnlineUsers = new Set(data.users);
            }

        } catch (error) {
            // Silenciar erro de rede
        }
    }

    // ⏰ Iniciar heartbeat periódico
    startHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
        }

        // Enviar heartbeat imediatamente
        this.sendHeartbeat();

        // Continuar enviando periodicamente
        this.heartbeatInterval = setInterval(() => {
            this.sendHeartbeat();
        }, this.HEARTBEAT_FREQUENCY);

     
    }

    // 🔄 Iniciar sincronização periódica
    startSync() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
        }

        // Sincronizar imediatamente
        this.syncOnlineUsers();

        // Continuar sincronizando periodicamente
        this.syncInterval = setInterval(() => {
            this.syncOnlineUsers();
        }, this.SYNC_FREQUENCY);

    }

    // 👋 Registrar entrada de usuário
    async handleUserLogin(userId) {
        if (!userId || this.disabled) return;

        try {
            this.currentUserId = userId;

            const response = await fetch('/api/online-users/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: userId,
                    timestamp: Date.now()
                })
            });

            if (response.status === 503) {
                this.handleServiceUnavailable();
                return;
            }

            if (response.ok) {
                this.localOnlineUsers.add(userId);
                             
                if (!this.heartbeatInterval) {
                    this.startHeartbeat();
                }
                if (!this.syncInterval) {
                    this.startSync();
                }
            }

        } catch (error) {
            // Silenciar erro de rede
        }
    }

    // 👋 Registrar saída de usuário
    async handleUserLogout(userId) {
        if (!userId) return;

        try {
            const response = await fetch('/api/online-users/logout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: userId,
                    timestamp: Date.now()
                })
            });

            if (response.ok) {
                this.localOnlineUsers.delete(userId);
              
            }

            // Parar heartbeat se este for o usuário atual
            if (userId === this.currentUserId) {
                this.stopMonitoring();
            }

        } catch (error) {
           
        }
    }

    // 🛑 Parar monitoramento
    stopMonitoring() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }
        this.isInitialized = false;
       
    }

    // 👂 Configurar listener para logout
    setupLogoutListener() {
        window.addEventListener('beforeunload', () => {
            if (this.currentUserId) {
                // Usar sendBeacon para garantir que a requisição seja enviada antes do unload
                const blob = new Blob([JSON.stringify({
                    userId: this.currentUserId,
                    timestamp: Date.now()
                })], { type: 'application/json' });
                
                navigator.sendBeacon('/api/online-users/logout', blob);
            }
        });
    }

    // 📊 Obter contagem local de usuários online
    getLocalCount() {
        return this.localOnlineUsers.size;
    }

    // 📊 Obter lista local de usuários online
    getLocalUsers() {
        return Array.from(this.localOnlineUsers);
    }
}

// 🌍 Criar instância global
if (typeof window !== 'undefined') {
    window.onlineUsersMonitor = new OnlineUsersMonitor();

    // Auto-inicializar após login
    window.addEventListener('userLogin', () => {
        setTimeout(() => {
            if (window.onlineUsersMonitor && !window.onlineUsersMonitor.isInitialized) {
                window.onlineUsersMonitor.init();
            }
        }, 2000); // Delay de 2s para garantir que tudo está pronto
    });

}
