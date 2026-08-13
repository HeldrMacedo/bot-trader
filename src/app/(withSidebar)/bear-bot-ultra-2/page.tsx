"use client";

import { useBearBot } from '../../hooks/useBearBot2';
import MarketGrid from './components/MarketGrid';
import IntelPanel from './components/IntelPanel';
import TradeLogComponent from './components/TradeLog';
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

function buildLoserSet(mode: string, digit: number): Set<number> {
  const set = new Set<number>();
  if (mode === 'over') { for (let i = 0; i <= digit; i++) set.add(i); }
  else if (mode === 'under') { for (let i = digit; i <= 9; i++) set.add(i); }
  else if (mode === 'combo') { set.add(4); set.add(5); }
  else { set.add(digit); }
  return set;
}

export default function BearBotUltra() {
  const { state, config, updateConfig, executeTrade, startBot, stopBot, abortOp, resetStats, manualFire, exportCSV, isConnected, accountInfo, switchAccount } = useBearBot();
  const activeAccount = accountInfo?.tokens?.find((t: any) => t.token === accountInfo.activeToken);
  const isAuthenticated = !!activeAccount;

  const handleModeChange = (mode: typeof config.mode) => {
    updateConfig({ mode });
  };

  const handleDigitChange = (digit: number) => {
    updateConfig({ digit });
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

              <div className={config.mode === 'combo' ? 'opacity-40 pointer-events-none' : ''}>
                <label className="text-[10px] text-[#8593aa] uppercase tracking-wider block mb-1">Dígito Alvo</label>
                <div className="grid grid-cols-5 gap-1.5">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <button key={i} onClick={() => handleDigitChange(i)} className={`py-2 font-mono font-bold text-sm rounded-lg border transition-all ${config.digit === i ? "bg-indigo-600 border-indigo-500 text-white shadow-[0_0_10px_rgba(99,102,241,0.4)]" : buildLoserSet(config.mode, config.digit).has(i) ? "bg-[#e23b32]/5 border-[#e23b32]/25 text-[#e23b32] hover:bg-[#e23b32]/10" : "bg-[#2eb84f]/5 border-[#2eb84f]/25 text-[#2eb84f] hover:bg-[#2eb84f]/10"}`}>{i}</button>
                  ))}
                </div>
              </div>

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
          <div className="bg-[#131925] border border-[#222c3f] rounded-xl p-4 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold uppercase tracking-wider text-[#8593aa]">🛡️ LOSS VIRTUAL</h2>
              <button onClick={() => updateConfig({ vlOn: !config.vlOn })} className={`w-12 h-6 rounded-full transition-all relative ${config.vlOn ? "bg-green-600" : "bg-[#18202f] border border-[#2e3a52]"}`}>
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
          {config.mode === 'differ' && (
            <div className="bg-[#131925] border border-[#222c3f] rounded-xl p-4 shadow-xl">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-bold uppercase tracking-wider text-[#8593aa]">🔗 PADRÃO A→B</h2>
                <button
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
                  <input type="number" min="1" max="500" value={config.maxTradesHour} onChange={(e) => updateConfig({ maxTradesHour: Math.max(1, Number(e.target.value)) })} className="w-full bg-[#070b14] border border-[#2e3a52] text-white px-3 py-2 rounded-lg font-mono text-sm focus:outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label className="text-[10px] text-[#8593aa] uppercase tracking-wider block mb-1">Cooldown (ms)</label>
                  <input type="number" min="0" step={500} value={config.tradeCooldownMs} onChange={(e) => updateConfig({ tradeCooldownMs: Math.max(0, Number(e.target.value)) })} className="w-full bg-[#070b14] border border-[#2e3a52] text-white px-3 py-2 rounded-lg font-mono text-sm focus:outline-none focus:border-indigo-500" />
                </div>
              </div>
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
                      <input type="number" min={1} max={5} value={config.recoverMaxAttempts} onChange={(e) => updateConfig({ recoverMaxAttempts: Math.max(1, Math.min(5, Number(e.target.value))) })} className="w-full bg-[#070b14] border border-[#2e3a52] text-white px-3 py-2 rounded-lg font-mono text-sm focus:outline-none focus:border-indigo-500" />
                    </div>
                    <div>
                      <label className="text-[10px] text-[#8593aa] uppercase tracking-wider block mb-1">Delay (ms)</label>
                      <input type="number" min={500} step={500} value={config.recoverDelay} onChange={(e) => updateConfig({ recoverDelay: Math.max(500, Number(e.target.value)) })} className="w-full bg-[#070b14] border border-[#2e3a52] text-white px-3 py-2 rounded-lg font-mono text-sm focus:outline-none focus:border-indigo-500" />
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
                      <input type="number" min={0} max={60} value={config.cooldownSec} onChange={(e) => updateConfig({ cooldownSec: Math.max(0, Math.min(60, Number(e.target.value))) })} className="w-full bg-[#070b14] border border-[#2e3a52] text-white px-3 py-2 rounded-lg font-mono text-sm focus:outline-none focus:border-indigo-500" />
                    </div>
                    <div className="bg-[#0d1f14] border border-green-900/50 p-2 rounded-lg">
                      <p className="text-[10px] text-green-300">Após loss, aguarda o tempo definido, reseta o loss virtual e volta a operar apenas quando o sinal for válido novamente.</p>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Coluna Central: Mercados com IA (6/12) */}
        <div className="lg:col-span-6 flex flex-col gap-4">
          <MarketGrid config={config} state={state} updateConfig={updateConfig} />

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
                const lose = buildLoserSet(config.mode, config.digit);
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




