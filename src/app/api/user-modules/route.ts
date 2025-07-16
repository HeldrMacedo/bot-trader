import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { verifyAdminToken } from "@/app/(withSidebar)/operations/actions";

const prisma = new PrismaClient();

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const token = searchParams.get("token") || "";
    
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