import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { authOptions } from '@/lib/auth';
import { getCurrentWorkspace } from '@/lib/workspace';
import { prisma } from '@bussola/db';
import { currentIsoWeek, shiftIsoWeek, isoWeekRangeLabel } from '@/lib/semana';
import { ThemeToggle } from '@/components/theme-toggle';
import { UserMenu } from '@/components/user-menu';
import { Compass, ArrowLeft } from 'lucide-react';
import { AgendaPadraoView } from './agenda-padrao-view';
import { AgendaIAView } from './agenda-ia-view';
import { statusCota } from '@/lib/cota-ia';

export const metadata = {
  title: 'Agenda padrão · Bússola do Tempo',
};

export default async function AgendaPadraoPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect('/login?callbackUrl=/agenda-padrao');
  }

  const workspace = await getCurrentWorkspace();
  const [frentesCount, compromissosCount, frentes] = workspace
    ? await Promise.all([
        prisma.frente.count({ where: { workspaceId: workspace.id, ativa: true } }),
        prisma.compromissoFixo.count({ where: { workspaceId: workspace.id } }),
        prisma.frente.findMany({
          where: { workspaceId: workspace.id, ativa: true },
          orderBy: { ordem: 'asc' },
          select: { id: true, nome: true, icone: true, cor: true },
        }),
      ])
    : [0, 0, []];

  const cota = workspace ? await statusCota(workspace.id) : null;

  const atualIso = currentIsoWeek();
  // Gerador determinístico: semana atual + próxima (ponto de partida simples).
  const semanas = [
    { iso: atualIso, label: isoWeekRangeLabel(atualIso) },
    { iso: shiftIsoWeek(atualIso, 1), label: isoWeekRangeLabel(shiftIsoWeek(atualIso, 1)) },
  ];
  // IA: deixa escolher as próximas ~6 semanas pra planejar mais à frente.
  const semanasIA = Array.from({ length: 6 }, (_, i) => {
    const iso = shiftIsoWeek(atualIso, i);
    return { iso, label: isoWeekRangeLabel(iso) };
  });

  return (
    <main className="min-h-screen">
      <header className="container flex items-center justify-between py-6 lg:hidden">
        <Link href="/" className="flex items-center gap-2 text-lg font-bold">
          <Compass className="h-6 w-6 text-primary" />
          <span>Bússola do Tempo</span>
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <UserMenu />
        </div>
      </header>

      <section className="container max-w-5xl py-10">
        <Link
          href="/"
          className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Link>

        <h1 className="text-3xl font-extrabold tracking-tight">Agenda padrão</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          A partir das suas frentes (orçamento de horas) e dos compromissos fixos, o
          sistema sugere uma distribuição-base da semana — preferindo manhãs e
          espalhando entre os dias. É um ponto de partida; nas próximas etapas você
          ajusta bloco a bloco.
        </p>

        {frentesCount > 0 && (
          <div className="mt-8">
            <AgendaIAView frentes={frentes} semanas={semanasIA} cota={cota ?? undefined} />
          </div>
        )}

        <AgendaPadraoView
          frentesCount={frentesCount}
          compromissosCount={compromissosCount}
          semanas={semanas}
        />
      </section>
    </main>
  );
}
