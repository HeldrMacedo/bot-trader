/**
 * Robot Strategy Execution Engine
 * Handles the running of the bot strategy, API interaction, and state management.
 */
class RobotStrategy {
    constructor() {
        this.isRunning = false;
        this.tradeOptions = null;
        this.api = null; // Will hook into AppManager.apiInstance
        this.ticks = [];
        this.balance = 0;
        this.totalProfit = 0;
        this.contractId = null;
        this.purchaseTime = null;
        this.currentProposal = null;
        this.shouldTradeAgain = false;

        // Callbacks
        this.onInitialization = null;
        this.onBeforePurchase = null;
        this.onAfterPurchase = null;
        this.onDuringPurchase = null;

        this.init();
    }

    init() {
        // console.log("🤖 Robot Strategy Engine Initialized");
        window.Bot = this;
    }

    /**
     * Start the strategy execution
     */
    start(options, callbacks) {
        if (this.isRunning) {
            this.notify("Bot já está rodando!", "warn");
            return;
        }

        // console.log("🚀 Starting Bot with options:", options);
        this.tradeOptions = options || {};

        // Setup Callbacks
        this.onInitialization = callbacks && callbacks.onInitialization;
        this.onBeforePurchase = callbacks && callbacks.onBeforePurchase;
        this.onDuringPurchase = callbacks && callbacks.onDuringPurchase;
        this.onAfterPurchase = callbacks && callbacks.onAfterPurchase;

        // Only override UI callbacks if provided (allows UI to hook in before start)
        if (callbacks && callbacks.onUpdate) this.onUpdate = callbacks.onUpdate;
        if (callbacks && callbacks.onNotify) this.onNotify = callbacks.onNotify;

        this.isRunning = true;
        this.totalProfit = 0;
        this.ticks = []; // Clear ticks

        this.log("Bot iniciado.", "success");
        this.notify("Bot iniciado.", "success"); // Show in UI Log
        if (this.onUpdate) this.onUpdate(true); // Notify UI: Running

        // Hook into existing API instance
        if (typeof AppManager !== 'undefined' && AppManager.apiInstance) {
            this.api = AppManager.apiInstance;
            this.subscribeToTicks();
        } else {
            // Emulate for testing/offline
            this.log("⚠️ API não conectada. Modo Simulação/Offline.", "warn");
            this.subscribeToTicksStub();
        }

        // Run initialization block
        if (typeof this.onInitialization === 'function') {
            try {
                this.onInitialization();
            } catch (e) {
                this.log("Erro na inicialização: " + e.message, "error");
            }
        }
    }

    stop() {
        if (!this.isRunning) return;
        this.isRunning = false;
        this.log("Bot parado pelo usuário.", "warn");
        this.notify("Bot parado pelo usuário.", "warn"); // Show in UI Log
        this.contractId = null;
        if (this.onUpdate) this.onUpdate(false); // Notify UI: Stopped
    }

    async subscribeToTicks() {
        if (!this.isRunning) return;

        const symbol = this.tradeOptions.symbol || 'R_100';
        this.log(`Monitorando mercado: ${symbol}`);

        // Listen to global tick events (assumed emitted by AppManager/MonitoringView)
        // Or create manual subscription if needed.
        // For robustness, we'll try to listen to 'tick' event on window

        const tickListener = (e) => {
            // console.log("[Bot Engine] Event received", e.type); 
            if (!this.isRunning) {
                window.removeEventListener('deriv-api-message', tickListener);
                return;
            }

            const data = e.detail;
            if (data.tick && data.tick.symbol === symbol) {
                // this.log(`Tick received: ${data.tick.quote}`);
                this.processTick(data.tick.quote);
            } else if (data.history && data.history.symbol === symbol) {
                // Handle history if needed?
            }
        };
        window.addEventListener('deriv-api-message', tickListener);
        // console.log(`[Bot Engine] Subscribed to window 'deriv-api-message' event for ${symbol}`);

        // Also try to force subscription via API if not already active
        if (this.api && this.api.sendRequest) {
            // console.log(`[Bot Engine] Sending API subscription for ${symbol}`);
            this.api.sendRequest({ ticks: symbol, subscribe: 1 }).catch(e => {
                // Ignore "AlreadySubscribed" errors as they are harmless
                if (e.message && e.message.includes("already subscribed")) {
                    // console.warn("[Bot Engine] Already subscribed to " + symbol);
                    return;
                }
                console.warn("[Bot Engine] API Subscribe Error:", e);
                this.notify("Erro na subscrição de ticks: " + e.message, "error");
            });
        }
    }

    subscribeToTicksStub() {
        // Simulation Tick Generator
        const loop = () => {
            if (!this.isRunning) return;
            const last = this.ticks.length > 0 ? this.ticks[this.ticks.length - 1] : 1000;
            const change = (Math.random() - 0.5) * 2;
            const quote = last + change;
            this.processTick(quote);
            setTimeout(loop, 1000);
        };
        loop();
    }

    processTick(quote) {
        if (!this.isRunning) return;

        this.ticks.push(quote);
        if (this.ticks.length > 1000) this.ticks.shift();

        // 1. Check Logic
        if (!this.contractId) {
            // Before Purchase Logic
            if (typeof this.onBeforePurchase === 'function') {
                this.onBeforePurchase();
            }
        } else {
            // During Purchase Logic
            if (typeof this.onDuringPurchase === 'function') {
                this.onDuringPurchase();
            }
            // Monitor Contract (handled separately usually, but we check here too)
        }
    }

    purchase(type) {
        if (!this.isRunning) return;
        if (this.contractId) {
            this.log("Já existe um contrato em aberto.", "warn");
            return;
        }

        this.log(`Comprando: ${type}...`);

        // Real Purchase Logic via API
        this.executePurchase(type);
    }

    async executePurchase(contractType) {
        if (!this.api) {
            // Simulation
            this.contractId = "SIM_" + Date.now();
            this.log(`Compra Simulada: ${this.contractId}`, "success");
            this.monitorContractStub(this.contractId);
            return;
        }

        // Build Proposal Req
        // Map Duration Unit
        let dUnit = 't';
        if (this.tradeOptions.durationType) {
            const map = { 't': 't', 's': 's', 'm': 'm', 'h': 'h', 'd': 'd', 'ticks': 't', 'seconds': 's', 'minutes': 'm' };
            dUnit = map[this.tradeOptions.durationType] || 't';
        }

        const req = {
            proposal: 1,
            amount: this.tradeOptions.amount || 0.35,
            basis: 'stake',
            contract_type: contractType.toUpperCase(),
            currency: this.tradeOptions.currency || 'USD',
            duration: this.tradeOptions.duration || 5,
            duration_unit: dUnit,
            symbol: this.tradeOptions.symbol || 'R_100'
        };

        if (this.tradeOptions.prediction !== undefined) {
            const type = contractType.toUpperCase();
            // Only add barrier for types that strictly require it
            if (['DIGITMATCH', 'DIGITDIFF', 'DIGITOVER', 'DIGITUNDER', 'HIGHER', 'LOWER', 'TOUCH', 'NOTOUCH'].includes(type)) {
                req.barrier = this.tradeOptions.prediction;
            }
        }

        try {
            const proposal = await this.api.sendRequest(req);
            if (proposal.error) {
                this.notify("Erro Proposta: " + proposal.error.message, "error");
                return;
            }

            const buy = await this.api.sendRequest({ buy: proposal.proposal.id, price: proposal.proposal.ask_price });
            if (buy.error) {
                this.notify("Erro Compra: " + buy.error.message, "error");
                return;
            }

            this.contractId = buy.buy.contract_id;
            this.log(`Contrato Comprado: ${this.contractId}`, "success");
            this.monitorContract(this.contractId);

        } catch (e) {
            this.log("Exceção Compra: " + e.message, "error");
        }
    }

    monitorContract(id) {
        const check = async () => {
            if (!this.isRunning || !this.contractId) return;
            try {
                const data = await this.api.sendRequest({ proposal_open_contract: 1, contract_id: id });
                const contract = data.proposal_open_contract;

                if (contract.is_sold) {
                    this.contractId = null;
                    const profit = parseFloat(contract.profit);
                    this.totalProfit += profit;
                    this.lastResult = profit >= 0 ? "win" : "loss";
                    this.lastProfit = profit;

                    this.log(`Resultado: ${this.lastResult.toUpperCase()} (${profit})`, this.lastResult === 'win' ? 'success' : 'error');

                    if (typeof this.onAfterPurchase === 'function') {
                        this.onAfterPurchase();
                    }
                } else {
                    setTimeout(check, 1000);
                }
            } catch (e) {
                console.error(e);
            }
        };
        check();
    }

    monitorContractStub(id) {
        // Simulate Outcome
        setTimeout(() => {
            this.contractId = null;
            const win = Math.random() > 0.5;
            const profit = win ? (this.tradeOptions.amount * 0.9) : (-this.tradeOptions.amount);
            this.totalProfit += profit;
            this.lastResult = win ? "win" : "loss";
            this.log(`Resultado (Simulado): ${this.lastResult.toUpperCase()} (${profit.toFixed(2)})`, win ? 'success' : 'error');

            if (typeof this.onAfterPurchase === 'function') {
                this.onAfterPurchase();
            }
        }, 2000);
    }

    tradeAgain() {
        this.log("Reiniciando...", "info");
        // Loop controls itself via tick processing
    }

    sellAtMarket() {
        if (this.contractId) {
            this.log("Tentando vender a mercado...", "warn");
            // Implementation: await this.api.sell({ sell: this.contractId, price: 0 });
        }
    }

    // --- Helper Methods ---

    notify(msg, type = 'info', sound = 'silent') {
        const timestamp = new Date().toLocaleTimeString();
        // Log raw to console
        // console.log(`[Bot Engine] notify called: "${msg}" (${type})`);

        // console.log(`%c[BOT] [${timestamp}] ${msg}`, type === 'error' ? 'color: red' : 'color: cyan');

        // Notify UI
        if (this.onNotify) {
            // console.log("[Bot Engine] Calling UI onNotify callback...");
            this.onNotify(msg, type, sound);
        } else {
            console.warn("[Bot Engine] No onNotify callback registered!");
        }

        // Show Swal toast if critical (Backup if no UI handler, or duplicate?)
        // We'll keep Swal for errors but rely on onNotify for general log
        if (typeof Swal !== 'undefined' && (type === 'error')) {
            const Toast = Swal.mixin({
                toast: true, position: 'bottom-end', showConfirmButton: false, timer: 3000
            });
            Toast.fire({ icon: type, title: msg });
        }

        if (sound !== 'silent') {
            // Play sound logic
        }
    }

    wait(seconds) {
        // This creates a blocking wait? No, JS is single threaded.
        // Usually 'wait' in blocks just means "don't do anything for X seconds".
        // Hard to implement in event-driven JS without async/await usage in user code.
        // But Binary Bot 'wait' is synchronous-like.
        // We'll ignore or use a busy-wait? NO.
        // We log it.
        this.log(`Wait ${seconds}s (Not fully implemented in JS non-blocking mode)`);
    }

    checkDirection(dir) {
        if (this.ticks.length < 2) return false;
        const last = this.ticks[this.ticks.length - 1];
        const prev = this.ticks[this.ticks.length - 2];
        if (dir === 'rise') return last > prev;
        if (dir === 'fall') return last < prev;
        return false;
    }

    getLastDigit() {
        if (this.ticks.length === 0) return 0;
        const val = this.ticks[this.ticks.length - 1].toString();
        return parseInt(val.charAt(val.length - 1));
    }

    getLastDigitList() {
        return this.ticks.map(t => parseInt(t.toString().slice(-1)));
    }

    getLastTick() {
        if (this.ticks.length === 0) return 0;
        return this.ticks[this.ticks.length - 1];
    }

    getTicks() {
        return [...this.ticks];
    }

    getTotalProfit() {
        return parseFloat(this.totalProfit.toFixed(2));
    }

    isResult(expected) {
        return this.lastResult === expected;
    }

    readDetails(index) {
        // Access previous contract details
        // Not implemented fully
        if (index === 4) return this.lastProfit; // Ex: 4 might be profit
        return 0;
    }

    getPayout(type) {
        // Used for calculating potential payout.
        // req payout from API?
        return 0; // Placeholder
    }

    ask(msg) {
        // Prompt user
        return prompt(msg);
    }

    toDateTime(timestamp) {
        return new Date(timestamp * 1000).toLocaleString();
    }

    // Indicators
    sma(list, period) {
        if (!list || list.length < period) return 0;
        const slice = list.slice(-period);
        const sum = slice.reduce((a, b) => a + b, 0);
        return sum / period;
    }

    bb(list, period, up, down, outputType) {
        if (!list || list.length < period) return 0;

        // Simple BB Calc
        const slice = list.slice(-period);
        const mean = slice.reduce((a, b) => a + b, 0) / period;

        const squareDiffs = slice.map(value => Math.pow(value - mean, 2));
        const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / period;
        const stdDev = Math.sqrt(avgSquareDiff);

        const upper = mean + (up * stdDev);
        const lower = mean - (down * stdDev);

        if (outputType === 'ub') return upper; // Upper Band
        if (outputType === 'lb') return lower; // Lower Band
        if (outputType === 'mb') return mean; // Middle Band

        return mean;
    }

    log(msg, type = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        console.log(`[${timestamp}] ${msg}`);
    }
}

// Initialize globally
window.RobotStrategy = RobotStrategy;
window.Bot = new RobotStrategy();
