import WebSocket from 'ws';
import { TradeSignal, BuyRequest, TradeParameters } from '../types/types';
import moment from 'moment';
import EventEmitter from 'events';

export class TradeExecutor extends EventEmitter {
  private wsMaster: WebSocket | null = null;
  private baseUrl = `wss://ws.binaryws.com/websockets/v3?app_id=${process.env.NEXT_PUBLIC_DERIV_CLIENT_ID}`;
  private token: string;
  private currency = 'USD';
  private appMarkupPercentage = 0;
  private lastTradeParams = '';
  private lastTradeTimestamp = '';
  private requestCounter = 0;
  private duplicateProtection = true;
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 5000;
  private isTestMode = false; // Novo: modo de teste
  private mockContractId = 1000000; // Contador para IDs de contratos mock
  private latestRealContractSummary: {
    data: string;
    entry_spot_display_value?: string;
    exit_tick_display_value?: string;
    contract_id?: number | string;
    contract_type?: string;
    display_name?: string;
    payout?: number;
    profit?: number;
    status?: string;
    buy_price?: number;
    raw?: any;
    at: number;
  } | null = null;


  constructor(token: string, configure?: any) {
    super();
    this.token = token;
  }

  public getLatestRealContractSummary() {
    return this.latestRealContractSummary;
  }


  async connectToMaster(): Promise<void> {
    return new Promise(async (resolve, reject) => {
      try {
        let wsUrl = this.baseUrl;

        if (this.token && this.token.startsWith('oauth:')) {
          try {
            const parts = this.token.split(':');
            const accessToken = parts[1];
            const accountId = parts[2];
            const appId = process.env.NEXT_PUBLIC_APPID || '';

            const response = await fetch(`https://api.derivws.com/trading/v1/options/accounts/${accountId}/otp`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Deriv-App-ID': appId,
              },
            });

            if (response.ok) {
              const data = await response.json();
              if (data.data && data.data.websocket_url) {
                wsUrl = data.data.websocket_url;
              }
            } else {
              console.error('Failed to fetch OTP from Deriv:', await response.text());
            }
          } catch (error) {
            console.error('Error fetching OTP WebSocket URL:', error);
          }
        }

        this.wsMaster = new WebSocket(wsUrl);

        this.wsMaster.on('open', () => {
          //console.log('Connected to master account (real trading)');
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.emit('connected');
          resolve();
          this.authenticateReal();
        });

        this.wsMaster.on('error', (error) => {
          console.error('Master WebSocket error:', error);
          this.isConnected = false;
          this.emit('error', error);
          if (this.reconnectAttempts === 0) {
            reject(error);
          }
        });

        this.wsMaster.on('close', () => {
          //console.log('Master WebSocket disconnected');
          this.isConnected = false;
          this.emit('disconnected');
          this.attemptReconnect();
        });

        this.wsMaster.on('message', (data) => {
          this.handleMasterMessage(data.toString());
        });

      } catch (error) {
        this.emit('error', error);
        reject(error);
      }
    });
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached for master connection');
      return;
    }

    this.reconnectAttempts++;
    //console.log(`Attempting to reconnect master connection (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    setTimeout(() => {
      this.connectToMaster().catch((error) => {
        console.error('Reconnection failed:', error);
      });
    }, this.reconnectDelay * this.reconnectAttempts);
  }

  private authenticateReal(): void {
    if (this.token && this.token.startsWith('oauth:')) {
      this.balanceSubscribe();
      return;
    }

    if (this.wsMaster && this.token) {
      const authMessage = {
        authorize: this.token
      };
      this.wsMaster.send(JSON.stringify(authMessage));
    }
  }

  private balanceSubscribe() {
    const balance = {
      balance: 1,
      subscribe: 1,
    }
    this.wsMaster.send(JSON.stringify(balance));
  }

  async executeTrade(signal: TradeSignal): Promise<void> {
    try {

      // Implementa lógica similar ao method_348
      if (!this.wsMaster || !this.isConnected) {
        const error = new Error('Conta real não conectada');
        this.emit('error', error);
        await this.connectToMaster();
      }

      // Proteção contra duplicatas
      if (this.duplicateProtection && this.isDuplicateTrade(signal)) {
        const error = new Error('Trade duplicado bloqueado');
        this.emit('warning', error);
        return;
      }

      // Incrementa contador de requisições
      this.requestCounter++;
      const requestId = this.requestCounter;

      // Constrói e envia a requisição de compra
      const buyRequest = this.buildBuyRequest(signal, requestId);

      //this.emit('transaction', buyRequest);

      /*@ts-ignore*/
      this.wsMaster.send(JSON.stringify(buyRequest));

      this.updateLastTradeInfo(signal);

    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  private buildBuyRequest(signal: TradeSignal, requestId: number): BuyRequest {
    // Implementa lógica avançada baseada no method_220 do ZeeX
    const parameters: any = {
      underlying_symbol: signal.symbol,
      contract_type: signal.contractType,
      duration: signal.duration,
      duration_unit: signal.durationUnit || 't',
      basis: 'stake',
      amount: signal.amount,
      currency: this.currency
    };

    // Adiciona barreira baseado no tipo de contrato e validação avançada
    if (signal.barrier && this.shouldIncludeBarrierAdvanced(signal.contractType, signal.barrier)) {
      parameters.barrier = signal.barrier;
    }

    // Adiciona markup se configurado
    if (this.appMarkupPercentage > 0) {
      parameters.app_markup_percentage = this.appMarkupPercentage;
    }

    return {
      buy: '1',
      subscribe: 1,
      price: signal.amount,
      req_id: requestId,
      parameters
    };
  }

  private shouldIncludeBarrierAdvanced(contractType: string, barrier?: string): boolean {
    const barrierTypes = [
      'CALL', 'PUT', 'CALLE', 'PUTE',
      'ONETOUCH', 'NOTOUCH',
      'RESETCALL', 'RESETPUT',
      'RUNHIGH', 'RUNLOW',
      'DIGITOVER', 'DIGITUNDER',
      'DIGITODD', 'DIGITEVEN',
      'DIGITMATCH', 'DIGITDIFF'
    ];

    if (!barrierTypes.includes(contractType)) {
      return false;
    }

    // Validação mais rigorosa da barreira
    if (contractType.startsWith('DIGIT')) {
      // Para contratos de dígito, a barreira deve ser um dígito (0-9)
      return /^[0-9]$/.test(barrier);
    }

    // Para outros tipos, aceita números com sinal ou sem sinal
    return /^[+-]?\d*\.?\d+$/.test(barrier) || /^[+-]\d/.test(barrier);
  }

  private isDuplicateTrade(signal: TradeSignal): boolean {
    const currentTimestamp = new Date().toISOString().slice(0, 19); // YYYY-MM-DD HH:mm:ss
    const currentParams = `${signal.symbol}|${signal.contractType}|${signal.amount}|${signal.barrier}|${signal.duration}|${signal.durationUnit}`;

    // Verifica se é a mesma operação no mesmo segundo
    if (currentTimestamp === this.lastTradeTimestamp && currentParams === this.lastTradeParams) {
      return true;
    }

    // Verifica se é uma operação muito próxima (proteção adicional)
    const lastTime = new Date(this.lastTradeTimestamp).getTime();
    const currentTime = new Date(currentTimestamp).getTime();
    const timeDiff = currentTime - lastTime;

    if (timeDiff === 1000 && currentParams === this.lastTradeParams) {
      // Bloqueia se for exatamente 1 segundo depois com os mesmos parâmetros
      return true;
    }

    return false;
  }

  private updateLastTradeInfo(signal: TradeSignal): void {
    this.lastTradeTimestamp = new Date().toISOString().slice(0, 19);
    this.lastTradeParams = `${signal.symbol}|${signal.contractType}|${signal.amount}|${signal.barrier}|${signal.duration}|${signal.durationUnit}`;
  }

  private handleMasterMessage(data: string): void {
    try {
      const message = JSON.parse(data);
      if (message.msg_type === 'proposal_open_contract' && (message.proposal_open_contract.status === 'won' || message.proposal_open_contract.status === 'lost')) {
        this.emit('transaction', message.proposal_open_contract);
      }


      if (message.msg_type === 'buy') {
        if (message.error) {
          const error = new Error(`Erro na compra: ${message.error.message}`);
          this.emit('error', error);
        } else {
          this.emit('success', { message: 'Trade executado com sucesso', data: message.buy });
        }
      }

      if (message.msg_type === 'authorize') {
        if (message.authorize) {
          this.emit('balance', message.authorize.balance);
        }
        this.balanceSubscribe();
      }

      if (message.msg_type === 'balance') {
        this.emit('balance', message.balance.balance);
      }
    } catch (error) {
      this.emit('error', new Error(`Erro ao processar mensagem: ${error.message}`));
    }
  }

  setDuplicateProtection(enabled: boolean): void {
    this.duplicateProtection = enabled;
  }

  setCurrency(currency: string): void {
    this.currency = currency;
  }

  setAppMarkupPercentage(percentage: number): void {
    this.appMarkupPercentage = percentage;
  }

  disconnect(): void {
    if (this.wsMaster) {
      this.wsMaster.close();
      this.wsMaster = null;
    }
  }

}
