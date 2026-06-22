import { toast } from "react-toastify";
import { Observer } from "./simpleObserver";

type DerivEventMap = {
  open: void;
  "market.open": void;
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
  isMarket: boolean;
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
  private marketWs: WebSocket | null = null;
  private appId = process.env.NEXT_PUBLIC_APPID;
  private derivTokenScope = "";
  private reqId = 1;
  private isAuthorized = false;
  private authorizeToken: string | null = null;
  private pingInterval: NodeJS.Timeout | null = null;
  private marketPingInterval: NodeJS.Timeout | null = null;
  private manualClose = false;
  private pendingRequests: PendingRequest[] = [];
  private subscribes = new Map<string, any>();
  private marketSubscribes = new Map<string, any>();
  private pendingResubscribes = new Map<string, any>();
  private currentAccount: AccountInfo | null = null;
  private balanceSubscriptionId: string | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private marketReconnectTimeout: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private marketReconnectAttempts = 0;
  private readonly MAX_RECONNECT_ATTEMPTS = 5;
  private readonly MAX_MARKET_RECONNECT_ATTEMPTS = 10;

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
      const searchParams = new URLSearchParams(window.location.search);
      const code = searchParams.get('code');
      const state = searchParams.get('state');

      if (code && state) {
        this.handleOAuthCallback(code, state);
      } else {
        const tokens = this.parseQueryTokens(window.location.search.substring(1));
        if (tokens.length > 0) {
          localStorage.setItem(
            `${this.derivTokenScope}token_list`,
            JSON.stringify(tokens)
          );
          window.location.search = "";
        }
      }
    }

    this.observer.on("open", async () => {
      await this.processAuthenticatedUserData();
      await this.setupBalanceMonitoring();
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
          if (data.balance?.loginid && token.acct == data.balance.loginid) {
            token.balance = data.balance.balance;
            this.setAccountData(this.currentAccount);
          }
        });
        this.saveAccount(this.currentAccount);
      }
    });
  }

  private async setupBalanceMonitoring() {
    if (this.balanceSubscriptionId) {
      return;
    }

    await this.subscribe({ balance: 1 })
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
    if (token && token.startsWith('oauth:')) {
      const parts = token.split(':');
      const accessToken = parts[1];
      const accountId = parts[2];

      const accounts = this.getStorageDerivAccount();
      const currentAcc = accounts?.[0];
      const activeTokenInfo = currentAcc?.tokens.find(t => t.token === token);
      this.isAuthorized = true;

      // A conexão OAuth/OTP já vem pré-autorizada. Como o `isAuthorized` só é
      // definido aqui (e não no `handleOpen` quando `authorizeToken` ainda é nulo),
      // precisamos liberar as requisições que ficaram enfileiradas aguardando auth.
      this.dispatchPendingRequests();
      this.dispatchPendingResubscribes();

      return {
        balance: activeTokenInfo?.balance ?? 0,
        fullname: currentAcc?.name || "Conta Deriv",
        loginid: accountId,
        currency: activeTokenInfo?.cur || "USD"
      };
    }

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

  private async generatePKCE() {
    const array = window.crypto.getRandomValues(new Uint8Array(64));
    const codeVerifier = Array.from(array)
      .map((v) => "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~"[v % 66])
      .join("");

    const hash = await window.crypto.subtle.digest("SHA-256", new TextEncoder().encode(codeVerifier));
    const codeChallenge = btoa(String.fromCharCode(...new Uint8Array(hash)))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    const state = window.crypto.getRandomValues(new Uint8Array(16))
      .reduce((s, b) => s + b.toString(16).padStart(2, "0"), "");

    sessionStorage.setItem("pkce_code_verifier", codeVerifier);
    sessionStorage.setItem("oauth_state", state);

    return { codeChallenge, state };
  }

  private async handleOAuthCallback(code: string, state: string) {
    const storedState = sessionStorage.getItem('oauth_state');
    const codeVerifier = sessionStorage.getItem('pkce_code_verifier');

    if (state !== storedState) {
      console.error('State mismatch. Potential CSRF attack.');
      toast.error('Erro de autenticação: CSRF detectado.');
      window.location.search = "";
      return;
    }

    if (!codeVerifier) {
      console.error('Code verifier not found in session.');
      toast.error('Erro de autenticação: PKCE inválido.');
      window.location.search = "";
      return;
    }

    try {
      // O redirect_uri deve ser EXATAMENTE igual ao enviado na autorização
      const redirectUri = window.location.origin + "/home";
      const response = await fetch('/api/deriv-auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code,
          codeVerifier,
          redirectUri,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to exchange code for tokens');
      }

      const { accessToken, accounts } = await response.json();

      sessionStorage.removeItem('pkce_code_verifier');
      sessionStorage.removeItem('oauth_state');

      const tokenList: TokenData[] = accounts.map((acc: any) => ({
        token: `oauth:${accessToken}:${acc.account_id}`,
        is_virtual: acc.account_type === 'demo',
        cur: acc.currency,
        acct: acc.account_id,
        loginid: acc.account_id,
        balance: acc.balance,
      }));

      if (tokenList.length > 0) {
        localStorage.setItem(
          `${this.derivTokenScope}token_list`,
          JSON.stringify(tokenList)
        );

        const demoAccount = tokenList.find(t => t.is_virtual) || tokenList[0];
        const newAccount: AccountInfo = {
          activeToken: demoAccount.token,
          amount: 0.35,
          barrier: "",
          digits: 3,
          volatility: "R_100",
          finishedTradeList: [],
          lastTrade: null,
          name: "Conta Deriv",
          openTradeId: null,
          results: { loss: 0, result: 0, wins: 0 },
          selectedLoginId: demoAccount.loginid,
          loginId: demoAccount.loginid,
          tokens: tokenList,
        };

        this.saveAccount(newAccount);
        this.setAccountData(newAccount);

        await this.reconnect();
      }

      window.location.href = window.location.origin + window.location.pathname;
    } catch (error) {
      console.error('Error handling OAuth callback:', error);
      toast.error('Erro na autenticação com a Deriv');
      window.location.search = "";
    }
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
    if (typeof window === 'undefined') return;

    // Conectar o canal público de mercado
    this.connectMarketWs();

    if (!this.getStorageDerivAccount() || this.getStorageDerivAccount()?.length === 0) {
      return;
    }

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

    const activeToken = this.getToken();
    if (activeToken && activeToken.startsWith('oauth:')) {
      const parts = activeToken.split(':');
      const accessToken = parts[1];
      const accountId = parts[2];

      fetch('/api/deriv-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ accessToken, accountId }),
      })
        .then((res) => {
          if (!res.ok) throw new Error('Failed to get OTP');
          return res.json();
        })
        .then((otpData) => {
          if (otpData.websocket_url) {
            this.establishWebSocketConnection(otpData.websocket_url);
          } else {
            this.establishWebSocketConnection();
          }
        })
        .catch((err) => {
          console.error('Failed to get OTP WebSocket URL:', err);
          this.establishWebSocketConnection();
        });
    } else {
      this.establishWebSocketConnection();
    }
  }

  private establishWebSocketConnection(url?: string): void {
    const wsUrl = url || `wss://ws.derivws.com/websockets/v3?l=pt&app_id=${process.env.NEXT_PUBLIC_APPID}`;
    const ws = new WebSocket(wsUrl);

    this.ws = ws;

    ws.addEventListener("open", () => this.handleOpen(ws));
    ws.addEventListener("message", (event) => this.handleMessage(ws, event));
    ws.addEventListener("error", (event) => this.handleError(ws, event));
    ws.addEventListener("close", (event) => this.handleClose(ws, event));
  }

  public get isMarketConnected(): boolean {
    return this.marketWs !== null && this.marketWs.readyState === WebSocket.OPEN;
  }

  private connectMarketWs(): void {
    if (typeof window === 'undefined') return;

    if (this.marketReconnectTimeout) {
      clearTimeout(this.marketReconnectTimeout);
      this.marketReconnectTimeout = null;
    }

    if (
      this.marketWs &&
      (this.marketWs.readyState === WebSocket.OPEN ||
        this.marketWs.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    const wsUrl = `wss://ws.derivws.com/websockets/v3?l=pt&app_id=1089`;
    const ws = new WebSocket(wsUrl);

    this.marketWs = ws;

    ws.addEventListener("open", () => this.handleMarketOpen(ws));
    ws.addEventListener("message", (event) => this.handleMarketMessage(ws, event));
    ws.addEventListener("error", (event) => this.handleMarketError(ws, event));
    ws.addEventListener("close", (event) => this.handleMarketClose(ws, event));
  }

  public handleMarketOpen(ws: WebSocket) {
    if (this.marketWs !== ws || ws.readyState !== WebSocket.OPEN) {
      return;
    }

    this.marketReconnectAttempts = 0;
    this.observer.emit("market.open" as any, undefined);

    this.dispatchMarketPendingResubscribes();
    this.dispatchPendingRequests();

    if (this.marketPingInterval) {
      clearInterval(this.marketPingInterval);
    }

    this.marketPingInterval = setInterval(() => {
      if (this.marketWs === ws && ws.readyState === WebSocket.OPEN) {
        ws.send('{ "ping": 1 }');
      }
    }, 25000);
  }

  public handleMarketMessage(ws: WebSocket, event: MessageEvent) {
    if (this.marketWs !== ws) {
      return;
    }

    try {
      const data = JSON.parse(event.data);

      this.observer.emit("message", data);

      if (data.msg_type === "forget") {
        this.marketSubscribes.delete(data.forget);
      }

      if (data.msg_type) {
        this.observer.emit(
          `deriv.${data.msg_type}` as keyof DerivEventMap,
          data
        );
      }
    } catch (error) {
      console.error("Error parsing market message:", error);
    }
  }

  private handleMarketError(ws: WebSocket, event: Event) {
    if (this.marketWs !== ws) {
      return;
    }
    this.reconnectMarketWs();
  }

  private handleMarketClose(ws: WebSocket, event: CloseEvent) {
    if (this.marketWs !== ws) {
      return;
    }
    this.cleanupMarketWs();
    this.reconnectMarketWs();
  }

  public cleanupMarketWs() {
    this.marketSubscribes.clear();
    this.marketWs = null;
    if (this.marketPingInterval) {
      clearInterval(this.marketPingInterval);
      this.marketPingInterval = null;
    }
  }

  public reconnectMarketWs() {
    if (this.marketReconnectTimeout) {
      return;
    }

    this.marketReconnectAttempts++;
    if (this.marketReconnectAttempts > this.MAX_MARKET_RECONNECT_ATTEMPTS) {
      console.error(`Máximo de tentativas de reconexão do canal de mercado atingido.`);
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, this.marketReconnectAttempts - 1), 16000);
    console.log(`Reconectando canal de mercado em ${delay / 1000}s (tentativa ${this.marketReconnectAttempts}/${this.MAX_MARKET_RECONNECT_ATTEMPTS})...`);

    this.marketReconnectTimeout = setTimeout(() => {
      this.marketReconnectTimeout = null;
      this.connectMarketWs();
    }, delay);
  }

  private dispatchMarketPendingResubscribes() {
    this.marketSubscribes.forEach((payload, id) => {
      this.subscribe(payload).then(() => {
        // Sucesso
      });
    });
  }

  public handleOpen(ws: WebSocket) {
    if (this.ws !== ws || ws.readyState !== WebSocket.OPEN) {
      return;
    }

    // Conexão bem-sucedida: resetar contador de reconexão
    this.reconnectAttempts = 0;

    this.observer.emit("open", undefined);

    if (this.authorizeToken && !this.authorizeToken.startsWith('oauth:')) {
      this.send({ authorize: this.authorizeToken });
    } else if (this.authorizeToken && this.authorizeToken.startsWith('oauth:')) {
      this.isAuthorized = true;
      this.dispatchPendingRequests();
      this.dispatchPendingResubscribes();
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
        //this.isAuthorized = !data.error;
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

    // Cancelar todas as subscriptions do ws principal
    const forgetPromises = Array.from(this.subscribes.keys()).map(id =>
      this.send({ forget: id }).catch(error => console.error('Forget error:', error))
    );

    // Cancelar todas as subscriptions do ws de mercado
    const forgetMarketPromises = Array.from(this.marketSubscribes.keys()).map(id =>
      this.send({ forget: id }).catch(error => console.error('Forget market error:', error))
    );

    Promise.all([...forgetPromises, ...forgetMarketPromises]).finally(() => {
      if (this.ws) {
        this.ws.close();
        this.ws = null;
      }
      if (this.marketWs) {
        this.marketWs.close();
        this.marketWs = null;
      }
      this.cleanup();
      this.cleanupMarketWs();
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
      const isMarket = this.isMarketRequest(payload);

      const listenerId = this.observer.on("message", (data) => {

        if (data.req_id === reqId) {
          this.observer.removeById(listenerId);
          data.error ? reject(data.error) : resolve(data);
        }
      });

      if (isMarket) {
        if (this.isMarketConnected) {
          this.marketWs!.send(JSON.stringify({ ...payload, req_id: reqId }));
        } else {
          this.queueRequest(payload, reqId, false, resolve, reject);
        }
      } else {
        if (this.isConnected && (!needAuthorize || this.isAuthorized)) {
          this.ws!.send(JSON.stringify({ ...payload, req_id: reqId }));
        } else {
          this.queueRequest(payload, reqId, needAuthorize, resolve, reject);
        }
      }
    });
  }

  public async handleDemoAccountChange() {
    const tokenDemo = this.getTokenDemo() || "";

    if (!tokenDemo) {
      throw new Error("Token demo não encontrado");
    }

    this.authorizeToken = tokenDemo;

    let loginId = "";
    let balance = 0;

    if (tokenDemo.startsWith('oauth:')) {
      const parts = tokenDemo.split(':');
      loginId = parts[2];

      this.disconnect();
      await this.connect();

      const accounts = this.getStorageDerivAccount();
      const demoTokenInfo = accounts?.[0]?.tokens.find(t => t.token === tokenDemo);
      balance = demoTokenInfo?.balance || 0;
    } else {
      const authResponse = await this.send({ authorize: tokenDemo });
      loginId = authResponse.authorize.loginid;
      balance = authResponse.authorize.balance;
    }

    const updatedAccount = {
      ...this.getStorageDerivAccount()[0],
      activeToken: tokenDemo,
      selectedLoginId: loginId,
    };

    localStorage.setItem("deriv_accounts", JSON.stringify([updatedAccount]));
    this.setAccountData(updatedAccount);
  }

  public async switchAccount(token: string): Promise<any> {
    if (!token) {
      throw new Error("Token inválido");
    }

    // Atualizar token ativo
    this.setToken(token);

    let loginId = "";
    let balance = 0;

    if (token.startsWith('oauth:')) {
      const parts = token.split(':');
      loginId = parts[2];

      // Desconecta apenas o ws principal de trade e reconecta
      if (this.ws) {
        try {
          this.ws.close();
        } catch { }
        this.ws = null;
      }
      this.cleanup(); // Limpa as subscriptions do socket de trade, pendentes, etc.

      this.connect(); // Dispara nova conexão que vai buscar o OTP da conta correspondente

      // Aguardar conexão estar ativa
      await this.waitForConnection();

      // Autorizar e obter saldos
      const authResult = await this.authenticate(token);
      loginId = authResult.loginid;
      balance = authResult.balance;
    } else {
      // Fluxo legado
      const authResponse = await this.send({ authorize: token });
      if (authResponse.error) {
        throw new Error(authResponse.error.message);
      }
      loginId = authResponse.authorize.loginid;
      balance = authResponse.authorize.balance;
    }

    const accounts = this.getStorageDerivAccount();
    if (accounts && accounts.length > 0) {
      const currentAcc = accounts[0];
      currentAcc.activeToken = token;
      currentAcc.selectedLoginId = loginId;
      currentAcc.loginId = loginId;
      currentAcc.tokens = currentAcc.tokens.map(t => {
        if (t.token === token) {
          return { ...t, balance };
        }
        return t;
      });

      this.saveAccount(currentAcc);
      this.setAccountData(currentAcc);
    }
  }

  private queueRequest(
    payload: Record<string, any>,
    reqId: number,
    needAuthorize: boolean,
    resolve: (value: any) => void,
    reject: (reason?: any) => void
  ) {
    const isMarket = this.isMarketRequest(payload);
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
      isMarket,
      cancelled: false,
      timeToCancel,
      resolve,
      reject,
      send: () => {
        if (!pendingRequest.cancelled) {
          clearTimeout(timeToCancel);
          const targetWs = isMarket ? this.marketWs : this.ws;
          if (targetWs && targetWs.readyState === WebSocket.OPEN) {
            targetWs.send(JSON.stringify({ ...payload, req_id: reqId }));
          }
        }
      },
    };

    this.pendingRequests.push(pendingRequest);
  }

  public subscribe(payload: Record<string, any>): Promise<any> {
    const isMarket = this.isMarketRequest(payload);
    const subMap = isMarket ? this.marketSubscribes : this.subscribes;

    // Verificar se já existe uma subscription similar
    const existingSubscription = Array.from(subMap.values())
      .find(sub => JSON.stringify(sub) === JSON.stringify(payload));

    if (existingSubscription) {
      return Promise.resolve({ subscription: { id: 'existing' } });
    }

    return this.send({ ...payload, subscribe: 1 })
      .then((response) => {
        if (response.subscription?.id) {
          subMap.set(response.subscription.id, payload);
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

  private isMarketRequest(payload: Record<string, any>): boolean {
    if (payload.hasOwnProperty("ticks") || payload.hasOwnProperty("ticks_history") || payload.hasOwnProperty("active_symbols")) {
      return true;
    }
    if (payload.hasOwnProperty("forget")) {
      const subscriptionId = payload.forget;
      return this.marketSubscribes.has(subscriptionId);
    }
    return false;
  }

  private checkNeedAuthorize(payload: Record<string, any>): boolean {
    return this.needAuthorize.some((key) => payload.hasOwnProperty(key));
  }

  private dispatchPendingRequests() {
    const pending = [...this.pendingRequests];
    this.pendingRequests = [];

    pending.forEach((request) => {
      if (request.isMarket) {
        if (this.isMarketConnected) {
          request.send();
        } else {
          this.pendingRequests.push(request);
        }
      } else {
        if (this.isConnected && ((request.needAuthorize && this.isAuthorized) || !request.needAuthorize)) {
          request.send();
        } else {
          this.pendingRequests.push(request);
        }
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

    // Limitar tentativas para evitar loop infinito (ex: CSP bloqueando)
    this.reconnectAttempts++;
    if (this.reconnectAttempts > this.MAX_RECONNECT_ATTEMPTS) {
      console.error(`Máximo de tentativas de reconexão (${this.MAX_RECONNECT_ATTEMPTS}) atingido. Parando.`);
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

    // Backoff exponencial: 1s, 2s, 4s, 8s, 16s
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts - 1), 16000);
    console.log(`Reconectando em ${delay / 1000}s (tentativa ${this.reconnectAttempts}/${this.MAX_RECONNECT_ATTEMPTS})...`);

    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      this.connect();
    }, delay);
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

  public async loginDeriv() {
    const { codeChallenge, state } = await this.generatePKCE();
    const clientId = process.env.NEXT_PUBLIC_DERIV_CLIENT_ID || this.appId || "";

    // O redirect_uri deve ser EXATAMENTE o que está registrado na Deriv.
    // Usamos dinamicamente a origem atual para suportar tanto localhost quanto devtunnels.
    const redirectUri = window.location.origin + "/home";

    // Usar a interface URL para garantir que todos os parâmetros sejam codificados corretamente,
    // evitando erros de caracteres inválidos que disparam o Cloudflare (Access Denied).
    const authUrl = new URL("https://auth.deriv.com/oauth2/auth");
    authUrl.searchParams.append("response_type", "code");
    authUrl.searchParams.append("client_id", clientId);
    authUrl.searchParams.append("redirect_uri", redirectUri);
    authUrl.searchParams.append("scope", "trade account_manage application_read");
    authUrl.searchParams.append("state", state);
    authUrl.searchParams.append("code_challenge", codeChallenge);
    authUrl.searchParams.append("code_challenge_method", "S256");

    // Se você estiver mantendo suporte à API legada, passa o app_id original
    if (this.appId) {
      authUrl.searchParams.append("app_id", this.appId);
    }

    window.location.href = authUrl.toString();
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

  /**
   * Retorna o saldo atual da conta ativa (token ativo)
   */
  public getCurrentBalance(): { balance: number; currency: string } | null {
    if (!this.currentAccount) {
      // Tentar carregar do localStorage
      const stored = this.getStorageDerivAccount();
      if (stored?.[0]) this.currentAccount = stored[0];
    }
    if (!this.currentAccount) return null;

    const activeToken = this.currentAccount.activeToken;
    const token = this.currentAccount.tokens.find(t => t.token === activeToken);
    if (token && token.balance !== undefined) {
      return { balance: token.balance, currency: token.cur || 'USD' };
    }
    return null;
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

    // Armazenar casas decimais para símbolos desconhecidos (fallback dinâmico)
    if (!this.symbolDecimals.has(symbol)) {
      const priceStr = price.toString();
      const decimalIndex = priceStr.indexOf('.');
      if (decimalIndex !== -1) {
        // Usar o máximo entre detectado e cache anterior, pois JS descarta zeros à direita
        const detected = priceStr.length - decimalIndex - 1;
        this.symbolDecimals.set(symbol, detected);
      } else {
        this.symbolDecimals.set(symbol, 0);
      }
    } else {
      // Atualizar se detectarmos MAIS casas decimais (corrige detecção inicial com zero final)
      const priceStr = price.toString();
      const decimalIndex = priceStr.indexOf('.');
      if (decimalIndex !== -1) {
        const detected = priceStr.length - decimalIndex - 1;
        const current = this.symbolDecimals.get(symbol)!;
        if (detected > current) {
          this.symbolDecimals.set(symbol, detected);
        }
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

    // Tabela fixa de precisão por símbolo — JavaScript descarta zeros à direita
    // em numbers, então a detecção dinâmica falha quando o último dígito é 0
    // (ex: R_10 → 5170.160 vira 5170.16 → detecta 2 casas em vez de 3)
    const decimals = this.getSymbolPrecision(symbol);

    const multiplier = Math.pow(10, decimals);
    const processedPrice = Math.round(price * multiplier);

    return processedPrice % 10;
  }

  private getSymbolPrecision(symbol: string): number {
    if (symbol === 'R_100') return 2;
    if (symbol === 'R_25' || symbol === 'R_10') return 3;
    if (symbol === 'RDBEAR' || symbol === 'RDBULL') return 4;
    if (symbol.startsWith('JD')) return 2;
    if (symbol.includes('1HZ')) return 2;

    // Fallback: usar cache dinâmico se existir, senão 4 (padrão)
    const cached = this.symbolDecimals.get(symbol);
    return cached !== undefined ? Math.max(1, cached) : 4;
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
   * Obtém a tabela de lucros (histórico de operações) da conta ativa autorizada,
   * usando a nova API OAuth. O `send` enfileira a requisição até a conexão estar
   * autorizada (profit_table está em `needAuthorize`).
   */
  public async getProfitTable(limit: number = 50, offset: number = 0): Promise<any> {
    return this.send({
      profit_table: 1,
      description: 1,
      sort: "DESC",
      limit,
      offset,
    });
  }

  /**
   * Obtém o histórico de operações (profit_table) de uma conta específica
   * (demo ou real) sem alterar a conta ativa de trade.
   *
   * - Se for a conta ativa já autorizada, reaproveita a conexão principal.
   * - Caso contrário, obtém uma `websocket_url` pré-autorizada via OTP e usa
   *   uma conexão temporária descartável apenas para essa consulta.
   */
  public async getProfitTableForAccount(
    token: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<any> {
    const payload = {
      profit_table: 1,
      description: 1,
      sort: "DESC",
      limit,
      offset,
    };

    // Reaproveita a conexão principal quando for a conta ativa já autorizada
    if (
      token &&
      token === this.currentAccount?.activeToken &&
      this.isConnected &&
      this.isAuthorized
    ) {
      return this.send(payload);
    }

    if (token && token.startsWith("oauth:")) {
      const parts = token.split(":");
      const accessToken = parts[1];
      const accountId = parts[2];

      const res = await fetch("/api/deriv-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken, accountId }),
      });

      if (!res.ok) {
        throw new Error("Falha ao autorizar a conta selecionada");
      }

      const otp = await res.json();
      if (!otp.websocket_url) {
        throw new Error("Não foi possível obter conexão autorizada para a conta");
      }

      // A URL do OTP já vem pré-autorizada para a conta solicitada
      return this.requestOnTempConnection(otp.websocket_url, payload, "profit_table");
    }

    // Token legado (não-OAuth): autoriza numa conexão temporária
    const wsUrl = `wss://ws.derivws.com/websockets/v3?l=pt&app_id=${process.env.NEXT_PUBLIC_APPID}`;
    return this.requestOnTempConnection(wsUrl, payload, "profit_table", token);
  }

  /**
   * Abre uma conexão WebSocket temporária, envia uma requisição e resolve com a
   * resposta correspondente, fechando a conexão em seguida. Usada para consultas
   * pontuais a contas que não são a conta ativa.
   */
  private requestOnTempConnection(
    wsUrl: string,
    payload: Record<string, any>,
    expectedMsgType: string,
    authToken?: string
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      let settled = false;
      let ws: WebSocket;

      try {
        ws = new WebSocket(wsUrl);
      } catch (e) {
        reject(e);
        return;
      }

      const finish = (fn: () => void) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        try {
          ws.close();
        } catch { }
        fn();
      };

      const timeout = setTimeout(() => {
        finish(() =>
          reject(
            new Error("Limite de tempo expirado, sem resposta da corretora")
          )
        );
      }, 20000);

      ws.onopen = () => {
        ws.send(JSON.stringify(authToken ? { authorize: authToken } : payload));
      };

      ws.onmessage = (event) => {
        let data: any;
        try {
          data = JSON.parse(event.data);
        } catch {
          return;
        }

        if (data.error) {
          finish(() => reject(new Error(data.error.message)));
          return;
        }

        if (data.msg_type === "authorize") {
          ws.send(JSON.stringify(payload));
          return;
        }

        if (data.msg_type === expectedMsgType) {
          finish(() => resolve(data));
        }
      };

      ws.onerror = () => {
        finish(() => reject(new Error("Erro na conexão com a corretora")));
      };
    });
  }

  /**
   * Retorna o loginId (acct) da conta ativa atualmente autorizada.
   */
  public getActiveLoginId(): string {
    const account = this.currentAccount || this.getStorageDerivAccount()?.[0];
    if (!account) return "";
    const activeTokenData = account.tokens.find(
      (t) => t.token === account.activeToken
    );
    return activeTokenData?.acct || account.selectedLoginId || account.loginId || "";
  }

  /**
   * Retorna o access token OAuth da conta ativa (parte `accessToken` do
   * formato `oauth:accessToken:accountId`). Usado para chamadas REST
   * autenticadas via Bearer token (ex.: markup-statistics).
   */
  public getActiveAccessToken(): string | null {
    const account = this.currentAccount || this.getStorageDerivAccount()?.[0];
    const token = account?.activeToken;
    console.log("account ", account);
    console.log("token ", token);
    if (token && token.startsWith("oauth:")) {
      return token.split(":")[1] || null;
    }
    return null;
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
