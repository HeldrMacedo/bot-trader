import { describe, it, expect } from 'vitest';
import { createEngine } from '../app/services/BearBot2Engine';

/**
 * O card do mercado mostrava um score bem abaixo do registrado na entrada
 * (ex.: card em 40, entrada em 79). O cache do card só era recalculado a cada
 * 3 ticks e antes do tick atual mover o Loss Virtual, enquanto o gate da IA
 * recalcula na hora da decisão. No tick da entrada o card precisa mostrar o
 * mesmo score que liberou a entrada.
 */

const SYM = 'R_25';

function run(extra: Record<string, unknown>) {
  const engine: any = createEngine({
    activeSym: SYM, mode: 'over', digit: 4, exec: 'auto', autoOn: true,
    paperMode: true, vlOn: true, vlQty: 2, multiOn: false,
    tradeCooldownMs: 0, maxTradesHour: 10000,
    aiMode: 'balanced', aiMinScore: 50,
    ...extra,
  });
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const fires: { gate: number | null; card: number | undefined }[] = [];
  let ready = false;
  engine.onAutoTrade(() => {
    if (ready) fires.push({ gate: engine.pendingEntryScore, card: engine.getState().marketIntel[SYM]?.opportunityScore });
    engine.state.tradeLock = false;
  });
  for (let i = 0; i < 400; i++) {
    ready = engine.getState().tickData[SYM].digits.length >= 50;
    const d = Math.floor(rnd() * 10);
    engine.processTick(SYM, 100 + d / 1000, d);
  }
  return fires;
}

describe('score do card x score da entrada', () => {
  it('card mostra o score que liberou a entrada', () => {
    const fires = run({});
    expect(fires.length).toBeGreaterThan(0);
    fires.forEach(f => {
      expect(f.gate).toBeGreaterThanOrEqual(50);
      expect(f.card).toBe(f.gate);
    });
  });

  it('vale também em Múltiplos Mercados', () => {
    const fires = run({ multiOn: true });
    expect(fires.length).toBeGreaterThan(0);
    fires.forEach(f => expect(f.card).toBe(f.gate));
  });
});
