import { NextResponse } from 'next/server';
import { prisma } from '@bussola/db';
import { getCurrentWorkspace } from '@/lib/workspace';
import { getOrCreateSemana, isIsoWeek } from '@/lib/semana';
import { suggestAgenda, type CompromissoInput } from '@bussola/domain';

// POST /api/agenda-padrao/aplicar — gera a agenda padrão e CRIA os blocos numa semana.
// body: { semanaIso: "2026-W24", substituir?: boolean }
export async function POST(req: Request) {
  const workspace = await getCurrentWorkspace();
  if (!workspace) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const semanaIso = body?.semanaIso;
  const substituir = Boolean(body?.substituir);
  if (!semanaIso || !isIsoWeek(semanaIso)) {
    return NextResponse.json({ error: 'Semana inválida' }, { status: 400 });
  }

  const [frentes, compromissos] = await Promise.all([
    prisma.frente.findMany({
      where: { workspaceId: workspace.id, ativa: true },
      orderBy: { ordem: 'asc' },
    }),
    prisma.compromissoFixo.findMany({ where: { workspaceId: workspace.id } }),
  ]);

  if (frentes.length === 0) {
    return NextResponse.json({ error: 'Crie ao menos uma frente primeiro' }, { status: 422 });
  }

  const { blocos } = suggestAgenda({
    frentes: frentes.map((f) => ({ id: f.id, orcamentoHoras: f.orcamentoHoras, ordem: f.ordem })),
    compromissosFixos: compromissos.map(
      (c): CompromissoInput => ({
        diaSemana: c.diaSemana,
        horaInicio: c.horaInicio,
        horaFim: c.horaFim,
        frenteId: c.frenteId,
        categoria: c.categoria,
      }),
    ),
    workspace: {
      horaAcordar: workspace.horaAcordar,
      horaDormir: workspace.horaDormir,
      horaAlmocoIni: workspace.horaAlmocoIni,
      horaAlmocoFim: workspace.horaAlmocoFim,
      semanaInicio: workspace.semanaInicio,
    },
  });

  const semana = await getOrCreateSemana(workspace.id, semanaIso);

  const existentes = await prisma.bloco.count({ where: { semanaPlanoId: semana.id } });
  if (existentes > 0 && !substituir) {
    // Avisa que já há blocos; o cliente pergunta antes de substituir.
    return NextResponse.json({ jaTemBlocos: true, total: existentes }, { status: 409 });
  }
  if (substituir) {
    await prisma.bloco.deleteMany({ where: { semanaPlanoId: semana.id } });
  }

  await prisma.bloco.createMany({
    data: blocos.map((b) => ({
      semanaPlanoId: semana.id,
      frenteId: b.frenteId,
      diaSemana: b.diaSemana,
      horaInicio: b.horaInicio,
      horaFim: b.horaFim,
      tarefa: b.tarefa,
      categoriaPlanejada: b.categoriaPlanejada,
      categoriaRealizada: b.categoriaPlanejada,
      fonteOrigem: 'AGENDA_PADRAO',
    })),
  });

  return NextResponse.json({ ok: true, count: blocos.length });
}
