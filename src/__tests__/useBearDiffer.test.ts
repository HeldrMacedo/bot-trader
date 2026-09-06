// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBearDiffer } from '../app/hooks/useBearDiffer';

// Mock do DerivService
const mockSend = vi.fn().mockResolvedValue({});
const mockSubscribe = vi.fn().mockResolvedValue({ subscription: { id: 'test_sub' } });
const mockSwitchAccount = vi.fn().mockResolvedValue({});
const mockListeners: Record<string, Function[]> = {};

const mockObserver = {
  on: vi.fn((event: string, callback: Function) => {
    if (!mockListeners[event]) mockListeners[event] = [];
    mockListeners[event].push(callback);
    return `${event}_${mockListeners[event].length}`;
  }),
  removeById: vi.fn(),
  emit: vi.fn((event: string, data: any) => {
    if (mockListeners[event]) {
      mockListeners[event].forEach((cb) => cb(data));
    }
  }),
};

vi.mock('../app/services/DerivService', () => ({
  DerivService: {
    getInstance: () => ({
      send: mockSend,
      subscribe: mockSubscribe,
      switchAccount: mockSwitchAccount,
      observerInstance: mockObserver,
      isMarketConnected: true,
      getStorageDerivAccount: () => [
        {
          activeToken: 'vrtc_123',
          tokens: [
            { token: 'vrtc_123', is_virtual: true, balance: 10000, currency: 'USD' },
            { token: 'real_456', is_virtual: false, balance: 500, currency: 'USD' },
          ],
        },
      ],
    }),
  },
}));

describe('useBearDiffer - Custom Hook for Bear Bot Differ', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const key in mockListeners) delete mockListeners[key];
  });

  it('initializes with default state and connects to DerivService accounts', () => {
    const { result } = renderHook(() => useBearDiffer());

    expect(result.current.isConnected).toBe(true);
    expect(result.current.accountInfo?.activeToken).toBe('vrtc_123');
    expect(result.current.state.markets.length).toBe(7);
    expect(result.current.config.stake).toBe(0.35);
  });

  it('updates configuration via updateConfig', () => {
    const { result } = renderHook(() => useBearDiffer());

    act(() => {
      result.current.updateConfig({ stake: 1.5, minScore: 80 });
    });

    expect(result.current.config.stake).toBe(1.5);
    expect(result.current.config.minScore).toBe(80);
  });

  it('switches account between Real and Virtual', async () => {
    const { result } = renderHook(() => useBearDiffer());

    await act(async () => {
      await result.current.switchAccount(false);
    });

    expect(mockSwitchAccount).toHaveBeenCalledWith('real_456');
  });

  it('feeds incoming market ticks into the engine', () => {
    const { result } = renderHook(() => useBearDiffer());

    // Emit tick for R_10
    act(() => {
      mockObserver.emit('deriv.tick', {
        tick: { symbol: 'R_10', quote: 1234.567 },
      });
    });

    const digits = result.current.engine.getDigits('R_10');
    expect(digits.length).toBe(1);
    expect(digits[0]).toBe(7); // pip 3 -> slice(-1) of 1234.567 is 7
  });

  it('executes a simulation trade in paper mode', async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useBearDiffer());

    act(() => {
      result.current.updateConfig({ opMode: 'sim', stake: 1.0 });
    });

    // Provide some ticks for R_10
    for (let i = 0; i < 60; i++) {
      result.current.engine.processTick('R_10', i % 10);
    }

    await act(async () => {
      await result.current.executeTrade('R_10', 4);
    });

    // Advance fake timer for paper trade settlement
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current.state.sim.win + result.current.state.sim.loss).toBe(1);
    vi.useRealTimers();
  });

  it('exposes resetSession to reset engine state', () => {
    const { result } = renderHook(() => useBearDiffer());

    act(() => {
      result.current.engine.settleContract(-2.0, true, 'R_10', 3, 3);
    });

    expect(result.current.state.pnl).toBe(-2.0);

    act(() => {
      result.current.resetSession();
    });

    expect(result.current.state.pnl).toBe(0);
    expect(result.current.state.trades.length).toBe(0);
  });

  it('triggers executeTrade when continuous auto-trade fires', async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useBearDiffer());

    act(() => {
      result.current.updateConfig({
        autoOn: true,
        gateBias: false,
        minScore: 60,
        minTicks: 50,
        cooldown: 0,
        opMode: 'sim',
      });
    });

    // Seed history
    const digits: number[] = [];
    for (let i = 0; i < 100; i++) digits.push(i % 10);
    for (let i = 0; i < 40; i++) digits.push(7);
    digits.push(2);
    result.current.engine.setHistory('R_10', digits);

    // Process tick to trigger auto-trade
    await act(async () => {
      result.current.engine.processTick('R_10', 5);
    });

    // Advance timer for paper trade
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current.state.sim.win + result.current.state.sim.loss).toBeGreaterThan(0);
    vi.useRealTimers();
  });

  it('blocks real trade execution when checkGuards fails', async () => {
    const { result } = renderHook(() => useBearDiffer());

    act(() => {
      result.current.updateConfig({ opMode: 'real', gateOps: 50 });
    });

    await act(async () => {
      await result.current.executeTrade('R_10', 4);
    });

    // Deriv send buy should not have been called because gateOps was not met
    expect(mockSend).not.toHaveBeenCalledWith(expect.objectContaining({ buy: expect.anything() }));
    const logs = result.current.state.logs;
    expect(logs.some((l) => l.msg.includes('Trava do modo real'))).toBe(true);
  });

  it('resolves simulation contract upon arrival of next tick for that market', async () => {
    const { result } = renderHook(() => useBearDiffer());

    act(() => {
      result.current.updateConfig({ opMode: 'sim' });
    });

    // Execute trade in simulation mode
    await act(async () => {
      await result.current.executeTrade('R_10', 7);
    });

    // Emit next tick for R_10: quote ends in 5 (win)
    act(() => {
      mockObserver.emit('deriv.tick', {
        tick: { symbol: 'R_10', quote: 1234.565 },
      });
    });

    const trades = result.current.state.trades;
    expect(trades.length).toBe(1);
    expect(trades[0].sym).toBe('R_10');
    expect(trades[0].digit).toBe(7);
    expect(trades[0].exitDigit).toBe(5);
    expect(trades[0].result).toBe('WIN');
  });

  it('subscribes to pre-opened proposal when ensureProposal is invoked', () => {
    const { result } = renderHook(() => useBearDiffer());

    act(() => {
      result.current.ensureProposal('R_10', 5, 0.35);
    });

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        proposal: 1,
        subscribe: 1,
        symbol: 'R_10',
        barrier: '5',
      })
    );
  });
});
