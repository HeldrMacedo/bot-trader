"use server";
import { User } from "@prisma/client";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { verifyAdminToken } from "../operations/actions";

export async function getUsers(
  search: string,
  page: number,
  itemsPerPage: number,
  token: string
) {
  const isAdmin = await verifyAdminToken(token);
  if (!isAdmin) return { users: [], total: 0, totalPages: 0, error: true };
  const skip = (page - 1) * itemsPerPage;
  const take = itemsPerPage;

  const [users, total] = await prisma.$transaction([
    prisma.user.findMany({
      where: {
        name: {
          contains: search,
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take,
    }),
    prisma.user.count({
      where: {
        name: {
          contains: search,
        },
      },
    }),
  ]);

  return {
    users,
    total,
    totalPages: Math.ceil(total / itemsPerPage),
    error: false,
  };
}

export async function createUser(
  data: Omit<User, "id" | "createdAt" | "updatedAt">,
  token: string
) {
  const isAdmin = await verifyAdminToken(token);
  if (!isAdmin) return { error: true };
  const hashedPassword = await bcrypt.hash(data.password, 10);

  const prismaResp = await prisma.user.create({
    data: {
      ...data,
      password: hashedPassword,
      role: data.role || "user",
    },
  });
  return { prismaResp, error: false };
}

export async function updateUser(data: Partial<User>, token: string) {
  const isAdmin = await verifyAdminToken(token);
  if (!isAdmin) return { error: true };
  const updateData: Partial<User> = {
    name: data.name,
    email: data.email,
    phone: data.phone,
    role: data.role,
  };

  if (data.password) {
    updateData.password = await bcrypt.hash(data.password, 10);
  }

  const prismaResp = await prisma.user.update({
    where: { id: data.id },
    data: updateData,
  });
  return { prismaResp, error: false };
}

export async function deleteUser(id: number, token: string) {
  const isAdmin = await verifyAdminToken(token);
  if (!isAdmin) return { error: true };
  const prismaResp = await prisma.user.delete({
    where: { id },
  });
  return { prismaResp, error: false };
}
