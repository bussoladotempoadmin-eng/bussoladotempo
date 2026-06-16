/**
 * Camada de acesso do módulo de Time (Fase 4).
 * Modelo: Organizacao (dono = gestor) → MembroEquipe (vínculo user↔org).
 * O gestor vê os dados de tempo dos membros; reflexões ficam SEMPRE privadas
 * (isso é garantido em quem consome estes dados, não aqui).
 */
import { randomBytes } from 'crypto';
import { prisma } from '@bussola/db';
import { sendAcessoCriadoEmail } from './email';

export type MembroInfo = {
  membroId: string; // id do vínculo MembroEquipe
  userId: string;
  nome: string;
  email: string;
  papel: 'GESTOR' | 'MEMBRO';
  chefeId: string | null; // a quem reporta (null = reporta ao diretor/dono)
};

export type TimeGestor = {
  org: { id: string; nome: string };
  membros: MembroInfo[];
};

/** O time que este usuário GERENCIA (é dono). v1: um por gestor. */
export async function getOrgDoGestor(userId: string) {
  return prisma.organizacao.findFirst({
    where: { ownerId: userId },
    orderBy: { createdAt: 'asc' },
    select: { id: true, nome: true },
  });
}

export async function getTimeGestor(userId: string): Promise<TimeGestor | null> {
  const org = await getOrgDoGestor(userId);
  if (!org) return null;
  const membros = await prisma.membroEquipe.findMany({
    where: { organizacaoId: org.id },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: 'asc' },
  });
  return {
    org,
    membros: membros.map((m) => ({
      membroId: m.id,
      userId: m.userId,
      nome: m.user.name?.trim() || m.user.email,
      email: m.user.email,
      papel: m.papel,
      chefeId: m.chefeId,
    })),
  };
}

export async function criarOrganizacao(userId: string, nome: string) {
  const existente = await getOrgDoGestor(userId);
  if (existente) return existente;
  const nomeLimpo = nome.trim() || 'Meu time';
  return prisma.organizacao.create({
    data: { nome: nomeLimpo, ownerId: userId },
    select: { id: true, nome: true },
  });
}

export async function adicionarMembroPorEmail(
  gestorId: string,
  email: string,
  chefeId?: string | null,
): Promise<{ ok: boolean; erro?: string }> {
  const org = await getOrgDoGestor(gestorId);
  if (!org) return { ok: false, erro: 'Crie seu time primeiro.' };

  const alvo = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
    select: { id: true },
  });
  if (!alvo) {
    return {
      ok: false,
      erro: 'Essa pessoa precisa entrar no app (login) pelo menos uma vez antes de ser adicionada.',
    };
  }
  if (alvo.id === gestorId) {
    return { ok: false, erro: 'Você é o gestor — não precisa se adicionar como membro.' };
  }

  // O "chefe" (se informado) precisa ser um membro do mesmo time.
  let chefe: string | null = null;
  if (chefeId) {
    const c = await prisma.membroEquipe.findFirst({
      where: { id: chefeId, organizacaoId: org.id },
      select: { id: true },
    });
    if (!c) return { ok: false, erro: 'Chefe inválido.' };
    chefe = c.id;
  }

  try {
    await prisma.membroEquipe.create({
      data: { organizacaoId: org.id, userId: alvo.id, papel: 'MEMBRO', chefeId: chefe },
    });
  } catch {
    return { ok: false, erro: 'Essa pessoa já está no time.' };
  }
  return { ok: true };
}

/**
 * Convida um colaborador por e-mail. Se a pessoa ainda não tem conta, CRIA a
 * conta e manda o e-mail de acesso (criar senha). Em seguida vincula ao time.
 * Membro de time é coberto pela empresa: removemos a assinatura individual
 * "entrou direto" (AUTO) dele, se houver, pra não cobrar à parte.
 */
export async function convidarMembro(
  gestorId: string,
  email: string,
  chefeId?: string | null,
): Promise<{ ok: boolean; erro?: string; convidado?: boolean }> {
  const org = await getOrgDoGestor(gestorId);
  if (!org) return { ok: false, erro: 'Crie seu time primeiro.' };

  const emailLimpo = email.toLowerCase().trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailLimpo)) {
    return { ok: false, erro: 'E-mail inválido.' };
  }

  // Limite de assentos: vale o plano do DONO do time (gestor).
  const assinatura = await prisma.assinatura.findUnique({
    where: { ownerUserId: gestorId },
    select: { assentos: true },
  });
  if (assinatura) {
    const membrosAtuais = await prisma.membroEquipe.count({ where: { organizacaoId: org.id } });
    // Conta o dono + os membros como acessos usados.
    if (1 + membrosAtuais >= assinatura.assentos) {
      return {
        ok: false,
        erro: `Você contratou ${assinatura.assentos} assento(s) e já usou todos. Fale com a gente pra adicionar mais.`,
      };
    }
  }

  // Acha ou cria a conta da pessoa.
  let alvo = await prisma.user.findUnique({
    where: { email: emailLimpo },
    select: { id: true, senhaHash: true },
  });
  let convidado = false;

  if (!alvo) {
    const novo = await prisma.user.create({
      data: { email: emailLimpo },
      select: { id: true, senhaHash: true },
    });
    alvo = novo;
    convidado = true;

    // E-mail de acesso (reusa o fluxo de redefinir-senha) — vale 7 dias.
    const token = randomBytes(32).toString('hex');
    await prisma.passwordResetToken.create({
      data: { userId: novo.id, token, expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
    });
    const base = process.env.NEXTAUTH_URL ?? 'https://app.bussoladotempo.com.br';
    try {
      await sendAcessoCriadoEmail({ to: emailLimpo, link: `${base}/redefinir-senha?token=${token}` });
    } catch (e) {
      console.error('[equipe] falha ao enviar convite:', e);
    }
  }

  if (alvo.id === gestorId) {
    return { ok: false, erro: 'Você é o gestor — não precisa se adicionar como membro.' };
  }

  // O "chefe" (se informado) precisa ser um membro do mesmo time.
  let chefe: string | null = null;
  if (chefeId) {
    const c = await prisma.membroEquipe.findFirst({
      where: { id: chefeId, organizacaoId: org.id },
      select: { id: true },
    });
    if (!c) return { ok: false, erro: 'Chefe inválido.' };
    chefe = c.id;
  }

  // Membro é coberto pela empresa: tira a assinatura individual "AUTO" dele.
  await prisma.assinatura.deleteMany({ where: { ownerUserId: alvo.id, origem: 'AUTO' } });

  try {
    await prisma.membroEquipe.create({
      data: { organizacaoId: org.id, userId: alvo.id, papel: 'MEMBRO', chefeId: chefe },
    });
  } catch {
    return { ok: false, erro: 'Essa pessoa já está no time.' };
  }
  return { ok: true, convidado };
}

export async function removerMembro(gestorId: string, membroId: string): Promise<boolean> {
  const org = await getOrgDoGestor(gestorId);
  if (!org) return false;
  const res = await prisma.membroEquipe.deleteMany({
    where: { id: membroId, organizacaoId: org.id },
  });
  return res.count > 0;
}

/** Membros abaixo de `raizMembroId` na árvore (recursivo, só pra baixo). */
function descendentes(raizMembroId: string, todos: MembroInfo[]): MembroInfo[] {
  const filhosPor = new Map<string, MembroInfo[]>();
  for (const m of todos) {
    if (!m.chefeId) continue;
    const arr = filhosPor.get(m.chefeId) ?? [];
    arr.push(m);
    filhosPor.set(m.chefeId, arr);
  }
  const out: MembroInfo[] = [];
  const fila = [...(filhosPor.get(raizMembroId) ?? [])];
  while (fila.length) {
    const m = fila.shift() as MembroInfo;
    out.push(m);
    fila.push(...(filhosPor.get(m.membroId) ?? []));
  }
  return out;
}

/**
 * Conjunto de membros que `userId` pode VER (seu galho pra baixo).
 * Diretor (dono) vê todos; gerente vê seu subtree; líder vê ninguém abaixo.
 */
export async function escopoVisivel(
  userId: string,
): Promise<{ org: { id: string; nome: string }; ehDono: boolean; membros: MembroInfo[] } | null> {
  const orgDono = await getOrgDoGestor(userId);
  if (orgDono) {
    const time = await getTimeGestor(userId);
    return { org: orgDono, ehDono: true, membros: time?.membros ?? [] };
  }

  const vinculo = await prisma.membroEquipe.findFirst({
    where: { userId },
    select: { id: true, organizacaoId: true, organizacao: { select: { id: true, nome: true } } },
  });
  if (!vinculo) return null;

  const todos = await prisma.membroEquipe.findMany({
    where: { organizacaoId: vinculo.organizacaoId },
    include: { user: { select: { name: true, email: true } } },
  });
  const info: MembroInfo[] = todos.map((m) => ({
    membroId: m.id,
    userId: m.userId,
    nome: m.user.name?.trim() || m.user.email,
    email: m.user.email,
    papel: m.papel,
    chefeId: m.chefeId,
  }));
  return { org: vinculo.organizacao, ehDono: false, membros: descendentes(vinculo.id, info) };
}

/** O usuário pode ver o workspace deste membro? (respeita a árvore) */
export async function podeVerMembro(userId: string, membroUserId: string): Promise<boolean> {
  if (userId === membroUserId) return true;
  const escopo = await escopoVisivel(userId);
  if (!escopo) return false;
  return escopo.membros.some((m) => m.userId === membroUserId);
}

// ---- Sugestões (coach: gestor sugere, membro aceita/dispensa) ----

export type SugestaoRecebida = { id: string; texto: string; deNome: string; createdAt: string };

/** O gestor cria uma sugestão pra um membro do seu galho. */
export async function criarSugestao(
  deUserId: string,
  paraUserId: string,
  texto: string,
): Promise<{ ok: boolean; erro?: string }> {
  const t = texto.trim();
  if (!t) return { ok: false, erro: 'Escreva a sugestão.' };
  if (!(await podeVerMembro(deUserId, paraUserId)) || deUserId === paraUserId) {
    return { ok: false, erro: 'Você só pode sugerir pra alguém do seu time.' };
  }
  await prisma.sugestao.create({ data: { deUserId, paraUserId, texto: t } });
  return { ok: true };
}

/** Sugestões PENDENTES que o usuário recebeu (pra mostrar na home dele). */
export async function sugestoesPendentes(userId: string): Promise<SugestaoRecebida[]> {
  const rows = await prisma.sugestao.findMany({
    where: { paraUserId: userId, status: 'PENDENTE' },
    orderBy: { createdAt: 'desc' },
    include: { de: { select: { name: true, email: true } } },
  });
  return rows.map((s) => ({
    id: s.id,
    texto: s.texto,
    deNome: s.de.name?.trim() || s.de.email,
    createdAt: s.createdAt.toISOString(),
  }));
}

/** O membro responde (aceita/dispensa) uma sugestão que recebeu. */
export async function responderSugestao(
  userId: string,
  sugestaoId: string,
  status: 'ACEITA' | 'DISPENSADA',
): Promise<boolean> {
  const res = await prisma.sugestao.updateMany({
    where: { id: sugestaoId, paraUserId: userId },
    data: { status },
  });
  return res.count > 0;
}
