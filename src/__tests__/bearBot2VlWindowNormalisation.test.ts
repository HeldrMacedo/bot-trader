import { describe, it, expect } from 'vitest';
import { createEngine } from '../app/services/BearBot2Engine';

/**
 * In accumulated mode the virtual-loss counter only inspects the last vlWindow
 * ticks, so it can never reach a vlQty larger than that window and the entry gate
 * stays shut forever with no feedback. The window is widened to the threshold the
 * user asked for, which keeps vlQty as the single source of truth.
 */
describe('accum vlWindow normalisation', () => {
  it('widens the window to vlQty when the engine is created with an unreachable pair', () => {
    const engine = createEngine({ vlOn: true, vlMode: 'accum', vlQty: 5, vlWindow: 3 });
    expect(engine.getConfig().vlWindow).toBe(5);
    expect(engine.getConfig().vlQty).toBe(5);
  });

  it('widens the window when vlQty is raised above it', () => {
    const engine = createEngine({ vlOn: true, vlMode: 'accum', vlQty: 2, vlWindow: 4 });
    engine.updateConfig({ vlQty: 9 });
    expect(engine.getConfig().vlWindow).toBe(9);
  });

  it('raises a window typed below vlQty back to vlQty', () => {
    const engine = createEngine({ vlOn: true, vlMode: 'accum', vlQty: 6, vlWindow: 14 });
    engine.updateConfig({ vlWindow: 2 });
    expect(engine.getConfig().vlWindow).toBe(6);
  });

  it('leaves a wider window untouched', () => {
    const engine = createEngine({ vlOn: true, vlMode: 'accum', vlQty: 3, vlWindow: 20 });
    expect(engine.getConfig().vlWindow).toBe(20);
  });

  it('does not touch the window in consecutive mode, which ignores it', () => {
    const engine = createEngine({ vlOn: true, vlMode: 'consec', vlQty: 5, vlWindow: 3 });
    expect(engine.getConfig().vlWindow).toBe(3);
  });

  it('normalises on the switch from consecutive to accumulated mode', () => {
    const engine = createEngine({ vlOn: true, vlMode: 'consec', vlQty: 5, vlWindow: 3 });
    engine.updateConfig({ vlMode: 'accum' });
    expect(engine.getConfig().vlWindow).toBe(5);
  });

  it('lets the gate actually reach vlQty after normalisation', () => {
    const engine = createEngine({
      mode: 'over',
      digit: 2,
      vlOn: true,
      vlMode: 'accum',
      vlQty: 5,
      vlWindow: 3,
      activeSym: 'R_100',
      tradeCooldownMs: 0,
    });
    for (let i = 0; i < 60; i++) engine.processTick('R_100', 100.0, 9);
    for (let i = 0; i < 6; i++) engine.processTick('R_100', 100.0, 1);

    const state = engine.getState();
    expect(state.vlCount).toBe(5);
    expect(state.marketIntel['R_100'].vlProgress).toBe(100);
  });
});
