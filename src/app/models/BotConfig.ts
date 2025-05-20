export class BotConfig {
  // Contadores
  consecutiveLoss: number = 0;
  quantityLoss: number = 0;
  
  // Limites
  stopLoss: number = 0;
  stopWin: number = 0;
  
  // Valores
  initialValue: number = 0;
  stakeMultiple: number = 1;
  pauseTime: number = 0;
  
  // Estatísticas
  tradeReal: number = 0;
  winReal: number = 0;
  lossReal: number = 0;
  
  // Configurações de pausa
  pauseOnWin: boolean = false;
  pauseOnLoss: boolean = false;
  
  // Estado atual
  currentStake: number = 0;
  totalProfit: number = 0;
  isRealAccount: boolean = false;


  totalLoss: number = 0;
  totalWin: number = 0;
  
  constructor(config?: Partial<BotConfig>) {
    if (config) {
      Object.assign(this, config);
    }
    this.currentStake = this.initialValue;
  }
  
  // Método chamado quando ocorre uma vitória
  handleWin(profit: number): void {

    if (this.isRealAccount) {
      console.log("Vitoria");
      this.winReal++;
      this.tradeReal++;
      this.totalWin += profit;
      
      // Verificar se atingiu o Stop Win
      if (this.stopWin > 0 && this.totalWin >= this.stopWin) {
        throw new Error("Stop Win atingido!");
      }

      if (!this.pauseOnWin) {
        this.isRealAccount = false;
      }
      
    }
    
    // Resetar contador de perdas consecutivas
    this.consecutiveLoss = 0;
    
    // Resetar o valor da aposta para o valor inicial
    this.currentStake = this.initialValue;
  }
  
  // Método chamado quando ocorre uma perda
  handleLoss(loss: number): void {
    if (this.isRealAccount) {
      this.lossReal++;
      this.tradeReal++;
      this.totalLoss += loss;
      
      // Verificar se atingiu o Stop Loss
      if (this.stopLoss > 0 && Math.abs(this.totalLoss) >= this.stopLoss) {
        throw new Error("Stop Loss atingido!");
      }

      if (!this.pauseOnLoss) {
        this.isRealAccount = false;

      } 
      
      this.currentStake = this.currentStake * this.stakeMultiple;
    } else {
      // Incrementar contador de perdas consecutivas
      this.consecutiveLoss++;

      if (this.consecutiveLoss >= this.quantityLoss) {
        this.isRealAccount = true;
      }
      
    }
    
    
  }
  
  // Verificar se deve pausar após uma operação
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
  
  // Resetar configurações
  reset(): void {
    this.consecutiveLoss = 0;
    this.currentStake = this.initialValue;
    this.totalProfit = 0;
    this.isRealAccount = false;
  }
}