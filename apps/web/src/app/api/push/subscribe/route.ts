import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/workspace';
import { prisma } from '@bussola/db';

export const dynamic = 'force-dynamic';

// POST /api/push/subscribe — salva a inscrição do navegador
// body: { endpoint, keys: { p256dh, auth } }
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const body = await req.json().catch(() => null);
  const endpoint = typeof body?.endpoint === 'string' ? body.endpoint : '';
  const p256dh = typeof body?.keys?.p256dh === 'string' ? body.keys.p256dh : '';
  const auth = typeof body?.keys?.auth === 'string' ? body.keys.auth : '';
  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json({ error: 'Inscrição inválida' }, { status: 400 });
  }

  // upsert por endpoint: se já existe, garante que é deste usuário e atualiza chaves.
  await prisma.pushSubscription.upsert({
    where: { endpoint },
    create: { userId: user.id, endpoint, p256dh, auth },
    update: { userId: user.id, p256dh, auth },
  });

  return NextResponse.json({ ok: true });
}

// DELETE /api/push/subscribe — remove a inscrição  body: { endpoint }
export async function DELETE(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const body = await req.json().catch(() => null);
  const endpoint = typeof body?.endpoint === 'string' ? body.endpoint : '';
  if (!endpoint) return NextResponse.json({ error: 'endpoint ausente' }, { status: 400 });

  await prisma.pushSubscription.deleteMany({ where: { endpoint, userId: user.id } });
  return NextResponse.json({ ok: true });
}
