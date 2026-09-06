import { describe, it, expect } from 'vitest';
import {
  lgamma,
  gammaP,
  chiP,
  erfc,
  zP,
  pUp,
  binomP,
  benjaminiHochberg,
  calculateKelly,
  simulateMonteCarloRuin,
  shuffle,
  driftTest,
} from '../app/services/BearDifferMath';
import { MonteCarloResult } from '../app/services/beardiffer.types';

describe('BearDifferMath - Statistical and Mathematical Library', () => {
  describe('lgamma', () => {
    it('calculates log gamma for known values correctly', () => {
      // ln(Gamma(1)) = ln(1) = 0
      expect(lgamma(1)).toBeCloseTo(0, 4);
      // ln(Gamma(2)) = ln(1!) = 0
      expect(lgamma(2)).toBeCloseTo(0, 4);
      // ln(Gamma(3)) = ln(2!) = ln(2) = 0.693147
      expect(lgamma(3)).toBeCloseTo(Math.log(2), 4);
      // ln(Gamma(4)) = ln(3!) = ln(6) = 1.791759
      expect(lgamma(4)).toBeCloseTo(Math.log(6), 4);
      // ln(Gamma(5)) = ln(4!) = ln(24) = 3.17805
      expect(lgamma(5)).toBeCloseTo(Math.log(24), 4);
    });
  });

  describe('erfc and zP', () => {
    it('calculates complementary error function and two-tailed normal p-value', () => {
      // zP(0) = 1 (p-value for z=0 is 1.0)
      expect(zP(0)).toBeCloseTo(1.0, 3);
      // zP(1.96) ~ 0.05 (approx 95% confidence level)
      expect(zP(1.95996)).toBeCloseTo(0.05, 3);
      // zP(2.576) ~ 0.01 (approx 99% confidence level)
      expect(zP(2.57583)).toBeCloseTo(0.01, 3);
      // erfc(0) = 1
      expect(erfc(0)).toBeCloseTo(1.0, 4);
    });

    it('calculates pUp (upper tail probability)', () => {
      expect(pUp(0)).toBeCloseTo(0.5, 3);
      expect(pUp(1.96)).toBeCloseTo(0.025, 3);
      expect(pUp(-1.96)).toBeCloseTo(0.975, 3);
    });
  });

  describe('chiP (Chi-square distribution upper tail)', () => {
    it('returns valid p-values matching standard chi-square tables', () => {
      // For df=9 (uniformity test of 10 digits):
      // Critical value at alpha=0.05 is 16.919
      expect(chiP(16.919, 9)).toBeCloseTo(0.05, 2);
      // Critical value at alpha=0.01 is 21.666
      expect(chiP(21.666, 9)).toBeCloseTo(0.01, 2);

      // For df=81 (Markov independence test of 10x10 transitions):
      // Critical value at alpha=0.05 is ~103.01
      expect(chiP(103.01, 81)).toBeCloseTo(0.05, 2);
    });

    it('handles edge cases gracefully', () => {
      expect(chiP(0, 9)).toBeCloseTo(1.0, 3);
      expect(chiP(100, 9)).toBeLessThan(1e-10);
    });
  });

  describe('binomP', () => {
    it('calculates binomial upper tail test', () => {
      // 90 hits out of 100 with p0=0.9 should have z around 0, pUp around 0.5
      const p = binomP(90, 100, 0.9);
      expect(p).toBeGreaterThan(0.4);
      expect(p).toBeLessThan(0.6);

      // 98 hits out of 100 with p0=0.9 is unusually high -> very low p-value
      const pHigh = binomP(98, 100, 0.9);
      expect(pHigh).toBeLessThan(0.01);

      // 0 trades returns 1
      expect(binomP(0, 0, 0.9)).toBe(1);
    });
  });

  describe('benjaminiHochberg (FDR control)', () => {
    it('controls false discovery rate correctly', () => {
      const items = [
        { id: '1', p: 0.001 },
        { id: '2', p: 0.008 },
        { id: '3', p: 0.039 },
        { id: '4', p: 0.041 },
        { id: '5', p: 0.042 },
        { id: '6', p: 0.06 },
        { id: '7', p: 0.15 },
      ];
      const q = 0.05;
      const res = benjaminiHochberg(items, q);
      expect(res.length).toBe(7);
      // First items with small p should pass
      expect(res[0].pass).toBe(true);
      expect(res[1].pass).toBe(true);
      // Items with large p should fail
      expect(res[6].pass).toBe(false);
    });

    it('rejects all if no hypothesis is significant', () => {
      const items = [
        { id: 'a', p: 0.4 },
        { id: 'b', p: 0.5 },
        { id: 'c', p: 0.8 },
      ];
      const res = benjaminiHochberg(items, 0.1);
      expect(res.every(r => !r.pass)).toBe(true);
    });
  });

  describe('calculateKelly', () => {
    it('computes Kelly fraction correctly', () => {
      // In differ, payout is ~1.10 (b = 0.10).
      // If win rate p = 90.9% (0.90909) and b = 0.10, edge is 0 => Kelly ~ 0
      const kellyNeutral = calculateKelly(1 / 1.1, 1.1);
      expect(kellyNeutral).toBeCloseTo(0, 2);

      // If win rate p = 95% and payout = 1.10, positive edge:
      // Kelly = (b*p - q) / b = (0.10 * 0.95 - 0.05) / 0.10 = (0.095 - 0.05)/0.10 = 0.45
      const kellyPositive = calculateKelly(0.95, 1.1);
      expect(kellyPositive).toBeCloseTo(0.45, 2);

      // If p = 80%, negative expectation -> Kelly should be negative
      const kellyNegative = calculateKelly(0.8, 1.1);
      expect(kellyNegative).toBeLessThan(0);
    });
  });

  describe('simulateMonteCarloRuin', () => {
    it('simulates ruin probability and drawdown distribution', () => {
      const res = simulateMonteCarloRuin(
        0.90, // p
        1.10, // payout
        1,    // baseStake
        100,  // bankroll
        { mode: 'normal', factor: 2.2, maxLvl: 3, parts: 3, base: 1 },
        100,  // runs
        100   // steps per run
      );

      expect(res.runs).toBe(100);
      expect(res.ruinProb).toBeGreaterThanOrEqual(0);
      expect(res.ruinProb).toBeLessThanOrEqual(1);
      expect(typeof res.medianPnl).toBe('number');
      expect(res.medianDrawdown).toBeGreaterThanOrEqual(0);
      expect(res.p05).toBeLessThanOrEqual(res.p95);
    });

    it('reports the worst drawdown as part of the declared result contract', () => {
      const res: MonteCarloResult = simulateMonteCarloRuin(
        0.90,
        1.10,
        1,
        100,
        { mode: 'normal', factor: 2.2, maxLvl: 3, parts: 3, base: 1 },
        100,
        100
      );

      expect(typeof res.worstDrawdown).toBe('number');
      expect(res.worstDrawdown).toBeGreaterThanOrEqual(res.medianDrawdown);
    });
  });

  describe('shuffle (permutation for the Monte Carlo tests)', () => {
    it('performs an unbiased Fisher-Yates pass', () => {
      // rnd always 0 makes every draw pick index 0, so the walk is known
      const res = shuffle([1, 2, 3, 4], () => 0);
      expect(res).toEqual([2, 3, 4, 1]);
    });

    it('keeps every element exactly once and leaves the input untouched', () => {
      const input = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
      const res = shuffle(input, Math.random);

      expect(res).not.toBe(input);
      expect(input).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
      expect([...res].sort((a, b) => a - b)).toEqual(input);
    });
  });

  describe('driftTest (Regime Stability Analysis)', () => {
    it('analyzes homogeneity of distribution and repetition between temporal blocks', () => {
      // 800 random digits
      const buf: number[] = [];
      for (let i = 0; i < 800; i++) buf.push(i % 10);

      const res = driftTest(buf, 4);
      expect(res).not.toBeNull();
      expect(res?.K).toBe(4);
      expect(res?.per).toBe(200);
      expect(typeof res?.pD).toBe('number');
      expect(typeof res?.pR).toBe('number');
      expect(res?.rates.length).toBe(4);
    });

    it('returns null if sample per block is less than 200', () => {
      const buf = [1, 2, 3, 4, 5];
      expect(driftTest(buf, 4)).toBeNull();
    });
  });
});
