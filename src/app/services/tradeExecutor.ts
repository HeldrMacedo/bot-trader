import WebSocket from 'ws';
import { TradeSignal, BuyRequest, TradeParameters } from '../types/types';
import moment from 'moment';
import EventEmitter from 'events';
import { resolveDerivConnection } from './derivConfig';

const PING_INTERVAL_MS = 20000;
// Prazo para a Deriv responder ao buy; sem resposta não dá para saber se a ordem existe.
const BUY_RESPONSE_TIMEOUT_MS = 30000;
// Folga sobre a duração do contrato para o resultado chegar (liquidação + reconexão).
const SETTLEMENT_GRACE_MS = 60000;
// Ticks dos sintéticos saem a cada 1s (1HZ*) ou 2s (R_*): usa o pior caso.
const DURATION_UNIT_MS: Record<string, number> = { t: 2000, s: 1000, m: 60000, h: 3600000, d: 86400000 };

export class TradeExecutor extends EventEmitter {
  private wsMaster: WebSocket | null = null;
  private token: string;
  private needsAuthorize = false;
  private pingTimer: NodeJS.Timeout | null = null;
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
  private reconnectTimer: NodeJS.Timeout | null = null;
  // Incrementa a cada disconnect(): conexões e reconexões em andamento ficam obsoletas
  private connectionGeneration = 0;
  private isTestMode = false; // Novo: modo de teste
  private mockContractId = 1000000; // Contador para IDs de contratos mock
  private emittedContractIds = new Set<string | number>(); // Evita emitir transaction duplicada para o mesmo contrato
  private pendingBuy: { durationMs: number; timer: NodeJS.Timeout } | null = null;
  // Contratos comprados ainda sem resultado: reassinados a cada reconexão, com prazo de liquidação
  private openContracts = new Map<string | number, NodeJS.Timeout>();
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
    this.isTestMode = configure?.testMode || false;
  }

  public getLatestRealContractSummary() {
    return this.latestRealContractSummary;
  }


  async connectToMaster(): Promise<void> {
    const generation = this.connectionGeneration;
    return new Promise(async (resolve, reject) => {
      try {
        // Resolve URL + auth pela camada central (oauth:->OTP / clássico->authorize).
        // OTP é de uso único, então resolvemos a cada (re)conexão.
        const conn = await resolveDerivConnection(this.token, this.isTestMode ? "demo" : "real");

        // disconnect() durante o resolve: não abre um socket órfão na conta real
        if (generation !== this.connectionGeneration) {
          reject(new Error('Conexão com a Deriv cancelada'));
          return;
        }

        this.needsAuthorize = conn.needsAuthorize;

        // Uma conexão viva por vez: a anterior fica obsoleta e seus eventos são ignorados
        const previous = this.wsMaster;
        const ws = new WebSocket(conn.url);
        this.wsMaster = ws;
        this.isConnected = false;
        this.stopPing();
        previous?.close();
        let opened = false;

        ws.on('open', () => {
          if (this.wsMaster !== ws) return;
          opened = true;
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.emit('connected');
          this.startPing();
          resolve();
          this.authenticateReal(conn.needsAuthorize, conn.token);
        });

        ws.on('error', (error: any) => {
          console.error('Master WebSocket error:', error);
          reject(error);
          if (this.wsMaster !== ws) return;
          this.isConnected = false;
          this.emit('error', error);
        });

        ws.on('close', () => {
          if (!opened) {
            reject(new Error('Conexão com a Deriv fechada antes de abrir'));
          }
          if (this.wsMaster !== ws) return;
          this.isConnected = false;
          this.stopPing();
          this.emit('disconnected');
          // Falha antes de abrir é tratada por quem chamou (retry do start, executeTrade ou a própria reconexão)
          if (opened) {
            this.attemptReconnect();
          }
        });

        ws.on('message', (data: any) => {
          this.handleMasterMessage(data.toString());
        });

      } catch (error) {
        this.emit('error', error);
        reject(error);
      }
    });
  }

  private startPing(): void {
    this.stopPing();
    this.pingTimer = setInterval(() => {
      if (this.wsMaster && this.isConnected) {
        this.wsMaster.send(JSON.stringify({ ping: 1 }));
      }
    }, PING_INTERVAL_MS);
  }

  private stopPing(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached for master connection');
      return;
    }

    this.reconnectAttempts++;
    const generation = this.connectionGeneration;

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      // O executeTrade pode ter reconectado antes do timer
      if (this.isConnected) return;
      this.connectToMaster().catch((error) => {
        console.error('Reconnection failed:', error);
        if (generation === this.connectionGeneration) {
          this.attemptReconnect();
        }
      });
    }, this.reconnectDelay * this.reconnectAttempts);
  }

  private authenticateReal(needsAuthorize: boolean, token: string): void {
    if (!needsAuthorize) {
      // Socket OTP já autorizado: assina o saldo diretamente.
      this.balanceSubscribe();
      this.resubscribeOpenContracts();
      return;
    }

    if (this.wsMaster && token) {
      // Token clássico: o saldo é assinado após o authorize OK (handleMasterMessage).
      this.wsMaster.send(JSON.stringify({ authorize: token }));
    }
  }

  private balanceSubscribe() {
    const balance = {
      balance: 1,
      subscribe: 1,
    }
    this.wsMaster.send(JSON.stringify(balance));
  }

  // O subscribe do buy morre com o socket antigo: sem isso o resultado nunca chega.
  private resubscribeOpenContracts() {
    for (const contractId of this.openContracts.keys()) {
      this.wsMaster.send(JSON.stringify({ proposal_open_contract: 1, contract_id: contractId, subscribe: 1 }));
    }
  }

  private startBuyTimeout(signal: TradeSignal) {
    this.clearPendingBuy();
    const durationMs = signal.duration * (DURATION_UNIT_MS[signal.durationUnit || 't'] ?? DURATION_UNIT_MS.d);
    const timer = setTimeout(() => {
      this.pendingBuy = null;
      this.emit('tradeTimeout', new Error(`Deriv não respondeu à compra em ${BUY_RESPONSE_TIMEOUT_MS / 1000}s`));
    }, BUY_RESPONSE_TIMEOUT_MS);
    this.pendingBuy = { durationMs, timer };
  }

  private clearPendingBuy() {
    if (this.pendingBuy) {
      clearTimeout(this.pendingBuy.timer);
      this.pendingBuy = null;
    }
  }

  private trackOpenContract(contractId: string | number, durationMs: number) {
    const timer = setTimeout(() => {
      this.openContracts.delete(contractId);
      this.emit('tradeTimeout', new Error(`Resultado do contrato ${contractId} não chegou da Deriv`));
    }, durationMs + SETTLEMENT_GRACE_MS);
    this.openContracts.set(contractId, timer);
  }

  private settleOpenContract(contractId: string | number) {
    const timer = this.openContracts.get(contractId);
    if (timer) {
      clearTimeout(timer);
      this.openContracts.delete(contractId);
    }
  }

  /** Devolve true se o buy foi enviado; false se foi bloqueado como duplicata. */
  async executeTrade(signal: TradeSignal): Promise<boolean> {
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
        return false;
      }

      // Incrementa contador de requisições
      this.requestCounter++;
      const requestId = this.requestCounter;

      // Constrói e envia a requisição de compra
      const buyRequest = this.buildBuyRequest(signal, requestId);

      //this.emit('transaction', buyRequest);

      /*@ts-ignore*/
      this.wsMaster.send(JSON.stringify(buyRequest));
      this.startBuyTimeout(signal);

      this.updateLastTradeInfo(signal);
      return true;

    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  private buildBuyRequest(signal: TradeSignal, requestId: number): BuyRequest {
    // Implementa lógica avançada baseada no method_220 do ZeeX
    const parameters: any = {
      contract_type: signal.contractType,
      duration: signal.duration,
      duration_unit: signal.durationUnit || 't',
      basis: 'stake',
      amount: signal.amount,
      currency: this.currency
    };

    // API v3 oficial (legada) usa "symbol". API Options (nova) usa "underlying_symbol".
    if (this.needsAuthorize) {
      parameters.symbol = signal.symbol;
    } else {
      parameters.underlying_symbol = signal.symbol;
    }

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

      // 'sold' = vendido antes do vencimento (venda manual ou pela Deriv); também é resultado final
      const finalStatuses = ['won', 'lost', 'sold'];
      if (message.msg_type === 'proposal_open_contract' &&
        finalStatuses.includes(message.proposal_open_contract.status)) {
        const contractId = message.proposal_open_contract.contract_id;
        // Emite apenas uma vez por contract_id (API Deriv envia múltiplas mensagens para o mesmo contrato finalizado)
        if (contractId && !this.emittedContractIds.has(contractId)) {
          this.emittedContractIds.add(contractId);
          this.settleOpenContract(contractId);
          this.emit('transaction', message.proposal_open_contract);
        }
      }


      if (message.msg_type === 'buy') {
        const durationMs = this.pendingBuy?.durationMs;
        this.clearPendingBuy();
        if (message.error) {
          const error = new Error(`Erro na compra: ${message.error.message}`);
          this.emit('error', error);
          // Único erro que garante que a ordem não existe na corretora
          this.emit('buyRejected', error);
        } else {
          if (durationMs !== undefined && message.buy?.contract_id) {
            this.trackOpenContract(message.buy.contract_id, durationMs);
          }
          this.emit('success', { message: 'Trade executado com sucesso', data: message.buy });
        }
      }

      if (message.msg_type === 'authorize') {
        if (message.error) {
          // Emite evento específico de erro de autenticação (ex: AccountDisabled)
          this.emit('authError', { code: message.error.code, message: message.error.message });
          this.disconnect();
          return;
        }

        if (message.authorize) {
          this.emit('balance', message.authorize.balance || message.balance?.balance);
        }

        //Subscribe no saldo 
        this.balanceSubscribe();
        this.resubscribeOpenContracts();
      }

      if (message.msg_type === 'balance') {
        this.emit('balance', message.balance.balance);
      }

      if (message.msg_type == 'error') {

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
    this.connectionGeneration++;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.isConnected = false;
    this.stopPing();
    this.clearPendingBuy();
    for (const timer of this.openContracts.values()) clearTimeout(timer);
    this.openContracts.clear();
    if (this.wsMaster) {
      this.wsMaster.close();
      this.wsMaster = null;
    }
  }

}
