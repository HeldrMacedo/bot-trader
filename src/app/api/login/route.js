import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { signToken } from "../../lib/auth.js";
import { checkRateLimit } from "../../lib/rateLimiter.js";

const prisma = new PrismaClient();

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
    const rateCheck = checkRateLimit(`login:${ip}`, { max: 5, windowMs: 15 * 60 * 1000 });
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { message: `Muitas tentativas. Tente novamente em ${rateCheck.retryAfter}s.` },
        { status: 429, headers: { 'Retry-After': String(rateCheck.retryAfter) } }
      );
    }

    const body = await request.json().catch(() => null);
    const { email, password } = body ?? {};

    if (!email || !EMAIL_REGEX.test(email)) {
      return NextResponse.json({ message: "Email inválido" }, { status: 400 });
    }
    if (!password || password.length < 6) {
      return NextResponse.json({ message: "Senha inválida" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({ message: "Credenciais inválidas" }, { status: 401 });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return NextResponse.json({ message: "Credenciais inválidas" }, { status: 401 });
    }

    const token = signToken(user.id);
    const response = NextResponse.json({ token }, { status: 200 });
    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 8 * 60 * 60, // 8 horas, igual ao JWT
    });
    return response;
  } catch (error) {
    return NextResponse.json({ message: "Erro no servidor" }, { status: 500 });
  }
}
