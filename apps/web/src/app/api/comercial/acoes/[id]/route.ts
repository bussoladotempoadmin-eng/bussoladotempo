import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSessionUser } from '@/lib/workspace';
import {
  atualizarAcao,
  registrarResultado,
  reagendar,
  realocar,
  removerAcao,
  moverAcaoEmpresa,
  resolverEmpresaId,
  type ResultadoInput,
} from '@/lib/comercial';
import { COOKIE_EMPRESA } from '@/app/comercial/contexto';
import type { StatusAcao } from '@bussola/db';

export const dynamic = 'force-dynamic';

function numOrNull(v: unknown): number | null {
  if (v === '' || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

// Parcelas de pagamento vindas do form: [{ valor, data }]. undefined = não mexe.
function parseParcelas(v: unknown): { valor: number; data: string }[] | undefined {
  if (!Array.isArray(v)) return undefined;
  return v.map((p) => ({ valor: Number((p as { valor?: unknown })?.valor), data: String((p as { data?: unknown })?.data ?? '') }));
}

const STATUS_VALIDOS: StatusAcao[] = ['EM_PLANEJAMENTO', 'FINALIZADO', 'ADIADO', 'CANCELADO'];

// PATCH /api/comercial/acoes/[id]  body: { acao: 'editar'|'resultado'|'reagendar'|'realocar', ... }
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  const b = await req.json().catch(() => null);
  const acao = b?.acao;

  if (acao === 'resultado') {
    const status = STATUS_VALIDOS.includes(b?.status) ? (b.status as StatusAcao) : null;
    if (!status) return NextResponse.json({ error: 'Status inválido' }, { status: 400 });
    const input: ResultadoInput = {
      status,
      resultado: typeof b.resultado === 'string' ? b.resultado : null,
      resultadoQtd: numOrNull(b.resultadoQtd),
      valorGasto: numOrNull(b.valorGasto),
      comentarios: typeof b.comentarios === 'string' ? b.comentarios : null,
    };
    const ok = await registrarResultado(user.id, params.id, input);
    return ok
      ? NextResponse.json({ ok: true })
      : NextResponse.json({ error: 'Não encontrado' }, { status: 404 });
  }

  if (acao === 'reagendar') {
    const ok = await reagendar(user.id, params.id, String(b.dataInicio ?? ''), String(b.dataFim ?? ''));
    return ok
      ? NextResponse.json({ ok: true })
      : NextResponse.json({ error: 'Falhou' }, { status: 422 });
  }

  if (acao === 'realocar') {
    const r = await realocar(user.id, params.id, {
      unidadeId: typeof b.unidadeId === 'string' ? b.unidadeId : undefined,
      responsaveis: typeof b.responsaveis === 'string' ? b.responsaveis : undefined,
    });
    return r.ok
      ? NextResponse.json({ ok: true })
      : NextResponse.json({ error: r.erro }, { status: 422 });
  }

  // Mover a ação para uma UNIDADE de OUTRA empresa (só corporativo/admin).
  if (acao === 'mover-empresa') {
    const orgId = await resolverEmpresaId(user.id, cookies().get(COOKIE_EMPRESA)?.value);
    if (!orgId) return NextResponse.json({ error: 'Sem empresa atual' }, { status: 400 });
    const destinoUnidadeId = typeof b.destinoUnidadeId === 'string' ? b.destinoUnidadeId : '';
    const r = await moverAcaoEmpresa(user.id, orgId, params.id, destinoUnidadeId);
    return r.ok
      ? NextResponse.json({ ok: true })
      : NextResponse.json({ error: r.erro }, { status: 422 });
  }

  // padrão: editar planejamento
  const r = await atualizarAcao(user.id, params.id, {
    tipo: typeof b.tipo === 'string' ? b.tipo : undefined,
    objetivo: typeof b.objetivo === 'string' ? b.objetivo : undefined,
    local: typeof b.local === 'string' ? b.local : undefined,
    responsaveis: typeof b.responsaveis === 'string' ? b.responsaveis : undefined,
    detalhe: typeof b.detalhe === 'string' ? b.detalhe : undefined,
    dataInicio: typeof b.dataInicio === 'string' ? b.dataInicio : undefined,
    dataFim: typeof b.dataFim === 'string' ? b.dataFim : undefined,
    valorSolicitado: b.valorSolicitado === undefined ? undefined : numOrNull(b.valorSolicitado),
    parcelas: parseParcelas(b.parcelas),
  });
  return r.ok
    ? NextResponse.json({ ok: true })
    : NextResponse.json({ error: r.erro }, { status: 422 });
}

// DELETE /api/comercial/acoes/[id]
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  const ok = await removerAcao(user.id, params.id);
  return ok
    ? NextResponse.json({ ok: true })
    : NextResponse.json({ error: 'Não encontrado' }, { status: 404 });
}
