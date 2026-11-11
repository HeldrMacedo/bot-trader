// Pure helpers for the operations report. Shared by the server actions and the page.

export type OutcomeFilter = "" | "won" | "lost";

export interface OperationFilters {
  search?: string;
  /** ISO timestamp, already converted from the viewer's local day boundary. */
  from?: string;
  to?: string;
  symbol?: string;
  contractType?: string;
  outcome?: OutcomeFilter;
}

export interface ReportSummary {
  total: number;
  wins: number;
  losses: number;
  winRate: number;
  staked: number;
  profit: number;
  roi: number;
}

export interface BreakdownRow extends ReportSummary {
  key: string;
}

const MISSING_LABEL = "Sem dado";

const parseDate = (value?: string): Date | null => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const buildOperationWhere = (filters: OperationFilters) => {
  const and: Record<string, unknown>[] = [];

  const search = filters.search?.trim();
  if (search) {
    and.push({
      OR: [
        { operationId: { contains: search } },
        { contractId: { contains: search } },
        { account: { contains: search } },
        { user: { name: { contains: search } } },
      ],
    });
  }

  const from = parseDate(filters.from);
  const to = parseDate(filters.to);
  if (from || to) {
    and.push({
      operationDate: {
        ...(from && { gte: from }),
        ...(to && { lte: to }),
      },
    });
  }

  if (filters.symbol) and.push({ symbol: filters.symbol });
  if (filters.contractType) and.push({ contractType: filters.contractType });

  // Profit sign, not the outcome column: rows saved before that column existed have it NULL.
  if (filters.outcome === "won") and.push({ result: { gt: 0 } });
  if (filters.outcome === "lost") and.push({ result: { lte: 0 } });

  return and.length ? { AND: and } : {};
};

const percent = (part: number, whole: number) => (whole ? (part / whole) * 100 : 0);

export const summarizeOperations = ({
  total,
  wins,
  staked,
  profit,
}: {
  total: number;
  wins: number;
  staked: number;
  profit: number;
}): ReportSummary => ({
  total,
  wins,
  losses: total - wins,
  winRate: percent(wins, total),
  staked,
  profit,
  roi: percent(profit, staked),
});

type GroupTotal = {
  _count: { _all: number };
  _sum: { deposit: number | null; result: number | null };
} & Record<string, unknown>;
type GroupWins = { _count: { _all: number } } & Record<string, unknown>;

/** Joins a groupBy of all operations with a groupBy of winning ones, keyed by `field`. */
export const mergeBreakdown = (totals: GroupTotal[], wins: GroupWins[], field: string): BreakdownRow[] => {
  const winsByKey = new Map(wins.map((row) => [row[field] ?? null, row._count._all]));
  return totals
    .map((row) => ({
      key: (row[field] as string | null) ?? MISSING_LABEL,
      ...summarizeOperations({
        total: row._count._all,
        wins: winsByKey.get(row[field] ?? null) ?? 0,
        staked: row._sum.deposit ?? 0,
        profit: row._sum.result ?? 0,
      }),
    }))
    .sort((a, b) => b.total - a.total);
};

export const resolveOutcome = (op: { outcome?: string | null; result: number }): "won" | "lost" =>
  op.outcome === "won" || op.outcome === "lost" ? op.outcome : op.result > 0 ? "won" : "lost";

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

const NO_BARRIER = new Set(["DIGITEVEN", "DIGITODD"]);

export const contractLabel = (type?: string | null, barrier?: string | null): string => {
  if (!type) return "—";
  const label = CONTRACT_LABELS[type];
  if (!label) return type;
  if (NO_BARRIER.has(type) || barrier === null || barrier === undefined || barrier === "") return label;
  return `${label} ${barrier}`;
};

export const isVirtualAccount = (account?: string | null) => Boolean(account?.startsWith("VRTC"));

export interface ExportableOperation {
  operationId: string;
  contractId?: string | null;
  transactionId?: string | null;
  derivAccountId?: string | null;
  account: string;
  operationDate: Date | string;
  deposit: number;
  result: number;
  outcome?: string | null;
  payout?: number | null;
  currency?: string | null;
  symbol?: string | null;
  contractType?: string | null;
  barrier?: string | null;
  entrySpot?: string | null;
  exitSpot?: string | null;
  exitDigit?: number | null;
  purchaseTime?: Date | string | null;
  expiryTime?: Date | string | null;
  shortcode?: string | null;
  user?: { name?: string | null } | null;
}

const CSV_HEADER = [
  "Data",
  "Usuário",
  "Conta",
  "Tipo de conta",
  "ID Contrato",
  "ID Transação",
  "Conta Deriv",
  "Ativo",
  "Contrato",
  "Barreira",
  "Stake",
  "Payout",
  "Lucro",
  "Resultado",
  "Moeda",
  "Spot entrada",
  "Spot saída",
  "Dígito saída",
  "Compra",
  "Expiração",
  "Shortcode",
];

// Semicolon and decimal comma so Excel in pt-BR opens the file without an import wizard.
const csvCell = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  const text = String(value);
  return /[;"\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

const csvNumber = (value?: number | null) =>
  value === null || value === undefined ? "" : value.toFixed(2).replace(".", ",");

const csvDate = (value?: Date | string | null) => (value ? new Date(value).toLocaleString("pt-BR") : "");

export const operationsToCsv = (operations: ExportableOperation[]): string => {
  const rows = operations.map((op) =>
    [
      csvDate(op.operationDate),
      op.user?.name,
      op.account,
      isVirtualAccount(op.account) ? "Virtual" : "Real",
      op.contractId ?? op.operationId,
      op.transactionId,
      op.derivAccountId,
      op.symbol,
      op.contractType ? contractLabel(op.contractType, op.barrier) : "",
      op.barrier,
      csvNumber(op.deposit),
      csvNumber(op.payout),
      csvNumber(op.result),
      resolveOutcome(op) === "won" ? "Win" : "Loss",
      op.currency,
      op.entrySpot,
      op.exitSpot,
      op.exitDigit,
      csvDate(op.purchaseTime),
      csvDate(op.expiryTime),
      op.shortcode,
    ]
      .map(csvCell)
      .join(";"),
  );
  return [CSV_HEADER.join(";"), ...rows].join("\n");
};
