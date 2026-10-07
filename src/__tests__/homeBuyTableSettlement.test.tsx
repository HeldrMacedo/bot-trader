// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';
import React from 'react';
import { createFakeDeriv, installStorage, seedHomeAccount, soldContract } from './homeTestDeriv';

const h = vi.hoisted(() => ({ deriv: null as any }));

vi.mock('@/app/services/DerivService', () => ({
  DerivService: { getInstance: () => h.deriv },
}));
vi.mock('@/app/services/operationService', () => ({ saveOperation: vi.fn() }));
vi.mock('react-toastify', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

import BuyTable from '../app/(withSidebar)/home/components/buyTable';
import { saveOperation } from '@/app/services/operationService';

function renderBuyTable(props: Record<string, any> = {}) {
  const onPurchaseStatusChange = vi.fn();
  render(
    <BuyTable
      isVirtual={false}
      multiplicadorProp={vi.fn()}
      onPurchaseStatusChange={onPurchaseStatusChange}
      {...props}
    />
  );
  return { onPurchaseStatusChange };
}

async function buy(contractId: number) {
  h.deriv.send.mockResolvedValueOnce({ buy: { contract_id: contractId }, echo_req: { buy: 1 } });
  await act(async () => {
    fireEvent.click(screen.getByText('Comprar Acima'));
  });
}

const storedResults = () => JSON.parse(localStorage.getItem('deriv_accounts')!)[0].results;

describe('BuyTable — liquidação de contratos', () => {
  beforeEach(() => {
    installStorage();
    seedHomeAccount();
    h.deriv = createFakeDeriv();
    vi.mocked(saveOperation).mockClear();
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('registra o resultado de dois contratos abertos em sequência antes da liquidação', async () => {
    renderBuyTable();
    await buy(111);
    await buy(222);

    // Contratos de 1 tick comprados em sequência liquidam no mesmo tick: as duas
    // mensagens chegam antes de o React re-renderizar.
    act(() => {
      h.deriv.observerInstance.emit('deriv.proposal_open_contract', soldContract(111, 0.95));
      h.deriv.observerInstance.emit('deriv.proposal_open_contract', soldContract(222, 0.95));
    });

    expect(saveOperation).toHaveBeenCalledWith(expect.objectContaining({ operationId: 'sub-111' }));
    expect(saveOperation).toHaveBeenCalledWith(expect.objectContaining({ operationId: 'sub-222' }));
    expect(storedResults().wins).toBe(2);
  });

  it('avisa o usuário quando o acompanhamento do contrato falha (sem rejeição solta)', async () => {
    const { toast } = await import('react-toastify');
    h.deriv.subscribe.mockRejectedValueOnce({ code: 'Timeout', message: 'Limite de tempo expirado' });
    renderBuyTable();
    await buy(111);
    await act(async () => {});

    expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('111'));
  });

  it('conta uma única vez quando o is_sold do mesmo contrato chega duplicado', async () => {
    renderBuyTable();
    await buy(111);

    act(() => {
      h.deriv.observerInstance.emit('deriv.proposal_open_contract', soldContract(111, -1));
    });
    act(() => {
      h.deriv.observerInstance.emit('deriv.proposal_open_contract', soldContract(111, -1));
    });

    expect(saveOperation).toHaveBeenCalledTimes(1);
    expect(storedResults()).toEqual({ loss: 1, result: -1, wins: 0 });
  });
});
