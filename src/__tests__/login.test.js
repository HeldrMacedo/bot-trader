import { describe, it, expect, vi, beforeEach } from 'vitest';
import { _clearStore } from '../app/lib/rateLimiter.js';

process.env.JWT_SECRET = 'test-secret-aaaabbbbccccddddeeeeffffgggghhhh';

// vi.hoisted garante que os mocks existam antes do hoisting do vi.mock
const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  compare: vi.fn(),
}));

vi.mock('@prisma/client', () => ({
  PrismaClient: class {
    user = { findUnique: mocks.findUnique };
  },
}));

vi.mock('bcryptjs', () => ({
  default: { compare: mocks.compare, hash: vi.fn() },
}));

const { POST } = await import('../app/api/login/route.js');

function makeRequest(body, ip = '1.2.3.4') {
  return new Request('http://localhost/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-forwarded-for': ip },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  _clearStore();
  vi.clearAllMocks();
});

describe('POST /api/login', () => {
  it('retorna 400 para email inválido', async () => {
    const res = await POST(makeRequest({ email: 'invalido', password: '123456' }));
    expect(res.status).toBe(400);
    expect((await res.json()).message).toMatch(/email/i);
  });

  it('retorna 400 para senha curta', async () => {
    const res = await POST(makeRequest({ email: 'a@b.com', password: '123' }));
    expect(res.status).toBe(400);
    expect((await res.json()).message).toMatch(/senha/i);
  });

  it('retorna 401 para usuário inexistente', async () => {
    mocks.findUnique.mockResolvedValue(null);
    const res = await POST(makeRequest({ email: 'a@b.com', password: '123456' }));
    expect(res.status).toBe(401);
    expect((await res.json()).message).toBe('Credenciais inválidas');
  });

  it('retorna 401 para senha errada', async () => {
    mocks.findUnique.mockResolvedValue({ id: 1, email: 'a@b.com', password: 'hashed' });
    mocks.compare.mockResolvedValue(false);
    const res = await POST(makeRequest({ email: 'a@b.com', password: 'wrongpass' }));
    expect(res.status).toBe(401);
  });

  it('retorna 200 com JWT para credenciais válidas', async () => {
    mocks.findUnique.mockResolvedValue({ id: 7, email: 'a@b.com', password: 'hashed' });
    mocks.compare.mockResolvedValue(true);
    const res = await POST(makeRequest({ email: 'a@b.com', password: 'correctpass' }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(typeof data.token).toBe('string');
    expect(data.token.split('.').length).toBe(3);
  });

  it('retorna 429 após 5 tentativas do mesmo IP', async () => {
    mocks.findUnique.mockResolvedValue(null);
    for (let i = 0; i < 5; i++) {
      await POST(makeRequest({ email: 'a@b.com', password: '123456' }, '10.0.0.1'));
    }
    const res = await POST(makeRequest({ email: 'a@b.com', password: '123456' }, '10.0.0.1'));
    expect(res.status).toBe(429);
    expect((await res.json()).message).toMatch(/tentativas/i);
  });

  it('IPs diferentes não compartilham limite de rate', async () => {
    mocks.findUnique.mockResolvedValue(null);
    for (let i = 0; i < 5; i++) {
      await POST(makeRequest({ email: 'a@b.com', password: '123456' }, '10.0.0.2'));
    }
    const res = await POST(makeRequest({ email: 'a@b.com', password: '123456' }, '10.0.0.3'));
    expect(res.status).not.toBe(429);
  });

  it('não expõe detalhes do erro interno', async () => {
    mocks.findUnique.mockRejectedValue(new Error('DB error'));
    const res = await POST(makeRequest({ email: 'a@b.com', password: '123456' }));
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.message).toBe('Erro no servidor');
    expect(data).not.toHaveProperty('error');
  });
});
