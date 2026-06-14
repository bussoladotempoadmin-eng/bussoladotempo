/**
 * Camada de acesso do módulo Comercial (pago/ligável).
 * Modelo: Organizacao(comercialAtivo) → Unidade(cidade) → AcaoComercial.
 * Permissão: dono da org (diretor) vê tudo; coordenador vê só a unidade dele.
 * Isolado do core (agenda pessoal). Sem reflexão pessoal aqui — é setor.
 */
import { prisma, type StatusAcao } from '@bussola/db';

// Listas fixas (objetivo/resultado). Tipo de ação é editável pelo diretor.
export const OBJETIVOS = [
  'Captação de lead',
  'Relacionamento',
  'Reforço de marca',
  'Divulgação',
  'Assinatura de contrato',
  'Outro',
] as const;

export const RESULTADOS = ['Lead', 'Relacionamento', 'Reforço de marca', 'Outro'] as const;

export const TIPOS_PADRAO = [
  'Visita em empresa',
  'Ação condomínio',
  'Ação de trade',
  'Evento externo',
  'Visita em escola',
  'Órgão público',
];

export const STATUS_LABEL: Record<StatusAcao, string> = {
  EM_PLANEJAMENTO: 'Em planejamento',
  FINALIZADO: 'Finalizado',
  ADIADO: 'Adiado',
  CANCELADO: 'Cancelado',
};

export type UnidadeInfo = {
  id: string;
  nome: string;
  coordenadorId: string | null;
  coordenadorNome: string | null;
  ativa: boolean;
};

export type EscopoComercial = {
  org: { id: string; nome: string };
  ehDono: boolean;
  unidades: UnidadeInfo[];
};

// ---- Ativação / org ----

export async function getOrgComercialDono(userId: string) {
  return prisma.organizacao.findFirst({
    where: { ownerId: userId },
    orderBy: { createdAt: 'asc' },
    select: { id: true, nome: true, comercialAtivo: true },
  });
}

/** Liga o módulo: cria a org se não existir e marca comercialAtivo. Semeia tipos padrão. */
export async function ativarComercial(userId: string, nomeOrg?: string) {
  let org = await getOrgComercialDono(userId);
  if (!org) {
    const nome = (nomeOrg ?? '').trim() || 'Minha empresa';
    const criada = await prisma.organizacao.create({
      data: { nome, ownerId: userId, comercialAtivo: true },
      select: { id: true, nome: true, comercialAtivo: true },
    });
    org = criada;
  } else if (!org.comercialAtivo) {
    await prisma.organizacao.update({ where: { id: org.id }, data: { comercialAtivo: true } });
  }
  // Semeia tipos padrão (idempotente via @@unique).
  await prisma.tipoAcaoComercial.createMany({
    data: TIPOS_PADRAO.map((nome) => ({ organizacaoId: org!.id, nome })),
    skipDuplicates: true,
  });
  return org;
}

/** Escopo de leitura do usuário no módulo (ou null se sem acesso). */
export async function getEscopoComercial(userId: string): Promise<EscopoComercial | null> {
  // Dono com módulo ativo → vê todas as unidades.
  const dono = await getOrgComercialDono(userId);
  if (dono?.comercialAtivo) {
    const unidades = await prisma.unidade.findMany({
      where: { organizacaoId: dono.id },
      orderBy: { createdAt: 'asc' },
      include: { coordenador: { select: { name: true, email: true } } },
    });
    return {
      org: { id: dono.id, nome: dono.nome },
      ehDono: true,
      unidades: unidades.map(mapUnidade),
    };
  }

  // Coordenador de alguma unidade (de uma org com módulo ativo).
  const unidadesCoord = await prisma.unidade.findMany({
    where: { coordenadorId: userId, organizacao: { comercialAtivo: true } },
    orderBy: { createdAt: 'asc' },
    include: {
      coordenador: { select: { name: true, email: true } },
      organizacao: { select: { id: true, nome: true } },
    },
  });
  if (unidadesCoord.length > 0) {
    return {
      org: { id: unidadesCoord[0].organizacao.id, nome: unidadesCoord[0].organizacao.nome },
      ehDono: false,
      unidades: unidadesCoord.map(mapUnidade),
    };
  }
  return null;
}

function mapUnidade(u: {
  id: string;
  nome: string;
  coordenadorId: string | null;
  ativa: boolean;
  coordenador: { name: string | null; email: string } | null;
}): UnidadeInfo {
  return {
    id: u.id,
    nome: u.nome,
    coordenadorId: u.coordenadorId,
    coordenadorNome: u.coordenador ? u.coordenador.name?.trim() || u.coordenador.email : null,
    ativa: u.ativa,
  };
}

/** IDs de unidades que o usuário pode ver/editar. */
async function unidadeIdsVisiveis(userId: string): Promise<{ orgId: string; ids: string[] } | null> {
  const esc = await getEscopoComercial(userId);
  if (!esc) return null;
  return { orgId: esc.org.id, ids: esc.unidades.map((u) => u.id) };
}

async function podeAcessarUnidade(userId: string, unidadeId: string): Promise<boolean> {
  const v = await unidadeIdsVisiveis(userId);
  return Boolean(v && v.ids.includes(unidadeId));
}

// ---- Unidades (cadastro — só dono) ----

export async function criarUnidade(
  userId: string,
  nome: string,
  coordenadorEmail?: string,
): Promise<{ ok: boolean; erro?: string }> {
  const dono = await getOrgComercialDono(userId);
  if (!dono?.comercialAtivo) return { ok: false, erro: 'Ative o módulo Comercial primeiro.' };
  const nomeLimpo = nome.trim();
  if (!nomeLimpo) return { ok: false, erro: 'Dê um nome à unidade.' };

  let coordenadorId: string | null = null;
  const email = coordenadorEmail?.toLowerCase().trim();
  if (email) {
    const u = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (!u) return { ok: false, erro: 'O coordenador precisa ter entrado no app pelo menos uma vez.' };
    coordenadorId = u.id;
  }
  await prisma.unidade.create({
    data: { organizacaoId: dono.id, nome: nomeLimpo, coordenadorId },
  });
  return { ok: true };
}

export async function removerUnidade(userId: string, unidadeId: string): Promise<boolean> {
  const dono = await getOrgComercialDono(userId);
  if (!dono) return false;
  const res = await prisma.unidade.deleteMany({
    where: { id: unidadeId, organizacaoId: dono.id },
  });
  return res.count > 0;
}

// ---- Tipos de ação (cadastro — só dono) ----

export async function listarTipos(orgId: string): Promise<{ id: string; nome: string }[]> {
  const rows = await prisma.tipoAcaoComercial.findMany({
    where: { organizacaoId: orgId, ativo: true },
    orderBy: { nome: 'asc' },
    select: { id: true, nome: true },
  });
  return rows;
}

export async function criarTipo(userId: string, nome: string): Promise<{ ok: boolean; erro?: string }> {
  const dono = await getOrgComercialDono(userId);
  if (!dono?.comercialAtivo) return { ok: false, erro: 'Sem acesso.' };
  const n = nome.trim();
  if (!n) return { ok: false, erro: 'Digite o nome do tipo.' };
  try {
    await prisma.tipoAcaoComercial.create({ data: { organizacaoId: dono.id, nome: n } });
  } catch {
    return { ok: false, erro: 'Esse tipo já existe.' };
  }
  return { ok: true };
}

export async function removerTipo(userId: string, tipoId: string): Promise<boolean> {
  const dono = await getOrgComercialDono(userId);
  if (!dono) return false;
  const res = await prisma.tipoAcaoComercial.deleteMany({
    where: { id: tipoId, organizacaoId: dono.id },
  });
  return res.count > 0;
}

// ---- Ações ----

export type AcaoInput = {
  unidadeId: string;
  tipo: string;
  objetivo: string;
  local: string;
  responsaveis: string;
  dataInicio: string; // YYYY-MM-DD
  dataFim: string;
  detalhe?: string;
  valorSolicitado?: number | null;
};

function parseDia(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0);
}

export async function criarAcao(
  userId: string,
  input: AcaoInput,
): Promise<{ ok: boolean; erro?: string; id?: string }> {
  if (!(await podeAcessarUnidade(userId, input.unidadeId))) {
    return { ok: false, erro: 'Você não tem acesso a essa unidade.' };
  }
  const ini = parseDia(input.dataInicio);
  const fim = parseDia(input.dataFim || input.dataInicio);
  if (!ini || !fim) return { ok: false, erro: 'Data inválida.' };
  if (!input.tipo.trim() || !input.local.trim()) {
    return { ok: false, erro: 'Tipo e local são obrigatórios.' };
  }
  const a = await prisma.acaoComercial.create({
    data: {
      unidadeId: input.unidadeId,
      tipo: input.tipo.trim(),
      objetivo: input.objetivo.trim() || 'Outro',
      local: input.local.trim(),
      responsaveis: input.responsaveis.trim(),
      dataInicio: ini,
      dataFim: fim,
      detalhe: input.detalhe?.trim() || null,
      valorSolicitado: input.valorSolicitado ?? null,
      criadoPorId: userId,
    },
    select: { id: true },
  });
  return { ok: true, id: a.id };
}

async function acaoAcessivel(userId: string, acaoId: string) {
  const a = await prisma.acaoComercial.findUnique({
    where: { id: acaoId },
    include: { unidade: { select: { id: true, nome: true } } },
  });
  if (!a) return null;
  if (!(await podeAcessarUnidade(userId, a.unidadeId))) return null;
  return a;
}

export async function getAcao(userId: string, acaoId: string) {
  return acaoAcessivel(userId, acaoId);
}

export async function atualizarAcao(
  userId: string,
  acaoId: string,
  input: Partial<AcaoInput>,
): Promise<boolean> {
  const a = await acaoAcessivel(userId, acaoId);
  if (!a) return false;
  const data: Record<string, unknown> = {};
  if (input.tipo !== undefined) data.tipo = input.tipo.trim();
  if (input.objetivo !== undefined) data.objetivo = input.objetivo.trim();
  if (input.local !== undefined) data.local = input.local.trim();
  if (input.responsaveis !== undefined) data.responsaveis = input.responsaveis.trim();
  if (input.detalhe !== undefined) data.detalhe = input.detalhe?.trim() || null;
  if (input.valorSolicitado !== undefined) data.valorSolicitado = input.valorSolicitado ?? null;
  if (input.dataInicio) {
    const d = parseDia(input.dataInicio);
    if (d) data.dataInicio = d;
  }
  if (input.dataFim) {
    const d = parseDia(input.dataFim);
    if (d) data.dataFim = d;
  }
  await prisma.acaoComercial.update({ where: { id: acaoId }, data });
  return true;
}

export type ResultadoInput = {
  status: StatusAcao;
  resultado?: string | null;
  resultadoQtd?: number | null;
  valorGasto?: number | null;
  comentarios?: string | null;
};

export async function registrarResultado(
  userId: string,
  acaoId: string,
  input: ResultadoInput,
): Promise<boolean> {
  const a = await acaoAcessivel(userId, acaoId);
  if (!a) return false;
  await prisma.acaoComercial.update({
    where: { id: acaoId },
    data: {
      status: input.status,
      resultado: input.resultado?.trim() || null,
      resultadoQtd: input.resultadoQtd ?? null,
      valorGasto: input.valorGasto ?? null,
      comentarios: input.comentarios?.trim() || null,
    },
  });
  return true;
}

export async function reagendar(
  userId: string,
  acaoId: string,
  dataInicio: string,
  dataFim: string,
): Promise<boolean> {
  const a = await acaoAcessivel(userId, acaoId);
  if (!a) return false;
  const ini = parseDia(dataInicio);
  const fim = parseDia(dataFim || dataInicio);
  if (!ini || !fim) return false;
  await prisma.acaoComercial.update({
    where: { id: acaoId },
    data: { dataInicio: ini, dataFim: fim, status: 'EM_PLANEJAMENTO' },
  });
  return true;
}

/** Realoca: muda a unidade e/ou os responsáveis. */
export async function realocar(
  userId: string,
  acaoId: string,
  destino: { unidadeId?: string; responsaveis?: string },
): Promise<{ ok: boolean; erro?: string }> {
  const a = await acaoAcessivel(userId, acaoId);
  if (!a) return { ok: false, erro: 'Ação não encontrada.' };
  const data: Record<string, unknown> = {};
  if (destino.unidadeId && destino.unidadeId !== a.unidadeId) {
    if (!(await podeAcessarUnidade(userId, destino.unidadeId))) {
      return { ok: false, erro: 'Você não tem acesso à unidade de destino.' };
    }
    data.unidadeId = destino.unidadeId;
  }
  if (destino.responsaveis !== undefined) data.responsaveis = destino.responsaveis.trim();
  if (Object.keys(data).length === 0) return { ok: true };
  await prisma.acaoComercial.update({ where: { id: acaoId }, data });
  return { ok: true };
}

export async function removerAcao(userId: string, acaoId: string): Promise<boolean> {
  const a = await acaoAcessivel(userId, acaoId);
  if (!a) return false;
  await prisma.acaoComercial.delete({ where: { id: acaoId } });
  return true;
}

// ---- Listagem + agregações ----

export type AcaoListItem = {
  id: string;
  unidadeId: string;
  unidadeNome: string;
  tipo: string;
  objetivo: string;
  local: string;
  responsaveis: string;
  dataInicio: string;
  dataFim: string;
  status: StatusAcao;
  resultado: string | null;
  resultadoQtd: number | null;
  valorSolicitado: number | null;
  valorGasto: number | null;
  comentarios: string | null;
};

type Filtro = { unidadeId?: string; de?: string; ate?: string; status?: StatusAcao };

async function buscarAcoes(userId: string, filtro: Filtro) {
  const v = await unidadeIdsVisiveis(userId);
  if (!v || v.ids.length === 0) return [];
  const ids =
    filtro.unidadeId && v.ids.includes(filtro.unidadeId) ? [filtro.unidadeId] : v.ids;

  const where: Record<string, unknown> = { unidadeId: { in: ids } };
  if (filtro.status) where.status = filtro.status;
  const de = filtro.de ? parseDia(filtro.de) : null;
  const ate = filtro.ate ? parseDia(filtro.ate) : null;
  if (de || ate) {
    // Ação cai no período se o intervalo dela cruza [de, ate].
    where.AND = [
      ate ? { dataInicio: { lte: ate } } : {},
      de ? { dataFim: { gte: de } } : {},
    ];
  }
  return prisma.acaoComercial.findMany({
    where,
    orderBy: { dataInicio: 'desc' },
    include: { unidade: { select: { nome: true } } },
  });
}

function iso(d: Date) {
  return d.toISOString().slice(0, 10);
}

export async function listarAcoes(userId: string, filtro: Filtro = {}): Promise<AcaoListItem[]> {
  const rows = await buscarAcoes(userId, filtro);
  return rows.map((a) => ({
    id: a.id,
    unidadeId: a.unidadeId,
    unidadeNome: a.unidade.nome,
    tipo: a.tipo,
    objetivo: a.objetivo,
    local: a.local,
    responsaveis: a.responsaveis,
    dataInicio: iso(a.dataInicio),
    dataFim: iso(a.dataFim),
    status: a.status,
    resultado: a.resultado,
    resultadoQtd: a.resultadoQtd,
    valorSolicitado: a.valorSolicitado,
    valorGasto: a.valorGasto,
    comentarios: a.comentarios,
  }));
}

export type PainelComercial = {
  totalAcoes: number;
  executadas: number;
  pctExecucao: number;
  totalLeads: number;
  totalSolicitado: number;
  totalGasto: number;
  custoPorLead: number | null;
  porUnidade: { nome: string; leads: number; solicitado: number; gasto: number }[];
  porTipo: { tipo: string; leads: number; gasto: number; custoPorLead: number | null }[];
};

export async function getPainelComercial(userId: string, filtro: Filtro = {}): Promise<PainelComercial> {
  const rows = await buscarAcoes(userId, filtro);
  const exec = rows.filter((a) => a.status === 'FINALIZADO');
  const totalLeads = rows.reduce((s, a) => s + (a.resultadoQtd ?? 0), 0);
  const totalSolicitado = rows.reduce((s, a) => s + (a.valorSolicitado ?? 0), 0);
  const totalGasto = rows.reduce((s, a) => s + (a.valorGasto ?? 0), 0);

  const uni = new Map<string, { nome: string; leads: number; solicitado: number; gasto: number }>();
  for (const a of rows) {
    const cur = uni.get(a.unidadeId) ?? { nome: a.unidade.nome, leads: 0, solicitado: 0, gasto: 0 };
    cur.leads += a.resultadoQtd ?? 0;
    cur.solicitado += a.valorSolicitado ?? 0;
    cur.gasto += a.valorGasto ?? 0;
    uni.set(a.unidadeId, cur);
  }

  const tip = new Map<string, { tipo: string; leads: number; gasto: number }>();
  for (const a of rows) {
    const cur = tip.get(a.tipo) ?? { tipo: a.tipo, leads: 0, gasto: 0 };
    cur.leads += a.resultadoQtd ?? 0;
    cur.gasto += a.valorGasto ?? 0;
    tip.set(a.tipo, cur);
  }

  return {
    totalAcoes: rows.length,
    executadas: exec.length,
    pctExecucao: rows.length ? Math.round((exec.length / rows.length) * 100) : 0,
    totalLeads,
    totalSolicitado,
    totalGasto,
    custoPorLead: totalLeads > 0 ? totalGasto / totalLeads : null,
    porUnidade: Array.from(uni.values()).sort((a, b) => b.leads - a.leads),
    porTipo: Array.from(tip.values())
      .map((t) => ({ ...t, custoPorLead: t.leads > 0 ? t.gasto / t.leads : null }))
      .sort((a, b) => b.leads - a.leads),
  };
}
