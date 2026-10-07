import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock dos módulos de WebSocket antes de importar o service
vi.mock('ws', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      on: vi.fn(),
      send: vi.fn(),
      close: vi.fn(),
      readyState: 1,
    })),
  };
});

vi.mock('events', async () => {
  const actual = await vi.importActual('events');
  return actual;
});

import { CopyTradingService } from '../copyTradingService';

/**
 * Helper: cria uma instância do CopyTradingService com config customizada
 * e retorna acesso interno via `as any` para testar métodos privados.
 */
function createService(config: Record<string, any> = {}) {
  const defaultConfig = {
    quantityLoss: 0,
    stopLoss: 0,
    stopWin: 0,
    initialValue: 0.35,
    stakeMultiple: 1,
    pauseTime: 10,
    pauseTimeLoss: false,
    pauseTimeWin: false,
    maxMartingale: 0,
    onMaxMartingale: 'reset',
    ...config,
  };

  const service = new CopyTradingService('demoToken', 'realToken', 'test-session', defaultConfig);
  const internal = service as any;

  // Previne que os event handlers tentem conectar WebSockets reais
  internal.isRunning = false;

  return { service, internal };
}

// =============================================================================
// 1. shouldProcessSignal
// =============================================================================
describe('shouldProcessSignal', () => {
  it('retorna true quando quantityLoss=0 e não está pausado', () => {
    const { internal } = createService({ quantityLoss: 0 });
    internal.isPaused = false;
    expect(internal.shouldProcessSignal()).toBe(true);
  });

  it('retorna false quando está pausado, independente de quantityLoss', () => {
    const { internal } = createService({ quantityLoss: 0 });
    internal.isPaused = true;
    expect(internal.shouldProcessSignal()).toBe(false);
  });

  it('retorna false quando quantityLoss=3 e consecutiveLosses=1', () => {
    const { internal } = createService({ quantityLoss: 3 });
    internal.consecutiveLosses = 1;
    internal.isPaused = false;
    expect(internal.shouldProcessSignal()).toBe(false);
  });

  it('retorna false quando quantityLoss=3 e consecutiveLosses=2', () => {
    const { internal } = createService({ quantityLoss: 3 });
    internal.consecutiveLosses = 2;
    internal.isPaused = false;
    expect(internal.shouldProcessSignal()).toBe(false);
  });

  it('retorna true quando quantityLoss=3 e consecutiveLosses=3', () => {
    const { internal } = createService({ quantityLoss: 3 });
    internal.consecutiveLosses = 3;
    internal.isPaused = false;
    expect(internal.shouldProcessSignal()).toBe(true);
  });

  it('retorna true quando quantityLoss=3 e consecutiveLosses=5 (acima do threshold)', () => {
    const { internal } = createService({ quantityLoss: 3 });
    internal.consecutiveLosses = 5;
    internal.isPaused = false;
    expect(internal.shouldProcessSignal()).toBe(true);
  });
});

// =============================================================================
// 2. handleDemoTransaction — contagem de losses consecutivos na demo
// =============================================================================
describe('handleDemoTransaction', () => {
  it('incrementa consecutiveLosses ao receber loss na demo (quantityLoss > 0)', () => {
    const { internal } = createService({ quantityLoss: 2 });
    internal.consecutiveLosses = 0;

    internal.handleDemoTransaction({ amount: -1 }); // loss
    expect(internal.consecutiveLosses).toBe(1);

    internal.handleDemoTransaction({ amount: -0.5 }); // loss
    expect(internal.consecutiveLosses).toBe(2);
  });

  it('reseta consecutiveLosses ao receber win na demo', () => {
    const { internal } = createService({ quantityLoss: 2 });
    internal.consecutiveLosses = 3;

    internal.handleDemoTransaction({ amount: 1 }); // win
    expect(internal.consecutiveLosses).toBe(0);
  });

  it('nao incrementa consecutiveLosses quando quantityLoss=0 (modo direto)', () => {
    const { internal } = createService({ quantityLoss: 0 });
    internal.consecutiveLosses = 0;

    internal.handleDemoTransaction({ amount: -1 }); // loss
    expect(internal.consecutiveLosses).toBe(0); // não incrementa pois quantityLoss=0
  });
});

// =============================================================================
// 3. calculateNextStake — progressão martingale
// =============================================================================
describe('calculateNextStake', () => {
  it('retorna initialValue quando martingaleLevel=0', () => {
    const { internal } = createService({ initialValue: 0.35, stakeMultiple: 1 });
    internal.martingaleLevel = 0;
    expect(internal.calculateNextStake()).toBe(0.35);
  });

  it('calcula progressão geométrica com stakeMultiple=1 (dobra a cada loss)', () => {
    const { internal } = createService({ initialValue: 0.35, stakeMultiple: 1 });

    // ratio = 1 + 1 = 2
    // level 1: 0.35 * 2^1 = 0.70
    internal.martingaleLevel = 1;
    expect(internal.calculateNextStake()).toBe(0.70);

    // level 2: 0.35 * 2^2 = 1.40
    internal.martingaleLevel = 2;
    expect(internal.calculateNextStake()).toBe(1.40);

    // level 3: 0.35 * 2^3 = 2.80
    internal.martingaleLevel = 3;
    expect(internal.calculateNextStake()).toBe(2.80);
  });

  it('calcula progressão com stakeMultiple=0.5', () => {
    const { internal } = createService({ initialValue: 1.00, stakeMultiple: 0.5 });

    // ratio = 1 + 0.5 = 1.5
    // level 1: 1.00 * 1.5^1 = 1.50
    internal.martingaleLevel = 1;
    expect(internal.calculateNextStake()).toBe(1.50);

    // level 2: 1.00 * 1.5^2 = 2.25
    internal.martingaleLevel = 2;
    expect(internal.calculateNextStake()).toBe(2.25);
  });

  it('calcula progressão com stakeMultiple=2 (triplica)', () => {
    const { internal } = createService({ initialValue: 0.50, stakeMultiple: 2 });

    // ratio = 1 + 2 = 3
    // level 1: 0.50 * 3^1 = 1.50
    internal.martingaleLevel = 1;
    expect(internal.calculateNextStake()).toBe(1.50);

    // level 2: 0.50 * 3^2 = 4.50
    internal.martingaleLevel = 2;
    expect(internal.calculateNextStake()).toBe(4.50);
  });

  it('arredonda para 2 casas decimais', () => {
    const { internal } = createService({ initialValue: 0.33, stakeMultiple: 1 });

    // level 1: 0.33 * 2^1 = 0.66
    internal.martingaleLevel = 1;
    expect(internal.calculateNextStake()).toBe(0.66);

    // level 3: 0.33 * 2^3 = 2.64
    internal.martingaleLevel = 3;
    expect(internal.calculateNextStake()).toBe(2.64);
  });
});

// =============================================================================
// 4. handleRealTransaction — Win
// =============================================================================
describe('handleRealTransaction — Win', () => {
  it('acumula totalProfit ao ganhar', () => {
    const { internal } = createService({ initialValue: 0.35 });
    internal.totalProfit = 0;

    internal.handleRealTransaction({ profit: 0.30 });
    expect(internal.totalProfit).toBe(0.30);

    internal.handleRealTransaction({ profit: 0.50 });
    expect(internal.totalProfit).toBeCloseTo(0.80, 2);
  });

  it('reseta martingaleLevel e sai do modo real ao ganhar', () => {
    const { internal } = createService({ initialValue: 0.35 });
    internal.consecutiveLosses = 4;
    internal.martingaleLevel = 4;
    internal.currentStake = 5.60;
    internal.isInRealMode = true;

    internal.handleRealTransaction({ profit: 0.30 });

    // Win na real: sai do modo real e reseta consecutiveLosses para voltar ao ciclo demo
    expect(internal.isInRealMode).toBe(false);
    expect(internal.consecutiveLosses).toBe(0);
    expect(internal.martingaleLevel).toBe(0);
    expect(internal.currentStake).toBe(0.35);
  });

  it('aplica pausa após win quando pauseTimeWin=true', () => {
    const { internal } = createService({ pauseTimeWin: true, pauseTime: 15 });
    internal.isPaused = false;

    internal.handleRealTransaction({ profit: 0.30 });

    expect(internal.isPaused).toBe(true);
    expect(internal.timePause).toBe(15);
  });

  it('nao aplica pausa após win quando pauseTimeWin=false', () => {
    const { internal } = createService({ pauseTimeWin: false, pauseTime: 15 });
    internal.isPaused = false;

    internal.handleRealTransaction({ profit: 0.30 });

    expect(internal.isPaused).toBe(false);
  });
});

// =============================================================================
// 5. handleRealTransaction — Loss
// =============================================================================
describe('handleRealTransaction — Loss', () => {
  it('acumula totalLoss ao perder', () => {
    const { internal } = createService({ initialValue: 0.35, stakeMultiple: 1 });
    internal.totalLoss = 0;

    internal.handleRealTransaction({ profit: -0.35 });
    expect(internal.totalLoss).toBe(0.35);

    internal.handleRealTransaction({ profit: -0.70 });
    expect(internal.totalLoss).toBeCloseTo(1.05, 2);
  });

  it('incrementa martingaleLevel ao perder (consecutiveLosses nao é alterado — é exclusivo da demo)', () => {
    const { internal } = createService({ initialValue: 0.35, stakeMultiple: 1 });
    internal.consecutiveLosses = 0;
    internal.martingaleLevel = 0;

    internal.handleRealTransaction({ profit: -0.35 });
    // consecutiveLosses NAO é incrementado por resultado real
    expect(internal.consecutiveLosses).toBe(0);
    expect(internal.martingaleLevel).toBe(1);
  });

  it('calcula próximo stake via martingale ao perder', () => {
    const { internal } = createService({ initialValue: 0.35, stakeMultiple: 1 });
    internal.consecutiveLosses = 0;
    internal.martingaleLevel = 0;
    internal.currentStake = 0.35;

    // Loss 1: stake deve ir para 0.70
    internal.handleRealTransaction({ profit: -0.35 });
    expect(internal.currentStake).toBe(0.70);

    // Loss 2: stake deve ir para 1.40
    internal.handleRealTransaction({ profit: -0.70 });
    expect(internal.currentStake).toBe(1.40);
  });

  it('aplica pausa após loss quando pauseTimeLoss=true', () => {
    const { internal } = createService({ pauseTimeLoss: true, pauseTime: 10, initialValue: 0.35, stakeMultiple: 1 });
    internal.isPaused = false;

    internal.handleRealTransaction({ profit: -0.35 });

    expect(internal.isPaused).toBe(true);
    expect(internal.timePause).toBe(10);
  });
});

// =============================================================================
// 6. Stop Loss
// =============================================================================
describe('Stop Loss', () => {
  it('para o bot quando totalLoss atinge stopLoss', () => {
    const { internal } = createService({ stopLoss: 1.00, initialValue: 0.35, stakeMultiple: 1 });
    const stopSpy = vi.spyOn(internal, 'stop');

    // Simula losses acumulando até o stopLoss
    internal.totalLoss = 0;
    internal.handleRealTransaction({ profit: -0.50 });
    expect(stopSpy).not.toHaveBeenCalled();

    internal.handleRealTransaction({ profit: -0.60 }); // totalLoss = 1.10 >= 1.00
    expect(stopSpy).toHaveBeenCalled();
  });

  it('nao para quando stopLoss=0 (desativado)', () => {
    const { internal } = createService({ stopLoss: 0, initialValue: 0.35, stakeMultiple: 1 });
    const stopSpy = vi.spyOn(internal, 'stop');

    internal.totalLoss = 0;
    internal.handleRealTransaction({ profit: -100 });
    expect(stopSpy).not.toHaveBeenCalled();
  });
});

// =============================================================================
// 7. Stop Win
// =============================================================================
describe('Stop Win', () => {
  it('para o bot quando totalProfit atinge stopWin', () => {
    const { internal } = createService({ stopWin: 2.00, initialValue: 0.35 });
    const stopSpy = vi.spyOn(internal, 'stop');

    internal.totalProfit = 0;
    internal.handleRealTransaction({ profit: 1.50 });
    expect(stopSpy).not.toHaveBeenCalled();

    internal.handleRealTransaction({ profit: 0.60 }); // totalProfit = 2.10 >= 2.00
    expect(stopSpy).toHaveBeenCalled();
  });

  it('nao para quando stopWin=0 (desativado)', () => {
    const { internal } = createService({ stopWin: 0, initialValue: 0.35 });
    const stopSpy = vi.spyOn(internal, 'stop');

    internal.totalProfit = 0;
    internal.handleRealTransaction({ profit: 1000 });
    expect(stopSpy).not.toHaveBeenCalled();
  });
});

// =============================================================================
// 8. Max Martingale — Reset
// =============================================================================
describe('Max Martingale — Reset', () => {
  it('reseta stake e martingaleLevel quando atinge maxMartingale (onMaxMartingale=reset)', () => {
    const { internal } = createService({
      maxMartingale: 3,
      onMaxMartingale: 'reset',
      initialValue: 0.35,
      stakeMultiple: 1,
    });

    // Simula 3 losses consecutivos para atingir maxMartingale
    internal.handleRealTransaction({ profit: -0.35 }); // level 1
    expect(internal.martingaleLevel).toBe(1);
    expect(internal.currentStake).toBe(0.70);

    internal.handleRealTransaction({ profit: -0.70 }); // level 2
    expect(internal.martingaleLevel).toBe(2);
    expect(internal.currentStake).toBe(1.40);

    internal.handleRealTransaction({ profit: -1.40 }); // level 3 = max -> reset
    expect(internal.martingaleLevel).toBe(0); // resetou
    expect(internal.currentStake).toBe(0.35); // voltou ao inicial
  });

  it('continua operando após reset (nao para o bot)', () => {
    const { internal } = createService({
      maxMartingale: 2,
      onMaxMartingale: 'reset',
      initialValue: 1.00,
      stakeMultiple: 1,
    });
    const stopSpy = vi.spyOn(internal, 'stop');

    internal.handleRealTransaction({ profit: -1.00 }); // level 1
    internal.handleRealTransaction({ profit: -2.00 }); // level 2 = max -> reset

    expect(stopSpy).not.toHaveBeenCalled();
    expect(internal.martingaleLevel).toBe(0);
    expect(internal.currentStake).toBe(1.00);

    // Pode continuar a operar normalmente
    internal.handleRealTransaction({ profit: -1.00 }); // level 1 novamente
    expect(internal.martingaleLevel).toBe(1);
    expect(internal.currentStake).toBe(2.00);
  });
});

// =============================================================================
// 9. Max Martingale — Stop
// =============================================================================
describe('Max Martingale — Stop', () => {
  it('para o bot quando atinge maxMartingale (onMaxMartingale=stop)', () => {
    const { internal } = createService({
      maxMartingale: 2,
      onMaxMartingale: 'stop',
      initialValue: 0.50,
      stakeMultiple: 1,
    });
    const stopSpy = vi.spyOn(internal, 'stop');

    internal.handleRealTransaction({ profit: -0.50 }); // level 1
    expect(stopSpy).not.toHaveBeenCalled();

    internal.handleRealTransaction({ profit: -1.00 }); // level 2 = max -> stop
    expect(stopSpy).toHaveBeenCalled();
  });

  it('nao aplica limite quando maxMartingale=0 (desativado)', () => {
    const { internal } = createService({
      maxMartingale: 0,
      onMaxMartingale: 'stop',
      initialValue: 0.35,
      stakeMultiple: 1,
    });
    const stopSpy = vi.spyOn(internal, 'stop');

    // 10 losses sem parar
    for (let i = 0; i < 10; i++) {
      internal.handleRealTransaction({ profit: -0.35 });
    }
    expect(stopSpy).not.toHaveBeenCalled();
    expect(internal.martingaleLevel).toBe(10);
  });
});

// =============================================================================
// 10. Pause (applyPause)
// =============================================================================
describe('applyPause', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('ativa pausa e define timePause corretamente', () => {
    const { internal } = createService();
    internal.applyPause(30, 'test');

    expect(internal.isPaused).toBe(true);
    expect(internal.timePause).toBe(30);
  });

  it('desativa pausa automaticamente após o tempo expirar', () => {
    const { internal } = createService();
    internal.applyPause(5, 'test');

    expect(internal.isPaused).toBe(true);

    // Avança 5 segundos
    vi.advanceTimersByTime(5000);

    // Após 5s + 1 tick do interval, deve desativar
    vi.advanceTimersByTime(1000);
    expect(internal.isPaused).toBe(false);
    expect(internal.timePause).toBe(0);
  });

  it('bloqueia processamento de sinais durante a pausa', () => {
    const { internal } = createService({ quantityLoss: 0 });
    internal.applyPause(10, 'test');

    expect(internal.shouldProcessSignal()).toBe(false);
  });

  it('decrementa timePause a cada segundo', () => {
    const { internal } = createService();
    internal.applyPause(3, 'test');

    expect(internal.timePause).toBe(3);

    vi.advanceTimersByTime(1000);
    expect(internal.timePause).toBe(2);

    vi.advanceTimersByTime(1000);
    expect(internal.timePause).toBe(1);

    vi.advanceTimersByTime(1000);
    expect(internal.timePause).toBe(0);
  });
});

// =============================================================================
// 11. Fluxo completo — Cenário ZeekBot (Demo loss -> Real trade -> Result)
// =============================================================================
describe('Fluxo completo — cenário típico ZeekBot', () => {
  it('quantityLoss=2: só entra na real após 2 losses na demo', () => {
    const { internal } = createService({ quantityLoss: 2, initialValue: 0.35, stakeMultiple: 1 });
    internal.isPaused = false;

    // Demo loss 1 — ainda não deve processar
    internal.handleDemoTransaction({ amount: -1 });
    expect(internal.consecutiveLosses).toBe(1);
    expect(internal.shouldProcessSignal()).toBe(false);

    // Demo loss 2 — agora deve processar
    internal.handleDemoTransaction({ amount: -1 });
    expect(internal.consecutiveLosses).toBe(2);
    expect(internal.shouldProcessSignal()).toBe(true);
  });

  it('win na demo reseta contador e bloqueia processamento novamente', () => {
    const { internal } = createService({ quantityLoss: 2 });
    internal.consecutiveLosses = 3;
    internal.isPaused = false;

    expect(internal.shouldProcessSignal()).toBe(true);

    // Win na demo reseta
    internal.handleDemoTransaction({ amount: 1 });
    expect(internal.consecutiveLosses).toBe(0);
    expect(internal.shouldProcessSignal()).toBe(false);
  });

  it('sequência completa: demo losses -> real trade win -> volta ao modo demo', () => {
    const { internal } = createService({
      quantityLoss: 2,
      initialValue: 0.35,
      stakeMultiple: 1,
      maxMartingale: 5,
      onMaxMartingale: 'reset',
    });

    // Fase 1: Acumula losses na demo
    internal.handleDemoTransaction({ amount: -1 });
    internal.handleDemoTransaction({ amount: -1 });
    expect(internal.shouldProcessSignal()).toBe(true);
    expect(internal.consecutiveLosses).toBe(2);

    // Simula entrada no modo real (feito pelo handler de tradeSignal)
    internal.isInRealMode = true;

    // Fase 2: Trade real executado — win → sai do modo real
    internal.handleRealTransaction({ profit: 0.30 });
    expect(internal.totalProfit).toBe(0.30);
    expect(internal.isInRealMode).toBe(false);   // voltou ao modo demo
    expect(internal.consecutiveLosses).toBe(0);  // resetado para aguardar novo ciclo
    expect(internal.martingaleLevel).toBe(0);
    expect(internal.currentStake).toBe(0.35);
  });

  it('sequência com martingale: loss real -> stake sobe -> win -> reset', () => {
    const { internal } = createService({
      quantityLoss: 0,
      initialValue: 0.35,
      stakeMultiple: 1,
    });

    // Real loss 1 -> stake sobe para 0.70
    internal.handleRealTransaction({ profit: -0.35 });
    expect(internal.currentStake).toBe(0.70);

    // Real loss 2 -> stake sobe para 1.40
    internal.handleRealTransaction({ profit: -0.70 });
    expect(internal.currentStake).toBe(1.40);

    // Real win -> stake volta para 0.35
    internal.handleRealTransaction({ profit: 1.20 });
    expect(internal.currentStake).toBe(0.35);
    expect(internal.consecutiveLosses).toBe(0);
  });
});

// =============================================================================
// 12. getStats
// =============================================================================
describe('getStats', () => {
  it('retorna dados corretos de martingale', () => {
    const { internal } = createService({
      maxMartingale: 5,
      onMaxMartingale: 'stop',
      initialValue: 1.00,
      stakeMultiple: 1,
    });

    internal.handleRealTransaction({ profit: -1.00 });
    internal.handleRealTransaction({ profit: -2.00 });

    const stats = internal.getStats();
    expect(stats.trading.martingaleLevel).toBe(2);
    expect(stats.trading.maxMartingale).toBe(5);
    expect(stats.trading.onMaxMartingale).toBe('stop');
    expect(stats.trading.currentStake).toBe(4.00);
    // consecutiveLosses = 0 porque resultado real não altera (é exclusivo da demo)
    expect(stats.trading.consecutiveLosses).toBe(0);
  });

  it('contabiliza realTransactions corretamente', () => {
    const { internal } = createService({ initialValue: 0.35, stakeMultiple: 1 });

    internal.processTransaction({ profit: 0.30, amount: 0.30 }, false);
    internal.processTransaction({ profit: -0.35, amount: -0.35 }, false);
    internal.processTransaction({ profit: 0.50, amount: 0.50 }, false);

    const stats = internal.getStats();
    expect(stats.realAccount.totalWin).toBe(2);
    expect(stats.realAccount.totalLoss).toBe(1);
    expect(stats.realAccount.transactions.length).toBe(3);
  });
});

// =============================================================================
// 13. clearAllDados
// =============================================================================
describe('clearAllDados', () => {
  it('reseta todos os estados internos incluindo isInRealMode', () => {
    const { internal } = createService({ initialValue: 0.35, stakeMultiple: 1 });

    // Simula estado sujo
    internal.totalProfit = 10;
    internal.totalLoss = 5;
    internal.isPaused = true;
    internal.consecutiveLosses = 4;
    internal.martingaleLevel = 4;
    internal.currentStake = 5.60;
    internal.isInRealMode = true;

    internal.clearAllDados();

    expect(internal.totalProfit).toBe(0);
    expect(internal.totalLoss).toBe(0);
    expect(internal.isPaused).toBe(false);
    expect(internal.consecutiveLosses).toBe(0);
    expect(internal.martingaleLevel).toBe(0);
    expect(internal.currentStake).toBe(0);
    expect(internal.isInRealMode).toBe(false);
  });
});

// =============================================================================
// 19. isInRealMode — modo real ativo até sair win
// =============================================================================
describe('isInRealMode — permanece na real até win', () => {
  it('inicia como false', () => {
    const { internal } = createService({ quantityLoss: 2 });
    expect(internal.isInRealMode).toBe(false);
  });

  it('shouldProcessSignal retorna true quando isInRealMode=true, independente de consecutiveLosses', () => {
    const { internal } = createService({ quantityLoss: 3 });
    internal.consecutiveLosses = 0; // abaixo do threshold
    internal.isInRealMode = true;
    internal.isPaused = false;

    expect(internal.shouldProcessSignal()).toBe(true);
  });

  it('real loss mantém isInRealMode=true', () => {
    const { internal } = createService({ quantityLoss: 2 });
    internal.isInRealMode = true;

    internal.handleRealTransaction({ profit: -0.35 });

    expect(internal.isInRealMode).toBe(true);
  });

  it('real win desativa isInRealMode e reseta consecutiveLosses', () => {
    const { internal } = createService({ quantityLoss: 2 });
    internal.isInRealMode = true;
    internal.consecutiveLosses = 3;

    internal.handleRealTransaction({ profit: 0.50 });

    expect(internal.isInRealMode).toBe(false);
    expect(internal.consecutiveLosses).toBe(0);
  });

  it('getStats expõe isInRealMode', () => {
    const { internal } = createService({ quantityLoss: 2 });
    internal.isInRealMode = true;

    const stats = internal.getStats();
    expect(stats.trading.isInRealMode).toBe(true);
  });

  it('isPaused sobrepõe isInRealMode — trade bloqueado mesmo em modo real', () => {
    const { internal } = createService({ quantityLoss: 2 });
    internal.isInRealMode = true;
    internal.isPaused = true;

    expect(internal.shouldProcessSignal()).toBe(false);
  });

  it('cenário: 3 losses na real antes do win (trades #1, #2, #3 executados, #4 bloqueado)', async () => {
    const { internal } = createService({ quantityLoss: 1, initialValue: 0.35, stakeMultiple: 1 });

    const handlers: Record<string, Function[]> = {};
    vi.spyOn(internal.wsListener, 'on').mockImplementation((event: string, handler: Function) => {
      if (!handlers[event]) handlers[event] = [];
      handlers[event].push(handler);
      return internal.wsListener;
    });
    const teHandlers: Record<string, Function[]> = {};
    vi.spyOn(internal.tradeExecutor, 'on').mockImplementation((event: string, handler: Function) => {
      if (!teHandlers[event]) teHandlers[event] = [];
      teHandlers[event].push(handler);
      return internal.tradeExecutor;
    });

    internal.setupEventHandlers();
    internal.signalProcessor.processSignal = vi.fn().mockResolvedValue(true);

    const makeSignal = (id: string) => ({
      symbol: 'R_100', contractType: 'CALL', amount: 0.35,
      duration: 5, durationUnit: 't', contractId: id,
      timestamp: new Date().toISOString(), longcode: 'test', isForex: false,
    });
    const emit = (sig: any) => Promise.all((handlers['tradeSignal'] || []).map(h => h(sig)));
    const result = (tx: any) => (teHandlers['transaction'] || []).forEach(h => h(tx));

    // 1 demo loss → entra no modo real
    internal.handleDemoTransaction({ amount: -1 });
    await emit(makeSignal('c1'));
    expect(internal.signalProcessor.processSignal).toHaveBeenCalledTimes(1);

    result({ profit: -0.35 }); // real loss #1
    await emit(makeSignal('c2'));
    expect(internal.signalProcessor.processSignal).toHaveBeenCalledTimes(2);

    result({ profit: -0.70 }); // real loss #2
    await emit(makeSignal('c3'));
    expect(internal.signalProcessor.processSignal).toHaveBeenCalledTimes(3);

    // Real WIN → sai do modo real
    result({ profit: 1.05 });
    expect(internal.isInRealMode).toBe(false);

    // Próximo sinal: bloqueado (precisa de nova sequência demo)
    await emit(makeSignal('c4'));
    expect(internal.signalProcessor.processSignal).toHaveBeenCalledTimes(3); // ainda 3
  });
});

// =============================================================================
// 14. Edge cases
// =============================================================================
describe('Edge cases', () => {
  it('stopLoss e maxMartingale: stopLoss tem prioridade se ambos atingidos ao mesmo tempo', () => {
    const { internal } = createService({
      stopLoss: 1.00,
      maxMartingale: 2,
      onMaxMartingale: 'reset',
      initialValue: 0.50,
      stakeMultiple: 1,
    });
    const stopSpy = vi.spyOn(internal, 'stop');

    // loss 1: totalLoss=0.50, level=1
    internal.handleRealTransaction({ profit: -0.50 });
    expect(stopSpy).not.toHaveBeenCalled();

    // loss 2: totalLoss=1.50 >= stopLoss=1.00, level=2=max (reset), mas stopLoss para
    internal.handleRealTransaction({ profit: -1.00 });
    // O martingale reseta primeiro, depois o stopLoss para
    expect(stopSpy).toHaveBeenCalled();
  });

  it('profit=0 é tratado como loss (nao é positivo)', () => {
    const { internal } = createService({ initialValue: 0.35, stakeMultiple: 1 });
    internal.consecutiveLosses = 0;
    internal.martingaleLevel = 0;

    internal.handleRealTransaction({ profit: 0 });
    // consecutiveLosses não é alterado por resultado real
    expect(internal.consecutiveLosses).toBe(0);
    expect(internal.martingaleLevel).toBe(1);
  });

  it('stakeMultiple=0 mantém stake constante (sem progressão)', () => {
    const { internal } = createService({ initialValue: 0.35, stakeMultiple: 0 });

    // ratio = 1 + 0 = 1
    // 0.35 * 1^N = 0.35 sempre
    internal.consecutiveLosses = 1;
    expect(internal.calculateNextStake()).toBe(0.35);

    internal.consecutiveLosses = 5;
    expect(internal.calculateNextStake()).toBe(0.35);

    internal.consecutiveLosses = 10;
    expect(internal.calculateNextStake()).toBe(0.35);
  });
});

// =============================================================================
// 15. onTrade guard — previne trade real duplicado (bool_89 do ZeekBot)
// =============================================================================
describe('onTrade guard (bool_89)', () => {
  it('inicia com onTrade=false', () => {
    const { internal } = createService();
    expect(internal.onTrade).toBe(false);
  });

  it('clearAllDados reseta onTrade para false', () => {
    const { internal } = createService();
    internal.onTrade = true;
    internal.clearAllDados();
    expect(internal.onTrade).toBe(false);
    expect(internal.contract_id).toBe(null);
  });

  it('getStats expõe onTrade', () => {
    const { internal } = createService();
    internal.onTrade = true;
    const stats = internal.getStats();
    expect(stats.trading.onTrade).toBe(true);
  });
});

// =============================================================================
// 16. setupEventHandlers — simulação de fluxo de sinais com onTrade
// =============================================================================
describe('setupEventHandlers — proteção contra duplicatas', () => {
  /**
   * Cria um service com mocks mais controlados para testar o fluxo de eventos.
   * Intercepta os listeners registrados para poder disparar eventos manualmente.
   */
  function createServiceWithEventControl(config: Record<string, any> = {}) {
    const { service, internal } = createService(config);

    // Captura os handlers registrados nos event emitters
    const wsListenerHandlers: Record<string, Function[]> = {};
    const tradeExecutorHandlers: Record<string, Function[]> = {};

    // Intercepta os .on() do wsListener
    const originalWsOn = internal.wsListener.on.bind(internal.wsListener);
    vi.spyOn(internal.wsListener, 'on').mockImplementation((event: string, handler: Function) => {
      if (!wsListenerHandlers[event]) wsListenerHandlers[event] = [];
      wsListenerHandlers[event].push(handler);
      return internal.wsListener;
    });

    // Intercepta os .on() do tradeExecutor
    const originalTeOn = internal.tradeExecutor.on.bind(internal.tradeExecutor);
    vi.spyOn(internal.tradeExecutor, 'on').mockImplementation((event: string, handler: Function) => {
      if (!tradeExecutorHandlers[event]) tradeExecutorHandlers[event] = [];
      tradeExecutorHandlers[event].push(handler);
      return internal.tradeExecutor;
    });

    // Re-setup handlers com os mocks
    internal.setupEventHandlers();

    // Mock do signalProcessor.processSignal para não fazer chamada WS real
    let processSignalResolve: Function | null = null;
    const processSignalMock = vi.fn().mockImplementation(() => {
      return new Promise((resolve) => {
        processSignalResolve = resolve;
      });
    });
    internal.signalProcessor.processSignal = processSignalMock;

    return {
      service,
      internal,
      wsListenerHandlers,
      tradeExecutorHandlers,
      processSignalMock,
      resolveProcessSignal: () => {
        if (processSignalResolve) processSignalResolve(true);
      },
      emitTradeSignal: (signal: any) => {
        const handlers = wsListenerHandlers['tradeSignal'] || [];
        return Promise.all(handlers.map(h => h(signal)));
      },
      emitSellTransaction: (transaction: any) => {
        const handlers = wsListenerHandlers['sellTransaction'] || [];
        handlers.forEach(h => h(transaction));
      },
      emitRealTransaction: (transaction: any) => {
        const handlers = tradeExecutorHandlers['transaction'] || [];
        handlers.forEach(h => h(transaction));
      },
    };
  }

  it('seta onTrade=true ANTES de executar processSignal', async () => {
    const ctx = createServiceWithEventControl({ quantityLoss: 0 });
    ctx.internal.isPaused = false;
    ctx.internal.onTrade = false;

    const signal = {
      symbol: 'R_100',
      contractType: 'CALL',
      amount: 0.35,
      duration: 5,
      durationUnit: 't',
      contractId: 'contract_123',
      timestamp: new Date().toISOString(),
      longcode: 'test',
      isForex: false,
    };

    // Inicia o processamento (não resolve ainda)
    const promise = ctx.emitTradeSignal(signal);

    // processSignal foi chamado mas não resolveu ainda
    // onTrade deve já estar true
    expect(ctx.internal.onTrade).toBe(true);
    expect(ctx.internal.contract_id).toBe('contract_123');

    // Resolve o processSignal
    ctx.resolveProcessSignal();
    await promise;

    // onTrade continua true até o trade real completar
    expect(ctx.internal.onTrade).toBe(true);
  });

  it('bloqueia segundo sinal enquanto onTrade=true (previne duplicata)', async () => {
    const ctx = createServiceWithEventControl({ quantityLoss: 0 });
    ctx.internal.isPaused = false;
    ctx.internal.onTrade = false;

    const signal1 = {
      symbol: 'R_100', contractType: 'CALL', amount: 0.35,
      duration: 5, durationUnit: 't', contractId: 'contract_1',
      timestamp: new Date().toISOString(), longcode: 'test', isForex: false,
    };
    const signal2 = {
      symbol: 'R_100', contractType: 'PUT', amount: 0.35,
      duration: 5, durationUnit: 't', contractId: 'contract_2',
      timestamp: new Date().toISOString(), longcode: 'test2', isForex: false,
    };

    // Sinal 1: inicia trade
    const promise1 = ctx.emitTradeSignal(signal1);
    expect(ctx.processSignalMock).toHaveBeenCalledTimes(1);
    expect(ctx.internal.onTrade).toBe(true);

    // Sinal 2: chega enquanto sinal 1 está em andamento
    ctx.resolveProcessSignal();
    await promise1;

    // onTrade ainda true (aguardando resultado da real)
    const promise2 = ctx.emitTradeSignal(signal2);
    await promise2;

    // processSignal NÃO deve ter sido chamado para o sinal 2
    expect(ctx.processSignalMock).toHaveBeenCalledTimes(1);
  });

  it('libera onTrade quando tradeExecutor emite transaction (trade completo)', async () => {
    const ctx = createServiceWithEventControl({ quantityLoss: 0 });
    ctx.internal.isPaused = false;
    ctx.internal.onTrade = false;

    const signal = {
      symbol: 'R_100', contractType: 'CALL', amount: 0.35,
      duration: 5, durationUnit: 't', contractId: 'contract_1',
      timestamp: new Date().toISOString(), longcode: 'test', isForex: false,
    };

    // Executa trade
    const promise = ctx.emitTradeSignal(signal);
    ctx.resolveProcessSignal();
    await promise;

    expect(ctx.internal.onTrade).toBe(true);

    // Resultado do trade real chega
    ctx.emitRealTransaction({ profit: 0.30 });

    // onTrade deve ser liberado
    expect(ctx.internal.onTrade).toBe(false);
  });

  it('permite novo trade após resultado da real liberar onTrade', async () => {
    const ctx = createServiceWithEventControl({ quantityLoss: 0 });
    ctx.internal.isPaused = false;

    const signal1 = {
      symbol: 'R_100', contractType: 'CALL', amount: 0.35,
      duration: 5, durationUnit: 't', contractId: 'contract_1',
      timestamp: new Date().toISOString(), longcode: 'test', isForex: false,
    };

    // Trade 1
    let promise = ctx.emitTradeSignal(signal1);
    ctx.resolveProcessSignal();
    await promise;
    expect(ctx.processSignalMock).toHaveBeenCalledTimes(1);

    // Resultado real libera guard
    ctx.emitRealTransaction({ profit: 0.30 });
    expect(ctx.internal.onTrade).toBe(false);

    // Trade 2: agora deve ser aceito
    const signal2 = {
      symbol: 'R_100', contractType: 'PUT', amount: 0.35,
      duration: 5, durationUnit: 't', contractId: 'contract_2',
      timestamp: new Date().toISOString(), longcode: 'test2', isForex: false,
    };

    promise = ctx.emitTradeSignal(signal2);
    ctx.resolveProcessSignal();
    await promise;

    expect(ctx.processSignalMock).toHaveBeenCalledTimes(2);
  });

  it('libera onTrade em caso de erro no processSignal', async () => {
    const ctx = createServiceWithEventControl({ quantityLoss: 0 });
    ctx.internal.isPaused = false;

    // Faz processSignal rejeitar
    ctx.processSignalMock.mockRejectedValueOnce(new Error('Falha de conexão'));

    const signal = {
      symbol: 'R_100', contractType: 'CALL', amount: 0.35,
      duration: 5, durationUnit: 't', contractId: 'contract_1',
      timestamp: new Date().toISOString(), longcode: 'test', isForex: false,
    };

    const promise = ctx.emitTradeSignal(signal);
    await promise;

    // Guard deve ser liberado após erro
    expect(ctx.internal.onTrade).toBe(false);
    expect(ctx.internal.contract_id).toBe(null);
  });

  it('sellTransaction ignorada quando onTrade=true', () => {
    const ctx = createServiceWithEventControl({ quantityLoss: 2 });
    ctx.internal.isPaused = false;
    ctx.internal.onTrade = true;
    ctx.internal.consecutiveLosses = 0;

    // Sell da demo chega enquanto trade real ativo
    ctx.emitSellTransaction({ contract_id: 'other_contract', amount: -1 });

    // Não deve ter incrementado consecutiveLosses (foi ignorado)
    expect(ctx.internal.consecutiveLosses).toBe(0);
  });

  it('sellTransaction com mesmo contract_id é ignorada (contrato copiado)', () => {
    const ctx = createServiceWithEventControl({ quantityLoss: 2 });
    ctx.internal.isPaused = false;
    ctx.internal.onTrade = false;
    ctx.internal.contract_id = 'contract_abc';
    ctx.internal.consecutiveLosses = 0;

    // Sell do contrato que foi copiado
    ctx.emitSellTransaction({ contract_id: 'contract_abc', amount: -1 });

    expect(ctx.internal.consecutiveLosses).toBe(0);
  });

  it('sellTransaction processada normalmente quando onTrade=false e contract_id diferente', () => {
    const ctx = createServiceWithEventControl({ quantityLoss: 2 });
    ctx.internal.isPaused = false;
    ctx.internal.onTrade = false;
    ctx.internal.contract_id = 'contract_abc';
    ctx.internal.consecutiveLosses = 0;

    // Sell de outro contrato demo
    ctx.emitSellTransaction({ contract_id: 'other_contract', amount: -1 });

    // Deve ter processado e incrementado consecutiveLosses
    expect(ctx.internal.consecutiveLosses).toBe(1);
  });
});

// =============================================================================
// 17. Reprodução do cenário do error.md — duas entradas REAL consecutivas
// =============================================================================
describe('Reprodução bug: dois trades reais consecutivos', () => {
  it('cenário error.md: dois sinais rápidos NÃO resultam em dois trades reais', async () => {
    // Simula o cenário: quantityLoss=2, após 2 demo losses,
    // dois sinais chegam em sequência rápida
    const { internal } = createService({ quantityLoss: 0, initialValue: 0.35, stakeMultiple: 1 });

    // Captura handlers
    const handlers: Record<string, Function[]> = {};
    vi.spyOn(internal.wsListener, 'on').mockImplementation((event: string, handler: Function) => {
      if (!handlers[event]) handlers[event] = [];
      handlers[event].push(handler);
      return internal.wsListener;
    });
    const teHandlers: Record<string, Function[]> = {};
    vi.spyOn(internal.tradeExecutor, 'on').mockImplementation((event: string, handler: Function) => {
      if (!teHandlers[event]) teHandlers[event] = [];
      teHandlers[event].push(handler);
      return internal.tradeExecutor;
    });

    internal.setupEventHandlers();

    let callCount = 0;
    internal.signalProcessor.processSignal = vi.fn().mockImplementation(() => {
      callCount++;
      return Promise.resolve(true);
    });

    internal.isPaused = false;
    internal.onTrade = false;

    const makeSignal = (id: string) => ({
      symbol: 'R_100', contractType: 'CALL', amount: 0.35,
      duration: 5, durationUnit: 't', contractId: id,
      timestamp: new Date().toISOString(), longcode: 'test', isForex: false,
    });

    // Dois sinais disparados quase simultaneamente
    const p1 = Promise.all((handlers['tradeSignal'] || []).map(h => h(makeSignal('c1'))));
    const p2 = Promise.all((handlers['tradeSignal'] || []).map(h => h(makeSignal('c2'))));

    await Promise.all([p1, p2]);

    // Apenas 1 trade deve ter sido executado
    expect(callCount).toBe(1);
    expect(internal.onTrade).toBe(true); // ainda aguardando resultado
  });
});

// =============================================================================
// 18. Reprodução exata do error.md — quantityLoss=2, consecutiveLosses não reseta
// =============================================================================
describe('Reprodução error.md: quantityLoss=2 e reentrada indevida', () => {

  it('isInRealMode é ativado quando tradeSignal consome o threshold', async () => {
    const { internal } = createService({ quantityLoss: 2, initialValue: 0.35, stakeMultiple: 1 });

    const handlers: Record<string, Function[]> = {};
    vi.spyOn(internal.wsListener, 'on').mockImplementation((event: string, handler: Function) => {
      if (!handlers[event]) handlers[event] = [];
      handlers[event].push(handler);
      return internal.wsListener;
    });
    const teHandlers: Record<string, Function[]> = {};
    vi.spyOn(internal.tradeExecutor, 'on').mockImplementation((event: string, handler: Function) => {
      if (!teHandlers[event]) teHandlers[event] = [];
      teHandlers[event].push(handler);
      return internal.tradeExecutor;
    });

    internal.setupEventHandlers();
    internal.signalProcessor.processSignal = vi.fn().mockResolvedValue(true);

    // 2 losses na demo → threshold atingido
    internal.handleDemoTransaction({ amount: -1 });
    internal.handleDemoTransaction({ amount: -1 });
    expect(internal.consecutiveLosses).toBe(2);
    expect(internal.shouldProcessSignal()).toBe(true);

    // tradeSignal dispara → entra no modo real
    const signal = {
      symbol: 'R_100', contractType: 'CALL', amount: 0.35,
      duration: 5, durationUnit: 't', contractId: 'c1',
      timestamp: new Date().toISOString(), longcode: 'test', isForex: false,
    };
    await Promise.all((handlers['tradeSignal'] || []).map(h => h(signal)));

    // isInRealMode ativado; consecutiveLosses mantido (não é resetado aqui)
    expect(internal.isInRealMode).toBe(true);
    expect(internal.consecutiveLosses).toBe(2);
    expect(internal.onTrade).toBe(true);
    expect(internal.signalProcessor.processSignal).toHaveBeenCalledTimes(1);
  });

  it('após real loss, shouldProcessSignal retorna true (modo real ativo até sair win)', async () => {
    const { internal } = createService({ quantityLoss: 2, initialValue: 0.35, stakeMultiple: 1 });

    const handlers: Record<string, Function[]> = {};
    vi.spyOn(internal.wsListener, 'on').mockImplementation((event: string, handler: Function) => {
      if (!handlers[event]) handlers[event] = [];
      handlers[event].push(handler);
      return internal.wsListener;
    });
    const teHandlers: Record<string, Function[]> = {};
    vi.spyOn(internal.tradeExecutor, 'on').mockImplementation((event: string, handler: Function) => {
      if (!teHandlers[event]) teHandlers[event] = [];
      teHandlers[event].push(handler);
      return internal.tradeExecutor;
    });

    internal.setupEventHandlers();
    internal.signalProcessor.processSignal = vi.fn().mockResolvedValue(true);

    const makeSignal = (id: string) => ({
      symbol: 'R_100', contractType: 'CALL', amount: 0.35,
      duration: 5, durationUnit: 't', contractId: id,
      timestamp: new Date().toISOString(), longcode: 'test', isForex: false,
    });

    // 2 demo losses → entra na real (isInRealMode=true)
    internal.handleDemoTransaction({ amount: -1 });
    internal.handleDemoTransaction({ amount: -1 });
    await Promise.all((handlers['tradeSignal'] || []).map(h => h(makeSignal('c1'))));
    expect(internal.signalProcessor.processSignal).toHaveBeenCalledTimes(1);
    expect(internal.isInRealMode).toBe(true);

    // Real loss chega → libera guard, mas permanece no modo real
    const txHandlers = teHandlers['transaction'] || [];
    txHandlers.forEach(h => h({ profit: -0.35 }));
    expect(internal.onTrade).toBe(false);
    expect(internal.isInRealMode).toBe(true); // ainda no modo real

    // shouldProcessSignal deve ser true — continua operando na real
    expect(internal.shouldProcessSignal()).toBe(true);

    // Próximo sinal DEVE entrar na real (sem precisar de mais demo losses)
    await Promise.all((handlers['tradeSignal'] || []).map(h => h(makeSignal('c2'))));
    expect(internal.signalProcessor.processSignal).toHaveBeenCalledTimes(2); // executou novamente
  });

  it('simulação completa: DEMO LOSE x2 → REAL LOSE → REAL LOSE → REAL WIN → volta demo', async () => {
    const { internal } = createService({ quantityLoss: 2, initialValue: 0.35, stakeMultiple: 1 });

    const handlers: Record<string, Function[]> = {};
    vi.spyOn(internal.wsListener, 'on').mockImplementation((event: string, handler: Function) => {
      if (!handlers[event]) handlers[event] = [];
      handlers[event].push(handler);
      return internal.wsListener;
    });
    const teHandlers: Record<string, Function[]> = {};
    vi.spyOn(internal.tradeExecutor, 'on').mockImplementation((event: string, handler: Function) => {
      if (!teHandlers[event]) teHandlers[event] = [];
      teHandlers[event].push(handler);
      return internal.tradeExecutor;
    });

    internal.setupEventHandlers();
    internal.signalProcessor.processSignal = vi.fn().mockResolvedValue(true);

    const makeSignal = (id: string) => ({
      symbol: 'R_100', contractType: 'CALL', amount: 0.35,
      duration: 5, durationUnit: 't', contractId: id,
      timestamp: new Date().toISOString(), longcode: 'test', isForex: false,
    });
    const emitTradeSignal = (sig: any) => Promise.all((handlers['tradeSignal'] || []).map(h => h(sig)));
    const emitRealResult = (tx: any) => (teHandlers['transaction'] || []).forEach(h => h(tx));

    // === Fase 1: aguarda 2 demo losses ===
    internal.handleDemoTransaction({ amount: -1 });
    internal.handleDemoTransaction({ amount: -1 });
    expect(internal.consecutiveLosses).toBe(2);
    expect(internal.isInRealMode).toBe(false);

    // Trade signal → entra no modo real (trade #1)
    await emitTradeSignal(makeSignal('c1'));
    expect(internal.signalProcessor.processSignal).toHaveBeenCalledTimes(1);
    expect(internal.isInRealMode).toBe(true);

    // === Fase 2: Real LOSE → permanece no modo real ===
    emitRealResult({ profit: -0.35 });
    expect(internal.onTrade).toBe(false);
    expect(internal.isInRealMode).toBe(true); // continua no modo real

    // Próximo sinal → entra na real sem precisar de mais demo losses (trade #2)
    await emitTradeSignal(makeSignal('c2'));
    expect(internal.signalProcessor.processSignal).toHaveBeenCalledTimes(2);
    expect(internal.isInRealMode).toBe(true);

    // === Fase 3: Real LOSE novamente → ainda no modo real ===
    emitRealResult({ profit: -0.70 });
    expect(internal.isInRealMode).toBe(true);

    // Próximo sinal → entra na real (trade #3)
    await emitTradeSignal(makeSignal('c3'));
    expect(internal.signalProcessor.processSignal).toHaveBeenCalledTimes(3);

    // === Fase 4: Real WIN → sai do modo real, volta ao ciclo demo ===
    emitRealResult({ profit: 1.20 });
    expect(internal.onTrade).toBe(false);
    expect(internal.isInRealMode).toBe(false);  // modo real encerrado
    expect(internal.consecutiveLosses).toBe(0); // resetado para novo ciclo
    expect(internal.martingaleLevel).toBe(0);

    // Próximo sinal NÃO deve entrar (precisa de 2 demo losses novamente)
    await emitTradeSignal(makeSignal('c4'));
    expect(internal.signalProcessor.processSignal).toHaveBeenCalledTimes(3); // ainda 3
  });

  it('handleRealTransaction: loss mantém consecutiveLosses, win reseta para 0', () => {
    const { internal } = createService({ quantityLoss: 2, initialValue: 0.35, stakeMultiple: 1 });
    internal.consecutiveLosses = 5;
    internal.isInRealMode = true;

    // Real loss → consecutiveLosses intocado, modo real persiste
    internal.handleRealTransaction({ profit: -0.35 });
    expect(internal.consecutiveLosses).toBe(5);
    expect(internal.isInRealMode).toBe(true);

    // Real win → consecutiveLosses resetado, sai do modo real
    internal.handleRealTransaction({ profit: 0.30 });
    expect(internal.consecutiveLosses).toBe(0);
    expect(internal.isInRealMode).toBe(false);

    // Real profit=0 (tratado como loss) → consecutiveLosses intocado
    internal.consecutiveLosses = 3;
    internal.handleRealTransaction({ profit: 0 });
    expect(internal.consecutiveLosses).toBe(3);
  });

  it('com quantityLoss=0, consecutiveLosses nao é resetado no tradeSignal (modo direto)', async () => {
    const { internal } = createService({ quantityLoss: 0, initialValue: 0.35 });

    const handlers: Record<string, Function[]> = {};
    vi.spyOn(internal.wsListener, 'on').mockImplementation((event: string, handler: Function) => {
      if (!handlers[event]) handlers[event] = [];
      handlers[event].push(handler);
      return internal.wsListener;
    });
    const teHandlers: Record<string, Function[]> = {};
    vi.spyOn(internal.tradeExecutor, 'on').mockImplementation((event: string, handler: Function) => {
      if (!teHandlers[event]) teHandlers[event] = [];
      teHandlers[event].push(handler);
      return internal.tradeExecutor;
    });

    internal.setupEventHandlers();
    internal.signalProcessor.processSignal = vi.fn().mockResolvedValue(true);

    // Com quantityLoss=0, consecutiveLosses não é usado para threshold
    // então não precisa ser resetado
    internal.consecutiveLosses = 99;

    const signal = {
      symbol: 'R_100', contractType: 'CALL', amount: 0.35,
      duration: 5, durationUnit: 't', contractId: 'c1',
      timestamp: new Date().toISOString(), longcode: 'test', isForex: false,
    };
    await Promise.all((handlers['tradeSignal'] || []).map(h => h(signal)));

    // Não deve resetar quando quantityLoss=0
    expect(internal.consecutiveLosses).toBe(99);
    expect(internal.signalProcessor.processSignal).toHaveBeenCalledTimes(1);
  });
});

// =============================================================================
// 8. Suporte Híbrido Deriv (Legacy vs New API)
// =============================================================================
describe('Suporte Híbrido Deriv (Legacy vs New API)', () => {
  it('deve extrair o symbol corretamente a partir de underlying_symbol (API Nova)', () => {
    const { internal } = createService();
    const wsInternal = internal.wsListener as any;

    const mockMessage = {
      msg_type: 'transaction',
      transaction: {
        action: 'buy',
        underlying_symbol: 'R_100',
        contract_id: '1234',
        amount: -10,
        longcode: 'Win payout if Volatility 100 Index is strictly higher than entry spot.'
      }
    };

    let signalEmitted: any = null;
    wsInternal.on('tradeSignal', (signal: any) => {
      signalEmitted = signal;
    });

    // Mockar ws.send para evitar erros já que processMessage chama `this.ws.send` no `action == 'buy'`
    wsInternal.ws = { send: vi.fn() };

    wsInternal.processMessage(JSON.stringify(mockMessage));

    // O fallback `transaction.underlying_symbol || transaction.symbol` deve resultar em 'R_100'
    expect(signalEmitted).not.toBeNull();
    expect(signalEmitted.symbol).toBe('R_100');
  });

  it('deve extrair o symbol corretamente a partir de symbol (API Legada)', () => {
    const { internal } = createService();
    const wsInternal = internal.wsListener as any;

    const mockMessage = {
      msg_type: 'transaction',
      transaction: {
        action: 'buy',
        symbol: 'R_50',
        contract_id: '5678',
        amount: -10,
        longcode: 'Win payout if Volatility 50 Index is strictly higher than entry spot.'
      }
    };

    let signalEmitted: any = null;
    wsInternal.on('tradeSignal', (signal: any) => {
      signalEmitted = signal;
    });

    wsInternal.ws = { send: vi.fn() };

    wsInternal.processMessage(JSON.stringify(mockMessage));

    expect(signalEmitted).not.toBeNull();
    expect(signalEmitted.symbol).toBe('R_50');
  });

  it('deve converter profit recebido como string para number (API Nova - proposal_open_contract)', () => {
    const { internal } = createService();
    const wsInternal = internal.wsListener as any;

    const mockMessage = {
      msg_type: 'proposal_open_contract',
      proposal_open_contract: {
        contract_id: '1234',
        status: 'won',
        profit: "15.50" // String na nova API
      }
    };

    let resultEmitted: any = null;
    wsInternal.on('contractResult', (res: any) => {
      resultEmitted = res;
    });

    wsInternal.processMessage(JSON.stringify(mockMessage));

    expect(resultEmitted).not.toBeNull();
    expect(resultEmitted.profit).toBe(15.5); // Number processado
    expect(typeof resultEmitted.profit).toBe('number');
  });
});
