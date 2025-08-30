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

  connect(): void {
    try {
      this.ws = new WebSocket(this.baseUrl);
      
      this.ws.on('open', async () => {
        console.log('WsListener connected to demo account');
        this.isConnected = true;
        this.emit('connected');
        await this.authenticate();
        this.subscribeToTransactions();
      });

      this.ws.on('message', (data: string) => {
        this.processMessage(data);
      });

      this.ws.on('close', () => {
        console.log('WsListener disconnected');
        this.isConnected = false;
        this.emit('disconnected');
      });

      this.ws.on('error', (error) => {
        console.error('WsListener error:', error);
        this.emit('error', error);
      });
    } catch (error) {
      console.error('Failed to connect WsListener:', error);
    }
  }
  private async authenticate(): Promise<void> {
  return new Promise((resolve) => {
    if (this.ws && this.token) {
      const authMessage = { authorize: this.token };
      this.ws.send(JSON.stringify(authMessage));

      this.ws.on('message', (data: string) => {
        const message = JSON.parse(data);
        if (message.authorize) {
          console.log("Autenticado com sucesso!");
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
      console.log('Received message:', message);

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
          console.log('Advanced trade signal received:', signal);
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
      
      console.log(`Processing transaction: Symbol=${symbol}, Longcode=${longcode}`);
      
      // Determina se é Forex
      const isForex = this.isForexSymbol(symbol);
      
      // Extrai duração com lógica avançada
      const durationInfo = this.parseDurationAdvanced(longcode);
      if (!durationInfo.isValid) {
        console.log('Invalid duration, skipping signal');
        return null;
      }
      
      // Extrai tipo de contrato e barreira
      const contractInfo = this.parseContractAdvanced(longcode, isForex);
      if (!contractInfo.isValid) {
        console.log('Invalid contract type, skipping signal');
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

  private parseForexContract(longcode: string): ContractInfo {
    // Implementa lógica específica para Forex (simplificada no ZeeX)
    if (longcode.includes('touches')) {
      return { type: 'ONETOUCH', barrier: this.extractBarrier(longcode), isValid: true };
    }
    if (longcode.includes('does not touch')) {
      return { type: 'NOTOUCH', barrier: this.extractBarrier(longcode), isValid: true };
    }
    if (longcode.includes('higher than or equal to entry spot')) {
      return { type: 'CALLE', isValid: true };
    }
    if (longcode.includes('lower than or equal to entry spot')) {
      return { type: 'PUTE', isValid: true };
    }
    if (longcode.includes('strictly higher than entry spot')) {
      return { type: 'CALL', isValid: true };
    }
    if (longcode.includes('strictly lower than entry spot')) {
      return { type: 'PUT', isValid: true };
    }
    
    return { type: 'CALL', isValid: false }; // Default inválido
  }

  private parseNonForexContract(longcode: string): ContractInfo {
    // Implementa lógica completa para Non-Forex baseada no method_394
    
    // Touch/No Touch com barreiras
    if (longcode.includes('touches') && (longcode.includes('plus') || longcode.includes('minus'))) {
      return { type: 'ONETOUCH', barrier: this.extractBarrierWithSign(longcode), isValid: true };
    }
    
    if (longcode.includes('does not touch') && (longcode.includes('plus') || longcode.includes('minus'))) {
      return { type: 'NOTOUCH', barrier: this.extractBarrierWithSign(longcode), isValid: true };
    }
    
    // Call/Put com barreiras
    if (longcode.includes('higher') && longcode.includes('than entry spot') && 
        (longcode.includes('plus') || longcode.includes('minus'))) {
      return { type: 'CALL', barrier: this.extractBarrierWithSign(longcode), isValid: true };
    }
    
    if (longcode.includes('lower') && longcode.includes('than entry spot') && 
        (longcode.includes('plus') || longcode.includes('minus'))) {
      return { type: 'PUT', barrier: this.extractBarrierWithSign(longcode), isValid: true };
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
    
    // Digit contracts
    if (longcode.includes('is odd')) {
      return { type: 'DIGITODD', isValid: true };
    }
    if (longcode.includes('is even')) {
      return { type: 'DIGITEVEN', isValid: true };
    }
    
    // Digit over/under
    if (longcode.includes('strictly higher than')) {
      const barrier = this.extractNumericBarrier(longcode);
      return { 
        type: barrier ? 'DIGITOVER' : 'CALLE', 
        barrier: barrier,
        isValid: true 
      };
    }
    
    if (longcode.includes('strictly lower than')) {
      const barrier = this.extractNumericBarrier(longcode);
      return { 
        type: barrier ? 'DIGITUNDER' : 'PUTE', 
        barrier: barrier,
        isValid: true 
      };
    }
    
    // Digit match/diff
    if (longcode.includes('if the last digit') && longcode.includes('is not') && longcode.includes('after')) {
      return { type: 'DIGITDIFF', isValid: true };
    }
    
    if (longcode.includes('if the last digit') && longcode.includes('is') && longcode.includes('after')) {
      return { type: 'DIGITMATCH', isValid: true };
    }
    
    // Call/Put básicos
    if (longcode.includes('higher than or equal')) {
      return { type: 'CALLE', isValid: true };
    }
    if (longcode.includes('lower than or equal')) {
      return { type: 'PUTE', isValid: true };
    }
    if (longcode.includes('strictly higher')) {
      return { type: 'CALL', isValid: true };
    }
    if (longcode.includes('strictly lower')) {
      return { type: 'PUT', isValid: true };
    }
    
    return { type: 'CALL', isValid: false }; // Default inválido
  }

  private extractBarrierWithSign(longcode: string): string {
    const words = longcode.split(' ');
    
    if (longcode.includes('plus')) {
      const plusIndex = words.findIndex(word => word.toLowerCase() === 'plus');
      if (plusIndex >= 0 && plusIndex < words.length - 1) {
        let value = words[plusIndex + 1].replace('.', '');
        return `+${value}`;
      }
    }
    
    if (longcode.includes('minus')) {
      const minusIndex = words.findIndex(word => word.toLowerCase() === 'minus');
      if (minusIndex >= 0 && minusIndex < words.length - 1) {
        let value = words[minusIndex + 1].replace('.', '');
        return `-${value}`;
      }
    }
    
    return '';
  }

  private extractBarrier(longcode: string): string {
    const barrierMatch = longcode.match(/([\d.]+)/);
    return barrierMatch ? barrierMatch[1] : '';
  }

  private extractNumericBarrier(longcode: string): string | undefined {
    const match = longcode.match(/\b(\d)\b/);
    return match ? match[1] : undefined;
  }

  private handleOtherMessages(message: any): void {
    switch (message.msg_type) {
      case 'authorize':
        if (message.error) {
          console.error('Authorization error:', message.error);
          this.emit('authError', message.error);
          this.disconnect();
        } else {
          console.log('Authorization successful');
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
        console.log('Unknown message type:', message.msg_type);
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