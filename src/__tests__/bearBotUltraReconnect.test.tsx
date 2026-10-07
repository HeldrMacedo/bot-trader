// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act, cleanup } from '@testing-library/react';
import React from 'react';
import { DerivService } from '../app/services/DerivService';
import { installFakes, bootConnected, flush, lastTrading } from './derivServiceTestHarness';
import { stubAudio, startAuto } from './bearBotUltraTestHarness';

vi.mock('react-toastify', () => ({
  toast: { error: vi.fn(), success: vi.fn(), warn: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));

import BearBotUltra from '../app/(withSidebar)/bear-bot-ultra/bearBotUltra';

// Integração com o DerivService real sobre WebSockets falsos: a reconexão é a
// do serviço de verdade, não uma simulação dentro do mock.
async function bootBot() {
  const { svc, trade, market } = await bootConnected();
  vi.spyOn(DerivService, 'getInstance').mockReturnValue(svc);
  render(<BearBotUltra />);
  await act(async () => { await flush(); });
  await act(async () => { await vi.advanceTimersByTimeAsync(100); });
  return { svc, trade, market };
}

function marketTick(market: any, quote: number) {
  market.receive({ msg_type: 'tick', tick: { symbol: 'R_100', quote, epoch: 1, pip_size: 2 } });
}

const lastSent = (ws: any, pred: (m: any) => boolean) => ws.sent.filter(pred).at(-1);

describe('Bear Bot Ultra — reconexão com DerivService real', () => {
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

  it('BBU-01: reassina o resultado do contrato aberto após queda do canal de trade', async () => {
    const { trade, market } = await bootBot();
    await startAuto();

    await act(async () => { marketTick(market, 1234.57); await flush(); });
    const buy = lastSent(trade, (m) => m.buy !== undefined);
    expect(buy).toBeDefined();
    await act(async () => {
      trade.receive({ msg_type: 'buy', req_id: buy.req_id, buy: { contract_id: 900, buy_price: 0.35 } });
      await flush();
    });
    const poc = lastSent(trade, (m) => m.proposal_open_contract === 1);
    expect(poc.contract_id).toBe(900);
    await act(async () => {
      trade.receive({
        msg_type: 'proposal_open_contract',
        req_id: poc.req_id,
        subscription: { id: 'poc-900' },
        proposal_open_contract: { contract_id: 900, status: 'open', is_sold: 0, is_valid_to_sell: 0 },
      });
      await flush();
    });

    await act(async () => {
      trade.drop();
      await vi.advanceTimersByTimeAsync(1000);
    });
    const trade2 = lastTrading();
    expect(trade2).not.toBe(trade);
    await act(async () => { trade2.open(); await flush(); });

    expect(trade2.sent.filter((m) => m.proposal_open_contract === 1 && m.contract_id === 900)).toHaveLength(1);
  });

  it('BBU-02: não compra com o id de proposta da conexão que caiu', async () => {
    const { trade, market } = await bootBot();
    const prop = lastSent(trade, (m) => m.proposal === 1);
    expect(prop).toBeDefined();
    await act(async () => {
      trade.receive({
        msg_type: 'proposal',
        req_id: prop.req_id,
        passthrough: prop.passthrough,
        subscription: { id: 'prop-old' },
        proposal: { id: 'PROP-OLD', ask_price: 0.35 },
      });
      await flush();
    });

    await startAuto();
    await act(async () => {
      trade.drop();
      await vi.advanceTimersByTimeAsync(1000);
    });
    const trade2 = lastTrading();
    // O canal de mercado não caiu: o tick seguinte pode chegar logo após a
    // reabertura, antes de o componente saber que a conexão mudou.
    await act(async () => {
      trade2.open();
      marketTick(market, 1234.57);
      await flush();
    });

    const buy = lastSent(trade2, (m) => m.buy !== undefined);
    expect(buy).toBeDefined();
    expect(buy.buy).not.toBe('PROP-OLD');
  });
});
