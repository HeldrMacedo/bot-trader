/**
 * Converts an operation payload (as built by buildOperationRecord) into the
 * data persisted in the Operation table. Shared by POST /api/operation and
 * server-side bots so both store contracts the same way.
 */

const toFloatOrNull = (value: unknown): number | null => {
  if (value === undefined || value === null || value === '') return null;
  const parsed = parseFloat(String(value));
  return Number.isNaN(parsed) ? null : parsed;
};

const toStringOrNull = (value: unknown): string | null =>
  value === undefined || value === null || value === '' ? null : String(value);

const toIntOrNull = (value: unknown): number | null => {
  if (value === undefined || value === null || value === '') return null;
  const parsed = parseInt(String(value), 10);
  return Number.isNaN(parsed) ? null : parsed;
};

// Deriv sends epoch seconds.
const epochToDate = (value: unknown): Date | null => {
  const seconds = toIntOrNull(value);
  return seconds === null ? null : new Date(seconds * 1000);
};

export interface OperationPayload {
  operationId: string;
  account: string;
  deposit: string | number;
  result: string | number;
  contractId?: unknown;
  transactionId?: unknown;
  derivAccountId?: unknown;
  symbol?: unknown;
  contractType?: unknown;
  barrier?: unknown;
  payout?: unknown;
  currency?: unknown;
  entrySpot?: unknown;
  exitSpot?: unknown;
  exitDigit?: unknown;
  purchaseTime?: unknown;
  expiryTime?: unknown;
  shortcode?: unknown;
  audit?: unknown;
}

export function toOperationData(userId: number, payload: OperationPayload) {
  const profit = parseFloat(String(payload.result));
  return {
    operationId: payload.operationId,
    account: payload.account,
    operationDate: new Date(),
    deposit: parseFloat(String(payload.deposit)),
    result: profit,
    // Settled on is_valid_to_sell, when Deriv still reports status "open": the profit sign decides.
    outcome: profit > 0 ? 'won' : 'lost',
    userId,
    contractId: toStringOrNull(payload.contractId),
    transactionId: toStringOrNull(payload.transactionId),
    derivAccountId: toStringOrNull(payload.derivAccountId),
    symbol: toStringOrNull(payload.symbol),
    contractType: toStringOrNull(payload.contractType),
    barrier: toStringOrNull(payload.barrier),
    payout: toFloatOrNull(payload.payout),
    currency: toStringOrNull(payload.currency),
    entrySpot: toStringOrNull(payload.entrySpot),
    exitSpot: toStringOrNull(payload.exitSpot),
    exitDigit: toIntOrNull(payload.exitDigit),
    purchaseTime: epochToDate(payload.purchaseTime),
    expiryTime: epochToDate(payload.expiryTime),
    shortcode: toStringOrNull(payload.shortcode),
    // Prisma rejects a plain null on Json columns; undefined leaves the column NULL.
    audit: Array.isArray(payload.audit) ? payload.audit : undefined,
  };
}
