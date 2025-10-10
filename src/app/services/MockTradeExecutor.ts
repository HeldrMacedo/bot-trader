// mockTradeExecutor.ts
import { TradeSignal, BuyRequest } from '../types/types';
import EventEmitter from 'events';
import moment from 'moment';

export class MockTradeExecutor extends EventEmitter {
  private isConnected = false;
  private isTestMode = true;
  private mockContractId = 1000000;
  private balance = 1000; // Saldo inicial de teste
  private requestCounter = 0;

  constructor(token: string, configure?: any) {
    super();
    console.log('[MOCK] MockTradeExecutor initialized - TEST MODE');
  }

  async connectToMaster(): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(() => {
        this.isConnected = true;
        this.emit('connected');
        this.emit('balance', this.balance);
        console.log('[MOCK] Connected to mock master account');
        resolve();
      }, 1000);
    });
  }

  async executeTrade(signal: TradeSignal): Promise<void> {
    if (!this.isConnected) {
      await this.connectToMaster();
    }

    this.requestCounter++;
    const requestId = this.requestCounter;

    console.log('[MOCK] Executing mock trade:', {
      symbol: signal.symbol,
      contractType: signal.contractType,
      amount: signal.amount,
      barrier: signal.barrier,
      duration: signal.duration
    });

    // Simular delay de processamento
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

    // Gerar resultado aleatório (70% de chance de win, 30% de loss)
    const isWin = Math.random() > 0.3;
    const profit = isWin ? signal.amount * 0.8 : -signal.amount; // Win: +80%, Loss: -100%

    // Atualizar saldo
    this.balance += profit;
    this.emit('balance', this.balance);

    // Criar contrato mockado
    const mockContract = this.createMockContract(signal, isWin, profit);
    
    // Emitir evento de transação completada
    this.emit('transaction', mockContract);

    console.log(`[MOCK] Trade ${isWin ? 'WON' : 'LOST'} - Profit: ${profit} - Balance: ${this.balance}`);
  }

  private createMockContract(signal: TradeSignal, isWin: boolean, profit: number): any {
    const contractId = this.mockContractId++;
    const now = Math.floor(Date.now() / 1000);
    const entrySpot = 1000 + Math.random() * 100;
    const exitSpot = isWin ? entrySpot + 10 : entrySpot - 10;

    return {
      account_id: 78759608,
      audit_details: { all_ticks: [] },
      barrier: signal.barrier || '',
      barrier_count: signal.barrier ? 1 : 0,
      bid_price: isWin ? signal.amount + profit : 0,
      buy_price: signal.amount,
      contract_id: contractId,
      contract_type: signal.contractType,
      currency: 'USD',
      current_spot: exitSpot,
      current_spot_display_value: exitSpot.toFixed(2),
      current_spot_time: now + 5,
      date_expiry: now + 60,
      date_settlement: now + 60,
      date_start: now,
      display_name: this.getDisplayName(signal.symbol),
      entry_spot: entrySpot,
      entry_spot_display_value: entrySpot.toFixed(2),
      entry_tick: entrySpot,
      entry_tick_display_value: entrySpot.toFixed(2),
      entry_tick_time: now,
      exit_tick: exitSpot,
      exit_tick_display_value: exitSpot.toFixed(2),
      exit_tick_time: now + 5,
      expiry_time: now + 60,
      id: `mock-${contractId}`,
      is_expired: 1,
      is_forward_starting: 0,
      is_intraday: 1,
      is_path_dependent: 0,
      is_settleable: 1,
      is_sold: 1,
      is_valid_to_cancel: 0,
      is_valid_to_sell: 0,
      longcode: `Mock contract for testing - ${isWin ? 'WON' : 'LOST'}`,
      payout: isWin ? signal.amount + profit : 0,
      profit: profit,
      profit_percentage: (profit / signal.amount) * 100,
      purchase_time: now,
      sell_price: isWin ? signal.amount + profit : 0,
      sell_spot: exitSpot,
      sell_spot_display_value: exitSpot.toFixed(2),
      sell_spot_time: now + 5,
      sell_time: now + 5,
      shortcode: `MOCK_${signal.symbol}_${signal.contractType}`,
      status: isWin ? 'won' : 'lost',
      tick_count: 5,
      tick_stream: this.generateMockTickStream(entrySpot, exitSpot, 5),
      transaction_ids: { 
        buy: 589606050000 + contractId, 
        sell: 589606057000 + contractId 
      },
      underlying: signal.symbol,
      validation_error: '',
      validation_error_code: ''
    };
  }

  private getDisplayName(symbol: string): string {
    const displayNames: { [key: string]: string } = {
      'JD100': 'Índice Jump 100',
      'R_100': 'Volatility 100 Index',
      'frxEURUSD': 'EUR/USD',
      'WLDEUR': 'Wilder Euro Index',
      // Adicione mais mapeamentos conforme necessário
    };
    return displayNames[symbol] || symbol;
  }

  private generateMockTickStream(entry: number, exit: number, count: number): any[] {
    const ticks = [];
    for (let i = 0; i < count; i++) {
      const progress = i / (count - 1);
      const price = entry + (exit - entry) * progress;
      ticks.push({
        epoch: Math.floor(Date.now() / 1000) + i,
        price: price.toFixed(2),
        tick: price
      });
    }
    return ticks;
  }

  disconnect(): void {
    this.isConnected = false;
    console.log('[MOCK] MockTradeExecutor disconnected');
  }

  // Métodos de interface compatíveis com TradeExecutor real
  setDuplicateProtection(enabled: boolean): void {
    console.log('[MOCK] Duplicate protection:', enabled);
  }

  setCurrency(currency: string): void {
    console.log('[MOCK] Currency set to:', currency);
  }

  setAppMarkupPercentage(percentage: number): void {
    console.log('[MOCK] App markup percentage:', percentage);
  }

  getLatestRealContractSummary() {
    return null;
  }
}