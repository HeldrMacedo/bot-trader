import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FakeWs, flush, resolveMock, demoBuy } from './copyTraderTestHarness';

vi.mock('ws', async () => ({ default: (await import('./copyTraderTestHarness')).FakeWs }));
vi.mock('../app/services/derivConfig', async () => ({
  resolveDerivConnection: (await import('./copyTraderTestHarness')).resolveMock,
}));

import { WsListener } from '../app/services/wsListener';
import { TradeExecutor } from '../app/services/tradeExecutor';
import { SignalProcessor } from '../app/services/signalProcessor';
import { CopyTradingService } from '../app/services/copyTradingService';

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

// =============================================================================
// WsListener
// =============================================================================
async function listener(needsAuthorize = false) {
  if (needsAuthorize) {
    resolveMock.mockResolvedValueOnce({ url: 'wss://fake/demo', needsAuthorize: true, token: 'tok-classico' });
  }
  const l = new WsListener('demoTok');
  const events: Record<string, any[]> = {};
  for (const name of ['connected', 'disconnected', 'error', 'authError', 'authorized', 'tick', 'tradeSignal', 'sellTransaction', 'contractResult']) {
    events[name] = [];
    l.on(name, (payload) => events[name].push(payload));
  }
  await l.connect();
  const ws = FakeWs.last('demo');
  ws.open();
  return { l, ws, events, internal: l as any };
}

function signalFor(longcode: string, symbol = 'R_100') {
  const l = new WsListener('t') as any;
  return l.extractTradeSignalAdvanced({ transaction: { longcode, symbol, contract_id: 1 } });
}

describe('WsListener — conexão', () => {
  it('socket OTP assina transações direto no open', async () => {
    const { ws, events } = await listener();
    expect(events.connected).toHaveLength(1);
    expect(ws.sentOf('transaction')).toEqual([{ transaction: 1, subscribe: 1 }]);
  });

  it('token clássico autoriza antes e só assina após authorize OK', async () => {
    const { ws, events } = await listener(true);
    expect(ws.sent[0]).toEqual({ authorize: 'tok-classico' });
    expect(ws.sentOf('transaction')).toHaveLength(0);
    ws.receive({ msg_type: 'authorize', authorize: { loginid: 'VR1' } });
    expect(events.authorized).toEqual([{ loginid: 'VR1' }]);
    expect(ws.sentOf('transaction')).toHaveLength(1);
    ws.receive({ msg_type: 'authorize', authorize: { loginid: 'VR1' } });
    expect(ws.sentOf('transaction')).toHaveLength(1);
  });

  it('authorize com erro emite authError e desconecta', async () => {
    const { ws, events, internal } = await listener(true);
    ws.receive({ msg_type: 'authorize', error: { code: 'AccountDisabled', message: 'off' } });
    expect(events.authError).toEqual([{ code: 'AccountDisabled', message: 'off' }]);
    expect(internal.ws).toBeNull();
  });

  it('envia ping periódico só enquanto conectado', async () => {
    const { ws } = await listener();
    await vi.advanceTimersByTimeAsync(20_000);
    expect(ws.sentOf('ping')).toHaveLength(1);
    ws.drop();
    await vi.advanceTimersByTimeAsync(40_000);
    expect(ws.sentOf('ping')).toHaveLength(1);
  });

  it('ping não envia quando isConnected=false', async () => {
    const { ws, internal } = await listener();
    internal.isConnected = false;
    await vi.advanceTimersByTimeAsync(20_000);
    expect(ws.sentOf('ping')).toHaveLength(0);
  });

  it('close emite disconnected; error emite error', async () => {
    const { ws, events } = await listener();
    ws.drop(new Error('boom'));
    expect(events.error[0].message).toBe('boom');
    expect(events.disconnected).toHaveLength(1);
  });

  it('falha ao resolver conexão emite error', async () => {
    resolveMock.mockRejectedValueOnce(new Error('otp'));
    const l = new WsListener('t');
    const errors: any[] = [];
    l.on('error', (e) => errors.push(e));
    await l.connect();
    expect(errors[0].message).toBe('otp');
  });

  it('send só envia conectado; disconnect limpa estado', async () => {
    const { l, ws, internal } = await listener();
    l.send(JSON.stringify({ x: 1 }));
    expect(ws.sentOf('x')).toHaveLength(1);
    internal.processedContracts.add(5);
    l.clearProcessedContracts();
    expect(internal.processedContracts.size).toBe(0);
    l.disconnect();
    l.send(JSON.stringify({ x: 2 }));
    expect(ws.sentOf('x')).toHaveLength(1);
    l.disconnect();
  });
});

describe('WsListener — mensagens', () => {
  it('compra na demo gera sinal único, assina o contrato e registra a transação', async () => {
    const { ws, events, l } = await listener();
    ws.receive(demoBuy(77));
    ws.receive(demoBuy(77));
    expect(events.tradeSignal).toHaveLength(1);
    expect(events.tradeSignal[0]).toMatchObject({ symbol: 'R_100', contractType: 'DIGITDIFF', barrier: '5', duration: 1, durationUnit: 't', contractId: 77 });
    expect(ws.sentOf('proposal_open_contract')[0]).toEqual({ proposal_open_contract: 1, contract_id: 77, subscribe: 1 });
    expect(l.getVirtualAccountInfo().lastTransaction).toMatchObject({ action: 'buy', contract_id: 77, amount: -0.35 });
  });

  it('usa underlying_symbol, delta_amount e limita histórico a 50', async () => {
    const { ws, l } = await listener();
    for (let i = 0; i < 52; i++) {
      ws.receive({ msg_type: 'transaction', transaction: { action: 'deposit', delta_amount: 1, underlying_symbol: 'R_10' } });
    }
    const info = l.getVirtualAccountInfo();
    expect(info.recentTransactions).toHaveLength(50);
    expect(info.lastTransaction).toMatchObject({ amount: 1, symbol: 'R_10' });
  });

  it('sell emite sellTransaction; tick emite tick; tipos desconhecidos são ignorados', async () => {
    const { ws, events } = await listener();
    ws.receive({ msg_type: 'transaction', transaction: { action: 'sell', contract_id: 3, amount: 0.6 } });
    ws.receive({ msg_type: 'tick', tick: { quote: 1 } });
    ws.receive({ msg_type: 'ping' });
    expect(events.sellTransaction[0].contract_id).toBe(3);
    expect(events.tick).toEqual([{ quote: 1 }]);
  });

  it('proposal_open_contract emite contractResult só para contratos encerrados', async () => {
    const { ws, events } = await listener();
    ws.receive({ msg_type: 'proposal_open_contract', proposal_open_contract: { contract_id: 1, status: 'open' } });
    ws.receive({ msg_type: 'proposal_open_contract', proposal_open_contract: { contract_id: 1, status: 'won', profit: '0.3' } });
    ws.receive({ msg_type: 'proposal_open_contract', proposal_open_contract: { contract_id: 2, status: 'sold' } });
    ws.receive({ msg_type: 'proposal_open_contract' });
    expect(events.contractResult.map((r) => [r.contractId, r.status, r.profit])).toEqual([[1, 'won', 0.3], [2, 'sold', 0]]);
  });

  it('JSON inválido é logado sem derrubar o listener', async () => {
    const { ws } = await listener();
    ws.emit('message', Buffer.from('{'));
    expect(console.error).toHaveBeenCalled();
  });

  it('compra com longcode inválido não gera sinal', async () => {
    const { ws, events } = await listener();
    ws.receive(demoBuy(1, { longcode: 'Win payout if something weird after 30 ticks.' }));
    ws.receive(demoBuy(2, { longcode: 'Win payout if nothing matches.' }));
    expect(events.tradeSignal).toHaveLength(0);
  });

  it('erro interno na extração devolve null', () => {
    const l = new WsListener('t') as any;
    expect(l.extractTradeSignalAdvanced({ transaction: { longcode: 5, symbol: 'R_100' } })).toBeNull();
  });
});

describe('WsListener — parser de longcode', () => {
  const cases: Array<[string, string, string | undefined, string?]> = [
    ['Win payout if Volatility 100 Index touches entry spot plus 0.50 through 5 ticks after contract start time.', 'ONETOUCH', '+0.50'],
    ['Win payout if Volatility 100 Index does not touch entry spot minus 0.50 through 5 ticks.', 'NOTOUCH', '-0.50'],
    ['Win payout if Volatility 100 Index after 5 ticks is strictly higher than entry spot plus 0.1.', 'CALL', '+0.1'],
    ['Win payout if Volatility 100 Index after 5 ticks is strictly lower than entry spot minus 0.1.', 'PUT', '-0.1'],
    ['Win payout if Volatility 100 Index after 5 ticks is strictly lower than it was at either entry or 2 ticks.', 'RESETPUT', undefined],
    ['Win payout if Volatility 100 Index after 5 ticks is strictly higher than it was at either entry or 2 ticks.', 'RESETCALL', undefined],
    ['Win payout if Volatility 100 Index rises successively for 3 ticks.', 'RUNHIGH', undefined],
    ['Win payout if Volatility 100 Index falls successively for 3 ticks.', 'RUNLOW', undefined],
    ['Win payout if Volatility 100 Index after 5 ticks is higher than or equal to entry spot.', 'CALLE', undefined],
    ['Win payout if Volatility 100 Index after 5 ticks is lower than or equal to entry spot.', 'PUTE', undefined],
    ['Win payout if the last digit of Volatility 100 Index is strictly higher than 4 after 1 ticks.', 'DIGITOVER', '4'],
    ['Win payout if the last digit of Volatility 100 Index is strictly lower than 6 after 1 ticks.', 'DIGITUNDER', '6'],
    ['Win payout if the last digit of Volatility 100 Index is odd after 1 ticks.', 'DIGITODD', undefined],
    ['Win payout if the last digit of Volatility 100 Index is even after 1 ticks.', 'DIGITEVEN', undefined],
    ['Win payout if the last digit of Volatility 100 Index is 3 after 1 ticks.', 'DIGITMATCH', '3'],
    ['Win payout if Volatility 100 Index after 5 ticks is strictly higher than entry spot.', 'CALL', undefined],
    ['Win payout if Volatility 100 Index after 5 ticks is strictly lower than entry spot.', 'PUT', undefined],
    ['Win payout if digit after 5 ticks is strictly higher than 7.', 'DIGITOVER', '7'],
    ['Win payout if digit after 5 ticks is strictly lower than 2.', 'DIGITUNDER', '2'],
    ['Win payout if EUR/USD touches 1.10 through 5 minutes.', 'ONETOUCH', '1.10', 'frxEURUSD'],
    ['Win payout if EUR/USD does not touch 1.10 through 5 minutes.', 'NOTOUCH', '1.10', 'frxEURUSD'],
    ['Win payout if EUR/USD is strictly higher than entry spot at 5 minutes.', 'CALL', undefined, 'frxEURUSD'],
    ['Win payout if EUR/USD is strictly lower than entry spot at 5 minutes.', 'PUT', undefined, 'frxEURUSD'],
    ['Win payout if EUR/USD is higher than or equal to entry spot at 5 minutes.', 'CALLE', undefined, 'WLDEUR'],
    ['Win payout if EUR/USD is lower than or equal to entry spot at 5 minutes.', 'PUTE', undefined, 'frxEURUSD'],
  ];

  it.each(cases)('%s -> %s', (longcode, type, barrier, symbol) => {
    const s = signalFor(longcode, symbol);
    expect(s?.contractType).toBe(type);
    expect(s?.barrier).toBe(barrier);
  });

  // Barreira absoluta: extractBarrier pega o PRIMEIRO número do longcode, que é o "100" do nome do índice.
  it.each([
    ['Win payout if Volatility 100 Index touches 123.45 through 5 ticks.', 'ONETOUCH', '123.45'],
    ['Win payout if Volatility 100 Index does not touch 99.5 through 5 ticks.', 'NOTOUCH', '99.5'],
    ['Win payout if Volatility 10 (1s) Index touches 6123.4 through 5 ticks after contract start time.', 'ONETOUCH', '6123.4'],
    ['Win payout if Volatility 75 Index does not touch 1000 through 5 ticks.', 'NOTOUCH', '1000'],
  ])('BUG-13: barreira absoluta não é confundida com o número do índice — %s', (longcode, type, barrier) => {
    const s = signalFor(longcode);
    expect(s?.contractType).toBe(type);
    expect(s?.barrier).toBe(barrier);
  });

  it('BUG-13: toque sem barreira legível não herda o número do índice', () => {
    expect(signalFor('Win payout if Volatility 100 Index touches the barrier through 5 ticks.')?.barrier).toBe('');
    expect(signalFor('Win payout if Volatility 100 Index does not touch the barrier through 5 ticks.')?.barrier).toBe('');
  });

  it('BUG-13: forex com número no par usa a barreira após "touches"', () => {
    expect(signalFor('Win payout if AUD/USD 2 touches 0.6512 through 5 minutes.', 'frxAUDUSD')?.barrier).toBe('0.6512');
  });

  it('barreira absoluta em índice sem dígitos no nome', () => {
    expect(signalFor('Win payout if Bear Market Index touches 123.45 through 5 ticks.')?.barrier).toBe('123.45');
  });

  it('forex sem padrão conhecido é inválido', () => {
    expect(signalFor('Win payout if EUR/USD rises successively in 5 minutes.', 'frxEURUSD')).toBeNull();
  });

  it('dígito com barreira não numérica é inválido', () => {
    expect(signalFor('Win payout if digit after 5 ticks is strictly higher than abc.')).toBeNull();
    expect(signalFor('Win payout if digit after 5 ticks is strictly lower than 12.')).toBeNull();
  });

  it('durações: ticks, compostas, segundos, minutos, horas e default', () => {
    const d = (longcode: string) => (new WsListener('t') as any).parseDurationAdvanced(longcode);
    expect(d('after 11 ticks')).toMatchObject({ duration: 11, durationUnit: 't', isValid: false });
    expect(d('in 1 hour 30 minutes')).toMatchObject({ duration: 5400, durationUnit: 's', isValid: true });
    expect(d('in 2 minutes 15 seconds')).toMatchObject({ duration: 135, durationUnit: 's' });
    expect(d('in 1 hour 5 seconds')).toMatchObject({ duration: 3605 });
    expect(d('hour minute')).toMatchObject({ duration: 0, isValid: false });
    expect(d('in 30 seconds')).toMatchObject({ duration: 30, durationUnit: 's', isValid: true });
    expect(d('in 5 minutes')).toMatchObject({ duration: 5, durationUnit: 'm', isValid: true });
    expect(d('in 2 hours')).toMatchObject({ duration: 2, durationUnit: 'h', isValid: true });
    expect(d('at close on 2026-10-06')).toMatchObject({ duration: 1, durationUnit: 'd', isValid: true });
  });

  it('helpers de barreira: sinal sem valor, sem número e numérico legado', () => {
    const l = new WsListener('t') as any;
    expect(l.extractBarrierWithSign('touches entry spot plus')).toBe('');
    expect(l.extractBarrierWithSign('touches entry spot minus')).toBe('');
    expect(l.extractBarrier('touches nothing')).toBe('');
    expect(l.extractDigitBarrierAfterThan('higher than x')).toBe('');
    expect(l.extractDigitBarrier('no digit here')).toBe('');
    expect(l.extractNumericBarrier('strictly higher than 3')).toBe('3');
    expect(l.extractNumericBarrier('nada')).toBeUndefined();
  });
});

// =============================================================================
// TradeExecutor
// =============================================================================
async function executor(opts: { needsAuthorize?: boolean; testMode?: boolean } = {}) {
  if (opts.needsAuthorize) {
    resolveMock.mockResolvedValueOnce({ url: 'wss://fake/real', needsAuthorize: true, token: 'tok-real' });
  }
  const ex = new TradeExecutor('realTok', { testMode: opts.testMode });
  const events: Record<string, any[]> = {};
  for (const name of ['connected', 'disconnected', 'error', 'warning', 'success', 'transaction', 'balance', 'authError']) {
    events[name] = [];
    ex.on(name, (payload) => events[name].push(payload));
  }
  const p = ex.connectToMaster();
  await flush();
  const ws = FakeWs.sockets[FakeWs.sockets.length - 1];
  ws.open();
  await p;
  return { ex, ws, events, internal: ex as any };
}

const sig = (overrides: Record<string, any> = {}): any => ({
  symbol: 'R_100', contractType: 'DIGITDIFF', amount: 0.35, barrier: '5', duration: 1, durationUnit: 't',
  contractId: 1, timestamp: '', longcode: '', isForex: false, ...overrides,
});

describe('TradeExecutor — conexão', () => {
  it('OTP: conecta, assina saldo e emite connected', async () => {
    const { ws, events } = await executor();
    expect(events.connected).toHaveLength(1);
    expect(ws.sent).toEqual([{ balance: 1, subscribe: 1 }]);
  });

  it('testMode usa a conta demo', async () => {
    await executor({ testMode: true });
    expect(resolveMock).toHaveBeenCalledWith('realTok', 'demo');
  });

  it('clássico: authorize, depois saldo; erro de authorize emite authError e desconecta', async () => {
    const { ws, events, internal } = await executor({ needsAuthorize: true });
    expect(ws.sent[0]).toEqual({ authorize: 'tok-real' });
    ws.receive({ msg_type: 'authorize', authorize: { balance: 50 } });
    expect(events.balance).toEqual([50]);
    expect(ws.sentOf('balance')).toHaveLength(1);
    ws.receive({ msg_type: 'authorize', error: { code: 'AccountDisabled', message: 'off' } });
    expect(events.authError).toEqual([{ code: 'AccountDisabled', message: 'off' }]);
    expect(internal.wsMaster).toBeNull();
  });

  it('authorize sem token não envia nada', async () => {
    resolveMock.mockResolvedValueOnce({ url: 'wss://fake/real', needsAuthorize: true, token: '' });
    const ex = new TradeExecutor('realTok');
    const p = ex.connectToMaster();
    await flush();
    FakeWs.last('real').open();
    await p;
    expect(FakeWs.last('real').sent).toEqual([]);
  });

  it('authorize sem payload ainda assina saldo', async () => {
    const { ws, events } = await executor({ needsAuthorize: true });
    ws.receive({ msg_type: 'authorize' });
    expect(events.balance).toHaveLength(0);
    expect(ws.sentOf('balance')).toHaveLength(1);
  });

  it('erro na primeira conexão rejeita connectToMaster', async () => {
    const ex = new TradeExecutor('realTok');
    ex.on('error', () => {});
    const p = ex.connectToMaster();
    await flush();
    FakeWs.last('real').drop(new Error('refused'));
    await expect(p).rejects.toThrow('refused');
  });

  it('falha ao resolver conexão rejeita connectToMaster', async () => {
    resolveMock.mockRejectedValueOnce(new Error('otp'));
    const ex = new TradeExecutor('realTok');
    ex.on('error', () => {});
    await expect(ex.connectToMaster()).rejects.toThrow('otp');
  });

  it('reconecta com backoff e desiste após maxReconnectAttempts', async () => {
    const { ws, internal } = await executor();
    internal.reconnectAttempts = 4;
    ws.drop();
    expect(internal.reconnectAttempts).toBe(5);
    await vi.advanceTimersByTimeAsync(25_000);
    expect(FakeWs.byKind('real')).toHaveLength(2);
    FakeWs.last('real').drop(); // tentativa 5 falha: rejeição só é logada
    await flush();
    expect(console.error).toHaveBeenCalledWith('Max reconnection attempts reached for master connection');
  });

  it('erro em reconexão é logado e agenda a próxima tentativa', async () => {
    const { ws } = await executor();
    ws.drop();
    await vi.advanceTimersByTimeAsync(5000);
    FakeWs.last('real').emit('error', new Error('again'));
    await flush();
    expect(console.error).toHaveBeenCalledWith('Reconnection failed:', expect.any(Error));
    await vi.advanceTimersByTimeAsync(10_000);
    expect(FakeWs.byKind('real')).toHaveLength(3);
  });

  it('disconnect() durante o resolve cancela a conexão sem abrir socket', async () => {
    const ex = new TradeExecutor('realTok');
    const p = ex.connectToMaster();
    ex.disconnect();
    await expect(p).rejects.toThrow('Conexão com a Deriv cancelada');
    expect(FakeWs.sockets).toHaveLength(0);
  });

  it('disconnect() com reconexão em andamento não reagenda', async () => {
    const { ex, ws } = await executor();
    ws.drop();
    await vi.advanceTimersByTimeAsync(5000); // tentativa 1: socket 2 ainda sem abrir
    expect(FakeWs.byKind('real')).toHaveLength(2);

    ex.disconnect();
    await flush();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(FakeWs.byKind('real')).toHaveLength(2);
  });

  it('socket fechado antes de abrir rejeita connectToMaster (sem promise pendurada)', async () => {
    const ex = new TradeExecutor('realTok');
    const p = ex.connectToMaster();
    await flush();
    FakeWs.last('real').emit('close');
    await expect(p).rejects.toThrow('Conexão com a Deriv fechada antes de abrir');
  });

  it('ping periódico só enquanto conectado', async () => {
    const { ws, internal } = await executor();
    await vi.advanceTimersByTimeAsync(20_000);
    expect(ws.sentOf('ping')).toHaveLength(1);
    internal.isConnected = false;
    await vi.advanceTimersByTimeAsync(20_000);
    expect(ws.sentOf('ping')).toHaveLength(1);
  });

  it('disconnect sem socket é no-op', () => {
    expect(() => new TradeExecutor('t').disconnect()).not.toThrow();
  });
});

describe('TradeExecutor — compra', () => {
  it('monta buy com underlying_symbol (API nova), barreira de dígito e markup', async () => {
    const { ex, ws } = await executor();
    ex.setAppMarkupPercentage(2);
    ex.setCurrency('EUR');
    await ex.executeTrade(sig());
    expect(ws.sentOf('buy')[0]).toEqual({
      buy: '1', subscribe: 1, price: 0.35, req_id: 1,
      parameters: { contract_type: 'DIGITDIFF', duration: 1, duration_unit: 't', basis: 'stake', amount: 0.35, currency: 'EUR', underlying_symbol: 'R_100', barrier: '5', app_markup_percentage: 2 },
    });
  });

  it('API legada usa symbol; duration_unit default t', async () => {
    const { ex, ws } = await executor({ needsAuthorize: true });
    await ex.executeTrade(sig({ durationUnit: undefined, barrier: undefined }));
    const params = ws.sentOf('buy')[0].parameters;
    expect(params.symbol).toBe('R_100');
    expect(params.duration_unit).toBe('t');
    expect(params.barrier).toBeUndefined();
  });

  it('regras de barreira por tipo', () => {
    const ex = new TradeExecutor('t') as any;
    expect(ex.shouldIncludeBarrierAdvanced('MULTUP', '1')).toBe(false);
    expect(ex.shouldIncludeBarrierAdvanced('DIGITOVER', '12')).toBe(false);
    expect(ex.shouldIncludeBarrierAdvanced('DIGITOVER', '4')).toBe(true);
    expect(ex.shouldIncludeBarrierAdvanced('CALL', '+0.5')).toBe(true);
    expect(ex.shouldIncludeBarrierAdvanced('CALL', '-1')).toBe(true);
    expect(ex.shouldIncludeBarrierAdvanced('CALL', 'abc')).toBe(false);
  });

  it('bloqueia duplicata no mesmo segundo e exatamente 1s depois', async () => {
    const { ex, ws, events } = await executor();
    vi.setSystemTime(new Date('2026-10-06T10:00:00.100Z'));
    expect(await ex.executeTrade(sig())).toBe(true);
    expect(await ex.executeTrade(sig())).toBe(false);
    vi.setSystemTime(new Date('2026-10-06T10:00:01.100Z'));
    await ex.executeTrade(sig());
    vi.setSystemTime(new Date('2026-10-06T10:00:05.100Z'));
    await ex.executeTrade(sig());
    expect(ws.sentOf('buy')).toHaveLength(2);
    expect(events.warning).toHaveLength(2);

    ex.setDuplicateProtection(false);
    await ex.executeTrade(sig());
    expect(ws.sentOf('buy')).toHaveLength(3);
  });

  it('sem conexão: emite erro, reconecta e envia', async () => {
    const ex = new TradeExecutor('realTok');
    const errors: any[] = [];
    ex.on('error', (e) => errors.push(e));
    const p = ex.executeTrade(sig());
    await flush();
    FakeWs.last('real').open();
    await p;
    expect(errors[0].message).toBe('Conta real não conectada');
    expect(FakeWs.last('real').sentOf('buy')).toHaveLength(1);
  });

  it('falha ao reconectar propaga o erro', async () => {
    resolveMock.mockRejectedValueOnce(new Error('otp'));
    const ex = new TradeExecutor('realTok');
    ex.on('error', () => {});
    await expect(ex.executeTrade(sig())).rejects.toThrow('otp');
  });
});

describe('TradeExecutor — mensagens', () => {
  it('resultado won/lost emitido uma vez por contrato; open/sem id ignorados', async () => {
    const { ws, events } = await executor();
    ws.receive({ msg_type: 'proposal_open_contract', proposal_open_contract: { contract_id: 9, status: 'open' } });
    ws.receive({ msg_type: 'proposal_open_contract', proposal_open_contract: { contract_id: 9, status: 'won', profit: 1 } });
    ws.receive({ msg_type: 'proposal_open_contract', proposal_open_contract: { contract_id: 9, status: 'won', profit: 1 } });
    ws.receive({ msg_type: 'proposal_open_contract', proposal_open_contract: { status: 'lost' } });
    expect(events.transaction).toHaveLength(1);
  });

  it('buy: sucesso e erro', async () => {
    const { ws, events } = await executor();
    ws.receive({ msg_type: 'buy', buy: { contract_id: 1 } });
    ws.receive({ msg_type: 'buy', error: { message: 'InsufficientBalance' } });
    expect(events.success[0].data).toEqual({ contract_id: 1 });
    expect(events.error[0].message).toBe('Erro na compra: InsufficientBalance');
  });

  it('balance, error genérico e JSON inválido', async () => {
    const { ex, ws, events } = await executor();
    ws.receive({ msg_type: 'balance', balance: { balance: 12 } });
    ws.receive({ msg_type: 'error' });
    ws.emit('message', Buffer.from('{'));
    expect(events.balance).toEqual([12]);
    expect(events.error[0].message).toMatch(/^Erro ao processar mensagem/);
    expect(ex.getLatestRealContractSummary()).toBeNull();
  });
});

// =============================================================================
// SignalProcessor
// =============================================================================
describe('SignalProcessor', () => {
  const exec = () => ({ executeTrade: vi.fn().mockResolvedValue(true) });

  it('encaminha sinal válido (sintético e forex) e devolve o resultado do executor', async () => {
    const ex = exec();
    const sp = new SignalProcessor(ex as any);
    expect(await sp.processSignal(sig() as any)).toBe(true);
    expect(await sp.processSignal(sig({ symbol: 'frxXYZ', isForex: true }) as any)).toBe(true);
    expect(ex.executeTrade).toHaveBeenCalledTimes(2);
    ex.executeTrade.mockResolvedValueOnce(false);
    expect(await sp.processSignal(sig() as any)).toBe(false);
  });

  it.each([
    ['sem símbolo', { symbol: '' }],
    ['tipo inválido', { contractType: 'MULTUP' }],
    ['duração <= 0', { duration: 0 }],
    ['valor <= 0', { amount: 0 }],
    ['mercado desconhecido', { symbol: '1HZ150V' }],
  ])('descarta sinal: %s', async (_, overrides) => {
    const ex = exec();
    expect(await new SignalProcessor(ex as any).processSignal(sig(overrides) as any)).toBe(false);
    expect(ex.executeTrade).not.toHaveBeenCalled();
  });

  it('propaga erro do executor', async () => {
    const ex = { executeTrade: vi.fn().mockRejectedValue(new Error('x')) };
    await expect(new SignalProcessor(ex as any).processSignal(sig() as any)).rejects.toThrow('x');
  });

  it('flags, mapeamentos e tipos válidos', async () => {
    const ex = exec();
    const sp = new SignalProcessor(ex as any);
    sp.setEnabled(true);
    expect(sp.isProcessingEnabled()).toBe(true);
    sp.addMarketMapping('1HZ150V', 999);
    await sp.processSignal(sig({ symbol: '1HZ150V' }) as any);
    expect(ex.executeTrade).toHaveBeenCalled();
    const types = sp.getValidContractTypes();
    types.push('X');
    expect(sp.getValidContractTypes()).not.toContain('X');
  });
});

// =============================================================================
// CopyTradingService — trechos sem cobertura na suíte existente
// =============================================================================
describe('CopyTradingService — conexão e configuração', () => {
  it('start repete a conexão real e desiste após 3 tentativas', async () => {
    // Falha no resolve (OTP), não no socket: assim attemptReconnect não entra em cena (ver BUG-03).
    for (let i = 0; i < 3; i++) resolveMock.mockRejectedValueOnce(new Error(`falha ${i}`));
    const service = new CopyTradingService('d', 'r', 's', {});
    (service as any).tradeExecutor.on('error', () => {});
    const outcome = service.start().catch((e) => e);
    await vi.advanceTimersByTimeAsync(2000 + 4000);
    expect((await outcome).message).toBe('falha 2');
    expect(resolveMock).toHaveBeenCalledTimes(3);
    expect(service.getStats().isRunning).toBe(false);
  });

  it('start é idempotente quando já está rodando', async () => {
    const service = new CopyTradingService('d', 'r', 's', {});
    (service as any).isRunning = true;
    await service.start();
    expect(FakeWs.sockets).toHaveLength(0);
  });

  it('reconecta a demo 5s após queda enquanto roda, e não após stop', async () => {
    const service = new CopyTradingService('d', 'r', 's', {});
    const p = service.start();
    await flush();
    FakeWs.last('real').open();
    await p;
    await flush();
    FakeWs.last('demo').open();

    FakeWs.last('demo').drop();
    await vi.advanceTimersByTimeAsync(5000);
    expect(FakeWs.byKind('demo')).toHaveLength(2);

    FakeWs.last('demo').open();
    FakeWs.last('demo').drop();
    (service as any).isRunning = false;
    await vi.advanceTimersByTimeAsync(5000);
    expect(FakeWs.byKind('demo')).toHaveLength(2);
  });

  it('erro e authError da demo; authError da real para o bot; saldo atualizado', () => {
    const service = new CopyTradingService('d', 'r', 's', {});
    const internal = service as any;
    internal.wsListener.emit('error', new Error('demo caiu'));
    internal.tradeExecutor.emit('balance', 42);
    internal.wsListener.emit('authError', { code: 'AccountDisabled', message: 'off' });
    expect(service.getStats().authError).toEqual({ code: 'AccountDisabled', message: 'off', source: 'demo' });
    internal.tradeExecutor.emit('authError', { code: 'InvalidToken', message: 'bad' });
    const stats = service.getStats();
    expect(stats.authError.source).toBe('real');
    expect(stats.balance).toBe(42);
    expect(stats.errors.errorCount).toBe(3);
  });

  it('setters delegam ao executor; getters de sessão', () => {
    const service = new CopyTradingService('demoTok', 'realTok', 's1', {});
    const ex = (service as any).tradeExecutor;
    service.setDuplicateProtection(false);
    service.setCurrency('EUR');
    service.setAppMarkupPercentage(3);
    expect(ex.duplicateProtection).toBe(false);
    expect(ex.currency).toBe('EUR');
    expect(ex.appMarkupPercentage).toBe(3);
    expect(service.getDemoToken()).toBe('demoTok');
    expect(service.getRealToken()).toBe('realTok');
    service.setSessionId('s2');
    expect(service.getSessionId()).toBe('s2');
  });

  it('limita a lista de erros a 50', () => {
    const service = new CopyTradingService('d', 'r', 's', {});
    for (let i = 0; i < 55; i++) (service as any).addError('info', 't', `m${i}`, 'trading');
    expect(service.getStats().errors.errors).toHaveLength(50);
  });
});
