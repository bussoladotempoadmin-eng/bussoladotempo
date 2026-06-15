/** Formatação do painel de gestão (puro — server e client). */
import type { StatusAssinatura, OrigemAssinatura } from '@bussola/db';

export function fmtMoney(n: number | null | undefined, casas = 2): string {
  if (n === null || n === undefined) return '—';
  return n.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  });
}

export function fmtData(d: Date | string | null | undefined): string {
  if (!d) return '—';
  const date = typeof d === 'string' ? new Date(d) : d;
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export const STATUS_LABEL: Record<StatusAssinatura, string> = {
  TRIAL: 'Trial',
  ATIVA: 'Ativa',
  ATRASADA: 'Atrasada',
  SUSPENSA: 'Suspensa',
  CANCELADA: 'Cancelada',
};

// Classe Tailwind do badge por status.
export const STATUS_CLASSE: Record<StatusAssinatura, string> = {
  TRIAL: 'bg-blue-500/12 text-blue-600 dark:text-blue-400',
  ATIVA: 'bg-emerald-500/12 text-emerald-600 dark:text-emerald-400',
  ATRASADA: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  SUSPENSA: 'bg-red-500/12 text-red-600 dark:text-red-400',
  CANCELADA: 'bg-muted text-muted-foreground',
};

export const ORIGEM_LABEL: Record<OrigemAssinatura, string> = {
  AUTO: 'Entrou direto',
  CADASTRO: 'Escolheu plano',
  ADMIN: 'Criada por você',
  TRIBO: 'Veio do formulário',
};
