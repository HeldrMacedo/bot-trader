import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";

const prisma = new PrismaClient();

export async function POST(request) {
  try {
    const { operationId, account, deposit, result, token } =
      await request.json();

    try {
      // Verifica e decodifica o token usando a mesma chave secreta
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      console.log("dec userId", decoded.userId); // Dados do payload
      console.log("dec exp", decoded.exp); // Timestamp de expiração
    } catch (error) {
      console.error("Token inválido:", error.message);
      // Token expirado, inválido ou manipulado
    }

    const operationDate = now();
    const userId = decoded.userId;

    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
    });
    if (!existingUser) {
      return NextResponse.json(
        { message: "Usuário não encontrado" },
        { status: 404 }
      );
    }

    const existingOperation = await prisma.operation.findUnique({
      where: { operationId },
    });
    if (existingOperation) {
      return NextResponse.json(
        { message: "Operação já registrada" },
        { status: 400 }
      );
    }

    const operation = await prisma.operation.create({
      data: {
        operationId,
        account,
        operationDate: new Date(operationDate),
        deposit: parseFloat(deposit),
        result: parseFloat(result),
        userId,
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
