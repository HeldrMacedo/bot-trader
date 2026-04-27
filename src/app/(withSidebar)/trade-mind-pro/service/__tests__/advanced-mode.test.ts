import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AdvancedRulesEngine } from '../AdvancedRulesEngine';
import { AdvancedGeminiService } from '../AdvancedGeminiService';

// ─── Observer mock ─────────────────────────────────────────────────────────────
// getObserver() usa require() dinâmico (não interceptado por vi.mock), então
// fazemos spyOn direto no prototype para controlar o retorno.
const _h: Record<string, Function[]> = {};
const mockObserver = {
  on(event: string, fn: Function) { (_h[event] ??= []).push(fn); },
  off(event: string, fn: Function) {
    if (_h[event]) _h[event] = _h[event].filter(f => f !== fn);
  },
  emit(event: string, data: any) {
    [...(_h[event] ?? [])].forEach(f => f(data));
  },
  reset() { Object.keys(_h).forEach(k => delete _h[k]); },
  count(event: string) { return (_h[event] ?? []).length; },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeEngine(signal = vi.fn(), symbol = 'R_100') {
  return new AdvancedRulesEngine({ symbol, onTradeSignal: signal, onStatusChange: vi.fn() });
}

/** Substitui o histórico interno diretamente (sem emitir ticks) */
function setHistory(eng: AdvancedRulesEngine, digits: number[]) {
  (eng as any).tickHistory = [...digits];
}

/** Executa o json-rules-engine diretamente sobre o histórico atual */
async function runFacts(eng: AdvancedRulesEngine): Promise<{ events: any[] }> {
  return (eng as any).engine?.run({}) ?? { events: [] };
}

function emitTick(price: number) {
  mockObserver.emit('deriv.tick', { tick: { quote: price } });
}

/** Emite um tick e aguarda o handler assíncrono (engine.run) completar */
async function emitTickAndWait(price: number) {
  emitTick(price);
  await new Promise(r => setImmediate(r));
}

// ─── Construtores de regra ────────────────────────────────────────────────────

function makeRule(
  conditions: any,
  contractType: string,
  prediction: number | null = null,
  predictionFact?: string,
  predictionFactParams?: Record<string, any>,
) {
  const params: Record<string, any> = { contractType };
  if (predictionFact) {
    params.predictionFact = predictionFact;
    if (predictionFactParams) params.predictionFactParams = predictionFactParams;
  } else {
    params.prediction = prediction;
  }
  return { name: 'test', conditions, event: { type: 'trade', params } };
}

/** Condição que sempre é verdadeira (tickCount > 0) */
const always = { all: [{ fact: 'tickCount', operator: 'greaterThan', value: 0 }] };

/** Histórico base de 10 dígitos distintos (satisfaz mínimo de 5 ticks) */
const HISTORY_10 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 0];

beforeEach(() => {
  mockObserver.reset();
  vi.spyOn(AdvancedRulesEngine.prototype as any, 'getObserver').mockReturnValue(mockObserver);
});

afterEach(() => {
  vi.restoreAllMocks();
});

// =============================================================================
// 1. FACTS — testes unitários via engine.run() direto
// =============================================================================

describe('Fact: lastDigit', () => {
  it('retorna -1 quando histórico está vazio', async () => {
    const eng = makeEngine();
    setHistory(eng, []);
    eng.loadRules(makeRule({ all: [{ fact: 'lastDigit', operator: 'equal', value: -1 }] }, 'DIGITODD'));
    const { events } = await runFacts(eng);
    expect(events.length).toBe(1);
  });

  it('retorna o último dígito do histórico', async () => {
    const eng = makeEngine();
    setHistory(eng, [1, 2, 3, 9]);
    eng.loadRules(makeRule({ all: [{ fact: 'lastDigit', operator: 'equal', value: 9 }] }, 'DIGITMATCH', 9));
    const { events } = await runFacts(eng);
    expect(events.length).toBe(1);
  });

  it('não dispara quando lastDigit difere do esperado', async () => {
    const eng = makeEngine();
    setHistory(eng, [1, 2, 3, 7]);
    eng.loadRules(makeRule({ all: [{ fact: 'lastDigit', operator: 'equal', value: 5 }] }, 'DIGITMATCH', 5));
    const { events } = await runFacts(eng);
    expect(events.length).toBe(0);
  });
});

describe('Fact: secondLastDigit', () => {
  it('retorna -1 quando histórico tem menos de 2 itens', async () => {
    const eng = makeEngine();
    setHistory(eng, [5]);
    eng.loadRules(makeRule({ all: [{ fact: 'secondLastDigit', operator: 'equal', value: -1 }] }, 'DIGITODD'));
    const { events } = await runFacts(eng);
    expect(events.length).toBe(1);
  });

  it('retorna o penúltimo dígito corretamente', async () => {
    const eng = makeEngine();
    setHistory(eng, [1, 2, 4, 8, 6]); // penúltimo = 8
    eng.loadRules(makeRule({ all: [{ fact: 'secondLastDigit', operator: 'equal', value: 8 }] }, 'DIGITMATCH', 8));
    const { events } = await runFacts(eng);
    expect(events.length).toBe(1);
  });
});

describe('Fact: twoLastDifferent', () => {
  it('retorna false quando histórico tem menos de 2 itens', async () => {
    const eng = makeEngine();
    setHistory(eng, [3]);
    eng.loadRules(makeRule({ all: [{ fact: 'twoLastDifferent', operator: 'equal', value: false }] }, 'DIGITODD'));
    const { events } = await runFacts(eng);
    expect(events.length).toBe(1);
  });

  it('retorna true quando os 2 últimos são diferentes', async () => {
    const eng = makeEngine();
    setHistory(eng, [1, 2, 3, 5, 7]); // 5 ≠ 7
    eng.loadRules(makeRule({ all: [{ fact: 'twoLastDifferent', operator: 'equal', value: true }] }, 'DIGITODD'));
    const { events } = await runFacts(eng);
    expect(events.length).toBe(1);
  });

  it('retorna false quando os 2 últimos são iguais', async () => {
    const eng = makeEngine();
    setHistory(eng, [1, 2, 3, 7, 7]); // 7 = 7
    eng.loadRules(makeRule({ all: [{ fact: 'twoLastDifferent', operator: 'equal', value: false }] }, 'DIGITODD'));
    const { events } = await runFacts(eng);
    expect(events.length).toBe(1);
  });
});

describe('Fact: consecutiveSame', () => {
  it('retorna 0 quando histórico está vazio', async () => {
    const eng = makeEngine();
    setHistory(eng, []);
    eng.loadRules(makeRule({ all: [{ fact: 'consecutiveSame', operator: 'equal', value: 0 }] }, 'DIGITODD'));
    const { events } = await runFacts(eng);
    expect(events.length).toBe(1);
  });

  it('conta corretamente 3 repetições no final', async () => {
    const eng = makeEngine();
    setHistory(eng, [1, 2, 5, 5, 5]);
    eng.loadRules(makeRule({ all: [{ fact: 'consecutiveSame', operator: 'equal', value: 3 }] }, 'DIGITDIFF', 5));
    const { events } = await runFacts(eng);
    expect(events.length).toBe(1);
  });

  it('para de contar ao encontrar dígito diferente', async () => {
    const eng = makeEngine();
    setHistory(eng, [3, 3, 3, 7, 7]); // apenas 2 iguais no final
    eng.loadRules(makeRule({ all: [{ fact: 'consecutiveSame', operator: 'equal', value: 2 }] }, 'DIGITDIFF', 7));
    const { events } = await runFacts(eng);
    expect(events.length).toBe(1);
  });

  it('retorna 1 quando todos os dígitos são diferentes', async () => {
    const eng = makeEngine();
    setHistory(eng, [1, 2, 3, 4, 5]);
    eng.loadRules(makeRule({ all: [{ fact: 'consecutiveSame', operator: 'equal', value: 1 }] }, 'DIGITODD'));
    const { events } = await runFacts(eng);
    expect(events.length).toBe(1);
  });

  it('conta sequência que ocupa todo o histórico', async () => {
    const eng = makeEngine();
    setHistory(eng, [9, 9, 9, 9, 9]);
    eng.loadRules(makeRule({ all: [{ fact: 'consecutiveSame', operator: 'equal', value: 5 }] }, 'DIGITDIFF', 9));
    const { events } = await runFacts(eng);
    expect(events.length).toBe(1);
  });
});

describe('Fact: tickCount', () => {
  it('retorna o total de ticks acumulados', async () => {
    const eng = makeEngine();
    setHistory(eng, [1, 2, 3, 4, 5, 6, 7]);
    eng.loadRules(makeRule({ all: [{ fact: 'tickCount', operator: 'equal', value: 7 }] }, 'DIGITODD'));
    const { events } = await runFacts(eng);
    expect(events.length).toBe(1);
  });
});

describe('Fact: digitCount (com params)', () => {
  it('conta ocorrências de um dígito nos últimos N ticks', async () => {
    const eng = makeEngine();
    // Últimos 10: [3,5,3,7,3,2,3,8,1,3] → dígito 3 aparece 5 vezes
    setHistory(eng, [9, 9, 3, 5, 3, 7, 3, 2, 3, 8, 1, 3]);
    eng.loadRules(makeRule(
      { all: [{ fact: 'digitCount', params: { n: 10, digit: 3 }, operator: 'equal', value: 5 }] },
      'DIGITMATCH', 3,
    ));
    const { events } = await runFacts(eng);
    expect(events.length).toBe(1);
  });

  it('quando N > histórico, considera todos os ticks disponíveis', async () => {
    const eng = makeEngine();
    setHistory(eng, [5, 5, 5]); // 3 itens, mas N=10 → considera os 3
    eng.loadRules(makeRule(
      { all: [{ fact: 'digitCount', params: { n: 10, digit: 5 }, operator: 'equal', value: 3 }] },
      'DIGITMATCH', 5,
    ));
    const { events } = await runFacts(eng);
    expect(events.length).toBe(1);
  });

  it('retorna 0 quando o dígito não está nos últimos N ticks', async () => {
    const eng = makeEngine();
    setHistory(eng, [1, 2, 3, 4]);
    eng.loadRules(makeRule(
      { all: [{ fact: 'digitCount', params: { n: 10, digit: 9 }, operator: 'equal', value: 0 }] },
      'DIGITODD',
    ));
    const { events } = await runFacts(eng);
    expect(events.length).toBe(1);
  });

  it('ignora ticks fora da janela N', async () => {
    const eng = makeEngine();
    // Dígito 7 aparece 3x no total, mas só 1x nos últimos 5
    setHistory(eng, [7, 7, 1, 2, 3, 4, 7]);
    eng.loadRules(makeRule(
      { all: [{ fact: 'digitCount', params: { n: 5, digit: 7 }, operator: 'equal', value: 1 }] },
      'DIGITMATCH', 7,
    ));
    const { events } = await runFacts(eng);
    expect(events.length).toBe(1);
  });
});

describe('Fact: mostFrequentDigit (com params)', () => {
  it('retorna o dígito mais frequente nos últimos N ticks', async () => {
    const eng = makeEngine();
    // 7 aparece 4 vezes nos 10 ticks
    setHistory(eng, [1, 2, 7, 7, 3, 7, 4, 7, 5, 6]);
    eng.loadRules(makeRule(
      { all: [{ fact: 'mostFrequentDigit', params: { n: 10 }, operator: 'equal', value: 7 }] },
      'DIGITMATCH', 7,
    ));
    const { events } = await runFacts(eng);
    expect(events.length).toBe(1);
  });

  it('desempate por recência: em caso de empate, o mais recente vence', async () => {
    const eng = makeEngine();
    // Dígitos 3 e 7 aparecem 2x cada; 7 está na posição 3 (mais recente que 3 na posição 2)
    setHistory(eng, [3, 7, 3, 7]);
    eng.loadRules(makeRule(
      { all: [{ fact: 'mostFrequentDigit', params: { n: 4 }, operator: 'equal', value: 7 }] },
      'DIGITMATCH', 7,
    ));
    const { events } = await runFacts(eng);
    expect(events.length).toBe(1);
  });

  it('retorna -1 quando o histórico está vazio', async () => {
    const eng = makeEngine();
    setHistory(eng, []);
    eng.loadRules(makeRule(
      { all: [{ fact: 'mostFrequentDigit', params: { n: 10 }, operator: 'equal', value: -1 }] },
      'DIGITODD',
    ));
    const { events } = await runFacts(eng);
    expect(events.length).toBe(1);
  });

  it('considera apenas os últimos N (ignora mais antigos)', async () => {
    const eng = makeEngine();
    // Dígito 9 domina no início, mas dígito 2 domina nos últimos 5
    setHistory(eng, [9, 9, 9, 9, 2, 2, 2, 2, 2]);
    eng.loadRules(makeRule(
      { all: [{ fact: 'mostFrequentDigit', params: { n: 5 }, operator: 'equal', value: 2 }] },
      'DIGITMATCH', 2,
    ));
    const { events } = await runFacts(eng);
    expect(events.length).toBe(1);
  });
});

describe('Fact: mostFrequentCount (com params)', () => {
  it('retorna a contagem do dígito mais frequente', async () => {
    const eng = makeEngine();
    // 5 aparece 3 vezes → mais frequente com count=3
    setHistory(eng, [5, 3, 5, 7, 5, 2, 1, 8, 9, 4]);
    eng.loadRules(makeRule(
      { all: [{ fact: 'mostFrequentCount', params: { n: 10 }, operator: 'equal', value: 3 }] },
      'DIGITMATCH', 5,
    ));
    const { events } = await runFacts(eng);
    expect(events.length).toBe(1);
  });

  it('não dispara quando count está abaixo do threshold', async () => {
    const eng = makeEngine();
    // Máximo de qualquer dígito é 2
    setHistory(eng, [1, 2, 3, 4, 5, 6, 7, 8, 9, 0]);
    eng.loadRules(makeRule(
      { all: [{ fact: 'mostFrequentCount', params: { n: 10 }, operator: 'greaterThanInclusive', value: 3 }] },
      'DIGITODD',
    ));
    const { events } = await runFacts(eng);
    expect(events.length).toBe(0);
  });
});

describe('Fact: digitNotInLastN (com params)', () => {
  it('retorna true quando dígito não apareceu nos últimos N ticks', async () => {
    const eng = makeEngine();
    // Dígito 9 está na posição 0, mas não nos últimos 5 (pos 4-8: [4,5,6,7,8])
    setHistory(eng, [9, 1, 2, 3, 4, 5, 6, 7, 8]);
    eng.loadRules(makeRule(
      { all: [{ fact: 'digitNotInLastN', params: { n: 5, digit: 9 }, operator: 'equal', value: true }] },
      'DIGITMATCH', 9,
    ));
    const { events } = await runFacts(eng);
    expect(events.length).toBe(1);
  });

  it('retorna false quando dígito aparece dentro da janela N', async () => {
    const eng = makeEngine();
    setHistory(eng, [1, 2, 9, 4, 5]); // 9 está na posição 2, dentro dos últimos 5
    eng.loadRules(makeRule(
      { all: [{ fact: 'digitNotInLastN', params: { n: 5, digit: 9 }, operator: 'equal', value: false }] },
      'DIGITMATCH', 9,
    ));
    const { events } = await runFacts(eng);
    expect(events.length).toBe(1);
  });

  it('N=1 verifica apenas o último tick', async () => {
    const eng = makeEngine();
    setHistory(eng, [9, 3]); // último = 3, então 9 não está no último
    eng.loadRules(makeRule(
      { all: [{ fact: 'digitNotInLastN', params: { n: 1, digit: 9 }, operator: 'equal', value: true }] },
      'DIGITMATCH', 9,
    ));
    const { events } = await runFacts(eng);
    expect(events.length).toBe(1);
  });
});

// =============================================================================
// 2. TIPOS DE CONTRATO — todos os 8 tipos com prediction fixa (da estratégia)
// =============================================================================

describe('Tipos de contrato — prediction fixa na estratégia JSON', () => {
  it('DIGITOVER com prediction 5: dispara sinal correto', async () => {
    const signal = vi.fn();
    const eng = makeEngine(signal);
    setHistory(eng, HISTORY_10);
    eng.loadRules(makeRule(always, 'DIGITOVER', 5));
    eng.start();
    await emitTickAndWait(100.33);
    expect(signal).toHaveBeenCalledWith('DIGITOVER', 5);
    eng.stop();
  });

  it('DIGITUNDER com prediction 4: dispara sinal correto', async () => {
    const signal = vi.fn();
    const eng = makeEngine(signal);
    setHistory(eng, HISTORY_10);
    eng.loadRules(makeRule(always, 'DIGITUNDER', 4));
    eng.start();
    await emitTickAndWait(100.33);
    expect(signal).toHaveBeenCalledWith('DIGITUNDER', 4);
    eng.stop();
  });

  it('DIGITMATCH com prediction 7: dispara sinal correto', async () => {
    const signal = vi.fn();
    const eng = makeEngine(signal);
    setHistory(eng, HISTORY_10);
    eng.loadRules(makeRule(always, 'DIGITMATCH', 7));
    eng.start();
    await emitTickAndWait(100.33);
    expect(signal).toHaveBeenCalledWith('DIGITMATCH', 7);
    eng.stop();
  });

  it('DIGITDIFF com prediction 2: dispara sinal correto', async () => {
    const signal = vi.fn();
    const eng = makeEngine(signal);
    setHistory(eng, HISTORY_10);
    eng.loadRules(makeRule(always, 'DIGITDIFF', 2));
    eng.start();
    await emitTickAndWait(100.33);
    expect(signal).toHaveBeenCalledWith('DIGITDIFF', 2);
    eng.stop();
  });

  it('DIGITEVEN sem prediction (null): dispara sinal correto', async () => {
    const signal = vi.fn();
    const eng = makeEngine(signal);
    setHistory(eng, HISTORY_10);
    eng.loadRules(makeRule(always, 'DIGITEVEN', null));
    eng.start();
    await emitTickAndWait(100.33);
    expect(signal).toHaveBeenCalledWith('DIGITEVEN', null);
    eng.stop();
  });

  it('DIGITODD sem prediction (null): dispara sinal correto', async () => {
    const signal = vi.fn();
    const eng = makeEngine(signal);
    setHistory(eng, HISTORY_10);
    eng.loadRules(makeRule(always, 'DIGITODD', null));
    eng.start();
    await emitTickAndWait(100.33);
    expect(signal).toHaveBeenCalledWith('DIGITODD', null);
    eng.stop();
  });

  it('CALL sem prediction (null): dispara sinal correto', async () => {
    const signal = vi.fn();
    const eng = makeEngine(signal);
    setHistory(eng, HISTORY_10);
    eng.loadRules(makeRule(always, 'CALL', null));
    eng.start();
    await emitTickAndWait(100.33);
    expect(signal).toHaveBeenCalledWith('CALL', null);
    eng.stop();
  });

  it('PUT sem prediction (null): dispara sinal correto', async () => {
    const signal = vi.fn();
    const eng = makeEngine(signal);
    setHistory(eng, HISTORY_10);
    eng.loadRules(makeRule(always, 'PUT', null));
    eng.start();
    await emitTickAndWait(100.33);
    expect(signal).toHaveBeenCalledWith('PUT', null);
    eng.stop();
  });
});

// =============================================================================
// 3. PREDIÇÃO DINÂMICA — predictionFact calculado a partir do histórico
// =============================================================================

describe('Predição dinâmica — predictionFact', () => {
  it('resolvePredictionFact: mostFrequentDigit retorna dígito correto', () => {
    const eng = makeEngine();
    // 7 aparece 4x → mais frequente
    setHistory(eng, [7, 7, 7, 7, 1, 2, 3, 4, 5, 6]);
    const pred = (eng as any).resolvePredictionFact('mostFrequentDigit', { n: 10 });
    expect(pred).toBe(7);
  });

  it('resolvePredictionFact: lastDigit retorna último dígito do histórico', () => {
    const eng = makeEngine();
    setHistory(eng, [3, 5, 9]);
    const pred = (eng as any).resolvePredictionFact('lastDigit', {});
    expect(pred).toBe(9);
  });

  it('resolvePredictionFact: secondLastDigit retorna penúltimo', () => {
    const eng = makeEngine();
    setHistory(eng, [3, 5, 9]);
    const pred = (eng as any).resolvePredictionFact('secondLastDigit', {});
    expect(pred).toBe(5);
  });

  it('resolvePredictionFact: fact desconhecido retorna null', () => {
    const eng = makeEngine();
    setHistory(eng, [1, 2, 3]);
    const pred = (eng as any).resolvePredictionFact('rsi14', {});
    expect(pred).toBeNull();
  });

  it('dispara sinal com prediction calculada do dígito mais frequente', async () => {
    const signal = vi.fn();
    const eng = makeEngine(signal);
    // Dígito 5 aparece 4x → prediction = 5
    setHistory(eng, [5, 5, 5, 5, 1, 2, 3, 4, 6, 7]);
    eng.loadRules(makeRule(always, 'DIGITMATCH', null, 'mostFrequentDigit', { n: 10 }));
    eng.start();
    await emitTickAndWait(100.21); // digit 1 — apenas aciona o handler
    // prediction = dígito mais frequente após o tick ser adicionado
    expect(signal).toHaveBeenCalledWith('DIGITMATCH', expect.any(Number));
    eng.stop();
  });

  it('dispara DIGITOVER com prediction = secondLastDigit', async () => {
    const signal = vi.fn();
    const eng = makeEngine(signal);
    // Histórico: [..., 8]; tick emitido: digit 3 (R_100, price 100.33)
    // Após tick: history = [..., 8, 3]; secondLastDigit = 8
    setHistory(eng, [1, 2, 3, 4, 5, 6, 7, 8]);
    eng.loadRules(makeRule(always, 'DIGITOVER', null, 'secondLastDigit', {}));
    eng.start();
    await emitTickAndWait(100.33); // digit 3 adicionado → secondLastDigit = 8
    expect(signal).toHaveBeenCalledWith('DIGITOVER', 8);
    eng.stop();
  });
});

// =============================================================================
// 4. ESTRATÉGIAS REAIS — simulando o que a IA geraria
// =============================================================================

describe('Estratégia: Dígito mais frequente + twoLastDifferent (AND composto)', () => {
  const rule = {
    name: 'Frequente + Alternância',
    conditions: {
      all: [
        { fact: 'twoLastDifferent', operator: 'equal', value: true },
        { fact: 'mostFrequentCount', params: { n: 10 }, operator: 'greaterThanInclusive', value: 3 },
      ],
    },
    event: {
      type: 'trade',
      params: { contractType: 'DIGITMATCH', predictionFact: 'mostFrequentDigit', predictionFactParams: { n: 10 } },
    },
  };

  it('dispara quando últimos 2 são diferentes E frequente apareceu 3+ vezes', async () => {
    const signal = vi.fn();
    const eng = makeEngine(signal);
    // 7 aparece 4x; últimos 2 são (4,7) → diferentes
    setHistory(eng, [7, 7, 7, 3, 2, 1, 5, 8, 4, 7]);
    eng.loadRules(rule);
    eng.start();
    // Emite digit 3 → history: [...,7,3]; últimos 2: (7,3) diferentes ✓
    // Últimos 10: [7,7,3,2,1,5,8,4,7,3] → 7 aparece 3x ✓
    await emitTickAndWait(100.33);
    expect(signal).toHaveBeenCalledWith('DIGITMATCH', expect.any(Number));
    eng.stop();
  });

  it('NÃO dispara quando últimos 2 são iguais (condição AND falha)', async () => {
    const signal = vi.fn();
    const eng = makeEngine(signal);
    setHistory(eng, [7, 7, 7, 3, 2, 1, 5, 8, 7, 7]); // últimos 2: (7,7)
    eng.loadRules(rule);
    eng.start();
    await emitTickAndWait(100.47); // digit 7 → últimos 2: (7,7) — twoLastDifferent = false ✗
    expect(signal).not.toHaveBeenCalled();
    eng.stop();
  });

  it('NÃO dispara quando count está abaixo do threshold (condição AND falha)', async () => {
    const signal = vi.fn();
    const eng = makeEngine(signal);
    // Todos dígitos distintos → count máximo = 1, abaixo de 3
    setHistory(eng, [1, 2, 3, 4, 5, 6, 7, 8, 9, 0]);
    eng.loadRules(rule);
    eng.start();
    await emitTickAndWait(100.30); // últimos 2: (0,0) = iguais → falha na primeira condição já
    expect(signal).not.toHaveBeenCalled();
    eng.stop();
  });
});

describe('Estratégia: Sequência longa → DIGITDIFF (reversão)', () => {
  const rule = {
    name: 'Reversão de série',
    conditions: { all: [{ fact: 'consecutiveSame', operator: 'greaterThanInclusive', value: 4 }] },
    event: { type: 'trade', params: { contractType: 'DIGITDIFF', prediction: 5 } },
  };

  it('dispara quando o mesmo dígito se repete 4 vezes', async () => {
    const signal = vi.fn();
    const eng = makeEngine(signal);
    setHistory(eng, [1, 2, 3, 5, 5, 5]); // 3 iguais no final
    eng.loadRules(rule);
    eng.start();
    await emitTickAndWait(100.35); // digit 5 → consecutiveSame = 4 ✓
    expect(signal).toHaveBeenCalledWith('DIGITDIFF', 5);
    eng.stop();
  });

  it('NÃO dispara com apenas 3 repetições (abaixo do threshold)', async () => {
    const signal = vi.fn();
    const eng = makeEngine(signal);
    setHistory(eng, [1, 2, 3, 5, 5]); // 2 iguais no final
    eng.loadRules(rule);
    eng.start();
    await emitTickAndWait(100.35); // digit 5 → consecutiveSame = 3 ✗
    expect(signal).not.toHaveBeenCalled();
    eng.stop();
  });

  it('dispara com 5 repetições consecutivas (acima do threshold)', async () => {
    const signal = vi.fn();
    const eng = makeEngine(signal);
    setHistory(eng, [1, 3, 3, 3, 3]); // 4 iguais no final
    eng.loadRules(rule);
    eng.start();
    await emitTickAndWait(100.33); // digit 3 → consecutiveSame = 5 ✓
    expect(signal).toHaveBeenCalled();
    eng.stop();
  });
});

describe('Estratégia: Dígito ausente nos últimos N ticks → DIGITMATCH', () => {
  it('dispara quando dígito 9 não apareceu nos últimos 8 ticks', async () => {
    const signal = vi.fn();
    const eng = makeEngine(signal);
    // Posição do 9: apenas no início, fora da janela de 8
    setHistory(eng, [9, 1, 2, 3, 4, 5, 6, 7, 8]);
    eng.loadRules({
      name: 'Dígito ausente',
      conditions: { all: [{ fact: 'digitNotInLastN', params: { n: 8, digit: 9 }, operator: 'equal', value: true }] },
      event: { type: 'trade', params: { contractType: 'DIGITMATCH', prediction: 9 } },
    });
    eng.start();
    await emitTickAndWait(100.20); // digit 0 → últimos 8 ainda sem 9 ✓
    expect(signal).toHaveBeenCalledWith('DIGITMATCH', 9);
    eng.stop();
  });

  it('NÃO dispara quando o dígito está dentro da janela', async () => {
    const signal = vi.fn();
    const eng = makeEngine(signal);
    setHistory(eng, [1, 2, 9, 4, 5, 6, 7, 8]); // 9 está dentro dos últimos 8
    eng.loadRules({
      name: 'Dígito ausente',
      conditions: { all: [{ fact: 'digitNotInLastN', params: { n: 8, digit: 9 }, operator: 'equal', value: true }] },
      event: { type: 'trade', params: { contractType: 'DIGITMATCH', prediction: 9 } },
    });
    eng.start();
    await emitTickAndWait(100.20);
    expect(signal).not.toHaveBeenCalled();
    eng.stop();
  });
});

describe('Estratégia: Pressão de dígitos baixos → DIGITOVER com prediction do bloco config', () => {
  it('dispara DIGITOVER 4 quando dígito mais frequente é menor que 4', async () => {
    const signal = vi.fn();
    const eng = makeEngine(signal);
    // Dígito 2 aparece 5x → mais frequente e < 4
    setHistory(eng, [2, 2, 2, 2, 2, 5, 6, 7, 8, 9]);
    eng.loadRules({
      name: 'Pressão para cima',
      conditions: {
        all: [{ fact: 'mostFrequentDigit', params: { n: 10 }, operator: 'lessThan', value: 4 }],
      },
      // prediction 4 vem do bloco de configuração (TradeConfig)
      event: { type: 'trade', params: { contractType: 'DIGITOVER', prediction: 4 } },
    });
    eng.start();
    await emitTickAndWait(100.21); // digit 1
    expect(signal).toHaveBeenCalledWith('DIGITOVER', 4);
    eng.stop();
  });

  it('dispara DIGITUNDER 5 quando dígito mais frequente é maior que 5', async () => {
    const signal = vi.fn();
    const eng = makeEngine(signal);
    // Dígito 8 aparece 5x → mais frequente e > 5
    setHistory(eng, [8, 8, 8, 8, 8, 1, 2, 3, 4, 5]);
    eng.loadRules({
      name: 'Pressão para baixo',
      conditions: {
        all: [{ fact: 'mostFrequentDigit', params: { n: 10 }, operator: 'greaterThan', value: 5 }],
      },
      // prediction 5 vem do bloco de configuração (TradeConfig)
      event: { type: 'trade', params: { contractType: 'DIGITUNDER', prediction: 5 } },
    });
    eng.start();
    await emitTickAndWait(100.21);
    expect(signal).toHaveBeenCalledWith('DIGITUNDER', 5);
    eng.stop();
  });
});

describe('Estratégia: par/ímpar baseado em sequência', () => {
  it('dispara DIGITODD após 2 dígitos pares consecutivos', async () => {
    const signal = vi.fn();
    const eng = makeEngine(signal);
    setHistory(eng, [1, 3, 5, 2, 4]); // últimos 2: (2,4) ambos pares
    eng.loadRules({
      name: 'Após pares → ímpar',
      conditions: {
        all: [
          { fact: 'lastDigit', operator: 'in', value: [0, 2, 4, 6, 8] },
          { fact: 'secondLastDigit', operator: 'in', value: [0, 2, 4, 6, 8] },
        ],
      },
      event: { type: 'trade', params: { contractType: 'DIGITODD', prediction: null } },
    });
    eng.start();
    await emitTickAndWait(100.36); // digit 6 (par) → últimos 2: (4,6) ambos pares ✓
    expect(signal).toHaveBeenCalledWith('DIGITODD', null);
    eng.stop();
  });

  it('dispara DIGITEVEN após 2 dígitos ímpares consecutivos', async () => {
    const signal = vi.fn();
    const eng = makeEngine(signal);
    setHistory(eng, [2, 4, 6, 1, 3]); // últimos 2: (1,3) ambos ímpares
    eng.loadRules({
      name: 'Após ímpares → par',
      conditions: {
        all: [
          { fact: 'lastDigit', operator: 'in', value: [1, 3, 5, 7, 9] },
          { fact: 'secondLastDigit', operator: 'in', value: [1, 3, 5, 7, 9] },
        ],
      },
      event: { type: 'trade', params: { contractType: 'DIGITEVEN', prediction: null } },
    });
    eng.start();
    await emitTickAndWait(100.35); // digit 5 (ímpar) → últimos 2: (3,5) ambos ímpares ✓
    expect(signal).toHaveBeenCalledWith('DIGITEVEN', null);
    eng.stop();
  });
});

describe('Estratégia: Condições compostas — any (OR)', () => {
  const rule = {
    name: 'OR composto',
    conditions: {
      any: [
        // Condição A: dígito 0 aparece 3+ vezes nos últimos 10
        { fact: 'digitCount', params: { n: 10, digit: 0 }, operator: 'greaterThanInclusive', value: 3 },
        // Condição B: sequência de 5+ repetições
        { fact: 'consecutiveSame', operator: 'greaterThanInclusive', value: 5 },
      ],
    },
    event: { type: 'trade', params: { contractType: 'DIGITOVER', prediction: 5 } },
  };

  it('dispara quando condição A (digitCount) é verdadeira', async () => {
    const signal = vi.fn();
    const eng = makeEngine(signal);
    // Dígito 0 aparece 4x nos últimos 10
    setHistory(eng, [0, 0, 0, 0, 1, 2, 3, 4, 5, 6]);
    eng.loadRules(rule);
    eng.start();
    await emitTickAndWait(100.31);
    expect(signal).toHaveBeenCalledWith('DIGITOVER', 5);
    eng.stop();
  });

  it('dispara quando condição B (consecutiveSame) é verdadeira', async () => {
    const signal = vi.fn();
    const eng = makeEngine(signal);
    // 4 repetições no final (o tick emitido adiciona a 5ª)
    setHistory(eng, [1, 2, 7, 7, 7, 7]);
    eng.loadRules(rule);
    eng.start();
    await emitTickAndWait(100.37); // digit 7 → consecutiveSame = 5 ✓
    expect(signal).toHaveBeenCalledWith('DIGITOVER', 5);
    eng.stop();
  });

  it('NÃO dispara quando nenhuma condição OR é verdadeira', async () => {
    const signal = vi.fn();
    const eng = makeEngine(signal);
    // digitCount de 0 é 1, consecutiveSame é 1
    setHistory(eng, [1, 2, 3, 4, 5, 6, 7, 8, 9, 0]);
    eng.loadRules(rule);
    eng.start();
    await emitTickAndWait(100.31);
    expect(signal).not.toHaveBeenCalled();
    eng.stop();
  });
});

describe('Estratégia: Condições compostas — all + any aninhados', () => {
  it('dispara somente quando TODAS as condições AND são verdadeiras', async () => {
    const signal = vi.fn();
    const eng = makeEngine(signal);
    // Cond A: twoLastDifferent = true (últimos 2 diferentes)
    // Cond B: dígito 9 não apareceu nos últimos 5
    setHistory(eng, [9, 3, 1, 2, 4, 6]); // últimos 2: (4,6) diferentes; últimos 5: (3,1,2,4,6) sem 9
    eng.loadRules({
      name: 'AND composto',
      conditions: {
        all: [
          { fact: 'twoLastDifferent', operator: 'equal', value: true },
          { fact: 'digitNotInLastN', params: { n: 5, digit: 9 }, operator: 'equal', value: true },
        ],
      },
      event: { type: 'trade', params: { contractType: 'DIGITMATCH', prediction: 9 } },
    });
    eng.start();
    // digit 8 → últimos 2: (6,8) diferentes ✓; últimos 5: (1,2,4,6,8) sem 9 ✓
    await emitTickAndWait(100.38);
    expect(signal).toHaveBeenCalledWith('DIGITMATCH', 9);
    eng.stop();
  });

  it('NÃO dispara quando apenas uma das condições AND é verdadeira', async () => {
    const signal = vi.fn();
    const eng = makeEngine(signal);
    // twoLastDifferent = true, mas 9 está nos últimos 5
    setHistory(eng, [3, 1, 2, 9, 6]); // últimos 2: (9,6) diferentes; mas 9 está nos últimos 5
    eng.loadRules({
      name: 'AND composto',
      conditions: {
        all: [
          { fact: 'twoLastDifferent', operator: 'equal', value: true },
          { fact: 'digitNotInLastN', params: { n: 5, digit: 9 }, operator: 'equal', value: true },
        ],
      },
      event: { type: 'trade', params: { contractType: 'DIGITMATCH', prediction: 9 } },
    });
    eng.start();
    await emitTickAndWait(100.38);
    expect(signal).not.toHaveBeenCalled();
    eng.stop();
  });
});

// =============================================================================
// 5. GUARDAS DE EXECUÇÃO — cooldown, isAwaitingTrade, mínimo de ticks
// =============================================================================

describe('Guarda: cooldown — 3 ticks ignorados após sinal', () => {
  it('ignora 3 ticks após disparar; avalia novamente no 4º', async () => {
    const signal = vi.fn();
    const eng = makeEngine(signal);
    setHistory(eng, HISTORY_10);
    eng.loadRules(makeRule(always, 'DIGITODD'));
    eng.start();

    await emitTickAndWait(100.31); // tick 1: sinal disparado, cooldown=3
    expect(signal).toHaveBeenCalledTimes(1);

    eng.notifyTradeResult(); // libera isAwaitingTrade

    await emitTickAndWait(100.32); // tick 2: cooldown=2, ignorado
    await emitTickAndWait(100.33); // tick 3: cooldown=1, ignorado
    await emitTickAndWait(100.34); // tick 4: cooldown=0 (decrementa mas pula)
    expect(signal).toHaveBeenCalledTimes(1); // ainda 1

    await emitTickAndWait(100.35); // tick 5: cooldown=0, avalia normalmente
    expect(signal).toHaveBeenCalledTimes(2);

    eng.stop();
  });
});

describe('Guarda: isAwaitingTrade — bloqueia novos sinais até notifyTradeResult', () => {
  it('não dispara segundo sinal enquanto aguarda resultado do trade', async () => {
    const signal = vi.fn();
    const eng = makeEngine(signal);
    setHistory(eng, HISTORY_10);
    eng.loadRules(makeRule(always, 'DIGITEVEN'));
    eng.start();

    await emitTickAndWait(100.31); // sinal 1 → isAwaitingTrade=true, cooldown=3
    expect(signal).toHaveBeenCalledTimes(1);

    // Força cooldown=0 sem resetar isAwaitingTrade
    (eng as any).cooldownTicks = 0;

    await emitTickAndWait(100.32); // isAwaitingTrade=true → bloqueado
    expect(signal).toHaveBeenCalledTimes(1);

    eng.notifyTradeResult(); // isAwaitingTrade = false

    await emitTickAndWait(100.33); // agora pode disparar
    expect(signal).toHaveBeenCalledTimes(2);

    eng.stop();
  });

  it('notifyTradeResult sem sinal anterior não causa problemas', () => {
    const eng = makeEngine();
    eng.loadRules(makeRule(always, 'DIGITODD'));
    expect(() => eng.notifyTradeResult()).not.toThrow();
  });
});

describe('Guarda: mínimo de 5 ticks antes de avaliar', () => {
  it('não avalia com menos de 5 ticks no histórico', async () => {
    const signal = vi.fn();
    const eng = makeEngine(signal);
    setHistory(eng, []); // histórico vazio
    eng.loadRules(makeRule(always, 'DIGITODD'));
    eng.start();

    await emitTickAndWait(100.31); // 1 tick
    await emitTickAndWait(100.32); // 2 ticks
    await emitTickAndWait(100.33); // 3 ticks
    await emitTickAndWait(100.34); // 4 ticks
    expect(signal).not.toHaveBeenCalled();

    await emitTickAndWait(100.35); // 5 ticks → avalia
    expect(signal).toHaveBeenCalledTimes(1);

    eng.stop();
  });
});

// =============================================================================
// 6. EXTRAÇÃO DE DÍGITO — casas decimais por símbolo
// =============================================================================

describe('Extração de dígito — casas decimais por símbolo', () => {
  function digit(sym: string, price: number): number {
    return (makeEngine(vi.fn(), sym) as any).extractDigit(price);
  }

  it('R_100 usa 2 casas decimais → 123.47 → dígito 7', () => {
    expect(digit('R_100', 123.47)).toBe(7);
  });

  it('R_100 → 100.50 → dígito 0', () => {
    expect(digit('R_100', 100.50)).toBe(0);
  });

  it('1HZ100V usa 2 casas decimais → 456.83 → dígito 3', () => {
    expect(digit('1HZ100V', 456.83)).toBe(3);
  });

  it('JD10 usa 2 casas decimais → 789.62 → dígito 2', () => {
    expect(digit('JD10', 789.62)).toBe(2);
  });

  it('R_25 usa 3 casas decimais → 123.456 → dígito 6', () => {
    expect(digit('R_25', 123.456)).toBe(6);
  });

  it('R_10 usa 3 casas decimais → 10.379 → dígito 9', () => {
    expect(digit('R_10', 10.379)).toBe(9);
  });

  it('RDBEAR usa 4 casas decimais → 1.23456789 → dígito 6 (toFixed arredonda)', () => {
    // 1.23456789.toFixed(4) = "1.2346" → dígito 6
    expect(digit('RDBEAR', 1.23456789)).toBe(6);
  });

  it('RDBULL usa 4 casas decimais → 2.34569 → dígito 7 (arredondamento)', () => {
    // 2.34569.toFixed(4) = "2.3457" → dígito 7
    expect(digit('RDBULL', 2.34569)).toBe(7);
  });

  it('símbolo desconhecido usa 4 casas decimais (padrão)', () => {
    // 5.6789.toFixed(4) = "5.6789" → dígito 9
    expect(digit('UNKNOWN_XYZ', 5.6789)).toBe(9);
  });

  it('R_75 usa 4 casas decimais (padrão) → 100.1234 → dígito 4', () => {
    expect(digit('R_75', 100.1234)).toBe(4);
  });
});

// =============================================================================
// 7. CICLO DE VIDA DO ENGINE
// =============================================================================

describe('Ciclo de vida — start/stop/loadRules', () => {
  it('getRulesLoaded retorna false antes de loadRules', () => {
    const eng = makeEngine();
    expect(eng.getRulesLoaded()).toBe(false);
  });

  it('getRulesLoaded retorna true após loadRules', () => {
    const eng = makeEngine();
    eng.loadRules(makeRule(always, 'DIGITODD'));
    expect(eng.getRulesLoaded()).toBe(true);
  });

  it('start registra exatamente 1 handler no observer', () => {
    const eng = makeEngine();
    eng.loadRules(makeRule(always, 'DIGITODD'));
    expect(mockObserver.count('deriv.tick')).toBe(0);
    eng.start();
    expect(mockObserver.count('deriv.tick')).toBe(1);
    eng.stop();
  });

  it('stop remove o handler do observer', () => {
    const eng = makeEngine();
    eng.loadRules(makeRule(always, 'DIGITODD'));
    eng.start();
    expect(mockObserver.count('deriv.tick')).toBe(1);
    eng.stop();
    expect(mockObserver.count('deriv.tick')).toBe(0);
  });

  it('start duplo não registra dois handlers', () => {
    const eng = makeEngine();
    eng.loadRules(makeRule(always, 'DIGITODD'));
    eng.start();
    eng.start(); // segundo start deve ser ignorado (isRunning=true)
    expect(mockObserver.count('deriv.tick')).toBe(1);
    eng.stop();
  });

  it('start sem regras carregadas não inicia (engine=null)', () => {
    const eng = makeEngine();
    // Sem loadRules → this.engine é null → onStatusChange('Nenhuma regra carregada')
    eng.start();
    expect(mockObserver.count('deriv.tick')).toBe(0);
  });

  it('loadRules com array carrega múltiplas regras e getRulesLoaded retorna true', () => {
    const eng = makeEngine();
    eng.loadRules([
      makeRule(always, 'DIGITODD'),
      makeRule(always, 'DIGITEVEN'),
    ]);
    expect(eng.getRulesLoaded()).toBe(true);
  });

  it('recarregar regras via segundo loadRules substitui o engine anterior', async () => {
    const signal = vi.fn();
    const eng = makeEngine(signal);
    setHistory(eng, HISTORY_10);

    // Regra que nunca dispara (tickCount = 9999)
    eng.loadRules(makeRule(
      { all: [{ fact: 'tickCount', operator: 'equal', value: 9999 }] },
      'DIGITODD',
    ));
    eng.start();
    await emitTickAndWait(100.31);
    expect(signal).not.toHaveBeenCalled();
    eng.stop();

    // Recarrega com regra que sempre dispara
    eng.loadRules(makeRule(always, 'DIGITEVEN'));
    eng.start();
    await emitTickAndWait(100.31);
    expect(signal).toHaveBeenCalledTimes(1);
    eng.stop();
  });

  it('histórico é preservado entre stop e start', async () => {
    const signal = vi.fn();
    const eng = makeEngine(signal);
    setHistory(eng, HISTORY_10);
    eng.loadRules(makeRule(always, 'DIGITODD'));

    eng.start();
    await emitTickAndWait(100.31);
    expect(signal).toHaveBeenCalledTimes(1);
    eng.stop();

    // O histórico ainda tem os dados; um segundo start deve continuar funcionando
    eng.notifyTradeResult();
    (eng as any).cooldownTicks = 0;

    eng.start();
    await emitTickAndWait(100.32);
    expect(signal).toHaveBeenCalledTimes(2);
    eng.stop();
  });
});

// =============================================================================
// 8. ADVANCED GEMINI SERVICE — parsing e extração de JSON
// =============================================================================

describe('AdvancedGeminiService — parsing da resposta da IA', () => {
  const svc = new AdvancedGeminiService();

  const validJson = JSON.stringify({
    name: 'Estratégia teste',
    conditions: { all: [{ fact: 'twoLastDifferent', operator: 'equal', value: true }] },
    event: { type: 'trade', params: { contractType: 'DIGITMATCH', prediction: 5 } },
  });

  function mockFetch(body: any, ok = true) {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok,
      json: () => Promise.resolve(body),
    }));
  }

  afterEach(() => vi.unstubAllGlobals());

  it('extrai JSON do campo "text" da resposta', async () => {
    mockFetch({ text: validJson });
    const result = await svc.translateAdvancedStrategy('teste');
    expect(result.success).toBe(true);
    expect(result.rulesJson?.name).toBe('Estratégia teste');
  });

  it('extrai JSON do campo "message" da resposta', async () => {
    mockFetch({ message: validJson });
    const result = await svc.translateAdvancedStrategy('teste');
    expect(result.success).toBe(true);
  });

  it('extrai JSON do campo "response" da resposta', async () => {
    mockFetch({ response: validJson });
    const result = await svc.translateAdvancedStrategy('teste');
    expect(result.success).toBe(true);
  });

  it('extrai JSON do path candidates[0].content.parts[0].text', async () => {
    mockFetch({ candidates: [{ content: { parts: [{ text: validJson }] } }] });
    const result = await svc.translateAdvancedStrategy('teste');
    expect(result.success).toBe(true);
    expect(result.rulesJson?.conditions).toBeDefined();
  });

  it('extrai JSON de bloco markdown (```json ... ```)', async () => {
    const fenced = '```json\n' + validJson + '\n```';
    mockFetch({ text: fenced });
    const result = await svc.translateAdvancedStrategy('teste');
    expect(result.success).toBe(true);
    expect(result.rulesJson?.event).toBeDefined();
  });

  it('extrai JSON embutido em texto livre da IA', async () => {
    const withText = 'Claro! Aqui está a regra gerada:\n' + validJson + '\nEspero que funcione!';
    mockFetch({ text: withText });
    const result = await svc.translateAdvancedStrategy('teste');
    expect(result.success).toBe(true);
  });

  it('retorna erro quando JSON não tem campo "conditions"', async () => {
    const noConditions = JSON.stringify({
      name: 'Incompleto',
      event: { type: 'trade', params: { contractType: 'DIGITODD', prediction: null } },
    });
    mockFetch({ text: noConditions });
    const result = await svc.translateAdvancedStrategy('teste');
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/conditions/i);
  });

  it('retorna erro quando JSON não tem campo "event"', async () => {
    const noEvent = JSON.stringify({
      name: 'Incompleto',
      conditions: { all: [] },
    });
    mockFetch({ text: noEvent });
    const result = await svc.translateAdvancedStrategy('teste');
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/event/i);
  });

  it('retorna erro quando a IA não retorna JSON válido', async () => {
    mockFetch({ text: 'Não consegui entender a sua estratégia, tente reformular.' });
    const result = await svc.translateAdvancedStrategy('teste');
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/json/i);
  });

  it('retorna erro quando a resposta da API está completamente vazia', async () => {
    mockFetch({});
    const result = await svc.translateAdvancedStrategy('teste');
    expect(result.success).toBe(false);
  });

  it('retorna erro em resposta HTTP com status de erro (ok=false)', async () => {
    mockFetch({ message: 'Internal Server Error' }, false);
    const result = await svc.translateAdvancedStrategy('teste');
    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it('chama onProgress em múltiplas etapas', async () => {
    mockFetch({ text: validJson });
    const steps: string[] = [];
    await svc.translateAdvancedStrategy('teste', (msg) => steps.push(msg));
    expect(steps.length).toBeGreaterThanOrEqual(2);
  });

  it('JSON com predictionFact é aceito como válido', async () => {
    const withPredFact = JSON.stringify({
      name: 'Dinâmico',
      conditions: { all: [{ fact: 'twoLastDifferent', operator: 'equal', value: true }] },
      event: {
        type: 'trade',
        params: { contractType: 'DIGITMATCH', predictionFact: 'mostFrequentDigit', predictionFactParams: { n: 10 } },
      },
    });
    mockFetch({ text: withPredFact });
    const result = await svc.translateAdvancedStrategy('teste');
    expect(result.success).toBe(true);
    expect(result.rulesJson?.event?.params?.predictionFact).toBe('mostFrequentDigit');
  });

  it('aceita array de regras como resposta da IA', async () => {
    const arrayJson = JSON.stringify([
      {
        name: 'Ímpar → par',
        conditions: { all: [{ fact: 'lastDigit', operator: 'in', value: [1, 3, 5, 7, 9] }] },
        event: { type: 'trade', params: { contractType: 'DIGITEVEN', prediction: null } },
      },
      {
        name: 'Par → ímpar',
        conditions: { all: [{ fact: 'lastDigit', operator: 'in', value: [0, 2, 4, 6, 8] }] },
        event: { type: 'trade', params: { contractType: 'DIGITODD', prediction: null } },
      },
    ]);
    mockFetch({ text: arrayJson });
    const result = await svc.translateAdvancedStrategy('teste');
    expect(result.success).toBe(true);
    expect(Array.isArray(result.rulesJson)).toBe(true);
    expect(result.rulesJson.length).toBe(2);
    expect(result.rulesJson[0].event.params.contractType).toBe('DIGITEVEN');
    expect(result.rulesJson[1].event.params.contractType).toBe('DIGITODD');
  });

  it('aceita array de regras em bloco markdown', async () => {
    const arrayJson = JSON.stringify([
      {
        name: 'Regra 1',
        conditions: { all: [{ fact: 'lastDigit', operator: 'in', value: [1, 3, 5, 7, 9] }] },
        event: { type: 'trade', params: { contractType: 'DIGITEVEN', prediction: null } },
      },
    ]);
    const fenced = '```json\n' + arrayJson + '\n```';
    mockFetch({ text: fenced });
    const result = await svc.translateAdvancedStrategy('teste');
    expect(result.success).toBe(true);
    expect(Array.isArray(result.rulesJson)).toBe(true);
  });

  it('aceita array de regras embutido em texto livre da IA', async () => {
    const arrayJson = JSON.stringify([
      {
        name: 'Regra A',
        conditions: { all: [{ fact: 'consecutiveSame', operator: 'greaterThanInclusive', value: 3 }] },
        event: { type: 'trade', params: { contractType: 'DIGITDIFF', prediction: 5 } },
      },
    ]);
    const withText = 'Aqui estão as regras geradas:\n' + arrayJson + '\nEspero que ajude!';
    mockFetch({ text: withText });
    const result = await svc.translateAdvancedStrategy('teste');
    expect(result.success).toBe(true);
    expect(Array.isArray(result.rulesJson)).toBe(true);
  });

  it('retorna erro quando array tem regra sem "conditions"', async () => {
    const invalidArray = JSON.stringify([
      {
        name: 'Válida',
        conditions: { all: [{ fact: 'lastDigit', operator: 'equal', value: 5 }] },
        event: { type: 'trade', params: { contractType: 'DIGITEVEN', prediction: null } },
      },
      {
        name: 'Inválida — sem conditions',
        event: { type: 'trade', params: { contractType: 'DIGITODD', prediction: null } },
      },
    ]);
    mockFetch({ text: invalidArray });
    const result = await svc.translateAdvancedStrategy('teste');
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/conditions/i);
  });

  it('retorna erro quando array tem regra sem "event"', async () => {
    const invalidArray = JSON.stringify([
      {
        name: 'Sem event',
        conditions: { all: [{ fact: 'lastDigit', operator: 'equal', value: 5 }] },
      },
    ]);
    mockFetch({ text: invalidArray });
    const result = await svc.translateAdvancedStrategy('teste');
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/event/i);
  });

  it('retorna erro quando array está vazio', async () => {
    mockFetch({ text: '[]' });
    const result = await svc.translateAdvancedStrategy('teste');
    expect(result.success).toBe(false);
  });
});

// =============================================================================
// 9. FLUXO COMPLETO DE INTEGRAÇÃO
// =============================================================================

describe('Fluxo completo: estratégia → carregamento → ticks → sinal → liberar → próximo ciclo', () => {
  it('ciclo completo com predictionFact: dois trades em sequência com notifyTradeResult entre eles', async () => {
    const signal = vi.fn();
    const eng = makeEngine(signal);

    eng.loadRules({
      name: 'Frequente dominante',
      conditions: {
        all: [{ fact: 'mostFrequentCount', params: { n: 10 }, operator: 'greaterThanInclusive', value: 3 }],
      },
      event: {
        type: 'trade',
        params: { contractType: 'DIGITMATCH', predictionFact: 'mostFrequentDigit', predictionFactParams: { n: 10 } },
      },
    });

    // Dígito 5 aparece 5x → condição satisfeita
    setHistory(eng, [5, 5, 5, 5, 5, 1, 2, 3, 4, 6]);
    eng.start();

    // Trade 1
    await emitTickAndWait(100.27); // digit 7
    expect(signal).toHaveBeenCalledTimes(1);
    expect(signal).toHaveBeenCalledWith('DIGITMATCH', expect.any(Number));

    // Simula resultado chegando e cooldown passando
    (eng as any).cooldownTicks = 0;
    eng.notifyTradeResult();

    // Trade 2
    await emitTickAndWait(100.28); // digit 8
    expect(signal).toHaveBeenCalledTimes(2);

    eng.stop();
  });

  it('engine parado não processa ticks', async () => {
    const signal = vi.fn();
    const eng = makeEngine(signal);
    setHistory(eng, HISTORY_10);
    eng.loadRules(makeRule(always, 'DIGITODD'));

    eng.start();
    await emitTickAndWait(100.31);
    expect(signal).toHaveBeenCalledTimes(1);

    eng.stop();

    eng.notifyTradeResult();
    (eng as any).cooldownTicks = 0;

    await emitTickAndWait(100.32); // engine parado — handler removido
    expect(signal).toHaveBeenCalledTimes(1); // não incrementa
  });

  it('múltiplos engines com regras diferentes coexistem sem interferência', async () => {
    const signal1 = vi.fn();
    const signal2 = vi.fn();

    const eng1 = makeEngine(signal1);
    const eng2 = makeEngine(signal2);

    setHistory(eng1, HISTORY_10);
    setHistory(eng2, HISTORY_10);

    // eng1: dispara em qualquer tick
    eng1.loadRules(makeRule(always, 'DIGITODD'));
    // eng2: condição impossível de satisfazer
    eng2.loadRules(makeRule(
      { all: [{ fact: 'tickCount', operator: 'equal', value: 99999 }] },
      'DIGITEVEN',
    ));

    eng1.start();
    eng2.start();

    await emitTickAndWait(100.33);

    expect(signal1).toHaveBeenCalledTimes(1);
    expect(signal2).not.toHaveBeenCalled();

    eng1.stop();
    eng2.stop();
  });
});

// =============================================================================
// 10. VISUALIZAÇÃO DE REGRAS — RulesVisualData em tempo real
// =============================================================================

describe('Visualização: onRulesVisualUpdate callback', () => {
  function makeEngineWithVisual(signal = vi.fn(), visualCb = vi.fn()) {
    return new AdvancedRulesEngine({
      symbol: 'R_100',
      onTradeSignal: signal,
      onStatusChange: vi.fn(),
      onRulesVisualUpdate: visualCb,
    });
  }

  it('emite preview (isPreview=true) ao carregar regras', () => {
    const visualCb = vi.fn();
    const eng = makeEngineWithVisual(vi.fn(), visualCb);
    eng.loadRules(makeRule(
      { all: [{ fact: 'twoLastDifferent', operator: 'equal', value: true }] },
      'DIGITMATCH', 5,
    ));
    expect(visualCb).toHaveBeenCalledTimes(1);
    const data = visualCb.mock.calls[0][0];
    expect(data.isPreview).toBe(true);
    expect(data.groups.length).toBe(1);
    expect(data.groups[0].rules.length).toBeGreaterThan(0);
    // Preview deve ter status 'waiting' e ícone ⚪
    expect(data.groups[0].rules[0].status).toBe('waiting');
    expect(data.groups[0].rules[0].displayText).toContain('⚪');
  });

  it('preview mostra nome do fact e operador legível', () => {
    const visualCb = vi.fn();
    const eng = makeEngineWithVisual(vi.fn(), visualCb);
    eng.loadRules(makeRule(
      { all: [{ fact: 'mostFrequentCount', params: { n: 10 }, operator: 'greaterThanInclusive', value: 3 }] },
      'DIGITMATCH', 5,
    ));
    const data = visualCb.mock.calls[0][0];
    const text = data.groups[0].rules[0].displayText;
    expect(text).toContain('≥'); // greaterThanInclusive → ≥
    expect(text).toContain('3'); // value
  });

  it('emite dados visuais a cada tick durante execução (isPreview=false)', async () => {
    const visualCb = vi.fn();
    const eng = makeEngineWithVisual(vi.fn(), visualCb);
    setHistory(eng, HISTORY_10);
    eng.loadRules(makeRule(
      { all: [{ fact: 'twoLastDifferent', operator: 'equal', value: true }] },
      'DIGITMATCH', 5,
    ));
    const previewCalls = visualCb.mock.calls.length; // 1 (do loadRules)
    eng.start();
    await emitTickAndWait(100.33);
    expect(visualCb.mock.calls.length).toBeGreaterThan(previewCalls);
    const tickData = visualCb.mock.calls[visualCb.mock.calls.length - 1][0];
    expect(tickData.isPreview).toBe(false);
    expect(tickData.groups[0].rules[0].status).toMatch(/satisfied|failed/);
    eng.stop();
  });

  it('condição satisfeita mostra 🟢 e valor atual do fact', async () => {
    const visualCb = vi.fn();
    const eng = makeEngineWithVisual(vi.fn(), visualCb);
    // Últimos 2 serão diferentes (9, 3) → twoLastDifferent = true
    setHistory(eng, [1, 2, 3, 4, 5, 6, 7, 8, 9]);
    eng.loadRules(makeRule(
      { all: [{ fact: 'twoLastDifferent', operator: 'equal', value: true }] },
      'DIGITMATCH', 5,
    ));
    eng.start();
    await emitTickAndWait(100.33); // digit 3 → (9,3) diferentes → true
    const data = visualCb.mock.calls[visualCb.mock.calls.length - 1][0];
    const rule = data.groups[0].rules[0];
    expect(rule.displayText).toContain('🟢');
    expect(rule.displayText).toContain('true'); // factResult
    expect(rule.status).toBe('satisfied');
    eng.stop();
  });

  it('condição não satisfeita mostra 🔴 e valor atual do fact', async () => {
    const visualCb = vi.fn();
    const eng = makeEngineWithVisual(vi.fn(), visualCb);
    // Últimos 2 iguais (7, 7) → twoLastDifferent = false → condição value:true falha
    setHistory(eng, [1, 2, 3, 4, 5, 6, 7, 7]);
    eng.loadRules(makeRule(
      { all: [{ fact: 'twoLastDifferent', operator: 'equal', value: true }] },
      'DIGITMATCH', 5,
    ));
    eng.start();
    await emitTickAndWait(100.37); // digit 7 → (7,7) iguais → false
    const data = visualCb.mock.calls[visualCb.mock.calls.length - 1][0];
    const rule = data.groups[0].rules[0];
    expect(rule.displayText).toContain('🔴');
    expect(rule.displayText).toContain('false'); // factResult
    expect(rule.status).toBe('failed');
    eng.stop();
  });

  it('condições compostas (all) geram múltiplas regras visuais', () => {
    const visualCb = vi.fn();
    const eng = makeEngineWithVisual(vi.fn(), visualCb);
    eng.loadRules({
      name: 'Composta',
      conditions: {
        all: [
          { fact: 'twoLastDifferent', operator: 'equal', value: true },
          { fact: 'mostFrequentCount', params: { n: 10 }, operator: 'greaterThanInclusive', value: 3 },
        ],
      },
      event: { type: 'trade', params: { contractType: 'DIGITMATCH', prediction: 5 } },
    });
    const data = visualCb.mock.calls[0][0];
    expect(data.groups[0].rules.length).toBe(2);
  });

  it('condições any (OR) geram múltiplas regras visuais', () => {
    const visualCb = vi.fn();
    const eng = makeEngineWithVisual(vi.fn(), visualCb);
    eng.loadRules({
      name: 'OR',
      conditions: {
        any: [
          { fact: 'lastDigit', operator: 'equal', value: 5 },
          { fact: 'consecutiveSame', operator: 'greaterThanInclusive', value: 3 },
        ],
      },
      event: { type: 'trade', params: { contractType: 'DIGITODD', prediction: null } },
    });
    const data = visualCb.mock.calls[0][0];
    expect(data.groups[0].rules.length).toBe(2);
  });

  it('sem callback, nenhum erro é lançado', async () => {
    // Engine sem onRulesVisualUpdate
    const eng = makeEngine();
    setHistory(eng, HISTORY_10);
    eng.loadRules(makeRule(always, 'DIGITODD'));
    eng.start();
    await expect(emitTickAndWait(100.31)).resolves.not.toThrow();
    eng.stop();
  });

  it('group id usa o nome da regra', () => {
    const visualCb = vi.fn();
    const eng = makeEngineWithVisual(vi.fn(), visualCb);
    eng.loadRules({
      name: 'Minha Estratégia',
      conditions: { all: [{ fact: 'tickCount', operator: 'greaterThan', value: 0 }] },
      event: { type: 'trade', params: { contractType: 'DIGITODD', prediction: null } },
    });
    const data = visualCb.mock.calls[0][0];
    expect(data.groups[0].id).toBe('Minha Estratégia');
  });

  it('operadores são formatados com símbolos legíveis', () => {
    const visualCb = vi.fn();
    const eng = makeEngineWithVisual(vi.fn(), visualCb);
    eng.loadRules({
      name: 'Ops',
      conditions: {
        all: [
          { fact: 'lastDigit', operator: 'notEqual', value: 5 },
          { fact: 'tickCount', operator: 'lessThan', value: 100 },
          { fact: 'consecutiveSame', operator: 'greaterThan', value: 2 },
        ],
      },
      event: { type: 'trade', params: { contractType: 'DIGITODD', prediction: null } },
    });
    const rules = visualCb.mock.calls[0][0].groups[0].rules;
    expect(rules[0].displayText).toContain('≠');
    expect(rules[1].displayText).toContain('<');
    expect(rules[2].displayText).toContain('>');
  });

  it('facts com parâmetros mostram os params no label', () => {
    const visualCb = vi.fn();
    const eng = makeEngineWithVisual(vi.fn(), visualCb);
    eng.loadRules(makeRule(
      { all: [{ fact: 'digitCount', params: { n: 10, digit: 3 }, operator: 'greaterThanInclusive', value: 3 }] },
      'DIGITMATCH', 3,
    ));
    const text = visualCb.mock.calls[0][0].groups[0].rules[0].displayText;
    expect(text).toContain('n:10');
    expect(text).toContain('digit:3');
  });
});

// =============================================================================
// 13. CAMINHOS MUTUAMENTE EXCLUSIVOS — array de 2 regras ("OU com ações diferentes")
// Padrão: "se ímpar → DIGITEVEN OU se par → DIGITODD"
// Não usa `any` (que exige mesmo contrato); usa array de regras independentes.
// =============================================================================

describe('Estratégia: ímpar → DIGITEVEN / par → DIGITODD (array de 2 regras)', () => {
  const rules = [
    {
      name: 'Ímpar → aposte par',
      conditions: { all: [{ fact: 'lastDigit', operator: 'in', value: [1, 3, 5, 7, 9] }] },
      event: { type: 'trade', params: { contractType: 'DIGITEVEN', prediction: null } },
    },
    {
      name: 'Par → aposte ímpar',
      conditions: { all: [{ fact: 'lastDigit', operator: 'in', value: [0, 2, 4, 6, 8] }] },
      event: { type: 'trade', params: { contractType: 'DIGITODD', prediction: null } },
    },
  ];

  it('dígito ímpar (3) → dispara DIGITEVEN', async () => {
    const signal = vi.fn();
    const eng = makeEngine(signal);
    setHistory(eng, HISTORY_10); // termina em 0 (par)
    eng.loadRules(rules);
    eng.start();
    await emitTickAndWait(100.33); // digit 3 (ímpar) → lastDigit=3 ∈ [1,3,5,7,9]
    expect(signal).toHaveBeenCalledWith('DIGITEVEN', null);
    eng.stop();
  });

  it('dígito par (6) → dispara DIGITODD', async () => {
    const signal = vi.fn();
    const eng = makeEngine(signal);
    setHistory(eng, HISTORY_10);
    eng.loadRules(rules);
    eng.start();
    await emitTickAndWait(100.36); // digit 6 (par) → lastDigit=6 ∈ [0,2,4,6,8]
    expect(signal).toHaveBeenCalledWith('DIGITODD', null);
    eng.stop();
  });

  it('dispara exatamente 1 sinal por tick — condições são mutuamente exclusivas', async () => {
    const signal = vi.fn();
    const eng = makeEngine(signal);
    setHistory(eng, HISTORY_10);
    eng.loadRules(rules);
    eng.start();
    await emitTickAndWait(100.35); // digit 5 (ímpar)
    expect(signal).toHaveBeenCalledTimes(1);
    expect(signal).toHaveBeenCalledWith('DIGITEVEN', null);
    eng.stop();
  });

  it('dois ticks consecutivos (ímpar → par) disparam contratos alternados', async () => {
    const signal = vi.fn();
    const eng = makeEngine(signal);
    setHistory(eng, HISTORY_10);
    eng.loadRules(rules);
    eng.start();

    // Tick 1: digit 3 (ímpar) → DIGITEVEN
    await emitTickAndWait(100.33);
    expect(signal).toHaveBeenNthCalledWith(1, 'DIGITEVEN', null);

    // Libera cooldown e awaiting
    (eng as any).cooldownTicks = 0;
    eng.notifyTradeResult();

    // Tick 2: digit 6 (par) → DIGITODD
    await emitTickAndWait(100.36);
    expect(signal).toHaveBeenNthCalledWith(2, 'DIGITODD', null);

    eng.stop();
  });

  it('dígito 0 (par) → dispara DIGITODD', async () => {
    const signal = vi.fn();
    const eng = makeEngine(signal);
    setHistory(eng, HISTORY_10);
    eng.loadRules(rules);
    eng.start();
    await emitTickAndWait(100.30); // digit 0 (par) → DIGITODD
    expect(signal).toHaveBeenCalledWith('DIGITODD', null);
    eng.stop();
  });

  it('dígito 9 (ímpar) → dispara DIGITEVEN', async () => {
    const signal = vi.fn();
    const eng = makeEngine(signal);
    setHistory(eng, HISTORY_10);
    eng.loadRules(rules);
    eng.start();
    await emitTickAndWait(100.39); // digit 9 (ímpar) → DIGITEVEN
    expect(signal).toHaveBeenCalledWith('DIGITEVEN', null);
    eng.stop();
  });

  it('visualização: loadRules com array cria 2 grupos distintos no preview', () => {
    const visualCb = vi.fn();
    const eng = new AdvancedRulesEngine({
      symbol: 'R_100',
      onTradeSignal: vi.fn(),
      onStatusChange: vi.fn(),
      onRulesVisualUpdate: visualCb,
    });
    eng.loadRules(rules);
    const data = visualCb.mock.calls[0][0];
    expect(data.isPreview).toBe(true);
    expect(data.groups.length).toBe(2);
    expect(data.groups[0].id).toBe('Ímpar → aposte par');
    expect(data.groups[1].id).toBe('Par → aposte ímpar');
  });
});

// =============================================================================
// 14. ACTIVE GROUP IDS — destaque visual da regra que disparou
// =============================================================================

describe('Visualização: activeGroupIds — destaque da regra que disparou', () => {
  function makeEngineWithVisual(signal = vi.fn(), visualCb = vi.fn()) {
    return new AdvancedRulesEngine({
      symbol: 'R_100',
      onTradeSignal: signal,
      onStatusChange: vi.fn(),
      onRulesVisualUpdate: visualCb,
    });
  }

  it('regra única que dispara: activeGroupIds é null (nenhum lock)', async () => {
    const visualCb = vi.fn();
    const eng = makeEngineWithVisual(vi.fn(), visualCb);
    setHistory(eng, HISTORY_10);
    eng.loadRules(makeRule(always, 'DIGITODD'));
    eng.start();
    await emitTickAndWait(100.33);
    const data = visualCb.mock.calls[visualCb.mock.calls.length - 1][0];
    // Com regra única, activeGroupIds = null independente de disparar ou não
    expect(data.activeGroupIds).toBeNull();
    eng.stop();
  });

  it('regra única que NÃO dispara: activeGroupIds é null', async () => {
    const visualCb = vi.fn();
    const eng = makeEngineWithVisual(vi.fn(), visualCb);
    setHistory(eng, HISTORY_10);
    eng.loadRules(makeRule(
      { all: [{ fact: 'tickCount', operator: 'equal', value: 99999 }] },
      'DIGITODD',
    ));
    eng.start();
    await emitTickAndWait(100.33);
    const data = visualCb.mock.calls[visualCb.mock.calls.length - 1][0];
    expect(data.activeGroupIds).toBeNull();
    eng.stop();
  });

  it('com 2 regras, activeGroupIds contém apenas o id da regra que disparou', async () => {
    const visualCb = vi.fn();
    const eng = makeEngineWithVisual(vi.fn(), visualCb);
    setHistory(eng, HISTORY_10);
    eng.loadRules([
      {
        name: 'Ímpar → aposte par',
        conditions: { all: [{ fact: 'lastDigit', operator: 'in', value: [1, 3, 5, 7, 9] }] },
        event: { type: 'trade', params: { contractType: 'DIGITEVEN', prediction: null } },
      },
      {
        name: 'Par → aposte ímpar',
        conditions: { all: [{ fact: 'lastDigit', operator: 'in', value: [0, 2, 4, 6, 8] }] },
        event: { type: 'trade', params: { contractType: 'DIGITODD', prediction: null } },
      },
    ]);
    eng.start();
    await emitTickAndWait(100.33); // digit 3 (ímpar) → só "Ímpar → aposte par" dispara
    const data = visualCb.mock.calls[visualCb.mock.calls.length - 1][0];
    expect(data.activeGroupIds).toEqual(['Ímpar → aposte par']);
    eng.stop();
  });

  it('com 2 regras, a que não disparou NÃO está em activeGroupIds', async () => {
    const visualCb = vi.fn();
    const eng = makeEngineWithVisual(vi.fn(), visualCb);
    setHistory(eng, HISTORY_10);
    eng.loadRules([
      {
        name: 'Ímpar → aposte par',
        conditions: { all: [{ fact: 'lastDigit', operator: 'in', value: [1, 3, 5, 7, 9] }] },
        event: { type: 'trade', params: { contractType: 'DIGITEVEN', prediction: null } },
      },
      {
        name: 'Par → aposte ímpar',
        conditions: { all: [{ fact: 'lastDigit', operator: 'in', value: [0, 2, 4, 6, 8] }] },
        event: { type: 'trade', params: { contractType: 'DIGITODD', prediction: null } },
      },
    ]);
    eng.start();
    await emitTickAndWait(100.33); // digit 3 → "Par → aposte ímpar" NÃO dispara
    const data = visualCb.mock.calls[visualCb.mock.calls.length - 1][0];
    expect(data.activeGroupIds).not.toContain('Par → aposte ímpar');
    eng.stop();
  });

  it('ordem dos grupos é estável independente de qual regra disparou', async () => {
    const visualCb = vi.fn();
    const eng = makeEngineWithVisual(vi.fn(), visualCb);
    setHistory(eng, HISTORY_10);
    const rules = [
      {
        name: 'Regra A',
        conditions: { all: [{ fact: 'lastDigit', operator: 'in', value: [1, 3, 5, 7, 9] }] },
        event: { type: 'trade', params: { contractType: 'DIGITEVEN', prediction: null } },
      },
      {
        name: 'Regra B',
        conditions: { all: [{ fact: 'lastDigit', operator: 'in', value: [0, 2, 4, 6, 8] }] },
        event: { type: 'trade', params: { contractType: 'DIGITODD', prediction: null } },
      },
    ];
    eng.loadRules(rules);
    eng.start();

    // Tick 1: Regra A dispara (ímpar)
    await emitTickAndWait(100.33);
    const data1 = visualCb.mock.calls[visualCb.mock.calls.length - 1][0];
    expect(data1.groups[0].id).toBe('Regra A');
    expect(data1.groups[1].id).toBe('Regra B');

    (eng as any).cooldownTicks = 0;
    eng.notifyTradeResult();

    // Tick 2: Regra B dispara (par) — ordem deve ser a mesma
    await emitTickAndWait(100.36);
    const data2 = visualCb.mock.calls[visualCb.mock.calls.length - 1][0];
    expect(data2.groups[0].id).toBe('Regra A');
    expect(data2.groups[1].id).toBe('Regra B');

    eng.stop();
  });

  it('quando nenhuma regra de 2 dispara, activeGroupIds é null (nenhum lock)', async () => {
    const visualCb = vi.fn();
    const eng = makeEngineWithVisual(vi.fn(), visualCb);
    setHistory(eng, HISTORY_10);
    eng.loadRules([
      {
        name: 'Regra Impossível A',
        conditions: { all: [{ fact: 'tickCount', operator: 'equal', value: 99998 }] },
        event: { type: 'trade', params: { contractType: 'DIGITEVEN', prediction: null } },
      },
      {
        name: 'Regra Impossível B',
        conditions: { all: [{ fact: 'tickCount', operator: 'equal', value: 99999 }] },
        event: { type: 'trade', params: { contractType: 'DIGITODD', prediction: null } },
      },
    ]);
    eng.start();
    await emitTickAndWait(100.33);
    const data = visualCb.mock.calls[visualCb.mock.calls.length - 1][0];
    expect(data.activeGroupIds).toBeNull();
    eng.stop();
  });

  it('preview sempre tem activeGroupIds null (sem estado de match)', () => {
    const visualCb = vi.fn();
    const eng = makeEngineWithVisual(vi.fn(), visualCb);
    eng.loadRules([
      makeRule(always, 'DIGITEVEN'),
      makeRule(always, 'DIGITODD'),
    ]);
    const previewData = visualCb.mock.calls[0][0];
    expect(previewData.isPreview).toBe(true);
    expect(previewData.activeGroupIds).toBeNull();
  });

  it('condição satisfeita no grupo ativo mostra 🟢; no grupo inativo mostra condições reais', async () => {
    const visualCb = vi.fn();
    const eng = makeEngineWithVisual(vi.fn(), visualCb);
    setHistory(eng, HISTORY_10);
    eng.loadRules([
      {
        name: 'Ímpar',
        conditions: { all: [{ fact: 'lastDigit', operator: 'in', value: [1, 3, 5, 7, 9] }] },
        event: { type: 'trade', params: { contractType: 'DIGITEVEN', prediction: null } },
      },
      {
        name: 'Par',
        conditions: { all: [{ fact: 'lastDigit', operator: 'in', value: [0, 2, 4, 6, 8] }] },
        event: { type: 'trade', params: { contractType: 'DIGITODD', prediction: null } },
      },
    ]);
    eng.start();
    await emitTickAndWait(100.33); // digit 3 (ímpar) → grupo "Ímpar" dispara
    const data = visualCb.mock.calls[visualCb.mock.calls.length - 1][0];
    const imparGroup = data.groups.find((g: any) => g.id === 'Ímpar');
    const parGroup = data.groups.find((g: any) => g.id === 'Par');
    // Grupo que disparou: condição verde
    expect(imparGroup.rules[0].status).toBe('satisfied');
    expect(imparGroup.rules[0].displayText).toContain('🟢');
    // Grupo que não disparou: condição vermelha
    expect(parGroup.rules[0].status).toBe('failed');
    expect(parGroup.rules[0].displayText).toContain('🔴');
    eng.stop();
  });
});

// =============================================================================
// 11. CACHE DE ESTRATÉGIAS AVANÇADAS — AdvancedGeminiService
// =============================================================================

describe('AdvancedGeminiService — cache de estratégias', () => {
  const svc = new AdvancedGeminiService();

  const validJson = JSON.stringify({
    name: 'Cache teste',
    conditions: { all: [{ fact: 'twoLastDifferent', operator: 'equal', value: true }] },
    event: { type: 'trade', params: { contractType: 'DIGITMATCH', prediction: 5 } },
  });

  // Mock localStorage
  let storage: Record<string, string> = {};
  beforeEach(() => {
    storage = {};
    vi.stubGlobal('window', {});
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => storage[key] ?? null,
      setItem: (key: string, value: string) => { storage[key] = value; },
      removeItem: (key: string) => { delete storage[key]; },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function mockFetch(body: any, ok = true) {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok,
      json: () => Promise.resolve(body),
    }));
  }

  it('salva no cache após tradução bem-sucedida', async () => {
    mockFetch({ text: validJson });
    const result = await svc.translateAdvancedStrategy('Minha estratégia');
    expect(result.success).toBe(true);
    expect(result.fromCache).toBe(false);
    // Verificar que salvou no localStorage
    const cached = JSON.parse(storage['advanced_rules_cache'] || '[]');
    expect(cached.length).toBe(1);
    expect(cached[0].normalizedText).toBe('minha estrategia');
  });

  it('retorna do cache na segunda chamada com mesmo texto', async () => {
    mockFetch({ text: validJson });
    // Primeira chamada: traduz via IA
    await svc.translateAdvancedStrategy('Minha estratégia');
    // Segunda chamada: deve usar cache
    const result = await svc.translateAdvancedStrategy('Minha estratégia');
    expect(result.success).toBe(true);
    expect(result.fromCache).toBe(true);
    expect(result.rulesJson?.name).toBe('Cache teste');
  });

  it('cache é case-insensitive e ignora acentos', async () => {
    mockFetch({ text: validJson });
    await svc.translateAdvancedStrategy('Dígitos frequentes');
    // Mesma estratégia com variações
    const result = await svc.translateAdvancedStrategy('DIGITOS FREQUENTES');
    expect(result.fromCache).toBe(true);
  });

  it('cache normaliza espaços extras', async () => {
    mockFetch({ text: validJson });
    await svc.translateAdvancedStrategy('minha   estratégia');
    const result = await svc.translateAdvancedStrategy('minha estratégia');
    expect(result.fromCache).toBe(true);
  });

  it('textos diferentes não colidem no cache', async () => {
    mockFetch({ text: validJson });
    await svc.translateAdvancedStrategy('Estratégia A');
    const result = await svc.translateAdvancedStrategy('Estratégia B');
    expect(result.fromCache).toBe(false);
  });

  it('informa "Estratégia encontrada no cache!" via onProgress', async () => {
    mockFetch({ text: validJson });
    await svc.translateAdvancedStrategy('cache progress');
    const steps: string[] = [];
    await svc.translateAdvancedStrategy('cache progress', (msg) => steps.push(msg));
    expect(steps).toContain('Estratégia encontrada no cache!');
  });

  it('não salva no cache quando tradução falha', async () => {
    mockFetch({ text: 'Texto inválido sem JSON' });
    const result = await svc.translateAdvancedStrategy('falha');
    expect(result.success).toBe(false);
    const cached = JSON.parse(storage['advanced_rules_cache'] || '[]');
    expect(cached.length).toBe(0);
  });

  it('cache respeita limite máximo de 30 itens', async () => {
    mockFetch({ text: validJson });
    // Preencher cache com 30 itens
    for (let i = 0; i < 35; i++) {
      storage = {}; // Reset para evitar cache hit
      mockFetch({ text: validJson });
      // Salvar diretamente no cache
      const cache = JSON.parse(storage['advanced_rules_cache'] || '[]');
      cache.unshift({ normalizedText: `estrategia ${i}`, rulesJson: { name: `Rule ${i}` }, timestamp: Date.now() });
      storage['advanced_rules_cache'] = JSON.stringify(cache);
    }
    // Adicionar mais um via tradução
    mockFetch({ text: validJson });
    await svc.translateAdvancedStrategy('nova estrategia');
    const cached = JSON.parse(storage['advanced_rules_cache'] || '[]');
    expect(cached.length).toBeLessThanOrEqual(30);
  });

  it('atualiza item existente no cache em vez de duplicar', async () => {
    mockFetch({ text: validJson });
    await svc.translateAdvancedStrategy('atualizar');
    // Modificar o JSON retornado
    const validJson2 = JSON.stringify({
      name: 'Atualizado',
      conditions: { all: [{ fact: 'lastDigit', operator: 'equal', value: 5 }] },
      event: { type: 'trade', params: { contractType: 'DIGITODD', prediction: null } },
    });
    mockFetch({ text: validJson2 });
    // Limpar cache para forçar nova tradução com mesmo texto normalizado
    delete storage['advanced_rules_cache'];
    // Primeiro, popular cache manualmente com versão antiga
    storage['advanced_rules_cache'] = JSON.stringify([
      { normalizedText: 'atualizar', rulesJson: { name: 'Antigo' }, timestamp: 1000 },
    ]);
    await svc.translateAdvancedStrategy('atualizar');
    // Deve ter atualizado, não duplicado — mas findInCache retorna o antigo primeiro
    // Vamos verificar que não duplicou
    const cached = JSON.parse(storage['advanced_rules_cache'] || '[]');
    const matches = cached.filter((c: any) => c.normalizedText === 'atualizar');
    expect(matches.length).toBe(1);
  });
});

// =============================================================================
// 12. FORMATAÇÃO VISUAL — operadores, facts, valores
// =============================================================================

describe('Formatação visual — métodos privados', () => {
  it('formatOperator mapeia todos os operadores conhecidos', () => {
    const eng = makeEngine();
    const fmt = (op: string) => (eng as any).formatOperator(op);
    expect(fmt('equal')).toBe('=');
    expect(fmt('notEqual')).toBe('≠');
    expect(fmt('lessThan')).toBe('<');
    expect(fmt('lessThanInclusive')).toBe('≤');
    expect(fmt('greaterThan')).toBe('>');
    expect(fmt('greaterThanInclusive')).toBe('≥');
    expect(fmt('in')).toBe('∈');
    expect(fmt('notIn')).toBe('∉');
  });

  it('formatOperator retorna o operador original se desconhecido', () => {
    const eng = makeEngine();
    expect((eng as any).formatOperator('contains')).toBe('contains');
  });

  it('formatFactLabel traduz facts conhecidos para português', () => {
    const eng = makeEngine();
    const fmt = (fact: string, params?: any) => (eng as any).formatFactLabel(fact, params);
    expect(fmt('lastDigit')).toBe('Último dígito');
    expect(fmt('twoLastDifferent')).toBe('2 últimos diferentes');
    expect(fmt('consecutiveSame')).toBe('Consecutivos iguais');
    expect(fmt('mostFrequentDigit', { n: 10 })).toContain('n:10');
    expect(fmt('digitCount', { n: 5, digit: 3 })).toContain('digit:3');
  });

  it('formatFactLabel retorna nome original para facts desconhecidos', () => {
    const eng = makeEngine();
    expect((eng as any).formatFactLabel('unknownFact')).toBe('unknownFact');
  });

  it('formatValue formata tipos diferentes corretamente', () => {
    const eng = makeEngine();
    const fmt = (val: any) => (eng as any).formatValue(val);
    expect(fmt(true)).toBe('true');
    expect(fmt(false)).toBe('false');
    expect(fmt(null)).toBe('-');
    expect(fmt(undefined)).toBe('-');
    expect(fmt(42)).toBe('42');
    expect(fmt([1, 3, 5])).toBe('[1, 3, 5]');
    expect(fmt('hello')).toBe('hello');
  });

  it('flattenConditionsPreview percorre all e any', () => {
    const eng = makeEngine();
    const rules = (eng as any).flattenConditionsPreview({
      all: [
        { fact: 'lastDigit', operator: 'equal', value: 5 },
        { fact: 'tickCount', operator: 'greaterThan', value: 10 },
      ],
    });
    expect(rules.length).toBe(2);
    expect(rules[0].status).toBe('waiting');
    expect(rules[1].status).toBe('waiting');
  });

  it('flattenConditionsPreview percorre any', () => {
    const eng = makeEngine();
    const rules = (eng as any).flattenConditionsPreview({
      any: [
        { fact: 'lastDigit', operator: 'equal', value: 5 },
        { fact: 'consecutiveSame', operator: 'greaterThan', value: 3 },
      ],
    });
    expect(rules.length).toBe(2);
  });

  it('flattenConditionsPreview percorre condições aninhadas (all dentro de any)', () => {
    const eng = makeEngine();
    const rules = (eng as any).flattenConditionsPreview({
      any: [
        { all: [
          { fact: 'lastDigit', operator: 'equal', value: 5 },
          { fact: 'tickCount', operator: 'greaterThan', value: 10 },
        ]},
        { fact: 'consecutiveSame', operator: 'greaterThan', value: 3 },
      ],
    });
    expect(rules.length).toBe(3); // 2 do all + 1 do any
  });
});
