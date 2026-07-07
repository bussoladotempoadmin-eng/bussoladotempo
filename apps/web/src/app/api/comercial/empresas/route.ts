import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSessionUser } from '@/lib/workspace';
import {
  listarTodasEmpresas,
  excluirEmpresaComercial,
  moverUnidadeEmpresa,
  podeGerenciarEmpresas,
  resolverEmpresaId,
} from '@/lib/comercial';
import { COOKIE_EMPRESA } from '@/app/comercial/contexto';

export const dynamic = 'force-dynamic';

async function orgAtual(userId: string): Promise<string | null> {
  return resolverEmpresaId(userId, cookies().get(COOKIE_EMPRESA)?.value);
}

// GET /api/comercial/empresas — todas as empresas (só corporativo/admin).
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  const orgId = await orgAtual(user.id);
  if (!orgId || !(await podeGerenciarEmpresas(user.id, orgId))) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
  }
  const empresas = await listarTodasEmpresas(orgId);
  return NextResponse.json({ empresas });
}

// POST /api/comercial/empresas  body: { acao: 'excluir'|'mover-unidade', ... }
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  const orgId = await orgAtual(user.id);
  if (!orgId) return NextResponse.json({ error: 'Sem empresa atual' }, { status: 400 });

  const b = await req.json().catch(() => null);
  const acao = b?.acao;

  if (acao === 'excluir') {
    const alvoId = typeof b?.empresaId === 'string' ? b.empresaId : '';
    const r = await excluirEmpresaComercial(user.id, orgId, alvoId);
    return r.ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: r.erro }, { status: 422 });
  }

  if (acao === 'mover-unidade') {
    const unidadeId = typeof b?.unidadeId === 'string' ? b.unidadeId : '';
    const destinoOrgId = typeof b?.destinoOrgId === 'string' ? b.destinoOrgId : '';
    const r = await moverUnidadeEmpresa(user.id, orgId, unidadeId, destinoOrgId);
    return r.ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: r.erro }, { status: 422 });
  }

  return NextResponse.json({ error: 'Ação inválida' }, { status: 400 });
}
