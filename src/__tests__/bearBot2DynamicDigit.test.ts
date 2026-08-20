import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createEngine } from '../app/services/BearBot2Engine';

describe('BearBot2Engine - Dígito Dinâmico no Modo Differ (Score Composto)', () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  describe('1. Configuração e Defaults', () => {
    it('inicializa differDynamicDigit como false por padrão', () => {
      const engine = createEngine();
      const config = engine.getConfig();
      expect(config.differDynamicDigit).toBe(false);
    });

    it('permite atualizar differDynamicDigit via updateConfig', () => {
      const engine = createEngine();
      engine.updateConfig({
        mode: 'differ',
        differDynamicDigit: true,
      });

      const config = engine.getConfig();
      expect(config.mode).toBe('differ');
      expect(config.differDynamicDigit).toBe(true);
    });
  });

  describe('2. Algoritmo de Score Composto (computeDynamicDifferDigit)', () => {
    it('retorna o dígito mais frio (ausente) com maior score de segurança', () => {
      const engine = createEngine({
        activeSym: 'R_100',
        mode: 'differ',
        differDynamicDigit: true,
      });

      // Alimenta com 50 ticks contendo apenas dígitos de 0 a 8 (o dígito 9 NUNCA apareceu)
      const stream = [
        0, 1, 2, 3, 4, 5, 6, 7, 8, 0,
        1, 2, 3, 4, 5, 6, 7, 8, 0, 1,
        2, 3, 4, 5, 6, 7, 8, 0, 1, 2,
        3, 4, 5, 6, 7, 8, 0, 1, 2, 3,
        4, 5, 6, 7, 8, 0, 1, 2, 3, 4
      ];

      for (const d of stream) {
        engine.processTick('R_100', 100 + d, d);
      }

      const result = engine.computeDynamicDifferDigit('R_100');
      expect(result.digit).toBe(9);
      expect(result.score).toBeGreaterThan(80);
      expect(result.scores[9]).toBeGreaterThan(result.scores[0]);
      expect(result.breakdown).toBeDefined();
      expect(result.breakdown[9].fScore).toBe(100);
      expect(result.breakdown[9].rawCount50).toBe(0);
      expect(result.breakdown[9].composite).toBe(result.score);
    });

    it('penaliza transição de Markov quando um dígito costuma vir após o último dígito', () => {
      const engine = createEngine({
        activeSym: 'R_100',
        mode: 'differ',
        differDynamicDigit: true,
      });

      // Padrão repetido: sempre que sai 7, o próximo é 3.
      // E o último tick enviado é 7.
      const ticks = [
        1, 7, 3, 2, 7, 3, 4, 7, 3, 5,
        6, 7, 3, 8, 7, 3, 0, 7, 3, 1,
        2, 7, 3, 4, 7, 3, 5, 7, 3, 6,
        7
      ];

      for (const d of ticks) {
        engine.processTick('R_100', 100 + d, d);
      }

      const result = engine.computeDynamicDifferDigit('R_100');
      // Como o último dígito é 7 e 7->3 é forte, 3 deve ter score menor de segurança do que outros dígitos frios
      expect(result.scores[3]).toBeLessThan(result.scores[9]);
      expect(result.digit).not.toBe(3);
    });

    it('resolve empates de forma determinística e segura', () => {
      const engine = createEngine({
        activeSym: 'R_100',
        mode: 'differ',
        differDynamicDigit: true,
      });

      // Ticks vazios ou iniciais
      const result = engine.computeDynamicDifferDigit('R_100');
      expect(result.digit).toBeGreaterThanOrEqual(0);
      expect(result.digit).toBeLessThanOrEqual(9);
      expect(result.score).toBeGreaterThanOrEqual(0);
    });
  });

  describe('3. Execução em Mercado Único (Single Market)', () => {
    it('no modo auto, define dinamicamente o dígito alvo e dispara trade', () => {
      const engine = createEngine({
        activeSym: 'R_100',
        mode: 'differ',
        exec: 'auto',
        autoOn: true,
        differDynamicDigit: true,
        tradeCooldownMs: 0,
        aiMode: 'balanced',
      });

      let tradeDispatched = false;
      let targetDigitUsed = -1;

      engine.onAutoTrade((kind) => {
        tradeDispatched = true;
        targetDigitUsed = engine.getConfig().digit;
      });

      // Alimenta 40 ticks sem o dígito 4
      const ticks = [
        0, 1, 2, 3, 5, 6, 7, 8, 9, 0,
        1, 2, 3, 5, 6, 7, 8, 9, 0, 1,
        2, 3, 5, 6, 7, 8, 9, 0, 1, 2,
        3, 5, 6, 7, 8, 9, 0, 1, 2, 3
      ];

      for (const d of ticks) {
        engine.processTick('R_100', 100 + d, d);
      }

      expect(tradeDispatched).toBe(true);
      expect(targetDigitUsed).toBe(4);
    });

    it('no modo manual, atualiza config.digit para o dígito dinâmico e executa prepareTrade com a barreira correta', () => {
      const engine = createEngine({
        activeSym: 'R_100',
        mode: 'differ',
        exec: 'manual',
        autoOn: false,
        differDynamicDigit: true,
        tradeCooldownMs: 0,
      });

      // Alimenta ticks sem o dígito 6
      const ticks = [
        0, 1, 2, 3, 4, 5, 7, 8, 9, 0,
        1, 2, 3, 4, 5, 7, 8, 9, 0, 1,
        2, 3, 4, 5, 7, 8, 9, 0, 1, 2,
        3, 4, 5, 7, 8, 9, 0, 1, 2, 3
      ];

      for (const d of ticks) {
        engine.processTick('R_100', 100 + d, d);
      }

      expect(engine.getConfig().digit).toBe(6);

      const prep = engine.prepareTrade('differ');
      expect(prep).not.toBeNull();
      expect(prep?.payload).toBeDefined();
      const params = (prep?.payload as any)?.parameters;
      expect(params?.contract_type).toBe('DIGITDIFF');
      expect(params?.barrier).toBe('6');
    });
  });

  describe('4. Execução em Multi-Mercado (multiOn: true)', () => {
    it('avalia dígitos dinâmicos por mercado e dispara no melhor mercado com seu respectivo dígito', () => {
      const engine = createEngine({
        activeSym: 'R_100',
        mode: 'differ',
        exec: 'auto',
        autoOn: true,
        multiOn: true,
        differDynamicDigit: true,
        tradeCooldownMs: 0,
        aiMode: 'balanced',
      });

      let firedSym = '';
      let firedDigit = -1;

      engine.onAutoTrade(() => {
        firedSym = engine.getConfig().activeSym;
        firedDigit = engine.getConfig().digit;
      });

      // Alimenta R_100 com ticks variados (sem dígito 2)
      for (let i = 0; i < 30; i++) {
        const d = (i % 9 === 2) ? 0 : (i % 9);
        engine.processTick('R_100', 100 + d, d);
      }

      // Alimenta R_50 com ticks variados (sem dígito 8)
      for (let i = 0; i < 35; i++) {
        const d = (i % 9 === 8) ? 1 : (i % 9);
        engine.processTick('R_50', 50 + d, d);
      }

      // Tick em R_50 que dispara
      engine.processTick('R_50', 55.0, 5);

      expect(firedSym).toBe('R_50');
      expect(firedDigit).toBe(8);
    });

    it('no modo manual com Multi ON, alterna o foco para o melhor mercado e ajusta o dígito dinâmico', () => {
      const engine = createEngine({
        activeSym: 'R_100',
        mode: 'differ',
        exec: 'manual',
        autoOn: false,
        multiOn: true,
        differDynamicDigit: true,
        tradeCooldownMs: 0,
      });

      // Alimenta R_75 com dados favoráveis (sem dígito 1)
      for (let i = 0; i < 40; i++) {
        const d = (i % 9 === 1) ? 0 : (i % 9);
        engine.processTick('R_75', 75 + d, d);
      }

      expect(engine.getConfig().activeSym).toBe('R_75');
      expect(engine.getConfig().digit).toBe(1);
    });
  });
});
