// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBearBot } from '../app/hooks/useBearBot2';

const persistMock = vi.fn();
vi.mock('../app/services/botOperationPersistence', () => ({
  persistBotOperation: (...args: unknown[]) => persistMock(...args),
}));

(window as any).AudioContext = class {
  createOscillator() { return { connect: vi.fn(), start: vi.fn(), stop: vi.fn(), frequency: { value: 0 } }; }
  createGain() { return { connect: vi.fn(), gain: { setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() } }; }
  destination = {};
  currentTime = 0;
  state = 'running';
  resume = vi.fn();
};

let listeners: Record<string, Function[]> = {};
const mockSend = vi.fn();
let storedAccount: any;

vi.mock('../app/services/DerivService', () => ({
  DerivService: {
    getInstance: () => ({
      send: mockSend,
      subscribe: vi.fn().mockResolvedValue({}),
      switchAccount: vi.fn().mockResolvedValue({}),
      getStorageDerivAccount: () => [storedAccount],
      isMarketConnected: true,
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
    { token: 'vrtc_token', is_virtual: true },
    { token: 'real_token', is_virtual: false },
  ],
});

const emitPoc = (poc: Record<string, unknown>) => {
  (listeners['deriv.proposal_open_contract'] || []).forEach((fn) =>
    fn({ msg_type: 'proposal_open_contract', proposal_open_contract: poc })
  );
};

const soldPoc = (contractId: number, profit: number) => ({
  contract_id: contractId,
  is_sold: 1,
  status: profit < 0 ? 'lost' : 'won',
  profit,
  exit_spot: '1234.56',
});

describe('useBearBot2 - grava operações liquidadas na tabela Operation', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    listeners = {};
    storedAccount = account('real_token');
    let nextId = 7000;
    mockSend.mockImplementation(async (payload: any) => {
      if (payload.buy) return { buy: { contract_id: nextId++ } };
      return {};
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('envia o contrato liquidado para gravação com a conta ativa', async () => {
    const { result } = renderHook(() => useBearBot());

    await act(async () => { result.current.manualFire('over'); });
    const poc = soldPoc(7000, 0.3);
    act(() => { emitPoc(poc); });

    expect(persistMock).toHaveBeenCalledTimes(1);
    expect(persistMock).toHaveBeenCalledWith(
      poc,
      expect.objectContaining({ activeToken: 'real_token' })
    );
  });

  it('usa a conta vigente após troca de conta, não a do primeiro render', async () => {
    storedAccount = account('vrtc_token');
    const { result } = renderHook(() => useBearBot());

    act(() => {
      (listeners['account.update'] || []).forEach((fn) => fn(account('real_token')));
    });
    await act(async () => { result.current.manualFire('over'); });
    act(() => { emitPoc(soldPoc(7000, -0.35)); });

    expect(persistMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ activeToken: 'real_token' })
    );
  });

  it('não grava POC de contrato que este bot não comprou', () => {
    renderHook(() => useBearBot());
    act(() => { emitPoc(soldPoc(424242, -3)); });
    expect(persistMock).not.toHaveBeenCalled();
  });

  it('não grava duas vezes quando a Deriv reenvia o mesmo POC', async () => {
    const { result } = renderHook(() => useBearBot());

    await act(async () => { result.current.manualFire('over'); });
    act(() => {
      emitPoc(soldPoc(7000, 0.3));
      emitPoc(soldPoc(7000, 0.3));
    });

    expect(persistMock).toHaveBeenCalledTimes(1);
  });

  it('não grava trades simulados do Paper Trading', async () => {
    const { result } = renderHook(() => useBearBot());
    act(() => { result.current.updateConfig({ paperMode: true }); });
    for (let i = 0; i < 10; i++) {
      act(() => {
        (listeners['deriv.tick'] || []).forEach((fn) =>
          fn({ tick: { symbol: 'R_100', quote: 1234 + i / 100 } })
        );
      });
    }

    await act(async () => { result.current.manualFire('over'); });
    await act(async () => { vi.advanceTimersByTime(1000); });

    expect(mockSend).not.toHaveBeenCalledWith(expect.objectContaining({ buy: expect.anything() }));
    expect(persistMock).not.toHaveBeenCalled();
  });
});
