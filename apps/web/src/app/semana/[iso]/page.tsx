import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { authOptions } from '@/lib/auth';
import { getCurrentWorkspace } from '@/lib/workspace';
import { prisma } from '@bussola/db';
import {
  getOrCreateSemana,
  isIsoWeek,
  currentIsoWeek,
  shiftIsoWeek,
  isoWeekRangeLabel,
} from '@/lib/semana';
import { ThemeToggle } from '@/components/theme-toggle';
import { UserMenu } from '@/components/user-menu';
import { Compass, ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { BlocosManager, type BlocoDTO, type FrenteOption } from './blocos-manager';

export const metadata = {
  title: 'Semana · Bússola do Tempo',
};

export default async function SemanaPage({ params }: { params: { iso: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect(`/login?callbackUrl=/semana/${params.iso}`);
  }

  const iso = decodeURIComponent(params.iso);
  if (!isIsoWeek(iso)) {
    redirect(`/semana/${currentIsoWeek()}`);
  }

  const workspace = await getCurrentWorkspace();
  if (!workspace) redirect('/login');

  const semana = await getOrCreateSemana(workspace.id, iso);
  const [blocos, frentes] = await Promise.all([
    prisma.bloco.findMany({
      where: { semanaPlanoId: semana.id },
      orderBy: [{ diaSemana: 'asc' }, { horaInicio: 'asc' }],
      include: { subtarefas: { orderBy: { ordem: 'asc' } } },
    }),
    prisma.frente.findMany({
      where: { workspaceId: workspace.id, ativa: true },
      orderBy: { ordem: 'asc' },
    }),
  ]);

  const initialBlocos: BlocoDTO[] = blocos.map((b) => ({
    id: b.id,
    diaSemana: b.diaSemana,
    horaInicio: b.horaInicio,
    horaFim: b.horaFim,
    tarefa: b.tarefa,
    frenteId: b.frenteId,
    categoriaPlanejada: b.categoriaPlanejada,
    categoriaRealizada: b.categoriaRealizada,
    prioridadeSemana: b.prioridadeSemana,
    subtarefas: b.subtarefas.map((t) => ({
      id: t.id,
      texto: t.texto,
      feito: t.feito,
      hora: t.hora,
    })),
  }));

  const frenteOptions: FrenteOption[] = frentes.map((f) => ({
    id: f.id,
    nome: f.nome,
    icone: f.icone,
    cor: f.cor,
  }));

  const semanaAnterior = shiftIsoWeek(iso, -1);
  const proximaSemana = shiftIsoWeek(iso, 1);

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

      <section className="container max-w-3xl py-10">
        <Link
          href="/"
          className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Link>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">Semana {iso}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{isoWeekRangeLabel(iso)}</p>
          </div>
          <div className="flex items-center gap-1">
            <Link
              href={`/semana/${semanaAnterior}`}
              className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted"
            >
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </Link>
            <Link
              href={`/semana/${proximaSemana}`}
              className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted"
            >
              Próxima
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        <div className="mt-8">
          <BlocosManager
            semanaIso={iso}
            initialBlocos={initialBlocos}
            frentes={frenteOptions}
          />
        </div>
      </section>
    </main>
  );
}
