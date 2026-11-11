// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import React from 'react';

const mocks = vi.hoisted(() => ({
  getOperations: vi.fn(),
  getOperationsForExport: vi.fn(),
  getOperationFilterOptions: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock('@/app/(withSidebar)/operations/actions', () => ({
  getOperations: mocks.getOperations,
  getOperationsForExport: mocks.getOperationsForExport,
  getOperationFilterOptions: mocks.getOperationFilterOptions,
}));
vi.mock('next/navigation', () => ({ redirect: mocks.redirect }));

const { default: OperationsPage } = await import('@/app/(withSidebar)/operations/page');

const operation = (id: number, overrides: Record<string, unknown> = {}) => ({
  id,
  operationId: String(20144452219 + id),
  contractId: String(20144452219 + id),
  transactionId: '38595339419',
  derivAccountId: '62923101',
  account: 'CR123',
  operationDate: new Date('2026-11-10T12:00:00.000Z'),
  deposit: 0.35,
  result: -0.35,
  outcome: 'lost',
  payout: 0.55,
  currency: 'USD',
  symbol: 'R_100',
  contractType: 'DIGITOVER',
  barrier: '3',
  entrySpot: '519.92',
  exitSpot: '519.92',
  exitDigit: 2,
  purchaseTime: new Date('2026-11-10T11:59:58.000Z'),
  expiryTime: new Date('2026-11-10T12:00:00.000Z'),
  shortcode: 'DIGITOVER_R_100_0.55_1794353054_1T_3_0',
  audit: [
    { epoch: 1794353052, tick: 519.67, tick_display_value: '519.67' },
    { epoch: 1794353054, flag: 'highlight_time', name: 'Start Time', tick: 519.89, tick_display_value: '519.89' },
    { epoch: 1794353056, flag: 'highlight_tick', name: 'Exit Spot', tick: 519.92, tick_display_value: '519.92' },
  ],
  user: { id: 1, name: 'Fulano', email: 'f@x.com' },
  ...overrides,
});

const report = (operations: unknown[], total: number) => ({
  operations,
  total,
  summary: { total, wins: 1, losses: total - 1, winRate: (1 / total) * 100, staked: 1.05, profit: -0.15, roi: -14.28 },
  bySymbol: [{ key: 'R_100', total, wins: 1, losses: total - 1, winRate: 33.3, staked: 1.05, profit: -0.15, roi: -14.28 }],
  byContractType: [{ key: 'DIGITOVER', total, wins: 1, losses: total - 1, winRate: 33.3, staked: 1.05, profit: -0.15, roi: -14.28 }],
  error: false,
});

// jsdom here exposes no working localStorage; the page only reads the token.
Object.defineProperty(window, 'localStorage', {
  value: { getItem: (key: string) => (key === 'access_token' ? 'jwt' : null) },
  configurable: true,
});

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getOperationFilterOptions.mockResolvedValue({ symbols: ['R_100'], contractTypes: ['DIGITOVER'] });
});

describe('OperationsPage', () => {
  it('shows the summary of the filtered operations', async () => {
    mocks.getOperations.mockResolvedValue(report([operation(1)], 3));
    render(<OperationsPage />);

    const summary = await screen.findByTestId('operations-summary');
    expect(within(summary).getByText('3')).toBeInTheDocument();
    expect(within(summary).getByText('33,3%')).toBeInTheDocument();
  });

  it('shows amounts in the contract currency, not R$', async () => {
    mocks.getOperations.mockResolvedValue(report([operation(1)], 1));
    render(<OperationsPage />);

    const row = await screen.findByTestId('operation-row-1');
    expect(row.textContent).toContain('US$');
    expect(row.textContent).not.toContain('R$');
    expect(row.textContent).toContain('Acima de 3');
    expect(row.textContent).toContain('R_100');
    expect(row.textContent).toContain('Loss');
  });

  it('expands a row to show the contract details and audit ticks', async () => {
    mocks.getOperations.mockResolvedValue(report([operation(1)], 1));
    render(<OperationsPage />);

    fireEvent.click(await screen.findByTestId('operation-row-1'));
    const details = await screen.findByTestId('operation-details-1');
    expect(details.textContent).toContain('38595339419');
    expect(details.textContent).toContain('DIGITOVER_R_100_0.55_1794353054_1T_3_0');
    expect(details.textContent).toContain('519.89');
    expect(details.textContent).toContain('Start Time');
  });

  it('hides "Mostrar mais" when a fresh search returns every operation', async () => {
    // Page one: 2 of 3 loaded, so there is more.
    mocks.getOperations.mockResolvedValueOnce(report([operation(1), operation(2)], 3));
    render(<OperationsPage />);
    expect(await screen.findByText('Mostrar mais')).toBeInTheDocument();

    // New search resets the list: 1 of 1 loaded, nothing more to fetch.
    mocks.getOperations.mockResolvedValue(report([operation(3)], 1));
    fireEvent.change(screen.getByPlaceholderText(/buscar/i), { target: { value: 'x' } });

    await screen.findByTestId('operation-row-3');
    await waitFor(() => expect(screen.queryByText('Mostrar mais')).not.toBeInTheDocument());
  });

  it('sends the selected filters to the server', async () => {
    mocks.getOperations.mockResolvedValue(report([operation(1)], 1));
    render(<OperationsPage />);
    await screen.findByTestId('operation-row-1');

    fireEvent.change(await screen.findByLabelText('Resultado'), { target: { value: 'won' } });

    await waitFor(() =>
      expect(mocks.getOperations).toHaveBeenLastCalledWith(
        expect.objectContaining({ outcome: 'won' }),
        0,
        20,
        'jwt',
      ),
    );
  });
});
