/**
 * Camada de acesso do módulo de Time (Fase 4).
 * Modelo: Organizacao (dono = gestor) → MembroEquipe (vínculo user↔org).
 * O gestor vê os dados de tempo dos membros; reflexões ficam SEMPRE privadas
 * (isso é garantido em quem consome estes dados, não aqui).
 */
import { prisma } from '@bussola/db';

export type MembroInfo = {
  membroId: string; // id do vínculo MembroEquipe
  userId: string;
  nome: string;
  email: string;
  papel: 'GESTOR' | 'MEMBRO';
};

export type TimeGestor = {
  org: { id: string; nome: string };
  membros: MembroInfo[];
};

/** O time que este usuário GERENCIA (é dono). v1: um por gestor. */
export async function getOrgDoGestor(userId: string) {
  return prisma.organizacao.findFirst({
    where: { ownerId: userId },
    orderBy: { createdAt: 'asc' },
    select: { id: true, nome: true },
  });
}

export async function getTimeGestor(userId: string): Promise<TimeGestor | null> {
  const org = await getOrgDoGestor(userId);
  if (!org) return null;
  const membros = await prisma.membroEquipe.findMany({
    where: { organizacaoId: org.id },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: 'asc' },
  });
  return {
    org,
    membros: membros.map((m) => ({
      membroId: m.id,
      userId: m.userId,
      nome: m.user.name?.trim() || m.user.email,
      email: m.user.email,
      papel: m.papel,
    })),
  };
}

export async function criarOrganizacao(userId: string, nome: string) {
  const existente = await getOrgDoGestor(userId);
  if (existente) return existente;
  const nomeLimpo = nome.trim() || 'Meu time';
  return prisma.organizacao.create({
    data: { nome: nomeLimpo, ownerId: userId },
    select: { id: true, nome: true },
  });
}

export async function adicionarMembroPorEmail(
  gestorId: string,
  email: string,
): Promise<{ ok: boolean; erro?: string }> {
  const org = await getOrgDoGestor(gestorId);
  if (!org) return { ok: false, erro: 'Crie seu time primeiro.' };

  const alvo = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
    select: { id: true },
  });
  if (!alvo) {
    return {
      ok: false,
      erro: 'Essa pessoa precisa entrar no app (login) pelo menos uma vez antes de ser adicionada.',
    };
  }
  if (alvo.id === gestorId) {
    return { ok: false, erro: 'Você é o gestor — não precisa se adicionar como membro.' };
  }
  try {
    await prisma.membroEquipe.create({
      data: { organizacaoId: org.id, userId: alvo.id, papel: 'MEMBRO' },
    });
  } catch {
    return { ok: false, erro: 'Essa pessoa já está no time.' };
  }
  return { ok: true };
}

export async function removerMembro(gestorId: string, membroId: string): Promise<boolean> {
  const org = await getOrgDoGestor(gestorId);
  if (!org) return false;
  const res = await prisma.membroEquipe.deleteMany({
    where: { id: membroId, organizacaoId: org.id },
  });
  return res.count > 0;
}

/** O gestor pode ver o workspace deste membro? (checagem de permissão) */
export async function gestorPodeVerMembro(gestorId: string, membroUserId: string): Promise<boolean> {
  const org = await getOrgDoGestor(gestorId);
  if (!org) return false;
  const m = await prisma.membroEquipe.findFirst({
    where: { organizacaoId: org.id, userId: membroUserId },
    select: { id: true },
  });
  return m !== null;
}
