"use client";

import React, { useMemo, useState } from 'react';
import {
  EngineState,
  BearDifferEngine,
  ResolvedTarget,
} from '@/app/services/BearDifferEngine';
import { AutoSource, DifferConfig } from '@/app/services/beardiffer.types';
import TradeResultsTable from '../TradeResultsTable';

interface OperationTabProps {
  engine: BearDifferEngine;
  state: EngineState;
  config: DifferConfig;
  updateConfig: (newConfig: Partial<DifferConfig>) => void;
  executeTrade: (
    sym: string,
    digit: number,
    analysisTickCount?: number,
    logicId?: string
  ) => Promise<void>;
  resetSession?: () => void;
  armVirtualLoss: (sym: string, digit: number, n: number, logicId?: string) => void;
  cancelVirtualLoss: () => void;
  setWarmTarget: (sym: string | null, digit?: number) => void;
  exportCSV: () => void;
  vlossState: {
    armed: boolean;
    sym: string;
    targetDigit: number;
    targetLosses: number;
    seenLosses: number;
    ticksChecked: number;
  };
}

/**
 * Sem lógica escolhida não há métrica a mostrar: um mínimo de confiança na tela
 * só faria o operador procurar um número que não existe. Mostra-se a causa.
 */
function primeiraFrase(reason: string | null): string {
  if (!reason) return 'sem alvo';
  return reason.split('. ')[0];
}

/**
 * Confiança da lógica. Sem palpite a confiança é desconhecida, não é zero:
 * escrever "0%" faria uma lógica calada parecer uma lógica sem convicção.
 */
function textoConf(conf: number | null): string {
  return conf === null ? '—' : `${conf.toFixed(0)}%`;
}

/** Métrica que faz sentido para a fonte que produziu o alvo. */
function descreveMetrica(alvo: ResolvedTarget): string {
  const partes: string[] = [];
  if (alvo.score !== null) partes.push(`score ${alvo.score}`);
  if (alvo.conf !== null) partes.push(`confiança ${alvo.conf.toFixed(0)}%`);
  return partes.join(' · ') || 'sem métrica';
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
  exportCSV,
  vlossState,
}: OperationTabProps) {
  const [currentPick, setCurrentPick] = useState<{
    sym: string;
    digit: number;
    conf: number | null;
    score: number | null;
    // Lógica que de fato produziu o alvo, não o modo de alternância pedido
    lid: string;
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

  // Alvo ao vivo, recalculado só quando algum mercado avançou um tick. Esta aba
  // re-renderiza por muito mais motivos do que chegada de tick.
  const ticksTotais = state.markets.reduce(
    (acc, m) => acc + engine.getMarketData(m.sym).tickCount,
    0
  );
  const liveTarget = useMemo(
    () => engine.manualTarget(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [engine, ticksTotais, config, state.tradeLock, state.stopped]
  );

  const fonteUsaLogica = config.autoSource !== 'motor2';

  const handleScan = () => {
    const alvo = engine.manualTarget();
    if (alvo.reason || alvo.sym === null || alvo.digit === null) {
      setCurrentPick(null);
      setWarmTarget(null);
      setScanMessage(alvo.reason || 'Nenhum alvo disponível.');
      return;
    }

    setCurrentPick({
      sym: alvo.sym,
      digit: alvo.digit,
      conf: alvo.conf,
      score: alvo.score,
      lid: alvo.logicId,
      tickCount: engine.getMarketData(alvo.sym).tickCount,
    });
    // Abre e mantém quente a proposta desse alvo enquanto ele estiver na tela
    setWarmTarget(alvo.sym, alvo.digit);
    setScanMessage(
      `Alvo detectado em ${alvo.sym}: fora do dígito ${alvo.digit} · ${descreveMetrica(alvo)}`
    );
  };

  /**
   * Entrada direta no alvo ao vivo. Recalcula no clique porque um tick pode ter
   * chegado entre o render e o dedo do operador; a trava de ticks vencidos do
   * hook barra leitura realmente atrasada. Não usa proposta quente: o alvo muda
   * a cada tick e mantê-lo cotado encheria o WebSocket de propostas que vencem
   * sem uso.
   */
  const handleManualEntry = () => {
    const alvo = engine.manualTarget();
    if (alvo.reason || alvo.sym === null || alvo.digit === null) {
      setScanMessage(alvo.reason || 'Nenhum alvo disponível.');
      return;
    }

    if (config.vlossOn) {
      armVirtualLoss(alvo.sym, alvo.digit, config.vlossN, alvo.logicId);
      setScanMessage(
        `Loss Virtual armado em ${alvo.sym} ≠${alvo.digit} (${engine.getLogicName(alvo.logicId)}).`
      );
      return;
    }

    executeTrade(
      alvo.sym,
      alvo.digit,
      engine.getMarketData(alvo.sym).tickCount,
      alvo.logicId
    );
    setScanMessage(
      `Entrada manual enviada em ${alvo.sym} ≠${alvo.digit} (${engine.getLogicName(alvo.logicId)}).`
    );
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
      armVirtualLoss(currentPick.sym, currentPick.digit, config.vlossN, currentPick.lid);
      setCurrentPick(null);
    } else {
      executeTrade(
        currentPick.sym,
        currentPick.digit,
        currentPick.tickCount,
        currentPick.lid
      );
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
      {/* Aviso de Probabilidade, em largura cheia sobre as colunas */}
      <div data-testid="op-probability-warning">
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-amber-200 leading-relaxed text-[11.5px]">
          Índices sintéticos são geradores aleatórios com vantagem da casa. No Differ o payout exige cerca de{' '}
          <b className="font-mono text-amber-400">{breakeven}%</b> de acerto só para empatar. Este bot não promete
          vantagem: ele mede se existe uma, e trava a operação enquanto não existir.
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-9 gap-4 items-start">
        {/* Coluna principal: ação, leitura e resultado */}
        <div data-testid="op-col-center" className="xl:col-span-6 space-y-4">
          {/* Card: Operação Única */}
          <div
            data-testid="op-card-single"
            className="bg-[#131925] border border-[#222c3f] rounded-lg p-4 bg-gradient-to-br from-[#131925] to-[#18202f]"
          >
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
                  data-testid="logic-select"
                  value={config.onceLogic}
                  disabled={!fonteUsaLogica}
                  onChange={(e) => updateConfig({ onceLogic: e.target.value })}
                  className={`w-full bg-[#18202f] border border-[#222c3f] text-[#eef2f8] px-2.5 py-1.5 rounded font-mono text-xs ${fonteUsaLogica ? '' : 'opacity-50 cursor-not-allowed'
                    }`}
                >
                  <option value="auto">
                    Por evidência — a líder aprovada no teste (FDR)
                  </option>
                  <option value="top">
                    A líder por acerto medido — maior acerto da tabela
                  </option>
                  <option value="rotate">Alternância em rodízio</option>
                  <option value="recent">Alternância por desempenho recente</option>
                  {engine.getLogics().map((L) => (
                    <option key={L.id} value={L.id}>
                      {L.name} ({L.tag})
                    </option>
                  ))}
                </select>
                {fonteUsaLogica && config.onceLogic === 'top' && (
                  <div data-testid="logic-mode-note" className="text-[10px] text-[#8593aa] mt-1">
                    Pega a lógica de maior acerto entre as que têm amostra suficiente e
                    superam o empate técnico. Não exige aprovação no teste de
                    significância — para exigir, use a opção por evidência.
                  </div>
                )}
                {!fonteUsaLogica && (
                  <div data-testid="logic-select-note" className="text-[10px] text-[#8593aa] mt-1">
                    Sem efeito na fonte atual: o alvo sai do Motor 2.0. As lógicas
                    seguem medindo para o ranking.
                  </div>
                )}
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
                    <span className="text-emerald-400 font-mono">
                      {descreveMetrica({
                        ...currentPick,
                        reason: null,
                        key: '',
                        logicId: currentPick.lid,
                        stage: 5,
                      })}
                    </span>
                  </div>
                  <div className="text-[11px] text-[#eef2f8] font-mono">
                    {engine.getLogicName(currentPick.lid)}
                  </div>
                  <div className="text-[10px] text-[#8593aa] mt-1">
                    Amostra: {currentPick.tickCount} ticks analisados.
                  </div>
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

          {/* Card: Melhor Alvo no Momento — segue a fonte do sinal */}
          <div className="bg-[#131925] border border-[#222c3f] rounded-lg p-4">
            <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#8593aa]">
                Melhor alvo no momento
              </h3>
              <span className="text-[10.5px] font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                {config.autoSource === 'motor2'
                  ? 'MOTOR 2.0'
                  : config.autoSource === 'logic'
                    ? engine.getLogicName(liveTarget.logicId).toUpperCase()
                    : 'MOTOR + LÓGICA'}
              </span>
            </div>
            <div className="flex items-center gap-4 flex-wrap">
              <div className="w-16 h-16 rounded-xl bg-amber-500/10 border-2 border-amber-500 flex items-center justify-center font-mono text-3xl text-amber-400 font-bold">
                {liveTarget.digit !== null && !liveTarget.reason ? liveTarget.digit : '—'}
              </div>
              <div className="flex-1 min-w-[200px]">
                <b className="font-mono text-sm text-[#eef2f8]">
                  {liveTarget.sym && liveTarget.digit !== null && !liveTarget.reason
                    ? `${liveTarget.sym} · Fora do dígito ${liveTarget.digit}`
                    : 'analisando…'}
                </b>
                <div
                  data-testid="target-card-metric"
                  className="text-[11px] text-[#8593aa] mt-0.5"
                >
                  {liveTarget.key === 'logicnone'
                    ? primeiraFrase(liveTarget.reason)
                    : config.autoSource === 'motor2'
                    ? `score ${liveTarget.score ?? '—'} · mínimo ${config.minScore}`
                    : config.autoSource === 'logic'
                      ? `confiança ${textoConf(liveTarget.conf)} · mínimo ${config.onceMinConf}%`
                      : `score ${liveTarget.score ?? '—'} (mín. ${config.minScore}) · confiança ${textoConf(
                        liveTarget.conf
                      )} (mín. ${config.onceMinConf}%)`}
                </div>
                <div className="h-2 bg-[#18202f] rounded-full overflow-hidden mt-2">
                  <div
                    className="h-full bg-indigo-500"
                    style={{
                      width: `${Math.min(
                        100,
                        config.autoSource === 'logic'
                          ? liveTarget.conf ?? 0
                          : liveTarget.score ?? 0
                      )}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                data-testid="manual-entry-button"
                disabled={!!liveTarget.reason || liveTarget.digit === null}
                onClick={handleManualEntry}
                className={`px-4 py-2 font-bold rounded shadow transition-colors ${liveTarget.reason || liveTarget.digit === null
                    ? 'bg-[#18202f] text-[#8593aa] border border-[#222c3f] cursor-not-allowed'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  }`}
              >
                {liveTarget.reason || liveTarget.digit === null
                  ? 'Entrar no alvo recomendado'
                  : config.vlossOn
                    ? `Armar ${config.vlossN} Loss Virtual fora do dígito ${liveTarget.digit}`
                    : `Operar fora do dígito ${liveTarget.digit}`}
              </button>
              <span className="text-[10.5px] text-[#8593aa]">
                Entrada imediata, sem proposta pré-cotada.
              </span>
            </div>

            {liveTarget.reason && (
              <div
                data-testid="manual-entry-status"
                className="mt-2 p-2.5 rounded border border-amber-500/30 bg-amber-500/10 text-amber-200 font-mono text-[11px]"
              >
                Sem entrada manual: {liveTarget.reason}.
              </div>
            )}

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

            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-[#8593aa] block mb-1">Fonte do sinal</label>
                <select
                  data-testid="auto-source-select"
                  value={config.autoSource}
                  onChange={(e) =>
                    updateConfig({ autoSource: e.target.value as AutoSource })
                  }
                  className="w-full bg-[#18202f] border border-[#222c3f] text-[#eef2f8] px-2.5 py-1.5 rounded font-mono text-xs"
                >
                  <option value="motor2">Motor 2.0 — score de saturação</option>
                  <option value="logic">Lógica medida — a escolhida acima</option>
                  <option value="both">As duas, no mesmo dígito</option>
                </select>
              </div>
              <div
                data-testid="auto-source-hint"
                className="text-[11px] text-[#8593aa] leading-relaxed md:pt-5"
              >
                {config.autoSource === 'motor2' &&
                  `Entra quando o score do motor alcança ${config.minScore}. As lógicas seguem apenas medindo.`}
                {config.autoSource === 'logic' &&
                  `Entra no palpite da lógica escolhida em "Operação única", com confiança mínima de ${config.onceMinConf}%.`}
                {config.autoSource === 'both' &&
                  `Entra só quando o motor (score ${config.minScore}) e a lógica escolhida (confiança ${config.onceMinConf}%) apontam o mesmo dígito.`}
              </div>
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

          {/* Resultado das entradas liquidadas */}
          <TradeResultsTable engine={engine} state={state} onExport={exportCSV} />
        </div>

        {/* Coluna lateral: leituras contínuas e registro */}
        <div data-testid="op-col-side" className="xl:col-span-3 space-y-4">
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
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4 pt-3 border-t border-[#222c3f]">
              <div className="bg-[#18202f] border border-[#222c3f] hover:border-[#2e3b52] transition-colors p-2.5 rounded-lg text-center flex flex-col justify-center items-center shadow-xs">
                <b className="block font-mono text-sm font-bold text-[#eef2f8] leading-tight">{state.virt.total}</b>
                <span className="text-[9.5px] text-[#8593aa] uppercase tracking-wider font-medium mt-1 leading-tight">Sinais Virtuais</span>
              </div>
              <div className="bg-[#18202f] border border-[#222c3f] hover:border-[#2e3b52] transition-colors p-2.5 rounded-lg text-center flex flex-col justify-center items-center shadow-xs">
                <b className="block font-mono text-sm font-bold text-[#eef2f8] leading-tight">{simTotal}</b>
                <span className="text-[9.5px] text-[#8593aa] uppercase tracking-wider font-medium mt-1 leading-tight">Ops Sim</span>
              </div>
              <div className="bg-[#18202f] border border-[#222c3f] hover:border-[#2e3b52] transition-colors p-2.5 rounded-lg text-center flex flex-col justify-center items-center shadow-xs">
                <b
                  className={`block font-mono text-sm font-bold leading-tight ${simAcc !== null && simAcc >= breakeven ? 'text-emerald-400' : 'text-[#eef2f8]'
                    }`}
                >
                  {simAcc !== null ? `${simAcc}%` : '—'}
                </b>
                <span className="text-[9.5px] text-[#8593aa] uppercase tracking-wider font-medium mt-1 leading-tight">Acerto Sim</span>
              </div>
              <div className="bg-[#18202f] border border-[#222c3f] hover:border-[#2e3b52] transition-colors p-2.5 rounded-lg text-center flex flex-col justify-center items-center shadow-xs">
                <b
                  className={`block font-mono text-sm font-bold leading-tight ${state.sim.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                >
                  {state.sim.pnl >= 0 ? `+$${state.sim.pnl.toFixed(2)}` : `-$${Math.abs(state.sim.pnl).toFixed(2)}`}
                </b>
                <span className="text-[9.5px] text-[#8593aa] uppercase tracking-wider font-medium mt-1 leading-tight">Resultado Sim</span>
              </div>
              <div className="bg-[#18202f] border border-[#222c3f] hover:border-[#2e3b52] transition-colors p-2.5 rounded-lg text-center flex flex-col justify-center items-center shadow-xs">
                <b className="block font-mono text-sm font-bold text-[#eef2f8] leading-tight">{realTotal}</b>
                <span className="text-[9.5px] text-[#8593aa] uppercase tracking-wider font-medium mt-1 leading-tight">Ops Real</span>
              </div>
              <div className="bg-[#18202f] border border-[#222c3f] hover:border-[#2e3b52] transition-colors p-2.5 rounded-lg text-center flex flex-col justify-center items-center shadow-xs">
                <b
                  className={`block font-mono text-sm font-bold leading-tight ${realAcc !== null && realAcc >= breakeven ? 'text-emerald-400' : 'text-[#eef2f8]'
                    }`}
                >
                  {realAcc !== null ? `${realAcc}%` : '—'}
                </b>
                <span className="text-[9.5px] text-[#8593aa] uppercase tracking-wider font-medium mt-1 leading-tight">Acerto Real</span>
              </div>
              <div className="bg-[#18202f] border border-[#222c3f] hover:border-[#2e3b52] transition-colors p-2.5 rounded-lg text-center flex flex-col justify-center items-center shadow-xs">
                <b
                  className={`block font-mono text-sm font-bold leading-tight ${state.real.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                >
                  {state.real.pnl >= 0 ? `+$${state.real.pnl.toFixed(2)}` : `-$${Math.abs(state.real.pnl).toFixed(2)}`}
                </b>
                <span className="text-[9.5px] text-[#8593aa] uppercase tracking-wider font-medium mt-1 leading-tight">Resultado Real</span>
              </div>
              <div className="bg-[#18202f] border border-[#222c3f] hover:border-[#2e3b52] transition-colors p-2.5 rounded-lg text-center flex flex-col justify-center items-center shadow-xs">
                <b className="block font-mono text-sm font-bold text-amber-400 leading-tight">{state.mgLevel}</b>
                <span className="text-[9.5px] text-[#8593aa] uppercase tracking-wider font-medium mt-1 leading-tight">Nível Gale</span>
              </div>
            </div>
          </div>

          {/* Termômetro de Exaustão */}
          <div className="bg-[#131925] border border-[#222c3f] rounded-lg p-3.5">
            <div className="text-[11px] text-[#8593aa] mb-1.5 flex justify-between">
              <span>Termômetro de exaustão dos 10 dígitos</span>
              <span className="font-mono text-amber-400">
                {currentPick ? currentPick.sym : activeMarkets[0]?.sym || '—'}
              </span>
            </div>
            <div className="grid grid-cols-5 gap-1.5 font-mono text-[10px] text-center">
              {Array.from({ length: 10 }, (_, d) => {
                const sym = currentPick ? currentPick.sym : activeMarkets[0]?.sym || 'R_10';
                const ex = engine.getExhaustion(sym, d);
                const losers = engine.getLoserCount(sym, d);
                const isExhausted = ex?.ok;
                return (
                  <div
                    key={d}
                    className={`py-2 px-1 rounded-lg border transition-all flex flex-col items-center justify-center min-h-[54px] ${isExhausted
                        ? 'border-emerald-500/60 bg-emerald-950/30 text-emerald-300 shadow-xs'
                        : 'border-[#222c3f] bg-[#18202f] text-[#8593aa] hover:border-[#2e3b52]'
                      }`}
                  >
                    <span className={`text-xs font-bold ${isExhausted ? 'text-emerald-300' : 'text-[#eef2f8]'}`}>
                      {d}
                    </span>
                    <span className="text-[10px] leading-tight mt-0.5">
                      {ex ? `${ex.pct}%` : '—'}
                    </span>
                    {losers > 0 && (
                      <span className="text-[9px] font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-1 rounded mt-0.5 leading-tight">
                        {losers}L
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Cards: Anomalias e Histórico */}
          <div className="grid grid-cols-1 gap-4">
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
      </div>

    </div>
  );
}
