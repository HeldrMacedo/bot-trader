// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';
import BearBotUltra from '../app/(withSidebar)/bear-bot-ultra/bearBotUltra';

const persistMock = vi.fn();
vi.mock('../app/services/botOperationPersistence', () => ({
  persistBotOperation: (...args: unknown[]) => persistMock(...args),
}));

const store: Record<string, string> = {};
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = String(v); },
    removeItem: (k: string) => { delete store[k]; },
    clear: () => { for (const k in store) delete store[k]; },
  },
});

(window as any).AudioContext = class {
  createOscillator() { return { connect: vi.fn(), start: vi.fn(), stop: vi.fn(), frequency: { value: 0 } }; }
  createGain() { return { connect: vi.fn(), gain: { setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() } }; }
  destination = {};
  currentTime = 0;
  state = 'running';
  resume = vi.fn();
};

const mockSend = vi.fn();
let listeners: Record<string, Function[]> = {};
let storedAccount: any;

vi.mock('../app/services/DerivService', () => ({
  DerivService: {
    getInstance: () => ({
      send: mockSend,
      subscribe: vi.fn().mockResolvedValue({}),
      switchAccount: vi.fn().mockResolvedValue({}),
      getStorageDerivAccount: () => [storedAccount],
      extractLastDigit: (p: number) => Number(String(p).slice(-1)),
      observerInstance: {
        on: (event: string, cb: Function) => {
          (listeners[event] ||= []).push(cb);
          return `${event}_${listeners[event].length}`;
        },
        removeById: vi.fn(),
      },
    }),
  },
}));

const account = (activeToken: string) => ({
  name: 'Fulano',
  activeToken,
  tokens: [
    { token: 'vrtc_token', is_virtual: true, balance: 10000 },
    { token: 'real_token', is_virtual: false, balance: 500 },
  ],
});

const emitPoc = (poc: Record<string, unknown>) =>
  (listeners['deriv.proposal_open_contract'] || []).forEach((fn) =>
    fn({ msg_type: 'proposal_open_contract', proposal_open_contract: poc })
  );

const auditDetails = {
  all_ticks: [
    { tick_display_value: '1234.51' },
    { tick_display_value: '1234.52' },
    { tick_display_value: '1234.56' },
  ],
};

const soldPoc = (contractId: number, profit: number, withAudit = true) => ({
  contract_id: contractId,
  is_sold: 1,
  status: profit < 0 ? 'lost' : 'won',
  profit,
  exit_spot: '1234.56',
  ...(withAudit ? { audit_details: auditDetails } : {}),
});

const enterNow = async () => {
  await act(async () => {
    fireEvent.click(screen.getByText('Entrar Agora'));
  });
};

describe('BearBotUltra (v1) - grava operações liquidadas na tabela Operation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listeners = {};
    storedAccount = account('real_token');
    let nextId = 8000;
    mockSend.mockImplementation(async (payload: any) => {
      if (payload.buy) return { buy: { contract_id: nextId++ } };
      return {};
    });
  });

  it('envia o contrato liquidado para gravação com a conta ativa', async () => {
    render(<BearBotUltra />);
    await enterNow();

    const poc = soldPoc(8000, 0.3);
    await act(async () => { emitPoc(poc); });

    expect(persistMock).toHaveBeenCalledTimes(1);
    expect(persistMock).toHaveBeenCalledWith(poc, expect.objectContaining({ activeToken: 'real_token' }));
  });

  it('não grava nem liquida POC de contrato que este bot não comprou', async () => {
    render(<BearBotUltra />);

    await act(async () => { emitPoc(soldPoc(424242, -3)); });

    expect(persistMock).not.toHaveBeenCalled();
    // PnL continua zerado: o contrato alheio não entrou no placar do robô.
    expect(screen.queryByText('-$3')).toBeNull();
    expect(screen.getByText('+$0')).toBeDefined();
  });

  it('não grava duas vezes quando a Deriv reenvia o mesmo POC', async () => {
    render(<BearBotUltra />);
    await enterNow();

    await act(async () => {
      emitPoc(soldPoc(8000, 0.3));
      emitPoc(soldPoc(8000, 0.3));
    });

    expect(persistMock).toHaveBeenCalledTimes(1);
  });

  it('liquida e grava mesmo quando o POC final chega sem audit_details', async () => {
    render(<BearBotUltra />);
    await enterNow();

    await act(async () => { emitPoc(soldPoc(8000, 0.3, false)); });
    expect(persistMock).toHaveBeenCalledTimes(1);

    // Trava liberada: uma nova entrada manual envia nova compra.
    mockSend.mockClear();
    await enterNow();
    expect(mockSend).toHaveBeenCalledWith(expect.objectContaining({ buy: expect.anything() }));
  });

  it('grava as duas pernas do Combo', async () => {
    render(<BearBotUltra />);
    await act(async () => { fireEvent.click(screen.getByText('combo')); });
    await enterNow();

    await act(async () => {
      emitPoc(soldPoc(8000, 0.2));
      emitPoc(soldPoc(8001, -0.35));
    });

    expect(persistMock).toHaveBeenCalledTimes(2);
  });
});
