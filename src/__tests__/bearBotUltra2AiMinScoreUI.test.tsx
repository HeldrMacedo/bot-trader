// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import MarketGrid from '../app/(withSidebar)/bear-bot-ultra-2/components/MarketGrid';
import IntelPanel from '../app/(withSidebar)/bear-bot-ultra-2/components/IntelPanel';
import { DEFAULT_CONFIG, DEFAULT_BOT_STATE, BotConfig, BotState, MarketIntelligence } from '../app/services/bearbot2.types';

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

  it('mostra Score igual por padrão e alterna para Score mín. ao marcar', () => {
    const { updateConfig } = renderGrid();
    const toggle = screen.getByTestId('ai-score-at-least') as HTMLInputElement;
    expect(toggle.checked).toBe(false);
    expect(screen.getByText('Score igual:')).toBeInTheDocument();
    fireEvent.click(toggle);
    expect(updateConfig).toHaveBeenCalledWith({ aiScoreAtLeast: true });
  });

  it('mostra Score mín. marcado e permite voltar à igualdade', () => {
    const { updateConfig } = renderGrid({ aiScoreAtLeast: true });
    const toggle = screen.getByTestId('ai-score-at-least') as HTMLInputElement;
    expect(toggle.checked).toBe(true);
    expect(screen.getByText('Score mín.:')).toBeInTheDocument();
    fireEvent.click(toggle);
    expect(updateConfig).toHaveBeenCalledWith({ aiScoreAtLeast: false });
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

  it('ignora o campo vazio em vez de zerar o mínimo e desligar o veto', () => {
    const { updateConfig } = renderGrid();
    fireEvent.change(screen.getByTestId('ai-min-score'), { target: { value: '' } });
    expect(updateConfig).not.toHaveBeenCalled();
  });

  it('limita valores negativos a 0', () => {
    const { updateConfig } = renderGrid();
    fireEvent.change(screen.getByTestId('ai-min-score'), { target: { value: '-5' } });
    expect(updateConfig).toHaveBeenLastCalledWith({ aiMinScore: 0 });
  });
});

describe('IntelPanel — Momento p/ Entrar segue o score mínimo', () => {
  function renderPanel(score: number, aiMinScore: number, aiScoreAtLeast = false) {
    const intel: MarketIntelligence = {
      sym: 'R_100', pressure: 20, patternStrength: 0, vlProgress: 100, syncScore: 0,
      opportunityScore: score, recommendation: 'neutral', dataReady: true, lastUpdate: Date.now(),
    };
    const state: BotState = {
      ...DEFAULT_BOT_STATE,
      marketIntel: { R_100: intel },
      tickData: { R_100: { digits: Array.from({ length: 60 }, (_, i) => i % 10), price: 100.5 } },
    };
    return render(<IntelPanel config={{ ...DEFAULT_CONFIG, activeSym: 'R_100', aiMinScore, aiScoreAtLeast }} state={state} />);
  }

  it('avisa que a IA bloqueia quando o score está abaixo de um mínimo acima de 40', () => {
    renderPanel(50, 60);
    expect(screen.getByText(/IA bloqueia entrada/)).toBeTruthy();
  });

  it('não diz que a IA bloqueia quando o score é igual a um mínimo abaixo de 40', () => {
    renderPanel(20, 20);
    expect(screen.queryByText(/IA bloqueia entrada/)).toBeNull();
  });

  it('avisa que a IA bloqueia quando o score está acima do mínimo', () => {
    renderPanel(65, 60);
    expect(screen.getByText(/IA bloqueia entrada/)).toBeTruthy();
  });

  it('diz que a IA aprova quando o score é igual ao mínimo', () => {
    renderPanel(70, 70);
    expect(screen.getByText(/IA aprova entrada/)).toBeTruthy();
  });

  it('só diz que a IA aprova quando o score atinge o mínimo', () => {
    renderPanel(65, 70);
    expect(screen.queryByText(/IA aprova entrada/)).toBeNull();
  });

  it('com o piso marcado aprova score superior e bloqueia score inferior', () => {
    const { unmount } = renderPanel(70, 60, true);
    expect(screen.getByText(/IA aprova entrada/)).toBeInTheDocument();
    unmount();
    renderPanel(59, 60, true);
    expect(screen.getByText(/IA bloqueia entrada/)).toBeInTheDocument();
  });
});
