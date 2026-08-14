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
});
