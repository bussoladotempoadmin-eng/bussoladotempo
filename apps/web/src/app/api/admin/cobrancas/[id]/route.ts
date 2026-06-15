import { NextResponse } from 'next/server';
import { getSuperAdmin } from '@/lib/super-admin';
import { marcarCobranca } from '@/lib/admin-billing';

export const dynamic = 'force-dynamic';

// PATCH /api/admin/cobrancas/:id  body: { status: 'PAGA' | 'CANCELADA' }
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const admin = await getSuperAdmin();
  if (!admin) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });

  const body = await req.json().catch(() => null);
  const status = body?.status;
  if (status !== 'PAGA' && status !== 'CANCELADA') {
    return NextResponse.json({ error: 'Status inválido' }, { status: 422 });
  }
  const r = await marcarCobranca(params.id, status);
  if (!r.ok) return NextResponse.json({ error: r.erro }, { status: 422 });
  return NextResponse.json({ ok: true });
}
