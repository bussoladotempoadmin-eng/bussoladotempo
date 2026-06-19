/**
 * Caixa do módulo Comercial — saldo e extrato POR UNIDADE.
 * Entradas (verba recebida) e saídas (gastos) compõem um extrato com saldo
 * corrente. Saídas podem ser AUTOMÁTICAS (geradas pelo valorGasto de uma ação
 * finalizada, vinculadas por acaoId) ou MANUAIS. Entradas são sempre manuais.
 * Permissão: reaproveita o RBAC do Comercial (ver/editar por unidade).
 */
import { prisma, type TipoLancamento } from '@bussola/db';
import { resolverAcessoComercial } from './comercial-acessos';

// ---- helpers ----

function parseDia(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0);
}

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** orgId da unidade (ou null se não existe / empresa sem comercial ativo). */
async function orgDaUnidade(unidadeId: string): Promise<string | null> {
  const u = await prisma.unidade.findUnique({
    where: { id: unidadeId },
    select: { organizacaoId: true, organizacao: { select: { comercialAtivo: true } } },
  });
  if (!u || !u.organizacao.comercialAtivo) return null;
  return u.organizacaoId;
}

async function podeVerUnidade(userId: string, unidadeId: string): Promise<boolean> {
  const orgId = await orgDaUnidade(unidadeId);
  if (!orgId) return false;
  return (await resolverAcessoComercial(userId, orgId)).podeVer(unidadeId);
}

async function podeEditarUnidade(userId: string, unidadeId: string): Promise<boolean> {
  const orgId = await orgDaUnidade(unidadeId);
  if (!orgId) return false;
  return (await resolverAcessoComercial(userId, orgId)).podeEditar(unidadeId);
}

// ---- leitura: saldo + extrato ----

export type LancamentoItem = {
  id: string;
  data: string; // YYYY-MM-DD
  tipo: TipoLancamento;
  valor: number;
  descricao: string;
  automatico: boolean;
  acaoId: string | null;
  saldoApos: number; // saldo corrente após este lançamento (cronológico)
};

export type CaixaUnidade = {
  saldo: number;
  totalEntradas: number;
  totalSaidas: number;
  lancamentos: LancamentoItem[]; // mais recente primeiro
};

/**
 * Saldo e extrato de uma unidade. O saldo corrente (`saldoApos`) é sempre
 * acumulado desde o início — o filtro de/ate só recorta o que aparece na lista,
 * preservando o comportamento de extrato bancário.
 */
export async function getCaixaUnidade(
  userId: string,
  unidadeId: string,
  filtro: { de?: string; ate?: string } = {},
): Promise<CaixaUnidade | null> {
  if (!(await podeVerUnidade(userId, unidadeId))) return null;

  const todos = await prisma.lancamentoCaixa.findMany({
    where: { unidadeId },
    orderBy: [{ data: 'asc' }, { createdAt: 'asc' }],
  });

  const de = filtro.de ? parseDia(filtro.de) : null;
  const ate = filtro.ate ? parseDia(filtro.ate) : null;

  let saldo = 0;
  let totalEntradas = 0;
  let totalSaidas = 0;
  const lista: LancamentoItem[] = [];

  for (const l of todos) {
    if (l.tipo === 'ENTRADA') {
      saldo += l.valor;
      totalEntradas += l.valor;
    } else {
      saldo -= l.valor;
      totalSaidas += l.valor;
    }
    if ((de && l.data < de) || (ate && l.data > ate)) continue;
    lista.push({
      id: l.id,
      data: iso(l.data),
      tipo: l.tipo,
      valor: l.valor,
      descricao: l.descricao,
      automatico: l.automatico,
      acaoId: l.acaoId,
      saldoApos: Math.round(saldo * 100) / 100,
    });
  }

  lista.reverse(); // mais recente primeiro
  return {
    saldo: Math.round(saldo * 100) / 100,
    totalEntradas: Math.round(totalEntradas * 100) / 100,
    totalSaidas: Math.round(totalSaidas * 100) / 100,
    lancamentos: lista,
  };
}

// ---- mutações ----

export async function lancarManual(
  userId: string,
  unidadeId: string,
  input: { tipo: TipoLancamento; valor: number; data: string; descricao: string },
): Promise<{ ok: boolean; erro?: string }> {
  if (!(await podeEditarUnidade(userId, unidadeId))) {
    return { ok: false, erro: 'Você não tem permissão para lançar nesta unidade.' };
  }
  if (input.tipo !== 'ENTRADA' && input.tipo !== 'SAIDA') {
    return { ok: false, erro: 'Tipo inválido.' };
  }
  const valor = Math.round(Number(input.valor) * 100) / 100;
  if (!Number.isFinite(valor) || valor <= 0) return { ok: false, erro: 'Informe um valor maior que zero.' };
  const data = parseDia(input.data);
  if (!data) return { ok: false, erro: 'Data inválida.' };
  const descricao = input.descricao.trim();
  if (!descricao) return { ok: false, erro: 'Descreva o lançamento.' };

  await prisma.lancamentoCaixa.create({
    data: { unidadeId, tipo: input.tipo, valor, data, descricao, automatico: false, criadoPorId: userId },
  });
  return { ok: true };
}

/** Remove um lançamento MANUAL. Os automáticos seguem a ação (não removíveis aqui). */
export async function removerLancamento(
  userId: string,
  lancamentoId: string,
): Promise<{ ok: boolean; erro?: string }> {
  const l = await prisma.lancamentoCaixa.findUnique({
    where: { id: lancamentoId },
    select: { unidadeId: true, automatico: true },
  });
  if (!l) return { ok: false, erro: 'Lançamento não encontrado.' };
  if (!(await podeEditarUnidade(userId, l.unidadeId))) {
    return { ok: false, erro: 'Sem permissão.' };
  }
  if (l.automatico) {
    return { ok: false, erro: 'Esse débito vem de uma ação — edite o valor gasto na própria ação.' };
  }
  await prisma.lancamentoCaixa.delete({ where: { id: lancamentoId } });
  return { ok: true };
}

/**
 * Sincroniza o débito automático de uma ação no caixa da unidade.
 * Cria/atualiza uma SAÍDA quando a ação está FINALIZADA com valor gasto > 0;
 * remove o débito caso contrário. Idempotente — chamável a cada salvamento.
 */
export async function sincronizarLancamentoAcao(acaoId: string): Promise<void> {
  const a = await prisma.acaoComercial.findUnique({
    where: { id: acaoId },
    select: { id: true, unidadeId: true, status: true, valorGasto: true, dataFim: true, tipo: true, local: true },
  });
  if (!a) return;

  const deveDebitar = a.status === 'FINALIZADO' && a.valorGasto != null && a.valorGasto > 0;

  if (!deveDebitar) {
    await prisma.lancamentoCaixa.deleteMany({ where: { acaoId } });
    return;
  }

  const valor = Math.round(a.valorGasto! * 100) / 100;
  const descricao = `${a.tipo}${a.local ? ` · ${a.local}` : ''}`;
  await prisma.lancamentoCaixa.upsert({
    where: { acaoId },
    create: {
      unidadeId: a.unidadeId,
      tipo: 'SAIDA',
      valor,
      data: a.dataFim,
      descricao,
      automatico: true,
      acaoId,
    },
    update: { unidadeId: a.unidadeId, valor, data: a.dataFim, descricao },
  });
}
