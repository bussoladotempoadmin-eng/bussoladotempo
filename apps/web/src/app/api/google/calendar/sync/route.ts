import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/workspace';
import { isIsoWeek } from '@/lib/semana';
import { sincronizarSemana, NaoConectado } from '@/lib/google-calendar';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

// POST /api/google/calendar/sync  body: { semanaIso }
// Espelha os blocos da semana no Google Agenda.
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const semanaIso = body?.semanaIso;
  if (!semanaIso || !isIsoWeek(semanaIso)) {
    return NextResponse.json({ error: 'Semana inválida' }, { status: 400 });
  }

  try {
    const r = await sincronizarSemana(user.id, semanaIso);
    return NextResponse.json({ ok: true, ...r });
  } catch (e) {
    if (e instanceof NaoConectado) {
      return NextResponse.json({ error: 'Conecte o Google Agenda primeiro.' }, { status: 409 });
    }
    const msg = e instanceof Error ? e.message : 'Falha ao sincronizar.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
