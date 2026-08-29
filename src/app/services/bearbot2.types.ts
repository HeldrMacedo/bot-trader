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
export type AIMode = 'conservative' | 'balanced' | 'aggressive';

export interface TradeLog {
  t: string;
  mercado: string;
  modo: string;
  alvo: number;
  audit: { tick_previous: string; tick_start: string; tick_end: string };
  saiu: string | number;
  stake: string;
  resultado: 'WIN' | 'LOSS';
  lucro: string;
  acumulado: string;
  paper?: boolean;
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
