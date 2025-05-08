"use server";
import prisma from "@/lib/prisma";
import jwt from "jsonwebtoken";

export async function getOperations(
  search: string,
  skip: number,
  take: number,
  token: string
) {
  const decoded = jwt.verify(token, process.env.JWT_SECRET);

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
  if (user.role !== "admin") return { operations: [], total: 0, error: true };
  const filter = {
    OR: [
      {
        operationId: {
          contains: search,
          mode: "insensitive" as const,
        },
      },
      {
        account: {
          contains: search,
          mode: "insensitive" as const,
        },
      },
      {
        user: {
          name: {
            contains: search,
            mode: "insensitive" as const,
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
