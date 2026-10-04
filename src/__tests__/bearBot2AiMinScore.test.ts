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

function runAuto(aiWeights: { pressure: number; pattern: number; vl: number; sync: number }, aiMinScore?: number) {
  const engine: any = createEngine({
    activeSym: SYM, mode: 'differ', digit: 3, exec: 'auto', autoOn: true,
    paperMode: true, vlOn: false, multiOn: false,
    tradeCooldownMs: 0, maxTradesHour: 10000,
    aiMode: 'custom', aiWeights,
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
    expect(createEngine().getConfig().aiMinScore).toBe(40);
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
