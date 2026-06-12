/**
 * Integração de leitura com o Google Calendar (Fase C).
 * Os tokens ficam numa Account com provider='google-calendar' (criada pelo
 * fluxo "Conectar Google Agenda"). Aqui a gente lê esse token, renova quando
 * expira e busca os eventos de um intervalo.
 */
import { prisma } from '@bussola/db';
import { isoWeekMondayYMD } from './iso-week';

const PROVIDER = 'google-calendar';
const CAL = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';
const OFFSET: Record<string, number> = { SEG: 0, TER: 1, QUA: 2, QUI: 3, SEX: 4, SAB: 5, DOM: 6 };
// Marca eventos criados pela Bússola (pra não duplicar na leitura e pra limpar órfãos).
const TAG = 'bussola';

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
      extendedProperties?: { private?: Record<string, string> };
    }>;
  };

  return (data.items ?? [])
    .map((it): GoogleEvent | null => {
      // Ignora os eventos que a própria Bússola criou (senão apareceriam 2x).
      if (it.extendedProperties?.private?.[TAG]) return null;
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

export class NaoConectado extends Error {
  constructor() {
    super('Google Agenda não conectado');
    this.name = 'NaoConectado';
  }
}

/** Data "YYYY-MM-DD" de um dia da semana ISO (segunda + offset), via UTC. */
function dataDoDia(semanaIso: string, diaSemana: string): string {
  const [y, m, d] = isoWeekMondayYMD(semanaIso).split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + (OFFSET[diaSemana] ?? 0)));
  const p = (n: number) => String(n).padStart(2, '0');
  return `${dt.getUTCFullYear()}-${p(dt.getUTCMonth() + 1)}-${p(dt.getUTCDate())}`;
}

/**
 * Espelha os blocos de uma semana no Google Agenda (calendário principal).
 * Idempotente: cria os novos, atualiza os que já têm externalEventId e remove
 * do Google os eventos da Bússola cujo bloco não existe mais.
 */
export async function sincronizarSemana(
  userId: string,
  semanaIso: string,
): Promise<{ enviados: number; atualizados: number; removidos: number }> {
  const token = await getValidAccessToken(userId);
  if (!token) throw new NaoConectado();

  const workspace = await prisma.workspace.findFirst({ where: { userId } });
  const tz = workspace?.timezone ?? 'America/Sao_Paulo';

  const semana = workspace
    ? await prisma.semanaPlano.findUnique({
        where: { workspaceId_semanaIso: { workspaceId: workspace.id, semanaIso } },
        include: {
          blocos: { include: { frente: { select: { nome: true, icone: true } } } },
        },
      })
    : null;
  const blocos = semana?.blocos ?? [];

  const auth = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  let enviados = 0;
  let atualizados = 0;

  for (const b of blocos) {
    const dia = dataDoDia(semanaIso, b.diaSemana);
    const body = {
      summary: `${b.frente?.icone ? b.frente.icone + ' ' : ''}${b.tarefa}`,
      description: 'Bloco da Bússola do Tempo',
      start: { dateTime: `${dia}T${b.horaInicio}:00`, timeZone: tz },
      end: { dateTime: `${dia}T${b.horaFim}:00`, timeZone: tz },
      extendedProperties: { private: { [TAG]: 'bloco', blocoId: b.id } },
    };

    if (b.externalEventId) {
      const res = await fetch(`${CAL}/${b.externalEventId}`, {
        method: 'PATCH',
        headers: auth,
        body: JSON.stringify(body),
      });
      if (res.ok) atualizados++;
      else if (res.status === 404) {
        // Evento sumiu no Google: recria.
        const novo = await fetch(CAL, { method: 'POST', headers: auth, body: JSON.stringify(body) });
        if (novo.ok) {
          const ev = (await novo.json()) as { id?: string };
          if (ev.id) {
            await prisma.bloco.update({ where: { id: b.id }, data: { externalEventId: ev.id } });
            enviados++;
          }
        }
      }
    } else {
      const res = await fetch(CAL, { method: 'POST', headers: auth, body: JSON.stringify(body) });
      if (res.ok) {
        const ev = (await res.json()) as { id?: string };
        if (ev.id) {
          await prisma.bloco.update({ where: { id: b.id }, data: { externalEventId: ev.id } });
          enviados++;
        }
      }
    }
  }

  // Limpa órfãos: eventos da Bússola nessa semana cujo bloco não existe mais.
  let removidos = 0;
  const idsAtuais = new Set(blocos.map((b) => b.id));
  const from = new Date(`${dataDoDia(semanaIso, 'SEG')}T00:00:00Z`).toISOString();
  const to = new Date(`${dataDoDia(semanaIso, 'DOM')}T23:59:59Z`).toISOString();
  const listUrl = new URL(CAL);
  listUrl.searchParams.set('timeMin', from);
  listUrl.searchParams.set('timeMax', to);
  listUrl.searchParams.set('singleEvents', 'true');
  listUrl.searchParams.set('maxResults', '250');
  listUrl.searchParams.set('privateExtendedProperty', `${TAG}=bloco`);
  const lista = await fetch(listUrl, { headers: { Authorization: `Bearer ${token}` } });
  if (lista.ok) {
    const data = (await lista.json()) as {
      items?: Array<{ id: string; extendedProperties?: { private?: Record<string, string> } }>;
    };
    for (const ev of data.items ?? []) {
      const blocoId = ev.extendedProperties?.private?.blocoId;
      if (!blocoId || !idsAtuais.has(blocoId)) {
        const del = await fetch(`${CAL}/${ev.id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
        if (del.ok || del.status === 410) removidos++;
      }
    }
  }

  return { enviados, atualizados, removidos };
}
