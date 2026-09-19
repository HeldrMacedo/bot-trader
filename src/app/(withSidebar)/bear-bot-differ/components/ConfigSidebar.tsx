"use client";

import React, { useState } from 'react';
import { DifferConfig, DifferMarket } from '@/app/services/beardiffer.types';

interface ConfigSidebarProps {
  markets: DifferMarket[];
  config: DifferConfig;
  updateConfig: (newConfig: Partial<DifferConfig>) => void;
  onToggleMarket?: (sym: string) => void;
  onAddMarket?: (sym: string) => void;
}

export default function ConfigSidebar({
  markets,
  config,
  updateConfig,
  onToggleMarket,
  onAddMarket,
}: ConfigSidebarProps) {
  const [newSym, setNewSym] = useState('');
  // Os números da trava só significam alguma coisa com ela ligada: editáveis
  // desligados, prometeriam um teste que não vai acontecer.
  const gateOff = !config.gateEnabled;

  const handleAdd = () => {
    const s = newSym.trim().toUpperCase();
    if (s && onAddMarket) {
      onAddMarket(s);
      setNewSym('');
    }
  };

  return (
    <div className="space-y-4 text-xs">
      {/* Mercados */}
      <div className="bg-[#131925] border border-[#222c3f] rounded-lg p-3.5">
        <h3 className="text-[11px] font-bold text-[#8593aa] uppercase tracking-wider mb-2.5">
          Mercados
        </h3>
        <div className="flex flex-wrap gap-1.5">
          {markets.map((m) => (
            <button
              key={m.sym}
              type="button"
              onClick={() => onToggleMarket?.(m.sym)}
              className={`px-2.5 py-1 rounded font-mono text-[11px] border transition-colors ${
                m.on
                  ? m.proven
                    ? 'border-emerald-500 text-emerald-400 bg-emerald-950/30'
                    : 'border-amber-500 text-amber-400 bg-amber-950/30'
                  : 'border-[#222c3f] text-[#8593aa] bg-[#18202f]'
              }`}
            >
              {m.sym}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5 mt-2.5">
          <input
            type="text"
            placeholder="adicionar símbolo"
            value={newSym}
            onChange={(e) => setNewSym(e.target.value)}
            className="flex-1 bg-[#18202f] border border-[#222c3f] text-[#eef2f8] px-2 py-1 rounded text-xs focus:outline-none focus:border-amber-500 font-mono"
          />
          <button
            type="button"
            onClick={handleAdd}
            className="px-3 py-1 bg-[#18202f] border border-[#222c3f] text-amber-400 rounded hover:bg-[#222c3f]"
          >
            +
          </button>
        </div>
        <p className="text-[10.5px] text-[#8593aa] mt-2">
          Borda âmbar = ligado. Borda verde = viés estatístico comprovado no laboratório.
        </p>
      </div>

      {/* Entrada */}
      <div className="bg-[#131925] border border-[#222c3f] rounded-lg p-3.5 space-y-2.5">
        <h3 className="text-[11px] font-bold text-[#8593aa] uppercase tracking-wider">
          Entrada
        </h3>
        <div className="flex items-center justify-between">
          <label className="text-[#8593aa]">Stake base</label>
          <input
            type="number"
            step="0.01"
            min="0.35"
            value={config.stake}
            onChange={(e) => updateConfig({ stake: parseFloat(e.target.value) || 0.35 })}
            className="w-24 bg-[#18202f] border border-[#222c3f] text-[#eef2f8] px-2 py-1 rounded text-right font-mono"
          />
        </div>
        <div className="flex items-center justify-between">
          <label className="text-[#8593aa]">Score mínimo</label>
          <input
            type="number"
            min="0"
            max="100"
            value={config.minScore}
            onChange={(e) => updateConfig({ minScore: parseInt(e.target.value, 10) || 72 })}
            className="w-24 bg-[#18202f] border border-[#222c3f] text-[#eef2f8] px-2 py-1 rounded text-right font-mono"
          />
        </div>
        <div className="flex items-center justify-between">
          <label className="text-[#8593aa]">Amostra mínima (ticks)</label>
          <input
            type="number"
            min="60"
            value={config.minTicks}
            onChange={(e) => updateConfig({ minTicks: parseInt(e.target.value, 10) || 300 })}
            className="w-24 bg-[#18202f] border border-[#222c3f] text-[#eef2f8] px-2 py-1 rounded text-right font-mono"
          />
        </div>
        <div className="flex items-center justify-between">
          <label className="text-[#8593aa]">Intervalo mínimo (s)</label>
          <input
            type="number"
            min="0"
            value={config.cooldown}
            onChange={(e) => updateConfig({ cooldown: parseInt(e.target.value, 10) || 15 })}
            className="w-24 bg-[#18202f] border border-[#222c3f] text-[#eef2f8] px-2 py-1 rounded text-right font-mono"
          />
        </div>
        <div className="flex items-center justify-between pt-1">
          <label className="text-[#8593aa]">Só mercados com viés</label>
          <input
            type="checkbox"
            checked={config.gateBias}
            onChange={(e) => updateConfig({ gateBias: e.target.checked })}
            className="accent-amber-500 w-4 h-4 rounded"
          />
        </div>
        <p className="text-[10.5px] text-[#8593aa]">
          Com a trava de viés ligada, o bot só opera mercados que passaram nos testes de significância.
        </p>
      </div>

      {/* Testes antes de operar */}
      <div className="bg-[#131925] border border-[#222c3f] rounded-lg p-3.5 space-y-2.5">
        <h3 className="text-[11px] font-bold text-[#8593aa] uppercase tracking-wider">
          Testes antes de operar
        </h3>
        <div className="flex items-center justify-between">
          <label className="text-[#8593aa]">Modo de operação</label>
          <select
            value={config.opMode}
            onChange={(e) => updateConfig({ opMode: e.target.value as any })}
            className="w-32 bg-[#18202f] border border-[#222c3f] text-[#eef2f8] px-2 py-1 rounded font-mono"
          >
            <option value="sim">Simulação (papel)</option>
            <option value="real">Real</option>
          </select>
        </div>
        <div className="flex items-center justify-between pt-1">
          <label className="text-[#8593aa]">Testar antes de liberar o real</label>
          <input
            data-testid="gate-enabled"
            type="checkbox"
            checked={config.gateEnabled}
            disabled={config.opMode === 'real'}
            onChange={(e) => updateConfig({ gateEnabled: e.target.checked })}
            className="accent-amber-500 w-4 h-4 rounded disabled:opacity-40"
          />
        </div>
        <div className="flex items-center justify-between">
          <label className={gateOff ? 'text-[#5a6577]' : 'text-[#8593aa]'}>
            Liberar real após (ops)
          </label>
          <input
            data-testid="gate-ops"
            type="number"
            min="0"
            value={config.gateOps}
            disabled={gateOff}
            onChange={(e) => updateConfig({ gateOps: parseInt(e.target.value, 10) || 50 })}
            className={`w-24 bg-[#18202f] border border-[#222c3f] text-[#eef2f8] px-2 py-1 rounded text-right font-mono ${gateOff ? 'opacity-40 cursor-not-allowed' : ''
              }`}
          />
        </div>
        <div className="flex items-center justify-between">
          <label className={gateOff ? 'text-[#5a6577]' : 'text-[#8593aa]'}>
            Com acerto simulado ≥
          </label>
          <div className="flex items-center gap-1">
            <input
              data-testid="gate-acc"
              type="number"
              min="0"
              max="100"
              value={config.gateAcc}
              disabled={gateOff}
              onChange={(e) => updateConfig({ gateAcc: parseInt(e.target.value, 10) || 91 })}
              className={`w-20 bg-[#18202f] border border-[#222c3f] text-[#eef2f8] px-2 py-1 rounded text-right font-mono ${gateOff ? 'opacity-40 cursor-not-allowed' : ''
                }`}
            />
            <span className="text-[#8593aa] font-mono">%</span>
          </div>
        </div>
        <p data-testid="gate-note" className="text-[10.5px] text-[#8593aa]">
          Com a trava ligada, cada lógica precisa fechar uma janela de operações
          simuladas no acerto exigido antes de mandar ordem na conta real. Falhou,
          a janela recomeça do zero. No simulado não correm martingale, stop loss
          nem stop win.
        </p>
      </div>

      {/* Martingale */}
      <div className="bg-[#131925] border border-[#222c3f] rounded-lg p-3.5 space-y-2.5">
        <h3 className="text-[11px] font-bold text-[#8593aa] uppercase tracking-wider">
          Martingale
        </h3>
        <div className="flex items-center justify-between">
          <label className="text-[#8593aa]">Modo</label>
          <select
            value={config.mgMode}
            onChange={(e) => updateConfig({ mgMode: e.target.value as any })}
            className="w-32 bg-[#18202f] border border-[#222c3f] text-[#eef2f8] px-2 py-1 rounded font-mono"
          >
            <option value="off">Desligado</option>
            <option value="normal">Normal</option>
            <option value="partial">Parcelado</option>
          </select>
        </div>
        {config.mgMode !== 'off' && (
          <>
            <div className="flex items-center justify-between">
              <label className="text-[#8593aa]">Fator</label>
              <input
                type="number"
                step="0.1"
                min="1"
                value={config.mgFactor}
                onChange={(e) => updateConfig({ mgFactor: parseFloat(e.target.value) || 2.2 })}
                className="w-24 bg-[#18202f] border border-[#222c3f] text-[#eef2f8] px-2 py-1 rounded text-right font-mono"
              />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-[#8593aa]">Níveis máximos</label>
              <input
                type="number"
                min="1"
                max="12"
                value={config.mgMax}
                onChange={(e) => updateConfig({ mgMax: parseInt(e.target.value, 10) || 3 })}
                className="w-24 bg-[#18202f] border border-[#222c3f] text-[#eef2f8] px-2 py-1 rounded text-right font-mono"
              />
            </div>
            {config.mgMode === 'partial' && (
              <div className="flex items-center justify-between">
                <label className="text-[#8593aa]">Parcelas</label>
                <input
                  type="number"
                  min="2"
                  max="10"
                  value={config.mgParts}
                  onChange={(e) => updateConfig({ mgParts: parseInt(e.target.value, 10) || 3 })}
                  className="w-24 bg-[#18202f] border border-[#222c3f] text-[#eef2f8] px-2 py-1 rounded text-right font-mono"
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* Proteções */}
      <div className="bg-[#131925] border border-[#222c3f] rounded-lg p-3.5 space-y-2.5">
        <h3 className="text-[11px] font-bold text-[#8593aa] uppercase tracking-wider">
          Proteções
        </h3>
        <div className="flex items-center justify-between">
          <label className="text-[#8593aa]">Stop loss diário ($)</label>
          <input
            type="number"
            step="0.5"
            min="1"
            value={config.stopLoss}
            onChange={(e) => updateConfig({ stopLoss: parseFloat(e.target.value) || 10 })}
            className="w-24 bg-[#18202f] border border-[#222c3f] text-[#eef2f8] px-2 py-1 rounded text-right font-mono"
          />
        </div>
        <div className="flex items-center justify-between">
          <label className="text-[#8593aa]">Stop win diário ($)</label>
          <input
            type="number"
            step="0.5"
            min="1"
            value={config.stopWin}
            onChange={(e) => updateConfig({ stopWin: parseFloat(e.target.value) || 10 })}
            className="w-24 bg-[#18202f] border border-[#222c3f] text-[#eef2f8] px-2 py-1 rounded text-right font-mono"
          />
        </div>
        <div className="flex items-center justify-between">
          <label className="text-[#8593aa]">Máx. perdas seguidas</label>
          <input
            type="number"
            min="1"
            value={config.maxLoss}
            onChange={(e) => updateConfig({ maxLoss: parseInt(e.target.value, 10) || 4 })}
            className="w-24 bg-[#18202f] border border-[#222c3f] text-[#eef2f8] px-2 py-1 rounded text-right font-mono"
          />
        </div>
        <div className="flex items-center justify-between">
          <label className="text-[#8593aa]">Pausar se acerto &lt;</label>
          <div className="flex items-center gap-1">
            <input
              type="number"
              min="0"
              max="100"
              value={config.minAcc}
              onChange={(e) => updateConfig({ minAcc: parseInt(e.target.value, 10) || 80 })}
              className="w-20 bg-[#18202f] border border-[#222c3f] text-[#eef2f8] px-2 py-1 rounded text-right font-mono"
            />
            <span className="text-[#8593aa] font-mono">%</span>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <label className="text-[#8593aa]">Máx. ticks de atraso</label>
          <input
            type="number"
            min="0"
            max="20"
            value={config.maxStale}
            onChange={(e) => updateConfig({ maxStale: parseInt(e.target.value, 10) || 2 })}
            className="w-24 bg-[#18202f] border border-[#222c3f] text-[#eef2f8] px-2 py-1 rounded text-right font-mono"
          />
        </div>
      </div>
    </div>
  );
}
