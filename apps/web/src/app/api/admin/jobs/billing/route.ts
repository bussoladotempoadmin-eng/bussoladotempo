import { NextResponse } from 'next/server';
import { getSuperAdmin } from '@/lib/super-admin';
import { rodarMaquinaBilling } from '@/lib/billing-state-machine';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// POST /api/admin/jobs/billing — dispara a máquina de estados sob demanda (teste).
export async function POST() {
  const admin = await getSuperAdmin();
  if (!admin) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
  const r = await rodarMaquinaBilling();
  return NextResponse.json({ ok: true, ...r });
}
