/**
 * Camada de billing do Super Admin — consultas e mutações da gestão do produto.
 * Referência de design: MODULO_PAGAMENTO_BLUEPRINT.md (§6 e §8).
 *
 * Princípios herdados do TriboCRM:
 *  - Relatórios financeiros agregam Cobranca PAGA por mesRef ("YYYY-MM").
 *  - Marcar cobrança PAGA ativa a conta e estende a validade do plano.
 *  - Trocar plano/estado é ação manual do admin (no lançamento não há gateway).
 */
import { randomBytes } from 'crypto';
import { prisma } from '@bussola/db';
import type {
  StatusAssinatura,
  StatusCobranca,
  MetodoPagamento,
  CicloPlano,
  OrigemAssinatura,
} from '@bussola/db';
import { valorCobranca } from './assinatura';
import { criarComissaoSeIndicado } from './comissoes';
import { sendAcessoCriadoEmail } from './email';

// ---------- helpers de mês ----------

function mesRefDe(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** Lista os últimos N meses como "YYYY-MM" (mais antigo → mais novo). */
function ultimosMeses(n: number): string[] {
  const hoje = new Date();
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth() - i, 1));
    out.push(mesRefDe(d));
  }
  return out;
}

// ---------- dashboard ----------

export type DashboardKPIs = {
  mrr: number;
  arr: number;
  mesRef: string;
  novasNoMes: number;
  porStatus: Record<StatusAssinatura, number>;
  inadimplentes: number;
  historicoMrr: { mes: string; valor: number }[];
  alertas: {
    trialsVencendo: { id: string; nome: string; dias: number }[];
    cobrancasVencidas: number;
  };
};

export async function dashboardKPIs(): Promise<DashboardKPIs> {
  const agora = new Date();
  const mesAtual = mesRefDe(agora);
  const meses = ultimosMeses(6);

  const [pagasMesAtual, todasAssinaturas, pagasHistorico, cobrancasVencidas] = await Promise.all([
    prisma.cobranca.aggregate({
      _sum: { valor: true },
      where: { status: 'PAGA', mesRef: mesAtual },
    }),
    prisma.assinatura.findMany({
      select: { id: true, status: true, createdAt: true, trialTerminaEm: true, owner: { select: { name: true, email: true } } },
    }),
    prisma.cobranca.groupBy({
      by: ['mesRef'],
      _sum: { valor: true },
      where: { status: 'PAGA', mesRef: { in: meses } },
    }),
    prisma.cobranca.count({
      where: { status: { in: ['PENDENTE', 'ATRASADA'] }, vencimento: { lt: agora } },
    }),
  ]);

  const mrr = pagasMesAtual._sum.valor ?? 0;

  const porStatus = {
    TRIAL: 0,
    ATIVA: 0,
    ATRASADA: 0,
    SUSPENSA: 0,
    CANCELADA: 0,
  } as Record<StatusAssinatura, number>;
  let novasNoMes = 0;
  const trialsVencendo: { id: string; nome: string; dias: number }[] = [];
  for (const a of todasAssinaturas) {
    porStatus[a.status]++;
    if (mesRefDe(a.createdAt) === mesAtual) novasNoMes++;
    if (a.status === 'TRIAL' && a.trialTerminaEm) {
      const dias = Math.ceil((a.trialTerminaEm.getTime() - agora.getTime()) / 86400000);
      if (dias <= 3) {
        trialsVencendo.push({ id: a.id, nome: a.owner.name?.trim() || a.owner.email, dias: Math.max(0, dias) });
      }
    }
  }
  trialsVencendo.sort((x, y) => x.dias - y.dias);

  const histMap = new Map(pagasHistorico.map((h) => [h.mesRef, h._sum.valor ?? 0]));
  const historicoMrr = meses.map((mes) => ({ mes, valor: histMap.get(mes) ?? 0 }));

  return {
    mrr,
    arr: mrr * 12,
    mesRef: mesAtual,
    novasNoMes,
    porStatus,
    inadimplentes: porStatus.ATRASADA + porStatus.SUSPENSA,
    historicoMrr,
    alertas: { trialsVencendo: trialsVencendo.slice(0, 8), cobrancasVencidas },
  };
}

// ---------- lista de contas ----------

export type ContaResumo = {
  id: string;
  nome: string;
  email: string;
  planoNome: string;
  status: StatusAssinatura;
  origem: OrigemAssinatura;
  aguardandoAtivacao: boolean;
  assentos: number;
  trialTerminaEm: Date | null;
  planoExpiraEm: Date | null;
  criadaEm: Date;
};

export async function listarContas(opts: {
  status?: StatusAssinatura;
  planoSlug?: string;
  origem?: OrigemAssinatura;
  aguardandoAtivacao?: boolean;
  busca?: string;
  page?: number;
  perPage?: number;
}): Promise<{ contas: ContaResumo[]; total: number; page: number; perPage: number }> {
  const page = Math.max(1, opts.page ?? 1);
  const perPage = Math.min(100, opts.perPage ?? 25);
  const busca = opts.busca?.trim();

  const where = {
    ...(opts.status ? { status: opts.status } : {}),
    ...(opts.planoSlug ? { plano: { slug: opts.planoSlug } } : {}),
    ...(opts.origem ? { origem: opts.origem } : {}),
    ...(opts.aguardandoAtivacao ? { aguardandoAtivacao: true } : {}),
    ...(busca
      ? {
          owner: {
            OR: [
              { name: { contains: busca, mode: 'insensitive' as const } },
              { email: { contains: busca, mode: 'insensitive' as const } },
            ],
          },
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.assinatura.findMany({
      where,
      include: { owner: { select: { name: true, email: true } }, plano: { select: { nome: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.assinatura.count({ where }),
  ]);

  return {
    contas: rows.map((a) => ({
      id: a.id,
      nome: a.owner.name?.trim() || a.owner.email,
      email: a.owner.email,
      planoNome: a.plano.nome,
      status: a.status,
      origem: a.origem,
      aguardandoAtivacao: a.aguardandoAtivacao,
      assentos: a.assentos,
      trialTerminaEm: a.trialTerminaEm,
      planoExpiraEm: a.planoExpiraEm,
      criadaEm: a.createdAt,
    })),
    total,
    page,
    perPage,
  };
}

// ---------- detalhe da conta ----------

export async function contaDetalhe(assinaturaId: string) {
  const a = await prisma.assinatura.findUnique({
    where: { id: assinaturaId },
    include: {
      owner: { select: { id: true, name: true, email: true, createdAt: true } },
      organizacao: { select: { id: true, nome: true, _count: { select: { membros: true } } } },
      plano: true,
      cobrancas: { orderBy: { createdAt: 'desc' }, take: 20 },
      parceiro: { select: { id: true, code: true, nome: true } },
    },
  });
  if (!a) return null;
  return a;
}

export async function listarPlanos() {
  return prisma.plano.findMany({ orderBy: { precoMensal: 'asc' } });
}

/** Edita preços e cota de IA de um plano (por slug). */
export async function editarPlano(
  slug: string,
  patch: { precoMensal?: number; precoAnual?: number; precoPorAssento?: number; geracoesIaMes?: number },
): Promise<{ ok: true } | { ok: false; erro: string }> {
  const data: Record<string, number> = {};
  if (patch.precoMensal != null) data.precoMensal = Math.max(0, patch.precoMensal);
  if (patch.precoAnual != null) data.precoAnual = Math.max(0, patch.precoAnual);
  if (patch.precoPorAssento != null) data.precoPorAssento = Math.max(0, patch.precoPorAssento);
  if (patch.geracoesIaMes != null) data.geracoesIaMes = Math.max(0, Math.floor(patch.geracoesIaMes));
  if (Object.keys(data).length === 0) return { ok: false, erro: 'Nada para alterar' };
  const r = await prisma.plano.updateMany({ where: { slug }, data });
  if (r.count === 0) return { ok: false, erro: 'Plano não encontrado' };
  return { ok: true };
}

// ---------- mutações ----------

/** Cria/atualiza a assinatura de um usuário (por e-mail). Útil pra backfill/onboarding manual. */
export async function criarOuAtualizarAssinatura(input: {
  email: string;
  planoSlug: string;
  ciclo?: CicloPlano;
  assentos?: number;
  status?: StatusAssinatura;
  diasTrial?: number;
}): Promise<{ ok: true; assinaturaId: string } | { ok: false; erro: string }> {
  const email = input.email.toLowerCase().trim();
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (!user) return { ok: false, erro: 'Usuário não encontrado' };
  const plano = await prisma.plano.findUnique({ where: { slug: input.planoSlug } });
  if (!plano) return { ok: false, erro: 'Plano não encontrado' };

  const status = input.status ?? 'TRIAL';
  const trialTerminaEm =
    status === 'TRIAL'
      ? new Date(Date.now() + (input.diasTrial ?? 14) * 86400000)
      : null;

  const dados = {
    planoId: plano.id,
    ciclo: input.ciclo ?? 'MENSAL',
    assentos: Math.max(1, input.assentos ?? 1),
    status,
    trialTerminaEm,
    // Criada por você = plano consciente: sem aviso de onboarding.
    origem: 'ADMIN' as const,
    planoConfirmado: true,
    aguardandoAtivacao: false,
  };

  const a = await prisma.assinatura.upsert({
    where: { ownerUserId: user.id },
    update: dados,
    create: { ownerUserId: user.id, ...dados },
    select: { id: true },
  });
  return { ok: true, assinaturaId: a.id };
}

/** Edita campos da assinatura (status, plano, assentos, ciclo, notas). */
export async function editarAssinatura(
  assinaturaId: string,
  patch: {
    status?: StatusAssinatura;
    planoSlug?: string;
    assentos?: number;
    ciclo?: CicloPlano;
    notasInternas?: string;
  },
): Promise<{ ok: true } | { ok: false; erro: string }> {
  const data: Record<string, unknown> = {};
  if (patch.status) data.status = patch.status;
  if (patch.assentos != null) data.assentos = Math.max(1, patch.assentos);
  if (patch.ciclo) data.ciclo = patch.ciclo;
  if (patch.notasInternas != null) data.notasInternas = patch.notasInternas;
  if (patch.planoSlug) {
    const plano = await prisma.plano.findUnique({ where: { slug: patch.planoSlug }, select: { id: true } });
    if (!plano) return { ok: false, erro: 'Plano não encontrado' };
    data.planoId = plano.id;
  }
  if (Object.keys(data).length === 0) return { ok: false, erro: 'Nada para alterar' };
  await prisma.assinatura.update({ where: { id: assinaturaId }, data });
  return { ok: true };
}

/** Edita nome e e-mail do dono da conta (User). E-mail precisa ser único. */
export async function editarDadosOwner(
  assinaturaId: string,
  patch: { name?: string; email?: string },
): Promise<{ ok: true } | { ok: false; erro: string }> {
  const a = await prisma.assinatura.findUnique({
    where: { id: assinaturaId },
    select: { ownerUserId: true },
  });
  if (!a) return { ok: false, erro: 'Assinatura não encontrada' };

  const data: { name?: string | null; email?: string } = {};
  if (patch.name != null) data.name = patch.name.trim() || null;
  if (patch.email != null) {
    const email = patch.email.toLowerCase().trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, erro: 'E-mail inválido' };
    const existente = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (existente && existente.id !== a.ownerUserId) {
      return { ok: false, erro: 'E-mail já usado por outra conta' };
    }
    data.email = email;
  }
  if (Object.keys(data).length === 0) return { ok: false, erro: 'Nada para alterar' };

  await prisma.user.update({ where: { id: a.ownerUserId }, data });
  return { ok: true };
}

/** Edita os dados cadastrais da empresa da conta (fiscal). Tudo opcional. */
export async function editarDadosEmpresa(
  assinaturaId: string,
  patch: {
    empresaNome?: string;
    empresaDocumento?: string;
    empresaResponsavelNome?: string;
    empresaResponsavelEmail?: string;
  },
): Promise<{ ok: true } | { ok: false; erro: string }> {
  const limpo = (s?: string) => (s != null ? s.trim() || null : undefined);
  const email = patch.empresaResponsavelEmail;
  if (email != null && email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return { ok: false, erro: 'E-mail do responsável inválido' };
  }
  const data = {
    empresaNome: limpo(patch.empresaNome),
    empresaDocumento: limpo(patch.empresaDocumento),
    empresaResponsavelNome: limpo(patch.empresaResponsavelNome),
    empresaResponsavelEmail: limpo(patch.empresaResponsavelEmail),
  };
  const r = await prisma.assinatura.updateMany({ where: { id: assinaturaId }, data });
  if (r.count === 0) return { ok: false, erro: 'Assinatura não encontrada' };
  return { ok: true };
}

/**
 * Transfere a titularidade (gestor master) de uma conta para outra pessoa.
 *
 * Move a Assinatura e TODAS as organizações do dono antigo para o novo dono.
 * O dono antigo NÃO é excluído: sai do time/comercial dessas empresas e ganha
 * uma conta individual (Essencial, trial de 14 dias) — mantém login e agenda
 * pessoal. Os dados do Comercial (ações, caixa, repasses) ficam com a empresa.
 *
 * Novo dono por e-mail: se o usuário existe, usa; senão cria e manda o e-mail
 * de criar senha (mesmo fluxo do convite de time).
 */
export async function transferirTitularidade(
  assinaturaId: string,
  input: { email: string; nome?: string },
  adminEmail: string,
): Promise<
  | { ok: true; novoCriado: boolean; empresas: number; individualCriada: boolean }
  | { ok: false; erro: string }
> {
  const email = input.email.toLowerCase().trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, erro: 'E-mail inválido' };
  const nome = input.nome?.trim() || null;

  const a = await prisma.assinatura.findUnique({
    where: { id: assinaturaId },
    select: { ownerUserId: true, notasInternas: true, owner: { select: { email: true } } },
  });
  if (!a) return { ok: false, erro: 'Assinatura não encontrada' };
  const antigoId = a.ownerUserId;

  const orgs = await prisma.organizacao.findMany({ where: { ownerId: antigoId }, select: { id: true } });
  const orgIds = orgs.map((o) => o.id);

  const novo = await prisma.user.findUnique({ where: { email }, select: { id: true, name: true } });
  if (novo?.id === antigoId) return { ok: false, erro: 'Essa pessoa já é a titular da conta' };

  if (novo) {
    // Já é dono de outra empresa → não dá pra fundir duas contas aqui.
    const outraOrg = await prisma.organizacao.findFirst({ where: { ownerId: novo.id }, select: { id: true } });
    if (outraOrg) return { ok: false, erro: 'Esse usuário já é dono de outra empresa na Bússola' };
    // Membro de um time de OUTRA empresa → a cobertura dele ficaria ambígua.
    const outroTime = await prisma.membroEquipe.findFirst({
      where: { userId: novo.id, organizacaoId: { notIn: orgIds } },
      select: { id: true },
    });
    if (outroTime) return { ok: false, erro: 'Esse usuário pertence ao time de outra empresa' };
    // Assinatura própria: a automática (trial de quem entrou direto) é descartada;
    // qualquer outra (cadastro/admin/paga) bloqueia — resolva manualmente antes.
    const propria = await prisma.assinatura.findUnique({
      where: { ownerUserId: novo.id },
      select: { origem: true },
    });
    if (propria && propria.origem !== 'AUTO') {
      return { ok: false, erro: 'Esse usuário já tem uma assinatura própria. Cancele/ajuste ela antes.' };
    }
  }

  // O dono antigo continua coberto por outro time (fora destas empresas)?
  const antigoEmOutroTime = await prisma.membroEquipe.findFirst({
    where: { userId: antigoId, organizacaoId: { notIn: orgIds } },
    select: { id: true },
  });
  const essencial = await prisma.plano.findUnique({ where: { slug: 'essencial' }, select: { id: true } });
  if (!essencial && !antigoEmOutroTime) return { ok: false, erro: 'Plano Essencial não encontrado' };

  const quando = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });

  const { novoCriado, token } = await prisma.$transaction(async (tx) => {
    let novoId: string;
    let token: string | null = null;
    if (!novo) {
      novoId = (await tx.user.create({ data: { email, name: nome }, select: { id: true } })).id;
      token = randomBytes(32).toString('hex');
      await tx.passwordResetToken.create({
        data: { userId: novoId, token, expires: new Date(Date.now() + 7 * 86400000) },
      });
    } else {
      novoId = novo.id;
      if (nome && !novo.name) await tx.user.update({ where: { id: novoId }, data: { name: nome } });
    }

    // Libera a unicidade de ownerUserId (trial automático do novo dono).
    await tx.assinatura.deleteMany({ where: { ownerUserId: novoId, origem: 'AUTO' } });

    // Novo dono: vira dono (acesso total implícito) → sai dos vínculos de membro.
    await tx.membroEquipe.deleteMany({ where: { userId: novoId, organizacaoId: { in: orgIds } } });
    await tx.acessoComercial.deleteMany({ where: { userId: novoId, organizacaoId: { in: orgIds } } });

    // Dono antigo: sai de tudo nestas empresas.
    await tx.membroEquipe.deleteMany({ where: { userId: antigoId, organizacaoId: { in: orgIds } } });
    await tx.acessoComercial.deleteMany({ where: { userId: antigoId, organizacaoId: { in: orgIds } } });
    await tx.unidade.updateMany({
      where: { coordenadorId: antigoId, organizacaoId: { in: orgIds } },
      data: { coordenadorId: null },
    });

    await tx.organizacao.updateMany({ where: { id: { in: orgIds } }, data: { ownerId: novoId } });

    const log = `[${quando}] Titularidade transferida de ${a.owner.email} para ${email} por ${adminEmail}.`;
    await tx.assinatura.update({
      where: { id: assinaturaId },
      data: {
        ownerUserId: novoId,
        notasInternas: a.notasInternas ? `${a.notasInternas}\n${log}` : log,
      },
    });

    // Conta individual do dono antigo (agenda pessoal segue intacta no Workspace).
    if (!antigoEmOutroTime && essencial) {
      await tx.assinatura.create({
        data: {
          ownerUserId: antigoId,
          planoId: essencial.id,
          status: 'TRIAL',
          origem: 'ADMIN',
          planoConfirmado: false, // vê o aviso pra escolher plano
          trialTerminaEm: new Date(Date.now() + 14 * 86400000),
          notasInternas: `[${quando}] Conta individual criada ao deixar de ser titular (por ${adminEmail}).`,
        },
      });
    }
    return { novoCriado: !novo, token };
  });

  if (token) {
    const base = process.env.NEXTAUTH_URL ?? 'https://app.bussoladotempo.com.br';
    try {
      await sendAcessoCriadoEmail({ to: email, nome: nome ?? undefined, link: `${base}/redefinir-senha?token=${token}` });
    } catch (e) {
      console.error('[admin] falha ao enviar acesso do novo titular:', e);
    }
  }

  return { ok: true, novoCriado, empresas: orgIds.length, individualCriada: !antigoEmOutroTime };
}

/** Estende (ou encurta) o trial em N dias a partir de agora. */
export async function estenderTrial(assinaturaId: string, dias: number) {
  await prisma.assinatura.update({
    where: { id: assinaturaId },
    data: {
      status: 'TRIAL',
      trialTerminaEm: new Date(Date.now() + dias * 86400000),
      ultimoEstadoBilling: null,
    },
  });
}

/**
 * Cria uma cobrança manual. Se `valor` não vier, calcula pelo plano × assentos.
 * Vencimento default: +7 dias.
 */
export async function criarCobrancaManual(
  assinaturaId: string,
  opts: { valor?: number; vencimento?: Date; metodo?: MetodoPagamento; descontoValor?: number; nota?: string },
): Promise<{ ok: true; cobrancaId: string } | { ok: false; erro: string }> {
  const a = await prisma.assinatura.findUnique({
    where: { id: assinaturaId },
    include: { plano: true },
  });
  if (!a) return { ok: false, erro: 'Assinatura não encontrada' };

  const valorBase = opts.valor ?? valorCobranca(a.plano, a.assentos, a.ciclo);
  const desconto = Math.max(0, opts.descontoValor ?? 0);
  const venc = opts.vencimento ?? new Date(Date.now() + 7 * 86400000);

  const c = await prisma.cobranca.create({
    data: {
      assinaturaId,
      valor: Math.max(0, Math.round((valorBase - desconto) * 100) / 100),
      descontoValor: desconto,
      vencimento: venc,
      metodo: opts.metodo ?? 'MANUAL',
      status: 'PENDENTE',
      mesRef: mesRefDe(venc),
      nota: opts.nota ?? null,
    },
    select: { id: true },
  });
  return { ok: true, cobrancaId: c.id };
}

/**
 * Marca uma cobrança como PAGA/CANCELADA. Ao pagar: registra pagaEm, ativa a
 * conta e estende a validade do plano (+1 mês ou +1 ano conforme o ciclo).
 * Idempotente: se já está PAGA, não faz nada.
 */
export async function marcarCobranca(
  cobrancaId: string,
  novoStatus: Extract<StatusCobranca, 'PAGA' | 'CANCELADA'>,
  quando?: Date,
): Promise<{ ok: true } | { ok: false; erro: string }> {
  const c = await prisma.cobranca.findUnique({
    where: { id: cobrancaId },
    include: { assinatura: { select: { id: true, ciclo: true, planoExpiraEm: true } } },
  });
  if (!c) return { ok: false, erro: 'Cobrança não encontrada' };
  if (c.status === 'PAGA' && novoStatus === 'PAGA') return { ok: true }; // idempotente

  if (novoStatus === 'CANCELADA') {
    await prisma.cobranca.update({ where: { id: cobrancaId }, data: { status: 'CANCELADA' } });
    return { ok: true };
  }

  const pagaEm = quando ?? new Date();
  // Estende a partir do maior entre "validade atual" e "agora".
  const base =
    c.assinatura.planoExpiraEm && c.assinatura.planoExpiraEm > pagaEm
      ? c.assinatura.planoExpiraEm
      : pagaEm;
  const novaValidade = new Date(base);
  if (c.assinatura.ciclo === 'ANUAL') novaValidade.setUTCFullYear(novaValidade.getUTCFullYear() + 1);
  else novaValidade.setUTCMonth(novaValidade.getUTCMonth() + 1);

  await prisma.$transaction([
    prisma.cobranca.update({
      where: { id: cobrancaId },
      data: { status: 'PAGA', pagaEm },
    }),
    prisma.assinatura.update({
      where: { id: c.assinatura.id },
      data: {
        status: 'ATIVA',
        planoIniciadoEm: c.assinatura.planoExpiraEm ? undefined : pagaEm,
        planoExpiraEm: novaValidade,
        ultimoEstadoBilling: null, // reseta a máquina de e-mails
        aguardandoAtivacao: false, // ativada — não aguarda mais
        planoConfirmado: true,
      },
    }),
  ]);

  // Comissão do parceiro (se houver) — fire-and-forget, nunca quebra o pagamento.
  await criarComissaoSeIndicado(cobrancaId);
  return { ok: true };
}
