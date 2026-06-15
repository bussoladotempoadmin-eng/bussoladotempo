import { NextResponse } from 'next/server';
import { getSuperAdmin } from '@/lib/super-admin';
import { criarParceiro } from '@/lib/comissoes';

export const dynamic = 'force-dynamic';

// POST /api/admin/parceiros — cria um parceiro (gera código PRT...).
export async function POST(req: Request) {
  const admin = await getSuperAdmin();
  if (!admin) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });

  const body = await req.json().catch(() => null);
  const nome = typeof body?.nome === 'string' ? body.nome : '';
  if (!nome.trim()) return NextResponse.json({ error: 'Informe o nome.' }, { status: 422 });

  const r = await criarParceiro({
    nome,
    email: typeof body?.email === 'string' ? body.email : undefined,
    comissaoRate: Number(body?.comissaoRate) || 0,
    pixChave: typeof body?.pixChave === 'string' ? body.pixChave : undefined,
  });
  if (!r.ok) return NextResponse.json({ error: r.erro }, { status: 422 });
  return NextResponse.json({ ok: true, id: r.id });
}
