import { describe, it, expect } from 'vitest';
import { buildFinishedTrade, buildOperationRecord } from '@/app/(withSidebar)/home/components/finishedTrade';

// Real proposal_open_contract payload captured from a settled DIGITOVER on R_100.
const poc = {
  account_id: 62923101,
  audit_details: {
    all_ticks: [
      { epoch: 1794353052, tick: 519.67, tick_display_value: '519.67' },
      { epoch: 1794353054, flag: 'highlight_time', name: 'Start Time', tick: 519.89, tick_display_value: '519.89' },
      {
        epoch: 1794353056,
        flag: 'highlight_tick',
        name: 'Entry Spot and End Time and Exit Spot',
        tick: 519.92,
        tick_display_value: '519.92',
      },
    ],
  },
  barrier: '3',
  buy_price: '0.35',
  contract_id: 20144452219,
  contract_type: 'DIGITOVER',
  exit_spot: '519.92',
  id: 'd80d5967-8562-4a8d-a43e-be304e72ee74',
  payout: '0.55',
  profit: '-0.35',
  status: 'open',
  underlying_symbol: 'R_100',
};

describe('buildFinishedTrade', () => {
  it('uses the Deriv contract_id as id, not the subscription uuid', () => {
    expect(buildFinishedTrade(poc).id).toBe('20144452219');
  });

  it('reads the market from underlying_symbol', () => {
    expect(buildFinishedTrade(poc).market).toBe('R_100');
  });

  it('keeps barrier, amounts and last digits of the audit ticks', () => {
    const trade = buildFinishedTrade(poc);
    expect(trade.barrier).toBe('3');
    expect(trade.amount).toBe('0.35');
    expect(trade.profit).toBe('-0.35');
    expect(trade.resultBarrier).toBe('2');
    expect(trade.audit).toEqual({ tick_previous: '7', tick_start: '9', tick_end: '2' });
  });

  it('labels even/odd contracts instead of using the barrier', () => {
    expect(buildFinishedTrade({ ...poc, contract_type: 'DIGITEVEN', barrier: undefined }).barrier).toBe('Par');
    expect(buildFinishedTrade({ ...poc, contract_type: 'DIGITODD', barrier: undefined }).barrier).toBe('Ímpar');
  });
});

describe('buildOperationRecord', () => {
  const settled = {
    ...poc,
    currency: 'USD',
    date_expiry: 1794353056,
    entry_spot: '519.92',
    purchase_time: 1794353054,
    shortcode: 'DIGITOVER_R_100_0.55_1794353054_1T_3_0',
    transaction_ids: { buy: 38595339419 },
  };

  it('maps the contract fields Deriv returns', () => {
    const record = buildOperationRecord(settled, 'CR123');
    expect(record).toMatchObject({
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
    });
  });

  it('keeps the full audit ticks', () => {
    expect(buildOperationRecord(settled, 'CR123').audit).toEqual(poc.audit_details.all_ticks);
  });

  it('keeps the trailing zero of the exit spot as digit 0', () => {
    expect(buildOperationRecord({ ...settled, exit_spot: '519.90' }, 'CR123').exitDigit).toBe(0);
  });

  it('leaves optional fields null when Deriv omits them', () => {
    const record = buildOperationRecord(
      { ...settled, barrier: undefined, exit_spot: undefined, transaction_ids: undefined, audit_details: undefined },
      'CR123',
    );
    expect(record.barrier).toBeNull();
    expect(record.exitSpot).toBeNull();
    expect(record.exitDigit).toBeNull();
    expect(record.transactionId).toBeNull();
    expect(record.audit).toBeNull();
  });
});
