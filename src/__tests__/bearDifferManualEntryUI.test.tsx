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

const saturated = (n: number, digit: number, every = 3) =>
  Array.from({ length: n }, (_, i) => (i % every === 0 ? digit : i % 10));

describe('BearDiffer - entrada manual no alvo recomendado', () => {
  let engine: ReturnType<typeof createDifferEngine>;
  let executeTrade: ReturnType<typeof vi.fn>;
  let armVirtualLoss: ReturnType<typeof vi.fn>;
  let updateConfig: (patch: Partial<DifferConfig>) => void;

  const renderTab = () =>
    render(
      <OperationTab
        engine={engine}
        state={engine.getState()}
        config={engine.getConfig()}
        updateConfig={updateConfig}
        executeTrade={executeTrade as never}
        resetSession={vi.fn()}
        armVirtualLoss={armVirtualLoss as never}
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

  // Deixa apenas um mercado com alvo liberado, para o texto do botão ser único.
  const seedLiberado = (digit = 7) => {
    ['R_25', 'R_50', 'R_75', 'R_100', 'RDBEAR', 'RDBULL'].forEach((s) =>
      engine.setMarketEnabled(s, false)
    );
    const b = saturated(3000, digit);
    engine.setHistory('R_10', b.slice(0, -1));
    engine.processTick('R_10', b[b.length - 1]);
  };

  beforeEach(() => {
    vi.clearAllMocks();
    engine = createDifferEngine();
    executeTrade = vi.fn().mockResolvedValue(undefined);
    armVirtualLoss = vi.fn();
    updateConfig = vi.fn((patch: Partial<DifferConfig>) => engine.updateConfig(patch));
    engine.updateConfig({
      opMode: 'sim',
      autoSource: 'motor2',
      minTicks: 300,
      gateBias: false,
      cooldown: 0,
    });
  });

  it('mostra o dígito do alvo no rótulo do botão', () => {
    seedLiberado(7);
    renderTab();

    const botao = screen.getByTestId('manual-entry-button');
    expect(botao.textContent).toMatch(/fora do dígito 7/i);
    expect(botao).not.toBeDisabled();
  });

  it('dispara a entrada no alvo recomendado com a atribuição da fonte', () => {
    seedLiberado(7);
    renderTab();

    fireEvent.click(screen.getByTestId('manual-entry-button'));

    expect(executeTrade).toHaveBeenCalledTimes(1);
    const [sym, digit, tickCount, logicId] = executeTrade.mock.calls[0];
    expect(sym).toBe('R_10');
    expect(digit).toBe(7);
    expect(typeof tickCount).toBe('number');
    expect(logicId).toBe('motor2');
  });

  it('recalcula o alvo no clique, e não usa o que estava na tela', () => {
    seedLiberado(7);
    renderTab();

    const spy = vi.spyOn(engine, 'manualTarget');
    fireEvent.click(screen.getByTestId('manual-entry-button'));

    expect(spy).toHaveBeenCalled();
  });

  it('arma Loss Virtual em vez de comprar quando vlossOn está ligado', () => {
    seedLiberado(7);
    engine.updateConfig({ vlossOn: true, vlossN: 2 });
    renderTab();

    const botao = screen.getByTestId('manual-entry-button');
    expect(botao.textContent).toMatch(/loss virtual/i);

    fireEvent.click(botao);

    expect(executeTrade).not.toHaveBeenCalled();
    expect(armVirtualLoss).toHaveBeenCalledWith('R_10', 7, 2, 'motor2');
  });

  it('desabilita o botão e escreve o motivo quando não há alvo', () => {
    // Nenhum histórico: amostra insuficiente em todos os mercados.
    renderTab();

    expect(screen.getByTestId('manual-entry-button')).toBeDisabled();
    expect(screen.getByTestId('manual-entry-status').textContent).toMatch(
      /amostra insuficiente/i
    );
  });

  it('explica a trava de testes sem desligar o automático', () => {
    seedLiberado(7);
    engine.updateConfig({ autoOn: true, gateEnabled: true, gateOps: 50, gateAcc: 91 });
    renderTab();

    expect(screen.getByTestId('manual-entry-button')).toBeDisabled();
    expect(screen.getByTestId('manual-entry-status').textContent).toMatch(
      /trava de testes/i
    );
    expect(engine.getConfig().autoOn).toBe(true);
  });

  it('segue disponível com o automático ligado', () => {
    seedLiberado(7);
    engine.updateConfig({ autoOn: true, allowAuto: true });
    renderTab();

    expect(screen.getByTestId('manual-entry-button')).not.toBeDisabled();
  });

  it('o card do alvo mostra a métrica da fonte ativa', () => {
    seedLiberado(7);
    renderTab();
    expect(screen.getByTestId('target-card-metric').textContent).toMatch(/score/i);

    engine.updateConfig({ autoSource: 'logic', onceLogic: 'flong', onceMinConf: 50 });
    renderTab();
    const metricas = screen.getAllByTestId('target-card-metric');
    expect(metricas[metricas.length - 1].textContent).toMatch(/confian/i);
  });

  it('desabilita o seletor de lógica quando a fonte é o motor', () => {
    engine.updateConfig({ allowAuto: true, autoSource: 'motor2' });
    renderTab();

    expect(screen.getByTestId('logic-select')).toBeDisabled();
    expect(screen.getByTestId('logic-select-note').textContent).toMatch(/sem efeito/i);
  });

  it('habilita o seletor de lógica quando a fonte usa lógica', () => {
    engine.updateConfig({ allowAuto: true, autoSource: 'logic' });
    renderTab();

    expect(screen.getByTestId('logic-select')).not.toBeDisabled();
  });
});

describe('BearDiffer - leitura honesta da confiança no card', () => {
  let engine: ReturnType<typeof createDifferEngine>;

  const render1 = () =>
    render(
      <OperationTab
        engine={engine}
        state={engine.getState()}
        config={engine.getConfig()}
        updateConfig={vi.fn()}
        executeTrade={vi.fn() as never}
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

  beforeEach(() => {
    vi.clearAllMocks();
    engine = createDifferEngine();
    engine.updateConfig({ opMode: 'sim', minTicks: 300, gateBias: false });
  });

  it('não apresenta ausência de palpite como confiança zero', () => {
    // Sem palpite da lógica: a confiança é desconhecida, não é zero.
    vi.spyOn(engine, 'manualTarget').mockReturnValue({
      sym: 'R_10',
      digit: null,
      conf: null,
      score: 67,
      logicId: 'mk2',
      reason: 'Markov 2ª ordem sem palpite em R_10',
      key: 'logicpick',
      stage: 2,
    });
    engine.updateConfig({ autoSource: 'both', onceMinConf: 70, minScore: 72 });

    render1();

    const metrica = screen.getByTestId('target-card-metric').textContent || '';
    expect(metrica).not.toMatch(/confiança 0%/i);
    expect(metrica).toMatch(/confiança —|sem palpite/i);
  });

  it('mostra a confiança quando ela existe de verdade', () => {
    vi.spyOn(engine, 'manualTarget').mockReturnValue({
      sym: 'R_10',
      digit: 4,
      conf: 0,
      score: 80,
      logicId: 'rep',
      reason: 'confiança de 0% em Anti-repetição (R_10) abaixo do mínimo de 70%',
      key: 'logicconf',
      stage: 2,
    });
    engine.updateConfig({ autoSource: 'logic', onceMinConf: 70 });

    render1();

    expect(screen.getByTestId('target-card-metric').textContent).toMatch(/confiança 0%/i);
  });

  it('não mostra mais o seletor de varredura ampla', () => {
    render1();
    expect(screen.queryByText(/varredura ampla/i)).toBeNull();
  });
});

describe('BearDiffer - rótulos honestos dos modos de alternância', () => {
  let engine: ReturnType<typeof createDifferEngine>;

  const render2 = () =>
    render(
      <OperationTab
        engine={engine}
        state={engine.getState()}
        config={engine.getConfig()}
        updateConfig={vi.fn()}
        executeTrade={vi.fn() as never}
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

  beforeEach(() => {
    vi.clearAllMocks();
    engine = createDifferEngine();
    engine.updateConfig({ autoSource: 'logic', minTicks: 300, gateBias: false });
  });

  it('não promete a líder do ranking quando entrega a líder aprovada', () => {
    render2();
    const opcao = screen
      .getByTestId('logic-select')
      .querySelector('option[value="auto"]') as HTMLOptionElement;

    expect(opcao.textContent).toMatch(/aprovada/i);
  });

  it('oferece a líder por acerto medido sem sugerir que a opção não opera', () => {
    render2();
    const opcao = screen
      .getByTestId('logic-select')
      .querySelector('option[value="top"]') as HTMLOptionElement;

    expect(opcao).not.toBeNull();
    expect(opcao.textContent).toMatch(/acerto medido/i);
    // "sem prova estatística" no rótulo fazia parecer que a opção não escolhe
    // lógica nenhuma. O aviso continua, em nota própria.
    expect(opcao.textContent).not.toMatch(/sem prova|sem significância/i);
  });

  it('avisa em nota que a líder por acerto não passa pelo teste', () => {
    engine.updateConfig({ onceLogic: 'top' });
    render2();

    const nota = screen.getByTestId('logic-mode-note').textContent || '';
    expect(nota).toMatch(/significância|teste/i);
    expect(nota).toMatch(/empate técnico|amostra/i);
  });

  it('mostra no card qual lógica a líder por acerto está escolhendo', () => {
    vi.spyOn(engine, 'getLogicRanking').mockReturnValue([
      {
        lid: 'exaust',
        name: 'Exaustão de perdedores',
        tag: 'reversão',
        n: 254,
        acc: 0.9252,
        p: 0.2166,
        ready: true,
        pass: false,
      },
      {
        lid: 'rep',
        name: 'Anti-repetição',
        tag: 'sequência',
        n: 329,
        acc: 0.9088,
        p: 0.5451,
        ready: true,
        pass: false,
      },
    ]);
    engine.updateConfig({ onceLogic: 'top' });
    render2();

    const escolhida = screen.getByTestId('target-card-logic').textContent || '';
    expect(escolhida).toMatch(/Exaustão de perdedores/);
    expect(escolhida).toMatch(/92\.5/);
  });

  it('diz no card quando a líder por acerto não tem candidata', () => {
    // Todas abaixo do empate técnico de 90,91%: nenhuma qualifica.
    vi.spyOn(engine, 'getLogicRanking').mockReturnValue([
      {
        lid: 'rep',
        name: 'Anti-repetição',
        tag: 'sequência',
        n: 329,
        acc: 0.88,
        p: 0.9,
        ready: true,
        pass: false,
      },
    ]);
    engine.updateConfig({ onceLogic: 'top' });
    render2();

    expect(screen.getByTestId('target-card-logic').textContent).toMatch(
      /nenhuma/i
    );
  });

  it('não mostra a lógica escolhida fora do modo por acerto', () => {
    engine.updateConfig({ onceLogic: 'auto' });
    render2();

    expect(screen.queryByTestId('target-card-logic')).toBeNull();
  });

  it('não mostra a nota da líder por acerto em outros modos', () => {
    engine.updateConfig({ onceLogic: 'auto' });
    render2();

    expect(screen.queryByTestId('logic-mode-note')).toBeNull();
  });

  it('mostra a causa no lugar da métrica quando nenhuma lógica foi escolhida', () => {
    vi.spyOn(engine, 'manualTarget').mockReturnValue({
      sym: 'R_10',
      digit: null,
      conf: null,
      score: 65,
      logicId: 'motor2',
      reason: 'nenhuma lógica aprovada no teste de significância para operar R_10',
      key: 'logicnone',
      stage: 2,
    });

    render2();

    const metrica = screen.getByTestId('target-card-metric').textContent || '';
    expect(metrica).toMatch(/nenhuma lógica aprovada/i);
    expect(metrica).not.toMatch(/mín\. 70%/);
  });
});
