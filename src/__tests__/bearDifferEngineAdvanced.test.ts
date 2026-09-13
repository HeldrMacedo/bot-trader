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
        autoSource: 'motor2',
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
        autoSource: 'motor2',
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
        autoSource: 'motor2',
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
        autoSource: 'motor2',
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

  describe('resolveLogic & resolveTarget modes', () => {
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

      // resolveTarget should not crash with rotate or recent as the logic mode
      engine.updateConfig({ autoSource: 'logic', onceLogic: 'rotate' });
      const scanRotate = engine.resolveTarget();
      engine.updateConfig({ onceLogic: 'recent' });
      const scanRecent = engine.resolveTarget();
      // With or without sample it must answer with a target or a reason, never crash
      expect(scanRotate.reason !== null || typeof scanRotate.digit === 'number').toBe(true);
      expect(scanRecent.reason !== null || typeof scanRecent.digit === 'number').toBe(true);
    });
  });

  describe('Logic attribution on trades', () => {
    it('records which logic produced the entry', () => {
      engine.updateConfig({ opMode: 'sim', stopLoss: 0, stopWin: 0 });

      engine.settleContract(0.11, false, 'R_10', 4, 7, undefined, 'mk1');

      expect(engine.getState().trades[0].logicId).toBe('mk1');
    });

    it('names the reference engine when no logic drove the entry', () => {
      expect(engine.getLogicName(undefined)).toBe('Motor 2.0');
      expect(engine.getLogicName('motor2')).toBe('Motor 2.0');
    });

    it('resolves a logic id to the name shown to the operator', () => {
      expect(engine.getLogicName('mk1')).toBe('Markov 1ª ordem');
      expect(engine.getLogicName('exaust')).toBe('Exaustão de perdedores');
    });

    it('reports the logic the scan settled on, not the alternation mode', () => {
      engine.updateConfig({ gateBias: false, minTicks: 300, onceLogic: 'rep' });
      const digits: number[] = [];
      let s = 7;
      for (let i = 0; i < 400; i++) {
        s = (s * 1103515245 + 12345) % 2147483648;
        digits.push(Math.floor((s / 2147483648) * 10));
      }
      engine.setHistory('R_10', digits);
      engine.processTick('R_10', 3);

      engine.updateConfig({ autoSource: 'logic', onceLogic: 'rep', onceMinConf: 0, minTicks: 300 });

      const pick = engine.resolveTarget();
      expect(pick.reason).toBeNull();
      expect(pick.logicId).toBe('rep');
    });
  });

  describe('Auto-trade idle reason', () => {
    const seed = (count = 400) => {
      const digits: number[] = [];
      let s = 7;
      for (let i = 0; i < count; i++) {
        s = (s * 1103515245 + 12345) % 2147483648;
        digits.push(Math.floor((s / 2147483648) * 10));
      }
      engine.setHistory('R_10', digits);
    };

    it('says the bias gate is what holds the automatic mode', () => {
      engine.updateConfig({ autoOn: true, autoSource: 'motor2', gateBias: true, minScore: 0, minTicks: 50 });
      seed();

      engine.processTick('R_10', 4);

      expect(engine.getState().autoIdleReason).toMatch(/viés/i);
    });

    it('says the score is what holds it when the gate is open', () => {
      engine.updateConfig({ autoOn: true, autoSource: 'motor2', gateBias: false, minScore: 999, minTicks: 50 });
      seed();

      engine.processTick('R_10', 4);

      expect(engine.getState().autoIdleReason).toMatch(/score/i);
    });

    it('reports no reason once an entry actually fires', () => {
      engine.updateConfig({
        autoOn: true,
        autoSource: 'motor2',
        gateBias: false,
        minScore: 0,
        minTicks: 50,
        cooldown: 0,
      });
      seed();

      let fired = 0;
      engine.onAutoTrade(() => {
        fired++;
      });
      engine.processTick('R_10', 4);

      expect(fired).toBe(1);
      expect(engine.getState().autoIdleReason).toBeNull();
    });

    it('logs the reason once instead of on every tick', () => {
      engine.updateConfig({ autoOn: true, autoSource: 'motor2', gateBias: true, minScore: 0, minTicks: 50 });
      seed();

      for (let i = 0; i < 5; i++) engine.processTick('R_10', i);

      const hits = engine.getState().logs.filter((l) => /viés/i.test(l.msg));
      expect(hits.length).toBe(1);
    });
  });

  describe('runWatch (market surveillance)', () => {
    it('reports markets that are still collecting sample', () => {
      engine.setHistory('R_10', Array.from({ length: 300 }, (_, i) => i % 10));

      engine.runWatch();

      expect(engine.getState().watch['R_10'].status).toBe('amostra');
    });

    it('flags a market whose generator is provably not random', () => {
      // A perfectly cyclic sequence is fully Markov-dependent: the lab must
      // catch it even after the Bonferroni correction
      engine.setHistory('R_10', Array.from({ length: 2500 }, (_, i) => i % 10));

      engine.runWatch();

      expect(engine.getState().watch['R_10'].status).toBe('quebra');
      expect(engine.getState().alerts.length).toBeGreaterThan(0);
    });

    it('raises an alert only on the transition into a break', () => {
      engine.setHistory('R_10', Array.from({ length: 2500 }, (_, i) => i % 10));

      engine.runWatch();
      const afterFirst = engine.getState().alerts.length;
      engine.runWatch();

      expect(engine.getState().alerts.length).toBe(afterFirst);
    });
  });

  describe('Partial martingale level cap', () => {
    it('resets the partial ladder once it passes the configured ceiling', () => {
      engine.updateConfig({
        opMode: 'sim',
        mgMode: 'partial',
        mgMax: 2,
        mgParts: 3,
        stake: 1,
        stopLoss: 0,
        stopWin: 0,
      });

      engine.settleContract(-1, true, 'R_10', 3, 3);
      engine.settleContract(-1, true, 'R_10', 3, 3);
      expect(engine.getState().mgLevel).toBe(2);

      // Level 3 passes the ceiling of 2: back to the base stake
      engine.settleContract(-1, true, 'R_10', 3, 3);

      expect(engine.getState().mgLevel).toBe(0);
      expect(engine.getState().curStake).toBe(1);
    });
  });

  describe('resolveLogic refuses instead of guessing', () => {
    it('returns null for the rotation mode while no logic has the minimum sample', () => {
      expect(engine.resolveLogic('rotate')).toBeNull();
    });

    it('returns null for the recent-performance mode while no logic has enough signals', () => {
      expect(engine.resolveLogic('recent')).toBeNull();
    });

    it('still resolves a logic picked by hand', () => {
      expect(engine.resolveLogic('rep')).toBe('rep');
    });
  });

  describe('Bias gate on the single-operation scan', () => {
    const seedMarket = (sym: string, count: number) => {
      const digits: number[] = [];
      let seed = 7;
      for (let i = 0; i < count; i++) {
        seed = (seed * 1103515245 + 12345) % 2147483648;
        digits.push(Math.floor(seed / 2147483648 * 10));
      }
      engine.setHistory(sym, digits);
      // A couple of ticks to populate the live picks
      engine.processTick(sym, 3);
      engine.processTick(sym, 8);
    };

    it('returns a target when the bias gate is off', () => {
      engine.updateConfig({
        gateBias: false,
        minTicks: 300,
        onceLogic: 'rep',
        autoSource: 'logic',
        onceMinConf: 0,
      });
      seedMarket('R_10', 400);

      expect(engine.resolveTarget().reason).toBeNull();
    });

    it('refuses every market that has not proven bias while the gate is on', () => {
      engine.updateConfig({
        gateBias: true,
        minTicks: 300,
        onceLogic: 'rep',
        autoSource: 'logic',
        onceMinConf: 0,
      });
      seedMarket('R_10', 400);

      // 400 ticks is far below labMin, so no market can be proven
      expect(engine.isMarketProven('R_10')).toBe(false);
      expect(engine.resolveTarget().reason).toMatch(/trava de viés/i);
    });
  });

  describe('exhaustBlock (reversal filter)', () => {
    beforeEach(() => {
      // 100 ticks where the digit 7 never shows up
      const digits = Array.from({ length: 100 }, (_, i) => i % 7);
      engine.setHistory('R_10', digits);
    });

    it('lets the entry through while the filter is off', () => {
      engine.updateConfig({ exFilter: false });
      expect(engine.exhaustBlock('R_10', 7)).toBeNull();
    });

    it('blocks a digit that is not exhausted', () => {
      engine.updateConfig({ exFilter: true });
      expect(engine.exhaustBlock('R_10', 7)).toMatch(/exaust/i);
    });

    it('blocks a digit that never caused a loss when only losers are allowed', () => {
      const digits: number[] = [];
      for (let i = 0; i < 60; i++) digits.push(i % 4 === 0 ? 7 : (i % 5) + 1);
      engine.setHistory('R_10', digits);
      engine.updateConfig({ exFilter: true, exOnlyLosers: true });

      expect(engine.getExhaustion('R_10', 7)?.ok).toBe(true);
      expect(engine.exhaustBlock('R_10', 7)).toMatch(/loss/i);
    });
  });

  describe('Stop Loss / Stop Win boundaries', () => {
    it('keeps simulated and real results in separate books for the stop checks', () => {
      engine.updateConfig({ opMode: 'sim', stopLoss: 5, stopWin: 100 });

      // A simulated loss of -4: below the limit, nothing stops
      engine.settleContract(-4.0, true, 'R_10', 3, 3);
      expect(engine.getState().stopped).toBe(false);

      // Switching to real starts a fresh book. gateOps/gateAcc are not part
      // of this check, only the stop accounting.
      engine.updateConfig({ opMode: 'real' });
      engine.settleContract(-2.0, true, 'R_10', 3, 3);

      // Real book is at -2, far from the -5 stop. The simulated -4 must not
      // count towards it.
      expect(engine.getState().stopped).toBe(false);
      expect(engine.getState().pnl).toBe(-2);
    });

    it('still stops when the active book alone reaches the stop loss', () => {
      engine.updateConfig({ opMode: 'real', stopLoss: 5, stopWin: 100 });

      engine.settleContract(-3.0, true, 'R_10', 3, 3);
      expect(engine.getState().stopped).toBe(false);

      engine.settleContract(-2.0, true, 'R_10', 3, 3);
      expect(engine.getState().stopped).toBe(true);
      expect(engine.getState().stoppedReason).toMatch(/Stop Loss/i);
    });

    it('treats a stop set to zero as disabled instead of firing immediately', () => {
      engine.updateConfig({ opMode: 'sim', stopLoss: 0, stopWin: 0 });

      engine.settleContract(0.11, false, 'R_10', 3, 4);

      expect(engine.getState().stopped).toBe(false);
      expect(engine.getConfig().autoOn).toBe(false);
    });

    it('stops on a take profit that was actually configured', () => {
      engine.updateConfig({ opMode: 'sim', stopLoss: 0, stopWin: 1 });

      engine.settleContract(1.5, false, 'R_10', 3, 4);

      expect(engine.getState().stopped).toBe(true);
      expect(engine.getState().stoppedReason).toMatch(/Stop Win/i);
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
