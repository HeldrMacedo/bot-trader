import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createEngine } from '../app/services/BearBot2Engine';

describe('BearBot2Engine - Dígito Automático no Modo Differ com Loss Virtual', () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  describe('1. Configuração e Defaults', () => {
    it('inicializa differAutoDigit como false por padrão', () => {
      const engine = createEngine();
      const config = engine.getConfig();
      expect(config.differAutoDigit).toBe(false);
    });

    it('permite atualizar differAutoDigit via updateConfig', () => {
      const engine = createEngine();
      engine.updateConfig({
        mode: 'differ',
        vlOn: true,
        differAutoDigit: true,
      });

      const config = engine.getConfig();
      expect(config.mode).toBe('differ');
      expect(config.vlOn).toBe(true);
      expect(config.differAutoDigit).toBe(true);
    });
  });

  describe('2. Modo Consecutivo (vlMode: consec)', () => {
    it('dispara differ no dígito que se repete consecutivamente pela quantidade configurada (ex: 3 vezes dígito 7)', () => {
      const engine = createEngine({
        activeSym: 'R_100',
        mode: 'differ',
        exec: 'auto',
        autoOn: true,
        vlOn: true,
        vlMode: 'consec',
        vlQty: 3,
        differAutoDigit: true,
        tradeCooldownMs: 0,
        aiMode: 'balanced',
      });

      let autoTradeCalled = false;
      let tradedKind = '';
      engine.onAutoTrade((kind) => {
        autoTradeCalled = true;
        tradedKind = kind;
      });

      // Sequência de exemplo do usuário: 3 - 4 - 2 - 4 - 2 - 4 - 7 - 7 - 7
      const ticks = [3, 4, 2, 4, 2, 4, 7, 7];
      for (const d of ticks) {
        engine.processTick('R_100', 100.0 + d, d);
        expect(autoTradeCalled).toBe(false);
      }

      // No 3º '7' consecutivo, deve disparar DIFFER com dígito alvo 7
      engine.processTick('R_100', 107.0, 7);

      expect(autoTradeCalled).toBe(true);
      expect(tradedKind).toBe('differ');
      expect(engine.getConfig().digit).toBe(7);
    });

    it('reseta a contagem após o disparo e não dispara imediatamente no próximo tick sem uma nova sequência completa', () => {
      const engine = createEngine({
        activeSym: 'R_100',
        mode: 'differ',
        exec: 'auto',
        autoOn: true,
        vlOn: true,
        vlMode: 'consec',
        vlQty: 3,
        differAutoDigit: true,
        tradeCooldownMs: 0,
        aiMode: 'balanced',
      });

      let tradeCount = 0;
      engine.onAutoTrade(() => {
        tradeCount++;
      });

      // Sequência: 7, 7, 7 -> dispara 1 vez
      engine.processTick('R_100', 100.0, 7);
      engine.processTick('R_100', 100.0, 7);
      engine.processTick('R_100', 100.0, 7);
      expect(tradeCount).toBe(1);
      expect(engine.getConfig().digit).toBe(7);

      // 4º dígito 7 consecutivo (mas logo após reset) -> não deve disparar novamente
      engine.processTick('R_100', 100.0, 7);
      expect(tradeCount).toBe(1);

      // 5º dígito 7 -> ainda não completou 3 novos
      engine.processTick('R_100', 100.0, 7);
      expect(tradeCount).toBe(1);

      // 6º dígito 7 (3º novo após reset) -> dispara 2ª vez
      engine.processTick('R_100', 100.0, 7);
      expect(tradeCount).toBe(2);
    });
  });

  describe('3. Modo Acumulado (vlMode: accum)', () => {
    it('dispara differ no dígito que atinge a quantidade dentro da janela (ex: 4 vezes o dígito 2 em janela 15)', () => {
      const engine = createEngine({
        activeSym: 'R_100',
        mode: 'differ',
        exec: 'auto',
        autoOn: true,
        vlOn: true,
        vlMode: 'accum',
        vlQty: 4,
        vlWindow: 15,
        differAutoDigit: true,
        tradeCooldownMs: 0,
        aiMode: 'balanced',
      });

      let autoTradeCalled = false;
      let tradedKind = '';
      engine.onAutoTrade((kind) => {
        autoTradeCalled = true;
        tradedKind = kind;
      });

      // Sequência do usuário: 1 - 2 - 5 - 6 - 2 - 6 - 7 - 2 - 2 (4º dois ocorre no 9º tick)
      const ticksBeforeTrigger = [1, 2, 5, 6, 2, 6, 7, 2];
      for (const d of ticksBeforeTrigger) {
        engine.processTick('R_100', 100.0 + d, d);
        expect(autoTradeCalled).toBe(false);
      }

      // O 4º '2' chega na janela de 15
      engine.processTick('R_100', 102.0, 2);

      expect(autoTradeCalled).toBe(true);
      expect(tradedKind).toBe('differ');
      expect(engine.getConfig().digit).toBe(2);
    });

    it('reseta a janela após entrada evitando disparos em sequência indevidos', () => {
      const engine = createEngine({
        activeSym: 'R_100',
        mode: 'differ',
        exec: 'auto',
        autoOn: true,
        vlOn: true,
        vlMode: 'accum',
        vlQty: 4,
        vlWindow: 15,
        differAutoDigit: true,
        tradeCooldownMs: 0,
        aiMode: 'balanced',
      });

      let tradeCount = 0;
      engine.onAutoTrade(() => {
        tradeCount++;
      });

      // 4 dígitos '5'
      engine.processTick('R_100', 100.0, 5);
      engine.processTick('R_100', 100.0, 5);
      engine.processTick('R_100', 100.0, 5);
      engine.processTick('R_100', 100.0, 5);

      expect(tradeCount).toBe(1);
      expect(engine.getConfig().digit).toBe(5);

      // Próximo dígito 5 não deve disparar de novo pois a contagem foi resetada
      engine.processTick('R_100', 100.0, 5);
      expect(tradeCount).toBe(1);
    });
  });

  describe('4. Modo Multi-Mercado (multiOn)', () => {
    it('monitora repetições de dígitos de forma independente por mercado', () => {
      const engine = createEngine({
        activeSym: 'R_100',
        mode: 'differ',
        exec: 'auto',
        autoOn: true,
        multiOn: true,
        vlOn: true,
        vlMode: 'consec',
        vlQty: 3,
        differAutoDigit: true,
        tradeCooldownMs: 0,
        aiMode: 'balanced',
      });

      let firedSym = '';
      engine.onAutoTrade(() => {
        firedSym = engine.getConfig().activeSym;
      });

      // Alimenta R_100 com dígitos variados
      engine.processTick('R_100', 100.0, 1);
      engine.processTick('R_100', 100.0, 2);

      // Alimenta R_50 com 3 repetições do dígito 9
      engine.processTick('R_50', 50.0, 9);
      engine.processTick('R_50', 50.0, 9);
      engine.processTick('R_50', 50.0, 9);

      expect(firedSym).toBe('R_50');
      expect(engine.getConfig().digit).toBe(9);
    });
  });

  describe('5. Modo Manual e Edge Cases', () => {
    it('no modo manual, atualiza config.digit e permite disparo com tryManualFire quando o loss virtual completa', () => {
      const engine = createEngine({
        activeSym: 'R_100',
        mode: 'differ',
        exec: 'manual',
        autoOn: false,
        vlOn: true,
        vlMode: 'consec',
        vlQty: 3,
        differAutoDigit: true,
        tradeCooldownMs: 0,
      });

      expect(engine.tryManualFire()).toBe(false);

      // Ticks: 8, 8, 8
      engine.processTick('R_100', 100.0, 8);
      engine.processTick('R_100', 100.0, 8);
      expect(engine.tryManualFire()).toBe(false);

      engine.processTick('R_100', 100.0, 8);
      // Dígito alvo agora deve ser 8 e tryManualFire deve aceitar o disparo
      expect(engine.getConfig().digit).toBe(8);
      expect(engine.tryManualFire()).toBe(true);

      // Após o tryManualFire(), o loss virtual é resetado
      expect(engine.getState().vlCount).toBe(0);
      expect(engine.tryManualFire()).toBe(false);
    });
  });
});
