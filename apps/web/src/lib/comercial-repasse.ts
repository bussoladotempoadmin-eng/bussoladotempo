/**
 * Relação de Repasse — ponte Relatório → Caixa (só corporativo).
 * Ao salvar o relatório de um período, cria um repasse por unidade com o
 * valor SOLICITADO somado. Cada repasse é marcado um a um: FEITO/PARCIAL
 * creditam o caixa da unidade (via sincronizarLancamentoRepasse); NAO_FEITO
 * não credita. Guarda solicitado × pago p/ enxergar divergência.
 */
import { prisma, type RepasseStatus } from '@bussola/db';
import { resolverAcessoComercial } from './comercial-acessos';
import { sincronizarLancamentoRepasse } from './comercial-caixa';

function parseDia(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0);
}

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

async function ehCorporativo(userId: string, orgId: string): Promise<boolean> {
  const a = await resolverAcessoComercial(userId, orgId);
  return a.temAcesso && a.corporativo;
}

/**
 * Cria os repasses de um período: um por unidade com solicitado > 0.
 * Pode duplicar período (repasse semanal / sob demanda) — é intencional.
 */
export async function criarRepassesDoRelatorio(
  userId: string,
  orgId: string,
  input: { de: string; ate: string; dataPrevista: string },
): Promise<{ ok: boolean; erro?: string; count?: number }> {
  if (!(await ehCorporativo(userId, orgId))) return { ok: false, erro: 'Só o corporativo pode salvar repasses.' };

  const de = parseDia(input.de);
  const ate = parseDia(input.ate);
  const prevista = parseDia(input.dataPrevista);
  if (!de || !ate) return { ok: false, erro: 'Período inválido.' };
  if (!prevista) return { ok: false, erro: 'Informe a data prevista do repasse.' };

  // Ações que cruzam o período, com solicitado > 0 e AINDA LIVRES (repasseId
  // null) — cada ação entra em 1 repasse só. Agrupa por unidade.
  const acoes = await prisma.acaoComercial.findMany({
    where: {
      unidade: { organizacaoId: orgId },
      repasseId: null,
      valorSolicitado: { gt: 0 },
      dataInicio: { lte: ate },
      dataFim: { gte: de },
    },
    select: { id: true, unidadeId: true, valorSolicitado: true },
  });

  const porUni = new Map<string, { valor: number; acaoIds: string[] }>();
  for (const a of acoes) {
    const cur = porUni.get(a.unidadeId) ?? { valor: 0, acaoIds: [] };
    cur.valor += a.valorSolicitado ?? 0;
    cur.acaoIds.push(a.id);
    porUni.set(a.unidadeId, cur);
  }
  const entradas = Array.from(porUni.entries()).filter(([, v]) => v.valor > 0);
  if (entradas.length === 0) {
    return { ok: false, erro: 'Nenhuma ação livre com verba solicitada no período (as do período já podem ter sido repassadas).' };
  }

  // Cria 1 repasse por unidade e VINCULA as ações dele (trava edição/exclusão).
  for (const [unidadeId, { valor, acaoIds }] of entradas) {
    const repasse = await prisma.repasse.create({
      data: {
        organizacaoId: orgId,
        unidadeId,
        periodoDe: de,
        periodoAte: ate,
        valorSolicitado: Math.round(valor * 100) / 100,
        dataPrevista: prevista,
        criadoPorId: userId,
      },
      select: { id: true },
    });
    await prisma.acaoComercial.updateMany({
      where: { id: { in: acaoIds } },
      data: { repasseId: repasse.id },
    });
  }
  return { ok: true, count: entradas.length };
}

/**
 * Recalcula o valor de um repasse PENDENTE a partir das ações ainda vinculadas
 * a ele (usado quando o corporativo/admin edita/exclui uma ação vinculada).
 * Repasse já fechado (não-pendente) é um snapshot — não recalcula.
 */
export async function recalcularRepassePendente(repasseId: string): Promise<void> {
  const r = await prisma.repasse.findUnique({ where: { id: repasseId }, select: { status: true } });
  if (!r || r.status !== 'PENDENTE') return;
  const agg = await prisma.acaoComercial.aggregate({
    where: { repasseId },
    _sum: { valorSolicitado: true },
  });
  await prisma.repasse.update({
    where: { id: repasseId },
    data: { valorSolicitado: Math.round((agg._sum.valorSolicitado ?? 0) * 100) / 100 },
  });
}

export type RepasseItem = {
  id: string;
  unidadeId: string;
  unidadeNome: string;
  periodoDe: string;
  periodoAte: string;
  valorSolicitado: number;
  dataPrevista: string;
  status: RepasseStatus;
  valorPago: number | null;
  dataPagamento: string | null;
  divergencia: number | null; // pago − solicitado (só p/ FEITO/PARCIAL)
  observacao: string | null;
};

export async function listarRepasses(userId: string, orgId: string): Promise<RepasseItem[] | null> {
  if (!(await ehCorporativo(userId, orgId))) return null;
  const rows = await prisma.repasse.findMany({
    where: { organizacaoId: orgId },
    include: { unidade: { select: { nome: true } } },
    orderBy: [{ dataPrevista: 'desc' }, { createdAt: 'desc' }],
  });
  return rows.map((r) => {
    const pagoRelevante = r.status === 'FEITO' || r.status === 'PARCIAL';
    return {
      id: r.id,
      unidadeId: r.unidadeId,
      unidadeNome: r.unidade.nome,
      periodoDe: iso(r.periodoDe),
      periodoAte: iso(r.periodoAte),
      valorSolicitado: r.valorSolicitado,
      dataPrevista: iso(r.dataPrevista),
      status: r.status,
      valorPago: r.valorPago,
      dataPagamento: r.dataPagamento ? iso(r.dataPagamento) : null,
      divergencia: pagoRelevante ? Math.round(((r.valorPago ?? 0) - r.valorSolicitado) * 100) / 100 : null,
      observacao: r.observacao,
    };
  });
}

/**
 * Marca o status de um repasse e sincroniza o crédito no caixa.
 * FEITO: pago = solicitado (ou valor informado) + data real.
 * PARCIAL: pago informado (< solicitado) + data real.
 * NAO_FEITO/PENDENTE: zera pago/data e remove o crédito.
 */
export async function marcarRepasse(
  userId: string,
  repasseId: string,
  input: { status: RepasseStatus; valorPago?: number | null; dataPagamento?: string; observacao?: string },
): Promise<{ ok: boolean; erro?: string }> {
  const r = await prisma.repasse.findUnique({
    where: { id: repasseId },
    select: { organizacaoId: true, valorSolicitado: true },
  });
  if (!r) return { ok: false, erro: 'Repasse não encontrado.' };
  if (!(await ehCorporativo(userId, r.organizacaoId))) return { ok: false, erro: 'Sem permissão.' };

  const data: Record<string, unknown> = { status: input.status };
  if (input.observacao !== undefined) data.observacao = input.observacao.trim() || null;

  if (input.status === 'FEITO' || input.status === 'PARCIAL') {
    const dp = input.dataPagamento ? parseDia(input.dataPagamento) : null;
    if (!dp) return { ok: false, erro: 'Informe a data do pagamento.' };
    data.dataPagamento = dp;
    if (input.status === 'FEITO') {
      data.valorPago = input.valorPago != null ? Math.round(input.valorPago * 100) / 100 : r.valorSolicitado;
    } else {
      if (input.valorPago == null || input.valorPago <= 0) return { ok: false, erro: 'Informe o valor pago.' };
      data.valorPago = Math.round(input.valorPago * 100) / 100;
    }
  } else {
    // NAO_FEITO ou PENDENTE — sem pagamento.
    data.valorPago = null;
    data.dataPagamento = null;
  }

  await prisma.repasse.update({ where: { id: repasseId }, data });
  await sincronizarLancamentoRepasse(repasseId);
  return { ok: true };
}

export async function removerRepasse(userId: string, repasseId: string): Promise<{ ok: boolean; erro?: string }> {
  const r = await prisma.repasse.findUnique({ where: { id: repasseId }, select: { organizacaoId: true } });
  if (!r) return { ok: false, erro: 'Repasse não encontrado.' };
  if (!(await ehCorporativo(userId, r.organizacaoId))) return { ok: false, erro: 'Sem permissão.' };
  await prisma.repasse.delete({ where: { id: repasseId } }); // cascade remove o lançamento
  return { ok: true };
}
