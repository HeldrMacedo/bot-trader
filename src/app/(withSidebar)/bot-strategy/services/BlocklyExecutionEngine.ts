import { DerivService } from '@/app/services/DerivService';

interface TradeOptions {
  symbol: string;
  amount: number;
  duration: number;
  durationType: string;
  currency: string;
  prediction?: number;
  barrier?: number;
  tradeType: string;
}

interface BotCallbacks {
  onInitialization?: () => void;
  onBeforePurchase?: () => void;
  onDuringPurchase?: () => void;
  onAfterPurchase?: () => void;
  onUpdate?: (running: boolean) => void;
  onNotify?: (message: string, type: string, sound?: string) => void;
}

class BlocklyExecutionEngine {
  private isRunning: boolean = false;
  private tradeOptions: TradeOptions | null = null;
  private api: DerivService | null = null;
  private ticks: number[] = [];
  private balance: number = 0;
  private totalProfit: number = 0;
  private contractId: string | null = null;
  private currentProposal: any = null;
  private callbacks: BotCallbacks = {};
  
  private ws: WebSocket | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private tickListenerId: string | null = null;
  
  constructor() {
    this.api = DerivService.getInstance();
  }

  public async start(options: TradeOptions, callbacks: BotCallbacks) {
    if (this.isRunning) {
      this.log("Bot já está rodando!", "warn");
      return;
    }

    this.tradeOptions = options;
    this.callbacks = callbacks;
    this.isRunning = true;
    this.totalProfit = 0;
    this.ticks = [];

    this.log("Bot iniciado.", "success");
    if (this.callbacks.onUpdate) this.callbacks.onUpdate(true);

    // Run initialization block
    if (this.callbacks.onInitialization) {
      try {
        this.callbacks.onInitialization();
      } catch (e) {
        this.log(`Erro na inicialização: ${(e as Error).message}`, "error");
      }
    }

    // Start listening to ticks
    this.subscribeToTicks();

    // Start trading cycle
    this.tradingLoop();
  }

  public stop() {
    if (!this.isRunning) return;
    this.isRunning = false;
    this.contractId = null;
    if (this.tickListenerId) {
      this.api?.observerInstance.removeById(this.tickListenerId);
      this.tickListenerId = null;
    }
    this.log("Bot parado pelo usuário.", "warn");
    if (this.callbacks.onUpdate) this.callbacks.onUpdate(false);
  }

  private async subscribeToTicks() {
    if (!this.isRunning) return;

    const symbol = this.tradeOptions?.symbol || 'R_100';
    this.log(`Monitorando mercado: ${symbol}`);

    try {
      await this.api?.subscribe({ ticks: symbol });
      this.tickListenerId = this.api?.observerInstance.on('deriv.tick', (data: any) => {
        if (!this.isRunning) return;
        if (data?.tick?.symbol !== symbol) return;
        this.processTick(data.tick);
      }) || null;
    } catch (error) {
      this.log(`Erro na subscrição de ticks: ${(error as Error).message}`, "error");
    }
  }

  private tradingLoop() {
  }

  private processTick(tick: any) {
    if (!this.isRunning) return;

    const quote = tick.quote;
    this.ticks.push(quote);
    if (this.ticks.length > 1000) this.ticks.shift();

    // Process tick based on contract status
    if (!this.contractId) {
      // Before Purchase Logic
      if (this.callbacks.onBeforePurchase) {
        this.callbacks.onBeforePurchase();
      }
    } else {
      // During Purchase Logic
      if (this.callbacks.onDuringPurchase) {
        this.callbacks.onDuringPurchase();
      }
    }
  }

  public async purchase(contractType: string) {
    if (!this.isRunning) return;
    if (this.contractId) {
      this.log("Já existe um contrato em aberto.", "warn");
      return;
    }

    this.log(`Comprando: ${contractType}...`);
    await this.executePurchase(contractType);
  }

  private async executePurchase(contractType: string) {
    if (!this.api) {
      // Simulation mode
      this.contractId = `SIM_${Date.now()}`;
      this.log(`Compra Simulada: ${this.contractId}`, "success");
      this.simulateContractResult();
      return;
    }

    if (!this.tradeOptions) {
      this.log("Opções de trade não definidas.", "error");
      return;
    }

    // Build proposal request
    const req = {
      proposal: 1,
      amount: this.tradeOptions.amount || 0.35,
      basis: 'stake',
      contract_type: contractType.toUpperCase(),
      currency: this.tradeOptions.currency || 'USD',
      duration: this.tradeOptions.duration || 5,
      duration_unit: this.mapDurationUnit(this.tradeOptions.durationType),
      symbol: this.tradeOptions.symbol || 'R_100'
    };

    // Add barrier for specific contract types
    if (this.tradeOptions.prediction !== undefined) {
      const type = contractType.toUpperCase();
      const barrierTypes = ['DIGITMATCH', 'DIGITDIFF', 'DIGITOVER', 'DIGITUNDER', 'HIGHER', 'LOWER', 'TOUCH', 'NOTOUCH'];
      
      if (barrierTypes.includes(type)) {
        req['barrier'] = this.tradeOptions.prediction;
      }
    }

    try {
      // Get proposal
      const proposal = await this.api.send(req);
      if (proposal.error) {
        this.notify(`Erro Proposta: ${proposal.error.message}`, "error");
        return;
      }

      this.currentProposal = proposal;

      // Execute purchase
      const buy = await this.api.send({ 
        buy: proposal.proposal.id, 
        price: proposal.proposal.ask_price 
      });

      if (buy.error) {
        this.notify(`Erro Compra: ${buy.error.message}`, "error");
        return;
      }

      this.contractId = buy.buy.contract_id;
      this.log(`Contrato Comprado: ${this.contractId}`, "success");
      this.monitorContract(this.contractId);

    } catch (e) {
      this.log(`Exceção Compra: ${(e as Error).message}`, "error");
    }
  }

  private async monitorContract(id: string) {
    const check = async () => {
      if (!this.isRunning || !this.contractId) return;
      
      try {
        const data = await this.api?.send({ 
          proposal_open_contract: 1, 
          contract_id: id 
        });
        
        const contract = data?.proposal_open_contract;

        if (contract?.is_sold) {
          this.contractId = null;
          const profit = parseFloat(contract.profit);
          this.totalProfit += profit;
          const result = profit >= 0 ? "win" : "loss";

          this.log(`Resultado: ${result.toUpperCase()} (${profit})`, result === 'win' ? 'success' : 'error');

          if (this.callbacks.onAfterPurchase) {
            this.callbacks.onAfterPurchase();
          }
        } else {
          setTimeout(check, 1000);
        }
      } catch (e) {
        console.error(e);
        setTimeout(check, 1000);
      }
    };
    
    check();
  }

  private simulateContractResult() {
    setTimeout(() => {
      this.contractId = null;
      const win = Math.random() > 0.5;
      const profit = win ? (this.tradeOptions?.amount || 0.35) * 0.9 : -(this.tradeOptions?.amount || 0.35);
      this.totalProfit += profit;
      const result = win ? "win" : "loss";
      
      this.log(`Resultado (Simulado): ${result.toUpperCase()} (${profit.toFixed(2)})`, win ? 'success' : 'error');

      if (this.callbacks.onAfterPurchase) {
        this.callbacks.onAfterPurchase();
      }
    }, 2000);
  }

  public tradeAgain() {
    this.log("Reiniciando...", "info");
    // Loop continues automatically through tick processing
  }

  public sellAtMarket() {
    if (this.contractId) {
      this.log("Tentando vender a mercado...", "warn");
      // Implementation would go here
    }
  }

  // Helper methods for blocks
  public checkDirection(dir: 'rise' | 'fall'): boolean {
    if (this.ticks.length < 2) return false;
    const last = this.ticks[this.ticks.length - 1];
    const prev = this.ticks[this.ticks.length - 2];
    
    if (dir === 'rise') return last > prev;
    if (dir === 'fall') return last < prev;
    return false;
  }

  public getLastDigit(): number {
    if (this.ticks.length === 0) return 0;
    const val = this.ticks[this.ticks.length - 1].toString();
    return parseInt(val.charAt(val.length - 1));
  }

  public getLastDigitList(): number[] {
    return this.ticks.map(t => parseInt(t.toString().slice(-1)));
  }

  public getLastTick(): number {
    if (this.ticks.length === 0) return 0;
    return this.ticks[this.ticks.length - 1];
  }

  public getTicks(): number[] {
    return [...this.ticks];
  }

  public getTotalProfit(): number {
    return parseFloat(this.totalProfit.toFixed(2));
  }

  public isResult(expected: string): boolean {
    // This would be updated when contract results come in
    return false;
  }

  public readDetails(index: number): number {
    // Access previous contract details
    if (index === 4) return this.totalProfit; // Ex: 4 might be profit
    return 0;
  }

  public getPayout(type: string): number {
    // Used for calculating potential payout
    return 0; // Placeholder
  }

  public ask(msg: string): string {
    // Prompt user
    return prompt(msg) || '';
  }

  public toDateTime(timestamp: number): string {
    return new Date(timestamp * 1000).toLocaleString();
  }

  // Indicators
  public sma(list: number[], period: number): number {
    if (!list || list.length < period) return 0;
    const slice = list.slice(-period);
    const sum = slice.reduce((a, b) => a + b, 0);
    return sum / period;
  }

  public bb(list: number[], period: number, up: number, down: number, outputType: string): number {
    if (!list || list.length < period) return 0;

    const slice = list.slice(-period);
    const mean = slice.reduce((a, b) => a + b, 0) / period;

    const squareDiffs = slice.map(value => Math.pow(value - mean, 2));
    const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / period;
    const stdDev = Math.sqrt(avgSquareDiff);

    const upper = mean + (up * stdDev);
    const lower = mean - (down * stdDev);

    if (outputType === 'ub') return upper; // Upper Band
    if (outputType === 'lb') return lower; // Lower Band
    if (outputType === 'mb') return mean; // Middle Band

    return mean;
  }

  private mapDurationUnit(durationType: string | undefined): string {
    if (!durationType) return 't';
    
    const map: Record<string, string> = { 
      't': 't', 's': 's', 'm': 'm', 'h': 'h', 'd': 'd', 
      'ticks': 't', 'seconds': 's', 'minutes': 'm' 
    };
    
    return map[durationType] || 't';
  }

  private log(msg: string, type: 'info' | 'success' | 'warn' | 'error' = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`[${timestamp}] ${msg}`);
    
    if (this.callbacks.onNotify) {
      this.callbacks.onNotify(msg, type);
    }
  }

  private notify(msg: string, type: 'info' | 'success' | 'warn' | 'error' = 'info', sound: string = 'silent') {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`%c[BOT] [${timestamp}] ${msg}`, type === 'error' ? 'color: red' : 'color: cyan');
    
    if (this.callbacks.onNotify) {
      this.callbacks.onNotify(msg, type, sound);
    }
  }
}

// Global instance for Blockly blocks to access
declare global {
  interface Window {
    BlocklyBot: BlocklyExecutionEngine;
  }
}

if (typeof window !== 'undefined') {
  window.BlocklyBot = new BlocklyExecutionEngine();
}

export { BlocklyExecutionEngine };

