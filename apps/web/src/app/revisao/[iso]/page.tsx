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
import { Compass, ArrowLeft, ChevronLeft, ChevronRight, Pencil } from 'lucide-react';
import { RevisaoForm, type RevisaoData } from './revisao-form';
import { EspelhoPainel } from './espelho-painel';
import { RitualIA } from './ritual-ia';
import { lerRitualCache } from '@/lib/ai-agenda';

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

  // Cache do ritual de IA (se já gerou, mostra na hora, sem re-gastar crédito).
  const ritualInicial = blocos.length > 0 ? await lerRitualCache(workspace.id, iso) : null;

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

      <section className="container max-w-4xl py-10">
        <Link
          href="/"
          className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Link>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">Revisão da semana</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {iso} · {data.rangeLabel}
            </p>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              O ritual da semana num lugar só: veja os números, deixe a IA revisar e
              planejar a próxima, e feche a semana.
            </p>
          </div>
          <div className="flex items-center gap-1">
            <Link
              href={`/revisao/${shiftIsoWeek(iso, -1)}`}
              className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted"
            >
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </Link>
            <Link
              href={`/revisao/${shiftIsoWeek(iso, 1)}`}
              className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted"
            >
              Próxima
              <ChevronRight className="h-4 w-4" />
            </Link>
            <Link
              href={`/semana/${iso}`}
              className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"
            >
              <Pencil className="h-4 w-4" />
              Editar blocos
            </Link>
          </div>
        </div>

        {/* 📊 Espelho — números (intacto) + Coach Gentil */}
        <div className="mt-8">
          <EspelhoPainel espelho={espelho} insights={insights} frentes={frentes} />
        </div>

        {/* ✨ Comando combinado da IA */}
        {blocos.length > 0 && (
          <div className="mt-8">
            <RitualIA semanaIso={iso} frentes={frentes} inicial={ritualInicial} />
          </div>
        )}

        {/* ✍️ Fechar a semana (retrospectiva + próxima) */}
        <div className="mt-8">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-muted-foreground">
            Fechar a semana
          </h2>
          <RevisaoForm data={data} />
        </div>
      </section>
    </main>
  );
}
