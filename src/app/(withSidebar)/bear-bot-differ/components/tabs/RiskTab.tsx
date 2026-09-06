"use client";

import React, { useState } from 'react';
import { EngineState, BearDifferEngine } from '@/app/services/BearDifferEngine';
import { calculateKelly, simulateMonteCarloRuin } from '@/app/services/BearDifferMath';
import { MonteCarloResult } from '@/app/services/beardiffer.types';

interface RiskTabProps {
  engine: BearDifferEngine;
  state: EngineState;
}

export default function RiskTab({ engine, state }: RiskTabProps) {
  const [bankroll, setBankroll] = useState(100);
  const [runs, setRuns] = useState(1000);
  const [steps, setSteps] = useState(200);
  const [mcResult, setMcResult] = useState<MonteCarloResult | null>(null);

  // Calcula taxa de acerto observada ou 90.9%
  const observedAcc =
    state.virt.total >= 50
      ? state.virt.hit / state.virt.total
      : 1 / state.payout;

  const kelly = calculateKelly(observedAcc, state.payout);

  const handleSimulate = () => {
    const mg = {
      mode: state.config.mgMode,
      factor: state.config.mgFactor,
      maxLvl: state.config.mgMax,
      parts: state.config.mgParts,
      base: state.config.stake,
    };
    const res = simulateMonteCarloRuin(
      observedAcc,
      state.payout,
      state.config.stake,
      bankroll,
      mg,
      runs,
      steps
    );
    setMcResult(res);
  };

  return (
    <div className="space-y-4 text-xs">
      {/* Critério de Kelly */}
      <div className="bg-[#131925] border border-[#222c3f] rounded-lg p-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#8593aa] mb-2">
          Dimensionamento pelo critério de Kelly
        </h3>
        <p className="text-[11px] text-[#8593aa] mb-3">
          Mede a fração matemática ótima da banca a ser arriscada por operação para maximizar a taxa de
          crescimento do capital no longo prazo.
        </p>

        <div className="p-3 bg-[#18202f] rounded border border-[#222c3f] flex items-center justify-between flex-wrap gap-2">
          <div className="font-mono">
            Fração ótima de Kelly: <b className="text-amber-400 text-sm">{(kelly * 100).toFixed(2)}%</b>
          </div>
          <div className="text-[11px] text-[#8593aa]">
            {kelly <= 0 ? (
              <span className="text-rose-400 font-bold">
                ⚠️ Kelly negativo: tamanho ótimo é zero (a casa tem vantagem ou acerto está abaixo do equilíbrio).
              </span>
            ) : (
              <span className="text-emerald-400 font-bold">✓ Vantagem estatística positiva detectada.</span>
            )}
          </div>
        </div>
      </div>

      {/* Simulação Monte Carlo */}
      <div className="bg-[#131925] border border-[#222c3f] rounded-lg p-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#8593aa] mb-2">
          Simulação Monte Carlo de ruína
        </h3>
        <p className="text-[11px] text-[#8593aa] mb-3">
          Projeta milhares de sessões estocásticas com a sua configuração exata de Martingale e payout real.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          <div>
            <label className="text-[#8593aa] block mb-1">Banca inicial ($)</label>
            <input
              type="number"
              min="10"
              value={bankroll}
              onChange={(e) => setBankroll(parseFloat(e.target.value) || 100)}
              className="w-full bg-[#18202f] border border-[#222c3f] text-[#eef2f8] px-2 py-1.5 rounded font-mono"
            />
          </div>
          <div>
            <label className="text-[#8593aa] block mb-1">Nº de sessões (simulações)</label>
            <input
              type="number"
              min="100"
              max="10000"
              value={runs}
              onChange={(e) => setRuns(parseInt(e.target.value, 10) || 1000)}
              className="w-full bg-[#18202f] border border-[#222c3f] text-[#eef2f8] px-2 py-1.5 rounded font-mono"
            />
          </div>
          <div>
            <label className="text-[#8593aa] block mb-1">Operações por sessão</label>
            <input
              type="number"
              min="50"
              max="1000"
              value={steps}
              onChange={(e) => setSteps(parseInt(e.target.value, 10) || 200)}
              className="w-full bg-[#18202f] border border-[#222c3f] text-[#eef2f8] px-2 py-1.5 rounded font-mono"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={handleSimulate}
          className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded shadow transition-colors"
        >
          Executar Simulação Monte Carlo
        </button>

        {mcResult && (
          <div className="mt-4 pt-4 border-t border-[#222c3f] space-y-3">
            <h4 className="font-bold text-[#eef2f8] uppercase text-[11px] tracking-wider text-[#8593aa]">
              Resultado da simulação ({mcResult.runs} sessões de {steps} trades)
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 font-mono">
              <div className="bg-[#18202f] p-2.5 rounded">
                <span className="text-[#8593aa] block text-[10px]">RISCO DE RUÍNA</span>
                <b
                  className={`text-sm ${
                    mcResult.ruinProb === 0
                      ? 'text-emerald-400'
                      : mcResult.ruinProb > 0.05
                      ? 'text-rose-400'
                      : 'text-amber-400'
                  }`}
                >
                  {(mcResult.ruinProb * 100).toFixed(2)}%
                </b>
              </div>
              <div className="bg-[#18202f] p-2.5 rounded">
                <span className="text-[#8593aa] block text-[10px]">LUCRO MEDIANO</span>
                <b
                  className={`text-sm ${
                    mcResult.medianPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {mcResult.medianPnl >= 0
                    ? `+$${mcResult.medianPnl.toFixed(2)}`
                    : `-$${Math.abs(mcResult.medianPnl).toFixed(2)}`}
                </b>
              </div>
              <div className="bg-[#18202f] p-2.5 rounded">
                <span className="text-[#8593aa] block text-[10px]">PIOR 5% (STRESS)</span>
                <b className="text-sm text-rose-400">${mcResult.p05.toFixed(2)}</b>
              </div>
              <div className="bg-[#18202f] p-2.5 rounded">
                <span className="text-[#8593aa] block text-[10px]">MELHOR 5%</span>
                <b className="text-sm text-emerald-400">+${mcResult.p95.toFixed(2)}</b>
              </div>
              <div className="bg-[#18202f] p-2.5 rounded">
                <span className="text-[#8593aa] block text-[10px]">MAX DRAWDOWN MEDIANO</span>
                <b className="text-sm text-amber-400">${mcResult.medianDrawdown.toFixed(2)}</b>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
