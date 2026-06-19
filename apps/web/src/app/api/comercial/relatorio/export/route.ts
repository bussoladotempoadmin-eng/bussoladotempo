import { cookies } from 'next/headers';
import { getSessionUser } from '@/lib/workspace';
import { listarAcoes, resolverEmpresaId, STATUS_LABEL } from '@/lib/comercial';
import { COOKIE_EMPRESA } from '@/app/comercial/contexto';

export const dynamic = 'force-dynamic';

function csvCell(v: string | number | null | undefined): string {
  if (v === null || v === undefined) return '';
  const s = String(v).replace(/"/g, '""');
  return /[";\n]/.test(s) ? `"${s}"` : s;
}

// GET /api/comercial/relatorio/export?de&ate&tipo=verba|resultados
export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return new Response('Não autenticado', { status: 401 });

  const url = new URL(req.url);
  const de = url.searchParams.get('de') || undefined;
  const ate = url.searchParams.get('ate') || undefined;
  const tipo = url.searchParams.get('tipo') === 'resultados' ? 'resultados' : 'verba';
  const modo = url.searchParams.get('modo') === 'unificado' ? 'unificado' : 'detalhado';

  const orgId = await resolverEmpresaId(user.id, cookies().get(COOKIE_EMPRESA)?.value);
  if (!orgId) return new Response('Sem empresa', { status: 404 });
  const acoes = await listarAcoes(user.id, orgId, { de, ate });

  let header: string[];
  let linhas: string[][];
  if (modo === 'unificado') {
    // Somatória por unidade.
    const mapa = new Map<string, { nome: string; qtd: number; solicitado: number; gasto: number; leads: number }>();
    for (const a of acoes) {
      const cur = mapa.get(a.unidadeNome) ?? { nome: a.unidadeNome, qtd: 0, solicitado: 0, gasto: 0, leads: 0 };
      cur.qtd += 1;
      cur.solicitado += a.valorSolicitado ?? 0;
      cur.gasto += a.valorGasto ?? 0;
      cur.leads += a.resultadoQtd ?? 0;
      mapa.set(a.unidadeNome, cur);
    }
    const linhasUni = Array.from(mapa.values()).sort((x, y) => y.gasto - x.gasto);
    if (tipo === 'verba') {
      header = ['Unidade', 'Ações', 'Solicitado', 'Gasto', 'Diferença'];
      linhas = linhasUni.map((u) =>
        [u.nome, u.qtd, u.solicitado, u.gasto, u.gasto - u.solicitado].map((x) => csvCell(x as string | number)),
      );
    } else {
      header = ['Unidade', 'Ações', 'Leads', 'Gasto', 'Custo por lead'];
      linhas = linhasUni.map((u) =>
        [u.nome, u.qtd, u.leads, u.gasto, u.leads > 0 ? Math.round((u.gasto / u.leads) * 100) / 100 : ''].map((x) =>
          csvCell(x as string | number),
        ),
      );
    }
  } else if (tipo === 'verba') {
    header = ['Unidade', 'Tipo', 'Responsável', 'Solicitado', 'Gasto', 'Diferença', 'Status'];
    linhas = acoes.map((a) => {
      const diff = a.valorGasto !== null && a.valorSolicitado !== null ? a.valorGasto - a.valorSolicitado : null;
      return [
        a.unidadeNome,
        a.tipo,
        a.responsaveis,
        a.valorSolicitado ?? '',
        a.valorGasto ?? '',
        diff ?? '',
        STATUS_LABEL[a.status],
      ].map((x) => csvCell(x as string | number));
    });
  } else {
    header = ['Unidade', 'Tipo', 'Início', 'Fim', 'Status', 'Resultado', 'Quantidade', 'Comentário'];
    linhas = acoes.map((a) =>
      [
        a.unidadeNome,
        a.tipo,
        a.dataInicio,
        a.dataFim,
        STATUS_LABEL[a.status],
        a.resultado ?? '',
        a.resultadoQtd ?? '',
        a.comentarios ?? '',
      ].map((x) => csvCell(x as string | number)),
    );
  }

  // BOM pra o Excel reconhecer UTF-8; ; como separador (padrão BR).
  const body = '﻿' + [header, ...linhas].map((l) => l.join(';')).join('\r\n');
  return new Response(body, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="relatorio-comercial-${tipo}-${modo}.csv"`,
    },
  });
}
