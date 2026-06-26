/**
 * Camada de acesso do módulo Comercial (pago/ligável).
 * Modelo: Organizacao(comercialAtivo) = EMPRESA → Unidade(cidade) → AcaoComercial.
 * Multi-empresa: um usuário pode ser dono de várias empresas (frentes diferentes).
 * Permissão: dono da empresa (diretor) vê tudo; coordenador vê só a unidade dele.
 * Isolado do core (agenda pessoal). Sem reflexão pessoal aqui — é setor.
 */
import { prisma, type StatusAcao, type MetodoRepasse, type TipoConta } from '@bussola/db';
import { resolverAcessoComercial } from './comercial-acessos';
import { sincronizarLancamentoAcao } from './comercial-caixa';
import { recalcularRepassePendente } from './comercial-repasse';

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

export type EmpresaInfo = { id: string; nome: string; ehDono: boolean };

export type EscopoComercial = {
  org: { id: string; nome: string };
  ehDono: boolean;
  corporativo: boolean; // vê todas as unidades (dono ou acesso corporativo)
  podeGerenciarAcessos: boolean; // dono ou admin
  podeConfigRepasse: boolean; // corporativo ou admin — configura repasse das unidades
  podeCriarEmpresa: boolean; // pode criar novas empresas (dono sempre pode)
  somenteLeitura: boolean; // nível VER (não edita nada)
  unidades: UnidadeInfo[];
};

export type RepasseUnidade = {
  metodo: MetodoRepasse | null;
  banco: string | null;
  agencia: string | null;
  conta: string | null;
  tipoConta: TipoConta | null;
  pix: string | null;
  cpfCnpj: string | null;
  titular: string | null;
};

// ---- Empresas (organizações com comercial ativo) ----

/** Todas as empresas que o usuário acessa (dono OU coordenador), do mais antigo ao recente. */
export async function getEmpresasAcessiveis(userId: string): Promise<EmpresaInfo[]> {
  const donas = await prisma.organizacao.findMany({
    where: { ownerId: userId, comercialAtivo: true },
    orderBy: { createdAt: 'asc' },
    select: { id: true, nome: true },
  });
  const coord = await prisma.unidade.findMany({
    where: { coordenadorId: userId, organizacao: { comercialAtivo: true } },
    orderBy: { createdAt: 'asc' },
    select: { organizacao: { select: { id: true, nome: true } } },
  });
  // Acessos pelo novo modelo (defensivo: tabela pode não existir antes da migration).
  const acessos = await prisma.acessoComercial
    .findMany({
      where: { userId, organizacao: { comercialAtivo: true } },
      orderBy: { createdAt: 'asc' },
      select: { organizacao: { select: { id: true, nome: true } } },
    })
    .catch(() => [] as { organizacao: { id: string; nome: string } }[]);

  const mapa = new Map<string, EmpresaInfo>();
  for (const o of donas) mapa.set(o.id, { id: o.id, nome: o.nome, ehDono: true });
  for (const u of coord) {
    if (!mapa.has(u.organizacao.id)) {
      mapa.set(u.organizacao.id, { id: u.organizacao.id, nome: u.organizacao.nome, ehDono: false });
    }
  }
  for (const a of acessos) {
    if (!mapa.has(a.organizacao.id)) {
      mapa.set(a.organizacao.id, { id: a.organizacao.id, nome: a.organizacao.nome, ehDono: false });
    }
  }
  return Array.from(mapa.values());
}

/** Resolve qual empresa usar: a preferida (cookie) se acessível, senão a primeira. */
export async function resolverEmpresaId(userId: string, preferido?: string): Promise<string | null> {
  const empresas = await getEmpresasAcessiveis(userId);
  if (preferido && empresas.some((e) => e.id === preferido)) return preferido;
  return empresas[0]?.id ?? null;
}

/**
 * Pode o usuário criar uma nova empresa?
 *  - quem ainda não tem NENHUMA empresa → sim (ativação inicial, vira dono);
 *  - dono de qualquer org → sim (sempre);
 *  - acesso com `podeCriarEmpresa` em qualquer org → sim;
 *  - senão → não.
 */
export async function podeCriarEmpresa(userId: string): Promise<boolean> {
  const empresas = await getEmpresasAcessiveis(userId);
  if (empresas.length === 0) return true; // primeira empresa (ativação)
  if (empresas.some((e) => e.ehDono)) return true; // dono sempre pode
  const liberado = await prisma.acessoComercial
    .count({ where: { userId, podeCriarEmpresa: true } })
    .catch(() => 0);
  return liberado > 0;
}

/** Cria uma NOVA empresa (org com comercial ativo) e semeia os tipos padrão. */
export async function criarEmpresa(userId: string, nome: string): Promise<{ id: string; nome: string }> {
  const nomeLimpo = nome.trim() || 'Nova empresa';
  const org = await prisma.organizacao.create({
    data: { nome: nomeLimpo, ownerId: userId, comercialAtivo: true },
    select: { id: true, nome: true },
  });
  await prisma.tipoAcaoComercial.createMany({
    data: TIPOS_PADRAO.map((n) => ({ organizacaoId: org.id, nome: n })),
    skipDuplicates: true,
  });
  return org;
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

/** Escopo de uma empresa específica (ou null se sem acesso). */
export async function getEscopoComercial(
  userId: string,
  orgId: string,
): Promise<EscopoComercial | null> {
  const org = await prisma.organizacao.findFirst({
    where: { id: orgId, comercialAtivo: true },
    select: { id: true, nome: true },
  });
  if (!org) return null;

  const acesso = await resolverAcessoComercial(userId, orgId);
  if (!acesso.temAcesso) return null;

  const unidades = await prisma.unidade.findMany({
    where: acesso.corporativo
      ? { organizacaoId: orgId }
      : { organizacaoId: orgId, id: { in: acesso.unidadesIds } },
    orderBy: { nome: 'asc' }, // ordem alfabética em todas as telas
    include: { coordenador: { select: { name: true, email: true } } },
  });

  return {
    org,
    ehDono: acesso.dono,
    corporativo: acesso.corporativo,
    podeGerenciarAcessos: acesso.dono || acesso.admin,
    podeConfigRepasse: acesso.corporativo || acesso.admin,
    podeCriarEmpresa: acesso.podeCriarEmpresa,
    somenteLeitura: acesso.nivel === 'VER' && !acesso.dono,
    unidades: unidades.map(mapUnidade),
  };
}

/** Dados de repasse por unidade da empresa. Só p/ corporativo/admin (senão {}). */
export async function getRepasses(
  userId: string,
  orgId: string,
): Promise<Record<string, RepasseUnidade>> {
  const acesso = await resolverAcessoComercial(userId, orgId);
  if (!acesso.temAcesso || !(acesso.corporativo || acesso.admin)) return {};
  const us = await prisma.unidade.findMany({
    where: { organizacaoId: orgId },
    select: {
      id: true,
      repasseMetodo: true,
      repasseBanco: true,
      repasseAgencia: true,
      repasseConta: true,
      repasseTipoConta: true,
      repassePix: true,
      repasseCpfCnpj: true,
      repasseTitular: true,
    },
  });
  const out: Record<string, RepasseUnidade> = {};
  for (const u of us) {
    out[u.id] = {
      metodo: u.repasseMetodo,
      banco: u.repasseBanco,
      agencia: u.repasseAgencia,
      conta: u.repasseConta,
      tipoConta: u.repasseTipoConta,
      pix: u.repassePix,
      cpfCnpj: u.repasseCpfCnpj,
      titular: u.repasseTitular,
    };
  }
  return out;
}

/**
 * Salva o repasse de uma unidade. metodo null = não configurado (limpa tudo).
 * CARTAO_CORPORATIVO = só o método; TRANSFERENCIA = método + dados bancários.
 * Permissão: corporativo ou admin da empresa da unidade.
 */
export async function salvarRepasseUnidade(
  userId: string,
  unidadeId: string,
  patch: {
    metodo: MetodoRepasse | null;
    banco?: string;
    agencia?: string;
    conta?: string;
    tipoConta?: TipoConta | null;
    pix?: string;
    cpfCnpj?: string;
    titular?: string;
  },
): Promise<{ ok: boolean; erro?: string }> {
  const u = await prisma.unidade.findUnique({ where: { id: unidadeId }, select: { organizacaoId: true } });
  if (!u) return { ok: false, erro: 'Unidade não encontrada.' };
  const acesso = await resolverAcessoComercial(userId, u.organizacaoId);
  if (!acesso.temAcesso || !(acesso.corporativo || acesso.admin)) {
    return { ok: false, erro: 'Sem permissão para configurar repasse.' };
  }

  const limpo = (s?: string) => (s && s.trim() ? s.trim() : null);
  const semBanco = {
    repasseBanco: null,
    repasseAgencia: null,
    repasseConta: null,
    repasseTipoConta: null,
    repassePix: null,
    repasseCpfCnpj: null,
    repasseTitular: null,
  };

  let data: Record<string, unknown>;
  if (patch.metodo == null) {
    data = { repasseMetodo: null, ...semBanco };
  } else if (patch.metodo === 'CARTAO_CORPORATIVO') {
    data = { repasseMetodo: 'CARTAO_CORPORATIVO', ...semBanco };
  } else {
    data = {
      repasseMetodo: 'TRANSFERENCIA',
      repasseBanco: limpo(patch.banco),
      repasseAgencia: limpo(patch.agencia),
      repasseConta: limpo(patch.conta),
      repasseTipoConta:
        patch.tipoConta === 'CORRENTE' || patch.tipoConta === 'POUPANCA' ? patch.tipoConta : null,
      repassePix: limpo(patch.pix),
      repasseCpfCnpj: limpo(patch.cpfCnpj),
      repasseTitular: limpo(patch.titular),
    };
  }
  await prisma.unidade.update({ where: { id: unidadeId }, data });
  return { ok: true };
}

/** IDs de unidades acessíveis numa empresa (corporativo = todas; senão o escopo). */
async function idsDaOrg(userId: string, orgId: string): Promise<string[]> {
  const acesso = await resolverAcessoComercial(userId, orgId);
  if (!acesso.temAcesso) return [];
  if (acesso.corporativo) {
    const us = await prisma.unidade.findMany({ where: { organizacaoId: orgId }, select: { id: true } });
    return us.map((u) => u.id);
  }
  return acesso.unidadesIds;
}

async function escopoDaUnidade(unidadeId: string) {
  const u = await prisma.unidade.findUnique({
    where: { id: unidadeId },
    select: { organizacaoId: true, organizacao: { select: { comercialAtivo: true } } },
  });
  if (!u || !u.organizacao.comercialAtivo) return null;
  return u.organizacaoId;
}

/** Pode VER esta unidade? */
async function podeAcessarUnidade(userId: string, unidadeId: string): Promise<boolean> {
  const orgId = await escopoDaUnidade(unidadeId);
  if (!orgId) return false;
  return (await resolverAcessoComercial(userId, orgId)).podeVer(unidadeId);
}

/** Pode EDITAR esta unidade? (nível EDITAR — bloqueia o consultor/VER) */
async function podeEditarUnidade(userId: string, unidadeId: string): Promise<boolean> {
  const orgId = await escopoDaUnidade(unidadeId);
  if (!orgId) return false;
  return (await resolverAcessoComercial(userId, orgId)).podeEditar(unidadeId);
}

/** Pode gerenciar a empresa (cadastrar/editar unidades e tipos): dono OU admin. */
async function podeGerenciarOrg(userId: string, orgId: string): Promise<boolean> {
  const a = await resolverAcessoComercial(userId, orgId);
  return a.temAcesso && (a.dono || a.admin);
}

// ---- Acessos do Comercial (RBAC) ----

export type AcessoComercialInfo = {
  id: string;
  userId: string;
  nome: string;
  email: string;
  nivel: 'VER' | 'EDITAR';
  todasUnidades: boolean;
  admin: boolean;
  podeCriarEmpresa: boolean;
  rotulo: string | null;
  unidadesIds: string[];
  ultimoLoginEm: string | null; // ISO — só corporativo/admin vê esta tela
};

/** userIds com QUALQUER acesso à org (dono + time + comercial + coordenador legado). */
async function idsComAcesso(orgId: string): Promise<Set<string>> {
  const org = await prisma.organizacao.findUnique({ where: { id: orgId }, select: { ownerId: true } });
  const ids = new Set<string>();
  if (org) ids.add(org.ownerId);
  const [membros, acessos, coords] = await Promise.all([
    prisma.membroEquipe.findMany({ where: { organizacaoId: orgId }, select: { userId: true } }),
    prisma.acessoComercial
      .findMany({ where: { organizacaoId: orgId }, select: { userId: true } })
      .catch(() => [] as { userId: string }[]),
    prisma.unidade.findMany({
      where: { organizacaoId: orgId, coordenadorId: { not: null } },
      select: { coordenadorId: true },
    }),
  ]);
  membros.forEach((m) => ids.add(m.userId));
  acessos.forEach((a) => ids.add(a.userId));
  coords.forEach((c) => c.coordenadorId && ids.add(c.coordenadorId));
  return ids;
}

/** Assentos USADOS (Opção A: todo acesso conta como 1). */
export async function assentosUsados(orgId: string): Promise<number> {
  return (await idsComAcesso(orgId)).size;
}

async function assentosContratados(orgId: string): Promise<number | null> {
  const org = await prisma.organizacao.findUnique({ where: { id: orgId }, select: { ownerId: true } });
  if (!org) return null;
  const a = await prisma.assinatura.findUnique({
    where: { ownerUserId: org.ownerId },
    select: { assentos: true },
  });
  return a?.assentos ?? null;
}

/** Cabe um novo acesso? (usuário já contado = sempre cabe; sem plano = sem limite) */
export async function cabeNovoAcesso(
  orgId: string,
  novoUserId?: string,
): Promise<{ cabe: boolean; usados: number; assentos: number | null }> {
  const assentos = await assentosContratados(orgId);
  const ids = await idsComAcesso(orgId);
  const usados = ids.size;
  if (novoUserId && ids.has(novoUserId)) return { cabe: true, usados, assentos };
  if (assentos == null) return { cabe: true, usados, assentos };
  return { cabe: usados < assentos, usados, assentos };
}

export async function listarAcessosComercial(
  userId: string,
  orgId: string,
): Promise<AcessoComercialInfo[] | null> {
  const quem = await resolverAcessoComercial(userId, orgId);
  if (!quem.dono && !quem.admin) return null; // só dono/admin gerencia
  const linhas = await prisma.acessoComercial
    .findMany({
      where: { organizacaoId: orgId },
      include: {
        user: { select: { name: true, email: true, ultimoLoginEm: true } },
        unidades: { select: { unidadeId: true } },
      },
      orderBy: { createdAt: 'asc' },
    })
    .catch(() => []);
  return linhas.map((l) => ({
    id: l.id,
    userId: l.userId,
    nome: l.user.name?.trim() || l.user.email,
    email: l.user.email,
    nivel: l.nivel,
    todasUnidades: l.todasUnidades,
    admin: l.admin,
    podeCriarEmpresa: l.podeCriarEmpresa,
    rotulo: l.rotulo,
    unidadesIds: l.unidades.map((u) => u.unidadeId),
    ultimoLoginEm: l.user.ultimoLoginEm ? l.user.ultimoLoginEm.toISOString() : null,
  }));
}

export async function salvarAcessoComercial(
  userId: string,
  orgId: string,
  input: {
    email: string;
    nivel: 'VER' | 'EDITAR';
    todasUnidades: boolean;
    unidadeIds: string[];
    admin: boolean;
    podeCriarEmpresa: boolean;
    rotulo?: string;
  },
): Promise<{ ok: boolean; erro?: string }> {
  const quem = await resolverAcessoComercial(userId, orgId);
  if (!quem.dono && !quem.admin) return { ok: false, erro: 'Sem permissão.' };

  const email = input.email.toLowerCase().trim();
  const alvo = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (!alvo) return { ok: false, erro: 'A pessoa precisa ter entrado no app pelo menos uma vez.' };

  const org = await prisma.organizacao.findUnique({ where: { id: orgId }, select: { ownerId: true } });
  if (alvo.id === org?.ownerId) return { ok: false, erro: 'O dono já tem acesso total.' };

  const cap = await cabeNovoAcesso(orgId, alvo.id);
  if (!cap.cabe) {
    return { ok: false, erro: `Você usou todos os ${cap.assentos} assentos. Aumente o plano pra adicionar mais.` };
  }

  let unidadeIds = input.todasUnidades ? [] : input.unidadeIds;
  if (!input.todasUnidades) {
    const validas = await prisma.unidade.findMany({
      where: { id: { in: unidadeIds }, organizacaoId: orgId },
      select: { id: true },
    });
    unidadeIds = validas.map((u) => u.id);
    if (unidadeIds.length === 0) return { ok: false, erro: 'Escolha ao menos uma unidade (ou marque "todas").' };
  }

  const acesso = await prisma.acessoComercial.upsert({
    where: { organizacaoId_userId: { organizacaoId: orgId, userId: alvo.id } },
    create: {
      organizacaoId: orgId,
      userId: alvo.id,
      nivel: input.nivel,
      todasUnidades: input.todasUnidades,
      admin: input.admin,
      podeCriarEmpresa: input.podeCriarEmpresa,
      rotulo: input.rotulo?.trim() || null,
    },
    update: {
      nivel: input.nivel,
      todasUnidades: input.todasUnidades,
      admin: input.admin,
      podeCriarEmpresa: input.podeCriarEmpresa,
      rotulo: input.rotulo?.trim() || null,
    },
    select: { id: true },
  });
  await prisma.acessoComercialUnidade.deleteMany({ where: { acessoId: acesso.id } });
  if (unidadeIds.length > 0) {
    await prisma.acessoComercialUnidade.createMany({
      data: unidadeIds.map((unidadeId) => ({ acessoId: acesso.id, unidadeId })),
      skipDuplicates: true,
    });
  }
  return { ok: true };
}

export async function removerAcessoComercial(
  userId: string,
  orgId: string,
  acessoId: string,
): Promise<boolean> {
  const quem = await resolverAcessoComercial(userId, orgId);
  if (!quem.dono && !quem.admin) return false;
  const r = await prisma.acessoComercial.deleteMany({ where: { id: acessoId, organizacaoId: orgId } });
  return r.count > 0;
}

// ---- Unidades (cadastro — só dono) ----

export async function criarUnidade(
  userId: string,
  orgId: string,
  nome: string,
  coordenadorEmail?: string,
): Promise<{ ok: boolean; erro?: string }> {
  if (!(await podeGerenciarOrg(userId, orgId))) return { ok: false, erro: 'Sem permissão nesta empresa.' };
  const nomeLimpo = nome.trim();
  if (!nomeLimpo) return { ok: false, erro: 'Dê um nome à unidade.' };

  let coordenadorId: string | null = null;
  const email = coordenadorEmail?.toLowerCase().trim();
  if (email) {
    const u = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (!u) return { ok: false, erro: 'O coordenador precisa ter entrado no app pelo menos uma vez.' };
    coordenadorId = u.id;
  }
  await prisma.unidade.create({ data: { organizacaoId: orgId, nome: nomeLimpo, coordenadorId } });
  return { ok: true };
}

/** Edita nome e/ou coordenador de uma unidade. coordenadorEmail vazio = remove o coordenador. */
export async function editarUnidade(
  userId: string,
  unidadeId: string,
  patch: { nome?: string; coordenadorEmail?: string | null },
): Promise<{ ok: boolean; erro?: string }> {
  const alvo = await prisma.unidade.findUnique({
    where: { id: unidadeId },
    select: { organizacaoId: true },
  });
  if (!alvo || !(await podeGerenciarOrg(userId, alvo.organizacaoId))) {
    return { ok: false, erro: 'Sem permissão nesta empresa.' };
  }

  const data: { nome?: string; coordenadorId?: string | null } = {};
  if (patch.nome !== undefined) {
    const nomeLimpo = patch.nome.trim();
    if (!nomeLimpo) return { ok: false, erro: 'Dê um nome à unidade.' };
    data.nome = nomeLimpo;
  }
  if (patch.coordenadorEmail !== undefined) {
    const email = patch.coordenadorEmail?.toLowerCase().trim();
    if (email) {
      const c = await prisma.user.findUnique({ where: { email }, select: { id: true } });
      if (!c) return { ok: false, erro: 'O coordenador precisa ter entrado no app pelo menos uma vez.' };
      data.coordenadorId = c.id;
    } else {
      data.coordenadorId = null; // remover coordenador
    }
  }
  if (Object.keys(data).length === 0) return { ok: false, erro: 'Nada para alterar.' };
  await prisma.unidade.update({ where: { id: unidadeId }, data });
  return { ok: true };
}

export async function removerUnidade(userId: string, unidadeId: string): Promise<boolean> {
  const u = await prisma.unidade.findUnique({
    where: { id: unidadeId },
    select: { organizacaoId: true },
  });
  if (!u || !(await podeGerenciarOrg(userId, u.organizacaoId))) return false;
  await prisma.unidade.delete({ where: { id: unidadeId } });
  return true;
}

// ---- Tipos de ação (cadastro — só dono) ----

export async function listarTipos(orgId: string): Promise<{ id: string; nome: string }[]> {
  return prisma.tipoAcaoComercial.findMany({
    where: { organizacaoId: orgId, ativo: true },
    orderBy: { nome: 'asc' },
    select: { id: true, nome: true },
  });
}

export async function criarTipo(
  userId: string,
  orgId: string,
  nome: string,
): Promise<{ ok: boolean; erro?: string }> {
  if (!(await podeGerenciarOrg(userId, orgId))) return { ok: false, erro: 'Sem permissão.' };
  const n = nome.trim();
  if (!n) return { ok: false, erro: 'Digite o nome do tipo.' };
  try {
    await prisma.tipoAcaoComercial.create({ data: { organizacaoId: orgId, nome: n } });
  } catch {
    return { ok: false, erro: 'Esse tipo já existe.' };
  }
  return { ok: true };
}

export async function removerTipo(userId: string, tipoId: string): Promise<boolean> {
  const t = await prisma.tipoAcaoComercial.findUnique({
    where: { id: tipoId },
    select: { organizacaoId: true },
  });
  if (!t || !(await podeGerenciarOrg(userId, t.organizacaoId))) return false;
  await prisma.tipoAcaoComercial.delete({ where: { id: tipoId } });
  return true;
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
  if (!(await podeEditarUnidade(userId, input.unidadeId))) {
    return { ok: false, erro: 'Você não tem permissão para editar essa unidade.' };
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

async function acaoAcessivel(userId: string, acaoId: string, precisaEditar = false) {
  const a = await prisma.acaoComercial.findUnique({
    where: { id: acaoId },
    include: {
      unidade: { select: { id: true, nome: true, organizacaoId: true } },
      repasse: { select: { status: true } },
    },
  });
  if (!a) return null;
  const ok = precisaEditar
    ? await podeEditarUnidade(userId, a.unidadeId)
    : await podeAcessarUnidade(userId, a.unidadeId);
  if (!ok) return null;
  return a;
}

/** Corporativo OU admin da empresa — pode editar/excluir ação travada por repasse. */
async function ehGestorOrg(userId: string, orgId: string): Promise<boolean> {
  const acc = await resolverAcessoComercial(userId, orgId);
  return acc.temAcesso && (acc.corporativo || acc.admin);
}

/**
 * Resultado da checagem de trava por repasse pra uma operação de edição.
 * - liberado: pode seguir.
 * - erro: motivo (quando bloqueado).
 */
type ChecagemTrava = { liberado: boolean; erro?: string };

async function checarTravaEdicao(
  userId: string,
  a: { repasseId: string | null; unidade: { organizacaoId: string } },
): Promise<ChecagemTrava> {
  if (!a.repasseId) return { liberado: true }; // ação livre
  if (await ehGestorOrg(userId, a.unidade.organizacaoId)) return { liberado: true }; // override
  return { liberado: false, erro: 'Ação já incluída num repasse — só corporativo/admin pode editar.' };
}

export async function getAcao(userId: string, acaoId: string) {
  return acaoAcessivel(userId, acaoId); // leitura
}

export async function atualizarAcao(
  userId: string,
  acaoId: string,
  input: Partial<AcaoInput>,
): Promise<boolean> {
  const a = await acaoAcessivel(userId, acaoId, true); // mutação exige editar
  if (!a) return false;
  if (!(await checarTravaEdicao(userId, a)).liberado) return false; // travada por repasse
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
  await sincronizarLancamentoAcao(acaoId); // valor/data podem ter mudado
  // Admin editou ação vinculada a repasse pendente → recalcula o valor do repasse.
  if (a.repasseId && a.repasse?.status === 'PENDENTE') await recalcularRepassePendente(a.repasseId);
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
  const a = await acaoAcessivel(userId, acaoId, true); // mutação exige editar
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
  await sincronizarLancamentoAcao(acaoId); // reflete o gasto no caixa da unidade
  return true;
}

export async function reagendar(
  userId: string,
  acaoId: string,
  dataInicio: string,
  dataFim: string,
): Promise<boolean> {
  const a = await acaoAcessivel(userId, acaoId, true); // mutação exige editar
  if (!a) return false;
  if (!(await checarTravaEdicao(userId, a)).liberado) return false; // travada por repasse
  const ini = parseDia(dataInicio);
  const fim = parseDia(dataFim || dataInicio);
  if (!ini || !fim) return false;
  await prisma.acaoComercial.update({
    where: { id: acaoId },
    data: { dataInicio: ini, dataFim: fim, status: 'EM_PLANEJAMENTO' },
  });
  await sincronizarLancamentoAcao(acaoId); // voltou a planejar → remove o débito
  return true;
}

/** Realoca: muda a unidade e/ou os responsáveis. */
export async function realocar(
  userId: string,
  acaoId: string,
  destino: { unidadeId?: string; responsaveis?: string },
): Promise<{ ok: boolean; erro?: string }> {
  const a = await acaoAcessivel(userId, acaoId, true); // realocar exige editar
  if (!a) return { ok: false, erro: 'Ação não encontrada.' };
  const trava = await checarTravaEdicao(userId, a);
  if (!trava.liberado) return { ok: false, erro: trava.erro };

  const data: Record<string, unknown> = {};
  const mudaUnidade = Boolean(destino.unidadeId && destino.unidadeId !== a.unidadeId);
  if (mudaUnidade) {
    // Mudar a unidade de uma ação vinculada a repasse: só se o repasse ainda
    // estiver pendente (fechado = congelado). Ao mover, desvincula do repasse
    // antigo e recalcula esse repasse (a ação saiu dele).
    if (a.repasseId && a.repasse?.status !== 'PENDENTE') {
      return { ok: false, erro: 'Repasse já fechado — não dá pra mudar a unidade desta ação.' };
    }
    if (!(await podeEditarUnidade(userId, destino.unidadeId!))) {
      return { ok: false, erro: 'Você não tem permissão para editar a unidade de destino.' };
    }
    data.unidadeId = destino.unidadeId;
    if (a.repasseId) data.repasseId = null; // sai do repasse antigo
  }
  if (destino.responsaveis !== undefined) data.responsaveis = destino.responsaveis.trim();
  if (Object.keys(data).length === 0) return { ok: true };
  await prisma.acaoComercial.update({ where: { id: acaoId }, data });
  if (a.repasseId && mudaUnidade && a.repasse?.status === 'PENDENTE') {
    await recalcularRepassePendente(a.repasseId);
  }
  return { ok: true };
}

export async function removerAcao(userId: string, acaoId: string): Promise<boolean> {
  const a = await acaoAcessivel(userId, acaoId, true); // mutação exige editar
  if (!a) return false;
  if (a.repasseId) {
    if (a.repasse?.status !== 'PENDENTE') return false; // repasse fechado → ninguém exclui
    if (!(await ehGestorOrg(userId, a.unidade.organizacaoId))) return false; // pendente: só gestor
  }
  const repasseId = a.repasseId;
  await prisma.acaoComercial.delete({ where: { id: acaoId } });
  if (repasseId) await recalcularRepassePendente(repasseId); // ação saiu → recalcula
  return true;
}

// ---- Listagem + agregações (escopadas por empresa) ----

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
  detalhe: string | null;
  travada: boolean; // já incluída num repasse (edição/exclusão restrita)
  repasseFechado: boolean; // o repasse já saiu de PENDENTE (congelado)
};

type Filtro = { unidadeId?: string; de?: string; ate?: string; status?: StatusAcao };

async function buscarAcoes(userId: string, orgId: string, filtro: Filtro) {
  const visiveis = await idsDaOrg(userId, orgId);
  if (visiveis.length === 0) return [];
  const ids =
    filtro.unidadeId && visiveis.includes(filtro.unidadeId) ? [filtro.unidadeId] : visiveis;

  const where: Record<string, unknown> = { unidadeId: { in: ids } };
  if (filtro.status) where.status = filtro.status;
  const de = filtro.de ? parseDia(filtro.de) : null;
  const ate = filtro.ate ? parseDia(filtro.ate) : null;
  if (de || ate) {
    where.AND = [ate ? { dataInicio: { lte: ate } } : {}, de ? { dataFim: { gte: de } } : {}];
  }
  return prisma.acaoComercial.findMany({
    where,
    orderBy: { dataInicio: 'desc' },
    include: { unidade: { select: { nome: true } }, repasse: { select: { status: true } } },
  });
}

function iso(d: Date) {
  return d.toISOString().slice(0, 10);
}

export async function listarAcoes(
  userId: string,
  orgId: string,
  filtro: Filtro = {},
): Promise<AcaoListItem[]> {
  const rows = await buscarAcoes(userId, orgId, filtro);
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
    detalhe: a.detalhe,
    travada: a.repasseId != null,
    repasseFechado: a.repasse != null && a.repasse.status !== 'PENDENTE',
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

export async function getPainelComercial(
  userId: string,
  orgId: string,
  filtro: Filtro = {},
): Promise<PainelComercial> {
  const rows = await buscarAcoes(userId, orgId, filtro);
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
