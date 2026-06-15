import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { authOptions } from '@/lib/auth';
import { getCurrentWorkspace } from '@/lib/workspace';
import { prisma } from '@bussola/db';
import { ThemeToggle } from '@/components/theme-toggle';
import { UserMenu } from '@/components/user-menu';
import { Compass, ArrowLeft } from 'lucide-react';
import { FrentesManager, type FrenteDTO } from './frentes-manager';
import { exigirAcesso } from '@/lib/acesso';

export const metadata = {
  title: 'Frentes · Bússola do Tempo',
};

export default async function FrentesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect('/login?callbackUrl=/frentes');
  }
  await exigirAcesso(session.user.id);

  const workspace = await getCurrentWorkspace();
  const frentes = workspace
    ? await prisma.frente.findMany({
        where: { workspaceId: workspace.id },
        orderBy: { ordem: 'asc' },
      })
    : [];

  const initialFrentes: FrenteDTO[] = frentes.map((f) => ({
    id: f.id,
    nome: f.nome,
    icone: f.icone,
    cor: f.cor,
    orcamentoHoras: f.orcamentoHoras,
    ordem: f.ordem,
    ativa: f.ativa,
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

      <section className="container max-w-2xl py-10">
        <Link
          href="/"
          className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Link>

        <h1 className="text-3xl font-extrabold tracking-tight">Suas frentes</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          As áreas em que você divide seu tempo. Defina um orçamento de horas por semana
          pra cada uma — é a base do Espelho que vem nas próximas etapas. Arraste pra
          reordenar.
        </p>

        <div className="mt-8">
          <FrentesManager initialFrentes={initialFrentes} />
        </div>
      </section>
    </main>
  );
}
