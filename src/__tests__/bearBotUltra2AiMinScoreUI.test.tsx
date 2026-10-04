// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import MarketGrid from '../app/(withSidebar)/bear-bot-ultra-2/components/MarketGrid';
import { DEFAULT_CONFIG, DEFAULT_BOT_STATE, BotConfig } from '../app/services/bearbot2.types';

/**
 * Campo do score mínimo do gate da IA no painel IA Cross-Market.
 */

function renderGrid(overrides: Partial<BotConfig> = {}) {
  const updateConfig = vi.fn();
  const config: BotConfig = { ...DEFAULT_CONFIG, ...overrides };
  render(<MarketGrid config={config} state={{ ...DEFAULT_BOT_STATE }} updateConfig={updateConfig} />);
  return { updateConfig };
}

describe('MarketGrid — score mínimo de entrada', () => {
  beforeEach(() => vi.clearAllMocks());

  it('mostra o mínimo atual em qualquer modo de IA', () => {
    renderGrid({ aiMode: 'balanced', aiMinScore: 55 });
    expect((screen.getByTestId('ai-min-score') as HTMLInputElement).value).toBe('55');
  });

  it('grava o mínimo editado como inteiro', () => {
    const { updateConfig } = renderGrid();
    fireEvent.change(screen.getByTestId('ai-min-score'), { target: { value: '65' } });
    expect(updateConfig).toHaveBeenCalledWith({ aiMinScore: 65 });
  });

  it('limita o valor digitado entre 0 e 100', () => {
    const { updateConfig } = renderGrid();
    fireEvent.change(screen.getByTestId('ai-min-score'), { target: { value: '140' } });
    expect(updateConfig).toHaveBeenLastCalledWith({ aiMinScore: 100 });
  });
});
