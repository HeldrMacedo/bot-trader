"use client";

import React, { useRef } from 'react';
import { EngineState, BearDifferEngine } from '@/app/services/BearDifferEngine';
import { toast } from 'react-toastify';

interface SystemTabProps {
  engine: BearDifferEngine;
  state: EngineState;
  exportCSV: () => void;
}

export default function SystemTab({ engine, state, exportCSV }: SystemTabProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleExportProfile = () => {
    const profile = {
      name: 'BearBotDiffer_Profile',
      timestamp: new Date().toISOString(),
      config: state.config,
      markets: state.markets,
    };
    const blob = new Blob([JSON.stringify(profile, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bear-bot-differ-profile-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Perfil exportado com sucesso!');
  };

  const handleImportProfile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        if (data?.config) {
          engine.updateConfig(data.config);
          toast.success('Perfil importado com sucesso!');
        } else {
          toast.error('Arquivo de perfil inválido.');
        }
      } catch (err) {
        toast.error('Erro ao ler arquivo JSON.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="space-y-4 text-xs">
      {/* Qualidade da Execução */}
      <div className="bg-[#131925] border border-[#222c3f] rounded-lg p-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#8593aa] mb-2">
          Qualidade da execução e dados da sessão
        </h3>
        <p className="text-[11px] text-[#8593aa] mb-3">
          Acompanhe o atraso em ticks da Deriv, latência de compra e exporte perfis e dados de auditoria.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4 font-mono">
          <div className="bg-[#18202f] p-3 rounded">
            <span className="text-[#8593aa] block text-[10px]">TOTAL DE OPERAÇÕES</span>
            <b className="text-lg text-[#eef2f8]">{state.trades.length}</b>
          </div>
          <div className="bg-[#18202f] p-3 rounded">
            <span className="text-[#8593aa] block text-[10px]">LUCRO LÍQUIDO</span>
            <b
              className={`text-lg ${
                state.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {state.pnl >= 0 ? `+$${state.pnl.toFixed(2)}` : `-$${Math.abs(state.pnl).toFixed(2)}`}
            </b>
          </div>
          <div className="bg-[#18202f] p-3 rounded">
            <span className="text-[#8593aa] block text-[10px]">MODO DE COMPRA</span>
            <b className="text-lg text-amber-400">
              {state.config.fastExec ? 'Rápida (⚡) / Direta' : 'Padrão (Proposal + Buy)'}
            </b>
          </div>
        </div>

        {/* Métricas de Latência e Atraso */}
        <div className="bg-[#18202f] p-3.5 rounded border border-[#222c3f] mb-4">
          <h4 className="font-bold text-[#eef2f8] uppercase text-[11px] tracking-wider text-[#8593aa] mb-2">
            Métricas de Latência e Atraso
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono">
            <div>
              <span className="text-[#8593aa] block text-[10px]">LIMITE DE TICKS VENCIDOS</span>
              <b className="text-[#eef2f8]">{state.config.maxStale} ticks</b>
            </div>
            <div>
              <span className="text-[#8593aa] block text-[10px]">RECONEXÃO AUTOMÁTICA</span>
              <b className="text-emerald-400">{state.config.autoReconn ? 'ATIVA' : 'DESLIGADA'}</b>
            </div>
            <div>
              <span className="text-[#8593aa] block text-[10px]">PROPOSTA PRÉ-ABERTA ⚡</span>
              <b className="text-amber-400">{state.config.fastExec ? 'HABILITADA' : 'DESABILITADA'}</b>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-3 border-t border-[#222c3f]">
          <button
            type="button"
            onClick={exportCSV}
            disabled={state.trades.length === 0}
            className="px-4 py-2 bg-[#18202f] hover:bg-[#222c3f] border border-[#222c3f] hover:border-amber-500 rounded font-bold text-[#eef2f8] transition-colors disabled:opacity-40"
          >
            Exportar Operações (CSV)
          </button>
          <button
            type="button"
            onClick={handleExportProfile}
            className="px-4 py-2 bg-[#18202f] hover:bg-[#222c3f] border border-[#222c3f] hover:border-amber-500 rounded font-bold text-[#eef2f8] transition-colors"
          >
            Exportar Perfil (JSON)
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 bg-[#18202f] hover:bg-[#222c3f] border border-[#222c3f] hover:border-amber-500 rounded font-bold text-[#eef2f8] transition-colors"
          >
            Importar Perfil (JSON)
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleImportProfile}
            className="hidden"
          />
        </div>
      </div>
    </div>
  );
}
