import { NextResponse } from 'next/server';
import { getSuperAdmin } from '@/lib/super-admin';
import { editarParceiro } from '@/lib/comissoes';

export const dynamic = 'force-dynamic';

// PATCH /api/admin/parceiros/:id — edita dados do parceiro.
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const admin = await getSuperAdmin();
  if (!admin) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });

  const body = await req.json().catch(() => null);
  const r = await editarParceiro(params.id, {
    nome: typeof body?.nome === 'string' ? body.nome : undefined,
    email: typeof body?.email === 'string' ? body.email : undefined,
    comissaoRate: body?.comissaoRate != null ? Number(body.comissaoRate) : undefined,
    pixChave: typeof body?.pixChave === 'string' ? body.pixChave : undefined,
    ativo: typeof body?.ativo === 'boolean' ? body.ativo : undefined,
  });
  if (!r.ok) return NextResponse.json({ error: r.erro }, { status: 422 });
  return NextResponse.json({ ok: true });
}
