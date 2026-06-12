import { NextResponse } from 'next/server';
import { getCurrentWorkspace } from '@/lib/workspace';
import { isIsoWeek } from '@/lib/semana';
import { gerarAgendaIA, SemChaveIA } from '@/lib/ai-agenda';

// Geração com IA pode levar alguns segundos — dá folga no timeout serverless.
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

// POST /api/agenda-ia/gerar  body: { semanaIso, semanasHistorico? }
// Devolve uma PROPOSTA (não salva nada).
export async function POST(req: Request) {
  const workspace = await getCurrentWorkspace();
  if (!workspace) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const semanaIso = body?.semanaIso;
  if (!semanaIso || !isIsoWeek(semanaIso)) {
    return NextResponse.json({ error: 'Semana inválida' }, { status: 400 });
  }
  const semanasHistorico = Math.min(Math.max(Number(body?.semanasHistorico) || 4, 1), 8);

  try {
    const proposta = await gerarAgendaIA(workspace.id, semanaIso, semanasHistorico);
    return NextResponse.json(proposta);
  } catch (e) {
    if (e instanceof SemChaveIA) {
      return NextResponse.json(
        { error: 'A IA ainda não está configurada (falta a chave da Anthropic).' },
        { status: 503 },
      );
    }
    const msg = e instanceof Error ? e.message : 'Falha ao gerar a agenda.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
