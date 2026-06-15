import { NextResponse } from 'next/server';
import { getSuperAdmin } from '@/lib/super-admin';
import { marcarComissoesPagas } from '@/lib/comissoes';

export const dynamic = 'force-dynamic';

// POST /api/admin/comissoes  body: { ids: string[] } — marca DISPONIVEL → PAGA.
export async function POST(req: Request) {
  const admin = await getSuperAdmin();
  if (!admin) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });

  const body = await req.json().catch(() => null);
  const ids = Array.isArray(body?.ids) ? body.ids.filter((x: unknown) => typeof x === 'string') : [];
  if (ids.length === 0) return NextResponse.json({ error: 'Nada para pagar' }, { status: 422 });

  const pagas = await marcarComissoesPagas(ids);
  return NextResponse.json({ ok: true, pagas });
}
