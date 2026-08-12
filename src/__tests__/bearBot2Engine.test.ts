import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createEngine } from '../app/services/BearBot2Engine';

describe('BearBot2Engine trade path', () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  it('prepareTrade locks and second prepare returns null', () => {
    const engine = createEngine({ paperMode: true, tradeCooldownMs: 0, maxTradesHour: 100 });
    // need digits for later; lock test does not need ticks
    const prep1 = engine.prepareTrade('over');
    expect(prep1).not.toBeNull();
    expect(engine.getState().tradeLock).toBe(true);
    const prep2 = engine.prepareTrade('over');
    expect(prep2).toBeNull();
  });

  it('tryManualFire does not lock; prepareTrade locks once', () => {
    const engine = createEngine({ paperMode: true, tradeCooldownMs: 0 });
    expect(engine.tryManualFire()).toBe(true);
    expect(engine.getState().tradeLock).toBe(false);
    const prep = engine.prepareTrade('over');
    expect(prep).not.toBeNull();
    expect(engine.getState().tradeLock).toBe(true);
    // second manual while locked fails
    expect(engine.tryManualFire()).toBe(false);
  });

  it('abortPendingTrade releases lock without changing PnL or gale', () => {
    const engine = createEngine({ paperMode: true, tradeCooldownMs: 0 });
    engine.prepareTrade('over');
    const before = engine.getState();
    expect(before.tradeLock).toBe(true);
    engine.abortPendingTrade('test abort');
    const after = engine.getState();
    expect(after.tradeLock).toBe(false);
    expect(after.pnl).toBe(before.pnl);
    expect(after.galeLevel).toBe(before.galeLevel);
    expect(after.loss).toBe(before.loss);
    expect(after.wins).toBe(before.wins);
  });

  it('paper combo simulates two legs and nets P&L', () => {
    const engine = createEngine({ paperMode: true, mode: 'combo', tradeCooldownMs: 0, stake: 1 });
    // last digit 3: OVER5 loses, UNDER4 wins
    for (let i = 0; i < 5; i++) engine.processTick('R_100', 100.03, 3);
    const prep = engine.prepareTrade('combo');
    expect(prep?.isPaper).toBe(true);
    const sim = engine.simulateTrade('combo');
    expect(sim).not.toBeNull();
    // p1 = -1, p2 = +0.94 → net -0.06, won=1 → not both lost
    expect(sim!.isLoss).toBe(false);
    expect(sim!.profit).toBeCloseTo(-0.06, 2);

    engine.settleContract(sim!.profit, sim!.isLoss, 'combo', sim!.exitDig, sim!.audit);
    expect(engine.getState().tradeLock).toBe(false);
    expect(engine.getState().trades[0].modo).toBe('COMBO');
  });

  it('paper combo both legs lose is LOSS', () => {
    const engine = createEngine({ paperMode: true, mode: 'combo', tradeCooldownMs: 0, stake: 1 });
    // digit 4 or 5: both OVER5 and UNDER4 lose (4 is not >5 and not <4)
    for (let i = 0; i < 3; i++) engine.processTick('R_100', 100.04, 4);
    const sim = engine.simulateTrade('combo');
    expect(sim!.isLoss).toBe(true);
    expect(sim!.profit).toBeCloseTo(-2, 2);
  });

  it('combo settle aggregates two legs then finishes once', () => {
    const engine = createEngine({ paperMode: false, mode: 'combo', tradeCooldownMs: 0, stake: 1 });
    const prep = engine.prepareTrade('combo');
    expect(prep?.legs?.length).toBe(2);
    expect(engine.isComboPending()).toBe(true);
    expect(engine.getState().tradeLock).toBe(true);

    engine.settleContract(0.5, false, 'combo', 7, null);
    expect(engine.getState().tradeLock).toBe(true); // still waiting second leg
    expect(engine.getState().trades.length).toBe(0);

    engine.settleContract(-1, true, 'combo', 4, null);
    expect(engine.getState().tradeLock).toBe(false);
    expect(engine.getState().trades.length).toBe(1);
    expect(engine.getState().trades[0].modo).toBe('COMBO');
    expect(Number(engine.getState().trades[0].lucro)).toBeCloseTo(-0.5, 2);
  });

  it('demoteComboToSingle allows single-leg finishTrade', () => {
    const engine = createEngine({ paperMode: false, mode: 'combo', tradeCooldownMs: 0 });
    engine.prepareTrade('combo');
    expect(engine.isComboPending()).toBe(true);
    engine.demoteComboToSingle();
    expect(engine.isComboPending()).toBe(false);
    engine.settleContract(0.3, false, 'over', 7, null);
    expect(engine.getState().tradeLock).toBe(false);
    expect(engine.getState().trades[0].modo).toBe('OVER');
  });

  it('auto path does not reset VL when tradeLock is held', () => {
    const engine = createEngine({
      paperMode: true,
      mode: 'over',
      digit: 2,
      exec: 'auto',
      autoOn: false,
      vlOn: true,
      vlMode: 'consec',
      vlQty: 2,
      tradeCooldownMs: 0,
    });
    // Build VL without auto fire: losers for over 2 are 0..2
    engine.processTick('R_100', 100.00, 0);
    engine.processTick('R_100', 100.01, 1);
    expect(engine.getState().vlCount).toBe(2);

    // Lock via prepare without settle, then enable auto
    engine.prepareTrade('over');
    expect(engine.getState().tradeLock).toBe(true);
    engine.updateConfig({ autoOn: true });

    const auto = vi.fn();
    engine.onAutoTrade(auto);

    // Gate open + auto on, but lock held → no VL reset, no auto fire
    const vlBefore = engine.getState().vlCount;
    engine.processTick('R_100', 100.02, 2);
    expect(auto).not.toHaveBeenCalled();
    expect(engine.getState().vlCount).toBeGreaterThanOrEqual(vlBefore);
    expect(engine.getState().tradeLock).toBe(true);
  });

  it('exposes vlBySym for multi UI', () => {
    const engine = createEngine({ multiOn: true, vlOn: true, vlMode: 'consec', vlQty: 2 });
    engine.processTick('R_25', 123.456, 1);
    engine.processTick('R_25', 123.457, 2);
    const st = engine.getState();
    expect(st.vlBySym['R_25']).toBeDefined();
    expect(st.vlBySym['R_25'].count).toBeGreaterThanOrEqual(0);
  });

  it('updateConfig stake syncs curStake when galeLevel is 0', () => {
    const engine = createEngine({ stake: 0.35 });
    engine.updateConfig({ stake: 1.5 });
    expect(engine.getState().curStake).toBe(1.5);
  });
});
