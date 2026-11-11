import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";

const prisma = new PrismaClient();

const toFloatOrNull = (value) => {
  if (value === undefined || value === null || value === "") return null;
  const parsed = parseFloat(value);
  return Number.isNaN(parsed) ? null : parsed;
};

const toStringOrNull = (value) =>
  value === undefined || value === null || value === "" ? null : String(value);

const toIntOrNull = (value) => {
  if (value === undefined || value === null || value === "") return null;
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
};

// Deriv sends epoch seconds.
const epochToDate = (value) => {
  const seconds = toIntOrNull(value);
  return seconds === null ? null : new Date(seconds * 1000);
};

export async function POST(request) {
  try {
    const {
      token,
      operationId,
      account,
      deposit,
      result,
      contractId,
      transactionId,
      derivAccountId,
      symbol,
      contractType,
      barrier,
      payout,
      currency,
      entrySpot,
      exitSpot,
      exitDigit,
      purchaseTime,
      expiryTime,
      shortcode,
      audit,
    } = await request.json();

    let userId;
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      userId = decoded.userId;
    } catch (error) {
      console.error("Token inválido:", error.message);
      return NextResponse.json({ message: "Token inválido" }, { status: 404 });
    }

    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
    });
    if (!existingUser) {
      return NextResponse.json(
        { message: "Usuário não encontrado" },
        { status: 404 }
      );
    }

    const existingOperation = await prisma.operation.findFirst({
      where: { operationId },
    });
    if (existingOperation) {
      return NextResponse.json(
        { message: "Operação já registrada" },
        { status: 400 }
      );
    }

    const profit = parseFloat(result);

    const operation = await prisma.operation.create({
      data: {
        operationId,
        account,
        operationDate: new Date(),
        deposit: parseFloat(deposit),
        result: profit,
        // Settled on is_valid_to_sell, when Deriv still reports status "open": the profit sign decides.
        outcome: profit > 0 ? "won" : "lost",
        userId,
        contractId: toStringOrNull(contractId),
        transactionId: toStringOrNull(transactionId),
        derivAccountId: toStringOrNull(derivAccountId),
        symbol: toStringOrNull(symbol),
        contractType: toStringOrNull(contractType),
        barrier: toStringOrNull(barrier),
        payout: toFloatOrNull(payout),
        currency: toStringOrNull(currency),
        entrySpot: toStringOrNull(entrySpot),
        exitSpot: toStringOrNull(exitSpot),
        exitDigit: toIntOrNull(exitDigit),
        purchaseTime: epochToDate(purchaseTime),
        expiryTime: epochToDate(expiryTime),
        shortcode: toStringOrNull(shortcode),
        // Prisma rejects a plain null on Json columns; undefined leaves the column NULL.
        audit: Array.isArray(audit) ? audit : undefined,
      },
    });

    return NextResponse.json(
      { message: "Operação registrada com sucesso", operation },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: "Erro no servidor", error: error.message },
      { status: 500 }
    );
  }
}
