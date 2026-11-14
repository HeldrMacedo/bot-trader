import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { toOperationData } from "@/app/services/operationData";

const prisma = new PrismaClient();

export async function POST(request) {
  try {
    const { token, ...payload } = await request.json();
    const { operationId } = payload;

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

    const operation = await prisma.operation.create({
      data: toOperationData(userId, payload),
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
