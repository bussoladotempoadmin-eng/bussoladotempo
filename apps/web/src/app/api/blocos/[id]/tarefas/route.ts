import { NextResponse } from 'next/server';
import { prisma } from '@bussola/db';
import { getCurrentWorkspace } from '@/lib/workspace';

// GET /api/blocos/[id]/tarefas — lista as subtarefas do bloco
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const workspace = await getCurrentWorkspace();
  if (!workspace) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const bloco = await prisma.bloco.findFirst({
    where: { id: params.id, semanaPlano: { workspaceId: workspace.id } },
    select: { id: true },
  });
  if (!bloco) return NextResponse.json({ error: 'Bloco não encontrado' }, { status: 404 });

  const tarefas = await prisma.subTarefa.findMany({
    where: { blocoId: bloco.id },
    orderBy: { ordem: 'asc' },
  });
  return NextResponse.json(tarefas);
}

// POST /api/blocos/[id]/tarefas — cria uma subtarefa
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const workspace = await getCurrentWorkspace();
  if (!workspace) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const bloco = await prisma.bloco.findFirst({
    where: { id: params.id, semanaPlano: { workspaceId: workspace.id } },
    select: { id: true },
  });
  if (!bloco) return NextResponse.json({ error: 'Bloco não encontrado' }, { status: 404 });

  const body = await req.json().catch(() => null);
  const texto = String(body?.texto ?? '').trim();
  if (!texto || texto.length > 500) {
    return NextResponse.json({ error: 'Texto inválido' }, { status: 422 });
  }

  const ordem = await prisma.subTarefa.count({ where: { blocoId: bloco.id } });
  const tarefa = await prisma.subTarefa.create({
    data: { blocoId: bloco.id, texto, ordem },
  });
  return NextResponse.json(tarefa, { status: 201 });
}
