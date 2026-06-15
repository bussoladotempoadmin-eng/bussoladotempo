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

const FALLBACK_PERMISSIVO = true;

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
  };
}

/** Entitlements do usuário logado (com fallback de transição). */
export async function getEntitlements(userId: string): Promise<Entitlements> {
  const assinatura = await resolveAssinatura(userId);
  if (assinatura) return entitlementsDe(assinatura);
  return FALLBACK_PERMISSIVO ? ENTITLEMENT_LIBERADO : ENTITLEMENT_BLOQUEADO;
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
