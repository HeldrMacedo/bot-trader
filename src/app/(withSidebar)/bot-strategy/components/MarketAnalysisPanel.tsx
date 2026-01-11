import React, { useEffect, useState, useRef } from 'react';
import { DerivService } from '@/app/services/DerivService';

interface MarketStats {
  digits: number[];
  prices: number[];
  digitCounts: number[]; // Index 0-9
  lastDigit: number | null;
  direction: 'up' | 'down' | 'equal';
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
  
  const [loading, setLoading] = useState(false);
  const deriv = DerivService.getInstance();

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

    // Helper to extract digit based on symbol type (logic from TicksTest.tsx)
    const getLastDigit = (price: number, symbol: string): number => {
        const precision = 
            symbol === "R_100" ? 2 :
            symbol === "R_25" || symbol === "R_10" ? 3 :
            symbol === "RDBEAR" || symbol === "RDBULL" ? 4 :
            symbol.startsWith("JD") ? 2 : symbol.includes("1HZ")
                  ? 2
                  : 4; // Default to 4 for others like R_50, R_75 which usually have 4 decimals or check logic
            
        // Refined logic from TicksTest.tsx:
        // symbol == "R_100" ? 2
        // : symbol == "R_25" || symbol == "R_10" ? 3
        // : symbol == "RDBEAR" || symbol == "RDBULL" ? 4
        // : symbol.startsWith("JD") ? 2
        // : 4
        
        return parseInt(price.toFixed(precision).slice(-1));
    };

    const handleTick = (data: any) => {
        if (data.tick && data.tick.symbol === symbol) {
            const price = data.tick.quote;
            const digit = getLastDigit(price, symbol);
            
            setStats(prev => {
                const newDigits = [...prev.digits, digit].slice(-1000); // Keep last 1000
                const newPrices = [...prev.prices, price].slice(-1000);
                
                // Update counts (recalculate for last 100 for better accuracy on window sliding)
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
            setLoading(false);
        }
    };

    // Subscribe
    deriv.send({ ticks: symbol, subscribe: 1 }).catch(console.error);
    
    // Listen using DerivService observer
    const listenerId = deriv.observerInstance.on('deriv.tick', handleTick);

    return () => {
        // Unsubscribe from observer
        deriv.observerInstance.removeById(listenerId);
        // Optional: Send forget request if we want to stop stream strictly
        // deriv.send({ forget_all: 'ticks' }); 
    };
  }, [symbol]);

  // --- Calculations ---
  const last25Digits = stats.digits.slice(-25);
  const last100Digits = stats.digits.slice(-100);
  const last100Prices = stats.prices.slice(-100);

  // 1. Even/Odd (Last 25)
  const evenCount = last25Digits.filter(d => d % 2 === 0).length;
  const oddCount = last25Digits.length - evenCount;
  const evenPct = last25Digits.length ? ((evenCount / last25Digits.length) * 100).toFixed(0) : '0';
  const oddPct = last25Digits.length ? ((oddCount / last25Digits.length) * 100).toFixed(0) : '0';

  // 2. Most/Least Frequent (Last 100)
  // Using stats.digitCounts which is already based on last 100 in the effect above
  const maxCount = Math.max(...stats.digitCounts);
  const minCount = Math.min(...stats.digitCounts);
  const mostFreq = stats.digitCounts.map((c, i) => c === maxCount ? i : -1).filter(i => i !== -1).join(', ');
  const leastFreq = stats.digitCounts.map((c, i) => c === minCount ? i : -1).filter(i => i !== -1).join(', ');

  // 3. Price Direction (Last 100)
  let upCount = 0;
  let downCount = 0;
  for (let i = 1; i < last100Prices.length; i++) {
      if (last100Prices[i] > last100Prices[i-1]) upCount++;
      else if (last100Prices[i] < last100Prices[i-1]) downCount++;
  }
  const totalMoves = upCount + downCount;
  const upPct = totalMoves ? ((upCount / totalMoves) * 100).toFixed(0) : '0';
  const downPct = totalMoves ? ((downCount / totalMoves) * 100).toFixed(0) : '0';

  // 4. Probabilities (Digit Frequency %)
  const digitProbs = stats.digitCounts.map((count, digit) => ({
      digit,
      prob: last100Digits.length ? (count / last100Digits.length) * 100 : 0
  })).sort((a, b) => b.prob - a.prob);

  const highestProb = digitProbs[0];
  const lowestProb = digitProbs[digitProbs.length - 1];

  if (!symbol) return <div className="text-gray-500 p-4">Selecione um ativo</div>;

  return (
    <div className="w-full flex flex-col gap-4 h-full overflow-y-auto custom-scrollbar bg-[#13111c] border-l border-gray-800 p-4">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-2">
            <h3 className="font-bold text-white flex items-center gap-2">
                📊 Análise
                <span className="text-xs text-blue-400">{symbol}</span>
            </h3>
            {loading && <span className="text-xs text-yellow-500 animate-pulse">Sincronizando...</span>}
        </div>

        {/* 🎲 Probability Monitor (Block 3 Logic) */}
        <div className="bg-[#0d0a18] border border-gray-700 rounded-lg p-3">
            <div className="text-xs text-gray-400 mb-2 uppercase tracking-wider text-center">Probabilidade (100 Ticks)</div>
            
            <div className="flex justify-between items-center gap-2">
                {/* Highest */}
                <div className="flex flex-col items-center bg-green-900/20 border border-green-900/50 rounded p-2 flex-1">
                    <span className="text-[10px] text-green-400 uppercase">Maior</span>
                    <span className="text-2xl font-bold text-white my-1">{highestProb?.digit ?? '-'}</span>
                    <span className="text-xs text-green-400 font-mono">{highestProb?.prob.toFixed(1)}%</span>
                </div>

                {/* Middle Grid */}
                <div className="grid grid-cols-5 gap-1 flex-[2]">
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
                    <span className="text-2xl font-bold text-white my-1">{lowestProb?.digit ?? '-'}</span>
                    <span className="text-xs text-red-400 font-mono">{lowestProb?.prob.toFixed(1)}%</span>
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
                        <span className="text-green-400 font-bold">MAX: {mostFreq}</span>
                    </div>
                    <div className="w-px h-4 bg-gray-700"></div>
                    <div className="flex items-center gap-2">
                        <span className="text-red-400 font-bold">MIN: {leastFreq}</span>
                    </div>
                </div>
            </div>

            <div className="bg-[#1e1b2e] rounded-lg p-3 border border-gray-700">
                <div className="flex justify-between items-center mb-2">
                    <span className="text-xs text-gray-400">Par / Ímpar (25)</span>
                </div>
                <div className="flex items-center gap-2 h-6 bg-gray-800 rounded-full overflow-hidden relative">
                    <div className="h-full bg-blue-600 flex items-center justify-center text-[10px] text-white font-bold transition-all duration-500" style={{ width: `${evenPct}%` }}>
                        {parseInt(evenPct) > 20 && `PAR ${evenPct}%`}
                    </div>
                    <div className="h-full bg-orange-600 flex items-center justify-center text-[10px] text-white font-bold transition-all duration-500" style={{ width: `${oddPct}%` }}>
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
                <div className={`text-2xl transition-transform duration-300 ${stats.direction === 'up' ? 'text-green-500 -rotate-45' : stats.direction === 'down' ? 'text-red-500 rotate-45' : 'text-gray-500'}`}>
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

        {/* 🎲 Digit Sequence Display (Block 5) - New Block */}
        <div className="bg-[#1e1b2e] rounded-lg p-3 border border-gray-700">
             <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-gray-400">Últimos Dígitos</span>
            </div>
            <div className="flex flex-wrap gap-1">
                ➔
                {last25Digits.slice().reverse().map((digit, index) => {
                    // Color logic based on even/odd or specific value if needed
                    // Using blue for even, orange for odd to match previous block logic
                    const colorClass = digit % 2 === 0 ? 'text-blue-400' : 'text-orange-400';
                    return (
                        <span key={index} className={`text-lg font-bold ${colorClass} w-6 text-center`}>
                            {digit}
                        </span>
                    );
                })}
            </div>
        </div>

        {/* 🏆 Counters (Placeholder - Needs real data prop if available from engine) */}
        {/* This would ideally come from the BotExecutionEngine state passed down */}
        {/* <div className="bg-[#1e1b2e] rounded-lg p-3 border border-gray-700">
            <div className="text-xs text-gray-400 mb-2 uppercase text-center">Sessão Atual</div>
            <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                    <div className="text-green-400 font-bold text-xl">0</div>
                    <div className="text-[10px] text-gray-500">WINS</div>
                </div>
                <div className="text-center">
                    <div className="text-red-400 font-bold text-xl">0</div>
                    <div className="text-[10px] text-gray-500">LOSSES</div>
                </div>
            </div>
        </div> */}

    </div>
  );
}
