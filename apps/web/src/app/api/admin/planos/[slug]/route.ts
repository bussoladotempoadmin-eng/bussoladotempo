import { NextResponse } from 'next/server';
import { getSuperAdmin } from '@/lib/super-admin';
import { editarPlano } from '@/lib/admin-billing';

export const dynamic = 'force-dynamic';

// PATCH /api/admin/planos/:slug — edita preços e cota de IA do plano.
export async function PATCH(req: Request, { params }: { params: { slug: string } }) {
  const admin = await getSuperAdmin();
  if (!admin) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });

  const body = await req.json().catch(() => null);
  const r = await editarPlano(params.slug, {
    precoMensal: body?.precoMensal != null ? Number(body.precoMensal) : undefined,
    precoAnual: body?.precoAnual != null ? Number(body.precoAnual) : undefined,
    precoPorAssento: body?.precoPorAssento != null ? Number(body.precoPorAssento) : undefined,
    geracoesIaMes: body?.geracoesIaMes != null ? Number(body.geracoesIaMes) : undefined,
  });
  if (!r.ok) return NextResponse.json({ error: r.erro }, { status: 422 });
  return NextResponse.json({ ok: true });
}
