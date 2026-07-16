/**
 * Contexto do módulo Comercial por requisição (server).
 * Resolve a empresa atual (cookie) e o escopo do usuário nela.
 */
import { cache } from 'react';
import { cookies } from 'next/headers';
import {
  getEmpresasAcessiveis,
  resolverEmpresaId,
  getEscopoComercial,
  type EmpresaInfo,
  type EscopoComercial,
} from '@/lib/comercial';

export const COOKIE_EMPRESA = 'comercial_empresa';

export type ContextoComercial = {
  empresas: EmpresaInfo[];
  orgId: string;
  escopo: EscopoComercial;
};

/** null = usuário ainda não tem nenhuma empresa (mostrar tela de ativação).
 *  cache() = resolve uma vez por requisição, mesmo chamado por page + shell. */
export const carregarComercial = cache(async function carregarComercial(
  userId: string,
): Promise<ContextoComercial | null> {
  const empresas = await getEmpresasAcessiveis(userId);
  if (empresas.length === 0) return null;

  const pref = cookies().get(COOKIE_EMPRESA)?.value;
  const orgId = (await resolverEmpresaId(userId, pref)) ?? empresas[0].id;
  const escopo = await getEscopoComercial(userId, orgId);
  if (!escopo) return null;

  return { empresas, orgId, escopo };
});
