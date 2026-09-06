import { MartingaleConfig, MonteCarloResult } from './beardiffer.types';

/**
 * Logaritmo da função Gamma (aproximação de Lanczos com 8 coeficientes).
 */
export function lgamma(z: number): number {
  const g = [
    676.5203681218851,
    -1259.1392167224028,
    771.32342877765313,
    -176.61502916214059,
    12.507343278686905,
    -0.13857109526572012,
    9.9843695780195716e-6,
    1.5056327351493116e-7,
  ];
  if (z < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * z)) - lgamma(1 - z);
  z -= 1;
  let x = 0.99999999999980993;
  for (let i = 0; i < 8; i++) x += g[i] / (z + i + 1);
  const t = z + 7.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
}

/**
 * Função Gamma incompleta regularizada inferior P(s, x).
 */
export function gammaP(s: number, x: number): number {
  if (x <= 0) return 0;
  if (x < s + 1) {
    let sum = 1 / s,
      term = 1 / s;
    for (let n = 1; n < 500; n++) {
      term *= x / (s + n);
      sum += term;
      if (Math.abs(term) < Math.abs(sum) * 1e-14) break;
    }
    return sum * Math.exp(-x + s * Math.log(x) - lgamma(s));
  }
  // Fração continuada para Q
  let b = x + 1 - s,
    c = 1e300,
    d = 1 / b,
    h = d;
  for (let i = 1; i < 500; i++) {
    const an = -i * (i - s);
    b += 2;
    d = an * d + b;
    if (Math.abs(d) < 1e-300) d = 1e-300;
    c = b + an / c;
    if (Math.abs(c) < 1e-300) c = 1e-300;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < 1e-14) break;
  }
  return 1 - Math.exp(-x + s * Math.log(x) - lgamma(s)) * h;
}

/**
 * P-valor da distribuição Qui-quadrado (χ²) para dado x e graus de liberdade df.
 */
export function chiP(x: number, df: number): number {
  return Math.max(0, Math.min(1, 1 - gammaP(df / 2, x / 2)));
}

/**
 * Função erro complementar erfc(x) (aproximação de Chebyshev).
 */
export function erfc(x: number): number {
  const z = Math.abs(x),
    t = 1 / (1 + z / 2);
  const r =
    t *
    Math.exp(
      -z * z -
        1.26551223 +
        t *
          (1.00002368 +
            t *
              (0.37409196 +
                t *
                  (0.09678418 +
                    t *
                      (-0.18628806 +
                        t *
                          (0.27886807 +
                            t *
                              (-1.13520398 +
                                t *
                                  (1.48851587 +
                                    t * (-0.82215223 + t * 0.17087277))))))))
    );
  return x >= 0 ? r : 2 - r;
}

/**
 * P-valor bicaudal para teste Z normal padronizado.
 */
export function zP(z: number): number {
  return Math.max(0, Math.min(1, erfc(Math.abs(z) / Math.SQRT2)));
}

/**
 * Probabilidade da cauda superior para teste Z.
 */
export function pUp(z: number): number {
  return z >= 0 ? zP(z) / 2 : 1 - zP(z) / 2;
}

/**
 * Teste binomial de cauda superior com correção de continuidade.
 */
export function binomP(hits: number, n: number, p0: number): number {
  if (!n) return 1;
  const z = (hits - n * p0 - 0.5) / Math.sqrt(n * p0 * (1 - p0));
  return pUp(z);
}

/**
 * Controle de Descoberta Falsa (False Discovery Rate - Benjamini-Hochberg).
 */
export function benjaminiHochberg<T extends { p: number }>(
  items: T[],
  q: number
): (T & { pass: boolean })[] {
  const s = [...items].sort((a, b) => a.p - b.p);
  const m = s.length;
  let kMax = -1;
  s.forEach((it, i) => {
    if (it.p <= ((i + 1) / m) * q) kMax = i;
  });
  return s.map((it, i) => ({
    ...it,
    pass: i <= kMax,
  }));
}

/**
 * Cálculo da fração ótima de Kelly: f* = (b*p - q) / b
 * onde b é o payout líquido (payout - 1), p é a taxa de acerto e q = 1 - p.
 */
export function calculateKelly(p: number, payout: number): number {
  const b = payout - 1;
  if (b <= 0) return 0;
  const q = 1 - p;
  return (b * p - q) / b;
}

/**
 * Simulação Monte Carlo de ruína com gestão de banca e Martingale.
 */
export function simulateMonteCarloRuin(
  p: number,
  payout: number,
  baseStake: number,
  bankroll: number,
  mgConfig: MartingaleConfig,
  runs = 1000,
  steps = 200
): MonteCarloResult {
  let ruinedCount = 0;
  const pnls: number[] = [];
  const drawdowns: number[] = [];

  for (let r = 0; r < runs; r++) {
    let bal = bankroll;
    let peak = bankroll;
    let maxDd = 0;
    let lvl = 0;
    let debt = 0;
    let partsLeft = 0;
    let partStake = 0;
    let isRuined = false;

    for (let s = 0; s < steps; s++) {
      let stake = baseStake;
      if (mgConfig.mode === 'normal' && lvl > 0) {
        stake = +(baseStake * Math.pow(mgConfig.factor, lvl)).toFixed(2);
      } else if (mgConfig.mode === 'partial' && partsLeft > 0) {
        stake = partStake;
      }

      if (lvl > mgConfig.maxLvl) {
        lvl = 0;
        debt = 0;
        partsLeft = 0;
        stake = baseStake;
      }

      if (bal < stake) {
        isRuined = true;
        break;
      }

      const win = Math.random() < p;
      if (win) {
        const profit = +(stake * (payout - 1)).toFixed(2);
        bal += profit;
        if (mgConfig.mode === 'partial' && partsLeft > 0) {
          debt = Math.max(0, debt - profit);
          partsLeft--;
          if (debt <= 0.01 || partsLeft <= 0) {
            lvl = 0;
            debt = 0;
            partsLeft = 0;
          }
        } else {
          lvl = 0;
          debt = 0;
          partsLeft = 0;
        }
      } else {
        bal -= stake;
        lvl++;
        if (mgConfig.mode === 'partial') {
          debt += stake;
          partsLeft = mgConfig.parts;
          partStake = +(baseStake + debt / mgConfig.parts / Math.max(0.05, payout - 1)).toFixed(2);
        }
      }

      if (bal > peak) peak = bal;
      const dd = peak - bal;
      if (dd > maxDd) maxDd = dd;

      if (bal <= 0) {
        isRuined = true;
        break;
      }
    }

    if (isRuined) ruinedCount++;
    pnls.push(+(bal - bankroll).toFixed(2));
    drawdowns.push(+maxDd.toFixed(2));
  }

  pnls.sort((a, b) => a - b);
  drawdowns.sort((a, b) => a - b);

  const mid = Math.floor(runs / 2);
  const p05Idx = Math.floor(runs * 0.05);
  const p95Idx = Math.floor(runs * 0.95);

  return {
    ruinProb: +(ruinedCount / runs).toFixed(4),
    medianPnl: pnls[mid],
    p05: pnls[p05Idx],
    p95: pnls[p95Idx],
    medianDrawdown: drawdowns[mid],
    worstDrawdown: drawdowns[drawdowns.length - 1],
    runs,
  };
}

export interface DriftTestResult {
  K: number;
  per: number;
  n: number;
  pD: number;
  pR: number;
  chiD: number;
  chiR: number;
  rates: number[];
}

export function driftTest(buf: number[], K: number): DriftTestResult | null {
  const n = buf.length;
  const per = Math.floor(n / K);
  if (per < 200) return null;

  const tab: number[][] = [];
  const reps: number[] = [];

  for (let k = 0; k < K; k++) {
    const f = new Array(10).fill(0);
    let rep = 0;
    for (let i = k * per; i < (k + 1) * per; i++) {
      f[buf[i]]++;
      if (i > k * per && buf[i] === buf[i - 1]) rep++;
    }
    tab.push(f);
    reps.push(rep);
  }

  // 1. Homogeneidade da distribuição entre blocos (K x 10)
  const cs = new Array(10).fill(0);
  let N = 0;
  tab.forEach((f) =>
    f.forEach((v, j) => {
      cs[j] += v;
      N += v;
    })
  );

  let chiD = 0;
  for (let k = 0; k < K; k++) {
    for (let j = 0; j < 10; j++) {
      const ex = (per * cs[j]) / N;
      if (ex <= 0) continue;
      const d = tab[k][j] - ex;
      chiD += (d * d) / ex;
    }
  }
  const pD = chiP(chiD, (K - 1) * 9);

  // 2. Homogeneidade da taxa de repetição entre blocos (2 x K)
  const tot = reps.reduce((a, b) => a + b, 0);
  const tries = K * (per - 1);
  const rate = tries > 0 ? tot / tries : 0;
  let chiR = 0;
  reps.forEach((r) => {
    const ex = rate * (per - 1);
    const exN = (1 - rate) * (per - 1);
    if (ex > 0) {
      const d = r - ex;
      chiR += (d * d) / ex;
    }
    if (exN > 0) {
      const d = per - 1 - r - exN;
      chiR += (d * d) / exN;
    }
  });
  const pR = chiP(chiR, K - 1);

  return {
    K,
    per,
    n,
    pD,
    pR,
    chiD: +chiD.toFixed(1),
    chiR: +chiR.toFixed(1),
    rates: reps.map((r) => r / (per - 1)),
  };
}
