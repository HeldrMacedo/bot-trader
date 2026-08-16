import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createEngine } from '../app/services/BearBot2Engine';

function loseOnce(engine: ReturnType<typeof createEngine>) {
  expect(engine.prepareTrade('over')).not.toBeNull();
  engine.settleContract(-1, true, 'over', 0, null);
}

function winOnce(engine: ReturnType<typeof createEngine>) {
  expect(engine.prepareTrade('over')).not.toBeNull();
  engine.settleContract(0.9, false, 'over', 7, null);
}

describe('BearBot2Engine — Suite Completa de Pós-Loss (Recover & Analyze)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-16T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('1. Quando postLossOn está desligado, nenhum estado de recuperação é ativado no loss', () => {
    const engine = createEngine({
      paperMode: true,
      tradeCooldownMs: 0,
      postLossOn: false,
      postLossMode: 'recover',
    });

    loseOnce(engine);
    const st = engine.getState();
    expect(st.recovery.active).toBe(false);
    expect(st.recovery.attemptsLeft).toBe(0);
    expect(st.galeLevel).toBe(1);
  });

  it('2. Modo "Recuperar": ativa após loss, respeita delay configurado e faz trade com bypass de VL e IA', () => {
    const engine = createEngine({
      paperMode: true,
      tradeCooldownMs: 0,
      postLossOn: true,
      postLossMode: 'recover',
      recoverMaxAttempts: 3,
      recoverDelay: 2000,
      exec: 'auto',
      autoOn: true,
      vlOn: true,
      vlQty: 10, // VL fechado propositalmente
      mode: 'over',
      digit: 2,
    });

    const autoTradeSpy = vi.fn();
    engine.onAutoTrade(autoTradeSpy);

    loseOnce(engine);

    const st = engine.getState();
    expect(st.recovery.active).toBe(true);
    expect(st.recovery.attemptsLeft).toBe(3);
    expect(st.recovery.nextTradeAfter).toBe(Date.now() + 2000);

    // Durante o delay (ex: 1500ms): tick não deve disparar trade
    vi.advanceTimersByTime(1500);
    engine.processTick('R_100', 100.09, 9);
    expect(autoTradeSpy).not.toHaveBeenCalled();

    // Após completar 2000ms: tick deve disparar trade de recuperação mesmo com VL fechado
    vi.advanceTimersByTime(500);
    engine.processTick('R_100', 100.09, 9);
    expect(autoTradeSpy).toHaveBeenCalledTimes(1);
    expect(engine.getState().recovery.attemptsLeft).toBe(3);
  });

  it('3. Modo "Recuperar": perdas consecutivas decrementam attemptsLeft até atingir limite e desativar', () => {
    const engine = createEngine({
      paperMode: true,
      tradeCooldownMs: 0,
      postLossOn: true,
      postLossMode: 'recover',
      recoverMaxAttempts: 3,
      recoverDelay: 1000,
    });

    // Loss 1 (inicia recuperação com 3 tentativas)
    loseOnce(engine);
    expect(engine.getState().recovery.active).toBe(true);
    expect(engine.getState().recovery.attemptsLeft).toBe(3);

    // Loss 2 (tentativa 1 de recuperação falha -> restam 2)
    vi.advanceTimersByTime(1000);
    loseOnce(engine);
    expect(engine.getState().recovery.active).toBe(true);
    expect(engine.getState().recovery.attemptsLeft).toBe(2);

    // Loss 3 (tentativa 2 de recuperação falha -> resta 1)
    vi.advanceTimersByTime(1000);
    loseOnce(engine);
    expect(engine.getState().recovery.active).toBe(true);
    expect(engine.getState().recovery.attemptsLeft).toBe(1);

    // Loss 4 (tentativa 3 de recuperação falha -> esgotou)
    vi.advanceTimersByTime(1000);
    loseOnce(engine);
    expect(engine.getState().recovery.active).toBe(false);
    expect(engine.getState().recovery.attemptsLeft).toBe(0);
    expect(engine.getState().logLines.some(l => l.msg.includes('Limite de tentativas de recuperação atingido'))).toBe(true);
  });

  it('4. Modo "Recuperar": um WIN encerra a recuperação imediatamente e reseta o gale', () => {
    const engine = createEngine({
      paperMode: true,
      tradeCooldownMs: 0,
      postLossOn: true,
      postLossMode: 'recover',
      recoverMaxAttempts: 3,
      recoverDelay: 1000,
      stake: 0.35,
      gale: 2.0,
    });

    loseOnce(engine);
    expect(engine.getState().recovery.active).toBe(true);
    expect(engine.getState().galeLevel).toBe(1);
    expect(engine.getState().curStake).toBe(0.70);

    vi.advanceTimersByTime(1000);
    winOnce(engine);

    const st = engine.getState();
    expect(st.recovery.active).toBe(false);
    expect(st.recovery.attemptsLeft).toBe(0);
    expect(st.galeLevel).toBe(0);
    expect(st.curStake).toBe(0.35);
  });

  it('5. Modo "Analisar": zera o Virtual Loss e entra em cooldown sem disparar ordens', () => {
    const engine = createEngine({
      paperMode: true,
      tradeCooldownMs: 0,
      postLossOn: true,
      postLossMode: 'analyze',
      cooldownSec: 10,
      exec: 'auto',
      autoOn: false,
      vlOn: true,
      vlQty: 2,
      mode: 'over',
      digit: 2,
    });

    // Construir histórico de ticks com padrão A->B (8->9 que são vencedores para over 2)
    for (let i = 0; i < 6; i++) {
      engine.processTick('R_100', 100.08, 8);
      engine.processTick('R_100', 100.09, 9);
    }

    // Construir VL antes do trade (dígitos perdedores 0 e 1 para over 2)
    engine.processTick('R_100', 100.00, 0);
    engine.processTick('R_100', 100.01, 1);
    expect(engine.getState().vlCount).toBe(2);

    // Ocorre LOSS
    loseOnce(engine);

    // VL deve ter sido zerado no loss
    expect(engine.getState().vlCount).toBe(0);
    expect(engine.getState().recovery.active).toBe(true);
    expect(engine.getState().recovery.cooldownUntil).toBe(Date.now() + 10000);

    // Ativar auto
    engine.updateConfig({ autoOn: true });
    const autoTradeSpy = vi.fn();
    engine.onAutoTrade(autoTradeSpy);

    // Durante o cooldown (9999ms): nenhum trade é disparado
    vi.advanceTimersByTime(9999);
    engine.processTick('R_100', 100.09, 9);
    expect(autoTradeSpy).not.toHaveBeenCalled();
    expect(engine.getState().recovery.active).toBe(true);

    // Fim do cooldown: estado desativa recovery e registra log
    vi.advanceTimersByTime(1);
    engine.processTick('R_100', 100.09, 9);
    expect(engine.getState().recovery.active).toBe(false);
    expect(engine.getState().logLines.some(l => l.msg.includes('Cooldown finalizado · voltando a analisar'))).toBe(true);

    // Como VL está em 0 e precisa de 2 perdas virtuais, NÃO deve disparar auto-trade no tick 9
    expect(autoTradeSpy).not.toHaveBeenCalled();

    // Acumular 2 perdas virtuais pós-cooldown:
    engine.processTick('R_100', 100.00, 0); // VL = 1
    expect(autoTradeSpy).not.toHaveBeenCalled();
    engine.processTick('R_100', 100.01, 1); // VL = 2 -> dispara auto-trade!
    expect(autoTradeSpy).toHaveBeenCalledTimes(1);
  });

  it('6. Modo "Analisar" no modo Multi-Mercado zera o contador do mercado ativo', () => {
    const engine = createEngine({
      paperMode: true,
      tradeCooldownMs: 0,
      postLossOn: true,
      postLossMode: 'analyze',
      cooldownSec: 5,
      multiOn: true,
      vlOn: true,
      vlQty: 2,
      activeSym: 'R_100',
    });

    // Simular ticks e perdas virtuais no R_100
    engine.processTick('R_100', 100.00, 0);
    engine.processTick('R_100', 100.01, 1);
    expect(engine.getState().vlBySym['R_100'].count).toBe(2);

    loseOnce(engine);

    // VL do mercado ativo deve estar zerado
    expect(engine.getState().vlBySym['R_100'].count).toBe(0);
  });

  it('7. Desligar postLossOn durante recuperação ativa limpa o estado imediatamente', () => {
    const engine = createEngine({
      paperMode: true,
      tradeCooldownMs: 0,
      postLossOn: true,
      postLossMode: 'recover',
      recoverDelay: 5000,
    });

    loseOnce(engine);
    expect(engine.getState().recovery.active).toBe(true);

    // Desligar
    engine.updateConfig({ postLossOn: false });
    expect(engine.getState().recovery.active).toBe(false);
    expect(engine.getState().recovery.attemptsLeft).toBe(0);
  });

  it('8. resetStats e abortOp cancelam e limpam o estado de recuperação', () => {
    const engine = createEngine({
      paperMode: true,
      tradeCooldownMs: 0,
      postLossOn: true,
      postLossMode: 'recover',
    });

    loseOnce(engine);
    expect(engine.getState().recovery.active).toBe(true);

    engine.abortOp();
    expect(engine.getState().recovery.active).toBe(false);

    loseOnce(engine);
    expect(engine.getState().recovery.active).toBe(true);

    engine.resetStats();
    expect(engine.getState().recovery.active).toBe(false);
    expect(engine.getState().recovery.attemptsLeft).toBe(0);
  });

  it('9. Modo Multi-Mercado seleciona candidato e dispara recuperação em auto mesmo com VL fechado', () => {
    const engine = createEngine({
      paperMode: true,
      tradeCooldownMs: 0,
      postLossOn: true,
      postLossMode: 'recover',
      recoverDelay: 500,
      multiOn: true,
      vlOn: true,
      vlQty: 10,
      exec: 'auto',
      autoOn: true,
      activeSym: 'R_100',
    });

    const autoTradeSpy = vi.fn();
    engine.onAutoTrade(autoTradeSpy);

    loseOnce(engine);
    expect(engine.getState().recovery.active).toBe(true);

    vi.advanceTimersByTime(500);

    // Enviar tick para R_50
    engine.processTick('R_50', 50.1234, 7);
    expect(autoTradeSpy).toHaveBeenCalledTimes(1);
    expect(engine.getConfig().activeSym).toBe('R_50');
  });

  it('10. Parâmetros são devidamente limitados (clamped) na engine', () => {
    const engine = createEngine();

    engine.updateConfig({
      recoverMaxAttempts: -10,
      recoverDelay: 50,
      cooldownSec: 500,
    });

    const cfg = engine.getConfig();
    expect(cfg.recoverMaxAttempts).toBe(1); // Min 1
    expect(cfg.recoverDelay).toBe(500); // Min 500ms
    expect(cfg.cooldownSec).toBe(60); // Max 60s
  });
});
