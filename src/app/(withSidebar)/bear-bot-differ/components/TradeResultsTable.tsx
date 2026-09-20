"use client";

import React from 'react';
import { EngineState, BearDifferEngine } from '@/app/services/BearDifferEngine';
import { ArrowDownTrayIcon } from '@heroicons/react/24/outline';

interface TradeResultsTableProps {
  engine: BearDifferEngine;
  state: EngineState;
  onExport: () => void;
  limit?: number;
}

/**
 * Resultado das entradas já liquidadas. O painel de log conta o que o robô
 * pensou; esta tabela conta o que ele ganhou ou perdeu.
 */
export default function TradeResultsTable({
  engine,
  state,
  onExport,
  limit = 10,
}: TradeResultsTableProps) {
  const rows = state.trades;
  const empty = state.trades.length === 0;

  return (
    <div className="bg-[#131925] border border-[#222c3f] rounded-lg p-4 overflow-x-auto">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#8593aa]">
          💰 Últimas operações
        </h3>
        <button
          type="button"
          onClick={onExport}
          disabled={empty}
          title="Exportar operações em CSV"
          className="p-1 px-2 rounded bg-[#18202f] border border-[#2e3a52] hover:bg-[#222c3f] text-[10px] font-bold flex items-center gap-1 transition-colors disabled:opacity-40"
        >
          <ArrowDownTrayIcon className="w-3.5 h-3.5" />
          CSV
        </button>
      </div>

      {empty ? (
        <p className="text-[11px] text-[#8593aa] py-6 text-center">
          Nenhuma operação liquidada nesta sessão.
        </p>
      ) : (
        <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
          <table className="w-full text-left text-[11px]">
            <thead className="sticky top-0 bg-[#131925] z-10">
              <tr className="border-b border-[#2e3a52] text-[#8593aa] uppercase text-[9.5px]">
                <th className="py-2 px-2">Hora</th>
                <th className="py-2 px-2">Mercado</th>
                <th className="py-2 px-2">Lógica</th>
                <th className="py-2 px-2">Alvo</th>
                <th className="py-2 px-2">Saiu</th>
                <th className="py-2 px-2">Stake</th>
                <th className="py-2 px-2">Resultado</th>
                <th className="py-2 px-2">Lucro ($)</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((t) => {
                const win = t.result === 'WIN';
                return (
                  <tr
                    key={t.id}
                    className="border-b border-[#222c3f]/50 hover:bg-[#18202f]/40 font-mono"
                  >
                    <td className="py-1.5 px-2 text-[#8593aa]">{t.time}</td>
                    <td className="py-1.5 px-2 text-[#eef2f8] font-bold">{t.sym}</td>
                    <td className="py-1.5 px-2 text-[#8593aa]">
                      {engine.getLogicName(t.logicId)}
                    </td>
                    <td className="py-1.5 px-2 text-amber-400">≠{t.digit}</td>
                    <td className={`py-1.5 px-2 ${win ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {t.exitDigit ?? '—'}
                    </td>
                    <td className="py-1.5 px-2 text-[#8593aa]">{t.stake.toFixed(2)}</td>
                    <td className="py-1.5 px-2">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[9.5px] font-bold ${win
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          }`}
                      >
                        {t.result}
                      </span>
                      <span
                        className={`ml-1.5 px-1.5 py-0.5 rounded text-[9.5px] ${t.paper
                          ? 'bg-[#18202f] text-[#8593aa] border border-[#2e3a52]'
                          : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                          }`}
                      >
                        {t.paper ? 'SIM' : 'REAL'}
                      </span>
                    </td>
                    <td className={`py-1.5 px-2 ${win ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {t.profit >= 0 ? '+' : ''}
                      {t.profit.toFixed(2)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
