"use client";

import { BotConfig, BotState, MarketIntelligence, MARKETS, aiScoreMatches, buildLoserSet } from '../../../services/bearbot2.types';
import HelpTip from './HelpTip';

interface IntelPanelProps {
  config: BotConfig;
  state: BotState;
}

function getIntelColor(score: number) {
  if (score >= 80) return { bg: 'bg-green-500/10', border: 'border-green-500/30', text: 'text-green-400', bar: 'from-green-500 to-emerald-400' };
  if (score >= 60) return { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400', bar: 'from-blue-500 to-cyan-400' };
  if (score >= 40) return { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', text: 'text-yellow-400', bar: 'from-yellow-500 to-amber-400' };
  if (score >= 20) return { bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-400', bar: 'from-orange-500 to-red-400' };
  return { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400', bar: 'from-red-600 to-red-400' };
}

const PILLAR_HINTS = {
  pressure: 'Compara a frequência recente dos dígitos perdedores nas janelas de 10, 25 e 50 ticks com a frequência esperada do modo escolhido. Barra alta = perdedores saindo menos que o normal. Precisa de 50 ticks de histórico para medir; antes disso fica neutra em 50%.',
  pattern: 'Qualidade do par de dígitos A→B detectado neste mercado. Só sai de zero quando o padrão está armado (repetições exigidas + filtros de força, Wilson, lift e estabilidade); daí somam-se bônus por cada filtro superado.',
  vl: 'Quantas perdas virtuais já foram contadas em relação à quantidade exigida. Barra em 100% significa gate de Loss Virtual liberado para entrar. Com Loss Virtual desligado fica em 100%, e em mercados fora do foco fica em 50% por não haver contagem.',
  sync: 'Quantos dos outros mercados têm o mesmo padrão A→B armado neste momento. Mercados sem tick nos últimos 60s não contam como sincronizados, porque o padrão deles congela quando o stream cai. Zero na maior parte do tempo é normal.',
} as const;

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

export default function IntelPanel({ config, state }: IntelPanelProps) {
  const intel = state.marketIntel[config.activeSym];
  const colors = intel ? getIntelColor(intel.opportunityScore) : getIntelColor(0);
  const arr = state.tickData[config.activeSym]?.digits || [];
  const lose = buildLoserSet(config.mode, config.digit, config.comboUnder, config.comboOver);
  // O bloqueio segue o mesmo corte do gate da IA no motor (config.aiMinScore).
  const minScore = config.aiMinScore;
  const entryLevel = !intel || !aiScoreMatches(intel.opportunityScore, minScore) ? 'blocked'
    : intel.opportunityScore >= Math.max(60, minScore) ? 'good' : 'mid';

  const getObservedRate = () => {
    if (arr.length < 10) return 0;
    let w = 0;
    arr.forEach(x => { if (!lose.has(x)) w++; });
    return Math.round((w / arr.length) * 100);
  };

  const getTheoreticalRate = () => {
    if (config.mode === 'over') return ((9 - config.digit) / 10) * 100;
    if (config.mode === 'under') return (config.digit / 10) * 100;
    if (config.mode === 'combo') {
      const minD = Math.min(config.comboUnder ?? 4, config.comboOver ?? 5);
      const maxD = Math.max(config.comboUnder ?? 4, config.comboOver ?? 5);
      const winCount = minD + (9 - maxD);
      return Math.max(0, Math.min(100, winCount * 10));
    }
    return 90;
  };

  const obsRate = getObservedRate();
  const theoRate = getTheoreticalRate();

  return (
    <div className="bg-[#131925] border border-[#222c3f] rounded-xl p-4 shadow-xl flex flex-col gap-4">
      <h2 className="text-sm font-bold uppercase tracking-wider text-[#8593aa] flex items-center gap-2">
        <span className="text-lg">🧠</span> ANÁLISE DO MERCADO ATIVO
      </h2>

      {intel ? (
        <>
          <div className={`bg-[#0e131d] p-4 border ${colors.border} rounded-lg flex flex-col items-center gap-2`}>
            <span className="text-[10px] text-[#8593aa] uppercase tracking-wider">Score de Oportunidade</span>
            <span className={`text-4xl font-bold font-mono ${colors.text}`}>{intel.opportunityScore}</span>
            <div className="w-full bg-[#18202f] h-3 rounded-full overflow-hidden">
              <div style={{ width: `${intel.opportunityScore}%` }} className={`h-full bg-gradient-to-r ${colors.bar} transition-all duration-700`} />
            </div>
            <span className={`text-xs font-bold ${colors.text}`}>{getRecLabel(intel.recommendation)}</span>
          </div>

          <div className="flex flex-col gap-2">
            {[
              { label: 'Pressão de Perdedores', value: 100 - intel.pressure, text: 'text-cyan-400', bar: 'from-cyan-500 to-blue-400', hint: PILLAR_HINTS.pressure },
              { label: 'Força do Padrão A→B', value: intel.patternStrength, text: 'text-purple-400', bar: 'from-purple-500 to-pink-400', hint: PILLAR_HINTS.pattern },
              { label: 'Progresso Loss Virtual', value: intel.vlProgress, text: 'text-green-400', bar: 'from-green-500 to-emerald-400', hint: PILLAR_HINTS.vl },
              { label: 'Sincronia Cross-Market', value: intel.syncScore, text: 'text-yellow-400', bar: 'from-yellow-500 to-amber-400', hint: PILLAR_HINTS.sync },
            ].map((item) => (
              <div key={item.label} className="bg-[#0e131d] p-2 border border-[#222c3f] rounded-lg">
                <div className="flex justify-between items-center mb-1">
                  <span className={`text-[10px] ${item.text} font-bold flex items-center gap-1`}>
                    {item.label}
                    <HelpTip label={item.label} hint={item.hint} />
                  </span>
                  <span className={`text-xs font-mono font-bold ${item.text}`}>{item.value}%</span>
                </div>
                <div className="w-full bg-[#18202f] h-1.5 rounded-full overflow-hidden">
                  <div style={{ width: `${item.value}%` }} className={`h-full bg-gradient-to-r ${item.bar} transition-all duration-500`} />
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-4 bg-[#0e131d] p-3 border border-[#222c3f] rounded-lg">
            <div className="relative w-16 h-16">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" fill="transparent" stroke="#1e293b" strokeWidth="8" />
                <circle cx="50" cy="50" r="40" fill="transparent" stroke={obsRate >= 60 ? "#2eb84f" : obsRate <= 45 ? "#e23b32" : "#e9a92b"} strokeWidth="8" strokeDasharray={251.2} strokeDashoffset={251.2 * (1 - obsRate / 100)} className="transition-all duration-500" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center font-mono font-bold text-sm">
                <span>{obsRate}%</span>
              </div>
            </div>
            <div className="flex-1 text-xs flex flex-col gap-1">
              <div className="flex justify-between border-b border-[#222c3f] pb-1"><span className="text-gray-400">Teórico:</span><span className="font-mono font-bold text-cyan-400">{theoRate.toFixed(1)}%</span></div>
              <div className="flex justify-between border-b border-[#222c3f] pb-1"><span className="text-gray-400">Desvio:</span><span className="font-mono font-bold text-yellow-500">{(obsRate - theoRate) >= 0 ? "+" : ""}{(obsRate - theoRate).toFixed(1)}pp</span></div>
            </div>
          </div>

          <div className={`p-3 border rounded-lg flex items-center gap-3 transition-colors ${arr.length < 50 ? 'bg-[#0e131d] border-[#222c3f]' : entryLevel === 'good' ? 'bg-[#0d1f14] border-green-800' : entryLevel === 'mid' ? 'bg-[#1f1a0d] border-yellow-800' : 'bg-[#1f0d0f] border-red-800'}`}>
            <span className="text-2xl">{arr.length < 50 ? '⏳' : entryLevel === 'good' ? '🟢' : entryLevel === 'mid' ? '🟡' : '🔴'}</span>
            <div className="flex flex-col">
              <span className="text-[10px] text-[#8593aa] uppercase tracking-wider block">Momento p/ Entrar</span>
              <span className={`text-xs font-bold mt-0.5 ${arr.length < 50 ? 'text-gray-500' : entryLevel === 'good' ? 'text-green-400' : entryLevel === 'mid' ? 'text-yellow-400' : 'text-red-400'}`}>
                {arr.length < 50 ? 'coletando dados' : entryLevel === 'good' ? 'BOM MOMENTO — IA aprova entrada' : entryLevel === 'mid' ? 'ATENÇÃO — condições medianas' : 'ESPERE — IA bloqueia entrada'}
              </span>
            </div>
          </div>
        </>
      ) : (
        <div className="text-center text-gray-500 py-8">Coletando dados da IA...</div>
      )}

      {/* Top Oportunidades */}
      <div className="mt-2">
        <h3 className="text-sm font-bold uppercase tracking-wider text-[#8593aa] mb-3 flex items-center gap-2">
          <span className="text-lg">🏆</span> TOP OPORTUNIDADES
        </h3>
        <div className="flex flex-col gap-2">
          {Object.values(state.marketIntel)
            .sort((a: any, b: any) => b.opportunityScore - a.opportunityScore)
            .slice(0, 3)
            .map((intelItem: any, i) => {
              const m = MARKETS.find(mk => mk.sym === intelItem.sym);
              const c = getIntelColor(intelItem.opportunityScore);
              return (
                <div key={intelItem.sym} className={`flex items-center gap-3 p-2 rounded-lg border ${c.border} ${c.bg} transition-all`}>
                  <span className="text-lg font-bold text-gray-500 w-6 text-center">{i + 1}º</span>
                  <div className="flex-1">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-white">{m?.nm || intelItem.sym}</span>
                      <span className={`text-xs font-mono font-bold ${c.text}`}>{intelItem.opportunityScore}</span>
                    </div>
                    <div className="w-full bg-[#18202f] h-1 rounded-full overflow-hidden mt-1">
                      <div style={{ width: `${intelItem.opportunityScore}%` }} className={`h-full bg-gradient-to-r ${c.bar}`} />
                    </div>
                  </div>
                </div>
              );
            })}
          {Object.keys(state.marketIntel).length === 0 && (
            <div className="text-center text-gray-500 text-xs py-4">Aguardando ticks para ranquear...</div>
          )}
        </div>
      </div>
    </div>
  );
}
