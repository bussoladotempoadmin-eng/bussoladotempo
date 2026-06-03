import { NextResponse } from 'next/server';
import { prisma } from '@bussola/db';
import { getCurrentWorkspace } from '@/lib/workspace';

// PATCH /api/blocos/[id]/realizado — registro rápido do que aconteceu no bloco.
// body: { resultado: 'SIM' | 'URGENTE' | 'DISPERSO' }
//  - SIM      → realizado = planejado (fez como planejou)
//  - URGENTE  → realizado = Urgente (algo urgente atropelou → invadido)
//  - DISPERSO → realizado = Disperso
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

  const atualizado = await prisma.bloco.update({
    where: { id: params.id },
    data: { categoriaRealizada, invadido },
  });
  return NextResponse.json(atualizado);
}
