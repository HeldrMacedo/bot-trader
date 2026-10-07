// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, cleanup, waitFor } from '@testing-library/react';
import React, { createRef } from 'react';
import { createFakeDeriv, installStorage, seedHomeAccount, soldContract } from './homeTestDeriv';

const h = vi.hoisted(() => ({ deriv: null as any }));

vi.mock('@/app/services/DerivService', () => ({
  DerivService: { getInstance: () => h.deriv },
}));
vi.mock('@/app/services/userService', () => ({ getUser: vi.fn(async () => ({ name: 'Ana' })) }));
vi.mock('@/app/services/operationService', () => ({ saveOperation: vi.fn() }));
vi.mock('react-toastify', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

import ManualTrading from '../app/(withSidebar)/home/components/ManualTrading';
import BuyTable from '../app/(withSidebar)/home/components/buyTable';
import Authentication, { AuthenticationHandle } from '../app/(withSidebar)/home/components/Authentication';
import TicksGraph from '../app/(withSidebar)/home/components/TicksGraph';
import { getUser } from '@/app/services/userService';
import { toast } from 'react-toastify';

function historyFor(prices: number[]) {
  return (payload: any) =>
    payload.ticks_history
      ? Promise.resolve({ history: { prices }, subscription: { id: `s-${payload.ticks_history}` } })
      : Promise.resolve({});
}

beforeEach(() => {
  installStorage();
  seedHomeAccount();
  h.deriv = createFakeDeriv();
  h.deriv.send.mockImplementation(historyFor([100.11, 100.12]));
  vi.mocked(toast.error).mockClear();
  vi.mocked(getUser).mockResolvedValue({ name: 'Ana' } as any);
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => setTimeout(() => cb(0), 0) as any);
  vi.stubGlobal('cancelAnimationFrame', (id: any) => clearTimeout(id));
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('ManualTrading', () => {
  it('carrega histórico de todos os símbolos, exibe dígitos e cancela streams no unmount', async () => {
    const { unmount } = render(<ManualTrading />);
    await waitFor(() => expect(h.deriv.send).toHaveBeenCalledWith(expect.objectContaining({ ticks_history: 'RDBULL' })));
    await waitFor(() => expect(screen.getByText('Bear Market Index')).toBeTruthy());
    expect(screen.getByText('Ana')).toBeTruthy();

    unmount();
    expect(h.deriv.send).toHaveBeenCalledWith({ forget: 's-R_100' });
    expect(h.deriv.send).toHaveBeenCalledWith({ forget: 's-RDBULL' });
  });

  it('acrescenta ticks em tempo real e reinscreve a cada market.open', async () => {
    h.deriv.isMarketConnected = false;
    render(<ManualTrading />);
    expect(h.deriv.send).not.toHaveBeenCalledWith(expect.objectContaining({ ticks_history: 'R_100' }));

    // Tick antes do histórico: monta o buffer a partir do estado.
    act(() => {
      h.deriv.observerInstance.emit('deriv.tick', { tick: { symbol: 'R_50', quote: 10.1234 } });
    });
    await act(async () => {
      h.deriv.observerInstance.emit('market.open', undefined);
    });
    await waitFor(() => expect(h.deriv.send).toHaveBeenCalledWith(expect.objectContaining({ ticks_history: 'RDBULL' })));

    act(() => {
      for (let i = 0; i < 105; i++) {
        h.deriv.observerInstance.emit('deriv.tick', { tick: { symbol: 'R_100', quote: 100 + i / 100 } });
      }
      h.deriv.observerInstance.emit('deriv.tick', { tick: { symbol: 'OUTRO', quote: 1 } });
      h.deriv.observerInstance.emit('deriv.tick', {});
    });
    await act(async () => { await new Promise((r) => setTimeout(r, 5)); });
  });

  it('registra erro ao buscar histórico sem derrubar a tela', async () => {
    h.deriv.send.mockImplementation((p: any) => (p.ticks_history ? Promise.reject(new Error('x')) : Promise.resolve({})));
    render(<ManualTrading />);
    await waitFor(() => expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Erro ao buscar ticks'), expect.any(Error)));
  });

  it('seleciona símbolo, atualiza volatilidade e cabeçalho', async () => {
    render(<ManualTrading />);
    for (const [label, header] of [
      ['Índice de volatilidade 75', '75'],
      ['Índice de volatilidade 50', '50'],
      ['Índice de volatilidade 25', '25'],
      ['Índice de volatilidade 10', '10'],
      ['Bear Market Index', 'Bear'],
      ['Bull Market Index', 'Bull'],
    ]) {
      fireEvent.click(screen.getByText(label));
      expect(screen.getByText(new RegExp(`Índ. Volatilidade:\\s*${header}`))).toBeTruthy();
    }
    expect(h.deriv.updateVolatility).toHaveBeenLastCalledWith('RDBULL');
  });

  it('mostra resultados e última operação da conta e reage a account.update', async () => {
    seedHomeAccount({
      results: { wins: 2, loss: 1, result: 0.9 },
      lastTrade: {
        barrier: '5', resultBarrier: '7', amount: 1, profit: 0.95,
        audit: { tick_previous: '3', tick_start: '4', tick_end: '7' },
      },
    });
    render(<ManualTrading />);
    expect(screen.getByText('Wins: 2')).toBeTruthy();
    expect(screen.getByText('Digito Encontrado: 7')).toBeTruthy();

    act(() => {
      h.deriv.observerInstance.emit('account.update', {
        ...JSON.parse(localStorage.getItem('deriv_accounts')!)[0],
        results: { wins: 0, loss: 3, result: -3 },
        lastTrade: { barrier: '1', resultBarrier: '1', amount: 1, profit: -1, audit: { tick_previous: '1', tick_start: '1', tick_end: '1' } },
      });
    });
    expect(screen.getByText('Loss: 3')).toBeTruthy();
  });

  it('troca de conta pelo seletor e trata falha', async () => {
    render(<ManualTrading />);
    await act(async () => {
      fireEvent.change(screen.getByDisplayValue(/Virtual/), { target: { value: 'oauth:A:CR1' } });
    });
    expect(h.deriv.switchAccount).toHaveBeenCalledWith('oauth:A:CR1');

    h.deriv.switchAccount.mockRejectedValueOnce(new Error('falhou'));
    await act(async () => {
      fireEvent.change(screen.getByDisplayValue(/Virtual/), { target: { value: 'oauth:A:CR1' } });
    });
    expect(console.error).toHaveBeenCalledWith('Erro ao trocar de conta:', expect.any(Error));
  });

  it('formata entrada, calcula valor com gale e persiste o valor', async () => {
    render(<ManualTrading />);
    fireEvent.change(document.getElementById('entrada-inicial')!, { target: { value: '2.5.0a' } });
    expect(JSON.parse(localStorage.getItem('deriv_accounts')!)[0].amount).toBe(2.5);
    fireEvent.change(screen.getByDisplayValue('1'), { target: { value: '3' } });
    await waitFor(() => expect(screen.getByDisplayValue('7.50')).toBeTruthy());
    fireEvent.change(document.getElementById('entrada-inicial')!, { target: { value: '' } });
    expect(screen.getByDisplayValue('0.00')).toBeTruthy();
  });

  it('desconecta pelo botão de logout', async () => {
    localStorage.setItem('token_list', '[]');
    render(<ManualTrading />);
    fireEvent.click(screen.getAllByRole('button').find((b) => b.getAttribute('aria-describedby') === 'tooltip-logout')!);
    expect(localStorage.getItem('token_list')).toBeNull();
    expect(localStorage.getItem('deriv_accounts')).toBeNull();
  });

  it('mostra status da compra e destaca dígitos ao passar o mouse', async () => {
    h.deriv.send.mockImplementation((p: any) =>
      p.buy ? Promise.resolve({ buy: { contract_id: 9 } }) : historyFor([100.11, 100.12, 100.19])(p)
    );
    render(<ManualTrading />);
    await waitFor(() => expect(h.deriv.send).toHaveBeenCalledWith(expect.objectContaining({ ticks_history: 'RDBULL' })));
    await act(async () => { await new Promise((r) => setTimeout(r, 5)); });

    for (const label of ['Comprar Acima', 'Comprar Abaixo']) {
      fireEvent.mouseEnter(screen.getByText(label));
      fireEvent.mouseLeave(screen.getByText(label));
    }
    fireEvent.mouseEnter(screen.getByText('Comprar Acima'));

    await act(async () => { fireEvent.click(screen.getByText('Comprar Acima')); });
    expect(screen.getByText('Comprando')).toBeTruthy();
    act(() => {
      h.deriv.observerInstance.emit('deriv.proposal_open_contract', {
        subscription: { id: 'x' },
        proposal_open_contract: { contract_id: 9, status: 'open' },
      });
    });
    expect(screen.getByText('Operando')).toBeTruthy();
  });

  it('ignora usuário ausente e falha ao carregar usuário', async () => {
    vi.mocked(getUser).mockResolvedValueOnce(null as any).mockResolvedValueOnce(null as any);
    render(<ManualTrading />);
    await act(async () => {});
    vi.mocked(getUser).mockRejectedValueOnce(new Error('offline'));
    await act(async () => { await (window as any).updateUserData(); });
    expect(screen.queryByText('Ana')).toBeNull();
  });

  it('renderiza sem conta salva', () => {
    localStorage.removeItem('deriv_accounts');
    render(<ManualTrading />);
    expect(screen.queryByText(/Wins:/)).toBeNull();
  });
});

describe('BuyTable', () => {
  const renderBuy = (props: Record<string, any> = {}) => {
    const onPurchaseStatusChange = vi.fn();
    const multiplicadorProp = vi.fn();
    const onHoverTradeType = vi.fn();
    const onDigitHover = vi.fn();
    render(
      <BuyTable
        isVirtual
        multiplicadorProp={multiplicadorProp}
        onPurchaseStatusChange={onPurchaseStatusChange}
        onHoverTradeType={onHoverTradeType}
        onDigitHover={onDigitHover}
        {...props}
      />
    );
    return { onPurchaseStatusChange, multiplicadorProp, onHoverTradeType, onDigitHover };
  };

  it('compra Acima com barreira e multiplicador', async () => {
    h.deriv.send.mockResolvedValueOnce({ buy: { contract_id: 1 } });
    const { multiplicadorProp } = renderBuy();
    fireEvent.change(screen.getByDisplayValue('1'), { target: { value: '2' } });
    expect(multiplicadorProp).toHaveBeenCalledWith('2');
    await act(async () => { fireEvent.click(screen.getByText('Comprar Abaixo')); });
    expect(h.deriv.send).toHaveBeenCalledWith(expect.objectContaining({
      buy: 1,
      price: 2,
      parameters: expect.objectContaining({ contract_type: 'DIGITUNDER', barrier: '5', underlying_symbol: 'R_100' }),
    }));
    expect(h.deriv.subscribe).toHaveBeenCalledWith({ proposal_open_contract: 1, contract_id: 1 });
  });

  it('compra Par/Ímpar sem barreira e registra rótulo do contrato', async () => {
    renderBuy();
    fireEvent.change(screen.getByDisplayValue('Acima/Abaixo'), { target: { value: '2' } });
    h.deriv.send.mockResolvedValueOnce({ buy: { contract_id: 3 } });
    await act(async () => { fireEvent.click(screen.getByText('Comprar Par')); });
    expect(h.deriv.send.mock.calls.at(-1)[0].parameters.barrier).toBeUndefined();
    h.deriv.send.mockResolvedValueOnce({ buy: { contract_id: 4 } });
    await act(async () => { fireEvent.click(screen.getByText('Comprar Ímpar')); });

    act(() => {
      h.deriv.observerInstance.emit('deriv.proposal_open_contract', soldContract(3, 0.9, { contract_type: 'DIGITEVEN' }));
      h.deriv.observerInstance.emit('deriv.proposal_open_contract', soldContract(4, -1, { contract_type: 'DIGITODD', exit_spot: undefined }));
    });
    const account = JSON.parse(localStorage.getItem('deriv_accounts')!)[0];
    expect(account.finishedTradeList.map((t: any) => t.barrier)).toEqual(['Par', 'Ímpar']);
    expect(account.lastTrade.resultBarrier).toBe('');

    for (const label of ['Comprar Par', 'Comprar Ímpar']) {
      fireEvent.mouseEnter(screen.getByText(label));
    }
  });

  it('compra Diferente', async () => {
    const { onHoverTradeType } = renderBuy();
    fireEvent.change(screen.getByDisplayValue('Acima/Abaixo'), { target: { value: '3' } });
    fireEvent.mouseEnter(screen.getByText('Comprar Diferente'));
    expect(onHoverTradeType).toHaveBeenCalledWith('diff');
    h.deriv.send.mockResolvedValueOnce({ buy: { contract_id: 5 } });
    await act(async () => { fireEvent.click(screen.getByText('Comprar Diferente')); });
    expect(h.deriv.send.mock.calls.at(-1)[0].parameters.contract_type).toBe('DIGITDIFF');
  });

  it('seleciona e desmarca dígito', () => {
    const { onDigitHover } = renderBuy();
    fireEvent.click(screen.getAllByText('7')[0]);
    expect(h.deriv.updateDigits).toHaveBeenCalledWith(7);
    fireEvent.click(screen.getAllByText('7')[0]);
    expect(h.deriv.updateDigits).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getAllByText('2')[1]);
    fireEvent.click(screen.getAllByText('8')[1]);
    fireEvent.mouseEnter(screen.getByText('Comprar Acima'));
    expect(onDigitHover).toHaveBeenLastCalledWith(8);
  });

  it('recusa a compra se a conexão caiu antes do aviso de trade.status', async () => {
    renderBuy();
    h.deriv.isTradeReady = false;
    await act(async () => { fireEvent.click(screen.getByText('Comprar Acima')); });
    expect(toast.error).toHaveBeenCalledWith('Sem conexão com a corretora. A compra não foi enviada.');
    expect(h.deriv.send).not.toHaveBeenCalled();
  });

  it('bloqueia compra sem conta ou com configuração incompleta', async () => {
    localStorage.setItem('deriv_accounts', '[]');
    renderBuy();
    await act(async () => { fireEvent.click(screen.getByText('Comprar Acima')); });
    seedHomeAccount({ digits: null });
    await act(async () => { fireEvent.click(screen.getByText('Comprar Acima')); });
    expect(toast.error).toHaveBeenCalledWith('Configuração de trade incompleta');
    expect(h.deriv.send).not.toHaveBeenCalled();
  });

  it('trata erro no corpo da resposta e rejeição do buy', async () => {
    const { onPurchaseStatusChange } = renderBuy();
    h.deriv.send.mockResolvedValueOnce({ error: { message: 'saldo insuficiente' } });
    await act(async () => { fireEvent.click(screen.getByText('Comprar Acima')); });
    expect(onPurchaseStatusChange).not.toHaveBeenCalled();

    h.deriv.send.mockRejectedValueOnce(new Error('Connection closed'));
    await act(async () => { fireEvent.click(screen.getByText('Comprar Acima')); });
    expect(toast.error).toHaveBeenCalledWith('Connection closed');
  });

  it('ignora contratos de outros e liquidação sem conta salva', async () => {
    const { onPurchaseStatusChange } = renderBuy();
    act(() => {
      h.deriv.observerInstance.emit('deriv.proposal_open_contract', soldContract(999, 1));
    });
    expect(onPurchaseStatusChange).not.toHaveBeenCalled();

    h.deriv.send.mockResolvedValueOnce({ buy: { contract_id: 6 } });
    await act(async () => { fireEvent.click(screen.getByText('Comprar Acima')); });
    localStorage.removeItem('deriv_accounts');
    act(() => {
      h.deriv.observerInstance.emit('deriv.proposal_open_contract', soldContract(6, 1));
    });
    expect(h.deriv.saveAccount).not.toHaveBeenCalled();
  });
});

describe('Authentication', () => {
  it('dispara login, limpa histórico e expõe logout/conta selecionada', () => {
    const ref = createRef<AuthenticationHandle>();
    render(<Authentication ref={ref} />);
    fireEvent.click(screen.getByText('Adicionar Conta'));
    fireEvent.click(screen.getByText('Limpar histórico'));
    expect(h.deriv.loginDeriv).toHaveBeenCalled();
    expect(h.deriv.clearHistory).toHaveBeenCalled();

    localStorage.setItem('token_list', '[]');
    act(() => ref.current!.handleLogout());
    expect(localStorage.getItem('deriv_accounts')).toBeNull();
    expect(localStorage.getItem('token_list')).toBeNull();
    expect(ref.current!.getSelectedAccount()).toBeNull();
  });
});

describe('TicksGraph', () => {
  it('calcula a distribuição dos dígitos e troca a janela', () => {
    // 10 últimos: dígito 1 = 30%, 2 = 20%, 3 = 10%, demais < 10%.
    const ticks = [9, 9, 1, 1, 1, 2, 2, 3, 4, 5, 6];
    render(<TicksGraph ticksProp={ticks} selectedLastTicksProp={10} />);
    expect(screen.getByText('30%')).toBeTruthy();
    expect(screen.getByText('20%')).toBeTruthy();
    fireEvent.change(screen.getByDisplayValue('Últimos 10 dígitos'), { target: { value: '25' } });
    expect(screen.getByDisplayValue('Últimos 25 dígitos')).toBeTruthy();
  });

  it('renderiza sem ticks', () => {
    render(<TicksGraph ticksProp={undefined} selectedLastTicksProp={10} />);
    expect(screen.getAllByText('0%')).toHaveLength(10);
  });
});
