import { describe, it, expect } from 'vitest';
import {
  buildOperationWhere,
  contractLabel,
  mergeBreakdown,
  operationsToCsv,
  resolveOutcome,
  summarizeOperations,
} from '@/app/(withSidebar)/operations/report';

describe('buildOperationWhere', () => {
  it('returns an empty filter when nothing is selected', () => {
    expect(buildOperationWhere({})).toEqual({});
  });

  it('searches operation id, contract id, account and user name', () => {
    expect(buildOperationWhere({ search: ' 2014 ' })).toEqual({
      AND: [
        {
          OR: [
            { operationId: { contains: '2014' } },
            { contractId: { contains: '2014' } },
            { account: { contains: '2014' } },
            { user: { name: { contains: '2014' } } },
          ],
        },
      ],
    });
  });

  it('filters by date range, symbol and contract type', () => {
    const where = buildOperationWhere({
      from: '2026-11-01T03:00:00.000Z',
      to: '2026-11-02T02:59:59.999Z',
      symbol: 'R_100',
      contractType: 'DIGITOVER',
    });
    expect(where).toEqual({
      AND: [
        {
          operationDate: {
            gte: new Date('2026-11-01T03:00:00.000Z'),
            lte: new Date('2026-11-02T02:59:59.999Z'),
          },
        },
        { symbol: 'R_100' },
        { contractType: 'DIGITOVER' },
      ],
    });
  });

  it('ignores invalid dates', () => {
    expect(buildOperationWhere({ from: 'not-a-date', to: '' })).toEqual({});
  });

  it('filters outcome by the profit sign so rows without outcome still match', () => {
    expect(buildOperationWhere({ outcome: 'won' })).toEqual({ AND: [{ result: { gt: 0 } }] });
    expect(buildOperationWhere({ outcome: 'lost' })).toEqual({ AND: [{ result: { lte: 0 } }] });
  });
});

describe('summarizeOperations', () => {
  it('computes totals, win rate and ROI', () => {
    expect(summarizeOperations({ total: 4, wins: 3, staked: 2, profit: 0.5 })).toEqual({
      total: 4,
      wins: 3,
      losses: 1,
      winRate: 75,
      staked: 2,
      profit: 0.5,
      roi: 25,
    });
  });

  it('avoids division by zero when there are no operations', () => {
    expect(summarizeOperations({ total: 0, wins: 0, staked: 0, profit: 0 })).toEqual({
      total: 0,
      wins: 0,
      losses: 0,
      winRate: 0,
      staked: 0,
      profit: 0,
      roi: 0,
    });
  });
});

describe('mergeBreakdown', () => {
  it('joins totals with win counts and sorts by volume', () => {
    const totals = [
      { key: 'R_10', _count: { _all: 1 }, _sum: { deposit: 1, result: -1 } },
      { key: 'R_100', _count: { _all: 3 }, _sum: { deposit: 3, result: 0.4 } },
    ];
    const wins = [{ key: 'R_100', _count: { _all: 2 } }];
    expect(mergeBreakdown(totals, wins, 'key')).toEqual([
      { key: 'R_100', total: 3, wins: 2, losses: 1, winRate: (2 / 3) * 100, staked: 3, profit: 0.4, roi: (0.4 / 3) * 100 },
      { key: 'R_10', total: 1, wins: 0, losses: 1, winRate: 0, staked: 1, profit: -1, roi: -100 },
    ]);
  });

  it('labels rows saved before the column existed', () => {
    const totals = [{ key: null, _count: { _all: 5 }, _sum: { deposit: 5, result: 1 } }];
    expect(mergeBreakdown(totals, [], 'key')[0].key).toBe('Sem dado');
  });
});

describe('resolveOutcome', () => {
  it('prefers the stored outcome', () => {
    expect(resolveOutcome({ outcome: 'won', result: -1 })).toBe('won');
  });

  it('falls back to the profit sign for older rows', () => {
    expect(resolveOutcome({ outcome: null, result: 0.2 })).toBe('won');
    expect(resolveOutcome({ outcome: null, result: 0 })).toBe('lost');
    expect(resolveOutcome({ outcome: null, result: -0.35 })).toBe('lost');
  });
});

describe('contractLabel', () => {
  it('describes digit contracts with their barrier', () => {
    expect(contractLabel('DIGITOVER', '3')).toBe('Acima de 3');
    expect(contractLabel('DIGITUNDER', '7')).toBe('Abaixo de 7');
    expect(contractLabel('DIGITMATCH', '5')).toBe('Igual a 5');
    expect(contractLabel('DIGITDIFF', '5')).toBe('Diferente de 5');
  });

  it('omits the barrier for even/odd', () => {
    expect(contractLabel('DIGITEVEN', null)).toBe('Par');
    expect(contractLabel('DIGITODD', null)).toBe('Ímpar');
  });

  it('falls back to the raw type or a dash', () => {
    expect(contractLabel('MULTUP', null)).toBe('MULTUP');
    expect(contractLabel(null, null)).toBe('—');
  });
});

describe('operationsToCsv', () => {
  const op = {
    id: 1,
    operationId: '20144452219',
    contractId: '20144452219',
    transactionId: '38595339419',
    derivAccountId: '62923101',
    account: 'CR123',
    operationDate: new Date('2026-11-10T12:00:00.000Z'),
    deposit: 0.35,
    result: -0.35,
    outcome: 'lost',
    payout: 0.55,
    currency: 'USD',
    symbol: 'R_100',
    contractType: 'DIGITOVER',
    barrier: '3',
    entrySpot: '519.92',
    exitSpot: '519.92',
    exitDigit: 2,
    purchaseTime: new Date('2026-11-10T11:59:58.000Z'),
    expiryTime: new Date('2026-11-10T12:00:00.000Z'),
    shortcode: 'DIGITOVER_R_100_0.55_1794353054_1T_3_0',
    user: { name: 'Fulano; "Teste"' },
  };

  it('writes a semicolon separated header and rows with decimal commas', () => {
    const [header, row] = operationsToCsv([op]).split('\n');
    expect(header.split(';')).toEqual([
      'Data',
      'Usuário',
      'Conta',
      'Tipo de conta',
      'ID Contrato',
      'ID Transação',
      'Conta Deriv',
      'Ativo',
      'Contrato',
      'Barreira',
      'Stake',
      'Payout',
      'Lucro',
      'Resultado',
      'Moeda',
      'Spot entrada',
      'Spot saída',
      'Dígito saída',
      'Compra',
      'Expiração',
      'Shortcode',
    ]);
    expect(row).toContain('"Fulano; ""Teste"""');
    expect(row).toContain(';0,35;0,55;-0,35;Loss;USD;');
    expect(row).toContain(';Acima de 3;3;');
    expect(row).toContain(';20144452219;38595339419;62923101;R_100;');
  });

  it('uses the legacy operation id and blanks for missing fields', () => {
    const legacy = {
      ...op,
      operationId: 'd80d5967',
      contractId: null,
      transactionId: null,
      payout: null,
      exitDigit: null,
      purchaseTime: null,
      outcome: null,
      result: 1,
    };
    const row = operationsToCsv([legacy]).split('\n')[1];
    expect(row).toContain(';d80d5967;;');
    expect(row).toContain(';0,35;;1,00;Win;');
  });
});
