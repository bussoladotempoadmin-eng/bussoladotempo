/** Helpers de formatação do módulo Comercial (puros — server e client). */

export function fmtMoney(n: number | null | undefined, casas = 0): string {
  if (n === null || n === undefined) return '—';
  return n.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  });
}

export function fmtNum(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—';
  return n.toLocaleString('pt-BR');
}

/** "18/05" se 1 dia; "09–11/05" mesmo mês; "29/05–02/06" meses diferentes. */
export function fmtPeriodo(iniIso: string, fimIso: string): string {
  const ini = iniIso.slice(8, 10) + '/' + iniIso.slice(5, 7);
  if (iniIso === fimIso) return ini;
  if (iniIso.slice(0, 7) === fimIso.slice(0, 7)) {
    return iniIso.slice(8, 10) + '–' + fimIso.slice(8, 10) + '/' + iniIso.slice(5, 7);
  }
  return ini + '–' + fimIso.slice(8, 10) + '/' + fimIso.slice(5, 7);
}

/** Primeiro e último dia do mês corrente em YYYY-MM-DD (fuso local do server irrelevante p/ filtro). */
export function mesCorrente(): { de: string; ate: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const p = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return { de: p(new Date(y, m, 1)), ate: p(new Date(y, m + 1, 0)) };
}
