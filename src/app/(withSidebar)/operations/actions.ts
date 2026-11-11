"use server";
import prisma from "@/lib/prisma";
import jwt from "jsonwebtoken";
import {
  buildOperationWhere,
  mergeBreakdown,
  summarizeOperations,
  type OperationFilters,
} from "./report";

const EXPORT_LIMIT = 10000;

// Never send the password hash or reset token to the browser.
const userSelect = { user: { select: { id: true, name: true, email: true } } };

export async function verifyAdminToken(token: string) {
  try {
    if (!token || !process.env.JWT_SECRET) return false;
    const decoded = jwt.verify(token, process.env.JWT_SECRET) as { userId: number };
    if (!decoded || !decoded.userId) return false;

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
      },
    });
    if (!user || user.role !== "admin") return false;
    return true;
  } catch (error) {
    console.error("verifyAdminToken error:", error);
    return false;
  }
}

export async function getOperations(
  filters: OperationFilters,
  skip: number,
  take: number,
  token: string
) {
  const isAdmin = await verifyAdminToken(token);
  if (!isAdmin) {
    return { operations: [], total: 0, summary: null, bySymbol: [], byContractType: [], error: true };
  }

  const where = buildOperationWhere(filters);
  const winning = { AND: [where, { result: { gt: 0 } }] };

  const [operations, total, wins, sums] = await prisma.$transaction([
    prisma.operation.findMany({
      where,
      include: userSelect,
      orderBy: { operationDate: "desc" },
      skip,
      take,
    }),
    prisma.operation.count({ where }),
    prisma.operation.count({ where: winning }),
    prisma.operation.aggregate({ where, _sum: { deposit: true, result: true } }),
  ]);

  // groupBy is kept out of $transaction: its overloads do not type-check inside the tuple.
  const [symbolTotals, symbolWins, typeTotals, typeWins] = await Promise.all([
    prisma.operation.groupBy({ by: ["symbol"], where, _count: { _all: true }, _sum: { deposit: true, result: true } }),
    prisma.operation.groupBy({ by: ["symbol"], where: winning, _count: { _all: true } }),
    prisma.operation.groupBy({ by: ["contractType"], where, _count: { _all: true }, _sum: { deposit: true, result: true } }),
    prisma.operation.groupBy({ by: ["contractType"], where: winning, _count: { _all: true } }),
  ]);

  return {
    operations,
    total,
    summary: summarizeOperations({
      total,
      wins,
      staked: sums._sum.deposit ?? 0,
      profit: sums._sum.result ?? 0,
    }),
    bySymbol: mergeBreakdown(symbolTotals as any, symbolWins as any, "symbol"),
    byContractType: mergeBreakdown(typeTotals as any, typeWins as any, "contractType"),
    error: false,
  };
}

export async function getOperationsForExport(filters: OperationFilters, token: string) {
  const isAdmin = await verifyAdminToken(token);
  if (!isAdmin) return { operations: [], error: true };

  const operations = await prisma.operation.findMany({
    where: buildOperationWhere(filters),
    include: userSelect,
    orderBy: { operationDate: "desc" },
    take: EXPORT_LIMIT,
  });
  return { operations, error: false };
}

export async function getOperationFilterOptions(token: string) {
  const isAdmin = await verifyAdminToken(token);
  if (!isAdmin) return { symbols: [], contractTypes: [] };

  const [symbols, contractTypes] = await Promise.all([
    prisma.operation.findMany({
      where: { symbol: { not: null } },
      distinct: ["symbol"],
      select: { symbol: true },
      orderBy: { symbol: "asc" },
    }),
    prisma.operation.findMany({
      where: { contractType: { not: null } },
      distinct: ["contractType"],
      select: { contractType: true },
      orderBy: { contractType: "asc" },
    }),
  ]);

  return {
    symbols: symbols.map((row) => row.symbol as string),
    contractTypes: contractTypes.map((row) => row.contractType as string),
  };
}
