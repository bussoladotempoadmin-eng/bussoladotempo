import { prisma } from '@bussola/db';
import { getSessionUser } from '@/lib/workspace';
import { getCaixaUnidade } from '@/lib/comercial-caixa';

export const dynamic = 'force-dynamic';

function csvCell(v: string | number | null | undefined): string {
  if (v === null || v === undefined) return '';
  const s = String(v).replace(/"/g, '""');
  return /[";\n]/.test(s) ? `"${s}"` : s;
}

function brMoney(n: number): string {
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDia(iso: string): string {
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
}

function periodoLabel(de: string, ate: string): string {
  if (de && ate) return `${fmtDia(de)} a ${fmtDia(ate)}`;
  if (de) return `a partir de ${fmtDia(de)}`;
  if (ate) return `até ${fmtDia(ate)}`;
  return 'Todo o período';
}

function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
}

// GET /api/comercial/caixa/export?u=<unidadeId>&de&ate&formato=excel|pdf
export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return new Response('Não autenticado', { status: 401 });

  const url = new URL(req.url);
  const unidadeId = url.searchParams.get('u') || '';
  const de = url.searchParams.get('de') || '';
  const ate = url.searchParams.get('ate') || '';
  const formato = url.searchParams.get('formato') === 'pdf' ? 'pdf' : 'excel';

  const caixa = await getCaixaUnidade(user.id, unidadeId, { de, ate });
  if (!caixa) return new Response('Sem acesso a esta unidade', { status: 403 });

  const unidade = await prisma.unidade.findUnique({
    where: { id: unidadeId },
    select: {
      nome: true,
      organizacao: { select: { nome: true } },
      coordenador: { select: { name: true, email: true } },
    },
  });
  if (!unidade) return new Response('Unidade não encontrada', { status: 404 });

  const empresa = unidade.organizacao.nome;
  const responsavel =
    unidade.coordenador?.name?.trim() || unidade.coordenador?.email || user.name?.trim() || user.email || '—';
  const periodo = periodoLabel(de, ate);
  const emitido = new Date().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  const slugUni = unidade.nome.normalize('NFD').replace(/[^\w]+/g, '-').toLowerCase();

  if (formato === 'excel') {
    const linhas: (string | number)[][] = [
      ['Extrato de Caixa'],
      ['Empresa', empresa],
      ['Unidade', unidade.nome],
      ['Responsável', responsavel],
      ['Período', periodo],
      ['Emitido em', emitido],
      [],
      ['Data', 'Lançamento', 'Tipo', 'Entrada', 'Saída', 'Saldo'],
      ...caixa.lancamentos.map((l) => [
        fmtDia(l.data),
        l.descricao + (l.automatico ? ' (auto)' : ''),
        l.tipo === 'ENTRADA' ? 'Entrada' : 'Saída',
        l.tipo === 'ENTRADA' ? brMoney(l.valor) : '',
        l.tipo === 'SAIDA' ? brMoney(l.valor) : '',
        brMoney(l.saldoApos),
      ]),
      [],
      ['', '', 'Entradas', brMoney(caixa.totalEntradas)],
      ['', '', 'Saídas', brMoney(caixa.totalSaidas)],
      ['', '', 'Saldo atual', brMoney(caixa.saldo)],
    ];
    const body = '﻿' + linhas.map((l) => l.map(csvCell).join(';')).join('\r\n');
    return new Response(body, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="extrato-caixa-${slugUni}.csv"`,
      },
    });
  }

  // PDF: HTML pronto pra impressão; o navegador salva como PDF (Ctrl+P / Salvar).
  const rows = caixa.lancamentos
    .map(
      (l) => `<tr>
        <td class="num">${fmtDia(l.data)}</td>
        <td>${esc(l.descricao)}${l.automatico ? ' <span class="tag">auto</span>' : ''}</td>
        <td class="r ent">${l.tipo === 'ENTRADA' ? 'R$ ' + brMoney(l.valor) : ''}</td>
        <td class="r sai">${l.tipo === 'SAIDA' ? 'R$ ' + brMoney(l.valor) : ''}</td>
        <td class="r ${l.saldoApos < 0 ? 'sai' : ''}">R$ ${brMoney(l.saldoApos)}</td>
      </tr>`,
    )
    .join('');

  const html = `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8">
<title>Extrato de Caixa — ${esc(unidade.nome)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, Segoe UI, Roboto, Arial, sans-serif; color: #111; margin: 32px; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  .meta { font-size: 12px; color: #444; margin-bottom: 16px; line-height: 1.6; }
  .meta b { color: #111; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th { text-align: left; background: #f3f4f6; padding: 7px 8px; font-size: 10px; text-transform: uppercase; letter-spacing: .04em; color: #555; }
  td { padding: 7px 8px; border-top: 1px solid #e5e7eb; }
  .r { text-align: right; font-variant-numeric: tabular-nums; }
  .num { white-space: nowrap; }
  .ent { color: #047857; }
  .sai { color: #b91c1c; }
  .tag { font-size: 9px; background: #eee; border-radius: 8px; padding: 1px 5px; color: #555; }
  tfoot td { border-top: 2px solid #ccc; font-weight: 700; }
  .btn { margin-bottom: 16px; }
  @media print { .btn { display: none; } body { margin: 0; } }
</style></head>
<body>
  <button class="btn" onclick="window.print()">Salvar como PDF / Imprimir</button>
  <h1>Extrato de Caixa</h1>
  <div class="meta">
    <b>Empresa:</b> ${esc(empresa)}<br>
    <b>Unidade:</b> ${esc(unidade.nome)}<br>
    <b>Responsável:</b> ${esc(responsavel)}<br>
    <b>Período:</b> ${esc(periodo)} &nbsp;·&nbsp; <b>Emitido em:</b> ${esc(emitido)}
  </div>
  <table>
    <thead><tr><th>Data</th><th>Lançamento</th><th class="r">Entrada</th><th class="r">Saída</th><th class="r">Saldo</th></tr></thead>
    <tbody>${rows || '<tr><td colspan="5" style="text-align:center;color:#888;padding:24px">Sem lançamentos no período.</td></tr>'}</tbody>
    <tfoot>
      <tr><td colspan="2">Totais do período</td><td class="r ent">R$ ${brMoney(caixa.totalEntradas)}</td><td class="r sai">R$ ${brMoney(caixa.totalSaidas)}</td><td class="r">R$ ${brMoney(caixa.saldo)}</td></tr>
    </tfoot>
  </table>
  <script>window.onload = function(){ setTimeout(function(){ window.print(); }, 250); };</script>
</body></html>`;

  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}
