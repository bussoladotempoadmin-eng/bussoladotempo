import { NextResponse } from 'next/server';
import { prisma } from '@bussola/db';
import { getSessionUser } from '@/lib/workspace';

// DELETE /api/conta — apaga a conta e TODOS os dados do usuário (LGPD).
export async function DELETE() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const workspaces = await prisma.workspace.findMany({
    where: { userId: user.id },
    select: { id: true },
  });
  const wsIds = workspaces.map((w) => w.id);
  const semanas = await prisma.semanaPlano.findMany({
    where: { workspaceId: { in: wsIds } },
    select: { id: true },
  });
  const semanaIds = semanas.map((s) => s.id);

  // Apaga na ordem (filhos primeiro) — Bloco → Frente é Restrict.
  await prisma.$transaction([
    prisma.insight.deleteMany({ where: { semanaPlanoId: { in: semanaIds } } }),
    prisma.revisao.deleteMany({ where: { semanaPlanoId: { in: semanaIds } } }),
    prisma.bloco.deleteMany({ where: { semanaPlanoId: { in: semanaIds } } }),
    prisma.semanaPlano.deleteMany({ where: { workspaceId: { in: wsIds } } }),
    prisma.compromissoFixo.deleteMany({ where: { workspaceId: { in: wsIds } } }),
    prisma.fechamentoDia.deleteMany({ where: { workspaceId: { in: wsIds } } }),
    prisma.frente.deleteMany({ where: { workspaceId: { in: wsIds } } }),
    prisma.workspace.deleteMany({ where: { id: { in: wsIds } } }),
    prisma.user.delete({ where: { id: user.id } }), // Account/Session caem cascata
  ]);

  return NextResponse.json({ ok: true });
}
