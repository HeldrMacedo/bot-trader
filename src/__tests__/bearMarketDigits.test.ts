import { describe, it, expect } from 'vitest';
import { extractLastDigit } from '../app/hooks/useBearBot2';
import { MARKETS } from '../app/services/bearbot2.types';

describe('Bear Market (RDBEAR) Digits Precision', () => {
  it('MARKETS configuration must have pip = 4 for RDBEAR', () => {
    const bearMarket = MARKETS.find(m => m.sym === 'RDBEAR');
    expect(bearMarket).toBeDefined();
    expect(bearMarket?.pip).toBe(4);
  });

  it('MARKETS configuration must have pip = 4 for RDBULL', () => {
    const bullMarket = MARKETS.find(m => m.sym === 'RDBULL');
    expect(bullMarket).toBeDefined();
    expect(bullMarket?.pip).toBe(4);
  });

  it('extractLastDigit extracts the correct 4th decimal place for RDBEAR', () => {
    // Ex: 245.1239 -> 4th decimal is 9
    expect(extractLastDigit(245.1239, 'RDBEAR')).toBe(9);

    // Ex: 834.5670 -> 4th decimal is 0 (trailing zero)
    expect(extractLastDigit(834.5670, 'RDBEAR')).toBe(0);

    // Ex: 1054.3218 -> 4th decimal is 8
    expect(extractLastDigit(1054.3218, 'RDBEAR')).toBe(8);

    // Ex: 500.0001 -> 4th decimal is 1
    expect(extractLastDigit(500.0001, 'RDBEAR')).toBe(1);

    // Ex: 500.0005 -> 4th decimal is 5
    expect(extractLastDigit(500.0005, 'RDBEAR')).toBe(5);
  });

  it('extractLastDigit extracts correct decimal place for other symbols', () => {
    expect(extractLastDigit(100.25, 'R_100')).toBe(5);
    expect(extractLastDigit(75.1234, 'R_75')).toBe(4);
    expect(extractLastDigit(50.1234, 'R_50')).toBe(4);
    expect(extractLastDigit(25.123, 'R_25')).toBe(3);
    expect(extractLastDigit(10.123, 'R_10')).toBe(3);
    expect(extractLastDigit(999.1234, 'RDBULL')).toBe(4);
  });
});
