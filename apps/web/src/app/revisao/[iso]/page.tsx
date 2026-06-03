import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { authOptions } from '@/lib/auth';
import { getCurrentWorkspace } from '@/lib/workspace';
import { prisma } from '@bussola/db';
import {
  isIsoWeek,
  currentIsoWeek,
  shiftIsoWeek,
  isoWeekRangeLabel,
} from '@/lib/semana';
import {
  calcEspelho,
  gerarInsights,
  type BlocoEspelho,
} from '@bussola/domain';
import { ThemeToggle } from '@/components/theme-toggle';
import { UserMenu } from '@/components/user-menu';
import { Compass, ArrowLeft } from 'lucide-react';
import { RevisaoForm, type RevisaoData } from './revisao-form';

export const metadata = { title: 'Revisão · Bússola do Tempo' };

export default async function RevisaoPage({ params }: { params: { iso: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect(`/login?callbackUrl=/revisao/${params.iso}`);

  const iso = decodeURIComponent(params.iso);
  if (!isIsoWeek(iso)) redirect(`/revisao/${currentIsoWeek()}`);

  const workspace = await getCurrentWorkspace();
  if (!workspace) redirect('/login');

  const proximaIso = shiftIsoWeek(iso, 1);
  const [semana, frentes, proxima] = await Promise.all([
    prisma.semanaPlano.findUnique({
      where: { workspaceId_semanaIso: { workspaceId: workspace.id, semanaIso: iso } },
      include: { revisao: true },
    }),
    prisma.frente.findMany({ where: { workspaceId: workspace.id }, orderBy: { ordem: 'asc' } }),
    prisma.semanaPlano.findUnique({
      where: { workspaceId_semanaIso: { workspaceId: workspace.id, semanaIso: proximaIso } },
    }),
  ]);

  const blocos = semana
    ? await prisma.bloco.findMany({ where: { semanaPlanoId: semana.id } })
    : [];

  const espelho = calcEspelho(
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
  const insights = gerarInsights(
    espelho,
    frentes.map((f) => ({ id: f.id, nome: f.nome, icone: f.icone })),
  );
  const frenteById = new Map(frentes.map((f) => [f.id, f]));

  const data: RevisaoData = {
    semanaIso: iso,
    rangeLabel: isoWeekRangeLabel(iso),
    proximaIso,
    proximaRangeLabel: isoWeekRangeLabel(proximaIso),
    resumo: {
      totalGeral: espelho.totalGeral,
      importante: espelho.percentuaisPorCategoria.IMPORTANTE,
      urgente: espelho.percentuaisPorCategoria.URGENTE,
      disperso: espelho.percentuaisPorCategoria.DISPERSO,
    },
    desvios: espelho.topDesvios.map((d) => ({
      tarefa: d.tarefa ?? 'Bloco',
      frenteNome: frenteById.get(d.frenteId)?.nome ?? '',
      frenteIcone: frenteById.get(d.frenteId)?.icone ?? '',
      planejada: d.categoriaPlanejada,
      realizada: d.categoriaRealizada,
      horas: d.duracaoHoras,
    })),
    insights: insights.map((i) => ({ tipo: i.tipo, titulo: i.titulo, texto: i.texto })),
    initial: {
      retroFuncionou: semana?.revisao?.retroFuncionou ?? '',
      retroNaoFuncionou: semana?.revisao?.retroNaoFuncionou ?? '',
      retroMudanca: semana?.revisao?.retroMudanca ?? '',
      sensacaoMedia: semana?.revisao?.sensacaoMedia ?? null,
      fechada: Boolean(semana?.revisao?.fechadaEm),
      riscoProxima: proxima?.riscoSemana ?? '',
      prioridadesProxima: [
        proxima?.prioridade1 ?? '',
        proxima?.prioridade2 ?? '',
        proxima?.prioridade3 ?? '',
      ],
    },
  };

  return (
    <main className="min-h-screen">
      <header className="container flex items-center justify-between py-6">
        <Link href="/" className="flex items-center gap-2 text-lg font-bold">
          <Compass className="h-6 w-6 text-primary" />
          <span>Bússola do Tempo</span>
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <UserMenu />
        </div>
      </header>

      <section className="container max-w-2xl py-10">
        <Link
          href="/"
          className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Link>

        <h1 className="text-3xl font-extrabold tracking-tight">Revisão da semana</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {iso} · {data.rangeLabel}
        </p>

        <div className="mt-8">
          <RevisaoForm data={data} />
        </div>
      </section>
    </main>
  );
}
