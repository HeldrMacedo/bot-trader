"use client";

import React, { useState } from 'react';
import { EngineState, BearDifferEngine } from '@/app/services/BearDifferEngine';
import { DifferConfig } from '@/app/services/beardiffer.types';

interface OperationTabProps {
  engine: BearDifferEngine;
  state: EngineState;
  config: DifferConfig;
  updateConfig: (newConfig: Partial<DifferConfig>) => void;
  executeTrade: (sym: string, digit: number, analysisTickCount?: number) => Promise<void>;
  resetSession?: () => void;
  armVirtualLoss: (sym: string, digit: number, n: number) => void;
  cancelVirtualLoss: () => void;
  setWarmTarget: (sym: string | null, digit?: number) => void;
  vlossState: {
    armed: boolean;
    sym: string;
    targetDigit: number;
    targetLosses: number;
    seenLosses: number;
    ticksChecked: number;
  };
}

export default function OperationTab({
  engine,
  state,
  config,
  updateConfig,
  executeTrade,
  resetSession,
  armVirtualLoss,
  cancelVirtualLoss,
  setWarmTarget,
  vlossState,
}: OperationTabProps) {
  const [currentPick, setCurrentPick] = useState<{
    sym: string;
    digit: number;
    conf: number;
    why: string;
    n: number;
    // Contagem de ticks no instante da análise, para a trava de ticks vencidos
    tickCount: number;
  } | null>(null);

  const [scanMessage, setScanMessage] = useState<string>(
    'Aguardando amostra nos mercados ligados.'
  );

  const breakeven = +(1 / state.payout * 100).toFixed(1);
  const virtAcc =
    state.virt.total > 0
      ? +((state.virt.hit / state.virt.total) * 100).toFixed(1)
      : null;
  const simTotal = state.sim.win + state.sim.loss;
  const simAcc = simTotal > 0 ? +((state.sim.win / simTotal) * 100).toFixed(1) : null;
  const realTotal = state.real.win + state.real.loss;
  const realAcc = realTotal > 0 ? +((state.real.win / realTotal) * 100).toFixed(1) : null;

  const handleScan = () => {
    const pick = engine.deepScan(config.onceLogic);
    if (!pick) {
      setCurrentPick(null);
      setWarmTarget(null);
      if (config.onceLogic === 'auto' && !engine.leaderLogic()) {
        setScanMessage('Nenhuma lógica passou no teste de significância (Benjamini-Hochberg).');
      } else {
        setScanMessage('Amostra insuficiente ou mercados bloqueados.');
      }
      return;
    }
    if (pick.conf < config.onceMinConf) {
      setCurrentPick(null);
      setWarmTarget(null);
      setScanMessage(
        `Melhor alvo em ${pick.sym}, fora do ${pick.digit} — confiança ${pick.conf.toFixed(0)}%, abaixo do mínimo de ${config.onceMinConf}%.`
      );
      return;
    }

    setCurrentPick({ ...pick, tickCount: engine.getMarketData(pick.sym).tickCount });
    // Abre e mantém quente a proposta desse alvo enquanto ele estiver na tela
    setWarmTarget(pick.sym, pick.digit);
    setScanMessage(`Alvo detectado em ${pick.sym}: Fora do dígito ${pick.digit} (${pick.conf}% confiança)`);
  };

  const handleConfirm = () => {
    if (!currentPick) return;

    // O filtro de exaustão vale também na confirmação manual
    const blocked = engine.exhaustBlock(currentPick.sym, currentPick.digit);
    if (blocked) {
      setScanMessage(`Barrado pelo filtro de exaustão: ${blocked}.`);
      setCurrentPick(null);
      setWarmTarget(null);
      return;
    }

    if (config.vlossOn) {
      armVirtualLoss(currentPick.sym, currentPick.digit, config.vlossN);
      setCurrentPick(null);
    } else {
      executeTrade(currentPick.sym, currentPick.digit, currentPick.tickCount);
      setCurrentPick(null);
      setWarmTarget(null);
    }
  };

  const handleDiscard = () => {
    setCurrentPick(null);
    setWarmTarget(null);
    setScanMessage('Entrada descartada pelo usuário.');
  };

  // Melhor alvo para o card do motor 2.0
  const activeMarkets = state.markets.filter((m) => m.on);
  let bestMotor2Target: { sym: string; digit: number; score: number; sat: number; gap: number } | null = null;
  activeMarkets.forEach((m) => {
    const a = engine.analyze(m.sym);
    if (a && (!bestMotor2Target || a.best.score > bestMotor2Target.score)) {
      bestMotor2Target = {
        sym: m.sym,
        digit: a.best.digit,
        score: a.best.score,
        sat: a.best.sat,
        gap: a.best.gap,
      };
    }
  });

  return (
    <div className="space-y-4 text-xs">
      {/* Aviso de Probabilidade */}
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-amber-200 leading-relaxed text-[11.5px]">
        Índices sintéticos são geradores aleatórios com vantagem da casa. No Differ o payout exige cerca de{' '}
        <b className="font-mono text-amber-400">{breakeven}%</b> de acerto só para empatar. Este bot não promete
        vantagem: ele mede se existe uma, e trava a operação enquanto não existir.
      </div>

      {/* Card: Operação Única */}
      <div className="bg-[#131925] border border-[#222c3f] rounded-lg p-4 bg-gradient-to-br from-[#131925] to-[#18202f]">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#8593aa]">
            Operação única
          </h3>
          <span className="text-[10.5px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 font-mono">
            MANUAL / ASSISTIDA
          </span>
        </div>
        <p className="text-[11px] text-[#8593aa] mb-3">
          O bot não entra sozinho. Ele analisa todos os mercados liberados pela lógica escolhida, mostra o alvo e
          espera a sua decisão. Uma operação por vez.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
          <div>
            <label className="text-[#8593aa] block mb-1">Lógica</label>
            <select
              value={config.onceLogic}
              onChange={(e) => updateConfig({ onceLogic: e.target.value })}
              className="w-full bg-[#18202f] border border-[#222c3f] text-[#eef2f8] px-2.5 py-1.5 rounded font-mono text-xs"
            >
              <option value="auto">Alternância por evidência — a líder do ranking</option>
              <option value="rotate">Alternância em rodízio</option>
              <option value="recent">Alternância por desempenho recente</option>
              {engine.getLogics().map((L) => (
                <option key={L.id} value={L.id}>
                  {L.name} ({L.tag})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[#8593aa] block mb-1">Confiança mínima</label>
            <input
              type="number"
              min="50"
              max="99"
              value={config.onceMinConf}
              onChange={(e) => updateConfig({ onceMinConf: parseInt(e.target.value, 10) || 70 })}
              className="w-full bg-[#18202f] border border-[#222c3f] text-[#eef2f8] px-2.5 py-1.5 rounded font-mono text-xs"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1 border-t border-[#222c3f] mb-3">
          <label className="flex items-center gap-2 text-[#8593aa]">
            <input
              type="checkbox"
              checked={config.wideScan}
              onChange={(e) => updateConfig({ wideScan: e.target.checked })}
              className="accent-amber-500"
            />
            <span>Varredura ampla (16 lógicas)</span>
          </label>
          <label className="flex items-center gap-2 text-[#8593aa]">
            <input
              type="checkbox"
              checked={config.fastExec}
              onChange={(e) => updateConfig({ fastExec: e.target.checked })}
              className="accent-amber-500"
            />
            <span>Operação rápida (compra direta ⚡)</span>
          </label>
          <label className="flex items-center gap-2 text-[#8593aa]">
            <input
              type="checkbox"
              checked={config.exFilter}
              onChange={(e) => updateConfig({ exFilter: e.target.checked })}
              className="accent-amber-500"
            />
            <span>Filtro de exaustão (reversão)</span>
          </label>
          <label className="flex items-center gap-2 text-[#8593aa]">
            <input
              type="checkbox"
              checked={config.exOnlyLosers}
              onChange={(e) => updateConfig({ exOnlyLosers: e.target.checked })}
              className="accent-amber-500"
            />
            <span>Só dígitos que já deram loss</span>
          </label>
        </div>

        {/* Loss Virtual Control */}
        <div className="flex flex-wrap items-center gap-4 py-2 border-t border-[#222c3f] text-[#8593aa]">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={config.vlossOn}
              onChange={(e) => updateConfig({ vlossOn: e.target.checked })}
              className="accent-amber-500"
            />
            <span>Loss virtual ao confirmar:</span>
          </label>
          <div className="flex items-center gap-1">
            <input
              type="number"
              min="1"
              max="6"
              value={config.vlossN}
              onChange={(e) => updateConfig({ vlossN: parseInt(e.target.value, 10) || 1 })}
              className="w-14 bg-[#18202f] border border-[#222c3f] text-[#eef2f8] px-2 py-0.5 rounded font-mono text-center"
            />
            <span>loss(es)</span>
          </div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={config.vlossRepick}
              onChange={(e) => updateConfig({ vlossRepick: e.target.checked })}
              className="accent-amber-500"
            />
            <span>Refazer leitura ao disparar</span>
          </label>
        </div>

        {/* Termômetro de Exaustão */}
        <div className="mt-3 pt-2 border-t border-[#222c3f]">
          <div className="text-[11px] text-[#8593aa] mb-1.5 flex justify-between">
            <span>Termômetro de exaustão dos 10 dígitos</span>
            <span className="font-mono text-amber-400">
              {currentPick ? currentPick.sym : activeMarkets[0]?.sym || '—'}
            </span>
          </div>
          <div className="grid grid-cols-10 gap-1 font-mono text-[10px] text-center">
            {Array.from({ length: 10 }, (_, d) => {
              const sym = currentPick ? currentPick.sym : activeMarkets[0]?.sym || 'R_10';
              const ex = engine.getExhaustion(sym, d);
              const losers = engine.getLoserCount(sym, d);
              const isExhausted = ex?.ok;
              return (
                <div
                  key={d}
                  className={`p-1 rounded border transition-colors ${isExhausted
                      ? 'border-emerald-500 bg-emerald-950/40 text-emerald-300'
                      : 'border-[#222c3f] bg-[#18202f] text-[#8593aa]'
                    }`}
                >
                  <div className="font-bold">{d}</div>
                  <div className="text-[9px]">{ex ? `${ex.pct}%` : '—'}</div>
                  {losers > 0 && <div className="text-[8.5px] text-rose-400 font-bold">{losers}L</div>}
                </div>
              );
            })}
          </div>
        </div>

        {/* Status do Loss Virtual se armado */}
        {vlossState.armed && (
          <div className="mt-3 p-2.5 bg-amber-500/10 border border-amber-500/30 rounded text-amber-300 flex items-center justify-between">
            <div>
              ⚡ <b>Loss Virtual armado em {vlossState.sym} ≠{vlossState.targetDigit}:</b> {vlossState.seenLosses}/
              {vlossState.targetLosses} losses acumulados ({vlossState.ticksChecked} ticks checados).
            </div>
            <button
              type="button"
              onClick={cancelVirtualLoss}
              className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded text-xs font-semibold"
            >
              Cancelar
            </button>
          </div>
        )}

        {/* Caixa de Veredito / Alvo Detectado */}
        <div
          className={`mt-3 p-3 rounded border text-xs leading-relaxed ${currentPick
              ? 'bg-emerald-950/30 border-emerald-500/50 text-emerald-300'
              : 'bg-[#18202f] border-[#222c3f] text-[#8593aa]'
            }`}
        >
          {currentPick ? (
            <div>
              <div className="flex items-center gap-2 font-bold mb-1 text-sm">
                <span>🎯 Alvo: Mercado {currentPick.sym}</span>
                <span className="bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded border border-amber-500/30 font-mono">
                  Diferente de {currentPick.digit} (≠{currentPick.digit})
                </span>
                <span className="text-emerald-400 font-mono">{currentPick.conf}% confiança</span>
              </div>
              <div className="text-[11px] text-[#eef2f8] font-mono">{currentPick.why}</div>
              <div className="text-[10px] text-[#8593aa] mt-1">Amostra: {currentPick.n} ticks analisados.</div>
            </div>
          ) : (
            <div>{scanMessage}</div>
          )}
        </div>

        {/* Ações */}
        <div className="flex flex-wrap gap-2.5 mt-3 items-center">
          <button
            type="button"
            onClick={handleScan}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded shadow transition-colors"
          >
            Analisar mercados
          </button>
          {currentPick && (
            <>
              <button
                type="button"
                onClick={handleConfirm}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded transition-colors"
              >
                {config.vlossOn ? `Armar com ${config.vlossN} Loss Virtual` : 'Confirmar entrada'}
              </button>
              <button
                type="button"
                onClick={handleDiscard}
                className="px-4 py-2 bg-transparent hover:bg-[#222c3f] text-[#8593aa] border border-[#222c3f] rounded transition-colors"
              >
                Descartar
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => (resetSession ? resetSession() : engine.resetSession())}
            className="px-4 py-2 bg-transparent hover:bg-[#222c3f] text-[#8593aa] border border-[#222c3f] rounded transition-colors ml-auto"
          >
            Zerar sessão
          </button>
        </div>
      </div>

      {/* Card: Assertividade da Estratégia */}
      <div className="bg-[#131925] border border-[#222c3f] rounded-lg p-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#8593aa] mb-3">
          Assertividade da estratégia agora
        </h3>
        <div className="flex items-end gap-4 flex-wrap">
          <div className="font-mono text-4xl font-bold text-[#eef2f8]">
            {virtAcc !== null ? `${virtAcc}%` : '—%'}
          </div>
          <div>
            <span
              className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide ${virtAcc !== null && virtAcc >= breakeven
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-[#18202f] text-[#8593aa] border border-[#222c3f]'
                }`}
            >
              {state.virt.total < 50
                ? 'aguardando amostra'
                : virtAcc !== null && virtAcc >= breakeven
                  ? 'acima do equilíbrio'
                  : 'dentro do acaso'}
            </span>
            <p className="text-[11px] text-[#8593aa] mt-1">
              A cada tick em que o score fecha, o bot registra um sinal virtual e confere no tick seguinte.
            </p>
          </div>
        </div>

        {/* Barra de Progresso com Ponto de Equilíbrio */}
        <div className="h-2.5 bg-[#18202f] rounded-full overflow-hidden mt-3 relative">
          <div
            className="h-full bg-emerald-500 transition-all duration-300"
            style={{ width: `${Math.min(100, Math.max(0, virtAcc || 0))}%` }}
          />
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-amber-400 shadow"
            style={{ left: `${breakeven}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] font-mono text-[#8593aa] mt-1">
          <span>0%</span>
          <span className="text-amber-400 font-bold">equilíbrio {breakeven}%</span>
          <span>100%</span>
        </div>

        {/* Grid de Estatísticas */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 mt-4 pt-3 border-t border-[#222c3f]">
          <div className="bg-[#18202f] p-2 rounded text-center">
            <b className="block font-mono text-sm text-[#eef2f8]">{state.virt.total}</b>
            <span className="text-[9.5px] text-[#8593aa] uppercase">Sinais Virtuais</span>
          </div>
          <div className="bg-[#18202f] p-2 rounded text-center">
            <b className="block font-mono text-sm text-[#eef2f8]">{simTotal}</b>
            <span className="text-[9.5px] text-[#8593aa] uppercase">Ops Sim</span>
          </div>
          <div className="bg-[#18202f] p-2 rounded text-center">
            <b className="block font-mono text-sm text-[#eef2f8]">
              {simAcc !== null ? `${simAcc}%` : '—'}
            </b>
            <span className="text-[9.5px] text-[#8593aa] uppercase">Acerto Sim</span>
          </div>
          <div className="bg-[#18202f] p-2 rounded text-center">
            <b
              className={`block font-mono text-sm ${state.sim.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
            >
              {state.sim.pnl >= 0 ? `+$${state.sim.pnl.toFixed(2)}` : `-$${Math.abs(state.sim.pnl).toFixed(2)}`}
            </b>
            <span className="text-[9.5px] text-[#8593aa] uppercase">Resultado Sim</span>
          </div>
          <div className="bg-[#18202f] p-2 rounded text-center">
            <b className="block font-mono text-sm text-[#eef2f8]">{realTotal}</b>
            <span className="text-[9.5px] text-[#8593aa] uppercase">Ops Real</span>
          </div>
          <div className="bg-[#18202f] p-2 rounded text-center">
            <b className="block font-mono text-sm text-[#eef2f8]">
              {realAcc !== null ? `${realAcc}%` : '—'}
            </b>
            <span className="text-[9.5px] text-[#8593aa] uppercase">Acerto Real</span>
          </div>
          <div className="bg-[#18202f] p-2 rounded text-center">
            <b
              className={`block font-mono text-sm ${state.real.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
            >
              {state.real.pnl >= 0 ? `+$${state.real.pnl.toFixed(2)}` : `-$${Math.abs(state.real.pnl).toFixed(2)}`}
            </b>
            <span className="text-[9.5px] text-[#8593aa] uppercase">Resultado Real</span>
          </div>
          <div className="bg-[#18202f] p-2 rounded text-center">
            <b className="block font-mono text-sm text-amber-400">{state.mgLevel}</b>
            <span className="text-[9.5px] text-[#8593aa] uppercase">Nível Gale</span>
          </div>
        </div>
      </div>

      {/* Card: Melhor Alvo no Momento (Motor 2.0) */}
      <div className="bg-[#131925] border border-[#222c3f] rounded-lg p-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#8593aa] mb-3">
          Melhor alvo no momento (Motor 2.0 Referência)
        </h3>
        <div className="flex items-center gap-4 flex-wrap">
          <div className="w-16 h-16 rounded-xl bg-amber-500/10 border-2 border-amber-500 flex items-center justify-center font-mono text-3xl text-amber-400 font-bold">
            {bestMotor2Target ? bestMotor2Target.digit : '—'}
          </div>
          <div className="flex-1 min-w-[200px]">
            <b className="font-mono text-sm text-[#eef2f8]">
              {bestMotor2Target ? `${bestMotor2Target.sym} · Fora do dígito ${bestMotor2Target.digit}` : 'analisando…'}
            </b>
            <div className="text-[11px] text-[#8593aa] mt-0.5">
              {bestMotor2Target
                ? `z=${bestMotor2Target.sat} · gap ${bestMotor2Target.gap}`
                : 'Aguardando amostra nos mercados ligados.'}
            </div>
            <div className="h-2 bg-[#18202f] rounded-full overflow-hidden mt-2">
              <div
                className="h-full bg-indigo-500"
                style={{ width: `${Math.min(100, bestMotor2Target ? bestMotor2Target.score : 0)}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] font-mono text-[#8593aa] mt-0.5">
              <span>score {bestMotor2Target ? bestMotor2Target.score : 0}</span>
              <span>mínimo {config.minScore}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-3 mt-3 border-t border-[#222c3f] flex-wrap gap-2">
          <label className="flex items-center gap-2 text-[#8593aa] cursor-pointer">
            <input
              type="checkbox"
              checked={config.allowAuto}
              onChange={(e) =>
                updateConfig({
                  allowAuto: e.target.checked,
                  autoOn: e.target.checked ? config.autoOn : false,
                })
              }
              className="accent-amber-500"
            />
            <span>habilitar o automático</span>
          </label>
          {config.allowAuto && (
            <button
              type="button"
              onClick={() => updateConfig({ autoOn: !config.autoOn })}
              className={`px-3 py-1.5 rounded font-bold transition-colors shadow ${config.autoOn
                  ? 'bg-rose-600 hover:bg-rose-700 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                }`}
            >
              {config.autoOn ? 'Desligar automático' : 'Ligar automático'}
            </button>
          )}
        </div>

        {config.autoOn && (
          <div
            data-testid="auto-idle-status"
            className={`mt-3 p-2.5 rounded border font-mono text-[11px] ${state.autoIdleReason
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              }`}
          >
            {state.autoIdleReason
              ? `Automático ligado, sem entrar: ${state.autoIdleReason}.`
              : 'Automático ligado e liberado para entrar no próximo sinal.'}
          </div>
        )}
      </div>

      {/* Card: Leitura dos Mercados */}
      <div className="bg-[#131925] border border-[#222c3f] rounded-lg p-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#8593aa] mb-3">
          Leitura dos mercados
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full font-mono text-left text-[11px] border-collapse">
            <thead>
              <tr className="border-b border-[#222c3f] text-[#8593aa] uppercase text-[9.5px]">
                <th className="py-1.5 px-2">Mercado</th>
                <th className="py-1.5 px-2">Ticks</th>
                <th className="py-1.5 px-2">Alvo</th>
                <th className="py-1.5 px-2">Score</th>
                <th className="py-1.5 px-2">Exaustão</th>
                <th className="py-1.5 px-2">Gap</th>
                <th className="py-1.5 px-2">Viés</th>
                <th className="py-1.5 px-2 w-32">Distribuição</th>
              </tr>
            </thead>
            <tbody>
              {state.markets.map((m) => {
                const digits = engine.getDigits(m.sym);
                const a = engine.analyze(m.sym);
                const ex = a ? engine.getExhaustion(m.sym, a.best.digit) : null;
                const freq = new Array(10).fill(0);
                digits.slice(-100).forEach((d) => freq[d]++);

                return (
                  <tr key={m.sym} className="border-b border-[#222c3f]/50 hover:bg-[#18202f]/50">
                    <td className="py-2 px-2 font-bold text-[#eef2f8]">{m.sym}</td>
                    <td className="py-2 px-2 text-[#8593aa]">{digits.length}</td>
                    <td className="py-2 px-2 text-amber-400 font-bold">
                      {a ? `≠${a.best.digit}` : '—'}
                    </td>
                    <td className="py-2 px-2">{a ? a.best.score : '—'}</td>
                    <td className="py-2 px-2">
                      {ex ? (
                        <span className={ex.ok ? 'text-emerald-400 font-bold' : 'text-[#8593aa]'}>
                          {ex.pct}%
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="py-2 px-2 text-[#8593aa]">{a ? a.best.gap : '—'}</td>
                    <td className="py-2 px-2">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[9.5px] ${m.proven
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-[#18202f] text-[#8593aa]'
                          }`}
                      >
                        {m.proven ? 'COMPROVADO' : 'NÃO DETECTADO'}
                      </span>
                    </td>
                    <td className="py-2 px-2">
                      <div className="flex gap-0.5">
                        {freq.map((f, i) => (
                          <div
                            key={i}
                            className={`flex-1 h-3 rounded-xs text-[7.5px] flex items-center justify-center ${f > 15
                                ? 'bg-rose-500/40 text-rose-300'
                                : f < 5
                                  ? 'bg-emerald-500/40 text-emerald-300'
                                  : 'bg-[#222c3f] text-[#8593aa]'
                              }`}
                            title={`Dígito ${i}: ${f}%`}
                          >
                            {i}
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cards: Anomalias e Histórico */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-[#131925] border border-[#222c3f] rounded-lg p-3.5">
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-[#8593aa] mb-2">
            Analisador contínuo de anomalias
          </h3>
          <div className="max-h-48 overflow-y-auto font-mono text-[11px] space-y-1 text-[#8593aa]">
            {state.anomalies.length > 0 ? (
              state.anomalies.map((an) => (
                <div key={an.id} className="py-0.5 border-b border-[#222c3f]/40">
                  <b className="text-amber-400">{an.time}</b> · {an.msg}
                </div>
              ))
            ) : (
              <div>Sem desvios relevantes até agora.</div>
            )}
          </div>
        </div>

        <div className="bg-[#131925] border border-[#222c3f] rounded-lg p-3.5">
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-[#8593aa] mb-2">
            Histórico da sessão
          </h3>
          <div className="max-h-48 overflow-y-auto font-mono text-[11px] space-y-1">
            {state.logs.length > 0 ? (
              state.logs.map((l) => (
                <div key={l.id} className="py-0.5 border-b border-[#222c3f]/40 flex gap-2">
                  <span className="text-[#8593aa]">{l.time}</span>
                  <span
                    className={
                      l.cls === 'up'
                        ? 'text-emerald-400'
                        : l.cls === 'dn'
                          ? 'text-rose-400'
                          : l.cls === 'am'
                            ? 'text-amber-400'
                            : 'text-[#eef2f8]'
                    }
                  >
                    {l.msg}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-[#8593aa]">Nenhum registro ainda.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
