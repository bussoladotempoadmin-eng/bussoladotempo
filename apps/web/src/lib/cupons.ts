/**
 * CRUD de cupons de desconto (admin). Soft-delete via ativo=false.
 * A APLICAÇÃO do cupom na cobrança entra junto com o checkout (Fase 5); aqui
 * é só a gestão do catálogo de cupons.
 */
import { prisma } from '@bussola/db';
import type { TipoDesconto, DuracaoCupom } from '@bussola/db';

export async function listarCupons() {
  return prisma.cupom.findMany({ orderBy: { createdAt: 'desc' } });
}

export async function criarCupom(input: {
  code: string;
  descontoTipo: TipoDesconto;
  descontoValor: number;
  duracaoTipo?: DuracaoCupom;
  duracaoMeses?: number | null;
  maxUsos?: number | null;
  validoAte?: Date | null;
}): Promise<{ ok: true; id: string } | { ok: false; erro: string }> {
  const code = input.code.trim().toUpperCase();
  if (!code) return { ok: false, erro: 'Informe o código.' };
  if (!(input.descontoValor > 0)) return { ok: false, erro: 'Valor de desconto inválido.' };

  const existe = await prisma.cupom.findUnique({ where: { code }, select: { id: true } });
  if (existe) return { ok: false, erro: 'Já existe um cupom com esse código.' };

  const c = await prisma.cupom.create({
    data: {
      code,
      descontoTipo: input.descontoTipo,
      descontoValor: input.descontoValor,
      duracaoTipo: input.duracaoTipo ?? 'PRIMEIRO',
      duracaoMeses: input.duracaoMeses ?? null,
      maxUsos: input.maxUsos ?? null,
      validoAte: input.validoAte ?? null,
    },
    select: { id: true },
  });
  return { ok: true, id: c.id };
}

export async function alternarCupom(id: string, ativo: boolean) {
  await prisma.cupom.update({ where: { id }, data: { ativo } });
}
