import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  findFirst: vi.fn(),
  update: vi.fn(),
  hash: vi.fn().mockResolvedValue('new_hashed_pw'),
}));

vi.mock('@prisma/client', () => ({
  PrismaClient: class {
    user = { findFirst: mocks.findFirst, update: mocks.update };
  },
}));

vi.mock('bcryptjs', () => ({
  default: { hash: mocks.hash },
}));

const { POST } = await import('../app/api/reset-password/route.ts');

function makeRequest(body) {
  return new Request('http://localhost/api/reset-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const freshTokenSentAt = new Date(Date.now() - 5 * 60 * 1000); // 5 min atrás

beforeEach(() => {
  vi.clearAllMocks();
  mocks.hash.mockResolvedValue('new_hashed_pw');
});

describe('POST /api/reset-password', () => {
  it('retorna 400 quando token ou senha estão ausentes', async () => {
    const res = await POST(makeRequest({ token: 'abc' }));
    expect(res.status).toBe(400);
  });

  it('retorna 400 para senha com menos de 8 caracteres', async () => {
    const res = await POST(makeRequest({ token: 'abc', password: '1234567' }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/8 caracteres/i);
  });

  it('retorna 400 para token não encontrado no banco', async () => {
    mocks.findFirst.mockResolvedValue(null);
    const res = await POST(makeRequest({ token: 'invalid', password: 'novaSenha123' }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/inválido/i);
  });

  it('retorna 400 e limpa token quando expirado (> 30 min)', async () => {
    mocks.findFirst.mockResolvedValue({
      id: 1,
      passwordToken: 'expired',
      tokenSentAt: new Date(Date.now() - 31 * 60 * 1000),
    });
    const res = await POST(makeRequest({ token: 'expired', password: 'novaSenha123' }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/expirado/i);
    expect(mocks.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { passwordToken: null } })
    );
  });

  it('redefine senha com sucesso para token válido dentro do prazo', async () => {
    mocks.findFirst.mockResolvedValue({ id: 5, passwordToken: 'valid', tokenSentAt: freshTokenSentAt });
    mocks.update.mockResolvedValue({});
    const res = await POST(makeRequest({ token: 'valid', password: 'novaSenha123' }));
    expect(res.status).toBe(200);
    expect((await res.json()).success).toBe(true);
  });

  it('usa bcrypt com 12 rounds ao redefinir', async () => {
    mocks.findFirst.mockResolvedValue({ id: 5, passwordToken: 'valid', tokenSentAt: freshTokenSentAt });
    mocks.update.mockResolvedValue({});
    await POST(makeRequest({ token: 'valid', password: 'novaSenha123' }));
    expect(mocks.hash).toHaveBeenCalledWith('novaSenha123', 12);
  });

  it('limpa passwordToken após redefinição bem-sucedida', async () => {
    mocks.findFirst.mockResolvedValue({ id: 5, passwordToken: 'valid', tokenSentAt: freshTokenSentAt });
    mocks.update.mockResolvedValue({});
    await POST(makeRequest({ token: 'valid', password: 'novaSenha123' }));
    expect(mocks.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ passwordToken: null }),
      })
    );
  });
});
