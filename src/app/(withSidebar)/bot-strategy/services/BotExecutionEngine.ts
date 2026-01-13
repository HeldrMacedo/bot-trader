import { DerivService } from "@/app/services/DerivService";
import { Indicators } from "./Indicators";
import { PatternRecognizer } from "./PatternRecognizer";
import { MarketDataService } from "./MarketDataService";

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
    indicator: string; // RSI, SMA, PRICE, DIGIT, PATTERN
    period?: number;
    operator: string; // >, <, >=, <=, ==, !=, CROSS_UP, CROSS_DOWN, IS_EVEN, IS_ODD, MATCHES
    value: number | string; // 70, "SMA", "dynamic_repeated_digit"
    compare_period?: number;
    parameters?: any; // For patterns or complex rules
}

export interface BotConfig {
    symbol: string;
    stake: number;
    duration: number;
    durationUnit: string;
    stopLoss: number;
    takeProfit: number;
    martingaleFactor: number;
    martingaleLevels: number;
    // New fields for robust management
    prediction?: number; // Default prediction
}

export class BotExecutionEngine {
    private deriv: DerivService;
    private marketData: MarketDataService;
    private patternRecognizer: PatternRecognizer;
    
    private config: BotConfig;
    private strategy: any;
    
    private isRunning: boolean = false;
    private tradeContext: TradeContext = { ticks: [], prices: [], digits: [], indicators: {} };
    
    // Callbacks
    private onLog: (msg: string) => void;
    private onTrade: (trade: any) => void;
    
    // State
    private currentStake: number;
    private totalProfit: number = 0;
    private martingaleLevel: number = 0;
    private isTrading: boolean = false;
    private lastTradeResult: 'WIN' | 'LOSS' | null = null;
    
    // Dynamic State
    private dynamicTarget: number | null = null;
    private tickListenerId: string | null = null;

    constructor(config: BotConfig, strategy: any, onLog: (msg: string) => void, onTrade: (trade: any) => void) {
        this.deriv = DerivService.getInstance();
        this.marketData = MarketDataService.getInstance();
        this.patternRecognizer = new PatternRecognizer();
        
        this.config = config;
        this.strategy = strategy;
        this.onLog = onLog;
        this.onTrade = onTrade;
        this.currentStake = config.stake;
    }

    public start() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.totalProfit = 0;
        this.martingaleLevel = 0;
        this.currentStake = this.config.stake;
        this.isTrading = false;
        
        this.onLog(`🚀 Motor de execução iniciado para ${this.config.symbol}`);
        this.subscribeToTicks();
    }

    public stop() {
        this.isRunning = false;
        this.onLog("🛑 Motor de execução parado");
        if (this.tickListenerId) {
            this.deriv.observerInstance.removeById(this.tickListenerId);
            this.tickListenerId = null;
        }
    }

    public updateConfig(newConfig: BotConfig) {
        this.config = { ...this.config, ...newConfig };
        this.onLog("⚙️ Configurações atualizadas em tempo real");
    }

    private subscribeToTicks() {
        // Ensure subscription
        this.deriv.send({ ticks: this.config.symbol, subscribe: 1 }).catch(e => {
            if (!e.message.includes('already subscribed')) {
                this.onLog(`Erro ao subscrever: ${e.message}`);
            }
        });

        // Listen for ticks
        this.tickListenerId = this.deriv.observerInstance.on('deriv.tick', this.handleTick);
    }

    private handleTick = (data: any) => {
        if (!this.isRunning) return;
        
        if (data.tick && data.tick.symbol === this.config.symbol) {
            this.processTick(data.tick);
        }
    }

    private processTick(tick: any) {
        const price = tick.quote;
        // Use MarketDataService to ensure consistent history
        this.tradeContext.prices = this.marketData.getLastNPrices(this.config.symbol, 1000);
        this.tradeContext.digits = this.marketData.getLastNDigits(this.config.symbol, 1000);
        this.tradeContext.ticks = this.tradeContext.prices; // Alias

        // Calculate Indicators
        this.calculateIndicators();

        // Check Logic
        if (!this.isTrading) {
            this.checkStrategy();
        }
    }

    private calculateIndicators() {
        if (!this.strategy || !this.strategy.conditions) return;
        
        // Optimize: Only calculate what's needed
        const neededIndicators = new Set(this.strategy.conditions.map((c: any) => c.indicator));
        const prices = this.tradeContext.prices;

        if (neededIndicators.has('RSI')) {
             // Find max period needed
             const rsiConditions = this.strategy.conditions.filter((c: any) => c.indicator === 'RSI');
             for(const cond of rsiConditions) {
                 this.tradeContext.indicators.rsi = Indicators.calculateRSI(prices, cond.period || 14) || 0;
             }
        }
        if (neededIndicators.has('SMA')) {
            this.tradeContext.indicators.sma = Indicators.calculateSMA(prices, 14) || 0; // Simplification, ideally dynamic
        }
        // Add EMA, Bollinger as needed
    }

    private checkStrategy() {
        if (!this.strategy || !this.strategy.conditions) return;

        let allConditionsMet = true;
        
        // Reset dynamic target
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

    private evaluateCondition(cond: StrategyRule): boolean {
        // Handle Pattern Rules separately
        if (cond.indicator === 'PATTERN' || (cond.parameters && cond.parameters.pattern)) {
             const result = this.patternRecognizer.processDigitPatternRule(cond, this.config.symbol);
             return result.matches;
        }

        let valueToCheck: number | undefined;
        let referenceValue: number;

        // Determine Value to Check
        if (cond.indicator === 'RSI') {
            valueToCheck = Indicators.calculateRSI(this.tradeContext.prices, cond.period || 14) || undefined;
        }
        else if (cond.indicator === 'SMA') {
            valueToCheck = Indicators.calculateSMA(this.tradeContext.prices, cond.period || 14) || undefined;
        }
        else if (cond.indicator === 'DIGIT') {
            valueToCheck = this.tradeContext.digits[this.tradeContext.digits.length - 1];
        }
        else if (cond.indicator === 'PRICE') {
            valueToCheck = this.tradeContext.prices[this.tradeContext.prices.length - 1];
        }

        if (valueToCheck === undefined) return false;

        // Determine Reference Value
        if (typeof cond.value === 'number') {
            referenceValue = cond.value;
        } else if (cond.value === 'SMA') {
             referenceValue = Indicators.calculateSMA(this.tradeContext.prices, cond.compare_period || 20) || 0;
        } else {
             referenceValue = 0; // Default
        }

        // Logic for Dynamic Prediction extraction
        // Example: "differ do dígito que se repetir" -> We need to find the repeated digit
        if (this.strategy.prediction === 'dynamic_repeated_digit' || cond.value === 'dynamic_repeated_digit') {
            // Find repeated digit logic
            const lastDigit = this.tradeContext.digits[this.tradeContext.digits.length - 1];
            const prevDigit = this.tradeContext.digits[this.tradeContext.digits.length - 2];
            if (lastDigit === prevDigit) {
                this.dynamicTarget = lastDigit;
            } else {
                // If the condition implies "repeating", and it's not repeating, condition fails?
                // Or maybe the condition IS checking for repetition.
            }
        }

        // Standard Comparison
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

    private async executeTrade() {
        if (this.isTrading) return;
        
        // Check Global Limits
        if (this.totalProfit <= -Math.abs(this.config.stopLoss)) {
            this.onLog("⛔ Stop Loss atingido! Parando bot.");
            this.stop();
            return;
        }
        if (this.totalProfit >= this.config.takeProfit) {
            this.onLog("🎉 Take Profit atingido! Parando bot.");
            this.stop();
            return;
        }

        this.isTrading = true;
        this.onLog(`⚡ Executando ordem: ${this.strategy.action} | Stake: ${this.currentStake}`);

        try {
            // Determine Contract Type and Prediction
            const contractType = this.strategy.action;
            
            // Resolve Prediction
            let prediction = this.config.prediction;
            
            // 1. Strategy Explicit Prediction
            if (this.strategy.prediction !== undefined && this.strategy.prediction !== null) {
                if (this.strategy.prediction === 'dynamic_repeated_digit') {
                    if (this.dynamicTarget !== null) {
                        prediction = this.dynamicTarget;
                    } else {
                        // Fallback or skip
                        this.onLog("⚠️ Previsão dinâmica não resolvida. Usando padrão.");
                        prediction = 0; 
                    }
                } else {
                    prediction = Number(this.strategy.prediction);
                }
            }

            const buyParams: any = {
                buy: 1,
                price: this.currentStake,
                parameters: {
                    amount: this.currentStake,
                    basis: 'stake',
                    contract_type: contractType,
                    currency: 'USD',
                    duration: this.config.duration,
                    duration_unit: this.config.durationUnit,
                    symbol: this.config.symbol,
                }
            };

            // Add barrier if needed
            if (['DIGITMATCH', 'DIGITDIFF', 'DIGITOVER', 'DIGITUNDER'].includes(contractType)) {
                if (prediction === undefined) prediction = 0; // Safety
                buyParams.parameters.barrier = prediction;
            }

            // Execute via Proposal -> Buy for robustness
            const proposalReq = { ...buyParams.parameters, proposal: 1 };
            const proposal = await this.deriv.send(proposalReq);
            
            if (proposal.error) throw new Error(proposal.error.message);

            const buyReq = { buy: proposal.proposal.id, price: proposal.proposal.ask_price };
            const buyResponse = await this.deriv.send(buyReq);
            
            if (buyResponse.error) throw new Error(buyResponse.error.message);

            this.onLog(`✅ Ordem enviada! ID: ${buyResponse.buy.contract_id}`);
            this.monitorContract(buyResponse.buy.contract_id);

        } catch (error: any) {
            this.onLog(`❌ Erro na compra: ${error.message}`);
            this.isTrading = false;
        }
    }

    private monitorContract(contractId: string) {
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
                    this.processResult(contract);
                }
            } catch (e) {
                console.error("Error monitoring contract", e);
            }
        }, 1000);
    }

    private processResult(contract: any) {
        this.isTrading = false;
        const profit = Number(contract.profit);
        this.totalProfit += profit;
        
        const isWin = profit > 0;
        this.lastTradeResult = isWin ? 'WIN' : 'LOSS';
        const resultEmoji = isWin ? '✅' : '❌';
        
        this.onLog(`${resultEmoji} Trade finalizado. Lucro: ${profit} | Total: ${this.totalProfit.toFixed(2)}`);
        
        // Notify Trade
        this.onTrade({
            id: contract.contract_id,
            profit: profit,
            status: isWin ? 'WIN' : 'LOSS',
            timestamp: new Date()
        });

        // Martingale Logic
        if (isWin) {
            this.martingaleLevel = 0;
            this.currentStake = this.config.stake; // Reset stake
            this.onLog("🔄 Martingale resetado.");
        } else {
            this.martingaleLevel++;
            if (this.martingaleLevel <= this.config.martingaleLevels) {
                this.currentStake = this.currentStake * this.config.martingaleFactor;
                this.onLog(`📈 Martingale Nível ${this.martingaleLevel}: Próxima stake ${this.currentStake.toFixed(2)}`);
            } else {
                this.martingaleLevel = 0;
                this.currentStake = this.config.stake; // Reset if max level reached
                this.onLog("⚠️ Limite de Martingale atingido. Resetando stake.");
            }
        }
    }
}
