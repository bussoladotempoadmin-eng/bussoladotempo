import { NextResponse } from 'next/server';
import { prisma } from '@bussola/db';
import { getCurrentWorkspace } from '@/lib/workspace';
import { isoWeek } from '@/lib/iso-week';

/**
 * GET /api/blocos/range?from=YYYY-MM-DD&to=YYYY-MM-DD
 * Devolve os blocos de todas as semanas ISO que tocam o intervalo [from, to].
 * Cada bloco vem com o `semanaIso` pra que o cliente calcule a data absoluta
 * (segunda da semana + dia) e saiba pra onde navegar. Usado na visão de Mês.
 */
export async function GET(req: Request) {
  const workspace = await getCurrentWorkspace();
  if (!workspace) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const sp = new URL(req.url).searchParams;
  const from = sp.get('from');
  const to = sp.get('to');
  if (!from || !to || !/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
    return NextResponse.json({ error: 'Informe from e to (YYYY-MM-DD)' }, { status: 400 });
  }

  // Coleta todas as semanas ISO que aparecem no intervalo. Meio-dia UTC evita
  // erro de fuso na borda da semana; uma semana extra de sobra e inofensiva.
  const weeks = new Set<string>();
  const start = new Date(`${from}T12:00:00Z`);
  const end = new Date(`${to}T12:00:00Z`);
  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    weeks.add(isoWeek(d));
  }

  const semanas = await prisma.semanaPlano.findMany({
    where: { workspaceId: workspace.id, semanaIso: { in: Array.from(weeks) } },
    select: {
      semanaIso: true,
      blocos: {
        select: {
          id: true,
          diaSemana: true,
          horaInicio: true,
          horaFim: true,
          tarefa: true,
          frenteId: true,
          categoriaPlanejada: true,
          categoriaRealizada: true,
        },
      },
    },
  });

  const blocos = semanas.flatMap((s) =>
    s.blocos.map((b) => ({ ...b, semanaIso: s.semanaIso })),
  );
  return NextResponse.json(blocos);
}
