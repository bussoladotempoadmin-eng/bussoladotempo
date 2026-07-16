/**
 * Relação de Repasse — ponte Relatório → Caixa (só corporativo).
 * Ao salvar o relatório de um período, cria um repasse por unidade com o valor
 * SOLICITADO somado (um lote = um relatório emitido). O pagamento de cada repasse
 * é feito em PARCELAS (registrarPagamentoRepasse): o parcial e os complementos,
 * cada um na sua data, cada um vira uma ENTRADA no caixa da unidade. valorPago e
 * status (PENDENTE/PARCIAL/FEITO) são derivados da soma das parcelas.
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

  // PARCELAS de pagamento com data no período, AINDA LIVRES (repasseId null), de
  // ações em aberto (não finalizadas/canceladas). Agrupa por unidade da ação.
  const parcelas = await prisma.parcelaSolicitacao.findMany({
    where: {
      repasseId: null,
      data: { gte: de, lte: ate },
      acao: {
        unidade: { organizacaoId: orgId },
        status: { notIn: ['FINALIZADO', 'CANCELADO'] as StatusAcao[] },
      },
    },
    select: { id: true, valor: true, acao: { select: { unidadeId: true } } },
  });

  const porUni = new Map<string, { valor: number; parcelaIds: string[] }>();
  for (const p of parcelas) {
    const uid = p.acao.unidadeId;
    const cur = porUni.get(uid) ?? { valor: 0, parcelaIds: [] };
    cur.valor += p.valor;
    cur.parcelaIds.push(p.id);
    porUni.set(uid, cur);
  }
  const entradas = Array.from(porUni.entries()).filter(([, v]) => v.valor > 0);
  if (entradas.length === 0) {
    return {
      ok: false,
      erro: 'Nenhuma parcela de pagamento livre com essa data (as do período já podem ter sido repassadas).',
    };
  }

  // Um loteId por emissão: todos os repasses desta relação = 1 relatório emitido.
  const loteId = crypto.randomUUID();

  // Cria 1 repasse por unidade e VINCULA as parcelas dele (trava edição/exclusão).
  for (const [unidadeId, { valor, parcelaIds }] of entradas) {
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
    await prisma.parcelaSolicitacao.updateMany({
      where: { id: { in: parcelaIds } },
      data: { repasseId: repasse.id },
    });
  }
  return { ok: true, count: entradas.length, loteId };
}

/**
 * Recalcula o valor de um repasse PENDENTE a partir das PARCELAS ainda vinculadas
 * a ele (quando o corporativo/admin edita/exclui uma ação vinculada).
 * Repasse já fechado (não-pendente) é um snapshot — não recalcula.
 */
export async function recalcularRepassePendente(repasseId: string): Promise<void> {
  const r = await prisma.repasse.findUnique({ where: { id: repasseId }, select: { status: true } });
  if (!r || r.status !== 'PENDENTE') return;
  const agg = await prisma.parcelaSolicitacao.aggregate({
    where: { repasseId },
    _sum: { valor: true },
  });
  await prisma.repasse.update({
    where: { id: repasseId },
    data: { valorSolicitado: Math.round((agg._sum.valor ?? 0) * 100) / 100 },
  });
}

export type PagamentoItem = { id: string; valor: number; data: string };

export type RepasseItem = {
  id: string;
  unidadeId: string;
  unidadeNome: string;
  periodoDe: string;
  periodoAte: string;
  valorSolicitado: number;
  dataPrevista: string;
  status: RepasseStatus;
  valorPago: number | null; // soma das parcelas
  dataPagamento: string | null; // data da última parcela
  divergencia: number | null; // pago − solicitado (só p/ FEITO/PARCIAL)
  falta: number; // solicitado − pago (>= 0)
  observacao: string | null;
  pagamentos: PagamentoItem[]; // parcelas (parcial + complementos), da mais antiga à recente
};

export async function listarRepasses(userId: string, orgId: string): Promise<RepasseItem[] | null> {
  if (!(await ehCorporativo(userId, orgId))) return null;
  const rows = await prisma.repasse.findMany({
    where: { organizacaoId: orgId },
    include: {
      unidade: { select: { nome: true } },
      pagamentos: { orderBy: { data: 'asc' }, select: { id: true, valor: true, data: true } },
    },
    orderBy: [{ dataPrevista: 'desc' }, { createdAt: 'desc' }],
  });
  return rows.map((r) => {
    const pagoRelevante = r.status === 'FEITO' || r.status === 'PARCIAL';
    const pago = r.valorPago ?? 0;
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
      divergencia: pagoRelevante ? Math.round((pago - r.valorSolicitado) * 100) / 100 : null,
      falta: Math.max(0, Math.round((r.valorSolicitado - pago) * 100) / 100),
      observacao: r.observacao,
      pagamentos: r.pagamentos.map((p) => ({ id: p.id, valor: p.valor, data: iso(p.data) })),
    };
  });
}

// ---- Relatório de repasse (valor + dados da conta por unidade) ----

export type RepasseRelatorioItem = Omit<RepasseItem, 'falta' | 'pagamentos'> & {
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

function ddmm(d: Date): string {
  const s = iso(d);
  return `${s.slice(8, 10)}/${s.slice(5, 7)}`;
}

/**
 * Recalcula valorPago (soma das parcelas), dataPagamento (última parcela) e status
 * a partir das PARCELAS. Sem parcela: mantém NAO_FEITO se já era, senão PENDENTE.
 */
async function recomputarRepasse(repasseId: string): Promise<void> {
  const r = await prisma.repasse.findUnique({
    where: { id: repasseId },
    select: { valorSolicitado: true, status: true, pagamentos: { select: { valor: true, data: true } } },
  });
  if (!r) return;
  const soma = Math.round(r.pagamentos.reduce((s, p) => s + p.valor, 0) * 100) / 100;
  const ultima = r.pagamentos.reduce<Date | null>((max, p) => (!max || p.data > max ? p.data : max), null);
  let status: RepasseStatus;
  if (soma <= 0) status = r.status === 'NAO_FEITO' ? 'NAO_FEITO' : 'PENDENTE';
  else if (soma >= r.valorSolicitado) status = 'FEITO';
  else status = 'PARCIAL';
  await prisma.repasse.update({
    where: { id: repasseId },
    data: { valorPago: soma > 0 ? soma : null, dataPagamento: ultima, status },
  });
}

/**
 * Registra UMA parcela do repasse (o parcial ou um complemento), na data real do
 * envio, e credita o caixa da unidade nessa data. O status vira PARCIAL/FEITO
 * conforme a soma das parcelas atinge o solicitado.
 */
export async function registrarPagamentoRepasse(
  userId: string,
  repasseId: string,
  input: { valor: number; data: string },
): Promise<{ ok: boolean; erro?: string }> {
  const r = await prisma.repasse.findUnique({
    where: { id: repasseId },
    select: { organizacaoId: true, unidadeId: true, periodoDe: true, periodoAte: true },
  });
  if (!r) return { ok: false, erro: 'Repasse não encontrado.' };
  if (!(await ehCorporativo(userId, r.organizacaoId))) return { ok: false, erro: 'Sem permissão.' };
  const valor = Math.round(Number(input.valor) * 100) / 100;
  if (!Number.isFinite(valor) || valor <= 0) return { ok: false, erro: 'Informe um valor maior que zero.' };
  const data = parseDia(input.data);
  if (!data) return { ok: false, erro: 'Informe a data do envio.' };

  const pag = await prisma.pagamentoRepasse.create({
    data: { repasseId, valor, data, criadoPorId: userId },
    select: { id: true },
  });
  // 1 entrada no caixa por parcela, na data do envio.
  await prisma.lancamentoCaixa.create({
    data: {
      unidadeId: r.unidadeId,
      tipo: 'ENTRADA',
      valor,
      data,
      descricao: `Repasse recebido (${ddmm(r.periodoDe)}–${ddmm(r.periodoAte)})`,
      automatico: true,
      repasseId,
      pagamentoRepasseId: pag.id,
      criadoPorId: userId,
    },
  });
  await recomputarRepasse(repasseId);
  return { ok: true };
}

/** Remove uma parcela (e sua entrada no caixa, via cascade) e recalcula o repasse. */
export async function removerPagamentoRepasse(
  userId: string,
  pagamentoId: string,
): Promise<{ ok: boolean; erro?: string }> {
  const p = await prisma.pagamentoRepasse.findUnique({
    where: { id: pagamentoId },
    select: { repasseId: true, repasse: { select: { organizacaoId: true } } },
  });
  if (!p) return { ok: false, erro: 'Parcela não encontrada.' };
  if (!(await ehCorporativo(userId, p.repasse.organizacaoId))) return { ok: false, erro: 'Sem permissão.' };
  await prisma.pagamentoRepasse.delete({ where: { id: pagamentoId } });
  await recomputarRepasse(p.repasseId);
  return { ok: true };
}

/**
 * Define o status MANUAL do repasse (NAO_FEITO ou PENDENTE/reabrir): apaga as
 * parcelas (e o crédito no caixa via cascade) e fixa o status.
 */
export async function definirStatusRepasse(
  userId: string,
  repasseId: string,
  status: 'NAO_FEITO' | 'PENDENTE',
): Promise<{ ok: boolean; erro?: string }> {
  const r = await prisma.repasse.findUnique({ where: { id: repasseId }, select: { organizacaoId: true } });
  if (!r) return { ok: false, erro: 'Repasse não encontrado.' };
  if (!(await ehCorporativo(userId, r.organizacaoId))) return { ok: false, erro: 'Sem permissão.' };
  await prisma.pagamentoRepasse.deleteMany({ where: { repasseId } });
  await prisma.repasse.update({
    where: { id: repasseId },
    data: { status, valorPago: null, dataPagamento: null },
  });
  return { ok: true };
}

export async function removerRepasse(userId: string, repasseId: string): Promise<{ ok: boolean; erro?: string }> {
  const r = await prisma.repasse.findUnique({ where: { id: repasseId }, select: { organizacaoId: true } });
  if (!r) return { ok: false, erro: 'Repasse não encontrado.' };
  if (!(await ehCorporativo(userId, r.organizacaoId))) return { ok: false, erro: 'Sem permissão.' };
  await prisma.repasse.delete({ where: { id: repasseId } }); // cascade remove o lançamento
  return { ok: true };
}
