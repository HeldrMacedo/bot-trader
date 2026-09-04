import { describe, it, expect, afterEach, vi } from 'vitest';
import { createEngine } from '../app/services/BearBot2Engine';
import { MARKETS } from '../app/services/bearbot2.types';

/**
 * Regression tests for the four market-intelligence defects found in MarketGrid's
 * IA Cross-Market panel. Each test pins the root cause, not the symptom.
 */

function feedABPattern(engine: ReturnType<typeof createEngine>, sym: string, pairs = 30) {
  for (let i = 0; i < pairs; i++) {
    engine.processTick(sym, 100.01, 1);
    engine.processTick(sym, 100.02, 2);
  }
}

describe('marketIntel recompute throttle', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('keeps the 1-in-3 tick cadence after the 120-tick buffer is full', () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    const engine = createEngine({ mode: 'over', digit: 2, vlOn: false, tradeCooldownMs: 0 });

    // Fill the rolling buffer past its 120-tick cap.
    for (let i = 1; i <= 130; i++) {
      vi.setSystemTime(i * 1000);
      engine.processTick('R_100', 100.0, i % 10);
    }

    // Buffer is now pinned at 120, so a length-based modulo would fire every tick.
    let previous = engine.getState().marketIntel['R_100'].lastUpdate;
    let recomputes = 0;
    for (let i = 131; i <= 160; i++) {
      vi.setSystemTime(i * 1000);
      engine.processTick('R_100', 100.0, i % 10);
      const stamp = engine.getState().marketIntel['R_100'].lastUpdate;
      if (stamp !== previous) recomputes++;
      previous = stamp;
    }

    // 30 ticks at a 1-in-3 cadence must produce exactly 10 recomputes.
    expect(recomputes).toBe(10);
  });
});

describe('marketIntel cold start', () => {
  it('reports neutral pressure while there are fewer than 50 ticks', () => {
    const engine = createEngine({ mode: 'over', digit: 2, vlOn: false, tradeCooldownMs: 0 });
    for (let i = 0; i < 9; i++) engine.processTick('R_100', 100.0, 9);

    const intel = engine.getState().marketIntel['R_100'];
    expect(intel).toBeDefined();
    // Not enough history to measure loser pressure: must be neutral, never 0 (= perfect).
    expect(intel.pressure).toBe(50);
  });

  it('does not recommend buying a market that has no history yet', () => {
    const engine = createEngine({ mode: 'over', digit: 2, vlOn: false, tradeCooldownMs: 0 });
    for (let i = 0; i < 9; i++) engine.processTick('R_100', 100.0, 9);

    const intel = engine.getState().marketIntel['R_100'];
    expect(intel.opportunityScore).toBeLessThan(60);
    expect(intel.recommendation).not.toBe('buy');
    expect(intel.recommendation).not.toBe('strong_buy');
  });
});

describe('syncScore normalisation', () => {
  it('scales by the number of comparable markets, not a hardcoded 3', () => {
    const engine = createEngine({ mode: 'differ', patTrigger: true, digit: 2, vlOn: false, tradeCooldownMs: 0 });
    // R_100 plus 3 peers share the same armed A->B pattern; 3 further markets do not.
    feedABPattern(engine, 'R_100', 30);
    feedABPattern(engine, 'R_75', 30);
    feedABPattern(engine, 'R_50', 30);
    feedABPattern(engine, 'R_25', 30);

    const intel = engine.getState().marketIntel['R_100'];
    const peers = MARKETS.length - 1;
    expect(peers).toBe(6);
    // 3 of 6 peers in sync = 50%, not a saturated 100%.
    expect(intel.syncScore).toBe(Math.round((3 / peers) * 100));
  });

  it('only reaches 100 when every other market is in sync', () => {
    const engine = createEngine({ mode: 'differ', patTrigger: true, digit: 2, vlOn: false, tradeCooldownMs: 0 });
    MARKETS.forEach(m => feedABPattern(engine, m.sym, 30));

    expect(engine.getState().marketIntel['R_100'].syncScore).toBe(100);
  });
});

describe('vlFocusOnly vlProgress', () => {
  function seedFocusOnly() {
    const engine = createEngine({
      mode: 'over',
      digit: 2,
      vlOn: true,
      multiOn: true,
      vlFocusOnly: true,
      vlQty: 2,
      activeSym: 'R_100',
      tradeCooldownMs: 0,
    });
    for (let i = 0; i < 60; i++) {
      MARKETS.forEach(m => engine.processTick(m.sym, 100.0, i % 10));
    }
    // Focus drifts while multiOn is on, so read the live active symbol.
    const activeSym = engine.getConfig().activeSym;
    const unfocused = MARKETS.filter(m => m.sym !== activeSym).map(m => m.sym);
    return { state: engine.getState(), activeSym, unfocused };
  }

  it('gives unfocused markets a neutral vlProgress instead of a full one', () => {
    const { state, unfocused } = seedFocusOnly();
    expect(unfocused).toHaveLength(MARKETS.length - 1);
    // Unfocused markets accumulate no VL, so their VL pillar is unknown, not satisfied.
    for (const sym of unfocused) {
      expect(state.marketIntel[sym].vlProgress).toBe(50);
    }
  });

  it('does not let unfocused markets outrank the focused one on the VL pillar alone', () => {
    const { state, activeSym, unfocused } = seedFocusOnly();
    const focused = state.marketIntel[activeSym].vlProgress;
    // The focused market reports its real (here: zero) progress.
    expect(focused).toBe(0);
    for (const sym of unfocused) {
      expect(state.marketIntel[sym].vlProgress).toBeLessThan(100);
    }
  });
});

describe('AI gate with insufficient data', () => {
  it('flags intelligence as not ready before 50 ticks and ready after', () => {
    const engine = createEngine({ mode: 'over', digit: 2, vlOn: false, tradeCooldownMs: 0 });
    for (let i = 0; i < 9; i++) engine.processTick('R_100', 100.0, 9);
    expect(engine.getState().marketIntel['R_100'].dataReady).toBe(false);

    for (let i = 0; i < 60; i++) engine.processTick('R_100', 100.0, i % 10);
    expect(engine.getState().marketIntel['R_100'].dataReady).toBe(true);
  });

  it('does not block a cold market whose score is only low for lack of history', () => {
    const engine = createEngine({
      activeSym: 'R_100',
      mode: 'differ',
      exec: 'manual',
      autoOn: false,
      multiOn: true,
      vlOn: true,
      vlFocusOnly: true,
      vlMode: 'accum',
      vlQty: 3,
      vlWindow: 10,
      digit: 2,
      differAutoDigit: true,
      tradeCooldownMs: 0,
    });

    engine.processTick('R_100', 100.0, 8);
    engine.processTick('R_100', 100.0, 4);
    engine.processTick('R_100', 100.0, 8);

    const intel = engine.getState().marketIntel['R_100'];
    // The market is still cold, so the gate must fall through rather than veto it...
    expect(intel.dataReady).toBe(false);
    expect(intel.opportunityScore).toBeLessThan(40);
    // ...and the auto digit must still reach the config.
    expect(engine.getState().autoDigitBySym?.['R_100']).toBe(8);
    expect(engine.getConfig().digit).toBe(8);
  });
});
