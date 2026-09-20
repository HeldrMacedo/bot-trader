import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createDifferEngine } from '../app/services/BearDifferEngine';
import { LogicRankingRow } from '../app/services/beardiffer.types';

const linha = (lid: string, acc: number): LogicRankingRow => ({
  lid,
  name: lid,
  tag: 'teste',
  n: 300,
  acc,
  p: 0.001,
  ready: true,
  pass: true,
});

// Buffer com um dígito sobre-representado: motor e lógicas convergem e o alvo
// sai resolvido sem depender de sorte no gerador.
const saturated = (n: number, digit: number, every = 4) =>
  Array.from({ length: n }, (_, i) => (i % every === 0 ? digit : i % 10));

const SYMS = ['R_10', 'R_25', 'R_50', 'R_75', 'R_100', 'RDBEAR', 'RDBULL'];

describe('BearDiffer - trava de testes antes de operar', () => {
  let engine: ReturnType<typeof createDifferEngine>;

  // Uma operação completa: o preparo decide se é papel, a liquidação alimenta
  // a janela da lógica que gerou o alvo.
  const trade = (logicId: string, win: boolean) => {
    const prep = engine.prepareTrade('R_10', 3, logicId);
    engine.settleContract(
      win ? 0.35 : -0.35,
      !win,
      'R_10',
      3,
      win ? 7 : 3,
      undefined,
      logicId
    );
    return prep;
  };

  const runWindow = (logicId: string, results: boolean[]) =>
    results.map((w) => trade(logicId, w));

  beforeEach(() => {
    engine = createDifferEngine();
    engine.updateConfig({
      opMode: 'sim',
      gateEnabled: true,
      gateOps: 4,
      gateAcc: 60,
      autoSource: 'logic',
      onceLogic: 'flong',
      // As travas de risco têm vida própria e afogariam as asserções da janela.
      maxLoss: 99,
      minAcc: 0,
      cooldown: 0,
      gateBias: false,
      minTicks: 300,
    });
  });

  describe('checkbox desligado', () => {
    it('não exige amostra simulada para operar no real', () => {
      engine.updateConfig({ gateEnabled: false, opMode: 'real', gateOps: 50, gateAcc: 91 });

      expect(engine.checkGuards()).toBeNull();
      expect(engine.prepareTrade('R_10', 3, 'flong').isPaper).toBe(false);
    });

    it('mantém o modo simulado como escolha do operador', () => {
      engine.updateConfig({ gateEnabled: false, opMode: 'sim' });

      expect(engine.prepareTrade('R_10', 3, 'flong').isPaper).toBe(true);
    });
  });

  describe('janela de validação', () => {
    it('opera em papel enquanto a janela não fecha', () => {
      const preps = runWindow('flong', [true, true, true]);

      expect(preps.every((p) => p.isPaper)).toBe(true);
      expect(engine.getConfig().opMode).toBe('sim');
      expect(engine.getGateWindow('flong')).toEqual({ ops: 3, wins: 3, released: false });
    });

    it('libera o real quando a janela fecha no acerto exigido', () => {
      runWindow('flong', [true, true, false, true]);

      // 4 ops, 75% de acerto, mínimo de 60%.
      expect(engine.isLogicReleased('flong')).toBe(true);
      expect(engine.getConfig().opMode).toBe('real');
      expect(engine.prepareTrade('R_10', 3, 'flong').isPaper).toBe(false);
    });

    it('zera a janela e segue em papel quando o acerto fica abaixo', () => {
      runWindow('flong', [true, false, false, false]);

      expect(engine.isLogicReleased('flong')).toBe(false);
      expect(engine.getConfig().opMode).toBe('sim');
      expect(engine.getGateWindow('flong')).toEqual({ ops: 0, wins: 0, released: false });
    });

    it('conta só as operações em papel: a real não realimenta a janela', () => {
      runWindow('flong', [true, true, false, true]);
      trade('flong', false);

      expect(engine.getGateWindow('flong')).toEqual({ ops: 0, wins: 0, released: false });
    });

    it('anuncia a liberação no histórico', () => {
      runWindow('flong', [true, true, true, true]);

      const msg = engine.getState().logs.map((l) => l.msg).join(' | ');
      expect(msg).toMatch(/liberad/i);
    });
  });

  describe('janelas por lógica', () => {
    it('congela o progresso de uma lógica enquanto outra opera', () => {
      runWindow('flong', [true, true, true]);
      runWindow('fshort', [true, false]);

      expect(engine.getGateWindow('flong')).toEqual({ ops: 3, wins: 3, released: false });
      expect(engine.getGateWindow('fshort')).toEqual({ ops: 2, wins: 1, released: false });
    });

    it('retoma a janela congelada de onde parou', () => {
      runWindow('flong', [true, true, true]);
      runWindow('fshort', [true, false]);
      runWindow('flong', [true]);

      expect(engine.isLogicReleased('flong')).toBe(true);
      expect(engine.isLogicReleased('fshort')).toBe(false);
    });

    it('mantém em papel o alvo de lógica ainda não liberada', () => {
      runWindow('flong', [true, true, true, true]);

      expect(engine.prepareTrade('R_10', 3, 'flong').isPaper).toBe(false);
      expect(engine.prepareTrade('R_10', 3, 'fshort').isPaper).toBe(true);
    });

    it('trata o Motor 2.0 como uma lógica com janela própria', () => {
      engine.updateConfig({ autoSource: 'motor2' });

      runWindow('motor2', [true, true, true, true]);

      expect(engine.isLogicReleased('motor2')).toBe(true);
      expect(engine.prepareTrade('R_10', 3, 'motor2').isPaper).toBe(false);
    });
  });

  describe('uma entrada real por janela', () => {
    it('devolve a lógica ao teste depois de uma operação real', () => {
      runWindow('flong', [true, true, false, true]);
      expect(engine.isLogicReleased('flong')).toBe(true);

      trade('flong', true);

      expect(engine.isLogicReleased('flong')).toBe(false);
      expect(engine.getConfig().opMode).toBe('sim');
      expect(engine.prepareTrade('R_10', 3, 'flong').isPaper).toBe(true);
    });

    it('reinicia a janela do zero depois da entrada real', () => {
      runWindow('flong', [true, true, false, true]);
      trade('flong', true);

      expect(engine.getGateWindow('flong')).toEqual({ ops: 0, wins: 0, released: false });
    });

    it('consome a liberação tanto no ganho quanto na perda real', () => {
      runWindow('flong', [true, true, false, true]);
      trade('flong', false);

      expect(engine.isLogicReleased('flong')).toBe(false);
    });

    it('anuncia no histórico que a lógica voltou ao teste', () => {
      runWindow('flong', [true, true, false, true]);
      trade('flong', true);

      const msg = engine.getState().logs.map((l) => l.msg).join(' | ');
      expect(msg).toMatch(/volta ao teste/i);
    });

    it('não consome nada quando a trava exige zero operações', () => {
      engine.updateConfig({ gateOps: 0 });

      trade('flong', true);

      expect(engine.isLogicReleased('flong')).toBe(true);
    });

    it('deixa a outra lógica liberada intacta', () => {
      runWindow('flong', [true, true, false, true]);
      runWindow('fshort', [true, true, false, true]);
      expect(engine.isLogicReleased('fshort')).toBe(true);

      trade('flong', true);

      expect(engine.isLogicReleased('flong')).toBe(false);
      expect(engine.isLogicReleased('fshort')).toBe(true);
    });
  });

  describe('a liberação só termina com a entrada real', () => {
    it('segura a lógica liberada mesmo quando a liderança muda', () => {
      const ranking = vi.spyOn(engine, 'getLogicRanking');
      ranking.mockReturnValue([linha('flong', 0.95)]);
      engine.updateConfig({ onceLogic: 'top' });

      runWindow('flong', [true, true, false, true]);
      expect(engine.getConfig().opMode).toBe('real');

      // A líder por acerto medido muda sozinha, mas há uma ordem real
      // pendente de disparo: a liberação não pode evaporar sem ela.
      ranking.mockReturnValue([linha('fshort', 0.94)]);
      engine.noteEntryFired('flong');
      engine.syncGateMode();

      expect(engine.activeLogicId()).toBe('flong');
      expect(engine.getConfig().opMode).toBe('real');
      expect(engine.isLogicReleased('flong')).toBe(true);
    });

    it('devolve a liderança à lógica corrente depois de consumir a entrada real', () => {
      const ranking = vi.spyOn(engine, 'getLogicRanking');
      ranking.mockReturnValue([linha('flong', 0.95)]);
      engine.updateConfig({ onceLogic: 'top' });

      runWindow('flong', [true, true, false, true]);
      ranking.mockReturnValue([linha('fshort', 0.94)]);
      trade('flong', true);

      engine.noteEntryFired('flong');
      expect(engine.activeLogicId()).toBe('fshort');
      expect(engine.getConfig().opMode).toBe('sim');
    });

    it('não volta a disparar entradas simuladas enquanto a ordem real não sai', () => {
      engine.updateConfig({ autoOn: false, autoSource: 'motor2', minScore: 0 });
      runWindow('motor2', [true, true, false, true]);
      expect(engine.isLogicReleased('motor2')).toBe(true);

      const fired: string[] = [];
      engine.onAutoTrade((sym) => fired.push(sym));
      SYMS.forEach((s) => {
        engine.setHistory(s, saturated(3000, 7, 3).slice(0, -1));
        engine.processTick(s, 7);
      });

      expect(fired.length).toBe(0);
      expect(engine.getGateWindow('motor2')).toEqual({ ops: 0, wins: 0, released: true });
    });
  });

  describe('modo de operação acompanha a lógica ativa', () => {
    it('acompanha a troca de liderança enquanto nenhuma lógica está liberada', () => {
      const ranking = vi.spyOn(engine, 'getLogicRanking');
      ranking.mockReturnValue([linha('flong', 0.95)]);
      engine.updateConfig({ onceLogic: 'top' });

      // Janela parcial: sem liberação pendente, nada prende a escolha.
      runWindow('flong', [true, true]);
      expect(engine.activeLogicId()).toBe('flong');

      ranking.mockReturnValue([linha('fshort', 0.94)]);
      engine.noteEntryFired('flong');
      engine.syncGateMode();

      expect(engine.activeLogicId()).toBe('fshort');
      expect(engine.getConfig().opMode).toBe('sim');
      // O progresso de flong fica guardado para quando ela voltar a liderar.
      expect(engine.getGateWindow('flong')).toEqual({ ops: 2, wins: 2, released: false });
    });

    it('resolve a lógica ativa pela fonte do sinal', () => {
      engine.updateConfig({ autoSource: 'motor2' });
      expect(engine.activeLogicId()).toBe('motor2');

      engine.updateConfig({ autoSource: 'logic', onceLogic: 'flong' });
      expect(engine.activeLogicId()).toBe('flong');
    });
  });

  describe('valores degenerados', () => {
    it('libera na hora com gateOps zero', () => {
      engine.updateConfig({ gateOps: 0, gateAcc: 91 });

      expect(engine.isLogicReleased('flong')).toBe(true);
      expect(engine.prepareTrade('R_10', 3, 'flong').isPaper).toBe(false);
    });

    it('libera ao completar as ops quando o acerto exigido é zero', () => {
      engine.updateConfig({ gateOps: 2, gateAcc: 0 });

      runWindow('flong', [false, false]);

      expect(engine.isLogicReleased('flong')).toBe(true);
    });
  });

  describe('o que zera as janelas', () => {
    it('trocar a fonte do sinal zera progresso e liberações', () => {
      runWindow('flong', [true, true, true, true]);

      engine.updateConfig({ autoSource: 'motor2' });

      expect(engine.isLogicReleased('flong')).toBe(false);
      expect(engine.getGateWindow('flong')).toEqual({ ops: 0, wins: 0, released: false });
      expect(engine.getConfig().opMode).toBe('sim');
    });

    it('trocar a lógica escolhida zera progresso e liberações', () => {
      runWindow('flong', [true, true, true]);

      engine.updateConfig({ onceLogic: 'top' });

      expect(engine.getGateWindow('flong')).toEqual({ ops: 0, wins: 0, released: false });
    });

    it('desmarcar o checkbox zera as janelas sem mexer no modo de operação', () => {
      runWindow('flong', [true, true, true, true]);
      expect(engine.getConfig().opMode).toBe('real');

      engine.updateConfig({ gateEnabled: false });

      expect(engine.getGateWindow('flong')).toEqual({ ops: 0, wins: 0, released: false });
      expect(engine.getConfig().opMode).toBe('real');
    });

    it('parar o bot zera as janelas', () => {
      runWindow('flong', [true, true, true]);

      engine.resetSession();

      expect(engine.getGateWindow('flong')).toEqual({ ops: 0, wins: 0, released: false });
    });

    it('mexer só nos números da trava preserva a janela em andamento', () => {
      runWindow('flong', [true, true]);

      engine.updateConfig({ gateAcc: 55 });

      expect(engine.getGateWindow('flong')).toEqual({ ops: 2, wins: 2, released: false });
    });
  });

  describe('martingale e stops no simulado', () => {
    it('não avança o martingale em operação simulada', () => {
      engine.updateConfig({ mgMode: 'normal', mgFactor: 2.2, mgMax: 3, stake: 1 });

      runWindow('flong', [false, false]);

      expect(engine.getState().mgLevel).toBe(0);
      expect(engine.getState().curStake).toBe(1);
    });

    it('começa a operação real com o martingale zerado', () => {
      engine.updateConfig({ mgMode: 'normal', stake: 1 });

      runWindow('flong', [true, false, true, true]);

      expect(engine.isLogicReleased('flong')).toBe(true);
      expect(engine.getState().mgLevel).toBe(0);
      expect(engine.getState().curStake).toBe(1);
    });

    it('avança o martingale quando a operação é real', () => {
      engine.updateConfig({ mgMode: 'normal', mgFactor: 2, mgMax: 3, stake: 1, gateOps: 0 });

      trade('flong', false);

      expect(engine.getState().mgLevel).toBe(1);
      expect(engine.getState().curStake).toBe(2);
    });

    it('não dispara stop loss com prejuízo simulado', () => {
      engine.updateConfig({ stopLoss: 0.5, stopWin: 0.5, gateOps: 100 });

      runWindow('flong', [false, false, false]);

      expect(engine.getState().stopped).toBe(false);
      expect(engine.checkGuards()).toBeNull();
    });

    it('dispara stop win com lucro real', () => {
      engine.updateConfig({ stopLoss: 0.5, stopWin: 0.3, gateOps: 0 });

      trade('flong', true);

      expect(engine.getState().stopped).toBe(true);
      expect(engine.getState().stoppedReason).toMatch(/stop win/i);
    });
  });

  describe('travas de risco durante o teste em papel', () => {
    beforeEach(() => {
      // Os padrões do robô: é com eles que a trava congelava.
      engine.updateConfig({ maxLoss: 4, minAcc: 80, gateOps: 50, gateAcc: 91 });
    });

    it('não bloqueia o robô com perdas consecutivas de papel', () => {
      runWindow('flong', [false, false, false, false, false]);

      expect(engine.checkGuards()).toBeNull();
    });

    it('não bloqueia o robô com acerto de papel abaixo do mínimo', () => {
      const results = Array.from({ length: 24 }, (_, i) => i % 4 === 0);
      runWindow('flong', results);

      expect(engine.checkGuards()).toBeNull();
    });

    it('segue disparando as entradas de papel depois de uma sequência ruim', () => {
      engine.updateConfig({ autoOn: false, autoSource: 'motor2', minScore: 0 });
      runWindow('motor2', [false, false, false, false, false]);

      const fired: string[] = [];
      engine.onAutoTrade((sym) => fired.push(sym));
      SYMS.forEach((s) => {
        engine.setHistory(s, saturated(3000, 7, 3).slice(0, -1));
        engine.processTick(s, 7);
      });

      expect(fired.length).toBeGreaterThan(0);
    });

    it('continua travando o robô por perdas consecutivas na conta real', () => {
      engine.updateConfig({ gateOps: 0 });

      for (let i = 0; i < 4; i++) trade('flong', false);

      expect(engine.checkGuards()).toMatch(/perdas consecutivas/i);
    });
  });

  describe('martingale atravessa o intervalo de papel', () => {
    beforeEach(() => {
      engine.updateConfig({
        mgMode: 'normal',
        mgFactor: 2,
        mgMax: 3,
        stake: 1,
        gateOps: 2,
        gateAcc: 0,
        stopLoss: 0,
        stopWin: 0,
      });
    });

    it('guarda o nível do martingale enquanto a lógica volta a medir', () => {
      runWindow('flong', [true, true]);
      trade('flong', false);
      expect(engine.getState().mgLevel).toBe(1);

      runWindow('flong', [true, true]);

      expect(engine.getState().mgLevel).toBe(1);
      expect(engine.getState().curStake).toBe(2);
    });

    it('entra na real seguinte com a stake do martingale pendente', () => {
      runWindow('flong', [true, true]);
      trade('flong', false);
      runWindow('flong', [true, true]);

      expect(engine.prepareTrade('R_10', 3, 'flong')).toMatchObject({
        isPaper: false,
        stake: 2,
      });
    });

    it('mantém a stake de papel na base mesmo com martingale pendente', () => {
      runWindow('flong', [true, true]);
      trade('flong', false);

      expect(engine.prepareTrade('R_10', 3, 'fshort')).toMatchObject({
        isPaper: true,
        stake: 1,
      });
    });

    it('zera o martingale quando a operação real ganha', () => {
      runWindow('flong', [true, true]);
      trade('flong', false);
      runWindow('flong', [true, true]);
      trade('flong', true);

      expect(engine.getState().mgLevel).toBe(0);
      expect(engine.getState().curStake).toBe(1);
    });
  });

  describe('motivo mostrado na tela', () => {
    it('descreve o progresso enquanto a janela não fecha', () => {
      runWindow('flong', [true, false, true]);

      const reason = engine.gateBlockReason('flong');
      expect(reason).toMatch(/3\/4/);
      expect(reason).toMatch(/66/);
      expect(reason).toMatch(/60/);
    });

    it('não devolve motivo para lógica liberada', () => {
      runWindow('flong', [true, true, true, true]);

      expect(engine.gateBlockReason('flong')).toBeNull();
    });

    it('não devolve motivo com o checkbox desligado', () => {
      engine.updateConfig({ gateEnabled: false });

      expect(engine.gateBlockReason('flong')).toBeNull();
    });

    describe('alvo manual', () => {
      const seedOne = () => {
        engine.updateConfig({ autoSource: 'motor2', minScore: 0 });
        SYMS.forEach((s) => engine.setMarketEnabled(s, s === 'R_10'));
        engine.setHistory('R_10', saturated(3000, 7, 3).slice(0, -1));
        engine.processTick('R_10', 7);
      };

      it('trava o clique enquanto a janela da lógica não fecha', () => {
        seedOne();

        const alvo = engine.manualTarget();

        expect(alvo.reason).toMatch(/trava de testes/i);
        expect(alvo.key).toBe('gate');
      });

      it('libera o clique depois que a lógica passa', () => {
        seedOne();
        runWindow('motor2', [true, true, true, true]);

        expect(engine.manualTarget().reason).toBeNull();
      });

      it('trava o clique de novo depois de uma entrada real', () => {
        seedOne();
        runWindow('motor2', [true, true, true, true]);
        trade('motor2', true);

        expect(engine.manualTarget().reason).toMatch(/trava de testes/i);
      });
    });
  });

  describe('entradas simuladas automáticas no modo manual', () => {
    const seedAll = () =>
      SYMS.forEach((s) => {
        engine.setHistory(s, saturated(3000, 7, 3).slice(0, -1));
        engine.processTick(s, 7);
      });

    it('dispara sozinho para preencher a janela mesmo com o automático desligado', () => {
      engine.updateConfig({
        autoOn: false,
        autoSource: 'motor2',
        minScore: 0,
        gateOps: 4,
      });
      const fired: string[] = [];
      engine.onAutoTrade((sym) => fired.push(sym));

      seedAll();

      expect(fired.length).toBeGreaterThan(0);
    });

    it('para de disparar sozinho depois que a lógica é liberada', () => {
      engine.updateConfig({
        autoOn: false,
        autoSource: 'motor2',
        minScore: 0,
        gateOps: 0,
      });
      const fired: string[] = [];
      engine.onAutoTrade((sym) => fired.push(sym));

      seedAll();

      expect(fired.length).toBe(0);
    });

    it('não dispara sozinho com o checkbox desligado', () => {
      engine.updateConfig({
        gateEnabled: false,
        autoOn: false,
        autoSource: 'motor2',
        minScore: 0,
      });
      const fired: string[] = [];
      engine.onAutoTrade((sym) => fired.push(sym));

      seedAll();

      expect(fired.length).toBe(0);
    });
  });
});
