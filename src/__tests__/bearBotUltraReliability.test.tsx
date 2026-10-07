// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act, cleanup, fireEvent, screen } from '@testing-library/react';
import React from 'react';
import { installStorage, seedHomeAccount } from './homeTestDeriv';
import {
  createBearDeriv,
  deferred,
  stubAudio,
  tick,
  settledPoc,
  openPoc,
  startAuto,
  buysOf,
} from './bearBotUltraTestHarness';

const h = vi.hoisted(() => ({ deriv: null as any }));

vi.mock('@/app/services/DerivService', () => ({
  DerivService: { getInstance: () => h.deriv },
}));
vi.mock('react-toastify', () => ({
  toast: { error: vi.fn(), success: vi.fn(), warn: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));

import { toast } from 'react-toastify';
import BearBotUltra from '../app/(withSidebar)/bear-bot-ultra/bearBotUltra';

// Rede padrão: compra aceita com contract_id sequencial; propostas nunca ficam
// prontas (a compra sai por parâmetros), demais requisições respondem vazio.
let contractSeq = 100;
function defaultRoute(p: any): Promise<any> {
  if (p.buy !== undefined) {
    return Promise.resolve({ msg_type: 'buy', buy: { contract_id: ++contractSeq, buy_price: p.price } });
  }
  if (p.proposal) return new Promise(() => {});
  return Promise.resolve({});
}

const settle = () => act(async () => { await vi.advanceTimersByTimeAsync(0); });
const emit = async (fn: () => void) => act(async () => { fn(); await vi.advanceTimersByTimeAsync(0); });
const marketTick = () => emit(() => tick(h.deriv, 'R_100', 1234.57));
const poc = (msg: any) => emit(() => h.deriv.observerInstance.emit('deriv.proposal_open_contract', msg));
const tradeRows = () =>
  Array.from(document.querySelectorAll('tbody tr')).filter((tr) => tr.children.length === 9);
const sentAfter = (from: number, pred: (p: any) => boolean) =>
  h.deriv.send.mock.calls.slice(from).map((c: any[]) => c[0]).filter(pred);

async function boot() {
  render(<BearBotUltra />);
  await act(async () => { await vi.advanceTimersByTimeAsync(100); });
}

// Robô ligado e com um contrato comprado (contract_id 101) ainda aberto.
async function bootWithOpenContract() {
  await boot();
  await startAuto();
  await marketTick();
  expect(buysOf(h.deriv.send)).toHaveLength(1);
  await poc(openPoc(101));
}

describe('Bear Bot Ultra — confiabilidade de ordens', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    installStorage();
    seedHomeAccount();
    stubAudio();
    contractSeq = 100;
    h.deriv = createBearDeriv();
    h.deriv.route = defaultRoute;
    vi.mocked(toast.error).mockClear();
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('BBU-03: compra sem confirmação da corretora não libera nova ordem', async () => {
    h.deriv.route = (p: any) =>
      p.buy !== undefined
        ? Promise.reject({ code: 'BuyUnconfirmed', message: 'A corretora não confirmou a compra.' })
        : defaultRoute(p);
    await boot();
    await startAuto();

    await marketTick();
    await marketTick();

    expect(buysOf(h.deriv.send)).toHaveLength(1);
  });

  it('BBU-03: compra não confirmada para o robô; só o Abortar libera nova entrada', async () => {
    let first = true;
    h.deriv.route = (p: any) => {
      if (p.buy !== undefined && first) {
        first = false;
        return Promise.reject({ code: 'BuyUnconfirmed', message: 'A corretora não confirmou a compra.' });
      }
      return defaultRoute(p);
    };
    await boot();
    await startAuto();
    await marketTick();
    expect(screen.queryByText('Desligar Robô')).toBeNull();

    await act(async () => { fireEvent.click(screen.getByText('Manual')); });
    await act(async () => { fireEvent.click(screen.getByText('Entrar Agora')); });
    await settle();
    expect(buysOf(h.deriv.send)).toHaveLength(1);

    await act(async () => { fireEvent.click(screen.getByText('Zerar Gale')); });
    await act(async () => { fireEvent.click(screen.getByText('Entrar Agora')); });
    await settle();
    expect(buysOf(h.deriv.send)).toHaveLength(2);
  });

  it('BBU-03: compra recusada pela corretora libera a próxima entrada', async () => {
    let first = true;
    h.deriv.route = (p: any) => {
      if (p.buy !== undefined && first) {
        first = false;
        return Promise.reject({ code: 'InvalidContractProposal', message: 'recusada' });
      }
      return defaultRoute(p);
    };
    await boot();
    await startAuto();

    await marketTick();
    await marketTick();

    expect(buysOf(h.deriv.send)).toHaveLength(2);
    expect(screen.getByText(/Erro na compra: recusada/)).toBeDefined();
  });

  it('BBU-04: sem resultado do contrato no prazo, o robô para em vez de travar calado', async () => {
    h.deriv.route = (p: any) => (p.proposal_open_contract ? new Promise(() => {}) : defaultRoute(p));
    await boot();
    await startAuto();
    await marketTick();
    expect(buysOf(h.deriv.send)).toHaveLength(1);

    await act(async () => { await vi.advanceTimersByTimeAsync(5 * 60_000); });

    expect(screen.queryByText('Desligar Robô')).toBeNull();
    expect(toast.error).toHaveBeenCalled();
  });

  it('BBU-04: assinatura do resultado do contrato tem tratamento de erro', async () => {
    const handled = { poc: false };
    h.deriv.route = (p: any) => {
      if (p.proposal_open_contract) {
        // Thenable que registra se alguém tratou a rejeição.
        return {
          then(_ok: any, fail?: any) { if (fail) handled.poc = true; return new Promise(() => {}); },
          catch() { handled.poc = true; return new Promise(() => {}); },
        } as any;
      }
      return defaultRoute(p);
    };
    await boot();
    await startAuto();
    await marketTick();

    expect(handled.poc).toBe(true);
  });

  it('BBU-04: contrato liquidado no prazo não para o robô depois', async () => {
    await bootWithOpenContract();
    await poc(settledPoc(101, 0.33));

    await act(async () => { await vi.advanceTimersByTimeAsync(5 * 60_000); });

    expect(screen.getByText('Desligar Robô')).toBeDefined();
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('BBU-04: após o prazo, consulta o contrato e liquida se a corretora já fechou', async () => {
    h.deriv.route = (p: any) => {
      if (p.proposal_open_contract && p.subscribe) return new Promise(() => {});
      if (p.proposal_open_contract) {
        queueMicrotask(() => h.deriv.observerInstance.emit('deriv.proposal_open_contract', settledPoc(p.contract_id, -0.35)));
        return Promise.resolve(settledPoc(p.contract_id, -0.35));
      }
      return defaultRoute(p);
    };
    await boot();
    await startAuto();
    await marketTick();

    await act(async () => { await vi.advanceTimersByTimeAsync(60_000); });

    expect(screen.queryByText('Desligar Robô')).toBeNull();
    expect(tradeRows()).toHaveLength(1);
    expect(tradeRows()[0].children[7].textContent).toBe('LOSS');
  });

  it('BBU-04: falha na consulta após o prazo fica registrada no log', async () => {
    h.deriv.route = (p: any) => {
      if (p.proposal_open_contract && p.subscribe) return Promise.reject({ message: 'Connection closed' });
      if (p.proposal_open_contract) return Promise.reject({ message: 'Timeout' });
      return defaultRoute(p);
    };
    await boot();
    await startAuto();
    await marketTick();
    expect(screen.getByText(/Falha ao acompanhar contrato 101: Connection closed/)).toBeDefined();

    await act(async () => { await vi.advanceTimersByTimeAsync(60_000); });

    expect(screen.getByText(/Consulta do contrato 101 falhou: Timeout/)).toBeDefined();
  });

  it('BBU-04: prazo do resultado não dispara depois que a tela é desmontada', async () => {
    await bootWithOpenContract();

    cleanup();
    await act(async () => { await vi.advanceTimersByTimeAsync(5 * 60_000); });

    expect(toast.error).not.toHaveBeenCalled();
  });

  it('BBU-01: assina o resultado via subscribe() e cancela o stream ao liquidar', async () => {
    await bootWithOpenContract();
    expect(h.deriv.subscribe).toHaveBeenCalledWith({ proposal_open_contract: 1, contract_id: 101 });

    await poc({ ...settledPoc(101, 0.33), subscription: { id: 'poc-sub-101' } });

    expect(h.deriv.send).toHaveBeenCalledWith(expect.objectContaining({ forget: 'poc-sub-101' }));
  });

  it('BBU-01: combo acompanha as duas pernas via subscribe()', async () => {
    await boot();
    await act(async () => { fireEvent.click(screen.getByText('combo')); });
    await startAuto();
    await marketTick();

    expect(h.deriv.subscribe).toHaveBeenCalledWith({ proposal_open_contract: 1, contract_id: 101 });
    expect(h.deriv.subscribe).toHaveBeenCalledWith({ proposal_open_contract: 1, contract_id: 102 });
  });

  it('BBU-05: resultado duplicado do mesmo contrato conta uma vez só', async () => {
    await bootWithOpenContract();

    await poc(settledPoc(101, 0.33));
    await poc(settledPoc(101, 0.33));

    expect(tradeRows()).toHaveLength(1);
  });

  it('BBU-05: mensagem de contrato ainda aberto não marca o contrato como liquidado', async () => {
    await bootWithOpenContract();

    await poc(openPoc(101, { is_valid_to_sell: 1 }));
    await poc(settledPoc(101, 0.33));

    expect(tradeRows()).toHaveLength(1);
  });

  it('BBU-05: resultado sem audit_details não descarta a liquidação seguinte', async () => {
    await bootWithOpenContract();

    const { audit_details, ...semAuditoria } = settledPoc(101, 0.33).proposal_open_contract;
    await poc({ msg_type: 'proposal_open_contract', proposal_open_contract: semAuditoria });
    await poc(settledPoc(101, 0.33));

    expect(tradeRows()).toHaveLength(1);
  });

  it('BBU-05: auditoria incompleta não impede a liquidação do contrato', async () => {
    await bootWithOpenContract();

    await poc(settledPoc(101, 0.33, {
      audit_details: { all_ticks: [{ epoch: 1, tick: 1234.57, tick_display_value: '1234.57' }] },
    }));

    expect(tradeRows()).toHaveLength(1);
  });

  it('BBU-06: contrato que o robô não comprou não entra no placar', async () => {
    await boot();

    await poc(settledPoc(777, -0.35));

    expect(tradeRows()).toHaveLength(0);
    expect(screen.getByText('+$0')).toBeDefined();
  });

  it('BBU-06: contrato alheio liquidado não libera a trava do contrato do robô', async () => {
    await bootWithOpenContract();

    await poc(settledPoc(777, 0.33));
    await marketTick();

    expect(buysOf(h.deriv.send)).toHaveLength(1);
  });

  it('BBU-07: combo com uma perna recusada ainda acompanha a perna comprada', async () => {
    h.deriv.route = (p: any) => {
      if (p.buy !== undefined && p.parameters?.contract_type === 'DIGITUNDER') {
        return Promise.reject({ code: 'ContractBuyValidationError', message: 'recusada' });
      }
      return defaultRoute(p);
    };
    await boot();
    await act(async () => { fireEvent.click(screen.getByText('combo')); });
    await startAuto();

    await marketTick();

    const legs = buysOf(h.deriv.send);
    expect(legs).toHaveLength(2);
    expect(h.deriv.subscribe).toHaveBeenCalledWith({ proposal_open_contract: 1, contract_id: 101 });
  });

  it('BBU-08: Reset com contrato aberto não libera segunda ordem', async () => {
    await bootWithOpenContract();

    await act(async () => { fireEvent.click(screen.getByText('Reset')); });
    await marketTick();

    expect(buysOf(h.deriv.send)).toHaveLength(1);
  });

  it('BBU-08: Abortar com contrato aberto não libera entrada manual', async () => {
    await bootWithOpenContract();

    await act(async () => { fireEvent.click(screen.getByText('Pausar / Abortar')); });
    await act(async () => { fireEvent.click(screen.getByText('Manual')); });
    await act(async () => { fireEvent.click(screen.getByText('Entrar Agora')); });
    await settle();

    expect(buysOf(h.deriv.send)).toHaveLength(1);
  });

  it('BBU-07: perna única do combo liquida o combo e libera a trava', async () => {
    h.deriv.route = (p: any) => {
      if (p.buy !== undefined && p.parameters?.contract_type === 'DIGITUNDER') {
        return Promise.reject({ code: 'ContractBuyValidationError', message: 'recusada' });
      }
      return defaultRoute(p);
    };
    await boot();
    await act(async () => { fireEvent.click(screen.getByText('combo')); });
    await startAuto();
    await marketTick();
    expect(screen.getByText(/COMBO parcial/)).toBeDefined();

    await poc(settledPoc(101, 0.15));
    expect(tradeRows()).toHaveLength(1);
    expect(tradeRows()[0].children[2].textContent).toBe('COMBO');

    await marketTick();
    expect(buysOf(h.deriv.send)).toHaveLength(4);
  });

  it('BBU-07: combo com as duas pernas recusadas libera a trava', async () => {
    h.deriv.route = (p: any) =>
      p.buy !== undefined ? Promise.reject({ code: 'MarketIsClosed', message: 'fechado' }) : defaultRoute(p);
    await boot();
    await act(async () => { fireEvent.click(screen.getByText('combo')); });
    await startAuto();

    await marketTick();
    await marketTick();

    expect(buysOf(h.deriv.send)).toHaveLength(4);
  });

  it('BBU-07: combo com perna não confirmada para o robô', async () => {
    h.deriv.route = (p: any) => {
      if (p.buy !== undefined && p.parameters?.contract_type === 'DIGITUNDER') {
        return Promise.reject({ code: 'BuyUnconfirmed', message: 'A corretora não confirmou a compra.' });
      }
      return defaultRoute(p);
    };
    await boot();
    await act(async () => { fireEvent.click(screen.getByText('combo')); });
    await startAuto();
    await marketTick();

    await poc(settledPoc(101, 0.15));
    await marketTick();

    expect(screen.queryByText('Desligar Robô')).toBeNull();
    expect(buysOf(h.deriv.send)).toHaveLength(2);
  });

  it('BBU-08: trocar de conta com contrato aberto é recusado sem zerar nada', async () => {
    await bootWithOpenContract();

    await act(async () => { fireEvent.click(screen.getByText('Real')); });
    await marketTick();

    expect(h.deriv.switchAccount).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith('Há contrato em aberto. Aguarde a liquidação antes de trocar de conta.');
    expect(screen.getByText('Desligar Robô')).toBeDefined();
    expect(buysOf(h.deriv.send)).toHaveLength(1);
  });

  it('BBU-08: compra aguardando resposta também segura a trava no Abortar', async () => {
    const buy = deferred();
    h.deriv.route = (p: any) => (p.buy !== undefined ? buy.promise : defaultRoute(p));
    await boot();
    await startAuto();
    await marketTick();

    await act(async () => { fireEvent.click(screen.getByText('Pausar / Abortar')); });
    await act(async () => { fireEvent.click(screen.getByText('Manual')); });
    await act(async () => { fireEvent.click(screen.getByText('Entrar Agora')); });
    await settle();

    expect(buysOf(h.deriv.send)).toHaveLength(1);
    expect(screen.getByText(/a trava sai na liquidação/)).toBeDefined();
  });

  it('BBU-08: contrato liquidado depois do Abortar libera a trava', async () => {
    await bootWithOpenContract();
    await act(async () => { fireEvent.click(screen.getByText('Pausar / Abortar')); });

    await poc(settledPoc(101, 0.33));
    await act(async () => { fireEvent.click(screen.getByText('Manual')); });
    await act(async () => { fireEvent.click(screen.getByText('Entrar Agora')); });
    await settle();

    expect(buysOf(h.deriv.send)).toHaveLength(2);
  });

  it('BBU-08: depois do prazo do resultado, o Abortar libera a trava', async () => {
    h.deriv.route = (p: any) => (p.proposal_open_contract ? new Promise(() => {}) : defaultRoute(p));
    await boot();
    await startAuto();
    await marketTick();
    await act(async () => { await vi.advanceTimersByTimeAsync(60_000); });

    await act(async () => { fireEvent.click(screen.getByText('Pausar / Abortar')); });
    await act(async () => { fireEvent.click(screen.getByText('Manual')); });
    await act(async () => { fireEvent.click(screen.getByText('Entrar Agora')); });
    await settle();

    expect(buysOf(h.deriv.send)).toHaveLength(2);
  });

  it('BBU-08: resultado atrasado de contrato abandonado não solta a trava da ordem nova', async () => {
    h.deriv.route = (p: any) => (p.proposal_open_contract ? new Promise(() => {}) : defaultRoute(p));
    await boot();
    await startAuto();
    await marketTick();
    await act(async () => { await vi.advanceTimersByTimeAsync(60_000); });
    await act(async () => { fireEvent.click(screen.getByText('Pausar / Abortar')); });
    await act(async () => { fireEvent.click(screen.getByText('Manual')); });
    await act(async () => { fireEvent.click(screen.getByText('Entrar Agora')); });
    await settle();
    expect(buysOf(h.deriv.send)).toHaveLength(2);

    await poc(settledPoc(101, -0.35));
    await act(async () => { fireEvent.click(screen.getByText('Entrar Agora')); });
    await settle();

    expect(tradeRows()).toHaveLength(1);
    expect(buysOf(h.deriv.send)).toHaveLength(2);
  });

  it('BBU-09: liquidação registra stake e mercado da compra, não os editados depois', async () => {
    await bootWithOpenContract();

    await act(async () => {
      fireEvent.change(screen.getByDisplayValue('0.35'), { target: { value: '5' } });
    });
    await act(async () => { fireEvent.click(screen.getByText('Volatilidade 75')); });
    await poc(settledPoc(101, 0.33));

    const [row] = tradeRows();
    expect(row.children[1].textContent).toBe('R_100');
    expect(row.children[6].textContent).toBe('$0.35');
  });

  it('BBU-10: tick logo após Desligar Robô não dispara ordem', async () => {
    await boot();
    await startAuto();

    await act(async () => {
      fireEvent.click(screen.getByText('Desligar Robô'));
      tick(h.deriv, 'R_100', 1234.57);
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(buysOf(h.deriv.send)).toHaveLength(0);
  });

  it('BBU-09: alvo e lucro por stake vêm da compra', async () => {
    await bootWithOpenContract();

    await act(async () => { fireEvent.click(screen.getAllByText('7').find((el) => el.tagName === 'BUTTON')!); });
    await poc(settledPoc(101, 0.33));

    expect(tradeRows()[0].children[3].textContent).toBe('2');
  });

  it('BBU-10: Abortar também vale para o tick seguinte', async () => {
    await boot();
    await startAuto();

    await act(async () => {
      fireEvent.click(screen.getByText('Pausar / Abortar'));
      tick(h.deriv, 'R_100', 1234.57);
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(buysOf(h.deriv.send)).toHaveLength(0);
  });

  it('BBU-11: compra de combo confirmada depois do unmount não abre acompanhamento', async () => {
    const buy = deferred();
    h.deriv.route = (p: any) => (p.buy !== undefined ? buy.promise : defaultRoute(p));
    await boot();
    await act(async () => { fireEvent.click(screen.getByText('combo')); });
    await startAuto();
    await marketTick();

    cleanup();
    await act(async () => {
      buy.resolve({ msg_type: 'buy', buy: { contract_id: 101, buy_price: 0.35 } });
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(h.deriv.subscribe).not.toHaveBeenCalledWith(expect.objectContaining({ proposal_open_contract: 1 }));
  });

  it('BBU-11: nada assina propostas depois que a tela é desmontada', async () => {
    const buy = deferred();
    h.deriv.route = (p: any) => {
      if (p.buy !== undefined) return buy.promise;
      if (p.proposal) {
        // Proposta pronta: a compra sai pelo id e, ao confirmar, reabre outra.
        queueMicrotask(() => h.deriv.observerInstance.emit('message', {
          msg_type: 'proposal', proposal: { id: 'P-1' }, passthrough: p.passthrough,
        }));
        return Promise.resolve({});
      }
      return defaultRoute(p);
    };
    await boot();
    await startAuto();
    await marketTick();

    cleanup();
    const from = h.deriv.send.mock.calls.length;
    await act(async () => {
      buy.resolve({ msg_type: 'buy', buy: { contract_id: 101, buy_price: 0.35 } });
      await vi.advanceTimersByTimeAsync(5000);
    });

    expect(sentAfter(from, (p) => p.proposal === 1)).toHaveLength(0);
  });

  it('BBU-11: o refresh agendado na liquidação não roda depois do unmount', async () => {
    await bootWithOpenContract();
    await poc(settledPoc(101, 0.33));

    cleanup();
    const from = h.deriv.send.mock.calls.length;
    await act(async () => { await vi.advanceTimersByTimeAsync(100); });

    expect(sentAfter(from, (p) => p.proposal === 1)).toHaveLength(0);
  });

  it('BBU-12: sem valor exibido, usa o exit_spot', async () => {
    await bootWithOpenContract();

    const { exit_tick_display_value, ...rest } = settledPoc(101, 0.33, { exit_spot: 1234.56 }).proposal_open_contract;
    await poc({ msg_type: 'proposal_open_contract', proposal_open_contract: rest });

    expect(tradeRows()[0].children[4].textContent).toBe('6');
  });

  it('BBU-12: dígito de saída vem do valor exibido, sem perder o zero final', async () => {
    await bootWithOpenContract();

    await poc(settledPoc(101, 0.33, {
      exit_spot: 1234.5,
      exit_tick_display_value: '1234.50',
    }));

    expect(tradeRows()[0].children[4].textContent).toBe('0');
  });
});
