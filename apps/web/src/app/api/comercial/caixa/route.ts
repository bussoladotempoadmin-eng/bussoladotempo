import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/workspace';
import { lancarManual, removerLancamento } from '@/lib/comercial-caixa';
import type { TipoLancamento } from '@bussola/db';

export const dynamic = 'force-dynamic';

// POST /api/comercial/caixa  body: { unidadeId, tipo, valor, data, descricao }
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  const body = await req.json().catch(() => null);
  const unidadeId = typeof body?.unidadeId === 'string' ? body.unidadeId : '';
  if (!unidadeId) return NextResponse.json({ error: 'Informe a unidade' }, { status: 422 });

  const r = await lancarManual(user.id, unidadeId, {
    tipo: body?.tipo as TipoLancamento,
    valor: Number(body?.valor),
    data: typeof body?.data === 'string' ? body.data : '',
    descricao: typeof body?.descricao === 'string' ? body.descricao : '',
  });
  if (!r.ok) return NextResponse.json({ error: r.erro }, { status: 422 });
  return NextResponse.json({ ok: true });
}

// DELETE /api/comercial/caixa  body: { id }
export async function DELETE(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  const body = await req.json().catch(() => null);
  const id = typeof body?.id === 'string' ? body.id : '';
  const r = await removerLancamento(user.id, id);
  if (!r.ok) return NextResponse.json({ error: r.erro }, { status: 422 });
  return NextResponse.json({ ok: true });
}
