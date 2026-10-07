import { vi } from 'vitest';
import { DerivService } from '../app/services/DerivService';

// WebSocket falso controlado pelo teste: registra o que foi enviado e deixa o
// teste decidir quando abrir, responder ou derrubar a conexão.
export class FakeWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;
  static instances: FakeWebSocket[] = [];

  readyState = FakeWebSocket.CONNECTING;
  sent: any[] = [];
  onopen: ((ev: any) => void) | null = null;
  onmessage: ((ev: any) => void) | null = null;
  onerror: ((ev: any) => void) | null = null;
  onclose: ((ev: any) => void) | null = null;
  private listeners: Record<string, ((ev: any) => void)[]> = {};

  constructor(public url: string) {
    FakeWebSocket.instances.push(this);
  }

  addEventListener(type: string, cb: (ev: any) => void) {
    (this.listeners[type] ||= []).push(cb);
  }

  send(data: string) {
    this.sent.push(JSON.parse(data));
  }

  // Como no navegador, o evento close chega depois da chamada a close().
  close() {
    if (this.readyState === FakeWebSocket.CLOSED) return;
    this.readyState = FakeWebSocket.CLOSED;
    queueMicrotask(() => this.fire('close', { code: 1000 }));
  }

  open() {
    this.readyState = FakeWebSocket.OPEN;
    this.fire('open', {});
  }

  receive(data: any) {
    this.fire('message', { data: JSON.stringify(data) });
  }

  // Queda iniciada pelo servidor/rede, sem close() do cliente.
  drop() {
    this.readyState = FakeWebSocket.CLOSED;
    this.fire('close', { code: 1006 });
  }

  fail() {
    this.fire('error', {});
  }

  fire(type: string, ev: any) {
    this.listeners[type]?.forEach((cb) => cb(ev));
    (this as any)[`on${type}`]?.(ev);
  }
}

export const OAUTH_DEMO = 'oauth:ACCESS:VRTC1';
export const OAUTH_REAL = 'oauth:ACCESS:CR1';
export const OTP_URL = 'wss://api.derivws.com/trading/v1/options/ws/demo?otp=1';

export function seedAccount(activeToken = OAUTH_DEMO) {
  localStorage.setItem(
    'deriv_accounts',
    JSON.stringify([
      {
        activeToken,
        amount: 1,
        barrier: '',
        digits: 3,
        volatility: 'R_100',
        finishedTradeList: [],
        lastTrade: null,
        name: 'Conta Deriv',
        openTradeId: null,
        results: { loss: 0, result: 0, wins: 0 },
        selectedLoginId: 'VRTC1',
        loginId: 'VRTC1',
        tokens: [
          { token: OAUTH_DEMO, is_virtual: true, cur: 'USD', acct: 'VRTC1', loginid: 'VRTC1', balance: 100 },
          { token: OAUTH_REAL, is_virtual: false, cur: 'USD', acct: 'CR1', loginid: 'CR1', balance: 50 },
        ],
      },
    ])
  );
}

export function otpFetchOk(url = OTP_URL) {
  return vi.fn(async () => ({ ok: true, json: async () => ({ websocket_url: url }) }));
}

export const flush = () => vi.advanceTimersByTimeAsync(0);

export const tradingSockets = () =>
  FakeWebSocket.instances.filter((w) => !w.url.includes('/ws/public'));
export const marketSockets = () =>
  FakeWebSocket.instances.filter((w) => w.url.includes('/ws/public'));
export const lastTrading = () => tradingSockets().at(-1)!;
export const lastMarket = () => marketSockets().at(-1)!;

// O construtor é privado e o singleton seria compartilhado entre testes.
export function createService(): DerivService {
  return new (DerivService as any)();
}

export function messageListenerCount(svc: DerivService): number {
  return (svc as any).observer.events.get('message')?.size ?? 0;
}

// O jsdom deste projeto não expõe Storage utilizável; os demais testes também
// usam um mock em memória.
export function memoryStorage() {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => (key in store ? store[key] : null),
    setItem: (key: string, value: string) => { store[key] = String(value); },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
}

export function installFakes() {
  FakeWebSocket.instances = [];
  for (const name of ['localStorage', 'sessionStorage']) {
    const storage = memoryStorage();
    Object.defineProperty(window, name, { value: storage, configurable: true });
    vi.stubGlobal(name, storage);
  }
  vi.useFakeTimers();
  vi.stubGlobal('WebSocket', FakeWebSocket);
  vi.stubGlobal('fetch', otpFetchOk());
}

// Sobe o serviço com conta OAuth, canal de trade autorizado e canal de mercado aberto.
export async function bootConnected() {
  seedAccount();
  const svc = createService();
  await flush();
  const trade = lastTrading();
  const market = lastMarket();
  trade.open();
  market.open();
  await flush();
  return { svc, trade, market };
}
