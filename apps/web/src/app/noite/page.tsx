import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { authOptions } from '@/lib/auth';
import { getCurrentWorkspace } from '@/lib/workspace';
import { prisma } from '@bussola/db';
import { currentIsoWeek } from '@/lib/semana';
import { ThemeToggle } from '@/components/theme-toggle';
import { UserMenu } from '@/components/user-menu';
import { Compass, ArrowLeft, Moon } from 'lucide-react';
import { NoiteForm, type NoiteBloco } from './noite-form';

export const metadata = { title: 'Fechamento da noite · Bússola do Tempo' };

export default async function NoitePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login?callbackUrl=/noite');

  const workspace = await getCurrentWorkspace();
  const iso = currentIsoWeek();
  const semana = workspace
    ? await prisma.semanaPlano.findUnique({
        where: { workspaceId_semanaIso: { workspaceId: workspace.id, semanaIso: iso } },
      })
    : null;
  const blocos = semana
    ? await prisma.bloco.findMany({ where: { semanaPlanoId: semana.id } })
    : [];

  const painelBlocos: NoiteBloco[] = blocos.map((b) => ({
    diaSemana: b.diaSemana,
    horaInicio: b.horaInicio,
    horaFim: b.horaFim,
    tarefa: b.tarefa,
    categoriaPlanejada: b.categoriaPlanejada,
    categoriaRealizada: b.categoriaRealizada,
  }));

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

      <section className="container max-w-xl py-10">
        <Link
          href="/"
          className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Link>

        <h1 className="flex items-center gap-2 text-3xl font-extrabold tracking-tight">
          <Moon className="h-7 w-7 text-primary" />
          Fechamento da noite
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Dois minutos pra fechar o dia em paz antes de dormir.
        </p>

        <div className="mt-8">
          <NoiteForm blocos={painelBlocos} />
        </div>
      </section>
    </main>
  );
}
