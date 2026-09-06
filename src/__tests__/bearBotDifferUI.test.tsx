// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import BearBotDiffer from '../app/(withSidebar)/bear-bot-differ/BearBotDiffer';

// Mock do DerivService
vi.mock('../app/services/DerivService', () => ({
  DerivService: {
    getInstance: () => ({
      send: vi.fn().mockResolvedValue({}),
      subscribe: vi.fn().mockResolvedValue({}),
      switchAccount: vi.fn().mockResolvedValue({}),
      isMarketConnected: true,
      observerInstance: {
        on: vi.fn(() => 'sub_id'),
        removeById: vi.fn(),
        emit: vi.fn(),
      },
      getStorageDerivAccount: () => [
        {
          activeToken: 'vrtc_demo',
          tokens: [
            { token: 'vrtc_demo', is_virtual: true, balance: 10000, currency: 'USD' },
          ],
        },
      ],
    }),
  },
}));

describe('BearBotDiffer - Main Component & Navigation', () => {
  it('renders the header with module title, account info and PnL', () => {
    render(<BearBotDiffer />);

    expect(screen.getByText(/Bear Bot Differ/i)).toBeInTheDocument();
    expect(screen.getByText(/DIFFER IA 3.5/i)).toBeInTheDocument();
    expect(screen.getByText(/📄 SIMULAÇÃO/i)).toBeInTheDocument();
    expect(screen.getByText(/\$10,000\.00/i)).toBeInTheDocument();
  });

  it('renders all 8 navigation tabs', () => {
    render(<BearBotDiffer />);

    expect(screen.getByRole('button', { name: /Operação/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Lógicas/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Vigilância/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Laboratório/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Validação/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Risco/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Esteira/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sistema/i })).toBeInTheDocument();
  });

  it('switches tabs when clicked', () => {
    render(<BearBotDiffer />);

    // Initial tab should show Operação content (e.g. Operação única)
    expect(screen.getByText(/Operação única/i)).toBeInTheDocument();

    // Click Lógicas tab
    const logicsTabBtn = screen.getByRole('button', { name: /Lógicas/i });
    fireEvent.click(logicsTabBtn);

    expect(screen.getByText(/Dez lógicas em disputa/i)).toBeInTheDocument();

    // Click Laboratório tab
    const labTabBtn = screen.getByRole('button', { name: /Laboratório/i });
    fireEvent.click(labTabBtn);

    expect(screen.getByText(/Bateria de testes de aleatoriedade/i)).toBeInTheDocument();
  });

  it('renders "Zerar sessão" button in Operação tab and triggers reset', () => {
    render(<BearBotDiffer />);

    const resetBtn = screen.getByRole('button', { name: /Zerar sessão/i });
    expect(resetBtn).toBeInTheDocument();
    fireEvent.click(resetBtn);
  });

  it('toggles continuous auto-trade mode (3.0 legado) in Operação tab', () => {
    render(<BearBotDiffer />);

    const allowCheckbox = screen.getByLabelText(/habilitar o automático da 3\.0 \(legado\)/i);
    expect(allowCheckbox).toBeInTheDocument();
    expect(allowCheckbox).not.toBeChecked();

    // Auto button should not be displayed when not allowed
    expect(screen.queryByRole('button', { name: /Ligar automático/i })).not.toBeInTheDocument();

    // Check allow
    fireEvent.click(allowCheckbox);
    expect(allowCheckbox).toBeChecked();

    // Auto button is now visible
    const autoBtn = screen.getByRole('button', { name: /Ligar automático/i });
    expect(autoBtn).toBeInTheDocument();

    // Click to start auto
    fireEvent.click(autoBtn);
    expect(screen.getByRole('button', { name: /Desligar automático/i })).toBeInTheDocument();
  });

  it('renders "Zerar medição" button in Lógicas tab and triggers reset', () => {
    render(<BearBotDiffer />);

    const logicsTabBtn = screen.getByRole('button', { name: /Lógicas/i });
    fireEvent.click(logicsTabBtn);

    const resetLogicsBtn = screen.getByRole('button', { name: /Zerar medição/i });
    expect(resetLogicsBtn).toBeInTheDocument();
    fireEvent.click(resetLogicsBtn);
  });
});
