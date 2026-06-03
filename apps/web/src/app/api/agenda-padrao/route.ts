import { NextResponse } from 'next/server';
import { prisma } from '@bussola/db';
import { getCurrentWorkspace } from '@/lib/workspace';
import { suggestAgenda, type CompromissoInput } from '@bussola/domain';

/**
 * POST /api/agenda-padrao — gera (preview, sem persistir) a agenda padrão
 * a partir das frentes ativas + compromissos fixos + janelas do workspace.
 *
 * A persistência dos blocos numa SemanaPlano vem na Etapa 7 (CRUD de Blocos).
 */
export async function POST() {
  const workspace = await getCurrentWorkspace();
  if (!workspace) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const [frentes, compromissos] = await Promise.all([
    prisma.frente.findMany({
      where: { workspaceId: workspace.id, ativa: true },
      orderBy: { ordem: 'asc' },
    }),
    prisma.compromissoFixo.findMany({ where: { workspaceId: workspace.id } }),
  ]);

  const suggestion = suggestAgenda({
    frentes: frentes.map((f) => ({
      id: f.id,
      orcamentoHoras: f.orcamentoHoras,
      ordem: f.ordem,
    })),
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

  return NextResponse.json({
    ...suggestion,
    frentes: frentes.map((f) => ({
      id: f.id,
      nome: f.nome,
      icone: f.icone,
      cor: f.cor,
    })),
    compromissos: compromissos.map((c) => ({
      diaSemana: c.diaSemana,
      horaInicio: c.horaInicio,
      horaFim: c.horaFim,
      descricao: c.descricao,
    })),
  });
}
