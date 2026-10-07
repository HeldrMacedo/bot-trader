// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act, cleanup, fireEvent, screen } from '@testing-library/react';
import React from 'react';
import { installStorage, seedHomeAccount } from './homeTestDeriv';
import { createBearDeriv, stubAudio, tick, settledPoc, startAuto, buysOf } from './bearBotUltraTestHarness';

const h = vi.hoisted(() => ({ deriv: null as any }));

vi.mock('@/app/services/DerivService', () => ({
  DerivService: { getInstance: () => h.deriv },
}));
vi.mock('react-toastify', () => ({
  toast: { error: vi.fn(), success: vi.fn(), warn: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));

import { toast } from 'react-toastify';
import BearBotUltra from '../app/(withSidebar)/bear-bot-ultra/bearBotUltra';

let contractSeq = 100;
function defaultRoute(p: any): Promise<any> {
  if (p.buy !== undefined) {
    return Promise.resolve({ msg_type: 'buy', buy: { contract_id: ++contractSeq, buy_price: p.price } });
  }
  if (p.proposal) return new Promise(() => {});
  return Promise.resolve({});
}

// Proposta fica pronta logo após o pedido, com id derivado do tipo e barreira.
function readyProposals(p: any): Promise<any> {
  if (p.proposal) {
    queueMicrotask(() => h.deriv.observerInstance.emit('message', {
      msg_type: 'proposal',
      proposal: { id: `P-${p.contract_type}-${p.barrier}` },
      passthrough: p.passthrough,
    }));
    return Promise.resolve({});
  }
  return defaultRoute(p);
}

const settle = () => act(async () => { await vi.advanceTimersByTimeAsync(0); });
const click = async (text: string | RegExp) => act(async () => { fireEvent.click(screen.getByText(text)); });
const digitTick = (d: number, sym = 'R_100') =>
  act(async () => { tick(h.deriv, sym, 120 + d); await vi.advanceTimersByTimeAsync(0); });
const digitTicks = async (digits: number[], sym = 'R_100') => {
  await act(async () => {
    digits.forEach((d) => tick(h.deriv, sym, 120 + d));
    await vi.advanceTimersByTimeAsync(0);
  });
};
const poc = (msg: any) =>
  act(async () => { h.deriv.observerInstance.emit('deriv.proposal_open_contract', msg); await vi.advanceTimersByTimeAsync(0); });
const inputOf = (label: string) => screen.getByText(label).parentElement!.querySelector('input')!;
const typeInto = (label: string, value: string) =>
  act(async () => { fireEvent.change(inputOf(label), { target: { value } }); });
const vlToggle = () =>
  act(async () => { fireEvent.click(screen.getByText(/LOSS VIRTUAL/i).parentElement!.querySelector('button')!); });
const logText = () => document.body.textContent || '';
const proposalsSent = () => h.deriv.send.mock.calls.map((c: any[]) => c[0]).filter((p: any) => p.proposal === 1);

async function boot() {
  render(<BearBotUltra />);
  await act(async () => { await vi.advanceTimersByTimeAsync(100); });
}

describe('Bear Bot Ultra — funcionalidades', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    installStorage();
    seedHomeAccount();
    stubAudio();
    contractSeq = 100;
    h.deriv = createBearDeriv();
    h.deriv.route = defaultRoute;
    vi.mocked(toast.error).mockClear();
    vi.mocked(toast.success).mockClear();
    vi.mocked(toast.warn).mockClear();
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  describe('propostas pré-abertas', () => {
    it('compra pelo id da proposta pronta e reabre outra em seguida', async () => {
      h.deriv.route = readyProposals;
      await boot();
      const before = proposalsSent().length;

      await click('Entrar Agora');
      await settle();

      expect(buysOf(h.deriv.send)).toEqual([expect.objectContaining({ buy: 'P-DIGITOVER-2', price: 0.35 })]);
      expect(logText()).toContain('⚡');
      expect(proposalsSent().length).toBeGreaterThan(before);
    });

    it('combo compra as duas pernas pelas propostas prontas', async () => {
      h.deriv.route = readyProposals;
      await boot();
      await click('combo');
      await act(async () => { await vi.advanceTimersByTimeAsync(100); });

      await click('Entrar Agora');
      await settle();

      expect(buysOf(h.deriv.send).map((b: any) => b.buy).sort()).toEqual(['P-DIGITOVER-5', 'P-DIGITUNDER-4']);
      expect(logText()).toMatch(/COMBO Over>5 \+ Under<4 .*⚡/);
    });

    it('queda do canal de trade descarta as propostas; a reabertura pede novas', async () => {
      h.deriv.route = readyProposals;
      await boot();

      await act(async () => { h.deriv.observerInstance.emit('close', {}); });
      await click('Entrar Agora');
      await settle();
      expect(buysOf(h.deriv.send)[0]).toEqual(expect.objectContaining({ buy: 1 }));

      const before = proposalsSent().length;
      await act(async () => { h.deriv.observerInstance.emit('open', undefined); await vi.advanceTimersByTimeAsync(0); });
      expect(proposalsSent().length).toBeGreaterThan(before);
    });

    it('AlreadySubscribed é ignorado; outro erro libera novo pedido no PropKeeper', async () => {
      const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
      let code = 'AlreadySubscribed';
      h.deriv.route = (p: any) => (p.proposal ? Promise.reject({ code, message: code }) : defaultRoute(p));
      await boot();
      expect(errors).not.toHaveBeenCalledWith('Ensure proposal error:', expect.anything());

      code = 'RateLimit';
      await act(async () => { h.deriv.observerInstance.emit('close', {}); });
      await act(async () => { await vi.advanceTimersByTimeAsync(4000); });
      const after = proposalsSent().length;
      await act(async () => { await vi.advanceTimersByTimeAsync(4000); });

      expect(errors).toHaveBeenCalledWith('Ensure proposal error:', expect.objectContaining({ code: 'RateLimit' }));
      expect(proposalsSent().length).toBeGreaterThan(after);
    });

    it('falha no forget_all só é registrada', async () => {
      const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
      h.deriv.route = (p: any) => (p.forget_all ? Promise.reject(new Error('x')) : defaultRoute(p));
      await boot();

      expect(errors).toHaveBeenCalledWith('Forget all proposals error:', expect.any(Error));
    });
  });

  describe('martingale e stops', () => {
    it('multiplicador sobe a stake no loss e volta ao inicial no win', async () => {
      await boot();
      await startAuto();
      await digitTick(5);
      await poc(settledPoc(101, -0.35));
      await digitTick(5);
      expect(buysOf(h.deriv.send)[1].price).toBe(+(0.35 * 2.1).toFixed(2));

      await poc(settledPoc(102, 0.6));
      await digitTick(5);
      expect(buysOf(h.deriv.send)[2].price).toBe(0.35);
    });

    it('parcelado divide a dívida e quita com wins', async () => {
      await boot();
      await click('Parcelado');
      await typeInto('Quantidade de Parcelas', '2');
      await startAuto();

      await digitTick(5);
      await poc(settledPoc(101, -0.35));
      expect(logText()).toMatch(/parc: \$0.35 ÷ 2/);

      await digitTick(5);
      await poc(settledPoc(102, 0.1));
      expect(logText()).toMatch(/resta \$0.25 \(1 parc\)/);

      await digitTick(5);
      await poc(settledPoc(103, 0.5));
      expect(logText()).toMatch(/dívida quitada/);
      await digitTick(5);
      expect(buysOf(h.deriv.send).at(-1).price).toBe(0.35);
    });

    it('Stop Loss para o robô e bloqueia entradas seguintes', async () => {
      await boot();
      await typeInto('Stop Loss ($)', '0,3');
      await startAuto();
      await digitTick(5);

      await poc(settledPoc(101, -0.35));
      expect(toast.error).toHaveBeenCalledWith('Stop Loss Atingido!');
      expect(screen.getByText('Ligar Robô')).toBeDefined();

      await click('Manual');
      await click('Entrar Agora');
      expect(toast.error).toHaveBeenCalledWith('Stop Loss atingido');
      expect(buysOf(h.deriv.send)).toHaveLength(1);
    });

    it('Stop Win para o robô e bloqueia entradas seguintes', async () => {
      await boot();
      await typeInto('Stop Win ($)', '0.3');
      await typeInto('Martingale (Gale)', '2,5');
      await startAuto();
      await digitTick(5);

      await poc(settledPoc(101, 0.33));
      expect(toast.success).toHaveBeenCalledWith('Stop Win Atingido!');

      await click('Manual');
      await click('Entrar Agora');
      expect(toast.success).toHaveBeenCalledWith('Stop Win atingido');
      expect(buysOf(h.deriv.send)).toHaveLength(1);
    });
  });

  describe('loss virtual', () => {
    it('consecutivo: só entra após N perdas seguidas; win zera a contagem', async () => {
      await boot();
      await vlToggle();
      await startAuto();

      await digitTicks([1, 5, 1]);
      expect(buysOf(h.deriv.send)).toHaveLength(0);
      await digitTick(0);
      expect(buysOf(h.deriv.send)).toHaveLength(1);
    });

    it('entrada manual espera o loss virtual', async () => {
      await boot();
      await vlToggle();
      await typeInto('Qtd. Perdas', '1');

      await click('Entrar Agora');
      expect(toast.warn).toHaveBeenCalledWith('Aguardando loss virtual (0/1)');

      await digitTick(2);
      await click('Entrar Agora');
      await settle();
      expect(buysOf(h.deriv.send)).toHaveLength(1);
    });

    it('acumulado respeita a janela configurada', async () => {
      await boot();
      await vlToggle();
      await click('Acumulado');
      await typeInto('Janela Ticks', '3');
      await typeInto('Qtd. Perdas', '3');
      await startAuto();

      await digitTicks([1, 1, 5, 1]);
      expect(buysOf(h.deriv.send)).toHaveLength(0);
      await digitTicks([1]);
      expect(buysOf(h.deriv.send)).toHaveLength(0);
      await digitTicks([1]);
      expect(buysOf(h.deriv.send)).toHaveLength(1);
    });

    it('trocar de mercado no modo único zera o loss virtual', async () => {
      await boot();
      await vlToggle();
      await startAuto();
      await digitTick(1);

      await click('Volatilidade 75');
      await digitTick(1, 'R_75');

      expect(buysOf(h.deriv.send)).toHaveLength(0);
    });
  });

  describe('modos', () => {
    it('under compra DIGITUNDER com o dígito escolhido', async () => {
      await boot();
      await click('under');
      await act(async () => { fireEvent.click(screen.getAllByText('7').find((el) => el.tagName === 'BUTTON')!); });
      await startAuto();

      await digitTick(1);

      expect(buysOf(h.deriv.send)[0].parameters).toEqual(
        expect.objectContaining({ contract_type: 'DIGITUNDER', barrier: '7' })
      );
    });

    it('differ calcula o padrão A→B e compra DIGITDIFF', async () => {
      await boot();
      await click('differ');
      const seq: number[] = [];
      for (let i = 0; i < 90; i++) seq.push(i % 3 === 0 ? 1 : i % 3 === 1 ? 2 : (i * 7) % 10);
      await digitTicks(seq.slice(0, 5));
      await digitTicks(seq.slice(5));
      // Padrão novo, mais forte, disputa o atual.
      await digitTicks(Array.from({ length: 30 }, (_, i) => (i % 2 ? 8 : 4)));
      expect(logText()).toMatch(/× nos últimos 25/);

      await startAuto();
      await digitTick(5);

      expect(buysOf(h.deriv.send)[0].parameters).toEqual(expect.objectContaining({ contract_type: 'DIGITDIFF' }));
    });

    it('combo liquida as duas pernas como uma operação', async () => {
      await boot();
      await click('combo');
      await startAuto();
      await digitTick(5);

      await poc(settledPoc(101, -0.35));
      await poc(settledPoc(102, 0.3));

      const rows = Array.from(document.querySelectorAll('tbody tr')).filter((tr) => tr.children.length === 9);
      expect(rows).toHaveLength(1);
      expect(rows[0].children[2].textContent).toBe('COMBO');
      expect(rows[0].children[8].textContent).toBe('-$0.05');
    });
  });

  describe('multi-mercado', () => {
    it('automático escolhe o mercado candidato e compra nele', async () => {
      await boot();
      await click('Multi OFF');
      await startAuto();

      await digitTick(5, 'R_75');

      expect(buysOf(h.deriv.send)[0].parameters.underlying_symbol).toBe('R_75');
      expect(logText()).toContain('MULTI · R_75 escolhido');
    });

    it('manual troca o foco para o candidato, no máximo a cada 3s', async () => {
      await boot();
      await click('Multi OFF');

      await digitTick(5, 'R_75');
      expect(logText()).toContain('Foco em R_75');
      await digitTick(5, 'R_50');
      expect(logText()).not.toContain('Foco em R_50');

      await act(async () => { await vi.advanceTimersByTimeAsync(3100); });
      await digitTick(5, 'R_50');
      expect(logText()).toContain('Foco em R_50');
    });

    it('loss virtual por mercado: consecutivo e acumulado, com anomalia no score', async () => {
      await boot();
      await click('Multi OFF');
      await vlToggle();
      await startAuto();

      await digitTicks([1, 1], 'R_25');
      expect(buysOf(h.deriv.send)[0].parameters.underlying_symbol).toBe('R_25');
      await poc(settledPoc(101, 0.3));

      await click('Acumulado');
      await digitTicks(Array.from({ length: 14 }, () => 0), 'R_10');
      expect(buysOf(h.deriv.send).at(-1).parameters.underlying_symbol).toBe('R_10');
    });

    it('differ no multi também avalia o padrão por mercado', async () => {
      await boot();
      await click('differ');
      await click('Multi OFF');
      await startAuto();

      await digitTicks(Array.from({ length: 12 }, (_, i) => i % 10), 'RDBULL');

      expect(buysOf(h.deriv.send)[0].parameters).toEqual(
        expect.objectContaining({ contract_type: 'DIGITDIFF', underlying_symbol: 'RDBULL' })
      );
    });
  });

  describe('estatísticas, histórico e conta', () => {
    it('mostra qui-quadrado, exaustão e ranking dos mercados', async () => {
      await boot();
      await digitTicks(Array.from({ length: 60 }, () => 1));
      await digitTicks(Array.from({ length: 30 }, (_, i) => i % 10), 'R_75');

      expect(logText()).toMatch(/χ² \d+/);
      expect(logText()).toMatch(/· em 25/);
    });

    it('exporta CSV só quando há operações', async () => {
      const createObjectURL = vi.fn(() => 'blob:x');
      vi.stubGlobal('URL', Object.assign(URL, { createObjectURL, revokeObjectURL: vi.fn() }));
      await boot();

      await click('CSV');
      expect(toast.warn).toHaveBeenCalledWith('Nenhuma operação registrada para exportar');

      await startAuto();
      await digitTick(5);
      await poc(settledPoc(101, 0.33));
      await click('CSV');

      expect(createObjectURL).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith('Exportado 1 operações com sucesso!');
    });

    it('Reset limpa placar e histórico', async () => {
      await boot();
      await startAuto();
      await digitTick(5);
      await poc(settledPoc(101, 0.33));

      await click('Reset');

      expect(screen.getByText('Nenhum trade efetuado.')).toBeDefined();
      expect(logText()).toContain('Histórico e estatísticas resetados');
    });

    it('erro de áudio não derruba a liquidação', async () => {
      const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
      await boot();
      await startAuto();
      await digitTick(5);
      (window as any).AudioContext = class { constructor() { throw new Error('sem áudio'); } };

      await poc(settledPoc(101, 0.33));

      expect(errors).toHaveBeenCalledWith(expect.objectContaining({ message: 'sem áudio' }));
      expect(screen.getByText('WIN')).toBeDefined();
    });

    it('BBU-13: som desligado silencia o resultado da operação', async () => {
      await boot();
      await act(async () => { fireEvent.click(screen.getByText('Efeitos Sonoros').previousElementSibling!); });
      await startAuto();
      await digitTick(5);
      const created = vi.fn();
      (window as any).AudioContext = class { constructor() { created(); } };

      await poc(settledPoc(101, -0.35));

      expect(created).not.toHaveBeenCalled();
    });

    it('áudio suspenso é retomado antes de tocar', async () => {
      await boot();
      await startAuto();
      await digitTick(5);
      const resume = vi.fn();
      (window as any).AudioContext = class {
        state = 'suspended'; currentTime = 0; destination = {}; resume = resume;
        createOscillator() { return { type: '', frequency: { value: 0 }, connect() {}, start() {}, stop() {} }; }
        createGain() { return { connect() {}, gain: { setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} } }; }
      };
      await poc(settledPoc(101, -0.35));

      expect(resume).toHaveBeenCalled();
    });

    it('troca de conta: sucesso, falha e conta sem token', async () => {
      await boot();
      await click('Real');
      expect(h.deriv.switchAccount).toHaveBeenCalledWith('oauth:A:CR1');
      expect(toast.success).toHaveBeenCalledWith('Conta alterada com sucesso!');

      h.deriv.switchAccount.mockRejectedValueOnce(new Error('sem OTP'));
      await click('Demo');
      expect(toast.error).toHaveBeenCalledWith('Falha ao alterar conta: sem OTP');

      await act(async () => {
        h.deriv.observerInstance.emit('account.update', {
          ...JSON.parse(localStorage.getItem('deriv_accounts')!)[0],
          tokens: [{ token: 'oauth:A:VRTC1', is_virtual: true, balance: 1 }],
        });
      });
      await click('Real');
      expect(toast.error).toHaveBeenCalledWith('Nenhum token configurado para conta Real');
    });

    it('sem conta conectada mostra o aviso e não compra', async () => {
      await boot();
      await startAuto();

      await act(async () => { h.deriv.observerInstance.emit('account.update', null); });
      expect(screen.getByText(/Sua conta Deriv não está conectada/)).toBeDefined();
      await digitTick(5);

      expect(toast.error).toHaveBeenCalledWith('Por favor, conecte a API');
      expect(buysOf(h.deriv.send)).toHaveLength(0);
    });

    it('sem conta salva, a tela abre desconectada', async () => {
      localStorage.clear();
      await boot();

      expect(screen.getByText('DESCONECTADO')).toBeDefined();
    });
  });
});
