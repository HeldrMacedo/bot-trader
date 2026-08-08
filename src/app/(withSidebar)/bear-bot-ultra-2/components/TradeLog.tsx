"use client";

import { BotState, TradeLog } from '../../../services/bearbot2.types';
import { ArrowDownTrayIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

interface TradeLogProps {
  state: BotState;
  onExport: () => void;
  onReset: () => void;
}

export default function TradeLogComponent({ state, onExport, onReset }: TradeLogProps) {
  return (
    <div className="bg-[#131925] border border-[#222c3f] rounded-xl p-4 shadow-xl flex flex-col justify-between">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-[#8593aa]">📜 HISTÓRICO DE LOGS</h2>
        <div className="flex gap-2">
          <button onClick={onExport} className="p-1 rounded bg-[#18202f] border border-[#2e3a52] hover:bg-[#222c3f] text-xs font-bold flex items-center gap-1 transition-all" title="Exportar CSV">
            <ArrowDownTrayIcon className="w-3.5 h-3.5" />CSV
          </button>
          <button onClick={onReset} className="p-1 rounded bg-[#18202f] border border-[#2e3a52] hover:bg-[#222c3f] text-xs font-bold flex items-center gap-1 transition-all" title="Limpar Histórico">
            <ArrowPathIcon className="w-3.5 h-3.5" />Reset
          </button>
        </div>
      </div>
      <div className="bg-[#070b14] border border-[#2e3a52] rounded-lg p-3 h-52 overflow-y-auto font-mono text-[10px] flex flex-col gap-1.5">
        {state.logLines.length > 0 ? (
          state.logLines.map((log, index) => {
            let textClass = "text-gray-400 border-l-2 border-gray-600";
            if (log.type === "win") textClass = "text-green-400 border-l-2 border-green-500";
            if (log.type === "lose") textClass = "text-red-400 border-l-2 border-red-500";
            if (log.type === "info") textClass = "text-blue-400 border-l-2 border-blue-500";
            if (log.type === "virt") textClass = "text-yellow-400 border-l-2 border-yellow-500";
            if (log.type === "warn") textClass = "text-orange-400 border-l-2 border-orange-500";
            return <div key={index} className={`pl-2 py-0.5 leading-relaxed ${textClass}`}><span className="text-gray-500 mr-2">[{log.ts}]</span><span>{log.msg}</span></div>;
          })
        ) : (
          <div className="text-gray-500 text-center py-10">Nenhuma transação efetuada ainda.</div>
        )}
      </div>
    </div>
  );
}
