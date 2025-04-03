"use server";
import { User } from "@prisma/client";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function getUsers(
  search: string,
  page: number,
  itemsPerPage: number
) {
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
  };
}

export async function createUser(
  data: Omit<User, "id" | "createdAt" | "updatedAt">
) {
  const hashedPassword = await bcrypt.hash(data.password, 10);

  return prisma.user.create({
    data: {
      ...data,
      password: hashedPassword,
      role: data.role || "user",
    },
  });
}

export async function updateUser(data: Partial<User>) {
  const updateData: Partial<User> = {
    name: data.name,
    email: data.email,
    phone: data.phone,
    role: data.role,
  };

  if (data.password) {
    updateData.password = await bcrypt.hash(data.password, 10);
  }

  return prisma.user.update({
    where: { id: data.id },
    data: updateData,
  });
}

export async function deleteUser(id: number) {
  return prisma.user.delete({
    where: { id },
  });
}
