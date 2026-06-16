import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/workspace';
import { salvarAcessoComercial, removerAcessoComercial } from '@/lib/comercial';

export const dynamic = 'force-dynamic';

// POST /api/comercial/acessos — cria/atualiza um acesso ao Comercial.
// body: { orgId, email, nivel, todasUnidades, unidadeIds, admin, rotulo }
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  const body = await req.json().catch(() => null);
  const orgId = typeof body?.orgId === 'string' ? body.orgId : '';
  const email = typeof body?.email === 'string' ? body.email : '';
  if (!orgId || !email) return NextResponse.json({ error: 'Informe org e e-mail.' }, { status: 422 });

  const r = await salvarAcessoComercial(user.id, orgId, {
    email,
    nivel: body?.nivel === 'VER' ? 'VER' : 'EDITAR',
    todasUnidades: Boolean(body?.todasUnidades),
    unidadeIds: Array.isArray(body?.unidadeIds) ? body.unidadeIds.filter((x: unknown) => typeof x === 'string') : [],
    admin: Boolean(body?.admin),
    rotulo: typeof body?.rotulo === 'string' ? body.rotulo : undefined,
  });
  if (!r.ok) return NextResponse.json({ error: r.erro }, { status: 422 });
  return NextResponse.json({ ok: true });
}

// DELETE /api/comercial/acessos  body: { orgId, acessoId }
export async function DELETE(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  const body = await req.json().catch(() => null);
  const orgId = typeof body?.orgId === 'string' ? body.orgId : '';
  const acessoId = typeof body?.acessoId === 'string' ? body.acessoId : '';
  const ok = await removerAcessoComercial(user.id, orgId, acessoId);
  if (!ok) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
