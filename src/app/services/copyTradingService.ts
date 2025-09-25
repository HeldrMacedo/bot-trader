import { WsListener } from './wsListener';
import { SignalProcessor } from './signalProcessor';
import { TradeExecutor } from './tradeExecutor';
import { TradeSignal } from '../types/types';
import { ErrorNotification } from '../types/errorTypes';

export class CopyTradingService {
  private wsListener: WsListener;
  private signalProcessor: SignalProcessor;
  private tradeExecutor: TradeExecutor;
  private isRunning = false;
  private demoToken: string;
  private realToken: string;
  private sessionId?: string;
  private configure?: any;
  private stats = {
    signalsReceived: 0,
    tradesExecuted: 0,
    errors: 0,
    startTime: null as Date | null,
    lastSignalTime: null as Date | null,
    lastTradeTime: null as Date | null
  };
  private quantityLoss: number = 0; // Losses consecutivos necessários
  private stopLoss: number = 0; // Valor máximo de perda
  private stopWin: number = 0; // Valor máximo de ganho
  private initialValue: number = 0; // Valor base por operação
  private stakeMultiple: number = 1; // Multiplicador após loss
  private pauseTimeLoss: number = 0; // Pausa após loss (segundos)
  private pauseTimeWin: number = 0; // Pausa após win (segundos)
  private pauseTime: number = 0; 
  private timePause: number = 0; // Tempo de pausa atual (segundos)
  
  // Estados internos
  private consecutiveLosses: number = 0;
  private currentStake: number = 0;
  private totalProfit: number = 0;
  private totalLoss: number = 0;
  private isPaused: boolean = false;
  private pauseEndTime: number = 0;

  
  // Dados das contas
  private demoTransactions: any[] = [];
  private realTransactions: any[] = [];
  private console: string[] = [];
  private balance: number = 0;

  private errors: ErrorNotification[] = [];
  private maxErrors: number = 50;

  constructor(demoToken: string, realToken: string, sessionId?: string, configure?: any) {
    this.configure = configure;

    this.demoToken = demoToken;
    this.realToken = realToken;
    this.sessionId = sessionId;
    
    this.tradeExecutor = new TradeExecutor(realToken, configure);

    this.signalProcessor = new SignalProcessor(this.tradeExecutor);
    this.wsListener = new WsListener(demoToken, configure);
    
    // Configura parâmetros do copy trading
    this.quantityLoss = configure?.quantityLoss || 0;
    this.stopLoss = configure?.stopLoss || 0;
    this.stopWin = configure?.stopWin || 0;
    this.initialValue = configure?.initialValue || 0.35;
    this.currentStake = this.initialValue;
    this.stakeMultiple = configure?.stakeMultiple || 1;
    this.pauseTime = configure?.pauseTime || 0;
    this.pauseTimeLoss = configure?.pauseTimeLoss || false;
    this.pauseTimeWin = configure?.pauseTimeWin || false;

    
    this.setupEventHandlers();
  }

  private addError(type: 'error' | 'warning' | 'info' | 'success', title: string, message: string, source: string, details?: any) {
    const error: ErrorNotification = {
      id: `${Date.now()}-${Math.random()}`,
      type,
      title,
      message,
      timestamp: new Date(),
      source: source as any,
      details
    };
    
    this.errors.unshift(error);
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(0, this.maxErrors);
    }
    
    console.log(`[${type.toUpperCase()}] ${title}: ${message}`, details);
  }


  private processTransaction(transaction: any, isDemo: boolean) {
    if (isDemo) {
      if (!this.shouldProcessSignal()) {
        this.console.push({...transaction, isDemo: true});
      }
      //this.demoTransactions.push(transaction);
      this.handleDemoTransaction(transaction);
    } else {
      this.console.push({...transaction, isDemo: false});
      this.realTransactions.push(transaction);
      this.handleRealTransaction(transaction);
    }
  }

  private handleDemoTransaction(transaction: any) {
    const isWin = transaction.amount > 0;
    
    if (isWin) {
      this.consecutiveLosses = 0;
    } else if (this.quantityLoss > 0) {
      this.consecutiveLosses++;      
    }
  }

  private handleRealTransaction(transaction: any) {
    const isWin = transaction.profit > 0;
    const profit = transaction.profit;
    this.consecutiveLosses = 0;
    if (isWin) {
      this.totalProfit += profit;
      this.currentStake = this.initialValue;
      console.log(`[SYSTEM] PAUSE TIEM WIN: ${this.pauseTimeWin} - ${this.pauseTime}`);
      if (this.pauseTimeWin) {
        this.applyPause(this.pauseTime, 'win');
      }
      
      if (this.stopWin > 0 && this.totalProfit >= this.stopWin) {
        this.stop();
        return;
      }
    } else {
      this.totalLoss += Math.abs(profit);
      this.currentStake = this.currentStake * this.stakeMultiple; 
    
      console.log(`[SYSTEM] PAUSE TIEM LOSS: ${this.pauseTimeLoss} - ${this.pauseTime}`);
      if (this.pauseTimeLoss) {
        this.applyPause(this.pauseTime, 'loss');
      }
      
      if (this.stopLoss > 0 && this.totalLoss >= this.stopLoss) {
        this.stop();
        return;
      }
    }
  }

  private applyPause(seconds: number, reason: string) {
    this.isPaused = true;
    this.pauseEndTime = Date.now() + (seconds * 1000);
    this.timePause = seconds;
    
    console.log(`[SYSTEM] Paused for ${seconds}s after ${reason}`);
    
    // Atualizar timePause em tempo real
    const updateTimer = setInterval(() => {
      const remainingTime = Math.max(0, this.pauseEndTime - Date.now());
      this.timePause = Math.ceil(remainingTime / 1000);
      
      if (remainingTime <= 0) {
        this.isPaused = false;
        this.timePause = 0;
        console.log(`[SYSTEM] Pause ended, resuming operations`);
        clearInterval(updateTimer);
      }
    }, 1000); // Atualiza a cada segundo
  }

  

  private  setupEventHandlers(): void {
    // Handler para sinais de trade
    this.wsListener.on('tradeSignal', async (signal: TradeSignal) => {
      this.stats.signalsReceived++;
      this.stats.lastSignalTime = new Date();
      
      try {
        if (this.shouldProcessSignal()) {
          await this.signalProcessor.processSignal({...signal, amount: this.currentStake});
          this.stats.tradesExecuted++;
          this.stats.lastTradeTime = new Date();
          
          this.addError('success', 'Trade Executado', `Trade ${signal.contractType} executado com sucesso`, 'trading', {
            symbol: signal.symbol,
            amount: signal.amount
          });
        } else {
          if (this.isPaused) {
            this.addError('info', 'Trade Pausado', `Aguardando ${this.timePause}s para próximo trade`, 'trading');
          } else {
           this.addError('info', 'Aguardando Losses', `Necessário ${this.quantityLoss - this.consecutiveLosses} losses consecutivos`, 'trading');
          }
        }
        
      } catch (error) {
       this.stats.errors++;
        this.addError('error', 'Erro no Trade', `Falha ao processar sinal: ${error.message}`, 'trading', error);
      }
    });

     this.wsListener.on('sellTransaction', (transaction: any) => {
      
      if (this.isPaused) {
        return;
      }
      console.log('sellTransaction', transaction);
      this.processTransaction(transaction, true); // true = isDemo
    });
    
    this.tradeExecutor.on('transaction', (transaction: any) => {
      this.processTransaction({...transaction, amount: transaction.profit}, false); // false = isReal
    });

    this.tradeExecutor.on('balance', (balance) => {
      this.balance = balance;
    });
    // Handlers para conexão
    this.wsListener.on('connected', () => {
      console.log(`[Session ${this.sessionId}] Demo account listener connected`);
    });

    this.wsListener.on('disconnected', () => {
      console.log(`[Session ${this.sessionId}] Demo account listener disconnected`);
      if (this.isRunning) {
        // Tenta reconectar após 5 segundos
        setTimeout(() => {
          if (this.isRunning) {
            this.wsListener.connect();
          }
        }, 5000);
      }
    });

    this.wsListener.on('error', (error) => {
      console.error(`[Session ${this.sessionId}] WsListener error:`, error);
      this.stats.errors++;
      this.addError('error', 'Erro de Conexão Demo', `Falha na conexão da conta demo: ${error.message}`, 'connection', error);
    });
  }

  private shouldProcessSignal(): boolean {
    console.log(`[SYSTEM] PAUSE TIEM: ${this.pauseTime} - IS PAUSED ${this.isPaused}`);
  
    if (this.isPaused) {
      return false;
    }
    
    // Se quantityLoss é 0, sempre processa o sinal
    if (this.quantityLoss === 0) {
      return true;
    }
    
    // Se quantityLoss > 0, só processa após atingir a sequência de losses
    return this.consecutiveLosses >= this.quantityLoss;
  }

  async start(): Promise<void> {
    try {
      console.log(`[Session ${this.sessionId}] Starting Copy Trading Service...`);
      
      if (this.isRunning) {
        console.log(`[Session ${this.sessionId}] Service is already running`);
        return;
      }
      
      this.stats.startTime = new Date();
      
      // Conecta ao WebSocket da conta real
      await this.connectMasterWithRetry();
      
      // Conecta ao WebSocket da conta demo
      this.wsListener.connect();
      
      // Habilita o processamento de sinais
      this.signalProcessor.setEnabled(true);
      
      this.isRunning = true;
      console.log(`[Session ${this.sessionId}] Copy Trading Service started successfully`);
      
    } catch (error) {
      console.error(`[Session ${this.sessionId}] Failed to start Copy Trading Service:`, error);
      throw error;
    }
  }

  private async connectMasterWithRetry(maxAttempts = 3): Promise<void> {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        await this.tradeExecutor.connectToMaster();
        console.log(`[Session ${this.sessionId}] Master connection established`);
        return;
      } catch (error) {
        console.error(`[Session ${this.sessionId}] Master connection attempt ${attempt} failed:`, error);
        if (attempt === maxAttempts) {
          throw error;
        }
        await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
      }
    }
  }

  stop(): void {
    console.log(`[Session ${this.sessionId}] Stopping Copy Trading Service...`);
    
    this.isRunning = false;
    this.signalProcessor.setEnabled(false);
    this.wsListener.disconnect();
    this.tradeExecutor.disconnect();
    this.clearAllDados();
    console.log(`[Session ${this.sessionId}] Copy Trading Service stopped`);
  }

  clearAllDados() {
    this.totalProfit = 0;
    this.totalLoss = 0;
    this.isPaused = false;
    this.consecutiveLosses = 0;
    this.currentStake = 0;
  }

  getStats() {
  return {
    isRunning: this.isRunning,
    timePause: this.timePause,
    trading: {
      consecutiveLosses: this.consecutiveLosses,
    },
    realAccount: {
      transactions: this.realTransactions,
      totalWin: this.realTransactions.filter(t => t.profit > 0).length,
      totalLoss: this.realTransactions.filter(t => t.profit < 0).length,
      totalValueWin: this.realTransactions.filter(t => t.profit > 0).reduce((acc, t) => acc + t.profit, 0),
      totalValueLoss: this.realTransactions.filter(t => t.profit < 0).reduce((acc, t) => acc + t.profit, 0),
      totalProfit: this.realTransactions.reduce((acc, t) => acc + t.profit, 0)
    },
    realTransactions: this.realTransactions,
    console: this.console,
    balance: this.balance,
    errors: {
      errors: this.errors,
      lastError: this.errors[0] || null,
      errorCount: this.errors.filter(e => e.type === 'error').length
    }
  };
}

  private maskToken(token: string): string {
    if (token.length <= 8) return '***';
    return token.substring(0, 4) + '***' + token.substring(token.length - 4);
  }

  private formatUptime(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  // Métodos de configuração
  setDuplicateProtection(enabled: boolean): void {
    this.tradeExecutor.setDuplicateProtection(enabled);
  }

  setCurrency(currency: string): void {
    this.tradeExecutor.setCurrency(currency);
  }

  setAppMarkupPercentage(percentage: number): void {
    this.tradeExecutor.setAppMarkupPercentage(percentage);
  }
  
  // Getters para informações da sessão
  getDemoToken(): string {
    return this.demoToken;
  }
  
  getRealToken(): string {
    return this.realToken;
  }
  
  getSessionId(): string | undefined {
    return this.sessionId;
  }
  
  setSessionId(sessionId: string): void {
    this.sessionId = sessionId;
  }
}