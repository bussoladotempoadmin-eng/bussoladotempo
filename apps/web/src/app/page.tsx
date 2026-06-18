import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { getCurrentWorkspace } from '@/lib/workspace';
import { prisma } from '@bussola/db';
import { currentIsoWeek } from '@/lib/semana';
import { ThemeToggle } from '@/components/theme-toggle';
import { UserMenu } from '@/components/user-menu';
import { Compass } from 'lucide-react';
import { PainelDia } from './painel-dia';
import type { BlocoDTO, FrenteOption } from './semana/[iso]/blocos-manager';
import { NudgeBanner } from './nudge-banner';
import { nudgeRevisao } from '@/lib/nudge-revisao';
import { SugestoesGestor } from './sugestoes-gestor';
import { sugestoesPendentes } from '@/lib/equipe';
import { AtivarLembretes } from '@/components/ativar-lembretes';
import { garantirAssinatura, getEntitlements } from '@/lib/assinatura';
import { BLOQUEIO_ATIVO } from '@/lib/acesso';
import { AvisoPlano } from './aviso-plano';
import { FirstRun } from '@/components/tour/first-run';
import { TourButton } from '@/components/tour/tour-button';

export default async function Home() {
  const session = await getServerSession(authOptions);

  // Marketing agora vive na LP (domínio raiz). O app (app.bussoladotempo.com.br)
  // manda quem não está logado direto pro login.
  if (!session?.user) {
    redirect('/login');
  }

  // Garante que quem entrou direto (Google/link mágico) ganhe um trial e
  // apareça no painel. Depois lê os entitlements pra decidir o aviso de plano.
  await garantirAssinatura(session.user.id);
  const ent = await getEntitlements(session.user.id);

  // Conta suspensa/cancelada → tela de regularização (só bloqueia esses status).
  if (BLOQUEIO_ATIVO && ent.temAssinatura && !ent.ativa) {
    redirect('/conta-suspensa');
  }

  // Tour guiado inicial (mostra uma vez).
  const conta = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { onboardingVisto: true },
  });

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
              include: {
                subtarefas: {
                  select: { id: true, texto: true, feito: true, hora: true, horaFim: true },
                  orderBy: { ordem: 'asc' },
                },
              },
            })
          : Promise.resolve([]),
        prisma.frente.findMany({
          where: { workspaceId: workspace.id, ativa: true },
          orderBy: { ordem: 'asc' },
        }),
      ])
    : [[], []];

  const painelBlocos: BlocoDTO[] = blocos.map((b) => ({
    id: b.id,
    diaSemana: b.diaSemana,
    horaInicio: b.horaInicio,
    horaFim: b.horaFim,
    tarefa: b.tarefa,
    frenteId: b.frenteId,
    categoriaPlanejada: b.categoriaPlanejada,
    categoriaRealizada: b.categoriaRealizada,
    concluido: b.concluido,
    concluidoEm: b.concluidoEm ? b.concluidoEm.toISOString() : null,
    horaRealInicio: b.horaRealInicio,
    horaRealFim: b.horaRealFim,
    prioridadeSemana: b.prioridadeSemana,
    subtarefas: b.subtarefas.map((t) => ({
      id: t.id,
      texto: t.texto,
      feito: t.feito,
      hora: t.hora,
      horaFim: t.horaFim,
    })),
  }));
  const painelFrentes: FrenteOption[] = frentes.map((f) => ({
    id: f.id,
    nome: f.nome,
    icone: f.icone,
    cor: f.cor,
  }));
  const prioridades = [semana?.prioridade1, semana?.prioridade2, semana?.prioridade3].filter(
    (p): p is string => Boolean(p),
  );
  const nudge = workspace ? await nudgeRevisao(workspace.id) : null;
  const sugestoes = await sugestoesPendentes(session.user.id);

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
          <TourButton />
          <ThemeToggle />
          <UserMenu />
        </div>
      </header>

      {!conta?.onboardingVisto && <FirstRun />}

      {ent.temAssinatura && !ent.planoConfirmado && (
        <AvisoPlano planoNome={ent.planoNome ?? 'plano Essencial'} diasRestantes={ent.diasRestantesTrial} />
      )}

      {sugestoes.length > 0 && (
        <div className="container mb-2">
          <SugestoesGestor inicial={sugestoes} />
        </div>
      )}

      {nudge && (
        <div className="container mb-2">
          <NudgeBanner nudge={nudge} />
        </div>
      )}

      <div className="container mb-2">
        <AtivarLembretes />
      </div>

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
