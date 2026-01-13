export class Indicators {
    /**
     * Calculates the Relative Strength Index (RSI).
     * @param prices Array of prices.
     * @param period The period for RSI (default 14).
     * @returns The latest RSI value or null if not enough data.
     */
    static calculateRSI(prices: number[], period: number = 14): number | null {
        if (prices.length < period + 1) return null;

        let gains = 0;
        let losses = 0;

        // Calculate initial average gain/loss
        for (let i = prices.length - period; i < prices.length; i++) {
            const difference = prices[i] - prices[i - 1];
            if (difference >= 0) {
                gains += difference;
            } else {
                losses -= difference;
            }
        }

        let averageGain = gains / period;
        let averageLoss = losses / period;

        // Calculate RSI
        const relativeStrength = averageGain / averageLoss;
        const rsi = 100 - (100 / (1 + relativeStrength));

        return rsi;
    }

    /**
     * Calculates the Simple Moving Average (SMA).
     * @param prices Array of prices.
     * @param period The period for SMA.
     * @returns The SMA value or null if not enough data.
     */
    static calculateSMA(prices: number[], period: number): number | null {
        if (prices.length < period) return null;

        const slice = prices.slice(-period);
        const sum = slice.reduce((a, b) => a + b, 0);
        return sum / period;
    }

    /**
     * Calculates the Exponential Moving Average (EMA).
     * @param prices Array of prices.
     * @param period The period for EMA.
     * @returns The EMA value or null if not enough data.
     */
    static calculateEMA(prices: number[], period: number): number | null {
        if (prices.length < period) return null;

        const k = 2 / (period + 1);
        let ema = prices[0];

        for (let i = 1; i < prices.length; i++) {
            ema = prices[i] * k + ema * (1 - k);
        }

        return ema;
    }

    /**
     * Calculates Bollinger Bands.
     * @param prices Array of prices.
     * @param period The period (default 20).
     * @param stdDevMultiplier Multiplier for standard deviation (default 2).
     * @returns Object with upper, middle, and lower bands.
     */
    static calculateBollinger(prices: number[], period: number = 20, stdDevMultiplier: number = 2): { upper: number, middle: number, lower: number } | null {
        const sma = this.calculateSMA(prices, period);
        if (sma === null) return null;

        const slice = prices.slice(-period);
        const squaredDiffs = slice.map(price => Math.pow(price - sma, 2));
        const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / period;
        const stdDev = Math.sqrt(avgSquaredDiff);

        return {
            upper: sma + (stdDev * stdDevMultiplier),
            middle: sma,
            lower: sma - (stdDev * stdDevMultiplier)
        };
    }
}