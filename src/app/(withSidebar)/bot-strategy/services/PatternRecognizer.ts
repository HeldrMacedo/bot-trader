import { MarketDataService } from './MarketDataService';

export interface PatternAnalysisResult {
    matches: boolean;
    analysis?: {
        pattern?: string;
        digits?: number[];
        patternStructure?: any;
        matchDetails?: any;
        error?: string;
    };
}

export class PatternRecognizer {
    private marketData: MarketDataService;

    constructor() {
        this.marketData = MarketDataService.getInstance();
    }

    public processDigitPatternRule(rule: any, currentSymbol: string): PatternAnalysisResult {
        try {
            const params = rule.parameters || rule;
            if (!params || !params.pattern) {
                return { matches: false, analysis: { error: 'Pattern not specified' } };
            }

            const pattern = params.pattern.toUpperCase();
            const patternLength = pattern.length;
            
            // Get digits from MarketData
            const digits = this.marketData.getLastNDigits(currentSymbol, patternLength + 10); // Get a bit more context
            
            if (digits.length < patternLength) {
                return { matches: false, analysis: { error: 'Insufficient data' } };
            }

            return this.analyzeDigitPattern(pattern, digits, rule);

        } catch (error: any) {
            console.error('Error processing digit pattern:', error);
            return { matches: false, analysis: { error: error.message } };
        }
    }

    private analyzeDigitPattern(pattern: string, allDigits: number[], rule: any): PatternAnalysisResult {
        const patternLength = pattern.length;
        const digits = allDigits.slice(-patternLength);

        const patternAnalysis = this.analyzePatternStructure(pattern);
        const result = this.verifyPatternMatch(pattern, digits, patternAnalysis, rule);

        return {
            matches: result.isMatch,
            analysis: {
                pattern: pattern,
                digits: digits,
                patternStructure: patternAnalysis,
                matchDetails: result.details
            }
        };
    }

    private analyzePatternStructure(pattern: string) {
        const chars = pattern.split('');
        const xCount = chars.filter(c => c === 'X').length;
        const oCount = chars.filter(c => c === 'O').length;

        return {
            totalLength: pattern.length,
            xPositions: chars.map((c, i) => c === 'X' ? i : -1).filter(i => i >= 0),
            oPositions: chars.map((c, i) => c === 'O' ? i : -1).filter(i => i >= 0),
            xCount: xCount,
            oCount: oCount,
            originalPattern: pattern
        };
    }

    private verifyPatternMatch(pattern: string, digits: number[], patternStructure: any, rule: any): { isMatch: boolean, details: any } {
        // Determine prediction digit (from rule or default)
        const predictionDigit = rule.prediction !== undefined ? Number(rule.prediction) : null;
        
        if (predictionDigit === null) {
            // Some patterns might not need explicit prediction if they imply it
            // But based on original code, it seems critical for losing digits logic
             return {
                isMatch: false,
                details: { message: 'Prediction digit required for pattern matching' }
            };
        }

        const contractType = rule.action || 'DIGITDIFF'; // Default or from rule
        const losingDigits = this.getLosingDigits(predictionDigit, contractType);

        if (losingDigits.length === 0) {
            return { isMatch: false, details: { message: 'Could not determine losing digits' } };
        }

        return this.testLosingDigitsAsX(pattern, digits, losingDigits, patternStructure);
    }

    private getLosingDigits(predictionDigit: number, contractType: string): number[] {
        switch (contractType.toUpperCase()) {
            case 'DIGITDIFF': return [predictionDigit];
            case 'DIGITMATCH': 
                return [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].filter(d => d !== predictionDigit);
            case 'DIGITOVER':
                return Array.from({length: 10}, (_, i) => i).filter(d => d <= predictionDigit);
            case 'DIGITUNDER':
                return Array.from({length: 10}, (_, i) => i).filter(d => d >= predictionDigit);
            case 'DIGITEVEN': return [1, 3, 5, 7, 9];
            case 'DIGITODD': return [0, 2, 4, 6, 8];
            default: return [predictionDigit]; // Default fallback
        }
    }

    private testLosingDigitsAsX(pattern: string, digits: number[], losingDigits: number[], patternStructure: any): { isMatch: boolean, details: any } {
        // "X" represents a LOSING DIGIT (bad outcome)
        // "O" represents a WINNING DIGIT (good outcome)
        // We need to check if the current sequence of digits matches this structure
        // where X positions match losing digits and O positions match winning digits (non-losing)

        let isMatch = true;
        const details: any = { checks: [] };

        for (let i = 0; i < digits.length; i++) {
            const digit = digits[i];
            const patternChar = pattern[i];
            
            const isLosing = losingDigits.includes(digit);
            
            let charMatch = false;
            if (patternChar === 'X') {
                // X must be a losing digit
                charMatch = isLosing;
            } else if (patternChar === 'O') {
                // O must be a winning digit (NOT losing)
                charMatch = !isLosing;
            }

            details.checks.push({
                position: i,
                digit: digit,
                patternChar: patternChar,
                isLosing: isLosing,
                match: charMatch
            });

            if (!charMatch) {
                isMatch = false;
                break;
            }
        }

        return { isMatch, details };
    }
}
