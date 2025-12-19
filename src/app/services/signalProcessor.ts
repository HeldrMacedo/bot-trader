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
    '1HZ15V': 8,
    '1HZ25V': 9,
    '1HZ30V': 10,
    '1HZ50V': 11,
    '1HZ75V': 12,
    '1HZ90V': 13,
    'RDBULL': 14,
    'RDBEAR': 15,
    'JD10': 16,
    'JD25': 17,
    'JD50': 18,
    'JD75': 19,
    'JD100': 20,
    'BOOM900': 21,
    'BOOM1000': 23,
    'CRASH300N': 24,
    'CRASH500': 25,
    'CRASH600': 26,
    'CRASH900': 27,
    'CRASH1000': 28,
    'WLDEUR': 29,
    'WLDGBP': 30,
    'WLDXAU': 31,
    'WLDUSD': 32,
    'RB100': 33,
    'RB200': 34,
    'stpRNG': 35,
    'stpRNG2': 36,
    'stpRNG3': 37,
    'stpRNG4': 38,
    'stpRNG5': 39,
    'frxAUDCAD': 40,
    'frxAUDCHF': 41,
    'frxAUDJPY': 42,
    'frxAUDNZD': 43,
    'frxAUDUSD': 44,
    'frxEURAUD': 45,
    'frxEURCAD': 46,
    'frxEURCHF': 47,
    'frxEURGBP': 48,
    'frxEURJPY': 49,
    'frxEURNZD': 50,
    'frxEURUSD': 51,
    'frxGBPAUD': 52,
    'frxGBPCAD': 53,
    'frxGBPCHF': 54,
    'frxGBPJPY': 55,
    'frxGBPNZD': 56,
    'frxGBPUSD': 57,
    'frxGBPNOK': 58,
    'frxNZDJPY': 59,
    'frxNZDUSD': 60,
    'frxUSDCAD': 61,
    'frxUSDCHF': 62,
    'frxUSDJPY': 63,
    'frxUSDMXN': 64,
    'frxUSDNOK': 65,
    'frxUSDOLN': 66,
    'frxUSDPLN': 67,
    'frxUSDSEK': 68,
    'cryETHUSD': 69,
    'BOOM600': 70,
    'BOOM500': 71,
    'BOOM300N': 72,
    'cryBTCUSD': 73,
    'OTC_AS51': 74,
    'WLDAUD': 75,
    'OTC_DJI': 76,
    'OTC_NDX': 77,
    'OTC_SPC': 78,
    'OTC_FTSE': 79,
    'OTC_SSMI': 80,
    'frxXAGUSD': 81,
    'frxXPTUSD': 82,
    'frxXPDUSD': 83,
    'OTC_AEX': 84,
    'OTC_N225': 85,
    'OTC_HSI': 86,
    'frxXAUUSD': 87,
    'OTC_GDAXI': 88,
    'OTC_FCHI': 89,
    'OTC_SX5E': 90,
  };

  // Tipos de contrato válidos baseados no method_394
  private validContractTypes = [
    'CALL', 'PUT', 'CALLE', 'PUTE',
    'ONETOUCH', 'NOTOUCH',
    'RESETCALL', 'RESETPUT',
    'RUNHIGH', 'RUNLOW',
    'DIGITODD', 'DIGITEVEN',
    'DIGITOVER', 'DIGITUNDER',
    'DIGITMATCH', 'DIGITDIFF',
    'UNDEROVER', 'ODDEVEN',
    'HILO', 'RISEFALL',
    'ONLYUPDOWN', 'LISTENER'
  ];

  constructor(tradeExecutor: TradeExecutor) {
    this.tradeExecutor = tradeExecutor;
  }

  async processSignal(signal: TradeSignal): Promise<void> {
    try {
      
      // Validações avançadas baseadas no method_394
      if (!this.validateSignalAdvanced(signal)) {
        return;
      }

      // Processa o sinal baseado no tipo de mercado
      const processedSignal = signal.isForex ? 
        this.processForexSignal(signal) : 
        this.processNonForexSignal(signal);
      
      if (!processedSignal) {
        return;
      }
      
      // Executa a operação na conta real
      await this.tradeExecutor.executeTrade(processedSignal);
      
    } catch (error) {
      throw error;
    }
  }

  private validateSignalAdvanced(signal: TradeSignal): boolean {
    // Validações básicas
    if (!signal.symbol || !signal.contractType || !signal.contractId) {
      return false;
    }

    // Valida tipo de contrato
    if (!this.validContractTypes.includes(signal.contractType)) {
      return false;
    }

    // Valida duração
    if (signal.duration <= 0) {
      return false;
    }

    // Valida valor
    if (signal.amount <= 0) {
      return false;
    }

    // Validações específicas por tipo de contrato
    const barrierTypes = [ 'CALL', 'PUT', 'CALLE', 'PUTE',
    'ONETOUCH', 'NOTOUCH',
    'RESETCALL', 'RESETPUT',
    'RUNHIGH', 'RUNLOW',
    'DIGITODD', 'DIGITEVEN',
    'DIGITOVER', 'DIGITUNDER',
    'DIGITMATCH', 'DIGITDIFF',
    'UNDEROVER', 'ODDEVEN',
    'HILO', 'RISEFALL',
    'ONLYUPDOWN', 'LISTENER'];
    if (!barrierTypes.includes(signal.contractType)) {
      return false;
    }

    return true;
  }

  private processForexSignal(signal: TradeSignal): TradeSignal | null {
    // Processamento específico para Forex (lógica simplificada)
    return signal;
  }

  private processNonForexSignal(signal: TradeSignal): TradeSignal | null {
    // Processamento específico para Non-Forex
    
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