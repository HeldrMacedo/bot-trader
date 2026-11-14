// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';

const saveOperationMock = vi.fn().mockResolvedValue({ ok: true });
vi.mock('../app/services/operationService', () => ({
  saveOperation: (...args: unknown[]) => saveOperationMock(...args),
}));

import { persistBotOperation } from '../app/services/botOperationPersistence';

const poc = {
  contract_id: 20144452219,
  transaction_ids: { buy: 40288904438 },
  account_id: 62923101,
  underlying_symbol: 'R_100',
  contract_type: 'DIGITDIFF',
  barrier: '7',
  buy_price: '0.35',
  profit: '0.03',
  payout: '0.38',
  currency: 'USD',
  entry_spot: '1234.50',
  exit_spot: '1234.52',
  purchase_time: 1763000000,
  date_expiry: 1763000002,
  shortcode: 'DIGITDIFF_R_100_0.38_1763000000_1T_7_0',
  audit_details: { all_ticks: [{ epoch: 1, tick: 1234.5 }] },
};

const account = (activeToken: string) => ({
  name: 'Fulano',
  activeToken,
  tokens: [
    { token: 'vrt', is_virtual: true },
    { token: 'real', is_virtual: false },
  ],
});

describe('persistBotOperation', () => {
  beforeEach(() => {
    saveOperationMock.mockClear();
    const store: Record<string, string> = { access_token: 'jwt-123' };
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => { store[k] = v; },
    });
  });

  it('salva a operação da conta real com os dados completos do contrato', () => {
    persistBotOperation(poc, account('real'));

    expect(saveOperationMock).toHaveBeenCalledTimes(1);
    expect(saveOperationMock).toHaveBeenCalledWith(
      expect.objectContaining({
        operationId: '20144452219',
        contractId: '20144452219',
        account: 'Fulano',
        symbol: 'R_100',
        contractType: 'DIGITDIFF',
        deposit: '0.35',
        result: '0.03',
        exitDigit: 2,
        token: 'jwt-123',
        isVirtual: false,
      })
    );
  });

  it('não salva operação da conta demo', () => {
    persistBotOperation(poc, account('vrt'));
    expect(saveOperationMock).not.toHaveBeenCalled();
  });

  it('não salva quando não sabe qual conta comprou o contrato', () => {
    persistBotOperation(poc, null);
    persistBotOperation(poc, account('token-desconhecido'));
    expect(saveOperationMock).not.toHaveBeenCalled();
  });

  it('não derruba a liquidação do robô se a gravação falhar', async () => {
    saveOperationMock.mockRejectedValueOnce(new Error('offline'));
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => persistBotOperation(poc, account('real'))).not.toThrow();
    await new Promise((r) => setTimeout(r, 0));

    expect(errSpy).toHaveBeenCalled();
    errSpy.mockRestore();
  });

  it('não derruba a liquidação se o POC vier incompleto', () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => persistBotOperation({ profit: 1 } as any, account('real'))).not.toThrow();
    errSpy.mockRestore();
  });
});
