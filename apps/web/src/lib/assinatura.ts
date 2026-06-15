/**
 * Camada de assinatura/entitlements (billing) — Fase 1.5.
 *
 * Resolve, pra um usuário logado, QUAL assinatura vale e O QUE ela destrava.
 * Regra "uma conta = uma cobrança": a Assinatura mora no dono (quem paga). Se
 * for plano de time, ela aponta pra Organizacao e cobre todos os membros.
 *
 * Resolução:
 *   1. O usuário é dono de uma Assinatura?              → é a dele.
 *   2. É membro de uma Organizacao que tem Assinatura?  → a do time cobre ele.
 *   3. Nenhuma das duas?                                → null (sem assinatura).
 *
 * IMPORTANTE — transição sem quebrar quem já usa:
 * hoje todo mundo tem tudo de graça. Enquanto FALLBACK_PERMISSIVO = true, quem
 * NÃO tem assinatura recebe acesso liberado (não bloqueia nada). Só depois do
 * backfill das assinaturas a gente vira pra false e o gating passa a valer.
 */
import { prisma } from '@bussola/db';
import type { Plano, Assinatura, StatusAssinatura, CicloPlano } from '@bussola/db';
import { enviarLeadParaTribo } from './tribo-lead';

const FALLBACK_PERMISSIVO = true;
const DIAS_TRIAL_PADRAO = 14;

export type Entitlements = {
  temAssinatura: boolean;
  status: StatusAssinatura | null;
  /** Tem acesso ao produto agora? (TRIAL/ATIVA/ATRASADA = sim; SUSPENSA/CANCELADA = não) */
  ativa: boolean;
  planoSlug: string | null;
  planoNome: string | null;
  moduloTimeAtivo: boolean;
  moduloComercialAtivo: boolean;
  geracoesIaMes: number;
  assentos: number;
  trialTerminaEm: Date | null;
  /** Dias restantes do trial (null se não está em trial). */
  diasRestantesTrial: number | null;
  /** Já escolheu plano conscientemente? (false = mostra o aviso de onboarding) */
  planoConfirmado: boolean;
};

// Entitlement de fallback quando não há assinatura (período de transição).
const ENTITLEMENT_LIBERADO: Entitlements = {
  temAssinatura: false,
  status: null,
  ativa: true,
  planoSlug: null,
  planoNome: null,
  moduloTimeAtivo: true,
  moduloComercialAtivo: true,
  geracoesIaMes: 6,
  assentos: 1,
  trialTerminaEm: null,
  diasRestantesTrial: null,
  planoConfirmado: true,
};

const ENTITLEMENT_BLOQUEADO: Entitlements = {
  ...ENTITLEMENT_LIBERADO,
  ativa: false,
  moduloTimeAtivo: false,
  moduloComercialAtivo: false,
};

type AssinaturaComPlano = Assinatura & { plano: Plano };

/** Acha a assinatura que vale pra este usuário (própria ou da organização dele). */
export async function resolveAssinatura(userId: string): Promise<AssinaturaComPlano | null> {
  // 1. Assinatura própria (o usuário é o dono/pagador).
  const propria = await prisma.assinatura.findUnique({
    where: { ownerUserId: userId },
    include: { plano: true },
  });
  if (propria) return propria;

  // 2. Assinatura do time: é membro de uma org que tem assinatura.
  const vinculo = await prisma.membroEquipe.findFirst({
    where: { userId, organizacao: { assinatura: { isNot: null } } },
    select: { organizacaoId: true },
  });
  if (vinculo) {
    const doTime = await prisma.assinatura.findUnique({
      where: { organizacaoId: vinculo.organizacaoId },
      include: { plano: true },
    });
    if (doTime) return doTime;
  }

  return null;
}

function diasAte(data: Date | null): number | null {
  if (!data) return null;
  const ms = data.getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

/** Converte uma assinatura+plano nos entitlements efetivos. */
export function entitlementsDe(assinatura: AssinaturaComPlano): Entitlements {
  const acesso =
    assinatura.status === 'TRIAL' ||
    assinatura.status === 'ATIVA' ||
    assinatura.status === 'ATRASADA';
  const emTrial = assinatura.status === 'TRIAL';
  return {
    temAssinatura: true,
    status: assinatura.status,
    ativa: acesso,
    planoSlug: assinatura.plano.slug,
    planoNome: assinatura.plano.nome,
    moduloTimeAtivo: acesso && assinatura.plano.moduloTimeAtivo,
    moduloComercialAtivo: acesso && assinatura.plano.moduloComercialAtivo,
    geracoesIaMes: assinatura.plano.geracoesIaMes,
    assentos: assinatura.assentos,
    trialTerminaEm: assinatura.trialTerminaEm,
    diasRestantesTrial: emTrial ? diasAte(assinatura.trialTerminaEm) : null,
    planoConfirmado: assinatura.planoConfirmado,
  };
}

/**
 * Garante que um usuário "solo" tenha assinatura. Se ele entrou direto
 * (Google/link mágico) e não tem nenhuma, cria um trial do Essencial marcado
 * como AUTO (não confirmado) — assim ele entra, mas vê o aviso pra escolher
 * plano, e você o enxerga no painel. Membros de time (cobertos pela org) e
 * quem já tem assinatura não são tocados. Best-effort: nunca quebra o acesso.
 */
export async function garantirAssinatura(userId: string): Promise<void> {
  try {
    const existente = await resolveAssinatura(userId);
    if (existente) return;

    // É membro de uma organização? Então o time cobre (não cria assinatura própria).
    const ehMembro = await prisma.membroEquipe.findFirst({
      where: { userId },
      select: { id: true },
    });
    if (ehMembro) return;

    const essencial = await prisma.plano.findUnique({
      where: { slug: 'essencial' },
      select: { id: true },
    });
    if (!essencial) return; // planos não semeados — não faz nada

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    });
    if (!user) return;

    // Cria de forma idempotente (ownerUserId é único): se outro request criou
    // no meio, o catch absorve a violação de unicidade.
    await prisma.assinatura.create({
      data: {
        ownerUserId: userId,
        planoId: essencial.id,
        status: 'TRIAL',
        origem: 'AUTO',
        planoConfirmado: false,
        trialTerminaEm: new Date(Date.now() + DIAS_TRIAL_PADRAO * 86400000),
      },
    });

    // Empurra como lead pro TriboCRM (no-op enquanto a API não está ligada).
    await enviarLeadParaTribo({ nome: user.name, email: user.email, origem: 'entrou-direto' });
  } catch (e) {
    // Não derruba o acesso por causa do provisionamento.
    console.error('[assinatura] garantirAssinatura falhou (ignorado):', e);
  }
}

/** Entitlements do usuário logado (com fallback de transição). */
export async function getEntitlements(userId: string): Promise<Entitlements> {
  const assinatura = await resolveAssinatura(userId);
  if (assinatura) return entitlementsDe(assinatura);
  return FALLBACK_PERMISSIVO ? ENTITLEMENT_LIBERADO : ENTITLEMENT_BLOQUEADO;
}

/** A assinatura do próprio usuário (dono), com plano — pra página "Meu Plano". */
export async function getMinhaAssinatura(userId: string) {
  return prisma.assinatura.findUnique({
    where: { ownerUserId: userId },
    include: { plano: true },
  });
}

/**
 * Usuário escolhe um plano em "Meu Plano". No lançamento (cobrança manual) isso
 * registra a escolha, esconde o aviso de onboarding e sinaliza pro super admin
 * que a conta quer ativar — quem ativa de fato é você, combinando o pagamento.
 */
export async function escolherPlano(
  userId: string,
  planoSlug: string,
  ciclo: CicloPlano = 'MENSAL',
  assentos = 1,
): Promise<{ ok: true } | { ok: false; erro: string }> {
  const assinatura = await prisma.assinatura.findUnique({
    where: { ownerUserId: userId },
    select: { id: true, status: true, origem: true },
  });
  if (!assinatura) return { ok: false, erro: 'Você ainda não tem uma assinatura.' };
  const plano = await prisma.plano.findUnique({ where: { slug: planoSlug }, select: { id: true } });
  if (!plano) return { ok: false, erro: 'Plano inválido.' };

  await prisma.assinatura.update({
    where: { id: assinatura.id },
    data: {
      planoId: plano.id,
      ciclo,
      assentos: Math.max(1, assentos),
      planoConfirmado: true,
      // Se ainda não está ativa, marca que aguarda ativação manual sua.
      aguardandoAtivacao: assinatura.status !== 'ATIVA',
      // "Entrou direto" que escolhe plano vira CADASTRO (escolha consciente).
      origem: assinatura.origem === 'AUTO' ? 'CADASTRO' : assinatura.origem,
    },
  });
  return { ok: true };
}

/**
 * Valor de uma cobrança da assinatura, na fórmula:
 *   valor = preçoBase(ciclo) + max(0, assentos - assentosIncluidos) × precoPorAssento
 * Planos por assento (Pro/Enterprise) têm assentosIncluidos = 0, então o valor
 * é simplesmente assentos × precoPorAssento.
 */
type PrecoPlano = Pick<Plano, 'precoMensal' | 'precoAnual' | 'precoPorAssento' | 'assentosIncluidos'>;

export function valorCobranca(plano: PrecoPlano, assentos: number, ciclo: CicloPlano): number {
  const base = ciclo === 'ANUAL' ? plano.precoAnual : plano.precoMensal;
  const extras = Math.max(0, assentos - plano.assentosIncluidos);
  const valor = base + extras * plano.precoPorAssento;
  return Math.round(valor * 100) / 100;
}
