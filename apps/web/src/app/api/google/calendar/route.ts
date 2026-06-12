import { NextResponse } from 'next/server';
import { prisma } from '@bussola/db';
import { getSessionUser } from '@/lib/workspace';
import { isCalendarConnected, fetchGoogleEvents } from '@/lib/google-calendar';

/**
 * GET /api/google/calendar?from=ISO&to=ISO
 * Diz se o Google Agenda está conectado e devolve os eventos do intervalo.
 * { connected: boolean, events: GoogleEvent[] }
 */
export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const connected = await isCalendarConnected(user.id);
  if (!connected) {
    return NextResponse.json({ connected: false, events: [] });
  }

  const sp = new URL(req.url).searchParams;
  const from = sp.get('from');
  const to = sp.get('to');
  if (!from || !to) {
    return NextResponse.json({ connected: true, events: [] });
  }

  const events = await fetchGoogleEvents(user.id, from, to);
  return NextResponse.json({ connected: true, events });
}

/** DELETE /api/google/calendar — desconecta o Google Agenda (apaga o vínculo). */
export async function DELETE() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }
  await prisma.account.deleteMany({
    where: { userId: user.id, provider: 'google-calendar' },
  });
  return NextResponse.json({ connected: false });
}

