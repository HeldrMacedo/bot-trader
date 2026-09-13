// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { createDifferEngine } from '../app/services/BearDifferEngine';
import { DifferConfig } from '../app/services/beardiffer.types';
import OperationTab from '../app/(withSidebar)/bear-bot-differ/components/tabs/OperationTab';

vi.mock('react-toastify', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

describe('BearDiffer - seletor da fonte do automático', () => {
  let engine: ReturnType<typeof createDifferEngine>;
  let updateConfig: (patch: Partial<DifferConfig>) => void;

  const renderTab = () =>
    render(
      <OperationTab
        engine={engine}
        state={engine.getState()}
        config={engine.getConfig()}
        updateConfig={updateConfig}
        executeTrade={vi.fn()}
        resetSession={vi.fn()}
        armVirtualLoss={vi.fn()}
        cancelVirtualLoss={vi.fn()}
        setWarmTarget={vi.fn()}
        exportCSV={vi.fn()}
        vlossState={{
          armed: false,
          sym: '',
          targetDigit: 0,
          targetLosses: 0,
          seenLosses: 0,
          ticksChecked: 0,
        }}
      />
    );

  beforeEach(() => {
    vi.clearAllMocks();
    engine = createDifferEngine();
    updateConfig = vi.fn((patch: Partial<DifferConfig>) => engine.updateConfig(patch));
  });

  it('não mostra a fonte enquanto o automático não estiver habilitado', () => {
    renderTab();
    expect(screen.queryByTestId('auto-source-select')).toBeNull();
  });

  it('oferece as três fontes com o motor de referência selecionado', () => {
    engine.updateConfig({ allowAuto: true });
    renderTab();

    const select = screen.getByTestId('auto-source-select') as HTMLSelectElement;
    expect(select.value).toBe('motor2');
    expect(
      Array.from(select.options).map((o) => o.value)
    ).toEqual(['motor2', 'logic', 'both']);
  });

  it('troca a fonte para as lógicas medidas', () => {
    engine.updateConfig({ allowAuto: true });
    renderTab();

    fireEvent.change(screen.getByTestId('auto-source-select'), {
      target: { value: 'logic' },
    });

    expect(updateConfig).toHaveBeenCalledWith({ autoSource: 'logic' });
    expect(engine.getConfig().autoSource).toBe('logic');
  });

  it('explica que a lógica do automático é a mesma da operação única', () => {
    engine.updateConfig({ allowAuto: true, autoSource: 'logic' });
    renderTab();

    expect(screen.getByTestId('auto-source-hint').textContent).toMatch(
      /lógica/i
    );
  });
});
