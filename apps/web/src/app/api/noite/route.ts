import { NextResponse } from 'next/server';
import { prisma } from '@bussola/db';
import { getCurrentWorkspace } from '@/lib/workspace';
import { noiteSchema } from '@/lib/schemas/noite';

// GET /api/noite?data=YYYY-MM-DD — fechamento existente do dia
export async function GET(req: Request) {
  const workspace = await getCurrentWorkspace();
  if (!workspace) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const data = new URL(req.url).searchParams.get('data') ?? '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) {
    return NextResponse.json({ error: 'Data inválida' }, { status: 400 });
  }

  const fechamento = await prisma.fechamentoDia.findUnique({
    where: { workspaceId_data: { workspaceId: workspace.id, data } },
  });
  return NextResponse.json({ fechamento });
}

// PUT /api/noite — salva (upsert) o fechamento do dia
export async function PUT(req: Request) {
  const workspace = await getCurrentWorkspace();
  if (!workspace) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = noiteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Dados inválidos', issues: parsed.error.flatten() },
      { status: 422 },
    );
  }
  const d = parsed.data;

  const fechamento = await prisma.fechamentoDia.upsert({
    where: { workspaceId_data: { workspaceId: workspace.id, data: d.data } },
    create: {
      workspaceId: workspace.id,
      data: d.data,
      destaque: d.destaque || null,
      aprendizado: d.aprendizado || null,
      nota: d.nota ?? null,
    },
    update: {
      destaque: d.destaque || null,
      aprendizado: d.aprendizado || null,
      nota: d.nota ?? null,
    },
  });
  return NextResponse.json({ ok: true, fechamento });
}
