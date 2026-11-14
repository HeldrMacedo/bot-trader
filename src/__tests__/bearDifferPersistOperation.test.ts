// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBearDiffer } from '../app/hooks/useBearDiffer';

const persistMock = vi.fn();
vi.mock('../app/services/botOperationPersistence', () => ({
  persistBotOperation: (...args: unknown[]) => persistMock(...args),
}));

const mockSend = vi.fn().mockResolvedValue({});
const listeners: Record<string, Function[]> = {};
let storedAccount: any;

const emit = (event: string, data: any) => (listeners[event] || []).forEach((cb) => cb(data));

vi.mock('../app/services/DerivService', () => ({
  DerivService: {
    getInstance: () => ({
      send: mockSend,
      subscribe: vi.fn().mockResolvedValue({}),
      switchAccount: vi.fn().mockResolvedValue({}),
      isMarketConnected: true,
      getStorageDerivAccount: () => [storedAccount],
      observerInstance: {
        on: (event: string, cb: Function) => {
          (listeners[event] ||= []).push(cb);
          return `${event}_${listeners[event].length}`;
        },
        removeById: vi.fn(),
      },
    }),
  },
}));

const account = (activeToken: string) => ({
  name: 'Fulano',
  activeToken,
  tokens: [
    { token: 'vrtc_123', is_virtual: true, balance: 10000, currency: 'USD' },
    { token: 'real_456', is_virtual: false, balance: 500, currency: 'USD' },
  ],
});

const openReal = async (result: { current: ReturnType<typeof useBearDiffer> }, contractId = 4242) => {
  act(() => {
    result.current.updateConfig({
      opMode: 'real', gateOps: 0, gateAcc: 0, fastExec: false, stake: 1, stopLoss: 0, stopWin: 0,
    });
  });
  mockSend.mockResolvedValueOnce({ buy: { contract_id: contractId, buy_price: 1 } });
  await act(async () => {
    await result.current.executeTrade('R_10', 4);
  });
};

const soldPoc = (contractId: number, profit: number) => ({
  contract_id: contractId,
  is_sold: 1,
  profit,
  exit_spot: '1234.567',
});

describe('useBearDiffer - grava operações liquidadas na tabela Operation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const k in listeners) delete listeners[k];
    storedAccount = account('real_456');
  });

  it('envia o contrato liquidado para gravação com a conta ativa', async () => {
    const { result } = renderHook(() => useBearDiffer());
    await openReal(result);

    const poc = soldPoc(4242, 0.11);
    act(() => { emit('deriv.proposal_open_contract', { proposal_open_contract: poc }); });

    expect(persistMock).toHaveBeenCalledTimes(1);
    expect(persistMock).toHaveBeenCalledWith(poc, expect.objectContaining({ activeToken: 'real_456' }));
  });

  it('usa a conta vigente após troca de conta, não a do primeiro render', async () => {
    storedAccount = account('vrtc_123');
    const { result } = renderHook(() => useBearDiffer());
    act(() => { emit('account.update', account('real_456')); });

    await openReal(result);
    act(() => { emit('deriv.proposal_open_contract', { proposal_open_contract: soldPoc(4242, -1) }); });

    expect(persistMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ activeToken: 'real_456' })
    );
  });

  it('não grava POC de contrato que este bot não abriu', async () => {
    const { result } = renderHook(() => useBearDiffer());
    await openReal(result);

    act(() => { emit('deriv.proposal_open_contract', { proposal_open_contract: soldPoc(9999, 1) }); });

    expect(persistMock).not.toHaveBeenCalled();
  });

  it('não grava duas vezes quando a Deriv reenvia o mesmo POC', async () => {
    const { result } = renderHook(() => useBearDiffer());
    await openReal(result);

    act(() => {
      emit('deriv.proposal_open_contract', { proposal_open_contract: soldPoc(4242, 0.11) });
      emit('deriv.proposal_open_contract', { proposal_open_contract: soldPoc(4242, 0.11) });
    });

    expect(persistMock).toHaveBeenCalledTimes(1);
  });
});
