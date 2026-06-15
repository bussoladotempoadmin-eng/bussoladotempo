/**
 * Motor de comissões de parceiros — referência: BLUEPRINT §7.
 *
 * Regras herdadas do TriboCRM:
 *  - Uma comissão por cobrança paga (cobrancaId único = idempotência).
 *  - rate congelado no momento da criação (mudar a tabela depois não mexe nas antigas).
 *  - Carência de 30 dias antes de liberar saque (protege contra reembolso/chargeback).
 *  - Comissão progressiva por faixas (tiers) conforme nº de clientes ATIVOS do parceiro.
 *  - Payout manual (o sistema calcula e organiza; a transferência é no braço).
 */
import { randomBytes } from 'crypto';
import { prisma } from '@bussola/db';

const CARENCIA_DIAS = 30;

export type Tier = { ateClientes: number | null; rate: number };

/** Escolhe o rate pela faixa: primeira faixa cujo teto >= clientesAtivos (null = topo). */
export function ratePorTier(tiers: Tier[] | null | undefined, fallback: number, clientesAtivos: number): number {
  if (!tiers || tiers.length === 0) return fallback;
  const ordenadas = [...tiers].sort((a, b) => (a.ateClientes ?? Infinity) - (b.ateClientes ?? Infinity));
  for (const t of ordenadas) {
    if (t.ateClientes == null || clientesAtivos <= t.ateClientes) return t.rate;
  }
  return ordenadas[ordenadas.length - 1]?.rate ?? fallback;
}

function lerTiers(json: unknown): Tier[] | null {
  if (!Array.isArray(json)) return null;
  const out: Tier[] = [];
  for (const item of json) {
    if (item && typeof item === 'object') {
      const o = item as Record<string, unknown>;
      const rate = Number(o.rate);
      if (!Number.isFinite(rate)) continue;
      const ate = o.ateClientes == null ? null : Number(o.ateClientes);
      out.push({ ateClientes: ate, rate });
    }
  }
  return out.length ? out : null;
}

/**
 * Cria a comissão de uma cobrança PAGA, se a conta foi indicada por um parceiro.
 * Idempotente (cobrancaId único). Best-effort: nunca quebra o pagamento.
 */
export async function criarComissaoSeIndicado(cobrancaId: string): Promise<void> {
  try {
    const cobranca = await prisma.cobranca.findUnique({
      where: { id: cobrancaId },
      select: {
        id: true,
        valor: true,
        pagaEm: true,
        assinatura: {
          select: { id: true, indicadoPorParceiroId: true },
        },
      },
    });
    if (!cobranca?.assinatura?.indicadoPorParceiroId) return;

    const jaExiste = await prisma.comissaoParceiro.findUnique({
      where: { cobrancaId },
      select: { id: true },
    });
    if (jaExiste) return; // idempotência

    const parceiroId = cobranca.assinatura.indicadoPorParceiroId;
    const parceiro = await prisma.parceiro.findUnique({
      where: { id: parceiroId },
      select: { comissaoTiers: true, comissaoRate: true, ativo: true },
    });
    if (!parceiro || !parceiro.ativo) return;

    // Clientes ativos do parceiro (define a faixa de comissão).
    const clientesAtivos = await prisma.assinatura.count({
      where: { indicadoPorParceiroId: parceiroId, status: 'ATIVA' },
    });
    const rate = ratePorTier(lerTiers(parceiro.comissaoTiers), parceiro.comissaoRate, clientesAtivos);
    const comissao = Math.round(((cobranca.valor * rate) / 100) * 100) / 100;
    const base = cobranca.pagaEm ?? new Date();
    const disponivelEm = new Date(base.getTime() + CARENCIA_DIAS * 86400000);

    await prisma.comissaoParceiro.create({
      data: {
        parceiroId,
        cobrancaId,
        assinaturaId: cobranca.assinatura.id,
        valor: cobranca.valor,
        rate,
        comissao,
        status: 'PENDENTE',
        disponivelEm,
      },
    });
  } catch (e) {
    console.error('[comissoes] falha ao criar comissão (ignorado):', e);
  }
}

/** Promove comissões PENDENTE → DISPONIVEL quando passa a carência. Roda no cron. */
export async function liberarComissoes(): Promise<number> {
  const r = await prisma.comissaoParceiro.updateMany({
    where: { status: 'PENDENTE', disponivelEm: { lte: new Date() } },
    data: { status: 'DISPONIVEL' },
  });
  return r.count;
}

// ---------- admin: CRUD e relatórios ----------

export async function listarParceiros() {
  const parceiros = await prisma.parceiro.findMany({ orderBy: { createdAt: 'desc' } });
  const ids = parceiros.map((p) => p.id);
  const [ativosPorParceiro, comissoesPorParceiro] = await Promise.all([
    prisma.assinatura.groupBy({
      by: ['indicadoPorParceiroId'],
      where: { indicadoPorParceiroId: { in: ids }, status: 'ATIVA' },
      _count: { _all: true },
    }),
    prisma.comissaoParceiro.groupBy({
      by: ['parceiroId', 'status'],
      where: { parceiroId: { in: ids } },
      _sum: { comissao: true },
    }),
  ]);
  const ativosMap = new Map(ativosPorParceiro.map((a) => [a.indicadoPorParceiroId, a._count._all]));
  const somaMap = new Map<string, Record<string, number>>();
  for (const c of comissoesPorParceiro) {
    const m = somaMap.get(c.parceiroId) ?? {};
    m[c.status] = c._sum.comissao ?? 0;
    somaMap.set(c.parceiroId, m);
  }
  return parceiros.map((p) => ({
    ...p,
    clientesAtivos: ativosMap.get(p.id) ?? 0,
    somaPendente: somaMap.get(p.id)?.PENDENTE ?? 0,
    somaDisponivel: somaMap.get(p.id)?.DISPONIVEL ?? 0,
    somaPaga: somaMap.get(p.id)?.PAGA ?? 0,
  }));
}

export async function parceiroDetalhe(id: string) {
  const parceiro = await prisma.parceiro.findUnique({ where: { id } });
  if (!parceiro) return null;
  const [indicados, comissoes] = await Promise.all([
    prisma.assinatura.findMany({
      where: { indicadoPorParceiroId: id },
      select: { id: true, status: true, owner: { select: { name: true, email: true } }, plano: { select: { nome: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.comissaoParceiro.findMany({
      where: { parceiroId: id },
      orderBy: { createdAt: 'desc' },
      take: 200,
    }),
  ]);
  return { parceiro, indicados, comissoes };
}

export function gerarCodigoParceiro(): string {
  return 'PRT' + randomBytes(4).toString('hex').toUpperCase();
}

export async function criarParceiro(input: {
  nome: string;
  email?: string;
  comissaoRate?: number;
  comissaoTiers?: Tier[];
  pixChave?: string;
}): Promise<{ ok: true; id: string } | { ok: false; erro: string }> {
  const nome = input.nome.trim();
  if (!nome) return { ok: false, erro: 'Informe o nome do parceiro.' };
  // Gera um código único (tenta poucas vezes).
  let code = gerarCodigoParceiro();
  for (let i = 0; i < 5; i++) {
    const existe = await prisma.parceiro.findUnique({ where: { code }, select: { id: true } });
    if (!existe) break;
    code = gerarCodigoParceiro();
  }
  const p = await prisma.parceiro.create({
    data: {
      code,
      nome,
      email: input.email?.trim() || null,
      comissaoRate: input.comissaoRate ?? 0,
      comissaoTiers: input.comissaoTiers ? (input.comissaoTiers as object) : undefined,
      pixChave: input.pixChave?.trim() || null,
    },
    select: { id: true },
  });
  return { ok: true, id: p.id };
}

export async function editarParceiro(
  id: string,
  patch: { nome?: string; email?: string; comissaoRate?: number; comissaoTiers?: Tier[]; pixChave?: string; ativo?: boolean },
): Promise<{ ok: true } | { ok: false; erro: string }> {
  const data: Record<string, unknown> = {};
  if (patch.nome != null) data.nome = patch.nome.trim();
  if (patch.email != null) data.email = patch.email.trim() || null;
  if (patch.comissaoRate != null) data.comissaoRate = Math.max(0, patch.comissaoRate);
  if (patch.comissaoTiers != null) data.comissaoTiers = patch.comissaoTiers as object;
  if (patch.pixChave != null) data.pixChave = patch.pixChave.trim() || null;
  if (patch.ativo != null) data.ativo = patch.ativo;
  if (Object.keys(data).length === 0) return { ok: false, erro: 'Nada para alterar' };
  await prisma.parceiro.update({ where: { id }, data });
  return { ok: true };
}

/** Marca comissões DISPONIVEL → PAGA (payout manual). */
export async function marcarComissoesPagas(ids: string[]): Promise<number> {
  if (ids.length === 0) return 0;
  const r = await prisma.comissaoParceiro.updateMany({
    where: { id: { in: ids.slice(0, 200) }, status: 'DISPONIVEL' },
    data: { status: 'PAGA' },
  });
  return r.count;
}

/** Vincula/desvincula um parceiro a uma assinatura (atribuição manual pelo admin). */
export async function vincularParceiroAssinatura(
  assinaturaId: string,
  parceiroCodeOuVazio: string,
  alteradoPor?: string,
): Promise<{ ok: true } | { ok: false; erro: string }> {
  const code = parceiroCodeOuVazio.trim().toUpperCase();
  const atual = await prisma.assinatura.findUnique({
    where: { id: assinaturaId },
    select: { indicadoPorParceiroId: true },
  });
  if (!atual) return { ok: false, erro: 'Assinatura não encontrada' };

  let novoParceiroId: string | null = null;
  if (code) {
    const parceiro = await prisma.parceiro.findUnique({ where: { code }, select: { id: true } });
    if (!parceiro) return { ok: false, erro: 'Código de parceiro não encontrado' };
    novoParceiroId = parceiro.id;
  }

  await prisma.$transaction([
    prisma.assinatura.update({
      where: { id: assinaturaId },
      data: {
        indicadoPorParceiroId: novoParceiroId,
        indicadoEm: novoParceiroId && !atual.indicadoPorParceiroId ? new Date() : undefined,
      },
    }),
    prisma.trocaParceiro.create({
      data: {
        assinaturaId,
        parceiroAntigoId: atual.indicadoPorParceiroId,
        parceiroNovoId: novoParceiroId,
        alteradoPor: alteradoPor ?? null,
        fonte: 'super_admin',
      },
    }),
  ]);
  return { ok: true };
}
