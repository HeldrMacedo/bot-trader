"use client";

import { useEffect, useState, useRef } from "react";
import { DerivService, TokenData, AccountInfo } from "@/app/services/DerivService";
import { toast } from "react-toastify";
import {
  CpuChipIcon,
  ArrowDownTrayIcon,
  ArrowPathIcon,
  PlayIcon,
  StopIcon,
  SpeakerWaveIcon,
  SpeakerXMarkIcon,
  ChevronRightIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  InformationCircleIcon
} from "@heroicons/react/24/outline";

// Definição dos mercados sintéticos
interface Market {
  sym: string;
  nm: string;
  pip: number;
}

const MARKETS: Market[] = [
  { sym: 'R_100', nm: 'Volatilidade 100', pip: 2 },
  { sym: 'R_75', nm: 'Volatilidade 75', pip: 4 },
  { sym: 'R_50', nm: 'Volatilidade 50', pip: 4 },
  { sym: 'R_25', nm: 'Volatilidade 25', pip: 3 },
  { sym: 'R_10', nm: 'Volatilidade 10', pip: 3 },
  { sym: 'RDBEAR', nm: 'Bear Market', pip: 3 },
  { sym: 'RDBULL', nm: 'Bull Market', pip: 4 },
];

interface TradeLog {
  t: string;
  mercado: string;
  modo: string;
  alvo: number;
  audit: { tick_previous: string, tick_start: string, tick_end: string };
  saiu: string | number;
  stake: string;
  resultado: 'WIN' | 'LOSS';
  lucro: string;
  acumulado: string;
}

interface PatternState {
  a: number | null;
  b: number | null;
  count: number;
  reps: number;
  armed: boolean;
  waiting: boolean;
  seqCount: number;
  stable?: number;
  force?: number;
  wilson?: number;
  lift?: number;
  tri?: number;
  _final?: number;
}

interface VLMarketState {
  count: number;
  seen: number;
}

export default function BearBotUltra() {
  const derivService = DerivService.getInstance();

  // Estados principais
  const [accountInfo, setAccountInfo] = useState<AccountInfo | null>(null);
  const [activeSym, setActiveSym] = useState<string>('R_100');
  const [mode, setMode] = useState<'over' | 'under' | 'differ' | 'combo'>('over');
  const [exec, setExec] = useState<'manual' | 'auto'>('manual');
  const [digit, setDigit] = useState<number>(2);
  const [autoOn, setAutoOn] = useState<boolean>(false);

  // Perdas Virtuais
  const [vlOn, setVlOn] = useState<boolean>(false);
  const [vlMode, setVlMode] = useState<'consec' | 'accum'>('consec');
  const [vlQty, setVlQty] = useState<number>(2);
  const [vlWindow, setVlWindow] = useState<number>(14);
  const [vlCount, setVlCount] = useState<number>(0);
  const [vlSeen, setVlSeen] = useState<number>(0);

  // Gestão de Stake / Martingale
  const [stake, setStake] = useState<number>(0.35);
  const [gale, setGale] = useState<number>(2.1);
  const [stopLoss, setStopLoss] = useState<number>(20);
  const [stopWin, setStopWin] = useState<number>(20);
  const [galeMode, setGaleMode] = useState<'mult' | 'parc'>('mult');
  const [galeParcels, setGaleParcels] = useState<number>(2);
  const [soundOn, setSoundOn] = useState<boolean>(true);
  const [multiOn, setMultiOn] = useState<boolean>(false);

  // Configurações de Padrão (Differ)
  const [patReps, setPatReps] = useState<number>(3);
  const [patMinForce, setPatMinForce] = useState<number>(30);
  const [patTrigger, setPatTrigger] = useState<boolean>(false);
  const [patMode, setPatMode] = useState<'accum' | 'seq'>('accum');

  // Sinais Frequência
  const [freqSigOn, setFreqSigOn] = useState<boolean>(false);
  const [freqLimit, setFreqLimit] = useState<number>(10);

  // Placar / Lucro
  const [wins, setWins] = useState<number>(0);
  const [loss, setLoss] = useState<number>(0);
  const [pnl, setPnl] = useState<number>(0);

  // Histórico de trades e logs
  const [trades, setTrades] = useState<TradeLog[]>([]);
  const [logLines, setLogLines] = useState<{ ts: string; msg: string; type: string }[]>([]);

  // Refs de controle para evitar closures desatualizadas na escuta dos ticks
  const stateRef = useRef({
    activeSym,
    mode,
    exec,
    digit,
    autoOn,
    vlOn,
    vlMode,
    vlQty,
    vlWindow,
    vlCount,
    vlSeen,
    stake,
    gale,
    stopLoss,
    stopWin,
    galeMode,
    galeParcels,
    multiOn,
    patReps,
    patMinForce,
    patTrigger,
    patMode,
    wins,
    loss,
    pnl,
    accountInfo: null as AccountInfo | null,
    galeLevel: 0,
    curStake: 0.35,
    lossAcum: 0,
    parcelsLeft: 0,
    lastPayout: 0.9,
    tradeLock: false,
    reqSeq: 1,
    settled: {} as Record<string, boolean>,
    props: {} as Record<string, { id: string | null; ready: boolean; pending: boolean; ct: string; barrier: number }>,
    vlMState: {} as Record<string, VLMarketState>,
    patState: {} as Record<string, PatternState>,
    multiCand: {} as Record<string, { sym: string; b: number | null; score: number; force?: number }>,
    comboPending: null as { legs: number; won: number; results: number[] } | null,
    pendingKind: null as { kind: string } | null,
  });

  // Histórico local de ticks por símbolo
  const [tickData, setTickData] = useState<Record<string, { digits: number[]; price: number | null }>>({});
  const tickDataRef = useRef<Record<string, { digits: number[]; price: number | null }>>({});

  // Web Audio Context para efeitos sonoros
  const audioCtxRef = useRef<AudioContext | null>(null);

  // ---- PROPOSTAS PRÉ-ABERTAS (compra rápida por id) ----
  const propKey = (ct: string, barrier: number) => {
    return `${stateRef.current.activeSym}|${ct}|${barrier}|${+stateRef.current.curStake.toFixed(2)}`;
  };

  const forgetAllProposals = () => {
    derivService.send({ forget_all: 'proposal' }).catch(err => console.error('Forget all proposals error:', err));
    stateRef.current.props = {};
  };

  const ensureProposal = (ct: string, barrier: number) => {
    if (!stateRef.current.accountInfo) return;
    const key = propKey(ct, barrier);
    const p = stateRef.current.props[key];
    if (p && (p.id || p.pending)) return;

    stateRef.current.props[key] = { id: null, ready: false, pending: true, ct, barrier };
    const stakeVal = +stateRef.current.curStake.toFixed(2);

    derivService.send({
      proposal: 1,
      subscribe: 1,
      amount: stakeVal,
      basis: 'stake',
      contract_type: ct,
      currency: 'USD',
      duration: 1,
      duration_unit: 't',
      underlying_symbol: stateRef.current.activeSym,
      barrier: String(barrier),
      passthrough: { pkey: key }
    }).catch(err => {
      console.error('Ensure proposal error:', err);
      if (stateRef.current.props[key]) {
        stateRef.current.props[key].pending = false;
      }
    });
  };

  const refreshProposals = () => {
    if (!stateRef.current.accountInfo) return;
    const m = stateRef.current.mode;
    const d = stateRef.current.digit;
    if (m === 'over') ensureProposal('DIGITOVER', d);
    else if (m === 'under') ensureProposal('DIGITUNDER', d);
    else if (m === 'differ') ensureProposal('DIGITDIFF', d);
    else if (m === 'combo') {
      ensureProposal('DIGITOVER', 5);
      ensureProposal('DIGITUNDER', 4);
    }
  };

  const getProp = (ct: string, barrier: number) => {
    const p = stateRef.current.props[propKey(ct, barrier)];
    return (p && p.id) ? p : null;
  };

  const invalidateConsumedProposals = () => {
    for (const k in stateRef.current.props) {
      const p = stateRef.current.props[k];
      if (p) {
        p.id = null;
        p.ready = false;
        p.pending = false;
      }
    }
  };

  // Inicializar estado das volatilidades
  useEffect(() => {
    const initTicks: Record<string, { digits: number[]; price: number | null }> = {};
    const initPatState: Record<string, PatternState> = {};

    MARKETS.forEach(m => {
      initTicks[m.sym] = { digits: [], price: null };
      initPatState[m.sym] = { a: null, b: null, count: 0, reps: 0, armed: false, waiting: false, seqCount: 0 };
    });

    setTickData(initTicks);
    tickDataRef.current = initTicks;
    stateRef.current.patState = initPatState;

    // Tentar recuperar contas e configurar o listener
    const accounts = derivService.getStorageDerivAccount();
    if (accounts && accounts.length > 0) {
      setAccountInfo(accounts[0]);
    }

    const subUpdate = derivService.observerInstance.on("account.update", (data) => {
      setAccountInfo(data);
    });

    // Captura as propostas pré-abertas do WebSocket
    const subProposal = derivService.observerInstance.on("message", (data) => {
      if (data.msg_type === "proposal" && data.proposal) {
        const pkey = data.passthrough && data.passthrough.pkey;
        if (pkey && stateRef.current.props[pkey]) {
          stateRef.current.props[pkey].id = data.proposal.id;
          stateRef.current.props[pkey].ready = true;
          stateRef.current.props[pkey].pending = false;
        }
      }
    });

    // Logger inicial
    addLogLine("Plataforma iniciada · Configure os parâmetros e ligue o robô.", "info");

    return () => {
      derivService.observerInstance.removeById(subUpdate);
      derivService.observerInstance.removeById(subProposal);
      forgetAllProposals();
    };
  }, []);

  // Sincronizar estados com a Ref para uso na callback de ticks
  useEffect(() => {
    stateRef.current.activeSym = activeSym;
    stateRef.current.mode = mode;
    stateRef.current.exec = exec;
    stateRef.current.digit = digit;
    stateRef.current.autoOn = autoOn;
    stateRef.current.vlOn = vlOn;
    stateRef.current.vlMode = vlMode;
    stateRef.current.vlQty = vlQty;
    stateRef.current.vlWindow = vlWindow;
    stateRef.current.stake = stake;
    stateRef.current.gale = gale;
    stateRef.current.stopLoss = stopLoss;
    stateRef.current.stopWin = stopWin;
    stateRef.current.galeMode = galeMode;
    stateRef.current.galeParcels = galeParcels;
    stateRef.current.multiOn = multiOn;
    stateRef.current.patReps = patReps;
    stateRef.current.patMinForce = patMinForce;
    stateRef.current.patTrigger = patTrigger;
    stateRef.current.patMode = patMode;
    stateRef.current.wins = wins;
    stateRef.current.loss = loss;
    stateRef.current.pnl = pnl;
    stateRef.current.accountInfo = accountInfo;
  }, [
    activeSym, mode, exec, digit, autoOn, vlOn, vlMode, vlQty, vlWindow,
    stake, gale, stopLoss, stopWin, galeMode, galeParcels, multiOn,
    patReps, patMinForce, patTrigger, patMode, wins, loss, pnl, accountInfo
  ]);

  // Monitorar alterações de configuração para invalidar e recriar as propostas
  useEffect(() => {
    if (!accountInfo) return;

    // Cancela as anteriores para evitar "already subscribed"
    forgetAllProposals();

    const t = setTimeout(() => {
      refreshProposals();
    }, 50);

    return () => clearTimeout(t);
  }, [accountInfo, activeSym, mode, digit, stake]);

  // PropKeeper: garante que sempre exista proposta pronta pro setup atual
  useEffect(() => {
    if (!accountInfo) return;
    const intervalId = setInterval(() => {
      if (!stateRef.current.tradeLock) {
        refreshProposals();
      }
    }, 4000);
    return () => clearInterval(intervalId);
  }, [accountInfo]);

  // Sons de Win/Loss usando Web Audio API
  const getAudioCtx = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioCtxRef.current;
  };

  const playTone = (freq: number, start: number, dur: number, type: OscillatorType, gainVal: number) => {
    if (!soundOn) return;
    try {
      const ctx = getAudioCtx();
      if (ctx.state === "suspended") {
        ctx.resume();
      }
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      const t = ctx.currentTime + start;
      gainNode.gain.setValueAtTime(0, t);
      gainNode.gain.linearRampToValueAtTime(gainVal, t + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.start(t);
      osc.stop(t + dur + 0.02);
    } catch (e) {
      console.error(e);
    }
  };

  const soundWin = () => {
    playTone(1318, 0, 0.12, 'square', 0.15);
    playTone(1568, 0.08, 0.12, 'square', 0.15);
    playTone(2093, 0.16, 0.18, 'square', 0.16);
  };

  const soundLoss = () => {
    playTone(440, 0, 0.18, 'sawtooth', 0.14);
    playTone(330, 0.16, 0.2, 'sawtooth', 0.13);
    playTone(220, 0.34, 0.3, 'sawtooth', 0.12);
  };

  // Funções Auxiliares de Logs
  const addLogLine = (msg: string, type: string = "") => {
    const ts = new Date().toLocaleTimeString("pt-BR", { hour12: false });
    setLogLines(prev => [{ ts, msg, type }, ...prev].slice(0, 120));
  };

  // Lógica de Padrões e Estatísticas de Ticks
  const loserSet = (botMode: string, botDigit: number) => {
    const set = new Set<number>();
    if (botMode === 'over') {
      for (let i = 0; i <= botDigit; i++) set.add(i);
    } else if (botMode === 'under') {
      for (let i = botDigit; i <= 9; i++) set.add(i);
    } else if (botMode === 'combo') {
      set.add(4);
      set.add(5);
    } else {
      set.add(botDigit);
    }
    return set;
  };

  const isWinCheck = (r: number, botMode: string, botDigit: number) => {
    if (botMode === 'over') return r > botDigit;
    if (botMode === 'under') return r < botDigit;
    if (botMode === 'differ') return r !== botDigit;
    if (botMode === 'combo') return r !== 4 && r !== 5;
    return false;
  };

  // Wilson Lower Bound
  const wilsonLB = (succ: number, total: number) => {
    if (total <= 0) return 0;
    const z = 1.96, p = succ / total, n = total;
    const denom = 1 + (z * z) / n;
    const center = p + (z * z) / (2 * n);
    const margin = z * Math.sqrt((p * (1 - p) + (z * z) / (4 * n)) / n);
    return Math.max(0, (center - margin) / denom);
  };

  // Melhor padrão de transição A -> B
  const getBestPattern = (digits: number[]) => {
    if (digits.length < 8) return null;
    const N = digits.length;
    const freq = new Array(10).fill(0);
    digits.forEach(d => freq[d]++);
    const baseP = (d: number) => freq[d] / N;

    const cand: Record<string, any> = {};
    const windows = [12, 25, 50];

    windows.forEach((n, wi) => {
      const sl = digits.slice(-n);
      if (sl.length < 6) return;
      const pair: Record<string, number> = {};
      const after: Record<string, number> = {};

      for (let i = 0; i < sl.length - 1; i++) {
        const a = sl[i], b = sl[i + 1];
        const k = `${a}-${b}`;
        pair[k] = (pair[k] || 0) + 1;
        after[a] = (after[a] || 0) + 1;
      }

      const w = wi === 0 ? 1.2 : wi === 1 ? 1.0 : 0.8;
      Object.keys(pair).forEach(k => {
        const [a, b] = k.split('-').map(Number);
        const occ = pair[k], tot = after[a];
        if (occ < 2 || tot < 3) return;
        const cond = occ / tot;
        const wl = wilsonLB(occ, tot);
        const lift = baseP(b) > 0 ? cond / baseP(b) : cond / 0.1;

        if (!cand[k]) cand[k] = { a, b, occMax: 0, wlSum: 0, condSum: 0, liftSum: 0, wsum: 0, wins: 0 };
        const c = cand[k];
        c.occMax = Math.max(c.occMax, occ);
        c.wlSum += wl * w;
        c.condSum += cond * w;
        c.liftSum += lift * w;
        c.wsum += w;
        c.wins++;
      });
    });

    const trigramBoost = (a: number, b: number) => {
      const sl = digits.slice(-50);
      let ab = 0, abc: Record<number, number> = {};
      for (let i = 0; i < sl.length - 2; i++) {
        if (sl[i] === a && sl[i + 1] === b) {
          ab++;
          const c = sl[i + 2];
          abc[c] = (abc[c] || 0) + 1;
        }
      }
      if (ab < 3) return 0;
      const top = Math.max(0, ...Object.values(abc));
      return top / ab;
    };

    const markovProb = (a: number, b: number) => {
      let ab = 0, aTot = 0;
      for (let i = 0; i < digits.length - 1; i++) {
        if (digits[i] === a) {
          aTot++;
          if (digits[i + 1] === b) ab++;
        }
      }
      return aTot >= 4 ? { p: ab / aTot, n: aTot } : { p: 0, n: aTot };
    };

    let best: any = null;
    Object.values(cand).forEach(c => {
      const wl = c.wlSum / c.wsum;
      const cond = c.condSum / c.wsum;
      const lift = c.liftSum / c.wsum;
      const tri = trigramBoost(c.a, c.b);
      const mk = markovProb(c.a, c.b);
      const mkBoost = 1 + 0.35 * Math.min(mk.p / 0.12, 1.5) * Math.min(mk.n / 12, 1);
      const multi = 1 + 0.20 * (c.wins - 1);
      const final = wl * (0.6 + 0.4 * Math.min(lift / 2, 1)) * (1 + 0.3 * tri) * mkBoost * multi * (1 + 0.05 * c.occMax);

      const cobj = {
        a: c.a,
        b: c.b,
        occ: c.occMax,
        force: cond,
        wilson: wl,
        lift: +lift.toFixed(2),
        tri: +tri.toFixed(2),
        markov: +mk.p.toFixed(2),
        final
      };

      if (!best || final > best.final) best = cobj;
    });

    return best;
  };

  // Atualizar padrão A->B para o símbolo
  const updatePattern = (sym: string) => {
    const arr = tickDataRef.current[sym]?.digits || [];
    const ps = stateRef.current.patState[sym];
    if (!ps) return;
    const best = getBestPattern(arr);

    if (!best) {
      ps.a = null;
      ps.b = null;
      ps.count = 0;
      ps.seqCount = 0;
      ps.armed = false;
      ps.waiting = false;
      ps.force = 0;
      return;
    }

    const hasCurrent = ps.a !== null;
    let useNew = true;
    if (hasCurrent && (ps.a !== best.a || ps.b !== best.b)) {
      const curScore = ps._final || 0;
      if (best.final < curScore * 1.30) useNew = false;
    }

    if (useNew) {
      const changed = ps.a !== best.a || ps.b !== best.b;
      if (changed) {
        ps.a = best.a;
        ps.b = best.b;
        ps.seqCount = 0;
        ps.waiting = false;
        ps.stable = 0;
      }
      ps._final = best.final;
      ps.force = best.force;
      ps.wilson = best.wilson;
      ps.lift = best.lift;
      ps.tri = best.tri;
    }

    if (ps.a === best.a && ps.b === best.b) {
      ps.stable = (ps.stable || 0) + 1;
    } else {
      ps.stable = 0;
    }

    const minForce = stateRef.current.patMinForce / 100;
    const forceOk = (ps.force || 0) >= minForce;
    const wilsonOk = (ps.wilson || 0) >= Math.max(0.15, minForce * 0.7);
    const liftOk = (ps.lift || 0) >= 1.15;
    const stableOk = (ps.stable || 0) >= 2;
    const qualityOk = forceOk && wilsonOk && liftOk && stableOk;

    if (stateRef.current.patMode === 'accum') {
      const sl = arr.slice(-50);
      let occ = 0;
      for (let i = 0; i < sl.length - 1; i++) {
        if (sl[i] === ps.a && sl[i + 1] === ps.b) occ++;
      }
      ps.count = occ;
      ps.armed = occ >= stateRef.current.patReps && qualityOk;
    } else {
      if (arr.length >= 2) {
        const a = arr[arr.length - 2], b = arr[arr.length - 1];
        if (a === ps.a && b === ps.b) {
          ps.seqCount++;
        } else if (a === ps.a && b !== ps.b) {
          ps.seqCount = 0;
        }
      }
      ps.count = ps.seqCount;
      ps.armed = ps.seqCount >= stateRef.current.patReps && qualityOk;
    }
  };

  // Lógica de perda virtual
  const vlM = (sym: string) => {
    if (!stateRef.current.vlMState[sym]) {
      stateRef.current.vlMState[sym] = { count: 0, seen: 0 };
    }
    return stateRef.current.vlMState[sym];
  };

  const vlOnDigitM = (sym: string, dig: number, forDigit?: number | null) => {
    if (!stateRef.current.vlOn) return;
    const st = vlM(sym);
    const lose = loserSet(stateRef.current.mode, stateRef.current.digit);
    const isLoser = forDigit !== null && forDigit !== undefined ? dig === forDigit : lose.has(dig);

    if (stateRef.current.vlMode === 'consec') {
      if (isLoser) st.count++;
      else st.count = 0;
    } else {
      st.seen++;
      if (isLoser) st.count++;
      if (st.count >= stateRef.current.vlQty) return;
      if (st.seen >= stateRef.current.vlWindow) {
        st.count = 0;
        st.seen = 0;
      }
    }
  };

  const vlOnDigit = (dig: number, forDigit?: number | null) => {
    if (!stateRef.current.vlOn) return;
    const lose = loserSet(stateRef.current.mode, stateRef.current.digit);
    const isLoser = forDigit !== null && forDigit !== undefined ? dig === forDigit : lose.has(dig);

    if (stateRef.current.vlMode === 'consec') {
      if (isLoser) {
        stateRef.current.vlCount++;
      } else {
        stateRef.current.vlCount = 0;
      }
    } else {
      stateRef.current.vlSeen++;
      if (isLoser) stateRef.current.vlCount++;
      if (stateRef.current.vlCount >= stateRef.current.vlQty) {
        setVlCount(stateRef.current.vlCount);
        return;
      }
      if (stateRef.current.vlSeen >= stateRef.current.vlWindow) {
        addLogLine(`Janela ${stateRef.current.vlWindow} ticks: reset`, "virt");
        stateRef.current.vlCount = 0;
        stateRef.current.vlSeen = 0;
      }
    }
    setVlCount(stateRef.current.vlCount);
    setVlSeen(stateRef.current.vlSeen);
  };

  const vlGateOpen = () => {
    if (!stateRef.current.vlOn) return true;
    return stateRef.current.vlCount >= stateRef.current.vlQty;
  };

  const vlGateOpenM = (sym: string) => {
    if (!stateRef.current.vlOn) return true;
    return vlM(sym).count >= stateRef.current.vlQty;
  };

  const vlReset = () => {
    stateRef.current.vlCount = 0;
    stateRef.current.vlSeen = 0;
    setVlCount(0);
    setVlSeen(0);
  };

  const vlResetM = (sym: string) => {
    const st = vlM(sym);
    st.count = 0;
    st.seen = 0;
  };

  const vlResetAllM = () => {
    stateRef.current.vlMState = {};
    stateRef.current.multiCand = {};
  };

  // Qui-quadrado
  const chiSquare = (sym: string) => {
    const arr = tickDataRef.current[sym]?.digits.slice(-50) || [];
    if (arr.length < 30) return null;
    const n = arr.length, exp = n / 10;
    const c = new Array(10).fill(0);
    arr.forEach(d => c[d]++);
    let chi = 0;
    for (let d = 0; d < 10; d++) {
      const diff = c[d] - exp;
      chi += (diff * diff) / exp;
    }
    let level = 'normal';
    if (chi >= 21.7) level = 'alto';
    else if (chi >= 16.9) level = 'medio';
    return { chi: +chi.toFixed(1), level };
  };

  // Anomalia
  const marketAnomaly = (sym: string) => {
    const arr = tickDataRef.current[sym]?.digits.slice(-25) || [];
    if (arr.length < 12) return null;
    const lose = loserSet(stateRef.current.mode, stateRef.current.digit);
    const expFrac = lose.size / 10;
    let k = 0;
    arr.forEach(d => { if (lose.has(d)) k++; });
    const obsFrac = k / arr.length;
    const excess = expFrac > 0 ? (obsFrac - expFrac) / expFrac : 0;

    const c: Record<number, number> = {};
    lose.forEach(d => c[d] = 0);
    arr.forEach(d => { if (lose.has(d)) c[d]++; });
    let topD: any = null, topC = -1;
    Object.keys(c).forEach((dStr) => {
      const d = Number(dStr);
      if (c[d] > topC) {
        topC = c[d];
        topD = d;
      }
    });

    if (excess >= 1.0) return { level: 'evite', excess, topD, topC };
    if (excess >= 0.5) return { level: 'atencao', excess, topD, topC };
    return null;
  };

  // Subscrições e Listener de Ticks
  useEffect(() => {
    const handleTickMsg = (data: any) => {
      if (data.tick) {
        const { symbol, quote: price } = data.tick;
        const tickDataCurrent = tickDataRef.current;
        if (!tickDataCurrent[symbol]) return;

        const lastDigit = derivService.extractLastDigit(price, symbol);
        if (lastDigit === null) return;

        const currentDigits = [...tickDataCurrent[symbol].digits];
        currentDigits.push(lastDigit);
        if (currentDigits.length > 120) {
          currentDigits.shift();
        }

        tickDataCurrent[symbol] = { digits: currentDigits, price };
        setTickData({ ...tickDataCurrent });

        // Executar lógica do robô
        onNewTick(symbol, lastDigit);
      }
    };

    const listenerId = derivService.observerInstance.on("deriv.tick", handleTickMsg);

    // Subscrever a todos os mercados sintéticos
    MARKETS.forEach(m => {
      derivService.subscribe({ ticks: m.sym });
    });

    return () => {
      derivService.observerInstance.removeById(listenerId);
    };
  }, []);

  // Lógica executada a cada novo Tick
  const onNewTick = (sym: string, dig: number) => {
    if (stateRef.current.mode === 'differ') {
      updatePattern(sym);
    }

    if (stateRef.current.multiOn && stateRef.current.exec === 'auto' && stateRef.current.autoOn) {
      if (stateRef.current.mode === 'differ' && stateRef.current.patTrigger) {
        const ps = stateRef.current.patState[sym];
        if (ps) {
          vlOnDigitM(sym, dig, ps.b !== null ? ps.b : stateRef.current.digit);
          if (ps.waiting) {
            ps.waiting = false;
            if (dig !== ps.b) {
              ps.count = 0;
              ps.armed = false;
            }
          }
          if (ps.armed && dig === ps.a && vlGateOpenM(sym)) {
            stateRef.current.multiCand[sym] = { sym, b: ps.b, score: vlM(sym).count + (ps.seqCount || 0) };
          }
        }
      } else {
        vlOnDigitM(sym, dig);
        if (vlGateOpenM(sym)) {
          const an = marketAnomaly(sym);
          const exc = an ? an.excess : 0;
          stateRef.current.multiCand[sym] = { sym, b: stateRef.current.digit, score: vlM(sym).count + exc };
        }
      }

      if (sym === stateRef.current.activeSym) {
        const st = vlM(sym);
        stateRef.current.vlCount = st.count;
        stateRef.current.vlSeen = st.seen;
        setVlCount(st.count);
        setVlSeen(st.seen);
      }

      tryFireMultiCandidate();
      return;
    }

    if (sym !== stateRef.current.activeSym) return;

    if (stateRef.current.mode === 'differ') {
      const ps = stateRef.current.patState[sym];
      if (stateRef.current.patTrigger && ps) {
        vlOnDigit(dig, ps.b !== null ? ps.b : stateRef.current.digit);
        if (ps.waiting) {
          ps.waiting = false;
          if (dig !== ps.b) {
            ps.count = 0;
            ps.armed = false;
            addLogLine(`Padrão ${ps.a}→${ps.b} quebrou (saiu ${dig}) · reset`, "virt");
          }
        }
        if (stateRef.current.exec === 'auto' && stateRef.current.autoOn && !stateRef.current.tradeLock && ps.armed) {
          if (dig === ps.a) {
            if (vlGateOpen()) {
              setDigit(ps.b!);
              stateRef.current.digit = ps.b!;
              ps.waiting = true;
              vlReset();
              fireTrade('differ');
              addLogLine(`Gatilho ${ps.a}→ + loss virtual OK · entra DIFFER ≠${ps.b}`, "info");
            } else {
              addLogLine(`🧬 ${ps.a}→ armou mas falta loss virtual (${stateRef.current.vlCount}/${stateRef.current.vlQty})`, "virt");
            }
          }
        }
        return;
      }

      vlOnDigit(dig);
      if (stateRef.current.exec !== 'auto' || !stateRef.current.autoOn || stateRef.current.tradeLock) return;
      if (vlGateOpen()) {
        vlReset();
        fireTrade('differ');
      }
      return;
    }

    // Over, Under, Combo
    vlOnDigit(dig);
    if (stateRef.current.exec !== 'auto' || !stateRef.current.autoOn || stateRef.current.tradeLock) return;
    if (vlGateOpen()) {
      vlReset();
      fireTrade(stateRef.current.mode);
    }
  };

  const tryFireMultiCandidate = () => {
    if (stateRef.current.tradeLock) return;
    const cands = Object.values(stateRef.current.multiCand);
    if (!cands.length) return;
    cands.sort((a, b) => b.score - a.score);
    const pick = cands[0];
    stateRef.current.multiCand = {};
    setActiveSym(pick.sym);
    stateRef.current.activeSym = pick.sym;

    if (stateRef.current.mode === 'differ' && stateRef.current.patTrigger) {
      setDigit(pick.b!);
      stateRef.current.digit = pick.b!;
      const ps = stateRef.current.patState[pick.sym];
      if (ps) ps.waiting = true;
      vlResetM(pick.sym);
      fireTrade('differ');
      addLogLine(`🌐 MULTI · ${pick.sym} escolhido · DIFFER ≠${pick.b}`, "info");
    } else {
      vlResetM(pick.sym);
      fireTrade(stateRef.current.mode);
      addLogLine(`🌐 MULTI · ${pick.sym} escolhido · ${stateRef.current.mode.toUpperCase()}`, "info");
    }
  };

  // Escutar retornos das compras e POC
  useEffect(() => {
    const handlePOCMsg = (data: any) => {
      console.log("MESSAGE ", data);
      if (data.msg_type === "proposal_open_contract" && data.proposal_open_contract) {
        const c = data.proposal_open_contract;
        if (c.is_valid_to_sell === 1 || c.is_sold === 1 || c.status === 'won' || c.status === 'lost') {
          // Evitar processar duplicados
          const contractId = c.contract_id;
          if (derivService.getStorageDerivAccount()) {
            const cache = stateRef.current.settled;
            if (cache[contractId]) return;
            cache[contractId] = true;
          }

          let exitDig: number | null = null;
          let audit: { tick_previous: string; tick_start: string; tick_end: string; } | null = null;
          if (c.exit_spot !== undefined) {
            exitDig = Number(String(c.exit_spot).slice(-1));
          }

          if (c.audit_details) {
            const details = c.audit_details.all_ticks.filter((t: any) => t.tick_display_value !== undefined);
            console.log("DETAILS ", details);
            audit = {
              'tick_previous': details[0].tick_display_value.slice(-1),
              'tick_start': details[1].tick_display_value.slice(-1),
              'tick_end': details[2].tick_display_value.slice(-1)
            }

            const isCombo = stateRef.current.pendingKind?.kind === 'combo';
            settleContract(c, Number(c.profit), isCombo, exitDig, audit);
          }
        }
      }
    };

    const listenerId = derivService.observerInstance.on("deriv.proposal_open_contract", handlePOCMsg);
    return () => {
      derivService.observerInstance.removeById(listenerId);
    };
  }, []);

  // Lógica de Compra e Execução de Operações
  const fireTrade = async (kind: string) => {
    if (!stateRef.current.accountInfo) {
      toast.error("Por favor, conecte a API");
      return;
    }
    if (stateRef.current.tradeLock) return;

    if (stateRef.current.pnl <= -Math.abs(stateRef.current.stopLoss)) {
      toast.error("Stop Loss atingido");
      stopRobo();
      return;
    }
    if (stateRef.current.pnl >= Math.abs(stateRef.current.stopWin)) {
      toast.success("Stop Win atingido");
      stopRobo();
      return;
    }

    if (kind === 'combo') {
      fireCombo();
      return;
    }

    const stakeVal = +stateRef.current.curStake.toFixed(2);
    let ct = 'DIGITDIFF';
    if (kind === 'over') ct = 'DIGITOVER';
    else if (kind === 'under') ct = 'DIGITUNDER';

    stateRef.current.tradeLock = true;
    stateRef.current.pendingKind = { kind };

    // Compra rápida por proposta pré-aberta se disponível, senão fallback
    const p = getProp(ct, stateRef.current.digit);

    try {
      const response = await (p
        ? derivService.send({ buy: p.id, price: stakeVal })
        : derivService.send({
          buy: 1,
          price: stakeVal,
          parameters: {
            amount: stakeVal,
            basis: 'stake',
            contract_type: ct,
            currency: 'USD',
            duration: 1,
            duration_unit: 't',
            underlying_symbol: stateRef.current.activeSym,
            barrier: String(stateRef.current.digit)
          }
        })
      );

      if (response.buy) {
        addLogLine(`▶ ${kind.toUpperCase()} ${kind === 'differ' ? '≠' : kind === 'over' ? '>' : '<'}${stateRef.current.digit} · $${stakeVal} · ${stateRef.current.activeSym}${p ? ' ⚡' : ''}`, "info");

        // Se compramos por proposta, invalidamos para forçar a recarga
        if (p) {
          invalidateConsumedProposals();
          ensureProposal(ct, stateRef.current.digit);
        }

        // Subscrever no POC
        derivService.send({
          proposal_open_contract: 1,
          contract_id: response.buy.contract_id,
          subscribe: 1
        });
      }
    } catch (e: any) {
      stateRef.current.tradeLock = false;
      toast.error(e.message || "Erro na compra");
      addLogLine(`Erro na compra: ${e.message}`, "lose");
    }
  };

  const fireCombo = async () => {
    const stakeVal = +stateRef.current.curStake.toFixed(2);
    stateRef.current.tradeLock = true;
    stateRef.current.comboPending = { legs: 2, won: 0, results: [] };
    stateRef.current.pendingKind = { kind: 'combo' };

    const pO = getProp('DIGITOVER', 5);
    const pU = getProp('DIGITUNDER', 4);

    try {
      // Perna 1: Over 5
      const buyOver = pO
        ? derivService.send({ buy: pO.id, price: stakeVal })
        : derivService.send({
          buy: 1,
          price: stakeVal,
          parameters: {
            amount: stakeVal,
            basis: 'stake',
            contract_type: 'DIGITOVER',
            currency: 'USD',
            duration: 1,
            duration_unit: 't',
            underlying_symbol: stateRef.current.activeSym,
            barrier: '5'
          }
        });

      // Perna 2: Under 4
      const buyUnder = pU
        ? derivService.send({ buy: pU.id, price: stakeVal })
        : derivService.send({
          buy: 1,
          price: stakeVal,
          parameters: {
            amount: stakeVal,
            basis: 'stake',
            contract_type: 'DIGITUNDER',
            currency: 'USD',
            duration: 1,
            duration_unit: 't',
            underlying_symbol: stateRef.current.activeSym,
            barrier: '4'
          }
        });

      const [resOver, resUnder] = await Promise.all([buyOver, buyUnder]);

      if (resOver.buy && resUnder.buy) {
        addLogLine(`▶ COMBO Over>5 + Under<4 · $${stakeVal}×2 · ${stateRef.current.activeSym}${(pO && pU) ? ' ⚡' : ''}`, "info");

        // Se compramos por propostas, invalidamos e recarregamos
        if (pO || pU) {
          invalidateConsumedProposals();
          ensureProposal('DIGITOVER', 5);
          ensureProposal('DIGITUNDER', 4);
        }

        derivService.send({ proposal_open_contract: 1, contract_id: resOver.buy.contract_id, subscribe: 1 });
        derivService.send({ proposal_open_contract: 1, contract_id: resUnder.buy.contract_id, subscribe: 1 });
      }
    } catch (e: any) {
      stateRef.current.tradeLock = false;
      stateRef.current.comboPending = null;
      toast.error(e.message || "Erro no Combo");
    }
  };

  const settleContract = (c: any, profit: number, isCombo: boolean, exitDig: number | null, audit: { tick_previous: string, tick_start: string, tick_end: string } | null) => {
    if (isCombo && stateRef.current.comboPending) {
      const cp = stateRef.current.comboPending;
      cp.legs--;
      if (profit >= 0) cp.won++;
      cp.results.push(profit);

      if (cp.legs > 0) return;

      const net = cp.results.reduce((a, b) => a + b, 0);
      const bothLost = cp.won === 0;
      finishTrade(net, bothLost, 'COMBO', exitDig, audit);
      stateRef.current.comboPending = null;
      return;
    }

    finishTrade(profit, profit < 0, (stateRef.current.pendingKind?.kind || '').toUpperCase(), exitDig, audit);
  };

  const finishTrade = (profit: number, isLoss: boolean, label: string, exitDig: number | null, audit: { tick_previous: string, tick_start: string, tick_end: string } | null) => {
    const nextPnl = +(stateRef.current.pnl + profit).toFixed(2);
    setPnl(nextPnl);
    stateRef.current.pnl = nextPnl;

    const stakeUsed = stateRef.current.curStake;
    const dtxt = exitDig !== null ? ` · saiu ${exitDig}` : '';

    const newTrade: TradeLog = {
      t: new Date().toISOString(),
      mercado: stateRef.current.activeSym,
      modo: label,
      alvo: stateRef.current.digit,
      audit: audit !== null ? audit : null,
      saiu: exitDig !== null ? exitDig : '—',
      stake: stakeUsed.toFixed(2),
      resultado: isLoss ? 'LOSS' : 'WIN',
      lucro: profit.toFixed(2),
      acumulado: nextPnl.toFixed(2)
    };

    setTrades(prev => [newTrade, ...prev].slice(0, 2000));

    if (isLoss) {
      const nextLoss = wins + 1;
      setLoss(prev => prev + 1);

      if (galeMode === 'parc') {
        stateRef.current.lossAcum = +(stateRef.current.lossAcum + Math.abs(profit)).toFixed(2);
        stateRef.current.parcelsLeft = galeParcels;
        const pay = stateRef.current.lastPayout > 0.05 ? stateRef.current.lastPayout : 0.9;
        stateRef.current.curStake = +(stake + (stateRef.current.lossAcum / stateRef.current.parcelsLeft) / pay).toFixed(2);
        addLogLine(`✖ LOSS ${label}${dtxt} ${profit.toFixed(2)} · parc: $${stateRef.current.lossAcum} ÷ ${stateRef.current.parcelsLeft} · próx $${stateRef.current.curStake}`, "lose");
      } else {
        stateRef.current.galeLevel++;
        stateRef.current.curStake = +(stake * Math.pow(gale, stateRef.current.galeLevel)).toFixed(2);
        addLogLine(`✖ LOSS ${label}${dtxt} ${profit.toFixed(2)} · próx $${stateRef.current.curStake}`, "lose");
      }
      soundLoss();
    } else {
      setWins(prev => prev + 1);
      if (stakeUsed > 0 && profit > 0) {
        stateRef.current.lastPayout = +(profit / stakeUsed).toFixed(3);
      }

      if (galeMode === 'parc' && stateRef.current.lossAcum > 0) {
        stateRef.current.lossAcum = +Math.max(0, stateRef.current.lossAcum - profit).toFixed(2);
        stateRef.current.parcelsLeft = Math.max(1, stateRef.current.parcelsLeft - 1);
        if (stateRef.current.lossAcum <= 0) {
          stateRef.current.lossAcum = 0;
          stateRef.current.parcelsLeft = 0;
          stateRef.current.curStake = stake;
          addLogLine(`✔ WIN ${label}${dtxt} +${profit.toFixed(2)} · dívida quitada · stake $${stake}`, "win");
        } else {
          const pay = stateRef.current.lastPayout > 0.05 ? stateRef.current.lastPayout : 0.9;
          stateRef.current.curStake = +(stake + (stateRef.current.lossAcum / stateRef.current.parcelsLeft) / pay).toFixed(2);
          addLogLine(`✔ WIN ${label}${dtxt} +${profit.toFixed(2)} · resta $${stateRef.current.lossAcum} (${stateRef.current.parcelsLeft} parc) · próx $${stateRef.current.curStake}`, "win");
        }
      } else {
        stateRef.current.galeLevel = 0;
        stateRef.current.lossAcum = 0;
        stateRef.current.parcelsLeft = 0;
        stateRef.current.curStake = stake;
        addLogLine(`✔ WIN ${label}${dtxt} +${profit.toFixed(2)}`, "win");
      }
      soundWin();
    }

    stateRef.current.tradeLock = false;

    // Invalida e recria as propostas (porque o stake mudou no gale/win)
    forgetAllProposals();
    setTimeout(() => {
      refreshProposals();
    }, 50);

    if (nextPnl <= -Math.abs(stopLoss)) {
      toast.error("Stop Loss Atingido!");
      stopRobo();
    }
    if (nextPnl >= Math.abs(stopWin)) {
      toast.success("Stop Win Atingido!");
      stopRobo();
    }
  };

  const manualFire = (kind: string) => {
    if (vlOn) {
      if (!vlGateOpen()) {
        toast.warn(`Aguardando loss virtual (${stateRef.current.vlCount}/${vlQty})`);
        return;
      }
      vlReset();
    }
    fireTrade(kind);
  };

  // Controles do Robô
  const startRobo = () => {
    if (exec !== 'auto') {
      toast.warn("Selecione modo AUTOMÁTICO para ligar o robô");
      return;
    }
    if (!accountInfo) {
      toast.warn("Por favor, conecte na conta Deriv");
      return;
    }
    setAutoOn(true);
    addLogLine(`🤖 Robô LIGADO · Modo ${mode.toUpperCase()}`, "win");
  };

  const stopRobo = () => {
    setAutoOn(false);
    addLogLine("🤖 Robô desligado", "info");
  };

  const abortOp = () => {
    setAutoOn(false);
    stateRef.current.galeLevel = 0;
    stateRef.current.curStake = stake;
    stateRef.current.lossAcum = 0;
    stateRef.current.parcelsLeft = 0;
    stateRef.current.tradeLock = false;
    vlReset();
    vlResetAllM();
    addLogLine("✋ Operação abortada · gale e contadores resetados", "info");
  };

  const resetStats = () => {
    setWins(0);
    setLoss(0);
    setPnl(0);
    setTrades([]);
    setLogLines([]);
    stateRef.current.galeLevel = 0;
    stateRef.current.curStake = stake;
    stateRef.current.lossAcum = 0;
    stateRef.current.parcelsLeft = 0;
    stateRef.current.tradeLock = false;
    vlReset();
    vlResetAllM();
    addLogLine("Histórico e estatísticas resetados", "info");
  };

  // Exportar histórico para CSV
  const exportTradesCSV = () => {
    if (!trades.length) {
      toast.warn("Nenhuma operação registrada para exportar");
      return;
    }
    const headers = ['data_hora', 'mercado', 'modo', 'alvo', 'saiu', 'stake', 'resultado', 'lucro', 'acumulado'];
    const rows = trades.map(t => [
      t.t, t.mercado, t.modo, t.alvo, t.saiu, t.stake, t.resultado, t.lucro, t.acumulado
    ].join(','));
    const csvContent = headers.join(',') + '\n' + rows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `bearbot_trades_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(`Exportado ${trades.length} operações com sucesso!`);
  };

  // Qui-Quadrado Badge
  const renderChiBadge = (sym: string) => {
    const cs = chiSquare(sym);
    if (!cs) return null;
    let badgeClass = "text-gray-400 border-gray-600";
    if (cs.level === 'medio') badgeClass = "text-yellow-500 border-yellow-500 bg-yellow-500/10";
    if (cs.level === 'alto') badgeClass = "text-red-500 border-red-500 bg-red-500/10";

    return (
      <span className={`text-[10px] font-mono border rounded px-1.5 py-0.5 ${badgeClass}`} title="Qui-quadrado">
        χ² {cs.chi}
      </span>
    );
  };

  // Análise estatística observada vs teórica
  const getTheoreticalRate = () => {
    if (mode === 'over') return ((9 - digit) / 10) * 100;
    if (mode === 'under') return (digit / 10) * 100;
    if (mode === 'combo') return 80;
    return 90; // differ
  };

  const getObservedRate = (sym: string) => {
    const arr = tickData[sym]?.digits.slice(-50) || [];
    if (arr.length < 10) return 0;
    let w = 0;
    arr.forEach(x => {
      if (isWinCheck(x, mode, digit)) w++;
    });
    return Math.round((w / arr.length) * 100);
  };

  // Exaustão da zona perdedora
  const getExhaustionRate = (sym: string) => {
    const arr = tickData[sym]?.digits || [];
    if (arr.length < 50) return 0;
    const lose = loserSet(mode, digit);
    const expFrac = lose.size / 10;
    let exSum = 0;
    const winsArr = [10, 25, 50];

    winsArr.forEach(n => {
      const s2 = arr.slice(-n);
      let c = 0;
      s2.forEach(x => { if (lose.has(x)) c++; });
      const frac = c / s2.length;
      exSum += (frac - expFrac) / Math.max(expFrac, 0.05);
    });

    const exMean = exSum / 3;
    return Math.max(0, Math.min(100, Math.round(exMean * 100)));
  };

  const activeExhaustion = getExhaustionRate(activeSym);

  // Alterar Conta (Real/Virtual)
  const handleAccountToggle = async (isVirtual: boolean) => {
    const targetToken = accountInfo?.tokens.find(t => t.is_virtual === isVirtual)?.token;
    if (targetToken) {
      abortOp();
      toast.info(`Trocando para conta ${isVirtual ? "Virtual" : "Real"}...`);
      try {
        await derivService.switchAccount(targetToken);
        toast.success("Conta alterada com sucesso!");
      } catch (e: any) {
        toast.error(`Falha ao alterar conta: ${e.message}`);
      }
    } else {
      toast.error(`Nenhum token configurado para conta ${isVirtual ? "Virtual" : "Real"}`);
    }
  };

  return (
    <div className="w-full bg-[#0d0a18] text-[#eef2f8] min-h-screen pb-10">

      {/* Banner de conexão ausente */}
      {!accountInfo && (
        <div className="bg-red-500/10 border-b border-red-500/30 p-4 text-center text-red-200 flex items-center justify-center gap-2">
          <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />
          <span>Sua conta Deriv não está conectada. Acesse o menu de autenticação para conectar e ativar o robô.</span>
        </div>
      )}

      {/* Header Placar */}
      <div className="border-b border-[#222c3f] bg-[#0e131d] px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-600/10 border border-indigo-500/30 flex items-center justify-center text-xl overflow-hidden">
            <img src="/img/bear-logo.jpg" alt="logo" className="w-full h-full object-cover" />
          </div>
          <div>
            <h1 className="text-lg font-bold">Bear Bot Ultra 7.7.9</h1>
            <p className="text-xs text-[#8593aa]">Estatísticas & Trading Over/Under/Differ</p>
          </div>
        </div>

        {/* Estatísticas resumidas no Header */}
        <div className="flex items-center gap-6">
          <div className="flex flex-col">
            <span className="text-[10px] text-[#8593aa] uppercase tracking-wider">CONTA</span>
            <span className="font-bold font-mono text-cyan-400">
              {accountInfo ? (accountInfo.tokens.find(t => t.token === accountInfo.activeToken)?.is_virtual ? "VIRTUAL" : "REAL") : "DESCONECTADO"}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-[#8593aa] uppercase tracking-wider">Saldo:</span>
            <span className="font-bold font-mono text-sm text-yellow-500">
              {accountInfo ? new Intl.NumberFormat('en-Us', { style: 'currency', currency: 'USD' }).format(accountInfo.tokens.find(t => t.token === accountInfo.activeToken)?.balance) : "0.00"}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-[#8593aa] uppercase tracking-wider">LUCRO ACUMULADO</span>
            <span className={`font-bold font-mono text-sm ${pnl >= 0 ? "text-green-500" : "text-red-500"}`}>
              {pnl >= 0 ? `+$${pnl}` : `-$${Math.abs(pnl)}`}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-[#8593aa] uppercase tracking-wider">ASSERTIVIDADE</span>
            <span className="font-bold font-mono text-sm text-yellow-500">
              {wins + loss > 0 ? `${Math.round((wins / (wins + loss)) * 100)}%` : "0%"}
            </span>
          </div>
        </div>

        {/* Toggle Real/Demo */}
        {accountInfo && (
          <div className="flex items-center bg-[#070b14] border border-[#2e3a52] rounded-lg p-1">
            <button
              onClick={() => handleAccountToggle(true)}
              className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${accountInfo.tokens.find(t => t.token === accountInfo.activeToken)?.is_virtual
                ? "bg-yellow-600/30 text-yellow-400 border border-yellow-500/50"
                : "text-[#8593aa]"
                }`}
            >
              Demo
            </button>
            <button
              onClick={() => handleAccountToggle(false)}
              className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${!accountInfo.tokens.find(t => t.token === accountInfo.activeToken)?.is_virtual
                ? "bg-red-600/30 text-red-400 border border-red-500/50"
                : "text-[#8593aa]"
                }`}
            >
              Real
            </button>
          </div>
        )}
      </div>

      {/* Grid Principal */}
      <div className="w-full p-4 grid grid-cols-1 lg:grid-cols-12 gap-4">

        {/* Coluna Esquerda: Painel de Controle (3/12) */}
        <div className="lg:col-span-3 flex flex-col gap-4">

          {/* Card: Execução e Controle */}
          <div className="bg-[#131925] border border-[#222c3f] rounded-xl p-4 shadow-xl">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#8593aa] mb-3 flex items-center gap-2">
              <span>🚀 CONTROLE DE OPERAÇÕES</span>
            </h2>

            <div className="flex flex-col gap-3">
              {/* Seletor Manual/Automático */}
              <div>
                <label className="text-[10px] text-[#8593aa] uppercase tracking-wider block mb-1">Modo de Execução</label>
                <div className="grid grid-cols-2 gap-2 bg-[#070b14] p-1 border border-[#2e3a52] rounded-lg">
                  <button
                    onClick={() => { setExec('manual'); stopRobo(); }}
                    className={`py-2 text-xs font-bold rounded-md transition-all ${exec === 'manual' ? "bg-indigo-600 text-white" : "text-[#8593aa] hover:text-[#eef2f8]"
                      }`}
                  >
                    Manual
                  </button>
                  <button
                    onClick={() => setExec('auto')}
                    className={`py-2 text-xs font-bold rounded-md transition-all ${exec === 'auto' ? "bg-indigo-600 text-white" : "text-[#8593aa] hover:text-[#eef2f8]"
                      }`}
                  >
                    Automático
                  </button>
                </div>
              </div>

              {/* Botões Ligar/Desligar Robô se Automático */}
              {exec === 'auto' ? (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={autoOn ? stopRobo : startRobo}
                    disabled={!accountInfo}
                    className={`py-3 rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition-all ${autoOn
                      ? "bg-red-600 hover:bg-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.3)] animate-pulse"
                      : "bg-green-600 hover:bg-green-500 text-[#04140a] disabled:opacity-50"
                      }`}
                  >
                    {autoOn ? (
                      <>
                        <StopIcon className="w-4 h-4" />
                        Desligar Robô
                      </>
                    ) : (
                      <>
                        <PlayIcon className="w-4 h-4" />
                        Ligar Robô
                      </>
                    )}
                  </button>
                  <button
                    onClick={abortOp}
                    className="bg-[#18202f] border border-[#2e3a52] hover:bg-[#222c3f] py-3 rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition-all"
                  >
                    Pausar / Abortar
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => manualFire(mode)}
                    disabled={!accountInfo}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                  >
                    <PlayIcon className="w-4 h-4" />
                    Entrar Agora
                  </button>
                  <button
                    onClick={abortOp}
                    className="bg-[#18202f] border border-[#2e3a52] hover:bg-[#222c3f] py-3 rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition-all"
                  >
                    Zerar Gale
                  </button>
                </div>
              )}

              {/* Multi-mercados e Som */}
              <div className="flex items-center justify-between gap-4 mt-1 bg-[#070b14] p-3 border border-[#2e3a52] rounded-lg">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSoundOn(!soundOn)}
                    className="p-1.5 rounded-md bg-[#18202f] hover:bg-[#222c3f] transition-all"
                  >
                    {soundOn ? (
                      <SpeakerWaveIcon className="w-4 h-4 text-green-400" />
                    ) : (
                      <SpeakerXMarkIcon className="w-4 h-4 text-gray-500" />
                    )}
                  </button>
                  <span className="text-xs text-[#8593aa]">Efeitos Sonoros</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setMultiOn(!multiOn);
                      vlResetAllM();
                    }}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold border transition-all ${multiOn
                      ? "bg-indigo-600 border-indigo-500 text-white"
                      : "bg-[#18202f] border-[#2e3a52] text-[#8593aa]"
                      }`}
                  >
                    {multiOn ? "Multi ON" : "Multi OFF"}
                  </button>
                  <span className="text-xs text-[#8593aa]">Vigiar 7 Mercados</span>
                </div>
              </div>

            </div>
          </div>

          {/* Card: Configuração de Estratégias */}
          <div className="bg-[#131925] border border-[#222c3f] rounded-xl p-4 shadow-xl">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#8593aa] mb-3">
              ⚙️ ESTRATÉGIA & PARÂMETROS
            </h2>

            <div className="flex flex-col gap-3">
              {/* Escolha do Modo */}
              <div>
                <label className="text-[10px] text-[#8593aa] uppercase tracking-wider block mb-1">Estratégia</label>
                <div className="grid grid-cols-4 gap-1 bg-[#070b14] p-1 border border-[#2e3a52] rounded-lg">
                  {(['over', 'under', 'differ', 'combo'] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => setMode(m)}
                      className={`py-1.5 text-[10px] font-bold rounded transition-all uppercase ${mode === m ? "bg-indigo-600 text-white" : "text-[#8593aa] hover:text-[#eef2f8]"
                        }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {/* Seletor de Dígitos (Desabilitado no Combo) */}
              <div className={mode === 'combo' ? 'opacity-40 pointer-events-none' : ''}>
                <label className="text-[10px] text-[#8593aa] uppercase tracking-wider block mb-1">Dígito Alvo</label>
                <div className="grid grid-cols-5 gap-1.5">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setDigit(i)}
                      className={`py-2 font-mono font-bold text-sm rounded-lg border transition-all ${digit === i
                        ? "bg-indigo-600 border-indigo-500 text-white shadow-[0_0_10px_rgba(99,102,241,0.4)]"
                        : loserSet(mode, digit).has(i)
                          ? "bg-[#e23b32]/5 border-[#e23b32]/25 text-[#e23b32] hover:bg-[#e23b32]/10"
                          : "bg-[#2eb84f]/5 border-[#2eb84f]/25 text-[#2eb84f] hover:bg-[#2eb84f]/10"
                        }`}
                    >
                      {i}
                    </button>
                  ))}
                </div>
              </div>

              {/* Valores Limites */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-[#8593aa] uppercase tracking-wider block mb-1">Entrada Inicial</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.35"
                    value={stake}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setStake(v);
                      stateRef.current.curStake = v;
                    }}
                    className="w-full bg-[#070b14] border border-[#2e3a52] text-white px-3 py-2 rounded-lg font-mono text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-[#8593aa] uppercase tracking-wider block mb-1">Martingale (Gale)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    value={gale}
                    onChange={(e) => setGale(Number(e.target.value))}
                    className="w-full bg-[#070b14] border border-[#2e3a52] text-white px-3 py-2 rounded-lg font-mono text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-[#8593aa] uppercase tracking-wider block mb-1">Stop Loss ($)</label>
                  <input
                    type="number"
                    value={stopLoss}
                    onChange={(e) => setStopLoss(Number(e.target.value))}
                    className="w-full bg-[#070b14] border border-[#2e3a52] text-white px-3 py-2 rounded-lg font-mono text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-[#8593aa] uppercase tracking-wider block mb-1">Stop Win ($)</label>
                  <input
                    type="number"
                    value={stopWin}
                    onChange={(e) => setStopWin(Number(e.target.value))}
                    className="w-full bg-[#070b14] border border-[#2e3a52] text-white px-3 py-2 rounded-lg font-mono text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Modos de Recuperação (Martingale) */}
              <div>
                <label className="text-[10px] text-[#8593aa] uppercase tracking-wider block mb-1">Modo Martingale</label>
                <div className="grid grid-cols-2 gap-2 bg-[#070b14] p-1 border border-[#2e3a52] rounded-lg">
                  <button
                    onClick={() => setGaleMode('mult')}
                    className={`py-1.5 text-xs font-bold rounded-md transition-all ${galeMode === 'mult' ? "bg-indigo-600 text-white" : "text-[#8593aa] hover:text-[#eef2f8]"
                      }`}
                  >
                    Multiplicador
                  </button>
                  <button
                    onClick={() => setGaleMode('parc')}
                    className={`py-1.5 text-xs font-bold rounded-md transition-all ${galeMode === 'parc' ? "bg-indigo-600 text-white" : "text-[#8593aa] hover:text-[#eef2f8]"
                      }`}
                  >
                    Parcelado
                  </button>
                </div>
              </div>

              {galeMode === 'parc' && (
                <div>
                  <label className="text-[10px] text-[#8593aa] uppercase tracking-wider block mb-1">Quantidade de Parcelas</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={galeParcels}
                    onChange={(e) => setGaleParcels(Number(e.target.value))}
                    className="w-full bg-[#070b14] border border-[#2e3a52] text-white px-3 py-2 rounded-lg font-mono text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>
              )}

            </div>
          </div>

          {/* Card: Perdas Virtuais */}
          <div className="bg-[#131925] border border-[#222c3f] rounded-xl p-4 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold uppercase tracking-wider text-[#8593aa]">
                🛡️ LOSS VIRTUAL
              </h2>
              <button
                onClick={() => setVlOn(!vlOn)}
                className={`w-12 h-6 rounded-full transition-all relative ${vlOn ? "bg-green-600" : "bg-[#18202f] border border-[#2e3a52]"
                  }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-all ${vlOn ? "left-6.5" : "left-0.5"
                    }`}
                />
              </button>
            </div>

            {vlOn && (
              <div className="flex flex-col gap-3">
                <div>
                  <label className="text-[10px] text-[#8593aa] uppercase tracking-wider block mb-1">Tipo de Filtro</label>
                  <div className="grid grid-cols-2 gap-2 bg-[#070b14] p-1 border border-[#2e3a52] rounded-lg">
                    <button
                      onClick={() => setVlMode('consec')}
                      className={`py-1.5 text-xs font-bold rounded-md transition-all ${vlMode === 'consec' ? "bg-indigo-600 text-white" : "text-[#8593aa] hover:text-[#eef2f8]"
                        }`}
                    >
                      Consecutivo
                    </button>
                    <button
                      onClick={() => setVlMode('accum')}
                      className={`py-1.5 text-xs font-bold rounded-md transition-all ${vlMode === 'accum' ? "bg-indigo-600 text-white" : "text-[#8593aa] hover:text-[#eef2f8]"
                        }`}
                    >
                      Acumulado
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-[#8593aa] uppercase tracking-wider block mb-1">Qtd. Perdas</label>
                    <input
                      type="number"
                      min="1"
                      value={vlQty}
                      onChange={(e) => setVlQty(Number(e.target.value))}
                      className="w-full bg-[#070b14] border border-[#2e3a52] text-white px-3 py-2 rounded-lg font-mono text-sm focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  {vlMode === 'accum' && (
                    <div>
                      <label className="text-[10px] text-[#8593aa] uppercase tracking-wider block mb-1">Janela Ticks</label>
                      <input
                        type="number"
                        min="1"
                        value={vlWindow}
                        onChange={(e) => setVlWindow(Number(e.target.value))}
                        className="w-full bg-[#070b14] border border-[#2e3a52] text-white px-3 py-2 rounded-lg font-mono text-sm focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  )}
                </div>

                <div className="bg-[#070b14] p-3 border border-[#2e3a52] rounded-lg text-center">
                  <span className="text-[10px] text-[#8593aa] uppercase tracking-wider block">Status do Filtro</span>
                  <span className="text-xl font-bold font-mono text-cyan-400">
                    {vlCount} / {vlQty} {vlMode === 'accum' && `(janela ${vlSeen}/${vlWindow})`}
                  </span>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Coluna Central: Mercados, Gráficos & Tabela (6/12) */}
        <div className="lg:col-span-6 flex flex-col gap-4">

          {/* Qui-Quadrado & Volatilidades */}
          <div className="bg-[#131925] border border-[#222c3f] rounded-xl p-4 shadow-xl">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#8593aa] mb-4 flex items-center justify-between">
              <span>📊 ANÁLISE DE MERCADO EM TEMPO REAL</span>
              <span className="text-xs text-indigo-400 uppercase tracking-normal">Volatilidade Selecionada: {activeSym}</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {MARKETS.map((m) => {
                const isSelected = activeSym === m.sym;
                const data = tickData[m.sym];
                const obsRate = getObservedRate(m.sym);
                const anomaly = marketAnomaly(m.sym);

                return (
                  <div
                    key={m.sym}
                    onClick={() => {
                      setActiveSym(m.sym);
                      stateRef.current.activeSym = m.sym;
                    }}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${isSelected
                      ? "bg-[#18202f] border-indigo-500 shadow-[0_0_12px_rgba(99,102,241,0.2)]"
                      : "bg-[#0e131d] border-[#222c3f] hover:bg-[#18202f]/50"
                      }`}
                  >
                    {/* Linha 1: Nome e Qui-Quadrado */}
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold truncate max-w-[120px]">{m.nm}</span>
                      <div className="flex items-center gap-1">
                        {renderChiBadge(m.sym)}
                      </div>
                    </div>

                    {/* Linha 2: Status de Anomalia */}
                    {anomaly ? (
                      <div className={`text-[10px] font-bold py-0.5 px-1.5 rounded mb-2 ${anomaly.level === 'evite' ? "bg-red-500/10 text-red-400" : "bg-yellow-500/10 text-yellow-400"
                        }`}>
                        {anomaly.level === 'evite' ? "⛔ Evitar Operar" : "⚠️ Instável"}
                      </div>
                    ) : (
                      <div className="text-[10px] text-green-400 font-bold bg-green-500/10 py-0.5 px-1.5 rounded mb-2">
                        ✓ Estável
                      </div>
                    )}

                    {/* Últimos ticks do mercado */}
                    <div className="flex gap-1 overflow-hidden h-7 items-center justify-start">
                      {data?.digits.slice(-8).map((d, index) => {
                        const isLoser = loserSet(mode, digit).has(d);
                        return (
                          <span
                            key={index}
                            className={`w-6 h-6 flex items-center justify-center text-xs font-mono font-bold rounded ${isLoser
                              ? "bg-red-500/10 border border-red-500/20 text-red-400"
                              : "bg-green-500/10 border border-green-500/20 text-green-400"
                              }`}
                          >
                            {d}
                          </span>
                        );
                      }) || <span className="text-[10px] text-gray-500">Coletando...</span>}
                    </div>

                    <div className="flex justify-between items-center mt-2 pt-2 border-t border-[#222c3f] text-[10px] text-[#8593aa]">
                      <span>Último: <strong className="font-mono text-cyan-400">{data?.price ?? '—'}</strong></span>
                      <span>Hit: <strong className="font-mono text-green-400">{obsRate}%</strong></span>
                    </div>

                  </div>
                );
              })}
            </div>
          </div>

          {/* Gráfico de Barras / Distribuição de Ticks */}
          <div className="bg-[#131925] border border-[#222c3f] rounded-xl p-4 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-[#8593aa]">
                📊 DISTRIBUIÇÃO DOS ÚLTIMOS TICKS (MERCADO ATIVO)
              </h2>
            </div>

            {/* Listar os 4 blocos de janelas de Ticks (10, 25, 50, 100) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[10, 25, 50, 100].map((n) => {
                const arr = tickData[activeSym]?.digits.slice(-n) || [];
                const counts = new Array(10).fill(0);
                arr.forEach(d => counts[d]++);
                const tot = arr.length || 1;
                const lose = loserSet(mode, digit);

                return (
                  <div key={n} className="bg-[#0e131d] border border-[#222c3f] rounded-lg p-3">
                    <span className="text-[10px] text-[#8593aa] uppercase tracking-wider font-bold mb-2 block text-center">
                      Últimos {n} Ticks
                    </span>

                    {/* Barras Verticais */}
                    <div className="flex items-end justify-between h-20 gap-1.5 mt-2">
                      {Array.from({ length: 10 }).map((_, i) => {
                        const pctNum = (counts[i] / tot) * 100;
                        const heightPct = Math.min(100, (pctNum / 50) * 100);
                        const isLoser = lose.has(i);

                        return (
                          <div key={i} className="flex flex-col items-center flex-1 h-full justify-end">
                            <span className="text-[8px] font-mono text-gray-500 mb-0.5">{Math.round(pctNum)}%</span>
                            <div
                              style={{ height: `${counts[i] ? Math.max(heightPct, 4) : 2}%` }}
                              className={`w-full rounded-t-sm transition-all ${isLoser
                                ? "bg-gradient-to-t from-red-600 to-red-400"
                                : counts[i] > 0
                                  ? "bg-gradient-to-t from-green-600 to-green-400"
                                  : "bg-[#2e3a52]"
                                }`}
                            />
                            <span className={`text-[10px] font-mono font-bold mt-1 ${isLoser ? "text-red-400" : "text-green-400"}`}>
                              {i}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>


          {/* Tabela de Transações Concluídas */}
          <div className="bg-[#131925] border border-[#222c3f] rounded-xl p-4 shadow-xl overflow-x-auto">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#8593aa] mb-3">
              💰 ÚLTIMAS OPERAÇÕES
            </h2>

            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#2e3a52] text-[#8593aa] uppercase text-[10px]">
                  <th className="py-2 px-3">Data/Hora</th>
                  <th className="py-2 px-3">Mercado</th>
                  <th className="py-2 px-3">Estratégia</th>
                  <th className="py-2 px-3">Alvo</th>
                  <th className="py-2 px-3">Saiu</th>
                  <th className="py-2 px-3">Auditoria</th>
                  <th className="py-2 px-3">Stake</th>
                  <th className="py-2 px-3">Resultado</th>
                  <th className="py-2 px-3">Lucro ($)</th>
                </tr>
              </thead>
              <tbody>
                {trades.length > 0 ? (
                  trades.slice(0, 10).map((t, index) => (
                    <tr key={index} className="border-b border-[#222c3f]/50 hover:bg-[#18202f]/20 font-mono">
                      <td className="py-2 px-3 text-gray-400">
                        {new Date(t.t).toLocaleTimeString("pt-BR", { hour12: false })}
                      </td>
                      <td className="py-2 px-3">{t.mercado}</td>
                      <td className="py-2 px-3 uppercase text-[10px]">{t.modo}</td>
                      <td className="py-2 px-3">{t.alvo}</td>
                      <td className="py-2 px-3">{t.saiu}</td>
                      <td className="py-2 px-3">
                        <span className="text-muted">{t.audit?.tick_previous}</span>-
                        <span className="text-blue-500">{t.audit?.tick_start}</span>-
                        <span className={`${t.resultado === 'WIN' ? 'text-green-400' : 'text-red-400'}`}>{t.audit?.tick_end}</span>
                      </td>
                      <td className="py-2 px-3">${t.stake}</td>
                      <td className="py-2 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${t.resultado === 'WIN'
                          ? "bg-green-500/10 text-green-400 border border-green-500/20"
                          : "bg-red-500/10 text-red-400 border border-red-500/20"
                          }`}>
                          {t.resultado}
                        </span>
                      </td>
                      <td className={`py-2 px-3 font-bold ${Number(t.lucro) >= 0 ? "text-green-400" : "text-red-400"}`}>
                        {Number(t.lucro) >= 0 ? `+$${t.lucro}` : `-$${Math.abs(Number(t.lucro))}`}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-gray-500">Nenhum trade efetuado.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

        </div>

        {/* Coluna Direita: Painel de IA & Logs (3/12) */}
        <div className="lg:col-span-3 flex flex-col gap-4">

          {/* IA e Termômetro */}
          <div className="bg-[#131925] border border-[#222c3f] rounded-xl p-4 shadow-xl flex flex-col gap-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#8593aa]">
              🧠 ANÁLISE DE IA PROBABILÍSTICA
            </h2>

            {/* Hit rate circular (SVG Ring) */}
            <div className="flex items-center gap-4 bg-[#0e131d] p-3 border border-[#222c3f] rounded-lg">
              <div className="relative w-20 h-20">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="transparent"
                    stroke="#1e293b"
                    strokeWidth="8"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="transparent"
                    stroke={getObservedRate(activeSym) >= 60 ? "#2eb84f" : getObservedRate(activeSym) <= 45 ? "#e23b32" : "#e9a92b"}
                    strokeWidth="8"
                    strokeDasharray={251.2}
                    strokeDashoffset={251.2 * (1 - getObservedRate(activeSym) / 100)}
                    className="transition-all duration-500"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center font-mono font-bold text-lg">
                  <span>{getObservedRate(activeSym)}%</span>
                  <span className="text-[8px] text-[#8593aa] uppercase">Hit</span>
                </div>
              </div>

              <div className="flex-1 text-xs flex flex-col gap-1.5">
                <div className="flex justify-between border-b border-[#222c3f] pb-1">
                  <span className="text-gray-400">Teórico:</span>
                  <span className="font-mono font-bold text-cyan-400">{getTheoreticalRate().toFixed(1)}%</span>
                </div>
                <div className="flex justify-between border-b border-[#222c3f] pb-1">
                  <span className="text-gray-400">Desvio:</span>
                  <span className="font-mono font-bold text-yellow-500">
                    {(getObservedRate(activeSym) - getTheoreticalRate()) >= 0 ? "+" : ""}
                    {(getObservedRate(activeSym) - getTheoreticalRate()).toFixed(1)}pp
                  </span>
                </div>
              </div>
            </div>

            {/* Termômetro Exaustão */}
            <div className="bg-[#0e131d] p-3 border border-[#222c3f] rounded-lg">
              <span className="text-[10px] text-[#8593aa] uppercase tracking-wider block mb-1">Exaustão de Perdedores</span>
              <div className="w-full bg-[#18202f] border border-[#2e3a52] h-4 rounded-full overflow-hidden">
                <div
                  style={{ width: `${activeExhaustion}%` }}
                  className="h-full bg-gradient-to-r from-blue-500 via-yellow-500 to-red-500 transition-all duration-500"
                />
              </div>
              <div className="flex justify-between mt-1 text-[10px] font-mono text-cyan-400">
                <span>Normal</span>
                <span>{activeExhaustion}%</span>
              </div>
            </div>

            {/* Sugestão de Entrada */}
            <div className="bg-[#0e131d] p-3 border border-[#222c3f] rounded-lg flex items-center justify-between">
              <div>
                <span className="text-[10px] text-[#8593aa] uppercase tracking-wider block">Gatilho / Sugestão</span>
                <span className="text-xs text-indigo-400 font-bold block mt-0.5">Esperar Qtd Ticks</span>
              </div>
              <span className="text-3xl font-bold font-mono text-cyan-400">
                {Math.round(10 / Math.max(1, loserSet(mode, digit).size)) + Math.round(activeExhaustion / 20)}
              </span>
            </div>

            {/* Momento p/ entrar (Manual) */}
            <div className={`p-3 border rounded-lg flex items-center gap-3 transition-colors ${(tickData[activeSym]?.digits?.length || 0) < 50 ? 'bg-[#0e131d] border-[#222c3f]' :
              activeExhaustion >= 60 ? 'bg-[#0d1f14] border-green-800' :
                activeExhaustion >= 30 ? 'bg-[#1f1a0d] border-yellow-800' :
                  'bg-[#1f0d0f] border-red-800'
              }`}>
              <span className="text-2xl">
                {(tickData[activeSym]?.digits?.length || 0) < 50 ? '⏳' : activeExhaustion >= 60 ? '🟢' : activeExhaustion >= 30 ? '🟡' : '🔴'}
              </span>
              <div className="flex flex-col">
                <span className="text-[10px] text-[#8593aa] uppercase tracking-wider block">Momento p/ Entrar (Manual)</span>
                <span className={`text-xs font-bold mt-0.5 ${(tickData[activeSym]?.digits?.length || 0) < 50 ? 'text-gray-500' :
                  activeExhaustion >= 60 ? 'text-green-400' :
                    activeExhaustion >= 30 ? 'text-yellow-400' :
                      'text-red-400'
                  }`}>
                  {(tickData[activeSym]?.digits?.length || 0) < 50 ? 'coletando dados' :
                    activeExhaustion >= 60 ? 'BOM MOMENTO — zona perdedora esgotada' :
                      activeExhaustion >= 30 ? 'ATENÇÃO — exaustão subindo' :
                        'ESPERE — perdedores ainda fracos'}
                </span>
              </div>
            </div>

          </div>

          {/* Logs Histórico */}
          <div className="bg-[#131925] border border-[#222c3f] rounded-xl p-4 shadow-xl flex flex-col justify-between">

            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold uppercase tracking-wider text-[#8593aa]">
                📜 HISTÓRICO DE LOGS
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={exportTradesCSV}
                  className="p-1 rounded bg-[#18202f] border border-[#2e3a52] hover:bg-[#222c3f] text-xs font-bold flex items-center gap-1 transition-all"
                  title="Exportar CSV"
                >
                  <ArrowDownTrayIcon className="w-3.5 h-3.5" />
                  CSV
                </button>
                <button
                  onClick={resetStats}
                  className="p-1 rounded bg-[#18202f] border border-[#2e3a52] hover:bg-[#222c3f] text-xs font-bold flex items-center gap-1 transition-all"
                  title="Limpar Histórico"
                >
                  <ArrowPathIcon className="w-3.5 h-3.5" />
                  Reset
                </button>
              </div>
            </div>

            {/* Container de Logs */}
            <div className="bg-[#070b14] border border-[#2e3a52] rounded-lg p-3 h-52 overflow-y-auto font-mono text-[10px] flex flex-col gap-1.5 scrollbar-thin scrollbar-thumb-[#2e3a52] scrollbar-track-transparent">
              {logLines.length > 0 ? (
                logLines.map((log, index) => {
                  let textClass = "text-gray-400 border-l-2 border-gray-600";
                  if (log.type === "win") textClass = "text-green-400 border-l-2 border-green-500";
                  if (log.type === "lose") textClass = "text-red-400 border-l-2 border-red-500";
                  if (log.type === "info") textClass = "text-blue-400 border-l-2 border-blue-500";
                  if (log.type === "virt") textClass = "text-yellow-400 border-l-2 border-yellow-500";

                  return (
                    <div key={index} className={`pl-2 py-0.5 leading-relaxed ${textClass}`}>
                      <span className="text-gray-500 mr-2">[{log.ts}]</span>
                      <span>{log.msg}</span>
                    </div>
                  );
                })
              ) : (
                <div className="text-gray-500 text-center py-10">Nenhuma transação efetuada ainda.</div>
              )}
            </div>

          </div>

        </div>

      </div>

    </div>
  );
}

