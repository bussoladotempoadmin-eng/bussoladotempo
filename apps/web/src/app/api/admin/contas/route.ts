import { NextResponse } from 'next/server';
import { getSuperAdmin } from '@/lib/super-admin';
import { criarOuAtualizarAssinatura } from '@/lib/admin-billing';
import type { CicloPlano, StatusAssinatura } from '@bussola/db';

export const dynamic = 'force-dynamic';

// POST /api/admin/contas — cria/atualiza a assinatura de um usuário (por e-mail).
export async function POST(req: Request) {
  const admin = await getSuperAdmin();
  if (!admin) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });

  const body = await req.json().catch(() => null);
  const email = typeof body?.email === 'string' ? body.email : '';
  const planoSlug = typeof body?.planoSlug === 'string' ? body.planoSlug : '';
  if (!email || !planoSlug) return NextResponse.json({ error: 'Informe e-mail e plano.' }, { status: 422 });

  const r = await criarOuAtualizarAssinatura({
    email,
    planoSlug,
    assentos: Number(body?.assentos) || 1,
    ciclo: (body?.ciclo as CicloPlano) || 'MENSAL',
    status: (body?.status as StatusAssinatura) || 'TRIAL',
    diasTrial: Number(body?.diasTrial) || 14,
  });
  if (!r.ok) return NextResponse.json({ error: r.erro }, { status: 422 });
  return NextResponse.json({ ok: true, assinaturaId: r.assinaturaId });
}
