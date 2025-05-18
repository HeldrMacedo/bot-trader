import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";
import { Resend } from "resend";
import crypto from "crypto";

const prisma = new PrismaClient();
const resend = new Resend(process.env.RESEND_API_KEY);

function generateSecureToken(length = 12) {
  const characters = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  const bytes = crypto.randomBytes(length);
  let token = "";

  for (let i = 0; i < length; i++) {
    token += characters[bytes[i] % characters.length];
  }

  return token;
}

export async function POST(request) {
  const { email } = await request.json();

  if (!email) {
    return NextResponse.json({ message: "Email obrigatório" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    return NextResponse.json(
      { message: "Usuário não encontrado" },
      { status: 404 }
    );
  }

  const COOLDOWN_MINUTES = 60 * 24; // 24 horas
  if (user.tokenSentAt) {
    const now = new Date();
    const sentAt = new Date(user.tokenSentAt);
    const diffInMinutes = (now.getTime() - sentAt.getTime()) / 1000 / 60;

    if (diffInMinutes < COOLDOWN_MINUTES) {
      const remaining = Math.ceil(COOLDOWN_MINUTES - diffInMinutes);
      return NextResponse.json(
        {
          message: `Você já solicitou uma redefinição de senha. Por favor, aguarde ${remaining / 60} horas para tentar novamente.`,
        },
        { status: 429 }
      );
    }
  }

  const token = generateSecureToken();

  await prisma.user.update({
    where: { email },
    data: { passwordToken: token, tokenSentAt: new Date() },
  });

  const resetLink = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${token}`;

  try {
    await resend.emails.send({
      from: "onboarding@resend.dev",
      to: email,
      subject: "Recuperação de senha",
      html: `
        <p>Você solicitou a redefinição de senha. Clique no link abaixo para criar uma nova senha:</p>
        <a href="${resetLink}">${resetLink}</a>
        <p>Se você não solicitou isso, por favor ignore este email.</p>
        <h2>Seu token: ${token}</h2>
      `,
    });

    return NextResponse.json({
      success: true,
      message: "E-mail de recuperação enviado!",
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Erro ao enviar e-mail" },
      { status: 500 }
    );
  }
}
