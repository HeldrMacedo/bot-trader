"use client";

import { BotConfig, BotState, MARKETS, buildLoserSet } from '../../../services/bearbot2.types';

interface MarketGridProps {
  config: BotConfig;
  state: BotState;
  updateConfig: (u: Partial<BotConfig>) => void;
}

function getIntelColor(score: number) {
  if (score >= 80) return { bg: 'bg-green-500/10', border: 'border-green-500/30', text: 'text-green-400', bar: 'from-green-500 to-emerald-400' };
  if (score >= 60) return { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400', bar: 'from-blue-500 to-cyan-400' };
  if (score >= 40) return { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', text: 'text-yellow-400', bar: 'from-yellow-500 to-amber-400' };
  if (score >= 20) return { bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-400', bar: 'from-orange-500 to-red-400' };
  return { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400', bar: 'from-red-600 to-red-400' };
}

function getRecLabel(rec: string) {
  switch (rec) {
    case 'strong_buy': return '⭐ COMPRA FORTE';
    case 'buy': return '✓ COMPRA';
    case 'neutral': return '◌ NEUTRO';
    case 'avoid': return '✕ EVITAR';
    case 'strong_avoid': return '⛔ EVITAR FORTE';
    default: return '◌ NEUTRO';
  }
}

export default function MarketGrid({ config, state, updateConfig }: MarketGridProps) {
  const lose = buildLoserSet(config.mode, config.digit, config.comboUnder, config.comboOver);

  return (
    <div className="bg-[#131925] border border-[#222c3f] rounded-xl p-4 shadow-xl">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-[#8593aa] flex items-center gap-2">
          <span className="text-lg">🧠</span> IA CROSS-MARKET — SCORE DE OPORTUNIDADE
        </h2>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-[#8593aa]">Modo IA:</span>
          <div className="flex bg-[#070b14] border border-[#2e3a52] rounded-lg p-0.5">
            {(['conservative', 'balanced', 'aggressive'] as const).map(m => (
              <button key={m} onClick={() => updateConfig({ aiMode: m })} className={`px-2 py-1 text-[10px] font-bold rounded transition-all uppercase ${config.aiMode === m ? "bg-indigo-600 text-white" : "text-[#8593aa] hover:text-[#eef2f8]"}`}>
                {m === 'conservative' ? 'Conservador' : m === 'balanced' ? 'Equilibrado' : 'Agressivo'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {MARKETS.map((m) => {
          const isSelected = config.activeSym === m.sym;
          const data = state.tickData[m.sym];
          const intel = state.marketIntel[m.sym];
          const colors = intel ? getIntelColor(intel.opportunityScore) : getIntelColor(0);
          const vlSym = state.vlBySym?.[m.sym];
          const activeDigitVal = state.autoDigitBySym?.[m.sym] ?? (data?.digits && data.digits.length > 0 ? data.digits[data.digits.length - 1] : null);
          const marketTargetDigit = (config.mode === 'differ' && config.differAutoDigit && activeDigitVal !== null) ? activeDigitVal : config.digit;
          const marketLose = buildLoserSet(config.mode, marketTargetDigit, config.comboUnder, config.comboOver);
          const lossCount = config.multiOn
            ? (vlSym?.count ?? 0)
            : (isSelected ? state.vlCount : 0);
          const vlSeenDisplay = config.multiOn
            ? (vlSym?.seen ?? 0)
            : state.vlSeen;
          const showVlLoss = config.vlOn && (config.multiOn || isSelected);

          return (
            <div key={m.sym} onClick={() => updateConfig({ activeSym: m.sym })} className={`p-3 rounded-lg border cursor-pointer transition-all ${isSelected ? "bg-[#18202f] border-indigo-500 shadow-[0_0_12px_rgba(99,102,241,0.2)]" : "bg-[#0e131d] border-[#222c3f] hover:bg-[#18202f]/50"}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold truncate max-w-[100px]">{m.nm}</span>
                {intel && (
                  <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${colors.bg} ${colors.text} border ${colors.border}`}>
                    {intel.opportunityScore}
                  </span>
                )}
              </div>

              {intel && (
                <div className="w-full bg-[#18202f] h-1.5 rounded-full overflow-hidden mb-2">
                  <div style={{ width: `${intel.opportunityScore}%` }} className={`h-full bg-gradient-to-r ${colors.bar} transition-all duration-500`} />
                </div>
              )}

              {intel && (
                <div className={`text-[9px] font-bold mb-2 ${colors.text}`}>
                  {getRecLabel(intel.recommendation)}
                </div>
              )}

              <div className="flex gap-1 overflow-hidden h-7 items-center justify-start mb-2">
                {data?.digits.slice(-8).map((d, index) => (
                  <span key={index} className={`w-6 h-6 flex items-center justify-center text-xs font-mono font-bold rounded ${marketLose.has(d) ? "bg-red-500/10 border border-red-500/20 text-red-400" : "bg-green-500/10 border border-green-500/20 text-green-400"}`}>
                    {d}
                  </span>
                )) || <span className="text-[10px] text-gray-500">Coletando...</span>}
              </div>

              {intel && (
                <div className="grid grid-cols-2 gap-1 text-[9px] font-mono mb-2 bg-[#070b14] p-1.5 rounded border border-[#2e3a52]">
                  <div className="flex justify-between"><span className="text-gray-500">Pressão:</span><span className={intel.pressure >= 60 ? "text-red-400" : intel.pressure >= 30 ? "text-yellow-400" : "text-green-400"}>{intel.pressure}%</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Padrão:</span><span className="text-purple-400">{intel.patternStrength}%</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">VL:</span><span className="text-green-400">{intel.vlProgress}%</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Sync:</span><span className="text-yellow-400">{intel.syncScore}%</span></div>
                </div>
              )}

              <div className="flex justify-between items-center pt-2 border-t border-[#222c3f] text-[10px] text-[#8593aa]">
                <span>Último: <strong className="font-mono text-cyan-400">{data?.price != null ? Number(data.price).toFixed(m.pip) : '—'}</strong></span>
              </div>

              {showVlLoss && (
                <div className="mt-1.5 text-[10px] text-[#8593aa]">
                  Loss: <strong className="font-mono text-red-400">
                    {config.vlFocusOnly && !isSelected ? (
                      '—'
                    ) : config.mode === 'differ' && config.differAutoDigit ? (
                      lossCount > 0 && activeDigitVal !== null ? (
                        <>
                          {`Dígito ${activeDigitVal}: `}
                          {lossCount}/{config.vlQty}
                          {config.vlMode === 'accum' && ` (janela ${vlSeenDisplay}/${config.vlWindow})`}
                        </>
                      ) : (
                        '—'
                      )
                    ) : (
                      `${lossCount}/${config.vlQty}${config.vlMode === 'accum' ? ` (janela ${vlSeenDisplay}/${config.vlWindow})` : ''}`
                    )}
                  </strong>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
