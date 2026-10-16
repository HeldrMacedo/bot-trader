import { describe, expect, it, vi } from 'vitest';
import { createEngine } from '../app/services/BearBot2Engine';
import { aiScoreMatches, topOpportunityCandidate } from '../app/services/bearbot2.score';
import type { MarketIntelligence } from '../app/services/bearbot2.types';

function intel(sym: string, score: number): MarketIntelligence {
  return {
    sym, opportunityScore: score, pressure: 100 - score, patternStrength: 0,
    vlProgress: 100, syncScore: 0, recommendation: 'neutral', dataReady: true,
    lastUpdate: Date.now(),
  };
}

describe('comparação do Score de Oportunidade', () => {
  it('mantém a igualdade como padrão e aceita apenas o valor exato', () => {
    expect(aiScoreMatches(59, 60)).toBe(false);
    expect(aiScoreMatches(60, 60)).toBe(true);
    expect(aiScoreMatches(61, 60)).toBe(false);
  });

  it('aceita o piso e qualquer score acima quando marcado', () => {
    expect(aiScoreMatches(59, 60, true)).toBe(false);
    expect(aiScoreMatches(60, 60, true)).toBe(true);
    expect(aiScoreMatches(61, 60, true)).toBe(true);
  });

  it('conserva o valor zero como veto desligado nos dois modos', () => {
    expect(aiScoreMatches(75, 0)).toBe(true);
    expect(aiScoreMatches(75, 0, true)).toBe(true);
  });

  it('retorna o maior score sem alterar os candidatos e resolve empate pela ordem original', () => {
    const candidates = [{ sym: 'R_100', score: 50 }, { sym: 'R_75', score: 80 }, { sym: 'R_50', score: 80 }];
    expect(topOpportunityCandidate(candidates)?.sym).toBe('R_75');
    expect(candidates.map(c => c.sym)).toEqual(['R_100', 'R_75', 'R_50']);
    expect(topOpportunityCandidate([])).toBeUndefined();
  });
});

describe('foco em Múltiplos Mercados', () => {
  function readyEngine(atLeast: boolean) {
    const engine = createEngine({
      multiOn: true, exec: 'manual', activeSym: 'R_100', aiMinScore: 60,
      aiScoreAtLeast: atLeast, vlOn: false,
    }) as any;
    engine.state.marketIntel = {
      R_100: intel('R_100', 59), R_75: intel('R_75', 80), R_50: intel('R_50', 60),
    };
    vi.spyOn(engine, 'computeMarketIntelligence').mockImplementation((sym: string) => engine.state.marketIntel[sym]);
    // Os bônus antigos não podem alterar a ordem exibida em Top Oportunidades.
    engine.multiCand = {
      R_100: { sym: 'R_100', b: 2, score: 900 },
      R_75: { sym: 'R_75', b: 2, score: 1 },
      R_50: { sym: 'R_50', b: 2, score: 500 },
    };
    return engine;
  }

  it('com piso ativo escolhe o maior score elegível e descarta candidatos abaixo dele', () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(5000);
      const engine = readyEngine(true);
      engine.trySwitchMultiCandidate();
      expect(engine.getConfig().activeSym).toBe('R_75');
      expect(engine.getState().marketIntel.R_75.opportunityScore).toBe(80);
    } finally {
      vi.useRealTimers();
    }
  });

  it('com igualdade exige o score exato antes de mudar o foco', () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(5000);
      const engine = readyEngine(false);
      engine.trySwitchMultiCandidate();
      expect(engine.getConfig().activeSym).toBe('R_50');
    } finally {
      vi.useRealTimers();
    }
  });

  it('em execução automática dispara no maior score elegível', () => {
    const engine = readyEngine(true);
    engine.updateConfig({ exec: 'auto', autoOn: true });
    const fired = vi.fn();
    engine.onAutoTrade(fired);
    engine.tryFireMultiCandidate();
    expect(engine.getConfig().activeSym).toBe('R_75');
    expect(fired).toHaveBeenCalledOnce();
  });

  it('com Contagem sob Foco migra para o topo antes de disparar no foco antigo', () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(5000);
      const engine = readyEngine(true);
      engine.state.marketIntel.R_100 = intel('R_100', 70);
      engine.updateConfig({ exec: 'auto', autoOn: true, vlOn: true, vlFocusOnly: true, vlQty: 2 });
      engine.vlMState.R_100.count = 2;
      const fired = vi.fn();
      engine.onAutoTrade(fired);
      engine.tryFireMultiCandidate();
      expect(engine.getConfig().activeSym).toBe('R_75');
      expect(fired).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('impede execução automática quando todos os candidatos ficam abaixo do piso', () => {
    const engine = readyEngine(true);
    engine.updateConfig({ exec: 'auto', autoOn: true, aiMinScore: 90 });
    const fired = vi.fn();
    engine.onAutoTrade(fired);
    engine.tryFireMultiCandidate();
    expect(fired).not.toHaveBeenCalled();
    expect(Object.keys(engine.multiCand)).toHaveLength(0);
  });

  it('não escolhe mercado ainda sem score medido abaixo de um piso positivo', () => {
    const engine = readyEngine(true);
    for (const item of Object.values(engine.state.marketIntel) as MarketIntelligence[]) {
      item.opportunityScore = 0;
      item.dataReady = false;
    }
    engine.trySwitchMultiCandidate();
    expect(engine.getConfig().activeSym).toBe('R_100');
    expect(Object.keys(engine.multiCand)).toHaveLength(0);
  });
});
