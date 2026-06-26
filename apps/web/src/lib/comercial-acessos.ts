/**
 * Resolução de acesso ao módulo Comercial (RBAC) — Fase 1.
 *
 * Diz, pra um usuário numa organização, o que ele pode no Comercial:
 *  - dono        → topo: vê e edita tudo, gerencia acessos.
 *  - corporativo → vê (e edita, se nível EDITAR) TODAS as unidades.
 *  - por unidade → vê/edita só as unidades do escopo dele, no nível dele.
 *  - admin       → pode gerenciar acessos/usuários do comercial.
 *
 * Convive com o LEGADO: quem é `Unidade.coordenadorId` continua com EDITAR
 * naquela unidade, mesmo sem um AcessoComercial. Assim nada quebra na transição.
 *
 * Esta camada é só LEITURA e ainda NÃO está ligada nas telas (Fase 1b liga).
 */
import { prisma } from '@bussola/db';

export type AcessoComercialResolvido = {
  temAcesso: boolean;
  dono: boolean;
  corporativo: boolean; // enxerga todas as unidades
  admin: boolean; // gerencia acessos/usuários
  podeCriarEmpresa: boolean; // pode criar novas empresas (dono sempre pode)
  nivel: 'VER' | 'EDITAR';
  unidadesIds: string[]; // unidades específicas (vazio quando corporativo)
  podeVer: (unidadeId: string) => boolean;
  podeEditar: (unidadeId: string) => boolean;
};

const NEGADO: AcessoComercialResolvido = {
  temAcesso: false,
  dono: false,
  corporativo: false,
  admin: false,
  podeCriarEmpresa: false,
  nivel: 'VER',
  unidadesIds: [],
  podeVer: () => false,
  podeEditar: () => false,
};

export async function resolverAcessoComercial(
  userId: string,
  orgId: string,
): Promise<AcessoComercialResolvido> {
  const org = await prisma.organizacao.findUnique({
    where: { id: orgId },
    select: { ownerId: true },
  });
  if (!org) return NEGADO;

  // Dono = topo absoluto.
  if (org.ownerId === userId) {
    return {
      temAcesso: true,
      dono: true,
      corporativo: true,
      admin: true,
      podeCriarEmpresa: true,
      nivel: 'EDITAR',
      unidadesIds: [],
      podeVer: () => true,
      podeEditar: () => true,
    };
  }

  const [acesso, legadas] = await Promise.all([
    // Defensivo: se a migration ainda não rodou, a tabela não existe — cai no legado.
    prisma.acessoComercial
      .findUnique({
        where: { organizacaoId_userId: { organizacaoId: orgId, userId } },
        include: { unidades: { select: { unidadeId: true } } },
      })
      .catch(() => null),
    // Legado: coordenador de unidades (sempre EDITAR nessas unidades).
    prisma.unidade.findMany({
      where: { organizacaoId: orgId, coordenadorId: userId },
      select: { id: true },
    }),
  ]);

  const legadasIds = legadas.map((u) => u.id);
  if (!acesso && legadasIds.length === 0) return NEGADO;

  const corporativo = acesso?.todasUnidades ?? false;
  const nivel: 'VER' | 'EDITAR' = acesso?.nivel ?? 'EDITAR';
  const acessoIds = acesso?.unidades.map((u) => u.unidadeId) ?? [];

  const visiveis = new Set<string>([...legadasIds, ...acessoIds]);
  const editaveis = new Set<string>([
    ...legadasIds, // coordenador legado edita
    ...(nivel === 'EDITAR' ? acessoIds : []),
  ]);

  return {
    temAcesso: true,
    dono: false,
    corporativo,
    admin: acesso?.admin ?? false,
    podeCriarEmpresa: acesso?.podeCriarEmpresa ?? false,
    nivel,
    unidadesIds: Array.from(visiveis),
    podeVer: (uid) => corporativo || visiveis.has(uid),
    podeEditar: (uid) => (corporativo ? nivel === 'EDITAR' : editaveis.has(uid)),
  };
}
