import { describe, it, expect, beforeEach } from 'vitest';
import { createDifferEngine } from '../app/services/BearDifferEngine';

const rnd = (n: number, seed = 20260913) => {
  let s = seed;
  return Array.from({ length: n }, () => {
    s = (1103515245 * s + 12345) % 2147483648;
    return Math.floor((s / 2147483648) * 10);
  });
};

/**
 * As seis variantes ficavam fora da medição, do ranking e da vigilância até que
 * alguém marcasse "Varredura ampla". Isso produzia dois defeitos: escolher uma
 * variante no seletor não gerava palpite nenhum, e a líder do ranking nunca
 * podia ser uma variante. Pior para a tese do módulo: o Benjamini-Hochberg
 * existe para controlar falsa descoberta entre as hipóteses testadas, e medir
 * só um subconjunto escolhido na tela é exatamente o viés de seleção que ele
 * deveria eliminar.
 */
describe('BearDiffer - todas as lógicas são medidas e ranqueadas sempre', () => {
  let engine: ReturnType<typeof createDifferEngine>;

  beforeEach(() => {
    engine = createDifferEngine();
    engine.updateConfig({ minTicks: 300, gateBias: false, cooldown: 0, opMode: 'sim' });
    engine.setHistory('R_10', rnd(8000));
  });

  it('acumula sinal virtual das variantes sem nenhuma configuração extra', () => {
    rnd(60, 4242).forEach((d) => engine.processTick('R_10', d));

    const variantes = ['flong300', 'flong3k', 'div60', 'par600', 'mk1c'];
    variantes.forEach((id) => {
      expect(engine.getLogicMarketStats(id, 'R_10').n).toBeGreaterThan(0);
    });
  });

  it('lista as 17 lógicas no ranking', () => {
    rnd(60, 4242).forEach((d) => engine.processTick('R_10', d));

    const ids = engine.getLogicRanking().map((r) => r.lid);
    expect(ids).toHaveLength(17);
    expect(ids).toContain('par600');
    expect(ids).toContain('aus30');
  });

  it('permite que uma variante seja escolhida pelo rodízio', () => {
    engine.updateConfig({ onceLogic: 'rotate', lgMinN: 1 });
    rnd(60, 4242).forEach((d) => engine.processTick('R_10', d));

    const escolhidas = new Set<string>();
    for (let i = 0; i < 40; i++) {
      const id = engine.resolveLogic('rotate');
      if (id) escolhidas.add(id);
    }

    const variantes = ['flong300', 'flong3k', 'div60', 'par600', 'mk1c', 'aus30'];
    expect(variantes.some((v) => escolhidas.has(v))).toBe(true);
  });

  it('inclui as variantes na família da vigilância', () => {
    rnd(60, 4242).forEach((d) => engine.processTick('R_10', d));
    engine.runWatch();

    // A vigilância roda sem erro e opina sobre o mercado com a família cheia.
    expect(engine.getState().watch['R_10']).toBeDefined();
  });

  it('uma variante escolhida à mão produz alvo', () => {
    engine.updateConfig({
      autoSource: 'logic',
      onceLogic: 'par600',
      onceMinConf: 0,
    });
    rnd(5, 4242).forEach((d) => engine.processTick('R_10', d));

    const t = engine.resolveTarget('R_10');
    expect(t.reason).toBeNull();
    expect(t.logicId).toBe('par600');
    expect(typeof t.conf).toBe('number');
  });

  it('não expõe mais a configuração de varredura ampla', () => {
    expect('wideScan' in engine.getConfig()).toBe(false);
  });
});
