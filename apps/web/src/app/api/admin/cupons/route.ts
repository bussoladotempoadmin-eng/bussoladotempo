import { NextResponse } from 'next/server';
import { getSuperAdmin } from '@/lib/super-admin';
import { criarCupom } from '@/lib/cupons';
import type { TipoDesconto, DuracaoCupom } from '@bussola/db';

export const dynamic = 'force-dynamic';

// POST /api/admin/cupons — cria um cupom.
export async function POST(req: Request) {
  const admin = await getSuperAdmin();
  if (!admin) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });

  const body = await req.json().catch(() => null);
  const r = await criarCupom({
    code: typeof body?.code === 'string' ? body.code : '',
    descontoTipo: (body?.descontoTipo as TipoDesconto) || 'PERCENTUAL',
    descontoValor: Number(body?.descontoValor) || 0,
    duracaoTipo: (body?.duracaoTipo as DuracaoCupom) || 'PRIMEIRO',
    maxUsos: body?.maxUsos != null ? Number(body.maxUsos) : null,
    validoAte: body?.validoAte ? new Date(`${body.validoAte}T23:59:59`) : null,
  });
  if (!r.ok) return NextResponse.json({ error: r.erro }, { status: 422 });
  return NextResponse.json({ ok: true, id: r.id });
}
