import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  verify: vi.fn(),
  userFindUnique: vi.fn(),
  findMany: vi.fn(),
  count: vi.fn(),
  aggregate: vi.fn(),
  groupBy: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  default: {
    user: { findUnique: mocks.userFindUnique },
    operation: {
      findMany: mocks.findMany,
      count: mocks.count,
      aggregate: mocks.aggregate,
      groupBy: mocks.groupBy,
    },
    $transaction: mocks.transaction,
  },
}));

vi.mock('jsonwebtoken', () => ({ default: { verify: mocks.verify } }));

const { getOperations, getOperationsForExport, getOperationFilterOptions } = await import(
  '@/app/(withSidebar)/operations/actions'
);

beforeEach(() => {
  vi.clearAllMocks();
  process.env.JWT_SECRET = 'secret';
  mocks.verify.mockReturnValue({ userId: 1 });
  mocks.userFindUnique.mockResolvedValue({ id: 1, role: 'admin' });
  mocks.transaction.mockImplementation((queries: Promise<unknown>[]) => Promise.all(queries));
});

describe('getOperations', () => {
  it('denies non-admin users', async () => {
    mocks.userFindUnique.mockResolvedValue({ id: 1, role: 'user' });
    const result = await getOperations({}, 0, 20, 'jwt');
    expect(result.error).toBe(true);
    expect(mocks.findMany).not.toHaveBeenCalled();
  });

  it('returns the page, the summary and breakdowns for the same filter', async () => {
    mocks.findMany.mockResolvedValue([{ id: 1 }]);
    mocks.count.mockResolvedValueOnce(4).mockResolvedValueOnce(3);
    mocks.aggregate.mockResolvedValue({ _sum: { deposit: 2, result: 0.5 } });
    mocks.groupBy
      .mockResolvedValueOnce([{ symbol: 'R_100', _count: { _all: 4 }, _sum: { deposit: 2, result: 0.5 } }])
      .mockResolvedValueOnce([{ symbol: 'R_100', _count: { _all: 3 } }])
      .mockResolvedValueOnce([{ contractType: 'DIGITOVER', _count: { _all: 4 }, _sum: { deposit: 2, result: 0.5 } }])
      .mockResolvedValueOnce([{ contractType: 'DIGITOVER', _count: { _all: 3 } }]);

    const result = await getOperations({ symbol: 'R_100' }, 20, 10, 'jwt');

    const where = { AND: [{ symbol: 'R_100' }] };
    expect(mocks.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where, skip: 20, take: 10, orderBy: { operationDate: 'desc' } }),
    );
    expect(mocks.count).toHaveBeenNthCalledWith(1, { where });
    expect(mocks.count).toHaveBeenNthCalledWith(2, { where: { AND: [where, { result: { gt: 0 } }] } });

    expect(result.error).toBe(false);
    expect(result.operations).toEqual([{ id: 1 }]);
    expect(result.total).toBe(4);
    expect(result.summary).toEqual({ total: 4, wins: 3, losses: 1, winRate: 75, staked: 2, profit: 0.5, roi: 25 });
    expect(result.bySymbol[0]).toMatchObject({ key: 'R_100', total: 4, wins: 3 });
    expect(result.byContractType[0]).toMatchObject({ key: 'DIGITOVER', total: 4, wins: 3 });
  });

  it('does not select the user password', async () => {
    mocks.findMany.mockResolvedValue([]);
    mocks.count.mockResolvedValue(0);
    mocks.aggregate.mockResolvedValue({ _sum: { deposit: null, result: null } });
    mocks.groupBy.mockResolvedValue([]);

    await getOperations({}, 0, 20, 'jwt');

    expect(mocks.findMany.mock.calls[0][0].include).toEqual({ user: { select: { id: true, name: true, email: true } } });
  });
});

describe('getOperationsForExport', () => {
  it('returns every filtered operation up to the export limit', async () => {
    mocks.findMany.mockResolvedValue([{ id: 1 }, { id: 2 }]);
    const result = await getOperationsForExport({ outcome: 'won' }, 'jwt');
    expect(result).toEqual({ operations: [{ id: 1 }, { id: 2 }], error: false });
    expect(mocks.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { AND: [{ result: { gt: 0 } }] }, take: 10000 }),
    );
  });

  it('denies an invalid token', async () => {
    mocks.verify.mockImplementation(() => {
      throw new Error('bad');
    });
    expect(await getOperationsForExport({}, 'jwt')).toEqual({ operations: [], error: true });
  });
});

describe('getOperationFilterOptions', () => {
  it('lists the distinct symbols and contract types present', async () => {
    mocks.findMany
      .mockResolvedValueOnce([{ symbol: 'R_10' }, { symbol: 'R_100' }])
      .mockResolvedValueOnce([{ contractType: 'DIGITOVER' }]);
    expect(await getOperationFilterOptions('jwt')).toEqual({
      symbols: ['R_10', 'R_100'],
      contractTypes: ['DIGITOVER'],
    });
  });
});
