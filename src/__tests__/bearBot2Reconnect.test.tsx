// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, cleanup } from '@testing-library/react';
import { DerivService } from '../app/services/DerivService';
import { installFakes, bootConnected, flush, lastTrading } from './derivServiceTestHarness';
import { stubAudio } from './bearBotUltraTestHarness';

vi.mock('react-toastify', () => ({
  toast: { error: vi.fn(), success: vi.fn(), warn: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));

import { useBearBot } from '../app/hooks/useBearBot2';

// Integração com o DerivService real sobre WebSockets falsos.
async function bootBot() {
  const { svc, trade, market } = await bootConnected();
  vi.spyOn(DerivService, 'getInstance').mockReturnValue(svc);
  const hook = renderHook(() => useBearBot());
  await act(async () => { await flush(); });
  await act(async () => { await vi.advanceTimersByTimeAsync(100); });
  return { svc, trade, market, ...hook };
}

const lastSent = (ws: any, pred: (m: any) => boolean) => ws.sent.filter(pred).at(-1);

async function readyProposal(trade: any, id: string) {
  const prop = lastSent(trade, (m) => m.proposal === 1);
  expect(prop).toBeDefined();
  await act(async () => {
    trade.receive({
      msg_type: 'proposal',
      req_id: prop.req_id,
      passthrough: prop.passthrough,
      subscription: { id: `sub-${id}` },
      proposal: { id, ask_price: 0.35 },
    });
    await flush();
  });
}

describe('Bear Bot Ultra 2 — reconexão com DerivService real', () => {
  beforeEach(() => {
    installFakes();
    stubAudio();
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('BB2-01: reassina o resultado do contrato aberto após queda do canal de trade', async () => {
    const { trade, result } = await bootBot();
    act(() => { result.current.executeTrade('over'); });
    await act(async () => { await flush(); });
    const buy = lastSent(trade, (m) => m.buy !== undefined);
    await act(async () => {
      trade.receive({ msg_type: 'buy', req_id: buy.req_id, buy: { contract_id: 900, buy_price: 0.35 } });
      await flush();
    });
    const poc = lastSent(trade, (m) => m.proposal_open_contract === 1);
    await act(async () => {
      trade.receive({
        msg_type: 'proposal_open_contract',
        req_id: poc.req_id,
        subscription: { id: 'poc-900' },
        proposal_open_contract: { contract_id: 900, status: 'open', is_sold: 0, is_valid_to_sell: 0 },
      });
      await flush();
    });

    await act(async () => { trade.drop(); await vi.advanceTimersByTimeAsync(1000); });
    const trade2 = lastTrading();
    await act(async () => { trade2.open(); await flush(); });

    expect(trade2.sent.filter((m) => m.proposal_open_contract === 1 && m.contract_id === 900)).toHaveLength(1);
  });

  it('BB2-02: não compra com o id de proposta da conexão que caiu', async () => {
    const { trade, result } = await bootBot();
    await readyProposal(trade, 'PROP-OLD');

    await act(async () => { trade.drop(); await vi.advanceTimersByTimeAsync(1000); });
    const trade2 = lastTrading();
    await act(async () => {
      trade2.open();
      result.current.executeTrade('over');
      await flush();
    });

    const buy = lastSent(trade2, (m) => m.buy !== undefined);
    expect(buy).toBeDefined();
    expect(buy.buy).not.toBe('PROP-OLD');
  });

  it('BB2-02: queda só do canal de trade aparece como trade indisponível', async () => {
    const { trade, result } = await bootBot();
    expect(result.current.tradeReady).toBe(true);

    await act(async () => { trade.drop(); await flush(); });

    expect(result.current.isConnected).toBe(true);
    expect(result.current.tradeReady).toBe(false);
  });
});
