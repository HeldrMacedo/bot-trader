import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { verifyToken } from "@/app/lib/auth.js";

const prisma = new PrismaClient();

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization') ?? '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (!token) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    try {
      verifyToken(token);
    } catch {
      return NextResponse.json({ error: "Token inválido ou expirado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    
    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 });
    }

    const userModules = await prisma.userModule.findMany({
      where: {
        userId: parseInt(userId),
        isActive: true,
      },
      include: {
        module: true,
      },
    });

    return NextResponse.json({ userModules });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}