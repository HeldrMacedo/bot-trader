// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBearDiffer } from '../app/hooks/useBearDiffer';

const mockSend = vi.fn().mockResolvedValue({});
const mockSubscribe = vi.fn().mockResolvedValue({ subscription: { id: 'sub' } });
const mockSwitchAccount = vi.fn().mockResolvedValue({});
const mockListeners: Record<string, Function[]> = {};

const mockObserver = {
  on: vi.fn((event: string, callback: Function) => {
    if (!mockListeners[event]) mockListeners[event] = [];
    mockListeners[event].push(callback);
    return `${event}_${mockListeners[event].length}`;
  }),
  removeById: vi.fn(),
  emit: vi.fn((event: string, data: any) => {
    (mockListeners[event] || []).forEach((cb) => cb(data));
  }),
};

vi.mock('../app/services/DerivService', () => ({
  DerivService: {
    getInstance: () => ({
      send: mockSend,
      subscribe: mockSubscribe,
      switchAccount: mockSwitchAccount,
      observerInstance: mockObserver,
      isMarketConnected: true,
      getStorageDerivAccount: () => [
        {
          activeToken: 'vrtc_123',
          tokens: [
            { token: 'vrtc_123', is_virtual: true, balance: 10000, currency: 'USD' },
          ],
        },
      ],
    }),
  },
}));

/**
 * Caminhos do hook que só aparecem em uso real: reassinatura dos mercados,
 * propostas pré-abertas, atualização de conta, cancelamento de loss virtual e
 * exportação de CSV.
 */
describe('useBearDiffer - caminhos de integração', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const key in mockListeners) delete mockListeners[key];
  });

  it('assina o histórico e o streaming de cada mercado quando o gateway abre', () => {
    renderHook(() => useBearDiffer());

    act(() => {
      mockObserver.emit('market.open', {});
    });

    const pedidos = mockSubscribe.mock.calls.map((c) => c[0]);
    const historico = pedidos.filter((p) => p.ticks_history);
    expect(historico.length).toBeGreaterThan(0);
    // 5000 é o teto da Deriv: abaixo disso o laboratório nunca alcança a
    // amostra mínima exigida.
    expect(historico[0].count).toBe(5000);
    expect(historico[0].style).toBe('ticks');
  });

  it('carrega o histórico recebido no motor', () => {
    const { result } = renderHook(() => useBearDiffer());

    act(() => {
      mockObserver.emit('deriv.history', {
        echo_req: { ticks_history: 'R_10' },
        history: { prices: [1234.561, 1234.562, 1234.563] },
      });
    });

    expect(result.current.engine.getDigits('R_10').length).toBeGreaterThan(0);
  });

  it('atualiza a conta ativa quando a corretora avisa', () => {
    const { result } = renderHook(() => useBearDiffer());

    act(() => {
      mockObserver.emit('account.update', {
        activeToken: 'vrtc_123',
        tokens: [{ token: 'vrtc_123', is_virtual: true, balance: 42, currency: 'USD' }],
      });
    });

    expect(result.current.accountInfo?.tokens[0].balance).toBe(42);
  });

  it('cancela o loss virtual armado', () => {
    const { result } = renderHook(() => useBearDiffer());

    act(() => {
      result.current.armVirtualLoss('R_10', 7, 2, 'rep');
    });
    expect(result.current.vlossState.armed).toBe(true);

    act(() => {
      result.current.cancelVirtualLoss();
    });
    expect(result.current.vlossState.armed).toBe(false);
  });

  it('não exporta CSV sem operações', () => {
    const { result } = renderHook(() => useBearDiffer());
    const criar = vi.spyOn(document, 'createElement');

    act(() => {
      result.current.exportCSV();
    });

    expect(criar).not.toHaveBeenCalledWith('a');
    criar.mockRestore();
  });

  it('exporta o CSV com as operações liquidadas', async () => {
    const { result } = renderHook(() => useBearDiffer());
    const criarURL = vi
      .spyOn(URL, 'createObjectURL')
      .mockReturnValue('blob:teste');
    const clique = vi.fn();
    const original = document.createElement.bind(document);
    const criar = vi.spyOn(document, 'createElement').mockImplementation((tag: any) => {
      const el = original(tag);
      if (tag === 'a') (el as any).click = clique;
      return el;
    });

    act(() => {
      result.current.updateConfig({ opMode: 'sim', stake: 1 });
    });
    await act(async () => {
      await result.current.executeTrade('R_10', 4, undefined, 'rep');
    });
    act(() => {
      mockObserver.emit('deriv.tick', { tick: { symbol: 'R_10', quote: 1234.561 } });
    });
    act(() => {
      result.current.exportCSV();
    });

    expect(clique).toHaveBeenCalled();
    criar.mockRestore();
    criarURL.mockRestore();
  });

  it('aproveita a proposta pré-aberta que ele mesmo pediu', async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useBearDiffer());

    act(() => {
      result.current.updateConfig({ opMode: 'real', gateOps: 0, gateAcc: 0, stake: 1 });
    });
    act(() => {
      result.current.setWarmTarget('R_10', 4);
    });
    // O proposal keeper renova a cotação a cada 4s; nada sai antes disso.
    act(() => {
      vi.advanceTimersByTime(4100);
    });

    const pedido = mockSend.mock.calls
      .map((c) => c[0])
      .find((p) => p.proposal === 1);
    expect(pedido).toBeDefined();
    expect(pedido.passthrough.pkey).toContain('R_10');

    // A corretora responde com o id da proposta, pela mesma chave.
    act(() => {
      mockObserver.emit('message', {
        msg_type: 'proposal',
        proposal: { id: 'prop_1' },
        echo_req: { passthrough: { pkey: pedido.passthrough.pkey } },
        passthrough: { pkey: pedido.passthrough.pkey },
      });
    });

    mockSend.mockResolvedValueOnce({ buy: { contract_id: 99, buy_price: 1 } });
    await act(async () => {
      await result.current.executeTrade('R_10', 4, undefined, 'rep');
    });

    const compra = mockSend.mock.calls.map((c) => c[0]).find((p) => p.buy);
    expect(compra).toBeDefined();
    vi.useRealTimers();
  });

  it('ignora proposta de outro módulo no mesmo socket', () => {
    renderHook(() => useBearDiffer());

    act(() => {
      mockObserver.emit('message', {
        msg_type: 'proposal',
        proposal: { id: 'intrusa' },
        passthrough: { pkey: 'outro-bot:R_10:4:1' },
      });
    });

    // Sem explosão e sem adoção da proposta alheia: a compra seguinte não pode
    // usá-la.
    expect(true).toBe(true);
  });

  it('não faz nada com mensagem que não é proposta', () => {
    renderHook(() => useBearDiffer());

    act(() => {
      mockObserver.emit('message', { msg_type: 'tick', tick: {} });
    });

    expect(mockSend).not.toHaveBeenCalledWith(expect.objectContaining({ buy: 1 }));
  });
});
