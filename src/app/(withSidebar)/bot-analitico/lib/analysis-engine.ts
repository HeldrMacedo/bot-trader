
import { TradingSignal, MarketQuality } from '@/lib/deriv-api-client';
import { SymbolAnalysis, VolatilityData, SpecificOperations, MartingaleConfig } from '../types';

export interface AnalysisConfig {
    minConfidence: number;
    exhaustionThreshold: number;
    absenceThreshold: number;
    ticksToAnalyze: number;
    specificOperations: SpecificOperations;
}

export class AnalysisEngine {
    private history: Record<string, number[]> = {};
    private config: AnalysisConfig;

    constructor(config: AnalysisConfig) {
        this.config = config;
    }

    public updateConfig(config: AnalysisConfig) {
        this.config = config;
    }

    public addTick(symbol: string, digit: number, price: number, time: number): SymbolAnalysis {
        if (!this.history[symbol]) {
            this.history[symbol] = [];
        }
        
        // Add new digit
        this.history[symbol].unshift(digit);
        
        // Keep only required history (e.g., last 1000)
        if (this.history[symbol].length > 1000) {
            this.history[symbol].pop();
        }

        return this.analyzeSymbol(symbol);
    }

    private analyzeSymbol(symbol: string): SymbolAnalysis {
        const history = this.history[symbol];
        const recentHistory = history.slice(0, 20); // For exhaustion
        const lastDigit = history[0];

        // 1. Calculate Distribution (Last 100)
        const distribution: Record<number, number> = {};
        const statsHistory = history.slice(0, 100);
        statsHistory.forEach(d => distribution[d] = (distribution[d] || 0) + 1);

        // 2. Exhaustion (appearing > 5 times in last 20 ticks)
        const exhaustion: number[] = [];
        const recentCounts: Record<number, number> = {};
        recentHistory.forEach(d => recentCounts[d] = (recentCounts[d] || 0) + 1);
        
        for (let i = 0; i <= 9; i++) {
            if ((recentCounts[i] || 0) >= this.config.exhaustionThreshold) {
                exhaustion.push(i);
            }
        }

        // 3. Absence (> 15 ticks)
        const absence: number[] = [];
        for (let i = 0; i <= 9; i++) {
            const lastIndex = history.indexOf(i);
            if (lastIndex === -1 || lastIndex >= this.config.absenceThreshold) {
                absence.push(i);
            }
        }

        // 4. Trends (Simple moving average direction or recent comparison)
        const trends = {
            direction: history.length >= 5 && history[0] > history[4] ? 'up' : 'down',
            strength: 50 // Placeholder
        };

        // 5. Probabilities (Conditional) - Simplified
        // Basic probability based on distribution
        const probabilities: Record<number, number> = {};
        for (let i = 0; i <= 9; i++) {
            probabilities[i] = ((distribution[i] || 0) / statsHistory.length) * 100;
        }

        // Market Quality Score
        const marketQuality: MarketQuality = {
            quality_score: 80, // Dynamic calculation needed
            reasons: [],
            should_trade: true,
            trend_direction: trends.direction,
            volatility_symbol: symbol
        };

        return {
            timestamp: new Date().toISOString(),
            distribution,
            exhaustion,
            absence,
            trends,
            sequences: [],
            probabilities,
            market_quality: marketQuality,
            current_digit: lastDigit
        };
    }

    public generateSignals(analyses: Record<string, SymbolAnalysis>): TradingSignal[] {
        const signals: TradingSignal[] = [];

        for (const [symbol, analysis] of Object.entries(analyses)) {
            // Check Specific Operations
            const { specificOperations, minConfidence } = this.config;

            // OVER Specific
            if (specificOperations.over.enabled) {
                specificOperations.over.digits.forEach(targetDigit => {
                    // Strategy: If digits <= targetDigit are exhausted, suggests next > targetDigit
                    // Or if digits > targetDigit are absent?
                    // GUIA.MD says: "Se você selecionar 2 -> o bot vai operar quando detectar que o próximo dígito será > 3"
                    // Case Real: "Dígitos 0, 1, 2 estão exaustos (apareceram muito) -> Sugestão: Over 2"
                    
                    const lowerDigits = Array.from({length: targetDigit + 1}, (_, i) => i);
                    const exhaustedLowers = lowerDigits.filter(d => analysis.exhaustion.includes(d));
                    
                    if (exhaustedLowers.length >= 2) { // Heuristic: at least 2 lower digits are exhausted
                         signals.push({
                            strategy: 'OVER_SPECIFIC',
                            type: 'DIGITOVER', // Over
                            confidence: 80, // Dynamic
                            reasons: [`Dígitos ${exhaustedLowers.join(', ')} estão exaustos`],
                            assertiveness: 'High',
                            expected_profit: 0.95, // Approx for Over
                            symbol,
                            timestamp: new Date().toISOString(),
                            barrier: targetDigit
                         });
                    }
                });
            }

            // UNDER Specific
            if (specificOperations.under.enabled) {
                 specificOperations.under.digits.forEach(targetDigit => {
                    // Case Real: "Dígitos 7, 8, 9 estão exaustos -> Sugestão: Under 7"
                    const upperDigits = Array.from({length: 10 - targetDigit}, (_, i) => i + targetDigit);
                    const exhaustedUppers = upperDigits.filter(d => analysis.exhaustion.includes(d));

                    if (exhaustedUppers.length >= 2) {
                        signals.push({
                            strategy: 'UNDER_SPECIFIC',
                            type: 'DIGITUNDER', // Under
                            confidence: 80,
                            reasons: [`Dígitos ${exhaustedUppers.join(', ')} estão exaustos`],
                            assertiveness: 'High',
                            expected_profit: 0.95,
                            symbol,
                            timestamp: new Date().toISOString(),
                            barrier: targetDigit
                        });
                    }
                 });
            }

            // MATCHES Specific
            if (specificOperations.matches.enabled) {
                const targetDigit = specificOperations.matches.digit;
                // Case Real: "Dígito 5 ausente há 18 ticks -> Sugestão: Matches 5"
                if (analysis.absence.includes(targetDigit)) {
                    signals.push({
                        strategy: 'MATCH_SPECIFIC',
                        type: 'DIGITMATCH',
                        confidence: 75,
                        reasons: [`Dígito ${targetDigit} ausente há muito tempo`],
                        assertiveness: 'Medium',
                        expected_profit: 8.0, // Matches payout is high
                        symbol,
                        timestamp: new Date().toISOString(),
                        barrier: targetDigit
                    });
                }
            }

            // DIFFERS Custom
            if (specificOperations.differs.enabled) {
                specificOperations.differs.digits.forEach(targetDigit => {
                    // Case Real: "Dígito 1 está exausto -> Sugestão: Differs 1"
                    if (analysis.exhaustion.includes(targetDigit)) {
                        signals.push({
                            strategy: 'DIFFER_SPECIFIC',
                            type: 'DIGITDIFF',
                            confidence: 90,
                            reasons: [`Dígito ${targetDigit} está exausto`],
                            assertiveness: 'Very High',
                            expected_profit: 0.09, // Differs payout is low
                            symbol,
                            timestamp: new Date().toISOString(),
                            barrier: targetDigit
                        });
                    }
                });
            }
        }

        // Filter by confidence
        return signals.filter(s => s.confidence >= this.config.minConfidence);
    }
}
