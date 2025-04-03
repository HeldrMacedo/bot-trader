// DerivService.tsx
"use client";

import DeriveAPI from "@deriv/deriv-api";

interface BuyContractResponse {
  buy: {
    contract_id: string;
    price: number;
    [key: string]: any;
  };
  [key: string]: any;
}

interface ProposalResponse {
  proposal: {
    id: string;
    ask_price: number;
    [key: string]: any;
  };
  [key: string]: any;
}

interface AccountToken {
    loginid: string;
    token: string;
    currency: string;
    balance: number | string;
    is_virtual: boolean;
  }
  
  // Interface para representar os dados consolidados da conta
  interface AccountData {
    activeToken: string;
    amount: number;
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
    tokens: AccountToken[];
  }

type BalanceCallback = (newBalance: number) => void;
export default class DerivService {
  private static instance: DerivService;
  private socket!: WebSocket;
  private appId: string;
  private accountData: AccountData | null = null;
  private activeLoginId: string = '';
  private userInfo: any = null;
  private balanceCallbacks: BalanceCallback[] = [];
  private pingInterval: NodeJS.Timeout | null = null;
  private isConnected: boolean = false;
  private isAuthenticated: boolean = false;

  private constructor() {
    this.appId = process.env.NEXT_PUBLIC_APPID;
    this.connect();
  }

  public static getInstance(): DerivService {
    if (!DerivService.instance) {
      DerivService.instance = new DerivService();
    }
    return DerivService.instance;
  }

  public async init(){
    const params = new URLSearchParams(window.location.search);

    if (params.size > 0) {
      const tokens = await this.processLoginResponse(params);  
      
      if (tokens.length == 0) {
        return;
      }

      localStorage.setItem('tokens_list', JSON.stringify(tokens));

      window.location.search = '';
    }
  }

  /**
   * Ao iniciar a aplicação, é necessário verificar se há tokens salvos no localStorage.
   * Processa o token de login salvo no localStorage e monta um array com os tokens e valores atualizidos
   */
  public async processAuthenticatedUserData(){
    await new Promise(resolve => {
      const checkConnection = () => {
        if (this.isConnected) resolve(true);
        else setTimeout(checkConnection, 100);
      };
      checkConnection();
    });
    
    const derivAcountStorage = this.getStorageDerivAccount();
    if (derivAcountStorage && derivAcountStorage.length > 0) {
      // Atualiza o estado da conta com os dados do localStorage
      //TODO: Criar um algoritmo para adcionar os dados atualizados
      this.setAccountData(derivAcountStorage[0]);
      return;
    }

    const tokens = this.getTokens();

    if (!tokens || tokens.length === 0) {
      return;
    }

    let accountVRT = tokens.find((item) => item.is_virtual);
    let accountCRT = tokens.find((item) => !item.is_virtual);

    await this.authenticate(accountVRT.token);
    const userInfoVRT = await this.getUserInfo();
    await this.authenticate(accountCRT.token);
    const userInfoCRT = await this.getUserInfo();

    accountVRT.balance = userInfoVRT.balance;
    accountCRT.balance = userInfoCRT.balance;

    const info = {
      activeToken: accountVRT.token,
      amount: 0.35,
      finishedTradeList: [],
      lastTrade: null,
      name: userInfoVRT.fullname,
      openTradeId: null,
      results: {
        loss: 0,
        result: 0,
        wins: 0
      },
      selectedLoginId: accountVRT.acct,
      loginId: accountVRT.loginid,
      tokens: [accountVRT, accountCRT]
    };
    this.setAccountData(info);
    localStorage.setItem("deriv_accounts", JSON.stringify([info]));

  }

  private setAccountData(data) {
    console.log(data);
    this.accountData = data;
  }

  public getStorageDerivAccount(): string{
    const storedAccounts = JSON.parse(localStorage.getItem("deriv_accounts") || "[]");
    return storedAccounts;
  }

  /**
   * 
   * @returns {string} Retorna o token virtual
   */
  getTokenActive(){
    const tokenVrtc = this.getTokens().find(item => item.is_virtual);
    return tokenVrtc ? tokenVrtc.token : null
  }

  /**
   * 
   * @returns {Array} Retorna uma lista de tokens
   */
  public getTokens() {
    const tokens = localStorage.getItem("tokens_list");
    return tokens ? JSON.parse(tokens) : [];
  }

  /**
   * Processa a resposta da autorização do Deriv.
   * @param param - Parametros de autorização.
   * @returns Object - Objeto com os tokens autorizados.
   */
  private async processLoginResponse(params) {
    return Object.values(params.toString().split('&').reduce((obj, item)=> {
      const testers = [
        /(acct)(\d)\=(.+)/gi,
        /(token)(\d)\=(.+)/gi,
        /(cur)(\d)\=(.+)/gi
      ]
      for (let i = 0; i < testers.length; i++) {
          const testResult = testers[i].exec(item)

          if (testResult) {
              const name = testResult[1]
              const index = testResult[2]
              const value = testResult[3]

              if (!obj[index]) {
                  obj[index] = {}
              }

              obj[index][name] = value

              if (name == 'acct') {
                  obj[index].is_virtual = value.startsWith('VRTC');
              }
          }
      }

      return obj;
    }, {}));
  }

  public loginDeriv() {
    window.location.href = `https://oauth.deriv.com/oauth2/authorize?app_id=${this.appId}`;
  }

  private connect(): void {
    
    this.socket = new WebSocket(`wss://ws.derivws.com/websockets/v3?app_id=${this.appId}`);
    
    this.socket.addEventListener('open', () => {
      this.isConnected = true;
      this.startPing();
      console.log('WebSocket connection established.');
      // if (this.accountData.activeToken) {
      //   this.socket.send(JSON.stringify({ authorize: this.accountData.activeToken }));
      // }
    });

    this.socket.addEventListener('message', (event) => {
      const data = JSON.parse(event.data);
      console.log('Received message:', data);

      if (data.msg_type === 'authorize') {
        this.isAuthenticated = true;
      }else {
        this.isAuthenticated = false;
      }

      this.handleMessage(data);
    });

    this.socket.addEventListener('close', () => {
      this.stopPing();
      setTimeout(() => this.connect(), 5000); // Reconexão automática
    });

    this.socket.addEventListener('error', (error) => {
      console.error('Erro de conexão:', error);
      this.isConnected = false;
      setTimeout(() => this.connect(), 5000); // Nova tentativa
    });
   
  }

  

  private startPing(): void {
    this.pingInterval = setInterval(() => {
      this.socket.send(JSON.stringify({ ping: 1 }));
    }, 60000);
  }

  private stopPing(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }
  }

  private handleMessage(data: any): void {
    if (data.msg_type === 'authorize') {
      this.userInfo = data.authorize;
      this.activeLoginId = data.authorize.loginid;
    }
    
    if (data.msg_type === 'balance') {
      const newBalance = data.balance.balance;
      this.balanceCallbacks.forEach(cb => cb(newBalance));
    }
  }

  public async authenticate(token: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.isConnected) {
        reject(new Error('WebSocket não conectado'));
        return;
      }
      const reqId = Date.now();
      
      const authMessage = {
        authorize: token,
        req_id: reqId
      };

      const handler = (event: MessageEvent) => {
        const data = JSON.parse(event.data);
        if (data.req_id === reqId) {
          if (data.error) {
            reject(data.error);
          } else {
            resolve();
          }
          this.socket.removeEventListener('message', handler);
        }
      };
      this.socket.addEventListener('message', handler);
      this.socket.send(JSON.stringify(authMessage));
    });
  }

  public async getTicks(symbol: string): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const reqId = Date.now();
      
      const ticksMessage = {
        ticks: symbol,
        subscribe: 1,
        req_id: reqId
      };

      const ticks: any[] = [];

      const handler = (event: MessageEvent) => {
        const data = JSON.parse(event.data);
        if (data.req_id === reqId) {
          if (data.error) {
            reject(data.error);
          } else {
            if (data.subscription) {
              ticks.push(data);
            } else {
              resolve(ticks);
              this.socket.removeEventListener('message', handler);
            }
          }
        }
      };

      this.socket.addEventListener('message', handler);
      this.socket.send(JSON.stringify(ticksMessage));
    });
  }

  public async buyContract(amount: number, symbol: string, contractType: string, barrier: string): Promise<any> {
    if (!this.isConnected) {
        return Promise.reject(new Error('WebSocket não conectado'));
    }

    await this.authenticate(this.accountData.activeToken);
    
    if (!this.isAuthenticated) {
        return Promise.reject(new Error('Não autenticado'));
    }
    
    return new Promise((resolve, reject) => {
        const generateValidID = () => {
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                const r = Math.random() * 16 | 0,
                    v = c === 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
        };
        
        const reqId = Date.now();
        const buyID = generateValidID();

        const buyMessage = {
            buy: buyID,
            price: 0.35,
            parameters: {
              amount:0.35,
              app_markup_percentage:"3",
              barrier:"4",
              basis:"stake",
              contract_type:"DIGITOVER",
              currency:"USD",
              duration:1,
              duration_unit:"t",
              symbol:"R_100"
            },
            req_id: reqId
        };

        const handler = (event: MessageEvent) => {
            const data = JSON.parse(event.data);
            if (data.req_id === reqId) {
                if (data.error) {
                    reject(data.error);
                } else {
                    resolve(data);
                }
                this.socket.removeEventListener('message', handler);
            }
        };

        this.socket.addEventListener('message', handler);
        this.socket.send(JSON.stringify(buyMessage));
    });
}

  public async getBalance(): Promise<number> {
    return new Promise((resolve, reject) => {
      const reqId = Date.now();
      
      const balanceMessage = {
        balance: 1,
        account: 'current',
        req_id: reqId
      };

      const handler = (event: MessageEvent) => {
        const data = JSON.parse(event.data);
        if (data.req_id === reqId) {
          if (data.error) {
            reject(data.error);
          } else {
            resolve(data.balance.balance);
          }
          this.socket.removeEventListener('message', handler);
        }
      };

      this.socket.addEventListener('message', handler);
      this.socket.send(JSON.stringify(balanceMessage));
    });
  }

  public switchAccount(accountType: 'real' | 'virtual'): void {
    const account = this.userInfo?.account_list.find(
      (acc: any) => accountType === 'virtual' ? acc.is_virtual : !acc.is_virtual
    );
    
    if (account) {
      this.activeLoginId = account.loginid;
    }
  }

  public getUserInfo(): any {
    return this.userInfo;
  }

  public getAcccountData(){
    console.log("getAcccountData", this.accountData);
    return this.accountData;
  }

  public onBalanceUpdate(callback: BalanceCallback): void {
    this.balanceCallbacks.push(callback);
  }

  public disconnect(): void {
    this.socket.close();
  }

}
