import WebSocket from 'ws';
import { TradeSignal, BuyRequest, TradeParameters } from '../types/types';
import moment from 'moment';
import EventEmitter from 'events';

export class TradeExecutor extends EventEmitter {
  private wsMaster: WebSocket | null = null;
  private baseUrl = 'wss://ws.binaryws.com/websockets/v3?app_id=67957';
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
    return new Promise((resolve, reject) => {
      try {
        this.wsMaster = new WebSocket(this.baseUrl);
        
        this.wsMaster.on('open', () => {
          console.log('Connected to master account (real trading)');
          this.isConnected = true;
          this.reconnectAttempts = 0;
          resolve();
          this.authenticateReal();
        });
        
        this.wsMaster.on('error', (error) => {
          console.error('Master WebSocket error:', error);
          this.isConnected = false;
          if (this.reconnectAttempts === 0) {
            reject(error);
          }
        });

        this.wsMaster.on('close', () => {
          console.log('Master WebSocket disconnected');
          this.isConnected = false;
          this.attemptReconnect();
        });
        
        this.wsMaster.on('message', (data) => {
          this.handleMasterMessage(data.toString());
        });
        
      } catch (error) {
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
    console.log(`Attempting to reconnect master connection (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    setTimeout(() => {
      this.connectToMaster().catch((error) => {
        console.error('Reconnection failed:', error);
      });
    }, this.reconnectDelay * this.reconnectAttempts);
  }

  private authenticateReal(): void {
    console.log('Authenticating real account fora');
    if (this.wsMaster && this.token) {
      console.log("ENTROU AUTHENTICA REAL");
      const authMessage = {
        authorize: this.token
      };
      this.wsMaster.send(JSON.stringify(authMessage));
    }
  }

  async executeTrade(signal: TradeSignal): Promise<void> {
    try {
      // Implementa lógica similar ao method_348
      if (!this.wsMaster || !this.isConnected) {
        console.log('Master not connected, attempting reconnection...');
        await this.connectToMaster();
      }

      // Proteção contra duplicatas
      if (this.duplicateProtection && this.isDuplicateTrade(signal)) {
        console.log('Duplicate trade blocked');
        return;
      }

      // Incrementa contador de requisições
      this.requestCounter++;
      const requestId = this.requestCounter;
      
      // Constrói e envia a requisição de compra
      const buyRequest = this.buildBuyRequest(signal, requestId);
      
      console.log('Sending buy request:', JSON.stringify(buyRequest, null, 2));
      /*@ts-ignore*/
      this.wsMaster.send(JSON.stringify(buyRequest));
      
      // Atualiza parâmetros da última operação
      this.updateLastTradeInfo(signal);
      
    } catch (error) {
      console.error('Error executing trade:', error);
      throw error;
    }
  }

  private buildBuyRequest(signal: TradeSignal, requestId: number): BuyRequest {
    // Implementa lógica avançada baseada no method_220 do ZeeX
    const parameters: any = {
      symbol: signal.symbol,
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

    console.log('Built buy request parameters:', parameters);

    return {
      buy: '1',
      subscribe: 1,
      price: signal.amount,
      req_id: requestId,
      parameters
    };
  }

  private shouldIncludeBarrierAdvanced(contractType: string, barrier: string): boolean {
    // Lógica avançada baseada no method_394
    const barrierTypes = [
      'CALL', 'PUT', 'ONETOUCH', 'NOTOUCH', 
      'DIGITOVER', 'DIGITUNDER', 'DIGITMATCH', 'DIGITDIFF'
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
      console.log('Received MASTER MESSAGE:', message);

      if (message.msg_type === 'proposal_open_contract' && message.proposal_open_contract) {
        const poc = message.proposal_open_contract;

        this.latestRealContractSummary = {
          data: moment().format('DD/MM/YYYY HH:mm:ss'),
          entry_spot_display_value: poc.entry_spot_display_value,
          exit_tick_display_value: poc.exit_tick_display_value,
          contract_id: poc.contract_id,
          contract_type: poc.contract_type,
          display_name: poc.display_name,
          payout: poc.payout,
          profit: poc.profit,
          status: poc.status,
          buy_price: poc.buy_price,
          raw: poc,
          at: Date.now(),
        };

        // Opcional: log amigável
        console.log('Real contract update (proposal_open_contract):', this.latestRealContractSummary);
      }


      if (message.msg_type === 'buy') {
        if (message.error) {
          console.error('Buy error:', message.error);
        } else {
          console.log('Buy successful:', message.buy);
        }
      }
      
      if (message.msg_type === 'transaction') {
        console.log('Transaction update:', message.transaction);
        this.emit('transaction', message.transaction);
      }
      
    } catch (error) {
      console.error('Error handling master message:', error);
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