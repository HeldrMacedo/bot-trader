import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { checkRateLimit } from "../../lib/rateLimiter.js";

const prisma = new PrismaClient();

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\(\d{2}\)\d{5}-\d{4}$/;
const BCRYPT_ROUNDS = 12;

function getClientIp(request) {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

export async function POST(request) {
  try {
    const ip = getClientIp(request);
    const rateCheck = checkRateLimit(`register:${ip}`, { max: 5, windowMs: 60 * 60 * 1000 });
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { message: `Muitas tentativas de cadastro. Tente novamente em ${rateCheck.retryAfter}s.` },
        { status: 429, headers: { 'Retry-After': String(rateCheck.retryAfter) } }
      );
    }

    const body = await request.json().catch(() => null);
    const { name, email, password, phone } = body ?? {};

    if (!name || name.trim().length === 0) {
      return NextResponse.json({ message: "Nome é obrigatório" }, { status: 400 });
    }
    if (!email || !EMAIL_REGEX.test(email)) {
      return NextResponse.json({ message: "Email inválido" }, { status: 400 });
    }
    if (!password || password.length < 8) {
      return NextResponse.json({ message: "Senha deve ter pelo menos 8 caracteres" }, { status: 400 });
    }
    if (!phone || !PHONE_REGEX.test(phone)) {
      return NextResponse.json({ message: "Telefone inválido. Use o formato (XX)XXXXX-XXXX" }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ message: "Usuário já existe" }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);

    const user = await prisma.user.create({
      data: { name: name.trim(), phone, email: email.toLowerCase(), password: hashedPassword },
    });

    return NextResponse.json(
      { message: "Usuário criado com sucesso", user: { id: user.id, email: user.email, name: user.name } },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json({ message: "Erro no servidor" }, { status: 500 });
  }
}
