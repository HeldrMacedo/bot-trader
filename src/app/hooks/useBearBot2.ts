import { useState, useEffect, useRef, useCallback } from 'react';
import { BearBotEngine, createEngine } from '../services/BearBot2Engine';
import { DerivService } from '../services/DerivService';
import {
  BotConfig, BotState,
} from '../services/bearbot2.types';

const SAFETY_TIMEOUT_MS = 30_000;

export function extractLastDigit(price: number, symbol: string): number | null {
  const pipSizes: Record<string, number> = {
    R_100: 2, R_75: 4, R_50: 4, R_25: 3, R_10: 3,
    RDBEAR: 3, RDBULL: 4,
  };
  const pip = pipSizes[symbol];
  if (pip === undefined) return null;
  const priceStr = price.toFixed(pip);
  return Number(priceStr.slice(-1));
}

function isTerminalContract(contract: any): boolean {
  if (contract.is_sold === 1 || contract.is_sold === true) return true;
  const status = String(contract.status || '').toLowerCase();
  return status === 'won' || status === 'lost';
}

export function useBearBot() {
  const engineRef = useRef<BearBotEngine>(createEngine());
  const [state, setState] = useState<BotState>(engineRef.current.getState());
  const [config, setConfigState] = useState<BotConfig>(engineRef.current.getConfig());
  const [isConnected, setIsConnected] = useState(false);
  const [accountInfo, setAccountInfo] = useState<any>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const safetyTimeouts = useRef<ReturnType<typeof setTimeout>[]>([]);
  /** Kind used for settlement (single mode or 'combo'). */
  const pendingKindRef = useRef<string | null>(null);
  /** contract_id → leg kind for partial combo demotion tracking */
  const openContractsRef = useRef<Map<number, string>>(new Map());
  const settledIdsRef = useRef<Set<number>>(new Set());
  const playWinSoundRef = useRef<() => void>(() => {});
  const playLossSoundRef = useRef<() => void>(() => {});
  const executeTradeRef = useRef<(kind: string) => Promise<void>>(async () => {});

  const clearSafetyTimeouts = useCallback(() => {
    safetyTimeouts.current.forEach(clearTimeout);
    safetyTimeouts.current = [];
  }, []);

  const armSafetyTimeout = useCallback((label: string) => {
    clearSafetyTimeouts();
    const timeout = setTimeout(() => {
      const engine = engineRef.current;
      if (engine.getState().tradeLock) {
        openContractsRef.current.clear();
        pendingKindRef.current = null;
        engine.abortPendingTrade(`⏱ Timeout ${label} · lock liberado sem alterar PnL/gale`);
      }
    }, SAFETY_TIMEOUT_MS);
    safetyTimeouts.current.push(timeout);
  }, [clearSafetyTimeouts]);

  // ── Trade Execution ──
  const executeTrade = useCallback(async (kind: string) => {
    const engine = engineRef.current;
    const prep = engine.prepareTrade(kind);
    if (!prep) return;

    pendingKindRef.current = prep.kind;
    settledIdsRef.current.clear();

    if (prep.isPaper) {
      const result = engine.simulateTrade(kind);
      if (!result) {
        engine.abortPendingTrade('Paper: ticks insuficientes para simular');
        pendingKindRef.current = null;
        return;
      }
      armSafetyTimeout('paper');
      setTimeout(() => {
        clearSafetyTimeouts();
        engine.settleContract(result.profit, result.isLoss, kind, result.exitDig, result.audit);
        pendingKindRef.current = null;
        if (!result.isLoss) playWinSoundRef.current();
        else playLossSoundRef.current();
      }, 800);
      return;
    }

    const derivService = DerivService.getInstance();

    // ── Combo: two independent buys ──
    if (prep.kind === 'combo' && prep.legs?.length) {
      openContractsRef.current.clear();
      const opened: Array<{ contractId: number; legKind: string }> = [];

      for (const leg of prep.legs) {
        try {
          const response = await derivService.send(leg.payload);
          if (response?.buy?.contract_id != null) {
            const contractId = Number(response.buy.contract_id);
            opened.push({ contractId, legKind: leg.legKind });
            openContractsRef.current.set(contractId, leg.legKind);
            derivService.subscribe({
              proposal_open_contract: 1,
              contract_id: contractId,
            }).catch(() => { });
          } else {
            break;
          }
        } catch (e) {
          console.error('Combo leg error:', e);
          break;
        }
      }

      if (opened.length === 0) {
        engine.abortPendingTrade('Combo: nenhuma perna aberta · abort sem gale');
        pendingKindRef.current = null;
        openContractsRef.current.clear();
        return;
      }

      if (opened.length === 1) {
        // Partial open: demote combo → single-leg settlement
        engine.demoteComboToSingle();
        pendingKindRef.current = opened[0].legKind;
        engine.getState(); // ensure notify path available
        // log via abort-style message without unlocking
        // use addLog through abort would unlock — demote already cleared comboPending
        // stay locked until the open leg settles
      } else {
        pendingKindRef.current = 'combo';
      }

      armSafetyTimeout('combo');
      return;
    }

    // ── Single-leg real buy ──
    try {
      if (!prep.payload) {
        engine.abortPendingTrade('Payload de compra ausente');
        pendingKindRef.current = null;
        return;
      }
      const response = await derivService.send(prep.payload);
      if (response?.buy?.contract_id != null) {
        const contractId = Number(response.buy.contract_id);
        openContractsRef.current.set(contractId, prep.kind);
        derivService.subscribe({
          proposal_open_contract: 1,
          contract_id: contractId,
        }).catch(() => { });
        armSafetyTimeout('buy');
      } else {
        engine.abortPendingTrade('Buy sem contract_id · lock liberado');
        pendingKindRef.current = null;
        openContractsRef.current.clear();
      }
    } catch (e: any) {
      engine.abortPendingTrade(`Erro na compra · ${e?.message || 'API'} · sem gale`);
      pendingKindRef.current = null;
      openContractsRef.current.clear();
      console.error('Trade error:', e);
    }
  }, [armSafetyTimeout, clearSafetyTimeouts]);

  executeTradeRef.current = executeTrade;

  const handleContractSettlement = useCallback((contract: any) => {
    if (!isTerminalContract(contract)) return;

    const contractId = contract.contract_id != null ? Number(contract.contract_id) : null;
    if (contractId != null) {
      if (settledIdsRef.current.has(contractId)) return;
      settledIdsRef.current.add(contractId);
    }

    const profit = Number(contract.profit);
    const isLoss = profit < 0;
    let exitDig: number | null = null;
    let audit: any = null;

    if (contract.exit_spot !== undefined) {
      exitDig = Number(String(contract.exit_spot).slice(-1));
    }
    if (contract.audit_details?.all_ticks) {
      const details = contract.audit_details.all_ticks.filter(
        (t: any) => t.tick_display_value !== undefined
      );
      if (details.length >= 3) {
        audit = {
          tick_previous: details[0].tick_display_value.slice(-1),
          tick_start: details[1].tick_display_value.slice(-1),
          tick_end: details[2].tick_display_value.slice(-1),
        };
      }
    }

    // Prefer per-contract leg kind (combo partial), else pending kind, else config.mode
    let kind =
      (contractId != null ? openContractsRef.current.get(contractId) : undefined)
      || pendingKindRef.current
      || engineRef.current.getConfig().mode;

    // Full combo uses kind 'combo' for both legs
    if (pendingKindRef.current === 'combo' && engineRef.current.isComboPending()) {
      kind = 'combo';
    }

    if (contractId != null) openContractsRef.current.delete(contractId);

    engineRef.current.settleContract(profit, isLoss, kind, exitDig, audit);

    // Clear pending when lock released (single or combo finished)
    if (!engineRef.current.getState().tradeLock) {
      clearSafetyTimeouts();
      pendingKindRef.current = null;
      openContractsRef.current.clear();
      if (!isLoss) playWinSoundRef.current();
      else playLossSoundRef.current();
    }
  }, [clearSafetyTimeouts]);

  useEffect(() => {
    const derivService = DerivService.getInstance();
    const engine = engineRef.current;

    // Subscribe to engine: keep React config in sync when multi/pattern mutates activeSym/digit
    const unsubState = engine.subscribe((newState) => {
      setState(newState);
      setConfigState(engine.getConfig());
    });

    const unsubLog = engine.onLog(() => {
      // Logs already mirrored into state
    });

    const unsubAutoTrade = engine.onAutoTrade((kind) => {
      setTimeout(() => executeTradeRef.current(kind), 0);
    });

    const checkConnection = () => {
      setIsConnected(derivService.isMarketConnected);
    };
    checkConnection();

    const onOpenId = derivService.observerInstance.on('open', checkConnection);
    const onCloseId = derivService.observerInstance.on('close', checkConnection);
    const onMarketOpenId = derivService.observerInstance.on('market.open', checkConnection);

    const onTickId = derivService.observerInstance.on('deriv.tick', (data: any) => {
      if (data.tick) {
        const { symbol, quote: price } = data.tick;
        const lastDigit = extractLastDigit(price, symbol);
        if (lastDigit !== null) {
          engine.processTick(symbol, price, lastDigit);
        }
      }
    });

    const onPocId = derivService.observerInstance.on('deriv.proposal_open_contract', (data: any) => {
      if (data.proposal_open_contract) {
        handleContractSettlement(data.proposal_open_contract);
      }
    });

    const onAccountId = derivService.observerInstance.on('account.update', (data: any) => {
      setAccountInfo(data);
    });

    const storageAccounts = derivService.getStorageDerivAccount();
    if (storageAccounts && storageAccounts.length > 0) {
      setAccountInfo(storageAccounts[0]);
    }

    return () => {
      unsubState();
      unsubLog();
      unsubAutoTrade();
      derivService.observerInstance.removeById(onOpenId);
      derivService.observerInstance.removeById(onCloseId);
      derivService.observerInstance.removeById(onMarketOpenId);
      derivService.observerInstance.removeById(onTickId);
      derivService.observerInstance.removeById(onPocId);
      derivService.observerInstance.removeById(onAccountId);
      safetyTimeouts.current.forEach(clearTimeout);
    };
  }, [handleContractSettlement]);

  useEffect(() => {
    const derivService = DerivService.getInstance();
    if (!isConnected) return;

    if (config.multiOn) {
      const markets = ['R_100', 'R_75', 'R_50', 'R_25', 'R_10', 'RDBEAR', 'RDBULL'];
      markets.forEach(sym => {
        derivService.subscribe({ ticks: sym }).catch(() => { });
      });
    } else {
      derivService.subscribe({ ticks: config.activeSym }).catch(() => { });
    }
  }, [config.activeSym, config.multiOn, isConnected]);

  const updateConfig = useCallback((updates: Partial<BotConfig>) => {
    engineRef.current.updateConfig(updates);
    setConfigState(engineRef.current.getConfig());
  }, []);

  // ── Áudio ──
  const getAudioCtx = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioCtxRef.current;
  }, []);

  const playTone = useCallback((freq: number, start: number, dur: number, type: OscillatorType, gainVal: number) => {
    if (!config.soundOn) return;
    try {
      const ctx = getAudioCtx();
      if (ctx.state === 'suspended') ctx.resume();
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      osc.type = type; osc.frequency.value = freq;
      osc.connect(gainNode); gainNode.connect(ctx.destination);
      const t = ctx.currentTime + start;
      gainNode.gain.setValueAtTime(0, t);
      gainNode.gain.linearRampToValueAtTime(gainVal, t + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.start(t); osc.stop(t + dur + 0.02);
    } catch (e) { console.error(e); }
  }, [config.soundOn, getAudioCtx]);

  const playWinSound = useCallback(() => {
    playTone(1318, 0, 0.12, 'square', 0.15);
    playTone(1568, 0.08, 0.12, 'square', 0.15);
    playTone(2093, 0.16, 0.18, 'square', 0.16);
  }, [playTone]);

  const playLossSound = useCallback(() => {
    playTone(440, 0, 0.18, 'sawtooth', 0.14);
    playTone(330, 0.16, 0.2, 'sawtooth', 0.13);
    playTone(220, 0.34, 0.3, 'sawtooth', 0.12);
  }, [playTone]);

  playWinSoundRef.current = playWinSound;
  playLossSoundRef.current = playLossSound;

  // ── Controles ──
  const startBot = useCallback(() => {
    getAudioCtx();
    const res = engineRef.current.startBot();
    setConfigState(engineRef.current.getConfig());
    return res;
  }, [getAudioCtx]);

  const stopBot = useCallback(() => {
    engineRef.current.stopBot();
    setConfigState(engineRef.current.getConfig());
  }, []);

  const abortOp = useCallback(() => {
    clearSafetyTimeouts();
    openContractsRef.current.clear();
    pendingKindRef.current = null;
    settledIdsRef.current.clear();
    engineRef.current.abortOp();
    setConfigState(engineRef.current.getConfig());
  }, [clearSafetyTimeouts]);

  const resetStats = useCallback(() => {
    engineRef.current.resetStats();
  }, []);

  const manualFire = useCallback((kind: string) => {
    getAudioCtx();
    // Gate only — single prepareTrade happens inside executeTrade
    if (!engineRef.current.tryManualFire()) return;
    executeTrade(kind);
  }, [executeTrade, getAudioCtx]);

  const exportCSV = useCallback(() => {
    const csv = engineRef.current.exportTradesCSV();
    if (!csv) return;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bearbot_trades_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, []);

  const switchAccount = useCallback(async (isVirtual: boolean) => {
    const derivService = DerivService.getInstance();
    if (accountInfo) {
      const targetToken = accountInfo.tokens.find((t: any) => t.is_virtual === isVirtual)?.token;
      if (targetToken) {
        await derivService.switchAccount(targetToken);
      }
    }
  }, [accountInfo]);

  return {
    state,
    config,
    updateConfig,
    executeTrade,
    startBot,
    stopBot,
    abortOp,
    resetStats,
    manualFire,
    exportCSV,
    isConnected,
    accountInfo,
    switchAccount
  };
}
