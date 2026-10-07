// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';
import React from 'react';
import { createDifferEngine } from '../app/services/BearDifferEngine';
import ConfigSidebar from '../app/(withSidebar)/bear-bot-differ/components/ConfigSidebar';
import PipelineTab from '../app/(withSidebar)/bear-bot-differ/components/tabs/PipelineTab';
import VigilanceTab from '../app/(withSidebar)/bear-bot-differ/components/tabs/VigilanceTab';
import SystemTab from '../app/(withSidebar)/bear-bot-differ/components/tabs/SystemTab';
import LogicsTab from '../app/(withSidebar)/bear-bot-differ/components/tabs/LogicsTab';
import { simulateMonteCarloRuin, driftTest, lgamma, gammaP, calculateKelly } from '../app/services/BearDifferMath';

vi.mock('react-toastify', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));

// Gerador determinístico: mesmos dígitos em toda execução.
function lcgDigits(n: number, seed = 20261007): number[] {
  let s = seed;
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    s = (s * 1103515245 + 12345) % 2147483648;
    out.push(Math.floor((s / 2147483648) * 10));
  }
  return out;
}

const inputNear = (label: string | RegExp) =>
  screen.getByText(label).parentElement!.querySelector('input, select') as HTMLInputElement;

describe('Bear Bot Differ — lacunas de cobertura', () => {
  let engine: ReturnType<typeof createDifferEngine>;
  beforeEach(() => { engine = createDifferEngine(); });
  afterEach(() => { cleanup(); vi.useRealTimers(); });

  describe('ConfigSidebar', () => {
    function renderSidebar(config: any = {}) {
      const updateConfig = vi.fn();
      render(
        <ConfigSidebar
          markets={engine.getState().markets}
          config={{ ...engine.getConfig(), gateEnabled: true, mgMode: 'partial', ...config }}
          updateConfig={updateConfig}
        />
      );
      return updateConfig;
    }

    it('cada campo numérico grava o valor digitado e cai no padrão quando vazio', () => {
      const updateConfig = renderSidebar();
      const numeric = Array.from(document.querySelectorAll('input[type="number"]')) as HTMLInputElement[];
      expect(numeric.length).toBeGreaterThanOrEqual(13);

      numeric.forEach((input) => fireEvent.change(input, { target: { value: '7' } }));
      numeric.forEach((input) => fireEvent.change(input, { target: { value: '' } }));

      const keys = new Set(updateConfig.mock.calls.map((c) => Object.keys(c[0])[0]));
      for (const k of ['minScore', 'minTicks', 'cooldown', 'gateOps', 'gateAcc', 'mgFactor', 'mgMax',
        'mgParts', 'stopLoss', 'stopWin', 'maxLoss', 'minAcc', 'maxStale']) {
        expect(keys).toContain(k);
      }
      expect(updateConfig).toHaveBeenCalledWith({ minScore: 72 });
      expect(updateConfig).toHaveBeenCalledWith({ mgFactor: 2.2 });
      expect(updateConfig).toHaveBeenCalledWith({ maxStale: 2 });
    });

    it('troca o modo do martingale', () => {
      const updateConfig = renderSidebar();
      const select = Array.from(document.querySelectorAll('select')).find((s) =>
        Array.from(s.options).some((o) => o.value === 'partial'))!;

      fireEvent.change(select, { target: { value: 'normal' } });

      expect(updateConfig).toHaveBeenCalledWith({ mgMode: 'normal' });
    });
  });

  describe('PipelineTab', () => {
    it('drift sem histórico avisa; com histórico lista os mercados', () => {
      const { rerender } = render(<PipelineTab engine={engine} state={engine.getState()} />);
      fireEvent.click(screen.getByText('Testar mudança de regime'));
      expect(screen.getByText(/Histórico insuficiente/)).toBeDefined();

      engine.getState().markets.filter((m) => m.on).forEach((m, i) => engine.setHistory(m.sym, lcgDigits(1000, 7 + i)));
      rerender(<PipelineTab engine={engine} state={engine.getState()} />);
      fireEvent.click(screen.getByText('Testar mudança de regime'));
      expect(screen.getByText(/mercados mostra/)).toBeDefined();
    });

    it('esteira: amostra curta avisa; com amostra roda e mostra o resumo', async () => {
      vi.useFakeTimers();
      const sym = engine.getState().markets[0].sym;
      // Abaixo de 300 ticks o botão fica desabilitado; entre 300 e 599 ele avisa.
      engine.setHistory(sym, lcgDigits(400));
      const { rerender } = render(<PipelineTab engine={engine} state={engine.getState()} />);
      const runButton = () => screen.getByText('Iniciar Esteira de Validação');
      fireEvent.click(runButton());
      expect(screen.getByText(/precisa de pelo menos 600 ticks/)).toBeDefined();

      engine.setHistory(sym, lcgDigits(1500));
      rerender(<PipelineTab engine={engine} state={engine.getState()} />);
      fireEvent.change(screen.getByText('CANDIDATAS A GERAR').parentElement!.querySelector('input')!, { target: { value: '50' } });
      fireEvent.change(screen.getByText('CANDIDATAS A GERAR').parentElement!.querySelector('input')!, { target: { value: '' } });
      fireEvent.change(document.querySelector('select')!, { target: { value: sym } });
      fireEvent.click(runButton());
      await act(async () => { await vi.advanceTimersByTimeAsync(5000); });

      expect(screen.getAllByText(/Esteira concluída|sobreviveram|Amostra insuficiente/).length).toBeGreaterThan(0);
    });
    it('esteira: resultado nulo e candidatas aprovadas', async () => {
      vi.useFakeTimers();
      const sym = engine.getState().markets[0].sym;
      engine.setHistory(sym, lcgDigits(1500));
      const run = vi.spyOn(engine, 'runPipeline').mockReturnValueOnce(null as any);
      render(<PipelineTab engine={engine} state={engine.getState()} />);

      fireEvent.click(screen.getByText('Iniciar Esteira de Validação'));
      await act(async () => { await vi.advanceTimersByTimeAsync(5000); });
      expect(screen.getByText('Amostra insuficiente ou erro ao rodar esteira.')).toBeDefined();

      run.mockReturnValueOnce({
        totalGenomes: 2, survivorsStageA: 1, survivorsStageB: 1,
        candidates: [
          { approved: true, G: { a: 1 }, accC: 0.93, tC: 40, pnlC: 3.2 },
          { approved: false, G: { a: 2 }, accA: 0.5, tA: 20, pnlA: -1 },
        ],
      } as any);
      fireEvent.click(screen.getByText('Iniciar Esteira de Validação'));
      await act(async () => { await vi.advanceTimersByTimeAsync(5000); });
      expect(screen.getByText(/1 estratégia\(s\) sobreviveram/)).toBeDefined();
    });
  });

  describe('VigilanceTab', () => {
    it('edita parâmetros e lista alertas da sessão', () => {
      const update = vi.spyOn(engine, 'updateConfig');
      const state = {
        ...engine.getState(),
        alerts: [{ id: 'a1', time: '10:00', sym: 'R_10', txt: 'lógica quebrou' }],
      };
      render(<VigilanceTab engine={engine} state={state} />);

      fireEvent.change(inputNear('Sinais mínimos por lógica:'), { target: { value: '' } });
      fireEvent.change(inputNear('Significância (α):'), { target: { value: '' } });

      expect(update).toHaveBeenCalledWith({ wtMinN: 500 });
      expect(update).toHaveBeenCalledWith({ wtAlpha: 0.01 });
      expect(screen.getByText(/lógica quebrou/)).toBeDefined();
    });
  });

  describe('SystemTab', () => {
    it('Importar abre o seletor de arquivo', () => {
      render(<SystemTab engine={engine} state={engine.getState()} exportCSV={vi.fn()} />);
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      const click = vi.spyOn(input, 'click');

      fireEvent.click(screen.getByText('Importar Perfil (JSON)'));

      expect(click).toHaveBeenCalled();
    });
  });

  describe('LogicsTab', () => {
    it('mostra o acerto por mercado quando a lógica já tem amostra', () => {
      const sym = engine.getState().markets.find((m) => m.on)!.sym;
      lcgDigits(3000, 99).forEach((d) => engine.processTick(sym, d));

      render(<LogicsTab engine={engine} state={engine.getState()} />);

      const withSample = engine.getLogics().some((L) => engine.getLogicMarketStats(L.id, sym).n >= 20);
      expect(withSample).toBe(true);
      expect(document.body.textContent).toMatch(/\d+(\.\d)?%/);
    });
  });

  describe('BearDifferMath', () => {
    it('lgamma usa reflexão abaixo de 0,5 e gammaP converge pela fração continuada', () => {
      expect(lgamma(0.25)).toBeCloseTo(Math.log(3.6256099082), 4);
      expect(gammaP(2, 10)).toBeGreaterThan(0.99);
    });

    it('Kelly sem payout líquido é zero', () => {
      expect(calculateKelly(0.9, 1)).toBe(0);
    });

    it('Monte Carlo cobre martingale normal, parcial e ruína', () => {
      const base = { factor: 2, maxLvl: 2, parts: 2, base: 1 };
      const normal = simulateMonteCarloRuin(0.5, 1.9, 1, 20, { ...base, mode: 'normal' } as any, 50, 100);
      const partial = simulateMonteCarloRuin(0.5, 1.9, 1, 20, { ...base, mode: 'partial' } as any, 50, 100);
      const ruin = simulateMonteCarloRuin(0.05, 1.9, 1, 3, { ...base, mode: 'normal' } as any, 20, 50);

      expect(normal.runs).toBe(50);
      expect(partial.runs).toBe(50);
      expect(ruin.ruinProb).toBeGreaterThan(0.5);
    });

    it('drift com repetições e dígitos ausentes em blocos', () => {
      const buf = [...Array(400).fill(3), ...lcgDigits(400)];
      const res = driftTest(buf, 2);
      expect(res).not.toBeNull();
      expect(res!.pR).toBeLessThan(0.05);
    });
  });
});
