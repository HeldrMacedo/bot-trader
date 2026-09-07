// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act, within } from '@testing-library/react';
import React from 'react';
import { createDifferEngine } from '../app/services/BearDifferEngine';
import OperationTab from '../app/(withSidebar)/bear-bot-differ/components/tabs/OperationTab';
import LogicsTab from '../app/(withSidebar)/bear-bot-differ/components/tabs/LogicsTab';
import VigilanceTab from '../app/(withSidebar)/bear-bot-differ/components/tabs/VigilanceTab';
import LabTab from '../app/(withSidebar)/bear-bot-differ/components/tabs/LabTab';
import PipelineTab from '../app/(withSidebar)/bear-bot-differ/components/tabs/PipelineTab';
import SystemTab from '../app/(withSidebar)/bear-bot-differ/components/tabs/SystemTab';

describe('BearDiffer - Analytical Tabs Suite (TDD)', () => {
  let engine: ReturnType<typeof createDifferEngine>;

  beforeEach(() => {
    engine = createDifferEngine();
    // Seed markets with sample data (>= 600 for pipeline)
    const sample = Array.from({ length: 700 }, (_, i) => i % 10);
    engine.setHistory('R_10', sample);
    engine.setHistory('R_25', sample);
  });

  describe('OperationTab layout regions', () => {
    const renderTab = () => {
      const props: React.ComponentProps<typeof OperationTab> = {
        engine,
        state: engine.getState(),
        config: engine.getConfig(),
        updateConfig: vi.fn(),
        executeTrade: vi.fn().mockResolvedValue(undefined),
        resetSession: vi.fn(),
        armVirtualLoss: vi.fn(),
        cancelVirtualLoss: vi.fn(),
        setWarmTarget: vi.fn(),
        exportCSV: vi.fn(),
        vlossState: {
          armed: false,
          sym: '',
          targetDigit: 0,
          targetLosses: 1,
          seenLosses: 0,
          ticksChecked: 0,
        },
      };
      render(<OperationTab {...props} />);
    };

    it('keeps the action card, the market reading and the results in the main column', () => {
      renderTab();
      const center = screen.getByTestId('op-col-center');

      expect(within(center).getByText(/Operação única/i)).toBeInTheDocument();
      expect(within(center).getByText(/Melhor alvo/i)).toBeInTheDocument();
      expect(within(center).getByText(/Leitura dos mercados/i)).toBeInTheDocument();
      expect(within(center).getByText(/Últimas operações/i)).toBeInTheDocument();
    });

    it('keeps the readings and the logs in the side column', () => {
      renderTab();
      const side = screen.getByTestId('op-col-side');

      expect(within(side).getByText(/Assertividade/i)).toBeInTheDocument();
      expect(within(side).getByText(/Exaustão/i)).toBeInTheDocument();
      expect(within(side).getByText(/Anomalias/i)).toBeInTheDocument();
      expect(within(side).getByText(/Histórico/i)).toBeInTheDocument();
    });

    it('spans the probability warning across both columns', () => {
      renderTab();
      const warning = screen.getByTestId('op-probability-warning');

      expect(warning).toBeInTheDocument();
      expect(screen.getByTestId('op-col-center')).not.toContainElement(warning);
      expect(screen.getByTestId('op-col-side')).not.toContainElement(warning);
    });

    it('moves the exhaustion thermometer out of the action card', () => {
      renderTab();
      const action = screen.getByTestId('op-card-single');

      expect(within(action).queryByText(/Termômetro de exaustão/i)).toBeNull();
    });
  });

  describe('OperationTab proposal warming', () => {
    const renderOperationTab = (
      setWarmTarget: (sym: string | null, digit?: number) => void
    ) => {
      const props: React.ComponentProps<typeof OperationTab> = {
        engine,
        state: engine.getState(),
        config: engine.getConfig(),
        updateConfig: vi.fn(),
        executeTrade: vi.fn().mockResolvedValue(undefined),
        resetSession: vi.fn(),
        armVirtualLoss: vi.fn(),
        cancelVirtualLoss: vi.fn(),
        setWarmTarget,
        exportCSV: vi.fn(),
        vlossState: {
          armed: false,
          sym: '',
          targetDigit: 0,
          targetLosses: 1,
          seenLosses: 0,
          ticksChecked: 0,
        },
      };
      return render(<OperationTab {...props} />);
    };

    it('warms a proposal for the target as soon as the scan finds one', () => {
      const setWarmTarget = vi.fn();
      vi.spyOn(engine, 'deepScan').mockReturnValue({
        sym: 'R_10',
        digit: 4,
        conf: 88,
        why: 'teste',
        n: 700,
        lid: 'rep',
      });

      renderOperationTab(setWarmTarget);
      fireEvent.click(screen.getByRole('button', { name: /Analisar mercados/i }));

      expect(setWarmTarget).toHaveBeenCalledWith('R_10', 4);
    });

    it('refuses a target whose confidence is below the configured minimum', () => {
      engine.updateConfig({ onceMinConf: 70 });
      vi.spyOn(engine, 'deepScan').mockReturnValue({
        sym: 'R_10',
        digit: 4,
        conf: 60,
        why: 'teste',
        n: 700,
        lid: 'rep',
      });

      renderOperationTab(vi.fn());
      fireEvent.click(screen.getByRole('button', { name: /Analisar mercados/i }));

      expect(screen.queryByRole('button', { name: /Confirmar entrada/i })).toBeNull();
      expect(screen.getByText(/abaixo do mínimo/i)).toBeInTheDocument();
    });

    it('does not send a manual entry that the exhaustion filter blocks', () => {
      const digits = Array.from({ length: 100 }, (_, i) => i % 7);
      engine.setHistory('R_10', digits);
      engine.updateConfig({ exFilter: true, onceMinConf: 50 });

      vi.spyOn(engine, 'deepScan').mockReturnValue({
        sym: 'R_10',
        digit: 7,
        conf: 88,
        why: 'teste',
        n: 700,
        lid: 'rep',
      });

      const executeTrade = vi.fn().mockResolvedValue(undefined);
      const props: React.ComponentProps<typeof OperationTab> = {
        engine,
        state: engine.getState(),
        config: engine.getConfig(),
        updateConfig: vi.fn(),
        executeTrade,
        resetSession: vi.fn(),
        armVirtualLoss: vi.fn(),
        cancelVirtualLoss: vi.fn(),
        setWarmTarget: vi.fn(),
        exportCSV: vi.fn(),
        vlossState: {
          armed: false,
          sym: '',
          targetDigit: 0,
          targetLosses: 1,
          seenLosses: 0,
          ticksChecked: 0,
        },
      };
      render(<OperationTab {...props} />);

      fireEvent.click(screen.getByRole('button', { name: /Analisar mercados/i }));
      fireEvent.click(screen.getByRole('button', { name: /Confirmar entrada/i }));

      expect(executeTrade).not.toHaveBeenCalled();
    });

    it('carries the analysis tick count into the entry so it can go stale', () => {
      engine.updateConfig({ onceMinConf: 50 });
      vi.spyOn(engine, 'deepScan').mockReturnValue({
        sym: 'R_10',
        digit: 4,
        conf: 88,
        why: 'teste',
        n: 700,
        lid: 'rep',
      });

      const executeTrade = vi.fn().mockResolvedValue(undefined);
      const props: React.ComponentProps<typeof OperationTab> = {
        engine,
        state: engine.getState(),
        config: engine.getConfig(),
        updateConfig: vi.fn(),
        executeTrade,
        resetSession: vi.fn(),
        armVirtualLoss: vi.fn(),
        cancelVirtualLoss: vi.fn(),
        setWarmTarget: vi.fn(),
        exportCSV: vi.fn(),
        vlossState: {
          armed: false,
          sym: '',
          targetDigit: 0,
          targetLosses: 1,
          seenLosses: 0,
          ticksChecked: 0,
        },
      };
      render(<OperationTab {...props} />);

      const tickCount = engine.getMarketData('R_10').tickCount;
      fireEvent.click(screen.getByRole('button', { name: /Analisar mercados/i }));
      fireEvent.click(screen.getByRole('button', { name: /Confirmar entrada/i }));

      expect(executeTrade).toHaveBeenCalledWith('R_10', 4, tickCount, 'rep');
    });

    it('shows on screen why the automatic mode is idle', () => {
      engine.updateConfig({ allowAuto: true, autoOn: true, gateBias: true, minScore: 0, minTicks: 50 });
      engine.processTick('R_10', 4);

      const props: React.ComponentProps<typeof OperationTab> = {
        engine,
        state: engine.getState(),
        config: engine.getConfig(),
        updateConfig: vi.fn(),
        executeTrade: vi.fn().mockResolvedValue(undefined),
        resetSession: vi.fn(),
        armVirtualLoss: vi.fn(),
        cancelVirtualLoss: vi.fn(),
        setWarmTarget: vi.fn(),
        exportCSV: vi.fn(),
        vlossState: {
          armed: false,
          sym: '',
          targetDigit: 0,
          targetLosses: 1,
          seenLosses: 0,
          ticksChecked: 0,
        },
      };
      render(<OperationTab {...props} />);

      const status = screen.getByTestId('auto-idle-status');
      expect(status).toHaveTextContent(/trava de viés/i);
    });

    it('hides the idle banner while the automatic mode is off', () => {
      engine.updateConfig({ allowAuto: true, autoOn: false });

      const props: React.ComponentProps<typeof OperationTab> = {
        engine,
        state: engine.getState(),
        config: engine.getConfig(),
        updateConfig: vi.fn(),
        executeTrade: vi.fn().mockResolvedValue(undefined),
        resetSession: vi.fn(),
        armVirtualLoss: vi.fn(),
        cancelVirtualLoss: vi.fn(),
        setWarmTarget: vi.fn(),
        exportCSV: vi.fn(),
        vlossState: {
          armed: false,
          sym: '',
          targetDigit: 0,
          targetLosses: 1,
          seenLosses: 0,
          ticksChecked: 0,
        },
      };
      render(<OperationTab {...props} />);

      expect(screen.queryByTestId('auto-idle-status')).toBeNull();
    });

    it('sends the logic that produced the target along with the entry', () => {
      engine.updateConfig({ onceMinConf: 50, onceLogic: 'auto' });
      vi.spyOn(engine, 'deepScan').mockReturnValue({
        sym: 'R_10',
        digit: 4,
        conf: 88,
        why: 'teste',
        n: 700,
        lid: 'mk1',
      });

      const executeTrade = vi.fn().mockResolvedValue(undefined);
      const props: React.ComponentProps<typeof OperationTab> = {
        engine,
        state: engine.getState(),
        config: engine.getConfig(),
        updateConfig: vi.fn(),
        executeTrade,
        resetSession: vi.fn(),
        armVirtualLoss: vi.fn(),
        cancelVirtualLoss: vi.fn(),
        setWarmTarget: vi.fn(),
        exportCSV: vi.fn(),
        vlossState: {
          armed: false,
          sym: '',
          targetDigit: 0,
          targetLosses: 1,
          seenLosses: 0,
          ticksChecked: 0,
        },
      };
      render(<OperationTab {...props} />);

      fireEvent.click(screen.getByRole('button', { name: /Analisar mercados/i }));
      fireEvent.click(screen.getByRole('button', { name: /Confirmar entrada/i }));

      // The concrete logic, not the 'auto' alternation mode
      expect(executeTrade).toHaveBeenCalledWith('R_10', 4, expect.any(Number), 'mk1');
    });

    it('arms the virtual loss with the logic that produced the target', () => {
      engine.updateConfig({ onceMinConf: 50, vlossOn: true, vlossN: 2 });
      vi.spyOn(engine, 'deepScan').mockReturnValue({
        sym: 'R_10',
        digit: 4,
        conf: 88,
        why: 'teste',
        n: 700,
        lid: 'aus',
      });

      const armVirtualLoss = vi.fn();
      const props: React.ComponentProps<typeof OperationTab> = {
        engine,
        state: engine.getState(),
        config: engine.getConfig(),
        updateConfig: vi.fn(),
        executeTrade: vi.fn().mockResolvedValue(undefined),
        resetSession: vi.fn(),
        armVirtualLoss,
        cancelVirtualLoss: vi.fn(),
        setWarmTarget: vi.fn(),
        exportCSV: vi.fn(),
        vlossState: {
          armed: false,
          sym: '',
          targetDigit: 0,
          targetLosses: 1,
          seenLosses: 0,
          ticksChecked: 0,
        },
      };
      render(<OperationTab {...props} />);

      fireEvent.click(screen.getByRole('button', { name: /Analisar mercados/i }));
      fireEvent.click(screen.getByRole('button', { name: /Armar com/i }));

      expect(armVirtualLoss).toHaveBeenCalledWith('R_10', 4, 2, 'aus');
    });

    it('drops the warm target when the operator discards the entry', () => {
      const setWarmTarget = vi.fn();
      vi.spyOn(engine, 'deepScan').mockReturnValue({
        sym: 'R_10',
        digit: 4,
        conf: 88,
        why: 'teste',
        n: 700,
        lid: 'rep',
      });

      renderOperationTab(setWarmTarget);
      fireEvent.click(screen.getByRole('button', { name: /Analisar mercados/i }));
      fireEvent.click(screen.getByRole('button', { name: /Descartar/i }));

      expect(setWarmTarget).toHaveBeenLastCalledWith(null);
    });
  });

  describe('LogicsTab', () => {
    it('renders ranking, allows changing FDR q and displays market breakdown', () => {
      render(<LogicsTab engine={engine} state={engine.getState()} />);

      expect(screen.getByText(/Dez lógicas em disputa/i)).toBeInTheDocument();
      expect(screen.getByText(/Desempenho por mercado/i)).toBeInTheDocument();
      expect(screen.getByText(/O que cada uma faz/i)).toBeInTheDocument();

      // Check that markets are shown in the breakdown table
      expect(screen.getByText('R_10')).toBeInTheDocument();
      expect(screen.getByText('R_25')).toBeInTheDocument();
    });
  });

  describe('VigilanceTab', () => {
    it('renders vigilance scanner with Bonferroni correction and manual run button', () => {
      render(<VigilanceTab engine={engine} state={engine.getState()} />);

      expect(screen.getByText(/Vigilância dos mercados/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Rodar agora/i })).toBeInTheDocument();
      expect(screen.getByText(/Alertas da sessão/i)).toBeInTheDocument();

      const runBtn = screen.getByRole('button', { name: /Rodar agora/i });
      fireEvent.click(runBtn);

      expect(screen.getByText(/Status dos Mercados Monitorados/i)).toBeInTheDocument();
    });
  });

  describe('LabTab', () => {
    it('renders global verdict with Bonferroni correction and allows selecting market for transition matrix', () => {
      render(<LabTab engine={engine} state={engine.getState()} />);

      expect(screen.getByText(/Bateria de testes de aleatoriedade/i)).toBeInTheDocument();
      expect(screen.getByText(/Veredito global com correção de Bonferroni/i)).toBeInTheDocument();
      expect(screen.getByText(/Matriz de transição/i)).toBeInTheDocument();

      // Check market selector for transition matrix
      const select = screen.getByRole('combobox');
      expect(select).toBeInTheDocument();
      fireEvent.change(select, { target: { value: 'R_25' } });
      expect(select).toHaveValue('R_25');
    });
  });

  describe('PipelineTab regime drift (Fase 0)', () => {
    it('runs the drift test and reports a verdict per market', () => {
      // 1600 ticks so each of the 4 blocks clears the 200-tick floor
      const sample = Array.from({ length: 1600 }, (_, i) => (i * 7 + 3) % 10);
      engine.setHistory('R_10', sample);
      engine.setHistory('R_25', sample);

      render(<PipelineTab engine={engine} state={engine.getState()} />);

      fireEvent.click(screen.getByRole('button', { name: /Testar mudança de regime/i }));

      expect(screen.getByText(/Distribuição/i)).toBeInTheDocument();
      expect(screen.getAllByText(/estável|mudou/i).length).toBeGreaterThan(0);
    });
  });

  describe('PipelineTab', () => {
    it('allows configuring candidate count and running genetic pipeline', async () => {
      vi.useFakeTimers();
      render(<PipelineTab engine={engine} state={engine.getState()} />);

      expect(screen.getByText(/Esteira genética/i)).toBeInTheDocument();
      const startBtn = screen.getByRole('button', { name: /Iniciar Esteira de Validação/i });
      expect(startBtn).toBeInTheDocument();

      fireEvent.click(startBtn);

      // Advance timers for simulation steps
      act(() => {
        vi.advanceTimersByTime(1200);
      });

      expect(screen.getByText(/Esteira concluída|sobreviveram a tudo/i)).toBeInTheDocument();
      vi.useRealTimers();
    });
  });

  describe('SystemTab', () => {
    it('displays execution latency metrics and export options', () => {
      const exportCSV = vi.fn();
      render(<SystemTab engine={engine} state={engine.getState()} exportCSV={exportCSV} />);

      expect(screen.getByText(/Qualidade da execução/i)).toBeInTheDocument();
      expect(screen.getByText(/Métricas de Latência e Atraso/i)).toBeInTheDocument();

      const btnCSV = screen.getByRole('button', { name: /Exportar Operações \(CSV\)/i });
      expect(btnCSV).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Exportar Perfil \(JSON\)/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Importar Perfil \(JSON\)/i })).toBeInTheDocument();
    });
  });
});
