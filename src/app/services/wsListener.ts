import { EventEmitter } from 'events';
import WebSocket from 'ws';
import { TradeSignal, DurationInfo, ContractInfo } from '../types/types';

export class WsListener extends EventEmitter {
  private ws: WebSocket | null = null;
  private baseUrl = `wss://ws.binaryws.com/websockets/v3?app_id=${process.env.NEXT_PUBLIC_APPID}`;

  private token: string;
  private isConnected = false;
  private processedContracts = new Set<string>(); // Evitar duplicatas
  private lastVirtualTransaction: {
    action?: string;
    contract_id?: number | string;
    amount?: number;
    buy_price?: number;
    price?: number;
    symbol?: string;
    transaction_id?: number | string;
    raw?: any;
    at: number;
  } | null = null;
  private configure?: any;

  private recentVirtualTransactions: Array<NonNullable<typeof this.lastVirtualTransaction>> = [];

  constructor(token: string, configure?: any) {
    super();
    this.token = token;
    this.configure = configure;

  }

  async connect(): Promise<void> {
    try {
      let wsUrl = this.baseUrl;

      if (this.token && this.token.startsWith('oauth:')) {
        try {
          const parts = this.token.split(':');
          const accessToken = parts[1];
          const accountId = parts[2];
          const appId = process.env.NEXT_PUBLIC_DERIV_CLIENT_ID || '';

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

      this.ws = new WebSocket(wsUrl);

      this.ws.on('open', async () => {
        console.log('WebSocket connected');
        this.isConnected = true;
        this.emit('connected');
        await this.authenticate();
        this.subscribeToTransactions();
      });

      this.ws.on('message', (data: string) => {
        console.log('Received message:', data);
        this.processMessage(data);
      });

      this.ws.on('close', () => {
        this.isConnected = false;
        this.emit('disconnected');
      });

      this.ws.on('error', (error) => {
        this.emit('error', error);
      });
    } catch (error) {
      this.emit('error', error);
    }
  }
  private async authenticate(): Promise<void> {
    return new Promise((resolve) => {
      if (this.token && this.token.startsWith('oauth:')) {
        // Already authenticated via OTP URL
        resolve();
        return;
      }

      if (this.ws && this.token) {
        const authMessage = { authorize: this.token };
        this.ws.send(JSON.stringify(authMessage));

        this.ws.on('message', (data: string) => {
          const message = JSON.parse(data);
          if (message.authorize) {
            resolve();
          }
        });
      }
    });
  }

  private subscribeToTransactions(): void {
    if (this.ws && this.isConnected) {
      // Subscrever ao stream de transações
      const subscribeMessage = {
        transaction: 1,
        subscribe: 1
      };
      this.ws.send(JSON.stringify(subscribeMessage));
    }
  }



  public getVirtualAccountInfo() {
    return {
      lastTransaction: this.lastVirtualTransaction,
      recentTransactions: this.recentVirtualTransactions,
    };
  }

  private processMessage(data: string): void {
    try {
      const message = JSON.parse(data);
      if (message.msg_type === 'transaction' && message.transaction.action == 'buy') {
        this.ws.send(JSON.stringify({
          proposal_open_contract: 1,
          contract_id: message.transaction.contract_id,
          subscribe: 1
        }));
      }

      /*
      if (message.msg_type === 'proposal_open_contract') {
        console.log('Received message:', message);
      }*/



      //REFORMULAR DEPOIS
      if (message.msg_type === 'transaction' && message.transaction) {
        const t = message.transaction;
        const summary = {
          action: t.action,
          contract_id: t.contract_id,
          amount: t.amount ?? t.delta_amount ?? undefined,
          buy_price: t.buy_price,
          price: t.price,
          symbol: t.symbol,
          transaction_id: t.transaction_id,
          raw: t,
          at: Date.now(),
        };

        this.lastVirtualTransaction = summary;
        this.recentVirtualTransactions.unshift(summary);
        if (this.recentVirtualTransactions.length > 50) {
          this.recentVirtualTransactions.pop();
        }
      }

      // Implementação completa baseada no method_394
      if (message.msg_type === 'transaction' &&
        message.transaction?.action === 'buy') {

        const signal = this.extractTradeSignalAdvanced(message);
        if (signal && !this.processedContracts.has(signal.contractId)) {
          this.processedContracts.add(signal.contractId);
          this.emit('tradeSignal', signal);
        }
      }

      // Processa outros tipos de mensagemu
      this.handleOtherMessages(message);

    } catch (error) {
      console.error('Error processing message:', error);
    }
  }

  private extractTradeSignalAdvanced(message: any): TradeSignal | null {
    try {
      const transaction = message.transaction;
      const longcode = transaction.longcode || '';
      const symbol = transaction.symbol || '';


      // Determina se é Forex
      const isForex = this.isForexSymbol(symbol);

      // Extrai duração com lógica avançada
      const durationInfo = this.parseDurationAdvanced(longcode);
      if (!durationInfo.isValid) {

        return null;
      }
      // Extrai tipo de contrato e barreira
      const contractInfo = this.parseContractAdvanced(longcode, isForex);
      if (!contractInfo.isValid) {
        return null;
      }

      //parseFloat(transaction.buy_price || transaction.amount || '0')
      return {
        symbol: symbol,
        contractType: contractInfo.type,
        amount: 0.35,
        barrier: contractInfo.barrier,
        duration: durationInfo.duration,
        durationUnit: durationInfo.durationUnit,
        contractId: transaction.contract_id,
        timestamp: new Date().toISOString(),
        longcode: longcode,
        isForex: isForex
      };
    } catch (error) {
      console.error('Error extracting advanced trade signal:', error);
      return null;
    }
  }

  private isForexSymbol(symbol: string): boolean {
    // Implementa lógica do ZeeX para identificar Forex
    return symbol.includes('frx') || symbol.includes('WLD');
  }

  private parseDurationAdvanced(longcode: string): DurationInfo & { isValid: boolean } {
    const longcodeLower = longcode.toLowerCase();

    // Processa ticks primeiro
    const ticksMatch = longcodeLower.match(/(\d+)\s+ticks?/);
    if (ticksMatch) {
      const ticks = parseInt(ticksMatch[1]);
      return {
        duration: ticks,
        durationUnit: 't',
        totalSeconds: 0,
        isValid: ticks > 0 && ticks <= 10
      };
    }

    // Processa durações compostas (horas + minutos + segundos)
    if (this.hasComplexDuration(longcodeLower)) {
      return this.parseComplexDuration(longcodeLower);
    }

    // Processa durações simples
    const secondsMatch = longcodeLower.match(/(\d+)\s+seconds?/);
    if (secondsMatch) {
      const seconds = parseInt(secondsMatch[1]);
      return {
        duration: seconds,
        durationUnit: 's',
        totalSeconds: seconds,
        isValid: seconds > 0 && seconds <= 86400
      };
    }

    const minutesMatch = longcodeLower.match(/(\d+)\s+minutes?/);
    if (minutesMatch) {
      const minutes = parseInt(minutesMatch[1]);
      return {
        duration: minutes,
        durationUnit: 'm',
        totalSeconds: minutes * 60,
        isValid: minutes > 0 && minutes <= 1440
      };
    }

    const hoursMatch = longcodeLower.match(/(\d+)\s+hours?/);
    if (hoursMatch) {
      const hours = parseInt(hoursMatch[1]);
      return {
        duration: hours,
        durationUnit: 'h',
        totalSeconds: hours * 3600,
        isValid: hours > 0 && hours <= 24
      };
    }

    // Default para contratos sem duração específica
    return {
      duration: 1,
      durationUnit: 'd',
      totalSeconds: 86400,
      isValid: true
    };
  }

  private hasComplexDuration(longcode: string): boolean {
    const hasHours = longcode.includes('hour');
    const hasMinutes = longcode.includes('minute');
    const hasSeconds = longcode.includes('second');

    // Verifica se tem pelo menos duas unidades de tempo
    return (hasHours && hasMinutes) ||
      (hasHours && hasSeconds) ||
      (hasMinutes && hasSeconds) ||
      (hasHours && hasMinutes && hasSeconds);
  }

  private parseComplexDuration(longcode: string): DurationInfo & { isValid: boolean } {
    const words = longcode.split(' ');
    let hours = 0, minutes = 0, seconds = 0;

    // Extrai horas
    const hoursIndex = words.findIndex(word => word.includes('hour'));
    if (hoursIndex > 0) {
      hours = parseInt(words[hoursIndex - 1]) || 0;
    }

    // Extrai minutos
    const minutesIndex = words.findIndex(word => word.includes('minute'));
    if (minutesIndex > 0) {
      minutes = parseInt(words[minutesIndex - 1]) || 0;
    }

    // Extrai segundos
    const secondsIndex = words.findIndex(word => word.includes('second'));
    if (secondsIndex > 0) {
      seconds = parseInt(words[secondsIndex - 1]) || 0;
    }

    const totalSeconds = hours * 3600 + minutes * 60 + seconds;

    return {
      duration: totalSeconds,
      durationUnit: 's',
      totalSeconds: totalSeconds,
      isValid: totalSeconds > 0 && totalSeconds <= 86400
    };
  }

  private parseContractAdvanced(longcode: string, isForex: boolean): ContractInfo {
    const longcodeLower = longcode.toLowerCase();

    if (isForex) {
      return this.parseForexContract(longcodeLower);
    } else {
      return this.parseNonForexContract(longcodeLower);
    }
  }

  private parseNonForexContract(longcode: string): ContractInfo {
    const words = longcode.split(' ');

    // Touch contracts com barrier (mais específico primeiro)
    if (longcode.includes('touches') && (longcode.includes('plus') || longcode.includes('minus'))) {
      const barrier = this.extractBarrierWithSign(longcode);
      return { type: 'ONETOUCH', barrier: barrier, isValid: true };
    }

    if (longcode.includes('does not touch') && (longcode.includes('plus') || longcode.includes('minus'))) {
      const barrier = this.extractBarrierWithSign(longcode);
      return { type: 'NOTOUCH', barrier: barrier, isValid: true };
    }

    // Call/Put com barrier específico (mais específico primeiro)
    if (longcode.includes('higher than entry spot') && (longcode.includes('plus') || longcode.includes('minus'))) {
      const barrier = this.extractBarrierWithSign(longcode);
      return { type: 'CALL', barrier: barrier, isValid: true };
    }

    if (longcode.includes('lower than entry spot') && (longcode.includes('plus') || longcode.includes('minus'))) {
      const barrier = this.extractBarrierWithSign(longcode);
      return { type: 'PUT', barrier: barrier, isValid: true };
    }

    // Reset contracts
    if (longcode.includes('strictly lower than it was')) {
      return { type: 'RESETPUT', isValid: true };
    }
    if (longcode.includes('strictly higher than it was')) {
      return { type: 'RESETCALL', isValid: true };
    }

    // Run contracts
    if (longcode.includes('rises successively')) {
      return { type: 'RUNHIGH', isValid: true };
    }
    if (longcode.includes('falls successively')) {
      return { type: 'RUNLOW', isValid: true };
    }

    // Call/Put com "or equal" (mais específico que os básicos)
    if (longcode.includes('higher than') && longcode.includes('or equal')) {
      return { type: 'CALLE', isValid: true };
    }
    if (longcode.includes('lower than') && longcode.includes('or equal')) {
      return { type: 'PUTE', isValid: true };
    }

    // Digit contracts - VERIFICAÇÃO MAIS ESPECÍFICA PRIMEIRO
    // DIGITOVER/DIGITUNDER - Verifica se é sobre "last digit" primeiro (mais específico)
    if (longcode.includes('last digit') && longcode.includes('strictly higher than')) {
      const barrier = this.extractDigitBarrierAfterThan(longcode);
      return { type: 'DIGITOVER', barrier: barrier, isValid: true };
    }

    if (longcode.includes('last digit') && longcode.includes('strictly lower than')) {
      const barrier = this.extractDigitBarrierAfterThan(longcode);
      return { type: 'DIGITUNDER', barrier: barrier, isValid: true };
    }

    // Digit odd/even (DEVE ser verificado ANTES de DIGITMATCH/DIGITDIFF)
    if (longcode.includes('is odd')) {
      return { type: 'DIGITODD', isValid: true };
    }
    if (longcode.includes('is even')) {
      return { type: 'DIGITEVEN', isValid: true };
    }

    // Digit match/diff (verificação mais específica para padrões exatos)
    if (longcode.includes('if the last digit') && longcode.includes('is not') && longcode.includes('after') && !longcode.includes('strictly')) {
      const barrier = this.extractDigitBarrier(longcode);
      return { type: 'DIGITDIFF', barrier: barrier, isValid: true };
    }

    if (longcode.includes('if the last digit') && longcode.includes('is') && longcode.includes('after') && !longcode.includes('is not') && !longcode.includes('strictly') && !longcode.includes('is odd') && !longcode.includes('is even')) {
      const barrier = this.extractDigitBarrier(longcode);
      return { type: 'DIGITMATCH', barrier: barrier, isValid: true };
    }

    // Call/Put básicos com "entry spot" (seguindo exatamente a lógica do Dashboard.cs)
    if (longcode.includes('strictly higher than entry spot')) {
      return { type: 'CALL', isValid: true };
    }

    if (longcode.includes('strictly lower than entry spot')) {
      return { type: 'PUT', isValid: true };
    }

    // Digit contracts com barrier numérico (sem "last digit" e sem "entry spot")
    if (longcode.includes('strictly higher than') && !longcode.includes('entry spot')) {
      const numericBarrier = this.extractDigitBarrierAfterThan(longcode);
      if (numericBarrier && this.isNumericBarrier(numericBarrier)) {
        return { type: 'DIGITOVER', barrier: numericBarrier, isValid: true };
      }
    }

    if (longcode.includes('strictly lower than') && !longcode.includes('entry spot')) {
      const numericBarrier = this.extractDigitBarrierAfterThan(longcode);
      if (numericBarrier && this.isNumericBarrier(numericBarrier)) {
        return { type: 'DIGITUNDER', barrier: numericBarrier, isValid: true };
      }
    }

    // Touch contracts básicos (sem barrier específico)
    if (longcode.includes('touches')) {
      const barrier = this.extractBarrier(longcode);
      return { type: 'ONETOUCH', barrier: barrier, isValid: true };
    }
    if (longcode.includes('does not touch')) {
      const barrier = this.extractBarrier(longcode);
      return { type: 'NOTOUCH', barrier: barrier, isValid: true };
    }

    return { type: 'CALL', isValid: false }; // Default inválido
  }


  private parseForexContract(longcode: string): ContractInfo {
    // Touch contracts
    if (longcode.includes('touches')) {
      const barrier = this.extractBarrier(longcode);
      return { type: 'ONETOUCH', barrier: barrier, isValid: true };
    }
    if (longcode.includes('does not touch')) {
      const barrier = this.extractBarrier(longcode);
      return { type: 'NOTOUCH', barrier: barrier, isValid: true };
    }

    // Call/Put básicos com "entry spot"
    if (longcode.includes('strictly higher than entry spot')) {
      return { type: 'CALL', isValid: true };
    }
    if (longcode.includes('strictly lower than entry spot')) {
      return { type: 'PUT', isValid: true };
    }

    // Call/Put com "or equal to entry spot"
    if (longcode.includes('is higher than or equal to entry spot')) {
      return { type: 'CALLE', isValid: true };
    }
    if (longcode.includes('is lower than or equal to entry spot')) {
      return { type: 'PUTE', isValid: true };
    }

    return { type: 'CALL', isValid: false }; // Default inválido
  }



  private extractBarrierWithSign(longcode: string): string {
    const words = longcode.split(' ');

    if (longcode.includes('plus')) {
      const plusIndex = words.findIndex(word => word.toLowerCase() === 'plus');
      if (plusIndex >= 0 && plusIndex < words.length - 1) {
        let value = words[plusIndex + 1];
        // Remove ponto final se existir
        if (value.endsWith('.')) {
          value = value.slice(0, -1);
        }
        return `+${value}`;
      }
    }

    if (longcode.includes('minus')) {
      const minusIndex = words.findIndex(word => word.toLowerCase() === 'minus');
      if (minusIndex >= 0 && minusIndex < words.length - 1) {
        let value = words[minusIndex + 1];
        // Remove ponto final se existir
        if (value.endsWith('.')) {
          value = value.slice(0, -1);
        }
        return `-${value}`;
      }
    }

    return '';
  }

  private extractBarrier(longcode: string): string {
    // Para contratos touch sem plus/minus, extrai o primeiro número encontrado
    const barrierMatch = longcode.match(/([\d.]+)/);
    return barrierMatch ? barrierMatch[1] : '';
  }

  private extractDigitBarrierAfterThan(longcode: string): string {
    // Extrai o dígito que vem após "than" - para DIGITOVER/DIGITUNDER
    const match = longcode.match(/than\s+(\d+)/i);
    return match ? match[1] : '';
  }

  private isNumericBarrier(barrier: string): boolean {
    // Verifica se o barrier é um dígito simples (0-9)
    return /^\d$/.test(barrier);
  }

  private extractNumericBarrier(longcode: string): string | undefined {
    // Mantido para compatibilidade, mas agora usa o método mais específico
    return this.extractDigitBarrierAfterThan(longcode) || undefined;
  }


  private extractDigitBarrier(longcode: string): string {
    // Para DIGITMATCH/DIGITDIFF, extrai o dígito após "is" ou "is not"
    const match = longcode.match(/last digit of .+ is(?: not)? (\d)/i);
    return match ? match[1] : '';
  }

  private handleOtherMessages(message: any): void {
    switch (message.msg_type) {
      case 'authorize':
        if (message.error) {
          this.emit('authError', message.error);
          this.disconnect();
        } else {
          this.emit('authorized', message.authorize);
        }
        break;

      case 'tick':
        this.emit('tick', message.tick);
        break;

      case 'proposal_open_contract':
        // Processa contratos abertos (ganhos/perdas)
        if (message.proposal_open_contract) {
          this.handleContractUpdate(message.proposal_open_contract);
        }
        break;

      case 'transaction':
        if (message.transaction?.action === 'sell') {
          this.emit('sellTransaction', message.transaction);
        }
        break;

      default:
    }
  }

  private handleContractUpdate(contract: any): void {
    const status = contract.status;
    const contractId = contract.contract_id;
    const profit = contract.profit;

    if (status === 'won' || status === 'lost' || status === 'sold') {
      this.emit('contractResult', {
        contractId,
        status,
        profit,
        timestamp: new Date().toISOString()
      });
    }
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      this.isConnected = false;
    }
    this.processedContracts.clear();
  }

  send(message: string): void {
    if (this.ws && this.isConnected) {
      this.ws.send(message);
    }
  }

  // Método para limpar contratos processados (evitar acúmulo de memória)
  clearProcessedContracts(): void {
    this.processedContracts.clear();
  }
}