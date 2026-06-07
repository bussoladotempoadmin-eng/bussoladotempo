/**
 * Obtenção/criação da SemanaPlano no banco.
 * Os helpers puros de semana ISO (cálculo, navegação, rótulos) ficam em
 * `./iso-week` (seguros pra cliente) e são re-exportados aqui por conveniência.
 */
import { prisma } from '@bussola/db';

export {
  isoWeek,
  currentIsoWeek,
  isoWeekMonday,
  isoWeekMondayYMD,
  shiftIsoWeek,
  isoWeekRangeLabel,
  isIsoWeek,
} from './iso-week';

/** Busca a SemanaPlano do workspace para o iso; cria (PLANEJANDO) se não existir. */
export async function getOrCreateSemana(workspaceId: string, semanaIso: string) {
  const existing = await prisma.semanaPlano.findUnique({
    where: { workspaceId_semanaIso: { workspaceId, semanaIso } },
  });
  if (existing) return existing;
  return prisma.semanaPlano.create({
    data: { workspaceId, semanaIso },
  });
}
