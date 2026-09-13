import { describe, it, expect, beforeEach } from 'vitest';
import { BearDifferEngine, createDifferEngine } from '../app/services/BearDifferEngine';
import { LogicPick } from '../app/services/beardiffer.types';

/**
 * Cobertura das 17 lógicas de análise. Cada uma aponta um dígito para ficar de
 * fora no Differ e só opina com amostra suficiente — recusar por falta de
 * amostra é comportamento pedido, não falha.
 */
describe('BearDifferEngine - Logic picks', () => {
  let engine: BearDifferEngine;

  beforeEach(() => {
    engine = createDifferEngine();
  });

  // Gerador determinístico e uniforme, para o teste não oscilar entre execuções
  const makeDigits = (n: number, seed = 20260906, exclude?: number): number[] => {
    let s = seed;
    const out: number[] = [];
    while (out.length < n) {
      s = (s * 1103515245 + 12345) % 2147483648;
      const d = Math.floor((s / 2147483648) * 10);
      if (exclude !== undefined && d === exclude) continue;
      out.push(d);
    }
    return out;
  };

  const pickOf = (id: string): LogicPick | null => {
    const L = engine.getLogics().find((x) => x.id === id);
    if (!L) throw new Error(`lógica ${id} não existe`);
    return L.pick('R_10', (s) => engine.getDigits(s));
  };

  const expectValidPick = (p: LogicPick | null) => {
    expect(p).not.toBeNull();
    expect(p!.digit).toBeGreaterThanOrEqual(0);
    expect(p!.digit).toBeLessThanOrEqual(9);
    expect(Number.isInteger(p!.digit)).toBe(true);
    expect(p!.conf).toBeGreaterThanOrEqual(0);
    expect(p!.conf).toBeLessThanOrEqual(100);
    expect(typeof p!.why).toBe('string');
    expect(p!.why.length).toBeGreaterThan(0);
  };

  // Amostra necessária para cada lógica opinar
  const cases: Array<{ id: string; ticks: number }> = [
    { id: 'sat', ticks: 400 },
    { id: 'mk1', ticks: 1000 },
    { id: 'mk2', ticks: 6000 },
    { id: 'rep', ticks: 400 },
    { id: 'flong', ticks: 1000 },
    { id: 'div', ticks: 1000 },
    { id: 'lag', ticks: 1200 },
    { id: 'par', ticks: 400 },
    { id: 'flong300', ticks: 500 },
    { id: 'flong3k', ticks: 3000 },
    { id: 'div60', ticks: 600 },
    { id: 'par600', ticks: 800 },
    { id: 'mk1c', ticks: 700 },
  ];

  cases.forEach(({ id, ticks }) => {
    it(`${id} points at a digit once it has ${ticks} ticks`, () => {
      engine.setHistory('R_10', makeDigits(ticks));
      expectValidPick(pickOf(id));
    });
  });

  const refusing = [
    'mk1',
    'mk2',
    'rep',
    'flong',
    'div',
    'lag',
    'aus',
    'par',
    'flong300',
    'flong3k',
    'div60',
    'par600',
    'mk1c',
    'aus30',
    'exaust',
  ];

  refusing.forEach((id) => {
    it(`${id} refuses to opine on a 40-tick sample`, () => {
      engine.setHistory('R_10', makeDigits(40));
      expect(pickOf(id)).toBeNull();
    });
  });

  it('aus bets against the digit that has been missing the longest', () => {
    // 400 ticks, then 20 ticks with no 9 at all: gap(9) clears the 12 floor
    const digits = [...makeDigits(400), ...makeDigits(20, 777, 9)];
    engine.setHistory('R_10', digits);

    const p = pickOf('aus');
    expectValidPick(p);
    expect(p!.digit).toBe(9);
    expect(p!.why).toMatch(/ausente há \d+ ticks/);
  });

  it('aus30 only opines on an extreme absence', () => {
    engine.setHistory('R_10', makeDigits(1000));
    // A random walk rarely leaves a 30-tick hole, so the variant stays quiet
    expect(pickOf('aus30')).toBeNull();

    const digits = [...makeDigits(1000), ...makeDigits(35, 555, 9)];
    engine.setHistory('R_10', digits);

    const p = pickOf('aus30');
    expectValidPick(p);
    expect(p!.digit).toBe(9);
  });

  it('exaust picks the digit that overshot all three windows', () => {
    // Digit 7 every fourth tick: well above the expected 10% in 10, 25 and 50
    const digits: number[] = [];
    for (let i = 0; i < 100; i++) digits.push(i % 4 === 0 ? 7 : (i % 5) + 1);
    engine.setHistory('R_10', digits);

    const p = pickOf('exaust');
    expectValidPick(p);
    expect(p!.digit).toBe(7);
    expect(p!.why).toMatch(/excesso de \d+%/);
  });

  it('cons stays quiet until the other logics have measured samples', () => {
    engine.setHistory('R_10', makeDigits(1200));
    // No virtual signals yet, so no logic carries weight in the vote
    expect(pickOf('cons')).toBeNull();
  });

  it('cons aggregates the vote once the other logics have samples', () => {
    engine.setHistory('R_10', makeDigits(1200));
    const live = makeDigits(120, 99);
    live.forEach((d) => engine.processTick('R_10', d));

    const p = pickOf('cons');
    expectValidPick(p);
    expect(p!.why).toMatch(/voto ponderado/);
  });

  it('feeds every logic through a tick and records per-market stats', () => {
    engine.setHistory('R_10', makeDigits(3000));
    makeDigits(60, 4242).forEach((d) => engine.processTick('R_10', d));

    const withSample = engine
      .getLogics()
      .filter((L) => engine.getLogicMarketStats(L.id, 'R_10').n > 0);

    // All 17 are always in the family; most must have produced signals
    expect(withSample.length).toBeGreaterThanOrEqual(12);
    withSample.forEach((L) => {
      const st = engine.getLogicMarketStats(L.id, 'R_10');
      expect(st.w).toBeLessThanOrEqual(st.n);
    });
  });
});
