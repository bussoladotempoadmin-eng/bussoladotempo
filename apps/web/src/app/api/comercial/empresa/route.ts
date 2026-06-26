import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSessionUser } from '@/lib/workspace';
import { criarEmpresa, resolverEmpresaId, podeCriarEmpresa } from '@/lib/comercial';
import { COOKIE_EMPRESA } from '@/app/comercial/contexto';

export const dynamic = 'force-dynamic';

const UM_ANO = 60 * 60 * 24 * 365;

// POST /api/comercial/empresa  body: { nome }  → cria empresa e seleciona
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  if (!(await podeCriarEmpresa(user.id))) {
    return NextResponse.json({ error: 'Você não tem permissão para criar empresas.' }, { status: 403 });
  }
  const body = await req.json().catch(() => null);
  const nome = typeof body?.nome === 'string' ? body.nome : '';
  const org = await criarEmpresa(user.id, nome);
  cookies().set(COOKIE_EMPRESA, org.id, { path: '/', maxAge: UM_ANO, sameSite: 'lax' });
  return NextResponse.json({ ok: true, org });
}

// PUT /api/comercial/empresa  body: { orgId }  → troca a empresa atual (cookie)
export async function PUT(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  const body = await req.json().catch(() => null);
  const orgId = typeof body?.orgId === 'string' ? body.orgId : '';
  const valido = await resolverEmpresaId(user.id, orgId);
  if (valido !== orgId) return NextResponse.json({ error: 'Empresa inválida' }, { status: 422 });
  cookies().set(COOKIE_EMPRESA, orgId, { path: '/', maxAge: UM_ANO, sameSite: 'lax' });
  return NextResponse.json({ ok: true });
}
