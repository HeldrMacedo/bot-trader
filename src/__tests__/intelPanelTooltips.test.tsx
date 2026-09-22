// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import IntelPanel from '../app/(withSidebar)/bear-bot-ultra-2/components/IntelPanel';
import { DEFAULT_CONFIG, DEFAULT_BOT_STATE, MARKETS } from '../app/services/bearbot2.types';
import type { BotState, MarketIntelligence } from '../app/services/bearbot2.types';

function buildState(): BotState {
  const marketIntel: Record<string, MarketIntelligence> = {};
  const tickData: BotState['tickData'] = {};
  MARKETS.forEach(m => {
    marketIntel[m.sym] = {
      sym: m.sym,
      pressure: 20,
      patternStrength: 70,
      vlProgress: 80,
      syncScore: 60,
      opportunityScore: 77,
      recommendation: 'buy',
      dataReady: true,
      lastUpdate: Date.now(),
    };
    tickData[m.sym] = { digits: Array.from({ length: 60 }, (_, i) => i % 10), price: 100.5 };
  });
  return { ...DEFAULT_BOT_STATE, marketIntel, tickData };
}

const PILLARS = [
  'Pressão de Perdedores',
  'Força do Padrão A→B',
  'Progresso Loss Virtual',
  'Sincronia Cross-Market',
];

describe('IntelPanel pillar help tooltips', () => {
  it('renders one help trigger per pillar', () => {
    render(<IntelPanel config={DEFAULT_CONFIG} state={buildState()} />);

    for (const label of PILLARS) {
      const trigger = screen.getByRole('button', { name: `Como funciona: ${label}` });
      expect(trigger.textContent).toBe('?');
    }
  });

  it('describes each pillar with a tooltip tied to its trigger', () => {
    render(<IntelPanel config={DEFAULT_CONFIG} state={buildState()} />);

    for (const label of PILLARS) {
      const trigger = screen.getByRole('button', { name: `Como funciona: ${label}` });
      const tipId = trigger.getAttribute('aria-describedby');
      expect(tipId).toBeTruthy();
      const tip = document.getElementById(tipId!);
      expect(tip).not.toBeNull();
      expect(tip!.textContent!.length).toBeGreaterThan(40);
    }
  });

  it('explains the measurement behind each pillar', () => {
    render(<IntelPanel config={DEFAULT_CONFIG} state={buildState()} />);

    const tipFor = (label: string) => {
      const trigger = screen.getByRole('button', { name: `Como funciona: ${label}` });
      return document.getElementById(trigger.getAttribute('aria-describedby')!)!.textContent!;
    };

    expect(tipFor('Pressão de Perdedores')).toMatch(/50 ticks/);
    expect(tipFor('Força do Padrão A→B')).toMatch(/armad/i);
    expect(tipFor('Progresso Loss Virtual')).toMatch(/perdas virtuais/i);
    expect(tipFor('Sincronia Cross-Market')).toMatch(/60s|60 s|60 segundos/);
  });
});
