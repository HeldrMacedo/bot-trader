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

  
  constructor(token: string, configure?: any) {
    super();
    this.token = token;
    //this.isTestMode = configure?.testMode || false;
    this.isTestMode = false;
    console.log(`TradeExecutor initialized in ${this.isTestMode ? 'TEST' : 'LIVE'} mode`);
  }

  // Novo: método para alternar modo de teste
  public setTestMode(enabled: boolean): void {
    this.isTestMode = enabled;
    console.log(`TradeExecutor switched to ${this.isTestMode ? 'TEST' : 'LIVE'} mode`);
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
      
      // if (this.isTestMode) {
      //   await this.simulateTestTrade(signal);
      //   return;
      // }
      
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
      //this.emit('transaction', buyRequest);
      
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
      
      if (message.msg_type === 'proposal_open_contract' && (message.proposal_open_contract.status === 'won' || message.proposal_open_contract.status === 'lost')) {
        this.emit('transaction', message.proposal_open_contract);
      }
      

      if (message.msg_type === 'buy') {
        if (message.error) {
          console.error('Buy error:', message.error);
        } else {
          console.log('Buy successful:', message.buy);
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

   // Novo: método para simular transações de teste
  private async simulateTestTrade(signal: TradeSignal): Promise<void> {
    console.log('🧪 SIMULATING TEST TRADE:', signal);
    
    // Incrementa contador de requisições
    this.requestCounter++;
    this.mockContractId++;
    
    // Simula tempo de processamento da compra (1-3 segundos)
    // const buyProcessingTime = Math.random() * 2000 + 1000;
    
    // // Simula resposta de compra bem-sucedida
    // setTimeout(() => {
    //   const buyResponse = {
    //     msg_type: 'buy',
    //     buy: {
    //       balance_after: 10000 - signal.amount, // Simula saldo após compra
    //       buy_price: signal.amount,
    //       contract_id: this.mockContractId,
    //       longcode: `Mock contract for ${signal.contractType} on ${signal.symbol}`,
    //       payout: signal.amount * 1.8, // Simula payout de 80%
    //       purchase_time: Math.floor(Date.now() / 1000),
    //       shortcode: `${signal.contractType}_${signal.symbol}_${signal.amount}_${Math.floor(Date.now() / 1000)}_${signal.duration}${signal.durationUnit}_${signal.barrier || '0'}_0`,
    //       start_time: Math.floor(Date.now() / 1000),
    //       transaction_id: this.mockContractId * 10
    //     }
    //   };
      
    //   console.log('🧪 Mock buy response:', buyResponse);
    // }, buyProcessingTime);
    
    // Simula tempo de duração do contrato (baseado na duração do sinal)
    const contractDuration = this.calculateContractDuration(signal);
    
    setTimeout(() => {
      this.simulateContractResult(signal);
    }, contractDuration);
    
    // Atualiza parâmetros da última operação
    this.updateLastTradeInfo(signal);
  }

  // Novo: calcula duração do contrato em milissegundos
  private calculateContractDuration(signal: TradeSignal): number {
    const duration = parseInt(signal.duration.toString());
    const unit = signal.durationUnit || 't';
    
    switch (unit) {
      case 't': // ticks
        return duration * 2000; // ~2 segundos por tick
      case 's': // segundos
        return duration * 1000;
      case 'm': // minutos
        return duration * 60 * 1000;
      case 'h': // horas
        return duration * 60 * 60 * 1000;
      default:
        return 10000; // 10 segundos padrão
    }
  }

  // Novo: simula resultado do contrato (win/loss aleatório)
  private simulateContractResult(signal: TradeSignal): void {
    // Gera resultado aleatório (50% chance de win/loss)
    const isWin = Math.random() > 0.5;
    const status = isWin ? 'won' : 'lost';
    
    // Gera valores realistas baseados no exemplo fornecido
    const entrySpot = 1200 + Math.random() * 20; // Entre 1200-1220
    const exitSpot = entrySpot + (Math.random() - 0.5) * 10; // Variação de ±5
    const payout = isWin ? signal.amount * 1.8 : 0;
    const profit = isWin ? (payout - signal.amount) : -signal.amount;
    
    const mockProposalOpenContract = {
      echo_req: {
        contract_id: this.mockContractId,
        proposal_open_contract: 1,
        req_id: this.requestCounter,
        subscribe: 1
      },
      msg_type: 'proposal_open_contract',
      proposal_open_contract: {
        account_id: 12345678,
        audit_details: {
          all_ticks: [
            {
              epoch: Math.floor(Date.now() / 1000) - 10,
              tick: entrySpot,
              tick_display_value: entrySpot.toFixed(2)
            },
            {
              epoch: Math.floor(Date.now() / 1000),
              tick: exitSpot,
              tick_display_value: exitSpot.toFixed(2)
            }
          ]
        },
        barrier: signal.barrier || '3',
        barrier_count: 1,
        bid_price: 0,
        buy_price: signal.amount,
        contract_id: this.mockContractId,
        contract_type: signal.contractType,
        currency: this.currency,
        current_spot: exitSpot,
        current_spot_display_value: exitSpot.toFixed(2),
        current_spot_time: Math.floor(Date.now() / 1000),
        date_expiry: Math.floor(Date.now() / 1000),
        date_settlement: Math.floor(Date.now() / 1000),
        date_start: Math.floor(Date.now() / 1000) - 10,
        display_name: 'Índice Volatility 100 (Mock)',
        entry_spot: entrySpot,
        entry_spot_display_value: entrySpot.toFixed(2),
        entry_tick: entrySpot,
        entry_tick_display_value: entrySpot.toFixed(2),
        entry_tick_time: Math.floor(Date.now() / 1000) - 10,
        exit_tick: exitSpot,
        exit_tick_display_value: exitSpot.toFixed(2),
        exit_tick_time: Math.floor(Date.now() / 1000),
        expiry_time: Math.floor(Date.now() / 1000),
        id: `mock-${this.mockContractId}-${Date.now()}`,
        is_expired: 1,
        is_forward_starting: 0,
        is_intraday: 1,
        is_path_dependent: 0,
        is_settleable: 1,
        is_sold: 0,
        is_valid_to_cancel: 0,
        is_valid_to_sell: 1,
        longcode: `🧪 TESTE: Receba o pagamento se o último dígito de Índice Volatility 100 for estritamente superior a ${signal.barrier || '3'} após ${signal.duration} ${signal.durationUnit || 'ticks'}.`,
        payout: payout,
        profit: profit,
        profit_percentage: isWin ? ((profit / signal.amount) * 100) : -100,
        purchase_time: Math.floor(Date.now() / 1000) - 10,
        shortcode: `${signal.contractType}_R_100_${payout}_${Math.floor(Date.now() / 1000)}_${signal.duration}${signal.durationUnit || 'T'}_${signal.barrier || '3'}_0`,
        status: status,
        tick_count: parseInt(signal.duration.toString()),
        tick_stream: [
          {
            epoch: Math.floor(Date.now() / 1000),
            tick: exitSpot,
            tick_display_value: exitSpot.toFixed(2)
          }
        ],
        transaction_ids: {
          buy: this.mockContractId * 10
        },
        underlying: signal.symbol
      },
      req_id: this.requestCounter,
      subscription: {
        id: `mock-${this.mockContractId}-${Date.now()}`
      }
    };

    console.log(`🧪 Mock contract result: ${status.toUpperCase()} - Profit: ${profit}`);
    console.log('🧪 Mock proposal_open_contract:', mockProposalOpenContract);
    
    // Atualiza o resumo do contrato
    this.latestRealContractSummary = {
      data: moment().format('DD/MM/YYYY HH:mm:ss'),
      entry_spot_display_value: entrySpot.toFixed(2),
      exit_tick_display_value: exitSpot.toFixed(2),
      contract_id: this.mockContractId,
      contract_type: signal.contractType,
      display_name: 'Índice Volatility 100 (Mock)',
      payout: payout,
      profit: profit,
      status: status,
      buy_price: signal.amount,
      raw: mockProposalOpenContract.proposal_open_contract,
      at: Date.now(),
    };
    
    // Emite o evento de transação para o copy trading service
    this.emit('transaction', mockProposalOpenContract.proposal_open_contract);
  }

}
