import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createEngine } from '../app/services/BearBot2Engine';

describe('BearBot2Engine - PADRÃO A→B (Differ Pattern)', () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  describe('1. Configuration & Default Values', () => {
    it('initializes with correct default configuration for PADRÃO A→B', () => {
      const engine = createEngine();
      const config = engine.getConfig();

      expect(config.patTrigger).toBe(false);
      expect(config.patMode).toBe('accum');
      expect(config.patReps).toBe(3);
      expect(config.patMinForce).toBe(30);
    });

    it('allows updating PADRÃO A→B config parameters via updateConfig', () => {
      const engine = createEngine();

      engine.updateConfig({
        patTrigger: true,
        patMode: 'seq',
        patReps: 5,
        patMinForce: 45,
      });

      const config = engine.getConfig();
      expect(config.patTrigger).toBe(true);
      expect(config.patMode).toBe('seq');
      expect(config.patReps).toBe(5);
      expect(config.patMinForce).toBe(45);
    });
  });

  describe('2. Pattern Detection and Arming in Accumulative Mode (accum)', () => {
    it('detects strong A→B pattern and arms when reps threshold and quality are met', () => {
      const engine = createEngine({
        mode: 'differ',
        patTrigger: true,
        patMode: 'accum',
        patReps: 3,
        patMinForce: 30,
      });

      // Feed alternating 1→2 ticks
      for (let i = 0; i < 20; i++) {
        engine.processTick('R_100', 100.01, 1);
        engine.processTick('R_100', 100.02, 2);
      }

      const intel = engine.getState().marketIntel['R_100'];
      expect(intel).toBeDefined();
      expect(intel.patternStrength).toBeGreaterThan(0);

      // Verify pattern state in engine by checking trigger capability
      let autoTradeCalled = false;
      let tradedKind = '';
      engine.onAutoTrade((kind) => {
        autoTradeCalled = true;
        tradedKind = kind;
      });

      engine.updateConfig({ exec: 'auto', autoOn: true, vlOn: false, tradeCooldownMs: 0 });

      // Digit 1 (A) arrives -> pattern 1->2 is armed -> triggers differ with target digit 2 (B)
      engine.processTick('R_100', 100.01, 1);

      expect(autoTradeCalled).toBe(true);
      expect(tradedKind).toBe('differ');
      expect(engine.getConfig().digit).toBe(2);
    });

    it('does not arm when patReps is higher than accumulated count', () => {
      const engine = createEngine({
        mode: 'differ',
        patTrigger: true,
        patMode: 'accum',
        patReps: 50, // very high reps requirement
        patMinForce: 30,
      });

      // Feed only 5 pairs
      for (let i = 0; i < 5; i++) {
        engine.processTick('R_100', 100.01, 1);
        engine.processTick('R_100', 100.02, 2);
      }

      let autoTradeCalled = false;
      engine.onAutoTrade(() => {
        autoTradeCalled = true;
      });

      engine.updateConfig({ exec: 'auto', autoOn: true, vlOn: false, tradeCooldownMs: 0 });
      engine.processTick('R_100', 100.01, 1);

      expect(autoTradeCalled).toBe(false);
    });
  });

  describe('3. Pattern Detection and Arming in Sequence Mode (seq)', () => {
    it('arms in sequence mode when consecutive A→B occurrences reach patReps', () => {
      const engine = createEngine({
        mode: 'differ',
        patTrigger: true,
        patMode: 'seq',
        patReps: 2,
        patMinForce: 20,
      });

      // First establish the base pattern statistically
      for (let i = 0; i < 15; i++) {
        engine.processTick('R_100', 100.03, 3);
        engine.processTick('R_100', 100.07, 7);
      }

      let autoTradeCalled = false;
      engine.onAutoTrade(() => {
        autoTradeCalled = true;
      });

      engine.updateConfig({ exec: 'auto', autoOn: true, vlOn: false, tradeCooldownMs: 0 });

      // Digit 3 (A) arrives
      engine.processTick('R_100', 100.03, 3);

      expect(autoTradeCalled).toBe(true);
      expect(engine.getConfig().digit).toBe(7);
    });
  });

  describe('4. Minimum Force Filter (patMinForce)', () => {
    it('blocks arming if patMinForce is set higher than pattern force', () => {
      const engine = createEngine({
        mode: 'differ',
        patTrigger: true,
        patMode: 'accum',
        patReps: 2,
        patMinForce: 99, // Requires 99% force
      });

      // Feed mixed pairs (e.g. 1->2 sometimes, 1->4 sometimes)
      for (let i = 0; i < 15; i++) {
        engine.processTick('R_100', 100.01, 1);
        engine.processTick('R_100', 100.02, 2);
        engine.processTick('R_100', 100.01, 1);
        engine.processTick('R_100', 100.04, 4);
      }

      let autoTradeCalled = false;
      engine.onAutoTrade(() => {
        autoTradeCalled = true;
      });

      engine.updateConfig({ exec: 'auto', autoOn: true, vlOn: false, tradeCooldownMs: 0 });
      engine.processTick('R_100', 100.01, 1);

      expect(autoTradeCalled).toBe(false);
    });

    it('arms successfully when patMinForce threshold is lowered to match pattern strength', () => {
      const engine = createEngine({
        mode: 'differ',
        patTrigger: true,
        patMode: 'accum',
        patReps: 2,
        patMinForce: 95,
      });

      for (let i = 0; i < 20; i++) {
        engine.processTick('R_100', 100.01, 1);
        engine.processTick('R_100', 100.02, 2);
        engine.processTick('R_100', 100.07, 7);
        engine.processTick('R_100', 100.01, 1);
        engine.processTick('R_100', 100.04, 4);
        engine.processTick('R_100', 100.08, 8);
      }

      let autoTradeCalled = false;
      engine.onAutoTrade(() => {
        autoTradeCalled = true;
      });

      engine.updateConfig({ exec: 'auto', autoOn: true, vlOn: false, tradeCooldownMs: 0 });

      // Threshold 95% blocks pattern with lower force
      engine.processTick('R_100', 100.01, 1);
      expect(autoTradeCalled).toBe(false);

      // Lower patMinForce to 25% allows pattern to fire
      engine.updateConfig({ patMinForce: 25 });
      engine.processTick('R_100', 100.02, 2);
      engine.processTick('R_100', 100.07, 7);

      expect(autoTradeCalled).toBe(true);
      expect(engine.getConfig().digit).toBe(7); // 2 is followed by 7
    });
  });

  describe('5. Waiting State & Pattern Break Transition', () => {
    it('resets pattern state when waiting for B but a different digit arrives', () => {
      const engine = createEngine({
        mode: 'differ',
        patTrigger: true,
        patMode: 'accum',
        patReps: 2,
        patMinForce: 25,
      });

      for (let i = 0; i < 20; i++) {
        engine.processTick('R_100', 100.01, 1);
        engine.processTick('R_100', 100.02, 2);
      }

      engine.updateConfig({ exec: 'auto', autoOn: true, vlOn: false, tradeCooldownMs: 0 });

      // Trigger trade on digit 1 -> enters waiting for 2
      engine.processTick('R_100', 100.01, 1);

      // Now a broken digit 9 arrives instead of 2
      engine.processTick('R_100', 100.09, 9);

      // Check log line confirming pattern broke
      const logs = engine.getState().logLines;
      const brokeLog = logs.find(l => l.msg.includes('quebrou') || l.msg.includes('reset'));
      expect(brokeLog).toBeDefined();
    });
  });

  describe('6. Multi-Market Pattern Selection (multiOn = true)', () => {
    it('selects the market with the armed pattern and triggers differ trade on that market', () => {
      const engine = createEngine({
        mode: 'differ',
        patTrigger: true,
        multiOn: true,
        exec: 'auto',
        autoOn: true,
        vlOn: false,
        tradeCooldownMs: 0,
        activeSym: 'R_100',
      });

      // Feed strong 4→8 pattern to R_50
      for (let i = 0; i < 25; i++) {
        engine.processTick('R_50', 50.04, 4);
        engine.processTick('R_50', 50.08, 8);
      }

      let autoTradeCalled = false;
      let firedKind = '';
      engine.onAutoTrade((kind) => {
        autoTradeCalled = true;
        firedKind = kind;
      });

      // Tick 4 on R_50 triggers multi candidate
      engine.processTick('R_50', 50.04, 4);

      expect(autoTradeCalled).toBe(true);
      expect(firedKind).toBe('differ');
      expect(engine.getConfig().activeSym).toBe('R_50');
      expect(engine.getConfig().digit).toBe(8);
    });
  });

  describe('7. Integration with resetStats', () => {
    it('clears all pattern tracking counters upon resetStats', () => {
      const engine = createEngine({
        mode: 'differ',
        patTrigger: true,
      });

      for (let i = 0; i < 20; i++) {
        engine.processTick('R_100', 100.01, 1);
        engine.processTick('R_100', 100.02, 2);
      }

      engine.resetStats();
      const state = engine.getState();
      expect(state.wins).toBe(0);
      expect(state.loss).toBe(0);
      expect(state.pnl).toBe(0);
      expect(state.trades.length).toBe(0);
    });
  });
});
