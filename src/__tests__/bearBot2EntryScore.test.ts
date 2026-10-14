import { describe, it, expect } from 'vitest';
import { createEngine } from '../app/services/BearBot2Engine';
import { MARKETS } from '../app/services/bearbot2.types';

/**
 * Score mínimo no instante da entrada: o gate da IA lia o marketIntel em cache,
 * recalculado só a cada 3 ticks do mercado e antes do tick atual atualizar o
 * Loss Virtual e o dígito alvo. Com Multi-Mercado, Contagem sob Foco, VL de 1
 * consecutivo e score mínimo 60, o bot entrava com o score real abaixo de 60
 * porque o cache ainda mostrava um score antigo acima do mínimo.
 */

const MIN = 60;

function rng(seed: number) {
  return () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
}

function run(extra: Record<string, unknown>) {
  const next = rng(42);
  const engine: any = createEngine({
    activeSym: 'R_100', mode: 'differ', digit: 3, exec: 'auto', autoOn: false,
    paperMode: true, vlOn: true, vlQty: 1, vlMode: 'consec', multiOn: true, vlFocusOnly: true,
    tradeCooldownMs: 0, maxTradesHour: 100000, aiMinScore: MIN, stopLoss: 1e9, stopWin: 1e9, gale: 1,
    ...extra,
  });
  const tick = () => {
    const m = MARKETS[Math.floor(next() * MARKETS.length)];
    const d = Math.floor(next() * 10);
    engine.processTick(m.sym, 100 + d / 100, d);
  };
  for (let i = 0; i < 700; i++) tick();
  engine.updateConfig({ autoOn: true });

  // Score real do mercado no disparo: medido antes do reset do VL, que zera o
  // pilar de Loss Virtual e derrubaria o score de qualquer entrada.
  const live: Record<string, number> = {};
  const resetM = engine.vlResetM.bind(engine);
  engine.vlResetM = (s: string) => { live[s] = engine.computeMarketIntelligence(s).opportunityScore; resetM(s); };
  const reset = engine.vlReset.bind(engine);
  engine.vlReset = () => { const s = engine.config.activeSym; live[s] = engine.computeMarketIntelligence(s).opportunityScore; reset(); };

  const fired: number[] = [];
  let pending = false;
  engine.onAutoTrade((kind: string) => {
    fired.push(live[engine.config.activeSym]);
    if (engine.prepareTrade(kind)) pending = true;
  });
  for (let i = 0; i < 20000; i++) {
    tick();
    if (pending) {
      const r = engine.simulateTrade('differ');
      engine.settleContract(r.profit, r.isLoss, 'differ', r.exitDig, r.audit);
      pending = false;
    }
  }
  return { engine, fired };
}

// Com o gate por igualdade, o Padrão A→B nunca dispara exatamente em 60 nesta
// sequência aleatória: usa um mínimo que ele atinge para o teste ter entradas.
const SUBMODES: Record<string, Record<string, unknown>> = {
  'Dígito fixo': {},
  'Dígito automático': { differAutoDigit: true },
  'Padrão A→B': { patTrigger: true, aiMinScore: 48 },
  'Dígito dinâmico': { differDynamicDigit: true },
};

describe('Multi-Mercado + Contagem sob Foco + VL 1 consecutivo + score mínimo 60', () => {
  for (const [name, extra] of Object.entries(SUBMODES)) {
    const min = (extra.aiMinScore as number | undefined) ?? MIN;

    it(`${name}: toda entrada tem score real igual ao mínimo`, () => {
      const { fired } = run(extra);
      expect(fired.length).toBeGreaterThan(0);
      expect(fired.filter(s => s !== min)).toEqual([]);
    });

    it(`${name}: o resultado registra o score do momento da entrada`, () => {
      const { engine, fired } = run(extra);
      const trades = [...engine.getState().trades].reverse();
      expect(trades.length).toBe(fired.length);
      trades.forEach((t: any, i: number) => {
        expect(t.score).toBe(fired[i]);
        expect(t.score).toBe(min);
      });
    });
  }
});
