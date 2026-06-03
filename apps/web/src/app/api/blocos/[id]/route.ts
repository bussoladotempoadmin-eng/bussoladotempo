import { NextResponse } from 'next/server';
import { prisma } from '@bussola/db';
import { getCurrentWorkspace } from '@/lib/workspace';
import { blocoUpdateSchema } from '@/lib/schemas/bloco';

// Busca o bloco garantindo que ele pertence ao workspace do usuário (via SemanaPlano).
async function findOwnedBloco(id: string, workspaceId: string) {
  return prisma.bloco.findFirst({
    where: { id, semanaPlano: { workspaceId } },
  });
}

// PATCH /api/blocos/[id] — edita o bloco
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const workspace = await getCurrentWorkspace();
  if (!workspace) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const existing = await findOwnedBloco(params.id, workspace.id);
  if (!existing) {
    return NextResponse.json({ error: 'Bloco não encontrado' }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const parsed = blocoUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Dados inválidos', issues: parsed.error.flatten() },
      { status: 422 },
    );
  }

  const frente = await prisma.frente.findFirst({
    where: { id: parsed.data.frenteId, workspaceId: workspace.id },
    select: { id: true },
  });
  if (!frente) {
    return NextResponse.json({ error: 'Frente inválida' }, { status: 422 });
  }

  const { categoriaRealizada, categoriaPlanejada, ...resto } = parsed.data;
  const bloco = await prisma.bloco.update({
    where: { id: params.id },
    data: {
      categoriaPlanejada,
      categoriaRealizada: categoriaRealizada ?? categoriaPlanejada,
      ...resto,
    },
  });
  return NextResponse.json(bloco);
}

// DELETE /api/blocos/[id] — remove o bloco
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const workspace = await getCurrentWorkspace();
  if (!workspace) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const existing = await findOwnedBloco(params.id, workspace.id);
  if (!existing) {
    return NextResponse.json({ error: 'Bloco não encontrado' }, { status: 404 });
  }

  await prisma.bloco.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
