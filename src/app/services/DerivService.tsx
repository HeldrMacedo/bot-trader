import { toast } from "react-toastify";
import { Observer } from "./simpleObserver";

type DerivEventMap = {
  open: void;
  close: CloseEvent;
  error: Event;
  message: any;
  "deriv.authorize": any;
  "deriv.forget": any;
  "deriv.buy": any;
  "deriv.balance": any;
  "deriv.tick": any;
  "deriv.proposal_open_contract": any;
  "deriv.transaction": any;
  "account.update": AccountInfo;
  "auth.error": { code: string; message: string };
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
  resolve?: (value: any) => void;
  reject?: (reason?: any) => void;
}

export interface AccountInfo {
  activeToken: string;
  amount: number;
  barrier: string;
  volatility: string;
  finishedTradeList: any[];
  lastTrade: any | null;
  name: string;
  openTradeId: string | null;
  digits: number;
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
  private appId = process.env.NEXT_PUBLIC_APPID;
  private derivTokenScope = "";
  private reqId = 1;
  private isAuthorized = false;
  private authorizeToken: string | null = null;
  private pingInterval: NodeJS.Timeout | null = null;
  private manualClose = false;
  private pendingRequests: PendingRequest[] = [];
  private subscribes = new Map<string, any>();
  private pendingResubscribes = new Map<string, any>();
  private currentAccount: AccountInfo | null = null;
  private balanceSubscriptionId: string | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  
  // Histórico de ticks em memória para acesso síncrono
  private tickHistory = new Map<string, { price: number; time: number }[]>();
  private symbolDecimals = new Map<string, number>();
  private readonly MAX_HISTORY_SIZE = 1000;

  private needAuthorize = [
    "get_settings",
    "balance",
    "balance_all",
    "paymentagent_details",
    "paymentagent_transfer",
    "paymentagent_withdraw",
    "transaction",
    "statement",
    "buy",
    "proposal",
    "profit_table",
    "portfolio",
    "proposal_open_contract",
    "sell_expired",
    "sell",
  ];

  private constructor() {
    this.initialize();
    this.start();
  }

  public static getInstance(): DerivService {
    if (!DerivService.instance) {
      DerivService.instance = new DerivService();
      if (typeof window !== 'undefined') {
        (window as any).DerivServiceInstance = DerivService.instance;
      }
    }
    return DerivService.instance;
  }

  private initialize() {
    if (typeof window === 'undefined') return;

    // Expor instância globalmente também no initialize caso já tenha sido criada
    (window as any).DerivServiceInstance = this;

    if (window.location.search) {
      const tokens = this.parseQueryTokens(window.location.search.substring(1));
      if (tokens.length > 0) {
        localStorage.setItem(
          `${this.derivTokenScope}token_list`,
          JSON.stringify(tokens)
        );
        window.location.search = "";
      }
    }

    this.observer.on("open", () => {
      this.processAuthenticatedUserData();
      this.setupBalanceMonitoring();
    });

    // Monitorar ticks para manter histórico
    this.observer.on("deriv.tick", (data) => {
      if (data.tick) {
        const { symbol, quote: price, epoch: time } = data.tick;
        this.updateTickHistory(symbol, price, time);
      }
    });

    this.observer.on("deriv.balance", (data) => {
  if (this.currentAccount) {
    this.currentAccount.tokens.forEach((token) => {
      if (data.balance?.accounts) {
        Object.keys(data.balance.accounts).forEach(accounts => {
          let isDemo = Boolean(data.balance.accounts[accounts].demo_account);
          if (token.is_virtual === isDemo) {              
            token.balance = data.balance.accounts[accounts].balance;
              this.setAccountData(this.currentAccount);
          }
        });
      } else {
        // Verificar se loginid existe antes de acessar
        if (data.balance?.loginid && token.acct == data.balance.loginid) {
          token.balance = data.balance.balance;
          this.setAccountData(this.currentAccount);
        }
      }
      
    });
    this.saveAccount(this.currentAccount);
  }
});
  }

  private setupBalanceMonitoring() {
    if (this.balanceSubscriptionId) {
    return;
  }
  
  this.subscribe({ balance: 1, account: "all" })
    .then((subscription) => {
      this.balanceSubscriptionId = subscription.subscription.id;
    })
    .catch((error) => {
      if (error.code === 'AlreadySubscribed') {

      } else {
        7
      }
    });
    // setInterval(async () => {
    //   if (this.currentAccount) {
    //     await Promise.all(
    //       this.currentAccount.tokens.map(async (token) => {
    //         this.send({
    //           balance: 1,
    //           account: token.acct,
    //         });
            
    //       })
    //     );
    //   }
    // }, 30000);
  }

  public async processAuthenticatedUserData() {
    await this.waitForConnection();

    const savedAccounts = this.getStorageDerivAccount();

    if (savedAccounts?.length > 0) {
      this.setAccountData(savedAccounts[0]);
      const response = await this.authenticate(
        this.currentAccount?.activeToken
      );
      this.updateBalaceOfAccountSelected(response);
      return;
    }

    const tokens = this.getTokens();
    if (!tokens || tokens.length == 0) return;
    
    try {
      let accountVRT, accountCRT, userVRT, userCRT;
      
      accountVRT = tokens.find(t => t.is_virtual);
      accountCRT = tokens.find(t => !t.is_virtual);
      
      const authPromises = [];
      if (accountCRT) authPromises.push(this.authenticate(accountCRT.token));
      if (accountVRT) authPromises.push(this.authenticate(accountVRT.token));
      
      
      const authResults = await Promise.all(authPromises);
      
      // Atribuir resultados da autenticação
      if (accountCRT) userCRT = authResults.shift();
      if (accountVRT) userVRT = authResults.shift();
      
      
      // Criar estrutura de conta com os tokens disponíveis
      const newAccount = this.createAccountStructureDynamic(
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

  private updateBalaceOfAccountSelected(data: any) {
    this.currentAccount.tokens.forEach((token) => {
      if (data.loginid === token.acct) {
        token.balance = data.balance;
        this.observer.emit("account.update", this.currentAccount);
      }
    });
  }

  public setAccountData(data: AccountInfo) {
    this.currentAccount = data;
    this.observer.emit("account.update", data);
  }

  private handleAuthError(error: any) {
    console.error("Erro na autenticação:", error);
    this.observer.emit("auth.error", {
      code: "AUTH_FAILED",
      message: error.message,
    });
  }

  public saveAccount(account: AccountInfo) {
    localStorage.setItem("deriv_accounts", JSON.stringify([account]));
  }

  private removeDerivAccount() {
    localStorage.removeItem("deriv_accounts");
  }

  private cleanAccountData() {
    this.currentAccount = null;
    this.observer.emit("account.update", null);
  }

  private createAccountStructureDynamic(
    vrt?: TokenData,
    crt?: TokenData,
    userVRT?: UserInfo,
    userCRT?: UserInfo
  ): AccountInfo {

    const activeToken = vrt?.token || crt?.token;

    const userInfo = userVRT || userCRT;
    
    if (vrt && userVRT) vrt.balance = userVRT.balance;
    if (crt && userCRT) crt.balance = userCRT.balance;
    
    const tokens = [];
    if (vrt) tokens.push(vrt);
    if (crt) tokens.push(crt);
    
    return {
      activeToken: activeToken,
      amount: 0.35,
      barrier: "",
      digits: 3,
      volatility: "R_100",
      finishedTradeList: [],
      lastTrade: null,
      name: userInfo.fullname,
      openTradeId: null,
      results: { loss: 0, result: 0, wins: 0 },
      selectedLoginId: (vrt?.acct || crt?.acct),
      loginId: (vrt?.loginid || crt?.loginid),
      tokens: tokens,
    };
  }

  public async authenticate(token: string): Promise<UserInfo> {
    const response = await this.send({ authorize: token });

    if (response.error) {
      throw new Error(response.error.message);
    }

    return {
      balance: response.authorize.balance,
      fullname: response.authorize.fullname,
      loginid: response.authorize.loginid,
      currency: response.authorize.currency,
    };
  }

  public getTokenDemo() {
    return this.currentAccount?.tokens.find(t => t.is_virtual)?.token;
  }

  private getAccountTokens(tokens: TokenData[]) {
    const accountVRT = tokens.find((t) => t.is_virtual);
    const accountCRT = tokens.find((t) => !t.is_virtual);

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
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    this.manualClose = false;

    if (
      this.ws &&
      (this.ws.readyState === WebSocket.OPEN ||
        this.ws.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    const ws = new WebSocket(
      `wss://ws.derivws.com/websockets/v3?l=pt&app_id=${process.env.NEXT_PUBLIC_APPID}`
    );

    this.ws = ws;

    ws.addEventListener("open", () => this.handleOpen(ws));
    ws.addEventListener("message", (event) => this.handleMessage(ws, event));
    ws.addEventListener("error", (event) => this.handleError(ws, event));
    ws.addEventListener("close", (event) => this.handleClose(ws, event));
  }

  public handleOpen(ws: WebSocket) {
    if (this.ws !== ws || ws.readyState !== WebSocket.OPEN) {
      return;
    }

    this.observer.emit("open", undefined);

    if (this.authorizeToken) {
      this.send({ authorize: this.authorizeToken });
    }

    this.dispatchPendingRequests();
    this.dispatchPendingResubscribes();

    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }

    this.pingInterval = setInterval(() => {
      if (this.ws === ws && ws.readyState === WebSocket.OPEN) {
        ws.send('{ "ping": 1 }');
      }
    }, 25000);
  }

  public handleMessage(ws: WebSocket, event: MessageEvent) {
    if (this.ws !== ws) {
      return;
    }

    try {
      const data = JSON.parse(event.data);

      this.observer.emit("message", data);

      if (data.msg_type === "forget") {
        this.subscribes.delete(data.forget);
      } else if (data.msg_type === "authorize") {
        this.isAuthorized = !data.error;
        if (this.isAuthorized) {
          this.dispatchPendingResubscribes();
          this.dispatchPendingRequests();
        }
      }

      if (data.msg_type) {
        this.observer.emit(
          `deriv.${data.msg_type}` as keyof DerivEventMap,
          data
        );
      }
    } catch (error) {
      console.error("Error parsing message:", error);
    }
  }

  private handleError(ws: WebSocket, event: Event) {
    if (this.ws !== ws) {
      return;
    }

    this.observer.emit("error", event);

    if (!this.manualClose) {
      this.reconnect();
    }
  }

  private handleClose(ws: WebSocket, event: CloseEvent) {
    if (this.ws !== ws) {
      return;
    }

    this.observer.emit("close", event);
    this.cleanup();
    if (!this.manualClose) this.reconnect();
  }

  public disconnect(): void {
    this.manualClose = true;
    
    // Cancelar todas as subscriptions
    const forgetPromises = Array.from(this.subscribes.keys()).map(id => 
      this.send({ forget: id }).catch(error => console.error('Forget error:', error))
    );
    
    Promise.all(forgetPromises).finally(() => {
      if (this.ws) {
        this.ws.close();
        this.ws = null;
      }
      this.cleanup();
    });
  }
  
  public cleanup() {
  this.subscribes.clear();
  this.balanceSubscriptionId = null; // Reset para permitir nova subscription
  this.isAuthorized = false;
  this.ws = null;

  if (this.pingInterval) {
    clearInterval(this.pingInterval);
    this.pingInterval = null;
  }
  
  // Limpar requests pendentes
  this.pendingRequests.forEach(request => {
    if (request.timeToCancel) {
      clearTimeout(request.timeToCancel);
    }
    if (request.reject) {
      request.reject(new Error('Connection closed'));
    }
  });
  this.pendingRequests = [];
}

  public send<T = any>(payload: Record<string, any>): Promise<T> {
    return new Promise((resolve, reject) => {
      const reqId = this.reqId++;
      payload.req_id = reqId;
      const needAuthorize = this.checkNeedAuthorize(payload);

      const listenerId = this.observer.on("message", (data) => {

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

  public async handleDemoAccountChange() {
    const tokenDemo = this.getTokenDemo() || "";
    
    if (!tokenDemo) {
      throw new Error("Token demo não encontrado");
    }

    this.authorizeToken = tokenDemo;
    const authResponse = await this.send({ authorize: tokenDemo });

    const updatedAccount = {
      ...this.getStorageDerivAccount()[0],
      activeToken: tokenDemo,
      selectedLoginId: authResponse.authorize.loginid,

    } 
    
    localStorage.setItem("deriv_accounts", JSON.stringify([updatedAccount]));
    this.setAccountData(updatedAccount);
  }

  private queueRequest(
  payload: Record<string, any>,
  reqId: number,
  needAuthorize: boolean,
  resolve: (value: any) => void,
  reject: (reason?: any) => void
) {
  const timeToCancel = setTimeout(() => {
    // Remover da lista de pendentes
    const index = this.pendingRequests.findIndex(req => req.resolve === resolve);
    if (index > -1) {
      this.pendingRequests.splice(index, 1);
    }
    reject({ code: "Timeout", message: "Limite de tempo expirado, sem resposta da corretora" });
    toast.error("Limite de tempo expirado, sem resposta da corretora");
  }, 20000);

  const pendingRequest: PendingRequest = {
    needAuthorize,
    cancelled: false,
    timeToCancel,
    resolve,
    reject,
    send: () => {
      if (!pendingRequest.cancelled) {
        clearTimeout(timeToCancel);
        this.ws!.send(JSON.stringify({ ...payload, req_id: reqId }));
      }
    },
  };

  this.pendingRequests.push(pendingRequest);
}

  public subscribe(payload: Record<string, any>): Promise<any> {
    // Verificar se já existe uma subscription similar
    const existingSubscription = Array.from(this.subscribes.values())
      .find(sub => JSON.stringify(sub) === JSON.stringify(payload));
    
    if (existingSubscription) {
      return Promise.resolve({ subscription: { id: 'existing' } });
    }
    
    return this.send({ ...payload, subscribe: 1 })
      .then((response) => {  
        if (response.subscription?.id) {
          this.subscribes.set(response.subscription.id, payload);
        }
        return response;
      })
      .catch((error) => {
        if (error.code === 'AlreadySubscribed') {
          return { subscription: { id: 'server_existing' } };
        }
        throw error;
      });
  }

  private checkNeedAuthorize(payload: Record<string, any>): boolean {
    return this.needAuthorize.some((key) => payload.hasOwnProperty(key));
  }

  private dispatchPendingRequests() {
    const ws = this.ws;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      return;
    }

    const pending = [...this.pendingRequests];
    this.pendingRequests = [];

    pending.forEach((request) => {
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
    if (this.manualClose) {
      return;
    }

    if (this.reconnectTimeout) {
      return;
    }

    this.subscribes.forEach((payload, id) => {
      this.pendingResubscribes.set(id, payload);
    });
    this.subscribes.clear();

    this.manualClose = true;

    try {
      this.ws?.close();
    } catch {
    }

    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      this.connect();
    }, 1000);
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
    const activeToken = localStorage.getItem(
      `${this.derivTokenScope}active_token`
    );
    return activeToken || this.getVirtualToken()?.token || null;
  }

  private getVirtualToken(): TokenData | undefined {
    return this.getTokens().find((t) => t.is_virtual);
  }

  public getTokens(): TokenData[] {
    return JSON.parse(
      localStorage.getItem(`${this.derivTokenScope}token_list`) || "[]"
    );
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

  public updateBarrier(value: string): void {
    if (!this.currentAccount) return;

    this.currentAccount.barrier = value;

    const accounts = this.getStorageDerivAccount() || [];
    if (accounts.length > 0) {
      accounts[0].barrier = value;
      this.saveAccount(this.currentAccount);
    }

    this.observer.emit("account.update", this.currentAccount);
  }

  public get currentBarrier(): string {
    this.currentAccount = this.getStorageDerivAccount()?.[0];
    return this.currentAccount?.barrier || "";
  }

  public updateDigits(value: number): void {
    if (!this.currentAccount) return;

    this.currentAccount.digits = value;

    const accounts = this.getStorageDerivAccount() || [];
    if (accounts.length > 0) {
      accounts[0].digits = value;
      this.saveAccount(this.currentAccount);
    }

    this.observer.emit("account.update", this.currentAccount);
  }

  public get currentDigits(): number {
    this.currentAccount = this.getStorageDerivAccount()?.[0];
    const digits = this.currentAccount?.digits;
    return typeof digits === "number" ? digits : 3;
  }

  public updateVolatility(value: string): void {
    if (!this.currentAccount) return;

    this.currentAccount.volatility = value;

    const accounts = this.getStorageDerivAccount() || [];
    if (accounts.length > 0) {
      accounts[0].volatility = value;
      this.saveAccount(this.currentAccount);
    }

    this.observer.emit("account.update", this.currentAccount);
  }

  public clearHistory(): void {
    let accounts = this.getStorageDerivAccount() || [];

    if (accounts.length > 0) {
      this.currentAccount.finishedTradeList = [];
      this.currentAccount.lastTrade = null;
      this.currentAccount.results = {
        loss: 0,
        result: 0,
        wins: 0,
      };

      this.saveAccount(this.currentAccount);

      this.observer.emit("account.update", this.currentAccount);
    }
  }

  public get hasAuthorized(): boolean {
    return this.isAuthorized;
  }

  private updateTickHistory(symbol: string, price: number, time: number) {
    if (!this.tickHistory.has(symbol)) {
      this.tickHistory.set(symbol, []);
    }

    // Detectar e armazenar casas decimais se não conhecidas
    if (!this.symbolDecimals.has(symbol)) {
      const priceStr = price.toString();
      const decimalIndex = priceStr.indexOf('.');
      if (decimalIndex !== -1) {
        const decimals = priceStr.length - decimalIndex - 1;
        this.symbolDecimals.set(symbol, decimals);
      } else {
        this.symbolDecimals.set(symbol, 0);
      }
    }
    
    const history = this.tickHistory.get(symbol)!;
    history.push({ price, time });
    
    if (history.length > this.MAX_HISTORY_SIZE) {
      history.shift();
    }
  }

  /**
   * Extrai o último dígito de um preço de forma padronizada
   * @param price Preço atual
   * @param symbol Símbolo do ativo (opcional, usa cache se disponível)
   */
  public extractLastDigit(price: number, symbol: string): number | null {
    if (typeof price !== 'number' || price === null || price === undefined) {
      return null;
    }

    let decimals = this.symbolDecimals.get(symbol);
    
    // Se não tivermos info de decimais, tentar detectar do preço atual
    if (decimals === undefined) {
      const priceStr = price.toString();
      const decimalIndex = priceStr.indexOf('.');
      if (decimalIndex !== -1) {
        decimals = priceStr.length - decimalIndex - 1;
        // Armazenar para uso futuro
        this.symbolDecimals.set(symbol, decimals);
      } else {
        decimals = 0;
      }
    }

    // Garantir pelo menos 1 casa decimal para processamento correto
    const effectiveDecimals = Math.max(1, decimals);
    const multiplier = Math.pow(10, effectiveDecimals);
    const processedPrice = Math.round(price * multiplier);
    
    return processedPrice % 10;
  }

  /**
   * Obtém histórico de ticks de forma síncrona (do buffer local)
   * Compatível com a interface esperada pelo sistema legado
   */
  public getHistoricalTicksSync(symbol: string, count: number): { prices: number[]; times: number[] } | null {
    const history = this.tickHistory.get(symbol);
    if (!history || history.length === 0) {
      return null;
    }

    const sliced = history.slice(-count);
    return {
      prices: sliced.map(h => h.price),
      times: sliced.map(h => h.time)
    };
  }

  /**
   * Obtém histórico de ticks da API (Assíncrono)
   */
  public async getHistoricalTicks(symbol: string, count: number): Promise<any> {
    return this.send({
      ticks_history: symbol,
      adjust_start_time: 1,
      count: count,
      end: "latest",
      style: "ticks"
    });
  }

  /**
   * Extrai o último dígito para um ativo específico.
   * Assinatura compatível com o método homônimo do sistema legado (DerivMarketData).
   */
  public extractLastDigitForAsset(symbol: string, price: number): number | null {
    return this.extractLastDigit(price, symbol);
  }

  /**
   * Versão adaptada de CommonHelpers.extractLastDigitUnified para o sistema moderno.
   * Obtém token de activeToken e símbolo de selectedSymbol direto do localStorage,
   * sem depender do SessionManager legado.
   */
  public extractLastDigitUnified(price: number, symbol?: string): number | null {
    if (typeof price !== 'number' || price === null || price === undefined) {
      return null;
    }

    const selectedSymbol = symbol || localStorage.getItem('selectedSymbol') || '';

    return this.extractLastDigitForAsset(selectedSymbol, price);
  }
}
