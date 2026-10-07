// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import React from 'react';
import DynamicDigitPanel from '../app/(withSidebar)/bear-bot-ultra-2/components/DynamicDigitPanel';
import TradeLogComponent from '../app/(withSidebar)/bear-bot-ultra-2/components/TradeLog';
import { createEngine } from '../app/services/BearBot2Engine';

function panelProps(overrides: { config?: any; state?: any; score?: number } = {}) {
  const engine = createEngine();
  const config = { ...engine.getConfig(), mode: 'differ', differDynamicDigit: true, ...overrides.config };
  const state = { ...engine.getState(), ...overrides.state };
  const breakdown: any = {};
  const scores: any = {};
  for (let d = 0; d < 10; d++) {
    scores[d] = d * 10;
    breakdown[d] = { fScore: 60, mScore: 55, tScore: 70, aScore: 40, composite: d * 10, rawCount50: d };
  }
  return {
    config,
    state,
    dynamicInfo: { digit: 7, score: overrides.score ?? 75, scores, breakdown },
    updateConfig: vi.fn(),
    manualFire: vi.fn(),
    isAuthenticated: true,
  } as any;
}

describe('Bear Bot Ultra 2 — painéis', () => {
  afterEach(cleanup);

  it('radar: entrada manual no dígito líder e inspeção de outro dígito', () => {
    const props = panelProps();
    render(<DynamicDigitPanel {...props} />);

    fireEvent.click(screen.getByText(/Entrar Agora no Dígito 7/));
    expect(props.manualFire).toHaveBeenCalledWith('differ');

    const digit3 = Array.from(document.querySelectorAll('button')).find((b) => b.textContent?.trim().startsWith('3'));
    fireEvent.click(digit3!);
    expect(document.body.textContent).toContain('30');
  });

  it('radar: faixas de score moderado e de risco', () => {
    render(<DynamicDigitPanel {...panelProps({ score: 55 })} />);
    expect(screen.getByText(/MODERADO/)).toBeDefined();
    cleanup();
    render(<DynamicDigitPanel {...panelProps({ score: 20 })} />);
    expect(screen.getByText(/RISCO ELEVADO/)).toBeDefined();
  });

  it('radar: no automático mostra o estado do motor', () => {
    render(<DynamicDigitPanel {...panelProps({ config: { exec: 'auto', autoOn: true } })} />);
    expect(screen.getByText('● PRONTO PARA DISPARO')).toBeDefined();
    cleanup();
    render(<DynamicDigitPanel {...panelProps({ config: { exec: 'auto', autoOn: true }, score: 40 })} />);
    expect(screen.getByText('● MONITORANDO CONDIÇÕES')).toBeDefined();
    cleanup();
    render(<DynamicDigitPanel {...panelProps({ config: { exec: 'auto', autoOn: false } })} />);
    expect(screen.getByText('○ ROBÔ DESLIGADO')).toBeDefined();
  });

  it('radar: no multi-mercado oferece trocar para o líder', () => {
    const props = panelProps({
      config: { multiOn: true, activeSym: 'R_100' },
      state: {
        marketIntel: {
          R_100: { sym: 'R_100', opportunityScore: 40 },
          R_75: { sym: 'R_75', opportunityScore: 88 },
        },
      },
    });
    render(<DynamicDigitPanel {...props} />);

    fireEvent.click(screen.getByText('⭐ Líder Multi:'));

    expect(props.updateConfig).toHaveBeenCalledWith({ activeSym: 'R_75' });
  });

  it('log: cada tipo de linha e lista vazia', () => {
    const base = createEngine().getState();
    const types = ['win', 'lose', 'info', 'virt', 'warn', ''];
    render(
      <TradeLogComponent
        state={{ ...base, logLines: types.map((type, i) => ({ ts: '10:00', msg: `linha-${type || 'x'}`, type })) }}
        onExport={vi.fn()}
        onReset={vi.fn()}
      />
    );
    types.forEach((type) => expect(screen.getByText(`linha-${type || 'x'}`)).toBeDefined());
    cleanup();

    render(<TradeLogComponent state={{ ...base, logLines: [] }} onExport={vi.fn()} onReset={vi.fn()} />);
    expect(screen.getByText('Nenhuma transação efetuada ainda.')).toBeDefined();
  });
});
