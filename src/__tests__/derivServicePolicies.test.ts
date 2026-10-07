// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  FakeWebSocket,
  installFakes,
  bootConnected,
  createService,
  seedAccount,
  flush,
  lastTrading,
  tradingSockets,
  OAUTH_REAL,
} from './derivServiceTestHarness';

vi.mock('react-toastify', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

function reply(ws: FakeWebSocket, match: (m: any) => boolean, data: Record<string, any>) {
  const req = ws.sent.filter(match).at(-1);
  ws.receive({ req_id: req.req_id, echo_req: req, ...data });
}

async function buyContract(svc: any, trade: FakeWebSocket, contractId: number) {
  const bought = svc.send({ buy: 1, price: 1 });
  await flush();
  reply(trade, (m) => m.buy === 1, { msg_type: 'buy', buy: { contract_id: contractId } });
  return bought;
}

beforeEach(() => {
  installFakes();
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'log').mockImplementation(() => {});
});
afterEach(() => {
  window.history.replaceState({}, '', '/');
  vi.restoreAllMocks();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('DerivService — troca de conta com contrato aberto', () => {
  it('bloqueia a troca enquanto a corretora informa o contrato como aberto', async () => {
    const { svc, trade } = await bootConnected();
    await buyContract(svc, trade, 501);

    const switching = svc.switchAccount(OAUTH_REAL);
    const assertion = expect(switching).rejects.toThrow(/contrato em aberto/i);
    await flush();
    reply(trade, (m) => m.proposal_open_contract === 1 && m.contract_id === 501 && !m.subscribe, {
      msg_type: 'proposal_open_contract',
      proposal_open_contract: { contract_id: 501, is_sold: 0, status: 'open' },
    });
    await assertion;

    expect(tradingSockets()).toHaveLength(1);
    expect(svc.getStorageDerivAccount()![0].activeToken).not.toBe(OAUTH_REAL);
  });

  it('libera a troca quando a liquidação do contrato chega pelo stream', async () => {
    const { svc, trade } = await bootConnected();
    await buyContract(svc, trade, 502);
    trade.receive({
      msg_type: 'proposal_open_contract',
      proposal_open_contract: { contract_id: 502, is_sold: 1, status: 'lost' },
    });

    const switching = svc.switchAccount(OAUTH_REAL);
    await flush();
    lastTrading().open();
    await vi.advanceTimersByTimeAsync(200);
    await switching;

    expect(svc.getStorageDerivAccount()![0].activeToken).toBe(OAUTH_REAL);
  });

  it('libera a troca quando a consulta à corretora mostra o contrato já liquidado', async () => {
    const { svc, trade } = await bootConnected();
    await buyContract(svc, trade, 503);

    const switching = svc.switchAccount(OAUTH_REAL);
    await flush();
    reply(trade, (m) => m.contract_id === 503 && !m.subscribe, {
      msg_type: 'proposal_open_contract',
      proposal_open_contract: { contract_id: 503, is_sold: 1, status: 'won' },
    });
    await flush();
    lastTrading().open();
    await vi.advanceTimersByTimeAsync(200);
    await switching;

    expect(svc.getStorageDerivAccount()![0].activeToken).toBe(OAUTH_REAL);
  });

  it('mantém o bloqueio quando a consulta do contrato falha', async () => {
    const { svc, trade } = await bootConnected();
    await buyContract(svc, trade, 504);

    const switching = svc.switchAccount(OAUTH_REAL);
    const assertion = expect(switching).rejects.toThrow(/contrato em aberto/i);
    await flush();
    reply(trade, (m) => m.contract_id === 504 && !m.subscribe, { error: { code: 'RateLimit' } });
    await assertion;
  });
});

describe('DerivService — compra só com conexão', () => {
  it('recusa na hora um buy sem conexão de trade, sem enfileirar', async () => {
    const { svc, trade } = await bootConnected();
    trade.drop();
    await flush();

    await expect(svc.send({ buy: 1, price: 1 })).rejects.toMatchObject({
      code: 'NotConnected',
      message: expect.stringMatching(/compra não foi enviada/i),
    });
    expect((svc as any).pendingRequests).toHaveLength(0);
  });

  it('informa prontidão para operar e emite trade.status nas mudanças', async () => {
    seedAccount();
    const svc = createService();
    const status = vi.fn();
    svc.observerInstance.on('trade.status', status);
    expect(svc.isTradeReady).toBe(false);
    await flush();
    const trade = lastTrading();
    trade.open();
    expect(svc.isTradeReady).toBe(true);
    trade.drop();
    expect(svc.isTradeReady).toBe(false);
    expect(status.mock.calls.map((c) => c[0])).toEqual([true, false]);
  });
});

describe('DerivService — buy enviado sem confirmação', () => {
  const unconfirmed = {
    code: 'BuyUnconfirmed',
    message: expect.stringMatching(/pode ter sido executada/i),
  };

  it('timeout de buy enviado avisa que a ordem pode ter sido executada', async () => {
    const { svc } = await bootConnected();
    const { toast } = await import('react-toastify');
    const bought = svc.send({ buy: 1, price: 1 });
    const assertion = expect(bought).rejects.toMatchObject(unconfirmed);
    await vi.advanceTimersByTimeAsync(20000);
    await assertion;
    expect(toast.error).toHaveBeenCalledWith(expect.stringMatching(/pode ter sido executada/i));
  });

  it('queda da conexão com buy enviado avisa que a ordem pode ter sido executada', async () => {
    const { svc, trade } = await bootConnected();
    const bought = svc.send({ buy: 1, price: 1 });
    const assertion = expect(bought).rejects.toMatchObject(unconfirmed);
    await flush();
    trade.drop();
    await assertion;
  });
});

describe('DerivService — somente a conexão OAuth', () => {
  it('não abre o endpoint legado quando o OTP falha e tenta de novo depois', async () => {
    seedAccount();
    const fetchMock = vi.fn(async () => ({ ok: false }));
    vi.stubGlobal('fetch', fetchMock);
    createService();
    await flush();
    expect(tradingSockets()).toHaveLength(0);

    await vi.advanceTimersByTimeAsync(1000);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(FakeWebSocket.instances.some((w) => w.url.includes('websockets/v3'))).toBe(false);
  });

  it('não conecta com token que não é OAuth', async () => {
    seedAccount('a1-legacy');
    createService();
    await flush();
    expect(tradingSockets()).toHaveLength(0);
  });

  it('ignora tokens legados na query string', () => {
    window.history.replaceState({}, '', '/home?acct1=VRTC1&token1=t1&cur1=USD');
    createService();
    expect(localStorage.getItem('token_list')).toBeNull();
  });

  it('recusa autenticar, trocar conta ou consultar histórico com token legado', async () => {
    const { svc } = await bootConnected();
    await expect(svc.authenticate('a1-legacy')).rejects.toThrow(/OAuth/);
    await expect(svc.switchAccount('a1-legacy')).rejects.toThrow(/OAuth/);
    await expect(svc.getProfitTableForAccount('a1-legacy')).rejects.toThrow(/OAuth/);
    expect(lastTrading().sent.some((m) => 'authorize' in m)).toBe(false);
  });

  it('não expõe mais handleDemoAccountChange', () => {
    expect((createService() as any).handleDemoAccountChange).toBeUndefined();
  });
});
