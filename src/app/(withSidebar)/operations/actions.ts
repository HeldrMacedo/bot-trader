"use server";
import prisma from "@/lib/prisma";
import jwt from "jsonwebtoken";

export async function verifyAdminToken(token: string) {
  try {
    if (!token || !process.env.JWT_SECRET) return false;
    const decoded = jwt.verify(token, process.env.JWT_SECRET) as { userId: number };
    if (!decoded || !decoded.userId) return false;

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
      },
    });
    if (!user || user.role !== "admin") return false;
    return true;
  } catch (error) {
    console.error("verifyAdminToken error:", error);
    return false;
  }
}

export async function getOperations(
  search: string,
  skip: number,
  take: number,
  token: string
) {
  const isAdmin = await verifyAdminToken(token);
  if (!isAdmin) return { operations: [], total: 0, error: true };
  
  const filter = {
    OR: [
      {
        operationId: {
          contains: search,
        },
      },
      {
        account: {
          contains: search,
        },
      },
      {
        user: {
          name: {
            contains: search,
          },
        },
      },
    ],
  };

  const [operations, total] = await prisma.$transaction([
    prisma.operation.findMany({
      where: filter,
      include: {
        user: true,
      },
      orderBy: { operationDate: "desc" },
      skip,
      take,
    }),
    prisma.operation.count({
      where: filter,
    }),
  ]);

  return {
    operations,
    total,
    error: false,
  };
}
