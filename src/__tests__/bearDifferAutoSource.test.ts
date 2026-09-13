import { describe, it, expect, beforeEach } from 'vitest';
import { createDifferEngine } from '../app/services/BearDifferEngine';
import { DEFAULT_DIFFER_CONFIG } from '../app/services/beardiffer.types';

// Ciclo perfeito 0..9: nenhuma repetição imediata, então a lógica de
// anti-repetição fica com confiança máxima e o palpite dela é sempre o último
// dígito que entrou no buffer.
const cycle = (n: number) => Array.from({ length: n }, (_, i) => i % 10);

// Buffer com o dígito 7 sobre-representado: o motor 2.0 e a lógica de
// frequência longa convergem para o mesmo alvo, que é o caso que o modo de
// confirmação dupla precisa aprovar.
const saturated = (n: number, digit = 7) =>
  Array.from({ length: n }, (_, i) => (i % 4 === 0 ? digit : i % 10));

type Fired = { sym: string; digit: number; logicId?: string };

describe('BearDiffer - fonte do sinal do modo automático', () => {
  let engine: ReturnType<typeof createDifferEngine>;
  let fired: Fired[];

  const capture = () => {
    engine.onAutoTrade((sym, digit, logicId) => {
      fired.push({ sym, digit, logicId });
    });
  };

  beforeEach(() => {
    engine = createDifferEngine();
    fired = [];
    capture();
  });

  it('nasce em motor2 para não mudar o comportamento de quem já opera', () => {
    expect(DEFAULT_DIFFER_CONFIG.autoSource).toBe('motor2');
  });

  it('em motor2 dispara no dígito do motor e atribui a entrada a ele', () => {
    engine.updateConfig({
      autoOn: true,
      autoSource: 'motor2',
      opMode: 'sim',
      minScore: 0,
      minTicks: 300,
      gateBias: false,
      cooldown: 0,
    });
    engine.setHistory('R_10', cycle(3000));

    engine.processTick('R_10', 3);

    const motorDigit = engine.analyze('R_10')!.best.digit;
    expect(fired).toHaveLength(1);
    expect(fired[0].digit).toBe(motorDigit);
    expect(fired[0].logicId).toBe('motor2');
  });

  it('em logic dispara no dígito da lógica escolhida, não no do motor', () => {
    engine.updateConfig({
      autoOn: true,
      autoSource: 'logic',
      onceLogic: 'rep',
      onceMinConf: 70,
      opMode: 'sim',
      minTicks: 300,
      gateBias: false,
      cooldown: 0,
    });
    engine.setHistory('R_10', cycle(3000));

    engine.processTick('R_10', 3);

    const motorDigit = engine.analyze('R_10')!.best.digit;
    expect(fired).toHaveLength(1);
    // Anti-repetição sempre aponta o último dígito recebido; o motor penaliza
    // justamente esse dígito, então os dois nunca coincidem aqui.
    expect(fired[0].digit).toBe(3);
    expect(fired[0].digit).not.toBe(motorDigit);
    expect(fired[0].logicId).toBe('rep');
  });

  it('em logic o score do motor deixa de barrar a entrada', () => {
    // minScore impossível: se o gate do motor ainda valesse, nada entraria.
    engine.updateConfig({
      autoOn: true,
      autoSource: 'logic',
      onceLogic: 'rep',
      onceMinConf: 70,
      minScore: 999,
      opMode: 'sim',
      minTicks: 300,
      gateBias: false,
      cooldown: 0,
    });
    engine.setHistory('R_10', cycle(3000));

    engine.processTick('R_10', 3);

    expect(fired).toHaveLength(1);
    expect(fired[0].digit).toBe(3);
  });

  it('em logic segura a entrada quando a confiança fica abaixo do mínimo', () => {
    engine.updateConfig({
      autoOn: true,
      autoSource: 'logic',
      onceLogic: 'rep',
      onceMinConf: 100,
      opMode: 'sim',
      minTicks: 300,
      gateBias: false,
      cooldown: 0,
    });
    // Repetição na taxa teórica: a lógica fica sem confiança para pedir entrada.
    engine.setHistory('R_10', cycle(1500).concat(Array(1500).fill(4)));

    engine.processTick('R_10', 4);

    expect(fired).toHaveLength(0);
    expect(engine.getState().autoIdleReason).toMatch(/confian/i);
  });

  it('em logic explica quando nenhuma lógica foi aprovada no ranking', () => {
    engine.updateConfig({
      autoOn: true,
      autoSource: 'logic',
      onceLogic: 'auto',
      opMode: 'sim',
      minTicks: 300,
      gateBias: false,
      cooldown: 0,
    });
    engine.setHistory('R_10', cycle(3000));

    engine.processTick('R_10', 3);

    expect(fired).toHaveLength(0);
    expect(engine.getState().autoIdleReason).toMatch(/lógica/i);
  });

  it('em both exige que motor e lógica apontem o mesmo dígito', () => {
    engine.updateConfig({
      autoOn: true,
      autoSource: 'both',
      onceLogic: 'rep',
      onceMinConf: 70,
      minScore: 0,
      opMode: 'sim',
      minTicks: 300,
      gateBias: false,
      cooldown: 0,
    });
    engine.setHistory('R_10', cycle(3000));

    engine.processTick('R_10', 3);

    expect(fired).toHaveLength(0);
    expect(engine.getState().autoIdleReason).toMatch(/concord/i);
  });

  it('em both dispara quando as duas fontes concordam', () => {
    engine.updateConfig({
      autoOn: true,
      autoSource: 'both',
      onceLogic: 'flong',
      onceMinConf: 70,
      minScore: 0,
      opMode: 'sim',
      minTicks: 300,
      gateBias: false,
      cooldown: 0,
    });
    engine.setHistory('R_10', saturated(3000, 7));

    engine.processTick('R_10', 3);

    const motorDigit = engine.analyze('R_10')!.best.digit;
    expect(motorDigit).toBe(7);
    expect(fired).toHaveLength(1);
    expect(fired[0].digit).toBe(7);
    expect(fired[0].logicId).toBe('flong');
  });

  it('a trava de viés continua valendo em logic', () => {
    engine.updateConfig({
      autoOn: true,
      autoSource: 'logic',
      onceLogic: 'rep',
      onceMinConf: 70,
      opMode: 'sim',
      minTicks: 300,
      gateBias: true,
      // Amostra exigida acima do que o mercado tem: a bateria nem roda.
      labMin: 9000,
      cooldown: 0,
    });
    engine.setHistory('R_10', cycle(3000));

    engine.processTick('R_10', 3);

    expect(fired).toHaveLength(0);
    expect(engine.getState().autoIdleReason).toMatch(/trava de viés/i);
  });

  it('o filtro de exaustão julga o dígito da lógica, não o do motor', () => {
    engine.updateConfig({
      autoOn: true,
      autoSource: 'logic',
      onceLogic: 'rep',
      onceMinConf: 70,
      opMode: 'sim',
      minTicks: 300,
      gateBias: false,
      exFilter: true,
      cooldown: 0,
    });
    engine.setHistory('R_10', cycle(3000));

    engine.processTick('R_10', 3);

    expect(fired).toHaveLength(0);
    const reason = engine.getState().autoIdleReason || '';
    expect(reason).toMatch(/exaust/i);
    // O dígito citado é o da lógica (3), não o que o motor teria escolhido.
    expect(reason).toMatch(/dígito 3/);
  });

  it('o rodízio não troca de lógica enquanto nenhuma entrada sai', () => {
    engine.updateConfig({
      autoOn: true,
      autoSource: 'logic',
      onceLogic: 'rotate',
      // Confiança inalcançável: nada entra, então a escolha não pode mudar.
      onceMinConf: 101,
      lgMinN: 1,
      opMode: 'sim',
      minTicks: 300,
      gateBias: false,
      cooldown: 0,
    });
    engine.setHistory('R_10', cycle(3000));

    const nomes = new Set<string>();
    for (let i = 0; i < 20; i++) {
      engine.processTick('R_10', i % 10);
      const m = /em (.+?) \(R_10\)/.exec(engine.getState().autoIdleReason || '');
      if (m) nomes.add(m[1]);
    }

    expect(fired).toHaveLength(0);
    expect(nomes.size).toBe(1);
  });

  it('o rodízio avança depois de cada entrada', () => {
    engine.updateConfig({
      autoOn: true,
      autoSource: 'logic',
      onceLogic: 'rotate',
      onceMinConf: 0,
      lgMinN: 1,
      opMode: 'sim',
      minTicks: 300,
      gateBias: false,
      cooldown: 0,
    });
    engine.setHistory('R_10', cycle(3000));

    for (let i = 0; i < 20; i++) engine.processTick('R_10', i % 10);

    expect(fired.length).toBeGreaterThan(1);
    expect(new Set(fired.map((f) => f.logicId)).size).toBeGreaterThan(1);
  });
});
