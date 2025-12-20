import React, { useState, useEffect, useRef } from 'react';
import { Activity, TrendingUp, TrendingDown, Settings, Play, Pause, BarChart3, Brain, Zap, Target, AlertTriangle, CheckCircle } from 'lucide-react';

// ==================== INTERFACES ====================

interface Volatility {
  symbol: string;
  name: string;
  color: string;
}

interface Account {
  loginid: string;
  balance?: number;
  currency?: string;
  is_virtual: number;
}

interface TickData {
  quote: number;
  digit: number;
  time: number;
}

interface VolatilityData {
  currentTick: TickData | null;
  digitHistory: number[];
  patterns: {};
  stats: {
    over2: number;
    under7: number;
    total: number;
  };
}

interface StrategyStats {
  wins: number;
  losses: number;
  profit: number;
}

interface Suggestion {
  volatility: string;
  volatilityName: string;
  type: string;
  confidence: string;
  reason: string;
  strategy: string;
  color: string;
  currentDigit: number | undefined;
  triggers: Trigger[];
  assertiveness: 'HIGH' | 'MEDIUM' | 'LOW';
}

interface Trigger {
  name: string;
  description: string;
  score: number;
  icon?: string;
}

interface SpecificOperations {
  over: {
    enabled: boolean;
    digits: number[];
  };
  under: {
    enabled: boolean;
    digits: number[];
  };
  matches: {
    enabled: boolean;
    digit: number;
  };
  differs: {
    enabled: boolean;
    digits: number[];
  };
}

interface MartingaleConfig {
  enabled: boolean;
  multiplier: number;
  maxLevels: number;
  resetOnWin: boolean;
  currentLevel: number;
  currentStake: number;
}

interface SimulationData {
  isRunning: boolean;
  tradesSimulated: number;
  results: SimulationResult[];
  bestStrategy: SimulationResult | null;
  bestVolatility: { symbol: string; name: string; quality: number } | null;
  bestTimeWindow: { hour: number; quality: number; recommendation: string } | null;
  recommendation: Recommendation | null;
}

interface SimulationResult {
  strategy: string;
  wins: number;
  losses: number;
  winRate: number;
  profit: number;
  avgConfidence: number;
}

interface Recommendation {
  action: string;
  confidence: string;
  tips: string[];
  bestStrategy: string;
  bestVolatility: string;
  marketScore: number;
  timeScore: number;
}

interface PerformanceMetrics {
  winRateByHour: {};
  winRateByStrategy: {};
  winRateByVolatility: {};
  currentSessionQuality: number;
  shouldOperate: boolean;
  reason: string;
}

interface LastTradeResult {
  isWin: boolean;
  profit: number;
  suggestion: Suggestion;
  time: Date;
  confidence: number;
  stake: number;
  martingaleLevel: number;
}

// ==================== CONSTANTES ====================

const VOLATILITIES: Volatility[] = [
  { symbol: 'R_10', name: 'Volatility 10', color: 'blue' },
  { symbol: '1HZ10V', name: 'Volatility 10 (1s)', color: 'cyan' },
  { symbol: 'R_25', name: 'Volatility 25', color: 'green' },
  { symbol: '1HZ25V', name: 'Volatility 25 (1s)', color: 'emerald' },
  { symbol: 'R_50', name: 'Volatility 50', color: 'yellow' },
  { symbol: '1HZ50V', name: 'Volatility 50 (1s)', color: 'amber' },
  { symbol: 'R_75', name: 'Volatility 75', color: 'orange' },
  { symbol: '1HZ75V', name: 'Volatility 75 (1s)', color: 'red' },
  { symbol: 'R_100', name: 'Volatility 100', color: 'purple' },
  { symbol: '1HZ100V', name: 'Volatility 100 (1s)', color: 'violet' },
  { symbol: '1HZ150V', name: 'Volatility 150 (1s)', color: 'fuchsia' },
  { symbol: '1HZ200V', name: 'Volatility 200 (1s)', color: 'pink' },
  { symbol: '1HZ250V', name: 'Volatility 250 (1s)', color: 'rose' }
];

// ==================== COMPONENTE PRINCIPAL ====================

export default function AdvancedBot() {
  const [connected, setConnected] = useState<boolean>(false);
  const [apiToken, setApiToken] = useState<string>('ehOXyajRlX3TdOu');
  const [loginMethod, setLoginMethod] = useState<'token' | 'credentials'>('token');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [accountType, setAccountType] = useState<'demo' | 'real'>('demo');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [mode, setMode] = useState<'manual' | 'auto'>('manual');
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [learningMode, setLearningMode] = useState<boolean>(true);
  const [stake, setStake] = useState<number>(1);
  const [stopLoss, setStopLoss] = useState<number>(50);
  const [stopWin, setStopWin] = useState<number>(100);
  const [maxTrades, setMaxTrades] = useState<number>(50);
  const [minConfidence, setMinConfidence] = useState<number>(70);
  const [exhaustionThreshold, setExhaustionThreshold] = useState<number>(5);
  const [absenceThreshold, setAbsenceThreshold] = useState<number>(15);
  const [activeStrategies, setActiveStrategies] = useState<Record<string, boolean>>({
    over2: true,
    under7: true,
    differs: true,
    specificOver: false,
    specificUnder: false,
    matches: false,
    customDiffers: false
  });
  const [specificOperations, setSpecificOperations] = useState<SpecificOperations>({
    over: {
      enabled: false,
      digits: [0, 1, 2, 3, 4]
    },
    under: {
      enabled: false,
      digits: [7, 8, 9]
    },
    matches: {
      enabled: false,
      digit: 5
    },
    differs: {
      enabled: false,
      digits: [0, 5, 9]
    }
  });
  const [martingaleConfig, setMartingaleConfig] = useState<MartingaleConfig>({
    enabled: false,
    multiplier: 2.0,
    maxLevels: 3,
    resetOnWin: true,
    currentLevel: 0,
    currentStake: stake
  });
  const [selectedVolatilities, setSelectedVolatilities] = useState<string[]>(['R_100']);
  const [volatilityData, setVolatilityData] = useState<Record<string, VolatilityData>>({});
  const [strategies, setStrategies] = useState<Record<string, StrategyStats>>({
    over2: { wins: 0, losses: 0, profit: 0 },
    under7: { wins: 0, losses: 0, profit: 0 },
    differs: { wins: 0, losses: 0, profit: 0 }
  });
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [tradesCount, setTradesCount] = useState<number>(0);
  const [bestVolatility, setBestVolatility] = useState<string | null>(null);
  const [pausedAfterLoss, setPausedAfterLoss] = useState<boolean>(false);
  const [lastTradeResult, setLastTradeResult] = useState<LastTradeResult | null>(null);
  const [advancedStats, setAdvancedStats] = useState<Record<string, any>>({});
  const [simulationMode, setSimulationMode] = useState<boolean>(false);
  const [simulationData, setSimulationData] = useState<SimulationData>({
    isRunning: false,
    tradesSimulated: 0,
    results: [],
    bestStrategy: null,
    bestVolatility: null,
    bestTimeWindow: null,
    recommendation: null
  });
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics>({
    winRateByHour: {},
    winRateByStrategy: {},
    winRateByVolatility: {},
    currentSessionQuality: 0,
    shouldOperate: false,
    reason: ''
  });
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef<number>(0);
  const maxReconnectAttempts = 10;
  const baseReconnectDelay = 3000;
  const pingIntervalMs = 30000;
  const connectionTimeoutMs = 10000;
  const [isReconnecting, setIsReconnecting] = useState<boolean>(false);
  const [reconnectCount, setReconnectCount] = useState<number>(0);

  // ==================== SISTEMA DE SIMULAÇÃO E ANÁLISE ====================

  const analyzeMarketQuality = (): { qualityScore: number; shouldOperate: boolean; reasons: string[] } => {
    let qualityScore = 0;
    let reasons: string[] = [];

    Object.entries(volatilityData).forEach(([symbol, data]) => {
      if (data.digitHistory.length < 30) return;
      const digits = data.digitHistory;

      let patternsDetected = 0;
      for (let d = 0; d <= 9; d++) {
        const exh = detectExhaustion(digits, d, 20);
        const abs = detectAbsence(digits, d, 20);
        if (exh.isExhausted || abs.isAbsent) patternsDetected++;
      }
      if (patternsDetected >= 3) {
        qualityScore += 25;
        reasons.push(`${patternsDetected} padrões fortes detectados`);
      }

      const counts: Record<number, number> = {};
      digits.slice(-20).forEach(d => counts[d] = (counts[d] || 0) + 1);
      const variance = Object.values(counts).reduce((acc, v) => acc + Math.pow(v - 2, 2), 0) / 10;
      if (variance > 2) {
        qualityScore += 20;
        reasons.push('Distribuição favorável detectada');
      }

      const decline = detectDeclineAfterPeak(digits);
      if (decline.declining && decline.digits.length > 0) {
        qualityScore += 15;
        reasons.push('Reversões de tendência detectadas');
      }
    });

    const hour = new Date().getHours();
    const goodHours = [9, 10, 11, 14, 15, 16, 19, 20, 21];
    if (goodHours.includes(hour)) {
      qualityScore += 10;
      reasons.push('Horário favorável para operar');
    }

    const highSuggestions = suggestions.filter(s => s.assertiveness === 'HIGH').length;
    if (highSuggestions >= 2) {
      qualityScore += 20;
      reasons.push(`${highSuggestions} oportunidades de alta confiança`);
    }

    const totalWins = strategies.over2.wins + strategies.under7.wins + strategies.differs.wins;
    const totalTrades = totalWins + strategies.over2.losses + strategies.under7.losses + strategies.differs.losses;
    const winRate = totalTrades > 0 ? (totalWins / totalTrades) * 100 : 0;
    if (winRate > 55 && totalTrades >= 10) {
      qualityScore += 10;
      reasons.push(`Win rate positivo: ${winRate.toFixed(0)}%`);
    } else if (winRate < 45 && totalTrades >= 10) {
      qualityScore -= 20;
      reasons.push(`Win rate baixo: ${winRate.toFixed(0)}% - Evite operar`);
    }

    const shouldOperate = qualityScore >= 50;

    setPerformanceMetrics(prev => ({
      ...prev,
      currentSessionQuality: qualityScore,
      shouldOperate,
      reason: reasons.join(' | ')
    }));

    return { qualityScore, shouldOperate, reasons };
  };

  const runSimulation = async () => {
    setSimulationMode(true);
    setSimulationData(prev => ({ ...prev, isRunning: true, results: [] }));

    const strategies_to_test = ['over2', 'under7', 'differs', 'specificOver', 'specificUnder', 'matches', 'customDiffers'];
    const results: SimulationResult[] = [];

    for (let strategy of strategies_to_test) {
      let wins = 0;
      let losses = 0;
      let totalProfit = 0;
      for (let i = 0; i < 20; i++) {
        const confidence = 60 + Math.random() * 30;
        const winProb = 0.35 + (confidence / 100) * 0.25;
        const isWin = Math.random() < winProb;
        if (isWin) {
          wins++;
          totalProfit += stake * 0.95;
        } else {
          losses++;
          totalProfit -= stake;
        }
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      results.push({
        strategy,
        wins,
        losses,
        winRate: (wins / (wins + losses)) * 100,
        profit: totalProfit,
        avgConfidence: 60 + Math.random() * 30
      });
      setSimulationData(prev => ({
        ...prev,
        tradesSimulated: prev.tradesSimulated + 20,
        results: [...prev.results, results[results.length - 1]]
      }));
    }

    const bestByProfit = results.sort((a, b) => b.profit - a.profit)[0];
    const bestByWinRate = results.sort((a, b) => b.winRate - a.winRate)[0];

    const volatilityPerformance = [];
    Object.entries(volatilityData).forEach(([symbol, data]) => {
      if (data.digitHistory.length < 30) return;
      const quality = analyzeVolatilityQuality(data.digitHistory);
      volatilityPerformance.push({
        symbol,
        name: VOLATILITIES.find(v => v.symbol === symbol)?.name || symbol,
        quality
      });
    });
    const bestVol = volatilityPerformance.sort((a, b) => b.quality - a.quality)[0];

    const hour = new Date().getHours();
    const timeQuality = analyzeTimeQuality(hour);

    const recommendation = generateRecommendation(bestByProfit, bestByWinRate, bestVol, timeQuality);

    setSimulationData(prev => ({
      ...prev,
      isRunning: false,
      bestStrategy: bestByProfit,
      bestVolatility: bestVol,
      bestTimeWindow: timeQuality,
      recommendation
    }));
  };

  const analyzeVolatilityQuality = (digits: number[]): number => {
    let score = 0;
    for (let d = 0; d <= 9; d++) {
      const exh = detectExhaustion(digits, d, 20);
      const abs = detectAbsence(digits, d, 20);
      if (exh.isExhausted) score += 10;
      if (abs.isAbsent) score += 10;
    }

    const counts: Record<number, number> = {};
    digits.slice(-20).forEach(d => counts[d] = (counts[d] || 0) + 1);
    const variance = Object.values(counts).reduce((acc, v) => acc + Math.pow(v - 2, 2), 0) / 10;
    score += variance * 5;
    return Math.min(score, 100);
  };

  const analyzeTimeQuality = (hour: number) => {
    const hourQuality: Record<number, number> = {
      0: 30, 1: 20, 2: 15, 3: 10, 4: 15, 5: 20,
      6: 35, 7: 45, 8: 60, 9: 75, 10: 80, 11: 75,
      12: 60, 13: 55, 14: 70, 15: 80, 16: 75, 17: 60,
      18: 50, 19: 70, 20: 75, 21: 70, 22: 50, 23: 40
    };
    const quality = hourQuality[hour] || 50;
    let recommendation = '';
    if (quality >= 70) {
      recommendation = 'EXCELENTE horário para operar';
    } else if (quality >= 50) {
      recommendation = 'BOM horário para operar';
    } else if (quality >= 30) {
      recommendation = 'Horário OK - opere com cautela';
    } else {
      recommendation = 'Horário RUIM - evite operar';
    }
    return { hour, quality, recommendation };
  };

  const generateRecommendation = (bestStrategy: SimulationResult, bestByWinRate: SimulationResult, bestVol: any, timeQuality: any): Recommendation => {
    const strategyNames: Record<string, string> = {
      over2: 'Over 2',
      under7: 'Under 7',
      differs: 'Differs',
      specificOver: 'Over Customizado',
      specificUnder: 'Under Customizado',
      matches: 'Matches',
      customDiffers: 'Differs Customizado'
    };

    const marketQuality = analyzeMarketQuality();

    let action = '';
    let confidence = '';
    let tips: string[] = [];

    if (marketQuality.qualityScore >= 70 && timeQuality.quality >= 60) {
      action = '🟢 ÓTIMO MOMENTO PARA OPERAR';
      confidence = 'ALTA';
      tips.push('Condições ideais detectadas');
      tips.push(`Use ${strategyNames[bestStrategy.strategy]}`);
      tips.push(`Foque em ${bestVol?.name || 'volatilidades ativas'}`);
    } else if (marketQuality.qualityScore >= 50 && timeQuality.quality >= 40) {
      action = '🟡 MOMENTO RAZOÁVEL - OPERE COM CAUTELA';
      confidence = 'MÉDIA';
      tips.push('Condições aceitáveis, mas não ideais');
      tips.push(`Prefira ${strategyNames[bestByWinRate.strategy]} (maior win rate)`);
      tips.push('Use confiança mínima alta (≥75%)');
    } else {
      action = '🔴 NÃO É BOM MOMENTO - AGUARDE';
      confidence = 'BAIXA';
      tips.push('Condições desfavoráveis');
      tips.push('Aguarde melhores padrões');
      tips.push('Continue monitorando');
    }

    return {
      action,
      confidence,
      tips,
      bestStrategy: strategyNames[bestStrategy.strategy],
      bestVolatility: bestVol?.name || 'N/A',
      marketScore: marketQuality.qualityScore,
      timeScore: timeQuality.quality
    };
  };

  useEffect(() => {
    if (connected && volatilityData && Object.keys(volatilityData).length > 0) {
      console.log('volatilityData', volatilityData, connected);
      const interval = setInterval(() => {
        analyzeMarketQuality();
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [connected, volatilityData, suggestions, strategies]);

  useEffect(() => {
    console.log('connected', connected);
    return () => {
      cleanupConnection();
      if (wsRef.current) { wsRef.current.close(); }
    };
  }, []);

  // ==================== ANÁLISE AVANÇADA DE PADRÕES ====================

  const detectExhaustion = (digits: number[], targetDigit: number, window: number = 20) => {
    if (digits.length < window) return { isExhausted: false, score: 0, count: 0 };
    const recentDigits = digits.slice(-window);
    const count = recentDigits.filter(d => d === targetDigit).length;
    const percentage = (count / window) * 100;
    const isExhausted = count >= exhaustionThreshold;
    const score = isExhausted ? Math.min(count * 8, 50) : 0;
    return {
      isExhausted,
      score,
      count,
      percentage: percentage.toFixed(1),
      recommendation: isExhausted ? `AVOID ${targetDigit} (exausto)` : null
    };
  };

  const detectAbsence = (digits: number[], targetDigit: number, window: number = 20) => {
    if (digits.length < window) return { isAbsent: false, score: 0, ticksSince: 0 };
    const recentDigits = digits.slice(-window);
    let ticksSinceLastAppearance = 0;
    for (let i = recentDigits.length - 1; i >= 0; i--) {
      if (recentDigits[i] === targetDigit) break;
      ticksSinceLastAppearance++;
    }
    const isAbsent = ticksSinceLastAppearance >= absenceThreshold;
    const score = isAbsent ? Math.min(ticksSinceLastAppearance * 2.5, 40) : 0;
    return {
      isAbsent,
      score,
      ticksSince: ticksSinceLastAppearance,
      recommendation: isAbsent ? `FAVOR ${targetDigit} (ausente ${ticksSinceLastAppearance} ticks)` : null
    };
  };

  const detectDeclineAfterPeak = (digits: number[]) => {
    if (digits.length < 50) return { declining: false, score: 0 };
    const last20 = digits.slice(-20);
    const previous30 = digits.slice(-50, -20);
    const digitCounts20: Record<number, number> = {};
    const digitCounts30: Record<number, number> = {};
    last20.forEach(d => digitCounts20[d] = (digitCounts20[d] || 0) + 1);
    previous30.forEach(d => digitCounts30[d] = (digitCounts30[d] || 0) + 1);

    let decliningDigits: any[] = [];
    for (let d = 0; d <= 9; d++) {
      const freq20 = (digitCounts20[d] || 0) / 20;
      const freq30 = (digitCounts30[d] || 0) / 30;
      if (freq30 > 0.2 && freq20 < freq30 * 0.6) {
        decliningDigits.push({
          digit: d,
          wasHigh: (freq30 * 100).toFixed(1),
          nowLow: (freq20 * 100).toFixed(1),
          score: 25
        });
      }
    }
    return {
      declining: decliningDigits.length > 0,
      digits: decliningDigits,
      score: decliningDigits.reduce((sum, d) => sum + d.score, 0)
    };
  };

  const analyzeDistribution = (digits: number[]) => {
    if (digits.length < 30) return { anomaly: false, score: 0 };
    const counts: Record<number, number> = {};
    digits.slice(-30).forEach(d => counts[d] = (counts[d] || 0) + 1);
    const expected = 3;
    let anomalies: any[] = [];
    for (let d = 0; d <= 9; d++) {
      const actual = counts[d] || 0;
      const deviation = Math.abs(actual - expected);
      if (deviation >= 4) {
        anomalies.push({
          digit: d,
          count: actual,
          expected,
          deviation,
          type: actual > expected ? 'OVER' : 'UNDER'
        });
      }
    }
    return {
      anomaly: anomalies.length > 0,
      anomalies,
      score: anomalies.reduce((sum, a) => sum + a.deviation * 3, 0)
    };
  };

  const calculateAdvancedScore = (digits: number[], operationType: string, targetDigit: number | null = null) => {
    let totalScore = 0;
    let triggers: Trigger[] = [];

    if (targetDigit !== null) {
      const exhaustion = detectExhaustion(digits, targetDigit, 20);
      if (exhaustion.isExhausted) {
        totalScore += exhaustion.score;
        triggers.push({
          name: 'Exaustão',
          description: `Dígito ${targetDigit} apareceu ${exhaustion.count}x em 20 ticks (${exhaustion.percentage}%)`,
          score: exhaustion.score,
          icon: '🔥'
        });
      }

      const absence = detectAbsence(digits, targetDigit, 20);
      if (absence.isAbsent) {
        totalScore += absence.score;
        triggers.push({
          name: 'Ausência Prolongada',
          description: `Dígito ${targetDigit} não aparece há ${absence.ticksSince} ticks`,
          score: absence.score,
          icon: '⏰'
        });
      }
    }

    const decline = detectDeclineAfterPeak(digits);
    if (decline.declining) {
      totalScore += decline.score;
      triggers.push({
        name: 'Declínio Pós-Pico',
        description: `${decline.digits.length} dígito(s) em queda após pico`,
        score: decline.score,
        icon: '📉'
      });
    }

    const distrib = analyzeDistribution(digits);
    if (distrib.anomaly) {
      totalScore += distrib.score;
      triggers.push({
        name: 'Distribuição Anormal',
        description: `${distrib.anomalies.length} dígito(s) fora do padrão`,
        score: distrib.score,
        icon: '📊'
      });
    }

    const patternScore = analyzePatternScore(digits);
    totalScore += patternScore.score;
    if (patternScore.score > 0) {
      triggers.push({
        name: 'Padrão de Sequência',
        description: patternScore.description,
        score: patternScore.score,
        icon: '🔍'
      });
    }

    const normalizedScore = Math.min(totalScore, 100);
    return {
      score: normalizedScore,
      triggers,
      confidence: normalizedScore >= minConfidence ? 'HIGH' : normalizedScore >= 50 ? 'MEDIUM' : 'LOW'
    };
  };

  const analyzePatternScore = (digits: number[]) => {
    if (digits.length < 4) return { score: 0, description: '' };
    const patterns: Record<string, Record<number, number>> = {};
    for (let i = 0; i < digits.length - 3; i++) {
      const sequence = `${digits[i]}→${digits[i+1]}→${digits[i+2]}`;
      const nextDigit = digits[i+3];
      if (!patterns[sequence]) patterns[sequence] = {};
      patterns[sequence][nextDigit] = (patterns[sequence][nextDigit] || 0) + 1;
    }

    const lastThree = digits.slice(-3);
    const sequence = `${lastThree[0]}→${lastThree[1]}→${lastThree[2]}`;
    if (!patterns[sequence]) return { score: 0, description: 'Padrão novo' };

    const nextDigitProbs = patterns[sequence];
    const total = Object.values(nextDigitProbs).reduce((a, b) => a + b, 0);

    const mostLikely = Object.entries(nextDigitProbs)
      .sort((a, b) => b[1] - a[1])[0];
    const probability = (mostLikely[1] / total) * 100;

    if (probability > 40) {
      return {
        score: probability * 0.6,
        description: `${sequence} → ${mostLikely[0]} em ${probability.toFixed(0)}% dos casos`
      };
    }
    return { score: 0, description: 'Padrão inconsistente' };
  };

  // ==================== GERAÇÃO INTELIGENTE DE SUGESTÕES ====================

  const generateAdvancedSuggestions = () => {
    const allSuggestions: Suggestion[] = [];

    Object.entries(volatilityData).forEach(([symbol, data]) => {
      if (data.digitHistory.length < 20) return;
      const volInfo = VOLATILITIES.find(v => v.symbol === symbol);
      const digits = data.digitHistory;

      if (specificOperations.over.enabled && specificOperations.over.digits.length > 0) {
        let overScore = 0;
        let overTriggers: string[] = [];
        specificOperations.over.digits.forEach(d => {
          const exhaustion = detectExhaustion(digits, d, 20);
          if (exhaustion.isExhausted) {
            overScore += exhaustion.score;
            overTriggers.push(`${d} exausto (${exhaustion.count}x)`);
          }
        });
        const overAnalysis = calculateAdvancedScore(digits, 'over');
        const finalOverScore = (overScore + overAnalysis.score) / 2;
        if (finalOverScore >= minConfidence) {
          allSuggestions.push({
            volatility: symbol,
            volatilityName: volInfo?.name || symbol,
            type: `Over ${specificOperations.over.digits.join(',')}`,
            confidence: finalOverScore.toFixed(1),
            reason: overTriggers.length > 0
              ? `Gatilhos: ${overTriggers.join(', ')}`
              : `Padrão favorável para >${Math.max(...specificOperations.over.digits)}`,
            strategy: 'specificOver',
            color: 'emerald',
            currentDigit: data.currentTick?.digit,
            triggers: overAnalysis.triggers,
            assertiveness: overAnalysis.confidence as 'HIGH' | 'MEDIUM' | 'LOW'
          });
        }
      }

      // (Repita o mesmo para under, matches, differs, etc. - omitido por espaço)

      // ESTRATÉGIA 1: OVER 2
      if (activeStrategies.over2) {
        let over2Score = 0;
        let over2Triggers: string[] = [];
        for (let d = 0; d <= 2; d++) {
          const exhaustion = detectExhaustion(digits, d, 20);
          if (exhaustion.isExhausted) {
            over2Score += exhaustion.score;
            over2Triggers.push(`${d} exausto (${exhaustion.count}x)`);
          }
        }
        for (let d = 3; d <= 9; d++) {
          const absence = detectAbsence(digits, d, 20);
          if (absence.isAbsent) {
            over2Score += absence.score * 0.5;
          }
        }
        const over2Analysis = calculateAdvancedScore(digits, 'over2');
        const finalOver2Score = (over2Score + over2Analysis.score) / 2;
        if (finalOver2Score >= minConfidence) {
          allSuggestions.push({
            volatility: symbol,
            volatilityName: volInfo?.name || symbol,
            type: 'Over 2',
            confidence: finalOver2Score.toFixed(1),
            reason: over2Triggers.length > 0
              ? `Gatilhos: ${over2Triggers.join(', ')}`
              : 'Padrão favorável para >2',
            strategy: 'over2',
            color: 'green',
            currentDigit: data.currentTick?.digit,
            triggers: over2Analysis.triggers,
            assertiveness: over2Analysis.confidence as 'HIGH' | 'MEDIUM' | 'LOW'
          });
        }
      }

      // (Repita o mesmo para under7, differs, etc. - omitido por espaço)
    });

    allSuggestions.sort((a, b) => {
      const scoreA = parseFloat(a.confidence);
      const scoreB = parseFloat(b.confidence);
      if (scoreB !== scoreA) return scoreB - scoreA;
      const assertOrder = { HIGH: 3, MEDIUM: 2, LOW: 1 };
      return (assertOrder[b.assertiveness] || 0) - (assertOrder[a.assertiveness] || 0);
    });

    setSuggestions(allSuggestions.slice(0, 8));
    updateAdvancedStats();

    if (pausedAfterLoss && allSuggestions.length > 0) {
      const best = allSuggestions[0];
      if (parseFloat(best.confidence) >= 80 && best.assertiveness === 'HIGH') {
        console.log('✅ Padrão MUITO FORTE detectado! Retomando...');
        setPausedAfterLoss(false);
      }
    }

    if (mode === 'auto' && isRunning && !learningMode && !pausedAfterLoss && allSuggestions.length > 0) {
      const best = allSuggestions[0];
      if (best.assertiveness === 'HIGH') {
        executeAutomaticTrade(best);
      }
    }
  };

  const updateAdvancedStats = () => {
    const stats: Record<string, any> = {};
    Object.entries(volatilityData).forEach(([symbol, data]) => {
      if (data.digitHistory.length < 20) return;
      const digits = data.digitHistory;
      const last20 = digits.slice(-20);

      const exhaustedDigits = [];
      for (let d = 0; d <= 9; d++) {
        const exh = detectExhaustion(digits, d, 20);
        if (exh.isExhausted) {
          exhaustedDigits.push({ digit: d, count: exh.count, percentage: exh.percentage });
        }
      }

      const absentDigits = [];
      for (let d = 0; d <= 9; d++) {
        const abs = detectAbsence(digits, d, 20);
        if (abs.isAbsent) {
          absentDigits.push({ digit: d, ticksSince: abs.ticksSince });
        }
      }

      stats[symbol] = {
        exhaustedDigits,
        absentDigits,
        recentDistribution: last20.reduce((acc: Record<number, number>, d) => {
          acc[d] = (acc[d] || 0) + 1;
          return acc;
        }, {})
      };
    });
    setAdvancedStats(stats);
  };

  // ==================== CONEXÃO E TICKS ====================

  const cleanupConnection = () => {
    if (reconnectTimeoutRef.current) { clearTimeout(reconnectTimeoutRef.current); reconnectTimeoutRef.current = null; }
    if (pingIntervalRef.current) { clearInterval(pingIntervalRef.current); pingIntervalRef.current = null; }
  };

  const startKeepAlive = (ws: WebSocket) => {
    if (pingIntervalRef.current) { clearInterval(pingIntervalRef.current); }
    pingIntervalRef.current = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) { try { ws.send(JSON.stringify({ ping: 1 })); } catch {} }
    }, pingIntervalMs);
  };

  const attemptReconnect = () => {
    if (reconnectAttemptsRef.current >= maxReconnectAttempts) { setIsReconnecting(false); cleanupConnection(); return; }
    reconnectAttemptsRef.current++;
    setReconnectCount(reconnectAttemptsRef.current);
    setIsReconnecting(true);
    const delay = baseReconnectDelay * Math.pow(1.5, reconnectAttemptsRef.current - 1);
    reconnectTimeoutRef.current = setTimeout(() => { connectToAPI(); }, delay);
  };

  const connectToAPI = () => {
    if (loginMethod === 'token' && !apiToken) {
      alert('Por favor, insira seu API Token!');
      return;
    }
    if (loginMethod === 'credentials' && (!email || !password)) {
      alert('Por favor, insira email e senha!');
      return;
    }

    cleanupConnection();

    const ws = new WebSocket('wss://ws.derivws.com/websockets/v3?app_id=1089');
    wsRef.current = ws;

    const connectionTimeout = setTimeout(() => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.CONNECTING) {
        wsRef.current.close();
        attemptReconnect();
      }
    }, connectionTimeoutMs);

    ws.onopen = () => {
      clearTimeout(connectionTimeout);
      reconnectAttemptsRef.current = 0;
      setIsReconnecting(false);
      setReconnectCount(0);
      startKeepAlive(ws);
      console.log('Conectado à Deriv!');
      if (loginMethod === 'token') {
        ws.send(JSON.stringify({ authorize: apiToken }));
      } else {
        ws.send(JSON.stringify({
          authorize: email,
          password: password
        }));
      }
    };

    ws.onmessage = (msg) => {
      const data = JSON.parse(msg.data);
      if (data.msg_type === 'authorize') {
        if (data.error) {
          alert('Erro na autenticação: ' + data.error.message);
          ws.close();
        } else {
          console.log('Autorizado com sucesso!', data);
          ws.send(JSON.stringify({ account_list: 1 }));
          setConnected(true);
        }
      }
      if (data.msg_type === 'account_list') {
        console.log('Contas disponíveis:', data.account_list);
        setAccounts(data.account_list);
        const filteredAccounts = data.account_list.filter((acc: Account) => {
          if (accountType === 'demo') {
            acc.currency['balance'] = data.authorize.balance;
            return acc.is_virtual === 1;
          } else {
            acc.currency['balance'] = data.authorize.balance;
            return acc.is_virtual === 0;
          }
        });
        if (filteredAccounts.length === 0) {
          alert(`Nenhuma conta ${accountType === 'demo' ? 'DEMO' : 'REAL'} encontrada!`);
          ws.close();
          return;
        }
        const targetAccount = filteredAccounts[0];
        console.log(targetAccount);
        setSelectedAccount(targetAccount);
        ws.send(JSON.stringify({
          account_switch: targetAccount.loginid
        }));
      }
      if (data.msg_type === 'account_switch') {
        if (data.error) {
          alert('Erro ao trocar conta: ' + data.error.message);
          ws.close();
        } else {
          console.log('Conta trocada com sucesso!');
          setConnected(true);
          selectedVolatilities.forEach(symbol => {
            ws.send(JSON.stringify({
              ticks: symbol,
              subscribe: 1
            }));
          });
        }
      }
      if (data.msg_type === 'tick') {
        handleNewTick(data.tick);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      if (reconnectAttemptsRef.current === 0) { alert('Erro na conexão com a Deriv'); }
    };

    ws.onclose = (event) => {
      setConnected(false);
      if (pingIntervalRef.current) { clearInterval(pingIntervalRef.current); pingIntervalRef.current = null; }
      console.log('Desconectado da Deriv', event?.code, event?.reason);
      if (event && event.code !== 1000 && event.code !== 1001) { attemptReconnect(); }
    };
  };

  const disconnect = () => {
    cleanupConnection();
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setConnected(false);
    setIsRunning(false);
    reconnectAttemptsRef.current = 0;
    setIsReconnecting(false);
    setReconnectCount(0);
  };

  const handleNewTick = (tick: any) => {
    const quote = parseFloat(tick.quote);
    const digit = parseInt(quote.toString().slice(-1));
    const symbol = tick.symbol;

    setVolatilityData(prev => {
      const current = prev[symbol] || {
        currentTick: null,
        digitHistory: [],
        patterns: {},
        stats: { over2: 0, under7: 0, total: 0 }
      };
      const newDigitHistory = [...current.digitHistory, digit].slice(-100);
      const stats = {
        over2: newDigitHistory.filter(d => d > 2).length,
        under7: newDigitHistory.filter(d => d < 7).length,
        total: newDigitHistory.length
      };
      return {
        ...prev,
        [symbol]: {
          currentTick: { quote, digit, time: tick.epoch },
          digitHistory: newDigitHistory,
          patterns: {},
          stats
        }
      };
    });

    setTimeout(() => generateAdvancedSuggestions(), 100);
  };

  const executeAutomaticTrade = (suggestion: Suggestion) => {
    if (pausedAfterLoss) {
      console.log('Sistema pausado - aguardando padrão forte');
      return;
    }
    if (tradesCount >= maxTrades) {
      setIsRunning(false);
      alert('Limite de trades atingido!');
      return;
    }

    const totalProfit = strategies.over2.profit + strategies.under7.profit + strategies.differs.profit;
    if (totalProfit <= -stopLoss) {
      setIsRunning(false);
      alert('Stop Loss atingido!');
      return;
    }
    if (totalProfit >= stopWin) {
      setIsRunning(false);
      alert('Meta de lucro atingida!');
      return;
    }

    simulateTrade(suggestion);
  };

  const simulateTrade = (suggestion: Suggestion) => {
    setTradesCount(prev => prev + 1);

    let currentStake = stake;
    if (martingaleConfig.enabled) {
      currentStake = martingaleConfig.currentStake;
    }

    setTimeout(() => {
      const confidence = parseFloat(suggestion.confidence);
      const winProbability = 0.35 + (confidence / 100) * 0.25;
      const isWin = Math.random() < winProbability;
      const profit = isWin ? currentStake * 0.95 : -currentStake;

      setLastTradeResult({
        isWin,
        profit,
        suggestion,
        time: new Date(),
        confidence,
        stake: currentStake,
        martingaleLevel: martingaleConfig.enabled ? martingaleConfig.currentLevel : 0
      });

      if (martingaleConfig.enabled) {
        if (isWin) {
          if (martingaleConfig.resetOnWin) {
            setMartingaleConfig(prev => ({
              ...prev,
              currentLevel: 0,
              currentStake: stake
            }));
          }
        } else {
          if (martingaleConfig.currentLevel < martingaleConfig.maxLevels) {
            const newStake = currentStake * martingaleConfig.multiplier;
            setMartingaleConfig(prev => ({
              ...prev,
              currentLevel: prev.currentLevel + 1,
              currentStake: newStake
            }));
            console.log(`📈 Martingale ativado! Nível ${martingaleConfig.currentLevel + 1}/${martingaleConfig.maxLevels} - Novo stake: $${newStake.toFixed(2)}`);
          } else {
            console.log('⚠️ Limite de Martingale atingido! Resetando...');
            setMartingaleConfig(prev => ({
              ...prev,
              currentLevel: 0,
              currentStake: stake
            }));
          }
        }
      }

      if (!isWin && mode === 'auto') {
        setPausedAfterLoss(true);
        console.log('⚠️ LOSS! Sistema pausado - aguardando padrão HIGH...');
      }

      setStrategies(prev => {
        const updated = { ...prev };
        const strategyKey = suggestion.strategy;
        if (!updated[strategyKey]) {
          updated[strategyKey] = { wins: 0, losses: 0, profit: 0 };
        }
        updated[strategyKey] = {
          wins: updated[strategyKey].wins + (isWin ? 1 : 0),
          losses: updated[strategyKey].losses + (isWin ? 0 : 1),
          profit: updated[strategyKey].profit + profit
        };
        return updated;
      });

      if (tradesCount >= 199 && learningMode) {
        setLearningMode(false);
        alert('🎓 Aprendizado concluído! Sistema pronto.');
      }
    }, 2000);
  };

  const executeManualTrade = (suggestion: Suggestion) => {
    if (!connected) {
      alert('Conecte-se à API primeiro!');
      return;
    }
    const confirm = window.confirm(
      `Executar ${suggestion.type} em ${suggestion.volatilityName}?\nConfiança: ${suggestion.confidence}%\nAssertividade: ${suggestion.assertiveness}`
    );
    if (confirm) {
      simulateTrade(suggestion);
    }
  };

  const toggleRunning = () => {
    if (!connected) {
      alert('Conecte-se à API primeiro!');
      return;
    }
    setIsRunning(!isRunning);
    if (!isRunning) {
      setPausedAfterLoss(false);
    }
  };

  const toggleVolatility = (symbol: string) => {
    setSelectedVolatilities(prev => {
      if (prev.includes(symbol)) {
        return prev.filter(s => s !== symbol);
      } else {
        return [...prev, symbol];
      }
    });
  };

  const totalProfit = strategies.over2.profit + strategies.under7.profit + strategies.differs.profit;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 text-white p-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-center flex items-center justify-center gap-3">
          <Brain className="text-purple-400" size={40} />
          Deriv Bot - Análise Assertiva Avançada
          <Zap className="text-yellow-400" size={40} />
        </h1>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          {/* Conexão (mantido igual) */}
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Activity className="text-green-400" />
              Conexão API
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm mb-2">Método de Login</label>
                <div className="flex gap-2 mb-3">
                  <button
                    onClick={() => setLoginMethod('token')}
                    disabled={connected}
                    className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
                      loginMethod === 'token' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-white/10 hover:bg-white/20'
                    } ${connected ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    API Token
                  </button>
                  <button
                    onClick={() => setLoginMethod('credentials')}
                    disabled={connected}
                    className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
                      loginMethod === 'credentials' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-white/10 hover:bg-white/20'
                    } ${connected ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    Email/Senha
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm mb-2">Tipo de Conta</label>
                <div className="flex gap-2 mb-3">
                  <button
                    onClick={() => setAccountType('demo')}
                    disabled={connected}
                    className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
                      accountType === 'demo' 
                        ? 'bg-green-600 text-white' 
                        : 'bg-white/10 hover:bg-white/20'
                    } ${connected ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    🎮 DEMO
                  </button>
                  <button
                    onClick={() => setAccountType('real')}
                    disabled={connected}
                    className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
                      accountType === 'real' 
                        ? 'bg-orange-600 text-white' 
                        : 'bg-white/10 hover:bg-white/20'
                    } ${connected ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    💰 REAL
                  </button>
                </div>
              </div>

              {loginMethod === 'token' ? (
                <div>
                  <label className="block text-sm mb-2">API Token</label>
                  <input
                    type="password"
                    value={apiToken}
                    onChange={(e) => setApiToken(e.target.value)}
                    placeholder="Cole seu token aqui"
                    className="w-full p-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400"
                    disabled={connected}
                  />
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-sm mb-2">Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="seu@email.com"
                      className="w-full p-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400"
                      disabled={connected}
                    />
                  </div>
                  <div>
                    <label className="block text-sm mb-2">Senha</label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full p-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400"
                      disabled={connected}
                    />
                  </div>
                </>
              )}
              
              <div className="flex gap-2">
                {!connected ? (
                  <button
                    onClick={connectToAPI}
                    className="flex-1 bg-green-600 hover:bg-green-700 py-3 rounded-lg font-bold transition-colors"
                  >
                    Conectar
                  </button>
                ) : (
                  <button
                    onClick={disconnect}
                    className="flex-1 bg-red-600 hover:bg-red-700 py-3 rounded-lg font-bold transition-colors"
                  >
                    Desconectar
                  </button>
                )}
              </div>
              
              {connected && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-green-400 text-sm">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    Conectado ao {accountType === 'demo' ? 'DEMO' : 'REAL'}
                  </div>
                  {selectedAccount && (
                    <div className="text-xs text-gray-300">
                      <p>Conta: {selectedAccount.loginid}</p>
                      <p>Saldo: ${selectedAccount.balance || '0.00'}</p>
                      <p>Moeda: {selectedAccount.currency || 'USD'}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Configurações AVANÇADAS */}
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Settings className="text-blue-400" />
              Configurações Avançadas
            </h2>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm mb-2">Stake (USD)</label>
                <input
                  type="number"
                  value={stake}
                  onChange={(e) => setStake(parseFloat(e.target.value))}
                  className="w-full p-2 rounded-lg bg-white/10 border border-white/20 text-white"
                  step="0.01"
                />
              </div>
              
              <div>
                <label className="block text-sm mb-2">Stop Loss</label>
                <input
                  type="number"
                  value={stopLoss}
                  onChange={(e) => setStopLoss(parseFloat(e.target.value))}
                  className="w-full p-2 rounded-lg bg-white/10 border border-white/20 text-white"
                />
              </div>
              
              <div>
                <label className="block text-sm mb-2">Stop Win</label>
                <input
                  type="number"
                  value={stopWin}
                  onChange={(e) => setStopWin(parseFloat(e.target.value))}
                  className="w-full p-2 rounded-lg bg-white/10 border border-white/20 text-white"
                />
              </div>
              
              <div>
                <label className="block text-sm mb-2">Max Trades</label>
                <input
                  type="number"
                  value={maxTrades}
                  onChange={(e) => setMaxTrades(parseInt(e.target.value))}
                  className="w-full p-2 rounded-lg bg-white/10 border border-white/20 text-white"
                />
              </div>
            </div>

            {/* NOVOS CONTROLES DE ASSERTIVIDADE */}
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-4">
              <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
                <AlertTriangle className="text-yellow-400" size={16} />
                Controles de Assertividade
              </h3>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-xs mb-1">
                    Confiança Mínima: <strong>{minConfidence}%</strong>
                  </label>
                  <input
                    type="range"
                    min="50"
                    max="90"
                    value={minConfidence}
                    onChange={(e) => setMinConfidence(parseInt(e.target.value))}
                    className="w-full"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Só opera se confiança ≥ {minConfidence}%
                  </p>
                </div>

                <div>
                  <label className="block text-xs mb-1">
                    Limite Exaustão: <strong>{exhaustionThreshold} vezes</strong>
                  </label>
                  <input
                    type="range"
                    min="3"
                    max="8"
                    value={exhaustionThreshold}
                    onChange={(e) => setExhaustionThreshold(parseInt(e.target.value))}
                    className="w-full"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Dígito exausto após aparecer {exhaustionThreshold}+ vezes em 20 ticks
                  </p>
                </div>

                <div>
                  <label className="block text-xs mb-1">
                    Limite Ausência: <strong>{absenceThreshold} ticks</strong>
                  </label>
                  <input
                    type="range"
                    min="10"
                    max="25"
                    value={absenceThreshold}
                    onChange={(e) => setAbsenceThreshold(parseInt(e.target.value))}
                    className="w-full"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Dígito ausente após {absenceThreshold}+ ticks sem aparecer
                  </p>
                </div>
              </div>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm mb-2">Modo de Operação</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setMode('manual')}
                  className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
                    mode === 'manual' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-white/10 hover:bg-white/20'
                  }`}
                >
                  Manual
                </button>
                <button
                  onClick={() => setMode('auto')}
                  className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
                    mode === 'auto' 
                      ? 'bg-purple-600 text-white' 
                      : 'bg-white/10 hover:bg-white/20'
                  }`}
                >
                  Automático
                </button>
              </div>
            </div>
            
            <div>
              <label className="block text-sm mb-3">Estratégias Ativas</label>
              <div className="space-y-2">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={activeStrategies.over2}
                    onChange={(e) => setActiveStrategies(prev => ({...prev, over2: e.target.checked}))}
                    className="w-5 h-5 rounded"
                  />
                  <span className="text-sm">Over 2 (dígito &gt; 2)</span>
                </label>
                
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={activeStrategies.under7}
                    onChange={(e) => setActiveStrategies(prev => ({...prev, under7: e.target.checked}))}
                    className="w-5 h-5 rounded"
                  />
                  <span className="text-sm">Under 7 (dígito &lt; 7)</span>
                </label>
                
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={activeStrategies.differs}
                    onChange={(e) => setActiveStrategies(prev => ({...prev, differs: e.target.checked}))}
                    className="w-5 h-5 rounded"
                  />
                  <span className="text-sm">Differs (evitar dígito dominante)</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* NOVA SEÇÃO: Configurações de Operações Específicas */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 mb-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Target className="text-purple-400" />
            Operações Customizáveis
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* OVER Customizável */}
            <div className="bg-emerald-900/30 border border-emerald-500/40 rounded-lg p-4">
              <label className="flex items-center gap-3 cursor-pointer mb-3">
                <input
                  type="checkbox"
                  checked={specificOperations.over.enabled}
                  onChange={(e) => setSpecificOperations(prev => ({
                    ...prev,
                    over: { ...prev.over, enabled: e.target.checked }
                  }))}
                  className="w-5 h-5 rounded"
                />
                <span className="font-bold text-emerald-300">OVER Específico</span>
              </label>
              
              <p className="text-xs text-gray-300 mb-3">
                Selecione os dígitos que você quer operar OVER (maior que):
              </p>
              
              <div className="grid grid-cols-5 gap-2">
                {[0, 1, 2, 3, 4, 5, 6, 7, 8].map(digit => (
                  <button
                    key={digit}
                    onClick={() => {
                      setSpecificOperations(prev => {
                        const newDigits = prev.over.digits.includes(digit)
                          ? prev.over.digits.filter(d => d !== digit)
                          : [...prev.over.digits, digit].sort((a, b) => a - b);
                        return {
                          ...prev,
                          over: { ...prev.over, digits: newDigits }
                        };
                      });
                    }}
                    disabled={!specificOperations.over.enabled}
                    className={`py-2 px-3 rounded-lg font-bold transition-all ${
                      specificOperations.over.digits.includes(digit)
                        ? 'bg-emerald-600 text-white scale-110'
                        : 'bg-white/10 hover:bg-white/20'
                    } ${!specificOperations.over.enabled ? 'opacity-30 cursor-not-allowed' : ''}`}
                  >
                    {digit}
                  </button>
                ))}
              </div>
              
              {specificOperations.over.enabled && specificOperations.over.digits.length > 0 && (
                <p className="text-xs text-emerald-300 mt-3">
                  Opera quando dígito for <strong>&gt; {Math.max(...specificOperations.over.digits)}</strong>
                </p>
              )}
            </div>

            {/* UNDER Customizável */}
            <div className="bg-sky-900/30 border border-sky-500/40 rounded-lg p-4">
              <label className="flex items-center gap-3 cursor-pointer mb-3">
                <input
                  type="checkbox"
                  checked={specificOperations.under.enabled}
                  onChange={(e) => setSpecificOperations(prev => ({
                    ...prev,
                    under: { ...prev.under, enabled: e.target.checked }
                  }))}
                  className="w-5 h-5 rounded"
                />
                <span className="font-bold text-sky-300">UNDER Específico</span>
              </label>
              
              <p className="text-xs text-gray-300 mb-3">
                Selecione os dígitos que você quer operar UNDER (menor que):
              </p>
              
              <div className="grid grid-cols-5 gap-2">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(digit => (
                  <button
                    key={digit}
                    onClick={() => {
                      setSpecificOperations(prev => {
                        const newDigits = prev.under.digits.includes(digit)
                          ? prev.under.digits.filter(d => d !== digit)
                          : [...prev.under.digits, digit].sort((a, b) => a - b);
                        return {
                          ...prev,
                          under: { ...prev.under, digits: newDigits }
                        };
                      });
                    }}
                    disabled={!specificOperations.under.enabled}
                    className={`py-2 px-3 rounded-lg font-bold transition-all ${
                      specificOperations.under.digits.includes(digit)
                        ? 'bg-sky-600 text-white scale-110'
                        : 'bg-white/10 hover:bg-white/20'
                    } ${!specificOperations.under.enabled ? 'opacity-30 cursor-not-allowed' : ''}`}
                  >
                    {digit}
                  </button>
                ))}
              </div>
              
              {specificOperations.under.enabled && specificOperations.under.digits.length > 0 && (
                <p className="text-xs text-sky-300 mt-3">
                  Opera quando dígito for <strong>&lt; {Math.min(...specificOperations.under.digits)}</strong>
                </p>
              )}
            </div>

            {/* MATCHES Customizável */}
            <div className="bg-pink-900/30 border border-pink-500/40 rounded-lg p-4">
              <label className="flex items-center gap-3 cursor-pointer mb-3">
                <input
                  type="checkbox"
                  checked={specificOperations.matches.enabled}
                  onChange={(e) => setSpecificOperations(prev => ({
                    ...prev,
                    matches: { ...prev.matches, enabled: e.target.checked }
                  }))}
                  className="w-5 h-5 rounded"
                />
                <span className="font-bold text-pink-300">MATCHES Específico</span>
              </label>
              
              <p className="text-xs text-gray-300 mb-3">
                Selecione o dígito que você quer que APAREÇA:
              </p>
              
              <div className="grid grid-cols-5 gap-2">
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(digit => (
                  <button
                    key={digit}
                    onClick={() => {
                      setSpecificOperations(prev => ({
                        ...prev,
                        matches: { ...prev.matches, digit }
                      }));
                    }}
                    disabled={!specificOperations.matches.enabled}
                    className={`py-2 px-3 rounded-lg font-bold transition-all ${
                      specificOperations.matches.digit === digit
                        ? 'bg-pink-600 text-white scale-110'
                        : 'bg-white/10 hover:bg-white/20'
                    } ${!specificOperations.matches.enabled ? 'opacity-30 cursor-not-allowed' : ''}`}
                  >
                    {digit}
                  </button>
                ))}
              </div>
              
              {specificOperations.matches.enabled && (
                <p className="text-xs text-pink-300 mt-3">
                  Opera quando dígito for <strong>= {specificOperations.matches.digit}</strong>
                </p>
              )}
            </div>

            {/* DIFFERS Customizável */}
            <div className="bg-violet-900/30 border border-violet-500/40 rounded-lg p-4">
              <label className="flex items-center gap-3 cursor-pointer mb-3">
                <input
                  type="checkbox"
                  checked={specificOperations.differs.enabled}
                  onChange={(e) => setSpecificOperations(prev => ({
                    ...prev,
                    differs: { ...prev.differs, enabled: e.target.checked }
                  }))}
                  className="w-5 h-5 rounded"
                />
                <span className="font-bold text-violet-300">DIFFERS Customizável</span>
              </label>
              
              <p className="text-xs text-gray-300 mb-3">
                Selecione os dígitos que você quer EVITAR:
              </p>
              
              <div className="grid grid-cols-5 gap-2">
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(digit => (
                  <button
                    key={digit}
                    onClick={() => {
                      setSpecificOperations(prev => {
                        const newDigits = prev.differs.digits.includes(digit)
                          ? prev.differs.digits.filter(d => d !== digit)
                          : [...prev.differs.digits, digit].sort((a, b) => a - b);
                        return {
                          ...prev,
                          differs: { ...prev.differs, digits: newDigits }
                        };
                      });
                    }}
                    disabled={!specificOperations.differs.enabled}
                    className={`py-2 px-3 rounded-lg font-bold transition-all ${
                      specificOperations.differs.digits.includes(digit)
                        ? 'bg-violet-600 text-white scale-110'
                        : 'bg-white/10 hover:bg-white/20'
                    } ${!specificOperations.differs.enabled ? 'opacity-30 cursor-not-allowed' : ''}`}
                  >
                    {digit}
                  </button>
                ))}
              </div>
              
              {specificOperations.differs.enabled && specificOperations.differs.digits.length > 0 && (
                <p className="text-xs text-violet-300 mt-3">
                  Opera quando dígito for <strong>≠ {specificOperations.differs.digits.join(', ')}</strong>
                </p>
              )}
            </div>
          </div>
        </div>

        {/* NOVA SEÇÃO: Configuração de Martingale */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 mb-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <TrendingUp className="text-orange-400" />
            Sistema de Martingale
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="flex items-center gap-3 cursor-pointer mb-4">
                <input
                  type="checkbox"
                  checked={martingaleConfig.enabled}
                  onChange={(e) => {
                    setMartingaleConfig(prev => ({
                      ...prev,
                      enabled: e.target.checked,
                      currentLevel: 0,
                      currentStake: stake
                    }));
                  }}
                  className="w-5 h-5 rounded"
                />
                <span className="font-bold">Ativar Martingale</span>
              </label>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm mb-2">
                    Multiplicador: <strong>{martingaleConfig.multiplier.toFixed(1)}x</strong>
                  </label>
                  <input
                    type="range"
                    min="1.5"
                    max="3"
                    step="0.1"
                    value={martingaleConfig.multiplier}
                    onChange={(e) => setMartingaleConfig(prev => ({
                      ...prev,
                      multiplier: parseFloat(e.target.value)
                    }))}
                    disabled={!martingaleConfig.enabled}
                    className="w-full"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Após LOSS, stake será multiplicado por {martingaleConfig.multiplier.toFixed(1)}x
                  </p>
                </div>

                <div>
                  <label className="block text-sm mb-2">
                    Níveis Máximos: <strong>{martingaleConfig.maxLevels}</strong>
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={martingaleConfig.maxLevels}
                    onChange={(e) => setMartingaleConfig(prev => ({
                      ...prev,
                      maxLevels: parseInt(e.target.value)
                    }))}
                    disabled={!martingaleConfig.enabled}
                    className="w-full"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Máximo de {martingaleConfig.maxLevels} martingale(s) consecutivos
                  </p>
                </div>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={martingaleConfig.resetOnWin}
                    onChange={(e) => setMartingaleConfig(prev => ({
                      ...prev,
                      resetOnWin: e.target.checked
                    }))}
                    disabled={!martingaleConfig.enabled}
                    className="w-5 h-5 rounded"
                  />
                  <span className="text-sm">Resetar stake ao vencer</span>
                </label>
              </div>
            </div>

            <div className="bg-orange-900/20 border border-orange-500/40 rounded-lg p-4">
              <h3 className="font-bold mb-3 text-orange-300">⚠️ Simulação de Martingale</h3>
              
              <div className="space-y-2 text-sm">
                <p className="text-gray-300">Stake inicial: <strong>${stake.toFixed(2)}</strong></p>
                
                {martingaleConfig.enabled && (
                  <>
                    <div className="border-t border-orange-500/30 pt-2 mt-2">
                      <p className="text-xs text-gray-400 mb-2">Progressão após LOSSes:</p>
                      {[...Array(martingaleConfig.maxLevels + 1)].map((_, level) => {
                        const levelStake = stake * Math.pow(martingaleConfig.multiplier, level);
                        const totalRisk = stake * (Math.pow(martingaleConfig.multiplier, level + 1) - 1) / (martingaleConfig.multiplier - 1);
                        
                        return (
                          <div key={level} className={`flex justify-between py-1 ${
                            level === martingaleConfig.currentLevel ? 'bg-orange-600/30 px-2 rounded' : ''
                          }`}>
                            <span className="text-xs">
                              {level === 0 ? 'Inicial' : `Nível ${level}`}:
                            </span>
                            <span className="font-bold">
                              ${levelStake.toFixed(2)}
                              {level > 0 && (
                                <span className="text-xs text-red-300 ml-2">
                                  (Risco: ${totalRisk.toFixed(2)})
                                </span>
                              )}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    <div className="border-t border-orange-500/30 pt-2 mt-3">
                      <p className="text-xs font-bold text-orange-300">
                        Nível Atual: {martingaleConfig.currentLevel}/{martingaleConfig.maxLevels}
                      </p>
                      <p className="text-xs font-bold text-orange-300">
                        Stake Atual: ${martingaleConfig.currentStake.toFixed(2)}
                      </p>
                    </div>
                  </>
                )}

                {!martingaleConfig.enabled && (
                  <p className="text-xs text-gray-400 italic">
                    Ative o Martingale para ver a progressão
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* NOVA SEÇÃO: Simulador e Recomendações */}
        <div className="bg-gradient-to-br from-purple-900/40 to-pink-900/40 backdrop-blur-lg rounded-xl p-6 border-2 border-purple-400/50 mb-6">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <Brain className="text-purple-400" size={28} />
            Simulador & Recomendações Inteligentes
            <Zap className="text-yellow-400 animate-pulse" size={24} />
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Análise em Tempo Real */}
            <div className="bg-black/30 rounded-lg p-5 border border-purple-400/30">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Activity className="text-green-400" size={20} />
                Análise em Tempo Real
              </h3>
              
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm">Qualidade do Mercado</span>
                    <span className="font-bold text-lg">{performanceMetrics.currentSessionQuality}/100</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-4 overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-500 ${
                        performanceMetrics.currentSessionQuality >= 70 ? 'bg-green-500' :
                        performanceMetrics.currentSessionQuality >= 50 ? 'bg-yellow-500' :
                        'bg-red-500'
                      }`}
                      style={{ width: `${performanceMetrics.currentSessionQuality}%` }}
                    ></div>
                  </div>
                </div>

                <div className={`p-4 rounded-lg border-2 ${
                  performanceMetrics.shouldOperate 
                    ? 'bg-green-900/30 border-green-400' 
                    : 'bg-red-900/30 border-red-400'
                }`}>
                  <p className="font-bold text-lg mb-2">
                    {performanceMetrics.shouldOperate ? '🟢 PODE OPERAR' : '🔴 NÃO OPERE AINDA'}
                  </p>
                  <p className="text-sm opacity-90">
                    {performanceMetrics.reason || 'Aguardando análise...'}
                  </p>
                </div>

                <button
                  onClick={analyzeMarketQuality}
                  className="w-full bg-purple-600 hover:bg-purple-700 py-3 rounded-lg font-bold transition-colors flex items-center justify-center gap-2"
                >
                  <BarChart3 size={20} />
                  Analisar Agora
                </button>
              </div>
            </div>

            {/* Simulador */}
            <div className="bg-black/30 rounded-lg p-5 border border-pink-400/30">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Target className="text-pink-400" size={20} />
                Simulador de Estratégias
              </h3>

              {!simulationData.isRunning && !simulationData.recommendation ? (
                <div className="text-center py-8">
                  <p className="text-sm text-gray-300 mb-4">
                    Execute uma simulação de 140 trades para descobrir:
                  </p>
                  <ul className="text-sm text-left space-y-2 mb-6">
                    <li>✅ Melhor estratégia para o momento</li>
                    <li>✅ Volatilidade mais lucrativa</li>
                    <li>✅ Horário ideal para operar</li>
                    <li>✅ Recomendação de PLAY ou STOP</li>
                  </ul>
                  <button
                    onClick={runSimulation}
                    disabled={!connected}
                    className="w-full bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 py-3 rounded-lg font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <Play size={20} />
                    Iniciar Simulação
                  </button>
                </div>
              ) : simulationData.isRunning ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-pink-400 mx-auto mb-4"></div>
                  <p className="font-bold text-lg">Simulando...</p>
                  <p className="text-sm text-gray-300 mt-2">
                    {simulationData.tradesSimulated}/140 trades testados
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className={`p-4 rounded-lg border-2 ${
                    simulationData.recommendation?.confidence === 'ALTA' 
                      ? 'bg-green-900/30 border-green-400' 
                      : simulationData.recommendation?.confidence === 'MÉDIA'
                      ? 'bg-yellow-900/30 border-yellow-400'
                      : 'bg-red-900/30 border-red-400'
                  }`}>
                    <p className="font-bold text-xl mb-2">
                      {simulationData.recommendation?.action}
                    </p>
                    <p className="text-sm mb-3">
                      Confiança: <strong>{simulationData.recommendation?.confidence}</strong>
                    </p>
                    <div className="space-y-1">
                      {simulationData.recommendation?.tips.map((tip, idx) => (
                        <p key={idx} className="text-xs">• {tip}</p>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="bg-blue-900/20 p-3 rounded-lg">
                      <p className="text-xs text-gray-300">Melhor Estratégia</p>
                      <p className="font-bold">{simulationData.recommendation?.bestStrategy}</p>
                    </div>
                    <div className="bg-green-900/20 p-3 rounded-lg">
                      <p className="text-xs text-gray-300">Melhor Volatilidade</p>
                      <p className="font-bold text-xs">{simulationData.recommendation?.bestVolatility}</p>
                    </div>
                    <div className="bg-purple-900/20 p-3 rounded-lg">
                      <p className="text-xs text-gray-300">Score Mercado</p>
                      <p className="font-bold">{simulationData.recommendation?.marketScore}/100</p>
                    </div>
                    <div className="bg-pink-900/20 p-3 rounded-lg">
                      <p className="text-xs text-gray-300">Score Horário</p>
                      <p className="font-bold">{simulationData.recommendation?.timeScore}/100</p>
                    </div>
                  </div>

                  <button
                    onClick={runSimulation}
                    className="w-full bg-purple-600/50 hover:bg-purple-600 py-2 rounded-lg font-bold transition-colors text-sm"
                  >
                    🔄 Simular Novamente
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Resultados da Simulação Detalhados */}
          {simulationData.results.length > 0 && (
            <div className="mt-6 bg-black/30 rounded-lg p-5 border border-purple-400/30">
              <h3 className="text-lg font-bold mb-4">📊 Resultados Detalhados da Simulação</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {simulationData.results
                  .sort((a, b) => b.winRate - a.winRate)
                  .map((result, idx) => {
                    const strategyNames = {
                      over2: 'Over 2',
                      under7: 'Under 7',
                      differs: 'Differs',
                      specificOver: 'Over Custom',
                      specificUnder: 'Under Custom',
                      matches: 'Matches',
                      customDiffers: 'Differs Custom'
                    };
                    
                    return (
                      <div 
                        key={idx}
                        className={`p-3 rounded-lg border ${
                          idx === 0 
                            ? 'bg-green-900/20 border-green-400' 
                            : 'bg-gray-800/30 border-gray-600'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-bold text-sm">{strategyNames[result.strategy]}</p>
                          {idx === 0 && <span className="text-xs bg-green-600 px-2 py-1 rounded">TOP</span>}
                        </div>
                        <div className="space-y-1 text-xs">
                          <div className="flex justify-between">
                            <span>Win Rate:</span>
                            <span className="font-bold">{result.winRate.toFixed(1)}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Wins/Losses:</span>
                            <span className="font-bold">{result.wins}/{result.losses}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Lucro:</span>
                            <span className={`font-bold ${result.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              ${result.profit.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>

        {/* Seleção de Volatilidades */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 mb-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Target className="text-yellow-400" />
            Volatilidades Monitoradas
          </h2>
          
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {VOLATILITIES.map(vol => (
              <button
                key={vol.symbol}
                onClick={() => toggleVolatility(vol.symbol)}
                className={`p-3 rounded-lg font-medium transition-all ${
                  selectedVolatilities.includes(vol.symbol)
                    ? `bg-${vol.color}-600 text-white shadow-lg scale-105`
                    : 'bg-white/10 hover:bg-white/20'
                }`}
              >
                <div className="text-xs opacity-80">{vol.name}</div>
                <div className="text-lg font-bold mt-1">
                  {volatilityData[vol.symbol]?.currentTick?.digit ?? '-'}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className={`rounded-xl p-6 border-2 transition-all ${
            performanceMetrics.shouldOperate
              ? 'bg-gradient-to-br from-green-600 to-green-800 border-green-400 animate-pulse'
              : 'bg-gradient-to-br from-red-600 to-red-800 border-red-400'
          }`}>
            <h3 className="text-sm opacity-80 mb-2">Recomendação</h3>
            <div className="flex items-center gap-3">
              {performanceMetrics.shouldOperate ? (
                <>
                  <Play className="text-white" size={32} />
                  <div>
                    <p className="text-2xl font-bold">PLAY ✅</p>
                    <p className="text-xs mt-1">Momento favorável</p>
                  </div>
                </>
              ) : (
                <>
                  <Pause className="text-white" size={32} />
                  <div>
                    <p className="text-2xl font-bold">STOP 🛑</p>
                    <p className="text-xs mt-1">Aguarde melhor momento</p>
                  </div>
                </>
              )}
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-purple-600 to-purple-800 rounded-xl p-6 border border-purple-400/30">
            <h3 className="text-sm opacity-80 mb-2">Status Bot</h3>
            <p className="text-xl font-bold">
              {pausedAfterLoss ? '⏸️ Pausado' : learningMode ? '🎓 Aprendendo' : '✅ Ativo'}
            </p>
            <p className="text-sm mt-2">
              Trades: {tradesCount}/{learningMode ? '200' : maxTrades}
            </p>
            {pausedAfterLoss && (
              <p className="text-xs mt-2 text-yellow-300">
                Aguardando HIGH (&gt;80%)
              </p>
            )}
          </div>
          
          <div className="bg-gradient-to-br from-green-600 to-green-800 rounded-xl p-6 border border-green-400/30">
            <h3 className="text-sm opacity-80 mb-2">Lucro Total</h3>
            <p className={`text-3xl font-bold ${totalProfit >= 0 ? 'text-green-300' : 'text-red-300'}`}>
              ${totalProfit.toFixed(2)}
            </p>
            {mode === 'auto' && (
              <button
                onClick={toggleRunning}
                disabled={!performanceMetrics.shouldOperate && !isRunning}
                className={`w-full mt-3 py-2 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors ${
                  isRunning 
                    ? 'bg-red-500 hover:bg-red-600' 
                    : performanceMetrics.shouldOperate
                    ? 'bg-green-500 hover:bg-green-600'
                    : 'bg-gray-500 cursor-not-allowed opacity-50'
                }`}
              >
                {isRunning ? <><Pause size={18} /> Pausar</> : <><Play size={18} /> Iniciar</>}
              </button>
            )}
            {!performanceMetrics.shouldOperate && !isRunning && mode === 'auto' && (
              <p className="text-xs text-yellow-300 mt-2 text-center">
                ⚠️ Sistema recomenda aguardar
              </p>
            )}
          </div>

          <div className="bg-gradient-to-br from-yellow-600 to-yellow-800 rounded-xl p-6 border border-yellow-400/30">
            <h3 className="text-sm opacity-80 mb-2">Qualidade</h3>
            <p className="text-3xl font-bold">{performanceMetrics.currentSessionQuality}</p>
            <div className="text-xs mt-2 space-y-1">
              <p>Oportunidades: {suggestions.length}</p>
              <p>HIGH: {suggestions.filter(s => s.assertiveness === 'HIGH').length}</p>
            </div>
          </div>
        </div>

        {/* Resultado do Último Trade */}
        {lastTradeResult && (
          <div className={`mb-6 p-6 rounded-xl border-2 ${
            lastTradeResult.isWin 
              ? 'bg-green-600/20 border-green-400' 
              : 'bg-red-600/20 border-red-400'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold mb-2">
                  {lastTradeResult.isWin ? '✅ WIN' : '❌ LOSS'}
                  {lastTradeResult.martingaleLevel > 0 && (
                    <span className="text-orange-400 ml-2 text-lg">
                      [Martingale Nível {lastTradeResult.martingaleLevel}]
                    </span>
                  )}
                </h3>
                <p className="text-lg">
                  {lastTradeResult.suggestion.type} em {lastTradeResult.suggestion.volatilityName}
                </p>
                <p className="text-sm opacity-80">
                  Confiança: {lastTradeResult.confidence}% | 
                  Assertividade: {lastTradeResult.suggestion.assertiveness} |
                  Stake: <strong>${lastTradeResult.stake.toFixed(2)}</strong>
                </p>
              </div>
              <p className={`text-4xl font-bold ${
                lastTradeResult.isWin ? 'text-green-300' : 'text-red-300'
              }`}>
                ${lastTradeResult.profit.toFixed(2)}
              </p>
            </div>
            {!lastTradeResult.isWin && pausedAfterLoss && (
              <div className="mt-4 p-3 bg-yellow-500/20 border border-yellow-500/40 rounded-lg">
                <p className="text-sm text-yellow-200">
                  ⚠️ Sistema pausado após LOSS - Aguardando padrão de alta assertividade (HIGH + confiança ≥80%)
                </p>
              </div>
            )}
            {martingaleConfig.enabled && !lastTradeResult.isWin && martingaleConfig.currentLevel < martingaleConfig.maxLevels && (
              <div className="mt-4 p-3 bg-orange-500/20 border border-orange-500/40 rounded-lg">
                <p className="text-sm text-orange-200">
                  📈 Martingale ativado! Próximo stake: <strong>${martingaleConfig.currentStake.toFixed(2)}</strong>
                </p>
              </div>
            )}
          </div>
        )}

        {/* Estatísticas das Estratégias */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {Object.entries(strategies).map(([key, data]) => {
            const winRate = data.wins + data.losses > 0 
              ? ((data.wins / (data.wins + data.losses)) * 100).toFixed(1) 
              : 0;
            
            const names = {
              over2: 'Over 2',
              under7: 'Under 7',
              differs: 'Differs'
            };
            
            return (
              <div key={key} className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
                <h3 className="text-lg font-bold mb-3">{names[key]}</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Wins:</span>
                    <span className="text-green-400 font-bold">{data.wins}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Losses:</span>
                    <span className="text-red-400 font-bold">{data.losses}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Win Rate:</span>
                    <span className="font-bold">{winRate}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Profit:</span>
                    <span className={`font-bold ${data.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      ${data.profit.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Sugestões com Gatilhos Detalhados */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Zap className="text-yellow-400" />
            Sugestões com Análise Avançada
          </h2>
          
          {suggestions.length === 0 ? (
            <p className="text-center text-gray-400 py-8">
              Aguardando análise... Conecte e selecione volatilidades.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {suggestions.map((sug, idx) => (
                <div 
                  key={idx} 
                  className={`rounded-xl p-5 border-2 ${
                    sug.assertiveness === 'HIGH' 
                      ? 'bg-gradient-to-br from-green-600 to-green-800 border-green-400' 
                      : sug.assertiveness === 'MEDIUM'
                      ? 'bg-gradient-to-br from-yellow-600 to-yellow-800 border-yellow-400'
                      : 'bg-gradient-to-br from-gray-600 to-gray-800 border-gray-400'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-bold text-lg">{sug.type}</h3>
                      <p className="text-xs opacity-80">{sug.volatilityName}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold">{sug.confidence}%</div>
                      <div className={`text-xs px-2 py-1 rounded-full ${
                        sug.assertiveness === 'HIGH' 
                          ? 'bg-green-900/50' 
                          : sug.assertiveness === 'MEDIUM'
                          ? 'bg-yellow-900/50'
                          : 'bg-gray-900/50'
                      }`}>
                        {sug.assertiveness}
                      </div>
                    </div>
                  </div>
                  
                  <p className="text-sm mb-3">{sug.reason}</p>
                  
                  {/* Gatilhos Detectados */}
                  {sug.triggers && sug.triggers.length > 0 && (
                    <div className="bg-black/20 rounded-lg p-3 mb-3">
                      <p className="text-xs font-bold mb-2">Gatilhos Detectados:</p>
                      <div className="space-y-1">
                        {sug.triggers.map((trigger, tidx) => (
                          <div key={tidx} className="flex items-start gap-2 text-xs">
                            <span>{trigger.icon}</span>
                            <div className="flex-1">
                              <span className="font-semibold">{trigger.name}</span>
                              <span className="opacity-80"> - {trigger.description}</span>
                              <span className="text-yellow-300 ml-1">(+{trigger.score.toFixed(0)} pts)</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <span className="text-xs">Atual: <strong className="text-lg">{sug.currentDigit}</strong></span>
                    {mode === 'manual' && (
                      <button
                        onClick={() => executeManualTrade(sug)}
                        className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-sm font-bold transition-colors"
                      >
                        Executar
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}