import { describe, it, expect, vi, beforeEach } from 'vitest';
import { saveOperation } from '../app/services/operationService.js';

const fetchMock = vi.fn().mockResolvedValue({ ok: true });

beforeEach(() => {
  fetchMock.mockClear();
  vi.stubGlobal('fetch', fetchMock);
});

describe('saveOperation', () => {
  it('does not persist virtual-account operations', async () => {
    expect(await saveOperation({ operationId: '1', token: 't', isVirtual: true })).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('sends every contract field to /api/operation without the isVirtual flag', async () => {
    const record = {
      operationId: '20144452219',
      contractId: '20144452219',
      account: 'CR123',
      deposit: '0.35',
      result: '-0.35',
      symbol: 'R_100',
      audit: [{ epoch: 1, tick: 2 }],
    };
    await saveOperation({ ...record, token: 'jwt', isVirtual: false });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/operation');
    expect(JSON.parse(init.body)).toEqual({ ...record, token: 'jwt' });
  });
});
