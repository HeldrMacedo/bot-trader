"use client";

import React, { useState } from 'react';
import { EngineState, BearDifferEngine } from '@/app/services/BearDifferEngine';
import { StrategyCandidate } from '@/app/services/beardiffer.types';
import { driftTest } from '@/app/services/BearDifferMath';

interface PipelineTabProps {
  engine: BearDifferEngine;
  state: EngineState;
}

export default function PipelineTab({ engine, state }: PipelineTabProps) {
  const [selectedSym, setSelectedSym] = useState<string>(state.markets[0]?.sym || 'R_10');
  const [candidatesCount, setCandidatesCount] = useState(200);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [pipelineSummary, setPipelineSummary] = useState<string | null>(null);
  const [approvedList, setApprovedList] = useState<StrategyCandidate[]>([]);
  const [driftRows, setDriftRows] = useState<
    Array<{ sym: string; pD: number; pR: number; changed: boolean }> | null
  >(null);
  const [driftMessage, setDriftMessage] = useState<string | null>(null);

  const digits = engine.getDigits(selectedSym);

  const DRIFT_BLOCKS = 4;

  // Fase 0: o processo gerador muda ao longo do tempo? O caminho muda sempre;
  // a distribuição e a taxa de repetição que o produzem são outra coisa.
  const handleRunDrift = () => {
    const active = state.markets.filter((m) => m.on);
    const rows: Array<{ sym: string; pD: number; pR: number; changed: boolean }> = [];

    active.forEach((m) => {
      const res = driftTest(engine.getDigits(m.sym), DRIFT_BLOCKS);
      if (!res) return;
      rows.push({ sym: m.sym, pD: res.pD, pR: res.pR, changed: false });
    });

    if (!rows.length) {
      setDriftRows(null);
      setDriftMessage(
        `Histórico insuficiente: são necessários ao menos ${200 * DRIFT_BLOCKS} ticks por mercado.`
      );
      return;
    }

    // Bonferroni sobre a família inteira: mercados x 2 testes
    const tests = rows.length * 2;
    rows.forEach((r) => {
      r.pD = Math.min(1, r.pD * tests);
      r.pR = Math.min(1, r.pR * tests);
      r.changed = Math.min(r.pD, r.pR) < state.config.labAlpha;
    });

    const changed = rows.filter((r) => r.changed).length;
    setDriftRows(rows);
    setDriftMessage(
      changed
        ? `${changed} de ${rows.length} mercados mostram estatística diferente entre blocos de tempo.`
        : `Nenhum dos ${rows.length} mercados mostra mudança estatística entre os blocos de tempo. Readaptar a cada mudança de caminho seria ajustar a ruído.`
    );
  };

  const handleRunPipeline = () => {
    if (digits.length < 600) {
      setPipelineSummary(
        `Mercado ${selectedSym} precisa de pelo menos 600 ticks carregados para a esteira (atual: ${digits.length}).`
      );
      return;
    }

    setRunning(true);
    setProgress(20);
    setPipelineSummary('Fase 0: Analisando estabilidade de regime do gerador...');

    setTimeout(() => {
      setProgress(50);
      setPipelineSummary('Fases 1 e 2: Gerando genomas e validando com controle FDR (Benjamini-Hochberg)...');

      setTimeout(() => {
        const res = engine.runPipeline(selectedSym, candidatesCount);
        setProgress(100);
        setRunning(false);

        if (!res) {
          setPipelineSummary('Amostra insuficiente ou erro ao rodar esteira.');
          return;
        }

        const approved = res.candidates.filter((c) => c.approved);
        setApprovedList(
          approved.map((c, idx) => ({
            id: `strat-${Date.now()}-${idx}`,
            name: `Genoma #${idx + 1} (${selectedSym})`,
            G: c.G,
            acc: c.accC || c.accB || c.accA,
            t: c.tC || c.tB || c.tA,
            pnl: c.pnlC || c.pnlB || c.pnlA,
          }))
        );

        if (approved.length > 0) {
          setPipelineSummary(
            `✓ ${approved.length} estratégia(s) sobreviveram a tudo: filtro de busca, validação com controle de descoberta falsa, reserva final e teste de permutação.`
          );
        } else {
          setPipelineSummary(
            `Esteira concluída: ${res.totalGenomes} genomas testados (${res.survivorsStageA} aprovados em A, ${res.survivorsStageB} em B). Nenhuma candidata superou o controle de falsas descobertas (sem viés artificial).`
          );
        }
      }, 50);
    }, 50);
  };

  return (
    <div className="space-y-4 text-xs">
      <div className="bg-[#131925] border border-[#222c3f] rounded-lg p-4">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#8593aa]">
              Esteira genética e ciclo automático
            </h3>
            <p className="text-[11px] text-[#8593aa]">
              Monitorar regime (Fase 0) → Montar estratégias (Fase 1) → Validar em cascata com FDR (Fase 2) →
              Operar portfólio (Fase 3).
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

        <div className="border border-[#222c3f] rounded p-3 mb-3">
          <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
            <span className="text-[#8593aa]">
              Fase 0 — o gerador muda com o tempo? ({DRIFT_BLOCKS} blocos, χ² de homogeneidade)
            </span>
            <button
              type="button"
              onClick={handleRunDrift}
              className="bg-[#18202f] border border-[#2e3a52] text-[#eef2f8] px-3 py-1.5 rounded hover:border-[#4aa3ff]"
            >
              Testar mudança de regime
            </button>
          </div>

          {driftMessage && (
            <p className="text-[11px] text-[#8593aa] mb-2">{driftMessage}</p>
          )}

          {driftRows && (
            <table className="w-full font-mono text-[11px]">
              <thead>
                <tr className="text-[#54627d] text-left">
                  <th className="py-1">Mercado</th>
                  <th className="py-1">Distribuição</th>
                  <th className="py-1">Repetição</th>
                  <th className="py-1">Veredito</th>
                </tr>
              </thead>
              <tbody>
                {driftRows.map((r) => (
                  <tr key={r.sym} className="border-t border-[#222c3f]">
                    <td className="py-1">{r.sym}</td>
                    <td className="py-1">{r.pD.toExponential(2)}</td>
                    <td className="py-1">{r.pR.toExponential(2)}</td>
                    <td className={`py-1 ${r.changed ? 'text-amber-400' : 'text-[#8593aa]'}`}>
                      {r.changed ? 'mudou' : 'estável'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3 font-mono">
          <div className="bg-[#18202f] p-3 rounded">
            <span className="text-[#8593aa] block text-[10px]">CANDIDATAS A GERAR</span>
            <input
              type="number"
              min="50"
              max="1000"
              value={candidatesCount}
              onChange={(e) => setCandidatesCount(parseInt(e.target.value, 10) || 200)}
              className="mt-1 bg-[#131925] border border-[#222c3f] text-[#eef2f8] px-2 py-1 rounded text-sm w-full"
            />
          </div>
          <div className="bg-[#18202f] p-3 rounded flex flex-col justify-center">
            <span className="text-[#8593aa] block text-[10px]">CRITÉRIO DE SELEÇÃO</span>
            <span className="text-xs text-amber-400 font-bold">
              Cascata Tripla + Benjamini-Hochberg (q = 0.10)
            </span>
          </div>
        </div>

        {running && (
          <div className="w-full bg-[#18202f] h-2 rounded-full overflow-hidden my-3">
            <div
              className="bg-indigo-500 h-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        <button
          type="button"
          onClick={handleRunPipeline}
          disabled={running || digits.length < 300}
          className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded shadow transition-colors disabled:opacity-40"
        >
          {running ? 'Processando Esteira...' : 'Iniciar Esteira de Validação'}
        </button>

        {pipelineSummary && (
          <div className="mt-3 p-3 bg-[#18202f] rounded border border-[#222c3f] text-[#eef2f8] font-mono leading-relaxed">
            {pipelineSummary}
          </div>
        )}
      </div>

      {/* Portfólio de Estratégias Aprovadas */}
      <div className="bg-[#131925] border border-[#222c3f] rounded-lg p-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#8593aa] mb-2">
          Portfólio em operação (Fase 3)
        </h3>
        <p className="text-[11px] text-[#8593aa] mb-3">
          Estratégias que sobreviveram a todas as fases de validação disputam as entradas com o motor de referência.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full font-mono text-left text-[11px]">
            <thead>
              <tr className="border-b border-[#222c3f] text-[#8593aa] uppercase text-[9.5px]">
                <th className="py-1.5 px-2">ID</th>
                <th className="py-1.5 px-2">Estratégia</th>
                <th className="py-1.5 px-2">Janela</th>
                <th className="py-1.5 px-2">Score Mín.</th>
                <th className="py-1.5 px-2">Status</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-[#222c3f]/40 hover:bg-[#18202f]/50">
                <td className="py-2 px-2 text-[#8593aa]">base</td>
                <td className="py-2 px-2 font-bold text-[#eef2f8]">Motor 2.0 (Referência)</td>
                <td className="py-2 px-2">180 ticks</td>
                <td className="py-2 px-2 text-amber-400">{state.config.minScore}</td>
                <td className="py-2 px-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    ATIVO
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
