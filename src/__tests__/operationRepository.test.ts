import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  findFirst: vi.fn(),
  create: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  default: { operation: { findFirst: mocks.findFirst, create: mocks.create } },
}));

import { saveRealOperation } from '../app/services/operationRepository';

const record = {
  operationId: '20144452219',
  contractId: '20144452219',
  transactionId: '38595339419',
  derivAccountId: '62923101',
  account: 'CR123',
  symbol: 'R_100',
  contractType: 'DIGITOVER',
  barrier: '3',
  deposit: '0.35',
  result: '-0.35',
  payout: '0.55',
  currency: 'USD',
  entrySpot: '519.92',
  exitSpot: '519.92',
  exitDigit: 2,
  purchaseTime: 1794353054,
  expiryTime: 1794353056,
  shortcode: 'DIGITOVER_R_100_0.55_1794353054_1T_3_0',
  audit: [{ epoch: 1794353054, tick: 519.9 }],
};

describe('saveRealOperation', () => {
  beforeEach(() => {
    mocks.findFirst.mockReset().mockResolvedValue(null);
    mocks.create.mockReset().mockResolvedValue({ id: 1 });
  });

  it('grava a operação com os mesmos campos convertidos da rota /api/operation', async () => {
    expect(await saveRealOperation(7, record)).toBe(true);

    const { data } = mocks.create.mock.calls[0][0];
    expect(data).toMatchObject({
      userId: 7,
      operationId: '20144452219',
      contractId: '20144452219',
      account: 'CR123',
      deposit: 0.35,
      result: -0.35,
      outcome: 'lost',
      payout: 0.55,
      exitDigit: 2,
      symbol: 'R_100',
      contractType: 'DIGITOVER',
      audit: record.audit,
    });
    expect(data.purchaseTime).toEqual(new Date(1794353054 * 1000));
    expect(data.expiryTime).toEqual(new Date(1794353056 * 1000));
    expect(data.operationDate).toBeInstanceOf(Date);
  });

  it('marca como won quando o lucro é positivo', async () => {
    await saveRealOperation(7, { ...record, result: '0.20' });
    expect(mocks.create.mock.calls[0][0].data.outcome).toBe('won');
  });

  it('não grava de novo uma operação já registrada', async () => {
    mocks.findFirst.mockResolvedValue({ id: 99 });

    expect(await saveRealOperation(7, record)).toBe(false);
    expect(mocks.findFirst).toHaveBeenCalledWith({ where: { operationId: '20144452219' } });
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it('recusa userId inválido sem tocar no banco', async () => {
    expect(await saveRealOperation(Number('abc'), record)).toBe(false);
    expect(mocks.create).not.toHaveBeenCalled();
  });
});
