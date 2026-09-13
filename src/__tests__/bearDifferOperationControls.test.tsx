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

/**
 * Os controles do painel de operação escrevem direto na configuração do motor.
 * Sem exercitá-los, um campo pode deixar de gravar o que promete e nada acusa.
 */
describe('BearDiffer - controles do painel de operação', () => {
  let engine: ReturnType<typeof createDifferEngine>;
  let updateConfig: ReturnType<typeof vi.fn>;
  let exportCSV: ReturnType<typeof vi.fn>;
  let resetSession: ReturnType<typeof vi.fn>;
  let cancelVirtualLoss: ReturnType<typeof vi.fn>;

  const renderTab = (vlossArmed = false) =>
    render(
      <OperationTab
        engine={engine}
        state={engine.getState()}
        config={engine.getConfig()}
        updateConfig={updateConfig as never}
        executeTrade={vi.fn() as never}
        resetSession={resetSession}
        armVirtualLoss={vi.fn() as never}
        cancelVirtualLoss={cancelVirtualLoss}
        setWarmTarget={vi.fn()}
        exportCSV={exportCSV}
        vlossState={{
          armed: vlossArmed,
          sym: 'R_10',
          targetDigit: 7,
          targetLosses: 2,
          seenLosses: 1,
          ticksChecked: 5,
        }}
      />
    );

  beforeEach(() => {
    vi.clearAllMocks();
    engine = createDifferEngine();
    updateConfig = vi.fn((patch: Partial<DifferConfig>) => engine.updateConfig(patch));
    exportCSV = vi.fn();
    resetSession = vi.fn();
    cancelVirtualLoss = vi.fn();
    engine.updateConfig({ opMode: 'sim', autoSource: 'logic' });
  });

  it('grava a lógica escolhida à mão', () => {
    renderTab();
    fireEvent.change(screen.getByTestId('logic-select'), { target: { value: 'par600' } });
    expect(updateConfig).toHaveBeenCalledWith({ onceLogic: 'par600' });
  });

  it('grava a confiança mínima, caindo para 70 quando o campo fica vazio', () => {
    renderTab();
    // Campo numérico da confiança: o primeiro spinbutton do painel.
    const campo = screen.getAllByRole('spinbutton')[0];

    fireEvent.change(campo, { target: { value: '85' } });
    expect(updateConfig).toHaveBeenCalledWith({ onceMinConf: 85 });

    fireEvent.change(campo, { target: { value: '' } });
    expect(updateConfig).toHaveBeenCalledWith({ onceMinConf: 70 });
  });

  it('liga o loss virtual e grava a quantidade de perdas', () => {
    renderTab();

    fireEvent.click(screen.getByText(/loss virtual ao confirmar/i));
    expect(updateConfig).toHaveBeenCalledWith({ vlossOn: true });

    const qtd = screen.getAllByRole('spinbutton')[1];
    fireEvent.change(qtd, { target: { value: '3' } });
    expect(updateConfig).toHaveBeenCalledWith({ vlossN: 3 });

    fireEvent.change(qtd, { target: { value: '' } });
    expect(updateConfig).toHaveBeenCalledWith({ vlossN: 1 });
  });

  it('alterna o recálculo do alvo no disparo do loss virtual', () => {
    renderTab();
    fireEvent.click(screen.getByText(/refazer leitura ao disparar/i));
    expect(updateConfig).toHaveBeenCalledWith({ vlossRepick: false });
  });

  it('alterna a execução rápida e os filtros de exaustão', () => {
    renderTab();

    fireEvent.click(screen.getByText(/operação rápida/i));
    expect(updateConfig).toHaveBeenCalledWith({ fastExec: false });

    fireEvent.click(screen.getByText(/filtro de exaustão/i));
    expect(updateConfig).toHaveBeenCalledWith({ exFilter: true });

    fireEvent.click(screen.getByText(/só dígitos que já deram loss/i));
    expect(updateConfig).toHaveBeenCalledWith({ exOnlyLosers: true });
  });

  it('habilita o automático', () => {
    renderTab();

    fireEvent.click(screen.getByText(/habilitar o automático/i));
    expect(updateConfig).toHaveBeenCalledWith({ allowAuto: true, autoOn: false });
  });

  it('liga o automático quando já habilitado', () => {
    engine.updateConfig({ allowAuto: true });
    renderTab();

    fireEvent.click(screen.getByRole('button', { name: /ligar automático/i }));
    expect(updateConfig).toHaveBeenCalledWith({ autoOn: true });
  });

  it('desabilitar o automático também o desliga', () => {
    engine.updateConfig({ allowAuto: true, autoOn: true });
    renderTab();

    fireEvent.click(screen.getByText(/habilitar o automático/i));
    expect(updateConfig).toHaveBeenCalledWith({ allowAuto: false, autoOn: false });
  });

  it('troca a fonte do sinal', () => {
    renderTab();
    fireEvent.change(screen.getByTestId('auto-source-select'), {
      target: { value: 'both' },
    });
    expect(updateConfig).toHaveBeenCalledWith({ autoSource: 'both' });
  });

  it('zera a sessão', () => {
    renderTab();

    fireEvent.click(screen.getByRole('button', { name: /zerar sessão/i }));
    expect(resetSession).toHaveBeenCalled();
  });

  it('exporta o CSV quando há operações liquidadas', () => {
    engine.settleContract(0.11, false, 'R_10', 7, 3, undefined, 'motor2');
    renderTab();

    fireEvent.click(screen.getByRole('button', { name: /csv/i }));
    expect(exportCSV).toHaveBeenCalled();
  });

  it('mostra o loss virtual armado e permite cancelá-lo', () => {
    renderTab(true);

    expect(screen.getByText(/Loss Virtual armado em/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /cancelar/i }));
    expect(cancelVirtualLoss).toHaveBeenCalled();
  });

  it('descarta o alvo congelado devolvendo a proposta', () => {
    const b = Array.from({ length: 3000 }, (_, i) => (i % 3 === 0 ? 7 : i % 10));
    engine.updateConfig({ autoSource: 'motor2', minTicks: 300, gateBias: false });
    engine.setHistory('R_10', b.slice(0, -1));
    engine.processTick('R_10', b[b.length - 1]);
    renderTab();

    fireEvent.click(screen.getByRole('button', { name: /analisar mercados/i }));
    fireEvent.click(screen.getByRole('button', { name: /descartar/i }));

    expect(screen.getByText(/descartada pelo usuário/i)).toBeInTheDocument();
  });
});
