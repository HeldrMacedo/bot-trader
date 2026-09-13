import { describe, it, expect, beforeEach } from 'vitest';
import { BearDifferEngine, createDifferEngine } from '../app/services/BearDifferEngine';
import { DEFAULT_DIFFER_CONFIG } from '../app/services/beardiffer.types';

describe('BearDifferEngine - Core Analysis & Differ Trading Engine', () => {
  let engine: BearDifferEngine;

  beforeEach(() => {
    engine = createDifferEngine();
  });

  describe('Buffer & Tick Management', () => {
    it('initializes with default markets and empty buffers', () => {
      const state = engine.getState();
      expect(state.markets.length).toBe(7);
      expect(state.markets[0].sym).toBe('R_10');
      expect(engine.getDigits('R_10')).toEqual([]);
    });

    it('processes ticks and appends to circular buffer up to 8000', () => {
      for (let i = 0; i < 50; i++) {
        engine.processTick('R_100', i % 10);
      }
      const digits = engine.getDigits('R_100');
      expect(digits.length).toBe(50);
      expect(digits[digits.length - 1]).toBe(49 % 10);

      const mkt = engine.getMarketData('R_100');
      expect(mkt.tickCount).toBe(50);
    });

    it('sets history directly for a market', () => {
      const sample = Array.from({ length: 300 }, (_, i) => i % 10);
      engine.setHistory('R_50', sample);
      expect(engine.getDigits('R_50').length).toBe(300);
      expect(engine.getMarketData('R_50').tickCount).toBe(300);
    });
  });

  describe('Motor 2.0 Analysis (scoreAll / analyze)', () => {
    it('returns null if buffer has fewer than 50 ticks', () => {
      engine.setHistory('R_10', [1, 2, 3, 4, 5]);
      expect(engine.analyze('R_10')).toBeNull();
    });

    it('analyzes market with sufficient ticks and identifies highest score digit', () => {
      // Create a biased sequence where digit 7 appears heavily in the last 180 ticks
      const digits: number[] = [];
      for (let i = 0; i < 200; i++) {
        digits.push(i % 10);
      }
      // Inject extra 7s
      for (let i = 0; i < 40; i++) {
        digits.push(7);
      }
      // End with a non-7 digit so streak penalty doesn't suppress 7
      digits.push(2);

      engine.setHistory('R_10', digits);
      const res = engine.analyze('R_10');

      expect(res).not.toBeNull();
      expect(res?.best.digit).toBe(7);
      expect(res?.best.score).toBeGreaterThan(50);
      expect(res?.best.sat).toBeGreaterThan(2);
    });
  });

  describe('Exhaustion Thermometer', () => {
    it('detects exhaustion when a digit appears excessively in 10, 25 and 50 windows', () => {
      // Build 80 ticks where digit 3 appears frequently in 10, 25, and 50 ticks
      const digits = new Array(80).fill(1);
      // in the last 50 ticks, make 3 appear 15 times (expected is 5)
      for (let i = 30; i < 80; i += 2) {
        digits[i] = 3;
      }
      engine.setHistory('R_25', digits);

      const ex = engine.getExhaustion('R_25', 3);
      expect(ex).not.toBeNull();
      expect(ex?.ok).toBe(true);
      expect(ex?.mean).toBeGreaterThan(0.5);
    });

    it('tracks loser count per digit', () => {
      expect(engine.getLoserCount('R_10', 5)).toBe(0);
      engine.recordLoss('R_10', 5);
      expect(engine.getLoserCount('R_10', 5)).toBe(1);
    });
  });

  describe('17 Lógicas de Análise', () => {
    it('registers all 17 logics (10 base + 6 wide + 1 exhaustion)', () => {
      const logics = engine.getLogics();
      expect(logics.length).toBe(17);
      const ids = logics.map((l) => l.id);
      expect(ids).toContain('sat');
      expect(ids).toContain('mk1');
      expect(ids).toContain('mk2');
      expect(ids).toContain('rep');
      expect(ids).toContain('flong');
      expect(ids).toContain('div');
      expect(ids).toContain('lag');
      expect(ids).toContain('aus');
      expect(ids).toContain('par');
      expect(ids).toContain('cons');
      expect(ids).toContain('flong300');
      expect(ids).toContain('flong3k');
      expect(ids).toContain('div60');
      expect(ids).toContain('par600');
      expect(ids).toContain('mk1c');
      expect(ids).toContain('aus30');
      expect(ids).toContain('exaust');
    });

    it('anti-repetition logic picks the last digit', () => {
      const sample = Array.from({ length: 400 }, (_, i) => i % 10);
      sample.push(9); // last digit is 9
      engine.setHistory('R_75', sample);

      const repLogic = engine.getLogics().find((l) => l.id === 'rep');
      expect(repLogic).toBeDefined();
      const pick = repLogic?.pick('R_75', (s) => engine.getDigits(s));
      expect(pick).not.toBeNull();
      expect(pick?.digit).toBe(9);
    });
  });

  describe('Virtual Signals & Logic Ranking with FDR', () => {
    it('updates virtual statistics on each tick and ranks logics', () => {
      // Seed market with 500 ticks
      const sample = Array.from({ length: 500 }, (_, i) => i % 10);
      engine.setHistory('R_100', sample);

      // Trigger multiple ticks to accumulate virtual signals
      for (let i = 0; i < 30; i++) {
        engine.processTick('R_100', (i * 3) % 10);
      }

      const ranking = engine.getLogicRanking();
      expect(ranking.length).toBeGreaterThanOrEqual(10);
      expect(ranking[0]).toHaveProperty('lid');
      expect(ranking[0]).toHaveProperty('n');
      expect(ranking[0]).toHaveProperty('p');
      expect(ranking[0]).toHaveProperty('ready');
    });
  });

  describe('Operação Única (resolveTarget)', () => {
    it('finds best market target for a selected logic', () => {
      // Bias gate off: this case is about picking a target, not about the lab
      engine.updateConfig({ gateBias: false });
      // Set up R_10 and R_25 with 400 ticks
      const s1 = Array.from({ length: 400 }, (_, i) => i % 10);
      const s2 = Array.from({ length: 400 }, (_, i) => (i * 2) % 10);
      engine.setHistory('R_10', s1);
      engine.setHistory('R_25', s2);

      // Process tick to generate live picks
      engine.processTick('R_10', 4);
      engine.processTick('R_25', 8);

      engine.updateConfig({ autoSource: 'logic', onceLogic: 'rep', onceMinConf: 0, minTicks: 300 });

      const target = engine.resolveTarget();
      expect(target.reason).toBeNull();
      expect(['R_10', 'R_25']).toContain(target.sym);
      expect(typeof target.digit).toBe('number');
      expect(typeof target.conf).toBe('number');
      expect(target.logicId).toBe('rep');
    });
  });

  describe('Randomness Tests (Laboratory Battery)', () => {
    it('calculates Uniformity, Markov, Repetition and Autocorrelation tests', () => {
      // 500 ticks of pseudo-uniform distribution
      const sample = Array.from({ length: 500 }, (_, i) => (i * 7) % 10);
      engine.setHistory('RDBEAR', sample);

      const lab = engine.runBiasTests('RDBEAR');
      expect(lab).not.toBeNull();
      expect(lab?.n).toBe(500);
      expect(lab?.chiU).toBeGreaterThanOrEqual(0);
      expect(lab?.chiM).toBeGreaterThanOrEqual(0);
      expect(lab?.pU).toBeGreaterThanOrEqual(0);
      expect(lab?.pU).toBeLessThanOrEqual(1);
      expect(lab?.pM).toBeGreaterThanOrEqual(0);
      expect(lab?.pM).toBeLessThanOrEqual(1);
      expect(lab?.cells.length).toBe(10);
      expect(lab?.cells[0].length).toBe(10);
    });
  });

  describe('Trade Execution & Martingale Simulation', () => {
    it('simulates Differ contract win and pnl calculation', () => {
      engine.updateConfig({ stake: 1.0, opMode: 'sim' });
      engine.setPayout(1.10); // payout 1.10 (profit is 0.10)

      const prep = engine.prepareTrade('R_10', 3);
      expect(prep.isPaper).toBe(true);
      expect(prep.stake).toBe(1.0);

      // Simulate resolution with exit digit = 5 (Win since 5 != 3)
      engine.settleContract(0.10, false, 'R_10', 3, 5);

      const state = engine.getState();
      expect(state.pnl).toBeCloseTo(0.10, 2);
      expect(state.sim.win).toBe(1);
      expect(state.sim.loss).toBe(0);
      expect(state.curStake).toBe(1.0); // Reset after win
    });

    it('simulates Differ contract loss and applies Martingale', () => {
      engine.updateConfig({
        stake: 1.0,
        opMode: 'sim',
        mgMode: 'normal',
        mgFactor: 2.2,
        mgMax: 3,
      });
      engine.setPayout(1.10);

      // Loss (exit digit = 3, matches target 3)
      engine.settleContract(-1.0, true, 'R_10', 3, 3);

      const state = engine.getState();
      expect(state.pnl).toBe(-1.0);
      expect(state.sim.loss).toBe(1);
      expect(state.mgLevel).toBe(1);
      expect(state.curStake).toBeCloseTo(2.2, 2); // 1.0 * 2.2^1
    });

    it('stops trading if stop loss is hit', () => {
      engine.updateConfig({
        stake: 10,
        stopLoss: 15,
        opMode: 'sim',
        autoOn: true,
      });
      engine.settleContract(-20, true, 'R_10', 0, 0);

      const state = engine.getState();
      expect(state.pnl).toBe(-20);
      expect(state.stopped).toBe(true);
      expect(state.stoppedReason).toContain('Stop Loss');
    });

    it('runs strategy backtest on digit buffer', () => {
      const sample = Array.from({ length: 400 }, (_, i) => i % 10);
      const res = engine.runStrategy(
        sample,
        60,
        70,
        { mode: 'normal', factor: 2.2, maxLvl: 3, parts: 3, base: 0.35 },
        1.10
      );
      expect(res).toBeDefined();
      expect(typeof res.win).toBe('number');
      expect(typeof res.loss).toBe('number');
      expect(typeof res.pnl).toBe('number');
      expect(typeof res.dd).toBe('number');
      expect(res.t).toBe(res.win + res.loss);
    });
  });
});
