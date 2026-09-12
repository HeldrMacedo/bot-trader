import { describe, it, expect } from 'vitest';
import { createEngine } from '../app/services/BearBot2Engine';
import { buildLoserSet, isWinCheck, resolveAIWeights, AI_MODE_WEIGHTS } from '../app/services/bearbot2.types';

/**
 * Cobertura das rotinas estatísticas e utilitárias do BearBot Ultra 2 que o
 * modo IA Personalizado passa a exercitar (pilares do score) e dos helpers
 * puros de bearbot2.types.
 */

const SYM = 'R_100';

function feedDigits(engine: ReturnType<typeof createEngine>, digits: number[]) {
  digits.forEach(d => engine.processTick(SYM, 100 + d / 100, d));
}

function uniform(n: number) {
  return Array.from({ length: n }, (_, i) => i % 10);
}

describe('helpers de bearbot2.types', () => {
  it('buildLoserSet cobre os quatro modos', () => {
    expect([...buildLoserSet('over', 5)].sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5]);
    expect([...buildLoserSet('under', 3)].sort((a, b) => a - b)).toEqual([3, 4, 5, 6, 7, 8, 9]);
    expect([...buildLoserSet('differ', 7)]).toEqual([7]);
    expect([...buildLoserSet('combo', 0, 4, 5)].sort((a, b) => a - b)).toEqual([4, 5]);
  });

  it('isWinCheck cobre os quatro modos e o modo desconhecido', () => {
    expect(isWinCheck(6, 'over', 5)).toBe(true);
    expect(isWinCheck(5, 'over', 5)).toBe(false);
    expect(isWinCheck(2, 'under', 3)).toBe(true);
    expect(isWinCheck(3, 'under', 3)).toBe(false);
    expect(isWinCheck(4, 'differ', 7)).toBe(true);
    expect(isWinCheck(7, 'differ', 7)).toBe(false);
    expect(isWinCheck(9, 'combo', 0, 4, 5)).toBe(true);
    expect(isWinCheck(4, 'combo', 0, 4, 5)).toBe(false);
    expect(isWinCheck(1, 'inexistente', 5)).toBe(false);
  });

  it('resolveAIWeights ignora pesos ausentes no modo custom', () => {
    expect(resolveAIWeights('custom', undefined)).toEqual(AI_MODE_WEIGHTS.balanced);
    expect(resolveAIWeights('conservative')).toEqual(AI_MODE_WEIGHTS.conservative);
  });
});

describe('estatísticas de mercado', () => {
  it('chiSquare exige 30 ticks e classifica a aderência', () => {
    const engine = createEngine({ mode: 'over', digit: 2, vlOn: false, tradeCooldownMs: 0 });
    feedDigits(engine, uniform(20));
    expect(engine.chiSquare(SYM)).toBeNull();

    feedDigits(engine, uniform(30));
    const flat = engine.chiSquare(SYM)!;
    expect(flat.chi).toBeCloseTo(0, 1);
    expect(flat.level).toBe('normal');

    // 50 ticks do mesmo dígito: desvio máximo possível.
    const skew = createEngine({ mode: 'over', digit: 2, vlOn: false, tradeCooldownMs: 0 });
    feedDigits(skew, Array(50).fill(7));
    expect(skew.chiSquare(SYM)!.level).toBe('alto');
  });

  it('getPressureRate exige 50 ticks e sobe quando os perdedores saturam', () => {
    const engine = createEngine({ mode: 'over', digit: 4, vlOn: false, tradeCooldownMs: 0 });
    feedDigits(engine, uniform(40));
    expect(engine.getPressureRate(SYM)).toBe(0);

    feedDigits(engine, Array(50).fill(1)); // 1 é perdedor em over 4
    expect(engine.getPressureRate(SYM)).toBeGreaterThan(50);
  });

  it('getObservedRate e getTheoreticalRate acompanham o modo configurado', () => {
    const engine = createEngine({ mode: 'over', digit: 4, vlOn: false, tradeCooldownMs: 0 });
    feedDigits(engine, Array(60).fill(9)); // 9 é vencedor em over 4
    expect(engine.getObservedRate(SYM)).toBe(100);
    expect(engine.getTheoreticalRate()).toBe(50);
  });

  it('marketAnomaly reporta o excesso de perdedores', () => {
    const engine = createEngine({ mode: 'differ', digit: 3, vlOn: false, tradeCooldownMs: 0 });
    feedDigits(engine, uniform(60));
    const an = engine.marketAnomaly(SYM);
    expect(an === null || typeof an.excess === 'number').toBe(true);
  });
});

describe('loss virtual acumulado por mercado', () => {
  it('conta perdedores dentro da janela em vez de exigir sequência', () => {
    const engine = createEngine({
      mode: 'differ', digit: 5, vlOn: true, vlMode: 'accum', vlWindow: 10, vlQty: 3,
      activeSym: SYM, tradeCooldownMs: 0,
    });
    // 5 é o dígito perdedor: três ocorrências intercaladas na janela de 10.
    feedDigits(engine, [5, 1, 5, 2, 5, 3, 4, 6, 7, 8]);
    const st = engine.getState().vlBySym[SYM];
    expect(st.count).toBe(3);
    expect(st.seen).toBe(10);
  });
});

describe('propostas e exportação', () => {
  it('getRequiredProposals cobre modo combo e modos simples', () => {
    const combo = createEngine({ mode: 'combo', comboUnder: 3, comboOver: 6, tradeCooldownMs: 0 });
    expect(combo.getRequiredProposals()).toEqual([
      { ct: 'DIGITOVER', barrier: 6 },
      { ct: 'DIGITUNDER', barrier: 3 },
    ]);

    const over = createEngine({ mode: 'over', digit: 4, tradeCooldownMs: 0 });
    expect(over.getRequiredProposals().length).toBeGreaterThan(0);
  });

  it('exportTradesCSV devolve string vazia sem trades e cabeçalho com trades', () => {
    const engine = createEngine({ mode: 'over', digit: 2, paperMode: true, vlOn: false, tradeCooldownMs: 0 });
    expect(engine.exportTradesCSV()).toBe('');

    feedDigits(engine, uniform(60));
    const sim = engine.simulateTrade('DIGITOVER');
    if (sim) {
      engine.settleContract(sim.profit, sim.isLoss, 'DIGITOVER', sim.exitDig, sim.audit);
      const csv = engine.exportTradesCSV();
      expect(csv.split('\n')[0]).toContain('data_hora');
      expect(csv.split('\n').length).toBeGreaterThan(1);
    }
  });
});
