import { describe, it, expect, vi } from 'vitest';
import { createEngine } from '../app/services/BearBot2Engine';

/**
 * Gate da IA: o Score de Oportunidade (ponderado pelos pesos dos pilares) deve
 * vetar a entrada automática quando estiver abaixo de 40. O veto valia apenas
 * quando o Loss Virtual estava ligado e ainda contando — com o Loss Virtual
 * desligado, `vlGateOpenM` devolve `true` e anulava o gate, de modo que os pesos
 * não tinham efeito nenhum sobre a decisão de operar.
 */

const SYM = 'R_100';

/** Dispara ticks em que o dígito alvo do Differ aparece em metade das amostras:
 * a pressão vai a 100 e o pilar "Pressão" leva o score a 0. */
function feedHighPressure(engine: any, from: number, to: number) {
  for (let i = from; i < to; i++) {
    const d = i % 2 === 0 ? 3 : (i % 9);
    engine.processTick(SYM, 100 + d / 100, d);
  }
}

function runAuto(aiWeights: { pressure: number; pattern: number; vl: number; sync: number }) {
  const engine: any = createEngine({
    activeSym: SYM, mode: 'differ', digit: 3, exec: 'auto', autoOn: true,
    paperMode: true, vlOn: false, multiOn: false,
    tradeCooldownMs: 0, maxTradesHour: 10000,
    aiMode: 'custom', aiWeights,
  });
  // Os 50 primeiros ticks são só histórico: sem dataReady o gate não tem score
  // para medir e deixa passar por definição. A contagem começa depois disso.
  feedHighPressure(engine, 0, 50);
  const fired = vi.fn();
  engine.onAutoTrade(fired);
  feedHighPressure(engine, 50, 70);
  return { score: engine.getState().marketIntel[SYM].opportunityScore, fires: fired.mock.calls.length };
}

describe('gate da IA com Loss Virtual desligado', () => {
  it('veta a entrada automática quando o score ponderado fica abaixo de 40', () => {
    const r = runAuto({ pressure: 1, pattern: 0, vl: 0, sync: 0 });
    expect(r.score).toBeLessThan(40);
    expect(r.fires).toBe(0);
  });

  it('libera a entrada quando os pesos levam o score para cima do limite', () => {
    const r = runAuto({ pressure: 0, pattern: 0, vl: 1, sync: 0 });
    expect(r.score).toBeGreaterThanOrEqual(40);
    expect(r.fires).toBeGreaterThan(0);
  });
});
