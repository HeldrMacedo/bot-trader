import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BearDifferEngine, createDifferEngine } from '../app/services/BearDifferEngine';

describe('BearDifferEngine - Advanced Features & Automation (TDD)', () => {
  let engine: BearDifferEngine;

  beforeEach(() => {
    engine = createDifferEngine();
  });

  describe('resetSession', () => {
    it('resets all session metrics, trades, logs, pnl and martingale level', () => {
      // Simulate some activity
      engine.updateConfig({ stake: 2.0 });
      engine.settleContract(-2.0, true, 'R_10', 3, 3);
      engine.addLog('Log de teste', 'nt');
      engine.addAnomaly('Anomalia de teste');
      engine.recordLoss('R_10', 3);

      expect(engine.getState().pnl).toBe(-2.0);
      expect(engine.getState().mgLevel).toBe(1);
      expect(engine.getState().logs.length).toBeGreaterThan(0);
      expect(engine.getState().trades.length).toBe(1);
      expect(engine.getLoserCount('R_10', 3)).toBe(2);

      // Reset
      engine.resetSession();

      const state = engine.getState();
      expect(state.pnl).toBe(0);
      expect(state.mgLevel).toBe(0);
      expect(state.curStake).toBe(engine.getConfig().stake);
      expect(state.sim.win).toBe(0);
      expect(state.sim.loss).toBe(0);
      expect(state.real.win).toBe(0);
      expect(state.real.loss).toBe(0);
      expect(state.virt.total).toBe(0);
      expect(state.trades.length).toBe(0);
      expect(state.logs.length).toBe(0);
      expect(state.anomalies.length).toBe(0);
      expect(engine.getLoserCount('R_10', 3)).toBe(0);
    });
  });

  describe('Continuous Auto-Trade Mode (3.0 Legado)', () => {
    it('registers onAutoTrade listener and triggers when score exceeds minScore and cooldown passes', () => {
      const autoTradeCb = vi.fn();
      const unsub = engine.onAutoTrade(autoTradeCb);

      engine.updateConfig({
        autoOn: true,
        gateBias: false,
        minScore: 60,
        minTicks: 50,
        cooldown: 0,
      });

      // Populate R_10 with biased ticks to ensure high score
      const digits: number[] = [];
      for (let i = 0; i < 100; i++) digits.push(i % 10);
      for (let i = 0; i < 40; i++) digits.push(7);
      digits.push(2);

      engine.setHistory('R_10', digits);

      // Process a tick to trigger auto-trade
      engine.processTick('R_10', 5);

      expect(autoTradeCb).toHaveBeenCalled();
      const call = autoTradeCb.mock.calls[0];
      expect(call[0]).toBe('R_10');
      expect(call[1]).toBe(7);

      unsub();
    });

    it('respects cooldown between automatic entries', () => {
      const autoTradeCb = vi.fn();
      engine.onAutoTrade(autoTradeCb);

      engine.updateConfig({
        autoOn: true,
        gateBias: false,
        minScore: 60,
        minTicks: 50,
        cooldown: 30, // 30 seconds cooldown
      });

      const digits: number[] = [];
      for (let i = 0; i < 100; i++) digits.push(i % 10);
      for (let i = 0; i < 40; i++) digits.push(7);
      digits.push(2);

      engine.setHistory('R_10', digits);

      // First tick should trigger
      engine.processTick('R_10', 1);
      expect(autoTradeCb).toHaveBeenCalledTimes(1);

      // Immediately process another tick — should be blocked by cooldown
      engine.processTick('R_10', 2);
      expect(autoTradeCb).toHaveBeenCalledTimes(1);
    });

    it('blocks auto-trade when tradeLock is active', () => {
      const autoTradeCb = vi.fn();
      engine.onAutoTrade(autoTradeCb);

      engine.updateConfig({
        autoOn: true,
        gateBias: false,
        minScore: 60,
        minTicks: 50,
        cooldown: 0,
      });

      const digits: number[] = [];
      for (let i = 0; i < 100; i++) digits.push(i % 10);
      for (let i = 0; i < 40; i++) digits.push(7);
      digits.push(2);

      engine.setHistory('R_10', digits);

      // Lock trades
      engine.setTradeLock(true);

      engine.processTick('R_10', 5);
      expect(autoTradeCb).not.toHaveBeenCalled();

      // Unlock trades
      engine.setTradeLock(false);
      engine.processTick('R_10', 5);
      expect(autoTradeCb).toHaveBeenCalledTimes(1);
    });

    it('blocks auto-trade when engine is stopped by Stop Loss', () => {
      const autoTradeCb = vi.fn();
      engine.onAutoTrade(autoTradeCb);

      engine.updateConfig({
        autoOn: true,
        gateBias: false,
        stopLoss: 5,
        minScore: 60,
        minTicks: 50,
        cooldown: 0,
      });

      const digits: number[] = [];
      for (let i = 0; i < 100; i++) digits.push(i % 10);
      for (let i = 0; i < 40; i++) digits.push(7);
      digits.push(2);

      engine.setHistory('R_10', digits);

      // Trigger Stop Loss
      engine.settleContract(-10, true, 'R_10', 7, 7);
      expect(engine.getState().stopped).toBe(true);

      engine.processTick('R_10', 5);
      expect(autoTradeCb).not.toHaveBeenCalled();
    });
  });

  describe('resetLogicsMeasurement', () => {
    it('clears virtual statistics of all logics', () => {
      // Simulate ticks to populate logic stats
      for (let i = 0; i < 150; i++) {
        engine.processTick('R_10', i % 10);
      }

      const initialRanking = engine.getLogicRanking();
      const hasSamples = initialRanking.some((r) => r.n > 0);
      expect(hasSamples).toBe(true);

      // Reset logics measurement
      engine.resetLogicsMeasurement();

      const afterRanking = engine.getLogicRanking();
      const allZero = afterRanking.every((r) => r.n === 0);
      expect(allZero).toBe(true);
    });
  });

  describe('virtStats Tracking (Operation Tab Live Gauge)', () => {
    it('records virtual signal when score >= minScore and evaluates result on next tick', () => {
      engine.updateConfig({ minScore: 60, minTicks: 50 });

      // Seed market R_10
      const digits: number[] = [];
      for (let i = 0; i < 100; i++) digits.push(i % 10);
      for (let i = 0; i < 40; i++) digits.push(7);
      digits.push(2);
      engine.setHistory('R_10', digits);

      // Current state should have 0 virtual signals evaluated
      expect(engine.getState().virt.total).toBe(0);

      // Process tick to arm virtual signal (best digit is 7)
      engine.processTick('R_10', 5);

      // Next tick: incoming digit is 5 (different from 7, so it is a HIT)
      engine.processTick('R_10', 5);

      const virt = engine.getState().virt;
      expect(virt.total).toBeGreaterThanOrEqual(1);
      expect(virt.hit).toBeGreaterThanOrEqual(1);
      expect(virt.recent.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('lStatsM (Per-Market Logic Performance)', () => {
    it('tracks win and total count per market for each logic', () => {
      for (let i = 0; i < 60; i++) {
        engine.processTick('R_10', i % 10);
        engine.processTick('R_25', (i * 3) % 10);
      }

      const statsR10 = engine.getLogicMarketStats('sat', 'R_10');
      const statsR25 = engine.getLogicMarketStats('sat', 'R_25');

      expect(statsR10.n).toBeGreaterThan(0);
      expect(statsR25.n).toBeGreaterThan(0);
      expect(statsR10.w).toBeLessThanOrEqual(statsR10.n);
    });
  });

  describe('resolveLogic & deepScan modes', () => {
    it('resolves auto, rotate, and recent modes properly', () => {
      // Seed some ticks
      for (let i = 0; i < 200; i++) {
        engine.processTick('R_10', i % 10);
      }

      const resolvedAuto = engine.resolveLogic('auto');
      const resolvedRotate = engine.resolveLogic('rotate');
      const resolvedRecent = engine.resolveLogic('recent');

      expect(typeof resolvedRotate === 'string' || resolvedRotate === null).toBe(true);
      expect(typeof resolvedRecent === 'string' || resolvedRecent === null).toBe(true);
      expect(typeof resolvedAuto === 'string' || resolvedAuto === null).toBe(true);

      // deepScan should not crash and should work with rotate and recent
      const scanRotate = engine.deepScan('rotate');
      const scanRecent = engine.deepScan('recent');
      // If sample is enough, it can return a pick, otherwise null, but no crash or undefined logic lookup
      expect(scanRotate === null || (scanRotate && typeof scanRotate.digit === 'number')).toBe(true);
      expect(scanRecent === null || (scanRecent && typeof scanRecent.digit === 'number')).toBe(true);
    });
  });

  describe('checkGuards (Safety & Real Mode Gate)', () => {
    it('blocks Real mode if simulated trades are below gateOps', () => {
      engine.updateConfig({ opMode: 'real', gateOps: 50, gateAcc: 91 });

      // No sim trades yet
      const guard = engine.checkGuards();
      expect(guard).toContain('Trava do modo real');
      expect(guard).toContain('50');
    });

    it('blocks Real mode if simulated accuracy is below gateAcc', () => {
      engine.updateConfig({ opMode: 'sim' });
      // Simulate 50 operations with 80% win rate (40 wins, 10 losses)
      for (let i = 0; i < 40; i++) engine.settleContract(0.1, false, 'R_10', 5, 4);
      for (let i = 0; i < 10; i++) engine.settleContract(-1.0, true, 'R_10', 5, 5);

      engine.updateConfig({ opMode: 'real', gateOps: 50, gateAcc: 91 });
      const guard = engine.checkGuards();
      expect(guard).toContain('acerto simulado');
    });

    it('blocks trading when consecutive losses reach maxLoss', () => {
      engine.updateConfig({ opMode: 'sim', maxLoss: 3 });

      engine.settleContract(-1.0, true, 'R_10', 2, 2);
      engine.settleContract(-1.0, true, 'R_10', 3, 3);
      expect(engine.checkGuards()).toBeNull();

      engine.settleContract(-1.0, true, 'R_10', 4, 4);
      const guard = engine.checkGuards();
      expect(guard).toContain('perdas consecutivas');
    });

    it('blocks trading if accuracy drops below minAcc after 20 trades', () => {
      engine.updateConfig({ opMode: 'sim', minAcc: 80, stopLoss: 100, maxLoss: 5 });

      // 10 wins, 15 losses interleaved: W, L, L, W, L, L...
      for (let i = 0; i < 5; i++) {
        engine.settleContract(0.1, false, 'R_10', 1, 2);
        engine.settleContract(-1.0, true, 'R_10', 1, 1);
        engine.settleContract(-1.0, true, 'R_10', 1, 1);
      }
      for (let i = 0; i < 5; i++) {
        engine.settleContract(0.1, false, 'R_10', 1, 2);
        engine.settleContract(-1.0, true, 'R_10', 1, 1);
      }
      // Ending with a win so consecutive losses is 0
      engine.settleContract(0.1, false, 'R_10', 1, 2);

      const guard = engine.checkGuards();
      expect(guard).toContain('assertividade abaixo do mínimo');
    });
  });

  describe('scoreAll defensive guards', () => {
    it('handles zero window without NaN or crash', () => {
      const freq = new Array(10).fill(0);
      const gap = new Array(10).fill(0);
      const res = engine.scoreAll(freq, 0, gap, 0, 0, 0, 0, 100);
      expect(res.best.score).toBe(0);
      expect(isNaN(res.chi)).toBe(false);
    });
  });

  describe('runPipeline (Genetic Strategy Pipeline)', () => {
    it('executes 3-stage genetic cascade validation', () => {
      const digits: number[] = [];
      for (let i = 0; i < 700; i++) digits.push(i % 10);
      engine.setHistory('R_10', digits);

      const res = engine.runPipeline('R_10', 10, 0.2, 5);
      expect(res).not.toBeNull();
      expect(res?.totalGenomes).toBe(10);
      expect(typeof res?.survivorsStageA).toBe('number');
      expect(typeof res?.approvedCount).toBe('number');
      expect(Array.isArray(res?.candidates)).toBe(true);
    });
  });
});
