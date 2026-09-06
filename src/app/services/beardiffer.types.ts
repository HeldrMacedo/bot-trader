// TIPOS E INTERFACES — Bear Bot Differ IA 3.5

export interface DifferMarket {
  sym: string;
  nm: string;
  pip: number;
  on: boolean;
  proven?: boolean;
}

export const DEFAULT_DIFFER_MARKETS: DifferMarket[] = [
  { sym: 'R_10', nm: 'Volatilidade 10', pip: 3, on: true },
  { sym: 'R_25', nm: 'Volatilidade 25', pip: 3, on: true },
  { sym: 'R_50', nm: 'Volatilidade 50', pip: 4, on: true },
  { sym: 'R_75', nm: 'Volatilidade 75', pip: 4, on: true },
  { sym: 'R_100', nm: 'Volatilidade 100', pip: 2, on: true },
  { sym: 'RDBEAR', nm: 'Bear Market', pip: 4, on: true },
  { sym: 'RDBULL', nm: 'Bull Market', pip: 4, on: true },
];

export const PIP_FALLBACK: Record<string, number> = {
  R_10: 3,
  R_25: 3,
  R_50: 4,
  R_75: 4,
  R_100: 2,
  RDBEAR: 4,
  RDBULL: 4,
};

export interface DifferGenome {
  win: number;
  wSat: number;
  wGap: number;
  wStab: number;
  wConf: number;
  satDiv: number;
  gapWin: number;
  penLast: number;
  penStreak: number;
  penPrev: number;
  lowP: number;
  lowMul: number;
  minScore: number;
}

export const BASE_GENOME: DifferGenome = {
  win: 180,
  wSat: 46,
  wGap: 24,
  wStab: 16,
  wConf: 14,
  satDiv: 2.6,
  gapWin: 12,
  penLast: 0.35,
  penStreak: 0.2,
  penPrev: 0.12,
  lowP: 0.06,
  lowMul: 0.55,
  minScore: 72,
};

export type OnceLogicMode = 'auto' | 'rotate' | 'recent' | string;
export type OpMode = 'sim' | 'real';
export type MartingaleMode = 'off' | 'normal' | 'partial';

export interface MartingaleConfig {
  mode: MartingaleMode;
  factor: number;
  maxLvl: number;
  parts: number;
  base: number;
}

export interface DifferConfig {
  stake: number;
  minScore: number;
  minTicks: number;
  cooldown: number;
  gateBias: boolean;
  /** Amostra mínima de ticks para um mercado poder ser julgado no laboratório */
  labMin: number;
  /** Alfa do laboratório, já sob correção de Bonferroni */
  labAlpha: number;
  /** Sinais virtuais mínimos por lógica e mercado para a vigilância opinar */
  wtMinN: number;
  /** Alfa da vigilância, sob Bonferroni na família mercados × lógicas */
  wtAlpha: number;
  opMode: OpMode;
  gateOps: number;
  gateAcc: number;
  mgMode: MartingaleMode;
  mgFactor: number;
  mgMax: number;
  mgParts: number;
  stopLoss: number;
  stopWin: number;
  maxLoss: number;
  minAcc: number;
  maxStale: number;
  wideScan: boolean;
  fastExec: boolean;
  exFilter: boolean;
  exOnlyLosers: boolean;
  vlossOn: boolean;
  vlossN: number;
  vlossRepick: boolean;
  allowAuto: boolean;
  autoOn: boolean;
  onceLogic: OnceLogicMode;
  onceMinConf: number;
  beep: boolean;
  autoReconn: boolean;
}

export const DEFAULT_DIFFER_CONFIG: DifferConfig = {
  stake: 0.35,
  minScore: 72,
  minTicks: 300,
  cooldown: 15,
  gateBias: true,
  labMin: 2000,
  labAlpha: 0.01,
  wtMinN: 500,
  wtAlpha: 0.01,
  opMode: 'sim',
  gateOps: 50,
  gateAcc: 91,
  mgMode: 'normal',
  mgFactor: 2.2,
  mgMax: 3,
  mgParts: 3,
  stopLoss: 10,
  stopWin: 10,
  maxLoss: 4,
  minAcc: 80,
  maxStale: 2,
  wideScan: false,
  fastExec: true,
  exFilter: false,
  exOnlyLosers: false,
  vlossOn: false,
  vlossN: 1,
  vlossRepick: true,
  allowAuto: false,
  autoOn: false,
  onceLogic: 'auto',
  onceMinConf: 70,
  beep: true,
  autoReconn: true,
};

export interface LogicPick {
  digit: number;
  conf: number;
  why: string;
}

export interface LogicDef {
  id: string;
  name: string;
  tag: string;
  desc: string;
  wide?: boolean;
  pick: (sym: string, getBuf: (sym: string) => number[], helpers?: any) => LogicPick | null;
}

export interface LogicStat {
  n: number;
  w: number;
  recent: number[];
}

export interface LogicRankingRow {
  lid: string;
  name: string;
  tag: string;
  n: number;
  acc: number | null;
  p: number;
  ready: boolean;
  pass?: boolean;
}

export interface BiasTestResult {
  n: number;
  pU: number;
  pM: number;
  pR: number;
  pA: number;
  chiU: number;
  chiM: number;
  zR: number;
  r: number;
  cells: number[][];
  repRate: number;
  ps?: { U: number; M: number; R: number; A: number };
  minP?: number;
  enough?: boolean;
  sig?: boolean;
  tests?: number;
}

export interface DifferLogItem {
  id: string;
  time: string;
  msg: string;
  cls?: 'up' | 'dn' | 'nt' | 'am';
}

export type WatchStatus = 'normal' | 'observacao' | 'quebra' | 'amostra';

export interface WatchEntry {
  status: WatchStatus;
  txt: string;
}

export interface WatchAlertItem {
  id: string;
  time: string;
  sym: string;
  txt: string;
}

export interface AnomalyLogItem {
  id: string;
  time: string;
  msg: string;
}

export interface VirtualLossStatus {
  armed: boolean;
  targetLosses: number;
  seenLosses: number;
  ticksChecked: number;
  sym: string;
  targetDigit: number;
}

export interface DifferAudit {
  tick_previous: string;
  tick_start: string;
  tick_end: string;
}

export interface DifferTradeRecord {
  id: string;
  time: string;
  sym: string;
  mode: 'differ';
  digit: number;
  exitDigit: number | null;
  stake: number;
  profit: number;
  result: 'WIN' | 'LOSS';
  paper: boolean;
  fast: boolean;
  logicId?: string;
  audit?: DifferAudit;
}

export interface MonteCarloResult {
  ruinProb: number;
  medianPnl: number;
  p05: number;
  p95: number;
  medianDrawdown: number;
  worstDrawdown: number;
  runs: number;
}

export interface WalkForwardResult {
  trainAcc: number;
  testAcc: number;
  drop: number;
  trainTrades: number;
  testTrades: number;
  passed: boolean;
}

export interface PermutationResult {
  realAcc: number;
  pPerm: number;
  runs: number;
  samples: number[];
  passed: boolean;
}

export interface StrategyCandidate {
  G: DifferGenome;
  accA?: number;
  tA?: number;
  pnlA?: number;
  accB?: number;
  tB?: number;
  pnlB?: number;
  p?: number;
  pass?: boolean;
  accC?: number;
  tC?: number;
  pnlC?: number;
  pC?: number;
  pPerm?: number;
  approved?: boolean;
}
