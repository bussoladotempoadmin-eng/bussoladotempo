import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { getSessionUser } from '@/lib/workspace';
import { ComercialShell } from '../comercial-shell';
import { carregarComercial } from '../contexto';
import { listarAcessosComercial, assentosUsados } from '@/lib/comercial';
import { AcessosView } from './acessos-view';

export const metadata = { title: 'Equipe Comercial' };

export default async function EquipeComercialPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login?callbackUrl=/comercial/equipe');
  const user = await getSessionUser();
  if (!user) redirect('/login');
  const ctx = await carregarComercial(user.id);
  if (!ctx) redirect('/comercial');
  const { empresas, orgId, escopo } = ctx;

  // Só dono ou admin gerencia acessos.
  if (!escopo.podeGerenciarAcessos) redirect('/comercial');

  const [acessos, usados] = await Promise.all([
    listarAcessosComercial(user.id, orgId),
    assentosUsados(orgId),
  ]);

  return (
    <ComercialShell empresas={empresas} empresaAtualId={orgId} podeGerenciar={escopo.podeGerenciarAcessos}>
      <h1 className="text-2xl font-extrabold tracking-tight">Equipe Comercial · {escopo.org.nome}</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Quem acessa o Comercial, com escopo (quais unidades) e nível (ver ou editar).
      </p>
      <AcessosView
        orgId={orgId}
        acessos={acessos ?? []}
        unidades={escopo.unidades.map((u) => ({ id: u.id, nome: u.nome }))}
        assentosUsados={usados}
      />
    </ComercialShell>
  );
}
