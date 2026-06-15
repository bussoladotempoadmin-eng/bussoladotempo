/**
 * Cota de geração de IA.
 * Regra: 1 geração por semana ISO (gerar 2/4 semanas continua sendo 1).
 *        Teto de 6 por mês (+ geracoesExtras compradas — billing-ready).
 * Reabrir um resultado salvo NÃO conta (só conta quando a IA realmente gera).
 * "Semana" e "mês" usam o fuso do workspace (o calendário do usuário).
 */
import { prisma } from '@bussola/db';
import { isoWeek } from './iso-week';

export const LIMITE_FREE_MES = 6;

export type StatusCota = {
  podeGerar: boolean;
  motivo: 'semana' | 'mes' | null;
  usadasMes: number;
  limiteMes: number;
  restantesMes: number;
  jaGerouEstaSemana: boolean;
};

async function refsAgora(workspaceId: string): Promise<{ iso: string; mes: string }> {
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
  }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  const y = Number(get('year'));
  const m = Number(get('month'));
  const d = Number(get('day'));
  const iso = isoWeek(new Date(y, m - 1, d));
  const mes = `${y}-${String(m).padStart(2, '0')}`;
  return { iso, mes };
}

export async function statusCota(workspaceId: string): Promise<StatusCota> {
  const { iso, mes } = await refsAgora(workspaceId);
  const ws = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { geracoesExtras: true },
  });
  const limiteMes = LIMITE_FREE_MES + (ws?.geracoesExtras ?? 0);

  const [usadasMes, naSemana] = await Promise.all([
    prisma.geracaoIA.count({ where: { workspaceId, mesRef: mes } }),
    prisma.geracaoIA.count({ where: { workspaceId, isoWeek: iso } }),
  ]);

  const jaGerouEstaSemana = naSemana > 0;
  const restantesMes = Math.max(0, limiteMes - usadasMes);

  let motivo: 'semana' | 'mes' | null = null;
  if (jaGerouEstaSemana) motivo = 'semana';
  else if (usadasMes >= limiteMes) motivo = 'mes';

  return {
    podeGerar: motivo === null,
    motivo,
    usadasMes,
    limiteMes,
    restantesMes,
    jaGerouEstaSemana,
  };
}

/** Registra 1 geração (no fuso do workspace). Aplicar em N semanas = ainda 1. */
export async function registrarGeracao(workspaceId: string, semanasAplicadas = 1): Promise<void> {
  const { iso, mes } = await refsAgora(workspaceId);
  await prisma.geracaoIA.create({
    data: { workspaceId, isoWeek: iso, mesRef: mes, semanasAplicadas },
  });
}

export function mensagemCota(s: StatusCota): string {
  if (s.motivo === 'semana') {
    return 'Você já gerou uma agenda esta semana. O ideal é planejar na sexta, sábado ou domingo — o gerador libera de novo na próxima semana.';
  }
  if (s.motivo === 'mes') {
    return `Você atingiu o limite de ${s.limiteMes} gerações neste mês. Ele renova no mês que vem.`;
  }
  return `${s.restantesMes} de ${s.limiteMes} gerações disponíveis neste mês.`;
}
