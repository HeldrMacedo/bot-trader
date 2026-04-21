import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---- mock do localStorage ---------------------------------------------------

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock });

// ---- mock do fetch ----------------------------------------------------------

const mockFetch = vi.fn();
Object.defineProperty(globalThis, 'fetch', { value: mockFetch });

// ---- import após mocks ------------------------------------------------------

const { userLogin, checkToken, logout } = await import('../app/services/userService.js');

// ---- testes -----------------------------------------------------------------

beforeEach(() => {
  localStorageMock.clear();
  mockFetch.mockReset();
});

describe('userLogin', () => {
  it('salva access_token no localStorage em login bem-sucedido', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ token: 'jwt-token-abc' }),
    });

    await userLogin('user@test.com', 'senha123');

    expect(localStorage.getItem('access_token')).toBe('jwt-token-abc');
  });

  it('não salva token quando resposta não é ok', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: 'Credenciais inválidas' }),
    });

    await userLogin('user@test.com', 'errada');

    expect(localStorage.getItem('access_token')).toBeNull();
  });
});

describe('checkToken', () => {
  it('retorna usuário quando token é válido', async () => {
    localStorage.setItem('access_token', 'valid-jwt');
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ user: { id: 1, name: 'João', email: 'joao@test.com', role: 'user' } }),
    });

    const user = await checkToken();

    expect(user).toMatchObject({ id: 1, name: 'João' });
  });

  it('remove access_token do localStorage quando token é inválido', async () => {
    localStorage.setItem('access_token', 'expired-jwt');
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: 'Token inválido ou expirado' }),
    });

    const result = await checkToken();

    expect(result).toBe(false);
    expect(localStorage.getItem('access_token')).toBeNull();
  });

  it('envia o token correto no body da requisição', async () => {
    localStorage.setItem('access_token', 'my-specific-token');
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ user: { id: 2 } }),
    });

    await checkToken();

    const callArgs = mockFetch.mock.calls[0];
    const body = JSON.parse(callArgs[1].body);
    expect(body.token).toBe('my-specific-token');
  });
});

describe('logout', () => {
  it('remove access_token do localStorage', async () => {
    localStorage.setItem('access_token', 'some-token');
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) });

    await logout();

    expect(localStorage.getItem('access_token')).toBeNull();
  });

  it('chama POST /api/logout', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) });

    await logout();

    expect(mockFetch).toHaveBeenCalledWith('/api/logout', { method: 'POST' });
  });

  it('não lança erro se /api/logout falhar', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    await expect(logout()).resolves.toBeUndefined();
    expect(localStorage.getItem('access_token')).toBeNull();
  });
});
