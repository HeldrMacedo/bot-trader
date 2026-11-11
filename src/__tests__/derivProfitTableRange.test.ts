// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('react-toastify', () => ({ toast: { error: vi.fn() } }));

import { DerivService } from '../app/services/DerivService';

class MemoryStorage {
  private data = new Map<string, string>();
  getItem(key: string) {
    return this.data.has(key) ? this.data.get(key)! : null;
  }
  setItem(key: string, value: string) {
    this.data.set(key, String(value));
  }
  removeItem(key: string) {
    this.data.delete(key);
  }
  clear() {
    this.data.clear();
  }
}

class IdleWebSocket {
  static OPEN = 1;
  readyState = 0;
  addEventListener() {}
  send() {}
  close() {}
}

describe('DerivService.getProfitTableForAccount — período', () => {
  let service: any;
  let send: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    (DerivService as any).instance = undefined;
    vi.stubGlobal('localStorage', new MemoryStorage());
    vi.stubGlobal('sessionStorage', new MemoryStorage());
    vi.stubGlobal('WebSocket', IdleWebSocket);
    vi.spyOn(DerivService.prototype, 'loginDeriv').mockResolvedValue(undefined);
    vi.spyOn(DerivService.prototype, 'reconnect').mockImplementation(() => {});

    service = DerivService.getInstance();
    // Active, authorized account: the request goes through the main connection.
    service.currentAccount = { activeToken: 'tok' };
    service.isAuthorized = true;
    vi.spyOn(service, 'isConnected', 'get').mockReturnValue(true);
    send = vi.fn().mockResolvedValue({ profit_table: { transactions: [] } });
    service.send = send;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('sends date_from and date_to when a range is given', async () => {
    await service.getProfitTableForAccount('tok', 500, 0, { dateFrom: 1794300000, dateTo: 1794399999 });
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({ profit_table: 1, limit: 500, offset: 0, date_from: 1794300000, date_to: 1794399999 }),
    );
  });

  it('omits the range when none is given', async () => {
    await service.getProfitTableForAccount('tok', 20, 0);
    const payload = send.mock.calls[0][0];
    expect(payload).not.toHaveProperty('date_from');
    expect(payload).not.toHaveProperty('date_to');
  });
});
