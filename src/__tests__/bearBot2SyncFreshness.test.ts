import { describe, it, expect, afterEach, vi } from 'vitest';
import { createEngine } from '../app/services/BearBot2Engine';
import { MARKETS } from '../app/services/bearbot2.types';

/**
 * Pattern state is only advanced by that market's own ticks, so a market whose
 * feed dies keeps its last armed A->B pattern forever. Counting it as synchronised
 * lets a dead feed inflate the Sincronia Cross-Market pillar indefinitely.
 */
function feedABPattern(engine: ReturnType<typeof createEngine>, sym: string, pairs = 30) {
  for (let i = 0; i < pairs; i++) {
    engine.processTick(sym, 100.01, 1);
    engine.processTick(sym, 100.02, 2);
  }
}

describe('syncScore freshness', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('stops counting markets whose feed went silent', () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    const engine = createEngine({ mode: 'differ', patTrigger: true, digit: 2, vlOn: false, tradeCooldownMs: 0 });
    MARKETS.forEach(m => feedABPattern(engine, m.sym, 30));

    expect(engine.getState().marketIntel['R_100'].syncScore).toBe(100);

    // Every other feed dies; only R_100 keeps ticking a minute later.
    vi.setSystemTime(61_000);
    feedABPattern(engine, 'R_100', 3);

    // Their armed patterns are frozen snapshots, not live agreement.
    expect(engine.getState().marketIntel['R_100'].syncScore).toBe(0);
  });

  it('keeps counting markets that are still ticking', () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    const engine = createEngine({ mode: 'differ', patTrigger: true, digit: 2, vlOn: false, tradeCooldownMs: 0 });
    MARKETS.forEach(m => feedABPattern(engine, m.sym, 30));

    vi.setSystemTime(61_000);
    MARKETS.forEach(m => feedABPattern(engine, m.sym, 3));

    expect(engine.getState().marketIntel['R_100'].syncScore).toBe(100);
  });
});
