// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DerivService } from '../app/services/DerivService';
import {
  FakeWebSocket,
  installFakes,
  bootConnected,
  createService,
  seedAccount,
  flush,
  lastTrading,
  lastMarket,
  otpFetchOk,
  OAUTH_DEMO,
  OAUTH_REAL,
  OTP_URL,
} from './derivServiceTestHarness';

vi.mock('react-toastify', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

const LEGACY = 'a1-legacy';

function seedLegacy() {
  seedAccount(LEGACY);
  const accounts = JSON.parse(localStorage.getItem('deriv_accounts')!);
  accounts[0].tokens[0].token = LEGACY;
  localStorage.setItem('deriv_accounts', JSON.stringify(accounts));
}

function reply(ws: FakeWebSocket, match: (m: any) => boolean, data: Record<string, any>) {
  const req = ws.sent.filter(match).at(-1);
  ws.receive({ req_id: req.req_id, echo_req: req, ...data });
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

describe('DerivService — instância e inicialização', () => {
  it('getInstance devolve sempre o mesmo singleton e o expõe no window', () => {
    (DerivService as any).instance = undefined;
    const a = DerivService.getInstance();
    expect(DerivService.getInstance()).toBe(a);
    expect((window as any).DerivServiceInstance).toBe(a);
    (DerivService as any).instance = undefined;
  });

  it('não abre o canal de trade sem conta salva, mas abre o de mercado', () => {
    createService();
    expect(FakeWebSocket.instances.map((w) => w.url)).toEqual([
      'wss://api.derivws.com/trading/v1/options/ws/public',
    ]);
  });

  it('ignora query sem tokens', () => {
    window.history.replaceState({}, '', '/home?foo=bar');
    createService();
    expect(localStorage.getItem('token_list')).toBeNull();
  });
});

describe('DerivService — callback OAuth (PKCE)', () => {
  function oauthFetch(authResponse: any) {
    return vi.fn(async (url: string) =>
      url === '/api/deriv-auth' ? authResponse : { ok: true, json: async () => ({ websocket_url: OTP_URL }) }
    );
  }

  beforeEach(() => {
    window.history.replaceState({}, '', '/home?code=abc&state=st');
    sessionStorage.setItem('oauth_state', 'st');
    sessionStorage.setItem('pkce_code_verifier', 'verifier');
  });

  it('troca o code por tokens, salva a conta demo como ativa e limpa o PKCE', async () => {
    const fetchMock = oauthFetch({
      ok: true,
      json: async () => ({
        accessToken: 'AT',
        accounts: [
          { account_id: 'CR9', account_type: 'real', currency: 'USD', balance: 5 },
          { account_id: 'VRTC9', account_type: 'demo', currency: 'USD', balance: 10 },
        ],
      }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const updates = vi.fn();
    const svc = createService();
    svc.observerInstance.on('account.update', updates);
    await flush();

    expect(fetchMock).toHaveBeenCalledWith('/api/deriv-auth', expect.objectContaining({ method: 'POST' }));
    expect(svc.getStorageDerivAccount()![0].activeToken).toBe('oauth:AT:VRTC9');
    expect(JSON.parse(localStorage.getItem('token_list')!)).toHaveLength(2);
    expect(sessionStorage.getItem('oauth_state')).toBeNull();
    expect(sessionStorage.getItem('pkce_code_verifier')).toBeNull();
  });

  it('não salva conta quando a corretora não devolve contas', async () => {
    vi.stubGlobal('fetch', oauthFetch({ ok: true, json: async () => ({ accessToken: 'AT', accounts: [] }) }));
    const svc = createService();
    await flush();
    expect(svc.getStorageDerivAccount()).toBeNull();
  });

  it('rejeita state divergente (CSRF)', async () => {
    sessionStorage.setItem('oauth_state', 'outro');
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    createService();
    await flush();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalledWith('State mismatch. Potential CSRF attack.');
  });

  it('rejeita callback sem code_verifier', async () => {
    sessionStorage.removeItem('pkce_code_verifier');
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    createService();
    await flush();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalledWith('Code verifier not found in session.');
  });

  it('trata falha na troca do code', async () => {
    vi.stubGlobal('fetch', oauthFetch({ ok: false }));
    createService();
    await flush();
    expect(console.error).toHaveBeenCalledWith('Error handling OAuth callback:', expect.any(Error));
  });
});

describe('DerivService — loginDeriv', () => {
  it('gera PKCE, guarda verifier/state e monta a URL de autorização', async () => {
    const svc = createService();
    await svc.loginDeriv().catch(() => {});
    expect(sessionStorage.getItem('pkce_code_verifier')).toHaveLength(64);
    expect(sessionStorage.getItem('oauth_state')).toMatch(/^[0-9a-f]{32}$/);
  });
});

describe('DerivService — conexão', () => {

  it('OTP sem websocket_url não abre socket e agenda nova tentativa', async () => {
    seedAccount();
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({}) })));
    const svc = createService();
    await flush();
    expect(tradingSockets()).toHaveLength(0);
    expect((svc as any).reconnectTimeout).not.toBeNull();
  });

  it('não abre segunda conexão se a atual ainda está conectando', async () => {
    seedAccount();
    const svc = createService();
    await flush();
    const before = tradingSockets().length;
    svc.connect();
    await flush();
    expect(tradingSockets().length).toBe(before);
  });

  it('envia ping a cada 25s nos dois canais', async () => {
    const { trade, market } = await bootConnected();
    await vi.advanceTimersByTimeAsync(25000);
    expect(trade.sent).toContainEqual({ ping: 1 });
    expect(market.sent).toContainEqual({ ping: 1 });
  });

  it('ignora eventos de sockets antigos', async () => {
    const { svc } = await bootConnected();
    const stale = new FakeWebSocket('wss://stale');
    stale.readyState = FakeWebSocket.OPEN;
    svc.handleOpen(stale as any);
    svc.handleMessage(stale as any, { data: '{}' } as any);
    svc.handleMarketOpen(stale as any);
    svc.handleMarketMessage(stale as any, { data: '{}' } as any);
    (svc as any).handleError(stale, {});
    (svc as any).handleClose(stale, {});
    (svc as any).handleMarketError(stale, {});
    (svc as any).handleMarketClose(stale, {});
    expect(svc.isConnected).toBe(true);
  });

  it('ignora mensagens que não são JSON', async () => {
    const { svc, trade, market } = await bootConnected();
    trade.fire('message', { data: 'xx' });
    market.fire('message', { data: 'xx' });
    expect(console.error).toHaveBeenCalledWith('Error parsing message:', expect.anything());
    expect(console.error).toHaveBeenCalledWith('Error parsing market message:', expect.anything());
    expect(svc.isConnected).toBe(true);
  });

  it('erro no canal de mercado agenda reconexão', async () => {
    const { svc, market } = await bootConnected();
    market.fail();
    expect((svc as any).marketReconnectTimeout).not.toBeNull();
  });

  it('para de reconectar após o limite de tentativas', async () => {
    const { svc } = await bootConnected();
    (svc as any).reconnectAttempts = 5;
    svc.reconnect();
    (svc as any).marketReconnectAttempts = 10;
    svc.reconnectMarketWs();
    expect((svc as any).reconnectTimeout).toBeNull();
    expect((svc as any).marketReconnectTimeout).toBeNull();
  });

  it('não reconecta enquanto há uma reconexão agendada ou fechamento manual', async () => {
    const { svc, trade } = await bootConnected();
    trade.fail();
    const timer = (svc as any).reconnectTimeout;
    svc.reconnect();
    expect((svc as any).reconnectTimeout).toBe(timer);
    svc.reconnectMarketWs();
    const marketTimer = (svc as any).marketReconnectTimeout;
    svc.reconnectMarketWs();
    expect((svc as any).marketReconnectTimeout).toBe(marketTimer);
  });

  it('disconnect cancela as assinaturas dos dois canais e fecha sem reconectar', async () => {
    const { svc, trade, market } = await bootConnected();
    reply(trade, (m) => m.balance === 1, { msg_type: 'balance', subscription: { id: 'bal-1' } });
    const tick = svc.subscribe({ ticks: 'R_100' });
    await flush();
    reply(market, (m) => m.ticks === 'R_100', { msg_type: 'tick', subscription: { id: 'tick-1' } });
    await tick;

    svc.disconnect();
    await flush();
    reply(trade, (m) => m.forget === 'bal-1', { msg_type: 'forget', forget: 1 });
    reply(market, (m) => m.forget === 'tick-1', { msg_type: 'forget', forget: 1 });
    await flush();

    expect(trade.readyState).toBe(FakeWebSocket.CLOSED);
    expect(market.readyState).toBe(FakeWebSocket.CLOSED);
    await vi.advanceTimersByTimeAsync(20000);
    expect(tradingSockets()).toHaveLength(1);
  });

  it('disconnect sem conexões ativas apenas limpa o estado', async () => {
    const svc = createService();
    (svc as any).marketWs = null;
    svc.disconnect();
    await flush();
    expect(svc.isConnected).toBe(false);
  });

  it('destroy fecha a conexão e remove todos os listeners', async () => {
    const { svc } = await bootConnected();
    const listener = vi.fn();
    svc.observerInstance.on('account.update', listener);
    svc.destroy();
    svc.setAccountData({} as any);
    expect(listener).not.toHaveBeenCalled();
  });
});

const tradingSockets = () => FakeWebSocket.instances.filter((w) => !w.url.includes('/ws/public'));

describe('DerivService — assinaturas', () => {
  it('reaproveita assinatura idêntica já ativa', async () => {
    const { svc, market } = await bootConnected();
    const first = svc.subscribe({ ticks: 'R_50' });
    await flush();
    reply(market, (m) => m.ticks === 'R_50', { msg_type: 'tick', subscription: { id: 't-50' } });
    await first;
    await expect(svc.subscribe({ ticks: 'R_50' })).resolves.toEqual({ subscription: { id: 'existing' } });
  });

  it('trata AlreadySubscribed como assinatura existente no servidor', async () => {
    const { svc, market } = await bootConnected();
    const sub = svc.subscribe({ ticks: 'R_75' });
    await flush();
    reply(market, (m) => m.ticks === 'R_75', { error: { code: 'AlreadySubscribed' } });
    await expect(sub).resolves.toEqual({ subscription: { id: 'server_existing' } });
  });

  it('propaga outros erros de assinatura', async () => {
    const { svc, market } = await bootConnected();
    const sub = svc.subscribe({ ticks: 'R_10' });
    await flush();
    reply(market, (m) => m.ticks === 'R_10', { error: { code: 'InvalidSymbol' } });
    await expect(sub).rejects.toEqual({ code: 'InvalidSymbol' });
  });

  it('guarda o ID da assinatura de saldo e aceita AlreadySubscribed', async () => {
    const { svc, trade } = await bootConnected();
    reply(trade, (m) => m.balance === 1, { msg_type: 'balance', subscription: { id: 'bal-9' } });
    await flush();
    expect((svc as any).balanceSubscriptionId).toBe('bal-9');
    await (svc as any).setupBalanceMonitoring();

    (svc as any).balanceSubscriptionId = null;
    (svc as any).subscribes.clear();
    const again = (svc as any).setupBalanceMonitoring();
    await flush();
    reply(trade, (m) => m.balance === 1, { error: { code: 'AlreadySubscribed' } });
    await again;
    expect((svc as any).balanceSubscriptionId).toBe('server_existing');
  });

  it('não volta à fila uma reinscrição recusada pela corretora', async () => {
    const { svc, trade } = await bootConnected();
    (svc as any).pendingResubscribes.set('old', { proposal_open_contract: 1, contract_id: 9 });
    (svc as any).dispatchPendingResubscribes();
    await flush();
    reply(trade, (m) => m.contract_id === 9, { error: { code: 'InvalidContractId' } });
    await flush();
    expect((svc as any).pendingResubscribes.size).toBe(0);
  });

  it('atualiza o saldo do token quando chega evento de balance', async () => {
    const { svc, trade } = await bootConnected();
    trade.receive({ msg_type: 'balance', balance: { loginid: 'VRTC1', balance: 77 } });
    expect(svc.getCurrentBalance()).toEqual({ balance: 77, currency: 'USD' });
  });

  it('busca histórico de ticks e profit table da conta ativa', async () => {
    const { svc, trade, market } = await bootConnected();
    const hist = svc.getHistoricalTicks('R_100', 5);
    const profit = svc.getProfitTable(10, 0);
    await flush();
    reply(market, (m) => m.ticks_history === 'R_100', { msg_type: 'history', history: { prices: [1] } });
    reply(trade, (m) => m.profit_table === 1, { msg_type: 'profit_table', profit_table: { count: 0 } });
    await expect(hist).resolves.toMatchObject({ history: { prices: [1] } });
    await expect(profit).resolves.toMatchObject({ profit_table: { count: 0 } });
  });

  it('envia na fila quando o canal de mercado reabre', async () => {
    seedAccount();
    const svc = createService();
    const hist = svc.getHistoricalTicks('R_25', 1);
    await flush();
    const market = lastMarket();
    market.open();
    reply(market, (m) => m.ticks_history === 'R_25', { msg_type: 'history' });
    await expect(hist).resolves.toMatchObject({ msg_type: 'history' });
  });
});

describe('DerivService — autenticação e contas', () => {

  it('não faz nada sem conta salva nem token_list', async () => {
    const { svc } = await bootConnected();
    localStorage.removeItem('deriv_accounts');
    await svc.processAuthenticatedUserData();
    expect(svc.getStorageDerivAccount()).toBeNull();
  });

  it('switchAccount OAuth reconecta com o OTP da nova conta e salva como ativa', async () => {
    const { svc } = await bootConnected();
    const switching = svc.switchAccount(OAUTH_REAL);
    await flush();
    lastTrading().open();
    await vi.advanceTimersByTimeAsync(200);
    await switching;
    const account = svc.getStorageDerivAccount()![0];
    expect(account.activeToken).toBe(OAUTH_REAL);
    expect(account.selectedLoginId).toBe('CR1');
  });

  it('switchAccount sem token lança erro', async () => {
    const svc = createService();
    await expect(svc.switchAccount('')).rejects.toThrow('Token inválido');
  });

  it('gerencia tokens (ativo, virtual, lista)', () => {
    const svc = createService();
    expect(svc.getToken()).toBeNull();
    localStorage.setItem('token_list', JSON.stringify([{ token: 'tv', is_virtual: true }]));
    expect(svc.getToken()).toBe('tv');
    svc.setToken('tx');
    expect(svc.getToken()).toBe('tx');
    expect(svc.getTokens()).toHaveLength(1);
  });

  it('remove e limpa dados da conta', () => {
    seedAccount();
    const svc = createService() as any;
    const updates = vi.fn();
    svc.observerInstance.on('account.update', updates);
    svc.removeDerivAccount();
    svc.cleanAccountData();
    expect(svc.getStorageDerivAccount()).toBeNull();
    expect(updates).toHaveBeenCalledWith(null);
  });
});

describe('DerivService — preferências da conta', () => {
  it('atualiza barreira, dígito e volatilidade e persiste', async () => {
    const { svc } = await bootConnected();
    svc.updateBarrier('7');
    svc.updateDigits(4);
    svc.updateVolatility('R_50');
    expect(svc.currentBarrier).toBe('7');
    expect(svc.currentDigits).toBe(4);
    expect(svc.getStorageDerivAccount()![0].volatility).toBe('R_50');
  });

  it('ignora atualizações sem conta carregada', () => {
    const svc = createService();
    svc.updateBarrier('1');
    svc.updateDigits(1);
    svc.updateVolatility('R_10');
    expect(svc.currentBarrier).toBe('');
    expect(svc.currentDigits).toBe(3);
    expect(svc.getCurrentBalance()).toBeNull();
  });

  it('limpa histórico de resultados', async () => {
    const { svc } = await bootConnected();
    (svc as any).currentAccount.results = { loss: 2, result: -2, wins: 0 };
    svc.clearHistory();
    expect(svc.getStorageDerivAccount()![0].results).toEqual({ loss: 0, result: 0, wins: 0 });
    localStorage.removeItem('deriv_accounts');
    svc.clearHistory();
  });

  it('getCurrentBalance carrega do storage e devolve null sem saldo', () => {
    seedAccount();
    const svc = createService();
    expect(svc.getCurrentBalance()).toEqual({ balance: 100, currency: 'USD' });
    (svc as any).currentAccount.activeToken = 'desconhecido';
    expect(svc.getCurrentBalance()).toBeNull();
  });

  it('expõe token demo, loginId ativo e estado de autorização', async () => {
    const { svc } = await bootConnected();
    expect(svc.getTokenDemo()).toBe(OAUTH_DEMO);
    expect(svc.getActiveLoginId()).toBe('VRTC1');
    expect(svc.hasAuthorized).toBe(true);
    (svc as any).currentAccount.tokens = [];
    expect(svc.getActiveLoginId()).toBe('VRTC1');
  });

  it('getActiveLoginId sem conta devolve vazio', () => {
    expect(createService().getActiveLoginId()).toBe('');
  });

  it('getActiveAccessToken extrai o access token OAuth sem registrá-lo no console', () => {
    seedAccount();
    const svc = createService();
    expect(svc.getActiveAccessToken()).toBe('ACCESS');
    const logged = vi.mocked(console.log).mock.calls.flat().map((v) => JSON.stringify(v)).join(' ');
    expect(logged).not.toContain('ACCESS');
  });

  it('getActiveAccessToken devolve null para token legado', () => {
    seedLegacy();
    expect(createService().getActiveAccessToken()).toBeNull();
  });
});

describe('DerivService — dígitos e histórico local', () => {
  it('extrai o último dígito pela precisão do símbolo', () => {
    const svc = createService();
    expect(svc.extractLastDigit(1234.56, 'R_100')).toBe(6);
    expect(svc.extractLastDigit(5170.16, 'R_10')).toBe(0);
    expect(svc.extractLastDigit(1.234, 'R_25')).toBe(4);
    expect(svc.extractLastDigit(1.2345, 'RDBEAR')).toBe(5);
    expect(svc.extractLastDigit(10.21, 'JD10')).toBe(1);
    expect(svc.extractLastDigit(10.27, '1HZ100V')).toBe(7);
    expect(svc.extractLastDigit(1.23456, 'XYZ')).toBe(6);
    expect(svc.extractLastDigit('1' as any, 'R_100')).toBeNull();
    expect(svc.extractLastDigitForAsset('R_100', 1.29)).toBe(9);
    expect(svc.extractLastDigitUnified('1' as any)).toBeNull();
    localStorage.setItem('selectedSymbol', 'R_100');
    expect(svc.extractLastDigitUnified(2.31)).toBe(1);
    expect(svc.extractLastDigitUnified(2.31, 'R_25')).toBe(0);
  });

  it('mantém histórico de ticks com casas decimais detectadas e limite de 1000', async () => {
    const { svc, market } = await bootConnected();
    market.receive({ msg_type: 'tick', tick: { symbol: 'ABC', quote: 1.5, epoch: 1 } });
    market.receive({ msg_type: 'tick', tick: { symbol: 'ABC', quote: 1.25, epoch: 2 } });
    market.receive({ msg_type: 'tick', tick: { symbol: 'ABC', quote: 2, epoch: 3 } });
    market.receive({ msg_type: 'tick', tick: { symbol: 'INT', quote: 7, epoch: 1 } });
    expect(svc.extractLastDigit(1.25, 'ABC')).toBe(5);
    expect(svc.extractLastDigit(17, 'INT')).toBe(0);
    expect(svc.getHistoricalTicksSync('ABC', 2)).toEqual({ prices: [1.25, 2], times: [2, 3] });
    expect(svc.getHistoricalTicksSync('NONE', 2)).toBeNull();

    for (let i = 0; i < 1001; i++) {
      market.receive({ msg_type: 'tick', tick: { symbol: 'BIG', quote: i, epoch: i } });
    }
    expect(svc.getHistoricalTicksSync('BIG', 5000)!.prices).toHaveLength(1000);
    market.receive({ msg_type: 'tick' });
  });
});

describe('DerivService — profit table de outra conta', () => {
  it('reaproveita a conexão principal para a conta ativa', async () => {
    const { svc, trade } = await bootConnected();
    const profit = svc.getProfitTableForAccount(OAUTH_DEMO);
    await flush();
    reply(trade, (m) => m.profit_table === 1, { msg_type: 'profit_table', profit_table: { count: 1 } });
    await expect(profit).resolves.toMatchObject({ profit_table: { count: 1 } });
  });

  it('usa conexão temporária pré-autorizada via OTP para outra conta OAuth', async () => {
    const { svc } = await bootConnected();
    vi.stubGlobal('fetch', otpFetchOk('wss://tmp/real'));
    const profit = svc.getProfitTableForAccount(OAUTH_REAL);
    await flush();
    const tmp = FakeWebSocket.instances.at(-1)!;
    tmp.open();
    expect(tmp.sent[0]).toMatchObject({ profit_table: 1 });
    tmp.receive('não json' as any);
    tmp.fire('message', { data: 'xx' });
    tmp.receive({ msg_type: 'profit_table', profit_table: { count: 2 } });
    await expect(profit).resolves.toMatchObject({ profit_table: { count: 2 } });
    expect(tmp.readyState).toBe(FakeWebSocket.CLOSED);
  });

  it('falha quando o OTP é recusado ou vem sem websocket_url', async () => {
    const { svc } = await bootConnected();
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false })));
    await expect(svc.getProfitTableForAccount(OAUTH_REAL)).rejects.toThrow('Falha ao autorizar');
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({}) })));
    await expect(svc.getProfitTableForAccount(OAUTH_REAL)).rejects.toThrow('Não foi possível obter conexão');
  });

  it('rejeita em erro da corretora, erro de conexão e timeout', async () => {
    const { svc } = await bootConnected();
    vi.stubGlobal('fetch', otpFetchOk('wss://tmp/real'));
    const withError = svc.getProfitTableForAccount(OAUTH_REAL);
    await flush();
    FakeWebSocket.instances.at(-1)!.receive({ error: { message: 'negado' } });
    await expect(withError).rejects.toThrow('negado');

    const withSocketError = svc.getProfitTableForAccount(OAUTH_REAL);
    await flush();
    FakeWebSocket.instances.at(-1)!.fail();
    await expect(withSocketError).rejects.toThrow('Erro na conexão');

    const withTimeout = svc.getProfitTableForAccount(OAUTH_REAL);
    const assertion = expect(withTimeout).rejects.toThrow('Limite de tempo');
    await vi.advanceTimersByTimeAsync(20000);
    await assertion;
  });

  it('rejeita quando o WebSocket não pode ser criado', async () => {
    const { svc } = await bootConnected();
    vi.stubGlobal('fetch', otpFetchOk('wss://tmp/real'));
    vi.stubGlobal('WebSocket', class { constructor() { throw new Error('bloqueado'); } });
    await expect(svc.getProfitTableForAccount(OAUTH_REAL)).rejects.toThrow('bloqueado');
  });
});
