import { cookies } from 'next/headers';
import { prisma, type RepasseStatus } from '@bussola/db';
import { getSessionUser } from '@/lib/workspace';
import { resolverEmpresaId } from '@/lib/comercial';
import { listarRepassesRelatorio, type RepasseRelatorioItem } from '@/lib/comercial-repasse';
import { COOKIE_EMPRESA } from '@/app/comercial/contexto';

export const dynamic = 'force-dynamic';

function csvCell(v: string | number | null | undefined): string {
  if (v === null || v === undefined) return '';
  const s = String(v).replace(/"/g, '""');
  return /[";\n]/.test(s) ? `"${s}"` : s;
}
function brMoney(n: number | null): string {
  return (n ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtDia(iso: string): string {
  return iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : '';
}
function periodoLabel(de: string, ate: string): string {
  if (de && ate) return `${fmtDia(de)} a ${fmtDia(ate)}`;
  if (de) return `a partir de ${fmtDia(de)}`;
  if (ate) return `até ${fmtDia(ate)}`;
  return 'Todos os previstos';
}
function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
}

const STATUS_LABEL: Record<RepasseStatus, string> = {
  PENDENTE: 'Pendente',
  FEITO: 'Feito',
  PARCIAL: 'Parcial',
  NAO_FEITO: 'Não feito',
};
function metodoLabel(m: RepasseRelatorioItem['metodo']): string {
  if (m === 'TRANSFERENCIA') return 'Transferência';
  if (m === 'CARTAO_CORPORATIVO') return 'Cartão corporativo';
  return 'Não configurado';
}
function tipoContaLabel(t: RepasseRelatorioItem['tipoConta']): string {
  if (t === 'CORRENTE') return 'Corrente';
  if (t === 'POUPANCA') return 'Poupança';
  return '';
}

// GET /api/comercial/repasses/export?de&ate&status&formato=excel|pdf
export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return new Response('Não autenticado', { status: 401 });

  const url = new URL(req.url);
  const de = url.searchParams.get('de') || '';
  const ate = url.searchParams.get('ate') || '';
  const statusRaw = url.searchParams.get('status') || '';
  const status = (['PENDENTE', 'FEITO', 'PARCIAL', 'NAO_FEITO'] as RepasseStatus[]).includes(
    statusRaw as RepasseStatus,
  )
    ? (statusRaw as RepasseStatus)
    : undefined;
  const formato = url.searchParams.get('formato') === 'pdf' ? 'pdf' : 'excel';

  const orgId = await resolverEmpresaId(user.id, cookies().get(COOKIE_EMPRESA)?.value);
  if (!orgId) return new Response('Sem empresa atual', { status: 400 });

  const itens = await listarRepassesRelatorio(user.id, orgId, { de, ate, status });
  if (itens === null) return new Response('Só o corporativo pode emitir o relatório de repasse', { status: 403 });

  const org = await prisma.organizacao.findUnique({ where: { id: orgId }, select: { nome: true } });
  const empresa = org?.nome ?? '—';
  const periodo = periodoLabel(de, ate);
  const statusTxt = status ? STATUS_LABEL[status] : 'Todos';
  const emitido = new Date().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

  // Total a repassar = soma do valor solicitado em aberto (ações não finalizadas).
  const totalSolicitado = itens.reduce((s, i) => s + i.valorSolicitado, 0);

  if (formato === 'excel') {
    const linhas: (string | number)[][] = [
      ['Relatório de Repasse'],
      ['Empresa', empresa],
      ['Previstos', periodo],
      ['Status', statusTxt],
      ['Emitido em', emitido],
      [],
      [
        'Unidade',
        'Período',
        'Previsto',
        'Valor solicitado (R$)',
        'Método',
        'Banco',
        'Agência',
        'Conta',
        'Tipo conta',
        'PIX',
        'CPF/CNPJ',
        'Titular',
      ],
      ...itens.map((i) => [
        i.unidadeNome,
        i.periodoDe === i.periodoAte ? fmtDia(i.periodoDe) : `${fmtDia(i.periodoDe)} a ${fmtDia(i.periodoAte)}`,
        fmtDia(i.dataPrevista),
        brMoney(i.valorSolicitado),
        metodoLabel(i.metodo),
        i.banco ?? '',
        i.agencia ?? '',
        i.conta ?? '',
        tipoContaLabel(i.tipoConta),
        i.pix ?? '',
        i.cpfCnpj ?? '',
        i.titular ?? '',
      ]),
      [],
      ['', '', 'VALOR TOTAL', brMoney(totalSolicitado)],
    ];
    const body = '﻿' + linhas.map((l) => l.map(csvCell).join(';')).join('\r\n');
    return new Response(body, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="relatorio-repasse.csv"',
      },
    });
  }

  // PDF: HTML pronto pra impressão; o navegador salva como PDF (Ctrl+P).
  function contaBloco(i: RepasseRelatorioItem): string {
    if (i.metodo === 'CARTAO_CORPORATIVO') return '<span class="cartao">Cartão corporativo (sem transferência)</span>';
    if (i.metodo !== 'TRANSFERENCIA') return '<span class="semconta">⚠ Conta não configurada nesta unidade</span>';
    const partes: string[] = [];
    if (i.banco) partes.push(`<b>Banco:</b> ${esc(i.banco)}`);
    if (i.agencia) partes.push(`<b>Ag.:</b> ${esc(i.agencia)}`);
    if (i.conta) partes.push(`<b>Conta:</b> ${esc(i.conta)}${i.tipoConta ? ` (${tipoContaLabel(i.tipoConta)})` : ''}`);
    if (i.pix) partes.push(`<b>PIX:</b> ${esc(i.pix)}`);
    if (i.cpfCnpj) partes.push(`<b>CPF/CNPJ:</b> ${esc(i.cpfCnpj)}`);
    if (i.titular) partes.push(`<b>Titular:</b> ${esc(i.titular)}`);
    return partes.length ? partes.join(' &nbsp;·&nbsp; ') : '<span class="semconta">⚠ Transferência sem dados preenchidos</span>';
  }

  const cards = itens
    .map(
      (i) => `<div class="card">
        <div class="top">
          <div>
            <div class="uni">${esc(i.unidadeNome)}</div>
            <div class="sub">Previsto ${fmtDia(i.dataPrevista)} · período ${i.periodoDe === i.periodoAte ? fmtDia(i.periodoDe) : `${fmtDia(i.periodoDe)}–${fmtDia(i.periodoAte)}`}</div>
          </div>
          <div class="valor">R$ ${brMoney(i.valorSolicitado)}</div>
        </div>
        <div class="conta">${metodoLabel(i.metodo) !== 'Não configurado' ? `<span class="metodo">${metodoLabel(i.metodo)}</span> ` : ''}${contaBloco(i)}</div>
      </div>`,
    )
    .join('');

  const html = `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8">
<title>Relatório de Repasse — ${esc(empresa)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, Segoe UI, Roboto, Arial, sans-serif; color: #111; margin: 32px; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  .meta { font-size: 12px; color: #444; margin-bottom: 16px; line-height: 1.6; }
  .meta b { color: #111; }
  .tot { display: flex; gap: 24px; margin: 12px 0 20px; font-size: 13px; }
  .tot b { display: block; font-size: 18px; }
  .card { border: 1px solid #e5e7eb; border-radius: 10px; padding: 12px 14px; margin-bottom: 10px; break-inside: avoid; }
  .top { display: flex; justify-content: space-between; gap: 12px; align-items: flex-start; }
  .uni { font-weight: 700; font-size: 15px; }
  .sub { font-size: 11px; color: #555; margin-top: 2px; }
  .valor { text-align: right; font-weight: 700; font-size: 16px; font-variant-numeric: tabular-nums; white-space: nowrap; }
  .conta { margin-top: 8px; padding-top: 8px; border-top: 1px dashed #e5e7eb; font-size: 12px; color: #222; }
  .rodape { margin-top: 16px; padding-top: 12px; border-top: 2px solid #bbb; text-align: right; font-size: 15px; }
  .rodape b { font-size: 22px; margin-left: 8px; }
  .metodo { display: inline-block; background: #eef2ff; color: #3730a3; border-radius: 6px; padding: 1px 7px; font-size: 11px; font-weight: 700; }
  .semconta { color: #b91c1c; font-weight: 600; }
  .cartao { color: #555; }
  .st { border-radius: 8px; padding: 1px 7px; font-weight: 700; font-size: 10px; }
  .st-PENDENTE { background: #fef3c7; color: #92400e; }
  .st-FEITO { background: #d1fae5; color: #065f46; }
  .st-PARCIAL { background: #dbeafe; color: #1e40af; }
  .st-NAO_FEITO { background: #fee2e2; color: #991b1b; }
  .btn { margin-bottom: 16px; }
  @media print { .btn { display: none; } body { margin: 0; } }
</style></head>
<body>
  <button class="btn" onclick="window.print()">Salvar como PDF / Imprimir</button>
  <h1>Relatório de Repasse</h1>
  <div class="meta">
    <b>Empresa:</b> ${esc(empresa)}<br>
    <b>Previstos:</b> ${esc(periodo)} &nbsp;·&nbsp; <b>Status:</b> ${esc(statusTxt)} &nbsp;·&nbsp; <b>Emitido em:</b> ${esc(emitido)}
  </div>
  ${cards || '<p style="text-align:center;color:#888;padding:24px">Nenhum repasse em aberto no filtro escolhido.</p>'}
  <div class="rodape">Valor total a repassar: <b>R$ ${brMoney(totalSolicitado)}</b></div>
  <script>window.onload = function(){ setTimeout(function(){ window.print(); }, 250); };</script>
</body></html>`;

  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}
