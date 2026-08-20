"use client";

import { useBearBot } from '../../hooks/useBearBot2';
import { buildLoserSet } from '../../services/bearbot2.types';
import { toast } from 'react-toastify';
import MarketGrid from './components/MarketGrid';
import IntelPanel from './components/IntelPanel';
import TradeLogComponent from './components/TradeLog';
import DynamicDigitPanel from './components/DynamicDigitPanel';
import {
  PlayIcon, StopIcon, SpeakerWaveIcon, SpeakerXMarkIcon,
  BeakerIcon, CpuChipIcon, ChartBarIcon, ShieldCheckIcon,
  EyeIcon, BoltIcon, ArrowPathIcon
} from '@heroicons/react/24/outline';

function validateNumber(val: string, min: number, max: number, allowZero: boolean = false): string {
  const v = val.replace(',', '.').replace(/[^0-9.]/g, '');
  const n = Number(v);
  if (isNaN(n) || n < 0) return String(min);
  if (!allowZero && n === 0) return String(min);
  if (n < min) return String(min);
  if (n > max) return String(max);
  return v;
}

export default function BearBotUltra() {
  const {
    state, config, updateConfig, executeTrade, startBot, stopBot, abortOp,
    resetStats, manualFire, exportCSV, isConnected, accountInfo, switchAccount,
    getDynamicDifferDigit
  } = useBearBot();
  const activeAccount = accountInfo?.tokens?.find((t: any) => t.token === accountInfo.activeToken);
  const isAuthenticated = !!activeAccount;
  const tradesThisHourCount = state.tradesThisHour.filter((t) => t > Date.now() - 3_600_000).length;
  const cooldownLeftMs = state.lastTradeTime > 0
    ? Math.max(0, config.tradeCooldownMs - (Date.now() - state.lastTradeTime))
    : 0;

  const dynamicDifferInfo = getDynamicDifferDigit
    ? getDynamicDifferDigit(config.activeSym)
    : { digit: config.digit, score: 50, scores: {}, breakdown: {} };

  const handleModeChange = (mode: typeof config.mode) => {
    updateConfig({ mode });
  };

  const handleDigitChange = (digit: number) => {
    updateConfig({ digit });
  };

  const handleComboUnderChange = (val: number) => {
    const currentOver = config.comboOver ?? 5;
    const newUnder = Math.max(0, Math.min(8, val));
    const newOver = Math.max(newUnder, currentOver);
    updateConfig({ comboUnder: newUnder, comboOver: newOver });
  };

  const handleComboOverChange = (val: number) => {
    const currentUnder = config.comboUnder ?? 4;
    const newOver = Math.max(1, Math.min(9, val));
    const newUnder = Math.min(currentUnder, newOver);
    updateConfig({ comboUnder: newUnder, comboOver: newOver });
  };

  const handleStakeChange = (val: string) => {
    const raw = validateNumber(val, 0.01, 1000);
    updateConfig({ stake: Number(raw) });
  };

  const handleGaleChange = (val: string) => {
    updateConfig({ gale: Number(validateNumber(val, 1.01, 10)) });
  };

  const handleStopLossChange = (val: string) => {
    updateConfig({ stopLoss: Number(validateNumber(val, 1, 99999)) });
  };

  const handleStopWinChange = (val: string) => {
    updateConfig({ stopWin: Number(validateNumber(val, 1, 99999)) });
  };

  const handleAccountToggle = async (isVirtual: boolean) => {
    const targetToken = accountInfo?.tokens?.find((t: any) => t.is_virtual === isVirtual)?.token;
    if (targetToken) {
      abortOp();
      if (config.autoOn) {
        stopBot();
      }
      toast.info(`Trocando para conta ${isVirtual ? "Virtual" : "Real"}...`);
      try {
        await switchAccount(isVirtual);
        toast.success("Conta alterada com sucesso!");
      } catch (e: any) {
        toast.error(`Falha ao alterar conta: ${e?.message || e}`);
      }
    } else {
      toast.error(`Nenhum token configurado para conta ${isVirtual ? "Virtual" : "Real"}`);
    }
  };

  return (
    <div className="w-full bg-[#0d0a18] text-[#eef2f8] min-h-screen pb-10">
      {/* Header */}
      <div className="border-b border-[#222c3f] bg-[#0e131d] px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-600/10 border border-indigo-500/30 flex items-center justify-center text-xl overflow-hidden">
            <CpuChipIcon className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold">Bear Bot Ultra 10.0 <span className="text-[10px] bg-indigo-600/20 text-indigo-400 px-1.5 py-0.5 rounded border border-indigo-500/30 ml-2">IA CROSS-MARKET</span></h1>
            <p className="text-xs text-[#8593aa]">Inteligência Probabilística Multi-Mercado · Arquitetura Refatorada</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex flex-col">
            <span className="text-[10px] text-[#8593aa] uppercase tracking-wider">CONTA</span>
            <span className="font-bold font-mono text-cyan-400">
              {config.paperMode ? "📄 PAPER" : activeAccount ? (activeAccount.is_virtual ? "VIRTUAL" : "REAL") : "DESCONECTADO"}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-[#8593aa] uppercase tracking-wider">Saldo</span>
            <span className="font-bold font-mono text-sm text-yellow-500">
              {activeAccount ? new Intl.NumberFormat('en-US', { style: 'currency', currency: activeAccount.currency || 'USD' }).format(activeAccount.balance) : "$0.00"}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-[#8593aa] uppercase tracking-wider">LUCRO ACUMULADO</span>
            <span className={`font-bold font-mono text-sm ${state.pnl >= 0 ? "text-green-500" : "text-red-500"}`}>
              {state.pnl >= 0 ? `+$${state.pnl.toFixed(2)}` : `-$${Math.abs(state.pnl).toFixed(2)}`}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-[#8593aa] uppercase tracking-wider">ASSERTIVIDADE</span>
            <span className="font-bold font-mono text-sm text-yellow-500">
              {state.wins + state.loss > 0 ? `${Math.round((state.wins / (state.wins + state.loss)) * 100)}%` : "0%"}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-[#8593aa] uppercase tracking-wider">WS</span>
            <span className={`font-bold font-mono text-xs ${isConnected ? 'text-green-400' : 'text-red-400'}`}>
              {isConnected ? '● ONLINE' : '● OFFLINE'}
            </span>
          </div>

          {/* Toggle Real/Demo */}
          {accountInfo && (
            <div className="flex items-center bg-[#070b14] border border-[#2e3a52] rounded-lg p-1">
              <button
                onClick={() => handleAccountToggle(true)}
                className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${activeAccount?.is_virtual
                  ? "bg-yellow-600/30 text-yellow-400 border border-yellow-500/50"
                  : "text-[#8593aa] hover:text-[#eef2f8]"
                  }`}
              >
                Demo
              </button>
              <button
                onClick={() => handleAccountToggle(false)}
                className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${activeAccount && !activeAccount.is_virtual
                  ? "bg-red-600/30 text-red-400 border border-red-500/50"
                  : "text-[#8593aa] hover:text-[#eef2f8]"
                  }`}
              >
                Real
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Grid Principal */}
      <div className="w-full p-4 grid grid-cols-1 lg:grid-cols-12 gap-4">

        {/* Coluna Esquerda (3/12) */}
        <div className="lg:col-span-3 flex flex-col gap-4">

          {/* Card: Execução */}
          <div className="bg-[#131925] border border-[#222c3f] rounded-xl p-4 shadow-xl">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#8593aa] mb-3 flex items-center gap-2">
              <BoltIcon className="w-4 h-4" /> CONTROLE
            </h2>
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between bg-[#0e131d] p-3 border border-[#222c3f] rounded-lg">
                <div className="flex items-center gap-2">
                  <BeakerIcon className="w-4 h-4 text-indigo-400" />
                  <div>
                    <span className="text-xs font-bold">Paper Trading</span>
                    <p className="text-[9px] text-[#8593aa]">Simula sem enviar ordens reais</p>
                  </div>
                </div>
                <button onClick={() => updateConfig({ paperMode: !config.paperMode })} className={`w-12 h-6 rounded-full transition-all relative ${config.paperMode ? "bg-indigo-600" : "bg-[#18202f] border border-[#2e3a52]"}`}>
                  <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-all ${config.paperMode ? "left-[26px]" : "left-0.5"}`} />
                </button>
              </div>

              <div>
                <label className="text-[10px] text-[#8593aa] uppercase tracking-wider block mb-1">Modo de Execução</label>
                <div className="grid grid-cols-2 gap-2 bg-[#070b14] p-1 border border-[#2e3a52] rounded-lg">
                  <button onClick={() => { updateConfig({ exec: 'manual' }); stopBot(); }} className={`py-2 text-xs font-bold rounded-md transition-all ${config.exec === 'manual' ? "bg-indigo-600 text-white" : "text-[#8593aa] hover:text-[#eef2f8]"}`}>Manual</button>
                  <button onClick={() => updateConfig({ exec: 'auto' })} className={`py-2 text-xs font-bold rounded-md transition-all ${config.exec === 'auto' ? "bg-indigo-600 text-white" : "text-[#8593aa] hover:text-[#eef2f8]"}`}>Automático</button>
                </div>
              </div>

              {config.exec === 'auto' ? (
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={config.autoOn ? stopBot : startBot} disabled={!isAuthenticated && !config.paperMode} className={`py-3 rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition-all ${config.autoOn ? "bg-red-600 hover:bg-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.3)] animate-pulse" : "bg-green-600 hover:bg-green-500 text-[#04140a] disabled:opacity-50"}`}>
                    {config.autoOn ? (<><StopIcon className="w-4 h-4" /> Desligar Robô</>) : (<><PlayIcon className="w-4 h-4" /> Ligar Robô</>)}
                  </button>
                  <button onClick={abortOp} className="bg-[#18202f] border border-[#2e3a52] hover:bg-[#222c3f] py-3 rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition-all">Pausar / Abortar</button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => manualFire(config.mode)} disabled={!isAuthenticated && !config.paperMode} className="bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50">
                    <PlayIcon className="w-4 h-4" /> Entrar Agora
                  </button>
                  <button onClick={abortOp} className="bg-[#18202f] border border-[#2e3a52] hover:bg-[#222c3f] py-3 rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition-all">Zerar Gale</button>
                </div>
              )}

              <div className="flex items-center justify-between gap-4 mt-1 bg-[#070b14] p-3 border border-[#2e3a52] rounded-lg">
                <div className="flex items-center gap-2">
                  <button onClick={() => updateConfig({ soundOn: !config.soundOn })} className="p-1.5 rounded-md bg-[#18202f] hover:bg-[#222c3f] transition-all">
                    {config.soundOn ? <SpeakerWaveIcon className="w-4 h-4 text-green-400" /> : <SpeakerXMarkIcon className="w-4 h-4 text-gray-500" />}
                  </button>
                  <span className="text-xs text-[#8593aa]">Som</span>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => { updateConfig({ multiOn: !config.multiOn }); }} className={`px-3 py-1.5 rounded-md text-xs font-bold border transition-all ${config.multiOn ? "bg-indigo-600 border-indigo-500 text-white" : "bg-[#18202f] border-[#2e3a52] text-[#8593aa]"}`}>{config.multiOn ? "Multi ON" : "Multi OFF"}</button>
                </div>
              </div>
            </div>
          </div>

          {/* Card: Estratégia */}
          <div className="bg-[#131925] border border-[#222c3f] rounded-xl p-4 shadow-xl">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#8593aa] mb-3">⚙️ ESTRATÉGIA</h2>
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-[10px] text-[#8593aa] uppercase tracking-wider block mb-1">Estratégia</label>
                <div className="grid grid-cols-4 gap-1 bg-[#070b14] p-1 border border-[#2e3a52] rounded-lg">
                  {(['over', 'under', 'differ', 'combo'] as const).map((m) => (
                    <button key={m} onClick={() => handleModeChange(m)} className={`py-1.5 text-[10px] font-bold rounded transition-all uppercase ${config.mode === m ? "bg-indigo-600 text-white" : "text-[#8593aa] hover:text-[#eef2f8]"}`}>{m}</button>
                  ))}
                </div>
              </div>

              {config.mode === 'differ' && (
                <div className="flex items-center justify-between bg-[#070b14] p-2.5 border border-[#2e3a52] rounded-lg">
                  <div>
                    <span className="text-xs font-bold text-[#eef2f8] block">Dígitos Dinâmicos</span>
                    <span className="text-[10px] text-[#8593aa]">Calcula o dígito mais seguro a cada tick via Score Composto</span>
                  </div>
                  <button
                    data-testid="toggle-dynamic-digit"
                    onClick={() => {
                      const next = !config.differDynamicDigit;
                      if (next) {
                        updateConfig({ differDynamicDigit: true, vlOn: false, patTrigger: false, differAutoDigit: false });
                      } else {
                        updateConfig({ differDynamicDigit: false });
                      }
                    }}
                    className={`w-12 h-6 rounded-full transition-all relative ${config.differDynamicDigit ? "bg-indigo-600" : "bg-[#18202f] border border-[#2e3a52]"}`}
                  >
                    <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-all ${config.differDynamicDigit ? "left-[26px]" : "left-0.5"}`} />
                  </button>
                </div>
              )}

              {config.mode === 'differ' && config.vlOn && !config.differDynamicDigit && (
                <div className="flex items-center justify-between bg-[#070b14] p-2.5 border border-[#2e3a52] rounded-lg">
                  <div>
                    <span className="text-xs font-bold text-[#eef2f8] block">Dígito Automático</span>
                    <span className="text-[10px] text-[#8593aa]">Entra differ no dígito repetido por Loss Virtual</span>
                  </div>
                  <button
                    data-testid="toggle-auto-digit"
                    onClick={() => updateConfig({ differAutoDigit: !config.differAutoDigit })}
                    className={`w-12 h-6 rounded-full transition-all relative ${config.differAutoDigit ? "bg-indigo-600" : "bg-[#18202f] border border-[#2e3a52]"}`}
                  >
                    <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-all ${config.differAutoDigit ? "left-[26px]" : "left-0.5"}`} />
                  </button>
                </div>
              )}

              {config.mode === 'combo' ? (
                <div className="flex flex-col gap-3 bg-[#070b14] p-3 border border-[#2e3a52] rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-400">Configuração COMBO</span>
                    <span className="text-[10px] bg-indigo-600/20 text-indigo-300 px-2 py-0.5 rounded font-mono font-bold">
                      {Math.max(0, ((config.comboUnder ?? 4) + (9 - (config.comboOver ?? 5))) * 10)}% WIN RATE TEÓRICO
                    </span>
                  </div>

                  {/* Seletores UNDER e OVER */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[10px] text-green-400 uppercase tracking-wider font-bold">
                          UNDER (&lt; {config.comboUnder ?? 4})
                        </label>
                      </div>
                      <div className="grid grid-cols-5 gap-1">
                        {Array.from({ length: 9 }).map((_, i) => (
                          <button
                            key={i}
                            onClick={() => handleComboUnderChange(i)}
                            className={`py-1 text-xs font-mono font-bold rounded border transition-all ${
                              (config.comboUnder ?? 4) === i
                                ? "bg-green-600 border-green-400 text-white shadow-[0_0_8px_rgba(34,197,94,0.4)]"
                                : i > (config.comboOver ?? 5)
                                ? "opacity-20 pointer-events-none border-transparent text-gray-600"
                                : "bg-[#18202f] border-[#2e3a52] text-gray-400 hover:text-white"
                            }`}
                          >
                            {i}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[10px] text-green-400 uppercase tracking-wider font-bold">
                          OVER (&gt; {config.comboOver ?? 5})
                        </label>
                      </div>
                      <div className="grid grid-cols-5 gap-1">
                        {Array.from({ length: 9 }).map((_, i) => {
                          const digitVal = i + 1; // 1 to 9
                          return (
                            <button
                              key={digitVal}
                              onClick={() => handleComboOverChange(digitVal)}
                              className={`py-1 text-xs font-mono font-bold rounded border transition-all ${
                                (config.comboOver ?? 5) === digitVal
                                ? "bg-green-600 border-green-400 text-white shadow-[0_0_8px_rgba(34,197,94,0.4)]"
                                : digitVal < (config.comboUnder ?? 4)
                                ? "opacity-20 pointer-events-none border-transparent text-gray-600"
                                : "bg-[#18202f] border-[#2e3a52] text-gray-400 hover:text-white"
                              }`}
                            >
                              {digitVal}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Régua Visual dos Dígitos */}
                  <div>
                    <span className="text-[9px] text-[#8593aa] block mb-1 uppercase tracking-wider font-semibold">
                      Zona dos Dígitos (Verde: WIN · Vermelho: LOSS)
                    </span>
                    <div className="grid grid-cols-10 gap-1">
                      {Array.from({ length: 10 }).map((_, i) => {
                        const underVal = config.comboUnder ?? 4;
                        const overVal = config.comboOver ?? 5;
                        const isUnderWin = i < underVal;
                        const isOverWin = i > overVal;
                        return (
                          <div
                            key={i}
                            className={`py-1 text-center font-mono font-bold text-xs rounded border transition-all ${
                              isUnderWin || isOverWin
                                ? "bg-green-500/10 border-green-500/30 text-green-400"
                                : "bg-red-500/10 border-red-500/30 text-red-400"
                            }`}
                          >
                            {i}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                <div className={config.mode === 'differ' && ((config.vlOn && config.differAutoDigit) || config.differDynamicDigit) ? 'opacity-40 pointer-events-none' : ''}>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] text-[#8593aa] uppercase tracking-wider block">Dígito Alvo</label>
                    {config.mode === 'differ' && config.vlOn && config.differAutoDigit && (
                      <span className="text-[10px] bg-indigo-600/30 text-indigo-400 border border-indigo-500/40 px-1.5 py-0.5 rounded font-bold">DÍGITO AUTO ATIVO</span>
                    )}
                    {config.mode === 'differ' && config.differDynamicDigit && (
                      <span className="text-[10px] bg-indigo-600/30 text-indigo-400 border border-indigo-500/40 px-1.5 py-0.5 rounded font-bold">DÍGITO DINÂMICO ATIVO</span>
                    )}
                  </div>
                  <div className="grid grid-cols-5 gap-1.5">
                    {Array.from({ length: 10 }).map((_, i) => (
                      <button
                        key={i}
                        disabled={config.mode === 'differ' && ((config.vlOn && config.differAutoDigit) || config.differDynamicDigit)}
                        onClick={() => handleDigitChange(i)}
                        className={`py-2 font-mono font-bold text-sm rounded-lg border transition-all ${config.digit === i ? "bg-indigo-600 border-indigo-500 text-white shadow-[0_0_10px_rgba(99,102,241,0.4)]" : buildLoserSet(config.mode, config.digit, config.comboUnder, config.comboOver).has(i) ? "bg-[#e23b32]/5 border-[#e23b32]/25 text-[#e23b32] hover:bg-[#e23b32]/10" : "bg-[#2eb84f]/5 border-[#2eb84f]/25 text-[#2eb84f] hover:bg-[#2eb84f]/10"}`}
                      >
                        {i}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-[#8593aa] uppercase tracking-wider block mb-1">Entrada Inicial</label>
                  <input type="text" inputMode="decimal" value={config.stake} onChange={(e) => handleStakeChange(e.target.value)} className="w-full bg-[#070b14] border border-[#2e3a52] text-white px-3 py-2 rounded-lg font-mono text-sm focus:outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label className="text-[10px] text-[#8593aa] uppercase tracking-wider block mb-1">Martingale</label>
                  <input type="text" inputMode="decimal" value={config.gale} onChange={(e) => handleGaleChange(e.target.value)} className="w-full bg-[#070b14] border border-[#2e3a52] text-white px-3 py-2 rounded-lg font-mono text-sm focus:outline-none focus:border-indigo-500" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-[#8593aa] uppercase tracking-wider block mb-1">Stop Loss ($)</label>
                  <input type="text" inputMode="decimal" value={config.stopLoss} onChange={(e) => handleStopLossChange(e.target.value)} className="w-full bg-[#070b14] border border-[#2e3a52] text-white px-3 py-2 rounded-lg font-mono text-sm focus:outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label className="text-[10px] text-[#8593aa] uppercase tracking-wider block mb-1">Stop Win ($)</label>
                  <input type="text" inputMode="decimal" value={config.stopWin} onChange={(e) => handleStopWinChange(e.target.value)} className="w-full bg-[#070b14] border border-[#2e3a52] text-white px-3 py-2 rounded-lg font-mono text-sm focus:outline-none focus:border-indigo-500" />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-[#8593aa] uppercase tracking-wider block mb-1">Modo Martingale</label>
                <div className="grid grid-cols-2 gap-2 bg-[#070b14] p-1 border border-[#2e3a52] rounded-lg">
                  <button onClick={() => updateConfig({ galeMode: 'mult' })} className={`py-1.5 text-xs font-bold rounded-md transition-all ${config.galeMode === 'mult' ? "bg-indigo-600 text-white" : "text-[#8593aa] hover:text-[#eef2f8]"}`}>Multiplicador</button>
                  <button onClick={() => updateConfig({ galeMode: 'parc' })} className={`py-1.5 text-xs font-bold rounded-md transition-all ${config.galeMode === 'parc' ? "bg-indigo-600 text-white" : "text-[#8593aa] hover:text-[#eef2f8]"}`}>Parcelado</button>
                </div>
              </div>

              {config.galeMode === 'parc' && (
                <div>
                  <label className="text-[10px] text-[#8593aa] uppercase tracking-wider block mb-1">Parcelas</label>
                  <input type="number" min="1" max="10" value={config.galeParcels} onChange={(e) => updateConfig({ galeParcels: Math.max(1, Math.min(10, Number(e.target.value))) })} className="w-full bg-[#070b14] border border-[#2e3a52] text-white px-3 py-2 rounded-lg font-mono text-sm focus:outline-none focus:border-indigo-500" />
                </div>
              )}
            </div>
          </div>

          {/* Card: Loss Virtual */}
          <div className={`bg-[#131925] border border-[#222c3f] rounded-xl p-4 shadow-xl transition-all ${config.mode === 'differ' && config.differDynamicDigit ? 'opacity-40 pointer-events-none' : ''}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold uppercase tracking-wider text-[#8593aa]">🛡️ LOSS VIRTUAL</h2>
                {config.mode === 'differ' && config.differDynamicDigit && (
                  <span className="text-[9px] bg-gray-700/50 text-gray-400 border border-gray-600/40 px-1.5 py-0.5 rounded font-bold">DESATIVADO</span>
                )}
              </div>
              <button
                data-testid="toggle-loss-virtual"
                disabled={config.mode === 'differ' && config.differDynamicDigit}
                onClick={() => updateConfig({ vlOn: !config.vlOn })}
                className={`w-12 h-6 rounded-full transition-all relative ${config.vlOn ? "bg-green-600" : "bg-[#18202f] border border-[#2e3a52]"}`}
              >
                <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-all ${config.vlOn ? "left-[26px]" : "left-0.5"}`} />
              </button>
            </div>
            {config.vlOn && (
              <div className="flex flex-col gap-3">
                <div>
                  <label className="text-[10px] text-[#8593aa] uppercase tracking-wider block mb-1">Tipo</label>
                  <div className="grid grid-cols-2 gap-2 bg-[#070b14] p-1 border border-[#2e3a52] rounded-lg">
                    <button onClick={() => updateConfig({ vlMode: 'consec' })} className={`py-1.5 text-xs font-bold rounded-md transition-all ${config.vlMode === 'consec' ? "bg-indigo-600 text-white" : "text-[#8593aa] hover:text-[#eef2f8]"}`}>Consecutivo</button>
                    <button onClick={() => updateConfig({ vlMode: 'accum' })} className={`py-1.5 text-xs font-bold rounded-md transition-all ${config.vlMode === 'accum' ? "bg-indigo-600 text-white" : "text-[#8593aa] hover:text-[#eef2f8]"}`}>Acumulado</button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-[#8593aa] uppercase tracking-wider block mb-1">Qtd. Perdas</label>
                    <input type="number" min="1" max="20" value={config.vlQty} onChange={(e) => updateConfig({ vlQty: Math.max(1, Number(e.target.value)) })} className="w-full bg-[#070b14] border border-[#2e3a52] text-white px-3 py-2 rounded-lg font-mono text-sm focus:outline-none focus:border-indigo-500" />
                  </div>
                  {config.vlMode === 'accum' && (
                    <div>
                      <label className="text-[10px] text-[#8593aa] uppercase tracking-wider block mb-1">Janela</label>
                      <input type="number" min="1" max="100" value={config.vlWindow} onChange={(e) => updateConfig({ vlWindow: Math.max(1, Number(e.target.value)) })} className="w-full bg-[#070b14] border border-[#2e3a52] text-white px-3 py-2 rounded-lg font-mono text-sm focus:outline-none focus:border-indigo-500" />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Card: Padrão A→B (differ) */}
          {config.mode === 'differ' && (!config.vlOn || !config.differAutoDigit) && (
            <div className={`bg-[#131925] border border-[#222c3f] rounded-xl p-4 shadow-xl transition-all ${config.differDynamicDigit ? 'opacity-40 pointer-events-none' : ''}`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold uppercase tracking-wider text-[#8593aa]">🔗 PADRÃO A→B</h2>
                  {config.differDynamicDigit && (
                    <span className="text-[9px] bg-gray-700/50 text-gray-400 border border-gray-600/40 px-1.5 py-0.5 rounded font-bold">DESATIVADO</span>
                  )}
                </div>
                <button
                  data-testid="toggle-pattern-ab"
                  disabled={config.differDynamicDigit}
                  onClick={() => updateConfig({ patTrigger: !config.patTrigger })}
                  className={`w-12 h-6 rounded-full transition-all relative ${config.patTrigger ? "bg-purple-600" : "bg-[#18202f] border border-[#2e3a52]"}`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-all ${config.patTrigger ? "left-[26px]" : "left-0.5"}`} />
                </button>
              </div>
              {config.patTrigger && (
                <div className="flex flex-col gap-3">
                  <div>
                    <label className="text-[10px] text-[#8593aa] uppercase tracking-wider block mb-1">Modo de contagem</label>
                    <div className="grid grid-cols-2 gap-2 bg-[#070b14] p-1 border border-[#2e3a52] rounded-lg">
                      <button onClick={() => updateConfig({ patMode: 'accum' })} className={`py-1.5 text-xs font-bold rounded-md transition-all ${config.patMode === 'accum' ? "bg-indigo-600 text-white" : "text-[#8593aa] hover:text-[#eef2f8]"}`}>Acumulado</button>
                      <button onClick={() => updateConfig({ patMode: 'seq' })} className={`py-1.5 text-xs font-bold rounded-md transition-all ${config.patMode === 'seq' ? "bg-indigo-600 text-white" : "text-[#8593aa] hover:text-[#eef2f8]"}`}>Sequência</button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-[#8593aa] uppercase tracking-wider block mb-1">Repetições</label>
                      <input
                        type="number"
                        min={1}
                        max={20}
                        value={config.patReps}
                        onChange={(e) => updateConfig({ patReps: Math.max(1, Math.min(20, Number(e.target.value) || 1)) })}
                        className="w-full bg-[#070b14] border border-[#2e3a52] text-white px-3 py-2 rounded-lg font-mono text-sm focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-[#8593aa] uppercase tracking-wider block mb-1">Força mín. (%)</label>
                      <input
                        type="number"
                        min={1}
                        max={100}
                        value={config.patMinForce}
                        onChange={(e) => updateConfig({ patMinForce: Math.max(1, Math.min(100, Number(e.target.value) || 30)) })}
                        className="w-full bg-[#070b14] border border-[#2e3a52] text-white px-3 py-2 rounded-lg font-mono text-sm focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>
                  <p className="text-[10px] text-[#8593aa]">Com trigger ativo, o bot entra em DIFFER ≠B quando o dígito A aparece e o padrão está armado (Wilson/Lift/força).</p>
                </div>
              )}
            </div>
          )}

          {/* Card: Proteções */}
          <div className="bg-[#131925] border border-[#222c3f] rounded-xl p-4 shadow-xl">
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheckIcon className="w-4 h-4 text-green-400" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-[#8593aa]">🛡️ PROTEÇÕES</h2>
            </div>
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-[#8593aa] uppercase tracking-wider block mb-1">Máx. trades/hora</label>
                  <input type="number" min="1" max="500" value={config.maxTradesHour} onChange={(e) => updateConfig({ maxTradesHour: Number(validateNumber(e.target.value, 1, 500)) })} className="w-full bg-[#070b14] border border-[#2e3a52] text-white px-3 py-2 rounded-lg font-mono text-sm focus:outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label className="text-[10px] text-[#8593aa] uppercase tracking-wider block mb-1">Cooldown (ms)</label>
                  <input type="number" min="0" step={500} value={config.tradeCooldownMs} onChange={(e) => updateConfig({ tradeCooldownMs: Number(validateNumber(e.target.value, 0, 600000, true)) })} className="w-full bg-[#070b14] border border-[#2e3a52] text-white px-3 py-2 rounded-lg font-mono text-sm focus:outline-none focus:border-indigo-500" />
                </div>
              </div>
              <p className="text-[10px] text-[#8593aa] font-mono">
                {tradesThisHourCount}/{config.maxTradesHour} nesta hora
                {cooldownLeftMs > 0 ? ` · cooldown ${cooldownLeftMs}ms` : ''}
              </p>
            </div>
          </div>

          {/* Card: Pós-Loss */}
          <div className="bg-[#131925] border border-[#222c3f] rounded-xl p-4 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold uppercase tracking-wider text-[#8593aa]">🔁 PÓS-LOSS</h2>
              <button onClick={() => updateConfig({ postLossOn: !config.postLossOn })} className={`w-12 h-6 rounded-full transition-all relative ${config.postLossOn ? "bg-green-600" : "bg-[#18202f] border border-[#2e3a52]"}`}>
                <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-all ${config.postLossOn ? "left-[26px]" : "left-0.5"}`} />
              </button>
            </div>
            {config.postLossOn && (
              <div className="flex flex-col gap-3">
                <div>
                  <label className="text-[10px] text-[#8593aa] uppercase tracking-wider block mb-1">Ação após LOSS</label>
                  <div className="grid grid-cols-2 gap-2 bg-[#070b14] p-1 border border-[#2e3a52] rounded-lg">
                    <button onClick={() => updateConfig({ postLossMode: 'recover' })} className={`py-1.5 text-xs font-bold rounded-md transition-all ${config.postLossMode === 'recover' ? "bg-indigo-600 text-white" : "text-[#8593aa] hover:text-[#eef2f8]"}`}>🔥 Recuperar</button>
                    <button onClick={() => updateConfig({ postLossMode: 'analyze' })} className={`py-1.5 text-xs font-bold rounded-md transition-all ${config.postLossMode === 'analyze' ? "bg-indigo-600 text-white" : "text-[#8593aa] hover:text-[#eef2f8]"}`}>🧠 Analisar</button>
                  </div>
                </div>
                {config.postLossMode === 'recover' ? (
                  <>
                    <div>
                      <label className="text-[10px] text-[#8593aa] uppercase tracking-wider block mb-1">Máx. tentativas</label>
                      <input type="number" min={1} max={5} value={config.recoverMaxAttempts} onChange={(e) => updateConfig({ recoverMaxAttempts: Number(validateNumber(e.target.value, 1, 5)) })} className="w-full bg-[#070b14] border border-[#2e3a52] text-white px-3 py-2 rounded-lg font-mono text-sm focus:outline-none focus:border-indigo-500" />
                    </div>
                    <div>
                      <label className="text-[10px] text-[#8593aa] uppercase tracking-wider block mb-1">Delay (ms)</label>
                      <input type="number" min={500} step={500} value={config.recoverDelay} onChange={(e) => updateConfig({ recoverDelay: Number(validateNumber(e.target.value, 500, 600000)) })} className="w-full bg-[#070b14] border border-[#2e3a52] text-white px-3 py-2 rounded-lg font-mono text-sm focus:outline-none focus:border-indigo-500" />
                    </div>
                    <div className="flex items-center gap-2 bg-[#1f0d0f] border border-red-900/50 p-2 rounded-lg">
                      <span className="text-red-400">⚠️</span>
                      <p className="text-[10px] text-red-300">Recuperação forçada usa gale ativo. Risco de banca aumenta exponencialmente.</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="text-[10px] text-[#8593aa] uppercase tracking-wider block mb-1">Cooldown (seg)</label>
                      <input type="number" min={0} max={60} value={config.cooldownSec} onChange={(e) => updateConfig({ cooldownSec: Number(validateNumber(e.target.value, 0, 60, true)) })} className="w-full bg-[#070b14] border border-[#2e3a52] text-white px-3 py-2 rounded-lg font-mono text-sm focus:outline-none focus:border-indigo-500" />
                    </div>
                    <div className="bg-[#0d1f14] border border-green-900/50 p-2 rounded-lg">
                      <p className="text-[10px] text-green-300">Após loss, aguarda o tempo definido, reseta o loss virtual e volta a operar apenas quando o sinal for válido novamente.</p>
                    </div>
                  </>
                )}
                {state.recovery.active && (
                  <div className="mt-1 p-2 rounded-lg bg-indigo-950/60 border border-indigo-500/40 text-[10px] font-mono text-indigo-300 flex items-center justify-between">
                    <span>
                      {config.postLossMode === 'recover'
                        ? `🔄 Recuperação: ${state.recovery.attemptsLeft}/${config.recoverMaxAttempts} tentativas`
                        : `⏳ Cooldown pós-loss ativo`}
                    </span>
                    <span className="text-indigo-400 font-bold animate-pulse">● ATIVO</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Coluna Central: Mercados com IA (6/12) */}
        <div className="lg:col-span-6 flex flex-col gap-4">
          <MarketGrid config={config} state={state} updateConfig={updateConfig} />

          {/* Painel Dedicado de Dígitos Dinâmicos */}
          {config.mode === 'differ' && config.differDynamicDigit && (
            <DynamicDigitPanel
              config={config}
              state={state}
              dynamicInfo={dynamicDifferInfo}
              updateConfig={updateConfig}
              manualFire={manualFire}
              isAuthenticated={isAuthenticated}
            />
          )}

          {/* Gráfico de Barras */}
          <div className="bg-[#131925] border border-[#222c3f] rounded-xl p-4 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-[#8593aa]">📊 DISTRIBUIÇÃO DOS ÚLTIMOS TICKS</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[10, 25, 50, 100].map((n) => {
                const arr = state.tickData[config.activeSym]?.digits.slice(-n) || [];
                const counts = new Array(10).fill(0);
                arr.forEach(d => counts[d]++);
                const tot = arr.length || 1;
                const lose = buildLoserSet(config.mode, config.digit, config.comboUnder, config.comboOver);
                return (
                  <div key={n} className="bg-[#0e131d] border border-[#222c3f] rounded-lg p-3">
                    <span className="text-[10px] text-[#8593aa] uppercase tracking-wider font-bold mb-2 block text-center">Últimos {n} Ticks</span>
                    <div className="flex items-end justify-between h-20 gap-1.5 mt-2">
                      {Array.from({ length: 10 }).map((_, i) => {
                        const pctNum = (counts[i] / tot) * 100;
                        const heightPct = Math.min(100, (pctNum / 50) * 100);
                        const isLoser = lose.has(i);
                        return (
                          <div key={i} className="flex flex-col items-center flex-1 h-full justify-end">
                            <span className="text-[8px] font-mono text-gray-500 mb-0.5">{Math.round(pctNum)}%</span>
                            <div style={{ height: `${counts[i] ? Math.max(heightPct, 4) : 2}%` }} className={`w-full rounded-t-sm transition-all ${isLoser ? "bg-gradient-to-t from-red-600 to-red-400" : counts[i] > 0 ? "bg-gradient-to-t from-green-600 to-green-400" : "bg-[#2e3a52]"}`} />
                            <span className={`text-[10px] font-mono font-bold mt-1 ${isLoser ? "text-red-400" : "text-green-400"}`}>{i}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Tabela de Transações */}
          <div className="bg-[#131925] border border-[#222c3f] rounded-xl p-4 shadow-xl overflow-x-auto">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#8593aa] mb-3">💰 ÚLTIMAS OPERAÇÕES</h2>
            <div className="max-h-[300px] overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-[#131925] z-10">
                  <tr className="border-b border-[#2e3a52] text-[#8593aa] uppercase text-[10px]">
                    <th className="py-2 px-3">Data/Hora</th>
                    <th className="py-2 px-3">Mercado</th>
                    <th className="py-2 px-3">Estratégia</th>
                    <th className="py-2 px-3">Alvo</th>
                    <th className="py-2 px-3">Saiu</th>
                    <th className="py-2 px-3">Auditoria</th>
                    <th className="py-2 px-3">Stake</th>
                    <th className="py-2 px-3">Tipo</th>
                    <th className="py-2 px-3">Resultado</th>
                    <th className="py-2 px-3">Lucro ($)</th>
                  </tr>
                </thead>
                <tbody>
                  {state.trades.length > 0 ? (
                    state.trades.map((t, index) => (
                      <tr key={index} className="border-b border-[#222c3f]/50 hover:bg-[#18202f]/20 font-mono">
                        <td className="py-2 px-3 text-gray-400">{new Date(t.t).toLocaleTimeString("pt-BR", { hour12: false })}</td>
                        <td className="py-2 px-3">{t.mercado}</td>
                        <td className="py-2 px-3 uppercase text-[10px]">{t.modo}</td>
                        <td className="py-2 px-3">{t.alvo}</td>
                        <td className="py-2 px-3">{t.saiu}</td>
                        <td className="py-2 px-3">
                          <span className="text-muted">{t.audit?.tick_previous}</span>-<span className="text-blue-500">{t.audit?.tick_start}</span>-<span className={`${t.resultado === 'WIN' ? 'text-green-400' : 'text-red-400'}`}>{t.audit?.tick_end}</span>
                        </td>
                        <td className="py-2 px-3">${t.stake}</td>
                        <td className="py-2 px-3">{t.paper ? <span className="text-indigo-400 text-[9px]">PAPER</span> : <span className="text-[9px] text-gray-500">REAL</span>}</td>
                        <td className="py-2 px-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${t.resultado === 'WIN' ? "bg-green-500/10 text-green-400 border border-green-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"}`}>{t.resultado}</span>
                        </td>
                        <td className={`py-2 px-3 font-bold ${Number(t.lucro) >= 0 ? "text-green-400" : "text-red-400"}`}>
                          {Number(t.lucro) >= 0 ? `+$${t.lucro}` : `-$${Math.abs(Number(t.lucro))}`}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan={10} className="py-8 text-center text-gray-500">Nenhum trade efetuado.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Coluna Direita: IA Detalhada & Logs (3/12) */}
        <div className="lg:col-span-3 flex flex-col gap-4">
          <IntelPanel config={config} state={state} />
          <TradeLogComponent state={state} onExport={exportCSV} onReset={resetStats} />
        </div>
      </div>
    </div>
  );
}




