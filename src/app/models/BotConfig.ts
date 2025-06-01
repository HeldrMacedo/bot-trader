export class BotConfig {

  consecutiveLoss: number = 0;
  quantityLoss: number = 0;
  

  stopLoss: number = 0;
  stopWin: number = 0;
  

  initialValue: number = 0;
  stakeMultiple: number = 1;
  pauseTime: number = 0;
  

  tradeReal: number = 0;
  winReal: number = 0;
  lossReal: number = 0;
  

  pauseOnWin: boolean = false;
  pauseOnLoss: boolean = false;
  

  currentStake: number = 0;
  totalProfit: number = 0;
  isRealAccount: boolean = false;


  totalLoss: number = 0;
  totalWin: number = 0;

  isCopyTrader: boolean = false;
  
  constructor(config?: Partial<BotConfig>) {
    if (config) {
      Object.assign(this, config);
    }
    this.currentStake = this.initialValue;
  }
  
  handleWin(profit: number): void {
    console.log('handleWin', this.isRealAccount);
    if (this.isRealAccount) {
      this.winReal++;
      this.tradeReal++;
      this.totalWin += profit;
      console.log('QUANTITY WIN', this.winReal);
      if (this.stopWin > 0 && this.totalWin >= this.stopWin) {
        throw new Error("Stop Win atingido!");
      }


      this.isRealAccount = false;
      this.currentStake = this.initialValue;
    }

    this.consecutiveLoss = 0;
    
  }
  
  handleLoss(loss: number): void {
    console.log('handleLoss', this.isRealAccount);
    if (this.isRealAccount) {
      this.lossReal++;
      this.tradeReal++;
      this.totalLoss += loss;
      console.log('QUANTITY LOSS', this.lossReal);
      if (this.stopLoss > 0 && Math.abs(this.totalLoss) >= this.stopLoss) {
        throw new Error("Stop Loss atingido!");
      }

      this.currentStake = this.currentStake * this.stakeMultiple;

      this.isRealAccount = false;
      
    } else {
      this.consecutiveLoss++;

      if (this.consecutiveLoss >= this.quantityLoss && this.quantityLoss > 0) {
        this.isRealAccount = true;
      }
      
    }
    
    
  }
  
  shouldPause(isWin: boolean): boolean {
    console.log("pauseTime", this.pauseTime);
    if (this.pauseTime <= 0) return false;
    
    if (isWin && this.pauseOnWin) {
      console.log("pauseOnWin", this.pauseOnWin);
      return true;
    }
    if (!isWin && this.pauseOnLoss) {
      console.log("pauseOnLoss", this.pauseOnLoss);
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