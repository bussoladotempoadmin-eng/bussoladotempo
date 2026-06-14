import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/workspace';
import { isIsoWeek } from '@/lib/semana';
import { analisarTimeIA } from '@/lib/team-ia';
import { SemChaveIA } from '@/lib/ai-agenda';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

// POST /api/equipe/ia  body: { semana, force? }
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const body = await req.json().catch(() => null);
  const iso = body?.semana;
  if (!iso || !isIsoWeek(iso)) {
    return NextResponse.json({ error: 'Semana inválida' }, { status: 400 });
  }

  try {
    const r = await analisarTimeIA(user.id, iso, Boolean(body?.force));
    return NextResponse.json(r);
  } catch (e) {
    if (e instanceof SemChaveIA) {
      return NextResponse.json(
        { error: 'A IA ainda não está configurada (falta a chave da Anthropic).' },
        { status: 503 },
      );
    }
    const msg = e instanceof Error ? e.message : 'Falha ao analisar o time.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
