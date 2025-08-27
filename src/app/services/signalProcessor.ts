import { TradeSignal } from '../types/types';
import { TradeExecutor } from './tradeExecutor';

export class SignalProcessor {
  private tradeExecutor: TradeExecutor;
  private isEnabled = false;
  private marketMappings: Record<string, number> = {
    'R_100': 1,
    'R_50': 2,
    'R_75': 3,
    'R_25': 4,
    'R_10': 5,
    '1HZ100V': 6,
    '1HZ10V': 7,
    'RDBULL': 8,
    'RDBEAR': 9,
    'JD100': 10
  };

  // Tipos de contrato válidos baseados no method_394
  private validContractTypes = [
    'CALL', 'PUT', 'CALLE', 'PUTE',
    'ONETOUCH', 'NOTOUCH',
    'RESETCALL', 'RESETPUT',
    'RUNHIGH', 'RUNLOW',
    'DIGITODD', 'DIGITEVEN',
    'DIGITOVER', 'DIGITUNDER',
    'DIGITMATCH', 'DIGITDIFF'
  ];

  constructor(tradeExecutor: TradeExecutor) {
    this.tradeExecutor = tradeExecutor;
  }

  async processSignal(signal: TradeSignal): Promise<void> {
    try {
      console.log('Processing advanced trade signal:', signal);
      
      // Validações avançadas baseadas no method_394
      if (!this.validateSignalAdvanced(signal)) {
        console.log('Advanced signal validation failed');
        return;
      }

      // Processa o sinal baseado no tipo de mercado
      const processedSignal = signal.isForex ? 
        this.processForexSignal(signal) : 
        this.processNonForexSignal(signal);
      
      if (!processedSignal) {
        console.log('Signal processing failed');
        return;
      }
      
      // Executa a operação na conta real
      await this.tradeExecutor.executeTrade(processedSignal);
      
    } catch (error) {
      console.error('Error processing signal:', error);
      throw error;
    }
  }

  private validateSignalAdvanced(signal: TradeSignal): boolean {
    // Validações básicas
    if (!signal.symbol || !signal.contractType || !signal.contractId) {
      console.log('Missing required signal fields');
      return false;
    }

    // Valida tipo de contrato
    if (!this.validContractTypes.includes(signal.contractType)) {
      console.log('Invalid contract type:', signal.contractType);
      return false;
    }

    // Valida duração
    if (signal.duration <= 0) {
      console.log('Invalid duration:', signal.duration);
      return false;
    }

    // Valida valor
    if (signal.amount <= 0) {
      console.log('Invalid amount:', signal.amount);
      return false;
    }

    // Validações específicas por tipo de contrato
    const barrierTypes = ['ONETOUCH', 'NOTOUCH', 'CALL', 'PUT', 'DIGITOVER', 'DIGITUNDER'];
    if (barrierTypes.includes(signal.contractType) && !signal.barrier) {
      console.log('Barrier required for contract type:', signal.contractType);
      return false;
    }

    return true;
  }

  private processForexSignal(signal: TradeSignal): TradeSignal | null {
    // Processamento específico para Forex (lógica simplificada)
    console.log('Processing Forex signal:', signal.symbol);
    return signal;
  }

  private processNonForexSignal(signal: TradeSignal): TradeSignal | null {
    // Processamento específico para Non-Forex
    console.log('Processing Non-Forex signal:', signal.symbol);
    
    // Mapeia o mercado
    const marketId = this.marketMappings[signal.symbol];
    if (!marketId) {
      console.error('Unknown market symbol:', signal.symbol);
      return null;
    }

    return signal;
  }

  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    console.log('Signal processing', enabled ? 'enabled' : 'disabled');
  }

  isProcessingEnabled(): boolean {
    return this.isEnabled;
  }

  // Método para adicionar novos mapeamentos de mercado
  addMarketMapping(symbol: string, id: number): void {
    this.marketMappings[symbol] = id;
  }

  // Método para obter estatísticas
  getValidContractTypes(): string[] {
    return [...this.validContractTypes];
  }
}