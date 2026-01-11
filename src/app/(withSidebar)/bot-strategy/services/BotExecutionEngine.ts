import { DerivService } from "@/app/services/DerivService";

export interface TradeContext {
    ticks: number[];
    lastDigit: number;
    indicators: {
        rsi?: number;
        sma?: number;
    };
}

export interface StrategyRule {
    indicator: string;
    period?: number;
    operator: string;
    value: number | string;
    compare_period?: number;
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
}

export class BotExecutionEngine {
    private deriv: DerivService;
    private config: BotConfig;
    private strategy: any;
    private isRunning: boolean = false;
    private ticks: number[] = [];
    private tradeContext: TradeContext = { ticks: [], lastDigit: -1, indicators: {} };
    
    // Callbacks
    private onLog: (msg: string) => void;
    private onTrade: (trade: any) => void;
    
    // State
    private currentStake: number;
    private totalProfit: number = 0;
    private martingaleLevel: number = 0;
    private isTrading: boolean = false;

    constructor(config: BotConfig, strategy: any, onLog: (msg: string) => void, onTrade: (trade: any) => void) {
        this.deriv = DerivService.getInstance();
        this.config = config;
        this.strategy = strategy;
        this.onLog = onLog;
        this.onTrade = onTrade;
        this.currentStake = config.stake;
    }

    public start() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.onLog(`🚀 Motor de execução iniciado para ${this.config.symbol}`);
        this.subscribeToTicks();
    }

    public stop() {
        this.isRunning = false;
        this.onLog("🛑 Motor de execução parado");
        // Unsubscribe logic
        this.deriv.observerInstance.off('deriv.tick', this.handleTick);
    }

    private subscribeToTicks() {
        // We rely on the global tick stream or a specific subscription
        // For this migration, we'll assume we hook into the existing DerivService tick event
        
        // Note: In a real implementation, we might need to explicitly subscribe if not already.
        this.deriv.send({ ticks: this.config.symbol, subscribe: 1 }).catch(e => {
            if (!e.message.includes('already subscribed')) {
                this.onLog(`Erro ao subscrever: ${e.message}`);
            }
        });

        // Listen for ticks using DerivService observer
        this.deriv.observerInstance.on('deriv.tick', this.handleTick);
    }

    private handleTick = (data: any) => {
        if (!this.isRunning) return;
        
        if (data.tick && data.tick.symbol === this.config.symbol) {
            const price = data.tick.quote;
            this.processTick(price);
        }
    }

    private processTick(price: number) {
        this.ticks.push(price);
        if (this.ticks.length > 1000) this.ticks.shift();

        // Update Context
        this.tradeContext.ticks = this.ticks;
        this.tradeContext.lastDigit = parseInt(price.toString().slice(-1));
        
        // Calculate Indicators if needed
        this.calculateIndicators();

        // Check Logic
        if (!this.isTrading) {
            this.checkStrategy();
        }
    }

    private calculateIndicators() {
        // Simple implementation of indicators needed by the strategy
        if (this.strategy && this.strategy.conditions) {
            for (const cond of this.strategy.conditions) {
                if (cond.indicator === 'RSI') {
                    this.tradeContext.indicators.rsi = this.calculateRSI(this.ticks, cond.period || 14);
                }
                if (cond.indicator === 'SMA') {
                    this.tradeContext.indicators.sma = this.calculateSMA(this.ticks, cond.period || 14);
                }
            }
        }
    }

    private checkStrategy() {
        if (!this.strategy || !this.strategy.conditions) return;

        let allConditionsMet = true;

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
        let valueToCheck: number | undefined;
        let referenceValue: number;

        // Determine Value to Check
        if (cond.indicator === 'RSI') valueToCheck = this.tradeContext.indicators.rsi;
        else if (cond.indicator === 'SMA') valueToCheck = this.tradeContext.indicators.sma;
        else if (cond.indicator === 'DIGIT') valueToCheck = this.tradeContext.lastDigit;
        else if (cond.indicator === 'PRICE') valueToCheck = this.ticks[this.ticks.length - 1];

        if (valueToCheck === undefined) return false;

        // Determine Reference Value
        if (typeof cond.value === 'number') {
            referenceValue = cond.value;
        } else {
            // Handle dynamic references like "SMA"
            // For simplicity, we'll assume simple numeric values for now in this migration
            referenceValue = 0; 
        }

        // Compare
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
        
        // Check Limits
        if (this.totalProfit <= -this.config.stopLoss) {
            this.onLog("⛔ Stop Loss atingido!");
            this.stop();
            return;
        }
        if (this.totalProfit >= this.config.takeProfit) {
            this.onLog("🎉 Take Profit atingido!");
            this.stop();
            return;
        }

        this.isTrading = true;
        this.onLog(`⚡ Executando ordem: ${this.strategy.action} | Stake: ${this.currentStake}`);

        try {
            // Construct Buy Request
            const contractType = this.strategy.action === 'CALL' ? 'CALL' : 
                                 this.strategy.action === 'PUT' ? 'PUT' : 
                                 this.strategy.action; // DIGITOVER, etc.

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

            // Add barriers for Digit trades if needed
            if (contractType.includes('DIGIT')) {
                 // Logic to determine barrier from strategy would go here
                 // For now, default or extracted from strategy
                 if (this.strategy.prediction !== undefined) {
                     buyParams.parameters.barrier = this.strategy.prediction;
                 }
            }

            // Note: In real app, we usually get a Proposal first, then Buy. 
            // DerivService might handle this or we send 'buy' directly if we know parameters.
            // A safer way is 'proposal' -> 'buy'.
            // For migration speed, assuming we use the `buy` shortcut or implement proposal flow.
            
            // Let's assume we send a proposal first
            const proposalReq = {
                proposal: 1,
                ...buyParams.parameters
            };
            delete proposalReq.buy; // Proposal doesn't have 'buy' field
            delete proposalReq.price;

            const proposal = await this.deriv.send(proposalReq);
            if (proposal.error) {
                throw new Error(proposal.error.message);
            }

            const buyReq = {
                buy: proposal.proposal.id,
                price: proposal.proposal.ask_price
            };

            const buyResponse = await this.deriv.send(buyReq);
            
            if (buyResponse.error) {
                throw new Error(buyResponse.error.message);
            }

            this.onLog(`✅ Ordem enviada! ID: ${buyResponse.buy.contract_id}`);
            
            // Monitor Contract
            this.monitorContract(buyResponse.buy.contract_id);

        } catch (error: any) {
            this.onLog(`❌ Erro na compra: ${error.message}`);
            this.isTrading = false;
        }
    }

    private monitorContract(contractId: string) {
        // Subscribe to contract updates
        // For this migration, we'll poll or use the stream if available
        // We'll simulate a wait for result for now or hook into proposals_open_contract
        
        const checkInterval = setInterval(async () => {
            if (!this.isRunning) {
                clearInterval(checkInterval);
                return;
            }

            try {
                // We use send instead of subscribe for simplicity in this migration class
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
        const resultEmoji = isWin ? '✅' : '❌';
        
        this.onLog(`${resultEmoji} Trade finalizado. Lucro: ${profit} | Total: ${this.totalProfit.toFixed(2)}`);
        
        const tradeResult = {
            id: contract.contract_id,
            time: new Date(contract.purchase_time * 1000).toLocaleTimeString(),
            symbol: contract.underlying_symbol,
            type: contract.contract_type,
            target: contract.barrier || '-',
            exit: contract.exit_tick || contract.sell_spot || '-',
            stake: contract.buy_price,
            status: isWin ? 'Won' : 'Lost',
            profit: profit.toFixed(2)
        };

        this.onTrade(tradeResult);

        // Martingale Logic
        if (!isWin) {
            this.martingaleLevel++;
            if (this.martingaleLevel <= this.config.martingaleLevels) {
                this.currentStake = this.currentStake * this.config.martingaleFactor;
                this.onLog(`🔄 Martingale Nível ${this.martingaleLevel}: Nova stake ${this.currentStake.toFixed(2)}`);
            } else {
                this.onLog("⚠️ Limite de Martingale atingido. Resetando stake.");
                this.currentStake = this.config.stake;
                this.martingaleLevel = 0;
            }
        } else {
            this.currentStake = this.config.stake;
            this.martingaleLevel = 0;
        }
    }

    // --- Helpers ---
    private calculateSMA(data: number[], period: number): number {
        if (data.length < period) return 0;
        const slice = data.slice(-period);
        const sum = slice.reduce((a, b) => a + b, 0);
        return sum / period;
    }

    private calculateRSI(data: number[], period: number): number {
        if (data.length < period + 1) return 50;
        
        let gains = 0;
        let losses = 0;

        for (let i = data.length - period; i < data.length; i++) {
            const diff = data[i] - data[i - 1];
            if (diff >= 0) gains += diff;
            else losses -= diff;
        }

        if (losses === 0) return 100;
        
        const rs = gains / losses;
        return 100 - (100 / (1 + rs));
    }
}
