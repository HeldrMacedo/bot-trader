// TIPOS E INTERFACES — Bear Bot Ultra 10.0

export interface Market {
  sym: string;
  nm: string;
  pip: number;
}

export const MARKETS: Market[] = [
  { sym: 'R_100', nm: 'Volatilidade 100', pip: 2 },
  { sym: 'R_75', nm: 'Volatilidade 75', pip: 4 },
  { sym: 'R_50', nm: 'Volatilidade 50', pip: 4 },
  { sym: 'R_25', nm: 'Volatilidade 25', pip: 3 },
  { sym: 'R_10', nm: 'Volatilidade 10', pip: 3 },
  { sym: 'RDBEAR', nm: 'Bear Market', pip: 4 },
  { sym: 'RDBULL', nm: 'Bull Market', pip: 4 },
];

export type BotMode = 'over' | 'under' | 'differ' | 'combo';
export type ExecMode = 'manual' | 'auto';
export type GaleMode = 'mult' | 'parc';
export type VLMode = 'consec' | 'accum';
export type PatMode = 'accum' | 'seq';
export type PostLossMode = 'recover' | 'analyze';
export type AIMode = 'conservative' | 'balanced' | 'aggressive' | 'custom';

/** Pesos dos quatro pilares do Score de Oportunidade. */
export interface AIWeights {
  pressure: number;
  pattern: number;
  vl: number;
  sync: number;
}

/**
 * Pesos de cada preset de IA. Fonte única para motor e UI: clicar num preset
 * grava estes valores em `config.aiWeights`, e o modo 'custom' os edita.
 */
export const AI_MODE_WEIGHTS: Record<Exclude<AIMode, 'custom'>, AIWeights> = {
  conservative: { pressure: 0.45, pattern: 0.20, vl: 0.25, sync: 0.10 },
  balanced: { pressure: 0.35, pattern: 0.25, vl: 0.25, sync: 0.15 },
  aggressive: { pressure: 0.25, pattern: 0.30, vl: 0.20, sync: 0.25 },
};

/**
 * Resolve os pesos efetivos: presets vêm da tabela; 'custom' usa os pesos do
 * usuário normalizados (a proporção importa, a escala não). Pesos negativos
 * contam como zero e soma zero cai para o preset equilibrado, de modo que o
 * score nunca escapa de 0..100 nem vira NaN.
 */
export function resolveAIWeights(mode: AIMode, weights?: AIWeights): AIWeights {
  if (mode !== 'custom') return AI_MODE_WEIGHTS[mode] ?? AI_MODE_WEIGHTS.balanced;
  const w = weights ?? AI_MODE_WEIGHTS.balanced;
  const pressure = Math.max(0, w.pressure || 0);
  const pattern = Math.max(0, w.pattern || 0);
  const vl = Math.max(0, w.vl || 0);
  const sync = Math.max(0, w.sync || 0);
  const sum = pressure + pattern + vl + sync;
  if (sum <= 0) return AI_MODE_WEIGHTS.balanced;
  return { pressure: pressure / sum, pattern: pattern / sum, vl: vl / sum, sync: sync / sum };
}

/** Corte padrão do gate da IA: abaixo deste score a entrada automática é vetada. */
export const AI_MIN_SCORE_DEFAULT = 40;

export interface TradeLog {
  t: string;
  mercado: string;
  modo: string;
  alvo: number | string;
  audit: { tick_previous: string; tick_start: string; tick_end: string };
  saiu: string | number;
  stake: string;
  resultado: 'WIN' | 'LOSS';
  lucro: string;
  acumulado: string;
  paper?: boolean;
  /** Score de Oportunidade do mercado no momento da entrada. */
  score?: number;
}

export interface PatternState {
  a: number | null;
  b: number | null;
  count: number;
  reps: number;
  armed: boolean;
  waiting: boolean;
  seqCount: number;
  stable?: number;
  force?: number;
  wilson?: number;
  lift?: number;
  tri?: number;
  _final?: number;
}

export interface VLMarketState {
  count: number;
  seen: number;
}

export interface RecoveryState {
  active: boolean;
  attemptsLeft: number;
  cooldownUntil: number;
  nextTradeAfter: number;
}

export interface MarketIntelligence {
  sym: string;
  pressure: number;
  patternStrength: number;
  vlProgress: number;
  syncScore: number;
  opportunityScore: number;
  recommendation: 'strong_buy' | 'buy' | 'neutral' | 'avoid' | 'strong_avoid';
  /** False while the market has too little history to measure loser pressure. */
  dataReady: boolean;
  lastUpdate: number;
}

export interface TickData {
  digits: number[];
  price: number | null;
}

export interface ProposalState {
  id: string | null;
  ready: boolean;
  pending: boolean;
  ct: string;
  barrier: number;
}

export interface MultiCandidate {
  sym: string;
  b: number | null;
  score: number;
  force?: number;
}

export interface ComboPending {
  legs: number;
  won: number;
  results: number[];
  exits: Array<number | null>;
}

export interface DynamicDigitDetail {
  fScore: number;
  mScore: number;
  tScore: number;
  aScore: number;
  composite: number;
  rawCount50: number;
}

export interface DynamicDigitResult {
  digit: number;
  score: number;
  scores: Record<number, number>;
  breakdown: Record<number, DynamicDigitDetail>;
}

export interface ProposalEntry {
  id: string | null;
  ready: boolean;
  pending: boolean;
  ct: string;
  barrier: number;
}

/** Intent returned by prepareTrade for the hook to execute. */
export interface TradeLeg {
  ct: string;
  barrier: number;
  /** Contract kind for partial-fail demotion: over | under | differ */
  legKind: string;
  payload: Record<string, unknown>;
  usedProposal?: boolean;
}

export interface TradePrep {
  isPaper: boolean;
  kind: string;
  /** Single-leg real buy payload (non-combo). */
  payload?: Record<string, unknown> | null;
  /** Combo real legs (DIGITOVER 5 + DIGITUNDER 4). */
  legs?: TradeLeg[];
  usedProposal?: boolean;
}

export interface BotConfig {
  activeSym: string;
  mode: BotMode;
  exec: ExecMode;
  digit: number;
  autoOn: boolean;
  paperMode: boolean;
  vlOn: boolean;
  vlMode: VLMode;
  vlQty: number;
  vlWindow: number;
  vlFocusOnly: boolean;
  stake: number;
  gale: number;
  stopLoss: number;
  stopWin: number;
  galeMode: GaleMode;
  galeParcels: number;
  multiOn: boolean;
  patReps: number;
  patMinForce: number;
  patTrigger: boolean;
  patMode: PatMode;
  comboUnder: number;
  comboOver: number;
  differAutoDigit: boolean;
  differDynamicDigit: boolean;
  postLossOn: boolean;
  postLossMode: PostLossMode;
  recoverMaxAttempts: number;
  recoverDelay: number;
  cooldownSec: number;
  maxTradesHour: number;
  tradeCooldownMs: number;
  aiMode: AIMode;
  aiWeights: AIWeights;
  /** Score de Oportunidade mínimo (0..100) para o gate da IA liberar a entrada automática. */
  aiMinScore: number;
  soundOn: boolean;
}

export interface BotState {
  wins: number;
  loss: number;
  pnl: number;
  trades: TradeLog[];
  logLines: { ts: string; msg: string; type: string }[];
  marketIntel: Record<string, MarketIntelligence>;
  tickData: Record<string, TickData>;
  /** Per-market VL counters for multi UI. */
  vlBySym: Record<string, VLMarketState>;
  /** Per-market active/target auto digit for differ auto mode. */
  autoDigitBySym?: Record<string, number | null>;
  vlCount: number;
  vlSeen: number;
  galeLevel: number;
  curStake: number;
  lossAcum: number;
  parcelsLeft: number;
  lastPayout: number;
  tradeLock: boolean;
  recovery: RecoveryState;
  lastTradeTime: number;
  tradesThisHour: number[];
}

export interface DerivAccount {
  token: string;
  is_virtual: boolean;
  balance: number;
  currency: string;
  loginid: string;
}

export interface DerivAuthState {
  isAuthenticated: boolean;
  accounts: DerivAccount[];
  activeToken: string | null;
  isLoading: boolean;
  error: string | null;
}

export const DEFAULT_CONFIG: BotConfig = {
  activeSym: 'R_100',
  mode: 'over',
  exec: 'manual',
  digit: 2,
  autoOn: false,
  paperMode: false,
  vlOn: false,
  vlMode: 'consec',
  vlQty: 2,
  vlWindow: 14,
  vlFocusOnly: false,
  stake: 0.35,
  gale: 2.1,
  stopLoss: 20,
  stopWin: 20,
  galeMode: 'mult',
  galeParcels: 2,
  multiOn: false,
  patReps: 3,
  patMinForce: 30,
  patTrigger: false,
  patMode: 'accum',
  comboUnder: 4,
  comboOver: 5,
  differAutoDigit: false,
  differDynamicDigit: false,
  postLossOn: false,
  postLossMode: 'recover',
  recoverMaxAttempts: 3,
  recoverDelay: 1500,
  cooldownSec: 5,
  maxTradesHour: 50,
  tradeCooldownMs: 2000,
  aiMode: 'balanced',
  aiWeights: { ...AI_MODE_WEIGHTS.balanced },
  aiMinScore: AI_MIN_SCORE_DEFAULT,
  soundOn: true,
};

export const DEFAULT_BOT_STATE: BotState = {
  wins: 0,
  loss: 0,
  pnl: 0,
  trades: [],
  logLines: [],
  marketIntel: {},
  tickData: {},
  vlBySym: {},
  autoDigitBySym: {},
  vlCount: 0,
  vlSeen: 0,
  galeLevel: 0,
  curStake: 0.35,
  lossAcum: 0,
  parcelsLeft: 0,
  lastPayout: 0.9,
  tradeLock: false,
  recovery: { active: false, attemptsLeft: 0, cooldownUntil: 0, nextTradeAfter: 0 },
  lastTradeTime: 0,
  tradesThisHour: [],
};

export function buildLoserSet(mode: string, digit: number, comboUnder = 4, comboOver = 5): Set<number> {
  const set = new Set<number>();
  if (mode === 'over') { for (let i = 0; i <= digit; i++) set.add(i); }
  else if (mode === 'under') { for (let i = digit; i <= 9; i++) set.add(i); }
  else if (mode === 'combo') {
    const minD = Math.min(comboUnder, comboOver);
    const maxD = Math.max(comboUnder, comboOver);
    for (let i = minD; i <= maxD; i++) set.add(i);
  }
  else { set.add(digit); }
  return set;
}

export function isWinCheck(r: number, mode: string, digit: number, comboUnder = 4, comboOver = 5): boolean {
  if (mode === 'over') return r > digit;
  if (mode === 'under') return r < digit;
  if (mode === 'differ') return r !== digit;
  if (mode === 'combo') {
    const minD = Math.min(comboUnder, comboOver);
    const maxD = Math.max(comboUnder, comboOver);
    return r < minD || r > maxD;
  }
  return false;
}
