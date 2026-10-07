// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, cleanup } from '@testing-library/react';
import { installStorage, seedHomeAccount } from './homeTestDeriv';
import { createBearDeriv, deferred, stubAudio, tick, settledPoc, openPoc, buysOf } from './bearBotUltraTestHarness';

const h = vi.hoisted(() => ({ deriv: null as any, engines: [] as any[] }));

vi.mock('../app/services/DerivService', () => ({
  DerivService: { getInstance: () => h.deriv },
}));
// Motor real; só guarda a instância para o teste disparar o gatilho automático,
// que no robô depende de 50 ticks de histórico e do portão da IA.
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

import { useBearBot } from '../app/hooks/useBearBot2';

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
const engine = () => h.engines[0];

async function boot() {
  const hook = renderHook(() => useBearBot());
  await act(async () => { await vi.advanceTimersByTimeAsync(100); });
  return hook;
}

async function buy(result: { current: ReturnType<typeof useBearBot> }, kind = 'over') {
  await act(async () => { await result.current.executeTrade(kind); });
  await flush();
}

// Robô com um contrato real (contract_id 101) comprado e ainda aberto.
async function bootWithOpenContract() {
  const hook = await boot();
  await buy(hook.result);
  expect(buysOf(h.deriv.send)).toHaveLength(1);
  await poc(openPoc(101));
  return hook;
}

describe('Bear Bot Ultra 2 — confiabilidade de ordens', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    installStorage();
    seedHomeAccount();
    stubAudio();
    contractSeq = 100;
    h.engines = [];
    h.deriv = createBearDeriv();
    h.deriv.route = defaultRoute;
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('BB2-03: prazo de segurança não solta a trava com o contrato ainda aberto', async () => {
    const { result } = await bootWithOpenContract();

    await act(async () => { await vi.advanceTimersByTimeAsync(30_000); });
    await buy(result);

    expect(buysOf(h.deriv.send)).toHaveLength(1);
  });

  it('BB2-03: resultado atrasado do contrato antigo não solta a trava da ordem nova', async () => {
    const { result } = await bootWithOpenContract();
    await act(async () => { await vi.advanceTimersByTimeAsync(30_000); });
    await act(async () => { result.current.abortOp(); });
    await buy(result);
    expect(buysOf(h.deriv.send)).toHaveLength(2);

    await poc(settledPoc(101, -0.35));

    expect(result.current.state.tradeLock).toBe(true);
  });

  it('BB2-03: prazo vencido para o robô, registra e consulta o contrato', async () => {
    const { result } = await boot();
    await act(async () => { result.current.updateConfig({ exec: 'auto' }); result.current.startBot(); });
    await buy(result);
    await poc(openPoc(101));

    await act(async () => { await vi.advanceTimersByTimeAsync(30_000); });

    expect(result.current.config.autoOn).toBe(false);
    expect(result.current.state.logLines.some((l: any) => l.msg.includes('Sem resultado do contrato 101 em 30s'))).toBe(true);
    expect(h.deriv.send).toHaveBeenCalledWith(expect.objectContaining({ proposal_open_contract: 1, contract_id: 101 }));
    expect(result.current.state.tradeLock).toBe(true);
  });

  it('BB2-03: consulta após o prazo liquida o contrato já fechado', async () => {
    h.deriv.route = (p: any) => {
      if (p.proposal_open_contract && !p.subscribe) {
        queueMicrotask(() => h.deriv.observerInstance.emit('deriv.proposal_open_contract', settledPoc(p.contract_id, -0.35)));
      }
      return p.proposal_open_contract ? new Promise(() => {}) : defaultRoute(p);
    };
    const { result } = await boot();
    await buy(result);

    await act(async () => { await vi.advanceTimersByTimeAsync(30_000); });

    expect(result.current.state.trades).toHaveLength(1);
    expect(result.current.state.trades[0].resultado).toBe('LOSS');
    expect(result.current.state.tradeLock).toBe(false);
  });

  it('BB2-03: falhas de assinatura e de consulta ficam no log', async () => {
    h.deriv.route = (p: any) =>
      p.proposal_open_contract ? Promise.reject({ message: p.subscribe ? 'Connection closed' : 'Timeout' }) : defaultRoute(p);
    const { result } = await boot();
    await buy(result);
    await act(async () => { await vi.advanceTimersByTimeAsync(30_000); });

    const logs = result.current.state.logLines.map((l: any) => l.msg).join('\n');
    expect(logs).toContain('Falha ao acompanhar contrato 101: Connection closed');
    expect(logs).toContain('Consulta do contrato 101 falhou: Timeout');
  });

  it('BB2-03: contrato liquidado no prazo não para o robô depois', async () => {
    const { result } = await boot();
    await act(async () => { result.current.updateConfig({ exec: 'auto' }); result.current.startBot(); });
    await buy(result);
    await poc({ ...settledPoc(101, 0.33), subscription: { id: 'poc-sub-101' } });

    await act(async () => { await vi.advanceTimersByTimeAsync(60_000); });

    expect(result.current.config.autoOn).toBe(true);
    expect(h.deriv.send).toHaveBeenCalledWith(expect.objectContaining({ forget: 'poc-sub-101' }));
  });

  it('BB2-03: prazo não dispara depois do unmount', async () => {
    const { result, unmount } = await bootWithOpenContract();
    const before = h.deriv.send.mock.calls.length;

    unmount();
    await act(async () => { await vi.advanceTimersByTimeAsync(60_000); });

    expect(h.deriv.send.mock.calls.slice(before).map((c: any[]) => c[0]))
      .not.toContainEqual(expect.objectContaining({ proposal_open_contract: 1 }));
    expect(result.current.state.logLines.some((l: any) => l.msg.includes('Sem resultado'))).toBe(false);
  });

  it('BB2-04: compra não confirmada para o robô; só o Abortar libera', async () => {
    let first = true;
    h.deriv.route = (p: any) => {
      if (p.buy !== undefined && first) {
        first = false;
        return Promise.reject({ code: 'BuyUnconfirmed', message: 'A corretora não confirmou a compra.' });
      }
      return defaultRoute(p);
    };
    const { result } = await boot();
    await act(async () => { result.current.updateConfig({ exec: 'auto' }); result.current.startBot(); });

    await buy(result);
    expect(result.current.config.autoOn).toBe(false);
    expect(result.current.hasLiveOrder()).toBe(true);

    await act(async () => { result.current.abortOp(); });
    await buy(result);
    expect(buysOf(h.deriv.send)).toHaveLength(2);
  });

  it('BB2-04: recusa comum da corretora libera a próxima entrada', async () => {
    let first = true;
    h.deriv.route = (p: any) => {
      if (p.buy !== undefined && first) {
        first = false;
        return Promise.reject({ code: 'InvalidContractProposal', message: 'recusada' });
      }
      return defaultRoute(p);
    };
    const { result } = await boot();

    await buy(result);
    await buy(result);

    expect(buysOf(h.deriv.send)).toHaveLength(2);
    expect(result.current.state.logLines.some((l: any) => l.msg.includes('Erro na compra · recusada'))).toBe(true);
  });

  it('BB2-04: buy sem contract_id libera a trava', async () => {
    h.deriv.route = (p: any) => (p.buy !== undefined ? Promise.resolve({ msg_type: 'buy' }) : defaultRoute(p));
    const { result } = await boot();

    await buy(result);

    expect(result.current.state.tradeLock).toBe(false);
  });

  it('BB2-04: combo com perna sem confirmação segura a trava após a outra liquidar', async () => {
    h.deriv.route = (p: any) =>
      p.buy !== undefined && p.parameters?.contract_type === 'DIGITUNDER'
        ? Promise.reject({ code: 'BuyUnconfirmed', message: 'A corretora não confirmou a compra.' })
        : defaultRoute(p);
    const { result } = await boot();
    await act(async () => { result.current.updateConfig({ mode: 'combo' }); });
    await buy(result, 'combo');

    await poc(settledPoc(101, 0.15));

    expect(result.current.state.trades).toHaveLength(1);
    expect(result.current.state.trades[0].alvo).toBe(5);
    expect(result.current.state.tradeLock).toBe(true);
  });

  it('BB2-04: combo com as duas pernas recusadas libera a trava', async () => {
    h.deriv.route = (p: any) =>
      p.buy !== undefined ? Promise.reject({ code: 'MarketIsClosed', message: 'fechado' }) : defaultRoute(p);
    const { result } = await boot();
    await act(async () => { result.current.updateConfig({ mode: 'combo' }); });

    await buy(result, 'combo');

    expect(result.current.state.tradeLock).toBe(false);
  });

  it('BB2-04: combo completo liquida as duas pernas como uma operação', async () => {
    const { result } = await boot();
    await act(async () => { result.current.updateConfig({ mode: 'combo' }); });
    await buy(result, 'combo');

    await poc(settledPoc(101, -0.35));
    expect(result.current.state.tradeLock).toBe(true);
    await poc(settledPoc(102, 0.3));

    expect(result.current.state.trades).toHaveLength(1);
    expect(result.current.state.trades[0].modo).toBe('COMBO');
    expect(result.current.state.tradeLock).toBe(false);
  });

  it('BB2-04: compra sem confirmação da corretora não libera nova ordem', async () => {
    h.deriv.route = (p: any) =>
      p.buy !== undefined
        ? Promise.reject({ code: 'BuyUnconfirmed', message: 'A corretora não confirmou a compra.' })
        : defaultRoute(p);
    const { result } = await boot();

    await buy(result);
    await buy(result);

    expect(buysOf(h.deriv.send)).toHaveLength(1);
  });

  it('BB2-04: combo com pernas sem confirmação não libera nova ordem', async () => {
    h.deriv.route = (p: any) =>
      p.buy !== undefined
        ? Promise.reject({ code: 'BuyUnconfirmed', message: 'A corretora não confirmou a compra.' })
        : defaultRoute(p);
    const { result } = await boot();
    await act(async () => { result.current.updateConfig({ mode: 'combo' }); });

    await buy(result, 'combo');
    await buy(result, 'combo');

    expect(buysOf(h.deriv.send)).toHaveLength(2);
  });

  it('BB2-05: mensagem com is_valid_to_sell não liquida o contrato aberto', async () => {
    const { result } = await bootWithOpenContract();

    await poc(openPoc(101, { is_valid_to_sell: 1, profit: -0.35 }));
    await poc(settledPoc(101, 0.33));

    expect(result.current.state.trades).toHaveLength(1);
    expect(result.current.state.trades[0].resultado).toBe('WIN');
  });

  it('BB2-06: contrato que o robô não comprou não entra no placar', async () => {
    const { result } = await boot();

    await poc(settledPoc(777, -0.35));

    expect(result.current.state.trades).toHaveLength(0);
    expect(result.current.state.pnl).toBe(0);
  });

  it('BB2-06: contrato alheio liquidado não solta a trava do contrato do robô', async () => {
    const { result } = await bootWithOpenContract();

    await poc(settledPoc(777, 0.33));

    expect(result.current.state.tradeLock).toBe(true);
  });

  it('BB2-08: Abortar com contrato aberto não libera segunda ordem', async () => {
    const { result } = await bootWithOpenContract();

    await act(async () => { result.current.abortOp(); });
    await buy(result);

    expect(buysOf(h.deriv.send)).toHaveLength(1);
  });

  it('BB2-08: Reset com contrato aberto não libera segunda ordem', async () => {
    const { result } = await bootWithOpenContract();

    await act(async () => { result.current.resetStats(); });
    await buy(result);

    expect(buysOf(h.deriv.send)).toHaveLength(1);
  });

  it('BB2-08: alternar o Paper com contrato aberto não libera segunda ordem', async () => {
    const { result } = await bootWithOpenContract();

    await act(async () => { result.current.updateConfig({ paperMode: true }); });
    await act(async () => { result.current.updateConfig({ paperMode: false }); });
    await buy(result);

    expect(buysOf(h.deriv.send)).toHaveLength(1);
  });

  it('BB2-08: resultado repetido depois do Abortar não conta de novo', async () => {
    const { result } = await bootWithOpenContract();
    await poc(settledPoc(101, 0.33));

    await act(async () => { result.current.abortOp(); });
    await poc(settledPoc(101, 0.33));

    expect(result.current.state.trades).toHaveLength(1);
  });

  it('BB2-08: Abortar com contrato aberto avisa e a liquidação libera a trava', async () => {
    const { result } = await bootWithOpenContract();

    await act(async () => { result.current.abortOp(); });
    expect(result.current.state.logLines[0].msg).toContain('a trava sai na liquidação');

    await poc(settledPoc(101, 0.33));
    await act(async () => { await vi.advanceTimersByTimeAsync(3000); });
    await buy(result);
    expect(buysOf(h.deriv.send)).toHaveLength(2);
  });

  it('BB2-08: resultado atrasado de contrato abandonado não solta a trava da ordem nova', async () => {
    const { result } = await bootWithOpenContract();
    await act(async () => { await vi.advanceTimersByTimeAsync(30_000); });
    await act(async () => { result.current.abortOp(); });
    await buy(result);

    await poc(settledPoc(101, -0.35));

    expect(result.current.state.trades).toHaveLength(1);
    expect(result.current.state.tradeLock).toBe(true);
  });

  it('BB2-09: liquidação registra stake e mercado da compra, não os editados depois', async () => {
    const { result } = await bootWithOpenContract();

    await act(async () => { result.current.updateConfig({ stake: 5, activeSym: 'R_75' }); });
    await poc(settledPoc(101, 0.33));

    const [trade] = result.current.state.trades;
    expect(trade.mercado).toBe('R_100');
    expect(trade.stake).toBe('0.35');
  });

  it('BB2-10: entrada automática agendada não sai depois de Desligar Robô', async () => {
    const { result } = await boot();
    await act(async () => { result.current.updateConfig({ exec: 'auto' }); result.current.startBot(); });

    await act(async () => {
      (engine() as any).triggerAutoTrade();
      result.current.stopBot();
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(buysOf(h.deriv.send)).toHaveLength(0);
  });

  it('BB2-11: entrada automática agendada não sai depois que a tela é desmontada', async () => {
    const { result, unmount } = await boot();
    await act(async () => { result.current.updateConfig({ exec: 'auto' }); result.current.startBot(); });

    (engine() as any).triggerAutoTrade();
    unmount();
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });

    expect(buysOf(h.deriv.send)).toHaveLength(0);
  });

  it('BB2-11: compra confirmada depois do unmount não assina nada', async () => {
    const pending = deferred();
    h.deriv.route = (p: any) => (p.buy !== undefined ? pending.promise : defaultRoute(p));
    const { result, unmount } = await boot();
    act(() => { result.current.executeTrade('over'); });
    await flush();

    unmount();
    await act(async () => {
      pending.resolve({ msg_type: 'buy', buy: { contract_id: 101, buy_price: 0.35 } });
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(h.deriv.subscribe).not.toHaveBeenCalledWith(expect.objectContaining({ proposal_open_contract: 1 }));
  });

  it('BB2-12: trade paper pendente não cai no placar real depois de desligar o Paper', async () => {
    const { result } = await boot();
    await act(async () => {
      tick(h.deriv, 'R_100', 1234.51);
      tick(h.deriv, 'R_100', 1234.57);
      result.current.updateConfig({ paperMode: true });
    });
    await act(async () => { await result.current.executeTrade('over'); });

    await act(async () => { result.current.updateConfig({ paperMode: false }); });
    await buy(result);
    await act(async () => { await vi.advanceTimersByTimeAsync(800); });

    expect(result.current.state.trades).toHaveLength(0);
    expect(result.current.state.tradeLock).toBe(true);
  });

  it('BB2-12: Abortar cancela o trade paper pendente', async () => {
    const { result } = await boot();
    await act(async () => {
      tick(h.deriv, 'R_100', 1234.51);
      tick(h.deriv, 'R_100', 1234.57);
      result.current.updateConfig({ paperMode: true });
    });
    await act(async () => { await result.current.executeTrade('over'); });

    await act(async () => { result.current.abortOp(); });
    await act(async () => { await vi.advanceTimersByTimeAsync(800); });

    expect(result.current.state.trades).toHaveLength(0);
    expect(result.current.state.tradeLock).toBe(false);
  });

  it('BB2-12: trade paper liquida no placar paper', async () => {
    const { result } = await boot();
    await act(async () => {
      tick(h.deriv, 'R_100', 1234.51);
      tick(h.deriv, 'R_100', 1234.57);
      result.current.updateConfig({ paperMode: true });
    });
    await act(async () => { await result.current.executeTrade('over'); });
    await act(async () => { await vi.advanceTimersByTimeAsync(800); });

    expect(result.current.state.trades).toHaveLength(1);
    expect(result.current.state.trades[0].paper).toBe(true);
  });

  it('BB2-12: paper sem ticks suficientes libera a trava', async () => {
    const { result } = await boot();
    await act(async () => { result.current.updateConfig({ paperMode: true }); });

    await act(async () => { await result.current.executeTrade('over'); });

    expect(result.current.state.tradeLock).toBe(false);
  });

  it('BB2-13: dígito de saída vem do valor exibido, sem perder o zero final', async () => {
    const { result } = await bootWithOpenContract();

    await poc(settledPoc(101, 0.33, { exit_spot: 1234.5, exit_tick_display_value: '1234.50' }));

    expect(result.current.state.trades[0].saiu).toBe(0);
  });
});
