import { NextResponse } from 'next/server';
import { rodarMaquinaBilling } from '@/lib/billing-state-machine';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Cron diário da máquina de estados de billing (Vercel Cron — ver vercel.json).
 * Avisa trials vencendo, gera cobrança, marca atraso e suspende.
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

  const r = await rodarMaquinaBilling();
  return NextResponse.json({ ok: true, ...r });
}
