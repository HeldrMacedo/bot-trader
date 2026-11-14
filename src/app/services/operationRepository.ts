import prisma from '@/lib/prisma';
import { OperationPayload, toOperationData } from './operationData';

/**
 * Server-side counterpart of POST /api/operation, for bots that settle
 * contracts on the server (BotTrader copy trader) and already know the user.
 * Returns true when a new row was written, false when skipped.
 */
export async function saveRealOperation(userId: number, payload: OperationPayload): Promise<boolean> {
  if (!Number.isInteger(userId)) return false;

  const existing = await prisma.operation.findFirst({ where: { operationId: payload.operationId } });
  if (existing) return false;

  await prisma.operation.create({ data: toOperationData(userId, payload) as any });
  return true;
}
