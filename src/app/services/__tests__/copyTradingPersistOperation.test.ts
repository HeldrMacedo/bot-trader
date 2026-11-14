import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('ws', () => ({
  default: vi.fn().mockImplementation(() => ({
    on: vi.fn(),
    send: vi.fn(),
    close: vi.fn(),
    readyState: 1,
  })),
}));

const saveMock = vi.fn();
vi.mock('../operationRepository', () => ({
  saveRealOperation: (...args: unknown[]) => saveMock(...args),
}));

import { CopyTradingService } from '../copyTradingService';

const poc = (contractId: number, profit: number) => ({
  contract_id: contractId,
  transaction_ids: { buy: 555 },
  account_id: 62923101,
  underlying_symbol: 'R_100',
  contract_type: 'DIGITOVER',
  barrier: '3',
  buy_price: 0.35,
  profit,
  payout: 0.55,
  currency: 'USD',
  entry_spot: '519.90',
  exit_spot: '519.92',
  purchase_time: 1794353054,
  date_expiry: 1794353056,
  shortcode: 'DIGITOVER_R_100_0.55_1794353054_1T_3_0',
  status: profit > 0 ? 'won' : 'lost',
});

function createService(configure: Record<string, any> = {}) {
  const service = new CopyTradingService('demoToken', 'realToken', '42', {
    initialValue: 0.35,
    stakeMultiple: 1,
    ...configure,
  });
  const internal = service as any;
  internal.isRunning = false;
  return { service, internal };
}

const flush = () => new Promise((r) => setTimeout(r, 0));

describe('CopyTradingService - grava operações reais na tabela Operation', () => {
  beforeEach(() => {
    saveMock.mockReset().mockResolvedValue(true);
  });

  it('grava o contrato real liquidado para o usuário da sessão', async () => {
    const { internal } = createService();
    internal.tradeExecutor.emit('loginid', 'CR123456');

    internal.tradeExecutor.emit('transaction', poc(9001, -0.35));
    await flush();

    expect(saveMock).toHaveBeenCalledTimes(1);
    const [userId, record] = saveMock.mock.calls[0];
    expect(userId).toBe(42);
    expect(record).toMatchObject({
      operationId: '9001',
      contractId: '9001',
      account: 'CR123456',
      symbol: 'R_100',
      contractType: 'DIGITOVER',
      deposit: 0.35,
      result: -0.35,
      exitDigit: 2,
    });
  });

  it('usa um rótulo de conta real quando a Deriv não informou o loginid', async () => {
    const { internal } = createService();

    internal.tradeExecutor.emit('transaction', poc(9002, 0.2));
    await flush();

    const [, record] = saveMock.mock.calls[0];
    expect(record.account).toBe('BotTrader');
  });

  it('não grava duas vezes o mesmo contrato', async () => {
    const { internal } = createService();

    internal.tradeExecutor.emit('transaction', poc(9003, 0.2));
    internal.tradeExecutor.emit('transaction', poc(9003, 0.2));
    await flush();

    expect(saveMock).toHaveBeenCalledTimes(1);
  });

  it('não grava no modo teste, que opera na conta demo', async () => {
    const { internal } = createService({ testMode: true });

    internal.tradeExecutor.emit('transaction', poc(9004, 0.2));
    await flush();

    expect(saveMock).not.toHaveBeenCalled();
  });

  it('não grava quando o token "real" é na verdade de conta virtual', async () => {
    const { internal } = createService();
    internal.tradeExecutor.emit('loginid', 'VRTC999');

    internal.tradeExecutor.emit('transaction', poc(9005, 0.2));
    await flush();

    expect(saveMock).not.toHaveBeenCalled();
  });

  it('falha na gravação não interrompe o copy trading', async () => {
    saveMock.mockRejectedValueOnce(new Error('db offline'));
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { internal } = createService();
    internal.onTrade = true;

    expect(() => internal.tradeExecutor.emit('transaction', poc(9006, -0.35))).not.toThrow();
    await flush();

    expect(internal.onTrade).toBe(false);
    expect(internal.realTransactions).toHaveLength(1);
    expect(internal.martingaleLevel).toBe(1);
    errSpy.mockRestore();
  });
});
