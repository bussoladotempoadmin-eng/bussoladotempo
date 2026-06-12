import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@bussola/db';
import { getCurrentWorkspace } from '@/lib/workspace';
import { getOrCreateSemana, isIsoWeek } from '@/lib/semana';
import { diaSemanaValues, categoriaValues } from '@/lib/schemas/compromisso';

const blocoSchema = z.object({
  diaSemana: z.enum(diaSemanaValues),
  horaInicio: z.string().regex(/^\d{2}:\d{2}$/),
  horaFim: z.string().regex(/^\d{2}:\d{2}$/),
  tarefa: z.string().min(1),
  frenteId: z.string().min(1),
  categoriaPlanejada: z.enum(categoriaValues),
});

const bodySchema = z.object({
  // Uma ou mais semanas-alvo (a primeira é a "principal"; as demais repetem o padrão).
  isos: z.array(z.string().refine(isIsoWeek, 'Semana inválida')).min(1),
  substituir: z.boolean().optional(),
  blocos: z.array(blocoSchema).min(1),
});

// POST /api/agenda-ia/aplicar — salva a proposta (revisada) em 1+ semanas.
// Por padrão NÃO destrói: semana que já tem blocos é pulada (a não ser substituir=true).
export async function POST(req: Request) {
  const workspace = await getCurrentWorkspace();
  if (!workspace) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 });
  }
  const { isos, substituir, blocos } = parsed.data;

  // Todas as frentes precisam ser do próprio workspace.
  const frentes = await prisma.frente.findMany({
    where: { workspaceId: workspace.id },
    select: { id: true },
  });
  const idSet = new Set(frentes.map((f) => f.id));
  if (!blocos.every((b) => idSet.has(b.frenteId))) {
    return NextResponse.json({ error: 'Frente inválida na proposta' }, { status: 422 });
  }

  const dadosBase = blocos.map((b) => ({
    frenteId: b.frenteId,
    diaSemana: b.diaSemana,
    horaInicio: b.horaInicio,
    horaFim: b.horaFim,
    tarefa: b.tarefa,
    categoriaPlanejada: b.categoriaPlanejada,
    categoriaRealizada: b.categoriaPlanejada,
    fonteOrigem: 'AGENDA_PADRAO' as const,
  }));

  const criadas: string[] = [];
  const puladas: string[] = [];

  for (const iso of isos) {
    const semana = await getOrCreateSemana(workspace.id, iso);
    const existentes = await prisma.bloco.count({ where: { semanaPlanoId: semana.id } });
    if (existentes > 0 && !substituir) {
      puladas.push(iso);
      continue;
    }
    if (substituir) {
      await prisma.bloco.deleteMany({ where: { semanaPlanoId: semana.id } });
    }
    await prisma.bloco.createMany({
      data: dadosBase.map((d) => ({ ...d, semanaPlanoId: semana.id })),
    });
    criadas.push(iso);
  }

  return NextResponse.json({ ok: true, criadas, puladas, count: criadas.length });
}
