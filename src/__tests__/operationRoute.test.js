import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  findUniqueUser: vi.fn(),
  findFirst: vi.fn(),
  create: vi.fn(),
  verify: vi.fn(),
}));

vi.mock('@prisma/client', () => ({
  PrismaClient: class {
    user = { findUnique: mocks.findUniqueUser };
    operation = { findFirst: mocks.findFirst, create: mocks.create };
  },
}));

vi.mock('jsonwebtoken', () => ({ default: { verify: mocks.verify } }));

const { POST } = await import('../app/api/operation/route.js');

const body = {
  token: 'jwt',
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
  audit: [{ epoch: 1794353052, tick: 519.67, tick_display_value: '519.67' }],
};

const post = (b) =>
  POST(new Request('http://localhost/api/operation', { method: 'POST', body: JSON.stringify(b) }));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.verify.mockReturnValue({ userId: 7 });
  mocks.findUniqueUser.mockResolvedValue({ id: 7 });
  mocks.findFirst.mockResolvedValue(null);
  mocks.create.mockImplementation(async ({ data }) => ({ id: 1, ...data }));
});

describe('POST /api/operation', () => {
  it('persists the full contract data', async () => {
    const res = await post(body);
    expect(res.status).toBe(201);

    const { data } = mocks.create.mock.calls[0][0];
    expect(data).toMatchObject({
      userId: 7,
      operationId: '20144452219',
      contractId: '20144452219',
      transactionId: '38595339419',
      derivAccountId: '62923101',
      account: 'CR123',
      symbol: 'R_100',
      contractType: 'DIGITOVER',
      barrier: '3',
      deposit: 0.35,
      result: -0.35,
      payout: 0.55,
      currency: 'USD',
      entrySpot: '519.92',
      exitSpot: '519.92',
      exitDigit: 2,
      shortcode: 'DIGITOVER_R_100_0.55_1794353054_1T_3_0',
      audit: body.audit,
    });
    expect(data.purchaseTime).toEqual(new Date(1794353054 * 1000));
    expect(data.expiryTime).toEqual(new Date(1794353056 * 1000));
  });

  it('derives outcome from the sign of the profit', async () => {
    await post({ ...body, result: '-0.35' });
    await post({ ...body, result: '0.20' });
    expect(mocks.create.mock.calls[0][0].data.outcome).toBe('lost');
    expect(mocks.create.mock.calls[1][0].data.outcome).toBe('won');
  });

  it('stores nulls for optional fields that were not sent', async () => {
    await post({ token: 'jwt', operationId: '1', account: 'CR123', deposit: '1', result: '-1' });
    const { data } = mocks.create.mock.calls[0][0];
    expect(data.contractId).toBeNull();
    expect(data.purchaseTime).toBeNull();
    expect(data.exitDigit).toBeNull();
    expect(data.audit).toBeUndefined();
  });

  it('rejects an operation already registered', async () => {
    mocks.findFirst.mockResolvedValue({ id: 9 });
    const res = await post(body);
    expect(res.status).toBe(400);
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it('rejects an invalid token', async () => {
    mocks.verify.mockImplementation(() => {
      throw new Error('bad');
    });
    const res = await post(body);
    expect(res.status).toBe(404);
    expect(mocks.create).not.toHaveBeenCalled();
  });
});
