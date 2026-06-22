import { describe, it, expect, beforeAll } from 'vitest';
import { SignJWT, importJWK } from 'jose';
import jwt from 'jsonwebtoken';

// ---- helpers ----------------------------------------------------------------

const SECRET = 'test-secret-aaaabbbbccccddddeeeeffffgggghhhh';
process.env.JWT_SECRET = SECRET;

async function buildRequest(
  path: string,
  cookieValue?: string
): Promise<{ nextUrl: URL; cookies: { get: (name: string) => { value: string } | undefined }; url: string }> {
  const url = `http://localhost:3000${path}`;
  return {
    nextUrl: new URL(url),
    url,
    cookies: {
      get: (name: string) =>
        name === 'auth_token' && cookieValue ? { value: cookieValue } : undefined,
    },
  };
}

function makeJwt(userId: number, expiresIn: string | number = '8h'): string {
  return jwt.sign({ userId }, SECRET, { expiresIn: expiresIn as string, algorithm: 'HS256' });
}

// ---- importa middleware após setar variáveis --------------------------------
// Dynamic import para garantir que process.env.JWT_SECRET já está definido
const { middleware, config } = await import('../middleware');

// ---- testes -----------------------------------------------------------------

describe('middleware — rotas públicas', () => {
  const publicPaths = [
    '/login',
    '/img/form-login.png',
    '/api/login',
    '/api/register',
    '/api/forgot-password',
    '/api/reset-password',
    '/api/logout',
  ];

  for (const path of publicPaths) {
    it(`libera ${path} sem token`, async () => {
      const req = await buildRequest(path);
      const res = await middleware(req as any);
      // next() retorna undefined em ambiente de teste (sem runtime real)
      // só verificamos que NÃO redirecionou para /login
      expect(res?.status).not.toBe(307);
    });
  }
});

describe('middleware — rotas protegidas', () => {
  it('redireciona para /login sem cookie', async () => {
    const req = await buildRequest('/home');
    const res = await middleware(req as any);
    expect(res?.status).toBe(307);
    expect(res?.headers.get('location')).toContain('/login');
  });

  it('redireciona para /login com token inválido', async () => {
    const req = await buildRequest('/home', 'token.invalido.assinado');
    const res = await middleware(req as any);
    expect(res?.status).toBe(307);
    expect(res?.headers.get('location')).toContain('/login');
  });

  it('redireciona para /login com token expirado', async () => {
    const expired = makeJwt(1, -1);
    const req = await buildRequest('/bottrader', expired);
    const res = await middleware(req as any);
    expect(res?.status).toBe(307);
    expect(res?.headers.get('location')).toContain('/login');
  });

  it('redireciona e apaga cookie quando token expirado', async () => {
    const expired = makeJwt(1, -1);
    const req = await buildRequest('/profile', expired);
    const res = await middleware(req as any);
    expect(res?.status).toBe(307);
    const setCookie = res?.headers.get('set-cookie') ?? '';
    expect(setCookie).toContain('auth_token=');
    expect(setCookie).toMatch(/max-age=0/i);
  });

  it('libera acesso com token válido', async () => {
    const valid = makeJwt(42);
    const req = await buildRequest('/home', valid);
    const res = await middleware(req as any);
    // NextResponse.next() retorna status 200 no ambiente de teste
    expect(res?.status).not.toBe(307);
  });
});

describe('middleware — matcher', () => {
  it('exclui assets estáticos do Next.js', () => {
    const pattern = config.matcher[0];
    const re = new RegExp(
      '^' + pattern.replace('(?!', '(?!') + '$'
    );
    // Verifica que a string do matcher contém as exclusões corretas
    expect(pattern).toContain('_next/static');
    expect(pattern).toContain('_next/image');
    expect(pattern).toContain('favicon.ico');
    expect(pattern).toContain('img/');
  });
});
