import { describe, it, expect, vi } from 'vitest';
import { createEngine } from '../app/services/BearBot2Engine';

/**
 * Score mínimo x Loss Virtual: com score mínimo 85 e Loss Virtual ligado em 2
 * consecutivos, o bot entrava assim que o VL confirmava, mesmo com o Score de
 * Oportunidade abaixo do mínimo. O VL confirmado anulava o veto da IA. O score
 * deve ser respeitado primeiro: o VL só libera a entrada se o score já passou.
 */

const SYM = 'R_100';

/** O dígito alvo (3) sai em metade dos ticks: pressão 100 (score 0 com peso só
 * em pressão) e o Loss Virtual de 2 consecutivos confirma o tempo todo. */
function feedHighPressure(engine: any, from: number, to: number) {
  for (let i = from; i < to; i++) {
    const d = i % 2 === 0 ? 3 : (i % 9);
    engine.processTick(SYM, 100 + d / 100, d);
  }
}

function runAuto(extra: Record<string, unknown>) {
  const engine: any = createEngine({
    activeSym: SYM, mode: 'differ', digit: 3, exec: 'auto', autoOn: true,
    paperMode: true, vlOn: true, vlQty: 2, multiOn: false,
    tradeCooldownMs: 0, maxTradesHour: 10000,
    aiMode: 'custom', aiWeights: { pressure: 1, pattern: 0, vl: 0, sync: 0 },
    aiMinScore: 85,
    ...extra,
  });
  feedHighPressure(engine, 0, 50);
  const fired = vi.fn();
  engine.onAutoTrade(fired);
  feedHighPressure(engine, 50, 90);
  return { engine, score: engine.getState().marketIntel[SYM].opportunityScore, fires: fired.mock.calls.length };
}

describe('score mínimo com Loss Virtual ligado', () => {
  it('não entra no VL confirmado quando o score está abaixo do mínimo', () => {
    const r = runAuto({});
    expect(r.score).toBeLessThan(85);
    expect(r.fires).toBe(0);
  });

  it('entra no VL confirmado quando o score atinge o mínimo', () => {
    const r = runAuto({ aiMinScore: 0 });
    expect(r.fires).toBeGreaterThan(0);
  });

  it('não entra em Múltiplos Mercados com VL confirmado e score abaixo do mínimo', () => {
    const r = runAuto({ multiOn: true });
    expect(r.score).toBeLessThan(85);
    expect(r.fires).toBe(0);
  });

  it('não entra com Contagem sob Foco e score abaixo do mínimo', () => {
    const r = runAuto({ multiOn: true, vlFocusOnly: true });
    expect(r.score).toBeLessThan(85);
    expect(r.fires).toBe(0);
  });
});

describe('score mínimo do mercado em foco na Contagem sob Foco', () => {
  const OTHER = 'R_25';

  /** Sem o dígito alvo (3): pressão mínima e score alto no outro mercado. */
  function feedNoTarget(engine: any, from: number, to: number) {
    const safe = [0, 1, 2, 4, 5, 6, 7, 8, 9];
    for (let i = from; i < to; i++) {
      const d = safe[i % safe.length];
      engine.processTick(OTHER, 100 + d / 1000, d);
    }
  }

  it('não dispara no foco com VL confirmado só porque outro mercado está no mínimo', () => {
    const engine: any = createEngine({
      activeSym: SYM, mode: 'differ', digit: 3, exec: 'auto', autoOn: false,
      paperMode: true, vlOn: true, vlQty: 2, multiOn: true, vlFocusOnly: true,
      tradeCooldownMs: 0, maxTradesHour: 10000,
      aiMode: 'custom', aiWeights: { pressure: 1, pattern: 0, vl: 0, sync: 0 },
      aiMinScore: 85,
    });
    feedHighPressure(engine, 0, 60);
    feedNoTarget(engine, 0, 60);
    // Troca manual recente do foco: o motor não pode mudar o foco por 3s, então o
    // candidato do outro mercado fica pendente enquanto o foco acumula VL.
    // O mínimo passa a ser exatamente o score do outro mercado para ele virar candidato.
    const otherScore = engine.computeMarketIntelligence(OTHER).opportunityScore;
    engine.updateConfig({ activeSym: SYM, autoOn: true, aiMinScore: otherScore });
    const fired = vi.fn();
    engine.onAutoTrade(fired);
    feedNoTarget(engine, 60, 61);
    expect(engine.getState().marketIntel[OTHER].opportunityScore).toBe(otherScore);
    expect(engine.multiCand[OTHER]).toBeDefined();
    // Dois 3 seguidos no foco: Loss Virtual de 2 consecutivos confirmado.
    engine.processTick(SYM, 100.03, 3);
    engine.processTick(SYM, 100.03, 3);
    expect(engine.getState().marketIntel[SYM].opportunityScore).not.toBe(otherScore);
    expect(fired).not.toHaveBeenCalled();
  });
});
