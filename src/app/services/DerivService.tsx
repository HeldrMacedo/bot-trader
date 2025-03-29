// DerivService.tsx
"use client";

import Deriv from "./deriv"; // ajuste o caminho conforme sua estrutura
import simpleObserver from "./simple-observer";
import DeriveAPI from "@deriv/deriv-api";

// Tipos básicos para as respostas (ajuste conforme a resposta real da API)
interface DerivResponse {
  loginid?: string;
  email?: string;
  fullname?: string;
  currency?: string;
  balance?: {
    balance: string | number;
    currency: string;
  };
  account_list?: Array<{
    loginid: string;
    is_virtual: boolean;
    currency: string;
  }>;
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
  private apiInstance: ReturnType<typeof Deriv.createApiInstance>;
  private user: AccountData;
  private appId = process.env.NEXT_PUBLIC_APP_ID;
  private error = "";
  

  constructor() {
    // Inicializa as configurações do Deriv a partir dos dados presentes no DOM (meta tags, query tokens, etc)
    if (typeof window !== "undefined") {
      Deriv.init();
      this.apiInstance = Deriv.createApiInstance();
    } else {
      throw new Error("DerivService deve ser instanciado no lado do cliente.");
    }
  }

  public init() {
    const storedAccounts = JSON.parse(localStorage.getItem("deriv_accounts") || "[]");

    if (storedAccounts.length > 0) {
        this.setAccount(storedAccounts[0]);
    }
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

  public async processLoginResponse(): Promise<AccountData[]> {
    const params = new URLSearchParams(window.location.search);
    const accounts: AccountData[] = [];
  
    if (params.size > 0) {
      let index = 1;
  

      while (params.get(`acct${index}`)) {
        const acct = params.get(`acct${index}`);
        const token = params.get(`token${index}`);
        const currency = params.get(`cur${index}`) || "USD";
  
        if (!token || !acct) break;
  
        try {
          const responseAuthorize = await this.authorizeAccount(token);
          if (index === 1) {
            accounts.push({
              activeToken: token,
              amount: 0.35,
              finishedTradeList: [],
              lastTrade: null,
              name: responseAuthorize.fullname,
              openTradeId: null,
              results: {
                loss: 0,
                result: 0,
                wins: 0,
              },
              selectedLoginId: acct,
              tokens: [{
                loginid: acct,
                token,
                currency: currency.toUpperCase(),
                balance: responseAuthorize.balance,
                is_virtual: responseAuthorize.is_virtual,
              }],
            });
          } else {
            accounts[0].tokens.push({
              loginid: acct,
              token,
              currency: currency.toUpperCase(),
              balance: responseAuthorize.balance,
              is_virtual: responseAuthorize.is_virtual,
            });
          }
        } catch (error) {
          console.error("Erro na autorização do token", token, error);
          break;
        }
  
        index++;
      }

        localStorage.setItem("deriv_accounts", JSON.stringify(accounts));
      window.history.replaceState(null, "", window.location.pathname);
    }
  
    return accounts;
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

  public setError(error: string) {
    this.error = error;
  }

  public getError(): string {
    return this.error;
  }

  /**
   * Define o token ativo para autorização.
   * @param token - Token recebido da autenticação.
   */
  public setToken(token: string) {
    Deriv.setToken(token);
  }

  /**
   * Retorna o token ativo armazenado.
   */
  public getToken(): string | null {
    return Deriv.getToken();
  }

  /**
   * Realiza a autorização enviando o token para a API da Deriv.
   * @param token - Token de autorização.
   */
  public async authorize(token: string): Promise<DerivResponse> {
    return this.apiInstance.send({ authorize: token });
  }

  /**
   * Obtém as configurações da conta.
   */
  public async getSettings(): Promise<DerivResponse> {
    return this.apiInstance.send({ get_settings: 1 });
  }

  /**
   * Obtém o balanço da conta.
   */
  public async getBalance(): Promise<DerivResponse> {
    return this.apiInstance.send({ balance: 1 });
  }

  /**
   * Exemplo de método para comprar um contrato.
   * @param payload - Objeto contendo os parâmetros do contrato, por exemplo:
   * { contract_type: "DIGITOVER", amount: 10, basis: "stake", duration: 5, duration_unit: "t", symbol: "R_100", barrier: 5 }
   */
  public async buyContract(payload: Record<string, any>): Promise<DerivResponse> {
    return this.apiInstance.send({ buy: 1, ...payload });
  }

  /**
   * Permite inscrever em atualizações (por exemplo, para ticks ou candles).
   * @param payload - Parâmetros para a inscrição.
   */
  public async subscribe(payload: Record<string, any>): Promise<DerivResponse> {
    return this.apiInstance.subscribe(payload);
  }

  /**
   * Fecha a conexão e limpa os recursos.
   */
  public destroy() {
    this.apiInstance.destroy();
  }
}
