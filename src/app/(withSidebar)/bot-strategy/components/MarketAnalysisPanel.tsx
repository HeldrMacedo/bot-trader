import React, { useEffect, useState, useRef, useMemo } from 'react';
import { DerivService } from '@/app/services/DerivService';
import { StrategyGroupProcessor, ParsedStrategy } from '../services/StrategyGroupProcessor';

interface MarketStats {
  digits: number[];
  prices: number[];
  digitCounts: number[]; // Index 0-9
  lastDigit: number | null;
  direction: 'up' | 'down' | 'equal';
}

interface MarketAnalysisPanelProps {
  symbol: string;
  strategyText?: string; // Optional strategy text to display groups
  generatedStrategy?: any;
  userKey?: string | null;
  lastTradeOutcome?: { result: 'WIN' | 'LOSS'; simulated: boolean } | null;
  cooldownTicksRemaining?: number;
  cooldownTicksTotal?: number;
  isTrading?: boolean;
}

export default function MarketAnalysisPanel({ symbol, strategyText, generatedStrategy, userKey, lastTradeOutcome, cooldownTicksRemaining, cooldownTicksTotal, isTrading }: MarketAnalysisPanelProps) {
  const [stats, setStats] = useState<MarketStats>({
    digits: [],
    prices: [],
    digitCounts: Array(10).fill(0),
    lastDigit: null,
    direction: 'equal'
  });

  const [parsedStrategy, setParsedStrategy] = useState<ParsedStrategy | null>(null);
  const [groupActivationConfig, setGroupActivationConfig] = useState<Record<string, any> | null>(null);
  const [openGroupDropdownId, setOpenGroupDropdownId] = useState<number | null>(null);
  const [jsonModalOpen, setJsonModalOpen] = useState(false);
  const [jsonCopied, setJsonCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const deriv = DerivService.getInstance();

  const groupConfigStorageKey = useRef<string>('');
  const groupSignatureRef = useRef<string>('');

  useEffect(() => {
    groupConfigStorageKey.current = userKey ? `monitoring_group_activation_config_${userKey}` : 'monitoring_group_activation_config_global';
  }, [userKey]);

  // Parse strategy when it changes
  useEffect(() => {
    if (strategyText) {
      const parsed = StrategyGroupProcessor.parseStrategyText(strategyText);
      setParsedStrategy(parsed);
    } else {
      setParsedStrategy(null);
    }
  }, [strategyText]);

  const groupsFromStrategy = useMemo(() => {
    const groups = generatedStrategy?.groups;
    if (Array.isArray(groups) && groups.length > 0) return groups;
    if (parsedStrategy?.groups?.length) {
      return parsedStrategy.groups.map(g => ({
        id: g.id,
        rules: g.rules.map((r, idx) => ({ id: `${g.id}-${idx}`, description: r }))
      }));
    }
    return [];
  }, [generatedStrategy, parsedStrategy]);

  const groupsSignature = useMemo(() => {
    try {
      const minimal = groupsFromStrategy.map((g: any) => ({
        id: g?.id,
        rules: (g?.rules || []).map((r: any) => ({
          id: r?.id,
          type: r?.type,
          indicator: r?.indicator,
          operator: r?.operator,
          value: r?.value,
          description: r?.description
        }))
      }));
      return JSON.stringify(minimal);
    } catch {
      return `${Date.now()}`;
    }
  }, [groupsFromStrategy]);

  useEffect(() => {
    const storageKey = groupConfigStorageKey.current || (userKey ? `monitoring_group_activation_config_${userKey}` : 'monitoring_group_activation_config_global');
    groupConfigStorageKey.current = storageKey;

    if (!groupsSignature || groupSignatureRef.current === groupsSignature) return;
    groupSignatureRef.current = groupsSignature;

    try {
      const raw = localStorage.getItem(storageKey);
      const parsed = raw ? JSON.parse(raw) : null;
      const storedSig = parsed?._meta?.groupsSignature;
      if (storedSig === groupsSignature && parsed) {
        setGroupActivationConfig(parsed);
        return;
      }

      const next: Record<string, any> = { _meta: { groupsSignature } };
      groupsFromStrategy.forEach((g: any, idx: number) => {
        const id = Number.isFinite(Number(g?.id)) ? Number(g.id) : idx + 1;
        next[id.toString()] = { initial: true, winReal: true, lossReal: true, winSimulated: true, lossSimulated: true };
      });
      localStorage.setItem(storageKey, JSON.stringify(next));
      setGroupActivationConfig(next);
      window.dispatchEvent(new CustomEvent('groupConfigUpdated'));
    } catch {
    }
  }, [groupsFromStrategy, groupsSignature, userKey]);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      const el = e.target as HTMLElement | null;
      if (!el) return;
      if (el.closest('[data-group-config-container]')) return;
      setOpenGroupDropdownId(null);
    };
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, []);

  const saveGroupActivation = (groupId: number, type: string, value: boolean) => {
    const storageKey = groupConfigStorageKey.current || (userKey ? `monitoring_group_activation_config_${userKey}` : 'monitoring_group_activation_config_global');
    groupConfigStorageKey.current = storageKey;

    setGroupActivationConfig(prev => {
      const next = { ...(prev || {}), _meta: { groupsSignature } };
      const k = groupId.toString();
      const existing = next[k] || { initial: true, winReal: true, lossReal: true, winSimulated: true, lossSimulated: true };
      next[k] = { ...existing, [type]: value };
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
        window.dispatchEvent(new CustomEvent('groupConfigUpdated'));
      } catch {
      }
      return next;
    });
  };

  const getActiveGroupIds = (): number[] | null => {
    const cfg = groupActivationConfig;
    if (!cfg) return null;
    const keys = Object.keys(cfg).filter(k => k !== '_meta');
    if (keys.length === 0) return null;

    if (!lastTradeOutcome) {
      const active: number[] = [];
      keys.forEach(k => {
        const c = cfg[k];
        if (!c || c.initial !== false) active.push(parseInt(k, 10));
      });
      return active;
    }

    const conditionKey = lastTradeOutcome.result === 'WIN'
      ? (lastTradeOutcome.simulated ? 'winSimulated' : 'winReal')
      : (lastTradeOutcome.simulated ? 'lossSimulated' : 'lossReal');

    const active: number[] = [];
    keys.forEach(k => {
      const c = cfg[k];
      if (!c || c[conditionKey] !== false) active.push(parseInt(k, 10));
    });
    return active;
  };

  const activeGroupIds = useMemo(() => getActiveGroupIds(), [groupActivationConfig, lastTradeOutcome]);

  const strategyJsonText = useMemo(() => {
    if (!generatedStrategy) return '';
    try {
      return JSON.stringify(generatedStrategy, null, 2);
    } catch {
      return String(generatedStrategy);
    }
  }, [generatedStrategy]);

  const copyStrategyJson = async () => {
    if (!strategyJsonText) return;
    try {
      await navigator.clipboard.writeText(strategyJsonText);
      setJsonCopied(true);
      setTimeout(() => setJsonCopied(false), 1200);
    } catch {
      const el = document.createElement('textarea');
      el.value = strategyJsonText;
      el.style.position = 'fixed';
      el.style.left = '-9999px';
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setJsonCopied(true);
      setTimeout(() => setJsonCopied(false), 1200);
    }
  };

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

  const cooldownRemaining = Number.isFinite(Number(cooldownTicksRemaining)) ? Number(cooldownTicksRemaining) : 0;
  const cooldownTotal = Number.isFinite(Number(cooldownTicksTotal)) ? Math.max(1, Number(cooldownTicksTotal)) : 1;
  const cooldownActive = cooldownRemaining > 0;
  const showCooldownOverlay = Boolean(isTrading) || cooldownActive;
  const cooldownProgress = cooldownActive ? ((cooldownTotal - cooldownRemaining) / cooldownTotal) * 100 : 0;

  return (
    <div className="relative w-full flex flex-col gap-4 h-full overflow-y-auto custom-scrollbar bg-[#13111c] border-l border-gray-800 p-4">

        {/* Header */}
        <div className="flex justify-between items-center mb-2">
            <h3 className="font-bold text-white flex items-center gap-2">
                📊 Análise
                <span className="text-xs text-blue-400">{symbol}</span>
            </h3>
            <div className="flex items-center gap-2">
              {generatedStrategy && (
                <button
                  type="button"
                  onClick={() => {
                    setJsonCopied(false);
                    setJsonModalOpen(true);
                  }}
                  className="text-xs text-gray-200 bg-gray-700 hover:bg-gray-600 border border-gray-600 rounded px-2 py-1"
                >
                  🔍 Ver JSON
                </button>
              )}
              {loading && <span className="text-xs text-yellow-500 animate-pulse">Sincronizando...</span>}
            </div>
        </div>

        {/* {showCooldownOverlay && !jsonModalOpen && (
          <div className="absolute inset-0 z-40 flex items-center justify-center bg-yellow-200/80 backdrop-blur-md rounded-lg">
            <div className="bg-gradient-to-br from-yellow-200 to-yellow-300 border border-white/70 rounded-2xl px-6 py-5 w-[85%] max-w-[320px] text-center shadow-2xl">
              <div className="text-pink-700 font-bold text-lg mb-3">📊 Contrato Aberto</div>

              <div className="w-[90px] h-[90px] rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mx-auto shadow-lg">
                <span className="text-white text-3xl font-bold">
                  {cooldownActive ? cooldownRemaining : '…'}
                </span>
              </div>

              <div className="mt-4 text-sm text-gray-700 font-semibold">
                {cooldownActive
                  ? `Aguardando ${cooldownRemaining} de ${cooldownTotal} tick${cooldownRemaining !== 1 ? 's' : ''}...`
                  : 'Aguardando resultado...'}
              </div>

              <div className="w-[200px] h-2 bg-white/50 rounded-full overflow-hidden mx-auto mt-4">
                <div
                  className="h-full bg-gradient-to-r from-green-500 to-emerald-400 transition-all duration-300"
                  style={{ width: `${Math.min(100, Math.max(0, cooldownProgress))}%` }}
                />
              </div>

              {cooldownActive && (
                <div className="mt-2 text-xs text-gray-600">
                  Progresso: <span className="font-bold">{Math.round(cooldownProgress)}%</span>
                </div>
              )}
            </div>
          </div>
        )} */}

        {/* Strategy Groups Display */}
        {(groupsFromStrategy.length > 0 || (parsedStrategy && parsedStrategy.groups.length > 0)) && (
          <div className="bg-[#0d0a18] border border-gray-700 rounded-lg p-3 mb-4">
            <div className="text-xs text-gray-400 mb-2 uppercase tracking-wider text-center">Grupos de Estratégia</div>

            <div className="space-y-2">
              {groupsFromStrategy.map((group: any, index: number) => {
                const groupId = Number.isFinite(Number(group?.id)) ? Number(group.id) : index + 1;
                const isActive = activeGroupIds === null || activeGroupIds.includes(groupId);
                const showDropdown = openGroupDropdownId === groupId;

                return (
                  <div
                    key={groupId}
                    className="border border-gray-600 rounded p-2 bg-[#1a1726] relative"
                    style={!isActive ? { opacity: 1 } : undefined}
                  >
                    {!isActive && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                        <div className="text-4xl drop-shadow-[0_0_18px_rgba(255,255,255,0.65)]">🔒</div>
                      </div>
                    )}

                    <div className="flex items-center gap-2 mb-1">
                      <div data-group-config-container className="relative">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenGroupDropdownId(prev => prev === groupId ? null : groupId);
                          }}
                          className="text-xs text-gray-300 bg-[#0d0a18] border border-gray-700 rounded px-2 py-1"
                          title="Configurar ativação deste grupo"
                        >
                          ▼
                        </button>

                        {showDropdown && (
                          <div
                            className="absolute left-0 top-8 z-20 w-56 bg-[#0d0a18] border border-gray-700 rounded p-2 text-xs text-gray-200"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="text-[10px] text-gray-400 mb-2">Ativar este grupo em:</div>
                            <div className="space-y-2">
                              <label className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={groupActivationConfig?.[groupId.toString()]?.initial !== false}
                                  onChange={(e) => saveGroupActivation(groupId, 'initial', e.target.checked)}
                                />
                                <span>🚀 Iniciar</span>
                              </label>
                              <div className="h-px bg-gray-700" />
                              <label className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={groupActivationConfig?.[groupId.toString()]?.winReal !== false}
                                  onChange={(e) => saveGroupActivation(groupId, 'winReal', e.target.checked)}
                                />
                                <span>Win Real</span>
                              </label>
                              <label className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={groupActivationConfig?.[groupId.toString()]?.lossReal !== false}
                                  onChange={(e) => saveGroupActivation(groupId, 'lossReal', e.target.checked)}
                                />
                                <span>Loss Real</span>
                              </label>
                              <label className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={groupActivationConfig?.[groupId.toString()]?.winSimulated !== false}
                                  onChange={(e) => saveGroupActivation(groupId, 'winSimulated', e.target.checked)}
                                />
                                <span>Win Sim</span>
                              </label>
                              <label className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={groupActivationConfig?.[groupId.toString()]?.lossSimulated !== false}
                                  onChange={(e) => saveGroupActivation(groupId, 'lossSimulated', e.target.checked)}
                                />
                                <span>Loss Sim</span>
                              </label>
                            </div>
                          </div>
                        )}
                      </div>

                      <span className="text-xs font-bold text-blue-400">GRUPO {groupId}</span>
                      <span className="text-xs text-gray-500">(AND)</span>
                    </div>

                    <div style={!isActive ? { opacity: 0.12, filter: 'grayscale(100%) blur(1px)' } : undefined}>
                      <div className="text-sm text-gray-300">
                        {(group.rules || []).map((rule: any, ruleIdx: number) => {
                          const text = (typeof rule === 'string'
                            ? rule
                            : (rule?.description || rule?.label || rule?.type || rule?.indicator || '')).toString().trim();

                          return (
                            <div key={rule?.id || ruleIdx} className="ml-4 flex items-center">
                              <span className="text-gray-500 mr-2">•</span>
                              <span className="text-cyan-300">{text}</span>
                              {ruleIdx < (group.rules?.length || 0) - 1 && (
                                <span className="text-blue-500 mx-1">E</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {index < groupsFromStrategy.length - 1 && (
                      <div className="text-center text-xs text-purple-400 mt-2">OU</div>
                    )}
                  </div>
                );
              })}

              {parsedStrategy && parsedStrategy.errors.length > 0 && (
                <div className="mt-3 p-2 bg-red-900/30 border border-red-700 rounded">
                  <div className="text-xs text-red-400 font-bold mb-1">Erros:</div>
                  <ul className="text-xs text-red-300">
                    {parsedStrategy.errors.map((error, idx) => (
                      <li key={idx} className="ml-4">• {error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {parsedStrategy && (
              <div className="mt-2 text-xs text-gray-500">
                Total: {parsedStrategy.totalGroups} grupo(s), {parsedStrategy.totalRules} regra(s)
                {parsedStrategy.isValid ? (
                  <span className="text-green-500 ml-2">✓ Válido</span>
                ) : (
                  <span className="text-red-500 ml-2">✗ Inválido</span>
                )}
              </div>
            )}
          </div>
        )}

        {jsonModalOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
            onClick={() => setJsonModalOpen(false)}
          >
            <div
              className="w-full max-w-3xl bg-[#0d0a18] border border-gray-700 rounded-lg overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700 bg-[#13111c]">
                <div className="text-sm font-semibold text-white">JSON da Estratégia</div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={copyStrategyJson}
                    className="text-xs text-white bg-blue-600 hover:bg-blue-500 rounded px-3 py-1.5"
                    disabled={!strategyJsonText}
                  >
                    {jsonCopied ? 'Copiado!' : 'Copiar'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setJsonModalOpen(false)}
                    className="text-xs text-gray-200 bg-gray-700 hover:bg-gray-600 rounded px-3 py-1.5"
                  >
                    Fechar
                  </button>
                </div>
              </div>
              <div className="p-4">
                <textarea
                  value={strategyJsonText || 'Nenhum JSON disponível.'}
                  readOnly
                  className="w-full h-[60vh] bg-[#0b0913] border border-gray-700 rounded p-3 text-xs text-gray-200 font-mono outline-none resize-none"
                />
              </div>
            </div>
          </div>
        )}

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
