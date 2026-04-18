import { useEffect, useState, useCallback, useRef } from 'react';
import { DerivService } from '@/app/services/DerivService';
import { RulesVisualData } from '../service/Monitoring';
import { ChartBarIcon } from '@heroicons/react/16/solid';

interface MarketStats {
  digits: number[];
  prices: number[];
  digitCounts: number[];
  lastDigit: number | null;
  direction: 'up' | 'down' | 'equal';
}

export interface ProbabilityStats {
  probabilities: number[];
  mostProbable: number;
  leastProbable: number;
  mostProbableValue: number;
  leastProbableValue: number;
  highestStrength: number;
  lowestStrength: number;
  sortedScores: { digit: number; prob: number }[];
  topN: any,
  topNDigits: any
}

interface MarketAnalysisPanelProps {
  symbol: string;
  marketStats?: ProbabilityStats | null;
  rulesVisualData?: RulesVisualData | null;
}

export default function MarketAnalysisPanel({ symbol, marketStats, rulesVisualData }: MarketAnalysisPanelProps) {
  // Estado local apenas para estatísticas básicas (não probabilidades)
  const [stats, setStats] = useState<MarketStats>({
    digits: [],
    prices: [],
    digitCounts: Array(10).fill(0),
    lastDigit: null,
    direction: 'equal'
  });

  const [loading, setLoading] = useState(true);
  const [topN, setTopN] = useState<number>(() => {
    const v = parseInt(localStorage.getItem('prob_accuracy_topN') || '5', 10);
    return Number.isFinite(v) && v >= 1 && v <= 10 ? v : 5;
  });
  
  // Precisão calculada via ProbabilityAccuracyManager do legado
  const [accuracy, setAccuracy] = useState<number>(100);
  
  const deriv = DerivService.getInstance();
  const marketStatsRef = useRef<ProbabilityStats | null | undefined>(marketStats);

  useEffect(() => {
    marketStatsRef.current = marketStats;
  }, [marketStats]);

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

  // Atualiza precisão usando ProbabilityAccuracyManager do legado
  const updateAccuracy = useCallback((digit: number, sortedScores: { digit: number; prob: number }[] | undefined) => {
    if (typeof window !== 'undefined' && (window as any).ProbabilityAccuracyManager && sortedScores) {
      try {
        const accManager = (window as any).ProbabilityAccuracyManager.getInstance();
        
        // Registrar previsão para o próximo tick
        accManager.recordPrediction(sortedScores);
        
        // Atualizar resultado
        accManager.updateOutcome(digit);
        
        // Obter precisão atual
        const currentAccuracy = accManager.getAccuracy();
        setAccuracy(currentAccuracy);
      } catch (e) {
        // Silenciar erros do legado
      }
    }
  }, []);

  // Subscribe to ticks apenas para estatísticas básicas (não probabilidades)
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

    const handleTick = (data: any) => {
      if (data.tick && data.tick.symbol === symbol) {
        
        const price = data.tick.quote;
        const digit = getLastDigit(price, symbol);
        
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

        // Atualizar precisão via legado
        updateAccuracy(digit, marketStatsRef.current?.sortedScores);

        setLoading(false);
      }
    };

    // Subscribe to ticks
   // deriv.send({ ticks: symbol, subscribe: 1 }).catch(console.error);

    // Listen using DerivService observer
    const listenerId = deriv.observerInstance.on('deriv.tick', handleTick);

    return () => {
      deriv.observerInstance.removeById(listenerId);
    };
  }, [symbol, deriv, getLastDigit, updateAccuracy]);

  // Handler para mudança do TOP N - sincroniza com legado
  const handleTopNChange = useCallback((newTopN: number) => {
    setTopN(newTopN);
    
    // Salvar no localStorage
    localStorage.setItem('prob_accuracy_topN', String(newTopN));
    
    // Atualizar no ProbabilityAccuracyManager do legado se disponível
    if (typeof window !== 'undefined' && (window as any).ProbabilityAccuracyManager) {
      try {
        const accManager = (window as any).ProbabilityAccuracyManager.getInstance();
        accManager.setTopN(newTopN);
      } catch (e) {
        console.warn('[MarketAnalysisPanel] Erro ao atualizar topN no legado:', e);
      }
    }
    
    // Resetar precisão ao mudar critério
    setAccuracy(100);
  }, []);

  // Calculations for display (baseado em estatísticas locais)
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

  // Usar dados do marketStats (via props) para probabilidades
  const digitProbs = marketStats?.sortedScores ?? [];
  const topNDisplay = marketStats?.topN ?? topN;
  const topNDigits = marketStats?.topNDigits ?? digitProbs.slice(0, topNDisplay).map(d => d.digit);

  if (!symbol) return <div className="text-gray-500 p-4">Selecione um ativo</div>;

  return (
    <div className="relative w-full flex flex-col gap-4 h-full overflow-y-auto custom-scrollbar bg-[#13111c] border-l border-gray-800 p-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-bold text-white flex items-center gap-2">
          <ChartBarIcon className="w-4 h-4" />Análise
          <span className="text-xs text-blue-400">{symbol}</span>
        </h3>
        <div className="flex items-center gap-2">
          {loading && <span className="text-xs text-yellow-500 animate-pulse">Sincronizando...</span>}
        </div>
      </div>

      {/* 🎲 Probability Monitor - Usando marketStats */}
      <div className="bg-[#0d0a18] border border-gray-700 rounded-lg p-3">
        <div className="text-xs text-gray-400 mb-2 uppercase tracking-wider text-center">Regras em Tempo Real</div>
        <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
          {rulesVisualData?.groups?.length ? (
            rulesVisualData.groups.map((group) => {
              const groupId = Number(group.id);
              const isActive = rulesVisualData.activeGroupIds === null || rulesVisualData.activeGroupIds.includes(groupId);
              return (
                <div key={String(group.id)} className="bg-[#1e1b2e] border border-gray-700 rounded p-2 relative" style={!isActive ? { opacity: 1 } : undefined}>
                  {!isActive && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                      <div className="text-4xl drop-shadow-[0_0_18px_rgba(255,255,255,0.65)]">🔒</div>
                    </div>
                  )}
                  <div className="text-[10px] text-blue-300 mb-1">Grupo {group.id}</div>
                  <div className="space-y-1" style={!isActive ? { opacity: 0.12, filter: 'grayscale(100%) blur(1px)' } : undefined}>
                    {group.rules.map((rule) => (
                      <div key={String(rule.id)} className="text-xs text-gray-200 break-words">
                        {rule.displayText}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-xs text-gray-500 text-center py-2">Aguardando formato visual das regras...</div>
          )}
        </div>
      </div>

      <div className="bg-[#0d0a18] border border-gray-700 rounded-lg p-3">
        <div className="text-xs text-gray-400 mb-2 uppercase tracking-wider text-center">Probabilidade (100 Ticks)</div>
        
        <div className="flex items-center gap-2 mb-2">
          <div className="relative flex items-center bg-white/5 border border-white/10 rounded px-2 py-1">
            <span className="text-[10px] text-gray-300 mr-1 font-bold">TOP</span>
            <span className="text-xs text-white font-bold">{topNDisplay}</span>
            <span className="text-[10px] text-blue-300 ml-2">{topNDigits.length ? topNDigits.join(' ') : '-'}</span>
            <select
              className="absolute inset-0 opacity-0 cursor-pointer"
              value={topN}
              onChange={(e) => handleTopNChange(parseInt(e.target.value, 10))}
            >
              {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
          <div
            className="flex-1 h-2 bg-white/10 rounded relative overflow-hidden"
            title={`Precisão: ${accuracy.toFixed(1)}% | Top ${topNDisplay}`}
          >
            <div
              className="h-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 transition-all duration-500"
              style={{ width: `${Math.max(0, Math.min(100, accuracy))}%` }}
            />
          </div>
          <span className="text-[10px] text-gray-400">{accuracy.toFixed(0)}%</span>
        </div>

        <div className="flex justify-between items-center gap-2">
          {/* Highest */}
          <div className="flex flex-col items-center bg-green-900/20 border border-green-900/50 rounded p-2 flex-1">
            <span className="text-[10px] text-green-400 uppercase">Maior</span>
            <span className="text-2xl font-bold text-white my-1">
              {marketStats?.mostProbable ?? '-'}
            </span>
            <span className="text-xs text-green-400 font-mono">
              {marketStats?.mostProbableValue?.toFixed?.(1) ?? '--'}%
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
              {marketStats?.leastProbable ?? '-'}
            </span>
            <span className="text-xs text-red-400 font-mono">
              {marketStats?.leastProbableValue?.toFixed?.(1) ?? '--'}%
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
              <div key={index} className="w-6 flex flex-col items-center">
                <span className="text-[10px] leading-none text-gray-500 mb-0.5">{index + 1}</span>
                <span className={`text-lg font-bold ${colorClass} text-center leading-none`}>
                  {digit}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
