import { useState, useEffect, useRef, useCallback } from 'react';
import { BearBotEngine, createEngine } from '../services/BearBot2Engine';
import { DerivService } from '../services/DerivService';
import {
  BotConfig, BotState, MARKETS, ProposalEntry,
} from '../services/bearbot2.types';

const SAFETY_TIMEOUT_MS = 30_000;

export function extractLastDigit(price: number, symbol: string): number | null {
  const pipSizes: Record<string, number> = {
    R_100: 2, R_75: 4, R_50: 4, R_25: 3, R_10: 3,
    RDBEAR: 4, RDBULL: 4,
  };
  const pip = pipSizes[symbol];
  if (pip === undefined) return null;
  const priceStr = price.toFixed(pip);
  return Number(priceStr.slice(-1));
}

function isTerminalContract(contract: any): boolean {
  if (contract.is_valid_to_sell === 1 || contract.is_sold === 1 || contract.is_sold === true) return true;
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
  const proposalsRef = useRef<Record<string, ProposalEntry>>({});
  const playWinSoundRef = useRef<() => void>(() => { });
  const playLossSoundRef = useRef<() => void>(() => { });
  const executeTradeRef = useRef<(kind: string) => Promise<void>>(async () => { });

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

  // ── Pre-opened Proposals (Quick Buy) ──
  const propKey = useCallback((ct: string, barrier: number) => {
    const cfg = engineRef.current.getConfig();
    const st = engineRef.current.getState();
    return `${cfg.activeSym}|${ct}|${barrier}|${+st.curStake.toFixed(2)}`;
  }, []);

  const forgetAllProposals = useCallback(() => {
    const derivService = DerivService.getInstance();
    derivService.send({ forget_all: 'proposal' }).catch((err) => {
      console.error('Forget all proposals error:', err);
    });
    proposalsRef.current = {};
  }, []);

  const ensureProposal = useCallback((ct: string, barrier: number) => {
    if (!accountInfo) return;
    const derivService = DerivService.getInstance();
    const cfg = engineRef.current.getConfig();
    const st = engineRef.current.getState();
    const key = propKey(ct, barrier);
    const p = proposalsRef.current[key];
    if (p && (p.id || p.pending)) return;

    proposalsRef.current[key] = { id: null, ready: false, pending: true, ct, barrier };
    const stakeVal = +st.curStake.toFixed(2);

    derivService.send({
      proposal: 1,
      subscribe: 1,
      amount: stakeVal,
      basis: 'stake',
      contract_type: ct,
      currency: 'USD',
      duration: 1,
      duration_unit: 't',
      underlying_symbol: cfg.activeSym,
      barrier: String(barrier),
      passthrough: { pkey: key },
    }).catch((err) => {
      if (err?.code === 'AlreadySubscribed') {
        return;
      }
      console.error('Ensure proposal error:', err);
      if (proposalsRef.current[key]) {
        proposalsRef.current[key].pending = false;
      }
    });
  }, [propKey, accountInfo]);

  const refreshProposals = useCallback(() => {
    const required = engineRef.current.getRequiredProposals();
    required.forEach(({ ct, barrier }) => {
      ensureProposal(ct, barrier);
    });
  }, [ensureProposal]);

  const getProp = useCallback((ct: string, barrier: number) => {
    const key = propKey(ct, barrier);
    const p = proposalsRef.current[key];
    return (p && p.id && p.ready) ? p : null;
  }, [propKey]);

  const invalidateConsumedProposals = useCallback(() => {
    for (const k in proposalsRef.current) {
      const p = proposalsRef.current[k];
      if (p) {
        p.id = null;
        p.ready = false;
        p.pending = false;
      }
    }
  }, []);

  const buildProposalMap = useCallback(() => {
    const map = new Map<string, string>();
    const required = engineRef.current.getRequiredProposals();
    for (const req of required) {
      const p = getProp(req.ct, req.barrier);
      if (p && p.id) {
        map.set(`${req.ct}|${req.barrier}`, p.id);
      }
    }
    return map;
  }, [getProp]);

  // ── Trade Execution ──
  const executeTrade = useCallback(async (kind: string) => {
    const engine = engineRef.current;
    const proposalMap = buildProposalMap();
    const prep = engine.prepareTrade(kind, proposalMap);
    if (!prep) return;

    pendingKindRef.current = prep.kind;

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
    const cfg = engine.getConfig();
    const st = engine.getState();
    const stakeVal = +st.curStake.toFixed(2);

    // ── Combo: two independent buys ──
    if (prep.kind === 'combo' && prep.legs?.length) {
      openContractsRef.current.clear();
      const opened: Array<{ contractId: number; legKind: string }> = [];

      // Send both legs at once so they start on the same tick (1-tick contracts)
      const responses = await Promise.all(prep.legs.map((leg) =>
        derivService.send(leg.payload).catch((e: unknown) => {
          console.error('Combo leg error:', e);
          return null;
        })
      ));
      responses.forEach((response, i) => {
        if (response?.buy?.contract_id == null) return;
        const contractId = Number(response.buy.contract_id);
        const legKind = prep.legs![i].legKind;
        opened.push({ contractId, legKind });
        openContractsRef.current.set(contractId, legKind);
        derivService.subscribe({
          proposal_open_contract: 1,
          contract_id: contractId,
        }).catch(() => { });
      });

      if (opened.length === 0) {
        engine.abortPendingTrade('Combo: nenhuma perna aberta · abort sem gale');
        pendingKindRef.current = null;
        openContractsRef.current.clear();
        return;
      }

      const comboOver = cfg.comboOver ?? 5;
      const comboUnder = cfg.comboUnder ?? 4;
      const isFast = prep.usedProposal;
      engine.addLog(`▶ COMBO Over>${comboOver} + Under<${comboUnder} · $${stakeVal}×2 · ${cfg.activeSym}${isFast ? ' ⚡' : ''}`, 'info');

      if (prep.legs.some((l) => l.usedProposal)) {
        invalidateConsumedProposals();
        refreshProposals();
      }

      if (opened.length === 1) {
        // Partial open: demote combo → single-leg settlement
        engine.demoteComboToSingle();
        pendingKindRef.current = opened[0].legKind;
        engine.getState(); // ensure notify path available
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

        const sym = prep.kind === 'differ' ? '≠' : prep.kind === 'over' ? '>' : '<';
        const isFast = prep.usedProposal;
        engine.addLog(`▶ ${prep.kind.toUpperCase()} ${sym}${cfg.digit} · $${stakeVal} · ${cfg.activeSym}${isFast ? ' ⚡' : ''}`, 'info');

        if (prep.usedProposal) {
          invalidateConsumedProposals();
          refreshProposals();
        }

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
  }, [armSafetyTimeout, clearSafetyTimeouts, buildProposalMap, invalidateConsumedProposals, refreshProposals]);

  executeTradeRef.current = executeTrade;

  const handleContractSettlement = useCallback((contract: any) => {
    if (!isTerminalContract(contract)) return;

    const contractId = contract.contract_id != null ? Number(contract.contract_id) : null;
    // Only settle contracts bought by this hook: the shared socket replays old
    // subscriptions on reconnect and carries POCs from other modules, which
    // would otherwise show up as phantom trades and drive the gale.
    if (contractId == null || !openContractsRef.current.has(contractId)) return;
    if (settledIdsRef.current.has(contractId)) return;
    settledIdsRef.current.add(contractId);
    // Limitar o tamanho do cache para evitar vazamento de memória
    if (settledIdsRef.current.size > 100) {
      const firstItem = settledIdsRef.current.values().next().value;
      if (firstItem !== undefined) {
        settledIdsRef.current.delete(firstItem);
      }
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

    // Per-contract leg kind (combo partial demotes to single-leg settlement)
    let kind = openContractsRef.current.get(contractId)!;

    // Full combo uses kind 'combo' for both legs
    if (pendingKindRef.current === 'combo' && engineRef.current.isComboPending()) {
      kind = 'combo';
    }

    openContractsRef.current.delete(contractId);

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

    const onProposalId = derivService.observerInstance.on('message', (data: any) => {
      if (data?.msg_type === 'proposal' && data.proposal) {
        const pkey = data.passthrough?.pkey;
        if (pkey && proposalsRef.current[pkey]) {
          proposalsRef.current[pkey].id = data.proposal.id;
          proposalsRef.current[pkey].ready = true;
          proposalsRef.current[pkey].pending = false;
        }
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
      derivService.observerInstance.removeById(onProposalId);
      derivService.observerInstance.removeById(onAccountId);
      safetyTimeouts.current.forEach(clearTimeout);
      forgetAllProposals();
    };
  }, [handleContractSettlement, forgetAllProposals]);

  // Synchronize proposals when parameters change
  useEffect(() => {
    if (!isConnected || !accountInfo) return;
    forgetAllProposals();
    const t = setTimeout(() => {
      refreshProposals();
    }, 50);
    return () => clearTimeout(t);
  }, [
    isConnected,
    accountInfo,
    config.activeSym,
    config.mode,
    config.digit,
    config.stake,
    config.comboOver,
    config.comboUnder,
    config.differDynamicDigit,
    state.curStake,
    forgetAllProposals,
    refreshProposals,
  ]);

  // PropKeeper: periodically ensures valid pre-opened proposals exist for active setup
  useEffect(() => {
    if (!isConnected || !accountInfo) return;
    const intervalId = setInterval(() => {
      if (!engineRef.current.getState().tradeLock) {
        refreshProposals();
      }
    }, 4000);
    return () => clearInterval(intervalId);
  }, [isConnected, accountInfo, refreshProposals]);

  useEffect(() => {
    const derivService = DerivService.getInstance();
    if (!isConnected) return;

    // Always subscribe to every market: IntelPanel sync + MarketGrid scores
    // need ticks from all symbols, not only the active one / multi mode.
    MARKETS.forEach(m => {
      derivService.subscribe({ ticks: m.sym }).catch(() => {
        // A silent failure here degrades the cross-market pillars without a trace:
        // that market's pattern freezes and its score goes stale.
        engineRef.current.addLog(`⚠ Sem stream de ticks para ${m.sym} · inteligência desse mercado fica desatualizada`, 'warn');
      });
    });
  }, [isConnected]);

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

  const getDynamicDifferDigit = useCallback((sym?: string) => {
    return engineRef.current.computeDynamicDifferDigit(sym || engineRef.current.getConfig().activeSym);
  }, []);

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
    switchAccount,
    getDynamicDifferDigit
  };
}
