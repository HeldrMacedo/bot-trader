import { describe, it, expect, vi } from 'vitest';
import { createEngine } from '../app/services/BearBot2Engine';
import { MARKETS } from '../app/services/bearbot2.types';

/**
 * Regressão do bug crítico: no modo Automático + Múltiplos Mercados + Differ com
 * Dígito Dinâmico + Loss Virtual + "Contagem sob Foco", a ordem real era disparada
 * com uma barreira (dígito de previsão) diferente do dígito que efetivamente sofreu
 * a perda virtual sob foco.
 *
 * Regras de negócio validadas aqui:
 *  1. Perda virtual no Differ só ocorre quando o último dígito do tick é exatamente
 *     igual ao dígito dinâmico previsto ANTES daquele tick.
 *  2. A contagem só vale para o mercado em foco e recomeça do zero a cada troca de foco.
 *  3. A compra real só dispara com >= vlQty perdas virtuais consecutivas sob foco,
 *     todas contra o MESMO dígito previsto.
 *  4. A barreira comprada é obrigatoriamente o dígito que perdeu, congelado no momento
 *     do gatilho (não pode ser recalculada até a liquidação).
 */

const baseConfig = {
  activeSym: 'R_100',
  mode: 'differ' as const,
  exec: 'auto' as const,
  multiOn: true,
  differDynamicDigit: true,
  vlOn: true,
  vlMode: 'consec' as const,
  vlFocusOnly: true,
  tradeCooldownMs: 0,
  maxTradesHour: 10000,
};

/** Alimenta histórico sem 9 (dígito 9 fica estatisticamente mais seguro). */
function seed(engine: any, sym: string, ticks = 45) {
  for (let i = 0; i < ticks; i++) {
    const d = i % 9; // 0..8
    engine.processTick(sym, 100 + d / 100, d);
  }
}

/** Envia um tick cujo dígito é igual ao dígito dinâmico previsto → perda virtual. */
function sendVirtualLoss(engine: any, sym: string): number {
  const predicted = engine.computeDynamicDifferDigit(sym).digit;
  engine.processTick(sym, 100 + predicted / 100, predicted);
  return predicted;
}

/** Envia um tick cujo dígito é diferente do previsto → sem perda virtual. */
function sendVirtualWin(engine: any, sym: string): number {
  const predicted = engine.computeDynamicDifferDigit(sym).digit;
  const d = (predicted + 1) % 10;
  engine.processTick(sym, 100 + d / 100, d);
  return d;
}

function mulberry32(a: number) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('BearBot2Engine · Gate de Loss Virtual sob Foco (Differ + Dígito Dinâmico)', () => {
  it('não dispara ordem real enquanto não houver perda virtual sob foco (vlQty=1)', () => {
    const engine = createEngine({ ...baseConfig, vlQty: 1 });
    seed(engine, 'R_100');

    let fires = 0;
    engine.onAutoTrade(() => { fires++; });
    engine.startBot();

    for (let i = 0; i < 10; i++) sendVirtualWin(engine, 'R_100');

    expect(engine.getState().vlBySym['R_100'].count).toBe(0);
    expect(fires).toBe(0);
  });

  it('dispara com 1 perda virtual sob foco e compra exatamente o dígito que perdeu', () => {
    const engine = createEngine({ ...baseConfig, vlQty: 1 });
    seed(engine, 'R_100');

    const fired: Array<{ digit: number; barrier: number; sym: string }> = [];
    engine.onAutoTrade(() => {
      const cfg = engine.getConfig();
      fired.push({
        digit: cfg.digit,
        barrier: engine.getRequiredProposals()[0].barrier,
        sym: cfg.activeSym,
      });
    });
    engine.startBot();

    sendVirtualWin(engine, 'R_100');
    expect(fired).toHaveLength(0);

    const lossDigit = sendVirtualLoss(engine, 'R_100');

    expect(fired).toHaveLength(1);
    expect(fired[0].sym).toBe('R_100');
    expect(fired[0].digit).toBe(lossDigit);
    expect(fired[0].barrier).toBe(lossDigit);
  });

  it('mantém a barreira congelada no dígito perdedor mesmo se novos ticks chegarem antes da compra', () => {
    const engine = createEngine({ ...baseConfig, vlQty: 1 });
    seed(engine, 'R_100');

    let triggered = false;
    engine.onAutoTrade(() => { triggered = true; });
    engine.startBot();

    const lossDigit = sendVirtualLoss(engine, 'R_100');
    expect(triggered).toBe(true);

    // O hook executa prepareTrade em setTimeout(0): novos ticks podem chegar antes.
    for (let i = 0; i < 6; i++) engine.processTick('R_100', 100 + lossDigit / 100, lossDigit);
    // Com o dígito perdedor repetido, o radar deixa de recomendá-lo...
    expect(engine.computeDynamicDifferDigit('R_100').digit).not.toBe(lossDigit);
    // ...mas a barreira do gatilho continua congelada nele.
    expect(engine.getRequiredProposals()[0].barrier).toBe(lossDigit);
    const prep = engine.prepareTrade('differ');
    const params: any = (prep as any)?.payload?.parameters;
    expect(params.barrier).toBe(String(lossDigit));
    expect(params.underlying_symbol).toBe('R_100');
  });

  it('exige perdas consecutivas contra o MESMO dígito previsto (vlQty=2)', () => {
    const engine = createEngine({ ...baseConfig, vlQty: 2 });
    seed(engine, 'R_100');

    let fires = 0;
    engine.onAutoTrade(() => { fires++; });
    engine.startBot();

    const first = sendVirtualLoss(engine, 'R_100');
    expect(engine.getState().vlBySym['R_100'].count).toBe(1);
    expect(fires).toBe(0);

    const nextPredicted = engine.computeDynamicDifferDigit('R_100').digit;
    if (nextPredicted === first) {
      // fixture inconclusiva para este cenário; ainda assim não deve furar o gate
      expect(fires).toBe(0);
      return;
    }

    // Perda virtual contra OUTRO dígito previsto: a sequência recomeça (1/2), sem compra.
    const second = sendVirtualLoss(engine, 'R_100');
    expect(second).not.toBe(first);
    expect(fires).toBe(0);
    expect(engine.getState().vlBySym['R_100'].count).toBe(1);
  });

  it('zera a contagem na troca de foco e ignora o histórico anterior do novo mercado', () => {
    const engine = createEngine({ ...baseConfig, vlQty: 1 });
    seed(engine, 'R_100');
    seed(engine, 'R_75');

    let fires = 0;
    let firedSym: string | null = null;
    engine.onAutoTrade(() => { firedSym = engine.getConfig().activeSym; fires++; });
    engine.updateConfig({ activeSym: 'R_100' });
    engine.startBot();
    expect(engine.getConfig().activeSym).toBe('R_100');

    // Perda virtual em R_75 ANTES de R_75 receber o foco: não conta.
    sendVirtualLoss(engine, 'R_75');
    expect(fires).toBe(0);
    expect(engine.getState().vlBySym['R_75'].count).toBe(0);

    // Foco passa para R_75: contagem começa do zero.
    engine.updateConfig({ activeSym: 'R_75' });
    expect(engine.getState().vlBySym['R_75'].count).toBe(0);

    // Tick de outro mercado (fora do foco) nunca pode disparar a compra.
    sendVirtualLoss(engine, 'R_100');
    expect(fires).toBe(0);

    // Primeiro tick sob foco sem perda virtual: continua sem compra.
    sendVirtualWin(engine, 'R_75');
    expect(fires).toBe(0);

    const lossDigit = sendVirtualLoss(engine, 'R_75');
    expect(fires).toBe(1);
    expect(firedSym).toBe('R_75');
    expect(engine.getRequiredProposals()[0].barrier).toBe(lossDigit);
  });

  it('mercado único (multiOn=false) também compra apenas o dígito que perdeu', () => {
    const engine = createEngine({ ...baseConfig, multiOn: false, vlFocusOnly: false, vlQty: 1 });
    seed(engine, 'R_100');

    const fired: number[] = [];
    engine.onAutoTrade(() => { fired.push(engine.getRequiredProposals()[0].barrier); });
    engine.startBot();

    sendVirtualWin(engine, 'R_100');
    expect(fired).toHaveLength(0);

    const lossDigit = sendVirtualLoss(engine, 'R_100');
    expect(fired).toEqual([lossDigit]);
  });

  it('varredura aleatória multi-mercado: todo disparo tem perda virtual sob foco no dígito comprado', () => {
    vi.useRealTimers();
    const rnd = mulberry32(7);
    const engine = createEngine({ ...baseConfig, vlQty: 1 });

    const mirror: Record<string, number[]> = {};
    MARKETS.forEach(m => { mirror[m.sym] = []; });

    for (let i = 0; i < 60; i++) {
      MARKETS.forEach(m => {
        const d = Math.floor(rnd() * 10);
        mirror[m.sym].push(d);
        engine.processTick(m.sym, 100 + d / 100, d);
      });
    }

    let pending: { sym: string; barrier: number } | null = null;
    engine.onAutoTrade(() => {
      pending = { sym: engine.getConfig().activeSym, barrier: engine.getRequiredProposals()[0].barrier };
    });
    engine.startBot();

    const violations: any[] = [];
    let fires = 0;
    let lossesUnderFocus = 0;
    let lastLossDigit: number | null = null;

    for (let i = 0; i < 600; i++) {
      const sym = MARKETS[Math.floor(rnd() * MARKETS.length)].sym;
      const d = Math.floor(rnd() * 10);
      const predicted = engine.computeDynamicDifferDigit(sym, [...mirror[sym]]).digit;
      mirror[sym].push(d);

      const activeBefore = engine.getConfig().activeSym;
      if (sym === activeBefore) {
        if (d === predicted && (lastLossDigit === null || lastLossDigit === predicted)) {
          lossesUnderFocus++; lastLossDigit = predicted;
        } else if (d === predicted) {
          lossesUnderFocus = 1; lastLossDigit = predicted;
        } else {
          lossesUnderFocus = 0; lastLossDigit = null;
        }
      }

      pending = null;
      engine.processTick(sym, 100 + d / 100, d);

      if (pending) {
        fires++;
        const p: any = pending;
        if (lossesUnderFocus < 1 || p.barrier !== lastLossDigit) {
          violations.push({ i, ...p, lossesUnderFocus, lastLossDigit, tickSym: sym, tickDigit: d });
        }
        engine.settleContract(-0.35, true, 'differ', d, {});
        lossesUnderFocus = 0; lastLossDigit = null;
      }

      if (engine.getConfig().activeSym !== activeBefore) {
        lossesUnderFocus = 0; lastLossDigit = null;
      }
    }

    expect(fires).toBeGreaterThan(0);
    expect(violations).toEqual([]);
  });
});
