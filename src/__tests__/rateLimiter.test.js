import { describe, it, expect, beforeEach, vi } from 'vitest';
import { checkRateLimit, _clearStore } from '../app/lib/rateLimiter.js';

beforeEach(() => {
  _clearStore();
  vi.useRealTimers();
});

describe('checkRateLimit', () => {
  it('permite as primeiras 5 requisições', () => {
    for (let i = 0; i < 5; i++) {
      expect(checkRateLimit('test-ip').allowed).toBe(true);
    }
  });

  it('bloqueia a 6ª requisição', () => {
    for (let i = 0; i < 5; i++) checkRateLimit('test-ip');
    const result = checkRateLimit('test-ip');
    expect(result.allowed).toBe(false);
    expect(result.retryAfter).toBeGreaterThan(0);
  });

  it('IPs diferentes têm contadores independentes', () => {
    for (let i = 0; i < 5; i++) checkRateLimit('ip-a');
    expect(checkRateLimit('ip-a').allowed).toBe(false);
    expect(checkRateLimit('ip-b').allowed).toBe(true);
  });

  it('reseta após a janela de tempo expirar', () => {
    vi.useFakeTimers();
    const opts = { max: 3, windowMs: 60_000 };

    for (let i = 0; i < 3; i++) checkRateLimit('ip-x', opts);
    expect(checkRateLimit('ip-x', opts).allowed).toBe(false);

    vi.advanceTimersByTime(61_000);
    expect(checkRateLimit('ip-x', opts).allowed).toBe(true);
  });

  it('respeita configuração max personalizada', () => {
    for (let i = 0; i < 2; i++) checkRateLimit('limited', { max: 2 });
    expect(checkRateLimit('limited', { max: 2 }).allowed).toBe(false);
  });

  it('retorna retryAfter em segundos > 0', () => {
    vi.useFakeTimers();
    const opts = { max: 1, windowMs: 60_000 };
    checkRateLimit('ip-r', opts);
    const result = checkRateLimit('ip-r', opts);
    expect(result.allowed).toBe(false);
    expect(result.retryAfter).toBeGreaterThan(0);
    expect(result.retryAfter).toBeLessThanOrEqual(60);
  });
});
