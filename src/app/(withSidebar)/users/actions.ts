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
      include: {
        userModules: {
          include: {
            module: true,
          },
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
  modules: number[],
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
      userModules: {
        create: modules.map(moduleId => ({
          moduleId,
          isActive: true,
        })),
      },
    },
    include: {
      userModules: {
        include: {
          module: true,
        },
      },
    },
  });
  return { prismaResp, error: false };
}

export async function updateUser(
  data: Partial<User> & { id: number },
  modules: number[],
  token: string
) {
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

  // Atualizar usuário e módulos em uma transação
  const prismaResp = await prisma.$transaction(async (tx) => {
    // Atualizar dados do usuário
    const updatedUser = await tx.user.update({
      where: { id: data.id },
      data: updateData,
    });

    // Remover todos os módulos existentes
    await tx.userModule.deleteMany({
      where: { userId: data.id },
    });

    // Adicionar novos módulos
    if (modules.length > 0) {
      await tx.userModule.createMany({
        data: modules.map(moduleId => ({
          userId: data.id,
          moduleId,
          isActive: true,
        })),
      });
    }

    return updatedUser;
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

// Novas funções para módulos
export async function getModules(token: string) {
  const isAdmin = await verifyAdminToken(token);
  if (!isAdmin) return { modules: [], error: true };
  
  const modules = await prisma.module.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });
  
  return { modules, error: false };
}

export async function createModule(
  data: { name: string; description?: string },
  token: string
) {
  const isAdmin = await verifyAdminToken(token);
  if (!isAdmin) return { error: true };
  
  const createdModule = await prisma.module.create({
    data: {
      name: data.name,
      description: data.description,
      isActive: true,
    },
  });
  
  return { module: createdModule, error: false };
}

export async function getUserModules(userId: number, token: string) {
  const isAdmin = await verifyAdminToken(token);
  if (!isAdmin) return { userModules: [], error: true };
  
  const userModules = await prisma.userModule.findMany({
    where: {
      userId,
      isActive: true,
    },
    include: {
      module: true,
    },
  });
  
  return { userModules, error: false };
}
