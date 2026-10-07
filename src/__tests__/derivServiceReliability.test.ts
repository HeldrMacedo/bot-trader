// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  installFakes,
  bootConnected,
  flush,
  lastTrading,
  lastMarket,
  messageListenerCount,
  OAUTH_DEMO,
} from './derivServiceTestHarness';

vi.mock('react-toastify', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

const POC = { proposal_open_contract: 1, contract_id: 123 };

async function subscribeOn(ws: any, svc: any, payload: any, subId: string) {
  const promise = svc.subscribe(payload);
  await flush();
  const req = ws.sent.filter((m: any) => m.subscribe === 1).at(-1);
  ws.receive({
    msg_type: Object.keys(payload)[0],
    req_id: req.req_id,
    echo_req: req,
    subscription: { id: subId },
  });
  return promise;
}

describe('DerivService — reconexão com ordem ativa', () => {
  beforeEach(installFakes);
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('reinscreve o proposal_open_contract após queda inesperada do canal de trade', async () => {
    const { svc, trade } = await bootConnected();
    await subscribeOn(trade, svc, POC, 'poc-1');

    trade.drop();
    await vi.advanceTimersByTimeAsync(1000);
    const trade2 = lastTrading();
    expect(trade2).not.toBe(trade);
    trade2.open();
    await flush();

    expect(trade2.sent.filter((m) => m.proposal_open_contract === 1 && m.contract_id === 123)).toHaveLength(1);
  });

  it('reinscreve a assinatura de ticks após queda do canal de mercado', async () => {
    const { svc, market } = await bootConnected();
    await subscribeOn(market, svc, { ticks: 'R_100' }, 'tick-1');

    market.drop();
    await vi.advanceTimersByTimeAsync(1000);
    const market2 = lastMarket();
    expect(market2).not.toBe(market);
    market2.open();
    await flush();

    expect(market2.sent.filter((m) => m.ticks === 'R_100')).toHaveLength(1);
  });

  it('envia a reinscrição apenas uma vez mesmo com token OAuth ativo (sem stream duplicado)', async () => {
    const { svc, trade } = await bootConnected();
    svc.setToken(OAUTH_DEMO);
    await subscribeOn(trade, svc, POC, 'poc-1');

    trade.fail(); // erro dispara reconnect(), que preserva as assinaturas
    await flush();
    await vi.advanceTimersByTimeAsync(1000);
    const trade2 = lastTrading();
    trade2.open();
    await flush();

    expect(trade2.sent.filter((m) => m.proposal_open_contract === 1)).toHaveLength(1);
  });
});

describe('DerivService — timeouts e requisições em voo', () => {
  beforeEach(installFakes);
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('rejeita uma requisição já enviada quando a conexão cai antes da resposta', async () => {
    const { svc, trade } = await bootConnected();
    const settled = vi.fn();
    svc.send({ proposal: 1 }).then(settled, settled);
    await flush();
    expect(trade.sent.some((m) => m.proposal === 1)).toBe(true);

    trade.drop();
    await flush();

    expect(settled).toHaveBeenCalledTimes(1);
    expect(settled.mock.calls[0][0]).toBeInstanceOf(Error);
  });

  it('rejeita por timeout uma requisição enviada que nunca recebe resposta', async () => {
    const { svc } = await bootConnected();
    const settled = vi.fn();
    svc.send({ proposal: 1 }).then(settled, settled);

    await vi.advanceTimersByTimeAsync(20000);

    expect(settled).toHaveBeenCalledWith(expect.objectContaining({ code: 'Timeout' }));
  });
});

describe('DerivService — limpeza de listeners e assinaturas', () => {
  beforeEach(installFakes);
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('remove o listener de message quando a requisição enfileirada expira', async () => {
    const { svc, trade } = await bootConnected();
    trade.drop(); // derruba trade: requisições autenticadas vão para a fila
    await flush();
    const baseline = messageListenerCount(svc);

    svc.send({ proposal: 1 }).catch(() => {});
    await vi.advanceTimersByTimeAsync(20000);

    expect(messageListenerCount(svc)).toBe(baseline);
  });

  it('remove o listener de message quando a conexão fecha com a requisição pendente', async () => {
    const { svc, trade } = await bootConnected();

    svc.send({ proposal: 1 }).catch(() => {});
    expect(messageListenerCount(svc)).toBeGreaterThan(0);
    trade.drop();
    await flush();

    // Só existiam requisições do canal de trade (inclusive o balance do boot).
    expect(messageListenerCount(svc)).toBe(0);
  });

  it('libera a assinatura local quando o forget é confirmado (resposta forget=1)', async () => {
    const { svc, market } = await bootConnected();
    await subscribeOn(market, svc, { ticks: 'R_100' }, 'tick-1');

    const forget = svc.send({ forget: 'tick-1' });
    await flush();
    const req = market.sent.find((m) => m.forget === 'tick-1');
    market.receive({ msg_type: 'forget', forget: 1, echo_req: { forget: 'tick-1', req_id: req.req_id }, req_id: req.req_id });
    await forget;

    const before = market.sent.length;
    svc.subscribe({ ticks: 'R_100' });
    await flush();

    expect(market.sent.length).toBe(before + 1);
  });

  it('roteia o forget de um stream aberto via send(ticks_history, subscribe) para o canal de mercado', async () => {
    const { svc, trade, market } = await bootConnected();
    const hist = svc.send({ ticks_history: 'R_100', count: 10, end: 'latest', style: 'ticks', subscribe: 1 });
    await flush();
    const req = market.sent.find((m) => m.ticks_history === 'R_100');
    market.receive({ msg_type: 'history', req_id: req.req_id, history: { prices: [], times: [] }, subscription: { id: 'hist-1' } });
    await hist;

    svc.send({ forget: 'hist-1' }).catch(() => {});
    await flush();

    expect(market.sent.some((m) => m.forget === 'hist-1')).toBe(true);
    expect(trade.sent.some((m) => m.forget === 'hist-1')).toBe(false);
  });
});

describe('DerivService — troca de conta', () => {
  beforeEach(installFakes);
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('switchAccount rejeita em vez de travar quando a nova conexão nunca abre', async () => {
    const { svc } = await bootConnected();
    const settled = vi.fn();
    svc.switchAccount('oauth:ACCESS:CR1').then(settled, settled);

    await vi.advanceTimersByTimeAsync(60000);

    expect(settled).toHaveBeenCalledTimes(1);
    expect(settled.mock.calls[0][0]).toBeInstanceOf(Error);
  });
});
