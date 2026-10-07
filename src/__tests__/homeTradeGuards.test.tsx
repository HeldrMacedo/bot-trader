// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';
import React from 'react';
import { createFakeDeriv, installStorage, seedHomeAccount, soldContract } from './homeTestDeriv';

const h = vi.hoisted(() => ({ deriv: null as any }));

vi.mock('@/app/services/DerivService', () => ({
  DerivService: { getInstance: () => h.deriv },
}));
vi.mock('@/app/services/userService', () => ({ getUser: vi.fn(async () => ({ name: 'Ana' })) }));
vi.mock('@/app/services/operationService', () => ({ saveOperation: vi.fn() }));
vi.mock('react-toastify', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

import BuyTable from '../app/(withSidebar)/home/components/buyTable';
import ManualTrading from '../app/(withSidebar)/home/components/ManualTrading';
import { toast } from 'react-toastify';

const buyButton = () => screen.getByText('Comprar Acima').closest('button')!;

beforeEach(() => {
  installStorage();
  seedHomeAccount();
  h.deriv = createFakeDeriv();
  h.deriv.send.mockResolvedValue({});
  vi.mocked(toast.error).mockClear();
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => setTimeout(() => cb(0), 0) as any);
  vi.stubGlobal('cancelAnimationFrame', (id: any) => clearTimeout(id));
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('BuyTable — compra só com conexão', () => {
  it('mantém os botões de compra desabilitados sem conexão de trade', async () => {
    h.deriv.isTradeReady = false;
    render(<BuyTable multiplicadorProp={vi.fn()} onPurchaseStatusChange={vi.fn()} />);
    expect(buyButton().disabled).toBe(true);

    await act(async () => { fireEvent.click(buyButton()); });
    expect(h.deriv.send).not.toHaveBeenCalled();
  });

  it('acompanha trade.status: libera ao conectar e bloqueia na queda', () => {
    h.deriv.isTradeReady = false;
    render(<BuyTable multiplicadorProp={vi.fn()} onPurchaseStatusChange={vi.fn()} />);

    act(() => h.deriv.observerInstance.emit('trade.status', true));
    expect(buyButton().disabled).toBe(false);

    act(() => h.deriv.observerInstance.emit('trade.status', false));
    expect(buyButton().disabled).toBe(true);
  });
});

describe('ManualTrading — troca de conta com contrato aberto', () => {
  it('desabilita o seletor de conta enquanto há compra em andamento', async () => {
    render(<ManualTrading />);
    const select = screen.getByDisplayValue(/Virtual/) as HTMLSelectElement;
    expect(select.disabled).toBe(false);

    h.deriv.send.mockResolvedValueOnce({ buy: { contract_id: 77 } });
    await act(async () => { fireEvent.click(buyButton()); });
    expect(select.disabled).toBe(true);

    act(() => {
      h.deriv.observerInstance.emit('deriv.proposal_open_contract', soldContract(77, 1));
    });
    expect(select.disabled).toBe(false);
  });

  it('mostra ao usuário o motivo da recusa da troca', async () => {
    h.deriv.switchAccount.mockRejectedValueOnce(
      new Error('Há contrato em aberto. Aguarde a liquidação antes de trocar de conta.')
    );
    render(<ManualTrading />);
    await act(async () => {
      fireEvent.change(screen.getByDisplayValue(/Virtual/), { target: { value: 'oauth:A:CR1' } });
    });
    expect(toast.error).toHaveBeenCalledWith(expect.stringMatching(/contrato em aberto/));
  });
});
