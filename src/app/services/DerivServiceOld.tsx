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
    tokens: AccountToken[];
  }

export default class DerivService {
  private user: AccountData;
  private appId = "";
  private error = "";
  static instance;
  

  constructor() {
    this.appId = process.env.NEXT_PUBLIC_APPID;
    if (DerivService.instance) {
      return DerivService.instance;
    }

    DerivService.instance = this;
  }

  static getInstance() {
    if (!DerivService.instance) {
      DerivService.instance = new DerivService();
    }
    return DerivService.instance;
  }
  /**
   * 
   * Ao iniciar a aplicação, é necessário verificar se há parametros de login no URL.
   * Caso haja, os token são processados e armazenados no localStorage.
   */
  public async init() {
    
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
    const userData = this.getStorageDerivAccount();
    if (userData && userData.length > 0) {
      this.setAccount(userData);
      return this.getUser()[0];
    
    }
    const tokens = this.getTokens();

    if (!tokens || tokens.length === 0) {
      return;
    }

    let accountVRT = tokens.find((item) => item.is_virtual);
    accountVRT.balance = 0

    let accountCRT = tokens.find((item) => !item.is_virtual);

    if (!accountVRT || !accountCRT) {
      return;
    }

    const authorizeDataVRT = await this.authorizeAccount(accountVRT.token);
    const authorizeDataCRT = await this.authorizeAccount(accountCRT.token);
    
    accountVRT.balance = authorizeDataVRT.balance;
    accountCRT.balance = authorizeDataCRT.balance;

    this.user = {
      activeToken: accountVRT.token,
      amount: 0.35,
      finishedTradeList: [],
      lastTrade: null,
      name: authorizeDataVRT.fullname,
      openTradeId: null,
      results: {
        loss: 0,
        result: 0,
        wins: 0,
      },
      selectedLoginId: accountVRT.acct,
      tokens: [accountVRT, accountCRT],
    };
    
    localStorage.setItem("deriv_accounts", JSON.stringify([this.user]));
    
  }


  public clearTokens() {
    localStorage.removeItem("tokens_list");
    localStorage.removeItem("deriv_accounts");
  }

  /**
   * 
   * @returns {Array} Retorna uma lista com dados da conta
   */
  public getStorageDerivAccount(){
    const storedAccounts = JSON.parse(localStorage.getItem("deriv_accounts") || "[]");
    return storedAccounts;
  }

  public setStorageDerivAccount(account: any) {
    localStorage.setItem("deriv_accounts", JSON.stringify(account));
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

  public setAccount(account: any) {
    this.user = account;
  }

  public getUser() {
    return this.user;
  }

  public createApiInstance() {
    
  }

  public loginDeriv() {
    window.location.href = `https://oauth.deriv.com/oauth2/authorize?app_id=${this.appId}`;
  }

   /**
   * Processa a resposta da autorização do Deriv.
   * @param param - Parametros de autorização.
   */
  public async processLoginResponse(params) {
    
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
    
  public async authorizeAccount(token: string): Promise<any> {
    return new Promise((resolve, reject) => {
      try {
        const ws = new WebSocket(`wss://ws.derivws.com/websockets/v3?app_id=${this.appId}&l=pt`);
        
        ws.onopen = () => {
          ws.send(JSON.stringify({ authorize: token }));
        };
  
        ws.onmessage = (message: MessageEvent) => {
          const response = JSON.parse(message.data);
          
          if (response.error) {
            this.setError(response.error.message);
            ws.close();
            reject(response.error.message);
            return;
          }
          
          if (response.authorize) {
            ws.close();
            resolve(response.authorize);
          }
        };
  
        ws.onerror = () => {
          this.setError("Erro na conexão com a API Deriv");
          reject("Erro na conexão com a API Deriv");
        };
      } catch (err) {
        this.setError("Erro na conexão com a API Deriv");
        reject("Erro na conexão com a API Deriv");
      }
    });
  }

  /**
   * Compra um contrato de opção binária do tipo "over" ou "under".
   * 
   * Exemplo de uso:
   * // Exemplo de uso:
    const derivService = DerivService.getInstance();
    await derivService.buyContract('over', 5, 10.00, 'R_100')
    .then(response => console.log('Contrato comprado:', response))
    .catch(error => console.error('Erro:', error));
   * 
   * @param market  - O tipo de mercado, "under" ou "over".
   * @param duration - A duração do contrato em segundos.
   * @param amount  - A quantidade de contratos a serem comprados.
   * @param symbol  - O símbolo do contrato, volatilidade.
   * @returns  - Um objeto contendo informações sobre a compra do contrato.
   */
  public async buyContract(
    market: 'under' | 'over',
    duration: number,
    amount: number,
    symbol: string
  ): Promise<BuyContractResponse> {
    if (!this.user?.activeToken) {
      throw new Error('Nenhum token ativo encontrado. Autentique-se primeiro.');
    }
  
    const token = this.user.activeToken;
    const currency = this.user.tokens.find(t => t.token === token)?.currency || 'USD';
    const contractType = market === 'under' ? 'DIGITUNDER' : 'DIGITOVER';
  
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(`wss://ws.derivws.com/websockets/v3?app_id=${this.appId}&l=pt`);
  
      ws.onopen = () => {
        ws.send(JSON.stringify({ authorize: token }));
      };
  
      ws.onmessage = (message: MessageEvent) => {
        const response = JSON.parse(message.data);
  
        if (response.error) {
          reject(response.error.message);
          ws.close();
          return;
        }
  
        if (response.authorize) {
          // Envia proposta após autenticação
          const proposalRequest = {
            proposal: 1,
            amount,
            basis: 'stake',
            contract_type: contractType,
            currency,
            duration,
            duration_unit: 't', // 't' para ticks ou 's' para segundos
            symbol,
          };
          ws.send(JSON.stringify(proposalRequest));
        } else if (response.proposal) {
          // Envia ordem de compra após proposta
          const buyRequest = {
            buy: response.proposal.id,
            price: response.proposal.ask_price,
          };
          ws.send(JSON.stringify(buyRequest));
        } else if (response.buy) {
          resolve(response);
          ws.close();
        }
      };
  
      ws.onerror = (error) => {
        reject(error);
        ws.close();
      };
    });
  }

  public setError(error: string) {
    this.error = error;
  }

  public getError(): string {
    return this.error;
  }

}
