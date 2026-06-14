import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/workspace';
import { ativarComercial } from '@/lib/comercial';

export const dynamic = 'force-dynamic';

// POST /api/comercial/ativar  body: { nome? }
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  const body = await req.json().catch(() => null);
  const nome = typeof body?.nome === 'string' ? body.nome : undefined;
  const org = await ativarComercial(user.id, nome);
  return NextResponse.json({ ok: true, org });
}
