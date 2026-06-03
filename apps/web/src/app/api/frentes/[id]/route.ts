import { NextResponse } from 'next/server';
import { Prisma, prisma } from '@bussola/db';
import { getCurrentWorkspace } from '@/lib/workspace';
import { frenteUpdateSchema } from '@/lib/schemas/frente';

// Garante que a frente existe E pertence ao workspace do usuário logado.
async function findOwnedFrente(id: string, workspaceId: string) {
  return prisma.frente.findFirst({ where: { id, workspaceId } });
}

// PATCH /api/frentes/[id] — edita campos da frente
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const workspace = await getCurrentWorkspace();
  if (!workspace) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const existing = await findOwnedFrente(params.id, workspace.id);
  if (!existing) {
    return NextResponse.json({ error: 'Frente não encontrada' }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const parsed = frenteUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Dados inválidos', issues: parsed.error.flatten() },
      { status: 422 },
    );
  }

  const frente = await prisma.frente.update({
    where: { id: params.id },
    data: parsed.data,
  });
  return NextResponse.json(frente);
}

// DELETE /api/frentes/[id] — remove a frente
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const workspace = await getCurrentWorkspace();
  if (!workspace) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const existing = await findOwnedFrente(params.id, workspace.id);
  if (!existing) {
    return NextResponse.json({ error: 'Frente não encontrada' }, { status: 404 });
  }

  try {
    await prisma.frente.delete({ where: { id: params.id } });
  } catch (e) {
    // P2003 = violação de FK: existem blocos vinculados a essa frente
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2003') {
      return NextResponse.json(
        {
          error:
            'Essa frente tem blocos vinculados. Desative-a em vez de excluir pra não perder o histórico.',
        },
        { status: 409 },
      );
    }
    throw e;
  }
  return NextResponse.json({ ok: true });
}
