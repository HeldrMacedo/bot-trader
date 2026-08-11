import { useState, useEffect, useRef, useCallback } from 'react';
import { BearBotEngine, createEngine } from '../services/BearBot2Engine';
import { DerivService } from '../services/DerivService';
import {
  BotConfig, BotState, BotMode, ExecMode, GaleMode, VLMode,
  PatMode, PostLossMode, AIMode,
} from '../services/bearbot2.types';

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

export function useBearBot() {
  const engineRef = useRef<BearBotEngine>(createEngine());
  const [state, setState] = useState<BotState>(engineRef.current.getState());
  const [config, setConfigState] = useState<BotConfig>(engineRef.current.getConfig());
  const [isConnected, setIsConnected] = useState(false);
  const [accountInfo, setAccountInfo] = useState<any>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const safetyTimeouts = useRef<NodeJS.Timeout[]>([]);

  useEffect(() => {
    const derivService = DerivService.getInstance();
    const engine = engineRef.current;

    // Subscribe à engine
    const unsubState = engine.subscribe((newState) => {
      setState(newState);
    });

    const unsubLog = engine.onLog((log) => {
      // Logs já estão no state
    });

    const unsubAutoTrade = engine.onAutoTrade((kind) => {
      // Usamos setTimeout para colocar a execução na próxima tick do event loop, 
      // evitando deadlocks caso seja síncrono no meio de um processamento de tick
      setTimeout(() => executeTrade(kind), 0);
    });

    const checkConnection = () => {
      setIsConnected(derivService.isMarketConnected);
    };
    checkConnection();

    // Listeners do DerivService
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

    // Fetch initial account info if already present
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
  }, []);

  // ── Tick Subscription ──
  // No DerivService.tsx não enviamos subscribe manual para ticks, já são despachados no marketWs
  // Apenas garantimos que o derivService os tenha assinado se precisarmos, mas no projeto normal eles vêm automaticamente ou enviamos { ticks: sym, subscribe: 1 }

  useEffect(() => {
    const derivService = DerivService.getInstance();
    if (!isConnected) return;

    // Na arquitetura original, subscribes eram feitos.
    if (config.multiOn) {
      const markets = ['R_100', 'R_75', 'R_50', 'R_25', 'R_10', 'RDBEAR', 'RDBULL'];
      markets.forEach(sym => {
        derivService.subscribe({ ticks: sym }).catch(() => { });
      });
    } else {
      derivService.subscribe({ ticks: config.activeSym }).catch(() => { });
    }
  }, [config.activeSym, config.multiOn, isConnected]);

  // ── Config Updates ──
  const updateConfig = useCallback((updates: Partial<BotConfig>) => {
    engineRef.current.updateConfig(updates);
    setConfigState(engineRef.current.getConfig());
  }, []);

  // ── Trade Execution ──
  const executeTrade = useCallback(async (kind: string) => {
    const engine = engineRef.current;
    const prep = engine.prepareTrade(kind);
    if (!prep) return;

    const derivService = DerivService.getInstance();

    if (prep.isPaper) {
      const result = engine.simulateTrade(kind);
      if (result) {
        setTimeout(() => {
          engine.settleContract(result.profit, result.isLoss, kind, result.exitDig, result.audit);
          if (!result.isLoss) playWinSound();
          else playLossSound();
        }, 800);
      }
      return;
    }

    // Trade real via WS
    try {
      console.log("TRADE ", prep.payload);
      const response = await derivService.send(prep.payload);
      if (response.buy) {
        // Subscribe ao contrato
        derivService.subscribe({
          proposal_open_contract: 1,
          contract_id: response.buy.contract_id
        }).catch(() => { });

        // Safety timeout
        const timeout = setTimeout(() => {
          // Engine libera tradeLock via settlement ou timeout
        }, 10000);
        safetyTimeouts.current.push(timeout);
      }
    } catch (e: any) {
      engine.settleContract(0, true, kind, null, null);
      console.error('Trade error:', e);
    }
  }, []);

  const handleContractSettlement = useCallback((contract: any) => {
    if (contract.is_valid_to_sell === 1 || contract.is_sold === 1 || contract.status === 'won' || contract.status === 'lost') {
      const profit = Number(contract.profit);
      const isLoss = profit < 0;
      let exitDig: number | null = null;
      let audit: any = null;

      if (contract.exit_spot !== undefined) {
        exitDig = Number(String(contract.exit_spot).slice(-1));
      }
      if (contract.audit_details) {
        const details = contract.audit_details.all_ticks.filter((t: any) => t.tick_display_value !== undefined);
        if (details.length >= 3) {
          audit = {
            tick_previous: details[0].tick_display_value.slice(-1),
            tick_start: details[1].tick_display_value.slice(-1),
            tick_end: details[2].tick_display_value.slice(-1),
          };
        }
      }

      engineRef.current.settleContract(profit, isLoss, engineRef.current.getConfig().mode, exitDig, audit);
      if (!isLoss) playWinSound();
      else playLossSound();
    }
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

  // ── Controles ──
  const startBot = useCallback(() => {
    getAudioCtx(); // Inicializa no clique do usuário para evitar bloqueio de autoplay
    const res = engineRef.current.startBot();
    setConfigState(engineRef.current.getConfig());
    return res;
  }, [getAudioCtx]);

  const stopBot = useCallback(() => {
    engineRef.current.stopBot();
    setConfigState(engineRef.current.getConfig());
  }, []);

  const abortOp = useCallback(() => {
    engineRef.current.abortOp();
    setConfigState(engineRef.current.getConfig());
  }, []);

  const resetStats = useCallback(() => {
    engineRef.current.resetStats();
  }, []);

  const manualFire = useCallback((kind: string) => {
    getAudioCtx(); // Inicializa no clique do usuário
    const prep = engineRef.current.manualFire(kind);
    if (prep) executeTrade(kind);
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
