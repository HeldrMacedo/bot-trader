import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const BCRYPT_ROUNDS = 12;
const TOKEN_EXPIRY_MS = 30 * 60 * 1000; // 30 minutos

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const { token, password } = body ?? {};

  if (!token || !password) {
    return NextResponse.json(
      { error: "Token e nova senha são obrigatórios" },
      { status: 400 }
    );
  }

  if (typeof password !== 'string' || password.length < 8) {
    return NextResponse.json(
      { error: "A nova senha deve ter pelo menos 8 caracteres" },
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

  if (!user.tokenSentAt || Date.now() - new Date(user.tokenSentAt).getTime() > TOKEN_EXPIRY_MS) {
    await prisma.user.update({ where: { id: user.id }, data: { passwordToken: null } });
    return NextResponse.json(
      { error: "Token expirado. Solicite um novo link de redefinição de senha." },
      { status: 400 }
    );
  }

  const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);

  await prisma.user.update({
    where: { id: user.id },
    data: { password: hashedPassword, passwordToken: null },
  });

  return NextResponse.json({
    success: true,
    message: "Senha redefinida com sucesso",
  });
}
