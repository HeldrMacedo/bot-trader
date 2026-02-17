import { useEffect, useState, useRef, useCallback } from 'react';
import { DerivService } from '@/app/services/DerivService';

interface MarketStats {
  digits: number[];
  prices: number[];
  digitCounts: number[];
  lastDigit: number | null;
  direction: 'up' | 'down' | 'equal';
}

interface ProbabilityStats {
  probabilities: number[];
  mostProbable: number;
  leastProbable: number;
  mostProbableValue: number;
  leastProbableValue: number;
  highestStrength: number;
  lowestStrength: number;
  sortedScores: { digit: number; prob: number }[];
}

interface MarketAnalysisPanelProps {
  symbol: string;
}

export default function MarketAnalysisPanel({ symbol }: MarketAnalysisPanelProps) {
  const [stats, setStats] = useState<MarketStats>({
    digits: [],
    prices: [],
    digitCounts: Array(10).fill(0),
    lastDigit: null,
    direction: 'equal'
  });

  const [probStats, setProbStats] = useState<ProbabilityStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [topN, setTopN] = useState<number>(() => {
    const v = parseInt(localStorage.getItem('prob_accuracy_topN') || '5', 10);
    return Number.isFinite(v) && v >= 1 && v <= 10 ? v : 5;
  });
  
  const deriv = DerivService.getInstance();
  const probabilityHistoryRef = useRef<number[]>([]);
  const accuracyHistoryRef = useRef<boolean[]>([]);
  const [accuracy, setAccuracy] = useState<number>(100);

  // Helper to extract digit based on symbol type
  const getLastDigit = useCallback((price: number, symbol: string): number => {
    const precision =
      symbol === "R_100" ? 2 :
      symbol === "R_25" || symbol === "R_10" ? 3 :
      symbol === "RDBEAR" || symbol === "RDBULL" ? 4 :
      symbol.startsWith("JD") ? 2 : 
      symbol.includes("1HZ") ? 2 : 4;
    
    return parseInt(price.toFixed(precision).slice(-1));
  }, []);

  // Calculate digit gaps
  const calculateDigitGaps = useCallback((history: number[], excludeLastTick: boolean): number[] => {
    const gaps = Array(10).fill(0);
    const lastIndices = Array(10).fill(-1);
    const effective = excludeLastTick && history.length > 0 ? history.slice(0, -1) : history;
    const total = effective.length;
    
    for (let i = 0; i < total; i++) {
      const d = effective[i];
      lastIndices[d] = i;
    }
    
    for (let d = 0; d <= 9; d++) {
      if (lastIndices[d] === -1) {
        gaps[d] = total;
      } else {
        gaps[d] = (total - 1) - lastIndices[d];
      }
    }
    return gaps;
  }, []);

  // Analyze period for probability calculation
  const analyzePeriod = useCallback((digits: number[], periodName: string) => {
    if (!digits || !digits.length) return null;
    
    const freq = Array(10).fill(0);
    let total = 0;
    
    for (let i = 0; i < digits.length; i++) {
      const d = digits[i];
      if (Number.isInteger(d) && d >= 0 && d <= 9) {
        freq[d]++;
        total++;
      }
    }
    
    const sum = freq.reduce((a, b) => a + b, 0);
    if (!sum) return null;
    
    const probs = freq.map(score => (score / sum) * 100);
    let maxProb = -1, maxIdx = -1;
    let minProb = 101, minIdx = -1;
    
    for (let i = 0; i < probs.length; i++) {
      const p = probs[i];
      if (p > maxProb) {
        maxProb = p;
        maxIdx = i;
      }
      if (p < minProb) {
        minProb = p;
        minIdx = i;
      }
    }
    
    return {
      probabilities: probs,
      mostProbable: maxIdx,
      leastProbable: minIdx,
      mostProbableValue: maxProb,
      leastProbableValue: minProb,
      periodName
    };
  }, []);

  // Calculate probabilities - based on legacy monitoring.js
  const calculateProbabilities = useCallback((fullHistory: number[], excludeLastTick = false): ProbabilityStats | null => {
    if (!fullHistory || fullHistory.length < 10) return null;
    
    const dataForStructure = excludeLastTick && fullHistory.length > 0 ? fullHistory.slice(0, -1) : fullHistory;
    let dataForStats = dataForStructure;
    
    if (!excludeLastTick && fullHistory.length > 0) {
      // Count consecutive repetitions
      const lastDigit = fullHistory[fullHistory.length - 1];
      let repetitionCount = 1;
      for (let i = fullHistory.length - 2; i >= 0; i--) {
        if (fullHistory[i] === lastDigit) {
          repetitionCount++;
        } else {
          break;
        }
      }
      dataForStats = fullHistory.slice(0, -repetitionCount);
    }
    
    const periods = [
      { name: '1-10', data: dataForStats.slice(-10), weight: 5.0 },
      { name: '10-25', data: dataForStats.slice(-25, -10), weight: 2.5 },
      { name: '25-50', data: dataForStats.slice(-50, -25), weight: 1.0 },
      { name: '50-100', data: dataForStats.slice(-100, -50), weight: 0.5 },
      { name: '1-100', data: dataForStats.slice(-100), weight: 0.5 }
    ];
    
    const analyses = periods.map(p => {
      const a = analyzePeriod(p.data, p.name);
      if (!a) return null;
      return { ...a, weight: p.weight };
    }).filter(Boolean);
    
    const gaps = calculateDigitGaps(dataForStructure, false);
    const longTerm = analyses.find((a: any) => a && a.periodName === '1-100') as any;
    
    const finalScores: { digit: number; score: number; rawProb: number; consensusHigh: number; consensusLow: number }[] = [];
    
    // Pre-calculate appearances and repetitions
    const longTermHistory = dataForStructure.slice(-100);
    const lastDigit = dataForStructure[dataForStructure.length - 1];
    const appearancesMap = new Array(10).fill(0);
    const repetitionsMap = new Array(10).fill(0);
    
    for (let i = 0; i < longTermHistory.length - 1; i++) {
      const d = longTermHistory[i];
      appearancesMap[d]++;
      if (longTermHistory[i + 1] === d) {
        repetitionsMap[d]++;
      }
    }
    
    for (let digit = 0; digit <= 9; digit++) {
      let weightedSum = 0;
      let totalWeight = 0;
      let cHigh = 0;
      let cLow = 0;
      
      analyses.forEach((analysis: any) => {
        if (analysis && analysis.probabilities) {
          const prob = Number(analysis.probabilities[digit]) || 0;
          weightedSum += prob * analysis.weight;
          totalWeight += analysis.weight;
          if (analysis.mostProbable === digit) cHigh++;
          if (analysis.leastProbable === digit) cLow++;
        }
      });
      
      const base = totalWeight > 0 ? weightedSum / totalWeight : 0;
      
      // Saturation penalty
      let saturationPenalty = 0;
      if (longTerm && longTerm.probabilities) {
        const longFreq = Number(longTerm.probabilities[digit]) || 0;
        if (longFreq > 15) {
          saturationPenalty = (longFreq - 15) * 2.0;
        }
      }
      
      // Dynamic bias
      let dynamicBias = 0;
      const appearances = appearancesMap[digit];
      const repetitions = repetitionsMap[digit];
      const repRate = appearances > 0 ? (repetitions / appearances) * 100 : 0;
      
      if (digit === lastDigit) {
        if (repRate < 5) {
          dynamicBias = 8;
        } else if (repRate > 15) {
          dynamicBias = -10;
        } else {
          dynamicBias = -5;
        }
      } else {
        if (repRate < 5) dynamicBias = 2;
      }
      
      // Gap bonus
      let gapBonus = 0;
      if (gaps[digit] >= 10) {
        gapBonus = Math.pow(gaps[digit] / 10, 2);
      }
      
      const final = (base + gapBonus + dynamicBias) - saturationPenalty;
      finalScores.push({ digit, score: final, rawProb: base, consensusHigh: cHigh, consensusLow: cLow });
    }
    
    const sortedByScore = [...finalScores].sort((a, b) => b.score - a.score);
    const best = sortedByScore[0];
    const worst = sortedByScore[sortedByScore.length - 1];
    
    return {
      probabilities: finalScores.map(s => s.rawProb),
      mostProbable: best.digit,
      leastProbable: worst.digit,
      mostProbableValue: best.rawProb,
      leastProbableValue: worst.rawProb,
      highestStrength: Math.max(1, best.consensusHigh),
      lowestStrength: Math.max(1, worst.consensusLow),
      sortedScores: sortedByScore.map(s => ({ digit: s.digit, prob: s.rawProb }))
    };
  }, [analyzePeriod, calculateDigitGaps]);

  // Subscribe to ticks
  useEffect(() => {
    if (!symbol) return;

    setLoading(true);
    
    // Reset stats on symbol change
    setStats({
      digits: [],
      prices: [],
      digitCounts: Array(10).fill(0),
      lastDigit: null,
      direction: 'equal'
    });
    probabilityHistoryRef.current = [];

    const handleTick = (data: any) => {
      if (data.tick && data.tick.symbol === symbol) {
        const price = data.tick.quote;
        const digit = getLastDigit(price, symbol);

        // Update accuracy tracking
        const predictedTop = probStats?.sortedScores.slice(0, topN).map(s => s.digit) || [];
        const hit = predictedTop.includes(digit);
        accuracyHistoryRef.current.push(hit);
        if (accuracyHistoryRef.current.length > 10) accuracyHistoryRef.current.shift();
        const hits = accuracyHistoryRef.current.filter(Boolean).length;
        const acc = accuracyHistoryRef.current.length ? (hits / accuracyHistoryRef.current.length) * 100 : 100;
        setAccuracy(accuracyHistoryRef.current.length ? acc : 100);

        // Update stats
        setStats(prev => {
          const newDigits = [...prev.digits, digit].slice(-1000);
          const newPrices = [...prev.prices, price].slice(-1000);

          // Update counts
          const counts = Array(10).fill(0);
          const recentDigits = newDigits.slice(-100);
          recentDigits.forEach(d => counts[d]++);

          const prevPrice = prev.prices[prev.prices.length - 1] || price;
          const direction = price > prevPrice ? 'up' : price < prevPrice ? 'down' : 'equal';

          return {
            digits: newDigits,
            prices: newPrices,
            digitCounts: counts,
            lastDigit: digit,
            direction
          };
        });

        // Update probability history
        probabilityHistoryRef.current.push(digit);
        if (probabilityHistoryRef.current.length > 200) {
          probabilityHistoryRef.current.shift();
        }

        // Calculate probabilities
        const newProbStats = calculateProbabilities(probabilityHistoryRef.current, false);
        if (newProbStats) {
          setProbStats(newProbStats);
        }

        setLoading(false);
      }
    };

    // Subscribe to ticks
    deriv.send({ ticks: symbol, subscribe: 1 }).catch(console.error);

    // Listen using DerivService observer
    const listenerId = deriv.observerInstance.on('deriv.tick', handleTick);

    return () => {
      deriv.observerInstance.removeById(listenerId);
    };
  }, [symbol, deriv, getLastDigit, calculateProbabilities, topN, probStats]);

  // Update predicted top when topN changes
  useEffect(() => {
    if (probStats?.sortedScores) {
      // Reset accuracy when changing topN
      accuracyHistoryRef.current = [];
      setAccuracy(100);
    }
  }, [topN, probStats?.sortedScores]);

  // Calculations for display
  const last25Digits = stats.digits.slice(-25);
  const last100Digits = stats.digits.slice(-100);
  
  // Even/Odd (Last 25)
  const evenCount = last25Digits.filter(d => d % 2 === 0).length;
  const oddCount = last25Digits.length - evenCount;
  const evenPct = last25Digits.length ? ((evenCount / last25Digits.length) * 100).toFixed(0) : '0';
  const oddPct = last25Digits.length ? ((oddCount / last25Digits.length) * 100).toFixed(0) : '0';

  // Most/Least Frequent (Last 100)
  const maxCount = Math.max(...stats.digitCounts);
  const minCount = Math.min(...stats.digitCounts);
  const mostFreq = stats.digitCounts.map((c, i) => c === maxCount ? i : -1).filter(i => i !== -1).join(', ');
  const leastFreq = stats.digitCounts.map((c, i) => c === minCount ? i : -1).filter(i => i !== -1).join(', ');

  // Price Direction (Last 100)
  const last100Prices = stats.prices.slice(-100);
  let upCount = 0;
  let downCount = 0;
  for (let i = 1; i < last100Prices.length; i++) {
    if (last100Prices[i] > last100Prices[i-1]) upCount++;
    else if (last100Prices[i] < last100Prices[i-1]) downCount++;
  }
  const totalMoves = upCount + downCount;
  const upPct = totalMoves ? ((upCount / totalMoves) * 100).toFixed(0) : '0';
  const downPct = totalMoves ? ((downCount / totalMoves) * 100).toFixed(0) : '0';

  const digitProbs = probStats?.sortedScores ?? stats.digitCounts.map((count, digit) => ({
    digit,
    prob: last100Digits.length ? (count / last100Digits.length) * 100 : 0
  })).sort((a, b) => b.prob - a.prob);

  const highestProb = digitProbs[0];
  const lowestProb = digitProbs[digitProbs.length - 1];

  if (!symbol) return <div className="text-gray-500 p-4">Selecione um ativo</div>;

  return (
    <div className="relative w-full flex flex-col gap-4 h-full overflow-y-auto custom-scrollbar bg-[#13111c] border-l border-gray-800 p-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-bold text-white flex items-center gap-2">
          📊 Análise
          <span className="text-xs text-blue-400">{symbol}</span>
        </h3>
        <div className="flex items-center gap-2">
          {loading && <span className="text-xs text-yellow-500 animate-pulse">Sincronizando...</span>}
        </div>
      </div>

      {/* 🎲 Probability Monitor */}
      <div className="bg-[#0d0a18] border border-gray-700 rounded-lg p-3">
        <div className="text-xs text-gray-400 mb-2 uppercase tracking-wider text-center">Probabilidade (100 Ticks)</div>
        
        <div className="flex items-center gap-2 mb-2">
          <div className="relative flex items-center bg-white/5 border border-white/10 rounded px-2 py-1">
            <span className="text-[10px] text-gray-300 mr-1 font-bold">TOP</span>
            <span className="text-xs text-white font-bold">{topN}</span>
            <select
              className="absolute inset-0 opacity-0 cursor-pointer"
              value={topN}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                if (!Number.isNaN(val)) {
                  const clamped = Math.max(1, Math.min(10, val));
                  setTopN(clamped);
                  try { localStorage.setItem('prob_accuracy_topN', String(clamped)); } catch {}
                }
              }}
            >
              {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
          <div
            className="flex-1 h-2 bg-white/10 rounded relative overflow-hidden"
            title={`Precisão: ${accuracy.toFixed(1)}%`}
          >
            <div
              className="h-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 transition-all duration-500"
              style={{ width: `${Math.max(0, Math.min(100, accuracy))}%` }}
            />
          </div>
        </div>

        <div className="flex justify-between items-center gap-2">
          {/* Highest */}
          <div className="flex flex-col items-center bg-green-900/20 border border-green-900/50 rounded p-2 flex-1">
            <span className="text-[10px] text-green-400 uppercase">Maior</span>
            <span className="text-2xl font-bold text-white my-1">
              {highestProb?.digit ?? '-'}
            </span>
            <span className="text-xs text-green-400 font-mono">
              {highestProb?.prob?.toFixed?.(1) ?? '--'}%
            </span>
          </div>

          {/* Middle Grid */}
          <div className="grid grid-cols-4 gap-1 flex-[2]">
            {digitProbs.slice(1, 9).map((d) => (
              <div key={d.digit} className="flex flex-col items-center justify-center bg-gray-800/50 rounded p-1" title={`${d.prob.toFixed(1)}%`}>
                <span className="text-[10px] text-gray-300">{d.digit}</span>
                <div className="w-full h-1 bg-gray-700 mt-1 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500" style={{ width: `${Math.min(d.prob * 5, 100)}%` }}></div>
                </div>
              </div>
            ))}
          </div>

          {/* Lowest */}
          <div className="flex flex-col items-center bg-red-900/20 border border-red-900/50 rounded p-2 flex-1">
            <span className="text-[10px] text-red-400 uppercase">Menor</span>
            <span className="text-2xl font-bold text-white my-1">
              {lowestProb?.digit ?? '-'}
            </span>
            <span className="text-xs text-red-400 font-mono">
              {lowestProb?.prob?.toFixed?.(1) ?? '--'}%
            </span>
          </div>
        </div>
      </div>

      {/* 🔢 Digit Analytics */}
      <div className="space-y-3">
        <div className="bg-[#1e1b2e] rounded-lg p-3 border border-gray-700">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs text-gray-400">Frequência (25)</span>
          </div>
          <div className="flex justify-between text-sm">
            <div className="flex items-center gap-2">
              <span className="text-green-400 font-bold">MAX: {mostFreq || '-'}</span>
            </div>
            <div className="w-px h-4 bg-gray-700"></div>
            <div className="flex items-center gap-2">
              <span className="text-red-400 font-bold">MIN: {leastFreq || '-'}</span>
            </div>
          </div>
        </div>

        <div className="bg-[#1e1b2e] rounded-lg p-3 border border-gray-700">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs text-gray-400">Par / Ímpar (25)</span>
          </div>
          <div className="flex items-center gap-2 h-6 bg-gray-800 rounded-full overflow-hidden relative">
            <div 
              className="h-full bg-blue-600 flex items-center justify-center text-[10px] text-white font-bold transition-all duration-500" 
              style={{ width: `${evenPct}%` }}
            >
              {parseInt(evenPct) > 20 && `PAR ${evenPct}%`}
            </div>
            <div 
              className="h-full bg-orange-600 flex items-center justify-center text-[10px] text-white font-bold transition-all duration-500" 
              style={{ width: `${oddPct}%` }}
            >
              {parseInt(oddPct) > 20 && `ÍMPAR ${oddPct}%`}
            </div>
          </div>
        </div>
      </div>

      {/* 📈 Price Analytics */}
      <div className="bg-[#1e1b2e] rounded-lg p-3 border border-gray-700">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs text-gray-400">Direção Preço (100)</span>
        </div>

        <div className="flex justify-between items-end mb-2">
          <div className="text-center">
            <div className="text-green-400 font-bold text-lg">{upPct}%</div>
            <div className="text-[10px] text-gray-500">SOBE</div>
          </div>

          {/* Visual Arrow */}
          <div className={`text-2xl transition-transform duration-300 ${
            stats.direction === 'up' ? 'text-green-500 -rotate-45' : 
            stats.direction === 'down' ? 'text-red-500 rotate-45' : 'text-gray-500'
          }`}>
            ➔
          </div>

          <div className="text-center">
            <div className="text-red-400 font-bold text-lg">{downPct}%</div>
            <div className="text-[10px] text-gray-500">DESCE</div>
          </div>
        </div>

        {/* Volume/Trend Bar */}
        <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden flex">
          <div className="h-full bg-green-500 transition-all duration-500" style={{ width: `${upPct}%` }}></div>
          <div className="h-full bg-red-500 transition-all duration-500" style={{ width: `${downPct}%` }}></div>
        </div>
      </div>

      {/* 🎲 Digit Sequence Display */}
      <div className="bg-[#1e1b2e] rounded-lg p-3 border border-gray-700">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs text-gray-400">Últimos Dígitos</span>
        </div>
        <div className="flex flex-wrap gap-1">
          {last25Digits.slice().reverse().map((digit, index) => {
            const colorClass = digit % 2 === 0 ? 'text-blue-400' : 'text-orange-400';
            return (
              <span key={index} className={`text-lg font-bold ${colorClass} w-6 text-center`}>
                {digit}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
