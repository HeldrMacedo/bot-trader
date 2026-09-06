"use client";

import React, { useState } from 'react';
import { EngineState, BearDifferEngine } from '@/app/services/BearDifferEngine';

interface ValidationTabProps {
  engine: BearDifferEngine;
  state: EngineState;
}

export default function ValidationTab({ engine, state }: ValidationTabProps) {
  const [selectedSym, setSelectedSym] = useState<string>(state.markets[0]?.sym || 'R_10');
  const [backtestResult, setBacktestResult] = useState<any>(null);
  const [wfResult, setWfResult] = useState<any>(null);
  const [permResult, setPermResult] = useState<any>(null);

  const digits = engine.getDigits(selectedSym);

  const handleBacktest = () => {
    if (digits.length < 60) return;
    const mg = {
      mode: state.config.mgMode,
      factor: state.config.mgFactor,
      maxLvl: state.config.mgMax,
      parts: state.config.mgParts,
      base: state.config.stake,
    };
    const res = engine.runStrategy(
      digits,
      state.config.minTicks,
      state.config.minScore,
      mg,
      state.payout
    );
    setBacktestResult(res);
  };

  const handleWalkForward = () => {
    if (digits.length < 120) return;
    const half = Math.floor(digits.length / 2);
    const mg = {
      mode: state.config.mgMode,
      factor: state.config.mgFactor,
      maxLvl: state.config.mgMax,
      parts: state.config.mgParts,
      base: state.config.stake,
    };
    const rTrain = engine.runStrategy(
      digits,
      state.config.minTicks,
      state.config.minScore,
      mg,
      state.payout,
      state.config.minTicks,
      half
    );
    const rTest = engine.runStrategy(
      digits,
      state.config.minTicks,
      state.config.minScore,
      mg,
      state.payout,
      half,
      digits.length
    );

    const trainAcc = rTrain.t > 0 ? (rTrain.win / rTrain.t) * 100 : 0;
    const testAcc = rTest.t > 0 ? (rTest.win / rTest.t) * 100 : 0;
    const drop = trainAcc - testAcc;

    setWfResult({
      trainAcc: +trainAcc.toFixed(2),
      testAcc: +testAcc.toFixed(2),
      drop: +drop.toFixed(2),
      trainTrades: rTrain.t,
      testTrades: rTest.t,
      trainPnl: rTrain.pnl,
      testPnl: rTest.pnl,
      passed: drop <= 1.5,
    });
  };

  const handlePermutation = () => {
    if (digits.length < 100) return;
    const mg = {
      mode: state.config.mgMode,
      factor: state.config.mgFactor,
      maxLvl: state.config.mgMax,
      parts: state.config.mgParts,
      base: state.config.stake,
    };
    const real = engine.runStrategy(
      digits,
      state.config.minTicks,
      state.config.minScore,
      mg,
      state.payout
    );
    const realAcc = real.t > 0 ? real.win / real.t : 0;

    let above = 0;
    const runs = 100;
    for (let r = 0; r < runs; r++) {
      // Embaralha uma cópia dos dígitos
      const shuffled = [...digits];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const temp = shuffled[i];
        shuffled[i] = shuffled[j];
        shuffled[j] = temp;
      }
      const sRes = engine.runStrategy(
        shuffled,
        state.config.minTicks,
        state.config.minScore,
        mg,
        state.payout
      );
      const sAcc = sRes.t > 0 ? sRes.win / sRes.t : 0;
      if (sAcc >= realAcc) above++;
    }

    const pPerm = (above + 1) / (runs + 1);
    setPermResult({
      realAcc: +(realAcc * 100).toFixed(2),
      pPerm: +pPerm.toFixed(4),
      runs,
      above,
      passed: pPerm < 0.05,
    });
  };

  return (
    <div className="space-y-4 text-xs">
      <div className="bg-[#131925] border border-[#222c3f] rounded-lg p-4">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#8593aa]">
              Validação estatística e anti-overfitting
            </h3>
            <p className="text-[11px] text-[#8593aa]">
              Testa a estratégia contra ilusões de ajuste ao passado e ruído temporal.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[#8593aa]">Mercado:</span>
            <select
              value={selectedSym}
              onChange={(e) => setSelectedSym(e.target.value)}
              className="bg-[#18202f] border border-[#222c3f] text-[#eef2f8] px-2 py-1 rounded font-mono"
            >
              {state.markets.map((m) => (
                <option key={m.sym} value={m.sym}>
                  {m.sym} ({engine.getDigits(m.sym).length} ticks)
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-2 border-t border-[#222c3f]">
          <button
            type="button"
            onClick={handleBacktest}
            disabled={digits.length < 60}
            className="px-3.5 py-2 bg-[#18202f] hover:bg-[#222c3f] border border-[#222c3f] hover:border-amber-500 rounded font-bold text-[#eef2f8] transition-colors disabled:opacity-40"
          >
            Rodar Backtest Simples
          </button>
          <button
            type="button"
            onClick={handleWalkForward}
            disabled={digits.length < 120}
            className="px-3.5 py-2 bg-[#18202f] hover:bg-[#222c3f] border border-[#222c3f] hover:border-amber-500 rounded font-bold text-[#eef2f8] transition-colors disabled:opacity-40"
          >
            Rodar Walk-Forward (50/50)
          </button>
          <button
            type="button"
            onClick={handlePermutation}
            disabled={digits.length < 100}
            className="px-3.5 py-2 bg-[#18202f] hover:bg-[#222c3f] border border-[#222c3f] hover:border-amber-500 rounded font-bold text-[#eef2f8] transition-colors disabled:opacity-40"
          >
            Teste de Permutação (100 shuffles)
          </button>
        </div>
      </div>

      {/* Resultados do Backtest */}
      {backtestResult && (
        <div className="bg-[#131925] border border-[#222c3f] rounded-lg p-4">
          <h4 className="font-bold text-[#eef2f8] mb-2 uppercase text-[11px] tracking-wider text-[#8593aa]">
            Resultado do Backtest · {selectedSym}
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
            <div className="bg-[#18202f] p-2.5 rounded">
              <span className="text-[#8593aa] block text-[10px]">OPERAÇÕES</span>
              <b className="text-sm text-[#eef2f8]">{backtestResult.t}</b>
            </div>
            <div className="bg-[#18202f] p-2.5 rounded">
              <span className="text-[#8593aa] block text-[10px]">ACERTO</span>
              <b className="text-sm text-emerald-400">
                {backtestResult.t > 0
                  ? `${((backtestResult.win / backtestResult.t) * 100).toFixed(2)}%`
                  : '—'}
              </b>
            </div>
            <div className="bg-[#18202f] p-2.5 rounded">
              <span className="text-[#8593aa] block text-[10px]">PNL ACUMULADO</span>
              <b
                className={`text-sm ${
                  backtestResult.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {backtestResult.pnl >= 0
                  ? `+$${backtestResult.pnl.toFixed(2)}`
                  : `-$${Math.abs(backtestResult.pnl).toFixed(2)}`}
              </b>
            </div>
            <div className="bg-[#18202f] p-2.5 rounded">
              <span className="text-[#8593aa] block text-[10px]">MAX DRAWDOWN</span>
              <b className="text-sm text-amber-400">${backtestResult.dd.toFixed(2)}</b>
            </div>
          </div>
        </div>
      )}

      {/* Resultados do Walk-Forward */}
      {wfResult && (
        <div className="bg-[#131925] border border-[#222c3f] rounded-lg p-4">
          <h4 className="font-bold text-[#eef2f8] mb-2 uppercase text-[11px] tracking-wider text-[#8593aa]">
            Walk-Forward Analysis (1ª metade vs 2ª metade)
          </h4>
          <div className="p-3 bg-[#18202f] rounded border border-[#222c3f] mb-3">
            <div className="flex items-center gap-3">
              <span
                className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                  wfResult.passed
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-rose-500/20 text-rose-400'
                }`}
              >
                {wfResult.passed ? 'APROVADO' : 'SUSPEITA DE OVERFITTING'}
              </span>
              <span className="text-xs text-[#8593aa]">
                Queda no teste fora da amostra: <b>{wfResult.drop}%</b> (limite máximo tolerável: 1.5%)
              </span>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
            <div className="bg-[#18202f] p-2.5 rounded">
              <span className="text-[#8593aa] block text-[10px]">TREINO (ACERTO)</span>
              <b className="text-sm text-[#eef2f8]">{wfResult.trainAcc}%</b>
              <span className="text-[9px] text-[#8593aa] block">({wfResult.trainTrades} trades)</span>
            </div>
            <div className="bg-[#18202f] p-2.5 rounded">
              <span className="text-[#8593aa] block text-[10px]">TESTE (ACERTO)</span>
              <b className="text-sm text-amber-400">{wfResult.testAcc}%</b>
              <span className="text-[9px] text-[#8593aa] block">({wfResult.testTrades} trades)</span>
            </div>
            <div className="bg-[#18202f] p-2.5 rounded">
              <span className="text-[#8593aa] block text-[10px]">PNL TREINO</span>
              <b className="text-sm text-emerald-400">+${wfResult.trainPnl.toFixed(2)}</b>
            </div>
            <div className="bg-[#18202f] p-2.5 rounded">
              <span className="text-[#8593aa] block text-[10px]">PNL TESTE</span>
              <b
                className={`text-sm ${
                  wfResult.testPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {wfResult.testPnl >= 0
                  ? `+$${wfResult.testPnl.toFixed(2)}`
                  : `-$${Math.abs(wfResult.testPnl).toFixed(2)}`}
              </b>
            </div>
          </div>
        </div>
      )}

      {/* Resultados da Permutação */}
      {permResult && (
        <div className="bg-[#131925] border border-[#222c3f] rounded-lg p-4">
          <h4 className="font-bold text-[#eef2f8] mb-2 uppercase text-[11px] tracking-wider text-[#8593aa]">
            Teste de Permutação (Destruição da Ordem Temporal)
          </h4>
          <div className="p-3 bg-[#18202f] rounded border border-[#222c3f]">
            <div className="flex items-center gap-3">
              <span
                className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                  permResult.passed
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-[#222c3f] text-[#8593aa]'
                }`}
              >
                {permResult.passed ? 'PADRÃO TEMPORAL REAL DETECTADO' : 'INDISTINGUÍVEL DO ACASO'}
              </span>
              <span className="text-xs text-[#8593aa]">
                P-valor da permutação: <b>p={permResult.pPerm}</b> (em {permResult.runs} permutações,{' '}
                {permResult.above} superaram o resultado real).
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
