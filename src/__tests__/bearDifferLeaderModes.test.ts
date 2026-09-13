import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createDifferEngine } from '../app/services/BearDifferEngine';
import { LogicRankingRow } from '../app/services/beardiffer.types';

const rnd = (n: number, seed = 20260913) => {
  let s = seed;
  return Array.from({ length: n }, () => {
    s = (1103515245 * s + 12345) % 2147483648;
    return Math.floor((s / 2147483648) * 10);
  });
};

const linha = (
  lid: string,
  acc: number | null,
  n: number,
  pass: boolean
): LogicRankingRow => ({
  lid,
  name: lid,
  tag: 'teste',
  n,
  acc,
  p: pass ? 0.001 : 0.5,
  ready: n >= 150,
  pass,
});

/**
 * O modo 'auto' exige aprovação no Benjamini-Hochberg, e é assim que deve
 * continuar: é o único modo que respeita o teste estatístico. O que faltava era
 * um modo para quem quer operar o topo da tabela medida sabendo que ali não há
 * prova de vantagem — e um rótulo que não prometesse uma coisa entregando
 * outra.
 */
describe('BearDiffer - líder aprovada versus líder por acerto medido', () => {
  let engine: ReturnType<typeof createDifferEngine>;

  beforeEach(() => {
    engine = createDifferEngine();
    engine.updateConfig({ minTicks: 300, gateBias: false, cooldown: 0, opMode: 'sim' });
  });

  describe("modo 'auto' — só a líder aprovada", () => {
    it('recusa quando nenhuma lógica passou no teste, mesmo com acerto alto', () => {
      // Exatamente o ranking real relatado: todas acima ou perto do empate
      // técnico, nenhuma com significância.
      vi.spyOn(engine, 'getLogicRanking').mockReturnValue([
        linha('exaust', 0.9252, 254, false),
        linha('flong300', 0.924, 329, false),
        linha('rep', 0.9088, 329, false),
      ]);

      expect(engine.resolveLogic('auto')).toBeNull();
    });

    it('devolve a líder quando existe aprovação', () => {
      vi.spyOn(engine, 'getLogicRanking').mockReturnValue([
        linha('flong300', 0.94, 329, true),
        linha('exaust', 0.9252, 254, false),
      ]);

      expect(engine.resolveLogic('auto')).toBe('flong300');
    });
  });

  describe("modo 'top' — a líder por acerto medido", () => {
    it('devolve o topo da tabela mesmo sem aprovação estatística', () => {
      vi.spyOn(engine, 'getLogicRanking').mockReturnValue([
        linha('exaust', 0.9252, 254, false),
        linha('flong300', 0.924, 329, false),
        linha('rep', 0.9088, 329, false),
      ]);

      expect(engine.resolveLogic('top')).toBe('exaust');
    });

    it('exige amostra mínima', () => {
      engine.updateConfig({ lgMinN: 150 });
      vi.spyOn(engine, 'getLogicRanking').mockReturnValue([
        linha('aus30', 0.99, 94, false),
        linha('rep', 0.92, 329, false),
      ]);

      expect(engine.resolveLogic('top')).toBe('rep');
    });

    it('recusa quem está abaixo do empate técnico', () => {
      // Payout 1.10 exige 90.91% só para empatar: operar abaixo disso é
      // escolher perder mais devagar.
      vi.spyOn(engine, 'getLogicRanking').mockReturnValue([
        linha('rep', 0.8988, 329, false),
        linha('div', 0.8754, 329, false),
      ]);

      expect(engine.resolveLogic('top')).toBeNull();
    });

    it('ignora lógica ainda sem medição', () => {
      vi.spyOn(engine, 'getLogicRanking').mockReturnValue([
        linha('mk2', null, 0, false),
        linha('exaust', 0.93, 254, false),
      ]);

      expect(engine.resolveLogic('top')).toBe('exaust');
    });
  });

  describe('explicações que o operador lê', () => {
    it("em 'auto' explica que falta aprovação e aponta a saída", () => {
      engine.updateConfig({ autoSource: 'logic', onceLogic: 'auto' });
      engine.setHistory('R_10', rnd(3000));
      engine.processTick('R_10', 4);

      const t = engine.resolveTarget('R_10');
      expect(t.reason).toMatch(/aprovada|significância/i);
      expect(t.reason).toMatch(/acerto medido|à mão|manual/i);
    });

    it("em 'top' explica o empate técnico quando ninguém o supera", () => {
      engine.updateConfig({ autoSource: 'logic', onceLogic: 'top' });
      engine.setHistory('R_10', rnd(3000));
      engine.processTick('R_10', 4);

      const t = engine.resolveTarget('R_10');
      expect(t.reason).toMatch(/empate técnico|90\.9/i);
    });
  });
});
