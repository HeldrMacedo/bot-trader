import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

function extractUserId(request: Request): number | null {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: number };
    return decoded.userId;
  } catch {
    return null;
  }
}

export async function GET() {
  try {
    const rules = await prisma.sharedRule.findMany({
      orderBy: [{ usageCount: 'desc' }, { createdAt: 'desc' }],
      include: { user: { select: { name: true } } },
    });
    return NextResponse.json(rules);
  } catch (error) {
    console.error('Erro ao listar regras compartilhadas:', error);
    return NextResponse.json({ message: 'Erro ao carregar estratégias' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const userId = extractUserId(request);
  if (!userId) {
    return NextResponse.json({ message: 'Token de autenticação não fornecido' }, { status: 401 });
  }

  try {
    const { title, ruleText, isAdvanced } = await request.json();

    if (!title?.trim() || !ruleText?.trim()) {
      return NextResponse.json({ message: 'Título e regra são obrigatórios' }, { status: 400 });
    }
    if (title.trim().length > 200) {
      return NextResponse.json({ message: 'Título muito longo (máx. 200 caracteres)' }, { status: 400 });
    }

    const rule = await prisma.sharedRule.create({
      data: {
        title: title.trim(),
        ruleText: ruleText.trim(),
        isAdvanced: !!isAdvanced,
        userId,
      },
      include: { user: { select: { name: true } } },
    });

    return NextResponse.json(rule, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar regra compartilhada:', error);
    return NextResponse.json({ message: 'Erro ao compartilhar estratégia' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { id } = await request.json();
    if (!id || typeof id !== 'number') {
      return NextResponse.json({ message: 'ID inválido' }, { status: 400 });
    }

    await prisma.sharedRule.update({
      where: { id },
      data: { usageCount: { increment: 1 } },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Erro ao incrementar uso:', error);
    return NextResponse.json({ message: 'Erro ao registrar uso' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const userId = extractUserId(request);
  if (!userId) {
    return NextResponse.json({ message: 'Não autorizado' }, { status: 401 });
  }

  try {
    const { id } = await request.json();
    if (!id || typeof id !== 'number') {
      return NextResponse.json({ message: 'ID inválido' }, { status: 400 });
    }

    const rule = await prisma.sharedRule.findUnique({ where: { id } });
    if (!rule) {
      return NextResponse.json({ message: 'Estratégia não encontrada' }, { status: 404 });
    }
    if (rule.userId !== userId) {
      return NextResponse.json({ message: 'Sem permissão para excluir esta estratégia' }, { status: 403 });
    }

    await prisma.sharedRule.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Erro ao excluir regra compartilhada:', error);
    return NextResponse.json({ message: 'Erro ao excluir estratégia' }, { status: 500 });
  }
}
