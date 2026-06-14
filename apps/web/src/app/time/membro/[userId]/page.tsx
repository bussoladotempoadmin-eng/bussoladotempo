import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { authOptions } from '@/lib/auth';
import { getSessionUser } from '@/lib/workspace';
import { podeVerMembro } from '@/lib/equipe';
import { prisma } from '@bussola/db';
import { currentIsoWeek, shiftIsoWeek, isoWeekLabel, isIsoWeek } from '@/lib/semana';
import { calcEspelho, gerarInsights, type BlocoEspelho } from '@bussola/domain';
import { ThemeToggle } from '@/components/theme-toggle';
import { UserMenu } from '@/components/user-menu';
import { Compass, ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { EspelhoPainel } from '@/app/revisao/[iso]/espelho-painel';
import { SugerirForm } from './sugerir-form';

export const metadata = { title: 'Membro · Bússola do Tempo' };

export default async function MembroPage({
  params,
  searchParams,
}: {
  params: { userId: string };
  searchParams: { semana?: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect(`/login?callbackUrl=/time/membro/${params.userId}`);

  const gestor = await getSessionUser();
  if (!gestor || !(await podeVerMembro(gestor.id, params.userId))) {
    redirect('/time/painel');
  }

  const iso =
    searchParams.semana && isIsoWeek(searchParams.semana) ? searchParams.semana : currentIsoWeek();

  const membro = await prisma.user.findUnique({
    where: { id: params.userId },
    select: { name: true, email: true },
  });
  const nome = membro?.name?.trim() || membro?.email || 'Membro';

  const ws = await prisma.workspace.findFirst({
    where: { userId: params.userId },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  });
  const semana = ws
    ? await prisma.semanaPlano.findUnique({
        where: { workspaceId_semanaIso: { workspaceId: ws.id, semanaIso: iso } },
        select: { id: true },
      })
    : null;
  const frentes = ws
    ? await prisma.frente.findMany({ where: { workspaceId: ws.id }, orderBy: { ordem: 'asc' } })
    : [];
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
          href={`/time/painel?semana=${iso}`}
          className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Painel do time
        </Link>

        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Espelho de
            </p>
            <h1 className="text-3xl font-extrabold tracking-tight">{nome}</h1>
            <p className="mt-1 text-sm text-muted-foreground">Semana de {isoWeekLabel(iso)}</p>
          </div>
          <div className="flex items-center gap-1">
            <Link
              href={`/time/membro/${params.userId}?semana=${shiftIsoWeek(iso, -1)}`}
              className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-sm font-semibold text-muted-foreground hover:bg-muted"
            >
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </Link>
            <Link
              href={`/time/membro/${params.userId}?semana=${shiftIsoWeek(iso, 1)}`}
              className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-sm font-semibold text-muted-foreground hover:bg-muted"
            >
              Próxima
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        <div className="mt-6">
          <SugerirForm paraUserId={params.userId} primeiroNome={nome.split(' ')[0]} />
        </div>

        <div className="mt-8">
          <EspelhoPainel espelho={espelho} insights={insights} frentes={frentes} />
        </div>

        <div className="mt-6 flex items-start gap-2 rounded-xl border border-dashed border-border bg-card/50 p-4 text-xs text-muted-foreground">
          <span className="text-base">🔒</span>
          <p>
            Você vê <b className="text-foreground">o tempo</b> de {nome.split(' ')[0]} — não as
            reflexões pessoais (o &ldquo;o que não funcionou&rdquo;, o &ldquo;como me senti&rdquo;),
            que ficam privadas.
          </p>
        </div>
      </section>
    </main>
  );
}
