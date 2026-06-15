import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/workspace';
import { escolherPlano } from '@/lib/assinatura';
import type { CicloPlano } from '@bussola/db';

export const dynamic = 'force-dynamic';

// POST /api/meu-plano — o usuário escolhe seu plano (ativação manual depois).
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const body = await req.json().catch(() => null);
  const planoSlug = typeof body?.planoSlug === 'string' ? body.planoSlug : '';
  if (!planoSlug) return NextResponse.json({ error: 'Informe o plano.' }, { status: 422 });

  const r = await escolherPlano(
    user.id,
    planoSlug,
    (body?.ciclo as CicloPlano) || 'MENSAL',
    Number(body?.assentos) || 1,
  );
  if (!r.ok) return NextResponse.json({ error: r.erro }, { status: 422 });
  return NextResponse.json({ ok: true });
}
