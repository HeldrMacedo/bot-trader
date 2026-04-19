// Sliding window rate limiter — in-memory, single-instance
const DEFAULT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const DEFAULT_MAX = 5;

const store = new Map(); // key -> number[]  (timestamps)

/**
 * @param {string} key - Normalmente o IP do cliente
 * @param {{ windowMs?: number, max?: number }} options
 * @returns {{ allowed: boolean, retryAfter?: number }}
 */
export function checkRateLimit(key, options = {}) {
  const windowMs = options.windowMs ?? DEFAULT_WINDOW_MS;
  const max = options.max ?? DEFAULT_MAX;
  const now = Date.now();
  const id = key || 'unknown';

  const timestamps = (store.get(id) ?? []).filter(ts => now - ts < windowMs);

  if (timestamps.length >= max) {
    const retryAfter = Math.ceil((timestamps[0] + windowMs - now) / 1000);
    return { allowed: false, retryAfter };
  }

  timestamps.push(now);
  store.set(id, timestamps);
  return { allowed: true };
}

/** Usado apenas em testes para resetar o estado */
export function _clearStore() {
  store.clear();
}
