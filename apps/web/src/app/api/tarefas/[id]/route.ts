import { NextResponse } from 'next/server';
import { prisma } from '@bussola/db';
import { getCurrentWorkspace } from '@/lib/workspace';

async function findOwned(id: string, workspaceId: string) {
  return prisma.subTarefa.findFirst({
    where: { id, bloco: { semanaPlano: { workspaceId } } },
    select: { id: true },
  });
}

// PATCH /api/tarefas/[id] — marca/desmarca feito ou edita o texto
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const workspace = await getCurrentWorkspace();
  if (!workspace) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const existing = await findOwned(params.id, workspace.id);
  if (!existing) return NextResponse.json({ error: 'Tarefa não encontrada' }, { status: 404 });

  const body = await req.json().catch(() => null);
  const data: { feito?: boolean; texto?: string } = {};
  if (typeof body?.feito === 'boolean') data.feito = body.feito;
  if (typeof body?.texto === 'string') {
    const t = body.texto.trim();
    if (!t || t.length > 500) {
      return NextResponse.json({ error: 'Texto inválido' }, { status: 422 });
    }
    data.texto = t;
  }

  const tarefa = await prisma.subTarefa.update({ where: { id: params.id }, data });
  return NextResponse.json(tarefa);
}

// DELETE /api/tarefas/[id]
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const workspace = await getCurrentWorkspace();
  if (!workspace) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const existing = await findOwned(params.id, workspace.id);
  if (!existing) return NextResponse.json({ error: 'Tarefa não encontrada' }, { status: 404 });

  await prisma.subTarefa.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
