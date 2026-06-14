/**
 * Painel do Time (Fase 4.4).
 * Para o gestor logado, calcula o resumo de tempo de cada membro do seu galho.
 * IMPORTANTE (privacidade): só lê BLOCOS (distribuição de tempo) — nunca toca
 * nas reflexões/revisões. O gestor vê "como o tempo foi", não a intimidade.
 */
import { prisma } from '@bussola/db';
import { calcEspelho, type BlocoEspelho } from '@bussola/domain';
import { escopoVisivel } from './equipe';

export type ResumoMembro = {
  membroId: string;
  userId: string;
  nome: string;
  email: string;
  chefeId: string | null;
  temDados: boolean;
  totalHoras: number;
  pImportante: number;
  pUrgente: number;
  pDisperso: number;
  focoFrente: string | null;
};

export type PainelTime = {
  org: { id: string; nome: string };
  ehDono: boolean;
  membros: ResumoMembro[];
  agregado: {
    totalHoras: number;
    pImportante: number;
    pUrgente: number;
    pDisperso: number;
    comDados: number;
    total: number;
  };
};

export async function getPainelTime(userId: string, iso: string): Promise<PainelTime | null> {
  const escopo = await escopoVisivel(userId);
  if (!escopo) return null;

  const membros: ResumoMembro[] = [];
  let aggH = 0;
  let aggImp = 0;
  let aggUrg = 0;
  let aggDisp = 0;
  let comDados = 0;

  for (const m of escopo.membros) {
    const base = {
      membroId: m.membroId,
      userId: m.userId,
      nome: m.nome,
      email: m.email,
      chefeId: m.chefeId,
    };
    let resumo: ResumoMembro = {
      ...base,
      temDados: false,
      totalHoras: 0,
      pImportante: 0,
      pUrgente: 0,
      pDisperso: 0,
      focoFrente: null,
    };

    const ws = await prisma.workspace.findFirst({
      where: { userId: m.userId },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });

    if (ws) {
      const semana = await prisma.semanaPlano.findUnique({
        where: { workspaceId_semanaIso: { workspaceId: ws.id, semanaIso: iso } },
        select: { id: true },
      });
      const [blocos, frentes] = await Promise.all([
        semana
          ? prisma.bloco.findMany({ where: { semanaPlanoId: semana.id } })
          : Promise.resolve([]),
        prisma.frente.findMany({ where: { workspaceId: ws.id }, select: { id: true, nome: true } }),
      ]);

      if (blocos.length > 0) {
        const esp = calcEspelho(
          blocos.map(
            (b): BlocoEspelho => ({
              frenteId: b.frenteId,
              horaInicio: b.horaInicio,
              horaFim: b.horaFim,
              categoriaPlanejada: b.categoriaPlanejada,
              categoriaRealizada: b.categoriaRealizada,
              tarefa: b.tarefa,
              diaSemana: b.diaSemana,
            }),
          ),
          frentes.map((f) => ({ id: f.id })),
        );
        const focoId = Object.entries(esp.totalPorFrente).sort((a, b) => b[1] - a[1])[0]?.[0];
        resumo = {
          ...base,
          temDados: true,
          totalHoras: esp.totalGeral,
          pImportante: esp.percentuaisPorCategoria.IMPORTANTE,
          pUrgente: esp.percentuaisPorCategoria.URGENTE,
          pDisperso: esp.percentuaisPorCategoria.DISPERSO,
          focoFrente: frentes.find((f) => f.id === focoId)?.nome ?? null,
        };
        aggH += esp.totalGeral;
        aggImp += esp.totalPorCategoria.IMPORTANTE;
        aggUrg += esp.totalPorCategoria.URGENTE;
        aggDisp += esp.totalPorCategoria.DISPERSO;
        comDados += 1;
      }
    }

    membros.push(resumo);
  }

  const aggTot = aggImp + aggUrg + aggDisp || 1;
  return {
    org: escopo.org,
    ehDono: escopo.ehDono,
    membros,
    agregado: {
      totalHoras: aggH,
      pImportante: aggImp / aggTot,
      pUrgente: aggUrg / aggTot,
      pDisperso: aggDisp / aggTot,
      comDados,
      total: escopo.membros.length,
    },
  };
}
