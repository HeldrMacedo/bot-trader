import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

export async function POST(req: Request) {
  const { token, password } = await req.json();

  if (!token || !password) {
    return NextResponse.json(
      { error: "Token e nova senha são obrigatórios" },
      { status: 400 }
    );
  }

  const user = await prisma.user.findFirst({
    where: { passwordToken: token },
  });

  if (!user) {
    return NextResponse.json(
      { error: "Token inválido ou expirado" },
      { status: 400 }
    );
  }

  const hashedPassword = await bcrypt.hash(password, 8);

  await prisma.user.update({
    where: { id: user.id },
    data: { password: hashedPassword },
  });

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordToken: null },
  });

  return NextResponse.json({
    success: true,
    message: "Senha redefinida com sucesso",
  });
}
