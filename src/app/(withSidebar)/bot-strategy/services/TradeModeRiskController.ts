// TradeModeRiskController.ts
// Migrated from bot-ia/js/trade/TradeModeRiskController.js
// Handles: Gale system (with Split), Mode switching, Soros integration, P&L tracking

export type TradeMode = 'SIMULACAO' | 'REAL' | 'VIRTUAL';
export type TradeResult = 'WIN' | 'LOSS' | 'MIXED';

export interface RiskControllerConfig {
    // Gale settings
    galeActive: boolean;
    galeAdjustment: number;  // Multiplier for Gale formula
    galeSplit: number;       // Number of parts to split Gale
    galeSplitThreshold: number; // Minimum accumulated loss to trigger split
    stake: number;           // Base stake
    
    // Soros settings
    sorosLimit: number;      // Maximum consecutive wins for Soros
    sorosPercentage: number; // Percentage of profit to reinvest
    galeRemovesSoros: boolean; // Remove Soros profit from Gale calculation
    
    // Mode limits
    realWinsLimit: number;
    realLossesLimit: number;
    simulatedWinsLimit: number;
    simulatedLossesLimit: number;
    
    // Stop limits
    goal: number;      // Take profit target
    stopLoss: number;  // Stop loss limit
}

export interface RiskControllerState {
    currentMode: TradeMode;
    realWinsStreak: number;
    realLossesStreak: number;
    simulatedWinsStreak: number;
    simulatedLossesStreak: number;
    accumulatedLosses: number;
    sessionProfitLoss: number;
    pendingSplitWins: number;
    sorosWins: number;
    nextSorosStake: number | null;
}

// Fallback payouts for Gale calculation when real payout not available
const FALLBACK_PAYOUTS: Record<string, number | Record<number, number>> = {
    'DIGITDIFF': 1.095,
    'DIGITMATCH': 8.70,
    'DIGITEVEN': 1.92,
    'DIGITODD': 1.92,
    'CALL': 1.92,
    'PUT': 1.92,
    'CALLE': 1.92,
    'PUTE': 1.92,
    'DIGITOVER': { 0: 1.08, 1: 1.21, 2: 1.36, 3: 1.55, 4: 1.87, 5: 2.30, 6: 3.05, 7: 4.60, 8: 8.70 },
    'DIGITUNDER': { 9: 1.08, 8: 1.21, 7: 1.36, 6: 1.55, 5: 1.87, 4: 2.30, 3: 3.05, 2: 4.60, 1: 8.70 }
};

export class TradeModeRiskController {
    private config: RiskControllerConfig;
    private isVirtualAccount: boolean;
    
    // Mode state
    private currentMode: TradeMode = 'SIMULACAO';
    
    // Streak counters
    private realWinsStreak: number = 0;
    private realLossesStreak: number = 0;
    private simulatedWinsStreak: number = 0;
    private simulatedLossesStreak: number = 0;
    
    // Gale system state
    private _accumulatedLosses: number = 0;
    private currentProposalPayout: number | null = null;
    private lastCalculatedStake: number | null = null;
    private lastRealGaleValue: number = 0;
    private pendingGaleApplication: boolean = false;
    private isCalculatingGale: boolean = false;
    private lastExecutedContractType: string | null = null;
    
    // Split Gale state
    private pendingSplitWins: number = 0;
    private lastCalculatedStakeSplitted: number | null = null;
    private lastRealTradeWasLoss: boolean = false;
    private splitGaleJustCompleted: boolean = false;
    
    // Soros state
    private sorosWins: number = 0;
    private nextSorosStake: number | null = null;
    
    // Session tracking
    private sessionProfitLoss: number = 0;
    private initialBalance: number = 0;
    
    // Anti-duplication
    private processedContractIds: Set<string> = new Set();
    private lastRealResultTime: number = 0;
    
    // Callbacks
    public onModeChange: ((mode: TradeMode, reason: string) => void) | null = null;
    public onStopRequired: ((type: 'goal' | 'stoploss' | 'wins' | 'losses', value: number, limit: number) => void) | null = null;
    public onLog: ((message: string) => void) | null = null;

    constructor(config: RiskControllerConfig, isVirtualAccount: boolean = true) {
        this.config = config;
        this.isVirtualAccount = isVirtualAccount;
        this.computeStartMode();
    }

    // Getter with protection against invalid resets
    get accumulatedLosses(): number {
        return this._accumulatedLosses;
    }

    set accumulatedLosses(value: number) {
        // Protection: If Split Gale is active, prevent external reset
        if (value === 0 && this._accumulatedLosses > 0 && this.pendingSplitWins > 0) {
            this.log(`⚠️ [SPLIT PROTECTION] Blocking reset while ${this.pendingSplitWins} wins pending`);
            return;
        }
        this._accumulatedLosses = value;
    }

    private log(message: string): void {
        if (this.onLog) {
            this.onLog(message);
        }
        console.log(`[RiskController] ${message}`);
    }

    // Update configuration dynamically
    updateConfig(newConfig: Partial<RiskControllerConfig>): void {
        this.config = { ...this.config, ...newConfig };
        this.log(`⚙️ Config updated: Split=${this.config.galeSplit}, Threshold=${this.config.galeSplitThreshold}`);
    }

    setProposalPayout(payout: number): void {
        if (payout && !isNaN(payout) && payout > 0) {
            this.currentProposalPayout = payout;
            this.log(`🎯 Payout set: ${this.currentProposalPayout}`);
        }
    }

    // Check if Split Gale is active
    isSplitActive(): boolean {
        return this.pendingSplitWins > 0;
    }

    // Check if Gale should be applied
    shouldApplyGale(): boolean {
        const isGaleConfigActive = this.config.galeActive === true;
        const hasAccumulatedLosses = this._accumulatedLosses > 0;
        const isSplitActive = this.pendingSplitWins > 0;
        const galeAdjustment = this.config.galeAdjustment || 1;
        const isAdjustmentValid = galeAdjustment > 0;

        const shouldApply = isGaleConfigActive && (hasAccumulatedLosses || isSplitActive) && isAdjustmentValid;
        return shouldApply;
    }

    // Calculate Gale stake - Core formula: (Losses / (Payout-1)) × Adjustment
    calculateGaleStake(targetContractType: string | null = null, targetBarrier: number | null = null): number {
        // Protection against infinite loops
        if (this.isCalculatingGale) {
            return this.lastCalculatedStake || this.config.stake;
        }

        this.isCalculatingGale = true;

        try {
            const baseStake = this.config.stake || 0.35;

            if (!this.config.galeActive) {
                return parseFloat(baseStake.toFixed(2));
            }

            // If Gale Adjustment is 0, don't apply Gale
            const galeAdjustment = this.config.galeAdjustment || 1;
            if (galeAdjustment === 0) {
                return parseFloat(baseStake.toFixed(2));
            }

            // Recovery: If we have pending split wins and saved stake, use it
            if (this.pendingSplitWins > 0 && this.lastCalculatedStakeSplitted) {
                if (this._accumulatedLosses <= 0) {
                    this.log(`⚠️ [GALE RECOVERY] Accum reset but Pending=${this.pendingSplitWins}. Using saved stake.`);
                }
                return parseFloat(this.lastCalculatedStakeSplitted.toFixed(2));
            }

            if (this._accumulatedLosses <= 0) {
                return parseFloat(baseStake.toFixed(2));
            }

            // Determine payout to use
            let currentPayout = this.currentProposalPayout || 0;
            let usingFallback = false;

            if (targetContractType) {
                const isTypeDifferent = this.lastExecutedContractType && 
                                       this.lastExecutedContractType !== targetContractType;

                if (isTypeDifferent || !currentPayout || currentPayout <= 0) {
                    let fallbackVal = FALLBACK_PAYOUTS[targetContractType];

                    // Handle barrier-specific payouts for Over/Under
                    if (typeof fallbackVal === 'object' && targetBarrier !== null) {
                        fallbackVal = fallbackVal[targetBarrier] || 1.95;
                    }

                    if (typeof fallbackVal === 'number') {
                        currentPayout = fallbackVal;
                        usingFallback = true;
                        this.log(`🎰 [GALE] Using fallback payout for ${targetContractType}: ${currentPayout}`);
                    }
                }
            }

            if (!currentPayout || currentPayout <= 1 || isNaN(currentPayout)) {
                currentPayout = 2.0; // Emergency fallback
                this.log(`🎰 [EMERGENCY] Using emergency payout 2.0x`);
            }

            let totalLosses = this._accumulatedLosses;

            // Soros protection: Remove Soros profit from first Gale calculation
            if (this.config.galeRemovesSoros && this.lastRealGaleValue === 0) {
                const tolerance = baseStake * 0.05;
                if (totalLosses > (baseStake + tolerance)) {
                    const sorosProfit = totalLosses - baseStake;
                    this.log(`🛡️ [SOROS PROTECTED] Removing Soros profit: $${sorosProfit.toFixed(2)}`);
                    totalLosses = baseStake;
                }
            }

            // Core Gale formula: (Losses / (Payout-1)) × Adjustment
            let stakeGaleCalculated = (totalLosses / (currentPayout - 1)) * galeAdjustment;

            // Split Gale logic
            let galeSplit = this.config.galeSplit || 1;
            const splitThreshold = this.config.galeSplitThreshold || 0;

            // Check if split should be activated based on threshold
            if (this.pendingSplitWins === 0 && totalLosses < splitThreshold) {
                galeSplit = 1; // Below threshold, no split
            }

            if (galeSplit > 1) {
                if (this.pendingSplitWins > 0 && this.lastCalculatedStakeSplitted) {
                    // Continue with existing split stake
                    return parseFloat(this.lastCalculatedStakeSplitted.toFixed(2));
                }

                // New split calculation
                stakeGaleCalculated = stakeGaleCalculated / galeSplit;
                this.pendingSplitWins = galeSplit;
                this.lastCalculatedStakeSplitted = Math.max(stakeGaleCalculated, 0.35);

                this.log(`🎰 [SPLIT GALE] Started! Divided by ${galeSplit}. Need ${galeSplit} consecutive wins.`);
            }

            // Save real calculated value
            this.lastRealGaleValue = stakeGaleCalculated;

            // Apply minimum stake (Deriv minimum is 0.35)
            const finalStake = parseFloat(Math.max(stakeGaleCalculated, 0.35).toFixed(2));

            if (galeSplit > 1) {
                this.lastCalculatedStakeSplitted = finalStake;
            }

            this.log(`🎰 [GALE] Losses=$${totalLosses.toFixed(4)}, Payout=${currentPayout.toFixed(3)}${usingFallback ? '(Fallback)' : ''}, Final=$${finalStake}`);

            return finalStake;

        } catch (error) {
            console.error('❌ Error calculating Gale:', error);
            return this.config.stake || 0.35;
        } finally {
            this.isCalculatingGale = false;
        }
    }

    // Get current stake considering Gale and Soros
    getCurrentStake(contractType: string | null = null): number {
        // Never apply Gale in SIMULACAO mode
        if (this.currentMode === 'SIMULACAO') {
            return this.config.stake;
        }

        // Check if Soros is active (no accumulated losses, soros active)
        if (this.config.sorosLimit > 0 && this.nextSorosStake && this._accumulatedLosses === 0) {
            this.log(`📈 [SOROS] Using Soros stake: ${this.nextSorosStake}`);
            return this.nextSorosStake;
        }

        // Check if Gale should be applied
        if (this.shouldApplyGale() && this.currentProposalPayout) {
            return this.calculateGaleStake(contractType);
        }

        // Use saved Gale stake if available
        if (this.lastCalculatedStake && this._accumulatedLosses > 0) {
            return this.lastCalculatedStake;
        }

        return this.config.stake;
    }

    // Handle trade result
    handleTradeResult(
        result: TradeResult,
        contractId: string | null = null,
        tradeStake: number | null = null,
        profit: number = 0
    ): void {
        // Idempotency check
        if (contractId) {
            if (this.processedContractIds.has(contractId)) {
                this.log(`⚠️ [DUPLICATE] Contract ${contractId} already processed`);
                return;
            }
            this.processedContractIds.add(contractId);

            // Cleanup to prevent memory leak
            if (this.processedContractIds.size > 100) {
                this.processedContractIds.clear();
            }
        } else {
            // Debounce by time
            const now = Date.now();
            if (this.lastRealResultTime && (now - this.lastRealResultTime < 500)) {
                return;
            }
            this.lastRealResultTime = now;
        }

        // Update session P&L
        this.sessionProfitLoss += profit;

        const isSimulated = this.currentMode === 'SIMULACAO';

        if (isSimulated) {
            this.handleSimulatedResult(result);
        } else {
            this.handleRealResult(result, tradeStake, profit);
        }

        // Check mode transitions
        this.processModeChanges();

        // Check stop conditions
        this.checkStopConditions();
    }

    private handleSimulatedResult(result: TradeResult): void {
        if (result === 'WIN') {
            this.simulatedWinsStreak++;
            this.simulatedLossesStreak = 0;
            this.log(`🎮 Simulated WIN - streak: ${this.simulatedWinsStreak}`);
        } else if (result === 'LOSS') {
            this.simulatedLossesStreak++;
            this.simulatedWinsStreak = 0;
            this.log(`🎮 Simulated LOSS - streak: ${this.simulatedLossesStreak}`);
        }
        // MIXED doesn't affect simulation streaks
    }

    private handleRealResult(result: TradeResult, tradeStake: number | null, profit: number): void {
        const baseStake = this.config.stake || 0.35;
        const currentTradeStake = tradeStake !== null ? tradeStake : baseStake;
        
        // Determine if this was a Gale trade (stake > base + 5% OR in split sequence)
        let isGaleTrade = currentTradeStake > (baseStake * 1.05);
        if (this.pendingSplitWins > 0) {
            isGaleTrade = true;
        }

        if (result === 'WIN') {
            this.lastRealTradeWasLoss = false;
            this.realWinsStreak++;
            this.realLossesStreak = 0;

            const hadGaleActive = this._accumulatedLosses > 0 || this.lastRealGaleValue > 0;
            const isSplitActive = this.pendingSplitWins > 0;

            // Split Gale reset logic
            if (isSplitActive) {
                if (isGaleTrade) {
                    this.pendingSplitWins--;
                    const totalNeeded = this.config.galeSplit || 1;
                    const winsCompleted = totalNeeded - this.pendingSplitWins;

                    this.log(`🎰 [SPLIT] Win ${winsCompleted}/${totalNeeded} confirmed with Gale!`);

                    if (this.pendingSplitWins <= 0) {
                        // Split sequence complete
                        this._accumulatedLosses = 0;
                        this.lastRealGaleValue = 0;
                        this.pendingSplitWins = 0;
                        this.lastRealTradeWasLoss = false;
                        this.lastCalculatedStakeSplitted = null;
                        this.splitGaleJustCompleted = true;

                        this.log(`🎰 [SPLIT COMPLETE] ${totalNeeded} wins achieved! Gale reset.`);
                    }
                } else {
                    this.log(`🎰 [SPLIT IGNORED] Win with base stake doesn't count for recovery`);
                }
            } else {
                // Standard Gale reset (no split)
                this._accumulatedLosses = 0;
                this.lastRealGaleValue = 0;
                this.lastRealTradeWasLoss = false;

                if (hadGaleActive) {
                    this.log(`🎰 [GALE RESET] System reset after WIN`);
                }
            }

            // Soros logic
            this.processSorosWin(profit, hadGaleActive || this.splitGaleJustCompleted);

            this.log(`💰 Real WIN - streak: ${this.realWinsStreak}`);

        } else if (result === 'LOSS') {
            this.lastRealTradeWasLoss = true;
            this.realLossesStreak++;
            this.realWinsStreak = 0;
            this.splitGaleJustCompleted = false;

            // Accumulate loss
            const lossAmount = tradeStake !== null ? tradeStake : 
                               (this.lastRealGaleValue > 0 ? this.lastRealGaleValue : baseStake);
            this._accumulatedLosses += lossAmount;

            this.log(`💰 Real LOSS - streak: ${this.realLossesStreak}, accumulated: $${this._accumulatedLosses.toFixed(4)}`);

            // Reset Soros on loss
            if (this.config.sorosLimit > 0) {
                this.sorosWins = 0;
                this.nextSorosStake = null;
                this.log(`📉 [SOROS RESET] Loss detected`);
            }

            // Split Gale activation
            const galeSplit = this.config.galeSplit || 1;
            const splitThreshold = this.config.galeSplitThreshold || 0;
            const shouldActivateSplit = galeSplit > 1 && 
                                        (splitThreshold === 0 || this._accumulatedLosses >= splitThreshold);

            if (shouldActivateSplit) {
                this.pendingSplitWins = galeSplit;
                this.log(`🎰 [SPLIT ACTIVATED] Need ${galeSplit} consecutive wins`);

                // Pre-calculate split stake for next trade
                if (this.currentProposalPayout && this.currentProposalPayout > 1) {
                    const galeAdjustment = this.config.galeAdjustment || 1;
                    const estimatedFullStake = (this._accumulatedLosses / (this.currentProposalPayout - 1)) * galeAdjustment;
                    this.lastCalculatedStakeSplitted = Math.max(estimatedFullStake / galeSplit, 0.35);
                    this.log(`🎰 [SPLIT PRE-CALC] Next stake: $${this.lastCalculatedStakeSplitted.toFixed(2)}`);
                }
            }

            if (this.config.galeActive && this._accumulatedLosses > 0) {
                this.log(`🎰 [GALE PENDING] Next trade will use Gale`);
            }
        }
        // MIXED result doesn't affect real streaks
    }

    private processSorosWin(profit: number, wasRecovery: boolean): void {
        if (this.config.sorosLimit <= 0) return;

        if (this.isSplitActive() || this._accumulatedLosses > 0) {
            // Gale active, reset Soros
            this.sorosWins = 0;
            this.nextSorosStake = null;
            return;
        }

        // Don't count recovery wins for Soros
        if (wasRecovery) {
            this.sorosWins = 0;
            this.nextSorosStake = null;
            this.log(`📈 [SOROS IGNORED] Recovery win doesn't count. Next win starts fresh.`);
            return;
        }

        this.sorosWins++;

        if (this.sorosWins <= this.config.sorosLimit) {
            // Apply profit percentage
            const profitPercentage = this.config.sorosPercentage || 100;
            const adjustedProfit = profit * (profitPercentage / 100);
            
            // Next stake = current stake + adjusted profit
            const currentStake = this.nextSorosStake || this.config.stake;
            this.nextSorosStake = Math.round((currentStake + adjustedProfit) * 100) / 100;

            this.log(`📈 [SOROS] Win ${this.sorosWins}/${this.config.sorosLimit}. Next: $${this.nextSorosStake}`);
        } else {
            // Soros target reached, reset
            this.log(`📈 [SOROS TARGET] ${this.config.sorosLimit} wins reached! Resetting to base stake.`);
            this.sorosWins = 0;
            this.nextSorosStake = null;
        }
    }

    private processModeChanges(): void {
        const winsReais = this.realWinsStreak;
        const perdasReais = this.realLossesStreak;
        const perdasSimuladas = this.simulatedLossesStreak;
        const winsSimulados = this.simulatedWinsStreak;

        const limiteWinsReais = this.config.realWinsLimit || 0;
        const limitePerdasReais = this.config.realLossesLimit || 0;
        const limitePerdasSimuladas = this.config.simulatedLossesLimit || 0;
        const limiteWinsSimulados = this.config.simulatedWinsLimit || 0;

        const simulacaoDesabilitada = limiteWinsSimulados === 0 && limitePerdasSimuladas === 0;
        const isSimulated = this.currentMode === 'SIMULACAO';

        // REAL → STOP (when simulation disabled)
        if (!isSimulated && perdasReais >= limitePerdasReais && limitePerdasReais > 0 && simulacaoDesabilitada) {
            this.onStopRequired?.('losses', perdasReais, limitePerdasReais);
            return;
        }

        if (!isSimulated && winsReais >= limiteWinsReais && limiteWinsReais > 0 && simulacaoDesabilitada) {
            this.onStopRequired?.('wins', winsReais, limiteWinsReais);
            return;
        }

        // REAL → SIMULACAO (when simulation enabled)
        if (!isSimulated && perdasReais >= limitePerdasReais && limitePerdasReais > 0 && !simulacaoDesabilitada) {
            this.switchMode('SIMULACAO', 'Real losses limit reached');
            return;
        }

        if (!isSimulated && winsReais >= limiteWinsReais && limiteWinsReais > 0 && !simulacaoDesabilitada) {
            this.switchMode('SIMULACAO', 'Real wins limit reached');
            return;
        }

        // SIMULACAO → REAL (after simulated wins/losses)
        if (isSimulated && winsSimulados >= limiteWinsSimulados && limiteWinsSimulados > 0) {
            const realMode = this.getRealLabel();
            this.switchMode(realMode, 'Simulated wins limit reached');
            return;
        }

        if (isSimulated && perdasSimuladas >= limitePerdasSimuladas && limitePerdasSimuladas > 0) {
            const realMode = this.getRealLabel();
            this.switchMode(realMode, 'Simulated losses limit reached');
            return;
        }
    }

    private checkStopConditions(): void {
        // Check goal
        if (this.config.goal > 0 && this.sessionProfitLoss >= this.config.goal) {
            this.onStopRequired?.('goal', this.sessionProfitLoss, this.config.goal);
            return;
        }

        // Check stop loss
        if (this.config.stopLoss > 0 && Math.abs(this.sessionProfitLoss) >= this.config.stopLoss && this.sessionProfitLoss < 0) {
            this.onStopRequired?.('stoploss', Math.abs(this.sessionProfitLoss), this.config.stopLoss);
            return;
        }
    }

    private switchMode(newMode: TradeMode, reason: string): void {
        if (this.currentMode === newMode) return;

        const oldMode = this.currentMode;
        this.currentMode = newMode;

        this.log(`🔄 Mode changed: ${oldMode} → ${newMode} (${reason})`);

        // Reset appropriate streak counters while preserving Gale state
        if (oldMode !== 'SIMULACAO' && newMode === 'SIMULACAO') {
            this.log(`🎰 [GALE PRESERVED] accumulated=$${this._accumulatedLosses.toFixed(4)}`);
            this.realWinsStreak = 0;
            this.realLossesStreak = 0;
        } else if (oldMode === 'SIMULACAO' && newMode !== 'SIMULACAO') {
            this.simulatedWinsStreak = 0;
            this.simulatedLossesStreak = 0;
        }

        this.onModeChange?.(newMode, reason);
    }

    private getRealLabel(): TradeMode {
        return this.isVirtualAccount ? 'VIRTUAL' : 'REAL';
    }

    private isSimulationEnabled(): boolean {
        return (this.config.simulatedWinsLimit > 0 || this.config.simulatedLossesLimit > 0);
    }

    private computeStartMode(): void {
        if (this.isSimulationEnabled()) {
            this.currentMode = 'SIMULACAO';
            this.log(`🎯 Start mode: SIMULACAO (simulation enabled)`);
        } else {
            this.currentMode = this.getRealLabel();
            this.log(`🎯 Start mode: ${this.currentMode} (simulation disabled)`);
        }
    }

    // Reset all counters for new monitoring session
    resetCountersForMonitoring(): void {
        this.realWinsStreak = 0;
        this.realLossesStreak = 0;
        this.simulatedWinsStreak = 0;
        this.simulatedLossesStreak = 0;
        this._accumulatedLosses = 0;
        this.pendingGaleApplication = false;
        this.lastCalculatedStakeSplitted = null;
        this.pendingSplitWins = 0;
        this.lastCalculatedStake = null;
        this.currentProposalPayout = null;
        this.sorosWins = 0;
        this.nextSorosStake = null;
        this.sessionProfitLoss = 0;
        this.processedContractIds.clear();

        this.computeStartMode();
        this.log(`🔄 Counters reset for new session`);
    }

    // Get current state
    getState(): RiskControllerState {
        return {
            currentMode: this.currentMode,
            realWinsStreak: this.realWinsStreak,
            realLossesStreak: this.realLossesStreak,
            simulatedWinsStreak: this.simulatedWinsStreak,
            simulatedLossesStreak: this.simulatedLossesStreak,
            accumulatedLosses: this._accumulatedLosses,
            sessionProfitLoss: this.sessionProfitLoss,
            pendingSplitWins: this.pendingSplitWins,
            sorosWins: this.sorosWins,
            nextSorosStake: this.nextSorosStake
        };
    }

    getCurrentMode(): TradeMode {
        return this.currentMode;
    }

    setMode(mode: TradeMode): void {
        if (['SIMULACAO', 'REAL', 'VIRTUAL'].includes(mode)) {
            this.currentMode = mode;
            this.log(`🔄 Mode set manually: ${mode}`);
            this.onModeChange?.(mode, 'Manual change');
        }
    }

    setContractType(contractType: string): void {
        this.lastExecutedContractType = contractType;
    }
}
