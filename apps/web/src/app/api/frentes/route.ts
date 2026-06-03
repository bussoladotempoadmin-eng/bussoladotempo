import { NextResponse } from 'next/server';
import { prisma } from '@bussola/db';
import { getCurrentWorkspace } from '@/lib/workspace';
import { frenteCreateSchema } from '@/lib/schemas/frente';

// GET /api/frentes — lista as frentes do workspace, em ordem
export async function GET() {
  const workspace = await getCurrentWorkspace();
  if (!workspace) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const frentes = await prisma.frente.findMany({
    where: { workspaceId: workspace.id },
    orderBy: { ordem: 'asc' },
  });
  return NextResponse.json(frentes);
}

// POST /api/frentes — cria uma frente nova (vai pro fim da lista)
export async function POST(req: Request) {
  const workspace = await getCurrentWorkspace();
  if (!workspace) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = frenteCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Dados inválidos', issues: parsed.error.flatten() },
      { status: 422 },
    );
  }

  const ordem = await prisma.frente.count({ where: { workspaceId: workspace.id } });
  const frente = await prisma.frente.create({
    data: { workspaceId: workspace.id, ordem, ...parsed.data },
  });
  return NextResponse.json(frente, { status: 201 });
}
