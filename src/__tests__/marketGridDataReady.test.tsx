// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import MarketGrid from '../app/(withSidebar)/bear-bot-ultra-2/components/MarketGrid';
import { DEFAULT_CONFIG, DEFAULT_BOT_STATE, MARKETS } from '../app/services/bearbot2.types';
import type { BotState, MarketIntelligence } from '../app/services/bearbot2.types';

function intel(sym: string, dataReady: boolean): MarketIntelligence {
  return {
    sym,
    pressure: dataReady ? 20 : 50,
    patternStrength: 70,
    vlProgress: 80,
    syncScore: 60,
    opportunityScore: 77,
    recommendation: 'buy',
    dataReady,
    lastUpdate: Date.now(),
  };
}

function buildState(dataReady: boolean): BotState {
  const marketIntel: Record<string, MarketIntelligence> = {};
  const tickData: BotState['tickData'] = {};
  MARKETS.forEach(m => {
    marketIntel[m.sym] = intel(m.sym, dataReady);
    tickData[m.sym] = { digits: [1, 2, 3, 4, 5, 6, 7, 8], price: 100.5 };
  });
  return { ...DEFAULT_BOT_STATE, marketIntel, tickData };
}

function card(sym: string) {
  const name = MARKETS.find(m => m.sym === sym)!.nm;
  return screen.getByText(name).closest('div[class*="cursor-pointer"]') as HTMLElement;
}

describe('MarketGrid while intelligence is still collecting', () => {
  it('shows "Coletando" instead of a score when dataReady is false', () => {
    render(<MarketGrid config={DEFAULT_CONFIG} state={buildState(false)} updateConfig={() => {}} />);

    const c = within(card('R_100'));
    expect(c.getByText('Coletando')).toBeDefined();
    expect(c.queryByText('77')).toBeNull();
  });

  it('hides the recommendation and the pillar metrics while collecting', () => {
    render(<MarketGrid config={DEFAULT_CONFIG} state={buildState(false)} updateConfig={() => {}} />);

    const c = within(card('R_100'));
    expect(c.queryByText('✓ COMPRA')).toBeNull();
    expect(c.queryByText('Pressão:')).toBeNull();
    expect(c.queryByText('Padrão:')).toBeNull();
    expect(c.queryByText('Sync:')).toBeNull();
  });

  it('still shows the last price while collecting', () => {
    render(<MarketGrid config={DEFAULT_CONFIG} state={buildState(false)} updateConfig={() => {}} />);

    expect(within(card('R_100')).getByText('100.50')).toBeDefined();
  });

  it('shows the score, recommendation and pillars once dataReady is true', () => {
    render(<MarketGrid config={DEFAULT_CONFIG} state={buildState(true)} updateConfig={() => {}} />);

    const c = within(card('R_100'));
    expect(c.queryByText('Coletando')).toBeNull();
    expect(c.getByText('77')).toBeDefined();
    expect(c.getByText('✓ COMPRA')).toBeDefined();
    expect(c.getByText('Pressão:')).toBeDefined();
  });
});
