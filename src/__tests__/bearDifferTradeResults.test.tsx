// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import React from 'react';
import { createDifferEngine } from '../app/services/BearDifferEngine';
import TradeResultsTable from '../app/(withSidebar)/bear-bot-differ/components/TradeResultsTable';

describe('TradeResultsTable - últimas operações', () => {
  let engine: ReturnType<typeof createDifferEngine>;

  beforeEach(() => {
    engine = createDifferEngine();
    engine.updateConfig({ opMode: 'sim', stopLoss: 0, stopWin: 0, stake: 1 });
  });

  const renderTable = (onExport = vi.fn()) => {
    render(
      <TradeResultsTable engine={engine} state={engine.getState()} onExport={onExport} />
    );
    return onExport;
  };

  it('says plainly that nothing has been traded yet', () => {
    renderTable();

    expect(screen.getByText(/ÚLTIMAS OPERAÇÕES/i)).toBeInTheDocument();
    expect(screen.getByText(/Nenhuma operação/i)).toBeInTheDocument();
  });

  it('shows a settled win with its market, target, exit digit and profit', () => {
    engine.settleContract(0.11, false, 'R_10', 4, 7, undefined, 'mk1');

    renderTable();
    const row = screen.getAllByRole('row')[1];

    expect(within(row).getByText('R_10')).toBeInTheDocument();
    expect(within(row).getByText('Markov 1ª ordem')).toBeInTheDocument();
    expect(within(row).getByText('≠4')).toBeInTheDocument();
    expect(within(row).getByText('7')).toBeInTheDocument();
    expect(within(row).getByText('WIN')).toBeInTheDocument();
    expect(within(row).getByText(/\+0\.11/)).toBeInTheDocument();
  });

  it('shows a loss with the negative profit', () => {
    engine.settleContract(-1, true, 'R_25', 3, 3, undefined, 'aus');

    renderTable();
    const row = screen.getAllByRole('row')[1];

    expect(within(row).getByText('LOSS')).toBeInTheDocument();
    expect(within(row).getByText(/-1\.00/)).toBeInTheDocument();
  });

  it('labels an entry with no logic as the reference engine', () => {
    engine.settleContract(0.11, false, 'R_10', 4, 7);

    renderTable();
    expect(screen.getByText('Motor 2.0')).toBeInTheDocument();
  });

  it('marks simulated and real rows apart', () => {
    engine.settleContract(0.11, false, 'R_10', 4, 7, undefined, 'mk1');
    engine.updateConfig({ opMode: 'real', gateOps: 0, gateAcc: 0 });
    engine.settleContract(0.11, false, 'R_10', 5, 8, undefined, 'mk1');

    renderTable();

    expect(screen.getByText('REAL')).toBeInTheDocument();
    expect(screen.getByText('SIM')).toBeInTheDocument();
  });

  it('keeps only the last ten operations on screen', () => {
    for (let i = 0; i < 14; i++) {
      engine.settleContract(0.11, false, 'R_10', i % 10, 7, undefined, 'mk1');
    }

    renderTable();
    // One header row plus ten data rows
    expect(screen.getAllByRole('row')).toHaveLength(11);
  });

  it('lists the newest operation first', () => {
    engine.settleContract(0.11, false, 'R_10', 1, 7, undefined, 'mk1');
    engine.settleContract(0.11, false, 'R_25', 2, 8, undefined, 'mk1');

    renderTable();
    const first = screen.getAllByRole('row')[1];

    expect(within(first).getByText('R_25')).toBeInTheDocument();
  });

  it('exports from the table header without leaving the tab', () => {
    engine.settleContract(0.11, false, 'R_10', 4, 7, undefined, 'mk1');

    const onExport = renderTable();
    fireEvent.click(screen.getByRole('button', { name: /CSV/i }));

    expect(onExport).toHaveBeenCalledOnce();
  });

  it('blocks the export while there is nothing to export', () => {
    renderTable();
    expect(screen.getByRole('button', { name: /CSV/i })).toBeDisabled();
  });
});
