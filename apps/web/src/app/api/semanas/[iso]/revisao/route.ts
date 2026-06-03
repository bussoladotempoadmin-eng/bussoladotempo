import { NextResponse } from 'next/server';
import { prisma } from '@bussola/db';
import { getCurrentWorkspace } from '@/lib/workspace';
import { getOrCreateSemana, isIsoWeek, shiftIsoWeek } from '@/lib/semana';
import { revisaoSchema } from '@/lib/schemas/revisao';

// GET /api/semanas/[iso]/revisao — revisão existente + preparo da próxima semana
export async function GET(_req: Request, { params }: { params: { iso: string } }) {
  const workspace = await getCurrentWorkspace();
  if (!workspace) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const iso = decodeURIComponent(params.iso);
  if (!isIsoWeek(iso)) return NextResponse.json({ error: 'Semana inválida' }, { status: 400 });

  const semana = await prisma.semanaPlano.findUnique({
    where: { workspaceId_semanaIso: { workspaceId: workspace.id, semanaIso: iso } },
    include: { revisao: true },
  });
  const proxima = await prisma.semanaPlano.findUnique({
    where: {
      workspaceId_semanaIso: { workspaceId: workspace.id, semanaIso: shiftIsoWeek(iso, 1) },
    },
  });

  return NextResponse.json({
    revisao: semana?.revisao ?? null,
    proxima: proxima
      ? {
          riscoSemana: proxima.riscoSemana,
          prioridades: [proxima.prioridade1, proxima.prioridade2, proxima.prioridade3].filter(
            Boolean,
          ),
        }
      : null,
  });
}

// PUT /api/semanas/[iso]/revisao — salva a revisão + prepara a próxima semana
export async function PUT(req: Request, { params }: { params: { iso: string } }) {
  const workspace = await getCurrentWorkspace();
  if (!workspace) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const iso = decodeURIComponent(params.iso);
  if (!isIsoWeek(iso)) return NextResponse.json({ error: 'Semana inválida' }, { status: 400 });

  const body = await req.json().catch(() => null);
  const parsed = revisaoSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Dados inválidos', issues: parsed.error.flatten() },
      { status: 422 },
    );
  }
  const d = parsed.data;

  const semana = await getOrCreateSemana(workspace.id, iso);

  // upsert da revisão da semana revisada
  const revisao = await prisma.revisao.upsert({
    where: { semanaPlanoId: semana.id },
    create: {
      semanaPlanoId: semana.id,
      retroFuncionou: d.retroFuncionou || null,
      retroNaoFuncionou: d.retroNaoFuncionou || null,
      retroMudanca: d.retroMudanca || null,
      sensacaoMedia: d.sensacaoMedia ?? null,
      fechadaEm: d.fechar ? new Date() : null,
    },
    update: {
      retroFuncionou: d.retroFuncionou || null,
      retroNaoFuncionou: d.retroNaoFuncionou || null,
      retroMudanca: d.retroMudanca || null,
      sensacaoMedia: d.sensacaoMedia ?? null,
      fechadaEm: d.fechar ? new Date() : null,
    },
  });

  if (d.fechar) {
    await prisma.semanaPlano.update({
      where: { id: semana.id },
      data: { status: 'FECHADA' },
    });
  }

  // prepara a próxima semana: risco + 3 prioridades (texto livre)
  const proxima = await getOrCreateSemana(workspace.id, shiftIsoWeek(iso, 1));
  await prisma.semanaPlano.update({
    where: { id: proxima.id },
    data: {
      riscoSemana: d.riscoProxima || null,
      prioridade1: d.prioridadesProxima[0] || null,
      prioridade2: d.prioridadesProxima[1] || null,
      prioridade3: d.prioridadesProxima[2] || null,
    },
  });

  return NextResponse.json({ ok: true, revisao });
}
