// Statistics over Deriv profit_table transactions. Pure functions, used by the history page.

export interface ProfitTableTransaction {
  transaction_id: number | string;
  contract_id?: number | string;
  contract_type?: string;
  underlying_symbol?: string;
  buy_price: number | string;
  sell_price: number | string;
  payout?: number | string;
  purchase_time: number;
  sell_time?: number;
  shortcode?: string;
  longcode?: string;
}

export interface HistoryTrade {
  transactionId: string;
  contractId: string | null;
  contractType: string;
  symbol: string;
  barrier: string | null;
  stake: number;
  sellPrice: number;
  payout: number | null;
  profit: number;
  won: boolean;
  purchaseTime: number;
  sellTime: number | null;
  shortcode: string | null;
  longcode: string | null;
}

export interface Streak {
  type: "won" | "lost";
  length: number;
}

export interface HistoryStats {
  total: number;
  wins: number;
  losses: number;
  winRate: number;
  staked: number;
  profit: number;
  roi: number;
  averageStake: number;
  averageWin: number;
  averageLoss: number;
  bestTrade: number;
  worstTrade: number;
  /** Gross profit / gross loss. Null when there are no losses (undefined ratio). */
  profitFactor: number | null;
  /** Average profit per trade. */
  expectancy: number;
  /** Win rate needed to break even given the average win and loss sizes. */
  breakEvenWinRate: number | null;
  maxWinStreak: number;
  maxLossStreak: number;
  currentStreak: Streak | null;
  /** Largest drop of cumulative profit from a previous peak, in account currency. */
  maxDrawdown: number;
}

export interface BreakdownRow {
  key: string;
  total: number;
  wins: number;
  losses: number;
  winRate: number;
  staked: number;
  profit: number;
  roi: number;
}

export interface EquityPoint {
  index: number;
  time: number;
  profit: number;
  cumulative: number;
}

const toNumber = (value: unknown): number => {
  const parsed = typeof value === "number" ? value : parseFloat(String(value ?? ""));
  return Number.isFinite(parsed) ? parsed : 0;
};

// Money in cents to keep 0.55 - 0.35 from becoming 0.20000000000000004.
const money = (value: number) => Math.round(value * 100) / 100;

const percent = (part: number, whole: number) => (whole ? (part / whole) * 100 : 0);

const DIGIT_BARRIER = /_\d+[tT]_(\d)(?:_\d+)?$/;

export const normalizeTrade = (tx: ProfitTableTransaction): HistoryTrade => {
  const stake = toNumber(tx.buy_price);
  const sellPrice = toNumber(tx.sell_price);
  const profit = money(sellPrice - stake);
  const barrierMatch = tx.contract_type?.startsWith("DIGIT") ? tx.shortcode?.match(DIGIT_BARRIER) : null;
  return {
    transactionId: String(tx.transaction_id),
    contractId: tx.contract_id === undefined ? null : String(tx.contract_id),
    contractType: tx.contract_type ?? "—",
    symbol: tx.underlying_symbol ?? "—",
    barrier: barrierMatch ? barrierMatch[1] : null,
    stake,
    sellPrice,
    payout: tx.payout === undefined ? null : toNumber(tx.payout),
    profit,
    won: profit > 0,
    purchaseTime: tx.purchase_time,
    sellTime: tx.sell_time ?? null,
    shortcode: tx.shortcode ?? null,
    longcode: tx.longcode ?? null,
  };
};

const CONTRACT_LABELS: Record<string, string> = {
  DIGITOVER: "Acima de",
  DIGITUNDER: "Abaixo de",
  DIGITMATCH: "Igual a",
  DIGITDIFF: "Diferente de",
  DIGITEVEN: "Par",
  DIGITODD: "Ímpar",
  CALL: "Sobe",
  PUT: "Desce",
};

export const contractDescription = (type: string, barrier: string | null): string => {
  const label = CONTRACT_LABELS[type];
  if (!label) return type;
  return barrier === null ? label : `${label} ${barrier}`;
};

const chronological = (trades: HistoryTrade[]) =>
  [...trades].sort((a, b) => a.purchaseTime - b.purchaseTime || a.transactionId.localeCompare(b.transactionId));

const sum = (values: number[]) => values.reduce((acc, value) => acc + value, 0);

export const computeHistoryStats = (trades: HistoryTrade[]): HistoryStats => {
  const ordered = chronological(trades);
  const winners = ordered.filter((t) => t.won);
  const losers = ordered.filter((t) => !t.won);

  const staked = sum(ordered.map((t) => t.stake));
  const profit = sum(ordered.map((t) => t.profit));
  const grossWin = sum(winners.map((t) => t.profit));
  const grossLoss = -sum(losers.map((t) => t.profit));
  const averageWin = winners.length ? grossWin / winners.length : 0;
  const averageLoss = losers.length ? -grossLoss / losers.length : 0;

  let maxWinStreak = 0;
  let maxLossStreak = 0;
  let current: Streak | null = null;
  let peak = 0;
  let cumulative = 0;
  let maxDrawdown = 0;

  for (const trade of ordered) {
    const type = trade.won ? "won" : "lost";
    current = current?.type === type ? { type, length: current.length + 1 } : { type, length: 1 };
    if (type === "won") maxWinStreak = Math.max(maxWinStreak, current.length);
    else maxLossStreak = Math.max(maxLossStreak, current.length);

    cumulative += trade.profit;
    peak = Math.max(peak, cumulative);
    maxDrawdown = Math.max(maxDrawdown, peak - cumulative);
  }

  const canBreakEven = winners.length > 0 && losers.length > 0;

  return {
    total: ordered.length,
    wins: winners.length,
    losses: losers.length,
    winRate: percent(winners.length, ordered.length),
    staked,
    profit,
    roi: percent(profit, staked),
    averageStake: ordered.length ? staked / ordered.length : 0,
    averageWin,
    averageLoss,
    bestTrade: ordered.length ? Math.max(...ordered.map((t) => t.profit)) : 0,
    worstTrade: ordered.length ? Math.min(...ordered.map((t) => t.profit)) : 0,
    profitFactor: grossLoss > 0 ? grossWin / grossLoss : null,
    expectancy: ordered.length ? profit / ordered.length : 0,
    breakEvenWinRate: canBreakEven ? percent(-averageLoss, averageWin - averageLoss) : null,
    maxWinStreak,
    maxLossStreak,
    currentStreak: current,
    maxDrawdown,
  };
};

export const breakdownBy = (
  trades: HistoryTrade[],
  keyOf: (trade: HistoryTrade) => string,
  compare: (a: BreakdownRow, b: BreakdownRow) => number = (a, b) => b.total - a.total,
): BreakdownRow[] => {
  const groups = new Map<string, HistoryTrade[]>();
  for (const trade of trades) {
    const key = keyOf(trade);
    groups.set(key, [...(groups.get(key) ?? []), trade]);
  }
  return [...groups.entries()]
    .map(([key, group]) => {
      const wins = group.filter((t) => t.won).length;
      const staked = sum(group.map((t) => t.stake));
      const profit = sum(group.map((t) => t.profit));
      return {
        key,
        total: group.length,
        wins,
        losses: group.length - wins,
        winRate: percent(wins, group.length),
        staked,
        profit,
        roi: percent(profit, staked),
      };
    })
    .sort(compare);
};

export const hourOfDay = (trade: HistoryTrade) =>
  String(new Date(trade.purchaseTime * 1000).getHours()).padStart(2, "0");

export const equityCurve = (trades: HistoryTrade[]): EquityPoint[] => {
  let cumulative = 0;
  return chronological(trades).map((trade, i) => {
    cumulative += trade.profit;
    return { index: i + 1, time: trade.purchaseTime, profit: trade.profit, cumulative };
  });
};

type ProfitTablePage = {
  error?: { message?: string };
  profit_table?: { transactions?: ProfitTableTransaction[] };
};

/**
 * Loads every transaction of a period, page by page (profit_table caps a page at 500).
 * Stops at `maxTrades` so a long period cannot open an unbounded number of connections.
 */
export const fetchProfitTableRange = async (
  fetchPage: (limit: number, offset: number) => Promise<ProfitTablePage>,
  { pageSize = 500, maxTrades = 2000 }: { pageSize?: number; maxTrades?: number } = {},
): Promise<{ transactions: ProfitTableTransaction[]; truncated: boolean }> => {
  const transactions: ProfitTableTransaction[] = [];
  while (transactions.length < maxTrades) {
    const limit = Math.min(pageSize, maxTrades - transactions.length);
    const response = await fetchPage(limit, transactions.length);
    if (response?.error) throw new Error(response.error.message || "Erro ao buscar o histórico.");
    const page = response?.profit_table?.transactions ?? [];
    transactions.push(...page);
    if (page.length < limit) return { transactions, truncated: false };
  }
  return { transactions, truncated: true };
};
