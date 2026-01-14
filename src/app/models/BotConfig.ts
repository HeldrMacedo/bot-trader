// BotConfig.ts - Complete trading configuration
// Migrated from bot-ia legacy system

export interface BotConfigInterface {
    // Trade settings
    symbol: string;
    stake: number;
    duration: number;
    durationUnit: string;
    tradeType: string;
    prediction: number;
    
    // Management settings
    stopLoss: number;
    takeProfit: number;  // Also known as goal
    
    // Gale/Martingale settings
    galeActive: boolean;
    galeAdjustment: number;    // Multiplier for formula: (Losses / (Payout-1)) × Adjustment
    galeSplitThreshold: number; // Minimum loss to trigger split
    galeSplitCount: number;    // Number of parts to split Gale
    martingaleFactor: number;  // Legacy: simple multiplier
    martingaleLevels: number;  // Legacy: max levels
    
    // Soros settings
    sorosLimit: number;        // Max consecutive wins for Soros
    sorosProfitPercentage: number; // % of profit to reinvest
    galeRemovesSoros: boolean; // Protect Soros profit from Gale calc
    
    // Controller/Mode limits
    realWinsLimit: number;     // winReal
    realLossesLimit: number;   // lossReal
    simulatedWinsLimit: number; // winSimulated
    simulatedLossesLimit: number; // lossSimulated
    
    // Session limits
    tradeLimit: number;        // Max trades per session (0 = unlimited)
    cooldown: number;          // Ticks between trades
    
    // Pause settings
    pauseOnWin: boolean;
    pauseOnLoss: boolean;
    pauseTime: number;         // Seconds to pause
    
    // BOTH mode
    bothModeEnabled: boolean;
}

export class BotConfig implements BotConfigInterface {
    // Trade settings
    symbol: string = '';
    stake: number = 0.35;
    duration: number = 5;
    durationUnit: string = 't';
    tradeType: string = 'CALL';
    prediction: number = 0;
    
    // Management settings
    stopLoss: number = 0;
    takeProfit: number = 0;
    
    // Gale/Martingale settings
    galeActive: boolean = true;
    galeAdjustment: number = 1;
    galeSplitThreshold: number = 0;
    galeSplitCount: number = 1;
    martingaleFactor: number = 2;
    martingaleLevels: number = 5;
    
    // Soros settings
    sorosLimit: number = 0;
    sorosProfitPercentage: number = 100;
    galeRemovesSoros: boolean = false;
    
    // Controller/Mode limits
    realWinsLimit: number = 5;
    realLossesLimit: number = 1;
    simulatedWinsLimit: number = 0;
    simulatedLossesLimit: number = 1;
    
    // Session limits
    tradeLimit: number = 0;
    cooldown: number = 3;
    
    // Pause settings
    pauseOnWin: boolean = false;
    pauseOnLoss: boolean = false;
    pauseTime: number = 5;
    
    // BOTH mode
    bothModeEnabled: boolean = false;
    
    // Legacy fields (kept for backward compatibility)
    consecutiveLoss: number = 0;
    quantityLoss: number = 0;
    initialValue: number = 0;
    stakeMultiple: number = 1;
    tradeReal: number = 0;
    winReal: number = 0;
    lossReal: number = 0;
    currentStake: number = 0;
    totalProfit: number = 0;
    isRealAccount: boolean = false;
    totalLoss: number = 0;
    totalWin: number = 0;
    isCopyTrader: boolean = false;
    stopWin: number = 0;  // Legacy alias for takeProfit
  
  constructor(config?: Partial<BotConfig>) {
    if (config) {
      Object.assign(this, config);
    }
    this.currentStake = this.initialValue;
  }
  
  handleWin(profit?: number): void {
    if (this.isRealAccount) {
      this.winReal++;
      this.tradeReal++;
      this.totalWin += profit;
      
      if (this.stopWin > 0 && this.totalWin >= this.stopWin) {
        throw new Error("Stop Win atingido!");
      }

      if (!this.fluxoSomenteComPauseTime()) {
        this.isRealAccount = false;
      }
      
      this.currentStake = this.initialValue;
    }

    this.consecutiveLoss = 0;
    
  }
  
  handleLoss(loss?: number): void {
    if (this.isRealAccount) {
      this.lossReal++;
      this.tradeReal++;
      this.totalLoss += loss;

      if (this.stopLoss > 0 && Math.abs(this.totalLoss) >= this.stopLoss) {
        throw new Error("Stop Loss atingido!");
      }

      this.currentStake = this.currentStake * this.stakeMultiple;
      if (!this.fluxoSomenteComPauseTime()) {
        this.isRealAccount = false;
      }
      
      
    } else {
      this.consecutiveLoss++;

      if (this.consecutiveLoss >= this.quantityLoss && this.quantityLoss > 0) {
        this.isRealAccount = true;
      }
      
    }
    
    
  }
  
  shouldPause(isWin: boolean): boolean {
    if (this.pauseTime <= 0) return false;
    
    if (isWin && this.pauseOnWin) {
      return true;
    }
    if (!isWin && this.pauseOnLoss) {
      return true;
    }
    
    return false;
  }


  fluxoSomenteComPauseTime(): boolean {
    return this.pauseTime > 0 && this.quantityLoss === 0 && (this.pauseOnWin || this.pauseOnLoss);
  }


  reset(): void {
    this.consecutiveLoss = 0;
    this.currentStake = this.initialValue;
    this.totalProfit = 0;
    this.isRealAccount = false;
    
  }
}