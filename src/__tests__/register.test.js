import { describe, it, expect, vi, beforeEach } from 'vitest';
import { _clearStore } from '../app/lib/rateLimiter.js';

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  create: vi.fn(),
  hash: vi.fn().mockResolvedValue('hashed_pw'),
}));

vi.mock('@prisma/client', () => ({
  PrismaClient: class {
    user = { findUnique: mocks.findUnique, create: mocks.create };
  },
}));

vi.mock('bcryptjs', () => ({
  default: { hash: mocks.hash },
}));

const { POST } = await import('../app/api/register/route.js');

function makeRequest(body, ip = '5.6.7.8') {
  return new Request('http://localhost/api/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-forwarded-for': ip },
    body: JSON.stringify(body),
  });
}

const validBody = {
  name: 'João Silva',
  email: 'joao@example.com',
  password: 'senhaSegura123',
  phone: '(11)99999-9999',
};

beforeEach(() => {
  _clearStore();
  vi.clearAllMocks();
  mocks.hash.mockResolvedValue('hashed_pw');
});

describe('POST /api/register', () => {
  it('retorna 400 para nome vazio', async () => {
    const res = await POST(makeRequest({ ...validBody, name: '' }));
    expect(res.status).toBe(400);
    expect((await res.json()).message).toMatch(/nome/i);
  });

  it('retorna 400 para email inválido', async () => {
    const res = await POST(makeRequest({ ...validBody, email: 'nao-e-email' }));
    expect(res.status).toBe(400);
    expect((await res.json()).message).toMatch(/email/i);
  });

  it('retorna 400 para senha com menos de 8 caracteres', async () => {
    const res = await POST(makeRequest({ ...validBody, password: '1234567' }));
    expect(res.status).toBe(400);
    expect((await res.json()).message).toMatch(/8/);
  });

  it('retorna 400 para telefone no formato errado', async () => {
    const res = await POST(makeRequest({ ...validBody, phone: '11999999999' }));
    expect(res.status).toBe(400);
    expect((await res.json()).message).toMatch(/telefone/i);
  });

  it('retorna 400 se email já existe', async () => {
    mocks.findUnique.mockResolvedValue({ id: 1 });
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(400);
    expect((await res.json()).message).toMatch(/já existe/i);
  });

  it('cria usuário e retorna 201 sem expor hash da senha', async () => {
    mocks.findUnique.mockResolvedValue(null);
    mocks.create.mockResolvedValue({ id: 10, email: 'joao@example.com', name: 'João Silva' });
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(201);
    const d = await res.json();
    expect(d.user.id).toBe(10);
    expect(d.user).not.toHaveProperty('password');
  });

  it('usa bcrypt com 12 rounds', async () => {
    mocks.findUnique.mockResolvedValue(null);
    mocks.create.mockResolvedValue({ id: 1, email: 'a@b.com', name: 'A' });
    await POST(makeRequest(validBody));
    expect(mocks.hash).toHaveBeenCalledWith(expect.any(String), 12);
  });

  it('retorna 429 após 5 cadastros do mesmo IP', async () => {
    mocks.findUnique.mockResolvedValue(null);
    mocks.create.mockResolvedValue({ id: 1, email: 'x@x.com', name: 'X' });
    for (let i = 0; i < 5; i++) {
      await POST(makeRequest({ ...validBody, email: `u${i}@x.com` }, '20.0.0.1'));
    }
    const res = await POST(makeRequest(validBody, '20.0.0.1'));
    expect(res.status).toBe(429);
  });
});
