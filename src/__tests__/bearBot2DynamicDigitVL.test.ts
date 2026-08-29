import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createEngine } from '../app/services/BearBot2Engine';

describe('BearBot2Engine - Dígitos Dinâmicos com Loss Virtual no Modo Differ', () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  describe('1. Configuração e Estado Inicial', () => {
    it('permite ativar simultaneamente differDynamicDigit e vlOn', () => {
      const engine = createEngine({
        activeSym: 'R_100',
        mode: 'differ',
        differDynamicDigit: true,
        vlOn: true,
        vlMode: 'consec',
        vlQty: 2,
      });

      const config = engine.getConfig();
      expect(config.mode).toBe('differ');
      expect(config.differDynamicDigit).toBe(true);
      expect(config.vlOn).toBe(true);
      expect(config.vlQty).toBe(2);
    });
  });

  describe('2. Modo Consecutivo (vlMode: consec)', () => {
    it('acumula perda virtual quando o dígito do tick for igual ao dígito dinâmico e dispara auto trade ao atingir vlQty', () => {
      const engine = createEngine({
        activeSym: 'R_100',
        mode: 'differ',
        exec: 'auto',
        autoOn: false,
        differDynamicDigit: true,
        vlOn: true,
        vlMode: 'consec',
        vlQty: 2,
        tradeCooldownMs: 0,
        aiMode: 'balanced',
      });

      // Alimenta 45 ticks com dígitos de 0 a 8 (apenas 9 NUNCA apareceu, com 0 ocorrências vs 5 dos demais)
      for (let i = 0; i < 45; i++) {
        const d = i % 9; // 0, 1, 2, 3, 4, 5, 6, 7, 8
        engine.processTick('R_100', 100 + d, d);
      }

      const dynInfo = engine.computeDynamicDifferDigit('R_100');
      expect(dynInfo.digit).toBe(9);

      let autoTradeFired = false;
      let targetDigitUsed = -1;
      engine.onAutoTrade((kind) => {
        autoTradeFired = true;
        targetDigitUsed = engine.getConfig().digit;
      });

      // Liga o robô após ter o histórico coletado
      engine.startBot();

      // Como nenhum tick após start foi 9, vlCount deve ser 0 e nenhum trade disparado
      expect(engine.getState().vlCount).toBe(0);
      expect(autoTradeFired).toBe(false);

      // 1º tick igual ao dígito dinâmico (9) -> Perda virtual 1/2
      engine.processTick('R_100', 109.0, 9);
      expect(engine.getState().vlCount).toBe(1);
      expect(autoTradeFired).toBe(false);

      // 2º tick igual ao dígito dinâmico (9) -> Atinge 2/2 -> Dispara trade differ
      engine.processTick('R_100', 109.0, 9);
      expect(autoTradeFired).toBe(true);
      expect(targetDigitUsed).toBeDefined();
      // Após o disparo, o loss virtual deve ser resetado
      expect(engine.getState().vlCount).toBe(0);
    });

    it('zera a contagem consecutiva se sair um dígito diferente do dígito dinâmico', () => {
      const engine = createEngine({
        activeSym: 'R_100',
        mode: 'differ',
        exec: 'auto',
        autoOn: true,
        differDynamicDigit: true,
        vlOn: true,
        vlMode: 'consec',
        vlQty: 3,
        tradeCooldownMs: 0,
        aiMode: 'balanced',
      });

      // Alimenta stream com todos os dígitos de 0 a 9 exceto o 4
      for (let i = 0; i < 45; i++) {
        const d = (i % 10 === 4) ? 0 : (i % 10);
        engine.processTick('R_100', 100 + d, d);
      }

      const dyn = engine.computeDynamicDifferDigit('R_100');
      expect(dyn.digit).toBe(4);

      // 1º e 2º tick com dígito 4 -> vlCount = 2
      engine.processTick('R_100', 104.0, 4);
      expect(engine.getState().vlCount).toBe(1);
      engine.processTick('R_100', 104.0, 4);
      expect(engine.getState().vlCount).toBe(2);

      // 3º tick com dígito 2 (diferente do dinâmico 4) -> zera o streak
      engine.processTick('R_100', 102.0, 2);
      expect(engine.getState().vlCount).toBe(0);
    });
  });

  describe('3. Modo Acumulado (vlMode: accum)', () => {
    it('conta ocorrências do dígito dinâmico dentro da janela configurada e dispara ao atingir vlQty', () => {
      const engine = createEngine({
        activeSym: 'R_100',
        mode: 'differ',
        exec: 'auto',
        autoOn: true,
        differDynamicDigit: true,
        vlOn: true,
        vlMode: 'accum',
        vlQty: 2,
        vlWindow: 10,
        tradeCooldownMs: 0,
        aiMode: 'balanced',
      });

      let tradeCount = 0;
      engine.onAutoTrade(() => {
        tradeCount++;
      });

      // Alimenta ticks com todos os dígitos exceto o 5
      for (let i = 0; i < 45; i++) {
        const d = (i % 10 === 5) ? 0 : (i % 10);
        engine.processTick('R_100', 100 + d, d);
      }

      expect(engine.computeDynamicDifferDigit('R_100').digit).toBe(5);
      expect(engine.getState().vlCount).toBe(0);

      // Envia 1 tick com 5
      engine.processTick('R_100', 105.0, 5);
      expect(engine.getState().vlCount).toBe(1);
      expect(tradeCount).toBe(0);

      // Envia 2 ticks sem 5
      engine.processTick('R_100', 101.0, 1);
      engine.processTick('R_100', 102.0, 2);
      expect(engine.getState().vlCount).toBe(1);
      expect(tradeCount).toBe(0);

      // Envia outro tick com 5 dentro da janela de 10 ticks -> total = 2 ocorrências de 5 -> dispara trade
      engine.processTick('R_100', 105.0, 5);
      expect(tradeCount).toBe(1);
      expect(engine.getState().vlCount).toBe(0);
    });
  });

  describe('4. Modo Manual com Loss Virtual', () => {
    it('bloqueia tryManualFire se o Loss Virtual não estiver completo e libera quando atinge a meta', () => {
      const engine = createEngine({
        activeSym: 'R_100',
        mode: 'differ',
        exec: 'manual',
        autoOn: false,
        differDynamicDigit: true,
        vlOn: true,
        vlMode: 'consec',
        vlQty: 2,
        tradeCooldownMs: 0,
      });

      // Alimenta ticks sem dígito 9
      for (let i = 0; i < 45; i++) {
        const d = i % 9; // 0 a 8
        engine.processTick('R_100', 100 + d, d);
      }

      expect(engine.computeDynamicDifferDigit('R_100').digit).toBe(9);

      // VL ainda 0/2 -> tryManualFire deve retornar false
      expect(engine.tryManualFire()).toBe(false);

      // 1 perda virtual -> 1/2 -> tryManualFire ainda false
      engine.processTick('R_100', 109.0, 9);
      expect(engine.getState().vlCount).toBe(1);
      expect(engine.tryManualFire()).toBe(false);

      // 2ª perda virtual -> 2/2 -> tryManualFire deve retornar true
      engine.processTick('R_100', 109.0, 9);
      expect(engine.getState().vlCount).toBe(2);
      expect(engine.tryManualFire()).toBe(true);

      // Após tryManualFire bem-sucedido, o VL deve ser resetado
      expect(engine.getState().vlCount).toBe(0);
    });
  });

  describe('5. Multi-Mercado com Contagem sob Foco (vlFocusOnly: true)', () => {
    it('troca o foco para o ativo mais promissor, zera o VL e só executa quando bater vlQty sob foco', () => {
      const engine = createEngine({
        activeSym: 'R_100',
        mode: 'differ',
        exec: 'auto',
        autoOn: true,
        multiOn: true,
        differDynamicDigit: true,
        vlOn: true,
        vlMode: 'consec',
        vlQty: 2,
        vlFocusOnly: true,
        tradeCooldownMs: 0,
        aiMode: 'balanced',
      });

      let firedSym = '';
      let firedDigit = -1;
      engine.onAutoTrade(() => {
        firedSym = engine.getConfig().activeSym;
        firedDigit = engine.getConfig().digit;
      });

      // Alimenta R_100 com ticks sem dígito 3
      for (let i = 0; i < 36; i++) {
        const d = (i % 10 === 3) ? 0 : (i % 10);
        engine.processTick('R_100', 100 + d, d);
      }

      // Alimenta R_50 com ticks altamente favoráveis sem dígito 7 (todos outros 0..9 presentes)
      for (let i = 0; i < 45; i++) {
        const d = (i % 10 === 7) ? 0 : (i % 10);
        engine.processTick('R_50', 50 + d, d);
      }

      // Foco muda para R_50
      engine.processTick('R_50', 55.0, 5);

      expect(engine.getConfig().activeSym).toBe('R_50');
      expect(engine.getConfig().digit).toBe(7);

      // Nenhum trade executado ainda porque o VL sob foco é 0/2
      expect(firedSym).toBe('');

      // 1ª perda virtual sob foco em R_50 (dígito dinâmico 7)
      engine.processTick('R_50', 57.0, 7);
      expect(engine.getState().vlCount).toBe(1);
      expect(firedSym).toBe('');

      // 2ª perda virtual sob foco em R_50 -> Atinge 2/2 -> Dispara trade
      engine.processTick('R_50', 57.0, 7);
      expect(firedSym).toBe('R_50');
      expect(firedDigit).toBeGreaterThanOrEqual(0);
      expect(firedDigit).toBeLessThanOrEqual(9);
      expect(engine.getState().vlCount).toBe(0);
    });
  });
});
