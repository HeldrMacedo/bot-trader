import { EventEmitter } from 'events';
import { vi } from 'vitest';

/**
 * WebSocket falso para os serviços server-side do copy trader (pacote `ws`).
 * Cada `new WebSocket(url)` registra a instância em `sockets`, permitindo ao
 * teste abrir, derrubar e injetar mensagens da Deriv em cada conexão.
 */
export class FakeWs extends EventEmitter {
  static sockets: FakeWs[] = [];
  url: string;
  sent: any[] = [];
  closed = false;
  opened = false;

  constructor(url: string) {
    super();
    this.url = url;
    FakeWs.sockets.push(this);
  }

  send(raw: string) {
    this.sent.push(JSON.parse(raw));
  }

  // O `ws` real emite 'close' depois do handshake de fechamento, nunca de forma síncrona.
  close() {
    if (this.closed) return;
    this.closed = true;
    queueMicrotask(() => this.emit('close'));
  }

  open() {
    this.opened = true;
    this.emit('open');
  }

  receive(message: any) {
    this.emit('message', Buffer.from(JSON.stringify(message)));
  }

  /** Queda de rede: 'error' seguido de 'close', como o `ws` faz em ECONNRESET. */
  drop(error = new Error('ECONNRESET')) {
    this.emit('error', error);
    this.closed = true;
    this.emit('close');
  }

  sentOf(key: string) {
    return this.sent.filter((m) => key in m);
  }

  static reset() {
    FakeWs.sockets = [];
  }

  static byKind(kind: 'demo' | 'real') {
    return FakeWs.sockets.filter((s) => s.url.endsWith(`/${kind}`));
  }

  static last(kind: 'demo' | 'real') {
    const list = FakeWs.byKind(kind);
    return list[list.length - 1];
  }

  /** Sockets vivos (abertos e não fechados) de um tipo de conta. */
  static live(kind: 'demo' | 'real') {
    return FakeWs.byKind(kind).filter((s) => s.opened && !s.closed);
  }
}

/** Esvazia a fila de microtasks (handlers async encadeados) sem avançar o relógio. */
export async function flush(rounds = 50) {
  for (let i = 0; i < rounds; i++) await Promise.resolve();
}

/** Mock de `resolveDerivConnection`: URL termina em /demo ou /real conforme a conta. */
export const resolveMock = vi.fn(async (token: string, accountType: 'demo' | 'real') => ({
  url: `wss://fake/${accountType}`,
  needsAuthorize: false,
  token,
}));

/** Mensagem `transaction` de compra na conta demo, no formato do stream da Deriv. */
export function demoBuy(contractId: number, overrides: Record<string, any> = {}) {
  return {
    msg_type: 'transaction',
    transaction: {
      action: 'buy',
      contract_id: contractId,
      amount: -0.35,
      symbol: 'R_100',
      longcode: 'Win payout if the last digit of Volatility 100 Index is not 5 after 1 ticks.',
      transaction_id: contractId * 10,
      ...overrides,
    },
  };
}

/** Resultado final de um contrato via `proposal_open_contract`. */
export function settled(contractId: number, profit: number, status?: string) {
  return {
    msg_type: 'proposal_open_contract',
    proposal_open_contract: {
      contract_id: contractId,
      status: status ?? (profit > 0 ? 'won' : 'lost'),
      is_sold: 1,
      profit,
    },
  };
}

/** localStorage/sessionStorage em memória para os testes de UI (jsdom do setup não os fornece). */
export function installStorage() {
  for (const name of ['localStorage', 'sessionStorage']) {
    let store: Record<string, string> = {};
    const storage = {
      getItem: (key: string) => (key in store ? store[key] : null),
      setItem: (key: string, value: string) => { store[key] = String(value); },
      removeItem: (key: string) => { delete store[key]; },
      clear: () => { store = {}; },
    };
    Object.defineProperty(window, name, { value: storage, configurable: true });
    vi.stubGlobal(name, storage);
  }
}
