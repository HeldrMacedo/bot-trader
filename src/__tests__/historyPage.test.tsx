// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import React from 'react';

const deriv = vi.hoisted(() => ({
  getStorageDerivAccount: vi.fn(),
  getProfitTableForAccount: vi.fn(),
}));

vi.mock('@/app/services/DerivService', () => ({
  DerivService: { getInstance: () => deriv },
}));

const { default: HistoryPage } = await import('@/app/(withSidebar)/history/page');

const tx = (id: number, buy: number, sell: number) => ({
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
});

beforeEach(() => {
  vi.clearAllMocks();
  deriv.getStorageDerivAccount.mockReturnValue([
    {
      activeToken: 'real-token',
      tokens: [
        { token: 'real-token', is_virtual: false, acct: 'CR123', cur: 'USD' },
        { token: 'demo-token', is_virtual: true, acct: 'VRTC1', cur: 'USD' },
      ],
    },
  ]);
  // W W L : +0.20 +0.20 -0.35
  deriv.getProfitTableForAccount.mockResolvedValue({
    profit_table: { transactions: [tx(1, 0.35, 0.55), tx(2, 0.35, 0.55), tx(3, 0.35, 0)] },
  });
});

describe('HistoryPage', () => {
  it('shows statistics computed from the Deriv profit table', async () => {
    render(<HistoryPage />);
    const stats = await screen.findByTestId('history-stats');
    expect(within(stats).getByTestId('stat-total').textContent).toContain('3');
    expect(within(stats).getByTestId('stat-win-rate').textContent).toContain('66,7%');
    expect(within(stats).getByTestId('stat-profit').textContent).toContain('0,05');
    expect(within(stats).getByTestId('stat-max-loss-streak').textContent).toContain('1');
  });

  it('shows the profit of each trade, not the sell price', async () => {
    render(<HistoryPage />);
    const row = await screen.findByTestId('history-row-1');
    expect(within(row).getByTestId('trade-profit').textContent).toContain('0,20');
    expect(within(row).getByTestId('trade-profit').textContent).not.toContain('0,55');
    expect(row.textContent).toContain('Acima de 3');
  });

  it('loads the selected period from Deriv with date_from', async () => {
    render(<HistoryPage />);
    await screen.findByTestId('history-stats');

    const before = Math.floor(Date.now() / 1000);
    fireEvent.change(screen.getByLabelText('Período'), { target: { value: '30d' } });

    await waitFor(() => {
      const [token, , offset, range] = deriv.getProfitTableForAccount.mock.calls.at(-1)!;
      expect(token).toBe('real-token');
      expect(offset).toBe(0);
      expect(range.dateFrom).toBeLessThanOrEqual(before - 29 * 86400);
      expect(range.dateFrom).toBeGreaterThan(before - 32 * 86400);
    });
  });

  it('shows the Deriv error message', async () => {
    deriv.getProfitTableForAccount.mockResolvedValue({ error: { message: 'Permission denied' } });
    render(<HistoryPage />);
    expect(await screen.findByText(/Permission denied/)).toBeInTheDocument();
  });

  it('shows breakdowns by symbol, contract and hour', async () => {
    render(<HistoryPage />);
    await screen.findByTestId('history-stats');
    expect(screen.getByText('Por ativo')).toBeInTheDocument();
    expect(screen.getByText('Por contrato')).toBeInTheDocument();
    expect(screen.getByText('Por hora do dia')).toBeInTheDocument();
  });
});
