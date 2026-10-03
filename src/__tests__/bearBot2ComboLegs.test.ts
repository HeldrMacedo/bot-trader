// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { createEngine } from '../app/services/BearBot2Engine';
import { useBearBot } from '../app/hooks/useBearBot2';

class MockAudioContext {
  createOscillator() {
    return { connect: vi.fn(), start: vi.fn(), stop: vi.fn(), type: 'sine', frequency: { value: 440 } };
  }
  createGain() {
    return {
      connect: vi.fn(),
      gain: { setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
    };
  }
  destination = {};
  currentTime = 0;
  state = 'running';
  resume = vi.fn();
}
(window as any).AudioContext = MockAudioContext;

let registeredListeners: Record<string, Function[]> = {};
const mockSend = vi.fn().mockResolvedValue({});
const mockSubscribe = vi.fn().mockResolvedValue({ subscription: { id: 'test_sub' } });

vi.mock('../app/services/DerivService', () => ({
  DerivService: {
    getInstance: () => ({
      send: mockSend,
      subscribe: mockSubscribe,
      switchAccount: vi.fn().mockResolvedValue({}),
      getStorageDerivAccount: vi.fn().mockReturnValue([
        { activeToken: 'vrtc_token', tokens: [{ token: 'vrtc_token', is_virtual: true, balance: 10000 }] },
      ]),
      isMarketConnected: true,
      observerInstance: {
        on: vi.fn().mockImplementation((event: string, cb: Function) => {
          (registeredListeners[event] ||= []).push(cb);
          return `${event}_${registeredListeners[event].length}`;
        }),
        removeById: vi.fn(),
      },
    }),
  },
}));

describe('COMBO real settlement · trade log', () => {
  const realCombo = () => {
    const engine = createEngine({
      paperMode: false, mode: 'combo', digit: 2, comboUnder: 4, comboOver: 5, stake: 1, activeSym: 'R_100',
    });
    expect(engine.prepareTrade('combo')?.kind).toBe('combo');
    return engine;
  };

  it('shows combo barriers as alvo instead of the unrelated single-mode digit', () => {
    const engine = realCombo();
    engine.settleContract(1.37, false, 'combo', 6, null);
    engine.settleContract(-1, true, 'combo', 6, null);
    const t = engine.getState().trades[0];
    expect(t.modo).toBe('COMBO');
    expect(t.alvo).toBe('<4 >5');
    expect(t.saiu).toBe(6);
  });

  it('shows both exit digits when the legs settled on different ticks', () => {
    const engine = realCombo();
    engine.settleContract(-1, true, 'combo', 3, null);
    engine.settleContract(-1, true, 'combo', 6, null);
    const t = engine.getState().trades[0];
    expect(t.resultado).toBe('LOSS');
    expect(t.saiu).toBe('3/6');
  });
});

describe('COMBO result by net profit', () => {
  const realCombo = () => {
    const engine = createEngine({ paperMode: false, mode: 'combo', comboUnder: 4, comboOver: 5, stake: 1 });
    engine.prepareTrade('combo');
    return engine;
  };

  it('is LOSS when one leg wins but the net is negative', () => {
    const engine = realCombo();
    engine.settleContract(0.5, false, 'combo', 7, null);
    engine.settleContract(-1, true, 'combo', 7, null);
    const st = engine.getState();
    expect(st.trades[0].resultado).toBe('LOSS');
    expect(st.loss).toBe(1);
    expect(st.galeLevel).toBe(1);
  });

  it('is WIN when the net is positive', () => {
    const engine = realCombo();
    engine.settleContract(1.37, false, 'combo', 7, null);
    engine.settleContract(-1, true, 'combo', 7, null);
    const st = engine.getState();
    expect(st.trades[0].resultado).toBe('WIN');
    expect(st.wins).toBe(1);
    expect(st.galeLevel).toBe(0);
  });
});

describe('COMBO paper · trade log', () => {
  it('shows combo barriers as alvo like the real trade', () => {
    const engine = createEngine({
      paperMode: true, mode: 'combo', digit: 2, comboUnder: 4, comboOver: 5, stake: 1, tradeCooldownMs: 0,
    });
    for (let i = 0; i < 3; i++) engine.processTick('R_100', 100.07, 7);
    engine.prepareTrade('combo');
    const sim = engine.simulateTrade('combo')!;
    engine.settleContract(sim.profit, sim.isLoss, 'combo', sim.exitDig, sim.audit);
    const t = engine.getState().trades[0];
    expect(t.modo).toBe('COMBO');
    expect(t.alvo).toBe('<4 >5');
  });
});

describe('COMBO real buy · hook', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    registeredListeners = {};
  });
  afterEach(() => vi.useRealTimers());

  it('sends both legs without waiting for the first buy response', async () => {
    const pendingBuys: Array<(v: any) => void> = [];
    mockSend.mockImplementation((payload: any) => {
      if (payload.buy) return new Promise((resolve) => pendingBuys.push(resolve));
      return Promise.resolve({});
    });

    const { result } = renderHook(() => useBearBot());
    act(() => { result.current.updateConfig({ mode: 'combo', comboUnder: 4, comboOver: 5, paperMode: false }); });
    act(() => { vi.advanceTimersByTime(60); });

    await act(async () => { result.current.manualFire('combo'); });

    expect(pendingBuys.length).toBe(2);

    await act(async () => {
      pendingBuys[0]({ buy: { contract_id: 1 } });
      pendingBuys[1]({ buy: { contract_id: 2 } });
    });
  });
});
