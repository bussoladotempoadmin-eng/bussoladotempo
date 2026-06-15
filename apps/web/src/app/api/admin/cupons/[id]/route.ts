import { NextResponse } from 'next/server';
import { getSuperAdmin } from '@/lib/super-admin';
import { alternarCupom } from '@/lib/cupons';

export const dynamic = 'force-dynamic';

// PATCH /api/admin/cupons/:id  body: { ativo: boolean } — ativa/desativa (soft-delete).
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const admin = await getSuperAdmin();
  if (!admin) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });

  const body = await req.json().catch(() => null);
  if (typeof body?.ativo !== 'boolean') return NextResponse.json({ error: 'Informe ativo' }, { status: 422 });
  await alternarCupom(params.id, body.ativo);
  return NextResponse.json({ ok: true });
}
