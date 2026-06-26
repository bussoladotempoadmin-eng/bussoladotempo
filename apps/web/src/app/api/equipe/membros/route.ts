import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/workspace';
import { convidarMembro, removerMembro, reenviarConvite } from '@/lib/equipe';

export const dynamic = 'force-dynamic';

// POST /api/equipe/membros — convida membro por e-mail (cria conta se preciso)  body: { email }
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  const body = await req.json().catch(() => null);
  const email = typeof body?.email === 'string' ? body.email : '';
  const chefeId = typeof body?.chefeId === 'string' && body.chefeId ? body.chefeId : null;
  if (!email.includes('@')) {
    return NextResponse.json({ error: 'E-mail inválido' }, { status: 400 });
  }
  const r = await convidarMembro(user.id, email, chefeId);
  if (!r.ok) return NextResponse.json({ error: r.erro }, { status: 422 });
  return NextResponse.json({ ok: true, convidado: r.convidado });
}

// PATCH /api/equipe/membros — reenvia o convite  body: { membroId }
export async function PATCH(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  const body = await req.json().catch(() => null);
  const membroId = typeof body?.membroId === 'string' ? body.membroId : '';
  if (!membroId) return NextResponse.json({ error: 'Informe o membro' }, { status: 400 });
  const r = await reenviarConvite(user.id, membroId);
  if (!r.ok) return NextResponse.json({ error: r.erro }, { status: 422 });
  return NextResponse.json({ ok: true, email: r.email });
}

// DELETE /api/equipe/membros?id=<membroId>
export async function DELETE(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Informe o id' }, { status: 400 });
  const ok = await removerMembro(user.id, id);
  if (!ok) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
