import { NextResponse } from 'next/server';
import { prisma } from '@bussola/db';
import { getCurrentWorkspace } from '@/lib/workspace';
import { workspaceSchema } from '@/lib/schemas/workspace';

// GET /api/workspace — config atual
export async function GET() {
  const workspace = await getCurrentWorkspace();
  if (!workspace) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }
  return NextResponse.json(workspace);
}

// PATCH /api/workspace — atualiza as configurações
export async function PATCH(req: Request) {
  const workspace = await getCurrentWorkspace();
  if (!workspace) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = workspaceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Dados inválidos', issues: parsed.error.flatten() },
      { status: 422 },
    );
  }

  const atualizado = await prisma.workspace.update({
    where: { id: workspace.id },
    data: parsed.data,
  });
  return NextResponse.json(atualizado);
}
