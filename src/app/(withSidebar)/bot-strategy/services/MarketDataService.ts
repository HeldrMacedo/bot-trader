import { DerivService } from "@/app/services/DerivService";

export class MarketDataService {
    private static instance: MarketDataService;
    private deriv: DerivService;
    
    // Store history per symbol
    private history: Map<string, {
        ticks: any[];
        prices: number[];
        digits: number[];
    }> = new Map();

    private contractsCache: Map<string, any> = new Map();

    private activeSymbol: string | null = null;
    private listenerId: string | null = null;

    private constructor() {
        this.deriv = DerivService.getInstance();
        this.startListening();
    }

    public static getInstance(): MarketDataService {
        if (!MarketDataService.instance) {
            MarketDataService.instance = new MarketDataService();
        }
        return MarketDataService.instance;
    }

    private startListening() {
        // Listen to all ticks and store them if they match active symbol or just store all (optimizing for active)
        this.listenerId = this.deriv.observerInstance.on('deriv.tick', (data: any) => {
            if (data.tick) {
                const symbol = data.tick.symbol;
                const price = data.tick.quote;
                const digit = this.extractDigit(price, symbol); // Simple extraction, can be improved with symbol specifics

                if (!this.history.has(symbol)) {
                    this.history.set(symbol, { ticks: [], prices: [], digits: [] });
                }

                const symbolHistory = this.history.get(symbol)!;
                
                // Keep last 1000
                symbolHistory.ticks.push(data.tick);
                symbolHistory.prices.push(price);
                symbolHistory.digits.push(digit);

                if (symbolHistory.ticks.length > 1000) {
                    symbolHistory.ticks.shift();
                    symbolHistory.prices.shift();
                    symbolHistory.digits.shift();
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
        
        // Forex usually 5 (or 3 for JPY pairs), but for Volatility indices defaulting to 4 is safer if unknown
        // However, looking at original code is best.
        // Default fallback
        return 4; 
    }

    public setActiveSymbol(symbol: string) {
        this.activeSymbol = symbol;
    }

    public getActiveSymbol(): string | null {
        return this.activeSymbol;
    }

    public getLastNPrices(symbol: string, count: number): number[] {
        const history = this.history.get(symbol);
        if (!history) return [];
        return history.prices.slice(-count);
    }

    public getLastNDigits(symbol: string, count: number): number[] {
        const history = this.history.get(symbol);
        if (!history) return [];
        return history.digits.slice(-count);
    }

    public getLastNTicks(symbol: string, count: number): any[] {
        const history = this.history.get(symbol);
        if (!history) return [];
        return history.ticks.slice(-count);
    }

    public async getContractsFor(symbol: string): Promise<any> {
        if (!symbol) return null;

        const cached = this.contractsCache.get(symbol);
        if (cached) return cached;

        const response = await this.deriv.send({ contracts_for: symbol });
        this.contractsCache.set(symbol, response);
        return response;
    }
}
