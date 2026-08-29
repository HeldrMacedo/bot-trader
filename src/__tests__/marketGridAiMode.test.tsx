// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MarketGrid from '../app/(withSidebar)/bear-bot-ultra-2/components/MarketGrid';
import { DEFAULT_CONFIG, DEFAULT_BOT_STATE } from '../app/services/bearbot2.types';

describe('MarketGrid AI modes', () => {
  it('renders Conservador, Equilibrado and Agressivo and writes aiMode', () => {
    const updateConfig = vi.fn();
    render(
      <MarketGrid
        config={{ ...DEFAULT_CONFIG, aiMode: 'balanced' }}
        state={DEFAULT_BOT_STATE}
        updateConfig={updateConfig}
      />,
    );

    expect(screen.getByText('Conservador')).toBeDefined();
    expect(screen.getByText('Equilibrado')).toBeDefined();
    expect(screen.getByText('Agressivo')).toBeDefined();

    fireEvent.click(screen.getByText('Conservador'));
    expect(updateConfig).toHaveBeenCalledWith({ aiMode: 'conservative' });

    fireEvent.click(screen.getByText('Equilibrado'));
    expect(updateConfig).toHaveBeenCalledWith({ aiMode: 'balanced' });

    fireEvent.click(screen.getByText('Agressivo'));
    expect(updateConfig).toHaveBeenCalledWith({ aiMode: 'aggressive' });
  });

  it('highlights the active aiMode button', () => {
    const { rerender } = render(
      <MarketGrid
        config={{ ...DEFAULT_CONFIG, aiMode: 'conservative' }}
        state={DEFAULT_BOT_STATE}
        updateConfig={() => {}}
      />,
    );
    expect(screen.getByText('Conservador').className).toMatch(/bg-indigo-600/);
    expect(screen.getByText('Agressivo').className).not.toMatch(/bg-indigo-600/);

    rerender(
      <MarketGrid
        config={{ ...DEFAULT_CONFIG, aiMode: 'aggressive' }}
        state={DEFAULT_BOT_STATE}
        updateConfig={() => {}}
      />,
    );
    expect(screen.getByText('Agressivo').className).toMatch(/bg-indigo-600/);
    expect(screen.getByText('Conservador').className).not.toMatch(/bg-indigo-600/);
  });

  it('exibe traço (—) para perdas nos mercados fora de foco quando Contagem sob Foco está ativo', () => {
    const stateWithData = {
      ...DEFAULT_BOT_STATE,
      tickData: {
        ...DEFAULT_BOT_STATE.tickData,
        R_100: { digits: [7, 7], price: 100.5 },
        R_50: { digits: [4, 4, 4], price: 50.2 },
      },
      vlBySym: {
        R_100: { count: 2, seen: 2 },
        R_50: { count: 3, seen: 3 },
      }
    };

    render(
      <MarketGrid
        config={{
          ...DEFAULT_CONFIG,
          activeSym: 'R_100',
          mode: 'differ',
          vlOn: true,
          multiOn: true,
          vlFocusOnly: true,
          vlQty: 3,
          differAutoDigit: true,
        }}
        state={stateWithData}
        updateConfig={() => {}}
      />,
    );

    // O mercado em foco R_100 deve exibir "Dígito 7: 2/3"
    expect(screen.getByText(/Dígito 7: 2\/3/)).toBeInTheDocument();

    // Os mercados secundários fora de foco devem exibir traço "—"
    const dashElements = screen.getAllByText('—');
    expect(dashElements.length).toBeGreaterThan(1);
  });

  it('exibe com precisão o dígito fornecido por autoDigitBySym mesmo quando o último tick for diferente', () => {
    const stateWithData = {
      ...DEFAULT_BOT_STATE,
      tickData: {
        ...DEFAULT_BOT_STATE.tickData,
        // Último dígito é 4, mas o acumulado sob contagem é 8
        R_100: { digits: [8, 8, 4], price: 100.5 },
      },
      vlBySym: {
        R_100: { count: 2, seen: 3 },
      },
      autoDigitBySym: {
        R_100: 8,
      }
    };

    render(
      <MarketGrid
        config={{
          ...DEFAULT_CONFIG,
          activeSym: 'R_100',
          mode: 'differ',
          vlOn: true,
          multiOn: true,
          vlFocusOnly: true,
          vlMode: 'accum',
          vlQty: 3,
          vlWindow: 10,
          differAutoDigit: true,
        }}
        state={stateWithData}
        updateConfig={() => {}}
      />,
    );

    // O mercado em foco R_100 deve exibir "Dígito 8: 2/3 (janela 3/10)"
    expect(screen.getByText(/Dígito 8: 2\/3/)).toBeInTheDocument();
  });
});
