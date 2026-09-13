import { describe, it, expect, beforeEach } from 'vitest';
import { createDifferEngine, BIAS_MIN_SAMPLE } from '../app/services/BearDifferEngine';

// Gerador pseudoaleatório determinístico: precisa parecer honesto à bateria,
// então não pode ser periódico como (i * 7 + 3) % 10, que tem Markov p = 0.
const honest = (n: number) => {
  let s = 123456789;
  return Array.from({ length: n }, () => {
    s = (1103515245 * s + 12345) % 2147483648;
    return Math.floor((s / 2147483648) * 10);
  });
};

describe('BearDiffer - trava de viés diz a verdade sobre o que exige', () => {
  let engine: ReturnType<typeof createDifferEngine>;

  beforeEach(() => {
    engine = createDifferEngine();
  });

  it('expõe o piso estatístico real quando labMin é menor que ele', () => {
    engine.updateConfig({ labMin: 25 });
    engine.setHistory('R_10', honest(150));

    const v = engine.biasVerdict('R_10');

    // Pedir 25 não faz a bateria rodar com 25: os testes χ² de 81 graus de
    // liberdade não têm célula esperada suficiente abaixo do piso.
    expect(v.need).toBe(BIAS_MIN_SAMPLE);
    expect(v.n).toBe(150);
    expect(v.p).toBeNull();
    expect(v.proven).toBe(false);
  });

  it('respeita labMin quando ele é mais exigente que o piso', () => {
    engine.updateConfig({ labMin: 4000 });
    engine.setHistory('R_10', honest(3000));

    const v = engine.biasVerdict('R_10');
    expect(v.need).toBe(4000);
    expect(v.proven).toBe(false);
  });

  it('devolve o p corrigido observado quando há amostra', () => {
    engine.updateConfig({ labMin: 25 });
    engine.setHistory('R_10', honest(3000));

    const v = engine.biasVerdict('R_10');
    expect(v.p).not.toBeNull();
    expect(v.p!).toBeGreaterThan(0);
  });

  it('o motivo do automático mostra o p observado, não uma contagem de ticks a esperar', () => {
    engine.updateConfig({
      labMin: 25,
      labAlpha: 0.01,
      gateBias: true,
      autoOn: true,
      autoSource: 'motor2',
      minScore: 0,
      minTicks: 100,
      opMode: 'sim',
    });
    // Gerador honesto: nenhum mercado será dado como enviesado, nunca.
    engine.setHistory('R_10', honest(3000));
    engine.processTick('R_10', 4);

    const reason = engine.getState().autoIdleReason || '';
    expect(reason).toMatch(/trava de viés/i);
    // Não pode prometer 25 quando o piso é 200.
    expect(reason).not.toMatch(/25 ticks/);
    expect(reason).toMatch(/p corrigido/i);
  });

  it('não repete o mesmo motivo a cada tick só porque o número dentro dele mudou', () => {
    engine.updateConfig({
      autoOn: true,
      autoSource: 'motor2',
      gateBias: false,
      minScore: 99,
      minTicks: 50,
      opMode: 'sim',
    });
    engine.setHistory('R_10', honest(3000));

    for (let i = 0; i < 6; i++) engine.processTick('R_10', i % 10);

    const hits = engine.getState().logs.filter((l) => /score/i.test(l.msg));
    expect(hits.length).toBe(1);
  });

  it('não confunde a causa de um mercado com a do mercado que ticou antes', () => {
    const syms = ['R_10', 'R_25', 'R_50', 'R_75', 'R_100', 'RDBEAR', 'RDBULL'];
    engine.updateConfig({
      autoOn: true,
      autoSource: 'motor2',
      gateBias: false,
      minScore: 99,
      minTicks: 50,
      opMode: 'sim',
    });
    syms.forEach((s, i) => engine.setHistory(s, honest(3000 + i)));

    // Sete mercados ticando intercalados, como na sessão real.
    for (let round = 0; round < 5; round++) {
      syms.forEach((s, i) => engine.processTick(s, (round + i) % 10));
    }

    const hits = engine.getState().logs.filter((l) => /score/i.test(l.msg));
    // Uma linha por mercado, não uma por tick.
    expect(hits.length).toBe(syms.length);
  });
});
