import { describe, it, expect } from 'vitest';
import { createEngine } from '../app/services/BearBot2Engine';
import { AI_MODE_WEIGHTS } from '../app/services/bearbot2.types';

/**
 * Modo IA "Personalizado": os quatro pesos do Score de Oportunidade passam a ser
 * configuráveis. Os presets (conservador/equilibrado/agressivo) continuam sendo
 * a fonte dos pesos quando aiMode !== 'custom'.
 */

const SYM = 'R_100';

/** Alimenta histórico suficiente para o intel sair de dataReady=false. */
function feed(engine: ReturnType<typeof createEngine>) {
  for (let i = 0; i < 30; i++) {
    engine.processTick(SYM, 100.01, 1);
    engine.processTick(SYM, 100.02, 2);
  }
}

function intelOf(engine: ReturnType<typeof createEngine>) {
  return engine.getState().marketIntel[SYM];
}

describe('AI_MODE_WEIGHTS', () => {
  it('expõe os três presets com pesos somando 1', () => {
    (['conservative', 'balanced', 'aggressive'] as const).forEach(mode => {
      const w = AI_MODE_WEIGHTS[mode];
      const sum = w.pressure + w.pattern + w.vl + w.sync;
      expect(sum).toBeCloseTo(1, 6);
    });
  });

  it('mantém os pesos históricos de cada preset', () => {
    expect(AI_MODE_WEIGHTS.conservative).toEqual({ pressure: 0.45, pattern: 0.20, vl: 0.25, sync: 0.10 });
    expect(AI_MODE_WEIGHTS.balanced).toEqual({ pressure: 0.35, pattern: 0.25, vl: 0.25, sync: 0.15 });
    expect(AI_MODE_WEIGHTS.aggressive).toEqual({ pressure: 0.25, pattern: 0.30, vl: 0.20, sync: 0.25 });
  });
});

describe('modo IA personalizado', () => {
  it('usa os pesos do preset enquanto aiMode não for custom', () => {
    const engine = createEngine({
      mode: 'over', digit: 2, vlOn: false, tradeCooldownMs: 0,
      aiMode: 'balanced',
      // Pesos absurdos que só podem valer se aiMode === 'custom'.
      aiWeights: { pressure: 1, pattern: 0, vl: 0, sync: 0 },
    });
    feed(engine);
    const custom = intelOf(engine);

    const ref = createEngine({ mode: 'over', digit: 2, vlOn: false, tradeCooldownMs: 0, aiMode: 'balanced' });
    feed(ref);

    expect(custom.opportunityScore).toBe(intelOf(ref).opportunityScore);
  });

  it('pondera apenas o pilar escolhido quando aiMode é custom', () => {
    const engine = createEngine({
      mode: 'over', digit: 2, vlOn: false, tradeCooldownMs: 0,
      aiMode: 'custom',
      aiWeights: { pressure: 1, pattern: 0, vl: 0, sync: 0 },
    });
    feed(engine);
    const intel = intelOf(engine);

    expect(intel.dataReady).toBe(true);
    expect(intel.opportunityScore).toBe(Math.round(100 - intel.pressure));
  });

  it('normaliza os pesos: a proporção importa, a escala não', () => {
    const mk = (w: { pressure: number; pattern: number; vl: number; sync: number }) => {
      const e = createEngine({ mode: 'over', digit: 2, vlOn: false, tradeCooldownMs: 0, aiMode: 'custom', aiWeights: w });
      feed(e);
      return intelOf(e).opportunityScore;
    };

    expect(mk({ pressure: 50, pattern: 50, vl: 50, sync: 50 }))
      .toBe(mk({ pressure: 25, pattern: 25, vl: 25, sync: 25 }));
  });

  it('mantém o score dentro de 0..100 com pesos grandes', () => {
    const engine = createEngine({
      mode: 'over', digit: 2, vlOn: false, tradeCooldownMs: 0,
      aiMode: 'custom',
      aiWeights: { pressure: 100, pattern: 100, vl: 100, sync: 100 },
    });
    feed(engine);
    const score = intelOf(engine).opportunityScore;
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it('cai para o preset equilibrado quando a soma dos pesos é zero', () => {
    const engine = createEngine({
      mode: 'over', digit: 2, vlOn: false, tradeCooldownMs: 0,
      aiMode: 'custom',
      aiWeights: { pressure: 0, pattern: 0, vl: 0, sync: 0 },
    });
    feed(engine);

    const ref = createEngine({ mode: 'over', digit: 2, vlOn: false, tradeCooldownMs: 0, aiMode: 'balanced' });
    feed(ref);

    expect(intelOf(engine).opportunityScore).toBe(intelOf(ref).opportunityScore);
  });

  it('ignora pesos negativos tratando-os como zero', () => {
    const engine = createEngine({
      mode: 'over', digit: 2, vlOn: false, tradeCooldownMs: 0,
      aiMode: 'custom',
      aiWeights: { pressure: 1, pattern: -5, vl: -5, sync: -5 },
    });
    feed(engine);
    const intel = intelOf(engine);
    expect(intel.opportunityScore).toBe(Math.round(100 - intel.pressure));
  });

  it('recalcula a inteligência assim que aiWeights muda, sem esperar novo tick', () => {
    const engine = createEngine({ mode: 'over', digit: 2, vlOn: false, tradeCooldownMs: 0, aiMode: 'custom' });
    feed(engine);
    const before = intelOf(engine).opportunityScore;

    engine.updateConfig({ aiWeights: { pressure: 1, pattern: 0, vl: 0, sync: 0 } });
    const after = intelOf(engine);

    expect(after.opportunityScore).toBe(Math.round(100 - after.pressure));
    expect(after.opportunityScore).not.toBe(before);
  });

  it('nasce com os pesos do preset equilibrado por padrão', () => {
    const engine = createEngine({});
    expect(engine.getConfig().aiWeights).toEqual(AI_MODE_WEIGHTS.balanced);
  });
});
