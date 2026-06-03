import { NextResponse } from 'next/server';
import { prisma } from '@bussola/db';
import { getCurrentWorkspace } from '@/lib/workspace';
import { getOrCreateSemana } from '@/lib/semana';
import { blocoCreateSchema } from '@/lib/schemas/bloco';

// GET /api/blocos?semana=2026-W24 — lista os blocos da semana
export async function GET(req: Request) {
  const workspace = await getCurrentWorkspace();
  if (!workspace) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const semanaIso = new URL(req.url).searchParams.get('semana');
  if (!semanaIso) {
    return NextResponse.json({ error: 'Informe a semana' }, { status: 400 });
  }

  const semana = await prisma.semanaPlano.findUnique({
    where: { workspaceId_semanaIso: { workspaceId: workspace.id, semanaIso } },
  });
  if (!semana) return NextResponse.json([]);

  const blocos = await prisma.bloco.findMany({
    where: { semanaPlanoId: semana.id },
    orderBy: [{ diaSemana: 'asc' }, { horaInicio: 'asc' }],
  });
  return NextResponse.json(blocos);
}

// POST /api/blocos — cria um bloco na semana (cria a SemanaPlano se não existir)
export async function POST(req: Request) {
  const workspace = await getCurrentWorkspace();
  if (!workspace) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = blocoCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Dados inválidos', issues: parsed.error.flatten() },
      { status: 422 },
    );
  }

  // A frente precisa ser do próprio workspace.
  const frente = await prisma.frente.findFirst({
    where: { id: parsed.data.frenteId, workspaceId: workspace.id },
    select: { id: true },
  });
  if (!frente) {
    return NextResponse.json({ error: 'Frente inválida' }, { status: 422 });
  }

  const { semanaIso, categoriaRealizada, categoriaPlanejada, ...resto } = parsed.data;
  const semana = await getOrCreateSemana(workspace.id, semanaIso);

  const bloco = await prisma.bloco.create({
    data: {
      semanaPlanoId: semana.id,
      categoriaPlanejada,
      // se não informar a realizada, começa igual à planejada
      categoriaRealizada: categoriaRealizada ?? categoriaPlanejada,
      ...resto,
    },
  });
  return NextResponse.json(bloco, { status: 201 });
}
