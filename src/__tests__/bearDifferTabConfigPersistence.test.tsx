// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { createDifferEngine } from '../app/services/BearDifferEngine';
import LabTab from '../app/(withSidebar)/bear-bot-differ/components/tabs/LabTab';
import LogicsTab from '../app/(withSidebar)/bear-bot-differ/components/tabs/LogicsTab';

/**
 * Campos de parâmetro estatístico das abas guardavam o valor em useState local.
 * O conteúdo da aba é renderizado condicionalmente, então sair da aba desmonta o
 * componente e o valor digitado volta ao inicial. Pior: o motor lia constantes
 * próprias, de modo que o campo nunca mudava o comportamento do bot.
 */
describe('BearDiffer - parâmetros das abas vivem na configuração do motor', () => {
  let engine: ReturnType<typeof createDifferEngine>;

  beforeEach(() => {
    engine = createDifferEngine();
    const sample = Array.from({ length: 700 }, (_, i) => i % 10);
    engine.setHistory('R_10', sample);
    engine.setHistory('R_25', sample);
  });

  describe('Laboratório estatístico', () => {
    it('grava a amostra mínima na configuração e sobrevive à troca de aba', () => {
      const { unmount } = render(<LabTab engine={engine} state={engine.getState()} />);

      const input = screen.getByLabelText(/amostra mínima por mercado/i) as HTMLInputElement;
      expect(input.value).toBe('2000');

      fireEvent.change(input, { target: { value: '200' } });
      expect(engine.getConfig().labMin).toBe(200);

      // Sair da aba desmonta o componente; voltar remonta do zero.
      unmount();
      render(<LabTab engine={engine} state={engine.getState()} />);

      expect((screen.getByLabelText(/amostra mínima por mercado/i) as HTMLInputElement).value).toBe(
        '200'
      );
    });

    it('grava a significância exigida na configuração e sobrevive à troca de aba', () => {
      const { unmount } = render(<LabTab engine={engine} state={engine.getState()} />);

      const input = screen.getByLabelText(/significância exigida/i) as HTMLInputElement;
      fireEvent.change(input, { target: { value: '0.05' } });
      expect(engine.getConfig().labAlpha).toBeCloseTo(0.05, 6);

      unmount();
      render(<LabTab engine={engine} state={engine.getState()} />);

      expect((screen.getByLabelText(/significância exigida/i) as HTMLInputElement).value).toBe(
        '0.05'
      );
    });
  });

  describe('Lógicas', () => {
    it('grava o mínimo de sinais na configuração e sobrevive à troca de aba', () => {
      const { unmount } = render(<LogicsTab engine={engine} state={engine.getState()} />);

      const input = screen.getByLabelText(/sinais mínimos/i) as HTMLInputElement;
      expect(input.value).toBe('150');

      fireEvent.change(input, { target: { value: '40' } });
      expect(engine.getConfig().lgMinN).toBe(40);

      unmount();
      render(<LogicsTab engine={engine} state={engine.getState()} />);

      expect((screen.getByLabelText(/sinais mínimos/i) as HTMLInputElement).value).toBe('40');
    });

    it('grava o q do controle de descoberta falsa na configuração', () => {
      render(<LogicsTab engine={engine} state={engine.getState()} />);

      const input = screen.getByLabelText(/taxa de descoberta falsa/i) as HTMLInputElement;
      fireEvent.change(input, { target: { value: '0.2' } });

      expect(engine.getConfig().lgQ).toBeCloseTo(0.2, 6);
    });
  });

  describe('o motor obedece aos parâmetros', () => {
    it('usa config.lgMinN para decidir se uma lógica tem amostra', () => {
      for (let i = 0; i < 60; i++) engine.processTick('R_10', i % 10);

      // Com o padrão de 150 sinais, 60 ticks não bastam.
      expect(engine.getLogicRanking().some((r) => r.ready)).toBe(false);

      engine.updateConfig({ lgMinN: 20 });
      expect(engine.getLogicRanking().some((r) => r.ready)).toBe(true);
    });

    it('usa config.lgMinN também para montar o rodízio de lógicas', () => {
      for (let i = 0; i < 60; i++) engine.processTick('R_10', i % 10);

      expect(engine.resolveLogic('rotate')).toBeNull();

      engine.updateConfig({ lgMinN: 20 });
      expect(engine.resolveLogic('rotate')).not.toBeNull();
    });
  });
});
