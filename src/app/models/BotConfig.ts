export class BotConfig {
  // Contadores
  consecutiveLoss: number = 0;
  quantityLoss: number = 0;
  
  // Limites
  stopLoss: number = 0;
  stopWin: number = 0;
  
  // Valores
  initialValue: number = 0;
  stakeMultiple: number = 0;
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
  
  constructor(config?: Partial<BotConfig>) {
    if (config) {
      Object.assign(this, config);
    }
    this.currentStake = this.initialValue;
  }
  
  // Método chamado quando ocorre uma vitória
  handleWin(profit: number): void {
    if (this.isRealAccount) {
      this.winReal++;
      this.tradeReal++;
      this.totalProfit += profit;
      
      // Verificar se atingiu o Stop Win
      if (this.stopWin > 0 && this.totalProfit >= this.stopWin) {
        throw new Error("Stop Win atingido!");
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
      this.totalProfit -= loss;
      
      // Verificar se atingiu o Stop Loss
      if (this.stopLoss > 0 && Math.abs(this.totalProfit) >= this.stopLoss) {
        throw new Error("Stop Loss atingido!");
      }
    } else {
      // Incrementar contador de perdas consecutivas
      this.consecutiveLoss++;
      
      // Verificar se deve mudar para conta real
      if (this.consecutiveLoss >= this.quantityLoss) {
        this.isRealAccount = true;
      }
    }
    
    // Aplicar martingale (multiplicador de aposta)
    this.currentStake = this.currentStake * this.stakeMultiple;
  }
  
  // Verificar se deve pausar após uma operação
  shouldPause(isWin: boolean): boolean {
    if (this.pauseTime <= 0) return false;
    
    if (isWin && this.pauseOnWin) return true;
    if (!isWin && this.pauseOnLoss) return true;
    
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