/**
 * Statistical Analysis Module
 * Performs advanced analysis on tick data to identify patterns and probabilities
 */

import { Counter, arraysEqual } from './utils';

export interface DigitDistribution {
  mean: number;
  std: number;
  variance: number;
  skewness: number;
  kurtosis: number;
  frequencies: Record<number, number>;
  percentages: Record<number, number>;
  totalCount: number;
}

export interface ExhaustionResult {
  digit: number;
  count: number;
  percentage: number;
  type: string;
}

export interface AbsenceResult {
  digit: number;
  ticksSince: number;
  type: string;
}

export interface TrendResult {
  trend: string;
  direction: number;
  strength: number;
  currentMean: number;
}

export interface SequenceResult {
  sequence: number[];
  length: number;
  repetitions: number;
  position: number;
  type: string;
}

export interface ProbabilityResult {
  under5Prob: number;
  over4Prob: number;
  under7Prob: number;
  over2Prob: number;
  digitProbs: Record<number, number>;
  evenProb: number;
  oddProb: number;
  uniformityTest: boolean;
  totalSamples: number;
}

export interface MarketQualityResult {
  qualityScore: number;
  reasons: string[];
  shouldTrade: boolean;
  trendDirection: string;
  volatilitySymbol: string;
}

export interface TradingSignal {
  strategy: string;
  type: string;
  confidence: number;
  reasons: string[];
  assertiveness: string;
  expectedProfit: number;
}

export interface Config {
  exhaustionThreshold?: number;
  absenceThreshold?: number;
  minSignalStrength?: number;
  over2Enabled?: boolean;
  under7Enabled?: boolean;
  differsEnabled?: boolean;
  minConfidence?: number;
  maxHistorySize?: number;
}

export class StatisticalAnalyzer {
  private digitFrequencies: Record<number, number> = {};
  private patterns: Record<string, any> = {};
  private trends: Record<string, any> = {};

  analyzeDigitDistribution(digits: number[]): DigitDistribution {
    if (!digits || digits.length === 0) {
      return {
        mean: 0,
        std: 0,
        variance: 0,
        skewness: 0,
        kurtosis: 0,
        frequencies: {},
        percentages: {},
        totalCount: 0
      };
    }

    // Count frequencies
    const counter = Counter(digits);
    const total = digits.length;

    // Calculate percentages
    const percentages: Record<number, number> = {};
    Object.entries(counter).forEach(([digit, count]) => {
      percentages[parseInt(digit)] = (count / total) * 100;
    });

    // Calculate basic statistics
    const mean = digits.reduce((sum, digit) => sum + digit, 0) / total;
    const deviations = digits.map(digit => digit - mean);
    const squaredDeviations = deviations.map(dev => dev * dev);
    const variance = squaredDeviations.reduce((sum, val) => sum + val, 0) / total;
    const std = Math.sqrt(variance);

    // Calculate skewness (simplified)
    let skewness = 0;
    if (digits.length > 2) {
      const cubedDeviations = deviations.map(dev => dev * dev * dev);
      const sumCubedDeviations = cubedDeviations.reduce((sum, val) => sum + val, 0) / total;
      skewness = sumCubedDeviations / Math.pow(std, 3);
    }

    // Calculate kurtosis (simplified)
    let kurtosis = 0;
    if (digits.length > 3) {
      const fourthDeviations = deviations.map(dev => Math.pow(dev, 4));
      const sumFourthDeviations = fourthDeviations.reduce((sum, val) => sum + val, 0) / total;
      kurtosis = (sumFourthDeviations / Math.pow(variance, 2)) - 3;
    }

    return {
      mean,
      std,
      variance,
      skewness,
      kurtosis,
      frequencies: counter,
      percentages,
      totalCount: total
    };
  }

  detectExhaustion(digits: number[], threshold: number = 5, window: number = 20): ExhaustionResult[] {
    if (digits.length < window) {
      return [];
    }

    const recentDigits = digits.slice(-window);
    const counter = Counter(recentDigits);

    const exhausted: ExhaustionResult[] = [];
    Object.entries(counter).forEach(([digit, count]) => {
      if (count >= threshold) {
        exhausted.push({
          digit: parseInt(digit),
          count,
          percentage: (count / window) * 100,
          type: 'exhausted'
        });
      }
    });

    return exhausted;
  }

  detectAbsence(digits: number[], absenceThreshold: number = 15, window: number = 30): AbsenceResult[] {
    if (digits.length < window) {
      return [];
    }

    const recentDigits = digits.slice(-window);
    const absent: AbsenceResult[] = [];

    for (let digit = 0; digit <= 9; digit++) {
      if (!recentDigits.includes(digit)) {
        // Find how long ago it appeared
        let ticksSince = 0;
        for (let i = digits.length - 1; i >= 0; i--) {
          if (digits[i] === digit) {
            ticksSince = digits.length - 1 - i;
            break;
          }
        }

        if (ticksSince >= absenceThreshold) {
          absent.push({
            digit,
            ticksSince,
            type: 'absent'
          });
        }
      }
    }

    return absent;
  }

  detectTrends(digits: number[]): TrendResult {
    if (digits.length < 10) {
      return { trend: 'insufficient_data', direction: 0, strength: 0, currentMean: 0 };
    }

    // Calculate rolling mean (simplified)
    const rollingMean: number[] = [];
    for (let i = 4; i < digits.length; i++) {
      const slice = digits.slice(i - 4, i + 1);
      const mean = slice.reduce((sum, val) => sum + val, 0) / slice.length;
      rollingMean.push(mean);
    }

    // Determine trend direction
    let recentChange = 0;
    if (rollingMean.length >= 3) {
      recentChange = rollingMean[rollingMean.length - 1] - rollingMean[rollingMean.length - 3];
    }

    // Calculate trend strength
    let strength = 0;
    if (rollingMean.length >= 5) {
      const recentChanges = [];
      for (let i = 1; i < rollingMean.length; i++) {
        recentChanges.push(rollingMean[i] - rollingMean[i - 1]);
      }
      
      const lastFiveChanges = recentChanges.slice(-5);
      const positiveChanges = lastFiveChanges.filter(c => c > 0).length;
      const negativeChanges = lastFiveChanges.filter(c => c < 0).length;
      strength = Math.abs(positiveChanges - negativeChanges) / lastFiveChanges.length;
    }

    const trendDirection = recentChange > 0.1 ? 'alta' : recentChange < -0.1 ? 'baixa' : 'estável';

    return {
      trend: trendDirection,
      direction: recentChange,
      strength,
      currentMean: rollingMean.length > 0 ? rollingMean[rollingMean.length - 1] : 0
    };
  }

  findSequences(digits: number[]): SequenceResult[] {
    if (digits.length < 6) {
      return [];
    }

    const sequences: SequenceResult[] = [];

    // Look for 2-digit and 3-digit sequences
    for (const seqLen of [2, 3]) {
      if (digits.length < seqLen * 2) {
        continue;
      }

      for (let i = 0; i <= digits.length - seqLen * 2; i++) {
        const sequence = digits.slice(i, i + seqLen);
        
        // Count how many times this sequence appears
        let count = 0;
        for (let j = i + seqLen; j <= digits.length - seqLen; j += seqLen) {
          const nextSequence = digits.slice(j, j + seqLen);
          if (arraysEqual(sequence, nextSequence)) {
            count++;
          } else {
            break;
          }
        }

        if (count > 0) {
          sequences.push({
            sequence,
            length: seqLen,
            repetitions: count,
            position: i,
            type: `${seqLen}_digit_sequence`
          });
        }
      }
    }

    return sequences;
  }

  calculateProbabilities(digits: number[], predictionWindow: number = 5): ProbabilityResult {
    if (digits.length < 10) {
      return {
        under5Prob: 0,
        over4Prob: 0,
        under7Prob: 0,
        over2Prob: 0,
        digitProbs: {},
        evenProb: 0,
        oddProb: 0,
        uniformityTest: true,
        totalSamples: 0
      };
    }

    // Calculate base probabilities
    const counter = Counter(digits);
    const total = digits.length;

    // Under/Over probabilities
    const under5 = (digits.filter(d => d < 5).length) / total;
    const over4 = (digits.filter(d => d > 4).length) / total;
    const under7 = (digits.filter(d => d < 7).length) / total;
    const over2 = (digits.filter(d => d > 2).length) / total;

    // Match/Not match probabilities
    const digitProbs: Record<number, number> = {};
    for (let d = 0; d <= 9; d++) {
      digitProbs[d] = (counter[d] || 0) / total;
    }

    // Even/Odd probabilities
    const evenCount = digits.filter(d => d % 2 === 0).length;
    const oddCount = digits.filter(d => d % 2 === 1).length;
    const evenProb = evenCount / total;
    const oddProb = oddCount / total;

    // Calculate expected frequencies for statistical tests
    const expectedFreq = total / 10; // Expected if uniform distribution

    // Chi-square test for uniformity (simplified)
    let chiSquare = 0;
    for (let d = 0; d <= 9; d++) {
      const observed = counter[d] || 0;
      chiSquare += Math.pow(observed - expectedFreq, 2) / expectedFreq;
    }

    return {
      under5Prob: under5,
      over4Prob: over4,
      under7Prob: under7,
      over2Prob: over2,
      digitProbs,
      evenProb,
      oddProb,
      uniformityTest: chiSquare < 15, // If chi-square is low, distribution is more uniform
      totalSamples: total
    };
  }

  analyzeMarketQuality(digits: number[], volatilitySymbol: string): MarketQualityResult {
    if (digits.length < 20) {
      return { 
        qualityScore: 0, 
        reasons: ['insufficient_data'], 
        shouldTrade: false,
        trendDirection: 'insufficient_data',
        volatilitySymbol
      };
    }

    let score = 0;
    const reasons: string[] = [];

    // Check for patterns
    const exhaustion = this.detectExhaustion(digits);
    const absence = this.detectAbsence(digits);

    if (exhaustion.length >= 2) {
      score += 25;
      reasons.push(`${exhaustion.length} dígitos exaustos detectados`);
    } else if (exhaustion.length >= 1) {
      score += 15;
      reasons.push(`${exhaustion.length} dígito exausto detectado`);
    }

    if (absence.length >= 2) {
      score += 20;
      reasons.push(`${absence.length} dígitos ausentes detectados`);
    } else if (absence.length >= 1) {
      score += 10;
      reasons.push(`${absence.length} dígito ausente detectado`);
    }

    // Check distribution uniformity
    const probs = this.calculateProbabilities(digits);
    if (!probs.uniformityTest) {
      score += 15;
      reasons.push('Distribuição mostra viés');
    } else {
      score -= 10;
      reasons.push('Distribuição parece uniforme (menos previsível)');
    }

    // Check trend stability
    const trend = this.detectTrends(digits);
    if (Math.abs(trend.direction) > 0.5) {
      score += 10;
      reasons.push('Tendência forte detectada');
    } else if (trend.strength > 0.7) {
      score += 5;
      reasons.push('Direção de tendência consistente');
    }

    // Cap the score
    score = Math.max(0, Math.min(100, score));

    return {
      qualityScore: score,
      reasons,
      shouldTrade: score >= 50,
      trendDirection: trend.trend,
      volatilitySymbol
    };
  }

  generateTradingSignals(digits: number[], config: Config): TradingSignal[] {
    const signals: TradingSignal[] = [];

    if (digits.length < 20) {
      return signals;
    }

    // Get analysis results
    const exhaustion = this.detectExhaustion(digits, config.exhaustionThreshold || 5);
    const absence = this.detectAbsence(digits, config.absenceThreshold || 15);
    const probs = this.calculateProbabilities(digits);
    const trend = this.detectTrends(digits);

    // Generate Over 2 signals
    if (config.over2Enabled !== false) {
      let over2Score = 0;
      const over2Reasons: string[] = [];

      exhaustion.forEach(exh => {
        if (exh.digit <= 2) {
          over2Score += exh.count * 3;
          over2Reasons.push(`Dígito ${exh.digit} exausto (${exh.count} vezes)`);
        }
      });

      if (over2Score >= (config.minSignalStrength || 10)) {
        signals.push({
          strategy: 'over2',
          type: 'OVER 2',
          confidence: Math.min(100, over2Score * 2),
          reasons: over2Reasons,
          assertiveness: over2Score >= 15 ? 'HIGH' : 'MEDIUM',
          expectedProfit: probs.over2Prob * 0.95 - (1 - probs.over2Prob)
        });
      }
    }

    // Generate Under 7 signals
    if (config.under7Enabled !== false) {
      let under7Score = 0;
      const under7Reasons: string[] = [];

      exhaustion.forEach(exh => {
        if (exh.digit >= 7) {
          under7Score += exh.count * 3;
          under7Reasons.push(`Dígito ${exh.digit} exausto (${exh.count} vezes)`);
        }
      });

      absence.forEach(absDigit => {
        if (absDigit.digit <= 6) {
          under7Score += 2;
          under7Reasons.push(`Dígito ${absDigit.digit} ausente por ${absDigit.ticksSince} ticks`);
        }
      });

      if (under7Score >= (config.minSignalStrength || 10)) {
        signals.push({
          strategy: 'under7',
          type: 'UNDER 7',
          confidence: Math.min(100, under7Score * 2),
          reasons: under7Reasons,
          assertiveness: under7Score >= 15 ? 'HIGH' : 'MEDIUM',
          expectedProfit: probs.under7Prob * 0.95 - (1 - probs.under7Prob)
        });
      }
    }

    // Generate Differs signals
    if (config.differsEnabled !== false) {
      if (Object.keys(probs.digitProbs).length > 0) {
        // Find most frequent digit
        let maxFreq = 0;
        let mostFrequentDigit = 0;
        Object.entries(probs.digitProbs).forEach(([digit, prob]) => {
          if (prob > maxFreq) {
            maxFreq = prob;
            mostFrequentDigit = parseInt(digit);
          }
        });

        if (maxFreq > 0.15) { // If appears more than 15% of time
          const differsScore = maxFreq * 50;
          signals.push({
            strategy: 'differs',
            type: `DIFFERS ${mostFrequentDigit}`,
            confidence: Math.min(100, differsScore),
            reasons: [`Dígito ${mostFrequentDigit} aparece ${(maxFreq * 100).toFixed(1)}% do tempo`],
            assertiveness: differsScore >= 75 ? 'HIGH' : 'MEDIUM',
            expectedProfit: (1 - maxFreq) * 0.95 - maxFreq
          });
        }
      }
    }

    // Sort signals by confidence
    signals.sort((a, b) => b.confidence - a.confidence);

    return signals;
  }
}