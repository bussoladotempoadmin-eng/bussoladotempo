import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/workspace';
import { criarSugestao, responderSugestao } from '@/lib/equipe';

export const dynamic = 'force-dynamic';

// POST /api/equipe/sugestao — gestor cria  body: { paraUserId, texto }
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  const body = await req.json().catch(() => null);
  const paraUserId = typeof body?.paraUserId === 'string' ? body.paraUserId : '';
  const texto = typeof body?.texto === 'string' ? body.texto : '';
  if (!paraUserId) return NextResponse.json({ error: 'Membro inválido' }, { status: 400 });
  const r = await criarSugestao(user.id, paraUserId, texto);
  if (!r.ok) return NextResponse.json({ error: r.erro }, { status: 422 });
  return NextResponse.json({ ok: true });
}

// PATCH /api/equipe/sugestao — membro responde  body: { id, status: 'ACEITA'|'DISPENSADA' }
export async function PATCH(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  const body = await req.json().catch(() => null);
  const id = typeof body?.id === 'string' ? body.id : '';
  const status = body?.status === 'ACEITA' || body?.status === 'DISPENSADA' ? body.status : null;
  if (!id || !status) return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 });
  const ok = await responderSugestao(user.id, id, status);
  if (!ok) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
