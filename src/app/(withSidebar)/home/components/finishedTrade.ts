export interface FinishedTrade {
  amount: string;
  barrier: string;
  contract_type: string;
  finished: true;
  id: string;
  market: string;
  profit: string;
  resultBarrier: string;
  status: string;
  audit: {
    tick_previous: string;
    tick_start: string;
    tick_end: string;
  };
}

const barrierLabel = (poc: any): string => {
  if (poc.contract_type === "DIGITEVEN") return "Par";
  if (poc.contract_type === "DIGITODD") return "Ímpar";
  return poc.barrier;
};

/** Builds the local trade record from a settled proposal_open_contract payload. */
export const buildFinishedTrade = (poc: any): FinishedTrade => {
  const details = poc.audit_details.all_ticks.filter((t: any) => t.tick_display_value !== undefined);
  return {
    amount: poc.buy_price,
    barrier: barrierLabel(poc),
    contract_type: poc.contract_type,
    finished: true,
    // poc.id is the subscription uuid; contract_id is what Deriv's statement/profit table show.
    id: String(poc.contract_id),
    market: poc.underlying_symbol,
    profit: poc.profit,
    resultBarrier: poc.exit_spot?.slice(-1) ?? "",
    status: poc.status,
    audit: {
      tick_previous: details[0].tick_display_value.slice(-1),
      tick_start: details[1].tick_display_value.slice(-1),
      tick_end: details[2].tick_display_value.slice(-1),
    },
  };
};

export interface OperationRecord {
  operationId: string;
  contractId: string;
  transactionId: string | null;
  derivAccountId: string | null;
  account: string;
  symbol: string;
  contractType: string;
  barrier: string | null;
  deposit: string;
  result: string;
  payout: string;
  currency: string;
  entrySpot: string | null;
  exitSpot: string | null;
  exitDigit: number | null;
  purchaseTime: number;
  expiryTime: number;
  shortcode: string;
  audit: unknown[] | null;
}

const toStringOrNull = (value: unknown): string | null =>
  value === undefined || value === null ? null : String(value);

/** Builds the payload persisted in the Operation table from a proposal_open_contract payload. */
export const buildOperationRecord = (poc: any, accountName: string): OperationRecord => {
  const contractId = String(poc.contract_id);
  // Spots stay as strings: the trailing zero is the result digit ("519.90" -> 0).
  const exitSpot = toStringOrNull(poc.exit_spot);
  return {
    operationId: contractId,
    contractId,
    transactionId: toStringOrNull(poc.transaction_ids?.buy),
    derivAccountId: toStringOrNull(poc.account_id),
    account: accountName,
    symbol: poc.underlying_symbol,
    contractType: poc.contract_type,
    barrier: toStringOrNull(poc.barrier),
    deposit: poc.buy_price,
    result: poc.profit,
    payout: poc.payout,
    currency: poc.currency,
    entrySpot: toStringOrNull(poc.entry_spot),
    exitSpot,
    exitDigit: exitSpot ? Number(exitSpot.slice(-1)) : null,
    purchaseTime: poc.purchase_time,
    expiryTime: poc.date_expiry,
    shortcode: poc.shortcode,
    audit: poc.audit_details?.all_ticks ?? null,
  };
};
