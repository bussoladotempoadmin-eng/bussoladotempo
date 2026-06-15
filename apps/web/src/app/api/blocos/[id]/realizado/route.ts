import { NextResponse } from 'next/server';
import { prisma } from '@bussola/db';
import { getCurrentWorkspace } from '@/lib/workspace';

// PATCH /api/blocos/[id]/realizado — concluir o bloco (ou reabrir).
// body p/ concluir: { resultado: 'SIM'|'URGENTE'|'DISPERSO', concluidoEm?: ISO }
//  - SIM      → realizado = planejado (saiu como planejou)
//  - URGENTE  → realizado = Urgente (algo urgente atropelou → invadido)
//  - DISPERSO → realizado = Disperso
// body p/ reabrir: { reabrir: true }  → volta pra não-concluído.
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const workspace = await getCurrentWorkspace();
  if (!workspace) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const bloco = await prisma.bloco.findFirst({
    where: { id: params.id, semanaPlano: { workspaceId: workspace.id } },
  });
  if (!bloco) {
    return NextResponse.json({ error: 'Bloco não encontrado' }, { status: 404 });
  }

  const body = await req.json().catch(() => null);

  // Reabrir: desfaz a conclusão (mantém a categoria realizada como histórico).
  if (body?.reabrir) {
    const reaberto = await prisma.bloco.update({
      where: { id: params.id },
      data: { concluido: false, concluidoEm: null },
    });
    return NextResponse.json(reaberto);
  }

  const resultado = body?.resultado;
  let categoriaRealizada: 'IMPORTANTE' | 'URGENTE' | 'DISPERSO';
  let invadido = false;
  if (resultado === 'SIM') {
    categoriaRealizada = bloco.categoriaPlanejada;
  } else if (resultado === 'URGENTE') {
    categoriaRealizada = 'URGENTE';
    invadido = bloco.categoriaPlanejada !== 'URGENTE';
  } else if (resultado === 'DISPERSO') {
    categoriaRealizada = 'DISPERSO';
  } else {
    return NextResponse.json({ error: 'Resultado inválido' }, { status: 422 });
  }

  // Data/hora da conclusão: a informada (se válida) ou agora.
  let concluidoEm = new Date();
  if (typeof body?.concluidoEm === 'string') {
    const d = new Date(body.concluidoEm);
    if (!Number.isNaN(d.getTime())) concluidoEm = d;
  }

  // Horário REAL do bloco (Caso 2). Guarda só quando difere do planejado;
  // igual ao planejado (ou vazio) = executou no horário → null.
  const hhmm = /^([01]\d|2[0-3]):[0-5]\d$/;
  const limpaReal = (v: unknown, planejado: string): string | null => {
    if (typeof v !== 'string' || !hhmm.test(v)) return null;
    return v === planejado ? null : v;
  };
  const horaRealInicio = limpaReal(body?.horaRealInicio, bloco.horaInicio);
  const horaRealFim = limpaReal(body?.horaRealFim, bloco.horaFim);

  const atualizado = await prisma.bloco.update({
    where: { id: params.id },
    data: { categoriaRealizada, invadido, concluido: true, concluidoEm, horaRealInicio, horaRealFim },
  });
  return NextResponse.json(atualizado);
}
