import { describe, it, expect, beforeEach } from 'vitest';
import { createDifferEngine } from '../app/services/BearDifferEngine';

// Gerador pseudoaleatório determinístico: precisa parecer honesto à bateria de
// aleatoriedade, então não pode ser periódico.
const honest = (n: number, seed = 123456789) => {
  let s = seed;
  return Array.from({ length: n }, () => {
    s = (1103515245 * s + 12345) % 2147483648;
    return Math.floor((s / 2147483648) * 10);
  });
};

const SYMS = ['R_10', 'R_25', 'R_50', 'R_75', 'R_100', 'RDBEAR', 'RDBULL'];

describe('BearDiffer - trava dura desliga o automático como no legado', () => {
  let engine: ReturnType<typeof createDifferEngine>;

  const seedAll = () =>
    SYMS.forEach((s, i) => engine.setHistory(s, honest(3000, 987654321 + i * 7717)));

  beforeEach(() => {
    engine = createDifferEngine();
  });

  it('não repete a mesma causa global uma vez por mercado', () => {
    // A trava do modo real é do robô inteiro, não de um mercado. Sete mercados
    // ticando não podem virar sete linhas idênticas no histórico.
    engine.updateConfig({
      autoOn: true,
      opMode: 'real',
      gateOps: 50,
      minScore: 0,
      minTicks: 100,
      gateBias: false,
    });
    seedAll();

    SYMS.forEach((s) => engine.processTick(s, 3));

    const hits = engine.getState().logs.filter((l) => /modo real/i.test(l.msg));
    expect(hits.length).toBe(1);
  });

  it('desliga o automático quando uma trava de segurança bloqueia', () => {
    engine.updateConfig({
      autoOn: true,
      opMode: 'real',
      gateOps: 50,
      minScore: 0,
      minTicks: 100,
      gateBias: false,
    });
    seedAll();

    engine.processTick('R_10', 3);

    // O legado faz `S.auto=false` em qualquer guard e avisa uma vez só.
    expect(engine.getConfig().autoOn).toBe(false);
    expect(engine.getState().autoIdleReason).toMatch(/modo real/i);
  });

  it('mantém o motivo na tela depois de desligar o automático', () => {
    engine.updateConfig({
      autoOn: true,
      opMode: 'real',
      gateOps: 50,
      minScore: 0,
      minTicks: 100,
      gateBias: false,
    });
    seedAll();

    engine.processTick('R_10', 3);
    // Ticks seguintes não podem apagar a explicação de por que parou.
    engine.processTick('R_25', 5);
    engine.processTick('R_50', 1);

    expect(engine.getState().autoIdleReason).toMatch(/modo real/i);
  });

  it('limpa o motivo quando o operador religa o automático', () => {
    engine.updateConfig({
      autoOn: true,
      opMode: 'real',
      gateOps: 50,
      minScore: 0,
      minTicks: 100,
      gateBias: false,
    });
    seedAll();
    engine.processTick('R_10', 3);
    expect(engine.getConfig().autoOn).toBe(false);

    engine.updateConfig({ autoOn: true });
    expect(engine.getState().autoIdleReason).toBeNull();
  });

  it('a trava de viés não desliga o automático, mas ensina a saída', () => {
    // Viés é condição de mercado, não falha do robô: o legado só filtra o
    // mercado e segue tentando nos outros.
    engine.updateConfig({
      autoOn: true,
      opMode: 'sim',
      gateBias: true,
      labMin: 200,
      minScore: 0,
      minTicks: 100,
    });
    seedAll();

    engine.processTick('R_10', 3);

    expect(engine.getConfig().autoOn).toBe(true);
    const msg = engine.getState().autoIdleReason || '';
    expect(msg).toMatch(/trava de viés/i);
    expect(msg).toMatch(/desligue a trava/i);
  });
});
