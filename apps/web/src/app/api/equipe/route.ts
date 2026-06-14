import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/workspace';
import { getTimeGestor, criarOrganizacao } from '@/lib/equipe';

export const dynamic = 'force-dynamic';

// GET /api/equipe — o time que eu gerencio (ou null)
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  const time = await getTimeGestor(user.id);
  return NextResponse.json(time ?? { org: null, membros: [] });
}

// POST /api/equipe — cria meu time  body: { nome }
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  const body = await req.json().catch(() => null);
  const nome = typeof body?.nome === 'string' ? body.nome : '';
  const org = await criarOrganizacao(user.id, nome);
  return NextResponse.json({ org });
}
