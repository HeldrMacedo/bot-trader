import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getDerivAppId,
  buildDerivWsUrl,
  isPatToken,
  parseDerivToken,
  fetchOtpWebsocketUrl,
  fetchAccountIdFromPat,
  resolveDerivConnection,
} from '../app/services/derivConfig';

function respond(body: any, ok = true, status = 200) {
  return { ok, status, json: async () => body, text: async () => JSON.stringify(body) };
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
  vi.stubEnv('NEXT_PUBLIC_APPID', '');
  vi.stubEnv('NEXT_PUBLIC_DERIV_CLIENT_ID', 'client-x');
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('derivConfig', () => {
  it('app_id: env ou fallback 1089; URL legada', () => {
    expect(getDerivAppId()).toBe('1089');
    vi.stubEnv('NEXT_PUBLIC_APPID', '777');
    expect(getDerivAppId()).toBe('777');
    expect(buildDerivWsUrl()).toBe('wss://ws.derivws.com/websockets/v3?app_id=777&l=en&brand=deriv');
  });

  it('classifica tokens', () => {
    expect(isPatToken('pat_abc')).toBe(true);
    expect(isPatToken(undefined as any)).toBe(false);
    expect(parseDerivToken('oauth:at:CR1')).toEqual({ kind: 'oauth', accessToken: 'at', accountId: 'CR1', raw: 'oauth:at:CR1' });
    expect(parseDerivToken('pat_x')).toEqual({ kind: 'pat', token: 'pat_x', raw: 'pat_x' });
    expect(parseDerivToken('abc')).toEqual({ kind: 'classic', token: 'abc', raw: 'abc' });
  });

  it('OTP: devolve url ou websocket_url', async () => {
    fetchMock.mockResolvedValueOnce(respond({ data: { url: 'wss://otp/1' } }));
    expect(await fetchOtpWebsocketUrl('at', 'CR1')).toBe('wss://otp/1');
    fetchMock.mockResolvedValueOnce(respond({ data: { websocket_url: 'wss://otp/2' } }));
    expect(await fetchOtpWebsocketUrl('at', 'CR1')).toBe('wss://otp/2');
    expect(fetchMock.mock.calls[0][0]).toBe('https://api.derivws.com/trading/v1/options/accounts/CR1/otp');
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer at');
  });

  it('OTP: erro HTTP, corpo ilegível e resposta sem url', async () => {
    fetchMock.mockResolvedValueOnce(respond({ e: 1 }, false, 401));
    await expect(fetchOtpWebsocketUrl('at', 'CR1')).rejects.toThrow('Falha ao gerar OTP da Deriv (401)');
    fetchMock.mockResolvedValueOnce({ ok: false, status: 500, text: async () => { throw new Error('x'); } });
    await expect(fetchOtpWebsocketUrl('at', 'CR1')).rejects.toThrow('(500): ');
    fetchMock.mockResolvedValueOnce(respond({ data: {} }));
    await expect(fetchOtpWebsocketUrl('at', 'CR1')).rejects.toThrow('sem websocket_url');
  });

  it('contas do PAT: escolhe pelo tipo; erros HTTP e lista vazia', async () => {
    const accounts = { data: [{ account_type: 'real', account_id: 'CR9' }, { account_type: 'demo', account_id: 'VRTC1' }] };
    fetchMock.mockResolvedValueOnce(respond(accounts));
    expect(await fetchAccountIdFromPat('pat_x', 'demo')).toBe('VRTC1');
    fetchMock.mockResolvedValueOnce(respond({ e: 1 }, false, 403));
    await expect(fetchAccountIdFromPat('pat_x', 'demo')).rejects.toThrow('Falha ao buscar contas do PAT (403)');
    fetchMock.mockResolvedValueOnce({ ok: false, status: 502, text: async () => { throw new Error('x'); } });
    await expect(fetchAccountIdFromPat('pat_x', 'demo')).rejects.toThrow('(502)');
    fetchMock.mockResolvedValueOnce(respond({ data: [] }));
    await expect(fetchAccountIdFromPat('pat_x', 'demo')).rejects.toThrow('Nenhuma conta');
    fetchMock.mockResolvedValueOnce(respond({}));
    await expect(fetchAccountIdFromPat('pat_x', 'demo')).rejects.toThrow('Nenhuma conta');
  });

  it('resolve: oauth -> OTP; PAT -> conta + OTP; clássico -> authorize', async () => {
    fetchMock.mockResolvedValueOnce(respond({ data: { url: 'wss://otp/o' } }));
    expect(await resolveDerivConnection('oauth:at:CR1', 'real')).toEqual({ url: 'wss://otp/o', needsAuthorize: false, token: 'oauth:at:CR1' });

    fetchMock
      .mockResolvedValueOnce(respond({ data: [{ account_type: 'real', account_id: 'CR9' }] }))
      .mockResolvedValueOnce(respond({ data: { url: 'wss://otp/p' } }));
    expect(await resolveDerivConnection('pat_x', 'real')).toEqual({ url: 'wss://otp/p', needsAuthorize: false, token: 'pat_x' });
    expect(fetchMock.mock.calls[2][0]).toContain('/accounts/CR9/otp');

    const classic = await resolveDerivConnection('abc', 'demo');
    expect(classic).toEqual({ url: buildDerivWsUrl(), needsAuthorize: true, token: 'abc' });
  });

  // PAT cuja lista não tem conta do tipo pedido: accountId undefined vira ".../accounts/undefined/otp".
  it('BUG-14: PAT sem conta do tipo pedido falha com erro claro, sem chamar OTP de "undefined"', async () => {
    fetchMock
      .mockResolvedValueOnce(respond({ data: [{ account_type: 'demo', account_id: 'VRTC1' }] }))
      .mockResolvedValueOnce(respond({ data: { url: 'wss://otp/x' } }));
    await expect(resolveDerivConnection('pat_x', 'real')).rejects.toThrow('Nenhuma conta real encontrada para este token PAT.');
    expect(fetchMock.mock.calls.some((c) => String(c[0]).includes('/accounts/undefined/'))).toBe(false);
  });
});
