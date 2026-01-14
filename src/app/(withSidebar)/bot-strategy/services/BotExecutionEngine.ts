// BotExecutionEngine.ts
// Complete rewrite integrating TradeModeRiskController and TradeContractSelector
// Migrated from bot-ia/js/trade-manager.js

import { DerivService } from "@/app/services/DerivService";
import { Indicators } from "./Indicators";
import { MarketDataService } from "./MarketDataService";
import { PatternRecognizer } from "./PatternRecognizer";
import { ContractGroup, TradeContractSelector } from "./TradeContractSelector";
import { RiskControllerConfig, TradeMode, TradeModeRiskController } from "./TradeModeRiskController";

export interface TradeContext {
    ticks: number[];
    prices: number[];
    digits: number[];
    indicators: {
        rsi?: number;
        sma?: number;
        ema?: number;
        bollinger?: { upper: number, middle: number, lower: number };
    };
}

export interface StrategyRule {
    indicator: string;
    period?: number;
    operator: string;
    value: number | string;
    compare_period?: number;
    parameters?: any;
}

export interface BotConfig {
    symbol: string;
    stake: number;
    duration: number;
    durationUnit: string;
    stopLoss: number;
    takeProfit: number;
    prediction?: number;
    tradeType?: string;
    
    // Gale settings
    galeActive?: boolean;
    martingaleFactor: number;
    martingaleLevels: number;
    galeSplitThreshold?: number;
    galeSplitCount?: number;
    
    // Soros settings
    sorosLimit?: number;
    sorosProfitPercentage?: number;
    galeRemovesSoros?: boolean;
    
    // Controller limits
    winReal?: number;
    lossReal?: number;
    winSimulated?: number;
    lossSimulated?: number;
    
    // Session limits
    tradeLimit?: number;
    cooldown?: number;
    
    // Pause settings
    pauseOnWin?: boolean;
    pauseOnLoss?: boolean;
    pauseTime?: number;
}

export interface TradeRecord {
    id: string;
    contractType: string;
    stake: number;
    profit: number;
    status: 'WIN' | 'LOSS';
    mode: TradeMode;
    timestamp: Date;
    payout?: number;
}

export class BotExecutionEngine {
    private deriv: DerivService;
    private marketData: MarketDataService;
    private patternRecognizer: PatternRecognizer;
    private riskController: TradeModeRiskController;
    private contractSelector: TradeContractSelector;
    
    private config: BotConfig;
    private strategy: any;
    
    private isRunning: boolean = false;
    private tradeContext: TradeContext = { ticks: [], prices: [], digits: [], indicators: {} };
    
    // Callbacks
    private onLog: (msg: string) => void;
    private onTrade: (trade: TradeRecord) => void;
    private onModeChange?: (mode: TradeMode, reason: string) => void;
    private onStop?: (reason: string) => void;
    
    // State
    private currentStake: number;
    private totalProfit: number = 0;
    private tradesExecuted: number = 0;
    private isTrading: boolean = false;
    private isPaused: boolean = false;
    private pauseEndTime: number = 0;
    private lastTradeResult: 'WIN' | 'LOSS' | null = null;
    
    // Dynamic State
    private dynamicTarget: number | null = null;
    private tickListenerId: string | null = null;
    private cooldownTicks: number = 0;
    private currentProposalPayout: number = 0;
    
    // BOTH mode state
    private pendingBothResults: Map<string, { contractType: string, result?: 'WIN' | 'LOSS', profit?: number }> = new Map();
    private bothModeGroupId: number = 0;

    constructor(
        config: BotConfig, 
        strategy: any, 
        onLog: (msg: string) => void, 
        onTrade: (trade: TradeRecord) => void,
        onModeChange?: (mode: TradeMode, reason: string) => void,
        onStop?: (reason: string) => void,
        isVirtualAccount: boolean = true
    ) {
        this.deriv = DerivService.getInstance();
        this.marketData = MarketDataService.getInstance();
        this.patternRecognizer = new PatternRecognizer();
        this.contractSelector = new TradeContractSelector();
        
        this.config = config;
        this.strategy = strategy;
        this.onLog = onLog;
        this.onTrade = onTrade;
        this.onModeChange = onModeChange;
        this.onStop = onStop;
        this.currentStake = config.stake;

        // Initialize risk controller with mapped config
        const riskConfig = this.mapToRiskConfig(config);
        this.riskController = new TradeModeRiskController(riskConfig, isVirtualAccount);
        
        // Setup risk controller callbacks
        this.riskController.onLog = (msg) => this.onLog(msg);
        this.riskController.onModeChange = (mode, reason) => {
            this.onLog(`🔄 Mode: ${mode} - ${reason}`);
            this.onModeChange?.(mode, reason);
        };
        this.riskController.onStopRequired = (type, value, limit) => {
            this.handleStopRequired(type, value, limit);
        };
    }

    private mapToRiskConfig(config: BotConfig): RiskControllerConfig {
        return {
            galeActive: config.galeActive ?? true,
            galeAdjustment: config.martingaleFactor || 1,
            galeSplit: config.galeSplitCount || 1,
            galeSplitThreshold: config.galeSplitThreshold || 0,
            stake: config.stake,
            sorosLimit: config.sorosLimit || 0,
            sorosPercentage: config.sorosProfitPercentage || 100,
            galeRemovesSoros: config.galeRemovesSoros || false,
            realWinsLimit: config.winReal || 5,
            realLossesLimit: config.lossReal || 1,
            simulatedWinsLimit: config.winSimulated || 0,
            simulatedLossesLimit: config.lossSimulated || 1,
            goal: config.takeProfit,
            stopLoss: config.stopLoss
        };
    }

    public start(): void {
        if (this.isRunning) return;
        
        this.isRunning = true;
        this.totalProfit = 0;
        this.tradesExecuted = 0;
        this.currentStake = this.config.stake;
        this.isTrading = false;
        this.isPaused = false;
        this.cooldownTicks = 0;
        
        // Reset risk controller for new session
        this.riskController.resetCountersForMonitoring();
        
        this.onLog(`🚀 Bot started for ${this.config.symbol}`);
        this.onLog(`📊 Mode: ${this.riskController.getCurrentMode()}`);
        this.onLog(`💰 Stake: $${this.config.stake} | Stop Loss: $${this.config.stopLoss} | Take Profit: $${this.config.takeProfit}`);
        
        if (this.config.galeSplitCount && this.config.galeSplitCount > 1) {
            this.onLog(`🎰 Gale Split: ${this.config.galeSplitCount}x (Threshold: $${this.config.galeSplitThreshold || 0})`);
        }
        
        if (this.config.sorosLimit && this.config.sorosLimit > 0) {
            this.onLog(`📈 Soros: ${this.config.sorosLimit} wins (${this.config.sorosProfitPercentage || 100}%)`);
        }
        
        this.subscribeToTicks();
    }

    public stop(): void {
        this.isRunning = false;
        this.onLog("🛑 Bot stopped");
        
        if (this.tickListenerId) {
            this.deriv.observerInstance.removeById(this.tickListenerId);
            this.tickListenerId = null;
        }
    }

    public updateConfig(newConfig: Partial<BotConfig>): void {
        this.config = { ...this.config, ...newConfig };
        this.riskController.updateConfig(this.mapToRiskConfig(this.config as BotConfig));
        this.onLog("⚙️ Config updated in real-time");
    }

    private handleStopRequired(type: 'goal' | 'stoploss' | 'wins' | 'losses', value: number, limit: number): void {
        let reason = '';
        
        switch (type) {
            case 'goal':
                reason = `🎉 Take Profit reached: $${value.toFixed(2)} >= $${limit}`;
                break;
            case 'stoploss':
                reason = `⛔ Stop Loss reached: $${value.toFixed(2)} >= $${limit}`;
                break;
            case 'wins':
                reason = `🏆 Win limit reached: ${value} wins`;
                break;
            case 'losses':
                reason = `💔 Loss limit reached: ${value} losses`;
                break;
        }
        
        this.onLog(reason);
        this.stop();
        this.onStop?.(reason);
    }

    private subscribeToTicks(): void {
        this.deriv.send({ ticks: this.config.symbol, subscribe: 1 }).catch(e => {
            if (!e.message.includes('already subscribed')) {
                this.onLog(`Error subscribing: ${e.message}`);
            }
        });

        this.tickListenerId = this.deriv.observerInstance.on('deriv.tick', this.handleTick);
    }

    private handleTick = (data: any): void => {
        if (!this.isRunning) return;
        
        if (data.tick && data.tick.symbol === this.config.symbol) {
            this.processTick(data.tick);
        }
    }

    private processTick(tick: any): void {
        const price = tick.quote;
        
        // Update context from market data service
        this.tradeContext.prices = this.marketData.getLastNPrices(this.config.symbol, 1000);
        this.tradeContext.digits = this.marketData.getLastNDigits(this.config.symbol, 1000);
        this.tradeContext.ticks = this.tradeContext.prices;

        // Calculate indicators if strategy needs them
        this.calculateIndicators();

        // Handle cooldown
        if (this.cooldownTicks > 0) {
            this.cooldownTicks--;
            return;
        }

        // Handle pause
        if (this.isPaused) {
            if (Date.now() >= this.pauseEndTime) {
                this.isPaused = false;
                this.onLog(`▶️ Pause ended, resuming...`);
            } else {
                return;
            }
        }

        // Check trade limit
        if (this.config.tradeLimit && this.config.tradeLimit > 0 && this.tradesExecuted >= this.config.tradeLimit) {
            this.onLog(`🛑 Trade limit reached: ${this.tradesExecuted}/${this.config.tradeLimit}`);
            this.stop();
            return;
        }

        // Check strategy
        if (!this.isTrading) {
            this.checkStrategy();
        }
    }

    private calculateIndicators(): void {
        if (!this.strategy || !this.strategy.conditions) return;
        
        const neededIndicators = new Set(this.strategy.conditions.map((c: any) => c.indicator));
        const prices = this.tradeContext.prices;

        if (neededIndicators.has('RSI')) {
            const rsiConditions = this.strategy.conditions.filter((c: any) => c.indicator === 'RSI');
            for (const cond of rsiConditions) {
                this.tradeContext.indicators.rsi = Indicators.calculateRSI(prices, cond.period || 14) || 0;
            }
        }
        
        if (neededIndicators.has('SMA')) {
            this.tradeContext.indicators.sma = Indicators.calculateSMA(prices, 14) || 0;
        }
    }

    private checkStrategy(): void {
        if (this.strategy && this.strategy.conditions && this.strategy.conditions.length > 0) {
            let allConditionsMet = true;
            this.dynamicTarget = null;

            for (const cond of this.strategy.conditions) {
                if (!this.evaluateCondition(cond)) {
                    allConditionsMet = false;
                    break;
                }
            }

            if (allConditionsMet) {
                this.executeTrade();
            }
        }
    }

    private evaluateCondition(cond: StrategyRule): boolean {
        // Handle pattern rules
        if (cond.indicator === 'PATTERN' || (cond.parameters && cond.parameters.pattern)) {
            const result = this.patternRecognizer.processDigitPatternRule(cond, this.config.symbol);
            return result.matches;
        }

        let valueToCheck: number | undefined;
        let referenceValue: number;

        // Determine value to check
        if (cond.indicator === 'RSI') {
            valueToCheck = Indicators.calculateRSI(this.tradeContext.prices, cond.period || 14) || undefined;
        } else if (cond.indicator === 'SMA') {
            valueToCheck = Indicators.calculateSMA(this.tradeContext.prices, cond.period || 14) || undefined;
        } else if (cond.indicator === 'DIGIT') {
            valueToCheck = this.tradeContext.digits[this.tradeContext.digits.length - 1];
        } else if (cond.indicator === 'PRICE') {
            valueToCheck = this.tradeContext.prices[this.tradeContext.prices.length - 1];
        }

        if (valueToCheck === undefined) return false;

        // Determine reference value
        if (typeof cond.value === 'number') {
            referenceValue = cond.value;
        } else if (cond.value === 'SMA') {
            referenceValue = Indicators.calculateSMA(this.tradeContext.prices, cond.compare_period || 20) || 0;
        } else {
            referenceValue = 0;
        }

        // Dynamic prediction handling
        if (this.strategy.prediction === 'dynamic_repeated_digit' || cond.value === 'dynamic_repeated_digit') {
            const lastDigit = this.tradeContext.digits[this.tradeContext.digits.length - 1];
            const prevDigit = this.tradeContext.digits[this.tradeContext.digits.length - 2];
            if (lastDigit === prevDigit) {
                this.dynamicTarget = lastDigit;
            }
        }

        // Standard comparison
        switch (cond.operator) {
            case '>': return valueToCheck > referenceValue;
            case '<': return valueToCheck < referenceValue;
            case '>=': return valueToCheck >= referenceValue;
            case '<=': return valueToCheck <= referenceValue;
            case '=': return valueToCheck === referenceValue;
            case '!=': return valueToCheck !== referenceValue;
            case 'IS_EVEN': return valueToCheck % 2 === 0;
            case 'IS_ODD': return valueToCheck % 2 !== 0;
            default: return false;
        }
    }

    private async executeTrade(): Promise<void> {
        if (this.isTrading) return;

        const currentMode = this.riskController.getCurrentMode();
        const contractType = this.strategy?.action || this.config.tradeType || 'CALL';
        
        // Check if BOTH mode
        if (contractType === 'BOTH') {
            await this.executeBothModeTrade();
            return;
        }

        // Get current stake from risk controller
        this.riskController.setContractType(contractType);
        const stakeToUse = currentMode === 'SIMULACAO' 
            ? this.config.stake 
            : this.riskController.getCurrentStake(contractType);

        this.isTrading = true;
        this.onLog(`⚡ ${currentMode} Trade: ${contractType} | Stake: $${stakeToUse.toFixed(2)}`);

        try {
            // Get proposal first to capture payout
            const prediction = this.resolvePrediction();
            const proposalReq = this.buildProposalRequest(contractType, stakeToUse, prediction);
            
            const proposal = await this.deriv.send(proposalReq);
            
            if (proposal.error) {
                throw new Error(proposal.error.message);
            }

            // Store payout for Gale calculations
            this.currentProposalPayout = parseFloat(proposal.proposal.payout) / stakeToUse;
            this.riskController.setProposalPayout(this.currentProposalPayout);

            if (currentMode === 'SIMULACAO') {
                // Simulated trade - just log and process result
                this.simulateTrade(contractType, stakeToUse, prediction);
            } else {
                // Real trade execution
                const buyReq = { buy: proposal.proposal.id, price: proposal.proposal.ask_price };
                const buyResponse = await this.deriv.send(buyReq);
                
                if (buyResponse.error) {
                    throw new Error(buyResponse.error.message);
                }

                this.onLog(`✅ Order placed! ID: ${buyResponse.buy.contract_id}`);
                this.monitorContract(buyResponse.buy.contract_id, contractType, stakeToUse);
            }

        } catch (error: any) {
            this.onLog(`❌ Trade error: ${error.message}`);
            this.isTrading = false;
        }
    }

    private async executeBothModeTrade(): Promise<void> {
        const currentMode = this.riskController.getCurrentMode();
        const baseContract = this.config.tradeType || 'DIGITOVER';
        
        const bothContracts = this.contractSelector.getBothContracts(baseContract);
        
        if (!bothContracts || bothContracts.contracts.length < 2) {
            this.onLog(`❌ BOTH mode: Could not find contract pair for ${baseContract}`);
            return;
        }

        this.isTrading = true;
        this.bothModeGroupId++;
        
        const stakeToUse = currentMode === 'SIMULACAO' 
            ? this.config.stake 
            : this.riskController.getCurrentStake(null);

        this.onLog(`⚡ ${currentMode} BOTH Trade: ${bothContracts.contracts.join(' + ')} | Stake: $${stakeToUse.toFixed(2)} each`);

        // Clear pending results
        this.pendingBothResults.clear();

        try {
            for (const contractType of bothContracts.contracts) {
                const prediction = this.resolvePrediction();
                
                if (currentMode === 'SIMULACAO') {
                    this.simulateBothTrade(contractType, stakeToUse, prediction, bothContracts);
                } else {
                    const proposalReq = this.buildProposalRequest(contractType, stakeToUse, prediction);
                    const proposal = await this.deriv.send(proposalReq);
                    
                    if (proposal.error) {
                        this.onLog(`⚠️ BOTH: ${contractType} proposal failed: ${proposal.error.message}`);
                        continue;
                    }

                    const buyReq = { buy: proposal.proposal.id, price: proposal.proposal.ask_price };
                    const buyResponse = await this.deriv.send(buyReq);
                    
                    if (buyResponse.error) {
                        this.onLog(`⚠️ BOTH: ${contractType} buy failed: ${buyResponse.error.message}`);
                        continue;
                    }

                    this.pendingBothResults.set(buyResponse.buy.contract_id, { contractType });
                    this.monitorBothContract(buyResponse.buy.contract_id, contractType, stakeToUse, bothContracts);
                }
            }
        } catch (error: any) {
            this.onLog(`❌ BOTH trade error: ${error.message}`);
            this.isTrading = false;
        }
    }

    private buildProposalRequest(contractType: string, stake: number, prediction: number | undefined): any {
        const params: any = {
            proposal: 1,
            amount: stake,
            basis: 'stake',
            contract_type: contractType,
            currency: 'USD',
            duration: this.config.duration,
            duration_unit: this.config.durationUnit,
            symbol: this.config.symbol
        };

        // Add barrier for digit contracts
        if (['DIGITMATCH', 'DIGITDIFF', 'DIGITOVER', 'DIGITUNDER'].includes(contractType)) {
            params.barrier = prediction ?? 0;
        }

        return params;
    }

    private resolvePrediction(): number | undefined {
        // Priority 1: Dynamic target from conditions
        if (this.dynamicTarget !== null) {
            return this.dynamicTarget;
        }
        
        // Priority 2: Strategy prediction
        if (this.strategy?.prediction !== undefined && this.strategy.prediction !== null) {
            if (typeof this.strategy.prediction === 'number') {
                return this.strategy.prediction;
            }
        }
        
        // Priority 3: Config prediction
        return this.config.prediction;
    }

    private simulateTrade(contractType: string, stake: number, prediction: number | undefined): void {
        // Simple simulation based on probability
        const winProbability = this.getWinProbability(contractType, prediction);
        const isWin = Math.random() < winProbability;
        
        const payout = this.currentProposalPayout || 1.95;
        const profit = isWin ? stake * (payout - 1) : -stake;
        
        this.onLog(`🎮 Simulated: ${isWin ? 'WIN' : 'LOSS'} | ${contractType} | Profit: $${profit.toFixed(2)}`);
        
        this.processTradeResult(isWin, profit, contractType, stake, 'simulated_' + Date.now());
    }

    private simulateBothTrade(
        contractType: string, 
        stake: number, 
        prediction: number | undefined,
        bothContracts: ContractGroup
    ): void {
        const winProbability = this.getWinProbability(contractType, prediction);
        const isWin = Math.random() < winProbability;
        
        const payout = this.currentProposalPayout || 1.95;
        const profit = isWin ? stake * (payout - 1) : -stake;
        
        this.pendingBothResults.set(`sim_${contractType}_${Date.now()}`, {
            contractType,
            result: isWin ? 'WIN' : 'LOSS',
            profit
        });

        // Check if all BOTH trades completed
        if (this.pendingBothResults.size >= bothContracts.contracts.length) {
            this.processBothTradeResults();
        }
    }

    private getWinProbability(contractType: string, prediction?: number): number {
        // Approximate probabilities for different contract types
        const probabilities: Record<string, number> = {
            'DIGITEVEN': 0.5,
            'DIGITODD': 0.5,
            'CALL': 0.5,
            'PUT': 0.5,
            'DIGITMATCH': 0.1,
            'DIGITDIFF': 0.9
        };

        if (contractType === 'DIGITOVER' && prediction !== undefined) {
            return (9 - prediction) / 10;
        }
        if (contractType === 'DIGITUNDER' && prediction !== undefined) {
            return prediction / 10;
        }

        return probabilities[contractType] || 0.5;
    }

    private monitorContract(contractId: string, contractType: string, stake: number): void {
        const checkInterval = setInterval(async () => {
            if (!this.isRunning) {
                clearInterval(checkInterval);
                return;
            }

            try {
                const data = await this.deriv.send({ proposal_open_contract: 1, contract_id: contractId });
                const contract = data.proposal_open_contract;

                if (contract.is_sold) {
                    clearInterval(checkInterval);
                    const profit = Number(contract.profit);
                    const isWin = profit > 0;
                    
                    this.processTradeResult(isWin, profit, contractType, stake, contractId);
                }
            } catch (e) {
                console.error("Error monitoring contract", e);
            }
        }, 1000);
    }

    private monitorBothContract(
        contractId: string, 
        contractType: string, 
        stake: number,
        bothContracts: ContractGroup
    ): void {
        const checkInterval = setInterval(async () => {
            if (!this.isRunning) {
                clearInterval(checkInterval);
                return;
            }

            try {
                const data = await this.deriv.send({ proposal_open_contract: 1, contract_id: contractId });
                const contract = data.proposal_open_contract;

                if (contract.is_sold) {
                    clearInterval(checkInterval);
                    const profit = Number(contract.profit);
                    const isWin = profit > 0;
                    
                    // Update pending results
                    const pending = this.pendingBothResults.get(contractId);
                    if (pending) {
                        pending.result = isWin ? 'WIN' : 'LOSS';
                        pending.profit = profit;
                    }

                    // Check if all BOTH trades completed
                    const allComplete = Array.from(this.pendingBothResults.values()).every(p => p.result !== undefined);
                    if (allComplete) {
                        this.processBothTradeResults();
                    }
                }
            } catch (e) {
                console.error("Error monitoring BOTH contract", e);
            }
        }, 1000);
    }

    private processBothTradeResults(): void {
        const results = Array.from(this.pendingBothResults.values());
        const wins = results.filter(r => r.result === 'WIN').length;
        const totalProfit = results.reduce((sum, r) => sum + (r.profit || 0), 0);
        
        const bothResult = this.contractSelector.calculateBothTradeResult(wins, results.length);
        
        this.onLog(`⚖️ BOTH Result: ${bothResult.type} (${wins}/${results.length}) | Net: $${totalProfit.toFixed(2)}`);

        // Update total profit
        this.totalProfit += totalProfit;
        this.tradesExecuted++;

        // Process through risk controller
        const totalStake = results.length * (this.riskController.getCurrentMode() === 'SIMULACAO' 
            ? this.config.stake 
            : this.riskController.getCurrentStake(null));
        
        this.riskController.handleTradeResult(
            bothResult.type,
            `both_${this.bothModeGroupId}`,
            totalStake,
            totalProfit
        );

        // Apply pause if configured
        this.handlePauseLogic(bothResult.type === 'WIN');

        // Apply cooldown
        this.cooldownTicks = this.config.cooldown || 3;

        this.isTrading = false;
        this.pendingBothResults.clear();
    }

    private processTradeResult(
        isWin: boolean, 
        profit: number, 
        contractType: string, 
        stake: number,
        contractId: string
    ): void {
        this.isTrading = false;
        this.totalProfit += profit;
        this.tradesExecuted++;
        
        const currentMode = this.riskController.getCurrentMode();
        this.lastTradeResult = isWin ? 'WIN' : 'LOSS';
        const resultEmoji = isWin ? '✅' : '❌';
        
        this.onLog(`${resultEmoji} ${currentMode} Trade done. Profit: $${profit.toFixed(2)} | Total: $${this.totalProfit.toFixed(2)}`);
        
        // Notify trade callback
        this.onTrade({
            id: contractId,
            contractType,
            stake,
            profit,
            status: isWin ? 'WIN' : 'LOSS',
            mode: currentMode,
            timestamp: new Date(),
            payout: this.currentProposalPayout
        });

        // Process through risk controller
        this.riskController.handleTradeResult(
            isWin ? 'WIN' : 'LOSS',
            contractId,
            stake,
            profit
        );

        // Apply pause if configured
        this.handlePauseLogic(isWin);

        // Apply cooldown
        this.cooldownTicks = this.config.cooldown || 3;
    }

    private handlePauseLogic(isWin: boolean): void {
        if (isWin && this.config.pauseOnWin && this.config.pauseTime) {
            this.isPaused = true;
            this.pauseEndTime = Date.now() + (this.config.pauseTime * 1000);
            this.onLog(`⏸️ Pausing for ${this.config.pauseTime}s after WIN`);
        } else if (!isWin && this.config.pauseOnLoss && this.config.pauseTime) {
            this.isPaused = true;
            this.pauseEndTime = Date.now() + (this.config.pauseTime * 1000);
            this.onLog(`⏸️ Pausing for ${this.config.pauseTime}s after LOSS`);
        }
    }

    // Public getters
    public getCurrentMode(): TradeMode {
        return this.riskController.getCurrentMode();
    }

    public getState(): any {
        return {
            ...this.riskController.getState(),
            totalProfit: this.totalProfit,
            tradesExecuted: this.tradesExecuted,
            isRunning: this.isRunning,
            isTrading: this.isTrading,
            isPaused: this.isPaused,
            currentStake: this.riskController.getCurrentStake(null)
        };
    }

    public setMode(mode: TradeMode): void {
        this.riskController.setMode(mode);
    }
}
