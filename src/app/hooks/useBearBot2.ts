import { useState, useEffect, useRef, useCallback } from 'react';
import { BearBotEngine, createEngine } from '../services/BearBot2Engine';
import { DerivService } from '../services/DerivService';
import {
  BotConfig, BotState, MARKETS, ProposalEntry, SettledOrder,
} from '../services/bearbot2.types';

/** Contrato de 1 tick liquida em segundos: sem resultado neste prazo, o robô para. */
const SETTLEMENT_TIMEOUT_MS = 30_000;
const PAPER_SETTLE_MS = 800;

/** Ordem comprada por este robô e ainda não liquidada. */
interface OpenOrder extends SettledOrder {
  /** 'combo' (duas pernas agregadas) ou a perna avulsa: over | under | differ. */
  kind: string;
}

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

// is_valid_to_sell não indica fim: o contrato em andamento também pode ser
// vendido, e o lucro dele naquele instante não é o resultado.
function isTerminalContract(contract: any): boolean {
  if (contract.is_sold === 1 || contract.is_sold === true) return true;
  const status = String(contract.status || '').toLowerCase();
  return status === 'won' || status === 'lost' || status === 'sold';
}

export function useBearBot() {
  const engineRef = useRef<BearBotEngine>(createEngine());
  const [state, setState] = useState<BotState>(engineRef.current.getState());
  const [config, setConfigState] = useState<BotConfig>(engineRef.current.getConfig());
  const [isConnected, setIsConnected] = useState(false);
  const [accountInfo, setAccountInfo] = useState<any>(null);
  const [tradeReady, setTradeReady] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  /** Falso depois do unmount: respostas e timers atrasados não agem mais. */
  const aliveRef = useRef(true);
  /** Contratos deste robô a liquidar; só eles mexem no placar e na trava. */
  const ordersRef = useRef<Map<number, OpenOrder>>(new Map());
  /** Prazo de liquidação por contrato; vencido, o contrato deixa de ser ordem viva. */
  const settleTimersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());
  const buysInFlightRef = useRef(0);
  /** Buy enviado sem resposta: pode ter sido executado. Só o Abortar libera. */
  const unconfirmedRef = useRef(false);
  const paperTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoTimersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  const proposalsRef = useRef<Record<string, ProposalEntry>>({});
  const playWinSoundRef = useRef<() => void>(() => { });
  const playLossSoundRef = useRef<() => void>(() => { });
  const executeTradeRef = useRef<(kind: string) => Promise<void>>(async () => { });

  const hasLiveOrder = useCallback(() =>
    buysInFlightRef.current > 0 || settleTimersRef.current.size > 0 || unconfirmedRef.current, []);

  const cancelPaperTrade = useCallback(() => {
    if (paperTimerRef.current) clearTimeout(paperTimerRef.current);
    paperTimerRef.current = null;
  }, []);

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
    if (!aliveRef.current || !accountInfo) return;
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
  const onSettlementTimeout = useCallback((contractId: number) => {
    settleTimersRef.current.delete(contractId);
    if (!ordersRef.current.has(contractId)) return;
    const engine = engineRef.current;
    // A trava continua até o Abortar: o contrato pode ter sido executado e ainda liquidar.
    engine.stopBot();
    engine.addLog(`⏱ Sem resultado do contrato ${contractId} em ${SETTLEMENT_TIMEOUT_MS / 1000}s · robô parado · confira o extrato`, 'lose');
    // Consulta avulsa: se a corretora já liquidou, a resposta entra pelo listener de POC.
    DerivService.getInstance()
      .send({ proposal_open_contract: 1, contract_id: contractId })
      .catch((e: any) => engine.addLog(`⚠ Consulta do contrato ${contractId} falhou: ${e?.message || e}`, 'lose'));
  }, []);

  // Acompanha via subscribe(): só assim o DerivService reassina o contrato
  // quando o canal de trade cai e volta com a ordem em aberto.
  const trackContract = useCallback((contractId: number, order: OpenOrder) => {
    ordersRef.current.set(contractId, order);
    DerivService.getInstance()
      .subscribe({ proposal_open_contract: 1, contract_id: contractId })
      .catch((e: any) => engineRef.current.addLog(`⚠ Falha ao acompanhar contrato ${contractId}: ${e?.message || e}`, 'lose'));
    settleTimersRef.current.set(
      contractId,
      setTimeout(() => onSettlementTimeout(contractId), SETTLEMENT_TIMEOUT_MS),
    );
  }, [onSettlementTimeout]);

  /** BuyUnconfirmed segura a trava e para o robô; devolve true nesse caso. */
  const holdIfUnconfirmed = useCallback((e: any): boolean => {
    if (e?.code !== 'BuyUnconfirmed') return false;
    unconfirmedRef.current = true;
    const engine = engineRef.current;
    engine.stopBot();
    engine.addLog(`⚠ ${e.message} · robô parado · confira o extrato e use Abortar para liberar`, 'lose');
    return true;
  }, []);

  const executeTrade = useCallback(async (kind: string) => {
    if (!aliveRef.current) return;
    const engine = engineRef.current;
    const proposalMap = buildProposalMap();
    const prep = engine.prepareTrade(kind, proposalMap);
    if (!prep) return;

    const derivService = DerivService.getInstance();
    const cfg = engine.getConfig();
    const stakeVal = +engine.getState().curStake.toFixed(2);
    const order: OpenOrder = {
      kind: prep.kind,
      stake: stakeVal,
      sym: cfg.activeSym,
      alvo: prep.kind === 'combo' ? engine.comboAlvo() : cfg.digit,
    };

    if (prep.isPaper) {
      const result = engine.simulateTrade(kind);
      if (!result) {
        engine.abortPendingTrade('Paper: ticks insuficientes para simular');
        return;
      }
      // Rastreado para ser cancelado ao trocar o Paper, abortar ou sair da tela:
      // senão o resultado simulado cairia no placar real.
      paperTimerRef.current = setTimeout(() => {
        paperTimerRef.current = null;
        engine.settleContract(result.profit, result.isLoss, kind, result.exitDig, result.audit, order);
        if (!result.isLoss) playWinSoundRef.current();
        else playLossSoundRef.current();
      }, PAPER_SETTLE_MS);
      return;
    }

    // ── Combo: two independent buys ──
    if (prep.kind === 'combo' && prep.legs?.length) {
      const legs = prep.legs;
      // Send both legs at once so they start on the same tick (1-tick contracts)
      buysInFlightRef.current++;
      const results = await Promise.allSettled(legs.map((leg) => derivService.send(leg.payload)));
      buysInFlightRef.current--;
      if (!aliveRef.current) return;

      const opened: Array<{ contractId: number; legKind: string; barrier: number }> = [];
      let unconfirmed = false;
      results.forEach((r, i) => {
        if (r.status === 'rejected') {
          console.error('Combo leg error:', r.reason);
          if (holdIfUnconfirmed(r.reason)) unconfirmed = true;
          return;
        }
        if (r.value?.buy?.contract_id == null) return;
        opened.push({ contractId: Number(r.value.buy.contract_id), legKind: legs[i].legKind, barrier: legs[i].barrier });
      });

      if (opened.length === 0) {
        if (!unconfirmed) engine.abortPendingTrade('Combo: nenhuma perna aberta · abort sem gale');
        return;
      }

      const comboOver = cfg.comboOver ?? 5;
      const comboUnder = cfg.comboUnder ?? 4;
      const isFast = prep.usedProposal;
      engine.addLog(opened.length === 2
        ? `▶ COMBO Over>${comboOver} + Under<${comboUnder} · $${stakeVal}×2 · ${cfg.activeSym}${isFast ? ' ⚡' : ''}`
        : `▶ COMBO parcial · só ${opened[0].legKind.toUpperCase()} aberta · $${stakeVal} · ${cfg.activeSym}`, 'info');

      if (legs.some((l) => l.usedProposal)) {
        invalidateConsumedProposals();
        refreshProposals();
      }

      if (opened.length === 1) {
        // Partial open: demote combo → single-leg settlement
        engine.demoteComboToSingle();
        const [leg] = opened;
        trackContract(leg.contractId, { ...order, kind: leg.legKind, alvo: leg.barrier });
      } else {
        opened.forEach((leg) => trackContract(leg.contractId, order));
      }
      return;
    }

    // ── Single-leg real buy ──
    if (!prep.payload) {
      engine.abortPendingTrade('Payload de compra ausente');
      return;
    }
    buysInFlightRef.current++;
    let response: any;
    try {
      response = await derivService.send(prep.payload);
    } catch (e: any) {
      buysInFlightRef.current--;
      console.error('Trade error:', e);
      if (!holdIfUnconfirmed(e)) {
        engine.abortPendingTrade(`Erro na compra · ${e?.message || 'API'} · sem gale`);
      }
      return;
    }
    buysInFlightRef.current--;
    if (!aliveRef.current) return;

    if (response?.buy?.contract_id == null) {
      engine.abortPendingTrade('Buy sem contract_id · lock liberado');
      return;
    }
    const contractId = Number(response.buy.contract_id);
    const sym = prep.kind === 'differ' ? '≠' : prep.kind === 'over' ? '>' : '<';
    engine.addLog(`▶ ${prep.kind.toUpperCase()} ${sym}${cfg.digit} · $${stakeVal} · ${cfg.activeSym}${prep.usedProposal ? ' ⚡' : ''}`, 'info');

    if (prep.usedProposal) {
      invalidateConsumedProposals();
      refreshProposals();
    }
    trackContract(contractId, order);
  }, [buildProposalMap, invalidateConsumedProposals, refreshProposals, trackContract, holdIfUnconfirmed]);

  executeTradeRef.current = executeTrade;

  const handleContractSettlement = useCallback((contract: any, subscriptionId?: string) => {
    if (!isTerminalContract(contract)) return;

    // Só contratos deste robô: outra tela ou consulta avulsa na mesma conta não
    // mexe no placar nem na trava. Liquidado sai do mapa, então resultado
    // repetido também é ignorado.
    const contractId = Number(contract.contract_id);
    const order = ordersRef.current.get(contractId);
    if (!order) return;
    ordersRef.current.delete(contractId);
    clearTimeout(settleTimersRef.current.get(contractId));
    settleTimersRef.current.delete(contractId);
    if (subscriptionId) {
      DerivService.getInstance().send({ forget: subscriptionId }).catch(() => { });
    }

    const profit = Number(contract.profit);
    const isLoss = profit < 0;
    let exitDig: number | null = null;
    let audit: any = null;

    // exit_spot é número e perde o zero final (1234.50 vira 1234.5).
    const exitText = contract.exit_tick_display_value ?? contract.exit_spot;
    if (exitText !== undefined) {
      exitDig = Number(String(exitText).slice(-1));
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

    const engine = engineRef.current;
    engine.settleContract(profit, isLoss, order.kind, exitDig, audit, order);

    // Combo só termina na última perna.
    if (order.kind !== 'combo' || !engine.isComboPending()) {
      if (!isLoss) playWinSoundRef.current();
      else playLossSoundRef.current();
    }
  }, []);

  // Ciclo de vida da tela: depois do unmount, nada agendado compra ou assina.
  useEffect(() => {
    aliveRef.current = true;
    engineRef.current.setLiveOrderGuard(hasLiveOrder);
    const autoTimers = autoTimersRef.current;
    const settleTimers = settleTimersRef.current;
    return () => {
      aliveRef.current = false;
      autoTimers.forEach(clearTimeout);
      autoTimers.clear();
      settleTimers.forEach(clearTimeout);
      settleTimers.clear();
      cancelPaperTrade();
    };
  }, [hasLiveOrder, cancelPaperTrade]);

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
      const t = setTimeout(() => {
        autoTimersRef.current.delete(t);
        // Desligar o robô nesse intervalo vale: a entrada só sai com ele ligado.
        if (!engine.getConfig().autoOn) return;
        executeTradeRef.current(kind);
      }, 0);
      autoTimersRef.current.add(t);
    });

    const checkConnection = () => {
      setIsConnected(derivService.isMarketConnected);
    };
    checkConnection();

    // Ids de proposta valem só na conexão que os criou: após queda e reabertura
    // do canal de trade, comprar com eles é rejeitado e o sinal se perde.
    const onOpenId = derivService.observerInstance.on('open', checkConnection);
    const onCloseId = derivService.observerInstance.on('close', () => {
      proposalsRef.current = {};
      checkConnection();
    });
    setTradeReady(!!derivService.isTradeReady);
    const onTradeStatusId = derivService.observerInstance.on('trade.status', (ready: boolean) => {
      proposalsRef.current = {};
      setTradeReady(ready);
    });
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
        handleContractSettlement(data.proposal_open_contract, data.subscription?.id);
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
      derivService.observerInstance.removeById(onTradeStatusId);
      derivService.observerInstance.removeById(onMarketOpenId);
      derivService.observerInstance.removeById(onTickId);
      derivService.observerInstance.removeById(onPocId);
      derivService.observerInstance.removeById(onProposalId);
      derivService.observerInstance.removeById(onAccountId);
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
    tradeReady,
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
    if (updates.paperMode !== undefined && updates.paperMode !== engineRef.current.getConfig().paperMode) {
      cancelPaperTrade();
    }
    engineRef.current.updateConfig(updates);
    setConfigState(engineRef.current.getConfig());
  }, [cancelPaperTrade]);

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

  // Ação explícita do usuário: libera a compra não confirmada. Contrato aberto
  // continua acompanhado e segura a trava até liquidar ou vencer o prazo.
  const abortOp = useCallback(() => {
    cancelPaperTrade();
    unconfirmedRef.current = false;
    engineRef.current.abortOp();
    if (hasLiveOrder()) engineRef.current.addLog('Contrato em andamento · a trava sai na liquidação', 'info');
    setConfigState(engineRef.current.getConfig());
  }, [cancelPaperTrade, hasLiveOrder]);

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
    tradeReady,
    hasLiveOrder,
    accountInfo,
    switchAccount,
    getDynamicDifferDigit
  };
}
