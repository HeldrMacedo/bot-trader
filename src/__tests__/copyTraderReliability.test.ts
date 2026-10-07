import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FakeWs, flush, resolveMock, demoBuy, settled } from './copyTraderTestHarness';

vi.mock('ws', async () => ({ default: (await import('./copyTraderTestHarness')).FakeWs }));
vi.mock('../app/services/derivConfig', async () => ({
  resolveDerivConnection: (await import('./copyTraderTestHarness')).resolveMock,
}));

import { CopyTradingService } from '../app/services/copyTradingService';

/**
 * Regressões dos bugs do copy trader (BotTrader). Cada teste BUG-NN nasceu
 * como reprodução da falha (vermelho) antes da correção correspondente.
 */

async function boot(config: Record<string, any> = {}) {
  const service = new CopyTradingService('demoTok', 'realTok', 'sessao-1', {
    quantityLoss: 0,
    initialValue: 0.35,
    stakeMultiple: 1,
    ...config,
  });
  const started = service.start();
  await flush();
  FakeWs.last('real').open();
  await started;
  await flush();
  FakeWs.last('demo').open();
  return { service, internal: service as any };
}

function realBuys() {
  return FakeWs.byKind('real').flatMap((s) => s.sentOf('buy'));
}

async function signal(contractId: number, overrides: Record<string, any> = {}) {
  FakeWs.last('demo').receive(demoBuy(contractId, overrides));
  await flush();
}

beforeEach(() => {
  vi.useFakeTimers();
  FakeWs.reset();
  resolveMock.mockClear();
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('cenário base (controle): o harness reproduz o fluxo feliz', () => {
  it('sinal da demo vira uma compra na real e o resultado libera o guard', async () => {
    const { internal } = await boot();

    await signal(1);
    expect(realBuys()).toHaveLength(1);
    expect(realBuys()[0].parameters).toMatchObject({ contract_type: 'DIGITDIFF', barrier: '5', underlying_symbol: 'R_100' });
    expect(internal.onTrade).toBe(true);

    FakeWs.last('real').receive({ msg_type: 'buy', buy: { contract_id: 900 } });
    FakeWs.last('real').receive(settled(900, 0.3));
    expect(internal.onTrade).toBe(false);
    expect(internal.realTransactions).toHaveLength(1);
  });
});

describe('Reconexão do WebSocket durante ordem ativa', () => {
  it('BUG-01: após queda da real com contrato aberto, a nova conexão reassina o contrato', async () => {
    const { internal } = await boot();
    await signal(1);
    const first = FakeWs.last('real');
    first.receive({ msg_type: 'buy', buy: { contract_id: 900 } });

    first.drop();
    await vi.advanceTimersByTimeAsync(5000);
    const second = FakeWs.last('real');
    expect(second).not.toBe(first);
    second.open();

    // O resultado do contrato 900 só chega por proposal_open_contract; sem reassinar,
    // onTrade fica true para sempre e o bot nunca mais copia.
    expect(second.sentOf('proposal_open_contract').map((m) => m.contract_id)).toContain(900);
    expect(internal.onTrade).toBe(true);
  });

  it('BUG-01: resultado recebido pela nova conexão libera o guard e entra no histórico', async () => {
    const { internal } = await boot();
    await signal(1);
    FakeWs.last('real').receive({ msg_type: 'buy', buy: { contract_id: 900 } });

    FakeWs.last('real').drop();
    await vi.advanceTimersByTimeAsync(5000);
    FakeWs.last('real').open();
    FakeWs.last('real').receive(settled(900, -0.35));

    expect(internal.onTrade).toBe(false);
    expect(internal.realTransactions.map((t: any) => t.contract_id)).toEqual([900]);
  });

  it('BUG-01: token clássico só reassina o contrato depois do authorize OK', async () => {
    const { internal } = await boot();
    await signal(1);
    FakeWs.last('real').receive({ msg_type: 'buy', buy: { contract_id: 900 } });

    resolveMock.mockResolvedValueOnce({ url: 'wss://fake/real', needsAuthorize: true, token: 'tok-classico' });
    FakeWs.last('real').drop();
    await vi.advanceTimersByTimeAsync(5000);
    const second = FakeWs.last('real');
    second.open();
    expect(second.sentOf('proposal_open_contract')).toHaveLength(0);

    second.receive({ msg_type: 'authorize', authorize: { balance: 10 } });
    expect(second.sentOf('proposal_open_contract')).toEqual([{ proposal_open_contract: 1, contract_id: 900, subscribe: 1 }]);
    expect(internal.onTrade).toBe(true);
  });

  it('BUG-01: contrato já liquidado não é reassinado na reconexão', async () => {
    await boot();
    await signal(1);
    FakeWs.last('real').receive({ msg_type: 'buy', buy: { contract_id: 900 } });
    FakeWs.last('real').receive(settled(900, 0.3));

    FakeWs.last('real').drop();
    await vi.advanceTimersByTimeAsync(5000);
    FakeWs.last('real').open();

    expect(FakeWs.last('real').sentOf('proposal_open_contract')).toHaveLength(0);
  });

  it('BUG-02: stop() não deixa conexão real reaberta (socket zumbi)', async () => {
    const { service } = await boot();
    service.stop();
    await vi.advanceTimersByTimeAsync(60_000);
    for (const s of FakeWs.byKind('real')) if (!s.opened && !s.closed) s.open();

    expect(FakeWs.byKind('real')).toHaveLength(1);
    expect(FakeWs.live('real')).toHaveLength(0);
  });

  it('BUG-03: falha na conexão inicial não gera duas conexões reais vivas', async () => {
    const service = new CopyTradingService('demoTok', 'realTok', 'sessao-1', { quantityLoss: 0 });
    const started = service.start();
    await flush();
    FakeWs.last('real').drop();

    // retry do connectMasterWithRetry (2s) e attemptReconnect (5s) correm em paralelo
    await vi.advanceTimersByTimeAsync(2000);
    FakeWs.last('real').open();
    await started;
    await vi.advanceTimersByTimeAsync(3000);
    for (const s of FakeWs.byKind('real')) if (!s.opened && !s.closed) s.open();

    expect(FakeWs.live('real')).toHaveLength(1);
  });

  it('BUG-02: stop() com reconexão agendada cancela a reconexão', async () => {
    const { service } = await boot();
    FakeWs.last('real').drop();
    service.stop();
    await vi.advanceTimersByTimeAsync(60_000);

    expect(FakeWs.byKind('real')).toHaveLength(1);
  });

  it('BUG-03: reconexão agendada é dispensada se o executeTrade já reconectou', async () => {
    await boot();
    FakeWs.last('real').drop();

    await signal(1); // executeTrade reconecta antes do timer de 5s
    FakeWs.last('real').open();
    await flush();
    expect(realBuys()).toHaveLength(1);
    // Responde e liquida: sem isso o timeout do buy (BUG-07) pararia o bot e fecharia o socket
    FakeWs.last('real').receive({ msg_type: 'buy', buy: { contract_id: 900 } });
    FakeWs.last('real').receive(settled(900, 0.3));

    await vi.advanceTimersByTimeAsync(60_000);
    for (const s of FakeWs.byKind('real')) if (!s.opened && !s.closed) s.open();
    expect(FakeWs.byKind('real')).toHaveLength(2);
    expect(FakeWs.live('real')).toHaveLength(1);
  });

  it('BUG-03: reconexão continua com backoff quando uma tentativa falha antes de abrir', async () => {
    await boot();
    FakeWs.last('real').drop();
    await vi.advanceTimersByTimeAsync(5000);
    FakeWs.last('real').drop(); // tentativa 1 falha
    await vi.advanceTimersByTimeAsync(10_000);
    FakeWs.last('real').open(); // tentativa 2 abre
    await vi.advanceTimersByTimeAsync(60_000);
    for (const s of FakeWs.byKind('real')) if (!s.opened && !s.closed) s.open();

    expect(FakeWs.byKind('real')).toHaveLength(3);
    expect(FakeWs.live('real')).toHaveLength(1);
  });

  it('BUG-03: socket substituído que fecha depois não derruba o estado da conexão atual', async () => {
    const { internal } = await boot();
    const ex = internal.tradeExecutor;
    const old = FakeWs.last('real');
    const p = ex.connectToMaster(); // nova conexão substitui a anterior
    await flush();
    FakeWs.last('real').open();
    await p;

    old.emit('close');
    await vi.advanceTimersByTimeAsync(60_000);
    expect(ex.isConnected).toBe(true);
    expect(FakeWs.byKind('real')).toHaveLength(2);
    expect(old.closed).toBe(true);
  });

  it('BUG-04: listener demo continua tentando reconectar após falha ao resolver a conexão', async () => {
    const { internal } = await boot();
    resolveMock.mockRejectedValueOnce(new Error('Falha ao gerar OTP da Deriv (503)'));

    FakeWs.last('demo').drop();
    await vi.advanceTimersByTimeAsync(5000); // 1ª tentativa: OTP falha
    await vi.advanceTimersByTimeAsync(60_000);

    expect(internal.isRunning).toBe(true);
    const demoAttempts = resolveMock.mock.calls.filter((c) => c[1] === 'demo').length;
    expect(demoAttempts).toBeGreaterThan(2); // inicial + falha + nova tentativa
    expect(FakeWs.byKind('demo').length).toBeGreaterThan(1);
  });
});

describe('Ciclo de vida start/stop', () => {
  it('BUG-17: stop() durante a conexão inicial da real cancela o start', async () => {
    const service = new CopyTradingService('demoTok', 'realTok', 'sessao-1', { quantityLoss: 0 });
    const outcome = service.start().then(() => 'ok', (e) => e.message);
    await flush();
    service.stop();
    await vi.advanceTimersByTimeAsync(60_000);
    for (const s of FakeWs.sockets) if (!s.opened && !s.closed) s.open();
    await flush();

    expect(await outcome).toBe('Copy trading parado durante a conexão');
    expect((service as any).isRunning).toBe(false);
    expect(FakeWs.live('real')).toHaveLength(0);
    expect(FakeWs.byKind('demo')).toHaveLength(0);
  });

  it('BUG-17: stop() entre tentativas do retry não tenta de novo', async () => {
    resolveMock.mockRejectedValueOnce(new Error('Falha ao gerar OTP da Deriv (503)'));
    const service = new CopyTradingService('demoTok', 'realTok', 'sessao-1', { quantityLoss: 0 });
    (service as any).tradeExecutor.on('error', () => {});
    const outcome = service.start().then(() => 'ok', (e) => e.message);
    await flush();
    service.stop(); // durante a espera de 2s antes da tentativa 2
    await vi.advanceTimersByTimeAsync(60_000);

    expect(await outcome).toBe('Copy trading parado durante a conexão');
    expect(FakeWs.sockets).toHaveLength(0);
    expect(resolveMock).toHaveBeenCalledTimes(1);
  });
});

describe('Conexão da conta demo', () => {
  it('BUG-04: falha na conexão inicial da demo é tentada de novo', async () => {
    resolveMock.mockImplementation(async (token: string, accountType: 'demo' | 'real') => {
      if (accountType === 'demo' && resolveMock.mock.calls.filter((c) => c[1] === 'demo').length === 1) {
        throw new Error('Falha ao gerar OTP da Deriv (503)');
      }
      return { url: `wss://fake/${accountType}`, needsAuthorize: false, token };
    });
    try {
      const service = new CopyTradingService('demoTok', 'realTok', 'sessao-1', { quantityLoss: 0 });
      const started = service.start();
      await flush();
      FakeWs.last('real').open();
      await started;
      await flush();
      expect(FakeWs.byKind('demo')).toHaveLength(0);

      await vi.advanceTimersByTimeAsync(5000);
      expect(FakeWs.byKind('demo')).toHaveLength(1);
    } finally {
      resolveMock.mockReset();
      resolveMock.mockImplementation(async (token: string, accountType: 'demo' | 'real') => ({
        url: `wss://fake/${accountType}`, needsAuthorize: false, token,
      }));
    }
  });

  it('BUG-04: falha de conexão da demo não agenda reconexão depois do stop', async () => {
    const { service } = await boot();
    resolveMock.mockRejectedValueOnce(new Error('Falha ao gerar OTP da Deriv (503)'));
    FakeWs.last('demo').drop();
    await vi.advanceTimersByTimeAsync(5000); // tentativa falha
    service.stop();
    await vi.advanceTimersByTimeAsync(60_000);

    expect(FakeWs.byKind('demo')).toHaveLength(1);
  });

  it('BUG-16: stop() durante o resolve da demo não abre socket nem compra na real', async () => {
    let releaseDemo!: () => void;
    resolveMock.mockImplementation(async (token: string, accountType: 'demo' | 'real') => {
      if (accountType === 'demo') await new Promise<void>((r) => { releaseDemo = r; });
      return { url: `wss://fake/${accountType}`, needsAuthorize: false, token };
    });
    try {
      const service = new CopyTradingService('demoTok', 'realTok', 'sessao-1', { quantityLoss: 0 });
      const started = service.start();
      await flush();
      FakeWs.last('real').open();
      await started;
      await flush();

      service.stop();
      releaseDemo();
      await flush();
      expect(FakeWs.byKind('demo')).toHaveLength(0);
    } finally {
      resolveMock.mockReset();
      resolveMock.mockImplementation(async (token: string, accountType: 'demo' | 'real') => ({
        url: `wss://fake/${accountType}`, needsAuthorize: false, token,
      }));
    }
  });

  it('BUG-16: sinal recebido com o bot parado não compra na real', async () => {
    const { service, internal } = await boot();
    service.stop();
    // Socket demo que ainda entregue uma mensagem após o stop (ex.: em fechamento)
    internal.wsListener.emit('tradeSignal', {
      symbol: 'R_100', contractType: 'DIGITDIFF', barrier: '5', duration: 1, durationUnit: 't',
      contractId: 1, amount: 0.35, timestamp: '', longcode: '', isForex: false,
    });
    await flush();
    await vi.advanceTimersByTimeAsync(1000);
    for (const s of FakeWs.byKind('real')) if (!s.opened && !s.closed) s.open();
    await flush();

    expect(realBuys()).toHaveLength(0);
  });
});

describe('Guard onTrade vs. eventos assíncronos (estado local)', () => {
  it('buy rejeitado pela Deriv libera o guard e o próximo sinal é copiado', async () => {
    const { internal } = await boot();
    await signal(1);
    FakeWs.last('real').receive({ msg_type: 'buy', error: { code: 'InsufficientBalance', message: 'Saldo insuficiente' } });
    expect(internal.onTrade).toBe(false);

    await vi.advanceTimersByTimeAsync(3000);
    await signal(2, { longcode: 'Win payout if the last digit of Volatility 100 Index is not 7 after 1 ticks.' });
    expect(realBuys()).toHaveLength(2);
  });

  it('falha ao reconectar no executeTrade libera o guard', async () => {
    const { internal } = await boot();
    FakeWs.last('real').drop();
    resolveMock.mockRejectedValueOnce(new Error('Falha ao gerar OTP da Deriv (503)'));

    await signal(1);
    expect(realBuys()).toHaveLength(0);
    expect(internal.onTrade).toBe(false);
  });

  it('BUG-05a: erro transitório no socket real não libera o guard com contrato aberto', async () => {
    await boot();
    await signal(1);
    FakeWs.last('real').receive({ msg_type: 'buy', buy: { contract_id: 900 } });

    // 'error' sem queda (ex.: falha de envio do ping); contrato 900 segue aberto
    FakeWs.last('real').emit('error', new Error('write EPIPE'));
    await vi.advanceTimersByTimeAsync(3000);
    await signal(2, { longcode: 'Win payout if the last digit of Volatility 100 Index is not 7 after 1 ticks.' });
    // executeTrade vê isConnected=false e abre outra conexão real para enviar o buy B
    FakeWs.last('real').open();
    await flush();

    expect(realBuys()).toHaveLength(1);
  });

  it('BUG-05b: sinal com real desconectada não permite segunda ordem concorrente', async () => {
    await boot();
    FakeWs.last('real').drop();

    // Sinal A antes do attemptReconnect: executeTrade emite 'error' ("Conta real não conectada")
    // e o handler do service zera onTrade antes mesmo de enviar o buy.
    await signal(1);
    FakeWs.last('real').open();
    await flush();
    expect(realBuys()).toHaveLength(1);

    await vi.advanceTimersByTimeAsync(3000);
    await signal(2, { longcode: 'Win payout if the last digit of Volatility 100 Index is not 7 after 1 ticks.' });

    expect(realBuys()).toHaveLength(1);
  });

  it('BUG-06a: sinal descartado pelo SignalProcessor não trava o bot', async () => {
    await boot();

    // 1HZ150V não está em marketMappings: processSignal retorna sem comprar e sem erro
    await signal(1, { symbol: '1HZ150V' });
    expect(realBuys()).toHaveLength(0);

    await vi.advanceTimersByTimeAsync(3000);
    await signal(2);
    expect(realBuys()).toHaveLength(1);
  });

  it('BUG-06b: sinal descartado não é contado nem logado como trade executado', async () => {
    const { internal } = await boot();
    await signal(1, { symbol: '1HZ150V' });

    expect(realBuys()).toHaveLength(0);
    expect(internal.stats.tradesExecuted).toBe(0);
    expect(internal.errors.some((e: any) => e.title === 'Trade Executado')).toBe(false);
  });

  it('BUG-06: sinal descartado é registrado como info com símbolo e tipo', async () => {
    const { internal } = await boot();
    await signal(1, { symbol: '1HZ150V' });

    expect(internal.errors[0]).toMatchObject({ type: 'info', title: 'Sinal Descartado' });
    expect(internal.errors[0].message).toContain('1HZ150V');
    expect(internal.errors[0].message).toContain('DIGITDIFF');
    expect(internal.onTrade).toBe(false);
    expect(internal.contract_id).toBeNull();
  });

  it('BUG-06: compra bloqueada como duplicata pelo executor não trava o bot', async () => {
    const { internal } = await boot();
    // Relógio falso parado: win e novo sinal idêntico caem no mesmo segundo
    await signal(1);
    FakeWs.last('real').receive({ msg_type: 'buy', buy: { contract_id: 900 } });
    FakeWs.last('real').receive(settled(900, 0.3));
    await signal(2);
    expect(realBuys()).toHaveLength(1);
    expect(internal.onTrade).toBe(false);

    await vi.advanceTimersByTimeAsync(3000);
    await signal(3);
    expect(realBuys()).toHaveLength(2);
  });

  it('BUG-06: sinal descartado não ativa o modo real (quantityLoss)', async () => {
    const { internal } = await boot({ quantityLoss: 2 });
    internal.consecutiveLosses = 2;
    await signal(1, { symbol: '1HZ150V' });
    expect(internal.isInRealMode).toBe(false);

    // Win na demo quebra a sequência: o próximo sinal não deve ir para a real
    FakeWs.last('demo').receive({ msg_type: 'transaction', transaction: { action: 'sell', contract_id: 50, amount: 0.6 } });
    await signal(2);
    expect(realBuys()).toHaveLength(0);
  });

  it('BUG-08: contrato encerrado com status "sold" libera o guard e entra no resultado', async () => {
    const { internal } = await boot();
    await signal(1);
    FakeWs.last('real').receive({ msg_type: 'buy', buy: { contract_id: 900 } });

    FakeWs.last('real').receive(settled(900, -0.12, 'sold'));

    expect(internal.onTrade).toBe(false);
    expect(internal.realTransactions).toHaveLength(1);
  });

  it('BUG-08: contrato vendido não dispara timeout de liquidação', async () => {
    const { internal } = await boot();
    await signal(1);
    FakeWs.last('real').receive({ msg_type: 'buy', buy: { contract_id: 900 } });
    FakeWs.last('real').receive(settled(900, -0.12, 'sold'));

    await vi.advanceTimersByTimeAsync(10 * 60_000);
    expect(internal.isRunning).toBe(true);
    expect(internal.totalLoss).toBeCloseTo(0.12);
    expect(internal.martingaleLevel).toBe(1);
  });

  it('BUG-08: contrato aberto (status open) não é tratado como resultado', async () => {
    const { internal } = await boot();
    await signal(1);
    FakeWs.last('real').receive({ msg_type: 'buy', buy: { contract_id: 900 } });
    FakeWs.last('real').receive({ msg_type: 'proposal_open_contract', proposal_open_contract: { contract_id: 900, status: 'open', profit: 0.1 } });

    expect(internal.onTrade).toBe(true);
    expect(internal.realTransactions).toHaveLength(0);
  });
});

describe('Timeouts da API da Deriv durante a execução', () => {
  it('BUG-07: buy sem resposta da Deriv não mantém o guard preso indefinidamente', async () => {
    const { internal } = await boot();
    await signal(1);
    expect(realBuys()).toHaveLength(1);

    // Nenhuma resposta de buy nem de proposal_open_contract (contrato de 1 tick)
    await vi.advanceTimersByTimeAsync(10 * 60_000);

    expect(internal.onTrade).toBe(false);
    expect(internal.errors.some((e: any) => e.type === 'error')).toBe(true);
  });

  // Sem resposta não dá para saber se a ordem existe: liberar o guard arriscaria
  // ordem duplicada, então o bot para e avisa o usuário.
  it('BUG-07: sem resposta do buy em 30s, para o bot com erro de timeout', async () => {
    const { internal } = await boot();
    await signal(1);

    await vi.advanceTimersByTimeAsync(29_000);
    expect(internal.isRunning).toBe(true);

    await vi.advanceTimersByTimeAsync(1_000);
    expect(internal.isRunning).toBe(false);
    expect(internal.onTrade).toBe(false);
    expect(internal.errors[0]).toMatchObject({ type: 'error', title: 'Timeout da Deriv' });
  });

  it('BUG-07: buy confirmado sem resultado para o bot após duração do contrato + folga', async () => {
    const { internal } = await boot();
    await signal(1); // 1 tick
    FakeWs.last('real').receive({ msg_type: 'buy', buy: { contract_id: 900 } });

    await vi.advanceTimersByTimeAsync(60_000);
    expect(internal.isRunning).toBe(true);

    await vi.advanceTimersByTimeAsync(2_000);
    expect(internal.isRunning).toBe(false);
    expect(internal.errors[0]).toMatchObject({ type: 'error', title: 'Timeout da Deriv' });
    expect(internal.errors[0].message).toContain('900');
  });

  it('BUG-07: contrato longo (5 min) não estoura antes da duração', async () => {
    const { internal } = await boot();
    await signal(1, { longcode: 'Win payout if Volatility 100 Index is strictly higher than entry spot at 5 minutes after contract start time.' });
    expect(realBuys()[0].parameters).toMatchObject({ contract_type: 'CALL', duration: 5, duration_unit: 'm' });
    FakeWs.last('real').receive({ msg_type: 'buy', buy: { contract_id: 900 } });

    await vi.advanceTimersByTimeAsync(5 * 60_000 + 59_000);
    expect(internal.isRunning).toBe(true);
    FakeWs.last('real').receive(settled(900, 0.5));
    await vi.advanceTimersByTimeAsync(10 * 60_000);
    expect(internal.isRunning).toBe(true);
    expect(internal.onTrade).toBe(false);
  });

  it('BUG-07: buy rejeitado e resultado recebido cancelam os timeouts', async () => {
    const { internal } = await boot();
    await signal(1);
    FakeWs.last('real').receive({ msg_type: 'buy', error: { message: 'Saldo insuficiente' } });
    await vi.advanceTimersByTimeAsync(3000);

    await signal(2, { longcode: 'Win payout if the last digit of Volatility 100 Index is not 7 after 1 ticks.' });
    FakeWs.last('real').receive({ msg_type: 'buy', buy: { contract_id: 901 } });
    FakeWs.last('real').receive(settled(901, 0.3));

    await vi.advanceTimersByTimeAsync(10 * 60_000);
    expect(internal.isRunning).toBe(true);
    expect(internal.errors.some((e: any) => e.title === 'Timeout da Deriv')).toBe(false);
  });

  it('BUG-07: stop() cancela os timeouts pendentes', async () => {
    const { service, internal } = await boot();
    await signal(1);
    service.stop();
    const errorsBefore = internal.errors.length;

    await vi.advanceTimersByTimeAsync(10 * 60_000);
    expect(internal.errors.filter((e: any) => e.title === 'Timeout da Deriv')).toHaveLength(0);
    expect(internal.errors.length).toBe(errorsBefore);
  });
});

describe('Limpeza de timers', () => {
  it('BUG-09: stop() cancela o timer de pausa pendente', () => {
    const service = new CopyTradingService('demoTok', 'realTok', 'sessao-1', { quantityLoss: 0 });
    (service as any).applyPause(60, 'loss');
    expect(vi.getTimerCount()).toBe(1);

    service.stop();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('BUG-09: pausa nova substitui a anterior em vez de acumular timers', async () => {
    const service = new CopyTradingService('demoTok', 'realTok', 'sessao-1', { quantityLoss: 0 });
    const internal = service as any;
    internal.applyPause(60, 'loss');
    internal.applyPause(10, 'win');
    expect(vi.getTimerCount()).toBe(1);

    await vi.advanceTimersByTimeAsync(10_000);
    expect(internal.isPaused).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });
});
