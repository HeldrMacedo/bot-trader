"use client";

import React, { useState } from 'react';
import { useBearDiffer } from '@/app/hooks/useBearDiffer';
import ConfigSidebar from './components/ConfigSidebar';
import OperationTab from './components/tabs/OperationTab';
import LogicsTab from './components/tabs/LogicsTab';
import VigilanceTab from './components/tabs/VigilanceTab';
import LabTab from './components/tabs/LabTab';
import ValidationTab from './components/tabs/ValidationTab';
import RiskTab from './components/tabs/RiskTab';
import PipelineTab from './components/tabs/PipelineTab';
import SystemTab from './components/tabs/SystemTab';
import { CpuChipIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-toastify';

export default function BearBotDiffer() {
  const {
    engine,
    state,
    config,
    updateConfig,
    isConnected,
    accountInfo,
    activeAccount,
    switchAccount,
    executeTrade,
    resetSession,
    armVirtualLoss,
    cancelVirtualLoss,
    setWarmTarget,
    vlossState,
    exportCSV,
  } = useBearDiffer();

  const [activeTab, setActiveTab] = useState<
    'op' | 'lg' | 'wt' | 'stat' | 'val' | 'risk' | 'fab' | 'sys'
  >('op');

  const handleAccountToggle = async (isVirtual: boolean) => {
    try {
      toast.info(`Alternando para conta ${isVirtual ? 'Virtual' : 'Real'}...`);
      await switchAccount(isVirtual);
      toast.success('Conta alterada com sucesso!');
    } catch (e: any) {
      toast.error(`Falha ao alterar conta: ${e?.message || e}`);
    }
  };

  const tabs: Array<{ id: typeof activeTab; name: string }> = [
    { id: 'op', name: 'Operação' },
    { id: 'lg', name: 'Lógicas' },
    { id: 'wt', name: 'Vigilância' },
    { id: 'stat', name: 'Laboratório estatístico' },
    { id: 'val', name: 'Validação' },
    { id: 'risk', name: 'Risco' },
    { id: 'fab', name: 'Esteira' },
    { id: 'sys', name: 'Sistema' },
  ];

  return (
    <div className="w-full bg-[#0a0e15] text-[#eef2f8] min-h-screen pb-10">
      {/* Header Unificado com Padrão Bear Bot Ultra 2 */}
      <div className="border-b border-[#222c3f] bg-[#0e131d] px-6 py-4 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-xl">
            <CpuChipIcon className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold">Bear Bot Differ</h1>
              <span className="text-[10px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded border border-amber-500/30 font-mono font-bold">
                DIFFER IA 3.5
              </span>
            </div>
            <p className="text-xs text-[#8593aa]">
              Plataforma Multi-Mercado de Análise e Operação Estatística
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex flex-col">
            <span className="text-[10px] text-[#8593aa] uppercase tracking-wider">CONTA</span>
            <span className="font-bold font-mono text-cyan-400">
              {config.opMode === 'sim'
                ? '📄 SIMULAÇÃO'
                : activeAccount
                ? activeAccount.is_virtual
                  ? 'VIRTUAL'
                  : 'REAL'
                : 'DESCONECTADO'}
            </span>
          </div>

          <div className="flex flex-col">
            <span className="text-[10px] text-[#8593aa] uppercase tracking-wider">SALDO</span>
            <span className="font-bold font-mono text-sm text-yellow-500">
              {activeAccount
                ? new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: activeAccount.currency || 'USD',
                  }).format(activeAccount.balance)
                : '$0.00'}
            </span>
          </div>

          <div className="flex flex-col">
            <span className="text-[10px] text-[#8593aa] uppercase tracking-wider">LUCRO ACUMULADO</span>
            <span
              className={`font-bold font-mono text-sm ${
                state.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {state.pnl >= 0 ? `+$${state.pnl.toFixed(2)}` : `-$${Math.abs(state.pnl).toFixed(2)}`}
            </span>
          </div>

          {activeAccount && (
            <button
              type="button"
              onClick={() => handleAccountToggle(!activeAccount.is_virtual)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#18202f] border border-[#222c3f] hover:border-amber-500 text-xs rounded transition-colors"
            >
              <ArrowPathIcon className="w-4 h-4 text-amber-400" />
              <span>{activeAccount.is_virtual ? 'Mudar p/ Real' : 'Mudar p/ Demo'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Barra de Abas */}
      <div className="flex gap-2 px-6 bg-[#0e131d] border-b border-[#222c3f] sticky top-[73px] z-20 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`py-3 px-4 text-xs font-bold whitespace-nowrap border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'text-amber-400 border-amber-500'
                : 'text-[#8593aa] border-transparent hover:text-[#eef2f8]'
            }`}
          >
            {tab.name}
          </button>
        ))}
      </div>

      {/* Conteúdo Principal: barra de configuração fixa à esquerda, aba à direita */}
      <div className="w-full p-4 grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        <div className="lg:col-span-3">
          <ConfigSidebar
            markets={state.markets}
            config={config}
            updateConfig={updateConfig}
          />
        </div>

        <div className="lg:col-span-9">
        {activeTab === 'op' && (
          <div>
            <OperationTab
              engine={engine}
              state={state}
              config={config}
              updateConfig={updateConfig}
              executeTrade={executeTrade}
              resetSession={resetSession}
              armVirtualLoss={armVirtualLoss}
              cancelVirtualLoss={cancelVirtualLoss}
              setWarmTarget={setWarmTarget}
              exportCSV={exportCSV}
              vlossState={vlossState}
            />
          </div>
        )}

        {activeTab === 'lg' && (
          <div>
            <LogicsTab engine={engine} state={state} />
          </div>
        )}

        {activeTab === 'wt' && (
          <div>
            <VigilanceTab engine={engine} state={state} />
          </div>
        )}

        {activeTab === 'stat' && (
          <div>
            <LabTab engine={engine} state={state} />
          </div>
        )}

        {activeTab === 'val' && (
          <div>
            <ValidationTab engine={engine} state={state} />
          </div>
        )}

        {activeTab === 'risk' && (
          <div>
            <RiskTab engine={engine} state={state} />
          </div>
        )}

        {activeTab === 'fab' && (
          <div>
            <PipelineTab engine={engine} state={state} />
          </div>
        )}

        {activeTab === 'sys' && (
          <div>
            <SystemTab engine={engine} state={state} exportCSV={exportCSV} />
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
