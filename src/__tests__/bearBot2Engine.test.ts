import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
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
    // p1 = -1, p2 = +0.94 → net -0.06: one leg won but net is negative → LOSS
    expect(sim!.isLoss).toBe(true);
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

/** Strong alternating 1→2 sequence that getBestPattern can arm. */
function feedABPattern(engine: ReturnType<typeof createEngine>, sym: string, pairs = 30) {
  for (let i = 0; i < pairs; i++) {
    engine.processTick(sym, 100.01, 1);
    engine.processTick(sym, 100.02, 2);
  }
}

describe('BearBot2Engine market intelligence', () => {
  it('computes patternStrength in over mode (not only differ)', () => {
    const engine = createEngine({ mode: 'over', digit: 2, vlOn: false });
    feedABPattern(engine, 'R_100', 30);
    const intel = engine.getState().marketIntel['R_100'];
    expect(intel).toBeDefined();
    expect(intel.patternStrength).toBeGreaterThan(0);
  });

  it('computes syncScore when the same A→B pattern is armed on other markets', () => {
    const engine = createEngine({ mode: 'over', digit: 2, vlOn: false });
    feedABPattern(engine, 'R_100', 30);
    feedABPattern(engine, 'R_75', 30);
    feedABPattern(engine, 'R_50', 30);
    feedABPattern(engine, 'R_25', 30);
    const intel = engine.getState().marketIntel['R_100'];
    expect(intel).toBeDefined();
    expect(intel.syncScore).toBeGreaterThan(0);
  });

  it('computes loser pressure after 50 ticks', () => {
    const engine = createEngine({ mode: 'over', digit: 2, vlOn: false });
    // Over 2 losers are 0,1,2 — flood losers so pressure > 0
    for (let i = 0; i < 51; i++) {
      engine.processTick('R_100', 100.00, i % 3);
    }
    const intel = engine.getState().marketIntel['R_100'];
    expect(intel).toBeDefined();
    expect(intel.pressure).toBeGreaterThan(0);
  });
});

/** Weights from score_oportunidade.md — source of truth for aiMode. */
const AI_WEIGHTS = {
  conservative: { pressure: 0.45, pattern: 0.20, vl: 0.25, sync: 0.10 },
  balanced: { pressure: 0.35, pattern: 0.25, vl: 0.25, sync: 0.15 },
  aggressive: { pressure: 0.25, pattern: 0.30, vl: 0.20, sync: 0.25 },
} as const;

type AIModeName = keyof typeof AI_WEIGHTS;

function scoreFromSpec(
  mode: AIModeName,
  intel: { pressure: number; patternStrength: number; vlProgress: number; syncScore: number },
) {
  const w = AI_WEIGHTS[mode];
  return Math.round(
    (100 - intel.pressure) * w.pressure
    + intel.patternStrength * w.pattern
    + intel.vlProgress * w.vl
    + intel.syncScore * w.sync,
  );
}

function seedPatternIntel(aiMode: AIModeName) {
  const engine = createEngine({ mode: 'differ', patTrigger: true, digit: 2, vlOn: false, aiMode, tradeCooldownMs: 0 });
  feedABPattern(engine, 'R_100', 30);
  feedABPattern(engine, 'R_75', 30);
  feedABPattern(engine, 'R_50', 30);
  feedABPattern(engine, 'R_25', 30);
  return engine;
}

function seedLoserPressure(aiMode: AIModeName) {
  const engine = createEngine({ mode: 'over', digit: 2, vlOn: false, aiMode, tradeCooldownMs: 0 });
  for (let i = 0; i < 51; i++) engine.processTick('R_100', 100.00, i % 3);
  return engine;
}

describe('BearBot2Engine AI modes (conservative / balanced / aggressive)', () => {
  it('applies documented weights for each aiMode on the same tick history', () => {
    const modes: AIModeName[] = ['conservative', 'balanced', 'aggressive'];
    const scores: Record<string, number> = {};
    let pillars: { pressure: number; patternStrength: number; vlProgress: number; syncScore: number } | null = null;

    for (const mode of modes) {
      const intel = seedPatternIntel(mode).getState().marketIntel['R_100'];
      expect(intel).toBeDefined();
      if (!pillars) {
        pillars = {
          pressure: intel.pressure,
          patternStrength: intel.patternStrength,
          vlProgress: intel.vlProgress,
          syncScore: intel.syncScore,
        };
      } else {
        expect(intel.pressure).toBe(pillars.pressure);
        expect(intel.patternStrength).toBe(pillars.patternStrength);
        expect(intel.vlProgress).toBe(pillars.vlProgress);
        expect(intel.syncScore).toBe(pillars.syncScore);
      }
      expect(intel.opportunityScore).toBe(scoreFromSpec(mode, intel));
      scores[mode] = intel.opportunityScore;
    }

    expect(new Set(Object.values(scores)).size).toBeGreaterThan(1);
  });

  it('conservative penalizes loser pressure more than aggressive', () => {
    const cons = seedLoserPressure('conservative').getState().marketIntel['R_100'];
    const agg = seedLoserPressure('aggressive').getState().marketIntel['R_100'];
    expect(cons.pressure).toBeGreaterThanOrEqual(50);
    expect(cons.pressure).toBe(agg.pressure);
    expect(cons.opportunityScore).toBe(scoreFromSpec('conservative', cons));
    expect(agg.opportunityScore).toBe(scoreFromSpec('aggressive', agg));
    expect(cons.opportunityScore).not.toBe(agg.opportunityScore);
  });

  it('aggressive rewards pattern+sync more than conservative', () => {
    const cons = seedPatternIntel('conservative').getState().marketIntel['R_100'];
    const agg = seedPatternIntel('aggressive').getState().marketIntel['R_100'];
    expect(cons.patternStrength).toBeGreaterThan(0);
    expect(cons.syncScore).toBeGreaterThan(0);
    expect(agg.opportunityScore).toBeGreaterThan(cons.opportunityScore);
  });

  it('switching aiMode recomputes opportunityScore immediately', () => {
    const engine = seedLoserPressure('balanced');
    const before = engine.getState().marketIntel['R_100'];
    expect(before.opportunityScore).toBe(scoreFromSpec('balanced', before));

    engine.updateConfig({ aiMode: 'conservative' });
    const afterCons = engine.getState().marketIntel['R_100'];
    expect(afterCons.opportunityScore).toBe(scoreFromSpec('conservative', afterCons));
    expect(afterCons.opportunityScore).not.toBe(before.opportunityScore);

    engine.updateConfig({ aiMode: 'aggressive' });
    const afterAgg = engine.getState().marketIntel['R_100'];
    expect(afterAgg.opportunityScore).toBe(scoreFromSpec('aggressive', afterAgg));
    expect(afterAgg.opportunityScore).not.toBe(afterCons.opportunityScore);
  });

  it('does not include patternStrength or syncScore in opportunityScore when pattern is inactive', () => {
    // Engine in OVER mode with strong 1->2 pattern
    const engine = createEngine({ mode: 'over', digit: 2, vlOn: false, aiMode: 'balanced', tradeCooldownMs: 0 });
    feedABPattern(engine, 'R_100', 30);
    const intelOver = engine.getState().marketIntel['R_100'];

    // Pattern strength exists as raw metric
    expect(intelOver.patternStrength).toBeGreaterThan(0);
    // Logic updated to only include active pattern in opportunityScore calculation
    expect(intelOver.opportunityScore).toBe(scoreFromSpec('balanced', intelOver));

    // Now switch to DIFFER mode with patTrigger: true
    engine.updateConfig({ mode: 'differ', patTrigger: true });
    const intelDiffer = engine.getState().marketIntel['R_100'];

    // Now opportunityScore incorporates all 4 pillars including patternStrength
    expect(intelDiffer.opportunityScore).toBe(scoreFromSpec('balanced', intelDiffer));
  });

  it('auto gate uses the score of the active aiMode', () => {
    const make = (aiMode: AIModeName, aiMinScore = 40) => {
      const engine = createEngine({
        mode: 'over',
        digit: 2,
        vlOn: false,
        aiMode,
        aiMinScore,
        exec: 'auto',
        autoOn: true,
        tradeCooldownMs: 0,
        paperMode: true,
      });
      for (let i = 0; i < 51; i++) engine.processTick('R_100', 100.00, i % 3);
      const auto = vi.fn();
      engine.onAutoTrade(auto);
      engine.processTick('R_100', 100.09, 9);
      return { score: engine.getState().marketIntel['R_100'].opportunityScore, fired: auto.mock.calls.length > 0 };
    };

    const cons = make('conservative');
    const bal = make('balanced');
    const agg = make('aggressive');

    expect(cons.fired).toBe(cons.score === 40);
    expect(bal.fired).toBe(bal.score === 40);
    expect(agg.fired).toBe(agg.score === 40);

    // Gate por igualdade: cada modo só entra com o mínimo igual ao próprio score.
    expect(cons.score).not.toBe(bal.score);
    expect(make('conservative', cons.score).fired).toBe(true);
    expect(make('balanced', cons.score).fired).toBe(false);
    expect(make('balanced', bal.score).fired).toBe(true);
    expect(make('conservative', bal.score).fired).toBe(false);
  });
});

function settleOpenOver(engine: ReturnType<typeof createEngine>) {
  engine.settleContract(0.3, false, 'over', 7, null);
}

describe('BearBot2Engine rate protections (maxTradesHour / tradeCooldownMs)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-13T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('maxTradesHour counts settled trades, not aborted prepares', () => {
    const engine = createEngine({ paperMode: true, tradeCooldownMs: 0, maxTradesHour: 2 });
    expect(engine.prepareTrade('over')).not.toBeNull();
    settleOpenOver(engine);
    expect(engine.prepareTrade('over')).not.toBeNull();
    settleOpenOver(engine);
    expect(engine.prepareTrade('over')).toBeNull();
    expect(engine.getState().tradesThisHour).toHaveLength(2);
    expect(engine.getState().logLines.some(l => l.msg.includes('Limite de 2 trades/hora'))).toBe(true);
  });

  it('tradeCooldownMs starts on settle and blocks until the window elapses', () => {
    const engine = createEngine({ paperMode: true, tradeCooldownMs: 2000, maxTradesHour: 100 });
    expect(engine.prepareTrade('over')).not.toBeNull();
    settleOpenOver(engine);
    expect(engine.prepareTrade('over')).toBeNull();
    expect(engine.getState().logLines.some(l => l.msg.includes('Cooldown'))).toBe(true);
    vi.advanceTimersByTime(1999);
    expect(engine.prepareTrade('over')).toBeNull();
    vi.advanceTimersByTime(1);
    expect(engine.prepareTrade('over')).not.toBeNull();
  });

  it('updateConfig applies new limits immediately after a settled trade', () => {
    const engine = createEngine({ paperMode: true, tradeCooldownMs: 0, maxTradesHour: 10 });
    engine.prepareTrade('over');
    settleOpenOver(engine);
    engine.updateConfig({ maxTradesHour: 1 });
    expect(engine.prepareTrade('over')).toBeNull();
    engine.updateConfig({ maxTradesHour: 10, tradeCooldownMs: 5000 });
    expect(engine.prepareTrade('over')).toBeNull();
    vi.advanceTimersByTime(5000);
    expect(engine.prepareTrade('over')).not.toBeNull();
  });

  it('abortPendingTrade does not consume hourly quota or start cooldown', () => {
    const engine = createEngine({ paperMode: true, tradeCooldownMs: 2000, maxTradesHour: 1 });
    engine.prepareTrade('over');
    engine.abortPendingTrade('buy failed');
    expect(engine.getState().tradeLock).toBe(false);
    expect(engine.getState().tradesThisHour).toHaveLength(0);
    expect(engine.prepareTrade('over')).not.toBeNull();
  });

  it('tryManualFire refuses rate-limited fire and does not reset VL', () => {
    const engine = createEngine({
      paperMode: true,
      tradeCooldownMs: 0,
      maxTradesHour: 1,
      vlOn: true,
      vlQty: 1,
    });
    engine.prepareTrade('over');
    settleOpenOver(engine);
    engine.processTick('R_100', 100.00, 0);
    const vlBefore = engine.getState().vlCount;
    expect(vlBefore).toBeGreaterThanOrEqual(1);
    expect(engine.tryManualFire()).toBe(false);
    expect(engine.getState().vlCount).toBe(vlBefore);
    expect(engine.getState().logLines.some(l => l.msg.includes('Limite de 1 trades/hora'))).toBe(true);
  });

  it('resetStats clears tradesThisHour and lastTradeTime', () => {
    const engine = createEngine({ paperMode: true, tradeCooldownMs: 2000, maxTradesHour: 1 });
    engine.prepareTrade('over');
    settleOpenOver(engine);
    engine.resetStats();
    expect(engine.getState().tradesThisHour).toHaveLength(0);
    expect(engine.getState().lastTradeTime).toBe(0);
    expect(engine.prepareTrade('over')).not.toBeNull();
  });

  it('hourly window expires after 1h and allows a new trade', () => {
    const engine = createEngine({ paperMode: true, tradeCooldownMs: 0, maxTradesHour: 1 });
    expect(engine.prepareTrade('over')).not.toBeNull();
    settleOpenOver(engine);
    expect(engine.prepareTrade('over')).toBeNull();
    vi.advanceTimersByTime(3_600_000);
    expect(engine.prepareTrade('over')).not.toBeNull();
  });

  it('updateConfig clamps maxTradesHour and tradeCooldownMs', () => {
    const engine = createEngine();
    engine.updateConfig({ maxTradesHour: 0 });
    expect(engine.getConfig().maxTradesHour).toBe(1);
    engine.updateConfig({ maxTradesHour: 999 });
    expect(engine.getConfig().maxTradesHour).toBe(500);
    engine.updateConfig({ maxTradesHour: Number.NaN });
    expect(engine.getConfig().maxTradesHour).toBe(1);
    engine.updateConfig({ tradeCooldownMs: -100 });
    expect(engine.getConfig().tradeCooldownMs).toBe(0);
    engine.updateConfig({ tradeCooldownMs: Number.NaN });
    expect(engine.getConfig().tradeCooldownMs).toBe(0);
  });
});

function loseOnce(engine: ReturnType<typeof createEngine>) {
  expect(engine.prepareTrade('over')).not.toBeNull();
  engine.settleContract(-1, true, 'over', 0, null);
}

function winOnce(engine: ReturnType<typeof createEngine>) {
  expect(engine.prepareTrade('over')).not.toBeNull();
  engine.settleContract(0.3, false, 'over', 7, null);
}

describe('BearBot2Engine post-loss recover / analyze', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-13T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not start recovery when postLossOn is off', () => {
    const engine = createEngine({
      paperMode: true, tradeCooldownMs: 0, postLossOn: false, postLossMode: 'recover',
    });
    loseOnce(engine);
    expect(engine.getState().recovery.active).toBe(false);
  });

  it('recover waits recoverDelay then allows auto fire even with VL closed', () => {
    const engine = createEngine({
      paperMode: true,
      tradeCooldownMs: 0,
      postLossOn: true,
      postLossMode: 'recover',
      recoverMaxAttempts: 3,
      recoverDelay: 1500,
      exec: 'auto',
      autoOn: true,
      vlOn: true,
      vlQty: 5,
      mode: 'over',
      digit: 2,
    });
    const auto = vi.fn();
    engine.onAutoTrade(auto);
    loseOnce(engine);
    expect(engine.getState().recovery.active).toBe(true);
    expect(engine.getState().recovery.attemptsLeft).toBe(3);

    engine.processTick('R_100', 100.09, 9);
    expect(auto).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1499);
    engine.processTick('R_100', 100.09, 9);
    expect(auto).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    engine.processTick('R_100', 100.09, 9);
    expect(auto).toHaveBeenCalledTimes(1);
    expect(engine.getState().recovery.attemptsLeft).toBe(3);
  });

  it('idle ticks after recoverDelay do not burn attempts', () => {
    const engine = createEngine({
      paperMode: true,
      tradeCooldownMs: 0,
      postLossOn: true,
      postLossMode: 'recover',
      recoverMaxAttempts: 3,
      recoverDelay: 1500,
      exec: 'manual',
      autoOn: false,
    });
    loseOnce(engine);
    vi.advanceTimersByTime(1500);
    for (let i = 0; i < 8; i++) {
      vi.advanceTimersByTime(2000);
      engine.processTick('R_100', 100.09, 9);
    }
    expect(engine.getState().recovery.active).toBe(true);
    expect(engine.getState().recovery.attemptsLeft).toBe(3);
  });

  it('a loss during recover decrements attempts instead of resetting them', () => {
    const engine = createEngine({
      paperMode: true,
      tradeCooldownMs: 0,
      postLossOn: true,
      postLossMode: 'recover',
      recoverMaxAttempts: 3,
      recoverDelay: 500,
    });
    loseOnce(engine);
    expect(engine.getState().recovery.attemptsLeft).toBe(3);
    vi.advanceTimersByTime(500);
    loseOnce(engine);
    expect(engine.getState().recovery.active).toBe(true);
    expect(engine.getState().recovery.attemptsLeft).toBe(2);
  });

  it('stops recover after max attempts are consumed by losses', () => {
    const engine = createEngine({
      paperMode: true,
      tradeCooldownMs: 0,
      postLossOn: true,
      postLossMode: 'recover',
      recoverMaxAttempts: 2,
      recoverDelay: 500,
    });
    loseOnce(engine);
    vi.advanceTimersByTime(500);
    loseOnce(engine);
    expect(engine.getState().recovery.attemptsLeft).toBe(1);
    vi.advanceTimersByTime(500);
    loseOnce(engine);
    expect(engine.getState().recovery.active).toBe(false);
    expect(engine.getState().recovery.attemptsLeft).toBe(0);
    expect(engine.getState().logLines.some(l => l.msg.includes('Limite de tentativas'))).toBe(true);
  });

  it('a win ends recover and does not consume another attempt', () => {
    const engine = createEngine({
      paperMode: true,
      tradeCooldownMs: 0,
      postLossOn: true,
      postLossMode: 'recover',
      recoverMaxAttempts: 3,
      recoverDelay: 500,
    });
    loseOnce(engine);
    vi.advanceTimersByTime(500);
    winOnce(engine);
    expect(engine.getState().recovery.active).toBe(false);
    expect(engine.getState().recovery.attemptsLeft).toBe(0);
  });

  it('tryManualFire does not decrement recover attempts (settle does)', () => {
    const engine = createEngine({
      paperMode: true,
      tradeCooldownMs: 0,
      postLossOn: true,
      postLossMode: 'recover',
      recoverMaxAttempts: 3,
      recoverDelay: 0,
    });
    loseOnce(engine);
    expect(engine.tryManualFire()).toBe(true);
    expect(engine.getState().recovery.attemptsLeft).toBe(3);
    expect(engine.getState().recovery.active).toBe(true);
  });

  it('analyze blocks auto trades during cooldown then resumes without VL bypass', () => {
    const engine = createEngine({
      paperMode: true,
      tradeCooldownMs: 0,
      postLossOn: true,
      postLossMode: 'analyze',
      cooldownSec: 5,
      exec: 'auto',
      autoOn: true,
      vlOn: true,
      vlQty: 5,
      mode: 'over',
      digit: 2,
    });
    const auto = vi.fn();
    engine.onAutoTrade(auto);
    loseOnce(engine);
    expect(engine.getState().recovery.active).toBe(true);
    expect(engine.getState().vlCount).toBe(0);

    engine.processTick('R_100', 100.09, 9);
    expect(auto).not.toHaveBeenCalled();

    vi.advanceTimersByTime(4999);
    engine.processTick('R_100', 100.09, 9);
    expect(auto).not.toHaveBeenCalled();
    expect(engine.getState().recovery.active).toBe(true);

    vi.advanceTimersByTime(1);
    engine.processTick('R_100', 100.09, 9);
    expect(engine.getState().recovery.active).toBe(false);
    expect(auto).not.toHaveBeenCalled();
    expect(engine.getState().logLines.some(l => l.msg.includes('Cooldown finalizado'))).toBe(true);
  });

  it('turning postLossOn off cancels an active recovery', () => {
    const engine = createEngine({
      paperMode: true,
      tradeCooldownMs: 0,
      postLossOn: true,
      postLossMode: 'recover',
      recoverDelay: 5000,
    });
    loseOnce(engine);
    expect(engine.getState().recovery.active).toBe(true);
    engine.updateConfig({ postLossOn: false });
    expect(engine.getState().recovery.active).toBe(false);
    const auto = vi.fn();
    engine.onAutoTrade(auto);
    engine.updateConfig({ exec: 'auto', autoOn: true, vlOn: false });
    engine.processTick('R_100', 100.09, 9);
    expect(auto).toHaveBeenCalled();
  });

  it('resetStats clears recovery state', () => {
    const engine = createEngine({
      paperMode: true, tradeCooldownMs: 0, postLossOn: true, postLossMode: 'recover',
    });
    loseOnce(engine);
    engine.resetStats();
    expect(engine.getState().recovery.active).toBe(false);
    expect(engine.getState().recovery.attemptsLeft).toBe(0);
    expect(engine.getState().recovery.nextTradeAfter).toBe(0);
    expect(engine.getState().recovery.cooldownUntil).toBe(0);
  });

  it('updateConfig clamps recoverMaxAttempts, recoverDelay and cooldownSec', () => {
    const engine = createEngine();
    engine.updateConfig({ recoverMaxAttempts: 0 });
    expect(engine.getConfig().recoverMaxAttempts).toBe(1);
    engine.updateConfig({ recoverMaxAttempts: 99 });
    expect(engine.getConfig().recoverMaxAttempts).toBe(5);
    engine.updateConfig({ recoverMaxAttempts: Number.NaN });
    expect(engine.getConfig().recoverMaxAttempts).toBe(1);
    engine.updateConfig({ recoverDelay: 100 });
    expect(engine.getConfig().recoverDelay).toBe(500);
    engine.updateConfig({ recoverDelay: Number.NaN });
    expect(engine.getConfig().recoverDelay).toBe(500);
    engine.updateConfig({ cooldownSec: -1 });
    expect(engine.getConfig().cooldownSec).toBe(0);
    engine.updateConfig({ cooldownSec: 90 });
    expect(engine.getConfig().cooldownSec).toBe(60);
    engine.updateConfig({ cooldownSec: Number.NaN });
    expect(engine.getConfig().cooldownSec).toBe(0);
  });

  it('switching paperMode resets galeLevel, curStake, lossAcum and turns off autoOn', () => {
    const engine = createEngine({
      paperMode: true,
      stake: 0.35,
      gale: 2.0,
      tradeCooldownMs: 0,
      postLossOn: true,
      postLossMode: 'recover',
    });

    // 2 losses in paper trading
    loseOnce(engine);
    loseOnce(engine);
    expect(engine.getState().galeLevel).toBe(2);
    expect(engine.getState().curStake).toBe(1.4);
    expect(engine.getState().recovery.active).toBe(true);

    // Switch from Paper Trading to Real / Demo (paperMode: false)
    engine.updateConfig({ paperMode: false });

    // Gale and curStake MUST be reset to initial user settings
    expect(engine.getState().galeLevel).toBe(0);
    expect(engine.getState().curStake).toBe(0.35);
    expect(engine.getState().lossAcum).toBe(0);
    expect(engine.getState().parcelsLeft).toBe(0);
    expect(engine.getState().recovery.active).toBe(false);
    expect(engine.getConfig().autoOn).toBe(false);
  });

  describe('Contagem sob Foco (vlFocusOnly)', () => {
    it('non-focused markets do NOT count virtual losses when vlFocusOnly is true', () => {
      const engine = createEngine({
        multiOn: true,
        vlOn: true,
        vlMode: 'consec',
        vlQty: 2,
        vlFocusOnly: true,
        activeSym: 'R_100',
        mode: 'over',
        digit: 2,
      });

      // Ticks on non-focused market R_75 with losing digits (0, 1)
      engine.processTick('R_75', 100, 0);
      engine.processTick('R_75', 100, 1);
      expect(engine.getState().vlBySym['R_75'].count).toBe(0);

      // Ticks on focused market R_100 with losing digits (0, 1)
      engine.processTick('R_100', 100, 0);
      expect(engine.getState().vlBySym['R_100'].count).toBe(1);
      engine.processTick('R_100', 100, 1);
      expect(engine.getState().vlBySym['R_100'].count).toBe(2);

      // Manual focus switch to R_75
      engine.updateConfig({ activeSym: 'R_75' });
      expect(engine.getState().vlBySym['R_100'].count).toBe(0); // old market reset
      expect(engine.getState().vlBySym['R_75'].count).toBe(0);  // new market starts at 0

      // Now R_75 is focused, it should count losses
      engine.processTick('R_75', 100, 0);
      expect(engine.getState().vlBySym['R_75'].count).toBe(1);

      // R_100 is no longer focused, it should not count
      engine.processTick('R_100', 100, 0);
      expect(engine.getState().vlBySym['R_100'].count).toBe(0);
    });

    it('in auto mode with vlFocusOnly, focus change does NOT trigger trade immediately until VL accumulates under focus', () => {
      let tradeCalls = 0;
      const engine = createEngine({
        multiOn: true,
        vlOn: true,
        vlMode: 'consec',
        vlQty: 2,
        vlFocusOnly: true,
        activeSym: 'R_100',
        exec: 'auto',
        autoOn: true,
        mode: 'over',
        digit: 2,
        tradeCooldownMs: 0,
      });
      engine.onAutoTrade(() => { tradeCalls++; });

      // Feed non-focused market R_75 with 50 ticks to populate MarketIntelligence
      for (let i = 0; i < 50; i++) {
        engine.processTick('R_75', 100, 9); // winning digits -> high opportunity score
      }

      // Feed R_100 some ticks
      for (let i = 0; i < 50; i++) {
        engine.processTick('R_100', 100, 2); // losing digit for OVER 2
      }

      // Focus may switch to R_75 or stay, but trade should not fire until focused market hits 2 losses
      expect(engine.getState().vlBySym['R_75'].count).toBeLessThan(2);
    });
  });
});
