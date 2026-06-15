/**
 * Nudge in-app do ritual semanal.
 * Janela de revisão: sexta, sábado, domingo. Segunda = dia de graça.
 * Se a semana-alvo já foi concluída (fechadaEm), não cobra (trava).
 * Considera o fuso do workspace pra acertar o dia da semana.
 */
import { prisma } from '@bussola/db';
import { isoWeek, shiftIsoWeek, isoWeekRangeLabel } from './iso-week';

export type NudgeRevisao = {
  iso: string;
  label: string;
  tom: 'soft' | 'grace';
  titulo: string;
  texto: string;
};

export async function nudgeRevisao(workspaceId: string): Promise<NudgeRevisao | null> {
  const ws = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { timezone: true },
  });
  const tz = ws?.timezone ?? 'America/Sao_Paulo';

  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
  }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  const y = Number(get('year'));
  const m = Number(get('month'));
  const d = Number(get('day'));
  const wd = get('weekday'); // 'Mon' .. 'Sun'
  if (!y || !m || !d) return null;

  const hojeIso = isoWeek(new Date(y, m - 1, d));

  let iso: string | null = null;
  let tom: 'soft' | 'grace' = 'soft';
  if (wd === 'Fri' || wd === 'Sat' || wd === 'Sun') {
    iso = hojeIso; // revisar a semana que está terminando
    tom = 'soft';
  } else if (wd === 'Mon') {
    iso = shiftIsoWeek(hojeIso, -1); // graça: revisar a semana que acabou
    tom = 'grace';
  }
  if (!iso) return null;

  // Já concluída? Trava — não cobra mais.
  const semana = await prisma.semanaPlano.findUnique({
    where: { workspaceId_semanaIso: { workspaceId, semanaIso: iso } },
    include: { revisao: { select: { fechadaEm: true } }, _count: { select: { blocos: true } } },
  });
  if (semana?.revisao?.fechadaEm) return null;

  // Sem semana montada (ou sem nenhum bloco) = nada pra revisar.
  // Evita cobrar revisão de quem acabou de entrar e ainda não usou a 1ª semana.
  if (!semana || semana._count.blocos === 0) return null;

  const titulo =
    tom === 'grace'
      ? 'Você ainda não revisou a semana passada'
      : wd === 'Fri'
        ? 'Sexta — bom momento pra fechar a semana'
        : 'Hora de organizar a semana';
  const texto =
    tom === 'grace'
      ? 'Ainda dá tempo hoje — depois disso a semana nova já tomou conta. Revise e planeje a próxima.'
      : 'Revise como foi e já planeje a próxima — leva poucos minutos com a IA.';

  return { iso, label: isoWeekRangeLabel(iso), tom, titulo, texto };
}
