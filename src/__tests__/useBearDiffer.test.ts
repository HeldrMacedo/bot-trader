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

  it('refuses to report success when no token exists for the target account', async () => {
    const { result } = renderHook(() => useBearDiffer());

    // The mocked storage only carries a real token under 'real_456'; ask for an
    // account type that has none by dropping it first
    act(() => {
      (result.current.accountInfo as { tokens: unknown[] }).tokens = [
        { token: 'vrtc_123', is_virtual: true, balance: 10000, currency: 'USD' },
      ];
    });

    await expect(
      act(async () => {
        await result.current.switchAccount(false);
      })
    ).rejects.toThrow(/conta/i);

    expect(mockSwitchAccount).not.toHaveBeenCalled();
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

    // The following tick settles the paper contract
    act(() => {
      mockObserver.emit('deriv.tick', {
        tick: { symbol: 'R_10', quote: 1234.561 },
      });
    });

    expect(result.current.state.sim.win + result.current.state.sim.loss).toBe(1);
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

    // The following tick settles the paper contract opened by the auto-trade
    act(() => {
      mockObserver.emit('deriv.tick', {
        tick: { symbol: 'R_10', quote: 1234.561 },
      });
    });

    expect(result.current.state.sim.win + result.current.state.sim.loss).toBeGreaterThan(0);
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

  it('does not settle a simulated contract on a timer when no new tick has arrived', async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useBearDiffer());

    act(() => {
      result.current.updateConfig({ opMode: 'sim', stake: 1.0 });
    });

    await act(async () => {
      await result.current.executeTrade('R_10', 7);
    });

    // No tick for R_10 has arrived yet. However long we wait, the contract
    // must stay open: a Digit Differ only resolves on the following tick.
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(result.current.state.trades.length).toBe(0);
    expect(result.current.state.sim.win + result.current.state.sim.loss).toBe(0);

    vi.useRealTimers();
  });

  it('settles a simulated contract with the next tick digit, never the analysis tick digit', async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useBearDiffer());

    act(() => {
      result.current.updateConfig({ opMode: 'sim', stake: 1.0 });
    });

    // Seed the buffer so the most recent digit equals the barrier we trade
    // against. Settling against this stale digit would report a LOSS.
    result.current.engine.setHistory('R_10', [1, 2, 3, 4]);

    await act(async () => {
      await result.current.executeTrade('R_10', 4);
    });

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    // Next tick ends in 9, which differs from the barrier: this is a WIN.
    act(() => {
      mockObserver.emit('deriv.tick', {
        tick: { symbol: 'R_10', quote: 1234.569 },
      });
    });

    const trades = result.current.state.trades;
    expect(trades.length).toBe(1);
    expect(trades[0].exitDigit).toBe(9);
    expect(trades[0].result).toBe('WIN');

    vi.useRealTimers();
  });

  it('ignores proposal messages belonging to other modules on the shared DerivService', async () => {
    const { result } = renderHook(() => useBearDiffer());

    act(() => {
      result.current.updateConfig({
        opMode: 'real',
        gateOps: 0,
        gateAcc: 0,
        fastExec: true,
        stake: 0.35,
      });
    });

    // A proposal opened by another bot module (DIGITOVER on another symbol).
    // DerivService emits 'message' for every raw frame on the shared socket.
    act(() => {
      mockObserver.emit('message', {
        msg_type: 'proposal',
        proposal: { id: 'foreign_proposal', payout: 19.5, ask_price: 10 },
        echo_req: { contract_type: 'DIGITOVER', symbol: 'R_100' },
      });
    });

    await act(async () => {
      await result.current.executeTrade('R_10', 4);
    });

    // Must never buy a contract this module did not open
    expect(mockSend).not.toHaveBeenCalledWith(
      expect.objectContaining({ buy: 'foreign_proposal' })
    );
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        buy: 1,
        parameters: expect.objectContaining({ symbol: 'R_10', barrier: '4' }),
      })
    );
    // And the foreign payout must not leak into the Differ breakeven
    expect(result.current.state.payout).toBe(1.1);
  });

  it('buys through the pre-opened proposal only when symbol, barrier and stake match', async () => {
    const { result } = renderHook(() => useBearDiffer());

    act(() => {
      result.current.updateConfig({
        opMode: 'real',
        gateOps: 0,
        gateAcc: 0,
        fastExec: true,
        stake: 0.35,
      });
    });

    act(() => {
      result.current.ensureProposal('R_10', 4, 0.35);
    });

    const sent = mockSend.mock.calls.find((c) => c[0]?.proposal === 1)?.[0];
    expect(sent?.passthrough?.pkey).toBeTruthy();

    act(() => {
      mockObserver.emit('message', {
        msg_type: 'proposal',
        proposal: { id: 'our_proposal', payout: 0.385, ask_price: 0.35 },
        passthrough: sent.passthrough,
      });
    });

    await act(async () => {
      await result.current.executeTrade('R_10', 4);
    });

    expect(mockSend).toHaveBeenCalledWith({ buy: 'our_proposal', price: 0.35 });
  });

  it('falls back to a direct buy when the stake moved away from the pre-opened proposal', async () => {
    const { result } = renderHook(() => useBearDiffer());

    act(() => {
      result.current.updateConfig({
        opMode: 'real',
        gateOps: 0,
        gateAcc: 0,
        fastExec: true,
        stake: 0.35,
      });
    });

    act(() => {
      result.current.ensureProposal('R_10', 4, 0.35);
    });

    const sent = mockSend.mock.calls.find((c) => c[0]?.proposal === 1)?.[0];

    act(() => {
      mockObserver.emit('message', {
        msg_type: 'proposal',
        proposal: { id: 'stale_proposal', payout: 0.385, ask_price: 0.35 },
        passthrough: sent.passthrough,
      });
    });

    // A martingale step moves the stake: the warm proposal is priced for the
    // old stake and no longer serves this order.
    act(() => {
      result.current.updateConfig({ stake: 0.77 });
    });

    await act(async () => {
      await result.current.executeTrade('R_10', 4);
    });

    expect(mockSend).not.toHaveBeenCalledWith(
      expect.objectContaining({ buy: 'stale_proposal' })
    );
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        buy: 1,
        parameters: expect.objectContaining({ symbol: 'R_10', barrier: '4' }),
      })
    );
  });

  it('requests enough tick history for the lab minimum sample to be reachable', () => {
    const { result } = renderHook(() => useBearDiffer());

    const histCalls = mockSubscribe.mock.calls.filter((c) => c[0]?.ticks_history);
    expect(histCalls.length).toBeGreaterThan(0);
    histCalls.forEach((c) => {
      expect(c[0].count).toBeGreaterThanOrEqual(result.current.config.labMin);
    });
  });

  it('aborts an entry whose analysis went stale by too many ticks', async () => {
    const { result } = renderHook(() => useBearDiffer());

    act(() => {
      result.current.updateConfig({ opMode: 'sim', maxStale: 2, stake: 1.0 });
    });

    const analysisTick = result.current.engine.getMarketData('R_10').tickCount;

    // Five ticks go by between the analysis and the confirmation
    act(() => {
      for (let i = 0; i < 5; i++) {
        mockObserver.emit('deriv.tick', { tick: { symbol: 'R_10', quote: 1234.561 } });
      }
    });

    await act(async () => {
      await result.current.executeTrade('R_10', 4, analysisTick);
    });

    // No contract was opened, so the next tick settles nothing
    act(() => {
      mockObserver.emit('deriv.tick', { tick: { symbol: 'R_10', quote: 1234.562 } });
    });

    expect(result.current.state.trades.length).toBe(0);
    expect(
      result.current.state.logs.some((l) => /abortada/i.test(l.msg))
    ).toBe(true);
  });

  it('lets a fresh entry through the stale-tick guard', async () => {
    const { result } = renderHook(() => useBearDiffer());

    act(() => {
      result.current.updateConfig({ opMode: 'sim', maxStale: 2, stake: 1.0 });
    });

    act(() => {
      mockObserver.emit('deriv.tick', { tick: { symbol: 'R_10', quote: 1234.561 } });
    });

    const analysisTick = result.current.engine.getMarketData('R_10').tickCount;

    await act(async () => {
      await result.current.executeTrade('R_10', 4, analysisTick);
    });
    act(() => {
      mockObserver.emit('deriv.tick', { tick: { symbol: 'R_10', quote: 1234.562 } });
    });

    expect(result.current.state.trades.length).toBe(1);
  });

  it('runs market surveillance on its own, with no tab mounted', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useBearDiffer());

    result.current.engine.setHistory(
      'R_10',
      Array.from({ length: 300 }, (_, i) => i % 10)
    );

    expect(result.current.state.watch['R_10']).toBeUndefined();

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(result.current.state.watch['R_10']).toBeDefined();

    vi.useRealTimers();
  });

  it('does not open a second contract while one is still pending', async () => {
    const { result } = renderHook(() => useBearDiffer());

    act(() => {
      result.current.updateConfig({ opMode: 'sim', stake: 1.0 });
    });

    await act(async () => {
      await result.current.executeTrade('R_10', 4);
      await result.current.executeTrade('R_10', 7);
    });

    // The tick that settles the first contract must not settle a second one
    act(() => {
      mockObserver.emit('deriv.tick', {
        tick: { symbol: 'R_10', quote: 1234.561 },
      });
    });

    expect(result.current.state.trades.length).toBe(1);
    expect(result.current.state.trades[0].digit).toBe(4);
  });

  it('releases the trade lock after settlement so the next entry can run', async () => {
    const { result } = renderHook(() => useBearDiffer());

    act(() => {
      result.current.updateConfig({ opMode: 'sim', stake: 1.0 });
    });

    await act(async () => {
      await result.current.executeTrade('R_10', 4);
    });
    act(() => {
      mockObserver.emit('deriv.tick', { tick: { symbol: 'R_10', quote: 1234.561 } });
    });

    await act(async () => {
      await result.current.executeTrade('R_10', 7);
    });
    act(() => {
      mockObserver.emit('deriv.tick', { tick: { symbol: 'R_10', quote: 1234.562 } });
    });

    expect(result.current.state.trades.length).toBe(2);
  });

  it('releases the trade lock when the real order is rejected', async () => {
    const { result } = renderHook(() => useBearDiffer());

    act(() => {
      result.current.updateConfig({
        opMode: 'real',
        gateOps: 0,
        gateAcc: 0,
        fastExec: false,
        stake: 0.35,
      });
    });

    // mockSend resolves with no buy.contract_id: the order failed
    await act(async () => {
      await result.current.executeTrade('R_10', 4);
    });
    await act(async () => {
      await result.current.executeTrade('R_10', 4);
    });

    const buyCalls = mockSend.mock.calls.filter((c) => c[0]?.buy !== undefined);
    expect(buyCalls.length).toBe(2);
  });

  it('keeps a warm proposal for the scan target while it is on screen', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useBearDiffer());

    act(() => {
      result.current.updateConfig({ fastExec: true, stake: 0.35 });
      result.current.setWarmTarget('R_25', 3);
    });

    act(() => {
      vi.advanceTimersByTime(4000);
    });

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        proposal: 1,
        subscribe: 1,
        contract_type: 'DIGITDIFF',
        symbol: 'R_25',
        barrier: '3',
        amount: 0.35,
      })
    );

    vi.useRealTimers();
  });

  it('keeps a warm proposal for the armed virtual loss target', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useBearDiffer());

    act(() => {
      result.current.updateConfig({ fastExec: true, stake: 0.35 });
      result.current.armVirtualLoss('R_10', 7, 2);
    });

    act(() => {
      vi.advanceTimersByTime(4000);
    });

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        proposal: 1,
        symbol: 'R_10',
        barrier: '7',
      })
    );

    vi.useRealTimers();
  });

  it('does not warm proposals while fast execution is disabled', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useBearDiffer());

    act(() => {
      result.current.updateConfig({ fastExec: false });
      result.current.setWarmTarget('R_25', 3);
    });

    act(() => {
      vi.advanceTimersByTime(4000);
    });

    expect(mockSend).not.toHaveBeenCalledWith(
      expect.objectContaining({ proposal: 1 })
    );

    vi.useRealTimers();
  });

  describe('real order lifecycle', () => {
    const openReal = async (
      result: { current: ReturnType<typeof useBearDiffer> },
      contractId = 4242
    ) => {
      act(() => {
        result.current.updateConfig({
          opMode: 'real',
          gateOps: 0,
          gateAcc: 0,
          fastExec: false,
          stake: 1,
          stopLoss: 0,
          stopWin: 0,
        });
      });
      mockSend.mockResolvedValueOnce({ buy: { contract_id: contractId, buy_price: 1 } });
      await act(async () => {
        await result.current.executeTrade('R_10', 4);
      });
    };

    it('subscribes to the open contract after the buy is accepted', async () => {
      const { result } = renderHook(() => useBearDiffer());
      await openReal(result);

      expect(mockSubscribe).toHaveBeenCalledWith(
        expect.objectContaining({ proposal_open_contract: 1, contract_id: 4242 })
      );
      expect(
        result.current.state.logs.some((l) => /Ordem Differ enviada/i.test(l.msg))
      ).toBe(true);
    });

    it('books a win when the contract settles in profit', async () => {
      const { result } = renderHook(() => useBearDiffer());
      await openReal(result);

      act(() => {
        mockObserver.emit('deriv.proposal_open_contract', {
          proposal_open_contract: {
            contract_id: 4242,
            is_sold: 1,
            profit: 0.11,
            exit_spot: '1234.567',
          },
        });
      });

      const st = result.current.state;
      expect(st.real.win).toBe(1);
      expect(st.real.loss).toBe(0);
      expect(st.trades[0].result).toBe('WIN');
      expect(st.trades[0].paper).toBe(false);
      expect(st.trades[0].exitDigit).toBe(7);
    });

    it('books a loss and remembers the losing digit', async () => {
      const { result } = renderHook(() => useBearDiffer());
      await openReal(result);

      act(() => {
        mockObserver.emit('deriv.proposal_open_contract', {
          proposal_open_contract: {
            contract_id: 4242,
            is_sold: 1,
            profit: -1,
            exit_spot: '1234.564',
          },
        });
      });

      expect(result.current.state.real.loss).toBe(1);
      expect(result.current.engine.getLoserCount('R_10', 4)).toBe(1);
    });

    it('frees the trade lock once the contract settles', async () => {
      const { result } = renderHook(() => useBearDiffer());
      await openReal(result);

      expect(result.current.engine.isTradeLocked()).toBe(true);

      act(() => {
        mockObserver.emit('deriv.proposal_open_contract', {
          proposal_open_contract: {
            contract_id: 4242,
            is_sold: 1,
            profit: 0.11,
            exit_spot: '1234.567',
          },
        });
      });

      expect(result.current.engine.isTradeLocked()).toBe(false);
    });

    it('ignores settlement events for contracts it did not open', async () => {
      const { result } = renderHook(() => useBearDiffer());
      await openReal(result);

      act(() => {
        mockObserver.emit('deriv.proposal_open_contract', {
          proposal_open_contract: {
            contract_id: 9999,
            is_sold: 1,
            profit: 50,
            exit_spot: '1234.567',
          },
        });
      });

      expect(result.current.state.trades.length).toBe(0);
      expect(result.current.state.real.win).toBe(0);
    });

    it('reports a thrown buy and frees the lock', async () => {
      const { result } = renderHook(() => useBearDiffer());

      act(() => {
        result.current.updateConfig({
          opMode: 'real',
          gateOps: 0,
          gateAcc: 0,
          fastExec: false,
        });
      });
      mockSend.mockRejectedValueOnce(new Error('socket caiu'));

      await act(async () => {
        await result.current.executeTrade('R_10', 4);
      });

      expect(
        result.current.state.logs.some((l) => /Erro na compra: socket caiu/.test(l.msg))
      ).toBe(true);
      expect(result.current.engine.isTradeLocked()).toBe(false);
    });
  });

  describe('logic attribution end to end', () => {
    it('carries the logic from a manual entry into the settled trade', async () => {
      const { result } = renderHook(() => useBearDiffer());
      act(() => {
        result.current.updateConfig({ opMode: 'sim', stake: 1 });
      });

      await act(async () => {
        await result.current.executeTrade('R_10', 4, undefined, 'mk1');
      });
      act(() => {
        mockObserver.emit('deriv.tick', { tick: { symbol: 'R_10', quote: 1234.561 } });
      });

      expect(result.current.state.trades[0].logicId).toBe('mk1');
    });

    it('marks an automatic entry as coming from the reference engine', async () => {
      const { result } = renderHook(() => useBearDiffer());
      act(() => {
        result.current.updateConfig({ opMode: 'sim', stake: 1 });
      });

      await act(async () => {
        await result.current.executeTrade('R_10', 4);
      });
      act(() => {
        mockObserver.emit('deriv.tick', { tick: { symbol: 'R_10', quote: 1234.561 } });
      });

      const trade = result.current.state.trades[0];
      expect(result.current.engine.getLogicName(trade.logicId)).toBe('Motor 2.0');
    });

    it('keeps the armed logic on a virtual-loss entry', () => {
      const { result } = renderHook(() => useBearDiffer());
      act(() => {
        result.current.updateConfig({ opMode: 'sim', vlossRepick: false, stake: 1 });
      });

      act(() => {
        result.current.armVirtualLoss('R_10', 7, 1, 'par');
      });
      act(() => {
        mockObserver.emit('deriv.tick', { tick: { symbol: 'R_10', quote: 1234.567 } });
      });
      act(() => {
        mockObserver.emit('deriv.tick', { tick: { symbol: 'R_10', quote: 1234.561 } });
      });

      expect(result.current.state.trades[0].logicId).toBe('par');
    });

    it('takes the logic from the repick when it recalculates at fire time', () => {
      const { result } = renderHook(() => useBearDiffer());
      act(() => {
        result.current.updateConfig({ opMode: 'sim', vlossRepick: true, stake: 1 });
      });
      vi.spyOn(result.current.engine, 'deepScan').mockReturnValue({
        sym: 'R_10',
        digit: 2,
        conf: 90,
        why: 'repick',
        n: 700,
        lid: 'flong',
      });

      act(() => {
        result.current.armVirtualLoss('R_10', 7, 1, 'par');
      });
      act(() => {
        mockObserver.emit('deriv.tick', { tick: { symbol: 'R_10', quote: 1234.567 } });
      });
      act(() => {
        mockObserver.emit('deriv.tick', { tick: { symbol: 'R_10', quote: 1234.561 } });
      });

      expect(result.current.state.trades[0].logicId).toBe('flong');
      expect(result.current.state.trades[0].digit).toBe(2);
    });

    it('attributes an automatic entry to the logic that chose the digit', () => {
      const { result } = renderHook(() => useBearDiffer());
      act(() => {
        result.current.updateConfig({
          opMode: 'sim',
          stake: 1,
          autoOn: true,
          autoSource: 'logic',
          onceLogic: 'rep',
          onceMinConf: 70,
          minTicks: 300,
          gateBias: false,
          cooldown: 0,
        });
      });
      act(() => {
        result.current.engine.setHistory(
          'R_10',
          Array.from({ length: 3000 }, (_, i) => i % 10)
        );
      });

      // R_10 tem 3 casas decimais: o dígito operado é o último da cotação.
      act(() => {
        mockObserver.emit('deriv.tick', { tick: { symbol: 'R_10', quote: 1234.563 } });
      });
      act(() => {
        mockObserver.emit('deriv.tick', { tick: { symbol: 'R_10', quote: 1234.561 } });
      });

      expect(result.current.state.trades[0].logicId).toBe('rep');
      expect(result.current.state.trades[0].digit).toBe(3);
    });

    it('carries the logic through a real contract settlement', async () => {
      const { result } = renderHook(() => useBearDiffer());
      act(() => {
        result.current.updateConfig({
          opMode: 'real',
          gateOps: 0,
          gateAcc: 0,
          fastExec: false,
          stake: 1,
          stopLoss: 0,
          stopWin: 0,
        });
      });

      mockSend.mockResolvedValueOnce({ buy: { contract_id: 777, buy_price: 1 } });
      await act(async () => {
        await result.current.executeTrade('R_10', 4, undefined, 'aus');
      });

      act(() => {
        mockObserver.emit('deriv.proposal_open_contract', {
          proposal_open_contract: {
            contract_id: 777,
            is_sold: 1,
            profit: 0.11,
            exit_spot: '1234.567',
          },
        });
      });

      expect(result.current.state.trades[0].logicId).toBe('aus');
    });
  });

  describe('virtual loss firing', () => {
    const tick = (quote: number) =>
      act(() => {
        mockObserver.emit('deriv.tick', { tick: { symbol: 'R_10', quote } });
      });

    it('sends the real entry only after the requested virtual losses', () => {
      const { result } = renderHook(() => useBearDiffer());
      act(() => {
        result.current.updateConfig({ opMode: 'sim', vlossRepick: false, stake: 1 });
      });
      act(() => {
        result.current.armVirtualLoss('R_10', 7, 2);
      });

      // First losing tick: the digit came out, but one loss is not enough
      tick(1234.567);
      expect(result.current.vlossState.armed).toBe(true);
      expect(result.current.vlossState.seenLosses).toBe(1);
      expect(
        result.current.state.logs.some((l) => /\[SIM\] Operação enviada/.test(l.msg))
      ).toBe(false);

      // A tick that is not the target digit does not count
      tick(1234.561);
      expect(result.current.vlossState.seenLosses).toBe(1);

      // Second losing tick closes the count and fires
      tick(1234.567);
      expect(result.current.vlossState.armed).toBe(false);
      expect(
        result.current.state.logs.some((l) => /\[SIM\] Operação enviada em R_10 ≠7/.test(l.msg))
      ).toBe(true);
    });

    it('recalculates the digit at fire time when repick is on', () => {
      const { result } = renderHook(() => useBearDiffer());
      act(() => {
        result.current.updateConfig({ opMode: 'sim', vlossRepick: true, stake: 1 });
      });
      vi.spyOn(result.current.engine, 'deepScan').mockReturnValue({
        sym: 'R_10',
        digit: 2,
        conf: 90,
        why: 'repick',
        n: 700,
        lid: 'flong',
      });

      act(() => {
        result.current.armVirtualLoss('R_10', 7, 1);
      });
      act(() => {
        mockObserver.emit('deriv.tick', { tick: { symbol: 'R_10', quote: 1234.567 } });
      });

      expect(
        result.current.state.logs.some((l) => /\[SIM\] Operação enviada em R_10 ≠2/.test(l.msg))
      ).toBe(true);
    });

    it('cancels the entry when the digit lost its exhaustion at fire time', () => {
      const { result } = renderHook(() => useBearDiffer());
      act(() => {
        result.current.updateConfig({ opMode: 'sim', vlossRepick: false, exFilter: true });
      });
      // 100 ticks with no 7 at all: the digit cannot be exhausted
      result.current.engine.setHistory(
        'R_10',
        Array.from({ length: 100 }, (_, i) => i % 7)
      );

      act(() => {
        result.current.armVirtualLoss('R_10', 7, 1);
      });
      act(() => {
        mockObserver.emit('deriv.tick', { tick: { symbol: 'R_10', quote: 1234.567 } });
      });

      expect(result.current.vlossState.armed).toBe(false);
      expect(
        result.current.state.logs.some((l) => /perdeu exaustão/.test(l.msg))
      ).toBe(true);
      expect(
        result.current.state.logs.some((l) => /Operação enviada/.test(l.msg))
      ).toBe(false);
    });

    it('cancels the entry when the digit never caused a loss and only losers are allowed', () => {
      const { result } = renderHook(() => useBearDiffer());
      act(() => {
        result.current.updateConfig({
          opMode: 'sim',
          vlossRepick: false,
          exFilter: false,
          exOnlyLosers: true,
        });
      });

      act(() => {
        result.current.armVirtualLoss('R_10', 7, 1);
      });
      act(() => {
        mockObserver.emit('deriv.tick', { tick: { symbol: 'R_10', quote: 1234.567 } });
      });

      expect(result.current.vlossState.armed).toBe(false);
      expect(
        result.current.state.logs.some((l) => /nunca deu loss/.test(l.msg))
      ).toBe(true);
    });
  });

  it('loads the initial tick history into the engine', () => {
    const { result } = renderHook(() => useBearDiffer());

    act(() => {
      mockObserver.emit('deriv.history', {
        echo_req: { ticks_history: 'R_10' },
        history: { prices: [1234.561, 1234.562, 1234.563] },
      });
    });

    expect(result.current.engine.getDigits('R_10')).toEqual([1, 2, 3]);
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
