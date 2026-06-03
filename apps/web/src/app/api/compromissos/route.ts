import { NextResponse } from 'next/server';
import { prisma } from '@bussola/db';
import { getCurrentWorkspace } from '@/lib/workspace';
import { compromissoSchema } from '@/lib/schemas/compromisso';

// GET /api/compromissos — lista compromissos do workspace, ordenados por dia e hora
export async function GET() {
  const workspace = await getCurrentWorkspace();
  if (!workspace) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const compromissos = await prisma.compromissoFixo.findMany({
    where: { workspaceId: workspace.id },
    orderBy: [{ diaSemana: 'asc' }, { horaInicio: 'asc' }],
  });
  return NextResponse.json(compromissos);
}

// POST /api/compromissos — cria um compromisso fixo
export async function POST(req: Request) {
  const workspace = await getCurrentWorkspace();
  if (!workspace) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = compromissoSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Dados inválidos', issues: parsed.error.flatten() },
      { status: 422 },
    );
  }

  // Se escolheu uma frente, ela precisa ser do próprio workspace.
  if (parsed.data.frenteId) {
    const frente = await prisma.frente.findFirst({
      where: { id: parsed.data.frenteId, workspaceId: workspace.id },
      select: { id: true },
    });
    if (!frente) {
      return NextResponse.json({ error: 'Frente inválida' }, { status: 422 });
    }
  }

  const compromisso = await prisma.compromissoFixo.create({
    data: { workspaceId: workspace.id, ...parsed.data },
  });
  return NextResponse.json(compromisso, { status: 201 });
}
