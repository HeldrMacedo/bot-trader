import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createEngine } from '../app/services/BearBot2Engine';

describe('BearBot2Engine - Dígito Automático com Contagem sob Foco (vlFocusOnly)', () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  describe('1. Modo Consecutivo sob Foco', () => {
    it('dispara trade somente quando a repetição consecutiva ocorre após o foco no mercado', () => {
      const engine = createEngine({
        activeSym: 'R_100',
        mode: 'differ',
        exec: 'auto',
        autoOn: true,
        multiOn: true,
        vlOn: true,
        vlFocusOnly: true,
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

      // Ticks em R_100: 4, 4 (2 vezes)
      engine.processTick('R_100', 100.0, 4);
      engine.processTick('R_100', 100.0, 4);
      expect(autoTradeCalled).toBe(false);

      // Troca manual de foco para R_50
      engine.updateConfig({ activeSym: 'R_50' });
      expect(engine.getConfig().activeSym).toBe('R_50');

      // Ticks em R_50: 9, 9 (2 vezes) -> ainda não atingiu 3 sob foco
      engine.processTick('R_50', 50.0, 9);
      engine.processTick('R_50', 50.0, 9);
      expect(autoTradeCalled).toBe(false);

      // 3º '9' em R_50 sob foco -> deve disparar com dígito 9
      engine.processTick('R_50', 50.0, 9);
      expect(autoTradeCalled).toBe(true);
      expect(tradedKind).toBe('differ');
      expect(engine.getConfig().digit).toBe(9);
      expect(engine.getConfig().activeSym).toBe('R_50');
    });

    it('não conta repetições ocorridas em mercados fora de foco', () => {
      const engine = createEngine({
        activeSym: 'R_100',
        mode: 'differ',
        exec: 'manual',
        autoOn: false,
        multiOn: true,
        vlOn: true,
        vlFocusOnly: true,
        vlMode: 'consec',
        vlQty: 3,
        differAutoDigit: true,
        tradeCooldownMs: 0,
      });

      // Define foco em R_100 recentemente
      engine.updateConfig({ activeSym: 'R_100' });

      // Envia 5 repetições de '7' no R_50 (que NÃO está em foco)
      for (let i = 0; i < 5; i++) {
        engine.processTick('R_50', 50.0, 7);
      }

      // R_100 continuou sendo o foco ativo
      expect(engine.getConfig().activeSym).toBe('R_100');
      // Não deve ter contado perdas virtuais em R_50 pois estava fora de foco
      expect(engine.getState().vlBySym['R_50'].count).toBe(0);
      expect(engine.tryManualFire()).toBe(false);
    });
  });

  describe('2. Modo Acumulado sob Foco', () => {
    it('conta frequência apenas a partir dos ticks recebidos sob foco', () => {
      const engine = createEngine({
        activeSym: 'R_100',
        mode: 'differ',
        exec: 'auto',
        autoOn: true,
        multiOn: true,
        vlOn: true,
        vlFocusOnly: true,
        vlMode: 'accum',
        vlQty: 3,
        vlWindow: 10,
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

      // Troca foco para R_100 e reseta
      engine.updateConfig({ activeSym: 'R_100' });

      // Sequência sob foco: 1, 2, 5, 2, 8, 2 (3º '2' ocorre no 6º tick sob foco)
      const ticks = [1, 2, 5, 2, 8];
      for (const d of ticks) {
        engine.processTick('R_100', 100.0 + d, d);
        expect(autoTradeCalled).toBe(false);
      }

      // Chegada do 3º dígito 2
      engine.processTick('R_100', 102.0, 2);
      expect(autoTradeCalled).toBe(true);
      expect(tradedKind).toBe('differ');
      expect(engine.getConfig().digit).toBe(2);
    });
  });

  describe('3. Troca de Foco Automática Multi-Mercado', () => {
    it('troca o foco para o melhor mercado candidato e reseta o contador antes de contar repetições', () => {
      const engine = createEngine({
        activeSym: 'R_100',
        mode: 'differ',
        exec: 'auto',
        autoOn: true,
        multiOn: true,
        vlOn: true,
        vlFocusOnly: true,
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

      // Alimenta R_100 com ticks neutros
      for (let i = 0; i < 15; i++) {
        engine.processTick('R_100', 100.0 + (i % 10), i % 10);
      }

      // Alimenta R_50 para gerar alta oportunidade / anomalia
      for (let i = 0; i < 20; i++) {
        engine.processTick('R_50', 50.0 + (i % 2), i % 2);
      }

      // Força a troca de foco no engine
      engine.updateConfig({ activeSym: 'R_50' });
      expect(engine.getConfig().activeSym).toBe('R_50');

      // Agora sob foco em R_50, envia 3 repetições consecutivas de dígito 8
      engine.processTick('R_50', 58.0, 8);
      engine.processTick('R_50', 58.0, 8);
      expect(autoTradeCalled).toBe(false);

      engine.processTick('R_50', 58.0, 8);
      expect(autoTradeCalled).toBe(true);
      expect(tradedKind).toBe('differ');
      expect(engine.getConfig().digit).toBe(8);
      expect(engine.getConfig().activeSym).toBe('R_50');
    });
  });

  describe('4. Modo Manual com Contagem sob Foco', () => {
    it('atualiza config.digit e libera tryManualFire apenas quando a quantidade sob foco é atingida', () => {
      const engine = createEngine({
        activeSym: 'R_100',
        mode: 'differ',
        exec: 'manual',
        autoOn: false,
        multiOn: true,
        vlOn: true,
        vlFocusOnly: true,
        vlMode: 'consec',
        vlQty: 3,
        differAutoDigit: true,
        tradeCooldownMs: 0,
      });

      // Fixa foco inicial em R_100
      engine.updateConfig({ activeSym: 'R_100' });
      expect(engine.tryManualFire()).toBe(false);

      // 1º e 2º dígitos '6'
      engine.processTick('R_100', 100.0, 6);
      engine.processTick('R_100', 100.0, 6);
      expect(engine.tryManualFire()).toBe(false);

      // 3º dígito '6' sob foco
      engine.processTick('R_100', 100.0, 6);
      expect(engine.getConfig().digit).toBe(6);
      expect(engine.tryManualFire()).toBe(true);

      // Após o disparo manual, o contador reseta
      expect(engine.getState().vlCount).toBe(0);
      expect(engine.tryManualFire()).toBe(false);
    });
  });

  describe('5. Pós-Loss e Recuperação sob Foco', () => {
    it('mantém o fluxo de contagem e permite migração de mercado durante a recuperação', () => {
      vi.useFakeTimers();
      const engine = createEngine({
        activeSym: 'R_100',
        mode: 'differ',
        exec: 'auto',
        autoOn: true,
        multiOn: true,
        vlOn: true,
        vlFocusOnly: true,
        vlMode: 'consec',
        vlQty: 3,
        differAutoDigit: true,
        postLossOn: true,
        postLossMode: 'recover',
        recoverMaxAttempts: 2,
        recoverDelay: 500,
        tradeCooldownMs: 0,
      });

      let tradeCount = 0;
      engine.onAutoTrade(() => {
        tradeCount++;
      });

      // Dispara 1º trade com 3 repetições de 5
      engine.processTick('R_100', 100.0, 5);
      engine.processTick('R_100', 100.0, 5);
      engine.processTick('R_100', 100.0, 5);
      expect(tradeCount).toBe(1);

      // Simula resultado com perda real via settleContract
      engine.settleContract(-0.35, true, 'differ', 5, null);
      expect(engine.getState().recovery.active).toBe(true);

      // Avança o tempo além do recoverDelay (500ms)
      vi.advanceTimersByTime(600);

      // Troca de mercado para R_25 durante a recuperação
      engine.updateConfig({ activeSym: 'R_25' });
      expect(engine.getConfig().activeSym).toBe('R_25');

      // Ticks em R_25: 3 repetições de dígito 1 sob foco
      engine.processTick('R_25', 25.0, 1);
      engine.processTick('R_25', 25.0, 1);
      expect(tradeCount).toBe(1);

      engine.processTick('R_25', 25.0, 1);
      expect(tradeCount).toBe(2);
      expect(engine.getConfig().digit).toBe(1);
      vi.useRealTimers();
    });
  });

  describe('6. Múltiplos Disparos Sucessivos sob Foco', () => {
    it('exige uma sequência nova completa a cada disparo sem disparar em ticks intermediários', () => {
      const engine = createEngine({
        activeSym: 'R_100',
        mode: 'differ',
        exec: 'auto',
        autoOn: true,
        multiOn: true,
        vlOn: true,
        vlFocusOnly: true,
        vlMode: 'consec',
        vlQty: 2,
        differAutoDigit: true,
        tradeCooldownMs: 0,
      });

      let tradeCount = 0;
      engine.onAutoTrade(() => {
        tradeCount++;
      });

      // 2 repetições de '3' -> trade 1
      engine.processTick('R_100', 100.0, 3);
      engine.processTick('R_100', 100.0, 3);
      expect(tradeCount).toBe(1);
      expect(engine.getConfig().digit).toBe(3);

      // 3º dígito '3' consecutivo logo após reset -> não deve disparar novamente
      engine.processTick('R_100', 100.0, 3);
      expect(tradeCount).toBe(1);

      // 4º dígito '3' consecutivo (2º novo desde o reset) -> trade 2
      engine.processTick('R_100', 100.0, 3);
      expect(tradeCount).toBe(2);
    });
  });

  describe('7. Sincronização em Tempo Real do Dígito Alvo com a Contagem sob Foco', () => {
    it('mantém o dígito alvo (config.digit e autoDigitBySym) sincronizado com a repetição sendo contada', () => {
      const engine = createEngine({
        activeSym: 'R_100',
        mode: 'differ',
        exec: 'manual',
        autoOn: false,
        multiOn: true,
        vlOn: true,
        vlFocusOnly: true,
        vlMode: 'consec',
        vlQty: 3,
        digit: 2, // Dígito inicial padrão 2
        differAutoDigit: true,
        tradeCooldownMs: 0,
      });

      // 1º tick com dígito 7 sob foco
      engine.processTick('R_100', 100.0, 7);
      expect(engine.getState().vlCount).toBe(1);
      expect(engine.getState().autoDigitBySym?.['R_100']).toBe(7);
      expect(engine.getConfig().digit).toBe(7);

      // 2º tick com dígito 7 sob foco
      engine.processTick('R_100', 100.0, 7);
      expect(engine.getState().vlCount).toBe(2);
      expect(engine.getState().autoDigitBySym?.['R_100']).toBe(7);
      expect(engine.getConfig().digit).toBe(7);

      // 3º tick com dígito 7 sob foco -> atinge 3/3
      engine.processTick('R_100', 100.0, 7);
      expect(engine.getState().vlCount).toBe(3);
      expect(engine.getState().autoDigitBySym?.['R_100']).toBe(7);
      expect(engine.getConfig().digit).toBe(7);
      expect(engine.tryManualFire()).toBe(true);
    });

    it('no modo acumulado identifica e sincroniza o dígito de maior frequência dentro da janela sob foco', () => {
      const engine = createEngine({
        activeSym: 'R_100',
        mode: 'differ',
        exec: 'manual',
        autoOn: false,
        multiOn: true,
        vlOn: true,
        vlFocusOnly: true,
        vlMode: 'accum',
        vlQty: 3,
        vlWindow: 10,
        digit: 2,
        differAutoDigit: true,
        tradeCooldownMs: 0,
      });

      // Sequência: 8, 4, 8, 1, 8
      engine.processTick('R_100', 100.0, 8);
      expect(engine.getState().autoDigitBySym?.['R_100']).toBe(8);
      expect(engine.getConfig().digit).toBe(8);

      engine.processTick('R_100', 100.0, 4);
      // Frequência de 8 (1) e 4 (1) -> mantém o último ou de maior freq
      expect(engine.getState().autoDigitBySym?.['R_100']).toBeDefined();

      engine.processTick('R_100', 100.0, 8);
      // 8 tem frequência 2
      expect(engine.getState().vlCount).toBe(2);
      expect(engine.getState().autoDigitBySym?.['R_100']).toBe(8);
      expect(engine.getConfig().digit).toBe(8);

      engine.processTick('R_100', 100.0, 1);
      engine.processTick('R_100', 100.0, 8);
      // 8 atingiu 3 repetições na janela
      expect(engine.getState().vlCount).toBe(3);
      expect(engine.getState().autoDigitBySym?.['R_100']).toBe(8);
      expect(engine.getConfig().digit).toBe(8);
      expect(engine.tryManualFire()).toBe(true);
    });
  });
});
