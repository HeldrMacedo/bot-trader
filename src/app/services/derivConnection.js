class DerivConnection {
    constructor(isDemo = true, messageCallback = null) {
        this.connection = null;
        this.isDemo = isDemo;
        this.messageCallback = messageCallback;
        this.reqId = 1;
        this.pendingRequests = new Map();
        this.subscribes = new Map();
        this.pingInterval = null;
        this.manualClose = false;
        this.isAuthorized = false;
        this.authorizeToken = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000;
        
        // Bind methods to preserve context
        this.handleOpen = this.handleOpen.bind(this);
        this.handleMessage = this.handleMessage.bind(this);
        this.handleClose = this.handleClose.bind(this);
        this.handleError = this.handleError.bind(this);
    }


    async connect(token = null) {
        if (this.connection && this.connection.readyState === WebSocket.OPEN) {
            return Promise.resolve();
        }

        this.authorizeToken = token;
        this.manualClose = false;

        return new Promise((resolve, reject) => {
            try {
                this.connection = new WebSocket(
                    `wss://ws.derivws.com/websockets/v3?l=pt&app_id=${process.env.NEXT_PUBLIC_DERIV_CLIENT_ID}`
                );
                
                this.connection.addEventListener("open", () => {
                    this.handleOpen();
                    resolve();
                });
                this.connection.addEventListener("message", this.handleMessage);
                this.connection.addEventListener("close", this.handleClose);
                this.connection.addEventListener("error", (error) => {
                    this.handleError(error);
                    reject(error);
                });
            } catch (error) {
                reject(error);
            }
        });
    }

     handleOpen() {
        this.reconnectAttempts = 0;
        
        // Autorizar se token estiver disponível
        if (this.authorizeToken) {
            this.send({ authorize: this.authorizeToken });
        }

        // Reprocessar requests pendentes
        this.dispatchPendingRequests();
        
        // Resubscrever streams perdidos
        this.resubscribeAll();

        // Configurar ping para manter conexão viva
        this.setupPing();
    }

    handleMessage(event) {
        try {
            const data = JSON.parse(event.data);

            if (this.messageCallback && typeof this.messageCallback === 'function') {
                try {
                    this.messageCallback(data, this.isDemo);
                } catch (callbackError) {
                    console.error(`${this.isDemo ? 'Demo' : 'Real'} callback error:`, callbackError);
                }
            }

            
            // Tratar autorização
            if (data.msg_type === "authorize") {
                this.isAuthorized = !data.error;
                if (this.isAuthorized) {
                    this.dispatchPendingRequests();
                }
            }

            // Resolver promises pendentes
            if (data.req_id && this.pendingRequests.has(data.req_id)) {
                const { resolve, reject, timeout } = this.pendingRequests.get(data.req_id);
                this.pendingRequests.delete(data.req_id);
                clearTimeout(timeout);
                
                if (data.error) {
                    reject(data.error);
                } else {
                    resolve(data);
                }
            }

            // Gerenciar subscriptions
            if (data.msg_type === "forget" && data.forget) {
                this.subscribes.delete(data.forget);
            }

        } catch (error) {
            console.error(`${this.isDemo ? 'Demo' : 'Real'} error parsing message:`, error);
        }
    }

    handleClose(event) {
        this.cleanup();
        
        if (!this.manualClose && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnect();
        }
    }

    handleError(error) {
        console.error(`${this.isDemo ? 'Demo' : 'Real'} WebSocket error:`, error);
        if (!this.manualClose) {
            this.reconnect();
        }
    }

    send(payload) {
        return new Promise((resolve, reject) => {
            if (!this.connection || this.connection.readyState !== WebSocket.OPEN) {
                reject(new Error(`${this.isDemo ? 'Demo' : 'Real'} connection not ready`));
                return;
            }

            const reqId = this.reqId++;
            const messageWithId = { ...payload, req_id: reqId };
            // Configurar timeout para a request
            const timeout = setTimeout(() => {
                if (this.pendingRequests.has(reqId)) {
                    this.pendingRequests.delete(reqId);
                    reject(new Error('Request timeout'));
                }
            }, 10000);

            // Armazenar promise para resolução posterior
            this.pendingRequests.set(reqId, { resolve, reject, timeout });

            try {
                this.connection.send(JSON.stringify(messageWithId));
            } catch (error) {
                this.pendingRequests.delete(reqId);
                clearTimeout(timeout);
                reject(error);
            }
        });
    }

    async subscribe(payload) {
        try {
            const subscribePayload = { ...payload, subscribe: 1 };
            const response = await this.send(subscribePayload);
            
            if (response.subscription?.id) {
                this.subscribes.set(response.subscription.id, payload);
            }
            
            return response;
        } catch (error) {
            console.error(`${this.isDemo ? 'Demo' : 'Real'} subscription error:`, error);
            throw error;
        }
    }

    async authorize(token) {
        this.authorizeToken = token;
        try {
            const response = await this.send({ authorize: token });
            if (response.error) {
                throw new Error(response.error.message);
            }
            return response;
        } catch (error) {
            console.error(`${this.isDemo ? 'Demo' : 'Real'} authorization failed:`, error);
            throw error;
        }
    }

    async forget(subscriptionId) {
        try {
            const response = await this.send({ forget: subscriptionId });
            this.subscribes.delete(subscriptionId);
            return response;
        } catch (error) {
            console.error(`${this.isDemo ? 'Demo' : 'Real'} forget error:`, error);
            throw error;
        }
    }

    dispatchPendingRequests() {
        // Reenviar requests que estavam aguardando conexão/autorização
        this.pendingRequests.forEach(({ resolve, reject, timeout }, reqId) => {
            // Requests pendentes serão reenviadas automaticamente quando a conexão for restabelecida
        });
    }

    resubscribeAll() {
        // Resubscrever todos os streams ativos
        const subscriptionsToRestore = new Map(this.subscribes);
        this.subscribes.clear();
        
        subscriptionsToRestore.forEach(async (payload, oldId) => {
            try {
                await this.subscribe(payload);
            } catch (error) {
                console.error(`${this.isDemo ? 'Demo' : 'Real'} resubscription failed:`, error);
            }
        });
    }

    setupPing() {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
        }
        
        this.pingInterval = setInterval(() => {
            if (this.connection && this.connection.readyState === WebSocket.OPEN) {
                this.connection.send('{"ping": 1}');
            }
        }, 25000);
    }

    reconnect() {
        if (this.manualClose) return;
        
        this.reconnectAttempts++;
        const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1); // Exponential backoff
        
        
        setTimeout(() => {
            if (!this.manualClose) {
                this.connect(this.authorizeToken).catch(error => {
                    console.error(`${this.isDemo ? 'Demo' : 'Real'} reconnection failed:`, error);
                });
            }
        }, delay);
    }

    cleanup() {
        this.isAuthorized = false;
        
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }
        
        // Rejeitar todas as requests pendentes
        this.pendingRequests.forEach(({ reject, timeout }) => {
            clearTimeout(timeout);
            reject(new Error('Connection closed'));
        });
        this.pendingRequests.clear();
    }

    disconnect() {
        this.manualClose = true;
        
        // Cancelar todas as subscriptions
        const forgetPromises = Array.from(this.subscribes.keys()).map(id => 
            this.forget(id).catch(error => console.error('Forget error:', error))
        );
        
        Promise.all(forgetPromises).finally(() => {
            if (this.connection) {
                this.connection.close();
                this.connection = null;
            }
            this.cleanup();
        });
    }

    // Getters para verificar estado
    get isConnected() {
        return this.connection && this.connection.readyState === WebSocket.OPEN;
    }

    get isReady() {
        return this.isConnected && (!this.authorizeToken || this.isAuthorized);
    }

    get connectionState() {
        if (!this.connection) return 'disconnected';
        
        switch (this.connection.readyState) {
            case WebSocket.CONNECTING: return 'connecting';
            case WebSocket.OPEN: return 'connected';
            case WebSocket.CLOSING: return 'closing';
            case WebSocket.CLOSED: return 'closed';
            default: return 'unknown';
        }
    }

    setMessageCallback(callback) {
        this.messageCallback = callback;
    }

    // NOVO: Método para remover callback
    removeMessageCallback() {
        this.messageCallback = null;
    }
}

export default DerivConnection;