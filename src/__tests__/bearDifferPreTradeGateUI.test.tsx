// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { createDifferEngine } from '../app/services/BearDifferEngine';
import { DifferConfig } from '../app/services/beardiffer.types';
import ConfigSidebar from '../app/(withSidebar)/bear-bot-differ/components/ConfigSidebar';
import OperationTab from '../app/(withSidebar)/bear-bot-differ/components/tabs/OperationTab';

vi.mock('react-toastify', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

const saturated = (n: number, digit: number, every = 3) =>
  Array.from({ length: n }, (_, i) => (i % every === 0 ? digit : i % 10));

describe('BearDiffer - trava de testes na tela', () => {
  let engine: ReturnType<typeof createDifferEngine>;

  beforeEach(() => {
    vi.clearAllMocks();
    engine = createDifferEngine();
  });

  describe('ConfigSidebar', () => {
    const renderSidebar = (over: Partial<DifferConfig> = {}) => {
      const updateConfig = vi.fn();
      engine.updateConfig(over);
      render(
        <ConfigSidebar
          markets={engine.getState().markets}
          config={engine.getConfig()}
          updateConfig={updateConfig}
          onToggleMarket={vi.fn()}
          onAddMarket={vi.fn()}
        />
      );
      return updateConfig;
    };

    it('mostra o checkbox da trava desmarcado por padrão', () => {
      renderSidebar();

      expect(screen.getByTestId('gate-enabled')).not.toBeChecked();
    });

    it('liga a trava pelo checkbox', () => {
      const updateConfig = renderSidebar();

      fireEvent.click(screen.getByTestId('gate-enabled'));

      expect(updateConfig).toHaveBeenCalledWith({ gateEnabled: true });
    });

    it('mantém os campos travados enquanto o checkbox está desmarcado', () => {
      renderSidebar({ gateEnabled: false });

      expect(screen.getByTestId('gate-ops')).toBeDisabled();
      expect(screen.getByTestId('gate-acc')).toBeDisabled();
    });

    it('libera os campos com o checkbox marcado', () => {
      renderSidebar({ gateEnabled: true, opMode: 'sim' });

      expect(screen.getByTestId('gate-ops')).not.toBeDisabled();
      expect(screen.getByTestId('gate-acc')).not.toBeDisabled();
    });

    it('só deixa marcar o checkbox no modo simulação', () => {
      renderSidebar({ opMode: 'real' });

      expect(screen.getByTestId('gate-enabled')).toBeDisabled();
    });

    it('explica para que serve a trava', () => {
      renderSidebar();

      expect(screen.getByTestId('gate-note').textContent).toMatch(/simulad/i);
    });
  });

  describe('card do melhor alvo', () => {
    let executeTrade: ReturnType<typeof vi.fn>;

    const renderTab = () =>
      render(
        <OperationTab
          engine={engine}
          state={engine.getState()}
          config={engine.getConfig()}
          updateConfig={vi.fn()}
          executeTrade={executeTrade as never}
          resetSession={vi.fn()}
          armVirtualLoss={vi.fn() as never}
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

    const seedLiberado = (digit = 7) => {
      ['R_25', 'R_50', 'R_75', 'R_100', 'RDBEAR', 'RDBULL'].forEach((s) =>
        engine.setMarketEnabled(s, false)
      );
      const b = saturated(3000, digit);
      engine.setHistory('R_10', b.slice(0, -1));
      engine.processTick('R_10', b[b.length - 1]);
    };

    beforeEach(() => {
      executeTrade = vi.fn().mockResolvedValue(undefined);
    });

    it('não mostra progresso nenhum com a trava desligada', () => {
      seedLiberado(7);
      renderTab();

      expect(screen.queryByTestId('gate-progress')).toBeNull();
    });

    it('mostra quanto falta da janela da lógica ativa', () => {
      engine.updateConfig({
        gateEnabled: true,
        autoSource: 'motor2',
        gateOps: 4,
        gateAcc: 60,
        maxLoss: 99,
        minAcc: 0,
      });
      seedLiberado(7);
      engine.prepareTrade('R_10', 7, 'motor2');
      engine.settleContract(0.35, false, 'R_10', 7, 3, undefined, 'motor2');
      engine.prepareTrade('R_10', 7, 'motor2');
      engine.settleContract(-0.35, true, 'R_10', 7, 7, undefined, 'motor2');

      renderTab();

      const badge = screen.getByTestId('gate-progress').textContent;
      expect(badge).toMatch(/2\/4/);
      expect(badge).toMatch(/50/);
    });

    it('anuncia a liberação quando a lógica passa', () => {
      engine.updateConfig({
        gateEnabled: true,
        autoSource: 'motor2',
        gateOps: 1,
        gateAcc: 50,
        maxLoss: 99,
        minAcc: 0,
      });
      seedLiberado(7);
      engine.prepareTrade('R_10', 7, 'motor2');
      engine.settleContract(0.35, false, 'R_10', 7, 3, undefined, 'motor2');

      renderTab();

      expect(screen.getByTestId('gate-progress').textContent).toMatch(/liberad/i);
    });
  });
});
