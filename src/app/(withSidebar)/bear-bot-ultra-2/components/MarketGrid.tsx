"use client";

import { BotConfig, BotState, MARKETS, buildLoserSet, AIMode, AIWeights, AI_MODE_WEIGHTS } from '../../../services/bearbot2.types';
import HelpTip from './HelpTip';

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

const AI_MODE_LABELS: Record<AIMode, string> = {
  conservative: 'Conservador',
  balanced: 'Equilibrado',
  aggressive: 'Agressivo',
  custom: 'Personalizado',
};

const WEIGHTS_HINT =
  'Cada campo diz quanto aquele pilar pesa no Score de Oportunidade (0 a 100). Os valores são normalizados, '
  + 'então só a proporção importa: 50/50/50/50 dá o mesmo score que 25/25/25/25. Peso 0 remove o pilar da conta; '
  + 'soma zero cai para o preset Equilibrado. O score resultante decide o veto de entrada automática (abaixo do '
  + 'Score mínimo a IA bloqueia) e a disputa de foco no modo Múltiplos Mercados. Os pesos valem só enquanto a página '
  + 'estiver aberta.';

const MIN_SCORE_HINT =
  'Score de Oportunidade mínimo para a IA liberar uma entrada automática (padrão 40). Abaixo dele a entrada é vetada, '
  + 'exceto na Recuperação Ativa (após um loss real) ou com o Loss Virtual (ligado) já confirmado. Mais alto = menos entradas e '
  + 'mais seletivas; 0 desliga o veto. No modo Múltiplos Mercados, o mercado em foco só é trocado por outro de score '
  + 'maior enquanto estiver acima deste mínimo. Mercados ainda coletando histórico não são vetados.';

const AI_WEIGHT_FIELDS: { key: keyof AIWeights; label: string; hint: string }[] = [
  {
    key: 'pressure',
    label: 'Pressão',
    hint: 'Peso da pressão dos dígitos perdedores: o quanto eles saem acima ou abaixo do esperado nas janelas de 10, 25 e 50 ticks. '
      + 'Subir este peso faz a IA esperar o mercado "descansar" antes de liberar entrada. É o único pilar que sempre '
      + 'tem medida real, então ele é a escolha segura quando padrão A→B e Loss Virtual estão desligados.',
  },
  {
    key: 'pattern',
    label: 'Padrão A→B',
    hint: 'Peso da qualidade do par A→B detectado (força, Wilson, lift e estabilidade). Só sai de zero com o padrão '
      + 'armado — com o gatilho de padrão desligado este pilar vale 0 e qualquer peso aqui derruba o score, podendo '
      + 'travar o bot abaixo do Score mínimo.',
  },
  {
    key: 'vl',
    label: 'Loss Virtual',
    hint: 'Peso do avanço da contagem de perdas virtuais rumo à quantidade exigida. Com Loss Virtual desligado o pilar '
      + 'fica fixo em 100% e apenas infla o score; em Contagem sob Foco, mercados fora do foco ficam em 50%. Use peso '
      + 'alto para só entrar com a contagem madura.',
  },
  {
    key: 'sync',
    label: 'Sincronia',
    hint: 'Peso da confirmação cruzada: quantos dos outros mercados têm o mesmo A→B armado agora (feeds parados não '
      + 'contam). Sem padrão A→B definido vale 0. Peso alto exige concordância entre mercados e reduz muito a '
      + 'frequência de entradas.',
  },
];

/** Converte o peso (fração 0..1) para o inteiro em % mostrado no campo. */
function toPercent(w: number) {
  return Math.round((w || 0) * 100);
}

export default function MarketGrid({ config, state, updateConfig }: MarketGridProps) {
  const weights: AIWeights = config.aiWeights ?? AI_MODE_WEIGHTS.balanced;
  const weightSum = toPercent(weights.pressure) + toPercent(weights.pattern) + toPercent(weights.vl) + toPercent(weights.sync);

  const selectAiMode = (m: AIMode) => {
    if (m === 'custom') {
      // Semeia o personalizado com os pesos do preset ativo: o clique não move o score.
      const seed = config.aiMode === 'custom' ? weights : (AI_MODE_WEIGHTS[config.aiMode] ?? AI_MODE_WEIGHTS.balanced);
      updateConfig({ aiMode: 'custom', aiWeights: { ...seed } });
      return;
    }
    updateConfig({ aiMode: m, aiWeights: { ...AI_MODE_WEIGHTS[m] } });
  };

  const setWeight = (key: keyof AIWeights, raw: string) => {
    const pct = Math.max(0, Math.min(100, Number(raw) || 0));
    updateConfig({ aiWeights: { ...weights, [key]: pct / 100 } });
  };

  const setMinScore = (raw: string) => {
    // Campo vazio (usuário apagando para redigitar) não pode virar 0: 0 desliga o veto da IA.
    const n = Number(raw);
    if (raw.trim() === '' || !Number.isFinite(n)) return;
    updateConfig({ aiMinScore: Math.max(0, Math.min(100, Math.round(n))) });
  };

  const lose = buildLoserSet(config.mode, config.digit, config.comboUnder, config.comboOver);

  return (
    <div className="bg-[#131925] border border-[#222c3f] rounded-xl p-4 shadow-xl">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-[#8593aa] flex items-center gap-2">
          <span className="text-lg">🧠</span> IA CROSS-MARKET — SCORE DE OPORTUNIDADE
        </h2>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5">
            <span className="text-[10px] text-[#8593aa] flex items-center gap-1.5">
              Score mín.:
              <HelpTip label="Score mínimo" hint={MIN_SCORE_HINT} idPrefix="min-score-hint" wide />
            </span>
            <input
              type="number"
              min="0"
              max="100"
              data-testid="ai-min-score"
              value={config.aiMinScore}
              onChange={(e) => setMinScore(e.target.value)}
              className="w-14 bg-[#070b14] border border-[#2e3a52] text-white px-2 py-1 rounded-lg font-mono text-[10px] focus:outline-none focus:border-indigo-500"
            />
          </label>
          <span className="text-[10px] text-[#8593aa]">Modo IA:</span>
          <div className="flex bg-[#070b14] border border-[#2e3a52] rounded-lg p-0.5">
            {(['conservative', 'balanced', 'aggressive', 'custom'] as const).map(m => (
              <button key={m} data-testid={`ai-mode-${m}`} onClick={() => selectAiMode(m)} className={`px-2 py-1 text-[10px] font-bold rounded transition-all uppercase ${config.aiMode === m ? "bg-indigo-600 text-white" : "text-[#8593aa] hover:text-[#eef2f8]"}`}>
                {AI_MODE_LABELS[m]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {config.aiMode === 'custom' && (
        <div className="mb-4 p-3 rounded-lg bg-[#0e131d] border border-[#222c3f]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#8593aa] flex items-center gap-1.5">
              Pesos dos pilares (%)
              <HelpTip label="Pesos dos pilares" hint={WEIGHTS_HINT} idPrefix="weight-hint" wide />
            </span>
            <span data-testid="ai-weight-sum" className={`text-[10px] font-mono ${weightSum === 0 ? 'text-yellow-400' : 'text-[#8593aa]'}`}>
              {weightSum === 0 ? 'Soma 0 · usando preset Equilibrado' : `Soma ${weightSum}% · normalizada`}
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {AI_WEIGHT_FIELDS.map(f => (
              <label key={f.key} className="flex flex-col gap-1">
                <span className="text-[10px] text-[#8593aa] flex items-center gap-1.5">
                  {f.label}
                  <HelpTip label={f.label} hint={f.hint} idPrefix="weight-hint" />
                </span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  data-testid={`ai-weight-${f.key}`}
                  value={toPercent(weights[f.key])}
                  onChange={(e) => setWeight(f.key, e.target.value)}
                  className="w-full bg-[#070b14] border border-[#2e3a52] text-white px-2 py-1.5 rounded-lg font-mono text-xs focus:outline-none focus:border-indigo-500"
                />
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {MARKETS.map((m) => {
          const isSelected = config.activeSym === m.sym;
          const data = state.tickData[m.sym];
          const rawIntel = state.marketIntel[m.sym];
          // Only surface intelligence once the market has enough history; until then
          // every pillar is a neutral placeholder and a score would be misleading.
          const intel = rawIntel?.dataReady ? rawIntel : null;
          const collecting = !!rawIntel && !rawIntel.dataReady;
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
                {collecting && (
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-[#18202f] text-[#8593aa] border border-[#2e3a52] animate-pulse">
                    Coletando
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

              {collecting && (
                <div className="text-[9px] font-bold mb-2 text-[#8593aa]">
                  ◌ AGUARDANDO HISTÓRICO
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
