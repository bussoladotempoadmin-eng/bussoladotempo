/**
 * Guard do painel de gestão do produto (Super Admin).
 * Só usuários com User.superAdmin = true entram. Tudo aqui é server-side.
 */
import { redirect } from 'next/navigation';
import { prisma } from '@bussola/db';
import { getSessionUser } from './workspace';

export async function isSuperAdmin(userId: string): Promise<boolean> {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { superAdmin: true },
  });
  return Boolean(u?.superAdmin);
}

/** Para páginas: garante super admin ou redireciona. Retorna o user. */
export async function requireSuperAdmin() {
  const user = await getSessionUser();
  if (!user) redirect('/login?callbackUrl=/admin');
  if (!(await isSuperAdmin(user.id))) redirect('/');
  return user;
}

/** Para API routes: retorna o user se for super admin, senão null. */
export async function getSuperAdmin() {
  const user = await getSessionUser();
  if (!user) return null;
  return (await isSuperAdmin(user.id)) ? user : null;
}
