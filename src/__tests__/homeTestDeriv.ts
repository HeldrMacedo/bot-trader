import { vi } from 'vitest';
import { Observer } from '../app/services/simpleObserver';
import { memoryStorage } from './derivServiceTestHarness';

// DerivService falso para os componentes da home: observer real (os componentes
// assinam eventos nele) e métodos de rede como vi.fn controláveis pelo teste.
export function createFakeDeriv() {
  const observer = new Observer<any>();
  const fake = {
    observerInstance: observer,
    isMarketConnected: true,
    hasAuthorized: true,
    isTradeReady: true,
    currentDigits: 5,
    send: vi.fn(),
    subscribe: vi.fn(() => Promise.resolve({ subscription: { id: 'poc-sub' } })),
    switchAccount: vi.fn(() => Promise.resolve()),
    updateVolatility: vi.fn(),
    updateDigits: vi.fn(),
    clearHistory: vi.fn(),
    loginDeriv: vi.fn(),
    getStorageDerivAccount: vi.fn(() => {
      const data = localStorage.getItem('deriv_accounts');
      return data ? JSON.parse(data) : null;
    }),
    saveAccount: vi.fn((account: any) => {
      localStorage.setItem('deriv_accounts', JSON.stringify([account]));
    }),
    setAccountData: vi.fn((account: any) => observer.emit('account.update', account)),
  };
  return fake;
}

export function installStorage() {
  for (const name of ['localStorage', 'sessionStorage']) {
    const storage = memoryStorage();
    Object.defineProperty(window, name, { value: storage, configurable: true });
    vi.stubGlobal(name, storage);
  }
}

export function seedHomeAccount(overrides: Record<string, any> = {}) {
  localStorage.setItem(
    'deriv_accounts',
    JSON.stringify([
      {
        activeToken: 'oauth:A:VRTC1',
        amount: 1,
        barrier: '',
        digits: 5,
        volatility: 'R_100',
        finishedTradeList: [],
        lastTrade: null,
        name: 'Conta Deriv',
        openTradeId: null,
        results: { loss: 0, result: 0, wins: 0 },
        selectedLoginId: 'VRTC1',
        loginId: 'VRTC1',
        tokens: [
          { token: 'oauth:A:VRTC1', is_virtual: true, cur: 'USD', acct: 'VRTC1', loginid: 'VRTC1', balance: 100 },
          { token: 'oauth:A:CR1', is_virtual: false, cur: 'USD', acct: 'CR1', loginid: 'CR1', balance: 50 },
        ],
        ...overrides,
      },
    ])
  );
}

export function soldContract(contractId: number, profit: number, extra: Record<string, any> = {}) {
  return {
    msg_type: 'proposal_open_contract',
    subscription: { id: `sub-${contractId}` },
    proposal_open_contract: {
      contract_id: contractId,
      id: `sub-${contractId}`,
      is_sold: 1,
      is_valid_to_sell: 0,
      status: profit > 0 ? 'won' : 'lost',
      buy_price: 1,
      profit,
      barrier: '5',
      contract_type: 'DIGITOVER',
      underlying: 'R_100',
      exit_spot: '1234.57',
      audit_details: {
        all_ticks: [
          { tick_display_value: '1234.55' },
          { tick_display_value: '1234.56' },
          { tick_display_value: '1234.57' },
        ],
      },
      ...extra,
    },
  };
}
