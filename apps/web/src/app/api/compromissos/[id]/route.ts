import { NextResponse } from 'next/server';
import { prisma } from '@bussola/db';
import { getCurrentWorkspace } from '@/lib/workspace';
import { compromissoSchema } from '@/lib/schemas/compromisso';

async function findOwned(id: string, workspaceId: string) {
  return prisma.compromissoFixo.findFirst({ where: { id, workspaceId } });
}

// PATCH /api/compromissos/[id] — edita o compromisso
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const workspace = await getCurrentWorkspace();
  if (!workspace) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const existing = await findOwned(params.id, workspace.id);
  if (!existing) {
    return NextResponse.json({ error: 'Compromisso não encontrado' }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const parsed = compromissoSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Dados inválidos', issues: parsed.error.flatten() },
      { status: 422 },
    );
  }

  if (parsed.data.frenteId) {
    const frente = await prisma.frente.findFirst({
      where: { id: parsed.data.frenteId, workspaceId: workspace.id },
      select: { id: true },
    });
    if (!frente) {
      return NextResponse.json({ error: 'Frente inválida' }, { status: 422 });
    }
  }

  const compromisso = await prisma.compromissoFixo.update({
    where: { id: params.id },
    data: parsed.data,
  });
  return NextResponse.json(compromisso);
}

// DELETE /api/compromissos/[id] — remove o compromisso
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const workspace = await getCurrentWorkspace();
  if (!workspace) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const existing = await findOwned(params.id, workspace.id);
  if (!existing) {
    return NextResponse.json({ error: 'Compromisso não encontrado' }, { status: 404 });
  }

  await prisma.compromissoFixo.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
