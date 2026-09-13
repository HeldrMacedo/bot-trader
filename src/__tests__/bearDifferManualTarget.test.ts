import { describe, it, expect, beforeEach } from 'vitest';
import { createDifferEngine } from '../app/services/BearDifferEngine';

const cycle = (n: number) => Array.from({ length: n }, (_, i) => i % 10);

// Buffer com um dígito sobre-representado: motor e frequência longa convergem.
const saturated = (n: number, digit: number, every = 4) =>
  Array.from({ length: n }, (_, i) => (i % every === 0 ? digit : i % 10));

const SYMS = ['R_10', 'R_25', 'R_50', 'R_75', 'R_100', 'RDBEAR', 'RDBULL'];

describe('BearDiffer - alvo recomendado compartilhado por automático e manual', () => {
  let engine: ReturnType<typeof createDifferEngine>;

  // As lógicas só publicam palpite ao processar um tick; carregar histórico não
  // basta para que `liveP` exista.
  const seed = (sym: string, digits: number[]) => {
    engine.setHistory(sym, digits.slice(0, -1));
    engine.processTick(sym, digits[digits.length - 1]);
  };

  const onlyMarkets = (keep: string[]) =>
    SYMS.forEach((s) => {
      if (!keep.includes(s)) engine.setMarketEnabled(s, false);
    });

  beforeEach(() => {
    engine = createDifferEngine();
    engine.updateConfig({
      opMode: 'sim',
      autoSource: 'motor2',
      minTicks: 300,
      gateBias: false,
      cooldown: 0,
    });
  });

  describe('resolveTarget varrendo os mercados ligados', () => {
    it('em motor2 escolhe o mercado de maior score', () => {
      onlyMarkets(['R_10', 'R_25']);
      engine.setHistory('R_10', cycle(3000));
      // Saturação forte: score maior que o do ciclo uniforme.
      engine.setHistory('R_25', saturated(3000, 7, 3));

      const t = engine.resolveTarget();

      expect(t.reason).toBeNull();
      expect(t.sym).toBe('R_25');
      expect(t.logicId).toBe('motor2');
      expect(t.score).toBe(engine.analyze('R_25')!.best.score);
      expect(t.digit).toBe(engine.analyze('R_25')!.best.digit);
    });

    it('em logic escolhe o mercado de maior confiança na lógica resolvida', () => {
      engine.updateConfig({ autoSource: 'logic', onceLogic: 'flong', onceMinConf: 60 });
      onlyMarkets(['R_10', 'R_25']);
      // Saturação mais forte em R_25: confiança maior.
      seed('R_10', saturated(3000, 4, 8));
      seed('R_25', saturated(3000, 7, 3));

      const t = engine.resolveTarget();

      expect(t.reason).toBeNull();
      expect(t.sym).toBe('R_25');
      expect(t.digit).toBe(7);
      expect(t.logicId).toBe('flong');
      expect(t.conf).toBeGreaterThanOrEqual(60);
    });

    it('em both só considera mercados em que motor e lógica concordam', () => {
      engine.updateConfig({
        autoSource: 'both',
        onceLogic: 'rep',
        onceMinConf: 0,
        minScore: 0,
      });
      onlyMarkets(['R_10']);
      engine.setHistory('R_10', cycle(3000));

      // Anti-repetição aponta o último dígito, que o motor penaliza: discordam.
      engine.processTick('R_10', 3);
      const t = engine.resolveTarget();

      expect(t.reason).toMatch(/concord/i);
      // O mercado bloqueado vem identificado, para a tela dizer de onde é a causa.
      expect(t.sym).toBe('R_10');
    });

    it('explica o bloqueio do mercado que chegou mais longe no funil', () => {
      engine.updateConfig({ minScore: 999 });
      onlyMarkets(['R_10', 'R_25']);
      // R_10 tem amostra e é barrado pelo score; R_25 nem amostra tem.
      engine.setHistory('R_10', cycle(3000));
      engine.setHistory('R_25', cycle(50));

      const t = engine.resolveTarget();

      expect(t.reason).toMatch(/score/i);
      expect(t.reason).toMatch(/R_10/);
    });

    it('avalia um único mercado quando o símbolo é informado', () => {
      onlyMarkets(['R_10', 'R_25']);
      engine.setHistory('R_10', cycle(3000));
      engine.setHistory('R_25', saturated(3000, 7, 3));

      const t = engine.resolveTarget('R_10');

      expect(t.sym).toBe('R_10');
    });

    it('não considera mercado desligado', () => {
      onlyMarkets(['R_10']);
      engine.setHistory('R_10', cycle(3000));
      engine.setMarketEnabled('R_10', false);

      expect(engine.resolveTarget().reason).toMatch(/nenhum mercado ligado/i);
    });
  });

  describe('desempate no modo both', () => {
    it('prefere o maior score e usa a confiança só no empate', () => {
      engine.updateConfig({
        autoSource: 'both',
        onceLogic: 'flong',
        onceMinConf: 0,
        minScore: 0,
      });
      onlyMarkets(['R_10', 'R_25']);
      seed('R_10', saturated(3000, 4, 8));
      seed('R_25', saturated(3000, 7, 3));

      const a = engine.analyze('R_10')!;
      const b = engine.analyze('R_25')!;
      const t = engine.resolveTarget();
      expect(t.reason).toBeNull();
      const esperado = b.best.score > a.best.score ? 'R_25' : 'R_10';
      expect(t.sym).toBe(esperado);
    });
  });

  describe('manualTarget — as travas do clique do operador', () => {
    it('devolve o mesmo alvo do automático quando nada bloqueia', () => {
      onlyMarkets(['R_10']);
      engine.setHistory('R_10', saturated(3000, 7, 3));

      const m = engine.manualTarget();

      expect(m.reason).toBeNull();
      expect(m.sym).toBe('R_10');
      expect(m.digit).toBe(engine.resolveTarget().digit);
    });

    it('bloqueia quando uma trava de segurança está ativa, sem desligar o automático', () => {
      engine.updateConfig({
        autoOn: true,
        opMode: 'real',
        gateOps: 50,
        gateAcc: 91,
      });
      onlyMarkets(['R_10']);
      engine.setHistory('R_10', saturated(3000, 7, 3));

      const m = engine.manualTarget();

      expect(m.reason).toMatch(/modo real/i);
      expect(engine.getConfig().autoOn).toBe(true);
    });

    it('bloqueia enquanto existe operação em aberto', () => {
      onlyMarkets(['R_10']);
      engine.setHistory('R_10', saturated(3000, 7, 3));
      engine.setTradeLock(true);

      expect(engine.manualTarget().reason).toMatch(/aberto/i);
    });

    it('não é barrado pelo intervalo mínimo entre entradas', () => {
      engine.updateConfig({ cooldown: 60 });
      onlyMarkets(['R_10']);
      engine.setHistory('R_10', saturated(3000, 7, 3));

      engine.noteEntryFired('motor2');

      expect(engine.manualTarget().reason).toBeNull();
    });

    it('respeita a trava de viés e o filtro de exaustão', () => {
      onlyMarkets(['R_10']);
      engine.setHistory('R_10', saturated(3000, 7, 3));
      engine.updateConfig({ gateBias: true, labMin: 9000 });

      expect(engine.manualTarget().reason).toMatch(/trava de viés/i);
    });
  });

  describe('noteEntryFired', () => {
    it('passa a contar o intervalo mínimo do automático', () => {
      engine.updateConfig({ autoOn: true, cooldown: 60, minScore: 0 });
      onlyMarkets(['R_10']);
      engine.setHistory('R_10', saturated(3000, 7, 3));

      engine.noteEntryFired('motor2');
      const fired: number[] = [];
      engine.onAutoTrade((_s, d) => fired.push(d));
      engine.processTick('R_10', 1);

      expect(fired).toHaveLength(0);
      expect(engine.getState().autoIdleReason).toMatch(/intervalo/i);
    });

    it('avança o rodízio quando a entrada saiu por uma lógica', () => {
      engine.updateConfig({
        autoSource: 'logic',
        onceLogic: 'rotate',
        onceMinConf: 0,
        lgMinN: 1,
      });
      onlyMarkets(['R_10']);
      engine.setHistory('R_10', cycle(3000));
      for (let i = 0; i < 5; i++) engine.processTick('R_10', i % 10);

      const antes = engine.resolveTarget().logicId;
      engine.noteEntryFired(antes);
      const depois = engine.resolveTarget().logicId;

      expect(depois).not.toBe(antes);
    });

    it('não mexe no rodízio quando a entrada saiu pelo motor', () => {
      engine.updateConfig({
        autoSource: 'logic',
        onceLogic: 'rotate',
        onceMinConf: 0,
        lgMinN: 1,
      });
      onlyMarkets(['R_10']);
      engine.setHistory('R_10', cycle(3000));
      for (let i = 0; i < 5; i++) engine.processTick('R_10', i % 10);

      const antes = engine.resolveTarget().logicId;
      engine.noteEntryFired('motor2');

      expect(engine.resolveTarget().logicId).toBe(antes);
    });
  });
});
