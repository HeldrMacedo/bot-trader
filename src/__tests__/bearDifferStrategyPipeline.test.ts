import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BearDifferEngine, createDifferEngine } from '../app/services/BearDifferEngine';
import { MartingaleConfig } from '../app/services/beardiffer.types';

/**
 * runStrategy é o percurso rápido usado por backtest, walk-forward, permutação
 * e pela esteira. Ele carrega uma segunda implementação do martingale, separada
 * da de settleContract, e é ela que decide quais genomas são aprovados.
 */
describe('BearDifferEngine - runStrategy and the genetic pipeline', () => {
  let engine: BearDifferEngine;

  beforeEach(() => {
    engine = createDifferEngine();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /**
   * randGenome, mutateGenome e o embaralhamento da permutação usam
   * Math.random. Sem prender a semente o resultado da esteira muda a cada
   * execução e o teste vira moeda.
   */
  const seedRandom = (seed = 20260906) => {
    let s = seed;
    vi.spyOn(Math, 'random').mockImplementation(() => {
      s = (s * 1103515245 + 12345) % 2147483648;
      return s / 2147483648;
    });
  };

  const makeDigits = (n: number, seed = 20260906): number[] => {
    let s = seed;
    const out: number[] = [];
    for (let i = 0; i < n; i++) {
      s = (s * 1103515245 + 12345) % 2147483648;
      out.push(Math.floor((s / 2147483648) * 10));
    }
    return out;
  };

  const mg = (over: Partial<MartingaleConfig> = {}): MartingaleConfig => ({
    mode: 'off',
    factor: 2.2,
    maxLvl: 3,
    parts: 3,
    base: 1,
    ...over,
  });

  describe('runStrategy', () => {
    it('trades on every tick when the score floor is zero', () => {
      const buf = makeDigits(500);
      const r = engine.runStrategy(buf, 100, 0, mg(), 1.1);

      expect(r.t).toBe(400);
      expect(r.win + r.loss).toBe(r.t);
      expect(r.acc).toBeCloseTo(r.win / r.t, 4);
      // In an honest generator the Differ sits near 90%
      expect(r.acc).toBeGreaterThan(0.8);
      expect(r.acc).toBeLessThan(1);
    });

    it('never fires when the score floor is unreachable', () => {
      const r = engine.runStrategy(makeDigits(500), 100, 999, mg(), 1.1);
      expect(r).toEqual({ win: 0, loss: 0, pnl: 0, dd: 0, maxRun: 0, t: 0, acc: 0 });
    });

    it('refuses a window that starts too early or ends before it starts', () => {
      const buf = makeDigits(500);
      expect(engine.runStrategy(buf, 1, 0, mg(), 1.1, 1, 400).t).toBe(0);
      expect(engine.runStrategy(buf, 100, 0, mg(), 1.1, 300, 200).t).toBe(0);
    });

    it('counts the streak already running at the window start', () => {
      const buf = makeDigits(500);
      // Force a repeat right before the first traded tick
      buf[98] = 5;
      buf[99] = 5;

      const r = engine.runStrategy(buf, 100, 0, mg(), 1.1, 100, 200);
      expect(r.t).toBe(100);
    });

    it('climbs the normal martingale ladder and books a bigger drawdown', () => {
      const buf = makeDigits(800);
      const flat = engine.runStrategy(buf, 100, 0, mg({ mode: 'off' }), 1.1);
      const ladder = engine.runStrategy(
        buf,
        100,
        0,
        mg({ mode: 'normal', factor: 2.2, maxLvl: 3 }),
        1.1
      );

      // Same entries, same hits: only the staking differs
      expect(ladder.t).toBe(flat.t);
      expect(ladder.win).toBe(flat.win);
      expect(ladder.loss).toBeGreaterThan(0);
      expect(ladder.dd).toBeGreaterThan(flat.dd);
    });

    it('resets the ladder once it passes the ceiling instead of growing forever', () => {
      const buf = makeDigits(800);
      const tight = engine.runStrategy(buf, 100, 0, mg({ mode: 'normal', maxLvl: 1 }), 1.1);
      const loose = engine.runStrategy(buf, 100, 0, mg({ mode: 'normal', maxLvl: 6 }), 1.1);

      expect(tight.t).toBe(loose.t);
      expect(tight.dd).toBeLessThanOrEqual(loose.dd);
    });

    it('runs the partial martingale with its own recovery stake', () => {
      const buf = makeDigits(800);
      const partial = engine.runStrategy(
        buf,
        100,
        0,
        mg({ mode: 'partial', parts: 3 }),
        1.1
      );

      expect(partial.t).toBeGreaterThan(0);
      expect(partial.loss).toBeGreaterThan(0);
      expect(partial.maxRun).toBeGreaterThanOrEqual(1);
      expect(Number.isFinite(partial.pnl)).toBe(true);
    });

    it('keeps a losing run counter that never exceeds the losses', () => {
      const r = engine.runStrategy(makeDigits(800), 100, 0, mg(), 1.1);
      expect(r.maxRun).toBeGreaterThanOrEqual(1);
      expect(r.maxRun).toBeLessThanOrEqual(r.loss);
    });
  });

  describe('settleContract partial recovery', () => {
    it('pays the debt down across parts before returning to the base stake', () => {
      engine.updateConfig({
        opMode: 'sim',
        mgMode: 'partial',
        mgParts: 3,
        mgMax: 5,
        stake: 1,
        stopLoss: 0,
        stopWin: 0,
      });

      engine.settleContract(-1, true, 'R_10', 3, 3);
      const recovery = engine.getState().curStake;
      expect(recovery).toBeGreaterThan(1);

      // A win that does not clear the whole debt keeps the recovery stake, and
      // the level stays up: only clearing the debt ends the recovery
      engine.settleContract(0.05, false, 'R_10', 3, 4);
      expect(engine.getState().curStake).toBe(recovery);
      expect(engine.getState().mgLevel).toBe(1);
    });

    it('returns to the base stake when the debt is cleared', () => {
      engine.updateConfig({
        opMode: 'sim',
        mgMode: 'partial',
        mgParts: 3,
        mgMax: 5,
        stake: 1,
        stopLoss: 0,
        stopWin: 0,
      });

      engine.settleContract(-1, true, 'R_10', 3, 3);
      engine.settleContract(5, false, 'R_10', 3, 4);

      expect(engine.getState().curStake).toBe(1);
      expect(engine.getState().mgLevel).toBe(0);
    });
  });

  describe('session buffers', () => {
    it('caps the recent-results window and the trade history', () => {
      engine.updateConfig({ opMode: 'sim', mgMode: 'off', stopLoss: 0, stopWin: 0, stake: 1 });

      for (let i = 0; i < 320; i++) {
        engine.settleContract(0.1, false, 'R_10', 3, 4);
      }

      const st = engine.getState();
      expect(st.sim.recent.length).toBe(200);
      expect(st.trades.length).toBe(300);
      expect(st.sim.win).toBe(320);
    });
  });

  describe('runPipeline', () => {
    it('refuses a market with too little history', () => {
      engine.setHistory('R_10', makeDigits(300));
      expect(engine.runPipeline('R_10')).toBeNull();
    });

    it('reports an empty cascade when no genome clears the search stage', () => {
      seedRandom();
      engine.setHistory('R_10', makeDigits(1000));
      engine.updateConfig({ minTicks: 100 });

      // minTrades above what the search slice can produce: nothing enters the pool
      const res = engine.runPipeline('R_10', 5, 0.1, 100000);

      expect(res).not.toBeNull();
      expect(res!.survivorsStageA).toBe(0);
      expect(res!.survivorsStageB).toBe(0);
      expect(res!.approvedCount).toBe(0);
      expect(res!.candidates).toEqual([]);
    });

    it('rejects everything against an honest generator at the real payout', () => {
      seedRandom();
      engine.setHistory('R_10', makeDigits(2000));
      engine.updateConfig({ minTicks: 100 });

      const res = engine.runPipeline('R_10', 20, 0.1, 20);

      expect(res).not.toBeNull();
      expect(res!.totalGenomes).toBe(20);
      expect(res!.approvedCount).toBe(0);
    });

    it('carries survivors through the reserve slice and the permutation test', () => {
      // A payout of 10 puts breakeven at 10%, so an edge exists and the later
      // stages actually run instead of dying at the search filter
      seedRandom();
      engine.setPayout(10);
      engine.setHistory('R_10', makeDigits(2000));
      engine.updateConfig({ minTicks: 100 });

      const res = engine.runPipeline('R_10', 12, 0.1, 20);

      expect(res).not.toBeNull();
      expect(res!.survivorsStageB).toBeGreaterThan(0);

      res!.candidates.forEach((c) => {
        expect(c.accB).toBeGreaterThan(1 / 10);
        expect(c.pPerm).toBeGreaterThan(0);
        expect(c.pPerm).toBeLessThanOrEqual(1);
        expect(typeof c.accC).toBe('number');
        expect(typeof c.approved).toBe('boolean');
      });

      // Approval demands the reserve slice and the permutation, not just stage B
      expect(res!.approvedCount).toBeLessThanOrEqual(res!.survivorsStageB);
    });
  });
});
