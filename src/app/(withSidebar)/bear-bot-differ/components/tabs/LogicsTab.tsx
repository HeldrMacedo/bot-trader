"use client";

import React from 'react';
import { EngineState, BearDifferEngine } from '@/app/services/BearDifferEngine';
import { benjaminiHochberg, binomP } from '@/app/services/BearDifferMath';

interface LogicsTabProps {
  engine: BearDifferEngine;
  state: EngineState;
}

export default function LogicsTab({ engine, state }: LogicsTabProps) {
  // Os mesmos parâmetros que o motor usa para eleger a lógica líder e montar o
  // rodízio. Em estado local eles mentiriam: a tela mudaria, o bot não.
  const minN = state.config.lgMinN;
  const qFdr = state.config.lgQ;

  const activeLogics = engine.getLogics().filter((L) => !L.wide || state.config.wideScan);
  const be = 1 / state.payout;

  // Custom calculation for ranking based on local minN and qFdr
  const rankingRows = activeLogics.map((L) => {
    // Collect sample from engine
    const ranking = engine.getLogicRanking();
    const existing = ranking.find((r) => r.lid === L.id);
    const n = existing?.n || 0;
    const acc = existing?.acc ?? null;
    const p = n >= minN && acc !== null ? binomP(Math.round(acc * n), n, be) : 1;
    return {
      lid: L.id,
      name: L.name,
      tag: L.tag,
      n,
      acc,
      p,
      ready: n >= minN,
    };
  });

  const bh = benjaminiHochberg(
    rankingRows.map((r) => ({ p: r.p, lid: r.lid })),
    qFdr
  );
  const passMap: Record<string, boolean> = {};
  bh.forEach((x) => {
    passMap[x.lid] = x.pass;
  });

  rankingRows.forEach((r) => {
    r['pass'] = r.ready && !!passMap[r.lid] && (r.acc || 0) > be;
  });

  rankingRows.sort((a, b) => {
    if (a['pass'] !== b['pass']) return a['pass'] ? -1 : 1;
    if (a.acc === null) return 1;
    if (b.acc === null) return -1;
    return b.acc - a.acc;
  });

  const approvedCount = rankingRows.filter((r) => r['pass']).length;

  return (
    <div className="space-y-4 text-xs">
      {/* Card 1: Ranking */}
      <div className="bg-[#131925] border border-[#222c3f] rounded-lg p-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#8593aa] mb-2">
          Dez lógicas em disputa
        </h3>
        <p className="text-[11px] text-[#8593aa] mb-3">
          Todas rodam ao mesmo tempo em todos os mercados ligados. A cada tick cada uma registra um sinal virtual e
          ele é conferido no tick seguinte — nada disso custa dinheiro. O ranking abaixo é o resultado dessa
          medição com controle de descoberta falsa (Benjamini-Hochberg).
        </p>

        <div className="flex flex-wrap items-center gap-4 py-2 border-y border-[#222c3f] mb-3 font-mono">
          <div className="flex items-center gap-2">
            <span className="text-[#8593aa]">Sinais mínimos:</span>
            <input
              type="number"
              min="50"
              aria-label="Sinais mínimos"
              value={minN}
              onChange={(e) =>
                engine.updateConfig({ lgMinN: parseInt(e.target.value, 10) || 150 })
              }
              className="w-20 bg-[#18202f] border border-[#222c3f] text-[#eef2f8] px-2 py-0.5 rounded text-center"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[#8593aa]">Taxa FDR (q):</span>
            <input
              type="number"
              step="0.01"
              min="0.01"
              max="0.5"
              aria-label="Taxa de descoberta falsa (q)"
              value={qFdr}
              onChange={(e) =>
                engine.updateConfig({ lgQ: parseFloat(e.target.value) || 0.1 })
              }
              className="w-20 bg-[#18202f] border border-[#222c3f] text-[#eef2f8] px-2 py-0.5 rounded text-center"
            />
          </div>
          <button
            type="button"
            onClick={() => engine.resetLogicsMeasurement()}
            className="px-3 py-1 bg-transparent hover:bg-[#18202f] text-[#8593aa] hover:text-[#eef2f8] border border-[#222c3f] rounded text-xs transition-colors"
          >
            Zerar medição
          </button>
          <div className="text-[11px] text-[#8593aa] ml-auto">
            Ponto de equilíbrio: <b className="text-amber-400">{(be * 100).toFixed(2)}%</b>
          </div>
        </div>

        <div
          className={`p-2.5 rounded border mb-3 font-mono ${
            approvedCount > 0
              ? 'bg-emerald-950/30 border-emerald-500/50 text-emerald-300'
              : 'bg-[#18202f] border-[#222c3f] text-[#8593aa]'
          }`}
        >
          {approvedCount > 0
            ? `✓ ${approvedCount} lógica(s) aprovada(s) com significância estatística acima do equilíbrio.`
            : 'Coletando sinais virtuais. Nenhuma lógica supera o acaso com a amostra atual.'}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full font-mono text-left text-[11px]">
            <thead>
              <tr className="border-b border-[#222c3f] text-[#8593aa] uppercase text-[9.5px]">
                <th className="py-1.5 px-2">#</th>
                <th className="py-1.5 px-2">Lógica</th>
                <th className="py-1.5 px-2">Tag</th>
                <th className="py-1.5 px-2">Amostra</th>
                <th className="py-1.5 px-2">Acerto</th>
                <th className="py-1.5 px-2">P-Valor Corrigido</th>
                <th className="py-1.5 px-2">Situação</th>
              </tr>
            </thead>
            <tbody>
              {rankingRows.map((r, idx) => (
                <tr key={r.lid} className="border-b border-[#222c3f]/40 hover:bg-[#18202f]/50">
                  <td className="py-2 px-2 text-[#8593aa]">{idx + 1}</td>
                  <td className="py-2 px-2 font-bold text-[#eef2f8]">{r.name}</td>
                  <td className="py-2 px-2 text-amber-400">{r.tag}</td>
                  <td className="py-2 px-2">{r.n}</td>
                  <td className="py-2 px-2 font-bold">
                    {r.acc !== null ? `${(r.acc * 100).toFixed(2)}%` : '—'}
                  </td>
                  <td className="py-2 px-2 text-[#8593aa]">
                    {r.p < 0.0001 ? '<0.0001' : r.p.toFixed(4)}
                  </td>
                  <td className="py-2 px-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        r['pass']
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-[#18202f] text-[#8593aa]'
                      }`}
                    >
                      {r['pass'] ? 'APROVADA' : r.ready ? 'DENTRO DO ACASO' : 'COLETANDO DADOS'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Card 2: Desempenho por Mercado */}
      <div className="bg-[#131925] border border-[#222c3f] rounded-lg p-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#8593aa] mb-2">
          Desempenho por mercado
        </h3>
        <p className="text-[11px] text-[#8593aa] mb-3">
          A mesma medição detalhada por símbolo. A coluna só ganha cor com amostra superior a 300 sinais.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full font-mono text-left text-[11px] border-collapse">
            <thead>
              <tr className="border-b border-[#222c3f] text-[#8593aa] uppercase text-[9.5px]">
                <th className="py-1.5 px-2">Lógica</th>
                {state.markets
                  .filter((m) => m.on)
                  .map((m) => (
                    <th key={m.sym} className="py-1.5 px-2 text-center">
                      {m.sym}
                    </th>
                  ))}
              </tr>
            </thead>
            <tbody>
              {activeLogics.map((L) => (
                <tr key={L.id} className="border-b border-[#222c3f]/40 hover:bg-[#18202f]/50">
                  <td className="py-2 px-2 font-bold text-[#eef2f8]">{L.name}</td>
                  {state.markets
                    .filter((m) => m.on)
                    .map((m) => {
                      const st = engine.getLogicMarketStats(L.id, m.sym);
                      if (st.n >= 20) {
                        const acc = (st.w / st.n) * 100;
                        const isAboveBe = acc >= be * 100;
                        return (
                          <td key={m.sym} className="py-2 px-2 text-center font-mono">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] ${
                                isAboveBe
                                  ? 'bg-emerald-950/40 text-emerald-300 font-bold border border-emerald-500/30'
                                  : 'bg-rose-950/40 text-rose-300 font-bold border border-rose-500/30'
                              }`}
                            >
                              {acc.toFixed(1)}%
                            </span>
                            <div className="text-[8.5px] text-[#8593aa] mt-0.5">n={st.n}</div>
                          </td>
                        );
                      }
                      return (
                        <td key={m.sym} className="py-2 px-2 text-center text-[#8593aa]">
                          {st.n > 0 ? `${st.n} ticks` : '—'}
                        </td>
                      );
                    })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Card 3: O que cada uma faz */}
      <div className="bg-[#131925] border border-[#222c3f] rounded-lg p-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#8593aa] mb-3">
          O que cada uma faz
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {activeLogics.map((L) => (
            <div key={L.id} className="p-3 bg-[#18202f] rounded border border-[#222c3f]">
              <div className="flex items-center justify-between mb-1">
                <b className="text-[#eef2f8] font-bold">{L.name}</b>
                <span className="text-[10px] text-amber-400 font-mono bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                  {L.tag}
                </span>
              </div>
              <p className="text-[11px] text-[#8593aa] leading-relaxed">{L.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
