import { describe, it, expect, vi } from 'vitest';
import {
  breakdownBy,
  computeHistoryStats,
  contractDescription,
  equityCurve,
  fetchProfitTableRange,
  hourOfDay,
  normalizeTrade,
} from '@/app/(withSidebar)/history/stats';

// Shape of a profit_table transaction returned by Deriv.
const raw = (id: number, buy: number, sell: number, overrides: Record<string, unknown> = {}) => ({
  transaction_id: id,
  contract_id: 1000 + id,
  contract_type: 'DIGITOVER',
  underlying_symbol: 'R_100',
  buy_price: buy,
  sell_price: sell,
  payout: 0.55,
  purchase_time: 1794353000 + id * 60,
  sell_time: 1794353002 + id * 60,
  shortcode: 'DIGITOVER_R_100_0.55_1794353054_1T_3_0',
  ...overrides,
});

describe('normalizeTrade', () => {
  it('computes profit as sell minus buy and win from its sign', () => {
    expect(normalizeTrade(raw(1, 0.35, 0.55))).toMatchObject({ profit: 0.2, won: true, stake: 0.35 });
    expect(normalizeTrade(raw(2, 0.35, 0))).toMatchObject({ profit: -0.35, won: false });
  });

  it('avoids float noise in the profit', () => {
    expect(normalizeTrade(raw(1, 0.35, 0.55)).profit).toBe(0.2);
  });

  it('reads string prices', () => {
    expect(normalizeTrade(raw(1, '1.00' as any, '1.95' as any)).profit).toBe(0.95);
  });

  it('takes the digit barrier from the shortcode', () => {
    expect(normalizeTrade(raw(1, 1, 0)).barrier).toBe('3');
    expect(
      normalizeTrade(raw(1, 1, 0, { contract_type: 'DIGITDIFF', shortcode: 'DIGITDIFF_1HZ100V_1.06_1794353054_1T_7_0' }))
        .barrier,
    ).toBe('7');
    expect(normalizeTrade(raw(1, 1, 0, { contract_type: 'DIGITEVEN', shortcode: 'DIGITEVEN_R_100_1.95_1794353054_1T' })).barrier).toBeNull();
  });
});

describe('contractDescription', () => {
  it('names digit contracts with their barrier', () => {
    expect(contractDescription('DIGITOVER', '3')).toBe('Acima de 3');
    expect(contractDescription('DIGITEVEN', null)).toBe('Par');
    expect(contractDescription('MULTUP', null)).toBe('MULTUP');
  });
});

describe('computeHistoryStats', () => {
  // Chronological: W W L L L W, profits +0.2 +0.2 -0.35 -0.35 -0.35 +0.2
  const trades = [
    raw(1, 0.35, 0.55),
    raw(2, 0.35, 0.55),
    raw(3, 0.35, 0),
    raw(4, 0.35, 0),
    raw(5, 0.35, 0),
    raw(6, 0.35, 0.55),
  ].map(normalizeTrade);

  const stats = computeHistoryStats(trades);

  it('totals, win rate and ROI', () => {
    expect(stats.total).toBe(6);
    expect(stats.wins).toBe(3);
    expect(stats.losses).toBe(3);
    expect(stats.winRate).toBe(50);
    expect(stats.staked).toBeCloseTo(2.1);
    expect(stats.profit).toBeCloseTo(-0.45);
    expect(stats.roi).toBeCloseTo((-0.45 / 2.1) * 100);
  });

  it('averages, extremes, profit factor and expectancy', () => {
    expect(stats.averageStake).toBeCloseTo(0.35);
    expect(stats.averageWin).toBeCloseTo(0.2);
    expect(stats.averageLoss).toBeCloseTo(-0.35);
    expect(stats.bestTrade).toBeCloseTo(0.2);
    expect(stats.worstTrade).toBeCloseTo(-0.35);
    expect(stats.profitFactor).toBeCloseTo(0.6 / 1.05);
    expect(stats.expectancy).toBeCloseTo(-0.45 / 6);
  });

  it('break-even win rate from the average payout ratio', () => {
    // Win pays 0.2 for 0.35 risked: needs 0.35 / (0.2 + 0.35) of wins to break even.
    expect(stats.breakEvenWinRate).toBeCloseTo((0.35 / 0.55) * 100);
  });

  it('streaks in chronological order regardless of input order', () => {
    const shuffled = computeHistoryStats([...trades].reverse());
    expect(shuffled.maxWinStreak).toBe(2);
    expect(shuffled.maxLossStreak).toBe(3);
    expect(shuffled.currentStreak).toEqual({ type: 'won', length: 1 });
  });

  it('max drawdown from the cumulative peak', () => {
    // Cumulative: 0.2, 0.4, 0.05, -0.3, -0.65, -0.45 -> peak 0.4, trough -0.65
    expect(stats.maxDrawdown).toBeCloseTo(1.05);
  });

  it('handles an empty history', () => {
    expect(computeHistoryStats([])).toMatchObject({
      total: 0,
      winRate: 0,
      roi: 0,
      profitFactor: null,
      breakEvenWinRate: null,
      maxDrawdown: 0,
      currentStreak: null,
    });
  });

  it('reports an infinite profit factor as null when there are no losses', () => {
    expect(computeHistoryStats([normalizeTrade(raw(1, 1, 2))]).profitFactor).toBeNull();
  });
});

describe('breakdownBy', () => {
  it('groups by a key and sorts by volume', () => {
    const trades = [
      raw(1, 1, 2, { underlying_symbol: 'R_10' }),
      raw(2, 1, 0),
      raw(3, 1, 1.9),
    ].map(normalizeTrade);
    const rows = breakdownBy(trades, (t) => t.symbol);
    expect(rows.map((r) => r.key)).toEqual(['R_100', 'R_10']);
    expect(rows[0]).toMatchObject({ total: 2, wins: 1, losses: 1, winRate: 50 });
    expect(rows[0].profit).toBeCloseTo(-0.1);
  });

  it('can keep a fixed key order (hours of the day)', () => {
    const trades = [raw(1, 1, 2), raw(2, 1, 0)].map(normalizeTrade);
    const rows = breakdownBy(trades, () => '05', (a, b) => a.key.localeCompare(b.key));
    expect(rows).toHaveLength(1);
  });
});

describe('hourOfDay', () => {
  it('formats the local hour with two digits', () => {
    const trade = normalizeTrade(raw(1, 1, 2));
    expect(hourOfDay(trade)).toBe(String(new Date(trade.purchaseTime * 1000).getHours()).padStart(2, '0'));
  });
});

describe('equityCurve', () => {
  it('accumulates profit in chronological order', () => {
    const trades = [raw(2, 0.35, 0), raw(1, 0.35, 0.55)].map(normalizeTrade);
    const curve = equityCurve(trades);
    expect(curve.map((p) => p.index)).toEqual([1, 2]);
    expect(curve[0].cumulative).toBeCloseTo(0.2);
    expect(curve[1].cumulative).toBeCloseTo(-0.15);
  });
});

describe('fetchProfitTableRange', () => {
  it('pages until Deriv returns a short page', async () => {
    const fetchPage = vi
      .fn()
      .mockResolvedValueOnce({ profit_table: { transactions: [raw(1, 1, 0), raw(2, 1, 0)] } })
      .mockResolvedValueOnce({ profit_table: { transactions: [raw(3, 1, 0)] } });

    const result = await fetchProfitTableRange(fetchPage, { pageSize: 2, maxTrades: 10 });

    expect(fetchPage).toHaveBeenNthCalledWith(1, 2, 0);
    expect(fetchPage).toHaveBeenNthCalledWith(2, 2, 2);
    expect(result.transactions).toHaveLength(3);
    expect(result.truncated).toBe(false);
  });

  it('stops at the cap and flags truncation', async () => {
    const fetchPage = vi.fn().mockResolvedValue({ profit_table: { transactions: [raw(1, 1, 0), raw(2, 1, 0)] } });

    const result = await fetchProfitTableRange(fetchPage, { pageSize: 2, maxTrades: 4 });

    expect(fetchPage).toHaveBeenCalledTimes(2);
    expect(result.transactions).toHaveLength(4);
    expect(result.truncated).toBe(true);
  });

  it('surfaces a Deriv error', async () => {
    const fetchPage = vi.fn().mockResolvedValue({ error: { message: 'Permission denied' } });
    await expect(fetchProfitTableRange(fetchPage, { pageSize: 2, maxTrades: 4 })).rejects.toThrow('Permission denied');
  });
});
