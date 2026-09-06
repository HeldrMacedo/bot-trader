"use client";

import React, { useState } from 'react';
import { EngineState, BearDifferEngine } from '@/app/services/BearDifferEngine';

interface LabTabProps {
  engine: BearDifferEngine;
  state: EngineState;
}

export default function LabTab({ engine, state }: LabTabProps) {
  const [selectedSym, setSelectedSym] = useState<string>(state.markets[0]?.sym || 'R_10');
  const [minN, setMinN] = useState(2000);
  const [alpha, setAlpha] = useState(0.01);

  const activeMarkets = state.markets.filter((m) => m.on);
  const familyTests = Math.max(1, activeMarkets.length * 4);
  const bias = engine.runBiasTests(selectedSym);

  let provenCount = 0;
  let readyCount = 0;

  activeMarkets.forEach((m) => {
    const res = engine.runBiasTests(m.sym);
    if (res && res.n >= minN) {
      readyCount++;
      const minP = Math.min(res.pU, res.pM, res.pR, res.pA) * familyTests;
      if (minP < alpha) provenCount++;
    }
  });

  return (
    <div className="space-y-4 text-xs">
      {/* Veredito Global */}
      <div className="bg-[#131925] border border-[#222c3f] rounded-lg p-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#8593aa] mb-2">
          Veredito global com correção de Bonferroni
        </h3>
        <p className="text-[11px] text-[#8593aa] mb-3">
          Todos os p-valores abaixo já vêm corrigidos por Bonferroni para a família de {familyTests} testes rodando
          ao mesmo tempo ({activeMarkets.length} mercados × 4 testes). Sem essa correção, testar múltiplos
          mercados simultaneamente geraria falsos positivos por puro acaso.
        </p>

        <div className="flex flex-wrap items-center gap-4 py-2 border-y border-[#222c3f] mb-3 font-mono">
          <div className="flex items-center gap-2">
            <span className="text-[#8593aa]">Amostra mínima por mercado:</span>
            <input
              type="number"
              min="200"
              value={minN}
              onChange={(e) => setMinN(parseInt(e.target.value, 10) || 2000)}
              className="w-24 bg-[#18202f] border border-[#222c3f] text-[#eef2f8] px-2 py-0.5 rounded text-center"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[#8593aa]">Significância exigida (α):</span>
            <input
              type="number"
              step="0.001"
              min="0.0001"
              max="0.2"
              value={alpha}
              onChange={(e) => setAlpha(parseFloat(e.target.value) || 0.01)}
              className="w-24 bg-[#18202f] border border-[#222c3f] text-[#eef2f8] px-2 py-0.5 rounded text-center"
            />
          </div>
        </div>

        <div
          className={`p-3 rounded border font-mono ${
            provenCount > 0
              ? 'bg-emerald-950/30 border-emerald-500/50 text-emerald-300'
              : 'bg-[#18202f] border-[#222c3f] text-[#8593aa]'
          }`}
        >
          {readyCount === 0
            ? 'Ainda sem amostra suficiente. O laboratório precisa de pelo menos 2.000 ticks para emitir veredito rigoroso.'
            : provenCount > 0
            ? `✓ Viés estatístico comprovado em ${provenCount} mercado(s) com significância estatística após correção de Bonferroni.`
            : 'Nenhum viés estatístico detectado. Os mercados analisados comportam-se como geradores aleatórios honestos.'}
        </div>
      </div>

      {/* Bateria de Testes */}
      <div className="bg-[#131925] border border-[#222c3f] rounded-lg p-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#8593aa] mb-2">
          Bateria de testes de aleatoriedade
        </h3>
        <p className="text-[11px] text-[#8593aa] mb-3">
          1. <b>Uniformidade:</b> frequência idêntica dos 10 dígitos (χ², 9 gl) · 2. <b>Markov:</b> dependência
          entre dígitos consecutivos (χ², 81 gl) · 3. <b>Repetição:</b> taxa de repetição contra 10% (binomial)
          · 4. <b>Autocorrelação:</b> correlação serial lag 1.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full font-mono text-left text-[11px]">
            <thead>
              <tr className="border-b border-[#222c3f] text-[#8593aa] uppercase text-[9.5px]">
                <th className="py-1.5 px-2">Mercado</th>
                <th className="py-1.5 px-2">N</th>
                <th className="py-1.5 px-2">Uniformidade</th>
                <th className="py-1.5 px-2">Markov</th>
                <th className="py-1.5 px-2">Repetição</th>
                <th className="py-1.5 px-2">Autocorr.</th>
                <th className="py-1.5 px-2">Veredito</th>
              </tr>
            </thead>
            <tbody>
              {activeMarkets.map((m) => {
                const res = engine.runBiasTests(m.sym);
                const pMin = res ? Math.min(res.pU, res.pM, res.pR, res.pA) * familyTests : 1;
                const isSig = res && res.n >= minN && pMin < alpha;

                return (
                  <tr key={m.sym} className="border-b border-[#222c3f]/40 hover:bg-[#18202f]/50">
                    <td className="py-2 px-2 font-bold text-[#eef2f8]">{m.sym}</td>
                    <td className="py-2 px-2 text-[#8593aa]">{res ? res.n : 0}</td>
                    <td className="py-2 px-2">
                      {res ? `p=${(res.pU * familyTests > 1 ? 1 : res.pU * familyTests).toFixed(3)}` : '—'}
                    </td>
                    <td className="py-2 px-2">
                      {res ? `p=${(res.pM * familyTests > 1 ? 1 : res.pM * familyTests).toFixed(3)}` : '—'}
                    </td>
                    <td className="py-2 px-2">
                      {res ? `p=${(res.pR * familyTests > 1 ? 1 : res.pR * familyTests).toFixed(3)}` : '—'}
                    </td>
                    <td className="py-2 px-2">
                      {res ? `p=${(res.pA * familyTests > 1 ? 1 : res.pA * familyTests).toFixed(3)}` : '—'}
                    </td>
                    <td className="py-2 px-2">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          isSig
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-[#18202f] text-[#8593aa]'
                        }`}
                      >
                        {isSig ? 'VIÉS CONFIRMADO' : 'NORMAL (SEM VIÉS)'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Matriz de Transição */}
      <div className="bg-[#131925] border border-[#222c3f] rounded-lg p-4">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#8593aa]">
              Matriz de transição (10x10)
            </h3>
            <p className="text-[11px] text-[#8593aa]">
              Cada célula é o desvio padronizado da transição "dígito da linha → dígito da coluna" contra o
              esperado. Em gerador honesto, tudo fica entre −3 e +3 sem padrão.
            </p>
          </div>
          <select
            value={selectedSym}
            onChange={(e) => setSelectedSym(e.target.value)}
            className="bg-[#18202f] border border-[#222c3f] text-[#eef2f8] px-2.5 py-1 rounded font-mono text-xs"
          >
            {activeMarkets.map((m) => (
              <option key={m.sym} value={m.sym}>
                {m.sym}
              </option>
            ))}
          </select>
        </div>

        {bias ? (
          <div className="overflow-x-auto">
            <table className="w-full font-mono text-center text-[10px] border border-[#222c3f]">
              <thead>
                <tr className="bg-[#18202f] text-[#8593aa]">
                  <th className="p-1 border border-[#222c3f]">Linha \ Coluna</th>
                  {Array.from({ length: 10 }, (_, i) => (
                    <th key={i} className="p-1 border border-[#222c3f]">
                      → {i}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bias.cells.map((row, r) => (
                  <tr key={r}>
                    <td className="p-1 font-bold bg-[#18202f] text-[#8593aa] border border-[#222c3f]">
                      {r} →
                    </td>
                    {row.map((cell, c) => (
                      <td
                        key={c}
                        className={`p-1 border border-[#222c3f] ${
                          cell > 2.5
                            ? 'bg-rose-500/30 text-rose-300 font-bold'
                            : cell < -2.5
                            ? 'bg-emerald-500/30 text-emerald-300 font-bold'
                            : 'text-[#8593aa]'
                        }`}
                      >
                        {cell > 0 ? `+${cell}` : cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-[#8593aa]">Selecione um mercado com pelo menos 200 ticks carregados.</p>
        )}
      </div>
    </div>
  );
}
