import { NextResponse } from 'next/server';
import { getCurrentWorkspace } from '@/lib/workspace';
import { isIsoWeek } from '@/lib/semana';
import { revisarEPlanejar, SemChaveIA } from '@/lib/ai-agenda';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

// POST /api/agenda-ia/semana  body: { semanaIso }
// Comando combinado: analisa a semana e propõe a próxima (uma chamada de IA).
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

  try {
    const r = await revisarEPlanejar(workspace.id, semanaIso);
    return NextResponse.json(r);
  } catch (e) {
    if (e instanceof SemChaveIA) {
      return NextResponse.json(
        { error: 'A IA ainda não está configurada (falta a chave da Anthropic).' },
        { status: 503 },
      );
    }
    const msg = e instanceof Error ? e.message : 'Falha ao revisar e planejar.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
