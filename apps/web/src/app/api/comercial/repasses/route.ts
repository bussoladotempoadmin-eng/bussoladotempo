import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/workspace';
import { criarRepassesDoRelatorio, marcarRepasse, removerRepasse } from '@/lib/comercial-repasse';
import type { RepasseStatus } from '@bussola/db';

export const dynamic = 'force-dynamic';

// POST /api/comercial/repasses  body: { orgId, de, ate, dataPrevista }
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  const body = await req.json().catch(() => null);
  const orgId = typeof body?.orgId === 'string' ? body.orgId : '';
  if (!orgId) return NextResponse.json({ error: 'Informe a empresa' }, { status: 422 });

  const r = await criarRepassesDoRelatorio(user.id, orgId, {
    de: typeof body?.de === 'string' ? body.de : '',
    ate: typeof body?.ate === 'string' ? body.ate : '',
    dataPrevista: typeof body?.dataPrevista === 'string' ? body.dataPrevista : '',
  });
  if (!r.ok) return NextResponse.json({ error: r.erro }, { status: 422 });
  return NextResponse.json({ ok: true, count: r.count });
}

// PATCH /api/comercial/repasses  body: { id, status, valorPago?, dataPagamento?, observacao? }
export async function PATCH(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  const body = await req.json().catch(() => null);
  const id = typeof body?.id === 'string' ? body.id : '';
  if (!id) return NextResponse.json({ error: 'Informe o repasse' }, { status: 422 });

  const r = await marcarRepasse(user.id, id, {
    status: body?.status as RepasseStatus,
    valorPago: body?.valorPago != null ? Number(body.valorPago) : undefined,
    dataPagamento: typeof body?.dataPagamento === 'string' ? body.dataPagamento : undefined,
    observacao: typeof body?.observacao === 'string' ? body.observacao : undefined,
  });
  if (!r.ok) return NextResponse.json({ error: r.erro }, { status: 422 });
  return NextResponse.json({ ok: true });
}

// DELETE /api/comercial/repasses  body: { id }
export async function DELETE(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  const body = await req.json().catch(() => null);
  const id = typeof body?.id === 'string' ? body.id : '';
  const r = await removerRepasse(user.id, id);
  if (!r.ok) return NextResponse.json({ error: r.erro }, { status: 422 });
  return NextResponse.json({ ok: true });
}
