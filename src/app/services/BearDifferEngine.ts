import {
  BASE_GENOME,
  DEFAULT_DIFFER_CONFIG,
  DEFAULT_DIFFER_MARKETS,
  DifferConfig,
  DifferGenome,
  DifferMarket,
  LogicDef,
  LogicPick,
  LogicRankingRow,
  LogicStat,
  MartingaleConfig,
  BiasTestResult,
  DifferLogItem,
  AnomalyLogItem,
  DifferTradeRecord,
  WatchEntry,
  WatchAlertItem,
} from './beardiffer.types';
import {
  benjaminiHochberg,
  binomP,
  chiP,
  shuffle,
  zP,
} from './BearDifferMath';

/**
 * Piso de amostra da bateria de aleatoriedade. O teste de Markov é um χ² de 81
 * graus de liberdade: abaixo disto a maioria das células esperadas fica perto
 * de zero e o p-valor deixa de significar coisa alguma. Pedir menos que isto na
 * tela não faz a bateria rodar com menos — só faria o número mentir.
 */
export const BIAS_MIN_SAMPLE = 200;

export interface BiasVerdict {
  /** Ticks disponíveis no mercado */
  n: number;
  /** Ticks efetivamente exigidos: o maior entre o piso e o que a tela pediu */
  need: number;
  /** Menor p da bateria já corrigido por Bonferroni, ou null sem amostra */
  p: number | null;
  proven: boolean;
}

export interface ScoreResult {
  best: {
    digit: number;
    score: number;
    sat: number;
    gap: number;
  };
  chi: number;
  anomaly: number;
  streak: number;
  n: number;
  freq?: number[];
  w?: number;
  sym?: string;
}

export interface EngineState {
  markets: DifferMarket[];
  config: DifferConfig;
  payout: number;
  pnl: number;
  curStake: number;
  mgLevel: number;
  tradeLock: boolean;
  stopped: boolean;
  stoppedReason?: string;
  sim: { win: number; loss: number; pnl: number; recent: number[] };
  real: { win: number; loss: number; pnl: number; recent: number[] };
  virt: { hit: number; total: number; recent: number[] };
  trades: DifferTradeRecord[];
  logs: DifferLogItem[];
  anomalies: AnomalyLogItem[];
  watch: Record<string, WatchEntry>;
  alerts: WatchAlertItem[];
  /** Por que o automático não entrou no último tick avaliado, ou null */
  autoIdleReason: string | null;
}

export class BearDifferEngine {
  private config: DifferConfig;
  private markets: DifferMarket[];
  private buffers: Map<string, number[]> = new Map();
  private tickCounts: Map<string, number> = new Map();
  private pips: Map<string, number> = new Map();
  private losers: Map<string, Record<number, number>> = new Map();
  private payout = 1.10;
  // Não existe PnL global: simulação e real têm livros separados, como no
  // legado. Misturar os dois faria o resultado simulado consumir o stop loss
  // da conta real.
  private curStake: number;
  private mgLevel = 0;
  private mgDebt = 0;
  private mgPartsLeft = 0;
  private mgPartStake = 0;
  private tradeLock = false;
  private stopped = false;
  private stoppedReason = '';
  private lastTradeTime = 0;

  private simStats = { win: 0, loss: 0, pnl: 0, recent: [] as number[] };
  private realStats = { win: 0, loss: 0, pnl: 0, recent: [] as number[] };
  private virtStats = { hit: 0, total: 0, recent: [] as number[] };

  private trades: DifferTradeRecord[] = [];
  private logs: DifferLogItem[] = [];
  private anomalies: AnomalyLogItem[] = [];
  private autoIdleReason: string | null = null;
  // Uma chave por mercado: sete símbolos ticam intercalados, e um campo único
  // faria a causa de cada um parecer nova em relação à do mercado anterior.
  private autoIdleKeys: Map<string, string> = new Map();
  // O automático foi desligado pelo próprio robô, não pelo operador: o motivo
  // precisa sobreviver aos ticks seguintes para continuar explicando a parada.
  private autoHalted = false;
  private watch: Record<string, WatchEntry> = {};
  private watchPrev: Record<string, string> = {};
  private alerts: WatchAlertItem[] = [];

  // Lógicas e Sinais Virtuais
  private logics: LogicDef[] = [];
  private lStats: Record<string, LogicStat> = {};
  private lStatsM: Record<string, Record<string, { n: number; w: number }>> = {};
  private liveP: Record<string, Record<string, LogicPick>> = {};
  private vsignal = new Map<string, { digit: number; score: number }>();
  private rotateIdx = 0;

  private subscribers: Array<(state: EngineState) => void> = [];
  private autoTradeSubscribers: Array<(sym: string, digit: number) => void> = [];

  constructor(initialConfig?: Partial<DifferConfig>) {
    this.config = { ...DEFAULT_DIFFER_CONFIG, ...initialConfig };
    this.markets = JSON.parse(JSON.stringify(DEFAULT_DIFFER_MARKETS));
    this.curStake = this.config.stake;

    this.markets.forEach((m) => {
      this.buffers.set(m.sym, []);
      this.tickCounts.set(m.sym, 0);
      this.pips.set(m.sym, m.pip);
    });

    this.initLogics();
  }

  private activeBook(): { win: number; loss: number; pnl: number; recent: number[] } {
    return this.config.opMode === 'real' ? this.realStats : this.simStats;
  }

  public getState(): EngineState {
    return {
      markets: [...this.markets],
      config: { ...this.config },
      payout: this.payout,
      pnl: this.activeBook().pnl,
      curStake: this.curStake,
      mgLevel: this.mgLevel,
      tradeLock: this.tradeLock,
      stopped: this.stopped,
      stoppedReason: this.stoppedReason,
      sim: { ...this.simStats, recent: [...this.simStats.recent] },
      real: { ...this.realStats, recent: [...this.realStats.recent] },
      virt: { ...this.virtStats, recent: [...this.virtStats.recent] },
      trades: [...this.trades],
      logs: [...this.logs],
      anomalies: [...this.anomalies],
      watch: { ...this.watch },
      alerts: [...this.alerts],
      autoIdleReason: this.autoIdleReason,
    };
  }

  public getConfig(): DifferConfig {
    return { ...this.config };
  }

  public updateConfig(newConfig: Partial<DifferConfig>): void {
    // Religar o automático é o operador dizendo que tratou a causa.
    if (newConfig.autoOn === true && !this.config.autoOn) {
      this.autoHalted = false;
      this.autoIdleReason = null;
      this.autoIdleKeys.clear();
    }
    this.config = { ...this.config, ...newConfig };
    if (newConfig.stake !== undefined && this.mgLevel === 0) {
      this.curStake = newConfig.stake;
    }
    this.notify();
  }

  public setPayout(payout: number): void {
    if (payout > 1) {
      this.payout = payout;
      this.notify();
    }
  }

  public subscribe(fn: (state: EngineState) => void): () => void {
    this.subscribers.push(fn);
    return () => {
      this.subscribers = this.subscribers.filter((s) => s !== fn);
    };
  }

  public onAutoTrade(cb: (sym: string, digit: number) => void): () => void {
    this.autoTradeSubscribers.push(cb);
    return () => {
      this.autoTradeSubscribers = this.autoTradeSubscribers.filter((s) => s !== cb);
    };
  }

  public resetSession(): void {
    this.mgLevel = 0;
    this.mgDebt = 0;
    this.mgPartsLeft = 0;
    this.mgPartStake = 0;
    this.curStake = this.config.stake;
    this.tradeLock = false;
    this.stopped = false;
    this.stoppedReason = '';
    this.lastTradeTime = 0;
    this.simStats = { win: 0, loss: 0, pnl: 0, recent: [] };
    this.realStats = { win: 0, loss: 0, pnl: 0, recent: [] };
    this.virtStats = { hit: 0, total: 0, recent: [] };
    this.trades = [];
    this.logs = [];
    this.anomalies = [];
    this.autoIdleReason = null;
    this.autoIdleKeys.clear();
    this.autoHalted = false;
    this.watch = {};
    this.watchPrev = {};
    this.alerts = [];
    this.losers.clear();
    this.vsignal.clear();
    this.rotateIdx = 0;
    this.initLogics();
    this.notify();
  }

  private notify(): void {
    const s = this.getState();
    this.subscribers.forEach((fn) => {
      try {
        fn(s);
      } catch (e) {
        console.error('Subscriber error in DifferEngine:', e);
      }
    });
  }

  public addLog(msg: string, cls?: 'up' | 'dn' | 'nt' | 'am'): void {
    const now = new Date().toLocaleTimeString('pt-BR');
    const item: DifferLogItem = {
      id: `${Date.now()}-${Math.random()}`,
      time: now,
      msg,
      cls: cls || 'nt',
    };
    this.logs.unshift(item);
    if (this.logs.length > 300) this.logs.pop();
    this.notify();
  }

  public addAnomaly(msg: string): void {
    const now = new Date().toLocaleTimeString('pt-BR');
    const item: AnomalyLogItem = {
      id: `${Date.now()}-${Math.random()}`,
      time: now,
      msg,
    };
    this.anomalies.unshift(item);
    if (this.anomalies.length > 60) this.anomalies.pop();
    this.notify();
  }

  // ── Gestão de Buffers e Ticks ──

  public getDigits(sym: string): number[] {
    return this.buffers.get(sym) || [];
  }

  public getMarketData(sym: string): { tickCount: number; pip: number } {
    return {
      tickCount: this.tickCounts.get(sym) || 0,
      pip: this.pips.get(sym) || 2,
    };
  }

  public setHistory(sym: string, digits: number[]): void {
    const trimmed = digits.slice(-8000);
    this.buffers.set(sym, trimmed);
    this.tickCounts.set(sym, trimmed.length);
    this.notify();
  }

  public processTick(sym: string, digit: number): void {
    let buf = this.buffers.get(sym);
    if (!buf) {
      buf = [];
      this.buffers.set(sym, buf);
    }
    buf.push(digit);
    if (buf.length > 8000) buf.shift();

    const count = (this.tickCounts.get(sym) || 0) + 1;
    this.tickCounts.set(sym, count);

    // Avaliar sinal virtual prévio (assertividade da estratégia agora)
    const prevSig = this.vsignal.get(sym);
    if (prevSig) {
      const hit = digit !== prevSig.digit;
      this.virtStats.total++;
      if (hit) this.virtStats.hit++;
      this.virtStats.recent.push(hit ? 1 : 0);
      if (this.virtStats.recent.length > 300) this.virtStats.recent.shift();
    }

    // Processar sinais virtuais
    this.logicsTick(sym, digit);

    // Detectar anomalias pontuais
    const a = this.analyze(sym);
    if (a) {
      if (a.best.score >= this.config.minScore && buf.length >= this.config.minTicks) {
        this.vsignal.set(sym, { digit: a.best.digit, score: a.best.score });
      } else {
        this.vsignal.delete(sym);
      }

      if (a.anomaly >= 62) {
        this.addAnomaly(`${sym} — distribuição fora do padrão (χ²=${a.chi})`);
      }
      if (a.streak >= 4) {
        this.addAnomaly(`${sym} — dígito ${digit} repetido ${a.streak}× seguidas`);
      }
      if (a.best.sat >= 2.8) {
        this.addAnomaly(`${sym} — dígito ${a.best.digit} muito saturado (z=${a.best.sat})`);
      }

      // Continuous Auto-Trade Trigger (Modo Automático 3.0)
      if (this.config.autoOn) {
        const isMarketOn = this.markets.find((m) => m.sym === sym)?.on ?? true;
        const guard = this.checkGuards();
        let reason: string | null = null;
        // A causa, sem os números que mudam a cada tick. O texto do motivo
        // carrega score e p-valor, que variam sempre; deduplicar por ele
        // reimprimiria a mesma causa a cada tick e afogaria o histórico.
        let key: string | null = null;
        // Onde a causa vale. Trava do robô inteiro (guard, operação aberta,
        // intervalo) vale em '*': sete mercados ticando não podem virar sete
        // linhas idênticas. Causa de mercado vale no próprio símbolo.
        let scope = sym;
        // Guard é parada dura: o legado faz `S.auto=false` e avisa uma vez.
        let halt = false;
        let fire = false;

        if (!isMarketOn) {
          reason = `${sym} está desligado`;
          key = `off:${sym}`;
        } else if (this.tradeLock) {
          reason = 'operação em aberto — uma por vez';
          key = 'lock';
          scope = '*';
        } else if (guard) {
          reason = guard;
          key = `guard:${guard}`;
          scope = '*';
          halt = true;
        } else if (buf.length < this.config.minTicks) {
          reason = `amostra insuficiente em ${sym} (${buf.length}/${this.config.minTicks} ticks)`;
          key = `sample:${sym}`;
        } else if (a.best.score < this.config.minScore) {
          reason = `score ${a.best.score} abaixo do mínimo de ${this.config.minScore} em ${sym}`;
          key = `score:${sym}`;
        } else if (this.config.gateBias && !this.biasVerdict(sym).proven) {
          const v = this.biasVerdict(sym);
          reason =
            v.p === null
              ? `trava de viés: ${sym} tem ${v.n} de ${v.need} ticks para a bateria do laboratório rodar`
              : `trava de viés: ${sym} se comporta como gerador honesto (p corrigido ${v.p.toFixed(
                  3
                )}, exigido < ${this.config.labAlpha})`;
          if (v.p !== null) {
            reason += '. Desligue a trava de viés para operar mesmo assim';
          }
          key = `bias:${sym}:${v.p === null ? 'amostra' : 'honesto'}`;
        } else {
          const blocked = this.exhaustBlock(sym, a.best.digit);
          if (blocked) {
            reason = `filtro de exaustão: ${blocked}`;
            key = `exhaust:${sym}`;
          } else if (Date.now() - this.lastTradeTime < this.config.cooldown * 1000) {
            reason = `aguardando o intervalo mínimo de ${this.config.cooldown}s`;
            key = 'cooldown';
            scope = '*';
          } else {
            fire = true;
          }
        }

        // Log só na mudança de causa: por tick inundaria o histórico
        if (reason && key !== this.autoIdleKeys.get(scope)) {
          this.addLog(`Automático parado: ${reason}.`, 'am');
        }
        if (key) this.autoIdleKeys.set(scope, key);
        else this.autoIdleKeys.delete(scope);
        this.autoIdleReason = reason;

        // Parada dura desliga o automático e preserva a explicação na tela.
        if (halt) {
          this.config.autoOn = false;
          this.autoHalted = true;
        }

        if (fire) {
          this.lastTradeTime = Date.now();
          this.autoTradeSubscribers.forEach((cb) => {
            try {
              cb(sym, a.best.digit);
            } catch (e) {
              console.error('Error in autoTrade subscriber:', e);
            }
          });
        }
      } else if (!this.autoHalted) {
        this.autoIdleReason = null;
        this.autoIdleKeys.clear();
      }
    } else {
      this.vsignal.delete(sym);
    }

    this.notify();
  }

  public setTradeLock(locked: boolean): void {
    this.tradeLock = locked;
    this.notify();
  }

  public isTradeLocked(): boolean {
    return this.tradeLock;
  }

  // ── Motor 2.0 (scoreAll / analyze) ──

  public scoreAll(
    freq: number[],
    w: number,
    gap: number[],
    n: number,
    last: number,
    prev: number,
    streak: number,
    minT: number,
    G: DifferGenome = BASE_GENOME
  ): ScoreResult {
    if (w <= 0) {
      return {
        best: { digit: 0, score: 0, sat: 0, gap: 0 },
        chi: 0,
        anomaly: 0,
        streak: 0,
        n,
      };
    }
    const exp = w / 10;
    let chi = 0;
    for (let i = 0; i < 10; i++) {
      const d = freq[i] - exp;
      chi += (d * d) / exp;
    }
    const anomaly = Math.min(100, (chi / 9) * (100 / 3));
    const stab = 1 - Math.min(1, anomaly / 100);
    const conf = Math.min(1, n / Math.max(50, minT));

    let bd = 0,
      bs = -1,
      bz = 0,
      bg = 0;
    for (let d = 0; d < 10; d++) {
      const p = freq[d] / w;
      const z = (freq[d] - exp) / Math.sqrt(exp * 0.9);
      const sat = Math.max(0, Math.min(1, z / G.satDiv));
      const gapS = Math.max(0, Math.min(1, (G.gapWin - gap[d]) / G.gapWin));
      let pen = 0;
      if (last === d) pen += G.penLast + Math.min(0.4, (streak - 1) * G.penStreak);
      if (prev === d) pen += G.penPrev;
      let sc = (sat * G.wSat + gapS * G.wGap + stab * G.wStab + conf * G.wConf) * (1 - Math.min(0.85, pen));
      if (p < G.lowP) sc *= G.lowMul;
      sc = Math.round(sc);
      if (sc > bs) {
        bs = sc;
        bd = d;
        bz = +z.toFixed(2);
        bg = gap[d];
      }
    }
    return {
      best: { digit: bd, score: bs, sat: bz, gap: bg },
      chi: +chi.toFixed(1),
      anomaly: Math.round(anomaly),
      streak,
      n,
    };
  }

  public analyze(sym: string, G: DifferGenome = BASE_GENOME): ScoreResult | null {
    const buf = this.buffers.get(sym);
    if (!buf || buf.length < 50) return null;

    const n = buf.length;
    const w = Math.min(G.win, n);
    const freq = new Array(10).fill(0);
    for (let i = n - w; i < n; i++) freq[buf[i]]++;

    const gap = new Array(10).fill(n);
    for (let i = n - 1, seen = 0; i >= 0 && seen < 10; i--) {
      if (gap[buf[i]] === n) {
        gap[buf[i]] = n - 1 - i;
        seen++;
      }
    }

    let streak = 1;
    for (let i = n - 2; i >= 0 && buf[i] === buf[n - 1]; i--) streak++;

    const res = this.scoreAll(
      freq,
      w,
      gap,
      n,
      buf[n - 1],
      buf[n - 2],
      streak,
      this.config.minTicks,
      G
    );
    res.freq = freq;
    res.w = w;
    res.sym = sym;
    return res;
  }

  // ── Termômetro de Exaustão e Losses ──

  public getExhaustion(
    sym: string,
    digit: number
  ): { ok: boolean; mean: number; pct: number } | null {
    const b = this.buffers.get(sym) || [];
    if (b.length < 60) return null;

    let sum = 0,
      wins = 0,
      ok = true;
    [10, 25, 50].forEach((n) => {
      const sl = b.slice(-n);
      if (sl.length < n) return;
      let c = 0;
      sl.forEach((x) => {
        if (x === digit) c++;
      });
      const exp = sl.length / 10;
      const ex = (c - exp) / exp;
      if (ex < 0.25) ok = false;
      sum += ex;
      wins++;
    });

    if (!wins) return null;
    const mean = sum / wins;
    return {
      ok: ok && mean >= 0.5,
      mean,
      pct: Math.max(0, Math.min(100, Math.round(mean * 100))),
    };
  }

  /**
   * Um mercado só é dado como enviesado com amostra suficiente e p corrigido
   * por Bonferroni sobre a família inteira (mercados ligados × 4 testes).
   */
  public isMarketProven(sym: string): boolean {
    return this.biasVerdict(sym).proven;
  }

  /**
   * Situação da trava de viés num mercado, com o que ela de fato exige e o
   * p-valor observado. A trava não é uma espera: com gerador honesto o p fica
   * perto de 1 para sempre, e é isso que o operador precisa enxergar.
   */
  public biasVerdict(sym: string): BiasVerdict {
    const need = Math.max(BIAS_MIN_SAMPLE, this.config.labMin);
    const n = this.getDigits(sym).length;
    const t = n >= need ? this.runBiasTests(sym) : null;
    if (!t) return { n, need, p: null, proven: false };

    const tests = Math.max(1, this.markets.filter((m) => m.on).length * 4);
    const p = Math.min(1, Math.min(t.pU, t.pM, t.pR, t.pA) * tests);
    return { n, need, p, proven: p < this.config.labAlpha };
  }

  /**
   * Vigilância contínua: cruza a bateria do laboratório com o desempenho
   * medido de cada lógica naquele mercado. Um mercado só é marcado como
   * quebra depois da correção de Bonferroni sobre a família inteira
   * (mercados × lógicas). Com gerador honesto tudo fica normal — isso é o
   * funcionamento correto, não falta de sensibilidade.
   */
  public runWatch(): void {
    const on = this.markets.filter((m) => m.on);
    const acts = this.logics.filter((L) => !L.wide || this.config.wideScan);
    const fam = Math.max(1, on.length * acts.length);
    const be = 1 / this.payout;
    const watch: Record<string, WatchEntry> = {};

    on.forEach((m) => {
      const bias = this.runBiasTests(m.sym);
      const enough = !!bias && bias.n >= this.config.labMin;
      const labTests = Math.max(1, on.length * 4);
      const minP = bias
        ? Math.min(bias.pU, bias.pM, bias.pR, bias.pA) * labTests
        : 1;

      let breach: { name: string; acc: number; n: number; p: number } | null = null;
      acts.forEach((L) => {
        const st = this.lStatsM[L.id]?.[m.sym];
        if (!st || st.n < this.config.wtMinN) return;
        const p = Math.min(1, binomP(st.w, st.n, be) * fam);
        if (p < this.config.wtAlpha && st.w / st.n > be && (!breach || p < breach.p)) {
          breach = { name: L.name, acc: (st.w / st.n) * 100, n: st.n, p };
        }
      });

      let status: WatchEntry['status'] = 'normal';
      let txt = 'dentro do comportamento esperado';

      if (enough && minP < this.config.labAlpha) {
        status = 'quebra';
        txt = `viés estatístico no laboratório (p corrigido ${minP.toExponential(1)})`;
      } else if (breach) {
        const b = breach as { name: string; acc: number; n: number; p: number };
        status = 'quebra';
        txt = `${b.name} a ${b.acc.toFixed(2)}% em ${b.n} sinais (p ${b.p.toExponential(1)})`;
      } else if (enough && minP < 0.15) {
        status = 'observacao';
        txt = `p corrigido em ${minP.toFixed(3)} — perto do limiar, sem confirmar`;
      } else if (!enough) {
        status = 'amostra';
        txt = `juntando ticks (${this.getDigits(m.sym).length})`;
      }

      watch[m.sym] = { status, txt };

      // Alerta só na transição para quebra, para não inundar o histórico
      if (status === 'quebra' && this.watchPrev[m.sym] !== 'quebra') {
        this.alerts.unshift({
          id: `${Date.now()}-${m.sym}`,
          time: new Date().toLocaleTimeString('pt-BR'),
          sym: m.sym,
          txt,
        });
        if (this.alerts.length > 40) this.alerts.pop();
        this.addAnomaly(`${m.sym} — QUEBRA: ${txt}.`);
      }
    });

    this.watch = watch;
    this.watchPrev = {};
    on.forEach((m) => {
      this.watchPrev[m.sym] = watch[m.sym].status;
    });
    this.notify();
  }

  /**
   * Filtro de exaustão aplicado antes de qualquer entrada, manual ou
   * automática. Devolve o motivo do bloqueio, ou null se a entrada passa.
   */
  public exhaustBlock(sym: string, digit: number): string | null {
    if (!this.config.exFilter) return null;
    const e = this.getExhaustion(sym, digit);
    if (!e) return 'sem amostra para medir a exaustão';
    if (!e.ok) {
      return `dígito ${digit} não está exausto (excesso médio ${(e.mean * 100).toFixed(0)}%, exige 50% nas três janelas)`;
    }
    if (this.config.exOnlyLosers && this.getLoserCount(sym, digit) === 0) {
      return `dígito ${digit} está exausto mas ainda não deu loss nesta sessão`;
    }
    return null;
  }

  public getLoserCount(sym: string, digit: number): number {
    const m = this.losers.get(sym);
    return m ? m[digit] || 0 : 0;
  }

  public recordLoss(sym: string, digit: number): void {
    let m = this.losers.get(sym);
    if (!m) {
      m = {};
      this.losers.set(sym, m);
    }
    m[digit] = (m[digit] || 0) + 1;
    this.notify();
  }

  // ── 17 Lógicas de Análise ──

  public getLogics(): LogicDef[] {
    return [...this.logics];
  }

  private initLogics(): void {
    const conf01 = (z: number, div: number) =>
      Math.max(0, Math.min(100, 50 + 50 * Math.min(1, z / div)));

    const freqOf = (b: number[], w: number) => {
      const f = new Array(10).fill(0);
      const s = Math.max(0, b.length - w);
      for (let i = s; i < b.length; i++) f[b[i]]++;
      return { f, n: b.length - s };
    };

    const gapsOf = (b: number[]) => {
      const g = new Array(10).fill(b.length);
      for (let i = b.length - 1, seen = 0; i >= 0 && seen < 10; i--) {
        if (g[b[i]] === b.length) {
          g[b[i]] = b.length - 1 - i;
          seen++;
        }
      }
      return g;
    };

    const zFreq = (c: number, n: number) => {
      const e = n / 10;
      return e > 0 ? (c - e) / Math.sqrt(e * 0.9) : 0;
    };

    this.logics = [
      {
        id: 'sat',
        name: 'Saturação composta',
        tag: 'motor 2.0',
        desc: 'Z-score de frequência, gap, estabilidade e amostra.',
        pick: (sym) => {
          const a = this.analyze(sym);
          if (!a) return null;
          return {
            digit: a.best.digit,
            conf: a.best.score,
            why: `z=${a.best.sat} · gap ${a.best.gap} · χ²=${a.chi}`,
          };
        },
      },
      {
        id: 'mk1',
        name: 'Markov 1ª ordem',
        tag: 'dependência',
        desc: 'Transição dígito→dígito de menor probabilidade condicional.',
        pick: (sym) => {
          const b = this.getDigits(sym);
          if (b.length < 400) return null;
          const last = b[b.length - 1];
          const row = new Array(10).fill(0);
          let tot = 0;
          for (let i = 0; i < b.length - 1; i++) {
            if (b[i] === last) {
              row[b[i + 1]]++;
              tot++;
            }
          }
          if (tot < 80) return null;
          let mn = 0;
          for (let i = 1; i < 10; i++) if (row[i] < row[mn]) mn = i;
          const z = -zFreq(row[mn], tot);
          return {
            digit: mn,
            conf: conf01(z, 2.6),
            why: `P(${mn}|${last}) = ${((row[mn] / tot) * 100).toFixed(1)}% em ${tot} transições`,
          };
        },
      },
      {
        id: 'mk2',
        name: 'Markov 2ª ordem',
        tag: 'dependência',
        desc: 'Condicionado aos dois últimos dígitos (100 estados).',
        pick: (sym) => {
          const b = this.getDigits(sym);
          if (b.length < 1200) return null;
          const a1 = b[b.length - 2],
            a2 = b[b.length - 1];
          const row = new Array(10).fill(0);
          let tot = 0;
          for (let i = 0; i < b.length - 2; i++) {
            if (b[i] === a1 && b[i + 1] === a2) {
              row[b[i + 2]]++;
              tot++;
            }
          }
          if (tot < 40) return null;
          let mn = 0;
          for (let i = 1; i < 10; i++) if (row[i] < row[mn]) mn = i;
          const z = -zFreq(row[mn], tot);
          return {
            digit: mn,
            conf: conf01(z, 2.4),
            why: `P(${mn}|${a1}${a2}) = ${((row[mn] / tot) * 100).toFixed(1)}% em ${tot} casos`,
          };
        },
      },
      {
        id: 'rep',
        name: 'Anti-repetição',
        tag: 'sequência',
        desc: 'Fica de fora do dígito que acabou de sair.',
        pick: (sym) => {
          const b = this.getDigits(sym);
          if (b.length < 300) return null;
          let rep = 0;
          for (let i = 1; i < b.length; i++) if (b[i] === b[i - 1]) rep++;
          const n = b.length - 1;
          const rate = rep / n;
          const zz = (n * 0.1 - rep) / Math.sqrt(n * 0.1 * 0.9);
          let st = 1;
          for (let i = b.length - 2; i >= 0 && b[i] === b[b.length - 1]; i--) st++;
          return {
            digit: b[b.length - 1],
            conf: conf01(zz, 2.2),
            why: `repetição em ${(rate * 100).toFixed(2)}% (teórico 10%) · sequência ${st}×`,
          };
        },
      },
      {
        id: 'flong',
        name: 'Frequência longa',
        tag: 'saturação',
        desc: 'Dígito mais saturado em 1.000 ticks.',
        pick: (sym) => {
          const b = this.getDigits(sym);
          if (b.length < 800) return null;
          const { f, n } = freqOf(b, 1000);
          let mx = 0;
          for (let i = 1; i < 10; i++) if (f[i] > f[mx]) mx = i;
          const z = zFreq(f[mx], n);
          return {
            digit: mx,
            conf: conf01(z, 2.8),
            why: `dígito ${mx} em ${((f[mx] / n) * 100).toFixed(2)}% de ${n} ticks · z=${z.toFixed(2)}`,
          };
        },
      },
      {
        id: 'div',
        name: 'Divergência curta↔longa',
        tag: 'regime',
        desc: 'Compara janela 120 com 1.000 para detectar mudança de regime.',
        pick: (sym) => {
          const b = this.getDigits(sym);
          if (b.length < 800) return null;
          const s = freqOf(b, 120),
            l = freqOf(b, 1000);
          let bd = 0,
            bv = -9;
          for (let i = 0; i < 10; i++) {
            const v = s.f[i] / s.n - l.f[i] / l.n;
            if (v > bv) {
              bv = v;
              bd = i;
            }
          }
          const z = bv / Math.sqrt((0.1 * 0.9) / s.n);
          return {
            digit: bd,
            conf: conf01(z, 2.6),
            why: `dígito ${bd}: ${((s.f[bd] / s.n) * 100).toFixed(1)}% curto vs ${((l.f[bd] / l.n) * 100).toFixed(1)}% longo`,
          };
        },
      },
      {
        id: 'lag',
        name: 'Autocorrelação em lag',
        tag: 'periodicidade',
        desc: 'Varre lags 2 a 12 buscando dependência periódica.',
        pick: (sym) => {
          const b = this.getDigits(sym).slice(-3000);
          if (b.length < 900) return null;
          let bestK = 0,
            bestChi = -1;
          for (let k = 2; k <= 12; k++) {
            const m = Array.from({ length: 10 }, () => new Array(10).fill(0));
            let t = 0;
            for (let i = k; i < b.length; i++) {
              m[b[i - k]][b[i]]++;
              t++;
            }
            const rs = m.map((r) => r.reduce((a, c) => a + c, 0));
            const cs = new Array(10).fill(0);
            m.forEach((r) => r.forEach((v, j) => (cs[j] += v)));
            let chi = 0;
            for (let i = 0; i < 10; i++) {
              for (let j = 0; j < 10; j++) {
                const e = (rs[i] * cs[j]) / t;
                if (e > 0) {
                  const d = m[i][j] - e;
                  chi += (d * d) / e;
                }
              }
            }
            if (chi > bestChi) {
              bestChi = chi;
              bestK = k;
            }
          }
          const cond = b[b.length - bestK];
          const row = new Array(10).fill(0);
          let tot = 0;
          for (let i = bestK; i < b.length; i++) {
            if (b[i - bestK] === cond) {
              row[b[i]]++;
              tot++;
            }
          }
          if (tot < 80) return null;
          let mn = 0;
          for (let i = 1; i < 10; i++) if (row[i] < row[mn]) mn = i;
          const z = -zFreq(row[mn], tot);
          return {
            digit: mn,
            conf: conf01(z, 2.6),
            why: `lag ${bestK} (χ²=${bestChi.toFixed(0)}) · P(${mn}) = ${((row[mn] / tot) * 100).toFixed(1)}%`,
          };
        },
      },
      {
        id: 'aus',
        name: 'Ausência persistente',
        tag: 'contrária',
        desc: 'Aposta contra o dígito ausente há mais tempo.',
        pick: (sym) => {
          const b = this.getDigits(sym);
          if (b.length < 300) return null;
          const g = gapsOf(b);
          let mx = 0;
          for (let i = 1; i < 10; i++) if (g[i] > g[mx]) mx = i;
          if (g[mx] < 12) return null;
          const p = Math.pow(0.9, g[mx]);
          return {
            digit: mx,
            conf: conf01(((g[mx] - 9) / 9) * 2.5, 2.5),
            why: `dígito ${mx} ausente há ${g[mx]} ticks (chance ao acaso: ${(p * 100).toFixed(2)}%)`,
          };
        },
      },
      {
        id: 'par',
        name: 'Paridade e faixa',
        tag: 'blocos',
        desc: 'Mede blocos par/ímpar e alto/baixo.',
        pick: (sym) => {
          const b = this.getDigits(sym);
          if (b.length < 300) return null;
          const { f, n } = freqOf(b, 200);
          const par = f[0] + f[2] + f[4] + f[6] + f[8];
          const alto = f[5] + f[6] + f[7] + f[8] + f[9];
          const zPar = zFreq(par, n) * Math.SQRT2;
          const zAlt = zFreq(alto, n) * Math.SQRT2;
          const usePar = Math.abs(zPar) >= Math.abs(zAlt);
          const z = usePar ? zPar : zAlt;
          const set = usePar
            ? z > 0
              ? [0, 2, 4, 6, 8]
              : [1, 3, 5, 7, 9]
            : z > 0
            ? [5, 6, 7, 8, 9]
            : [0, 1, 2, 3, 4];
          let bd = set[0];
          set.forEach((d) => {
            if (f[d] > f[bd]) bd = d;
          });
          return {
            digit: bd,
            conf: conf01(Math.abs(z), 2.6),
            why: `bloco ${usePar ? (z > 0 ? 'par' : 'ímpar') : z > 0 ? 'alto' : 'baixo'} saturado · pior dígito ${bd}`,
          };
        },
      },
      {
        id: 'cons',
        name: 'Consenso ponderado',
        tag: 'agregadora',
        desc: 'Pondera o voto das outras lógicas pelo desempenho na sessão.',
        pick: (sym) => {
          const votes = new Array(10).fill(0);
          let any = false;
          for (const L of this.logics) {
            if (L.id === 'cons') continue;
            const s = this.lStats[L.id];
            if (!s || s.n < 80) continue;
            const be = 1 / this.payout;
            const acc = s.w / s.n;
            const w = Math.max(0, acc - be) * 100 + 0.15;
            const p = this.liveP[sym] && this.liveP[sym][L.id];
            if (!p) continue;
            votes[p.digit] += w * (p.conf / 100);
            any = true;
          }
          if (!any) return null;
          let mx = 0;
          for (let i = 1; i < 10; i++) if (votes[i] > votes[mx]) mx = i;
          if (votes[mx] <= 0) return null;
          const tot = votes.reduce((a, b) => a + b, 0);
          return {
            digit: mx,
            conf: conf01(((votes[mx] / tot - 0.1) / 0.1) * 2.6, 2.6),
            why: `${((votes[mx] / tot) * 100).toFixed(0)}% do voto ponderado das outras lógicas`,
          };
        },
      },
      // Variantes da Varredura Ampla
      {
        id: 'flong300',
        name: 'Frequência · janela 300',
        tag: 'variante',
        wide: true,
        desc: 'Frequência longa em 300 ticks.',
        pick: (sym) => {
          const b = this.getDigits(sym);
          if (b.length < 400) return null;
          const { f, n } = freqOf(b, 300);
          let mx = 0;
          for (let i = 1; i < 10; i++) if (f[i] > f[mx]) mx = i;
          const z = zFreq(f[mx], n);
          return {
            digit: mx,
            conf: conf01(z, 2.6),
            why: `dígito ${mx} em ${((f[mx] / n) * 100).toFixed(2)}% de 300 ticks`,
          };
        },
      },
      {
        id: 'flong3k',
        name: 'Frequência · janela 3.000',
        tag: 'variante',
        wide: true,
        desc: 'Frequência longa em 3.000 ticks.',
        pick: (sym) => {
          const b = this.getDigits(sym);
          if (b.length < 2500) return null;
          const { f, n } = freqOf(b, 3000);
          let mx = 0;
          for (let i = 1; i < 10; i++) if (f[i] > f[mx]) mx = i;
          const z = zFreq(f[mx], n);
          return {
            digit: mx,
            conf: conf01(z, 3.0),
            why: `dígito ${mx} em ${((f[mx] / n) * 100).toFixed(2)}% de ${n} ticks`,
          };
        },
      },
      {
        id: 'div60',
        name: 'Divergência · 60↔500',
        tag: 'variante',
        wide: true,
        desc: 'Divergência em escala curta.',
        pick: (sym) => {
          const b = this.getDigits(sym);
          if (b.length < 500) return null;
          const sh = freqOf(b, 60),
            lo = freqOf(b, 500);
          let bd = 0,
            bv = -9;
          for (let i = 0; i < 10; i++) {
            const v = sh.f[i] / sh.n - lo.f[i] / lo.n;
            if (v > bv) {
              bv = v;
              bd = i;
            }
          }
          const z = bv / Math.sqrt((0.1 * 0.9) / sh.n);
          return {
            digit: bd,
            conf: conf01(z, 2.4),
            why: `dígito ${bd}: ${((sh.f[bd] / sh.n) * 100).toFixed(1)}% em 60 vs ${((lo.f[bd] / lo.n) * 100).toFixed(1)}% em 500`,
          };
        },
      },
      {
        id: 'par600',
        name: 'Paridade · janela 600',
        tag: 'variante',
        wide: true,
        desc: 'Paridade e faixa em 600 ticks.',
        pick: (sym) => {
          const b = this.getDigits(sym);
          if (b.length < 700) return null;
          const { f, n } = freqOf(b, 600);
          const par = f[0] + f[2] + f[4] + f[6] + f[8];
          const alto = f[5] + f[6] + f[7] + f[8] + f[9];
          const zPa = zFreq(par, n) * Math.SQRT2;
          const zAl = zFreq(alto, n) * Math.SQRT2;
          const usePar = Math.abs(zPa) >= Math.abs(zAl);
          const z = usePar ? zPa : zAl;
          const set = usePar
            ? z > 0
              ? [0, 2, 4, 6, 8]
              : [1, 3, 5, 7, 9]
            : z > 0
            ? [5, 6, 7, 8, 9]
            : [0, 1, 2, 3, 4];
          let bd = set[0];
          set.forEach((d) => {
            if (f[d] > f[bd]) bd = d;
          });
          return {
            digit: bd,
            conf: conf01(Math.abs(z), 2.8),
            why: `bloco saturado em 600 ticks · dígito ${bd}`,
          };
        },
      },
      {
        id: 'mk1c',
        name: 'Markov · regime curto',
        tag: 'variante',
        wide: true,
        desc: 'Markov 1ª ordem nas 600 transições mais recentes.',
        pick: (sym) => {
          const b = this.getDigits(sym).slice(-600);
          if (b.length < 500) return null;
          const last = b[b.length - 1];
          const row = new Array(10).fill(0);
          let tot = 0;
          for (let i = 0; i < b.length - 1; i++) {
            if (b[i] === last) {
              row[b[i + 1]]++;
              tot++;
            }
          }
          if (tot < 40) return null;
          let mn = 0;
          for (let i = 1; i < 10; i++) if (row[i] < row[mn]) mn = i;
          return {
            digit: mn,
            conf: conf01(-zFreq(row[mn], tot), 2.2),
            why: `P(${mn}|${last}) = ${((row[mn] / tot) * 100).toFixed(1)}% nas últimas ${tot} transições`,
          };
        },
      },
      {
        id: 'aus30',
        name: 'Ausência · gap longo',
        tag: 'variante',
        wide: true,
        desc: 'Ausência persistente com gap >= 30 ticks.',
        pick: (sym) => {
          const b = this.getDigits(sym);
          if (b.length < 400) return null;
          const g = gapsOf(b);
          let mx = 0;
          for (let i = 1; i < 10; i++) if (g[i] > g[mx]) mx = i;
          if (g[mx] < 30) return null;
          return {
            digit: mx,
            conf: conf01(((g[mx] - 27) / 15) * 2.5, 2.5),
            why: `dígito ${mx} ausente há ${g[mx]} ticks`,
          };
        },
      },
      // 17. Exaustão
      {
        id: 'exaust',
        name: 'Exaustão de perdedores',
        tag: 'reversão',
        desc: 'Dígito que saiu acima do esperado nas janelas 10, 25 e 50.',
        pick: (sym) => {
          const b = this.getDigits(sym);
          if (b.length < 80) return null;
          let best: { d: number; mean: number; pct: number } | null = null;
          for (let d = 0; d < 10; d++) {
            const e = this.getExhaustion(sym, d);
            if (e && e.ok && (!best || e.mean > best.mean)) {
              best = { d, mean: e.mean, pct: e.pct };
            }
          }
          if (!best) return null;
          return {
            digit: best.d,
            conf: conf01(((best.mean - 0.5) / 0.6) * 2.6, 2.6),
            why: `dígito ${best.d} com excesso de ${best.pct}% nas três janelas · ${this.getLoserCount(sym, best.d)} loss(es)`,
          };
        },
      },
    ];

    this.logics.forEach((L) => {
      this.lStats[L.id] = { n: 0, w: 0, recent: [] };
      this.lStatsM[L.id] = {};
    });
  }

  public resetLogicsMeasurement(): void {
    this.logics.forEach((L) => {
      this.lStats[L.id] = { n: 0, w: 0, recent: [] };
      this.lStatsM[L.id] = {};
    });
    this.liveP = {};
    this.addLog('Medição das lógicas zerada.', 'nt');
    this.notify();
  }

  // Sinais virtuais e liquidação
  private logicsTick(sym: string, dg: number): void {
    const prev = this.liveP[sym];
    if (prev) {
      for (const lid in prev) {
        const hit = dg !== prev[lid].digit;
        const s = this.lStats[lid];
        if (s) {
          s.n++;
          if (hit) s.w++;
          s.recent.push(hit ? 1 : 0);
          if (s.recent.length > 200) s.recent.shift();
        }
        if (!this.lStatsM[lid]) this.lStatsM[lid] = {};
        if (!this.lStatsM[lid][sym]) this.lStatsM[lid][sym] = { n: 0, w: 0 };
        const m = this.lStatsM[lid][sym];
        m.n++;
        if (hit) m.w++;
      }
    }

    const out: Record<string, LogicPick> = {};
    const active = this.logics.filter((L) => !L.wide || this.config.wideScan);
    for (const L of active) {
      try {
        const p = L.pick(sym, (s) => this.getDigits(s));
        if (p && p.digit !== undefined && p.digit !== null) {
          out[L.id] = p;
        }
      } catch (e) {
        // Ignora erro de pick
      }
    }
    this.liveP[sym] = out;
  }

  public getLogicMarketStats(lid: string, sym: string): { n: number; w: number } {
    return this.lStatsM[lid]?.[sym] || { n: 0, w: 0 };
  }

  public getAllLogicMarketStats(): Record<string, Record<string, { n: number; w: number }>> {
    return JSON.parse(JSON.stringify(this.lStatsM));
  }

  // Ranking das Lógicas com Benjamini-Hochberg (FDR)
  public getLogicRanking(): LogicRankingRow[] {
    const be = 1 / this.payout;
    const minN = this.config.lgMinN;
    const q = this.config.lgQ;
    const active = this.logics.filter((L) => !L.wide || this.config.wideScan);

    const rows: LogicRankingRow[] = active.map((L) => {
      const s = this.lStats[L.id] || { n: 0, w: 0, recent: [] };
      const acc = s.n ? s.w / s.n : null;
      const p = s.n >= minN && acc !== null ? binomP(s.w, s.n, be) : 1;
      return {
        lid: L.id,
        name: L.name,
        tag: L.tag,
        n: s.n,
        acc,
        p,
        ready: s.n >= minN,
      };
    });

    const bh = benjaminiHochberg(
      rows.map((r) => ({ p: r.p, lid: r.lid })),
      q
    );
    const passMap: Record<string, boolean> = {};
    bh.forEach((x) => {
      passMap[x.lid] = x.pass;
    });

    rows.forEach((r) => {
      r.pass = r.ready && !!passMap[r.lid] && (r.acc || 0) > be;
    });

    rows.sort((a, b) => {
      if (a.pass !== b.pass) return a.pass ? -1 : 1;
      if (a.acc === null) return 1;
      if (b.acc === null) return -1;
      return b.acc - a.acc;
    });

    return rows;
  }

  /**
   * Nome da lógica para exibição. Entradas do modo automático não passam por
   * lógica nenhuma: elas disparam pelo score do motor de referência, que o
   * legado chama de "Motor 2.0 (referência)".
   */
  public getLogicName(lid?: string | null): string {
    if (!lid || lid === 'motor2') return 'Motor 2.0';
    return this.logics.find((L) => L.id === lid)?.name ?? 'Motor 2.0';
  }

  public leaderLogic(): string | null {
    const r = this.getLogicRanking().find((x) => x.pass);
    return r ? r.lid : null;
  }

  public resolveLogic(mode: string): string | null {
    const active = this.logics.filter((L) => !L.wide || this.config.wideScan);
    const minN = this.config.lgMinN;
    if (mode === 'auto') {
      return this.leaderLogic();
    } else if (mode === 'rotate') {
      // Sem amostra, recusa. Escolher uma lógica qualquer contraria a tese do
      // bot: alternar entre estratégias de esperança negativa não cria
      // vantagem, só muda como o resultado oscila.
      const pool = active.filter((L) => (this.lStats[L.id]?.n || 0) >= minN);
      if (!pool.length) return null;
      this.rotateIdx = (this.rotateIdx + 1) % pool.length;
      return pool[this.rotateIdx].id;
    } else if (mode === 'recent') {
      let best: { id: string; acc: number } | null = null;
      active.forEach((L) => {
        const r = this.lStats[L.id]?.recent || [];
        if (r.length >= 60) {
          const acc = r.reduce((a, b) => a + b, 0) / r.length;
          if (!best || acc > best.acc) best = { id: L.id, acc };
        }
      });
      return best ? best.id : null;
    }
    return mode;
  }

  // Operação Única (deepScan)
  public deepScan(logicId: string): {
    sym: string;
    digit: number;
    conf: number;
    why: string;
    n: number;
    lid: string;
  } | null {
    const chosenId = this.resolveLogic(logicId);
    if (!chosenId) return null;

    // Mesma trava de viés do caminho automático: com o gate ligado, só
    // mercados aprovados no laboratório podem ser operados.
    const eligible = this.markets.filter(
      (m) => m.on && (!this.config.gateBias || this.isMarketProven(m.sym))
    );
    let best: {
      sym: string;
      digit: number;
      conf: number;
      why: string;
      n: number;
      lid: string;
    } | null = null;

    eligible.forEach((m) => {
      const lp = this.liveP[m.sym];
      if (!lp) return;
      const p = lp[chosenId];
      if (!p) return;
      const digits = this.getDigits(m.sym);
      if (digits.length < this.config.minTicks) return;

      if (!best || p.conf > best.conf) {
        best = {
          sym: m.sym,
          digit: p.digit,
          conf: p.conf,
          why: p.why,
          n: digits.length,
          // A lógica de fato resolvida, não o modo de alternância pedido
          lid: chosenId,
        };
      }
    });

    return best;
  }

  // ── Laboratório Estatístico (Bateria de Aleatoriedade) ──

  public runBiasTests(sym: string): BiasTestResult | null {
    const buf = this.getDigits(sym);
    const n = buf.length;
    if (n < BIAS_MIN_SAMPLE) return null;

    // 1. Uniformidade (χ², 9 gl)
    const f = new Array(10).fill(0);
    buf.forEach((d) => f[d]++);
    const e = n / 10;
    let chiU = 0;
    for (let i = 0; i < 10; i++) {
      const d = f[i] - e;
      chiU += (d * d) / e;
    }
    const pU = chiP(chiU, 9);

    // 2. Independência de Markov (χ², 81 gl)
    const T = Array.from({ length: 10 }, () => new Array(10).fill(0));
    for (let i = 1; i < n; i++) T[buf[i - 1]][buf[i]]++;
    const rs = new Array(10).fill(0),
      cs = new Array(10).fill(0),
      N = n - 1;
    for (let i = 0; i < 10; i++) {
      for (let j = 0; j < 10; j++) {
        rs[i] += T[i][j];
        cs[j] += T[i][j];
      }
    }
    let chiM = 0;
    const cells = Array.from({ length: 10 }, () => new Array(10).fill(0));
    for (let i = 0; i < 10; i++) {
      for (let j = 0; j < 10; j++) {
        const ex = (rs[i] * cs[j]) / N;
        if (ex <= 0) continue;
        const d = T[i][j] - ex;
        chiM += (d * d) / ex;
        cells[i][j] = +(d / Math.sqrt(ex)).toFixed(2);
      }
    }
    const pM = chiP(chiM, 81);

    // 3. Taxa de repetição imediata (binomial)
    let rep = 0;
    for (let i = 1; i < n; i++) if (buf[i] === buf[i - 1]) rep++;
    const expRep = N * 0.1;
    const zR = (rep - expRep) / Math.sqrt(N * 0.1 * 0.9);
    const pR = zP(zR);

    // 4. Autocorrelação de lag 1
    let s1 = 0,
      s2 = 0,
      s12 = 0,
      ss1 = 0,
      ss2 = 0;
    for (let i = 1; i < n; i++) {
      const a = buf[i - 1],
        b = buf[i];
      s1 += a;
      s2 += b;
      s12 += a * b;
      ss1 += a * a;
      ss2 += b * b;
    }
    const den = Math.sqrt((N * ss1 - s1 * s1) * (N * ss2 - s2 * s2));
    const r = den > 0 ? (N * s12 - s1 * s2) / den : 0;
    const zA = r * Math.sqrt(N);
    const pA = zP(zA);

    return {
      n,
      pU,
      pM,
      pR,
      pA,
      chiU: +chiU.toFixed(1),
      chiM: +chiM.toFixed(1),
      zR: +zR.toFixed(2),
      r: +r.toFixed(4),
      cells,
      repRate: rep / N,
    };
  }

  // ── Execução de Trades e Martingale ──

  public checkGuards(): string | null {
    if (this.stopped) {
      return this.stoppedReason || 'Operações paradas pelo robô.';
    }
    if (this.config.opMode === 'real') {
      const simTotal = this.simStats.win + this.simStats.loss;
      if (simTotal < this.config.gateOps) {
        return `Trava do modo real: exige ${this.config.gateOps} operações em simulação (${simTotal}/${this.config.gateOps})`;
      }
      const simAcc = simTotal > 0 ? (this.simStats.win / simTotal) * 100 : 0;
      if (simAcc < this.config.gateAcc) {
        return `Trava do modo real: exige acerto simulado ≥ ${this.config.gateAcc}% (atual: ${simAcc.toFixed(1)}%)`;
      }
    }

    const book = this.config.opMode === 'real' ? this.realStats : this.simStats;
    let consecutiveLosses = 0;
    for (let i = book.recent.length - 1; i >= 0 && book.recent[i] === 0; i--) {
      consecutiveLosses++;
    }
    if (consecutiveLosses >= this.config.maxLoss) {
      return `Trava de segurança: ${consecutiveLosses} perdas consecutivas (limite: ${this.config.maxLoss})`;
    }

    const totalTrades = book.win + book.loss;
    if (totalTrades >= 20) {
      const currentAcc = (book.win / totalTrades) * 100;
      if (currentAcc < this.config.minAcc) {
        return `Trava de segurança: assertividade abaixo do mínimo (${currentAcc.toFixed(1)}% < ${this.config.minAcc}%)`;
      }
    }

    return null;
  }

  public prepareTrade(
    sym: string,
    digit: number
  ): {
    isPaper: boolean;
    stake: number;
    sym: string;
    digit: number;
  } {
    return {
      isPaper: this.config.opMode === 'sim',
      stake: this.curStake,
      sym,
      digit,
    };
  }

  public settleContract(
    profit: number,
    isLoss: boolean,
    sym: string,
    digit: number,
    exitDigit: number | null,
    audit?: any,
    logicId?: string
  ): void {
    const isSim = this.config.opMode === 'sim';
    const book = isSim ? this.simStats : this.realStats;

    if (!isLoss) {
      book.win++;
      book.pnl += profit;
      book.recent.push(1);

      // Reseta Martingale
      if (this.config.mgMode === 'partial' && this.mgPartsLeft > 0) {
        this.mgDebt = Math.max(0, this.mgDebt - profit);
        this.mgPartsLeft--;
        if (this.mgDebt <= 0.01 || this.mgPartsLeft <= 0) {
          this.mgLevel = 0;
          this.mgDebt = 0;
          this.mgPartsLeft = 0;
          this.curStake = this.config.stake;
        } else {
          this.curStake = this.mgPartStake;
        }
      } else {
        this.mgLevel = 0;
        this.mgDebt = 0;
        this.mgPartsLeft = 0;
        this.curStake = this.config.stake;
      }
    } else {
      book.loss++;
      book.pnl += profit; // profit é negativo
      book.recent.push(0);
      this.mgLevel++;
      this.recordLoss(sym, digit);

      // Avança Martingale
      if (this.config.mgMode === 'normal') {
        if (this.mgLevel <= this.config.mgMax) {
          this.curStake = +(
            this.config.stake * Math.pow(this.config.mgFactor, this.mgLevel)
          ).toFixed(2);
        } else {
          // Atingiu limite máximo: reseta
          this.mgLevel = 0;
          this.curStake = this.config.stake;
        }
      } else if (this.config.mgMode === 'partial') {
        if (this.mgLevel > this.config.mgMax) {
          // Teto de níveis vale para o parcial também, senão a stake cresce
          // sem limite
          this.mgLevel = 0;
          this.mgDebt = 0;
          this.mgPartsLeft = 0;
          this.mgPartStake = 0;
          this.curStake = this.config.stake;
        } else {
          this.mgDebt += Math.abs(profit);
          this.mgPartsLeft = this.config.mgParts;
          const b = Math.max(0.05, this.payout - 1);
          this.mgPartStake = +(
            this.config.stake +
            this.mgDebt / this.config.mgParts / b
          ).toFixed(2);
          this.curStake = this.mgPartStake;
        }
      }
    }

    if (book.recent.length > 200) book.recent.shift();

    // Registra operação no histórico
    const tradeItem: DifferTradeRecord = {
      id: `${Date.now()}-${Math.random()}`,
      time: new Date().toLocaleTimeString('pt-BR'),
      sym,
      mode: 'differ',
      digit,
      exitDigit,
      stake: isLoss ? Math.abs(profit) : +(profit / (this.payout - 1)).toFixed(2),
      profit: +profit.toFixed(2),
      result: isLoss ? 'LOSS' : 'WIN',
      paper: isSim,
      fast: this.config.fastExec,
      audit,
      logicId,
    };
    this.trades.unshift(tradeItem);
    if (this.trades.length > 300) this.trades.pop();

    this.addLog(
      `${isSim ? '[SIM] ' : ''}${isLoss ? 'LOSS' : 'WIN'} em ${sym} ≠${digit} (saiu ${exitDigit ?? '?'}) · PnL: ${profit >= 0 ? '+' : ''}$${profit.toFixed(2)}`,
      isLoss ? 'dn' : 'up'
    );

    // Conferência de Stop Loss e Stop Win sobre o livro do modo ativo.
    // Valor zero significa limite desligado, não limite atingido.
    const bookPnl = book.pnl;
    if (this.config.stopLoss > 0 && bookPnl <= -this.config.stopLoss) {
      this.stopped = true;
      this.stoppedReason = `Stop Loss atingido: -$${Math.abs(bookPnl).toFixed(2)}`;
      this.config.autoOn = false;
      this.addLog(this.stoppedReason, 'dn');
    } else if (this.config.stopWin > 0 && bookPnl >= this.config.stopWin) {
      this.stopped = true;
      this.stoppedReason = `Stop Win atingido: +$${bookPnl.toFixed(2)}`;
      this.config.autoOn = false;
      this.addLog(this.stoppedReason, 'up');
    }

    this.tradeLock = false;
    this.notify();
  }

  public runStrategy(
    buf: number[],
    minT: number,
    minScore: number,
    mg: MartingaleConfig,
    payout: number,
    from?: number,
    to?: number,
    G: DifferGenome = BASE_GENOME
  ): { win: number; loss: number; pnl: number; dd: number; maxRun: number; t: number; acc: number } {
    const W = G.win;
    const startFrom = from === undefined ? minT : Math.max(minT, from);
    const endTo = to === undefined ? buf.length : to;
    if (startFrom < 2 || endTo <= startFrom) {
      return { win: 0, loss: 0, pnl: 0, dd: 0, maxRun: 0, t: 0, acc: 0 };
    }

    const freq = new Array(10).fill(0);
    const lastSeen = new Array(10).fill(-1);
    for (let i = 0; i < startFrom; i++) {
      lastSeen[buf[i]] = i;
    }
    const wStart = Math.max(0, startFrom - W);
    for (let i = wStart; i < startFrom; i++) freq[buf[i]]++;
    let winCount = startFrom - wStart;
    let streak = 1;
    for (let i = startFrom - 2; i >= 0 && buf[i] === buf[startFrom - 1]; i--) streak++;

    const gap = new Array(10);
    let win = 0,
      loss = 0,
      pnl = 0,
      peak = 0,
      dd = 0,
      run = 0,
      maxRun = 0,
      lvl = 0,
      debt = 0,
      partsLeft = 0,
      partStake = 0;
    const base = mg.base;

    for (let i = startFrom; i < endTo; i++) {
      for (let d = 0; d < 10; d++) {
        gap[d] = lastSeen[d] < 0 ? i : i - 1 - lastSeen[d];
      }
      const a = this.scoreAll(freq, winCount, gap, i, buf[i - 1], buf[i - 2], streak, minT, G);
      if (a.best.score >= minScore) {
        let stake = base;
        if (mg.mode === 'normal' && lvl > 0) {
          stake = +(base * Math.pow(mg.factor, lvl)).toFixed(2);
        } else if (mg.mode === 'partial' && partsLeft > 0) {
          stake = partStake;
        }
        if (lvl > mg.maxLvl) {
          lvl = 0;
          debt = 0;
          partsLeft = 0;
          stake = base;
        }

        const ok = buf[i] !== a.best.digit;
        if (ok) {
          win++;
          pnl += stake * (payout - 1);
          run = 0;
          if (mg.mode === 'partial' && partsLeft > 0) {
            debt = Math.max(0, debt - stake * (payout - 1));
            partsLeft--;
            if (debt <= 0.01 || partsLeft <= 0) {
              lvl = 0;
              debt = 0;
              partsLeft = 0;
            }
          } else {
            lvl = 0;
            debt = 0;
            partsLeft = 0;
          }
        } else {
          loss++;
          pnl -= stake;
          run++;
          if (run > maxRun) maxRun = run;
          lvl++;
          if (mg.mode === 'partial') {
            debt += stake;
            partsLeft = mg.parts;
            partStake = +(base + debt / mg.parts / Math.max(0.05, payout - 1)).toFixed(2);
          }
        }
        if (pnl > peak) peak = pnl;
        if (peak - pnl > dd) dd = peak - pnl;
      }

      freq[buf[i]]++;
      winCount++;
      if (winCount > W) {
        freq[buf[i - W]]--;
        winCount--;
      }
      streak = buf[i] === buf[i - 1] ? streak + 1 : 1;
      lastSeen[buf[i]] = i;
    }

    const t = win + loss;
    const acc = t > 0 ? +(win / t).toFixed(4) : 0;
    return {
      win,
      loss,
      pnl: +pnl.toFixed(2),
      dd: +dd.toFixed(2),
      maxRun,
      t,
      acc,
    };
  }

  public randGenome(): DifferGenome {
    const rnd = (a: number, b: number) => a + Math.random() * (b - a);
    const w = [rnd(8, 60), rnd(4, 45), rnd(0, 32), rnd(0, 32)];
    const s = w.reduce((a, b) => a + b, 0);
    const nw = w.map((x) => (x / s) * 100);
    return {
      win: Math.round(rnd(60, 700)),
      wSat: nw[0],
      wGap: nw[1],
      wStab: nw[2],
      wConf: nw[3],
      satDiv: rnd(1.2, 4.2),
      gapWin: Math.round(rnd(4, 40)),
      penLast: rnd(0, 0.8),
      penStreak: rnd(0, 0.4),
      penPrev: rnd(0, 0.4),
      lowP: rnd(0.02, 0.09),
      lowMul: rnd(0.3, 1),
      minScore: Math.round(rnd(50, 92)),
    };
  }

  public mutateGenome(G: DifferGenome): DifferGenome {
    const rnd = (a: number, b: number) => a + Math.random() * (b - a);
    const g = { ...G };
    const keys: (keyof DifferGenome)[] = [
      'win',
      'satDiv',
      'gapWin',
      'penLast',
      'penStreak',
      'penPrev',
      'lowP',
      'lowMul',
      'minScore',
    ];
    const k = keys[Math.floor(Math.random() * keys.length)];
    (g as any)[k] = (g as any)[k] * rnd(0.75, 1.3);
    if (k === 'win') g.win = Math.max(40, Math.round(g.win));
    if (k === 'gapWin') g.gapWin = Math.max(3, Math.round(g.gapWin));
    if (k === 'minScore') g.minScore = Math.max(40, Math.min(96, Math.round(g.minScore)));
    if (k === 'lowMul') g.lowMul = Math.min(1, g.lowMul);
    return g;
  }

  public runPipeline(
    sym: string,
    numCandidates = 100,
    q = 0.10,
    minTrades = 20
  ): PipelineResult | null {
    const buf = this.getDigits(sym);
    if (buf.length < 600) return null;

    const n = buf.length;
    const minT = Math.max(60, this.config.minTicks);
    const mg: MartingaleConfig = {
      mode: this.config.mgMode,
      factor: this.config.mgFactor,
      maxLvl: this.config.mgMax,
      parts: this.config.mgParts,
      base: this.config.stake,
    };
    const pay = this.payout;
    const be = 1 / pay;

    // 3 partições temporais
    const A = [minT, Math.floor(n * 0.5)];
    const B = [Math.floor(n * 0.5) + minT, Math.floor(n * 0.75)];
    const C = [Math.floor(n * 0.75) + minT, n];

    const pool: PipelineCandidate[] = [];
    const elite: { G: DifferGenome; acc: number }[] = [];

    // Fase 1: Busca e Descoberta
    for (let i = 0; i < numCandidates; i++) {
      const G =
        elite.length && Math.random() < 0.4
          ? this.mutateGenome(elite[Math.floor(Math.random() * elite.length)].G)
          : this.randGenome();

      const r = this.runStrategy(buf, minT, G.minScore, mg, pay, A[0], A[1], G);
      if (r.t >= minTrades) {
        const acc = r.win / r.t;
        pool.push({ G, accA: acc, tA: r.t, pnlA: r.pnl, approved: false });
        if (acc > be) {
          elite.push({ G, acc });
          if (elite.length > 25) {
            elite.sort((a, b) => b.acc - a.acc);
            elite.length = 25;
          }
        }
      }
    }

    // Fase 2: Validação Out-of-Sample com Benjamini-Hochberg (FDR)
    pool.sort((a, b) => b.accA - a.accA);
    const cand = pool.filter((c) => c.accA > be).slice(0, 40);
    if (!cand.length) {
      return {
        sym,
        totalGenomes: numCandidates,
        survivorsStageA: pool.length,
        survivorsStageB: 0,
        approvedCount: 0,
        candidates: [],
      };
    }

    cand.forEach((c) => {
      const r = this.runStrategy(buf, minT, c.G.minScore, mg, pay, B[0], B[1], c.G);
      c.tB = r.t;
      c.accB = r.t ? r.win / r.t : 0;
      c.pnlB = r.pnl;
      c.pB = r.t >= minTrades ? binomP(r.win, r.t, be) : 1;
    });

    const tested = cand.filter((c) => (c.tB || 0) >= minTrades);
    const bh = benjaminiHochberg(
      tested.map((c) => ({ p: c.pB || 1, cand: c })),
      q
    );
    const survivors = bh.filter((x) => x.pass).map((x) => x.cand);

    // Fase 3: Reserva final e teste de permutação
    survivors.forEach((c) => {
      const r = this.runStrategy(buf, minT, c.G.minScore, mg, pay, C[0], C[1], c.G);
      c.tC = r.t;
      c.accC = r.t ? r.win / r.t : 0;
      c.pnlC = r.pnl;
      c.pC = r.t >= Math.max(10, Math.floor(minTrades / 2)) ? binomP(r.win, r.t, be) : 1;

      // Teste de permutação com 50 rodadas
      let above = 0;
      const runs = 50;
      const sliceC = buf.slice(C[0] - minT, C[1]);
      for (let k = 0; k < runs; k++) {
        const sb = shuffle(sliceC);
        const rr = this.runStrategy(sb, minT, c.G.minScore, mg, pay, minT, sb.length, c.G);
        if (rr.t && rr.win / rr.t >= (c.accC || 0)) above++;
      }
      c.pPerm = (above + 1) / (runs + 1);
      c.approved =
        (c.tC || 0) >= Math.max(10, Math.floor(minTrades / 2)) &&
        (c.accC || 0) > be &&
        (c.pC || 1) < 0.05 &&
        (c.pPerm || 1) < 0.05;
    });

    const approved = survivors.filter((c) => c.approved);
    return {
      sym,
      totalGenomes: numCandidates,
      survivorsStageA: pool.length,
      survivorsStageB: survivors.length,
      approvedCount: approved.length,
      candidates: survivors,
    };
  }
}

export interface PipelineCandidate {
  G: DifferGenome;
  accA: number;
  tA: number;
  pnlA: number;
  accB?: number;
  tB?: number;
  pnlB?: number;
  pB?: number;
  accC?: number;
  tC?: number;
  pnlC?: number;
  pC?: number;
  pPerm?: number;
  approved: boolean;
}

export interface PipelineResult {
  sym: string;
  totalGenomes: number;
  survivorsStageA: number;
  survivorsStageB: number;
  approvedCount: number;
  candidates: PipelineCandidate[];
}

export function createDifferEngine(
  initialConfig?: Partial<DifferConfig>
): BearDifferEngine {
  return new BearDifferEngine(initialConfig);
}
