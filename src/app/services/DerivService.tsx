import { Observer } from './simpleObserver';

type DerivEventMap = {
    'open': void;
    'close': CloseEvent;
    'error': Event;
    'message': any;
    'deriv.authorize': any;
    'deriv.forget': any;
    'deriv.buy': any;
    'deriv.balance': any;
    'deriv.tick': any;
    'deriv.proposal_open_contract': any;
    'deriv.transaction': any;
    'account.update': AccountInfo;
    'auth.error': { code: string, message: string }
};

export interface TokenData {
    token: string;
    is_virtual: boolean;
    cur: string;
    acct: string;
    loginid: string;
    balance?: number;
}

interface PendingRequest {
    needAuthorize: boolean;
    cancelled: boolean;
    timeToCancel: NodeJS.Timeout | null;
    send: () => void;
}

export interface AccountInfo {
    activeToken: string;
    amount: number;
    barrier: number;
    volatility: string;
    finishedTradeList: any[];
    lastTrade: any | null;
    name: string;
    openTradeId: string | null;
    results: {
        loss: number;
        result: number;
        wins: number;
    };
    selectedLoginId: string;
    loginId: string;
    tokens: TokenData[];
}

interface UserInfo {
    balance: number;
    fullname: string;
    loginid: string;
    currency: string;
}

export class DerivService {
    private static instance: DerivService;
    private observer = new Observer<DerivEventMap>();
    private ws: WebSocket | null = null;
    private appId: "67957";
    private derivTokenScope = '';
    private reqId = 1;
    private isAuthorized = false;
    private authorizeToken: string | null = null;
    private pingInterval: NodeJS.Timeout | null = null;
    private manualClose = false;
    private pendingRequests: PendingRequest[] = [];
    private subscribes = new Map<string, any>();
    private pendingResubscribes = new Map<string, any>();
    private currentAccount: AccountInfo | null = null;

    private needAuthorize = [
        'get_settings', 'balance', 'balance_all',
        'paymentagent_details', 'paymentagent_transfer', 'paymentagent_withdraw',
        'transaction', 'statement', 'buy', 'profit_table',
        'portfolio', 'proposal_open_contract', 'sell_expired', 'sell'
    ];

    private constructor() {
        this.initialize();
        this.start();
    }

    public static getInstance(): DerivService {
        if (!DerivService.instance) {
            DerivService.instance = new DerivService();
        }
        return DerivService.instance;
    }

    private initialize() {
        if (window.location.search) {
            const tokens = this.parseQueryTokens(window.location.search.substring(1));
            if (tokens.length > 0) {
                localStorage.setItem(`${this.derivTokenScope}token_list`, JSON.stringify(tokens));
                window.location.search = '';
            }
        }
        
        this.observer.on('open', () => {        
            this.processAuthenticatedUserData();
        });
    }

    public async processAuthenticatedUserData() {
        await this.waitForConnection();

        const savedAccounts = this.getStorageDerivAccount();

        if (savedAccounts?.length > 0) {
            this.setAccountData(savedAccounts[0]);
            const response = await this.authenticate(this.currentAccount?.activeToken);
            this.updateBalaceOfAccountSelected(response);
            return;
        }

         // Criar nova conta se tokens existirem
         const tokens = this.getTokens();
         if (!tokens || tokens.length < 2) return;

         try {
            const [accountVRT, accountCRT] = this.getAccountTokens(tokens);
            
            const [userVRT, userCRT] = await Promise.all([
                this.authenticate(accountVRT.token),
                this.authenticate(accountCRT.token)
            ]);

            const newAccount = this.createAccountStructure(
                accountVRT,
                accountCRT,
                userVRT,
                userCRT
            );

            this.saveAccount(newAccount);
            this.setAccountData(newAccount);

        } catch (error) {
            this.handleAuthError(error);
        }
    }

    private updateBalaceOfAccountSelected(data: any){
        this.currentAccount.tokens.forEach(token => {
            if (data.loginid === token.acct) {
                token.balance = data.balance;
                this.observer.emit('account.update', this.currentAccount);
            }
        });
    }

    public setAccountData(data: AccountInfo) {
        this.currentAccount = data;
        this.observer.emit('account.update', data);
    }

    private handleAuthError(error: any) {
        console.error("Erro na autenticação:", error);
        this.observer.emit('auth.error', {
            code: "AUTH_FAILED",
            message: error.message
        });
    }

    private saveAccount(account: AccountInfo) {
        localStorage.setItem("deriv_accounts", JSON.stringify([account]));
    }

    private removeDerivAccount() {
        localStorage.removeItem("deriv_accounts");
    }

    private cleanAccountData() {
        this.currentAccount = null;
        this.observer.emit('account.update', null);
    }

    private createAccountStructure(
        vrt: TokenData,
        crt: TokenData,
        userVRT: UserInfo,
        userCRT: UserInfo
    ): AccountInfo {
        vrt.balance = userVRT.balance;
        crt.balance = userCRT.balance;

        return {
            activeToken: vrt.token,
            amount: 0.35,
            barrier: 3,
            volatility: "R_100",
            finishedTradeList: [],
            lastTrade: null,
            name: userVRT.fullname,
            openTradeId: null,
            results: { loss: 0, result: 0, wins: 0 },
            selectedLoginId: vrt.acct,
            loginId: vrt.loginid,
            tokens: [vrt, crt]
        };
    }

    private async authenticate(token: string): Promise<UserInfo> {
        const response = await this.send({ authorize: token });
        
        if (response.error) {
            throw new Error(response.error.message);
        }

        return {
            balance: response.authorize.balance,
            fullname: response.authorize.fullname,
            loginid: response.authorize.loginid,
            currency: response.authorize.currency
        };
    }

    public async authenticateSelected(token: string): Promise<any> {
        try {
          const response = await this.send({ authorize: token });
          
          if (response.error) {
            throw new Error(response.error.message);
          }
    
          // Atualiza saldo no token correspondente
          const currentAccounts = JSON.parse(localStorage.getItem('deriv_accounts') || '[]');
          const updatedAccounts = currentAccounts.map((account: any) => ({
            ...account,
            tokens: account.tokens.map((t: any) => 
              t.token === token ? { ...t, balance: response.authorize.balance } : t
            )
          }));
    
          localStorage.setItem('deriv_accounts', JSON.stringify(updatedAccounts));
          this.observer.emit('account.update', updatedAccounts[0]);
    
          return {
            balance: response.authorize.balance,
            currency: response.authorize.currency,
            loginid: response.authorize.loginid
          };
    
        } catch (error) {
          this.observer.emit('auth.error', error);
          throw error;
        }
      }

    private getAccountTokens(tokens: TokenData[]) {
        const accountVRT = tokens.find(t => t.is_virtual);
        const accountCRT = tokens.find(t => !t.is_virtual);
        
        if (!accountVRT || !accountCRT) {
            throw new Error("Tokens incompletos");
        }

        return [accountVRT, accountCRT];
    }

    private async waitForConnection() {
        return new Promise<void>((resolve) => {
            const check = () => {
                if (this.isConnected) resolve();
                else setTimeout(check, 100);
            };
            check();
        });
    }

    public getStorageDerivAccount(): AccountInfo[] | null {
        const data = localStorage.getItem("deriv_accounts");
        return data ? JSON.parse(data) : null;
    }

    public connect(): void {

        this.ws = new WebSocket(`wss://ws.derivws.com/websockets/v3?l=pt&app_id=67957`);
        
        this.ws.addEventListener('open', () => this.handleOpen());
        this.ws.addEventListener('message', (event) => this.handleMessage(event));
        this.ws.addEventListener('error', () => this.handleError());
        this.ws.addEventListener('close', (event) => this.handleClose(event));
    }

    private handleOpen() {
        this.observer.emit('open', undefined);
        if (this.authorizeToken) {
            this.send({ authorize: this.authorizeToken });
        }

        this.dispatchPendingRequests();
        this.dispatchPendingResubscribes();

        this.pingInterval = setInterval(() => {
            this.ws?.send('{ "ping": 1 }');
        }, 25000);
    }

    private handleMessage(event: MessageEvent) {
        try {
            const data = JSON.parse(event.data);
            
            if (data.msg_type === 'forget') {
                this.subscribes.delete(data.forget);
            } else if (data.msg_type === 'authorize') {
                this.isAuthorized = !data.error;
                if (this.isAuthorized) {
                    this.dispatchPendingResubscribes();
                    this.dispatchPendingRequests();
                }
            }

            this.observer.emit('message', data);
            
            if (data.msg_type) {
                this.observer.emit(`deriv.${data.msg_type}` as keyof DerivEventMap, data);
            }
        } catch (error) {
            console.error('Error parsing message:', error);
        }
    }

    private handleError() {
        this.reconnect();
    }

    private handleClose(event: CloseEvent) {
        this.observer.emit('close', event);
        this.cleanup();
        if (!this.manualClose) this.reconnect();
    }

    private cleanup() {
        this.subscribes.clear();
        this.isAuthorized = false;
        this.ws = null;
        
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
        }
    }

    public send<T = any>(payload: Record<string, any>): Promise<T> {
        return new Promise((resolve, reject) => {
            const reqId = this.reqId++;
            payload.req_id = reqId;
            const needAuthorize = this.checkNeedAuthorize(payload);
            const listenerId = this.observer.on('message', (data) => {
                if (data.req_id === reqId) {
                    this.observer.removeById(listenerId);
                    data.error ? reject(data.error) : resolve(data);
                }
            });
            
            if (this.isConnected && (!needAuthorize || this.isAuthorized)) {
                this.ws!.send(JSON.stringify({ ...payload, req_id: reqId }));
            } else {
                this.queueRequest(payload, reqId, needAuthorize, resolve, reject);
            }
        });
    }

    private queueRequest(
        payload: Record<string, any>,
        reqId: number,
        needAuthorize: boolean,
        resolve: (value: any) => void,
        reject: (reason?: any) => void
    ) {
        const timeToCancel = setTimeout(() => {
            reject({ code: 'Timeout', message: 'Request timed out' });
        }, 20000);

        const pendingRequest: PendingRequest = {
            needAuthorize,
            cancelled: false,
            timeToCancel,
            send: () => {
                if (!pendingRequest.cancelled) {
                    clearTimeout(timeToCancel);
                    this.ws!.send(JSON.stringify({ ...payload, req_id: reqId }));
                }
            }
        };

        this.pendingRequests.push(pendingRequest);
    }

    public subscribe(payload: Record<string, any>): Promise<any> {
        return this.send({ ...payload, subscribe: 1 }).then(response => {
            if (response.subscription?.id) {
                this.subscribes.set(response.subscription.id, payload);
            }
            return response;
        });
    }

    private checkNeedAuthorize(payload: Record<string, any>): boolean {
        return this.needAuthorize.some(key => payload.hasOwnProperty(key));
    }

    private dispatchPendingRequests() {
        const pending = [...this.pendingRequests];
        this.pendingRequests = [];

        pending.forEach(request => {
            if ((request.needAuthorize && this.isAuthorized) || !request.needAuthorize) {
                request.send();
            } else {
                this.pendingRequests.push(request);
            }
        });
    }

    private dispatchPendingResubscribes() {
        this.pendingResubscribes.forEach((payload, id) => {
            this.subscribe(payload).then(() => {
                this.pendingResubscribes.delete(id);
            });
        });
    }

    public reconnect() {
        this.subscribes.forEach((payload, id) => {
            this.pendingResubscribes.set(id, payload);
        });
        this.subscribes.clear();
        this.manualClose = true;
        this.ws?.close();
        setTimeout(() => this.connect(), 1000);
    }

    public destroy() {
        this.manualClose = true;
        this.ws?.close();
        this.cleanup();
        this.observer.clear();
    }

    // Métodos de gerenciamento de tokens
    public setToken(token: string): void {
        localStorage.setItem(`${this.derivTokenScope}active_token`, token);
        this.authorizeToken = token;
    }

    public getToken(): string | null {
        const activeToken = localStorage.getItem(`${this.derivTokenScope}active_token`);
        return activeToken || this.getVirtualToken()?.token || null;
    }

    private getVirtualToken(): TokenData | undefined {
        return this.getTokens().find(t => t.is_virtual);
    }

    public getTokens(): TokenData[] {
        return JSON.parse(localStorage.getItem(`${this.derivTokenScope}token_list`) || '[]');
    }

    private parseQueryTokens(search: string): TokenData[] {
        return Object.values(
            search
              .toString()
              .split("&")
              .reduce((obj, item) => {
                const testers = [
                  /(acct)(\d)\=(.+)/gi,
                  /(token)(\d)\=(.+)/gi,
                  /(cur)(\d)\=(.+)/gi,
                ];
                for (let i = 0; i < testers.length; i++) {
                  const testResult = testers[i].exec(item);
      
                  if (testResult) {
                    const name = testResult[1];
                    const index = testResult[2];
                    const value = testResult[3];
      
                    if (!obj[index]) {
                      obj[index] = {};
                    }
      
                    obj[index][name] = value;
      
                    if (name == "acct") {
                      obj[index].is_virtual = value.startsWith("VRTC");
                    }
                  }
                }
      
                return obj;
              }, {})
          );
    }

    public start() {
        this.connect();
    }

    public get isConnected(): boolean {
        return this.ws?.readyState === WebSocket.OPEN;
    }

    public get observerInstance(): Observer<DerivEventMap> {
        return this.observer;
    }

    public loginDeriv() {
        window.location.href = `https://oauth.deriv.com/oauth2/authorize?app_id=${this.appId}`;
    }

    public updateBarrier(value: number): void {
        if (!this.currentAccount) return;
        
        this.currentAccount.barrier = value;
        
        const accounts = this.getStorageDerivAccount() || [];
        if (accounts.length > 0) {
            accounts[0].barrier = value;
            this.saveAccount(this.currentAccount);
        }
        
        this.observer.emit('account.update', this.currentAccount);
    }

    public get currentBarrier(): number {
        this.currentAccount = this.getStorageDerivAccount()?.[0];
        return this.currentAccount?.barrier || 3; 
    }

    public updateVolatility(value: string): void {
        if (!this.currentAccount) return;

        this.currentAccount.volatility = value;

        const accounts = this.getStorageDerivAccount() || [];
        if (accounts.length > 0) {
            accounts[0].volatility = value;
            this.saveAccount(this.currentAccount);
        }

        this.observer.emit('account.update', this.currentAccount);
    }

    public get hasAuthorized(): boolean {
        return this.isAuthorized;
    }
}