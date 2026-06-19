import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/workspace';
import { criarUnidade, editarUnidade, removerUnidade, salvarRepasseUnidade } from '@/lib/comercial';
import type { MetodoRepasse, TipoConta } from '@bussola/db';

export const dynamic = 'force-dynamic';

// POST /api/comercial/unidades  body: { nome, coordenadorEmail? }
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  const body = await req.json().catch(() => null);
  const orgId = typeof body?.orgId === 'string' ? body.orgId : '';
  const nome = typeof body?.nome === 'string' ? body.nome : '';
  const coord = typeof body?.coordenadorEmail === 'string' ? body.coordenadorEmail : undefined;
  const r = await criarUnidade(user.id, orgId, nome, coord);
  if (!r.ok) return NextResponse.json({ error: r.erro }, { status: 422 });
  return NextResponse.json({ ok: true });
}

// PATCH /api/comercial/unidades  body: { id, nome?, coordenadorEmail? }
// coordenadorEmail = "" remove o coordenador.
export async function PATCH(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  const body = await req.json().catch(() => null);
  const id = typeof body?.id === 'string' ? body.id : '';
  if (!id) return NextResponse.json({ error: 'Informe a unidade' }, { status: 422 });

  // Configuração de repasse (corporativo/admin) — fluxo separado da edição do dono.
  if (body?.acao === 'repasse') {
    const metodo = (body?.metodo ?? null) as MetodoRepasse | null;
    const r = await salvarRepasseUnidade(user.id, id, {
      metodo,
      banco: typeof body?.banco === 'string' ? body.banco : undefined,
      agencia: typeof body?.agencia === 'string' ? body.agencia : undefined,
      conta: typeof body?.conta === 'string' ? body.conta : undefined,
      tipoConta: (body?.tipoConta ?? null) as TipoConta | null,
      pix: typeof body?.pix === 'string' ? body.pix : undefined,
      cpfCnpj: typeof body?.cpfCnpj === 'string' ? body.cpfCnpj : undefined,
      titular: typeof body?.titular === 'string' ? body.titular : undefined,
    });
    if (!r.ok) return NextResponse.json({ error: r.erro }, { status: 422 });
    return NextResponse.json({ ok: true });
  }

  const r = await editarUnidade(user.id, id, {
    nome: typeof body?.nome === 'string' ? body.nome : undefined,
    coordenadorEmail: typeof body?.coordenadorEmail === 'string' ? body.coordenadorEmail : undefined,
  });
  if (!r.ok) return NextResponse.json({ error: r.erro }, { status: 422 });
  return NextResponse.json({ ok: true });
}

// DELETE /api/comercial/unidades  body: { id }
export async function DELETE(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  const body = await req.json().catch(() => null);
  const id = typeof body?.id === 'string' ? body.id : '';
  const ok = await removerUnidade(user.id, id);
  if (!ok) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
