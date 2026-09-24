// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import MarketGrid from '../app/(withSidebar)/bear-bot-ultra-2/components/MarketGrid';
import { DEFAULT_CONFIG, DEFAULT_BOT_STATE, AI_MODE_WEIGHTS } from '../app/services/bearbot2.types';

/**
 * O painel de pesos do modo Personalizado precisa explicar sozinho como usar os
 * campos: um tooltip no título com a regra geral (normalização, soma zero) e um
 * por pilar descrevendo o que aquele peso move no Score de Oportunidade.
 */

function renderCustom() {
  render(
    <MarketGrid
      config={{ ...DEFAULT_CONFIG, aiMode: 'custom', aiWeights: { ...AI_MODE_WEIGHTS.balanced } }}
      state={DEFAULT_BOT_STATE}
      updateConfig={() => {}}
    />,
  );
}

function tipTextOf(label: string) {
  const trigger = screen.getByRole('button', { name: `Como funciona: ${label}` });
  const tipId = trigger.getAttribute('aria-describedby');
  expect(tipId).toBeTruthy();
  const tip = document.getElementById(tipId!);
  expect(tip).not.toBeNull();
  return tip!.textContent || '';
}

const PILLAR_LABELS = ['Pressão', 'Padrão A→B', 'Loss Virtual', 'Sincronia'];

describe('tooltips dos pesos dos pilares', () => {
  it('explica no título como os pesos são usados', () => {
    renderCustom();
    const text = tipTextOf('Pesos dos pilares');
    expect(text).toMatch(/normaliza/i);
    expect(text.length).toBeGreaterThan(80);
  });

  it('mostra um gatilho de ajuda por pilar', () => {
    renderCustom();
    for (const label of PILLAR_LABELS) {
      const trigger = screen.getByRole('button', { name: `Como funciona: ${label}` });
      expect(trigger.textContent).toBe('?');
    }
  });

  it('descreve a influência de cada peso no score', () => {
    renderCustom();
    for (const label of PILLAR_LABELS) {
      expect(tipTextOf(label).length).toBeGreaterThan(60);
    }
    expect(tipTextOf('Pressão')).toMatch(/pressão/i);
    expect(tipTextOf('Padrão A→B')).toMatch(/armado/i);
    expect(tipTextOf('Loss Virtual')).toMatch(/desligad/i);
    expect(tipTextOf('Sincronia')).toMatch(/mercados/i);
  });

  it('não mostra os tooltips de peso fora do modo Personalizado', () => {
    render(
      <MarketGrid
        config={{ ...DEFAULT_CONFIG, aiMode: 'balanced' }}
        state={DEFAULT_BOT_STATE}
        updateConfig={() => {}}
      />,
    );
    expect(screen.queryByRole('button', { name: 'Como funciona: Pesos dos pilares' })).toBeNull();
  });
});
