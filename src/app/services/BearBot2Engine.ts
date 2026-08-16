// BearBotEngine — Lógica Pura de Trading (Sem React)

import {
  BotConfig, BotState, Market, MARKETS, TradeLog, PatternState,
  VLMarketState, MarketIntelligence, MultiCandidate, ComboPending,
  RecoveryState, TickData, ProposalState, DEFAULT_BOT_STATE,
  TradePrep, TradeLeg,
} from './bearbot2.types';

// ── Helpers Estáticos ──
const LOSER_MAP: Record<string, Set<number>> = {};

function buildLoserSet(mode: string, digit: number): Set<number> {
  const key = `${mode}-${digit}`;
  if (LOSER_MAP[key]) return LOSER_MAP[key];
  const set = new Set<number>();
  if (mode === 'over') { for (let i = 0; i <= digit; i++) set.add(i); }
  else if (mode === 'under') { for (let i = digit; i <= 9; i++) set.add(i); }
  else if (mode === 'combo') { set.add(4); set.add(5); }
  else { set.add(digit); }
  LOSER_MAP[key] = set;
  return set;
}

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
  return next;
}

function isWinCheck(r: number, mode: string, digit: number): boolean {
  if (mode === 'over') return r > digit;
  if (mode === 'under') return r < digit;
  if (mode === 'differ') return r !== digit;
  if (mode === 'combo') return r !== 4 && r !== 5;
  return false;
}

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
  private patState: Record<string, PatternState> = {};
  private vlMState: Record<string, VLMarketState> = {};
  private props: Record<string, ProposalState> = {};
  private multiCand: Record<string, MultiCandidate> = {};
  private comboPending: ComboPending | null = null;
  private ticksSinceReset: Record<string, number> = {};
  private settled: Record<string, boolean> = {};
  private lastManualSwitch = 0;
  private listeners: Set<(state: BotState) => void> = new Set();
  private logListeners: Set<(log: { ts: string; msg: string; type: string }) => void> = new Set();
  private autoTradeListeners: Set<(kind: string) => void> = new Set();

  constructor(config: Partial<BotConfig> = {}) {
    this.config = { ...this.getDefaultConfig(), ...clampRateLimits(config) };
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
      vlQty: 2, vlWindow: 14, stake: 0.35, gale: 2.1, stopLoss: 20,
      stopWin: 20, galeMode: 'mult', galeParcels: 2, multiOn: false,
      patReps: 3, patMinForce: 30, patTrigger: false, patMode: 'accum',
      postLossOn: false, postLossMode: 'recover', recoverMaxAttempts: 3,
      recoverDelay: 1500, cooldownSec: 5, maxTradesHour: 50,
      tradeCooldownMs: 2000, aiMode: 'balanced', soundOn: true,
    };
  }

  private initMarkets() {
    MARKETS.forEach(m => {
      this.tickData[m.sym] = { digits: [], price: null };
      this.patState[m.sym] = { a: null, b: null, count: 0, reps: 0, armed: false, waiting: false, seqCount: 0 };
      this.vlMState[m.sym] = { count: 0, seen: 0 };
      this.ticksSinceReset[m.sym] = 0;
    });
  }

  // ── Getters ──
  getConfig(): BotConfig { return { ...this.config }; }
  getState(): BotState {
    const vlBySym: Record<string, VLMarketState> = {};
    MARKETS.forEach(m => {
      const st = this.vlMState[m.sym] || { count: 0, seen: 0 };
      vlBySym[m.sym] = { count: st.count, seen: st.seen };
    });
    return {
      ...this.state,
      tickData: { ...this.tickData },
      vlBySym,
    };
  }

  // ── Config Updates ──
  updateConfig(updates: Partial<BotConfig>) {
    const oldMulti = this.config.multiOn;
    this.config = { ...this.config, ...clampRateLimits(updates) };
    if (oldMulti && !this.config.multiOn) this.vlReset();
    if (updates.stake !== undefined && this.state.galeLevel === 0) {
      this.state.curStake = updates.stake;
    }
    if (
      updates.aiMode !== undefined ||
      updates.mode !== undefined ||
      updates.patTrigger !== undefined ||
      updates.digit !== undefined ||
      updates.vlOn !== undefined ||
      updates.vlQty !== undefined ||
      updates.vlMode !== undefined ||
      updates.vlWindow !== undefined
    ) {
      this.updateAllIntelligence();
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
    this.autoTradeListeners.forEach(cb => cb(this.config.mode));
  }

  private notify() {
    const s = this.getState();
    this.listeners.forEach(cb => cb(s));
  }

  private addLog(msg: string, type: string = '') {
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

    if (currentDigits.length % 3 === 0) {
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
    this.ticksSinceReset[sym] = (this.ticksSinceReset[sym] || 0) + 1;
    const st = this.vlM(sym);
    const lose = buildLoserSet(this.config.mode, this.config.digit);
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
    const lose = buildLoserSet(this.config.mode, this.config.digit);
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
  }

  private vlGateOpen(): boolean {
    return !this.config.vlOn || this.state.vlCount >= this.config.vlQty;
  }

  private vlGateOpenM(sym: string): boolean {
    return !this.config.vlOn || this.vlM(sym).count >= this.config.vlQty;
  }

  private vlReset() {
    this.state.vlCount = 0; this.state.vlSeen = 0;
    const sym = this.config.activeSym;
    this.ticksSinceReset[sym] = 0;
  }

  private vlResetM(sym: string) {
    const st = this.vlM(sym); st.count = 0; st.seen = 0;
    this.ticksSinceReset[sym] = 0;
  }

  private vlResetAllM() {
    this.vlMState = {};
    this.multiCand = {};
    this.ticksSinceReset = {};
    MARKETS.forEach(m => {
      this.ticksSinceReset[m.sym] = 0;
      if (this.patState[m.sym]) {
        this.patState[m.sym].count = 0;
        this.patState[m.sym].seqCount = 0;
        this.patState[m.sym].armed = false;
        this.patState[m.sym].waiting = false;
      }
    });
  }

  // ── Inteligência Cross-Market ──
  private computeMarketIntelligence(sym: string): MarketIntelligence {
    const arr = this.tickData[sym]?.digits || [];
    const ps = this.patState[sym];
    const vlSt = this.vlM(sym);
    const lose = buildLoserSet(this.config.mode, this.config.digit);

    let pressure = 0;
    if (arr.length >= 50) {
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
      const target = this.config.vlQty;
      const current = vlSt.count;
      if (this.config.vlMode === 'consec') {
        vlProgress = Math.min(100, Math.round((current / target) * 100));
      } else {
        const windowSize = Math.min(arr.length, this.config.vlWindow);
        vlProgress = windowSize > 0 ? Math.min(100, Math.round((current / Math.min(target, windowSize)) * 100)) : 0;
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
        if (otherPs && otherPs.a === ps.a && otherPs.b === ps.b && otherPs.armed) syncCount++;
        totalMarkets++;
      });
      syncScore = totalMarkets > 0 ? Math.min(100, Math.round((syncCount / 3) * 100)) : 0;
    }

    const ai = this.config.aiMode;
    let wPressure = 0.35, wPattern = 0.25, wVL = 0.25, wSync = 0.15;
    if (ai === 'conservative') { wPressure = 0.45; wPattern = 0.20; wVL = 0.25; wSync = 0.10; }
    if (ai === 'aggressive') { wPressure = 0.25; wPattern = 0.30; wVL = 0.20; wSync = 0.25; }

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

    return { sym, pressure, patternStrength, vlProgress, syncScore, opportunityScore, recommendation, lastUpdate: Date.now() };
  }

  private updateAllIntelligence() {
    const newIntel: Record<string, MarketIntelligence> = {};
    MARKETS.forEach(m => {
      newIntel[m.sym] = this.computeMarketIntelligence(m.sym);
    });
    this.state.marketIntel = newIntel;
  }

  // ── Estatísticas ──
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
    const lose = buildLoserSet(this.config.mode, this.config.digit);
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
    arr.forEach(x => { if (isWinCheck(x, this.config.mode, this.config.digit)) w++; });
    return Math.round((w / arr.length) * 100);
  }

  getTheoreticalRate(): number {
    const { mode, digit } = this.config;
    if (mode === 'over') return ((9 - digit) / 10) * 100;
    if (mode === 'under') return (digit / 10) * 100;
    if (mode === 'combo') return 80;
    return 90;
  }

  getPressureRate(sym: string): number {
    const arr = this.tickData[sym]?.digits || [];
    if (arr.length < 50) return 0;
    const lose = buildLoserSet(this.config.mode, this.config.digit);
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

  // ── On New Tick (Decision) ──
  private onNewTick(sym: string, dig: number) {
    if (this.handleRecoveryTick()) return;
    const isRecovery = this.state.recovery.active && this.config.postLossMode === 'recover';
    const intel = this.state.marketIntel[sym];
    const aiGateOpen = !intel || intel.opportunityScore >= 40 || isRecovery;

    if (this.config.multiOn) {
      if (this.config.mode === 'differ' && this.config.patTrigger) {
        const ps = this.patState[sym];
        if (ps) {
          this.vlOnDigitM(sym, dig, ps.b !== null ? ps.b : this.config.digit);
          if (ps.waiting) {
            ps.waiting = false;
            if (dig !== ps.b) { ps.count = 0; ps.armed = false; }
          }
          if (ps.armed && dig === ps.a && (this.vlGateOpenM(sym) || isRecovery) && aiGateOpen) {
            const score = (intel?.opportunityScore || 50) + this.vlM(sym).count + (ps.seqCount || 0);
            this.multiCand[sym] = { sym, b: ps.b, score };
          }
        }
      } else {
        this.vlOnDigitM(sym, dig);
        if ((this.vlGateOpenM(sym) || isRecovery) && aiGateOpen) {
          const an = this.marketAnomaly(sym);
          const exc = an ? an.excess : 0;
          const score = (intel?.opportunityScore || 50) + this.vlM(sym).count + exc;
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

    if (this.config.mode === 'differ' && this.config.patTrigger) {
      const ps = this.patState[sym];
      if (ps) {
        this.vlOnDigit(dig, ps.b !== null ? ps.b : this.config.digit);
        if (ps.waiting) {
          ps.waiting = false;
          if (dig !== ps.b) { ps.count = 0; ps.armed = false; this.addLog(`Padrão ${ps.a}→${ps.b} quebrou · reset`, 'virt'); }
        }
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

    this.vlOnDigit(dig);
    if (this.config.exec === 'auto' && this.config.autoOn && (this.vlGateOpen() || isRecovery) && aiGateOpen) {
      if (!this.canOpenTrade(true)) return;
      this.vlReset();
      this.triggerAutoTrade();
    }
  }

  private tryFireMultiCandidate() {
    if (this.state.tradeLock) return;
    if (!this.canTradeByRate(true)) return;
    const cands = Object.values(this.multiCand);
    if (!cands.length) return;
    cands.sort((a: any, b: any) => b.score - a.score);
    const pick: any = cands[0];
    this.multiCand = {};
    this.config.activeSym = pick.sym;
    if (this.config.mode === 'differ' && this.config.patTrigger) {
      this.config.digit = pick.b!;
      const ps = this.patState[pick.sym];
      if (ps) ps.waiting = true;
    }
    this.vlResetM(pick.sym);
    this.addLog(`🌐 MULTI · ${pick.sym} escolhido`, 'info');
    this.triggerAutoTrade();
    this.notify();
  }

  private trySwitchMultiCandidate() {
    if (this.state.tradeLock) return;
    const cands = Object.values(this.multiCand);
    if (!cands.length) return;
    cands.sort((a: any, b: any) => b.score - a.score);
    const pick: any = cands[0];
    if (pick.sym !== this.config.activeSym && Date.now() - this.lastManualSwitch > 3000) {
      this.multiCand = {};
      this.config.activeSym = pick.sym;
      this.lastManualSwitch = Date.now();
      if (this.config.mode === 'differ' && this.config.patTrigger) this.config.digit = pick.b!;
      this.addLog(`🌐 MULTI (Manual) · Foco em ${pick.sym}`, 'info');
      this.notify();
    }
  }

  // ── Trade Execution Interface ──
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

  prepareTrade(kind: string): TradePrep | null {
    if (this.state.tradeLock) return null;
    if (!this.canTradeByRate()) return null;
    if (this.state.pnl <= -Math.abs(this.config.stopLoss)) { this.addLog('Stop Loss atingido', 'lose'); return null; }
    if (this.state.pnl >= Math.abs(this.config.stopWin)) { this.addLog('Stop Win atingido', 'win'); return null; }

    // Paper and real both lock until settle/abort
    this.state.tradeLock = true;

    if (this.config.paperMode) {
      this.notify();
      return { payload: null, isPaper: true, kind };
    }

    if (kind === 'combo') return this.prepareCombo();

    const ct = kind === 'over' ? 'DIGITOVER' : kind === 'under' ? 'DIGITUNDER' : 'DIGITDIFF';
    const payload = this.buildBuyPayload(ct, this.config.digit);
    this.notify();
    return { payload, isPaper: false, kind };
  }

  private prepareCombo(): TradePrep {
    this.comboPending = { legs: 2, won: 0, results: [] };
    const proposals = this.getRequiredProposals();
    const legs: TradeLeg[] = proposals.map(({ ct, barrier }) => {
      const legKind = ct === 'DIGITOVER' ? 'over' : ct === 'DIGITUNDER' ? 'under' : 'differ';
      return {
        ct,
        barrier,
        legKind,
        payload: this.buildBuyPayload(ct, barrier),
      };
    });
    this.notify();
    return { payload: null, isPaper: false, kind: 'combo', legs };
  }

  /**
   * Unlock without counting PnL / gale / recovery.
   * Used on API errors, safety timeout, and cancelled prepares.
   */
  abortPendingTrade(reason?: string) {
    this.comboPending = null;
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

    // Paper combo: evaluate both legs (OVER 5 + UNDER 4) and net P&L
    if (kind === 'combo') {
      const legStake = stakeVal;
      const winOver = lastDigit > 5;
      const winUnder = lastDigit < 4;
      const p1 = winOver ? +(legStake * 0.94).toFixed(2) : -legStake;
      const p2 = winUnder ? +(legStake * 0.94).toFixed(2) : -legStake;
      const profit = +(p1 + p2).toFixed(2);
      const won = (winOver ? 1 : 0) + (winUnder ? 1 : 0);
      // LOSS only if both legs lost (matches real comboPending.won === 0)
      return { profit, isLoss: won === 0, exitDig: lastDigit, audit };
    }

    const win = isWinCheck(lastDigit, kind, this.config.digit);
    const profit = win ? +(stakeVal * 0.94).toFixed(2) : -stakeVal;
    return { profit, isLoss: !win, exitDig: lastDigit, audit };
  }

  settleContract(profit: number, isLoss: boolean, kind: string, exitDig: number | null, audit: any) {
    if (this.comboPending && kind === 'combo') {
      const cp = this.comboPending;
      cp.legs--; if (profit >= 0) cp.won++; cp.results.push(profit);
      if (cp.legs > 0) {
        this.notify();
        return;
      }
      const net = cp.results.reduce((a: number, b: number) => a + b, 0);
      this.comboPending = null;
      this.finishTrade(net, cp.won === 0, 'COMBO', exitDig, audit);
      return;
    }
    this.finishTrade(profit, isLoss, kind.toUpperCase(), exitDig, audit);
  }

  private finishTrade(profit: number, isLoss: boolean, label: string, exitDig: number | null, audit: any) {
    this.state.pnl = +(this.state.pnl + profit).toFixed(2);
    const stakeUsed = this.state.curStake;
    const isPaper = this.config.paperMode;

    const newTrade: TradeLog = {
      t: new Date().toISOString(), mercado: this.config.activeSym, modo: label, alvo: this.config.digit,
      audit: audit || { tick_previous: '—', tick_start: '—', tick_end: '—' },
      saiu: exitDig !== null ? exitDig : '—', stake: stakeUsed.toFixed(2),
      resultado: isLoss ? 'LOSS' : 'WIN', lucro: profit.toFixed(2),
      acumulado: this.state.pnl.toFixed(2), paper: isPaper,
    };
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
    this.notify();
  }

  // ── Controles ──
  startBot() {
    if (this.config.exec !== 'auto') return false;
    this.vlReset(); this.vlResetAllM(); this.state.recovery.active = false;
    this.config.autoOn = true;
    this.addLog(`🤖 Robô LIGADO · ${this.config.mode.toUpperCase()}`, 'win');
    this.notify();
    return true;
  }

  stopBot() { this.config.autoOn = false; this.addLog('🤖 Robô desligado', 'info'); this.notify(); }

  abortOp() {
    this.config.autoOn = false; this.state.galeLevel = 0; this.state.curStake = this.config.stake;
    this.state.tradeLock = false; this.state.recovery.active = false;
    this.comboPending = null;
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
    if (this.config.vlOn) this.vlReset();
    return true;
  }

  /** @deprecated use tryManualFire + prepareTrade via executeTrade */
  manualFire(kind: string): TradePrep | null {
    if (!this.tryManualFire()) return null;
    return this.prepareTrade(kind);
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
    if (m === 'differ') return [{ ct: 'DIGITDIFF', barrier: d }];
    if (m === 'combo') return [{ ct: 'DIGITOVER', barrier: 5 }, { ct: 'DIGITUNDER', barrier: 4 }];
    return [];
  }

  // ── Export ──
  exportTradesCSV(): string {
    if (!this.state.trades.length) return '';
    const headers = ['data_hora', 'mercado', 'modo', 'alvo', 'saiu', 'stake', 'resultado', 'lucro', 'acumulado', 'paper'];
    const rows = this.state.trades.map(t => [
      t.t, t.mercado, t.modo, t.alvo, t.saiu, t.stake, t.resultado, t.lucro, t.acumulado, t.paper ? 'SIM' : 'NAO'
    ].join(','));
    return headers.join(',') + '\n' + rows.join('\n');
  }
}

export const createEngine = (config?: Partial<BotConfig>) => new BearBotEngine(config);
