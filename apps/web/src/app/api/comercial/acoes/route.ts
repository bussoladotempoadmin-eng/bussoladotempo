import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/workspace';
import { criarAcao, type AcaoInput } from '@/lib/comercial';

export const dynamic = 'force-dynamic';

// POST /api/comercial/acoes  — cria ação (planejamento)
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  const b = await req.json().catch(() => null);
  if (!b) return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 });

  const input: AcaoInput = {
    unidadeId: String(b.unidadeId ?? ''),
    tipo: String(b.tipo ?? ''),
    objetivo: String(b.objetivo ?? ''),
    local: String(b.local ?? ''),
    responsaveis: String(b.responsaveis ?? ''),
    dataInicio: String(b.dataInicio ?? ''),
    dataFim: String(b.dataFim ?? ''),
    detalhe: typeof b.detalhe === 'string' ? b.detalhe : undefined,
    valorSolicitado: numOrNull(b.valorSolicitado),
  };
  const r = await criarAcao(user.id, input);
  if (!r.ok) return NextResponse.json({ error: r.erro }, { status: 422 });
  return NextResponse.json({ ok: true, id: r.id });
}

function numOrNull(v: unknown): number | null {
  if (v === '' || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
