import { describe, it, expect, beforeEach } from 'vitest';
import { createEngine } from '../app/services/BearBot2Engine';
import { buildLoserSet, isWinCheck } from '../app/services/bearbot2.types';

describe('BearBot2 COMBO Strategy with Dynamic Barriers', () => {
  describe('Helper Functions (buildLoserSet & isWinCheck)', () => {
    it('calculates default combo losers (4 and 5) correctly', () => {
      const losers = buildLoserSet('combo', 0, 4, 5);
      expect(Array.from(losers).sort()).toEqual([4, 5]);

      // Wins on < 4 and > 5
      expect(isWinCheck(0, 'combo', 0, 4, 5)).toBe(true);
      expect(isWinCheck(1, 'combo', 0, 4, 5)).toBe(true);
      expect(isWinCheck(2, 'combo', 0, 4, 5)).toBe(true);
      expect(isWinCheck(3, 'combo', 0, 4, 5)).toBe(true);
      expect(isWinCheck(4, 'combo', 0, 4, 5)).toBe(false);
      expect(isWinCheck(5, 'combo', 0, 4, 5)).toBe(false);
      expect(isWinCheck(6, 'combo', 0, 4, 5)).toBe(true);
      expect(isWinCheck(7, 'combo', 0, 4, 5)).toBe(true);
      expect(isWinCheck(8, 'combo', 0, 4, 5)).toBe(true);
      expect(isWinCheck(9, 'combo', 0, 4, 5)).toBe(true);
    });

    it('calculates custom combo losers (under=3, over=6) correctly', () => {
      const losers = buildLoserSet('combo', 0, 3, 6);
      expect(Array.from(losers).sort()).toEqual([3, 4, 5, 6]);

      expect(isWinCheck(2, 'combo', 0, 3, 6)).toBe(true);
      expect(isWinCheck(3, 'combo', 0, 3, 6)).toBe(false);
      expect(isWinCheck(4, 'combo', 0, 3, 6)).toBe(false);
      expect(isWinCheck(5, 'combo', 0, 3, 6)).toBe(false);
      expect(isWinCheck(6, 'combo', 0, 3, 6)).toBe(false);
      expect(isWinCheck(7, 'combo', 0, 3, 6)).toBe(true);
    });

    it('handles narrow combo loss zone (under=5, over=5)', () => {
      const losers = buildLoserSet('combo', 0, 5, 5);
      expect(Array.from(losers)).toEqual([5]);

      expect(isWinCheck(4, 'combo', 0, 5, 5)).toBe(true);
      expect(isWinCheck(5, 'combo', 0, 5, 5)).toBe(false);
      expect(isWinCheck(6, 'combo', 0, 5, 5)).toBe(true);
    });

    it('handles wide combo loss zone (under=1, over=8)', () => {
      const losers = buildLoserSet('combo', 0, 1, 8);
      expect(Array.from(losers).sort()).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);

      expect(isWinCheck(0, 'combo', 0, 1, 8)).toBe(true);
      expect(isWinCheck(9, 'combo', 0, 1, 8)).toBe(true);
      expect(isWinCheck(5, 'combo', 0, 1, 8)).toBe(false);
    });
  });

  describe('Engine Theoretical Rate', () => {
    it('computes 80% theoretical rate for default combo (4, 5)', () => {
      const engine = createEngine({ mode: 'combo', comboUnder: 4, comboOver: 5 });
      expect(engine.getTheoreticalRate()).toBe(80);
    });

    it('computes 60% theoretical rate for combo (3, 6)', () => {
      const engine = createEngine({ mode: 'combo', comboUnder: 3, comboOver: 6 });
      expect(engine.getTheoreticalRate()).toBe(60);
    });

    it('computes 40% theoretical rate for combo (2, 7)', () => {
      const engine = createEngine({ mode: 'combo', comboUnder: 2, comboOver: 7 });
      expect(engine.getTheoreticalRate()).toBe(40);
    });

    it('computes 90% theoretical rate for single-digit loss combo (5, 5)', () => {
      const engine = createEngine({ mode: 'combo', comboUnder: 5, comboOver: 5 });
      expect(engine.getTheoreticalRate()).toBe(90);
    });
  });

  describe('Engine Proposals', () => {
    it('generates DIGITOVER and DIGITUNDER proposals with dynamic barriers', () => {
      const engine = createEngine({ mode: 'combo', comboUnder: 3, comboOver: 6 });
      const proposals = engine.getRequiredProposals();
      expect(proposals).toEqual([
        { ct: 'DIGITOVER', barrier: 6 },
        { ct: 'DIGITUNDER', barrier: 3 },
      ]);
    });

    it('updates proposals dynamically when config changes', () => {
      const engine = createEngine({ mode: 'combo', comboUnder: 4, comboOver: 5 });
      expect(engine.getRequiredProposals()).toEqual([
        { ct: 'DIGITOVER', barrier: 5 },
        { ct: 'DIGITUNDER', barrier: 4 },
      ]);

      engine.updateConfig({ comboUnder: 2, comboOver: 7 });
      expect(engine.getRequiredProposals()).toEqual([
        { ct: 'DIGITOVER', barrier: 7 },
        { ct: 'DIGITUNDER', barrier: 2 },
      ]);
    });
  });

  describe('Paper Trading Simulation (simulateTrade)', () => {
    it('simulates win when exit digit is below comboUnder', () => {
      const engine = createEngine({
        paperMode: true,
        mode: 'combo',
        comboUnder: 3,
        comboOver: 6,
        stake: 1,
        tradeCooldownMs: 0,
      });

      // Feed digits: last digit is 2 (win on UNDER 3, loss on OVER 6)
      engine.processTick('R_100', 100.1, 1);
      engine.processTick('R_100', 100.2, 2);

      const sim = engine.simulateTrade('combo');
      expect(sim).not.toBeNull();
      expect(sim!.isLoss).toBe(false);
      // p1 (OVER 6) = -1.00, p2 (UNDER 3) = +0.94 -> net -0.06
      expect(sim!.profit).toBeCloseTo(-0.06, 2);
      expect(sim!.exitDig).toBe(2);
    });

    it('simulates win when exit digit is above comboOver', () => {
      const engine = createEngine({
        paperMode: true,
        mode: 'combo',
        comboUnder: 3,
        comboOver: 6,
        stake: 1,
        tradeCooldownMs: 0,
      });

      // Feed digits: last digit is 8 (win on OVER 6, loss on UNDER 3)
      engine.processTick('R_100', 100.1, 1);
      engine.processTick('R_100', 100.8, 8);

      const sim = engine.simulateTrade('combo');
      expect(sim).not.toBeNull();
      expect(sim!.isLoss).toBe(false);
      expect(sim!.profit).toBeCloseTo(-0.06, 2);
      expect(sim!.exitDig).toBe(8);
    });

    it('simulates total loss when exit digit falls in loss zone [comboUnder...comboOver]', () => {
      const engine = createEngine({
        paperMode: true,
        mode: 'combo',
        comboUnder: 3,
        comboOver: 6,
        stake: 1,
        tradeCooldownMs: 0,
      });

      // Feed digits: last digit is 4 (both OVER 6 and UNDER 3 lose)
      engine.processTick('R_100', 100.1, 1);
      engine.processTick('R_100', 100.4, 4);

      const sim = engine.simulateTrade('combo');
      expect(sim).not.toBeNull();
      expect(sim!.isLoss).toBe(true);
      // p1 = -1.00, p2 = -1.00 -> net -2.00
      expect(sim!.profit).toBeCloseTo(-2.00, 2);
      expect(sim!.exitDig).toBe(4);
    });
  });

  describe('Virtual Loss Integration with Dynamic COMBO', () => {
    it('tracks consecutive loss digits in custom combo and triggers entry', () => {
      const engine = createEngine({
        activeSym: 'R_100',
        exec: 'auto',
        autoOn: true,
        mode: 'combo',
        comboUnder: 3,
        comboOver: 6, // loss digits: {3, 4, 5, 6}
        vlOn: true,
        vlMode: 'consec',
        vlQty: 3,
        tradeCooldownMs: 0,
        stake: 1,
      });

      let autoTradeCalled = false;
      let tradedKind = '';
      engine.onAutoTrade((kind) => {
        autoTradeCalled = true;
        tradedKind = kind;
      });

      // Feed 2 consecutive loss digits: 4, 5
      engine.processTick('R_100', 100.4, 4);
      engine.processTick('R_100', 100.5, 5);
      expect(engine.getState().vlCount).toBe(2);
      expect(autoTradeCalled).toBe(false);

      // Feed 3rd consecutive loss digit: 3 -> triggers VL target and calls autoTrade!
      engine.processTick('R_100', 100.3, 3);
      expect(autoTradeCalled).toBe(true);
      expect(tradedKind).toBe('combo');

      // Now prepare the trade
      const prep = engine.prepareTrade('combo');
      expect(prep).not.toBeNull();
      expect(prep?.kind).toBe('combo');
      expect(prep?.legs.length).toBe(2);
      expect(prep?.legs[0].barrier).toBe(6);
      expect(prep?.legs[1].barrier).toBe(3);
    });

    it('resets consecutive VL count on winning combo digits', () => {
      const engine = createEngine({
        autoOn: true,
        mode: 'combo',
        comboUnder: 3,
        comboOver: 6,
        vlOn: true,
        vlMode: 'consec',
        vlQty: 3,
      });

      for (let i = 0; i < 50; i++) engine.processTick('R_100', 100.0, 0);

      engine.processTick('R_100', 100.4, 4);
      engine.processTick('R_100', 100.5, 5);
      expect(engine.getState().vlCount).toBe(2);

      // Winning digit 8 (> 6) resets VL count
      engine.processTick('R_100', 100.8, 8);
      expect(engine.getState().vlCount).toBe(0);
    });
  });
});
