import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { authOptions } from '@/lib/auth';
import { getCurrentWorkspace } from '@/lib/workspace';
import { prisma } from '@bussola/db';
import { ThemeToggle } from '@/components/theme-toggle';
import { UserMenu } from '@/components/user-menu';
import { Compass, ArrowLeft } from 'lucide-react';
import {
  CompromissosManager,
  type CompromissoDTO,
  type FrenteOption,
} from './compromissos-manager';

export const metadata = {
  title: 'Compromissos fixos · Bússola do Tempo',
};

export default async function CompromissosPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect('/login?callbackUrl=/compromissos');
  }

  const workspace = await getCurrentWorkspace();
  const [compromissos, frentes] = workspace
    ? await Promise.all([
        prisma.compromissoFixo.findMany({
          where: { workspaceId: workspace.id },
          orderBy: [{ diaSemana: 'asc' }, { horaInicio: 'asc' }],
        }),
        prisma.frente.findMany({
          where: { workspaceId: workspace.id, ativa: true },
          orderBy: { ordem: 'asc' },
        }),
      ])
    : [[], []];

  const initialCompromissos: CompromissoDTO[] = compromissos.map((c) => ({
    id: c.id,
    diaSemana: c.diaSemana,
    horaInicio: c.horaInicio,
    horaFim: c.horaFim,
    descricao: c.descricao,
    frenteId: c.frenteId,
    categoria: c.categoria,
  }));

  const frenteOptions: FrenteOption[] = frentes.map((f) => ({
    id: f.id,
    nome: f.nome,
    icone: f.icone,
    cor: f.cor,
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

      <section className="container max-w-3xl py-10">
        <Link
          href="/"
          className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Link>

        <h1 className="text-3xl font-extrabold tracking-tight">Compromissos fixos</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          O que se repete toda semana em horário fixo — treino, mentoria, lives. A agenda
          sugerida vai respeitar esses blocos como intocáveis.
        </p>

        <div className="mt-8">
          <CompromissosManager
            initialCompromissos={initialCompromissos}
            frentes={frenteOptions}
          />
        </div>
      </section>
    </main>
  );
}
