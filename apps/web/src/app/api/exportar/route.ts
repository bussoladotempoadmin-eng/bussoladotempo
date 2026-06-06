import { NextResponse } from 'next/server';
import { prisma } from '@bussola/db';
import { getSessionUser } from '@/lib/workspace';

// GET /api/exportar — baixa todos os dados do usuário em JSON (LGPD).
export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const workspaces = await prisma.workspace.findMany({
    where: { userId: user.id },
    include: {
      frentes: true,
      compromissos: true,
      fechamentos: true,
      semanas: { include: { blocos: true, revisao: true, insights: true } },
    },
  });

  const payload = {
    exportadoEm: new Date().toISOString(),
    usuario: { id: user.id, nome: user.name ?? null, email: user.email ?? null },
    workspaces,
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': 'attachment; filename="bussola-do-tempo-meus-dados.json"',
    },
  });
}
