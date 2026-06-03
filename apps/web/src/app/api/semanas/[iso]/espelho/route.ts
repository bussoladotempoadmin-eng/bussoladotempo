import { NextResponse } from 'next/server';
import { prisma } from '@bussola/db';
import { getCurrentWorkspace } from '@/lib/workspace';
import { isIsoWeek } from '@/lib/semana';
import { calcEspelho, type BlocoEspelho } from '@bussola/domain';

// GET /api/semanas/[iso]/espelho — matriz Frente × Categoria + totais + desvios
export async function GET(_req: Request, { params }: { params: { iso: string } }) {
  const workspace = await getCurrentWorkspace();
  if (!workspace) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const iso = decodeURIComponent(params.iso);
  if (!isIsoWeek(iso)) {
    return NextResponse.json({ error: 'Semana inválida' }, { status: 400 });
  }

  const [semana, frentes] = await Promise.all([
    prisma.semanaPlano.findUnique({
      where: { workspaceId_semanaIso: { workspaceId: workspace.id, semanaIso: iso } },
    }),
    prisma.frente.findMany({
      where: { workspaceId: workspace.id },
      orderBy: { ordem: 'asc' },
    }),
  ]);

  const blocos = semana
    ? await prisma.bloco.findMany({ where: { semanaPlanoId: semana.id } })
    : [];

  const espelho = calcEspelho(
    blocos.map(
      (b): BlocoEspelho => ({
        frenteId: b.frenteId,
        horaInicio: b.horaInicio,
        horaFim: b.horaFim,
        categoriaPlanejada: b.categoriaPlanejada,
        categoriaRealizada: b.categoriaRealizada,
        tarefa: b.tarefa,
        diaSemana: b.diaSemana,
      }),
    ),
    frentes.map((f) => ({ id: f.id })),
  );

  return NextResponse.json({
    ...espelho,
    frentes: frentes.map((f) => ({ id: f.id, nome: f.nome, icone: f.icone, cor: f.cor })),
  });
}
