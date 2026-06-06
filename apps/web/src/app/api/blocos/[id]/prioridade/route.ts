import { NextResponse } from 'next/server';
import { prisma } from '@bussola/db';
import { getCurrentWorkspace } from '@/lib/workspace';

// PATCH /api/blocos/[id]/prioridade — marca/desmarca o bloco como prioridade da semana.
// body: { marcar: boolean }. Ao marcar, recebe o menor slot livre (1, 2 ou 3).
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const workspace = await getCurrentWorkspace();
  if (!workspace) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const bloco = await prisma.bloco.findFirst({
    where: { id: params.id, semanaPlano: { workspaceId: workspace.id } },
    select: { id: true, semanaPlanoId: true, prioridadeSemana: true },
  });
  if (!bloco) {
    return NextResponse.json({ error: 'Bloco não encontrado' }, { status: 404 });
  }

  const marcar = Boolean((await req.json().catch(() => null))?.marcar);

  if (!marcar) {
    const atualizado = await prisma.bloco.update({
      where: { id: bloco.id },
      data: { prioridadeSemana: null },
    });
    return NextResponse.json(atualizado);
  }

  // Já é prioridade → mantém
  if (bloco.prioridadeSemana) {
    return NextResponse.json(bloco);
  }

  const usados = await prisma.bloco.findMany({
    where: { semanaPlanoId: bloco.semanaPlanoId, prioridadeSemana: { not: null } },
    select: { prioridadeSemana: true },
  });
  const ocupados = new Set(usados.map((b) => b.prioridadeSemana));
  const livre = [1, 2, 3].find((n) => !ocupados.has(n));
  if (!livre) {
    return NextResponse.json(
      { error: 'Você já tem 3 prioridades. Desmarque uma antes.' },
      { status: 409 },
    );
  }

  const atualizado = await prisma.bloco.update({
    where: { id: bloco.id },
    data: { prioridadeSemana: livre },
  });
  return NextResponse.json(atualizado);
}
