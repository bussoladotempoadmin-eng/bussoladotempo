/**
 * Integração de leitura com o Google Calendar (Fase C).
 * Os tokens ficam numa Account com provider='google-calendar' (criada pelo
 * fluxo "Conectar Google Agenda"). Aqui a gente lê esse token, renova quando
 * expira e busca os eventos de um intervalo.
 */
import { prisma } from '@bussola/db';

const PROVIDER = 'google-calendar';

export type GoogleEvent = {
  id: string;
  title: string;
  start: string; // ISO
  end: string; // ISO
  allDay: boolean;
};

/** Conta do Google Agenda conectada para o usuário (ou null). */
export async function getCalendarAccount(userId: string) {
  return prisma.account.findFirst({
    where: { userId, provider: PROVIDER },
  });
}

export async function isCalendarConnected(userId: string): Promise<boolean> {
  return (await getCalendarAccount(userId)) !== null;
}

/** Token de acesso válido (renova via refresh_token se estiver expirado). */
async function getValidAccessToken(userId: string): Promise<string | null> {
  const acc = await getCalendarAccount(userId);
  if (!acc?.access_token) return null;

  const now = Math.floor(Date.now() / 1000);
  // Ainda válido (margem de 60s)?
  if (acc.expires_at && acc.expires_at > now + 60) return acc.access_token;

  // Expirado e sem refresh_token: devolve o que tem (pode falhar, sem drama).
  if (!acc.refresh_token) return acc.access_token;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID ?? '',
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? '',
      grant_type: 'refresh_token',
      refresh_token: acc.refresh_token,
    }),
  });
  if (!res.ok) return acc.access_token;

  const data = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!data.access_token) return acc.access_token;

  await prisma.account.update({
    where: { id: acc.id },
    data: {
      access_token: data.access_token,
      expires_at: data.expires_in ? now + data.expires_in : acc.expires_at,
    },
  });
  return data.access_token;
}

/**
 * Busca eventos da agenda principal entre [fromISO, toISO].
 * singleEvents=true expande eventos recorrentes em instâncias (a recorrência
 * vem resolvida pelo próprio Google — não precisamos lidar com RRULE).
 */
export async function fetchGoogleEvents(
  userId: string,
  fromISO: string,
  toISO: string,
): Promise<GoogleEvent[]> {
  const token = await getValidAccessToken(userId);
  if (!token) return [];

  const url = new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events');
  url.searchParams.set('timeMin', fromISO);
  url.searchParams.set('timeMax', toISO);
  url.searchParams.set('singleEvents', 'true');
  url.searchParams.set('orderBy', 'startTime');
  url.searchParams.set('maxResults', '250');

  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) return [];

  const data = (await res.json()) as {
    items?: Array<{
      id: string;
      summary?: string;
      start?: { dateTime?: string; date?: string };
      end?: { dateTime?: string; date?: string };
    }>;
  };

  return (data.items ?? [])
    .map((it): GoogleEvent | null => {
      const startRaw = it.start?.dateTime ?? it.start?.date;
      const endRaw = it.end?.dateTime ?? it.end?.date;
      if (!startRaw || !endRaw) return null;
      const allDay = !it.start?.dateTime; // só "date" (sem hora) = dia inteiro
      return {
        id: it.id,
        title: it.summary ?? '(sem título)',
        start: new Date(startRaw).toISOString(),
        end: new Date(endRaw).toISOString(),
        allDay,
      };
    })
    .filter((e): e is GoogleEvent => e !== null);
}

/** TEMPORÁRIO — diagnóstico da conexão da agenda. Não expõe o token. */
export async function debugCalendar(userId: string, fromISO: string, toISO: string) {
  const acc = await getCalendarAccount(userId);
  if (!acc) return { connected: false, reason: 'sem Account google-calendar' };

  const now = Math.floor(Date.now() / 1000);
  const info: Record<string, unknown> = {
    connected: true,
    hasAccessToken: Boolean(acc.access_token),
    hasRefreshToken: Boolean(acc.refresh_token),
    scope: acc.scope,
    scopeTemCalendar: (acc.scope ?? '').includes('calendar'),
    expiresAt: acc.expires_at,
    expirado: acc.expires_at ? acc.expires_at <= now : null,
    range: { fromISO, toISO },
  };

  const token = await getValidAccessToken(userId);
  info.tokenValidoObtido = Boolean(token);
  if (!token) return info;

  const url = new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events');
  url.searchParams.set('timeMin', fromISO);
  url.searchParams.set('timeMax', toISO);
  url.searchParams.set('singleEvents', 'true');
  url.searchParams.set('orderBy', 'startTime');
  url.searchParams.set('maxResults', '250');

  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  info.apiStatus = res.status;
  const text = await res.text();
  if (!res.ok) {
    info.apiError = text.slice(0, 600);
    return info;
  }
  const data = JSON.parse(text) as { items?: Array<{ summary?: string; start?: unknown }> };
  info.rawItemCount = (data.items ?? []).length;
  info.amostraTitulos = (data.items ?? []).slice(0, 6).map((i) => i.summary ?? '(sem título)');
  return info;
}
