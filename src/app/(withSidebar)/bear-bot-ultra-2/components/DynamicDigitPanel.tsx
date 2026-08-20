"use client";

import React, { useState } from 'react';
import {
  BotConfig, BotState, DynamicDigitResult, MARKETS
} from '../../../services/bearbot2.types';
import {
  BoltIcon, SparklesIcon, ChartBarIcon, ArrowTrendingUpIcon,
  ShieldCheckIcon, InformationCircleIcon, CheckCircleIcon
} from '@heroicons/react/24/outline';

interface DynamicDigitPanelProps {
  config: BotConfig;
  state: BotState;
  dynamicInfo: DynamicDigitResult;
  updateConfig: (u: Partial<BotConfig>) => void;
  manualFire: (mode: string) => void;
  isAuthenticated: boolean;
}

function getScoreColor(score: number) {
  if (score >= 70) {
    return {
      bg: 'bg-green-500/10',
      border: 'border-green-500/40',
      text: 'text-green-400',
      bar: 'from-green-500 to-emerald-400',
      badge: 'bg-green-500/20 text-green-300 border-green-500/40',
      status: '🟢 EXCELENTE — ALTA SEGURANÇA',
      desc: 'Dígito extremamente frio e sem correlação sequencial. Ideal para DIFFER.',
    };
  }
  if (score >= 50) {
    return {
      bg: 'bg-yellow-500/10',
      border: 'border-yellow-500/40',
      text: 'text-yellow-400',
      bar: 'from-yellow-500 to-amber-400',
      badge: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
      status: '🟡 MODERADO — SEGURANÇA MÉDIA',
      desc: 'Condições estatísticas aceitáveis, mas com leve frequência recente.',
    };
  }
  return {
    bg: 'bg-red-500/10',
    border: 'border-red-500/40',
    text: 'text-red-400',
    bar: 'from-red-600 to-red-400',
    badge: 'bg-red-500/20 text-red-300 border-red-500/40',
    status: '🔴 ATENÇÃO — RISCO ELEVADO',
    desc: 'Dígito com histórico recente frequente ou transição de Markov ativa.',
  };
}

export default function DynamicDigitPanel({
  config,
  state,
  dynamicInfo,
  updateConfig,
  manualFire,
  isAuthenticated,
}: DynamicDigitPanelProps) {
  const [selectedDigitTab, setSelectedDigitTab] = useState<number | null>(null);

  const activeMarket = MARKETS.find(m => m.sym === config.activeSym);
  const activeDigit = dynamicInfo.digit;
  const inspectedDigit = selectedDigitTab !== null ? selectedDigitTab : activeDigit;
  const detail = dynamicInfo.breakdown?.[inspectedDigit] || {
    fScore: 50, mScore: 50, tScore: 50, aScore: 50, composite: 50, rawCount50: 0
  };

  const colors = getScoreColor(dynamicInfo.score);
  const isTopReady = dynamicInfo.score >= 70;

  // Multi-market top candidate
  const topCandidate = config.multiOn
    ? Object.values(state.marketIntel).sort((a: any, b: any) => b.opportunityScore - a.opportunityScore)[0]
    : null;
  const topMarket = topCandidate ? MARKETS.find(m => m.sym === topCandidate.sym) : null;

  return (
    <div className="bg-[#131925] border border-indigo-500/30 rounded-xl p-4 shadow-2xl flex flex-col gap-4 relative overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute -top-24 -right-24 w-60 h-60 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#222c3f] pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
            <SparklesIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold tracking-wider text-white flex items-center gap-2">
              🎯 RADAR DE DÍGITOS DINÂMICOS
              <span className="text-[10px] bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 px-2 py-0.5 rounded font-mono font-bold">
                SCORE COMPOSTO
              </span>
            </h2>
            <p className="text-[11px] text-[#8593aa]">
              Ativo: <span className="text-cyan-400 font-bold">{activeMarket?.nm || config.activeSym}</span>
              {config.multiOn ? " · Multi-Mercado ON" : " · Mercado Único"}
            </p>
          </div>
        </div>

        {/* Multi-Market Leader Pill */}
        {config.multiOn && topMarket && topMarket.sym !== config.activeSym && (
          <button
            onClick={() => updateConfig({ activeSym: topMarket.sym })}
            className="flex items-center gap-2 bg-[#070b14] border border-yellow-500/40 hover:border-yellow-400 px-3 py-1 rounded-lg text-xs transition-all cursor-pointer"
          >
            <span className="text-yellow-400">⭐ Líder Multi:</span>
            <span className="font-bold text-white">{topMarket.nm}</span>
            <span className="text-yellow-400 font-mono font-bold">({topCandidate.opportunityScore})</span>
          </button>
        )}
      </div>

      {/* Hero Section: Top Recommended Digit & Entry Indicator */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
        {/* Left: Recommended Digit Card (5/12) */}
        <div className={`md:col-span-5 p-4 rounded-xl border ${colors.border} ${colors.bg} flex items-center gap-4 relative`}>
          <div className="flex flex-col items-center justify-center w-20 h-20 rounded-xl bg-[#070b14] border border-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.25)]">
            <span className="text-[9px] text-[#8593aa] uppercase font-bold tracking-wider">DÍGITO</span>
            <span className="text-3xl font-mono font-extrabold text-indigo-400">{activeDigit}</span>
            <span className="text-[8px] bg-indigo-600/30 text-indigo-300 px-1 rounded font-bold">RECOMENDADO</span>
          </div>

          <div className="flex-1 flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-300">Segurança Differ:</span>
              <span className={`text-base font-mono font-extrabold ${colors.text}`}>
                {dynamicInfo.score}%
              </span>
            </div>
            <div className="w-full bg-[#18202f] h-2 rounded-full overflow-hidden">
              <div
                style={{ width: `${dynamicInfo.score}%` }}
                className={`h-full bg-gradient-to-r ${colors.bar} transition-all duration-500`}
              />
            </div>
            <span className={`text-[10px] font-bold mt-1 ${colors.text}`}>
              {colors.status}
            </span>
          </div>
        </div>

        {/* Right: Trigger Thermometer & Execution Action (7/12) */}
        <div className="md:col-span-7 bg-[#0e131d] border border-[#222c3f] rounded-xl p-3.5 flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ArrowTrendingUpIcon className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-bold text-[#eef2f8]">Gatilho de Entrada (Differ ≠ {activeDigit})</span>
            </div>
            <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold border ${colors.badge}`}>
              {config.exec === 'auto' ? (config.autoOn ? '🤖 AUTO ATIVO' : '🤖 AUTO EM ESPERA') : '🖐️ MODO MANUAL'}
            </span>
          </div>

          {/* Status Message */}
          <p className="text-[11px] text-[#8593aa]">
            {colors.desc}
          </p>

          {/* Action Trigger based on exec mode */}
          {config.exec === 'manual' ? (
            <button
              onClick={() => manualFire('differ')}
              disabled={!isAuthenticated && !config.paperMode}
              className={`w-full py-2.5 px-4 rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg disabled:opacity-50 ${
                isTopReady
                  ? "bg-green-600 hover:bg-green-500 text-white shadow-[0_0_15px_rgba(34,197,94,0.4)] animate-pulse"
                  : "bg-indigo-600 hover:bg-indigo-500 text-white"
              }`}
            >
              <BoltIcon className="w-4 h-4" />
              <span>Entrar Agora no Dígito {activeDigit} (Differ ≠ {activeDigit})</span>
            </button>
          ) : (
            <div className="flex items-center justify-between bg-[#070b14] p-2 rounded-lg border border-[#222c3f]">
              <span className="text-[11px] text-gray-400">Status do Motor Automático:</span>
              <span className={`text-xs font-bold ${config.autoOn ? (isTopReady ? 'text-green-400' : 'text-yellow-400') : 'text-gray-500'}`}>
                {config.autoOn ? (isTopReady ? '● PRONTO PARA DISPARO' : '● MONITORANDO CONDIÇÕES') : '○ ROBÔ DESLIGADO'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Digits 0 to 9 Ranking Grid */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#8593aa] flex items-center gap-1.5">
            <ChartBarIcon className="w-4 h-4" />
            Ranking de Segurança dos 10 Dígitos (0 a 9)
          </span>
          <span className="text-[10px] text-gray-500">Clique em um dígito para inspecionar</span>
        </div>

        <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5">
          {Array.from({ length: 10 }).map((_, d) => {
            const digitScore = dynamicInfo.scores?.[d] ?? 50;
            const isWinner = d === activeDigit;
            const isSelected = d === inspectedDigit;
            const c = getScoreColor(digitScore);

            return (
              <button
                key={d}
                onClick={() => setSelectedDigitTab(d)}
                className={`p-2 rounded-lg border transition-all flex flex-col items-center gap-1 cursor-pointer ${
                  isWinner
                    ? "bg-indigo-600/20 border-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.3)] ring-1 ring-indigo-400"
                    : isSelected
                    ? "bg-[#18202f] border-cyan-500"
                    : "bg-[#0e131d] border-[#222c3f] hover:bg-[#18202f]/60"
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-xs font-mono font-bold text-white">{d}</span>
                  {isWinner && (
                    <span className="text-[7px] bg-indigo-600 text-white px-1 rounded font-bold">ALVO</span>
                  )}
                </div>

                <div className="w-full bg-[#18202f] h-1.5 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${digitScore}%` }}
                    className={`h-full bg-gradient-to-r ${c.bar}`}
                  />
                </div>

                <span className={`text-[10px] font-mono font-bold ${c.text}`}>
                  {digitScore}%
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Inspected Digit 4 Pillars Breakdown Card */}
      <div className="bg-[#0e131d] border border-[#222c3f] rounded-xl p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <ShieldCheckIcon className="w-4 h-4 text-indigo-400" />
            <span className="text-xs font-bold text-white">
              Pilares Estatísticos do Dígito {inspectedDigit}
              {inspectedDigit === activeDigit && <span className="text-indigo-400 ml-1">(Recomendado)</span>}
            </span>
          </div>
          <span className="text-[10px] text-gray-500">
            Total de saídas nos últimos 50 ticks: <strong className="text-cyan-400 font-mono">{detail.rawCount50}</strong>
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
          <div className="bg-[#070b14] border border-[#2e3a52] p-2 rounded-lg flex flex-col gap-1">
            <div className="flex justify-between items-center text-[10px]">
              <span className="text-cyan-400 font-bold">❄️ Frequência Inversa (40%)</span>
              <span className="font-mono font-bold text-cyan-300">{detail.fScore}%</span>
            </div>
            <div className="w-full bg-[#18202f] h-1 rounded-full overflow-hidden">
              <div style={{ width: `${detail.fScore}%` }} className="h-full bg-cyan-500" />
            </div>
          </div>

          <div className="bg-[#070b14] border border-[#2e3a52] p-2 rounded-lg flex flex-col gap-1">
            <div className="flex justify-between items-center text-[10px]">
              <span className="text-purple-400 font-bold">🔗 Inverso Markov (30%)</span>
              <span className="font-mono font-bold text-purple-300">{detail.mScore}%</span>
            </div>
            <div className="w-full bg-[#18202f] h-1 rounded-full overflow-hidden">
              <div style={{ width: `${detail.mScore}%` }} className="h-full bg-purple-500" />
            </div>
          </div>

          <div className="bg-[#070b14] border border-[#2e3a52] p-2 rounded-lg flex flex-col gap-1">
            <div className="flex justify-between items-center text-[10px]">
              <span className="text-pink-400 font-bold">📐 Inverso Trigrama (15%)</span>
              <span className="font-mono font-bold text-pink-300">{detail.tScore}%</span>
            </div>
            <div className="w-full bg-[#18202f] h-1 rounded-full overflow-hidden">
              <div style={{ width: `${detail.tScore}%` }} className="h-full bg-pink-500" />
            </div>
          </div>

          <div className="bg-[#070b14] border border-[#2e3a52] p-2 rounded-lg flex flex-col gap-1">
            <div className="flex justify-between items-center text-[10px]">
              <span className="text-green-400 font-bold">🛡️ Resistência Anomalia (15%)</span>
              <span className="font-mono font-bold text-green-300">{detail.aScore}%</span>
            </div>
            <div className="w-full bg-[#18202f] h-1 rounded-full overflow-hidden">
              <div style={{ width: `${detail.aScore}%` }} className="h-full bg-green-500" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
