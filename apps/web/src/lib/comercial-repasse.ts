/**
 * Relação de Repasse — ponte Relatório → Caixa (só corporativo).
 * Ao salvar o relatório de um período, cria um repasse por unidade com o
 * valor SOLICITADO somado. Cada repasse é marcado um a um: FEITO/PARCIAL
 * creditam o caixa da unidade (via sincronizarLancamentoRepasse); NAO_FEITO
 * não credita. Guarda solicitado × pago p/ enxergar divergência.
 */
import {
  prisma,
  type Repasse,
  type RepasseStatus,
  type MetodoRepasse,
  type TipoConta,
  type StatusAcao,
} from '@bussola/db';
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
): Promise<{ ok: boolean; erro?: string; count?: number; loteId?: string }> {
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
      // Só ações AINDA EM ABERTO entram no repasse: finalizada/cancelada não é
      // financiada (já aconteceu / não vai acontecer).
      status: { notIn: ['FINALIZADO', 'CANCELADO'] as StatusAcao[] },
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

  // Um loteId por emissão: todos os repasses desta relação = 1 relatório emitido.
  const loteId = crypto.randomUUID();

  // Cria 1 repasse por unidade e VINCULA as ações dele (trava edição/exclusão).
  for (const [unidadeId, { valor, acaoIds }] of entradas) {
    const repasse = await prisma.repasse.create({
      data: {
        organizacaoId: orgId,
        loteId,
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
  return { ok: true, count: entradas.length, loteId };
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
// ---- Relatório de repasse (valor + dados da conta por unidade) ----

export type RepasseRelatorioItem = RepasseItem & {
  metodo: MetodoRepasse | null;
  banco: string | null;
  agencia: string | null;
  conta: string | null;
  tipoConta: TipoConta | null;
  pix: string | null;
  cpfCnpj: string | null;
  titular: string | null;
};

/**
 * Itens de UM relatório emitido (lote) — ou filtrado por data prevista/status —
 * JÁ com os dados bancários da unidade. O valor é o SNAPSHOT da emissão (a
 * exclusão de ações finalizadas acontece na hora de emitir). Só corporativo.
 */
export async function listarRepassesRelatorio(
  userId: string,
  orgId: string,
  filtro: { de?: string; ate?: string; status?: RepasseStatus; lote?: string } = {},
): Promise<RepasseRelatorioItem[] | null> {
  if (!(await ehCorporativo(userId, orgId))) return null;

  const de = filtro.de ? parseDia(filtro.de) : null;
  const ate = filtro.ate ? parseDia(filtro.ate) : null;
  const where: Record<string, unknown> = { organizacaoId: orgId };
  if (filtro.lote) where.loteId = filtro.lote;
  if (filtro.status) where.status = filtro.status;
  if (de || ate) {
    where.dataPrevista = { ...(de ? { gte: de } : {}), ...(ate ? { lte: ate } : {}) };
  }

  const rows = await prisma.repasse.findMany({
    where,
    include: {
      unidade: {
        select: {
          nome: true,
          repasseMetodo: true,
          repasseBanco: true,
          repasseAgencia: true,
          repasseConta: true,
          repasseTipoConta: true,
          repassePix: true,
          repasseCpfCnpj: true,
          repasseTitular: true,
        },
      },
    },
    orderBy: [{ dataPrevista: 'asc' }, { unidade: { nome: 'asc' } }],
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
      metodo: r.unidade.repasseMetodo,
      banco: r.unidade.repasseBanco,
      agencia: r.unidade.repasseAgencia,
      conta: r.unidade.repasseConta,
      tipoConta: r.unidade.repasseTipoConta,
      pix: r.unidade.repassePix,
      cpfCnpj: r.unidade.repasseCpfCnpj,
      titular: r.unidade.repasseTitular,
    };
  });
}

export type LoteRepasse = {
  loteId: string;
  emitidoEm: string; // ISO date do createdAt do lote
  periodoDe: string;
  periodoAte: string;
  dataPrevista: string;
  unidades: number;
  totalSolicitado: number;
  totalPago: number;
  pendentes: number;
  pagos: number; // FEITO ou PARCIAL
};

/** Histórico de relatórios emitidos: cada lote = uma emissão da relação. */
export async function listarLotesRepasse(userId: string, orgId: string): Promise<LoteRepasse[] | null> {
  if (!(await ehCorporativo(userId, orgId))) return null;
  const rows = await prisma.repasse.findMany({
    where: { organizacaoId: orgId, loteId: { not: null } },
    orderBy: { createdAt: 'desc' },
  });
  const mapa = new Map<string, Repasse[]>();
  for (const r of rows) {
    const k = r.loteId as string;
    const arr = mapa.get(k);
    if (arr) arr.push(r);
    else mapa.set(k, [r]);
  }
  return Array.from(mapa.entries()).map(([loteId, reps]) => {
    const pagos = reps.filter((r) => r.status === 'FEITO' || r.status === 'PARCIAL');
    return {
      loteId,
      emitidoEm: iso(reps[0].createdAt),
      periodoDe: iso(reps[0].periodoDe),
      periodoAte: iso(reps[0].periodoAte),
      dataPrevista: iso(reps[0].dataPrevista),
      unidades: reps.length,
      totalSolicitado: Math.round(reps.reduce((s, r) => s + r.valorSolicitado, 0) * 100) / 100,
      totalPago: Math.round(pagos.reduce((s, r) => s + (r.valorPago ?? 0), 0) * 100) / 100,
      pendentes: reps.filter((r) => r.status === 'PENDENTE').length,
      pagos: pagos.length,
    };
  });
}

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
