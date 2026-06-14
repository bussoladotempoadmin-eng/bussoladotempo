/**
 * Helpers de semana ISO ("YYYY-Www") — puros, sem dependência de banco.
 * Seguro pra importar em componentes cliente (não arrasta o Prisma pro bundle).
 */

/** Retorna a semana ISO ("YYYY-Www") de uma data. */
export function isoWeek(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = (d.getUTCDay() + 6) % 7; // segunda = 0
  d.setUTCDate(d.getUTCDate() - dayNum + 3); // quinta da semana
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const firstThursdayDay = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstThursdayDay + 3);
  const week = 1 + Math.round((d.getTime() - firstThursday.getTime()) / (7 * 86400000));
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

export function currentIsoWeek(): string {
  return isoWeek(new Date());
}

/** Segunda-feira (UTC) da semana ISO informada. */
function mondayOfIsoWeek(year: number, week: number): Date {
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const jan4Day = (jan4.getUTCDay() + 6) % 7;
  const week1Monday = new Date(jan4);
  week1Monday.setUTCDate(jan4.getUTCDate() - jan4Day);
  const monday = new Date(week1Monday);
  monday.setUTCDate(week1Monday.getUTCDate() + (week - 1) * 7);
  return monday;
}

/** Segunda-feira (UTC) da semana ISO — pra montar o calendário. */
export function isoWeekMonday(iso: string): Date {
  const [year, week] = iso.split('-W').map(Number);
  return mondayOfIsoWeek(year, week);
}

/** Segunda-feira da semana ISO no formato "YYYY-MM-DD" (pra montar Date local). */
export function isoWeekMondayYMD(iso: string): string {
  const m = isoWeekMonday(iso);
  return `${m.getUTCFullYear()}-${String(m.getUTCMonth() + 1).padStart(2, '0')}-${String(m.getUTCDate()).padStart(2, '0')}`;
}

/** Desloca uma semana ISO em `delta` semanas (pode ser negativo). */
export function shiftIsoWeek(iso: string, delta: number): string {
  const [year, week] = iso.split('-W').map(Number);
  const monday = mondayOfIsoWeek(year, week);
  monday.setUTCDate(monday.getUTCDate() + delta * 7);
  return isoWeek(monday);
}

/** Rótulo "08/06 – 14/06/2026" para a semana ISO. */
export function isoWeekRangeLabel(iso: string): string {
  const [year, week] = iso.split('-W').map(Number);
  const monday = mondayOfIsoWeek(year, week);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  const dd = (d: Date) => String(d.getUTCDate()).padStart(2, '0');
  const mm = (d: Date) => String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${dd(monday)}/${mm(monday)} – ${dd(sunday)}/${mm(sunday)}/${sunday.getUTCFullYear()}`;
}

export function isIsoWeek(value: string): boolean {
  return /^\d{4}-W\d{2}$/.test(value);
}

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

/** Rótulo amigável da semana pro usuário: "8–14 jun" ou "29 jun–5 jul". */
export function isoWeekLabel(iso: string): string {
  const [year, week] = iso.split('-W').map(Number);
  const monday = mondayOfIsoWeek(year, week);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  const d1 = monday.getUTCDate();
  const m1 = monday.getUTCMonth();
  const d2 = sunday.getUTCDate();
  const m2 = sunday.getUTCMonth();
  if (m1 === m2) return `${d1}–${d2} ${MESES[m1]}`;
  return `${d1} ${MESES[m1]}–${d2} ${MESES[m2]}`;
}
