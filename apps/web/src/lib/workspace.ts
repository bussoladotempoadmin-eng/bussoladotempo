/**
 * Helpers de sessão + workspace.
 * Todo usuário logado tem (ou ganha, no primeiro acesso) um workspace.
 */
import { getServerSession } from 'next-auth';
import { prisma } from '@bussola/db';
import { authOptions } from './auth';

export async function getSessionUser() {
  const session = await getServerSession(authOptions);
  return session?.user ?? null;
}

/**
 * Retorna o workspace do usuário logado, criando um vazio se ainda não existir.
 * Retorna null se não houver sessão.
 */
export async function getCurrentWorkspace() {
  const user = await getSessionUser();
  if (!user) return null;

  const existing = await prisma.workspace.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: 'asc' },
  });
  if (existing) return existing;

  return prisma.workspace.create({
    data: { userId: user.id },
  });
}
