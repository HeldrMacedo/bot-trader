import React from 'react';
import { EngineState, BearDifferEngine } from '@/app/services/BearDifferEngine';
import { WatchStatus } from '@/app/services/beardiffer.types';

interface VigilanceTabProps {
  engine: BearDifferEngine;
  state: EngineState;
}

const STATUS_LABEL: Record<WatchStatus, string> = {
  normal: 'ESTÁVEL',
  observacao: 'EM OBSERVAÇÃO',
  quebra: 'QUEBRA DETECTADA',
  amostra: 'COLETANDO AMOSTRA',
};

const STATUS_CLASS: Record<WatchStatus, string> = {
  normal: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
  observacao: 'bg-amber-500/20 text-amber-400 border border-amber-500/30 font-bold',
  quebra: 'bg-rose-500/20 text-rose-400 border border-rose-500/30 font-bold',
  amostra: 'bg-[#18202f] text-[#8593aa] border border-[#222c3f]',
};

export default function VigilanceTab({ engine, state }: VigilanceTabProps) {
  const activeMarkets = state.markets.filter((m) => m.on);
  const activeLogics = engine.getLogics().filter((L) => !L.wide || state.config.wideScan);
  // Bonferroni family: markets x logics, as in the legacy scanner
  const familyTests = Math.max(1, activeMarkets.length * activeLogics.length);

  const breaches = activeMarkets.filter(
    (m) => state.watch[m.sym]?.status === 'quebra'
  ).length;

  return (
    <div className="space-y-4 text-xs">
      <div className="bg-[#131925] border border-[#222c3f] rounded-lg p-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#8593aa] mb-2">
          Vigilância dos mercados
        </h3>
        <p className="text-[11px] text-[#8593aa] mb-3">
          Roda sozinha a cada 5 segundos em todos os mercados ligados, mesmo com esta aba fechada. Cruza a
          bateria do laboratório com o desempenho medido de cada lógica. Um mercado só é marcado como quebra
          depois da correção de Bonferroni sobre a família inteira ({familyTests} testes simultâneos).
        </p>

        <div className="flex flex-wrap items-center gap-4 py-2 border-y border-[#222c3f] mb-3 font-mono">
          <div className="flex items-center gap-2">
            <span className="text-[#8593aa]">Sinais mínimos por lógica:</span>
            <input
              type="number"
              min="100"
              value={state.config.wtMinN}
              onChange={(e) =>
                engine.updateConfig({ wtMinN: parseInt(e.target.value, 10) || 500 })
              }
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
              value={state.config.wtAlpha}
              onChange={(e) =>
                engine.updateConfig({ wtAlpha: parseFloat(e.target.value) || 0.01 })
              }
              className="w-20 bg-[#18202f] border border-[#222c3f] text-[#eef2f8] px-2 py-0.5 rounded text-center"
            />
          </div>
          <button
            type="button"
            onClick={() => engine.runWatch()}
            className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded shadow transition-colors ml-auto"
          >
            Rodar agora
          </button>
        </div>

        <div
          className={`p-3 rounded border font-mono mb-4 ${
            breaches
              ? 'bg-rose-950/30 border-rose-500/40 text-rose-300'
              : 'bg-[#18202f] border-[#222c3f] text-emerald-400'
          }`}
        >
          {breaches ? (
            <span>
              <b>{breaches} mercado(s) com quebra confirmada.</b> Confira no laboratório antes de operar —
              quebra detectada é hipótese com evidência, não certeza.
            </span>
          ) : (
            <span>
              Nenhum mercado fora do padrão. Num gerador honesto é isso que tem que aparecer — a tela ficar
              verde o tempo todo é o funcionamento correto, não falta de sensibilidade.
            </span>
          )}
        </div>

        <h4 className="font-bold uppercase text-[11px] tracking-wider text-[#8593aa] mb-2">
          Status dos Mercados Monitorados
        </h4>
        <div className="overflow-x-auto">
          <table className="w-full font-mono text-left text-[11px]">
            <thead>
              <tr className="border-b border-[#222c3f] text-[#8593aa] uppercase text-[9.5px]">
                <th className="py-1.5 px-2">Mercado</th>
                <th className="py-1.5 px-2">Ticks</th>
                <th className="py-1.5 px-2">Status</th>
                <th className="py-1.5 px-2">Leitura</th>
              </tr>
            </thead>
            <tbody>
              {activeMarkets.map((m) => {
                const w = state.watch[m.sym];
                const status: WatchStatus = w?.status || 'amostra';
                return (
                  <tr key={m.sym} className="border-b border-[#222c3f]/40 hover:bg-[#18202f]/50">
                    <td className="py-2 px-2 font-bold text-[#eef2f8]">{m.sym}</td>
                    <td className="py-2 px-2 text-[#8593aa]">{engine.getDigits(m.sym).length}</td>
                    <td className="py-2 px-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] ${STATUS_CLASS[status]}`}>
                        {STATUS_LABEL[status]}
                      </span>
                    </td>
                    <td className="py-2 px-2 text-[#8593aa]">
                      {w?.txt || 'aguardando a primeira varredura'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-[#131925] border border-[#222c3f] rounded-lg p-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#8593aa] mb-2">
          Alertas da sessão
        </h3>
        <div className="max-h-48 overflow-y-auto font-mono text-[11px] space-y-1">
          {state.alerts.length > 0 ? (
            state.alerts.map((al) => (
              <div
                key={al.id}
                className="py-1 px-2 rounded border bg-rose-950/30 border-rose-500/40 text-rose-300"
              >
                <b>{al.time}</b> · {al.sym} — {al.txt}
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
