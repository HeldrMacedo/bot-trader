// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, cleanup } from '@testing-library/react';
import { DerivService } from '../app/services/DerivService';
import { installFakes, bootConnected, flush, lastTrading } from './derivServiceTestHarness';

vi.mock('react-toastify', () => ({
  toast: { error: vi.fn(), success: vi.fn(), warn: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));

import { useBearDiffer } from '../app/hooks/useBearDiffer';

// Integração com o DerivService real sobre WebSockets falsos.
async function bootBot() {
  const { svc, trade, market } = await bootConnected();
  vi.spyOn(DerivService, 'getInstance').mockReturnValue(svc);
  const hook = renderHook(() => useBearDiffer());
  await act(async () => { await flush(); });
  await act(async () => { hook.result.current.updateConfig({ opMode: 'real', fastExec: true }); });
  return { svc, trade, market, ...hook };
}

const lastSent = (ws: any, pred: (m: any) => boolean) => ws.sent.filter(pred).at(-1);

async function answerBuy(ws: any, contractId: number) {
  const buy = lastSent(ws, (m) => m.buy !== undefined);
  await act(async () => {
    ws.receive({ msg_type: 'buy', req_id: buy.req_id, buy: { contract_id: contractId, buy_price: 0.35 } });
    await flush();
  });
}

describe('Bear Bot Differ — reconexão com DerivService real', () => {
  beforeEach(() => {
    installFakes();
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('BD-01: reassina o resultado do contrato aberto após queda do canal de trade', async () => {
    const { trade, result } = await bootBot();
    act(() => { result.current.executeTrade('R_100', 3); });
    await act(async () => { await flush(); });
    await answerBuy(trade, 900);
    const poc = lastSent(trade, (m) => m.proposal_open_contract === 1);
    await act(async () => {
      trade.receive({
        msg_type: 'proposal_open_contract',
        req_id: poc.req_id,
        subscription: { id: 'poc-900' },
        proposal_open_contract: { contract_id: 900, status: 'open', is_sold: 0 },
      });
      await flush();
    });

    await act(async () => { trade.drop(); await vi.advanceTimersByTimeAsync(1000); });
    const trade2 = lastTrading();
    await act(async () => { trade2.open(); await flush(); });

    expect(trade2.sent.filter((m) => m.proposal_open_contract === 1 && m.contract_id === 900)).toHaveLength(1);
  });

  it('BD-02: depois da reconexão, compra não usa o id de proposta da conexão que caiu', async () => {
    const { trade, result } = await bootBot();
    await act(async () => {
      result.current.setWarmTarget('R_100', 3);
      await vi.advanceTimersByTimeAsync(4000);
    });
    const prop = lastSent(trade, (m) => m.proposal === 1);
    expect(prop).toBeDefined();
    await act(async () => {
      trade.receive({
        msg_type: 'proposal',
        req_id: prop.req_id,
        passthrough: prop.passthrough,
        subscription: { id: 'prop-old' },
        proposal: { id: 'PROP-OLD', payout: 0.67, ask_price: 0.35 },
      });
      await flush();
    });

    await act(async () => { trade.drop(); await vi.advanceTimersByTimeAsync(1000); });
    const trade2 = lastTrading();
    await act(async () => { trade2.open(); await vi.advanceTimersByTimeAsync(8000); });

    act(() => { result.current.executeTrade('R_100', 3); });
    await act(async () => { await flush(); });

    const buy = lastSent(trade2, (m) => m.buy !== undefined);
    expect(buy).toBeDefined();
    expect(buy.buy).not.toBe('PROP-OLD');
  });
});
