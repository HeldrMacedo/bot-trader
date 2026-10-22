// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const toastError = vi.fn();
vi.mock('react-toastify', () => ({ toast: { error: (...args: any[]) => toastError(...args) } }));

import { DerivService } from '../app/services/DerivService';

const OAUTH_TOKEN = 'oauth:ory_at_expired:DOT123';
const LEGACY_WS = 'wss://ws.derivws.com/websockets/v3';
const OTP_URL = 'wss://api.derivws.com/trading/v1/options/ws/demo?otp=abc';

class FakeWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;
  static urls: string[] = [];
  readyState = FakeWebSocket.CONNECTING;
  constructor(public url: string) {
    FakeWebSocket.urls.push(url);
  }
  addEventListener() {}
  send() {}
  close() {}
}

// O Node recente expõe um `localStorage` global sem backing file que sobrepõe
// o do jsdom; um Storage em memória mantém o teste independente disso.
class MemoryStorage {
  private data = new Map<string, string>();
  getItem(key: string) {
    return this.data.has(key) ? this.data.get(key)! : null;
  }
  setItem(key: string, value: string) {
    this.data.set(key, String(value));
  }
  removeItem(key: string) {
    this.data.delete(key);
  }
  clear() {
    this.data.clear();
  }
}

function seedOAuthSession() {
  localStorage.setItem('active_token', OAUTH_TOKEN);
  localStorage.setItem(
    'token_list',
    JSON.stringify([{ token: OAUTH_TOKEN, is_virtual: true, cur: 'USD', acct: 'DOT123', loginid: 'DOT123' }])
  );
  localStorage.setItem(
    'deriv_accounts',
    JSON.stringify([{ activeToken: OAUTH_TOKEN, tokens: [], selectedLoginId: 'DOT123', loginId: 'DOT123' }])
  );
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

function mockOtpResponse(status: number, body: any = {}) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('DerivService — OTP com token OAuth', () => {
  let loginSpy: ReturnType<typeof vi.spyOn>;
  let reconnectSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    (DerivService as any).instance = undefined;
    vi.stubGlobal('localStorage', new MemoryStorage());
    vi.stubGlobal('sessionStorage', new MemoryStorage());
    FakeWebSocket.urls = [];
    toastError.mockClear();
    vi.stubGlobal('WebSocket', FakeWebSocket);
    loginSpy = vi.spyOn(DerivService.prototype, 'loginDeriv').mockResolvedValue(undefined);
    reconnectSpy = vi.spyOn(DerivService.prototype, 'reconnect').mockImplementation(() => {});
    seedOAuthSession();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('401 limpa a sessão Deriv, avisa e manda para o login sem cair no WebSocket legado', async () => {
    mockOtpResponse(401, { error: 'Failed to generate OTP' });

    const service = DerivService.getInstance();
    const authErrors: any[] = [];
    const accountUpdates: any[] = [];
    service.observerInstance.on('auth.error', (e) => authErrors.push(e));
    service.observerInstance.on('account.update', (a) => accountUpdates.push(a));
    await flush();

    expect(localStorage.getItem('active_token')).toBeNull();
    expect(localStorage.getItem('token_list')).toBeNull();
    expect(localStorage.getItem('deriv_accounts')).toBeNull();
    expect(authErrors).toEqual([expect.objectContaining({ code: 'TOKEN_EXPIRED' })]);
    expect(accountUpdates).toContain(null);
    expect(toastError).toHaveBeenCalledTimes(1);
    expect(loginSpy).toHaveBeenCalledTimes(1);
    expect(reconnectSpy).not.toHaveBeenCalled();
    expect(FakeWebSocket.urls.some((u) => u.startsWith(LEGACY_WS))).toBe(false);
  });

  it('não redireciona de novo se já tentou relogar há pouco (evita loop de redirect)', async () => {
    sessionStorage.setItem('deriv_reauth_at', String(Date.now()));
    mockOtpResponse(401);

    DerivService.getInstance();
    await flush();

    expect(localStorage.getItem('active_token')).toBeNull();
    expect(loginSpy).not.toHaveBeenCalled();
  });

  it('falha não-401 tenta reconectar com backoff em vez de cair no WebSocket legado', async () => {
    mockOtpResponse(500);

    DerivService.getInstance();
    await flush();

    expect(reconnectSpy).toHaveBeenCalledTimes(1);
    expect(loginSpy).not.toHaveBeenCalled();
    expect(localStorage.getItem('active_token')).toBe(OAUTH_TOKEN);
    expect(FakeWebSocket.urls.some((u) => u.startsWith(LEGACY_WS))).toBe(false);
  });

  it('sucesso conecta na URL OTP devolvida', async () => {
    mockOtpResponse(200, { websocket_url: OTP_URL });

    DerivService.getInstance();
    await flush();

    expect(FakeWebSocket.urls).toContain(OTP_URL);
    expect(reconnectSpy).not.toHaveBeenCalled();
  });
});
