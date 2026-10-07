// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, cleanup } from '@testing-library/react';
import { installStorage, seedHomeAccount } from './homeTestDeriv';
import { createBearDeriv, deferred, tick, settledPoc, openPoc, buysOf } from './bearBotUltraTestHarness';

const h = vi.hoisted(() => ({ deriv: null as any }));

vi.mock('../app/services/DerivService', () => ({
  DerivService: { getInstance: () => h.deriv },
}));

import { useBearDiffer } from '../app/hooks/useBearDiffer';

let contractSeq = 100;
function defaultRoute(p: any): Promise<any> {
  if (p.buy !== undefined) {
    return Promise.resolve({ msg_type: 'buy', buy: { contract_id: ++contractSeq, buy_price: p.price } });
  }
  if (p.proposal) return new Promise(() => {});
  return Promise.resolve({});
}

const flush = () => act(async () => { await vi.advanceTimersByTimeAsync(0); });
const poc = (msg: any) =>
  act(async () => { h.deriv.observerInstance.emit('deriv.proposal_open_contract', msg); await vi.advanceTimersByTimeAsync(0); });
const logs = (result: any) => result.current.state.logs.map((l: any) => l.msg ?? l.text ?? String(l)).join('\n');

async function boot() {
  const hook = renderHook(() => useBearDiffer());
  await act(async () => { result(hook).updateConfig({ opMode: 'real' }); });
  await flush();
  return hook;
}
const result = (hook: any) => hook.result.current;

async function buy(hook: any, digit = 3) {
  await act(async () => { await result(hook).executeTrade('R_100', digit); });
  await flush();
}

// Contrato real (contract_id 101) comprado e ainda aberto.
async function bootWithOpenContract() {
  const hook = await boot();
  await buy(hook);
  expect(buysOf(h.deriv.send)).toHaveLength(1);
  await poc(openPoc(101));
  return hook;
}

describe('Bear Bot Differ — confiabilidade de ordens', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    installStorage();
    seedHomeAccount();
    contractSeq = 100;
    h.deriv = createBearDeriv();
    h.deriv.route = defaultRoute;
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('BD-03: sem resultado do contrato, o robô avisa e para em vez de travar calado', async () => {
    const hook = await bootWithOpenContract();
    await act(async () => { result(hook).updateConfig({ autoOn: true }); });

    await act(async () => { await vi.advanceTimersByTimeAsync(5 * 60_000); });

    expect(result(hook).config.autoOn).toBe(false);
    expect(logs(hook.result)).toMatch(/Sem resultado do contrato 101/);
  });

  it('BD-03: falha ao assinar o resultado fica registrada', async () => {
    h.deriv.route = (p: any) =>
      p.proposal_open_contract ? Promise.reject({ message: 'Connection closed' }) : defaultRoute(p);
    const hook = await boot();

    await buy(hook);

    expect(logs(hook.result)).toMatch(/acompanhar contrato 101/);
  });

  it('BD-03: prazo vencido consulta o contrato e liquida se a corretora já fechou', async () => {
    h.deriv.route = (p: any) => {
      if (p.proposal_open_contract && !p.subscribe) {
        queueMicrotask(() => h.deriv.observerInstance.emit('deriv.proposal_open_contract', settledPoc(p.contract_id, -0.35)));
        return Promise.resolve({});
      }
      return p.proposal_open_contract ? new Promise(() => {}) : defaultRoute(p);
    };
    const hook = await boot();
    await buy(hook);

    await act(async () => { await vi.advanceTimersByTimeAsync(30_000); });

    expect(result(hook).state.trades).toHaveLength(1);
    expect(result(hook).state.trades[0].result).toBe('LOSS');
    expect(result(hook).state.tradeLock).toBe(false);
  });

  it('BD-03: falha na consulta após o prazo fica no log e a trava continua', async () => {
    h.deriv.route = (p: any) =>
      p.proposal_open_contract && !p.subscribe ? Promise.reject({ message: 'Timeout' }) : defaultRoute(p);
    const hook = await bootWithOpenContract();

    await act(async () => { await vi.advanceTimersByTimeAsync(30_000); });

    expect(logs(hook.result)).toMatch(/Consulta do contrato 101 falhou: Timeout/);
    expect(result(hook).state.tradeLock).toBe(true);
  });

  it('BD-03: contrato liquidado no prazo não para o automático depois', async () => {
    const hook = await bootWithOpenContract();
    await act(async () => { result(hook).updateConfig({ autoOn: true }); });
    await poc(settledPoc(101, 0.03));

    await act(async () => { await vi.advanceTimersByTimeAsync(60_000); });

    expect(result(hook).config.autoOn).toBe(true);
    expect(logs(hook.result)).not.toMatch(/Sem resultado/);
  });

  it('BD-03: prazo não dispara depois do unmount', async () => {
    const hook = await bootWithOpenContract();
    const before = h.deriv.send.mock.calls.length;

    hook.unmount();
    await act(async () => { await vi.advanceTimersByTimeAsync(60_000); });

    expect(h.deriv.send.mock.calls.slice(before).map((c: any[]) => c[0]))
      .not.toContainEqual(expect.objectContaining({ proposal_open_contract: 1 }));
  });

  it('BD-04: compra não confirmada para o automático; Zerar sessão libera', async () => {
    let first = true;
    h.deriv.route = (p: any) => {
      if (p.buy !== undefined && first) {
        first = false;
        return Promise.reject({ code: 'BuyUnconfirmed', message: 'A corretora não confirmou a compra.' });
      }
      return defaultRoute(p);
    };
    const hook = await boot();
    await act(async () => { result(hook).updateConfig({ autoOn: true }); });

    await buy(hook);
    expect(result(hook).config.autoOn).toBe(false);
    expect(logs(hook.result)).toMatch(/Compra não confirmada/);

    await act(async () => { result(hook).resetSession(); });
    await act(async () => { result(hook).updateConfig({ opMode: 'real' }); });
    await buy(hook);
    expect(buysOf(h.deriv.send)).toHaveLength(2);
  });

  it('BD-04: recusa comum da corretora libera a próxima entrada', async () => {
    let first = true;
    h.deriv.route = (p: any) => {
      if (p.buy !== undefined && first) {
        first = false;
        return Promise.reject({ code: 'InvalidContractProposal', message: 'recusada' });
      }
      return defaultRoute(p);
    };
    const hook = await boot();

    await buy(hook);
    await act(async () => { await vi.advanceTimersByTimeAsync(60_000); });
    await buy(hook);

    expect(buysOf(h.deriv.send)).toHaveLength(2);
  });

  it('BD-02: id de proposta recusado não é usado de novo', async () => {
    let first = true;
    h.deriv.route = (p: any) => {
      if (p.buy !== undefined && first) {
        first = false;
        return Promise.reject({ code: 'InvalidOfferings', message: 'proposta vencida' });
      }
      return defaultRoute(p);
    };
    const hook = await boot();
    await act(async () => {
      result(hook).ensureProposal('R_100', 3, 0.35);
      h.deriv.observerInstance.emit('message', {
        msg_type: 'proposal',
        passthrough: { pkey: 'R_100|DIGITDIFF|3|0.35' },
        proposal: { id: 'P-DEAD', payout: 0.67, ask_price: 0.35 },
      });
    });

    await buy(hook);
    await act(async () => { await vi.advanceTimersByTimeAsync(60_000); });
    await buy(hook);

    const ids = buysOf(h.deriv.send).map((b: any) => b.buy);
    expect(ids).toEqual(['P-DEAD', 1]);
  });

  it('BD-02: queda do canal de trade descarta as propostas quentes', async () => {
    const hook = await boot();
    await act(async () => {
      result(hook).ensureProposal('R_100', 3, 0.35);
      h.deriv.observerInstance.emit('message', {
        msg_type: 'proposal',
        passthrough: { pkey: 'R_100|DIGITDIFF|3|0.35' },
        proposal: { id: 'P-OLD', payout: 0.67, ask_price: 0.35 },
      });
    });

    await act(async () => { h.deriv.observerInstance.emit('trade.status', false); });
    await buy(hook);

    expect(buysOf(h.deriv.send)[0].buy).toBe(1);
  });

  it('BD-04: compra sem confirmação da corretora não libera nova ordem', async () => {
    h.deriv.route = (p: any) =>
      p.buy !== undefined
        ? Promise.reject({ code: 'BuyUnconfirmed', message: 'A corretora não confirmou a compra.' })
        : defaultRoute(p);
    const hook = await boot();

    await buy(hook);
    await buy(hook);

    expect(buysOf(h.deriv.send)).toHaveLength(1);
  });

  it('BD-05: Zerar sessão com contrato aberto não libera segunda ordem', async () => {
    const hook = await bootWithOpenContract();

    await act(async () => { result(hook).resetSession(); });
    await buy(hook);

    expect(buysOf(h.deriv.send)).toHaveLength(1);
  });

  it('BD-05: resultado de contrato real aberto antes do Zerar não cai no livro de papel', async () => {
    const hook = await bootWithOpenContract();

    await act(async () => { result(hook).resetSession(); });
    await act(async () => { result(hook).updateConfig({ opMode: 'sim' }); });
    await poc(settledPoc(101, -0.35));

    expect(result(hook).state.trades[0].paper).toBe(false);
  });

  it('BD-05: trade de papel pendente não liquida depois do Zerar', async () => {
    const hook = renderHook(() => useBearDiffer());
    await act(async () => { await result(hook).executeTrade('R_100', 3); });

    await act(async () => { result(hook).resetSession(); });
    await act(async () => { tick(h.deriv, 'R_100', 1234.57); await vi.advanceTimersByTimeAsync(0); });

    expect(result(hook).state.trades).toHaveLength(0);
  });

  it('BD-05: Zerar sessão com contrato aberto avisa; a liquidação libera a trava', async () => {
    const hook = await bootWithOpenContract();

    await act(async () => { result(hook).resetSession(); });
    expect(logs(hook.result)).toMatch(/a trava sai na liquidação/);
    await act(async () => { result(hook).updateConfig({ opMode: 'real' }); });

    await poc(settledPoc(101, 0.03));
    await act(async () => { await vi.advanceTimersByTimeAsync(60_000); });
    await buy(hook);
    expect(buysOf(h.deriv.send)).toHaveLength(2);
  });

  it('BD-05: depois do prazo do resultado, Zerar sessão libera a trava', async () => {
    h.deriv.route = (p: any) => (p.proposal_open_contract ? new Promise(() => {}) : defaultRoute(p));
    const hook = await boot();
    await buy(hook);
    await act(async () => { await vi.advanceTimersByTimeAsync(30_000); });

    await act(async () => { result(hook).resetSession(); });
    await act(async () => { result(hook).updateConfig({ opMode: 'real' }); });
    await buy(hook);

    expect(buysOf(h.deriv.send)).toHaveLength(2);
  });

  it('BD-05: resultado atrasado de contrato abandonado não solta a trava da ordem nova', async () => {
    h.deriv.route = (p: any) => (p.proposal_open_contract ? new Promise(() => {}) : defaultRoute(p));
    const hook = await boot();
    await buy(hook);
    await act(async () => { await vi.advanceTimersByTimeAsync(30_000); });
    await act(async () => { result(hook).resetSession(); });
    await act(async () => { result(hook).updateConfig({ opMode: 'real' }); });
    await buy(hook);

    await poc(settledPoc(101, -0.35));

    expect(result(hook).state.trades).toHaveLength(1);
    expect(result(hook).state.tradeLock).toBe(true);
  });

  it('BD-05: compra aguardando resposta também segura a trava no Zerar', async () => {
    const pending = deferred();
    h.deriv.route = (p: any) => (p.buy !== undefined ? pending.promise : defaultRoute(p));
    const hook = await boot();
    act(() => { result(hook).executeTrade('R_100', 3); });
    await flush();

    await act(async () => { result(hook).resetSession(); });

    expect(result(hook).state.tradeLock).toBe(true);
  });

  it('BD-05: trade de papel liquida no livro de papel com a stake enviada', async () => {
    const hook = renderHook(() => useBearDiffer());
    await act(async () => { await result(hook).executeTrade('R_100', 3); });

    await act(async () => { tick(h.deriv, 'R_100', 1234.57); await vi.advanceTimersByTimeAsync(0); });

    const [trade] = result(hook).state.trades;
    expect(trade.paper).toBe(true);
    expect(trade.stake).toBe(0.35);
  });

  it('BD-08: resposta de proposta já descartada tem o stream cancelado', async () => {
    const hook = await boot();
    await act(async () => { result(hook).ensureProposal('R_100', 3, 0.35); });
    await act(async () => { await vi.advanceTimersByTimeAsync(4000); });

    await act(async () => {
      h.deriv.observerInstance.emit('message', {
        msg_type: 'proposal',
        passthrough: { pkey: 'R_100|DIGITDIFF|3|0.35' },
        subscription: { id: 'prop-late' },
        proposal: { id: 'P-LATE', payout: 0.67, ask_price: 0.35 },
      });
    });

    expect(h.deriv.send).toHaveBeenCalledWith(expect.objectContaining({ forget: 'prop-late' }));
  });

  it('BD-08: queda do canal descarta propostas sem enviar forget', async () => {
    const hook = await boot();
    await act(async () => {
      result(hook).ensureProposal('R_100', 3, 0.35);
      h.deriv.observerInstance.emit('message', {
        msg_type: 'proposal',
        passthrough: { pkey: 'R_100|DIGITDIFF|3|0.35' },
        subscription: { id: 'prop-dead' },
        proposal: { id: 'P', payout: 0.67, ask_price: 0.35 },
      });
    });

    await act(async () => { h.deriv.observerInstance.emit('close', {}); });
    hook.unmount();

    expect(h.deriv.send).not.toHaveBeenCalledWith(expect.objectContaining({ forget: 'prop-dead' }));
  });

  it('BD-08: Loss Virtual armado mantém sua proposta quente', async () => {
    const hook = await boot();
    await act(async () => { result(hook).armVirtualLoss('R_50', 6, 2); });

    await act(async () => { await vi.advanceTimersByTimeAsync(4000); });

    expect(h.deriv.send).toHaveBeenCalledWith(expect.objectContaining({ proposal: 1, underlying_symbol: 'R_50', barrier: '6' }));
  });

  it('BD-01: resultado liquidado cancela o stream do contrato', async () => {
    const hook = await bootWithOpenContract();

    await poc({ ...settledPoc(101, 0.03), subscription: { id: 'poc-101' } });

    expect(h.deriv.send).toHaveBeenCalledWith(expect.objectContaining({ forget: 'poc-101' }));
    expect(result(hook).state.tradeLock).toBe(false);
  });

  it('BD-06: stake registrada é a enviada, não derivada do payout atual', async () => {
    const hook = await bootWithOpenContract();

    // Proposta de outro valor muda o payout antes da liquidação.
    await act(async () => {
      result(hook).ensureProposal('R_75', 4, 0.35);
      h.deriv.observerInstance.emit('message', {
        msg_type: 'proposal',
        passthrough: { pkey: 'R_75|DIGITDIFF|4|0.35' },
        proposal: { id: 'P', payout: 0.7, ask_price: 0.35 },
      });
    });
    await poc(settledPoc(101, 0.03));

    expect(result(hook).state.trades[0].stake).toBe(0.35);
  });

  it('BD-07: dígito de saída vem do valor exibido, sem perder o zero final', async () => {
    const hook = await bootWithOpenContract();

    await poc(settledPoc(101, 0.03, { exit_spot: 1234.5, exit_tick_display_value: '1234.50' }));

    expect(result(hook).state.trades[0].exitDigit).toBe(0);
  });

  // O socket é compartilhado: cancelar por stream (forget), não forget_all, que
  // derrubaria propostas de outros módulos.
  it('BD-08: propostas assinadas são canceladas ao sair da tela', async () => {
    const hook = await boot();
    await act(async () => {
      result(hook).ensureProposal('R_100', 3, 0.35);
      h.deriv.observerInstance.emit('message', {
        msg_type: 'proposal',
        passthrough: { pkey: 'R_100|DIGITDIFF|3|0.35' },
        subscription: { id: 'prop-sub-1' },
        proposal: { id: 'P1', payout: 0.67, ask_price: 0.35 },
      });
    });

    hook.unmount();

    expect(h.deriv.send).toHaveBeenCalledWith(expect.objectContaining({ forget: 'prop-sub-1' }));
    expect(h.deriv.send).not.toHaveBeenCalledWith(expect.objectContaining({ forget_all: 'proposal' }));
  });

  it('BD-08: trocar o alvo quente cancela a proposta antiga', async () => {
    const hook = await boot();
    await act(async () => { result(hook).updateConfig({ fastExec: true }); });
    await act(async () => { result(hook).setWarmTarget('R_100', 3); await vi.advanceTimersByTimeAsync(4000); });
    await act(async () => {
      h.deriv.observerInstance.emit('message', {
        msg_type: 'proposal',
        passthrough: { pkey: 'R_100|DIGITDIFF|3|0.35' },
        subscription: { id: 'prop-sub-1' },
        proposal: { id: 'P1', payout: 0.67, ask_price: 0.35 },
      });
    });

    await act(async () => { result(hook).setWarmTarget('R_75', 5); await vi.advanceTimersByTimeAsync(4000); });

    expect(h.deriv.send).toHaveBeenCalledWith(expect.objectContaining({ forget: 'prop-sub-1' }));
  });

  it('BD-08: proposta que falhou volta a ser pedida pelo keeper', async () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    let fail = true;
    h.deriv.route = (p: any) => {
      if (p.proposal && fail) { fail = false; return Promise.reject({ code: 'RateLimit', message: 'x' }); }
      return defaultRoute(p);
    };
    const hook = await boot();
    await act(async () => { result(hook).setWarmTarget('R_100', 3); await vi.advanceTimersByTimeAsync(4000); });

    await act(async () => { await vi.advanceTimersByTimeAsync(4000); });

    expect(h.deriv.send.mock.calls.filter((c: any[]) => c[0].proposal === 1)).toHaveLength(2);
    errors.mockRestore();
  });

  it('BD-09: compra confirmada depois do unmount não assina nada', async () => {
    const pending = deferred();
    h.deriv.route = (p: any) => (p.buy !== undefined ? pending.promise : defaultRoute(p));
    const hook = await boot();
    act(() => { result(hook).executeTrade('R_100', 3); });
    await flush();

    hook.unmount();
    await act(async () => {
      pending.resolve({ msg_type: 'buy', buy: { contract_id: 101, buy_price: 0.35 } });
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(h.deriv.subscribe).not.toHaveBeenCalledWith(expect.objectContaining({ proposal_open_contract: 1 }));
  });
});
