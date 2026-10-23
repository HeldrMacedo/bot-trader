// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { createEngine } from '../app/services/BearBot2Engine';
import { useBearBot } from '../app/hooks/useBearBot2';

// Mock de AudioContext
class MockAudioContext {
  createOscillator() {
    return {
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      type: 'sine',
      frequency: { value: 440 }
    };
  }
  createGain() {
    return {
      connect: vi.fn(),
      gain: {
        setValueAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn()
      }
    };
  }
  destination = {};
  currentTime = 0;
  state = 'running';
  resume = vi.fn();
}
(window as any).AudioContext = MockAudioContext;

// Mock do DerivService
let registeredListeners: Record<string, Function[]> = {};
const mockSend = vi.fn().mockResolvedValue({});
const mockSubscribe = vi.fn().mockResolvedValue({ subscription: { id: 'test_sub' } });
const mockSwitchAccount = vi.fn().mockResolvedValue({});
const mockGetStorageDerivAccount = vi.fn().mockReturnValue([
  {
    activeToken: 'vrtc_token',
    tokens: [
      { token: 'vrtc_token', is_virtual: true, balance: 10000 },
      { token: 'real_token', is_virtual: false, balance: 0 }
    ]
  }
]);

const mockOn = vi.fn().mockImplementation((event: string, callback: Function) => {
  if (!registeredListeners[event]) registeredListeners[event] = [];
  registeredListeners[event].push(callback);
  return `${event}_${registeredListeners[event].length}`;
});

const mockRemoveById = vi.fn();

vi.mock('../app/services/DerivService', () => {
  return {
    DerivService: {
      getInstance: () => ({
        send: mockSend,
        subscribe: mockSubscribe,
        switchAccount: mockSwitchAccount,
        getStorageDerivAccount: mockGetStorageDerivAccount,
        isMarketConnected: true,
        observerInstance: {
          on: mockOn,
          removeById: mockRemoveById,
        },
      }),
    },
  };
});


const emitPoc = (poc: Record<string, unknown>) => {
  (registeredListeners['deriv.proposal_open_contract'] || []).forEach((fn) =>
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

describe('useBearBot2 - liquidação só de contratos comprados por este bot', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    registeredListeners = {};
    let nextId = 5000;
    mockSend.mockImplementation(async (payload: any) => {
      if (payload.buy) return { buy: { contract_id: nextId++ } };
      return {};
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('ignora POC terminal de contrato que este bot não comprou', () => {
    const { result } = renderHook(() => useBearBot());

    act(() => { emitPoc(soldPoc(424242, -3)); });

    expect(result.current.state.trades).toHaveLength(0);
    expect(result.current.state.loss).toBe(0);
    expect(result.current.state.pnl).toBe(0);
  });

  it('não registra de novo um contrato já liquidado quando a Deriv reenvia o POC após "Zerar Gale"', async () => {
    const { result } = renderHook(() => useBearBot());

    await act(async () => { result.current.manualFire('over'); });
    act(() => { emitPoc(soldPoc(5000, -0.35)); });
    expect(result.current.state.trades).toHaveLength(1);

    // Zerar Gale, depois reconexão do WS reenvia a subscription do contrato antigo
    act(() => { result.current.abortOp(); });
    act(() => { emitPoc(soldPoc(5000, -0.35)); });

    expect(result.current.state.trades).toHaveLength(1);
    expect(result.current.state.loss).toBe(1);
  });

  it('registra no log o stake da compra mesmo se a entrada for alterada com contrato aberto', async () => {
    const { result } = renderHook(() => useBearBot());

    act(() => { result.current.updateConfig({ stake: 3 }); });
    await act(async () => { result.current.manualFire('over'); });
    expect(mockSend).toHaveBeenCalledWith(expect.objectContaining({ buy: 1, price: 3 }));

    act(() => { result.current.updateConfig({ stake: 10 }); });
    act(() => { emitPoc(soldPoc(5000, -3)); });

    expect(result.current.state.trades[0].stake).toBe('3.00');
    expect(result.current.state.trades[0].lucro).toBe('-3.00');
  });
});
