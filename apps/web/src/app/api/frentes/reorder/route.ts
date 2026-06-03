import { NextResponse } from 'next/server';
import { prisma } from '@bussola/db';
import { getCurrentWorkspace } from '@/lib/workspace';
import { frentesReorderSchema } from '@/lib/schemas/frente';

// PATCH /api/frentes/reorder — recebe a lista de ids na nova ordem e persiste o campo `ordem`
export async function PATCH(req: Request) {
  const workspace = await getCurrentWorkspace();
  if (!workspace) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = frentesReorderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Dados inválidos' }, { status: 422 });
  }

  const ids = parsed.data.ordem;
  const frentes = await prisma.frente.findMany({
    where: { workspaceId: workspace.id },
    select: { id: true },
  });
  const ownedIds = new Set(frentes.map((f) => f.id));

  // A lista precisa conter exatamente as frentes do workspace — nem a mais, nem a menos.
  const todasPertencem = ids.every((id) => ownedIds.has(id));
  if (!todasPertencem || ids.length !== frentes.length) {
    return NextResponse.json({ error: 'Lista de ordem inválida' }, { status: 422 });
  }

  await prisma.$transaction(
    ids.map((id, index) =>
      prisma.frente.update({ where: { id }, data: { ordem: index } }),
    ),
  );
  return NextResponse.json({ ok: true });
}
