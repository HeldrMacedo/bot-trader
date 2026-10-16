// BearBotEngine — Lógica Pura de Trading (Sem React)

import {
  BotConfig, BotState, Market, MARKETS, TradeLog, PatternState,
  VLMarketState, MarketIntelligence, MultiCandidate, ComboPending,
  RecoveryState, TickData, ProposalState, DEFAULT_BOT_STATE,
  TradePrep, TradeLeg, buildLoserSet, isWinCheck,
  DynamicDigitDetail, DynamicDigitResult,
  AI_MODE_WEIGHTS, AI_MIN_SCORE_DEFAULT, aiScoreMatches, topOpportunityCandidate, resolveAIWeights,
} from './bearbot2.types';

function clampRateLimits(updates: Partial<BotConfig>): Partial<BotConfig> {
  const next = { ...updates };
  if (next.maxTradesHour !== undefined) {
    const n = Number(next.maxTradesHour);
    next.maxTradesHour = Number.isFinite(n) ? Math.max(1, Math.min(500, Math.floor(n))) : 1;
  }
  if (next.tradeCooldownMs !== undefined) {
    const n = Number(next.tradeCooldownMs);
    next.tradeCooldownMs = Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
  }
  if (next.recoverMaxAttempts !== undefined) {
    const n = Number(next.recoverMaxAttempts);
    next.recoverMaxAttempts = Number.isFinite(n) ? Math.max(1, Math.min(5, Math.floor(n))) : 1;
  }
  if (next.recoverDelay !== undefined) {
    const n = Number(next.recoverDelay);
    next.recoverDelay = Number.isFinite(n) ? Math.max(500, Math.floor(n)) : 500;
  }
  if (next.cooldownSec !== undefined) {
    const n = Number(next.cooldownSec);
    next.cooldownSec = Number.isFinite(n) ? Math.max(0, Math.min(60, Math.floor(n))) : 0;
  }
  if (next.aiMinScore !== undefined) {
    const n = Number(next.aiMinScore);
    next.aiMinScore = Number.isFinite(n) ? Math.max(0, Math.min(100, Math.round(n))) : AI_MIN_SCORE_DEFAULT;
  }
  return next;
}

/**
 * Uma assinatura de ticks pode cair em silêncio (o subscribe do hook engole erros),
 * e o padrão A->B daquele mercado congela no último estado armado. Depois desta
 * janela sem ticks o feed deixa de ser tratado como sincronizado.
 */
const FEED_STALE_MS = 60_000;

function wilsonLB(succ: number, total: number): number {
  if (total <= 0) return 0;
  const z = 1.96, p = succ / total, n = total;
  const denom = 1 + (z * z) / n;
  const center = p + (z * z) / (2 * n);
  const margin = z * Math.sqrt((p * (1 - p) + (z * z) / (4 * n)) / n);
  return Math.max(0, (center - margin) / denom);
}

function getBestPattern(digits: number[]) {
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
      c.wlSum += wl * w; c.condSum += cond * w; c.liftSum += lift * w;
      c.wsum += w; c.wins++;
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
      if (digits[i] === a) { aTot++; if (digits[i + 1] === b) ab++; }
    }
    return aTot >= 4 ? { p: ab / aTot, n: aTot } : { p: 0, n: aTot };
  };

  let best: any = null;
  Object.values(cand).forEach((c: any) => {
    const wl = c.wlSum / c.wsum;
    const cond = c.condSum / c.wsum;
    const lift = c.liftSum / c.wsum;
    const tri = trigramBoost(c.a, c.b);
    const mk = markovProb(c.a, c.b);
    const mkBoost = 1 + 0.35 * Math.min(mk.p / 0.12, 1.5) * Math.min(mk.n / 12, 1);
    const multi = 1 + 0.20 * (c.wins - 1);
    const final = wl * (0.6 + 0.4 * Math.min(lift / 2, 1)) * (1 + 0.3 * tri) * mkBoost * multi * (1 + 0.05 * c.occMax);
    const cobj = { a: c.a, b: c.b, occ: c.occMax, force: cond, wilson: wl, lift: +lift.toFixed(2), tri: +tri.toFixed(2), markov: +mk.p.toFixed(2), final };
    if (!best || final > best.final) best = cobj;
  });
  return best;
}

// ── Engine Principal ──
export class BearBotEngine {
  private config: BotConfig;
  private state: BotState;
  private tickData: Record<string, TickData> = {};
  /** Monotonic tick counter per symbol; drives the intelligence recompute throttle. */
  private tickCount: Record<string, number> = {};
  private lastTickAt: Record<string, number> = {};
  private patState: Record<string, PatternState> = {};
  private vlMState: Record<string, VLMarketState> = {};
  private props: Record<string, ProposalState> = {};
  private multiCand: Record<string, MultiCandidate> = {};
  private comboPending: ComboPending | null = null;
  private ticksSinceReset: Record<string, number> = {};
  private autoDigitTarget: Record<string, number | null> = {};
  private autoDigitActive: Record<string, number | null> = {};
  private vlLossHistory: Record<string, number[]> = {};
  /** Dígito previsto (dinâmico) que sofreu a última perda virtual sob foco, por mercado. */
  private vlLossDigit: Record<string, number | null> = {};
  /** Dígito congelado no gatilho: barreira obrigatória até a liquidação/abort. */
  private lockedDigit: number | null = null;
  /** Score de Oportunidade avaliado pelo gate da IA na última decisão, por mercado. */
  private gateScore: Record<string, number> = {};
  /** Score de Oportunidade no gatilho, antes do reset do VL zerar o pilar. */
  private pendingEntryScore: number | null = null;
  /** Score do gatilho congelado com o trade em aberto, gravado no resultado. */
  private tradeEntryScore: number | null = null;
  private settled: Record<string, boolean> = {};
  private lastManualSwitch = 0;
  private listeners: Set<(state: BotState) => void> = new Set();
  private logListeners: Set<(log: { ts: string; msg: string; type: string }) => void> = new Set();
  private autoTradeListeners: Set<(kind: string) => void> = new Set();

  constructor(config: Partial<BotConfig> = {}) {
    this.config = { ...this.getDefaultConfig(), ...clampRateLimits(config) };
    this.normalizeVlWindow();
    this.lastManualSwitch = 0;
    this.state = {
      ...DEFAULT_BOT_STATE,
      curStake: this.config.stake,
      recovery: { active: false, attemptsLeft: 0, cooldownUntil: 0, nextTradeAfter: 0 },
    };
    this.initMarkets();
  }

  private getDefaultConfig(): BotConfig {
    return {
      activeSym: 'R_100', mode: 'over', exec: 'manual', digit: 2,
      autoOn: false, paperMode: false, vlOn: false, vlMode: 'consec',
      vlQty: 2, vlWindow: 14, vlFocusOnly: false, stake: 0.35, gale: 2.1, stopLoss: 20,
      stopWin: 20, galeMode: 'mult', galeParcels: 2, multiOn: false,
      patReps: 3, patMinForce: 30, patTrigger: false, patMode: 'accum',
      comboUnder: 4, comboOver: 5,
      differAutoDigit: false,
      differDynamicDigit: false,
      postLossOn: false, postLossMode: 'recover', recoverMaxAttempts: 3,
      recoverDelay: 1500, cooldownSec: 5, maxTradesHour: 50,
      tradeCooldownMs: 2000, aiMode: 'balanced',
      aiWeights: { ...AI_MODE_WEIGHTS.balanced }, aiMinScore: AI_MIN_SCORE_DEFAULT,
      aiScoreAtLeast: false, soundOn: true,
    };
  }

  private initMarkets() {
    MARKETS.forEach(m => {
      this.tickData[m.sym] = { digits: [], price: null };
      this.patState[m.sym] = { a: null, b: null, count: 0, reps: 0, seqCount: 0, armed: false, waiting: false, force: 0, wilson: 0, lift: 0, tri: 0, stable: 0, _final: 0 };
      this.vlMState[m.sym] = { count: 0, seen: 0 };
      this.ticksSinceReset[m.sym] = 0;
      this.autoDigitTarget[m.sym] = null;
      this.autoDigitActive[m.sym] = null;
      this.vlLossHistory[m.sym] = [];
      this.vlLossDigit[m.sym] = null;
    });
  }

  // ── Getters ──
  getConfig(): BotConfig { return { ...this.config }; }
  getState(): BotState {
    const vlBySym: Record<string, VLMarketState> = {};
    const autoDigitBySym: Record<string, number | null> = {};
    MARKETS.forEach(m => {
      const st = this.vlMState[m.sym] || { count: 0, seen: 0 };
      vlBySym[m.sym] = { count: st.count, seen: st.seen };
      autoDigitBySym[m.sym] = this.autoDigitActive[m.sym] ?? null;
    });
    return {
      ...this.state,
      tickData: { ...this.tickData },
      vlBySym,
      autoDigitBySym,
    };
  }

  /**
   * No modo Acumulado a contagem só olha os últimos vlWindow ticks, então um
   * vlQty maior que a janela é inalcançável e o gate nunca abre. vlQty é o
   * limiar escolhido pelo usuário: a janela é alargada até ele.
   */
  private normalizeVlWindow() {
    if (this.config.vlMode !== 'accum') return;
    if (this.config.vlWindow < this.config.vlQty) {
      this.config.vlWindow = this.config.vlQty;
    }
  }

  // ── Config Updates ──
  updateConfig(updates: Partial<BotConfig>) {
    const oldMulti = this.config.multiOn;
    const oldPaperMode = this.config.paperMode;
    const oldActiveSym = this.config.activeSym;
    this.config = { ...this.config, ...clampRateLimits(updates) };
    this.normalizeVlWindow();
    // When activeSym is changed manually, set lastManualSwitch to prevent immediate override
    if (updates.activeSym !== undefined) {
      this.lastManualSwitch = Date.now();
      this.multiCand = {};
      // Contagem sob Foco: reset VL when user manually switches activeSym
      if (this.config.vlFocusOnly && this.config.vlOn && this.config.multiOn && updates.activeSym !== oldActiveSym) {
        this.vlResetM(oldActiveSym);
        this.vlResetM(this.config.activeSym);
        this.addLog(`🎯 Contagem sob Foco · Reset VL para ${this.config.activeSym}`, 'info');
      }
    }
    // When vlFocusOnly is toggled ON, reset all non-active symbols
    if (updates.vlFocusOnly === true && this.config.vlOn && this.config.multiOn) {
      MARKETS.forEach(m => {
        if (m.sym !== this.config.activeSym) {
          this.vlResetM(m.sym);
        }
      });
    }
    if (oldMulti && !this.config.multiOn) this.vlReset();
    if (updates.paperMode !== undefined && updates.paperMode !== oldPaperMode) {
      this.config.autoOn = false;
      this.state.galeLevel = 0;
      this.state.curStake = this.config.stake;
      this.state.lossAcum = 0;
      this.state.parcelsLeft = 0;
      this.state.tradeLock = false;
      this.comboPending = null;
      this.clearRecovery();
      this.clearDigitLock();
      this.vlReset();
      this.vlResetAllM();
      this.addLog(updates.paperMode ? '📄 Modo Paper Trading ativado · progresso resetado' : '💼 Modo Conta Real/Demo ativado · progresso resetado', 'info');
    }
    if (updates.stake !== undefined && this.state.galeLevel === 0) {
      this.state.curStake = updates.stake;
    }
    if (
      updates.aiMode !== undefined ||
      updates.aiWeights !== undefined ||
      updates.mode !== undefined ||
      updates.comboUnder !== undefined ||
      updates.comboOver !== undefined ||
      updates.patTrigger !== undefined ||
      updates.digit !== undefined ||
      updates.differDynamicDigit !== undefined ||
      updates.vlOn !== undefined ||
      updates.vlQty !== undefined ||
      updates.vlMode !== undefined ||
      updates.vlWindow !== undefined
    ) {
      this.updateAllIntelligence();
    }
    if (this.config.mode === 'differ' && this.config.differDynamicDigit && !this.state.tradeLock
      && this.lockedDigit === null) {
      this.config.digit = this.computeDynamicDifferDigit(this.config.activeSym).digit;
    }
    if (updates.postLossOn === false && this.state.recovery.active) {
      this.clearRecovery();
    }
    this.notify();
  }

  // ── Observer ──
  subscribe(callback: (state: BotState) => void): () => void {
    this.listeners.add(callback);
    callback(this.getState());
    return () => this.listeners.delete(callback);
  }

  onLog(callback: (log: { ts: string; msg: string; type: string }) => void): () => void {
    this.logListeners.add(callback);
    return () => this.logListeners.delete(callback);
  }

  onAutoTrade(callback: (kind: string) => void): () => void {
    this.autoTradeListeners.add(callback);
    return () => this.autoTradeListeners.delete(callback);
  }

  private triggerAutoTrade() {
    this.pendingEntryScore = this.gateScore[this.config.activeSym] ?? null;
    this.autoTradeListeners.forEach(cb => cb(this.config.mode));
  }

  private notify() {
    const s = this.getState();
    this.listeners.forEach(cb => cb(s));
  }

  public addLog(msg: string, type: string = '') {
    const ts = new Date().toLocaleTimeString('pt-BR', { hour12: false });
    const log = { ts, msg, type };
    this.state.logLines = [log, ...this.state.logLines].slice(0, 120);
    this.logListeners.forEach(cb => cb(log));
    this.notify();
  }

  // ── Tick Processing ──
  processTick(sym: string, price: number, lastDigit: number) {
    const tdc = this.tickData;
    if (!tdc[sym]) return;
    const currentDigits = [...tdc[sym].digits, lastDigit];
    if (currentDigits.length > 120) currentDigits.shift();
    tdc[sym] = { digits: currentDigits, price };
    this.state.tickData = { ...tdc };

    // Pattern A→B is market intelligence, not just a differ-mode trade trigger.
    this.updatePattern(sym);

    // Throttle on a monotonic counter, not on buffer length: the buffer saturates
    // at 120 entries, which would make a length-based modulo fire on every tick.
    this.lastTickAt[sym] = Date.now();
    this.tickCount[sym] = (this.tickCount[sym] || 0) + 1;
    if (this.tickCount[sym] % 3 === 0) {
      this.updateAllIntelligence();
    }

    this.onNewTick(sym, lastDigit);
    this.notify();
  }

  // ── Padrões ──
  private updatePattern(sym: string) {
    const arr = this.tickData[sym]?.digits || [];
    const ps = this.patState[sym];
    if (!ps) return;
    const best = getBestPattern(arr);
    if (!best) {
      ps.a = null; ps.b = null; ps.count = 0; ps.seqCount = 0;
      ps.armed = false; ps.waiting = false; ps.force = 0;
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
      if (changed) { ps.a = best.a; ps.b = best.b; ps.seqCount = 0; ps.waiting = false; ps.stable = 0; }
      ps._final = best.final; ps.force = best.force; ps.wilson = best.wilson;
      ps.lift = best.lift; ps.tri = best.tri;
      if (changed) {
        ps.stable = 1;
      } else {
        ps.stable = (ps.stable || 0) + 1;
      }
    } else {
      ps.stable = (ps.stable || 0) + 1;
    }

    const minForce = this.config.patMinForce / 100;
    const forceOk = (ps.force || 0) >= minForce;
    const wilsonOk = (ps.wilson || 0) >= Math.max(0.15, minForce * 0.7);
    const liftOk = (ps.lift || 0) >= 1.15;
    const stableOk = (ps.stable || 0) >= 2;
    const qualityOk = forceOk && wilsonOk && liftOk && stableOk;

    if (this.config.patMode === 'accum') {
      const sl = arr.slice(-50);
      let occ = 0;
      for (let i = 0; i < sl.length - 1; i++) {
        if (sl[i] === ps.a && sl[i + 1] === ps.b) occ++;
      }
      ps.count = occ;
      ps.armed = occ >= this.config.patReps && qualityOk;
    } else {
      if (arr.length >= 2) {
        const a = arr[arr.length - 2], b = arr[arr.length - 1];
        if (a === ps.a && b === ps.b) ps.seqCount++;
        else if (a === ps.a && b !== ps.b) ps.seqCount = 0;
      }
      ps.count = ps.seqCount;
      ps.armed = ps.seqCount >= this.config.patReps && qualityOk;
    }
  }

  // ── Virtual Loss ──
  private vlM(sym: string): VLMarketState {
    if (!this.vlMState[sym]) this.vlMState[sym] = { count: 0, seen: 0 };
    return this.vlMState[sym];
  }

  private vlOnDigitM(sym: string, dig: number, forDigit?: number | null) {
    if (!this.config.vlOn) return;
    if (this.config.vlFocusOnly && sym !== this.config.activeSym) return;
    this.ticksSinceReset[sym] = (this.ticksSinceReset[sym] || 0) + 1;
    const st = this.vlM(sym);

    if (this.config.mode === 'differ' && this.config.differAutoDigit) {
      const countSinceReset = this.ticksSinceReset[sym] || 0;
      const digits = this.tickData[sym]?.digits || [];
      if (this.config.vlMode === 'consec') {
        st.seen = 0;
        if (countSinceReset >= this.config.vlQty) {
          const tail = digits.slice(-this.config.vlQty);
          if (tail.length === this.config.vlQty && tail.every(d => d === tail[0])) {
            st.count = this.config.vlQty;
            this.autoDigitTarget[sym] = tail[0];
            this.autoDigitActive[sym] = tail[0];
            if (sym === this.config.activeSym) this.config.digit = tail[0];
            return;
          }
        }
        let streak = 0;
        for (let i = digits.length - 1; i >= 0 && (digits.length - 1 - i) < countSinceReset; i--) {
          if (digits[i] === dig) streak++;
          else break;
        }
        st.count = streak;
        this.autoDigitTarget[sym] = null;
        this.autoDigitActive[sym] = streak > 0 ? dig : null;
        if (sym === this.config.activeSym && streak > 0) {
          this.config.digit = dig;
        }
      } else {
        const windowSize = Math.min(countSinceReset, this.config.vlWindow);
        const slice = windowSize > 0 ? digits.slice(-windowSize) : [];
        const freqs: Record<number, number> = {};
        slice.forEach(d => { freqs[d] = (freqs[d] || 0) + 1; });
        st.seen = slice.length;

        let maxDigit: number | null = null;
        let maxCount = 0;
        for (let i = slice.length - 1; i >= 0; i--) {
          const d = slice[i];
          const cnt = freqs[d] || 0;
          if (cnt > maxCount) {
            maxCount = cnt;
            maxDigit = d;
          }
        }

        if (maxCount >= this.config.vlQty && maxDigit !== null) {
          st.count = maxCount;
          this.autoDigitTarget[sym] = maxDigit;
          this.autoDigitActive[sym] = maxDigit;
          if (sym === this.config.activeSym) this.config.digit = maxDigit;
        } else {
          st.count = maxCount;
          this.autoDigitTarget[sym] = null;
          this.autoDigitActive[sym] = maxCount > 0 ? maxDigit : null;
          if (sym === this.config.activeSym && maxDigit !== null && maxCount > 0) {
            this.config.digit = maxDigit;
          }
        }
      }
      return;
    }

    if (this.config.mode === 'differ' && this.config.differDynamicDigit) {
      const allDigits = this.tickData[sym]?.digits || [];
      const prevDigits = allDigits.length > 1 ? allDigits.slice(0, -1) : [];
      const dynDigit = this.computeDynamicDifferDigit(sym, prevDigits).digit;
      const isLoser = dig === dynDigit;
      if (!this.vlLossHistory[sym]) this.vlLossHistory[sym] = [];
      this.vlLossHistory[sym].push(isLoser ? 1 : 0);
      if (this.vlLossHistory[sym].length > 200) this.vlLossHistory[sym].shift();

      if (this.config.vlMode === 'consec') {
        // Perdas consecutivas só somam contra o MESMO dígito previsto.
        if (isLoser) {
          if (this.vlLossDigit[sym] === dynDigit) st.count++;
          else { st.count = 1; this.vlLossDigit[sym] = dynDigit; }
        } else {
          st.count = 0;
          this.vlLossDigit[sym] = null;
        }
        st.seen = 0;
      } else {
        const countSinceReset = this.ticksSinceReset[sym] || 0;
        const windowSize = Math.min(countSinceReset, this.config.vlWindow);
        const hist = this.vlLossHistory[sym];
        const slice = windowSize > 0 ? hist.slice(-windowSize) : [];
        let count = 0;
        slice.forEach(x => { if (x === 1) count++; });
        st.count = count;
        st.seen = slice.length;
        if (isLoser) this.vlLossDigit[sym] = dynDigit;
        if (count === 0) this.vlLossDigit[sym] = null;
      }
      return;
    }

    const lose = buildLoserSet(this.config.mode, this.config.digit, this.config.comboUnder, this.config.comboOver);
    const isLoser = forDigit !== null && forDigit !== undefined ? dig === forDigit : lose.has(dig);
    if (this.config.vlMode === 'consec') {
      if (isLoser) st.count++; else st.count = 0;
      st.seen = 0;
    } else {
      const countSinceReset = this.ticksSinceReset[sym] || 0;
      const windowSize = Math.min(countSinceReset, this.config.vlWindow);
      const digits = this.tickData[sym]?.digits || [];
      const slice = windowSize > 0 ? digits.slice(-windowSize) : [];
      let count = 0;
      slice.forEach(d => {
        const dIsLoser = forDigit !== null && forDigit !== undefined ? d === forDigit : lose.has(d);
        if (dIsLoser) count++;
      });
      st.count = count; st.seen = slice.length;
    }
  }

  private vlOnDigit(dig: number, forDigit?: number | null) {
    if (!this.config.vlOn) return;
    const sym = this.config.activeSym;
    this.ticksSinceReset[sym] = (this.ticksSinceReset[sym] || 0) + 1;

    if (this.config.mode === 'differ' && this.config.differAutoDigit) {
      const countSinceReset = this.ticksSinceReset[sym] || 0;
      const digits = this.tickData[sym]?.digits || [];
      if (this.config.vlMode === 'consec') {
        this.state.vlSeen = 0;
        if (countSinceReset >= this.config.vlQty) {
          const tail = digits.slice(-this.config.vlQty);
          if (tail.length === this.config.vlQty && tail.every(d => d === tail[0])) {
            this.state.vlCount = this.config.vlQty;
            const st = this.vlM(sym); st.count = this.state.vlCount; st.seen = 0;
            this.autoDigitTarget[sym] = tail[0];
            this.autoDigitActive[sym] = tail[0];
            this.config.digit = tail[0];
            return;
          }
        }
        let streak = 0;
        for (let i = digits.length - 1; i >= 0 && (digits.length - 1 - i) < countSinceReset; i--) {
          if (digits[i] === dig) streak++;
          else break;
        }
        this.state.vlCount = streak;
        const st = this.vlM(sym); st.count = streak; st.seen = 0;
        this.autoDigitTarget[sym] = null;
        this.autoDigitActive[sym] = streak > 0 ? dig : null;
        if (streak > 0) this.config.digit = dig;
      } else {
        const windowSize = Math.min(countSinceReset, this.config.vlWindow);
        const slice = windowSize > 0 ? digits.slice(-windowSize) : [];
        const freqs: Record<number, number> = {};
        slice.forEach(d => { freqs[d] = (freqs[d] || 0) + 1; });
        this.state.vlSeen = slice.length;

        let maxDigit: number | null = null;
        let maxCount = 0;
        for (let i = slice.length - 1; i >= 0; i--) {
          const d = slice[i];
          const cnt = freqs[d] || 0;
          if (cnt > maxCount) {
            maxCount = cnt;
            maxDigit = d;
          }
        }

        if (maxCount >= this.config.vlQty && maxDigit !== null) {
          this.state.vlCount = maxCount;
          this.autoDigitTarget[sym] = maxDigit;
          this.autoDigitActive[sym] = maxDigit;
          this.config.digit = maxDigit;
        } else {
          this.state.vlCount = maxCount;
          this.autoDigitTarget[sym] = null;
          this.autoDigitActive[sym] = maxCount > 0 ? maxDigit : null;
          if (maxDigit !== null && maxCount > 0) {
            this.config.digit = maxDigit;
          }
        }
        const st = this.vlM(sym); st.count = this.state.vlCount; st.seen = this.state.vlSeen;
      }
      return;
    }

    if (this.config.mode === 'differ' && this.config.differDynamicDigit) {
      const allDigits = this.tickData[sym]?.digits || [];
      const prevDigits = allDigits.length > 1 ? allDigits.slice(0, -1) : [];
      const dynDigit = this.computeDynamicDifferDigit(sym, prevDigits).digit;
      const isLoser = dig === dynDigit;
      if (!this.vlLossHistory[sym]) this.vlLossHistory[sym] = [];
      this.vlLossHistory[sym].push(isLoser ? 1 : 0);
      if (this.vlLossHistory[sym].length > 200) this.vlLossHistory[sym].shift();

      if (this.config.vlMode === 'consec') {
        // Perdas consecutivas só somam contra o MESMO dígito previsto.
        if (isLoser) {
          if (this.vlLossDigit[sym] === dynDigit) this.state.vlCount++;
          else { this.state.vlCount = 1; this.vlLossDigit[sym] = dynDigit; }
        } else {
          this.state.vlCount = 0;
          this.vlLossDigit[sym] = null;
        }
        this.state.vlSeen = 0;
      } else {
        const countSinceReset = this.ticksSinceReset[sym] || 0;
        const windowSize = Math.min(countSinceReset, this.config.vlWindow);
        const hist = this.vlLossHistory[sym];
        const slice = windowSize > 0 ? hist.slice(-windowSize) : [];
        let count = 0;
        slice.forEach(x => { if (x === 1) count++; });
        this.state.vlCount = count;
        this.state.vlSeen = slice.length;
        if (isLoser) this.vlLossDigit[sym] = dynDigit;
        if (count === 0) this.vlLossDigit[sym] = null;
      }
      const st = this.vlM(sym); st.count = this.state.vlCount; st.seen = this.state.vlSeen;
      return;
    }

    const lose = buildLoserSet(this.config.mode, this.config.digit, this.config.comboUnder, this.config.comboOver);
    const isLoser = forDigit !== null && forDigit !== undefined ? dig === forDigit : lose.has(dig);
    if (this.config.vlMode === 'consec') {
      if (isLoser) this.state.vlCount++; else this.state.vlCount = 0;
      this.state.vlSeen = 0;
    } else {
      const countSinceReset = this.ticksSinceReset[sym] || 0;
      const windowSize = Math.min(countSinceReset, this.config.vlWindow);
      const digits = this.tickData[sym]?.digits || [];
      const slice = windowSize > 0 ? digits.slice(-windowSize) : [];
      let count = 0;
      slice.forEach(d => {
        const dIsLoser = forDigit !== null && forDigit !== undefined ? d === forDigit : lose.has(d);
        if (dIsLoser) count++;
      });
      this.state.vlCount = count;
      this.state.vlSeen = slice.length;
    }
    const st = this.vlM(sym); st.count = this.state.vlCount; st.seen = this.state.vlSeen;
  }

  private vlGateOpen(): boolean {
    if (!this.config.vlOn) return true;
    if (this.config.mode === 'differ' && this.config.differAutoDigit) {
      const sym = this.config.activeSym;
      return this.autoDigitTarget[sym] !== null && this.autoDigitTarget[sym] !== undefined;
    }
    if (this.config.mode === 'differ' && this.config.differDynamicDigit) {
      return this.vlDynGateOpen(this.config.activeSym, this.state.vlCount);
    }
    return this.state.vlCount >= this.config.vlQty;
  }

  private vlGateOpenM(sym: string): boolean {
    if (!this.config.vlOn) return true;
    if (this.config.mode === 'differ' && this.config.differAutoDigit) {
      return this.autoDigitTarget[sym] !== null && this.autoDigitTarget[sym] !== undefined;
    }
    if (this.config.mode === 'differ' && this.config.differDynamicDigit) {
      return this.vlDynGateOpen(sym, this.vlM(sym).count);
    }
    return this.vlM(sym).count >= this.config.vlQty;
  }

  /**
   * Gate do Dígito Dinâmico: exige (1) perdas suficientes, (2) contagem realmente
   * observada sob foco (ticksSinceReset) e (3) um dígito perdedor identificado —
   * que será a barreira obrigatória da compra.
   */
  private vlDynGateOpen(sym: string, count: number): boolean {
    if (count < this.config.vlQty) return false;
    if ((this.ticksSinceReset[sym] || 0) < this.config.vlQty) return false;
    const lossDigit = this.vlLossDigit[sym];
    return lossDigit !== null && lossDigit !== undefined;
  }

  /** Dígito que sofreu a última perda virtual sob foco (barreira exigida na compra). */
  getVlLossDigit(sym?: string): number | null {
    return this.vlLossDigit[sym ?? this.config.activeSym] ?? null;
  }

  /** Congela a barreira do Dígito Dinâmico no dígito que perdeu virtualmente. */
  private lockDynamicDigit(sym: string): boolean {
    const lossDigit = this.vlLossDigit[sym];
    if (lossDigit === null || lossDigit === undefined) return false;
    this.config.digit = lossDigit;
    this.lockedDigit = lossDigit;
    return true;
  }

  private clearDigitLock() {
    this.lockedDigit = null;
  }

  private vlReset() {
    this.state.vlCount = 0; this.state.vlSeen = 0;
    const sym = this.config.activeSym;
    this.ticksSinceReset[sym] = 0;
    this.autoDigitTarget[sym] = null;
    this.autoDigitActive[sym] = null;
    this.vlLossHistory[sym] = [];
    this.vlLossDigit[sym] = null;
    const st = this.vlM(sym); st.count = 0; st.seen = 0;
  }

  private vlResetM(sym: string) {
    const st = this.vlM(sym); st.count = 0; st.seen = 0;
    this.ticksSinceReset[sym] = 0;
    this.autoDigitTarget[sym] = null;
    this.autoDigitActive[sym] = null;
    this.vlLossHistory[sym] = [];
    this.vlLossDigit[sym] = null;
    if (sym === this.config.activeSym) {
      this.state.vlCount = 0;
      this.state.vlSeen = 0;
    }
  }

  private vlResetAllM() {
    this.vlMState = {};
    this.multiCand = {};
    this.ticksSinceReset = {};
    this.autoDigitTarget = {};
    this.autoDigitActive = {};
    this.vlLossHistory = {};
    this.vlLossDigit = {};
    this.state.vlCount = 0;
    this.state.vlSeen = 0;
    MARKETS.forEach(m => {
      this.ticksSinceReset[m.sym] = 0;
      this.autoDigitTarget[m.sym] = null;
      this.autoDigitActive[m.sym] = null;
      this.vlLossHistory[m.sym] = [];
      this.vlLossDigit[m.sym] = null;
      if (this.patState[m.sym]) {
        this.patState[m.sym].count = 0;
        this.patState[m.sym].seqCount = 0;
        this.patState[m.sym].armed = false;
        this.patState[m.sym].waiting = false;
      }
    });
  }

  /** Um feed é considerado vivo enquanto tiver entregue algum tick recente. */
  private isFeedFresh(sym: string): boolean {
    const last = this.lastTickAt[sym];
    if (last === undefined) return false;
    return Date.now() - last <= FEED_STALE_MS;
  }

  // ── Inteligência Cross-Market ──
  private computeMarketIntelligence(sym: string): MarketIntelligence {
    const arr = this.tickData[sym]?.digits || [];
    const ps = this.patState[sym];
    const vlSt = this.vlM(sym);
    const targetDigit = (this.config.mode === 'differ' && this.config.differDynamicDigit)
      ? this.computeDynamicDifferDigit(sym).digit
      : this.config.digit;
    const lose = buildLoserSet(this.config.mode, targetDigit, this.config.comboUnder, this.config.comboOver);

    // Neutral until there is enough history: an unmeasured pillar must never score
    // as a perfect one, or a market with no data reads as a buy opportunity.
    const dataReady = arr.length >= 50;
    let pressure = 50;
    if (dataReady) {
      const expFrac = lose.size / 10;
      let exSum = 0;
      [10, 25, 50].forEach(n => {
        const s2 = arr.slice(-n);
        let c = 0;
        s2.forEach(x => { if (lose.has(x)) c++; });
        const frac = c / s2.length;
        exSum += (frac - expFrac) / Math.max(expFrac, 0.05);
      });
      const exMean = exSum / 3;
      pressure = Math.max(0, Math.min(100, Math.round(exMean * 100)));
    }

    let patternStrength = 0;
    if (ps && ps.a !== null && ps.b !== null && ps.armed) {
      patternStrength = 40;
      if ((ps.force || 0) >= 0.5) patternStrength += 20;
      if ((ps.wilson || 0) >= 0.3) patternStrength += 15;
      if ((ps.lift || 0) >= 1.5) patternStrength += 15;
      if ((ps.stable || 0) >= 3) patternStrength += 10;
      patternStrength = Math.min(100, patternStrength);
    }

    let vlProgress = 0;
    if (this.config.vlOn) {
      if (this.config.vlFocusOnly && sym !== this.config.activeSym) {
        // Unfocused markets accumulate no VL, so their VL pillar is unknown, not
        // satisfied. Scoring it 100 let every unfocused market outrank the focused one.
        vlProgress = 50;
      } else {
        // Both modes measure against vlQty, which is exactly what vlGateOpen
        // compares the counter to. Scaling the accumulated mode by the window
        // instead let a vlQty > vlWindow setup show a full bar on a gate that
        // can never open, since the counter is capped by the window size.
        const target = Math.max(1, this.config.vlQty);
        const current = vlSt.count;
        vlProgress = Math.min(100, Math.round((current / target) * 100));
      }
    } else {
      vlProgress = 100;
    }

    let syncScore = 0;
    if (ps && ps.a !== null && ps.b !== null) {
      let syncCount = 0;
      let totalMarkets = 0;
      MARKETS.forEach(m => {
        if (m.sym === sym) return;
        const otherPs = this.patState[m.sym];
        // A market only advances its pattern on its own ticks, so a dead feed
        // freezes an armed A->B forever. Frozen agreement is not live agreement:
        // it still counts as a comparable market, just never as a synchronised one.
        const fresh = this.isFeedFresh(m.sym);
        if (fresh && otherPs && otherPs.a === ps.a && otherPs.b === ps.b && otherPs.armed) syncCount++;
        totalMarkets++;
      });
      syncScore = totalMarkets > 0 ? Math.min(100, Math.round((syncCount / totalMarkets) * 100)) : 0;
    }

    const { pressure: wPressure, pattern: wPattern, vl: wVL, sync: wSync } =
      resolveAIWeights(this.config.aiMode, this.config.aiWeights);

    const pressureScore = 100 - pressure;
    const opportunityScore = Math.round(
      pressureScore * wPressure + patternStrength * wPattern + vlProgress * wVL + syncScore * wSync
    );

    let recommendation: MarketIntelligence['recommendation'] = 'neutral';
    if (opportunityScore >= 80) recommendation = 'strong_buy';
    else if (opportunityScore >= 60) recommendation = 'buy';
    else if (opportunityScore >= 40) recommendation = 'neutral';
    else if (opportunityScore >= 20) recommendation = 'avoid';
    else recommendation = 'strong_avoid';

    return { sym, pressure, patternStrength, vlProgress, syncScore, opportunityScore, recommendation, dataReady, lastUpdate: Date.now() };
  }

  private updateAllIntelligence() {
    const newIntel: Record<string, MarketIntelligence> = {};
    MARKETS.forEach(m => {
      newIntel[m.sym] = this.computeMarketIntelligence(m.sym);
    });
    this.state.marketIntel = newIntel;
  }

  // ── Estatísticas ──
  computeDynamicDifferDigit(sym: string, customDigits?: number[]): DynamicDigitResult {
    const digits = customDigits !== undefined ? customDigits : (this.tickData[sym]?.digits || []);
    const defaultDigit = this.config.digit;
    const scores: Record<number, number> = {};
    const breakdown: Record<number, DynamicDigitDetail> = {};

    if (digits.length < 5) {
      for (let i = 0; i <= 9; i++) {
        scores[i] = 50;
        breakdown[i] = { fScore: 50, mScore: 50, tScore: 50, aScore: 50, composite: 50, rawCount50: 0 };
      }
      return { digit: defaultDigit, score: 50, scores, breakdown };
    }

    const lastDigit = digits[digits.length - 1];
    const prevDigit = digits.length >= 2 ? digits[digits.length - 2] : null;

    const w10 = digits.slice(-10);
    const w25 = digits.slice(-25);
    const w50 = digits.slice(-50);

    // Markov occurrences of lastDigit
    let lastOccurrences = 0;
    const markovNext: Record<number, number> = {};
    for (let i = 0; i < digits.length - 1; i++) {
      if (digits[i] === lastDigit) {
        lastOccurrences++;
        const nxt = digits[i + 1];
        markovNext[nxt] = (markovNext[nxt] || 0) + 1;
      }
    }

    // Trigram occurrences of (prevDigit, lastDigit)
    let pairOccurrences = 0;
    const triNext: Record<number, number> = {};
    if (prevDigit !== null && digits.length >= 3) {
      const sl50 = digits.slice(-50);
      for (let i = 0; i < sl50.length - 2; i++) {
        if (sl50[i] === prevDigit && sl50[i + 1] === lastDigit) {
          pairOccurrences++;
          const nxt = sl50[i + 2];
          triNext[nxt] = (triNext[nxt] || 0) + 1;
        }
      }
    }

    // Anomaly count in last 25 ticks
    const count25: Record<number, number> = {};
    w25.forEach(d => { count25[d] = (count25[d] || 0) + 1; });

    // Raw counts in last 50 ticks for tie-breaking
    const count50: Record<number, number> = {};
    w50.forEach(d => { count50[d] = (count50[d] || 0) + 1; });

    let bestDigit = defaultDigit;
    let bestScore = -1;
    let bestRawCount50 = Infinity;

    for (let d = 0; d <= 9; d++) {
      // 1. Multi-window frequency (40%)
      const f10 = w10.length > 0 ? (w10.filter(x => x === d).length / w10.length) : 0.10;
      const f25 = w25.length > 0 ? (w25.filter(x => x === d).length / w25.length) : 0.10;
      const f50 = w50.length > 0 ? (w50.filter(x => x === d).length / w50.length) : 0.10;
      const weightedFreq = (0.5 * f10) + (0.3 * f25) + (0.2 * f50);
      const fScore = Math.max(0, Math.min(100, Math.round(100 * (1 - weightedFreq / 0.30))));

      // 2. Markov Inverse (30%)
      const markovP = lastOccurrences >= 2 ? ((markovNext[d] || 0) / lastOccurrences) : 0.10;
      const mScore = Math.max(0, Math.min(100, Math.round(100 * (1 - markovP / 0.30))));

      // 3. Trigram Inverse (15%)
      const triP = pairOccurrences >= 2 ? ((triNext[d] || 0) / pairOccurrences) : 0.10;
      const tScore = Math.max(0, Math.min(100, Math.round(100 * (1 - triP / 0.40))));

      // 4. Anomaly resistance (15%)
      const obsFrac = w25.length > 0 ? ((count25[d] || 0) / w25.length) : 0.10;
      const excess = (obsFrac - 0.10) / 0.10;
      const aScore = Math.max(0, Math.min(100, Math.round(50 - excess * 50)));

      // Composite calculation
      const compositeScore = Math.round(fScore * 0.40 + mScore * 0.30 + tScore * 0.15 + aScore * 0.15);
      scores[d] = compositeScore;

      const raw50 = count50[d] || 0;
      breakdown[d] = { fScore, mScore, tScore, aScore, composite: compositeScore, rawCount50: raw50 };

      if (
        compositeScore > bestScore ||
        (compositeScore === bestScore && raw50 < bestRawCount50) ||
        (compositeScore === bestScore && raw50 === bestRawCount50 && d < bestDigit)
      ) {
        bestScore = compositeScore;
        bestDigit = d;
        bestRawCount50 = raw50;
      }
    }

    return { digit: bestDigit, score: bestScore, scores, breakdown };
  }

  chiSquare(sym: string) {
    const arr = this.tickData[sym]?.digits.slice(-50) || [];
    if (arr.length < 30) return null;
    const n = arr.length, exp = n / 10;
    const c = new Array(10).fill(0);
    arr.forEach(d => c[d]++);
    let chi = 0;
    for (let d = 0; d < 10; d++) { const diff = c[d] - exp; chi += (diff * diff) / exp; }
    let level = 'normal';
    if (chi >= 21.7) level = 'alto';
    else if (chi >= 16.9) level = 'medio';
    return { chi: +chi.toFixed(1), level };
  }

  marketAnomaly(sym: string) {
    const arr = this.tickData[sym]?.digits.slice(-25) || [];
    if (arr.length < 12) return null;
    const lose = buildLoserSet(this.config.mode, this.config.digit, this.config.comboUnder, this.config.comboOver);
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
      if (c[d] > topC) { topC = c[d]; topD = d; }
    });
    if (excess >= 1.0) return { level: 'evite', excess, topD, topC };
    if (excess >= 0.5) return { level: 'atencao', excess, topD, topC };
    return null;
  }

  getObservedRate(sym: string): number {
    const arr = this.tickData[sym]?.digits.slice(-50) || [];
    if (arr.length < 10) return 0;
    let w = 0;
    arr.forEach(x => { if (isWinCheck(x, this.config.mode, this.config.digit, this.config.comboUnder, this.config.comboOver)) w++; });
    return Math.round((w / arr.length) * 100);
  }

  getTheoreticalRate(): number {
    const { mode, digit, comboUnder = 4, comboOver = 5 } = this.config;
    if (mode === 'over') return ((9 - digit) / 10) * 100;
    if (mode === 'under') return (digit / 10) * 100;
    if (mode === 'combo') {
      const minD = Math.min(comboUnder, comboOver);
      const maxD = Math.max(comboUnder, comboOver);
      const winCount = minD + (9 - maxD);
      return Math.max(0, Math.min(100, winCount * 10));
    }
    return 90;
  }

  getPressureRate(sym: string): number {
    const arr = this.tickData[sym]?.digits || [];
    if (arr.length < 50) return 0;
    const lose = buildLoserSet(this.config.mode, this.config.digit, this.config.comboUnder, this.config.comboOver);
    const expFrac = lose.size / 10;
    let exSum = 0;
    [10, 25, 50].forEach(n => {
      const s2 = arr.slice(-n);
      let c = 0;
      s2.forEach(x => { if (lose.has(x)) c++; });
      const frac = c / s2.length;
      exSum += (frac - expFrac) / Math.max(expFrac, 0.05);
    });
    const exMean = exSum / 3;
    return Math.max(0, Math.min(100, Math.round(exMean * 100)));
  }

  // ── Rate Limiting ──
  private canTradeByRate(silent = false): boolean {
    const now = Date.now();
    const hourAgo = now - 3600000;
    this.state.tradesThisHour = this.state.tradesThisHour.filter(t => t > hourAgo);
    if (this.state.tradesThisHour.length >= this.config.maxTradesHour) {
      if (!silent) this.addLog(`⛔ Limite de ${this.config.maxTradesHour} trades/hora atingido`, 'lose');
      return false;
    }
    const sinceLast = now - this.state.lastTradeTime;
    if (sinceLast < this.config.tradeCooldownMs) {
      if (!silent) {
        const remain = this.config.tradeCooldownMs - sinceLast;
        this.addLog(`⏸ Cooldown ${remain}ms`, 'warn');
      }
      return false;
    }
    return true;
  }

  /** True if a new trade can be attempted (lock free + rate ok). */
  private canOpenTrade(silent = true): boolean {
    return !this.state.tradeLock && this.canTradeByRate(silent);
  }

  private recordTrade() {
    this.state.tradesThisHour.push(Date.now());
    this.state.lastTradeTime = Date.now();
  }

  // ── Recovery ──
  private clearRecovery() {
    this.state.recovery = { active: false, attemptsLeft: 0, cooldownUntil: 0, nextTradeAfter: 0 };
  }

  private handleRecoveryTick(): boolean {
    const rec = this.state.recovery;
    if (!rec.active) return false;
    if (!this.config.postLossOn) {
      this.clearRecovery();
      return false;
    }
    if (this.config.postLossMode === 'analyze') {
      if (Date.now() < rec.cooldownUntil) return true;
      rec.active = false;
      this.addLog('🧠 Cooldown finalizado · voltando a analisar', 'info');
      return false;
    }
    if (this.config.postLossMode === 'recover') {
      if (Date.now() < rec.nextTradeAfter) return true;
      if (rec.attemptsLeft <= 0) {
        this.clearRecovery();
        this.addLog('🛑 Limite de tentativas de recuperação atingido · voltando a analisar', 'info');
        return false;
      }
      return false;
    }
    return false;
  }

  private isAiGateOpen(sym: string): boolean {
    // Recalcula no instante da decisão: o cache só é atualizado a cada 3 ticks e
    // antes do tick atual mover o VL e o dígito alvo, então podia aprovar a
    // entrada com um score antigo acima do mínimo e o real já abaixo dele.
    const intel = this.computeMarketIntelligence(sym);
    this.gateScore[sym] = intel.opportunityScore;
    // O card lê o mesmo cache: sem isso ele mostrava o score defasado enquanto a
    // entrada era registrada com o recalculado, bem acima do que estava na tela.
    this.state.marketIntel = { ...this.state.marketIntel, [sym]: intel };
    const isRecovery = this.state.recovery.active && this.config.postLossMode === 'recover';
    // A market with too little history has no measurable score yet: fall through
    // instead of vetoing it, matching the no-intelligence-at-all case above.
    // O Loss Virtual confirmado não anula o veto: o score mínimo é avaliado
    // primeiro e o gate do VL é exigido à parte, em conjunto com este.
    return !intel || !intel.dataReady || aiScoreMatches(intel.opportunityScore, this.config.aiMinScore, this.config.aiScoreAtLeast) || isRecovery;
  }

  // Mesmo critério do gate da IA, mas sobre o cache e sem recalcular.
  private focusHoldsAiScore(sym: string): boolean {
    const intel = this.state.marketIntel[sym];
    return !intel || !intel.dataReady || aiScoreMatches(intel.opportunityScore, this.config.aiMinScore, this.config.aiScoreAtLeast);
  }

  // ── On New Tick (Decision) ──
  private onNewTick(sym: string, dig: number) {
    if (this.handleRecoveryTick()) return;
    const isRecovery = this.state.recovery.active && this.config.postLossMode === 'recover';

    if (this.config.multiOn) {
      const isFocusOnly = this.config.vlOn && this.config.vlFocusOnly;
      const isCandidateGateOpen = (s: string) => isFocusOnly || this.vlGateOpenM(s) || isRecovery;

      if (this.config.mode === 'differ' && this.config.differAutoDigit) {
        this.vlOnDigitM(sym, dig);
        const target = this.autoDigitTarget[sym];
        const aiGateOpen = this.isAiGateOpen(sym);
        if (isFocusOnly) {
          if (aiGateOpen) {
            const intel = this.state.marketIntel[sym];
            const score = intel?.opportunityScore ?? 0;
            this.multiCand[sym] = { sym, b: target ?? this.config.digit, score };
          }
        } else {
          if (target !== null && target !== undefined && isCandidateGateOpen(sym) && aiGateOpen) {
            const intel = this.state.marketIntel[sym];
            const score = intel?.opportunityScore ?? 0;
            this.multiCand[sym] = { sym, b: target, score };
          }
        }
      } else if (this.config.mode === 'differ' && this.config.patTrigger) {
        const ps = this.patState[sym];
        if (ps) {
          this.vlOnDigitM(sym, dig, ps.b !== null ? ps.b : this.config.digit);
          if (ps.waiting) {
            ps.waiting = false;
            if (dig !== ps.b) { ps.count = 0; ps.armed = false; }
          }
          const aiGateOpen = this.isAiGateOpen(sym);
          if (ps.armed && dig === ps.a && isCandidateGateOpen(sym) && aiGateOpen) {
            const intel = this.state.marketIntel[sym];
            const score = intel?.opportunityScore ?? 0;
            this.multiCand[sym] = { sym, b: ps.b, score };
          }
        }
      } else if (this.config.mode === 'differ' && this.config.differDynamicDigit) {
        this.vlOnDigitM(sym, dig);
        if (sym === this.config.activeSym && !this.state.tradeLock && this.lockedDigit === null) {
          this.config.digit = this.computeDynamicDifferDigit(sym).digit;
        }
        const aiGateOpen = this.isAiGateOpen(sym);
        if (isCandidateGateOpen(sym) && aiGateOpen) {
          const dyn = this.computeDynamicDifferDigit(sym);
          const intel = this.state.marketIntel[sym];
          const score = intel?.opportunityScore ?? 0;
          this.multiCand[sym] = { sym, b: dyn.digit, score };
        }
      } else {
        this.vlOnDigitM(sym, dig);
        const aiGateOpen = this.isAiGateOpen(sym);
        if (isCandidateGateOpen(sym) && aiGateOpen) {
          const intel = this.state.marketIntel[sym];
          const score = intel?.opportunityScore ?? 0;
          this.multiCand[sym] = { sym, b: this.config.digit, score };
        }
      }

      if (sym === this.config.activeSym) {
        const st = this.vlM(sym);
        this.state.vlCount = st.count;
        this.state.vlSeen = st.seen;
      }

      if (this.config.exec === 'auto' && this.config.autoOn) this.tryFireMultiCandidate();
      else this.trySwitchMultiCandidate();
      return;
    }

    if (sym !== this.config.activeSym) return;

    if (this.config.mode === 'differ' && this.config.differAutoDigit) {
      this.vlOnDigit(dig);
      const target = this.autoDigitTarget[sym];
      const aiGateOpen = this.isAiGateOpen(sym);
      if (target !== null && target !== undefined && (this.vlGateOpen() || isRecovery) && aiGateOpen) {
        if (this.config.exec === 'auto' && this.config.autoOn) {
          if (!this.canOpenTrade(true)) return;
          this.config.digit = target;
          this.vlReset();
          this.triggerAutoTrade();
        } else {
          this.config.digit = target;
        }
      }
      return;
    }

    if (this.config.mode === 'differ' && this.config.patTrigger) {
      const ps = this.patState[sym];
      if (ps) {
        this.vlOnDigit(dig, ps.b !== null ? ps.b : this.config.digit);
        if (ps.waiting) {
          ps.waiting = false;
          if (dig !== ps.b) { ps.count = 0; ps.armed = false; this.addLog(`Padrão ${ps.a}→${ps.b} quebrou · reset`, 'virt'); }
        }
        const aiGateOpen = this.isAiGateOpen(sym);
        if (ps.armed && dig === ps.a && (this.vlGateOpen() || isRecovery) && aiGateOpen) {
          if (this.config.exec === 'auto' && this.config.autoOn) {
            // Do not reset VL if lock/rate would block prepareTrade
            if (!this.canOpenTrade(true)) return;
            this.config.digit = ps.b!;
            ps.waiting = true;
            this.vlReset();
            this.triggerAutoTrade();
          } else {
            this.config.digit = ps.b!;
            ps.waiting = true;
            this.vlReset();
          }
        }
      }
      return;
    }

    if (this.config.mode === 'differ' && this.config.differDynamicDigit) {
      this.vlOnDigit(dig);
      const dyn = this.computeDynamicDifferDigit(sym);
      if (!this.state.tradeLock) {
        this.config.digit = dyn.digit;
      }
      const aiGateOpen = this.isAiGateOpen(sym);
      if (this.config.exec === 'auto' && this.config.autoOn) {
        const gateOpen = this.vlGateOpen();
        if ((gateOpen || isRecovery) && aiGateOpen) {
          if (!this.canOpenTrade(true)) return;
          // Loss Virtual ligado: compra obrigatoriamente o dígito que perdeu virtualmente.
          if (this.config.vlOn && gateOpen && !this.lockDynamicDigit(sym)) {
            this.addLog(`⛔ Gate bloqueado · ${sym} sem dígito perdedor`, 'warn');
            return;
          }
          this.vlReset();
          this.triggerAutoTrade();
        }
      }
      return;
    }

    this.vlOnDigit(dig);
    const aiGateOpen = this.isAiGateOpen(sym);
    if (this.config.exec === 'auto' && this.config.autoOn && (this.vlGateOpen() || isRecovery) && aiGateOpen) {
      if (!this.canOpenTrade(true)) return;
      this.vlReset();
      this.triggerAutoTrade();
    }
  }

  private revalidateMultiCandidates() {
    // O score de um candidato pode mudar sem que ele receba outro tick. Remova
    // candidatos antigos antes de escolher o foco ou disparar uma operação.
    for (const sym of Object.keys(this.multiCand)) {
      if (!this.isAiGateOpen(sym)) {
        delete this.multiCand[sym];
        continue;
      }
      const intel = this.state.marketIntel[sym];
      // Com o piso ligado, não escolha volatilidades ainda sem score medido
      // ou abaixo do valor digitado, inclusive durante a recuperação.
      if (!intel || (this.config.aiScoreAtLeast
        && intel.opportunityScore < this.config.aiMinScore)) {
        delete this.multiCand[sym];
        continue;
      }
      this.multiCand[sym].score = intel.opportunityScore;
    }
  }

  private tryFireMultiCandidate() {
    if (this.state.tradeLock) return;
    if (!this.canTradeByRate(true)) return;
    this.revalidateMultiCandidates();
    const cands = Object.values(this.multiCand);
    if (!cands.length) return;
    const pick = topOpportunityCandidate(cands)!;

    // Under vlFocusOnly, focus switches first, and trading only triggers after VL accumulates under focus
    if (this.config.vlFocusOnly && this.config.vlOn) {
      const activeSym = this.config.activeSym;
      const isRecovery = this.state.recovery.active && this.config.postLossMode === 'recover';

      // 1. If active market already achieved VL threshold under focus, fire the trade on activeSym!
      // O score mínimo vale para o próprio foco: o candidato que passou no gate
      // pode ser outro mercado, e o disparo aqui é sempre no activeSym.
      if (this.vlGateOpenM(activeSym) && this.isAiGateOpen(activeSym)
        && (this.state.marketIntel[activeSym]?.opportunityScore ?? 0) >= pick.score) {
        // Dígito Dinâmico: a barreira é o dígito que sofreu a perda virtual sob foco.
        // Sem esse dígito identificado, nenhuma ordem real pode ser disparada.
        if (this.config.mode === 'differ' && this.config.differDynamicDigit && !this.lockDynamicDigit(activeSym)) {
          this.addLog(`⛔ Gate bloqueado · ${activeSym} sem dígito perdedor sob foco`, 'warn');
          return;
        }
        this.multiCand = {};
        if (this.config.mode === 'differ' && this.config.differAutoDigit) {
          const targetDigit = this.autoDigitTarget[activeSym] ?? pick.b;
          if (targetDigit !== null && targetDigit !== undefined) {
            this.config.digit = targetDigit;
          }
        } else if (this.config.mode === 'differ' && this.config.patTrigger) {
          const cand = cands.find((c: any) => c.sym === activeSym);
          if (cand && cand.b !== null && cand.b !== undefined) this.config.digit = cand.b;
          const ps = this.patState[activeSym];
          if (ps) ps.waiting = true;
        }
        this.vlResetM(activeSym);
        this.addLog(`🌐 MULTI · ${activeSym} atingiu ${this.config.vlQty} loss sob foco · Executando trade`, 'info');
        this.triggerAutoTrade();
        this.notify();
        return;
      }

      // 2. Otherwise, if another candidate has better score, evaluate switching focus to it
      if (pick.sym !== activeSym) {
        const curScore = this.state.marketIntel[activeSym]?.opportunityScore ?? 50;
        if (pick.score <= curScore && this.focusHoldsAiScore(activeSym) && !isRecovery) {
          return;
        }
        if (Date.now() - this.lastManualSwitch > 3000) {
          this.multiCand = {};
          this.vlResetM(activeSym);
          this.config.activeSym = pick.sym;
          this.lastManualSwitch = Date.now();
          this.vlResetM(pick.sym);
          if (this.config.mode === 'differ' && (this.config.patTrigger || this.config.differAutoDigit || this.config.differDynamicDigit)) {
            if (pick.b !== null && pick.b !== undefined) this.config.digit = pick.b;
            const ps = this.patState[pick.sym];
            if (ps && this.config.patTrigger) ps.waiting = true;
          }
          this.addLog(`🎯 Contagem sob Foco · Foco em ${pick.sym} (iniciando contagem)`, 'info');
          this.notify();
        }
        return;
      }

      return;
    }

    // Revalida o gate no instante do disparo: o candidato pode ter sido registrado
    // em ticks anteriores e a contagem de loss virtual já ter sido zerada desde então.
    // A Recuperação Ativa (pós-loss) segue sendo o único bypass legítimo do gate.
    const isRecovery = this.state.recovery.active && this.config.postLossMode === 'recover';
    if (!isRecovery && !this.vlGateOpenM(pick.sym)) return;
    const useLossDigit = this.config.mode === 'differ' && this.config.differDynamicDigit
      && this.config.vlOn && !isRecovery;
    if (useLossDigit && !this.lockDynamicDigit(pick.sym)) {
      this.addLog(`⛔ Gate bloqueado · ${pick.sym} sem dígito perdedor`, 'warn');
      return;
    }
    this.multiCand = {};
    this.config.activeSym = pick.sym;
    if (this.config.mode === 'differ' && (this.config.patTrigger || this.config.differAutoDigit
      || (this.config.differDynamicDigit && !useLossDigit))) {
      this.config.digit = pick.b!;
      const ps = this.patState[pick.sym];
      if (ps && this.config.patTrigger) ps.waiting = true;
    }
    this.vlResetM(pick.sym);
    this.addLog(`🌐 MULTI · ${pick.sym} escolhido`, 'info');
    this.triggerAutoTrade();
    this.notify();
  }

  private trySwitchMultiCandidate() {
    if (this.state.tradeLock) return;
    this.revalidateMultiCandidates();
    const cands = Object.values(this.multiCand);
    if (!cands.length) return;
    const pick = topOpportunityCandidate(cands)!;
    if (pick.sym !== this.config.activeSym) {
      const isRecovery = this.state.recovery.active && this.config.postLossMode === 'recover';
      if (this.config.vlFocusOnly && this.config.vlOn) {
        const curScore = this.state.marketIntel[this.config.activeSym]?.opportunityScore ?? 50;
        if (pick.score <= curScore && this.focusHoldsAiScore(this.config.activeSym) && !isRecovery) {
          return;
        }
      }
      if (Date.now() - this.lastManualSwitch > 3000) {
        this.multiCand = {};
        if (this.config.vlFocusOnly && this.config.vlOn) {
          this.vlResetM(this.config.activeSym);
        }
        this.config.activeSym = pick.sym;
        this.lastManualSwitch = Date.now();
        if (this.config.mode === 'differ' && (this.config.patTrigger || this.config.differAutoDigit || this.config.differDynamicDigit)) {
          if (pick.b !== null && pick.b !== undefined) this.config.digit = pick.b;
        }
        // Contagem sob Foco: reset VL for newly focused market
        if (this.config.vlFocusOnly && this.config.vlOn) {
          this.vlResetM(pick.sym);
          this.addLog(`🎯 Contagem sob Foco · Foco em ${pick.sym} (iniciando contagem)`, 'info');
        } else {
          this.addLog(`🌐 MULTI (Manual) · Foco em ${pick.sym}`, 'info');
        }
        this.notify();
      }
    } else {
      if (this.config.mode === 'differ' && (this.config.patTrigger || this.config.differAutoDigit || this.config.differDynamicDigit) && pick.b !== null && pick.b !== undefined) {
        if (!this.state.tradeLock && this.config.digit !== pick.b) {
          this.config.digit = pick.b;
          this.notify();
        }
      }
    }
  }

  // ── Trade Execution Interface ──
  private buildQuickBuyPayload(proposalId: string): Record<string, unknown> {
    const stake = +this.state.curStake.toFixed(2);
    return {
      buy: proposalId,
      price: stake,
    };
  }

  private buildBuyPayload(ct: string, barrier: number): Record<string, unknown> {
    const stake = +this.state.curStake.toFixed(2);
    return {
      buy: 1,
      price: stake,
      parameters: {
        amount: stake,
        basis: 'stake',
        contract_type: ct,
        currency: 'USD',
        duration: 1,
        duration_unit: 't',
        underlying_symbol: this.config.activeSym,
        barrier: String(barrier),
      },
    };
  }

  prepareTrade(kind: string, proposals?: Map<string, string> | Record<string, string>): TradePrep | null {
    if (this.state.tradeLock) return null;
    if (!this.canTradeByRate()) return null;
    if (this.state.pnl <= -Math.abs(this.config.stopLoss)) { this.addLog('Stop Loss atingido', 'lose'); return null; }
    if (this.state.pnl >= Math.abs(this.config.stopWin)) { this.addLog('Stop Win atingido', 'win'); return null; }

    // Paper and real both lock until settle/abort
    this.state.tradeLock = true;
    this.tradeEntryScore = this.pendingEntryScore
      ?? this.computeMarketIntelligence(this.config.activeSym).opportunityScore;
    this.pendingEntryScore = null;

    if (this.config.paperMode) {
      if (kind === 'differ' && this.config.differDynamicDigit) {
        this.config.digit = this.resolveDynamicBarrier();
      }
      this.notify();
      return { payload: null, isPaper: true, kind };
    }

    if (kind === 'combo') return this.prepareCombo(proposals);

    if (kind === 'differ' && this.config.differDynamicDigit) {
      this.config.digit = this.resolveDynamicBarrier();
    }

    const ct = kind === 'over' ? 'DIGITOVER' : kind === 'under' ? 'DIGITUNDER' : 'DIGITDIFF';
    const barrier = this.config.digit;
    const proposalKey = `${ct}|${barrier}`;
    const proposalId = proposals instanceof Map ? proposals.get(proposalKey) : proposals?.[proposalKey];
    const usedProposal = Boolean(proposalId);
    const payload = proposalId
      ? this.buildQuickBuyPayload(proposalId)
      : this.buildBuyPayload(ct, barrier);

    this.notify();
    return { payload, isPaper: false, kind, usedProposal };
  }

  private prepareCombo(proposals?: Map<string, string> | Record<string, string>): TradePrep {
    this.comboPending = { legs: 2, won: 0, results: [], exits: [] };
    const required = this.getRequiredProposals();
    const legs: TradeLeg[] = required.map(({ ct, barrier }) => {
      const legKind = ct === 'DIGITOVER' ? 'over' : ct === 'DIGITUNDER' ? 'under' : 'differ';
      const proposalKey = `${ct}|${barrier}`;
      const proposalId = proposals instanceof Map ? proposals.get(proposalKey) : proposals?.[proposalKey];
      const usedProposal = Boolean(proposalId);
      const payload = proposalId
        ? this.buildQuickBuyPayload(proposalId)
        : this.buildBuyPayload(ct, barrier);
      return {
        ct,
        barrier,
        legKind,
        payload,
        usedProposal,
      };
    });
    const usedProposal = legs.length > 0 && legs.every((l) => l.usedProposal);
    this.notify();
    return { payload: null, isPaper: false, kind: 'combo', legs, usedProposal };
  }

  /**
   * Unlock without counting PnL / gale / recovery.
   * Used on API errors, safety timeout, and cancelled prepares.
   */
  abortPendingTrade(reason?: string) {
    this.comboPending = null;
    this.tradeEntryScore = null;
    this.clearDigitLock();
    if (this.state.tradeLock) {
      this.state.tradeLock = false;
      if (reason) this.addLog(reason, 'warn');
      this.notify();
    } else if (reason) {
      this.addLog(reason, 'warn');
    }
  }

  /** Drop combo aggregation so the open leg settles as a normal single trade. */
  demoteComboToSingle() {
    this.comboPending = null;
  }

  isComboPending(): boolean {
    return this.comboPending !== null;
  }

  simulateTrade(kind: string): { profit: number; isLoss: boolean; exitDig: number | null; audit: any } | null {
    const stakeVal = +this.state.curStake.toFixed(2);
    const sym = this.config.activeSym;
    const digits = this.tickData[sym]?.digits || [];
    if (digits.length < 2) return null;
    const lastDigit = digits[digits.length - 1];
    const audit = {
      tick_previous: String(digits[digits.length - 2]),
      tick_start: String(lastDigit),
      tick_end: String(lastDigit),
    };

    // Paper combo: evaluate both legs (OVER comboOver + UNDER comboUnder) and net P&L
    if (kind === 'combo') {
      const u = this.config.comboUnder ?? 4;
      const o = this.config.comboOver ?? 5;
      const minD = Math.min(u, o);
      const maxD = Math.max(u, o);
      const legStake = stakeVal;
      const winOver = lastDigit > maxD;
      const winUnder = lastDigit < minD;
      const p1 = winOver ? +(legStake * 0.94).toFixed(2) : -legStake;
      const p2 = winUnder ? +(legStake * 0.94).toFixed(2) : -legStake;
      const profit = +(p1 + p2).toFixed(2);
      // WIN only on real net gain (matches real combo settlement)
      return { profit, isLoss: profit <= 0, exitDig: lastDigit, audit };
    }

    const win = isWinCheck(lastDigit, kind, this.config.digit, this.config.comboUnder, this.config.comboOver);
    const profit = win ? +(stakeVal * 0.94).toFixed(2) : -stakeVal;
    return { profit, isLoss: !win, exitDig: lastDigit, audit };
  }

  settleContract(profit: number, isLoss: boolean, kind: string, exitDig: number | null, audit: any) {
    if (this.comboPending && kind === 'combo') {
      const cp = this.comboPending;
      cp.legs--; if (profit >= 0) cp.won++; cp.results.push(profit); cp.exits.push(exitDig);
      if (cp.legs > 0) {
        this.notify();
        return;
      }
      const net = cp.results.reduce((a: number, b: number) => a + b, 0);
      this.comboPending = null;
      // Legs may settle on different ticks: show every distinct exit digit
      const exits = [...new Set(cp.exits.filter((d): d is number => d !== null))];
      const saiu = exits.length > 1 ? exits.join('/') : exitDig;
      // WIN only on real net gain: one winning leg can still lose money overall
      this.finishTrade(net, net <= 0, 'COMBO', saiu, audit, this.comboAlvo());
      return;
    }
    if (kind === 'combo') {
      this.finishTrade(profit, isLoss, 'COMBO', exitDig, audit, this.comboAlvo());
      return;
    }
    this.finishTrade(profit, isLoss, kind.toUpperCase(), exitDig, audit);
  }

  private comboAlvo(): string {
    const u = this.config.comboUnder ?? 4;
    const o = this.config.comboOver ?? 5;
    return `<${Math.min(u, o)} >${Math.max(u, o)}`;
  }

  private finishTrade(profit: number, isLoss: boolean, label: string, exitDig: number | string | null, audit: any, alvo: number | string = this.config.digit) {
    this.state.pnl = +(this.state.pnl + profit).toFixed(2);
    const stakeUsed = this.state.curStake;
    const isPaper = this.config.paperMode;

    const newTrade: TradeLog = {
      t: new Date().toISOString(), mercado: this.config.activeSym, modo: label, alvo,
      audit: audit || { tick_previous: '—', tick_start: '—', tick_end: '—' },
      saiu: exitDig !== null ? exitDig : '—', stake: stakeUsed.toFixed(2),
      resultado: isLoss ? 'LOSS' : 'WIN', lucro: profit.toFixed(2),
      acumulado: this.state.pnl.toFixed(2), paper: isPaper,
      score: this.tradeEntryScore ?? undefined,
    };
    this.tradeEntryScore = null;
    this.state.trades = [newTrade, ...this.state.trades].slice(0, 2000);
    this.recordTrade();

    if (isLoss) {
      this.state.loss++;
      if (this.config.galeMode === 'parc') {
        this.state.lossAcum = +(this.state.lossAcum + Math.abs(profit)).toFixed(2);
        this.state.parcelsLeft = this.config.galeParcels;
        const pay = this.state.lastPayout > 0.05 ? this.state.lastPayout : 0.9;
        this.state.curStake = +(this.config.stake + (this.state.lossAcum / this.state.parcelsLeft) / pay).toFixed(2);
      } else {
        this.state.galeLevel++;
        this.state.curStake = +(this.config.stake * Math.pow(this.config.gale, this.state.galeLevel)).toFixed(2);
      }
      this.addLog(`✖ LOSS ${label} ${profit.toFixed(2)}`, 'lose');
      if (this.config.postLossOn) {
        if (this.config.postLossMode === 'recover') {
          if (this.state.recovery.active) {
            this.state.recovery.attemptsLeft--;
            if (this.state.recovery.attemptsLeft <= 0) {
              this.clearRecovery();
              this.addLog('🛑 Limite de tentativas de recuperação atingido · voltando a analisar', 'info');
            } else {
              this.state.recovery.nextTradeAfter = Date.now() + this.config.recoverDelay;
            }
          } else {
            this.state.recovery.active = true;
            this.state.recovery.attemptsLeft = this.config.recoverMaxAttempts;
            this.state.recovery.nextTradeAfter = Date.now() + this.config.recoverDelay;
          }
        } else {
          this.state.recovery.active = true;
          this.state.recovery.cooldownUntil = Date.now() + this.config.cooldownSec * 1000;
          this.vlReset();
          this.vlResetM(this.config.activeSym);
        }
      }
    } else {
      this.state.wins++;
      if (stakeUsed > 0 && profit > 0) this.state.lastPayout = +(profit / stakeUsed).toFixed(3);
      if (this.state.recovery.active) { this.state.recovery.active = false; this.state.recovery.attemptsLeft = 0; }
      if (this.config.galeMode === 'parc' && this.state.lossAcum > 0) {
        this.state.lossAcum = +Math.max(0, this.state.lossAcum - profit).toFixed(2);
        this.state.parcelsLeft = Math.max(1, this.state.parcelsLeft - 1);
        if (this.state.lossAcum <= 0) { this.state.lossAcum = 0; this.state.parcelsLeft = 0; this.state.curStake = this.config.stake; }
        else { const pay = this.state.lastPayout > 0.05 ? this.state.lastPayout : 0.9; this.state.curStake = +(this.config.stake + (this.state.lossAcum / this.state.parcelsLeft) / pay).toFixed(2); }
      } else {
        this.state.galeLevel = 0; this.state.lossAcum = 0; this.state.parcelsLeft = 0; this.state.curStake = this.config.stake;
      }
      this.addLog(`✔ WIN ${label} +${profit.toFixed(2)}`, 'win');
    }
    this.state.tradeLock = false;
    this.clearDigitLock();
    this.notify();
  }

  // ── Controles ──
  startBot() {
    if (this.config.exec !== 'auto') return false;
    this.clearDigitLock();
    this.vlReset(); this.vlResetAllM(); this.state.recovery.active = false;
    if (this.config.mode === 'differ' && this.config.differDynamicDigit) {
      this.config.digit = this.computeDynamicDifferDigit(this.config.activeSym).digit;
    }
    this.config.autoOn = true;
    this.addLog(`🤖 Robô LIGADO · ${this.config.mode.toUpperCase()}`, 'win');
    this.notify();
    return true;
  }

  stopBot() { this.config.autoOn = false; this.addLog('🤖 Robô desligado', 'info'); this.notify(); }

  abortOp() {
    this.config.autoOn = false; this.state.galeLevel = 0; this.state.curStake = this.config.stake;
    this.state.lossAcum = 0; this.state.parcelsLeft = 0;
    this.state.tradeLock = false; this.clearRecovery();
    this.comboPending = null;
    this.clearDigitLock();
    this.vlReset(); this.vlResetAllM();
    this.addLog('✋ Operação abortada', 'info'); this.notify();
  }

  resetStats() {
    this.state.wins = 0; this.state.loss = 0; this.state.pnl = 0; this.state.trades = []; this.state.logLines = [];
    this.state.galeLevel = 0; this.state.curStake = this.config.stake; this.state.tradeLock = false;
    this.state.tradesThisHour = [];
    this.state.lastTradeTime = 0;
    this.clearRecovery();
    this.comboPending = null;
    this.clearDigitLock();
    this.vlReset(); this.vlResetAllM();
    this.addLog('Estatísticas resetadas', 'info'); this.notify();
  }

  /**
   * Manual entry gate only — does NOT call prepareTrade (avoids double-lock).
   * Hook must call executeTrade → prepareTrade once.
   */
  tryManualFire(): boolean {
    if (this.state.tradeLock) {
      this.addLog('Operação em andamento · aguarde settlement', 'warn');
      return false;
    }
    if (!this.canTradeByRate()) return false;
    if (this.config.vlOn && !this.vlGateOpen()) {
      this.addLog(`Loss virtual incompleto (${this.state.vlCount}/${this.config.vlQty})`, 'virt');
      return false;
    }
    if (this.config.mode === 'differ' && this.config.differDynamicDigit) {
      if (this.config.vlOn) {
        if (!this.lockDynamicDigit(this.config.activeSym)) {
          this.addLog('Sem dígito perdedor virtual · compra bloqueada', 'virt');
          return false;
        }
      } else {
        this.config.digit = this.computeDynamicDifferDigit(this.config.activeSym).digit;
      }
    }
    this.pendingEntryScore = this.computeMarketIntelligence(this.config.activeSym).opportunityScore;
    if (this.config.vlOn) this.vlReset();
    return true;
  }

  /** @deprecated use tryManualFire + prepareTrade via executeTrade */
  manualFire(kind: string): TradePrep | null {
    if (!this.tryManualFire()) return null;
    return this.prepareTrade(kind);
  }

  /**
   * Barreira efetiva do Dígito Dinâmico: se um gatilho de Loss Virtual congelou o
   * dígito perdedor, ele é obrigatório até a liquidação; senão recalcula o radar.
   */
  private resolveDynamicBarrier(): number {
    if (this.lockedDigit !== null) return this.lockedDigit;
    return this.computeDynamicDifferDigit(this.config.activeSym).digit;
  }

  // ── Proposals ──
  getProposalPayload(ct: string, barrier: number): any {
    const stakeVal = +this.state.curStake.toFixed(2);
    return {
      proposal: 1, subscribe: 1, amount: stakeVal, basis: 'stake',
      contract_type: ct, currency: 'USD', duration: 1, duration_unit: 't',
      underlying_symbol: this.config.activeSym, barrier: String(barrier),
    };
  }

  getRequiredProposals(): Array<{ ct: string; barrier: number }> {
    const m = this.config.mode, d = this.config.digit;
    if (m === 'over') return [{ ct: 'DIGITOVER', barrier: d }];
    if (m === 'under') return [{ ct: 'DIGITUNDER', barrier: d }];
    if (m === 'differ') {
      const barrier = this.config.differDynamicDigit ? this.resolveDynamicBarrier() : d;
      return [{ ct: 'DIGITDIFF', barrier }];
    }
    if (m === 'combo') {
      const u = this.config.comboUnder ?? 4;
      const o = this.config.comboOver ?? 5;
      const minD = Math.min(u, o);
      const maxD = Math.max(u, o);
      return [{ ct: 'DIGITOVER', barrier: maxD }, { ct: 'DIGITUNDER', barrier: minD }];
    }
    return [];
  }

  // ── Export ──
  exportTradesCSV(): string {
    if (!this.state.trades.length) return '';
    const headers = ['data_hora', 'mercado', 'modo', 'alvo', 'saiu', 'score', 'stake', 'resultado', 'lucro', 'acumulado', 'paper'];
    const rows = this.state.trades.map(t => [
      t.t, t.mercado, t.modo, t.alvo, t.saiu, t.score ?? '', t.stake, t.resultado, t.lucro, t.acumulado, t.paper ? 'SIM' : 'NAO'
    ].join(','));
    return headers.join(',') + '\n' + rows.join('\n');
  }
}

export const createEngine = (config?: Partial<BotConfig>) => new BearBotEngine(config);
