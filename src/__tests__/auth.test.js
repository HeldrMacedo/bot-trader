import { describe, it, expect, beforeEach } from 'vitest';
import jwt from 'jsonwebtoken';

// Define JWT_SECRET antes de importar o módulo
process.env.JWT_SECRET = 'test-secret-aaaabbbbccccddddeeeeffffgggghhhh';

const { signToken, verifyToken } = await import('../app/lib/auth.js');

describe('auth helpers', () => {
  describe('signToken', () => {
    it('gera um JWT válido contendo userId', () => {
      const token = signToken(42);
      const decoded = jwt.decode(token);
      expect(decoded.userId).toBe(42);
    });

    it('token possui expiração (exp)', () => {
      const token = signToken(1);
      const decoded = jwt.decode(token);
      expect(decoded.exp).toBeDefined();
      expect(decoded.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
    });

    it('usa algoritmo HS256', () => {
      const token = signToken(1);
      const header = JSON.parse(Buffer.from(token.split('.')[0], 'base64url').toString());
      expect(header.alg).toBe('HS256');
    });
  });

  describe('verifyToken', () => {
    it('retorna payload de um token válido', () => {
      const token = signToken(99);
      const payload = verifyToken(token);
      expect(payload.userId).toBe(99);
    });

    it('lança erro para token com assinatura inválida', () => {
      const token = signToken(1) + 'tampered';
      expect(() => verifyToken(token)).toThrow();
    });

    it('lança erro para token expirado', () => {
      const expiredToken = jwt.sign(
        { userId: 1 },
        process.env.JWT_SECRET,
        { expiresIn: -1 }
      );
      expect(() => verifyToken(expiredToken)).toThrow(/expired/i);
    });

    it('lança erro para string aleatória', () => {
      expect(() => verifyToken('nao.e.um.jwt')).toThrow();
    });
  });
});
