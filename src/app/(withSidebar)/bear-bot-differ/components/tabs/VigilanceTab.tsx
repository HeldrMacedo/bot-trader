import React, { useState, useEffect } from 'react';
import { EngineState, BearDifferEngine } from '@/app/services/BearDifferEngine';
import { binomP } from '@/app/services/BearDifferMath';

interface VigilanceTabProps {
  engine: BearDifferEngine;
  state: EngineState;
}

export default function VigilanceTab({ engine, state }: VigilanceTabProps) {
  const [minSignals, setMinSignals] = useState(500);
  const [alpha, setAlpha] = useState(0.01);
  const [lastCheckTime, setLastCheckTime] = useState<string>(new Date().toLocaleTimeString('pt-BR'));
  const [alerts, setAlerts] = useState<Array<{ id: string; time: string; msg: string; type: 'ok' | 'warn' }>>([]);

  const activeMarkets = state.markets.filter((m) => m.on);
  const activeLogics = engine.getLogics().filter((L) => !L.wide || state.config.wideScan);
  // Bonferroni family: 4 lab tests + logic performance per active market
  const familyTests = Math.max(1, activeMarkets.length * (4 + activeLogics.length));

  const handleRunNow = () => {
    setLastCheckTime(new Date().toLocaleTimeString('pt-BR'));
    let detectedBreak = false;

    activeMarkets.forEach((m) => {
      const bias = engine.runBiasTests(m.sym);
      const digits = engine.getDigits(m.sym);

      // Fonte 1: Bateria do laboratório
      if (bias && digits.length >= 300) {
        const minP = Math.min(bias.pU, bias.pM, bias.pR, bias.pA) * familyTests;
        if (minP < alpha) {
          detectedBreak = true;
          setAlerts((prev) => [
            {
              id: `${Date.now()}-${m.sym}-lab`,
              time: new Date().toLocaleTimeString('pt-BR'),
              msg: `${m.sym} — quebra detectada na bateria do laboratório (p=${minP.toExponential(2)})`,
              type: 'warn',
            },
            ...prev.slice(0, 50),
          ]);
        }
      }

      // Fonte 2: Desempenho medido das lógicas
      activeLogics.forEach((L) => {
        const st = engine.getLogicMarketStats(L.id, m.sym);
        if (st.n >= minSignals) {
          const be = 1 / state.payout;
          const pVal = binomP(st.w, st.n, be) * familyTests;
          if (pVal < alpha) {
            detectedBreak = true;
            setAlerts((prev) => [
              {
                id: `${Date.now()}-${m.sym}-${L.id}`,
                time: new Date().toLocaleTimeString('pt-BR'),
                msg: `${m.sym} — quebra detectada na lógica ${L.name} (p=${pVal.toExponential(2)})`,
                type: 'warn',
              },
              ...prev.slice(0, 50),
            ]);
          }
        }
      });
    });

    if (!detectedBreak && alerts.length === 0) {
      setAlerts([
        {
          id: `${Date.now()}`,
          time: new Date().toLocaleTimeString('pt-BR'),
          msg: 'Varredura concluída: todos os mercados operando dentro da normalidade estocástica.',
          type: 'ok',
        },
      ]);
    }
  };

  useEffect(() => {
    const timer = setInterval(() => {
      handleRunNow();
    }, 5000);
    return () => clearInterval(timer);
  }, [minSignals, alpha, activeMarkets.length, activeLogics.length]);

  return (
    <div className="space-y-4 text-xs">
      <div className="bg-[#131925] border border-[#222c3f] rounded-lg p-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#8593aa] mb-2">
          Vigilância dos mercados
        </h3>
        <p className="text-[11px] text-[#8593aa] mb-3">
          Roda sozinha a cada 5 segundos em todos os mercados ligados. Cruza a bateria do laboratório com o
          desempenho medido de cada lógica. Um mercado só é marcado como quebra quando passa no teste após a
          correção de Bonferroni para a família inteira de testes ({familyTests} testes simultâneos).
        </p>

        <div className="flex flex-wrap items-center gap-4 py-2 border-y border-[#222c3f] mb-3 font-mono">
          <div className="flex items-center gap-2">
            <span className="text-[#8593aa]">Sinais mínimos por lógica:</span>
            <input
              type="number"
              min="100"
              value={minSignals}
              onChange={(e) => setMinSignals(parseInt(e.target.value, 10) || 500)}
              className="w-20 bg-[#18202f] border border-[#222c3f] text-[#eef2f8] px-2 py-0.5 rounded text-center"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[#8593aa]">Significância (α):</span>
            <input
              type="number"
              step="0.005"
              min="0.001"
              max="0.1"
              value={alpha}
              onChange={(e) => setAlpha(parseFloat(e.target.value) || 0.01)}
              className="w-20 bg-[#18202f] border border-[#222c3f] text-[#eef2f8] px-2 py-0.5 rounded text-center"
            />
          </div>
          <button
            type="button"
            onClick={handleRunNow}
            className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded shadow transition-colors ml-auto"
          >
            Rodar agora
          </button>
        </div>

        <div className="p-3 bg-[#18202f] rounded border border-[#222c3f] text-emerald-400 font-mono mb-4 flex justify-between">
          <span>✓ Monitoramento ativo · Última checagem às {lastCheckTime}.</span>
          <span className="text-[#8593aa]">{activeMarkets.length} mercados ativos</span>
        </div>

        {/* Tabela de Status */}
        <h4 className="font-bold text-[#eef2f8] uppercase text-[11px] tracking-wider text-[#8593aa] mb-2">
          Status dos Mercados Monitorados
        </h4>
        <div className="overflow-x-auto">
          <table className="w-full font-mono text-left text-[11px]">
            <thead>
              <tr className="border-b border-[#222c3f] text-[#8593aa] uppercase text-[9.5px]">
                <th className="py-1.5 px-2">Mercado</th>
                <th className="py-1.5 px-2">Ticks</th>
                <th className="py-1.5 px-2">Status</th>
                <th className="py-1.5 px-2">P-Valor Corrigido</th>
                <th className="py-1.5 px-2">Repetição</th>
                <th className="py-1.5 px-2">Leitura</th>
              </tr>
            </thead>
            <tbody>
              {activeMarkets.map((m) => {
                const bias = engine.runBiasTests(m.sym);
                const digits = engine.getDigits(m.sym);
                const pMin = bias ? Math.min(bias.pU, bias.pM, bias.pR, bias.pA) * familyTests : 1;

                let label = 'ESTÁVEL';
                let badgeClass = 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
                let reading = 'Dentro do ruído normal';

                if (digits.length < 300) {
                  label = 'COLETANDO AMOSTRA';
                  badgeClass = 'bg-[#18202f] text-[#8593aa] border border-[#222c3f]';
                  reading = 'Aguardando 300 ticks mínimos';
                } else if (pMin < alpha) {
                  label = 'QUEBRA DETECTADA';
                  badgeClass = 'bg-rose-500/20 text-rose-400 border border-rose-500/30 font-bold';
                  reading = 'Desvio estatístico relevante com Bonferroni';
                } else if (pMin < alpha * 3 || (bias && Math.abs(bias.zR) > 2.0)) {
                  label = 'EM OBSERVAÇÃO';
                  badgeClass = 'bg-amber-500/20 text-amber-400 border border-amber-500/30 font-bold';
                  reading = 'Flutuação próxima do limiar crítico';
                }

                return (
                  <tr key={m.sym} className="border-b border-[#222c3f]/40 hover:bg-[#18202f]/50">
                    <td className="py-2 px-2 font-bold text-[#eef2f8]">{m.sym}</td>
                    <td className="py-2 px-2 text-[#8593aa]">{digits.length}</td>
                    <td className="py-2 px-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] ${badgeClass}`}>
                        {label}
                      </span>
                    </td>
                    <td className="py-2 px-2">{bias ? pMin.toFixed(4) : '—'}</td>
                    <td className="py-2 px-2">
                      {bias ? `${(bias.repRate * 100).toFixed(2)}%` : '—'}
                    </td>
                    <td className="py-2 px-2 text-[#8593aa]">{reading}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Alertas da Sessão */}
      <div className="bg-[#131925] border border-[#222c3f] rounded-lg p-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#8593aa] mb-2">
          Alertas da sessão
        </h3>
        <div className="max-h-48 overflow-y-auto font-mono text-[11px] space-y-1">
          {alerts.length > 0 ? (
            alerts.map((al) => (
              <div
                key={al.id}
                className={`py-1 px-2 rounded border ${
                  al.type === 'warn'
                    ? 'bg-rose-950/30 border-rose-500/40 text-rose-300'
                    : 'bg-[#18202f] border-[#222c3f] text-[#8593aa]'
                }`}
              >
                <b>{al.time}</b> · {al.msg}
              </div>
            ))
          ) : (
            <p className="text-[#8593aa]">Nenhum alerta de quebra detectado desde que a sessão começou.</p>
          )}
        </div>
      </div>
    </div>
  );
}
