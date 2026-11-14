import { saveOperation } from './operationService';
import { buildOperationRecord } from '../(withSidebar)/home/components/finishedTrade';

interface AccountLike {
  name?: string;
  activeToken?: string | null;
  tokens?: Array<{ token: string; is_virtual: boolean }>;
}

/**
 * Persists a settled real-account contract in the Operation table, the same
 * way the manual trading screen (home) does. Bots call this on settlement.
 *
 * Only the real account is saved. When the active account cannot be resolved
 * the contract is skipped: recording a demo trade as real would corrupt the
 * user's operation history, which is worse than missing one row.
 *
 * Never throws: a failed save must not break the bot's settlement flow,
 * which drives PnL, martingale and the trade lock.
 */
export function persistBotOperation(poc: any, accountInfo: AccountLike | null | undefined): void {
  try {
    if (!poc || !accountInfo?.tokens) return;
    const active = accountInfo.tokens.find((t) => t.token === accountInfo.activeToken);
    if (!active || active.is_virtual) return;

    const record = buildOperationRecord(poc, accountInfo.name || 'Conta Deriv');
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;

    Promise.resolve(saveOperation({ ...record, token, isVirtual: false })).catch((err: unknown) => {
      console.error('Falha ao salvar operação real:', err);
    });
  } catch (err) {
    console.error('Falha ao montar operação real:', err);
  }
}
