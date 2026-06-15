import { NextResponse } from 'next/server';
import { prisma } from '@bussola/db';
import { getSessionUser } from '@/lib/workspace';

export const dynamic = 'force-dynamic';

// POST /api/conta/onboarding — marca o tour guiado como visto (pular/concluir).
export async function POST() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  await prisma.user.update({ where: { id: user.id }, data: { onboardingVisto: true } });
  return NextResponse.json({ ok: true });
}
