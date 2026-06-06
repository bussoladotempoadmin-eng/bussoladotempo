import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { getCurrentWorkspace } from '@/lib/workspace';
import { prisma } from '@bussola/db';
import { currentIsoWeek } from '@/lib/semana';
import { ThemeToggle } from '@/components/theme-toggle';
import { UserMenu } from '@/components/user-menu';
import { Compass, Construction } from 'lucide-react';
import { PainelDia, type PainelBloco, type PainelFrente } from './painel-dia';

export default async function Home() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return <LandingHome />;
  }

  const workspace = await getCurrentWorkspace();
  const iso = currentIsoWeek();

  // Usuário novo (sem nenhuma frente) → fluxo de boas-vindas.
  if (workspace) {
    const totalFrentes = await prisma.frente.count({ where: { workspaceId: workspace.id } });
    if (totalFrentes === 0) redirect('/onboarding');
  }

  const semana = workspace
    ? await prisma.semanaPlano.findUnique({
        where: { workspaceId_semanaIso: { workspaceId: workspace.id, semanaIso: iso } },
      })
    : null;

  const [blocos, frentes] = workspace
    ? await Promise.all([
        semana
          ? prisma.bloco.findMany({
              where: { semanaPlanoId: semana.id },
              include: { subtarefas: { select: { feito: true } } },
            })
          : Promise.resolve([]),
        prisma.frente.findMany({
          where: { workspaceId: workspace.id, ativa: true },
          orderBy: { ordem: 'asc' },
        }),
      ])
    : [[], []];

  const painelBlocos: PainelBloco[] = blocos.map((b) => ({
    id: b.id,
    diaSemana: b.diaSemana,
    horaInicio: b.horaInicio,
    horaFim: b.horaFim,
    tarefa: b.tarefa,
    frenteId: b.frenteId,
    categoriaPlanejada: b.categoriaPlanejada,
    categoriaRealizada: b.categoriaRealizada,
    tarefasTotal: b.subtarefas.length,
    tarefasFeitas: b.subtarefas.filter((t) => t.feito).length,
  }));
  const painelFrentes: PainelFrente[] = frentes.map((f) => ({
    id: f.id,
    nome: f.nome,
    icone: f.icone,
    cor: f.cor,
  }));
  const prioridades = [semana?.prioridade1, semana?.prioridade2, semana?.prioridade3].filter(
    (p): p is string => Boolean(p),
  );
  const frenteMap = new Map(frentes.map((f) => [f.id, f]));
  const prioridadeBlocos = blocos
    .filter((b) => b.prioridadeSemana != null)
    .sort((a, b) => (a.prioridadeSemana ?? 0) - (b.prioridadeSemana ?? 0))
    .map((b) => ({
      ordem: b.prioridadeSemana as number,
      tarefa: b.tarefa,
      frenteIcone: frenteMap.get(b.frenteId)?.icone ?? '',
      frenteNome: frenteMap.get(b.frenteId)?.nome ?? '',
      frenteCor: frenteMap.get(b.frenteId)?.cor ?? '#999',
    }));

  return (
    <main className="min-h-screen">
      <header className="container flex items-center justify-between py-6">
        <div className="flex items-center gap-2 text-lg font-bold">
          <Compass className="h-6 w-6 text-primary" />
          <span>Bússola do Tempo</span>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <UserMenu />
        </div>
      </header>

      <PainelDia
        nome={session.user.name ?? ''}
        semanaIso={iso}
        prioridades={prioridades}
        prioridadeBlocos={prioridadeBlocos}
        blocos={painelBlocos}
        frentes={painelFrentes}
      />
    </main>
  );
}

function LandingHome() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-frente-doctum-soft blur-3xl" />
        <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-frente-tribo-soft blur-3xl" />
      </div>

      <header className="container flex items-center justify-between py-6">
        <div className="flex items-center gap-2 text-lg font-bold">
          <Compass className="h-6 w-6 text-primary" />
          <span>Bússola do Tempo</span>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <UserMenu />
        </div>
      </header>

      <section className="container flex flex-col items-center justify-center gap-8 py-20 text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <Construction className="h-3.5 w-3.5" />
          Em construção · Fase 1 (MVP)
        </span>

        <h1 className="max-w-3xl text-balance text-5xl font-extrabold leading-tight tracking-tight md:text-6xl">
          Onde seu tempo <span className="text-primary">realmente foi</span>?
        </h1>

        <p className="max-w-2xl text-balance text-lg text-muted-foreground md:text-xl">
          A Bússola do Tempo cruza suas frentes de trabalho com 3 categorias —
          Importante, Urgente e Disperso — pra mostrar, com números, como sua
          semana realmente se distribuiu.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
          <span className="rounded-full bg-triade-importante-soft px-4 py-2 text-sm font-bold text-triade-importante">
            🎯 Importante
          </span>
          <span className="rounded-full bg-triade-urgente-soft px-4 py-2 text-sm font-bold text-triade-urgente">
            🔥 Urgente
          </span>
          <span className="rounded-full bg-triade-disperso-soft px-4 py-2 text-sm font-bold text-triade-disperso">
            💨 Disperso
          </span>
        </div>

        <div className="grid w-full max-w-3xl grid-cols-1 gap-4 pt-8 md:grid-cols-3">
          <StatusCard label="Etapa 12" title="Swipe rápido" status="✅ Concluída" />
          <StatusCard label="Etapa 13" title="Fechamento da noite" status="✅ Concluída" />
          <StatusCard label="Etapa 14" title="PWA (instalável)" status="✅ Concluída" />
        </div>
      </section>

      <footer className="container border-t border-border py-8 text-center text-sm text-muted-foreground">
        Bússola do Tempo · em desenvolvimento por Lucas Silveira
      </footer>
    </main>
  );
}

function StatusCard({
  label,
  title,
  status,
}: {
  label: string;
  title: string;
  status: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 text-left shadow-sm transition-shadow hover:shadow-md">
      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 text-base font-semibold text-foreground">{title}</p>
      <p className="mt-3 text-sm text-muted-foreground">{status}</p>
    </div>
  );
}
