import { describe, it, expect, vi } from 'vitest';
import { createEngine } from '../app/services/BearBot2Engine';
import { DEFAULT_CONFIG } from '../app/services/bearbot2.types';

/**
 * Score mínimo do gate da IA: o corte do Score de Oportunidade que libera a
 * entrada automática era fixo em 40. Agora vem de `config.aiMinScore`, editável
 * pelo usuário, com 40 como padrão para não mudar o comportamento existente.
 */

const SYM = 'R_100';

/** Mesmo cenário do teste de pesos: pressão em 100, pilar VL fixo em 100. */
function feedHighPressure(engine: any, from: number, to: number) {
  for (let i = from; i < to; i++) {
    const d = i % 2 === 0 ? 3 : (i % 9);
    engine.processTick(SYM, 100 + d / 100, d);
  }
}

function runAuto(aiWeights: { pressure: number; pattern: number; vl: number; sync: number }, aiMinScore?: number, aiScoreAtLeast = false) {
  const engine: any = createEngine({
    activeSym: SYM, mode: 'differ', digit: 3, exec: 'auto', autoOn: true,
    paperMode: true, vlOn: false, multiOn: false,
    tradeCooldownMs: 0, maxTradesHour: 10000,
    aiMode: 'custom', aiWeights,
    aiScoreAtLeast,
    ...(aiMinScore !== undefined ? { aiMinScore } : {}),
  });
  feedHighPressure(engine, 0, 50);
  const fired = vi.fn();
  engine.onAutoTrade(fired);
  feedHighPressure(engine, 50, 70);
  return { score: engine.getState().marketIntel[SYM].opportunityScore, fires: fired.mock.calls.length };
}

describe('score mínimo editável do gate da IA', () => {
  it('usa 40 como padrão', () => {
    expect(DEFAULT_CONFIG.aiMinScore).toBe(40);
    expect(DEFAULT_CONFIG.aiScoreAtLeast).toBe(false);
    expect(createEngine().getConfig().aiMinScore).toBe(40);
    expect(createEngine().getConfig().aiScoreAtLeast).toBe(false);
  });

  it('libera entrada acima do piso marcado e bloqueia o mesmo score por igualdade', () => {
    const weights = { pressure: 0.5, pattern: 0, vl: 0.5, sync: 0 };
    const exact = runAuto(weights, 40);
    const floor = runAuto(weights, 40, true);
    expect(exact.score).toBeGreaterThan(40);
    expect(exact.fires).toBe(0);
    expect(floor.fires).toBeGreaterThan(0);
  });

  it('veta a entrada quando o score fica abaixo do mínimo configurado', () => {
    // Pressão e VL meio a meio: score ~50, acima de 40 mas abaixo de 60.
    const r = runAuto({ pressure: 0.5, pattern: 0, vl: 0.5, sync: 0 }, 60);
    expect(r.score).toBeGreaterThanOrEqual(40);
    expect(r.score).toBeLessThan(60);
    expect(r.fires).toBe(0);
  });

  it('libera a entrada quando o mínimo é reduzido abaixo do score', () => {
    // Só pressão: score 0, vetado com o padrão 40, liberado com mínimo 0.
    const r = runAuto({ pressure: 1, pattern: 0, vl: 0, sync: 0 }, 0);
    expect(r.score).toBe(0);
    expect(r.fires).toBeGreaterThan(0);
  });

  it('aplica o novo mínimo via updateConfig', () => {
    const engine: any = createEngine({
      activeSym: SYM, mode: 'differ', digit: 3, exec: 'auto', autoOn: true,
      paperMode: true, vlOn: false, multiOn: false,
      tradeCooldownMs: 0, maxTradesHour: 10000,
      aiMode: 'custom', aiWeights: { pressure: 1, pattern: 0, vl: 0, sync: 0 },
    });
    feedHighPressure(engine, 0, 50);
    const fired = vi.fn();
    engine.onAutoTrade(fired);
    feedHighPressure(engine, 50, 60);
    expect(fired).not.toHaveBeenCalled();
    engine.updateConfig({ aiMinScore: 0 });
    feedHighPressure(engine, 60, 70);
    expect(fired).toHaveBeenCalled();
  });

  it('limita o mínimo entre 0 e 100 e descarta valores inválidos', () => {
    const engine = createEngine();
    engine.updateConfig({ aiMinScore: 150 });
    expect(engine.getConfig().aiMinScore).toBe(100);
    engine.updateConfig({ aiMinScore: -5 });
    expect(engine.getConfig().aiMinScore).toBe(0);
    engine.updateConfig({ aiMinScore: Number.NaN });
    expect(engine.getConfig().aiMinScore).toBe(40);
    expect(createEngine({ aiMinScore: 250 }).getConfig().aiMinScore).toBe(100);
  });
});

describe('score mínimo no modo Múltiplos Mercados', () => {
  function multiEngine(aiMinScore: number) {
    return createEngine({
      activeSym: SYM, mode: 'differ', digit: 3, exec: 'auto', autoOn: false,
      paperMode: true, vlOn: false, multiOn: true,
      tradeCooldownMs: 0, maxTradesHour: 10000,
      aiMode: 'custom', aiWeights: { pressure: 1, pattern: 0, vl: 0, sync: 0 },
      aiMinScore,
    }) as any;
  }

  it('não dispara candidato registrado antes de o mínimo subir acima do score', () => {
    const engine = multiEngine(0);
    feedHighPressure(engine, 0, 60);
    expect(engine.multiCand[SYM]).toBeDefined();
    engine.updateConfig({ aiMinScore: 100, autoOn: true });
    const fired = vi.fn();
    engine.onAutoTrade(fired);
    feedHighPressure(engine, 60, 61);
    expect(fired).not.toHaveBeenCalled();
  });

  it('dispara o candidato quando o score atinge o mínimo', () => {
    const engine = multiEngine(0);
    feedHighPressure(engine, 0, 60);
    engine.updateConfig({ autoOn: true });
    const fired = vi.fn();
    engine.onAutoTrade(fired);
    feedHighPressure(engine, 60, 61);
    expect(fired).toHaveBeenCalled();
  });

  it('ranqueia o candidato pelo score real, sem tratar score 0 como 50', () => {
    const engine = multiEngine(0);
    feedHighPressure(engine, 0, 60);
    expect(engine.getState().marketIntel[SYM].opportunityScore).toBe(0);
    expect(engine.multiCand[SYM].score).toBeLessThan(50);
  });

  it('no manual, troca o foco quando outro mercado atinge o score e o candidato antigo deixa de corresponder', () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(0);
      const engine = createEngine({
        activeSym: SYM, mode: 'differ', digit: 3, exec: 'manual',
        multiOn: true, vlOn: false, aiMinScore: 100,
        aiMode: 'custom', aiWeights: { pressure: 1, pattern: 0, vl: 0, sync: 0 },
      }) as any;
      const safeDigits = [0, 1, 2, 4, 5, 6, 7, 8, 9];
      for (let i = 0; i < 60; i++) {
        const d = safeDigits[i % safeDigits.length];
        engine.processTick(SYM, 100 + d / 100, d);
      }
      expect(engine.getState().marketIntel[SYM].opportunityScore).toBe(100);
      expect(engine.multiCand[SYM]).toBeDefined();

      feedHighPressure(engine, 0, 120);
      expect(engine.getState().marketIntel[SYM].opportunityScore).toBe(0);
      for (let i = 0; i < 60; i++) {
        const d = safeDigits[i % safeDigits.length];
        engine.processTick('R_75', 75 + d / 100, d);
      }
      expect(engine.getState().marketIntel['R_75'].opportunityScore).toBe(100);
      vi.setSystemTime(5000);
      engine.processTick('R_75', 75.04, 4);
      expect(engine.getConfig().activeSym).toBe('R_75');
    } finally {
      vi.useRealTimers();
    }
  });
});
