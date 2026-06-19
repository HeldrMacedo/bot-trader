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
  private maxMartingale: number = 0; // 0 = sem limite
  private onMaxMartingale: 'stop' | 'reset' = 'reset'; // Ação ao atingir limite

  // Estados internos
  private consecutiveLosses: number = 0;
  private martingaleLevel: number = 0; // Nível atual de martingale
  private currentStake: number = 0;
  private totalProfit: number = 0;
  private totalLoss: number = 0;
  private isPaused: boolean = false;
  private pauseEndTime: number = 0;
  private onTrade: boolean = false; // Guard: true enquanto um trade real está ativo (equivale a bool_89 do ZeekBot)
  private isInRealMode: boolean = false; // true quando consecutiveLosses >= quantityLoss — permanece até sair win na real


  // Dados das contas
  private demoTransactions: any[] = [];
  private realTransactions: any[] = [];
  private console: string[] = [];
  private balance: number = 0;

  private errors: ErrorNotification[] = [];
  private maxErrors: number = 50;

  private authErrorInfo: { code: string; message: string; source: string } | null = null;

  private contract_id: any;

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
    this.stakeMultiple = configure?.stakeMultiple ?? 1;
    this.pauseTime = configure?.pauseTime || 0;
    this.pauseTimeLoss = configure?.pauseTimeLoss || false;
    this.pauseTimeWin = configure?.pauseTimeWin || false;
    this.maxMartingale = configure?.maxMartingale || 0;
    this.onMaxMartingale = configure?.onMaxMartingale || 'reset';

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

  }

  private processTransaction(transaction: any, isDemo: boolean) {
    if (isDemo) {
      if (!this.shouldProcessSignal()) {
        this.console.push({ ...transaction, isDemo: true });
      }
      //this.demoTransactions.push(transaction);
      this.handleDemoTransaction(transaction);
    } else {
      this.console.push({ ...transaction, isDemo: false });
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

  private calculateNextStake(): number {
    // Progressão geométrica: initialValue * (1 + stakeMultiple)^martingaleLevel
    // Usa martingaleLevel (não consecutiveLosses) para respeitar o reset do maxMartingale
    const level = this.martingaleLevel;

    // Para nível 0, retorna o valor inicial
    if (level === 0) {
      return Number(this.initialValue.toFixed(2));
    }

    const ratio = 1 + this.stakeMultiple;
    const rawStake = this.initialValue * Math.pow(ratio, level);

    // Arredondamento padrão para 2 casas decimais (fiat)
    return Number(rawStake.toFixed(2));
  }

  private handleRealTransaction(transaction: any) {
    const isWin = parseFloat(transaction.profit) > 0;
    const profit = parseFloat(transaction.profit);

    if (isWin) {
      // Sai do modo real: volta a aguardar sequência de losses na demo
      this.isInRealMode = false;
      this.consecutiveLosses = 0;

      this.totalProfit += profit;
      this.martingaleLevel = 0;
      this.currentStake = Number(this.initialValue.toFixed(2));



      if (this.pauseTimeWin) {
        this.applyPause(this.pauseTime, 'win');
      }

      if (this.stopWin > 0 && this.totalProfit >= this.stopWin) {
        this.stop();
        return;
      }
    } else {
      this.totalLoss += Math.abs(profit);
      this.martingaleLevel += 1;

      // Verifica limite de martingale
      if (this.maxMartingale > 0 && this.martingaleLevel >= this.maxMartingale) {
        if (this.onMaxMartingale === 'stop') {
          this.addError('warning', 'Martingale Máximo', `Nível máximo de martingale (${this.maxMartingale}) atingido. Parando bot.`, 'trading');
          this.stop();
          return;
        } else {
          // reset: volta ao valor inicial e zera o nível
          this.addError('info', 'Martingale Reset', `Nível máximo de martingale (${this.maxMartingale}) atingido. Resetando stake para valor inicial.`, 'trading');
          this.martingaleLevel = 0;
          this.currentStake = Number(this.initialValue.toFixed(2));
        }
      } else {
        this.currentStake = this.calculateNextStake();
      }

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


    // Atualizar timePause em tempo real
    const updateTimer = setInterval(() => {
      const remainingTime = Math.max(0, this.pauseEndTime - Date.now());
      this.timePause = Math.ceil(remainingTime / 1000);

      if (remainingTime <= 0) {
        this.isPaused = false;
        this.timePause = 0;

        clearInterval(updateTimer);
      }
    }, 1000);
  }



  private setupEventHandlers(): void {
    // Handler de sinais da conta demo — executa trade na real
    this.wsListener.on('tradeSignal', async (signal: TradeSignal) => {
      this.stats.signalsReceived++;
      this.stats.lastSignalTime = new Date();

      try {
        // Guard: bloqueia se já existe um trade real em andamento (equivale a bool_89 do ZeekBot)
        if (this.onTrade) {
          this.addError('info', 'Trade Bloqueado', `Sinal ignorado: trade real em andamento (contract: ${this.contract_id})`, 'trading');
          return;
        }

        if (!this.shouldProcessSignal()) {
          if (this.isPaused) {
            this.addError('info', 'Trade Pausado', `Aguardando ${this.timePause}s para próximo trade`, 'trading');
          } else {
            const remaining = this.quantityLoss - this.consecutiveLosses;
            this.addError('info', 'Aguardando Losses', `Necessário ${remaining} loss${remaining !== 1 ? 'es' : ''} consecutivo${remaining !== 1 ? 's' : ''} na demo`, 'trading');
          }
          return;
        }

        // Ativa guard ANTES de executar (como bool_89 = true no ZeekBot)
        this.onTrade = true;
        this.contract_id = signal.contractId;

        // Entra no modo real: permanece fazendo entradas na real até sair um win
        if (this.quantityLoss > 0) {
          this.isInRealMode = true;
        }

        await this.signalProcessor.processSignal({ ...signal, amount: this.currentStake });
        this.stats.tradesExecuted++;
        this.stats.lastTradeTime = new Date();

        this.addError('success', 'Trade Executado', `Trade ${signal.contractType} executado com sucesso`, 'trading', {
          symbol: signal.symbol,
          amount: this.currentStake
        });

      } catch (error) {
        // Em caso de erro, libera o guard para permitir próximo trade
        this.onTrade = false;
        this.contract_id = null;
        this.stats.errors++;
        this.addError('error', 'Erro no Trade', `Falha ao processar sinal: ${error.message}`, 'trading', error);
      }
    });

    // Handler de resultado do trade real — libera guard
    this.tradeExecutor.on('transaction', (transaction: any) => {
      // Camada defensiva: evita reprocessar transações já tratadas (caso alguma duplicata passe pelo tradeExecutor)
      if (transaction.contract_id) {
        const alreadyProcessed = this.realTransactions.some(t => t.contract_id === transaction.contract_id);
        if (alreadyProcessed) {
          return;
        }
      }

      // Libera guard APÓS resultado do trade real (como bool_89 = false no ZeekBot)
      this.onTrade = false;
      this.processTransaction({ ...transaction, amount: transaction.profit }, false);
    });

    // Handler de resultado da conta demo (sell)
    this.wsListener.on('sellTransaction', (transaction: any) => {

      if (this.isPaused) {
        return;
      }

      // Ignora sell do contrato que foi copiado para a real
      if (this.contract_id === transaction.contract_id) {
        return;
      }

      // Ignora sell da demo enquanto trade real está ativo
      if (this.onTrade) {
        return;
      }
      this.processTransaction(transaction, true);
    });

    this.tradeExecutor.on('balance', (balance) => {
      this.balance = balance;
    });

    this.tradeExecutor.on('error', (error) => {
      // Libera guard em caso de erro no executor
      this.onTrade = false;
      this.stats.errors++;
      this.addError('error', 'Erro no Trade Executor', `Falha ao processar transação: ${error.message}`, 'trading', error);
    });

    this.wsListener.on('connected', () => {
    });

    this.wsListener.on('disconnected', () => {
      if (this.isRunning) {
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

    // Handler de erro de autenticação na conta demo (ex: AccountDisabled)
    this.wsListener.on('authError', (error: { code: string; message: string }) => {
      console.error(`[Session ${this.sessionId}] Demo auth error:`, error);
      this.authErrorInfo = { code: error.code, message: error.message, source: 'demo' };
      this.addError('error', 'Conta Demo Desabilitada', `${error.message} (${error.code})`, 'auth', error);
      this.stop();
    });

    // Handler de erro de autenticação na conta real (ex: AccountDisabled)
    this.tradeExecutor.on('authError', (error: { code: string; message: string }) => {
      console.error(`[Session ${this.sessionId}] Real auth error:`, error);
      this.authErrorInfo = { code: error.code, message: error.message, source: 'real' };
      this.addError('error', 'Conta Real Desabilitada', `${error.message} (${error.code})`, 'auth', error);
      this.stop();
    });
  }

  private shouldProcessSignal(): boolean {

    if (this.isPaused) {
      return false;
    }

    // Se quantityLoss é 0, sempre processa o sinal
    if (this.quantityLoss === 0) {
      return true;
    }

    // Modo real ativo: continua operando na real até sair um win
    if (this.isInRealMode) {
      return true;
    }

    // Modo demo: aguarda atingir a sequência de losses configurada
    return this.consecutiveLosses >= this.quantityLoss;
  }

  async start(): Promise<void> {
    try {


      if (this.isRunning) {
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

    } catch (error) {
      throw error;
    }
  }

  private async connectMasterWithRetry(maxAttempts = 3): Promise<void> {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        await this.tradeExecutor.connectToMaster();
        return;
      } catch (error) {
        if (attempt === maxAttempts) {
          throw error;
        }
        await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
      }
    }
  }

  stop(): void {

    this.isRunning = false;
    this.signalProcessor.setEnabled(false);
    this.wsListener.disconnect();
    this.tradeExecutor.disconnect();
    this.clearAllDados();
  }

  clearAllDados() {
    this.totalProfit = 0;
    this.totalLoss = 0;
    this.isPaused = false;
    this.consecutiveLosses = 0;
    this.martingaleLevel = 0;
    this.currentStake = 0;
    this.onTrade = false;
    this.contract_id = null;
    this.isInRealMode = false;
  }

  getStats() {
    return {
      isRunning: this.isRunning,
      timePause: this.timePause,
      authError: this.authErrorInfo,
      trading: {
        consecutiveLosses: this.consecutiveLosses,
        martingaleLevel: this.martingaleLevel,
        maxMartingale: this.maxMartingale,
        onMaxMartingale: this.onMaxMartingale,
        currentStake: this.currentStake,
        onTrade: this.onTrade,
        isInRealMode: this.isInRealMode,
      },
      realAccount: {
        transactions: this.realTransactions,
        totalWin: this.realTransactions.filter(t => parseFloat(t.profit) > 0).length,
        totalLoss: this.realTransactions.filter(t => parseFloat(t.profit) < 0).length,
        totalValueWin: this.realTransactions.filter(t => parseFloat(t.profit) > 0).reduce((acc, t) => acc + parseFloat(t.profit), 0),
        totalValueLoss: this.realTransactions.filter(t => parseFloat(t.profit) < 0).reduce((acc, t) => acc + parseFloat(t.profit), 0),
        totalProfit: this.realTransactions.reduce((acc, t) => acc + parseFloat(t.profit), 0)
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