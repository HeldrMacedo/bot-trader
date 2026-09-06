// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';
import { createDifferEngine } from '../app/services/BearDifferEngine';
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
