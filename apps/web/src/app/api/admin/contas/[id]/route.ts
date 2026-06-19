import { NextResponse } from 'next/server';
import { getSuperAdmin } from '@/lib/super-admin';
import {
  editarAssinatura,
  editarDadosOwner,
  estenderTrial,
  criarCobrancaManual,
} from '@/lib/admin-billing';
import { vincularParceiroAssinatura } from '@/lib/comissoes';
import type { CicloPlano, StatusAssinatura } from '@bussola/db';

export const dynamic = 'force-dynamic';

// PATCH /api/admin/contas/:id — edita a assinatura.
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const admin = await getSuperAdmin();
  if (!admin) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });

  const body = await req.json().catch(() => null);
  const r = await editarAssinatura(params.id, {
    status: body?.status as StatusAssinatura | undefined,
    planoSlug: typeof body?.planoSlug === 'string' ? body.planoSlug : undefined,
    assentos: body?.assentos != null ? Number(body.assentos) : undefined,
    ciclo: body?.ciclo as CicloPlano | undefined,
    notasInternas: typeof body?.notasInternas === 'string' ? body.notasInternas : undefined,
  });
  if (!r.ok) return NextResponse.json({ error: r.erro }, { status: 422 });
  return NextResponse.json({ ok: true });
}

// POST /api/admin/contas/:id — ações: estender_trial | criar_cobranca.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const admin = await getSuperAdmin();
  if (!admin) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });

  const body = await req.json().catch(() => null);
  const tipo = body?.tipo;

  if (tipo === 'estender_trial') {
    const dias = Number(body?.dias) || 14;
    await estenderTrial(params.id, dias);
    return NextResponse.json({ ok: true });
  }

  if (tipo === 'criar_cobranca') {
    const venc = body?.vencimento ? new Date(`${body.vencimento}T12:00:00`) : undefined;
    const r = await criarCobrancaManual(params.id, {
      valor: body?.valor != null ? Number(body.valor) : undefined,
      descontoValor: Number(body?.descontoValor) || 0,
      vencimento: venc,
      nota: typeof body?.nota === 'string' ? body.nota : undefined,
    });
    if (!r.ok) return NextResponse.json({ error: r.erro }, { status: 422 });
    return NextResponse.json({ ok: true, cobrancaId: r.cobrancaId });
  }

  if (tipo === 'editar_owner') {
    const r = await editarDadosOwner(params.id, {
      name: typeof body?.name === 'string' ? body.name : undefined,
      email: typeof body?.email === 'string' ? body.email : undefined,
    });
    if (!r.ok) return NextResponse.json({ error: r.erro }, { status: 422 });
    return NextResponse.json({ ok: true });
  }

  if (tipo === 'vincular_parceiro') {
    const code = typeof body?.code === 'string' ? body.code : '';
    const r = await vincularParceiroAssinatura(params.id, code, admin.id);
    if (!r.ok) return NextResponse.json({ error: r.erro }, { status: 422 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Ação desconhecida' }, { status: 400 });
}
