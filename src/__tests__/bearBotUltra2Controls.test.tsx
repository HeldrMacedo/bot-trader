// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act, cleanup, fireEvent, screen } from '@testing-library/react';
import React from 'react';
import { installStorage, seedHomeAccount } from './homeTestDeriv';
import { createBearDeriv, stubAudio, tick, settledPoc, openPoc, buysOf } from './bearBotUltraTestHarness';

const h = vi.hoisted(() => ({ deriv: null as any, engines: [] as any[] }));

vi.mock('@/app/services/DerivService', () => ({
  DerivService: { getInstance: () => h.deriv },
}));
vi.mock('../app/services/DerivService', () => ({
  DerivService: { getInstance: () => h.deriv },
}));
vi.mock('react-toastify', () => ({
  toast: { error: vi.fn(), success: vi.fn(), warn: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));
// Motor real; a instância fica acessível para conferir a configuração aplicada.
vi.mock('../app/services/BearBot2Engine', async (importOriginal) => {
  const orig: any = await importOriginal();
  return {
    ...orig,
    createEngine: (config?: any) => {
      const engine = orig.createEngine(config);
      h.engines.push(engine);
      return engine;
    },
  };
});

import { toast } from 'react-toastify';
import BearBotUltra2 from '../app/(withSidebar)/bear-bot-ultra-2/bearBotUltra2';

let contractSeq = 100;
function defaultRoute(p: any): Promise<any> {
  if (p.buy !== undefined) {
    return Promise.resolve({ msg_type: 'buy', buy: { contract_id: ++contractSeq, buy_price: p.price } });
  }
  if (p.proposal) return new Promise(() => {});
  return Promise.resolve({});
}

const cfg = () => h.engines[0].getConfig();
const click = (el: Element) => act(async () => { fireEvent.click(el); });
const clickText = (text: string | RegExp) => click(screen.getByText(text));
const clickTestId = (id: string) => click(screen.getByTestId(id));
const inputOf = (label: string) => screen.getByText(label).parentElement!.querySelector('input')!;
const change = (label: string, value: string) =>
  act(async () => { fireEvent.change(inputOf(label), { target: { value } }); });
const blur = (label: string) => act(async () => { fireEvent.blur(inputOf(label)); });
const poc = (msg: any) =>
  act(async () => { h.deriv.observerInstance.emit('deriv.proposal_open_contract', msg); await vi.advanceTimersByTimeAsync(0); });

async function boot() {
  render(<BearBotUltra2 />);
  await act(async () => { await vi.advanceTimersByTimeAsync(100); });
}

describe('Bear Bot Ultra 2 — controles da tela', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    installStorage();
    seedHomeAccount();
    stubAudio();
    contractSeq = 100;
    h.engines = [];
    h.deriv = createBearDeriv();
    h.deriv.route = defaultRoute;
    vi.mocked(toast.error).mockClear();
    vi.mocked(toast.success).mockClear();
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  describe('conta e conexão', () => {
    it('troca de conta sem ordem viva: aborta, troca e avisa', async () => {
      await boot();
      await clickText('Real');

      expect(h.deriv.switchAccount).toHaveBeenCalledWith('oauth:A:CR1');
      expect(toast.success).toHaveBeenCalledWith('Conta alterada com sucesso!');
    });

    it('troca de conta desliga o robô e o Paper antes de trocar', async () => {
      await boot();
      await clickText('Automático');
      await act(async () => { h.engines[0].updateConfig({ autoOn: true, paperMode: true }); });

      await clickText('Real');

      expect(cfg().autoOn).toBe(false);
      expect(cfg().paperMode).toBe(false);
    });

    it('falha na troca de conta vira toast de erro', async () => {
      h.deriv.switchAccount.mockRejectedValueOnce(new Error('sem OTP'));
      await boot();

      await clickText('Demo');

      expect(toast.error).toHaveBeenCalledWith('Falha ao alterar conta: sem OTP');
    });

    it('conta sem token do tipo pedido avisa', async () => {
      await boot();
      await act(async () => {
        h.deriv.observerInstance.emit('account.update', {
          activeToken: 'oauth:A:VRTC1',
          tokens: [{ token: 'oauth:A:VRTC1', is_virtual: true, balance: 1 }],
        });
      });

      await clickText('Real');

      expect(toast.error).toHaveBeenCalledWith('Nenhum token configurado para conta Real');
    });

    it('BB2-08: troca de conta com contrato aberto é recusada sem zerar nada', async () => {
      await boot();
      await clickText('Entrar Agora');
      await act(async () => { await vi.advanceTimersByTimeAsync(0); });
      await poc(openPoc(101));

      await clickText('Real');

      expect(h.deriv.switchAccount).not.toHaveBeenCalled();
      expect(toast.error).toHaveBeenCalledWith('Há contrato em aberto. Aguarde a liquidação antes de trocar de conta.');
      expect(h.engines[0].getState().tradeLock).toBe(true);
    });

    it('BB2-02: indicador mostra OFFLINE quando o canal de trade cai, exceto no Paper', async () => {
      await boot();
      expect(screen.getByText('● ONLINE')).toBeDefined();

      await act(async () => { h.deriv.observerInstance.emit('trade.status', false); });
      expect(screen.getByText('● OFFLINE')).toBeDefined();

      await act(async () => { h.engines[0].updateConfig({ paperMode: true }); });
      expect(screen.getByText('● ONLINE')).toBeDefined();
    });
  });

  describe('execução', () => {
    it('Paper, Manual/Automático, som e Multi alteram a configuração', async () => {
      await boot();
      await click(screen.getByText('Paper Trading').closest('div')!.parentElement!.parentElement!.querySelector('button')!);
      expect(cfg().paperMode).toBe(true);

      await clickText('Automático');
      expect(cfg().exec).toBe('auto');
      await clickText('Manual');
      expect(cfg().exec).toBe('manual');

      const soundBefore = cfg().soundOn;
      await click(screen.getByText('Som').parentElement!.querySelector('button')!);
      expect(cfg().soundOn).toBe(!soundBefore);

      await clickTestId('toggle-multi-market');
      expect(cfg().multiOn).toBe(true);
    });

    it('Entrar Agora compra e Zerar Gale aborta', async () => {
      await boot();
      await clickText('Entrar Agora');
      await act(async () => { await vi.advanceTimersByTimeAsync(0); });
      expect(buysOf(h.deriv.send)).toHaveLength(1);

      await poc(settledPoc(101, -0.35));
      expect(h.engines[0].getState().galeLevel).toBe(1);
      await clickText('Zerar Gale');
      expect(h.engines[0].getState().galeLevel).toBe(0);
    });

    it('robô automático liga com score medido, desliga e aborta', async () => {
      await boot();
      await clickText('Automático');
      await act(async () => {
        for (let i = 0; i < 60; i++) tick(h.deriv, 'R_100', 120 + (i % 10));
        await vi.advanceTimersByTimeAsync(0);
      });

      await clickText(/Ligar Robô/);
      expect(cfg().autoOn).toBe(true);
      await clickText(/Desligar Robô/);
      expect(cfg().autoOn).toBe(false);
      await clickText(/Ligar Robô/);
      await clickText('Pausar / Abortar');
      expect(cfg().autoOn).toBe(false);
    });
  });

  describe('estratégia', () => {
    it('modos, dígito e combo', async () => {
      await boot();
      await clickText('under');
      expect(cfg().mode).toBe('under');
      await click(screen.getAllByText('7').find((el) => el.tagName === 'BUTTON')!);
      expect(cfg().digit).toBe(7);

      await clickText('combo');
      expect(cfg().mode).toBe('combo');
      const comboButtons = (label: RegExp) =>
        Array.from(screen.getByText(label).parentElement!.parentElement!.querySelectorAll('button'));
      await click(comboButtons(/^UNDER \(/).find((b) => b.textContent === '6')!);
      expect(cfg().comboUnder).toBe(6);
      expect(cfg().comboOver).toBeGreaterThanOrEqual(6);
      await click(comboButtons(/^OVER \(/).find((b) => b.textContent === '3')!);
      expect(cfg().comboOver).toBe(3);
      expect(cfg().comboUnder).toBeLessThanOrEqual(3);
    });

    it('differ: dígito dinâmico, dígito automático e padrão A→B', async () => {
      await boot();
      await clickText('differ');

      await clickTestId('toggle-dynamic-digit');
      expect(cfg().differDynamicDigit).toBe(true);
      expect(screen.getByText(/RADAR DE DÍGITOS DINÂMICOS/)).toBeDefined();
      await clickTestId('toggle-dynamic-digit');
      expect(cfg().differDynamicDigit).toBe(false);

      await clickTestId('toggle-loss-virtual');
      await clickTestId('toggle-auto-digit');
      expect(cfg().differAutoDigit).toBe(true);
      await clickTestId('toggle-auto-digit');

      await clickTestId('toggle-pattern-ab');
      expect(cfg().patTrigger).toBe(true);
      await clickText('Sequência');
      expect(cfg().patMode).toBe('seq');
      await click(screen.getByText('Modo de contagem').parentElement!.querySelectorAll('button')[0]);
      expect(cfg().patMode).toBe('accum');
      await change('Repetições', '5');
      expect(cfg().patReps).toBe(5);
      await change('Repetições', '');
      expect(cfg().patReps).toBe(1);
      await change('Força mín. (%)', '45');
      expect(cfg().patMinForce).toBe(45);
      await change('Força mín. (%)', '');
      expect(cfg().patMinForce).toBe(30);
    });
  });

  describe('valores e limites', () => {
    it('stake, gale, stop loss e stop win aceitam vírgula e limitam no blur', async () => {
      await boot();
      await change('Entrada Inicial', '1,5');
      expect(cfg().stake).toBe(1.5);
      await change('Entrada Inicial', '2.');
      expect(cfg().stake).toBe(1.5);
      await change('Entrada Inicial', '5000');
      await blur('Entrada Inicial');
      expect(cfg().stake).toBe(1000);
      await change('Entrada Inicial', '0');
      await blur('Entrada Inicial');
      expect(cfg().stake).toBe(0.01);
      await change('Entrada Inicial', '1.2.3');
      expect(inputOf('Entrada Inicial').value).toBe('1.23');

      await change('Martingale', '3');
      expect(cfg().gale).toBe(3);
      await change('Martingale', '0');
      await blur('Martingale');
      expect(cfg().gale).toBe(1);
      await change('Martingale', '999999');
      await blur('Martingale');
      expect(cfg().gale).toBe(99999);

      await change('Stop Loss ($)', '15');
      expect(cfg().stopLoss).toBe(15);
      await change('Stop Loss ($)', '0');
      await blur('Stop Loss ($)');
      expect(cfg().stopLoss).toBe(1);
      await change('Stop Loss ($)', '999999');
      await blur('Stop Loss ($)');
      expect(cfg().stopLoss).toBe(99999);

      await change('Stop Win ($)', '25');
      expect(cfg().stopWin).toBe(25);
      await change('Stop Win ($)', '0');
      await blur('Stop Win ($)');
      expect(cfg().stopWin).toBe(1);
      await change('Stop Win ($)', '999999');
      await blur('Stop Win ($)');
      expect(cfg().stopWin).toBe(99999);
    });

    it('valores mudados pelo motor voltam para os campos', async () => {
      await boot();
      await act(async () => { h.engines[0].updateConfig({ stake: 2, gale: 3, stopLoss: 7, stopWin: 9 }); });

      expect(inputOf('Entrada Inicial').value).toBe('2');
      expect(inputOf('Martingale').value).toBe('3');
      expect(inputOf('Stop Loss ($)').value).toBe('7');
      expect(inputOf('Stop Win ($)').value).toBe('9');
    });

    it('martingale parcelado, loss virtual e limites de ritmo', async () => {
      await boot();
      await clickText('Parcelado');
      expect(cfg().galeMode).toBe('parc');
      await change('Parcelas', '4');
      expect(cfg().galeParcels).toBe(4);
      await clickText('Multiplicador');
      expect(cfg().galeMode).toBe('mult');

      await clickTestId('toggle-loss-virtual');
      expect(cfg().vlOn).toBe(true);
      await clickText('Acumulado');
      expect(cfg().vlMode).toBe('accum');
      await change('Janela', '20');
      expect(cfg().vlWindow).toBe(20);
      await change('Qtd. Perdas', '3');
      expect(cfg().vlQty).toBe(3);
      await clickText('Consecutivo');
      expect(cfg().vlMode).toBe('consec');

      await clickTestId('toggle-multi-market');
      await clickTestId('toggle-vl-focus-only');
      expect(cfg().vlFocusOnly).toBe(true);

      await change('Máx. trades/hora', '30');
      expect(cfg().maxTradesHour).toBe(30);
      await change('Cooldown (ms)', '0');
      expect(cfg().tradeCooldownMs).toBe(0);
      await change('Cooldown (ms)', 'abc');
      expect(cfg().tradeCooldownMs).toBe(0);
    });

    it('pós-loss: recuperar e analisar', async () => {
      await boot();
      await click(screen.getByText('🔁 PÓS-LOSS').parentElement!.querySelector('button')!);
      expect(cfg().postLossOn).toBe(true);

      await clickText('🔥 Recuperar');
      expect(cfg().postLossMode).toBe('recover');
      await change('Máx. tentativas', '4');
      expect(cfg().recoverMaxAttempts).toBe(4);
      await change('Delay (ms)', '2000');
      expect(cfg().recoverDelay).toBe(2000);

      await clickText('🧠 Analisar');
      expect(cfg().postLossMode).toBe('analyze');
      await change('Cooldown (seg)', '10');
      expect(cfg().cooldownSec).toBe(10);
    });
  });

  describe('histórico', () => {
    it('mostra operações liquidadas e exporta CSV', async () => {
      const createObjectURL = vi.fn(() => 'blob:x');
      vi.stubGlobal('URL', Object.assign(URL, { createObjectURL, revokeObjectURL: vi.fn() }));
      await boot();
      await clickText('Entrar Agora');
      await act(async () => { await vi.advanceTimersByTimeAsync(0); });
      await poc(settledPoc(101, 0.33));

      expect(screen.getAllByText('WIN').length).toBeGreaterThan(0);
      await click(screen.getByTitle('Exportar CSV'));
      expect(createObjectURL).toHaveBeenCalled();

      await click(screen.getByTitle('Limpar Histórico'));
      expect(h.engines[0].getState().trades).toHaveLength(0);
    });

    it('CSV sem operações não gera arquivo', async () => {
      const createObjectURL = vi.fn(() => 'blob:x');
      vi.stubGlobal('URL', Object.assign(URL, { createObjectURL, revokeObjectURL: vi.fn() }));
      await boot();

      await click(screen.getByTitle('Exportar CSV'));

      expect(createObjectURL).not.toHaveBeenCalled();
    });
  });
});
