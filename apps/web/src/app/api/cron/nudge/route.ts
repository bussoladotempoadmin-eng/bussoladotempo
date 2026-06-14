import { NextResponse } from 'next/server';
import { prisma } from '@bussola/db';
import { nudgeRevisao } from '@/lib/nudge-revisao';
import { enviarPushParaUsuario, pushHabilitado } from '@/lib/push';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Cron do lembrete do ritual semanal (Vercel Cron).
 * Agendado pra domingo (lembrete) e segunda (graça) — ver vercel.json.
 * A própria nudgeRevisao decide se é dia/janela e se já foi concluído;
 * fora disso retorna null e nada é enviado.
 *
 * Protegido por CRON_SECRET (Vercel manda Authorization: Bearer <secret>).
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get('authorization');
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'não autorizado' }, { status: 401 });
    }
  }

  if (!pushHabilitado()) {
    return NextResponse.json({ ok: false, motivo: 'VAPID não configurado' }, { status: 200 });
  }

  // Só usuários que têm pelo menos uma inscrição push.
  const inscritos = await prisma.pushSubscription.findMany({
    distinct: ['userId'],
    select: { userId: true },
  });

  let enviados = 0;
  let avaliados = 0;

  for (const { userId } of inscritos) {
    avaliados += 1;
    // Workspace principal (o mais antigo) do usuário.
    const ws = await prisma.workspace.findFirst({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });
    if (!ws) continue;

    const nudge = await nudgeRevisao(ws.id);
    if (!nudge) continue; // fora da janela ou já concluído

    const entregues = await enviarPushParaUsuario(userId, {
      title: nudge.titulo,
      body: nudge.texto,
      url: `/revisao/${nudge.iso}`,
      tag: 'ritual-semanal',
    });
    if (entregues > 0) enviados += 1;
  }

  return NextResponse.json({ ok: true, avaliados, enviados });
}
