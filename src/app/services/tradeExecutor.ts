import WebSocket from 'ws';
import { TradeSignal, BuyRequest, TradeParameters } from '../types/types';
import moment from 'moment';
import EventEmitter from 'events';

export class TradeExecutor extends EventEmitter {
  private wsMaster: WebSocket | null = null;
  private baseUrl = `wss://ws.binaryws.com/websockets/v3?app_id=${process.env.NEXT_PUBLIC_APPID}`;
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

  proporsal = {
    account_id: 78759608,
    audit_details: { all_ticks: [Array] },
    barrier: '5899.882',
    barrier_count: 1,
    bid_price: 0,
    buy_price: 10,
    contract_id: 296013128388,
    contract_type: 'CALL',
    currency: 'USD',
    current_spot: 5899.365,
    current_spot_display_value: '5899.365',
    current_spot_time: 1759702390,
    date_expiry: 1759702388,
    date_settlement: 1759702388,
    date_start: 1759702376,
    display_name: 'Volatility 10 Index',
    entry_spot: 5899.539,
    entry_spot_display_value: '5899.539',
    entry_tick: 5899.539,
    entry_tick_display_value: '5899.539',
    entry_tick_time: 1759702378,
    exit_tick: 5899.347,
    exit_tick_display_value: '5899.347',
    exit_tick_time: 1759702388,
    expiry_time: 1759702388,
    id: 'a9945a89-8eca-e2b9-80da-00abbb8f608e',
    is_expired: 1,
    is_forward_starting: 0,
    is_intraday: 1,
    is_path_dependent: 0,
    is_settleable: 1,
    is_sold: 1,
    is_valid_to_cancel: 0,
    is_valid_to_sell: 0,
    longcode: 'Win payout if Volatility 10 Index after 5 ticks is strictly higher than entry spot plus 0.343.',
    payout: 61.38,
    profit: -10,
    profit_percentage: -100,
    purchase_time: 1759702376,
    sell_price: 0,
    sell_spot: 5899.347,
    sell_spot_display_value: '5899.347',
    sell_spot_time: 1759702388,
    sell_time: 1759702388,
    shortcode: 'CALL_R_10_61.38_1759702376_5T_S343P_0',
    status: 'lost',
    tick_count: 5,
    tick_stream: [ [Object], [Object], [Object], [Object], [Object], [Object] ],
    transaction_ids: { buy: 589482538968, sell: 589482562488 },
    underlying: 'R_10',
    validation_error: 'This contract has been sold.',
    validation_error_code: 'General'
  }
  
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
    if (this.wsMaster && this.token) {
      const authMessage = {
        authorize: this.token
      };
      this.wsMaster.send(JSON.stringify(authMessage));
    }
  }

  private balanceSubscribe(){
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
      
      console.log('SEND BUY REQUEST:', JSON.stringify(buyRequest, null, 2));
      //this.emit('transaction', buyRequest);

      /*@ts-ignore*/
      this.wsMaster.send(JSON.stringify(buyRequest));
      
      // Atualiza parâmetros da última operação
      this.updateLastTradeInfo(signal);
      
    } catch (error) {
      this.emit('error', error);
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

    //console.log('Built buy request parameters:', parameters);

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
      //console.log('Received MASTER MESSAGE:', message);

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
        //console.log('Real contract update (proposal_open_contract):', this.latestRealContractSummary);
      }
      
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
