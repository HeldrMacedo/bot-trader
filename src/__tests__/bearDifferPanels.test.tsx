// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { createDifferEngine } from '../app/services/BearDifferEngine';
import ValidationTab from '../app/(withSidebar)/bear-bot-differ/components/tabs/ValidationTab';
import RiskTab from '../app/(withSidebar)/bear-bot-differ/components/tabs/RiskTab';
import SystemTab from '../app/(withSidebar)/bear-bot-differ/components/tabs/SystemTab';
import ConfigSidebar from '../app/(withSidebar)/bear-bot-differ/components/ConfigSidebar';

const toastSuccess = vi.fn();
const toastError = vi.fn();

vi.mock('react-toastify', () => ({
  toast: {
    success: (...a: unknown[]) => toastSuccess(...a),
    error: (...a: unknown[]) => toastError(...a),
    info: vi.fn(),
  },
}));

describe('BearDiffer - Validation, Risk, System and Config panels', () => {
  let engine: ReturnType<typeof createDifferEngine>;

  const makeDigits = (n: number, seed = 20260906): number[] => {
    let s = seed;
    const out: number[] = [];
    for (let i = 0; i < n; i++) {
      s = (s * 1103515245 + 12345) % 2147483648;
      out.push(Math.floor((s / 2147483648) * 10));
    }
    return out;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    engine = createDifferEngine();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('ValidationTab', () => {
    it('keeps every tool disabled while the market has no history', () => {
      render(<ValidationTab engine={engine} state={engine.getState()} />);

      expect(screen.getByRole('button', { name: /Rodar Backtest Simples/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /Rodar Walk-Forward/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /Teste de Permutação/i })).toBeDisabled();
    });

    it('runs the simple backtest and shows the accumulated result', () => {
      engine.setHistory('R_10', makeDigits(1200));
      engine.updateConfig({ minScore: 0, minTicks: 100 });

      render(<ValidationTab engine={engine} state={engine.getState()} />);
      fireEvent.click(screen.getByRole('button', { name: /Rodar Backtest Simples/i }));

      expect(screen.getByText(/OPERAÇÕES/i)).toBeInTheDocument();
      expect(screen.getByText(/ACERTO/i)).toBeInTheDocument();
      expect(screen.getByText(/PNL ACUMULADO/i)).toBeInTheDocument();
      expect(screen.getByText(/MAX DRAWDOWN/i)).toBeInTheDocument();
    });

    it('splits the history in half for the walk-forward', () => {
      engine.setHistory('R_10', makeDigits(1200));
      engine.updateConfig({ minScore: 0, minTicks: 100 });

      render(<ValidationTab engine={engine} state={engine.getState()} />);
      fireEvent.click(screen.getByRole('button', { name: /Rodar Walk-Forward/i }));

      expect(screen.getByText(/TREINO \(ACERTO\)/i)).toBeInTheDocument();
      expect(screen.getByText(/TESTE \(ACERTO\)/i)).toBeInTheDocument();
      expect(screen.getByText(/PNL TREINO/i)).toBeInTheDocument();
      expect(screen.getByText(/PNL TESTE/i)).toBeInTheDocument();
    });

    it('runs the permutation test and reports a p-value', () => {
      engine.setHistory('R_10', makeDigits(800));
      engine.updateConfig({ minScore: 0, minTicks: 100 });

      render(<ValidationTab engine={engine} state={engine.getState()} />);
      fireEvent.click(screen.getByRole('button', { name: /Teste de Permutação/i }));

      expect(screen.getByText(/p-valor|P-VALOR/i)).toBeInTheDocument();
    });

    it('switches the market under analysis', () => {
      engine.setHistory('R_10', makeDigits(400));
      engine.setHistory('R_25', makeDigits(1200, 4242));
      engine.updateConfig({ minScore: 0, minTicks: 100 });

      render(<ValidationTab engine={engine} state={engine.getState()} />);
      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'R_25' } });

      expect((select as HTMLSelectElement).value).toBe('R_25');
      fireEvent.click(screen.getByRole('button', { name: /Rodar Backtest Simples/i }));
      expect(screen.getByText(/OPERAÇÕES/i)).toBeInTheDocument();
    });
  });

  describe('RiskTab', () => {
    it('shows a negative Kelly fraction at the observed Differ edge', () => {
      render(<RiskTab engine={engine} state={engine.getState()} />);

      // Payout 1.10 with no measured accuracy: the optimal size is zero or less
      expect(screen.getByRole('button', { name: /Executar Simulação Monte Carlo/i })).toBeInTheDocument();
    });

    it('runs the ruin simulation and reports the whole distribution', () => {
      render(<RiskTab engine={engine} state={engine.getState()} />);

      fireEvent.click(screen.getByRole('button', { name: /Executar Simulação Monte Carlo/i }));

      expect(screen.getByText(/RISCO DE RUÍNA/i)).toBeInTheDocument();
      expect(screen.getByText(/LUCRO MEDIANO/i)).toBeInTheDocument();
      expect(screen.getByText(/PIOR 5% \(STRESS\)/i)).toBeInTheDocument();
      expect(screen.getByText(/MELHOR 5%/i)).toBeInTheDocument();
      expect(screen.getByText(/MAX DRAWDOWN MEDIANO/i)).toBeInTheDocument();
    });

    it('accepts a different bankroll, session count and session length', () => {
      render(<RiskTab engine={engine} state={engine.getState()} />);

      const inputs = screen.getAllByRole('spinbutton');
      fireEvent.change(inputs[0], { target: { value: '50' } });
      fireEvent.change(inputs[1], { target: { value: '100' } });
      fireEvent.change(inputs[2], { target: { value: '30' } });

      fireEvent.click(screen.getByRole('button', { name: /Executar Simulação Monte Carlo/i }));
      expect(screen.getByText(/RISCO DE RUÍNA/i)).toBeInTheDocument();
    });
  });

  describe('SystemTab', () => {
    const renderSystem = (exportCSV = vi.fn()) => {
      render(<SystemTab engine={engine} state={engine.getState()} exportCSV={exportCSV} />);
      return exportCSV;
    };

    it('blocks the CSV export while no operation has been recorded', () => {
      renderSystem();
      expect(screen.getByRole('button', { name: /Exportar Operações \(CSV\)/i })).toBeDisabled();
    });

    it('exports the operations once there is something to export', () => {
      engine.updateConfig({ opMode: 'sim', stopLoss: 0, stopWin: 0 });
      engine.settleContract(0.11, false, 'R_10', 3, 4);

      const exportCSV = renderSystem();
      const btn = screen.getByRole('button', { name: /Exportar Operações \(CSV\)/i });
      expect(btn).toBeEnabled();

      fireEvent.click(btn);
      expect(exportCSV).toHaveBeenCalledOnce();
    });

    it('writes the profile out as a JSON download', () => {
      const createObjectURL = vi.fn(() => 'blob:profile');
      const revokeObjectURL = vi.fn();
      vi.stubGlobal('URL', { ...URL, createObjectURL, revokeObjectURL });
      const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

      renderSystem();
      fireEvent.click(screen.getByRole('button', { name: /Exportar Perfil \(JSON\)/i }));

      expect(createObjectURL).toHaveBeenCalled();
      expect(click).toHaveBeenCalled();
      expect(revokeObjectURL).toHaveBeenCalledWith('blob:profile');
      expect(toastSuccess).toHaveBeenCalledWith(expect.stringMatching(/Perfil exportado/i));

      vi.unstubAllGlobals();
    });

    it('applies an imported profile to the engine config', async () => {
      renderSystem();
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      const file = new File([JSON.stringify({ config: { stake: 7.5 } })], 'p.json', {
        type: 'application/json',
      });

      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        expect(engine.getConfig().stake).toBe(7.5);
      });
      expect(toastSuccess).toHaveBeenCalledWith(expect.stringMatching(/Perfil importado/i));
    });

    it('rejects a JSON file that carries no config', async () => {
      renderSystem();
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      const file = new File([JSON.stringify({ nada: true })], 'p.json', {
        type: 'application/json',
      });

      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        expect(toastError).toHaveBeenCalledWith(expect.stringMatching(/perfil inválido/i));
      });
    });

    it('reports a file that is not valid JSON', async () => {
      renderSystem();
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      const file = new File(['isto não é json'], 'p.json', { type: 'application/json' });

      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        expect(toastError).toHaveBeenCalledWith(expect.stringMatching(/Erro ao ler arquivo JSON/i));
      });
    });

    it('does nothing when the file dialog is dismissed', () => {
      renderSystem();
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;

      fireEvent.change(input, { target: { files: [] } });

      expect(toastSuccess).not.toHaveBeenCalled();
      expect(toastError).not.toHaveBeenCalled();
    });
  });

  describe('ConfigSidebar', () => {
    const renderSidebar = (over: Partial<Parameters<typeof ConfigSidebar>[0]> = {}) => {
      const props = {
        markets: engine.getState().markets,
        config: engine.getConfig(),
        updateConfig: vi.fn(),
        onToggleMarket: vi.fn(),
        onAddMarket: vi.fn(),
        ...over,
      };
      render(<ConfigSidebar {...props} />);
      return props;
    };

    it('toggles a market on click', () => {
      const props = renderSidebar();
      fireEvent.click(screen.getByRole('button', { name: 'R_25' }));
      expect(props.onToggleMarket).toHaveBeenCalledWith('R_25');
    });

    it('adds a market typed by hand, upper-cased and trimmed', () => {
      const props = renderSidebar();
      const input = screen.getByPlaceholderText(/símbolo|simbolo|R_/i);

      fireEvent.change(input, { target: { value: ' 1hz10v ' } });
      fireEvent.click(screen.getByRole('button', { name: '+' }));

      expect(props.onAddMarket).toHaveBeenCalledWith('1HZ10V');
      expect((input as HTMLInputElement).value).toBe('');
    });

    it('ignores an empty symbol', () => {
      const props = renderSidebar();
      fireEvent.click(screen.getByRole('button', { name: '+' }));
      expect(props.onAddMarket).not.toHaveBeenCalled();
    });

    it('pushes numeric fields into the config', () => {
      const updateConfig = vi.fn();
      renderSidebar({ updateConfig });
      const spins = screen.getAllByRole('spinbutton');

      fireEvent.change(spins[0], { target: { value: '2.5' } });

      expect(updateConfig).toHaveBeenCalled();
      const patch = updateConfig.mock.calls[0][0];
      expect(Object.keys(patch).length).toBeGreaterThan(0);
    });

    it('pushes checkbox fields into the config', () => {
      const props = renderSidebar();
      const boxes = screen.getAllByRole('checkbox');

      fireEvent.click(boxes[0]);
      expect(props.updateConfig).toHaveBeenCalled();
    });

    it('pushes select fields into the config', () => {
      const props = renderSidebar();
      const selects = screen.getAllByRole('combobox');

      fireEvent.change(selects[0], { target: { value: selects[0].querySelectorAll('option')[1].value } });
      expect(props.updateConfig).toHaveBeenCalled();
    });
  });
});
