import { vi } from 'vitest';
import { act, fireEvent, screen } from '@testing-library/react';
import { Observer } from '../app/services/simpleObserver';

// DerivService falso para o Bear Bot Ultra: observer real (o componente assina
// eventos nele) e rede controlada pelo teste através de `route`.
export function createBearDeriv() {
  const observer = new Observer<any>();
  const fake = {
    observerInstance: observer,
    isMarketConnected: true,
    isTradeReady: true,
    // Cada payload enviado passa por aqui; o teste troca o roteamento.
    route: (payload: any): Promise<any> => Promise.resolve({ msg_type: Object.keys(payload)[0] }),
    send: vi.fn((payload: any) => fake.route(payload)),
    subscribe: vi.fn((payload: any) => fake.route({ ...payload, subscribe: 1 })),
    switchAccount: vi.fn(() => Promise.resolve()),
    extractLastDigit: vi.fn((price: number) => Number(String(price).slice(-1))),
    getStorageDerivAccount: vi.fn(() => {
      const data = localStorage.getItem('deriv_accounts');
      return data ? JSON.parse(data) : null;
    }),
  };
  return fake;
}

export type BearDeriv = ReturnType<typeof createBearDeriv>;

export function deferred<T = any>() {
  let resolve!: (v: T) => void;
  let reject!: (e: any) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

// O jsdom não implementa Web Audio; o componente toca sons a cada resultado.
export function stubAudio() {
  class FakeAudioContext {
    state = 'running';
    currentTime = 0;
    destination = {};
    resume = vi.fn();
    createOscillator() {
      return { type: '', frequency: { value: 0 }, connect: vi.fn(), start: vi.fn(), stop: vi.fn() };
    }
    createGain() {
      return {
        connect: vi.fn(),
        gain: { setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
      };
    }
  }
  vi.stubGlobal('AudioContext', FakeAudioContext);
  (window as any).AudioContext = FakeAudioContext;
}

export function tick(deriv: { observerInstance: Observer<any> }, symbol: string, quote: number) {
  deriv.observerInstance.emit('deriv.tick', { msg_type: 'tick', tick: { symbol, quote, epoch: 1 } });
}

// Contrato de 1 tick liquidado, no formato do proposal_open_contract da Deriv.
export function settledPoc(contractId: number, profit: number, extra: Record<string, any> = {}) {
  return {
    msg_type: 'proposal_open_contract',
    proposal_open_contract: {
      contract_id: contractId,
      is_sold: 1,
      is_valid_to_sell: 0,
      status: profit >= 0 ? 'won' : 'lost',
      buy_price: 0.35,
      profit,
      exit_spot: 1234.57,
      exit_tick_display_value: '1234.57',
      underlying: 'R_100',
      audit_details: {
        all_ticks: [
          { epoch: 1, tick: 1234.51, tick_display_value: '1234.51' },
          { epoch: 2, tick: 1234.53, tick_display_value: '1234.53', name: 'Entry Spot' },
          { epoch: 3, tick: 1234.57, tick_display_value: '1234.57', name: 'Exit Spot' },
        ],
      },
      ...extra,
    },
  };
}

export function openPoc(contractId: number, extra: Record<string, any> = {}) {
  return {
    msg_type: 'proposal_open_contract',
    proposal_open_contract: {
      contract_id: contractId,
      is_sold: 0,
      is_valid_to_sell: 0,
      status: 'open',
      buy_price: 0.35,
      profit: 0,
      underlying: 'R_100',
      ...extra,
    },
  };
}

export async function startAuto() {
  await act(async () => {
    fireEvent.click(screen.getByText('Automático'));
  });
  await act(async () => {
    fireEvent.click(screen.getByText('Ligar Robô'));
  });
}

export const buysOf = (send: { mock: { calls: any[][] } }) =>
  send.mock.calls.map((c) => c[0]).filter((p) => p.buy !== undefined);
