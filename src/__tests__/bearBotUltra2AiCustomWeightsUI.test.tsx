// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import MarketGrid from '../app/(withSidebar)/bear-bot-ultra-2/components/MarketGrid';
import { DEFAULT_CONFIG, DEFAULT_BOT_STATE, AI_MODE_WEIGHTS, MARKETS, BotConfig, MarketIntelligence } from '../app/services/bearbot2.types';

/**
 * UI do modo IA "Personalizado" no painel IA Cross-Market.
 */

function renderGrid(overrides: Partial<BotConfig> = {}) {
  const updateConfig = vi.fn();
  const config: BotConfig = { ...DEFAULT_CONFIG, ...overrides };
  render(<MarketGrid config={config} state={{ ...DEFAULT_BOT_STATE }} updateConfig={updateConfig} />);
  return { updateConfig, config };
}

describe('MarketGrid — modo IA Personalizado', () => {
  beforeEach(() => vi.clearAllMocks());

  it('oferece o quarto modo ao lado dos presets', () => {
    renderGrid();
    expect(screen.getByTestId('ai-mode-conservative')).toBeTruthy();
    expect(screen.getByTestId('ai-mode-balanced')).toBeTruthy();
    expect(screen.getByTestId('ai-mode-aggressive')).toBeTruthy();
    expect(screen.getByTestId('ai-mode-custom')).toBeTruthy();
  });

  it('mantém os pesos escondidos enquanto um preset estiver ativo', () => {
    renderGrid({ aiMode: 'balanced' });
    expect(screen.queryByTestId('ai-weight-pressure')).toBeNull();
  });

  it('semeia o personalizado com os pesos do preset ativo, sem saltar o score', () => {
    const { updateConfig } = renderGrid({ aiMode: 'aggressive', aiWeights: { ...AI_MODE_WEIGHTS.aggressive } });
    fireEvent.click(screen.getByTestId('ai-mode-custom'));
    expect(updateConfig).toHaveBeenCalledWith({ aiMode: 'custom', aiWeights: AI_MODE_WEIGHTS.aggressive });
  });

  it('mostra os quatro pesos em porcentagem quando personalizado', () => {
    renderGrid({ aiMode: 'custom', aiWeights: { ...AI_MODE_WEIGHTS.balanced } });
    expect((screen.getByTestId('ai-weight-pressure') as HTMLInputElement).value).toBe('35');
    expect((screen.getByTestId('ai-weight-pattern') as HTMLInputElement).value).toBe('25');
    expect((screen.getByTestId('ai-weight-vl') as HTMLInputElement).value).toBe('25');
    expect((screen.getByTestId('ai-weight-sync') as HTMLInputElement).value).toBe('15');
  });

  it('exibe a soma corrente dos pesos', () => {
    renderGrid({ aiMode: 'custom', aiWeights: { pressure: 0.5, pattern: 0.25, vl: 0.25, sync: 0.5 } });
    expect(screen.getByTestId('ai-weight-sum').textContent).toContain('150');
  });

  it('grava o peso editado como fração', () => {
    const { updateConfig } = renderGrid({ aiMode: 'custom', aiWeights: { ...AI_MODE_WEIGHTS.balanced } });
    fireEvent.change(screen.getByTestId('ai-weight-pressure'), { target: { value: '60' } });
    expect(updateConfig).toHaveBeenCalledWith({
      aiWeights: { pressure: 0.6, pattern: 0.25, vl: 0.25, sync: 0.15 },
    });
  });

  it('limita cada peso a 0..100', () => {
    const { updateConfig } = renderGrid({ aiMode: 'custom', aiWeights: { ...AI_MODE_WEIGHTS.balanced } });
    fireEvent.change(screen.getByTestId('ai-weight-sync'), { target: { value: '250' } });
    expect(updateConfig).toHaveBeenLastCalledWith({
      aiWeights: { pressure: 0.35, pattern: 0.25, vl: 0.25, sync: 1 },
    });
    fireEvent.change(screen.getByTestId('ai-weight-vl'), { target: { value: '-30' } });
    expect(updateConfig).toHaveBeenLastCalledWith({
      aiWeights: { pressure: 0.35, pattern: 0.25, vl: 0, sync: 0.15 },
    });
  });

  it('trata campo vazio como peso zero em vez de NaN', () => {
    const { updateConfig } = renderGrid({ aiMode: 'custom', aiWeights: { ...AI_MODE_WEIGHTS.balanced } });
    fireEvent.change(screen.getByTestId('ai-weight-pattern'), { target: { value: '' } });
    expect(updateConfig).toHaveBeenLastCalledWith({
      aiWeights: { pressure: 0.35, pattern: 0, vl: 0.25, sync: 0.15 },
    });
  });

  it('volta ao padrão num clique: o preset reescreve os pesos', () => {
    const { updateConfig } = renderGrid({ aiMode: 'custom', aiWeights: { pressure: 1, pattern: 0, vl: 0, sync: 0 } });
    fireEvent.click(screen.getByTestId('ai-mode-balanced'));
    expect(updateConfig).toHaveBeenCalledWith({ aiMode: 'balanced', aiWeights: AI_MODE_WEIGHTS.balanced });
  });

  it('avisa que a soma zero cai para o equilibrado', () => {
    renderGrid({ aiMode: 'custom', aiWeights: { pressure: 0, pattern: 0, vl: 0, sync: 0 } });
    expect(screen.getByTestId('ai-weight-sum').textContent).toMatch(/equilibrado/i);
  });
});

function intelAt(sym: string, score: number, recommendation: MarketIntelligence['recommendation'], dataReady = true): MarketIntelligence {
  return {
    sym, pressure: 100 - score, patternStrength: score, vlProgress: score, syncScore: score,
    opportunityScore: score, recommendation, dataReady, lastUpdate: Date.now(),
  };
}

describe('MarketGrid — faixas de score e recomendação', () => {
  it('rotula e colore as cinco faixas, e sinaliza mercado ainda coletando', () => {
    const bands: [number, MarketIntelligence['recommendation'], RegExp][] = [
      [90, 'strong_buy', /COMPRA FORTE/],
      [70, 'buy', /✓ COMPRA/],
      [50, 'neutral', /NEUTRO/],
      [30, 'avoid', /✕ EVITAR/],
      [10, 'strong_avoid', /EVITAR FORTE/],
    ];
    const marketIntel: Record<string, MarketIntelligence> = {};
    bands.forEach(([score, rec], i) => {
      marketIntel[MARKETS[i].sym] = intelAt(MARKETS[i].sym, score, rec);
    });
    // Um mercado sem histórico suficiente: nenhum score deve aparecer para ele.
    marketIntel[MARKETS[5].sym] = intelAt(MARKETS[5].sym, 88, 'strong_buy', false);

    render(
      <MarketGrid
        config={{ ...DEFAULT_CONFIG }}
        state={{ ...DEFAULT_BOT_STATE, marketIntel }}
        updateConfig={vi.fn()}
      />,
    );

    bands.forEach(([, , label]) => {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    });
    expect(screen.getAllByText('Coletando').length).toBeGreaterThan(0);
    expect(screen.getAllByText('AGUARDANDO HISTÓRICO', { exact: false }).length).toBeGreaterThan(0);
    expect(screen.queryByText('88')).toBeNull();
  });

  it('cai no rótulo neutro para uma recomendação desconhecida', () => {
    const marketIntel: Record<string, MarketIntelligence> = {
      [MARKETS[0].sym]: intelAt(MARKETS[0].sym, 55, 'inesperado' as any),
    };
    render(
      <MarketGrid
        config={{ ...DEFAULT_CONFIG }}
        state={{ ...DEFAULT_BOT_STATE, marketIntel }}
        updateConfig={vi.fn()}
      />,
    );
    expect(screen.getAllByText(/NEUTRO/).length).toBeGreaterThan(0);
  });

  it('seleciona o mercado clicado', () => {
    const updateConfig = vi.fn();
    render(
      <MarketGrid config={{ ...DEFAULT_CONFIG }} state={{ ...DEFAULT_BOT_STATE }} updateConfig={updateConfig} />,
    );
    fireEvent.click(screen.getByText(MARKETS[1].nm));
    expect(updateConfig).toHaveBeenCalledWith({ activeSym: MARKETS[1].sym });
  });
});
