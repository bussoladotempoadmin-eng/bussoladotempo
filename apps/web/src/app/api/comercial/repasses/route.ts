import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/workspace';
import {
  criarRepassesDoRelatorio,
  registrarPagamentoRepasse,
  removerPagamentoRepasse,
  definirStatusRepasse,
  removerRepasse,
} from '@/lib/comercial-repasse';

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

// PATCH /api/comercial/repasses
//   acao 'pagar'          body: { id, valor, data }        → registra uma parcela
//   acao 'remover-parcela' body: { pagamentoId }           → remove uma parcela
//   acao 'status'         body: { id, status }             → NAO_FEITO / PENDENTE
export async function PATCH(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  const body = await req.json().catch(() => null);
  const acao = body?.acao;

  if (acao === 'remover-parcela') {
    const pagamentoId = typeof body?.pagamentoId === 'string' ? body.pagamentoId : '';
    const r = await removerPagamentoRepasse(user.id, pagamentoId);
    return r.ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: r.erro }, { status: 422 });
  }

  const id = typeof body?.id === 'string' ? body.id : '';
  if (!id) return NextResponse.json({ error: 'Informe o repasse' }, { status: 422 });

  if (acao === 'status') {
    const status = body?.status === 'NAO_FEITO' ? 'NAO_FEITO' : 'PENDENTE';
    const r = await definirStatusRepasse(user.id, id, status);
    return r.ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: r.erro }, { status: 422 });
  }

  // padrão: registrar uma parcela (parcial ou complemento)
  const r = await registrarPagamentoRepasse(user.id, id, {
    valor: Number(body?.valor),
    data: typeof body?.data === 'string' ? body.data : '',
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
