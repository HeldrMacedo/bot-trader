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
    type?: string;
    count?: number;
}

export interface CapturedPrediction {
    contractType: string | null;
    predictionValue: number | null;
    ruleId?: number | string;
}

export interface StrategyGroup {
    id: number;
    rules: StrategyRule[];
    logic: 'and'; // Within group, rules are connected by AND
}

export interface StrategyWithGroups {
    name?: string;
    description?: string;
    groups: StrategyGroup[];
    action?: string;
    prediction?: number | string;
    money_management?: any;
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
    contractType?: string;
    barrier?: string;
    barrierHigh?: string;
    barrierLow?: string;
    
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
    symbol: string;
    type: string;
    target: string;
    exit: string;
    timestamp: Date;
    isSimulation: string;
    payout?: number;
}

export class BotExecutionEngine {
    private deriv: DerivService;
    private marketData: MarketDataService;
    private patternRecognizer: PatternRecognizer;
    private riskController: TradeModeRiskController;
    private contractSelector: TradeContractSelector;
    
    private config: BotConfig;
    private strategy: StrategyWithGroups | any;

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
    private lastTradeOutcomeForGroups: { result: 'WIN' | 'LOSS'; simulated: boolean } | null = null;
    
    // Dynamic State
    private dynamicTarget: number | null = null;
    private tickListenerId: string | null = null;
    private cooldownTicks: number = 0;
    private currentProposalPayout: number = 0;
    private capturedPredictionsForTrade: CapturedPrediction[] | null = null;
    
    // BOTH mode state
    private pendingBothResults: Map<string, { contractType: string, result?: 'WIN' | 'LOSS', profit?: number }> = new Map();
    private bothModeGroupId: number = 0;

    private userKey: string | null = null;
    private groupConfigStorageKey: string = "monitoring_group_activation_config_global";
    private groupActivationConfig: Record<string, any> | null = null;
    private handleGroupConfigUpdated = (): void => {
        this.loadGroupActivationConfig();
    };

    constructor(
        config: BotConfig, 
        strategy: any, 
        onLog: (msg: string) => void, 
        onTrade: (trade: TradeRecord) => void,
        onModeChange?: (mode: TradeMode, reason: string) => void,
        onStop?: (reason: string) => void,
        isVirtualAccount: boolean = true,
        userKey: string | null = null
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
        this.userKey = userKey;
        this.groupConfigStorageKey = userKey ? `monitoring_group_activation_config_${userKey}` : "monitoring_group_activation_config_global";
        this.loadGroupActivationConfig();
        if (typeof window !== "undefined") {
            window.addEventListener("groupConfigUpdated", this.handleGroupConfigUpdated as EventListener);
        }

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

    private loadGroupActivationConfig(): void {
        if (typeof window === "undefined") return;
        try {
            const raw = localStorage.getItem(this.groupConfigStorageKey);
            this.groupActivationConfig = raw ? JSON.parse(raw) : null;
        } catch {
            this.groupActivationConfig = null;
        }
    }

    private getActiveGroupIds(): number[] | null {
        const cfg = this.groupActivationConfig;
        if (!cfg) return null;

        const keys = Object.keys(cfg).filter(k => k !== "_meta");
        if (keys.length === 0) return null;

        if (!this.lastTradeOutcomeForGroups) {
            const active: number[] = [];
            keys.forEach(k => {
                const c = cfg[k];
                if (!c || c.initial !== false) active.push(parseInt(k, 10));
            });
            return active;
        }

        const conditionKey = this.lastTradeOutcomeForGroups.result === "WIN"
            ? (this.lastTradeOutcomeForGroups.simulated ? "winSimulated" : "winReal")
            : (this.lastTradeOutcomeForGroups.simulated ? "lossSimulated" : "lossReal");

        const active: number[] = [];
        keys.forEach(k => {
            const c = cfg[k];
            if (!c || c[conditionKey] !== false) active.push(parseInt(k, 10));
        });
        return active;
    }

    private mapToRiskConfig(config: BotConfig): RiskControllerConfig {
        return {
            galeActive: config.galeActive ?? true,
            galeAdjustment: config.martingaleFactor ?? 1,
            galeSplit: config.galeSplitCount ?? 1,
            galeSplitThreshold: config.galeSplitThreshold ?? 0,
            stake: config.stake,
            sorosLimit: config.sorosLimit ?? 0,
            sorosPercentage: config.sorosProfitPercentage ?? 100,
            galeRemovesSoros: config.galeRemovesSoros ?? false,
            realWinsLimit: config.winReal ?? 5,
            realLossesLimit: config.lossReal ?? 1,
            simulatedWinsLimit: config.winSimulated ?? 0,
            simulatedLossesLimit: config.lossSimulated ?? 1,
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
        this.lastTradeResult = null;
        this.lastTradeOutcomeForGroups = null;
        
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
        
        // Set up market data subscription
        this.setupMarketDataSubscription();

        this.subscribeToTicks();
    }

    public stop(): void {
        this.isRunning = false;
        this.onLog("🛑 Bot stopped");
        
        if (this.tickListenerId) {
            this.deriv.observerInstance.removeById(this.tickListenerId);
            this.tickListenerId = null;
        }
        if (typeof window !== "undefined") {
            window.removeEventListener("groupConfigUpdated", this.handleGroupConfigUpdated as EventListener);
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

    private async setupMarketDataSubscription(): Promise<void> {
        // Subscribe to market data updates
        const marketData = MarketDataService.getInstance();
        marketData.setActiveSymbol(this.config.symbol);
        
        // Listen for tick updates
        this.tickListenerId = this.deriv.observerInstance.on('deriv.tick', (data: any) => {
            if (data.tick && data.tick.symbol === this.config.symbol) {
                const price = data.tick.quote;
                // Update trade context with new data
                this.tradeContext.prices.push(price);
                this.tradeContext.ticks.push(data.tick);

                // Extract digit and add to digits array
                const digit = this.extractDigit(price, this.config.symbol);
                this.tradeContext.digits.push(digit);

                // Keep only the last 1000 data points to prevent memory issues
                if (this.tradeContext.prices.length > 1000) {
                    this.tradeContext.prices.shift();
                    this.tradeContext.ticks.shift();
                    this.tradeContext.digits.shift();
                }

                // Check strategy when new data arrives
                if (this.isRunning) {
                    this.checkStrategy();
                }
            }
        });
    }

    private extractDigit(price: number, symbol: string): number {
        const precision = this.getPrecision(symbol);
        const priceStr = price.toFixed(precision);
        return parseInt(priceStr.slice(-1));
    }

    private getPrecision(symbol: string): number {
        // Volatility Indices
        if (symbol === "R_100" || symbol === "1HZ100V") return 2;
        if (symbol === "R_10" || symbol === "1HZ10V") return 3;
        if (symbol === "R_25" || symbol === "1HZ25V") return 3;
        if (symbol === "R_50" || symbol === "1HZ50V") return 4;
        if (symbol === "R_75" || symbol === "1HZ75V") return 4;

        // Bear/Bull
        if (symbol === "RDBEAR" || symbol === "RDBULL") return 4;

        // Jump Indices
        if (symbol.startsWith("JD")) return 2;

        // Default fallback
        return 4;
    }

    private checkStrategy(): void {
        // Handle "Manual Strategy" or empty conditions (Execute immediately/always if no rules)
        const isManualStrategy = this.strategy?.name === "Manual Strategy" || (!this.strategy?.conditions?.length && !this.strategy?.groups?.length);
        
        if (isManualStrategy) {
             // For manual strategy without rules, we execute immediately (controlled by cooldown/risk in executeTrade)
             this.executeTrade();
             return;
        }

        // Handle legacy strategy format (flat conditions)
        if (this.strategy && this.strategy.conditions && this.strategy.conditions.length > 0) {
            let allConditionsMet = true;
            this.dynamicTarget = null;
            this.capturedPredictionsForTrade = null;

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
        // Handle new strategy format with groups
        else if (this.strategy && this.strategy.groups && this.strategy.groups.length > 0) {
            this.dynamicTarget = null;
            this.capturedPredictionsForTrade = null;
            const activeGroupIds = this.getActiveGroupIds();
            // Check each group - if ANY group has ALL its conditions met, execute trade (OR logic between groups)
            for (let groupIndex = 0; groupIndex < this.strategy.groups.length; groupIndex++) {
                const group = this.strategy.groups[groupIndex];
                const groupId = Number.isFinite(Number(group?.id)) ? Number(group.id) : groupIndex + 1;
                if (activeGroupIds !== null && !activeGroupIds.includes(groupId)) continue;
                if (this.checkGroupConditions(group)) {
                    this.executeTrade();
                    break; // Execute trade once any group is satisfied
                }
            }
        }
    }

    private checkGroupConditions(group: StrategyGroup): boolean {
        // Within a group, all conditions must be met (AND logic)
        for (const rule of group.rules) {
            if (!this.evaluateCondition(rule)) {
                return false; // If any condition in the group fails, the whole group fails
            }
        }
        const captured = this.capturePredictionsFromGroup(group);
        this.capturedPredictionsForTrade = captured && captured.length > 0 ? captured : null;
        return true; // All conditions in the group passed
    }

    private evaluateCondition(cond: StrategyRule): boolean {
        // Handle pattern rules
        if (cond.indicator === 'PATTERN' || (cond.parameters && cond.parameters.pattern)) {
            const result = this.patternRecognizer.processDigitPatternRule(cond, this.config.symbol);
            return result.matches;
        }

        // Handle last digits condition (checking multiple consecutive digits)
        if (cond.indicator === 'LAST_DIGITS' || cond.type === 'last_digits') {
            return this.evaluateLastDigitsCondition(cond);
        }

        const params = (cond as any).parameters || cond;
        const combinedRule = params.combinedRule || (cond as any).combinedRule;
        const percentageRule = combinedRule?.percentageRule;
        if (percentageRule) {
            return this.evaluatePercentageRule(percentageRule);
        }
        if (cond.type === 'conditional_percentage') {
            return this.evaluatePercentageRule(params);
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

        // Handle dynamic_prediction type correctly - it doesn't need valueToCheck from above
        if (cond.type === 'dynamic_prediction' || this.strategy.prediction === 'dynamic_repeated_digit' || cond.value === 'dynamic_repeated_digit' || (cond as any).targetValue === 'dynamic_repeated_digit') {
            const patternRule = (cond as any).combinedRule?.patternRule;
            const count = patternRule?.count || cond.parameters?.count || cond.count || 2;

            const recentDigits = this.tradeContext.digits.slice(-count);
            
            if (recentDigits.length < count) return false;
            
            const lastDigit = recentDigits[recentDigits.length - 1];
            const allEqual = recentDigits.every(d => d === lastDigit);
            
            if (allEqual) {
                this.dynamicTarget = lastDigit;
                return true;
            }
            return false;
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

        // Dynamic prediction handling (Legacy block - removed as it's handled above)
        
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

    private evaluateLastDigitsCondition(cond: StrategyRule): boolean {
        const count = cond.count || cond.parameters?.count || 1;
        const operator = cond.operator || cond.parameters?.operator || '>';
        const value = cond.value !== undefined ? cond.value : cond.parameters?.value;

        if (value === undefined || value === null) {
            console.warn('⚠️ Value not specified for last digits rule');
            return false;
        }

        // Get the last N digits from the trade context
        const recentDigits = this.tradeContext.digits.slice(-count);

        if (recentDigits.length < count) {
            console.warn(`⚠️ Not enough digits available. Need ${count}, have ${recentDigits.length}`);
            return false;
        }

        // Evaluate the condition for each digit
        const satisfiedCount = recentDigits.filter(digit => {
            let d = digit;
            let v = value;
            if (!isNaN(parseFloat(d.toString()))) d = parseFloat(d.toString());
            if (!isNaN(parseFloat(v.toString()))) v = parseFloat(v.toString());

            switch (operator) {
                case '<': return d < v;
                case '>': return d > v;
                case '=':
                case '==':
                case '===':
                case 'match':
                case 'matches':
                case 'equal':
                case 'equals':
                    return d === v;
                case '<=': return d <= v;
                case '>=': return d >= v;
                case '!=':
                case '!==':
                    return d !== v;
                default: return false;
            }
        }).length;

        // The rule is satisfied if ALL digits meet the condition
        return satisfiedCount === count && count > 0;
    }

    private evaluatePercentageRule(rawRule: any): boolean {
        const params = rawRule?.parameters || rawRule;
        if (!params) return false;

        const operator = params.operator || '>';
        const targetPercentage = params.targetPercentage;
        if (targetPercentage === undefined || targetPercentage === null) {
            return false;
        }

        const period = params.period || 25;
        const digits = this.tradeContext.digits.slice(-period).filter(d => d !== null && d !== undefined);
        if (digits.length === 0) return false;

        const allowedDigits = Array.isArray(params.allowedDigits) ? params.allowedDigits : null;
        const conditionType = params.conditionType || null;
        const value = params.value !== undefined ? params.value : null;

        const matches = digits.filter((digit) => {
            if (allowedDigits && allowedDigits.length > 0) {
                return allowedDigits.includes(digit);
            }

            switch (conditionType) {
                case 'below':
                    return value !== null ? digit < value : false;
                case 'above':
                    return value !== null ? digit > value : false;
                case 'equal':
                    return value !== null ? digit === value : false;
                case 'even':
                    return digit % 2 === 0;
                case 'odd':
                    return digit % 2 !== 0;
                default:
                    return false;
            }
        }).length;

        const percentage = (matches / digits.length) * 100;

        switch (operator) {
            case '>': return percentage > targetPercentage;
            case '<': return percentage < targetPercentage;
            case '>=': return percentage >= targetPercentage;
            case '<=': return percentage <= targetPercentage;
            case '=':
            case '==':
            case '===':
                return percentage === targetPercentage;
            case '!=':
            case '!==':
                return percentage !== targetPercentage;
            default:
                return false;
        }
    }

    private mapPredictionActionToContract(action: string | null): string | null {
        if (!action) return null;
        switch (action) {
            case 'over':
                return 'DIGITOVER';
            case 'under':
                return 'DIGITUNDER';
            case 'match':
            case 'matches':
                return 'DIGITMATCH';
            case 'differ':
            case 'diff':
            case 'differs':
                return 'DIGITDIFF';
            case 'even':
            case 'par':
                return 'DIGITEVEN';
            case 'odd':
            case 'impar':
            case 'ímpar':
                return 'DIGITODD';
            case 'call':
            case 'rise':
                return 'CALL';
            case 'put':
            case 'fall':
                return 'PUT';
            case 'higher':
            case 'calle':
                return 'CALLE';
            case 'lower':
            case 'pute':
                return 'PUTE';
            default:
                return null;
        }
    }

    private capturePredictionsFromGroup(group: StrategyGroup): CapturedPrediction[] {
        const predictions: CapturedPrediction[] = [];

        for (const rule of group.rules) {
            const params = (rule as any).parameters || rule;
            const actionRaw = (params.predictionAction || (rule as any).predictionAction || '').toString().toLowerCase();
            const predictionType = params.predictionType || (rule as any).predictionType;
            const contractType = this.mapPredictionActionToContract(actionRaw);

            let predictionValue: number | null = null;
            const targetVal = params.targetValue ?? params.value ?? (rule as any).targetValue;
            if (typeof targetVal === 'number' && targetVal >= 0 && targetVal <= 9) {
                predictionValue = targetVal;
            } else if (typeof targetVal === 'string') {
                if (targetVal === 'dynamic_repeated_digit' && this.dynamicTarget !== null) {
                    predictionValue = this.dynamicTarget;
                }
            }

            const isExplicitPrediction = rule.type === 'dynamic_prediction' || actionRaw !== '' || !!predictionType;
            if (isExplicitPrediction && (contractType || predictionValue !== null)) {
                predictions.push({
                    contractType: contractType || null,
                    predictionValue,
                    ruleId: (rule as any).id
                });
            }
        }

        return predictions;
    }

    private resolvePredictionForContract(contractType: string | null = null): number | undefined {
        if (this.capturedPredictionsForTrade && this.capturedPredictionsForTrade.length > 0) {
            if (contractType) {
                const match = this.capturedPredictionsForTrade.find(p => p.contractType === contractType);
                if (match && match.predictionValue !== null && match.predictionValue !== undefined) {
                    return match.predictionValue;
                }
            }

            if (this.capturedPredictionsForTrade.length === 1) {
                const single = this.capturedPredictionsForTrade[0];
                if (single.predictionValue !== null && single.predictionValue !== undefined) {
                    return single.predictionValue;
                }
            }
        }

        if (this.dynamicTarget !== null) {
            return this.dynamicTarget;
        }

        if (this.strategy?.prediction !== undefined && this.strategy.prediction !== null) {
            if (typeof this.strategy.prediction === 'number') {
                return this.strategy.prediction;
            }
            if (typeof this.strategy.prediction === 'object' && this.strategy.prediction.value !== undefined) {
                return Number(this.strategy.prediction.value);
            }
        }

        if (this.config.prediction !== undefined && this.config.prediction !== null) {
            if (typeof this.config.prediction === 'number') {
                return this.config.prediction;
            }
            if (typeof this.config.prediction === 'object' && (this.config.prediction as any).value !== undefined) {
                return Number((this.config.prediction as any).value);
            }
        }

        return undefined;
    }

    private async executeTrade(): Promise<void> {
        if (this.isTrading) return;

        const currentMode = this.riskController.getCurrentMode();
        // Determine contract type from strategy action or config
        // Some strategy rules might override the action (e.g. "Enter DIFFER" in a MATCH strategy)
        let contractType = this.strategy?.action || this.config.tradeType || this.config.contractType || 'CALL';

        const capturedContracts = this.capturedPredictionsForTrade
            ? Array.from(new Set(this.capturedPredictionsForTrade.map(p => p.contractType).filter((c): c is string => !!c)))
            : [];
        if (capturedContracts.length > 1) {
            contractType = 'BOTH';
        } else if (capturedContracts.length === 1) {
            contractType = capturedContracts[0];
        }

        const prediction = this.resolvePredictionForContract(contractType === 'BOTH' ? null : contractType);
        
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
            const proposalReq = this.buildProposalRequest(contractType, stakeToUse, prediction);
            const proposal = await this.deriv.send(proposalReq);
            console.log("PROPOSAÇ REQ ", proposalReq);
            console.log("PROPOSAL ", proposal);
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
            const buyReq: any = { buy: proposal.proposal.id, price: parseFloat(stakeToUse.toString()) };
            console.log("BUY REQ: ", buyReq);
            // Check if proposal is expired/valid
            if (!proposal.proposal.id) {
                 // If proposal ID is missing, try to get a new one
                 const freshProposal = await this.deriv.send(proposalReq);
                 if (freshProposal.error || !freshProposal.proposal) {
                     throw new Error(freshProposal.error?.message || "Failed to get fresh proposal for buy");
                 }
                 buyReq.buy = freshProposal.proposal.id;
                 buyReq.price = parseFloat(stakeToUse.toString());
            }

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
        } finally {
            this.capturedPredictionsForTrade = null;
        }
    }

    private async executeBothModeTrade(): Promise<void> {
        const currentMode = this.riskController.getCurrentMode();
        // 🎯 FIX: Use base contract from config if available
        const baseContract = this.config.contractType || this.config.tradeType || 'DIGITOVER';
        
        const bothContracts = this.contractSelector.getBothContracts(baseContract);
        
        const capturedContracts = this.capturedPredictionsForTrade
            ? Array.from(new Set(this.capturedPredictionsForTrade.map(p => p.contractType).filter((c): c is string => !!c)))
            : [];

        const contractsToExecute = capturedContracts.length > 0
            ? capturedContracts
            : (bothContracts?.contracts || []);

        if (contractsToExecute.length < 2) {
            this.onLog(`❌ BOTH mode: Could not find contract pair for ${baseContract}`);
            this.isTrading = false;
            return;
        }

        this.isTrading = true;
        this.bothModeGroupId++;
        
        const stakeToUse = currentMode === 'SIMULACAO' 
            ? this.config.stake 
            : this.riskController.getCurrentStake(null); // Get base stake for BOTH

        this.onLog(`⚡ ${currentMode} BOTH Trade: ${contractsToExecute.join(' & ')} | Total Stake: $${(stakeToUse * 2).toFixed(2)}`);

        // Clear pending results
        this.pendingBothResults.clear();

        try {
            for (const contractType of contractsToExecute) {
                const prediction = this.resolvePredictionForContract(contractType);
                
                if (currentMode === 'SIMULACAO') {
                    await this.simulateBothTrade(contractType, stakeToUse, prediction, bothContracts || { groupName: 'Over/Under', contracts: contractsToExecute });
                } else {
                    const proposalReq = this.buildProposalRequest(contractType, stakeToUse, prediction);
                    const proposal = await this.deriv.send(proposalReq);
                    
                    if (proposal.error) {
                        this.onLog(`⚠️ BOTH: ${contractType} proposal failed: ${proposal.error.message}`);
                        continue;
                    }

                    const buyReq: any = { buy: proposal.proposal.id, price: parseFloat(proposal.proposal.ask_price || stakeToUse) };
                    
                    if (!proposal.proposal.id) {
                         const freshProposal = await this.deriv.send(proposalReq);
                         if (freshProposal.error || !freshProposal.proposal) {
                             this.onLog(`⚠️ BOTH: ${contractType} fresh proposal failed`);
                             continue;
                         }
                         buyReq.buy = freshProposal.proposal.id;
                         buyReq.price = parseFloat(freshProposal.proposal.ask_price);
                    }

                    const buyResponse = await this.deriv.send(buyReq);
                    
                    if (buyResponse.error) {
                        this.onLog(`⚠️ BOTH: ${contractType} buy failed: ${buyResponse.error.message}`);
                        continue;
                    }

                    this.pendingBothResults.set(buyResponse.buy.contract_id, { contractType });
                    this.monitorBothContract(buyResponse.buy.contract_id, contractType, stakeToUse, bothContracts || { groupName: 'Over/Under', contracts: contractsToExecute });
                }
            }
        } catch (error: any) {
            this.onLog(`❌ BOTH trade error: ${error.message}`);
            this.isTrading = false;
        } finally {
            this.capturedPredictionsForTrade = null;
        }
    }

    private buildProposalRequest(contractType: string, stake: number, prediction: number | undefined): any {
        // 🎯 FIX: Determine barrier value based on contract type requirements
        let barrierValue: number | string | undefined = prediction;
        
        // Handle digit contracts specifically (Deriv API expects barrier as integer digit)
        if (['DIGITMATCH', 'DIGITDIFF', 'DIGITOVER', 'DIGITUNDER', 'DIGITEVEN', 'DIGITODD'].includes(contractType)) {
             // For Even/Odd, barrier is not used but some wrappers might pass it. 
             // For others, use prediction or 0.
             if (['DIGITEVEN', 'DIGITODD'].includes(contractType)) {
                 barrierValue = undefined;
             } else {
                 barrierValue = prediction !== undefined ? Math.floor(prediction) : 0;
             }
        }

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

        // Add barrier if applicable
        if (barrierValue !== undefined) {
            params.barrier = String(barrierValue);
        }

        const singleBarrierContracts = new Set([
            'CALLE',
            'PUTE',
            'TOUCH',
            'NOTOUCH',
            'ONETOUCH',
            'RUNHIGH',
            'RUNLOW'
        ]);
        
        // ... rest of the barrier logic ...
        
        // Remove redundant logic below as barrier is handled above for digits
        // But keep specialized barrier logic for other contracts
        
        const doubleBarrierContracts = new Set([
            'EXPIRYRANGE',
            'EXPIRYMISS',
            'RANGE',
            'UPORDOWN'
        ]);

        const predictionRangeContracts = new Set(['TICKHIGH', 'TICKLOW']);

        if (predictionRangeContracts.has(contractType) && prediction !== undefined && prediction !== null) {
            params.barrier = prediction;
        }

        if (singleBarrierContracts.has(contractType) && this.config.barrier !== undefined && this.config.barrier !== null && this.config.barrier !== '') {
            params.barrier = this.config.barrier;
        }

        if (doubleBarrierContracts.has(contractType)) {
            const low = this.config.barrierLow;
            const high = this.config.barrierHigh;
            if (low !== undefined && low !== null && low !== '' && high !== undefined && high !== null && high !== '') {
                params.barrier = low;
                params.barrier2 = high;
            }
        }

        return params;
    }

    private resolvePrediction(): number | undefined {
        return this.resolvePredictionForContract(null);
    }

    private async waitForContractExpiration(): Promise<any> {
        const duration = this.config.duration;
        const unit = this.config.durationUnit;

        if (unit === 't') {
            return await this.waitForTicks(duration);
        } else {
            const seconds = this.convertDurationToSeconds(duration, unit);
            return await this.waitForSeconds(seconds);
        }
    }

    private convertDurationToSeconds(duration: number, unit: string): number {
        switch (unit) {
            case 's': return duration;
            case 'm': return duration * 60;
            case 'h': return duration * 60 * 60;
            default: return duration;
        }
    }

    private async waitForTicks(tickCount: number): Promise<any> {
        return new Promise((resolve) => {
            let ticksReceived = 0;
            let listenerId: string | null = null;
            let firstTickDiscarded = false;

            // Safety timeout (5 min)
            const timeoutId = setTimeout(() => {
                if (listenerId) this.deriv.observerInstance.removeById(listenerId);
                const currentPrice = this.tradeContext.ticks[this.tradeContext.ticks.length - 1];
                resolve(currentPrice);
            }, 300000);

            listenerId = this.deriv.observerInstance.on('deriv.tick', (data: any) => {
                if (data.tick && data.tick.symbol === this.config.symbol) {
                    if (!firstTickDiscarded) {
                        firstTickDiscarded = true;
                        return;
                    }

                    ticksReceived++;
                    if (ticksReceived >= tickCount) {
                        clearTimeout(timeoutId);
                        if (listenerId) this.deriv.observerInstance.removeById(listenerId);
                        resolve(data.tick);
                    }
                }
            });
        });
    }

    private async waitForSeconds(seconds: number): Promise<any> {
        return new Promise((resolve) => {
            setTimeout(() => {
                // Return latest tick available after wait
                const currentPrice = this.tradeContext.ticks[this.tradeContext.ticks.length - 1];
                resolve(currentPrice);
            }, seconds * 1000);
        });
    }

    private determineTradeResult(contractType: string, entryPrice: number, exitPrice: number, prediction?: number): boolean {
        // Validate prices
        if (entryPrice === undefined || exitPrice === undefined || isNaN(entryPrice) || isNaN(exitPrice)) {
            return false;
        }

        switch (contractType) {
            case 'DIGITDIFF':
                return this.determineDigitDiffResult(exitPrice, prediction);
            case 'DIGITEVEN':
                return this.determineDigitEvenResult(exitPrice);
            case 'DIGITODD':
                return this.determineDigitOddResult(exitPrice);
            case 'DIGITOVER':
                return this.determineDigitOverResult(exitPrice, prediction);
            case 'DIGITUNDER':
                return this.determineDigitUnderResult(exitPrice, prediction);
            case 'DIGITMATCH':
                return this.determineDigitMatchResult(exitPrice, prediction);
            case 'CALL':
                return exitPrice > entryPrice;
            case 'PUT':
                return exitPrice < entryPrice;
            case 'CALLE':
                // Logic for CALLE (Barrier) - Simplified for now as barriers need parsing
                return exitPrice > entryPrice; 
            case 'PUTE':
                return exitPrice < entryPrice;
            default:
                return false;
        }
    }

    private extractLastDigit(price: number): number {
        const precision = this.getPrecision(this.config.symbol);
        const priceStr = price.toFixed(precision);
        return parseInt(priceStr.slice(-1));
    }

    private determineDigitDiffResult(exitPrice: number, prediction?: number): boolean {
        if (prediction === undefined) return false;
        const exitDigit = this.extractLastDigit(exitPrice);
        return exitDigit !== prediction;
    }

    private determineDigitEvenResult(exitPrice: number): boolean {
        const digit = this.extractLastDigit(exitPrice);
        return digit % 2 === 0;
    }

    private determineDigitOddResult(exitPrice: number): boolean {
        const digit = this.extractLastDigit(exitPrice);
        return digit % 2 !== 0;
    }

    private determineDigitOverResult(exitPrice: number, prediction?: number): boolean {
        if (prediction === undefined) return false;
        const digit = this.extractLastDigit(exitPrice);
        return digit > prediction;
    }

    private determineDigitUnderResult(exitPrice: number, prediction?: number): boolean {
        if (prediction === undefined) return false;
        const digit = this.extractLastDigit(exitPrice);
        return digit < prediction;
    }

    private determineDigitMatchResult(exitPrice: number, prediction?: number): boolean {
        if (prediction === undefined) return false;
        const digit = this.extractLastDigit(exitPrice);
        return digit === prediction;
    }

    private async simulateTrade(contractType: string, stake: number, prediction: number | undefined): Promise<void> {
        // 1. Get Entry Price
        const entryTick = this.tradeContext.ticks[this.tradeContext.ticks.length - 1];
        if (!entryTick) {
            this.onLog(`⚠️ Simulation failed: No market data`);
            return;
        }
        console.log('entryTick', entryTick);
        const entryPrice = entryTick;
        
        this.onLog(`⏳ Simulating ${contractType} (${this.config.duration}${this.config.durationUnit})... Entry: ${entryPrice}`);

        // 2. Wait for Expiration (Real Market Data)
        const exitTick = await this.waitForContractExpiration();
        if (!exitTick) {
            this.onLog(`⚠️ Simulation failed: Could not get exit price`);
            return;
        }
        const exitPrice = exitTick.quote;

        // 3. Determine Result (Local Judge)
        const isWin = this.determineTradeResult(contractType, entryPrice, exitPrice, prediction);
        
        const payout = this.currentProposalPayout || 1.95;
        const rawProfit = isWin ? stake * (payout - 1) : -stake;
        const profit = Math.round(rawProfit * 100) / 100;
        
        const resultEmoji = isWin ? '✅' : '❌';
        this.onLog(`${resultEmoji} Simulated: ${isWin ? 'WIN' : 'LOSS'} | ${contractType} | Entry: ${entryPrice} | Exit: ${exitPrice}`);
        
        this.processTradeResult(isWin, profit, contractType, stake, 'simulated_' + Date.now(), this.config.symbol, contractType, entryPrice.toString(), exitPrice, true);
    }

    private async simulateBothTrade(
        contractType: string, 
        stake: number, 
        prediction: number | undefined,
        bothContracts: ContractGroup
    ): Promise<void> {
        // 1. Get Entry Price (Shared for BOTH trades)
        const entryTick = this.tradeContext.ticks[this.tradeContext.ticks.length - 1];
        if (!entryTick) return;
        const entryPrice = entryTick;

        // 2. Wait for Expiration (Shared)
        // Note: In BOTH mode, we should ideally wait once for the pair, but calling simulateBothTrade twice 
        // in parallel (as implemented in executeBothModeTrade loop) might cause double waiting if not careful.
        // However, since they are independent promises, they will both wait for the SAME N ticks independently.
        // This is acceptable behavior.
        const exitTick = await this.waitForContractExpiration();
        if (!exitTick) return;
        const exitPrice = exitTick.quote;

        // 3. Determine Result
        const isWin = this.determineTradeResult(contractType, entryPrice, exitPrice, prediction);
        
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
                    console.log(contract);
                    this.processTradeResult(isWin, profit, contractType, stake, contractId, contract.underlying, contract.contract_type, contract.barrier ?? '', contract.
entry_tick_display_value, false);
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
        const normalizedResult: 'WIN' | 'LOSS' = bothResult.type === 'WIN'
            ? 'WIN'
            : (bothResult.type === 'LOSS' ? 'LOSS' : (totalProfit >= 0 ? 'WIN' : 'LOSS'));
        
        this.onLog(`⚖️ BOTH Result: ${bothResult.type} (${wins}/${results.length}) | Net: $${totalProfit.toFixed(2)}`);

        // Update total profit
        this.totalProfit += totalProfit;
        this.tradesExecuted++;
        this.lastTradeResult = normalizedResult;
        const currentMode = this.riskController.getCurrentMode();
        this.lastTradeOutcomeForGroups = { result: normalizedResult, simulated: currentMode === "SIMULACAO" };

        // Process through risk controller
        const totalStake = results.length * (this.riskController.getCurrentMode() === 'SIMULACAO' 
            ? this.config.stake 
            : this.riskController.getCurrentStake(null));
        
        this.onTrade({
            id: `both_${Date.now()}`,
            contractType: "BOTH",
            stake: totalStake,
            profit: totalProfit,
            status: normalizedResult,
            mode: currentMode,
            symbol: '',
            type: '',
            target: '0',
            exit: '0',
            timestamp: new Date(),
            isSimulation: currentMode === 'SIMULACAO' ? 'SIMULACAO' : 'REAL',
            payout: this.currentProposalPayout
        });

        this.riskController.handleTradeResult(
            normalizedResult,
            `both_${this.bothModeGroupId}`,
            totalStake,
            totalProfit
        );

        // Apply pause if configured
        this.handlePauseLogic(normalizedResult === 'WIN');

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
        contractId: string,
        symbol: string,
        type: string,
        target: string,
        exit: string,
        isSimulation: boolean
    ): void {
        this.isTrading = false;
        this.totalProfit += profit;
        this.tradesExecuted++;
        
        const currentMode = this.riskController.getCurrentMode();
        this.lastTradeResult = isWin ? 'WIN' : 'LOSS';
        this.lastTradeOutcomeForGroups = { result: isWin ? "WIN" : "LOSS", simulated: currentMode === "SIMULACAO" };
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
            symbol: symbol,
            type: type,
            target: target,
            exit: exit,
            isSimulation: isSimulation ? 'SIMULACAO' : 'REAL',
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
            cooldownTicks: this.cooldownTicks,
            cooldownTicksTotal: this.config.cooldown || 3,
            currentStake: this.riskController.getCurrentStake(null)
        };
    }

    public setMode(mode: TradeMode): void {
        this.riskController.setMode(mode);
    }
}
